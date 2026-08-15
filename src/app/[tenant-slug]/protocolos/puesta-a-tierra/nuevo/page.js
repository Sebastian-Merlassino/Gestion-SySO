'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RedirigirNuevo({ params }) {
  const router = useRouter();
  const tenantSlug = params['tenant-slug'];

  useEffect(() => {
    router.replace(`/${tenantSlug}/protocolos/puesta-a-tierra?action=nuevo`);
  }, [tenantSlug, router]);

  return null;
}
