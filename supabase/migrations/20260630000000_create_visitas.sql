-- Migration: Create public.visitas table
-- File: supabase/migrations/20260630000000_create_visitas.sql

CREATE TABLE IF NOT EXISTS public.visitas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    establecimiento_id UUID NOT NULL REFERENCES public.establecimientos(id) ON DELETE CASCADE,
    fecha DATE NOT NULL,
    profesional_tipo TEXT NOT NULL DEFAULT 'miembro', -- 'miembro' o 'manual'
    profesional_nombre TEXT NOT NULL,
    profesional_id UUID REFERENCES public.miembros_equipo(id) ON DELETE SET NULL,
    responsable_presente TEXT,
    ocurrieron_incidentes BOOLEAN NOT NULL DEFAULT false,
    analisis_correspondiente TEXT, -- 'Sí', 'No', 'N/A'
    causa_raiz TEXT,
    accion_correctiva TEXT,
    relevamiento_higiene_seguridad TEXT, -- 'Sí', 'No', 'N/A'
    relevamiento_practicas_seguras TEXT, -- 'Sí', 'No', 'N/A'
    relevamiento_epp TEXT, -- 'Sí', 'No', 'N/A'
    realizaron_mediciones TEXT, -- 'Sí', 'No', 'N/A'
    mediciones_realizadas TEXT[] DEFAULT '{}'::TEXT[],
    verifico_acciones_correctivas TEXT, -- 'Sí', 'No', 'N/A'
    dictaron_capacitaciones BOOLEAN NOT NULL DEFAULT false,
    capacitaciones_temas TEXT[] DEFAULT '{}'::TEXT[],
    realizaron_simulacros BOOLEAN NOT NULL DEFAULT false,
    simulacros_tipo TEXT[] DEFAULT '{}'::TEXT[],
    emite_aviso_riesgo BOOLEAN NOT NULL DEFAULT false,
    documentacion_incorporada TEXT[] DEFAULT '{}'::TEXT[],
    observaciones_recomendaciones TEXT,
    adjuntar_registros_urls TEXT[] DEFAULT '{}'::TEXT[], -- paths in documents storage
    firma_responsable_empresa TEXT, -- base64 dataURI or relative path in storage
    firma_profesional TEXT, -- base64 dataURI or relative path in storage
    observaciones TEXT, -- Observaciones finales
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.visitas ENABLE ROW LEVEL SECURITY;

-- Crear políticas de RLS para aislamiento por tenant
DROP POLICY IF EXISTS visitas_tenant_isolation ON public.visitas;
CREATE POLICY visitas_tenant_isolation ON public.visitas
    FOR ALL TO authenticated
    USING (tenant_id = public.get_current_tenant_id())
    WITH CHECK (tenant_id = public.get_current_tenant_id());

-- Recargar el cache del esquema
NOTIFY pgrst, 'reload schema';
