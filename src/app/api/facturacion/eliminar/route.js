// src/app/api/facturacion/eliminar/route.js
// Endpoint seguro para eliminar borradores o comprobantes internos (sin CAE fiscal)
import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { registrarAuditoria } from '@/lib/arca/arcaAudit';

const eliminarSchema = z.object({
  factura_id: z.string().uuid(),
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
    // 1. Validar autenticación
    const authClient = createAuthClient();
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }

    // 2. Obtener tenant y perfil
    const { data: profile } = await authClient
      .from('profiles')
      .select('tenant_id, role')
      .eq('id', user.id)
      .single();

    if (!profile?.tenant_id) {
      return NextResponse.json({ error: 'Tenant no encontrado.' }, { status: 403 });
    }

    const body = await request.json();
    const parseResult = eliminarSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json({ error: 'ID de comprobante inválido.' }, { status: 400 });
    }

    const { factura_id } = parseResult.data;

    // 3. Cliente admin para consultar y operar de forma segura
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // 4. Buscar comprobante
    const { data: factura, error: findError } = await adminClient
      .from('facturas')
      .select('*')
      .eq('id', factura_id)
      .eq('tenant_id', profile.tenant_id)
      .single();

    if (findError || !factura) {
      return NextResponse.json({ error: 'Comprobante no encontrado.' }, { status: 404 });
    }

    // 5. Restricción legal de ARCA:
    // Los comprobantes fiscales autorizados con CAE NO pueden ser eliminados (se anulan con Nota de Crédito)
    const isComprobanteInterno = factura.tipo_comprobante === 99;
    const isBorradorORechazado = factura.estado === 'borrador' || factura.estado === 'rechazada' || factura.estado === 'error_conexion';

    if (!isComprobanteInterno && !isBorradorORechazado && factura.cae) {
      return NextResponse.json({
        error: 'Las facturas autorizadas por ARCA con CAE no pueden eliminarse por normativa fiscal. Debe emitir una Nota de Crédito para anularla.',
        isFiscal: true,
      }, { status: 400 });
    }

    // 6. Eliminar el registro
    const { error: deleteError } = await adminClient
      .from('facturas')
      .delete()
      .eq('id', factura_id)
      .eq('tenant_id', profile.tenant_id);

    if (deleteError) {
      return NextResponse.json({ error: `Error al eliminar de la base de datos: ${deleteError.message}` }, { status: 500 });
    }

    // 7. Registrar en auditoría
    await registrarAuditoria(adminClient, {
      tenant_id: profile.tenant_id,
      accion: 'factura_eliminada',
      detalle: {
        factura_id,
        tipo_comprobante: factura.tipo_comprobante,
        numero_comprobante: factura.numero_comprobante,
        receptor_razon_social: factura.receptor_razon_social,
        imp_total: factura.imp_total,
        tipo: isComprobanteInterno ? 'comprobante_interno' : factura.estado,
      },
      usuario_id: user.id,
    });

    return NextResponse.json({
      success: true,
      message: isComprobanteInterno ? 'Comprobante interno eliminado correctamente.' : 'Comprobante eliminado correctamente.',
    });
  } catch (err) {
    return NextResponse.json({ error: `Error interno: ${err.message}` }, { status: 500 });
  }
}
