-- Migration: Add created_by column to public.tareas_pendientes and adjust policies
-- File: supabase/migrations/20260719000000_add_created_by_to_tareas_pendientes.sql

-- Agregar columna created_by a tareas_pendientes
ALTER TABLE public.tareas_pendientes ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE DEFAULT auth.uid();

-- Actualizar las políticas RLS para tareas_pendientes
DROP POLICY IF EXISTS tareas_pendientes_tenant_select ON public.tareas_pendientes;
CREATE POLICY tareas_pendientes_tenant_select ON public.tareas_pendientes
    FOR SELECT TO authenticated
    USING (
        public.user_has_tenant_access(tenant_id) 
        AND (created_by = auth.uid() OR created_by IS NULL)
        AND (NOT public.is_client_user() OR empresa_id = public.get_current_user_empresa_id())
    );

DROP POLICY IF EXISTS tareas_pendientes_tenant_insert ON public.tareas_pendientes;
CREATE POLICY tareas_pendientes_tenant_insert ON public.tareas_pendientes
    FOR INSERT TO authenticated
    WITH CHECK (
        public.user_has_tenant_access(tenant_id) 
        AND (created_by = auth.uid() OR created_by IS NULL)
        AND NOT public.is_client_user()
    );

DROP POLICY IF EXISTS tareas_pendientes_tenant_update ON public.tareas_pendientes;
CREATE POLICY tareas_pendientes_tenant_update ON public.tareas_pendientes
    FOR UPDATE TO authenticated
    USING (
        public.user_has_tenant_access(tenant_id) 
        AND (created_by = auth.uid() OR created_by IS NULL)
        AND NOT public.is_client_user()
    )
    WITH CHECK (
        public.user_has_tenant_access(tenant_id) 
        AND (created_by = auth.uid() OR created_by IS NULL)
        AND NOT public.is_client_user()
    );

DROP POLICY IF EXISTS tareas_pendientes_tenant_delete ON public.tareas_pendientes;
CREATE POLICY tareas_pendientes_tenant_delete ON public.tareas_pendientes
    FOR DELETE TO authenticated
    USING (
        public.user_has_tenant_access(tenant_id) 
        AND (created_by = auth.uid() OR created_by IS NULL)
        AND NOT public.is_client_user()
    );

-- Recargar el caché de PostgREST
NOTIFY pgrst, 'reload schema';
