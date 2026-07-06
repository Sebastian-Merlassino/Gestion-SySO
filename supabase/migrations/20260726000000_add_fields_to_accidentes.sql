-- Migration: Add fields for worker and occurrence details to public.accidentes
-- File: supabase/migrations/20260726000000_add_fields_to_accidentes.sql

ALTER TABLE public.accidentes
ADD COLUMN IF NOT EXISTS fecha_ingreso DATE,
ADD COLUMN IF NOT EXISTS turno_trabajo TEXT,
ADD COLUMN IF NOT EXISTS jornada_habitual TEXT,
ADD COLUMN IF NOT EXISTS antiguedad_empresa TEXT,
ADD COLUMN IF NOT EXISTS antiguedad_puesto TEXT,
ADD COLUMN IF NOT EXISTS domicilio_ocurrencia TEXT,
ADD COLUMN IF NOT EXISTS provincia_ocurrencia TEXT,
ADD COLUMN IF NOT EXISTS partido_ocurrencia TEXT,
ADD COLUMN IF NOT EXISTS localidad_barrio_ocurrencia TEXT,
ADD COLUMN IF NOT EXISTS fotos_urls TEXT[] DEFAULT '{}';

-- Recargar esquema de PostgREST
NOTIFY pgrst, 'reload schema';
