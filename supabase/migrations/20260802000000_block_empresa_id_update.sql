-- Migration: Block client-side updates to public.profiles.empresa_id (SEC-011)
-- File: supabase/migrations/20260802000000_block_empresa_id_update.sql

CREATE OR REPLACE FUNCTION public.check_profile_updates()
RETURNS TRIGGER AS $$
BEGIN
    -- Permitir actualizaciones si las ejecuta el service_role (operaciones de servidor)
    IF auth.role() = 'service_role' THEN
        RETURN NEW;
    END IF;

    -- Bloquear cambios de rol
    IF NEW.role IS DISTINCT FROM OLD.role THEN
        RAISE EXCEPTION 'Operación no permitida: No puedes modificar tu propio rol de usuario.';
    END IF;
    
    -- Bloquear cambios de tenant_id
    IF NEW.tenant_id IS DISTINCT FROM OLD.tenant_id THEN
        RAISE EXCEPTION 'Operación no permitida: No puedes modificar tu vinculación de organización (tenant_id).';
    END IF;

    -- Bloquear cambios de empresa_id (Mitigación CRIT-01)
    IF NEW.empresa_id IS DISTINCT FROM OLD.empresa_id THEN
        RAISE EXCEPTION 'Operación no permitida: No puedes modificar tu asociación de empresa (empresa_id).';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recargar la caché de PostgREST
NOTIFY pgrst, 'reload schema';
