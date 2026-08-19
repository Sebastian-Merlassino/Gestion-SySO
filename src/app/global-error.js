// src/app/global-error.js
'use client';

import * as Sentry from '@sentry/nextjs';
import Error from 'next/error';
import { useEffect } from 'react';

export default function GlobalError({ error }) {
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      Sentry.captureException(error);
    }
  }, [error]);

  return (
    <html lang="es">
      <body className="flex min-h-screen items-center justify-center bg-slate-900 text-white p-6 text-center">
        <div className="max-w-md space-y-4">
          <h2 className="text-xl font-bold">Ocurrió un error inesperado</h2>
          <p className="text-sm text-slate-400">
            El incidente ha sido registrado automáticamente para ser resuelto por el equipo técnico.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-all"
          >
            Recargar Página
          </button>
        </div>
      </body>
    </html>
  );
}
