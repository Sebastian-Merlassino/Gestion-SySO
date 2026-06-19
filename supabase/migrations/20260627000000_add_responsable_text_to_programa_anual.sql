-- Migration: Add responsable TEXT column to public.programa_anual table
-- File: supabase/migrations/20260627000000_add_responsable_text_to_programa_anual.sql

ALTER TABLE public.programa_anual ADD COLUMN IF NOT EXISTS responsable TEXT;

-- Update existing records to sync names from public.miembros_equipo
UPDATE public.programa_anual p
SET responsable = m.full_name
FROM public.miembros_equipo m
WHERE p.responsable_id = m.id;

-- Recargar el cache del esquema
NOTIFY pgrst, 'reload schema';
