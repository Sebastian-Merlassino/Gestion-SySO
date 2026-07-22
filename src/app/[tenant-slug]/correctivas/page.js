// src/app/[tenant-slug]/correctivas/page.js
'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import { supabase } from '@/lib/supabase';
import { formatDate, formatAsDateInput, convertToDbDate } from '@/lib/utils';
import ImageUploadZone from '@/components/ui/ImageUploadZone';
import { useToast } from '@/components/providers/ToastProvider';
import AppPageHeader from '@/components/ui/AppPageHeader';
import AppButton from '@/components/ui/AppButton';
import AppInput from '@/components/ui/AppInput';
import AppSelect from '@/components/ui/AppSelect';
import AppTextarea from '@/components/ui/AppTextarea';
import AppConfirmDialog from '@/components/ui/AppConfirmDialog';
import AppCard from '@/components/ui/AppCard';
import AppEmptyState from '@/components/ui/AppEmptyState';
import AITextHelper from '@/components/ui/AITextHelper';
import AppFormNavigator from '@/components/ui/AppFormNavigator';
import { 
  PlusCircle, 
  AlertCircle,
  Search, 
  Building, 
  Users, 
  AlertTriangle, 
  Printer, 
  X, 
  Check, 
  Loader2, 
  Trash2, 
  Edit, 
  Briefcase, 
  Settings, 
  LogOut, 
  User, 
  Menu,
  ClipboardList,
  Calendar,
  GraduationCap,
  Image as ImageIcon,
  MapPin,
  Eye,
  ArrowLeft,
  Camera,
  Upload,
  ChevronLeft,
  ChevronRight,
  Sliders,
  Flame,
  ClipboardCheck,
  ChevronDown,
  ChevronUp,
  Folder,
  HelpCircle,
  FileText
} from 'lucide-react';

const FUENTE_OPTIONS = [
  'Accidente',
  'ACUMAR',
  'Análisis de efluentes gaseosos',
  'Análisis de efluentes líquidos',
  'Análisis de la intensidad mínima de Iluminación, sobre el plano de trabajo',
  'Análisis de los niveles de exposicion a Contaminantes Fisicos (CONDICIONES HIGROTERMICAS)',
  'Análisis de los niveles de exposicion a Contaminantes Físicos (LÁSERES)',
  'Análisis de los niveles de exposicion a Contaminantes Físicos (RADIACIONES IONIZANTES)',
  'Análisis de los niveles de exposicion a Contaminantes Físicos (RADIACIONES NO IONIZANTES)',
  'Análisis de los niveles de exposicion a Contaminantes Fisicos (RUIDO)',
  'Análisis de los niveles de exposicion a Contaminantes Fisicos (VIBRACIONES)',
  'Análisis de los niveles de exposicion a Contaminantes Químicos en el aire',
  'Análisis de Puesta a tierra y continuidad de masas',
  'Análisis de ventilación mínima',
  'Análisis del registro de accidentes / incidentes',
  'Análisis físicosquímico / bacteriológico de agua para el consumo humano',
  'APRA',
  'ART',
  'Auditoria',
  'Audoría del Sistema de Gestión',
  'Auditoría Externa ISO 14001:2015',
  'Auditoría Externa ISO 45001:2018',
  'Auditoría Interna',
  'Auditoría interna ISO 14001:2015',
  'Auditoría Interna ISO 45001:2018',
  'Auditoría Legal',
  'Autoridad del Agua (ADA)',
  'AYSA',
  'Capacitaciones',
  'Comite mixto de Higiene y Seguridad',
  'Dirección',
  'Ergonomía',
  'Gremio',
  'Incidente',
  'Inspección de organimo gubernamental',
  'Instituto Nacional del Agua (INA)',
  'KPI´s',
  'Matriz de riesgos',
  'Ministerio de Ambiente PBA (ex OPDS)',
  'Ministerio Trabajo',
  'Municipio',
  'Objetivo anual global',
  'Objetivo anual local',
  'Observación',
  'Recorrida de planta',
  'Requisito legal vigente',
  'Residuos especiales',
  'Residuos no especiales',
  'Reuniones Semanales',
  'Revisión por Dirección',
  'RGRL',
  'SEDRONAR',
  'Simulacro',
  'SRT',
  'Sugerencia del personal',
  'Visita de Higiene y Seguridad',
  'Yokoten',
  'Aseguradora'
];

const TIPO_HALLAZGO_OPTIONS = [
  'Condición insegura',
  'Acto inseguro',
  'Condición insegura / Acto inseguro',
  'No conformidad',
  'Observación',
  'Oportunidad de mejora',
  'N/A'
];

const NIVEL_RIESGO_OPTIONS = [
  'Riesgo trivial',
  'Riesgo tolerable',
  'Riesgo moderado',
  'Riesgo sustancial',
  'Riesgo intolerable',
  'N/A'
];

const getPathsFromImagenUrl = (imagenUrl) => {
  if (!imagenUrl || imagenUrl === 'N/A') return [];

  const isInvalidAppSheetUrl = (url) => {
    if (typeof url === 'string' && url.includes('gettablefileurl')) {
      try {
        const urlObj = new URL(url);
        const fileName = urlObj.searchParams.get('fileName');
        return !fileName || fileName.trim() === '';
      } catch (e) {
        return url.endsWith('fileName=') || url.includes('fileName=&');
      }
    }
    return false;
  };

  if (imagenUrl.startsWith('[') && imagenUrl.endsWith(']')) {
    try {
      const parsed = JSON.parse(imagenUrl);
      if (Array.isArray(parsed)) {
        return parsed.filter(url => url && url !== 'N/A' && !isInvalidAppSheetUrl(url));
      }
      return isInvalidAppSheetUrl(imagenUrl) ? [] : [imagenUrl];
    } catch (e) {
      return isInvalidAppSheetUrl(imagenUrl) ? [] : [imagenUrl];
    }
  }
  return isInvalidAppSheetUrl(imagenUrl) ? [] : [imagenUrl];
};

export default function AccionesCorrectivasPage({ params }) {
  const tenantSlug = params['tenant-slug'];


  // Estados estructurales
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
  const [editingId, setEditingId] = useState(null);
  const [isReadOnlyView, setIsReadOnlyView] = useState(false);
  const [showRiskMatrix, setShowRiskMatrix] = useState(false);

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

  const sectionPerms = getSectionPermissions(profile, 'correctivas');
  const canCargar = sectionPerms.cargar;
  const canEditar = sectionPerms.editar;
  const canEliminar = sectionPerms.eliminar;
  const isFormDisabled = (editingId ? !canEditar : !canCargar) || isReadOnlyView;
  const canEdit = !isFormDisabled; // Maintain compatibility

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

  // Datos principales de acciones
  const [acciones, setAcciones] = useState([]);

  // Estados del CRUD / Vista Formulario
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Campos del Formulario
  const [empresaId, setEmpresaId] = useState('');
  const [establecimientoId, setEstablecimientoId] = useState('');
  const [fuente, setFuente] = useState('');
  const [fuenteOtra, setFuenteOtra] = useState('');
  const [fecha, setFecha] = useState('');
  const [areaSector, setAreaSector] = useState('');
  const [puestoOperacion, setPuestoOperacion] = useState('');
  const [tipoHallazgo, setTipoHallazgo] = useState('');
  const [tipoHallazgoOtro, setTipoHallazgoOtro] = useState('');
  const [descripcionHallazgo, setDescripcionHallazgo] = useState('');
  const [nivelRiesgo, setNivelRiesgo] = useState('N/A');
  
  // Archivo e Imagenes (Múltiple)
  const [fotosFiles, setFotosFiles] = useState([]); // array de { file: File | null, preview: string, path: string }

  const [recomendacion, setRecomendacion] = useState('');
  const [accionPreventiva, setAccionPreventiva] = useState('');
  const [causaRaiz, setCausaRaiz] = useState('');
  const [accionCorrectiva, setAccionCorrectiva] = useState('');
  const [responsable, setResponsable] = useState('');
  const [fechaPlanificada, setFechaPlanificada] = useState('');
  const [fechaImplementacion, setFechaImplementacion] = useState('');
  const [observaciones, setObservaciones] = useState('');

  // Filtros
  const [filterText, setFilterText] = useState('');
  const [filterEmpresa, setFilterEmpresa] = useState('');
  const [filterEstablecimiento, setFilterEstablecimiento] = useState('');
  const [filterRiesgo, setFilterRiesgo] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showExportMobile, setShowExportMobile] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setShowFilters(false);
    }
  }, []);

  // Ordenamiento
  const [sortField, setSortField] = useState('fecha');
  const [sortOrder, setSortOrder] = useState('desc');

  // Modales y Feedback
  const globalToast = useToast();
  const [modalAlert, setModalAlert] = useState({ show: false, title: '', message: '', onConfirm: null, confirmText: 'Confirmar' });
  const [saveLoading, setSaveLoading] = useState(false);

  const originalDataRef = useRef('');

  const checkHasUnsavedChanges = () => {
    if (isReadOnlyView || !isFormOpen || !originalDataRef.current) return false;
    const currentData = JSON.stringify({
      empresaId,
      establecimientoId,
      fuente,
      fuenteOtra,
      fecha,
      areaSector,
      puestoOperacion,
      tipoHallazgo,
      tipoHallazgoOtro,
      descripcionHallazgo,
      nivelRiesgo,
      recomendacion,
      accionPreventiva,
      causaRaiz,
      accionCorrectiva,
      responsable,
      fechaPlanificada,
      fechaImplementacion,
      observaciones
    });
    return originalDataRef.current !== currentData;
  };

  // Cargar datos
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
        // Mock fallback if no auth session
        setIsDevMode(true);
        loadMockData();
      } else {
        await loadRealData();
      }

      // Detectar si se solicita abrir el formulario de alta
      if (typeof window !== 'undefined') {
        const searchParams = new URLSearchParams(window.location.search);
        if (searchParams.get('new') === 'true') {
          setIsFormOpen(true);
        }
      }
    };
    checkEnvAndLoad();
  }, []);

  // Auto-filtrar por cliente si la sesión iniciada es de rol 'cliente'
  useEffect(() => {
    if (profile && profile.role === 'cliente' && profile.empresa_id) {
      setFilterEmpresa(profile.empresa_id);
    }
  }, [profile]);

  const triggerToast = (message, type = 'success') => {
    globalToast.toast(message, type);
  };

  const closeAlert = () => setModalAlert({ show: false, title: '', message: '', onConfirm: null, confirmText: 'Confirmar' });

  // Cargar datos reales de Supabase
  const loadRealData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = '/login';
        return;
      }

      // 1. Perfil
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

      // 2. Tenant por slug de URL
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
            window.location.href = `/${homeTen.slug}/correctivas`;
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
            window.location.href = `/${homeTen.slug}/correctivas`;
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

      // 3. Clientes
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

      // 4. Establecimientos
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

      // 5. Miembros del Equipo
      const { data: mems, error: memErr } = await supabase
        .from('miembros_equipo')
        .select('id, full_name')
        .eq('tenant_id', ten.id)
        .order('full_name');
      if (memErr) throw memErr;
      setMiembrosList(mems || []);

      // 6. Acciones Correctivas
      let accsQuery = supabase
        .from('acciones_correctivas')
        .select('*')
        .eq('tenant_id', ten.id);
      if (prof.role === 'cliente') {
        accsQuery = accsQuery.eq('empresa_id', prof.empresa_id);
      }
      const { data: accs, error: accErr } = await accsQuery.order('created_at', { ascending: false });
      if (accErr) throw accErr;

      // Recopilar paths de Supabase para firmar en lote (en una sola llamada de red)
      const pathsToSign = [];
      (accs || []).forEach(acc => {
        const paths = getPathsFromImagenUrl(acc.imagen_url);
        paths.forEach(ppath => {
          if (ppath && ppath !== 'N/A' && !ppath.startsWith('http://') && !ppath.startsWith('https://')) {
            pathsToSign.push(ppath);
          }
        });
      });

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
          console.error('Error al firmar URLs en lote:', e);
        }
      }

      const resolvedAcciones = (accs || []).map(acc => {
        const paths = getPathsFromImagenUrl(acc.imagen_url);
        const resolvedUrls = paths.map(ppath => {
          if (ppath.startsWith('http://') || ppath.startsWith('https://')) {
            return ppath;
          }
          return signedUrlsMap[ppath] || '';
        }).filter(url => url !== '');

        return {
          ...acc,
          imagen_preview_url: resolvedUrls[0] || '',
          fotos_urls: resolvedUrls,
          fotos_paths: paths
        };
      });

      setAcciones(resolvedAcciones);
      setLoading(false);
    } catch (err) {
      console.error('Error cargando datos de Supabase:', err);
      triggerToast('Error al conectar con la base de datos.', 'error');
      setIsDevMode(true);
      loadMockData();
    }
  };

  const loadMockData = () => {
    setProfile({ full_name: 'Profesional de SySO (Mock)', role: 'admin' });
    setTenant({ id: 'mock-tenant', name: 'Consultora de Prueba', plan_id: 'free' });
    setEmpresas([
      { id: 'mock-empresa-1', razon_social: 'Ams Inversiones S.A.' },
      { id: 'mock-empresa-2', razon_social: 'Argento Via Publica' }
    ]);
    setAllEstablecimientos([
      { id: 'mock-est-1', empresa_id: 'mock-empresa-1', denominacion: 'Callao 727' },
      { id: 'mock-est-2', empresa_id: 'mock-empresa-1', denominacion: 'Cordoba 2045' },
      { id: 'mock-est-3', empresa_id: 'mock-empresa-2', denominacion: 'Único' }
    ]);
    setMiembrosList([
      { id: 'mock-miembro-1', full_name: 'Gonzalo Merlo' },
      { id: 'mock-miembro-2', full_name: 'Florencia Benitez' }
    ]);
    setAcciones([
      {
        id: 'mock-acc-1',
        empresa_id: 'mock-empresa-1',
        establecimiento_id: 'mock-est-1',
        fuente: 'Inspección de organimo gubernamental',
        fecha: '2026-06-10',
        area_sector: 'Cocina',
        puesto_operacion: 'Preparación',
        tipo_hallazgo: 'Condición insegura',
        descripcion_hallazgo: 'Falta de disyuntor en tablero eléctrico secundario.',
        nivel_riesgo: 'Riesgo sustancial',
        imagen_url: '',
        recomendacion: 'Instalar disyuntor bipolar diferencial de 30mA.',
        accion_preventiva: 'Revisión mensual de tableros.',
        causa_raiz: 'Falta de mantenimiento preventivo.',
        accion_correctiva: 'Instalar disyuntor.',
        responsable: 'Gonzalo Merlo',
        fecha_planificada: '2026-06-20',
        fecha_implementacion: '',
        observaciones: 'Requiere electricista matriculado.'
      }
    ]);
    setLoading(false);
  };

  const getBase64ImageFromUrl = async (imageUrl) => {
    if (!imageUrl) return '';
    if (typeof imageUrl === 'string' && imageUrl.startsWith('data:')) return imageUrl;
    if (typeof imageUrl === 'string' && imageUrl.includes('gettablefileurl')) {
      try {
        const urlObj = new URL(imageUrl);
        const fileName = urlObj.searchParams.get('fileName');
        if (!fileName || fileName.trim() === '') {
          return '';
        }
      } catch (e) {
        if (imageUrl.endsWith('fileName=') || imageUrl.includes('fileName=&')) {
          return '';
        }
      }
    }
    try {
      const res = await fetch(imageUrl);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const blob = await res.blob();
      if (!blob.type.startsWith('image/')) {
        throw new Error(`Invalid content type: ${blob.type}`);
      }
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.addEventListener('load', () => resolve(reader.result), false);
        reader.addEventListener('error', () => reject(new Error('FileReader error')), false);
        reader.readAsDataURL(blob);
      });
    } catch (e) {
      console.error('Error fetching image to base64:', e);
      return '';
    }
  };

  const resizeImage = (base64Str, maxWidth = 400, maxHeight = 400) => {
    return new Promise((resolve) => {
      if (!base64Str || !base64Str.startsWith('data:image/')) {
        resolve('');
        return;
      }
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => {
        resolve(base64Str);
      };
    });
  };

  const handleExportPdfReport = async (shouldPrint = false) => {
    try {
      triggerToast('Generando reporte PDF con imágenes...', 'info');

      const { jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');

      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'pt',
        format: 'a4',
        compress: true
      });

      let logoBase64 = '';
      try {
        if (tenant && tenant.logo_1_url) {
          logoBase64 = await getBase64ImageFromUrl(tenant.logo_1_url);
        }
      } catch (e) {
        console.error('Error loading logo:', e);
      }
      if (!logoBase64) {
        try {
          logoBase64 = await getBase64ImageFromUrl('/brand/logo-primary.png');
        } catch (e) {
          console.error('Error loading default logo:', e);
        }
      }
      if (logoBase64) {
        logoBase64 = await resizeImage(logoBase64, 200, 200);
      }

      // Construir indicador de filtros activos
      const filterParts = [];
      if (filterEmpresa) {
        const emp = empresas.find(e => e.id === filterEmpresa);
        if (emp) filterParts.push(`Cliente: ${emp.razon_social}`);
      }
      if (filterEstablecimiento) {
        const est = allEstablecimientos.find(e => e.id === filterEstablecimiento);
        if (est) filterParts.push(`Establecimiento: ${est.denominacion}`);
      }
      if (filterRiesgo) {
        filterParts.push(`Riesgo: ${filterRiesgo}`);
      }
      if (filterEstado) {
        filterParts.push(`Estado: ${filterEstado}`);
      }
      const filterString = filterParts.join(' | ');

      const showEmpresaCol = profile?.role !== 'cliente' && !filterEmpresa;
      const showEstablecimientoCol = !filterEstablecimiento;

      const imageMap = {};
      const loadImagesPromise = Promise.all(
        sortedAcciones
          .filter(acc => acc.imagen_preview_url)
          .map(async (acc) => {
            try {
              const base64 = await getBase64ImageFromUrl(acc.imagen_preview_url);
              if (base64) {
                const resized = await resizeImage(base64, 80, 80);
                imageMap[acc.id] = resized;
              }
            } catch (err) {
              console.error('Error cargando imagen de registro:', err);
            }
          })
      );
      await loadImagesPromise;

      const drawHeader = (d) => {
        if (logoBase64 && logoBase64.startsWith('data:image/')) {
          try {
            d.addImage(logoBase64, 'PNG', 40, 15, 100, 50);
          } catch (e) {
            console.error('Error drawing logo:', e);
          }
        }
        d.setFont('helvetica', 'bold');
        d.setFontSize(14);
        d.setTextColor(13, 13, 13);
        d.text('Seguimiento de Acciones Correctivas', 801, 35, { align: 'right' });

        if (filterString) {
          d.setFont('helvetica', 'normal');
          d.setFontSize(8);
          d.setTextColor(100, 100, 100);
          d.text(filterString, 801, 55, { align: 'right' });
        }

        d.setDrawColor(217, 217, 217);
        d.setLineWidth(1);
        d.line(40, 70, 801, 70);
      };

      const headersRow = [];
      if (showEmpresaCol) headersRow.push('Razón Social');
      if (showEstablecimientoCol) headersRow.push('Establecimiento');
      headersRow.push(
        'Fuente',
        'Fecha',
        'Área / Sector',
        'Puesto / Operación',
        'Tipo de hallazgo',
        'Descripción del hallazgo',
        'Nivel de riesgo',
        'Recomendación',
        'Acción Preventiva',
        'Causa Raiz',
        'Acción Correctiva',
        'Responsable',
        'Fecha planificada',
        'Fecha de implementación / cierre',
        'Estado',
        'imagen'
      );
      const headers = [headersRow];
      
      const body = sortedAcciones.map(acc => {
        const emp = empresas.find(e => e.id === acc.empresa_id);
        const est = allEstablecimientos.find(e => e.id === acc.establecimiento_id);
        const status = getCalculatedStatus(acc.fecha_planificada, acc.fecha_implementacion);
        
        const rowData = [];
        if (showEmpresaCol) rowData.push(emp ? emp.razon_social : 'N/A');
        if (showEstablecimientoCol) rowData.push(est ? est.denominacion : 'N/A');
        rowData.push(
          acc.fuente || 'N/A',
          formatDate(acc.fecha) || 'N/A',
          acc.area_sector || 'N/A',
          acc.puesto_operacion || 'N/A',
          acc.tipo_hallazgo || 'N/A',
          acc.descripcion_hallazgo || 'N/A',
          acc.nivel_riesgo || 'N/A',
          acc.recomendacion || 'N/A',
          acc.accion_preventiva || 'N/A',
          acc.causa_raiz || 'N/A',
          acc.accion_correctiva || 'N/A',
          acc.responsable || 'N/A',
          formatDate(acc.fecha_planificada) || 'N/A',
          formatDate(acc.fecha_implementacion) || 'N/A',
          status.text || 'N/A',
          ''
        );
        return rowData;
      });

      const columnsDef = [];
      if (showEmpresaCol) columnsDef.push({ key: 'cliente', ratio: 1.0 });
      if (showEstablecimientoCol) columnsDef.push({ key: 'establecimiento', ratio: 1.0 });
      columnsDef.push(
        { key: 'fuente', ratio: 0.9 },
        { key: 'fecha', ratio: 0.7 },
        { key: 'area_sector', ratio: 0.9 },
        { key: 'puesto_operacion', ratio: 0.9 },
        { key: 'tipo_hallazgo', ratio: 0.9 },
        { key: 'descripcion', ratio: 1.6 },
        { key: 'nivel_riesgo', ratio: 0.85 },
        { key: 'recomendacion', ratio: 1.3 },
        { key: 'accion_preventiva', ratio: 1.3 },
        { key: 'causa_raiz', ratio: 1.2 },
        { key: 'accion_correctiva', ratio: 1.3 },
        { key: 'responsable', ratio: 0.9 },
        { key: 'fecha_planificada', ratio: 0.75 },
        { key: 'fecha_implementacion', ratio: 0.75 },
        { key: 'estado', ratio: 0.75 },
        { key: 'evidencia', ratio: 0.75 }
      );

      const totalRatio = columnsDef.reduce((acc, col) => acc + col.ratio, 0);
      const colStyles = {};
      columnsDef.forEach((col, idx) => {
        colStyles[idx] = { cellWidth: (col.ratio / totalRatio) * 761.89 };
      });

      autoTable(doc, {
        head: headers,
        body: body,
        startY: 90,
        margin: { top: 90, bottom: 65, left: 40, right: 40 },
        theme: 'striped',
        rowPageBreak: 'avoid',
        headStyles: { fillColor: [68, 114, 196], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 5.5 },
        bodyStyles: { fontSize: 5, textColor: [50, 50, 50], minCellHeight: 25 },
        columnStyles: colStyles,
        didDrawPage: function(data) {
          drawHeader(doc);
          
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          doc.setTextColor(100, 100, 100);
          
          doc.setDrawColor(217, 217, 217);
          doc.setLineWidth(1);
          doc.line(40, 545, 801, 545);
          
          const companyName = tenant?.name || 'Gestión SySO';
          const phoneVal = profile?.role === 'miembro' ? (profile?.phone || '') : adminContact.phone;
          const emailVal = profile?.role === 'miembro' ? (profile?.email || '') : adminContact.email;
          const footerText = `${companyName} - Tel: ${phoneVal} - Email: ${emailVal}`;
          doc.text(footerText, 420.94, 560, { align: 'center' });
          
          doc.text(`Página ${data.pageNumber}`, 801, 560, { align: 'right' });
        },
        didDrawCell: function(data) {
          if (data.column.index === headersRow.length - 1 && data.cell.section === 'body') {
            const acc = sortedAcciones[data.row.index];
            const imgBase64 = imageMap[acc.id];
            if (imgBase64) {
              const maxDim = 30;
              const xPos = data.cell.x + (data.cell.width - maxDim) / 2;
              const yPos = data.cell.y + (data.cell.height - maxDim) / 2;
              try {
                doc.addImage(imgBase64, 'PNG', xPos, yPos, maxDim, maxDim);
              } catch (e) {
                console.error('Error drawing cell image:', e);
              }
            }
          }
        }
      });

      if (shouldPrint) {
        doc.autoPrint();
        const blobUrl = doc.output('bloburl');
        window.open(blobUrl, '_blank');
      } else {
        doc.save(`Acciones_Correctivas_${new Date().getFullYear()}.pdf`);
      }
    } catch (e) {
      console.error('Error generating PDF:', e);
    }
  };

  // Cierre de sesión
  const handleLogout = async () => {
    await supabase.auth.signOut();
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('user-profile');
    }
    window.location.href = '/login';
  };

  // Filtrar los establecimientos dependientes del cliente elegido en el formulario
  const filteredEstablecimientos = allEstablecimientos.filter(
    (est) => est.empresa_id === empresaId
  );

  // Manejo de carga de imagen
  const handleImagenChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tamaño máximo de 5MB
    if (file.size > 5 * 1024 * 1024) {
      triggerToast('La imagen no debe superar los 5 MB.', 'error');
      return;
    }

    setImagenFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagenPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  // Helper para subir archivo a storage
  const uploadImageToStorage = async (file) => {
    if (isDevMode) return `mock-path/corrective_${Date.now()}_${file.name}`;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No autorizado');

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/corrective_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, file, { cacheControl: '3600', upsert: true });

      if (uploadError) throw uploadError;
      return fileName;
    } catch (err) {
      console.error('Error al subir imagen:', err);
      throw new Error('Error al guardar la imagen en el servidor.');
    }
  };

  // Cálculo de estado para renderizar
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

  // Guardado de Hallazgo
  const handleSaveHallazgo = async (e) => {
    e.preventDefault();
    if (!empresaId || !establecimientoId || !fuente || !fecha || !tipoHallazgo || !nivelRiesgo) {
      triggerToast('Por favor completa todos los campos obligatorios.', 'error');
      return;
    }

    setSaveLoading(true);
    try {
      // Procesar y subir todas las fotos en fotosFiles
      const uploadedPaths = [];
      for (const foto of fotosFiles) {
        if (foto.file) {
          // Subir archivo nuevo
          const path = await uploadImageToStorage(foto.file);
          if (path) {
            uploadedPaths.push(path);
          }
        } else if (foto.path) {
          // Mantener path existente
          uploadedPaths.push(foto.path);
        }
      }

      const finalImagenUrl = uploadedPaths.length > 0 ? JSON.stringify(uploadedPaths) : '';

      const dbFuente = fuente === 'Otra' ? fuenteOtra.trim() : fuente;
      const dbTipoHallazgo = tipoHallazgo === 'Otro' ? tipoHallazgoOtro.trim() : tipoHallazgo;

      const payload = {
        tenant_id: tenant.id,
        empresa_id: empresaId,
        establecimiento_id: establecimientoId,
        fuente: dbFuente,
        fecha: convertToDbDate(fecha) || null,
        area_sector: areaSector || null,
        puesto_operacion: puestoOperacion || null,
        tipo_hallazgo: dbTipoHallazgo,
        descripcion_hallazgo: descripcionHallazgo || null,
        nivel_riesgo: nivelRiesgo,
        imagen_url: finalImagenUrl || null,
        recomendacion: recomendacion || null,
        accion_preventiva: accionPreventiva || null,
        causa_raiz: causaRaiz || null,
        accion_correctiva: accionCorrectiva || null,
        responsable: responsable || null,
        fecha_planificada: convertToDbDate(fechaPlanificada) || null,
        fecha_implementacion: convertToDbDate(fechaImplementacion) || null,
        observaciones: observaciones || null,
        updated_at: new Date().toISOString()
      };

      if (isDevMode) {
        // Lógica de desarrollo (mock)
        const updatedAccion = {
          ...payload,
          id: editingId || `mock-acc-${Date.now()}`
        };
        if (editingId) {
          setAcciones(acciones.map(a => a.id === editingId ? updatedAccion : a));
          triggerToast('Hallazgo actualizado exitosamente (Mock).');
        } else {
          setAcciones([updatedAccion, ...acciones]);
          triggerToast('Hallazgo incorporado exitosamente (Mock).');
        }
      } else {
        // Lógica real de Supabase
        if (editingId) {
          const { error } = await supabase
            .from('acciones_correctivas')
            .update(payload)
            .eq('id', editingId);
          if (error) throw error;
          triggerToast('Hallazgo actualizado exitosamente.');
        } else {
          const { error } = await supabase
            .from('acciones_correctivas')
            .insert([{ ...payload, created_at: new Date().toISOString() }]);
          if (error) throw error;
          triggerToast('Hallazgo incorporado exitosamente.');
        }
        await loadRealData();
      }

      handleCloseForm();
    } catch (err) {
      console.error('Error al guardar hallazgo:', err);
      triggerToast(err.message || 'Error al guardar el hallazgo.', 'error');
    } finally {
      setSaveLoading(false);
    }
  };

  // Inicializar nuevo registro
  const handleAddNew = () => {
    setIsReadOnlyView(false);
    setEditingId(null);
    handleCloseForm();

    const todayStr = formatDate(new Date().toISOString().split('T')[0]);
    setFecha(todayStr);

    originalDataRef.current = JSON.stringify({
      empresaId: '',
      establecimientoId: '',
      fuente: '',
      fuenteOtra: '',
      fecha: todayStr,
      areaSector: '',
      puestoOperacion: '',
      tipoHallazgo: '',
      tipoHallazgoOtro: '',
      descripcionHallazgo: '',
      nivelRiesgo: 'N/A',
      recomendacion: '',
      accionPreventiva: '',
      causaRaiz: '',
      accionCorrectiva: '',
      responsable: '',
      fechaPlanificada: '',
      fechaImplementacion: '',
      observaciones: ''
    });

    setIsFormOpen(true);
  };

  // Preparar edición
  const handleEditClick = (acc) => {
    setEditingId(acc.id);

    setEmpresaId(acc.empresa_id);
    setEstablecimientoId(acc.establecimiento_id);

    // Si la fuente original no está en la lista de opciones, se asume "Otra"
    let finalFuente = '';
    let finalFuenteOtra = '';
    if (FUENTE_OPTIONS.includes(acc.fuente)) {
      finalFuente = acc.fuente;
      finalFuenteOtra = '';
      setFuente(acc.fuente);
      setFuenteOtra('');
    } else {
      finalFuente = 'Otra';
      finalFuenteOtra = acc.fuente;
      setFuente('Otra');
      setFuenteOtra(acc.fuente);
    }

    setFecha(formatDate(acc.fecha) || '');
    setAreaSector(acc.area_sector || '');
    setPuestoOperacion(acc.puesto_operacion || '');

    // Si el tipo de hallazgo no está en la lista de opciones, se asume "Otro"
    let finalTipo = '';
    let finalTipoOtro = '';
    if (TIPO_HALLAZGO_OPTIONS.includes(acc.tipo_hallazgo)) {
      finalTipo = acc.tipo_hallazgo;
      finalTipoOtro = '';
      setTipoHallazgo(acc.tipo_hallazgo);
      setTipoHallazgoOtro('');
    } else {
      finalTipo = 'Otro';
      finalTipoOtro = acc.tipo_hallazgo;
      setTipoHallazgo('Otro');
      setTipoHallazgoOtro(acc.tipo_hallazgo);
    }

    setDescripcionHallazgo(acc.descripcion_hallazgo || '');
    setNivelRiesgo(acc.nivel_riesgo);

    // Inicializar fotos múltiples
    const initialFotos = (acc.fotos_paths || []).map((path, idx) => ({
      file: null,
      preview: acc.fotos_urls[idx] || '',
      path: path
    }));
    setFotosFiles(initialFotos);

    setRecomendacion(acc.recomendacion || '');
    setAccionPreventiva(acc.accion_preventiva || '');
    setCausaRaiz(acc.causa_raiz || '');
    setAccionCorrectiva(acc.accion_correctiva || '');
    setResponsable(acc.responsable || '');
    setFechaPlanificada(formatDate(acc.fecha_planificada) || '');
    setFechaImplementacion(formatDate(acc.fecha_implementacion) || '');
    setObservaciones(acc.observaciones || '');

    originalDataRef.current = JSON.stringify({
      empresaId: acc.empresa_id || '',
      establecimientoId: acc.establecimiento_id || '',
      fuente: finalFuente,
      fuenteOtra: finalFuenteOtra,
      fecha: formatDate(acc.fecha) || '',
      areaSector: acc.area_sector || '',
      puestoOperacion: acc.puesto_operacion || '',
      tipoHallazgo: finalTipo,
      tipoHallazgoOtro: finalTipoOtro,
      descripcionHallazgo: acc.descripcion_hallazgo || '',
      nivelRiesgo: acc.nivel_riesgo || 'N/A',
      recomendacion: acc.recomendacion || '',
      accionPreventiva: acc.accion_preventiva || '',
      causaRaiz: acc.causa_raiz || '',
      accionCorrectiva: acc.accion_correctiva || '',
      responsable: acc.responsable || '',
      fechaPlanificada: formatDate(acc.fecha_planificada) || '',
      fechaImplementacion: formatDate(acc.fecha_implementacion) || '',
      observaciones: acc.observaciones || ''
    });

    setIsFormOpen(true);
  };

  // Preparar eliminación
  const handleDeleteClick = (id) => {
    setModalAlert({
      show: true,
      title: '¿Eliminar Hallazgo?',
      message: 'Esta acción eliminará de forma permanente el registro del hallazgo seleccionado y no se podrá deshacer.',
      confirmText: 'Eliminar',
      onConfirm: async () => {
        try {
          if (isDevMode) {
            setAcciones(acciones.filter(a => a.id !== id));
            triggerToast('Hallazgo eliminado exitosamente (Mock).');
            handleCloseForm();
          } else {
            const { error } = await supabase
              .from('acciones_correctivas')
              .delete()
              .eq('id', id);
            if (error) throw error;
            triggerToast('Hallazgo eliminado exitosamente.');
            handleCloseForm();
            await loadRealData();
          }
        } catch (err) {
          console.error('Error al eliminar:', err);
          triggerToast('No tienes permisos para realizar esta acción.', 'error');
        } finally {
          closeAlert();
        }
      }
    });
  };

  // Cierre de formulario
  const handleExitForm = () => {
    if (isReadOnlyView) {
      handleCloseForm();
      return;
    }
    setModalAlert({
      show: true,
      title: 'Salir sin guardar',
      message: '¿Estás seguro de que deseas salir del formulario? Perderás todos los cambios cargados que no se hayan guardado.',
      confirmText: 'Confirmar',
      onConfirm: () => {
        closeAlert();
        handleCloseForm();
      }
    });
  };

  const handleSidebarNavigation = (e, path) => {
    if (isFormOpen) {
      if (isReadOnlyView) {
        if (path.endsWith('/correctivas')) {
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
          if (path.endsWith('/correctivas')) {
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
    setFuente('');
    setFuenteOtra('');
    setFecha('');
    setAreaSector('');
    setPuestoOperacion('');
    setTipoHallazgo('');
    setTipoHallazgoOtro('');
    setDescripcionHallazgo('');
    setNivelRiesgo('N/A');
    fotosFiles.forEach(foto => {
      if (foto.preview && foto.preview.startsWith('blob:')) {
        URL.revokeObjectURL(foto.preview);
      }
    });
    setFotosFiles([]);
    setRecomendacion('');
    setAccionPreventiva('');
    setCausaRaiz('');
    setAccionCorrectiva('');
    setResponsable('');
    setFechaPlanificada('');
    setFechaImplementacion('');
    setObservaciones('');
    originalDataRef.current = '';
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Filtrar el listado principal de hallazgos
  const filteredAcciones = acciones.filter((acc) => {
    // Buscar por texto
    if (filterText) {
      const search = filterText.toLowerCase();
      const desc = (acc.descripcion_hallazgo || '').toLowerCase();
      const area = (acc.area_sector || '').toLowerCase();
      const puesto = (acc.puesto_operacion || '').toLowerCase();
      const resp = (acc.responsable || '').toLowerCase();
      if (!desc.includes(search) && !area.includes(search) && !puesto.includes(search) && !resp.includes(search)) {
        return false;
      }
    }

    // Filtrar por Cliente
    if (filterEmpresa && acc.empresa_id !== filterEmpresa) return false;

    // Filtrar por Establecimiento
    if (filterEstablecimiento && acc.establecimiento_id !== filterEstablecimiento) return false;

    // Filtrar por Nivel de Riesgo
    if (filterRiesgo && acc.nivel_riesgo !== filterRiesgo) return false;

    // Filtrar por Estado
    if (filterEstado) {
      const calc = getCalculatedStatus(acc.fecha_planificada, acc.fecha_implementacion);
      if (calc.text !== filterEstado) return false;
    }

    return true;
  });

  const sortedAcciones = [...filteredAcciones].sort((a, b) => {
    if (!sortField) return 0;
    
    let valA = '';
    let valB = '';
    
    if (sortField === 'cliente') {
      const empA = empresas.find(e => e.id === a.empresa_id);
      const empB = empresas.find(e => e.id === b.empresa_id);
      valA = empA ? empA.razon_social.toLowerCase() : '';
      valB = empB ? empB.razon_social.toLowerCase() : '';
    } else if (sortField === 'fuente') {
      valA = (a.fuente || '').toLowerCase();
      valB = (b.fuente || '').toLowerCase();
    } else if (sortField === 'hallazgo') {
      valA = (a.descripcion_hallazgo || '').toLowerCase();
      valB = (b.descripcion_hallazgo || '').toLowerCase();
    } else if (sortField === 'nivel_riesgo') {
      valA = (a.nivel_riesgo || '').toLowerCase();
      valB = (b.nivel_riesgo || '').toLowerCase();
    } else if (sortField === 'estado') {
      const statusA = getCalculatedStatus(a.fecha_planificada, a.fecha_implementacion).text;
      const statusB = getCalculatedStatus(b.fecha_planificada, b.fecha_implementacion).text;
      valA = statusA.toLowerCase();
      valB = statusB.toLowerCase();
    } else if (sortField === 'fecha') {
      valA = a.fecha || '';
      valB = b.fecha || '';
    } else if (sortField === 'responsable') {
      valA = (a.responsable || '').toLowerCase();
      valB = (b.responsable || '').toLowerCase();
    } else {
      valA = a[sortField] || '';
      valB = b[sortField] || '';
    }
    
    if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  return (
    <div className="h-screen overflow-hidden bg-syso-bg text-slate-700 flex font-sans">
      
      <Sidebar
        tenantSlug={tenantSlug}
        profile={profile}
        currentSection="correctivas"
        isSidebarCollapsed={isSidebarCollapsed}
        toggleSidebar={toggleSidebar}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
        handleLogout={handleLogout}
        onNavigate={handleSidebarNavigation}
      />

      {/* Main Container */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <AppPageHeader
          title="Seguimiento de Acciones Correctivas"
          icon={ClipboardList}
          tenantName={tenant?.name || 'Cargando...'}
          planId={tenant?.plan_id}
          showPlanBadge={profile && profile.role !== 'cliente'}
          setIsMobileMenuOpen={setIsMobileMenuOpen}
        />

        {loading ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-[#468DFF] mx-auto" />
              <p className="text-xs text-slate-500 font-semibold">Cargando acciones correctivas...</p>
            </div>
          </div>
        ) : (
          <div className="max-w-[95%] mx-auto w-full py-8 px-4 md:px-0 flex-1 flex flex-col min-h-0">
            
            {/* VISTA FORMULARIO O TABLA */}
            {isFormOpen ? (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col max-h-[85vh] animate-fade-in">
                <div className="h-16 px-4 md:px-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-3">
                    <button 
                      type="button"
                      onClick={handleExitForm}
                      className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 cursor-pointer"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </button>
                    <span className="font-outfit text-base font-bold text-slate-900">
                      {editingId ? 'Editar Hallazgo / Acción' : 'Incorporar Nuevo Hallazgo'}
                    </span>
                  </div>
                  <button type="button" onClick={handleExitForm} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-200 cursor-pointer">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <form onSubmit={handleSaveHallazgo} className="p-6 space-y-6 overflow-y-auto flex-1 scrollbar-thin">
                  <fieldset disabled={!canEdit} className="space-y-6">
                  
                  {/* Seccion 1: Identificación y Ubicación */}
                  <div className="space-y-4">
                    <span className="font-outfit text-sm font-bold text-slate-800 border-b border-slate-100 pb-1.5 uppercase tracking-wider flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-[#468DFF]" />
                      Identificación y Ubicación
                    </span>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-600 block mb-1">
                          Cliente / Razón Social <span className="text-[#468DFF]">*</span>
                        </label>
                        <select
                          required
                          value={empresaId}
                          onChange={(e) => {
                            setEmpresaId(e.target.value);
                            setEstablecimientoId('');
                          }}
                          className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all cursor-pointer"
                        >
                          <option value="" disabled>Selecciona un cliente</option>
                          {empresas.map((emp) => (
                            <option key={emp.id} value={emp.id}>{emp.razon_social}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-600 block mb-1">
                          Establecimiento <span className="text-[#468DFF]">*</span>
                        </label>
                        <select
                          required
                          disabled={!empresaId}
                          value={establecimientoId}
                          onChange={(e) => setEstablecimientoId(e.target.value)}
                          className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all cursor-pointer disabled:opacity-50"
                        >
                          <option value="" disabled>
                            {!empresaId ? 'Primero selecciona un cliente' : 'Selecciona un establecimiento'}
                          </option>
                          {filteredEstablecimientos.map((est) => (
                            <option key={est.id} value={est.id}>{est.denominacion}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-4 gap-4">
                      <div className="space-y-1 md:col-span-2">
                        <label className="text-xs font-bold text-slate-600 block mb-1">
                          Fuente del Hallazgo <span className="text-[#468DFF]">*</span>
                        </label>
                        <select
                          required
                          value={fuente}
                          onChange={(e) => setFuente(e.target.value)}
                          className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all cursor-pointer"
                        >
                          <option value="" disabled>Selecciona la fuente</option>
                          {FUENTE_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                          <option value="Otra">Otra (Especificar...)</option>
                        </select>
                        {fuente === 'Otra' && (
                          <input
                            type="text"
                            required
                            placeholder="Especificar otra fuente..."
                            value={fuenteOtra}
                            onChange={(e) => setFuenteOtra(e.target.value)}
                            className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 mt-2 transition-all"
                          />
                        )}
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-600 block mb-1">
                          Fecha del Registro <span className="text-[#468DFF]">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            required
                            placeholder="DD/MM/YYYY"
                            maxLength={10}
                            value={fecha}
                            onChange={(e) => setFecha(formatAsDateInput(e.target.value))}
                            className="w-full border border-slate-200 rounded-xl pl-3.5 pr-10 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all font-mono"
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
  } else {
    setFecha('');
  }
                              }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                          <label className="text-xs font-bold text-slate-600">
                            Nivel de Riesgo <span className="text-[#468DFF]">*</span>
                          </label>
                          <span
                            role="button"
                            onClick={() => setShowRiskMatrix(true)}
                            className="text-slate-400 hover:text-[#468DFF] transition-colors cursor-pointer flex items-center"
                            title="Ver Método BS 8800"
                          >
                            <HelpCircle className="h-3.5 w-3.5" />
                          </span>
                        </div>
                        <select
                          required
                          value={nivelRiesgo}
                          onChange={(e) => setNivelRiesgo(e.target.value)}
                          className={`w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] transition-all cursor-pointer font-bold ${
                            nivelRiesgo === 'Riesgo trivial' ? 'bg-[#00B050] text-white' :
                            nivelRiesgo === 'Riesgo tolerable' ? 'bg-[#00FF00] text-slate-900' :
                            nivelRiesgo === 'Riesgo moderado' ? 'bg-[#FFFF00] text-slate-900' :
                            nivelRiesgo === 'Riesgo sustancial' ? 'bg-[#FF9900] text-white' :
                            nivelRiesgo === 'Riesgo intolerable' ? 'bg-[#FF0000] text-white' :
                            'bg-slate-50/50 text-slate-900'
                          }`}
                        >
                          {NIVEL_RIESGO_OPTIONS.map((opt) => (
                            <option key={opt} value={opt} className="bg-white text-slate-900 font-normal">{opt}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-600 block mb-1">Área / Sector</label>
                        <input
                          type="text"
                          placeholder="Ej: Depósito de Materiales"
                          value={areaSector}
                          onChange={(e) => setAreaSector(e.target.value)}
                          className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-600 block mb-1">Puesto / Operación</label>
                        <input
                          type="text"
                          placeholder="Ej: Operador de autoelevador"
                          value={puestoOperacion}
                          onChange={(e) => setPuestoOperacion(e.target.value)}
                          className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Seccion 2: Descripción y Análisis */}
                  <div className="space-y-4">
                    <span className="font-outfit text-sm font-bold text-slate-800 border-b border-slate-100 pb-1.5 uppercase tracking-wider flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-[#468DFF]" />
                      Descripción y Análisis
                    </span>
                    
                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-600 block mb-1">
                          Tipo de Hallazgo <span className="text-[#468DFF]">*</span>
                        </label>
                        <select
                          required
                          value={tipoHallazgo}
                          onChange={(e) => setTipoHallazgo(e.target.value)}
                          className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all cursor-pointer"
                        >
                          <option value="" disabled>Selecciona el tipo</option>
                          {TIPO_HALLAZGO_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                          <option value="Otro">Otro (Especificar...)</option>
                        </select>
                        {tipoHallazgo === 'Otro' && (
                          <input
                            type="text"
                            required
                            placeholder="Especificar otro tipo..."
                            value={tipoHallazgoOtro}
                            onChange={(e) => setTipoHallazgoOtro(e.target.value)}
                            className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 mt-2 transition-all"
                          />
                        )}
                      </div>

                      <div className="space-y-1 md:col-span-2">
                        <div className="flex items-center justify-between gap-2 min-h-[28px] mb-1">
                          <label className="text-xs font-bold text-slate-600 block mb-0">Descripción Detallada del Hallazgo</label>
                          <AITextHelper
                            value={descripcionHallazgo}
                            onChange={setDescripcionHallazgo}
                            context="Descripción detallada de la condición insegura o desviación detectada"
                            disabled={isReadOnlyView}
                          />
                        </div>
                        <textarea
                          rows="3"
                          placeholder="Describe detalladamente lo observado..."
                          value={descripcionHallazgo}
                          onChange={(e) => setDescripcionHallazgo(e.target.value)}
                          className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all resize-y scrollbar-thin"
                        />
                      </div>
                    </div>

                    {/* Recomendaciones / sugerencias */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-2 min-h-[28px] mb-1">
                        <label className="text-xs font-bold text-slate-600 block mb-0">Recomendaciones / sugerencias</label>
                        <AITextHelper
                          value={recomendacion}
                          onChange={setRecomendacion}
                          context="Recomendaciones y sugerencias técnicas preventivas para mitigar el hallazgo"
                          disabled={isReadOnlyView}
                        />
                      </div>
                      <textarea
                        rows="2"
                        placeholder="Recomendaciones o sugerencias..."
                        value={recomendacion}
                        onChange={(e) => setRecomendacion(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all resize-y scrollbar-thin"
                      />
                    </div>

                    {/* Imagen de Respaldo */}
                    <div>
                      <ImageUploadZone
                        label="Imagen de Evidencia (Hallazgo)"
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

                  {/* Seccion 3: Acciones y Planificación */}
                  <div className="space-y-4">
                    <span className="font-outfit text-sm font-bold text-slate-800 border-b border-slate-100 pb-1.5 uppercase tracking-wider flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-[#468DFF]" />
                      Acciones, Plazos y Responsabilidades
                    </span>
                    
                    {/* Acción Preventiva (Una sola fila) */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-2 min-h-[28px] mb-1">
                        <label className="text-xs font-bold text-slate-600 block mb-0">Acción Preventiva</label>
                        <AITextHelper
                          value={accionPreventiva}
                          onChange={setAccionPreventiva}
                          context="Acción preventiva planificada para evitar la ocurrencia de desvíos similares"
                          disabled={isReadOnlyView}
                        />
                      </div>
                      <textarea
                        rows="2"
                        placeholder="Se aplica antes de que ocurra el evento no deseado"
                        value={accionPreventiva}
                        onChange={(e) => setAccionPreventiva(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all resize-y scrollbar-thin"
                      />
                    </div>

                    {/* Causa Raíz (Una sola fila) */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-2 min-h-[28px] mb-1">
                        <label className="text-xs font-bold text-slate-600 block mb-0">Causa Raíz</label>
                        <AITextHelper
                          value={causaRaiz}
                          onChange={setCausaRaiz}
                          context="Análisis de causa raíz de la desviación o hallazgo detectado"
                          disabled={isReadOnlyView}
                        />
                      </div>
                      <textarea
                        rows="2"
                        placeholder="es la causa que, si se elimina o controla, evita la repetición del evento"
                        value={causaRaiz}
                        onChange={(e) => setCausaRaiz(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all resize-y scrollbar-thin"
                      />
                    </div>

                    {/* Acción Correctiva (Una sola fila) */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-2 min-h-[28px] mb-1">
                        <label className="text-xs font-bold text-slate-600 block mb-0">Acción Correctiva</label>
                        <AITextHelper
                          value={accionCorrectiva}
                          onChange={setAccionCorrectiva}
                          context="Acción correctiva para eliminar la causa raíz y subsanar el hallazgo"
                          disabled={isReadOnlyView}
                        />
                      </div>
                      <textarea
                        rows="2"
                        placeholder="Acción tomada para eliminar la causa raíz."
                        value={accionCorrectiva}
                        onChange={(e) => setAccionCorrectiva(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all resize-y scrollbar-thin"
                      />
                    </div>

                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-600 block mb-1">Responsable de Implementar</label>
                        <select
                          value={responsable}
                          onChange={(e) => setResponsable(e.target.value)}
                          className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all cursor-pointer"
                        >
                          <option value="">Selecciona un responsable</option>
                          {miembrosList.map((m) => (
                            <option key={m.id} value={m.full_name}>{m.full_name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-600 block mb-1">Fecha Planificada (Plazo)</label>
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="DD/MM/YYYY"
                            maxLength={10}
                            value={fechaPlanificada}
                            onChange={(e) => setFechaPlanificada(formatAsDateInput(e.target.value))}
                            className="w-full border border-slate-200 rounded-xl pl-3.5 pr-10 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all font-mono"
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
      setFechaPlanificada(`${parts[2]}/${parts[1]}/${parts[0]}`);
    }
  } else {
    setFechaPlanificada('');
  }
                              }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-600 block mb-1">Fecha de Realización / Implementación</label>
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="DD/MM/YYYY"
                            maxLength={10}
                            value={fechaImplementacion}
                            onChange={(e) => setFechaImplementacion(formatAsDateInput(e.target.value))}
                            className="w-full border border-slate-200 rounded-xl pl-3.5 pr-10 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all font-mono"
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
      setFechaImplementacion(`${parts[2]}/${parts[1]}/${parts[0]}`);
    }
  } else {
    setFechaImplementacion('');
  }
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-2 min-h-[28px] mb-1">
                        <label className="text-xs font-bold text-slate-600 block mb-0">Observaciones Generales</label>
                        <AITextHelper
                          value={observaciones}
                          onChange={setObservaciones}
                          context="Observaciones y comentarios generales de la acción correctiva"
                          disabled={isReadOnlyView}
                        />
                      </div>
                      <textarea
                        rows="3"
                        placeholder="Comentarios adicionales..."
                        value={observaciones}
                        onChange={(e) => setObservaciones(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all resize-y scrollbar-thin"
                      />
                    </div>
                  </div>

                      </fieldset>

                      {/* Botones del Formulario */}
                      <div className="flex justify-between items-center pt-6 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={handleExitForm}
                          className="px-5 py-2.5 bg-[#FFFFFF] text-[#468DFF] border border-[#468DFF] rounded-xl text-sm font-bold hover:bg-[#468DFF] hover:text-[#FFFFFF] hover:border-[#FFFFFF] transition-all active:scale-[0.98] cursor-pointer"
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
                                  onClick={() => handleDeleteClick(editingId)}
                                  className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold transition-all active:scale-[0.98] cursor-pointer shadow-lg shadow-red-600/10"
                                >
                                  Eliminar
                                </button>
                              )}
                              {canEdit && (
                                <button
                                  type="submit"
                                  disabled={saveLoading}
                                  className="px-5 py-2.5 bg-[#468DFF] hover:bg-[#0511F2] text-white rounded-xl text-sm font-bold flex items-center gap-2 transition-all active:scale-[0.98] cursor-pointer shadow-lg shadow-[#468DFF]/10 disabled:opacity-50"
                                >
                                  {saveLoading ? (
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
              // TABLA DE HALLAZGOS Y FILTROS
              <div className="space-y-6 flex-1 flex flex-col min-h-0">
                
                {/* Panel de Filtros y Búsqueda */}
                <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-sm space-y-3 shrink-0">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
                    {/* Espaciador para empujar el buscador y botón a la derecha en desktop */}
                    <div className="hidden md:block flex-1"></div>

                    {/* Buscador, exportaciones y flecha agrupados */}
                    <div className="flex flex-col md:flex-row md:items-center gap-2 w-full md:w-auto">
                      <div className="flex items-center gap-2 w-full md:w-64">
                        <div className="relative flex-1">
                          <span className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none">
                            <Search className="h-4 w-4" />
                          </span>
                          <input
                            type="text"
                            placeholder="Buscar por descripción, área, puesto, responsable..."
                            value={filterText}
                            onChange={(e) => setFilterText(e.target.value)}
                            className="w-full pl-9 pr-3.5 py-1.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all text-slate-700 placeholder-slate-400"
                          />
                        </div>
                        {/* Botón de flecha para colapsar/expandir exportaciones en móvil */}
                        <button
                          type="button"
                          onClick={() => setShowExportMobile(!showExportMobile)}
                          className="p-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-all cursor-pointer flex items-center justify-center shrink-0 h-[29px] w-[29px] md:hidden"
                          title={showExportMobile ? "Ocultar botones de exportación" : "Mostrar botones de exportación"}
                        >
                          {showExportMobile ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>
                      </div>

                      <div className={`items-center gap-1.5 w-full md:w-auto shrink-0 justify-end ${showExportMobile ? 'flex' : 'hidden md:flex'}`}>
                        <button
                          type="button"
                          onClick={() => handleExportPdfReport(false)}
                          className="py-1.5 px-3 rounded-xl border border-[#468DFF] text-xs font-bold bg-white text-[#468DFF] hover:bg-[#468DFF] hover:text-white transition-all flex items-center gap-1.5 cursor-pointer shrink-0 flex-1 md:flex-initial justify-center"
                          title="Descargar listado en formato PDF"
                        >
                          <FileText className="h-3.5 w-3.5" />
                          Descargar PDF
                        </button>
                        <button
                          type="button"
                          onClick={() => handleExportPdfReport(true)}
                          className="py-1.5 px-3 rounded-xl border border-[#468DFF] text-xs font-bold bg-white text-[#468DFF] hover:bg-[#468DFF] hover:text-white transition-all flex items-center gap-1.5 cursor-pointer shrink-0 flex-1 md:flex-initial justify-center"
                          title="Imprimir listado completo"
                        >
                          <Printer className="h-3.5 w-3.5" />
                          Imprimir
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Selectores de Filtrado */}
                  <div className="pt-1.5 border-t border-slate-100 space-y-2">
                    <div className="flex items-center justify-between min-h-[28px]">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setShowFilters(!showFilters)}
                          className="font-bold text-slate-400 flex items-center gap-1.5 uppercase tracking-wider text-[10px] hover:text-slate-600 transition-colors cursor-pointer"
                        >
                          <Sliders className="h-3 w-3" />
                          Filtros de Búsqueda
                          {showFilters ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        </button>
                        {(filterEmpresa || filterEstablecimiento || filterRiesgo || filterEstado || filterText) && (
                          <button
                            onClick={() => {
                              setFilterEmpresa('');
                              setFilterEstablecimiento('');
                              setFilterRiesgo('');
                              setFilterEstado('');
                              setFilterText('');
                            }}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[10px] font-semibold cursor-pointer transition-all border border-slate-200"
                          >
                            Limpiar filtros
                          </button>
                        )}
                      </div>

                      {canCargar && (
                        <button
                          onClick={handleAddNew}
                          className="px-3 py-1.5 bg-[#468DFF] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-[#0511F2] transition-all cursor-pointer shadow-lg shadow-[#468DFF]/10 shrink-0"
                        >
                          <PlusCircle className="h-3.5 w-3.5" />
                          Incorporar Nuevo Hallazgo
                        </button>
                      )}
                    </div>
                    
                    {showFilters && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 pt-1 animate-fade-in">
                        {/* Selector Cliente */}
                        {profile?.role !== 'cliente' && (
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
                              <option value="">Todos los clientes</option>
                              {empresas.map((emp) => (
                                <option key={emp.id} value={emp.id}>{emp.razon_social}</option>
                              ))}
                            </select>
                          </div>
                        )}

                        {/* Selector Establecimiento */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Filtrar por Establecimiento</label>
                          <select
                            disabled={!filterEmpresa}
                            value={filterEstablecimiento}
                            onChange={(e) => setFilterEstablecimiento(e.target.value)}
                            className="border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-600 focus:outline-none focus:border-[#468DFF] text-xs w-full cursor-pointer disabled:bg-slate-50 disabled:text-slate-400"
                          >
                            <option value="">
                              {!filterEmpresa ? 'Selecciona un cliente primero' : 'Todos los establecimientos'}
                            </option>
                            {allEstablecimientos
                              .filter(est => est.empresa_id === filterEmpresa)
                              .map((est) => (
                                <option key={est.id} value={est.id}>{est.denominacion}</option>
                              ))
                            }
                          </select>
                        </div>

                        {/* Selector Nivel de Riesgo */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Filtrar por Nivel de Riesgo</label>
                          <select
                            value={filterRiesgo}
                            onChange={(e) => setFilterRiesgo(e.target.value)}
                            className={`border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#468DFF] text-xs w-full cursor-pointer font-bold transition-all ${
                              filterRiesgo === 'Riesgo trivial' ? 'bg-[#00B050] text-white' :
                              filterRiesgo === 'Riesgo tolerable' ? 'bg-[#00FF00] text-slate-900' :
                              filterRiesgo === 'Riesgo moderado' ? 'bg-[#FFFF00] text-slate-900' :
                              filterRiesgo === 'Riesgo sustancial' ? 'bg-[#FF9900] text-white' :
                              filterRiesgo === 'Riesgo intolerable' ? 'bg-[#FF0000] text-white' :
                              'bg-white text-slate-600'
                            }`}
                          >
                            <option value="" className="bg-white text-slate-900 font-normal">Todos los riesgos</option>
                            {NIVEL_RIESGO_OPTIONS.map((opt) => (
                              <option key={opt} value={opt} className="bg-white text-slate-900 font-normal">{opt}</option>
                            ))}
                          </select>
                        </div>

                        {/* Selector Estado */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Filtrar por Estado</label>
                          <select
                            value={filterEstado}
                            onChange={(e) => setFilterEstado(e.target.value)}
                            className="border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-600 focus:outline-none focus:border-[#468DFF] text-xs w-full cursor-pointer"
                          >
                            <option value="">Todos los estados</option>
                            <option value="En análisis">En análisis</option>
                            <option value="En tiempo">En tiempo</option>
                            <option value="Vencido">Vencido</option>
                            <option value="Cerrada">Cerrada</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Listado / Tabla */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col" style={{ height: showFilters ? 'calc(100vh - 310px)' : 'calc(100vh - 240px)' }}>
                  {sortedAcciones.length === 0 ? (
                    <div className="flex-grow flex flex-col items-center justify-center p-8 text-center gap-3 h-full">
                      <AlertCircle className="h-10 w-10 text-slate-300" />
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-slate-800">No hay acciones correctivas registradas</p>
                        <p className="text-xs text-slate-400">Registra una nueva acción correctiva para comenzar.</p>
                      </div>
                      {canCargar && (
                        <button
                          onClick={handleAddNew}
                          className="px-4 py-2 mt-2 bg-[#468DFF] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-[#0511F2] transition-all cursor-pointer shadow-md shadow-[#468DFF]/10 shrink-0"
                        >
                          <PlusCircle className="h-3.5 w-3.5" />
                          Registrar acción
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="overflow-auto flex-grow">
                      <table className="w-full text-left border-collapse min-w-[850px]">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-400 uppercase tracking-wider">
                            <th className="px-6 py-4 cursor-pointer hover:text-slate-700 select-none transition-colors sticky top-0 z-10 bg-slate-50 border-b border-slate-200" onClick={() => handleSort('cliente')}>
                              <div className="flex items-center gap-1">
                                Cliente / Establecimiento
                                {sortField === 'cliente' && (sortOrder === 'asc' ? ' ▲' : ' ▼')}
                              </div>
                            </th>
                            <th className="px-6 py-4 cursor-pointer hover:text-slate-700 select-none transition-colors sticky top-0 z-10 bg-slate-50 border-b border-slate-200" onClick={() => handleSort('fuente')}>
                              <div className="flex items-center gap-1">
                                Fuente / Fecha
                                {sortField === 'fuente' && (sortOrder === 'asc' ? ' ▲' : ' ▼')}
                              </div>
                            </th>
                            <th className="px-6 py-4 cursor-pointer hover:text-slate-700 select-none transition-colors sticky top-0 z-10 bg-slate-50 border-b border-slate-200" onClick={() => handleSort('hallazgo')}>
                              <div className="flex items-center gap-1">
                                Hallazgo / Tipo
                                {sortField === 'hallazgo' && (sortOrder === 'asc' ? ' ▲' : ' ▼')}
                              </div>
                            </th>
                            <th className="px-6 py-4 text-center cursor-pointer hover:text-slate-700 select-none transition-colors sticky top-0 z-10 bg-slate-50 border-b border-slate-200" onClick={() => handleSort('nivel_riesgo')}>
                              <div className="flex items-center justify-center gap-1">
                                Nivel Riesgo
                                {sortField === 'nivel_riesgo' && (sortOrder === 'asc' ? ' ▲' : ' ▼')}
                              </div>
                            </th>
                            <th className="px-6 py-4 cursor-pointer hover:text-slate-700 select-none transition-colors sticky top-0 z-10 bg-slate-50 border-b border-slate-200" onClick={() => handleSort('responsable')}>
                              <div className="flex items-center gap-1">
                                Responsable
                                {sortField === 'responsable' && (sortOrder === 'asc' ? ' ▲' : ' ▼')}
                              </div>
                            </th>
                            <th className="px-6 py-4 text-center cursor-pointer hover:text-slate-700 select-none transition-colors sticky top-0 z-10 bg-slate-50 border-b border-slate-200" onClick={() => handleSort('fecha_planificada')}>
                              <div className="flex items-center justify-center gap-1">
                                Fecha Planificada
                                {sortField === 'fecha_planificada' && (sortOrder === 'asc' ? ' ▲' : ' ▼')}
                              </div>
                            </th>
                            <th className="px-6 py-4 text-center cursor-pointer hover:text-slate-700 select-none transition-colors sticky top-0 z-10 bg-slate-50 border-b border-slate-200" onClick={() => handleSort('fecha_implementacion')}>
                              <div className="flex items-center justify-center gap-1">
                                Fecha de Realización / Implementación
                                {sortField === 'fecha_implementacion' && (sortOrder === 'asc' ? ' ▲' : ' ▼')}
                              </div>
                            </th>
                            <th className="px-6 py-4 text-center cursor-pointer hover:text-slate-700 select-none transition-colors sticky top-0 z-10 bg-slate-50 border-b border-slate-200" onClick={() => handleSort('estado')}>
                              <div className="flex items-center justify-center gap-1">
                                Estado
                                {sortField === 'estado' && (sortOrder === 'asc' ? ' ▲' : ' ▼')}
                              </div>
                            </th>
                             {(canEditar || canEliminar || profile?.role === 'cliente') && <th className="px-6 py-4 text-right sticky top-0 z-10 bg-slate-50 border-b border-slate-200">Acciones</th>}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs font-normal text-slate-700">
                          {sortedAcciones.map((acc) => {
                            const emp = empresas.find(e => e.id === acc.empresa_id);
                            const est = allEstablecimientos.find(t => t.id === acc.establecimiento_id);
                            const status = getCalculatedStatus(acc.fecha_planificada, acc.fecha_implementacion);
                            
                            // Color del nivel de riesgo
                            let riskBadge = 'bg-slate-100 text-slate-700 border-slate-200';
                            if (acc.nivel_riesgo === 'Riesgo trivial') riskBadge = 'bg-[#00B050] text-white border-[#00B050]';
                            else if (acc.nivel_riesgo === 'Riesgo tolerable') riskBadge = 'bg-[#00FF00] text-slate-900 border-[#00FF00]';
                            else if (acc.nivel_riesgo === 'Riesgo moderado') riskBadge = 'bg-[#FFFF00] text-slate-900 border-[#FFFF00]';
                            else if (acc.nivel_riesgo === 'Riesgo sustancial') riskBadge = 'bg-[#FF9900] text-white border-[#FF9900]';
                            else if (acc.nivel_riesgo === 'Riesgo intolerable') riskBadge = 'bg-[#FF0000] text-white border-[#FF0000]';

                            return (
                              <tr 
                                key={acc.id} 
                                onClick={() => { setIsReadOnlyView(true); handleEditClick(acc); }}
                                className="hover:bg-slate-100 transition-colors cursor-pointer"
                              >
                                <td className="px-6 py-4 font-semibold text-slate-900">
                                  <span className="block">{emp?.razon_social || 'Desconocido'}</span>
                                  <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5 font-normal">
                                    <MapPin className="h-3 w-3 shrink-0" />
                                    {est?.denominacion || 'Único'}
                                  </span>
                                </td>
                                <td className="px-6 py-4 font-medium text-slate-600">
                                  <span className="block max-w-[150px] truncate" title={acc.fuente}>{acc.fuente}</span>
                                  <span className="text-[10px] text-slate-400 block mt-0.5 font-mono font-normal">{formatDate(acc.fecha)}</span>
                                </td>
                                <td className="px-6 py-4 font-medium text-slate-600">
                                  <span className="block max-w-[200px] truncate font-semibold text-slate-800" title={acc.descripcion_hallazgo}>
                                    {acc.descripcion_hallazgo || 'Sin descripción'}
                                  </span>
                                  <span className="text-[10px] text-slate-400 block mt-0.5 font-normal">{acc.tipo_hallazgo}</span>
                                </td>
                                <td className="px-6 py-4 text-center">
                                  <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold inline-block ${riskBadge}`}>
                                    {acc.nivel_riesgo}
                                  </span>
                                </td>
                                <td className="px-6 py-4 font-semibold text-slate-900">
                                  {acc.responsable || 'No asignado'}
                                </td>
                                <td className="px-6 py-4 text-center font-medium text-slate-600 font-mono">
                                  {formatDate(acc.fecha_planificada) || '-'}
                                </td>
                                <td className="px-6 py-4 text-center font-medium text-slate-600 font-mono">
                                  {formatDate(acc.fecha_implementacion) || '-'}
                                </td>
                                <td className="px-6 py-4 text-center">
                                  <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-bold inline-block ${status.color}`}>
                                    {status.text}
                                  </span>
                                </td>
                                  {(canEditar || canEliminar || profile?.role === 'cliente') && (
                                    <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                                      <div className="flex items-center justify-end gap-2">
                                        {acc.imagen_preview_url && (
                                          <a 
                                            href={acc.imagen_preview_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            title="Ver Evidencia"
                                            className="p-1.5 rounded-lg bg-blue-50 text-[#468DFF] hover:bg-blue-100 hover:text-[#0511F2] transition-colors inline-flex items-center justify-center shadow-sm"
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            <ImageIcon className="h-4.5 w-4.5" />
                                          </a>
                                        )}
                                        {canEditar ? (
                                          <button
                                            onClick={() => { setIsReadOnlyView(false); handleEditClick(acc); }}
                                            title="Editar"
                                            className="p-1.5 rounded-lg transition-all cursor-pointer inline-flex items-center bg-amber-50 hover:bg-amber-100 text-amber-600"
                                          >
                                            <Edit className="h-4.5 w-4.5" />
                                          </button>
                                        ) : (
                                          <button
                                            onClick={() => { setIsReadOnlyView(true); handleEditClick(acc); }}
                                            title="Ver Detalle"
                                            className="p-1.5 rounded-lg transition-all cursor-pointer inline-flex items-center bg-slate-100 hover:bg-slate-200 text-slate-600"
                                          >
                                            <Eye className="h-4.5 w-4.5" />
                                          </button>
                                        )}
                                        {canEliminar && (
                                          <button
                                            onClick={() => handleDeleteClick(acc.id)}
                                            title="Eliminar"
                                            className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition-all cursor-pointer inline-flex items-center"
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
                        }
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              </div>
            )}

          </div>
        )}

      </main>

      {/* MODAL DE CONFIRMACIÓN */}
      {modalAlert.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xl max-w-sm w-full animate-scale-up space-y-4 text-center">
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

      {/* Modal Informativo Nivel de Riesgo (Método BS 8800) */}
      {showRiskMatrix && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-scale-up">
            {/* Cabecera */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
              <h3 className="font-outfit text-base font-bold text-slate-900">
                Nivel de Riesgo y Acciones <span className="font-normal text-slate-500 text-sm">(Método BS 8800)</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowRiskMatrix(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            {/* Cuerpo */}
            <div className="p-6 overflow-y-auto space-y-6 scrollbar-thin">
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="p-3 font-bold text-slate-800 border-r border-slate-200">Nivel de Riesgo</th>
                      <th className="p-3 font-bold text-slate-800">Acción y cronograma</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-200">
                      <td className="p-3 font-bold text-white bg-[#00B050] border-r border-slate-200 text-center whitespace-nowrap">Riesgo trivial</td>
                      <td className="p-3 text-slate-600 bg-white">No se requiere ninguna acción y no es necesario guardar registros documentados.</td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="p-3 font-bold text-slate-900 bg-[#00FF00] border-r border-slate-200 text-center whitespace-nowrap">Riesgo tolerable</td>
                      <td className="p-3 text-slate-600 bg-white">No hacen falta controles adicionales. Puede prestarse mayor consideración a una mejor costo/beneficio, o mejora que no imponga una carga de costos adicionales. Se requiere monitoreo para asegurar que se mantengan los controles.</td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="p-3 font-bold text-slate-900 bg-[#FFFF00] border-r border-slate-200 text-center whitespace-nowrap">Riesgo moderado</td>
                      <td className="p-3 text-slate-600 bg-white">Deben tomarse los recaudos para reducir el riesgo, pero los costos de prevención deben medirse y restringirse cuidadosamente. Deben implementarse medidas de reducción de riesgo dentro de un lapso definido. Cuando el riesgo moderado está asociado con consecuencias de daño extremo, pueden resultar necesarias ulteriores evaluaciones para establecer con más precisión la probabilidad de daño como base para determinar la necesidad de tomar mejores medidas de control.</td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="p-3 font-bold text-white bg-[#FF9900] border-r border-slate-200 text-center whitespace-nowrap">Riesgo sustancial</td>
                      <td className="p-3 text-slate-600 bg-white">No debe comenzar el trabajo hasta que se haya reducido el riesgo. Puede ser necesario asignar recursos considerables para reducir el riesgo. Cuando éste involucra trabajo en proceso, debe tomarse acción urgente.</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-bold text-white bg-[#FF0000] border-r border-slate-200 text-center whitespace-nowrap">Riesgo intolerable</td>
                      <td className="p-3 text-slate-600 bg-white">No debe comenzar ni continuar el trabajo hasta que se haya reducido el riesgo. Si no es posible reducir el riesgo, el trabajo tiene que permanecer prohibido.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            
            {/* Pie de página */}
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setShowRiskMatrix(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-350 text-slate-700 font-bold text-xs rounded-xl transition-all active:scale-[0.98] cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notificación Toast flotante removido - consumido globalmente */}
      <AppFormNavigator
        activeList={filteredAcciones}
        currentId={editingId}
        onNavigate={(newAcc) => handleEditClick(newAcc)}
        hasUnsavedChanges={!isReadOnlyView}
        isFormOpen={isFormOpen}
      />

    </div>
  );
}
