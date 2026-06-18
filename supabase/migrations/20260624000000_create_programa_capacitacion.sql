-- Migration: Create public.programa_capacitacion table
-- File: supabase/migrations/20260624000000_create_programa_capacitacion.sql

CREATE TABLE IF NOT EXISTS public.programa_capacitacion (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    establecimiento_id UUID REFERENCES public.establecimientos(id) ON DELETE CASCADE,
    puesto TEXT,
    tema TEXT NOT NULL,
    tema_id UUID REFERENCES public.temas_capacitacion(id) ON DELETE SET NULL,
    contenido TEXT,
    capacitador TEXT NOT NULL,
    capacitador_id UUID REFERENCES public.miembros_equipo(id) ON DELETE SET NULL,
    progreso INTEGER NOT NULL DEFAULT 0 CHECK (progreso >= 0 AND progreso <= 100),
    fecha_inicio_planificada DATE NOT NULL,
    fecha_fin_planificada DATE NOT NULL,
    observaciones TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.programa_capacitacion ENABLE ROW LEVEL SECURITY;

-- Crear políticas de RLS para aislamiento por tenant
DROP POLICY IF EXISTS programa_capacitacion_tenant_isolation ON public.programa_capacitacion;
CREATE POLICY programa_capacitacion_tenant_isolation ON public.programa_capacitacion
    FOR ALL TO authenticated
    USING (tenant_id = public.get_current_tenant_id())
    WITH CHECK (tenant_id = public.get_current_tenant_id());

-- Recargar el cache del esquema
NOTIFY pgrst, 'reload schema';
