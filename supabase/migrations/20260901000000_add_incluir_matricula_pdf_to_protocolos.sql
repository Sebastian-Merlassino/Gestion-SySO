-- Migration: Add optional incluir_matricula_pdf column to all protocol tables
-- File: supabase/migrations/20260901000000_add_incluir_matricula_pdf_to_protocolos.sql

ALTER TABLE public.protocolos_iluminacion
  ADD COLUMN IF NOT EXISTS incluir_matricula_pdf BOOLEAN DEFAULT TRUE;

ALTER TABLE public.protocolos_ruido
  ADD COLUMN IF NOT EXISTS incluir_matricula_pdf BOOLEAN DEFAULT TRUE;

ALTER TABLE public.protocolos_puesta_a_tierra
  ADD COLUMN IF NOT EXISTS incluir_matricula_pdf BOOLEAN DEFAULT TRUE;

ALTER TABLE public.protocolos_ergonomia
  ADD COLUMN IF NOT EXISTS incluir_matricula_pdf BOOLEAN DEFAULT TRUE;
