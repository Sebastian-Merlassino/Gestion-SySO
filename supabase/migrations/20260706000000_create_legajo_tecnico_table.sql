-- Migración para crear la tabla de legajo técnico y sus políticas de seguridad RLS
-- Archivo: supabase/migrations/20260706000000_create_legajo_tecnico_table.sql

CREATE TABLE IF NOT EXISTS public.legajo_tecnico (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    establecimiento_id UUID REFERENCES public.establecimientos(id) ON DELETE CASCADE,
    categoria TEXT NOT NULL,
    subcategoria TEXT,
    documento_nombre TEXT NOT NULL,
    fecha DATE NOT NULL,
    documento_url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.legajo_tecnico ENABLE ROW LEVEL SECURITY;

-- 1. Política SELECT: Aislamiento por tenant y por empresa para clientes
DROP POLICY IF EXISTS legajo_tecnico_tenant_select ON public.legajo_tecnico;
CREATE POLICY legajo_tecnico_tenant_select ON public.legajo_tecnico
    FOR SELECT TO authenticated
    USING (
        public.user_has_tenant_access(tenant_id) 
        AND (NOT public.is_client_user() OR empresa_id = public.get_current_user_empresa_id())
    );

-- 2. Política INSERT: Sólo técnicos autorizados
DROP POLICY IF EXISTS legajo_tecnico_tenant_insert ON public.legajo_tecnico;
CREATE POLICY legajo_tecnico_tenant_insert ON public.legajo_tecnico
    FOR INSERT TO authenticated
    WITH CHECK (
        public.user_has_tenant_access(tenant_id) 
        AND public.user_has_action_permission('legajo', 'cargar')
    );

-- 3. Política UPDATE: Sólo técnicos autorizados
DROP POLICY IF EXISTS legajo_tecnico_tenant_update ON public.legajo_tecnico;
CREATE POLICY legajo_tecnico_tenant_update ON public.legajo_tecnico
    FOR UPDATE TO authenticated
    USING (
        public.user_has_tenant_access(tenant_id) 
        AND public.user_has_action_permission('legajo', 'editar')
    )
    WITH CHECK (
        public.user_has_tenant_access(tenant_id) 
        AND public.user_has_action_permission('legajo', 'editar')
    );

-- 4. Política DELETE: Sólo técnicos autorizados
DROP POLICY IF EXISTS legajo_tecnico_tenant_delete ON public.legajo_tecnico;
CREATE POLICY legajo_tecnico_tenant_delete ON public.legajo_tecnico
    FOR DELETE TO authenticated
    USING (
        public.user_has_tenant_access(tenant_id) 
        AND public.user_has_action_permission('legajo', 'eliminar')
    );

-- Recargar el caché del esquema de PostgREST
NOTIFY pgrst, 'reload schema';
