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
  Folder,
  Activity
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
  const [accidentes, setAccidentes] = useState([]);
  const [nomina, setNomina] = useState([]);

  // Estados de filtros para accidentes en el portal de clientes / admin
  const [accidentFilterEmpresa, setAccidentFilterEmpresa] = useState('');
  const [accidentFilterEstablecimiento, setAccidentFilterEstablecimiento] = useState('');
  const [accidentFilterAnio, setAccidentFilterAnio] = useState(String(new Date().getFullYear()));
  const [activeChartIndex, setActiveChartIndex] = useState('incidencia');
  const [showIndicesGuide, setShowIndicesGuide] = useState(false);

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
            .eq('tenant_id', ten.id)
            .order('razon_social', { ascending: true });
          if (prof.role === 'cliente') {
            empresasQuery = empresasQuery.eq('id', prof.empresa_id);
          }
          const { data: emps } = await empresasQuery;
          setEmpresas(emps || []);

          // Cargar Establecimientos del Tenant
          let estsQuery = supabase
            .from('establecimientos')
            .select('id, denominacion, empresa_id')
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

          // Cargar Accidentes del Tenant/Empresa
          let accidentesQuery = supabase
            .from('accidentes')
            .select('*')
            .eq('tenant_id', ten.id);
          if (prof.role === 'cliente') {
            accidentesQuery = accidentesQuery.eq('empresa_id', prof.empresa_id);
          }
          const { data: accs } = await accidentesQuery;
          setAccidentes(accs || []);

          // Cargar Nómina Personal del Tenant/Empresa
          let nominaQuery = supabase
            .from('nomina_personal')
            .select('*')
            .eq('tenant_id', ten.id);
          if (prof.role === 'cliente') {
            nominaQuery = nominaQuery.eq('empresa_id', prof.empresa_id);
          }
          const { data: nom } = await nominaQuery;
          setNomina(nom || []);

          if (prof.role === 'cliente') {
            setAccidentFilterEmpresa(prof.empresa_id);
          }

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
        clientsCount: 2,
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
        { id: 'mock-est-1', denominacion: 'Planta Munro', empresa_id: 'mock-emp-1' },
        { id: 'mock-est-2', denominacion: 'Obra Autopista', empresa_id: 'mock-emp-1' },
        { id: 'mock-est-3', denominacion: 'Sede Central', empresa_id: 'mock-emp-2' }
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
          establecimiento_id: 'mock-est-3',
          descripcion: 'Control de Extintores (Trimestral)',
          fecha_planificada: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 5).toISOString().split('T')[0], // proximo mes
          fecha_realizacion: '2026-07-05',
          responsable_id: 'mock-mem-1',
          progreso: 100
        }
      ];

      const mockAccidentes = [
        {
          id: 'acc-1',
          empresa_id: 'mock-emp-1',
          establecimiento_id: 'mock-est-1',
          tipo: 'Accidente de trabajo',
          gravedad: 'Leve',
          fecha_siniestro: '2026-02-15',
          dias_baja: 5
        },
        {
          id: 'acc-2',
          empresa_id: 'mock-emp-1',
          establecimiento_id: 'mock-est-1',
          tipo: 'Accidente de trabajo',
          gravedad: 'Grave',
          fecha_siniestro: '2026-04-20',
          dias_baja: 15
        },
        {
          id: 'acc-3',
          empresa_id: 'mock-emp-1',
          establecimiento_id: 'mock-est-2',
          tipo: 'Enfermedad profesional',
          gravedad: 'Mortal',
          fecha_siniestro: '2026-05-10',
          dias_baja: 0
        },
        {
          id: 'acc-4',
          empresa_id: 'mock-emp-1',
          establecimiento_id: 'mock-est-1',
          tipo: 'Accidente in itinere',
          gravedad: 'Leve',
          fecha_siniestro: '2026-06-01',
          dias_baja: 3
        },
        {
          id: 'acc-5',
          empresa_id: 'mock-emp-1',
          establecimiento_id: 'mock-est-2',
          tipo: 'Reingreso',
          gravedad: 'Leve',
          fecha_siniestro: '2026-06-15',
          dias_baja: 2
        },
        // Accidentes del año anterior (2025) para el gráfico comparativo
        {
          id: 'acc-6',
          empresa_id: 'mock-emp-1',
          establecimiento_id: 'mock-est-1',
          tipo: 'Accidente de trabajo',
          gravedad: 'Leve',
          fecha_siniestro: '2025-08-10',
          dias_baja: 4
        }
      ];

      const mockNomina = [
        { id: 'n1', empresa_id: 'mock-emp-1', establecimiento_id: 'mock-est-1', fecha_carga: '2026-01-10', fecha_alta: '2026-01-10' },
        { id: 'n2', empresa_id: 'mock-emp-1', establecimiento_id: 'mock-est-1', fecha_carga: '2026-02-15', fecha_alta: '2026-02-15' },
        { id: 'n3', empresa_id: 'mock-emp-1', establecimiento_id: 'mock-est-2', fecha_carga: '2026-03-20', fecha_alta: '2026-03-20' },
        { id: 'n4', empresa_id: 'mock-emp-1', establecimiento_id: 'mock-est-1', fecha_carga: '2026-05-10', fecha_alta: '2026-05-10' },
        { id: 'n5', empresa_id: 'mock-emp-1', establecimiento_id: 'mock-est-2', fecha_carga: '2026-06-01', fecha_alta: '2026-06-01' },
        // Nómina del año anterior (2025) para el gráfico comparativo
        { id: 'n6', empresa_id: 'mock-emp-1', establecimiento_id: 'mock-est-1', fecha_carga: '2025-01-05', fecha_alta: '2025-01-05' },
        { id: 'n7', empresa_id: 'mock-emp-1', establecimiento_id: 'mock-est-1', fecha_carga: '2025-06-15', fecha_alta: '2025-06-15' }
      ];

      setEmpresas(mockEmps);
      setEstablecimientos(mockEsts);
      setMiembros(mockMems);
      setActividades(mockProgs);
      setAccidentes(mockAccidentes);
      setNomina(mockNomina);
      setAccidentFilterEmpresa('');
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

  // Funciones para el seguimiento de accidentes y cálculo de índices de siniestralidad
  const getAccidentYears = () => {
    const years = new Set();
    years.add(new Date().getFullYear()); // Siempre incluir el año actual
    
    accidentes.forEach(acc => {
      if (acc.fecha_siniestro) {
        const yr = new Date(acc.fecha_siniestro).getFullYear();
        if (yr && !isNaN(yr)) {
          years.add(yr);
        }
      }
    });
    
    return Array.from(years).sort((a, b) => b - a);
  };

  const getFilteredAccidents = () => {
    if (profile && profile.role !== 'cliente' && !accidentFilterEmpresa) {
      return [];
    }
    return accidentes.filter(acc => {
      if (accidentFilterEmpresa && acc.empresa_id !== accidentFilterEmpresa) {
        return false;
      }
      if (accidentFilterEstablecimiento && acc.establecimiento_id !== accidentFilterEstablecimiento) {
        return false;
      }
      if (accidentFilterAnio && acc.fecha_siniestro) {
        const yr = new Date(acc.fecha_siniestro).getFullYear();
        return String(yr) === accidentFilterAnio;
      }
      return true;
    });
  };

  const getAccidentCounters = () => {
    const filtered = getFilteredAccidents();
    
    const countTrabajo = filtered.filter(a => a.tipo === 'Accidente de trabajo').length;
    const countItinere = filtered.filter(a => a.tipo === 'Accidente in itinere').length;
    const countEnfermedad = filtered.filter(a => a.tipo === 'Enfermedad profesional').length;
    const countReingreso = filtered.filter(a => a.tipo === 'Reingreso').length;
    const totalAccidents = countTrabajo + countItinere + countEnfermedad + countReingreso;
    
    const gravityAccs = filtered.filter(a => a.tipo === 'Accidente de trabajo' || a.tipo === 'Enfermedad profesional');
    const countLeve = gravityAccs.filter(a => a.gravedad === 'Leve').length;
    const countGrave = gravityAccs.filter(a => a.gravedad === 'Grave').length;
    const countMortal = gravityAccs.filter(a => a.gravedad === 'Mortal').length;
    
    return {
      countTrabajo,
      countItinere,
      countEnfermedad,
      countReingreso,
      totalAccidents,
      countLeve,
      countGrave,
      countMortal
    };
  };

  const {
    countTrabajo,
    countItinere,
    countEnfermedad,
    countReingreso,
    totalAccidents,
    countLeve,
    countGrave,
    countMortal
  } = getAccidentCounters();

  const getPersonasCubiertas = (yearStr, empId, estId) => {
    if (!yearStr) return 0;
    if (profile && profile.role !== 'cliente' && !empId) {
      return 0;
    }
    const year = parseInt(yearStr, 10);
    
    return nomina.filter(n => {
      if (empId && n.empresa_id !== empId) return false;
      if (estId && n.establecimiento_id !== estId) return false;
      if (n.fecha_carga) {
        const cargaYear = new Date(n.fecha_carga).getFullYear();
        return cargaYear === year;
      }
      return false;
    }).length;
  };

  const getAccidentesFiltrados = (startDate, endDate, empId, estId) => {
    return accidentes.filter(acc => {
      if (empId && acc.empresa_id !== empId) return false;
      if (estId && acc.establecimiento_id !== estId) return false;
      if (acc.fecha_siniestro) {
        const sDate = new Date(acc.fecha_siniestro);
        return sDate >= startDate && sDate <= endDate;
      }
      return false;
    });
  };

  const calculateIndexValue = (indexType, accList, personasCubiertas) => {
    const atEpList = accList.filter(a => a.tipo === 'Accidente de trabajo' || a.tipo === 'Enfermedad profesional');
    const casosCount = atEpList.length;
    const mortalesCount = atEpList.filter(a => a.gravedad === 'Mortal').length;
    const totalDiasBaja = atEpList.reduce((sum, a) => sum + (a.dias_baja || 0), 0);
    const casosConBaja = atEpList.filter(a => (a.dias_baja || 0) > 0).length;
    
    let val = 0;
    if (personasCubiertas > 0) {
      switch (indexType) {
        case 'incidencia':
          val = (casosCount / personasCubiertas) * 1000;
          break;
        case 'mortalidad':
          val = (mortalesCount / personasCubiertas) * 1000000;
          break;
        case 'perdida':
          val = (totalDiasBaja / personasCubiertas) * 1000;
          break;
      }
    }
    
    if (indexType === 'dmb' && casosConBaja > 0) {
      val = totalDiasBaja / casosConBaja;
    }
    
    return {
      value: parseFloat(val.toFixed(2)),
      casosCount,
      personasCubiertas: personasCubiertas > 0 ? personasCubiertas : 0,
      mortalesCount,
      totalDiasBaja,
      casosConBaja
    };
  };

  const getChartData = () => {
    const Y = parseInt(accidentFilterAnio, 10) || new Date().getFullYear();
    
    // 1. Año Anterior
    const prevYearStr = String(Y - 1);
    const prevPeople = getPersonasCubiertas(prevYearStr, accidentFilterEmpresa, accidentFilterEstablecimiento);
    const prevStartDate = new Date(Y - 1, 0, 1);
    const prevEndDate = new Date(Y - 1, 11, 31, 23, 59, 59);
    const prevAccs = getAccidentesFiltrados(prevStartDate, prevEndDate, accidentFilterEmpresa, accidentFilterEstablecimiento);
    const prevValue = calculateIndexValue(activeChartIndex, prevAccs, prevPeople);
    
    // 2. YTD
    const currentPeople = getPersonasCubiertas(String(Y), accidentFilterEmpresa, accidentFilterEstablecimiento);
    const ytdStartDate = new Date(Y, 0, 1);
    const ytdEndDate = new Date(Y, 11, 31, 23, 59, 59);
    const ytdAccs = getAccidentesFiltrados(ytdStartDate, ytdEndDate, accidentFilterEmpresa, accidentFilterEstablecimiento);
    const ytdValue = calculateIndexValue(activeChartIndex, ytdAccs, currentPeople);
    
    // 3. Meses
    const monthData = [];
    const MONTH_NAMES_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    
    for (let m = 0; m < 12; m++) {
      const monthStartDate = new Date(Y, m, 1);
      const monthEndDate = new Date(Y, m + 1, 0, 23, 59, 59);
      const monthAccs = getAccidentesFiltrados(monthStartDate, monthEndDate, accidentFilterEmpresa, accidentFilterEstablecimiento);
      const monthValue = calculateIndexValue(activeChartIndex, monthAccs, currentPeople);
      monthData.push({
        label: MONTH_NAMES_SHORT[m],
        ...monthValue
      });
    }
    
    return {
      prevYear: {
        label: `Año ${Y - 1}`,
        ...prevValue
      },
      ytd: {
        label: `YTD ${Y}`,
        ...ytdValue
      },
      months: monthData
    };
  };

  const chartData = getChartData();

  const renderSiniestralidadPanel = () => {
    return (
      <div className="bg-white border border-slate-150 rounded-2xl p-6 shadow-sm space-y-6">
        {/* Cabecera del contenedor con el título y modal clickeable de ayuda */}
        <div className="flex flex-col gap-4 border-b border-slate-150 pb-4">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-[#468DFF]" />
            <h3 className="font-outfit text-base font-extrabold text-slate-900 flex items-center gap-1.5">
              Estadísticas e Índices de Siniestralidad
              <span 
                role="button"
                onClick={() => setShowIndicesGuide(true)}
                className="text-slate-400 hover:text-[#468DFF] transition-colors cursor-pointer inline-flex items-center"
                title="Ver guía de cálculo de índices"
              >
                <HelpCircle className="h-4 w-4" />
              </span>
            </h3>
          </div>
          
          {/* Contenedor de Filtros (Establecimiento y Año, y opcional Razón Social para Admin/Miembro) */}
          <div className="grid grid-cols-1 sm:flex sm:flex-wrap items-end gap-3 w-full">
            {/* Filtro Razón Social (sólo visible para Admin/Miembro) */}
            {profile && profile.role !== 'cliente' && (
              <div className="flex flex-col gap-1 w-full sm:w-auto">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Cliente / Razón Social</span>
                <select
                  value={accidentFilterEmpresa}
                  onChange={e => {
                    setAccidentFilterEmpresa(e.target.value);
                    setAccidentFilterEstablecimiento(''); // reset establecimiento al cambiar de empresa
                  }}
                  className="border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50/50 focus:outline-none focus:border-[#468DFF] transition-colors cursor-pointer w-full sm:w-[240px]"
                >
                  <option value="">Selecciona una empresa</option>
                  {empresas.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.razon_social}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Filtro Establecimiento */}
            <div className="flex flex-col gap-1 w-full sm:w-auto">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Establecimiento</span>
              <select
                value={accidentFilterEstablecimiento}
                onChange={e => setAccidentFilterEstablecimiento(e.target.value)}
                disabled={profile && profile.role !== 'cliente' && !accidentFilterEmpresa}
                className="border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50/50 focus:outline-none focus:border-[#468DFF] transition-colors cursor-pointer w-full sm:w-[240px] disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
              >
                <option value="">
                  {profile && profile.role !== 'cliente' && !accidentFilterEmpresa 
                    ? 'Seleccione una empresa primero...' 
                    : 'Todos los establecimientos'}
                </option>
                {establecimientos
                  .filter(est => !accidentFilterEmpresa || est.empresa_id === accidentFilterEmpresa)
                  .map(est => (
                    <option key={est.id} value={est.id}>{est.denominacion}</option>
                  ))}
              </select>
            </div>

            {/* Filtro Año */}
            <div className="flex flex-col gap-1 w-full sm:w-auto">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Año</span>
              <select
                value={accidentFilterAnio}
                onChange={e => setAccidentFilterAnio(e.target.value)}
                className="border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50/50 focus:outline-none focus:border-[#468DFF] transition-colors cursor-pointer w-full sm:w-[100px]"
              >
                {getAccidentYears().map(year => (
                  <option key={year} value={String(year)}>{year}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Grid de Contadores por Tipo y Gravedad */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-8 gap-4">
          
          {/* Columna Izquierda: Tipos de Siniestro (5 columnas de ancho) */}
          <div className="xl:col-span-5 grid grid-cols-2 sm:grid-cols-5 gap-3 border-r border-slate-100 pr-0 xl:pr-4">
            
            {/* AT */}
            <div className="p-4 rounded-xl border border-slate-150 bg-slate-50/30 hover:border-[#468DFF]/20 transition-all flex flex-col justify-between shadow-sm">
              <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider leading-none">Acc. Trabajo</span>
              <span className="font-outfit text-2xl font-extrabold text-slate-800 mt-2">{countTrabajo}</span>
            </div>

            {/* In itinere */}
            <div className="p-4 rounded-xl border border-slate-150 bg-slate-50/30 hover:border-[#468DFF]/20 transition-all flex flex-col justify-between shadow-sm">
              <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider leading-none">In Itinere</span>
              <span className="font-outfit text-2xl font-extrabold text-slate-800 mt-2">{countItinere}</span>
            </div>

            {/* Enfermedad Profesional */}
            <div className="p-4 rounded-xl border border-slate-150 bg-slate-50/30 hover:border-[#468DFF]/20 transition-all flex flex-col justify-between shadow-sm">
              <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider leading-none">Enf. Profesional</span>
              <span className="font-outfit text-2xl font-extrabold text-slate-800 mt-2">{countEnfermedad}</span>
            </div>

            {/* Reingreso */}
            <div className="p-4 rounded-xl border border-slate-150 bg-slate-50/30 hover:border-[#468DFF]/20 transition-all flex flex-col justify-between shadow-sm">
              <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider leading-none">Reingreso</span>
              <span className="font-outfit text-2xl font-extrabold text-slate-800 mt-2">{countReingreso}</span>
            </div>

            {/* TOTAL */}
            <div className="p-4 rounded-xl border border-[#468DFF]/20 bg-blue-50/20 hover:border-[#468DFF]/40 transition-all flex flex-col justify-between shadow-sm col-span-2 sm:col-span-1">
              <span className="text-[9px] text-[#468DFF] uppercase font-bold tracking-wider leading-none">Total Siniestros</span>
              <span className="font-outfit text-2xl font-extrabold text-[#468DFF] mt-2">{totalAccidents}</span>
            </div>
          </div>

          {/* Columna Derecha: Gravedad (3 columnas de ancho) */}
          <div className="xl:col-span-3 grid grid-cols-3 gap-3">
            {/* Leve */}
            <div className="p-4 rounded-xl border border-green-400 bg-green-100 flex flex-col justify-between shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[9px] text-green-800 font-extrabold uppercase tracking-wider leading-none">Leve</span>
                <span className="h-2 w-2 rounded-full bg-green-600 shrink-0"></span>
              </div>
              <span className="font-outfit text-2xl font-extrabold text-green-800 mt-2">{countLeve}</span>
            </div>

            {/* Grave */}
            <div className="p-4 rounded-xl border border-yellow-400 bg-yellow-100 flex flex-col justify-between shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[9px] text-yellow-800 font-extrabold uppercase tracking-wider leading-none">Grave</span>
                <span className="h-2 w-2 rounded-full bg-yellow-600 shrink-0"></span>
              </div>
              <span className="font-outfit text-2xl font-extrabold text-yellow-800 mt-2">{countGrave}</span>
            </div>

            {/* Mortal */}
            <div className="p-4 rounded-xl border border-red-400 bg-red-100 flex flex-col justify-between shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[9px] text-red-800 font-extrabold uppercase tracking-wider leading-none">Mortal</span>
                <span className="h-2 w-2 rounded-full bg-red-600 shrink-0"></span>
              </div>
              <span className="font-outfit text-2xl font-extrabold text-red-800 mt-2">{countMortal}</span>
            </div>
          </div>
        </div>

        {/* Gráfico de Barras Custom de Índices de Siniestralidad */}
        <div className="border-t border-slate-150 pt-6 space-y-4">
          
          {/* Selector de Índices (4 Botones) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <button
              onClick={() => setActiveChartIndex('incidencia')}
              className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                activeChartIndex === 'incidencia'
                  ? 'bg-[#468DFF] text-white border-[#468DFF]'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              I. Incidencia AT y EP
            </button>
            <button
              onClick={() => setActiveChartIndex('mortalidad')}
              className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                activeChartIndex === 'mortalidad'
                  ? 'bg-[#468DFF] text-white border-[#468DFF]'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              I. Mortalidad AT y EP
            </button>
            <button
              onClick={() => setActiveChartIndex('perdida')}
              className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                activeChartIndex === 'perdida'
                  ? 'bg-[#468DFF] text-white border-[#468DFF]'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              I. Pérdida (IP)
            </button>
            <button
              onClick={() => setActiveChartIndex('dmb')}
              className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                activeChartIndex === 'dmb'
                  ? 'bg-[#468DFF] text-white border-[#468DFF]'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              Duración Media (DMB)
            </button>
          </div>

          {/* Gráfico propiamente dicho */}
          <div className="bg-slate-50/40 border border-slate-150 rounded-2xl p-6 shadow-inner space-y-4 overflow-x-auto scrollbar-thin select-none">
            <div className="flex items-end justify-between gap-2 md:gap-4 h-64 border-b border-slate-200 pb-3 pt-6 px-2 min-w-[650px]">
              
              {/* Barra Año Anterior */}
              <div className="flex-1 flex flex-col justify-end items-center h-full group relative">
                {/* Tooltip personalizado */}
                <div className="absolute top-2 hidden group-hover:flex flex-col items-center z-30 pointer-events-none animate-fade-in">
                  <div className="bg-slate-900/95 text-white text-[10px] py-2 px-3 rounded-xl shadow-xl font-sans whitespace-nowrap text-center flex flex-col gap-1 border border-slate-700/50">
                    <span className="font-extrabold text-slate-300 uppercase tracking-wider text-[8px]">{chartData.prevYear.label}</span>
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-[10px] text-slate-400 font-medium">Índice:</span>
                      <span className="font-outfit text-xs font-black text-[#468DFF]">{chartData.prevYear.value}</span>
                    </div>
                    {/* Operandos de cálculo */}
                    <div className="flex flex-col gap-0.5 border-t border-slate-850 pt-1 text-[8px] text-slate-400 font-medium text-left">
                      {activeChartIndex === 'incidencia' && (
                        <>
                          <div>Casos AT/EP: <span className="text-white font-bold">{chartData.prevYear.casosCount}</span></div>
                          <div>Pers. Cubiertas: <span className="text-white font-bold">{chartData.prevYear.personasCubiertas}</span></div>
                          <span className="text-[7px] text-slate-500 italic mt-0.5">(Casos / Personas) * 1.000</span>
                        </>
                      )}
                      {activeChartIndex === 'mortalidad' && (
                        <>
                          <div>Casos Mortales: <span className="text-white font-bold">{chartData.prevYear.mortalesCount}</span></div>
                          <div>Pers. Cubiertas: <span className="text-white font-bold">{chartData.prevYear.personasCubiertas}</span></div>
                          <span className="text-[7px] text-slate-500 italic mt-0.5">(Mortales / Personas) * 1.000.000</span>
                        </>
                      )}
                      {activeChartIndex === 'perdida' && (
                        <>
                          <div>Días de Baja: <span className="text-white font-bold">{chartData.prevYear.totalDiasBaja}</span></div>
                          <div>Pers. Cubiertas: <span className="text-white font-bold">{chartData.prevYear.personasCubiertas}</span></div>
                          <span className="text-[7px] text-slate-500 italic mt-0.5">(Días Baja / Personas) * 1.000</span>
                        </>
                      )}
                      {activeChartIndex === 'dmb' && (
                        <>
                          <div>Días de Baja: <span className="text-white font-bold">{chartData.prevYear.totalDiasBaja}</span></div>
                          <div>Casos con Baja: <span className="text-white font-bold">{chartData.prevYear.casosConBaja}</span></div>
                          <span className="text-[7px] text-slate-500 italic mt-0.5">Días Baja / Casos con Baja</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <span className="text-[9px] font-bold text-slate-500 mb-1 select-none">
                  {chartData.prevYear.value}
                </span>
                <div 
                  className="w-full bg-slate-300 rounded-t-lg transition-all duration-500 hover:bg-slate-400/90 cursor-pointer min-h-[4px]"
                  style={{
                    height: `${Math.max(4, Math.min(100, (chartData.prevYear.value / (Math.max(1, ...chartData.months.map(m => m.value), chartData.ytd.value, chartData.prevYear.value)) * 100)))}%`
                  }}
                />
                <span className="text-[9px] font-bold text-slate-400 mt-2 truncate w-full text-center">
                  {chartData.prevYear.label}
                </span>
              </div>

              {/* Separador visual entre Año Anterior e YTD */}
              <div className="w-[1px] bg-slate-200 h-full mx-1 shrink-0" />

              {/* Barra YTD */}
              <div className="flex-1 flex flex-col justify-end items-center h-full group relative">
                {/* Tooltip personalizado */}
                <div className="absolute top-2 hidden group-hover:flex flex-col items-center z-30 pointer-events-none animate-fade-in">
                  <div className="bg-slate-900/95 text-white text-[10px] py-2 px-3 rounded-xl shadow-xl font-sans whitespace-nowrap text-center flex flex-col gap-1 border border-slate-700/50">
                    <span className="font-extrabold text-slate-300 uppercase tracking-wider text-[8px]">{chartData.ytd.label}</span>
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-[10px] text-slate-400 font-medium">Índice:</span>
                      <span className="font-outfit text-xs font-black text-[#468DFF]">{chartData.ytd.value}</span>
                    </div>
                    {/* Operandos de cálculo */}
                    <div className="flex flex-col gap-0.5 border-t border-slate-850 pt-1 text-[8px] text-slate-400 font-medium text-left">
                      {activeChartIndex === 'incidencia' && (
                        <>
                          <div>Casos AT/EP: <span className="text-white font-bold">{chartData.ytd.casosCount}</span></div>
                          <div>Pers. Cubiertas: <span className="text-white font-bold">{chartData.ytd.personasCubiertas}</span></div>
                          <span className="text-[7px] text-slate-500 italic mt-0.5">(Casos / Personas) * 1.000</span>
                        </>
                      )}
                      {activeChartIndex === 'mortalidad' && (
                        <>
                          <div>Casos Mortales: <span className="text-white font-bold">{chartData.ytd.mortalesCount}</span></div>
                          <div>Pers. Cubiertas: <span className="text-white font-bold">{chartData.ytd.personasCubiertas}</span></div>
                          <span className="text-[7px] text-slate-500 italic mt-0.5">(Mortales / Personas) * 1.000.000</span>
                        </>
                      )}
                      {activeChartIndex === 'perdida' && (
                        <>
                          <div>Días de Baja: <span className="text-white font-bold">{chartData.ytd.totalDiasBaja}</span></div>
                          <div>Pers. Cubiertas: <span className="text-white font-bold">{chartData.ytd.personasCubiertas}</span></div>
                          <span className="text-[7px] text-slate-500 italic mt-0.5">(Días Baja / Personas) * 1.000</span>
                        </>
                      )}
                      {activeChartIndex === 'dmb' && (
                        <>
                          <div>Días de Baja: <span className="text-white font-bold">{chartData.ytd.totalDiasBaja}</span></div>
                          <div>Casos con Baja: <span className="text-white font-bold">{chartData.ytd.casosConBaja}</span></div>
                          <span className="text-[7px] text-slate-500 italic mt-0.5">Días Baja / Casos con Baja</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <span className="text-[9px] font-extrabold text-[#0511F2] mb-1 select-none">
                  {chartData.ytd.value}
                </span>
                <div 
                  className="w-full bg-[#0511F2] rounded-t-lg transition-all duration-500 hover:bg-[#0511F2]/90 cursor-pointer min-h-[4px]"
                  style={{
                    height: `${Math.max(4, Math.min(100, (chartData.ytd.value / (Math.max(1, ...chartData.months.map(m => m.value), chartData.ytd.value, chartData.prevYear.value)) * 100)))}%`
                  }}
                />
                <span className="text-[9px] font-extrabold text-[#0511F2] mt-2 truncate w-full text-center">
                  {chartData.ytd.label}
                </span>
              </div>

              {/* Separador visual entre YTD y Meses */}
              <div className="w-[1px] bg-slate-200 h-full mx-1 shrink-0" />

              {/* Barras de los 12 Meses */}
              {chartData.months.map((mVal, idx) => (
                <div key={idx} className="flex-1 flex flex-col justify-end items-center h-full group relative">
                  {/* Tooltip personalizado */}
                  <div className="absolute top-2 hidden group-hover:flex flex-col items-center z-30 pointer-events-none animate-fade-in">
                    <div className="bg-slate-900/95 text-white text-[10px] py-2 px-3 rounded-xl shadow-xl font-sans whitespace-nowrap text-center flex flex-col gap-1 border border-slate-700/50">
                      <span className="font-extrabold text-slate-300 uppercase tracking-wider text-[8px]">{mVal.label}</span>
                      <div className="flex items-baseline justify-center gap-1">
                        <span className="text-[10px] text-slate-400 font-medium">Índice:</span>
                        <span className="font-outfit text-xs font-black text-[#468DFF]">{mVal.value}</span>
                      </div>
                      {/* Operandos de cálculo */}
                      <div className="flex flex-col gap-0.5 border-t border-slate-850 pt-1 text-[8px] text-slate-400 font-medium text-left">
                        {activeChartIndex === 'incidencia' && (
                          <>
                            <div>Casos AT/EP: <span className="text-white font-bold">{mVal.casosCount}</span></div>
                            <div>Pers. Cubiertas: <span className="text-white font-bold">{mVal.personasCubiertas}</span></div>
                            <span className="text-[7px] text-slate-500 italic mt-0.5">(Casos / Personas) * 1.000</span>
                          </>
                        )}
                        {activeChartIndex === 'mortalidad' && (
                          <>
                            <div>Casos Mortales: <span className="text-white font-bold">{mVal.mortalesCount}</span></div>
                            <div>Pers. Cubiertas: <span className="text-white font-bold">{mVal.personasCubiertas}</span></div>
                            <span className="text-[7px] text-slate-500 italic mt-0.5">(Mortales / Personas) * 1.000.000</span>
                          </>
                        )}
                        {activeChartIndex === 'perdida' && (
                          <>
                            <div>Días de Baja: <span className="text-white font-bold">{mVal.totalDiasBaja}</span></div>
                            <div>Pers. Cubiertas: <span className="text-white font-bold">{mVal.personasCubiertas}</span></div>
                            <span className="text-[7px] text-slate-500 italic mt-0.5">(Días Baja / Personas) * 1.000</span>
                          </>
                        )}
                        {activeChartIndex === 'dmb' && (
                          <>
                            <div>Días de Baja: <span className="text-white font-bold">{mVal.totalDiasBaja}</span></div>
                            <div>Casos con Baja: <span className="text-white font-bold">{mVal.casosConBaja}</span></div>
                            <span className="text-[7px] text-slate-500 italic mt-0.5">Días Baja / Casos con Baja</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <span className="text-[9px] font-bold text-[#468DFF] mb-1 select-none group-hover:opacity-100 transition-opacity">
                    {mVal.value}
                  </span>
                  <div 
                    className="w-full bg-[#468DFF] rounded-t-lg transition-all duration-500 hover:bg-[#0511F2] cursor-pointer min-h-[4px]"
                    style={{
                      height: `${Math.max(4, Math.min(100, (mVal.value / (Math.max(1, ...chartData.months.map(m => m.value), chartData.ytd.value, chartData.prevYear.value)) * 100)))}%`
                    }}
                  />
                  <span className="text-[9px] font-bold text-slate-400 mt-2 truncate w-full text-center">
                    {mVal.label}
                  </span>
                </div>
              ))}

            </div>
          </div>
        </div>
      </div>
    );
  };




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
          {/* Fila del Programa de Gestión o Siniestralidad */}
          {profile && profile.role === 'cliente' ? (
            renderSiniestralidadPanel()
          ) : (
            <div className="space-y-6">
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
                      <table className="w-full border-collapse text-left text-xs min-w-[800px]">
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
                            className={`aspect-square rounded-lg flex flex-col items-center justify-center text-xs font-semibold relative transition-all cursor-pointer
                              ${isSelected ? 'bg-[#468DFF] text-white' : 'hover:bg-slate-50 text-slate-700'}
                            `}
                          >
                            <span>{d.day}</span>
                            {hasActs && (
                              <span className={`absolute bottom-1.5 h-1.5 w-1.5 rounded-full ${dotColor}`} />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="border-t border-slate-150 pt-3 flex flex-col gap-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      Tareas del día ({selectedDateStr}):
                    </span>
                    <div className="space-y-2 max-h-[120px] overflow-y-auto pr-1">
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
              
              {/* Estadísticas de Siniestralidad para Admin/Miembro (debajo de ambos) */}
              {renderSiniestralidadPanel()}
            </div>
          )}

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
                  
                  <a href={`/${tenantSlug}/correctivas?new=true`} className="p-4 rounded-xl border border-slate-150 bg-slate-50/50 hover:bg-[#468DFF]/5 hover:border-[#468DFF]/30 transition-all flex items-start gap-3 group">
                    <div className="p-2 rounded-lg bg-blue-500/10 text-[#468DFF] shrink-0 mt-0.5">
                      <ClipboardList className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-800 block group-hover:text-[#468DFF] transition-colors">Nueva Acción Correctiva</span>
                      <span className="text-[10px] text-slate-500 block mt-1">Registrar hallazgos, cargar evidencias y plazos.</span>
                    </div>
                  </a>

                  <a href={`/${tenantSlug}/visitas?new=true`} className="p-4 rounded-xl border border-slate-150 bg-slate-50/50 hover:bg-[#468DFF]/5 hover:border-[#468DFF]/30 transition-all flex items-start gap-3 group">
                    <div className="p-2 rounded-lg bg-blue-500/10 text-[#468DFF] shrink-0 mt-0.5">
                      <ShieldCheck className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-800 block group-hover:text-[#468DFF] transition-colors">Nueva Constancia de Visita</span>
                      <span className="text-[10px] text-slate-500 block mt-1">Cargar visitas técnicas de control y tareas realizadas en establecimientos.</span>
                    </div>
                  </a>

                  <a href={`/${tenantSlug}/avisos?new=true`} className="p-4 rounded-xl border border-slate-150 bg-slate-50/50 hover:bg-[#468DFF]/5 hover:border-[#468DFF]/30 transition-all flex items-start gap-3 group">
                    <div className="p-2 rounded-lg bg-blue-500/10 text-[#468DFF] shrink-0 mt-0.5">
                      <AlertTriangle className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-800 block group-hover:text-[#468DFF] transition-colors">Nuevo Aviso de Riesgo</span>
                      <span className="text-[10px] text-slate-500 block mt-1">Cargar notificaciones de condiciones peligrosas en establecimientos.</span>
                    </div>
                  </a>

                  <a href={`/${tenantSlug}/accidentes?new=true`} className="p-4 rounded-xl border border-slate-150 bg-slate-50/50 hover:bg-[#468DFF]/5 hover:border-[#468DFF]/30 transition-all flex items-start gap-3 group">
                    <div className="p-2 rounded-lg bg-blue-500/10 text-[#468DFF] shrink-0 mt-0.5">
                      <Activity className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-800 block group-hover:text-[#468DFF] transition-colors">Nueva Carga de Accidente</span>
                      <span className="text-[10px] text-slate-500 block mt-1">Registrar accidentes de trabajo, in itinere o enfermedades profesionales.</span>
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

      {/* ── Modal Guía de Fórmulas e Índices de Siniestralidad ── */}
      {showIndicesGuide && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white border border-slate-150 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Cabecera */}
            <div className="p-6 border-b border-slate-150 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-500/10 text-[#468DFF]">
                  <Activity className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-outfit text-base font-extrabold text-slate-900 leading-tight">
                    Fórmulas e Índices de Siniestralidad
                  </h3>
                  <p className="text-[10px] text-slate-500 font-medium">Guía metodológica oficial y fórmulas de cálculo</p>
                </div>
              </div>
              <button 
                onClick={() => setShowIndicesGuide(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Contenido (Scrollable) */}
            <div className="p-6 overflow-y-auto space-y-6 text-slate-600 text-xs leading-relaxed">
              
              {/* 1. Incidencia */}
              <div className="space-y-2.5">
                <h4 className="font-outfit text-xs font-extrabold text-slate-900 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#468DFF]" />
                  Índice de Incidencia AT y EP
                </h4>
                <p className="text-slate-500 text-[11px] font-medium leading-normal">
                  Se computa como la cantidad de accidentes de trabajo o enfermedades profesionales (AT y EP) con al menos un día de baja laboral o secuela incapacitante sin días de baja laboral cada mil personas trabajadoras cubiertas. El índice se calcula para el período de un año (por razón social o establecimiento).
                </p>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-150 font-mono text-[10px] text-slate-800 font-bold text-center">
                  Índice de Incidencia = (Casos AT y EP con baja o secuela / Personas cubiertas) x 1.000
                </div>
              </div>

              {/* 2. Mortalidad */}
              <div className="space-y-2.5">
                <h4 className="font-outfit text-xs font-extrabold text-slate-900 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#0511F2]" />
                  Índice de Incidencia de Casos Mortales AT y EP
                </h4>
                <p className="text-slate-500 text-[11px] font-medium leading-normal">
                  Se calcula como la cantidad de casos mortales por accidentes de trabajo o enfermedades profesionales, cada millón de personas cubiertas. El índice se calcula para el período de un año (por razón social o establecimiento).
                </p>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-150 font-mono text-[10px] text-slate-800 font-bold text-center">
                  Índice de Mortalidad = (Casos mortales de AT y EP / Personas cubiertas) x 1.000.000
                </div>
              </div>

              {/* 3. Pérdida */}
              <div className="space-y-2.5">
                <h4 className="font-outfit text-xs font-extrabold text-slate-900 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-slate-400" />
                  Índice de Pérdida (IP)
                </h4>
                <p className="text-slate-500 text-[11px] font-medium leading-normal">
                  El índice de pérdida refleja la cantidad de jornadas no trabajadas en el año debido a siniestros, por cada mil personas cubiertas.
                </p>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-150 font-mono text-[10px] text-slate-800 font-bold text-center">
                  Índice de Pérdida (IP) = (Jornadas no trabajadas / Personas cubiertas) x 1.000
                </div>
              </div>

              {/* 4. DMB */}
              <div className="space-y-2.5">
                <h4 className="font-outfit text-xs font-extrabold text-slate-900 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-slate-800" />
                  Duración Media de las Bajas (DMB)
                </h4>
                <p className="text-slate-500 text-[11px] font-medium leading-normal">
                  La duración media de las bajas indica el promedio de jornadas no trabajadas por cada persona damnificada, incluyendo solamente aquellas con baja laboral.
                </p>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-150 font-mono text-[10px] text-slate-800 font-bold text-center">
                  Duración Media (DMB) = Jornadas no trabajadas / Casos con días de baja laboral
                </div>
              </div>

              {/* Aclaración Importante */}
              <div className="p-4 bg-amber-50 rounded-xl border border-amber-200/60 space-y-1.5 mt-2">
                <h5 className="font-outfit text-xs font-bold text-amber-800 flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-600" />
                  Aclaración Importante
                </h5>
                <p className="text-amber-700 text-[11px] font-medium leading-relaxed">
                  Para que los indicadores de siniestralidad funcionen correctamente, es fundamental contar con datos previamente cargados tanto en la sección de <strong>Accidentes</strong> (registro de siniestros) como en la sección de <strong>Nómina de Personal</strong> (cantidad de trabajadores activos), asociados a la misma Razón Social y Establecimiento correspondientes.
                </p>
              </div>

            </div>

            {/* Pie de modal */}
            <div className="p-4 border-t border-slate-150 bg-slate-50/50 flex justify-end">
              <button
                onClick={() => setShowIndicesGuide(false)}
                className="px-5 py-2 rounded-xl bg-[#468DFF] hover:bg-[#0511F2] text-white font-bold text-xs transition-colors cursor-pointer"
              >
                Entendido
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
