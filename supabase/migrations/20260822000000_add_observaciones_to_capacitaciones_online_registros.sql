-- supabase/migrations/20260822000000_add_observaciones_to_capacitaciones_online_registros.sql
-- Incorporar columna observaciones en capacitaciones_online_registros y actualizar RPC registrar_asistencia_capacitacion

-- 1. Agregar columna observaciones a public.capacitaciones_online_registros
ALTER TABLE public.capacitaciones_online_registros 
ADD COLUMN IF NOT EXISTS observaciones TEXT;

-- 2. Eliminar firma antigua de la función RPC para evitar conflictos de sobrecarga
DROP FUNCTION IF EXISTS public.registrar_asistencia_capacitacion(UUID, TEXT, TEXT, TEXT, TEXT);

-- 3. Crear versión actualizada de la RPC registrar_asistencia_capacitacion con p_observaciones
CREATE OR REPLACE FUNCTION public.registrar_asistencia_capacitacion(
  p_token UUID,
  p_nombre TEXT,
  p_dni TEXT,
  p_puesto TEXT,
  p_firma TEXT,
  p_observaciones TEXT DEFAULT NULL
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
    RETURN jsonb_build_object('success', false, 'error', 'Todos los campos obligatorios y la firma son requeridos.');
  END IF;

  -- Obtener la capacitación asociada al token
  SELECT id, tenant_id, estado
  INTO v_cap
  FROM public.capacitaciones_online
  WHERE access_token = p_token AND estado = 'activa';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'La capacitación no está activa o el enlace ha caducado.');
  END IF;

  -- Insertar el registro de asistencia con tenant_id asignado server-side y campo observaciones
  INSERT INTO public.capacitaciones_online_registros (
    tenant_id,
    capacitacion_id,
    nombre_apellido,
    dni,
    puesto,
    firma_url,
    observaciones
  ) VALUES (
    v_cap.tenant_id,
    v_cap.id,
    trim(p_nombre),
    trim(p_dni),
    trim(p_puesto),
    p_firma,
    NULLIF(trim(p_observaciones), '')
  ) RETURNING id INTO v_registro_id;

  RETURN jsonb_build_object(
    'success', true,
    'registro_id', v_registro_id,
    'message', 'Asistencia a capacitación registrada con éxito.'
  );
END;
$$;

-- Otorgar permisos de ejecución a los roles anónimos y autenticados
GRANT EXECUTE ON FUNCTION public.registrar_asistencia_capacitacion(UUID, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated, service_role;
