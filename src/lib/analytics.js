// src/lib/analytics.js
import posthog from 'posthog-js';

/**
 * Identifica a un usuario en PostHog y asocia su tenant/empresa (Group Analytics).
 * 
 * @param {object} user - Datos del usuario { id, email, full_name, role }
 * @param {object} [tenant] - Datos del tenant { id, slug, name, plan_id }
 */
export function identifyUser(user, tenant = null) {
  try {
    if (!user || !user.id || typeof window === 'undefined') return;

    if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return;

    posthog.identify(user.id, {
      email: user.email,
      name: user.full_name,
      role: user.role,
      tenant_slug: tenant?.slug || null,
      tenant_plan: tenant?.plan_id || null,
    });

    if (tenant && tenant.id) {
      posthog.group('tenant', tenant.id, {
        name: tenant.name || tenant.slug,
        slug: tenant.slug,
        plan_id: tenant.plan_id || 'free',
      });
    }
  } catch (err) {
    // Fallo silencioso si AdBlocker está activo
  }
}

/**
 * Registra un evento de producto personalizado.
 * 
 * @param {string} eventName - Nombre del evento (ej: 'accidente_creado', 'protocolo_exportado_pdf')
 * @param {object} [properties] - Propiedades adicionales del evento
 */
export function trackEvent(eventName, properties = {}) {
  try {
    if (typeof window === 'undefined' || !process.env.NEXT_PUBLIC_POSTHOG_KEY) return;
    posthog.capture(eventName, properties);
  } catch (err) {
    // Fallo silencioso
  }
}

/**
 * Resetea la sesión de analíticas al cerrar sesión.
 */
export function resetAnalytics() {
  try {
    if (typeof window === 'undefined' || !process.env.NEXT_PUBLIC_POSTHOG_KEY) return;
    posthog.reset();
  } catch (err) {
    // Fallo silencioso
  }
}
