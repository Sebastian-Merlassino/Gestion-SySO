-- Migration: Add informacion_adicional_doc and informacion_adicional to public.protocolos_ruido
ALTER TABLE public.protocolos_ruido ADD COLUMN IF NOT EXISTS informacion_adicional_doc TEXT NULL;
ALTER TABLE public.protocolos_ruido ADD COLUMN IF NOT EXISTS informacion_adicional TEXT NULL;
