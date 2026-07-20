-- Migration: Add imagen_url column to public.programa_anual table
-- File: supabase/migrations/20260808000000_add_imagen_url_to_programa_anual.sql

ALTER TABLE public.programa_anual ADD COLUMN IF NOT EXISTS imagen_url TEXT;

-- Recargar el caché del esquema
NOTIFY pgrst, 'reload schema';
