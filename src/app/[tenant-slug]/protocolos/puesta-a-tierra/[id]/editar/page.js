'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RedirigirEditar({ params }) {
  const router = useRouter();
  const tenantSlug = params['tenant-slug'];
  const id = params.id;

  useEffect(() => {
    router.replace(`/${tenantSlug}/protocolos/puesta-a-tierra?edit=${id}`);
  }, [tenantSlug, id, router]);

  return null;
}
