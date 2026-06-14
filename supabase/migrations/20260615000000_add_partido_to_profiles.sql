-- Migration: Add partido (departamento) column to profiles
-- File: supabase/migrations/20260615000000_add_partido_to_profiles.sql

CREATE TABLE IF NOT EXISTS public.profiles (
    -- existing columns are defined elsewhere; we only alter the table
    -- This statement ensures the column is added if not present
    id UUID PRIMARY KEY
);

-- Add the new column with a default empty string for existing rows
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS departamento_partido VARCHAR(255) DEFAULT '' NOT NULL;

-- Optional: backfill existing rows if we have a mapping (none at this time)
-- UPDATE public.profiles SET departamento_partido = '' WHERE departamento_partido IS NULL;

-- No RLS changes needed; existing profile policies already allow the owner to read/write its own row.
