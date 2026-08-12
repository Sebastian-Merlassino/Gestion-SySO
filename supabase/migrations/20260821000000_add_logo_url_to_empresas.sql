-- Migration: Add logo_url to public.empresas
-- File: supabase/migrations/20260821000000_add_logo_url_to_empresas.sql

ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
