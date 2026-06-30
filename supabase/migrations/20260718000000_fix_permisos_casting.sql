-- Migration: Fix JSONB casting in permission functions and clean up obsolete policies
-- File: supabase/migrations/20260718000000_fix_permisos_casting.sql

-- 1. Eliminar explícitamente políticas obsoletas/huérfanas en la tabla visitas para evitar ejecuciones redundantes
DROP POLICY IF EXISTS visitas_tenant_write ON public.visitas;
DROP POLICY IF EXISTS visitas_tenant_isolation ON public.visitas;

-- 2. Redefinir user_has_action_permission con casting de texto robusto para JSONB
CREATE OR REPLACE FUNCTION public.user_has_action_permission(p_section text, p_action text)
RETURNS boolean AS $$
DECLARE
  v_role text;
  v_permisos jsonb;
  v_section_perm jsonb;
BEGIN
  SELECT role, permisos INTO v_role, v_permisos
  FROM public.profiles
  WHERE id = auth.uid();
  
  -- Si no hay perfil en sesión, denegar acceso
  IF v_role IS NULL THEN
    RETURN false;
  END IF;
  
  -- Si el usuario es cliente, denegar cualquier acción de escritura
  IF v_role = 'cliente' THEN
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
  
  v_section_perm := v_permisos->p_section;
  
  -- Si es nulo, denegar por defecto
  IF v_section_perm IS NULL THEN
    RETURN false;
  END IF;
  
  -- Si es un booleano (compatibilidad hacia atrás)
  IF jsonb_typeof(v_section_perm) = 'boolean' THEN
    RETURN (v_section_perm)::text::boolean;
  END IF;
  
  -- Si es un objeto JSON, verificar la acción específica ('cargar', 'editar', 'eliminar')
  IF jsonb_typeof(v_section_perm) = 'object' THEN
    RETURN COALESCE((v_section_perm->>p_action)::boolean, false);
  END IF;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Redefinir user_has_edit_permission con casting de texto robusto para JSONB
CREATE OR REPLACE FUNCTION public.user_has_edit_permission(p_section text)
RETURNS boolean AS $$
DECLARE
  v_role text;
  v_permisos jsonb;
  v_section_perm jsonb;
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
  
  v_section_perm := v_permisos->p_section;
  IF v_section_perm IS NULL THEN
    RETURN false;
  END IF;
  
  -- Si es un booleano (compatibilidad hacia atrás)
  IF jsonb_typeof(v_section_perm) = 'boolean' THEN
    RETURN (v_section_perm)::text::boolean;
  END IF;
  
  -- Si es un objeto JSON, verificar si tiene alguna de las acciones de escritura
  IF jsonb_typeof(v_section_perm) = 'object' THEN
    RETURN COALESCE((v_section_perm->>'cargar')::boolean, false) 
        OR COALESCE((v_section_perm->>'editar')::boolean, false) 
        OR COALESCE((v_section_perm->>'eliminar')::boolean, false);
  END IF;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Recargar el caché del esquema de PostgREST
NOTIFY pgrst, 'reload schema';
