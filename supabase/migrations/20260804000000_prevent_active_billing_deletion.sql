-- Migration: Prevent deleting accounts/tenants with an active paid Mercado Pago subscription (SEC-013)
-- File: supabase/migrations/20260804000000_prevent_active_billing_deletion.sql

CREATE OR REPLACE FUNCTION public.delete_own_account()
RETURNS void AS $$
DECLARE
    v_tenant_id UUID;
    v_role TEXT;
    v_plan_id VARCHAR;
    v_plan_ends_at TIMESTAMP WITH TIME ZONE;
BEGIN
    SELECT tenant_id, role INTO v_tenant_id, v_role
    FROM public.profiles
    WHERE id = auth.uid();

    IF v_role = 'admin' AND v_tenant_id IS NOT NULL THEN
        -- Obtener detalles del plan
        SELECT plan_id, plan_ends_at INTO v_plan_id, v_plan_ends_at
        FROM public.tenants
        WHERE id = v_tenant_id;

        -- Bloquear la auto-eliminación si hay un plan pago activo (MED-03)
        IF v_plan_id != 'free' AND v_plan_ends_at > now() THEN
            RAISE EXCEPTION 'No se puede eliminar la cuenta: Tienes una suscripción de Mercado Pago activa. Cancela la suscripción en el panel de facturación antes de proceder.';
        END IF;

        -- Borrar todos los usuarios asociados al tenant en auth.users para evitar cuentas huérfanas
        DELETE FROM auth.users 
        WHERE id IN (
            SELECT id 
            FROM public.profiles 
            WHERE tenant_id = v_tenant_id
        );
        
        -- Borrar el tenant (que cascadea a perfiles y otros registros)
        DELETE FROM public.tenants WHERE id = v_tenant_id;
    ELSE
        -- Si no es owner, solo borrar su propia cuenta de auth.users (la cascada borrará su perfil)
        DELETE FROM auth.users WHERE id = auth.uid();
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recargar la caché de PostgREST
NOTIFY pgrst, 'reload schema';
