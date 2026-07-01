-- Migration: Create public.control_electrico table and set up policies and permissions
-- File: supabase/migrations/20260720000000_create_control_electrico.sql

CREATE TABLE IF NOT EXISTS public.control_electrico (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    establecimiento_id UUID NOT NULL REFERENCES public.establecimientos(id) ON DELETE CASCADE,
    fecha DATE NOT NULL,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    firma_responsable TEXT, -- Base64 dataURI o path relativo en 'documents'
    responsable_aclaracion TEXT,
    firma_profesional TEXT, -- Base64 dataURI o path relativo en 'documents'
    profesional_tipo TEXT NOT NULL DEFAULT 'miembro', -- 'miembro' o 'manual'
    profesional_nombre TEXT NOT NULL,
    profesional_id UUID REFERENCES public.miembros_equipo(id) ON DELETE SET NULL,
    firma_tipo TEXT NOT NULL DEFAULT 'perfil', -- 'perfil' o 'mano'
    observaciones TEXT, -- Observaciones finales
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.control_electrico ENABLE ROW LEVEL SECURITY;

-- Crear políticas RLS para aislamiento por tenant y restricciones por rol / permiso
DROP POLICY IF EXISTS control_electrico_tenant_select ON public.control_electrico;
CREATE POLICY control_electrico_tenant_select ON public.control_electrico
    FOR SELECT TO authenticated
    USING (
        public.user_has_tenant_access(tenant_id) 
        AND (NOT public.is_client_user() OR empresa_id = public.get_current_user_empresa_id())
    );

DROP POLICY IF EXISTS control_electrico_tenant_insert ON public.control_electrico;
CREATE POLICY control_electrico_tenant_insert ON public.control_electrico
    FOR INSERT TO authenticated
    WITH CHECK (
        public.user_has_tenant_access(tenant_id) 
        AND public.user_has_action_permission('control_electrico', 'cargar')
    );

DROP POLICY IF EXISTS control_electrico_tenant_update ON public.control_electrico;
CREATE POLICY control_electrico_tenant_update ON public.control_electrico
    FOR UPDATE TO authenticated
    USING (
        public.user_has_tenant_access(tenant_id) 
        AND public.user_has_action_permission('control_electrico', 'editar')
    )
    WITH CHECK (
        public.user_has_tenant_access(tenant_id) 
        AND public.user_has_action_permission('control_electrico', 'editar')
    );

DROP POLICY IF EXISTS control_electrico_tenant_delete ON public.control_electrico;
CREATE POLICY control_electrico_tenant_delete ON public.control_electrico
    FOR DELETE TO authenticated
    USING (
        public.user_has_tenant_access(tenant_id) 
        AND public.user_has_action_permission('control_electrico', 'eliminar')
    );

-- Actualizar valores por defecto de la columna permisos para incluir la nueva sección
ALTER TABLE public.miembros_equipo ALTER COLUMN permisos SET DEFAULT '{"empresas": true, "equipo": true, "programa": true, "capacitacion": true, "correctivas": true, "extintores": true, "control_electrico": true, "visitas": true, "avisos": true, "legajo": true, "nomina": true, "accidentes": true, "matriz_riesgos": true}'::jsonb;
ALTER TABLE public.profiles ALTER COLUMN permisos SET DEFAULT '{"empresas": true, "equipo": true, "programa": true, "capacitacion": true, "correctivas": true, "extintores": true, "control_electrico": true, "visitas": true, "avisos": true, "legajo": true, "nomina": true, "accidentes": true, "matriz_riesgos": true}'::jsonb;

-- Actualizar filas existentes en perfiles y miembros
UPDATE public.profiles 
SET permisos = COALESCE(permisos, '{}'::jsonb) || '{"control_electrico": true}'::jsonb 
WHERE role IN ('owner', 'admin') OR permisos IS NOT NULL;

UPDATE public.miembros_equipo 
SET permisos = COALESCE(permisos, '{}'::jsonb) || '{"control_electrico": true}'::jsonb 
WHERE permisos IS NOT NULL;

-- Recargar el caché de PostgREST
NOTIFY pgrst, 'reload schema';
