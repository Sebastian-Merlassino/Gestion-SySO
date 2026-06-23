-- Migration: Client Portal Access and RLS Restrictions
-- File: supabase/migrations/20260703000000_client_portal_access.sql

-- 1. Modificar tabla public.profiles para admitir empresa_id y rol 'cliente'
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('admin', 'miembro', 'cliente'));

-- 2. Modificar trigger handle_new_user para sincronizar tenant_id y empresa_id
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, tenant_id, empresa_id, cuit)
  VALUES (
    new.id, 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'full_name', ''), 
    COALESCE(new.raw_user_meta_data->>'role', 'miembro'),
    (new.raw_user_meta_data->>'tenant_id')::uuid,
    (new.raw_user_meta_data->>'empresa_id')::uuid,
    COALESCE(new.raw_user_meta_data->>'cuit', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Crear funciones helper de seguridad en Postgres
CREATE OR REPLACE FUNCTION public.get_current_user_empresa_id()
RETURNS UUID AS $$
BEGIN
    RETURN (
        SELECT empresa_id 
        FROM public.profiles 
        WHERE id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_client_user()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM public.profiles 
        WHERE id = auth.uid() AND role = 'cliente'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_email_by_cuit(p_cuit text)
RETURNS text AS $$
DECLARE
    v_email text;
BEGIN
    SELECT email INTO v_email
    FROM public.profiles
    WHERE cuit = p_cuit AND role = 'cliente'
    LIMIT 1;
    
    RETURN v_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Modificar user_has_action_permission para denegar escritura a clientes incondicionalmente
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
    RETURN v_section_perm::boolean;
  END IF;
  
  -- Si es un objeto JSON, verificar la acción específica ('cargar', 'editar', 'eliminar')
  IF jsonb_typeof(v_section_perm) = 'object' THEN
    RETURN COALESCE((v_section_perm->p_action)::boolean, false);
  END IF;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Redefinir políticas RLS para aislamiento granular por empresa

-- 5.1 Tabla: empresas
DROP POLICY IF EXISTS empresas_tenant_isolation ON public.empresas;
DROP POLICY IF EXISTS empresas_tenant_insert ON public.empresas;
DROP POLICY IF EXISTS empresas_tenant_update ON public.empresas;
DROP POLICY IF EXISTS empresas_tenant_delete ON public.empresas;

CREATE POLICY empresas_tenant_select ON public.empresas
    FOR SELECT TO authenticated
    USING (public.user_has_tenant_access(tenant_id) AND (NOT public.is_client_user() OR id = public.get_current_user_empresa_id()));

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


-- 5.2 Tabla: establecimientos
DROP POLICY IF EXISTS establecimientos_tenant_isolation ON public.establecimientos;
DROP POLICY IF EXISTS establecimientos_tenant_insert ON public.establecimientos;
DROP POLICY IF EXISTS establecimientos_tenant_update ON public.establecimientos;
DROP POLICY IF EXISTS establecimientos_tenant_delete ON public.establecimientos;

CREATE POLICY establecimientos_tenant_select ON public.establecimientos
    FOR SELECT TO authenticated
    USING (public.user_has_tenant_access(tenant_id) AND (NOT public.is_client_user() OR empresa_id = public.get_current_user_empresa_id()));

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


-- 5.3 Tabla: programa_anual
DROP POLICY IF EXISTS programa_anual_tenant_isolation ON public.programa_anual;
DROP POLICY IF EXISTS programa_anual_tenant_insert ON public.programa_anual;
DROP POLICY IF EXISTS programa_anual_tenant_update ON public.programa_anual;
DROP POLICY IF EXISTS programa_anual_tenant_delete ON public.programa_anual;

CREATE POLICY programa_anual_tenant_select ON public.programa_anual
    FOR SELECT TO authenticated
    USING (public.user_has_tenant_access(tenant_id) AND (NOT public.is_client_user() OR empresa_id = public.get_current_user_empresa_id()));

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


-- 5.4 Tabla: programa_capacitacion
DROP POLICY IF EXISTS programa_capacitacion_tenant_isolation ON public.programa_capacitacion;
DROP POLICY IF EXISTS programa_capacitacion_tenant_insert ON public.programa_capacitacion;
DROP POLICY IF EXISTS programa_capacitacion_tenant_update ON public.programa_capacitacion;
DROP POLICY IF EXISTS programa_capacitacion_tenant_delete ON public.programa_capacitacion;

CREATE POLICY programa_capacitacion_tenant_select ON public.programa_capacitacion
    FOR SELECT TO authenticated
    USING (public.user_has_tenant_access(tenant_id) AND (NOT public.is_client_user() OR empresa_id = public.get_current_user_empresa_id()));

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


-- 5.5 Tabla: acciones_correctivas
DROP POLICY IF EXISTS acciones_correctivas_tenant_isolation ON public.acciones_correctivas;
DROP POLICY IF EXISTS acciones_correctivas_tenant_insert ON public.acciones_correctivas;
DROP POLICY IF EXISTS acciones_correctivas_tenant_update ON public.acciones_correctivas;
DROP POLICY IF EXISTS acciones_correctivas_tenant_delete ON public.acciones_correctivas;

CREATE POLICY acciones_correctivas_tenant_select ON public.acciones_correctivas
    FOR SELECT TO authenticated
    USING (public.user_has_tenant_access(tenant_id) AND (NOT public.is_client_user() OR empresa_id = public.get_current_user_empresa_id()));

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


-- 5.6 Tabla: extintores
DROP POLICY IF EXISTS extintores_tenant_isolation ON public.extintores;
DROP POLICY IF EXISTS extintores_tenant_insert ON public.extintores;
DROP POLICY IF EXISTS extintores_tenant_update ON public.extintores;
DROP POLICY IF EXISTS extintores_tenant_delete ON public.extintores;

CREATE POLICY extintores_tenant_select ON public.extintores
    FOR SELECT TO authenticated
    USING (public.user_has_tenant_access(tenant_id) AND (NOT public.is_client_user() OR empresa_id = public.get_current_user_empresa_id()));

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


-- 5.7 Tabla: visitas
DROP POLICY IF EXISTS visitas_tenant_isolation ON public.visitas;
DROP POLICY IF EXISTS visitas_tenant_insert ON public.visitas;
DROP POLICY IF EXISTS visitas_tenant_update ON public.visitas;
DROP POLICY IF EXISTS visitas_tenant_delete ON public.visitas;

CREATE POLICY visitas_tenant_select ON public.visitas
    FOR SELECT TO authenticated
    USING (public.user_has_tenant_access(tenant_id) AND (NOT public.is_client_user() OR empresa_id = public.get_current_user_empresa_id()));

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


-- 5.8 Tabla: avisos_riesgo
DROP POLICY IF EXISTS avisos_riesgo_tenant_select ON public.avisos_riesgo;
CREATE POLICY avisos_riesgo_tenant_select ON public.avisos_riesgo
    FOR SELECT TO authenticated 
    USING (public.user_has_tenant_access(tenant_id) AND (NOT public.is_client_user() OR empresa_id = public.get_current_user_empresa_id()));


-- 6. Recargar el caché del esquema de PostgREST
NOTIFY pgrst, 'reload schema';
