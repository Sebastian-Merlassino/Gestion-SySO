-- supabase/migrations/20260820000000_add_capacitaciones_online.sql
-- Módulo de Capacitaciones Online e Interactivas con Firma Digital y Acceso Público Tokenizado

-- 1. Crear tabla principal public.capacitaciones_online
CREATE TABLE IF NOT EXISTS public.capacitaciones_online (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  empresa_id UUID REFERENCES public.empresas(id) ON DELETE SET NULL,
  establecimiento_id UUID REFERENCES public.establecimientos(id) ON DELETE SET NULL,
  titulo TEXT NOT NULL,
  descripcion TEXT,
  asignacion_tipo TEXT NOT NULL DEFAULT 'puesto', -- 'puesto', 'nomina', 'general'
  target_puesto TEXT, -- ej. "Operador de Autoelevador", "Mantenimiento"
  empleados_asignados JSONB DEFAULT '[]'::jsonb, -- Lista opcional [{ id, nombre, dni, puesto }]
  material_tipo TEXT NOT NULL DEFAULT 'video', -- 'video', 'pdf', 'ppt', 'mixto'
  video_url TEXT, -- URL limpia o parsed de YouTube
  document_url TEXT, -- URL / path de PDF o PPT
  access_token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  estado TEXT NOT NULL DEFAULT 'activa', -- 'activa', 'finalizada', 'borrador'
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Crear tabla de asistencias y firmas public.capacitaciones_online_registros
CREATE TABLE IF NOT EXISTS public.capacitaciones_online_registros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  capacitacion_id UUID REFERENCES public.capacitaciones_online(id) ON DELETE CASCADE NOT NULL,
  nombre_apellido TEXT NOT NULL,
  dni TEXT NOT NULL,
  puesto TEXT NOT NULL,
  firma_url TEXT NOT NULL, -- Data URL Base64 o path de la firma
  ip_address TEXT,
  user_agent TEXT,
  registrado_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Índices para consultas de alta velocidad y RLS
CREATE INDEX IF NOT EXISTS idx_capacitaciones_online_tenant ON public.capacitaciones_online(tenant_id);
CREATE INDEX IF NOT EXISTS idx_capacitaciones_online_token ON public.capacitaciones_online(access_token);
CREATE INDEX IF NOT EXISTS idx_capacitaciones_registros_capacitacion ON public.capacitaciones_online_registros(capacitacion_id);
CREATE INDEX IF NOT EXISTS idx_capacitaciones_registros_tenant ON public.capacitaciones_online_registros(tenant_id);

-- 4. Habilitar RLS en ambas tablas
ALTER TABLE public.capacitaciones_online ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.capacitaciones_online_registros ENABLE ROW LEVEL SECURITY;

-- 5. Políticas RLS para usuarios autenticados del tenant
DROP POLICY IF EXISTS capacitaciones_online_tenant_select ON public.capacitaciones_online;
CREATE POLICY capacitaciones_online_tenant_select ON public.capacitaciones_online
  FOR SELECT USING (tenant_id = public.get_current_tenant_id());

DROP POLICY IF EXISTS capacitaciones_online_tenant_insert ON public.capacitaciones_online;
CREATE POLICY capacitaciones_online_tenant_insert ON public.capacitaciones_online
  FOR INSERT WITH CHECK (tenant_id = public.get_current_tenant_id());

DROP POLICY IF EXISTS capacitaciones_online_tenant_update ON public.capacitaciones_online;
CREATE POLICY capacitaciones_online_tenant_update ON public.capacitaciones_online
  FOR UPDATE USING (tenant_id = public.get_current_tenant_id()) WITH CHECK (tenant_id = public.get_current_tenant_id());

DROP POLICY IF EXISTS capacitaciones_online_tenant_delete ON public.capacitaciones_online;
CREATE POLICY capacitaciones_online_tenant_delete ON public.capacitaciones_online
  FOR SELECT USING (tenant_id = public.get_current_tenant_id());

-- Políticas RLS para los registros de asistencias del tenant
DROP POLICY IF EXISTS capacitaciones_registros_tenant_select ON public.capacitaciones_online_registros;
CREATE POLICY capacitaciones_registros_tenant_select ON public.capacitaciones_online_registros
  FOR SELECT USING (tenant_id = public.get_current_tenant_id());

DROP POLICY IF EXISTS capacitaciones_registros_tenant_insert ON public.capacitaciones_online_registros;
CREATE POLICY capacitaciones_registros_tenant_insert ON public.capacitaciones_online_registros
  FOR INSERT WITH CHECK (tenant_id = public.get_current_tenant_id());

DROP POLICY IF EXISTS capacitaciones_registros_tenant_delete ON public.capacitaciones_online_registros;
CREATE POLICY capacitaciones_registros_tenant_delete ON public.capacitaciones_online_registros
  FOR DELETE USING (tenant_id = public.get_current_tenant_id());

-- 6. Función RPC pública segura para obtener la capacitación sin exponer metadatos del tenant
CREATE OR REPLACE FUNCTION public.get_capacitacion_publica(p_token UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cap RECORD;
  v_empresa_nombre TEXT;
  v_res JSONB;
BEGIN
  -- Buscar capacitación activa por token
  SELECT c.*, e.razon_social AS empresa_nombre
  INTO v_cap
  FROM public.capacitaciones_online c
  LEFT JOIN public.empresas e ON e.id = c.empresa_id
  WHERE c.access_token = p_token AND c.estado = 'activa';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Capacitación no encontrada o inactiva.');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'id', v_cap.id,
    'titulo', v_cap.titulo,
    'descripcion', v_cap.descripcion,
    'asignacion_tipo', v_cap.asignacion_tipo,
    'target_puesto', v_cap.target_puesto,
    'empleados_asignados', v_cap.empleados_asignados,
    'material_tipo', v_cap.material_tipo,
    'video_url', v_cap.video_url,
    'document_url', v_cap.document_url,
    'empresa_nombre', COALESCE(v_cap.empresa_nombre, 'Gestión SySO')
  );
END;
$$;

-- Grant execute access to anon and authenticated roles
GRANT EXECUTE ON FUNCTION public.get_capacitacion_publica(UUID) TO anon, authenticated, service_role;

-- 7. Función RPC pública segura para registrar la asistencia y firma del empleado
CREATE OR REPLACE FUNCTION public.registrar_asistencia_capacitacion(
  p_token UUID,
  p_nombre TEXT,
  p_dni TEXT,
  p_puesto TEXT,
  p_firma TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cap RECORD;
  v_registro_id UUID;
BEGIN
  -- Validaciones básicas de parámetros
  IF p_token IS NULL OR trim(p_nombre) = '' OR trim(p_dni) = '' OR trim(p_puesto) = '' OR trim(p_firma) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Todos los campos y la firma son obligatorios.');
  END IF;

  -- Obtener la capacitación asociada al token
  SELECT id, tenant_id, estado
  INTO v_cap
  FROM public.capacitaciones_online
  WHERE access_token = p_token AND estado = 'activa';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'La capacitación no está activa o el enlace ha caducado.');
  END IF;

  -- Insertar el registro de asistencia con el tenant_id correspondientemente asignado server-side
  INSERT INTO public.capacitaciones_online_registros (
    tenant_id,
    capacitacion_id,
    nombre_apellido,
    dni,
    puesto,
    firma_url
  ) VALUES (
    v_cap.tenant_id,
    v_cap.id,
    trim(p_nombre),
    trim(p_dni),
    trim(p_puesto),
    p_firma
  ) RETURNING id INTO v_registro_id;

  RETURN jsonb_build_object(
    'success', true,
    'registro_id', v_registro_id,
    'message', 'Asistencia a capacitación registrada con éxito.'
  );
END;
$$;

-- Grant execute access to anon and authenticated roles
GRANT EXECUTE ON FUNCTION public.registrar_asistencia_capacitacion(UUID, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated, service_role;
