-- Migration: Add informacion_adicional to public.protocolos_ruido
ALTER TABLE public.protocolos_ruido ADD COLUMN IF NOT EXISTS informacion_adicional TEXT NULL;
