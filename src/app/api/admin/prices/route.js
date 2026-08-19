// src/app/api/admin/prices/route.js
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { PreApproval } from 'mercadopago';
import { client as mpClient } from '../../../../config/mpConfig';
import { verifySuperAdminServer } from '../../../../lib/adminAuth';
import { PLAN_FEATURES } from '../../../../lib/utils';
import { getDynamicPlanFeatures } from '../../../../lib/planPricing';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseSecretKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

/**
 * Autentica y valida si la petición proviene de un SuperAdmin.
 */
async function authenticateSuperAdmin(request) {
  let user = null;

  if (supabaseUrl && supabaseAnonKey) {
    const cookieStore = cookies();
    const serverClient = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {}
      }
    });

    const { data: { user: cookieUser } } = await serverClient.auth.getUser();
    if (cookieUser) user = cookieUser;
  }

  // Fallback a Authorization Header
  if (!user && supabaseUrl && supabaseAnonKey) {
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '').trim();
      const directClient = createClient(supabaseUrl, supabaseAnonKey);
      const { data: tokenUser } = await directClient.auth.getUser(token);
      if (tokenUser?.user) user = tokenUser.user;
    }
  }

  if (!user) {
    return { error: 'No autenticado.', status: 401 };
  }

  const { isAuthorized } = await verifySuperAdminServer(user.id, user.email);
  if (!isAuthorized) {
    return { error: 'Acceso denegado. Se requieren privilegios de SuperAdmin.', status: 403 };
  }

  return { user };
}

/**
 * GET: Obtiene la lista de planes, precios actuales y estadísticas de suscriptores.
 */
export async function GET(request) {
  try {
    const authRes = await authenticateSuperAdmin(request);
    if (authRes.error) {
      return NextResponse.json({ error: authRes.error }, { status: authRes.status });
    }

    const adminClient = createClient(supabaseUrl, supabaseSecretKey);

    // 1. Obtener características de planes dinámicos
    const dynamicPlans = await getDynamicPlanFeatures(adminClient);

    // 2. Obtener todas las organizaciones para estadísticas de suscriptores
    const { data: tenants, error: tenantsErr } = await adminClient
      .from('tenants')
      .select('id, name, slug, plan_id, preapproval_id, is_exempt, status');

    if (tenantsErr) {
      console.error('[Admin Prices API] Error al obtener tenants:', tenantsErr);
      return NextResponse.json({ error: 'Error al consultar organizaciones.' }, { status: 500 });
    }

    // 3. Calcular estadísticas por cada plan
    const commercialPlans = ['basic_5', 'standard_25', 'libre'];
    const plansSummary = commercialPlans.map((pId) => {
      const cfg = dynamicPlans[pId] || PLAN_FEATURES[pId];
      const matchingTenants = (tenants || []).filter(t => t.plan_id === pId && !t.is_exempt);
      const mpSubscribers = matchingTenants.filter(t => Boolean(t.preapproval_id));

      return {
        id: pId,
        name: cfg.name,
        currentPrice: cfg.price,
        maxClients: cfg.maxClients,
        maxMembers: cfg.maxMembers,
        totalTenants: matchingTenants.length,
        mpSubscribersCount: mpSubscribers.length,
        mpSubscribersList: mpSubscribers.map(s => ({ id: s.id, name: s.name, slug: s.slug, preapproval_id: s.preapproval_id })),
      };
    });

    return NextResponse.json({
      success: true,
      plans: plansSummary,
    });
  } catch (err) {
    console.error('[Admin Prices API] Error inesperado en GET:', err);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}

/**
 * POST: Actualiza los precios de los planes en el SaaS y/o en suscripciones recurrentes de Mercado Pago.
 */
export async function POST(request) {
  try {
    const authRes = await authenticateSuperAdmin(request);
    if (authRes.error) {
      return NextResponse.json({ error: authRes.error }, { status: authRes.status });
    }

    const body = await request.json();
    const { planId, newPrice, updateNewCheckouts = true, updateExistingMercadoPago = false } = body;

    const validPlans = ['basic_5', 'standard_25', 'libre'];
    if (!validPlans.includes(planId)) {
      return NextResponse.json({ error: 'Plan seleccionado inválido.' }, { status: 400 });
    }

    const parsedPrice = Number(newPrice);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      return NextResponse.json({ error: 'El precio debe ser un número positivo válido.' }, { status: 400 });
    }

    const adminClient = createClient(supabaseUrl, supabaseSecretKey);
    const planName = PLAN_FEATURES[planId]?.name || planId;

    // 1. Actualizar precio base en la tabla plan_configs
    if (updateNewCheckouts) {
      const { error: upsertErr } = await adminClient
        .from('plan_configs')
        .upsert({
          id: planId,
          name: planName,
          price: parsedPrice,
          updated_at: new Date().toISOString(),
          updated_by: authRes.user.id,
        });

      if (upsertErr) {
        console.error('[Admin Prices API] Error al actualizar plan_configs:', upsertErr);
        return NextResponse.json({ error: 'Error al persistir el nuevo precio en base de datos.' }, { status: 500 });
      }
    }

    // 2. Actualizar suscripciones en Mercado Pago si se solicitó
    const executionResults = {
      planId,
      newPrice: parsedPrice,
      updatedInDatabase: updateNewCheckouts,
      mpAttemptedCount: 0,
      mpSuccessCount: 0,
      mpFailedCount: 0,
      details: [],
    };

    if (updateExistingMercadoPago) {
      const { data: tenantsToUpdate, error: queryErr } = await adminClient
        .from('tenants')
        .select('id, name, slug, preapproval_id')
        .eq('plan_id', planId)
        .not('preapproval_id', 'is', null)
        .eq('is_exempt', false);

      if (queryErr) {
        console.error('[Admin Prices API] Error al buscar tenants con Mercado Pago:', queryErr);
        return NextResponse.json({ error: 'Error al consultar suscriptores de Mercado Pago.' }, { status: 500 });
      }

      executionResults.mpAttemptedCount = (tenantsToUpdate || []).length;
      const preapprovalClient = new PreApproval(mpClient);

      for (const tenant of (tenantsToUpdate || [])) {
        try {
          await preapprovalClient.update({
            id: tenant.preapproval_id,
            body: {
              auto_recurring: {
                transaction_amount: parsedPrice,
                currency_id: 'ARS',
              },
            },
          });

          executionResults.mpSuccessCount++;
          executionResults.details.push({
            tenantId: tenant.id,
            tenantName: tenant.name,
            preapprovalId: tenant.preapproval_id,
            status: 'success',
            message: `Actualizado a $${parsedPrice.toLocaleString('es-AR')}`,
          });
        } catch (mpErr) {
          console.error(`[Admin Prices API] Error actualizando suscripción ${tenant.preapproval_id} para ${tenant.slug}:`, mpErr);
          executionResults.mpFailedCount++;
          executionResults.details.push({
            tenantId: tenant.id,
            tenantName: tenant.name,
            preapprovalId: tenant.preapproval_id,
            status: 'error',
            message: mpErr.message || 'Fallo en la llamada a Mercado Pago',
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Precio de ${planName} actualizado exitosamente a $${parsedPrice.toLocaleString('es-AR')}.`,
      results: executionResults,
    });
  } catch (err) {
    console.error('[Admin Prices API] Error inesperado en POST:', err);
    return NextResponse.json({ error: 'Error interno al actualizar precios.' }, { status: 500 });
  }
}
