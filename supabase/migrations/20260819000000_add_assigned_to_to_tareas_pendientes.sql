-- Migration: Add assigned_to and assigned_miembro_id to public.tareas_pendientes and update RLS policies
-- File: supabase/migrations/20260819000000_add_assigned_to_to_tareas_pendientes.sql

-- 1. Agregar columnas asignadas a tareas_pendientes
ALTER TABLE public.tareas_pendientes 
  ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_miembro_id UUID REFERENCES public.miembros_equipo(id) ON DELETE SET NULL;

-- 2. Actualizar las políticas RLS para permitir visibilidad dual (creador y asignado)
DROP POLICY IF EXISTS tareas_pendientes_tenant_select ON public.tareas_pendientes;
CREATE POLICY tareas_pendientes_tenant_select ON public.tareas_pendientes
    FOR SELECT TO authenticated
    USING (
        public.user_has_tenant_access(tenant_id) 
        AND (created_by = auth.uid() OR assigned_to = auth.uid() OR created_by IS NULL)
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
        AND (created_by = auth.uid() OR assigned_to = auth.uid() OR created_by IS NULL)
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
        AND (created_by = auth.uid() OR assigned_to = auth.uid() OR created_by IS NULL)
        AND NOT public.is_client_user()
    );

-- Recargar el caché de PostgREST
NOTIFY pgrst, 'reload schema';
