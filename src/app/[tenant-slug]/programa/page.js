// src/app/[tenant-slug]/programa/page.js
'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Calendar, 
  List, 
  Plus, 
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
  ClipboardList
} from 'lucide-react';

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const WEEK_DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export default function ProgramaGestion({ params }) {
  const tenantSlug = params['tenant-slug'];
  
  // Vistas y Cargas
  const [view, setView] = useState('calendar'); // 'calendar' o 'list'
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDevMode, setIsDevMode] = useState(false);

  // Sesión y Datos Contexto
  const [profile, setProfile] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
  const [filterResponsable, setFilterResponsable] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Formulario Slide-over
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [empresaId, setEmpresaId] = useState('');
  const [establecimientoId, setEstablecimientoId] = useState('');
  const [catalogoId, setCatalogoId] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [marcoLegal, setMarcoLegal] = useState('');
  const [responsableId, setResponsableId] = useState('');
  const [progreso, setProgreso] = useState(0);
  const [fechaPlanificada, setFechaPlanificada] = useState('');
  const [fechaRealizacion, setFechaRealizacion] = useState('');
  const [documentoFile, setDocumentoFile] = useState(null);
  const [documentoUrl, setDocumentoUrl] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [formErrors, setFormErrors] = useState({});

  // Modales y Toasts
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [confirmModal, setConfirmModal] = useState({ show: false, title: '', message: '', onConfirm: null });

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

      // Cargar Tenant
      const { data: ten, error: tErr } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', prof.tenant_id)
        .single();
      if (tErr) throw tErr;
      setTenant(ten);

      // Cargar Empresas Clientes
      const { data: emps, error: empErr } = await supabase
        .from('empresas')
        .select('id, razon_social')
        .eq('tenant_id', ten.id)
        .order('razon_social');
      if (empErr) throw empErr;
      setEmpresas(emps || []);

      // Cargar Todos los Establecimientos del Tenant
      const { data: ests, error: estErr } = await supabase
        .from('establecimientos')
        .select('id, empresa_id, denominacion')
        .eq('tenant_id', ten.id)
        .order('denominacion');
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
      const { data: progs, error: progErr } = await supabase
        .from('programa_anual')
        .select('*')
        .eq('tenant_id', ten.id);
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
    setProfile({ full_name: 'Profesional de SySO (Mock)', role: 'owner' });
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

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      window.location.href = '/login';
    } catch (err) {
      window.location.href = '/login';
    }
  };

  // 2. Lógica de cálculo dinámico de estados y alertas
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
    
    let dateAlertColor = ''; // Sin alerta
    if (!hasRealization) {
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
    const matchesResponsable = !filterResponsable || act.responsable_id === filterResponsable;
    
    const statusData = getItemStatusAndColor(act);
    const matchesEstado = !filterEstado || statusData.estadoText === filterEstado;

    return matchesSearch && matchesEmpresa && matchesEstablecimiento && matchesResponsable && matchesEstado;
  });

  // 4. Manejar cambios en el Formulario
  const handleEmpresaChange = (val) => {
    setEmpresaId(val);
    setEstablecimientoId(''); // Resetear establecimiento subordinado
  };

  const handleDescripcionChange = (val) => {
    setCatalogoId(val);
    const catalogItem = catalogo.find(c => c.id === val);
    if (catalogItem) {
      setDescripcion(catalogItem.descripcion);
      setMarcoLegal(catalogItem.marco_legal);
    } else {
      setDescripcion('');
      setMarcoLegal('');
    }
  };

  const handleRealizacionChange = (val) => {
    setFechaRealizacion(val);
    if (val) {
      setProgreso(100); // Forzar 100% de progreso
    }
  };

  // 5. Cargar para Editar
  const handleEdit = (item) => {
    setEditingId(item.id);
    setEmpresaId(item.empresa_id || '');
    setEstablecimientoId(item.establecimiento_id || '');
    setCatalogoId(item.catalogo_id || '');
    setDescripcion(item.descripcion || '');
    setMarcoLegal(item.marco_legal || '');
    setResponsableId(item.responsable_id || '');
    setProgreso(item.progreso || 0);
    setFechaPlanificada(item.fecha_planificada || '');
    setFechaRealizacion(item.fecha_realizacion || '');
    setDocumentoUrl(item.documento_url || '');
    setDocumentoFile(null);
    setObservaciones(item.observaciones || '');
    setFormErrors({});
    setShowForm(true);
  };

  // Abrir formulario nuevo
  const handleAddNew = (preselectedDate = '') => {
    setEditingId(null);
    setEmpresaId('');
    setEstablecimientoId('');
    setCatalogoId('');
    setDescripcion('');
    setMarcoLegal('');
    setResponsableId('');
    setProgreso(0);
    setFechaPlanificada(preselectedDate || new Date().toISOString().split('T')[0]);
    setFechaRealizacion('');
    setDocumentoUrl('');
    setDocumentoFile(null);
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
    if (!descripcion) errors.descripcion = 'La descripción/actividad es obligatoria.';
    if (!fechaPlanificada) errors.fechaPlanificada = 'La fecha planificada es obligatoria.';
    
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      triggerToast('Completa los campos obligatorios.', 'error');
      return;
    }

    setSaving(true);
    try {
      let finalDocUrl = documentoUrl;

      // 1. Si hay un nuevo archivo cargado, subirlo
      if (documentoFile) {
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
            .upload(filePath, documentoFile, { upsert: true });

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
        responsable_id: responsableId || null,
        progreso: parseInt(progreso),
        fecha_planificada: fechaPlanificada,
        fecha_realizacion: fechaRealizacion || null,
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

      setShowForm(false);
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
      onConfirm: async () => {
        try {
          if (isDevMode) {
            setActividades(prev => prev.filter(a => a.id !== id));
          } else {
            const { error } = await supabase
              .from('programa_anual')
              .delete()
              .eq('id', id);
            if (error) throw error;
            setActividades(prev => prev.filter(a => a.id !== id));
          }
          triggerToast('Actividad eliminada correctamente.', 'success');
        } catch (err) {
          console.error('Error al eliminar actividad:', err);
          triggerToast('Error al eliminar la actividad.', 'error');
        } finally {
          setConfirmModal({ show: false, title: '', message: '', onConfirm: null });
        }
      }
    });
  };

  // 8. Visualizar PDF Firmado
  const handleViewPdf = async (path) => {
    if (!path) return;
    if (isDevMode || path === 'mock-pdf-url' || path === 'mock-uploaded-pdf-path') {
      alert('Simulación: Abriendo documento PDF en nueva pestaña.');
      return;
    }

    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .createSignedUrl(path, 3600);
      
      if (error) throw error;
      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
      }
    } catch (err) {
      console.error('Error al obtener URL firmada:', err);
      triggerToast('No se pudo abrir el documento PDF.', 'error');
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
    <div className="min-h-screen bg-[#D9D9D9] text-slate-700 flex font-sans">
      
      {/* Mobile Sidebar (Drawer Overlay) */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div 
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300"
          />
          <aside className="relative flex-1 flex flex-col max-w-xs w-full bg-[#0D0D0D] p-6 justify-between animate-scaleUp">
            <div className="absolute top-4 right-4">
              <button 
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div>
              <div className="flex items-center gap-3 mb-8">
                <img src="/brand/logo-primary.png" alt="Logo" className="h-9 w-9 object-contain shrink-0" />
                <span className="font-outfit text-base font-extrabold text-white tracking-tight">Gestión SySO</span>
              </div>
              <nav className="space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 px-3 block mb-2">Panel principal</span>
                <a href={`/${tenantSlug}/dashboard`} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-[#468DFF] font-semibold text-sm transition-all">
                  <Building className="h-4 w-4" />
                  Dashboard
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
                <a href={`/${tenantSlug}/programa`} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[#468DFF] text-white font-semibold text-sm transition-all shadow-md shadow-[#468DFF]/10">
                  <Calendar className="h-4 w-4" />
                  Programa de Gestión Anual
                </a>
                <a href={`/${tenantSlug}/correctivas`} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-[#468DFF] font-semibold text-sm transition-all">
                  <ClipboardList className="h-4 w-4" />
                  Acciones Correctivas
                </a>
                <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 px-3 block pt-6 mb-2">Configuración</span>
                <a href={`/${tenantSlug}/profile`} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-[#468DFF] font-semibold text-sm transition-all">
                  <Settings className="h-4 w-4" />
                  Editar Perfil
                </a>
              </nav>
            </div>
            <div className="pt-4 border-t border-white/10">
              <div className="flex items-center justify-between rounded-xl bg-black/40 p-3 border border-white/5">
                <div className="truncate pr-2">
                  <span className="text-xs font-bold text-white block truncate">{profile?.full_name || 'Usuario'}</span>
                  <span className="text-[10px] text-white/40 block truncate uppercase tracking-wider">{profile?.role || 'Profesional'}</span>
                </div>
                <button onClick={handleLogout} className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-600 hover:text-white transition-all cursor-pointer shrink-0">
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="w-64 bg-[#0D0D0D] flex flex-col justify-between shrink-0 hidden md:flex">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8">
            <img src="/brand/logo-primary.png" alt="Logo" className="h-9 w-9 object-contain shrink-0" />
            <span className="font-outfit text-base font-extrabold text-white tracking-tight">Gestión SySO</span>
          </div>
          <nav className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 px-3 block mb-2">Panel principal</span>
            <a href={`/${tenantSlug}/dashboard`} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-[#468DFF] font-semibold text-sm transition-all">
              <Building className="h-4 w-4" />
              Dashboard
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
            <a href={`/${tenantSlug}/programa`} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[#468DFF] text-white font-semibold text-sm transition-all shadow-md shadow-[#468DFF]/10">
              <Calendar className="h-4 w-4" />
              Programa de Gestión Anual
            </a>
            <a href={`/${tenantSlug}/correctivas`} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-[#468DFF] font-semibold text-sm transition-all">
              <ClipboardList className="h-4 w-4" />
              Acciones Correctivas
            </a>
            <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 px-3 block pt-6 mb-2">Configuración</span>
            <a href={`/${tenantSlug}/profile`} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-[#468DFF] font-semibold text-sm transition-all">
              <Settings className="h-4 w-4" />
              Editar Perfil
            </a>
          </nav>
        </div>
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center justify-between rounded-xl bg-black/40 p-3 border border-white/5">
            <div className="truncate pr-2">
              <span className="text-xs font-bold text-white block truncate">{profile?.full_name || 'Usuario'}</span>
              <span className="text-[10px] text-white/40 block truncate uppercase tracking-wider">{profile?.role || 'Profesional'}</span>
            </div>
            <button onClick={handleLogout} className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-600 hover:text-white transition-all cursor-pointer shrink-0">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Container */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <header className="h-16 border-b border-slate-300/60 flex items-center justify-between px-6 md:px-8 bg-white/80 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 -ml-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 md:hidden cursor-pointer">
              <Menu className="h-5 w-5" />
            </button>
            <h2 className="font-outfit text-lg font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-[#468DFF]" />
              Programa de Gestión Anual
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <span className="px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/25 text-[#468DFF] text-[10px] font-semibold uppercase tracking-wider hidden sm:inline-block">
              {tenant?.name || 'Cargando...'}
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
          <div className="p-6 md:p-8 space-y-6 max-w-[85%] mx-auto w-full">
            
            {/* Toolbar superior */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 border border-slate-200/80 rounded-2xl shadow-sm">
              <div className="flex items-center gap-2 rounded-xl bg-slate-100 p-1 border border-slate-200/80 self-start">
                <button
                  onClick={() => setView('calendar')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${view === 'calendar' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  <CalendarDays className="h-4 w-4" />
                  Calendario
                </button>
                <button
                  onClick={() => setView('list')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${view === 'list' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  <List className="h-4 w-4" />
                  Tabla de Control
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Buscador */}
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <Search className="h-4 w-4" />
                  </span>
                  <input
                    type="text"
                    placeholder="Buscar actividad, cliente, obs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full sm:w-60 bg-slate-50 border border-slate-300 focus:border-[#468DFF] rounded-xl py-2 pl-9 pr-4 text-xs text-slate-800 focus:outline-none transition-all"
                  />
                </div>

                <button
                  onClick={() => handleAddNew()}
                  className="flex items-center gap-2 px-4 py-2 bg-[#468DFF] hover:bg-[#0511F2] text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-[#468DFF]/15 cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  Nueva Actividad
                </button>
              </div>
            </div>

            {/* Panel de Filtros rápidos */}
            <div className="bg-white p-5 border border-slate-200/80 rounded-2xl shadow-sm space-y-4">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Settings className="h-3.5 w-3.5 text-slate-500" />
                Filtros del Programa
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Cliente</label>
                  <select
                    value={filterEmpresa}
                    onChange={(e) => { setFilterEmpresa(e.target.value); setFilterEstablecimiento(''); }}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 px-3 text-xs text-slate-700 focus:outline-none focus:border-[#468DFF]"
                  >
                    <option value="">Todos los clientes</option>
                    {empresas.map(e => (
                      <option key={e.id} value={e.id}>{e.razon_social}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Establecimiento</label>
                  <select
                    value={filterEstablecimiento}
                    onChange={(e) => setFilterEstablecimiento(e.target.value)}
                    disabled={!filterEmpresa}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 px-3 text-xs text-slate-700 focus:outline-none focus:border-[#468DFF] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="">Todos los establecimientos</option>
                    {allEstablecimientos.filter(est => est.empresa_id === filterEmpresa).map(e => (
                      <option key={e.id} value={e.id}>{e.denominacion}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Responsable</label>
                  <select
                    value={filterResponsable}
                    onChange={(e) => setFilterResponsable(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 px-3 text-xs text-slate-700 focus:outline-none focus:border-[#468DFF]"
                  >
                    <option value="">Todos los responsables</option>
                    {miembros.map(m => (
                      <option key={m.id} value={m.id}>{m.full_name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Estado</label>
                  <select
                    value={filterEstado}
                    onChange={(e) => setFilterEstado(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 px-3 text-xs text-slate-700 focus:outline-none focus:border-[#468DFF]"
                  >
                    <option value="">Todos los estados</option>
                    <option value="Vigente">Vigente (verde)</option>
                    <option value="Vencido">Vencido (rojo)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* VISTA CALENDARIO */}
            {view === 'calendar' && (
              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-6">
                
                {/* Cabecera del Mes del Calendario */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <h3 className="font-outfit text-base font-extrabold text-slate-900 flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-[#468DFF]" />
                    {MONTH_NAMES[currMonth]} {currYear}
                  </h3>
                  
                  <div className="flex items-center gap-1">
                    <button
                      onClick={handlePrevMonth}
                      className="p-2 border border-slate-300 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors text-slate-600 cursor-pointer"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setCalendarDate(new Date())}
                      className="px-3 py-2 border border-slate-300 rounded-xl bg-slate-50 hover:bg-slate-100 text-xs font-bold transition-colors cursor-pointer text-slate-600"
                    >
                      Hoy
                    </button>
                    <button
                      onClick={handleNextMonth}
                      className="p-2 border border-slate-300 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors text-slate-600 cursor-pointer"
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
                      return <div key={`empty-${idx}`} className="bg-slate-50/30 rounded-xl border border-slate-100/50 min-h-[100px] md:min-h-[120px]" />;
                    }

                    const dateStr = `${currYear}-${String(currMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const dayActs = filteredActividades.filter(act => act.fecha_planificada === dateStr);
                    const isToday = new Date().toISOString().split('T')[0] === dateStr;

                    return (
                      <div
                        key={`day-${day}`}
                        className={`bg-white rounded-xl border p-2 flex flex-col justify-between group min-h-[100px] md:min-h-[120px] transition-all hover:shadow-md cursor-pointer ${isToday ? 'border-[#468DFF] ring-1 ring-[#468DFF]/30' : 'border-slate-200/80'}`}
                        onClick={() => handleAddNew(dateStr)}
                      >
                        {/* Indicador del número de día */}
                        <div className="flex items-center justify-between mb-1.5">
                          <span className={`text-xs font-extrabold px-1.5 py-0.5 rounded-md ${isToday ? 'bg-[#468DFF] text-white' : 'text-slate-800'}`}>
                            {day}
                          </span>
                          
                          {/* Botón rápido de agregar */}
                          <span className="opacity-0 group-hover:opacity-100 text-[10px] text-[#468DFF] hover:text-[#0511F2] font-bold transition-all transition-opacity">
                            + Añadir
                          </span>
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
              <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        <th className="px-6 py-4">Cliente / Establecimiento</th>
                        <th className="px-6 py-4">Actividad / Legal</th>
                        <th className="px-6 py-4">Responsable</th>
                        <th className="px-6 py-4">F. Planificada</th>
                        <th className="px-6 py-4">F. Realización</th>
                        <th className="px-6 py-4">Progreso</th>
                        <th className="px-6 py-4">Estado</th>
                        <th className="px-6 py-4 text-center">Doc</th>
                        <th className="px-6 py-4 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {filteredActividades.length === 0 ? (
                        <tr>
                          <td colSpan="9" className="px-6 py-10 text-center text-slate-400 font-semibold">
                            No se encontraron actividades de gestión anual.
                          </td>
                        </tr>
                      ) : (
                        filteredActividades.map(act => {
                          const emp = empresas.find(e => e.id === act.empresa_id);
                          const est = allEstablecimientos.find(e => e.id === act.establecimiento_id);
                          const resp = miembros.find(m => m.id === act.responsable_id);
                          
                          const statusInfo = getItemStatusAndColor(act);
                          
                          // Alerta visual de fecha planificada
                          let dateColorClass = 'text-slate-700';
                          if (statusInfo.dateAlertColor === 'red') {
                            dateColorClass = 'text-[#fa050b] bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-lg font-bold';
                          } else if (statusInfo.dateAlertColor === 'yellow') {
                            dateColorClass = 'text-amber-600 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-lg font-bold';
                          }

                          return (
                            <tr key={act.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-6 py-4">
                                <span className="font-extrabold text-slate-800 block truncate max-w-[160px]">
                                  {emp?.razon_social || 'Cliente desconocido'}
                                </span>
                                <span className="text-[10px] text-slate-400 block truncate max-w-[160px]">
                                  {est?.denominacion || 'Sin establecimiento'}
                                </span>
                              </td>
                              
                              <td className="px-6 py-4">
                                <span className="font-semibold text-slate-700 block truncate max-w-[200px]" title={act.descripcion}>
                                  {act.descripcion}
                                </span>
                                <span className="text-[10px] text-slate-400 block truncate max-w-[200px]">
                                  {act.marco_legal || 'Sin marco legal registrado'}
                                </span>
                              </td>

                              <td className="px-6 py-4 font-semibold text-slate-600">
                                {resp?.full_name || 'Sin asignar'}
                              </td>

                              <td className="px-6 py-4 font-mono font-medium">
                                <span className={dateColorClass}>
                                  {act.fecha_planificada}
                                </span>
                              </td>

                              <td className="px-6 py-4 font-mono text-slate-500">
                                {act.fecha_realizacion || 'Pendiente'}
                              </td>

                              <td className="px-6 py-4">
                                <div className="space-y-1 w-24">
                                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-500">
                                    <span>{act.progreso}%</span>
                                  </div>
                                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                    <div 
                                      className={`h-full rounded-full transition-all duration-300 ${act.progreso === 100 ? 'bg-[#0b8043]' : 'bg-[#468DFF]'}`}
                                      style={{ width: `${act.progreso}%` }}
                                    />
                                  </div>
                                </div>
                              </td>

                              <td className="px-6 py-4">
                                <span
                                  className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white uppercase tracking-wider"
                                  style={{ backgroundColor: statusInfo.estadoColor }}
                                >
                                  {statusInfo.estadoText}
                                </span>
                              </td>

                              <td className="px-6 py-4 text-center">
                                {act.documento_url ? (
                                  <button
                                    onClick={() => handleViewPdf(act.documento_url)}
                                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-[#468DFF] text-slate-500 hover:text-white transition-all cursor-pointer inline-flex items-center justify-center shadow-sm"
                                    title="Descargar o Ver Documento PDF"
                                  >
                                    <FileText className="h-4 w-4" />
                                  </button>
                                ) : (
                                  <span className="text-[10px] text-slate-400 font-semibold italic">Vacío</span>
                                )}
                              </td>

                              <td className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => handleEdit(act)}
                                    className="p-1.5 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-800 cursor-pointer transition-all shadow-sm"
                                    title="Editar actividad"
                                  >
                                    <Edit className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDelete(act.id)}
                                    className="p-1.5 border border-red-200 rounded-lg bg-white hover:bg-red-50 text-red-400 hover:text-red-600 cursor-pointer transition-all shadow-sm"
                                    title="Eliminar actividad"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* DIÁLOGO / FORMULARIO SLIDE-OVER DESLIZABLE */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex justify-end">
            {/* Fondo translúcido */}
            <div 
              onClick={() => setShowForm(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300"
            />
            
            {/* Panel de Formulario */}
            <div className="relative w-full max-w-lg bg-white h-full shadow-2xl p-6 flex flex-col justify-between overflow-y-auto animate-scaleUp z-10 border-l border-slate-200">
              
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                <h3 className="font-outfit text-base font-extrabold text-slate-900 flex items-center gap-2">
                  {editingId ? <Edit className="h-5 w-5 text-[#468DFF]" /> : <Plus className="h-5 w-5 text-[#468DFF]" />}
                  {editingId ? 'Editar Actividad Anual' : 'Nueva Actividad del Programa'}
                </h3>
                <button 
                  onClick={() => setShowForm(false)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-800 transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Form Body */}
              <form onSubmit={handleSave} className="flex-1 py-6 space-y-5">
                
                {/* 1. Razón Social (Empresa) */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Cliente / Razón Social <span className="text-[#468DFF]">*</span>
                  </label>
                  <select
                    required
                    value={empresaId}
                    onChange={(e) => handleEmpresaChange(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 focus:border-[#468DFF] focus:ring-1 focus:ring-[#468DFF] rounded-xl py-3 px-4 text-xs text-slate-800 focus:outline-none transition-all"
                  >
                    <option value="">Selecciona un cliente</option>
                    {empresas.map(e => (
                      <option key={e.id} value={e.id}>{e.razon_social}</option>
                    ))}
                  </select>
                  {formErrors.empresaId && <p className="text-[10px] text-red-500 font-bold mt-1">{formErrors.empresaId}</p>}
                </div>

                {/* 2. Establecimiento */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Establecimiento
                  </label>
                  <select
                    value={establecimientoId}
                    onChange={(e) => setEstablecimientoId(e.target.value)}
                    disabled={!empresaId}
                    className="w-full bg-slate-50 border border-slate-300 focus:border-[#468DFF] focus:ring-1 focus:ring-[#468DFF] rounded-xl py-3 px-4 text-xs text-slate-800 focus:outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="">Selecciona un establecimiento</option>
                    {filteredEstablecimientos.map(e => (
                      <option key={e.id} value={e.id}>{e.denominacion}</option>
                    ))}
                  </select>
                  {!empresaId && <p className="text-[9px] text-slate-400 mt-1 italic">Debes seleccionar una Razón Social primero.</p>}
                </div>

                {/* 3. Descripción (Catálogo o texto manual si no coincide) */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Descripción / Actividad <span className="text-[#468DFF]">*</span>
                  </label>
                  <select
                    value={catalogoId}
                    onChange={(e) => handleDescripcionChange(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 focus:border-[#468DFF] focus:ring-1 focus:ring-[#468DFF] rounded-xl py-3 px-4 text-xs text-slate-800 focus:outline-none transition-all mb-2"
                  >
                    <option value="">-- Selecciona del catálogo --</option>
                    {catalogo.map(c => (
                      <option key={c.id} value={c.id}>{c.descripcion}</option>
                    ))}
                  </select>
                  
                  {/* Input manual en caso de requerir detalles o escribir libremente */}
                  <textarea
                    required
                    placeholder="Detalla la actividad a realizar..."
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 focus:border-[#468DFF] focus:ring-1 focus:ring-[#468DFF] rounded-xl py-3 px-4 text-xs text-slate-800 focus:outline-none transition-all h-20 resize-none"
                  />
                  {formErrors.descripcion && <p className="text-[10px] text-red-500 font-bold mt-1">{formErrors.descripcion}</p>}
                </div>

                {/* 4. Marco Legal */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Marco Legal (Automático)
                  </label>
                  <input
                    type="text"
                    placeholder="Completado automáticamente..."
                    value={marcoLegal}
                    onChange={(e) => setMarcoLegal(e.target.value)}
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl py-3 px-4 text-xs text-slate-500 focus:outline-none cursor-default"
                    readOnly
                  />
                </div>

                {/* 5. Responsable */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Responsable Asignado
                  </label>
                  <select
                    value={responsableId}
                    onChange={(e) => setResponsableId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 focus:border-[#468DFF] focus:ring-1 focus:ring-[#468DFF] rounded-xl py-3 px-4 text-xs text-slate-800 focus:outline-none transition-all"
                  >
                    <option value="">Selecciona un responsable</option>
                    {miembros.map(m => (
                      <option key={m.id} value={m.id}>{m.full_name}</option>
                    ))}
                  </select>
                </div>

                {/* 6. Fechas */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      F. Planificada <span className="text-[#468DFF]">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={fechaPlanificada}
                      onChange={(e) => setFechaPlanificada(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 focus:border-[#468DFF] focus:ring-1 focus:ring-[#468DFF] rounded-xl py-3 px-4 text-xs text-slate-800 focus:outline-none transition-all font-mono"
                    />
                    {formErrors.fechaPlanificada && <p className="text-[10px] text-red-500 font-bold mt-1">{formErrors.fechaPlanificada}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      F. Realización
                    </label>
                    <input
                      type="date"
                      value={fechaRealizacion}
                      onChange={(e) => handleRealizacionChange(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 focus:border-[#468DFF] focus:ring-1 focus:ring-[#468DFF] rounded-xl py-3 px-4 text-xs text-slate-800 focus:outline-none transition-all font-mono"
                    />
                  </div>
                </div>

                {/* 7. Progreso */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Porcentaje de Progreso
                    </label>
                    <span className="text-xs font-extrabold text-[#468DFF] font-mono">{progreso}%</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      disabled={!!fechaRealizacion}
                      value={progreso}
                      onChange={(e) => setProgreso(e.target.value)}
                      className="w-full accent-[#468DFF] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </div>
                  {fechaRealizacion && (
                    <p className="text-[10px] text-[#0b8043] font-bold mt-1 flex items-center gap-1">
                      <Check className="h-3.5 w-3.5" />
                      Forzado automáticamente al 100% debido a la fecha de realización.
                    </p>
                  )}
                </div>

                {/* 8. Cargar Documento PDF */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Documento de Respaldo (PDF)
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
                          className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white transition-all cursor-pointer inline-flex items-center shadow-sm"
                          title="Eliminar documento cargado"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ) : null}

                  <input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => setDocumentoFile(e.target.files[0])}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 px-3 text-xs text-slate-600 focus:outline-none file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:uppercase file:bg-[#468DFF]/10 file:text-[#468DFF] hover:file:bg-[#468DFF]/20 file:cursor-pointer"
                  />
                  <p className="text-[9px] text-slate-400 mt-1 italic">Solo formato PDF. Tamaño máximo de 10 MB.</p>
                </div>

                {/* 9. Observaciones */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Observaciones Generales
                  </label>
                  <textarea
                    placeholder="Escribe comentarios, novedades o detalles..."
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 focus:border-[#468DFF] focus:ring-1 focus:ring-[#468DFF] rounded-xl py-3 px-4 text-xs text-slate-800 focus:outline-none transition-all h-24 resize-none"
                  />
                </div>

              </form>

              {/* Botones de acción */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-5 py-3 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-[#468DFF] hover:bg-[#0511F2] text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-[#468DFF]/15 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer min-w-[120px]"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      Guardar
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL DE CONFIRMACIÓN */}
        {confirmModal.show && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setConfirmModal({ show: false, title: '', message: '', onConfirm: null })} />
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl max-w-sm w-full z-10 space-y-4 animate-scaleUp">
              <div className="flex items-center gap-3 text-red-500">
                <AlertTriangle className="h-6 w-6" />
                <h4 className="font-outfit font-extrabold text-slate-900">{confirmModal.title}</h4>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed font-normal">{confirmModal.message}</p>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setConfirmModal({ show: false, title: '', message: '', onConfirm: null })}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmModal.onConfirm}
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-red-500/15 cursor-pointer"
                >
                  Eliminar
                </button>
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
