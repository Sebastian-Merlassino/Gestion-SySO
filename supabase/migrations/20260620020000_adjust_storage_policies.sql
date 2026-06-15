-- Migration: Adjust storage policies for signatures and documents to support multi-tenant management
-- File: supabase/migrations/20260620020000_adjust_storage_policies.sql

-- 1. Crear función de validación de acceso multi-tenant a storage
CREATE OR REPLACE FUNCTION public.can_access_member_asset(bucket_id text, object_path text)
RETURNS boolean AS $$
DECLARE
  first_folder text;
  caller_tenant_id uuid;
  target_profile_tenant_id uuid;
  target_member_tenant_id uuid;
BEGIN
  -- Obtener el primer nivel de la ruta del archivo (nombre de la carpeta)
  first_folder := (storage.foldername(object_path))[1];
  
  -- Obtener el tenant_id del usuario logueado
  SELECT tenant_id INTO caller_tenant_id FROM public.profiles WHERE id = auth.uid();
  IF caller_tenant_id IS NULL THEN
    RETURN false;
  END IF;

  -- Si la carpeta es igual a su propio UID, permitir
  IF first_folder = auth.uid()::text THEN
    RETURN true;
  END IF;

  -- Si es un UUID válido, puede ser un profile_id o un miembro_id
  IF first_folder ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    -- Verificar si es profile_id del mismo tenant
    SELECT tenant_id INTO target_profile_tenant_id FROM public.profiles WHERE id = first_folder::uuid;
    IF target_profile_tenant_id = caller_tenant_id THEN
      RETURN true;
    END IF;
    
    -- Verificar si es miembro_id del mismo tenant
    SELECT tenant_id INTO target_member_tenant_id FROM public.miembros_equipo WHERE id = first_folder::uuid;
    IF target_member_tenant_id = caller_tenant_id THEN
      RETURN true;
    END IF;
  END IF;

  -- Si empieza con 'sin-acceso-', extraer el UUID del miembro de equipo
  IF first_folder LIKE 'sin-acceso-%' THEN
    DECLARE
      member_uuid_text text;
    BEGIN
      member_uuid_text := substring(first_folder from 12);
      IF member_uuid_text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        SELECT tenant_id INTO target_member_tenant_id FROM public.miembros_equipo WHERE id = member_uuid_text::uuid;
        IF target_member_tenant_id = caller_tenant_id THEN
          RETURN true;
        END IF;
      END IF;
    END;
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Eliminar políticas antiguas para 'signatures' y 'documents'
DROP POLICY IF EXISTS "Permitir subir firmas propias" ON storage.objects;
DROP POLICY IF EXISTS "Permitir ver firmas propias" ON storage.objects;
DROP POLICY IF EXISTS "Permitir borrar firmas propias" ON storage.objects;
DROP POLICY IF EXISTS "Permitir administrar documentos propios" ON storage.objects;

-- 3. Crear nuevas políticas basadas en la función de acceso multi-tenant
-- bucket 'signatures'
CREATE POLICY "Permitir subir firmas miembro" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'signatures' AND public.can_access_member_asset(bucket_id, name));

CREATE POLICY "Permitir ver firmas miembro" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'signatures' AND public.can_access_member_asset(bucket_id, name));

CREATE POLICY "Permitir borrar firmas miembro" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'signatures' AND public.can_access_member_asset(bucket_id, name));

-- bucket 'documents'
CREATE POLICY "Permitir administrar documentos miembro" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'documents' AND public.can_access_member_asset(bucket_id, name))
  WITH CHECK (bucket_id = 'documents' AND public.can_access_member_asset(bucket_id, name));
