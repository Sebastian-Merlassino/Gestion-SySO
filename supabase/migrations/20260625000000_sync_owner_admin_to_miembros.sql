-- Migration: Sincronizar perfiles de dueños y administradores con miembros_equipo
-- File: supabase/migrations/20260625000000_sync_owner_admin_to_miembros.sql

-- 1. Actualizar la función de sincronización de perfiles a miembros
CREATE OR REPLACE FUNCTION public.sync_profile_to_miembro()
RETURNS TRIGGER AS $$
BEGIN
  -- Si el perfil tiene asignado un tenant, pertenece a roles de administración/dueño y tiene completo el onboarding
  IF NEW.tenant_id IS NOT NULL 
     AND NEW.role IN ('owner', 'admin') 
     AND NEW.full_name IS NOT NULL 
     AND NEW.cuit IS NOT NULL 
     AND NEW.phone IS NOT NULL 
     AND NEW.birth_date IS NOT NULL 
     AND NEW.provincia IS NOT NULL 
     AND NEW.departamento_partido IS NOT NULL THEN
     
    IF EXISTS (SELECT 1 FROM public.miembros_equipo WHERE profile_id = NEW.id) THEN
      UPDATE public.miembros_equipo
      SET 
        full_name = NEW.full_name,
        email = NEW.email,
        cuit = NEW.cuit,
        phone = NEW.phone,
        birth_date = NEW.birth_date,
        provincia = NEW.provincia,
        partido = NEW.departamento_partido, -- Sync to miembros_equipo.partido from profiles.departamento_partido
        localidad = NEW.localidad,
        tiene_acceso = TRUE,
        tenant_id = NEW.tenant_id,
        signature_url = NEW.signature_url,
        updated_at = timezone('utc'::text, now())
      WHERE profile_id = NEW.id;
    ELSE
      INSERT INTO public.miembros_equipo (
        tenant_id, 
        full_name, 
        email, 
        cuit, 
        phone, 
        birth_date, 
        provincia, 
        partido, -- miembros_equipo.partido
        localidad, 
        tiene_acceso, 
        profile_id, 
        signature_url
      ) VALUES (
        NEW.tenant_id, 
        NEW.full_name, 
        NEW.email, 
        NEW.cuit, 
        NEW.phone, 
        NEW.birth_date, 
        NEW.provincia, 
        NEW.departamento_partido, -- Sync from profiles.departamento_partido
        NEW.localidad, 
        TRUE, 
        NEW.id, 
        NEW.signature_url
      );
    END IF;
  ELSE
    -- Para otros roles o si los datos de onboarding están incompletos, actualizamos el miembro existente si existe
    UPDATE public.miembros_equipo
    SET 
      full_name = NEW.full_name,
      email = NEW.email,
      phone = COALESCE(NEW.phone, phone),
      cuit = COALESCE(NEW.cuit, cuit),
      birth_date = COALESCE(NEW.birth_date, birth_date),
      provincia = COALESCE(NEW.provincia, provincia),
      partido = COALESCE(NEW.departamento_partido, partido),
      localidad = NEW.localidad,
      signature_url = NEW.signature_url,
      updated_at = timezone('utc'::text, now())
    WHERE profile_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Ejecutar la sincronización inicial para los perfiles owner/admin existentes que completaron onboarding
INSERT INTO public.miembros_equipo (
  tenant_id, 
  full_name, 
  email, 
  cuit, 
  phone, 
  birth_date, 
  provincia, 
  partido, -- miembros_equipo.partido
  localidad, 
  tiene_acceso, 
  profile_id, 
  signature_url
)
SELECT 
  p.tenant_id, 
  p.full_name, 
  p.email, 
  p.cuit, 
  p.phone, 
  p.birth_date, 
  p.provincia, 
  p.departamento_partido, -- profiles.departamento_partido
  p.localidad, 
  TRUE, 
  p.id, 
  p.signature_url
FROM public.profiles p
WHERE p.tenant_id IS NOT NULL 
  AND p.role IN ('owner', 'admin')
  AND p.full_name IS NOT NULL
  AND p.cuit IS NOT NULL
  AND p.phone IS NOT NULL
  AND p.birth_date IS NOT NULL
  AND p.provincia IS NOT NULL
  AND p.departamento_partido IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.miembros_equipo me WHERE me.profile_id = p.id
  );

-- 3. Recargar el cache del esquema
NOTIFY pgrst, 'reload schema';
