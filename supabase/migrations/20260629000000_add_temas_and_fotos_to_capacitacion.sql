-- Migration: Add temas, tema_ids, and fotos_urls to public.programa_capacitacion
-- File: supabase/migrations/20260629000000_add_temas_and_fotos_to_capacitacion.sql

ALTER TABLE public.programa_capacitacion 
ADD COLUMN IF NOT EXISTS temas TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS tema_ids UUID[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS fotos_urls TEXT[] DEFAULT '{}';

-- Recargar el cache del esquema
NOTIFY pgrst, 'reload schema';
