-- Migration: Módulo de Facturación Electrónica ARCA (ex AFIP)
-- File: supabase/migrations/20260906000000_create_facturacion_arca.sql
-- Description: Creates tables for tenant ARCA configuration, invoices with
--   idempotency/lock/resilience, batch processing, immutable audit log,
--   and reconciliation queue. All tables have RLS enabled with tenant isolation.

-- ============================================================================
-- 1. TENANT ARCA CONFIGURATION
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.tenant_arca_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  cuit BIGINT NOT NULL,
  razon_social TEXT NOT NULL,
  condicion_iva TEXT NOT NULL CHECK (condicion_iva IN ('responsable_inscripto', 'monotributista', 'exento', 'no_responsable', 'consumidor_final')),
  punto_venta INTEGER NOT NULL CHECK (punto_venta > 0 AND punto_venta <= 99999),
  domicilio_comercial TEXT,
  inicio_actividades DATE,
  ingresos_brutos TEXT,
  cert_storage_path TEXT,
  key_storage_path TEXT,
  environment TEXT NOT NULL DEFAULT 'homologacion' CHECK (environment IN ('homologacion', 'produccion')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(tenant_id)
);

ALTER TABLE public.tenant_arca_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_arca_config_select ON public.tenant_arca_config;
CREATE POLICY tenant_arca_config_select ON public.tenant_arca_config
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_current_tenant_id());

DROP POLICY IF EXISTS tenant_arca_config_insert ON public.tenant_arca_config;
CREATE POLICY tenant_arca_config_insert ON public.tenant_arca_config
  FOR INSERT TO authenticated
  WITH CHECK (
    public.user_has_tenant_access(tenant_id)
    AND public.user_has_action_permission('facturacion', 'configurar')
  );

DROP POLICY IF EXISTS tenant_arca_config_update ON public.tenant_arca_config;
CREATE POLICY tenant_arca_config_update ON public.tenant_arca_config
  FOR UPDATE TO authenticated
  USING (
    public.user_has_tenant_access(tenant_id)
    AND public.user_has_action_permission('facturacion', 'configurar')
  )
  WITH CHECK (
    public.user_has_tenant_access(tenant_id)
    AND public.user_has_action_permission('facturacion', 'configurar')
  );

DROP POLICY IF EXISTS tenant_arca_config_delete ON public.tenant_arca_config;
CREATE POLICY tenant_arca_config_delete ON public.tenant_arca_config
  FOR DELETE TO authenticated
  USING (
    public.user_has_tenant_access(tenant_id)
    AND public.user_has_action_permission('facturacion', 'configurar')
  );


-- ============================================================================
-- 2. FACTURAS (INVOICES) — With idempotency, processing lock, and state machine
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.facturas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

  -- Idempotency key to prevent duplicate invoice creation
  idempotency_key UUID NOT NULL DEFAULT gen_random_uuid(),

  -- Invoice lifecycle state machine
  estado TEXT NOT NULL DEFAULT 'borrador' CHECK (estado IN (
    'borrador',        -- Data saved locally, not yet sent to ARCA
    'pendiente',       -- Being sent to ARCA (lock active)
    'autorizada',      -- CAE received successfully
    'rechazada',       -- ARCA rejected the voucher
    'error_conexion',  -- Network failure/timeout, needs reconciliation
    'anulada'          -- Voided by associated credit note
  )),

  -- Processing lock (prevents double submission)
  processing_lock_id UUID,
  processing_lock_at TIMESTAMPTZ,
  processing_attempts INTEGER DEFAULT 0,
  last_error_message TEXT,

  -- Voucher data
  tipo_comprobante INTEGER NOT NULL CHECK (tipo_comprobante IN (1, 2, 3, 6, 7, 8, 11, 12, 13, 99)),
  -- 1=Factura A, 6=Factura B, 11=Factura C
  -- 2=Nota Débito A, 7=Nota Débito B, 12=Nota Débito C
  -- 3=Nota Crédito A, 8=Nota Crédito B, 13=Nota Crédito C
  -- 99=Comprobante / Remito Interno X (No Fiscal)
  punto_venta INTEGER NOT NULL,
  numero_comprobante BIGINT, -- NULL until ARCA confirms
  fecha_emision DATE NOT NULL,
  concepto INTEGER NOT NULL DEFAULT 2 CHECK (concepto IN (1, 2, 3)),
  -- 1=Productos, 2=Servicios (default for SySO consultoras), 3=Ambos

  -- Service date range (required when concepto = 2 or 3)
  fecha_serv_desde DATE,
  fecha_serv_hasta DATE,
  fecha_vto_pago DATE,

  -- Receiver data
  receptor_doc_tipo INTEGER NOT NULL DEFAULT 99, -- 80=CUIT, 96=DNI, 99=Consumidor Final
  receptor_doc_nro BIGINT NOT NULL DEFAULT 0,
  receptor_razon_social TEXT,
  receptor_condicion_iva TEXT,
  receptor_domicilio TEXT,

  -- Amounts
  imp_neto NUMERIC(15,2) NOT NULL DEFAULT 0,
  imp_iva NUMERIC(15,2) NOT NULL DEFAULT 0,
  imp_total NUMERIC(15,2) NOT NULL DEFAULT 0,
  imp_tot_conc NUMERIC(15,2) DEFAULT 0,
  imp_op_ex NUMERIC(15,2) DEFAULT 0,
  imp_trib NUMERIC(15,2) DEFAULT 0,

  -- IVA detail (JSON array)
  detalle_iva JSONB, -- [{Id, BaseImp, Importe}]

  -- Description and line items
  descripcion TEXT,
  items JSONB, -- [{descripcion, cantidad, precio_unitario, subtotal, iva_porcentaje}]

  -- ARCA response fields (ONLY written by server)
  cae TEXT,
  cae_vencimiento DATE,
  resultado_arca TEXT CHECK (resultado_arca IS NULL OR resultado_arca IN ('A', 'R', 'P')),
  observaciones_arca TEXT,
  raw_response_arca JSONB, -- Full raw response from ARCA for audit trail

  -- Associations
  empresa_id UUID REFERENCES public.empresas(id) ON DELETE SET NULL,
  batch_id UUID, -- Links to facturas_batch for bulk invoicing
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  -- Constraints
  CONSTRAINT facturas_idempotency_unique UNIQUE(tenant_id, idempotency_key),
  CONSTRAINT facturas_comprobante_unique UNIQUE(tenant_id, tipo_comprobante, punto_venta, numero_comprobante)
);

-- Partial unique index: only one invoice can be in 'pendiente' state per lock
CREATE UNIQUE INDEX IF NOT EXISTS idx_facturas_processing_lock
  ON public.facturas(processing_lock_id)
  WHERE processing_lock_id IS NOT NULL AND estado = 'pendiente';

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_facturas_tenant_estado
  ON public.facturas(tenant_id, estado);
CREATE INDEX IF NOT EXISTS idx_facturas_tenant_fecha
  ON public.facturas(tenant_id, fecha_emision DESC);
CREATE INDEX IF NOT EXISTS idx_facturas_batch_id
  ON public.facturas(batch_id)
  WHERE batch_id IS NOT NULL;

ALTER TABLE public.facturas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS facturas_select ON public.facturas;
CREATE POLICY facturas_select ON public.facturas
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_current_tenant_id());

DROP POLICY IF EXISTS facturas_insert ON public.facturas;
CREATE POLICY facturas_insert ON public.facturas
  FOR INSERT TO authenticated
  WITH CHECK (
    public.user_has_tenant_access(tenant_id)
    AND public.user_has_action_permission('facturacion', 'emitir')
  );

DROP POLICY IF EXISTS facturas_update ON public.facturas;
CREATE POLICY facturas_update ON public.facturas
  FOR UPDATE TO authenticated
  USING (
    public.user_has_tenant_access(tenant_id)
    AND public.user_has_action_permission('facturacion', 'emitir')
  )
  WITH CHECK (
    public.user_has_tenant_access(tenant_id)
    AND public.user_has_action_permission('facturacion', 'emitir')
  );

-- No delete policy: invoices with CAE cannot be deleted (fiscal requirement)
DROP POLICY IF EXISTS facturas_delete ON public.facturas;
CREATE POLICY facturas_delete ON public.facturas
  FOR DELETE TO authenticated
  USING (
    public.user_has_tenant_access(tenant_id)
    AND public.user_has_action_permission('facturacion', 'emitir')
    AND estado = 'borrador' -- Only drafts can be deleted
  );


-- ============================================================================
-- 3. FACTURAS BATCH — Bulk invoicing from Excel
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.facturas_batch (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  nombre TEXT, -- Excel filename
  total_facturas INTEGER DEFAULT 0,
  facturas_exitosas INTEGER DEFAULT 0,
  facturas_fallidas INTEGER DEFAULT 0,
  facturas_pendientes INTEGER DEFAULT 0, -- Error de conexión, recuperables
  estado TEXT DEFAULT 'procesando' CHECK (estado IN (
    'procesando', 'completado', 'error', 'parcial', 'pausado'
  )),
  errores JSONB, -- [{fila, error, factura_id, recuperable}]
  excel_data_backup JSONB, -- Original Excel data for re-processing
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_facturas_batch_tenant
  ON public.facturas_batch(tenant_id);

ALTER TABLE public.facturas_batch ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS facturas_batch_select ON public.facturas_batch;
CREATE POLICY facturas_batch_select ON public.facturas_batch
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_current_tenant_id());

DROP POLICY IF EXISTS facturas_batch_insert ON public.facturas_batch;
CREATE POLICY facturas_batch_insert ON public.facturas_batch
  FOR INSERT TO authenticated
  WITH CHECK (
    public.user_has_tenant_access(tenant_id)
    AND public.user_has_action_permission('facturacion', 'emitir')
  );

DROP POLICY IF EXISTS facturas_batch_update ON public.facturas_batch;
CREATE POLICY facturas_batch_update ON public.facturas_batch
  FOR UPDATE TO authenticated
  USING (
    public.user_has_tenant_access(tenant_id)
    AND public.user_has_action_permission('facturacion', 'emitir')
  )
  WITH CHECK (
    public.user_has_tenant_access(tenant_id)
    AND public.user_has_action_permission('facturacion', 'emitir')
  );

-- Add FK reference from facturas.batch_id
ALTER TABLE public.facturas
  ADD CONSTRAINT facturas_batch_fk
  FOREIGN KEY (batch_id) REFERENCES public.facturas_batch(id) ON DELETE SET NULL;


-- ============================================================================
-- 4. FACTURACION AUDIT LOG — Immutable, append-only
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.facturacion_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  factura_id UUID REFERENCES public.facturas(id) ON DELETE SET NULL,
  batch_id UUID REFERENCES public.facturas_batch(id) ON DELETE SET NULL,

  -- Audited action
  accion TEXT NOT NULL CHECK (accion IN (
    'borrador_creado',
    'emision_iniciada',
    'emision_exitosa',
    'emision_rechazada',
    'emision_error_conexion',
    'reintento_iniciado',
    'reconciliacion_ejecutada',
    'reconciliacion_cae_encontrado',
    'reconciliacion_no_encontrado',
    'config_creada',
    'config_modificada',
    'certificado_actualizado',
    'entorno_cambiado',
    'batch_iniciado',
    'batch_completado',
    'batch_reintento_parcial',
    'factura_anulada',
    'borrador_eliminado'
  )),

  -- Details
  detalle JSONB,
  estado_anterior TEXT,
  estado_nuevo TEXT,

  -- Operation context
  ip_address TEXT,
  user_agent TEXT,

  -- Who and when
  performed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_log_tenant_date
  ON public.facturacion_audit_log(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_factura
  ON public.facturacion_audit_log(factura_id)
  WHERE factura_id IS NOT NULL;

ALTER TABLE public.facturacion_audit_log ENABLE ROW LEVEL SECURITY;

-- SELECT: only own tenant
DROP POLICY IF EXISTS audit_select_own ON public.facturacion_audit_log;
CREATE POLICY audit_select_own ON public.facturacion_audit_log
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_current_tenant_id());

-- INSERT: only own tenant (server will insert via authenticated client)
DROP POLICY IF EXISTS audit_insert_own ON public.facturacion_audit_log;
CREATE POLICY audit_insert_own ON public.facturacion_audit_log
  FOR INSERT TO authenticated
  WITH CHECK (public.user_has_tenant_access(tenant_id));

-- BLOCK UPDATE: audit log is append-only
DROP POLICY IF EXISTS audit_no_update ON public.facturacion_audit_log;
CREATE POLICY audit_no_update ON public.facturacion_audit_log
  FOR UPDATE TO authenticated
  USING (false);

-- BLOCK DELETE: audit log is append-only
DROP POLICY IF EXISTS audit_no_delete ON public.facturacion_audit_log;
CREATE POLICY audit_no_delete ON public.facturacion_audit_log
  FOR DELETE TO authenticated
  USING (false);

-- Trigger to block updates/deletes even from service_role
CREATE OR REPLACE FUNCTION public.prevent_audit_log_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'La tabla facturacion_audit_log es inmutable. No se permiten modificaciones ni eliminaciones.';
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_audit_update ON public.facturacion_audit_log;
CREATE TRIGGER trg_prevent_audit_update
  BEFORE UPDATE ON public.facturacion_audit_log
  FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_log_modification();

DROP TRIGGER IF EXISTS trg_prevent_audit_delete ON public.facturacion_audit_log;
CREATE TRIGGER trg_prevent_audit_delete
  BEFORE DELETE ON public.facturacion_audit_log
  FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_log_modification();


-- ============================================================================
-- 5. FACTURACION RECONCILIACION — Queue for connection-error invoices
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.facturacion_reconciliacion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  factura_id UUID NOT NULL REFERENCES public.facturas(id) ON DELETE CASCADE,
  estado TEXT DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'reconciliada', 'no_encontrada')),
  intentos INTEGER DEFAULT 0,
  ultimo_intento_at TIMESTAMPTZ,
  resultado JSONB,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_reconciliacion_tenant_estado
  ON public.facturacion_reconciliacion(tenant_id, estado);

ALTER TABLE public.facturacion_reconciliacion ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS reconciliacion_select ON public.facturacion_reconciliacion;
CREATE POLICY reconciliacion_select ON public.facturacion_reconciliacion
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_current_tenant_id());

DROP POLICY IF EXISTS reconciliacion_insert ON public.facturacion_reconciliacion;
CREATE POLICY reconciliacion_insert ON public.facturacion_reconciliacion
  FOR INSERT TO authenticated
  WITH CHECK (public.user_has_tenant_access(tenant_id));

DROP POLICY IF EXISTS reconciliacion_update ON public.facturacion_reconciliacion;
CREATE POLICY reconciliacion_update ON public.facturacion_reconciliacion
  FOR UPDATE TO authenticated
  USING (public.user_has_tenant_access(tenant_id))
  WITH CHECK (public.user_has_tenant_access(tenant_id));


-- ============================================================================
-- 6. TRIGGER: Auto-update updated_at on facturas and batch
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_facturacion_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_facturas_updated_at ON public.facturas;
CREATE TRIGGER trg_facturas_updated_at
  BEFORE UPDATE ON public.facturas
  FOR EACH ROW EXECUTE FUNCTION public.update_facturacion_updated_at();

DROP TRIGGER IF EXISTS trg_facturas_batch_updated_at ON public.facturas_batch;
CREATE TRIGGER trg_facturas_batch_updated_at
  BEFORE UPDATE ON public.facturas_batch
  FOR EACH ROW EXECUTE FUNCTION public.update_facturacion_updated_at();

DROP TRIGGER IF EXISTS trg_tenant_arca_config_updated_at ON public.tenant_arca_config;
CREATE TRIGGER trg_tenant_arca_config_updated_at
  BEFORE UPDATE ON public.tenant_arca_config
  FOR EACH ROW EXECUTE FUNCTION public.update_facturacion_updated_at();


-- ============================================================================
-- 7. Reload PostgREST schema cache
-- ============================================================================
NOTIFY pgrst, 'reload schema';
