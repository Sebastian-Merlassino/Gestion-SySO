-- Migration: Remove medicion fields from protocolos_ergonomia
-- File: supabase/migrations/20260818000500_remove_medicion_fields_from_ergonomia.sql

ALTER TABLE public.protocolos_ergonomia 
  DROP COLUMN IF EXISTS instrumento_marca_modelo_serie,
  DROP COLUMN IF EXISTS fecha_calibracion,
  DROP COLUMN IF EXISTS metodologia_utilizada,
  DROP COLUMN IF EXISTS hora_inicio,
  DROP COLUMN IF EXISTS hora_finalizacion,
  DROP COLUMN IF EXISTS condiciones_atmosfericas,
  DROP COLUMN IF EXISTS documentacion_adjunta,
  DROP COLUMN IF EXISTS horarios_turnos_text;

-- Recargar esquema
NOTIFY pgrst, 'reload schema';
