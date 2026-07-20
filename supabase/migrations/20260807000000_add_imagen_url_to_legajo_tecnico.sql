-- Migration: Add imagen_url column to public.legajo_tecnico
-- File: supabase/migrations/20260807000000_add_imagen_url_to_legajo_tecnico.sql

ALTER TABLE public.legajo_tecnico
ADD COLUMN IF NOT EXISTS imagen_url TEXT;

-- Recargar el caché de PostgREST
NOTIFY pgrst, 'reload schema';
