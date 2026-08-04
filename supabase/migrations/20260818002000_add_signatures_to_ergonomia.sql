-- Migration: Add employer and medicine signatures to public.protocolos_ergonomia
-- File: supabase/migrations/20260818002000_add_signatures_to_ergonomia.sql

ALTER TABLE public.protocolos_ergonomia 
  ADD COLUMN IF NOT EXISTS firma_empleador TEXT NULL,
  ADD COLUMN IF NOT EXISTS empleador_nombre TEXT NULL,
  ADD COLUMN IF NOT EXISTS firma_medicina TEXT NULL,
  ADD COLUMN IF NOT EXISTS medicina_nombre TEXT NULL,
  ADD COLUMN IF NOT EXISTS medicina_matricula TEXT NULL;

-- Recargar esquema
NOTIFY pgrst, 'reload schema';
