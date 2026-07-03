-- Migration: Critical Security Remediations for profiles, tenants, and CUIT RPC.
-- File: supabase/migrations/20260725000000_critical_security_remediations.sql

-- 1. SEC-001: Trigger BEFORE UPDATE on public.profiles to prevent client-side modification of role or tenant_id
CREATE OR REPLACE FUNCTION public.check_profile_updates()
RETURNS TRIGGER AS $$
BEGIN
    -- Allow updates if executed by the service_role (server-side operations)
    IF auth.role() = 'service_role' THEN
        RETURN NEW;
    END IF;

    -- Block modifications of role
    IF NEW.role IS DISTINCT FROM OLD.role THEN
        RAISE EXCEPTION 'Operación no permitida: No puedes modificar tu propio rol de usuario.';
    END IF;
    
    -- Block modifications of tenant_id
    IF NEW.tenant_id IS DISTINCT FROM OLD.tenant_id THEN
        RAISE EXCEPTION 'Operación no permitida: No puedes modificar tu vinculación de organización (tenant_id).';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS before_profile_update ON public.profiles;
CREATE TRIGGER before_profile_update
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.check_profile_updates();


-- 2. SEC-002: Trigger BEFORE UPDATE on public.tenants to prevent client-side modification of plan_id
CREATE OR REPLACE FUNCTION public.check_tenant_updates()
RETURNS TRIGGER AS $$
BEGIN
    -- Allow updates if executed by the service_role (server-side operations)
    IF auth.role() = 'service_role' THEN
        RETURN NEW;
    END IF;

    -- Block modifications of plan_id
    IF NEW.plan_id IS DISTINCT FROM OLD.plan_id THEN
        RAISE EXCEPTION 'Operación no permitida: El plan comercial solo puede modificarse mediante la pasarela de pagos.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS before_tenant_update ON public.tenants;
CREATE TRIGGER before_tenant_update
    BEFORE UPDATE ON public.tenants
    FOR EACH ROW EXECUTE FUNCTION public.check_tenant_updates();


-- 3. SEC-003: Revoke execution of public.get_email_by_cuit from public/anon users to prevent data harvesting
REVOKE EXECUTE ON FUNCTION public.get_email_by_cuit(text) FROM public, anon;

-- Recargamos la caché del esquema de PostgREST
NOTIFY pgrst, 'reload schema';
