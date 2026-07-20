// src/app/[tenant-slug]/legajo/page.js
'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import { supabase } from '@/lib/supabase';
import { formatDate, formatAsDateInput, convertToDbDate } from '@/lib/utils';
import DocumentUploadZone from '@/components/ui/DocumentUploadZone';
import ImageUploadZone from '@/components/ui/ImageUploadZone';
import { useToast } from '@/components/providers/ToastProvider';
import AppPageHeader from '@/components/ui/AppPageHeader';
import AppButton from '@/components/ui/AppButton';
import AppInput from '@/components/ui/AppInput';
import AppSelect from '@/components/ui/AppSelect';
import AppConfirmDialog from '@/components/ui/AppConfirmDialog';
import AppCard from '@/components/ui/AppCard';
import AppEmptyState from '@/components/ui/AppEmptyState';
import AppFormNavigator from '@/components/ui/AppFormNavigator';
import { 
  Folder, 
  FolderOpen, 
  HelpCircle,
  FileText, 
  Search, 
  PlusCircle, 
  X, 
  Check, 
  AlertTriangle,
  Loader2, 
  Trash2, 
  Edit, 
  Briefcase, 
  Settings, 
  LogOut, 
  Menu, 
  ChevronRight, 
  ArrowLeft, 
  Sliders, 
  Calendar, 
  Building, 
  Upload, 
  ExternalLink, 
  Eye, 
  Download, 
  ChevronDown, 
  ChevronUp, 
  Trash, 
  Plus, 
  ChevronLeft,
  Shield, 
  Activity, 
  GraduationCap, 
  ShieldAlert, 
  Flame, 
  BookOpen, 
  ClipboardList, 
  Accessibility, 
  HeartHandshake, 
  Scale, 
  FolderLock, 
  FileSpreadsheet, 
  Wrench, 
  Gauge, 
  Zap, 
  Contact, 
  Users, 
  Bug, 
  FileCheck,
  Archive,
  SlidersHorizontal,
  Image
} from 'lucide-react';

// Estructura jerárquica de carpetas y subcarpetas
const LEGAJO_FOLDERS = [
  {
    id: 'art',
    name: 'ART',
    icon: 'Shield',
    subfolders: [
      { id: 'rgrl', name: 'Relevamiento General de Riesgos Laborales (RGRL)', docTypes: ['Relevamiento General de Riesgos Laborales', 'Anexo 1 - Resolución 886/15 (Protocolo de Ergonomía)'] },
      { id: 'rar', name: 'Relevamiento de Agentes de Riesgo (RAR)', docTypes: ['Relevamiento de Agentes de Riesgos'] },
      { id: 'svcc', name: 'Sistema de Vigilancia y Control de Sustancias y Agentes (S.V.C.C.)', docTypes: ['Declaración jurada para informar la presencia de Sustancias y Agentes Cancerígenos (S.V.C.C.)'] },
      { id: 'visitas_art', name: 'Constancias de visita', docTypes: ['Constancia de visita'] }
    ]
  },
  {
    id: 'estudios_mediciones',
    name: 'Estudios y mediciones',
    icon: 'Activity',
    subfolders: [
      { id: 'ruido', name: 'Ruido', docTypes: ['Anexo - Resolución 85/12 (Protocolo de ruido)', 'Estudio de ruido'] },
      { id: 'iluminacion', name: 'Iluminación', docTypes: ['Anexo - Resolución 84/12 (Protocolo de Iluminación)', 'Estudio de iluminación'] },
      { id: 'puesta_tierra', name: 'Puesta a tierra y continuidad de masas', docTypes: ['Anexo - Resolución 900/15 (Protocolo de medición de la puesta a tierra y continuidad de las masas)', 'Medición de puesta a tierra y continuidad de masas'] },
      { id: 'agua', name: 'Análisis fisicoquímico y bacteriológico de agua para el consumo humano', docTypes: ['Análisis bacteriológico de agua de consumo humano', 'Análisis fisicoquímico de agua de consumo humano', 'Certificado de limpieza de tanque de agua para consumo humano'] },
      { id: 'contaminantes_quimicos', name: 'Contaminantes Químicos', docTypes: ['Anexo - Resolución 861/15 (Protocolo para Medición de Contaminantes Químicos en el Aire de un Ambiente de Trabajo)', 'Medición de contaminantes químicos del aire'] },
      { id: 'carga_termica', name: 'Carga térmica / Estrés térmico', docTypes: ['Protocolo de medición de estrés por calor en el ambiente laboral', 'Estudio de carga térmica', 'Medición de carga térmica'] },
      { id: 'ventilacion', name: 'Ventilación', docTypes: ['Estudio de ventilación', 'Medición de ventilación'] },
      { id: 'vibraciones', name: 'Vibraciones', docTypes: ['Estudio de Vibraciones (cuerpo entero)', 'Estudio de Vibraciones (mano – brazo)', 'Medición de vibraciones'] },
      { id: 'radiaciones', name: 'Radiaciones', docTypes: ['Estudio de exposición a laser', 'Estudio de radiaciones ionizantes', 'Estudio de radiaciones no ionizantes'] }
    ]
  },
  {
    id: 'capacitacion',
    name: 'Capacitación',
    icon: 'GraduationCap',
    subfolders: [
      { id: 'plan_anual', name: 'Plan de capacitación anual', docTypes: ['Programa Anual de Capacitación en materia de Higiene y Seguridad en el Trabajo'] },
      { id: 'registros_capacitacion', name: 'Registros de capacitación', docTypes: ['Registro de capacitación'] }
    ]
  },
  {
    id: 'epp',
    name: 'Elementos de protección personal (EPP´s)',
    icon: 'ShieldAlert',
    docTypes: ['Entrega de elementos de protección personal (EPP´s)']
  },
  {
    id: 'incendios',
    name: 'Protección contra incendios',
    icon: 'Flame',
    subfolders: [
      { id: 'carga_fuego', name: 'Carga de fuego', docTypes: ['Estudio de Carga de Fuego'] },
      { id: 'instalaciones_incendio', name: 'Instalaciones de protección contra incendios', docTypes: ['Informe Antisiniestral'] },
      { id: 'tratamiento_ignifugo', name: 'Tratamiento ignífugo', docTypes: ['Certificado de aplicación de retardante de llamas - tratamiento ignífugo'] },
      { id: 'campanas_conductos', name: 'Campanas, Conductos y Afines', docTypes: ['Certificado de limpieza de campanas, conductos y afines', 'Registro de Campanas, Conductos y Afines'] }
    ]
  },
  {
    id: 'manual_procedimientos',
    name: 'Manual de procedimientos del Servicio de Higiene y Seguridad',
    icon: 'BookOpen',
    subfolders: [
      { id: 'normas_seguridad', name: 'Normas generales de seguridad', docTypes: ['Manual de procedimientos del Servicio de Higiene y Seguridad', 'Política del establecimiento en materia de Seguridad y Salud en el Trabajo'] },
      { id: 'emergencia_evacuacion', name: 'Plan de acción ante emergencia y evacuación / Sistema de Autoprotección', docTypes: ['Plan de Evacuación', 'Planos generales de evacuación', 'Sistema de Autoprotección'] },
      { id: 'simulacros', name: 'Simulacros', docTypes: ['Informe de simulacro de derrame de producto químico', 'Informe de simulacro de evacuación', 'Informe de simulacro'] },
      { id: 'procedimientos_trabajo', name: 'Procedimientos de trabajo seguro', docTypes: ['Procedimientos de trabajo seguro'] }
    ]
  },
  {
    id: 'programa_higiene_seguridad',
    name: 'Programa de Higiene y Seguridad en el Trabajo',
    icon: 'ClipboardList',
    subfolders: [
      { id: 'programa_anual_prevencion', name: 'Programa anual de prevención de riesgos', docTypes: ['Programa de Higiene y Seguridad en el Trabajo'] },
      { id: 'matriz_riesgos', name: 'Matriz de identificación de peligros y evaluación de riesgos', docTypes: ['Matriz de identificación de peligros y evaluación de riesgos'] },
      { id: 'mapa_riesgos', name: 'Mapa de riesgos', docTypes: ['Mapa de Riesgos Laborales'] },
      { id: 'inspecciones_auditorias', name: 'Check List, Inspecciones y Auditorías internas', docTypes: ['Inspección Visual de Instalaciones Eléctricas (trimestral)', 'Control trimestral de Extintores', 'Programa de mantenimiento preventivo y correctivo de instalaciones eléctricas', 'Programa de mantenimiento preventivo y correctivo de máquinas y equipos (Aparatos para izar, Ascensores y Montacargas, Calderas y recipientes a presión, etc.)', 'Programa de mantenimiento preventivo y correctivo de sistema de extracción, ductos cañerías, filtros, campanas, etc.'] },
      { id: 'constancias_visita_prog', name: 'Constancias de visita', docTypes: ['Constancia de visita'] },
      { id: 'avisos_riesgo_prog', name: 'Avisos de riesgo', docTypes: ['Aviso de riesgo'] },
      { id: 'seguimiento_correctivas', name: 'Seguimiento de acciones correctivas', docTypes: ['Plan de Acciones Correctivas'] },
      { id: 'ats', name: 'Análisis de trabajo seguro (ATS)', docTypes: ['Análisis de trabajo seguro (ATS)', 'ATS'] }
    ]
  },
  {
    id: 'pei',
    name: 'Programa de ergonomía integrado (PEI)',
    icon: 'Accessibility',
    subfolders: [
      { id: 'factores_riesgo_ergonomico', name: 'Identificación y evaluación de los factores de riesgo ergonómico (Res. 886/15)', docTypes: ['Anexo 1 - Resolución 886/15 (Protocolo de Ergonomía)'] },
      { id: 'estudios_ergonomicos', name: 'Estudios ergonómicos', docTypes: ['Estudio Ergonómico'] }
    ]
  },
  {
    id: 'accidentes_enfermedades',
    name: 'Accidentes de Trabajo y Enfermedades Profesionales',
    icon: 'HeartHandshake',
    docTypes: ['Informe de investigación accidente de trabajo', 'Exámenes médicos periódicos']
  },
  {
    id: 'matriz_cumplimiento',
    name: 'Matriz de cumplimiento legal',
    icon: 'Scale',
    docTypes: ['Matríz de cumplimiento legal']
  },
  {
    id: 'programa_seguridad',
    name: 'Programa de seguridad (Res. 51/97 - Res.35/98 - Res. 319/99)',
    icon: 'FolderLock',
    docTypes: ['Programa de Seguridad (Res. 51/97)', 'Programa de Seguridad (Res. 35/98)', 'Programa de Seguridad (Res. 319/99)']
  },
  {
    id: 'fichas_seguridad',
    name: 'Fichas de Seguridad de productos químicos',
    icon: 'FileSpreadsheet',
    docTypes: ['Ficha de seguridad']
  },
  {
    id: 'habilitaciones_inspecciones',
    name: 'Habilitaciones e Inspecciones de Equipos e Instalaciones',
    icon: 'Wrench',
    subfolders: [
      { id: 'izaje_cargas', name: 'Equipos de izaje de cargas', docTypes: ['Habilitación / Renovación de los Aparatos Sometidos a Presión', 'Inspección anual, Habilitación / renovación de A.S.P.'] },
      { id: 'elevacion_personas', name: 'Equipos de elevación de personas', docTypes: [] },
      { id: 'equipos_termicos', name: 'Equipos térmicos (no ASP)', docTypes: ['Registro de Instalaciones Térmicas (RIT)'] },
      { id: 'instalaciones_tecnicas', name: 'Instalaciones técnicas (Gas, Electricidad, Otras)', docTypes: [] }
    ]
  },
  {
    id: 'asp',
    name: 'Aparatos sometidos a presión (ASP)',
    icon: 'Gauge',
    subfolders: [
      { id: 'calderas', name: 'Calderas', docTypes: ['Habilitación / Renovación de los Aparatos Sometidos a Presión'] },
      { id: 'compresores', name: 'Compresores', docTypes: ['Habilitación / Renovación de los Aparatos Sometidos a Presión'] },
      { id: 'otros_equipos_asp', name: 'Otros equipos a presión', docTypes: ['Habilitación / Renovación de los Aparatos Sometidos a Presión'] }
    ]
  },
  {
    id: 'sedronar',
    name: 'Sedronar',
    icon: 'FileText',
    subfolders: [
      { id: 'renpre', name: 'Registro Nacional de Precursores Químicos (RENPRE)', docTypes: ['Informe trimestral del RENPRE', 'Renovación anual del RENPRE (Sedronar)'] }
    ]
  },
  {
    id: 'energia',
    name: 'Secretaría de Energía',
    icon: 'Zap',
    subfolders: [
      { id: 'almacenamiento_hidrocarburos', name: 'Certificado de instalaciónes de almacenamiento de hidrocarburos', docTypes: ['Certificado de instalaciónes de almacenamiento de hidrocarburos'] },
      { id: 'aptitud_tecnica_glp', name: 'Certificado de aptitud técnica y de seguridad (GLP)', docTypes: ['Certificado de aptitud técnica y de seguridad (GLP)'] }
    ]
  },
  {
    id: 'contratistas',
    name: 'Contratistas',
    icon: 'Contact',
    docTypes: []
  },
  {
    id: 'comite_mixto',
    name: 'Comité Mixto de Higiene y Seguridad en el Trabajo',
    icon: 'Users',
    docTypes: ['Minuta del Comité Mixto de Higiene y Seguridad en el Trabajo']
  },
  {
    id: 'desinfeccion_desinsectacion',
    name: 'Desinfección, desinsectación, desratización',
    icon: 'Bug',
    docTypes: []
  },
  {
    id: 'actas_inspeccion',
    name: 'Actas de inspección',
    icon: 'FileCheck',
    docTypes: []
  },
  {
    id: 'nomina_personal',
    name: 'Nómina de Personal',
    icon: 'Users',
    docTypes: ['Nómina de Personal']
  }
];

const FolderIconHelper = ({ name, className }) => {
  const icons = {
    Shield, Activity, GraduationCap, ShieldAlert, Flame, BookOpen, ClipboardList,
    Accessibility, HeartHandshake, Scale, FolderLock, FileSpreadsheet, Wrench, Gauge,
    FileText, Zap, Contact, Users, Bug, FileCheck
  };
  const Comp = icons[name] || Folder;
  return <Comp className={className} />;
};

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

export default function LegajoPage({ params }) {
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

  // Navegación del Explorador
  const [currentFolder, setCurrentFolder] = useState(null); // Objeto de LEGAJO_FOLDERS
  const [currentSubfolder, setCurrentSubfolder] = useState(null); // Objeto subfolder
  
  // Datos principales
  const [documents, setDocuments] = useState([]);
  const [registrosList, setRegistrosList] = useState([]);

  // Estados del CRUD
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isReadOnlyView, setIsReadOnlyView] = useState(false);
  const [saving, setSaving] = useState(false);

  // Campos del formulario
  const [empresaId, setEmpresaId] = useState('');
  const [establecimientoId, setEstablecimientoId] = useState('');
  const [registroId, setRegistroId] = useState('');
  const [documentoNombre, setDocumentoNombre] = useState('');
  const [documentoCustom, setDocumentoCustom] = useState('');
  const [fecha, setFecha] = useState('');
  
  // Subida de archivos
  const [documentoFile, setDocumentoFile] = useState(null);
  const [documentoUrl, setDocumentoUrl] = useState('');
  const [selectedFileName, setSelectedFileName] = useState('');
  const [fotosFiles, setFotosFiles] = useState([]); // array de { file: File | null, preview: string, path: string }

  const originalDataRef = useRef('');

  // Sincronizar datos originales para control de cambios sin guardar
  useEffect(() => {
    if (isFormOpen && !saving) {
      originalDataRef.current = JSON.stringify({
        empresaId,
        establecimientoId,
        registroId,
        documentoNombre,
        documentoCustom,
        fecha,
        documentoUrl,
        fotosFiles: fotosFiles.map(f => f.path || f.preview)
      });
    }
  }, [
    isFormOpen,
    saving,
    editingId,
    empresaId,
    establecimientoId,
    registroId,
    documentoNombre,
    documentoCustom,
    fecha,
    documentoUrl,
    fotosFiles
  ]);

  const checkHasUnsavedChanges = () => {
    if (isReadOnlyView || !isFormOpen) return false;
    const currentData = JSON.stringify({
      empresaId,
      establecimientoId,
      registroId,
      documentoNombre,
      documentoCustom,
      fecha,
      documentoUrl,
      fotosFiles: fotosFiles.map(f => f.path || f.preview)
    });
    return originalDataRef.current !== currentData;
  };

  // Filtros de listado
  const [filterText, setFilterText] = useState('');
  const [filterEmpresa, setFilterEmpresa] = useState('');
  const [filterEstablecimiento, setFilterEstablecimiento] = useState('');
  const [filterFecha, setFilterFecha] = useState('');
  const [filterAnio, setFilterAnio] = useState('');
  const [filterMes, setFilterMes] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showExportMobile, setShowExportMobile] = useState(false);

  // Alertas, Toast y Modales
  const globalToast = useToast();
  const [modalAlert, setModalAlert] = useState({ show: false, title: '', message: '', type: 'info', onConfirm: null, confirmText: 'Confirmar' });
  const [showIndexModal, setShowIndexModal] = useState(false);

  // Estados de ordenamiento
  const [sortField, setSortField] = useState('fecha');
  const [sortOrder, setSortOrder] = useState('desc');


  // Permisos granulares
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

  const sectionPerms = getSectionPermissions(profile, 'legajo');
  const canCargar = sectionPerms.cargar;
  const canEditar = sectionPerms.editar;
  const canEliminar = sectionPerms.eliminar;
  const isFormDisabled = (editingId ? !canEditar : !canCargar) || isReadOnlyView;
  const canEdit = !isFormDisabled;

  // Sidebar collapse
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
        setIsDevMode(true);
        loadMockData();
      } else {
        await loadRealData();
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

  const closeAlert = () => setModalAlert({ show: false, title: '', message: '', type: 'info', onConfirm: null, confirmText: 'Confirmar' });

  // Cargar datos Mock en Desarrollo
  const loadMockData = () => {
    setProfile({ full_name: 'Profesional de SySO (Mock)', role: 'admin' });
    setTenant({ id: 'mock-tenant', name: 'Consultora de Prueba', plan_id: 'free' });
    setEmpresas([
      { id: 'mock-empresa-1', razon_social: 'Acme Argentina S.A.', cuit: '30712345678' },
      { id: 'mock-empresa-2', razon_social: 'Argento Via Publica', cuit: '30543210987' }
    ]);
    setAllEstablecimientos([
      { id: 'mock-est-1', empresa_id: 'mock-empresa-1', denominacion: 'Planta Industrial Pilar', direccion: 'Calle Falsa 123' },
      { id: 'mock-est-2', empresa_id: 'mock-empresa-1', denominacion: 'Oficinas Belgrano', direccion: 'Av. Cabildo 1540' },
      { id: 'mock-est-3', empresa_id: 'mock-empresa-2', denominacion: 'Único', direccion: 'Ruta 8 Km 54' }
    ]);
    setRegistrosList([
      { id: 'mock-reg-1', nombre: 'Relevamiento General de Riesgos Laborales' },
      { id: 'mock-reg-2', nombre: 'Relevamiento de Agentes de Riesgos' },
      { id: 'mock-reg-3', nombre: 'Declaración jurada para informar la presencia de Sustancias y Agentes Cancerígenos (S.V.C.C.)' },
      { id: 'mock-reg-4', nombre: 'Constancia de visita' },
      { id: 'mock-reg-5', nombre: 'Anexo - Resolución 85/12 (Protocolo de ruido)' },
      { id: 'mock-reg-6', nombre: 'Estudio de ruido' }
    ]);
    setDocuments([
      {
        id: 'mock-doc-1',
        empresa_id: 'mock-empresa-1',
        establecimiento_id: 'mock-est-1',
        categoria: 'ART',
        subcategoria: 'Relevamiento General de Riesgos Laborales (RGRL)',
        documento_nombre: 'Relevamiento General de Riesgos Laborales',
        fecha: '2026-06-10',
        documento_url: 'mock-pdf-url',
        created_at: '2026-06-10T15:00:00Z'
      },
      {
        id: 'mock-doc-2',
        empresa_id: 'mock-empresa-1',
        establecimiento_id: 'mock-est-1',
        categoria: 'Estudios y mediciones',
        subcategoria: 'Ruido',
        documento_nombre: 'Anexo - Resolución 85/12 (Protocolo de ruido)',
        fecha: '2026-06-12',
        documento_url: 'mock-pdf-url',
        created_at: '2026-06-12T15:00:00Z'
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

      const { data: ten, error: tErr } = await supabase
        .from('tenants')
        .select('*')
        .eq('slug', tenantSlug)
        .single();

      if (tErr || !ten) {
        window.location.href = '/login';
        return;
      }

      setTenant(ten);

      // Cargar Empresas
      let empresasQuery = supabase
        .from('empresas')
        .select('id, razon_social, cuit')
        .eq('tenant_id', ten.id);
      if (prof.role === 'cliente') {
        empresasQuery = empresasQuery.eq('id', prof.empresa_id);
      }
      const { data: emps, error: empErr } = await empresasQuery.order('razon_social');
      if (empErr) throw empErr;
      setEmpresas(emps || []);

      // Cargar Establecimientos
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

      // Cargar Catálogo de Registros
      const { data: regs, error: regsErr } = await supabase
        .from('registros')
        .select('id, nombre')
        .order('nombre');
      if (regsErr) throw regsErr;
      setRegistrosList(regs || []);

      // Cargar Documentos del Legajo
      let docsQuery = supabase
        .from('legajo_tecnico')
        .select('*')
        .eq('tenant_id', ten.id);
      if (prof.role === 'cliente') {
        docsQuery = docsQuery.eq('empresa_id', prof.empresa_id);
      }
      const { data: docs, error: docsErr } = await docsQuery.order('fecha', { ascending: false });
      if (docsErr) throw docsErr;

      // Recopilar paths de Supabase para firmar en lote (en una sola llamada de red)
      const pathsToSign = [];
      (docs || []).forEach(d => {
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
          console.error('Error al firmar URLs de legajo en lote:', e);
        }
      }

      const resolvedDocs = (docs || []).map(d => {
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

      setDocuments(resolvedDocs);

      setLoading(false);
    } catch (err) {
      console.error('Error cargando datos:', err);
      triggerToast('Error al conectar con la base de datos.', 'error');
      setIsDevMode(true);
      loadMockData();
    }
  };

  const handleLogout = async () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('user-profile');
    }
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  // Nivel de navegación en Breadcrumbs
  const navigateToRoot = () => {
    setCurrentFolder(null);
    setCurrentSubfolder(null);
  };

  const navigateToFolder = (folder) => {
    setCurrentFolder(folder);
    setCurrentSubfolder(null);
  };

  // Cantidad de archivos en carpetas para badges
  const getFileCountForFolder = (folder) => {
    let list = documents;
    if (profile?.role === 'cliente') {
      list = documents.filter(d => d.empresa_id === profile.empresa_id);
    }
    return list.filter(d => d.categoria === folder.name).length;
  };

  const getFileCountForSubfolder = (folder, subfolder) => {
    let list = documents;
    if (profile?.role === 'cliente') {
      list = documents.filter(d => d.empresa_id === profile.empresa_id);
    }
    return list.filter(d => d.categoria === folder.name && d.subcategoria === subfolder.name).length;
  };

  const handleFileChange = (file) => {
    setDocumentoFile(file);
    setSelectedFileName(file ? file.name : '');
  };

  // Inicializar nuevo registro
  const handleAddNew = () => {
    if (!currentFolder) return;
    
    setIsReadOnlyView(false);
    setEditingId(null);
    setEmpresaId(profile?.role === 'cliente' ? profile.empresa_id : '');
    setEstablecimientoId('');
    setFecha(formatDate(new Date().toISOString().split('T')[0]));
    setDocumentoFile(null);
    setDocumentoUrl('');
    setDocumentoCustom('');
    setSelectedFileName('');
    setFotosFiles([]);

    // Pre-seleccionar documento si es único de la subcarpeta
    const subName = currentSubfolder?.name || null;
    const catName = currentFolder.name;
    const matchedFolder = LEGAJO_FOLDERS.find(f => f.name === catName);
    
    let defaultDocName = '';
    if (subName) {
      const matchedSub = matchedFolder?.subfolders?.find(s => s.name === subName);
      if (matchedSub && matchedSub.docTypes.length > 0) {
        defaultDocName = matchedSub.docTypes[0];
      }
    } else {
      if (matchedFolder && matchedFolder.docTypes && matchedFolder.docTypes.length > 0) {
        defaultDocName = matchedFolder.docTypes[0];
      }
    }

    const regMatch = registrosList.find(r => r.nombre.toLowerCase() === defaultDocName.toLowerCase());
    if (regMatch) {
      setRegistroId(regMatch.id);
      setDocumentoNombre(regMatch.nombre);
    } else if (defaultDocName) {
      setRegistroId('__custom__');
      setDocumentoNombre('__custom__');
      setDocumentoCustom(defaultDocName);
    } else {
      setRegistroId('');
      setDocumentoNombre('');
    }

    setIsFormOpen(true);
  };

  const handleExitForm = () => {
    if (isReadOnlyView) {
      handleCloseForm();
      return;
    }
    setModalAlert({
      show: true,
      title: 'Salir sin guardar',
      message: '¿Estás seguro de que deseas salir del formulario? Perderás todos los cambios cargados que no se hayan guardado.',
      type: 'warning',
      confirmText: 'Confirmar',
      onConfirm: () => {
        handleCloseForm();
        closeAlert();
      }
    });
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingId(null);
    setEmpresaId('');
    setEstablecimientoId('');
    setRegistroId('');
    setDocumentoNombre('');
    setDocumentoCustom('');
    setFecha('');
    setDocumentoFile(null);
    setDocumentoUrl('');
    setSelectedFileName('');
    setFotosFiles([]);
  };

  const handleEditClick = async (doc, forceReadOnly = false) => {
    setIsReadOnlyView(forceReadOnly || profile?.role === 'cliente');
    setEditingId(doc.id);
    setEmpresaId(doc.empresa_id);
    setEstablecimientoId(doc.establecimiento_id || '');
    setFecha(formatDate(doc.fecha) || '');
    
    const regMatch = registrosList.find(r => r.nombre === doc.documento_nombre);
    if (regMatch) {
      setRegistroId(regMatch.id);
      setDocumentoNombre(regMatch.nombre);
      setDocumentoCustom('');
    } else {
      setRegistroId('__custom__');
      setDocumentoNombre('__custom__');
      setDocumentoCustom(doc.documento_nombre);
    }

    setDocumentoUrl(doc.documento_url);
    setDocumentoFile(null);
    setSelectedFileName(doc.documento_url ? (doc.documento_url.startsWith('http') ? 'Enlace de Google Drive' : 'Archivo PDF existente') : '');
    
    // Cargar fotos guardadas
    const loadedFotos = (doc.fotos_paths || []).map((ppath, idx) => ({
      file: null,
      preview: doc.fotos_urls?.[idx] || '',
      path: ppath
    })).filter(f => f.preview !== '');
    setFotosFiles(loadedFotos);

    setIsFormOpen(true);
  };

  const handleDelete = async (id) => {
    setModalAlert({
      show: true,
      title: 'Eliminar Registro',
      message: '¿Estás seguro de que deseas eliminar permanentemente este registro del legajo técnico?',
      type: 'warning',
      confirmText: 'Eliminar',
      onConfirm: async () => {
        closeAlert();
        setSaving(true);
        try {
          if (isDevMode) {
            setDocuments(prev => prev.filter(d => d.id !== id));
          } else {
            const { error } = await supabase
              .from('legajo_tecnico')
              .delete()
              .eq('id', id);
            if (error) throw error;
          }
          triggerToast('¡Registro eliminado con éxito!', 'success');
          handleCloseForm();
          await loadRealData();
        } catch (err) {
          console.error(err);
          triggerToast('Error al eliminar el registro.', 'error');
        } finally {
          setSaving(false);
        }
      }
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();

    if (!empresaId) {
      triggerToast('La razón social es obligatoria.', 'error');
      return;
    }
    if (!fecha) {
      triggerToast('La fecha es obligatoria.', 'error');
      return;
    }
    
    let finalDocName = '';
    if (registroId === '__custom__') {
      finalDocName = documentoCustom.trim();
    } else {
      const matchedReg = registrosList.find(r => r.id === registroId);
      finalDocName = matchedReg ? matchedReg.nombre : '';
    }

    if (!finalDocName) {
      triggerToast('El nombre de documento es obligatorio.', 'error');
      return;
    }

    if (!documentoUrl && !documentoFile && fotosFiles.length === 0) {
      triggerToast('Debes adjuntar un archivo PDF, ingresar un enlace de Google Drive o cargar imágenes de evidencia.', 'error');
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
            const filePath = `${profile.id}/legajo_img_${Date.now()}_${i}.${fileExt}`;
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
      if (documentoFile) {
        if (isDevMode) {
          finalDocUrl = 'mock-uploaded-pdf-path';
        } else {
          const fileExt = 'pdf';
          const fileId = editingId || crypto.randomUUID();
          const filePath = `${profile.id}/legajo_${fileId}.${fileExt}`;

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

      const dataPayload = {
        tenant_id: isDevMode ? 'mock-tenant' : tenant.id,
        empresa_id: empresaId,
        establecimiento_id: establecimientoId || null,
        categoria: currentFolder.name,
        subcategoria: currentSubfolder?.name || null,
        documento_nombre: finalDocName,
        fecha: convertToDbDate(fecha) || null,
        documento_url: finalDocUrl,
        imagen_url: finalImagenUrlVal,
        updated_at: new Date().toISOString()
      };

      const mockResolvedUrls = finalImagenPaths;

      if (editingId) {
        if (isDevMode) {
          setDocuments(prev => prev.map(d => d.id === editingId ? { 
            ...d, 
            ...dataPayload,
            fotos_paths: finalImagenPaths,
            fotos_urls: mockResolvedUrls
          } : d));
        } else {
          const { error } = await supabase
            .from('legajo_tecnico')
            .update(dataPayload)
            .eq('id', editingId);
          if (error) throw error;
        }
        triggerToast('¡Registro actualizado con éxito!', 'success');
      } else {
        if (isDevMode) {
          const newDoc = {
            id: 'mock-new-' + Date.now(),
            ...dataPayload,
            fotos_paths: finalImagenPaths,
            fotos_urls: mockResolvedUrls,
            created_at: new Date().toISOString()
          };
          setDocuments(prev => [newDoc, ...prev]);
        } else {
          const { error } = await supabase
            .from('legajo_tecnico')
            .insert([dataPayload]);
          if (error) throw error;
        }
        triggerToast('¡Registro cargado con éxito!', 'success');
      }

      handleCloseForm();
      await loadRealData();
    } catch (err) {
      console.error(err);
      triggerToast(err.message || 'Error al guardar el registro.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleViewPdf = async (url) => {
    if (!url || url === 'N/A') return;
    if (url.startsWith('http://') || url.startsWith('https://')) {
      window.open(url, '_blank');
    } else {
      if (isDevMode) {
        triggerToast('Vista previa no disponible en modo desarrollo local.', 'info');
      } else {
        try {
          const { data, error } = await supabase.storage
            .from('documents')
            .createSignedUrl(url, 3600);
          if (error) throw error;
          window.open(data.signedUrl, '_blank');
        } catch (e) {
          console.error(e);
          triggerToast('Error al abrir el PDF.', 'error');
        }
      }
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

  const handleSidebarNavigation = (e, path) => {
    if (isFormOpen) {
      if (isReadOnlyView) {
        if (path.endsWith('/legajo')) {
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
        type: 'warning',
        confirmText: 'Confirmar',
        onConfirm: () => {
          closeAlert();
          if (path.endsWith('/legajo')) {
            handleCloseForm();
          } else {
            window.location.href = path;
          }
        }
      });
    }
  };

  // Filtrado de documentos en la carpeta/subcarpeta activa
  const filteredDocuments = documents.filter((doc) => {
    if (!currentFolder) return false;
    
    // Validar categoría
    if (doc.categoria !== currentFolder.name) return false;
    
    // Validar subcategoría si tiene
    if (currentFolder.subfolders) {
      if (!currentSubfolder || doc.subcategoria !== currentSubfolder.name) return false;
    }

    // Filtrado por CUIT/Cliente (para rol cliente)
    if (profile?.role === 'cliente' && doc.empresa_id !== profile.empresa_id) return false;

    // Filtros de búsqueda
    if (filterEmpresa && doc.empresa_id !== filterEmpresa) return false;
    if (filterEstablecimiento && doc.establecimiento_id !== filterEstablecimiento) return false;
    if (filterFecha && doc.fecha !== filterFecha) return false;
    if (filterAnio && doc.fecha.substring(0, 4) !== filterAnio) return false;
    if (filterMes && doc.fecha.substring(5, 7) !== filterMes) return false;

    if (filterText) {
      const txt = filterText.toLowerCase();
      const emp = empresas.find(e => e.id === doc.empresa_id);
      const est = allEstablecimientos.find(es => es.id === doc.establecimiento_id);
      
      const matchText = (
        doc.documento_nombre.toLowerCase().includes(txt) ||
        (emp && emp.razon_social.toLowerCase().includes(txt)) ||
        (est && est.denominacion.toLowerCase().includes(txt)) ||
        doc.fecha.includes(txt)
      );
      if (!matchText) return false;
    }

    return true;
  });



  // Ordenamiento de documentos
  const sortedDocuments = [...filteredDocuments].sort((a, b) => {
    if (!sortField) return 0;
    let valA = a[sortField];
    let valB = b[sortField];

    if (sortField === 'cliente') {
      const empA = empresas.find(e => e.id === a.empresa_id);
      const empB = empresas.find(e => e.id === b.empresa_id);
      valA = empA ? empA.razon_social.toLowerCase() : '';
      valB = empB ? empB.razon_social.toLowerCase() : '';
    } else if (sortField === 'establecimiento') {
      const estA = allEstablecimientos.find(es => es.id === a.establecimiento_id);
      const estB = allEstablecimientos.find(es => es.id === b.establecimiento_id);
      valA = estA ? estA.denominacion.toLowerCase() : '';
      valB = estB ? estB.denominacion.toLowerCase() : '';
    } else if (sortField === 'documento_nombre') {
      valA = (a.documento_nombre || '').toLowerCase();
      valB = (b.documento_nombre || '').toLowerCase();
    } else if (sortField === 'fecha') {
      valA = a.fecha || '';
      valB = b.fecha || '';
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

  const yearsOptions = getAvailableYears(documents);


  return (
    <div className="h-screen overflow-hidden bg-syso-bg text-slate-700 flex font-sans">
      
      {/* Sidebar (Desktop & Mobile) */}
      <Sidebar
        tenantSlug={tenantSlug}
        profile={profile}
        currentSection="legajo"
        isSidebarCollapsed={isSidebarCollapsed}
        toggleSidebar={toggleSidebar}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
        handleLogout={handleLogout}
        onNavigate={handleSidebarNavigation}
      />

      {/* CONTAINER PRINCIPAL */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        
        {/* Cabecera */}
        <AppPageHeader
          title="Legajo Técnico"
          icon={FolderOpen}
          tenantName={tenant?.name || 'Cargando...'}
          planId={tenant?.plan_id}
          showPlanBadge={profile && profile.role !== 'cliente'}
          setIsMobileMenuOpen={setIsMobileMenuOpen}
        />

        {loading ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-[#468DFF] mx-auto" />
              <p className="text-xs text-slate-500 font-semibold">Cargando legajo técnico...</p>
            </div>
          </div>
        ) : (
          <div className="max-w-[95%] mx-auto w-full py-8 px-4 md:px-0 flex-1 flex flex-col min-h-0">
            
            {isFormOpen ? (
              // FORMULARIO DE CARGA/EDICIÓN INLINE
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
                      {editingId ? 'Editar Registro' : 'Cargar Registro al Legajo'}
                    </span>
                  </div>
                  <button type="button" onClick={handleExitForm} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-200 cursor-pointer">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <form onSubmit={handleSave} className="p-6 space-y-6 overflow-y-auto flex-1 scrollbar-thin">
                  <fieldset disabled={!canEdit} className="space-y-6">
                    
                    {/* Ubicación de Carpeta Destino */}
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-2 text-xs font-bold text-slate-600">
                      <Folder className="h-4 w-4 text-[#468DFF]" />
                      <span>Destino:</span>
                      <span className="text-slate-900">{currentFolder?.name}</span>
                      {currentSubfolder && (
                        <>
                          <ChevronRight className="h-3 w-3 text-slate-400" />
                          <span className="text-slate-900">{currentSubfolder?.name}</span>
                        </>
                      )}
                    </div>

                    {/* Razón Social y Establecimiento */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold text-slate-600 block mb-1.5">
                          Cliente / Razón Social <span className="text-[#468DFF]">*</span>
                        </label>
                        <select
                          required
                          value={empresaId}
                          onChange={(e) => {
                            setEmpresaId(e.target.value);
                            setEstablecimientoId('');
                          }}
                          disabled={profile?.role === 'cliente'}
                          className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all cursor-pointer disabled:opacity-80"
                        >
                          <option value="">Selecciona un cliente</option>
                          {empresas.map(e => (
                            <option key={e.id} value={e.id}>{e.razon_social}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-600 block mb-1.5">
                          Establecimiento <span className="text-[#468DFF]">*</span>
                        </label>
                        <select
                          value={establecimientoId}
                          onChange={(e) => setEstablecimientoId(e.target.value)}
                          disabled={!empresaId}
                          className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all cursor-pointer disabled:opacity-50"
                        >
                          <option value="">Selecciona un establecimiento</option>
                          {allEstablecimientos.filter(est => est.empresa_id === empresaId).map(e => (
                            <option key={e.id} value={e.id}>{e.denominacion}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Documento / Tipo de Registro */}
                    <div>
                      <label className="text-xs font-bold text-slate-600 block mb-1.5">
                        Tipo de Registro / Documento <span className="text-[#468DFF]">*</span>
                      </label>
                      <select
                        required
                        value={registroId}
                        onChange={(e) => {
                          setRegistroId(e.target.value);
                          if (e.target.value === '__custom__') {
                            setDocumentoNombre('__custom__');
                          } else {
                            const r = registrosList.find(reg => reg.id === e.target.value);
                            setDocumentoNombre(r ? r.nombre : '');
                          }
                        }}
                        className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all cursor-pointer mb-2"
                      >
                        <option value="">-- Selecciona un tipo de registro --</option>
                        {registrosList.map(r => (
                          <option key={r.id} value={r.id}>{r.nombre}</option>
                        ))}
                        <option value="__custom__">Otro (ingreso manual)...</option>
                      </select>

                      {registroId === '__custom__' && (
                        <input
                          type="text"
                          required
                          placeholder="Escribe el nombre del documento..."
                          value={documentoCustom}
                          onChange={(e) => setDocumentoCustom(e.target.value)}
                          className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all"
                        />
                      )}
                    </div>

                    {/* Fecha */}
                    <div>
                      <label className="text-xs font-bold text-slate-600 block mb-1.5">
                        Fecha del Registro <span className="text-[#468DFF]">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="DD/MM/YYYY"
                          maxLength={10}
                          value={fecha}
                          onChange={(e) => setFecha(formatAsDateInput(e.target.value))}
                          required
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
                  </fieldset>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Documento de Respaldo */}
                    <div>
                      <DocumentUploadZone
                        label="Archivo o Enlace del Documento"
                        file={documentoFile}
                        fileName={selectedFileName}
                        url={documentoUrl}
                        onFileChange={handleFileChange}
                        onDriveImportSuccess={(filePath) => {
                          setDocumentoUrl(filePath);
                          setSelectedFileName('Archivo de Drive importado');
                        }}
                        onViewPdf={handleViewPdf}
                        onDelete={() => {
                          setDocumentoUrl('');
                          setDocumentoFile(null);
                          setSelectedFileName('');
                        }}
                        disabled={!canEdit}
                        tenantId={tenant?.id}
                        onToast={triggerToast}
                      />
                    </div>

                    {/* Imagen / Evidencia Fotográfica */}
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
                            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-bold transition-all active:scale-[0.98] cursor-pointer shadow-lg"
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
                              className="px-5 py-2.5 bg-[#468DFF] hover:bg-[#0511F2] text-white rounded-xl text-sm font-bold flex items-center gap-2 transition-all active:scale-[0.98] cursor-pointer shadow-lg disabled:opacity-50"
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
               // VISTA DEL EXPLORADOR
              <div className="space-y-4 flex-1 flex flex-col min-h-0">
                
                {/* Navegación Breadcrumbs (Migas de Pan) */}
                <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-sm flex items-center gap-2 text-xs font-semibold text-slate-500 select-none">
                  <button
                    onClick={navigateToRoot}
                    className="hover:text-[#468DFF] cursor-pointer flex items-center gap-1 transition-colors"
                  >
                    <Archive className="h-4 w-4 text-[#468DFF]" />
                    <span>Legajo Técnico</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowIndexModal(true)}
                    className="p-1 rounded-lg text-slate-400 hover:text-[#468DFF] hover:bg-slate-50 transition-all cursor-pointer shrink-0 flex items-center justify-center"
                    title="Ver índice de carpetas"
                  >
                    <HelpCircle className="h-3.5 w-3.5" />
                  </button>

                  {currentFolder && (
                    <>
                      <ChevronRight className="h-3 w-3 text-slate-400" />
                      <button
                        onClick={() => navigateToFolder(currentFolder)}
                        className={`hover:text-[#468DFF] cursor-pointer transition-colors ${!currentSubfolder ? 'text-slate-900 font-bold' : ''}`}
                      >
                        {currentFolder.name}
                      </button>
                    </>
                  )}

                  {currentFolder && currentSubfolder && (
                    <>
                      <ChevronRight className="h-3 w-3 text-slate-400" />
                      <span className="text-slate-900 font-bold">
                        {currentSubfolder.name}
                      </span>
                    </>
                  )}
                </div>

                {/* 1. VISTA DE RAÍZ: MUESTRA LAS CARPETAS PRINCIPALES */}
                {!currentFolder && (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {LEGAJO_FOLDERS.map((folder) => {
                        const fileCount = getFileCountForFolder(folder);
                        return (
                          <div
                            key={folder.id}
                            onClick={() => navigateToFolder(folder)}
                            className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md hover:border-[#468DFF]/40 cursor-pointer transition-all flex flex-col justify-between group"
                          >
                            <div className="flex items-center gap-4">
                              <div className="p-3.5 rounded-xl bg-slate-100 text-[#468DFF] group-hover:bg-[#468DFF]/10 transition-colors shrink-0">
                                <FolderIconHelper name={folder.icon} className="h-6 w-6" />
                              </div>
                              <div className="min-w-0">
                                <h3 className="font-bold text-slate-900 text-sm leading-tight truncate group-hover:text-[#468DFF] transition-colors">
                                  {folder.name}
                                </h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mt-1">
                                  {folder.subfolders ? `${folder.subfolders.length} subcarpetas` : 'Carpeta directa'}
                                </p>
                              </div>
                            </div>
                            <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-400">
                              <span>Total registros</span>
                              <span className="font-bold text-slate-700 bg-slate-100 py-0.5 px-2 rounded-full text-[10px]">
                                {fileCount}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="h-8 w-full shrink-0" />
                  </>
                )}

                {/* 2. VISTA DE CARPETA CON SUBCARPETAS */}
                {currentFolder && currentFolder.subfolders && !currentSubfolder && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={navigateToRoot}
                        className="px-3 py-1.5 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 text-xs font-bold transition-all cursor-pointer text-slate-600 flex items-center gap-1 shrink-0"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Atrás
                      </button>
                      <h2 className="font-outfit text-sm font-bold text-slate-500 uppercase tracking-wider">
                        Subcarpetas de {currentFolder.name}
                      </h2>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {currentFolder.subfolders.map((sub) => {
                        const fileCount = getFileCountForSubfolder(currentFolder, sub);
                        return (
                          <div
                            key={sub.id}
                            onClick={() => setCurrentSubfolder(sub)}
                            className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md hover:border-[#468DFF]/40 cursor-pointer transition-all flex flex-col justify-between group"
                          >
                            <div className="flex items-center gap-4">
                              <div className="p-3.5 rounded-xl bg-slate-100 text-[#468DFF] group-hover:bg-[#468DFF]/10 transition-colors shrink-0">
                                <Folder className="h-6 w-6" />
                              </div>
                              <div className="min-w-0">
                                <h3 className="font-bold text-slate-900 text-xs leading-snug group-hover:text-[#468DFF] transition-colors">
                                  {sub.name}
                                </h3>
                              </div>
                            </div>
                            <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-400">
                              <span>Registros</span>
                              <span className="font-bold text-slate-700 bg-slate-100 py-0.5 px-2 rounded-full text-[10px]">
                                {fileCount}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="h-8 w-full shrink-0" />
                  </div>
                )}

                {/* 3. VISTA DE ARCHIVOS (TABLA DE REGISTROS) */}
                {currentFolder && (!currentFolder.subfolders || currentSubfolder) && (
                  <div className="space-y-4 flex-1 flex flex-col min-h-0">

                    {/* Herramientas, Búsqueda y Filtros */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-sm space-y-3 shrink-0">

                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
                        
                        {/* Botón Atrás e información de la carpeta activa (arriba a la izquierda) */}
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <button
                            onClick={() => {
                              if (currentSubfolder) {
                                setCurrentSubfolder(null);
                              } else {
                                setCurrentFolder(null);
                              }
                            }}
                            className="px-3 py-1.5 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 text-xs font-bold transition-all cursor-pointer text-slate-600 flex items-center gap-1 shrink-0 shadow-sm"
                          >
                            <ChevronLeft className="h-4 w-4" />
                            Atrás
                          </button>
                          <h2 className="font-outfit text-sm font-bold text-slate-800 truncate" title={currentSubfolder ? currentSubfolder.name : currentFolder.name}>
                            Registros de: {currentSubfolder ? currentSubfolder.name : currentFolder.name}
                          </h2>
                        </div>

                        {/* Buscador */}
                        <div className="flex flex-col md:flex-row md:items-center gap-2 w-full lg:w-auto">
                          <div className="relative w-full md:w-64">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
                            <input
                              type="text"
                              placeholder="Buscar por documento, cliente..."
                              value={filterText}
                              onChange={(e) => setFilterText(e.target.value)}
                              className="w-full pl-9 pr-3.5 py-1.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all text-slate-700 placeholder-slate-400"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Filtros avanzados colapsables */}
                      <div className="pt-1.5 border-t border-slate-100 space-y-2">
                        <div className="flex items-center justify-between">
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

                          {canCargar && (
                            <button
                              onClick={handleAddNew}
                              className="px-3 py-1.5 bg-[#468DFF] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-[#0511F2] transition-all cursor-pointer shadow-md shadow-[#468DFF]/10 shrink-0 text-center"
                            >
                              <PlusCircle className="h-3.5 w-3.5" />
                              Cargar Registro
                            </button>
                          )}
                        </div>

                        {showFilters && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 pt-1 animate-fade-in">
                            
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
                                   disabled={profile?.role === 'cliente'}
                                   className="border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-600 focus:outline-none focus:border-[#468DFF] text-xs w-full cursor-pointer disabled:opacity-85"
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
                                {yearsOptions.map(y => (
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

                    {/* Tabla de Documentos */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col transition-all duration-300 ease-in-out" style={{ height: showFilters ? 'calc(100vh - 370px)' : 'calc(100vh - 300px)' }}>
                      {sortedDocuments.length === 0 ? (
                        <AppEmptyState
                          title={documents.length === 0 ? "No hay documentos registrados" : "No se encontraron documentos"}
                          description={documents.length === 0 ? "Registra un nuevo documento para comenzar." : "Probá modificando los filtros de búsqueda o registrá un nuevo documento."}
                          actionButton={
                            documents.length === 0 ? (
                              canCargar && (
                                <AppButton
                                  onClick={handleAddNew}
                                  variant="primary"
                                  size="sm"
                                  className="shadow-md shadow-[#468DFF]/10 flex items-center gap-1.5"
                                >
                                  <PlusCircle className="h-3.5 w-3.5" />
                                  Registrar el primero
                                </AppButton>
                              )
                            ) : (
                              (filterText || filterEmpresa || filterEstablecimiento || filterFecha || filterAnio || filterMes) && (
                                <AppButton
                                  onClick={() => {
                                    setFilterText('');
                                    setFilterEmpresa('');
                                    setFilterEstablecimiento('');
                                    setFilterFecha('');
                                    setFilterAnio('');
                                    setFilterMes('');
                                  }}
                                  variant="secondary"
                                  size="sm"
                                  className="border border-slate-200 text-slate-600 font-semibold bg-white"
                                >
                                  Limpiar Filtros
                                </AppButton>
                              )
                            )
                          }
                        />
                      ) : (
                        <div className="overflow-auto flex-grow">
                          <table className="w-full text-left border-collapse min-w-[800px]">
                            <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-400 uppercase tracking-wider select-none">
                              <th className="px-6 py-4 cursor-pointer hover:text-slate-700 sticky top-0 z-10 bg-slate-50 border-b border-slate-200 transition-colors" onClick={() => handleSort('cliente')}>
                                <div className="flex items-center gap-1">
                                  Razón Social
                                  {sortField === 'cliente' && (sortOrder === 'asc' ? ' ▲' : ' ▼')}
                                </div>
                              </th>
                              <th className="px-6 py-4 cursor-pointer hover:text-slate-700 sticky top-0 z-10 bg-slate-50 border-b border-slate-200 transition-colors" onClick={() => handleSort('establecimiento')}>
                                <div className="flex items-center gap-1">
                                  Establecimiento
                                  {sortField === 'establecimiento' && (sortOrder === 'asc' ? ' ▲' : ' ▼')}
                                </div>
                              </th>
                              <th className="px-6 py-4 cursor-pointer hover:text-slate-700 sticky top-0 z-10 bg-slate-50 border-b border-slate-200 transition-colors" onClick={() => handleSort('documento_nombre')}>
                                <div className="flex items-center gap-1">
                                  Documento / Tipo
                                  {sortField === 'documento_nombre' && (sortOrder === 'asc' ? ' ▲' : ' ▼')}
                                </div>
                              </th>
                              <th className="px-6 py-4 cursor-pointer hover:text-slate-700 sticky top-0 z-10 bg-slate-50 border-b border-slate-200 transition-colors" onClick={() => handleSort('fecha')}>
                                <div className="flex items-center gap-1">
                                  Fecha
                                  {sortField === 'fecha' && (sortOrder === 'asc' ? ' ▲' : ' ▼')}
                                </div>
                              </th>
                              <th className="px-6 py-4 text-right sticky top-0 z-10 bg-slate-50 border-b border-slate-200">Acciones</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-xs font-normal text-slate-700">
                            {sortedDocuments.map((doc) => {
                              const emp = empresas.find(e => e.id === doc.empresa_id);
                              const est = allEstablecimientos.find(es => es.id === doc.establecimiento_id);
                              return (
                                <tr
                                  key={doc.id}
                                  className="hover:bg-slate-100 cursor-pointer transition-colors"
                                  onClick={() => handleEditClick(doc, true)}
                                >
                                  <td className="px-6 py-4 font-semibold text-slate-900">
                                    {emp ? emp.razon_social : 'Desconocido'}
                                  </td>
                                  <td className="px-6 py-4 font-medium text-slate-600">
                                    {est ? est.denominacion : 'N/A'}
                                  </td>
                                  <td className="px-6 py-4 font-semibold text-slate-600 text-xs">
                                    {doc.documento_nombre}
                                  </td>
                                  <td className="px-6 py-4 font-mono text-xs text-slate-500 font-semibold">
                                    {formatDate(doc.fecha)}
                                  </td>
                                  <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                                    <div className="flex items-center justify-end gap-2">
                                      {doc.documento_url && (
                                        <>
                                          <button
                                            onClick={() => handleViewPdf(doc.documento_url)}
                                            className="p-1.5 rounded-lg bg-blue-50 text-[#468DFF] hover:bg-blue-100 hover:text-[#0511F2] transition-all cursor-pointer inline-flex items-center justify-center shadow-sm"
                                            title="Visualizar PDF"
                                          >
                                            <FileText className="h-4.5 w-4.5" />
                                          </button>
                                          {!doc.documento_url.startsWith('http') && (
                                            <button
                                              onClick={() => handleDownloadPdf(doc.documento_url, `${doc.documento_nombre}.pdf`)}
                                              className="p-1.5 rounded-lg bg-blue-50 text-[#468DFF] hover:bg-blue-100 hover:text-[#0511F2] transition-all cursor-pointer inline-flex items-center justify-center shadow-sm"
                                              title="Descargar PDF"
                                            >
                                              <Download className="h-4.5 w-4.5" />
                                            </button>
                                          )}
                                        </>
                                      )}
                                      {doc.fotos_paths && doc.fotos_paths.length > 0 && (
                                        <button
                                          onClick={() => handleEditClick(doc, true)}
                                          className="p-1.5 rounded-lg bg-[#EFF6FF] text-[#468DFF] hover:bg-[#DBEAFE] hover:text-[#0511F2] transition-all cursor-pointer inline-flex items-center justify-center shadow-sm"
                                          title={`Visualizar Evidencia (${doc.fotos_paths.length} ${doc.fotos_paths.length === 1 ? 'imagen' : 'imágenes'})`}
                                        >
                                          <Image className="h-4.5 w-4.5" />
                                        </button>
                                      )}
                                      {canEditar && (
                                        <button
                                          onClick={() => handleEditClick(doc, false)}
                                          className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-600 transition-all cursor-pointer inline-flex items-center justify-center shadow-sm"
                                          title="Editar detalles"
                                        >
                                          <Edit className="h-4.5 w-4.5" />
                                        </button>
                                      )}
                                      {canEliminar && (
                                        <button
                                          onClick={() => handleDelete(doc.id)}
                                          className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition-all cursor-pointer inline-flex items-center justify-center shadow-sm"
                                          title="Eliminar"
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


                  </div>
                )}

              </div>
            )}

          </div>
        )}

      </main>

      {/* TOAST ALERTS removidos - consumidos globalmente */}

      {/* MODAL DE ALERTA GENERAL */}
      {modalAlert.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xl max-w-sm w-full animate-scale-up space-y-4 text-center">
            {modalAlert.type === 'warning' && (
              <div className="mx-auto p-3 rounded-full w-12 h-12 flex items-center justify-center bg-amber-50 text-amber-500">
                <AlertTriangle className="h-6 w-6" />
              </div>
            )}
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
                {modalAlert.onConfirm ? 'Cancelar' : 'Entendido'}
              </button>
              {modalAlert.onConfirm && (
                <button
                  type="button"
                  onClick={modalAlert.onConfirm}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all active:scale-[0.98] cursor-pointer shadow-lg shadow-red-600/10"
                >
                  {modalAlert.confirmText || 'Confirmar'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL DEL ÍNDICE DE CARPETAS Y SUBCARPETAS */}
      {showIndexModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xl max-w-2xl w-full animate-scale-up flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-[#468DFF]" />
                <h3 className="font-outfit text-base md:text-lg font-bold text-slate-900">
                  Índice de Carpetas y Subcarpetas
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowIndexModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-y-auto py-4 flex-1 space-y-4 pr-1 scrollbar-thin">
              <p className="text-xs text-slate-500">
                A continuación se detalla la estructura jerárquica de carpetas y subcarpetas definida para el Legajo Técnico de la plataforma:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {LEGAJO_FOLDERS.map((folder) => (
                  <div key={folder.id} className="border border-slate-200 rounded-xl p-3 bg-slate-50/50">
                    <div className="flex items-center gap-2 font-bold text-slate-900 text-xs">
                      <FolderIconHelper name={folder.icon} className="h-4 w-4 text-[#468DFF] shrink-0" />
                      <span>{folder.name}</span>
                    </div>
                    {folder.subfolders ? (
                      <ul className="mt-1.5 pl-6 space-y-1 list-disc text-slate-600 text-[11px]">
                        {folder.subfolders.map((sub) => (
                          <li key={sub.id} className="leading-snug">
                            {sub.name}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-1 pl-6 text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                        Carpeta Directa
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 shrink-0 flex justify-end">
              <button
                type="button"
                onClick={() => setShowIndexModal(false)}
                className="px-5 py-2.5 bg-[#468DFF] hover:bg-[#0511F2] text-white rounded-xl text-xs font-bold transition-all active:scale-[0.98] cursor-pointer shadow-md"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      <AppFormNavigator
        activeList={sortedDocuments}
        currentId={editingId}
        onNavigate={(newDoc) => handleEditClick(newDoc, isReadOnlyView)}
        hasUnsavedChanges={checkHasUnsavedChanges()}
        isFormOpen={isFormOpen}
      />

    </div>
  );
}
