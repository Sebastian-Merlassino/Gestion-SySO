'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RedirigirDetalle({ params }) {
  const router = useRouter();
  const tenantSlug = params['tenant-slug'];
  const id = params.id;

  useEffect(() => {
    router.replace(`/${tenantSlug}/protocolos/puesta-a-tierra?view=${id}`);
  }, [tenantSlug, id, router]);

  return null;
}
