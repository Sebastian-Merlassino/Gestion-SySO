// src/app/api/admin/tenants/[id]/route.js
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { verifySuperAdminServer } from '../../../../../lib/adminAuth';

export async function PATCH(request, { params }) {
  try {
    const { id: tenantId } = params;

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID requerido.' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      return NextResponse.json({ error: 'Configuración de servidor incompleta.' }, { status: 500 });
    }

    // 1. Validar autenticación de sesión
    const cookieStore = cookies();
    const serverClient = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value;
        },
        set(name, value, options) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name, options) {
          cookieStore.set({ name, value: '', ...options });
        },
      },
    });

    let user = null;
    const { data: userData, error: authError } = await serverClient.auth.getUser();
    if (userData?.user) {
      user = userData.user;
    } else {
      const authHeader = request.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.replace('Bearer ', '').trim();
        const { data: tokenUser } = await serverClient.auth.getUser(token);
        if (tokenUser?.user) user = tokenUser.user;
      }
    }

    if (!user) {
      return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
    }

    // 2. Verificar privilegios SuperAdmin
    const { isAuthorized } = await verifySuperAdminServer(user.id, user.email);
    if (!isAuthorized) {
      return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 });
    }

    const body = await request.json();
    const allowedFields = [
      'is_exempt',
      'gift_plan_id',
      'gift_ends_at',
      'status',
      'plan_id',
      'plan_ends_at',
      'discount_percentage',
      'discount_ends_at',
    ];

    const updates = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No se enviaron campos válidos para actualizar.' }, { status: 400 });
    }

    updates.updated_at = new Date().toISOString();

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: updatedTenant, error: updateErr } = await adminClient
      .from('tenants')
      .update(updates)
      .eq('id', tenantId)
      .select()
      .single();

    if (updateErr) {
      console.error('[Admin Tenant Update Error]:', updateErr);
      return NextResponse.json({ error: 'Error al actualizar el tenant.' }, { status: 500 });
    }

    let mpSyncResult = null;
    if (body.sync_mp_subscription && updatedTenant.preapproval_id) {
      const mpAccessToken = process.env.MP_ACCESS_TOKEN || process.env.MERCADOPAGO_ACCESS_TOKEN;
      if (mpAccessToken) {
        try {
          const { MercadoPagoConfig, PreApproval } = await import('mercadopago');
          const mpClient = new MercadoPagoConfig({ accessToken: mpAccessToken });
          const preapprovalClient = new PreApproval(mpClient);

          const { getDynamicPlanFeatures } = await import('../../../../../lib/planPricing');
          const features = await getDynamicPlanFeatures(adminClient);
          const basePrice = features[updatedTenant.plan_id]?.price || 35000;
          const discountPct = Number(updatedTenant.discount_percentage) || 0;
          const targetAmount = discountPct > 0 
            ? Math.round(basePrice * (1 - discountPct / 100))
            : basePrice;

          await preapprovalClient.update({
            id: updatedTenant.preapproval_id,
            body: { transaction_amount: targetAmount },
          });

          mpSyncResult = { success: true, targetAmount };
        } catch (mpErr) {
          console.error('[Admin Tenant Patch] Error actualizando suscripción en MP:', mpErr);
          mpSyncResult = { success: false, error: mpErr.message || 'Error al conectar con Mercado Pago.' };
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: mpSyncResult && mpSyncResult.success
        ? `Tenant actualizado y débito en Mercado Pago ajustado a $${mpSyncResult.targetAmount.toLocaleString('es-AR')}.`
        : 'Tenant actualizado correctamente.',
      tenant: updatedTenant,
      mpSyncResult,
    });
  } catch (err) {
    console.error('[Admin Tenant API Error]:', err);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
