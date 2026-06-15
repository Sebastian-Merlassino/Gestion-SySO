-- Migration: Fix trigger column names for departamento_partido and partido synchronization
-- File: supabase/migrations/20260620010000_fix_triggers_partido.sql

CREATE OR REPLACE FUNCTION public.sync_miembro_to_profile()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.profile_id IS NOT NULL THEN
    -- Check if target record is distinct to prevent infinite trigger loops
    IF EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = NEW.profile_id
        AND (
          full_name IS DISTINCT FROM NEW.full_name OR
          email IS DISTINCT FROM NEW.email OR
          phone IS DISTINCT FROM NEW.phone OR
          cuit IS DISTINCT FROM NEW.cuit OR
          birth_date IS DISTINCT FROM NEW.birth_date OR
          provincia IS DISTINCT FROM NEW.provincia OR
          departamento_partido IS DISTINCT FROM NEW.partido OR
          localidad IS DISTINCT FROM NEW.localidad OR
          signature_url IS DISTINCT FROM NEW.signature_url
        )
    ) THEN
      UPDATE public.profiles
      SET 
        full_name = NEW.full_name,
        email = NEW.email,
        phone = NEW.phone,
        cuit = NEW.cuit,
        birth_date = NEW.birth_date,
        provincia = NEW.provincia,
        departamento_partido = NEW.partido, -- Sync to profiles.departamento_partido from miembros_equipo.partido
        localidad = NEW.localidad,
        signature_url = NEW.signature_url
      WHERE id = NEW.profile_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.sync_profile_to_miembro()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if target record is distinct to prevent infinite trigger loops
  IF EXISTS (
    SELECT 1 FROM public.miembros_equipo
    WHERE profile_id = NEW.id
      AND (
        full_name IS DISTINCT FROM NEW.full_name OR
        email IS DISTINCT FROM NEW.email OR
        phone IS DISTINCT FROM NEW.phone OR
        cuit IS DISTINCT FROM NEW.cuit OR
        birth_date IS DISTINCT FROM NEW.birth_date OR
        provincia IS DISTINCT FROM NEW.provincia OR
        partido IS DISTINCT FROM NEW.departamento_partido OR
        localidad IS DISTINCT FROM NEW.localidad OR
        signature_url IS DISTINCT FROM NEW.signature_url
      )
  ) THEN
    UPDATE public.miembros_equipo
    SET 
      full_name = NEW.full_name,
      email = NEW.email,
      phone = NEW.phone,
      cuit = NEW.cuit,
      birth_date = NEW.birth_date,
      provincia = NEW.provincia,
      partido = NEW.departamento_partido, -- Sync to miembros_equipo.partido from profiles.departamento_partido
      localidad = NEW.localidad,
      signature_url = NEW.signature_url
    WHERE profile_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Reload Schema Cache
NOTIFY pgrst, 'reload schema';
