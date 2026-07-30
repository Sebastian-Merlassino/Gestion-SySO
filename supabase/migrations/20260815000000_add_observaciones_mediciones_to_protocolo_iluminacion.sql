-- Migration: Add observaciones_mediciones column to public.protocolos_iluminacion
-- File: supabase/migrations/20260815000000_add_observaciones_mediciones_to_protocolo_iluminacion.sql

ALTER TABLE public.protocolos_iluminacion 
ADD COLUMN IF NOT EXISTS observaciones_mediciones TEXT NULL;
