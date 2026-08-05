-- Migration: Add planilla4_medidas column to public.protocolos_ergonomia
-- File: supabase/migrations/20260818005000_add_planilla4_medidas_to_protocolo_ergonomia.sql

ALTER TABLE public.protocolos_ergonomia 
ADD COLUMN IF NOT EXISTS planilla4_medidas JSONB NULL;

COMMENT ON COLUMN public.protocolos_ergonomia.planilla4_medidas IS 'Res. SRT 886/15 Anexo I - Planilla 4: Matriz de Seguimiento Medidas Correctivas y Preventivas a nivel protocolo';
