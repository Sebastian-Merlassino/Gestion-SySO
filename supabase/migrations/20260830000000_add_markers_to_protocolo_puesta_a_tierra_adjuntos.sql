-- Migration: Add original_path and markers to protocolos_puesta_a_tierra_adjuntos
-- File: supabase/migrations/20260830000000_add_markers_to_protocolo_puesta_a_tierra_adjuntos.sql

ALTER TABLE public.protocolos_puesta_a_tierra_adjuntos
  ADD COLUMN IF NOT EXISTS original_path TEXT NULL,
  ADD COLUMN IF NOT EXISTS markers JSONB NULL;
