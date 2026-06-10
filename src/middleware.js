// src/middleware.js
import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

export async function middleware(request) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Si no hay variables de Supabase configuradas, saltamos el middleware en desarrollo
  if (!supabaseUrl || !supabaseAnonKey) {
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          request.cookies.set(name, value)
        );
        response = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // 1. Obtener el usuario autenticado
  const { data: { user } } = await supabase.auth.getUser();

  const url = request.nextUrl.clone();
  const pathname = url.pathname;

  // Definir rutas públicas
  const isPublicRoute = 
    pathname === '/login' || 
    pathname === '/register' || 
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.includes('.') || // archivos estáticos en public/
    pathname.startsWith('/brand/');

  const isOnboardingRoute = pathname === '/onboarding';

  // Si no está autenticado
  if (!user) {
    // Si intenta acceder a una ruta privada, redirigir a /login
    if (!isPublicRoute && !isOnboardingRoute) {
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }
    return response;
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
    // Si intenta navegar en cualquier sitio excepto /onboarding, forzar redirección
    if (!isOnboardingRoute && !isPublicRoute) {
      url.pathname = '/onboarding';
      return NextResponse.redirect(url);
    }
    return response;
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
    
    if (!reservedRoutes.includes(routeTenantSlug)) {
      // Si el slug en la URL no coincide con el slug del tenant del usuario, redirigir a su propio dashboard
      if (routeTenantSlug !== profile.tenants.slug) {
        url.pathname = `/${profile.tenants.slug}/dashboard`;
        return NextResponse.redirect(url);
      }
    }
  }

  return response;
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
