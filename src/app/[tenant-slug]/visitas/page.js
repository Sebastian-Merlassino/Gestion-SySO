// src/app/[tenant-slug]/visitas/page.js
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import { supabase } from '@/lib/supabase';
import { formatDate, formatAsDateInput, convertToDbDate } from '@/lib/utils';
import { printPdfDocument } from '@/lib/pdf/pdfPrintHelper';
import ImageUploadZone from '@/components/ui/ImageUploadZone';
import AITextHelper from '@/components/ui/AITextHelper';
import { useToast } from '@/components/providers/ToastProvider';
import AppButton from '@/components/ui/AppButton';
import AppLabel from '@/components/ui/AppLabel';
import AppConfirmDialog from '@/components/ui/AppConfirmDialog';
import AppUnsavedChangesDialog from '@/components/ui/AppUnsavedChangesDialog';
import AppSendModal from '@/components/ui/AppSendModal';
import AppPhotoGalleryModal from '@/components/ui/AppPhotoGalleryModal';
import AppPageHeader from '@/components/ui/AppPageHeader';
import AppInput from '@/components/ui/AppInput';
import AppDatePicker from '@/components/ui/AppDatePicker';
import AppSelect from '@/components/ui/AppSelect';
import AppTextarea from '@/components/ui/AppTextarea';
import AppEmptyState from '@/components/ui/AppEmptyState';
import AppCard from '@/components/ui/AppCard';
import AppFormNavigator from '@/components/ui/AppFormNavigator';
import AppSortIcon from '@/components/ui/AppSortIcon';
import AppSignatureCanvas from '@/components/ui/AppSignatureCanvas';
import AppSkeleton from '@/components/ui/AppSkeleton';
import AppTooltip from '@/components/ui/AppTooltip';
import AppLoadingSpinner from '@/components/ui/AppLoadingSpinner';
import { generateVisitaPdf } from './utils/pdfGenerator';
import { formatPdfFileName } from '@/lib/pdf/pdfFileName';
import { getBase64ImageFromUrl } from '@/lib/pdf/pdfImages';
import * as XLSX from 'xlsx';
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
  FileSpreadsheet,
  Folder,
  Phone,
  MessageCircle,
  CheckSquare,
  Square,
  RotateCcw,
  Printer
} from 'lucide-react';
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
  const [adminContact, setAdminContact] = useState({ email: 'info@gestionsyso.com', phone: '1159969956 / 1132296691' });

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
  const [temaCustomText, setTemaCustomText] = useState('');

  const [realizaronSimulacros, setRealizaronSimulacros] = useState(false);

  // Simulacros multiselect
  const [selectedSimulacros, setSelectedSimulacros] = useState([]);
  const [simulacroCustomText, setSimulacroCustomText] = useState('');

  const [emiteAvisoRiesgo, setEmiteAvisoRiesgo] = useState(false);

  // Documentación multiselect
  const [selectedDocumentacion, setSelectedDocumentacion] = useState([]);
  const [documentacionCustomText, setDocumentacionCustomText] = useState('');
  const [docSearchTerm, setDocSearchTerm] = useState('');

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
  const [showExportMobile, setShowExportMobile] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setShowFilters(false);
    }
  }, []);

  // Auto-filtrar por cliente si la sesión iniciada es de rol 'cliente'
  useEffect(() => {
    if (profile && profile.role === 'cliente' && profile.empresa_id) {
      setFilterEmpresa(profile.empresa_id);
    }
  }, [profile]);

  // Ordenamiento
  const [sortField, setSortField] = useState('fecha');
  const [sortOrder, setSortOrder] = useState('desc');

  // Modales, Toast y loading
  const globalToast = useToast();
  const [modalAlert, setModalAlert] = useState({ show: false, title: '', message: '', onConfirm: null, confirmText: 'Confirmar' });
  const [unsavedDialogOpen, setUnsavedDialogOpen] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState(null);
  const [saveLoading, setSaveLoading] = useState(false);

  const originalDataRef = useRef('');

  const checkHasUnsavedChanges = () => {
    if (isReadOnlyView || !isFormOpen || !originalDataRef.current) return false;
    const currentData = JSON.stringify({
      empresaId,
      establecimientoId,
      fecha,
      profesionalTipo,
      profesionalId,
      profesionalNombre,
      responsablePresente,
      ocurrieronIncidentes,
      analisisCorrespondiente,
      causaRaiz,
      accionCorrectiva,
      relevamientoHigieneSeguridad,
      relevamientoPracticasSeguras,
      relevamientoEpp,
      realizaronMediciones,
      selectedMediciones,
      verificoAccionesCorrectivas,
      dictaronCapacitaciones,
      selectedTemas,
      realizaronSimulacros,
      selectedSimulacros,
      emiteAvisoRiesgo,
      selectedDocumentacion,
      observacionesRecomendaciones,
      observaciones,
      firmaTipo,
      signaturePath
    });
    return originalDataRef.current !== currentData;
  };
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

  // Modal para enviar correo / WhatsApp
  const [isMailModalOpen, setIsMailModalOpen] = useState(false);
  const [mailTargetVisita, setMailTargetVisita] = useState(null);
  const [availableEmails, setAvailableEmails] = useState([]); // { valor, descripcion, checked }
  const [manualEmail, setManualEmail] = useState('');
  const [mailLoading, setMailLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('email'); // 'email' o 'whatsapp'
  const [availablePhones, setAvailablePhones] = useState([]); // { valor, descripcion, checked }
  const [manualPhone, setManualPhone] = useState('');
  const [whatsappLoading, setWhatsappLoading] = useState(false);

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

  // Helper de dibujo del Canvas enlazado con useCallback
  const setupCanvas = useCallback((canvas, setHasSigned) => {
    if (!canvas || !canEdit) return;
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

    // Adjuntar la función de limpieza al propio objeto del nodo canvas para llamarla al desmontar
    canvas._cleanup = () => {
      canvas.removeEventListener('mousedown', startDrawing);
      canvas.removeEventListener('mousemove', draw);
      canvas.removeEventListener('mouseup', stopDrawing);
      canvas.removeEventListener('mouseleave', stopDrawing);
      canvas.removeEventListener('touchstart', startDrawing);
      canvas.removeEventListener('touchmove', draw);
      canvas.removeEventListener('touchend', stopDrawing);
    };
  }, [canEdit]);

  // Callback ref para el Canvas del Responsable de la Empresa
  const firmaRespRefCallback = useCallback((node) => {
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

  // Callback ref para el Canvas del Profesional de SySO
  const firmaProfRefCallback = useCallback((node) => {
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

  const triggerToast = (message, type = 'success') => {
    globalToast.toast(message, type);
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

      // Cargar Perfil del Administrador del Tenant
      const { data: adminProf } = await supabase
        .from('profiles')
        .select('email, phone')
        .eq('tenant_id', ten.id)
        .eq('role', 'admin')
        .limit(1)
        .maybeSingle();

      if (adminProf) {
        setAdminContact({
          email: adminProf.email || 'info@gestionsyso.com',
          phone: adminProf.phone || '1159969956 / 1132296691'
        });
      }

      // Empresas
      let empresasQuery = supabase
        .from('empresas')
        .select('id, razon_social, cuit, contactos_correos, contactos_telefonos')
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
    setPendingNavigation(null);
    setUnsavedDialogOpen(true);
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
      setPendingNavigation(path);
      setUnsavedDialogOpen(true);
    }
  };

  const executeUnsavedLeave = () => {
    if (pendingNavigation) {
      if (pendingNavigation.endsWith('/visitas')) {
        handleCloseForm();
      } else {
        window.location.href = pendingNavigation;
      }
      setPendingNavigation(null);
    } else {
      handleCloseForm();
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
    setTemaCustomText('');
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
    originalDataRef.current = '';
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
    setTemaCustomText('');
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
    
    let finalProfTipo = 'miembro';
    let finalProfId = '';
    let finalProfNombre = '';
    let finalSignaturePath = '';
    let finalFirmaTipo = 'perfil';

    const currentMember = miembrosList.find(m => m.profile_id === profile?.id);
    if (currentMember) {
      finalProfTipo = 'miembro';
      finalProfId = currentMember.id;
      finalProfNombre = currentMember.full_name;
      finalSignaturePath = currentMember.signature_url || '';
      finalFirmaTipo = currentMember.signature_url ? 'perfil' : 'mano';
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

    originalDataRef.current = JSON.stringify({
      empresaId: '',
      establecimientoId: '',
      fecha: formatDate(new Date().toISOString().split('T')[0]),
      profesionalTipo: finalProfTipo,
      profesionalId: finalProfId,
      profesionalNombre: finalProfNombre,
      responsablePresente: '',
      ocurrieronIncidentes: false,
      analisisCorrespondiente: 'N/A',
      causaRaiz: '',
      accionCorrectiva: '',
      relevamientoHigieneSeguridad: 'N/A',
      relevamientoPracticasSeguras: 'N/A',
      relevamientoEpp: 'N/A',
      realizaronMediciones: 'N/A',
      selectedMediciones: [],
      verificoAccionesCorrectivas: 'N/A',
      dictaronCapacitaciones: false,
      selectedTemas: [],
      realizaronSimulacros: false,
      selectedSimulacros: [],
      emiteAvisoRiesgo: false,
      selectedDocumentacion: [],
      observacionesRecomendaciones: '',
      observaciones: '',
      firmaTipo: finalFirmaTipo,
      signaturePath: finalSignaturePath
    });

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
    if (savedUrlSetter) savedUrlSetter('');
    setHasSigned(false);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
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

    let latestProfileSigEdit = '';
    if (v.profesional_tipo === 'miembro' && v.profesional_id) {
      const m = miembrosList.find(mem => mem.id === v.profesional_id);
      if (m) {
        latestProfileSigEdit = m.signature_url || '';
      }
    }
    const finalSignaturePath = latestProfileSigEdit || (v.firma_tipo === 'perfil' ? (v.firma_profesional || '') : '');

    originalDataRef.current = JSON.stringify({
      empresaId: v.empresa_id || '',
      establecimientoId: v.establecimiento_id || '',
      fecha: formatDate(v.fecha) || '',
      profesionalTipo: v.profesional_tipo || 'miembro',
      profesionalId: v.profesional_tipo === 'miembro' ? (v.profesional_id || '') : '__custom__',
      profesionalNombre: v.profesional_tipo === 'miembro' ? '' : (v.profesional_nombre || ''),
      responsablePresente: v.responsable_presente || '',
      ocurrieronIncidentes: v.ocurrieron_incidentes || false,
      analisisCorrespondiente: v.analisis_correspondiente || 'N/A',
      causaRaiz: v.causa_raiz || '',
      accionCorrectiva: v.accion_correctiva || '',
      relevamientoHigieneSeguridad: v.relevamiento_higiene_seguridad || 'N/A',
      relevamientoPracticasSeguras: v.relevamiento_practicas_seguras || 'N/A',
      relevamientoEpp: v.relevamiento_epp || 'N/A',
      realizaronMediciones: v.realizaron_mediciones || 'N/A',
      selectedMediciones: v.mediciones_realizadas || [],
      verificoAccionesCorrectivas: v.verifico_acciones_correctivas || 'N/A',
      dictaronCapacitaciones: v.dictaron_capacitaciones || false,
      selectedTemas: v.capacitaciones_temas || [],
      realizaronSimulacros: v.realizaron_simulacros || false,
      selectedSimulacros: v.simulacros_tipo || [],
      emiteAvisoRiesgo: v.emite_aviso_riesgo || false,
      selectedDocumentacion: v.documentacion_incorporada || [],
      observacionesRecomendaciones: v.observaciones_recomendaciones || '',
      observaciones: v.observaciones || '',
      firmaTipo: v.firma_tipo || 'mano',
      signaturePath: finalSignaturePath
    });

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
    setDocSearchTerm('');
  };

  const handleToggleTemaCapacitacion = (tName) => {
    setSelectedTemas(prev =>
      prev.includes(tName) ? prev.filter(x => x !== tName) : [...prev, tName]
    );
  };

  const handleAddCustomTema = () => {
    if (!temaCustomText.trim()) return;
    const txt = temaCustomText.trim();
    if (!selectedTemas.includes(txt)) {
      setSelectedTemas(prev => [...prev, txt]);
    }
    setTemaCustomText('');
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

  // Generar PDF refactorizado en utils/pdfGenerator.js
  const handleGeneratePdf = async (v, shouldDownload = true) => {
    return generateVisitaPdf(v, shouldDownload, {
      empresas,
      allEstablecimientos,
      tenant,
      profile,
      adminContact,
      supabase,
      triggerToast,
      isDevMode,
    });
  };

  // Previsualizar PDF en nueva pestaña sin descargar ni imprimir
  const handlePreviewPdf = async (v) => {
    const previewWindow = window.open('', '_blank');
    try {
      const blobUrl = await handleGeneratePdf(v, 'bloburl');
      if (blobUrl) {
        if (previewWindow) {
          previewWindow.location.href = blobUrl;
        } else {
          window.open(blobUrl, '_blank');
        }
        triggerToast('Vista previa abierta.');
      } else if (previewWindow && !previewWindow.closed) {
        previewWindow.close();
      }
    } catch (e) {
      if (previewWindow && !previewWindow.closed) {
        previewWindow.close();
      }
      console.error('Error al abrir la vista previa:', e);
      triggerToast('Error al generar el reporte PDF.', 'error');
    }
  };

  // Imprimir PDF mediante ventana nativa de impresión
  const handlePrintPdf = async (v) => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Imprimiendo Constancia de Visita...</title>
            <style>
              body { margin: 0; display: flex; align-items: center; justify-content: center; height: 100vh; font-family: system-ui, -apple-system, sans-serif; background: #f8fafc; color: #475569; }
              .loader { text-align: center; }
              .spinner { width: 36px; height: 36px; border: 3px solid #cbd5e1; border-top-color: #468DFF; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 12px; }
              @keyframes spin { to { transform: rotate(360deg); } }
            </style>
          </head>
          <body>
            <div class="loader">
              <div class="spinner"></div>
              <p style="font-weight: 600; margin: 0;">Generando vista de impresión...</p>
            </div>
          </body>
        </html>
      `);
    }

    try {
      const blobUrl = await handleGeneratePdf(v, 'bloburl');
      if (blobUrl) {
        printPdfDocument(blobUrl, printWindow, 'Constancia de Visita');
        triggerToast('Ventana de impresión abierta.');
      } else if (printWindow && !printWindow.closed) {
        printWindow.close();
      }
    } catch (e) {
      if (printWindow && !printWindow.closed) {
        printWindow.close();
      }
      console.error('Error al imprimir constancia de visita:', e);
      triggerToast('Error al generar el reporte PDF.', 'error');
    }
  };

  // Abrir modal de correo / WhatsApp
  const handleOpenMailModal = async (v) => {
    setMailTargetVisita(v);
    setActiveTab('email');
    
    // Obtener la empresa asociada para cargar sus contactos de correo y teléfonos
    const emp = empresas.find(e => e.id === v.empresa_id);
    
    // Cargar Correos
    if (emp && emp.contactos_correos && emp.contactos_correos.length > 0) {
      const formatted = emp.contactos_correos.map((c, i) => {
        const mailStr = (typeof c === 'object') ? (c.correo || c.valor || '') : String(c);
        const nameStr = (typeof c === 'object' && c.nombre) ? c.nombre : 'Contacto';
        const cargoStr = (typeof c === 'object' && c.cargo) ? c.cargo : '';
        return {
          valor: mailStr,
          descripcion: nameStr 
            ? `${nameStr}${cargoStr ? ` - ${cargoStr}` : ''} (${mailStr})` 
            : mailStr,
          checked: i === 0
        };
      }).filter(item => item.valor);
      setAvailableEmails(formatted);
    } else {
      setAvailableEmails([]);
    }
    setManualEmail('');

    // Cargar Teléfonos
    if (emp && emp.contactos_telefonos && emp.contactos_telefonos.length > 0) {
      const formatted = emp.contactos_telefonos.map((t, i) => {
        const phoneStr = (typeof t === 'object') ? (t.telefono || t.valor || '') : String(t);
        const nameStr = (typeof t === 'object' && t.nombre) ? t.nombre : 'Contacto';
        const cargoStr = (typeof t === 'object' && t.cargo) ? t.cargo : '';
        return {
          valor: phoneStr,
          descripcion: nameStr 
            ? `${nameStr}${cargoStr ? ` - ${cargoStr}` : ''} (${phoneStr})` 
            : phoneStr,
          checked: i === 0
        };
      }).filter(item => item.valor);
      setAvailablePhones(formatted);
    } else {
      setAvailablePhones([]);
    }
    setManualPhone('');
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

  // Enviar por WhatsApp
  const handleSendWhatsApp = async () => {
    setWhatsappLoading(true);
    try {
      // 1. Obtener destinatario (si hay)
      const checkedPhones = availablePhones.filter(p => p.checked).map(p => p.valor);
      const manualVal = manualPhone.trim();
      
      let targetPhone = '';
      if (checkedPhones.length > 0) {
        targetPhone = checkedPhones[0]; // tomar el primero seleccionado
      } else if (manualVal) {
        targetPhone = manualVal;
      }
      
      // Limpiar formato del número de teléfono (dejar solo dígitos)
      let cleanPhone = targetPhone.replace(/[^0-9]/g, '');
      
      // 2. Generar el PDF en formato Blob
      const pdfBlob = await handleGeneratePdf(mailTargetVisita, 'blob');
      if (!pdfBlob) throw new Error('No se pudo generar el reporte PDF.');
      
      // 3. Subir el reporte PDF a Supabase Storage
      const fileId = crypto.randomUUID();
      const filePath = `${profile?.id || 'anonymous'}/visita_${mailTargetVisita.id}_${fileId}.pdf`;
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, pdfBlob, {
          contentType: 'application/pdf',
          upsert: true
        });

      if (uploadError) {
        throw new Error(`Error al subir el reporte a Storage: ${uploadError.message}`);
      }

      // 4. Obtener URL firmada (604800 segundos = 7 días de validez)
      const { data: signData, error: signError } = await supabase.storage
        .from('documents')
        .createSignedUrl(filePath, 604800);
      
      if (signError || !signData?.signedUrl) {
        throw new Error(`Error al generar enlace seguro de descarga: ${signError?.message || 'Enlace nulo'}`);
      }

      const pdfUrl = signData.signedUrl;
      const emp = empresas.find(e => e.id === mailTargetVisita.empresa_id);
      const est = allEstablecimientos.find(e => e.id === mailTargetVisita.establecimiento_id);
      const empName = emp ? emp.razon_social : 'N/A';
      const estName = est ? est.denominacion : 'N/A';

      // 5. Construir mensaje descriptivo
      const tName = tenant ? (tenant.razon_social || tenant.nombre || 'Gestión SySO') : 'Gestión SySO';
      const textMessage = `Estimado cliente de *${empName}* (Establecimiento: *${estName}*),\n\nLe adjuntamos la *Constancia de Visita* del día *${formatDate(mailTargetVisita.fecha)}* generada por el profesional *${mailTargetVisita.profesional_nombre}* de *${tName}*.\n\nPuede ver y descargar el documento PDF ingresando al siguiente enlace seguro:\n${pdfUrl}`;
      
      const encodedMsg = encodeURIComponent(textMessage);
      
      // 6. Abrir WhatsApp
      let waUrl = '';
      if (cleanPhone) {
        waUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedMsg}`;
      } else {
        waUrl = `https://api.whatsapp.com/send?text=${encodedMsg}`;
      }
      
      window.open(waUrl, '_blank');
      triggerToast('Redirigiendo a WhatsApp...');
      setIsMailModalOpen(false);
    } catch (e) {
      console.error(e);
      triggerToast(e.message || 'Error al intentar enviar por WhatsApp.', 'error');
    } finally {
      setWhatsappLoading(false);
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

  const handleExportExcel = () => {
    if (!sortedVisitas || sortedVisitas.length === 0) {
      globalToast.toast('No hay visitas registradas para exportar.', 'error');
      return;
    }

    try {
      globalToast.toast('Generando reporte Excel de visitas...', 'info');

      const dataToExport = sortedVisitas.map(v => {
        const emp = empresas.find(e => e.id === v.empresa_id);
        const est = allEstablecimientos.find(e => e.id === v.establecimiento_id);

        const medicionesStr = Array.isArray(v.selected_mediciones) 
          ? v.selected_mediciones.join(', ') 
          : (v.selected_mediciones || '');

        const temasStr = Array.isArray(v.selected_temas) 
          ? v.selected_temas.join(', ') 
          : (v.selected_temas || '');

        const simulacrosStr = Array.isArray(v.selected_simulacros) 
          ? v.selected_simulacros.join(', ') 
          : (v.selected_simulacros || '');

        const docuStr = Array.isArray(v.selected_documentacion) 
          ? v.selected_documentacion.join(', ') 
          : (v.selected_documentacion || '');

        return {
          'Fecha': v.fecha ? formatDate(v.fecha) : '',
          'Cliente / Razón Social': emp ? emp.razon_social : '',
          'Establecimiento': est ? est.denominacion : '',
          'Profesional / Técnico': v.profesional_nombre || '',
          'Responsable Presente': v.responsable_presente || '',
          'Ocurrieron Incidentes': v.ocurrieron_incidentes ? 'Sí' : 'No',
          'Análisis Correspondiente': v.analisis_correspondiente || 'N/A',
          'Causa Raíz': v.causa_raiz || '',
          'Acción Correctiva': v.accion_correctiva || '',
          'Relevamiento H&S': v.relevamiento_higiene_seguridad || 'N/A',
          'Relevamiento Prácticas Seguras': v.relevamiento_practicas_seguras || 'N/A',
          'Relevamiento EPP': v.relevamiento_epp || 'N/A',
          'Realizaron Mediciones': v.realizaron_mediciones || 'N/A',
          'Detalle de Mediciones': medicionesStr,
          'Verificación Acciones Correctivas': v.verifico_acciones_correctivas || 'N/A',
          'Dictaron Capacitaciones': v.dictaron_capacitaciones ? 'Sí' : 'No',
          'Temas de Capacitación': temasStr,
          'Realizaron Simulacros': v.realizaron_simulacros ? 'Sí' : 'No',
          'Detalle de Simulacros': simulacrosStr,
          'Emite Aviso de Riesgo': v.emite_aviso_riesgo ? 'Sí' : 'No',
          'Documentación Solicitada/Entregada': docuStr,
          'Observaciones y Recomendaciones': v.observaciones_recomendaciones || '',
          'Observaciones Generales': v.observaciones || ''
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Constancias de Visita');

      const fileName = `Constancias_de_Visita_${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(workbook, fileName);

      globalToast.toast('Planilla Excel descargada con éxito.', 'success');
    } catch (err) {
      console.error('Error al exportar visitas a Excel:', err);
      globalToast.toast('Ocurrió un error al exportar la planilla a Excel.', 'error');
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
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        
        {/* Navbar / Top Bar */}
        <AppPageHeader
          title="Constancia de Visita"
          icon={ClipboardCheck}
          tenantName={tenant?.name || 'Cargando...'}
          planId={tenant?.plan_id}
          showPlanBadge={profile && profile.role !== 'cliente'}
          setIsMobileMenuOpen={setIsMobileMenuOpen}
        />

        {/* Content Body */}
        {loading ? (
          <AppLoadingSpinner message="Cargando constancias de visita..." />
        ) : (
          <div className="w-full flex-grow flex flex-col min-h-0 p-0 md:py-8 md:max-w-[95%] md:mx-auto md:px-0">

            {/* LISTADO DE VISITAS */}
            {!isFormOpen && (
              <div className="space-y-0 md:space-y-6 flex-1 flex flex-col min-h-0">
                {/* Herramientas, Búsqueda y Filtros */}
                <div className="bg-white border-y border-x-0 md:border md:border-slate-200 md:rounded-2xl px-3.5 py-2.5 sm:px-5 sm:py-3 md:px-6 md:py-3.5 shadow-sm space-y-2.5 shrink-0">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
                    {/* Espaciador para empujar el buscador a la derecha en desktop */}
                    <div className="hidden md:block flex-1"></div>

                    {/* Buscador y Exportar a Excel */}
                    <div className="flex flex-col md:flex-row md:items-center gap-2 w-full md:w-auto">
                      <div className="relative w-full md:w-64">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
                        <input 
                          type="text" 
                          placeholder="Buscar por profesional, responsable, observaciones..."
                          value={filterText}
                          onChange={(e) => setFilterText(e.target.value)}
                          className="w-full pl-9 pr-3.5 py-1.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all text-slate-700 placeholder-slate-400"
                        />
                      </div>

                      <AppButton
                        type="button"
                        variant="success"
                        size="sm"
                        onClick={handleExportExcel}
                        title="Descargar tabla completa de datos de visitas en Excel"
                        className="shadow-xs shrink-0"
                      >
                        <FileSpreadsheet className="h-4 w-4" />
                        <span>Exportar Excel</span>
                      </AppButton>
                    </div>
                  </div>

                  {/* Filtros avanzados colapsables */}
                  <div className="pt-1.5 border-t border-slate-100 space-y-2">
                    <div className="flex items-center justify-between min-h-[28px]">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setShowFilters(!showFilters)}
                          className="font-bold text-slate-400 flex items-center gap-1.5 uppercase tracking-wider text-[10px] hover:text-slate-600 transition-colors cursor-pointer"
                        >
                          <Sliders className="h-3 w-3" />
                          Filtros de búsqueda
                          {showFilters ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        </button>

                        {(filterText || filterEmpresa || filterEstablecimiento || filterFecha || filterAnio || filterMes) && (
                          <button 
                            type="button"
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
                            Limpiar filtros
                          </button>
                        )}
                      </div>

                      {canCargar && (
                        <AppButton 
                          variant="filter-primary"
                          size="sm"
                          onClick={handleAddNew}
                        >
                          <PlusCircle className="h-3.5 w-3.5" />
                          Nueva constancia
                        </AppButton>
                      )}
                    </div>

                    {showFilters && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 pt-1 animate-fade-in">
                        {/* Selector Cliente */}
                        {profile?.role !== 'cliente' && (
                          <div className="space-y-1">
                            <AppLabel size="sm">Filtrar por cliente</AppLabel>
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
                        )}

                        {/* Selector Establecimiento */}
                        <div className="space-y-1">
                          <AppLabel size="sm">Filtrar por establecimiento</AppLabel>
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
                          <AppLabel size="sm">Filtrar por fecha</AppLabel>
                          <input 
                            type="date"
                            value={filterFecha}
                            onChange={(e) => setFilterFecha(e.target.value)}
                            className="border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-600 focus:outline-none focus:border-[#468DFF] text-xs w-full cursor-pointer font-sans"
                          />
                        </div>

                        {/* Selector Año */}
                        <div className="space-y-1">
                          <AppLabel size="sm">Filtrar por año</AppLabel>
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
                          <AppLabel size="sm">Filtrar por mes</AppLabel>
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
                <div className={`bg-white border-y border-x-0 md:border md:border-slate-200 md:rounded-2xl shadow-sm overflow-hidden flex flex-col flex-grow min-h-0 md:flex-initial transition-all duration-300 ease-in-out ${showFilters ? 'md:h-[calc(100vh-310px)]' : 'md:h-[calc(100vh-240px)]'}`}>
                  {sortedVisitas.length === 0 ? (
                    <AppEmptyState
                      title="No hay constancias de visita registradas"
                      description="Registra una nueva constancia de visita para comenzar o modifica los filtros."
                      actionLabel={canCargar ? "Registrar constancia" : null}
                      onAction={canCargar ? handleAddNew : null}
                    />
                  ) : (
                    <div className="overflow-auto flex-grow">
                      <table className="w-full text-left border-collapse min-w-[850px]">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-400 uppercase tracking-wider">
                            <th className="px-6 py-4 cursor-pointer hover:text-slate-700 select-none sticky top-0 z-10 bg-slate-50 border-b border-slate-200" onClick={() => handleSort('cliente')}>
                              <div className="flex items-center gap-1.5">
                                Cliente
                                <AppSortIcon field="cliente" sortField={sortField} sortOrder={sortOrder} />
                              </div>
                            </th>
                            <th className="px-6 py-4 cursor-pointer hover:text-slate-700 select-none sticky top-0 z-10 bg-slate-50 border-b border-slate-200" onClick={() => handleSort('establecimiento')}>
                              <div className="flex items-center gap-1.5">
                                Establecimiento
                                <AppSortIcon field="establecimiento" sortField={sortField} sortOrder={sortOrder} />
                              </div>
                            </th>
                            <th className="px-6 py-4 cursor-pointer hover:text-slate-700 select-none sticky top-0 z-10 bg-slate-50 border-b border-slate-200" onClick={() => handleSort('fecha')}>
                              <div className="flex items-center gap-1.5">
                                Fecha
                                <AppSortIcon field="fecha" sortField={sortField} sortOrder={sortOrder} />
                              </div>
                            </th>
                            <th className="px-6 py-4 cursor-pointer hover:text-slate-700 select-none sticky top-0 z-10 bg-slate-50 border-b border-slate-200" onClick={() => handleSort('profesional_nombre')}>
                              <div className="flex items-center gap-1.5">
                                Profesional
                                <AppSortIcon field="profesional_nombre" sortField={sortField} sortOrder={sortOrder} />
                              </div>
                            </th>
                            <th className="px-6 py-4 sticky top-0 z-10 bg-slate-50 border-b border-slate-200 select-none">Responsable presente</th>
                            <th className="px-6 py-4 text-right sticky top-0 z-10 bg-slate-50 border-b border-slate-200">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs font-normal text-slate-700">
                          {sortedVisitas.map((v) => {
                            const emp = empresas.find(e => e.id === v.empresa_id);
                            const est = allEstablecimientos.find(e => e.id === v.establecimiento_id);
                            return (
                              <tr key={v.id} className="hover:bg-slate-100 cursor-pointer transition-colors" onClick={() => { setIsReadOnlyView(true); handleEditClick(v); }}>
                                <td className="px-6 py-4 font-semibold text-slate-900">{emp ? emp.razon_social : 'N/A'}</td>
                                <td className="px-6 py-4 font-medium text-slate-600">{est ? est.denominacion : 'N/A'}</td>
                                <td className="px-6 py-4 font-semibold text-slate-600">{formatDate(v.fecha)}</td>
                                <td className="px-6 py-4 text-slate-600">{v.profesional_nombre}</td>
                                <td className="px-6 py-4 text-slate-500">{v.responsable_presente}</td>
                                <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                                  <div className="flex items-center justify-end gap-2">
                                    <AppTooltip content="Visualizar PDF">
                                      <AppButton 
                                        variant="document-table"
                                        size="icon"
                                        onClick={() => handlePreviewPdf(v)}
                                      >
                                        <FileText className="h-4.5 w-4.5" />
                                      </AppButton>
                                    </AppTooltip>
                                    <AppTooltip content="Imprimir">
                                      <AppButton 
                                        variant="document-table"
                                        size="icon"
                                        onClick={() => handlePrintPdf(v)}
                                      >
                                        <Printer className="h-4.5 w-4.5" />
                                      </AppButton>
                                    </AppTooltip>
                                    <AppTooltip content="Descargar PDF">
                                      <AppButton 
                                        variant="document-table"
                                        size="icon"
                                        onClick={() => handleGeneratePdf(v)}
                                      >
                                        <Download className="h-4.5 w-4.5" />
                                      </AppButton>
                                    </AppTooltip>
                                    {profile && profile.role !== 'cliente' && (
                                      <AppTooltip content="Enviar por correo o WhatsApp">
                                        <AppButton 
                                          variant="document-table"
                                          size="icon"
                                          onClick={() => handleOpenMailModal(v)}
                                        >
                                          <Mail className="h-4.5 w-4.5" />
                                        </AppButton>
                                      </AppTooltip>
                                    )}
                                    {profile && profile.role !== 'cliente' && (
                                      canEditar ? (
                                        <AppTooltip content="Editar Constancia">
                                          <AppButton 
                                            variant="edit-table"
                                            size="icon"
                                            onClick={() => { setIsReadOnlyView(false); handleEditClick(v); }}
                                          >
                                            <Edit className="h-4.5 w-4.5" />
                                          </AppButton>
                                        </AppTooltip>
                                      ) : (
                                        <AppTooltip content="Ver Detalle">
                                          <AppButton 
                                            variant="ghost-table"
                                            size="icon"
                                            onClick={() => { setIsReadOnlyView(true); handleEditClick(v); }}
                                          >
                                            <Eye className="h-4.5 w-4.5" />
                                          </AppButton>
                                        </AppTooltip>
                                      )
                                    )}
                                    {profile && profile.role !== 'cliente' && canEliminar && (
                                      <AppTooltip content="Eliminar Constancia">
                                        <AppButton 
                                          variant="delete-table"
                                          size="icon"
                                          onClick={() => handleDeleteClick(v.id)}
                                        >
                                          <Trash2 className="h-4.5 w-4.5" />
                                        </AppButton>
                                      </AppTooltip>
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
              </div>
            )}

            {/* FORMULARIO INLINE */}
            {isFormOpen && (
              <div className="bg-white md:rounded-2xl md:border md:border-slate-200 md:shadow-sm overflow-hidden flex flex-col h-full md:h-[calc(100vh-128px)] animate-fade-in w-full">
                
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
                      {editingId ? 'Editar Constancia de Visita' : 'Registrar Nueva Constancia de Visita'}
                    </span>
                  </div>
                  <button type="button" onClick={handleExitForm} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-200 cursor-pointer">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Formulario */}
                <form onSubmit={handleSaveVisita} className="p-3.5 sm:p-6 space-y-3.5 sm:space-y-6 overflow-y-auto flex-1 scrollbar-thin">
                  <fieldset disabled={!canEdit} className="space-y-4 sm:space-y-6">
                  
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
                      <AppInput
                        label="C.U.I.T. (Lectura)"
                        value={derivedCuit}
                        readOnly
                        placeholder="CUIT automático"
                        disabled
                      />

                      {/* Dirección (Auto) */}
                      <AppInput
                        label="Dirección (Lectura)"
                        value={derivedDireccion}
                        readOnly
                        placeholder="Dirección automática"
                        disabled
                      />

                      {/* Fecha de visita */}
                      <AppDatePicker
                        label="Fecha"
                        required
                        value={fecha}
                        onChange={(e) => setFecha(e.target.value)}
                        disabled={isReadOnlyView}
                      />

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

                    <div className="space-y-3">
                      {/* Ocurrencia de incidentes */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border border-slate-200 bg-white">
                        <div className="flex gap-2 items-start">
                          <label className="text-xs font-bold text-slate-700 leading-normal">¿Ocurrieron incidentes o accidentes laborales desde la última visita? *</label>
                        </div>
                        <div className="flex items-center gap-1.5 w-full sm:w-48 shrink-0">
                          <button
                            type="button"
                            onClick={() => setOcurrieronIncidentes(true)}
                            className={`flex-1 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                              ocurrieronIncidentes
                                ? 'bg-[#468DFF] text-white border-[#468DFF] shadow-sm shadow-[#468DFF]/10'
                                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
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
                            className={`flex-1 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                              !ocurrieronIncidentes
                                ? 'bg-[#468DFF] text-white border-[#468DFF] shadow-sm shadow-[#468DFF]/10'
                                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            No
                          </button>
                        </div>
                      </div>

                      {/* Campos dinámicos condicionales a Sí */}
                      {ocurrieronIncidentes && (
                        <div className="bg-slate-50/50 p-4 border border-slate-200 rounded-2xl space-y-3 animate-fade-in">
                          
                          {/* Análisis de causa */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border border-slate-200 bg-white">
                            <div className="flex gap-2 items-start">
                              <label className="text-xs font-bold text-slate-700 leading-normal">¿Se realizó el análisis correspondiente (causa raíz, correctivas)? *</label>
                            </div>
                            <div className="flex items-center gap-1.5 w-full sm:w-48 shrink-0">
                              {['Sí', 'No', 'N/A'].map(opt => (
                                <button
                                  key={opt}
                                  type="button"
                                  onClick={() => setAnalisisCorrespondiente(opt)}
                                  className={`flex-1 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                                    analisisCorrespondiente === opt
                                      ? 'bg-[#468DFF] text-white border-[#468DFF] shadow-sm shadow-[#468DFF]/10'
                                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                                  }`}
                                >
                                  {opt}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Causa raíz */}
                            <div className="flex flex-col gap-2 p-3 rounded-xl border border-slate-200 bg-white">
                              <label className="text-xs font-bold text-slate-700">¿Cuál fue la causa raíz? *</label>
                              <input
                                type="text"
                                placeholder="Causa raíz identificada"
                                value={causaRaiz}
                                onChange={(e) => setCausaRaiz(e.target.value)}
                                required={ocurrieronIncidentes}
                                className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50"
                              />
                            </div>

                            {/* Acción correctiva */}
                            <div className="flex flex-col gap-2 p-3 rounded-xl border border-slate-200 bg-white">
                              <label className="text-xs font-bold text-slate-700">¿Qué acción correctiva se planificó / realizó? *</label>
                              <input
                                type="text"
                                placeholder="Acción correctiva"
                                value={accionCorrectiva}
                                onChange={(e) => setAccionCorrectiva(e.target.value)}
                                required={ocurrieronIncidentes}
                                className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50"
                              />
                            </div>
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

                    <div className="space-y-3">
                      {[
                        { label: 'Relevamiento de condiciones inseguras *', value: relevamientoHigieneSeguridad, setter: setRelevamientoHigieneSeguridad, options: ['Sí', 'No', 'N/A'] },
                        { label: 'Relevamiento Actos Inseguros *', value: relevamientoPracticasSeguras, setter: setRelevamientoPracticasSeguras, options: ['Sí', 'No', 'N/A'] },
                        { label: 'Relevamiento Uso de EPP *', value: relevamientoEpp, setter: setRelevamientoEpp, options: ['Sí', 'No', 'N/A'] },
                        { label: 'Verificó implementación de acciones correctivas previas *', value: verificoAccionesCorrectivas, setter: setVerificoAccionesCorrectivas, options: ['Sí', 'No', 'N/A'] },
                        {
                          label: '¿Realizaron Mediciones? *',
                          value: realizaronMediciones,
                          setter: (val) => {
                            setRealizaronMediciones(val);
                            if (val !== 'Sí') {
                              setSelectedMediciones([]);
                            }
                          },
                          options: ['Sí', 'No', 'N/A']
                        }
                      ].map((item, idx) => (
                        <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border border-slate-200 bg-white">
                          <div className="flex gap-2 items-start">
                            <span className="text-xs font-bold text-slate-700 leading-normal">{item.label}</span>
                          </div>
                          <div className="flex items-center gap-1.5 w-full sm:w-48 shrink-0">
                            {item.options.map(opt => {
                              const isSelected = item.value === opt;
                              return (
                                <button
                                  key={opt}
                                  type="button"
                                  onClick={() => item.setter(opt)}
                                  className={`flex-1 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                                    isSelected
                                      ? 'bg-[#468DFF] text-white border-[#468DFF] shadow-sm'
                                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                                  }`}
                                >
                                  {opt}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Mediciones condicionales a Sí */}
                    {realizaronMediciones === 'Sí' && (
                      <div className="bg-slate-50/50 p-4 border border-slate-200 rounded-2xl space-y-3 animate-fade-in">
                        <label className="text-xs font-bold text-slate-600 block">Mediciones de contaminantes físicos/químicos o evaluaciones técnicas:</label>
                        
                        <div className="flex flex-wrap gap-2">
                          {Array.from(new Set([...MEDICIONES_OPTS, ...selectedMediciones])).map(m => {
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

                    <div className="space-y-3">
                      {/* ¿Se dictaron capacitaciones? */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border border-slate-200 bg-white">
                        <div className="flex gap-2 items-start">
                          <label className="text-xs font-bold text-slate-700 leading-normal">¿Se dictaron capacitaciones? *</label>
                        </div>
                        <div className="flex items-center gap-1.5 w-full sm:w-48 shrink-0">
                          <button
                            type="button"
                            onClick={() => setDictaronCapacitaciones(true)}
                            className={`flex-1 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
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
                            className={`flex-1 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                              !dictaronCapacitaciones
                                ? 'bg-[#468DFF] text-white border-[#468DFF] shadow-sm'
                                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            No
                          </button>
                        </div>
                      </div>

                      {/* Especificar temas capacitados (condicional) */}
                      {dictaronCapacitaciones && (
                        <div className="bg-slate-50/50 p-4 border border-slate-200 rounded-2xl space-y-3 animate-fade-in relative">
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
                                    {Array.from(new Set([
                                      ...temasList.map(t => t.tema),
                                      ...selectedTemas
                                    ]))
                                      .filter(tName => tName.toLowerCase().includes(searchTopicTerm.toLowerCase()))
                                      .map((tName, idx) => {
                                        const isChecked = selectedTemas.includes(tName);
                                        return (
                                          <label key={idx} className="flex items-center gap-2 py-1.5 text-xs font-semibold hover:bg-slate-50 cursor-pointer px-1">
                                            <input
                                              type="checkbox"
                                              checked={isChecked}
                                              onChange={() => handleToggleTemaCapacitacion(tName)}
                                              className="accent-[#468DFF]"
                                            />
                                            {tName}
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

                          {/* Agregar tema manual */}
                          <div className="flex gap-2 max-w-md pt-2">
                            <input
                              type="text"
                              placeholder="Agregar otro tema..."
                              value={temaCustomText}
                              onChange={(e) => setTemaCustomText(e.target.value)}
                              className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-[#468DFF] bg-white"
                            />
                            <button
                              type="button"
                              onClick={handleAddCustomTema}
                              className="px-3 py-1.5 bg-[#468DFF] hover:bg-[#0511F2] text-white text-xs font-bold rounded-lg cursor-pointer"
                            >
                              Agregar
                            </button>
                          </div>
                        </div>
                      )}

                      {/* ¿Se realizaron simulacros? */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border border-slate-200 bg-white">
                        <div className="flex gap-2 items-start">
                          <label className="text-xs font-bold text-slate-700 leading-normal">¿Se realizaron simulacros? *</label>
                        </div>
                        <div className="flex items-center gap-1.5 w-full sm:w-48 shrink-0">
                          <button
                            type="button"
                            onClick={() => setRealizaronSimulacros(true)}
                            className={`flex-1 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
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
                            className={`flex-1 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
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

                    {/* Especificar simulacros (condicional) */}
                    {realizaronSimulacros && (
                      <div className="bg-slate-50/50 p-4 border border-slate-200 rounded-2xl space-y-3 animate-fade-in">
                        <label className="text-xs font-bold text-slate-600 block">Especificar tipo de simulacro:</label>
                        
                        <div className="flex flex-wrap gap-2">
                          {Array.from(new Set([...SIMULACROS_OPTS, ...selectedSimulacros])).map(s => {
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
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border border-slate-200 bg-white">
                        <div className="flex gap-2 items-start">
                          <label className="text-xs font-bold text-slate-700 leading-normal">¿Se emite aviso de riesgo por condiciones inseguras / actos inseguros? *</label>
                        </div>
                        <div className="flex items-center gap-1.5 w-full sm:w-48 shrink-0">
                          <button
                            type="button"
                            onClick={() => setEmiteAvisoRiesgo(true)}
                            className={`flex-1 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                              emiteAvisoRiesgo
                                ? 'bg-[#468DFF] text-white border-[#468DFF] shadow-sm'
                                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            Sí
                          </button>
                          <button
                            type="button"
                            onClick={() => setEmiteAvisoRiesgo(false)}
                            className={`flex-1 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                              !emiteAvisoRiesgo
                                ? 'bg-[#468DFF] text-white border-[#468DFF] shadow-sm'
                                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            No
                          </button>
                        </div>
                      </div>

                    {/* Documentación incorporada al Legajo - Panel Checklist */}
                    <div className="bg-slate-50/70 p-4 sm:p-5 border border-slate-200 rounded-2xl space-y-3.5 shadow-xs">
                      {/* Cabecera del Panel */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 pb-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <FileText className="h-4.5 w-4.5 text-[#468DFF]" />
                          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                            Documentación incorporada al Legajo de SySO
                          </label>
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#468DFF]/10 text-[#468DFF]">
                            {selectedDocumentacion.length} {selectedDocumentacion.length === 1 ? 'seleccionado' : 'seleccionados'}
                          </span>
                        </div>
                        {selectedDocumentacion.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setSelectedDocumentacion([])}
                            className="text-[11px] font-semibold text-slate-500 hover:text-red-500 transition-colors self-start sm:self-auto cursor-pointer"
                          >
                            Desmarcar todos
                          </button>
                        )}
                      </div>

                      {/* Buscador de opciones */}
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                        <input
                          type="text"
                          placeholder="Buscar en el catálogo de documentación (ej: Ergonomía, Ruido, RGRL)..."
                          value={docSearchTerm}
                          onChange={(e) => setDocSearchTerm(e.target.value)}
                          className="w-full pl-9 pr-8 py-2 border border-slate-200 rounded-xl text-xs bg-white text-slate-700 placeholder-slate-400 focus:outline-none focus:border-[#468DFF] focus:ring-1 focus:ring-[#468DFF] transition-all"
                        />
                        {docSearchTerm && (
                          <button
                            type="button"
                            onClick={() => setDocSearchTerm('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Lista desplegada de Checkboxes en cuadrícula (2 columnas) */}
                      <div className="max-h-72 overflow-y-auto pr-1 border border-slate-200/80 rounded-xl bg-white p-2 shadow-inner">
                        {(() => {
                          const allDocOptions = Array.from(new Set([...DOCUMENTACION_OPTS, ...selectedDocumentacion]));
                          const filteredDocOptions = allDocOptions.filter(opt =>
                            opt.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
                              .includes(docSearchTerm.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""))
                          );

                          if (filteredDocOptions.length === 0) {
                            return (
                              <div className="p-4 text-center text-xs text-slate-400 italic">
                                No se encontraron elementos de documentación que coincidan con &quot;{docSearchTerm}&quot;
                              </div>
                            );
                          }

                          return (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                              {filteredDocOptions.map((d) => {
                                const isSel = selectedDocumentacion.includes(d);
                                return (
                                  <button
                                    key={d}
                                    type="button"
                                    onClick={() => handleToggleDocumentacion(d)}
                                    className={`flex items-start gap-2.5 p-2.5 rounded-lg border text-left text-xs transition-all cursor-pointer select-none ${
                                      isSel
                                        ? 'bg-[#468DFF]/10 border-[#468DFF] text-[#468DFF] font-semibold'
                                        : 'bg-slate-50/50 border-slate-200/70 hover:bg-slate-100 text-slate-700'
                                    }`}
                                  >
                                    {isSel ? (
                                      <CheckSquare className="h-4 w-4 text-[#468DFF] shrink-0 mt-0.5" />
                                    ) : (
                                      <Square className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                                    )}
                                    <span className="leading-snug flex-1 break-words">{d}</span>
                                  </button>
                                );
                              })}
                            </div>
                          );
                        })()}
                      </div>

                      {/* Agregar documentación manual */}
                      <div className="pt-1">
                        <label className="text-[11px] font-semibold text-slate-500 block mb-1.5">
                          ¿No encuentras una opción en la lista? Agrégala manualmente:
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Escriba otra documentación no presente en el catálogo..."
                            value={documentacionCustomText}
                            onChange={(e) => setDocumentacionCustomText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddCustomDocumentacion();
                              }
                            }}
                            className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#468DFF] focus:ring-1 focus:ring-[#468DFF] bg-white"
                          />
                          <button
                            type="button"
                            onClick={handleAddCustomDocumentacion}
                            className="px-4 py-2 bg-[#468DFF] hover:bg-[#0511F2] text-white text-xs font-bold rounded-xl transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer shadow-xs"
                          >
                            <PlusCircle className="h-3.5 w-3.5" />
                            Agregar
                          </button>
                        </div>
                      </div>

                      {/* Badges de resumen de seleccionados */}
                      {selectedDocumentacion.length > 0 && (
                        <div className="pt-2 border-t border-slate-200/60 space-y-1.5">
                          <span className="text-[11px] font-bold text-slate-500 block">
                            Documentos seleccionados actualmente:
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {selectedDocumentacion.map((d) => (
                              <span
                                key={d}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 text-[#468DFF] text-xs font-semibold"
                              >
                                <span className="max-w-[280px] truncate">{d}</span>
                                <button
                                  type="button"
                                  onClick={() => handleToggleDocumentacion(d)}
                                  className="hover:text-red-500 p-0.5 rounded-full hover:bg-blue-100 transition-colors cursor-pointer"
                                  title="Quitar ítem"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
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
                        <div className="flex items-center justify-between gap-2 min-h-[28px]">
                          <label className="text-xs font-bold text-slate-600">Observaciones y recomendaciones preventivas (Se imprimen en el PDF)</label>
                          <AITextHelper
                            value={observacionesRecomendaciones}
                            onChange={setObservacionesRecomendaciones}
                            context="Observaciones y recomendaciones preventivas sobre desvíos detectados en visitas de Higiene y Seguridad"
                            disabled={!canEdit}
                          />
                        </div>
                        <textarea
                          rows="4"
                          placeholder="Escriba aquí los desvíos detectados y las recomendaciones preventivas específicas..."
                          value={observacionesRecomendaciones}
                          onChange={(e) => setObservacionesRecomendaciones(e.target.value)}
                          disabled={!canEdit}
                          className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
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
                      6. Firmas de la Constancia
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      
                      {/* Firma 1: Responsable Empresa */}
                      <div className="space-y-2 flex flex-col">
                        <div className="flex flex-row justify-between items-end gap-2 min-h-[18px]">
                          <label className="text-xs font-bold text-slate-600 pr-2">Firma del Responsable de la Empresa</label>
                        </div>

                        {/* Espaciador para compensar el selector de la firma del profesional y mantener alineados los cuadros */}
                        <div className="hidden md:block h-[51px] shrink-0" />

                        {/* Cuadro de Firma (Canvas o Visualización de guardada) */}
                        <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl aspect-[2/1] relative overflow-hidden flex items-center justify-center">
                          {firmaRespSavedUrl && !hasSignedResp ? (
                            <img src={firmaRespSavedUrl} alt="Firma Responsable" className="w-full h-full object-contain p-2" />
                          ) : (
                            <canvas
                              ref={firmaRespRefCallback}
                              width={400}
                              height={200}
                              className={`w-full h-full bg-white block ${canEdit ? 'cursor-crosshair' : 'cursor-default'}`}
                            />
                          )}
                          {!hasSignedResp && !firmaRespSavedUrl && (
                            <span className="absolute pointer-events-none text-[10px] text-slate-400 font-bold uppercase tracking-wider">Dibuje la firma aquí</span>
                          )}
                          {canEdit && (hasSignedResp || firmaRespSavedUrl) && (
                            <button
                              type="button"
                              onClick={() => handleClearCanvas(firmaRespCanvasRef, setHasSignedResp, setFirmaRespSavedUrl)}
                              className="absolute bottom-2 right-2 z-20 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white/90 hover:bg-white border border-slate-200 rounded-lg shadow-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                              title="Limpiar trazo de firma"
                            >
                              <RotateCcw className="h-3 w-3 text-slate-500" />
                              <span>Limpiar</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Firma 2: Profesional Higiene y Seguridad: SySO-Signature-Tabbed-Container */}
                      <div className="flex flex-col gap-1.5 justify-end">
                        <label className="text-xs font-bold text-slate-650 pr-2">Firma del Profesional Técnico</label>
                        
                        <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm flex flex-col min-h-[220px]">
                          {/* Solapas superiores integradas */}
                          <div className="flex border-b border-slate-200 bg-white">
                            <button
                              type="button"
                              disabled={!canEdit}
                              onClick={() => {
                                setFirmaTipo('perfil');
                              }}
                              className={`flex-1 py-2.5 text-xs font-bold transition-all cursor-pointer border-none ${
                                firmaTipo === 'perfil'
                                  ? 'bg-[#468DFF] text-white font-extrabold shadow-inner'
                                  : 'bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                              }`}
                            >
                              Firma de Perfil
                            </button>
                            <button
                              type="button"
                              disabled={!canEdit}
                              onClick={() => {
                                setFirmaTipo('mano');
                              }}
                              className={`flex-1 py-2.5 text-xs font-bold transition-all cursor-pointer border-none ${
                                firmaTipo === 'mano'
                                  ? 'bg-[#468DFF] text-white font-extrabold shadow-inner'
                                  : 'bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                              }`}
                            >
                              Firmar a mano
                            </button>
                          </div>

                          {/* Cuerpo del contenedor */}
                          <div className="p-4 bg-slate-50/50 flex-1 flex flex-col justify-center relative">
                            {firmaTipo === 'perfil' ? (
                              <div className="border-2 border-dashed border-slate-200 bg-white rounded-xl aspect-[2/1] relative overflow-hidden flex items-center justify-center p-3 text-center min-h-[140px] shadow-sm">
                                {signaturePath && signaturePath !== 'N/A' ? (
                                  <div className="flex flex-col items-center justify-center h-full w-full">
                                    {firmaPerfilPreviewUrl ? (
                                      <div className="bg-white border border-slate-100 rounded-lg p-2 max-w-[200px] h-[80px] flex items-center justify-center overflow-hidden">
                                        <img 
                                          src={firmaPerfilPreviewUrl} 
                                          alt="Vista previa de firma de perfil" 
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
                              <div className="bg-white border-2 border-dashed border-slate-200 rounded-xl aspect-[2/1] relative overflow-hidden flex items-center justify-center min-h-[140px] shadow-sm">
                                {firmaProfSavedUrl && !hasSignedProf ? (
                                  <img src={firmaProfSavedUrl} alt="Firma Profesional" className="w-full h-full object-contain p-2" />
                                ) : (
                                  <canvas
                                    ref={firmaProfRefCallback}
                                    width={400}
                                    height={200}
                                    className={`w-full h-full bg-white block ${canEdit ? 'cursor-crosshair' : 'cursor-default'}`}
                                  />
                                )}
                                {!hasSignedProf && !firmaProfSavedUrl && (
                                  <span className="absolute pointer-events-none text-[10px] text-slate-400 font-bold uppercase tracking-wider">Dibuje la firma aquí</span>
                                )}
                                {canEdit && (hasSignedProf || firmaProfSavedUrl) && (
                                  <button
                                    type="button"
                                    onClick={() => handleClearCanvas(firmaProfCanvasRef, setHasSignedProf, setFirmaProfSavedUrl)}
                                    className="absolute bottom-2 right-2 z-20 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white/90 hover:bg-white border border-slate-200 rounded-lg shadow-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                                    title="Limpiar trazo de firma"
                                  >
                                    <RotateCcw className="h-3 w-3 text-slate-500" />
                                    <span>Limpiar</span>
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>

                  </fieldset>

                  {/* Acciones del formulario */}
                  <div className="flex flex-col-reverse sm:flex-row justify-between items-stretch sm:items-center gap-3 pt-6 border-t border-slate-100">
                    <AppButton
                      variant="secondary"
                      onClick={handleExitForm}
                      className="w-full sm:w-auto"
                    >
                      Salir
                    </AppButton>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                      {editingId && (
                        <>
                          <AppButton
                            variant="secondary"
                            onClick={() => {
                              const v = visitas.find(x => x.id === editingId);
                              if (v) handleOpenMailModal(v);
                            }}
                            className="w-full sm:w-auto flex items-center gap-1.5 shadow-sm"
                          >
                            <Mail className="h-4 w-4" />
                            Enviar PDF
                          </AppButton>
                          <AppButton
                            variant="secondary"
                            onClick={() => {
                              const v = visitas.find(x => x.id === editingId);
                              if (v) handlePrintPdf(v);
                            }}
                            className="w-full sm:w-auto flex items-center gap-1.5 shadow-sm"
                          >
                            <Printer className="h-4 w-4" />
                            Imprimir
                          </AppButton>
                          <AppButton
                            variant="primary"
                            onClick={() => {
                              const v = visitas.find(x => x.id === editingId);
                              if (v) handleGeneratePdf(v);
                            }}
                            className="w-full sm:w-auto flex items-center gap-1.5 shadow-md shadow-[#468DFF]/10"
                          >
                            <Download className="h-4 w-4" />
                            Descargar PDF
                          </AppButton>
                        </>
                      )}
                      {isReadOnlyView ? (
                        canEditar && (
                          <AppButton
                            className="bg-amber-500 hover:bg-amber-600 border-amber-500 hover:border-amber-600 text-white shadow-lg shadow-amber-500/10 text-center w-full sm:w-auto"
                            onClick={() => setIsReadOnlyView(false)}
                          >
                            Editar
                          </AppButton>
                        )
                      ) : (
                        <>
                          {editingId && canEliminar && (
                            <AppButton
                              variant="destructive"
                              className="w-full sm:w-auto"
                              onClick={() => handleDeleteClick(editingId)}
                            >
                              Eliminar
                            </AppButton>
                          )}
                          {canEdit && (
                            <AppButton
                              type="submit"
                              loading={saveLoading}
                              className="w-full sm:w-auto"
                            >
                              Guardar
                            </AppButton>
                          )}
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

      {/* DIÁLOGO ESTÁNDAR: ENVÍO DE REPORTE (EMAIL / WHATSAPP) */}
      <AppSendModal
        isOpen={isMailModalOpen && Boolean(mailTargetVisita)}
        onClose={() => setIsMailModalOpen(false)}
        title="Enviar Constancia (PDF)"
        subtitle={mailTargetVisita ? `${empresas.find(e => e.id === mailTargetVisita.empresa_id)?.razon_social || 'Cliente'} — ${formatDate(mailTargetVisita.fecha)}` : undefined}
        availableEmails={availableEmails}
        setAvailableEmails={setAvailableEmails}
        manualEmail={manualEmail}
        setManualEmail={setManualEmail}
        onSendEmail={handleSendEmail}
        isEmailLoading={mailLoading}
        availablePhones={availablePhones}
        setAvailablePhones={setAvailablePhones}
        manualPhone={manualPhone}
        setManualPhone={setManualPhone}
        onSendWhatsApp={handleSendWhatsApp}
        isWhatsappLoading={whatsappLoading}
      />

      {/* MODAL UNIVERSAL DE VISUALIZACIÓN DE FOTOS DE REGISTRO */}
      <AppPhotoGalleryModal
        open={Boolean(viewingFotosVisita)}
        onOpenChange={(open) => {
          if (!open) {
            setViewingFotosVisita(null);
            setViewingFotosUrls([]);
          }
        }}
        title="Registros de visita"
        subtitle={viewingFotosVisita ? `${viewingFotosVisita.profesional_nombre || ''} - ${formatDate(viewingFotosVisita.fecha)}` : ''}
        photos={viewingFotosUrls}
      />

      {/* MODAL DE CONFIRMACIÓN */}
      <AppConfirmDialog
        open={modalAlert.show}
        onOpenChange={(open) => setModalAlert(prev => ({ ...prev, show: open }))}
        title={modalAlert.title}
        description={modalAlert.message}
        type={modalAlert.title?.toLowerCase().includes('eliminar') ? 'destructive' : 'warning'}
        onConfirm={modalAlert.onConfirm}
        confirmText={modalAlert.confirmText}
        cancelText="Cancelar"
      />

      {/* DIÁLOGO ESTÁNDAR SALIR SIN GUARDAR */}
      <AppUnsavedChangesDialog
        open={unsavedDialogOpen}
        onOpenChange={setUnsavedDialogOpen}
        onLeave={executeUnsavedLeave}
      />

      {/* TOAST DE FEEDBACK removido - consumidos globalmente */}
      <AppFormNavigator
        activeList={visitas}
        currentId={editingId}
        onNavigate={(newVis) => handleEditClick(newVis)}
        hasUnsavedChanges={!isReadOnlyView}
        isFormOpen={isFormOpen}
      />

    </div>
  );
}
