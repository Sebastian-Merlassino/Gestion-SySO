// src/app/[tenant-slug]/protocolos/iluminacion/[id]/editar/page.js
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/providers/ToastProvider';
import AppPageHeader from '@/components/ui/AppPageHeader';
import ProtocoloForm from '../../components/ProtocoloForm';
import { Loader2 } from 'lucide-react';

export default function EditarProtocoloPage({ params }) {
  const tenantSlug = params['tenant-slug'];
  const protocolId = params.id;
  const router = useRouter();
  const globalToast = useToast();

  const [profile, setProfile] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const collapsed = localStorage.getItem('sidebar-collapsed');
    if (collapsed === 'true') {
      setIsSidebarCollapsed(true);
    }
  }, []);

  const toggleSidebar = () => {
    const newVal = !isSidebarCollapsed;
    setIsSidebarCollapsed(newVal);
    localStorage.setItem('sidebar-collapsed', String(newVal));
  };

  useEffect(() => {
    const initData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/login');
          return;
        }

        const { data: prof, error: pErr } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        if (pErr) throw pErr;
        setProfile(prof);

        const { data: ten, error: tErr } = await supabase
          .from('tenants')
          .select('*')
          .eq('slug', tenantSlug)
          .single();
        if (tErr || !ten) {
          router.push('/login');
          return;
        }
        setTenant(ten);

        setLoading(false);
      } catch (err) {
        console.error('Error al inicializar edicion de protocolo:', err);
        globalToast.toast('Error de autenticación.', 'error');
        setLoading(false);
      }
    };
    initData();
  }, [tenantSlug, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen bg-[#0D0D0D]/5">
        <Sidebar collapsed={isSidebarCollapsed} onToggle={toggleSidebar} />
        <main className="flex-1 flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 text-[#468DFF] animate-spin" />
          <span className="ml-3 text-slate-500 font-semibold text-sm">Cargando...</span>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#0D0D0D]/5 text-slate-800">
      <Sidebar collapsed={isSidebarCollapsed} onToggle={toggleSidebar} />

      <main className="flex-1 p-6 md:p-8 space-y-6 overflow-x-hidden">
        <AppPageHeader
          title="Editar Protocolo de Iluminación"
          description="Modifique desvíos, mediciones o anexos del protocolo seleccionado."
          breadcrumbs={[
            { label: 'Inicio', href: `/${tenantSlug}` },
            { label: 'Protocolo de Iluminación', href: `/${tenantSlug}/protocolos/iluminacion` },
            { label: 'Editar', active: true }
          ]}
        />

        <ProtocoloForm
          tenantSlug={tenantSlug}
          profile={profile}
          tenant={tenant}
          editingId={protocolId}
          mode="edit"
          onClose={() => router.push(`/${tenantSlug}/protocolos/iluminacion`)}
          onSaveSuccess={() => router.push(`/${tenantSlug}/protocolos/iluminacion`)}
        />
      </main>
    </div>
  );
}
