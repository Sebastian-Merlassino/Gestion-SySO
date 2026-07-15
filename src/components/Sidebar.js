import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { getEffectivePlan } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { 
  Building, 
  Users, 
  Briefcase, 
  Calendar, 
  GraduationCap, 
  ClipboardList, 
  Flame, 
  ClipboardCheck, 
  AlertTriangle, 
  Folder, 
  Settings, 
  LogOut, 
  ChevronLeft, 
  ChevronRight, 
  X,
  ShieldAlert,
  Zap,
  Lock
} from 'lucide-react';

let isHydratedGlobal = false;
let cachedTenantGlobal = null;

export default function Sidebar({
  tenantSlug,
  profile,
  currentSection,
  isSidebarCollapsed,
  toggleSidebar,
  isMobileMenuOpen,
  setIsMobileMenuOpen,
  handleLogout,
  onNavigate
}) {
  const [mounted, setMounted] = useState(isHydratedGlobal);
  const [modalAlert, setModalAlert] = useState({ show: false, title: '', message: '', onConfirm: null });
  const [tenantData, setTenantData] = useState(cachedTenantGlobal);

  useEffect(() => {
    if (!isHydratedGlobal) {
      isHydratedGlobal = true;
      setMounted(true);
    }
  }, []);

  useEffect(() => {
    if (!tenantSlug) return;

    // 1. Intentar cargar síncronamente de la caché local primero para evitar parpadeos
    if (typeof window !== 'undefined') {
      const cached = sessionStorage.getItem(`tenant-data-${tenantSlug}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        cachedTenantGlobal = parsed;
        if (JSON.stringify(parsed) !== JSON.stringify(tenantData)) {
          setTenantData(parsed);
        }
      }
    }

    // 2. Traer datos frescos de Supabase de forma paralela
    const fetchTenantData = async () => {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      if (!supabaseUrl || supabaseUrl.includes('placeholder')) {
        const fallback = { plan_id: 'free' };
        cachedTenantGlobal = fallback;
        setTenantData(fallback);
        return;
      }
      try {
        const { data, error } = await supabase
          .from('tenants')
          .select('plan_id, plan_ends_at, is_exempt, gift_plan_id, gift_ends_at')
          .eq('slug', tenantSlug)
          .single();
        if (!error && data) {
          cachedTenantGlobal = data;
          setTenantData(data);
          sessionStorage.setItem(`tenant-data-${tenantSlug}`, JSON.stringify(data));
        }
      } catch (err) {
        console.error('Error fetching tenant for sidebar:', err);
      }
    };
    fetchTenantData();
  }, [tenantSlug]);

  
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', path: `/${tenantSlug}/dashboard`, icon: Building },
    { id: 'empresas', label: 'Clientes', path: `/${tenantSlug}/empresas`, icon: Users, adminOnly: true },
    { id: 'equipo', label: 'Equipo de Trabajo', path: `/${tenantSlug}/equipo`, icon: Briefcase, adminOnly: true },
    { id: 'divider-1', type: 'divider' },
    { id: 'programa', label: 'Prog. Gestión Anual', path: `/${tenantSlug}/programa`, icon: Calendar },
    { id: 'capacitacion', label: 'Prog. Capacitación Anual', path: `/${tenantSlug}/capacitacion`, icon: GraduationCap },
    { id: 'correctivas', label: 'Acciones Correctivas', path: `/${tenantSlug}/correctivas`, icon: ClipboardList },
    { id: 'accidentes', label: 'Accidentes', path: `/${tenantSlug}/accidentes`, icon: ShieldAlert },
    { id: 'matriz-riesgos', label: 'Matriz de riesgos', path: `/${tenantSlug}/matriz-riesgos`, icon: AlertTriangle },
    { id: 'extintores', label: 'Extintores', path: `/${tenantSlug}/extintores`, icon: Flame },
    { id: 'control-electrico', label: 'Control Eléctrico', path: `/${tenantSlug}/control-electrico`, icon: Zap },
    { id: 'visitas', label: 'Constancia de Visita', path: `/${tenantSlug}/visitas`, icon: ClipboardCheck },
    { id: 'avisos', label: 'Aviso de Riesgo', path: `/${tenantSlug}/avisos`, icon: AlertTriangle },
    { id: 'checklist-personalizados', label: 'Checklist Personalizados', path: `/${tenantSlug}/checklist-personalizados`, icon: ClipboardCheck },
    { id: 'legajo', label: 'Legajo Técnico', path: `/${tenantSlug}/legajo`, icon: Folder },
    { id: 'nomina', label: 'Nómina de Personal', path: `/${tenantSlug}/nomina`, icon: Users },
    { id: 'divider-2', type: 'divider' },
    { id: 'profile', label: 'Editar Perfil', path: `/${tenantSlug}/profile`, icon: Settings, shrink: true }
  ];

  // Obtener plan efectivo del tenant
  const tenant = tenantData || profile?.tenants;
  let effectivePlan = 'free';
  if (tenant) {
    if (tenant.is_exempt) {
      effectivePlan = 'libre';
    } else if (tenant.gift_plan_id && tenant.gift_ends_at && new Date(tenant.gift_ends_at) > new Date()) {
      effectivePlan = tenant.gift_plan_id;
    } else if (tenant.plan_ends_at && new Date(tenant.plan_ends_at) < new Date()) {
      effectivePlan = 'free';
    } else {
      effectivePlan = tenant.plan_id || 'free';
    }
  }

  const planFeatures = {
    free: ['programa', 'capacitacion', 'correctivas', 'accidentes', 'matriz-riesgos', 'nomina', 'dashboard', 'profile', 'empresas', 'equipo'],
    basic_5: ['programa', 'capacitacion', 'correctivas', 'accidentes', 'matriz-riesgos', 'nomina', 'dashboard', 'profile', 'extintores', 'control-electrico', 'empresas', 'equipo'],
    standard_25: ['programa', 'capacitacion', 'correctivas', 'accidentes', 'matriz-riesgos', 'nomina', 'dashboard', 'profile', 'extintores', 'control-electrico', 'visitas', 'avisos', 'empresas', 'equipo'],
    libre: ['programa', 'capacitacion', 'correctivas', 'accidentes', 'matriz-riesgos', 'nomina', 'dashboard', 'profile', 'extintores', 'control-electrico', 'visitas', 'avisos', 'checklist-personalizados', 'legajo', 'portal-clientes', 'empresas', 'equipo']
  };

  const allowedFeatures = planFeatures[effectivePlan] || planFeatures.free;

  const handleLinkClick = (e, item) => {
    if (item.type === 'divider') return;

    if (!allowedFeatures.includes(item.id)) {
      e.preventDefault();
      setModalAlert({
        show: true,
        title: 'Límite de Plan Excedido',
        message: `Tu plan actual no incluye acceso a la sección de ${item.label}. Por favor actualiza tu suscripción en el Perfil para habilitar esta funcionalidad.`,
        onConfirm: () => {
          window.location.href = `/${tenantSlug}/profile?upgrade=true`;
        }
      });
      return;
    }

    if (onNavigate) {
      onNavigate(e, item.path);
    }
  };

  const renderLink = (item, isMobile = false) => {
    if (item.adminOnly) {
      if (!mounted) return null;
      if (profile && profile.role === 'cliente') {
        return null;
      }
    }

    if (item.type === 'divider') {
      return <div key={item.id} className="h-px bg-white/10 my-4 shrink-0" />;
    }

    const Icon = item.icon;
    const isAllowed = !mounted ? true : allowedFeatures.includes(item.id);
    const isActive = isAllowed && currentSection === item.id;
    const isCollapsed = !isMobile && isSidebarCollapsed;

    return (
      <Link
        key={item.id}
        href={item.path}
        title={isAllowed ? item.label : `${item.label} (Módulo Premium)`}
        onClick={(e) => {
          if (isMobile) setIsMobileMenuOpen(false);
          handleLinkClick(e, item);
        }}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold text-sm transition-all shrink-0 ${
          isActive 
            ? 'bg-[#468DFF] text-white shadow-md shadow-[#468DFF]/10' 
            : !isAllowed
              ? 'text-white/35 hover:text-white/60 hover:bg-white/5 cursor-pointer'
              : 'text-white/70 hover:text-white hover:bg-[#468DFF]'
        } ${isCollapsed ? 'justify-center' : ''} ${item.shrink ? 'shrink-0' : ''}`}
      >
        <Icon className={`h-4 w-4 shrink-0 ${!isAllowed ? 'opacity-40' : ''}`} />
        {(!isCollapsed) && (
          <span className="animate-fade-in leading-tight">{item.label}</span>
        )}
        {(!isAllowed && !isCollapsed) && (
          <Lock className="h-3 w-3 text-[#468DFF]/70 ml-auto shrink-0 animate-fade-in" />
        )}
      </Link>
    );
  };

  return (
    <>
      {/* SIDEBAR ESCRITORIO */}
      <aside className={`bg-[#0D0D0D] flex flex-col justify-between shrink-0 hidden md:flex transition-all duration-300 ${isSidebarCollapsed ? 'w-20' : 'w-64'}`}>
        <div className="p-6 flex flex-col flex-1 min-h-0">
          
          {/* Logo */}
          <div className={`flex items-center justify-between gap-3 mb-8 shrink-0 ${isSidebarCollapsed ? 'flex-col' : ''}`}>
            <div className="flex items-center gap-3">
              <img src="/brand/logo-primary.png" alt="Logo" className="h-9 w-9 object-contain shrink-0" />
              {!isSidebarCollapsed && (
                <span className="text-base font-extrabold tracking-tight block animate-fade-in">
                  <span className="text-[#468DFF]" style={{ fontFamily: "'Virgo 01', 'Virgo01', 'Virgo', sans-serif" }}>GESTION</span>
                  <span className="text-white ml-1" style={{ fontFamily: "'Audiowide', sans-serif" }}>SySO</span>
                </span>
              )}
            </div>
            <button
              onClick={toggleSidebar}
              title={isSidebarCollapsed ? "Expandir barra lateral" : "Contraer barra lateral"}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all cursor-pointer"
            >
              {isSidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          </div>

          {/* Menú de Navegación */}
          <nav className="flex-1 overflow-y-auto sidebar-scrollbar space-y-1.5 min-h-0">
            {menuItems.map(item => renderLink(item, false))}
          </nav>
        </div>

        {/* Footer Sidebar */}
        <div className="p-4 border-t border-white/10 shrink-0 flex flex-col gap-2">
          <div className={`flex items-center justify-between rounded-xl bg-black/40 p-3 border border-white/5 ${isSidebarCollapsed ? 'flex-col gap-2' : ''}`}>
            {!isSidebarCollapsed && (
              <div className="truncate pr-2">
                <span className="text-xs font-bold text-white block truncate" suppressHydrationWarning>{mounted && profile?.full_name ? profile.full_name : 'Usuario'}</span>
                <span className="text-[10px] text-white/40 block truncate uppercase tracking-wider" suppressHydrationWarning>{mounted && profile?.role ? profile.role : 'Profesional'}</span>
              </div>
            )}
            <button onClick={handleLogout} className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-600 hover:text-white transition-all cursor-pointer shrink-0" title="Cerrar Sesión">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
          {!isSidebarCollapsed && (
            <div className="flex flex-col gap-1 items-center justify-center pt-2 px-1 text-[10px] text-white/35 font-medium border-t border-white/5">
              <div className="flex gap-2">
                <Link href="/terminos" target="_blank" className="hover:text-white/60 hover:underline transition-all">Términos</Link>
                <span>•</span>
                <Link href="/privacidad" target="_blank" className="hover:text-white/60 hover:underline transition-all">Privacidad</Link>
                <span>•</span>
                <Link href="/cookies" target="_blank" className="hover:text-white/60 hover:underline transition-all">Cookies</Link>
              </div>
              <a href="mailto:soporte@gestionsyso.com" className="text-[#468DFF]/80 hover:text-[#468DFF] hover:underline transition-all text-[9px] mt-0.5">
                soporte@gestionsyso.com
              </a>
            </div>
          )}
        </div>
      </aside>

      {/* MOBILE HEADER & DRAWER */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300"
          />
          <aside className="relative flex-1 flex flex-col max-w-xs w-full bg-[#0D0D0D] p-6 justify-between animate-scaleUp animate-fade-in-right">
            <div className="absolute top-4 right-4 z-20">
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="flex flex-col flex-1 min-h-0">
              <div className="flex items-center gap-3 mb-8 shrink-0">
                <img src="/brand/logo-primary.png" alt="Logo" className="h-9 w-9 object-contain shrink-0" />
                <span className="text-base font-extrabold tracking-tight">
                  <span className="text-[#468DFF]" style={{ fontFamily: "'Virgo 01', 'Virgo01', 'Virgo', sans-serif" }}>GESTION</span>
                  <span className="text-white ml-1" style={{ fontFamily: "'Audiowide', sans-serif" }}>SySO</span>
                </span>
              </div>
              <nav className="flex-1 overflow-y-auto sidebar-scrollbar space-y-1.5 min-h-0">
                {menuItems.map(item => renderLink(item, true))}
              </nav>
            </div>

            <div className="pt-4 border-t border-white/10 shrink-0 flex flex-col gap-3">
              <div className="flex items-center justify-between rounded-xl bg-black/40 p-3 border border-white/5">
                <div className="truncate pr-2">
                  <span className="text-xs font-bold text-white block truncate" suppressHydrationWarning>{mounted && profile?.full_name ? profile.full_name : 'Usuario'}</span>
                  <span className="text-[10px] text-white/40 block truncate uppercase tracking-wider" suppressHydrationWarning>{mounted && profile?.role ? profile.role : 'Profesional'}</span>
                </div>
                <button onClick={handleLogout} className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-600 hover:text-white transition-all cursor-pointer shrink-0">
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
              <div className="flex flex-col gap-1 items-center justify-center pt-2 px-1 text-[10px] text-white/35 font-medium border-t border-white/5">
                <div className="flex gap-2">
                  <Link href="/terminos" target="_blank" className="hover:text-white/60 hover:underline transition-all">Términos</Link>
                  <span>•</span>
                  <Link href="/privacidad" target="_blank" className="hover:text-white/60 hover:underline transition-all">Privacidad</Link>
                  <span>•</span>
                  <Link href="/cookies" target="_blank" className="hover:text-white/60 hover:underline transition-all">Cookies</Link>
                </div>
                <a href="mailto:soporte@gestionsyso.com" className="text-[#468DFF]/80 hover:text-[#468DFF] hover:underline transition-all text-[9px] mt-0.5">
                  soporte@gestionsyso.com
                </a>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* MODAL DIALOG ALERT EN SIDEBAR */}
      {modalAlert.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xl max-w-sm w-full animate-scale-up space-y-4 text-center">
            <div className="mx-auto p-3 rounded-full w-12 h-12 flex items-center justify-center bg-amber-50 text-amber-500">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h4 className="font-outfit text-base font-bold text-slate-800">{modalAlert.title}</h4>
              <p className="text-xs text-slate-500 leading-relaxed">{modalAlert.message}</p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setModalAlert({ show: false, title: '', message: '', onConfirm: null })}
                className="flex-1 py-2.5 bg-white border border-[#468DFF] text-[#468DFF] rounded-xl text-xs font-bold hover:bg-[#468DFF] hover:text-white hover:border-[#468DFF] transition-all active:scale-[0.98] cursor-pointer"
              >
                Cancelar
              </button>
              {modalAlert.onConfirm && (
                <button
                  type="button"
                  onClick={modalAlert.onConfirm}
                  className="flex-1 py-2.5 bg-[#468DFF] hover:bg-[#0511F2] text-white rounded-xl text-xs font-bold transition-all active:scale-[0.98] cursor-pointer shadow-lg shadow-blue-500/10"
                >
                  Actualizar Plan
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
