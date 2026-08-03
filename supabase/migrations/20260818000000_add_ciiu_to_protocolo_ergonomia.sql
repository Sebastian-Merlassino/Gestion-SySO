-- Migration: Add ciiu_text column to protocolos_ergonomia table
-- File: supabase/migrations/20260818000000_add_ciiu_to_protocolo_ergonomia.sql

ALTER TABLE public.protocolos_ergonomia ADD COLUMN IF NOT EXISTS ciiu_text TEXT NULL;

-- Recargar esquema
NOTIFY pgrst, 'reload schema';
