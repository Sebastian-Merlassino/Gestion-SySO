// src/app/[tenant-slug]/programa/page.js
'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import { supabase } from '@/lib/supabase';
import { formatDate, formatAsDateInput, convertToDbDate } from '@/lib/utils';
import {
  Calendar,
  List,
  PlusCircle,
  Search,
  Building,
  Users,
  FileText,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  X,
  Check,
  Loader2,
  Download,
  Trash2,
  HelpCircle,
  Edit,
  Briefcase,
  Settings,
  LogOut,
  User,
  Menu,
  Info,
  CalendarDays,
  ExternalLink,
  ClipboardList,
  GraduationCap,
  ArrowLeft,
  Sliders,
  Flame,
  ClipboardCheck,
  ChevronDown,
  ChevronUp,
  Eye,
  Folder,
  Upload
} from 'lucide-react';

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const WEEK_DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export default function ProgramaGestion({ params }) {
  const tenantSlug = params['tenant-slug'];

  // Vistas y Cargas
  const [view, setView] = useState('list'); // 'list' o 'calendar'
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDevMode, setIsDevMode] = useState(false);

  // Sesión y Datos Contexto
  const [profile, setProfile] = useState(() => {
    if (typeof window !== 'undefined') {
      const cached = sessionStorage.getItem('user-profile');
      return cached ? JSON.parse(cached) : null;
    }
    return null;
  });
  const [tenant, setTenant] = useState(null);

  // Estados y Refs para Drag and Drop
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState('');

  const handleDragOver = (e) => {
    e.preventDefault();
    if (!canEdit) return;
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    if (!canEdit) return;
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (!canEdit) return;
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type === "application/pdf") {
        handleFileChangeWithConfirm(file);
        setSelectedFileName(file.name);
      } else {
        triggerToast('Solo se permiten archivos PDF', 'error');
      }
    }
  };
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isReadOnlyView, setIsReadOnlyView] = useState(false);

  // Permisos granulares de edición
  const getSectionPermissions = (userProfile, sectionName) => {
    if (!userProfile) return { cargar: true, editar: true, eliminar: true };
    if (userProfile.role === 'admin') return { cargar: true, editar: true, eliminar: true };
    if (userProfile.role === 'cliente') return { cargar: false, editar: false, eliminar: false };
    const perm = userProfile.permisos?.[sectionName];
    if (perm === true || perm === undefined) return { cargar: true, editar: true, eliminar: true };
    if (perm === false) return { cargar: false, editar: false, eliminar: false };
    return {
      cargar: perm.cargar === true,
      editar: perm.editar === true,
      eliminar: perm.eliminar === true
    };
  };

  const sectionPerms = getSectionPermissions(profile, 'programa');
  const canCargar = sectionPerms.cargar;
  const canEditar = sectionPerms.editar;
  const canEliminar = sectionPerms.eliminar;
  const isFormDisabled = (editingId ? !canEditar : !canCargar) || isReadOnlyView;
  const canEdit = !isFormDisabled; // Maintain compatibility

  // Colecciones cargadas
  const [empresas, setEmpresas] = useState([]);
  const [allEstablecimientos, setAllEstablecimientos] = useState([]);
  const [miembros, setMiembros] = useState([]);
  const [catalogo, setCatalogo] = useState([]);
  const [actividades, setActividades] = useState([]);

  // Estados del calendario
  const [calendarDate, setCalendarDate] = useState(new Date());

  // Filtros
  const [filterEmpresa, setFilterEmpresa] = useState('');
  const [filterEstablecimiento, setFilterEstablecimiento] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setShowFilters(false);
    }
  }, []);

  // Ordenamiento
  const [sortField, setSortField] = useState('fecha_planificada');
  const [sortOrder, setSortOrder] = useState('asc');
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

  // Formulario Slide-over
  const [showForm, setShowForm] = useState(false);
  const [empresaId, setEmpresaId] = useState('');
  const [establecimientoId, setEstablecimientoId] = useState('');
  const [catalogoId, setCatalogoId] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [marcoLegal, setMarcoLegal] = useState('');
  const [responsableId, setResponsableId] = useState('');
  const [responsableCustom, setResponsableCustom] = useState('');
  const [progreso, setProgreso] = useState(0);
  const [fechaPlanificada, setFechaPlanificada] = useState('');
  const [fechaRealizacion, setFechaRealizacion] = useState('');
  const [documentoFile, setDocumentoFile] = useState(null);
  const [documentoUrl, setDocumentoUrl] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [formErrors, setFormErrors] = useState({});
  const [uploadType, setUploadType] = useState('local'); // 'local', 'drive' or 'legajo'
  const [driveLink, setDriveLink] = useState('');
  const [legajoDocuments, setLegajoDocuments] = useState([]);
  const [selectedLegajoDocUrl, setSelectedLegajoDocUrl] = useState('');
  const [loadingLegajoDocs, setLoadingLegajoDocs] = useState(false);

  useEffect(() => {
    if (!documentoFile) {
      setSelectedFileName('');
    }
  }, [documentoFile]);

  useEffect(() => {
    if (showForm && empresaId && uploadType === 'legajo') {
      loadLegajoDocuments(empresaId, establecimientoId);
    }
  }, [showForm, empresaId, establecimientoId, uploadType]);


  // Modales y Toasts
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [confirmModal, setConfirmModal] = useState({ show: false, title: '', message: '', onConfirm: null, confirmText: 'Eliminar' });

  // 1. Cargar datos iniciales
  useEffect(() => {
    const checkEnvAndLoad = async () => {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      if (!supabaseUrl || supabaseUrl.includes('placeholder')) {
        setIsDevMode(true);
        loadMockData();
      } else {
        await loadRealData();
      }
    };
    checkEnvAndLoad();
  }, []);

  const triggerToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 4000);
  };

  const loadRealData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = '/login';
        return;
      }

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
      if (prof.role === 'cliente') {
        setIsReadOnlyView(true);
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
            window.location.href = `/${homeTen.slug}/programa`;
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
            window.location.href = `/${homeTen.slug}/programa`;
            return;
          }
        }
        window.location.href = '/login';
        return;
      }

      setTenant(ten);

      // Cargar Empresas Clientes
      let empresasQuery = supabase
        .from('empresas')
        .select('id, razon_social')
        .eq('tenant_id', ten.id);
      if (prof.role === 'cliente') {
        empresasQuery = empresasQuery.eq('id', prof.empresa_id);
      }
      const { data: emps, error: empErr } = await empresasQuery.order('razon_social');
      if (empErr) throw empErr;
      setEmpresas(emps || []);

      // Cargar Todos los Establecimientos del Tenant
      let estsQuery = supabase
        .from('establecimientos')
        .select('id, empresa_id, denominacion')
        .eq('tenant_id', ten.id);
      if (prof.role === 'cliente') {
        estsQuery = estsQuery.eq('empresa_id', prof.empresa_id);
      }
      const { data: ests, error: estErr } = await estsQuery.order('denominacion');
      if (estErr) throw estErr;
      setAllEstablecimientos(ests || []);

      // Cargar Miembros del Equipo
      const { data: mems, error: memErr } = await supabase
        .from('miembros_equipo')
        .select('id, full_name')
        .eq('tenant_id', ten.id)
        .order('full_name');
      if (memErr) throw memErr;
      setMiembros(mems || []);

      // Cargar Catálogo de Actividades
      const { data: cats, error: catErr } = await supabase
        .from('programa_anual_catalogo')
        .select('*')
        .order('descripcion');
      if (catErr) throw catErr;
      setCatalogo(cats || []);

      // Cargar Programa Anual
      let progQuery = supabase
        .from('programa_anual')
        .select('*')
        .eq('tenant_id', ten.id);
      if (prof.role === 'cliente') {
        progQuery = progQuery.eq('empresa_id', prof.empresa_id);
      }
      const { data: progs, error: progErr } = await progQuery;
      if (progErr) throw progErr;
      setActividades(progs || []);

      setLoading(false);
    } catch (err) {
      console.error('Error al cargar datos reales del programa:', err);
      triggerToast('Error al conectar con la base de datos.', 'error');
      setIsDevMode(true);
      loadMockData();
    }
  };

  const loadMockData = () => {
    setProfile({ full_name: 'Profesional de SySO (Mock)', role: 'admin' });
    setTenant({ id: 'mock-tenant', name: 'Consultora de Prueba', plan_id: 'free' });

    const mockEmpresas = [
      { id: 'mock-empresa-1', razon_social: 'Acme Argentina S.A.' },
      { id: 'mock-empresa-2', razon_social: 'Constructora del Sur' }
    ];
    setEmpresas(mockEmpresas);

    const mockEsts = [
      { id: 'mock-est-1', empresa_id: 'mock-empresa-1', denominacion: 'Planta Munro' },
      { id: 'mock-est-2', empresa_id: 'mock-empresa-1', denominacion: 'Oficinas Belgrano' },
      { id: 'mock-est-3', empresa_id: 'mock-empresa-2', denominacion: 'Obra Autopista' }
    ];
    setAllEstablecimientos(mockEsts);

    const mockMiembros = [
      { id: 'mock-miembro-1', full_name: 'Ing. Carlos Gómez' },
      { id: 'mock-miembro-2', full_name: 'Lic. Laura Martínez' }
    ];
    setMiembros(mockMiembros);

    const mockCats = [
      { id: 'mock-cat-1', descripcion: 'Análisis bacteriológico de agua de consumo humano (Semestral)', marco_legal: 'Ley 19.587 - Dec. 351/79 - Res. 905/15', jurisdiccion: 'Nacional' },
      { id: 'mock-cat-2', descripcion: 'Control trimestral de Extintores (verificación visual de la presión por observación del manómetro, de partes mecánicas, válvula, precinto, marbete, manga, etc.)', marco_legal: 'Ley 19.587 - Dec. 351/79 - Res. 905/15', jurisdiccion: 'Nacional' },
      { id: 'mock-cat-3', descripcion: 'Controlar y verificar la Puesta a tierra y continuidad de masas', marco_legal: 'Dec. 351/79 - Res. 900/15 - Res. 905/15', jurisdiccion: 'Nacional' }
    ];
    setCatalogo(mockCats);

    const mockProgs = [
      {
        id: 'mock-prog-1',
        tenant_id: 'mock-tenant',
        empresa_id: 'mock-empresa-1',
        establecimiento_id: 'mock-est-1',
        catalogo_id: 'mock-cat-1',
        descripcion: 'Análisis bacteriológico de agua de consumo humano (Semestral)',
        marco_legal: 'Ley 19.587 - Dec. 351/79 - Res. 905/15',
        responsable_id: 'mock-miembro-1',
        responsable: 'Ing. Carlos Gómez',
        progreso: 100,
        fecha_planificada: '2026-06-10',
        fecha_realizacion: '2026-06-09',
        documento_url: 'mock-pdf-url',
        observaciones: 'Realizado sin novedades por el laboratorio externo.'
      },
      {
        id: 'mock-prog-2',
        tenant_id: 'mock-tenant',
        empresa_id: 'mock-empresa-1',
        establecimiento_id: 'mock-est-2',
        catalogo_id: 'mock-cat-2',
        descripcion: 'Control trimestral de Extintores (verificación visual de la presión por observación del manómetro, de partes mecánicas, válvula, precinto, marbete, manga, etc.)',
        marco_legal: 'Ley 19.587 - Dec. 351/79 - Res. 905/15',
        responsable_id: 'mock-miembro-2',
        responsable: 'Lic. Laura Martínez',
        progreso: 40,
        fecha_planificada: '2026-06-25',
        fecha_realizacion: null,
        documento_url: null,
        observaciones: 'Próxima semana se recorren las oficinas.'
      },
      {
        id: 'mock-prog-3',
        tenant_id: 'mock-tenant',
        empresa_id: 'mock-empresa-2',
        establecimiento_id: 'mock-est-3',
        catalogo_id: 'mock-cat-3',
        descripcion: 'Controlar y verificar la Puesta a tierra y continuidad de masas',
        marco_legal: 'Dec. 351/79 - Res. 900/15 - Res. 905/15',
        responsable_id: 'mock-miembro-1',
        responsable: 'Ing. Carlos Gómez',
        progreso: 0,
        fecha_planificada: '2026-06-05',
        fecha_realizacion: null,
        documento_url: null,
        observaciones: 'Vencido. Esperando aprobación de presupuesto.'
      }
    ];
    setActividades(mockProgs);
    setLoading(false);
  };

  const loadLegajoDocuments = async (empId, estId) => {
    if (!empId) {
      setLegajoDocuments([]);
      return;
    }
    setLoadingLegajoDocs(true);
    try {
      if (isDevMode) {
        // Mock de documentos en el legajo técnico para pruebas
        const mockDocs = [
          {
            id: 'mock-legajo-1',
            empresa_id: 'mock-empresa-1',
            establecimiento_id: 'mock-est-1',
            documento_nombre: 'Relevamiento General de Riesgos Laborales',
            documento_url: 'mock-pdf-url',
            fecha: '2026-06-10'
          },
          {
            id: 'mock-legajo-2',
            empresa_id: 'mock-empresa-1',
            establecimiento_id: 'mock-est-1',
            documento_nombre: 'Estudio de Ruido Ocupacional',
            documento_url: 'mock-pdf-url',
            fecha: '2026-06-12'
          },
          {
            id: 'mock-legajo-3',
            empresa_id: 'mock-empresa-1',
            establecimiento_id: null,
            documento_nombre: 'Plan de Capacitación Anual General',
            documento_url: 'mock-pdf-url',
            fecha: '2026-06-01'
          },
          {
            id: 'mock-legajo-4',
            empresa_id: 'mock-empresa-2',
            establecimiento_id: 'mock-est-3',
            documento_nombre: 'Certificado de Carga de Fuego',
            documento_url: 'mock-pdf-url',
            fecha: '2026-06-15'
          }
        ];
        // Filtrar por empresa y (opcionalmente) por establecimiento
        const filtered = mockDocs.filter(d => 
          d.empresa_id === empId && 
          (!estId || d.establecimiento_id === estId || d.establecimiento_id === null)
        );
        setLegajoDocuments(filtered);
      } else {
        // Consulta real a Supabase
        const { data, error } = await supabase
          .from('legajo_tecnico')
          .select('id, documento_nombre, documento_url, fecha, establecimiento_id')
          .eq('empresa_id', empId)
          .order('fecha', { ascending: false });
        
        if (error) throw error;

        // Filtrar en memoria para incluir los del establecimiento o los globales (null)
        const filtered = (data || []).filter(d => 
          !estId || d.establecimiento_id === estId || d.establecimiento_id === null
        );

        setLegajoDocuments(filtered);
      }
    } catch (err) {
      console.error('Error al cargar documentos del legajo:', err);
      triggerToast('Error al cargar documentos del legajo técnico.', 'error');
    } finally {
      setLoadingLegajoDocs(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('user-profile');
    }
    window.location.href = '/login';
  };



  // 2. Lógica de cálculo dinámico de estados y alertas
  const getItemStatusAndColor = (item) => {
    const hasRealization = !!item.fecha_realizacion;
    const hasPlanDate = !!item.fecha_planificada;

    // Sin ninguna fecha: En análisis
    if (!hasRealization && !hasPlanDate) {
      return {
        estadoText: 'En análisis',
        estadoColor: '#64748b', // Slate
        dateAlertColor: ''
      };
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const today = new Date(todayStr);
    const planDate = new Date(item.fecha_planificada);

    let estadoText = 'Vigente';
    let estadoColor = '#0b8043'; // Verde

    if (!hasRealization && today >= planDate) {
      estadoText = 'Vencido';
      estadoColor = '#fa050b'; // Rojo
    }

    let dateAlertColor = ''; // Sin alerta
    if (!hasRealization && hasPlanDate) {
      const timeDiff = planDate.getTime() - today.getTime();
      const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

      if (daysDiff < 0) {
        dateAlertColor = 'red'; // Vencida
      } else if (daysDiff <= 15) {
        dateAlertColor = 'yellow'; // Faltan 15 días o menos
      }
    }

    return {
      estadoText,
      estadoColor,
      dateAlertColor
    };
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // 3. Filtrar actividades
  const filteredActividades = actividades.filter(act => {
    // Buscar correspondencia en la Razón Social de la empresa
    const empresa = empresas.find(e => e.id === act.empresa_id);
    const razonSocialMatch = empresa ? empresa.razon_social.toLowerCase() : '';
    const descMatch = act.descripcion ? act.descripcion.toLowerCase() : '';
    const obsMatch = act.observaciones ? act.observaciones.toLowerCase() : '';
    const query = searchQuery.toLowerCase();

    const matchesSearch =
      razonSocialMatch.includes(query) ||
      descMatch.includes(query) ||
      obsMatch.includes(query);

    const matchesEmpresa = !filterEmpresa || act.empresa_id === filterEmpresa;
    const matchesEstablecimiento = !filterEstablecimiento || act.establecimiento_id === filterEstablecimiento;

    // Filtro por mes y año
    const planDateStr = act.fecha_planificada || '';
    const planYear = planDateStr.split('-')[0] || '';
    const planMonth = planDateStr.split('-')[1] || '';
    const matchesMonth = !filterMonth || planMonth === filterMonth;
    const matchesYear = !filterYear || planYear === filterYear;

    const statusData = getItemStatusAndColor(act);
    const matchesEstado = !filterEstado || statusData.estadoText === filterEstado;

    return matchesSearch && matchesEmpresa && matchesEstablecimiento && matchesMonth && matchesYear && matchesEstado;
  });

  const sortedActividades = [...filteredActividades].sort((a, b) => {
    if (!sortField) return 0;

    let valA = '';
    let valB = '';

    if (sortField === 'cliente') {
      const empA = empresas.find(e => e.id === a.empresa_id);
      const empB = empresas.find(e => e.id === b.empresa_id);
      valA = empA ? empA.razon_social.toLowerCase() : '';
      valB = empB ? empB.razon_social.toLowerCase() : '';
    } else if (sortField === 'actividad') {
      valA = (a.descripcion || '').toLowerCase();
      valB = (b.descripcion || '').toLowerCase();
    } else if (sortField === 'responsable') {
      valA = (a.responsable || '').toLowerCase();
      valB = (b.responsable || '').toLowerCase();
    } else if (sortField === 'fecha_planificada') {
      valA = a.fecha_planificada || '';
      valB = b.fecha_planificada || '';
    } else if (sortField === 'fecha_realizacion') {
      valA = a.fecha_realizacion || '';
      valB = b.fecha_realizacion || '';
    } else if (sortField === 'estado') {
      valA = getItemStatusAndColor(a).estadoText || '';
      valB = getItemStatusAndColor(b).estadoText || '';
    } else {
      valA = a[sortField] || '';
      valB = b[sortField] || '';
    }

    if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  // 4. Manejar cambios en el Formulario
  const handleEmpresaChange = (val) => {
    setEmpresaId(val);
    setEstablecimientoId(''); // Resetear establecimiento subordinado
  };

  const handleDescripcionChange = (val) => {
    setCatalogoId(val);
    if (val === '__custom__') {
      // Opción manual: limpiar solo si venía de un catálogo, dejar editar libremente
      setDescripcion('');
      setMarcoLegal('');
    } else {
      const catalogItem = catalogo.find(c => c.id === val);
      if (catalogItem) {
        setDescripcion(catalogItem.descripcion);
        setMarcoLegal(catalogItem.marco_legal || '');
      } else {
        setDescripcion('');
        setMarcoLegal('');
      }
    }
  };

  const handleRealizacionChange = (val) => {
    setFechaRealizacion(val);
    if (val) {
      setProgreso(100); // Forzar 100% de progreso
    }
  };

  // Cambiar tipo de carga con aviso si ya hay documento guardado
  const handleSwitchUploadType = (newType) => {
    if (documentoUrl && newType !== uploadType) {
      setConfirmModal({
        show: true,
        title: 'Reemplazar documento existente',
        message: 'Ya hay un documento guardado. Si cambiás el método de carga y guardás, el documento actual será reemplazado. ¿Querés continuar?',
        confirmText: 'Continuar',
        onConfirm: () => {
          setUploadType(newType);
          setDocumentoFile(null);
          setDriveLink('');
          setSelectedLegajoDocUrl('');
          setConfirmModal({ show: false, title: '', message: '', onConfirm: null, confirmText: 'Eliminar' });
        }
      });
    } else {
      setUploadType(newType);
      setDocumentoFile(null);
      setDriveLink('');
      setSelectedLegajoDocUrl('');
    }
  };

  // Seleccionar archivo local con aviso si ya hay documento guardado
  const handleFileChangeWithConfirm = (file) => {
    if (!file) return;
    if (documentoUrl) {
      setConfirmModal({
        show: true,
        title: 'Reemplazar documento existente',
        message: `Ya hay un documento guardado. Al guardar el formulario con este nuevo archivo ("${file.name}"), el documento anterior será reemplazado. ¿Confirmás el reemplazo?`,
        confirmText: 'Reemplazar',
        onConfirm: () => {
          setDocumentoFile(file);
          setSelectedFileName(file.name);
          setDocumentoUrl(''); // Limpiar la URL anterior para reflejar el reemplazo
          setConfirmModal({ show: false, title: '', message: '', onConfirm: null, confirmText: 'Eliminar' });
        }
      });
    } else {
      setDocumentoFile(file);
      setSelectedFileName(file.name);
    }
  };

  // 5. Cargar para Editar
  const handleEdit = (item) => {
    setEditingId(item.id);
    setEmpresaId(item.empresa_id || '');
    setEstablecimientoId(item.establecimiento_id || '');
    // Si el catalogo_id ya no está en el catálogo (o no existía), tratar como entrada manual
    const inCatalog = catalogo.some(c => c.id === item.catalogo_id);
    setCatalogoId(inCatalog ? (item.catalogo_id || '') : '__custom__');
    setDescripcion(item.descripcion || '');
    setMarcoLegal(item.marco_legal || '');
    if (item.responsable_id) {
      setResponsableId(item.responsable_id);
      setResponsableCustom('');
    } else if (item.responsable) {
      setResponsableId('__custom__');
      setResponsableCustom(item.responsable);
    } else {
      setResponsableId('');
      setResponsableCustom('');
    }
    setProgreso(item.progreso || 0);
    setFechaPlanificada(formatDate(item.fecha_planificada) || '');
    setFechaRealizacion(formatDate(item.fecha_realizacion) || '');
    setDocumentoUrl(item.documento_url || '');
    setDocumentoFile(null);
    setUploadType('local');
    setDriveLink('');
    setObservaciones(item.observaciones || '');
    setFormErrors({});
    setShowForm(true);
  };

  // Abrir formulario nuevo
  const handleAddNew = (preselectedDate = '') => {
    setIsReadOnlyView(false);
    setEditingId(null);
    setEmpresaId('');
    setEstablecimientoId('');
    setCatalogoId('');
    setDescripcion('');
    setMarcoLegal('');
    setResponsableId('');
    setResponsableCustom('');
    setProgreso(0);
    setFechaPlanificada(formatDate(preselectedDate || new Date().toISOString().split('T')[0]));
    setFechaRealizacion('');
    setDocumentoUrl('');
    setDocumentoFile(null);
    setUploadType('local');
    setDriveLink('');
    setObservaciones('');
    setFormErrors({});
    setShowForm(true);
  };

  // 6. Subir PDF y Guardar Actividad
  const handleSave = async (e) => {
    e.preventDefault();

    // Validar formulario
    const errors = {};
    if (!empresaId) errors.empresaId = 'La razón social es obligatoria.';
    if (!establecimientoId) errors.establecimientoId = 'El establecimiento es obligatorio.';
    if (!descripcion) errors.descripcion = 'La descripción/actividad es obligatoria.';

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      triggerToast('Completa los campos obligatorios.', 'error');
      return;
    }

    setSaving(true);
    try {
      let finalDocUrl = documentoUrl;

      // 1. Si hay un nuevo archivo cargado, subirlo
      if (uploadType === 'drive' && driveLink) {
        if (isDevMode) {
          finalDocUrl = 'mock-drive-uploaded-pdf-path';
        } else {
          // Call server-side API to download and upload Drive URL
          const uploadRes = await fetch('/api/upload-from-url', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              url: driveLink,
              tenantId: tenant.id
            })
          });
          const uploadData = await uploadRes.json();
          if (!uploadRes.ok || uploadData.error) {
            throw new Error(uploadData.error || 'Error al importar desde Google Drive.');
          }
          finalDocUrl = uploadData.filePath;
        }
      } else if (uploadType === 'legajo') {
        if (!selectedLegajoDocUrl) {
          throw new Error('Debes seleccionar un documento del legajo técnico.');
        }
        finalDocUrl = selectedLegajoDocUrl;
      } else if (documentoFile) {
        if (isDevMode) {
          finalDocUrl = 'mock-uploaded-pdf-path';
        } else {
          // Validar formato PDF
          if (documentoFile.type !== 'application/pdf') {
            throw new Error('Solo se permiten archivos en formato PDF.');
          }
          // Validar tamaño (10MB)
          if (documentoFile.size > 10 * 1024 * 1024) {
            throw new Error('El archivo PDF no debe superar los 10 MB.');
          }

          const fileExt = 'pdf';
          const fileId = editingId || crypto.randomUUID();
          const filePath = `${profile.id}/programa_${fileId}.${fileExt}`;

          const { error: uploadErr } = await supabase.storage
            .from('documents')
            .upload(filePath, documentoFile, {
              upsert: true,
              contentType: 'application/pdf'
            });

          if (uploadErr) throw uploadErr;
          finalDocUrl = filePath;
        }
      }

      // 2. Preparar objeto de datos
      const dataPayload = {
        tenant_id: isDevMode ? 'mock-tenant' : tenant.id,
        empresa_id: empresaId,
        establecimiento_id: establecimientoId || null,
        catalogo_id: catalogoId || null,
        descripcion,
        marco_legal: marcoLegal || null,
        responsable_id: responsableId && responsableId !== '__custom__' ? responsableId : null,
        responsable: responsableId === '__custom__' ? responsableCustom.trim() : (miembros.find(m => m.id === responsableId)?.full_name || null),
        progreso: parseInt(progreso),
        fecha_planificada: convertToDbDate(fechaPlanificada) || null,
        fecha_realizacion: convertToDbDate(fechaRealizacion) || null,
        documento_url: finalDocUrl || null,
        observaciones: observaciones || null,
        updated_at: new Date().toISOString()
      };

      if (editingId) {
        // ACTUALIZAR
        if (isDevMode) {
          setActividades(prev => prev.map(a => a.id === editingId ? { ...a, ...dataPayload } : a));
        } else {
          const { error } = await supabase
            .from('programa_anual')
            .update(dataPayload)
            .eq('id', editingId);
          if (error) throw error;
        }
        triggerToast('¡Actividad actualizada con éxito!', 'success');
      } else {
        // CREAR NUEVO
        if (isDevMode) {
          const newItem = {
            id: 'mock-new-' + Date.now(),
            created_at: new Date().toISOString(),
            ...dataPayload
          };
          setActividades(prev => [...prev, newItem]);
        } else {
          const { error } = await supabase
            .from('programa_anual')
            .insert([dataPayload]);
          if (error) throw error;
        }
        triggerToast('¡Actividad creada con éxito!', 'success');
      }

      // Recargar datos reales si no estamos en mock
      if (!isDevMode) {
        const { data: progs } = await supabase
          .from('programa_anual')
          .select('*')
          .eq('tenant_id', tenant.id);
        setActividades(progs || []);
      }

      handleCloseForm();
    } catch (err) {
      console.error('Error al guardar actividad:', err);
      triggerToast(err.message || 'Error al guardar la actividad.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // 7. Borrar Actividad
  const handleDelete = (id) => {
    setConfirmModal({
      show: true,
      title: 'Eliminar Actividad',
      message: '¿Estás seguro de que deseas eliminar esta actividad del programa anual? Esta acción no se puede deshacer.',
      confirmText: 'Eliminar',
      onConfirm: async () => {
        try {
          if (isDevMode) {
            setActividades(prev => prev.filter(a => a.id !== id));
            handleCloseForm();
          } else {
            const { error } = await supabase
              .from('programa_anual')
              .delete()
              .eq('id', id);
            if (error) throw error;
            setActividades(prev => prev.filter(a => a.id !== id));
            handleCloseForm();
          }
          triggerToast('Actividad eliminada correctamente.', 'success');
        } catch (err) {
          console.error('Error al eliminar actividad:', err);
          triggerToast('Error al eliminar la actividad.', 'error');
        } finally {
          setConfirmModal({ show: false, title: '', message: '', onConfirm: null, confirmText: 'Eliminar' });
        }
      }
    });
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingId(null);
    setEmpresaId('');
    setEstablecimientoId('');
    setCatalogoId('');
    setDescripcion('');
    setMarcoLegal('');
    setResponsableId('');
    setResponsableCustom('');
    setProgreso(0);
    setFechaPlanificada('');
    setFechaRealizacion('');
    setDocumentoUrl('');
    setDocumentoFile(null);
    setUploadType('local');
    setDriveLink('');
    setObservaciones('');
    setFormErrors({});
    setLegajoDocuments([]);
    setSelectedLegajoDocUrl('');
    setLoadingLegajoDocs(false);
  };

  const handleExitForm = () => {
    if (isReadOnlyView) {
      handleCloseForm();
      return;
    }
    setConfirmModal({
      show: true,
      title: 'Salir sin guardar',
      message: '¿Estás seguro de que deseas salir? Los cambios no guardados se perderán.',
      confirmText: 'Confirmar',
      onConfirm: () => {
        handleCloseForm();
        setConfirmModal({ show: false, title: '', message: '', onConfirm: null, confirmText: 'Eliminar' });
      }
    });
  };

  const handleSidebarNavigation = (e, path) => {
    if (showForm) {
      if (isReadOnlyView) {
        if (path.endsWith('/programa')) {
          handleCloseForm();
        } else {
          window.location.href = path;
        }
        return;
      }
      e.preventDefault();
      setConfirmModal({
        show: true,
        title: 'Salir sin guardar',
        message: '¿Estás seguro de que deseas salir? Los cambios no guardados se perderán.',
        confirmText: 'Confirmar',
        onConfirm: () => {
          setConfirmModal({ show: false, title: '', message: '', onConfirm: null, confirmText: 'Eliminar' });
          if (path.endsWith('/programa')) {
            handleCloseForm();
          } else {
            window.location.href = path;
          }
        }
      });
    }
  };

  // 8. Visualizar documento (PDF Storage o link externo)
  const handleViewPdf = async (path) => {
    if (!path || path === 'N/A') return;
    if (isDevMode || path === 'mock-pdf-url' || path === 'mock-uploaded-pdf-path' || path === 'mock-drive-uploaded-pdf-path') {
      alert('Simulación: Abriendo documento en nueva pestaña.');
      return;
    }

    // ── LINKS EXTERNOS (http/https) ──────────────────────────────────────────
    if (path.startsWith('http://') || path.startsWith('https://')) {

      // Intentar extraer el ID de cualquier formato de Google Drive/Docs/Sheets
      let googleFileId = null;

      // Formato 1: /file/d/FILE_ID/...  (estándar de Drive para archivos)
      const m1 = path.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
      if (m1) googleFileId = m1[1];

      // Formato 2: ?id=FILE_ID  o  &id=FILE_ID  (enlace directo / uc?id=)
      if (!googleFileId) {
        const m2 = path.match(/[?&]id=([a-zA-Z0-9_-]+)/);
        if (m2) googleFileId = m2[1];
      }

      // Formato 3: /open?id=FILE_ID
      if (!googleFileId) {
        const m3 = path.match(/\/open\?id=([a-zA-Z0-9_-]+)/);
        if (m3) googleFileId = m3[1];
      }

      // Formato 4: spreadsheets/d/FILE_ID  o  document/d/FILE_ID  (Google Docs/Sheets)
      if (!googleFileId) {
        const m4 = path.match(/\/(spreadsheets|document|presentation)\/d\/([a-zA-Z0-9_-]+)/);
        if (m4) googleFileId = m4[2];
      }

      if (googleFileId) {
        // Abrir como vista previa embebida de Drive (evita la pantalla de descarga)
        const previewUrl = `https://drive.google.com/file/d/${googleFileId}/preview`;
        window.open(previewUrl, '_blank');
        return;
      }

      // No es un link de Google → abrir directamente
      window.open(path, '_blank');
      return;
    }

    // ── ARCHIVOS DE SUPABASE STORAGE (ruta relativa) ─────────────────────────
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .createSignedUrl(path, 3600);

      if (error) throw error;
      if (!data?.signedUrl) {
        triggerToast('No se pudo obtener el enlace del documento.', 'error');
        return;
      }

      window.open(data.signedUrl, '_blank');
    } catch (err) {
      console.error('Error al abrir el documento:', err);
    }
  };

  const handleDownloadPdf = async (url, filename) => {
    if (!url || url === 'N/A') return;
    if (url.startsWith('http://') || url.startsWith('https://')) {
      window.open(url, '_blank');
    } else {
      if (isDevMode) {
        triggerToast('Descarga no disponible en modo desarrollo local.', 'info');
      } else {
        try {
          const { data, error } = await supabase.storage
            .from('documents')
            .download(url);
          if (error) throw error;
          
          const blobUrl = URL.createObjectURL(data);
          const link = document.createElement('a');
          link.href = blobUrl;
          link.download = filename || 'documento.pdf';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(blobUrl);
        } catch (e) {
          console.error(e);
          triggerToast('Error al descargar el archivo.', 'error');
        }
      }
    }
  };


  // 9. Lógica del Calendario
  const currYear = calendarDate.getFullYear();
  const currMonth = calendarDate.getMonth();

  const handlePrevMonth = () => {
    setCalendarDate(new Date(currYear, currMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setCalendarDate(new Date(currYear, currMonth + 1, 1));
  };

  const generateCalendarDays = () => {
    const firstDayIndex = new Date(currYear, currMonth, 1).getDay(); // Domingo=0, Lunes=1...
    const numDays = new Date(currYear, currMonth + 1, 0).getDate();

    const days = [];
    // Espacios en blanco
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(null);
    }
    // Días reales
    for (let d = 1; d <= numDays; d++) {
      days.push(d);
    }
    return days;
  };

  const calendarDays = generateCalendarDays();

  // Filtrar establecimientos por empresa seleccionada en el formulario
  const filteredEstablecimientos = allEstablecimientos.filter(e => e.empresa_id === empresaId);

  return (
    <div className="h-screen overflow-hidden bg-syso-bg text-slate-700 flex font-sans">

      {/* Sidebar (Desktop & Mobile) */}
      <Sidebar
        tenantSlug={tenantSlug}
        profile={profile}
        currentSection="programa"
        isSidebarCollapsed={isSidebarCollapsed}
        toggleSidebar={toggleSidebar}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
        handleLogout={handleLogout}
        onNavigate={handleSidebarNavigation}
      />

      {/* Main Container */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <header className="h-16 border-b border-slate-200 flex items-center justify-between px-4 md:px-6 bg-white shrink-0 sticky top-0 z-20">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 -ml-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 md:hidden cursor-pointer shrink-0"
            >
              <Menu className="h-5 w-5" />
            </button>
            <Calendar className="h-5 w-5 text-[#468DFF] shrink-0" />
            <h1 className="font-outfit text-base md:text-lg font-bold text-slate-900 truncate leading-none">
              Programa de Gestión Anual
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
            <div className="text-center space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-[#468DFF] mx-auto" />
              <p className="text-xs text-slate-500 font-semibold">Cargando programa de gestión...</p>
            </div>
          </div>
        ) : (
          <div className="p-6 md:p-8 space-y-6 max-w-[95%] mx-auto w-full">
            {showForm ? (
              // FORMULARIO DE ALTA Y EDICIÓN INLINE
              <div className="bg-white rounded-2xl border border-slate-150 shadow-sm overflow-hidden flex flex-col max-h-[85vh] animate-fade-in">
                <div className="h-16 px-4 md:px-6 bg-slate-50 border-b border-slate-150 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleExitForm}
                      className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 cursor-pointer"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </button>
                    <span className="font-outfit text-base font-bold text-slate-900">
                      {editingId ? 'Editar Actividad Anual' : 'Nueva Actividad del Programa'}
                    </span>
                  </div>
                  <button type="button" onClick={handleExitForm} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-200 cursor-pointer">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <form onSubmit={handleSave} className="p-6 space-y-6 overflow-y-auto flex-1 scrollbar-thin">
                  <fieldset disabled={!canEdit} className="space-y-6">

                    {/* 1 y 2. Razón Social y Establecimiento */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Cliente / Razón Social */}
                      <div>
                        <label className="text-xs font-bold text-slate-600 block mb-1.5">
                          Cliente / Razón Social <span className="text-[#468DFF]">*</span>
                        </label>
                        <select
                          required
                          value={empresaId}
                          onChange={(e) => handleEmpresaChange(e.target.value)}
                          className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all cursor-pointer"
                        >
                          <option value="">Selecciona un cliente</option>
                          {empresas.map(e => (
                            <option key={e.id} value={e.id}>{e.razon_social}</option>
                          ))}
                        </select>
                        {formErrors.empresaId && <p className="text-[10px] text-red-500 font-bold mt-1">{formErrors.empresaId}</p>}
                      </div>

                      {/* Establecimiento */}
                      <div>
                        <label className="text-xs font-bold text-slate-600 block mb-1.5">
                          Establecimiento <span className="text-[#468DFF]">*</span>
                        </label>
                        <select
                          value={establecimientoId}
                          onChange={(e) => setEstablecimientoId(e.target.value)}
                          disabled={!empresaId}
                          className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <option value="">Selecciona un establecimiento</option>
                          {filteredEstablecimientos.map(e => (
                            <option key={e.id} value={e.id}>{e.denominacion}</option>
                          ))}
                        </select>
                        {!empresaId && <p className="text-[9px] text-slate-400 mt-1 italic">Debes seleccionar una Razón Social primero.</p>}
                        {formErrors.establecimientoId && <p className="text-[10px] text-red-500 font-bold mt-1">{formErrors.establecimientoId}</p>}
                      </div>
                    </div>

                    {/* 3. Descripción (Catálogo o texto manual) */}
                    <div>
                      <label className="text-xs font-bold text-slate-600 block mb-1.5">
                        Descripción / Actividad <span className="text-[#468DFF]">*</span>
                      </label>
                      <select
                        value={catalogoId}
                        onChange={(e) => handleDescripcionChange(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all cursor-pointer mb-2"
                      >
                        <option value="">-- Selecciona del catálogo --</option>
                        {catalogo.map(c => (
                          <option key={c.id} value={c.id}>{c.descripcion}</option>
                        ))}
                        <option value="__custom__">Otra actividad (cargar manualmente)...</option>
                      </select>

                      {/* Textarea: siempre visible; pre-cargada desde catálogo o editable manualmente */}
                      <textarea
                        required
                        placeholder="Detalla la actividad a realizar..."
                        value={descripcion}
                        onChange={(e) => setDescripcion(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all h-20 resize-none"
                      />
                      {formErrors.descripcion && <p className="text-[10px] text-red-500 font-bold mt-1">{formErrors.descripcion}</p>}
                    </div>

                    {/* 4 y 5. Marco Legal y Responsable */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Marco Legal */}
                      <div>
                        <label className="text-xs font-bold text-slate-600 block mb-1.5">
                          Marco Legal / Requisito Legal Aplicable
                        </label>
                        <input
                          type="text"
                          placeholder={catalogoId && catalogoId !== '__custom__' ? 'Completado automáticamente desde catálogo...' : 'Ingresá el requisito legal aplicable...'}
                          value={marcoLegal}
                          onChange={(e) => setMarcoLegal(e.target.value)}
                          className={
                            catalogoId && catalogoId !== '__custom__'
                              ? "w-full border border-slate-150 rounded-xl px-3.5 py-2 text-sm bg-slate-100 text-slate-500 outline-none"
                              : "w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all"
                          }
                          readOnly={!!(catalogoId && catalogoId !== '__custom__')}
                        />
                        {(!catalogoId || catalogoId === '__custom__') && (
                          <p className="text-[9px] text-slate-400 mt-1 italic">Podés ingresar la norma aplicable (ej: Dec. 351/79, Res. 905/15...)</p>
                        )}
                      </div>

                      {/* Responsable */}
                      <div>
                        <label className="text-xs font-bold text-slate-600 block mb-1.5">
                          Responsable Asignado
                        </label>
                        <select
                          value={responsableId}
                          onChange={(e) => setResponsableId(e.target.value)}
                          className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all cursor-pointer"
                        >
                          <option value="">Selecciona un responsable</option>
                          {miembros.map(m => (
                            <option key={m.id} value={m.id}>{m.full_name}</option>
                          ))}
                          <option value="__custom__">Otro (cargar manualmente)...</option>
                        </select>

                        {responsableId === '__custom__' && (
                          <input
                            type="text"
                            required
                            placeholder="Escribe el nombre del responsable..."
                            value={responsableCustom}
                            onChange={(e) => setResponsableCustom(e.target.value)}
                            className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 mt-2 transition-all"
                          />
                        )}
                      </div>
                    </div>

                    {/* 6 y 7. Fechas y Progreso */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* F. Planificada */}
                      <div>
                        <label className="text-xs font-bold text-slate-600 block mb-1.5">
                          F. Planificada
                        </label>
                        <input
                          type="text"
                          placeholder="DD/MM/YYYY"
                          maxLength={10}
                          value={fechaPlanificada}
                          onChange={(e) => setFechaPlanificada(formatAsDateInput(e.target.value))}
                          className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all font-mono"
                        />
                        <p className="text-[9px] text-slate-400 mt-1 italic">Opcional. Si no se carga, el estado será "En análisis".</p>
                      </div>

                      {/* F. Realización */}
                      <div>
                        <label className="text-xs font-bold text-slate-600 block mb-1.5">
                          F. Realización
                        </label>
                        <input
                          type="text"
                          placeholder="DD/MM/YYYY"
                          maxLength={10}
                          value={fechaRealizacion}
                          onChange={(e) => handleRealizacionChange(formatAsDateInput(e.target.value))}
                          className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all font-mono"
                        />
                        <p className="text-[9px] text-slate-400 mt-1 italic">Si se carga, el progreso se fija al 100% y el estado a Vigente.</p>
                      </div>

                      {/* Progreso del Avance */}
                      <div>
                        <div className="flex justify-between items-center mb-1.5">
                          <label className="text-xs font-bold text-slate-600">
                            Progreso del Avance
                          </label>
                          <span className="text-xs font-bold text-[#468DFF]">{progreso}%</span>
                        </div>
                        <div className="flex items-center gap-3 py-1">
                          <input
                            type="range"
                            min="0"
                            max="100"
                            step="5"
                            value={progreso}
                            onChange={(e) => setProgreso(parseInt(e.target.value))}
                            className="flex-1 accent-[#468DFF] h-2 bg-slate-200 rounded-lg cursor-pointer"
                          />
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={progreso}
                            onChange={(e) => {
                              let val = parseInt(e.target.value) || 0;
                              if (val > 100) val = 100;
                              if (val < 0) val = 0;
                              setProgreso(val);
                            }}
                            className="w-16 text-center text-sm bg-slate-50/50 border border-slate-200 rounded-xl py-1.5 focus:outline-none focus:border-[#468DFF]"
                          />
                        </div>
                      </div>
                    </div>

                    {/* 8. Carga de Documento */}
                    <div>
                      <label className="text-xs font-bold text-slate-600 block mb-1.5">
                        Documento de Respaldo / Evidencia (PDF)
                      </label>

                      {documentoUrl ? (
                        <div className="flex items-center justify-between border border-[#468DFF]/20 rounded-xl bg-blue-50/50 p-3 mb-2.5">
                          <div className="flex items-center gap-2 truncate pr-2">
                            <FileText className="h-5 w-5 text-[#468DFF] shrink-0" />
                            <span className="text-xs text-slate-600 truncate font-semibold">
                              PDF subido anteriormente
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleViewPdf(documentoUrl)}
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-[#468DFF] text-slate-500 hover:text-white transition-all cursor-pointer inline-flex items-center shadow-sm"
                              title="Ver PDF en otra pestaña"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDocumentoUrl('')}
                              className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-50 text-red-400 hover:text-white transition-all cursor-pointer inline-flex items-center shadow-sm"
                              title="Eliminar documento cargado"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ) : null}

                      <div className="flex items-center gap-2 mb-2.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() => handleSwitchUploadType('local')}
                          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer border ${uploadType === 'local'
                            ? 'bg-[#468DFF]/10 text-[#468DFF] border-[#468DFF]/30'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                            }`}
                        >
                          Archivo Local
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSwitchUploadType('drive')}
                          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer border ${uploadType === 'drive'
                            ? 'bg-[#468DFF]/10 text-[#468DFF] border-[#468DFF]/30'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                            }`}
                        >
                          Enlace Drive
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSwitchUploadType('legajo')}
                          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer border ${uploadType === 'legajo'
                            ? 'bg-[#468DFF]/10 text-[#468DFF] border-[#468DFF]/30'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                            }`}
                        >
                          Legajo Técnico
                        </button>
                      </div>

                      {uploadType === 'local' ? (
                        <>
                          <div
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            className={`border-2 border-dashed rounded-xl p-6 text-center transition-all ${
                              isDragging 
                                ? 'border-[#468DFF] bg-[#468DFF]/5' 
                                : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50'
                            }`}
                          >
                            <input
                              type="file"
                              ref={fileInputRef}
                              onChange={(e) => {
                                const file = e.target.files[0];
                                if (file) {
                                  handleFileChangeWithConfirm(file);
                                }
                              }}
                              accept=".pdf"
                              className="hidden"
                            />
                            <div className="flex flex-col items-center justify-center gap-2">
                              <Upload className="h-8 w-8 text-slate-400 shrink-0" />
                              <span className="text-sm text-slate-600">
                                Arrastrá tu archivo aquí o
                              </span>
                              <button
                                type="button"
                                onClick={() => fileInputRef.current.click()}
                                className="bg-[#468DFF]/10 text-[#468DFF] hover:bg-[#468DFF]/20 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer"
                              >
                                seleccionar archivo
                              </button>
                              {selectedFileName && (
                                <span className="text-xs text-slate-500 font-semibold mt-2 truncate max-w-[200px] block">
                                  Seleccionado: {selectedFileName}
                                </span>
                              )}
                            </div>
                          </div>
                          <p className="text-[9px] text-slate-400 mt-1 italic">Solo formato PDF. Tamaño máximo de 10 MB.</p>
                        </>
                      ) : uploadType === 'drive' ? (
                        <>
                          <input
                            type="url"
                            placeholder="Pega el enlace compartido de Google Drive..."
                            value={driveLink}
                            onChange={(e) => setDriveLink(e.target.value)}
                            className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all"
                          />
                          <p className="text-[9px] text-slate-400 mt-1 italic">
                            El archivo debe ser público en Drive ("Cualquier persona con el enlace"). Se convertirá y guardará automáticamente.
                          </p>
                        </>
                      ) : (
                        <div className="space-y-2">
                          {!empresaId ? (
                            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-xl p-3 font-semibold">
                              ⚠️ Debes seleccionar un Cliente / Razón Social para listar los documentos del legajo técnico.
                            </p>
                          ) : loadingLegajoDocs ? (
                            <div className="flex items-center gap-2 text-xs text-slate-500 py-2">
                              <Loader2 className="h-4 w-4 animate-spin text-[#468DFF] shrink-0" />
                              Cargando documentos del legajo técnico...
                            </div>
                          ) : legajoDocuments.length === 0 ? (
                            <p className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-xl p-3 italic">
                              No se encontraron documentos en el legajo técnico para este cliente.
                            </p>
                          ) : (
                            <div>
                              <select
                                value={selectedLegajoDocUrl}
                                onChange={(e) => setSelectedLegajoDocUrl(e.target.value)}
                                className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all cursor-pointer"
                              >
                                <option value="">-- Selecciona un documento del legajo --</option>
                                {legajoDocuments.map(doc => (
                                  <option key={doc.id} value={doc.documento_url}>
                                    {doc.documento_nombre} ({formatDate(doc.fecha)})
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* 9. Observaciones */}
                    <div>
                      <label className="text-xs font-bold text-slate-600 block mb-1.5">
                        Observaciones Generales
                      </label>
                      <textarea
                        placeholder="Escribe comentarios, novedades o detalles..."
                        value={observaciones}
                        onChange={(e) => setObservaciones(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all h-24 resize-none"
                      />
                    </div>

                  </fieldset>

                  {/* Botones de acción del formulario */}
                  <div className="flex justify-between items-center pt-6 border-t border-slate-100 shrink-0">
                    <button
                      type="button"
                      onClick={handleExitForm}
                      className="px-5 py-2.5 border border-slate-350 text-slate-700 rounded-xl text-sm font-bold hover:bg-[#468DFF] hover:text-white hover:border-[#468DFF] transition-all active:scale-[0.98] cursor-pointer"
                    >
                      Salir
                    </button>
                    <div className="flex items-center gap-3">
                      {isReadOnlyView ? (
                        canEditar && (
                          <button
                            type="button"
                            onClick={() => setIsReadOnlyView(false)}
                            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-bold transition-all active:scale-[0.98] cursor-pointer shadow-lg shadow-amber-500/10"
                          >
                            Editar
                          </button>
                        )
                      ) : (
                        <>
                          {editingId && canEliminar && (
                            <button
                              type="button"
                              onClick={() => handleDelete(editingId)}
                              className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold transition-all active:scale-[0.98] cursor-pointer shadow-lg shadow-red-600/10"
                            >
                              Eliminar
                            </button>
                          )}
                          {canEdit && (
                            <button
                              type="submit"
                              disabled={saving}
                              className="px-5 py-2.5 bg-[#468DFF] hover:bg-[#0511F2] text-white rounded-xl text-sm font-bold flex items-center gap-2 transition-all active:scale-[0.98] cursor-pointer shadow-lg shadow-[#468DFF]/10 disabled:opacity-50"
                            >
                              {saving ? (
                                <>
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  Guardando...
                                </>
                              ) : (
                                'Guardar'
                              )}
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </form>
              </div>
            ) : (
              <>
                {/* Toolbar y Filtros Unificados */}
                <div className="bg-white rounded-2xl border border-slate-150 p-4 shadow-sm space-y-4">

                  {/* Fila Superior: Controles de Vista, Buscador y Botón Nuevo */}
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">

                    {/* Selector de Vista */}
                    <div className="flex items-center gap-2 rounded-xl bg-slate-100 p-1 border border-slate-200/80 self-start">
                      <button
                        onClick={() => setView('list')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${view === 'list' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                      >
                        <List className="h-4 w-4" />
                        Programa anual
                      </button>
                      <button
                        onClick={() => setView('calendar')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${view === 'calendar' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                      >
                        <CalendarDays className="h-4 w-4" />
                        Calendario
                      </button>
                    </div>

                    {/* Buscador y Nueva Actividad */}
                    <div className="flex flex-col md:flex-row md:items-center gap-3 w-full md:w-auto">
                      <div className="relative w-full md:w-72">
                        <span className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none">
                          <Search className="h-3.5 w-3.5" />
                        </span>
                        <input
                          type="text"
                          placeholder="Buscar actividad, cliente, obs..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-9 pr-4 py-1.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all text-slate-700 placeholder-slate-400"
                        />
                      </div>

                      {canCargar && (
                        <button
                          onClick={() => handleAddNew()}
                          className="px-3.5 py-1.5 bg-[#468DFF] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-[#0511F2] transition-all cursor-pointer shadow-md shadow-[#468DFF]/10 shrink-0 w-full md:w-auto"
                        >
                          <PlusCircle className="h-3.5 w-3.5" />
                          Nueva Actividad
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Fila Inferior: Filtros rápidos */}
                  <div className="border-t border-slate-100 pt-2 space-y-2">
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setShowFilters(!showFilters)}
                        className="font-bold text-slate-400 flex items-center gap-1.5 uppercase tracking-wider text-[10px] hover:text-slate-600 transition-colors cursor-pointer"
                      >
                        <Sliders className="h-3 w-3" />
                        Filtros de Búsqueda
                        {showFilters ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      </button>
                      {(filterEmpresa || filterEstablecimiento || filterMonth || filterYear || filterEstado || searchQuery) && (
                        <button
                          onClick={() => {
                            setFilterEmpresa('');
                            setFilterEstablecimiento('');
                            setFilterMonth('');
                            setFilterYear('');
                            setFilterEstado('');
                            setSearchQuery('');
                          }}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[10px] font-semibold cursor-pointer transition-all border border-slate-200"
                        >
                          Limpiar filtros
                        </button>
                      )}
                    </div>

                    {showFilters && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 pt-1 animate-fade-in">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Cliente</label>
                          <select
                            value={filterEmpresa}
                            onChange={(e) => { setFilterEmpresa(e.target.value); setFilterEstablecimiento(''); }}
                            className="border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-600 focus:outline-none focus:border-[#468DFF] text-xs w-full cursor-pointer"
                          >
                            <option value="">Todos los clientes</option>
                            {empresas.map(e => (
                              <option key={e.id} value={e.id}>{e.razon_social}</option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Establecimiento</label>
                          <select
                            value={filterEstablecimiento}
                            onChange={(e) => setFilterEstablecimiento(e.target.value)}
                            disabled={!filterEmpresa}
                            className="border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-600 focus:outline-none focus:border-[#468DFF] text-xs w-full cursor-pointer disabled:bg-slate-50 disabled:text-slate-400"
                          >
                            <option value="">Todos los establecimientos</option>
                            {allEstablecimientos.filter(est => est.empresa_id === filterEmpresa).map(e => (
                              <option key={e.id} value={e.id}>{e.denominacion}</option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Mes</label>
                          <select
                            value={filterMonth}
                            onChange={(e) => setFilterMonth(e.target.value)}
                            className="border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-600 focus:outline-none focus:border-[#468DFF] text-xs w-full cursor-pointer"
                          >
                            <option value="">Todos los meses</option>
                            <option value="01">Enero</option>
                            <option value="02">Febrero</option>
                            <option value="03">Marzo</option>
                            <option value="04">Abril</option>
                            <option value="05">Mayo</option>
                            <option value="06">Junio</option>
                            <option value="07">Julio</option>
                            <option value="08">Agosto</option>
                            <option value="09">Septiembre</option>
                            <option value="10">Octubre</option>
                            <option value="11">Noviembre</option>
                            <option value="12">Diciembre</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Año</label>
                          <select
                            value={filterYear}
                            onChange={(e) => setFilterYear(e.target.value)}
                            className="border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-600 focus:outline-none focus:border-[#468DFF] text-xs w-full cursor-pointer"
                          >
                            <option value="">Todos los años</option>
                            <option value="2024">2024</option>
                            <option value="2025">2025</option>
                            <option value="2026">2026</option>
                            <option value="2027">2027</option>
                            <option value="2028">2028</option>
                            <option value="2029">2029</option>
                            <option value="2030">2030</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Estado</label>
                          <select
                            value={filterEstado}
                            onChange={(e) => setFilterEstado(e.target.value)}
                            className="border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-600 focus:outline-none focus:border-[#468DFF] text-xs w-full cursor-pointer"
                          >
                            <option value="">Todos los estados</option>
                            <option value="Vigente">Vigente (verde)</option>
                            <option value="Vencido">Vencido (rojo)</option>
                            <option value="En análisis">En análisis</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* VISTA CALENDARIO */}
                {view === 'calendar' && (
                  <div className="bg-white border border-slate-150 rounded-2xl p-6 shadow-sm space-y-4 overflow-auto" style={{ maxHeight: showFilters ? 'calc(100vh - 360px)' : 'calc(100vh - 290px)' }}>

                    {/* Cabecera del Mes del Calendario */}
                    <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                      <h3 className="font-outfit text-base font-extrabold text-slate-900 flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-[#468DFF]" />
                        {MONTH_NAMES[currMonth]} {currYear}
                      </h3>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={handlePrevMonth}
                          className="p-2 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 transition-colors text-slate-600 cursor-pointer"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setCalendarDate(new Date())}
                          className="px-3 py-2 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 text-xs font-bold transition-colors cursor-pointer text-slate-600"
                        >
                          Hoy
                        </button>
                        <button
                          onClick={handleNextMonth}
                          className="p-2 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 transition-colors text-slate-600 cursor-pointer"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Grilla de días */}
                    <div className="grid grid-cols-7 gap-1.5">

                      {/* Cabecera días semana */}
                      {WEEK_DAYS.map((day, idx) => (
                        <div key={idx} className="text-center font-bold text-[10px] text-slate-400 uppercase tracking-widest py-2 bg-slate-50/50 rounded-lg">
                          {day}
                        </div>
                      ))}

                      {/* Celdas del calendario */}
                      {calendarDays.map((day, idx) => {
                        if (day === null) {
                          return <div key={`empty-${idx}`} className="bg-slate-50/30 rounded-2xl border border-slate-100/50 min-h-[70px] md:min-h-[85px]" />;
                        }

                        const dateStr = `${currYear}-${String(currMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                        const dayActs = filteredActividades.filter(act => act.fecha_planificada === dateStr);
                        const isToday = new Date().toISOString().split('T')[0] === dateStr;

                        return (
                          <div
                            key={`day-${day}`}
                            className={`bg-white rounded-2xl border p-2 flex flex-col justify-between group min-h-[70px] md:min-h-[85px] transition-all hover:shadow-md cursor-pointer ${isToday ? 'border-[#468DFF] ring-1 ring-[#468DFF]/30' : 'border-slate-150'}`}
                            onClick={() => canCargar && handleAddNew(dateStr)}
                          >
                            {/* Indicador del número de día */}
                            <div className="flex items-center justify-between mb-1.5">
                              <span className={`text-xs font-extrabold px-1.5 py-0.5 rounded-md ${isToday ? 'bg-[#468DFF] text-white' : 'text-slate-800'}`}>
                                {day}
                              </span>

                              {/* Botón rápido de agregar */}
                              {canCargar && (
                                <span className="opacity-0 group-hover:opacity-100 text-[10px] text-[#468DFF] hover:text-[#0511F2] font-bold transition-all transition-opacity">
                                  + Añadir
                                </span>
                              )}
                            </div>

                            {/* Listado de actividades del día */}
                            <div className="space-y-1.5 flex-1 overflow-y-auto max-h-[80px]" onClick={(e) => e.stopPropagation()}>
                              {dayActs.map(act => {
                                const statusInfo = getItemStatusAndColor(act);
                                const emp = empresas.find(e => e.id === act.empresa_id);

                                // Color del bloque según el estado
                                let blockBgClass = 'bg-[#0b8043]/10 border-[#0b8043]/30 text-[#0b8043]'; // Vigente
                                if (statusInfo.estadoText === 'Vencido') {
                                  blockBgClass = 'bg-[#fa050b]/10 border-[#fa050b]/30 text-[#fa050b]'; // Vencido
                                } else if (statusInfo.dateAlertColor === 'yellow') {
                                  blockBgClass = 'bg-amber-500/10 border-amber-500/30 text-amber-600'; // Próximo
                                }

                                return (
                                  <div
                                    key={act.id}
                                    onClick={(e) => { e.stopPropagation(); handleEdit(act); }}
                                    className={`text-[10px] font-bold p-1 rounded-lg border truncate text-left transition-all hover:scale-[1.02] active:scale-[0.98] ${blockBgClass}`}
                                    title={`${emp?.razon_social || 'Cliente'}: ${act.descripcion}`}
                                  >
                                    <span className="block truncate font-semibold opacity-70">
                                      {emp?.razon_social || 'Cliente'}
                                    </span>
                                    <span className="block truncate font-extrabold leading-tight">
                                      {act.descripcion}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* VISTA DE TABLA / LISTADO */}
                {view === 'list' && (
                  <div className="bg-white border border-slate-150 rounded-2xl shadow-sm overflow-hidden">
                    <div className="overflow-auto" style={{ maxHeight: showFilters ? 'calc(100vh - 360px)' : 'calc(100vh - 290px)' }}>
                      <table className="w-full border-collapse text-left">
                        <thead className="sticky top-0 z-10 bg-slate-50">
                          <tr className="bg-slate-50 border-b border-slate-150 text-xs font-bold text-slate-400 uppercase tracking-wider">
                            <th className="sticky top-0 z-10 bg-slate-50 border-b border-slate-150 px-6 py-4 cursor-pointer hover:text-slate-700 select-none transition-colors" onClick={() => handleSort('cliente')}>
                              <div className="flex items-center gap-1">
                                Cliente / Establecimiento
                                {sortField === 'cliente' && (sortOrder === 'asc' ? ' ▲' : ' ▼')}
                              </div>
                            </th>
                            <th className="sticky top-0 z-10 bg-slate-50 border-b border-slate-150 px-6 py-4 cursor-pointer hover:text-slate-700 select-none transition-colors" onClick={() => handleSort('actividad')}>
                              <div className="flex items-center gap-1">
                                Actividad / Legal
                                {sortField === 'actividad' && (sortOrder === 'asc' ? ' ▲' : ' ▼')}
                              </div>
                            </th>
                            <th className="sticky top-0 z-10 bg-slate-50 border-b border-slate-150 px-6 py-4 cursor-pointer hover:text-slate-700 select-none transition-colors" onClick={() => handleSort('responsable')}>
                              <div className="flex items-center gap-1">
                                Responsable
                                {sortField === 'responsable' && (sortOrder === 'asc' ? ' ▲' : ' ▼')}
                              </div>
                            </th>
                            <th className="sticky top-0 z-10 bg-slate-50 border-b border-slate-150 px-6 py-4 cursor-pointer hover:text-slate-700 select-none transition-colors" onClick={() => handleSort('fecha_planificada')}>
                              <div className="flex items-center gap-1">
                                F. Planificada
                                {sortField === 'fecha_planificada' && (sortOrder === 'asc' ? ' ▲' : ' ▼')}
                              </div>
                            </th>
                            <th className="sticky top-0 z-10 bg-slate-50 border-b border-slate-150 px-6 py-4 cursor-pointer hover:text-slate-700 select-none transition-colors" onClick={() => handleSort('fecha_realizacion')}>
                              <div className="flex items-center gap-1">
                                F. Realización
                                {sortField === 'fecha_realizacion' && (sortOrder === 'asc' ? ' ▲' : ' ▼')}
                              </div>
                            </th>
                            <th className="sticky top-0 z-10 bg-slate-50 border-b border-slate-150 px-6 py-4 cursor-pointer hover:text-slate-700 select-none transition-colors w-[15%]" onClick={() => handleSort('progreso')}>
                              <div className="flex items-center gap-1">
                                Progreso / Estado
                                {sortField === 'progreso' && (sortOrder === 'asc' ? ' ▲' : ' ▼')}
                              </div>
                            </th>
                            <th className="sticky top-0 z-10 bg-slate-50 border-b border-slate-150 px-6 py-4 text-center">Doc</th>
                            {(canEditar || canEliminar) && <th className="sticky top-0 z-10 bg-slate-50 border-b border-slate-150 px-6 py-4 text-right">Acciones</th>}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                          {sortedActividades.length === 0 ? (
                            <tr>
                              <td colSpan={(canEditar || canEliminar) ? 8 : 7} className="px-6 py-10 text-center text-slate-400 font-semibold">
                                No se encontraron actividades de gestión anual.
                              </td>
                            </tr>
                          ) : (
                            sortedActividades.map(act => {
                              const emp = empresas.find(e => e.id === act.empresa_id);
                              const est = allEstablecimientos.find(e => e.id === act.establecimiento_id);
                              const resp = miembros.find(m => m.id === act.responsable_id);

                              const statusInfo = getItemStatusAndColor(act);

                              // Alerta visual de fecha planificada
                              let dateColorClass = 'text-slate-500 font-mono font-medium';
                              if (statusInfo.dateAlertColor === 'red') {
                                dateColorClass = 'text-[#fa050b] bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-lg font-bold font-mono';
                              } else if (statusInfo.dateAlertColor === 'yellow') {
                                dateColorClass = 'text-amber-600 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-lg font-bold font-mono';
                              }

                              return (
                                <tr
                                  key={act.id}
                                  onClick={() => { setIsReadOnlyView(true); handleEdit(act); }}
                                  className="hover:bg-slate-50/50 cursor-pointer transition-colors"
                                >
                                  <td className="px-6 py-4">
                                    <span className="font-semibold text-slate-900 block truncate max-w-[160px]">
                                      {emp?.razon_social || 'Cliente desconocido'}
                                    </span>
                                    <span className="text-[10px] text-slate-500 font-medium block truncate max-w-[160px]">
                                      {est?.denominacion || 'Sin establecimiento'}
                                    </span>
                                  </td>

                                  <td className="px-6 py-4">
                                    <span className="font-semibold text-slate-900 block truncate max-w-[200px]" title={act.descripcion}>
                                      {act.descripcion}
                                    </span>
                                    <span className="text-[10px] text-slate-500 font-medium block truncate max-w-[200px]">
                                      {act.marco_legal || 'Sin marco legal registrado'}
                                    </span>
                                  </td>

                                  <td className="px-6 py-4 font-semibold text-slate-900">
                                    {act.responsable || 'Sin asignar'}
                                  </td>

                                  <td className="px-6 py-4">
                                    {act.fecha_planificada ? (
                                      <span className={dateColorClass}>
                                        {formatDate(act.fecha_planificada)}
                                      </span>
                                    ) : (
                                      <span className="text-[10px] text-slate-400 font-medium italic">Pendiente</span>
                                    )}
                                  </td>

                                  <td className="px-6 py-4 text-slate-600">
                                    {act.fecha_realizacion ? (
                                      <span className="font-mono text-slate-500 font-medium">
                                        {formatDate(act.fecha_realizacion)}
                                      </span>
                                    ) : (
                                      <span className="text-[10px] text-slate-400 font-medium italic">Pendiente</span>
                                    )}
                                  </td>

                                  <td className="px-6 py-4 text-center">
                                    <div className="flex flex-col items-center gap-1">
                                      <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${statusInfo.estadoText === 'Vencido'
                                        ? 'bg-red-500/10 text-red-600 border-red-500/20'
                                        : statusInfo.estadoText === 'En análisis'
                                          ? 'bg-slate-100 text-slate-700 border-slate-200'
                                          : 'bg-[#00b050]/10 text-[#00b050] border-[#00b050]/20'
                                        }`}>
                                        {statusInfo.estadoText} ({act.progreso}%)
                                      </span>
                                      <div className="w-16 h-1.5 bg-slate-100 border border-slate-150 rounded-full overflow-hidden">
                                        <div className="bg-[#468DFF] h-full" style={{ width: `${act.progreso}%` }} />
                                      </div>
                                    </div>
                                  </td>

                                  <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                                    {act.documento_url ? (
                                      <div className="flex items-center justify-center gap-1.5">
                                        <button
                                          onClick={(e) => { e.stopPropagation(); handleViewPdf(act.documento_url); }}
                                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-all cursor-pointer inline-flex items-center justify-center shadow-sm"
                                          title="Visualizar PDF"
                                        >
                                          <Eye className="h-4.5 w-4.5" />
                                        </button>
                                        {!act.documento_url.startsWith('http') && (
                                          <button
                                            onClick={(e) => { e.stopPropagation(); handleDownloadPdf(act.documento_url, `${act.descripcion}.pdf`); }}
                                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-all cursor-pointer inline-flex items-center justify-center shadow-sm"
                                            title="Descargar PDF"
                                          >
                                            <Download className="h-4.5 w-4.5" />
                                          </button>
                                        )}
                                      </div>
                                    ) : (
                                      <span className="text-[10px] text-slate-400 font-semibold italic">Vacío</span>
                                    )}
                                  </td>


                                  {(canEditar || canEliminar) && (
                                    <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                                      <div className="flex items-center justify-end gap-2">
                                        {canEditar ? (
                                          <button
                                            onClick={(e) => { e.stopPropagation(); setIsReadOnlyView(false); handleEdit(act); }}
                                            className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-600 transition-all cursor-pointer inline-flex items-center justify-center shadow-sm"
                                            title="Editar actividad"
                                          >
                                            <Edit className="h-4.5 w-4.5" />
                                          </button>
                                        ) : (
                                          <button
                                            onClick={(e) => { e.stopPropagation(); setIsReadOnlyView(true); handleEdit(act); }}
                                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-all cursor-pointer inline-flex items-center justify-center shadow-sm"
                                            title="Ver Detalle"
                                          >
                                            <Eye className="h-4.5 w-4.5" />
                                          </button>
                                        )}
                                        {canEliminar && (
                                          <button
                                            onClick={(e) => { e.stopPropagation(); handleDelete(act.id); }}
                                            className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition-all cursor-pointer inline-flex items-center justify-center shadow-sm"
                                            title="Eliminar actividad"
                                          >
                                            <Trash2 className="h-4.5 w-4.5" />
                                          </button>
                                        )}
                                      </div>
                                    </td>
                                  )}
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* MODAL DE CONFIRMACIÓN */}
        {confirmModal.show && (
          <div className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl border border-slate-150 p-6 shadow-xl max-w-sm w-full animate-scale-up space-y-4 text-center">
              <div className="mx-auto p-3 rounded-full w-12 h-12 flex items-center justify-center bg-amber-50 text-amber-500">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h4 className="font-outfit text-base font-extrabold text-slate-800">{confirmModal.title}</h4>
                <p className="text-xs text-slate-500 leading-relaxed">{confirmModal.message}</p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmModal({ show: false, title: '', message: '', onConfirm: null })}
                  className="flex-1 py-2.5 border border-slate-350 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all active:scale-[0.98] cursor-pointer"
                >
                  Cancelar
                </button>
                {confirmModal.onConfirm && (
                  <button
                    type="button"
                    onClick={confirmModal.onConfirm}
                    className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all active:scale-[0.98] cursor-pointer"
                  >
                    {confirmModal.confirmText || 'Confirmar'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TOAST NOTIFICACIÓN */}
        {toast.show && (
          <div className="fixed bottom-5 right-5 z-50 animate-slideOver">
            <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-xl ${toast.type === 'error' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-200 text-green-700'}`}>
              {toast.type === 'error' ? <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" /> : <Check className="h-4 w-4 text-green-500 shrink-0" />}
              <span className="text-xs font-bold leading-tight">{toast.message}</span>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
