-- Migration: Add bloque_observaciones to checklist_templates
-- File: supabase/migrations/20260724000000_add_bloque_observaciones_to_checklist_templates.sql

ALTER TABLE public.checklist_templates 
ADD COLUMN IF NOT EXISTS bloque_observaciones BOOLEAN NOT NULL DEFAULT true;

-- Recargar el caché de PostgREST
NOTIFY pgrst, 'reload schema';
