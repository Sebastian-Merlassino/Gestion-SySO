-- Migration: Create tables for Protocolo de Puesta a Tierra (Res. SRT 900/2015)
-- File: supabase/migrations/20260829000000_create_protocolo_puesta_a_tierra.sql

-- 1. Crear tabla principal: protocolos_puesta_a_tierra
CREATE TABLE IF NOT EXISTS public.protocolos_puesta_a_tierra (
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
  observaciones TEXT NULL,
  documentacion_adjunta TEXT NULL,

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
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Crear tabla de puntos de medición (Jabalinas / Tomas de Tierra)
CREATE TABLE IF NOT EXISTS public.protocolos_puesta_a_tierra_puntos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  protocolo_id UUID NOT NULL REFERENCES public.protocolos_puesta_a_tierra(id) ON DELETE CASCADE,
  orden INTEGER NOT NULL,
  toma_tierra_num INTEGER NOT NULL,

  sector TEXT NULL,
  condicion_terreno TEXT NULL,
  uso_puesta_a_tierra TEXT NULL,
  esquema_conexion TEXT NULL,

  valor_medido_ohm NUMERIC NULL,
  cumple_ohm TEXT NULL DEFAULT 'SI',

  continuidad_permanente TEXT NULL DEFAULT 'SI',
  capacidad_carga TEXT NULL DEFAULT 'SI',

  dispositivo_proteccion TEXT NULL,
  desconexion_automatica TEXT NULL DEFAULT 'SI',

  observaciones_punto TEXT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Crear tabla de archivos adjuntos (Fotografías / Certificados)
CREATE TABLE IF NOT EXISTS public.protocolos_puesta_a_tierra_adjuntos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  protocolo_id UUID NOT NULL REFERENCES public.protocolos_puesta_a_tierra(id) ON DELETE CASCADE,
  tipo TEXT NULL,
  nombre_archivo TEXT NULL,
  storage_path TEXT NOT NULL,
  public_url TEXT NULL,
  created_by UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Habilitar Row Level Security (RLS)
ALTER TABLE public.protocolos_puesta_a_tierra ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.protocolos_puesta_a_tierra_puntos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.protocolos_puesta_a_tierra_adjuntos ENABLE ROW LEVEL SECURITY;

-- 5. Crear políticas RLS para protocolos_puesta_a_tierra
CREATE POLICY select_puesta_a_tierra ON public.protocolos_puesta_a_tierra
  FOR SELECT TO authenticated
  USING (
    public.user_has_tenant_access(tenant_id)
    AND (NOT public.is_client_user() OR razon_social_id = public.get_current_user_empresa_id())
    AND deleted_at IS NULL
  );

CREATE POLICY insert_puesta_a_tierra ON public.protocolos_puesta_a_tierra
  FOR INSERT TO authenticated
  WITH CHECK (
    public.user_has_tenant_access(tenant_id)
    AND (public.user_has_action_permission('protocolo_puesta_a_tierra', 'cargar') OR public.user_has_action_permission('protocolo_ruido', 'cargar') OR public.user_has_action_permission('protocolo_iluminacion', 'cargar'))
  );

CREATE POLICY update_puesta_a_tierra ON public.protocolos_puesta_a_tierra
  FOR UPDATE TO authenticated
  USING (
    public.user_has_tenant_access(tenant_id)
    AND (public.user_has_action_permission('protocolo_puesta_a_tierra', 'editar') OR public.user_has_action_permission('protocolo_ruido', 'editar') OR public.user_has_action_permission('protocolo_iluminacion', 'editar'))
  )
  WITH CHECK (
    public.user_has_tenant_access(tenant_id)
    AND (public.user_has_action_permission('protocolo_puesta_a_tierra', 'editar') OR public.user_has_action_permission('protocolo_ruido', 'editar') OR public.user_has_action_permission('protocolo_iluminacion', 'editar'))
  );

CREATE POLICY delete_puesta_a_tierra ON public.protocolos_puesta_a_tierra
  FOR DELETE TO authenticated
  USING (
    public.user_has_tenant_access(tenant_id)
    AND (public.user_has_action_permission('protocolo_puesta_a_tierra', 'eliminar') OR public.user_has_action_permission('protocolo_ruido', 'eliminar') OR public.user_has_action_permission('protocolo_iluminacion', 'eliminar'))
  );

-- 6. Políticas RLS para puntos
CREATE POLICY select_puntos_pat ON public.protocolos_puesta_a_tierra_puntos
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.protocolos_puesta_a_tierra p
      WHERE p.id = protocolo_id AND p.deleted_at IS NULL
    )
  );

CREATE POLICY insert_puntos_pat ON public.protocolos_puesta_a_tierra_puntos
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.protocolos_puesta_a_tierra p
      WHERE p.id = protocolo_id AND (public.user_has_action_permission('protocolo_puesta_a_tierra', 'cargar') OR public.user_has_action_permission('protocolo_ruido', 'cargar') OR public.user_has_action_permission('protocolo_iluminacion', 'cargar'))
    )
  );

CREATE POLICY update_puntos_pat ON public.protocolos_puesta_a_tierra_puntos
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.protocolos_puesta_a_tierra p
      WHERE p.id = protocolo_id AND (public.user_has_action_permission('protocolo_puesta_a_tierra', 'editar') OR public.user_has_action_permission('protocolo_ruido', 'editar') OR public.user_has_action_permission('protocolo_iluminacion', 'editar'))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.protocolos_puesta_a_tierra p
      WHERE p.id = protocolo_id AND (public.user_has_action_permission('protocolo_puesta_a_tierra', 'editar') OR public.user_has_action_permission('protocolo_ruido', 'editar') OR public.user_has_action_permission('protocolo_iluminacion', 'editar'))
    )
  );

CREATE POLICY delete_puntos_pat ON public.protocolos_puesta_a_tierra_puntos
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.protocolos_puesta_a_tierra p
      WHERE p.id = protocolo_id AND (public.user_has_action_permission('protocolo_puesta_a_tierra', 'eliminar') OR public.user_has_action_permission('protocolo_ruido', 'eliminar') OR public.user_has_action_permission('protocolo_iluminacion', 'eliminar'))
    )
  );

-- 7. Políticas RLS para adjuntos
CREATE POLICY select_adjuntos_pat ON public.protocolos_puesta_a_tierra_adjuntos
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.protocolos_puesta_a_tierra p
      WHERE p.id = protocolo_id AND p.deleted_at IS NULL
    )
  );

CREATE POLICY insert_adjuntos_pat ON public.protocolos_puesta_a_tierra_adjuntos
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.protocolos_puesta_a_tierra p
      WHERE p.id = protocolo_id AND (public.user_has_action_permission('protocolo_puesta_a_tierra', 'cargar') OR public.user_has_action_permission('protocolo_ruido', 'cargar') OR public.user_has_action_permission('protocolo_iluminacion', 'cargar'))
    )
  );

CREATE POLICY update_adjuntos_pat ON public.protocolos_puesta_a_tierra_adjuntos
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.protocolos_puesta_a_tierra p
      WHERE p.id = protocolo_id AND (public.user_has_action_permission('protocolo_puesta_a_tierra', 'editar') OR public.user_has_action_permission('protocolo_ruido', 'editar') OR public.user_has_action_permission('protocolo_iluminacion', 'editar'))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.protocolos_puesta_a_tierra p
      WHERE p.id = protocolo_id AND (public.user_has_action_permission('protocolo_puesta_a_tierra', 'editar') OR public.user_has_action_permission('protocolo_ruido', 'editar') OR public.user_has_action_permission('protocolo_iluminacion', 'editar'))
    )
  );

CREATE POLICY delete_adjuntos_pat ON public.protocolos_puesta_a_tierra_adjuntos
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.protocolos_puesta_a_tierra p
      WHERE p.id = protocolo_id AND (public.user_has_action_permission('protocolo_puesta_a_tierra', 'eliminar') OR public.user_has_action_permission('protocolo_ruido', 'eliminar') OR public.user_has_action_permission('protocolo_iluminacion', 'eliminar'))
    )
  );

-- 8. Actualizar permisos JSONB por defecto para profiles y miembros_equipo
ALTER TABLE public.miembros_equipo ALTER COLUMN permisos SET DEFAULT '{"empresas": true, "equipo": true, "programa": true, "capacitacion": true, "correctivas": true, "extintores": true, "control_electrico": true, "visitas": true, "avisos": true, "legajo": true, "nomina": true, "accidentes": true, "matriz_riesgos": true, "protocolo_iluminacion": true, "protocolo_ruido": true, "protocolo_ergonomia": true, "protocolo_puesta_a_tierra": true}'::jsonb;
ALTER TABLE public.profiles ALTER COLUMN permisos SET DEFAULT '{"empresas": true, "equipo": true, "programa": true, "capacitacion": true, "correctivas": true, "extintores": true, "control_electrico": true, "visitas": true, "avisos": true, "legajo": true, "nomina": true, "accidentes": true, "matriz_riesgos": true, "protocolo_iluminacion": true, "protocolo_ruido": true, "protocolo_ergonomia": true, "protocolo_puesta_a_tierra": true}'::jsonb;

UPDATE public.profiles 
SET permisos = COALESCE(permisos, '{}'::jsonb) || '{"protocolo_puesta_a_tierra": true}'::jsonb 
WHERE role IN ('owner', 'admin') OR permisos IS NOT NULL;

UPDATE public.miembros_equipo 
SET permisos = COALESCE(permisos, '{}'::jsonb) || '{"protocolo_puesta_a_tierra": true}'::jsonb 
WHERE permisos IS NOT NULL;

-- 9. Inicializar el bucket de storage
INSERT INTO storage.buckets (id, name, public)
VALUES ('protocolos-puesta-a-tierra', 'protocolos-puesta-a-tierra', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Permitir administrar documentos de puesta a tierra" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'protocolos-puesta-a-tierra' AND public.can_access_member_asset(bucket_id, name))
  WITH CHECK (bucket_id = 'protocolos-puesta-a-tierra' AND public.can_access_member_asset(bucket_id, name));

-- 10. Recargar el caché de PostgREST
NOTIFY pgrst, 'reload schema';
