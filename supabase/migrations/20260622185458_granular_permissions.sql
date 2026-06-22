-- Migration: Granular Permissions (Cargar, Editar, Eliminar)
-- File: supabase/migrations/20260622185458_granular_permissions.sql

-- 1. Crear la nueva función helper public.user_has_action_permission
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
    RETURN v_section_perm::boolean;
  END IF;
  
  -- Si es un objeto JSON, verificar la acción específica ('cargar', 'editar', 'eliminar')
  IF jsonb_typeof(v_section_perm) = 'object' THEN
    RETURN COALESCE((v_section_perm->p_action)::boolean, false);
  END IF;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Actualizar la función helper public.user_has_edit_permission para compatibilidad
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
  
  IF v_role IS NULL THEN
    RETURN false;
  END IF;
  
  IF v_role = 'admin' THEN
    RETURN true;
  END IF;
  
  IF v_permisos IS NULL THEN
    RETURN false;
  END IF;
  
  v_section_perm := v_permisos->p_section;
  IF v_section_perm IS NULL THEN
    RETURN false;
  END IF;
  
  IF jsonb_typeof(v_section_perm) = 'boolean' THEN
    RETURN v_section_perm::boolean;
  END IF;
  
  IF jsonb_typeof(v_section_perm) = 'object' THEN
    -- Si es un objeto, devolvemos true si tiene al menos una de las acciones habilitada
    RETURN COALESCE((v_section_perm->'cargar')::boolean, false) 
        OR COALESCE((v_section_perm->'editar')::boolean, false) 
        OR COALESCE((v_section_perm->'eliminar')::boolean, false);
  END IF;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Actualizar políticas de RLS para validación de permisos de edición granulares

-- 3.1 Empresas (Clientes)
DROP POLICY IF EXISTS empresas_tenant_write ON public.empresas;
DROP POLICY IF EXISTS empresas_tenant_insert ON public.empresas;
DROP POLICY IF EXISTS empresas_tenant_update ON public.empresas;
DROP POLICY IF EXISTS empresas_tenant_delete ON public.empresas;

CREATE POLICY empresas_tenant_insert ON public.empresas
    FOR INSERT TO authenticated 
    WITH CHECK (public.user_has_tenant_access(tenant_id) AND public.user_has_action_permission('empresas', 'cargar'));

CREATE POLICY empresas_tenant_update ON public.empresas
    FOR UPDATE TO authenticated 
    USING (public.user_has_tenant_access(tenant_id) AND public.user_has_action_permission('empresas', 'editar'))
    WITH CHECK (public.user_has_tenant_access(tenant_id) AND public.user_has_action_permission('empresas', 'editar'));

CREATE POLICY empresas_tenant_delete ON public.empresas
    FOR DELETE TO authenticated 
    USING (public.user_has_tenant_access(tenant_id) AND public.user_has_action_permission('empresas', 'eliminar'));


-- 3.2 Establecimientos
DROP POLICY IF EXISTS establecimientos_tenant_write ON public.establecimientos;
DROP POLICY IF EXISTS establecimientos_tenant_insert ON public.establecimientos;
DROP POLICY IF EXISTS establecimientos_tenant_update ON public.establecimientos;
DROP POLICY IF EXISTS establecimientos_tenant_delete ON public.establecimientos;

CREATE POLICY establecimientos_tenant_insert ON public.establecimientos
    FOR INSERT TO authenticated 
    WITH CHECK (public.user_has_tenant_access(tenant_id) AND public.user_has_action_permission('empresas', 'cargar'));

CREATE POLICY establecimientos_tenant_update ON public.establecimientos
    FOR UPDATE TO authenticated 
    USING (public.user_has_tenant_access(tenant_id) AND public.user_has_action_permission('empresas', 'editar'))
    WITH CHECK (public.user_has_tenant_access(tenant_id) AND public.user_has_action_permission('empresas', 'editar'));

CREATE POLICY establecimientos_tenant_delete ON public.establecimientos
    FOR DELETE TO authenticated 
    USING (public.user_has_tenant_access(tenant_id) AND public.user_has_action_permission('empresas', 'eliminar'));


-- 3.3 Miembros del equipo de trabajo
DROP POLICY IF EXISTS equipo_tenant_write ON public.miembros_equipo;
DROP POLICY IF EXISTS equipo_tenant_insert ON public.miembros_equipo;
DROP POLICY IF EXISTS equipo_tenant_update ON public.miembros_equipo;
DROP POLICY IF EXISTS equipo_tenant_delete ON public.miembros_equipo;

CREATE POLICY equipo_tenant_insert ON public.miembros_equipo
    FOR INSERT TO authenticated 
    WITH CHECK (public.user_has_tenant_access(tenant_id) AND public.user_has_action_permission('equipo', 'cargar'));

CREATE POLICY equipo_tenant_update ON public.miembros_equipo
    FOR UPDATE TO authenticated 
    USING (public.user_has_tenant_access(tenant_id) AND public.user_has_action_permission('equipo', 'editar'))
    WITH CHECK (public.user_has_tenant_access(tenant_id) AND public.user_has_action_permission('equipo', 'editar'));

CREATE POLICY equipo_tenant_delete ON public.miembros_equipo
    FOR DELETE TO authenticated 
    USING (public.user_has_tenant_access(tenant_id) AND public.user_has_action_permission('equipo', 'eliminar'));


-- 3.4 Programa Anual de Gestión
DROP POLICY IF EXISTS programa_anual_tenant_write ON public.programa_anual;
DROP POLICY IF EXISTS programa_anual_tenant_insert ON public.programa_anual;
DROP POLICY IF EXISTS programa_anual_tenant_update ON public.programa_anual;
DROP POLICY IF EXISTS programa_anual_tenant_delete ON public.programa_anual;

CREATE POLICY programa_anual_tenant_insert ON public.programa_anual
    FOR INSERT TO authenticated 
    WITH CHECK (public.user_has_tenant_access(tenant_id) AND public.user_has_action_permission('programa', 'cargar'));

CREATE POLICY programa_anual_tenant_update ON public.programa_anual
    FOR UPDATE TO authenticated 
    USING (public.user_has_tenant_access(tenant_id) AND public.user_has_action_permission('programa', 'editar'))
    WITH CHECK (public.user_has_tenant_access(tenant_id) AND public.user_has_action_permission('programa', 'editar'));

CREATE POLICY programa_anual_tenant_delete ON public.programa_anual
    FOR DELETE TO authenticated 
    USING (public.user_has_tenant_access(tenant_id) AND public.user_has_action_permission('programa', 'eliminar'));


-- 3.5 Acciones Correctivas
DROP POLICY IF EXISTS acciones_correctivas_tenant_write ON public.acciones_correctivas;
DROP POLICY IF EXISTS acciones_correctivas_tenant_insert ON public.acciones_correctivas;
DROP POLICY IF EXISTS acciones_correctivas_tenant_update ON public.acciones_correctivas;
DROP POLICY IF EXISTS acciones_correctivas_tenant_delete ON public.acciones_correctivas;

CREATE POLICY acciones_correctivas_tenant_insert ON public.acciones_correctivas
    FOR INSERT TO authenticated 
    WITH CHECK (public.user_has_tenant_access(tenant_id) AND public.user_has_action_permission('correctivas', 'cargar'));

CREATE POLICY acciones_correctivas_tenant_update ON public.acciones_correctivas
    FOR UPDATE TO authenticated 
    USING (public.user_has_tenant_access(tenant_id) AND public.user_has_action_permission('correctivas', 'editar'))
    WITH CHECK (public.user_has_tenant_access(tenant_id) AND public.user_has_action_permission('correctivas', 'editar'));

CREATE POLICY acciones_correctivas_tenant_delete ON public.acciones_correctivas
    FOR DELETE TO authenticated 
    USING (public.user_has_tenant_access(tenant_id) AND public.user_has_action_permission('correctivas', 'eliminar'));


-- 3.6 Programa de Capacitación Anual
DROP POLICY IF EXISTS programa_capacitacion_tenant_write ON public.programa_capacitacion;
DROP POLICY IF EXISTS programa_capacitacion_tenant_insert ON public.programa_capacitacion;
DROP POLICY IF EXISTS programa_capacitacion_tenant_update ON public.programa_capacitacion;
DROP POLICY IF EXISTS programa_capacitacion_tenant_delete ON public.programa_capacitacion;

CREATE POLICY programa_capacitacion_tenant_insert ON public.programa_capacitacion
    FOR INSERT TO authenticated 
    WITH CHECK (public.user_has_tenant_access(tenant_id) AND public.user_has_action_permission('capacitacion', 'cargar'));

CREATE POLICY programa_capacitacion_tenant_update ON public.programa_capacitacion
    FOR UPDATE TO authenticated 
    USING (public.user_has_tenant_access(tenant_id) AND public.user_has_action_permission('capacitacion', 'editar'))
    WITH CHECK (public.user_has_tenant_access(tenant_id) AND public.user_has_action_permission('capacitacion', 'editar'));

CREATE POLICY programa_capacitacion_tenant_delete ON public.programa_capacitacion
    FOR DELETE TO authenticated 
    USING (public.user_has_tenant_access(tenant_id) AND public.user_has_action_permission('capacitacion', 'eliminar'));


-- 3.7 Control de Extintores
DROP POLICY IF EXISTS extintores_tenant_write ON public.extintores;
DROP POLICY IF EXISTS extintores_tenant_insert ON public.extintores;
DROP POLICY IF EXISTS extintores_tenant_update ON public.extintores;
DROP POLICY IF EXISTS extintores_tenant_delete ON public.extintores;

CREATE POLICY extintores_tenant_insert ON public.extintores
    FOR INSERT TO authenticated 
    WITH CHECK (public.user_has_tenant_access(tenant_id) AND public.user_has_action_permission('extintores', 'cargar'));

CREATE POLICY extintores_tenant_update ON public.extintores
    FOR UPDATE TO authenticated 
    USING (public.user_has_tenant_access(tenant_id) AND public.user_has_action_permission('extintores', 'editar'))
    WITH CHECK (public.user_has_tenant_access(tenant_id) AND public.user_has_action_permission('extintores', 'editar'));

CREATE POLICY extintores_tenant_delete ON public.extintores
    FOR DELETE TO authenticated 
    USING (public.user_has_tenant_access(tenant_id) AND public.user_has_action_permission('extintores', 'eliminar'));


-- 3.8 Constancias de Visitas Técnicas
DROP POLICY IF EXISTS visitas_tenant_write ON public.visitas;
DROP POLICY IF EXISTS visitas_tenant_insert ON public.visitas;
DROP POLICY IF EXISTS visitas_tenant_update ON public.visitas;
DROP POLICY IF EXISTS visitas_tenant_delete ON public.visitas;

CREATE POLICY visitas_tenant_insert ON public.visitas
    FOR INSERT TO authenticated 
    WITH CHECK (public.user_has_tenant_access(tenant_id) AND public.user_has_action_permission('visitas', 'cargar'));

CREATE POLICY visitas_tenant_update ON public.visitas
    FOR UPDATE TO authenticated 
    USING (public.user_has_tenant_access(tenant_id) AND public.user_has_action_permission('visitas', 'editar'))
    WITH CHECK (public.user_has_tenant_access(tenant_id) AND public.user_has_action_permission('visitas', 'editar'));

CREATE POLICY visitas_tenant_delete ON public.visitas
    FOR DELETE TO authenticated 
    USING (public.user_has_tenant_access(tenant_id) AND public.user_has_action_permission('visitas', 'eliminar'));


-- 3.9 Matrículas
DROP POLICY IF EXISTS matriculas_tenant_insert ON public.matriculas;
DROP POLICY IF EXISTS matriculas_tenant_update ON public.matriculas;
DROP POLICY IF EXISTS matriculas_tenant_delete ON public.matriculas;

CREATE POLICY matriculas_tenant_insert ON public.matriculas
    FOR INSERT TO authenticated
    WITH CHECK (
      profile_id = auth.uid() 
      OR (
        miembro_id IN (SELECT id FROM public.miembros_equipo WHERE tenant_id = public.get_current_tenant_id())
        AND public.user_has_action_permission('equipo', 'cargar')
      )
    );

CREATE POLICY matriculas_tenant_update ON public.matriculas
    FOR UPDATE TO authenticated
    USING (
      profile_id = auth.uid() 
      OR (
        miembro_id IN (SELECT id FROM public.miembros_equipo WHERE tenant_id = public.get_current_tenant_id())
        AND public.user_has_action_permission('equipo', 'editar')
      )
    )
    WITH CHECK (
      profile_id = auth.uid() 
      OR (
        miembro_id IN (SELECT id FROM public.miembros_equipo WHERE tenant_id = public.get_current_tenant_id())
        AND public.user_has_action_permission('equipo', 'editar')
      )
    );

CREATE POLICY matriculas_tenant_delete ON public.matriculas
    FOR DELETE TO authenticated
    USING (
      profile_id = auth.uid() 
      OR (
        miembro_id IN (SELECT id FROM public.miembros_equipo WHERE tenant_id = public.get_current_tenant_id())
        AND public.user_has_action_permission('equipo', 'eliminar')
      )
    );

-- 4. Recargar el caché del esquema
NOTIFY pgrst, 'reload schema';
