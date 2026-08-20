-- Migration: Add hora field to protocolos_iluminacion_puntos
-- File: supabase/migrations/20260904000000_add_hora_to_protocolos_iluminacion_puntos.sql

ALTER TABLE public.protocolos_iluminacion_puntos
ADD COLUMN IF NOT EXISTS hora TIME NULL;

NOTIFY pgrst, 'reload schema';
