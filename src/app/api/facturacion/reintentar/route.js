// src/app/api/facturacion/reintentar/route.js
// API Route for retrying emission of a draft or reconciled invoice
import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { createArcaClient, isTransientError } from '@/lib/arca/arcaClient';
import { registrarAuditoria, extractRequestContext } from '@/lib/arca/arcaAudit';
import { acquireLock, releaseLock, generateLockId } from '@/lib/arca/arcaLock';

const reintentarSchema = z.object({
  factura_id: z.string().uuid('ID de factura requerido.'),
});

function createAuthClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const cookieStore = cookies();
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name) { return cookieStore.get(name)?.value; },
      set(name, value, options) { cookieStore.set({ name, value, ...options }); },
      remove(name, options) { cookieStore.set({ name, value: '', ...options }); },
    },
  });
}

export async function POST(request) {
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

    if (!profile?.tenant_id || !['admin', 'miembro'].includes(profile.role)) {
      return NextResponse.json({ error: 'No tiene permisos para emitir facturas.' }, { status: 403 });
    }

    const body = await request.json();
    const parseResult = reintentarSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json({ error: 'ID de factura inválido.', details: parseResult.error.format() }, { status: 400 });
    }

    const { factura_id } = parseResult.data;
    const { ip_address, user_agent } = extractRequestContext(request);
    const tenantId = profile.tenant_id;

    // Get invoice
    const { data: factura, error: fetchError } = await serverClient
      .from('facturas')
      .select('*')
      .eq('id', factura_id)
      .eq('tenant_id', tenantId)
      .single();

    if (fetchError || !factura) {
      return NextResponse.json({ error: 'Factura no encontrada.' }, { status: 404 });
    }

    if (factura.estado === 'autorizada') {
      return NextResponse.json({ error: 'Esta factura ya fue autorizada con CAE.', cae: factura.cae }, { status: 400 });
    }

    // Acquire lock
    const lockId = generateLockId();
    const lockResult = await acquireLock(serverClient, factura_id, lockId);
    if (!lockResult.success) {
      return NextResponse.json({ error: lockResult.error }, { status: 409 });
    }

    // Get ARCA config
    const { data: arcaConfig, error: configError } = await serverClient
      .from('tenant_arca_config')
      .select('*')
      .eq('tenant_id', tenantId)
      .single();

    if (configError || !arcaConfig || !arcaConfig.is_active) {
      await releaseLock(serverClient, factura_id, lockId, { estado: factura.estado });
      return NextResponse.json({ error: 'Configuración de ARCA no disponible o inactiva.' }, { status: 400 });
    }

    await registrarAuditoria(serverClient, {
      tenant_id: tenantId,
      factura_id,
      accion: 'reintento_iniciado',
      estado_anterior: factura.estado,
      estado_nuevo: 'pendiente',
      ip_address,
      user_agent,
      performed_by: user.id,
    });

    const isHomologacion = arcaConfig.environment === 'homologacion';
    const { afip, cleanup } = await createArcaClient(arcaConfig, {
      skipCertDownload: isHomologacion && !arcaConfig.cert_storage_path,
    });
    arcaCleanup = cleanup;

    // Last voucher
    const lastVoucher = await afip.ElectronicBilling.getLastVoucher(
      arcaConfig.punto_venta,
      factura.tipo_comprobante
    );
    const nextNumber = lastVoucher + 1;
    const today = new Date().toISOString().split('T')[0];

    const voucherData = {
      CantReg: 1,
      PtoVta: arcaConfig.punto_venta,
      CbteTipo: factura.tipo_comprobante,
      Concepto: factura.concepto,
      DocTipo: factura.receptor_doc_tipo,
      DocNro: factura.receptor_doc_nro,
      CbteDesde: nextNumber,
      CbteHasta: nextNumber,
      CbteFch: parseInt(today.replace(/-/g, '')),
      ImpTotal: factura.imp_total,
      ImpTotConc: factura.imp_tot_conc || 0,
      ImpNeto: factura.imp_neto,
      ImpOpEx: factura.imp_op_ex || 0,
      ImpTrib: factura.imp_trib || 0,
      ImpIVA: factura.imp_iva,
      MonId: 'PES',
      MonCotiz: 1,
    };

    if (factura.detalle_iva && Array.isArray(factura.detalle_iva) && factura.detalle_iva.length > 0) {
      voucherData.Iva = factura.detalle_iva;
    }

    if (factura.concepto >= 2) {
      if (factura.fecha_serv_desde) {
        voucherData.FchServDesde = parseInt(factura.fecha_serv_desde.replace(/-/g, ''));
      }
      if (factura.fecha_serv_hasta) {
        voucherData.FchServHasta = parseInt(factura.fecha_serv_hasta.replace(/-/g, ''));
      }
      if (factura.fecha_vto_pago) {
        voucherData.FchVtoPago = parseInt(factura.fecha_vto_pago.replace(/-/g, ''));
      }
    }

    let arcaResponse;
    try {
      arcaResponse = await afip.ElectronicBilling.createVoucher(voucherData);
    } catch (err) {
      if (isTransientError(err)) {
        await releaseLock(serverClient, factura_id, lockId, {
          estado: 'error_conexion',
          numero_comprobante: nextNumber,
          last_error_message: `Error de red en reintento: ${err.message}`,
        });

        await serverClient.from('facturacion_reconciliacion').insert({
          tenant_id: tenantId,
          factura_id,
          estado: 'pendiente',
        });

        return NextResponse.json({
          error: 'Error de conexión con ARCA durante reintento. Use la herramienta de reconciliación.',
          factura_id,
          estado: 'error_conexion',
        }, { status: 503 });
      }

      await releaseLock(serverClient, factura_id, lockId, {
        estado: 'rechazada',
        resultado_arca: 'R',
        observaciones_arca: err.message,
        last_error_message: err.message,
      });

      return NextResponse.json({
        error: `ARCA rechazó el comprobante: ${err.message}`,
        factura_id,
        estado: 'rechazada',
      }, { status: 400 });
    }

    const caeFormattedVto = arcaResponse.CAEFchVto
      ? `${arcaResponse.CAEFchVto.toString().substring(0, 4)}-${arcaResponse.CAEFchVto.toString().substring(4, 6)}-${arcaResponse.CAEFchVto.toString().substring(6, 8)}`
      : null;

    await releaseLock(serverClient, factura_id, lockId, {
      estado: 'autorizada',
      numero_comprobante: nextNumber,
      fecha_emision: today,
      cae: arcaResponse.CAE,
      cae_vencimiento: caeFormattedVto,
      resultado_arca: 'A',
      raw_response_arca: arcaResponse,
      last_error_message: null,
    });

    await registrarAuditoria(serverClient, {
      tenant_id: tenantId,
      factura_id,
      accion: 'emision_exitosa',
      estado_anterior: 'pendiente',
      estado_nuevo: 'autorizada',
      detalle: {
        cae: arcaResponse.CAE,
        numero_comprobante: nextNumber,
        reintento: true,
      },
      ip_address,
      user_agent,
      performed_by: user.id,
    });

    return NextResponse.json({
      success: true,
      factura_id,
      estado: 'autorizada',
      cae: arcaResponse.CAE,
      cae_vencimiento: arcaResponse.CAEFchVto,
      numero_comprobante: nextNumber,
      message: 'Factura emitida exitosamente en reintento.',
    });

  } catch (err) {
    console.error('[API Facturación Reintentar]', err);
    return NextResponse.json({ error: `Error interno al reintentar: ${err.message}` }, { status: 500 });
  } finally {
    if (arcaCleanup) arcaCleanup();
  }
}
