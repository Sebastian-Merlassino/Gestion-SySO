-- Migration: Drop NOT NULL constraint from documento_url in legajo_tecnico
-- File: supabase/migrations/20260809000000_drop_not_null_documento_url_in_legajo.sql

ALTER TABLE public.legajo_tecnico ALTER COLUMN documento_url DROP NOT NULL;

-- Recargar el caché del esquema
NOTIFY pgrst, 'reload schema';
