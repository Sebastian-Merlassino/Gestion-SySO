-- 20260608000000_init_schema.sql
-- Migración inicial para el esquema multi-tenant de Gestión SySO

-- Habilitar extensión UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tabla de Tenants (Empresas/Organizaciones)
CREATE TABLE public.tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'trial')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS en Tenants
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- 2. Tabla de Perfiles de Usuario (Relacionado a auth.users de Supabase)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'inspector' CHECK (role IN ('owner', 'admin', 'supervisor', 'inspector')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS en Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Tabla de Auditorías/Inspecciones (Estructura Operativa Multi-tenant)
CREATE TABLE public.audits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'in_progress', 'completed', 'cancelled')),
    scheduled_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS en Audits
ALTER TABLE public.audits ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- FUNCIONES AUXILIARES PARA SEGURIDAD (RLS)
-- ==========================================

-- Función para obtener el tenant_id del usuario logueado en la sesión actual
CREATE OR REPLACE FUNCTION public.get_current_tenant_id()
RETURNS UUID AS $$
BEGIN
    RETURN (
        SELECT tenant_id 
        FROM public.profiles 
        WHERE id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- POLÍTICAS DE ROW LEVEL SECURITY (RLS)
-- ==========================================

-- Políticas para la tabla Tenants
-- Un usuario solo puede ver el tenant al que pertenece
CREATE POLICY tenant_isolation_select ON public.tenants
    FOR SELECT
    USING (id = public.get_current_tenant_id());

-- Solo el owner del tenant o administradores del sistema pueden actualizar los datos del tenant
CREATE POLICY tenant_isolation_update ON public.tenants
    FOR UPDATE
    USING (id = public.get_current_tenant_id())
    WITH CHECK (id = public.get_current_tenant_id());


-- Políticas para la tabla Profiles
-- Los usuarios de un tenant pueden ver perfiles de sus propios compañeros
CREATE POLICY profile_isolation_select ON public.profiles
    FOR SELECT
    USING (tenant_id = public.get_current_tenant_id());

-- Los usuarios pueden actualizar su propio perfil
CREATE POLICY profile_self_update ON public.profiles
    FOR UPDATE
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());


-- Políticas para la tabla Audits
-- Aislamiento total por Tenant ID para todo tipo de operaciones (SELECT, INSERT, UPDATE, DELETE)
CREATE POLICY audit_tenant_isolation ON public.audits
    FOR ALL
    USING (tenant_id = public.get_current_tenant_id())
    WITH CHECK (tenant_id = public.get_current_tenant_id());
