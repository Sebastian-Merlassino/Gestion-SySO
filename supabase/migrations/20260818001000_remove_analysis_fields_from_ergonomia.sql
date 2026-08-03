-- Migration: Remove analysis and extra fields from protocolos_ergonomia
-- File: supabase/migrations/20260818001000_remove_analysis_fields_from_ergonomia.sql

ALTER TABLE public.protocolos_ergonomia 
  DROP COLUMN IF EXISTS conclusiones,
  DROP COLUMN IF EXISTS recomendaciones,
  DROP COLUMN IF EXISTS informacion_adicional;

-- Recargar esquema
NOTIFY pgrst, 'reload schema';
