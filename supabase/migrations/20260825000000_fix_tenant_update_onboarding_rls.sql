-- Migration: Fix tenant UPDATE policy and check_tenant_updates trigger for onboarding (FIX for HTTP 406 / SEC-002)
-- File: supabase/migrations/20260825000000_fix_tenant_update_onboarding_rls.sql
--
-- Problem: When a user attempts onboarding and reuses/claims an orphaned tenant (a tenant record created
-- during a previous step or failed attempt with 0 profiles linked), PostgREST fails with HTTP 406 Not Acceptable
-- ("Cannot coerce the result to a single JSON object") because:
-- 1) tenant_isolation_update RLS policy used user_has_tenant_access(id) which returned FALSE since the user's
--    profile.tenant_id was still NULL.
-- 2) check_tenant_updates trigger blocked updates to plan_id.
--
-- Solution:
-- 1) Update tenant_isolation_update RLS policy to allow users with profile.tenant_id IS NULL to UPDATE an orphaned tenant.
-- 2) Update check_tenant_updates trigger to permit initial setup for orphaned tenants.

-- 1. Actualizar política RLS tenant_isolation_update
DROP POLICY IF EXISTS tenant_isolation_update ON public.tenants;

CREATE POLICY tenant_isolation_update ON public.tenants
    FOR UPDATE TO authenticated
    USING (
        user_has_tenant_access(id)
        OR
        (
            (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()) IS NULL
            AND
            NOT EXISTS (SELECT 1 FROM public.profiles WHERE tenant_id = tenants.id)
        )
    )
    WITH CHECK (
        user_has_tenant_access(id)
        OR
        (
            (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()) IS NULL
            AND
            NOT EXISTS (SELECT 1 FROM public.profiles WHERE tenant_id = tenants.id)
        )
    );

-- 2. Actualizar trigger check_tenant_updates para permitir setup inicial de tenant huérfano
CREATE OR REPLACE FUNCTION public.check_tenant_updates()
RETURNS TRIGGER AS $$
BEGIN
    -- Allow updates if executed by postgres (SQL Editor) or service_role (server-side operations)
    IF current_user = 'postgres' OR auth.role() = 'service_role' THEN
        RETURN NEW;
    END IF;

    -- Allow initial plan setup if tenant is orphaned (onboarding setup)
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE tenant_id = OLD.id) THEN
        RETURN NEW;
    END IF;

    -- Block modifications of plan_id for established tenants
    IF NEW.plan_id IS DISTINCT FROM OLD.plan_id THEN
        RAISE EXCEPTION 'Operación no permitida: El plan comercial solo puede modificarse mediante la pasarela de pagos.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recargar caché de PostgREST
NOTIFY pgrst, 'reload schema';
