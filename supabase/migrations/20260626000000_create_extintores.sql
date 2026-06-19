-- Migration: Create public.extintores table
-- File: supabase/migrations/20260626000000_create_extintores.sql

CREATE TABLE IF NOT EXISTS public.extintores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    establecimiento_id UUID NOT NULL REFERENCES public.establecimientos(id) ON DELETE CASCADE,
    area_sector TEXT,
    puesto_operacion_ref TEXT,
    n_puesto TEXT,
    n_extintor TEXT,
    tipo TEXT,
    capacidad INTEGER,
    venc_recarga DATE,
    venc_ph DATE,
    presion TEXT,
    precinto TEXT,
    marbete TEXT,
    partes_mecanicas TEXT,
    manguera_boquilla TEXT,
    cilindro TEXT,
    senalizacion TEXT,
    imagen_url TEXT, -- Path relativo en el bucket 'documents'
    fecha_control DATE,
    observaciones TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.extintores ENABLE ROW LEVEL SECURITY;

-- Crear políticas de RLS para aislamiento por tenant
DROP POLICY IF EXISTS extintores_tenant_isolation ON public.extintores;
CREATE POLICY extintores_tenant_isolation ON public.extintores
    FOR ALL TO authenticated
    USING (tenant_id = public.get_current_tenant_id())
    WITH CHECK (tenant_id = public.get_current_tenant_id());

-- Recargar el cache del esquema
NOTIFY pgrst, 'reload schema';
