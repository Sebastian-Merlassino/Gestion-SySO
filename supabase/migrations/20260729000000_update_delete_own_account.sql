-- Migration: Update delete_own_account function to delete all tenant members from auth.users to prevent orphaned accounts
-- File: supabase/migrations/20260729000000_update_delete_own_account.sql

CREATE OR REPLACE FUNCTION public.delete_own_account()
RETURNS void AS $$
DECLARE
    v_tenant_id UUID;
    v_role TEXT;
BEGIN
    SELECT tenant_id, role INTO v_tenant_id, v_role
    FROM public.profiles
    WHERE id = auth.uid();

    IF v_role = 'owner' AND v_tenant_id IS NOT NULL THEN
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
