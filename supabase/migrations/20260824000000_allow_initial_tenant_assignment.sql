-- Migration: Allow initial tenant_id/role assignment during onboarding (FIX for SEC-011)
-- File: supabase/migrations/20260824000000_allow_initial_tenant_assignment.sql
--
-- Problem: The check_profile_updates() trigger blocks ALL changes to tenant_id and role,
-- including the first-time assignment (NULL → value) during onboarding.
-- This causes HTTP 400 "No puedes modificar tu vinculación de organización (tenant_id)."
--
-- Solution: Allow the transition from NULL to a value (initial assignment).
-- Still block changing from one tenant to another (tenant migration).
-- Allow role change ONLY during onboarding (when tenant_id goes from NULL to a value).

CREATE OR REPLACE FUNCTION public.check_profile_updates()
RETURNS TRIGGER AS $$
BEGIN
    -- Permitir actualizaciones si las ejecuta el service_role (operaciones de servidor)
    IF auth.role() = 'service_role' THEN
        RETURN NEW;
    END IF;

    -- Determinar si estamos en flujo de onboarding (tenant_id pasa de NULL a un valor)
    -- En este caso, se permite también el cambio de role (miembro → admin)
    IF OLD.tenant_id IS NULL AND NEW.tenant_id IS NOT NULL THEN
        -- Permitir asignación inicial de tenant_id y role durante onboarding
        -- Solo verificar que empresa_id no cambie de un valor existente a otro
        IF NEW.empresa_id IS DISTINCT FROM OLD.empresa_id AND OLD.empresa_id IS NOT NULL THEN
            RAISE EXCEPTION 'Operación no permitida: No puedes modificar tu asociación de empresa (empresa_id).';
        END IF;
        RETURN NEW;
    END IF;

    -- Bloquear cambios de rol (fuera del flujo de onboarding)
    IF NEW.role IS DISTINCT FROM OLD.role THEN
        RAISE EXCEPTION 'Operación no permitida: No puedes modificar tu propio rol de usuario.';
    END IF;
    
    -- Bloquear cambios de tenant_id (de un valor a otro diferente)
    IF NEW.tenant_id IS DISTINCT FROM OLD.tenant_id THEN
        RAISE EXCEPTION 'Operación no permitida: No puedes modificar tu vinculación de organización (tenant_id).';
    END IF;

    -- Bloquear cambios de empresa_id (de un valor existente a otro)
    IF NEW.empresa_id IS DISTINCT FROM OLD.empresa_id THEN
        IF OLD.empresa_id IS NOT NULL THEN
            RAISE EXCEPTION 'Operación no permitida: No puedes modificar tu asociación de empresa (empresa_id).';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recargar la caché de PostgREST
NOTIFY pgrst, 'reload schema';
