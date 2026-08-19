-- Migration: Add is_superadmin column to public.profiles and prevent client privilege escalation
-- File: supabase/migrations/20260902000000_add_is_superadmin_to_profiles.sql

-- 1. Agregar columna is_superadmin a profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_superadmin BOOLEAN DEFAULT FALSE;

-- 2. Marcar al superadmin principal
UPDATE public.profiles
SET is_superadmin = TRUE
WHERE email = 'sebastian.merlassino@gestionsyso.com';

-- 3. Crear función trigger para evitar que un usuario común se auto-asigne is_superadmin = true mediante la API pública de Supabase
CREATE OR REPLACE FUNCTION public.prevent_superadmin_privilege_escalation()
RETURNS TRIGGER AS $$
BEGIN
    -- Si el rol de la sesión es 'authenticated' o 'anon' (no service_role), y se intenta cambiar is_superadmin a true
    IF (current_setting('request.jwt.claim.role', true) IN ('authenticated', 'anon')) THEN
        IF NEW.is_superadmin IS DISTINCT FROM OLD.is_superadmin AND NEW.is_superadmin = TRUE THEN
            -- Mantener el valor original anterior
            NEW.is_superadmin := OLD.is_superadmin;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Eliminar trigger si existía y volver a crearlo
DROP TRIGGER IF EXISTS trg_prevent_superadmin_privilege_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_superadmin_privilege_escalation
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_superadmin_privilege_escalation();

-- 4. Notificar a PostgREST para recargar el esquema
NOTIFY pgrst, 'reload schema';
