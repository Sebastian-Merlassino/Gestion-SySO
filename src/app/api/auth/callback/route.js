// src/app/api/auth/callback/route.js
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') || '/onboarding';

  // Evitar ataques de redirección abierta validando que sea una ruta local
  let safeNext = next;
  if (!next.startsWith('/')) {
    safeNext = '/onboarding';
  }

  if (code) {
    const cookieStore = cookies();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
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

    try {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        return NextResponse.redirect(`${requestUrl.origin}${safeNext}`);
      }
      console.error('[Auth Callback Error] Failed to exchange code:', error.message);
    } catch (err) {
      console.error('[Auth Callback Exception]:', err);
    }
  }

  // Fallback si no hay código o falla el intercambio: redirigir a login indicando error
  return NextResponse.redirect(`${requestUrl.origin}/login?error=auth_callback_failed`);
}
