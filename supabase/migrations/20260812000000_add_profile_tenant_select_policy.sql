-- Migration: Add SELECT policy to public.profiles to allow tenant members to view profiles within the same tenant.
-- File: supabase/migrations/20260812000000_add_profile_tenant_select_policy.sql

-- Drop the policy if it already exists
DROP POLICY IF EXISTS profile_tenant_select ON public.profiles;

-- Create the SELECT policy based on the get_current_tenant_id() helper
CREATE POLICY profile_tenant_select ON public.profiles
    FOR SELECT
    USING (tenant_id = public.get_current_tenant_id());

-- Reload Schema Cache
NOTIFY pgrst, 'reload schema';
