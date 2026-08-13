// src/app/api/auth/verify-recovery/route.js
// Ruta server-side que verifica el token de recuperación y establece la sesión
// antes de redirigir a /reset-password para que el usuario ingrese su nueva clave.
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request) {
  const requestUrl = new URL(request.url);
  const tokenHash = requestUrl.searchParams.get('token_hash');
  const type = requestUrl.searchParams.get('type') || 'recovery';
  const origin = requestUrl.origin;

  if (!tokenHash) {
    console.error('[Verify Recovery] No se recibió token_hash.');
    return NextResponse.redirect(`${origin}/login?error=missing_token`);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('[Verify Recovery] Faltan variables de entorno de Supabase.');
    return NextResponse.redirect(`${origin}/login?error=config`);
  }

  const cookieStore = cookies();

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
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });

    if (error) {
      console.error('[Verify Recovery] Error al verificar OTP:', error.message);
      return NextResponse.redirect(`${origin}/reset-password?error=invalid_or_expired`);
    }

    // Verificación exitosa: la sesión queda establecida en las cookies
    // Redirigir a /reset-password donde el usuario podrá ingresar su nueva clave
    console.log('[Verify Recovery] Token verificado exitosamente. Redirigiendo a /reset-password.');
    return NextResponse.redirect(`${origin}/reset-password`);
  } catch (err) {
    console.error('[Verify Recovery] Excepción:', err);
    return NextResponse.redirect(`${origin}/reset-password?error=unexpected`);
  }
}
