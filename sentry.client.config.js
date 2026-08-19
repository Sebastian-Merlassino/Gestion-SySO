// sentry.client.config.js
import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    // Ajustar tasa de muestreo de trazas de rendimiento
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
    
    // Tasa de repetición de sesión en caso de error (100% cuando hay error)
    replaysOnErrorSampleRate: 1.0,
    // Tasa de repetición de sesión general
    replaysSessionSampleRate: 0.1,

    integrations: [
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],

    // Ignorar errores comunes no críticos de extensiones del navegador
    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'Non-Error promise rejection captured',
      'chrome-extension://',
      'moz-extension://',
    ],
  });
}
