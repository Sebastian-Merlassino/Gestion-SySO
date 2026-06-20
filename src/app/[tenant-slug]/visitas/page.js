// src/app/[tenant-slug]/visitas/page.js
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { formatDate } from '@/lib/utils';
import { 
  Plus, 
  Search, 
  Building, 
  Users, 
  AlertTriangle, 
  X, 
  Check, 
  Loader2, 
  Trash2, 
  Edit, 
  Briefcase, 
  Settings, 
  LogOut, 
  Menu,
  GraduationCap,
  Calendar,
  ClipboardList,
  MapPin,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  Sliders,
  Flame,
  Image as ImageIcon,
  Camera,
  Upload,
  Eye,
  ClipboardCheck,
  Mail,
  Download,
  Send,
  Trash
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

// Opciones de Mediciones
const MEDICIONES_OPTS = [
  'Evaluación ergonómica',
  'Medición de carga térmica',
  'Medición de contaminantes químicos del aire',
  'Medición de iluminación',
  'Medición de puesta a tierra y continuidad de masas',
  'Medición de ruido',
  'Medición de ventilación',
  'Medición de vibraciones',
  'Toma de muestra de agua para consumo humano',
  'N/A'
];

// Opciones de Simulacros
const SIMULACROS_OPTS = [
  'Derrame',
  'Evacuación',
  'Fuga de gas',
  'Incendio',
  'N/A'
];

// Opciones de Documentación
const DOCUMENTACION_OPTS = [
  'Análisis fisicoquímico y bacteriológico de agua para el consumo humano',
  'Estudio de carga de fuego',
  'Estudio de carga térmica',
  'Estudio de iluminación',
  'Estudio de ruido',
  'Estudio de ventilación',
  'Estudio de vibraciones',
  'Estudio ergonómico',
  'Informe antisiniestral',
  'Informe de investigación de accidente',
  'Informe de simulacro',
  'Mapa de riesgos',
  'Matríz de cumplimiento legal',
  'Matríz de identificación de peligros y valoración del riesgo',
  'Medición de puesta a tierra y continuidad de masas',
  'Plano de evacuación',
  'Procedimento de acción ante emergencias',
  'Procedimientos de trabajo seguro',
  'Programa de Seguridad (Res. 51/97; Res. 35/98; Res. 319/99)',
  'RAR',
  'Registro de capacitación',
  'RGRL',
  'Sistema de autoprotección',
  'Sistema de Vigilancia y Control de Sustancias y Agentes (S.V.C.C.)',
  'N/A'
];

export default function VisitasPage({ params }) {
  const tenantSlug = params['tenant-slug'];

  // Estados estructurales
  const [profile, setProfile] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [empresas, setEmpresas] = useState([]);
  const [allEstablecimientos, setAllEstablecimientos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDevMode, setIsDevMode] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Datos principales
  const [visitas, setVisitas] = useState([]);
  const [miembrosList, setMiembrosList] = useState([]);
  const [temasList, setTemasList] = useState([]);

  // Estados del CRUD / Vista Formulario
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Refs de Canvas para firmas
  const firmaRespCanvasRef = useRef(null);
  const firmaProfCanvasRef = useRef(null);

  // Banderas de si se ha firmado en el canvas en la sesión actual
  const [hasSignedResp, setHasSignedResp] = useState(false);
  const [hasSignedProf, setHasSignedProf] = useState(false);

  // URLs de previsualización para firmas guardadas (edición)
  const [firmaRespSavedUrl, setFirmaRespSavedUrl] = useState('');
  const [firmaProfSavedUrl, setFirmaProfSavedUrl] = useState('');

  // Campos del Formulario
  const [empresaId, setEmpresaId] = useState('');
  const [establecimientoId, setEstablecimientoId] = useState('');
  const [fecha, setFecha] = useState('');
  const [profesionalTipo, setProfesionalTipo] = useState('miembro'); // 'miembro' o 'manual'
  const [profesionalId, setProfesionalId] = useState('');
  const [profesionalNombre, setProfesionalNombre] = useState('');
  const [responsablePresente, setResponsablePresente] = useState('');
  const [ocurrieronIncidentes, setOcurrieronIncidentes] = useState(false);
  const [analisisCorrespondiente, setAnalisisCorrespondiente] = useState('N/A');
  const [causaRaiz, setCausaRaiz] = useState('');
  const [accionCorrectiva, setAccionCorrectiva] = useState('');
  
  const [relevamientoHigieneSeguridad, setRelevamientoHigieneSeguridad] = useState('N/A');
  const [relevamientoPracticasSeguras, setRelevamientoPracticasSeguras] = useState('N/A');
  const [relevamientoEpp, setRelevamientoEpp] = useState('N/A');
  const [realizaronMediciones, setRealizaronMediciones] = useState('N/A');

  // Mediciones multiselect
  const [selectedMediciones, setSelectedMediciones] = useState([]);
  const [medicionCustomText, setMedicionCustomText] = useState('');
  
  const [verificoAccionesCorrectivas, setVerificoAccionesCorrectivas] = useState('N/A');
  const [dictaronCapacitaciones, setDictaronCapacitaciones] = useState(false);

  // Capacitaciones temas multiselect
  const [selectedTemas, setSelectedTemas] = useState([]);
  const [isTemasDropdownOpen, setIsTemasDropdownOpen] = useState(false);
  const [searchTopicTerm, setSearchTopicTerm] = useState('');

  const [realizaronSimulacros, setRealizaronSimulacros] = useState(false);

  // Simulacros multiselect
  const [selectedSimulacros, setSelectedSimulacros] = useState([]);
  const [simulacroCustomText, setSimulacroCustomText] = useState('');

  const [emiteAvisoRiesgo, setEmiteAvisoRiesgo] = useState(false);

  // Documentación multiselect
  const [selectedDocumentacion, setSelectedDocumentacion] = useState([]);
  const [documentacionCustomText, setDocumentacionCustomText] = useState('');

  const [observacionesRecomendaciones, setObservacionesRecomendaciones] = useState('');
  const [observaciones, setObservaciones] = useState(''); // Observaciones finales

  // Fotos de registros
  const [fotosFiles, setFotosFiles] = useState([]); // array de { file: File | null, preview: string, path: string }
  const [viewingFotosVisita, setViewingFotosVisita] = useState(null);
  const [viewingFotosUrls, setViewingFotosUrls] = useState([]);

  // Filtros de listado
  const [filterText, setFilterText] = useState('');
  const [filterEmpresa, setFilterEmpresa] = useState('');
  const [filterEstablecimiento, setFilterEstablecimiento] = useState('');
  const [showFilters, setShowFilters] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setShowFilters(false);
    }
  }, []);

  // Ordenamiento
  const [sortField, setSortField] = useState('fecha');
  const [sortOrder, setSortOrder] = useState('desc');

  // Modales, Toast y loading
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [modalAlert, setModalAlert] = useState({ show: false, title: '', message: '', onConfirm: null, confirmText: 'Confirmar' });
  const [saveLoading, setSaveLoading] = useState(false);

  // Modal para enviar correo
  const [isMailModalOpen, setIsMailModalOpen] = useState(false);
  const [mailTargetVisita, setMailTargetVisita] = useState(null);
  const [availableEmails, setAvailableEmails] = useState([]); // { valor, descripcion, checked }
  const [manualEmail, setManualEmail] = useState('');
  const [mailLoading, setMailLoading] = useState(false);

  // Inicializar colapso sidebar
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

  // Cargar datos al montar
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

  // Setup de Canvas de dibujo para firmas
  useEffect(() => {
    if (!isFormOpen) return;

    const setupCanvas = (canvas, setHasSigned) => {
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';

      let drawing = false;

      // Obtener coordenadas de mouse/touch relativas al canvas
      const getPos = (e) => {
        const rect = canvas.getBoundingClientRect();
        // Soporte touch
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        
        // Calcular en base al tamaño real interno del canvas para evitar desfases de escalado CSS
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
        e.preventDefault();
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

      return () => {
        canvas.removeEventListener('mousedown', startDrawing);
        canvas.removeEventListener('mousemove', draw);
        canvas.removeEventListener('mouseup', stopDrawing);
        canvas.removeEventListener('mouseleave', stopDrawing);
        canvas.removeEventListener('touchstart', startDrawing);
        canvas.removeEventListener('touchmove', draw);
        canvas.removeEventListener('touchend', stopDrawing);
      };
    };

    const cleanupResp = setupCanvas(firmaRespCanvasRef.current, setHasSignedResp);
    const cleanupProf = setupCanvas(firmaProfCanvasRef.current, setHasSignedProf);

    return () => {
      if (cleanupResp) cleanupResp();
      if (cleanupProf) cleanupProf();
    };
  }, [isFormOpen]);

  const triggerToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 4000);
  };

  const closeAlert = () => setModalAlert({ show: false, title: '', message: '', onConfirm: null, confirmText: 'Confirmar' });

  // Cargar datos ficticios (Mock)
  const loadMockData = () => {
    setProfile({ full_name: 'Profesional de SySO (Mock)', role: 'owner' });
    setTenant({ id: 'mock-tenant', name: 'Consultora de Prueba' });
    setEmpresas([
      { id: 'mock-empresa-1', razon_social: 'Acme Argentina S.A.', cuit: '30712345678', contactos_correos: [{ valor: 'contacto@acme.com', descripcion: 'Contacto Comercial' }, { valor: 'higiene@acme.com', descripcion: 'Responsable SySO' }] },
      { id: 'mock-empresa-2', razon_social: 'Argento Via Publica', cuit: '30543210987', contactos_correos: [{ valor: 'admin@argento.com', descripcion: 'Administración' }] }
    ]);
    setAllEstablecimientos([
      { id: 'mock-est-1', empresa_id: 'mock-empresa-1', denominacion: 'Planta Industrial Pilar', direccion: 'Calle Falsa 123' },
      { id: 'mock-est-2', empresa_id: 'mock-empresa-1', denominacion: 'Oficinas Belgrano', direccion: 'Av. Cabildo 1540' },
      { id: 'mock-est-3', empresa_id: 'mock-empresa-2', denominacion: 'Único', direccion: 'Ruta 8 Km 54' }
    ]);
    setMiembrosList([
      { id: 'mock-miembro-1', full_name: 'Gonzalo Merlo' },
      { id: 'mock-miembro-2', full_name: 'Florencia Benitez' }
    ]);
    setTemasList([
      { id: 'mock-tema-1', tema: 'Uso de Extintores' },
      { id: 'mock-tema-2', tema: 'Ergonomía de Oficina' },
      { id: 'mock-tema-3', tema: 'Plan de Evacuación' }
    ]);
    setVisitas([
      {
        id: 'mock-visita-1',
        empresa_id: 'mock-empresa-1',
        establecimiento_id: 'mock-est-1',
        fecha: '2026-06-15',
        profesional_tipo: 'miembro',
        profesional_nombre: 'Gonzalo Merlo',
        profesional_id: 'mock-miembro-1',
        responsable_presente: 'Ing. Carlos Rossi',
        ocurrieron_incidentes: false,
        analisis_correspondiente: 'N/A',
        relevamiento_higiene_seguridad: 'Sí',
        relevamiento_practicas_seguras: 'Sí',
        relevamiento_epp: 'Sí',
        realizaron_mediciones: 'No',
        verifico_acciones_correctivas: 'Sí',
        dictaron_capacitaciones: true,
        capacitaciones_temas: ['Uso de Extintores'],
        realizaron_simulacros: false,
        emite_aviso_riesgo: false,
        documentacion_incorporada: ['Registro de capacitación'],
        observaciones_recomendaciones: 'Se constató orden y limpieza general. Extintores presurizados correctamente.',
        observaciones: 'Sin novedades adicionales.',
        firma_responsable_empresa: 'mock-path/firma_resp.png',
        firma_profesional: 'mock-path/firma_prof.png',
        created_at: '2026-06-15T18:00:00Z'
      }
    ]);
    setLoading(false);
  };

  // Cargar datos reales
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

      // Tenant
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
            window.location.href = `/${homeTen.slug}/visitas`;
            return;
          }
        }
        window.location.href = '/login';
        return;
      }

      // Acceso
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
            window.location.href = `/${homeTen.slug}/visitas`;
            return;
          }
        }
        window.location.href = '/login';
        return;
      }

      setTenant(ten);

      // Empresas
      const { data: emps, error: empErr } = await supabase
        .from('empresas')
        .select('id, razon_social, cuit, contactos_correos')
        .eq('tenant_id', ten.id)
        .order('razon_social');
      if (empErr) throw empErr;
      setEmpresas(emps || []);

      // Establecimientos
      const { data: ests, error: estErr } = await supabase
        .from('establecimientos')
        .select('id, empresa_id, denominacion, direccion')
        .eq('tenant_id', ten.id)
        .order('denominacion');
      if (estErr) throw estErr;
      setAllEstablecimientos(ests || []);

      // Miembros de equipo
      const { data: mems, error: memErr } = await supabase
        .from('miembros_equipo')
        .select('id, full_name')
        .eq('tenant_id', ten.id)
        .order('full_name');
      if (memErr) throw memErr;
      setMiembrosList(mems || []);

      // Temas de capacitación
      const { data: topics, error: topicErr } = await supabase
        .from('temas_capacitacion')
        .select('id, tema')
        .order('tema');
      if (topicErr) throw topicErr;
      setTemasList(topics || []);

      // Visitas
      const { data: vis, error: visErr } = await supabase
        .from('visitas')
        .select('*')
        .eq('tenant_id', ten.id)
        .order('fecha', { ascending: false });
      if (visErr) throw visErr;

      // Resolver URLs firmadas para fotos y firmas
      const resolvedVisitas = await Promise.all((vis || []).map(async (v) => {
        let previewUrls = [];
        let signedFirmaResp = '';
        let signedFirmaProf = '';

        if (v.adjuntar_registros_urls && v.adjuntar_registros_urls.length > 0) {
          previewUrls = await Promise.all(v.adjuntar_registros_urls.map(async (p) => {
            const { data } = await supabase.storage
              .from('documents')
              .createSignedUrl(p, 3600, { download: false });
            return data ? data.signedUrl : '';
          }));
        }

        if (v.firma_responsable_empresa) {
          const { data } = await supabase.storage
            .from('documents')
            .createSignedUrl(v.firma_responsable_empresa, 3600, { download: false });
          if (data) signedFirmaResp = data.signedUrl;
        }

        if (v.firma_profesional) {
          const { data } = await supabase.storage
            .from('documents')
            .createSignedUrl(v.firma_profesional, 3600, { download: false });
          if (data) signedFirmaProf = data.signedUrl;
        }

        return {
          ...v,
          fotos_preview_urls: previewUrls.filter(Boolean),
          firma_resp_preview_url: signedFirmaResp,
          firma_prof_preview_url: signedFirmaProf
        };
      }));

      setVisitas(resolvedVisitas);
      setLoading(false);
    } catch (err) {
      console.error('Error cargando datos reales:', err);
      triggerToast('Error al conectar con la base de datos.', 'error');
      setIsDevMode(true);
      loadMockData();
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  // Cierre de formulario con advertencia
  const handleExitForm = () => {
    setModalAlert({
      show: true,
      title: 'Salir sin guardar',
      message: '¿Estás seguro de que deseas salir? Los cambios no guardados se perderán.',
      confirmText: 'Salir',
      onConfirm: () => {
        handleCloseForm();
        closeAlert();
      }
    });
  };

  const handleSidebarNavigation = (e, path) => {
    if (isFormOpen) {
      e.preventDefault();
      setModalAlert({
        show: true,
        title: 'Salir sin guardar',
        message: '¿Estás seguro de que deseas salir? Los cambios no guardados se perderán.',
        confirmText: 'Salir',
        onConfirm: () => {
          closeAlert();
          if (path.endsWith('/visitas')) {
            handleCloseForm();
          } else {
            window.location.href = path;
          }
        }
      });
    }
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingId(null);
    setEmpresaId('');
    setEstablecimientoId('');
    setFecha('');
    setProfesionalTipo('miembro');
    setProfesionalId('');
    setProfesionalNombre('');
    setResponsablePresente('');
    setOcurrieronIncidentes(false);
    setAnalisisCorrespondiente('N/A');
    setCausaRaiz('');
    setAccionCorrectiva('');
    setRelevamientoHigieneSeguridad('N/A');
    setRelevamientoPracticasSeguras('N/A');
    setRelevamientoEpp('N/A');
    setRealizaronMediciones('N/A');
    setSelectedMediciones([]);
    setMedicionCustomText('');
    setVerificoAccionesCorrectivas('N/A');
    setDictaronCapacitaciones(false);
    setSelectedTemas([]);
    setIsTemasDropdownOpen(false);
    setSearchTopicTerm('');
    setRealizaronSimulacros(false);
    setSelectedSimulacros([]);
    setSimulacroCustomText('');
    setEmiteAvisoRiesgo(false);
    setSelectedDocumentacion([]);
    setDocumentacionCustomText('');
    setObservacionesRecomendaciones('');
    setObservaciones('');
    setFotosFiles([]);
    setHasSignedResp(false);
    setHasSignedProf(false);
    setFirmaRespSavedUrl('');
    setFirmaProfSavedUrl('');
  };

  // Filtrar los establecimientos según la empresa elegida
  const filteredEstablecimientos = allEstablecimientos.filter(
    (est) => est.empresa_id === empresaId
  );

  // Obtener datos automáticos del cliente
  const selectedEmpresa = empresas.find(e => e.id === empresaId);
  const derivedCuit = selectedEmpresa ? selectedEmpresa.cuit : '';

  // Obtener datos automáticos del establecimiento
  const selectedEstablecimiento = allEstablecimientos.find(est => est.id === establecimientoId);
  const derivedDireccion = selectedEstablecimiento ? selectedEstablecimiento.direccion : '';

  // Limpiar canvas
  const handleClearCanvas = (canvasRef, setHasSigned, savedUrlSetter) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSigned(false);
    if (savedUrlSetter) savedUrlSetter('');
  };

  // Manejo de fotos de registros
  const handleAddPhotos = (e) => {
    const files = Array.from(e.target.files || []);
    const newPhotos = files.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      path: ''
    }));
    setFotosFiles(prev => [...prev, ...newPhotos]);
  };

  const handleCapturePhoto = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const file = files[0];
    const newPhoto = {
      file,
      preview: URL.createObjectURL(file),
      path: ''
    };
    setFotosFiles(prev => [...prev, newPhoto]);
  };

  const handleRemovePhoto = (index) => {
    setFotosFiles(prev => {
      const target = prev[index];
      if (target && target.preview && target.preview.startsWith('blob:')) {
        URL.revokeObjectURL(target.preview);
      }
      return prev.filter((_, idx) => idx !== index);
    });
  };

  // Helper para subir archivos al storage
  const uploadFileToStorage = async (file, prefix, index) => {
    if (isDevMode) return `mock-path/${prefix}_${Date.now()}_${index || 0}_${file.name}`;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No autorizado');

      const fileExt = file.name.split('.').pop();
      const uuid = editingId || crypto.randomUUID();
      const fileName = `${user.id}/${prefix}_${uuid}_${index || 0}_${Date.now()}.${fileExt}`;

      const { error } = await supabase.storage
        .from('documents')
        .upload(fileName, file, { cacheControl: '3600', upsert: true });

      if (error) throw error;
      return fileName;
    } catch (err) {
      console.error(`Error al subir archivo ${prefix}:`, err);
      throw err;
    }
  };

  // Helper para subir canvas de firma al storage
  const uploadCanvasToStorage = async (canvas, prefix, visitaId) => {
    if (!canvas) return '';
    return new Promise((resolve, reject) => {
      canvas.toBlob(async (blob) => {
        if (!blob) {
          resolve('');
          return;
        }
        // Crear un objeto File ficticio para subirlo
        const file = new File([blob], `${prefix}_signature.png`, { type: 'image/png' });
        try {
          const path = await uploadFileToStorage(file, prefix, 0);
          resolve(path);
        } catch (err) {
          reject(err);
        }
      }, 'image/png');
    });
  };

  // Guardar datos de visita
  const handleSaveVisita = async (e) => {
    e.preventDefault();
    if (!empresaId || !establecimientoId || !fecha || !responsablePresente) {
      triggerToast('Complete la Razón Social, Establecimiento, Fecha y Responsable presente.', 'error');
      return;
    }

    const finalProfNombre = profesionalTipo === 'miembro'
      ? (miembrosList.find(m => m.id === profesionalId)?.full_name || '')
      : profesionalNombre.trim();

    if (!finalProfNombre) {
      triggerToast('Especifique el profesional interviniente.', 'error');
      return;
    }

    // Verificar si se ha firmado en el canvas o si ya existe firma guardada
    if (!hasSignedResp && !firmaRespSavedUrl) {
      triggerToast('La firma del responsable de la empresa es requerida.', 'error');
      return;
    }
    if (!hasSignedProf && !firmaProfSavedUrl) {
      triggerToast('La firma del profesional de Higiene y Seguridad es requerida.', 'error');
      return;
    }

    setSaveLoading(true);
    try {
      const tempId = editingId || crypto.randomUUID();

      // Subir firmas si hay dibujos nuevos
      let finalFirmaResp = firmaRespSavedUrl;
      let finalFirmaProf = firmaProfSavedUrl;

      if (hasSignedResp && firmaRespCanvasRef.current) {
        finalFirmaResp = await uploadCanvasToStorage(firmaRespCanvasRef.current, 'firma_resp', tempId);
      }
      if (hasSignedProf && firmaProfCanvasRef.current) {
        finalFirmaProf = await uploadCanvasToStorage(firmaProfCanvasRef.current, 'firma_prof', tempId);
      }

      // Subir fotos
      const finalFotosUrls = [];
      for (let i = 0; i < fotosFiles.length; i++) {
        const foto = fotosFiles[i];
        if (foto.file) {
          const uploadedPath = await uploadFileToStorage(foto.file, 'visita_registro', i);
          finalFotosUrls.push(uploadedPath);
        } else if (foto.path) {
          finalFotosUrls.push(foto.path);
        }
      }

      const payload = {
        id: tempId,
        tenant_id: tenant.id,
        empresa_id: empresaId,
        establecimiento_id: establecimientoId,
        fecha,
        profesional_tipo: profesionalTipo,
        profesional_nombre: finalProfNombre,
        profesional_id: profesionalTipo === 'miembro' ? profesionalId : null,
        responsable_presente: responsablePresente.trim(),
        ocurrieron_incidentes: ocurrieronIncidentes,
        analisis_correspondiente: ocurrieronIncidentes ? analisisCorrespondiente : 'N/A',
        causa_raiz: ocurrieronIncidentes ? causaRaiz.trim() : null,
        accion_correctiva: ocurrieronIncidentes ? accionCorrectiva.trim() : null,
        relevamiento_higiene_seguridad: relevamientoHigieneSeguridad,
        relevamiento_practicas_seguras: relevamientoPracticasSeguras,
        relevamiento_epp: relevamientoEpp,
        realizaron_mediciones: realizaronMediciones,
        mediciones_realizadas: realizaronMediciones === 'Sí' ? selectedMediciones : [],
        verifico_acciones_correctivas: verificoAccionesCorrectivas,
        dictaron_capacitaciones: dictaronCapacitaciones,
        capacitaciones_temas: dictaronCapacitaciones ? selectedTemas : [],
        realizaron_simulacros: realizaronSimulacros,
        simulacros_tipo: realizaronSimulacros ? selectedSimulacros : [],
        emite_aviso_riesgo: emiteAvisoRiesgo,
        documentacion_incorporada: selectedDocumentacion,
        observaciones_recomendaciones: observacionesRecomendaciones.trim() || null,
        adjuntar_registros_urls: finalFotosUrls,
        firma_responsable_empresa: finalFirmaResp,
        firma_profesional: finalFirmaProf,
        observaciones: observaciones.trim() || null,
        updated_at: new Date().toISOString()
      };

      if (isDevMode) {
        const mockVis = {
          ...payload,
          fotos_preview_urls: fotosFiles.map(f => f.preview),
          firma_resp_preview_url: finalFirmaResp.startsWith('mock') ? '/brand/logo-primary.png' : finalFirmaResp,
          firma_prof_preview_url: finalFirmaProf.startsWith('mock') ? '/brand/logo-primary.png' : finalFirmaProf
        };

        if (editingId) {
          setVisitas(visitas.map(v => v.id === editingId ? mockVis : v));
          triggerToast('Constancia de visita actualizada exitosamente (Mock).');
        } else {
          setVisitas([mockVis, ...visitas]);
          triggerToast('Constancia de visita registrada exitosamente (Mock).');
        }
      } else {
        if (editingId) {
          const { error } = await supabase
            .from('visitas')
            .update(payload)
            .eq('id', editingId);
          if (error) throw error;
          triggerToast('Constancia de visita actualizada con éxito.');
        } else {
          const { error } = await supabase
            .from('visitas')
            .insert([{ ...payload, created_at: new Date().toISOString() }]);
          if (error) throw error;
          triggerToast('Constancia de visita registrada con éxito.');
        }
        await loadRealData();
      }

      handleCloseForm();
    } catch (err) {
      console.error('Error al guardar visita:', err);
      triggerToast('Error al guardar el registro.', 'error');
    } finally {
      setSaveLoading(false);
    }
  };

  // Preparar Edición
  const handleEditClick = (v) => {
    setEditingId(v.id);
    setEmpresaId(v.empresa_id);
    setEstablecimientoId(v.establecimiento_id);
    setFecha(v.fecha);
    setProfesionalTipo(v.profesional_tipo || 'miembro');
    if (v.profesional_tipo === 'miembro') {
      setProfesionalId(v.profesional_id || '');
      setProfesionalNombre('');
    } else {
      setProfesionalId('');
      setProfesionalNombre(v.profesional_nombre || '');
    }
    setResponsablePresente(v.responsable_presente || '');
    setOcurrieronIncidentes(v.ocurrieron_incidentes || false);
    setAnalisisCorrespondiente(v.analisis_correspondiente || 'N/A');
    setCausaRaiz(v.causa_raiz || '');
    setAccionCorrectiva(v.accion_correctiva || '');
    setRelevamientoHigieneSeguridad(v.relevamiento_higiene_seguridad || 'N/A');
    setRelevamientoPracticasSeguras(v.relevamiento_practicas_seguras || 'N/A');
    setRelevamientoEpp(v.relevamiento_epp || 'N/A');
    setRealizaronMediciones(v.realizaron_mediciones || 'N/A');
    setSelectedMediciones(v.mediciones_realizadas || []);
    setVerificoAccionesCorrectivas(v.verifico_acciones_correctivas || 'N/A');
    setDictaronCapacitaciones(v.dictaron_capacitaciones || false);
    setSelectedTemas(v.capacitaciones_temas || []);
    setRealizaronSimulacros(v.realizaron_simulacros || false);
    setSelectedSimulacros(v.simulacros_tipo || []);
    setEmiteAvisoRiesgo(v.emite_aviso_riesgo || false);
    setSelectedDocumentacion(v.documentacion_incorporada || []);
    setObservacionesRecomendaciones(v.observaciones_recomendaciones || '');
    setObservaciones(v.observaciones || '');

    // Cargar fotos guardadas
    if (v.adjuntar_registros_urls && v.adjuntar_registros_urls.length > 0) {
      const loadedFotos = v.adjuntar_registros_urls.map((p, idx) => ({
        file: null,
        preview: v.fotos_preview_urls?.[idx] || '/brand/logo-primary.png',
        path: p
      }));
      setFotosFiles(loadedFotos);
    } else {
      setFotosFiles([]);
    }

    // Firmas guardadas
    setFirmaRespSavedUrl(v.firma_resp_preview_url || '');
    setFirmaProfSavedUrl(v.firma_prof_preview_url || '');
    setHasSignedResp(false);
    setHasSignedProf(false);

    setIsFormOpen(true);
  };

  // Eliminar
  const handleDeleteClick = (id) => {
    setModalAlert({
      show: true,
      title: '¿Eliminar Constancia?',
      message: 'Esta acción eliminará permanentemente la constancia de visita seleccionada y todos sus archivos asociados. No se puede deshacer.',
      confirmText: 'Eliminar',
      onConfirm: async () => {
        try {
          if (isDevMode) {
            setVisitas(visitas.filter(v => v.id !== id));
            triggerToast('Constancia eliminada exitosamente (Mock).');
          } else {
            const { error } = await supabase
              .from('visitas')
              .delete()
              .eq('id', id);
            if (error) throw error;
            triggerToast('Constancia de visita eliminada con éxito.');
            await loadRealData();
          }
        } catch (err) {
          console.error(err);
          triggerToast('Error al eliminar el registro.', 'error');
        } finally {
          closeAlert();
        }
      }
    });
  };

  // Multiselect toggles
  const handleToggleMedicion = (m) => {
    setSelectedMediciones(prev => 
      prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]
    );
  };

  const handleAddCustomMedicion = () => {
    if (!medicionCustomText.trim()) return;
    const txt = medicionCustomText.trim();
    if (!selectedMediciones.includes(txt)) {
      setSelectedMediciones(prev => [...prev, txt]);
    }
    setMedicionCustomText('');
  };

  const handleToggleSimulacro = (s) => {
    setSelectedSimulacros(prev =>
      prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
    );
  };

  const handleAddCustomSimulacro = () => {
    if (!simulacroCustomText.trim()) return;
    const txt = simulacroCustomText.trim();
    if (!selectedSimulacros.includes(txt)) {
      setSelectedSimulacros(prev => [...prev, txt]);
    }
    setSimulacroCustomText('');
  };

  const handleToggleDocumentacion = (d) => {
    setSelectedDocumentacion(prev =>
      prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]
    );
  };

  const handleAddCustomDocumentacion = () => {
    if (!documentacionCustomText.trim()) return;
    const txt = documentacionCustomText.trim();
    if (!selectedDocumentacion.includes(txt)) {
      setSelectedDocumentacion(prev => [...prev, txt]);
    }
    setDocumentacionCustomText('');
  };

  const handleToggleTemaCapacitacion = (tName) => {
    setSelectedTemas(prev =>
      prev.includes(tName) ? prev.filter(x => x !== tName) : [...prev, tName]
    );
  };

  // Helper para convertir imagen URL a base64
  const getBase64ImageFromUrl = async (imageUrl) => {
    try {
      const res = await fetch(imageUrl);
      const blob = await res.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.addEventListener("load", () => {
          resolve(reader.result);
        }, false);
        reader.addEventListener("error", () => {
          reject(new Error("Error reading image"));
        }, false);
        reader.readAsDataURL(blob);
      });
    } catch (e) {
      console.error('Error fetching image for base64:', e);
      return '';
    }
  };

  // Generar PDF
  const handleGeneratePdf = async (v, shouldDownload = true) => {
    try {
      // 1. Obtener nombres de empresa y establecimiento
      const emp = empresas.find(e => e.id === v.empresa_id);
      const est = allEstablecimientos.find(e => e.id === v.establecimiento_id);
      
      const empName = emp ? emp.razon_social : 'N/A';
      const cuit = emp ? emp.cuit : 'N/A';
      const estName = est ? est.denominacion : 'N/A';
      const address = est ? est.direccion : 'N/A';

      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Dimensiones A4: 210 x 297 mm
      const margin = 15;
      let yPos = 18;

      // Header: Cargar logo principal
      try {
        const logoBase64 = await getBase64ImageFromUrl('/brand/logo-primary.png');
        if (logoBase64) {
          // logo a la izquierda
          doc.addImage(logoBase64, 'PNG', margin, yPos, 15, 15);
        }
      } catch (e) {
        console.error('No se pudo cargar el logo de la cabecera en el PDF:', e);
      }

      // Título en la cabecera
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(15, 23, 42); // slate-900
      doc.text('CONSTANCIA DE VISITA TÉCNICA', 40, yPos + 6);
      
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139); // slate-500
      doc.text(`Consultora: ${tenant?.name || 'Gestión SySO'}`, 40, yPos + 11);

      yPos += 20;

      // Línea divisora
      doc.setDrawColor(217, 217, 217); // gris de marca #D9D9D9
      doc.setLineWidth(0.5);
      doc.line(margin, yPos, 210 - margin, yPos);

      yPos += 8;

      // Tabla vertical de datos
      const tableRows = [
        { key: 'Razón Social', value: empName },
        { key: 'Establecimiento', value: estName },
        { key: 'C.U.I.T.', value: cuit },
        { key: 'Dirección', value: address },
        { key: 'Fecha de Visita', value: formatDate(v.fecha) },
        { key: 'Profesional Interviniente', value: v.profesional_nombre },
        { key: 'Responsable Presente', value: v.responsable_presente },
        { key: '¿Ocurrieron incidentes/accidentes?', value: v.ocurrieron_incidentes ? 'Sí' : 'No' },
      ];

      if (v.ocurrieron_incidentes) {
        tableRows.push(
          { key: '¿Se realizó el análisis causa-raíz?', value: v.analisis_correspondiente || 'N/A' },
          { key: 'Causa raíz del incidente', value: v.causa_raiz || 'N/A' },
          { key: 'Acción correctiva planificada', value: v.accion_correctiva || 'N/A' }
        );
      }

      tableRows.push(
        { key: 'Relevamiento Higiene y Seguridad', value: v.relevamiento_higiene_seguridad || 'N/A' },
        { key: 'Relevamiento Prácticas Trabajo Seguro', value: v.relevamiento_practicas_seguras || 'N/A' },
        { key: 'Relevamiento Uso de EPP', value: v.relevamiento_epp || 'N/A' },
        { key: '¿Se realizaron mediciones técnicas?', value: v.realizaron_mediciones || 'N/A' }
      );

      if (v.realizaron_mediciones === 'Sí') {
        tableRows.push({ key: 'Mediciones / evaluaciones realizadas', value: (v.mediciones_realizadas || []).join(', ') });
      }

      tableRows.push(
        { key: 'Verificación de correctivas previas', value: v.verifico_acciones_correctivas || 'N/A' },
        { key: '¿Se dictaron capacitaciones?', value: v.dictaron_capacitaciones ? 'Sí' : 'No' }
      );

      if (v.dictaron_capacitaciones) {
        tableRows.push({ key: 'Temas capacitados', value: (v.capacitaciones_temas || []).join(', ') });
      }

      tableRows.push(
        { key: '¿Se realizaron simulacros?', value: v.realizaron_simulacros ? 'Sí' : 'No' }
      );

      if (v.realizaron_simulacros) {
        tableRows.push({ key: 'Especificación de simulacro', value: (v.simulacros_tipo || []).join(', ') });
      }

      tableRows.push(
        { key: '¿Se emite aviso de riesgo?', value: v.emite_aviso_riesgo ? 'Sí' : 'No' },
        { key: 'Documentación en Legajo SySO', value: (v.documentacion_incorporada || []).join(', ') || 'Ninguna' },
        { key: 'Observaciones / Recomendaciones', value: v.observaciones_recomendaciones || 'Sin observaciones preventivas.' },
        { key: 'Observaciones generales', value: v.observaciones || 'Sin observaciones adicionales.' }
      );

      doc.autoTable({
        startY: yPos,
        margin: { left: margin, right: margin },
        columns: [
          { header: 'Pregunta / Concepto', dataKey: 'key' },
          { header: 'Detalle / Respuesta', dataKey: 'value' }
        ],
        body: tableRows,
        theme: 'striped',
        styles: {
          fontSize: 9,
          cellPadding: 3,
          font: 'Helvetica',
          textColor: [30, 41, 59] // slate-800
        },
        headStyles: {
          fillColor: [70, 141, 255], // #468DFF color principal
          textColor: [255, 255, 255],
          fontStyle: 'bold'
        },
        columnStyles: {
          key: { fontStyle: 'bold', width: 65, fillColor: [248, 250, 252] }, // gris muy suave
          value: { width: 115 }
        }
      });

      // Calcular posición final
      let finalY = doc.lastAutoTable.finalY || yPos + 100;
      
      // Si la firma no cabe al pie de la página, creamos una nueva página
      if (finalY > 220) {
        doc.addPage();
        finalY = margin + 10;
      }

      // Sección de Firmas
      finalY += 15;
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text('REGISTRO DE FIRMAS', margin, finalY);

      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.line(margin, finalY + 2, 210 - margin, finalY + 2);

      finalY += 8;

      // Obtener firmas como base64
      let imgRespBase64 = '';
      let imgProfBase64 = '';

      if (v.firma_resp_preview_url) {
        imgRespBase64 = await getBase64ImageFromUrl(v.firma_resp_preview_url);
      }
      if (v.firma_prof_preview_url) {
        imgProfBase64 = await getBase64ImageFromUrl(v.firma_prof_preview_url);
      }

      // Dibujar columnas de firmas
      const colWidth = (210 - (margin * 2) - 10) / 2; // ~85mm cada columna
      
      // Columna Izquierda: Responsable Empresa
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text('Firma del Responsable de la Empresa:', margin, finalY);
      
      if (imgRespBase64) {
        doc.addImage(imgRespBase64, 'PNG', margin, finalY + 3, colWidth - 10, 20);
      }
      doc.line(margin, finalY + 24, margin + colWidth - 10, finalY + 24);
      doc.setFont('Helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(v.responsable_presente, margin, finalY + 28);
      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text('Responsable del Establecimiento', margin, finalY + 32);

      // Columna Derecha: Profesional Higiene & Seguridad
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text('Firma del Profesional de HyS:', margin + colWidth + 10, finalY);

      if (imgProfBase64) {
        doc.addImage(imgProfBase64, 'PNG', margin + colWidth + 10, finalY + 3, colWidth - 10, 20);
      }
      doc.line(margin + colWidth + 10, finalY + 24, margin + (colWidth * 2) + 10, finalY + 24);
      doc.setFont('Helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(v.profesional_nombre, margin + colWidth + 10, finalY + 28);
      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text('Profesional Interviniente', margin + colWidth + 10, finalY + 32);

      if (shouldDownload) {
        doc.save(`Constancia_Visita_${empName.replace(/\s+/g, '_')}_${v.fecha}.pdf`);
        triggerToast('PDF descargado exitosamente.');
        return null;
      } else {
        // Retornar en base64 para enviar por correo
        return doc.output('datauristring');
      }
    } catch (e) {
      console.error('Error al generar PDF:', e);
      triggerToast('Error al estructurar el PDF de la constancia.', 'error');
      return null;
    }
  };

  // Abrir modal de correo
  const handleOpenMailModal = async (v) => {
    setMailTargetVisita(v);
    
    // Obtener la empresa asociada para cargar sus contactos de correo
    const emp = empresas.find(e => e.id === v.empresa_id);
    if (emp && emp.contactos_correos && emp.contactos_correos.length > 0) {
      const formatted = emp.contactos_correos.map((c, i) => ({
        valor: c.valor,
        descripcion: `${c.nombre || 'Contacto'} - ${c.cargo || 'General'} (${c.valor})`,
        checked: i === 0 // Checkear el primero por defecto
      }));
      setAvailableEmails(formatted);
    } else {
      setAvailableEmails([]);
    }
    setManualEmail('');
    setIsMailModalOpen(true);
  };

  // Enviar correo electrónico
  const handleSendEmail = async () => {
    const checkedEmails = availableEmails.filter(e => e.checked).map(e => e.valor);
    const manualList = manualEmail.split(',').map(e => e.trim()).filter(Boolean);
    const recipients = [...checkedEmails, ...manualList];

    if (recipients.length === 0) {
      triggerToast('Debe ingresar o seleccionar al menos un correo de destino.', 'error');
      return;
    }

    setMailLoading(true);
    try {
      // 1. Generar PDF como base64 string
      const pdfBase64 = await handleGeneratePdf(mailTargetVisita, false);
      if (!pdfBase64) {
        throw new Error('No se pudo estructurar el PDF adjunto.');
      }

      const emp = empresas.find(e => e.id === mailTargetVisita.empresa_id);
      const est = allEstablecimientos.find(e => e.id === mailTargetVisita.establecimiento_id);

      // 2. Llamar API route
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emails: recipients,
          pdfBase64,
          companyName: emp ? emp.razon_social : 'Cliente',
          establishmentName: est ? est.denominacion : 'Establecimiento',
          date: formatDate(mailTargetVisita.fecha),
          inspectorName: mailTargetVisita.profesional_nombre
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al enviar.');

      triggerToast(data.message || 'Correo electrónico enviado con éxito.');
      setIsMailModalOpen(false);
    } catch (e) {
      console.error(e);
      triggerToast(e.message || 'Error al enviar el correo.', 'error');
    } finally {
      setMailLoading(false);
    }
  };

  // Filtrado de visitas
  const filteredVisitas = visitas.filter((v) => {
    if (filterText) {
      const q = filterText.toLowerCase();
      const p = v.profesional_nombre.toLowerCase();
      const r = (v.responsable_presente || '').toLowerCase();
      const obs = (v.observaciones || '').toLowerCase();
      if (!p.includes(q) && !r.includes(q) && !obs.includes(q)) {
        return false;
      }
    }

    if (filterEmpresa && v.empresa_id !== filterEmpresa) return false;
    if (filterEstablecimiento && v.establecimiento_id !== filterEstablecimiento) return false;

    return true;
  });

  // Ordenamiento de visitas
  const sortedVisitas = [...filteredVisitas].sort((a, b) => {
    if (!sortField) return 0;
    let valA = a[sortField];
    let valB = b[sortField];

    if (sortField === 'cliente') {
      const empA = empresas.find(e => e.id === a.empresa_id);
      const empB = empresas.find(e => e.id === b.empresa_id);
      valA = empA ? empA.razon_social.toLowerCase() : '';
      valB = empB ? empB.razon_social.toLowerCase() : '';
    } else if (sortField === 'establecimiento') {
      const estA = allEstablecimientos.find(e => e.id === a.establecimiento_id);
      const estB = allEstablecimientos.find(e => e.id === b.establecimiento_id);
      valA = estA ? estA.denominacion.toLowerCase() : '';
      valB = estB ? estB.denominacion.toLowerCase() : '';
    }

    if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  return (
    <div className="h-screen overflow-hidden bg-[#D9D9D9] text-slate-700 flex flex-col md:flex-row relative font-sans">
      
      {/* Mobile Sidebar */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div onClick={() => setIsMobileMenuOpen(false)} className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
          <aside className="relative w-64 bg-[#0D0D0D] flex flex-col justify-between p-6 z-10 border-r border-white/5 animate-fade-in-right">
            <div>
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <img src="/brand/logo-primary.png" alt="Logo" className="h-9 w-9 object-contain" />
                  <span className="font-outfit text-base font-extrabold text-white tracking-tight">Gestión SySO</span>
                </div>
                <button onClick={() => setIsMobileMenuOpen(false)} className="p-1 rounded-lg text-white/50 hover:text-white hover:bg-white/10 cursor-pointer">
                  <X className="h-5 w-5" />
                </button>
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
                <a href={`/${tenantSlug}/programa`} onClick={(e) => handleSidebarNavigation(e, `/${tenantSlug}/programa`)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-[#468DFF] font-semibold text-sm transition-all">
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
                <a href={`/${tenantSlug}/visitas`} onClick={(e) => handleSidebarNavigation(e, `/${tenantSlug}/visitas`)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[#468DFF] text-white font-semibold text-sm transition-all shadow-md shadow-[#468DFF]/10">
                  <ClipboardCheck className="h-4 w-4" />
                  Constancia de Visita
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
      <aside className={`hidden md:flex flex-col justify-between p-6 bg-[#0D0D0D] border-r border-white/5 transition-all duration-300 shrink-0 ${isSidebarCollapsed ? 'w-20' : 'w-64'}`}>
        <div>
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3 overflow-hidden">
              <img src="/brand/logo-primary.png" alt="Logo" className="h-9 w-9 object-contain shrink-0" />
              {!isSidebarCollapsed && (
                <span className="font-outfit text-base font-extrabold text-white tracking-tight animate-fade-in truncate">Gestión SySO</span>
              )}
            </div>
            <button onClick={toggleSidebar} className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/5 cursor-pointer">
              <ChevronLeft className={`h-4.5 w-4.5 transition-transform duration-300 ${isSidebarCollapsed ? 'rotate-180' : ''}`} />
            </button>
          </div>

          <nav className="space-y-1">
            <span className={`text-[10px] font-bold uppercase tracking-wider text-white/30 px-3 block mb-2 truncate ${isSidebarCollapsed ? 'opacity-0' : ''}`}>Panel principal</span>
            <a href={`/${tenantSlug}/dashboard`} onClick={(e) => handleSidebarNavigation(e, `/${tenantSlug}/dashboard`)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-[#468DFF] font-semibold text-sm transition-all" title="Dashboard">
              <Building className="h-4.5 w-4.5 shrink-0" />
              {!isSidebarCollapsed && <span className="animate-fade-in">Dashboard</span>}
            </a>
            <a href={`/${tenantSlug}/empresas`} onClick={(e) => handleSidebarNavigation(e, `/${tenantSlug}/empresas`)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-[#468DFF] font-semibold text-sm transition-all" title="Clientes">
              <Users className="h-4.5 w-4.5 shrink-0" />
              {!isSidebarCollapsed && <span className="animate-fade-in">Clientes</span>}
            </a>
            {(profile?.role === 'owner' || profile?.role === 'admin') && (
              <a href={`/${tenantSlug}/equipo`} onClick={(e) => handleSidebarNavigation(e, `/${tenantSlug}/equipo`)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-[#468DFF] font-semibold text-sm transition-all" title="Equipo de Trabajo">
                <Briefcase className="h-4.5 w-4.5 shrink-0" />
                {!isSidebarCollapsed && <span className="animate-fade-in">Equipo de Trabajo</span>}
              </a>
            )}
            <a href={`/${tenantSlug}/programa`} onClick={(e) => handleSidebarNavigation(e, `/${tenantSlug}/programa`)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-[#468DFF] font-semibold text-sm transition-all" title="Programa de Gestión Anual">
              <Calendar className="h-4.5 w-4.5 shrink-0" />
              {!isSidebarCollapsed && <span className="animate-fade-in">Programa de Gestión Anual</span>}
            </a>
            <a href={`/${tenantSlug}/capacitacion`} onClick={(e) => handleSidebarNavigation(e, `/${tenantSlug}/capacitacion`)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-[#468DFF] font-semibold text-sm transition-all" title="Programa de Capacitación Anual">
              <GraduationCap className="h-4.5 w-4.5 shrink-0" />
              {!isSidebarCollapsed && <span className="animate-fade-in">Programa de Capacitación Anual</span>}
            </a>
            <a href={`/${tenantSlug}/correctivas`} onClick={(e) => handleSidebarNavigation(e, `/${tenantSlug}/correctivas`)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-[#468DFF] font-semibold text-sm transition-all" title="Acciones Correctivas">
              <ClipboardList className="h-4.5 w-4.5 shrink-0" />
              {!isSidebarCollapsed && <span className="animate-fade-in">Acciones Correctivas</span>}
            </a>
            <a href={`/${tenantSlug}/extintores`} onClick={(e) => handleSidebarNavigation(e, `/${tenantSlug}/extintores`)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-[#468DFF] font-semibold text-sm transition-all" title="Extintores">
              <Flame className="h-4.5 w-4.5 shrink-0" />
              {!isSidebarCollapsed && <span className="animate-fade-in">Extintores</span>}
            </a>
            <a href={`/${tenantSlug}/visitas`} onClick={(e) => handleSidebarNavigation(e, `/${tenantSlug}/visitas`)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[#468DFF] text-white font-semibold text-sm transition-all shadow-md shadow-[#468DFF]/10" title="Constancia de Visita">
              <ClipboardCheck className="h-4.5 w-4.5 shrink-0" />
              {!isSidebarCollapsed && <span className="animate-fade-in">Constancia de Visita</span>}
            </a>

            <span className={`text-[10px] font-bold uppercase tracking-wider text-white/30 px-3 block pt-6 mb-2 truncate ${isSidebarCollapsed ? 'opacity-0' : ''}`}>Configuración</span>
            <a href={`/${tenantSlug}/profile`} onClick={(e) => handleSidebarNavigation(e, `/${tenantSlug}/profile`)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-[#468DFF] font-semibold text-sm transition-all" title="Editar Perfil">
              <Settings className="h-4.5 w-4.5 shrink-0" />
              {!isSidebarCollapsed && <span className="animate-fade-in">Editar Perfil</span>}
            </a>
          </nav>
        </div>

        <div className="pt-4 border-t border-white/5">
          <div className="flex items-center gap-3 rounded-xl bg-black/30 p-2.5 border border-white/5 overflow-hidden">
            <div className="truncate pr-1 flex-1">
              {!isSidebarCollapsed ? (
                <>
                  <span className="text-xs font-bold text-white block truncate">{profile?.full_name || 'Usuario'}</span>
                  <span className="text-[9px] text-white/40 block truncate uppercase tracking-wider">{profile?.role || 'Profesional'}</span>
                </>
              ) : (
                <div className="h-5 w-5 bg-white/5 rounded-full flex items-center justify-center text-white/60 font-bold text-[10px] uppercase">
                  {profile?.full_name?.[0] || 'U'}
                </div>
              )}
            </div>
            {!isSidebarCollapsed && (
              <button onClick={handleLogout} className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-600 hover:text-white transition-all cursor-pointer shrink-0">
                <LogOut className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full bg-[#FFFFFF] overflow-hidden">
        
        {/* Navbar / Top Bar */}
        <header className="h-16 border-b border-slate-200 px-6 flex items-center justify-between bg-white shrink-0 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 md:hidden cursor-pointer">
              <Menu className="h-5 w-5" />
            </button>
            <ClipboardCheck className="h-5 w-5 text-[#468DFF]" />
            <h1 className="font-outfit text-lg font-bold text-slate-900 leading-none">Constancia de Visita</h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-600 hidden sm:block">
              {tenant?.name || 'Cargando...'}
            </div>
            <div className="px-2.5 py-1 rounded-lg bg-[#468DFF]/15 text-[#468DFF] text-[10px] font-bold uppercase tracking-wider border border-[#468DFF]/25">
              Plan {tenant?.plan_id || 'Pro'}
            </div>
          </div>
        </header>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-syso-bg">
          <div className="max-w-[95%] mx-auto space-y-6">

            {/* LISTADO DE VISITAS */}
            {!isFormOpen && (
              <>
                {/* Herramientas, Búsqueda y Filtros */}
                <div className="bg-white rounded-2xl border border-slate-150 p-3 shadow-sm space-y-3 shrink-0">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    
                    {/* Buscador de texto */}
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
                      <input 
                        type="text" 
                        placeholder="Buscar por profesional, responsable, observaciones..."
                        value={filterText}
                        onChange={(e) => setFilterText(e.target.value)}
                        className="w-full pl-9 pr-4 py-1.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all text-slate-700 placeholder-slate-400"
                      />
                    </div>

                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => {
                          setFecha(new Date().toISOString().split('T')[0]);
                          setProfesionalTipo('miembro');
                          if (profile?.role !== 'inspector') {
                            setProfesionalId(profile?.id || '');
                          }
                          setIsFormOpen(true);
                        }}
                        className="px-3.5 py-1.5 bg-[#468DFF] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 hover:bg-[#0511F2] transition-all cursor-pointer shadow-md shadow-[#468DFF]/10 shrink-0"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Nueva Constancia
                      </button>
                    </div>
                  </div>

                  {/* Filtros avanzados colapsables */}
                  <div className="pt-2 border-t border-slate-100 space-y-2">
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

                      {(filterText || filterEmpresa || filterEstablecimiento) && (
                        <button 
                          onClick={() => {
                            setFilterText('');
                            setFilterEmpresa('');
                            setFilterEstablecimiento('');
                          }}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[10px] font-semibold cursor-pointer transition-all border border-slate-200"
                        >
                          Limpiar Filtros
                        </button>
                      )}
                    </div>

                    {showFilters && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 pt-1 animate-fade-in">
                        {/* Selector Cliente */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Filtrar por Cliente</label>
                          <select 
                            value={filterEmpresa}
                            onChange={(e) => {
                              setFilterEmpresa(e.target.value);
                              setFilterEstablecimiento('');
                            }}
                            className="border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-600 focus:outline-none focus:border-[#468DFF] text-xs w-full cursor-pointer"
                          >
                            <option value="">Todos los Clientes</option>
                            {empresas.map(e => (
                              <option key={e.id} value={e.id}>{e.razon_social}</option>
                            ))}
                          </select>
                        </div>

                        {/* Selector Establecimiento */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Filtrar por Establecimiento</label>
                          <select 
                            value={filterEstablecimiento}
                            onChange={(e) => setFilterEstablecimiento(e.target.value)}
                            disabled={!filterEmpresa}
                            className="border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-600 focus:outline-none focus:border-[#468DFF] text-xs w-full cursor-pointer disabled:bg-slate-50 disabled:text-slate-400"
                          >
                            <option value="">Todos los Establecimientos</option>
                            {allEstablecimientos
                              .filter(est => est.empresa_id === filterEmpresa)
                              .map(est => (
                                <option key={est.id} value={est.id}>{est.denominacion}</option>
                              ))
                            }
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Tabla de Resultados */}
                <div className="bg-white rounded-2xl border border-slate-150 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-150 text-xs font-bold text-slate-400 uppercase tracking-wider">
                          <th className="px-6 py-4 cursor-pointer hover:text-slate-700" onClick={() => handleSort('cliente')}>Cliente</th>
                          <th className="px-6 py-4 cursor-pointer hover:text-slate-700" onClick={() => handleSort('establecimiento')}>Establecimiento</th>
                          <th className="px-6 py-4 cursor-pointer hover:text-slate-700" onClick={() => handleSort('fecha')}>Fecha</th>
                          <th className="px-6 py-4 cursor-pointer hover:text-slate-700" onClick={() => handleSort('profesional_nombre')}>Profesional</th>
                          <th className="px-6 py-4">Responsable Presente</th>
                          <th className="px-6 py-4">Incidentes</th>
                          <th className="px-6 py-4 text-right">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-sm">
                        {sortedVisitas.length === 0 ? (
                          <tr>
                            <td colSpan="7" className="text-center py-10 text-slate-400 font-medium bg-slate-50/20">
                              No se encontraron constancias de visita cargadas.
                            </td>
                          </tr>
                        ) : (
                          sortedVisitas.map((v) => {
                            const emp = empresas.find(e => e.id === v.empresa_id);
                            const est = allEstablecimientos.find(e => e.id === v.establecimiento_id);
                            return (
                              <tr key={v.id} className="hover:bg-slate-50/50 cursor-pointer" onClick={() => handleEditClick(v)}>
                                <td className="px-6 py-4 font-semibold text-slate-900">{emp ? emp.razon_social : 'N/A'}</td>
                                <td className="px-6 py-4 font-medium text-slate-600">{est ? est.denominacion : 'N/A'}</td>
                                <td className="px-6 py-4 font-semibold text-slate-600">{formatDate(v.fecha)}</td>
                                <td className="px-6 py-4 text-slate-600">{v.profesional_nombre}</td>
                                <td className="px-6 py-4 text-slate-500">{v.responsable_presente}</td>
                                <td className="px-6 py-4">
                                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
                                    v.ocurrieron_incidentes
                                      ? 'bg-red-50 text-red-600 border-red-150'
                                      : 'bg-green-50 text-green-600 border-green-150'
                                  }`}>
                                    {v.ocurrieron_incidentes ? 'Sí' : 'No'}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                                  <div className="flex items-center justify-end gap-2">
                                    <button 
                                      onClick={() => handleGeneratePdf(v)}
                                      className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-all cursor-pointer"
                                      title="Descargar PDF"
                                    >
                                      <Download className="h-4.5 w-4.5" />
                                    </button>
                                    <button 
                                      onClick={() => handleOpenMailModal(v)}
                                      className="p-1.5 rounded-lg bg-blue-50 hover:bg-[#468DFF]/25 text-[#468DFF] transition-all cursor-pointer"
                                      title="Enviar por Correo"
                                    >
                                      <Mail className="h-4.5 w-4.5" />
                                    </button>
                                    <button 
                                      onClick={() => handleEditClick(v)}
                                      className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-600 transition-all cursor-pointer"
                                      title="Editar Constancia"
                                    >
                                      <Edit className="h-4.5 w-4.5" />
                                    </button>
                                    <button 
                                      onClick={() => handleDeleteClick(v.id)}
                                      className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition-all cursor-pointer"
                                      title="Eliminar Constancia"
                                    >
                                      <Trash2 className="h-4.5 w-4.5" />
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
              </>
            )}

            {/* FORMULARIO INLINE */}
            {isFormOpen && (
              <div className="bg-syso-bg rounded-2xl border border-slate-150 shadow-sm overflow-hidden animate-fade-in">
                
                {/* Cabecera del formulario */}
                <div className="px-6 py-4 bg-slate-50 border-b border-slate-150 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button onClick={handleExitForm} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 cursor-pointer">
                      <ArrowLeft className="h-5 w-5" />
                    </button>
                    <span className="font-outfit text-base font-bold text-slate-900">
                      {editingId ? 'Editar Constancia de Visita' : 'Registrar Nueva Constancia de Visita'}
                    </span>
                  </div>
                  <button onClick={handleExitForm} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-200 cursor-pointer">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Formulario */}
                <form onSubmit={handleSaveVisita} className="p-6 space-y-6">
                  
                  {/* SECCIÓN 1: DATOS GENERALES */}
                  <div className="space-y-4">
                    <h3 className="font-outfit text-sm font-bold text-slate-800 border-b border-slate-100 pb-1.5 uppercase tracking-wider flex items-center gap-2">
                      <Building className="h-4 w-4 text-[#468DFF]" />
                      1. Información del Establecimiento y Fecha
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      
                      {/* Razón Social (Empresa) */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-600">Razón Social *</label>
                        <select
                          value={empresaId}
                          onChange={(e) => {
                            setEmpresaId(e.target.value);
                            setEstablecimientoId('');
                          }}
                          required
                          className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50"
                        >
                          <option value="">Seleccionar Cliente...</option>
                          {empresas.map(e => (
                            <option key={e.id} value={e.id}>{e.razon_social}</option>
                          ))}
                        </select>
                      </div>

                      {/* Establecimiento */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-600">Establecimiento *</label>
                        <select
                          value={establecimientoId}
                          onChange={(e) => setEstablecimientoId(e.target.value)}
                          required
                          disabled={!empresaId}
                          className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 disabled:bg-slate-100 disabled:text-slate-400"
                        >
                          <option value="">Seleccionar Establecimiento...</option>
                          {filteredEstablecimientos.map(est => (
                            <option key={est.id} value={est.id}>{est.denominacion}</option>
                          ))}
                        </select>
                      </div>

                      {/* CUIT (Auto) */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-500">C.U.I.T. (Lectura)</label>
                        <input
                          type="text"
                          value={derivedCuit}
                          readOnly
                          placeholder="CUIT automático"
                          className="w-full border border-slate-150 rounded-xl px-3.5 py-2 text-sm bg-slate-100 text-slate-500 outline-none"
                        />
                      </div>

                      {/* Dirección (Auto) */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-500">Dirección (Lectura)</label>
                        <input
                          type="text"
                          value={derivedDireccion}
                          readOnly
                          placeholder="Dirección automática"
                          className="w-full border border-slate-150 rounded-xl px-3.5 py-2 text-sm bg-slate-100 text-slate-500 outline-none truncate"
                        />
                      </div>

                      {/* Fecha de visita */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-600">Fecha *</label>
                        <input
                          type="date"
                          value={fecha}
                          onChange={(e) => setFecha(e.target.value)}
                          required
                          className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50"
                        />
                      </div>

                      {/* Profesional Interviniente tipo */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-600">Tipo de Carga Profesional *</label>
                        <div className="flex items-center gap-3 py-1">
                          <label className="inline-flex items-center gap-1.5 text-sm font-semibold cursor-pointer">
                            <input 
                              type="radio" 
                              name="prof_tipo"
                              checked={profesionalTipo === 'miembro'}
                              onChange={() => {
                                setProfesionalTipo('miembro');
                                setProfesionalNombre('');
                              }}
                              className="accent-[#468DFF] h-4 w-4"
                            />
                            Miembro del Equipo
                          </label>
                          <label className="inline-flex items-center gap-1.5 text-sm font-semibold cursor-pointer">
                            <input 
                              type="radio" 
                              name="prof_tipo"
                              checked={profesionalTipo === 'manual'}
                              onChange={() => {
                                setProfesionalTipo('manual');
                                setProfesionalId('');
                              }}
                              className="accent-[#468DFF] h-4 w-4"
                            />
                            Ingresar Manualmente
                          </label>
                        </div>
                      </div>

                      {/* Profesional - Miembro dropdown */}
                      {profesionalTipo === 'miembro' ? (
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-bold text-slate-600">Profesional del Equipo *</label>
                          <select
                            value={profesionalId}
                            onChange={(e) => setProfesionalId(e.target.value)}
                            required
                            className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50"
                          >
                            <option value="">Seleccionar Miembro...</option>
                            {miembrosList.map(m => (
                              <option key={m.id} value={m.id}>{m.full_name}</option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-bold text-slate-600">Nombre Profesional (Manual) *</label>
                          <input
                            type="text"
                            placeholder="Nombre y Apellido del Profesional"
                            value={profesionalNombre}
                            onChange={(e) => setProfesionalNombre(e.target.value)}
                            required
                            className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50"
                          />
                        </div>
                      )}

                      {/* Responsable presente */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-600">Nombre del Responsable Presente *</label>
                        <input
                          type="text"
                          placeholder="Nombre del Responsable"
                          value={responsablePresente}
                          onChange={(e) => setResponsablePresente(e.target.value)}
                          required
                          className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50"
                        />
                      </div>

                    </div>
                  </div>

                  {/* SECCIÓN 2: GESTIÓN DE ACCIDENTES E INCIDENTES */}
                  <div className="space-y-4 pt-4">
                    <h3 className="font-outfit text-sm font-bold text-slate-800 border-b border-slate-100 pb-1.5 uppercase tracking-wider flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                      2. Siniestralidad e Incidentes Laborales
                    </h3>

                    <div className="space-y-4">
                      {/* Ocurrencia de incidentes */}
                      <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold text-slate-600">¿Ocurrieron incidentes o accidentes laborales desde la última visita? *</label>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setOcurrieronIncidentes(true)}
                            className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all cursor-pointer ${
                              ocurrieronIncidentes
                                ? 'bg-red-500 text-white border-red-500 shadow-md shadow-red-500/10'
                                : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                            }`}
                          >
                            Sí
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setOcurrieronIncidentes(false);
                              setAnalisisCorrespondiente('N/A');
                              setCausaRaiz('');
                              setAccionCorrectiva('');
                            }}
                            className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all cursor-pointer ${
                              !ocurrieronIncidentes
                                ? 'bg-green-600 text-white border-green-600 shadow-md shadow-green-600/10'
                                : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                            }`}
                          >
                            No
                          </button>
                        </div>
                      </div>

                      {/* Campos dinámicos condicionales a Sí */}
                      {ocurrieronIncidentes && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50/50 p-4 border border-slate-150 rounded-2xl animate-fade-in">
                          
                          {/* Análisis de causa */}
                          <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-slate-600">¿Se realizó el análisis correspondiente (causa raíz, correctivas)? *</label>
                            <div className="flex items-center gap-2">
                              {['Sí', 'No', 'N/A'].map(opt => (
                                <button
                                  key={opt}
                                  type="button"
                                  onClick={() => setAnalisisCorrespondiente(opt)}
                                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                                    analisisCorrespondiente === opt
                                      ? 'bg-[#468DFF] text-white border-[#468DFF]'
                                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                                  }`}
                                >
                                  {opt}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Causa raíz */}
                          <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-slate-600">¿Cuál fue la causa raíz? *</label>
                            <input
                              type="text"
                              placeholder="Causa raíz identificada"
                              value={causaRaiz}
                              onChange={(e) => setCausaRaiz(e.target.value)}
                              required={ocurrieronIncidentes}
                              className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-white"
                            />
                          </div>

                          {/* Acción correctiva */}
                          <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-slate-600">¿Qué acción correctiva se planificó / realizó? *</label>
                            <input
                              type="text"
                              placeholder="Acción correctiva"
                              value={accionCorrectiva}
                              onChange={(e) => setAccionCorrectiva(e.target.value)}
                              required={ocurrieronIncidentes}
                              className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-white"
                            />
                          </div>

                        </div>
                      )}
                    </div>
                  </div>

                  {/* SECCIÓN 3: RELEVAMIENTOS DE HIGIENE, SEGURIDAD Y MEDICIONES */}
                  <div className="space-y-4 pt-4">
                    <h3 className="font-outfit text-sm font-bold text-slate-800 border-b border-slate-100 pb-1.5 uppercase tracking-wider flex items-center gap-2">
                      <ClipboardList className="h-4 w-4 text-emerald-600" />
                      3. Relevamientos y Evaluaciones Técnicas
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      
                      {/* Relevamiento condiciones de Higiene y Seguridad */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-600">Relevamiento Higiene y Seguridad *</label>
                        <div className="flex items-center gap-1.5">
                          {['Sí', 'No', 'N/A'].map(opt => (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => setRelevamientoHigieneSeguridad(opt)}
                              className={`flex-1 py-2 rounded-xl text-sm font-bold border transition-all cursor-pointer ${
                                relevamientoHigieneSeguridad === opt
                                  ? 'bg-[#468DFF] text-white border-[#468DFF] shadow-sm'
                                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                              }`}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Relevamiento prácticas de trabajo seguro */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-600">Relevamiento Actos Inseguros *</label>
                        <div className="flex items-center gap-1.5">
                          {['Sí', 'No', 'N/A'].map(opt => (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => setRelevamientoPracticasSeguras(opt)}
                              className={`flex-1 py-2 rounded-xl text-sm font-bold border transition-all cursor-pointer ${
                                relevamientoPracticasSeguras === opt
                                  ? 'bg-[#468DFF] text-white border-[#468DFF] shadow-sm'
                                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                              }`}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Relevamiento uso adecuado de EPP */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-600">Relevamiento Uso de EPP *</label>
                        <div className="flex items-center gap-1.5">
                          {['Sí', 'No', 'N/A'].map(opt => (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => setRelevamientoEpp(opt)}
                              className={`flex-1 py-2 rounded-xl text-sm font-bold border transition-all cursor-pointer ${
                                relevamientoEpp === opt
                                  ? 'bg-[#468DFF] text-white border-[#468DFF] shadow-sm'
                                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                              }`}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* ¿Se realizaron mediciones o evaluaciones técnicas? */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-600">¿Realizaron Mediciones? *</label>
                        <div className="flex items-center gap-1.5">
                          {['Sí', 'No', 'N/A'].map(opt => (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => {
                                setRealizaronMediciones(opt);
                                if (opt !== 'Sí') {
                                  setSelectedMediciones([]);
                                }
                              }}
                              className={`flex-1 py-2 rounded-xl text-sm font-bold border transition-all cursor-pointer ${
                                realizaronMediciones === opt
                                  ? 'bg-[#468DFF] text-white border-[#468DFF] shadow-sm'
                                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                              }`}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      </div>

                    </div>

                    {/* Mediciones condicionales a Sí */}
                    {realizaronMediciones === 'Sí' && (
                      <div className="bg-slate-50/50 p-4 border border-slate-150 rounded-2xl space-y-3 animate-fade-in">
                        <label className="text-xs font-bold text-slate-600 block">Mediciones de contaminantes físicos/químicos o evaluaciones técnicas:</label>
                        
                        <div className="flex flex-wrap gap-2">
                          {MEDICIONES_OPTS.map(m => {
                            const isSel = selectedMediciones.includes(m);
                            return (
                              <button
                                key={m}
                                type="button"
                                onClick={() => handleToggleMedicion(m)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                                  isSel
                                    ? 'bg-[#468DFF]/15 border-[#468DFF] text-[#468DFF]'
                                    : 'bg-white border-slate-200 hover:bg-slate-50'
                                }`}
                              >
                                {m}
                              </button>
                            );
                          })}
                        </div>

                        {/* Agregar otra medición manualmente */}
                        <div className="flex gap-2 max-w-md">
                          <input
                            type="text"
                            placeholder="Agregar otra medición..."
                            value={medicionCustomText}
                            onChange={(e) => setMedicionCustomText(e.target.value)}
                            className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-[#468DFF] bg-white"
                          />
                          <button
                            type="button"
                            onClick={handleAddCustomMedicion}
                            className="px-3 py-1.5 bg-[#468DFF] hover:bg-[#0511F2] text-white text-xs font-bold rounded-lg cursor-pointer"
                          >
                            Agregar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* SECCIÓN 4: CAPACITACIONES, SIMULACROS Y LEGAJO */}
                  <div className="space-y-4 pt-4">
                    <h3 className="font-outfit text-sm font-bold text-slate-800 border-b border-slate-100 pb-1.5 uppercase tracking-wider flex items-center gap-2">
                      <GraduationCap className="h-4.5 w-4.5 text-indigo-500" />
                      4. Capacitaciones, Simulacros y Legajo Técnico
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      
                      {/* ¿Se verificó implementación de correctivas? */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-600">¿Verificó correctivas previas? *</label>
                        <div className="flex items-center gap-1.5">
                          {['Sí', 'No', 'N/A'].map(opt => (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => setVerificoAccionesCorrectivas(opt)}
                              className={`flex-1 py-2 rounded-xl text-sm font-bold border transition-all cursor-pointer ${
                                verificoAccionesCorrectivas === opt
                                  ? 'bg-[#468DFF] text-white border-[#468DFF] shadow-sm'
                                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                              }`}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* ¿Se dictaron capacitaciones? */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-600">¿Se dictaron capacitaciones? *</label>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setDictaronCapacitaciones(true)}
                            className={`flex-1 py-2 rounded-xl text-sm font-bold border transition-all cursor-pointer ${
                              dictaronCapacitaciones
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            Sí
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setDictaronCapacitaciones(false);
                              setSelectedTemas([]);
                            }}
                            className={`flex-1 py-2 rounded-xl text-sm font-bold border transition-all cursor-pointer ${
                              !dictaronCapacitaciones
                                ? 'bg-[#00b050] text-white border-[#00b050] shadow-sm'
                                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            No
                          </button>
                        </div>
                      </div>

                      {/* ¿Se realizaron simulacros? */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-600">¿Se realizaron simulacros? *</label>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setRealizaronSimulacros(true)}
                            className={`flex-1 py-2 rounded-xl text-sm font-bold border transition-all cursor-pointer ${
                              realizaronSimulacros
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            Sí
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setRealizaronSimulacros(false);
                              setSelectedSimulacros([]);
                            }}
                            className={`flex-1 py-2 rounded-xl text-sm font-bold border transition-all cursor-pointer ${
                              !realizaronSimulacros
                                ? 'bg-[#00b050] text-white border-[#00b050] shadow-sm'
                                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            No
                          </button>
                        </div>
                      </div>

                    </div>

                    {/* Especificar temas capacitados (condicional) */}
                    {dictaronCapacitaciones && (
                      <div className="bg-slate-50/50 p-4 border border-slate-150 rounded-2xl space-y-3 animate-fade-in relative">
                        <label className="text-xs font-bold text-slate-600 block">Especificar Temas Capacitados:</label>
                        
                        {/* Selector multiselect dropdown interactivo */}
                        <div className="relative">
                          <div 
                            onClick={() => setIsTemasDropdownOpen(!isTemasDropdownOpen)}
                            className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm bg-white cursor-pointer flex justify-between items-center"
                          >
                            <span className="text-slate-500">
                              {selectedTemas.length === 0 
                                ? 'Seleccione temas...' 
                                : `${selectedTemas.length} tema(s) seleccionado(s)`}
                            </span>
                            <span className="text-slate-400">▼</span>
                          </div>

                          {isTemasDropdownOpen && (
                            <>
                              <div className="fixed inset-0 z-20" onClick={() => setIsTemasDropdownOpen(false)} />
                              <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-30 max-h-60 overflow-y-auto p-3 space-y-2">
                                <input
                                  type="text"
                                  placeholder="Filtrar temas..."
                                  value={searchTopicTerm}
                                  onChange={(e) => setSearchTopicTerm(e.target.value)}
                                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-[#468DFF]"
                                />
                                <div className="divide-y divide-slate-100 max-h-40 overflow-y-auto">
                                  {temasList
                                    .filter(t => t.tema.toLowerCase().includes(searchTopicTerm.toLowerCase()))
                                    .map(t => {
                                      const isChecked = selectedTemas.includes(t.tema);
                                      return (
                                        <label key={t.id} className="flex items-center gap-2 py-1.5 text-xs font-semibold hover:bg-slate-50 cursor-pointer px-1">
                                          <input
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={() => handleToggleTemaCapacitacion(t.tema)}
                                            className="accent-[#468DFF]"
                                          />
                                          {t.tema}
                                        </label>
                                      );
                                    })
                                  }
                                </div>
                              </div>
                            </>
                          )}
                        </div>

                        {/* Temas seleccionados (visuales) */}
                        <div className="flex flex-wrap gap-1.5">
                          {selectedTemas.map(t => (
                            <span key={t} className="px-2 py-1 rounded bg-indigo-50 border border-indigo-150 text-indigo-600 text-xs font-semibold flex items-center gap-1">
                              {t}
                              <button type="button" onClick={() => handleToggleTemaCapacitacion(t)} className="hover:text-red-500 text-[10px] font-bold">×</button>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Especificar simulacros (condicional) */}
                    {realizaronSimulacros && (
                      <div className="bg-slate-50/50 p-4 border border-slate-150 rounded-2xl space-y-3 animate-fade-in">
                        <label className="text-xs font-bold text-slate-600 block">Especificar tipo de simulacro:</label>
                        
                        <div className="flex flex-wrap gap-2">
                          {SIMULACROS_OPTS.map(s => {
                            const isSel = selectedSimulacros.includes(s);
                            return (
                              <button
                                key={s}
                                type="button"
                                onClick={() => handleToggleSimulacro(s)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                                  isSel
                                    ? 'bg-[#468DFF]/15 border-[#468DFF] text-[#468DFF]'
                                    : 'bg-white border-slate-200 hover:bg-slate-50'
                                }`}
                              >
                                {s}
                              </button>
                            );
                          })}
                        </div>

                        {/* Agregar simulacro manual */}
                        <div className="flex gap-2 max-w-md">
                          <input
                            type="text"
                            placeholder="Agregar otro tipo de simulacro..."
                            value={simulacroCustomText}
                            onChange={(e) => setSimulacroCustomText(e.target.value)}
                            className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-[#468DFF] bg-white"
                          />
                          <button
                            type="button"
                            onClick={handleAddCustomSimulacro}
                            className="px-3 py-1.5 bg-[#468DFF] hover:bg-[#0511F2] text-white text-xs font-bold rounded-lg cursor-pointer"
                          >
                            Agregar
                          </button>
                        </div>
                      </div>
                    )}

                    {/* ¿Se emite aviso de riesgo? */}
                    <div className="flex flex-col gap-2 pt-2">
                      <label className="text-xs font-bold text-slate-600">¿Se emite aviso de riesgo por condiciones inseguras / actos inseguros? *</label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setEmiteAvisoRiesgo(true)}
                          className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all cursor-pointer ${
                            emiteAvisoRiesgo
                              ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          Sí
                        </button>
                        <button
                          type="button"
                          onClick={() => setEmiteAvisoRiesgo(false)}
                          className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all cursor-pointer ${
                            !emiteAvisoRiesgo
                              ? 'bg-green-600 text-white border-green-600 shadow-sm'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          No
                        </button>
                      </div>
                    </div>

                    {/* Documentación incorporada al Legajo */}
                    <div className="bg-slate-50/50 p-4 border border-slate-150 rounded-2xl space-y-3">
                      <label className="text-xs font-bold text-slate-600 block">Documentación incorporada al Legajo de SySO:</label>
                      
                      <div className="flex flex-wrap gap-2">
                        {DOCUMENTACION_OPTS.map(d => {
                          const isSel = selectedDocumentacion.includes(d);
                          return (
                            <button
                              key={d}
                              type="button"
                              onClick={() => handleToggleDocumentacion(d)}
                              className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold border transition-all cursor-pointer ${
                                isSel
                                  ? 'bg-[#468DFF]/15 border-[#468DFF] text-[#468DFF]'
                                  : 'bg-white border-slate-200 hover:bg-slate-50'
                              }`}
                            >
                              {d}
                            </button>
                          );
                        })}
                      </div>

                      {/* Agregar documentación manual */}
                      <div className="flex gap-2 max-w-md">
                        <input
                          type="text"
                          placeholder="Agregar otra documentación..."
                          value={documentacionCustomText}
                          onChange={(e) => setDocumentacionCustomText(e.target.value)}
                          className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-[#468DFF] bg-white"
                        />
                        <button
                          type="button"
                          onClick={handleAddCustomDocumentacion}
                          className="px-3 py-1.5 bg-[#468DFF] hover:bg-[#0511F2] text-white text-xs font-bold rounded-lg cursor-pointer"
                        >
                          Agregar
                        </button>
                      </div>
                    </div>

                  </div>

                  {/* SECCIÓN 5: RECOMENDACIONES, REGISTROS FOTOGRÁFICOS Y OBSERVACIONES */}
                  <div className="space-y-4 pt-4">
                    <h3 className="font-outfit text-sm font-bold text-slate-800 border-b border-slate-100 pb-1.5 uppercase tracking-wider flex items-center gap-2">
                      <ImageIcon className="h-4.5 w-4.5 text-[#468DFF]" />
                      5. Recomendaciones y Registros Fotográficos
                    </h3>

                    <div className="grid grid-cols-1 gap-4">
                      
                      {/* Observaciones y recomendaciones preventivas */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-600">Observaciones y recomendaciones preventivas (Se imprimen en el PDF)</label>
                        <textarea
                          rows="4"
                          placeholder="Escriba aquí los desvíos detectados y las recomendaciones preventivas específicas..."
                          value={observacionesRecomendaciones}
                          onChange={(e) => setObservacionesRecomendaciones(e.target.value)}
                          className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50"
                        />
                      </div>

                      {/* Adjuntar registros fotográficos */}
                      <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold text-slate-600">Adjuntar registros fotográficos (Mediciones, constancia física, firmas escritas, etc.)</label>
                        
                        <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl p-6 text-center space-y-4">
                          <div className="flex justify-center gap-4">
                            
                            {/* Cámara */}
                            <label className="px-4 py-2 bg-slate-150 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-all">
                              <Camera className="h-4 w-4 text-[#468DFF]" />
                              Capturar Foto (Cámara)
                              <input
                                type="file"
                                accept="image/*"
                                capture="environment"
                                onChange={handleCapturePhoto}
                                className="hidden"
                              />
                            </label>

                            {/* Archivos */}
                            <label className="px-4 py-2 bg-slate-150 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-all">
                              <Upload className="h-4 w-4 text-[#468DFF]" />
                              Seleccionar Archivos
                              <input
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={handleAddPhotos}
                                className="hidden"
                              />
                            </label>
                          </div>
                          
                          <p className="text-[10px] text-slate-400 font-medium">PNG, JPG o JPEG de hasta 5 MB por archivo</p>
                        </div>

                        {/* Grid de previsualización */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 pt-2">
                          {fotosFiles.map((foto, idx) => (
                            <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 bg-slate-100 group shadow-sm">
                              <img src={foto.preview} alt="Vista previa" className="w-full h-full object-cover" />
                              <button
                                type="button"
                                onClick={() => handleRemovePhoto(idx)}
                                className="absolute top-1.5 right-1.5 p-1 bg-red-600 text-white rounded-lg opacity-90 hover:bg-red-700 transition-all cursor-pointer"
                              >
                                <Trash className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Observaciones generales (internas) */}
                      <div className="flex flex-col gap-1.5 pt-2">
                        <label className="text-xs font-bold text-slate-600">Observaciones y notas internas (Último campo del formulario, se imprime en el PDF)</label>
                        <textarea
                          rows="3"
                          placeholder="Notas internas adicionales, detalles de la coordinación, observaciones finales..."
                          value={observaciones}
                          onChange={(e) => setObservaciones(e.target.value)}
                          className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50"
                        />
                      </div>

                    </div>
                  </div>

                  {/* SECCIÓN 6: FIRMAS DIGITALES DE LA VISITA */}
                  <div className="space-y-4 pt-4">
                    <h3 className="font-outfit text-sm font-bold text-slate-800 border-b border-slate-100 pb-1.5 uppercase tracking-wider flex items-center gap-2">
                      <Check className="h-4.5 w-4.5 text-[#00b050]" />
                      6. Firmas de la Constancia (Canvas de Dibujo)
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      
                      {/* Firma 1: Responsable Empresa */}
                      <div className="space-y-2 flex flex-col">
                        <div className="flex justify-between items-center">
                          <label className="text-xs font-bold text-slate-600">Firma del Responsable de la Empresa *</label>
                          {(hasSignedResp || firmaRespSavedUrl) && (
                            <button
                              type="button"
                              onClick={() => handleClearCanvas(firmaRespCanvasRef, setHasSignedResp, setFirmaRespSavedUrl)}
                              className="text-[10px] font-bold text-red-500 hover:text-red-700 cursor-pointer"
                            >
                              Limpiar Firma
                            </button>
                          )}
                        </div>

                        {/* Cuadro de Firma (Canvas o Visualización de guardada) */}
                        <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl aspect-[2/1] relative overflow-hidden flex items-center justify-center">
                          {firmaRespSavedUrl && !hasSignedResp ? (
                            <img src={firmaRespSavedUrl} alt="Firma Responsable" className="w-full h-full object-contain p-2" />
                          ) : (
                            <canvas
                              ref={firmaRespCanvasRef}
                              width={400}
                              height={200}
                              className="w-full h-full bg-white block cursor-crosshair"
                            />
                          )}
                          {!hasSignedResp && !firmaRespSavedUrl && (
                            <span className="absolute pointer-events-none text-[10px] text-slate-400 font-bold uppercase tracking-wider">Dibuje la firma aquí</span>
                          )}
                        </div>
                      </div>

                      {/* Firma 2: Profesional Higiene y Seguridad */}
                      <div className="space-y-2 flex flex-col">
                        <div className="flex justify-between items-center">
                          <label className="text-xs font-bold text-slate-600">Firma del Profesional de Higiene y Seguridad *</label>
                          {(hasSignedProf || firmaProfSavedUrl) && (
                            <button
                              type="button"
                              onClick={() => handleClearCanvas(firmaProfCanvasRef, setHasSignedProf, setFirmaProfSavedUrl)}
                              className="text-[10px] font-bold text-red-500 hover:text-red-700 cursor-pointer"
                            >
                              Limpiar Firma
                            </button>
                          )}
                        </div>

                        {/* Cuadro de Firma */}
                        <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl aspect-[2/1] relative overflow-hidden flex items-center justify-center">
                          {firmaProfSavedUrl && !hasSignedProf ? (
                            <img src={firmaProfSavedUrl} alt="Firma Profesional" className="w-full h-full object-contain p-2" />
                          ) : (
                            <canvas
                              ref={firmaProfCanvasRef}
                              width={400}
                              height={200}
                              className="w-full h-full bg-white block cursor-crosshair"
                            />
                          )}
                          {!hasSignedProf && !firmaProfSavedUrl && (
                            <span className="absolute pointer-events-none text-[10px] text-slate-400 font-bold uppercase tracking-wider">Dibuje la firma aquí</span>
                          )}
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* Acciones del formulario */}
                  <div className="flex justify-between items-center pt-6 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={handleExitForm}
                      className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl text-sm transition-all cursor-pointer"
                    >
                      Salir
                    </button>
                    <button
                      type="submit"
                      disabled={saveLoading}
                      className="px-5 py-2.5 bg-[#468DFF] hover:bg-[#0511F2] text-white font-bold rounded-xl text-sm transition-all shadow-md shadow-[#468DFF]/10 cursor-pointer flex items-center gap-2 disabled:bg-slate-400"
                    >
                      {saveLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                      {editingId ? 'Guardar Cambios' : 'Registrar Constancia'}
                    </button>
                  </div>

                </form>
              </div>
            )}

          </div>
        </div>
      </main>

      {/* MODAL DE CORREO ELECTRÓNICO */}
      {isMailModalOpen && mailTargetVisita && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setIsMailModalOpen(false)} className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="bg-white rounded-2xl border border-slate-150 p-6 max-w-md w-full z-10 shadow-2xl relative space-y-4 animate-fade-in">
            
            <div className="flex justify-between items-center">
              <h4 className="font-outfit text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Mail className="h-4.5 w-4.5 text-[#468DFF]" />
                Enviar Constancia por Correo
              </h4>
              <button onClick={() => setIsMailModalOpen(false)} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 font-medium">
              Seleccione los contactos registrados de la empresa o ingrese correos electrónicos manualmente (separados por comas) para enviar la constancia de visita en PDF.
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
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#468DFF] bg-slate-50/50"
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

      {/* MODAL DE VISUALIZACIÓN DE FOTOS DE REGISTRO */}
      {viewingFotosVisita && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setViewingFotosVisita(null)} className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="bg-white rounded-2xl border border-slate-150 p-6 max-w-4xl w-full z-10 shadow-2xl relative space-y-4 animate-fade-in flex flex-col max-h-[85vh]">
            <div className="flex justify-between items-center shrink-0">
              <div>
                <h4 className="font-outfit text-sm font-bold text-slate-900 uppercase tracking-wider">Registros de Visita</h4>
                <p className="text-[10px] text-slate-500 font-semibold mt-0.5">{viewingFotosVisita.profesional_nombre} - {formatDate(viewingFotosVisita.fecha)}</p>
              </div>
              <button onClick={() => setViewingFotosVisita(null)} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0">
              {viewingFotosUrls.length === 0 ? (
                <div className="text-center py-12 text-slate-400 font-medium italic">Resolviendo imágenes del servidor...</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {viewingFotosUrls.map((url, i) => (
                    <div key={i} className="border border-slate-150 rounded-xl overflow-hidden shadow-sm aspect-video bg-slate-50 relative group">
                      <img src={url} alt={`Registro ${i + 1}`} className="w-full h-full object-contain" />
                      <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/60 text-white text-[10px] font-bold rounded">
                        Registro #{i + 1}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="flex justify-end pt-2 shrink-0">
              <button onClick={() => setViewingFotosVisita(null)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-lg cursor-pointer transition-all">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ALERTAS Y CONFIRMACIONES */}
      {modalAlert.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="bg-white rounded-2xl border border-slate-150 p-6 max-w-sm w-full z-10 shadow-2xl relative space-y-4 text-center animate-fade-in">
            <div className="w-12 h-12 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div className="space-y-2">
              <h4 className="font-outfit text-base font-bold text-slate-900 leading-none">{modalAlert.title}</h4>
              <p className="text-xs text-slate-500 leading-relaxed">{modalAlert.message}</p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={closeAlert}
                className="flex-1 py-2 border border-slate-200 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-100 transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (modalAlert.onConfirm) modalAlert.onConfirm();
                }}
                className="flex-1 py-2 bg-[#468DFF] hover:bg-[#0511F2] text-white text-xs font-bold rounded-lg transition-all shadow-md shadow-[#468DFF]/10 cursor-pointer"
              >
                {modalAlert.confirmText || 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST DE FEEDBACK */}
      {toast.show && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 border animate-fade-in ${
          toast.type === 'error' 
            ? 'bg-red-50 border-red-200 text-red-800' 
            : 'bg-green-50 border-green-200 text-green-800'
        }`}>
          <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
            toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-[#00b050] text-white'
          }`}>
            {toast.type === 'error' ? <AlertTriangle className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
          </div>
          <span className="text-xs font-semibold leading-none">{toast.message}</span>
        </div>
      )}

    </div>
  );
}
