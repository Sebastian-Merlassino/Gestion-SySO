-- Migration: Unify user roles to admin and miembro, updating constraints and helper functions.
-- File: supabase/migrations/20260630020000_unify_roles.sql

-- 1. Eliminar la restricción CHECK anterior de roles en profiles para permitir la transición
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- 2. Actualizar roles existentes en la tabla profiles
UPDATE public.profiles
SET role = 'admin'
WHERE role = 'owner';

UPDATE public.profiles
SET role = 'miembro'
WHERE role IN ('supervisor', 'inspector');

-- 3. Agregar la nueva restricción CHECK de roles en profiles
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('admin', 'miembro'));

-- 3. Establecer el valor por defecto para role en profiles
ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'miembro';

-- 4. Actualizar función helper is_owner_or_admin
CREATE OR REPLACE FUNCTION public.is_owner_or_admin(user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_id AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Actualizar función helper user_has_edit_permission
CREATE OR REPLACE FUNCTION public.user_has_edit_permission(p_section text)
RETURNS boolean AS $$
DECLARE
  v_role text;
  v_permisos jsonb;
BEGIN
  SELECT role, permisos INTO v_role, v_permisos
  FROM public.profiles
  WHERE id = auth.uid();
  
  -- Si no hay perfil en sesión, denegar acceso de edición
  IF v_role IS NULL THEN
    RETURN false;
  END IF;
  
  -- Administrador tiene permisos absolutos
  IF v_role = 'admin' THEN
    RETURN true;
  END IF;
  
  -- Si no hay JSON de permisos, denegar por defecto
  IF v_permisos IS NULL THEN
    RETURN false;
  END IF;
  
  RETURN COALESCE((v_permisos->p_section)::boolean, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Actualizar función helper para eliminar cuenta propia
CREATE OR REPLACE FUNCTION public.delete_own_account()
RETURNS void AS $$
DECLARE
    v_tenant_id UUID;
    v_role TEXT;
BEGIN
    SELECT tenant_id, role INTO v_tenant_id, v_role
    FROM public.profiles
    WHERE id = auth.uid();

    -- Los administradores (que unifican owner) tienen el derecho a eliminar el tenant/organización completo si tienen uno asignado
    IF v_role = 'admin' AND v_tenant_id IS NOT NULL THEN
        DELETE FROM public.tenants WHERE id = v_tenant_id;
    END IF;

    DELETE FROM auth.users WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Actualizar la función trigger sync_profile_to_miembro
CREATE OR REPLACE FUNCTION public.sync_profile_to_miembro()
RETURNS TRIGGER AS $$
BEGIN
  -- Si el perfil tiene asignado un tenant, pertenece a roles de administración y tiene completo el onboarding
  IF NEW.tenant_id IS NOT NULL 
     AND NEW.role = 'admin' 
     AND NEW.full_name IS NOT NULL 
     AND NEW.cuit IS NOT NULL 
     AND NEW.phone IS NOT NULL 
     AND NEW.birth_date IS NOT NULL 
     AND NEW.provincia IS NOT NULL 
     AND NEW.departamento_partido IS NOT NULL THEN
     
    IF EXISTS (SELECT 1 FROM public.miembros_equipo WHERE profile_id = NEW.id) THEN
      -- Check if target record is distinct to prevent infinite trigger loops
      IF EXISTS (
        SELECT 1 FROM public.miembros_equipo
        WHERE profile_id = NEW.id
          AND (
            full_name IS DISTINCT FROM NEW.full_name OR
            email IS DISTINCT FROM NEW.email OR
            cuit IS DISTINCT FROM NEW.cuit OR
            phone IS DISTINCT FROM NEW.phone OR
            birth_date IS DISTINCT FROM NEW.birth_date OR
            provincia IS DISTINCT FROM NEW.provincia OR
            partido IS DISTINCT FROM NEW.departamento_partido OR
            localidad IS DISTINCT FROM NEW.localidad OR
            tiene_acceso IS DISTINCT FROM TRUE OR
            tenant_id IS DISTINCT FROM NEW.tenant_id OR
            signature_url IS DISTINCT FROM NEW.signature_url OR
            permisos IS DISTINCT FROM COALESCE(NEW.permisos, permisos)
          )
      ) THEN
        UPDATE public.miembros_equipo
        SET 
          full_name = NEW.full_name,
          email = NEW.email,
          cuit = NEW.cuit,
          phone = NEW.phone,
          birth_date = NEW.birth_date,
          provincia = NEW.provincia,
          partido = NEW.departamento_partido,
          localidad = NEW.localidad,
          tiene_acceso = TRUE,
          tenant_id = NEW.tenant_id,
          signature_url = NEW.signature_url,
          permisos = COALESCE(NEW.permisos, permisos),
          updated_at = timezone('utc'::text, now())
        WHERE profile_id = NEW.id;
      END IF;
    ELSE
      INSERT INTO public.miembros_equipo (
        tenant_id, 
        full_name, 
        email, 
        cuit, 
        phone, 
        birth_date, 
        provincia, 
        partido, 
        localidad, 
        tiene_acceso, 
        profile_id, 
        signature_url,
        permisos
      ) VALUES (
        NEW.tenant_id, 
        NEW.full_name, 
        NEW.email, 
        NEW.cuit, 
        NEW.phone, 
        NEW.birth_date, 
        NEW.provincia, 
        NEW.departamento_partido, 
        NEW.localidad, 
        TRUE, 
        NEW.id, 
        NEW.signature_url,
        COALESCE(NEW.permisos, '{"empresas": true, "equipo": true, "programa": true, "capacitacion": true, "correctivas": true, "extintores": true, "visitas": true}'::jsonb)
      );
    END IF;
  ELSE
    -- Para otros roles, actualizamos el miembro existente
    -- Check if target record is distinct to prevent infinite trigger loops
    IF EXISTS (
      SELECT 1 FROM public.miembros_equipo
      WHERE profile_id = NEW.id
        AND (
          full_name IS DISTINCT FROM NEW.full_name OR
          email IS DISTINCT FROM NEW.email OR
          phone IS DISTINCT FROM COALESCE(NEW.phone, phone) OR
          cuit IS DISTINCT FROM COALESCE(NEW.cuit, cuit) OR
          birth_date IS DISTINCT FROM COALESCE(NEW.birth_date, birth_date) OR
          provincia IS DISTINCT FROM COALESCE(NEW.provincia, provincia) OR
          partido IS DISTINCT FROM COALESCE(NEW.departamento_partido, partido) OR
          localidad IS DISTINCT FROM NEW.localidad OR
          signature_url IS DISTINCT FROM NEW.signature_url OR
          permisos IS DISTINCT FROM COALESCE(NEW.permisos, permisos)
        )
    ) THEN
      UPDATE public.miembros_equipo
      SET 
        full_name = NEW.full_name,
        email = NEW.email,
        phone = COALESCE(NEW.phone, phone),
        cuit = COALESCE(NEW.cuit, cuit),
        birth_date = COALESCE(NEW.birth_date, birth_date),
        provincia = COALESCE(NEW.provincia, provincia),
        partido = COALESCE(NEW.departamento_partido, partido),
        localidad = NEW.localidad,
        signature_url = NEW.signature_url,
        permisos = COALESCE(NEW.permisos, permisos),
        updated_at = timezone('utc'::text, now())
      WHERE profile_id = NEW.id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Recargar el caché del esquema
NOTIFY pgrst, 'reload schema';
