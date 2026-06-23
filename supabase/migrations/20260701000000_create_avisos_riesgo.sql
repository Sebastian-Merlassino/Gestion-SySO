-- Migration: Create public.avisos_riesgo table and update permissions defaults
-- File: supabase/migrations/20260701000000_create_avisos_riesgo.sql

CREATE TABLE IF NOT EXISTS public.avisos_riesgo (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    establecimiento_id UUID NOT NULL REFERENCES public.establecimientos(id) ON DELETE CASCADE,
    fecha DATE NOT NULL,
    aviso_numero TEXT,
    profesional_tipo TEXT NOT NULL DEFAULT 'miembro', -- 'miembro' o 'manual'
    profesional_nombre TEXT NOT NULL,
    profesional_id UUID REFERENCES public.miembros_equipo(id) ON DELETE SET NULL,
    firma_tipo TEXT DEFAULT 'perfil', -- 'perfil' o 'mano'
    firma_digital TEXT, -- relative path in storage (documents bucket)
    observaciones TEXT, -- closing page observations
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.avisos_riesgo ENABLE ROW LEVEL SECURITY;

-- Crear políticas de RLS para aislamiento por tenant
DROP POLICY IF EXISTS avisos_riesgo_tenant_select ON public.avisos_riesgo;
CREATE POLICY avisos_riesgo_tenant_select ON public.avisos_riesgo
    FOR SELECT TO authenticated USING (public.user_has_tenant_access(tenant_id));

DROP POLICY IF EXISTS avisos_riesgo_tenant_write ON public.avisos_riesgo;

DROP POLICY IF EXISTS avisos_riesgo_tenant_insert ON public.avisos_riesgo;
CREATE POLICY avisos_riesgo_tenant_insert ON public.avisos_riesgo
    FOR INSERT TO authenticated 
    WITH CHECK (public.user_has_tenant_access(tenant_id) AND public.user_has_action_permission('avisos', 'cargar'));

DROP POLICY IF EXISTS avisos_riesgo_tenant_update ON public.avisos_riesgo;
CREATE POLICY avisos_riesgo_tenant_update ON public.avisos_riesgo
    FOR UPDATE TO authenticated 
    USING (public.user_has_tenant_access(tenant_id) AND public.user_has_action_permission('avisos', 'editar'))
    WITH CHECK (public.user_has_tenant_access(tenant_id) AND public.user_has_action_permission('avisos', 'editar'));

DROP POLICY IF EXISTS avisos_riesgo_tenant_delete ON public.avisos_riesgo;
CREATE POLICY avisos_riesgo_tenant_delete ON public.avisos_riesgo
    FOR DELETE TO authenticated 
    USING (public.user_has_tenant_access(tenant_id) AND public.user_has_action_permission('avisos', 'eliminar'));

-- Actualizar permisos JSONB por defecto en miembros_equipo y profiles para incluir la sección 'avisos'
ALTER TABLE public.miembros_equipo ALTER COLUMN permisos SET DEFAULT '{"empresas": true, "equipo": true, "programa": true, "capacitacion": true, "correctivas": true, "extintores": true, "visitas": true, "avisos": true}'::jsonb;
ALTER TABLE public.profiles ALTER COLUMN permisos SET DEFAULT '{"empresas": true, "equipo": true, "programa": true, "capacitacion": true, "correctivas": true, "extintores": true, "visitas": true, "avisos": true}'::jsonb;

-- Actualizar las filas existentes de miembros y perfiles
UPDATE public.miembros_equipo 
SET permisos = COALESCE(permisos, '{}'::jsonb) || '{"avisos": {"cargar": true, "editar": true, "eliminar": true}}'::jsonb;

UPDATE public.profiles 
SET permisos = COALESCE(permisos, '{}'::jsonb) || '{"avisos": {"cargar": true, "editar": true, "eliminar": true}}'::jsonb;

-- Recargar el caché del esquema de PostgREST
NOTIFY pgrst, 'reload schema';
