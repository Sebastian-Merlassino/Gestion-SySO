// src/app/[tenant-slug]/checklist-personalizados/page.js
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Sidebar from '@/components/Sidebar';
import { supabase } from '@/lib/supabase';
import { formatDate, formatAsDateInput, convertToDbDate } from '@/lib/utils';
import { useToast } from '@/components/providers/ToastProvider';
import AppPageHeader from '@/components/ui/AppPageHeader';
import AppButton from '@/components/ui/AppButton';
import AppInput from '@/components/ui/AppInput';
import AppSelect from '@/components/ui/AppSelect';
import AppConfirmDialog from '@/components/ui/AppConfirmDialog';
import AppCard from '@/components/ui/AppCard';
import AppEmptyState from '@/components/ui/AppEmptyState';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import ImageUploadZone from '@/components/ui/ImageUploadZone';
import AITextHelper from '@/components/ui/AITextHelper';
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
  ClipboardList, 
  Calendar, 
  FileText, 
  Sliders, 
  Send, 
  Download, 
  Mail, 
  CheckSquare, 
  Trash, 
  ChevronUp, 
  ChevronDown,
  ArrowLeft,
  Menu
} from 'lucide-react';

export default function ChecklistPersonalizadosPage({ params }) {
  const tenantSlug = params['tenant-slug'];

  // ==========================================
  // ESTADOS Y REFERENCIAS
  // ==========================================
  const [profile, setProfile] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [adminContact, setAdminContact] = useState({ email: 'info@gestionsyso.com', phone: '1159969956 / 1132296691' });
  const [empresas, setEmpresas] = useState([]);
  const [allEstablecimientos, setAllEstablecimientos] = useState([]);
  const [miembrosList, setMiembrosList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDevMode, setIsDevMode] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState('inspecciones'); // 'inspecciones' | 'plantillas'

  // Datos principales
  const [templates, setTemplates] = useState([]);
  const [inspecciones, setInspecciones] = useState([]);

  // Estados CRUD: Diseñador de Plantillas (Builder)
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
  const [bloqueObservaciones, setBloqueObservaciones] = useState(true);
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const [bloqueFirmas, setBloqueFirmas] = useState({
    responsable_establecimiento: false,
    responsable_higiene_seguridad: false
  });

  // Estados CRUD: Inspecciones (Runner)
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
  const [firmaTipo, setFirmaTipo] = useState('perfil'); // 'perfil' | 'mano'
  const [profesionalTipo, setProfesionalTipo] = useState('miembro'); // 'miembro' | 'manual'
  const [profesionalId, setProfesionalId] = useState('');
  const [profesionalNombre, setProfesionalNombre] = useState('');
  const [responsableAclaracion, setResponsableAclaracion] = useState('');
  const [inspeccionObservaciones, setInspeccionObservaciones] = useState('');
  const [isInspeccionReadOnly, setIsInspeccionReadOnly] = useState(false);

  // Canvas para firmas manuscritas
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

  // Toasts y Modal Alert
  const globalToast = useToast();
  const [modalAlert, setModalAlert] = useState({ show: false, title: '', message: '', onConfirm: null, confirmText: 'Confirmar' });
  const [saveLoading, setSaveLoading] = useState(false);

  const originalDataRef = useRef('');

  // Sincronizar datos originales para control de cambios sin guardar
  useEffect(() => {
    if (isInspeccionFormOpen && !saveLoading) {
      originalDataRef.current = JSON.stringify({
        selectedTemplateId,
        inspeccionEmpresaId,
        inspeccionEstablecimientoId,
        inspeccionFecha,
        inspeccionRespuestas,
        responsableAclaracion,
        inspeccionObservaciones,
        firmaTipo,
        profesionalTipo,
        profesionalId,
        profesionalNombre
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInspeccionFormOpen, saveLoading, editingInspeccionId]);

  const checkHasUnsavedChanges = () => {
    if (isInspeccionReadOnly || !isInspeccionFormOpen) return false;
    const currentData = JSON.stringify({
      selectedTemplateId,
      inspeccionEmpresaId,
      inspeccionEstablecimientoId,
      inspeccionFecha,
      inspeccionRespuestas,
      responsableAclaracion,
      inspeccionObservaciones,
      firmaTipo,
      profesionalTipo,
      profesionalId,
      profesionalNombre
    });
    return originalDataRef.current !== currentData;
  };

  // Correo
  const [isMailModalOpen, setIsMailModalOpen] = useState(false);
  const [mailTargetInspeccion, setMailTargetInspeccion] = useState(null);
  const [availableEmails, setAvailableEmails] = useState([]);
  const [manualEmail, setManualEmail] = useState('');
  const [mailLoading, setMailLoading] = useState(false);

  // ==========================================
  // PERMISOS DE SECCION
  // ==========================================
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

  // ==========================================
  // EFECTOS (USEEFFECT)
  // ==========================================
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
    if (typeof window !== 'undefined') {
      const cached = sessionStorage.getItem('user-profile');
      if (cached) {
        setProfile(JSON.parse(cached));
      }
    }
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

  useEffect(() => {
    if (profile && profile.role === 'cliente' && profile.empresa_id) {
      setFilterEmpresa(profile.empresa_id);
    }
  }, [profile]);

  // Sincronizar firma del perfil del profesional interviniente
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

  // Manejar cierre de dropdown de botones al hacer clic afuera
  useEffect(() => {
    if (openDropdownId === null) return;
    const handleOutsideClick = (e) => {
      const dropdownEl = document.getElementById(`dropdown-buttons-${openDropdownId}`);
      const buttonEl = document.getElementById(`btn-dropdown-${openDropdownId}`);
      if (
        dropdownEl && !dropdownEl.contains(e.target) && 
        buttonEl && !buttonEl.contains(e.target)
      ) {
        setOpenDropdownId(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [openDropdownId]);

  // ==========================================
  // HELPERS Y TOASTS
  // ==========================================
  const triggerToast = (message, type = 'success') => {
    globalToast.toast(message, type);
  };

  const closeAlert = () => setModalAlert({ show: false, title: '', message: '', onConfirm: null, confirmText: 'Confirmar' });

  // Auxiliar para resolver firmas y evitar 404s
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
      if (isExternal) return relativePath;

      const bucketName = type === 'perfil' ? 'signatures' : 'documents';
      const { data: sData, error: sErr } = await supabase.storage
        .from(bucketName)
        .createSignedUrl(relativePath, 3600);
      if (!sErr && sData?.signedUrl) return sData.signedUrl;
    } catch (e) {
      console.error('Error resolviendo firma:', e);
    }
    return '/brand/logo-primary.png';
  };

  // ==========================================
  // CARGA DE DATOS (MOCK / REAL)
  // ==========================================
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
          { id: '1', pregunta: '¿El personal posee calzado de seguridad en buen estado?', tipo_respuesta: 'botones', opciones_botones: ['Ok', 'No Ok', 'N/A'], con_otro: false, requerido: true },
          { id: '2', pregunta: '¿Uso de arnés en trabajos en altura superior a 2 metros?', tipo_respuesta: 'botones', opciones_botones: ['Si', 'No', 'N/A'], con_otro: false, requerido: true },
          { id: '3', pregunta: '¿Se verifica el uso de casco de seguridad?', tipo_respuesta: 'check list', requerido: true },
          { id: '4', pregunta: 'Observaciones sobre el uso de EPP', tipo_respuesta: 'texto', requerido: false }
        ],
        bloque_imagenes: true,
        bloque_observaciones: true,
        bloque_firmas: { responsable_establecimiento: true, responsable_higiene_seguridad: true }
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
          { pregunta_id: '3', pregunta: '¿Se verifica el uso de casco de seguridad?', respuesta: 'Si', detalle_otro: '' },
          { pregunta_id: '4', pregunta: 'Observaciones sobre el uso de EPP', respuesta: 'Se realiza llamado de atención a un operario por no ajustar antiparras.', detalle_otro: '' }
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

  const loadRealData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = '/login';
        return;
      }

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

      const { data: ten, error: tErr } = await supabase
        .from('tenants')
        .select('*')
        .eq('slug', tenantSlug)
        .single();
      if (tErr) throw tErr;
      setTenant(ten);

      const { data: empData, error: empErr } = await supabase
        .from('empresas')
        .select('id, razon_social, cuit')
        .order('razon_social');
      if (empErr) throw empErr;
      setEmpresas(empData);

      const { data: estData, error: estErr } = await supabase
        .from('establecimientos')
        .select('id, empresa_id, denominacion, direccion');
      if (estErr) throw estErr;
      setAllEstablecimientos(estData);

      const { data: miembData, error: miembErr } = await supabase
        .from('miembros_equipo')
        .select('id, full_name, signature_url, profile_id')
        .order('full_name');
      if (miembErr) throw miembErr;
      setMiembrosList(miembData || []);

      const { data: templData, error: templErr } = await supabase
        .from('checklist_templates')
        .select('*')
        .order('nombre');
      if (templErr) throw templErr;
      setTemplates(templData || []);

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
  // LOGICA CRUD: PLANTILLAS (BUILDER)
  // ==========================================
  const handleOpenNewTemplate = () => {
    setEditingTemplateId(null);
    setTemplateNombre('');
    setConfigCampos({ razon_social: true, establecimiento: true, direccion: true, cuit: true, fecha: true });
    setTemplateItems([]);
    setBloqueImagenes(false);
    setBloqueObservaciones(true);
    setBloqueFirmas({ responsable_establecimiento: false, responsable_higiene_seguridad: false });
    setIsTemplateFormOpen(true);
  };

  const handleOpenEditTemplate = (tmpl) => {
    setEditingTemplateId(tmpl.id);
    setTemplateNombre(tmpl.nombre);
    setConfigCampos(tmpl.config_campos);
    setTemplateItems(tmpl.items ? tmpl.items.map(item => ({
      ...item,
      requerido: item.requerido !== false
    })) : []);
    setBloqueImagenes(tmpl.bloque_imagenes);
    setBloqueObservaciones(tmpl.bloque_observaciones !== false);
    setBloqueFirmas(tmpl.bloque_firmas);
    setIsTemplateFormOpen(true);
  };

  const handleAddTemplateItem = () => {
    const newItem = {
      id: String(Date.now()),
      pregunta: '',
      tipo_respuesta: 'botones',
      opciones_botones: ['Ok', 'No Ok', 'N/A'],
      con_otro: false,
      requerido: true
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
        if (fields.tipo_respuesta === 'texto' || fields.tipo_respuesta === 'check list') {
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
      items: templateItems.map(item => ({
        ...item,
        con_otro: false,
        requerido: item.requerido !== false
      })),
      bloque_imagenes: bloqueImagenes,
      bloque_observaciones: bloqueObservaciones,
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
  // LOGICA CRUD: INSPECCIONES (RUNNER)
  // ==========================================
  const handleOpenNewInspeccion = () => {
    if (templates.length === 0) {
      triggerToast('Debe crear al menos una plantilla para poder realizar inspecciones.', 'warning');
      return;
    }
    setEditingInspeccionId(null);
    setSelectedTemplateId(templates[0].id);
    setInspeccionEmpresaId('');
    setInspeccionEstablecimientoId('');
    
    // Inicializar fecha
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    setInspeccionFecha(`${day}/${month}/${year}`);

    setFotosFiles([]);
    setFirmaRespSavedUrl('');
    setFirmaProfSavedUrl('');
    const currentMember = profile ? miembrosList.find(m => m.profile_id === profile.id) : null;
    if (currentMember) {
      setProfesionalTipo('miembro');
      setProfesionalId(currentMember.id);
      setProfesionalNombre(currentMember.full_name);
      setSignaturePath(currentMember.signature_url || '');
      setFirmaTipo(currentMember.signature_url ? 'perfil' : 'mano');
    } else {
      setProfesionalTipo('miembro');
      setProfesionalId('');
      setProfesionalNombre(profile?.role !== 'cliente' ? (profile?.full_name || '') : '');
      setSignaturePath('');
      setFirmaTipo('perfil');
    }
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
      respuesta: item.tipo_respuesta === 'check list' ? 'No' : '',
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
        return { ...r, respuesta: val, detalle_otro: detail };
      }
      return r;
    }));
  };

  const handleOpenEditInspeccion = async (insp, readOnly = false) => {
    setEditingInspeccionId(insp.id);
    setSelectedTemplateId(insp.template_id);
    setInspeccionEmpresaId(insp.empresa_id || '');
    setInspeccionEstablecimientoId(insp.establecimiento_id || '');
    setInspeccionFecha(formatDate(insp.fecha));
    
    const tmpl = templates.find(t => t.id === insp.template_id);
    const mappedRespuestas = tmpl ? tmpl.items.map(item => {
      const existing = (insp.respuestas || []).find(r => r.pregunta_id === item.id);
      return {
        pregunta_id: item.id,
        pregunta: item.pregunta,
        respuesta: existing ? existing.respuesta : (item.tipo_respuesta === 'check list' ? 'No' : ''),
        detalle_otro: existing ? (existing.detalle_otro || '') : ''
      };
    }) : (insp.respuestas || []);
    
    setInspeccionRespuestas(mappedRespuestas);
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

    // Cargar fotos
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
            console.error('Error resolviendo URL para foto:', e);
          }
        }
      }
      setFotosFiles(fList);
    } else {
      setFotosFiles([]);
    }

    if (insp.responsable_higiene_seguridad_id) {
      const memb = miembrosList.find(m => m.id === insp.responsable_higiene_seguridad_id);
      if (memb?.signature_url) {
        setSignaturePath(memb.signature_url);
      }
    }

    setIsInspeccionFormOpen(true);
  };

  const handleExitForm = () => {
    if (isInspeccionReadOnly) {
      setIsInspeccionFormOpen(false);
      setIsTemplateFormOpen(false);
      return;
    }
    setModalAlert({
      show: true,
      title: 'Salir sin guardar',
      message: '¿Estás seguro de que deseas salir? Los cambios no guardados se perderán.',
      confirmText: 'Confirmar',
      onConfirm: () => {
        setIsInspeccionFormOpen(false);
        setIsTemplateFormOpen(false);
        closeAlert();
      }
    });
  };

  const handleClearCanvas = (canvasRef, setHasSigned, savedUrlSetter) => {
    if (savedUrlSetter) savedUrlSetter('');
    setHasSigned(false);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const setupCanvas = useCallback((canvas, setHasSigned) => {
    const canEdit = !isInspeccionReadOnly;
    if (!canvas || !canEdit) return;
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    let drawing = false;

    const getPos = (e) => {
      const rect = canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const x = ((clientX - rect.left) / rect.width) * canvas.width;
      const y = ((clientY - rect.top) / rect.height) * canvas.height;
      return { x, y };
    };

    const startDrawing = (e) => {
      drawing = true;
      const pos = getPos(e);
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
      e.preventDefault();
    };

    const draw = (e) => {
      if (!drawing) return;
      const pos = getPos(e);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      setHasSigned(true);
    };

    const stopDrawing = () => {
      drawing = false;
    };

    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseleave', stopDrawing);
    canvas.addEventListener('touchstart', startDrawing, { passive: false });
    canvas.addEventListener('touchmove', draw, { passive: false });
    canvas.addEventListener('touchend', stopDrawing);

    canvas._cleanup = () => {
      canvas.removeEventListener('mousedown', startDrawing);
      canvas.removeEventListener('mousemove', draw);
      canvas.removeEventListener('mouseup', stopDrawing);
      canvas.removeEventListener('mouseleave', stopDrawing);
      canvas.removeEventListener('touchstart', startDrawing);
      canvas.removeEventListener('touchmove', draw);
      canvas.removeEventListener('touchend', stopDrawing);
    };
  }, [isInspeccionReadOnly]);

  const refRespCallback = useCallback((node) => {
    if (node) {
      setupCanvas(node, setHasSignedResp);
      firmaRespCanvasRef.current = node;
    } else {
      if (firmaRespCanvasRef.current && firmaRespCanvasRef.current._cleanup) {
        firmaRespCanvasRef.current._cleanup();
      }
      firmaRespCanvasRef.current = null;
    }
  }, [setupCanvas]);

  const refProfCallback = useCallback((node) => {
    if (node) {
      setupCanvas(node, setHasSignedProf);
      firmaProfCanvasRef.current = node;
    } else {
      if (firmaProfCanvasRef.current && firmaProfCanvasRef.current._cleanup) {
        firmaProfCanvasRef.current._cleanup();
      }
      firmaProfCanvasRef.current = null;
    }
  }, [setupCanvas]);

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
    if (!tmpl.config_campos.establecimiento && tmpl.config_campos.direccion && !inspeccionEstablecimientoId) {
      triggerToast('Debe seleccionar la dirección del establecimiento.', 'error');
      return;
    }
    if (tmpl.config_campos.fecha && !inspeccionFecha) {
      triggerToast('Debe ingresar la fecha.', 'error');
      return;
    }

    const missingRequired = tmpl.items.some(item => {
      const isRequired = item.requerido !== false;
      if (!isRequired) return false;
      const respObj = inspeccionRespuestas.find(r => r.pregunta_id === item.id);
      return !respObj || respObj.respuesta === '';
    });
    if (missingRequired) {
      triggerToast('Por favor, responda todas las preguntas obligatorias antes de guardar.', 'error');
      return;
    }

    setSaveLoading(true);

    try {
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

      const uploadedUrls = [];
      for (const file of fotosFiles) {
        if (file.saved) {
          uploadedUrls.push(file.path);
        } else {
          if (isDevMode) {
            uploadedUrls.push(file.preview);
          } else {
            const fileName = `inspeccion_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
            const relativePath = `${profile?.id || 'anonymous'}/checklist/${fileName}`;
            const blobObj = file.file;
            if (!blobObj) throw new Error('Archivo de imagen no encontrado');

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
        fecha: (tmpl.config_campos.fecha && inspeccionFecha) ? convertToDbDate(inspeccionFecha) : new Date().toISOString().split('T')[0],
        respuestas: inspeccionRespuestas,
        adjuntar_registros_urls: uploadedUrls,
        firma_responsable_establecimiento: respSigData,
        responsable_establecimiento_aclaracion: tmpl.bloque_firmas.responsable_establecimiento ? responsableAclaracion : '',
        firma_responsable_higiene_seguridad: profSigData,
        responsable_higiene_seguridad_nombre: tmpl.bloque_firmas.responsable_higiene_seguridad ? profesionalNombre : '',
        responsable_higiene_seguridad_id: tmpl.bloque_firmas.responsable_higiene_seguridad && profesionalTipo === 'miembro' ? profesionalId : null,
        firma_tipo: firmaTipo,
        observaciones: tmpl.bloque_observaciones !== false ? inspeccionObservaciones : '',
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

  // ==========================================
  // LOGICA: EXPORTACIÓN A PDF (JSPDF)
  // ==========================================
  const getBase64ImageFromUrl = async (url) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (err) {
      console.error('Error convirtiendo URL a Base64:', err);
      return '';
    }
  };

  const resizeImageForPdf = (base64Str, maxW, maxH, type = 'image/png') => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > maxW) {
          height *= maxW / width;
          width = maxW;
        }
        if (height > maxH) {
          width *= maxH / height;
          height = maxH;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (type === 'image/jpeg') {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL(type, type === 'image/jpeg' ? 0.75 : undefined));
      };
      img.onerror = () => resolve(base64Str);
    });
  };

  const getImgDimensions = (base64Str) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => resolve({ width: img.width, height: img.height });
      img.onerror = () => resolve({ width: 100, height: 100 });
    });
  };

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
      if (fProfBase64) fProfBase64 = await resizeImageForPdf(fProfBase64, 800, 400);

      let fRespBase64 = '';
      if (tmpl.bloque_firmas.responsable_establecimiento && c.firma_responsable_establecimiento) {
        const url = await getFirmaUrl(c.firma_responsable_establecimiento, 'mano');
        fRespBase64 = await getBase64ImageFromUrl(url);
      }
      if (fRespBase64) fRespBase64 = await resizeImageForPdf(fRespBase64, 400, 200);

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

      // Título azul
      doc.setFillColor(60, 120, 216); // #3C78D8
      doc.rect(36, 75.2, 522.75, 18, 'F');
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(1);
      doc.rect(36, 75.2, 522.75, 18, 'S');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(255, 255, 255);
      doc.text((tmpl?.nombre || 'CHECKLIST').toUpperCase(), 297.37, 88, { align: 'center' });

      // Tabla Datos Generales
      const generalFields = [];
      if (tmpl?.config_campos?.razon_social) generalFields.push({ label: 'Razón Social', val: emp?.razon_social || 'N/A' });
      if (tmpl?.config_campos?.cuit) generalFields.push({ label: 'C.U.I.T.', val: emp?.cuit || 'N/A' });
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
          
          const maxTextW1 = 260;
          const val1Lines = doc.splitTextToSize(f1.val, maxTextW1);
          if (val1Lines.length > 1) {
            doc.setFontSize(8);
            doc.text(val1Lines[0], 130, startY + 8);
            doc.text(val1Lines[1], 130, startY + 15);
          } else {
            doc.setFontSize(10);
            doc.text(f1.val, 130, startY + 12);
          }

          // Col 2
          if (f2) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            doc.text(`${f2.label}:`, 402, startY + 12);
            doc.setFont('helvetica', 'normal');
            
            const maxTextW2 = 65;
            const val2Lines = doc.splitTextToSize(f2.val, maxTextW2);
            if (val2Lines.length > 1) {
              doc.setFontSize(8);
              doc.text(val2Lines[0], 490, startY + 8);
              doc.text(val2Lines[1], 490, startY + 15);
            } else {
              doc.setFontSize(10);
              doc.text(f2.val, 490, startY + 12);
            }
          }
          startY += rowH;
        }
      }

      // Tabla Respuestas
      const tableHeaders = [['N°', 'Ítem a Verificar', 'Respuesta']];
      const tableRows = c.respuestas.map((r, idx) => {
        let respText = r.respuesta;
        if (r.detalle_otro) {
          respText += ` (Otro: ${r.detalle_otro})`;
        }
        return [idx + 1, r.pregunta, respText];
      });

      let tableStartY = generalFields.length > 0 ? 105 + (Math.ceil(generalFields.length / 2) * 18) + 15 : 105;

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
          0: { cellWidth: 30, halign: 'center' },
          2: { cellWidth: 140 }
        }
      });

      let finalY = doc.lastAutoTable.finalY + 25;

      // Observaciones
      if (tmpl?.bloque_observaciones !== false && c.observaciones) {
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
        if (finalY > 550) {
          doc.addPage();
          drawHeaderLogo(doc);
          finalY = 85;
        }

        const sigY = finalY + 120;

        if (tmpl?.bloque_firmas?.responsable_establecimiento) {
          doc.setLineWidth(0.5);
          doc.setDrawColor(150, 150, 150);
          doc.line(36, sigY, 260, sigY);

          if (fRespBase64) {
            try {
              const dims = await getImgDimensions(fRespBase64);
              const ratio = dims.width / dims.height;
              const maxW = 100;
              const maxH = 40;
              let sWidth = maxW;
              let sHeight = maxH;
              if (ratio > maxW / maxH) {
                sWidth = maxW;
                sHeight = maxW / ratio;
              } else {
                sHeight = maxH;
                sWidth = maxH * ratio;
              }
              doc.addImage(fRespBase64, 'PNG', 148 - sWidth/2, sigY - 5 - sHeight, sWidth, sHeight);
            } catch (err) {
              console.error(err);
            }
          }
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          doc.setTextColor(0, 0, 0);
          doc.text('Firma Responsable del Establecimiento', 36, sigY + 10);
          doc.setFont('helvetica', 'normal');
          doc.text(`Aclaración: ${c.responsable_establecimiento_aclaracion || 'N/A'}`, 36, sigY + 20);
        }

        if (tmpl?.bloque_firmas?.responsable_higiene_seguridad) {
          doc.setLineWidth(0.5);
          doc.setDrawColor(150, 150, 150);
          doc.line(330, sigY, 554, sigY);

          if (fProfBase64) {
            try {
              const dims = await getImgDimensions(fProfBase64);
              const ratio = dims.width / dims.height;
              const maxW = 240;
              const maxH = 120;
              let sWidth = maxW;
              let sHeight = maxH;
              if (ratio > maxW / maxH) {
                sWidth = maxW;
                sHeight = maxW / ratio;
              } else {
                sHeight = maxH;
                sWidth = maxH * ratio;
              }
              doc.addImage(fProfBase64, 'PNG', 442 - sWidth/2, sigY - 5 - sHeight, sWidth, sHeight);
            } catch (err) {
              console.error(err);
            }
          }
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          doc.setTextColor(0, 0, 0);
          doc.text('Firma Responsable Higiene y Seguridad', 330, sigY + 10);
          doc.setFont('helvetica', 'normal');
          doc.text(`Nombre: ${c.responsable_higiene_seguridad_nombre || 'N/A'}`, 330, sigY + 20);
        }
      }

      // Anexo fotográfico
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
              const resized = await resizeImageForPdf(b64, 400, 300, 'image/jpeg');
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
            try {
              const dims = await getImgDimensions(fotosB64[idx]);
              const ratio = dims.width / dims.height;
              const maxW = 360;
              const maxH = 245;
              let imgW = maxW;
              let imgH = maxW / ratio;
              if (imgH > maxH) {
                imgH = maxH;
                imgW = maxH * ratio;
              }
              if (imgY + imgH > 750) {
                doc.addPage();
                drawHeaderLogo(doc);
                imgY = 85;
              }
              const drawX = 297.6 - imgW / 2;
              doc.addImage(fotosB64[idx], 'JPEG', drawX, imgY, imgW, imgH);
              doc.setDrawColor(200, 200, 200);
              doc.setLineWidth(0.5);
              doc.rect(drawX, imgY, imgW, imgH, 'S');

              doc.setFont('helvetica', 'bold');
              doc.setFontSize(9);
              doc.setTextColor(0, 0, 0);
              doc.text(`Registro Fotográfico N° ${idx + 1}`, drawX, imgY + imgH + 15);
              imgY += imgH + 40;
            } catch (errImg) {
              console.error(errImg);
            }
          }
        }
      }

      // Footer
      const totalPages = doc.internal.getNumberOfPages();
      const companyName = tenant?.name || 'Gestión SySO';
      
      const drawFooter = (d, pageNum) => {
        d.setFillColor(60, 120, 216);
        d.rect(34.5, 780.9, 525.75, 10.5, 'F');

        d.setFont('helvetica', 'normal');
        d.setFontSize(8);
        d.setTextColor(0, 0, 0);
        
        const phoneVal = profile?.role === 'miembro' ? (profile?.phone || '') : adminContact.phone;
        const emailVal = profile?.role === 'miembro' ? (profile?.email || '') : adminContact.email;
        
        d.setFont('helvetica', 'bold');
        const compW = d.getTextWidth(companyName);
        d.text(companyName, 135.72, 798.68);
        
        d.setFont('helvetica', 'normal');
        d.text(` - Tel.: ${phoneVal} - Email: ${emailVal}`, 135.72 + compW, 798.68);

        d.setFont('helvetica', 'normal');
        d.setFontSize(9);
        d.setTextColor(128, 128, 128);
        d.text(`Página ${pageNum} de ${totalPages}`, 552.75, 799.05, { align: 'right' });
      };

      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        drawFooter(doc, i);
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
  // LOGICA: ENVÍO POR CORREO
  // ==========================================
  const handleOpenEmailModal = (insp) => {
    setMailTargetInspeccion(insp);
    setManualEmail('');
    setMailLoading(false);

    const emp = empresas.find(e => e.id === insp.empresa_id);
    if (emp && emp.id) {
      const loadEmails = async () => {
        if (isDevMode) {
          setAvailableEmails([
            { valor: 'ejemplo@cliente.com', descripcion: 'ejemplo@cliente.com', checked: false },
            { valor: 'admin@cliente.com', descripcion: 'admin@cliente.com', checked: false }
          ]);
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
              const formatted = emails.map(e => {
                const mailStr = (typeof e === 'object') ? (e?.correo || e?.valor || '') : String(e);
                const nameStr = (typeof e === 'object' && e?.nombre) ? e.nombre : '';
                const cargoStr = (typeof e === 'object' && e?.cargo) ? e.cargo : '';
                return {
                  valor: mailStr,
                  descripcion: nameStr 
                    ? `${nameStr}${cargoStr ? ` - ${cargoStr}` : ''} (${mailStr})` 
                    : mailStr,
                  checked: false
                };
              }).filter(item => item.valor);
              setAvailableEmails(formatted);
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

  const handleSendEmail = async () => {
    if (!mailTargetInspeccion) return;

    const checkedEmails = availableEmails.filter(e => e.checked).map(e => e.valor);
    const manualList = manualEmail.split(',').map(e => e.trim()).filter(Boolean);
    const recipients = [...checkedEmails, ...manualList];

    if (recipients.length === 0) {
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
      const relativePath = `${profile?.id || 'anonymous'}/pdf_enviados/${filename}`;

      if (!isDevMode) {
        const { error: uploadErr } = await supabase.storage
          .from('documents')
          .upload(relativePath, pdfBlob, { contentType: 'application/pdf', upsert: true });
        if (uploadErr) throw uploadErr;
      }

      // Obtener logo del tenant como base64 (para el encabezado del email)
      let tenantLogoBase64 = '';
      if (tenant && tenant.logo_1_url) {
        try {
          tenantLogoBase64 = await getBase64ImageFromUrl(tenant.logo_1_url);
          if (tenantLogoBase64) {
            tenantLogoBase64 = await resizeImageForPdf(tenantLogoBase64, 400, 200);
          }
        } catch (logoErr) {
          console.warn('No se pudo cargar el logo para el email:', logoErr);
        }
      }

      const mailBody = {
        emails: recipients,
        filePath: relativePath,
        companyName: emp?.razon_social || 'Cliente',
        establishmentName: est?.denominacion || 'N/A',
        date: formatDate(mailTargetInspeccion.fecha),
        inspectorName: mailTargetInspeccion.responsable_higiene_seguridad_nombre || 'Profesional SySO',
        tenantLogoBase64: tenantLogoBase64 || null,
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

      triggerToast('Correo enviado exitosamente.');
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
  const filteredEstablecimientos = allEstablecimientos.filter(est => est.empresa_id === inspeccionEmpresaId);
  const isFormOpen = isTemplateFormOpen || isInspeccionFormOpen;

  // ==========================================
  // RENDER
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

      <main className="flex-grow flex flex-col min-w-0 bg-syso-bg overflow-y-auto">
        {/* HEADER PRINCIPAL */}
        <AppPageHeader
          title="Checklist Personalizados"
          icon={Sliders}
          tenantName={tenant?.name || 'Cargando...'}
          planId={tenant?.plan_id}
          showPlanBadge={profile && profile.role !== 'cliente'}
          setIsMobileMenuOpen={setIsMobileMenuOpen}
        />

        {loading ? (
          <div className="flex-grow flex items-center justify-center p-8">
            <div className="text-center space-y-4">
              <Loader2 className="h-10 w-10 animate-spin text-[#468DFF] mx-auto" />
              <p className="text-xs text-slate-500 font-medium">Cargando datos...</p>
            </div>
          </div>
        ) : (
          <div className="max-w-[95%] mx-auto w-full py-8 px-4 md:px-0 flex-1 flex flex-col min-h-0">
            
            {/* TABS Y FILTROS COMPACTOS (Solo si no está abierto ningún formulario) */}
            {!isFormOpen && (
              <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-sm shrink-0 flex flex-col gap-3 mb-4 transition-all">
                {/* Fila superior: Tabs y Buscador */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 select-none">
                  <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 gap-1 flex-shrink-0 items-center">
                    <button
                      type="button"
                      onClick={() => setActiveTab('inspecciones')}
                      className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer border-none ${
                        activeTab === 'inspecciones'
                          ? 'bg-white text-[#468DFF] shadow-sm'
                          : 'bg-transparent text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      Inspecciones Realizadas
                    </button>
                    {!isReadOnlyView && (
                      <button
                        type="button"
                        onClick={() => setActiveTab('plantillas')}
                        className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer border-none ${
                          activeTab === 'plantillas'
                            ? 'bg-white text-[#468DFF] shadow-sm'
                            : 'bg-transparent text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        Plantillas / Configuración
                      </button>
                    )}
                  </div>

                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      placeholder={activeTab === 'inspecciones' ? "Buscar por plantilla, cliente..." : "Buscar plantilla..."}
                      value={filterText}
                      onChange={(e) => setFilterText(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-1.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all text-slate-700 placeholder-slate-400 font-semibold"
                    />
                  </div>
                </div>

                {/* Fila inferior: Toggle Filtros / Botones Nuevos */}
                <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between min-h-[28px]">
                  {activeTab === 'inspecciones' ? (
                    <>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setShowFilters(!showFilters)}
                          className="font-bold text-slate-400 flex items-center gap-1.5 uppercase tracking-wider text-[10px] hover:text-slate-655 transition-colors cursor-pointer bg-transparent border-none"
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
                    </>
                  ) : (
                    <>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider select-none">Configuración de Fichas de Checklist</span>
                      {canCargar && (
                        <button
                          type="button"
                          onClick={handleOpenNewTemplate}
                          className="px-3 py-1.5 bg-[#468DFF] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-[#0511F2] transition-all cursor-pointer shadow-lg shadow-[#468DFF]/10 shrink-0 border border-[#468DFF] hover:border-[#0511F2]"
                        >
                          <PlusCircle className="h-3.5 w-3.5" />
                          Nueva Plantilla
                        </button>
                      )}
                    </>
                  )}
                </div>

                {/* Filtros avanzados */}
                {activeTab === 'inspecciones' && showFilters && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 pt-1 border-t border-slate-50 animate-scaleUp">
                    {profile && profile.role !== 'cliente' && (
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Cliente / Empresa</label>
                        <select
                          value={filterEmpresa}
                          onChange={(e) => setFilterEmpresa(e.target.value)}
                          className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-[11px] font-semibold text-slate-655 bg-white focus:outline-none focus:ring-1 focus:ring-[#468DFF] cursor-pointer"
                        >
                          <option value="">Todos los Clientes...</option>
                          {empresas.map(emp => (
                            <option key={emp.id} value={emp.id}>{emp.razon_social}</option>
                          ))}
                        </select>
                      </div>
                    )}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Plantilla de Checklist</label>
                      <select
                        value={filterTemplate}
                        onChange={(e) => setFilterTemplate(e.target.value)}
                        className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-[11px] font-semibold text-slate-655 bg-white focus:outline-none focus:ring-1 focus:ring-[#468DFF] cursor-pointer"
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
            )}

            {/* TAB 1: LISTADO DE INSPECCIONES */}
            {activeTab === 'inspecciones' && !isFormOpen && (
              <div 
                className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col flex-grow min-h-[300px] transition-all duration-300 ease-in-out"
                style={{ height: showFilters ? 'calc(100vh - 310px)' : 'calc(100vh - 240px)' }}
              >
                {sortedInspecciones.length === 0 ? (
                  <AppEmptyState
                    title="No hay inspecciones registradas"
                    description="Comienza utilizando una de tus plantillas de checklist."
                    actionButton={canCargar && (
                      <AppButton
                        onClick={handleOpenNewInspeccion}
                        variant="primary"
                        size="sm"
                        className="shadow-md shadow-[#468DFF]/10 flex items-center gap-1.5"
                      >
                        <PlusCircle className="h-3.5 w-3.5" />
                        Registrar la primera
                      </AppButton>
                    )}
                  />
                ) : (
                  <div className="overflow-auto flex-grow scrollbar-thin">
                    <table className="w-full text-left border-collapse min-w-[850px] text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-400 uppercase tracking-wider select-none">
                          <th className="px-6 py-4 cursor-pointer hover:text-slate-700 sticky top-0 z-10 bg-slate-50 border-b border-slate-200" onClick={() => handleSort('template')}>Plantilla</th>
                          <th className="px-6 py-4 cursor-pointer hover:text-slate-700 sticky top-0 z-10 bg-slate-50 border-b border-slate-200" onClick={() => handleSort('empresa')}>Cliente</th>
                          <th className="px-6 py-4 cursor-pointer hover:text-slate-700 sticky top-0 z-10 bg-slate-50 border-b border-slate-200" onClick={() => handleSort('fecha')}>Fecha</th>
                          <th className="px-6 py-4 sticky top-0 z-10 bg-slate-50 border-b border-slate-200">Responsable H&S</th>
                          <th className="px-6 py-4 text-right w-36 sticky top-0 z-10 bg-slate-50 border-b border-slate-200">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {sortedInspecciones.map((insp) => {
                          const tmpl = templates.find(t => t.id === insp.template_id);
                          const emp = empresas.find(e => e.id === insp.empresa_id);
                          return (
                            <tr key={insp.id} className="hover:bg-slate-100 transition-colors cursor-pointer border-b border-slate-100">
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
                                <button
                                  onClick={() => handleExportPdfReport(insp, true, false)}
                                  title="Ver PDF"
                                  className="p-1.5 rounded-lg bg-blue-50 text-[#468DFF] hover:bg-blue-100 hover:text-[#0511F2] transition-colors border-none cursor-pointer"
                                >
                                  <FileText className="h-4.5 w-4.5" />
                                </button>
                                <button
                                  onClick={() => handleExportPdfReport(insp, false, true)}
                                  title="Descargar PDF"
                                  className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors border-none cursor-pointer"
                                >
                                  <Download className="h-4.5 w-4.5" />
                                </button>
                                {!isReadOnlyView && (
                                  <button
                                    onClick={() => handleOpenEmailModal(insp)}
                                    title="Enviar por Correo"
                                    className="p-1.5 rounded-lg bg-blue-50 text-[#468DFF] hover:bg-blue-100 hover:text-[#0511F2] transition-colors border-none cursor-pointer"
                                  >
                                    <Mail className="h-4.5 w-4.5" />
                                  </button>
                                )}
                                {canEditar && (
                                  <button
                                    onClick={() => handleOpenEditInspeccion(insp, false)}
                                    title="Editar"
                                    className="p-1.5 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors border-none cursor-pointer"
                                  >
                                    <Edit className="h-4.5 w-4.5" />
                                  </button>
                                )}
                                {canEliminar && (
                                  <button
                                    onClick={() => handleDeleteInspeccion(insp.id)}
                                    title="Eliminar"
                                    className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors border-none cursor-pointer"
                                  >
                                    <Trash2 className="h-4.5 w-4.5" />
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
            )}

            {/* TAB 2: LISTADO DE PLANTILLAS */}
            {activeTab === 'plantillas' && !isFormOpen && (
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col flex-grow min-h-[300px] transition-all">
                {templates.length === 0 ? (
                  <AppEmptyState
                    title="No hay plantillas de checklist"
                    description="Diseña un nuevo checklist personalizado para comenzar."
                    actionButton={canCargar && (
                      <AppButton
                        onClick={handleOpenNewTemplate}
                        variant="primary"
                        size="sm"
                        className="shadow-md shadow-[#468DFF]/10 flex items-center gap-1.5"
                      >
                        <PlusCircle className="h-3.5 w-3.5" />
                        Registrar la primera
                      </AppButton>
                    )}
                  />
                ) : (
                  <div className="overflow-auto flex-grow scrollbar-thin">
                    <table className="w-full text-left border-collapse min-w-[700px] text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-400 uppercase tracking-wider select-none">
                          <th className="px-6 py-4 sticky top-0 z-10 bg-slate-50 border-b border-slate-200">Nombre de Plantilla</th>
                          <th className="px-6 py-4 sticky top-0 z-10 bg-slate-50 border-b border-slate-200">Ítems</th>
                          <th className="px-6 py-4 text-center sticky top-0 z-10 bg-slate-50 border-b border-slate-200">Firma Resp.</th>
                          <th className="px-6 py-4 text-center sticky top-0 z-10 bg-slate-50 border-b border-slate-200">Firma H&S</th>
                          <th className="px-6 py-4 text-right w-28 sticky top-0 z-10 bg-slate-50 border-b border-slate-200">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {templates
                          .filter(t => t.nombre.toLowerCase().includes(filterText.toLowerCase()))
                          .map((tmpl) => (
                          <tr key={tmpl.id} className="hover:bg-slate-100 transition-colors cursor-pointer border-b border-slate-100">
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
                                  <Edit className="h-4.5 w-4.5" />
                                </button>
                              )}
                              {canEliminar && (
                                <button
                                  onClick={() => handleDeleteTemplate(tmpl.id, tmpl.nombre)}
                                  title="Eliminar Plantilla"
                                  className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors border-none cursor-pointer"
                                >
                                  <Trash2 className="h-4.5 w-4.5" />
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
            )}

            {/* ==========================================
                FORMULARIO: DISEÑADOR DE PLANTILLAS (LEVEL 1)
                ========================================== */}
            {activeTab === 'plantillas' && isTemplateFormOpen && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col max-h-[85vh] animate-fade-in">
                {/* Cabecera del formulario */}
                <div className="h-16 px-4 md:px-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-3">
                    <button 
                      type="button" 
                      onClick={handleExitForm}
                      className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 cursor-pointer"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </button>
                    <span className="font-outfit text-xs sm:text-sm md:text-base font-bold text-slate-900 truncate max-w-[55vw] sm:max-w-none">
                      {editingTemplateId ? 'Editar Plantilla de Checklist' : 'Nueva Plantilla de Checklist'}
                    </span>
                  </div>
                  <button
                    onClick={handleExitForm}
                    className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-200 cursor-pointer border-none bg-transparent"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Formulario */}
                <form onSubmit={handleSaveTemplate} className="p-4 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto flex-grow flex-1 scrollbar-thin">
                  {/* Nombre del Checklist */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-600">Nombre del Checklist <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      required
                      value={templateNombre}
                      onChange={(e) => setTemplateNombre(e.target.value)}
                      placeholder="Ej: Auditoría Diaria de EPP, Inspección 5S, etc."
                      className="w-full md:w-1/2 border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 font-semibold text-slate-700"
                    />
                  </div>

                  {/* Datos Generales */}
                  <div className="border-t border-slate-100 pt-4 space-y-3">
                    <h3 className="font-outfit text-sm font-bold text-slate-800 border-b border-slate-100 pb-1.5 uppercase tracking-wider flex items-center gap-2">1. Datos Generales de la Ficha</h3>
                    <p className="text-[10px] text-slate-400">Selecciona los campos que el inspector completará antes de evaluar los ítems.</p>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                      {Object.keys(configCampos).map((field) => (
                        <label
                          key={field}
                          className="flex items-center gap-2.5 p-3 border border-slate-200 bg-white hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-700 cursor-pointer select-none transition-all"
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

                  {/* Puntos a Evaluar */}
                  <div className="border-t border-slate-100 pt-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-outfit text-sm font-bold text-slate-800 uppercase tracking-wider">2. Puntos a Evaluar</h3>
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
                              className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-[#468DFF] bg-white font-semibold text-slate-700"
                            />
                          </div>

                          <div className="flex flex-wrap items-center gap-4 w-full md:w-auto shrink-0 select-none">
                            <div className="flex flex-col gap-1">
                              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-bold">Tipo Respuesta</label>
                              <select
                                value={item.tipo_respuesta}
                                onChange={(e) => handleUpdateTemplateItem(item.id, { tipo_respuesta: e.target.value })}
                                className="border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs focus:outline-none focus:border-[#468DFF] bg-white cursor-pointer font-semibold text-slate-700"
                              >
                                <option value="botones">Botones</option>
                                <option value="texto">Caja de Texto</option>
                                <option value="check list">check list</option>
                              </select>
                            </div>

                            <div className="flex flex-col gap-1">
                              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-bold">Validación</label>
                              <label className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-650 cursor-pointer h-[34px] select-none">
                                <input
                                  type="checkbox"
                                  checked={item.requerido !== false}
                                  onChange={(e) => handleUpdateTemplateItem(item.id, { requerido: e.target.checked })}
                                  className="h-4 w-4 rounded border-slate-300 text-[#468DFF] focus:ring-[#468DFF] cursor-pointer"
                                />
                                <span>Obligatorio</span>
                              </label>
                            </div>

                            {item.tipo_respuesta === 'botones' && (
                              <div className="flex flex-col gap-1 relative">
                                <label className="text-[9px] font-bold text-slate-400 tracking-wider uppercase font-bold">Botones a mostrar</label>
                                <button
                                  id={`btn-dropdown-${item.id}`}
                                  type="button"
                                  onClick={() => setOpenDropdownId(openDropdownId === item.id ? null : item.id)}
                                  className="h-[34px] px-3.5 py-1.5 border border-slate-200 rounded-xl text-xs bg-white font-semibold text-slate-700 hover:bg-slate-50 flex items-center justify-between gap-2 w-44 text-left cursor-pointer transition-all"
                                >
                                  <span className="truncate">
                                    {item.opciones_botones?.length > 0 
                                      ? item.opciones_botones.join(', ') 
                                      : 'Seleccionar...'}
                                  </span>
                                  <ChevronDown className="h-3 w-3 text-slate-400 shrink-0" />
                                </button>
                                
                                {openDropdownId === item.id && (
                                  <div 
                                    id={`dropdown-buttons-${item.id}`}
                                    className="absolute top-[38px] left-0 w-44 bg-white border border-slate-200 rounded-xl shadow-lg p-2 space-y-1 z-35 max-h-48 overflow-y-auto scrollbar-thin animate-scaleUp"
                                  >
                                    {['Ok', 'No Ok', 'N/A', 'Si', 'No', 'Cumple', 'No Cumple'].map((opt) => {
                                      const isSelected = item.opciones_botones?.includes(opt);
                                      return (
                                        <label 
                                          key={opt} 
                                          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer select-none transition-colors ${
                                            isSelected ? 'bg-blue-50/50 text-[#468DFF]' : 'text-slate-750 hover:bg-slate-50'
                                          }`}
                                        >
                                          <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => handleToggleOpcionBoton(item.id, opt)}
                                            className="h-3.5 w-3.5 rounded border-slate-300 text-[#468DFF] focus:ring-[#468DFF] cursor-pointer"
                                          />
                                          <span>{opt}</span>
                                        </label>
                                      );
                                    })}
                                  </div>
                                )}
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

                  {/* Bloque Observaciones */}
                  <div className="border-t border-slate-100 pt-4 space-y-4">
                    <div className="flex flex-col gap-1.5">
                      <h3 className="font-outfit text-sm font-bold text-slate-800 uppercase tracking-wider pb-1.5 border-b border-slate-100">3. Bloque de Observaciones</h3>
                      <label className="flex items-center gap-2.5 p-3.5 border border-slate-200 bg-white hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-700 cursor-pointer select-none transition-all">
                        <input
                          type="checkbox"
                          checked={bloqueObservaciones}
                          onChange={(e) => setBloqueObservaciones(e.target.checked)}
                          className="h-4.5 w-4.5 rounded border-slate-300 text-[#468DFF] focus:ring-[#468DFF] cursor-pointer"
                        />
                        <span>Habilitar bloque de Observaciones / Recomendaciones al pie de la evaluación</span>
                      </label>
                    </div>

                    {/* Bloque Imagenes */}
                    <div className="flex flex-col gap-1.5">
                      <h3 className="font-outfit text-sm font-bold text-slate-800 uppercase tracking-wider pb-1.5 border-b border-slate-100">4. Adjuntos Fotográficos</h3>
                      <label className="flex items-center gap-2.5 p-3.5 border border-slate-200 bg-white hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-700 cursor-pointer select-none transition-all">
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
                      <h3 className="font-outfit text-sm font-bold text-slate-800 uppercase tracking-wider pb-1.5 border-b border-slate-100">5. Bloques de Firmas</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <label className="flex items-center gap-2.5 p-3.5 border border-slate-200 bg-white hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-700 cursor-pointer select-none transition-all">
                          <input
                            type="checkbox"
                            checked={bloqueFirmas.responsable_establecimiento}
                            onChange={(e) => setBloqueFirmas({ ...bloqueFirmas, responsable_establecimiento: e.target.checked })}
                            className="h-4.5 w-4.5 rounded border-slate-300 text-[#468DFF] focus:ring-[#468DFF] cursor-pointer"
                          />
                          <span>Firma del Responsable del Establecimiento</span>
                        </label>

                        <label className="flex items-center gap-2.5 p-3.5 border border-slate-200 bg-white hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-700 cursor-pointer select-none transition-all">
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

                  {/* Acciones del formulario */}
                  <div className="flex flex-col-reverse sm:flex-row justify-between items-stretch sm:items-center gap-3 pt-6 border-t border-slate-100 shrink-0">
                    <button
                      type="button"
                      onClick={handleExitForm}
                      className="px-5 py-2.5 bg-[#FFFFFF] text-[#468DFF] border border-[#468DFF] rounded-xl text-sm font-bold hover:bg-[#468DFF] hover:text-[#FFFFFF] hover:border-[#FFFFFF] transition-all active:scale-[0.98] cursor-pointer text-center w-full sm:w-auto"
                    >
                      Salir
                    </button>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                      {editingTemplateId && canEliminar && (
                        <button
                          type="button"
                          onClick={() => handleDeleteTemplate(editingTemplateId, templateNombre)}
                          className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold transition-all active:scale-[0.98] cursor-pointer shadow-lg shadow-red-600/10 text-center w-full sm:w-auto"
                        >
                          Eliminar
                        </button>
                      )}
                      <button
                        type="submit"
                        disabled={saveLoading}
                        className="px-5 py-2.5 bg-[#468DFF] hover:bg-[#0511F2] text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer shadow-lg shadow-[#468DFF]/10 disabled:opacity-50 w-full sm:w-auto border border-[#468DFF] hover:border-[#0511F2]"
                      >
                        {saveLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                        {editingTemplateId ? 'Guardar Cambios' : 'Registrar Plantilla'}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            )}

            {/* ==========================================
                FORMULARIO: EJECUCIÓN / EDICIÓN DE INSPECCIÓN (LEVEL 2)
                ========================================== */}
            {isInspeccionFormOpen && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col max-h-[85vh] animate-fade-in">
                {/* Cabecera del formulario */}
                <div className="h-16 px-4 md:px-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-3">
                    <button 
                      type="button"
                      onClick={handleExitForm} 
                      className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 cursor-pointer"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </button>
                    <span className="font-outfit text-xs sm:text-sm md:text-base font-bold text-slate-900 truncate max-w-[55vw] sm:max-w-none">
                      {isInspeccionReadOnly ? 'Detalle de Inspección' : editingInspeccionId ? 'Editar Inspección' : 'Cargar Nueva Inspección'}
                    </span>
                  </div>
                  <button type="button" onClick={handleExitForm} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-200 cursor-pointer border-none bg-transparent">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Formulario */}
                <form onSubmit={(e) => { e.preventDefault(); handleSaveInspeccion(); }} className="p-4 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto flex-grow flex-1 scrollbar-thin">
                  
                  {/* Selección de plantilla */}
                  {!editingInspeccionId && (
                    <div className="flex flex-col gap-1.5 md:w-1/2">
                      <label className="text-xs font-bold text-slate-700">Seleccionar Plantilla a utilizar</label>
                      <select
                        value={selectedTemplateId}
                        onChange={(e) => handleSelectTemplate(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 cursor-pointer font-bold text-slate-700"
                      >
                        {templates.map(t => (
                          <option key={t.id} value={t.id}>{t.nombre}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {activeTemplate && (
                    <fieldset disabled={isInspeccionReadOnly} className="space-y-6 flex-grow flex-1 border-none p-0 m-0">
                      
                      {/* Cabecera informativa */}
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
                      <div className="space-y-4">
                        <h3 className="font-outfit text-sm font-bold text-slate-800 border-b border-slate-100 pb-1.5 uppercase tracking-wider flex items-center gap-2">
                          <Building className="h-4 w-4 text-[#468DFF]" />
                          1. Información del Establecimiento y Fecha
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          {activeTemplate.config_campos.razon_social && (
                            <div className="flex flex-col gap-1.5">
                              <label className="text-xs font-bold text-slate-600">Cliente / Razón Social *</label>
                              <select
                                disabled={isInspeccionReadOnly || !!editingInspeccionId}
                                value={inspeccionEmpresaId}
                                onChange={(e) => {
                                  const empId = e.target.value;
                                  setInspeccionEmpresaId(empId);
                                  const ests = allEstablecimientos.filter(est => est.empresa_id === empId);
                                  if (ests.length > 0) {
                                    setInspeccionEstablecimientoId(ests[0].id);
                                  } else {
                                    setInspeccionEstablecimientoId('');
                                  }
                                }}
                                className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 cursor-pointer disabled:opacity-60 text-slate-700 font-semibold"
                              >
                                <option value="">Seleccionar cliente...</option>
                                {empresas.map(e => (
                                  <option key={e.id} value={e.id}>{e.razon_social}</option>
                                ))}
                              </select>
                            </div>
                          )}

                          {activeTemplate.config_campos.establecimiento && (
                            <div className="flex flex-col gap-1.5">
                              <label className="text-xs font-bold text-slate-600">Establecimiento *</label>
                              <select
                                disabled={isInspeccionReadOnly || !inspeccionEmpresaId}
                                value={inspeccionEstablecimientoId}
                                onChange={(e) => setInspeccionEstablecimientoId(e.target.value)}
                                className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 cursor-pointer disabled:opacity-60 text-slate-700 font-semibold"
                              >
                                <option value="">Seleccionar establecimiento...</option>
                                {filteredEstablecimientos.map(est => (
                                  <option key={est.id} value={est.id}>{est.denominacion}</option>
                                ))}
                              </select>
                            </div>
                          )}

                          {activeTemplate.config_campos.cuit && (
                            <div className="flex flex-col gap-1.5">
                              <label className="text-xs font-bold text-slate-500">C.U.I.T.</label>
                              <input
                                type="text"
                                disabled
                                value={selectedEmpresaObj?.cuit || ''}
                                className="w-full border border-slate-200 bg-slate-100 text-slate-500 rounded-xl px-3.5 py-2 text-sm font-semibold"
                              />
                            </div>
                          )}

                          {activeTemplate.config_campos.direccion && (
                            <div className="flex flex-col gap-1.5">
                              <label className={`text-xs font-bold ${!activeTemplate.config_campos.establecimiento ? 'text-slate-600' : 'text-slate-500'}`}>
                                Dirección {!activeTemplate.config_campos.establecimiento && '*'}
                              </label>
                              {!activeTemplate.config_campos.establecimiento ? (
                                <select
                                  disabled={isInspeccionReadOnly || !inspeccionEmpresaId}
                                  value={inspeccionEstablecimientoId}
                                  onChange={(e) => setInspeccionEstablecimientoId(e.target.value)}
                                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 cursor-pointer disabled:opacity-60 text-slate-700 font-semibold"
                                >
                                  <option value="">Seleccionar dirección...</option>
                                  {filteredEstablecimientos.map(est => (
                                    <option key={est.id} value={est.id}>{est.direccion}</option>
                                  ))}
                                </select>
                              ) : (
                                <input
                                  type="text"
                                  disabled
                                  value={selectedEstablecimientoObj?.direccion || ''}
                                  className="w-full border border-slate-200 bg-slate-100 text-slate-500 rounded-xl px-3.5 py-2 text-sm font-semibold"
                                />
                              )}
                            </div>
                          )}

                          {activeTemplate.config_campos.fecha && (
                            <div className="flex flex-col gap-1.5">
                              <label className="text-xs font-bold text-slate-600">Fecha de Inspección *</label>
                              <div className="relative">
                                <input
                                  type="text"
                                  placeholder="DD/MM/YYYY"
                                  maxLength={10}
                                  value={inspeccionFecha}
                                  onChange={(e) => setInspeccionFecha(formatAsDateInput(e.target.value))}
                                  required
                                  disabled={isInspeccionReadOnly}
                                  className="w-full border border-slate-200 rounded-xl pl-3.5 pr-10 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 font-mono disabled:bg-slate-100 disabled:text-slate-500 font-semibold"
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
  } else {
    setInspeccionFecha('');
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

                      {/* Sección 2: Puntos de Verificación */}
                      <div className="space-y-3">
                        <h3 className="font-outfit text-sm font-bold text-slate-800 border-b border-slate-100 pb-1.5 uppercase tracking-wider flex items-center gap-2">
                          <CheckSquare className="h-4.5 w-4.5 text-[#468DFF]" />
                          2. Puntos de Verificación
                        </h3>

                        <div className="space-y-2">
                          {activeTemplate.items.map((item, index) => {
                            const respObj = inspeccionRespuestas.find(r => r.pregunta_id === item.id) || { respuesta: '', detalle_otro: '' };
                            const isActive = (val) => respObj.respuesta === val;

                            return (
                              <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:bg-slate-50/10">
                                <div className="flex gap-2 items-start">
                                  <span className="font-mono text-xs font-bold text-slate-400 mt-0.5">{index + 1}.</span>
                                  <span className="text-xs font-bold text-slate-700 leading-normal">
                                    {item.pregunta}
                                    {item.requerido !== false && <span className="text-red-500 ml-1 font-bold">*</span>}
                                  </span>
                                </div>

                                <div className="flex items-center gap-1.5 w-full sm:w-64 shrink-0 justify-end">
                                  {item.tipo_respuesta === 'botones' && (
                                    <div className="flex items-center gap-1.5 w-full">
                                      {(item.opciones_botones || ['Ok', 'No Ok', 'N/A']).map((opt) => (
                                        <button
                                          key={opt}
                                          type="button"
                                          disabled={isInspeccionReadOnly}
                                          onClick={() => handleUpdateInspeccionRespuesta(item.id, opt)}
                                          className={`flex-1 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                                            isActive(opt)
                                              ? opt === 'Ok' || opt === 'Si'
                                                ? 'bg-[#00b050] text-white border-[#00b050] shadow-sm'
                                                : opt === 'No Ok' || opt === 'No'
                                                  ? 'bg-red-500 text-white border-red-500 shadow-sm'
                                                  : 'bg-slate-500 text-white border-slate-500 shadow-sm'
                                              : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-50'
                                          }`}
                                        >
                                          {opt}
                                        </button>
                                      ))}
                                    </div>
                                  )}

                                  {item.tipo_respuesta === 'texto' && (
                                    <input
                                      type="text"
                                      placeholder="Ingrese respuesta..."
                                      disabled={isInspeccionReadOnly}
                                      value={respObj.respuesta}
                                      onChange={(e) => handleUpdateInspeccionRespuesta(item.id, e.target.value)}
                                      className="w-full px-3.5 py-1.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#468DFF] bg-slate-50/50 text-slate-700 placeholder-slate-400 font-semibold disabled:opacity-60"
                                    />
                                  )}

                                  {item.tipo_respuesta === 'check list' && (
                                    <label className="flex items-center gap-2.5 cursor-pointer bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-xl px-4 py-1.5 text-xs font-bold text-slate-600 transition-all select-none">
                                      <input
                                        type="checkbox"
                                        disabled={isInspeccionReadOnly}
                                        checked={respObj.respuesta === 'Si'}
                                        onChange={(e) => handleUpdateInspeccionRespuesta(item.id, e.target.checked ? 'Si' : 'No')}
                                        className="h-4.5 w-4.5 rounded border-slate-300 text-[#468DFF] focus:ring-[#468DFF] cursor-pointer"
                                      />
                                      <span>Verificado</span>
                                    </label>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Sección 3: Observaciones */}
                      {activeTemplate.bloque_observaciones !== false && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-1.5 min-h-[28px]">
                            <h3 className="font-outfit text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 border-none pb-0">
                              <ClipboardList className="h-4 w-4 text-[#468DFF]" />
                              3. Observaciones
                            </h3>
                            <AITextHelper
                              value={inspeccionObservaciones}
                              onChange={setInspeccionObservaciones}
                              context="Observaciones y notas sobre la inspección realizada bajo la plantilla"
                              disabled={isInspeccionReadOnly}
                            />
                          </div>
                          <textarea
                            rows={3}
                            disabled={isInspeccionReadOnly}
                            value={inspeccionObservaciones}
                            onChange={(e) => setInspeccionObservaciones(e.target.value)}
                            placeholder="Escriba observaciones, comentarios o desvíos adicionales..."
                            className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#468DFF] transition-all disabled:opacity-60 font-semibold text-slate-700"
                          />
                        </div>
                      )}

                      {/* Sección 4: Registro Fotográfico */}
                      {activeTemplate.bloque_imagenes && (
                        <div className="space-y-3">
                          <h3 className="font-outfit text-sm font-bold text-slate-800 border-b border-slate-100 pb-1.5 uppercase tracking-wider flex items-center gap-2">
                            <ClipboardList className="h-4 w-4 text-[#468DFF]" />
                            4. Registro Fotográfico (Evidencias)
                          </h3>
                          
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

                      {/* Sección 5: Firmas */}
                      {(activeTemplate.bloque_firmas.responsable_establecimiento || activeTemplate.bloque_firmas.responsable_higiene_seguridad) && (
                        <div className="space-y-4">
                          <h3 className="font-outfit text-sm font-bold text-slate-800 border-b border-slate-100 pb-1.5 uppercase tracking-wider flex items-center gap-2">
                            <Users className="h-4.5 w-4.5 text-[#468DFF]" />
                            5. Firmas
                          </h3>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Responsable del Establecimiento */}
                            {activeTemplate.bloque_firmas.responsable_establecimiento && (
                              <div className="space-y-2 flex flex-col">
                                <div className="flex flex-row justify-between items-end gap-2 min-h-[18px]">
                                  <label className="text-xs font-bold text-slate-600 pr-2">Firma del Responsable del Establecimiento</label>
                                  {!isInspeccionReadOnly && (hasSignedResp || firmaRespSavedUrl) && (
                                    <button
                                      type="button"
                                      onClick={() => handleClearCanvas(firmaRespCanvasRef, setHasSignedResp, setFirmaRespSavedUrl)}
                                      className="text-[10px] font-bold text-red-500 hover:text-red-700 cursor-pointer shrink-0 border-none bg-transparent"
                                    >
                                      Limpiar Firma
                                    </button>
                                  )}
                                </div>
                                <div className="hidden md:block h-[51px] shrink-0" />
                                <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl aspect-[2/1] relative overflow-hidden flex items-center justify-center">
                                  {firmaRespSavedUrl && !hasSignedResp ? (
                                    <img src={firmaRespSavedUrl.startsWith('mock') ? '/brand/logo-primary.png' : firmaRespSavedUrl} alt="Firma Responsable" className="w-full h-full object-contain p-2" />
                                  ) : (
                                    <canvas
                                      ref={refRespCallback}
                                      width={400}
                                      height={200}
                                      className={`w-full h-full bg-white block ${!isInspeccionReadOnly ? 'cursor-crosshair' : 'cursor-default'}`}
                                    />
                                  )}
                                  {!hasSignedResp && !firmaRespSavedUrl && (
                                    <span className="absolute pointer-events-none text-[10px] text-slate-400 font-bold uppercase tracking-wider">Dibuje la firma aquí</span>
                                  )}
                                </div>
                                <div className="flex flex-col gap-1 pt-1.5">
                                  <label className="text-xs font-bold text-slate-500">Aclaración / Nombre del Responsable</label>
                                  <input
                                    type="text"
                                    disabled={isInspeccionReadOnly}
                                    value={responsableAclaracion}
                                    onChange={(e) => setResponsableAclaracion(e.target.value)}
                                    placeholder="Nombre completo..."
                                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all disabled:opacity-60 text-slate-700 font-semibold"
                                  />
                                </div>
                              </div>
                            )}

                            {/* Profesional Higiene y Seguridad */}
                            {activeTemplate.bloque_firmas.responsable_higiene_seguridad && (
                              <div className="space-y-2 flex flex-col">
                                <div className="flex flex-row justify-between items-end gap-2 min-h-[18px]">
                                  <label className="text-xs font-bold text-slate-600 pr-2">Firma del Profesional de Higiene y Seguridad</label>
                                  {firmaTipo === 'mano' && !isInspeccionReadOnly && (hasSignedProf || firmaProfSavedUrl) && (
                                    <button
                                      type="button"
                                      onClick={() => handleClearCanvas(firmaProfCanvasRef, setHasSignedProf, setFirmaProfSavedUrl)}
                                      className="text-[10px] font-bold text-red-500 hover:text-red-700 cursor-pointer shrink-0 border-none bg-transparent"
                                    >
                                      Limpiar Firma
                                    </button>
                                  )}
                                </div>

                                <div className="space-y-1.5 h-[51px] flex flex-col justify-end">
                                  <label className="text-xs font-bold text-slate-500">Origen de Firma del Profesional</label>
                                  <div className="flex border border-slate-200 bg-white text-[11px] font-semibold shrink-0 rounded-lg overflow-hidden">
                                    <button
                                      type="button"
                                      onClick={() => setFirmaTipo('perfil')}
                                      className={`flex-1 py-1 transition-colors cursor-pointer border-none ${
                                        firmaTipo === 'perfil'
                                          ? 'bg-[#468DFF] text-white'
                                          : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                                      }`}
                                    >
                                      Firma de Perfil
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setFirmaTipo('mano')}
                                      className={`flex-1 py-1 transition-colors cursor-pointer border-none ${
                                        firmaTipo === 'mano'
                                          ? 'bg-[#468DFF] text-white'
                                          : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                                      }`}
                                    >
                                      Firmar a mano
                                    </button>
                                  </div>
                                </div>

                                {firmaTipo === 'perfil' ? (
                                  <div className="border-2 border-dashed border-slate-200 bg-slate-50 rounded-xl aspect-[2/1] relative overflow-hidden flex items-center justify-center p-3 text-center">
                                    {signaturePath && signaturePath !== 'N/A' ? (
                                      <div className="flex flex-col items-center justify-center h-full w-full">
                                        {firmaPerfilPreviewUrl ? (
                                          <div className="bg-white border border-slate-200 rounded-lg p-2 max-w-[200px] h-[80px] flex items-center justify-center overflow-hidden shadow-sm">
                                            <img 
                                              src={firmaPerfilPreviewUrl} 
                                              alt="Firma Perfil" 
                                              className="max-w-full max-h-full object-contain"
                                            />
                                          </div>
                                        ) : (
                                          <Loader2 className="h-5 w-5 animate-spin text-[#468DFF]" />
                                        )}
                                        <p className="text-[10px] text-green-600 font-bold mt-2">✓ Firma del perfil cargada correctamente.</p>
                                      </div>
                                    ) : (
                                      <p className="text-[10px] text-amber-600 font-bold p-4">⚠ El profesional seleccionado no tiene una firma digital configurada.</p>
                                    )}
                                  </div>
                                ) : (
                                  <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl aspect-[2/1] relative overflow-hidden flex items-center justify-center">
                                    {firmaProfSavedUrl && !hasSignedProf ? (
                                      <img src={firmaProfSavedUrl.startsWith('mock') ? '/brand/logo-primary.png' : firmaProfSavedUrl} alt="Firma Profesional" className="w-full h-full object-contain p-2" />
                                    ) : (
                                      <canvas
                                        ref={refProfCallback}
                                        width={400}
                                        height={200}
                                        className={`w-full h-full bg-white block ${!isInspeccionReadOnly ? 'cursor-crosshair' : 'cursor-default'}`}
                                      />
                                    )}
                                    {!hasSignedProf && !firmaProfSavedUrl && (
                                      <span className="absolute pointer-events-none text-[10px] text-slate-400 font-bold uppercase tracking-wider">Dibuje la firma aquí</span>
                                    )}
                                  </div>
                                )}

                                <div className="flex flex-col gap-1 pt-1.5">
                                  <label className="text-xs font-bold text-slate-500">Profesional Interviniente</label>
                                  {!isInspeccionReadOnly && profesionalTipo === 'miembro' ? (
                                    <select
                                      value={profesionalId}
                                      onChange={(e) => handleProfesionalChange(e.target.value)}
                                      className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 cursor-pointer font-semibold text-slate-700"
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
                                      className="w-full border border-slate-200 bg-slate-100 text-slate-500 rounded-xl px-3.5 py-2 text-sm font-semibold"
                                    />
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </fieldset>
                  )}

                  {/* Acciones del formulario */}
                  <div className="flex flex-col-reverse sm:flex-row justify-between items-stretch sm:items-center gap-3 pt-6 border-t border-slate-100 shrink-0">
                    <button
                      type="button"
                      onClick={handleExitForm}
                      className="px-5 py-2.5 bg-[#FFFFFF] text-[#468DFF] border border-[#468DFF] rounded-xl text-sm font-bold hover:bg-[#468DFF] hover:text-[#FFFFFF] hover:border-[#FFFFFF] transition-all active:scale-[0.98] cursor-pointer text-center w-full sm:w-auto"
                    >
                      Salir
                    </button>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                      {isInspeccionReadOnly ? (
                        canEditar && (
                          <button
                            type="button"
                            onClick={() => setIsInspeccionReadOnly(false)}
                            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-bold transition-all active:scale-[0.98] cursor-pointer shadow-lg shadow-amber-500/10 text-center w-full sm:w-auto"
                          >
                            Editar
                          </button>
                        )
                      ) : (
                        <>
                          {editingInspeccionId && canEliminar && (
                            <button
                              type="button"
                              onClick={() => handleDeleteInspeccion(editingInspeccionId)}
                              className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold transition-all active:scale-[0.98] cursor-pointer shadow-lg shadow-red-600/10 text-center w-full sm:w-auto"
                            >
                              Eliminar
                            </button>
                          )}
                          <button
                            type="submit"
                            disabled={saveLoading}
                            className="px-5 py-2.5 bg-[#468DFF] hover:bg-[#0511F2] text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer shadow-lg shadow-[#468DFF]/10 disabled:opacity-50 w-full sm:w-auto border border-[#468DFF] hover:border-[#0511F2]"
                          >
                            {saveLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                            {editingInspeccionId ? 'Guardar Cambios' : 'Registrar Inspección'}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ==========================================
          MODAL: ENVÍO POR CORREO
          ========================================== */}
      {isMailModalOpen && mailTargetInspeccion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setIsMailModalOpen(false)} className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-md w-full z-10 shadow-2xl relative space-y-4 animate-fade-in">
            
            <div className="flex justify-between items-center">
              <h4 className="font-outfit text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Mail className="h-4.5 w-4.5 text-[#468DFF]" />
                Enviar Reporte por Correo
              </h4>
              <button onClick={() => setIsMailModalOpen(false)} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 font-medium">
              Seleccione los contactos registrados de la empresa o ingrese correos electrónicos manualmente (separados por comas) para enviar el reporte de checklist en PDF.
            </p>

            <div className="space-y-3">
              
              {/* Contactos de la empresa */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-600 block">Correos de la Empresa:</label>
                {availableEmails.length === 0 ? (
                  <p className="text-xs text-slate-400 italic font-semibold">No hay contactos registrados para esta empresa.</p>
                ) : (
                  <div className="bg-slate-50 p-3 border border-slate-200 rounded-xl max-h-36 overflow-y-auto space-y-1.5">
                    {availableEmails.map((e, idx) => (
                      <label key={idx} className="flex items-center gap-2.5 text-xs font-semibold text-slate-700 cursor-pointer hover:bg-slate-100/50 py-1 rounded">
                        <input
                          type="checkbox"
                          checked={e.checked}
                          onChange={() => {
                            setAvailableEmails(prev => prev.map((item, i) => i === idx ? { ...item, checked: !item.checked } : item));
                          }}
                          className="accent-[#468DFF] h-4 w-4"
                        />
                        {e.descripcion}
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Ingreso manual */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-600">Correos Manuales:</label>
                <textarea
                  rows="2"
                  placeholder="ejemplo1@correo.com, ejemplo2@correo.com..."
                  value={manualEmail}
                  onChange={(e) => setManualEmail(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#468DFF] bg-slate-50/50 font-semibold"
                />
              </div>

            </div>

            {/* Acciones */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsMailModalOpen(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-100 cursor-pointer transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={mailLoading}
                onClick={handleSendEmail}
                className="px-4 py-2 bg-[#468DFF] hover:bg-[#0511F2] text-white text-xs font-bold rounded-lg cursor-pointer transition-all flex items-center gap-1.5 shadow-md shadow-[#468DFF]/10 disabled:bg-slate-400"
              >
                {mailLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
                Enviar Correo
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ==========================================
          TOAST ALERT & CONFIRMATION DIALOG removidos - consumido globalmente
          ========================================== */}

      {modalAlert.show && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xl max-w-sm w-full animate-scaleUp space-y-4 text-center">
            <div className="mx-auto p-3 rounded-full w-12 h-12 flex items-center justify-center bg-amber-50 text-amber-500 animate-pulse">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h4 className="font-outfit text-base font-extrabold text-slate-800">{modalAlert.title}</h4>
              <p className="text-xs text-slate-500 leading-relaxed">{modalAlert.message}</p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={closeAlert}
                className="flex-1 py-2.5 border border-slate-350 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all cursor-pointer bg-transparent"
              >
                Cancelar
              </button>
              {modalAlert.onConfirm && (
                <button
                  type="button"
                  onClick={modalAlert.onConfirm}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer border-none"
                >
                  {modalAlert.confirmText || 'Confirmar'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      <AppFormNavigator
        activeList={inspecciones}
        currentId={editingInspeccionId}
        onNavigate={(newInsp) => handleOpenEditInspeccion(newInsp, isInspeccionReadOnly)}
        hasUnsavedChanges={checkHasUnsavedChanges()}
        isFormOpen={isInspeccionFormOpen}
      />
    </div>
  );
}
