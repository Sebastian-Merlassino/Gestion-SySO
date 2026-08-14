-- Migration: Optimización de funciones RLS declarando STABLE para re-uso de caché dentro de la transacción SQL
-- File: supabase/migrations/20260828000000_optimize_rls_functions_stable.sql

CREATE OR REPLACE FUNCTION public.get_current_tenant_id()
RETURNS UUID AS $$
BEGIN
    RETURN (
        SELECT tenant_id 
        FROM public.profiles 
        WHERE id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.user_has_tenant_access(p_tenant_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND tenant_id = p_tenant_id
        )
        OR
        EXISTS (
            SELECT 1 FROM public.miembros_equipo 
            WHERE (profile_id = auth.uid() OR email = (SELECT email FROM public.profiles WHERE id = auth.uid())) 
              AND tenant_id = p_tenant_id 
              AND tiene_acceso = true
        )
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
