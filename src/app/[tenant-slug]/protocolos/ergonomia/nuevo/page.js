// src/app/[tenant-slug]/protocolos/ergonomia/nuevo/page.js
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RedirigirNuevo({ params }) {
  const router = useRouter();
  const tenantSlug = params['tenant-slug'];

  useEffect(() => {
    router.replace(`/${tenantSlug}/protocolos/ergonomia?action=nuevo`);
  }, [tenantSlug, router]);

  return null;
}
