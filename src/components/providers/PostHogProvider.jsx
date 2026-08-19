// src/components/providers/PostHogProvider.jsx
'use client';

import React, { useEffect, Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import posthog from 'posthog-js';

function PostHogPageViewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (pathname && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
      let url = window.origin + pathname;
      if (searchParams && searchParams.toString()) {
        url = `${url}?${searchParams.toString()}`;
      }
      posthog.capture('$pageview', {
        $current_url: url,
      });
    }
  }, [pathname, searchParams]);

  return null;
}

export function PostHogProvider({ children }) {
  useEffect(() => {
    const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';

    if (posthogKey && typeof window !== 'undefined') {
      posthog.init(posthogKey, {
        api_host: posthogHost,
        person_profiles: 'identified_only',
        capture_pageview: false, // Controlado manualmente arriba para SPA
        capture_pageleave: true,
        autocapture: true,
        // Deshabilita features opcionales que intentan cargar assets externos
        // desde el CDN de PostHog y generan 404s en consola:
        disable_web_experiments: true,
        __preview_remote_config: false,
        session_recording: {
          maskAllInputs: true,
          maskInputOptions: {
            password: true,
          },
        },
        loaded: (ph) => {
          // Deshabilita plugins que cargan assets externos y causan 404s
          ph.set_config({
            disable_surveys: true,
          });
          if (process.env.NODE_ENV === 'development') {
            console.log('[PostHog] Inicializado correctamente.');
          }
        },
      });
    }
  }, []);

  return (
    <>
      <Suspense fallback={null}>
        <PostHogPageViewTracker />
      </Suspense>
      {children}
    </>
  );
}
