-- Migration: Add permisos JSONB column and configure RLS permissions for sections
-- File: supabase/migrations/20260630010000_add_permisos_to_profiles_and_members.sql

-- 1. Añadir la columna permisos a miembros_equipo y profiles si no existen
ALTER TABLE public.miembros_equipo ADD COLUMN IF NOT EXISTS permisos JSONB DEFAULT '{"empresas": true, "equipo": true, "programa": true, "capacitacion": true, "correctivas": true, "extintores": true, "visitas": true}'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS permisos JSONB DEFAULT '{"empresas": true, "equipo": true, "programa": true, "capacitacion": true, "correctivas": true, "extintores": true, "visitas": true}'::jsonb;

-- Actualizar filas existentes para inicializarlas por defecto con todos los permisos habilitados
UPDATE public.miembros_equipo SET permisos = '{"empresas": true, "equipo": true, "programa": true, "capacitacion": true, "correctivas": true, "extintores": true, "visitas": true}'::jsonb WHERE permisos IS NULL;
UPDATE public.profiles SET permisos = '{"empresas": true, "equipo": true, "programa": true, "capacitacion": true, "correctivas": true, "extintores": true, "visitas": true}'::jsonb WHERE permisos IS NULL;

-- 2. Actualizar función helper para sincronizar miembro a perfil
CREATE OR REPLACE FUNCTION public.sync_miembro_to_profile()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.profile_id IS NOT NULL THEN
    UPDATE public.profiles
    SET 
      full_name = NEW.full_name,
      phone = NEW.phone,
      cuit = NEW.cuit,
      birth_date = NEW.birth_date,
      provincia = NEW.provincia,
      partido = NEW.partido,
      localidad = NEW.localidad,
      signature_url = NEW.signature_url,
      permisos = NEW.permisos
    WHERE id = NEW.profile_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Actualizar función helper para sincronizar perfil a miembro
CREATE OR REPLACE FUNCTION public.sync_profile_to_miembro()
RETURNS TRIGGER AS $$
BEGIN
  -- Si el perfil tiene asignado un tenant, pertenece a roles de administración/dueño y tiene completo el onboarding
  IF NEW.tenant_id IS NOT NULL 
     AND NEW.role IN ('owner', 'admin') 
     AND NEW.full_name IS NOT NULL 
     AND NEW.cuit IS NOT NULL 
     AND NEW.phone IS NOT NULL 
     AND NEW.birth_date IS NOT NULL 
     AND NEW.provincia IS NOT NULL 
     AND NEW.departamento_partido IS NOT NULL THEN
     
    IF EXISTS (SELECT 1 FROM public.miembros_equipo WHERE profile_id = NEW.id) THEN
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
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Crear función helper para comprobar permisos de edición del usuario
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
  
  -- Dueño y administrador tienen permisos absolutos
  IF v_role IN ('owner', 'admin') THEN
    RETURN true;
  END IF;
  
  -- Si no hay JSON de permisos, denegar por defecto
  IF v_permisos IS NULL THEN
    RETURN false;
  END IF;
  
  RETURN COALESCE((v_permisos->p_section)::boolean, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Actualizar políticas de RLS para validación de permisos de edición

-- 5.1 Empresas (Clientes)
DROP POLICY IF EXISTS empresas_tenant_isolation ON public.empresas;
CREATE POLICY empresas_tenant_select ON public.empresas
    FOR SELECT TO authenticated USING (public.user_has_tenant_access(tenant_id));
CREATE POLICY empresas_tenant_write ON public.empresas
    FOR ALL TO authenticated 
    USING (public.user_has_tenant_access(tenant_id) AND public.user_has_edit_permission('empresas')) 
    WITH CHECK (public.user_has_tenant_access(tenant_id) AND public.user_has_edit_permission('empresas'));

-- 5.2 Establecimientos (Clientes)
DROP POLICY IF EXISTS establecimientos_tenant_isolation ON public.establecimientos;
CREATE POLICY establecimientos_tenant_select ON public.establecimientos
    FOR SELECT TO authenticated USING (public.user_has_tenant_access(tenant_id));
CREATE POLICY establecimientos_tenant_write ON public.establecimientos
    FOR ALL TO authenticated 
    USING (public.user_has_tenant_access(tenant_id) AND public.user_has_edit_permission('empresas')) 
    WITH CHECK (public.user_has_tenant_access(tenant_id) AND public.user_has_edit_permission('empresas'));

-- 5.3 Miembros del equipo de trabajo
DROP POLICY IF EXISTS equipo_tenant_write ON public.miembros_equipo;
CREATE POLICY equipo_tenant_write ON public.miembros_equipo
    FOR ALL TO authenticated 
    USING (public.user_has_tenant_access(tenant_id) AND public.user_has_edit_permission('equipo')) 
    WITH CHECK (public.user_has_tenant_access(tenant_id) AND public.user_has_edit_permission('equipo'));

-- 5.4 Programa Anual de Gestión
DROP POLICY IF EXISTS programa_anual_tenant_isolation ON public.programa_anual;
CREATE POLICY programa_anual_tenant_select ON public.programa_anual
    FOR SELECT TO authenticated USING (public.user_has_tenant_access(tenant_id));
CREATE POLICY programa_anual_tenant_write ON public.programa_anual
    FOR ALL TO authenticated 
    USING (public.user_has_tenant_access(tenant_id) AND public.user_has_edit_permission('programa')) 
    WITH CHECK (public.user_has_tenant_access(tenant_id) AND public.user_has_edit_permission('programa'));

-- 5.5 Acciones Correctivas
DROP POLICY IF EXISTS acciones_correctivas_tenant_isolation ON public.acciones_correctivas;
CREATE POLICY acciones_correctivas_tenant_select ON public.acciones_correctivas
    FOR SELECT TO authenticated USING (public.user_has_tenant_access(tenant_id));
CREATE POLICY acciones_correctivas_tenant_write ON public.acciones_correctivas
    FOR ALL TO authenticated 
    USING (public.user_has_tenant_access(tenant_id) AND public.user_has_edit_permission('correctivas')) 
    WITH CHECK (public.user_has_tenant_access(tenant_id) AND public.user_has_edit_permission('correctivas'));

-- 5.6 Programa de Capacitación Anual
DROP POLICY IF EXISTS programa_capacitacion_tenant_isolation ON public.programa_capacitacion;
CREATE POLICY programa_capacitacion_tenant_select ON public.programa_capacitacion
    FOR SELECT TO authenticated USING (public.user_has_tenant_access(tenant_id));
CREATE POLICY programa_capacitacion_tenant_write ON public.programa_capacitacion
    FOR ALL TO authenticated 
    USING (public.user_has_tenant_access(tenant_id) AND public.user_has_edit_permission('capacitacion')) 
    WITH CHECK (public.user_has_tenant_access(tenant_id) AND public.user_has_edit_permission('capacitacion'));

-- 5.7 Control de Extintores
DROP POLICY IF EXISTS extintores_tenant_isolation ON public.extintores;
CREATE POLICY extintores_tenant_select ON public.extintores
    FOR SELECT TO authenticated USING (public.user_has_tenant_access(tenant_id));
CREATE POLICY extintores_tenant_write ON public.extintores
    FOR ALL TO authenticated 
    USING (public.user_has_tenant_access(tenant_id) AND public.user_has_edit_permission('extintores')) 
    WITH CHECK (public.user_has_tenant_access(tenant_id) AND public.user_has_edit_permission('extintores'));

-- 5.8 Constancias de Visitas Técnicas
DROP POLICY IF EXISTS visitas_tenant_isolation ON public.visitas;
CREATE POLICY visitas_tenant_select ON public.visitas
    FOR SELECT TO authenticated USING (public.user_has_tenant_access(tenant_id));
CREATE POLICY visitas_tenant_write ON public.visitas
    FOR ALL TO authenticated 
    USING (public.user_has_tenant_access(tenant_id) AND public.user_has_edit_permission('visitas')) 
    WITH CHECK (public.user_has_tenant_access(tenant_id) AND public.user_has_edit_permission('visitas'));

-- 6. Recargar el caché del esquema
NOTIFY pgrst, 'reload schema';
