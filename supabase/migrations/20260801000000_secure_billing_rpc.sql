-- Migration: Secure billing administrative RPC functions (SEC-008)
-- File: supabase/migrations/20260801000000_secure_billing_rpc.sql

-- 1. Revoke execution privileges from public roles to prevent PostgREST RPC access
REVOKE EXECUTE ON FUNCTION public.gift_plan_to_tenant(text, text, text) FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.apply_discount_to_tenant(text, numeric, text) FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_tenant_exempt(text, boolean) FROM public, anon, authenticated;

-- 2. Redefine public.gift_plan_to_tenant with strict service_role verification
CREATE OR REPLACE FUNCTION public.gift_plan_to_tenant(p_slug TEXT, p_gift_plan_id TEXT, p_duration TEXT)
RETURNS VOID AS $$
BEGIN
    -- Block any caller that is not executing as service_role
    IF auth.role() != 'service_role' THEN
        RAISE EXCEPTION 'Acceso denegado: Operación no autorizada.';
    END IF;

    UPDATE public.tenants
    SET gift_plan_id = p_gift_plan_id,
        gift_ends_at = now() + p_duration::interval
    WHERE slug = p_slug;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Redefine public.apply_discount_to_tenant with strict service_role verification
CREATE OR REPLACE FUNCTION public.apply_discount_to_tenant(p_slug TEXT, p_discount_percentage NUMERIC, p_duration TEXT)
RETURNS VOID AS $$
BEGIN
    -- Block any caller that is not executing as service_role
    IF auth.role() != 'service_role' THEN
        RAISE EXCEPTION 'Acceso denegado: Operación no autorizada.';
    END IF;

    UPDATE public.tenants
    SET discount_percentage = p_discount_percentage,
        discount_ends_at = now() + p_duration::interval
    WHERE slug = p_slug;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Redefine public.set_tenant_exempt with strict service_role verification
CREATE OR REPLACE FUNCTION public.set_tenant_exempt(p_slug TEXT, p_is_exempt BOOLEAN)
RETURNS VOID AS $$
BEGIN
    -- Block any caller that is not executing as service_role
    IF auth.role() != 'service_role' THEN
        RAISE EXCEPTION 'Acceso denegado: Operación no autorizada.';
    END IF;

    UPDATE public.tenants
    SET is_exempt = p_is_exempt
    WHERE slug = p_slug;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Reload the schema cache for PostgREST
NOTIFY pgrst, 'reload schema';
