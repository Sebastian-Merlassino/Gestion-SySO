-- Migration: Create public.acciones_correctivas table
-- File: supabase/migrations/20260622000000_create_acciones_correctivas.sql

CREATE TABLE IF NOT EXISTS public.acciones_correctivas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    establecimiento_id UUID REFERENCES public.establecimientos(id) ON DELETE CASCADE,
    fuente TEXT NOT NULL,
    fecha DATE NOT NULL,
    area_sector TEXT,
    puesto_operacion TEXT,
    tipo_hallazgo TEXT NOT NULL,
    descripcion_hallazgo TEXT,
    nivel_riesgo TEXT NOT NULL, -- 'Riesgo trivial', 'Riesgo tolerable', 'Riesgo moderado', 'Riesgo sustancial', 'Riesgo intolerable', 'N/A'
    imagen_url TEXT, -- Path relativo en el bucket 'documents' (ej. uid/corrective_id.jpg)
    recomendacion TEXT,
    accion_preventiva TEXT,
    causa_raiz TEXT,
    accion_correctiva TEXT,
    responsable TEXT,
    fecha_planificada DATE,
    fecha_implementacion DATE,
    observaciones TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.acciones_correctivas ENABLE ROW LEVEL SECURITY;

-- Crear políticas de RLS para aislamiento por tenant
DROP POLICY IF EXISTS acciones_correctivas_tenant_isolation ON public.acciones_correctivas;
CREATE POLICY acciones_correctivas_tenant_isolation ON public.acciones_correctivas
    FOR ALL TO authenticated
    USING (tenant_id = public.get_current_tenant_id())
    WITH CHECK (tenant_id = public.get_current_tenant_id());

-- Recargar el cache del esquema
NOTIFY pgrst, 'reload schema';
