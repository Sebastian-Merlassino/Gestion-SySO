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
  ClipboardList,
  GraduationCap,
  ArrowLeft,
  Sliders,
  Flame
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
  const [filterMonth, setFilterMonth] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

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
  const [editingId, setEditingId] = useState(null);
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
  const [uploadType, setUploadType] = useState('local'); // 'local' or 'drive'
  const [driveLink, setDriveLink] = useState('');

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

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      window.location.href = '/login';
    } catch (err) {
      window.location.href = '/login';
    }
  };

  // Helper: formatear fecha YYYY-MM-DD → DD/MM/YYYY
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
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
          setConfirmModal({ show: false, title: '', message: '', onConfirm: null, confirmText: 'Eliminar' });
        }
      });
    } else {
      setUploadType(newType);
      setDocumentoFile(null);
      setDriveLink('');
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
          setDocumentoUrl(''); // Limpiar la URL anterior para reflejar el reemplazo
          setConfirmModal({ show: false, title: '', message: '', onConfirm: null, confirmText: 'Eliminar' });
        }
      });
    } else {
      setDocumentoFile(file);
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
    setFechaPlanificada(item.fecha_planificada || '');
    setFechaRealizacion(item.fecha_realizacion || '');
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
    setEditingId(null);
    setEmpresaId('');
    setEstablecimientoId('');
    setCatalogoId('');
    setDescripcion('');
    setMarcoLegal('');
    setResponsableId('');
    setResponsableCustom('');
    setProgreso(0);
    setFechaPlanificada(preselectedDate || new Date().toISOString().split('T')[0]);
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
      confirmText: 'Eliminar',
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
          setConfirmModal({ show: false, title: '', message: '', onConfirm: null, confirmText: 'Eliminar' });
        }
      }
    });
  };

  const handleExitForm = () => {
    setConfirmModal({
      show: true,
      title: 'Salir sin guardar',
      message: '¿Estás seguro de que deseas salir? Los cambios no guardados se perderán.',
      confirmText: 'Salir',
      onConfirm: () => {
        setShowForm(false);
        setConfirmModal({ show: false, title: '', message: '', onConfirm: null, confirmText: 'Eliminar' });
      }
    });
  };

  const handleSidebarNavigation = (e, path) => {
    if (showForm) {
      e.preventDefault();
      setConfirmModal({
        show: true,
        title: 'Salir sin guardar',
        message: '¿Estás seguro de que deseas salir? Los cambios no guardados se perderán.',
        confirmText: 'Salir',
        onConfirm: () => {
          setConfirmModal({ show: false, title: '', message: '', onConfirm: null, confirmText: 'Eliminar' });
          if (path.endsWith('/programa')) {
            setShowForm(false);
          } else {
            window.location.href = path;
          }
        }
      });
    }
  };

  // 8. Visualizar documento (PDF Storage o link externo)
  const handleViewPdf = async (path) => {
    if (!path) return;
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

      // Agregar ?download=false para pedir al servidor apertura inline
      // (Supabase Storage respeta este parámetro en la signed URL)
      const viewUrl = data.signedUrl.includes('?')
        ? `${data.signedUrl}&download=`
        : `${data.signedUrl}?download=`;

      window.open(viewUrl, '_blank');
    } catch (err) {
      console.error('Error al abrir el documento:', err);
      triggerToast('No se pudo abrir el documento. Verificá tu conexión.', 'error');
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
    <div className="h-screen overflow-hidden bg-[#D9D9D9] text-slate-700 flex font-sans">
      
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
                <a href={`/${tenantSlug}/dashboard`} onClick={(e) => handleSidebarNavigation(e, `/${tenantSlug}/dashboard`)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-[#468DFF] font-semibold text-sm transition-all">
                  <Building className="h-4 w-4" />
                  Dashboard
                </a>
                <a href={`/${tenantSlug}/empresas`} onClick={(e) => handleSidebarNavigation(e, `/${tenantSlug}/empresas`)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-[#468DFF] font-semibold text-sm transition-all">
                  <Users className="h-4 w-4" />
                  Clientes
                </a>
                {(profile?.role === 'owner' || profile?.role === 'admin') && (
                  <a href={`/${tenantSlug}/equipo`} onClick={(e) => handleSidebarNavigation(e, `/${tenantSlug}/equipo`)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-[#468DFF] font-semibold text-sm transition-all">
                    <Briefcase className="h-4 w-4" />
                    Equipo de Trabajo
                  </a>
                )}
                <a href={`/${tenantSlug}/programa`} onClick={(e) => handleSidebarNavigation(e, `/${tenantSlug}/programa`)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[#468DFF] text-white font-semibold text-sm transition-all shadow-md shadow-[#468DFF]/10">
                  <Calendar className="h-4 w-4" />
                  Programa de Gestión Anual
                </a>
                <a href={`/${tenantSlug}/capacitacion`} onClick={(e) => handleSidebarNavigation(e, `/${tenantSlug}/capacitacion`)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-[#468DFF] font-semibold text-sm transition-all">
                  <GraduationCap className="h-4 w-4" />
                  Programa de Capacitación Anual
                </a>
                <a href={`/${tenantSlug}/correctivas`} onClick={(e) => handleSidebarNavigation(e, `/${tenantSlug}/correctivas`)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-[#468DFF] font-semibold text-sm transition-all">
                  <ClipboardList className="h-4 w-4" />
                  Acciones Correctivas
                </a>
                <a href={`/${tenantSlug}/extintores`} onClick={(e) => handleSidebarNavigation(e, `/${tenantSlug}/extintores`)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-[#468DFF] font-semibold text-sm transition-all">
                  <Flame className="h-4 w-4" />
                  Extintores
                </a>
                <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 px-3 block pt-6 mb-2">Configuración</span>
                <a href={`/${tenantSlug}/profile`} onClick={(e) => handleSidebarNavigation(e, `/${tenantSlug}/profile`)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-[#468DFF] font-semibold text-sm transition-all">
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
      <aside className={`bg-[#0D0D0D] flex flex-col justify-between shrink-0 hidden md:flex transition-all duration-300 ${isSidebarCollapsed ? 'w-20' : 'w-64'}`}>
        <div className="p-6">
          {/* Logo Brand */}
          <div className={`flex items-center justify-between gap-3 mb-8 ${isSidebarCollapsed ? 'flex-col' : ''}`}>
            <div className="flex items-center gap-3">
              <img src="/brand/logo-primary.png" alt="Logo" className="h-9 w-9 object-contain shrink-0" />
              {!isSidebarCollapsed && (
                <span className="font-outfit text-base font-extrabold text-white tracking-tight block animate-fade-in">Gestión SySO</span>
              )}
            </div>
            <button
              onClick={toggleSidebar}
              title={isSidebarCollapsed ? 'Expandir barra lateral' : 'Contraer barra lateral'}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all cursor-pointer"
            >
              {isSidebarCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </button>
          </div>
          <nav className="space-y-1.5">
            {!isSidebarCollapsed ? (
              <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 px-3 block mb-2">Panel principal</span>
            ) : (
              <div className="h-px bg-white/10 my-3" />
            )}
            <a 
              href={`/${tenantSlug}/dashboard`} 
              title="Dashboard"
              onClick={(e) => handleSidebarNavigation(e, `/${tenantSlug}/dashboard`)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-[#468DFF] font-semibold text-sm transition-all ${isSidebarCollapsed ? 'justify-center' : ''}`}
            >
              <Building className="h-4 w-4 shrink-0" />
              {!isSidebarCollapsed && <span className="animate-fade-in">Dashboard</span>}
            </a>
            <a 
              href={`/${tenantSlug}/empresas`} 
              title="Clientes"
              onClick={(e) => handleSidebarNavigation(e, `/${tenantSlug}/empresas`)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-[#468DFF] font-semibold text-sm transition-all ${isSidebarCollapsed ? 'justify-center' : ''}`}
            >
              <Users className="h-4 w-4 shrink-0" />
              {!isSidebarCollapsed && <span className="animate-fade-in">Clientes</span>}
            </a>
            {(profile?.role === 'owner' || profile?.role === 'admin') && (
              <a 
                href={`/${tenantSlug}/equipo`} 
                title="Equipo de Trabajo"
                onClick={(e) => handleSidebarNavigation(e, `/${tenantSlug}/equipo`)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-[#468DFF] font-semibold text-sm transition-all ${isSidebarCollapsed ? 'justify-center' : ''}`}
              >
                <Briefcase className="h-4 w-4 shrink-0" />
                {!isSidebarCollapsed && <span className="animate-fade-in">Equipo de Trabajo</span>}
              </a>
            )}
            <a 
              href={`/${tenantSlug}/programa`} 
              title="Programa de Gestión Anual"
              onClick={(e) => handleSidebarNavigation(e, `/${tenantSlug}/programa`)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[#468DFF] text-white font-semibold text-sm transition-all shadow-md shadow-[#468DFF]/10 ${isSidebarCollapsed ? 'justify-center' : ''}`}
            >
              <Calendar className="h-4 w-4 shrink-0" />
              {!isSidebarCollapsed && <span className="animate-fade-in">Programa de Gestión Anual</span>}
            </a>
            <a 
              href={`/${tenantSlug}/capacitacion`} 
              title="Programa de Capacitación Anual"
              onClick={(e) => handleSidebarNavigation(e, `/${tenantSlug}/capacitacion`)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-[#468DFF] font-semibold text-sm transition-all ${isSidebarCollapsed ? 'justify-center' : ''}`}
            >
              <GraduationCap className="h-4 w-4 shrink-0" />
              {!isSidebarCollapsed && <span className="animate-fade-in">Programa de Capacitación Anual</span>}
            </a>
            <a 
              href={`/${tenantSlug}/correctivas`} 
              title="Acciones Correctivas"
              onClick={(e) => handleSidebarNavigation(e, `/${tenantSlug}/correctivas`)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-[#468DFF] font-semibold text-sm transition-all ${isSidebarCollapsed ? 'justify-center' : ''}`}
            >
              <ClipboardList className="h-4 w-4 shrink-0" />
              {!isSidebarCollapsed && <span className="animate-fade-in">Acciones Correctivas</span>}
            </a>
            <a 
              href={`/${tenantSlug}/extintores`} 
              title="Extintores"
              onClick={(e) => handleSidebarNavigation(e, `/${tenantSlug}/extintores`)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-[#468DFF] font-semibold text-sm transition-all ${isSidebarCollapsed ? 'justify-center' : ''}`}
            >
              <Flame className="h-4 w-4 shrink-0" />
              {!isSidebarCollapsed && <span className="animate-fade-in">Extintores</span>}
            </a>
            
            {!isSidebarCollapsed ? (
              <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 px-3 block pt-6 mb-2">Configuración</span>
            ) : (
              <div className="h-px bg-white/10 my-6" />
            )}
            <a 
              href={`/${tenantSlug}/profile`} 
              title="Editar Perfil"
              onClick={(e) => handleSidebarNavigation(e, `/${tenantSlug}/profile`)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-[#468DFF] font-semibold text-sm transition-all ${isSidebarCollapsed ? 'justify-center' : ''}`}
            >
              <Settings className="h-4 w-4 shrink-0" />
              {!isSidebarCollapsed && <span className="animate-fade-in">Editar Perfil</span>}
            </a>
          </nav>
        </div>
        <div className="p-4 border-t border-white/10">
          <div className={`flex items-center justify-between rounded-xl bg-black/40 p-3 border border-white/5 ${isSidebarCollapsed ? 'flex-col gap-2' : ''}`}>
            {!isSidebarCollapsed && (
              <div className="truncate pr-2">
                <span className="text-xs font-bold text-white block truncate">{profile?.full_name || 'Usuario'}</span>
                <span className="text-[10px] text-white/40 block truncate uppercase tracking-wider">{profile?.role || 'Profesional'}</span>
              </div>
            )}
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
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-500 bg-slate-100 py-1.5 px-3 rounded-lg border border-slate-200">
              {tenant?.name || 'Mi Consultora'}
            </span>
            {tenant?.plan_id && (
              <span className="px-2.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/25 text-[#468DFF] text-[10px] font-semibold uppercase tracking-wider hidden sm:inline-block">
                {tenant.plan_id === 'libre' ? 'Plan Libre' : tenant.plan_id === 'standard_25' ? 'Plan 25' : tenant.plan_id === 'basic_5' ? 'Plan 5' : 'Plan Gratis'}
              </span>
            )}
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
              <div className="bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[85vh]">
                <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5 bg-slate-50">
                  <div className="flex items-center gap-3">
                    <button 
                      type="button"
                      onClick={handleExitForm}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-colors border border-slate-200 bg-white shadow-sm cursor-pointer"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </button>
                    <h3 className="font-outfit text-base font-extrabold text-slate-900">
                      {editingId ? 'Editar Actividad Anual' : 'Nueva Actividad del Programa'}
                    </h3>
                  </div>
                  <button type="button" onClick={handleExitForm} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <form onSubmit={handleSave} className="p-6 space-y-6 overflow-y-auto flex-1 scrollbar-thin">
                  
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
                      Establecimiento <span className="text-[#468DFF]">*</span>
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
                    {formErrors.establecimientoId && <p className="text-[10px] text-red-500 font-bold mt-1">{formErrors.establecimientoId}</p>}
                  </div>

                  {/* 3. Descripción (Catálogo o texto manual) */}
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
                      <option value="__custom__">Otra actividad (cargar manualmente)...</option>
                    </select>
                    
                    {/* Textarea: siempre visible; pre-cargada desde catálogo o editable manualmente */}
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
                      Marco Legal / Requisito Legal Aplicable
                    </label>
                    <input
                      type="text"
                      placeholder={catalogoId && catalogoId !== '__custom__' ? 'Completado automáticamente desde catálogo...' : 'Ingresá el requisito legal aplicable...'}
                      value={marcoLegal}
                      onChange={(e) => setMarcoLegal(e.target.value)}
                      className={`w-full border rounded-xl py-3 px-4 text-xs focus:outline-none transition-all ${
                        catalogoId && catalogoId !== '__custom__'
                          ? 'bg-slate-100 border-slate-200 text-slate-500 cursor-default'
                          : 'bg-slate-50 border-slate-300 focus:border-[#468DFF] focus:ring-1 focus:ring-[#468DFF] text-slate-800'
                      }`}
                      readOnly={!!(catalogoId && catalogoId !== '__custom__')}
                    />
                    {(!catalogoId || catalogoId === '__custom__') && (
                      <p className="text-[9px] text-slate-400 mt-1 italic">Podés ingresar la norma o resolución aplicable (ej: Dec. 351/79, Res. 905/15...)</p>
                    )}
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
                      <option value="__custom__">Otro (cargar manualmente)...</option>
                    </select>

                    {responsableId === '__custom__' && (
                      <input
                        type="text"
                        required
                        placeholder="Escribe el nombre del responsable..."
                        value={responsableCustom}
                        onChange={(e) => setResponsableCustom(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 focus:border-[#468DFF] focus:ring-1 focus:ring-[#468DFF] rounded-xl py-3 px-4 text-xs text-slate-800 focus:outline-none transition-all mt-2 animate-scaleUp"
                      />
                    )}
                  </div>

                  {/* 6. Fechas */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                        F. Planificada
                      </label>
                      <input
                        type="date"
                        value={fechaPlanificada}
                        onChange={(e) => setFechaPlanificada(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 focus:border-[#468DFF] focus:ring-1 focus:ring-[#468DFF] rounded-xl py-3 px-4 text-xs text-slate-800 focus:outline-none transition-all font-mono"
                      />
                      <p className="text-[9px] text-slate-400 mt-1 italic">Opcional. Si no se carga, el estado será "En análisis".</p>
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
                      <p className="text-[9px] text-slate-400 mt-1 italic">Si se carga, el progreso se fija al 100% y el estado a Vigente.</p>
                    </div>
                  </div>

                  {/* 7. Progreso */}
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
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
                        className="w-16 text-center text-xs bg-slate-50 border border-slate-300 rounded-xl py-1.5 outline-none focus:border-[#468DFF]"
                      />
                    </div>
                  </div>

                  {/* 8. Carga de Documento */}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
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
                            className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white transition-all cursor-pointer inline-flex items-center shadow-sm"
                            title="Eliminar documento cargado"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ) : null}

                    <div className="flex items-center gap-2 mb-2.5">
                      <button
                        type="button"
                        onClick={() => handleSwitchUploadType('local')}
                        className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                          uploadType === 'local'
                            ? 'bg-[#468DFF]/10 text-[#468DFF] border-[#468DFF]/30'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        Archivo Local (PC/Celular)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSwitchUploadType('drive')}
                        className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                          uploadType === 'drive'
                            ? 'bg-[#468DFF]/10 text-[#468DFF] border-[#468DFF]/30'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        Vincular Google Drive
                      </button>
                    </div>

                    {uploadType === 'local' ? (
                      <>
                        <input
                          type="file"
                          accept=".pdf"
                          onChange={(e) => handleFileChangeWithConfirm(e.target.files[0])}
                          className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 px-3 text-xs text-slate-600 focus:outline-none file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:uppercase file:bg-[#468DFF]/10 file:text-[#468DFF] hover:file:bg-[#468DFF]/20 file:cursor-pointer"
                        />
                        <p className="text-[9px] text-slate-400 mt-1 italic">Solo formato PDF. Tamaño máximo de 10 MB.</p>
                      </>
                    ) : (
                      <>
                        <input
                          type="url"
                          placeholder="Pega el enlace compartido de Google Drive..."
                          value={driveLink}
                          onChange={(e) => setDriveLink(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-300 focus:border-[#468DFF] focus:ring-1 focus:ring-[#468DFF] rounded-xl py-2.5 px-3 text-xs text-slate-800 focus:outline-none transition-all"
                        />
                        <p className="text-[9px] text-slate-400 mt-1 italic">
                          El archivo debe ser público en Drive ("Cualquier persona con el enlace"). Se convertirá y guardará automáticamente.
                        </p>
                      </>
                    )}
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

                  {/* Botones de acción del formulario */}
                  <div className="pt-4 border-t border-slate-200 flex items-center justify-between shrink-0">
                    <button
                      type="button"
                      onClick={handleExitForm}
                      className="px-5 py-3 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-2 bg-white"
                    >
                      Salir
                    </button>
                    <button
                      type="submit"
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
                </form>
              </div>
            ) : (
              <>
                {/* Toolbar y Filtros Unificados */}
            <div className="bg-white p-5 border border-slate-200/80 rounded-2xl shadow-sm space-y-6">
              
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
                <div className="flex flex-wrap items-center gap-3">
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

              {/* Fila Inferior: Filtros rápidos */}
              <div className="border-t border-slate-100 pt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Sliders className="h-3 w-3" />
                    Filtros de Búsqueda
                  </span>
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
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-red-50 text-slate-500 hover:text-red-600 border border-slate-200 hover:border-red-200 text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer"
                    >
                      <X className="h-3 w-3" />
                      Limpiar filtros
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
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
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Mes</label>
                    <select
                      value={filterMonth}
                      onChange={(e) => setFilterMonth(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 px-3 text-xs text-slate-700 focus:outline-none focus:border-[#468DFF]"
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

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Año</label>
                    <select
                      value={filterYear}
                      onChange={(e) => setFilterYear(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 px-3 text-xs text-slate-700 focus:outline-none focus:border-[#468DFF]"
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
                      <option value="En análisis">En análisis</option>
                    </select>
                  </div>
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
                <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 280px)' }}>
                  <table className="w-full border-collapse text-left">
                    <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200">
                      <tr className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 select-none transition-colors" onClick={() => handleSort('cliente')}>
                          <div className="flex items-center gap-1">
                            Cliente / Establecimiento
                            {sortField === 'cliente' && (sortOrder === 'asc' ? ' ▲' : ' ▼')}
                          </div>
                        </th>
                        <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 select-none transition-colors" onClick={() => handleSort('actividad')}>
                          <div className="flex items-center gap-1">
                            Actividad / Legal
                            {sortField === 'actividad' && (sortOrder === 'asc' ? ' ▲' : ' ▼')}
                          </div>
                        </th>
                        <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 select-none transition-colors" onClick={() => handleSort('responsable')}>
                          <div className="flex items-center gap-1">
                            Responsable
                            {sortField === 'responsable' && (sortOrder === 'asc' ? ' ▲' : ' ▼')}
                          </div>
                        </th>
                        <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 select-none transition-colors" onClick={() => handleSort('fecha_planificada')}>
                          <div className="flex items-center gap-1">
                            F. Planificada
                            {sortField === 'fecha_planificada' && (sortOrder === 'asc' ? ' ▲' : ' ▼')}
                          </div>
                        </th>
                        <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 select-none transition-colors" onClick={() => handleSort('fecha_realizacion')}>
                          <div className="flex items-center gap-1">
                            F. Realización
                            {sortField === 'fecha_realizacion' && (sortOrder === 'asc' ? ' ▲' : ' ▼')}
                          </div>
                        </th>
                        <th className="px-6 py-4">Progreso</th>
                        <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 select-none transition-colors" onClick={() => handleSort('estado')}>
                          <div className="flex items-center gap-1">
                            Estado
                            {sortField === 'estado' && (sortOrder === 'asc' ? ' ▲' : ' ▼')}
                          </div>
                        </th>
                        <th className="px-6 py-4 text-center">Doc</th>
                        <th className="px-6 py-4 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {sortedActividades.length === 0 ? (
                        <tr>
                          <td colSpan="9" className="px-6 py-10 text-center text-slate-400 font-semibold">
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
                          let dateColorClass = 'text-slate-700 font-mono';
                          if (statusInfo.dateAlertColor === 'red') {
                            dateColorClass = 'text-[#fa050b] bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-lg font-bold font-mono';
                          } else if (statusInfo.dateAlertColor === 'yellow') {
                            dateColorClass = 'text-amber-600 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-lg font-bold font-mono';
                          }

                          return (
                            <tr 
                              key={act.id} 
                              onClick={() => handleEdit(act)}
                              className="hover:bg-slate-50 transition-colors cursor-pointer"
                            >
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
                                {act.responsable || 'Sin asignar'}
                              </td>

                              <td className="px-6 py-4">
                                {act.fecha_planificada ? (
                                  <span className={dateColorClass}>
                                    {formatDate(act.fecha_planificada)}
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-slate-400 font-semibold italic">Pendiente</span>
                                )}
                              </td>

                              <td className="px-6 py-4 font-mono text-slate-500">
                                {act.fecha_realizacion ? formatDate(act.fecha_realizacion) : <span className="text-[10px] text-slate-400 italic">Pendiente</span>}
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

                              <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                                {act.documento_url ? (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleViewPdf(act.documento_url); }}
                                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-[#468DFF] text-slate-500 hover:text-white transition-all cursor-pointer inline-flex items-center justify-center shadow-sm"
                                    title="Descargar o Ver Documento PDF"
                                  >
                                    <FileText className="h-4 w-4" />
                                  </button>
                                ) : (
                                  <span className="text-[10px] text-slate-400 font-semibold italic">Vacío</span>
                                )}
                              </td>

                              <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleEdit(act); }}
                                    className="p-1.5 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-800 cursor-pointer transition-all shadow-sm"
                                    title="Editar actividad"
                                  >
                                    <Edit className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleDelete(act.id); }}
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
          </>
        )}
          </div>
        )}

        {/* MODAL DE CONFIRMACIÓN */}
        {confirmModal.show && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl max-w-sm w-full space-y-4 text-center">
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
                  className="flex-1 py-2 px-4 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-all cursor-pointer bg-white"
                >
                  Cancelar
                </button>
                {confirmModal.onConfirm && (
                  <button
                    type="button"
                    onClick={confirmModal.onConfirm}
                    className="flex-1 py-2 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md shadow-red-500/10 cursor-pointer"
                  >
                    Confirmar
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
