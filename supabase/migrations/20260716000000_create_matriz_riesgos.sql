-- Migration: Create public.matriz_riesgos table and set up policies and permissions
-- File: supabase/migrations/20260716000000_create_matriz_riesgos.sql

CREATE TABLE IF NOT EXISTS public.matriz_riesgos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    establecimiento_id UUID NOT NULL REFERENCES public.establecimientos(id) ON DELETE CASCADE,
    sector TEXT NOT NULL,
    puesto TEXT NOT NULL,
    tareas TEXT NOT NULL,
    frecuencia TEXT NOT NULL,
    situacion TEXT NOT NULL,
    tipo_peligro TEXT NOT NULL,
    peligro TEXT NOT NULL,
    riesgo TEXT NOT NULL,
    consecuencia TEXT NOT NULL,
    probabilidad TEXT NOT NULL,
    gravedad TEXT NOT NULL,
    nivel_riesgo TEXT NOT NULL,
    medidas_control_adm TEXT,
    medidas_control_ing TEXT,
    medidas_control_epp TEXT,
    medidas_control_recomendadas TEXT,
    responsable TEXT,
    fecha_planificada DATE,
    fecha_realizacion DATE,
    post_probabilidad TEXT,
    post_gravedad TEXT,
    post_nivel_riesgo TEXT,
    observaciones TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.matriz_riesgos ENABLE ROW LEVEL SECURITY;

-- Crear políticas RLS para aislamiento por tenant y restricciones por rol / permiso
DROP POLICY IF EXISTS matriz_riesgos_tenant_select ON public.matriz_riesgos;
CREATE POLICY matriz_riesgos_tenant_select ON public.matriz_riesgos
    FOR SELECT TO authenticated
    USING (
        public.user_has_tenant_access(tenant_id) 
        AND (NOT public.is_client_user() OR empresa_id = public.get_current_user_empresa_id())
    );

DROP POLICY IF EXISTS matriz_riesgos_tenant_insert ON public.matriz_riesgos;
CREATE POLICY matriz_riesgos_tenant_insert ON public.matriz_riesgos
    FOR INSERT TO authenticated
    WITH CHECK (
        public.user_has_tenant_access(tenant_id) 
        AND public.user_has_action_permission('matriz_riesgos', 'cargar')
    );

DROP POLICY IF EXISTS matriz_riesgos_tenant_update ON public.matriz_riesgos;
CREATE POLICY matriz_riesgos_tenant_update ON public.matriz_riesgos
    FOR UPDATE TO authenticated
    USING (
        public.user_has_tenant_access(tenant_id) 
        AND public.user_has_action_permission('matriz_riesgos', 'editar')
    )
    WITH CHECK (
        public.user_has_tenant_access(tenant_id) 
        AND public.user_has_action_permission('matriz_riesgos', 'editar')
    );

DROP POLICY IF EXISTS matriz_riesgos_tenant_delete ON public.matriz_riesgos;
CREATE POLICY matriz_riesgos_tenant_delete ON public.matriz_riesgos
    FOR DELETE TO authenticated
    USING (
        public.user_has_tenant_access(tenant_id) 
        AND public.user_has_action_permission('matriz_riesgos', 'eliminar')
    );

-- Actualizar valores por defecto de la columna permisos para incluir la nueva sección
ALTER TABLE public.miembros_equipo ALTER COLUMN permisos SET DEFAULT '{"empresas": true, "equipo": true, "programa": true, "capacitacion": true, "correctivas": true, "extintores": true, "visitas": true, "avisos": true, "legajo": true, "nomina": true, "accidentes": true, "matriz_riesgos": true}'::jsonb;
ALTER TABLE public.profiles ALTER COLUMN permisos SET DEFAULT '{"empresas": true, "equipo": true, "programa": true, "capacitacion": true, "correctivas": true, "extintores": true, "visitas": true, "avisos": true, "legajo": true, "nomina": true, "accidentes": true, "matriz_riesgos": true}'::jsonb;

-- Actualizar filas existentes en perfiles y miembros
UPDATE public.profiles 
SET permisos = COALESCE(permisos, '{}'::jsonb) || '{"matriz_riesgos": true}'::jsonb 
WHERE role IN ('owner', 'admin') OR permisos IS NOT NULL;

UPDATE public.miembros_equipo 
SET permisos = COALESCE(permisos, '{}'::jsonb) || '{"matriz_riesgos": true}'::jsonb 
WHERE permisos IS NOT NULL;

-- Recargar el caché de PostgREST
NOTIFY pgrst, 'reload schema';
