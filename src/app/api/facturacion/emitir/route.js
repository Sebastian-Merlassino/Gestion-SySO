// src/app/api/facturacion/emitir/route.js
// API Route for emitting a single invoice via ARCA with full resilience
import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { createArcaClient, isTransientError } from '@/lib/arca/arcaClient';
import { registrarAuditoria, extractRequestContext } from '@/lib/arca/arcaAudit';
import { acquireLock, releaseLock, generateLockId } from '@/lib/arca/arcaLock';

const emitirSchema = z.object({
  // Optional: if provided, we update an existing draft; otherwise we create a new one
  factura_id: z.string().uuid().optional(),

  tipo_comprobante: z.number().int().refine(v => [1, 2, 3, 6, 7, 8, 11, 12, 13, 99].includes(v), {
    message: 'Tipo de comprobante inválido.',
  }),
  concepto: z.number().int().min(1).max(3).default(2),

  // Receiver
  receptor_doc_tipo: z.number().int().default(99),
  receptor_doc_nro: z.number().int().default(0),
  receptor_razon_social: z.string().max(200).optional().nullable(),
  receptor_condicion_iva: z.string().max(50).optional().nullable(),
  receptor_domicilio: z.string().max(500).optional().nullable(),

  // Amounts
  imp_neto: z.number().min(0),
  imp_iva: z.number().min(0).default(0),
  imp_total: z.number().min(0),
  imp_tot_conc: z.number().min(0).default(0),
  imp_op_ex: z.number().min(0).default(0),
  imp_trib: z.number().min(0).default(0),

  // IVA detail
  detalle_iva: z.array(z.object({
    Id: z.number().int(),
    BaseImp: z.number(),
    Importe: z.number(),
  })).optional().nullable(),

  // Description and items
  descripcion: z.string().max(2000).optional().nullable(),
  items: z.array(z.object({
    descripcion: z.string(),
    cantidad: z.number(),
    precio_unitario: z.number(),
    subtotal: z.number(),
    iva_porcentaje: z.number().optional(),
  })).optional().nullable(),

  // Service dates (required for concepto 2 or 3)
  fecha_serv_desde: z.string().optional().nullable(),
  fecha_serv_hasta: z.string().optional().nullable(),
  fecha_vto_pago: z.string().optional().nullable(),

  // Association
  empresa_id: z.string().uuid().optional().nullable(),

  // Control: whether to save as draft only or emit to ARCA
  solo_borrador: z.boolean().default(false),
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
    // ── Authentication ──
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

    // ── Validate input ──
    const body = await request.json();
    const parseResult = emitirSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json({
        error: 'Datos inválidos.',
        details: parseResult.error.format(),
      }, { status: 400 });
    }

    const input = parseResult.data;
    const { ip_address, user_agent } = extractRequestContext(request);
    const tenantId = profile.tenant_id;

    // ── CASE: COMPROBANTE / REMITO INTERNO (X) - NO FISCAL ──
    if (input.tipo_comprobante === 99) {
      const today = new Date().toISOString().split('T')[0];
      const ptoVta = 1;
      let facturaId = input.factura_id;

      if (input.solo_borrador) {
        if (facturaId) {
          const { error: updateError } = await serverClient.from('facturas').update({
            tipo_comprobante: 99,
            punto_venta: ptoVta,
            fecha_emision: today,
            concepto: input.concepto,
            fecha_serv_desde: input.fecha_serv_desde || null,
            fecha_serv_hasta: input.fecha_serv_hasta || null,
            fecha_vto_pago: input.fecha_vto_pago || null,
            receptor_doc_tipo: input.receptor_doc_tipo,
            receptor_doc_nro: input.receptor_doc_nro,
            receptor_razon_social: input.receptor_razon_social,
            receptor_condicion_iva: input.receptor_condicion_iva,
            receptor_domicilio: input.receptor_domicilio,
            imp_neto: input.imp_neto,
            imp_iva: input.imp_iva,
            imp_total: input.imp_total,
            imp_tot_conc: input.imp_tot_conc,
            imp_op_ex: input.imp_op_ex,
            imp_trib: input.imp_trib,
            detalle_iva: input.detalle_iva,
            descripcion: input.descripcion,
            items: input.items,
            empresa_id: input.empresa_id,
            updated_at: new Date().toISOString(),
          }).eq('id', facturaId).eq('tenant_id', tenantId);

          if (updateError) {
            return NextResponse.json({ error: `Error al actualizar borrador interno: ${updateError.message}` }, { status: 500 });
          }
        } else {
          const { data: newFactura, error: insertError } = await serverClient.from('facturas').insert({
            tenant_id: tenantId,
            estado: 'borrador',
            tipo_comprobante: 99,
            punto_venta: ptoVta,
            fecha_emision: today,
            concepto: input.concepto,
            fecha_serv_desde: input.fecha_serv_desde || null,
            fecha_serv_hasta: input.fecha_serv_hasta || null,
            fecha_vto_pago: input.fecha_vto_pago || null,
            receptor_doc_tipo: input.receptor_doc_tipo,
            receptor_doc_nro: input.receptor_doc_nro,
            receptor_razon_social: input.receptor_razon_social,
            receptor_condicion_iva: input.receptor_condicion_iva,
            receptor_domicilio: input.receptor_domicilio,
            imp_neto: input.imp_neto,
            imp_iva: input.imp_iva,
            imp_total: input.imp_total,
            imp_tot_conc: input.imp_tot_conc,
            imp_op_ex: input.imp_op_ex,
            imp_trib: input.imp_trib,
            detalle_iva: input.detalle_iva,
            descripcion: input.descripcion,
            items: input.items,
            empresa_id: input.empresa_id,
            created_by: user.id,
          }).select('id').single();

          if (insertError || !newFactura) {
            return NextResponse.json({ error: `Error al guardar borrador interno: ${insertError?.message || 'unknown'}` }, { status: 500 });
          }
          facturaId = newFactura.id;
        }

        return NextResponse.json({
          success: true,
          factura_id: facturaId,
          estado: 'borrador',
          message: 'Borrador de comprobante interno guardado exitosamente.',
        });
      }

      // If NOT solo_borrador -> Register it directly with internal number
      const { data: lastInterno } = await serverClient
        .from('facturas')
        .select('numero_comprobante')
        .eq('tenant_id', tenantId)
        .eq('tipo_comprobante', 99)
        .not('numero_comprobante', 'is', null)
        .order('numero_comprobante', { ascending: false })
        .limit(1)
        .maybeSingle();

      const nextNro = (lastInterno?.numero_comprobante || 0) + 1;

      const recordData = {
        tenant_id: tenantId,
        estado: 'autorizada',
        tipo_comprobante: 99,
        punto_venta: ptoVta,
        numero_comprobante: nextNro,
        fecha_emision: today,
        concepto: input.concepto,
        fecha_serv_desde: input.fecha_serv_desde || null,
        fecha_serv_hasta: input.fecha_serv_hasta || null,
        fecha_vto_pago: input.fecha_vto_pago || null,
        receptor_doc_tipo: input.receptor_doc_tipo,
        receptor_doc_nro: input.receptor_doc_nro,
        receptor_razon_social: input.receptor_razon_social,
        receptor_condicion_iva: input.receptor_condicion_iva,
        receptor_domicilio: input.receptor_domicilio,
        imp_neto: input.imp_neto,
        imp_iva: input.imp_iva,
        imp_total: input.imp_total,
        imp_tot_conc: input.imp_tot_conc,
        imp_op_ex: input.imp_op_ex,
        imp_trib: input.imp_trib,
        detalle_iva: input.detalle_iva,
        descripcion: input.descripcion,
        items: input.items,
        empresa_id: input.empresa_id,
        cae: null,
        cae_vencimiento: null,
        resultado_arca: 'A',
        observaciones_arca: JSON.stringify({ tipo: 'comprobante_interno', estado_pago: 'pendiente' }),
        updated_at: new Date().toISOString(),
      };

      if (facturaId) {
        const { error: updateError } = await serverClient
          .from('facturas')
          .update(recordData)
          .eq('id', facturaId)
          .eq('tenant_id', tenantId);

        if (updateError) {
          return NextResponse.json({ error: `Error al registrar comprobante interno: ${updateError.message}` }, { status: 500 });
        }
      } else {
        recordData.created_by = user.id;
        const { data: newFactura, error: insertError } = await serverClient
          .from('facturas')
          .insert(recordData)
          .select('id')
          .single();

        if (insertError || !newFactura) {
          return NextResponse.json({ error: `Error al registrar comprobante interno: ${insertError?.message || 'unknown'}` }, { status: 500 });
        }
        facturaId = newFactura.id;
      }

      await registrarAuditoria(serverClient, {
        tenant_id: tenantId,
        factura_id: facturaId,
        accion: 'comprobante_interno_registrado',
        estado_nuevo: 'autorizada',
        detalle: { tipo_comprobante: 99, numero_comprobante: nextNro, imp_total: input.imp_total },
        ip_address,
        user_agent,
        performed_by: user.id,
      });

      return NextResponse.json({
        success: true,
        factura_id: facturaId,
        estado: 'autorizada',
        numero_comprobante: nextNro,
        message: 'Comprobante interno registrado exitosamente para seguimiento.',
      });
    }

    // ── Get ARCA config ──
    const { data: arcaConfig, error: configError } = await serverClient
      .from('tenant_arca_config')
      .select('*')
      .eq('tenant_id', tenantId)
      .single();

    if (configError || !arcaConfig) {
      return NextResponse.json({
        error: 'No se encontró configuración de ARCA. Por favor complete la configuración en Facturación > Configuración.',
      }, { status: 400 });
    }

    if (!arcaConfig.is_active) {
      return NextResponse.json({ error: 'La configuración de ARCA está desactivada.' }, { status: 400 });
    }

    // ── STEP 1: Save draft (persist data BEFORE contacting ARCA) ──
    const today = new Date().toISOString().split('T')[0];
    let facturaId = input.factura_id;

    if (facturaId) {
      // Update existing draft
      const { error: updateError } = await serverClient
        .from('facturas')
        .update({
          tipo_comprobante: input.tipo_comprobante,
          punto_venta: arcaConfig.punto_venta,
          fecha_emision: today,
          concepto: input.concepto,
          fecha_serv_desde: input.fecha_serv_desde || null,
          fecha_serv_hasta: input.fecha_serv_hasta || null,
          fecha_vto_pago: input.fecha_vto_pago || null,
          receptor_doc_tipo: input.receptor_doc_tipo,
          receptor_doc_nro: input.receptor_doc_nro,
          receptor_razon_social: input.receptor_razon_social,
          receptor_condicion_iva: input.receptor_condicion_iva,
          receptor_domicilio: input.receptor_domicilio,
          imp_neto: input.imp_neto,
          imp_iva: input.imp_iva,
          imp_total: input.imp_total,
          imp_tot_conc: input.imp_tot_conc,
          imp_op_ex: input.imp_op_ex,
          imp_trib: input.imp_trib,
          detalle_iva: input.detalle_iva,
          descripcion: input.descripcion,
          items: input.items,
          empresa_id: input.empresa_id,
        })
        .eq('id', facturaId)
        .eq('tenant_id', tenantId);

      if (updateError) {
        return NextResponse.json({ error: `Error al actualizar borrador: ${updateError.message}` }, { status: 500 });
      }
    } else {
      // Create new draft
      const { data: newFactura, error: insertError } = await serverClient
        .from('facturas')
        .insert({
          tenant_id: tenantId,
          estado: 'borrador',
          tipo_comprobante: input.tipo_comprobante,
          punto_venta: arcaConfig.punto_venta,
          fecha_emision: today,
          concepto: input.concepto,
          fecha_serv_desde: input.fecha_serv_desde || null,
          fecha_serv_hasta: input.fecha_serv_hasta || null,
          fecha_vto_pago: input.fecha_vto_pago || null,
          receptor_doc_tipo: input.receptor_doc_tipo,
          receptor_doc_nro: input.receptor_doc_nro,
          receptor_razon_social: input.receptor_razon_social,
          receptor_condicion_iva: input.receptor_condicion_iva,
          receptor_domicilio: input.receptor_domicilio,
          imp_neto: input.imp_neto,
          imp_iva: input.imp_iva,
          imp_total: input.imp_total,
          imp_tot_conc: input.imp_tot_conc,
          imp_op_ex: input.imp_op_ex,
          imp_trib: input.imp_trib,
          detalle_iva: input.detalle_iva,
          descripcion: input.descripcion,
          items: input.items,
          empresa_id: input.empresa_id,
          created_by: user.id,
        })
        .select('id')
        .single();

      if (insertError || !newFactura) {
        return NextResponse.json({ error: `Error al guardar borrador: ${insertError?.message || 'unknown'}` }, { status: 500 });
      }

      facturaId = newFactura.id;

      await registrarAuditoria(serverClient, {
        tenant_id: tenantId,
        factura_id: facturaId,
        accion: 'borrador_creado',
        estado_nuevo: 'borrador',
        detalle: { tipo_comprobante: input.tipo_comprobante, imp_total: input.imp_total },
        ip_address,
        user_agent,
        performed_by: user.id,
      });
    }

    // If solo_borrador, return here without emitting
    if (input.solo_borrador) {
      return NextResponse.json({
        success: true,
        factura_id: facturaId,
        estado: 'borrador',
        message: 'Borrador guardado exitosamente.',
      });
    }

    // ── STEP 2: Acquire processing lock ──
    const lockId = generateLockId();
    const lockResult = await acquireLock(serverClient, facturaId, lockId);
    if (!lockResult.success) {
      return NextResponse.json({ error: lockResult.error }, { status: 409 });
    }

    await registrarAuditoria(serverClient, {
      tenant_id: tenantId,
      factura_id: facturaId,
      accion: 'emision_iniciada',
      estado_anterior: 'borrador',
      estado_nuevo: 'pendiente',
      ip_address,
      user_agent,
      performed_by: user.id,
    });

    // ── STEP 3: Initialize ARCA client ──
    const isHomologacion = arcaConfig.environment === 'homologacion';
    const { afip, cleanup } = await createArcaClient(arcaConfig, {
      skipCertDownload: isHomologacion && !arcaConfig.cert_storage_path,
    });
    arcaCleanup = cleanup;

    // ── STEP 4: Get last voucher number (defensive numbering) ──
    let lastVoucher;
    try {
      lastVoucher = await afip.ElectronicBilling.getLastVoucher(
        arcaConfig.punto_venta,
        input.tipo_comprobante
      );
    } catch (err) {
      if (isTransientError(err)) {
        await releaseLock(serverClient, facturaId, lockId, {
          estado: 'error_conexion',
          last_error_message: `Error al consultar último comprobante: ${err.message}`,
        });
        await registrarAuditoria(serverClient, {
          tenant_id: tenantId,
          factura_id: facturaId,
          accion: 'emision_error_conexion',
          estado_anterior: 'pendiente',
          estado_nuevo: 'error_conexion',
          detalle: { step: 'getLastVoucher', error: err.message },
          ip_address,
          user_agent,
          performed_by: user.id,
        });
        return NextResponse.json({
          error: 'Error de conexión con ARCA al consultar último comprobante. Los datos fueron guardados. Puede reintentar.',
          factura_id: facturaId,
          estado: 'error_conexion',
        }, { status: 503 });
      }
      // Business error
      await releaseLock(serverClient, facturaId, lockId, {
        estado: 'borrador',
        last_error_message: err.message,
      });
      return NextResponse.json({ error: `Error de ARCA: ${err.message}`, factura_id: facturaId }, { status: 400 });
    }

    const nextNumber = lastVoucher + 1;

    // ── STEP 5: Create voucher in ARCA ──
    const voucherData = {
      CantReg: 1,
      PtoVta: arcaConfig.punto_venta,
      CbteTipo: input.tipo_comprobante,
      Concepto: input.concepto,
      DocTipo: input.receptor_doc_tipo,
      DocNro: input.receptor_doc_nro,
      CbteDesde: nextNumber,
      CbteHasta: nextNumber,
      CbteFch: parseInt(today.replace(/-/g, '')),
      ImpTotal: input.imp_total,
      ImpTotConc: input.imp_tot_conc || 0,
      ImpNeto: input.imp_neto,
      ImpOpEx: input.imp_op_ex || 0,
      ImpTrib: input.imp_trib || 0,
      ImpIVA: input.imp_iva,
      MonId: 'PES',
      MonCotiz: 1,
    };

    // Add IVA details if provided
    if (input.detalle_iva && input.detalle_iva.length > 0) {
      voucherData.Iva = input.detalle_iva;
    }

    // Add service dates if concepto is 2 or 3
    if (input.concepto >= 2) {
      if (input.fecha_serv_desde) {
        voucherData.FchServDesde = parseInt(input.fecha_serv_desde.replace(/-/g, ''));
      }
      if (input.fecha_serv_hasta) {
        voucherData.FchServHasta = parseInt(input.fecha_serv_hasta.replace(/-/g, ''));
      }
      if (input.fecha_vto_pago) {
        voucherData.FchVtoPago = parseInt(input.fecha_vto_pago.replace(/-/g, ''));
      }
    }

    let arcaResponse;
    try {
      arcaResponse = await afip.ElectronicBilling.createVoucher(voucherData);
    } catch (err) {
      if (isTransientError(err)) {
        // === THE DANGER ZONE ===
        // The request might have reached ARCA or not. We DON'T know.
        // Mark as error_conexion and create reconciliation entry.
        await releaseLock(serverClient, facturaId, lockId, {
          estado: 'error_conexion',
          numero_comprobante: nextNumber, // Save expected number for reconciliation
          last_error_message: `Timeout/red al emitir: ${err.message}`,
        });

        // Create reconciliation entry
        await serverClient.from('facturacion_reconciliacion').insert({
          tenant_id: tenantId,
          factura_id: facturaId,
          estado: 'pendiente',
        });

        await registrarAuditoria(serverClient, {
          tenant_id: tenantId,
          factura_id: facturaId,
          accion: 'emision_error_conexion',
          estado_anterior: 'pendiente',
          estado_nuevo: 'error_conexion',
          detalle: { step: 'createVoucher', error: err.message, expected_number: nextNumber },
          ip_address,
          user_agent,
          performed_by: user.id,
        });

        return NextResponse.json({
          error: 'Error de conexión con ARCA al emitir. NO se reenvió automáticamente. Puede verificar el estado con "Verificar en ARCA".',
          factura_id: facturaId,
          estado: 'error_conexion',
          needs_reconciliation: true,
        }, { status: 503 });
      }

      // Business rejection from ARCA
      await releaseLock(serverClient, facturaId, lockId, {
        estado: 'rechazada',
        resultado_arca: 'R',
        observaciones_arca: err.message,
        last_error_message: err.message,
      });

      await registrarAuditoria(serverClient, {
        tenant_id: tenantId,
        factura_id: facturaId,
        accion: 'emision_rechazada',
        estado_anterior: 'pendiente',
        estado_nuevo: 'rechazada',
        detalle: { error: err.message },
        ip_address,
        user_agent,
        performed_by: user.id,
      });

      return NextResponse.json({
        error: `ARCA rechazó el comprobante: ${err.message}`,
        factura_id: facturaId,
        estado: 'rechazada',
      }, { status: 400 });
    }

    // ── STEP 6: Success — Save CAE and update state ──
    await releaseLock(serverClient, facturaId, lockId, {
      estado: 'autorizada',
      numero_comprobante: nextNumber,
      cae: arcaResponse.CAE,
      cae_vencimiento: arcaResponse.CAEFchVto
        ? `${arcaResponse.CAEFchVto.toString().substring(0, 4)}-${arcaResponse.CAEFchVto.toString().substring(4, 6)}-${arcaResponse.CAEFchVto.toString().substring(6, 8)}`
        : null,
      resultado_arca: 'A',
      raw_response_arca: arcaResponse,
      last_error_message: null,
    });

    await registrarAuditoria(serverClient, {
      tenant_id: tenantId,
      factura_id: facturaId,
      accion: 'emision_exitosa',
      estado_anterior: 'pendiente',
      estado_nuevo: 'autorizada',
      detalle: {
        cae: arcaResponse.CAE,
        numero_comprobante: nextNumber,
        imp_total: input.imp_total,
      },
      ip_address,
      user_agent,
      performed_by: user.id,
    });

    return NextResponse.json({
      success: true,
      factura_id: facturaId,
      estado: 'autorizada',
      cae: arcaResponse.CAE,
      cae_vencimiento: arcaResponse.CAEFchVto,
      numero_comprobante: nextNumber,
      punto_venta: arcaConfig.punto_venta,
      message: 'Factura emitida exitosamente.',
    });

  } catch (err) {
    console.error('[API Facturación Emitir]', err);
    return NextResponse.json({ error: err.message || 'Error al procesar la emisión del comprobante.' }, { status: 400 });
  } finally {
    if (arcaCleanup) arcaCleanup();
  }
}
