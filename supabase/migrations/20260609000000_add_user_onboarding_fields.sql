-- 20260609000000_add_user_onboarding_fields.sql
-- Migración para añadir campos de onboarding de usuario, matrícula, carga de imágenes y planes de suscripción

-- 1. Extender la tabla public.profiles con campos de perfil profesional y matrícula
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS birth_date DATE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS provincia VARCHAR(255);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS localidad VARCHAR(255);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cuit VARCHAR(11) CONSTRAINT cuit_numeric_length_check CHECK (cuit ~ '^\d{11}$');
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS signature_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS matricula_institucion VARCHAR(255);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS matricula_numero VARCHAR(100);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS matricula_vencimiento DATE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS matricula_foto_frente_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS matricula_foto_dorso_url TEXT;

-- 2. Extender la tabla public.tenants con campos de identidad corporativa y planes
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS logo_1_url TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS logo_2_url TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS plan_id VARCHAR(50) DEFAULT 'trial' CONSTRAINT plan_check CHECK (plan_id IN ('trial', 'basic', 'premium'));
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + INTERVAL '15 days');

-- 3. Crear función y trigger para creación automática de perfiles en el registro (Sign Up)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    new.id, 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'full_name', ''), 
    COALESCE(new.raw_user_meta_data->>'role', 'owner')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Eliminar trigger si ya existe para evitar errores de duplicado
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =======================================================
-- CONFIGURACIÓN DE BUCKETS DE ALMACENAMIENTO (STORAGE)
-- =======================================================

-- Asegurarse de que existan los buckets de almacenamiento
INSERT INTO storage.buckets (id, name, public) 
VALUES 
  ('signatures', 'signatures', false),
  ('logos', 'logos', true),
  ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- Habilitar RLS en storage.objects (Comentado para evitar error de propiedad de tabla en local)
-- ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- =======================================================
-- POLÍTICAS DE ACCESO PARA STORAGE (MULTITENANT & USER SAFE)
-- =======================================================

-- 1. Políticas para el bucket 'signatures' (Privado)
-- Un usuario autenticado puede subir y administrar su propia firma. El path debe empezar con su auth.uid()
CREATE POLICY "Permitir subir firmas propias" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'signatures' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Permitir ver firmas propias" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'signatures' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Permitir borrar firmas propias" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'signatures' AND (storage.foldername(name))[1] = auth.uid()::text);


-- 2. Políticas para el bucket 'logos' (Público)
-- Cualquiera puede leer logos (es público, necesario para facturación, emails e informes externos)
CREATE POLICY "Permitir lectura publica de logos" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'logos');

-- Solo miembros del tenant pueden subir y modificar logos corporativos. El path debe empezar con el tenant_id.
CREATE POLICY "Permitir subir logos de empresa" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'logos' 
    AND (storage.foldername(name))[1] = (SELECT tenant_id::text FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Permitir actualizar/borrar logos de empresa" ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'logos' 
    AND (storage.foldername(name))[1] = (SELECT tenant_id::text FROM public.profiles WHERE id = auth.uid())
  );


-- 3. Políticas para el bucket 'documents' (Privado - Matrículas y Credenciales)
-- Un usuario autenticado solo puede administrar sus propios documentos de matrícula (frente/dorso). El path empieza con su auth.uid()
CREATE POLICY "Permitir administrar documentos propios" ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'documents' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'documents' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
