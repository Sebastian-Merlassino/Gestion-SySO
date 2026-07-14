// src/middleware.js
import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import { checkRateLimit, getRateLimitHeaders } from './lib/rateLimit';

export async function middleware(request) {
  const url = request.nextUrl.clone();
  const pathname = url.pathname;
  let rateLimitHeaders = null;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  let supabaseHost = '';
  let supabaseWsUrl = '';
  try {
    if (supabaseUrl) {
      const parsed = new URL(supabaseUrl);
      supabaseHost = parsed.host;
      supabaseWsUrl = `wss://${supabaseHost}`;
    }
  } catch (e) {
    console.error('[Middleware CSP Error] Invalid NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl);
  }

  const cspValue = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    `img-src 'self' data: blob: ${supabaseUrl ? supabaseUrl : ''} https://*.appsheet.com https://www.appsheet.com`,
    `connect-src 'self' ${supabaseUrl ? supabaseUrl : ''} ${supabaseWsUrl ? supabaseWsUrl : ''} https://*.appsheet.com https://www.appsheet.com`,
    "frame-ancestors 'none'"
  ].filter(Boolean).join('; ');


  const withRateLimit = (res) => {
    if (res) {
      if (rateLimitHeaders) {
        for (const [key, value] of Object.entries(rateLimitHeaders)) {
          res.headers.set(key, value);
        }
      }
      res.headers.set('Content-Security-Policy', cspValue);
    }
    return res;
  };

  // 1. Rate Limiting para APIs (se ejecuta antes de cualquier consulta a base de datos/auth, omitido en desarrollo)
  if (pathname.startsWith('/api/') && process.env.NODE_ENV !== 'development') {
    const ipHeader = request.headers.get('x-forwarded-for');
    const ip = request.ip || (ipHeader ? ipHeader.split(',')[0].trim() : '127.0.0.1');

    let limit = 100;
    let windowMs = 15 * 60 * 1000; // 15 minutos

    if (pathname.startsWith('/api/send-email')) {
      limit = 10;
    } else if (pathname.startsWith('/api/ai/')) {
      limit = 20; // Máximo 20 solicitudes de IA cada 15 minutos por IP
    } else if (pathname.startsWith('/api/clientes') || pathname.startsWith('/api/equipo')) {
      limit = 15;
    } else if (pathname.startsWith('/api/auth/login-cuit')) {
      limit = 5; // Máximo 5 intentos de inicio de sesión por CUIT cada 15 minutos por IP
    }

    let rateLimitResult;
    try {
      rateLimitResult = await checkRateLimit(ip, pathname, limit, windowMs);
      rateLimitHeaders = getRateLimitHeaders(rateLimitResult.limit, rateLimitResult.remaining, rateLimitResult.resetTime);
    } catch (err) {
      console.error('[RateLimit Error]:', err.message);
      return NextResponse.json(
        { error: 'Error de configuración de seguridad del sistema.' },
        { status: 500 }
      );
    }

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Demasiadas solicitudes. Intente más tarde.' },
        { 
          status: 429, 
          headers: rateLimitHeaders 
        }
      );
    }
  }

  // 1.5 Protección CSRF para APIs mutantes (POST, PUT, DELETE, PATCH) en producción/staging
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method) && pathname.startsWith('/api/') && pathname !== '/api/webhooks/mercadopago' && process.env.NODE_ENV !== 'development') {
    const origin = request.headers.get('origin');
    const referer = request.headers.get('referer');
    const appUrl = process.env.APP_URL;

    // En producción/staging, exigir que APP_URL esté configurada (MED-02)
    if (!appUrl && process.env.NODE_ENV !== 'development') {
      console.error('[CSRF Error] APP_URL no configurada en variables de entorno.');
      return withRateLimit(NextResponse.json(
        { error: 'Error de configuración de seguridad en el servidor.' },
        { status: 500 }
      ));
    }

    let isMatch = false;
    if (appUrl) {
      try {
        const appOrigin = new URL(appUrl).origin;
        if (origin && new URL(origin).origin === appOrigin) {
          isMatch = true;
        } else if (!origin && referer && new URL(referer).origin === appOrigin) {
          isMatch = true;
        }
      } catch (e) {
        console.error('[CSRF Error] Invalid APP_URL or headers:', e.message);
      }
    }

    if (!isMatch && appUrl) {
      console.warn(`[CSRF Block] Petición bloqueada. Método: ${request.method}, Ruta: ${pathname}, Origin: ${origin}, Referer: ${referer}`);
      return withRateLimit(NextResponse.json(
        { error: 'Acceso denegado: Petición de origen cruzado no permitida.' },
        { status: 403 }
      ));
    }
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Si no hay variables de Supabase configuradas, saltamos el middleware en desarrollo
  if (!supabaseUrl || !supabaseAnonKey) {
    return withRateLimit(response);
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name) {
        return request.cookies.get(name)?.value;
      },
      set(name, value, options) {
        request.cookies.set({
          name,
          value,
          ...options,
        });
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });
        response.cookies.set({
          name,
          value,
          ...options,
        });
      },
      remove(name, options) {
        request.cookies.set({
          name,
          value: '',
          ...options,
        });
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });
        response.cookies.set({
          name,
          value: '',
          ...options,
        });
      },
    },
  });

  // 2. Obtener el usuario autenticado
  const { data: { user } } = await supabase.auth.getUser();


  // Definir rutas públicas (Las APIs operativas ya no son públicas por defecto)
  const isPublicRoute = 
    pathname === '/login' || 
    pathname === '/register' || 
    pathname === '/reset-password' ||
    pathname === '/terminos' ||
    pathname === '/privacidad' ||
    pathname === '/cookies' ||
    pathname === '/api/auth/login-cuit' ||
    pathname === '/api/webhooks/mercadopago' ||
    pathname.startsWith('/_next/') ||
    pathname.includes('.') || // archivos estáticos en public/
    pathname.startsWith('/brand/');

  const isOnboardingRoute = pathname === '/onboarding';

  // Si no está autenticado
  if (!user) {
    // Si intenta acceder a una ruta privada
    if (!isPublicRoute && !isOnboardingRoute) {
      if (pathname.startsWith('/api/')) {
        return withRateLimit(NextResponse.json(
          { error: 'No autorizado. Debe iniciar sesión.' },
          { status: 401 }
        ));
      }
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }
    return withRateLimit(response);
  }

  // Si está autenticado, obtener su perfil para ver si completó el onboarding (tiene tenant_id)
  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id, role, tenants(slug, plan_id, plan_ends_at, is_exempt, gift_plan_id, gift_ends_at)')
    .eq('id', user.id)
    .single();

  const hasTenant = profile?.tenant_id && profile?.tenants?.slug;

  // Si el usuario no tiene Tenant (onboarding incompleto)
  if (!hasTenant) {
    // Si intenta navegar en cualquier sitio excepto /onboarding
    if (!isOnboardingRoute && !isPublicRoute) {
      if (pathname.startsWith('/api/')) {
        return withRateLimit(NextResponse.json(
          { error: 'Onboarding incompleto. Se requiere registrar una organización.' },
          { status: 403 }
        ));
      }
      url.pathname = '/onboarding';
      return NextResponse.redirect(url);
    }
    return withRateLimit(response);
  }

  // Si el usuario ya tiene Tenant y trata de entrar a /onboarding, /login o /register
  if (hasTenant && (isOnboardingRoute || pathname === '/login' || pathname === '/register')) {
    url.pathname = `/${profile.tenants.slug}/dashboard`;
    return NextResponse.redirect(url);
  }

  // Validar accesos cruzados entre Tenants en rutas del tipo /[tenant_slug]/*
  const pathSegments = pathname.split('/').filter(Boolean);
  if (pathSegments.length > 0) {
    const routeTenantSlug = pathSegments[0];
    
    // Lista de rutas raíz reservadas de Next.js
    const reservedRoutes = ['login', 'register', 'onboarding', 'api', 'brand', 'assets'];
    
    if (!reservedRoutes.includes(routeTenantSlug) && !routeTenantSlug.includes('.')) {
      // Si el slug en la URL no coincide con el slug del tenant del usuario, redirigir a su propio dashboard
      if (routeTenantSlug !== profile.tenants.slug) {
        url.pathname = `/${profile.tenants.slug}/dashboard`;
        return NextResponse.redirect(url);
      }
    }
  }

  // Validar restricciones de plan para rutas del tipo /[tenant_slug]/[seccion]
  if (hasTenant && pathSegments.length >= 2) {
    const routeTenantSlug = pathSegments[0];
    const section = pathSegments[1];
    
    const reservedRoutes = ['login', 'register', 'onboarding', 'api', 'brand', 'assets'];
    if (!reservedRoutes.includes(routeTenantSlug) && !routeTenantSlug.includes('.')) {
      const tenant = profile.tenants;
      
      // Obtener plan efectivo en el middleware
      let effectivePlan = 'free';
      if (tenant) {
        if (tenant.is_exempt) {
          effectivePlan = 'libre';
        } else if (tenant.gift_plan_id && tenant.gift_ends_at && new Date(tenant.gift_ends_at) > new Date()) {
          effectivePlan = tenant.gift_plan_id;
        } else if (tenant.plan_ends_at && new Date(tenant.plan_ends_at) < new Date()) {
          effectivePlan = 'free';
        } else {
          effectivePlan = tenant.plan_id || 'free';
        }
      }
      
      // Definir características habilitadas por plan
      const planFeatures = {
        free: ['programa', 'capacitacion', 'correctivas', 'accidentes', 'matriz-riesgos', 'nomina', 'dashboard', 'profile', 'empresas', 'equipo'],
        basic_5: ['programa', 'capacitacion', 'correctivas', 'accidentes', 'matriz-riesgos', 'nomina', 'dashboard', 'profile', 'extintores', 'control-electrico', 'empresas', 'equipo'],
        standard_25: ['programa', 'capacitacion', 'correctivas', 'accidentes', 'matriz-riesgos', 'nomina', 'dashboard', 'profile', 'extintores', 'control-electrico', 'visitas', 'avisos', 'empresas', 'equipo'],
        libre: ['programa', 'capacitacion', 'correctivas', 'accidentes', 'matriz-riesgos', 'nomina', 'dashboard', 'profile', 'extintores', 'control-electrico', 'visitas', 'avisos', 'checklist-personalizados', 'legajo', 'portal-clientes', 'empresas', 'equipo']
      };
      
      const allowedFeatures = planFeatures[effectivePlan] || planFeatures.free;
      
      // Si la sección no está permitida por el plan, redirigir a perfil con banner de actualización
      if (!allowedFeatures.includes(section)) {
        url.pathname = `/${profile.tenants.slug}/profile`;
        url.searchParams.set('upgrade', 'true');
        url.searchParams.set('section', section);
        return NextResponse.redirect(url);
      }
    }
  }

  return withRateLimit(response);

}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
