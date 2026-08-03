-- Migration: Create tables for Protocolo de Ergonomía and set up policies, permissions, and storage.
-- File: supabase/migrations/20260817000000_create_protocolo_ergonomia.sql

-- 1. Crear tabla principal: protocolos_ergonomia
CREATE TABLE IF NOT EXISTS public.protocolos_ergonomia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NULL REFERENCES public.tenants(id) ON DELETE SET NULL,

  razon_social_id UUID NULL REFERENCES public.empresas(id) ON DELETE SET NULL,
  establecimiento_id UUID NULL REFERENCES public.establecimientos(id) ON DELETE SET NULL,

  razon_social_text TEXT NULL,
  cuit_text TEXT NULL,
  establecimiento_text TEXT NULL,
  direccion_text TEXT NULL,
  provincia_text TEXT NULL,
  localidad_text TEXT NULL,
  cp_text TEXT NULL,
  horarios_turnos_text TEXT NULL,

  instrumento_marca_modelo_serie TEXT NULL,
  fecha_calibracion DATE NULL,
  metodologia_utilizada TEXT NULL,
  fecha_medicion DATE NULL,
  hora_inicio TIME NULL,
  hora_finalizacion TIME NULL,
  condiciones_atmosfericas TEXT NULL,
  documentacion_adjunta TEXT NULL,
  observaciones TEXT NULL,

  conclusiones TEXT NULL,
  recomendaciones TEXT NULL,

  firma_profesional TEXT NULL,
  profesional_nombre TEXT NULL,
  profesional_matricula TEXT NULL,
  firma_tipo TEXT NULL DEFAULT 'perfil',

  resultado_general TEXT NULL,
  pdf_url TEXT NULL,
  estado TEXT NOT NULL DEFAULT 'borrador',

  deleted_at TIMESTAMPTZ NULL,
  deleted_by UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,

  created_by UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  informacion_adicional TEXT NULL
);

-- 2. Crear tabla de puntos de muestreo para ergonomía
CREATE TABLE IF NOT EXISTS public.protocolos_ergonomia_puntos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  protocolo_id UUID NOT NULL REFERENCES public.protocolos_ergonomia(id) ON DELETE CASCADE,
  orden INTEGER NOT NULL,
  punto_muestreo INTEGER NOT NULL,

  sector_id UUID NULL,
  sector_text TEXT NULL,

  largo_m NUMERIC NULL,
  ancho_m NUMERIC NULL,
  altura_m NUMERIC NULL,

  puesto_id UUID NULL,
  puesto_text TEXT NULL,

  tipo_iluminacion TEXT NULL,
  tipo_fuente_luminica TEXT NULL,
  iluminacion TEXT NULL,

  indice_local NUMERIC NULL,
  indice_local_corregido NUMERIC NULL,
  numero_minimo_puntos_medicion NUMERIC NULL,
  cantidad_mediciones_cargadas INTEGER NULL,

  iluminancia_media NUMERIC NULL,
  iluminancia_minima NUMERIC NULL,
  uniformidad_requerida NUMERIC NULL,

  valor_uniformidad_iluminancia NUMERIC NULL,
  valor_medido_lux NUMERIC NULL,
  valor_requerido_legal_lux NUMERIC NULL,

  verificacion_uniformidad TEXT NULL,
  verificacion_legal TEXT NULL,
  resultado_punto TEXT NULL,

  observaciones_punto TEXT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Campos de ruido específicos duplicados para la correspondencia 1:1 en ergonomía
  tiempo_exposicion_hs NUMERIC NULL,
  tiempo_integracion TEXT NULL,
  caracteristicas_ruido TEXT NULL DEFAULT 'continuo_intermitente',
  nivel_pico_lc_pico_dbc NUMERIC NULL,
  tipo_carga_continuo TEXT NULL DEFAULT 'laeq',
  nivel_laeq_te_dba NUMERIC NULL,
  modo_suma_fracciones TEXT NULL DEFAULT 'directo',
  fracciones JSONB NULL,
  resultado_suma_fracciones NUMERIC NULL,
  dosis_porcentaje NUMERIC NULL
);

-- 3. Crear tabla de mediciones por punto para ergonomía
CREATE TABLE IF NOT EXISTS public.protocolos_ergonomia_mediciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  punto_id UUID NOT NULL REFERENCES public.protocolos_ergonomia_puntos(id) ON DELETE CASCADE,
  orden INTEGER NOT NULL,
  valor_lux NUMERIC NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Crear tabla de archivos adjuntos para ergonomía
CREATE TABLE IF NOT EXISTS public.protocolos_ergonomia_adjuntos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  protocolo_id UUID NOT NULL REFERENCES public.protocolos_ergonomia(id) ON DELETE CASCADE,
  tipo TEXT NULL,
  nombre_archivo TEXT NULL,
  storage_path TEXT NOT NULL,
  public_url TEXT NULL,
  original_path TEXT NULL,
  markers JSONB NULL,
  created_by UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Habilitar Row Level Security (RLS) en todas las tablas
ALTER TABLE public.protocolos_ergonomia ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.protocolos_ergonomia_puntos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.protocolos_ergonomia_mediciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.protocolos_ergonomia_adjuntos ENABLE ROW LEVEL SECURITY;

-- 6. Crear políticas RLS para protocolos_ergonomia
CREATE POLICY select_ergonomia ON public.protocolos_ergonomia
  FOR SELECT TO authenticated
  USING (
    public.user_has_tenant_access(tenant_id)
    AND (NOT public.is_client_user() OR razon_social_id = public.get_current_user_empresa_id())
    AND deleted_at IS NULL
  );

CREATE POLICY insert_ergonomia ON public.protocolos_ergonomia
  FOR INSERT TO authenticated
  WITH CHECK (
    public.user_has_tenant_access(tenant_id)
    AND (public.user_has_action_permission('protocolo_ergonomia', 'cargar') OR public.user_has_action_permission('protocolo_iluminacion', 'cargar'))
  );

CREATE POLICY update_ergonomia ON public.protocolos_ergonomia
  FOR UPDATE TO authenticated
  USING (
    public.user_has_tenant_access(tenant_id)
    AND (public.user_has_action_permission('protocolo_ergonomia', 'editar') OR public.user_has_action_permission('protocolo_iluminacion', 'editar'))
  )
  WITH CHECK (
    public.user_has_tenant_access(tenant_id)
    AND (public.user_has_action_permission('protocolo_ergonomia', 'editar') OR public.user_has_action_permission('protocolo_iluminacion', 'editar'))
  );

CREATE POLICY delete_ergonomia ON public.protocolos_ergonomia
  FOR DELETE TO authenticated
  USING (
    public.user_has_tenant_access(tenant_id)
    AND (public.user_has_action_permission('protocolo_ergonomia', 'eliminar') OR public.user_has_action_permission('protocolo_iluminacion', 'eliminar'))
  );

-- 7. Crear políticas RLS para tablas secundarias (Cascading)
-- Puntos
CREATE POLICY select_puntos ON public.protocolos_ergonomia_puntos
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.protocolos_ergonomia p
      WHERE p.id = protocolo_id AND p.deleted_at IS NULL
    )
  );

CREATE POLICY insert_puntos ON public.protocolos_ergonomia_puntos
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.protocolos_ergonomia p
      WHERE p.id = protocolo_id AND (public.user_has_action_permission('protocolo_ergonomia', 'cargar') OR public.user_has_action_permission('protocolo_iluminacion', 'cargar'))
    )
  );

CREATE POLICY update_puntos ON public.protocolos_ergonomia_puntos
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.protocolos_ergonomia p
      WHERE p.id = protocolo_id AND (public.user_has_action_permission('protocolo_ergonomia', 'editar') OR public.user_has_action_permission('protocolo_iluminacion', 'editar'))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.protocolos_ergonomia p
      WHERE p.id = protocolo_id AND (public.user_has_action_permission('protocolo_ergonomia', 'editar') OR public.user_has_action_permission('protocolo_iluminacion', 'editar'))
    )
  );

CREATE POLICY delete_puntos ON public.protocolos_ergonomia_puntos
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.protocolos_ergonomia p
      WHERE p.id = protocolo_id AND (public.user_has_action_permission('protocolo_ergonomia', 'eliminar') OR public.user_has_action_permission('protocolo_iluminacion', 'eliminar'))
    )
  );

-- Mediciones
CREATE POLICY select_mediciones ON public.protocolos_ergonomia_mediciones
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.protocolos_ergonomia_puntos pts
      JOIN public.protocolos_ergonomia p ON p.id = pts.protocolo_id
      WHERE pts.id = punto_id AND p.deleted_at IS NULL
    )
  );

CREATE POLICY insert_mediciones ON public.protocolos_ergonomia_mediciones
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.protocolos_ergonomia_puntos pts
      JOIN public.protocolos_ergonomia p ON p.id = pts.protocolo_id
      WHERE pts.id = punto_id AND (public.user_has_action_permission('protocolo_ergonomia', 'cargar') OR public.user_has_action_permission('protocolo_iluminacion', 'cargar'))
    )
  );

CREATE POLICY update_mediciones ON public.protocolos_ergonomia_mediciones
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.protocolos_ergonomia_puntos pts
      JOIN public.protocolos_ergonomia p ON p.id = pts.protocolo_id
      WHERE pts.id = punto_id AND (public.user_has_action_permission('protocolo_ergonomia', 'editar') OR public.user_has_action_permission('protocolo_iluminacion', 'editar'))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.protocolos_ergonomia_puntos pts
      JOIN public.protocolos_ergonomia p ON p.id = pts.protocolo_id
      WHERE pts.id = punto_id AND (public.user_has_action_permission('protocolo_ergonomia', 'editar') OR public.user_has_action_permission('protocolo_iluminacion', 'editar'))
    )
  );

CREATE POLICY delete_mediciones ON public.protocolos_ergonomia_mediciones
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.protocolos_ergonomia_puntos pts
      JOIN public.protocolos_ergonomia p ON p.id = pts.protocolo_id
      WHERE pts.id = punto_id AND (public.user_has_action_permission('protocolo_ergonomia', 'eliminar') OR public.user_has_action_permission('protocolo_iluminacion', 'eliminar'))
    )
  );

-- Adjuntos
CREATE POLICY select_adjuntos ON public.protocolos_ergonomia_adjuntos
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.protocolos_ergonomia p
      WHERE p.id = protocolo_id AND p.deleted_at IS NULL
    )
  );

CREATE POLICY insert_adjuntos ON public.protocolos_ergonomia_adjuntos
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.protocolos_ergonomia p
      WHERE p.id = protocolo_id AND (public.user_has_action_permission('protocolo_ergonomia', 'cargar') OR public.user_has_action_permission('protocolo_iluminacion', 'cargar'))
    )
  );

CREATE POLICY update_adjuntos ON public.protocolos_ergonomia_adjuntos
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.protocolos_ergonomia p
      WHERE p.id = protocolo_id AND (public.user_has_action_permission('protocolo_ergonomia', 'editar') OR public.user_has_action_permission('protocolo_iluminacion', 'editar'))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.protocolos_ergonomia p
      WHERE p.id = protocolo_id AND (public.user_has_action_permission('protocolo_ergonomia', 'editar') OR public.user_has_action_permission('protocolo_iluminacion', 'editar'))
    )
  );

CREATE POLICY delete_adjuntos ON public.protocolos_ergonomia_adjuntos
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.protocolos_ergonomia p
      WHERE p.id = protocolo_id AND (public.user_has_action_permission('protocolo_ergonomia', 'eliminar') OR public.user_has_action_permission('protocolo_iluminacion', 'eliminar'))
    )
  );

-- 8. Actualizar los permisos JSONB por defecto para perfiles y miembros
ALTER TABLE public.miembros_equipo ALTER COLUMN permisos SET DEFAULT '{"empresas": true, "equipo": true, "programa": true, "capacitacion": true, "correctivas": true, "extintores": true, "control_electrico": true, "visitas": true, "avisos": true, "legajo": true, "nomina": true, "accidentes": true, "matriz_riesgos": true, "protocolo_iluminacion": true, "protocolo_ruido": true, "protocolo_ergonomia": true}'::jsonb;
ALTER TABLE public.profiles ALTER COLUMN permisos SET DEFAULT '{"empresas": true, "equipo": true, "programa": true, "capacitacion": true, "correctivas": true, "extintores": true, "control_electrico": true, "visitas": true, "avisos": true, "legajo": true, "nomina": true, "accidentes": true, "matriz_riesgos": true, "protocolo_iluminacion": true, "protocolo_ruido": true, "protocolo_ergonomia": true}'::jsonb;

-- Actualizar registros existentes
UPDATE public.profiles 
SET permisos = COALESCE(permisos, '{}'::jsonb) || '{"protocolo_ergonomia": true}'::jsonb 
WHERE role IN ('owner', 'admin') OR permisos IS NOT NULL;

UPDATE public.miembros_equipo 
SET permisos = COALESCE(permisos, '{}'::jsonb) || '{"protocolo_ergonomia": true}'::jsonb 
WHERE permisos IS NOT NULL;

-- 9. Inicializar el bucket de storage
INSERT INTO storage.buckets (id, name, public)
VALUES ('protocolos-ergonomia', 'protocolos-ergonomia', false)
ON CONFLICT (id) DO NOTHING;

-- Crear políticas para el bucket
CREATE POLICY "Permitir administrar documentos de ergonomia" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'protocolos-ergonomia' AND public.can_access_member_asset(bucket_id, name))
  WITH CHECK (bucket_id = 'protocolos-ergonomia' AND public.can_access_member_asset(bucket_id, name));

-- 10. Recargar el caché de PostgREST
NOTIFY pgrst, 'reload schema';
