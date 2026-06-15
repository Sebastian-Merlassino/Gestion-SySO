-- Migration: Create public.programa_anual table
-- File: supabase/migrations/20260621010000_create_programa_anual.sql

CREATE TABLE IF NOT EXISTS public.programa_anual (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    establecimiento_id UUID REFERENCES public.establecimientos(id) ON DELETE CASCADE,
    catalogo_id UUID REFERENCES public.programa_anual_catalogo(id) ON DELETE SET NULL,
    descripcion TEXT NOT NULL,
    marco_legal TEXT,
    responsable_id UUID REFERENCES public.miembros_equipo(id) ON DELETE SET NULL,
    progreso INTEGER NOT NULL DEFAULT 0 CHECK (progreso >= 0 AND progreso <= 100),
    fecha_planificada DATE NOT NULL,
    fecha_realizacion DATE,
    documento_url TEXT, -- Path relativo en el bucket 'documents' (ej. uid/programa_id.pdf)
    observaciones TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.programa_anual ENABLE ROW LEVEL SECURITY;

-- Crear políticas de RLS para aislamiento por tenant
DROP POLICY IF EXISTS programa_anual_tenant_isolation ON public.programa_anual;
CREATE POLICY programa_anual_tenant_isolation ON public.programa_anual
    FOR ALL TO authenticated
    USING (tenant_id = public.get_current_tenant_id())
    WITH CHECK (tenant_id = public.get_current_tenant_id());

-- Recargar el cache del esquema
NOTIFY pgrst, 'reload schema';
