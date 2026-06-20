-- Migration: Soporte para accesos multi-tenant flexibles y eliminación de cuenta
-- File: supabase/migrations/20260628000000_multi_tenant_access.sql

-- 1. Crear función para comprobar acceso del usuario a un tenant
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Actualizar políticas de tenants
DROP POLICY IF EXISTS tenant_isolation_select ON public.tenants;
CREATE POLICY tenant_isolation_select ON public.tenants
    FOR SELECT TO authenticated USING (public.user_has_tenant_access(id));

DROP POLICY IF EXISTS tenant_isolation_update ON public.tenants;
CREATE POLICY tenant_isolation_update ON public.tenants
    FOR UPDATE TO authenticated USING (public.user_has_tenant_access(id)) WITH CHECK (public.user_has_tenant_access(id));

-- 3. Actualizar políticas de profiles
DROP POLICY IF EXISTS profile_isolation_select ON public.profiles;
CREATE POLICY profile_isolation_select ON public.profiles
    FOR SELECT TO authenticated USING (public.user_has_tenant_access(tenant_id) OR id = auth.uid());

-- 4. Actualizar políticas de audits
DROP POLICY IF EXISTS audit_tenant_isolation ON public.audits;
CREATE POLICY audit_tenant_isolation ON public.audits
    FOR ALL TO authenticated USING (public.user_has_tenant_access(tenant_id)) WITH CHECK (public.user_has_tenant_access(tenant_id));

-- 5. Actualizar políticas de empresas
DROP POLICY IF EXISTS empresas_tenant_isolation ON public.empresas;
CREATE POLICY empresas_tenant_isolation ON public.empresas
    FOR ALL TO authenticated USING (public.user_has_tenant_access(tenant_id)) WITH CHECK (public.user_has_tenant_access(tenant_id));

-- 6. Actualizar políticas de establecimientos
DROP POLICY IF EXISTS establecimientos_tenant_isolation ON public.establecimientos;
CREATE POLICY establecimientos_tenant_isolation ON public.establecimientos
    FOR ALL TO authenticated USING (public.user_has_tenant_access(tenant_id)) WITH CHECK (public.user_has_tenant_access(tenant_id));

-- 7. Actualizar políticas de miembros_equipo
DROP POLICY IF EXISTS equipo_tenant_select ON public.miembros_equipo;
CREATE POLICY equipo_tenant_select ON public.miembros_equipo
    FOR SELECT TO authenticated USING (public.user_has_tenant_access(tenant_id));

DROP POLICY IF EXISTS equipo_tenant_write ON public.miembros_equipo;
CREATE POLICY equipo_tenant_write ON public.miembros_equipo
    FOR ALL TO authenticated USING (public.user_has_tenant_access(tenant_id) AND public.is_owner_or_admin(auth.uid())) WITH CHECK (public.user_has_tenant_access(tenant_id) AND public.is_owner_or_admin(auth.uid()));

-- 8. Actualizar políticas de matriculas
DROP POLICY IF EXISTS matriculas_tenant_select ON public.matriculas;
CREATE POLICY matriculas_tenant_select ON public.matriculas FOR SELECT TO authenticated 
    USING (profile_id = auth.uid() OR miembro_id IN (SELECT id FROM public.miembros_equipo WHERE public.user_has_tenant_access(tenant_id)));

DROP POLICY IF EXISTS matriculas_tenant_insert ON public.matriculas;
CREATE POLICY matriculas_tenant_insert ON public.matriculas FOR INSERT TO authenticated
    WITH CHECK (
      profile_id = auth.uid() 
      OR (
        miembro_id IN (SELECT id FROM public.miembros_equipo WHERE public.user_has_tenant_access(tenant_id))
        AND public.is_owner_or_admin(auth.uid())
      )
    );

DROP POLICY IF EXISTS matriculas_tenant_update ON public.matriculas;
CREATE POLICY matriculas_tenant_update ON public.matriculas FOR UPDATE TO authenticated
    USING (
      profile_id = auth.uid() 
      OR (
        miembro_id IN (SELECT id FROM public.miembros_equipo WHERE public.user_has_tenant_access(tenant_id))
        AND public.is_owner_or_admin(auth.uid())
      )
    )
    WITH CHECK (
      profile_id = auth.uid() 
      OR (
        miembro_id IN (SELECT id FROM public.miembros_equipo WHERE public.user_has_tenant_access(tenant_id))
        AND public.is_owner_or_admin(auth.uid())
      )
    );

DROP POLICY IF EXISTS matriculas_tenant_delete ON public.matriculas;
CREATE POLICY matriculas_tenant_delete ON public.matriculas FOR DELETE TO authenticated
    USING (
      profile_id = auth.uid() 
      OR (
        miembro_id IN (SELECT id FROM public.miembros_equipo WHERE public.user_has_tenant_access(tenant_id))
        AND public.is_owner_or_admin(auth.uid())
      )
    );

-- 9. Actualizar políticas de programa_anual
DROP POLICY IF EXISTS programa_anual_tenant_isolation ON public.programa_anual;
CREATE POLICY programa_anual_tenant_isolation ON public.programa_anual
    FOR ALL TO authenticated USING (public.user_has_tenant_access(tenant_id)) WITH CHECK (public.user_has_tenant_access(tenant_id));

-- 10. Actualizar políticas de acciones_correctivas
DROP POLICY IF EXISTS acciones_correctivas_tenant_isolation ON public.acciones_correctivas;
CREATE POLICY acciones_correctivas_tenant_isolation ON public.acciones_correctivas
    FOR ALL TO authenticated USING (public.user_has_tenant_access(tenant_id)) WITH CHECK (public.user_has_tenant_access(tenant_id));

-- 11. Actualizar políticas de programa_capacitacion
DROP POLICY IF EXISTS programa_capacitacion_tenant_isolation ON public.programa_capacitacion;
CREATE POLICY programa_capacitacion_tenant_isolation ON public.programa_capacitacion
    FOR ALL TO authenticated USING (public.user_has_tenant_access(tenant_id)) WITH CHECK (public.user_has_tenant_access(tenant_id));

-- 12. Actualizar políticas de extintores
DROP POLICY IF EXISTS extintores_tenant_isolation ON public.extintores;
CREATE POLICY extintores_tenant_isolation ON public.extintores
    FOR ALL TO authenticated USING (public.user_has_tenant_access(tenant_id)) WITH CHECK (public.user_has_tenant_access(tenant_id));

-- 13. Actualizar función can_access_member_asset para utilizar user_has_tenant_access
CREATE OR REPLACE FUNCTION public.can_access_member_asset(bucket_id text, object_path text)
RETURNS boolean AS $$
DECLARE
  first_folder text;
  target_profile_tenant_id uuid;
  target_member_tenant_id uuid;
BEGIN
  first_folder := (storage.foldername(object_path))[1];
  
  IF first_folder = auth.uid()::text THEN
    RETURN true;
  END IF;

  IF first_folder ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    SELECT tenant_id INTO target_profile_tenant_id FROM public.profiles WHERE id = first_folder::uuid;
    IF target_profile_tenant_id IS NOT NULL AND public.user_has_tenant_access(target_profile_tenant_id) THEN
      RETURN true;
    END IF;
    
    SELECT tenant_id INTO target_member_tenant_id FROM public.miembros_equipo WHERE id = first_folder::uuid;
    IF target_member_tenant_id IS NOT NULL AND public.user_has_tenant_access(target_member_tenant_id) THEN
      RETURN true;
    END IF;
  END IF;

  IF first_folder LIKE 'sin-acceso-%' THEN
    DECLARE
      member_uuid_text text;
    BEGIN
      member_uuid_text := substring(first_folder from 12);
      IF member_uuid_text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        SELECT tenant_id INTO target_member_tenant_id FROM public.miembros_equipo WHERE id = member_uuid_text::uuid;
        IF target_member_tenant_id IS NOT NULL AND public.user_has_tenant_access(target_member_tenant_id) THEN
          RETURN true;
        END IF;
      END IF;
    END;
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 14. Actualizar políticas de bucket de logos
DROP POLICY IF EXISTS "Permitir subir logos de empresa" ON storage.objects;
CREATE POLICY "Permitir subir logos de empresa" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'logos' 
    AND (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    AND public.user_has_tenant_access((storage.foldername(name))[1]::UUID)
  );

DROP POLICY IF EXISTS "Permitir actualizar/borrar logos de empresa" ON storage.objects;
CREATE POLICY "Permitir actualizar/borrar logos de empresa" ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'logos' 
    AND (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    AND public.user_has_tenant_access((storage.foldername(name))[1]::UUID)
  );

-- 15. Crear la función para eliminar cuenta propia
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
        DELETE FROM public.tenants WHERE id = v_tenant_id;
    END IF;

    DELETE FROM auth.users WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
