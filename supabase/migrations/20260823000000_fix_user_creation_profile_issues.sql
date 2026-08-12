-- Migration: Fix user creation profile trigger, RLS policies, UUID casting and date constraints (HTTP 400 fix)
-- File: supabase/migrations/20260823000000_fix_user_creation_profile_issues.sql

-- 1. Actualizar handle_new_user con NULLIF para evitar errores de cast de texto vacío a UUID ('' :: uuid)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role text;
  v_tenant_id uuid;
  v_empresa_id uuid;
  v_cuit text;
BEGIN
  -- Extraer metadatos defensivamente
  v_role := COALESCE(new.raw_user_meta_data->>'role', 'miembro');
  -- Si el rol es 'owner', mapear a 'admin' para mantener consistencia con los roles del sistema
  IF v_role = 'owner' THEN
    v_role := 'admin';
  END IF;

  v_tenant_id := CASE 
    WHEN new.raw_user_meta_data->>'tenant_id' IS NOT NULL AND new.raw_user_meta_data->>'tenant_id' <> '' 
    THEN (new.raw_user_meta_data->>'tenant_id')::uuid 
    ELSE NULL 
  END;

  v_empresa_id := CASE 
    WHEN new.raw_user_meta_data->>'empresa_id' IS NOT NULL AND new.raw_user_meta_data->>'empresa_id' <> '' 
    THEN (new.raw_user_meta_data->>'empresa_id')::uuid 
    ELSE NULL 
  END;

  v_cuit := NULLIF(new.raw_user_meta_data->>'cuit', '');

  INSERT INTO public.profiles (
    id, 
    email, 
    full_name, 
    role, 
    tenant_id, 
    empresa_id, 
    cuit
  )
  VALUES (
    new.id, 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'full_name', ''), 
    v_role,
    v_tenant_id,
    v_empresa_id,
    v_cuit
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = CASE WHEN EXCLUDED.full_name <> '' THEN EXCLUDED.full_name ELSE public.profiles.full_name END,
    role = COALESCE(EXCLUDED.role, public.profiles.role),
    tenant_id = COALESCE(EXCLUDED.tenant_id, public.profiles.tenant_id),
    empresa_id = COALESCE(EXCLUDED.empresa_id, public.profiles.empresa_id),
    cuit = COALESCE(EXCLUDED.cuit, public.profiles.cuit);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Asegurar que la política RLS de lectura de perfiles (profile_isolation_select) permita siempre leer el propio perfil
DROP POLICY IF EXISTS profile_isolation_select ON public.profiles;

CREATE POLICY profile_isolation_select ON public.profiles
    FOR SELECT TO authenticated
    USING (
        -- Cualquier usuario autenticado puede leer su propio perfil siempre
        id = auth.uid()
        OR
        -- Administradores y miembros pueden leer perfiles de sus tenants asociados
        (
            public.get_current_user_role() IN ('admin', 'miembro')
            AND tenant_id IS NOT NULL 
            AND public.user_has_tenant_access(tenant_id)
        )
        OR
        -- Usuarios clientes pueden ver otros clientes de su misma empresa o los admin/miembros de su tenant
        (
            public.get_current_user_role() = 'cliente'
            AND (
                (empresa_id IS NOT NULL AND empresa_id = public.get_current_user_empresa_id() AND role = 'cliente')
                OR (tenant_id IS NOT NULL AND tenant_id = public.get_current_tenant_id() AND role IN ('admin', 'miembro'))
            )
        )
    );

-- Recargar el caché de PostgREST
NOTIFY pgrst, 'reload schema';
