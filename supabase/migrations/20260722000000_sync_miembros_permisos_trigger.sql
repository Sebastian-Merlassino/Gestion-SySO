-- Migration: Sync permisos from miembros_equipo to profiles in trigger sync_miembro_to_profile
-- File: supabase/migrations/20260722000000_sync_miembros_permisos_trigger.sql

-- 1. Redefinir la función de sincronización del trigger para incluir 'permisos'
CREATE OR REPLACE FUNCTION public.sync_miembro_to_profile()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.profile_id IS NOT NULL THEN
    UPDATE public.profiles
    SET 
      full_name = NEW.full_name,
      phone = NEW.phone,
      cuit = NEW.cuit,
      birth_date = NEW.birth_date,
      provincia = NEW.provincia,
      partido = NEW.partido,
      localidad = NEW.localidad,
      signature_url = NEW.signature_url,
      permisos = COALESCE(NEW.permisos, permisos) -- Propagar permisos al perfil
    WHERE id = NEW.profile_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Sincronizar todos los permisos existentes de miembros de equipo hacia sus perfiles de login
UPDATE public.profiles p
SET permisos = m.permisos
FROM public.miembros_equipo m
WHERE p.id = m.profile_id
  AND m.permisos IS NOT NULL;

-- 3. Recargar caché del esquema de PostgREST
NOTIFY pgrst, 'reload schema';
