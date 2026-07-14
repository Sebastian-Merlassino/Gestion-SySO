-- Migration: Drop get_email_by_cuit function to prevent email harvesting (SEC-012)
-- File: supabase/migrations/20260803000000_remove_get_email_by_cuit.sql

DROP FUNCTION IF EXISTS public.get_email_by_cuit(text);

-- Recargar la caché de PostgREST
NOTIFY pgrst, 'reload schema';
