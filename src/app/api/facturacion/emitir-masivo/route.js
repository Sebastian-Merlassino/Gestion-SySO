// src/app/api/facturacion/emitir-masivo/route.js
// API Route for bulk invoice generation from parsed Excel rows with per-row resilience
import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { createArcaClient, isTransientError } from '@/lib/arca/arcaClient';
import { registrarAuditoria, extractRequestContext } from '@/lib/arca/arcaAudit';
import { acquireLock, releaseLock, generateLockId } from '@/lib/arca/arcaLock';

const bulkItemSchema = z.object({
  tipo_comprobante: z.number().int().refine(v => [1, 2, 3, 6, 7, 8, 11, 12, 13, 99].includes(v), {
    message: 'Tipo de comprobante inválido.',
  }),
  concepto: z.number().int().min(1).max(3).default(2),
  receptor_doc_tipo: z.number().int().default(99),
  receptor_doc_nro: z.number().int().default(0),
  receptor_razon_social: z.string().max(200).optional().nullable(),
  receptor_condicion_iva: z.string().max(50).optional().nullable(),
  receptor_domicilio: z.string().max(500).optional().nullable(),
  imp_neto: z.number().min(0),
  imp_iva: z.number().min(0).default(0),
  imp_total: z.number().min(0),
  imp_tot_conc: z.number().min(0).default(0),
  imp_op_ex: z.number().min(0).default(0),
  imp_trib: z.number().min(0).default(0),
  detalle_iva: z.array(z.object({
    Id: z.number().int(),
    BaseImp: z.number(),
    Importe: z.number(),
  })).optional().nullable(),
  descripcion: z.string().max(2000).optional().nullable(),
  items: z.array(z.object({
    descripcion: z.string(),
    cantidad: z.number(),
    precio_unitario: z.number(),
    subtotal: z.number(),
    iva_porcentaje: z.number().optional(),
  })).optional().nullable(),
  fecha_serv_desde: z.string().optional().nullable(),
  fecha_serv_hasta: z.string().optional().nullable(),
  fecha_vto_pago: z.string().optional().nullable(),
  empresa_id: z.string().uuid().optional().nullable(),
  fila_origen: z.number().int().optional(),
});

const bulkPayloadSchema = z.object({
  nombre_archivo: z.string().max(255).default('facturacion_masiva.xlsx'),
  facturas: z.array(bulkItemSchema).min(1, 'Debe incluir al menos una factura en el lote.').max(500, 'Máximo 500 facturas por lote.'),
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

    if (!profile?.tenant_id) {
      return NextResponse.json({ error: 'No se encontró tenant asociado.' }, { status: 403 });
    }

    if (!['admin', 'miembro'].includes(profile.role)) {
      return NextResponse.json({ error: 'No tiene permisos para emitir facturas.' }, { status: 403 });
    }

    const body = await request.json();
    const parseResult = bulkPayloadSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json({
        error: 'Datos del lote inválidos.',
        details: parseResult.error.format(),
      }, { status: 400 });
    }

    const { nombre_archivo, facturas: items } = parseResult.data;
    const { ip_address, user_agent } = extractRequestContext(request);
    const tenantId = profile.tenant_id;

    // Get ARCA config
    const { data: arcaConfig, error: configError } = await serverClient
      .from('tenant_arca_config')
      .select('*')
      .eq('tenant_id', tenantId)
      .single();

    if (configError || !arcaConfig || !arcaConfig.is_active) {
      return NextResponse.json({
        error: 'No se encontró configuración activa de ARCA para este tenant.',
      }, { status: 400 });
    }

    // 1. Create Batch record
    const { data: batch, error: batchError } = await serverClient
      .from('facturas_batch')
      .insert({
        tenant_id: tenantId,
        nombre: nombre_archivo,
        total_facturas: items.length,
        facturas_exitosas: 0,
        facturas_fallidas: 0,
        facturas_pendientes: 0,
        estado: 'procesando',
        excel_data_backup: items,
        created_by: user.id,
      })
      .select()
      .single();

    if (batchError || !batch) {
      return NextResponse.json({
        error: `Error al inicializar lote: ${batchError?.message || 'Error desconocido'}`,
      }, { status: 500 });
    }

    const batchId = batch.id;
    const today = new Date().toISOString().split('T')[0];

    // 2. Insert all items as drafts first
    const draftRecords = items.map((item) => ({
      tenant_id: tenantId,
      batch_id: batchId,
      estado: 'borrador',
      tipo_comprobante: item.tipo_comprobante,
      punto_venta: arcaConfig.punto_venta,
      fecha_emision: today,
      concepto: item.concepto,
      fecha_serv_desde: item.fecha_serv_desde || null,
      fecha_serv_hasta: item.fecha_serv_hasta || null,
      fecha_vto_pago: item.fecha_vto_pago || null,
      receptor_doc_tipo: item.receptor_doc_tipo,
      receptor_doc_nro: item.receptor_doc_nro,
      receptor_razon_social: item.receptor_razon_social || null,
      receptor_condicion_iva: item.receptor_condicion_iva || null,
      receptor_domicilio: item.receptor_domicilio || null,
      imp_neto: item.imp_neto,
      imp_iva: item.imp_iva,
      imp_total: item.imp_total,
      imp_tot_conc: item.imp_tot_conc || 0,
      imp_op_ex: item.imp_op_ex || 0,
      imp_trib: item.imp_trib || 0,
      detalle_iva: item.detalle_iva || null,
      descripcion: item.descripcion || null,
      items: item.items || null,
      empresa_id: item.empresa_id || null,
      created_by: user.id,
    }));

    const { data: insertedDrafts, error: draftsError } = await serverClient
      .from('facturas')
      .insert(draftRecords)
      .select('id, tipo_comprobante, imp_total, receptor_doc_nro');

    if (draftsError || !insertedDrafts) {
      await serverClient.from('facturas_batch').update({ estado: 'error' }).eq('id', batchId);
      return NextResponse.json({
        error: `Error al persistir borradores del lote: ${draftsError?.message || 'Error desconocido'}`,
      }, { status: 500 });
    }

    await registrarAuditoria(serverClient, {
      tenant_id: tenantId,
      batch_id: batchId,
      accion: 'batch_iniciado',
      detalle: { total_facturas: items.length, archivo: nombre_archivo },
      ip_address,
      user_agent,
      performed_by: user.id,
    });

    // 3. Init ARCA client
    const isHomologacion = arcaConfig.environment === 'homologacion';
    const { afip, cleanup } = await createArcaClient(arcaConfig, {
      skipCertDownload: isHomologacion && !arcaConfig.cert_storage_path,
    });
    arcaCleanup = cleanup;

    // 4. Sequential processing with per-row locks & resilience
    let exitosas = 0;
    let fallidas = 0;
    let pendientes = 0;
    const erroresList = [];
    const resultados = [];

    for (let i = 0; i < insertedDrafts.length; i++) {
      const facturaDraft = insertedDrafts[i];
      const itemInput = items[i];
      const facturaId = facturaDraft.id;
      const filaNum = itemInput.fila_origen || (i + 1);

      const lockId = generateLockId();
      const lockRes = await acquireLock(serverClient, facturaId, lockId);

      if (!lockRes.success) {
        fallidas++;
        erroresList.push({
          fila: filaNum,
          factura_id: facturaId,
          error: lockRes.error,
          recuperable: false,
        });
        continue;
      }

      try {
        // Query next voucher number immediately before sending
        const lastVoucher = await afip.ElectronicBilling.getLastVoucher(
          arcaConfig.punto_venta,
          itemInput.tipo_comprobante
        );
        const nextNumber = lastVoucher + 1;

        const voucherData = {
          CantReg: 1,
          PtoVta: arcaConfig.punto_venta,
          CbteTipo: itemInput.tipo_comprobante,
          Concepto: itemInput.concepto,
          DocTipo: itemInput.receptor_doc_tipo,
          DocNro: itemInput.receptor_doc_nro,
          CbteDesde: nextNumber,
          CbteHasta: nextNumber,
          CbteFch: parseInt(today.replace(/-/g, '')),
          ImpTotal: itemInput.imp_total,
          ImpTotConc: itemInput.imp_tot_conc || 0,
          ImpNeto: itemInput.imp_neto,
          ImpOpEx: itemInput.imp_op_ex || 0,
          ImpTrib: itemInput.imp_trib || 0,
          ImpIVA: itemInput.imp_iva,
          MonId: 'PES',
          MonCotiz: 1,
        };

        if (itemInput.detalle_iva && itemInput.detalle_iva.length > 0) {
          voucherData.Iva = itemInput.detalle_iva;
        }

        if (itemInput.concepto >= 2) {
          if (itemInput.fecha_serv_desde) {
            voucherData.FchServDesde = parseInt(itemInput.fecha_serv_desde.replace(/-/g, ''));
          }
          if (itemInput.fecha_serv_hasta) {
            voucherData.FchServHasta = parseInt(itemInput.fecha_serv_hasta.replace(/-/g, ''));
          }
          if (itemInput.fecha_vto_pago) {
            voucherData.FchVtoPago = parseInt(itemInput.fecha_vto_pago.replace(/-/g, ''));
          }
        }

        let arcaResponse;
        try {
          arcaResponse = await afip.ElectronicBilling.createVoucher(voucherData);
        } catch (voucherErr) {
          if (isTransientError(voucherErr)) {
            pendientes++;
            await releaseLock(serverClient, facturaId, lockId, {
              estado: 'error_conexion',
              numero_comprobante: nextNumber,
              last_error_message: voucherErr.message,
            });

            await serverClient.from('facturacion_reconciliacion').insert({
              tenant_id: tenantId,
              factura_id: facturaId,
              estado: 'pendiente',
            });

            erroresList.push({
              fila: filaNum,
              factura_id: facturaId,
              error: `Error de conexión / Timeout: ${voucherErr.message}`,
              recuperable: true,
            });
            continue;
          }

          // Business rejection
          fallidas++;
          await releaseLock(serverClient, facturaId, lockId, {
            estado: 'rechazada',
            resultado_arca: 'R',
            observaciones_arca: voucherErr.message,
            last_error_message: voucherErr.message,
          });

          erroresList.push({
            fila: filaNum,
            factura_id: facturaId,
            error: voucherErr.message,
            recuperable: false,
          });
          continue;
        }

        // Success
        exitosas++;
        const caeFormattedVto = arcaResponse.CAEFchVto
          ? `${arcaResponse.CAEFchVto.toString().substring(0, 4)}-${arcaResponse.CAEFchVto.toString().substring(4, 6)}-${arcaResponse.CAEFchVto.toString().substring(6, 8)}`
          : null;

        await releaseLock(serverClient, facturaId, lockId, {
          estado: 'autorizada',
          numero_comprobante: nextNumber,
          cae: arcaResponse.CAE,
          cae_vencimiento: caeFormattedVto,
          resultado_arca: 'A',
          raw_response_arca: arcaResponse,
          last_error_message: null,
        });

        resultados.push({
          fila: filaNum,
          factura_id: facturaId,
          numero_comprobante: nextNumber,
          cae: arcaResponse.CAE,
          estado: 'autorizada',
        });

      } catch (loopErr) {
        fallidas++;
        await releaseLock(serverClient, facturaId, lockId, {
          estado: 'rechazada',
          last_error_message: loopErr.message,
        });
        erroresList.push({
          fila: filaNum,
          factura_id: facturaId,
          error: loopErr.message,
          recuperable: false,
        });
      }
    }

    // 5. Update batch summary
    const finalBatchState = exitosas === items.length
      ? 'completado'
      : exitosas > 0
        ? 'parcial'
        : 'error';

    await serverClient
      .from('facturas_batch')
      .update({
        facturas_exitosas: exitosas,
        facturas_fallidas: fallidas,
        facturas_pendientes: pendientes,
        estado: finalBatchState,
        errores: erroresList,
      })
      .eq('id', batchId);

    await registrarAuditoria(serverClient, {
      tenant_id: tenantId,
      batch_id: batchId,
      accion: 'batch_completado',
      detalle: {
        total: items.length,
        exitosas,
        fallidas,
        pendientes,
        estado: finalBatchState,
      },
      ip_address,
      user_agent,
      performed_by: user.id,
    });

    return NextResponse.json({
      success: true,
      batch_id: batchId,
      estado: finalBatchState,
      resumen: {
        total: items.length,
        exitosas,
        fallidas,
        pendientes,
      },
      resultados,
      errores: erroresList,
    });

  } catch (err) {
    console.error('[API Facturación Emitir-Masivo]', err);
    return NextResponse.json({ error: `Error en emisión masiva: ${err.message}` }, { status: 500 });
  } finally {
    if (arcaCleanup) arcaCleanup();
  }
}
