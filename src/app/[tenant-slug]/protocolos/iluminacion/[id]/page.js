// src/app/[tenant-slug]/protocolos/iluminacion/[id]/page.js
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/providers/ToastProvider';
import AppPageHeader from '@/components/ui/AppPageHeader';
import ProtocoloForm from '../components/ProtocoloForm';
import AppFormNavigator from '@/components/ui/AppFormNavigator';
import AppUnsavedChangesDialog from '@/components/ui/AppUnsavedChangesDialog';
import { Loader2, Sun } from 'lucide-react';

export default function VerProtocoloPage({ params }) {
  const tenantSlug = params['tenant-slug'];
  const protocolId = params.id;
  const router = useRouter();
  const globalToast = useToast();

  const [profile, setProfile] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [formMode, setFormMode] = useState('view');

  // Estado para la navegación lateral (AppFormNavigator)
  const [protocolos, setProtocolos] = useState([]);
  const [isFormDirty, setIsFormDirty] = useState(false);

  // Estado para el control de salida por Sidebar
  const [pendingRoute, setPendingRoute] = useState(null);
  const [unsavedDialogOpen, setUnsavedDialogOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const handleSidebarNavigation = (e, path) => {
    setIsMobileMenuOpen(false);
    if (isFormDirty) {
      e.preventDefault(); // Detener la navegación automática
      setPendingRoute(path);
      setUnsavedDialogOpen(true);
    }
  };

  const handleConfirmLeave = () => {
    setUnsavedDialogOpen(false);
    if (pendingRoute) {
      router.push(pendingRoute);
    }
  };

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

        // Cargar lista simplificada de protocolos del tenant para el navegador lateral
        const { data: protosData, error: protosErr } = await supabase
          .from('protocolos_iluminacion')
          .select('id, fecha_medicion')
          .eq('tenant_id', ten.id)
          .order('fecha_medicion', { ascending: false });

        if (!protosErr && protosData) {
          setProtocolos(protosData);
        }

        setLoading(false);
      } catch (err) {
        console.error('Error al inicializar ver protocolo:', err);
        globalToast.toast('Error de autenticación.', 'error');
        setLoading(false);
      }
    };
    initData();
  }, [tenantSlug, router]);

  if (loading) {
    return (
      <div className="h-screen overflow-hidden bg-syso-bg text-slate-700 flex font-sans">
        <Sidebar
          tenantSlug={tenantSlug}
          profile={profile}
          currentSection="protocolo-iluminacion"
          isSidebarCollapsed={isSidebarCollapsed}
          toggleSidebar={toggleSidebar}
          isMobileMenuOpen={isMobileMenuOpen}
          setIsMobileMenuOpen={setIsMobileMenuOpen}
          handleLogout={handleLogout}
          onNavigate={handleSidebarNavigation}
        />
        <main className="flex-grow flex flex-col min-w-0 overflow-y-auto">
          <AppPageHeader
            title="Detalle del Protocolo de Iluminación"
            icon={Sun}
            tenantName={tenant?.name || 'Cargando...'}
            planId={tenant?.plan_id}
            showPlanBadge={profile && profile.role !== 'cliente'}
            setIsMobileMenuOpen={setIsMobileMenuOpen}
          />
          <div className="flex-grow flex items-center justify-center p-8">
            <div className="text-center space-y-4">
              <Loader2 className="h-10 w-10 animate-spin text-[#468DFF] mx-auto" />
              <p className="text-xs text-slate-500 font-medium">Cargando...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden bg-syso-bg text-slate-700 flex font-sans">
      <Sidebar
        tenantSlug={tenantSlug}
        profile={profile}
        currentSection="protocolo-iluminacion"
        isSidebarCollapsed={isSidebarCollapsed}
        toggleSidebar={toggleSidebar}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
        handleLogout={handleLogout}
        onNavigate={handleSidebarNavigation}
      />

      <main className="flex-grow flex flex-col min-w-0 overflow-y-auto">
        <AppPageHeader
          title="Detalle del Protocolo de Iluminación"
          icon={Sun}
          tenantName={tenant?.name || 'Cargando...'}
          planId={tenant?.plan_id}
          showPlanBadge={profile && profile.role !== 'cliente'}
          setIsMobileMenuOpen={setIsMobileMenuOpen}
        />

        <div className="max-w-[95%] mx-auto w-full py-8 px-4 md:px-0 flex-grow flex flex-col min-h-0">
          <ProtocoloForm
            tenantSlug={tenantSlug}
            profile={profile}
            tenant={tenant}
            editingId={protocolId}
            mode={formMode}
            onClose={() => router.push(`/${tenantSlug}/protocolos/iluminacion`)}
            onSaveSuccess={() => {
              setIsFormDirty(false);
              router.push(`/${tenantSlug}/protocolos/iluminacion`);
            }}
            onEdit={() => setFormMode('edit')}
            onDirtyChange={setIsFormDirty}
          />
        </div>
      </main>

      {/* Navegador Lateral de registros (Anterior / Siguiente) */}
      <AppFormNavigator
        activeList={protocolos}
        currentId={protocolId}
        onNavigate={(newRecord) => {
          setIsFormDirty(false); // Resetear estado dirty al navegar lateralmente
          router.push(`/${tenantSlug}/protocolos/iluminacion/${newRecord.id}`);
          setFormMode('view'); // Volver al modo lectura
        }}
        hasUnsavedChanges={isFormDirty}
        isFormOpen={true}
      />

      {/* Diálogo de cambios sin guardar para salida por Sidebar */}
      <AppUnsavedChangesDialog
        open={unsavedDialogOpen}
        onOpenChange={setUnsavedDialogOpen}
        onLeave={handleConfirmLeave}
        title="Cambios sin guardar"
        description="Tenés cambios sin guardar. Si abandonás esta sección ahora, perderás las modificaciones realizadas."
        leaveText="Abandonar sin guardar"
        stayText="Quedarse aquí"
      />
    </div>
  );
}
