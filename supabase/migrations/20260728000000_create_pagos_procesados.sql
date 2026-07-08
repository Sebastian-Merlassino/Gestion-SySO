-- Migration: Create public.pagos_procesados table and set up policies and permissions for Mercado Pago webhook idempotency
-- File: supabase/migrations/20260728000000_create_pagos_procesados.sql

CREATE TABLE IF NOT EXISTS public.pagos_procesados (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id TEXT UNIQUE NOT NULL,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    status TEXT NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    event_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS en pagos_procesados
ALTER TABLE public.pagos_procesados ENABLE ROW LEVEL SECURITY;

-- 1. Política SELECT: Aislamiento por tenant
DROP POLICY IF EXISTS pagos_procesados_tenant_select ON public.pagos_procesados;
CREATE POLICY pagos_procesados_tenant_select ON public.pagos_procesados
    FOR SELECT TO authenticated
    USING (public.user_has_tenant_access(tenant_id));

-- Recargar el caché del esquema de PostgREST
NOTIFY pgrst, 'reload schema';
