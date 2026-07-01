// src/app/[tenant-slug]/checklist-personalizados/page.js
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import { supabase } from '@/lib/supabase';
import { formatDate, formatAsDateInput, convertToDbDate } from '@/lib/utils';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import ImageUploadZone from '@/components/ui/ImageUploadZone';
import { 
  PlusCircle, 
  Search, 
  Building, 
  Users, 
  X, 
  Check, 
  Loader2, 
  Trash2, 
  Edit, 
  AlertTriangle, 
  Briefcase, 
  Settings, 
  LogOut, 
  Menu,
  ClipboardList,
  Calendar,
  Eye,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Printer,
  FileText,
  Sliders,
  Send,
  Download,
  Mail,
  Info,
  CheckSquare,
  ListPlus,
  Trash,
  ChevronUp,
  ChevronDown
} from 'lucide-react';

export default function ChecklistPersonalizadosPage({ params }) {
  const tenantSlug = params['tenant-slug'];

  // Estados estructurales
  const [profile, setProfile] = useState(() => {
    if (typeof window !== 'undefined') {
      const cached = sessionStorage.getItem('user-profile');
      return cached ? JSON.parse(cached) : null;
    }
    return null;
  });
  const [tenant, setTenant] = useState(null);
  const [empresas, setEmpresas] = useState([]);
  const [allEstablecimientos, setAllEstablecimientos] = useState([]);
  const [miembrosList, setMiembrosList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDevMode, setIsDevMode] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState('inspecciones'); // 'inspecciones' o 'plantillas'

  // Permisos granulares de edición
  const getSectionPermissions = (userProfile, sectionName) => {
    if (!userProfile) return { cargar: true, editar: true, eliminar: true };
    if (userProfile.role === 'cliente') return { cargar: false, editar: false, eliminar: false };
    if (userProfile.role === 'admin') return { cargar: true, editar: true, eliminar: true };
    const perm = userProfile.permisos?.[sectionName];
    if (perm === true || perm === undefined) return { cargar: true, editar: true, eliminar: true };
    if (perm === false) return { cargar: false, editar: false, eliminar: false };
    return {
      cargar: perm.cargar === true,
      editar: perm.editar === true,
      eliminar: perm.eliminar === true
    };
  };

  const sectionPerms = getSectionPermissions(profile, 'checklist_personalizados');
  const canCargar = sectionPerms.cargar;
  const canEditar = sectionPerms.editar;
  const canEliminar = sectionPerms.eliminar;
  const isReadOnlyView = profile?.role === 'cliente';

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

  // Datos principales de checklist personalizados
  const [templates, setTemplates] = useState([]);
  const [inspecciones, setInspecciones] = useState([]);
  
  // Estados para CRUD de Plantillas (Builder)
  const [isTemplateFormOpen, setIsTemplateFormOpen] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState(null);
  const [templateNombre, setTemplateNombre] = useState('');
  const [configCampos, setConfigCampos] = useState({
    razon_social: true,
    establecimiento: true,
    direccion: true,
    cuit: true,
    fecha: true
  });
  const [templateItems, setTemplateItems] = useState([]);
  const [bloqueImagenes, setBloqueImagenes] = useState(false);
  const [bloqueFirmas, setBloqueFirmas] = useState({
    responsable_establecimiento: false,
    responsable_higiene_seguridad: false
  });

  // Estados para CRUD de Inspecciones (Runner)
  const [isInspeccionFormOpen, setIsInspeccionFormOpen] = useState(false);
  const [editingInspeccionId, setEditingInspeccionId] = useState(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [inspeccionEmpresaId, setInspeccionEmpresaId] = useState('');
  const [inspeccionEstablecimientoId, setInspeccionEstablecimientoId] = useState('');
  const [inspeccionFecha, setInspeccionFecha] = useState('');
  const [inspeccionRespuestas, setInspeccionRespuestas] = useState([]);
  const [fotosFiles, setFotosFiles] = useState([]);
  const [firmaRespSavedUrl, setFirmaRespSavedUrl] = useState('');
  const [firmaProfSavedUrl, setFirmaProfSavedUrl] = useState('');
  const [firmaTipo, setFirmaTipo] = useState('perfil'); // 'perfil' o 'mano'
  const [profesionalTipo, setProfesionalTipo] = useState('miembro'); // 'miembro' o 'manual'
  const [profesionalId, setProfesionalId] = useState('');
  const [profesionalNombre, setProfesionalNombre] = useState('');
  const [responsableAclaracion, setResponsableAclaracion] = useState('');
  const [inspeccionObservaciones, setInspeccionObservaciones] = useState('');
  const [isInspeccionReadOnly, setIsInspeccionReadOnly] = useState(false);

  // Canvas Refs & Signature states
  const [hasSignedResp, setHasSignedResp] = useState(false);
  const [hasSignedProf, setHasSignedProf] = useState(false);
  const firmaRespCanvasRef = useRef(null);
  const firmaProfCanvasRef = useRef(null);
  const [firmaPerfilPreviewUrl, setFirmaPerfilPreviewUrl] = useState('');
  const [signaturePath, setSignaturePath] = useState('');

  // Filtros de Inspecciones
  const [filterText, setFilterText] = useState('');
  const [filterEmpresa, setFilterEmpresa] = useState('');
  const [filterTemplate, setFilterTemplate] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Ordenamiento
  const [sortField, setSortField] = useState('fecha');
  const [sortOrder, setSortOrder] = useState('desc');

  // Modales y Feedback
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [modalAlert, setModalAlert] = useState({ show: false, title: '', message: '', onConfirm: null, confirmText: 'Confirmar' });
  const [saveLoading, setSaveLoading] = useState(false);

  // Envío por correo
  const [isMailModalOpen, setIsMailModalOpen] = useState(false);
  const [mailTargetInspeccion, setMailTargetInspeccion] = useState(null);
  const [availableEmails, setAvailableEmails] = useState([]);
  const [manualEmail, setManualEmail] = useState('');
  const [mailLoading, setMailLoading] = useState(false);

  // Carga inicial de datos
  useEffect(() => {
    const checkEnvAndLoad = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setIsDevMode(true);
        loadMockData();
      } else {
        await loadRealData();
      }
    };
    checkEnvAndLoad();
  }, []);

  // Auto-filtrar por cliente si es rol cliente
  useEffect(() => {
    if (profile && profile.role === 'cliente' && profile.empresa_id) {
      setFilterEmpresa(profile.empresa_id);
    }
  }, [profile]);

  // Auxiliar para resolver firmas y evitar 404s en modo simulación o con URLs inexistentes
  const getFirmaUrl = async (path, type) => {
    if (!path) return '';
    if (path.startsWith('data:')) return path;
    if (isDevMode || path.startsWith('mock')) return '/brand/logo-primary.png';
    try {
      let relativePath = path;
      let isExternal = false;
      
      if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
        try {
          const urlObj = new URL(relativePath);
          const pathParts = urlObj.pathname.split('/');
          const bucketIndex = pathParts.findIndex(part => part === 'signatures' || part === 'documents');
          if (bucketIndex !== -1 && bucketIndex < pathParts.length - 1) {
            relativePath = pathParts.slice(bucketIndex + 1).join('/');
          } else {
            isExternal = true;
          }
        } catch (urlErr) {
          isExternal = true;
        }
      }

      if (isExternal) {
        return relativePath;
      }

      const bucketName = type === 'perfil' ? 'signatures' : 'documents';
      const { data: sData, error: sErr } = await supabase.storage
        .from(bucketName)
        .createSignedUrl(relativePath, 3600);
      
      if (!sErr && sData?.signedUrl) {
        return sData.signedUrl;
      }
    } catch (e) {
      console.error('Error resolviendo firma:', e);
    }
    return '/brand/logo-primary.png';
  };

  // Sincronizar firma del profesional interviniente al cambiar de profesional o tipo
  useEffect(() => {
    const resolveProfileSignaturePreview = async () => {
      if (!signaturePath || firmaTipo !== 'perfil' || !isInspeccionFormOpen) {
        setFirmaPerfilPreviewUrl('');
        return;
      }
      const url = await getFirmaUrl(signaturePath, 'perfil');
      setFirmaPerfilPreviewUrl(url);
    };

    resolveProfileSignaturePreview();
  }, [isInspeccionFormOpen, signaturePath, profesionalTipo, firmaTipo, isDevMode]);

  const triggerToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 4000);
  };

  const closeAlert = () => setModalAlert({ show: false, title: '', message: '', onConfirm: null, confirmText: 'Confirmar' });

  // Cargar mock data en modo desarrollo local
  const loadMockData = () => {
    setTenant({ id: 'mock-tenant-1', name: 'SySO Consultora Integral', logo_1_url: '/brand/logo-primary.png' });
    
    const mockEmpresas = [
      { id: 'mock-empresa-1', razon_social: 'Ams Inversiones S.A.', cuit: '30123456789' },
      { id: 'mock-empresa-2', razon_social: 'Argento Via Publica', cuit: '30987654321' }
    ];
    setEmpresas(mockEmpresas);

    const mockEstablecimientos = [
      { id: 'mock-est-1', empresa_id: 'mock-empresa-1', denominacion: 'Planta Industrial Ramos Mejía', direccion: 'Av. de Mayo 1234, Ramos Mejía' },
      { id: 'mock-est-2', empresa_id: 'mock-empresa-1', denominacion: 'Depósito San Martín', direccion: 'Ruta 8 Km 18, San Martín' },
      { id: 'mock-est-3', empresa_id: 'mock-empresa-2', denominacion: 'Oficina Central Retiro', direccion: 'Av. Libertador 450, CABA' }
    ];
    setAllEstablecimientos(mockEstablecimientos);

    const mockMiembros = [
      { id: 'mock-miembro-1', full_name: 'Lic. Carlos Gomez', signature_url: 'mock-firma-carlos' },
      { id: 'mock-miembro-2', full_name: 'Ing. Ana Alvarez', signature_url: 'mock-firma-ana' }
    ];
    setMiembrosList(mockMiembros);

    const mockTemplates = [
      {
        id: 'mock-template-1',
        nombre: 'Inspección General de EPP',
        config_campos: { razon_social: true, establecimiento: true, direccion: true, cuit: true, fecha: true },
        items: [
          { id: '1', pregunta: '¿El personal posee calzado de seguridad en buen estado?', tipo_respuesta: 'botones', opciones_botones: ['Ok', 'No Ok', 'N/A'], con_otro: true },
          { id: '2', pregunta: '¿Uso de arnés en trabajos en altura superior a 2 metros?', tipo_respuesta: 'botones', opciones_botones: ['Si', 'No', 'N/A'], con_otro: false },
          { id: '3', pregunta: 'Observaciones sobre el uso de EPP', tipo_respuesta: 'texto' }
        ],
        bloque_imagenes: true,
        bloque_firmas: { responsable_establecimiento: true, responsable_higiene_seguridad: true }
      },
      {
        id: 'mock-template-2',
        nombre: 'Control de Orden y Limpieza 5S',
        config_campos: { razon_social: true, establecimiento: true, direccion: false, cuit: false, fecha: true },
        items: [
          { id: '1', pregunta: '¿Pasillos y salidas de emergencia se encuentran obstruidos?', tipo_respuesta: 'botones', opciones_botones: ['Si', 'No'], con_otro: false },
          { id: '2', pregunta: '¿Herramientas limpias y ordenadas en sus tableros?', tipo_respuesta: 'botones', opciones_botones: ['Ok', 'No Ok'], con_otro: true }
        ],
        bloque_imagenes: false,
        bloque_firmas: { responsable_establecimiento: false, responsable_higiene_seguridad: true }
      }
    ];
    setTemplates(mockTemplates);

    const mockInspecciones = [
      {
        id: 'mock-ins-1',
        tenant_id: 'mock-tenant-1',
        template_id: 'mock-template-1',
        empresa_id: 'mock-empresa-1',
        establecimiento_id: 'mock-est-1',
        fecha: '2026-07-01',
        respuestas: [
          { pregunta_id: '1', pregunta: '¿El personal posee calzado de seguridad en buen estado?', respuesta: 'Ok', detalle_otro: '' },
          { pregunta_id: '2', pregunta: '¿Uso de arnés en trabajos en altura superior a 2 metros?', respuesta: 'N/A', detalle_otro: '' },
          { pregunta_id: '3', pregunta: 'Observaciones sobre el uso de EPP', respuesta: 'Se realiza llamado de atención a un operario por no ajustar antiparras.', detalle_otro: '' }
        ],
        adjuntar_registros_urls: [],
        firma_responsable_establecimiento: 'mock-signature-resp',
        responsable_establecimiento_aclaracion: 'Roberto Sanchez',
        firma_responsable_higiene_seguridad: 'mock-signature-hs',
        responsable_higiene_seguridad_nombre: 'Lic. Carlos Gomez',
        responsable_higiene_seguridad_id: 'mock-miembro-1',
        firma_tipo: 'perfil',
        observaciones: 'Todo correcto, se corrigen desvíos en el momento.',
        created_at: new Date().toISOString()
      }
    ];
    setInspecciones(mockInspecciones);
    setLoading(false);
  };

  // Cargar datos reales desde Supabase
  const loadRealData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = '/login';
        return;
      }

      // Perfil
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

      // Tenant
      const { data: ten, error: tErr } = await supabase
        .from('tenants')
        .select('*')
        .eq('slug', tenantSlug)
        .single();
      if (tErr) throw tErr;
      setTenant(ten);

      // Empresas / Clientes
      const { data: empData, error: empErr } = await supabase
        .from('empresas')
        .select('id, razon_social, cuit')
        .order('razon_social');
      if (empErr) throw empErr;
      setEmpresas(empData);

      // Establecimientos
      const { data: estData, error: estErr } = await supabase
        .from('establecimientos')
        .select('id, empresa_id, denominacion, direccion');
      if (estErr) throw estErr;
      setAllEstablecimientos(estData);

      // Miembros Equipo (corregido a signature_url, profile_id)
      const { data: miembData, error: miembErr } = await supabase
        .from('miembros_equipo')
        .select('id, full_name, signature_url, profile_id')
        .order('full_name');
      if (miembErr) throw miembErr;
      setMiembrosList(miembData || []);

      // Plantillas (Templates)
      const { data: templData, error: templErr } = await supabase
        .from('checklist_templates')
        .select('*')
        .order('nombre');
      if (templErr) throw templErr;
      setTemplates(templData || []);

      // Inspecciones
      const { data: inspData, error: inspErr } = await supabase
        .from('checklist_inspecciones')
        .select('*')
        .order('fecha', { ascending: false });
      if (inspErr) throw inspErr;
      setInspecciones(inspData || []);

    } catch (e) {
      console.error('Error cargando datos de Supabase:', e);
      triggerToast('Error al conectar con la base de datos, usando simulación.', 'error');
      setIsDevMode(true);
      loadMockData();
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // LOGICA CRUD - PLANTILLAS
  // ==========================================

  const handleOpenNewTemplate = () => {
    setEditingTemplateId(null);
    setTemplateNombre('');
    setConfigCampos({ razon_social: true, establecimiento: true, direccion: true, cuit: true, fecha: true });
    setTemplateItems([]);
    setBloqueImagenes(false);
    setBloqueFirmas({ responsable_establecimiento: false, responsable_higiene_seguridad: false });
    setIsTemplateFormOpen(true);
  };

  const handleOpenEditTemplate = (tmpl) => {
    setEditingTemplateId(tmpl.id);
    setTemplateNombre(tmpl.nombre);
    setConfigCampos(tmpl.config_campos);
    setTemplateItems(tmpl.items);
    setBloqueImagenes(tmpl.bloque_imagenes);
    setBloqueFirmas(tmpl.bloque_firmas);
    setIsTemplateFormOpen(true);
  };

  const handleAddTemplateItem = () => {
    const newItem = {
      id: String(Date.now()),
      pregunta: '',
      tipo_respuesta: 'botones',
      opciones_botones: ['Ok', 'No Ok', 'N/A'],
      con_otro: false
    };
    setTemplateItems([...templateItems, newItem]);
  };

  const handleRemoveTemplateItem = (id) => {
    setTemplateItems(templateItems.filter(item => item.id !== id));
  };

  const handleUpdateTemplateItem = (id, fields) => {
    setTemplateItems(templateItems.map(item => {
      if (item.id === id) {
        const updated = { ...item, ...fields };
        if (fields.tipo_respuesta === 'texto') {
          updated.opciones_botones = [];
          updated.con_otro = false;
        } else if (fields.tipo_respuesta === 'botones' && !updated.opciones_botones?.length) {
          updated.opciones_botones = ['Ok', 'No Ok', 'N/A'];
        }
        return updated;
      }
      return item;
    }));
  };

  const handleToggleOpcionBoton = (itemId, opt) => {
    setTemplateItems(templateItems.map(item => {
      if (item.id === itemId) {
        let opts = [...(item.opciones_botones || [])];
        if (opts.includes(opt)) {
          opts = opts.filter(o => o !== opt);
        } else {
          opts.push(opt);
        }
        return { ...item, opciones_botones: opts };
      }
      return item;
    }));
  };

  const handleSaveTemplate = async (e) => {
    e.preventDefault();
    if (!templateNombre.trim()) {
      triggerToast('El nombre de la plantilla es obligatorio.', 'error');
      return;
    }
    if (templateItems.length === 0) {
      triggerToast('Debe incorporar al menos un ítem a evaluar.', 'error');
      return;
    }
    if (templateItems.some(item => !item.pregunta.trim())) {
      triggerToast('Todos los ítems deben tener una pregunta definida.', 'error');
      return;
    }

    setSaveLoading(true);

    const payload = {
      nombre: templateNombre.trim(),
      config_campos: configCampos,
      items: templateItems,
      bloque_imagenes: bloqueImagenes,
      bloque_firmas: bloqueFirmas,
      tenant_id: tenant?.id || 'mock-tenant-1',
      created_by: profile?.id || null,
      updated_at: new Date().toISOString()
    };

    if (isDevMode) {
      if (editingTemplateId) {
        setTemplates(templates.map(t => t.id === editingTemplateId ? { ...t, ...payload } : t));
        triggerToast('Plantilla modificada exitosamente.');
      } else {
        const newT = { ...payload, id: 'mock-template-' + Date.now(), created_at: new Date().toISOString() };
        setTemplates([...templates, newT]);
        triggerToast('Plantilla creada exitosamente.');
      }
      setIsTemplateFormOpen(false);
      setSaveLoading(false);
      return;
    }

    try {
      if (editingTemplateId) {
        const { error } = await supabase
          .from('checklist_templates')
          .update(payload)
          .eq('id', editingTemplateId);
        if (error) throw error;
        triggerToast('Plantilla modificada exitosamente.');
      } else {
        const { error } = await supabase
          .from('checklist_templates')
          .insert([payload]);
        if (error) throw error;
        triggerToast('Plantilla creada exitosamente.');
      }

      const { data: templData } = await supabase
        .from('checklist_templates')
        .select('*')
        .order('nombre');
      setTemplates(templData || []);
      setIsTemplateFormOpen(false);
    } catch (err) {
      console.error('Error al guardar plantilla:', err);
      triggerToast('Error al guardar la plantilla.', 'error');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDeleteTemplate = async (id, name) => {
    setModalAlert({
      show: true,
      title: 'Eliminar Plantilla',
      message: `¿Está seguro de que desea eliminar la plantilla "${name}"? Esto no eliminará las inspecciones realizadas previamente.`,
      onConfirm: async () => {
        closeAlert();
        if (isDevMode) {
          setTemplates(templates.filter(t => t.id !== id));
          triggerToast('Plantilla eliminada exitosamente.');
          return;
        }
        try {
          const { error } = await supabase
            .from('checklist_templates')
            .delete()
            .eq('id', id);
          if (error) throw error;
          triggerToast('Plantilla eliminada exitosamente.');
          setTemplates(templates.filter(t => t.id !== id));
        } catch (e) {
          console.error(e);
          triggerToast('Error al eliminar plantilla.', 'error');
        }
      }
    });
  };

  // ==========================================
  // LOGICA CRUD - INSPECCIONES
  // ==========================================

  const handleOpenNewInspeccion = () => {
    if (templates.length === 0) {
      triggerToast('Debe crear al menos una plantilla para poder realizar inspecciones.', 'warning');
      return;
    }
    setEditingInspeccionId(null);
    setSelectedTemplateId(templates[0].id);
    setInspeccionEmpresaId(empresas[0]?.id || '');
    setInspeccionEstablecimientoId('');
    
    // Inicializar fecha formateada a DD/MM/YYYY
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    setInspeccionFecha(`${day}/${month}/${year}`);

    setFotosFiles([]);
    setFirmaRespSavedUrl('');
    setFirmaProfSavedUrl('');
    setFirmaTipo('perfil');
    setProfesionalTipo('miembro');
    setProfesionalId(profile?.role !== 'cliente' ? (miembrosList.find(m => m.full_name === profile?.full_name)?.id || '') : '');
    setProfesionalNombre(profile?.role !== 'cliente' ? (profile?.full_name || '') : '');
    setSignaturePath('');
    setResponsableAclaracion('');
    setInspeccionObservaciones('');
    setHasSignedResp(false);
    setHasSignedProf(false);
    setIsInspeccionReadOnly(false);

    initRespuestas(templates[0]);
    setIsInspeccionFormOpen(true);
  };

  const initRespuestas = (tmpl) => {
    if (!tmpl) return;
    const initialResp = tmpl.items.map(item => ({
      pregunta_id: item.id,
      pregunta: item.pregunta,
      respuesta: '',
      detalle_otro: ''
    }));
    setInspeccionRespuestas(initialResp);
  };

  const handleSelectTemplate = (id) => {
    setSelectedTemplateId(id);
    const tmpl = templates.find(t => t.id === id);
    initRespuestas(tmpl);
  };

  const handleUpdateInspeccionRespuesta = (preguntaId, val, detail = '') => {
    setInspeccionRespuestas(inspeccionRespuestas.map(r => {
      if (r.pregunta_id === preguntaId) {
        return { ...r, respuesta: val, ...(detail !== undefined ? { detalle_otro: detail } : {}) };
      }
      return r;
    }));
  };

  const handleOpenEditInspeccion = async (insp, readOnly = false) => {
    setEditingInspeccionId(insp.id);
    setSelectedTemplateId(insp.template_id);
    setInspeccionEmpresaId(insp.empresa_id || '');
    setInspeccionEstablecimientoId(insp.establecimiento_id || '');
    
    // Formatear fecha YYYY-MM-DD a DD/MM/YYYY
    setInspeccionFecha(formatDate(insp.fecha));
    
    setInspeccionRespuestas(insp.respuestas || []);
    setFirmaRespSavedUrl(insp.firma_responsable_establecimiento || '');
    setFirmaProfSavedUrl(insp.firma_responsable_higiene_seguridad || '');
    setFirmaTipo(insp.firma_tipo || 'perfil');
    setProfesionalTipo(insp.responsable_higiene_seguridad_id ? 'miembro' : 'manual');
    setProfesionalId(insp.responsable_higiene_seguridad_id || '');
    setProfesionalNombre(insp.responsable_higiene_seguridad_nombre || '');
    setResponsableAclaracion(insp.responsable_establecimiento_aclaracion || '');
    setInspeccionObservaciones(insp.observaciones || '');
    setIsInspeccionReadOnly(readOnly);
    setHasSignedResp(!!insp.firma_responsable_establecimiento);
    setHasSignedProf(!!insp.firma_responsable_higiene_seguridad);

    // Cargar fotos existentes
    if (insp.adjuntar_registros_urls && insp.adjuntar_registros_urls.length > 0) {
      const fList = [];
      for (const path of insp.adjuntar_registros_urls) {
        if (isDevMode || path.startsWith('http')) {
          fList.push({ name: 'Foto', preview: path, saved: true, path });
        } else {
          try {
            const { data } = await supabase.storage.from('documents').createSignedUrl(path, 3600);
            if (data?.signedUrl) {
              fList.push({ name: 'Foto', preview: data.signedUrl, saved: true, path });
            }
          } catch (e) {
            console.error('Error resolviendo signedUrl para foto:', e);
          }
        }
      }
      setFotosFiles(fList);
    } else {
      setFotosFiles([]);
    }

    // Resolver firma del perfil
    if (insp.responsable_higiene_seguridad_id) {
      const memb = miembrosList.find(m => m.id === insp.responsable_higiene_seguridad_id);
      if (memb?.signature_url) {
        setSignaturePath(memb.signature_url);
      }
    }

    setIsInspeccionFormOpen(true);
  };

  // Manejar firmas en canvas
  const handleExitForm = () => {
    setIsInspeccionFormOpen(false);
    setIsTemplateFormOpen(false);
  };

  const handleClearCanvas = (type) => {
    if (type === 'resp') {
      const canvas = firmaRespCanvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      setHasSignedResp(false);
      setFirmaRespSavedUrl('');
    } else {
      const canvas = firmaProfCanvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      setHasSignedProf(false);
      setFirmaProfSavedUrl('');
    }
  };

  const initCanvasDraw = (canvas, setHasSigned) => {
    if (!canvas) return;
    let drawing = false;
    const ctx = canvas.getContext('2d');
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#000000';

    const getPos = (e) => {
      const rect = canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return {
        x: clientX - rect.left,
        y: clientY - rect.top
      };
    };

    const startDraw = (e) => {
      e.preventDefault();
      drawing = true;
      const pos = getPos(e);
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    };

    const draw = (e) => {
      if (!drawing) return;
      e.preventDefault();
      const pos = getPos(e);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      setHasSigned(true);
    };

    const stopDraw = () => {
      drawing = false;
    };

    canvas.addEventListener('mousedown', startDraw);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDraw);
    canvas.addEventListener('mouseleave', stopDraw);

    canvas.addEventListener('touchstart', startDraw);
    canvas.addEventListener('touchmove', draw);
    canvas.addEventListener('touchend', stopDraw);
  };

  const refRespCallback = useCallback((node) => {
    if (node) {
      firmaRespCanvasRef.current = node;
      initCanvasDraw(node, setHasSignedResp);
    }
  }, [isInspeccionFormOpen]);

  const refProfCallback = useCallback((node) => {
    if (node) {
      firmaProfCanvasRef.current = node;
      initCanvasDraw(node, setHasSignedProf);
    }
  }, [isInspeccionFormOpen, firmaTipo]);

  const handleSaveInspeccion = async () => {
    const tmpl = templates.find(t => t.id === selectedTemplateId);
    if (!tmpl) return;

    if (tmpl.config_campos.razon_social && !inspeccionEmpresaId) {
      triggerToast('Debe seleccionar la razón social del cliente.', 'error');
      return;
    }
    if (tmpl.config_campos.establecimiento && !inspeccionEstablecimientoId) {
      triggerToast('Debe seleccionar el establecimiento.', 'error');
      return;
    }
    if (tmpl.config_campos.fecha && !inspeccionFecha) {
      triggerToast('Debe ingresar la fecha.', 'error');
      return;
    }

    if (inspeccionRespuestas.some(r => r.respuesta === '')) {
      triggerToast('Por favor, responda todas las preguntas antes de guardar.', 'error');
      return;
    }

    setSaveLoading(true);

    try {
      // 1. Guardar firmas
      let respSigData = firmaRespSavedUrl;
      if (tmpl.bloque_firmas.responsable_establecimiento && firmaRespCanvasRef.current && hasSignedResp && !firmaRespSavedUrl.startsWith('data:image')) {
        respSigData = firmaRespCanvasRef.current.toDataURL('image/png');
      }

      let profSigData = firmaProfSavedUrl;
      if (tmpl.bloque_firmas.responsable_higiene_seguridad) {
        if (firmaTipo === 'perfil') {
          profSigData = signaturePath;
        } else if (firmaProfCanvasRef.current && hasSignedProf && !firmaProfSavedUrl.startsWith('data:image')) {
          profSigData = firmaProfCanvasRef.current.toDataURL('image/png');
        }
      }

      // 2. Subir fotos
      const uploadedUrls = [];
      for (const file of fotosFiles) {
        if (file.saved) {
          uploadedUrls.push(file.path);
        } else {
          if (isDevMode) {
            uploadedUrls.push(file.preview);
          } else {
            const fileName = `inspeccion_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
            const relativePath = `${tenantSlug}/checklist/${fileName}`;
            
            const resBlob = await fetch(file.preview);
            const blobObj = await resBlob.blob();

            const { error: uploadErr } = await supabase.storage
              .from('documents')
              .upload(relativePath, blobObj, { contentType: 'image/jpeg' });
            
            if (uploadErr) throw uploadErr;
            uploadedUrls.push(relativePath);
          }
        }
      }

      const payload = {
        tenant_id: tenant?.id || 'mock-tenant-1',
        template_id: selectedTemplateId,
        empresa_id: tmpl.config_campos.razon_social ? inspeccionEmpresaId : null,
        establecimiento_id: tmpl.config_campos.establecimiento ? inspeccionEstablecimientoId : null,
        fecha: tmpl.config_campos.fecha ? convertToDbDate(inspeccionFecha) : new Date().toISOString().split('T')[0],
        respuestas: inspeccionRespuestas,
        adjuntar_registros_urls: uploadedUrls,
        firma_responsable_establecimiento: respSigData,
        responsable_establecimiento_aclaracion: tmpl.bloque_firmas.responsable_establecimiento ? responsableAclaracion : '',
        firma_responsable_higiene_seguridad: profSigData,
        responsable_higiene_seguridad_nombre: tmpl.bloque_firmas.responsable_higiene_seguridad ? profesionalNombre : '',
        responsable_higiene_seguridad_id: tmpl.bloque_firmas.responsable_higiene_seguridad && profesionalTipo === 'miembro' ? profesionalId : null,
        firma_tipo: firmaTipo,
        observaciones: inspeccionObservaciones,
        created_by: profile?.id || null,
        updated_at: new Date().toISOString()
      };

      if (isDevMode) {
        if (editingInspeccionId) {
          setInspecciones(inspecciones.map(i => i.id === editingInspeccionId ? { ...i, ...payload } : i));
          triggerToast('Inspección modificada exitosamente.');
        } else {
          const newI = { ...payload, id: 'mock-ins-' + Date.now(), created_at: new Date().toISOString() };
          setInspecciones([newI, ...inspecciones]);
          triggerToast('Inspección guardada exitosamente.');
        }
        setIsInspeccionFormOpen(false);
      } else {
        if (editingInspeccionId) {
          const { error } = await supabase
            .from('checklist_inspecciones')
            .update(payload)
            .eq('id', editingInspeccionId);
          if (error) throw error;
          triggerToast('Inspección modificada exitosamente.');
        } else {
          const { error } = await supabase
            .from('checklist_inspecciones')
            .insert([payload]);
          if (error) throw error;
          triggerToast('Inspección guardada exitosamente.');
        }

        const { data: inspData } = await supabase
          .from('checklist_inspecciones')
          .select('*')
          .order('fecha', { ascending: false });
        setInspecciones(inspData || []);
        setIsInspeccionFormOpen(false);
      }

    } catch (e) {
      console.error(e);
      triggerToast('Error al guardar la inspección.', 'error');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDeleteInspeccion = (id) => {
    setModalAlert({
      show: true,
      title: 'Eliminar Inspección',
      message: '¿Está seguro de que desea eliminar permanentemente este registro de inspección?',
      onConfirm: async () => {
        closeAlert();
        if (isDevMode) {
          setInspecciones(inspecciones.filter(i => i.id !== id));
          triggerToast('Inspección eliminada exitosamente.');
          return;
        }
        try {
          const { error } = await supabase
            .from('checklist_inspecciones')
            .delete()
            .eq('id', id);
          if (error) throw error;
          triggerToast('Inspección eliminada exitosamente.');
          setInspecciones(inspecciones.filter(i => i.id !== id));
        } catch (e) {
          console.error(e);
          triggerToast('Error al eliminar registro.', 'error');
        }
      }
    });
  };

  const handleProfesionalChange = (memberId) => {
    setProfesionalId(memberId);
    const m = miembrosList.find(memb => memb.id === memberId);
    if (m) {
      setProfesionalNombre(m.full_name);
      setSignaturePath(m.signature_url || '');
    } else {
      setProfesionalNombre('');
      setSignaturePath('');
    }
  };

  // ==========================================
  // EXPORTACION A PDF
  // ==========================================

  const handleExportPdfReport = async (c, shouldPrint = false, shouldDownload = true) => {
    try {
      triggerToast('Generando reporte PDF...', 'info');

      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'pt',
        format: 'a4',
        compress: true
      });

      const tmpl = templates.find(t => t.id === c.template_id);
      const emp = empresas.find(e => e.id === c.empresa_id);
      const est = allEstablecimientos.find(e => e.id === c.establecimiento_id);

      // Cargar firmas
      let fProfBase64 = '';
      if (tmpl.bloque_firmas.responsable_higiene_seguridad && c.firma_responsable_higiene_seguridad) {
        const url = await getFirmaUrl(c.firma_responsable_higiene_seguridad, c.firma_tipo);
        fProfBase64 = await getBase64ImageFromUrl(url);
      }
      if (fProfBase64) fProfBase64 = await resizeImageForPdf(fProfBase64, 240, 120);

      let fRespBase64 = '';
      if (tmpl.bloque_firmas.responsable_establecimiento && c.firma_responsable_establecimiento) {
        const url = await getFirmaUrl(c.firma_responsable_establecimiento, 'mano');
        fRespBase64 = await getBase64ImageFromUrl(url);
      }
      if (fRespBase64) fRespBase64 = await resizeImageForPdf(fRespBase64, 240, 120);

      // Cargar logo
      let logoBase64 = '';
      try {
        if (tenant && tenant.logo_1_url) {
          logoBase64 = await getBase64ImageFromUrl(tenant.logo_1_url);
        }
      } catch (e) {
        console.error('Error cargando logo del Tenant:', e);
      }
      if (!logoBase64) {
        logoBase64 = await getBase64ImageFromUrl('/brand/logo-primary.png');
      }
      if (logoBase64) {
        logoBase64 = await resizeImageForPdf(logoBase64, 300, 300);
      }

      let logoWidth = 142.5;
      let logoHeight = 55;
      if (logoBase64) {
        try {
          const dims = await getImgDimensions(logoBase64);
          const ratio = dims.width / dims.height;
          const maxW = 142.5;
          const maxH = 55;
          if (ratio > maxW / maxH) {
            logoWidth = maxW;
            logoHeight = maxW / ratio;
          } else {
            logoHeight = maxH;
            logoWidth = maxH * ratio;
          }
        } catch (e) {
          console.error(e);
        }
      }

      const drawHeaderLogo = (d) => {
        if (logoBase64) {
          d.addImage(logoBase64, 'PNG', 36, 15.65 + (55 - logoHeight)/2, logoWidth, logoHeight);
        }
      };

      // --- PÁGINA 1 ---
      drawHeaderLogo(doc);

      // Título
      doc.setFillColor(60, 120, 216); // #3C78D8
      doc.rect(36, 75.2, 522.75, 18, 'F');
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(1);
      doc.rect(36, 75.2, 522.75, 18, 'S');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(255, 255, 255);
      doc.text((tmpl?.nombre || 'CHECKLIST').toUpperCase(), 297.37, 88, { align: 'center' });

      // Tabla de Datos Generales
      const generalFields = [];
      if (tmpl?.config_campos?.razon_social) generalFields.push({ label: 'Razón Social', val: emp?.razon_social || 'N/A' });
      if (tmpl?.config_campos?.cuit) generalFields.push({ label: 'C.U.I.T.', val: emp?.cuit || 'N/A' });
      if (tmpl?.config_campos?.establecimiento) generalFields.push({ label: 'Establecimiento', val: est?.denominacion || 'N/A' });
      if (tmpl?.config_campos?.direccion) generalFields.push({ label: 'Dirección', val: est?.direccion || 'N/A' });
      if (tmpl?.config_campos?.fecha) generalFields.push({ label: 'Fecha', val: formatDate(c.fecha) });

      if (generalFields.length > 0) {
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(1);
        
        let startY = 105;
        let rowH = 18;
        
        for (let i = 0; i < generalFields.length; i += 2) {
          const f1 = generalFields[i];
          const f2 = generalFields[i+1];

          doc.rect(36, startY, 523, rowH, 'S');
          doc.line(397.5, startY, 397.5, startY + rowH);

          // Col 1
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(10);
          doc.setTextColor(0, 0, 0);
          doc.text(`${f1.label}:`, 42, startY + 12);
          doc.setFont('helvetica', 'normal');
          doc.text(f1.val, 130, startY + 12);

          // Col 2
          if (f2) {
            doc.setFont('helvetica', 'bold');
            doc.text(`${f2.label}:`, 402, startY + 12);
            doc.setFont('helvetica', 'normal');
            doc.text(f2.val, 490, startY + 12);
          }
          startY += rowH;
        }
      }

      // Tabla de Respuestas
      const tableHeaders = [['N°', 'Ítem a Verificar', 'Respuesta']];
      const tableRows = c.respuestas.map((r, idx) => {
        let respText = r.respuesta;
        if (r.detalle_otro) {
          respText += ` (Otro: ${r.detalle_otro})`;
        }
        return [idx + 1, r.pregunta, respText];
      });

      let tableStartY = generalFields.length > 0 ? 110 + (Math.ceil(generalFields.length / 2) * 18) : 105;

      autoTable(doc, {
        startY: tableStartY,
        head: tableHeaders,
        body: tableRows,
        margin: { left: 36, right: 36 },
        styles: {
          fontSize: 9,
          cellPadding: 6,
          lineColor: [0, 0, 0],
          lineWidth: 0.5
        },
        headStyles: {
          fillColor: [60, 120, 216],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'center'
        },
        columnStyles: {
          0: { width: 30, halign: 'center' },
          2: { width: 140 }
        }
      });

      let finalY = doc.lastAutoTable.finalY + 15;

      // Observaciones
      if (c.observaciones) {
        if (finalY > 680) {
          doc.addPage();
          drawHeaderLogo(doc);
          finalY = 85;
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        doc.text('OBSERVACIONES / RECOMENDACIONES:', 36, finalY);
        finalY += 12;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        const obsLines = doc.splitTextToSize(c.observaciones, 520);
        
        doc.rect(36, finalY, 523, Math.max(50, obsLines.length * 12 + 10));
        doc.text(obsLines, 42, finalY + 12);
        finalY += Math.max(50, obsLines.length * 12 + 10) + 20;
      }

      // Firmas
      if (tmpl?.bloque_firmas?.responsable_establecimiento || tmpl?.bloque_firmas?.responsable_higiene_seguridad) {
        if (finalY > 650) {
          doc.addPage();
          drawHeaderLogo(doc);
          finalY = 85;
        }

        const blockY = finalY;

        if (tmpl?.bloque_firmas?.responsable_establecimiento) {
          doc.setLineWidth(0.5);
          doc.setDrawColor(150, 150, 150);
          doc.line(36, blockY + 70, 260, blockY + 70);

          if (fRespBase64) {
            try {
              doc.addImage(fRespBase64, 'PNG', 70, blockY, 120, 60);
            } catch (err) {
              console.error(err);
            }
          }

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          doc.setTextColor(0, 0, 0);
          doc.text('Firma Responsable del Establecimiento', 36, blockY + 80);
          
          doc.setFont('helvetica', 'normal');
          doc.text(`Aclaración: ${c.responsable_establecimiento_aclaracion || 'N/A'}`, 36, blockY + 90);
        }

        if (tmpl?.bloque_firmas?.responsable_higiene_seguridad) {
          doc.setLineWidth(0.5);
          doc.setDrawColor(150, 150, 150);
          doc.line(330, blockY + 70, 554, blockY + 70);

          if (fProfBase64) {
            try {
              doc.addImage(fProfBase64, 'PNG', 360, blockY, 120, 60);
            } catch (err) {
              console.error(err);
            }
          }

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          doc.setTextColor(0, 0, 0);
          doc.text('Firma Responsable Higiene y Seguridad', 330, blockY + 80);
          
          doc.setFont('helvetica', 'normal');
          doc.text(`Nombre: ${c.responsable_higiene_seguridad_nombre || 'N/A'}`, 330, blockY + 90);
        }
      }

      // Anexo Fotográfico
      if (tmpl?.bloque_imagenes && c.adjuntar_registros_urls && c.adjuntar_registros_urls.length > 0) {
        const fotosB64 = [];
        for (const path of c.adjuntar_registros_urls) {
          try {
            let signedUrl = path;
            if (!isDevMode && !path.startsWith('http')) {
              const { data } = await supabase.storage.from('documents').createSignedUrl(path, 360);
              if (data) signedUrl = data.signedUrl;
            }
            const b64 = await getBase64ImageFromUrl(signedUrl || '/brand/logo-primary.png');
            if (b64) {
              const resized = await resizeImageForPdf(b64, 400, 300);
              fotosB64.push(resized);
            }
          } catch (err) {
            console.error(err);
          }
        }

        if (fotosB64.length > 0) {
          doc.addPage();
          drawHeaderLogo(doc);

          doc.setFillColor(60, 120, 216);
          doc.rect(36, 75.2, 522.75, 18, 'F');
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(12);
          doc.setTextColor(255, 255, 255);
          doc.text('ANEXO FOTOGRÁFICO', 297.37, 88, { align: 'center' });

          let imgY = 110;
          for (let idx = 0; idx < fotosB64.length; idx++) {
            if (imgY > 580) {
              doc.addPage();
              drawHeaderLogo(doc);
              imgY = 85;
            }

            try {
              doc.addImage(fotosB64[idx], 'JPEG', 98, imgY, 400, 220);
              doc.rect(98, imgY, 400, 220, 'S');
            } catch (errImg) {
              console.error(errImg);
            }
            
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.setTextColor(0, 0, 0);
            doc.text(`Registro Fotográfico N° ${idx + 1}`, 98, imgY + 232);
            imgY += 255;
          }
        }
      }

      // Footer
      const totalPages = doc.internal.getNumberOfPages();
      const companyConsultName = tenant?.name || 'Gestión SySO';
      
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setDrawColor(217, 217, 217);
        doc.setLineWidth(0.5);
        doc.line(36, 815, 559, 815);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text(companyConsultName, 36, 825);
        doc.text(`Página ${i} de ${totalPages}`, 559, 825, { align: 'right' });
      }

      if (shouldDownload) {
        doc.save(`Checklist_${(tmpl?.nombre || 'Personalizado').replace(/\s+/g, '_')}_${formatDate(c.fecha)}.pdf`);
        triggerToast('PDF descargado exitosamente.');
      }

      if (shouldPrint) {
        window.open(doc.output('bloburl'), '_blank');
        triggerToast('Vista previa abierta.');
      }

      return doc;

    } catch (e) {
      console.error(e);
      triggerToast('Error al generar el reporte PDF.', 'error');
    }
  };

  // ==========================================
  // LOGICA CORREO ELECTRONICO
  // ==========================================

  const handleOpenEmailModal = (insp) => {
    setMailTargetInspeccion(insp);
    setManualEmail('');
    setMailLoading(false);

    const emp = empresas.find(e => e.id === insp.empresa_id);
    if (emp && emp.id) {
      const loadEmails = async () => {
        if (isDevMode) {
          setAvailableEmails(['ejemplo@cliente.com', 'admin@cliente.com']);
        } else {
          try {
            const { data } = await supabase
              .from('empresas')
              .select('contactos_correos')
              .eq('id', emp.id)
              .single();
            if (data?.contactos_correos) {
              const emails = Array.isArray(data.contactos_correos)
                ? data.contactos_correos
                : typeof data.contactos_correos === 'string'
                ? data.contactos_correos.split(',')
                : [];
              setAvailableEmails(emails.map(e => (typeof e === 'object' && e?.email) ? e.email : String(e)).filter(Boolean));
            } else {
              setAvailableEmails([]);
            }
          } catch (err) {
            console.error(err);
            setAvailableEmails([]);
          }
        }
      };
      loadEmails();
    } else {
      setAvailableEmails([]);
    }

    setIsMailModalOpen(true);
  };

  const handleSendEmail = async (selectedEmails) => {
    if (selectedEmails.length === 0) {
      triggerToast('Debe especificar al menos un destinatario.', 'error');
      return;
    }

    setMailLoading(true);

    try {
      const docObj = await handleExportPdfReport(mailTargetInspeccion, false, false);
      if (!docObj) throw new Error('No se pudo compilar el PDF');

      const tmpl = templates.find(t => t.id === mailTargetInspeccion.template_id);
      const emp = empresas.find(e => e.id === mailTargetInspeccion.empresa_id);
      const est = allEstablecimientos.find(e => e.id === mailTargetInspeccion.establecimiento_id);

      const pdfBlob = docObj.output('blob');
      const filename = `inspeccion_${mailTargetInspeccion.id}.pdf`;
      const relativePath = `${tenantSlug}/pdf_enviados/${filename}`;

      if (!isDevMode) {
        const { error: uploadErr } = await supabase.storage
          .from('documents')
          .upload(relativePath, pdfBlob, { contentType: 'application/pdf', upsert: true });
        if (uploadErr) throw uploadErr;
      }

      const mailBody = {
        emails: selectedEmails,
        filePath: relativePath,
        companyName: emp?.razon_social || 'Cliente',
        establishmentName: est?.denominacion || 'N/A',
        date: formatDate(mailTargetInspeccion.fecha),
        inspectorName: mailTargetInspeccion.responsable_higiene_seguridad_nombre || 'Profesional SySO',
        tenantName: tenant?.name || 'Gestión SySO',
        documentType: 'checklist_personalizado',
        checklistName: tmpl?.nombre || 'Checklist'
      };

      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mailBody)
      });

      const resJson = await res.json();
      if (!res.ok) throw new Error(resJson.error || 'Error al despachar correo');

      triggerToast(resJson.message || 'Correo electrónico enviado exitosamente.');
      setIsMailModalOpen(false);

    } catch (e) {
      console.error(e);
      triggerToast(e.message || 'Error al enviar por correo.', 'error');
    } finally {
      setMailLoading(false);
    }
  };

  // ==========================================
  // FILTRADO Y ORDENAMIENTO
  // ==========================================

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const filteredInspecciones = inspecciones.filter(insp => {
    const tmpl = templates.find(t => t.id === insp.template_id);
    const emp = empresas.find(e => e.id === insp.empresa_id);
    const est = allEstablecimientos.find(e => e.id === insp.establecimiento_id);

    const searchLower = filterText.toLowerCase();
    const matchesSearch = 
      (tmpl?.nombre || '').toLowerCase().includes(searchLower) ||
      (emp?.razon_social || '').toLowerCase().includes(searchLower) ||
      (est?.denominacion || '').toLowerCase().includes(searchLower) ||
      (insp.observaciones || '').toLowerCase().includes(searchLower);

    const matchesEmpresa = filterEmpresa ? insp.empresa_id === filterEmpresa : true;
    const matchesTemplate = filterTemplate ? insp.template_id === filterTemplate : true;

    return matchesSearch && matchesEmpresa && matchesTemplate;
  });

  const sortedInspecciones = [...filteredInspecciones].sort((a, b) => {
    let aVal = a[sortField];
    let bVal = b[sortField];

    if (sortField === 'template') {
      const tA = templates.find(t => t.id === a.template_id);
      const tB = templates.find(t => t.id === b.template_id);
      aVal = tA?.nombre || '';
      bVal = tB?.nombre || '';
    } else if (sortField === 'empresa') {
      const eA = empresas.find(e => e.id === a.empresa_id);
      const eB = empresas.find(e => e.id === b.empresa_id);
      aVal = eA?.razon_social || '';
      bVal = eB?.razon_social || '';
    }

    if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const activeTemplate = templates.find(t => t.id === selectedTemplateId);
  const selectedEmpresaObj = empresas.find(e => e.id === inspeccionEmpresaId);
  const selectedEstablecimientoObj = allEstablecimientos.find(est => est.id === inspeccionEstablecimientoId);

  const filteredEstablecimientos = allEstablecimientos.filter(
    est => est.empresa_id === inspeccionEmpresaId
  );

  const isFormOpen = isTemplateFormOpen || isInspeccionFormOpen;

  return (
    <div className="h-screen overflow-hidden bg-syso-bg text-slate-700 flex font-sans">
      <Sidebar
        tenantSlug={tenantSlug}
        profile={profile}
        currentSection="checklist-personalizados"
        isSidebarCollapsed={isSidebarCollapsed}
        toggleSidebar={toggleSidebar}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
        onNavigate={(e, path) => {
          if (typeof window !== 'undefined') window.location.href = path;
        }}
      />

      <main className="flex-grow flex flex-col min-w-0 overflow-y-auto bg-syso-bg">
        {/* HEADER */}
        <header className="h-16 border-b border-slate-200 flex items-center justify-between px-4 md:px-6 bg-white shrink-0 sticky top-0 z-20">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 -ml-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 md:hidden cursor-pointer shrink-0"
            >
              <Menu className="h-5 w-5" />
            </button>
            <Sliders className="h-5 w-5 text-[#468DFF] shrink-0" />
            <h1 className="font-outfit text-base md:text-lg font-bold text-slate-900 truncate leading-none">
              Checklist Personalizados
            </h1>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs font-semibold text-slate-500 bg-slate-50 py-1.5 px-3 rounded-xl border border-slate-150 hidden sm:inline-block">
              {tenant?.name || 'Cargando...'}
            </span>
          </div>
        </header>

        {/* TABS DE SECCION (Ocultos si el formulario está abierto para ganar espacio vertical) */}
        {!isFormOpen && (
          <div className="flex border-b border-slate-200 bg-white px-6 py-2 sticky top-16 z-10 shrink-0 gap-6 shadow-sm">
            <button
              onClick={() => setActiveTab('inspecciones')}
              className={`pb-2 text-sm font-bold border-b-2 transition-all cursor-pointer bg-transparent border-none ${
                activeTab === 'inspecciones'
                  ? 'border-[#468DFF] text-[#468DFF]'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              Inspecciones Realizadas
            </button>
            {!isReadOnlyView && (
              <button
                onClick={() => setActiveTab('plantillas')}
                className={`pb-2 text-sm font-bold border-b-2 transition-all cursor-pointer bg-transparent border-none ${
                  activeTab === 'plantillas'
                    ? 'border-[#468DFF] text-[#468DFF]'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                Plantillas / Configuración
              </button>
            )}
          </div>
        )}

        {/* CONTENIDO PRINCIPAL CON COMPACT LAYOUT */}
        {loading ? (
          <div className="flex-grow flex items-center justify-center p-8">
            <div className="text-center space-y-4">
              <Loader2 className="h-10 w-10 animate-spin text-[#468DFF] mx-auto" />
              <p className="text-xs text-slate-500 font-medium">Cargando datos...</p>
            </div>
          </div>
        ) : (
          <div className="max-w-[95%] mx-auto w-full py-6 px-4 md:px-0 flex-1 flex flex-col min-h-0">
            
            {/* TAB 1: LISTADO DE INSPECCIONES */}
            {activeTab === 'inspecciones' && !isFormOpen && (
              <>
                {/* FILTROS Y BUSQUEDA (SySO Compact Layout) */}
                <div className="bg-white border border-slate-150 rounded-2xl p-3 shadow-sm shrink-0 flex flex-col gap-1.5 mb-4">
                  <div className="flex flex-col md:flex-row md:items-center gap-2 w-full md:w-auto">
                    <div className="relative w-full md:w-64">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
                      <input
                        type="text"
                        placeholder="Buscar por plantilla, cliente, observaciones..."
                        value={filterText}
                        onChange={(e) => setFilterText(e.target.value)}
                        className="w-full pl-9 pr-3.5 py-1.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all text-slate-700 placeholder-slate-400 font-semibold"
                      />
                    </div>
                  </div>
                  
                  <div className="pt-1.5 border-t border-slate-100 space-y-2">
                    <div className="flex items-center justify-between min-h-[28px]">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setShowFilters(!showFilters)}
                          className="font-bold text-slate-400 flex items-center gap-1.5 uppercase tracking-wider text-[10px] hover:text-slate-600 transition-colors cursor-pointer bg-transparent border-none"
                        >
                          <Sliders className="h-3 w-3" />
                          Filtros de Búsqueda
                          {showFilters ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        </button>

                        {(filterText || filterEmpresa || filterTemplate) && (
                          <button
                            onClick={() => {
                              setFilterText('');
                              setFilterEmpresa('');
                              setFilterTemplate('');
                            }}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[10px] font-semibold cursor-pointer transition-all border border-slate-200"
                          >
                            Limpiar filtros
                          </button>
                        )}
                      </div>

                      {canCargar && (
                        <button
                          type="button"
                          onClick={handleOpenNewInspeccion}
                          className="px-3 py-1.5 bg-[#468DFF] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-[#0511F2] transition-all cursor-pointer shadow-lg shadow-[#468DFF]/10 shrink-0 border border-[#468DFF] hover:border-[#0511F2]"
                        >
                          <PlusCircle className="h-3.5 w-3.5" />
                          Nueva Inspección
                        </button>
                      )}
                    </div>

                    {showFilters && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 pt-1 animate-scaleUp">
                        {/* Cliente Filter */}
                        {profile && profile.role !== 'cliente' && (
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Cliente / Empresa</label>
                            <select
                              value={filterEmpresa}
                              onChange={(e) => setFilterEmpresa(e.target.value)}
                              className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-[11px] font-semibold text-slate-600 bg-white focus:outline-none focus:ring-1 focus:ring-[#468DFF] cursor-pointer"
                            >
                              <option value="">Todos los Clientes...</option>
                              {empresas.map(emp => (
                                <option key={emp.id} value={emp.id}>{emp.razon_social}</option>
                              ))}
                            </select>
                          </div>
                        )}

                        {/* Plantilla Filter */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase">Plantilla de Checklist</label>
                          <select
                            value={filterTemplate}
                            onChange={(e) => setFilterTemplate(e.target.value)}
                            className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-[11px] font-semibold text-slate-600 bg-white focus:outline-none focus:ring-1 focus:ring-[#468DFF] cursor-pointer"
                          >
                            <option value="">Todas las Plantillas...</option>
                            {templates.map(tmpl => (
                              <option key={tmpl.id} value={tmpl.id}>{tmpl.nombre}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* CONTENEDOR DE TABLA (SySO Compact Layout) */}
                <div 
                  className="bg-white border border-slate-150 rounded-2xl shadow-sm overflow-hidden flex flex-col flex-grow min-h-[300px] transition-all duration-300 ease-in-out"
                  style={{ height: showFilters ? 'calc(100vh - 330px)' : 'calc(100vh - 260px)' }}
                >
                  {sortedInspecciones.length === 0 ? (
                    <div className="flex-grow flex flex-col items-center justify-center p-8 text-center gap-3 h-full">
                      <AlertTriangle className="h-10 w-10 text-slate-300" />
                      <span className="text-sm font-bold text-slate-800">No hay inspecciones registradas</span>
                      <span className="text-xs text-slate-400">Comienza utilizando una de tus plantillas de checklist.</span>
                      {canCargar && (
                        <button
                          onClick={handleOpenNewInspeccion}
                          className="px-4 py-2 mt-2 bg-[#468DFF] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-[#0511F2] transition-all cursor-pointer shadow-md shadow-[#468DFF]/10 shrink-0"
                        >
                          + Nueva Inspección
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="overflow-auto flex-grow scrollbar-thin">
                      <table className="w-full text-left border-collapse min-w-[850px] text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-150 text-xs font-bold text-slate-400 uppercase tracking-wider select-none">
                            <th className="px-6 py-4 cursor-pointer" onClick={() => handleSort('template')}>Plantilla</th>
                            <th className="px-6 py-4 cursor-pointer" onClick={() => handleSort('empresa')}>Cliente</th>
                            <th className="px-6 py-4 cursor-pointer" onClick={() => handleSort('fecha')}>Fecha</th>
                            <th className="px-6 py-4">Responsable H&S</th>
                            <th className="px-6 py-4 text-right w-36">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                          {sortedInspecciones.map((insp) => {
                            const tmpl = templates.find(t => t.id === insp.template_id);
                            const emp = empresas.find(e => e.id === insp.empresa_id);
                            return (
                              <tr key={insp.id} className="hover:bg-slate-50/50 transition-colors cursor-pointer">
                                <td className="px-6 py-4 font-bold text-slate-800" onClick={() => handleOpenEditInspeccion(insp, true)}>
                                  {tmpl?.nombre || 'Plantilla Eliminada'}
                                </td>
                                <td className="px-6 py-4" onClick={() => handleOpenEditInspeccion(insp, true)}>
                                  {emp?.razon_social || 'N/A'}
                                </td>
                                <td className="px-6 py-4" onClick={() => handleOpenEditInspeccion(insp, true)}>
                                  {formatDate(insp.fecha)}
                                </td>
                                <td className="px-6 py-4" onClick={() => handleOpenEditInspeccion(insp, true)}>
                                  {insp.responsable_higiene_seguridad_nombre || 'N/A'}
                                </td>
                                <td className="px-6 py-4 flex items-center justify-end gap-1.5 h-full">
                                  {/* Visualizar PDF */}
                                  <button
                                    onClick={() => handleExportPdfReport(insp, true, false)}
                                    title="Ver PDF"
                                    className="p-1.5 rounded-lg bg-blue-50 text-[#468DFF] hover:bg-blue-100 hover:text-[#0511F2] transition-colors border-none cursor-pointer"
                                  >
                                    <FileText className="h-4.5 w-4.5" />
                                  </button>
                                  {/* Descargar PDF */}
                                  <button
                                    onClick={() => handleExportPdfReport(insp, false, true)}
                                    title="Descargar PDF"
                                    className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors border-none cursor-pointer"
                                  >
                                    <Download className="h-4 w-4" />
                                  </button>
                                  {/* Enviar por Correo */}
                                  {!isReadOnlyView && (
                                    <button
                                      onClick={() => handleOpenEmailModal(insp)}
                                      title="Enviar por Correo"
                                      className="p-1.5 rounded-lg bg-blue-50 text-[#468DFF] hover:bg-blue-100 hover:text-[#0511F2] transition-colors border-none cursor-pointer"
                                    >
                                      <Mail className="h-4 w-4" />
                                    </button>
                                  )}
                                  {/* Editar */}
                                  {canEditar && (
                                    <button
                                      onClick={() => handleOpenEditInspeccion(insp, false)}
                                      title="Editar"
                                      className="p-1.5 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors border-none cursor-pointer"
                                    >
                                      <Edit className="h-4 w-4" />
                                    </button>
                                  )}
                                  {/* Eliminar */}
                                  {canEliminar && (
                                    <button
                                      onClick={() => handleDeleteInspeccion(insp.id)}
                                      title="Eliminar"
                                      className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors border-none cursor-pointer"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* TAB 2: LISTADO DE PLANTILLAS */}
            {activeTab === 'plantillas' && !isFormOpen && (
              <>
                {/* ACCION SUPERIOR */}
                <div className="flex justify-end shrink-0 mb-4">
                  {canCargar && (
                    <button
                      onClick={handleOpenNewTemplate}
                      className="py-1.5 px-3 bg-[#468DFF] text-white border border-[#468DFF] hover:bg-[#0511F2] hover:border-[#0511F2] rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-lg shadow-[#468DFF]/10 transition-all active:scale-[0.98]"
                    >
                      <PlusCircle className="h-4 w-4" />
                      Nueva Plantilla
                    </button>
                  )}
                </div>

                {/* TABLA DE PLANTILLAS */}
                <div className="bg-white border border-slate-150 rounded-2xl shadow-sm overflow-hidden flex flex-col flex-grow min-h-[300px]">
                  {templates.length === 0 ? (
                    <div className="flex-grow flex flex-col items-center justify-center p-8 text-center gap-3 h-full">
                      <AlertTriangle className="h-10 w-10 text-slate-300" />
                      <span className="text-sm font-bold text-slate-800">No hay plantillas de checklist</span>
                      <span className="text-xs text-slate-400">Diseña un nuevo checklist personalizado para que tu equipo pueda usarlo.</span>
                      {canCargar && (
                        <button
                          onClick={handleOpenNewTemplate}
                          className="px-4 py-2 mt-2 bg-[#468DFF] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-[#0511F2] transition-all cursor-pointer shadow-md shadow-[#468DFF]/10 shrink-0"
                        >
                          + Nueva Plantilla
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="overflow-auto flex-grow scrollbar-thin">
                      <table className="w-full text-left border-collapse min-w-[700px] text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-150 text-xs font-bold text-slate-400 uppercase tracking-wider select-none">
                            <th className="px-6 py-4">Nombre de Plantilla</th>
                            <th className="px-6 py-4">Ítems</th>
                            <th className="px-6 py-4 text-center">Firma Resp.</th>
                            <th className="px-6 py-4 text-center">Firma H&S</th>
                            <th className="px-6 py-4 text-right w-28">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                          {templates.map((tmpl) => (
                            <tr key={tmpl.id} className="hover:bg-slate-50/50 transition-colors cursor-pointer">
                              <td className="px-6 py-4 font-bold text-slate-800" onClick={() => canEditar && handleOpenEditTemplate(tmpl)}>
                                {tmpl.nombre}
                              </td>
                              <td className="px-6 py-4" onClick={() => canEditar && handleOpenEditTemplate(tmpl)}>
                                {tmpl.items?.length || 0} ítems configurados
                              </td>
                              <td className="px-6 py-4 text-center" onClick={() => canEditar && handleOpenEditTemplate(tmpl)}>
                                {tmpl.bloque_firmas?.responsable_establecimiento ? 'Habilitado' : 'Desactivado'}
                              </td>
                              <td className="px-6 py-4 text-center" onClick={() => canEditar && handleOpenEditTemplate(tmpl)}>
                                {tmpl.bloque_firmas?.responsable_higiene_seguridad ? 'Habilitado' : 'Desactivado'}
                              </td>
                              <td className="px-6 py-4 flex items-center justify-end gap-1.5 h-full">
                                {canEditar && (
                                  <button
                                    onClick={() => handleOpenEditTemplate(tmpl)}
                                    title="Editar Plantilla"
                                    className="p-1.5 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors border-none cursor-pointer"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </button>
                                )}
                                {canEliminar && (
                                  <button
                                    onClick={() => handleDeleteTemplate(tmpl.id, tmpl.nombre)}
                                    title="Eliminar Plantilla"
                                    className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors border-none cursor-pointer"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ==========================================
                FORMULARIO: DISEÑADOR DE PLANTILLAS (LEVEL 1)
                ========================================== */}
            {activeTab === 'plantillas' && isTemplateFormOpen && (
              <div className="bg-white border border-slate-150 rounded-2xl shadow-sm overflow-hidden flex flex-col flex-grow max-h-[85vh] animate-fade-in">
                
                {/* HEADER FORM */}
                <div className="h-16 px-4 md:px-6 bg-slate-50 border-b border-slate-150 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-3">
                    <button 
                      type="button" 
                      onClick={handleExitForm}
                      className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 cursor-pointer"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </button>
                    <span className="font-outfit text-xs sm:text-sm md:text-base font-bold text-slate-900 truncate">
                      {editingTemplateId ? 'Editar Plantilla de Checklist' : 'Nueva Plantilla de Checklist'}
                    </span>
                  </div>
                  <button
                    onClick={handleExitForm}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-all border-none cursor-pointer"
                  >
                    <X className="h-4.5 w-4.5" />
                  </button>
                </div>

                {/* BODY FORM */}
                <form onSubmit={handleSaveTemplate} className="overflow-y-auto flex-grow scrollbar-thin p-5 sm:p-6 space-y-6">
                  
                  {/* Nombre de la plantilla */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-700">Nombre del Checklist <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      required
                      value={templateNombre}
                      onChange={(e) => setTemplateNombre(e.target.value)}
                      placeholder="Ej: Auditoría Diaria de EPP, Inspección 5S, etc."
                      className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs w-full md:w-1/2 focus:outline-none focus:ring-2 focus:ring-[#468DFF] transition-all"
                    />
                  </div>

                  {/* Selección de campos generales */}
                  <div className="border-t border-slate-100 pt-4">
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">1. Datos Generales de la Ficha</h3>
                    <p className="text-[10px] text-slate-400 mb-4">Selecciona los campos que el inspector completará antes de evaluar los ítems.</p>
                    
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                      {Object.keys(configCampos).map((field) => (
                        <label
                          key={field}
                          className="flex items-center gap-2 p-3 border border-slate-200 bg-slate-50/50 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-600 cursor-pointer select-none transition-all"
                        >
                          <input
                            type="checkbox"
                            checked={configCampos[field]}
                            onChange={(e) => setConfigCampos({ ...configCampos, [field]: e.target.checked })}
                            className="h-4.5 w-4.5 rounded border-slate-300 text-[#468DFF] focus:ring-[#468DFF] cursor-pointer"
                          />
                          <span className="capitalize">{field.replace('_', ' ')}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Diseño de ítems a evaluar */}
                  <div className="border-t border-slate-100 pt-4">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">2. Ítems a Evaluar</h3>
                        <p className="text-[10px] text-slate-400">Agrega las preguntas o controles a auditar en campo.</p>
                      </div>
                      <button
                        type="button"
                        onClick={handleAddTemplateItem}
                        className="py-1.5 px-3 bg-[#468DFF] hover:bg-[#0511F2] text-white border-none rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md shadow-[#468DFF]/15 transition-all"
                      >
                        <PlusCircle className="h-4 w-4" />
                        Agregar Ítem
                      </button>
                    </div>

                    <div className="space-y-3">
                      {templateItems.map((item, index) => (
                        <div
                          key={item.id}
                          className="p-4 border border-slate-200 rounded-xl bg-slate-50/50 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between"
                        >
                          <div className="flex items-center gap-3 w-full md:w-auto flex-grow min-w-0">
                            <span className="text-xs font-bold text-slate-400">{index + 1}.</span>
                            <input
                              type="text"
                              required
                              placeholder="Pregunta o item a auditar..."
                              value={item.pregunta}
                              onChange={(e) => handleUpdateTemplateItem(item.id, { pregunta: e.target.value })}
                              className="px-3 py-2 border border-slate-200 rounded-xl text-xs w-full bg-white focus:outline-none focus:ring-2 focus:ring-[#468DFF] transition-all"
                            />
                          </div>

                          <div className="flex flex-wrap items-center gap-4 w-full md:w-auto shrink-0 select-none">
                            <div className="flex flex-col gap-1">
                              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Tipo Respuesta</label>
                              <select
                                value={item.tipo_respuesta}
                                onChange={(e) => handleUpdateTemplateItem(item.id, { tipo_respuesta: e.target.value })}
                                className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#468DFF] cursor-pointer"
                              >
                                <option value="botones">Botones</option>
                                <option value="texto">Caja de Texto</option>
                              </select>
                            </div>

                            {item.tipo_respuesta === 'botones' && (
                              <div className="flex flex-col gap-1">
                                <label className="text-[9px] font-bold text-slate-400 tracking-wider uppercase">Botones a mostrar</label>
                                <div className="flex items-center gap-2 p-1.5 bg-white border border-slate-200 rounded-xl">
                                  {['Ok', 'No Ok', 'N/A', 'Si', 'No'].map((opt) => (
                                    <label key={opt} className="flex items-center gap-1 text-[11px] font-bold text-slate-600 cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={item.opciones_botones?.includes(opt)}
                                        onChange={() => handleToggleOpcionBoton(item.id, opt)}
                                        className="h-3.5 w-3.5 rounded border-slate-300 text-[#468DFF] focus:ring-[#468DFF] cursor-pointer"
                                      />
                                      <span>{opt}</span>
                                    </label>
                                  ))}
                                </div>
                              </div>
                            )}

                            {item.tipo_respuesta === 'botones' && (
                              <div className="flex flex-col gap-1">
                                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Permitir Aclaración</label>
                                <label className="flex items-center gap-1.5 py-2 px-2.5 bg-white border border-slate-200 rounded-xl text-[11px] font-bold text-slate-600 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={item.con_otro}
                                    onChange={(e) => handleUpdateTemplateItem(item.id, { con_otro: e.target.checked })}
                                    className="h-3.5 w-3.5 rounded border-slate-300 text-[#468DFF] focus:ring-[#468DFF] cursor-pointer"
                                  />
                                  <span>Añadir "Otro (especificar...)"</span>
                                </label>
                              </div>
                            )}

                            <button
                              type="button"
                              onClick={() => handleRemoveTemplateItem(item.id)}
                              className="p-2 text-red-500 hover:text-white hover:bg-red-500 border border-red-200 rounded-xl transition-all cursor-pointer bg-transparent mt-3.5 md:mt-0"
                            >
                              <Trash className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}

                      {templateItems.length === 0 && (
                        <div className="text-center py-8 border border-dashed border-slate-200 rounded-xl text-slate-400 text-xs">
                          Haga clic en "+ Agregar Ítem" para definir el cuerpo del checklist.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Configuración de bloques adicionales */}
                  <div className="border-t border-slate-100 pt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    {/* Bloque Imagenes */}
                    <div className="flex flex-col gap-1.5">
                      <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">3. Adjuntos Fotográficos</h3>
                      <label className="flex items-center gap-2.5 p-3.5 border border-slate-200 bg-slate-50/50 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-600 cursor-pointer select-none transition-all">
                        <input
                          type="checkbox"
                          checked={bloqueImagenes}
                          onChange={(e) => setBloqueImagenes(e.target.checked)}
                          className="h-4.5 w-4.5 rounded border-slate-300 text-[#468DFF] focus:ring-[#468DFF] cursor-pointer"
                        />
                        <span>Habilitar bloque para subir imágenes fotográficas (con previsualizador)</span>
                      </label>
                    </div>

                    {/* Bloque Firmas */}
                    <div className="flex flex-col gap-1.5">
                      <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">4. Bloques de Firmas</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <label className="flex items-center gap-2 p-3.5 border border-slate-200 bg-slate-50/50 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-600 cursor-pointer select-none transition-all">
                          <input
                            type="checkbox"
                            checked={bloqueFirmas.responsable_establecimiento}
                            onChange={(e) => setBloqueFirmas({ ...bloqueFirmas, responsable_establecimiento: e.target.checked })}
                            className="h-4.5 w-4.5 rounded border-slate-300 text-[#468DFF] focus:ring-[#468DFF] cursor-pointer"
                          />
                          <span>Firma del Responsable del Establecimiento</span>
                        </label>

                        <label className="flex items-center gap-2 p-3.5 border border-slate-200 bg-slate-50/50 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-600 cursor-pointer select-none transition-all">
                          <input
                            type="checkbox"
                            checked={bloqueFirmas.responsable_higiene_seguridad}
                            onChange={(e) => setBloqueFirmas({ ...bloqueFirmas, responsable_higiene_seguridad: e.target.checked })}
                            className="h-4.5 w-4.5 rounded border-slate-300 text-[#468DFF] focus:ring-[#468DFF] cursor-pointer"
                          />
                          <span>Firma del Profesional de Higiene y Seguridad</span>
                        </label>
                      </div>
                    </div>

                  </div>

                  {/* BOTONERA FOOTER FORM */}
                  <div className="border-t border-slate-200 pt-6 flex items-center justify-end gap-3 bg-white sticky bottom-0">
                    <button
                      type="button"
                      onClick={handleExitForm}
                      className="px-4 py-2.5 bg-white border border-[#468DFF] text-[#468DFF] hover:bg-[#468DFF] hover:text-white rounded-xl text-xs font-bold cursor-pointer transition-all shrink-0"
                    >
                      Salir
                    </button>
                    <button
                      type="submit"
                      disabled={saveLoading}
                      className="px-5 py-2.5 bg-[#468DFF] text-white border border-[#468DFF] hover:bg-[#0511F2] hover:border-[#0511F2] rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer shadow-lg shadow-[#468DFF]/10 transition-all shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {saveLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                      {editingTemplateId ? 'Guardar Cambios' : 'Crear Plantilla'}
                    </button>
                  </div>

                </form>
              </div>
            )}

            {/* ==========================================
                FORMULARIO: EJECUCIÓN / EDICIÓN DE INSPECCIÓN (LEVEL 2)
                ========================================== */}
            {isInspeccionFormOpen && (
              <div className="bg-white border border-slate-150 rounded-2xl shadow-sm overflow-hidden flex flex-col flex-grow max-h-[85vh] animate-fade-in">
                
                {/* HEADER FORM */}
                <div className="h-16 px-4 md:px-6 bg-slate-50 border-b border-slate-150 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-3">
                    <button 
                      type="button" 
                      onClick={handleExitForm}
                      className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 cursor-pointer"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </button>
                    <span className="font-outfit text-xs sm:text-sm md:text-base font-bold text-slate-900 truncate">
                      {isInspeccionReadOnly ? 'Detalle de Inspección' : editingInspeccionId ? 'Editar Inspección' : 'Cargar Nueva Inspección'}
                    </span>
                  </div>
                  <button
                    onClick={handleExitForm}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-all border-none cursor-pointer"
                  >
                    <X className="h-4.5 w-4.5" />
                  </button>
                </div>

                {/* BODY FORM */}
                <div className="overflow-y-auto flex-grow scrollbar-thin p-5 sm:p-6 space-y-6">
                  
                  {/* 1. Selección de plantilla (Solo en creación) */}
                  {!editingInspeccionId && (
                    <div className="flex flex-col gap-1.5 md:w-1/2">
                      <label className="text-xs font-bold text-slate-700">Seleccionar Plantilla a utilizar</label>
                      <select
                        value={selectedTemplateId}
                        onChange={(e) => handleSelectTemplate(e.target.value)}
                        className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs w-full focus:outline-none focus:ring-2 focus:ring-[#468DFF] cursor-pointer font-bold"
                      >
                        {templates.map(t => (
                          <option key={t.id} value={t.id}>{t.nombre}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {activeTemplate && (
                    <>
                      {/* Título de la planilla actual */}
                      <div className="bg-blue-50/50 p-4 border border-blue-100 rounded-2xl flex items-center gap-3">
                        <div className="p-2 bg-white rounded-xl text-[#468DFF] shadow-sm">
                          <ClipboardList className="h-6 w-6" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-slate-900 leading-tight">{activeTemplate.nombre}</h3>
                          <p className="text-[10px] text-slate-400 font-semibold">Responde el formulario a continuación</p>
                        </div>
                      </div>

                      {/* Sección 1: Información del Establecimiento y Fecha */}
                      <div className="border border-slate-150 rounded-2xl p-4 space-y-4">
                        <h4 className="font-outfit uppercase tracking-wider font-bold text-slate-800 border-b border-slate-100 pb-1.5 flex items-center gap-2 text-xs">
                          <Building className="h-4 w-4 text-[#468DFF]" />
                          1. Información del Establecimiento y Fecha
                        </h4>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          {/* Dropdown Empresas */}
                          {activeTemplate.config_campos.razon_social && (
                            <div className="flex flex-col gap-1">
                              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Cliente / Razón Social <span className="text-red-500">*</span></label>
                              <select
                                disabled={isInspeccionReadOnly || !!editingInspeccionId}
                                value={inspeccionEmpresaId}
                                onChange={(e) => {
                                  setInspeccionEmpresaId(e.target.value);
                                  setInspeccionEstablecimientoId('');
                                }}
                                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#468DFF] cursor-pointer disabled:opacity-60"
                              >
                                <option value="">Seleccionar cliente...</option>
                                {empresas.map(e => (
                                  <option key={e.id} value={e.id}>{e.razon_social}</option>
                                ))}
                              </select>
                            </div>
                          )}

                          {/* Dropdown Establecimientos */}
                          {activeTemplate.config_campos.establecimiento && (
                            <div className="flex flex-col gap-1">
                              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Establecimiento <span className="text-red-500">*</span></label>
                              <select
                                disabled={isInspeccionReadOnly || !inspeccionEmpresaId}
                                value={inspeccionEstablecimientoId}
                                onChange={(e) => setInspeccionEstablecimientoId(e.target.value)}
                                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#468DFF] cursor-pointer disabled:opacity-60"
                              >
                                <option value="">Seleccionar establecimiento...</option>
                                {filteredEstablecimientos.map(est => (
                                  <option key={est.id} value={est.id}>{est.denominacion}</option>
                                ))}
                              </select>
                            </div>
                          )}

                          {/* CUIT Autocompletado */}
                          {activeTemplate.config_campos.cuit && (
                            <div className="flex flex-col gap-1">
                              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">C.U.I.T.</label>
                              <input
                                type="text"
                                disabled
                                value={selectedEmpresaObj?.cuit || ''}
                                className="px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-500 font-semibold"
                              />
                            </div>
                          )}

                          {/* Dirección Autocompletada */}
                          {activeTemplate.config_campos.direccion && (
                            <div className="flex flex-col gap-1">
                              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Dirección</label>
                              <input
                                type="text"
                                disabled
                                value={selectedEstablecimientoObj?.direccion || ''}
                                className="px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-500 font-semibold"
                              />
                            </div>
                          )}

                          {/* Fecha de Inspección (Compact Date Picker Standard) */}
                          {activeTemplate.config_campos.fecha && (
                            <div className="flex flex-col gap-1">
                              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Fecha de Inspección *</label>
                              <div className="relative">
                                <input
                                  type="text"
                                  placeholder="DD/MM/YYYY"
                                  maxLength={10}
                                  value={inspeccionFecha}
                                  onChange={(e) => setInspeccionFecha(formatAsDateInput(e.target.value))}
                                  required
                                  disabled={isInspeccionReadOnly}
                                  className="w-full border border-slate-200 rounded-xl pl-3.5 pr-10 py-2 text-xs focus:outline-none focus:border-[#468DFF] bg-slate-50/50 font-mono disabled:bg-slate-100 disabled:text-slate-500"
                                />
                                {!isInspeccionReadOnly && (
                                  <div className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-slate-400 hover:text-[#468DFF] flex items-center">
                                    <Calendar className="h-4 w-4" />
                                    <input
                                      type="date"
                                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        if (val) {
                                          const parts = val.split('-');
                                          if (parts.length === 3) {
                                            setInspeccionFecha(`${parts[2]}/${parts[1]}/${parts[0]}`);
                                          }
                                        }
                                      }}
                                    />
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Sección 2: Ítems a auditar */}
                      <div className="border border-slate-150 rounded-2xl p-4 space-y-4">
                        <h4 className="font-outfit uppercase tracking-wider font-bold text-slate-800 border-b border-slate-100 pb-1.5 flex items-center gap-2 text-xs">
                          <CheckSquare className="h-4 w-4 text-[#468DFF]" />
                          2. Puntos de Verificación
                        </h4>

                        <div className="divide-y divide-slate-100">
                          {activeTemplate.items.map((item, index) => {
                            const respObj = inspeccionRespuestas.find(r => r.pregunta_id === item.id) || { respuesta: '', detalle_otro: '' };

                            return (
                              <div key={item.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 first:pt-0 last:pb-0 select-none">
                                <div className="flex-grow min-w-0 pr-4">
                                  <span className="text-xs font-bold text-slate-800 block">
                                    {index + 1}. {item.pregunta}
                                  </span>
                                </div>

                                <div className="shrink-0 flex flex-wrap items-center gap-3">
                                  {/* Renderizar Botones */}
                                  {item.tipo_respuesta === 'botones' && (
                                    <div className="flex items-center gap-1.5">
                                      {(item.opciones_botones || ['Ok', 'No Ok', 'N/A']).map((opt) => {
                                        const isActive = respObj.respuesta === opt;
                                        
                                        let activeColor = 'bg-[#468DFF] text-white border-[#468DFF]';
                                        if (opt === 'Ok' || opt === 'Si') activeColor = 'bg-[#00b050] text-white border-[#00b050]';
                                        if (opt === 'No Ok' || opt === 'No') activeColor = 'bg-red-500 text-white border-red-500';
                                        if (opt === 'N/A') activeColor = 'bg-slate-500 text-white border-slate-500';

                                        return (
                                          <button
                                            key={opt}
                                            type="button"
                                            disabled={isInspeccionReadOnly}
                                            onClick={() => handleUpdateInspeccionRespuesta(item.id, opt, respObj.detalle_otro)}
                                            className={`px-3 py-1.5 border text-xs font-bold rounded-xl transition-all cursor-pointer ${
                                              isActive
                                                ? activeColor
                                                : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                                          >
                                            {opt}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  )}

                                  {/* Renderizar Texto */}
                                  {item.tipo_respuesta === 'texto' && (
                                    <input
                                      type="text"
                                      placeholder="Ingrese respuesta..."
                                      disabled={isInspeccionReadOnly}
                                      value={respObj.respuesta}
                                      onChange={(e) => handleUpdateInspeccionRespuesta(item.id, e.target.value, '')}
                                      className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs w-full md:w-64 focus:outline-none focus:ring-2 focus:ring-[#468DFF] transition-all disabled:opacity-60"
                                    />
                                  )}

                                  {/* Opción Otro (Aclaración) */}
                                  {item.tipo_respuesta === 'botones' && item.con_otro && (
                                    <div className="flex items-center gap-1.5 flex-grow md:flex-initial">
                                      <input
                                        type="text"
                                        placeholder="Especificar..."
                                        disabled={isInspeccionReadOnly}
                                        value={respObj.detalle_otro}
                                        onChange={(e) => handleUpdateInspeccionRespuesta(item.id, respObj.respuesta, e.target.value)}
                                        className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs w-36 md:w-48 focus:outline-none focus:ring-2 focus:ring-[#468DFF] transition-all disabled:opacity-60"
                                      />
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Sección 3: Observaciones Finales */}
                      <div className="border border-slate-150 rounded-2xl p-4 space-y-3">
                        <h4 className="font-outfit uppercase tracking-wider font-bold text-slate-800 border-b border-slate-100 pb-1.5 flex items-center gap-2 text-xs">
                          <ClipboardList className="h-4 w-4 text-[#468DFF]" />
                          3. Observaciones Generales o Diagnóstico Final
                        </h4>
                        <textarea
                          rows={3}
                          disabled={isInspeccionReadOnly}
                          value={inspeccionObservaciones}
                          onChange={(e) => setInspeccionObservaciones(e.target.value)}
                          placeholder="Escriba comentarios, desvíos adicionales, recomendaciones o diagnósticos finales..."
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#468DFF] transition-all disabled:opacity-60"
                        />
                      </div>

                      {/* Sección 4: Registro Fotográfico */}
                      {activeTemplate.bloque_imagenes && (
                        <div className="border border-slate-150 rounded-2xl p-4 space-y-3">
                          <h4 className="font-outfit uppercase tracking-wider font-bold text-slate-800 border-b border-slate-100 pb-1.5 flex items-center gap-2 text-xs">
                            <ClipboardList className="h-4 w-4 text-[#468DFF]" />
                            4. Registro Fotográfico (Evidencias)
                          </h4>
                          
                          <ImageUploadZone
                            label="Adjuntar registros fotográficos"
                            multiple={true}
                            images={fotosFiles}
                            onAddPhotos={(validFiles) => {
                              const newPhotos = validFiles.map(file => ({
                                file,
                                preview: URL.createObjectURL(file),
                                path: ''
                              }));
                              setFotosFiles(prev => [...prev, ...newPhotos]);
                            }}
                            onRemovePhoto={(index) => {
                              setFotosFiles(prev => {
                                const target = prev[index];
                                if (target && target.preview && target.preview.startsWith('blob:')) {
                                  URL.revokeObjectURL(target.preview);
                                }
                                return prev.filter((_, idx) => idx !== index);
                              });
                            }}
                            disabled={isInspeccionReadOnly}
                            maxSizeMB={5}
                            onToast={triggerToast}
                          />
                        </div>
                      )}

                      {/* Sección 5: Firmas Digitales */}
                      {(activeTemplate.bloque_firmas.responsable_establecimiento || activeTemplate.bloque_firmas.responsable_higiene_seguridad) && (
                        <div className="border border-slate-150 rounded-2xl p-4 space-y-4">
                          <h4 className="font-outfit uppercase tracking-wider font-bold text-slate-800 border-b border-slate-100 pb-1.5 flex items-center gap-2 text-xs">
                            <Users className="h-4 w-4 text-[#468DFF]" />
                            5. Firmas y Validaciones
                          </h4>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            
                            {/* Firma Responsable Establecimiento */}
                            {activeTemplate.bloque_firmas.responsable_establecimiento && (
                              <div className="p-4 border border-slate-200 rounded-xl bg-slate-50/50 space-y-3 flex flex-col">
                                <div className="flex items-center justify-between">
                                  <label className="text-xs font-bold text-slate-700">Firma del Responsable del Establecimiento</label>
                                  {!isInspeccionReadOnly && (
                                    <button
                                      type="button"
                                      onClick={() => handleClearCanvas('resp')}
                                      className="text-[10px] font-bold text-red-500 hover:underline cursor-pointer bg-transparent border-none"
                                    >
                                      Limpiar
                                    </button>
                                  )}
                                </div>

                                <div className="relative border-2 border-dashed border-slate-200 rounded-xl bg-white aspect-[2/1] overflow-hidden flex items-center justify-center">
                                  {firmaRespSavedUrl ? (
                                    <img src={firmaRespSavedUrl.startsWith('mock') ? '/brand/logo-primary.png' : firmaRespSavedUrl} alt="Firma Responsable" className="h-full w-full object-contain" />
                                  ) : isInspeccionReadOnly ? (
                                    <span className="text-xs text-slate-400">Sin firma registrada</span>
                                  ) : (
                                    <canvas
                                      ref={refRespCallback}
                                      width={400}
                                      height={200}
                                      className="h-full w-full cursor-crosshair touch-none"
                                    />
                                  )}
                                </div>

                                <div className="flex flex-col gap-1 pt-1.5">
                                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Aclaración / Nombre del Responsable</label>
                                  <input
                                    type="text"
                                    disabled={isInspeccionReadOnly}
                                    value={responsableAclaracion}
                                    onChange={(e) => setResponsableAclaracion(e.target.value)}
                                    placeholder="Nombre completo..."
                                    className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#468DFF] transition-all disabled:opacity-60"
                                  />
                                </div>
                              </div>
                            )}

                            {/* Firma Responsable Higiene y Seguridad */}
                            {activeTemplate.bloque_firmas.responsable_higiene_seguridad && (
                              <div className="p-4 border border-slate-200 rounded-xl bg-slate-50/50 space-y-3 flex flex-col">
                                <div className="flex items-center justify-between">
                                  <label className="text-xs font-bold text-slate-700">Firma del Profesional de Higiene y Seguridad</label>
                                  {firmaTipo === 'mano' && !isInspeccionReadOnly && (
                                    <button
                                      type="button"
                                      onClick={() => handleClearCanvas('prof')}
                                      className="text-[10px] font-bold text-red-500 hover:underline cursor-pointer bg-transparent border-none"
                                    >
                                      Limpiar
                                    </button>
                                  )}
                                </div>

                                {!isInspeccionReadOnly && profile?.role !== 'cliente' && (
                                  <div className="grid grid-cols-2 bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[10px] font-bold text-slate-500">
                                    <button
                                      type="button"
                                      onClick={() => setFirmaTipo('perfil')}
                                      className={`py-1 rounded-md transition-all cursor-pointer border-none ${
                                        firmaTipo === 'perfil' ? 'bg-[#468DFF] text-white shadow-sm' : 'bg-transparent text-slate-500'
                                      }`}
                                    >
                                      Firma de Perfil
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setFirmaTipo('mano')}
                                      className={`py-1 rounded-md transition-all cursor-pointer border-none ${
                                        firmaTipo === 'mano' ? 'bg-[#468DFF] text-white shadow-sm' : 'bg-transparent text-slate-500'
                                      }`}
                                    >
                                      Dibujar a Mano
                                    </button>
                                  </div>
                                )}

                                <div className="relative border-2 border-dashed border-slate-200 rounded-xl bg-white aspect-[2/1] overflow-hidden flex items-center justify-center">
                                  {firmaTipo === 'perfil' ? (
                                    firmaPerfilPreviewUrl ? (
                                      <img src={firmaPerfilPreviewUrl} alt="Firma Perfil" className="h-full w-full object-contain p-2" />
                                    ) : (
                                      <div className="flex flex-col items-center p-4 text-center">
                                        <Info className="h-6 w-6 text-slate-300 mb-1" />
                                        <span className="text-[10px] text-slate-400">Seleccione un profesional para cargar su firma digital.</span>
                                      </div>
                                    )
                                  ) : firmaProfSavedUrl && !hasSignedProf ? (
                                    <img src={firmaProfSavedUrl.startsWith('mock') ? '/brand/logo-primary.png' : firmaProfSavedUrl} alt="Firma Cargada" className="h-full w-full object-contain" />
                                  ) : isInspeccionReadOnly ? (
                                    <span className="text-xs text-slate-400">Sin firma registrada</span>
                                  ) : (
                                    <canvas
                                      ref={refProfCallback}
                                      width={400}
                                      height={200}
                                      className="h-full w-full cursor-crosshair touch-none"
                                    />
                                  )}
                                </div>

                                <div className="flex flex-col gap-1 pt-1.5">
                                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Profesional Interviniente</label>
                                  {!isInspeccionReadOnly && profesionalTipo === 'miembro' ? (
                                    <select
                                      value={profesionalId}
                                      onChange={(e) => handleProfesionalChange(e.target.value)}
                                      className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#468DFF] cursor-pointer font-semibold text-slate-650"
                                    >
                                      <option value="">Seleccionar profesional...</option>
                                      {miembrosList.map(m => (
                                        <option key={m.id} value={m.id}>{m.full_name}</option>
                                      ))}
                                    </select>
                                  ) : (
                                    <input
                                      type="text"
                                      disabled
                                      value={profesionalNombre || 'N/A'}
                                      className="px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-500 font-semibold"
                                    />
                                  )}
                                </div>
                              </div>
                            )}

                          </div>
                        </div>
                      )}

                    </>
                  )}

                </div>

                {/* BOTONERA FOOTER FORM */}
                <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between bg-white shrink-0 sticky bottom-0 z-20">
                  <button
                    onClick={handleExitForm}
                    className="px-4 py-2.5 bg-white border border-[#468DFF] text-[#468DFF] hover:bg-[#468DFF] hover:text-white rounded-xl text-xs font-bold cursor-pointer transition-all"
                  >
                    Salir
                  </button>

                  {!isInspeccionReadOnly && (
                    <div className="flex items-center gap-3">
                      <button
                        onClick={handleSaveInspeccion}
                        disabled={saveLoading}
                        className="px-5 py-2.5 bg-[#468DFF] text-white border border-[#468DFF] hover:bg-[#0511F2] hover:border-[#0511F2] rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer shadow-lg shadow-[#468DFF]/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {saveLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                        {editingInspeccionId ? 'Guardar Cambios' : 'Guardar Inspección'}
                      </button>
                    </div>
                  )}
                </div>

              </div>
            )}
          </div>
        )}
      </main>

      {/* ==========================================
          MODAL: ENVIO POR CORREO
          ========================================== */}
      {isMailModalOpen && mailTargetInspeccion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-scaleUp">
            
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-150 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-[#468DFF]" />
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Enviar Reporte por Correo</h3>
              </div>
              <button
                onClick={() => setIsMailModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors border-none cursor-pointer"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">
              
              <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-xl">
                <span className="text-[10px] font-bold text-[#468DFF] uppercase tracking-wider block">Inspección Seleccionada</span>
                <span className="text-xs font-bold text-slate-800">
                  {templates.find(t => t.id === mailTargetInspeccion.template_id)?.nombre || 'Reporte'}
                </span>
                <span className="text-[11px] text-slate-400 block pt-0.5">
                  Fecha: {formatDate(mailTargetInspeccion.fecha)}
                </span>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Contactos del Cliente</label>
                {availableEmails.length === 0 ? (
                  <span className="text-xs text-slate-400 italic">No hay contactos cargados para este cliente.</span>
                ) : (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {availableEmails.map(email => (
                      <button
                        key={email}
                        onClick={() => handleSendEmail([email])}
                        disabled={mailLoading}
                        className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 hover:border-[#468DFF] hover:bg-blue-50/30 rounded-lg text-xs font-semibold text-slate-600 flex items-center gap-1 cursor-pointer transition-all disabled:opacity-50"
                      >
                        <Send className="h-3 w-3 text-[#468DFF]" />
                        {email}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-1.5 border-t border-slate-100 pt-3">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Enviar a otra dirección</label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={manualEmail}
                    onChange={(e) => setManualEmail(e.target.value)}
                    placeholder="ejemplo@correo.com"
                    className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs flex-grow focus:outline-none focus:ring-2 focus:ring-[#468DFF] transition-all"
                  />
                  <button
                    onClick={() => handleSendEmail([manualEmail])}
                    disabled={mailLoading || !manualEmail}
                    className="py-1.5 px-3 bg-[#468DFF] text-white border border-[#468DFF] hover:bg-[#0511F2] hover:border-[#0511F2] rounded-xl text-xs font-bold cursor-pointer transition-all disabled:opacity-50"
                  >
                    Enviar
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          TOAST ALERT & CONFIRMATION DIALOG
          ========================================== */}
      {toast.show && (
        <div className="fixed bottom-5 right-5 z-50 animate-slideUp">
          <div className={`flex items-center gap-2.5 py-3 px-4 rounded-2xl shadow-xl text-xs font-semibold text-white border ${
            toast.type === 'error' ? 'bg-red-500 border-red-500' : toast.type === 'warning' ? 'bg-amber-500 border-amber-500' : toast.type === 'info' ? 'bg-[#468DFF] border-[#468DFF]' : 'bg-emerald-500 border-emerald-500'
          }`}>
            {toast.type === 'info' && <Loader2 className="h-4 w-4 animate-spin shrink-0" />}
            {toast.type !== 'info' && <Info className="h-4.5 w-4.5 shrink-0" />}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {modalAlert.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-scaleUp">
            <div className="p-5 text-center flex flex-col items-center gap-3">
              <div className="p-3 bg-red-50 text-red-500 rounded-full">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">{modalAlert.title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{modalAlert.message}</p>
            </div>
            <div className="px-5 py-4 bg-slate-50 border-t border-slate-100 flex gap-3 justify-end">
              <button
                onClick={closeAlert}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold cursor-pointer transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={modalAlert.onConfirm}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-bold cursor-pointer transition-all"
              >
                {modalAlert.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
