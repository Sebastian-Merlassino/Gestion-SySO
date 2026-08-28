// src/lib/arca/arcaAudit.js
// Helper for registering actions in the facturacion_audit_log table

/**
 * Registers an action in the immutable facturacion_audit_log table.
 * 
 * @param {import('@supabase/supabase-js').SupabaseClient} supabaseClient - Authenticated Supabase client
 * @param {Object} params
 * @param {string} params.tenant_id - Tenant ID
 * @param {string} params.accion - Action type (e.g., 'emision_exitosa')
 * @param {string} [params.factura_id] - Related invoice ID
 * @param {string} [params.batch_id] - Related batch ID
 * @param {Object} [params.detalle] - Additional detail (JSON)
 * @param {string} [params.estado_anterior] - Previous state
 * @param {string} [params.estado_nuevo] - New state
 * @param {string} [params.ip_address] - Client IP address
 * @param {string} [params.user_agent] - Client user agent
 * @param {string} [params.performed_by] - User ID who performed the action
 */
export async function registrarAuditoria(supabaseClient, {
  tenant_id,
  accion,
  factura_id = null,
  batch_id = null,
  detalle = null,
  estado_anterior = null,
  estado_nuevo = null,
  ip_address = null,
  user_agent = null,
  performed_by = null,
}) {
  try {
    const { error } = await supabaseClient
      .from('facturacion_audit_log')
      .insert({
        tenant_id,
        factura_id,
        batch_id,
        accion,
        detalle: detalle ? JSON.parse(JSON.stringify(detalle)) : null,
        estado_anterior,
        estado_nuevo,
        ip_address,
        user_agent,
        performed_by,
      });

    if (error) {
      console.error('[ARCA Audit] Error al registrar auditoría:', error.message);
    }
  } catch (err) {
    // Audit failures should never block the main operation
    console.error('[ARCA Audit] Error inesperado en registrarAuditoria:', err.message);
  }
}

/**
 * Extracts client IP and User-Agent from a Next.js request
 */
export function extractRequestContext(request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';
  return { ip_address: ip, user_agent: userAgent };
}
