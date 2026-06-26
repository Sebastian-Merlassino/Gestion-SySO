-- Migration: Create public.accidentes table and set up policies and permissions
-- File: supabase/migrations/20260713000000_create_accidentes.sql

CREATE TABLE IF NOT EXISTS public.accidentes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    establecimiento_id UUID NOT NULL REFERENCES public.establecimientos(id) ON DELETE CASCADE,
    area_sector TEXT,
    puesto_operacion TEXT,
    nombre_apellido TEXT NOT NULL,
    cuil VARCHAR(11) CHECK (cuil IS NULL OR cuil ~ '^[0-9]{11}$'),
    fecha_siniestro DATE NOT NULL,
    hora TIME,
    fecha_denuncia DATE,
    nro_siniestro TEXT,
    tipo TEXT NOT NULL CHECK (tipo IN ('Accidente de trabajo', 'Accidente in itinere', 'Incidente', 'Enfermedad profesional', 'Rechazo', 'Reingreso')),
    gravedad TEXT NOT NULL CHECK (gravedad IN ('Leve', 'Grave', 'Mortal')),
    descripcion_hechos TEXT,
    forma_accidente_id UUID REFERENCES public.formas_accidente(id),
    descripcion_lesion_id UUID REFERENCES public.descripciones_lesion(id),
    zona_cuerpo_id UUID REFERENCES public.zonas_cuerpo_afectadas(id),
    agente_material_id UUID REFERENCES public.agentes_materiales_asociados(id),
    diagnostico TEXT,
    fecha_alta_rechazo DATE,
    dias_baja INTEGER,
    denuncia_accidente_url TEXT,
    informe_investigacion_url TEXT,
    observaciones TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.accidentes ENABLE ROW LEVEL SECURITY;

-- 1. Política SELECT: Aislamiento por tenant y por empresa para clientes
DROP POLICY IF EXISTS accidentes_tenant_select ON public.accidentes;
CREATE POLICY accidentes_tenant_select ON public.accidentes
    FOR SELECT TO authenticated
    USING (
        public.user_has_tenant_access(tenant_id) 
        AND (NOT public.is_client_user() OR empresa_id = public.get_current_user_empresa_id())
    );

-- 2. Política INSERT: Sólo personal autorizado
DROP POLICY IF EXISTS accidentes_tenant_insert ON public.accidentes;
CREATE POLICY accidentes_tenant_insert ON public.accidentes
    FOR INSERT TO authenticated
    WITH CHECK (
        public.user_has_tenant_access(tenant_id) 
        AND public.user_has_action_permission('accidentes', 'cargar')
    );

-- 3. Política UPDATE: Sólo personal autorizado
DROP POLICY IF EXISTS accidentes_tenant_update ON public.accidentes;
CREATE POLICY accidentes_tenant_update ON public.accidentes
    FOR UPDATE TO authenticated
    USING (
        public.user_has_tenant_access(tenant_id) 
        AND public.user_has_action_permission('accidentes', 'editar')
    )
    WITH CHECK (
        public.user_has_tenant_access(tenant_id) 
        AND public.user_has_action_permission('accidentes', 'editar')
    );

-- 4. Política DELETE: Sólo personal autorizado
DROP POLICY IF EXISTS accidentes_tenant_delete ON public.accidentes;
CREATE POLICY accidentes_tenant_delete ON public.accidentes
    FOR DELETE TO authenticated
    USING (
        public.user_has_tenant_access(tenant_id) 
        AND public.user_has_action_permission('accidentes', 'eliminar')
    );

-- Actualizar valores por defecto de la columna permisos para incluir la sección accidentes
ALTER TABLE public.miembros_equipo ALTER COLUMN permisos SET DEFAULT '{"empresas": true, "equipo": true, "programa": true, "capacitacion": true, "correctivas": true, "extintores": true, "visitas": true, "avisos": true, "legajo": true, "nomina": true, "accidentes": true}'::jsonb;
ALTER TABLE public.profiles ALTER COLUMN permisos SET DEFAULT '{"empresas": true, "equipo": true, "programa": true, "capacitacion": true, "correctivas": true, "extintores": true, "visitas": true, "avisos": true, "legajo": true, "nomina": true, "accidentes": true}'::jsonb;

-- Actualizar filas existentes en perfiles y miembros
UPDATE public.profiles 
SET permisos = COALESCE(permisos, '{}'::jsonb) || '{"accidentes": true}'::jsonb 
WHERE role IN ('owner', 'admin') OR permisos IS NOT NULL;

UPDATE public.miembros_equipo 
SET permisos = COALESCE(permisos, '{}'::jsonb) || '{"accidentes": true}'::jsonb 
WHERE permisos IS NOT NULL;

-- Recargar el caché del esquema de PostgREST
NOTIFY pgrst, 'reload schema';
