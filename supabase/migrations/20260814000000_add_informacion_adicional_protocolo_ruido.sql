-- Migration: Add informacion_adicional column to public.protocolos_ruido
-- File: supabase/migrations/20260814000000_add_informacion_adicional_protocolo_ruido.sql

ALTER TABLE public.protocolos_ruido 
ADD COLUMN IF NOT EXISTS informacion_adicional TEXT NULL;
