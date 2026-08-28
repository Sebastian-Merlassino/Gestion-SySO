// src/app/api/facturacion/reconciliar/route.js
// API Route for reconciling invoices in 'error_conexion' state with ARCA
import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { createArcaClient } from '@/lib/arca/arcaClient';
import { registrarAuditoria, extractRequestContext } from '@/lib/arca/arcaAudit';

const reconciliarSchema = z.object({
  factura_id: z.string().uuid().optional(), // Specific invoice, or omit to reconcile all pending
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
      return NextResponse.json({ error: 'No autorizado para ejecutar reconciliación.' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const parseResult = reconciliarSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json({ error: 'Parámetros inválidos.', details: parseResult.error.format() }, { status: 400 });
    }

    const { factura_id } = parseResult.data;
    const { ip_address, user_agent } = extractRequestContext(request);
    const tenantId = profile.tenant_id;

    // Get ARCA config
    const { data: arcaConfig, error: configError } = await serverClient
      .from('tenant_arca_config')
      .select('*')
      .eq('tenant_id', tenantId)
      .single();

    if (configError || !arcaConfig || !arcaConfig.is_active) {
      return NextResponse.json({ error: 'Configuración de ARCA no disponible o inactiva.' }, { status: 400 });
    }

    // Find invoices to reconcile
    let query = serverClient
      .from('facturas')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('estado', 'error_conexion');

    if (factura_id) {
      query = query.eq('id', factura_id);
    }

    const { data: facturasPendientes, error: fetchError } = await query;

    if (fetchError) {
      return NextResponse.json({ error: `Error al buscar facturas: ${fetchError.message}` }, { status: 500 });
    }

    if (!facturasPendientes || facturasPendientes.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No hay facturas pendientes de reconciliación.',
        reconciliadas: 0,
      });
    }

    // Init ARCA client
    const isHomologacion = arcaConfig.environment === 'homologacion';
    const { afip, cleanup } = await createArcaClient(arcaConfig, {
      skipCertDownload: isHomologacion && !arcaConfig.cert_storage_path,
    });
    arcaCleanup = cleanup;

    const reconciliadas = [];
    const noEncontradas = [];

    for (const f of facturasPendientes) {
      // Check voucher in ARCA if number was assigned
      const ptoVta = f.punto_venta || arcaConfig.punto_venta;
      const cbteTipo = f.tipo_comprobante;
      const cbteNro = f.numero_comprobante;

      if (!cbteNro) {
        // No number was ever assigned, safe to set back to draft
        await serverClient
          .from('facturas')
          .update({
            estado: 'borrador',
            last_error_message: 'Reconciliación: Comprobante no enviado a ARCA. Retornado a borrador.',
          })
          .eq('id', f.id);

        await serverClient
          .from('facturacion_reconciliacion')
          .update({ estado: 'no_encontrada' })
          .eq('factura_id', f.id);

        noEncontradas.push({ id: f.id, razon: 'Sin número de comprobante asignado' });
        continue;
      }

      try {
        const voucherInfo = await afip.ElectronicBilling.getVoucherInfo(cbteNro, ptoVta, cbteTipo);

        if (voucherInfo && voucherInfo.CodAutorizacion) {
          // ARCA has the voucher authorized! Update local state to autorizada
          const caeVto = voucherInfo.FchVto
            ? `${voucherInfo.FchVto.toString().substring(0, 4)}-${voucherInfo.FchVto.toString().substring(4, 6)}-${voucherInfo.FchVto.toString().substring(6, 8)}`
            : null;

          await serverClient
            .from('facturas')
            .update({
              estado: 'autorizada',
              cae: voucherInfo.CodAutorizacion,
              cae_vencimiento: caeVto,
              resultado_arca: voucherInfo.Resultado || 'A',
              raw_response_arca: voucherInfo,
              last_error_message: null,
            })
            .eq('id', f.id);

          await serverClient
            .from('facturacion_reconciliacion')
            .update({ estado: 'reconciliada', resultado: voucherInfo })
            .eq('factura_id', f.id);

          await registrarAuditoria(serverClient, {
            tenant_id: tenantId,
            factura_id: f.id,
            accion: 'reconciliacion_cae_encontrado',
            estado_anterior: 'error_conexion',
            estado_nuevo: 'autorizada',
            detalle: { cae: voucherInfo.CodAutorizacion, numero: cbteNro },
            ip_address,
            user_agent,
            performed_by: user.id,
          });

          reconciliadas.push({
            id: f.id,
            numero_comprobante: cbteNro,
            cae: voucherInfo.CodAutorizacion,
            estado: 'autorizada',
          });
        } else {
          // Voucher not found in ARCA
          await serverClient
            .from('facturas')
            .update({
              estado: 'borrador',
              numero_comprobante: null,
              last_error_message: 'Reconciliación: Comprobante no registrado en ARCA. Listo para reintentar emisión.',
            })
            .eq('id', f.id);

          await serverClient
            .from('facturacion_reconciliacion')
            .update({ estado: 'no_encontrada' })
            .eq('factura_id', f.id);

          await registrarAuditoria(serverClient, {
            tenant_id: tenantId,
            factura_id: f.id,
            accion: 'reconciliacion_no_encontrado',
            estado_anterior: 'error_conexion',
            estado_nuevo: 'borrador',
            detalle: { numero_esperado: cbteNro },
            ip_address,
            user_agent,
            performed_by: user.id,
          });

          noEncontradas.push({ id: f.id, razon: 'No encontrado en ARCA, restaurado a borrador' });
        }
      } catch (checkErr) {
        // Query to ARCA failed, keep in error_conexion for later
        console.error(`[Reconciliar] Error consultando factura ${f.id}:`, checkErr.message);
      }
    }

    return NextResponse.json({
      success: true,
      total_procesadas: facturasPendientes.length,
      reconciliadas,
      no_encontradas: noEncontradas,
      message: `Reconciliación finalizada. ${reconciliadas.length} autorizadas recuperadas, ${noEncontradas.length} restauradas a borrador para reemisión.`,
    });

  } catch (err) {
    console.error('[API Facturación Reconciliar]', err);
    return NextResponse.json({ error: `Error durante reconciliación: ${err.message}` }, { status: 500 });
  } finally {
    if (arcaCleanup) arcaCleanup();
  }
}
