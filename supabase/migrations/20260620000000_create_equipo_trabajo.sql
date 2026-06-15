-- Migration: Create miembros_equipo table and adjust matriculas for team support
-- File: supabase/migrations/20260620000000_create_equipo_trabajo.sql

-- 1. Crear tabla de miembros de equipo
CREATE TABLE IF NOT EXISTS public.miembros_equipo (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email VARCHAR(255) NOT NULL,
    cuit VARCHAR(11) NOT NULL CHECK (cuit ~ '^\d{11}$'),
    phone VARCHAR(50) NOT NULL,
    birth_date DATE NOT NULL,
    provincia VARCHAR(255) NOT NULL,
    partido VARCHAR(255) NOT NULL,
    localidad VARCHAR(255),
    tiene_acceso BOOLEAN DEFAULT FALSE NOT NULL,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    signature_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS en miembros de equipo
ALTER TABLE public.miembros_equipo ENABLE ROW LEVEL SECURITY;

-- Política de RLS para aislamiento por tenant
DROP POLICY IF EXISTS equipo_tenant_isolation ON public.miembros_equipo;
CREATE POLICY equipo_tenant_isolation ON public.miembros_equipo
    FOR ALL TO authenticated
    USING (tenant_id = public.get_current_tenant_id())
    WITH CHECK (tenant_id = public.get_current_tenant_id());

-- 2. Adaptar la tabla de matrículas para soporte de miembros de equipo
ALTER TABLE public.matriculas ALTER COLUMN profile_id DROP NOT NULL;
ALTER TABLE public.matriculas ADD COLUMN IF NOT EXISTS miembro_id UUID REFERENCES public.miembros_equipo(id) ON DELETE CASCADE;

-- Restricción: al menos uno de los dos debe estar configurado
ALTER TABLE public.matriculas DROP CONSTRAINT IF EXISTS check_profile_or_miembro;
ALTER TABLE public.matriculas ADD CONSTRAINT check_profile_or_miembro CHECK (profile_id IS NOT NULL OR miembro_id IS NOT NULL);

-- Rehacer políticas de RLS en matrículas para dar acceso al tenant
DROP POLICY IF EXISTS matriculas_self_select ON public.matriculas;
DROP POLICY IF EXISTS matriculas_self_insert ON public.matriculas;
DROP POLICY IF EXISTS matriculas_self_update ON public.matriculas;
DROP POLICY IF EXISTS matriculas_self_delete ON public.matriculas;

DROP POLICY IF EXISTS matriculas_tenant_select ON public.matriculas;
DROP POLICY IF EXISTS matriculas_tenant_insert ON public.matriculas;
DROP POLICY IF EXISTS matriculas_tenant_update ON public.matriculas;
DROP POLICY IF EXISTS matriculas_tenant_delete ON public.matriculas;

CREATE POLICY matriculas_tenant_select ON public.matriculas FOR SELECT TO authenticated 
    USING (profile_id = auth.uid() OR miembro_id IN (SELECT id FROM public.miembros_equipo WHERE tenant_id = public.get_current_tenant_id()));

CREATE POLICY matriculas_tenant_insert ON public.matriculas FOR INSERT TO authenticated 
    WITH CHECK (profile_id = auth.uid() OR miembro_id IN (SELECT id FROM public.miembros_equipo WHERE tenant_id = public.get_current_tenant_id()));

CREATE POLICY matriculas_tenant_update ON public.matriculas FOR UPDATE TO authenticated 
    USING (profile_id = auth.uid() OR miembro_id IN (SELECT id FROM public.miembros_equipo WHERE tenant_id = public.get_current_tenant_id())) 
    WITH CHECK (profile_id = auth.uid() OR miembro_id IN (SELECT id FROM public.miembros_equipo WHERE tenant_id = public.get_current_tenant_id()));

CREATE POLICY matriculas_tenant_delete ON public.matriculas FOR DELETE TO authenticated 
    USING (profile_id = auth.uid() OR miembro_id IN (SELECT id FROM public.miembros_equipo WHERE tenant_id = public.get_current_tenant_id()));

-- 3. Triggers para sincronización automática
-- Sincronizar cambios de miembros a perfiles (cuando tiene acceso de login)
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
      signature_url = NEW.signature_url
    WHERE id = NEW.profile_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_miembro_upsert ON public.miembros_equipo;
CREATE TRIGGER on_miembro_upsert
  AFTER INSERT OR UPDATE ON public.miembros_equipo
  FOR EACH ROW EXECUTE FUNCTION public.sync_miembro_to_profile();

-- Sincronizar cambios de perfiles a miembros
CREATE OR REPLACE FUNCTION public.sync_profile_to_miembro()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.miembros_equipo
  SET 
    full_name = NEW.full_name,
    phone = NEW.phone,
    cuit = NEW.cuit,
    birth_date = NEW.birth_date,
    provincia = NEW.provincia,
    partido = NEW.partido,
    localidad = NEW.localidad,
    signature_url = NEW.signature_url
  WHERE profile_id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_profile_update ON public.profiles;
CREATE TRIGGER on_profile_update
  AFTER UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_profile_to_miembro();

-- Sincronizar IDs en matrículas (para mantener visibilidad cruzada de licencias)
CREATE OR REPLACE FUNCTION public.sync_matriculas_ids()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.miembro_id IS NOT NULL AND NEW.profile_id IS NULL THEN
    NEW.profile_id := (SELECT profile_id FROM public.miembros_equipo WHERE id = NEW.miembro_id);
  END IF;
  IF NEW.profile_id IS NOT NULL AND NEW.miembro_id IS NULL THEN
    NEW.miembro_id := (SELECT id FROM public.miembros_equipo WHERE profile_id = NEW.profile_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_matricula_insert_update ON public.matriculas;
CREATE TRIGGER on_matricula_insert_update
  BEFORE INSERT OR UPDATE ON public.matriculas
  FOR EACH ROW EXECUTE FUNCTION public.sync_matriculas_ids();
