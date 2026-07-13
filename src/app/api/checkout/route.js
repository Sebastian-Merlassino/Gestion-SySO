// src/app/api/checkout/route.js
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { PreApproval } from 'mercadopago';
import { client as mpClient } from '../../../config/mpConfig';
import { PLAN_FEATURES } from '../../../lib/utils';

export async function POST(request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: 'Falta configuración del servidor base de datos.' }, { status: 500 });
    }

    // 1. Autenticar al usuario
    const cookieStore = cookies();
    const serverClient = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Se ignora en contextos de solo lectura
          }
        },
      },
    });

    const { data: { user }, error: authError } = await serverClient.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }

    // 2. Obtener datos del perfil para validar rol de administrador
    const { data: profile, error: profileErr } = await serverClient
      .from('profiles')
      .select('role, tenant_id')
      .eq('id', user.id)
      .single();

    if (profileErr || !profile) {
      return NextResponse.json({ error: 'No se pudo obtener el perfil de usuario.' }, { status: 403 });
    }

    if (profile.role !== 'admin') {
      return NextResponse.json({ error: 'No tienes permisos de administrador para gestionar suscripciones.' }, { status: 403 });
    }

    // 3. Parsear parámetros
    const { planId, tenantId } = await request.json();

    if (!planId || !tenantId) {
      return NextResponse.json({ error: 'Parámetros planId y tenantId requeridos.' }, { status: 400 });
    }

    if (tenantId !== profile.tenant_id) {
      return NextResponse.json({ error: 'No autorizado para gestionar otro tenant.' }, { status: 403 });
    }

    const planConfig = PLAN_FEATURES[planId];
    if (!planConfig || planId === 'free') {
      return NextResponse.json({ error: 'Plan seleccionado inválido.' }, { status: 400 });
    }

    // 4. Obtener datos de descuento del tenant
    const { data: tenant, error: tenantErr } = await serverClient
      .from('tenants')
      .select('slug, name, is_exempt, discount_percentage, discount_ends_at')
      .eq('id', tenantId)
      .single();

    if (tenantErr || !tenant) {
      return NextResponse.json({ error: 'Tenant no encontrado.' }, { status: 404 });
    }

    if (tenant.is_exempt) {
      return NextResponse.json({ error: 'Tu organización está exenta de pagos (Plan Owner).' }, { status: 400 });
    }

    // 5. Calcular tarifa aplicando descuento si está vigente
    let finalAmount = planConfig.price;
    const hasDiscount = tenant.discount_percentage > 0 && tenant.discount_ends_at && new Date(tenant.discount_ends_at) > new Date();

    if (hasDiscount) {
      const discountAmount = planConfig.price * (tenant.discount_percentage / 100);
      finalAmount = Math.max(0, Math.round(planConfig.price - discountAmount));
      console.log(`[Checkout API] Aplicando descuento del ${tenant.discount_percentage}% a Tenant ${tenant.slug}. Tarifa calculada: $${finalAmount}`);
    }

    // Forzar monto de prueba en entorno local para evitar límites de las tarjetas en Sandbox
    if (process.env.NODE_ENV !== 'production') {
      finalAmount = 150;
      console.log(`[Checkout API] Entorno local detectado. Forzando tarifa de prueba a: $${finalAmount}`);
    }

    // 6. Generar link de suscripción (PreApproval) con Mercado Pago
    const preApprovalClient = new PreApproval(mpClient);
    
    let origin = request.headers.get('origin') || 'https://gestionsyso.com';
    // Si estamos en entorno local o la URL no utiliza HTTPS, forzamos el dominio de producción
    // debido a las restricciones estrictas de redirección HTTPS de Mercado Pago
    if (origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1') || !origin.startsWith('https://')) {
      origin = 'https://gestionsyso.com';
    }
    const backUrl = `${origin}/${tenant.slug}/profile`;

    console.log(`[Checkout API] Creando Preapproval para Tenant: ${tenantId}, Plan: ${planId}, Monto: $${finalAmount}`);

    const payerEmail = process.env.MERCADO_PAGO_TEST_PAYER_EMAIL || user.email;

    const rawReason = `Suscripción Mensual - ${planConfig.name} (${tenant.name})`;
    const reason = rawReason.length > 60 ? rawReason.substring(0, 57) + '...' : rawReason;

    const preApprovalResponse = await preApprovalClient.create({
      body: {
        payer_email: payerEmail,
        back_url: backUrl,
        reason: reason,
        external_reference: JSON.stringify({ tenant_id: tenantId, plan_id: planId }),
        auto_recurring: {
          frequency: 1,
          frequency_type: "months",
          transaction_amount: finalAmount,
          currency_id: "ARS"
        },
        status: "pending"
      }
    });

    const initPoint = process.env.NODE_ENV === 'production' 
      ? preApprovalResponse.init_point 
      : preApprovalResponse.sandbox_init_point || preApprovalResponse.init_point;

    return NextResponse.json({ 
      success: true, 
      initPoint: initPoint 
    });

  } catch (err) {
    console.error('[Checkout API Error Crítico]:', err);
    return NextResponse.json({ 
      error: 'Fallo al procesar el checkout de Mercado Pago. Intente de nuevo.',
      message: err.message,
      stack: err.stack,
      details: err.cause || err.response || err
    }, { status: 500 });
  }
}
