-- Migration: Indexación masiva multi-tenant y de claves foráneas para eliminar Sequential Scans
-- File: supabase/migrations/20260827000000_add_multi_tenant_composite_indexes.sql

-- 1. Tablas Core y de Identidad
CREATE INDEX IF NOT EXISTS idx_audits_tenant_id ON public.audits(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audits_created_by ON public.audits(created_by);

CREATE INDEX IF NOT EXISTS idx_profiles_tenant_id ON public.profiles(tenant_id);

CREATE INDEX IF NOT EXISTS idx_empresas_tenant_id ON public.empresas(tenant_id);

CREATE INDEX IF NOT EXISTS idx_establecimientos_tenant_id ON public.establecimientos(tenant_id);
CREATE INDEX IF NOT EXISTS idx_establecimientos_empresa_id ON public.establecimientos(empresa_id);

CREATE INDEX IF NOT EXISTS idx_miembros_equipo_tenant_id ON public.miembros_equipo(tenant_id);
CREATE INDEX IF NOT EXISTS idx_miembros_equipo_profile_id ON public.miembros_equipo(profile_id);
CREATE INDEX IF NOT EXISTS idx_miembros_equipo_email ON public.miembros_equipo(email);

CREATE INDEX IF NOT EXISTS idx_matriculas_profile_id ON public.matriculas(profile_id);
CREATE INDEX IF NOT EXISTS idx_matriculas_miembro_id ON public.matriculas(miembro_id);

-- 2. Tablas Operativas Principales
CREATE INDEX IF NOT EXISTS idx_programa_anual_tenant_id ON public.programa_anual(tenant_id);

CREATE INDEX IF NOT EXISTS idx_acciones_correctivas_tenant_id ON public.acciones_correctivas(tenant_id);

CREATE INDEX IF NOT EXISTS idx_extintores_tenant_id ON public.extintores(tenant_id);
CREATE INDEX IF NOT EXISTS idx_extintores_estab_id ON public.extintores(establecimiento_id);

CREATE INDEX IF NOT EXISTS idx_visitas_tenant_id ON public.visitas(tenant_id);
CREATE INDEX IF NOT EXISTS idx_visitas_empresa_id ON public.visitas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_visitas_estab_id ON public.visitas(establecimiento_id);

CREATE INDEX IF NOT EXISTS idx_avisos_riesgo_tenant_id ON public.avisos_riesgo(tenant_id);
CREATE INDEX IF NOT EXISTS idx_avisos_riesgo_empresa_id ON public.avisos_riesgo(empresa_id);

CREATE INDEX IF NOT EXISTS idx_registros_tenant_id ON public.registros(tenant_id);

CREATE INDEX IF NOT EXISTS idx_legajo_tecnico_tenant_id ON public.legajo_tecnico(tenant_id);
CREATE INDEX IF NOT EXISTS idx_legajo_tecnico_empresa_id ON public.legajo_tecnico(empresa_id);

CREATE INDEX IF NOT EXISTS idx_nomina_personal_tenant_id ON public.nomina_personal(tenant_id);
CREATE INDEX IF NOT EXISTS idx_nomina_personal_estab_id ON public.nomina_personal(establecimiento_id);

CREATE INDEX IF NOT EXISTS idx_accidentes_tenant_id ON public.accidentes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_accidentes_empresa_id ON public.accidentes(empresa_id);

CREATE INDEX IF NOT EXISTS idx_matriz_riesgos_tenant_id ON public.matriz_riesgos(tenant_id);
CREATE INDEX IF NOT EXISTS idx_matriz_riesgos_empresa_id ON public.matriz_riesgos(empresa_id);

CREATE INDEX IF NOT EXISTS idx_tareas_pendientes_tenant_id ON public.tareas_pendientes(tenant_id);

CREATE INDEX IF NOT EXISTS idx_control_electrico_tenant_id ON public.control_electrico(tenant_id);

CREATE INDEX IF NOT EXISTS idx_checklist_personalizados_tenant_id ON public.checklist_personalizados(tenant_id);

-- 3. Protocolos SRT
CREATE INDEX IF NOT EXISTS idx_protocolo_iluminacion_tenant_id ON public.protocolo_iluminacion(tenant_id);

CREATE INDEX IF NOT EXISTS idx_protocolo_ruido_tenant_id ON public.protocolo_ruido(tenant_id);

CREATE INDEX IF NOT EXISTS idx_protocolo_ergonomia_tenant_id ON public.protocolo_ergonomia(tenant_id);
