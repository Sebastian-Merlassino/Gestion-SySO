-- Migration to create public.empresas and public.establecimientos tables
-- File: supabase/migrations/20260618000000_create_empresas_and_establecimientos.sql

CREATE TABLE IF NOT EXISTS public.empresas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    razon_social TEXT NOT NULL,
    nombre_comercial TEXT,
    cuit VARCHAR(11) NOT NULL CHECK (cuit ~ '^[0-9]{11}$'),
    actividades_ciiu VARCHAR(50)[] DEFAULT '{}'::VARCHAR(50)[] NOT NULL,
    contactos_telefonos JSONB DEFAULT '[]'::jsonb NOT NULL,
    contactos_correos JSONB DEFAULT '[]'::jsonb NOT NULL,
    contactos_facturacion JSONB DEFAULT '[]'::jsonb NOT NULL,
    art_web TEXT,
    art_usuario TEXT,
    art_clave TEXT,
    miba_usuario TEXT,
    miba_clave TEXT,
    ambiente_usuario TEXT,
    ambiente_clave TEXT,
    observaciones TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS en empresas
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;

-- Crear política directamente
CREATE POLICY empresas_tenant_isolation ON public.empresas
    FOR ALL TO authenticated
    USING (tenant_id = public.get_current_tenant_id())
    WITH CHECK (tenant_id = public.get_current_tenant_id());

-- Create establecimientos table
CREATE TABLE IF NOT EXISTS public.establecimientos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    denominacion TEXT NOT NULL,
    direccion TEXT NOT NULL,
    provincia TEXT NOT NULL,
    partido TEXT NOT NULL,
    localidad_barrio TEXT NOT NULL,
    cp TEXT,
    superficie_total TEXT,
    superficie_cubierta TEXT,
    superficie_piso TEXT,
    cantidad_plantas TEXT,
    horario_funcionamiento TEXT,
    trabajadores_administrativos INTEGER DEFAULT 0 NOT NULL,
    trabajadores_productivos INTEGER DEFAULT 0 NOT NULL,
    trabajadores_equivalentes NUMERIC DEFAULT 0 NOT NULL,
    capitulos_decreto JSONB DEFAULT '{}'::jsonb NOT NULL,
    horas_profesional NUMERIC DEFAULT 0 NOT NULL,
    maquinas_fijas VARCHAR(255)[] DEFAULT '{}'::VARCHAR(255)[] NOT NULL,
    maquinas_moviles VARCHAR(255)[] DEFAULT '{}'::VARCHAR(255)[] NOT NULL,
    herramientas_electricas VARCHAR(255)[] DEFAULT '{}'::VARCHAR(255)[] NOT NULL,
    aparatos_presion VARCHAR(255)[] DEFAULT '{}'::VARCHAR(255)[] NOT NULL,
    equipos_termicos VARCHAR(255)[] DEFAULT '{}'::VARCHAR(255)[] NOT NULL,
    equipos_elevacion VARCHAR(255)[] DEFAULT '{}'::VARCHAR(255)[] NOT NULL,
    equipos_izaje VARCHAR(255)[] DEFAULT '{}'::VARCHAR(255)[] NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS on establecimientos
ALTER TABLE public.establecimientos ENABLE ROW LEVEL SECURITY;

-- Crear política directamente
CREATE POLICY establecimientos_tenant_isolation ON public.establecimientos
    FOR ALL TO authenticated
    USING (tenant_id = public.get_current_tenant_id())
    WITH CHECK (tenant_id = public.get_current_tenant_id());
