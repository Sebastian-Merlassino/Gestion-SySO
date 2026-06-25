-- Migration: Create public.nomina_personal table and set up policies and permissions
-- File: supabase/migrations/20260708000000_create_nomina_personal.sql

CREATE TABLE IF NOT EXISTS public.nomina_personal (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    establecimiento_id UUID REFERENCES public.establecimientos(id) ON DELETE CASCADE,
    nombre_apellido TEXT NOT NULL,
    cuil VARCHAR(11) NOT NULL CHECK (cuil ~ '^[0-9]{11}$'),
    fecha_alta DATE NOT NULL,
    area_sector TEXT,
    puesto TEXT,
    fecha_carga DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.nomina_personal ENABLE ROW LEVEL SECURITY;

-- 1. Política SELECT: Aislamiento por tenant y por empresa para clientes
DROP POLICY IF EXISTS nomina_personal_tenant_select ON public.nomina_personal;
CREATE POLICY nomina_personal_tenant_select ON public.nomina_personal
    FOR SELECT TO authenticated
    USING (
        public.user_has_tenant_access(tenant_id) 
        AND (NOT public.is_client_user() OR empresa_id = public.get_current_user_empresa_id())
    );

-- 2. Política INSERT: Sólo personal autorizado
DROP POLICY IF EXISTS nomina_personal_tenant_insert ON public.nomina_personal;
CREATE POLICY nomina_personal_tenant_insert ON public.nomina_personal
    FOR INSERT TO authenticated
    WITH CHECK (
        public.user_has_tenant_access(tenant_id) 
        AND public.user_has_action_permission('nomina', 'cargar')
    );

-- 3. Política UPDATE: Sólo personal autorizado
DROP POLICY IF EXISTS nomina_personal_tenant_update ON public.nomina_personal;
CREATE POLICY nomina_personal_tenant_update ON public.nomina_personal
    FOR UPDATE TO authenticated
    USING (
        public.user_has_tenant_access(tenant_id) 
        AND public.user_has_action_permission('nomina', 'editar')
    )
    WITH CHECK (
        public.user_has_tenant_access(tenant_id) 
        AND public.user_has_action_permission('nomina', 'editar')
    );

-- 4. Política DELETE: Sólo personal autorizado
DROP POLICY IF EXISTS nomina_personal_tenant_delete ON public.nomina_personal;
CREATE POLICY nomina_personal_tenant_delete ON public.nomina_personal
    FOR DELETE TO authenticated
    USING (
        public.user_has_tenant_access(tenant_id) 
        AND public.user_has_action_permission('nomina', 'eliminar')
    );

-- Actualizar valores por defecto de la columna permisos para incluir legajo y nomina
ALTER TABLE public.miembros_equipo ALTER COLUMN permisos SET DEFAULT '{"empresas": true, "equipo": true, "programa": true, "capacitacion": true, "correctivas": true, "extintores": true, "visitas": true, "avisos": true, "legajo": true, "nomina": true}'::jsonb;
ALTER TABLE public.profiles ALTER COLUMN permisos SET DEFAULT '{"empresas": true, "equipo": true, "programa": true, "capacitacion": true, "correctivas": true, "extintores": true, "visitas": true, "avisos": true, "legajo": true, "nomina": true}'::jsonb;

-- Actualizar filas existentes en perfiles y miembros
UPDATE public.profiles 
SET permisos = COALESCE(permisos, '{}'::jsonb) || '{"legajo": true, "nomina": true}'::jsonb 
WHERE role IN ('owner', 'admin') OR permisos IS NOT NULL;

UPDATE public.miembros_equipo 
SET permisos = COALESCE(permisos, '{}'::jsonb) || '{"legajo": true, "nomina": true}'::jsonb 
WHERE permisos IS NOT NULL;

-- Recargar el caché del esquema de PostgREST
NOTIFY pgrst, 'reload schema';
