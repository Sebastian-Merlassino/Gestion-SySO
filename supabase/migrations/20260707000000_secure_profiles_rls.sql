-- Migration: Secure profile RLS to prevent cross-company data leakage for client portal users.
-- File: supabase/migrations/20260707000000_secure_profiles_rls.sql

-- 1. Crear función helper para obtener el rol del usuario logueado sin recursión de RLS
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text AS $$
BEGIN
  RETURN (
    SELECT role FROM public.profiles WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Eliminar la política anterior de lectura de perfiles
DROP POLICY IF EXISTS profile_isolation_select ON public.profiles;

-- 3. Crear la nueva política restrictiva para lectura de perfiles
CREATE POLICY profile_isolation_select ON public.profiles
    FOR SELECT TO authenticated
    USING (
        -- Si el usuario es administrador o miembro técnico del tenant, tiene acceso a todos los perfiles de sus tenants asociados
        (
            public.get_current_user_role() IN ('admin', 'miembro')
            AND public.user_has_tenant_access(tenant_id)
        )
        OR
        -- Si el usuario es cliente, solo puede ver:
        -- a) Su propio perfil
        -- b) Perfiles de otros clientes de su misma empresa
        -- c) Perfiles de administradores y miembros del equipo técnico del mismo tenant
        (
            public.get_current_user_role() = 'cliente'
            AND (
                id = auth.uid()
                OR (empresa_id = public.get_current_user_empresa_id() AND role = 'cliente')
                OR (tenant_id = public.get_current_tenant_id() AND role IN ('admin', 'miembro'))
            )
        )
    );

-- Recargar el caché de PostgREST
NOTIFY pgrst, 'reload schema';
