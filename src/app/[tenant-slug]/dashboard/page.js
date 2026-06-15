// src/app/[tenant-slug]/dashboard/page.js
'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Building, 
  Users, 
  FileText, 
  Calendar, 
  ShieldCheck, 
  User, 
  Settings, 
  LogOut, 
  Sparkles,
  Award,
  ArrowRight,
  TrendingUp,
  PlusCircle,
  HelpCircle,
  Loader2,
  Briefcase
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function TenantDashboard({ params }) {
  const tenantSlug = params['tenant-slug'];
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [tenant, setTenant] = useState(null);

  // Estadísticas ficticias/reales
  const [stats, setStats] = useState({
    clientsCount: 0,
    inspectionsCount: 0,
    complianceRate: 100,
    pendingVisits: 0
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          window.location.href = '/login';
          return;
        }
        setCurrentUser(user);

        // Cargar Perfil
        const { data: prof, error: pErr } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (pErr) throw pErr;
        setProfile(prof);

        // Cargar Tenant
        if (prof.tenant_id) {
          const { data: ten, error: tErr } = await supabase
            .from('tenants')
            .select('*')
            .eq('id', prof.tenant_id)
            .single();

          if (tErr) throw tErr;
          setTenant(ten);

          // Cargar cantidad real de clientes del tenant
          const { count, error: countErr } = await supabase
            .from('empresas') // Tabla de clientes
            .select('*', { count: 'exact', head: true })
            .eq('tenant_id', ten.id);
          
          let clientCountReal = 0;
          if (!countErr && count !== null) {
            clientCountReal = count;
          }

          setStats({
            clientsCount: clientCountReal,
            inspectionsCount: 4, // Mock
            complianceRate: 85, // Mock
            pendingVisits: 2 // Mock
          });
        }
        setLoading(false);
      } catch (err) {
        console.error('Error al cargar datos del dashboard:', err);
        // Si hay error en Supabase (ej. local development sin variables), mockeamos datos
        setIsMockMode();
      }
    };

    const setIsMockMode = () => {
      setCurrentUser({ email: 'profesional@gestion-syso.com' });
      setProfile({ full_name: 'Profesional de SySO', role: 'owner' });
      setTenant({ name: 'Consultora de Seguridad e Higiene', plan_id: 'free' });
      setStats({
        clientsCount: 1,
        inspectionsCount: 12,
        complianceRate: 92,
        pendingVisits: 3
      });
      setLoading(false);
    };

    // Verificar si las variables de Supabase están vacías
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl || supabaseUrl.includes('placeholder')) {
      setIsMockMode();
    } else {
      fetchDashboardData();
    }
  }, []);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      window.location.href = '/login';
    } catch (err) {
      window.location.href = '/login';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-[#468DFF] mx-auto" />
          <p className="text-xs text-slate-400">Generando tu área de trabajo...</p>
        </div>
      </div>
    );
  }

  const planNames = {
    free: 'Plan Gratis Permanente',
    basic_5: 'Plan 5 Empresas',
    standard_25: 'Plan 25 Empresas',
    libre: 'Plan Libre (Ilimitado)'
  };

  return (
    <div className="min-h-screen bg-[#D9D9D9] text-slate-700 flex font-sans">
      
      {/* Sidebar - Barra Lateral */}
      <aside className="w-64 bg-[#0D0D0D] flex flex-col justify-between shrink-0 hidden md:flex">
        <div className="p-6">
          {/* Logo Brand */}
          <div className="flex items-center gap-3 mb-8">
            <img 
              src="/brand/logo-primary.png" 
              alt="Logo Gestión SySO" 
              className="h-9 w-9 object-contain shrink-0" 
            />
            <span className="font-outfit text-base font-extrabold text-white tracking-tight block">Gestión SySO</span>
          </div>

          {/* Menú de navegación */}
          <nav className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 px-3 block mb-2">Panel principal</span>
            <a href="#" className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[#468DFF] text-white font-semibold text-sm transition-all shadow-md shadow-[#468DFF]/10">
              <Building className="h-4 w-4" />
              Dashboard Central
            </a>
            <a href={`/${tenantSlug}/empresas`} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-[#468DFF] font-semibold text-sm transition-all">
              <Users className="h-4 w-4" />
              Clientes
            </a>
            {(profile?.role === 'owner' || profile?.role === 'admin') && (
              <a href={`/${tenantSlug}/equipo`} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-[#468DFF] font-semibold text-sm transition-all">
                <Briefcase className="h-4 w-4" />
                Equipo de Trabajo
              </a>
            )}
            <a href="#" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-[#468DFF] font-semibold text-sm transition-all">
              <FileText className="h-4 w-4" />
              Inspecciones y Relevamientos
            </a>
            <a href="#" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-[#468DFF] font-semibold text-sm transition-all">
              <Calendar className="h-4 w-4" />
              Plan de Trabajo
            </a>
            
            <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 px-3 block pt-6 mb-2">Configuración</span>
            <a href={`/${tenantSlug}/profile`} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-[#468DFF] font-semibold text-sm transition-all">
              <Settings className="h-4 w-4" />
              Editar Perfil
            </a>
          </nav>
        </div>

        {/* Footer Sidebar */}
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center justify-between rounded-xl bg-black/40 p-3 border border-white/5">
            <div className="truncate pr-2">
              <span className="text-xs font-bold text-white block truncate">{profile?.full_name || 'Usuario'}</span>
              <span className="text-[10px] text-white/40 block truncate uppercase tracking-wider">{profile?.role || 'Profesional'}</span>
            </div>
            <button 
              onClick={handleLogout}
              title="Cerrar sesión"
              className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-600 hover:text-white transition-all cursor-pointer shrink-0"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        
        {/* Navbar */}
        <header className="h-16 border-b border-slate-300/60 flex items-center justify-between px-6 md:px-8 bg-white/80 backdrop-blur-md sticky top-0 z-20">
          <h2 className="font-outfit text-lg font-bold text-slate-900 flex items-center gap-2">
            <Building className="h-5 w-5 text-[#468DFF]" />
            {tenant?.name || 'Mi Consultora'}
          </h2>
          
          <div className="flex items-center gap-4">
            {/* Indicador de plan */}
            <span className="px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/25 text-[#468DFF] text-[10px] font-semibold uppercase tracking-wider hidden sm:inline-block">
              {planNames[tenant?.plan_id] || 'Plan Gratis'}
            </span>

            {/* Profile Link Movil */}
            <a href={`/${tenantSlug}/profile`} className="flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors bg-white hover:bg-slate-50 py-1.5 px-3 rounded-lg border border-slate-300/80 shadow-sm">
              <User className="h-3.5 w-3.5 text-slate-500" />
              Mi Perfil
            </a>
          </div>
        </header>

        {/* Dashboard Grid */}
        <div className="p-6 md:p-8 space-y-8 max-w-5xl">
          
          {/* Welcome Banner */}
          <div className="relative rounded-2xl border border-blue-500/15 bg-gradient-to-br from-blue-50 to-indigo-50/30 p-6 md:p-8 overflow-hidden shadow-sm">
            <div className="absolute top-[-20%] right-[-10%] w-[300px] h-[300px] rounded-full bg-[#468DFF]/10 blur-3xl pointer-events-none" />
            
            <div className="max-w-xl space-y-3 relative z-10">
              <span className="px-2 py-0.5 rounded-full bg-[#468DFF]/10 border border-[#468DFF]/20 text-[#468DFF] text-[10px] font-bold uppercase tracking-wider">
                Bienvenido al Sistema
              </span>
              <h1 className="font-outfit text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
                ¡Hola, {profile?.full_name || 'Profesional'}!
              </h1>
              <p className="text-xs md:text-sm text-slate-600 leading-relaxed font-normal">
                Desde este panel central de la plataforma **SaaS de Gestión SySO** podrás gestionar la higiene y seguridad de tus empresas clientes, llevar checklists de inspecciones, cargar actas digitales con tu firma e institucionalizar tu marca.
              </p>
              <div className="pt-2 flex flex-wrap gap-3">
                <a 
                  href={`/${tenantSlug}/profile`}
                  className="py-2 px-4 rounded-xl bg-[#468DFF] hover:bg-[#0511F2] text-white text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-blue-500/10 active:scale-[0.98]"
                >
                  Configurar Firma y Matrícula
                  <ArrowRight className="h-3.5 w-3.5" />
                </a>
                <button
                  onClick={() => confetti()}
                  className="py-2 px-4 rounded-xl border border-slate-300/80 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 text-xs font-bold transition-all shadow-sm"
                >
                  Celebrar Inicio
                </button>
              </div>
            </div>
          </div>

          {/* Cards de Métricas */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            
            <div className="bg-white border border-slate-200/85 rounded-xl p-5 relative overflow-hidden group hover:border-[#468DFF]/30 transition-all shadow-sm">
              <div className="text-slate-400 group-hover:text-[#468DFF] transition-colors mb-3">
                <Users className="h-6 w-6" />
              </div>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">Clientes</span>
              <span className="font-outfit text-3xl font-extrabold text-slate-900 block mt-1">{stats.clientsCount}</span>
              <span className="text-[10px] text-slate-400 block mt-2">
                {tenant?.plan_id === 'free' ? 'Límite: 1 empresa (Plan Gratis)' : 'Habilitado por tu plan'}
              </span>
            </div>

            <div className="bg-white border border-slate-200/85 rounded-xl p-5 relative overflow-hidden group hover:border-[#468DFF]/30 transition-all shadow-sm">
              <div className="text-slate-400 group-hover:text-[#468DFF] transition-colors mb-3">
                <FileText className="h-6 w-6" />
              </div>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">Inspecciones</span>
              <span className="font-outfit text-3xl font-extrabold text-slate-900 block mt-1">{stats.inspectionsCount}</span>
              <span className="text-[10px] text-slate-400 block mt-2">Relevamientos generados</span>
            </div>

            <div className="bg-white border border-slate-200/85 rounded-xl p-5 relative overflow-hidden group hover:border-[#468DFF]/30 transition-all shadow-sm">
              <div className="text-slate-400 group-hover:text-emerald-500 transition-colors mb-3">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">% Cumplimiento</span>
              <span className="font-outfit text-3xl font-extrabold text-emerald-500 block mt-1">{stats.complianceRate}%</span>
              <span className="text-[10px] text-slate-400 block mt-2">Nivel de cumplimiento global</span>
            </div>

            <div className="bg-white border border-slate-200/85 rounded-xl p-5 relative overflow-hidden group hover:border-[#468DFF]/30 transition-all shadow-sm">
              <div className="text-slate-400 group-hover:text-amber-500 transition-colors mb-3">
                <Calendar className="h-6 w-6" />
              </div>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">Pendientes</span>
              <span className="font-outfit text-3xl font-extrabold text-slate-900 block mt-1">{stats.pendingVisits}</span>
              <span className="text-[10px] text-slate-400 block mt-2">Visitas de control agendadas</span>
            </div>

          </div>

          {/* Secciones de Trabajo y Acciones Rápidas */}
          <div className="grid md:grid-cols-3 gap-6">
            
            {/* Listado de accesos rápidos */}
            <div className="md:col-span-2 bg-white border border-slate-200/80 rounded-2xl p-6 space-y-4 shadow-sm">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="h-4.5 w-4.5 text-[#468DFF]" />
                Accesos rápidos
              </h3>

              <div className="grid md:grid-cols-2 gap-4">
                
                <a href={`/${tenantSlug}/empresas?new=true`} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-[#468DFF]/5 hover:border-[#468DFF]/30 transition-all flex items-start gap-3 group">
                  <div className="p-2 rounded-lg bg-blue-500/10 text-[#468DFF] shrink-0 mt-0.5">
                    <PlusCircle className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-800 block group-hover:text-[#468DFF] transition-colors">Nueva Empresa</span>
                    <span className="text-[10px] text-slate-500 block mt-1">Registrar una empresa cliente en tu base.</span>
                  </div>
                </a>

                <a href="#" className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-[#468DFF]/5 hover:border-[#468DFF]/30 transition-all flex items-start gap-3 group">
                  <div className="p-2 rounded-lg bg-blue-500/10 text-[#468DFF] shrink-0 mt-0.5">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-800 block group-hover:text-[#468DFF] transition-colors">Nueva Auditoría</span>
                    <span className="text-[10px] text-slate-500 block mt-1">Completar un informe de relevamiento general.</span>
                  </div>
                </a>

                <a href={`/${tenantSlug}/profile`} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-[#468DFF]/5 hover:border-[#468DFF]/30 transition-all flex items-start gap-3 group">
                  <div className="p-2 rounded-lg bg-blue-500/10 text-[#468DFF] shrink-0 mt-0.5">
                    <User className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-800 block group-hover:text-[#468DFF] transition-colors">Mi Perfil Profesional</span>
                    <span className="text-[10px] text-slate-500 block mt-1">Configurar tu matrícula, firma digital y logos.</span>
                  </div>
                </a>

                <a href="#" className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-[#468DFF]/5 hover:border-[#468DFF]/30 transition-all flex items-start gap-3 group">
                  <div className="p-2 rounded-lg bg-blue-500/10 text-[#468DFF] shrink-0 mt-0.5">
                    <HelpCircle className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-800 block group-hover:text-[#468DFF] transition-colors">Centro de Soporte</span>
                    <span className="text-[10px] text-slate-500 block mt-1">Acceder a preguntas y ayuda técnica.</span>
                  </div>
                </a>

              </div>
            </div>

            {/* Sidebar info plan */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 flex flex-col justify-between space-y-6 shadow-sm">
              <div className="space-y-4">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Award className="h-4.5 w-4.5 text-[#468DFF]" />
                  Tu plan contratado
                </h3>

                <div className="rounded-xl border border-blue-500/15 bg-blue-50/40 p-4 space-y-3">
                  <span className="px-2 py-0.5 rounded-full bg-blue-500/15 text-[#468DFF] text-[8px] font-bold uppercase tracking-wider">
                    Suscripción Activa
                  </span>
                  <h4 className="text-sm font-bold text-slate-800">{planNames[tenant?.plan_id] || 'Plan Gratis'}</h4>
                  <p className="text-[10px] text-slate-600 leading-normal">
                    {tenant?.plan_id === 'free' && 'El Plan Gratis te permite cargar 1 empresa cliente para evaluar las herramientas del SaaS.'}
                    {tenant?.plan_id === 'basic_5' && 'Tienes habilitado el soporte de hasta 5 empresas en simultáneo.'}
                    {tenant?.plan_id === 'standard_25' && 'Tienes habilitado el soporte de hasta 25 empresas en simultáneo.'}
                    {tenant?.plan_id === 'libre' && 'Tienes empresas y inspectores ilimitados habilitados.'}
                  </p>
                </div>
              </div>

              <a 
                href={`/${tenantSlug}/profile`}
                className="w-full py-2.5 px-4 rounded-xl border border-[#468DFF]/40 hover:bg-[#468DFF] hover:text-white text-center text-[#468DFF] font-semibold text-xs transition-all flex items-center justify-center gap-2 shrink-0"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Cambiar / Subir de Plan
              </a>
            </div>

          </div>

        </div>

      </main>

    </div>
  );
}
