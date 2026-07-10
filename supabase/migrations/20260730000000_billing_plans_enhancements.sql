-- Migration: Billing enhancements for automatic payments, gifts, discounts, and owner exemption.
-- File: supabase/migrations/20260730000000_billing_plans_enhancements.sql

-- 1. Agregar columnas a la tabla public.tenants
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS plan_ends_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS gift_plan_id VARCHAR(50);
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS gift_ends_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS discount_percentage NUMERIC DEFAULT 0;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS discount_ends_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS is_exempt BOOLEAN DEFAULT FALSE;

-- Eliminar restricciones si ya existen para evitar duplicados
ALTER TABLE public.tenants DROP CONSTRAINT IF EXISTS gift_plan_check;
ALTER TABLE public.tenants DROP CONSTRAINT IF EXISTS discount_check;

-- Agregar restricciones de validación
ALTER TABLE public.tenants ADD CONSTRAINT gift_plan_check CHECK (gift_plan_id IN ('free', 'basic_5', 'standard_25', 'libre'));
ALTER TABLE public.tenants ADD CONSTRAINT discount_check CHECK (discount_percentage >= 0 AND discount_percentage <= 100);

-- 2. Crear función para obtener el plan efectivo del tenant
CREATE OR REPLACE FUNCTION public.get_effective_plan_id(p_tenant_id UUID)
RETURNS VARCHAR AS $$
DECLARE
    v_plan_id VARCHAR;
    v_is_exempt BOOLEAN;
    v_gift_plan_id VARCHAR;
    v_gift_ends_at TIMESTAMP WITH TIME ZONE;
    v_plan_ends_at TIMESTAMP WITH TIME ZONE;
BEGIN
    SELECT plan_id, is_exempt, gift_plan_id, gift_ends_at, plan_ends_at
    INTO v_plan_id, v_is_exempt, v_gift_plan_id, v_gift_ends_at, v_plan_ends_at
    FROM public.tenants
    WHERE id = p_tenant_id;

    -- Si es exento (dueño global), tiene plan libre
    IF COALESCE(v_is_exempt, FALSE) = TRUE THEN
        RETURN 'libre';
    END IF;

    -- Evaluar regalo de membresía activo
    IF v_gift_plan_id IS NOT NULL AND v_gift_ends_at > now() THEN
        RETURN v_gift_plan_id;
    END IF;

    -- Evaluar si venció su plan contratado
    IF v_plan_ends_at IS NOT NULL AND v_plan_ends_at < now() THEN
        RETURN 'free';
    END IF;

    RETURN COALESCE(v_plan_id, 'free');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Redefinir la función de permisos de escritura para que valide el plan
CREATE OR REPLACE FUNCTION public.user_has_action_permission(p_section text, p_action text)
RETURNS boolean AS $$
DECLARE
  v_tenant_id uuid;
  v_role text;
  v_permisos jsonb;
  v_section_perm jsonb;
  v_plan varchar;
BEGIN
  SELECT tenant_id, role, permisos INTO v_tenant_id, v_role, v_permisos
  FROM public.profiles
  WHERE id = auth.uid();
  
  -- Si no hay perfil en sesión, denegar acceso
  IF v_role IS NULL THEN
    RETURN false;
  END IF;
  
  -- Validar restricciones por plan efectivo
  IF v_tenant_id IS NOT NULL THEN
    v_plan := public.get_effective_plan_id(v_tenant_id);
    
    -- Restricciones de módulos por plan
    IF p_section = 'extintores' AND v_plan = 'free' THEN
      RETURN false;
    END IF;
    IF p_section = 'control_electrico' AND v_plan = 'free' THEN
      RETURN false;
    END IF;
    IF p_section = 'visitas' AND v_plan IN ('free', 'basic_5') THEN
      RETURN false;
    END IF;
    IF p_section = 'avisos' AND v_plan IN ('free', 'basic_5') THEN
      RETURN false;
    END IF;
    IF p_section = 'checklist_personalizados' AND v_plan IN ('free', 'basic_5', 'standard_25') THEN
      RETURN false;
    END IF;
    IF p_section = 'legajo' AND v_plan IN ('free', 'basic_5', 'standard_25') THEN
      RETURN false;
    END IF;
    
    -- El portal de clientes (rol 'cliente') sólo se permite en el plan libre
    IF v_role = 'cliente' AND v_plan != 'libre' THEN
      RETURN false;
    END IF;
  END IF;
  
  -- Si el usuario es cliente, denegar cualquier acción de escritura
  IF v_role = 'cliente' THEN
    RETURN false;
  END IF;
  
  -- Administrador tiene permisos absolutos
  IF v_role = 'admin' THEN
    RETURN true;
  END IF;
  
  -- Si no hay JSON de permisos, denegar por defecto
  IF v_permisos IS NULL THEN
    RETURN false;
  END IF;
  
  v_section_perm := v_permisos->p_section;
  
  -- Si es nulo, denegar por defecto
  IF v_section_perm IS NULL THEN
    RETURN false;
  END IF;
  
  -- Si es un booleano (compatibilidad hacia atrás)
  IF jsonb_typeof(v_section_perm) = 'boolean' THEN
    RETURN v_section_perm::boolean;
  END IF;
  
  -- Si es un objeto JSON, verificar la acción específica ('cargar', 'editar', 'eliminar')
  IF jsonb_typeof(v_section_perm) = 'object' THEN
    RETURN COALESCE((v_section_perm->p_action)::boolean, false);
  END IF;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Modificar las políticas RLS SELECT para restringir lectura por plan
-- 4.1 Extintores
DROP POLICY IF EXISTS extintores_tenant_select ON public.extintores;
CREATE POLICY extintores_tenant_select ON public.extintores
    FOR SELECT TO authenticated
    USING (
        public.user_has_tenant_access(tenant_id) 
        AND (NOT public.is_client_user() OR empresa_id = public.get_current_user_empresa_id())
        AND public.get_effective_plan_id(tenant_id) IN ('basic_5', 'standard_25', 'libre')
    );

-- 4.2 Control Eléctrico
DROP POLICY IF EXISTS control_electrico_tenant_select ON public.control_electrico;
CREATE POLICY control_electrico_tenant_select ON public.control_electrico
    FOR SELECT TO authenticated
    USING (
        public.user_has_tenant_access(tenant_id) 
        AND (NOT public.is_client_user() OR empresa_id = public.get_current_user_empresa_id())
        AND public.get_effective_plan_id(tenant_id) IN ('basic_5', 'standard_25', 'libre')
    );

-- 4.3 Visitas
DROP POLICY IF EXISTS visitas_tenant_select ON public.visitas;
CREATE POLICY visitas_tenant_select ON public.visitas
    FOR SELECT TO authenticated
    USING (
        public.user_has_tenant_access(tenant_id) 
        AND (NOT public.is_client_user() OR empresa_id = public.get_current_user_empresa_id())
        AND public.get_effective_plan_id(tenant_id) IN ('standard_25', 'libre')
    );

-- 4.4 Avisos de Riesgo
DROP POLICY IF EXISTS avisos_riesgo_tenant_select ON public.avisos_riesgo;
CREATE POLICY avisos_riesgo_tenant_select ON public.avisos_riesgo
    FOR SELECT TO authenticated
    USING (
        public.user_has_tenant_access(tenant_id) 
        AND (NOT public.is_client_user() OR empresa_id = public.get_current_user_empresa_id())
        AND public.get_effective_plan_id(tenant_id) IN ('standard_25', 'libre')
    );

-- 4.5 Checklist Templates
DROP POLICY IF EXISTS checklist_templates_tenant_select ON public.checklist_templates;
CREATE POLICY checklist_templates_tenant_select ON public.checklist_templates
    FOR SELECT TO authenticated
    USING (
        public.user_has_tenant_access(tenant_id)
        AND public.get_effective_plan_id(tenant_id) = 'libre'
    );

-- 4.6 Checklist Inspecciones
DROP POLICY IF EXISTS checklist_inspecciones_tenant_select ON public.checklist_inspecciones;
CREATE POLICY checklist_inspecciones_tenant_select ON public.checklist_inspecciones
    FOR SELECT TO authenticated
    USING (
        public.user_has_tenant_access(tenant_id)
        AND (NOT public.is_client_user() OR (empresa_id IS NOT NULL AND empresa_id = public.get_current_user_empresa_id()))
        AND public.get_effective_plan_id(tenant_id) = 'libre'
    );

-- 4.7 Legajo Técnico
DROP POLICY IF EXISTS legajo_tecnico_tenant_select ON public.legajo_tecnico;
CREATE POLICY legajo_tecnico_tenant_select ON public.legajo_tecnico
    FOR SELECT TO authenticated
    USING (
        public.user_has_tenant_access(tenant_id)
        AND (NOT public.is_client_user() OR empresa_id = public.get_current_user_empresa_id())
        AND public.get_effective_plan_id(tenant_id) = 'libre'
    );


-- 5. Crear Triggers para control estricto de límites
-- 5.1 Límite de Empresas Clientes
CREATE OR REPLACE FUNCTION public.check_empresa_limit()
RETURNS TRIGGER AS $$
DECLARE
    v_plan VARCHAR;
    v_limit INT;
    v_count INT;
BEGIN
    -- Obtener plan efectivo
    v_plan := public.get_effective_plan_id(NEW.tenant_id);
    
    -- Definir límite
    IF v_plan = 'free' THEN
        v_limit := 1;
    ELSIF v_plan = 'basic_5' THEN
        v_limit := 5;
    ELSIF v_plan = 'standard_25' THEN
        v_limit := 15;
    ELSIF v_plan = 'libre' THEN
        v_limit := -1; -- Ilimitado
    ELSE
        v_limit := 1; -- Fallback seguro
    END IF;
    
    -- Si es ilimitado, permitir
    IF v_limit = -1 THEN
        RETURN NEW;
    END IF;
    
    -- Contar empresas actuales
    SELECT COUNT(*) INTO v_count
    FROM public.empresas
    WHERE tenant_id = NEW.tenant_id;
    
    -- Si excede el límite, lanzar excepción
    IF v_count >= v_limit THEN
        RAISE EXCEPTION 'Operación denegada: Límite de empresas excedido para tu plan actual (% empresas). Actualiza tu plan para agregar más clientes.', v_limit;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS before_empresa_insert ON public.empresas;
CREATE TRIGGER before_empresa_insert
    BEFORE INSERT ON public.empresas
    FOR EACH ROW EXECUTE FUNCTION public.check_empresa_limit();

-- 5.2 Límite de Miembros de Equipo
CREATE OR REPLACE FUNCTION public.check_miembro_limit()
RETURNS TRIGGER AS $$
DECLARE
    v_plan VARCHAR;
    v_limit INT;
    v_count INT;
BEGIN
    -- Obtener plan efectivo
    v_plan := public.get_effective_plan_id(NEW.tenant_id);
    
    -- Definir límite
    IF v_plan = 'free' THEN
        v_limit := 1;
    ELSIF v_plan = 'basic_5' THEN
        v_limit := 5;
    ELSIF v_plan = 'standard_25' THEN
        v_limit := 15;
    ELSIF v_plan = 'libre' THEN
        v_limit := -1; -- Ilimitado
    ELSE
        v_limit := 1; -- Fallback seguro
    END IF;
    
    -- Si es ilimitado, permitir
    IF v_limit = -1 THEN
        RETURN NEW;
    END IF;
    
    -- Contar miembros actuales
    SELECT COUNT(*) INTO v_count
    FROM public.miembros_equipo
    WHERE tenant_id = NEW.tenant_id;
    
    -- Si excede el límite, lanzar excepción
    IF v_count >= v_limit THEN
        RAISE EXCEPTION 'Operación denegada: Límite de miembros de equipo excedido para tu plan actual (% integrantes). Actualiza tu plan para agregar más miembros de equipo.', v_limit;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS before_miembro_insert ON public.miembros_equipo;
CREATE TRIGGER before_miembro_insert
    BEFORE INSERT ON public.miembros_equipo
    FOR EACH ROW EXECUTE FUNCTION public.check_miembro_limit();


-- 6. Crear funciones RPC administrativas de base de datos
-- 6.1 Regalar un plan con vencimiento
CREATE OR REPLACE FUNCTION public.gift_plan_to_tenant(p_slug TEXT, p_gift_plan_id TEXT, p_duration TEXT)
RETURNS VOID AS $$
BEGIN
    UPDATE public.tenants
    SET gift_plan_id = p_gift_plan_id,
        gift_ends_at = now() + p_duration::interval
    WHERE slug = p_slug;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6.2 Aplicar descuento con vencimiento
CREATE OR REPLACE FUNCTION public.apply_discount_to_tenant(p_slug TEXT, p_discount_percentage NUMERIC, p_duration TEXT)
RETURNS VOID AS $$
BEGIN
    UPDATE public.tenants
    SET discount_percentage = p_discount_percentage,
        discount_ends_at = now() + p_duration::interval
    WHERE slug = p_slug;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6.3 Marcar exento (Owner / Acceso total permanente)
CREATE OR REPLACE FUNCTION public.set_tenant_exempt(p_slug TEXT, p_is_exempt BOOLEAN)
RETURNS VOID AS $$
BEGIN
    UPDATE public.tenants
    SET is_exempt = p_is_exempt
    WHERE slug = p_slug;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 7. Activar la exención del dueño global (sebastian.merlassino@gestionsyso.com)
UPDATE public.tenants
SET is_exempt = true
WHERE id IN (
    SELECT tenant_id
    FROM public.profiles
    WHERE email = 'sebastian.merlassino@gestionsyso.com'
      AND tenant_id IS NOT NULL
);

-- Recargar el caché de PostgREST
NOTIFY pgrst, 'reload schema';
