// src/app/api/facturacion/consultar/route.js
// API Route for diagnostic querying of ARCA server status, last voucher, or voucher info
import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createArcaClient } from '@/lib/arca/arcaClient';

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
  let arcaCleanup = null;

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

    if (!profile?.tenant_id) {
      return NextResponse.json({ error: 'No se encontró tenant asociado.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'status'; // 'status', 'last_voucher', 'voucher_info'
    const cbteTipo = parseInt(searchParams.get('cbte_tipo') || '11'); // default 11 = Factura C
    const cbteNro = searchParams.get('cbte_nro') ? parseInt(searchParams.get('cbte_nro')) : null;

    // Get config
    const { data: arcaConfig, error: configError } = await serverClient
      .from('tenant_arca_config')
      .select('*')
      .eq('tenant_id', profile.tenant_id)
      .single();

    if (configError || !arcaConfig) {
      return NextResponse.json({
        error: 'No se encontró configuración de ARCA para este tenant.',
        configured: false,
      }, { status: 400 });
    }

    console.log('[API Consultar] Config cargada:', {
      tenant_id: arcaConfig.tenant_id,
      cuit: arcaConfig.cuit,
      environment: arcaConfig.environment,
      punto_venta: arcaConfig.punto_venta,
      cert_path: arcaConfig.cert_storage_path,
      key_path: arcaConfig.key_storage_path,
    });

    const isHomologacion = arcaConfig.environment === 'homologacion';
    const { afip, cleanup } = await createArcaClient(arcaConfig, {
      skipCertDownload: isHomologacion && !arcaConfig.cert_storage_path,
    });
    arcaCleanup = cleanup;

    if (action === 'status') {
      // Test server status
      console.log('[API Consultar] Intentando getServerStatus...');
      const serverStatus = await afip.ElectronicBilling.getServerStatus();
      console.log('[API Consultar] Server status OK:', serverStatus);
      const lastVoucher = await afip.ElectronicBilling.getLastVoucher(
        arcaConfig.punto_venta,
        cbteTipo
      );
      console.log('[API Consultar] Last voucher:', lastVoucher);

      return NextResponse.json({
        success: true,
        environment: arcaConfig.environment,
        punto_venta: arcaConfig.punto_venta,
        server_status: serverStatus,
        last_voucher: {
          tipo_comprobante: cbteTipo,
          numero: lastVoucher,
        },
        message: 'Conexión con ARCA exitosa.',
      });
    }

    if (action === 'last_voucher') {
      const lastVoucher = await afip.ElectronicBilling.getLastVoucher(
        arcaConfig.punto_venta,
        cbteTipo
      );

      return NextResponse.json({
        success: true,
        punto_venta: arcaConfig.punto_venta,
        tipo_comprobante: cbteTipo,
        ultimo_comprobante: lastVoucher,
      });
    }

    if (action === 'voucher_info') {
      if (!cbteNro) {
        return NextResponse.json({ error: 'Debe especificar el parámetro cbte_nro.' }, { status: 400 });
      }

      const voucherInfo = await afip.ElectronicBilling.getVoucherInfo(
        cbteNro,
        arcaConfig.punto_venta,
        cbteTipo
      );

      return NextResponse.json({
        success: true,
        voucher_info: voucherInfo,
      });
    }

    return NextResponse.json({ error: 'Acción no reconocida.' }, { status: 400 });

  } catch (err) {
    console.error('[API Facturación Consultar]', err);
    const msg = err.message || '';
    let userFriendlyMsg = msg;

    if (msg.includes('401') || msg.includes('status code 401') || msg.includes('CMS') || msg.includes('Certificado no emitido por')) {
      userFriendlyMsg = `${msg}. Posible causa: Tu certificado digital fue emitido en el entorno de Producción de ARCA/AFIP pero el Entorno Operativo en Gestión SySO está en Homologación (o viceversa), o falta delegar el servicio 'Facturación Electrónica (WSFE)' a tu alias en el 'Administrador de Relaciones de Clave Fiscal' de ARCA.`;
    }

    return NextResponse.json({
      error: `Error al consultar ARCA: ${userFriendlyMsg}`,
      raw_error: msg,
    }, { status: 500 });
  } finally {
    if (arcaCleanup) arcaCleanup();
  }
}
