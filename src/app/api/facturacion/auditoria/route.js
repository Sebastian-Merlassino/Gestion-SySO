// src/app/api/facturacion/auditoria/route.js
// API Route for retrieving immutable audit logs with filters and pagination
import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

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

export async function GET(request) {
  try {
    const serverClient = createAuthClient();
    const { data: { user }, error: authError } = await serverClient.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }

    const { data: profile } = await serverClient
      .from('profiles')
      .select('tenant_id, role')
      .eq('id', user.id)
      .single();

    if (!profile?.tenant_id || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Solo los administradores pueden consultar el registro de auditoría.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const accion = searchParams.get('accion');
    const facturaId = searchParams.get('factura_id');
    const fechaDesde = searchParams.get('fecha_desde');
    const fechaHasta = searchParams.get('fecha_hasta');
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 200);
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = serverClient
      .from('facturacion_audit_log')
      .select('*, profiles:performed_by(full_name, email)', { count: 'exact' })
      .eq('tenant_id', profile.tenant_id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (accion) query = query.eq('accion', accion);
    if (facturaId) query = query.eq('factura_id', facturaId);
    if (fechaDesde) query = query.gte('created_at', fechaDesde);
    if (fechaHasta) query = query.lte('created_at', fechaHasta);

    const { data: logs, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: `Error al obtener logs: ${error.message}` }, { status: 500 });
    }

    return NextResponse.json({
      logs: logs || [],
      total: count || 0,
      limit,
      offset,
    });
  } catch (err) {
    console.error('[API Facturación Auditoría]', err);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
