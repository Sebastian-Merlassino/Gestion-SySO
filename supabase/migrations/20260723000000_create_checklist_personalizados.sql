-- Migration: Create public.checklist_templates and public.checklist_inspecciones
-- File: supabase/migrations/20260723000000_create_checklist_personalizados.sql

-- 1. Tabla de Plantillas de Checklist
CREATE TABLE IF NOT EXISTS public.checklist_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    config_campos JSONB NOT NULL DEFAULT '{"razon_social": false, "establecimiento": false, "direccion": false, "cuit": false, "fecha": false}'::jsonb,
    items JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array de objetos: { id, pregunta, tipo_respuesta, opciones_botones: [] }
    bloque_imagenes BOOLEAN NOT NULL DEFAULT false,
    bloque_firmas JSONB NOT NULL DEFAULT '{"responsable_establecimiento": false, "responsable_higiene_seguridad": false}'::jsonb,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar Row Level Security (RLS) en templates
ALTER TABLE public.checklist_templates ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para templates
DROP POLICY IF EXISTS checklist_templates_tenant_select ON public.checklist_templates;
CREATE POLICY checklist_templates_tenant_select ON public.checklist_templates
    FOR SELECT TO authenticated
    USING (public.user_has_tenant_access(tenant_id));

DROP POLICY IF EXISTS checklist_templates_tenant_insert ON public.checklist_templates;
CREATE POLICY checklist_templates_tenant_insert ON public.checklist_templates
    FOR INSERT TO authenticated
    WITH CHECK (
        public.user_has_tenant_access(tenant_id) 
        AND public.user_has_action_permission('checklist_personalizados', 'cargar')
    );

DROP POLICY IF EXISTS checklist_templates_tenant_update ON public.checklist_templates;
CREATE POLICY checklist_templates_tenant_update ON public.checklist_templates
    FOR UPDATE TO authenticated
    USING (
        public.user_has_tenant_access(tenant_id) 
        AND public.user_has_action_permission('checklist_personalizados', 'editar')
    )
    WITH CHECK (
        public.user_has_tenant_access(tenant_id) 
        AND public.user_has_action_permission('checklist_personalizados', 'editar')
    );

DROP POLICY IF EXISTS checklist_templates_tenant_delete ON public.checklist_templates;
CREATE POLICY checklist_templates_tenant_delete ON public.checklist_templates
    FOR DELETE TO authenticated
    USING (
        public.user_has_tenant_access(tenant_id) 
        AND public.user_has_action_permission('checklist_personalizados', 'eliminar')
    );


-- 2. Tabla de Inspecciones / Instancias de Checklist
CREATE TABLE IF NOT EXISTS public.checklist_inspecciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    template_id UUID NOT NULL REFERENCES public.checklist_templates(id) ON DELETE CASCADE,
    empresa_id UUID REFERENCES public.empresas(id) ON DELETE SET NULL,
    establecimiento_id UUID REFERENCES public.establecimientos(id) ON DELETE SET NULL,
    fecha DATE NOT NULL,
    respuestas JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array de objetos: { pregunta_id, pregunta, respuesta, detalle_otro }
    adjuntar_registros_urls TEXT[] DEFAULT '{}'::TEXT[], -- Imágenes cargadas en Storage
    
    -- Firmas y aclaraciones
    firma_responsable_establecimiento TEXT, -- dataURI base64 o path de storage
    responsable_establecimiento_aclaracion TEXT,
    firma_responsable_higiene_seguridad TEXT, -- dataURI base64 o path de storage
    responsable_higiene_seguridad_nombre TEXT,
    responsable_higiene_seguridad_id UUID REFERENCES public.miembros_equipo(id) ON DELETE SET NULL,
    firma_tipo TEXT NOT NULL DEFAULT 'perfil', -- 'perfil' o 'mano'
    
    observaciones TEXT, -- Observaciones generales
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar Row Level Security (RLS) en inspecciones
ALTER TABLE public.checklist_inspecciones ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para inspecciones
DROP POLICY IF EXISTS checklist_inspecciones_tenant_select ON public.checklist_inspecciones;
CREATE POLICY checklist_inspecciones_tenant_select ON public.checklist_inspecciones
    FOR SELECT TO authenticated
    USING (
        public.user_has_tenant_access(tenant_id) 
        AND (NOT public.is_client_user() OR (empresa_id IS NOT NULL AND empresa_id = public.get_current_user_empresa_id()))
    );

DROP POLICY IF EXISTS checklist_inspecciones_tenant_insert ON public.checklist_inspecciones;
CREATE POLICY checklist_inspecciones_tenant_insert ON public.checklist_inspecciones
    FOR INSERT TO authenticated
    WITH CHECK (
        public.user_has_tenant_access(tenant_id) 
        AND public.user_has_action_permission('checklist_personalizados', 'cargar')
    );

DROP POLICY IF EXISTS checklist_inspecciones_tenant_update ON public.checklist_inspecciones;
CREATE POLICY checklist_inspecciones_tenant_update ON public.checklist_inspecciones
    FOR UPDATE TO authenticated
    USING (
        public.user_has_tenant_access(tenant_id) 
        AND public.user_has_action_permission('checklist_personalizados', 'editar')
    )
    WITH CHECK (
        public.user_has_tenant_access(tenant_id) 
        AND public.user_has_action_permission('checklist_personalizados', 'editar')
    );

DROP POLICY IF EXISTS checklist_inspecciones_tenant_delete ON public.checklist_inspecciones;
CREATE POLICY checklist_inspecciones_tenant_delete ON public.checklist_inspecciones
    FOR DELETE TO authenticated
    USING (
        public.user_has_tenant_access(tenant_id) 
        AND public.user_has_action_permission('checklist_personalizados', 'eliminar')
    );

-- 3. Actualizar valores por defecto de la columna permisos para incluir la nueva sección
ALTER TABLE public.miembros_equipo ALTER COLUMN permisos SET DEFAULT '{"empresas": true, "equipo": true, "programa": true, "capacitacion": true, "correctivas": true, "extintores": true, "control_electrico": true, "visitas": true, "avisos": true, "legajo": true, "nomina": true, "accidentes": true, "matriz_riesgos": true, "checklist_personalizados": true}'::jsonb;
ALTER TABLE public.profiles ALTER COLUMN permisos SET DEFAULT '{"empresas": true, "equipo": true, "programa": true, "capacitacion": true, "correctivas": true, "extintores": true, "control_electrico": true, "visitas": true, "avisos": true, "legajo": true, "nomina": true, "accidentes": true, "matriz_riesgos": true, "checklist_personalizados": true}'::jsonb;

-- Actualizar filas existentes en perfiles y miembros
UPDATE public.profiles 
SET permisos = COALESCE(permisos, '{}'::jsonb) || '{"checklist_personalizados": {"cargar": true, "editar": true, "eliminar": true}}'::jsonb 
WHERE role IN ('owner', 'admin') OR permisos IS NOT NULL;

UPDATE public.miembros_equipo 
SET permisos = COALESCE(permisos, '{}'::jsonb) || '{"checklist_personalizados": {"cargar": true, "editar": true, "eliminar": true}}'::jsonb 
WHERE permisos IS NOT NULL;

-- Recargar el caché de PostgREST
NOTIFY pgrst, 'reload schema';
