// src/lib/sentryUser.js
import * as Sentry from '@sentry/nextjs';

/**
 * Establece el contexto del usuario y del tenant en Sentry para asociar errores.
 * 
 * @param {object|null} user - Datos del usuario autenticado (id, email, full_name, role)
 * @param {object|null} [tenant] - Datos del tenant activo (id, slug, plan_id)
 */
export function setSentryUserContext(user, tenant = null) {
  try {
    if (!user) {
      Sentry.setUser(null);
      return;
    }

    Sentry.setUser({
      id: user.id,
      email: user.email,
      username: user.full_name || user.email,
    });

    if (tenant) {
      Sentry.setTag('tenant_id', tenant.id || tenant.slug);
      Sentry.setTag('tenant_slug', tenant.slug);
      Sentry.setTag('tenant_plan', tenant.plan_id || 'free');
    }

    if (user.role) {
      Sentry.setTag('user_role', user.role);
    }
  } catch (err) {
    // Fallo silencioso si Sentry no está inicializado o DSN ausente
  }
}

/**
 * Captura un error manualmente y lo envía a Sentry con contexto adicional.
 */
export function captureAppException(error, context = {}) {
  try {
    console.error('[App Error]', error, context);
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      Sentry.captureException(error, { extra: context });
    }
  } catch (err) {
    // Fallo silencioso
  }
}
