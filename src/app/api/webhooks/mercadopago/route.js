// src/app/api/webhooks/mercadopago/route.js
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { Payment, PreApproval } from 'mercadopago';
import { NextResponse } from 'next/server';
import { client as mpClient } from '../../../../config/mpConfig';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

/**
 * Verifica la firma digital enviada por Mercado Pago en las cabeceras del webhook.
 */
function verifySignature(req, body, secret) {
  const xSignature = req.headers.get('x-signature');
  const xRequestId = req.headers.get('x-request-id');

  if (!xSignature || !xRequestId) {
    console.warn('[Webhook MP] Cabeceras de firma x-signature o x-request-id faltantes.');
    return false;
  }

  // 1. Extraer partes ts (timestamp) y v1 (firma calculada)
  const parts = xSignature.split(',').map(p => p.trim());
  const tsPart = parts.find(p => p.startsWith('ts='));
  const v1Part = parts.find(p => p.startsWith('v1='));

  if (!tsPart || !v1Part) {
    console.warn('[Webhook MP] Formato de x-signature inválido.');
    return false;
  }

  const ts = tsPart.split('=')[1];
  const v1 = v1Part.split('=')[1];

  // 2. Extraer el ID de los datos de la notificación
  const dataId = body.data?.id;
  if (!dataId) {
    console.warn('[Webhook MP] El payload no contiene data.id para verificación.');
    return false;
  }

  // 3. Construir la cadena de manifiesto exactamente según el formato oficial
  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;

  // 4. Calcular firma HMAC-SHA256
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(manifest);
  const generatedSignature = hmac.digest('hex');

  // 5. Comparar firmas de forma segura contra tiempos de respuesta (MED-01)
  const generatedBuffer = Buffer.from(generatedSignature, 'utf-8');
  const v1Buffer = Buffer.from(v1 || '', 'utf-8');

  if (generatedBuffer.length !== v1Buffer.length) {
    console.warn('[Webhook MP] Mismatch de longitud en firmas. Rechazando webhook.');
    return false;
  }

  return crypto.timingSafeEqual(generatedBuffer, v1Buffer);
}

export async function POST(request) {
  try {
    const body = await request.json();
    const type = body.type || body.action;
    const dataId = body.data?.id;

    console.log(`[Webhook MP] Recibida notificación de tipo: "${type}", ID: "${dataId}"`);

    // Soportar pagos ('payment') y suscripciones ('preapproval')
    const isPayment = type === 'payment';
    const isPreApproval = type === 'preapproval' || body.type === 'preapproval' || (body.resource && body.resource.includes('preapproval'));

    if (!isPayment && !isPreApproval) {
      return NextResponse.json({ message: 'Evento ignorado de forma exitosa.' }, { status: 200 });
    }

    if (!dataId) {
      return NextResponse.json({ error: 'Falta data.id de notificación.' }, { status: 400 });
    }

    const webhookSecret = process.env.MERCADO_PAGO_WEBHOOK_SECRET;

    if (!webhookSecret) {
      const isProd = process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging';
      if (isProd) {
        console.error('[Webhook MP Error] MERCADO_PAGO_WEBHOOK_SECRET no está configurada en producción.');
        return NextResponse.json({ error: 'Error de configuración en el servidor de pagos.' }, { status: 500 });
      }
      console.warn('⚠️ [Webhook MP] Ignorando verificación de firma en desarrollo por falta de MERCADO_PAGO_WEBHOOK_SECRET.');
    } else {
      // Validar firma
      const isValid = verifySignature(request, body, webhookSecret);
      if (!isValid) {
        console.warn(`[Webhook MP Unauthorized] Firma del webhook inválida para el ID: ${dataId}`);
        return NextResponse.json({ error: 'Firma inválida.' }, { status: 401 });
      }
      console.log(`[Webhook MP] Firma del webhook validada correctamente para el ID: ${dataId}`);
    }

    if (!supabaseSecretKey) {
      console.error('[Webhook MP Error] Clave service_role de Supabase no configurada.');
      return NextResponse.json({ error: 'Configuración de base de datos incompleta.' }, { status: 500 });
    }

    // Inicializar el cliente administrativo de Supabase
    const adminClient = createClient(supabaseUrl, supabaseSecretKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // ============================================
    // CASO A: EVENTO DE SUSCRIPCIÓN (PREAPPROVAL)
    // ============================================
    if (isPreApproval) {
      // 1. Control de Idempotencia para Suscripciones
      const { data: existingSub, error: subQueryErr } = await adminClient
        .from('pagos_procesados')
        .select('id')
        .eq('payment_id', `sub_${dataId}`)
        .maybeSingle();

      if (subQueryErr) {
        console.error('[Webhook MP Error] Fallo al consultar pagos_procesados para sub:', subQueryErr);
        return NextResponse.json({ error: 'Fallo interno al consultar base de datos.' }, { status: 500 });
      }

      if (existingSub) {
        console.log(`[Webhook MP Idempotencia] La suscripción ${dataId} ya fue procesada previamente.`);
        return NextResponse.json({ success: true, message: 'Suscripción procesada previamente (Idempotente).' }, { status: 200 });
      }

      console.log(`[Webhook MP] Consultando detalles de preapproval ${dataId} en Mercado Pago...`);
      const preApprovalClient = new PreApproval(mpClient);
      
      let preApprovalData;
      try {
        preApprovalData = await preApprovalClient.get({ id: dataId });
      } catch (mpErr) {
        console.error(`[Webhook MP Error] Error al obtener preapproval ${dataId} desde MP:`, mpErr);
        return NextResponse.json({ error: 'Fallo al verificar preapproval con la pasarela.' }, { status: 502 });
      }
      
      const { status, external_reference } = preApprovalData;
      console.log(`[Webhook MP] Preapproval obtenido. Estado: "${status}", Referencia: "${external_reference}"`);
      
      if (!external_reference) {
        console.warn(`[Webhook MP] Preapproval ${dataId} carece de external_reference.`);
        return NextResponse.json({ message: 'Suscripción sin referencia de tenant ignorada.' }, { status: 200 });
      }
      
      let refData;
      try {
        refData = JSON.parse(external_reference);
      } catch (e) {
        console.error('[Webhook MP] Error al deserializar external_reference:', external_reference);
        return NextResponse.json({ error: 'Referencia externa de suscripción inválida.' }, { status: 400 });
      }
      
      const { tenant_id, plan_id } = refData;
      
      if (!tenant_id || !plan_id) {
        console.error('[Webhook MP] Datos incompletos en external_reference:', refData);
        return NextResponse.json({ error: 'Tenant ID o Plan ID faltantes en referencia.' }, { status: 400 });
      }
      
      if (status === 'authorized') {
        console.log(`[Webhook MP] Activando plan ${plan_id} para Tenant ${tenant_id} por suscripción autorizada.`);
        
        // Registrar activación en auditoría
        const { error: insertErr } = await adminClient
          .from('pagos_procesados')
          .insert({
            payment_id: `sub_${dataId}`,
            tenant_id: tenant_id,
            status: 'approved',
            amount: 0, // Las suscripciones registran cobros mensuales en cobros individuales
            event_id: request.headers.get('x-request-id') || `sub_${Date.now()}`
          });
          
        if (insertErr) {
          console.error('[Webhook MP Warning] No se pudo guardar auditoría de activación:', insertErr);
        }
        
        // Actualizar plan del tenant y setear vencimiento (30 días de gracia)
        const { error: tenantErr } = await adminClient
          .from('tenants')
          .update({
            plan_id: plan_id,
            plan_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 días
          })
          .eq('id', tenant_id);
          
        if (tenantErr) {
          console.error('[Webhook MP Error] Error al actualizar plan en base de datos:', tenantErr);
          return NextResponse.json({ error: 'Error al activar plan en base de datos.' }, { status: 500 });
        }
        
        return NextResponse.json({ success: true, message: 'Plan activado por suscripción con éxito.' }, { status: 201 });
      } else if (status === 'cancelled' || status === 'paused') {
        console.log(`[Webhook MP] Cancelando plan para Tenant ${tenant_id} por suscripción en estado "${status}".`);
        
        // Volver al plan free si se cancela o pausa la suscripción
        const { error: tenantErr } = await adminClient
          .from('tenants')
          .update({
            plan_id: 'free',
            plan_ends_at: null
          })
          .eq('id', tenant_id);
          
        if (tenantErr) {
          console.error('[Webhook MP Error] Error al restablecer plan a free:', tenantErr);
          return NextResponse.json({ error: 'Error al cancelar plan en base de datos.' }, { status: 500 });
        }
        
        return NextResponse.json({ success: true, message: 'Plan revertido a gratis por cancelación.' }, { status: 200 });
      }
      
      return NextResponse.json({ success: true, message: `Suscripción registrada en estado: ${status}` }, { status: 200 });
    }

    // ============================================
    // CASO B: EVENTO DE COBRO INDIVIDUAL (PAYMENT)
    // ============================================
    
    // 1. Control de Idempotencia: Verificar si el pago ya fue procesado
    const { data: existingPayment, error: queryErr } = await adminClient
      .from('pagos_procesados')
      .select('id')
      .eq('payment_id', String(dataId))
      .maybeSingle();

    if (queryErr) {
      console.error('[Webhook MP Error] Fallo al consultar pagos_procesados:', queryErr);
      return NextResponse.json({ error: 'Fallo interno al consultar base de datos.' }, { status: 500 });
    }

    if (existingPayment) {
      console.log(`[Webhook MP Idempotencia] El pago ${dataId} ya fue procesado previamente.`);
      return NextResponse.json({ success: true, message: 'Pago procesado previamente (Idempotente).' }, { status: 200 });
    }

    // 2. Obtener detalles reales del pago directamente desde Mercado Pago
    console.log(`[Webhook MP] Consultando detalles del pago ${dataId} en la API de Mercado Pago...`);
    const paymentClient = new Payment(mpClient);
    
    let paymentData;
    try {
      paymentData = await paymentClient.get({ id: dataId });
    } catch (mpErr) {
      console.error(`[Webhook MP Error] Error al obtener detalles del pago desde Mercado Pago:`, mpErr);
      return NextResponse.json({ error: 'Fallo al verificar el pago con la pasarela.' }, { status: 502 });
    }

    const { status, transaction_amount, metadata } = paymentData;
    console.log(`[Webhook MP] Detalle obtenido. Estado: "${status}", Monto: ${transaction_amount}`);

    const tenantId = metadata?.tenant_id || metadata?.tenantId;
    const planId = metadata?.plan_id || metadata?.planId;

    if (!tenantId) {
      console.error(`[Webhook MP Error] El pago ${dataId} no tiene metadatos de tenant_id.`);
      return NextResponse.json({ error: 'Metadatos del pago incompletos (falta tenant_id).' }, { status: 400 });
    }

    // 3. Procesar el pago si está aprobado
    if (status === 'approved') {
      console.log(`[Webhook MP] Acreditando pago de forma transaccional para Tenant: ${tenantId}, Plan: ${planId || 'basic'}`);

      // Registrar el pago
      const { error: insertErr } = await adminClient
        .from('pagos_procesados')
        .insert({
          payment_id: String(dataId),
          tenant_id: tenantId,
          status: status,
          amount: transaction_amount,
          event_id: request.headers.get('x-request-id')
        });

      if (insertErr) {
        console.error('[Webhook MP Error] Error al registrar el pago en la base de datos:', insertErr);
        return NextResponse.json({ error: 'Error al registrar transacción.' }, { status: 500 });
      }

      // Actualizar el plan del tenant y renovar vencimiento (+30 días)
      const { error: tenantErr } = await adminClient
        .from('tenants')
        .update({
          plan_id: planId || 'basic_5',
          plan_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        })
        .eq('id', tenantId);

      if (tenantErr) {
        console.error('[Webhook MP Error] Error al actualizar el plan de suscripción del tenant:', tenantErr);
        await adminClient.from('pagos_procesados').delete().eq('payment_id', String(dataId));
        return NextResponse.json({ error: 'Error al actualizar suscripción.' }, { status: 500 });
      }

      console.log(`[Webhook MP Success] Acreditación exitosa para el pago: ${dataId}`);
      return NextResponse.json({ success: true, message: 'Pago acreditado y plan actualizado con éxito.' }, { status: 201 });
    }

    // Si el pago no está aprobado (ej. rechazado, pendiente), solo registramos el estado
    console.log(`[Webhook MP] El pago ${dataId} se encuentra en estado: "${status}". No se actualiza el plan.`);
    
    const { error: insertNonApprovedErr } = await adminClient
      .from('pagos_procesados')
      .insert({
        payment_id: String(dataId),
        tenant_id: tenantId,
        status: status,
        amount: transaction_amount,
        event_id: request.headers.get('x-request-id')
      });

    if (insertNonApprovedErr) {
      console.error('[Webhook MP Error] Error al registrar el pago no aprobado:', insertNonApprovedErr);
      return NextResponse.json({ error: 'Error al guardar estado de transacción.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: `Estado registrado como: ${status}` }, { status: 200 });

  } catch (err) {
    console.error('[Webhook MP Error Crítico] Error en la ruta de procesamiento del webhook:', err);
    return NextResponse.json({ error: 'Error interno del servidor. Intente más tarde.' }, { status: 500 });
  }
}

