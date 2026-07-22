// src/app/[tenant-slug]/protocolos/iluminacion/[id]/page.js
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RedirigirDetalle({ params }) {
  const router = useRouter();
  const tenantSlug = params['tenant-slug'];
  const protocolId = params.id;

  useEffect(() => {
    router.replace(`/${tenantSlug}/protocolos/iluminacion?id=${protocolId}`);
  }, [tenantSlug, protocolId, router]);

  return null;
}
