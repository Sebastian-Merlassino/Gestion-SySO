// src/app/[tenant-slug]/protocolos/ruido/[id]/pdf/page.js
'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { generateNoiseProtocolPdf } from '../../utils/pdfGenerator';
import { Loader2 } from 'lucide-react';

export default function ProtocoloRuidoPdfPage({ params }) {
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

        const { data: proto, error: prErr } = await supabase
          .from('protocolos_ruido')
          .select('*')
          .eq('id', protocolId)
          .single();
        if (prErr || !proto) throw new Error('Protocolo no encontrado.');

        const { data: tenant } = await supabase
          .from('tenants')
          .select('*')
          .eq('id', proto.tenant_id)
          .single();

        const { data: empresas } = await supabase
          .from('empresas')
          .select('*')
          .eq('tenant_id', proto.tenant_id);

        const { data: allEstablecimientos } = await supabase
          .from('establecimientos')
          .select('*')
          .eq('tenant_id', proto.tenant_id);

        const { data: pts } = await supabase
          .from('protocolos_ruido_puntos')
          .select('*, mediciones:protocolos_ruido_mediciones(*)')
          .eq('protocolo_id', protocolId)
          .order('orden');

        const { data: adjs } = await supabase
          .from('protocolos_ruido_adjuntos')
          .select('*')
          .eq('protocolo_id', protocolId);

        const { data: userProf } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle();

        const doc = await generateNoiseProtocolPdf(
          proto,
          tenant,
          empresas || [],
          allEstablecimientos || [],
          pts || [],
          adjs || [],
          false,
          userProf
        );

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
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center space-y-3">
      <Loader2 className="h-8 w-8 animate-spin text-[#468DFF]" />
      <p className="text-xs font-semibold text-slate-600">Generando reporte PDF de Protocolo de Ruido...</p>
    </div>
  );
}
