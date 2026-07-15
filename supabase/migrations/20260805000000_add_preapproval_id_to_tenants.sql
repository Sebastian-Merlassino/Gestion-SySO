-- Migration: Add preapproval_id to tenants table
-- File: supabase/migrations/20260805000000_add_preapproval_id_to_tenants.sql

ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS preapproval_id VARCHAR(255);

-- Recargar caché de PostgREST
NOTIFY pgrst, 'reload schema';
