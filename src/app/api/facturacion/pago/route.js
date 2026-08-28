// src/app/api/facturacion/pago/route.js
// Endpoint para actualizar el estado de pago, fecha de cobro, método y jurisdicción de una factura
import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { registrarAuditoria, extractRequestContext } from '@/lib/arca/arcaAudit';

const updatePagoSchema = z.object({
  factura_id: z.string().uuid(),
  estado_pago: z.enum(['pendiente', 'pagada', 'anulada']),
  fecha_pago: z.string().nullable().optional(),
  metodo_pago: z.string().nullable().optional(),
  notas_pago: z.string().nullable().optional(),
  jurisdiccion: z.string().nullable().optional(),
});

function createAuthClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) { return cookieStore.get(name)?.value; },
        set(name, value, options) { cookieStore.set({ name, value, ...options }); },
        remove(name, options) { cookieStore.set({ name, value: '', ...options }); },
      },
    }
  );
}

export async function POST(request) {
  try {
    const serverClient = createAuthClient();
    const { data: { user }, error: authError } = await serverClient.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }

    const { data: profile } = await serverClient
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single();

    if (!profile?.tenant_id) {
      return NextResponse.json({ error: 'Tenant no encontrado.' }, { status: 403 });
    }

    const body = await request.json();
    const parseResult = updatePagoSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json({ error: 'Datos inválidos', details: parseResult.error.format() }, { status: 400 });
    }

    const { factura_id, estado_pago, fecha_pago, metodo_pago, notas_pago, jurisdiccion } = parseResult.data;

    // Fetch existing factura to merge metadata
    const { data: existing, error: fetchErr } = await serverClient
      .from('facturas')
      .select('id, observaciones_arca, raw_response_arca')
      .eq('id', factura_id)
      .eq('tenant_id', profile.tenant_id)
      .single();

    if (fetchErr || !existing) {
      return NextResponse.json({ error: 'Factura no encontrada.' }, { status: 404 });
    }

    // Merge payment metadata
    let currentObs = {};
    if (typeof existing.observaciones_arca === 'object' && existing.observaciones_arca !== null) {
      currentObs = existing.observaciones_arca;
    } else if (typeof existing.observaciones_arca === 'string') {
      try {
        currentObs = JSON.parse(existing.observaciones_arca);
      } catch (e) {
        currentObs = {};
      }
    }

    const updatedObs = {
      ...currentObs,
      estado_pago,
      fecha_pago: estado_pago === 'pagada' ? (fecha_pago || new Date().toISOString().split('T')[0]) : null,
      metodo_pago: metodo_pago || currentObs.metodo_pago || 'transferencia',
      notas_pago: notas_pago !== undefined ? notas_pago : currentObs.notas_pago,
      jurisdiccion: jurisdiccion !== undefined ? jurisdiccion : currentObs.jurisdiccion,
      updated_at: new Date().toISOString(),
    };

    const { data: updatedFactura, error: updateErr } = await serverClient
      .from('facturas')
      .update({
        observaciones_arca: updatedObs,
        updated_at: new Date().toISOString(),
      })
      .eq('id', factura_id)
      .eq('tenant_id', profile.tenant_id)
      .select()
      .single();

    if (updateErr) {
      return NextResponse.json({ error: `Error al actualizar pago: ${updateErr.message}` }, { status: 500 });
    }

    const { ip_address, user_agent } = extractRequestContext(request);
    await registrarAuditoria(serverClient, {
      tenant_id: profile.tenant_id,
      factura_id,
      accion: estado_pago === 'pagada' ? 'factura_cobrada' : 'pago_actualizado',
      estado_nuevo: estado_pago,
      detalle: { estado_pago, fecha_pago: updatedObs.fecha_pago, metodo_pago: updatedObs.metodo_pago, jurisdiccion },
      ip_address,
      user_agent,
      performed_by: user.id,
    });

    return NextResponse.json({
      success: true,
      factura: updatedFactura,
      pago: updatedObs,
    });

  } catch (err) {
    console.error('Error en API pago:', err);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
