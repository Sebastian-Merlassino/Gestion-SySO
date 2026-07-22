// src/app/[tenant-slug]/protocolos/iluminacion/nuevo/page.js
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RedirigirNuevo({ params }) {
  const router = useRouter();
  const tenantSlug = params['tenant-slug'];

  useEffect(() => {
    router.replace(`/${tenantSlug}/protocolos/iluminacion?action=nuevo`);
  }, [tenantSlug, router]);

  return null;
}
