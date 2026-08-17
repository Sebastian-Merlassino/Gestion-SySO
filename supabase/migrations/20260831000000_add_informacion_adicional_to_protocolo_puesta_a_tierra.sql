-- Migration: Add informacion_adicional to protocolos_puesta_a_tierra
-- File: supabase/migrations/20260831000000_add_informacion_adicional_to_protocolo_puesta_a_tierra.sql

ALTER TABLE public.protocolos_puesta_a_tierra 
ADD COLUMN IF NOT EXISTS informacion_adicional TEXT NULL;
