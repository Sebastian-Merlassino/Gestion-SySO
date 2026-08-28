// src/app/api/facturacion/historial/route.js
// API Route for listing invoices with filters
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

/**
 * GET /api/facturacion/historial
 * Lists invoices for the authenticated user's tenant with optional filters.
 * Query params: estado, tipo_comprobante, fecha_desde, fecha_hasta, receptor_doc_nro, empresa_id, limit, offset
 */
export async function GET(request) {
  try {
    const serverClient = createAuthClient();
    const { data: { user }, error: authError } = await serverClient.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ facturas: [], total: 0 });
    }

    const { data: profile } = await serverClient
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile?.tenant_id) {
      return NextResponse.json({ facturas: [], total: 0 });
    }

    const { searchParams } = new URL(request.url);
    const estado = searchParams.get('estado');
    const tipo = searchParams.get('tipo_comprobante');
    const fechaDesde = searchParams.get('fecha_desde');
    const fechaHasta = searchParams.get('fecha_hasta');
    const receptorDocNro = searchParams.get('receptor_doc_nro');
    const empresaId = searchParams.get('empresa_id');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = serverClient
      .from('facturas')
      .select('*, empresas(razon_social)', { count: 'exact' })
      .eq('tenant_id', profile.tenant_id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (estado && estado !== 'all') query = query.eq('estado', estado);
    if (tipo && tipo !== 'all') query = query.eq('tipo_comprobante', parseInt(tipo));
    if (fechaDesde) query = query.gte('fecha_emision', fechaDesde);
    if (fechaHasta) query = query.lte('fecha_emision', fechaHasta);
    if (receptorDocNro) query = query.eq('receptor_doc_nro', parseInt(receptorDocNro));
    if (empresaId) query = query.eq('empresa_id', empresaId);

    const { data: facturas, error, count } = await query;

    if (error) {
      console.warn('[API Facturación Historial GET]', error.message);
      return NextResponse.json({ facturas: [], total: 0, limit, offset });
    }

    return NextResponse.json({
      facturas: facturas || [],
      total: count || 0,
      limit,
      offset,
    });
  } catch (err) {
    console.error('[API Facturación Historial]', err);
    return NextResponse.json({ facturas: [], total: 0 });
  }
}
