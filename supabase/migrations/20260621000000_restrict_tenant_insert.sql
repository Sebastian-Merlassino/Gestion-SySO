-- 20260621000000_restrict_tenant_insert.sql
-- Restringir la creación de Tenants en Supabase

-- Eliminar políticas previas si existiesen
DROP POLICY IF EXISTS tenant_insert_onboarding ON public.tenants;
DROP POLICY IF EXISTS tenant_isolation_insert ON public.tenants;

-- Crear política de INSERT para usuarios autenticados sin tenant
CREATE POLICY tenant_insert_onboarding ON public.tenants
    FOR INSERT TO authenticated
    WITH CHECK (
      NOT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND tenant_id IS NOT NULL
      )
    );
