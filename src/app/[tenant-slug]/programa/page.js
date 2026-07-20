// src/app/[tenant-slug]/programa/page.js
'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import { supabase } from '@/lib/supabase';
import { formatDate, formatAsDateInput, convertToDbDate } from '@/lib/utils';
import DocumentUploadZone from '@/components/ui/DocumentUploadZone';
import ImageUploadZone from '@/components/ui/ImageUploadZone';
import AITextHelper from '@/components/ui/AITextHelper';
import { useToast } from '@/components/providers/ToastProvider';
import AppPageHeader from '@/components/ui/AppPageHeader';
import AppButton from '@/components/ui/AppButton';
import AppInput from '@/components/ui/AppInput';
import AppSelect from '@/components/ui/AppSelect';
import AppConfirmDialog from '@/components/ui/AppConfirmDialog';
import AppCard from '@/components/ui/AppCard';
import AppEmptyState from '@/components/ui/AppEmptyState';
import AppFormNavigator from '@/components/ui/AppFormNavigator';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  Calendar,
  List,
  PlusCircle,
  Search,
  Building,
  Users,
  FileText,
  Printer,
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
  Upload,
  Image
} from 'lucide-react';

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

export default function ProgramaGestion({ params }) {
  const tenantSlug = params['tenant-slug'];

  // Vistas y Cargas
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDevMode, setIsDevMode] = useState(false);

  // Sesión y Datos Contexto
  const [profile, setProfile] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [adminContact, setAdminContact] = useState({ email: 'info@gestionsyso.com', phone: '1159969956 / 1132296691' });

  // Estados y Refs para Carga de Archivos
  const [selectedFileName, setSelectedFileName] = useState('');
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

  // Filtros
  const [filterEmpresa, setFilterEmpresa] = useState('');
  const [filterEstablecimiento, setFilterEstablecimiento] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showExportMobile, setShowExportMobile] = useState(false);

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
  const [fotosFiles, setFotosFiles] = useState([]); // array de { file: File | null, preview: string, path: string }
  const [observaciones, setObservaciones] = useState('');
  const [formErrors, setFormErrors] = useState({});
  const [uploadType, setUploadType] = useState('local'); // 'local', 'drive' or 'legajo'
  const [driveLink, setDriveLink] = useState('');
  const [legajoDocuments, setLegajoDocuments] = useState([]);
  const [selectedLegajoDocUrl, setSelectedLegajoDocUrl] = useState('');
  const [loadingLegajoDocs, setLoadingLegajoDocs] = useState(false);

  const originalDataRef = useRef('');

  const checkHasUnsavedChanges = () => {
    if (isReadOnlyView || !showForm || !originalDataRef.current) return false;
    const currentData = JSON.stringify({
      empresaId,
      establecimientoId,
      catalogoId,
      descripcion,
      marcoLegal,
      responsableId,
      responsableCustom,
      progreso,
      fechaPlanificada,
      fechaRealizacion,
      documentoUrl,
      observaciones,
      fotosFiles: fotosFiles.map(f => f.path || f.preview)
    });
    return originalDataRef.current !== currentData;
  };

  useEffect(() => {
    if (!documentoFile && !documentoUrl) {
      setSelectedFileName('');
    }
  }, [documentoFile, documentoUrl]);

  useEffect(() => {
    if (showForm && empresaId && uploadType === 'legajo') {
      loadLegajoDocuments(empresaId, establecimientoId);
    }
  }, [showForm, empresaId, establecimientoId, uploadType]);

  // Auto-filtrar por cliente si la sesión iniciada es de rol 'cliente'
  useEffect(() => {
    if (profile && profile.role === 'cliente' && profile.empresa_id) {
      setFilterEmpresa(profile.empresa_id);
    }
  }, [profile]);

  // Chequear parámetro de URL para agregar actividad desde el calendario del dashboard
  useEffect(() => {
    if (!loading) {
      const urlParams = new URLSearchParams(window.location.search);
      const addDate = urlParams.get('add-date');
      if (addDate) {
        handleAddNew(addDate);
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
      }
    }
  }, [loading]);


  // Modales y Toasts
  const globalToast = useToast();
  const [confirmModal, setConfirmModal] = useState({ show: false, title: '', message: '', onConfirm: null, confirmText: 'Eliminar' });

  // 1. Cargar datos iniciales
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const cached = sessionStorage.getItem('user-profile');
      if (cached) {
        setProfile(JSON.parse(cached));
      }
    }
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
    globalToast.toast(message, type);
  };

  const resolveAndSignProgs = async (progsList) => {
    const pathsToSign = [];
    (progsList || []).forEach(d => {
      const paths = getPathsFromImagenUrl(d.imagen_url);
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
        console.error('Error al firmar URLs de programa en lote:', e);
      }
    }

    return (progsList || []).map(d => {
      const paths = getPathsFromImagenUrl(d.imagen_url);
      const resolvedUrls = paths.map(ppath => {
        if (ppath.startsWith('http://') || ppath.startsWith('https://')) {
          return ppath;
        }
        return signedUrlsMap[ppath] || '';
      }).filter(url => url !== '');

      return {
        ...d,
        fotos_urls: resolvedUrls,
        fotos_paths: paths
      };
    });
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
      const signedProgs = await resolveAndSignProgs(progs || []);
      setActividades(signedProgs);

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

  const getBase64ImageFromUrl = async (imageUrl) => {
    if (!imageUrl) return '';
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
      triggerToast('Generando reporte PDF...', 'info');
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
      if (filterMonth) {
        const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        const mIdx = parseInt(filterMonth) - 1;
        if (months[mIdx]) filterParts.push(`Mes: ${months[mIdx]}`);
      }
      if (filterYear) {
        filterParts.push(`Año: ${filterYear}`);
      }
      if (filterEstado) {
        filterParts.push(`Estado: ${filterEstado}`);
      }
      const filterString = filterParts.join(' | ');

      const showEmpresaCol = profile?.role !== 'cliente' && !filterEmpresa;
      const showEstablecimientoCol = !filterEstablecimiento;

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
        d.text('Programa Anual de Higiene y Seguridad', 801, 35, { align: 'right' });

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
      if (showEmpresaCol) headersRow.push('Cliente');
      if (showEstablecimientoCol) headersRow.push('Establecimiento');
      headersRow.push('Actividad / Descripción', 'Marco Legal', 'Responsable', 'Fecha Planif.', 'Fecha Realiz.', 'Estado', 'Progreso');
      const headers = [headersRow];
      
      const body = sortedActividades.map(act => {
        const emp = empresas.find(e => e.id === act.empresa_id);
        const est = allEstablecimientos.find(e => e.id === act.establecimiento_id);
        const status = getItemStatusAndColor(act);
        
        const rowData = [];
        if (showEmpresaCol) rowData.push(emp ? emp.razon_social : 'N/A');
        if (showEstablecimientoCol) rowData.push(est ? est.denominacion : 'N/A');
        rowData.push(
          act.descripcion || 'N/A',
          act.marco_legal || 'N/A',
          act.responsable || 'N/A',
          formatDate(act.fecha_planificada) || 'N/A',
          formatDate(act.fecha_realizacion) || 'N/A',
          status.estadoText,
          `${act.progreso || 0}%`
        );
        return rowData;
      });

      const columnsDef = [];
      if (showEmpresaCol) columnsDef.push({ key: 'cliente', ratio: 1.25 });
      if (showEstablecimientoCol) columnsDef.push({ key: 'establecimiento', ratio: 1.25 });
      columnsDef.push(
        { key: 'actividad', ratio: 2.2 },
        { key: 'marco_legal', ratio: 1.5 },
        { key: 'responsable', ratio: 1.25 },
        { key: 'fecha_planif', ratio: 0.85 },
        { key: 'fecha_realiz', ratio: 0.85 },
        { key: 'estado', ratio: 0.85 },
        { key: 'progreso', ratio: 0.7 }
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
        headStyles: { fillColor: [68, 114, 196], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
        bodyStyles: { fontSize: 7, textColor: [50, 50, 50] },
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
        }
      });

      if (shouldPrint) {
        doc.autoPrint();
        const blobUrl = doc.output('bloburl');
        window.open(blobUrl, '_blank');
        triggerToast('Vista previa abierta.');
      } else {
        doc.save(`Programa_Gestion_Anual_${new Date().getFullYear()}.pdf`);
        triggerToast('PDF descargado exitosamente.');
      }
    } catch (e) {
      console.error('Error generating PDF:', e);
      triggerToast('Error al generar el reporte PDF.', 'error');
    }
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
          d.documento_url &&
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
          d.documento_url &&
          (!estId || d.establecimiento_id === estId || d.establecimiento_id === null)
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

  const handleSwitchUploadType = (newType) => {
    setUploadType(newType);
    setDocumentoFile(null);
    setSelectedLegajoDocUrl('');
  };

  const handleFileChange = (file) => {
    setDocumentoFile(file);
    setSelectedFileName(file ? file.name : '');
  };

  // 5. Cargar para Editar
  const handleEdit = (item) => {
    setEditingId(item.id);
    setEmpresaId(item.empresa_id || '');
    setEstablecimientoId(item.establecimiento_id || '');
    // Si el catalogo_id ya no está en el catálogo (o no existía), tratar como entrada manual
    const inCatalog = catalogo.some(c => c.id === item.catalogo_id);
    const finalCatalogId = inCatalog ? (item.catalogo_id || '') : '__custom__';
    setCatalogoId(finalCatalogId);
    setDescripcion(item.descripcion || '');
    setMarcoLegal(item.marco_legal || '');
    let finalRespId = '';
    let finalRespCustom = '';
    if (item.responsable_id) {
      finalRespId = item.responsable_id;
      finalRespCustom = '';
      setResponsableId(item.responsable_id);
      setResponsableCustom('');
    } else if (item.responsable) {
      finalRespId = '__custom__';
      finalRespCustom = item.responsable;
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
    setSelectedFileName(item.documento_url ? 'Archivo de respaldo existente' : '');
    setDocumentoFile(null);

    // Cargar fotos guardadas
    const loadedFotos = (item.fotos_paths || []).map((ppath, idx) => ({
      file: null,
      preview: item.fotos_urls?.[idx] || '',
      path: ppath
    })).filter(f => f.preview !== '');
    setFotosFiles(loadedFotos);

    setObservaciones(item.observaciones || '');
    setFormErrors({});

    originalDataRef.current = JSON.stringify({
      empresaId: item.empresa_id || '',
      establecimientoId: item.establecimiento_id || '',
      catalogoId: finalCatalogId,
      descripcion: item.descripcion || '',
      marcoLegal: item.marco_legal || '',
      responsableId: finalRespId,
      responsableCustom: finalRespCustom,
      progreso: item.progreso || 0,
      fechaPlanificada: formatDate(item.fecha_planificada) || '',
      fechaRealizacion: formatDate(item.fecha_realizacion) || '',
      documentoUrl: item.documento_url || '',
      observaciones: item.observaciones || '',
      fotosFiles: loadedFotos.map(f => f.path || f.preview)
    });

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
    const finalDate = formatDate(preselectedDate || new Date().toISOString().split('T')[0]);
    setFechaPlanificada(finalDate);
    setFechaRealizacion('');
    setDocumentoUrl('');
    setDocumentoFile(null);
    setFotosFiles([]);
    setObservaciones('');
    setFormErrors({});

    originalDataRef.current = JSON.stringify({
      empresaId: '',
      establecimientoId: '',
      catalogoId: '',
      descripcion: '',
      marcoLegal: '',
      responsableId: '',
      responsableCustom: '',
      progreso: 0,
      fechaPlanificada: finalDate,
      fechaRealizacion: '',
      documentoUrl: '',
      observaciones: '',
      fotosFiles: []
    });

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
      // Subir fotos
      const finalImagenPaths = [];
      for (let i = 0; i < fotosFiles.length; i++) {
        const foto = fotosFiles[i];
        if (foto.file) {
          if (isDevMode) {
            finalImagenPaths.push(foto.preview || 'mock-image-path');
          } else {
            const fileExt = foto.file.name.split('.').pop();
            const filePath = `${profile.id}/programa_img_${Date.now()}_${i}.${fileExt}`;
            const { error: uploadErr } = await supabase.storage
              .from('documents')
              .upload(filePath, foto.file, {
                upsert: true
              });
            if (uploadErr) throw uploadErr;
            finalImagenPaths.push(filePath);
          }
        } else if (foto.path) {
          finalImagenPaths.push(foto.path);
        }
      }
      const finalImagenUrlVal = finalImagenPaths.length > 0 ? JSON.stringify(finalImagenPaths) : null;

      let finalDocUrl = documentoUrl;

      // 1. Si hay un nuevo archivo cargado, subirlo
      if (uploadType === 'legajo') {
        if (!selectedLegajoDocUrl) {
          throw new Error('Debes seleccionar un documento del legajo técnico.');
        }
        finalDocUrl = selectedLegajoDocUrl;
      } else if (documentoFile) {
        if (isDevMode) {
          finalDocUrl = 'mock-uploaded-pdf-path';
        } else {
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
        imagen_url: finalImagenUrlVal,
        observaciones: observaciones || null,
        updated_at: new Date().toISOString()
      };

      const mockResolvedUrls = finalImagenPaths;

      if (editingId) {
        // ACTUALIZAR
        if (isDevMode) {
          setActividades(prev => prev.map(a => a.id === editingId ? { 
            ...a, 
            ...dataPayload,
            fotos_paths: finalImagenPaths,
            fotos_urls: mockResolvedUrls
          } : a));
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
            ...dataPayload,
            fotos_paths: finalImagenPaths,
            fotos_urls: mockResolvedUrls
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
        const signedProgs = await resolveAndSignProgs(progs || []);
        setActividades(signedProgs);
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
    setFotosFiles([]);
    setObservaciones('');
    setFormErrors({});
    setLegajoDocuments([]);
    setSelectedLegajoDocUrl('');
    setLoadingLegajoDocs(false);
    originalDataRef.current = '';
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
      triggerToast('Simulación: Abriendo documento en nueva pestaña.', 'info');
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
        <AppPageHeader
          title="Programa de Gestión Anual"
          icon={Calendar}
          tenantName={tenant?.name || 'Cargando...'}
          planId={tenant?.plan_id}
          showPlanBadge={profile && profile.role !== 'cliente'}
          setIsMobileMenuOpen={setIsMobileMenuOpen}
        />

        {loading ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-[#468DFF] mx-auto" />
              <p className="text-xs text-slate-500 font-semibold">Cargando programa de gestión...</p>
            </div>
          </div>
        ) : (
          <div className="max-w-[95%] mx-auto w-full py-8 px-4 md:px-0 flex-1 flex flex-col min-h-0">
            {showForm ? (
              // FORMULARIO DE ALTA Y EDICIÓN INLINE
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
                              ? "w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm bg-slate-100 text-slate-500 outline-none"
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
                        <p className="text-[9px] text-slate-400 mt-1 italic">Opcional. Si no se carga, el estado será "En análisis".</p>
                      </div>

                      {/* F. Realización */}
                      <div>
                        <label className="text-xs font-bold text-slate-600 block mb-1.5">
                          F. Realización
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="DD/MM/YYYY"
                            maxLength={10}
                            value={fechaRealizacion}
                            onChange={(e) => handleRealizacionChange(formatAsDateInput(e.target.value))}
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
      handleRealizacionChange(`${parts[2]}/${parts[1]}/${parts[0]}`);
    }
  } else {
    handleRealizacionChange('');
  }
                              }}
                            />
                          </div>
                        </div>
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
                  </fieldset>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* 8. Carga de Documento */}
                    <div>
                      <DocumentUploadZone
                        label="Documento de Respaldo / Evidencia (PDF)"
                        file={documentoFile}
                        fileName={selectedFileName}
                        url={documentoUrl}
                        onDelete={() => {
                          setDocumentoUrl('');
                          setDocumentoFile(null);
                          setSelectedFileName('');
                        }}
                        onFileChange={handleFileChange}
                        onDriveImportSuccess={(filePath) => {
                          setDocumentoUrl(filePath);
                          setSelectedFileName('Archivo de Drive importado');
                        }}
                        onViewPdf={handleViewPdf}
                        disabled={!canEdit}
                        tenantId={tenant?.id}
                        onToast={triggerToast}
                        uploadType={uploadType}
                        setUploadType={handleSwitchUploadType}
                        showTabs={true}
                        tabs={[
                          { id: 'local', name: 'Archivo Local' },
                          { id: 'drive', name: 'Enlace Drive' },
                          { id: 'legajo', name: 'Legajo Técnico' }
                        ]}
                      >
                        {uploadType === 'legajo' && (
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
                                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all cursor-pointer font-semibold"
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
                      </DocumentUploadZone>
                    </div>

                    {/* Imágenes / Evidencia Fotográfica */}
                    <div>
                      <ImageUploadZone
                        label="Imágenes / Evidencia Fotográfica"
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

                  <fieldset disabled={!canEdit} className="space-y-6">
                    {/* 9. Observaciones */}
                    <div>
                      <div className="flex items-center justify-between gap-2 min-h-[28px] mb-1.5">
                        <label className="text-xs font-bold text-slate-600 block mb-0">
                          Observaciones Generales
                        </label>
                        <AITextHelper
                          value={observaciones}
                          onChange={setObservaciones}
                          context="Observaciones generales de la actividad programada en el programa de gestión anual"
                          disabled={isReadOnlyView}
                        />
                      </div>
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
                            placeholder="Buscar actividad, cliente, obs..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
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

                  {/* Fila Inferior: Filtros rápidos */}
                  <div className="border-t border-slate-100 pt-1.5 space-y-2">
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

                      {canCargar && (
                        <button
                          onClick={() => handleAddNew()}
                          className="px-3 py-1.5 bg-[#468DFF] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-[#0511F2] transition-all cursor-pointer shadow-lg shadow-[#468DFF]/10 shrink-0"
                        >
                          <PlusCircle className="h-3.5 w-3.5" />
                          Nueva Actividad
                        </button>
                      )}
                    </div>

                    {showFilters && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 pt-1 animate-fade-in">
                        {profile?.role !== 'cliente' && (
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
                        )}

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
                  <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col" style={{ height: showFilters ? 'calc(100vh - 310px)' : 'calc(100vh - 240px)' }}>
                    {actividades.length === 0 ? (
                      <AppEmptyState
                        title="No hay actividades de gestión registradas"
                        description="Registra una nueva actividad de gestión para comenzar."
                        actionButton={canCargar && (
                          <AppButton
                            onClick={() => handleAddNew()}
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
                      <div className="overflow-auto flex-grow">
                        <table className="w-full border-collapse text-left min-w-[850px]">
                          <thead className="sticky top-0 z-10 bg-slate-50">
                          <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-400 uppercase tracking-wider">
                            <th className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 px-6 py-4 cursor-pointer hover:text-slate-700 select-none transition-colors" onClick={() => handleSort('cliente')}>
                              <div className="flex items-center gap-1">
                                Cliente / Establecimiento
                                {sortField === 'cliente' && (sortOrder === 'asc' ? ' ▲' : ' ▼')}
                              </div>
                            </th>
                            <th className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 px-6 py-4 cursor-pointer hover:text-slate-700 select-none transition-colors" onClick={() => handleSort('actividad')}>
                              <div className="flex items-center gap-1">
                                Actividad / Legal
                                {sortField === 'actividad' && (sortOrder === 'asc' ? ' ▲' : ' ▼')}
                              </div>
                            </th>
                            <th className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 px-6 py-4 cursor-pointer hover:text-slate-700 select-none transition-colors" onClick={() => handleSort('responsable')}>
                              <div className="flex items-center gap-1">
                                Responsable
                                {sortField === 'responsable' && (sortOrder === 'asc' ? ' ▲' : ' ▼')}
                              </div>
                            </th>
                            <th className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 px-6 py-4 cursor-pointer hover:text-slate-700 select-none transition-colors" onClick={() => handleSort('fecha_planificada')}>
                              <div className="flex items-center gap-1">
                                F. Planificada
                                {sortField === 'fecha_planificada' && (sortOrder === 'asc' ? ' ▲' : ' ▼')}
                              </div>
                            </th>
                            <th className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 px-6 py-4 cursor-pointer hover:text-slate-700 select-none transition-colors" onClick={() => handleSort('fecha_realizacion')}>
                              <div className="flex items-center gap-1">
                                F. Realización
                                {sortField === 'fecha_realizacion' && (sortOrder === 'asc' ? ' ▲' : ' ▼')}
                              </div>
                            </th>
                            <th className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 px-6 py-4 cursor-pointer hover:text-slate-700 select-none transition-colors w-[15%]" onClick={() => handleSort('progreso')}>
                              <div className="flex items-center gap-1">
                                Progreso / Estado
                                {sortField === 'progreso' && (sortOrder === 'asc' ? ' ▲' : ' ▼')}
                              </div>
                            </th>
                            <th className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 px-6 py-4 text-center">Doc</th>
                            {(canEditar || canEliminar) && <th className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 px-6 py-4 text-right">Acciones</th>}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                          {sortedActividades.length === 0 ? (
                            <AppEmptyState
                              title="No se encontraron actividades"
                              description="Probá modificando los filtros de búsqueda o registrá una nueva actividad."
                              icon={Search}
                              colSpan={(canEditar || canEliminar) ? 8 : 7}
                            />
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
                                  className="hover:bg-slate-100 cursor-pointer transition-colors"
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
                                      <div className="w-16 h-1.5 bg-slate-100 border border-slate-200 rounded-full overflow-hidden">
                                        <div className="bg-[#468DFF] h-full" style={{ width: `${act.progreso}%` }} />
                                      </div>
                                    </div>
                                  </td>

                                  <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                                    <div className="flex items-center justify-center gap-1.5">
                                      {act.documento_url ? (
                                        <>
                                          <button
                                            onClick={(e) => { e.stopPropagation(); handleViewPdf(act.documento_url); }}
                                            className="p-1.5 rounded-lg bg-blue-50 text-[#468DFF] hover:bg-blue-100 hover:text-[#0511F2] transition-all cursor-pointer inline-flex items-center justify-center shadow-sm"
                                            title="Visualizar PDF"
                                          >
                                            <FileText className="h-4.5 w-4.5" />
                                          </button>
                                          {!act.documento_url.startsWith('http') && (
                                            <button
                                              onClick={(e) => { e.stopPropagation(); handleDownloadPdf(act.documento_url, `${act.descripcion}.pdf`); }}
                                              className="p-1.5 rounded-lg bg-blue-50 text-[#468DFF] hover:bg-blue-100 hover:text-[#0511F2] transition-all cursor-pointer inline-flex items-center justify-center shadow-sm"
                                              title="Descargar PDF"
                                            >
                                              <Download className="h-4.5 w-4.5" />
                                            </button>
                                          )}
                                        </>
                                      ) : null}
                                      {act.fotos_paths && act.fotos_paths.length > 0 ? (
                                        <button
                                          onClick={(e) => { e.stopPropagation(); setIsReadOnlyView(true); handleEdit(act); }}
                                          className="p-1.5 rounded-lg bg-[#EFF6FF] text-[#468DFF] hover:bg-[#DBEAFE] hover:text-[#0511F2] transition-all cursor-pointer inline-flex items-center justify-center shadow-sm"
                                          title={`Visualizar Evidencia (${act.fotos_paths.length} ${act.fotos_paths.length === 1 ? 'imagen' : 'imágenes'})`}
                                        >
                                          <Image className="h-4.5 w-4.5" />
                                        </button>
                                      ) : null}
                                      {!act.documento_url && (!act.fotos_paths || act.fotos_paths.length === 0) && (
                                        <span className="text-[10px] text-slate-400 font-semibold italic">Vacío</span>
                                      )}
                                    </div>
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
                    )}
                  </div>
              </div>
            )}
          </div>
        )}

        {/* MODAL DE CONFIRMACIÓN */}
        {confirmModal.show && (
          <div className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xl max-w-sm w-full animate-scale-up space-y-4 text-center">
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

        {/* TOAST NOTIFICACIÓN removido - consumido globalmente */}
        <AppFormNavigator
          activeList={sortedActividades}
          currentId={editingId}
          onNavigate={(newAct) => handleEdit(newAct)}
          hasUnsavedChanges={!isReadOnlyView}
          isFormOpen={showForm}
        />

      </main>
    </div>
  );
}
