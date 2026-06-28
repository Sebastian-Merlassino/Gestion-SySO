// src/app/[tenant-slug]/visitas/page.js
'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import { supabase } from '@/lib/supabase';
import { formatDate, formatAsDateInput, convertToDbDate } from '@/lib/utils';
import ImageUploadZone from '@/components/ui/ImageUploadZone';
import { 
  PlusCircle, 
  AlertCircle,
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
  Trash,
  FileText,
  Folder
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

const MONTHS_OPTS = [
  { value: '01', label: 'Enero' },
  { value: '02', label: 'Febrero' },
  { value: '03', label: 'Marzo' },
  { value: '04', label: 'Abril' },
  { value: '05', label: 'Mayo' },
  { value: '06', label: 'Junio' },
  { value: '07', label: 'Julio' },
  { value: '08', label: 'Agosto' },
  { value: '09', label: 'Septiembre' },
  { value: '10', label: 'Octubre' },
  { value: '11', label: 'Noviembre' },
  { value: '12', label: 'Diciembre' }
];

const getAvailableYears = (records) => {
  const years = records.map(r => r.fecha ? r.fecha.substring(0, 4) : '').filter(Boolean);
  const uniqueYears = [...new Set(years)];
  const currentYear = new Date().getFullYear().toString();
  if (!uniqueYears.includes(currentYear)) {
    uniqueYears.push(currentYear);
  }
  return uniqueYears.sort((a, b) => b.localeCompare(a));
};

export default function VisitasPage({ params }) {
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
  const [isReadOnlyView, setIsReadOnlyView] = useState(false);

  // Refs de Canvas para firmas
  const firmaRespCanvasRef = useRef(null);
  const firmaProfCanvasRef = useRef(null);

  // Banderas de si se ha firmado en el canvas en la sesión actual
  const [hasSignedResp, setHasSignedResp] = useState(false);
  const [hasSignedProf, setHasSignedProf] = useState(false);

  // URLs de previsualización para firmas guardadas (edición)
  const [firmaRespSavedUrl, setFirmaRespSavedUrl] = useState('');
  const [firmaProfSavedUrl, setFirmaProfSavedUrl] = useState('');
  const [firmaTipo, setFirmaTipo] = useState('perfil'); // 'perfil' o 'mano'
  const [signaturePath, setSignaturePath] = useState(''); // relative path of profile signature
  const [firmaPerfilPreviewUrl, setFirmaPerfilPreviewUrl] = useState(''); // preview URL of profile signature

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
  const [filterFecha, setFilterFecha] = useState('');
  const [filterAnio, setFilterAnio] = useState('');
  const [filterMes, setFilterMes] = useState('');
  const [showFilters, setShowFilters] = useState(false);

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

  const sectionPerms = getSectionPermissions(profile, 'visitas');
  const canCargar = sectionPerms.cargar;
  const canEditar = sectionPerms.editar;
  const canEliminar = sectionPerms.eliminar;
  const isFormDisabled = (editingId ? !canEditar : !canCargar) || isReadOnlyView;
  const canEdit = !isFormDisabled; // Maintain compatibility

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

  // Previsualización de firma de perfil técnica
  useEffect(() => {
    const resolveProfileSignaturePreview = async () => {
      setFirmaPerfilPreviewUrl('');
      if (!signaturePath || signaturePath === 'N/A' || firmaTipo !== 'perfil') return;

      if (signaturePath.startsWith('data:')) {
        setFirmaPerfilPreviewUrl(signaturePath);
      } else if (isDevMode || signaturePath.startsWith('mock')) {
        setFirmaPerfilPreviewUrl('/brand/logo-primary.png');
      } else {
        try {
          let relativePath = signaturePath;
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
              console.error('Error parseando URL de firma de perfil:', urlErr);
              isExternal = true;
            }
          }

          if (isExternal) {
            setFirmaPerfilPreviewUrl(signaturePath);
          } else {
            const { data: sData, error: sErr } = await supabase.storage
              .from('signatures')
              .createSignedUrl(relativePath, 3600);
            if (!sErr && sData?.signedUrl) {
              setFirmaPerfilPreviewUrl(sData.signedUrl);
            }
          }
        } catch (e) {
          console.error('Error cargando previsualización de firma de perfil:', e);
        }
      }
    };

    resolveProfileSignaturePreview();
  }, [signaturePath, firmaTipo, isDevMode]);

  // Setup de Canvas de dibujo para firmas
  useEffect(() => {
    if (!isFormOpen || !canEdit) return;

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
    setProfile({ full_name: 'Profesional de SySO (Mock)', role: 'admin' });
    setTenant({ id: 'mock-tenant', name: 'Consultora de Prueba', plan_id: 'free' });
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
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('user-profile', JSON.stringify(prof));
      }
      if (prof.role === 'cliente') {
        setIsReadOnlyView(true);
      }

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
      let empresasQuery = supabase
        .from('empresas')
        .select('id, razon_social, cuit, contactos_correos')
        .eq('tenant_id', ten.id);
      if (prof.role === 'cliente') {
        empresasQuery = empresasQuery.eq('id', prof.empresa_id);
      }
      const { data: emps, error: empErr } = await empresasQuery.order('razon_social');
      if (empErr) throw empErr;
      setEmpresas(emps || []);

      // Establecimientos
      let estsQuery = supabase
        .from('establecimientos')
        .select('id, empresa_id, denominacion, direccion')
        .eq('tenant_id', ten.id);
      if (prof.role === 'cliente') {
        estsQuery = estsQuery.eq('empresa_id', prof.empresa_id);
      }
      const { data: ests, error: estErr } = await estsQuery.order('denominacion');
      if (estErr) throw estErr;
      setAllEstablecimientos(ests || []);

      // Miembros de equipo
      const { data: mems, error: memErr } = await supabase
        .from('miembros_equipo')
        .select('id, full_name, signature_url, profile_id')
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
      let visitasQuery = supabase
        .from('visitas')
        .select('*')
        .eq('tenant_id', ten.id);
      if (prof.role === 'cliente') {
        visitasQuery = visitasQuery.eq('empresa_id', prof.empresa_id);
      }
      const { data: vis, error: visErr } = await visitasQuery.order('fecha', { ascending: false });
      if (visErr) throw visErr;

      setVisitas(vis || []);
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
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('user-profile');
    }
    window.location.href = '/login';
  };

  // Cierre de formulario con advertencia
  const handleExitForm = () => {
    if (isReadOnlyView) {
      handleCloseForm();
      return;
    }
    setModalAlert({
      show: true,
      title: 'Salir sin guardar',
      message: '¿Estás seguro de que deseas salir? Los cambios no guardados se perderán.',
      confirmText: 'Confirmar',
      onConfirm: () => {
        handleCloseForm();
        closeAlert();
      }
    });
  };

  const handleSidebarNavigation = (e, path) => {
    if (isFormOpen) {
      if (isReadOnlyView) {
        if (path.endsWith('/visitas')) {
          handleCloseForm();
        } else {
          window.location.href = path;
        }
        return;
      }
      e.preventDefault();
      setModalAlert({
        show: true,
        title: 'Salir sin guardar',
        message: '¿Estás seguro de que deseas salir? Los cambios no guardados se perderán.',
        confirmText: 'Confirmar',
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
  const handleAddNew = () => {
    setIsReadOnlyView(false);
    setEditingId(null);
    setEmpresaId('');
    setEstablecimientoId('');
    setFecha(formatDate(new Date().toISOString().split('T')[0]));
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
    
    // Auto-select logged-in user if they exist in miembros list
    const currentMember = miembrosList.find(m => m.profile_id === profile?.id);
    if (currentMember) {
      setProfesionalTipo('miembro');
      setProfesionalId(currentMember.id);
      setProfesionalNombre(currentMember.full_name);
      setSignaturePath(currentMember.signature_url || '');
      setFirmaTipo(currentMember.signature_url ? 'perfil' : 'mano');
    } else {
      setProfesionalTipo('miembro');
      setProfesionalId('');
      setProfesionalNombre('');
      setSignaturePath('');
      setFirmaTipo('perfil');
    }
    setIsFormOpen(true);
  };

  const handleProfesionalChange = (value) => {
    setProfesionalId(value);
    if (value === '__custom__') {
      setProfesionalTipo('manual');
      setProfesionalNombre('');
      setSignaturePath('');
      setFirmaTipo('mano');
    } else {
      setProfesionalTipo('miembro');
      const m = miembrosList.find(mem => mem.id === value);
      if (m) {
        setProfesionalNombre(m.full_name);
        setSignaturePath(m.signature_url || '');
        setFirmaTipo(m.signature_url ? 'perfil' : 'mano');
      } else {
        setProfesionalNombre('');
        setSignaturePath('');
        setFirmaTipo('perfil');
      }
    }
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
    if (!canEdit) {
      triggerToast('No tiene permisos para modificar constancias de visita.', 'error');
      return;
    }
    if (!empresaId || !establecimientoId || !fecha) {
      triggerToast('Complete la Razón Social, Establecimiento y Fecha.', 'error');
      return;
    }

    const finalProfNombre = profesionalTipo === 'miembro'
      ? (miembrosList.find(m => m.id === profesionalId)?.full_name || '')
      : profesionalNombre.trim();

    if (!finalProfNombre) {
      triggerToast('Especifique el profesional interviniente.', 'error');
      return;
    }

    setSaveLoading(true);
    try {
      const tempId = editingId || crypto.randomUUID();

      // Subir firmas si hay dibujos nuevos
      let finalFirmaResp = firmaRespSavedUrl;
      let finalFirmaProf = '';

      if (hasSignedResp && firmaRespCanvasRef.current) {
        finalFirmaResp = await uploadCanvasToStorage(firmaRespCanvasRef.current, 'firma_resp', tempId);
      }

      if (firmaTipo === 'perfil') {
        finalFirmaProf = signaturePath;
      } else {
        // firmaTipo === 'mano'
        if (hasSignedProf && firmaProfCanvasRef.current) {
          finalFirmaProf = await uploadCanvasToStorage(firmaProfCanvasRef.current, 'firma_prof', tempId);
        } else {
          // Si no se volvió a firmar a mano, recuperar firma previa
          const originalVisita = visitas.find(v => v.id === editingId);
          if (originalVisita && originalVisita.firma_tipo === 'mano') {
            finalFirmaProf = originalVisita.firma_profesional || '';
          }
        }
      }

      if (firmaTipo === 'perfil' && !finalFirmaProf) {
        triggerToast('El profesional seleccionado no tiene una firma configurada en su perfil.', 'error');
        setSaveLoading(false);
        return;
      }

      if (firmaTipo === 'mano' && !finalFirmaProf) {
        triggerToast('Debe firmar a mano en el panel para guardar.', 'error');
        setSaveLoading(false);
        return;
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
        fecha: convertToDbDate(fecha) || null,
        profesional_tipo: profesionalTipo,
        profesional_nombre: finalProfNombre,
        profesional_id: profesionalTipo === 'miembro' ? profesionalId : null,
        responsable_presente: responsablePresente.trim() || null,
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
        firma_tipo: firmaTipo,
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
    setFecha(formatDate(v.fecha) || '');
    setProfesionalTipo(v.profesional_tipo || 'miembro');
    if (v.profesional_tipo === 'miembro') {
      setProfesionalId(v.profesional_id || '');
      setProfesionalNombre('');
    } else {
      setProfesionalId('__custom__');
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

    setFirmaTipo(v.firma_tipo || 'mano');

    let latestProfileSig = '';
    if (v.profesional_tipo === 'miembro' && v.profesional_id) {
      const m = miembrosList.find(mem => mem.id === v.profesional_id);
      if (m) {
        latestProfileSig = m.signature_url || '';
      }
    }
    setSignaturePath(latestProfileSig || (v.firma_tipo === 'perfil' ? (v.firma_profesional || '') : ''));

    // Cargar fotos guardadas y firmas asíncronamente
    setFirmaRespSavedUrl('');
    setFirmaProfSavedUrl('');
    setFotosFiles([]);
    setHasSignedResp(false);
    setHasSignedProf(false);

    if (isDevMode) {
      setFirmaRespSavedUrl(v.firma_responsable_empresa ? '/brand/logo-primary.png' : '');
      setFirmaProfSavedUrl((v.firma_tipo || 'mano') === 'mano' && v.firma_profesional ? '/brand/logo-primary.png' : '');
      if (v.adjuntar_registros_urls && v.adjuntar_registros_urls.length > 0) {
        setFotosFiles(v.adjuntar_registros_urls.map(p => ({
          file: null,
          preview: '/brand/logo-primary.png',
          path: p
        })));
      }
    } else {
      // Recopilar paths a firmar en un solo lote
      const pathsToSign = [];
      if (v.firma_responsable_empresa && v.firma_responsable_empresa !== 'N/A') {
        if (!v.firma_responsable_empresa.startsWith('http://') && !v.firma_responsable_empresa.startsWith('https://')) {
          pathsToSign.push(v.firma_responsable_empresa);
        }
      }
      if ((v.firma_tipo || 'mano') === 'mano' && v.firma_profesional && v.firma_profesional !== 'N/A') {
        if (!v.firma_profesional.startsWith('http://') && !v.firma_profesional.startsWith('https://')) {
          pathsToSign.push(v.firma_profesional);
        }
      }
      if (v.adjuntar_registros_urls && v.adjuntar_registros_urls.length > 0) {
        v.adjuntar_registros_urls.forEach(p => {
          if (p && p !== 'N/A' && p !== '') {
            if (!p.startsWith('http://') && !p.startsWith('https://')) {
              pathsToSign.push(p);
            }
          }
        });
      }

      const loadDataAndResolve = async () => {
        let signedUrlsMap = {};
        if (pathsToSign.length > 0) {
          try {
            const { data: signedData, error: signErr } = await supabase.storage
              .from('documents')
              .createSignedUrls(pathsToSign, 3600);
            if (!signErr && signedData) {
              signedData.forEach(item => {
                if (item.signedUrl) {
                  signedUrlsMap[item.path] = item.signedUrl;
                }
              });
            }
          } catch (e) {
            console.error('Error al firmar URLs de visita en lote:', e);
          }
        }

        // 1. Firma Responsable Empresa
        if (v.firma_responsable_empresa && v.firma_responsable_empresa !== 'N/A') {
          if (v.firma_responsable_empresa.startsWith('http://') || v.firma_responsable_empresa.startsWith('https://')) {
            setFirmaRespSavedUrl(v.firma_responsable_empresa);
          } else {
            setFirmaRespSavedUrl(signedUrlsMap[v.firma_responsable_empresa] || '');
          }
        }

        // 2. Firma Profesional
        if ((v.firma_tipo || 'mano') === 'mano' && v.firma_profesional && v.firma_profesional !== 'N/A') {
          if (v.firma_profesional.startsWith('http://') || v.firma_profesional.startsWith('https://')) {
            setFirmaProfSavedUrl(v.firma_profesional);
          } else {
            setFirmaProfSavedUrl(signedUrlsMap[v.firma_profesional] || '');
          }
        }

        // 3. Fotos
        if (v.adjuntar_registros_urls && v.adjuntar_registros_urls.length > 0) {
          const validUrls = v.adjuntar_registros_urls.filter(p => p && p !== 'N/A' && p !== '');
          const loadedFotos = validUrls.map(path => {
            let preview = '/brand/logo-primary.png';
            if (path.startsWith('http://') || path.startsWith('https://')) {
              preview = path;
            } else {
              preview = signedUrlsMap[path] || '/brand/logo-primary.png';
            }
            return {
              file: null,
              preview,
              path
            };
          });
          setFotosFiles(loadedFotos);
        }
      };

      loadDataAndResolve();
    }

    setIsFormOpen(true);
  };

  // Eliminar
  const handleDeleteClick = (id) => {
    if (!canEdit) {
      triggerToast('No tiene permisos para eliminar constancias de visita.', 'error');
      return;
    }
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
            handleCloseForm();
          } else {
            const { error } = await supabase
              .from('visitas')
              .delete()
              .eq('id', id);
            if (error) throw error;
            triggerToast('Constancia de visita eliminada con éxito.');
            handleCloseForm();
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

  // Helper para redimensionar y comprimir una imagen en base64
  const resizeImage = (base64Str, maxWidth = 300, maxHeight = 300) => {
    return new Promise((resolve) => {
      if (!base64Str) {
        resolve('');
        return;
      }
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = base64Str;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        const isPng = base64Str.startsWith('data:image/png') || base64Str.includes('signature');
        ctx.drawImage(img, 0, 0, width, height);
        
        if (isPng) {
          resolve(canvas.toDataURL('image/png'));
        } else {
          resolve(canvas.toDataURL('image/jpeg', 0.85));
        }
      };
      img.onerror = () => {
        resolve(base64Str);
      };
    });
  };

  const getImgDimensions = (base64Str) => {
    return new Promise((resolve) => {
      if (!base64Str) {
        resolve({ width: 1, height: 1 });
        return;
      }
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        resolve({ width: img.width, height: img.height });
      };
      img.onerror = () => {
        resolve({ width: 1, height: 1 });
      };
    });
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

      // Inicializar jsPDF en puntos, orientación retrato, formato A4 (595.28 x 841.89 pt) con compresión
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'pt',
        format: 'a4',
        compress: true
      });

      // Cargar Logo
      let logoBase64 = '';
      try {
        if (tenant && tenant.logo_1_url) {
          logoBase64 = await getBase64ImageFromUrl(tenant.logo_1_url);
        }
      } catch (e) {
        console.error('No se pudo cargar el logo 1 personalizado, intentando logo principal por defecto:', e);
      }

      if (!logoBase64) {
        try {
          logoBase64 = await getBase64ImageFromUrl('/brand/logo-primary.png');
        } catch (e) {
          console.error('No se pudo cargar el logo de la cabecera por defecto en el PDF:', e);
        }
      }

      if (logoBase64) {
        logoBase64 = await resizeImage(logoBase64, 300, 300);
      }

      // Helper para dibujar Cabecera y Pie de Página en cada página
      const drawHeaderAndFooter = (pageNum) => {
        // Logo superior izquierdo
        if (logoBase64) {
          try {
            doc.addImage(logoBase64, 'PNG', 63.85, 22.11, 142.5, 78.31);
          } catch (e) {
            console.error('Error dibujando el logo de la cabecera:', e);
          }
        }
        
        // Footer: Barra azul
        doc.setFillColor(60, 120, 216); // #3C78D8
        doc.rect(42.1, 730.63, 525.75, 10.5, 'F');
        
        // Footer: Texto centrado
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(0, 0, 0);
        
        const companyName = tenant?.name || "Gestión SySO";
        const prefix = companyName;
        const phoneVal = profile?.phone || "1159969956 / 1132296691";
        const emailVal = profile?.email || "info@gestionsyso.com";
        const restText = ` - Tel.: ${phoneVal} - Email: ${emailVal}`;
        
        doc.setFont('helvetica', 'bold');
        const prefixWidth = doc.getTextWidth(prefix);
        doc.setFont('helvetica', 'normal');
        const restWidth = doc.getTextWidth(restText);
        const totalFooterWidth = prefixWidth + restWidth;
        const footerX = (595.28 - totalFooterWidth) / 2;
        
        doc.setFont('helvetica', 'bold');
        doc.text(prefix, footerX, 751);
        doc.setFont('helvetica', 'normal');
        doc.text(restText, footerX + prefixWidth, 751);
        
        // Footer: Número de página
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(128, 128, 128); // #808080
        doc.text(`${pageNum}`, 549, 751, { align: 'right' });
      };

      // ==========================================
      // PAGINA 1
      // ==========================================
      drawHeaderAndFooter(1);

      // Título del documento
      doc.setFillColor(60, 120, 216); // #3C78D8
      doc.rect(61.6, 116.71, 486.75, 25.5, 'F');
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(255, 255, 255);
      doc.text('Constancia de visita', 61.6 + 486.75 / 2, 116.71 + 16.5, { align: 'center' });

      // Tabla de Datos Generales (Renderizado manual del grid)
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(1);
      doc.rect(62, 156, 487, 144);

      // Líneas horizontales de división
      for (let i = 1; i <= 5; i++) {
        doc.line(62, 156 + 24 * i, 62 + 487, 156 + 24 * i);
      }
      // Líneas verticales de división
      doc.line(305, 180, 305, 204);
      doc.line(305, 228, 305, 252);

      // Textos de la Tabla de Datos Generales
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);

      // Fila 1
      doc.setFont('helvetica', 'bold');
      doc.text('Razón social de la empresa:', 68, 171);
      doc.setFont('helvetica', 'normal');
      doc.text(empName, 205, 171);

      // Fila 2
      doc.setFont('helvetica', 'bold');
      doc.text('C.U.I.T.:', 68, 195);
      doc.setFont('helvetica', 'normal');
      doc.text(cuit, 115, 195);
      doc.setFont('helvetica', 'bold');
      doc.text('Establecimiento:', 311, 195);
      doc.setFont('helvetica', 'normal');
      doc.text(estName, 395, 195);

      // Fila 3
      doc.setFont('helvetica', 'bold');
      doc.text('Dirección:', 68, 219);
      doc.setFont('helvetica', 'normal');
      doc.text(address, 120, 219);

      // Fila 4
      doc.setFont('helvetica', 'bold');
      doc.text('Fecha:', 68, 243);
      doc.setFont('helvetica', 'normal');
      doc.text(formatDate(v.fecha), 105, 243);
      doc.setFont('helvetica', 'bold');
      doc.text('Hora de finalización:', 311, 243);
      doc.setFont('helvetica', 'normal');
      doc.text(v.hora_finalizacion || 'N/A', 415, 243);

      // Fila 5
      doc.setFont('helvetica', 'bold');
      doc.text('Nombre y cargo del responsable presente:', 68, 267);
      doc.setFont('helvetica', 'normal');
      doc.text(v.responsable_presente || 'N/A', 285, 267);

      // Fila 6
      doc.setFont('helvetica', 'bold');
      doc.text('Profesional interviniente:', 68, 291);
      doc.setFont('helvetica', 'normal');
      doc.text(v.profesional_nombre || 'N/A', 205, 291);

      // Tabla de Actividades de la Página 1
      doc.setFillColor(60, 120, 216); // #3C78D8
      doc.rect(62.35, 314.25, 486, 24.75, 'F');
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(255, 255, 255);
      doc.text('Actividades realizadas durante la visita', 68, 314.25 + 15.5);
      doc.text('Si', 462.85 + 14.25, 314.25 + 15.5, { align: 'center' });
      doc.text('No', 491.35 + 14.25, 314.25 + 15.5, { align: 'center' });
      doc.text('NA', 519.85 + 14.25, 314.25 + 15.5, { align: 'center' });

      // Líneas verticales de cabecera
      doc.setDrawColor(0, 0, 0);
      doc.line(462.85, 314.25, 462.85, 314.25 + 24.75);
      doc.line(491.35, 314.25, 491.35, 314.25 + 24.75);
      doc.line(519.85, 314.25, 519.85, 314.25 + 24.75);

      // Estructura de las filas de la Página 1
      const isMedFisQuim = (v.mediciones_realizadas || []).some(x => x !== 'Evaluación ergonómica' && x !== 'N/A');
      const isMedErg = (v.mediciones_realizadas || []).includes('Evaluación ergonómica');
      const isMedOther = (v.mediciones_realizadas || []).some(x => !MEDICIONES_OPTS.includes(x) && x !== 'N/A');
      const otherMedText = (v.mediciones_realizadas || []).filter(x => x !== 'Evaluación ergonómica' && !MEDICIONES_OPTS.includes(x)).join(', ');

      const p1Rows = [
        { id: '1', text: '1. ¿Ocurrieron incidentes o accidentes laborales desde la última visita?', type: 'main', height: 25, val: v.ocurrieron_incidentes ? 'Sí' : 'No' },
        { id: '1.1', text: '  1.1. ¿Se realizó el análisis correspondiente (causa raíz, acciones correctivas)?', type: 'sub', height: 25, val: v.analisis_correspondiente },
        { id: '1.2', text: '  1.2. ¿Cuál fue la causa raíz?:\n  ' + (v.causa_raiz || 'N/A'), type: 'desc', height: 36 },
        { id: '1.3', text: '  1.3. ¿Qué acción correctiva se planificó / realizó?:\n  ' + (v.accion_correctiva || 'N/A'), type: 'desc', height: 37 },
        { id: '2', text: '2. ¿Se realizó relevamiento de:', type: 'group', height: 24 },
        { id: '2.1', text: '  2.1. Condiciones de Higiene y Seguridad', type: 'sub', height: 25, val: v.relevamiento_higiene_seguridad },
        { id: '2.2', text: '  2.2. Prácticas de trabajo seguro', type: 'sub', height: 25, val: v.relevamiento_practicas_seguras },
        { id: '2.3', text: '  2.3. Uso adecuado de elementos de protección personal (EPP’s)', type: 'sub', height: 25, val: v.relevamiento_epp },
        { id: '3', text: '3. ¿Se realizaron mediciones o evaluaciones técnicas específicas?', type: 'main', height: 25, val: v.realizaron_mediciones },
        { id: '3.1', text: '  3.1. Medición de contaminantes físicos y/o químicos?', type: 'sub', height: 25, val: isMedFisQuim ? 'Sí' : (v.realizaron_mediciones === 'No' ? 'No' : (v.realizaron_mediciones === 'N/A' ? 'N/A' : '')) },
        { id: '3.2', text: '  3.2. Evaluación de riesgos ergonómicos', type: 'sub', height: 25, val: isMedErg ? 'Sí' : (v.realizaron_mediciones === 'No' ? 'No' : (v.realizaron_mediciones === 'N/A' ? 'N/A' : '')) },
        { id: '3.3', text: '  3.3. Otras (especificar): ' + (otherMedText || 'Ninguna'), type: 'sub', height: 25, val: isMedOther ? 'Sí' : (v.realizaron_mediciones === 'No' ? 'No' : (v.realizaron_mediciones === 'N/A' ? 'N/A' : '')) },
        { id: '4', text: '4. ¿Se verificó la implementación de acciones correctivas previamente recomendadas?', type: 'main', height: 37, val: v.verifico_acciones_correctivas }
      ];

      let curY = 314.25 + 24.75;
      doc.rect(62.35, 314.25, 486, 385);

      p1Rows.forEach(row => {
        // Línea horizontal de fondo
        doc.line(62.35, curY + row.height, 62.35 + 486, curY + row.height);
        
        // Líneas verticales divisoras (excepto para campos descriptivos)
        if (row.type !== 'desc') {
          doc.line(462.85, curY, 462.85, curY + row.height);
          doc.line(491.35, curY, 491.35, curY + row.height);
          doc.line(519.85, curY, 519.85, curY + row.height);
        }

        // Renderizar el Texto
        doc.setFont('helvetica', (row.type === 'main' || row.type === 'group') ? 'bold' : 'normal');
        doc.setFontSize(9);
        doc.setTextColor(0, 0, 0);

        if (row.type === 'desc') {
          doc.text(row.text, 68, curY + 14, { maxWidth: 475 });
        } else {
          doc.text(row.text, 68, curY + 15, { maxWidth: 390 });
        }

        // Checkboxes y Checkmarks
        if (row.type === 'main' || row.type === 'sub') {
          const checkVal = row.val;
          const cbSize = 8;
          const cbY = curY + row.height / 2 - 4;

          // Dibujar cuadrados de opción
          doc.rect(462.85 + 10.25, cbY, cbSize, cbSize);
          doc.rect(491.35 + 10.25, cbY, cbSize, cbSize);
          doc.rect(519.85 + 10.25, cbY, cbSize, cbSize);

          // Poner una X
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          if (checkVal === 'Sí' || checkVal === 'Si' || checkVal === true) {
            doc.text('X', 462.85 + 12, cbY + 7);
          } else if (checkVal === 'No' || checkVal === false) {
            doc.text('X', 491.35 + 12, cbY + 7);
          } else if (checkVal === 'N/A' || checkVal === 'NA') {
            doc.text('X', 519.85 + 12, cbY + 7);
          }
        }

        curY += row.height;
      });

      // ==========================================
      // PAGINA 2
      // ==========================================
      doc.addPage();
      drawHeaderAndFooter(2);

      // Tabla de Actividades de la Página 2
      doc.setFillColor(60, 120, 216); // #3C78D8
      doc.rect(62.35, 102.91, 486, 24.75, 'F');
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(255, 255, 255);
      doc.text('Actividades realizadas durante la visita', 68, 102.91 + 15.5);
      doc.text('Si', 462.85 + 14.25, 102.91 + 15.5, { align: 'center' });
      doc.text('No', 491.35 + 14.25, 102.91 + 15.5, { align: 'center' });
      doc.text('NA', 519.85 + 14.25, 102.91 + 15.5, { align: 'center' });

      // Líneas verticales de cabecera
      doc.line(462.85, 102.91, 462.85, 102.91 + 24.75);
      doc.line(491.35, 102.91, 491.35, 102.91 + 24.75);
      doc.line(519.85, 102.91, 519.85, 102.91 + 24.75);

      // Estructura de las filas de la Página 2
      const capTemas = (v.capacitaciones_temas || []).join(', ');
      const p2Rows = [
        { id: '5', text: '5. ¿Se dictaron capacitaciones? Especificar temas: ' + (capTemas || 'N/A'), type: 'main', height: 37, val: v.dictaron_capacitaciones ? 'Sí' : 'No' },
        { id: '6', text: '6. ¿Se realizaron simulacros?', type: 'main', height: 25, val: v.realizaron_simulacros ? 'Sí' : 'No' },
        { id: '6.1', text: '  6.1. Tipo: Evacuación / Incendio / Derrame / Fuga de gas / Otro:', type: 'simulacro_options', height: 25 },
        { id: '7', text: '7. ¿Se emitieron avisos por condiciones inseguras o actos inseguros?', type: 'main', height: 25, val: v.emite_aviso_riesgo ? 'Sí' : 'No' },
        { id: '8', text: '8. Documentación incorporada al Legajo de SySO:\n  ' + ((v.documentacion_incorporada || []).join(', ') || 'Ninguna'), type: 'desc', height: 37 }
      ];

      let curY2 = 102.91 + 24.75;
      doc.rect(62.35, 102.91, 486, 174);

      p2Rows.forEach(row => {
        // Línea horizontal de fondo
        doc.line(62.35, curY2 + row.height, 62.35 + 486, curY2 + row.height);
        
        // Líneas verticales divisoras (excepto para descriptivos y simulacros en línea)
        if (row.type !== 'desc' && row.type !== 'simulacro_options') {
          doc.line(462.85, curY2, 462.85, curY2 + row.height);
          doc.line(491.35, curY2, 491.35, curY2 + row.height);
          doc.line(519.85, curY2, 519.85, curY2 + row.height);
        }

        // Renderizar el texto
        doc.setFont('helvetica', (row.type === 'main') ? 'bold' : 'normal');
        doc.setFontSize(9);
        doc.setTextColor(0, 0, 0);

        if (row.type === 'desc') {
          doc.text(row.text, 68, curY2 + 14, { maxWidth: 475 });
        } else if (row.type === 'simulacro_options') {
          // Renderizar opciones múltiples en línea
          doc.setFont('helvetica', 'normal');
          doc.text('  6.1. Tipo:', 68, curY2 + 15);
          
          const opts = [
            { name: 'Evacuación', x: 130 },
            { name: 'Incendio', x: 210 },
            { name: 'Derrame', x: 280 },
            { name: 'Fuga de gas', x: 350 },
            { name: 'Otro', x: 430 }
          ];

          opts.forEach(opt => {
            const cbSize = 8;
            const cbY = curY2 + 7;
            
            // Cuadrado
            doc.rect(opt.x, cbY, cbSize, cbSize);
            doc.text(opt.name, opt.x + 12, curY2 + 15);

            const hasOpt = (v.simulacros_tipo || []).includes(opt.name);
            if (hasOpt) {
              doc.setFont('helvetica', 'bold');
              doc.text('X', opt.x + 1.5, cbY + 7);
              doc.setFont('helvetica', 'normal');
            }
          });
        } else {
          doc.text(row.text, 68, curY2 + 15, { maxWidth: 390 });
        }

        // Checkboxes Si/No/NA
        if (row.type === 'main') {
          const checkVal = row.val;
          const cbSize = 8;
          const cbY = curY2 + row.height / 2 - 4;

          doc.rect(462.85 + 10.25, cbY, cbSize, cbSize);
          doc.rect(491.35 + 10.25, cbY, cbSize, cbSize);
          doc.rect(519.85 + 10.25, cbY, cbSize, cbSize);

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          if (checkVal === 'Sí' || checkVal === 'Si' || checkVal === true) {
            doc.text('X', 462.85 + 12, cbY + 7);
          } else if (checkVal === 'No' || checkVal === false) {
            doc.text('X', 491.35 + 12, cbY + 7);
          } else if (checkVal === 'N/A' || checkVal === 'NA') {
            doc.text('X', 519.85 + 12, cbY + 7);
          }
        }

        curY2 += row.height;
      });

      // Nota inferior
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(0, 0, 0);
      doc.text('* Indicar con una X si corresponde: Sí / No / No Aplica (NA)', 62, 290);

      // Sección de Observaciones
      const obsY = 302.25;
      doc.setFillColor(60, 120, 216); // #3C78D8
      doc.rect(62.35, obsY, 486.75, 24.75, 'F');
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(255, 255, 255);
      doc.text('Observaciones y recomendaciones preventivas:', 68, obsY + 15.5);

      // Contenedor principal de observaciones
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(1);
      doc.rect(62.35, obsY, 486.75, 237.75); // Llega hasta y ~ 540

      // Texto introductorio
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(64, 64, 64);
      doc.text('Se realiza la presente visita a efectos de verificar las condiciones de Higiene y Seguridad en el establecimiento, supervisar las prácticas laborales y dar seguimiento a las acciones correctivas recomendadas.', 68, obsY + 42, { maxWidth: 475 });
      doc.text('Se detallan a continuación las observaciones relevantes y sugerencias preventivas:', 68, obsY + 80);

      // Dibujar 6 líneas punteadas
      doc.setLineDash([1, 2], 0);
      doc.setLineWidth(1);
      doc.setDrawColor(128, 128, 128); // #808080
      const lineYs = [412, 436, 459, 483, 507, 531];
      lineYs.forEach(lineY => {
        doc.line(61.875, lineY, 548.875, lineY);
      });
      doc.setLineDash([], 0); // Resetear a sólido

      // Imprimir el contenido de observaciones en las líneas
      let fullObsText = v.observaciones_recomendaciones || '';
      if (v.observaciones) {
        fullObsText += '\n\nNotas internas generales:\n' + v.observaciones;
      }

      if (fullObsText) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        const lines = doc.splitTextToSize(fullObsText, 475);
        for (let i = 0; i < Math.min(lines.length, 6); i++) {
          doc.text(lines[i], 68, lineYs[i] - 4); // Alinear justo arriba de la línea
        }
      }

      // Sección de Firmas (tercio inferior)
      const sigY = 675;
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(1);

      // Firma Responsable Empresa (Columna Izquierda)
      doc.line(79, sigY, 263, sigY);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(0, 0, 0);
      doc.text('Firma del responsable de la empresa', 171, sigY + 10, { align: 'center' });
      doc.setFont('helvetica', 'bold');
      doc.text(v.responsable_presente || '', 171, sigY + 22, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.text('Responsable del Establecimiento', 171, sigY + 32, { align: 'center' });

      // Firma Profesional HyS (Columna Derecha)
      doc.line(346, sigY, 530, sigY);
      doc.text('Firma del profesional de Higiene y', 438, sigY + 10, { align: 'center' });
      doc.text('Seguridad', 438, sigY + 20, { align: 'center' });
      doc.setFont('helvetica', 'bold');
      doc.text(v.profesional_nombre || '', 438, sigY + 32, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.text('Profesional Interviniente', 438, sigY + 42, { align: 'center' });

      // Obtener firmas como base64 de manera segura
      let imgRespBase64 = '';
      let imgProfBase64 = '';

      if (v.firma_responsable_empresa && v.firma_responsable_empresa !== 'N/A') {
        try {
          if (v.firma_responsable_empresa.startsWith('data:')) {
            imgRespBase64 = v.firma_responsable_empresa;
          } else if (isDevMode || v.firma_responsable_empresa.startsWith('mock')) {
            imgRespBase64 = await getBase64ImageFromUrl('/brand/logo-primary.png');
          } else {
            let relativePath = v.firma_responsable_empresa;
            let isExternal = false;
            
            if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
              try {
                const urlObj = new URL(relativePath);
                const pathParts = urlObj.pathname.split('/');
                const bucketIndex = pathParts.findIndex(part => part === 'documents');
                if (bucketIndex !== -1 && bucketIndex < pathParts.length - 1) {
                  relativePath = pathParts.slice(bucketIndex + 1).join('/');
                } else {
                  isExternal = true;
                }
              } catch (urlErr) {
                console.error('Error parseando URL de firma responsable:', urlErr);
                isExternal = true;
              }
            }

            if (isExternal) {
              imgRespBase64 = await getBase64ImageFromUrl(v.firma_responsable_empresa);
            } else {
              const { data: sData, error: sErr } = await supabase.storage
                .from('documents')
                .createSignedUrl(relativePath, 3600);
              if (!sErr && sData?.signedUrl) {
                imgRespBase64 = await getBase64ImageFromUrl(sData.signedUrl);
              }
            }
          }
          if (imgRespBase64) {
            imgRespBase64 = await resizeImage(imgRespBase64, 200, 100);
          }
        } catch (err) {
          console.error('Error fetching responsable signature:', err);
        }
      }

      if (v.firma_profesional && v.firma_profesional !== 'N/A') {
        try {
          if (v.firma_profesional.startsWith('data:')) {
            imgProfBase64 = v.firma_profesional;
          } else if (isDevMode || v.firma_profesional.startsWith('mock')) {
            imgProfBase64 = await getBase64ImageFromUrl('/brand/logo-primary.png');
          } else {
            let relativePath = v.firma_profesional;
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
                console.error('Error parseando URL de firma profesional:', urlErr);
                isExternal = true;
              }
            }

            if (isExternal) {
              imgProfBase64 = await getBase64ImageFromUrl(v.firma_profesional);
            } else {
              const bucketName = v.firma_tipo === 'perfil' ? 'signatures' : 'documents';
              const { data: sData, error: sErr } = await supabase.storage
                .from(bucketName)
                .createSignedUrl(relativePath, 3600);
              if (!sErr && sData?.signedUrl) {
                imgProfBase64 = await getBase64ImageFromUrl(sData.signedUrl);
              }
            }
          }
          if (imgProfBase64) {
            imgProfBase64 = await resizeImage(imgProfBase64, 1200, 600, true);
          }
        } catch (err) {
          console.error('Error fetching profesional signature:', err);
        }
      }

      // Dibujar las imágenes sobre las líneas de manera proporcional
      if (imgRespBase64 && imgRespBase64.startsWith('data:image/')) {
        try {
          const dims = await getImgDimensions(imgRespBase64);
          const imgRatio = dims.width / dims.height;
          const maxW = 100;
          const maxH = 40;
          let imgW = maxW;
          let imgH = maxH;
          if (imgRatio > maxW / maxH) {
            imgW = maxW;
            imgH = maxW / imgRatio;
          } else {
            imgH = maxH;
            imgW = maxH * imgRatio;
          }
          const imgX = 171 - imgW / 2;
          const imgY = sigY - 5 - imgH;
          doc.addImage(imgRespBase64, 'PNG', imgX, imgY, imgW, imgH);
        } catch (err) {
          console.error('Error rendering imgRespBase64:', err);
        }
      }
      if (imgProfBase64 && imgProfBase64.startsWith('data:image/')) {
        try {
          const dims = await getImgDimensions(imgProfBase64);
          const imgRatio = dims.width / dims.height;
          const maxW = 240;
          const maxH = 120;
          let imgW = maxW;
          let imgH = maxH;
          if (imgRatio > maxW / maxH) {
            imgW = maxW;
            imgH = maxW / imgRatio;
          } else {
            imgH = maxH;
            imgW = maxH * imgRatio;
          }
          const imgX = 438 - imgW / 2;
          const imgY = sigY - 5 - imgH;
          doc.addImage(imgProfBase64, 'PNG', imgX, imgY, imgW, imgH);
        } catch (err) {
          console.error('Error rendering imgProfBase64:', err);
        }
      }

      // Guardar o retornar
      if (shouldDownload === true) {
        doc.save(`Constancia_Visita_${empName.replace(/\s+/g, '_')}_${v.fecha}.pdf`);
        triggerToast('PDF descargado exitosamente.');
        return null;
      } else if (shouldDownload === 'bloburl') {
        const blob = doc.output('blob');
        return URL.createObjectURL(blob);
      } else if (shouldDownload === 'blob') {
        return doc.output('blob');
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

  // Previsualizar PDF en nueva pestaña sin descargar
  const handlePreviewPdf = async (v) => {
    try {
      triggerToast('Generando vista previa del PDF...');
      const blobUrl = await handleGeneratePdf(v, 'bloburl');
      if (blobUrl) {
        window.open(blobUrl, '_blank');
      }
    } catch (e) {
      console.error('Error al abrir la vista previa:', e);
      triggerToast('Error al abrir la vista previa.', 'error');
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
      // 1. Generar PDF como Blob
      const pdfBlob = await handleGeneratePdf(mailTargetVisita, 'blob');
      if (!pdfBlob) {
        throw new Error('No se pudo estructurar el PDF adjunto.');
      }

      // Subir archivo al storage en la carpeta del usuario (RSL lo valida)
      const fileId = crypto.randomUUID();
      const filePath = `${profile?.id || 'anonymous'}/visita_${mailTargetVisita.id}_${fileId}.pdf`;
      
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, pdfBlob, {
          contentType: 'application/pdf',
          upsert: true
        });

      if (uploadError) {
        throw new Error(`Error al subir el adjunto a Storage: ${uploadError.message}`);
      }

      const emp = empresas.find(e => e.id === mailTargetVisita.empresa_id);
      const est = allEstablecimientos.find(e => e.id === mailTargetVisita.establecimiento_id);

      // 2. Obtener logo del tenant como base64 (para el encabezado del email)
      let tenantLogoBase64 = '';
      if (tenant && tenant.logo_1_url) {
        try {
          tenantLogoBase64 = await getBase64ImageFromUrl(tenant.logo_1_url);
          if (tenantLogoBase64) {
            tenantLogoBase64 = await resizeImage(tenantLogoBase64, 400, 200);
          }
        } catch (logoErr) {
          console.warn('No se pudo cargar el logo para el email:', logoErr);
        }
      }

      // 3. Llamar API route
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emails: recipients,
          filePath,
          companyName: emp ? emp.razon_social : 'Cliente',
          establishmentName: est ? est.denominacion : 'Establecimiento',
          date: formatDate(mailTargetVisita.fecha),
          inspectorName: mailTargetVisita.profesional_nombre,
          tenantLogoBase64: tenantLogoBase64 || null,
          tenantName: tenant ? (tenant.razon_social || tenant.nombre || 'Gestión SySO') : 'Gestión SySO'
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

    if (filterFecha && v.fecha !== filterFecha) return false;
    if (filterAnio && v.fecha && v.fecha.substring(0, 4) !== filterAnio) return false;
    if (filterMes && v.fecha && v.fecha.substring(5, 7) !== filterMes) return false;

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
    <div className="h-screen overflow-hidden bg-syso-bg text-slate-700 flex font-sans">
      
      {/* Sidebar (Desktop & Mobile) */}
      <Sidebar
        tenantSlug={tenantSlug}
        profile={profile}
        currentSection="visitas"
        isSidebarCollapsed={isSidebarCollapsed}
        toggleSidebar={toggleSidebar}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
        handleLogout={handleLogout}
        onNavigate={handleSidebarNavigation}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full bg-[#FFFFFF] overflow-hidden">
        
        {/* Navbar / Top Bar */}
        <header className="h-16 border-b border-slate-200 flex items-center justify-between px-4 md:px-6 bg-white shrink-0 sticky top-0 z-20">
          <div className="flex items-center gap-2.5 min-w-0">
            <button 
              onClick={() => setIsMobileMenuOpen(true)} 
              className="p-2 -ml-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 md:hidden cursor-pointer shrink-0"
            >
              <Menu className="h-5 w-5" />
            </button>
            <ClipboardCheck className="h-5 w-5 text-[#468DFF] shrink-0" />
            <h1 className="font-outfit text-base md:text-lg font-bold text-slate-900 truncate leading-none">
              Constancia de Visita
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

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 bg-syso-bg">
          <div className="max-w-[95%] mx-auto space-y-6">

            {/* LISTADO DE VISITAS */}
            {!isFormOpen && (
              <>
                {/* Herramientas, Búsqueda y Filtros */}
                <div className="bg-white rounded-2xl border border-slate-150 p-3 shadow-sm space-y-3 shrink-0">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    {/* Espaciador para empujar el buscador y botón a la derecha en desktop */}
                    <div className="hidden md:block flex-1"></div>

                    {/* Buscador y Botón agrupados */}
                    <div className="flex flex-col md:flex-row md:items-center gap-3 w-full md:w-auto">
                      <div className="relative w-full md:w-72">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
                        <input 
                          type="text" 
                          placeholder="Buscar por profesional, responsable, observaciones..."
                          value={filterText}
                          onChange={(e) => setFilterText(e.target.value)}
                          className="w-full pl-9 pr-4 py-1.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all text-slate-700 placeholder-slate-400"
                        />
                      </div>

                      {canCargar && (
                        <button 
                          onClick={handleAddNew}
                          className="px-3.5 py-1.5 bg-[#468DFF] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-[#0511F2] transition-all cursor-pointer shadow-md shadow-[#468DFF]/10 shrink-0 w-full md:w-auto"
                        >
                          <PlusCircle className="h-3.5 w-3.5" />
                          Nueva Constancia
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Filtros avanzados colapsables */}
                  <div className="pt-2 border-t border-slate-100 space-y-2">
                    <div className="flex items-center justify-between min-h-[28px]">
                      <button
                        type="button"
                        onClick={() => setShowFilters(!showFilters)}
                        className="font-bold text-slate-400 flex items-center gap-1.5 uppercase tracking-wider text-[10px] hover:text-slate-600 transition-colors cursor-pointer"
                      >
                        <Sliders className="h-3 w-3" />
                        Filtros de Búsqueda
                        {showFilters ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      </button>

                      {(filterText || filterEmpresa || filterEstablecimiento || filterFecha || filterAnio || filterMes) && (
                        <button 
                          onClick={() => {
                            setFilterText('');
                            setFilterEmpresa('');
                            setFilterEstablecimiento('');
                            setFilterFecha('');
                            setFilterAnio('');
                            setFilterMes('');
                          }}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[10px] font-semibold cursor-pointer transition-all border border-slate-200"
                        >
                          Limpiar Filtros
                        </button>
                      )}
                    </div>

                    {showFilters && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 pt-1 animate-fade-in">
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

                        {/* Selector Fecha */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Filtrar por Fecha</label>
                          <input 
                            type="date"
                            value={filterFecha}
                            onChange={(e) => setFilterFecha(e.target.value)}
                            className="border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-600 focus:outline-none focus:border-[#468DFF] text-xs w-full cursor-pointer font-sans"
                          />
                        </div>

                        {/* Selector Año */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Filtrar por Año</label>
                          <select 
                            value={filterAnio}
                            onChange={(e) => setFilterAnio(e.target.value)}
                            className="border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-600 focus:outline-none focus:border-[#468DFF] text-xs w-full cursor-pointer"
                          >
                            <option value="">Todos los Años</option>
                            {getAvailableYears(visitas).map(y => (
                              <option key={y} value={y}>{y}</option>
                            ))}
                          </select>
                        </div>

                        {/* Selector Mes */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Filtrar por Mes</label>
                          <select 
                            value={filterMes}
                            onChange={(e) => setFilterMes(e.target.value)}
                            className="border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-600 focus:outline-none focus:border-[#468DFF] text-xs w-full cursor-pointer"
                          >
                            <option value="">Todos los Meses</option>
                            {MONTHS_OPTS.map(m => (
                              <option key={m.value} value={m.value}>{m.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Tabla de Resultados */}
                <div className="bg-white rounded-2xl border border-slate-150 shadow-sm overflow-hidden flex flex-col" style={{ height: showFilters ? 'calc(100vh - 310px)' : 'calc(100vh - 240px)' }}>
                  {sortedVisitas.length === 0 ? (
                    <div className="flex-grow flex flex-col items-center justify-center p-8 text-center gap-3 h-full">
                      <AlertCircle className="h-10 w-10 text-slate-300" />
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-slate-800">No hay constancias de visita registradas</p>
                        <p className="text-xs text-slate-400">Registra una nueva constancia de visita para comenzar.</p>
                      </div>
                      {canCargar && (
                        <button
                          onClick={handleAddNew}
                          className="px-4 py-2 mt-2 bg-[#468DFF] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-[#0511F2] transition-all cursor-pointer shadow-md shadow-[#468DFF]/10 shrink-0"
                        >
                          <PlusCircle className="h-3.5 w-3.5" />
                          Registrar constancia
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="overflow-auto flex-grow">
                      <table className="w-full text-left border-collapse min-w-[850px]">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-150 text-xs font-bold text-slate-400 uppercase tracking-wider">
                            <th className="px-6 py-4 cursor-pointer hover:text-slate-700 sticky top-0 z-10 bg-slate-50 border-b border-slate-150" onClick={() => handleSort('cliente')}>Cliente</th>
                            <th className="px-6 py-4 cursor-pointer hover:text-slate-700 sticky top-0 z-10 bg-slate-50 border-b border-slate-150" onClick={() => handleSort('establecimiento')}>Establecimiento</th>
                            <th className="px-6 py-4 cursor-pointer hover:text-slate-700 sticky top-0 z-10 bg-slate-50 border-b border-slate-150" onClick={() => handleSort('fecha')}>Fecha</th>
                            <th className="px-6 py-4 cursor-pointer hover:text-slate-700 sticky top-0 z-10 bg-slate-50 border-b border-slate-150" onClick={() => handleSort('profesional_nombre')}>Profesional</th>
                            <th className="px-6 py-4 sticky top-0 z-10 bg-slate-50 border-b border-slate-150">Responsable Presente</th>
                            <th className="px-6 py-4 text-right sticky top-0 z-10 bg-slate-50 border-b border-slate-150">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                          {sortedVisitas.map((v) => {
                            const emp = empresas.find(e => e.id === v.empresa_id);
                            const est = allEstablecimientos.find(e => e.id === v.establecimiento_id);
                            return (
                              <tr key={v.id} className="hover:bg-slate-50/50 cursor-pointer" onClick={() => { setIsReadOnlyView(true); handleEditClick(v); }}>
                                <td className="px-6 py-4 font-semibold text-slate-900">{emp ? emp.razon_social : 'N/A'}</td>
                                <td className="px-6 py-4 font-medium text-slate-600">{est ? est.denominacion : 'N/A'}</td>
                                <td className="px-6 py-4 font-semibold text-slate-600">{formatDate(v.fecha)}</td>
                                <td className="px-6 py-4 text-slate-600">{v.profesional_nombre}</td>
                                <td className="px-6 py-4 text-slate-500">{v.responsable_presente}</td>
                                <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                                  <div className="flex items-center justify-end gap-2">
                                    <button 
                                      onClick={() => handlePreviewPdf(v)}
                                      className="p-1.5 rounded-lg bg-[#EFF6FF] hover:bg-[#DBEAFE] text-[#468DFF] hover:text-[#0511F2] transition-all cursor-pointer"
                                      title="Visualizar PDF"
                                    >
                                      <FileText className="h-4.5 w-4.5" />
                                    </button>
                                    <button 
                                      onClick={() => handleGeneratePdf(v)}
                                      className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-all cursor-pointer"
                                      title="Descargar PDF"
                                    >
                                      <Download className="h-4.5 w-4.5" />
                                    </button>
                                    {profile && profile.role !== 'cliente' && (
                                      <button 
                                        onClick={() => handleOpenMailModal(v)}
                                        className="p-1.5 rounded-lg bg-blue-50 hover:bg-[#468DFF]/25 text-[#468DFF] transition-all cursor-pointer"
                                        title="Enviar por Correo"
                                      >
                                        <Mail className="h-4.5 w-4.5" />
                                      </button>
                                    )}
                                    {profile && profile.role !== 'cliente' && (
                                      canEditar ? (
                                        <button 
                                          onClick={() => { setIsReadOnlyView(false); handleEditClick(v); }}
                                          className="p-1.5 rounded-lg transition-all cursor-pointer bg-amber-50 hover:bg-amber-100 text-amber-600"
                                          title="Editar Constancia"
                                        >
                                          <Edit className="h-4.5 w-4.5" />
                                        </button>
                                      ) : (
                                        <button 
                                          onClick={() => { setIsReadOnlyView(true); handleEditClick(v); }}
                                          className="p-1.5 rounded-lg transition-all cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-600"
                                          title="Ver Detalle"
                                        >
                                          <Eye className="h-4.5 w-4.5" />
                                        </button>
                                      )
                                    )}
                                    {profile && profile.role !== 'cliente' && canEliminar && (
                                      <button 
                                        onClick={() => handleDeleteClick(v.id)}
                                        className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition-all cursor-pointer"
                                        title="Eliminar Constancia"
                                      >
                                        <Trash2 className="h-4.5 w-4.5" />
                                      </button>
                                    )}
                                  </div>
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

            {/* FORMULARIO INLINE */}
            {isFormOpen && (
              <div className="bg-white rounded-2xl border border-slate-150 shadow-sm overflow-hidden animate-fade-in">
                
                {/* Cabecera del formulario */}
                <div className="h-16 px-4 md:px-6 bg-slate-50 border-b border-slate-150 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-3">
                    <button 
                      type="button"
                      onClick={handleExitForm} 
                      className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 cursor-pointer"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </button>
                    <span className="font-outfit text-xs sm:text-sm md:text-base font-bold text-slate-900 truncate max-w-[55vw] sm:max-w-none">
                      {editingId ? 'Editar Constancia de Visita' : 'Registrar Nueva Constancia de Visita'}
                    </span>
                  </div>
                  <button type="button" onClick={handleExitForm} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-200 cursor-pointer">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Formulario */}
                <form onSubmit={handleSaveVisita} className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                  <fieldset disabled={!canEdit} className="space-y-6">
                  
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
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="DD/MM/YYYY"
                            maxLength={10}
                            value={fecha}
                            onChange={(e) => setFecha(formatAsDateInput(e.target.value))}
                            required
                            className="w-full border border-slate-200 rounded-xl pl-3.5 pr-10 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 font-mono"
                          />
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
                                    setFecha(`${parts[2]}/${parts[1]}/${parts[0]}`);
                                  }
                                }
                              }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Profesional Interviniente */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-600">Profesional Interviniente *</label>
                        <select
                          value={profesionalId}
                          onChange={(e) => handleProfesionalChange(e.target.value)}
                          required
                          className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 cursor-pointer"
                        >
                          <option value="">Seleccionar Profesional...</option>
                          {miembrosList.map(m => (
                            <option key={m.id} value={m.id}>{m.full_name}</option>
                          ))}
                          <option value="__custom__">Otro (cargar manualmente)...</option>
                        </select>

                        {profesionalId === '__custom__' && (
                          <input
                            type="text"
                            placeholder="Nombre y Apellido del Profesional"
                            value={profesionalNombre}
                            onChange={(e) => setProfesionalNombre(e.target.value)}
                            required
                            className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-white mt-2 transition-all"
                          />
                        )}
                      </div>

                      {/* Responsable presente */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-600">Nombre del Responsable Presente</label>
                        <input
                          type="text"
                          placeholder="Nombre del Responsable"
                          value={responsablePresente}
                          onChange={(e) => setResponsablePresente(e.target.value)}
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
                                ? 'bg-[#468DFF] text-white border-[#468DFF] shadow-md shadow-[#468DFF]/10'
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
                                ? 'bg-[#468DFF] text-white border-[#468DFF] shadow-md shadow-[#468DFF]/10'
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
                                ? 'bg-[#468DFF] text-white border-[#468DFF] shadow-sm'
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
                                ? 'bg-[#468DFF] text-white border-[#468DFF] shadow-sm'
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
                                ? 'bg-[#468DFF] text-white border-[#468DFF] shadow-sm'
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
                                ? 'bg-[#468DFF] text-white border-[#468DFF] shadow-sm'
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
                              ? 'bg-[#468DFF] text-white border-[#468DFF] shadow-sm'
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
                              ? 'bg-[#468DFF] text-white border-[#468DFF] shadow-sm'
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

                      <div className="flex flex-col gap-2">
                        <ImageUploadZone
                          label="Adjuntar registros fotográficos (Mediciones, constancia física, firmas escritas, etc.)"
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
                          disabled={!canEdit}
                          maxSizeMB={5}
                          onToast={triggerToast}
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
                        <div className="flex flex-row justify-between items-end gap-2">
                          <label className="text-xs font-bold text-slate-600 pr-2">Firma del Responsable de la Empresa</label>
                          {canEdit && (hasSignedResp || firmaRespSavedUrl) && (
                            <button
                              type="button"
                              onClick={() => handleClearCanvas(firmaRespCanvasRef, setHasSignedResp, setFirmaRespSavedUrl)}
                              className="text-[10px] font-bold text-red-500 hover:text-red-700 cursor-pointer shrink-0"
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
                              className={`w-full h-full bg-white block ${canEdit ? 'cursor-crosshair' : 'cursor-default'}`}
                            />
                          )}
                          {!hasSignedResp && !firmaRespSavedUrl && (
                            <span className="absolute pointer-events-none text-[10px] text-slate-400 font-bold uppercase tracking-wider">Dibuje la firma aquí</span>
                          )}
                        </div>
                      </div>

                      {/* Firma 2: Profesional Higiene y Seguridad */}
                      <div className="space-y-2 flex flex-col">
                        <div className="flex flex-row justify-between items-end gap-2">
                          <label className="text-xs font-bold text-slate-600 pr-2">Firma del Profesional de Higiene y Seguridad</label>
                          {firmaTipo === 'mano' && canEdit && (hasSignedProf || firmaProfSavedUrl) && (
                            <button
                              type="button"
                              onClick={() => handleClearCanvas(firmaProfCanvasRef, setHasSignedProf, setFirmaProfSavedUrl)}
                              className="text-[10px] font-bold text-red-500 hover:text-red-700 cursor-pointer shrink-0"
                            >
                              Limpiar Firma
                            </button>
                          )}
                        </div>

                        <div className="space-y-3">
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setFirmaTipo('perfil')}
                              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all border ${firmaTipo === 'perfil' ? 'bg-[#468DFF]/10 text-[#468DFF] border-[#468DFF]/30' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}
                            >
                              Firma de Perfil
                            </button>
                            <button
                              type="button"
                              onClick={() => setFirmaTipo('mano')}
                              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all border ${firmaTipo === 'mano' ? 'bg-[#468DFF]/10 text-[#468DFF] border-[#468DFF]/30' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}
                            >
                              Firmar a mano
                            </button>
                          </div>

                          {firmaTipo === 'perfil' ? (
                            <div className="border border-slate-200 bg-slate-50/30 rounded-xl p-3 text-center space-y-2 flex flex-col items-center justify-center min-h-[100px]">
                              {signaturePath ? (
                                <>
                                  {firmaPerfilPreviewUrl ? (
                                    <div className="bg-white border border-slate-200 rounded-lg p-2 max-w-[200px] h-[80px] flex items-center justify-center overflow-hidden">
                                      <img 
                                        src={firmaPerfilPreviewUrl} 
                                        alt="Vista previa de firma de perfil" 
                                        className="max-w-full max-h-full object-contain"
                                      />
                                    </div>
                                  ) : (
                                    <Loader2 className="h-5 w-5 animate-spin text-[#468DFF]" />
                                  )}
                                  <p className="text-[10px] text-green-600 font-bold">✓ Firma del perfil cargada correctamente.</p>
                                </>
                              ) : (
                                <p className="text-[10px] text-amber-600 font-bold">⚠ El profesional seleccionado no tiene una firma digital configurada.</p>
                              )}
                            </div>
                          ) : (
                            <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl aspect-[2/1] relative overflow-hidden flex items-center justify-center">
                              {firmaProfSavedUrl && !hasSignedProf ? (
                                <img src={firmaProfSavedUrl} alt="Firma Profesional" className="w-full h-full object-contain p-2" />
                              ) : (
                                <canvas
                                  ref={firmaProfCanvasRef}
                                  width={400}
                                  height={200}
                                  className={`w-full h-full bg-white block ${canEdit ? 'cursor-crosshair' : 'cursor-default'}`}
                                />
                              )}
                              {!hasSignedProf && !firmaProfSavedUrl && (
                                <span className="absolute pointer-events-none text-[10px] text-slate-400 font-bold uppercase tracking-wider">Dibuje la firma aquí</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                    </div>
                  </div>

                  </fieldset>

                  {/* Acciones del formulario */}
                  <div className="flex flex-col-reverse sm:flex-row justify-between items-stretch sm:items-center gap-3 pt-6 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={handleExitForm}
                      className="px-5 py-2.5 bg-[#FFFFFF] text-[#468DFF] border border-[#468DFF] rounded-xl text-sm font-bold hover:bg-[#468DFF] hover:text-[#FFFFFF] hover:border-[#FFFFFF] transition-all active:scale-[0.98] cursor-pointer text-center w-full sm:w-auto"
                    >
                      Salir
                    </button>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                      {isReadOnlyView ? (
                        canEditar && (
                          <button
                            type="button"
                            onClick={() => setIsReadOnlyView(false)}
                            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-bold transition-all active:scale-[0.98] cursor-pointer shadow-lg shadow-amber-500/10 text-center w-full sm:w-auto"
                          >
                            Editar
                          </button>
                        )
                      ) : (
                        <>
                          {editingId && canEliminar && (
                            <button
                              type="button"
                              onClick={() => handleDeleteClick(editingId)}
                              className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold transition-all active:scale-[0.98] cursor-pointer shadow-lg shadow-red-600/10 text-center w-full sm:w-auto"
                            >
                              Eliminar
                            </button>
                          )}
                          {canEdit && (
                            <button
                              type="submit"
                              disabled={saveLoading}
                              className="px-5 py-2.5 bg-[#468DFF] hover:bg-[#0511F2] text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer shadow-lg shadow-[#468DFF]/10 disabled:opacity-50 w-full sm:w-auto"
                            >
                              {saveLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                              {editingId ? 'Guardar Cambios' : 'Registrar Constancia'}
                            </button>
                          )}
                        </>
                      )}
                    </div>
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

      {/* MODAL DE CONFIRMACIÓN */}
      {modalAlert.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-150 p-6 shadow-xl max-w-sm w-full animate-scale-up space-y-4 text-center">
            <div className="mx-auto p-3 rounded-full w-12 h-12 flex items-center justify-center bg-amber-50 text-amber-500">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h4 className="font-outfit text-base font-bold text-slate-800">{modalAlert.title}</h4>
              <p className="text-xs text-slate-500 leading-relaxed">{modalAlert.message}</p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={closeAlert}
                className="flex-1 py-2.5 border border-slate-350 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all active:scale-[0.98] cursor-pointer"
              >
                Cancelar
              </button>
              {modalAlert.onConfirm && (
                <button
                  type="button"
                  onClick={modalAlert.onConfirm}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all active:scale-[0.98] cursor-pointer"
                >
                  {modalAlert.confirmText || 'Confirmar'}
                </button>
              )}
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
