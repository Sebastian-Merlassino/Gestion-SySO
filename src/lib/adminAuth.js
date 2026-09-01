// src/lib/adminAuth.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

/**
 * Lista de correos autorizados como SuperAdmin configurados en variables de entorno.
 */
export function getSuperAdminEmails() {
  const envEmails = 
    process.env.SUPERADMIN_EMAILS || 
    process.env.NEXT_PUBLIC_SUPERADMIN_EMAILS || 
    'admin@gestionsyso.com';
    
  return envEmails
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Comprueba si un correo o perfil cuenta con privilegios de SuperAdmin.
 * Enfoque híbrido: Valida lista de emails de entorno O columna is_superadmin en base de datos.
 * 
 * @param {string} email - Correo del usuario a verificar.
 * @param {object} [profile] - Perfil opcional del usuario con campo is_superadmin.
 * @returns {boolean}
 */
export function checkIsSuperAdmin(email, profile = null) {
  if (!email) return false;
  
  const cleanEmail = String(email).trim().toLowerCase();
  const allowedEmails = getSuperAdminEmails();

  // 1. Verificación por lista de entorno
  if (allowedEmails.includes(cleanEmail)) {
    return true;
  }

  // 2. Verificación por perfil de base de datos
  if (profile && profile.is_superadmin === true) {
    return true;
  }

  return false;
}

/**
 * Valida a nivel de servidor (API Routes o Server Actions) si el usuario actual es SuperAdmin.
 * Utiliza el cliente administrativo de Supabase con service_role.
 * 
 * @param {string} userId - ID de autenticación (auth.users.id)
 * @param {string} userEmail - Email del usuario autenticado
 * @returns {Promise<{ isAuthorized: boolean, profile?: object, error?: string }>}
 */
export async function verifySuperAdminServer(userId, userEmail) {
  if (!userId || !userEmail) {
    return { isAuthorized: false, error: 'Usuario no autenticado.' };
  }

  const cleanEmail = String(userEmail).trim().toLowerCase();
  const allowedEmails = getSuperAdminEmails();

  // Si está en la variable de entorno, es SuperAdmin de inmediato
  if (allowedEmails.includes(cleanEmail)) {
    return { isAuthorized: true };
  }

  if (!serviceRoleKey) {
    return { isAuthorized: false, error: 'Configuración de servidor incompleta.' };
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: profile, error } = await adminClient
    .from('profiles')
    .select('id, email, is_superadmin, role, full_name')
    .eq('id', userId)
    .maybeSingle();

  if (error || !profile) {
    return { isAuthorized: false, error: 'Perfil no encontrado.' };
  }

  if (profile.is_superadmin === true) {
    return { isAuthorized: true, profile };
  }

  return { isAuthorized: false, error: 'Acceso denegado: No posee privilegios de SuperAdmin.' };
}
