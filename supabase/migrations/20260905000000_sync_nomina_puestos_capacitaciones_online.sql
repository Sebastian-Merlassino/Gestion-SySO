-- Migration: Sincronización dinámica de nómina de personal por puesto en capacitaciones online
-- File: supabase/migrations/20260905000000_sync_nomina_puestos_capacitaciones_online.sql

CREATE OR REPLACE FUNCTION public.get_capacitacion_publica(p_token UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cap RECORD;
  v_empleados JSONB;
BEGIN
  -- Buscar capacitación activa por token
  SELECT c.*, 
         e.razon_social AS empresa_nombre, 
         est.denominacion AS establecimiento_nombre,
         COALESCE(t.logo_1_url, t.logo_2_url) AS tenant_logo_url
  INTO v_cap
  FROM public.capacitaciones_online c
  LEFT JOIN public.empresas e ON e.id = c.empresa_id
  LEFT JOIN public.establecimientos est ON est.id = c.establecimiento_id
  LEFT JOIN public.tenants t ON t.id = c.tenant_id
  WHERE c.access_token = p_token AND c.estado = 'activa';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Capacitación no encontrada o inactiva.');
  END IF;

  -- Determinar los empleados asignados:
  -- 1. Si la asignación es por puesto, buscar dinámicamente en nomina_personal los trabajadores de la empresa/establecimiento con los puestos asignados.
  -- 2. Si la asignación es por nómina específica, retornar la lista prefijada en empleados_asignados.
  IF v_cap.asignacion_tipo = 'puesto' OR v_cap.asignacion_tipo IS NULL THEN
    SELECT COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', np.id,
          'nombre_apellido', np.nombre_apellido,
          'cuil', np.cuil,
          'puesto', np.puesto
        ) ORDER BY np.nombre_apellido ASC
      ),
      '[]'::jsonb
    )
    INTO v_empleados
    FROM public.nomina_personal np
    WHERE np.tenant_id = v_cap.tenant_id
      AND np.empresa_id = v_cap.empresa_id
      AND (v_cap.establecimiento_id IS NULL OR np.establecimiento_id IS NULL OR np.establecimiento_id = v_cap.establecimiento_id)
      AND (
        v_cap.target_puesto IS NULL 
        OR TRIM(v_cap.target_puesto) = ''
        OR LOWER(TRIM(v_cap.target_puesto)) = 'todo el personal'
        OR LOWER(TRIM(np.puesto)) = ANY(
          SELECT LOWER(TRIM(x)) 
          FROM unnest(string_to_array(v_cap.target_puesto, ',')) AS x
          WHERE TRIM(x) <> ''
        )
      );

    -- Fallback: si no se encontraron en nomina_personal pero hay registros previos guardados en v_cap.empleados_asignados
    IF (v_empleados IS NULL OR jsonb_array_length(v_empleados) = 0) AND v_cap.empleados_asignados IS NOT NULL AND jsonb_array_length(v_cap.empleados_asignados) > 0 THEN
      v_empleados := v_cap.empleados_asignados;
    END IF;
  ELSE
    v_empleados := COALESCE(v_cap.empleados_asignados, '[]'::jsonb);
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'id', v_cap.id,
    'tenant_id', v_cap.tenant_id,
    'titulo', v_cap.titulo,
    'descripcion', v_cap.descripcion,
    'asignacion_tipo', v_cap.asignacion_tipo,
    'target_puesto', v_cap.target_puesto,
    'empleados_asignados', v_empleados,
    'material_tipo', v_cap.material_tipo,
    'video_url', v_cap.video_url,
    'document_url', v_cap.document_url,
    'empresa_nombre', COALESCE(v_cap.empresa_nombre, 'Gestión SySO'),
    'establecimiento_nombre', v_cap.establecimiento_nombre,
    'tenant_logo_url', v_cap.tenant_logo_url
  );
END;
$$;

-- Otorgar permisos de ejecución para roles anónimos, autenticados y de servicio
GRANT EXECUTE ON FUNCTION public.get_capacitacion_publica(UUID) TO anon, authenticated, service_role;
