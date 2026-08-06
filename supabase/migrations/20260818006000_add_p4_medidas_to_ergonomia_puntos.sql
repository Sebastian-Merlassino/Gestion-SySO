-- Migration: Add p4_medidas column to public.protocolos_ergonomia_puntos
-- File: supabase/migrations/20260818006000_add_p4_medidas_to_ergonomia_puntos.sql

ALTER TABLE public.protocolos_ergonomia_puntos 
ADD COLUMN IF NOT EXISTS p4_medidas JSONB NULL;

COMMENT ON COLUMN public.protocolos_ergonomia_puntos.p4_medidas IS 'Res. SRT 886/15 Anexo I - Planilla 4: Matriz de Seguimiento Medidas Correctivas y Preventivas por puesto evaluado';
