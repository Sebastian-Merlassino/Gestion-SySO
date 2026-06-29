-- Migration: Create public.tareas_pendientes table and set up policies
-- File: supabase/migrations/20260717000000_create_tareas_pendientes.sql

CREATE TABLE IF NOT EXISTS public.tareas_pendientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    empresa_id UUID REFERENCES public.empresas(id) ON DELETE SET NULL,
    establecimiento_id UUID REFERENCES public.establecimientos(id) ON DELETE SET NULL,
    titulo TEXT NOT NULL,
    fecha DATE,
    realizada BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.tareas_pendientes ENABLE ROW LEVEL SECURITY;

-- Crear políticas RLS para aislamiento por tenant
DROP POLICY IF EXISTS tareas_pendientes_tenant_select ON public.tareas_pendientes;
CREATE POLICY tareas_pendientes_tenant_select ON public.tareas_pendientes
    FOR SELECT TO authenticated
    USING (
        public.user_has_tenant_access(tenant_id) 
        AND (NOT public.is_client_user() OR empresa_id = public.get_current_user_empresa_id())
    );

DROP POLICY IF EXISTS tareas_pendientes_tenant_insert ON public.tareas_pendientes;
CREATE POLICY tareas_pendientes_tenant_insert ON public.tareas_pendientes
    FOR INSERT TO authenticated
    WITH CHECK (
        public.user_has_tenant_access(tenant_id) 
        AND NOT public.is_client_user()
    );

DROP POLICY IF EXISTS tareas_pendientes_tenant_update ON public.tareas_pendientes;
CREATE POLICY tareas_pendientes_tenant_update ON public.tareas_pendientes
    FOR UPDATE TO authenticated
    USING (
        public.user_has_tenant_access(tenant_id) 
        AND NOT public.is_client_user()
    )
    WITH CHECK (
        public.user_has_tenant_access(tenant_id) 
        AND NOT public.is_client_user()
    );

DROP POLICY IF EXISTS tareas_pendientes_tenant_delete ON public.tareas_pendientes;
CREATE POLICY tareas_pendientes_tenant_delete ON public.tareas_pendientes
    FOR DELETE TO authenticated
    USING (
        public.user_has_tenant_access(tenant_id) 
        AND NOT public.is_client_user()
    );

-- Recargar el caché de PostgREST
NOTIFY pgrst, 'reload schema';
