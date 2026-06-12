-- 20260612010000_adjust_tenant_select_policy.sql
-- Ajustar la política de SELECT en la tabla tenants para evitar violaciones de RLS durante la creación del Tenant (Onboarding).
-- Permite que los metadatos de los tenants (nombre, slug, logos) sean consultados públicamente, lo cual es necesario para:
-- 1. Recuperar el Tenant en el login/dashboard mediante su slug.
-- 2. Mostrar logos de empresa en reportes públicos.
-- Las políticas de INSERT (solo usuarios autenticados) y UPDATE (solo miembros del tenant) permanecen estrictamente protegidas.

DROP POLICY IF EXISTS tenant_isolation_select ON public.tenants;

CREATE POLICY tenant_isolation_select ON public.tenants
    FOR SELECT
    TO public
    USING (true);
