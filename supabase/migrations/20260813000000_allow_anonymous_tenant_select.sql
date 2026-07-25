-- Description: Adjust tenants SELECT policy to allow public access so anonymous users can load branding assets (logo, name, colors) on the login page.
DROP POLICY IF EXISTS tenant_isolation_select ON public.tenants;
CREATE POLICY tenant_isolation_select ON public.tenants
    FOR SELECT TO public USING (true);
