-- Migration: Add adjuntar_registros_urls column to public.control_electrico
-- File: supabase/migrations/20260721000000_add_photos_to_control_electrico.sql

ALTER TABLE public.control_electrico
ADD COLUMN IF NOT EXISTS adjuntar_registros_urls TEXT[] DEFAULT '{}'::TEXT[];

-- Recargar el caché de PostgREST
NOTIFY pgrst, 'reload schema';
