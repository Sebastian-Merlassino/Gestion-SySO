-- Migration: Add signatures and clarifications columns to public.accidentes
ALTER TABLE public.accidentes
ADD COLUMN IF NOT EXISTS firma_responsable_empresa TEXT,
ADD COLUMN IF NOT EXISTS firma_profesional TEXT,
ADD COLUMN IF NOT EXISTS firma_tipo TEXT DEFAULT 'mano',
ADD COLUMN IF NOT EXISTS firma_responsable_aclaracion TEXT,
ADD COLUMN IF NOT EXISTS firma_profesional_aclaracion TEXT;

-- Recargar esquema de PostgREST
NOTIFY pgrst, 'reload schema';
