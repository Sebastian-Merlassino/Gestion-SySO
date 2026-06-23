// src/app/api/clientes/route.js
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

    if (!supabaseSecretKey) {
      return NextResponse.json({ error: 'La clave de rol de servicio (service_role) de Supabase no está configurada' }, { status: 500 });
    }

    // Inicializar cliente del servidor para autenticar a quien hace la petición
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

    const { data: { user }, error: authError } = await serverClient.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Obtener perfil para validar rol y tenant_id
    const { data: profile, error: profError } = await serverClient
      .from('profiles')
      .select('role, tenant_id')
      .eq('id', user.id)
      .single();

    if (profError || !profile) {
      return NextResponse.json({ error: 'No se pudo obtener el perfil de usuario' }, { status: 403 });
    }

    // Solo los administradores pueden habilitar credenciales de clientes
    if (profile.role !== 'admin') {
      return NextResponse.json({ error: 'No tienes permisos de administrador para realizar esta acción' }, { status: 403 });
    }

    const body = await request.json();
    const { empresaId, email, password, full_name, cuit } = body;

    if (!empresaId || !email || !password || !full_name || !cuit) {
      return NextResponse.json({ error: 'Faltan campos obligatorios (empresaId, email, password, full_name, cuit)' }, { status: 400 });
    }

    // Verificar que la empresa pertenece al mismo tenant para evitar cruce de tenants
    const { data: targetEmpresa, error: empError } = await serverClient
      .from('empresas')
      .select('tenant_id')
      .eq('id', empresaId)
      .single();

    if (empError || !targetEmpresa) {
      return NextResponse.json({ error: 'Empresa no encontrada' }, { status: 404 });
    }

    if (targetEmpresa.tenant_id !== profile.tenant_id) {
      return NextResponse.json({ error: 'No autorizado para configurar accesos de empresas de otro tenant' }, { status: 403 });
    }

    // Inicializar cliente admin con service role key para escribir en auth.users
    const adminClient = createClient(supabaseUrl, supabaseSecretKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Verificar si el CUIT ya está en uso por otro cliente
    const { data: existingProfile } = await adminClient
      .from('profiles')
      .select('id, email')
      .eq('cuit', cuit)
      .eq('role', 'cliente')
      .maybeSingle();

    if (existingProfile) {
      return NextResponse.json({ error: `El CUIT ${cuit} ya tiene un usuario de portal activo (${existingProfile.email})` }, { status: 400 });
    }

    // Crear usuario en auth.users
    const { data: newUserData, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirmar el email para evitar correos de verificación obligatorios
      user_metadata: {
        full_name,
        role: 'cliente',
        tenant_id: profile.tenant_id,
        empresa_id: empresaId,
        cuit
      }
    });

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 400 });
    }

    const userId = newUserData.user.id;

    // Actualizar el perfil manualmente para asegurar enlace al tenant y empresa correspondientes
    const { error: updateProfileError } = await adminClient
      .from('profiles')
      .update({ 
        tenant_id: profile.tenant_id,
        empresa_id: empresaId,
        role: 'cliente',
        cuit,
        full_name
      })
      .eq('id', userId);

    if (updateProfileError) {
      // Limpiar el usuario creado en auth.users si falló la vinculación de base de datos
      await adminClient.auth.admin.deleteUser(userId);
      return NextResponse.json({ error: `Error enlazando perfil de cliente: ${updateProfileError.message}` }, { status: 400 });
    }

    return NextResponse.json({ success: true, userId });

  } catch (err) {
    console.error('Error in API clientes POST:', err);
    return NextResponse.json({ error: 'Error interno del servidor. Intente nuevamente.' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

    if (!supabaseSecretKey) {
      return NextResponse.json({ error: 'La clave de rol de servicio (service_role) de Supabase no está configurada' }, { status: 500 });
    }

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

    const { data: { user }, error: authError } = await serverClient.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { data: profile, error: profError } = await serverClient
      .from('profiles')
      .select('role, tenant_id')
      .eq('id', user.id)
      .single();

    if (profError || !profile) {
      return NextResponse.json({ error: 'No se pudo obtener el perfil de usuario' }, { status: 403 });
    }

    // Solo los administradores pueden deshabilitar portales de cliente
    if (profile.role !== 'admin') {
      return NextResponse.json({ error: 'No tienes permisos de administrador para realizar esta acción' }, { status: 403 });
    }

    const url = new URL(request.url);
    const userIdToDelete = url.searchParams.get('userId');

    if (!userIdToDelete) {
      return NextResponse.json({ error: 'Falta el parámetro userId' }, { status: 400 });
    }

    // Verificar que el usuario destino pertenece al mismo tenant y es cliente para evitar IDORs cruzados
    const { data: targetProfile, error: targetError } = await serverClient
      .from('profiles')
      .select('tenant_id, role')
      .eq('id', userIdToDelete)
      .single();

    if (targetError || !targetProfile) {
      return NextResponse.json({ error: 'Usuario destino no encontrado' }, { status: 404 });
    }

    if (targetProfile.tenant_id !== profile.tenant_id) {
      return NextResponse.json({ error: 'No autorizado para borrar usuarios de otro tenant' }, { status: 403 });
    }

    if (targetProfile.role !== 'cliente') {
      return NextResponse.json({ error: 'El usuario destino no es un cliente' }, { status: 400 });
    }

    // Inicializar cliente admin para borrar el usuario
    const adminClient = createClient(supabaseUrl, supabaseSecretKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userIdToDelete);
    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });

  } catch (err) {
    console.error('Error in API clientes DELETE:', err);
    return NextResponse.json({ error: 'Error interno del servidor. Intente nuevamente.' }, { status: 500 });
  }
}
