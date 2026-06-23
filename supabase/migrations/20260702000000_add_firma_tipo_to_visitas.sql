-- Migration: Add firma_tipo to public.visitas
-- File: supabase/migrations/20260702000000_add_firma_tipo_to_visitas.sql

ALTER TABLE public.visitas ADD COLUMN IF NOT EXISTS firma_tipo TEXT NOT NULL DEFAULT 'mano';

-- Recargar el cache del esquema
NOTIFY pgrst, 'reload schema';
