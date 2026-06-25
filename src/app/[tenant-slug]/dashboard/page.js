// src/app/[tenant-slug]/dashboard/page.js
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import { supabase } from '@/lib/supabase';
import { formatDate } from '@/lib/utils';
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
  Briefcase,
  Menu,
  X,
  ClipboardList,
  GraduationCap,
  ChevronLeft,
  ChevronRight,
  Flame,
  ClipboardCheck,
  AlertTriangle,
  Folder
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function TenantDashboard({ params }) {
  const tenantSlug = params['tenant-slug'];
  const [loading, setLoading] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

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

  const [currentUser, setCurrentUser] = useState(null);
  const [profile, setProfile] = useState(() => {
    if (typeof window !== 'undefined') {
      const cached = sessionStorage.getItem('user-profile');
      return cached ? JSON.parse(cached) : null;
    }
    return null;
  });
  const [tenant, setTenant] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Estados para el calendario compacto del dashboard
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState(new Date().toISOString().split('T')[0]);

  // Colecciones cargadas para el Programa
  const [empresas, setEmpresas] = useState([]);
  const [establecimientos, setEstablecimientos] = useState([]);
  const [miembros, setMiembros] = useState([]);
  const [actividades, setActividades] = useState([]);
  const [accionesCorrectivas, setAccionesCorrectivas] = useState([]);

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
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('user-profile', JSON.stringify(prof));
        }

        // Cargar Tenant por slug de URL
        const { data: ten, error: tErr } = await supabase
          .from('tenants')
          .select('*')
          .eq('slug', tenantSlug)
          .single();

        if (tErr || !ten) {
          if (prof.tenant_id) {
            const { data: homeTen } = await supabase
              .from('tenants')
              .select('slug')
              .eq('id', prof.tenant_id)
              .single();
            if (homeTen) {
              window.location.href = `/${homeTen.slug}/dashboard`;
              return;
            }
          }
          window.location.href = '/login';
          return;
        }

        // Verificar acceso: ¿Es el owner o es miembro activo con acceso?
        let hasAccess = false;
        if (prof.tenant_id === ten.id) {
          hasAccess = true;
        } else {
          const { data: member } = await supabase
            .from('miembros_equipo')
            .select('id, tiene_acceso')
            .eq('tenant_id', ten.id)
            .eq('profile_id', user.id)
            .maybeSingle();

          if (member && member.tiene_acceso) {
            hasAccess = true;
          }
        }

        if (!hasAccess) {
          if (prof.tenant_id) {
            const { data: homeTen } = await supabase
              .from('tenants')
              .select('slug')
              .eq('id', prof.tenant_id)
              .single();
            if (homeTen) {
              window.location.href = `/${homeTen.slug}/dashboard`;
              return;
            }
          }
          window.location.href = '/login';
          return;
        }

        setTenant(ten);

          // Cargar Empresas del Tenant
          let empresasQuery = supabase
            .from('empresas')
            .select('id, razon_social')
            .eq('tenant_id', ten.id);
          if (prof.role === 'cliente') {
            empresasQuery = empresasQuery.eq('id', prof.empresa_id);
          }
          const { data: emps } = await empresasQuery;
          setEmpresas(emps || []);

          // Cargar Establecimientos del Tenant
          let estsQuery = supabase
            .from('establecimientos')
            .select('id, denominacion')
            .eq('tenant_id', ten.id);
          if (prof.role === 'cliente') {
            estsQuery = estsQuery.eq('empresa_id', prof.empresa_id);
          }
          const { data: ests } = await estsQuery;
          setEstablecimientos(ests || []);

          // Cargar Miembros del Equipo
          const { data: mems } = await supabase
            .from('miembros_equipo')
            .select('id, full_name')
            .eq('tenant_id', ten.id);
          setMiembros(mems || []);

          // Cargar Actividades de programa_anual
          let progQuery = supabase
            .from('programa_anual')
            .select('*')
            .eq('tenant_id', ten.id);
          if (prof.role === 'cliente') {
            progQuery = progQuery.eq('empresa_id', prof.empresa_id);
          }
          const { data: progs } = await progQuery;
          setActividades(progs || []);

          // Cargar cantidad real de acciones correctivas del tenant
          let correctivasQuery = supabase
            .from('acciones_correctivas')
            .select('*')
            .eq('tenant_id', ten.id);
          if (prof.role === 'cliente') {
            correctivasQuery = correctivasQuery.eq('empresa_id', prof.empresa_id);
          }
          const { data: correctivasData, error: cErr } = await correctivasQuery;
          const realCorrectivasCount = !cErr && correctivasData ? correctivasData.length : 0;
          setAccionesCorrectivas(correctivasData || []);

          // Cargar cantidad real de clientes
          let clientCountReal = emps ? emps.length : 0;

          // Calcular cantidad de visitas pendientes
          const pendingCount = (progs || []).filter(a => !a.fecha_realizacion).length;

          // Calcular tasa de cumplimiento real del programa
          const completedCount = (progs || []).filter(a => !!a.fecha_realizacion).length;
          const complianceRateReal = (progs || []).length > 0
            ? Math.round((completedCount / progs.length) * 100)
            : 100;

          setStats({
            clientsCount: clientCountReal,
            inspectionsCount: realCorrectivasCount,
            complianceRate: complianceRateReal,
            pendingVisits: pendingCount
          });
        setLoading(false);
      } catch (err) {
        console.error('Error al cargar datos del dashboard:', err);
        // Si hay error en Supabase (ej. local development sin variables), mockeamos datos
        setIsMockMode();
      }
    };

    const setIsMockMode = () => {
      setCurrentUser({ email: 'profesional@gestion-syso.com' });
      setProfile({ full_name: 'Profesional de SySO', role: 'admin' });
      setTenant({ name: 'Consultora de Seguridad e Higiene', plan_id: 'free' });
      setStats({
        clientsCount: 1,
        inspectionsCount: 12,
        complianceRate: 92,
        pendingVisits: 2
      });

      const mockCorrectivas = [
        {
          id: 'mock-acc-1',
          descripcion_hallazgo: 'Falta de disyuntor en tablero eléctrico secundario.',
          nivel_riesgo: 'Riesgo sustancial',
          fecha_planificada: '2026-06-20',
          fecha_implementacion: '',
          area_sector: 'Cocina',
          responsable: 'Carlos Gómez'
        },
        {
          id: 'mock-acc-2',
          descripcion_hallazgo: 'Ausencia de señalización en salidas de emergencia.',
          nivel_riesgo: 'Riesgo moderado',
          fecha_planificada: '2026-07-15',
          fecha_implementacion: '2026-07-02',
          area_sector: 'Depósito',
          responsable: 'Carlos Gómez'
        }
      ];
      setAccionesCorrectivas(mockCorrectivas);

      const mockEmps = [
        { id: 'mock-emp-1', razon_social: 'Acme Argentina S.A.' },
        { id: 'mock-emp-2', razon_social: 'Constructora del Sur' }
      ];
      const mockEsts = [
        { id: 'mock-est-1', denominacion: 'Planta Munro' },
        { id: 'mock-est-2', denominacion: 'Obra Autopista' }
      ];
      const mockMems = [
        { id: 'mock-mem-1', full_name: 'Carlos Gómez' }
      ];
      const mockProgs = [
        {
          id: '1',
          empresa_id: 'mock-emp-1',
          establecimiento_id: 'mock-est-1',
          descripcion: 'Análisis bacteriológico de agua de consumo humano (Semestral)',
          fecha_planificada: new Date().toISOString().split('T')[0], // hoy
          fecha_realizacion: null,
          responsable_id: 'mock-mem-1',
          progreso: 50
        },
        {
          id: '2',
          empresa_id: 'mock-emp-2',
          establecimiento_id: 'mock-est-2',
          descripcion: 'Control de Extintores (Trimestral)',
          fecha_planificada: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 5).toISOString().split('T')[0], // proximo mes
          fecha_realizacion: '2026-07-05',
          responsable_id: 'mock-mem-1',
          progreso: 100
        }
      ];

      setEmpresas(mockEmps);
      setEstablecimientos(mockEsts);
      setMiembros(mockMems);
      setActividades(mockProgs);
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
    await supabase.auth.signOut();
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('user-profile');
    }
    window.location.href = '/login';
  };

  const getItemStatusAndColor = (item) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const today = new Date(todayStr);
    const planDate = new Date(item.fecha_planificada);
    
    const hasRealization = !!item.fecha_realizacion;
    
    let estadoText = 'Vigente';
    let estadoColor = '#0b8043'; // Verde
    
    if (!hasRealization && today >= planDate) {
      estadoText = 'Vencido';
      estadoColor = '#fa050b'; // Rojo
    }
    
    let dateAlertColor = '';
    if (!hasRealization) {
      const timeDiff = planDate.getTime() - today.getTime();
      const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
      
      if (daysDiff < 0) {
        dateAlertColor = 'red';
      } else if (daysDiff <= 15) {
        dateAlertColor = 'yellow';
      }
    }

    return {
      estadoText,
      estadoColor,
      dateAlertColor
    };
  };

  const getCalculatedStatus = (fPlanificada, fImplementacion) => {
    if (!fPlanificada) {
      return { text: 'En análisis', color: 'bg-slate-100 text-slate-700 border-slate-200' };
    }
    if (fImplementacion) {
      return { text: 'Cerrada', color: 'bg-[#00b050]/10 text-[#00b050] border-[#00b050]/20' };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const planDate = new Date(fPlanificada + 'T00:00:00');
    planDate.setHours(0, 0, 0, 0);

    if (planDate >= today) {
      return { text: 'En tiempo', color: 'bg-blue-500/10 text-[#468DFF] border-blue-500/20' };
    } else {
      return { text: 'Vencido', color: 'bg-red-500/10 text-red-600 border-red-500/20' };
    }
  };

  const getRiskBadgeStyles = (risk) => {
    const r = (risk || '').toLowerCase();
    if (r.includes('crítico') || r.includes('critico')) {
      return 'bg-red-100 text-red-700 border-red-200';
    } else if (r.includes('sustancial') || r.includes('alto')) {
      return 'bg-orange-100 text-orange-700 border-orange-200';
    } else if (r.includes('moderado')) {
      return 'bg-amber-100 text-amber-700 border-amber-200';
    } else if (r.includes('leve') || r.includes('bajo')) {
      return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    }
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  // Funciones para el calendario compacto del dashboard
  const MONTHS_SPANISH = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const DAYS_OF_WEEK = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(null);
    }
    for (let i = 1; i <= totalDays; i++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      days.push({ day: i, dateStr });
    }
    return days;
  };

  const handlePrevMonth = () => {
    setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1));
  };

  const getFilteredVencimientos = () => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();

    const startOfCurrentMonth = new Date(currentYear, currentMonth, 1);
    const endOfNextMonth = new Date(currentYear, currentMonth + 2, 0, 23, 59, 59);

    return actividades.filter(act => {
      if (!act.fecha_planificada) return false;
      const planDate = new Date(act.fecha_planificada + 'T00:00:00');
      return planDate >= startOfCurrentMonth && planDate <= endOfNextMonth;
    }).sort((a, b) => new Date(a.fecha_planificada).getTime() - new Date(b.fecha_planificada).getTime());
  };

  const filteredVencimientos = getFilteredVencimientos();



  const planNames = {
    free: 'Plan Gratis Permanente',
    basic_5: 'Plan 5 Empresas',
    standard_25: 'Plan 25 Empresas',
    libre: 'Plan Libre (Ilimitado)'
  };

  return (
    <div className="h-screen overflow-hidden bg-syso-bg text-slate-700 flex font-sans">
      
      <Sidebar
        tenantSlug={tenantSlug}
        profile={profile}
        currentSection="dashboard"
        isSidebarCollapsed={isSidebarCollapsed}
        toggleSidebar={toggleSidebar}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
        handleLogout={handleLogout}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        
        <header className="h-16 border-b border-slate-200 flex items-center justify-between px-4 md:px-6 bg-white shrink-0 sticky top-0 z-20">
          <div className="flex items-center gap-2.5 min-w-0">
            <button 
              onClick={() => setIsMobileMenuOpen(true)} 
              className="p-2 -ml-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 md:hidden cursor-pointer shrink-0"
            >
              <Menu className="h-5 w-5" />
            </button>
            <Building className="h-5 w-5 text-[#468DFF] shrink-0" />
            <h1 className="font-outfit text-base md:text-lg font-bold text-slate-900 truncate leading-none">
              Dashboard
            </h1>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs font-semibold text-slate-500 bg-slate-50 py-1.5 px-3 rounded-xl border border-slate-150 hidden sm:inline-block">
              {tenant?.name || 'Cargando...'}
            </span>
            <span className={`px-2.5 py-1.5 rounded-lg bg-[#468DFF]/15 border border-[#468DFF]/25 text-[#468DFF] text-[10px] font-bold uppercase tracking-wider ${(!profile || profile.role === 'cliente') ? 'hidden' : ''}`} suppressHydrationWarning>
              {tenant?.plan_id ? (tenant.plan_id.toLowerCase() === 'libre' ? 'Plan Libre' : tenant.plan_id.toLowerCase().startsWith('standard') ? 'Plan Standard' : tenant.plan_id.toLowerCase().startsWith('basic') ? 'Plan Basic' : `Plan ${tenant.plan_id}`) : 'Plan Pro'}
            </span>
          </div>
        </header>
        {loading ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center space-y-4">
              <Loader2 className="h-10 w-10 animate-spin text-[#468DFF] mx-auto" />
              <p className="text-xs text-slate-500 font-medium">Generando tu área de trabajo...</p>
            </div>
          </div>
        ) : (
          <div className="p-6 md:p-8 space-y-8 max-w-[95%] mx-auto w-full">
          {/* Fila del Programa de Gestión (Vencimientos + Calendario Compacto) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Próximos Vencimientos */}
            <div className="lg:col-span-2 bg-white border border-slate-150 rounded-2xl p-6 shadow-sm space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-slate-150 pb-3 mb-4">
                  <h3 className="font-outfit text-base font-extrabold text-slate-900 flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-[#468DFF]" />
                    Próximos vencimientos
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 text-[#468DFF] text-[10px] font-bold uppercase tracking-wider">
                    Programa de Gestión
                  </span>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-150 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        <th className="px-4 py-3">Cliente / Razón Social</th>
                        <th className="px-4 py-3">Establecimiento</th>
                        <th className="px-4 py-3">Actividad</th>
                        <th className="px-4 py-3">F. Planificada</th>
                        <th className="px-4 py-3">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredVencimientos.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="px-4 py-6 text-center text-slate-400 font-semibold italic">
                            No hay vencimientos programados para este mes ni el próximo.
                          </td>
                        </tr>
                      ) : (
                        filteredVencimientos.slice(0, 5).map(act => {
                          const emp = empresas.find(e => e.id === act.empresa_id);
                          const est = establecimientos.find(e => e.id === act.establecimiento_id);
                          
                          const statusInfo = getItemStatusAndColor(act);
                          
                          return (
                            <tr key={act.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-4 py-3 font-extrabold text-slate-800">
                                {emp?.razon_social || 'Cliente desconocido'}
                              </td>
                              <td className="px-4 py-3 text-slate-600 font-medium">
                                {est?.denominacion || 'Sin establecimiento'}
                              </td>
                              <td className="px-4 py-3 font-semibold text-slate-700 truncate max-w-[150px]" title={act.descripcion}>
                                {act.descripcion}
                              </td>
                              <td className="px-4 py-3 font-mono font-bold">
                                <span className={statusInfo.dateAlertColor === 'red' ? 'text-[#fa050b] bg-red-500/10 px-1.5 py-0.5 rounded' : statusInfo.dateAlertColor === 'yellow' ? 'text-amber-600 bg-amber-500/10 px-1.5 py-0.5 rounded' : 'text-slate-700'}>
                                  {formatDate(act.fecha_planificada)}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <span 
                                  className="px-2 py-0.5 rounded-full text-[9px] font-bold text-white uppercase tracking-wider inline-block text-center"
                                  style={{ backgroundColor: statusInfo.estadoColor }}
                                >
                                  {statusInfo.estadoText}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              
              {filteredVencimientos.length > 5 && (
                <div className="text-right pt-2">
                  <a href={`/${tenantSlug}/programa`} className="text-xs font-bold text-[#468DFF] hover:text-[#0511F2] transition-colors inline-flex items-center gap-1">
                    Ver todos los vencimientos ({filteredVencimientos.length})
                    <ArrowRight className="h-3.5 w-3.5" />
                  </a>
                </div>
              )}
            </div>

            {/* Calendario Compacto Vinculado */}
            <div className="bg-white border border-slate-150 rounded-2xl p-6 shadow-sm flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between border-b border-slate-150 pb-3 mb-4">
                  <h3 className="font-outfit text-base font-extrabold text-slate-900 flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-[#468DFF]" />
                    Calendario Mensual
                  </h3>
                  <div className="flex items-center gap-1">
                    <button onClick={handlePrevMonth} className="p-1 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer">
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="text-[10px] font-bold text-slate-800 min-w-[70px] text-center">
                      {MONTHS_SPANISH[calendarMonth.getMonth()]} {calendarMonth.getFullYear()}
                    </span>
                    <button onClick={handleNextMonth} className="p-1 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer">
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400 mb-2">
                  {DAYS_OF_WEEK.map(d => <div key={d}>{d}</div>)}
                </div>
                
                <div className="grid grid-cols-7 gap-1">
                  {getDaysInMonth(calendarMonth).map((d, index) => {
                    if (!d) return <div key={`empty-${index}`} className="aspect-square" />;
                    
                    const isSelected = d.dateStr === selectedDateStr;
                    const dayActs = actividades.filter(a => a.fecha_planificada === d.dateStr);
                    const hasActs = dayActs.length > 0;
                    
                    let dotColor = '';
                    if (hasActs) {
                      const allDone = dayActs.every(a => a.fecha_realizacion);
                      const anyOverdue = dayActs.some(a => {
                        if (a.fecha_realizacion) return false;
                        const todayStr = new Date().toISOString().split('T')[0];
                        return todayStr > a.fecha_planificada;
                      });
                      dotColor = allDone ? 'bg-[#00b050]' : (anyOverdue ? 'bg-red-500' : 'bg-amber-500');
                    }
                    
                    return (
                      <button
                        key={d.dateStr}
                        onClick={() => setSelectedDateStr(d.dateStr)}
                        className={`aspect-square rounded-lg text-xs font-bold flex flex-col items-center justify-center relative transition-all cursor-pointer ${
                          isSelected 
                            ? 'bg-[#468DFF] text-white shadow-sm font-extrabold' 
                            : 'text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <span>{d.day}</span>
                        {hasActs && (
                          <span className={`h-1.5 w-1.5 rounded-full absolute bottom-1 ${dotColor}`} />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Listado de Actividades del Día Seleccionado */}
              <div className="border-t border-slate-100 pt-3 flex-1 flex flex-col min-h-0 justify-end">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                  Actividades ({selectedDateStr.split('-').reverse().slice(0,2).join('/')}):
                </span>
                <div className="space-y-2 overflow-y-auto max-h-[120px] pr-1 flex-1">
                  {actividades.filter(a => a.fecha_planificada === selectedDateStr).length === 0 ? (
                    <p className="text-[11px] text-slate-400 italic">No hay actividades para este día.</p>
                  ) : (
                    actividades.filter(a => a.fecha_planificada === selectedDateStr).map(act => {
                      const emp = empresas.find(e => e.id === act.empresa_id);
                      const done = !!act.fecha_realizacion;
                      return (
                        <div key={act.id} className="p-2 rounded-lg bg-slate-50 border border-slate-100 flex items-start justify-between gap-2 text-[11px]">
                          <div className="min-w-0 flex-1">
                            <span className="font-bold text-slate-800 block truncate" title={act.descripcion}>{act.descripcion}</span>
                            <span className="text-[9px] text-slate-400 block truncate">{emp?.razon_social || 'Cliente'}</span>
                          </div>
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold text-white shrink-0 ${done ? 'bg-[#00b050]' : 'bg-amber-500'}`}>
                            {done ? 'Hecho' : 'Pendiente'}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Cards de Métricas */}
          {profile && profile.role !== 'cliente' && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              
              <div className="bg-white border border-slate-150 rounded-2xl p-5 relative overflow-hidden group hover:border-[#468DFF]/30 transition-all shadow-sm">
                <div className="text-slate-400 group-hover:text-[#468DFF] transition-colors mb-3">
                  <Users className="h-6 w-6" />
                </div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">Clientes</span>
                <span className="font-outfit text-3xl font-extrabold text-slate-900 block mt-1">{stats.clientsCount}</span>
                <span className="text-[10px] text-slate-400 block mt-2">
                  {tenant?.plan_id === 'free' ? 'Límite: 1 empresa (Plan Gratis)' : 'Habilitado por tu plan'}
                </span>
              </div>

              <div className="bg-white border border-slate-150 rounded-2xl p-5 relative overflow-hidden group hover:border-[#468DFF]/30 transition-all shadow-sm">
                <div className="text-slate-400 group-hover:text-[#468DFF] transition-colors mb-3">
                  <ClipboardList className="h-6 w-6" />
                </div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">Acciones Correctivas</span>
                <span className="font-outfit text-3xl font-extrabold text-slate-900 block mt-1">{stats.inspectionsCount}</span>
                <span className="text-[10px] text-slate-400 block mt-2">Hallazgos registrados</span>
              </div>

              <div className="bg-white border border-slate-150 rounded-2xl p-5 relative overflow-hidden group hover:border-[#468DFF]/30 transition-all shadow-sm">
                <div className="text-slate-400 group-hover:text-emerald-500 transition-colors mb-3">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">% Cumplimiento</span>
                <span className="font-outfit text-3xl font-extrabold text-emerald-500 block mt-1">{stats.complianceRate}%</span>
                <span className="text-[10px] text-slate-400 block mt-2">Nivel de cumplimiento global</span>
              </div>

              <div className="bg-white border border-slate-150 rounded-2xl p-5 relative overflow-hidden group hover:border-[#468DFF]/30 transition-all shadow-sm">
                <div className="text-slate-400 group-hover:text-amber-500 transition-colors mb-3">
                  <Calendar className="h-6 w-6" />
                </div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">Pendientes</span>
                <span className="font-outfit text-3xl font-extrabold text-slate-900 block mt-1">{stats.pendingVisits}</span>
                <span className="text-[10px] text-slate-400 block mt-2">Visitas de control agendadas</span>
              </div>

            </div>
          )}

          {/* Secciones de Trabajo y Acciones Rápidas */}
          {profile && profile.role === 'cliente' ? (
            <div className="bg-white border border-slate-150 rounded-2xl p-6 space-y-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-150 pb-3">
                <h3 className="font-outfit text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-[#468DFF]" />
                  Resumen de Acciones Correctivas
                </h3>
                <Link 
                  href={`/${tenantSlug}/correctivas`} 
                  className="text-xs font-bold text-[#468DFF] hover:text-[#0511F2] transition-colors inline-flex items-center gap-1"
                >
                  Ver planilla completa
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              {/* Grid de 5 Contadores */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                
                {/* 1. Total */}
                <div className="p-4 rounded-xl border border-slate-150 bg-slate-50/50 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Cantidad Total</span>
                    <ClipboardList className="h-4 w-4 text-[#468DFF]" />
                  </div>
                  <span className="font-outfit text-2xl font-extrabold text-slate-900 mt-1">
                    {accionesCorrectivas.length}
                  </span>
                  <span className="text-[9px] text-slate-400 mt-2 block">Acciones correctivas</span>
                </div>

                {/* 2. Cerradas */}
                <div className="p-4 rounded-xl border border-slate-150 bg-slate-50/50 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Cerradas</span>
                    <ShieldCheck className="h-4 w-4 text-[#00b050]" />
                  </div>
                  <span className="font-outfit text-2xl font-extrabold text-[#00b050] mt-1">
                    {accionesCorrectivas.filter(a => !!a.fecha_implementacion).length}
                  </span>
                  <span className="text-[9px] text-slate-400 mt-2 block">Acciones cerradas</span>
                </div>

                {/* 3. En Análisis */}
                <div className="p-4 rounded-xl border border-slate-150 bg-slate-50/50 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">En Análisis</span>
                    <HelpCircle className="h-4 w-4 text-slate-500" />
                  </div>
                  <span className="font-outfit text-2xl font-extrabold text-slate-700 mt-1">
                    {accionesCorrectivas.filter(a => !a.fecha_planificada).length}
                  </span>
                  <span className="text-[9px] text-slate-400 mt-2 block">Acciones en análisis</span>
                </div>

                {/* 4. En Tiempo */}
                <div className="p-4 rounded-xl border border-slate-150 bg-slate-50/50 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">En Tiempo</span>
                    <Calendar className="h-4 w-4 text-[#468DFF]" />
                  </div>
                  <span className="font-outfit text-2xl font-extrabold text-[#468DFF] mt-1">
                    {accionesCorrectivas.filter(a => {
                      if (a.fecha_implementacion || !a.fecha_planificada) return false;
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      const planDate = new Date(a.fecha_planificada + 'T00:00:00');
                      planDate.setHours(0, 0, 0, 0);
                      return planDate >= today;
                    }).length}
                  </span>
                  <span className="text-[9px] text-slate-400 mt-2 block">Acciones en tiempo</span>
                </div>

                {/* 5. Vencidas */}
                <div className="p-4 rounded-xl border border-slate-150 bg-slate-50/50 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Vencidas</span>
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                  </div>
                  <span className="font-outfit text-2xl font-extrabold text-red-500 mt-1">
                    {accionesCorrectivas.filter(a => {
                      if (a.fecha_implementacion || !a.fecha_planificada) return false;
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      const planDate = new Date(a.fecha_planificada + 'T00:00:00');
                      planDate.setHours(0, 0, 0, 0);
                      return planDate < today;
                    }).length}
                  </span>
                  <span className="text-[9px] text-slate-400 mt-2 block">Acciones vencidas</span>
                </div>

              </div>
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-6">
              
              {/* Listado de accesos rápidos */}
              <div className="md:col-span-2 bg-white border border-slate-150 rounded-2xl p-6 space-y-4 shadow-sm">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Sparkles className="h-4.5 w-4.5 text-[#468DFF]" />
                  Accesos rápidos
                </h3>

                <div className="grid md:grid-cols-2 gap-4">
                  
                  <a href={`/${tenantSlug}/empresas?new=true`} className="p-4 rounded-xl border border-slate-150 bg-slate-50/50 hover:bg-[#468DFF]/5 hover:border-[#468DFF]/30 transition-all flex items-start gap-3 group">
                    <div className="p-2 rounded-lg bg-blue-500/10 text-[#468DFF] shrink-0 mt-0.5">
                      <PlusCircle className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-800 block group-hover:text-[#468DFF] transition-colors">Nuevo Cliente</span>
                      <span className="text-[10px] text-slate-500 block mt-1">Registrar una empresa cliente en tu base de datos.</span>
                    </div>
                  </a>

                  <a href={`/${tenantSlug}/programa`} className="p-4 rounded-xl border border-slate-150 bg-slate-50/50 hover:bg-[#468DFF]/5 hover:border-[#468DFF]/30 transition-all flex items-start gap-3 group">
                    <div className="p-2 rounded-lg bg-blue-500/10 text-[#468DFF] shrink-0 mt-0.5">
                      <Calendar className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-800 block group-hover:text-[#468DFF] transition-colors">Programa de Gestión</span>
                      <span className="text-[10px] text-slate-500 block mt-1">Planificar y realizar seguimiento de actividades anuales.</span>
                    </div>
                  </a>

                  <a href={`/${tenantSlug}/correctivas?new=true`} className="p-4 rounded-xl border border-slate-150 bg-slate-50/50 hover:bg-[#468DFF]/5 hover:border-[#468DFF]/30 transition-all flex items-start gap-3 group">
                    <div className="p-2 rounded-lg bg-blue-500/10 text-[#468DFF] shrink-0 mt-0.5">
                      <ClipboardList className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-800 block group-hover:text-[#468DFF] transition-colors">Nueva Acción Correctiva</span>
                      <span className="text-[10px] text-slate-500 block mt-1">Registrar hallazgos, cargar evidencias y plazos.</span>
                    </div>
                  </a>

                  <a href={`/${tenantSlug}/profile`} className="p-4 rounded-xl border border-slate-150 bg-slate-50/50 hover:bg-[#468DFF]/5 hover:border-[#468DFF]/30 transition-all flex items-start gap-3 group">
                    <div className="p-2 rounded-lg bg-blue-500/10 text-[#468DFF] shrink-0 mt-0.5">
                      <User className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-800 block group-hover:text-[#468DFF] transition-colors">Mi Perfil Profesional</span>
                      <span className="text-[10px] text-slate-500 block mt-1">Configurar tu matrícula, firma digital y branding.</span>
                    </div>
                  </a>

                </div>
              </div>

              {/* Sidebar info plan */}
              <div className="bg-white border border-slate-150 rounded-2xl p-6 flex flex-col justify-between space-y-6 shadow-sm">
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
          )}
        </div>
      )}

      </main>

    </div>
  );
}
