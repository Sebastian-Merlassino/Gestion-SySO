-- Migration: Add sectores and observaciones columns to public.establecimientos table
-- File: supabase/migrations/20260715000000_add_sectores_and_observaciones_to_establecimientos.sql

ALTER TABLE public.establecimientos 
ADD COLUMN IF NOT EXISTS sectores JSONB DEFAULT '[]'::jsonb NOT NULL,
ADD COLUMN IF NOT EXISTS observaciones TEXT;

-- Recargar el caché de PostgREST
NOTIFY pgrst, 'reload schema';
