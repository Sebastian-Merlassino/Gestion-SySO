-- Migration: Add informacion_adicional_doc to public.protocolos_ruido
ALTER TABLE public.protocolos_ruido ADD COLUMN IF NOT EXISTS informacion_adicional_doc TEXT NULL;
