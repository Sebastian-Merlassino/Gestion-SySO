-- Migration: Fix delete_own_account RPC execution and check_profile_updates trigger permissions
-- File: supabase/migrations/20260830000000_fix_delete_own_account_trigger.sql

-- 1. Actualizar check_profile_updates() para permitir ejecuciones de current_user = 'postgres' (SECURITY DEFINER / DB Admin)
CREATE OR REPLACE FUNCTION public.check_profile_updates()
RETURNS TRIGGER AS $$
BEGIN
    -- Permitir actualizaciones si las ejecuta postgres (triggers/funciones SECURITY DEFINER) o service_role
    IF current_user = 'postgres' OR auth.role() = 'service_role' THEN
        RETURN NEW;
    END IF;

    -- Determinar si estamos en flujo de onboarding (tenant_id pasa de NULL a un valor)
    -- En este caso, se permite también el cambio de role (miembro → admin)
    IF OLD.tenant_id IS NULL AND NEW.tenant_id IS NOT NULL THEN
        -- Permitir asignación inicial de tenant_id y role durante onboarding
        -- Solo verificar que empresa_id no cambie de un valor existente a otro
        IF NEW.empresa_id IS DISTINCT FROM OLD.empresa_id AND OLD.empresa_id IS NOT NULL THEN
            RAISE EXCEPTION 'Operación no permitida: No puedes modificar tu asociación de empresa (empresa_id).';
        END IF;
        RETURN NEW;
    END IF;

    -- Bloquear cambios de rol (fuera del flujo de onboarding)
    IF NEW.role IS DISTINCT FROM OLD.role THEN
        RAISE EXCEPTION 'Operación no permitida: No puedes modificar tu propio rol de usuario.';
    END IF;
    
    -- Bloquear cambios de tenant_id (de un valor a otro diferente)
    IF NEW.tenant_id IS DISTINCT FROM OLD.tenant_id THEN
        RAISE EXCEPTION 'Operación no permitida: No puedes modificar tu vinculación de organización (tenant_id).';
    END IF;

    -- Bloquear cambios de empresa_id (de un valor existente a otro)
    IF NEW.empresa_id IS DISTINCT FROM OLD.empresa_id THEN
        IF OLD.empresa_id IS NOT NULL THEN
            RAISE EXCEPTION 'Operación no permitida: No puedes modificar tu asociación de empresa (empresa_id).';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. Actualizar delete_own_account() para eliminar explícitamente perfiles y contemplar roles admin/owner
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

    IF v_role IN ('admin', 'owner') AND v_tenant_id IS NOT NULL THEN
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
        
        -- Borrar explícitamente los perfiles restantes del tenant
        DELETE FROM public.profiles WHERE tenant_id = v_tenant_id;

        -- Borrar el tenant (que cascadea a los demás registros asociados)
        DELETE FROM public.tenants WHERE id = v_tenant_id;
    ELSE
        -- Si no es admin u owner, solo borrar su propia cuenta de auth.users (la cascada borrará su perfil)
        DELETE FROM auth.users WHERE id = auth.uid();
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recargar la caché de PostgREST
NOTIFY pgrst, 'reload schema';
