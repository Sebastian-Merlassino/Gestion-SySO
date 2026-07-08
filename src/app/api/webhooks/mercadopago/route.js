// src/app/api/webhooks/mercadopago/route.js
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { Payment } from 'mercadopago';
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

  // 5. Comparar firmas de forma segura contra tiempos de respuesta
  return crypto.timingSafeEqual(
    Buffer.from(generatedSignature, 'utf-8'),
    Buffer.from(v1, 'utf-8')
  );
}

export async function POST(request) {
  try {
    const body = await request.json();
    const type = body.type || body.action;
    const dataId = body.data?.id;

    console.log(`[Webhook MP] Recibida notificación de tipo: "${type}", ID: "${dataId}"`);

    // Si no es un evento de pago, retornamos 200 para ignorar el evento de forma limpia
    if (type !== 'payment' || !dataId) {
      return NextResponse.json({ message: 'Evento ignorado de forma exitosa.' }, { status: 200 });
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
        console.warn(`[Webhook MP Unauthorized] Firma del webhook inválida para el ID de pago: ${dataId}`);
        return NextResponse.json({ error: 'Firma inválida.' }, { status: 401 });
      }
      console.log(`[Webhook MP] Firma del webhook validada correctamente para el ID de pago: ${dataId}`);
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
        return NextResponse.json({ error: 'Error al registrar transación.' }, { status: 500 });
      }

      // Actualizar el plan del tenant
      const { error: tenantErr } = await adminClient
        .from('tenants')
        .update({
          plan_id: planId || 'basic'
        })
        .eq('id', tenantId);

      if (tenantErr) {
        console.error('[Webhook MP Error] Error al actualizar el plan de suscripción del tenant:', tenantErr);
        // Si falló actualizar el plan, eliminamos el registro del pago para que Mercado Pago intente el webhook de nuevo
        await adminClient.from('pagos_procesados').delete().eq('payment_id', String(dataId));
        return NextResponse.json({ error: 'Error al actualizar suscripción.' }, { status: 500 });
      }

      console.log(`[Webhook MP Success] Acreditación exitosa para el pago: ${dataId}`);
      return NextResponse.json({ success: true, message: 'Pago acreditado y plan actualizado con éxito.' }, { status: 201 });
    }

    // Si el pago no está aprobado (ej. rechazado, pendiente, en mediación), solo registramos el estado pero no activamos plan
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
