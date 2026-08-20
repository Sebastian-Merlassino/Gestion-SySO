// src/app/api/admin/metrics/route.js
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { verifySuperAdminServer } from '../../../../lib/adminAuth';
import { getEffectivePlan, PLAN_FEATURES } from '../../../../lib/utils';
import { getDynamicPlanFeatures } from '../../../../lib/planPricing';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      return NextResponse.json(
        { error: 'Configuración de servidor incompleta.' },
        { status: 500 }
      );
    }

    // 1. Validar autenticación de sesión
    const cookieStore = cookies();
    const serverClient = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    });

    let { data: { user } } = await serverClient.auth.getUser();

    // Fallback a Authorization Header
    if (!user) {
      const authHeader = request.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.replace('Bearer ', '').trim();
        const directClient = createClient(supabaseUrl, supabaseAnonKey);
        const { data: tokenUser } = await directClient.auth.getUser(token);
        if (tokenUser?.user) user = tokenUser.user;
      }
    }

    if (!user) {
      return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
    }

    // 2. Validar privilegios SuperAdmin
    const { isAuthorized } = await verifySuperAdminServer(user.id, user.email);
    if (!isAuthorized) {
      return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 });
    }

    // 3. Consultas en paralelo con privilegios de Service Role
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const dynamicPlanFeatures = await getDynamicPlanFeatures(adminClient);

    const [
      tenantsRes,
      profilesRes,
      paymentsRes,
      empresasCountRes,
    ] = await Promise.all([
      adminClient
        .from('tenants')
        .select('*')
        .order('created_at', { ascending: false }),
      adminClient
        .from('profiles')
        .select('id, email, full_name, role, tenant_id, created_at, is_superadmin')
        .order('created_at', { ascending: false }),
      adminClient
        .from('pagos_procesados')
        .select('*')
        .order('created_at', { ascending: false }),
      adminClient
        .from('empresas')
        .select('id, tenant_id', { count: 'exact' }),
    ]);

    if (tenantsRes.error) {
      console.error('[Admin Metrics] Error consultando tenants:', tenantsRes.error);
      return NextResponse.json({ error: 'Error al consultar organizaciones.' }, { status: 500 });
    }

    const tenants = tenantsRes.data || [];
    const profiles = profilesRes.data || [];
    const payments = paymentsRes.data || [];
    const totalEmpresas = empresasCountRes.count || 0;

    // Indexar perfiles y dueños por tenant_id
    const profilesByTenant = {};
    const tenantOwners = {};

    profiles.forEach((p) => {
      if (p.tenant_id) {
        if (!profilesByTenant[p.tenant_id]) {
          profilesByTenant[p.tenant_id] = [];
        }
        profilesByTenant[p.tenant_id].push(p);

        if (p.role === 'admin' && !tenantOwners[p.tenant_id]) {
          tenantOwners[p.tenant_id] = p;
        }
      }
    });

    // 6. Calcular KPIs agregados
    let activeTenantsCount = 0;
    let mrrEstimate = 0;
    const plansCount = {
      free: 0,
      basic_5: 0,
      standard_25: 0,
      libre: 0,
      gift: 0,
      exempt: 0,
    };

    let adminsCount = 0;
    let miembrosCount = 0;
    let clientesCount = 0;

    profiles.forEach((p) => {
      const role = (p.role || '').toLowerCase().trim();
      if (role === 'cliente' || role === 'client') {
        clientesCount++;
      } else if (role === 'miembro' || role === 'member' || role === 'tecnico') {
        miembrosCount++;
      } else {
        adminsCount++;
      }
    });

    const enrichedTenants = tenants.map((t) => {
      if (t.status === 'active') {
        activeTenantsCount++;
      }

      // Desglose de planes para métricas (separando comerciales de cortesías y exenciones)
      if (t.is_exempt) {
        plansCount.exempt++;
      } else if (t.gift_plan_id && t.gift_ends_at && new Date(t.gift_ends_at) > new Date()) {
        plansCount.gift++;
      } else if (t.plan_id === 'libre') {
        plansCount.libre++;
      } else if (t.plan_id === 'standard_25') {
        plansCount.standard_25++;
      } else if (t.plan_id === 'basic_5') {
        plansCount.basic_5++;
      } else {
        plansCount.free++;
      }

      // Resolver plan efectivo considerando vigencia de suscripción, regalos y exención
      const effectivePlan = getEffectivePlan(t);

      // Calcular MRR únicamente de planes comerciales de pago vigentes (excluye exenciones y regalos)
      if (!t.is_exempt && !t.gift_plan_id && effectivePlan !== 'free') {
        const isPlanActive = !t.plan_ends_at || new Date(t.plan_ends_at) > new Date();
        if (isPlanActive) {
          const planConfig = dynamicPlanFeatures[effectivePlan] || PLAN_FEATURES[effectivePlan];
          if (planConfig && planConfig.price) {
            let price = Number(planConfig.price);
            if (t.discount_percentage && t.discount_ends_at && new Date(t.discount_ends_at) > new Date()) {
              const discountRatio = Math.max(0, Math.min(100, Number(t.discount_percentage))) / 100;
              price = price * (1 - discountRatio);
            }
            mrrEstimate += price;
          }
        }
      }

      const tenantProfiles = profilesByTenant[t.id] || [];
      const owner = tenantOwners[t.id] || tenantProfiles.find((p) => p.role === 'admin') || tenantProfiles[0] || null;

      return {
        ...t,
        effective_plan: effectivePlan,
        users_count: tenantProfiles.length,
        owner_email: owner?.email || 'Sin asignar',
        owner_name: owner?.full_name || 'Desconocido',
      };
    });

    // 7. Calcular ingresos del mes en base a pagos aprobados en los últimos 30 días
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    let monthlyApprovedSum = 0;
    let totalApprovedPayments = 0;

    const enrichedPayments = payments.map((pay) => {
      const payDate = new Date(pay.created_at);
      const isApproved = pay.status === 'approved';
      const amount = Number(pay.amount) || 0;

      if (isApproved) {
        totalApprovedPayments++;
        if (payDate >= thirtyDaysAgo) {
          monthlyApprovedSum += amount;
        }
      }

      const relatedTenant = tenants.find((t) => t.id === pay.tenant_id);

      return {
        ...pay,
        tenant_name: relatedTenant?.name || 'Tenant Eliminado',
        tenant_slug: relatedTenant?.slug || 'n/a',
      };
    });

    const kpis = {
      totalTenants: tenants.length,
      activeTenants: activeTenantsCount,
      totalUsers: profiles.length,
      usersByRole: {
        admins: adminsCount,
        miembros: miembrosCount,
        clientes: clientesCount,
      },
      totalEmpresasClientes: totalEmpresas,
      mrrEstimate,
      monthlyRevenue: monthlyApprovedSum,
      totalApprovedPayments,
      plansCount,
    };

    return NextResponse.json({
      success: true,
      kpis,
      tenants: enrichedTenants,
      payments: enrichedPayments,
      profiles: profiles.map(p => ({ id: p.id, created_at: p.created_at, role: p.role, tenant_id: p.tenant_id })),
    });
  } catch (error) {
    console.error('[Admin Metrics] Error inesperado:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor al procesar métricas.' },
      { status: 500 }
    );
  }
}
