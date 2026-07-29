-- Migration: Add Noise specific fields to protocolos_ruido_puntos
-- File: supabase/migrations/20260813000000_update_protocolo_ruido_puntos.sql

ALTER TABLE public.protocolos_ruido_puntos
  ADD COLUMN IF NOT EXISTS tiempo_exposicion_hs NUMERIC NULL,
  ADD COLUMN IF NOT EXISTS tiempo_integracion TEXT NULL,
  ADD COLUMN IF NOT EXISTS caracteristicas_ruido TEXT NULL DEFAULT 'continuo_intermitente',
  ADD COLUMN IF NOT EXISTS nivel_pico_lc_pico_dbc NUMERIC NULL,
  ADD COLUMN IF NOT EXISTS tipo_carga_continuo TEXT NULL DEFAULT 'laeq',
  ADD COLUMN IF NOT EXISTS nivel_laeq_te_dba NUMERIC NULL,
  ADD COLUMN IF NOT EXISTS modo_suma_fracciones TEXT NULL DEFAULT 'directo',
  ADD COLUMN IF NOT EXISTS fracciones JSONB NULL,
  ADD COLUMN IF NOT EXISTS resultado_suma_fracciones NUMERIC NULL,
  ADD COLUMN IF NOT EXISTS dosis_porcentaje NUMERIC NULL;

ALTER TABLE public.protocolos_ruido_adjuntos
  ADD COLUMN IF NOT EXISTS original_path TEXT NULL,
  ADD COLUMN IF NOT EXISTS markers JSONB NULL;
