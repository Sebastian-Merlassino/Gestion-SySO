// src/middleware.js
import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import { checkRateLimit, getRateLimitHeaders } from './lib/rateLimit';

export async function middleware(request) {
  const url = request.nextUrl.clone();
  const pathname = url.pathname;
  let rateLimitHeaders = null;

  const withRateLimit = (res) => {
    if (rateLimitHeaders && res) {
      for (const [key, value] of Object.entries(rateLimitHeaders)) {
        res.headers.set(key, value);
      }
    }
    return res;
  };

  // 1. Rate Limiting para APIs (se ejecuta antes de cualquier consulta a base de datos/auth)
  if (pathname.startsWith('/api/')) {
    const ipHeader = request.headers.get('x-forwarded-for');
    const ip = request.ip || (ipHeader ? ipHeader.split(',')[0].trim() : '127.0.0.1');

    let limit = 100;
    let windowMs = 15 * 60 * 1000; // 15 minutos

    if (pathname.startsWith('/api/send-email')) {
      limit = 10;
    } else if (pathname.startsWith('/api/clientes') || pathname.startsWith('/api/equipo')) {
      limit = 15;
    }

    const rateLimitResult = await checkRateLimit(ip, pathname, limit, windowMs);
    rateLimitHeaders = getRateLimitHeaders(rateLimitResult.limit, rateLimitResult.remaining, rateLimitResult.resetTime);

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

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Si no hay variables de Supabase configuradas, saltamos el middleware en desarrollo
  if (!supabaseUrl || !supabaseAnonKey) {
    return withRateLimit(response);
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name) {
        const val = request.cookies.get(name)?.value;
        return val ? decodeURIComponent(val) : undefined;
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
          maxAge: -1,
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
          maxAge: -1,
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
    .select('tenant_id, role, tenants(slug)')
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
