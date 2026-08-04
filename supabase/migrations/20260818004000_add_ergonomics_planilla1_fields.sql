-- Migration: Add fields for Resolution SRT 886/15 Planilla 1 (Ergonomics)
-- File: supabase/migrations/20260818004000_add_ergonomics_planilla1_fields.sql

ALTER TABLE public.protocolos_ergonomia_puntos 
  ADD COLUMN IF NOT EXISTS procedimiento_escrito TEXT NULL DEFAULT 'no',
  ADD COLUMN IF NOT EXISTS capacitacion TEXT NULL DEFAULT 'no',
  ADD COLUMN IF NOT EXISTS nombres_trabajadores TEXT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS manifestacion_temprana TEXT NULL DEFAULT 'no',
  ADD COLUMN IF NOT EXISTS ubicacion_sintoma TEXT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS tareas JSONB NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS tiempos_exposicion JSONB NULL DEFAULT '{}'::jsonb;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
