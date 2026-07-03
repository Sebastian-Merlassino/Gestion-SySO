// src/app/api/auth/login-cuit/route.js
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const loginCuitSchema = z.object({
  cuit: z.string().regex(/^\d{11}$/, 'El CUIT debe ser una cadena numérica de exactamente 11 dígitos.'),
  password: z.string().min(1, 'La contraseña es requerida.')
});

export async function POST(request) {
  try {
    const body = await request.json();
    const parseResult = loginCuitSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json({ error: 'El CUIT debe contener exactamente 11 números enteros.' }, { status: 400 });
    }
    const { cuit, password } = parseResult.data;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const supabaseSecretKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY; // service_role

    if (!supabaseSecretKey) {
      return NextResponse.json({ error: 'La configuración de base de datos no está completa.' }, { status: 500 });
    }

    // 1. Buscar email por CUIT en la base de datos usando el rol de servicio
    const adminClient = createClient(supabaseUrl, supabaseSecretKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const { data: profile, error: dbError } = await adminClient
      .from('profiles')
      .select('email')
      .eq('cuit', cuit)
      .eq('role', 'cliente')
      .maybeSingle();

    if (dbError || !profile) {
      // Retornar error genérico de credenciales para evitar enumeración/cosecha de CUITs
      return NextResponse.json({ error: 'Credenciales de inicio de sesión inválidas o cliente no registrado.' }, { status: 400 });
    }

    // 2. Autenticar en Supabase usando el email obtenido y la contraseña provista
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

    const { data: authData, error: authError } = await serverClient.auth.signInWithPassword({
      email: profile.email,
      password,
    });

    if (authError) {
      return NextResponse.json({ error: 'Credenciales de inicio de sesión inválidas. Por favor, verifica tu contraseña.' }, { status: 400 });
    }

    // 3. Obtener el perfil y el tenant para redireccionar al dashboard
    const { data: tenantProfile } = await adminClient
      .from('profiles')
      .select('tenant_id, tenants(slug)')
      .eq('id', authData.user.id)
      .single();

    const slug = tenantProfile?.tenants?.slug;

    return NextResponse.json({
      success: true,
      redirectUrl: slug ? `/${slug}/dashboard` : '/onboarding'
    });

  } catch (err) {
    console.error('Error in API login-cuit POST:', err);
    return NextResponse.json({ error: 'Error interno del servidor. Intente nuevamente.' }, { status: 500 });
  }
}
