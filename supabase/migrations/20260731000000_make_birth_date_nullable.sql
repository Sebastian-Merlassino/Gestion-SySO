-- Migration: Make birth_date optional in miembros_equipo table.
-- File: supabase/migrations/20260731000000_make_birth_date_nullable.sql

ALTER TABLE public.miembros_equipo ALTER COLUMN birth_date DROP NOT NULL;

-- Recargar caché de PostgREST
NOTIFY pgrst, 'reload schema';
