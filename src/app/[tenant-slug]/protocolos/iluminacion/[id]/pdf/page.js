// src/app/[tenant-slug]/protocolos/iluminacion/[id]/pdf/page.js
'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { generateLightingProtocolPdf } from '../../utils/pdfGenerator';
import { Loader2 } from 'lucide-react';

export default function ProtocoloPdfPage({ params }) {
  const tenantSlug = params['tenant-slug'];
  const protocolId = params.id;
  const [error, setError] = useState(null);

  useEffect(() => {
    const generateAndRedirect = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setError('No autorizado. Por favor inicie sesión.');
          return;
        }

        // 1. Fetch parent record
        const { data: proto, error: prErr } = await supabase
          .from('protocolos_iluminacion')
          .select('*')
          .eq('id', protocolId)
          .single();
        if (prErr || !proto) throw new Error('Protocolo no encontrado.');

        // 2. Fetch tenant
        const { data: tenant } = await supabase
          .from('tenants')
          .select('*')
          .eq('id', proto.tenant_id)
          .single();

        // 3. Fetch lookups
        const { data: empresas } = await supabase
          .from('empresas')
          .select('*')
          .eq('tenant_id', proto.tenant_id);

        const { data: allEstablecimientos } = await supabase
          .from('establecimientos')
          .select('*')
          .eq('tenant_id', proto.tenant_id);

        // 4. Fetch points
        const { data: pts } = await supabase
          .from('protocolos_iluminacion_puntos')
          .select('*, mediciones:protocolos_iluminacion_mediciones(*)')
          .eq('protocolo_id', protocolId)
          .order('orden');

        // 5. Fetch attachments
        const { data: adjs } = await supabase
          .from('protocolos_iluminacion_adjuntos')
          .select('*')
          .eq('protocolo_id', protocolId);

        // 6. Fetch logged profile
        const { data: userProf } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle();

        // 7. Generate PDF
        const doc = await generateLightingProtocolPdf(
          proto,
          tenant,
          empresas || [],
          allEstablecimientos || [],
          pts || [],
          adjs || [],
          false,
          userProf
        );

        // 7. Auto-print and open native viewer
        doc.autoPrint();
        const blobUrl = doc.output('bloburl');
        window.location.replace(blobUrl);
      } catch (err) {
        console.error(err);
        setError('Ocurrió un error al intentar generar la visualización del PDF.');
      }
    };

    generateAndRedirect();
  }, [protocolId]);

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center">
        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow max-w-sm space-y-3">
          <span className="text-red-500 font-extrabold text-sm block">⚠️ Error</span>
          <p className="text-xs text-slate-500">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      <Loader2 className="h-8 w-8 text-[#468DFF] animate-spin" />
      <p className="mt-3 text-slate-500 font-semibold text-xs">Preparando previsualización de impresión PDF...</p>
    </div>
  );
}
