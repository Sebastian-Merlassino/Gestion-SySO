-- Migration: Remove noise-specific fields and table from ergonomics module
-- File: supabase/migrations/20260818003000_remove_noise_fields_from_ergonomia.sql

ALTER TABLE public.protocolos_ergonomia_puntos 
  DROP COLUMN IF EXISTS tiempo_exposicion_hs,
  DROP COLUMN IF EXISTS tiempo_integracion,
  DROP COLUMN IF EXISTS caracteristicas_ruido,
  DROP COLUMN IF EXISTS nivel_pico_lc_pico_dbc,
  DROP COLUMN IF EXISTS tipo_carga_continuo,
  DROP COLUMN IF EXISTS nivel_laeq_te_dba,
  DROP COLUMN IF EXISTS modo_suma_fracciones,
  DROP COLUMN IF EXISTS fracciones,
  DROP COLUMN IF EXISTS resultado_suma_fracciones,
  DROP COLUMN IF EXISTS dosis_porcentaje;

DROP TABLE IF EXISTS public.protocolos_ergonomia_mediciones CASCADE;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
