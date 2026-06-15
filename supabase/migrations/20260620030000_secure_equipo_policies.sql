-- Migration: Secure equipo policies and matriculas for tenant users and roles
-- File: supabase/migrations/20260620030000_secure_equipo_policies.sql

-- 1. Crear función helper para validar si el usuario es owner o admin
CREATE OR REPLACE FUNCTION public.is_owner_or_admin(user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_id AND role IN ('owner', 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Refinar políticas de RLS en miembros_equipo
DROP POLICY IF EXISTS equipo_tenant_isolation ON public.miembros_equipo;
DROP POLICY IF EXISTS equipo_tenant_select ON public.miembros_equipo;
DROP POLICY IF EXISTS equipo_tenant_write ON public.miembros_equipo;

-- Lectura para todos los del tenant (necesario para ver compañeros/asignar)
CREATE POLICY equipo_tenant_select ON public.miembros_equipo
    FOR SELECT TO authenticated
    USING (tenant_id = public.get_current_tenant_id());

-- Escritura (INSERT, UPDATE, DELETE) SOLO para owners/admins del mismo tenant
CREATE POLICY equipo_tenant_write ON public.miembros_equipo
    FOR ALL TO authenticated
    USING (tenant_id = public.get_current_tenant_id() AND public.is_owner_or_admin(auth.uid()))
    WITH CHECK (tenant_id = public.get_current_tenant_id() AND public.is_owner_or_admin(auth.uid()));

-- 3. Refinar políticas de RLS en matriculas
DROP POLICY IF EXISTS matriculas_tenant_select ON public.matriculas;
DROP POLICY IF EXISTS matriculas_tenant_insert ON public.matriculas;
DROP POLICY IF EXISTS matriculas_tenant_update ON public.matriculas;
DROP POLICY IF EXISTS matriculas_tenant_delete ON public.matriculas;

-- Lectura de matriculas para uno mismo O para cualquier miembro del mismo tenant
CREATE POLICY matriculas_tenant_select ON public.matriculas FOR SELECT TO authenticated 
    USING (profile_id = auth.uid() OR miembro_id IN (SELECT id FROM public.miembros_equipo WHERE tenant_id = public.get_current_tenant_id()));

-- Permitir insertar si es propia O si es owner/admin del tenant
CREATE POLICY matriculas_tenant_insert ON public.matriculas
    FOR INSERT TO authenticated
    WITH CHECK (
      profile_id = auth.uid() 
      OR (
        miembro_id IN (SELECT id FROM public.miembros_equipo WHERE tenant_id = public.get_current_tenant_id())
        AND public.is_owner_or_admin(auth.uid())
      )
    );

-- Permitir actualizar si es propia O si es owner/admin del tenant
CREATE POLICY matriculas_tenant_update ON public.matriculas
    FOR UPDATE TO authenticated
    USING (
      profile_id = auth.uid() 
      OR (
        miembro_id IN (SELECT id FROM public.miembros_equipo WHERE tenant_id = public.get_current_tenant_id())
        AND public.is_owner_or_admin(auth.uid())
      )
    )
    WITH CHECK (
      profile_id = auth.uid() 
      OR (
        miembro_id IN (SELECT id FROM public.miembros_equipo WHERE tenant_id = public.get_current_tenant_id())
        AND public.is_owner_or_admin(auth.uid())
      )
    );

-- Permitir eliminar si es propia O si es owner/admin del tenant
CREATE POLICY matriculas_tenant_delete ON public.matriculas
    FOR DELETE TO authenticated
    USING (
      profile_id = auth.uid() 
      OR (
        miembro_id IN (SELECT id FROM public.miembros_equipo WHERE tenant_id = public.get_current_tenant_id())
        AND public.is_owner_or_admin(auth.uid())
      )
    );

-- Recargar el cache del esquema
NOTIFY pgrst, 'reload schema';
