-- Migration: Allow members with correctivas, matriz, visitas, and protocolos permissions to sync and update sectores in establecimientos
-- File: supabase/migrations/20260830000000_allow_protocol_correctivas_sync_establecimientos.sql

DROP POLICY IF EXISTS establecimientos_tenant_update ON public.establecimientos;

CREATE POLICY establecimientos_tenant_update ON public.establecimientos
    FOR UPDATE TO authenticated 
    USING (
      public.user_has_tenant_access(tenant_id) 
      AND (
        public.user_has_action_permission('empresas', 'editar')
        OR public.user_has_action_permission('correctivas', 'editar')
        OR public.user_has_action_permission('correctivas', 'cargar')
        OR public.user_has_action_permission('matriz_riesgos', 'editar')
        OR public.user_has_action_permission('matriz_riesgos', 'cargar')
        OR public.user_has_action_permission('protocolo_iluminacion', 'editar')
        OR public.user_has_action_permission('protocolo_iluminacion', 'cargar')
        OR public.user_has_action_permission('protocolo_ruido', 'editar')
        OR public.user_has_action_permission('protocolo_ruido', 'cargar')
        OR public.user_has_action_permission('protocolo_puesta_a_tierra', 'editar')
        OR public.user_has_action_permission('protocolo_puesta_a_tierra', 'cargar')
        OR public.user_has_action_permission('protocolo_ergonomia', 'editar')
        OR public.user_has_action_permission('protocolo_ergonomia', 'cargar')
        OR public.user_has_action_permission('visitas', 'editar')
        OR public.user_has_action_permission('visitas', 'cargar')
      )
    )
    WITH CHECK (
      public.user_has_tenant_access(tenant_id) 
      AND (
        public.user_has_action_permission('empresas', 'editar')
        OR public.user_has_action_permission('correctivas', 'editar')
        OR public.user_has_action_permission('correctivas', 'cargar')
        OR public.user_has_action_permission('matriz_riesgos', 'editar')
        OR public.user_has_action_permission('matriz_riesgos', 'cargar')
        OR public.user_has_action_permission('protocolo_iluminacion', 'editar')
        OR public.user_has_action_permission('protocolo_iluminacion', 'cargar')
        OR public.user_has_action_permission('protocolo_ruido', 'editar')
        OR public.user_has_action_permission('protocolo_ruido', 'cargar')
        OR public.user_has_action_permission('protocolo_puesta_a_tierra', 'editar')
        OR public.user_has_action_permission('protocolo_puesta_a_tierra', 'cargar')
        OR public.user_has_action_permission('protocolo_ergonomia', 'editar')
        OR public.user_has_action_permission('protocolo_ergonomia', 'cargar')
        OR public.user_has_action_permission('visitas', 'editar')
        OR public.user_has_action_permission('visitas', 'cargar')
      )
    );
