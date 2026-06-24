// src/app/api/equipo/route.js
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const createMiembroSchema = z.object({
  email: z.string().email('Dirección de correo electrónico inválida.'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres.'),
  full_name: z.string().min(1, 'El nombre completo es requerido.'),
  role: z.literal('miembro').optional(),
  cuit: z.string().regex(/^\d{11}$/, 'El CUIT debe ser una cadena numérica de exactamente 11 dígitos.').or(z.string().length(0)).optional(),
  tenant_id: z.string().uuid().optional()
});

const updateMiembroSchema = z.object({
  userId: z.string().uuid('userId debe ser un UUID válido.'),
  email: z.string().email('Dirección de correo electrónico inválida.').optional(),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres.').optional(),
  full_name: z.string().min(1, 'El nombre completo es requerido.').optional(),
  role: z.literal('miembro').optional()
});

const deleteMiembroSchema = z.object({
  userId: z.string().uuid('userId debe ser un UUID válido.')
});

export async function POST(request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

    if (!supabaseSecretKey) {
      return NextResponse.json({ error: 'Supabase service role key is not configured' }, { status: 500 });
    }

    // Initialize Server Client to authenticate the requester
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

    // Get profiles to check role & tenant_id
    const { data: profile, error: profError } = await serverClient
      .from('profiles')
      .select('role, tenant_id')
      .eq('id', user.id)
      .single();

    if (profError || !profile) {
      return NextResponse.json({ error: 'No se pudo obtener el perfil de usuario' }, { status: 403 });
    }

    // Only admins can manage team login credentials
    if (profile.role !== 'admin') {
      return NextResponse.json({ error: 'No tienes permisos para realizar esta acción' }, { status: 403 });
    }

    const body = await request.json();
    const parseResult = createMiembroSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json({ 
        error: 'Parámetros inválidos.', 
        details: parseResult.error.format() 
      }, { status: 400 });
    }
    const { email, password, full_name, role, cuit, tenant_id } = parseResult.data;

    // --- Validación de Límites de Plan Comercial (Miembros de Equipo) ---
    const { data: tenant, error: tenantErr } = await serverClient
      .from('tenants')
      .select('plan_id')
      .eq('id', profile.tenant_id)
      .single();

    if (tenantErr || !tenant) {
      return NextResponse.json({ error: 'No se pudo obtener la información de suscripción del tenant' }, { status: 403 });
    }

    const { count: memberCount, error: countErr } = await serverClient
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', profile.tenant_id)
      .eq('role', 'miembro');

    if (countErr) {
      return NextResponse.json({ error: 'Error al verificar límites del plan' }, { status: 500 });
    }

    let maxMembers = Infinity;
    if (tenant.plan_id === 'free') maxMembers = 1;
    else if (tenant.plan_id === 'basic_5') maxMembers = 2; // Plan básico permite 2 técnicos adicionales
    else if (tenant.plan_id === 'standard_25') maxMembers = 5; // Plan standard permite 5 técnicos adicionales
    else if (tenant.plan_id === 'trial') maxMembers = 5;

    if (memberCount >= maxMembers) {
      return NextResponse.json({ 
        error: `Límite de plan excedido. Tu plan actual (${tenant.plan_id}) permite un máximo de ${maxMembers} miembros de equipo técnico.` 
      }, { status: 403 });
    }
    // --------------------------------------------------------------------

    // Initialize Admin client with service role key to write to auth.users
    const adminClient = createClient(supabaseUrl, supabaseSecretKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Check if user already exists in profiles
    const { data: existingProfile } = await adminClient
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    let userId = '';

    if (existingProfile) {
      userId = existingProfile.id;
    } else {
      // Create user in auth.users
      const { data: newUserData, error: createError } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto-confirm email to bypass confirmation email flow
        user_metadata: {
          full_name,
          role: role || 'miembro',
          cuit,
          tenant_id: profile.tenant_id
        }
      });

      if (createError) {
        return NextResponse.json({ error: createError.message }, { status: 400 });
      }

      userId = newUserData.user.id;
    }

    // Update the profile manually to link to the same tenant & set role ONLY IF it's a new user
    if (!existingProfile) {
      const { error: updateProfileError } = await adminClient
        .from('profiles')
        .update({ 
          tenant_id: profile.tenant_id,
          role: role || 'miembro'
        })
        .eq('id', userId);

      if (updateProfileError) {
        // Cleanup the user if profile linking failed
        await adminClient.auth.admin.deleteUser(userId);
        return NextResponse.json({ error: `Error enlazando perfil: ${updateProfileError.message}` }, { status: 400 });
      }
    }

    return NextResponse.json({ success: true, userId });

  } catch (err) {
    console.error('Error in API equipo POST:', err);
    return NextResponse.json({ error: 'Error interno del servidor. Intente nuevamente.' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

    if (!supabaseSecretKey) {
      return NextResponse.json({ error: 'Supabase service role key is not configured' }, { status: 500 });
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

    // Only admins can remove members
    if (profile.role !== 'admin') {
      return NextResponse.json({ error: 'No tienes permisos para realizar esta acción' }, { status: 403 });
    }

    const url = new URL(request.url);
    const userIdToDelete = url.searchParams.get('userId');

    const parseResult = deleteMiembroSchema.safeParse({ userId: userIdToDelete });
    if (!parseResult.success) {
      return NextResponse.json({ 
        error: 'Parámetro userId inválido.', 
        details: parseResult.error.format() 
      }, { status: 400 });
    }

    // Check if the user to delete belongs to the same tenant to prevent cross-tenant deleting
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

    // Cannot delete an admin or yourself
    if (targetProfile.role === 'admin') {
      return NextResponse.json({ error: 'No se puede eliminar a un administrador del tenant' }, { status: 400 });
    }
    if (userIdToDelete === user.id) {
      return NextResponse.json({ error: 'No puedes eliminarte a ti mismo de la plataforma' }, { status: 400 });
    }

    // Initialize Admin client to delete the user
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
    console.error('Error in API equipo DELETE:', err);
    return NextResponse.json({ error: 'Error interno del servidor. Intente nuevamente.' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

    if (!supabaseSecretKey) {
      return NextResponse.json({ error: 'Supabase service role key is not configured' }, { status: 500 });
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

    // Only admins can update team login credentials
    if (profile.role !== 'admin') {
      return NextResponse.json({ error: 'No tienes permisos para realizar esta acción' }, { status: 403 });
    }

    const body = await request.json();
    const parseResult = updateMiembroSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json({ 
        error: 'Parámetros inválidos.', 
        details: parseResult.error.format() 
      }, { status: 400 });
    }
    const { userId, email, password, full_name, role } = parseResult.data;

    // Check if the user to update belongs to the same tenant
    const { data: targetProfile, error: targetError } = await serverClient
      .from('profiles')
      .select('tenant_id')
      .eq('id', userId)
      .single();

    if (targetError || !targetProfile) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    if (targetProfile.tenant_id !== profile.tenant_id) {
      return NextResponse.json({ error: 'No autorizado para modificar usuarios de otro tenant' }, { status: 403 });
    }

    // Initialize Admin client
    const adminClient = createClient(supabaseUrl, supabaseSecretKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const updateData = {};
    if (email) {
      updateData.email = email;
      updateData.email_confirm = true;
    }
    if (password) updateData.password = password;
    if (full_name) {
      updateData.user_metadata = {
        ...(updateData.user_metadata || {}),
        full_name
      };
    }

    if (Object.keys(updateData).length > 0) {
      const { error: updateAuthError } = await adminClient.auth.admin.updateUserById(userId, updateData);
      if (updateAuthError) {
        return NextResponse.json({ error: updateAuthError.message }, { status: 400 });
      }
    }

    // If email needs to be updated on profiles
    if (email) {
      const { error: updateProfileEmailError } = await adminClient
        .from('profiles')
        .update({ email })
        .eq('id', userId);

      if (updateProfileEmailError) {
        return NextResponse.json({ error: `Error actualizando correo en perfil: ${updateProfileEmailError.message}` }, { status: 400 });
      }
    }

    // If role needs to be updated on profiles
    if (role) {
      const { error: updateProfileError } = await adminClient
        .from('profiles')
        .update({ role })
        .eq('id', userId);

      if (updateProfileError) {
        return NextResponse.json({ error: `Error actualizando rol en perfil: ${updateProfileError.message}` }, { status: 400 });
      }
    }

    return NextResponse.json({ success: true });

  } catch (err) {
    console.error('Error in API equipo PUT:', err);
    return NextResponse.json({ error: 'Error interno del servidor. Intente nuevamente.' }, { status: 500 });
  }
}
