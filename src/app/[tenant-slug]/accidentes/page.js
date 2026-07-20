// src/app/[tenant-slug]/accidentes/page.js
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import DocumentUploadZone from '@/components/ui/DocumentUploadZone';
import AITextHelper from '@/components/ui/AITextHelper';
import ImageUploadZone from '@/components/ui/ImageUploadZone';
import { supabase, fetchAllGeography } from '@/lib/supabase';
import { useToast } from '@/components/providers/ToastProvider';
import AppPageHeader from '@/components/ui/AppPageHeader';
import AppButton from '@/components/ui/AppButton';
import AppInput from '@/components/ui/AppInput';
import AppSelect from '@/components/ui/AppSelect';
import AppTextarea from '@/components/ui/AppTextarea';
import AppConfirmDialog from '@/components/ui/AppConfirmDialog';
import AppCard from '@/components/ui/AppCard';
import AppEmptyState from '@/components/ui/AppEmptyState';
import { formatDate, formatAsDateInput, convertToDbDate } from '@/lib/utils';
import {
  ShieldAlert,
  HelpCircle,
  AlertTriangle,
  AlertCircle,
  Upload,
  X,
  Loader2,
  PlusCircle,
  Search,
  Sliders,
  Trash2,
  Edit,
  ChevronDown,
  ChevronUp,
  Menu,
  Building,
  Users,
  Calendar,
  FileText,
  Eye,
  Download,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Check,
  ExternalLink,
  Clock,
  Activity,
  Sparkles,
  Image as ImageIcon,
  Save,
  PenTool
} from 'lucide-react';

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// ── Constantes estáticas ────────────────────────────────────────────────────
const PROVINCIAS_ARGENTINAS = [
  'BUENOS AIRES',
  'CATAMARCA',
  'CHACO',
  'CHUBUT',
  'CORRIENTES',
  'CÓRDOBA',
  'ENTRE RÍOS',
  'FORMOSA',
  'JUJUY',
  'LA PAMPA',
  'LA RIOJA',
  'MENDOZA',
  'MISIONES',
  'NEUQUÉN',
  'RÍO NEGRO',
  'SALTA',
  'SAN JUAN',
  'SAN LUIS',
  'SANTA CRUZ',
  'SANTA FE',
  'SANTIAGO DEL ESTERO',
  'TIERRA DEL FUEGO, ANTÁRTIDA E ISLAS DEL ATLÁNTICO SUR',
  'TUCUMÁN'
];

const TIPO_OPTIONS = [
  'Accidente de trabajo',
  'Accidente in itinere',
  'Incidente',
  'Enfermedad profesional',
  'Rechazo',
  'Reingreso',
];

const GRAVEDAD_OPTIONS = ['Leve', 'Grave', 'Mortal'];

const GRAVEDAD_CONFIG = {
  Leve: {
    badge: 'bg-green-100 text-green-800 border-green-400 font-extrabold',
    dot: 'bg-green-500',
  },
  Grave: {
    badge: 'bg-yellow-100 text-yellow-800 border-yellow-400 font-extrabold',
    dot: 'bg-yellow-500',
  },
  Mortal: {
    badge: 'bg-red-100 text-red-800 border-red-400 font-extrabold',
    dot: 'bg-red-500',
  },
};

const GRAVEDAD_GUIA = [
  {
    nivel: 'Leve',
    color: 'bg-green-100 border-green-400',
    dot: 'bg-green-500',
    criterio:
      'Lesiones que permiten retomar el trabajo tras la asistencia. No requieren períodos prolongados de recuperación. Generalmente con primeros auxilios o atención médica básica. Requieren menos de 10 días de baja laboral. No generan incapacidad permanente.',
    ejemplos: 'Cortes superficiales, contusiones menores, torceduras leves, dermatitis leve por contacto.',
  },
  {
    nivel: 'Grave',
    color: 'bg-yellow-100 border-yellow-400',
    dot: 'bg-yellow-500',
    criterio:
      'Lesiones que requieren tratamiento médico prolongado. Generan incapacidad laboral temporal (ILT). Requieren más de 10 días de baja laboral. Pueden dejar secuelas o generar incapacidad parcial permanente.',
    ejemplos: 'Fracturas, quemaduras de importancia, traumatismos severos, hipoacusia profesional, tendinitis crónica.',
  },
  {
    nivel: 'Mortal',
    color: 'bg-red-100 border-red-400',
    dot: 'bg-red-500',
    criterio:
      'Provocan el fallecimiento del trabajador. Pueden ser inmediatas o posteriores como consecuencia del accidente o enfermedad profesional.',
    ejemplos: '—',
  },
];

// PdfUploadZone removed in favor of reusable DocumentUploadZone component

// ── Helpers ─────────────────────────────────────────────────────────────────
function cleanSignaturePath(path) {
  if (!path) return '';
  if (path.includes('signatures/')) {
    const parts = path.split('signatures/');
    return parts[parts.length - 1];
  }
  return path;
}

function parseDateISOorDMY(dateStr) {
  if (!dateStr) return null;
  if (dateStr.includes('/')) {
    const parts = dateStr.split('/');
    if (parts.length !== 3) return null;
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
    if (parts[2].length !== 4) return null;
    return new Date(year, month, day);
  } else if (dateStr.includes('-')) {
    const parts = dateStr.split('-');
    if (parts.length !== 3) return null;
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
    if (parts[0].length !== 4) return null;
    return new Date(year, month, day);
  }
  return null;
}

function calcDiasBaja(fechaSiniestro, fechaAlta) {
  const d1 = parseDateISOorDMY(fechaSiniestro);
  const d2 = parseDateISOorDMY(fechaAlta);
  if (!d1 || !d2) return null;
  const diff = Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
  return diff >= 0 ? diff : null;
}

// ── Componente principal ────────────────────────────────────────────────────
export default function AccidentesPage({ params }) {
  const tenantSlug = params['tenant-slug'];

  // ── Estados estructurales ─────────────────────────────────────────────────
  const [profile, setProfile] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [empresas, setEmpresas] = useState([]);
  const [allEstablecimientos, setAllEstablecimientos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDevMode, setIsDevMode] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isReadOnlyView, setIsReadOnlyView] = useState(false);

  // ── Catálogos desde Supabase ──────────────────────────────────────────────
  const [formasAccidente, setFormasAccidente] = useState([]);
  const [descripcionesLesion, setDescripcionesLesion] = useState([]);
  const [zonasCuerpo, setZonasCuerpo] = useState([]);
  const [agentesMateriales, setAgentesMateriales] = useState([]);

  // ── Lista principal ───────────────────────────────────────────────────────
  const [accidentes, setAccidentes] = useState([]);

  // ── Estado de formulario ──────────────────────────────────────────────────
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Campos del formulario
  const [empresaId, setEmpresaId] = useState('');
  const [establecimientoId, setEstablecimientoId] = useState('');
  const [areaSector, setAreaSector] = useState('');
  const [puestoOperacion, setPuestoOperacion] = useState('');
  const [nombreApellido, setNombreApellido] = useState('');
  const [cuil, setCuil] = useState('');
  const [fechaSiniestro, setFechaSiniestro] = useState('');
  const [hora, setHora] = useState('');
  const [fechaDenuncia, setFechaDenuncia] = useState('');
  const [nroSiniestro, setNroSiniestro] = useState('');
  const [tipo, setTipo] = useState('');
  const [gravedad, setGravedad] = useState('');
  const [descripcionHechos, setDescripcionHechos] = useState('');
  const [formaAccidenteId, setFormaAccidenteId] = useState('');
  const [descripcionLesionId, setDescripcionLesionId] = useState('');
  const [zonaCuerpoId, setZonaCuerpoId] = useState('');
  const [agenteMaterialId, setAgenteMaterialId] = useState('');
  const [diagnostico, setDiagnostico] = useState('');
  const [fechaAltaRechazo, setFechaAltaRechazo] = useState('');
  const [diasBaja, setDiasBaja] = useState(null);
  const [observaciones, setObservaciones] = useState('');

  // Nuevos campos de Datos del trabajador
  const [fechaIngreso, setFechaIngreso] = useState('');
  const [turnoTrabajo, setTurnoTrabajo] = useState('');
  const [jornadaHabitual, setJornadaHabitual] = useState('');
  const [antiguedadEmpresa, setAntiguedadEmpresa] = useState('');
  const [antiguedadPuesto, setAntiguedadPuesto] = useState('');

  // Nuevos campos de Información sobre el siniestro (domicilio de ocurrencia)
  const [domicilioOcurrenciaSelect, setDomicilioOcurrenciaSelect] = useState('');
  const [domicilioOcurrenciaOtro, setDomicilioOcurrenciaOtro] = useState('');
  const [provinciaOcurrencia, setProvinciaOcurrencia] = useState('');
  const [partidoOcurrencia, setPartidoOcurrencia] = useState('');
  const [localidadBarrioOcurrencia, setLocalidadBarrioOcurrencia] = useState('');
  const [partidosOcurrencia, setPartidosOcurrencia] = useState([]);
  const [localidadesOcurrencia, setLocalidadesOcurrencia] = useState([]);
  
  // Nuevos campos de fotos (Imágenes del siniestro)
  const [fotosFiles, setFotosFiles] = useState([]);

  // ── Archivos PDF — Denuncia ───────────────────────────────────────────────
  const [denunciaFile, setDenunciaFile] = useState(null);
  const [denunciaFileName, setDenunciaFileName] = useState('');
  const [denunciaUrl, setDenunciaUrl] = useState('');

  // ── Archivos PDF — Informe Investigación ─────────────────────────────────
  const [informeFile, setInformeFile] = useState(null);
  const [informeFileName, setInformeFileName] = useState('');
  const [informeUrl, setInformeUrl] = useState('');
  const [denunciaDeleted, setDenunciaDeleted] = useState(false);
  const [informeDeleted, setInformeDeleted] = useState(false);

  // ── Firmas y Aclaraciones ─────────────────────────────────────────────────
  const firmaRespCanvasRef = useRef(null);
  const firmaProfCanvasRef = useRef(null);
  const [hasSignedResp, setHasSignedResp] = useState(false);
  const [hasSignedProf, setHasSignedProf] = useState(false);
  const [firmaRespSavedUrl, setFirmaRespSavedUrl] = useState('');
  const [firmaProfSavedUrl, setFirmaProfSavedUrl] = useState('');
  const [firmaTipo, setFirmaTipo] = useState('perfil'); // 'perfil' o 'mano'
  const [signaturePath, setSignaturePath] = useState('');
  const [firmaPerfilPreviewUrl, setFirmaPerfilPreviewUrl] = useState('');
  const [firmaResponsableAclaracion, setFirmaResponsableAclaracion] = useState('');
  const [firmaProfesionalAclaracion, setFirmaProfesionalAclaracion] = useState('');
  const [miembrosList, setMiembrosList] = useState([]);

  // ── Filtros ───────────────────────────────────────────────────────────────
  const [filterText, setFilterText] = useState('');
  const [filterEmpresa, setFilterEmpresa] = useState('');
  const [filterEstablecimiento, setFilterEstablecimiento] = useState('');
  const [filterFecha, setFilterFecha] = useState('');
  const [filterTipo, setFilterTipo] = useState('');
  const [filterGravedad, setFilterGravedad] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showExportMobile, setShowExportMobile] = useState(false);

  // ── Ordenamiento ──────────────────────────────────────────────────────────
  const [sortField, setSortField] = useState('fecha_siniestro');
  const [sortOrder, setSortOrder] = useState('desc');

  // ── Inteligencia Artificial — Generación de Informes ──────────────────────
  const [isAiCommentsModalOpen, setIsAiCommentsModalOpen] = useState(false);
  const [aiAdditionalComments, setAiAdditionalComments] = useState('');
  const [isAiReportModalOpen, setIsAiReportModalOpen] = useState(false);
  const [aiReportLoading, setAiReportLoading] = useState(false);
  const [aiReportData, setAiReportData] = useState(null);
  const [aiReportDataEdit, setAiReportDataEdit] = useState(null);
  const [aiTempComments, setAiTempComments] = useState('');
  const [aiTargetAccident, setAiTargetAccident] = useState(null);

  // ── UI/Modales ────────────────────────────────────────────────────────────
  const globalToast = useToast();
  const [modalAlert, setModalAlert] = useState({ show: false, title: '', message: '', onConfirm: null, confirmText: 'Confirmar' });
  const [saveLoading, setSaveLoading] = useState(false);
  const [showGravedadGuide, setShowGravedadGuide] = useState(false);

  // ── Permisos ──────────────────────────────────────────────────────────────
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
      eliminar: perm.eliminar === true,
    };
  };

  const sectionPerms = getSectionPermissions(profile, 'accidentes');
  const canCargar = sectionPerms.cargar;
  const canEditar = sectionPerms.editar;
  const canEliminar = sectionPerms.eliminar;
  const isFormDisabled = (editingId ? !canEditar : !canCargar) || isReadOnlyView;

  // ── Sidebar collapse ──────────────────────────────────────────────────────
  useEffect(() => {
    const collapsed = localStorage.getItem('sidebar-collapsed');
    if (collapsed === 'true') setIsSidebarCollapsed(true);
  }, []);

  const toggleSidebar = () => {
    const newVal = !isSidebarCollapsed;
    setIsSidebarCollapsed(newVal);
    localStorage.setItem('sidebar-collapsed', String(newVal));
  };

  // ── Cálculo automático de días de baja ───────────────────────────────────
  useEffect(() => {
    const d = calcDiasBaja(fechaSiniestro, fechaAltaRechazo);
    setDiasBaja(d);
  }, [fechaSiniestro, fechaAltaRechazo]);

  // ── Cascading geography para domicilio de ocurrencia "Otro" ────────────────
  useEffect(() => {
    const loadPartidos = async () => {
      if (!provinciaOcurrencia) {
        setPartidosOcurrencia([]);
        setPartidoOcurrencia('');
        return;
      }
      try {
        const data = await fetchAllGeography(provinciaOcurrencia);
        const unique = Array.from(new Set(data.map(d => d.departamento_partido))).sort();
        setPartidosOcurrencia(unique);
      } catch (err) {
        console.error('Error cargando partidos:', err);
      }
    };
    if (domicilioOcurrenciaSelect === 'Otro') {
      loadPartidos();
    }
  }, [provinciaOcurrencia, domicilioOcurrenciaSelect]);

  useEffect(() => {
    const loadLocalidades = async () => {
      if (!provinciaOcurrencia || !partidoOcurrencia) {
        setLocalidadesOcurrencia([]);
        setLocalidadBarrioOcurrencia('');
        return;
      }
      try {
        const data = await fetchAllGeography(provinciaOcurrencia, partidoOcurrencia);
        const unique = Array.from(new Set(data.map(d => d.localidad_barrio))).sort();
        setLocalidadesOcurrencia(unique);
      } catch (err) {
        console.error('Error cargando localidades:', err);
      }
    };
    if (domicilioOcurrenciaSelect === 'Otro') {
      loadLocalidades();
    }
  }, [provinciaOcurrencia, partidoOcurrencia, domicilioOcurrenciaSelect]);

  // ── Carga de datos ────────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setIsDevMode(true);
        loadMockData();
      } else {
        await loadRealData();
      }
    };
    init();
  }, []);

  // Auto-filtrar por cliente si la sesión iniciada es de rol 'cliente'
  useEffect(() => {
    if (profile && profile.role === 'cliente' && profile.empresa_id) {
      setFilterEmpresa(profile.empresa_id);
    }
  }, [profile]);

  // Auto-cargar preview de firma de perfil del profesional cuando cambia el profesional o miembrosList
  useEffect(() => {
    if (firmaTipo === 'perfil' && firmaProfesionalAclaracion && miembrosList.length > 0) {
      const selectedMember = miembrosList.find(m => m.full_name === firmaProfesionalAclaracion);
      if (selectedMember?.signature_url) {
        const cleanedPath = cleanSignaturePath(selectedMember.signature_url);
        supabase.storage
          .from('signatures')
          .createSignedUrl(cleanedPath, 3600)
          .then(({ data, error }) => {
            if (!error && data?.signedUrl) {
              setFirmaPerfilPreviewUrl(data.signedUrl);
            } else {
              setFirmaPerfilPreviewUrl('');
            }
          })
          .catch(() => setFirmaPerfilPreviewUrl(''));
      } else {
        setFirmaPerfilPreviewUrl('');
      }
    } else {
      setFirmaPerfilPreviewUrl('');
    }
  }, [firmaTipo, firmaProfesionalAclaracion, miembrosList]);

  const triggerToast = (message, type = 'success') => {
    globalToast.toast(message, type);
  };

  const closeAlert = () =>
    setModalAlert({ show: false, title: '', message: '', onConfirm: null, confirmText: 'Confirmar' });

  const loadRealData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = '/login'; return; }

      const { data: prof, error: pErr } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (pErr) throw pErr;
      setProfile(prof);
      if (typeof window !== 'undefined') sessionStorage.setItem('user-profile', JSON.stringify(prof));
      if (prof.role === 'cliente') setIsReadOnlyView(true);

      const { data: ten, error: tErr } = await supabase.from('tenants').select('*').eq('slug', tenantSlug).single();
      if (tErr || !ten) { window.location.href = '/login'; return; }

      // Verificar acceso multi-tenant
      let hasAccess = prof.tenant_id === ten.id;
      if (!hasAccess) {
        const { data: member } = await supabase
          .from('miembros_equipo')
          .select('id, tiene_acceso')
          .eq('tenant_id', ten.id)
          .eq('profile_id', user.id)
          .maybeSingle();
        if (member && member.tiene_acceso) hasAccess = true;
      }
      if (!hasAccess) { window.location.href = '/login'; return; }
      setTenant(ten);

      // Empresas
      let empQ = supabase.from('empresas').select('id, razon_social, cuit').eq('tenant_id', ten.id);
      if (prof.role === 'cliente') empQ = empQ.eq('id', prof.empresa_id);
      const { data: emps } = await empQ.order('razon_social');
      setEmpresas(emps || []);

      // Establecimientos
      let estQ = supabase.from('establecimientos').select('id, empresa_id, denominacion, direccion, provincia, partido, localidad_barrio').eq('tenant_id', ten.id);
      if (prof.role === 'cliente') estQ = estQ.eq('empresa_id', prof.empresa_id);
      const { data: ests } = await estQ.order('denominacion');
      setAllEstablecimientos(ests || []);

      // Cargar lista de miembros de equipo para la firma
      const { data: members } = await supabase
        .from('miembros_equipo')
        .select('id, full_name, signature_url, profile_id')
        .eq('tenant_id', ten.id);
      setMiembrosList(members || []);

      // Si el usuario tiene una firma guardada en su perfil, obtener URL firmada
      if (prof.signature_path) {
        const cleanedPath = cleanSignaturePath(prof.signature_path);
        const { data: sigData } = await supabase.storage
          .from('signatures')
          .createSignedUrl(cleanedPath, 3600);
        if (sigData?.signedUrl) {
          setFirmaPerfilPreviewUrl(sigData.signedUrl);
        }
      }

      // Catálogos (lectura pública)
      const [
        { data: formas },
        { data: descLesion },
        { data: zonas },
        { data: agentes },
      ] = await Promise.all([
        supabase.from('formas_accidente').select('id, nombre').order('nombre'),
        supabase.from('descripciones_lesion').select('id, nombre').order('nombre'),
        supabase.from('zonas_cuerpo_afectadas').select('id, nombre').order('nombre'),
        supabase.from('agentes_materiales_asociados').select('id, nombre').order('nombre'),
      ]);
      setFormasAccidente(formas || []);
      setDescripcionesLesion(descLesion || []);
      setZonasCuerpo(zonas || []);
      setAgentesMateriales(agentes || []);

      // Accidentes
      let accQ = supabase.from('accidentes').select('*').eq('tenant_id', ten.id);
      if (prof.role === 'cliente') accQ = accQ.eq('empresa_id', prof.empresa_id);
      const { data: accs, error: accErr } = await accQ.order('created_at', { ascending: false });
      if (accErr) throw accErr;

      // Firmar URLs en lote
      const pathsToSign = [];
      (accs || []).forEach(a => {
        [a.denuncia_accidente_url, a.informe_investigacion_url].forEach(url => {
          if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
            pathsToSign.push(url);
          }
        });
        if (a.fotos_urls && Array.isArray(a.fotos_urls)) {
          a.fotos_urls.forEach(url => {
            if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
              pathsToSign.push(url);
            }
          });
        }
      });

      let signedMap = {};
      if (pathsToSign.length > 0) {
        try {
          const { data: signed } = await supabase.storage.from('documents').createSignedUrls(pathsToSign, 3600);
          (signed || []).forEach(s => { if (s.signedUrl) signedMap[s.path] = s.signedUrl; });
        } catch (e) {
          console.error('Error firmando URLs:', e);
        }
      }

      const resolveUrl = (url) => {
        if (!url) return '';
        if (url.startsWith('http://') || url.startsWith('https://')) return url;
        return signedMap[url] || '';
      };

      const resolved = (accs || []).map(a => {
        const signedFotos = (a.fotos_urls || []).map(url => {
          if (!url) return '';
          if (url.startsWith('http://') || url.startsWith('https://')) return url;
          return signedMap[url] || '';
        });
        return {
          ...a,
          denuncia_signed_url: resolveUrl(a.denuncia_accidente_url),
          informe_signed_url: resolveUrl(a.informe_investigacion_url),
          fotos_signed_urls: signedFotos
        };
      });

      setAccidentes(resolved);
      setLoading(false);
    } catch (err) {
      console.error('Error cargando accidentes:', err);
      triggerToast('Error al conectar con la base de datos.', 'error');
      setIsDevMode(true);
      loadMockData();
    }
  };

  const loadMockData = () => {
    setProfile({ full_name: 'Profesional de SySO (Mock)', role: 'admin' });
    setTenant({ id: 'mock-tenant', name: 'Consultora de Prueba', plan_id: 'basic_5' });
    setEmpresas([
      { id: 'mock-emp-1', razon_social: 'Acme Argentina S.A.' },
      { id: 'mock-emp-2', razon_social: 'Logística Norte SRL' },
    ]);
    setAllEstablecimientos([
      { id: 'mock-est-1', empresa_id: 'mock-emp-1', denominacion: 'Planta Industrial Pilar' },
      { id: 'mock-est-2', empresa_id: 'mock-emp-1', denominacion: 'Oficinas Belgrano' },
      { id: 'mock-est-3', empresa_id: 'mock-emp-2', denominacion: 'Depósito Pacheco' },
    ]);
    setFormasAccidente([{ id: 'f1', nombre: 'Caída de personas a distinto nivel' }, { id: 'f2', nombre: 'Golpe por objeto en movimiento' }]);
    setDescripcionesLesion([{ id: 'd1', nombre: 'Fractura' }, { id: 'd2', nombre: 'Contusión' }]);
    setZonasCuerpo([{ id: 'z1', nombre: 'Mano' }, { id: 'z2', nombre: 'Pie' }]);
    setAgentesMateriales([{ id: 'a1', nombre: 'Herramienta de mano' }, { id: 'a2', nombre: 'Máquina' }]);
    setAccidentes([
      {
        id: 'mock-acc-1',
        empresa_id: 'mock-emp-1',
        establecimiento_id: 'mock-est-1',
        nombre_apellido: 'Carlos García',
        cuil: '20304445556',
        fecha_siniestro: '2026-06-01',
        tipo: 'Accidente de trabajo',
        gravedad: 'Leve',
        dias_baja: 5,
        denuncia_accidente_url: '',
        informe_investigacion_url: '',
        denuncia_signed_url: '',
        informe_signed_url: '',
      },
    ]);
    setLoading(false);
  };


  // ── Inicialización y Dibujo en Canvas de Firmas ───────────────────────────
  const setupCanvas = (canvas, setHasSigned) => {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    let drawing = false;
    let lastX = 0;
    let lastY = 0;

    const getCoordinates = (e) => {
      const rect = canvas.getBoundingClientRect();
      const clientX = (e.touches && e.touches.length > 0) ? e.touches[0].clientX : e.clientX;
      const clientY = (e.touches && e.touches.length > 0) ? e.touches[0].clientY : e.clientY;
      
      const cssX = clientX - rect.left;
      const cssY = clientY - rect.top;
      
      // Scale client viewport coordinates to canvas HTML layout size to resolve responsive offset
      const canvasX = cssX * (canvas.width / rect.width);
      const canvasY = cssY * (canvas.height / rect.height);
      
      return {
        x: canvasX,
        y: canvasY
      };
    };

    const startDrawing = (e) => {
      e.preventDefault();
      drawing = true;
      const coords = getCoordinates(e);
      lastX = coords.x;
      lastY = coords.y;
    };

    const draw = (e) => {
      if (!drawing) return;
      e.preventDefault();
      const coords = getCoordinates(e);
      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
      lastX = coords.x;
      lastY = coords.y;
      setHasSigned(true);
    };

    const stopDrawing = () => {
      drawing = false;
    };

    // Mouse events
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseleave', stopDrawing);

    // Touch events
    canvas.addEventListener('touchstart', startDrawing, { passive: false });
    canvas.addEventListener('touchmove', draw, { passive: false });
    canvas.addEventListener('touchend', stopDrawing);
  };

  const firmaRespRefCallback = useCallback((canvas) => {
    if (canvas) {
      firmaRespCanvasRef.current = canvas;
      setupCanvas(canvas, setHasSignedResp);
    }
  }, []);

  const firmaProfRefCallback = useCallback((canvas) => {
    if (canvas) {
      firmaProfCanvasRef.current = canvas;
      setupCanvas(canvas, setHasSignedProf);
    }
  }, []);

  const clearFirmaResp = () => {
    if (firmaRespCanvasRef.current) {
      const ctx = firmaRespCanvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, firmaRespCanvasRef.current.width, firmaRespCanvasRef.current.height);
      setHasSignedResp(false);
    }
  };

  const clearFirmaProf = () => {
    if (firmaProfCanvasRef.current) {
      const ctx = firmaProfCanvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, firmaProfCanvasRef.current.width, firmaProfCanvasRef.current.height);
      setHasSignedProf(false);
    }
  };

  const uploadSignatureBlob = async (canvas, folderName) => {
    return new Promise((resolve, reject) => {
      canvas.toBlob(async (blob) => {
        if (!blob) {
          reject(new Error('No se pudo generar el blob del canvas de firma.'));
          return;
        }
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error('No autorizado');
          const fileName = `${folderName}_${Date.now()}.png`;
          const filePath = `${user.id}/${fileName}`;
          const { error } = await supabase.storage
            .from('signatures')
            .upload(filePath, blob, { contentType: 'image/png', cacheControl: '3600' });
          if (error) throw error;
          resolve(filePath);
        } catch (err) {
          reject(err);
        }
      }, 'image/png');
    });
  };

  // ── Logout ────────────────────────────────────────────────────────────────
  const handleLogout = async () => {
    await supabase.auth.signOut();
    if (typeof window !== 'undefined') sessionStorage.removeItem('user-profile');
    window.location.href = '/login';
  };

  // ── Establecimientos filtrados por empresa ────────────────────────────────
  const filteredEstabs = allEstablecimientos.filter(e => e.empresa_id === empresaId);
  const filterEstabs = allEstablecimientos.filter(e => !filterEmpresa || e.empresa_id === filterEmpresa);

  // ── Ordenamiento ──────────────────────────────────────────────────────────
  const handleSort = (field) => {
    setSortOrder(prev => (sortField === field && prev === 'asc' ? 'desc' : 'asc'));
    setSortField(field);
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <ChevronDown className="h-3 w-3 opacity-30 inline ml-1" />;
    return sortOrder === 'asc'
      ? <ChevronUp className="h-3 w-3 opacity-70 inline ml-1" />
      : <ChevronDown className="h-3 w-3 opacity-70 inline ml-1" />;
  };

  // ── Filtrado + Ordenamiento de lista ──────────────────────────────────────
  const filteredAccidentes = accidentes
    .filter(a => {
      const textMatch = !filterText || [a.nombre_apellido, a.nro_siniestro, a.diagnostico, a.descripcion_hechos]
        .some(v => (v || '').toLowerCase().includes(filterText.toLowerCase()));
      const empMatch = !filterEmpresa || a.empresa_id === filterEmpresa;
      const estMatch = !filterEstablecimiento || a.establecimiento_id === filterEstablecimiento;
      const fechaMatch = !filterFecha || (a.fecha_siniestro || '').includes(filterFecha);
      const tipoMatch = !filterTipo || a.tipo === filterTipo;
      const gravMatch = !filterGravedad || a.gravedad === filterGravedad;
      return textMatch && empMatch && estMatch && fechaMatch && tipoMatch && gravMatch;
    })
    .sort((a, b) => {
      let va = a[sortField] || '';
      let vb = b[sortField] || '';
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      if (va < vb) return sortOrder === 'asc' ? -1 : 1;
      if (va > vb) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

  // ── Helpers de lookups ────────────────────────────────────────────────────
  const getEmpresaNombre = (id) => empresas.find(e => e.id === id)?.razon_social || '—';
  const getEstabNombre = (id) => allEstablecimientos.find(e => e.id === id)?.denominacion || '—';
  const getFormaName = (id) => formasAccidente.find(f => f.id === id)?.nombre || '—';
  const getDescLesionName = (id) => descripcionesLesion.find(d => d.id === id)?.nombre || '—';
  const getZonaName = (id) => zonasCuerpo.find(z => z.id === id)?.nombre || '—';
  const getAgenteName = (id) => agentesMateriales.find(a => a.id === id)?.nombre || '—';

  // ── Manejo de archivos PDF ────────────────────────────────────────────────
  const handleDenunciaFileChange = (file) => {
    setDenunciaFile(file);
    setDenunciaFileName(file ? file.name : '');
  };

  const handleInformeFileChange = (file) => {
    setInformeFile(file);
    setInformeFileName(file ? file.name : '');
  };

  const handleClearDenuncia = () => {
    setModalAlert({
      show: true,
      title: 'Eliminar denuncia de accidente',
      message: '¿Estás seguro de que deseas quitar el archivo de la denuncia de accidente? Para guardar este cambio de forma permanente deberás hacer click en el botón Guardar al finalizar.',
      confirmText: 'Eliminar',
      onConfirm: () => {
        closeAlert();
        setDenunciaFile(null);
        setDenunciaFileName('');
        setDenunciaUrl('');
        setDenunciaDeleted(true);
      }
    });
  };

  const handleClearInforme = () => {
    setModalAlert({
      show: true,
      title: 'Eliminar informe de investigación',
      message: '¿Estás seguro de que deseas quitar el informe de investigación de accidente? Para guardar este cambio de forma permanente deberás hacer click en el botón Guardar al finalizar.',
      confirmText: 'Eliminar',
      onConfirm: () => {
        closeAlert();
        setInformeFile(null);
        setInformeFileName('');
        setInformeUrl('');
        setInformeDeleted(true);
      }
    });
  };

  // Subir PDF a storage
  const uploadPdf = async (file, prefix) => {
    if (isDevMode) return `mock-path/${prefix}_${Date.now()}.pdf`;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autorizado');
    const filePath = `${user.id}/${prefix}_${Date.now()}.pdf`;
    const { error } = await supabase.storage.from('documents').upload(filePath, file, {
      cacheControl: '3600', upsert: true, contentType: 'application/pdf',
    });
    if (error) throw error;
    return filePath;
  };

  // Subir Imagen a storage
  const uploadImageToStorage = async (file, prefix = 'siniestro_foto') => {
    if (isDevMode) return `mock-path/${prefix}_${Date.now()}.png`;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autorizado');
    const ext = file.name ? file.name.split('.').pop() : 'png';
    const filePath = `${user.id}/${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${ext}`;
    const { error } = await supabase.storage.from('documents').upload(filePath, file, {
      cacheControl: '3600', upsert: true, contentType: file.type || 'image/png',
    });
    if (error) throw error;
    return filePath;
  };

  // Ver PDF
  const handleViewPdf = async (url) => {
    if (!url || url === 'N/A' || url === 'undefined' || url.trim() === '') {
      triggerToast('No hay ningún archivo válido cargado.', 'error');
      return;
    }
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:')) { window.open(url, '_blank'); return; }
    if (isDevMode) { triggerToast('Vista previa no disponible en modo desarrollo.', 'info'); return; }
    try {
      const { data, error } = await supabase.storage.from('documents').createSignedUrl(url, 3600);
      if (error) throw error;
      window.open(data.signedUrl, '_blank');
    } catch { triggerToast('Error al abrir el PDF.', 'error'); }
  };

  const handleDomicilioSelectChange = (val) => {
    setDomicilioOcurrenciaSelect(val);
    if (val && val !== 'Otro') {
      const est = filteredEstabs.find(e => e.direccion === val);
      if (est) {
        setProvinciaOcurrencia(est.provincia || '');
        setPartidoOcurrencia(est.partido || '');
        setLocalidadBarrioOcurrencia(est.localidad_barrio || '');
      }
    } else {
      setProvinciaOcurrencia('');
      setPartidoOcurrencia('');
      setLocalidadBarrioOcurrencia('');
      setPartidosOcurrencia([]);
      setLocalidadesOcurrencia([]);
      setDomicilioOcurrenciaOtro('');
    }
  };

  // ── Helpers para carga de Imágenes e IA ────────────────────────────────────
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

  const handleCallGenerateReportApi = async (accidentPayload, comments = '') => {
    setAiReportLoading(true);
    try {
      const res = await fetch(`/api/ai/generate-accident-report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accidentData: accidentPayload,
          additionalComments: comments
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al generar el reporte');
      
      setAiReportData(data.report);
      setAiReportDataEdit(data.report);
      setIsAiCommentsModalOpen(false);
      setIsAiReportModalOpen(true);
      triggerToast('Informe técnico de accidente generado exitosamente.');
    } catch (err) {
      console.error(err);
      triggerToast(err.message || 'Error al generar el informe con IA.', 'error');
    } finally {
      setAiReportLoading(false);
    }
  };

  const handleOpenAiModalForCurrentForm = () => {
    // Si el formulario está en modo vista/solo lectura, pasarlo automáticamente a modo edición (salvo si es cliente)
    if (isReadOnlyView && profile?.role !== 'cliente') {
      setIsReadOnlyView(false);
    }

    // Validar campos obligatorios en el formulario actual
    if (!fechaSiniestro) { triggerToast('La Fecha del siniestro es obligatoria para la IA.', 'error'); return; }
    if (!hora) { triggerToast('La Hora del siniestro es obligatoria para la IA.', 'error'); return; }
    if (!tipo) { triggerToast('El Tipo es obligatorio para la IA.', 'error'); return; }
    if (!gravedad) { triggerToast('La Gravedad es obligatoria para la IA.', 'error'); return; }
    if (!descripcionHechos || !descripcionHechos.trim()) { triggerToast('La Descripción de los hechos es obligatoria para la IA.', 'error'); return; }

    const emp = empresas.find(e => e.id === empresaId) || {};
    const estab = allEstablecimientos.find(e => e.id === establecimientoId) || {};

    const payload = {
      area_sector: areaSector,
      puesto_operacion: puestoOperacion,
      fecha_siniestro: fechaSiniestro,
      hora: hora,
      tipo: tipo,
      gravedad: gravedad,
      descripcion_hechos: descripcionHechos,
      fecha_ingreso: fechaIngreso,
      turno_trabajo: turnoTrabajo,
      jornada_habitual: jornadaHabitual,
      antiguedad_empresa: antiguedadEmpresa,
      antiguedad_puesto: antiguedadPuesto,
      nombre_trabajador: nombreApellido,
      cuil: cuil,
      domicilio_ocurrencia: domicilioOcurrenciaSelect === 'Otro' ? domicilioOcurrenciaOtro : domicilioOcurrenciaSelect,
      provincia_ocurrencia: provinciaOcurrencia,
      partido_ocurrencia: partidoOcurrencia,
      localidad_barrio_ocurrencia: localidadBarrioOcurrencia,
      // Datos del Empleador y Establecimiento para el PDF
      empresa_razon_social: emp.razon_social || '',
      empresa_cuit: emp.cuit || '',
      establecimiento_denominacion: estab.denominacion || '',
      establecimiento_direccion: estab.direccion || '',
      establecimiento_localidad: estab.localidad_barrio || '',
      establecimiento_partido: estab.partido || '',
      establecimiento_provincia: estab.provincia || '',
      // Datos médicos y denuncia
      nro_siniestro: nroSiniestro,
      fecha_denuncia: fechaDenuncia,
      diagnostico: diagnostico || '',
      forma_accidente_nombre: formasAccidente.find(f => f.id === formaAccidenteId)?.nombre || '—',
      descripcion_lesion_nombre: descripcionesLesion.find(d => d.id === descripcionLesionId)?.nombre || '—',
      zona_cuerpo_nombre: zonasCuerpo.find(z => z.id === zonaCuerpoId)?.nombre || '—',
      agente_material_nombre: agentesMateriales.find(a => a.id === agenteMaterialId)?.nombre || '—',
      fotos_files: fotosFiles || [],
      // IDs de relación para búsqueda en PDF
      empresa_id: empresaId,
      establecimiento_id: establecimientoId,
      forma_accidente_id: formaAccidenteId,
      descripcion_lesion_id: descripcionLesionId,
      zona_cuerpo_id: zonaCuerpoId,
      agente_material_id: agenteMaterialId
    };

    setAiTargetAccident(payload);
    setAiAdditionalComments('');
    setAiTempComments('');
    setIsAiCommentsModalOpen(true);
  };

  const handleOpenAiModalFromList = (acc) => {
    // Abrir el formulario en modo edición
    handleEditClick(acc, false);

    const emp = empresas.find(e => e.id === acc.empresa_id) || {};
    const estab = allEstablecimientos.find(e => e.id === acc.establecimiento_id) || {};
    
    // Mapear fotos firmadas
    const fotosMapped = (acc.fotos_urls || []).map((path, index) => ({
      file: null,
      preview: acc.fotos_signed_urls?.[index] || '/brand/logo-primary.png',
      path
    }));

    const payload = {
      area_sector: acc.area_sector,
      puesto_operacion: acc.puesto_operacion,
      fecha_siniestro: formatDate(acc.fecha_siniestro),
      hora: acc.hora,
      tipo: acc.tipo,
      gravedad: acc.gravedad,
      descripcion_hechos: acc.descripcion_hechos,
      fecha_ingreso: acc.fecha_ingreso ? formatDate(acc.fecha_ingreso) : '',
      turno_trabajo: acc.turno_trabajo,
      jornada_habitual: acc.jornada_habitual,
      antiguedad_empresa: acc.antiguedad_empresa,
      antiguedad_puesto: acc.antiguedad_puesto,
      nombre_trabajador: acc.nombre_apellido,
      cuil: acc.cuil,
      domicilio_ocurrencia: acc.domicilio_ocurrencia,
      provincia_ocurrencia: acc.provincia_ocurrencia,
      partido_ocurrencia: acc.partido_ocurrencia,
      localidad_barrio_ocurrencia: acc.localidad_barrio_ocurrencia,
      // Datos del Empleador y Establecimiento para el PDF
      empresa_razon_social: emp.razon_social || '',
      empresa_cuit: emp.cuit || '',
      establecimiento_denominacion: estab.denominacion || '',
      establecimiento_direccion: estab.direccion || '',
      establecimiento_localidad: estab.localidad_barrio || '',
      establecimiento_partido: estab.partido || '',
      establecimiento_provincia: estab.provincia || '',
      // Datos médicos y denuncia
      nro_siniestro: acc.nro_siniestro || '',
      fecha_denuncia: formatDate(acc.fecha_denuncia) || '',
      diagnostico: acc.diagnostico || '',
      forma_accidente_nombre: formasAccidente.find(f => f.id === acc.forma_accidente_id)?.nombre || '—',
      descripcion_lesion_nombre: descripcionesLesion.find(d => d.id === acc.descripcion_lesion_id)?.nombre || '—',
      zona_cuerpo_nombre: zonasCuerpo.find(z => z.id === acc.zona_cuerpo_id)?.nombre || '—',
      agente_material_nombre: agentesMateriales.find(a => a.id === acc.agente_material_id)?.nombre || '—',
      fotos_files: fotosMapped,
      // IDs de relación para búsqueda en PDF
      empresa_id: acc.empresa_id,
      establecimiento_id: acc.establecimiento_id,
      forma_accidente_id: acc.forma_accidente_id,
      descripcion_lesion_id: acc.descripcion_lesion_id,
      zona_cuerpo_id: acc.zona_cuerpo_id,
      agente_material_id: acc.agente_material_id
    };
    setAiTargetAccident(payload);
    setAiAdditionalComments('');
    setAiTempComments('');
    setIsAiCommentsModalOpen(true);
  };

  const handleExportTechnicalReportPdfOLD = async (report, accData) => {
    try {
      // 1. Inicializar jsPDF
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'pt',
        format: 'a4'
      });

      // Intentar cargar logo del tenant
      let logoBase64 = '';
      try {
        if (tenant && tenant.logo_1_url) {
          logoBase64 = await getBase64ImageFromUrl(tenant.logo_1_url);
        }
      } catch (logoErr) {
        console.warn('No se pudo descargar el logo del tenant:', logoErr);
      }
      if (!logoBase64) {
        try {
          logoBase64 = await getBase64ImageFromUrl('/brand/logo-primary.png');
        } catch (defLogoErr) {
          console.warn('No se pudo cargar el logo por defecto:', defLogoErr);
        }
      }
      if (logoBase64) {
        logoBase64 = await resizeImage(logoBase64, 150, 150);
      }

      // Información del establecimiento del accidente obtenida de accData
      const emp = {
        razon_social: accData.empresa_razon_social || '',
        cuit: accData.empresa_cuit || ''
      };
      const estab = {
        denominacion: accData.establecimiento_denominacion || '',
        direccion: accData.establecimiento_direccion || '',
        localidad_barrio: accData.establecimiento_localidad || '',
        provincia: accData.establecimiento_provincia || ''
      };

      // Redefinición local de variables para asegurar aislamiento completo del PDF respecto de estados de formulario React
      const nombreApellido = accData.nombre_trabajador || '';
      const cuil = accData.cuil || '';
      const areaSector = accData.area_sector || '';
      const puestoOperacion = accData.puesto_operacion || '';
      const fechaIngreso = accData.fecha_ingreso || '';
      const turnoTrabajo = accData.turno_trabajo || '';
      const jornadaHabitual = accData.jornada_habitual || '';
      const antiguedadEmpresa = accData.antiguedad_empresa || '';
      const antiguedadPuesto = accData.antiguedad_puesto || '';
      const fechaSiniestro = accData.fecha_siniestro || '';
      const fechaDenuncia = accData.fecha_denuncia || '';
      const hora = accData.hora || '';
      const nroSiniestro = accData.nro_siniestro || '';
      const domicilioOcurrenciaSelect = accData.domicilio_ocurrencia || '';
      const domicilioOcurrenciaOtro = '';
      const provinciaOcurrencia = accData.provincia_ocurrencia || '';
      const partidoOcurrencia = accData.partido_ocurrencia || '';
      const localidadBarrioOcurrencia = accData.localidad_barrio_ocurrencia || '';
      const descripcionHechos = accData.descripcion_hechos || '';
      const fotosFiles = accData.fotos_files || [];
      const establecimientoId = accData.establecimiento_id || '';
      const empresaId = accData.empresa_id || '';
      const formaAccidenteId = accData.forma_accidente_id || '';
      const descripcionLesionId = accData.descripcion_lesion_id || '';
      const zonaCuerpoId = accData.zona_cuerpo_id || '';
      const agenteMaterialId = accData.agente_material_id || '';

      // ───────────────────────────────────────────────────────────────────────
      // PAGINA 1
      // ───────────────────────────────────────────────────────────────────────
      
      // Dibujar logo superior izquierdo (si existe)
      if (logoBase64) {
        try {
          doc.addImage(logoBase64, 'PNG', 14, 10, 80, 40);
        } catch (imgErr) {
          console.error('Error inyectando el logo en el PDF:', imgErr);
        }
      }

      // Titulo Principal (Y=64)
      doc.setFillColor(60, 120, 216); // #3C78D8
      doc.rect(14, 64, 567, 13, 'F');
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.text('Informe de investigación de accidente de trabajo / enfermedad profesional', 297, 73, { align: 'center' });

      // Fecha y Tipo Inicial (Y=92)
      doc.setTextColor(0, 0, 0);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(7);
      doc.text('Fecha del siniestro / primera manifestación de la enfermedad:', 17, 101);
      
      doc.setFont('Helvetica', 'normal');
      doc.setDrawColor(128, 128, 128); // #808080
      doc.setLineDashPattern([1, 2], 0);
      doc.line(265, 102, 380, 102);
      doc.text(accData.fecha_siniestro || '', 270, 101);

      doc.setFont('Helvetica', 'bold');
      doc.text('Tipo de siniestro:', 390, 101);
      doc.setFont('Helvetica', 'normal');
      doc.line(460, 102, 575, 102);
      doc.text(accData.tipo || '', 465, 101);

      // SECCIÓN 1: Datos del empleador (Y=118)
      doc.setFillColor(60, 120, 216);
      doc.setLineDashPattern([], 0);
      doc.rect(14, 118, 567, 13, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('Helvetica', 'bold');
      doc.text('Datos del empleador', 18, 127);

      doc.setTextColor(0, 0, 0);
      doc.setFont('Helvetica', 'bold');
      doc.text('Razón social:', 17, 150);
      doc.setFont('Helvetica', 'normal');
      doc.setLineDashPattern([1, 2], 0);
      doc.line(80, 151, 310, 151);
      doc.text(emp.razon_social || '', 85, 150);

      doc.setFont('Helvetica', 'bold');
      doc.text('CUIT:', 316, 150);
      doc.setFont('Helvetica', 'normal');
      doc.line(356, 151, 580, 151);
      doc.text(emp.cuit || '', 360, 150);

      doc.setFont('Helvetica', 'bold');
      doc.text('Domicilio:', 17, 163);
      doc.setFont('Helvetica', 'normal');
      doc.line(80, 164, 580, 164);
      doc.text(estab.direccion || '', 85, 163);

      doc.setFont('Helvetica', 'bold');
      doc.text('Código postal:', 17, 176);
      doc.setFont('Helvetica', 'normal');
      doc.line(80, 177, 171, 177);
      doc.text('—', 85, 176);

      doc.setFont('Helvetica', 'bold');
      doc.text('Localidad:', 172, 176);
      doc.setFont('Helvetica', 'normal');
      doc.line(233, 177, 387, 177);
      doc.text(estab.localidad_barrio || '', 238, 176);

      doc.setFont('Helvetica', 'bold');
      doc.text('Provincia:', 388, 176);
      doc.setFont('Helvetica', 'normal');
      doc.line(449, 177, 580, 177);
      doc.text(estab.provincia || '', 454, 176);

      // SECCIÓN 2: Datos del trabajador (Y=195)
      doc.setFillColor(60, 120, 216);
      doc.setLineDashPattern([], 0);
      doc.rect(14, 195, 567, 13, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('Helvetica', 'bold');
      doc.text('Datos del trabajador', 18, 204);

      doc.setTextColor(0, 0, 0);
      doc.setFont('Helvetica', 'bold');
      doc.text('Apellido y nombre:', 17, 225);
      doc.setFont('Helvetica', 'normal');
      doc.setLineDashPattern([1, 2], 0);
      doc.line(115, 226, 430, 226);
      doc.text(nombreApellido || '', 120, 225);

      doc.setFont('Helvetica', 'bold');
      doc.text('CUIL:', 431, 225);
      doc.setFont('Helvetica', 'normal');
      doc.line(465, 226, 580, 226);
      doc.text(cuil || '', 470, 225);

      doc.setFont('Helvetica', 'bold');
      doc.text('Área / Sector de trabajo:', 17, 238);
      doc.setFont('Helvetica', 'normal');
      doc.line(128, 239, 580, 239);
      doc.text(areaSector || '', 133, 238);

      doc.setFont('Helvetica', 'bold');
      doc.text('Puesto / Operación de trabajo al momento del accidente o detección de la enfermedad profesional:', 17, 251);
      doc.setFont('Helvetica', 'normal');
      doc.line(380, 252, 580, 252);
      doc.text(puestoOperacion ? (puestoOperacion.length > 50 ? puestoOperacion.slice(0, 50) + '...' : puestoOperacion) : '', 385, 251);

      doc.setFont('Helvetica', 'bold');
      doc.text('Fecha de ingreso a la empresa:', 17, 276);
      doc.setFont('Helvetica', 'normal');
      doc.line(150, 277, 580, 277);
      doc.text(fechaIngreso || '', 155, 276);

      doc.setFont('Helvetica', 'bold');
      doc.text('Turno de trabajo habitual:', 17, 289);
      doc.setFont('Helvetica', 'normal');
      doc.line(147, 290, 275, 290);
      doc.text(turnoTrabajo || '', 152, 289);

      doc.setFont('Helvetica', 'bold');
      doc.text('Jornada habitual de trabajo:', 276, 289);
      doc.setFont('Helvetica', 'normal');
      doc.line(410, 290, 580, 290);
      doc.text(jornadaHabitual || '', 415, 289);

      doc.setFont('Helvetica', 'bold');
      doc.text('Antigüedad en la empresa:', 17, 302);
      doc.setFont('Helvetica', 'normal');
      doc.line(150, 303, 275, 303);
      doc.text(antiguedadEmpresa || '', 155, 302);

      doc.setFont('Helvetica', 'bold');
      doc.text('Antigüedad en el puesto:', 276, 302);
      doc.setFont('Helvetica', 'normal');
      doc.line(410, 303, 580, 303);
      doc.text(antiguedadPuesto || '', 415, 302);

      // SECCIÓN 3: Información sobre el siniestro (Y=323)
      doc.setFillColor(60, 120, 216);
      doc.setLineDashPattern([], 0);
      doc.rect(14, 323, 567, 13, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('Helvetica', 'bold');
      doc.text('Información sobre el siniestro (Accidente de trabajo / Enfermedad profesional)', 18, 332);

      doc.setTextColor(0, 0, 0);
      doc.setFont('Helvetica', 'bold');
      doc.text('Fecha siniestro / reingreso:', 17, 351);
      doc.setFont('Helvetica', 'normal');
      doc.setLineDashPattern([1, 2], 0);
      doc.line(144, 352, 274, 352);
      doc.text(fechaSiniestro || '', 149, 351);

      doc.setFont('Helvetica', 'bold');
      doc.text('Fecha de denuncia:', 276, 351);
      doc.setFont('Helvetica', 'normal');
      doc.line(361, 352, 580, 352);
      doc.text(fechaDenuncia || '', 366, 351);

      doc.setFont('Helvetica', 'bold');
      doc.text('Hora del accidente (Accidente de trabajo):', 17, 364);
      doc.setFont('Helvetica', 'normal');
      doc.line(215, 365, 240, 365);
      doc.text(hora || '', 220, 364);
      doc.setFont('Helvetica', 'bold');
      doc.text('Hs.', 242, 364);

      doc.text('N° de Siniestro:', 276, 364);
      doc.setFont('Helvetica', 'normal');
      doc.line(350, 365, 580, 365);
      doc.text(nroSiniestro || '', 355, 364);

      doc.setFont('Helvetica', 'bold');
      doc.text('Domicilio de ocurrencia del accidente:', 17, 377);
      doc.setFont('Helvetica', 'normal');
      doc.line(188, 378, 580, 378);
      const domOcurr = domicilioOcurrenciaSelect === 'Otro' ? domicilioOcurrenciaOtro : domicilioOcurrenciaSelect;
      doc.text(domOcurr || '', 193, 377);

      doc.setFont('Helvetica', 'bold');
      doc.text('Provincia:', 17, 390);
      doc.setFont('Helvetica', 'normal');
      doc.line(65, 391, 200, 391);
      doc.text(provinciaOcurrencia || '', 70, 390);

      doc.setFont('Helvetica', 'bold');
      doc.text('Partido:', 201, 390);
      doc.setFont('Helvetica', 'normal');
      doc.line(247, 391, 390, 391);
      doc.text(partidoOcurrencia || '', 252, 390);

      doc.setFont('Helvetica', 'bold');
      doc.text('Localidad/Barrio:', 391, 390);
      doc.setFont('Helvetica', 'normal');
      doc.line(475, 391, 580, 391);
      doc.text(localidadBarrioOcurrencia || '', 480, 390);

      doc.setFont('Helvetica', 'bold');
      doc.text('Descripción del accidente:', 17, 403);
      doc.setFont('Helvetica', 'normal');
      doc.text(descripcionHechos || '', 17, 415, { maxWidth: 563 });

      // Catálogos seleccionados
      const formaNombre = formasAccidente.find(f => f.id === formaAccidenteId)?.nombre || '—';
      const descLesionNombre = descripcionesLesion.find(d => d.id === descripcionLesionId)?.nombre || '—';
      const zonaCuerpoNombre = zonasCuerpo.find(z => z.id === zonaCuerpoId)?.nombre || '—';
      const agenteNombre = agentesMateriales.find(a => a.id === agenteMaterialId)?.nombre || '—';

      doc.setFont('Helvetica', 'bold');
      doc.text('Forma del accidente:', 17, 505);
      doc.setFont('Helvetica', 'normal');
      doc.line(122, 506, 580, 506);
      doc.text(formaNombre, 127, 505);

      doc.setFont('Helvetica', 'bold');
      doc.text('Descripción de la lesión:', 17, 518);
      doc.setFont('Helvetica', 'normal');
      doc.line(122, 519, 580, 519);
      doc.text(descLesionNombre, 127, 518);

      doc.setFont('Helvetica', 'bold');
      doc.text('Zona del cuerpo afectada:', 17, 531);
      doc.setFont('Helvetica', 'normal');
      doc.line(122, 532, 580, 532);
      doc.text(zonaCuerpoNombre, 127, 531);

      doc.setFont('Helvetica', 'bold');
      doc.text('Agente material asociado:', 17, 544);
      doc.setFont('Helvetica', 'normal');
      doc.line(122, 545, 580, 545);
      doc.text(agenteNombre, 127, 544);

      // SECCIÓN IMÁGENES (Y=565)
      doc.setFillColor(60, 120, 216);
      doc.setLineDashPattern([], 0);
      doc.rect(14, 565, 567, 13, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('Helvetica', 'bold');
      doc.text('Imágenes', 18, 574);

      // Contenedor de imágenes (Y=590, alto 210 para dejar espacio al pie)
      doc.setDrawColor(0, 0, 0);
      doc.rect(14, 590, 567, 210);

      // Si existen imágenes, dibujamos las primeras en un grid simple de 2x2
      if (fotosFiles && fotosFiles.length > 0) {
        const drawPhotosCount = Math.min(fotosFiles.length, 4);
        for (let i = 0; i < drawPhotosCount; i++) {
          const photo = fotosFiles[i];
          const x = 14 + (i % 2) * 283.5;
          const y = 590 + Math.floor(i / 2) * 105;
          try {
            if (photo.preview) {
              const base64 = photo.preview.startsWith('data:image') 
                ? photo.preview 
                : await getBase64ImageFromUrl(photo.preview);
              if (base64) {
                const resized = await resizeImage(base64, 250, 95);
                doc.addImage(resized, 'PNG', x + 16, y + 5, 250, 95);
              }
            }
          } catch (phErr) {
            console.error('Error dibujando foto index:', i, phErr);
          }
        }
      } else {
        doc.setFont('Helvetica', 'normal');
        doc.setTextColor(150, 150, 150);
        doc.text('No se han cargado evidencias fotográficas en el registro del siniestro.', 297, 690, { align: 'center' });
      }

      // Footer Página 1
      doc.setTextColor(0, 0, 0);
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(7);
      doc.text(`${tenant?.name || 'Gestión SySO'}  |  Tel: ${profile?.telefono || '—'}  |  Email: ${profile?.email || '—'}`, 14, 825);
      doc.setFontSize(9);
      doc.text('Página 1', 545, 825);

      // ───────────────────────────────────────────────────────────────────────
      // PAGINA 2: Análisis y Cierre
      // ───────────────────────────────────────────────────────────────────────
      doc.addPage();

      // Barra azul "Acciones preventivas" (Y=64)
      doc.setFillColor(60, 120, 216);
      doc.rect(14, 64, 567, 13, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(7);
      doc.text('Acciones preventivas', 18, 73);

      // Estructura de Tabla Acciones Preventivas (Y=90, alto 126)
      const preventivas = report.acciones_preventivas || [];
      const tableDataPrev = [];
      for (let i = 0; i < 4; i++) {
        const item = preventivas[i] || {};
        tableDataPrev.push([
          item.descripcion || '',
          item.responsable || '',
          item.fecha_planificada || '',
          item.fecha_implementacion || ''
        ]);
      }

      autoTable(doc, {
        startY: 90,
        margin: { left: 14, right: 14 },
        theme: 'grid',
        styles: {
          font: 'Helvetica',
          fontSize: 7,
          cellPadding: 4,
          textColor: '#000000',
          lineColor: '#000000',
          lineWidth: 0.5
        },
        headStyles: {
          fillColor: '#D9D9D9',
          textColor: '#000000',
          fontStyle: 'bold',
          halign: 'center'
        },
        columnStyles: {
          0: { cellWidth: 299 },
          1: { cellWidth: 112 },
          2: { cellWidth: 75 },
          3: { cellWidth: 81 }
        },
        head: [['Acción preventiva', 'Responsable', 'Fecha planificada', 'Fecha de implementación']],
        body: tableDataPrev
      });

      // Y final de la tabla preventivas es aproximadamente 90 + 26 + (4 * 25) = 216 pt.
      
      // Barra azul "Análisis de la causa raíz" (Y=229)
      const rootCauseY = 229;
      doc.setFillColor(60, 120, 216);
      doc.rect(14, rootCauseY, 567, 13, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('Helvetica', 'bold');
      doc.text('Análisis de la causa raíz', 18, rootCauseY + 9);

      // Matriz 6M Ishikawa Superior (Y=254, alto 77)
      const ishikawa = report.ishikawa || {};
      const ishikawaY = 254;
      
      // Encabezados
      doc.setFillColor(217, 217, 217); // #D9D9D9
      doc.setTextColor(0, 0, 0);
      doc.rect(14, ishikawaY, 189, 12, 'F');
      doc.rect(203, ishikawaY, 189, 12, 'F');
      doc.rect(392, ishikawaY, 189, 12, 'F');
      
      doc.setFont('Helvetica', 'bold');
      doc.text('Material', 108.5, ishikawaY + 9, { align: 'center' });
      doc.text('Maquinaria', 297.5, ishikawaY + 9, { align: 'center' });
      doc.text('Método', 486.5, ishikawaY + 9, { align: 'center' });

      // Celdas de respuestas
      doc.rect(14, ishikawaY + 12, 189, 65);
      doc.rect(203, ishikawaY + 12, 189, 65);
      doc.rect(392, ishikawaY + 12, 189, 65);

      doc.setFont('Helvetica', 'normal');
      doc.text(ishikawa.material || '', 18, ishikawaY + 22, { maxWidth: 181 });
      doc.text(ishikawa.maquinaria || '', 207, ishikawaY + 22, { maxWidth: 181 });
      doc.text(ishikawa.metodo || '', 396, ishikawaY + 22, { maxWidth: 181 });

      // Matriz 6M Ishikawa Inferior (Y=344, alto 76)
      const ishikawaInfY = 344;
      
      // Encabezados
      doc.setFillColor(217, 217, 217);
      doc.rect(14, ishikawaInfY, 189, 12, 'F');
      doc.rect(203, ishikawaInfY, 189, 12, 'F');
      doc.rect(392, ishikawaInfY, 189, 12, 'F');

      doc.setFont('Helvetica', 'bold');
      doc.text('Mano de obra', 108.5, ishikawaInfY + 9, { align: 'center' });
      doc.text('Medio', 297.5, ishikawaInfY + 9, { align: 'center' });
      doc.text('Medida', 486.5, ishikawaInfY + 9, { align: 'center' });

      // Celdas de respuestas
      doc.rect(14, ishikawaInfY + 12, 189, 64);
      doc.rect(203, ishikawaInfY + 12, 189, 64);
      doc.rect(392, ishikawaInfY + 12, 189, 64);

      doc.setFont('Helvetica', 'normal');
      doc.text(ishikawa.mano_de_obra || '', 18, ishikawaInfY + 22, { maxWidth: 181 });
      doc.text(ishikawa.medio || '', 207, ishikawaInfY + 22, { maxWidth: 181 });
      doc.text(ishikawa.medida || '', 396, ishikawaInfY + 22, { maxWidth: 181 });

      // 5 Porqués (Y=434, alto 89)
      const porquesY = 434;
      const porques = report.cinco_porques || [];
      const colWidth = 113.4; // 567 / 5

      // Encabezados
      doc.setFillColor(217, 217, 217);
      doc.setFont('Helvetica', 'bold');
      for (let i = 0; i < 5; i++) {
        const px = 14 + (i * colWidth);
        doc.rect(px, porquesY, colWidth, 12, 'F');
        doc.text(`${i + 1}° ¿Por qué?`, px + (colWidth / 2), porquesY + 9, { align: 'center' });
      }

      // Celdas de respuestas
      for (let i = 0; i < 5; i++) {
        const px = 14 + (i * colWidth);
        doc.rect(px, porquesY + 12, colWidth, 65);
        doc.setFont('Helvetica', 'normal');
        doc.text(porques[i] || '', px + 4, porquesY + 22, { maxWidth: colWidth - 8 });
      }

      // Fila Entonces (Y=511, alto 12)
      doc.setFillColor(217, 217, 217);
      doc.rect(14, porquesY + 77, 567, 12, 'F');
      doc.setFont('Helvetica', 'bold');
      doc.text('Entonces', 297, porquesY + 86, { align: 'center' });

      // Causa raíz (Y=540)
      doc.setFont('Helvetica', 'bold');
      doc.text('Causa raíz:', 17, 550);
      doc.setFont('Helvetica', 'normal');
      doc.text(report.causa_raiz || '', 80, 550, { maxWidth: 500 });

      // Barra azul "Acciones correctivas" (Y=603)
      const correctY = 603;
      doc.setFillColor(60, 120, 216);
      doc.rect(14, correctY, 567, 13, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('Helvetica', 'bold');
      doc.text('Acciones correctivas', 18, correctY + 9);

      // Tabla Acciones Correctivas (Y=629)
      const correctivas = report.acciones_correctivas || [];
      const tableDataCorr = [];
      for (let i = 0; i < 4; i++) {
        const item = correctivas[i] || {};
        tableDataCorr.push([
          item.descripcion || '',
          item.responsable || '',
          item.fecha_planificada || '',
          item.fecha_implementacion || ''
        ]);
      }

      autoTable(doc, {
        startY: 629,
        margin: { left: 14, right: 14 },
        theme: 'grid',
        styles: {
          font: 'Helvetica',
          fontSize: 7,
          cellPadding: 4,
          textColor: '#000000',
          lineColor: '#000000',
          lineWidth: 0.5
        },
        headStyles: {
          fillColor: '#D9D9D9',
          textColor: '#000000',
          fontStyle: 'bold',
          halign: 'center'
        },
        columnStyles: {
          0: { cellWidth: 299 },
          1: { cellWidth: 112 },
          2: { cellWidth: 75 },
          3: { cellWidth: 81 }
        },
        head: [['Acción correctiva', 'Responsable', 'Fecha planificada', 'Fecha de implementación']],
        body: tableDataCorr
      });

      // Firmas al pie (Y=814)
      const signatureY = 804;
      doc.setLineDashPattern([1, 2], 0);
      doc.setDrawColor(0, 0, 0);
      // Responsable de la empresa
      doc.line(61, signatureY, 240, signatureY);
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(7);
      doc.text('Firma y aclaración del responsable de la', 150, signatureY + 8, { align: 'center' });
      doc.text('empresa', 150, signatureY + 16, { align: 'center' });

      // Responsable de Higiene y Seguridad
      doc.line(354, signatureY, 533, signatureY);
      doc.text('Firma y aclaración del responsable de Higiene y', 443, signatureY + 8, { align: 'center' });
      doc.text('Seguridad', 443, signatureY + 16, { align: 'center' });

      // Footer Página 2
      doc.setLineDashPattern([], 0);
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(7);
      doc.text(`${tenant?.name || 'Gestión SySO'}  |  Tel: ${profile?.telefono || '—'}  |  Email: ${profile?.email || '—'}`, 14, 825);
      doc.setFontSize(9);
      doc.text('Página 2', 545, 825);

      // Guardar PDF
      const pdfName = `Informe_Investigacion_${nombreApellido.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
      doc.save(pdfName);
      triggerToast('Reporte PDF descargado con éxito.');
    } catch (pdfErr) {
      console.error(pdfErr);
      triggerToast('Error al generar el archivo PDF.', 'error');
    }
  };

  // ── Guardar accidente ─────────────────────────────────────────────────────
  const handleSave = async (e) => {
    e.preventDefault();

    if (!empresaId) { triggerToast('La Razón Social es obligatoria.', 'error'); return; }
    if (!establecimientoId) { triggerToast('El Establecimiento es obligatorio.', 'error'); return; }
    if (!nombreApellido.trim()) { triggerToast('El nombre y apellido del accidentado es obligatorio.', 'error'); return; }
    if (!tipo) { triggerToast('El Tipo es obligatorio.', 'error'); return; }
    if (!gravedad) { triggerToast('La Gravedad es obligatoria.', 'error'); return; }

    setSaveLoading(true);
    try {
      console.log('DEBUG handleSave - starting save. State values:', {
        denunciaUrl,
        informeUrl,
        denunciaFile: denunciaFile ? denunciaFile.name : null,
        informeFile: informeFile ? informeFile.name : null
      });

      console.log('DEBUG handleSave - Fotos y Firmas:', {
        fotosFilesCount: fotosFiles.length,
        fotosFiles: fotosFiles.map(f => ({ name: f.file ? f.file.name : null, path: f.path, preview: f.preview?.substring(0, 50) })),
        hasSignedResp,
        hasSignedProf,
        firmaTipo,
        firmaRespCanvas: !!firmaRespCanvasRef.current,
        firmaProfCanvas: !!firmaProfCanvasRef.current,
        firmaRespSavedUrl,
        firmaProfSavedUrl,
        firmaResponsableAclaracion,
        firmaProfesionalAclaracion
      });

      // Subir archivos si corresponde
      let finalDenunciaUrl = denunciaUrl;
      let finalInformeUrl = informeUrl;

      // Salvaguarda: Si el url en el estado es 'N/A' o vacío, pero en la base de datos ya existía un archivo válido, no sobrescribirlo (a menos que haya sido eliminado explícitamente)
      if (editingId) {
        const existingAcc = accidentes.find(a => a.id === editingId);
        if (existingAcc) {
          if (!denunciaDeleted && (!finalDenunciaUrl || finalDenunciaUrl === 'N/A') && existingAcc.denuncia_accidente_url && existingAcc.denuncia_accidente_url !== 'N/A') {
            finalDenunciaUrl = existingAcc.denuncia_accidente_url;
          }
          if (!informeDeleted && (!finalInformeUrl || finalInformeUrl === 'N/A') && existingAcc.informe_investigacion_url && existingAcc.informe_investigacion_url !== 'N/A') {
            finalInformeUrl = existingAcc.informe_investigacion_url;
          }
        }
      }

      if (denunciaFile) finalDenunciaUrl = await uploadPdf(denunciaFile, 'denuncia');
      if (informeFile) finalInformeUrl = await uploadPdf(informeFile, 'informe');

      // Procesar firmas
      let finalFirmaRespUrl = firmaRespSavedUrl;
      let finalFirmaProfUrl = firmaProfSavedUrl;

      if (!isDevMode) {
        if (hasSignedResp && firmaRespCanvasRef.current) {
          finalFirmaRespUrl = await uploadSignatureBlob(firmaRespCanvasRef.current, 'resp');
        }
        if (firmaTipo === 'mano' && hasSignedProf && firmaProfCanvasRef.current) {
          finalFirmaProfUrl = await uploadSignatureBlob(firmaProfCanvasRef.current, 'prof');
        } else if (firmaTipo === 'perfil') {
          const selectedMember = miembrosList.find(m => (m.full_name || '').trim() === firmaProfesionalAclaracion.trim());
          if (selectedMember && selectedMember.signature_url) {
            finalFirmaProfUrl = selectedMember.signature_url;
          }
        }
      } else {
        if (hasSignedResp) finalFirmaRespUrl = 'mock-resp-signature.png';
        if (hasSignedProf) finalFirmaProfUrl = 'mock-prof-signature.png';
      }

      // Procesar fotos adjuntas
      const uploadedFotoPaths = [];
      for (let i = 0; i < fotosFiles.length; i++) {
        const foto = fotosFiles[i];
        if (foto.file) {
          const uploadedPath = await uploadImageToStorage(foto.file, 'siniestro_foto');
          uploadedFotoPaths.push(uploadedPath);
        } else if (foto.path) {
          uploadedFotoPaths.push(foto.path);
        }
      }

      const payload = {
        tenant_id: isDevMode ? 'mock-tenant' : tenant.id,
        empresa_id: empresaId,
        establecimiento_id: establecimientoId,
        area_sector: areaSector.trim() || null,
        puesto_operacion: puestoOperacion.trim() || null,
        nombre_apellido: nombreApellido.trim(),
        cuil: cuil.replace(/[^0-9]/g, '') || null,
        fecha_siniestro: convertToDbDate(fechaSiniestro) || null,
        hora: hora || null,
        fecha_denuncia: convertToDbDate(fechaDenuncia) || null,
        nro_siniestro: nroSiniestro.trim() || null,
        tipo,
        gravedad,
        descripcion_hechos: descripcionHechos.trim() || null,
        forma_accidente_id: formaAccidenteId || null,
        descripcion_lesion_id: descripcionLesionId || null,
        zona_cuerpo_id: zonaCuerpoId || null,
        agente_material_id: agenteMaterialId || null,
        diagnostico: diagnostico.trim() || null,
        fecha_alta_rechazo: convertToDbDate(fechaAltaRechazo) || null,
        dias_baja: diasBaja,
        denuncia_accidente_url: finalDenunciaUrl || null,
        informe_investigacion_url: finalInformeUrl || null,
        observaciones: observaciones.trim() || null,
        fecha_ingreso: convertToDbDate(fechaIngreso) || null,
        turno_trabajo: turnoTrabajo.trim() || null,
        jornada_habitual: jornadaHabitual.trim() || null,
        antiguedad_empresa: antiguedadEmpresa.trim() || null,
        antiguedad_puesto: antiguedadPuesto.trim() || null,
        domicilio_ocurrencia: (domicilioOcurrenciaSelect === 'Otro' ? domicilioOcurrenciaOtro.trim() : domicilioOcurrenciaSelect) || null,
        provincia_ocurrencia: provinciaOcurrencia || null,
        partido_ocurrencia: partidoOcurrencia || null,
        localidad_barrio_ocurrencia: localidadBarrioOcurrencia || null,
        fotos_urls: uploadedFotoPaths,
        firma_tipo: firmaTipo,
        firma_responsable_aclaracion: firmaResponsableAclaracion.trim() || null,
        firma_profesional_aclaracion: firmaProfesionalAclaracion.trim() || null,
        firma_responsable_empresa: finalFirmaRespUrl || null,
        firma_profesional: finalFirmaProfUrl || null,
        updated_at: new Date().toISOString(),
      };

      if (isDevMode) {
        if (editingId) {
          setAccidentes(prev => prev.map(a => a.id === editingId ? { ...a, ...payload } : a));
          triggerToast('Accidente actualizado (Mock).');
        } else {
          setAccidentes(prev => [{ id: 'mock-' + Date.now(), ...payload, created_at: new Date().toISOString() }, ...prev]);
          triggerToast('Accidente registrado (Mock).');
        }
      } else {
        if (editingId) {
          const { error } = await supabase.from('accidentes').update(payload).eq('id', editingId);
          if (error) throw error;
          triggerToast('Accidente actualizado exitosamente.');
        } else {
          const { error } = await supabase.from('accidentes').insert([{ ...payload, created_at: new Date().toISOString() }]);
          if (error) throw error;
          triggerToast('Accidente registrado exitosamente.');
        }
        await loadRealData();
      }

      handleCloseForm();
    } catch (err) {
      console.error('Error al guardar accidente:', err);
      triggerToast(err.message || 'Error al guardar.', 'error');
    } finally {
      setSaveLoading(false);
    }
  };

  // ── Editar ────────────────────────────────────────────────────────────────
  const handleEditClick = (acc, readOnly = false) => {
    setIsReadOnlyView(readOnly || profile?.role === 'cliente');
    setEditingId(acc.id);
    setEmpresaId(acc.empresa_id || '');
    setEstablecimientoId(acc.establecimiento_id || '');
    setAreaSector(acc.area_sector || '');
    setPuestoOperacion(acc.puesto_operacion || '');
    setNombreApellido(acc.nombre_apellido || '');
    setCuil(acc.cuil || '');
    setFechaSiniestro(formatDate(acc.fecha_siniestro) || '');
    setHora(acc.hora || '');
    setFechaDenuncia(formatDate(acc.fecha_denuncia) || '');
    setNroSiniestro(acc.nro_siniestro || '');
    setTipo(acc.tipo || '');
    setGravedad(acc.gravedad || '');
    setDescripcionHechos(acc.descripcion_hechos || '');
    setFormaAccidenteId(acc.forma_accidente_id || '');
    setDescripcionLesionId(acc.descripcion_lesion_id || '');
    setZonaCuerpoId(acc.zona_cuerpo_id || '');
    setAgenteMaterialId(acc.agente_material_id || '');
    setDiagnostico(acc.diagnostico || '');
    setFechaAltaRechazo(formatDate(acc.fecha_alta_rechazo) || '');
    setObservaciones(acc.observaciones || '');
    // Nuevos campos
    setFechaIngreso(formatDate(acc.fecha_ingreso) || '');
    setTurnoTrabajo(acc.turno_trabajo || '');
    setJornadaHabitual(acc.jornada_habitual || '');
    setAntiguedadEmpresa(acc.antiguedad_empresa || '');
    setAntiguedadPuesto(acc.antiguedad_puesto || '');

    const estabs = allEstablecimientos.filter(e => e.empresa_id === acc.empresa_id);
    const matchingEstab = estabs.find(e => e.direccion === acc.domicilio_ocurrencia);
    if (matchingEstab) {
      setDomicilioOcurrenciaSelect(acc.domicilio_ocurrencia || '');
      setDomicilioOcurrenciaOtro('');
    } else {
      setDomicilioOcurrenciaSelect(acc.domicilio_ocurrencia ? 'Otro' : '');
      setDomicilioOcurrenciaOtro(acc.domicilio_ocurrencia || '');
    }

    setProvinciaOcurrencia(acc.provincia_ocurrencia || '');
    setPartidoOcurrencia(acc.partido_ocurrencia || '');
    setLocalidadBarrioOcurrencia(acc.localidad_barrio_ocurrencia || '');

    if (acc.fotos_urls && acc.fotos_urls.length > 0) {
      const mapped = acc.fotos_urls.map((path, index) => ({
        file: null,
        preview: acc.fotos_signed_urls?.[index] || '/brand/logo-primary.png',
        path
      }));
      setFotosFiles(mapped);
    } else {
      setFotosFiles([]);
    }

    // Archivos
    setDenunciaDeleted(false);
    setInformeDeleted(false);
    setDenunciaUrl(acc.denuncia_accidente_url || '');
    setDenunciaFile(null);
    setDenunciaFileName(acc.denuncia_accidente_url ? 'Archivo existente' : '');
    setInformeUrl(acc.informe_investigacion_url || '');
    setInformeFile(null);
    setInformeFileName(acc.informe_investigacion_url ? 'Archivo existente' : '');

    // Firmas
    setFirmaTipo(acc.firma_tipo || 'perfil');
    setFirmaResponsableAclaracion(acc.firma_responsable_aclaracion || '');
    setFirmaProfesionalAclaracion(acc.firma_profesional_aclaracion || '');
    setFirmaRespSavedUrl('');
    setFirmaProfSavedUrl('');
    setHasSignedResp(false);
    setHasSignedProf(false);

    if (acc.firma_responsable_empresa) {
      const cleanedPath = cleanSignaturePath(acc.firma_responsable_empresa);
      supabase.storage
        .from('signatures')
        .createSignedUrl(cleanedPath, 3600)
        .then(({ data }) => {
          if (data?.signedUrl) {
            setFirmaRespSavedUrl(data.signedUrl);
            setHasSignedResp(true);
          }
        });
    }

    if (acc.firma_profesional) {
      const cleanedPath = cleanSignaturePath(acc.firma_profesional);
      supabase.storage
        .from('signatures')
        .createSignedUrl(cleanedPath, 3600)
        .then(({ data }) => {
          if (data?.signedUrl) {
            setFirmaProfSavedUrl(data.signedUrl);
            setHasSignedProf(true);
          }
        });
    }

    setIsFormOpen(true);
  };

  // ── Eliminar ──────────────────────────────────────────────────────────────
  const handleDeleteClick = (id) => {
    setModalAlert({
      show: true,
      title: '¿Eliminar Accidente?',
      message: 'Esta acción eliminará de forma permanente el registro del accidente seleccionado y no se podrá deshacer.',
      confirmText: 'Eliminar',
      onConfirm: async () => {
        try {
          if (isDevMode) {
            setAccidentes(prev => prev.filter(a => a.id !== id));
            triggerToast('Accidente eliminado (Mock).');
          } else {
            const { error } = await supabase.from('accidentes').delete().eq('id', id);
            if (error) throw error;
            triggerToast('Accidente eliminado exitosamente.');
            await loadRealData();
          }
          handleCloseForm();
        } catch (err) {
          triggerToast('No tienes permisos para realizar esta acción.', 'error');
        } finally {
          closeAlert();
        }
      },
    });
  };

  const getImageDimensions = (base64) => {
    return new Promise((resolve) => {
      if (!base64 || typeof window === 'undefined') {
        resolve({ width: 180, height: 90 });
        return;
      }
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.naturalWidth || img.width, height: img.naturalHeight || img.height });
      };
      img.onerror = () => {
        resolve({ width: 180, height: 90 });
      };
      img.src = base64;
    });
  };

  // ── Lógica de Generación, Descarga y Guardado del Informe de IA en PDF ──
  const [saveReportLoading, setSaveReportLoading] = useState(false);

  const generateTechnicalReportPdfDoc = async (report, accData) => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'a4'
    });

    let logoBase64 = '';
    try {
      if (tenant && tenant.logo_1_url) {
        logoBase64 = await getBase64ImageFromUrl(tenant.logo_1_url);
      }
    } catch (logoErr) {
      console.warn('No se pudo descargar el logo del tenant:', logoErr);
    }
    if (!logoBase64) {
      try {
        logoBase64 = await getBase64ImageFromUrl('/brand/logo-primary.png');
      } catch (defLogoErr) {
        console.warn('No se pudo cargar el logo por defecto:', defLogoErr);
      }
    }
    if (logoBase64) {
      logoBase64 = await resizeImage(logoBase64, 150, 150);
    }

    const drawHeaderAndFooter = (pageNumber) => {
      if (logoBase64) {
        try {
          doc.addImage(logoBase64, 'PNG', 14, 10, 80, 40);
        } catch (imgErr) {
          console.error('Error inyectando el logo en el PDF:', imgErr);
        }
      }

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text('INFORME DE INVESTIGACIÓN DE ACCIDENTE / ENFERMEDAD PROFESIONAL', 581, 29, { align: 'right' });

      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.5);
      doc.line(14, 53, 581, 53);

      const footerText = `${tenant?.name || 'Gestión SySO'}  |  Tel: ${profile?.phone || profile?.telefono || '—'}  |  Email: ${profile?.email || 'sebastian.merlassino@gestionsyso.com'}`;
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.5);
      doc.line(14, 815, 581, 815);
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(0, 0, 0);
      doc.text(footerText, 297.5, 825, { align: 'center' });
      doc.text(`Página ${pageNumber} de 3`, 581, 825, { align: 'right' });
    };

    // ==========================================
    // PAGINA 1: IDENTIFICACION Y SINIESTRO
    // ==========================================
    drawHeaderAndFooter(1);

    doc.setFillColor(60, 120, 216);
    doc.rect(14, 64, 567, 13, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(7);
    doc.text('Datos del empleador', 18, 73);

    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('Razón Social:', 17, 92);
    doc.setFont('Helvetica', 'normal');
    doc.text(getEmpresaNombre(accData.empresa_id) || '—', 75, 92);

    doc.setFont('Helvetica', 'bold');
    doc.text('CUIT:', 276, 92);
    doc.setFont('Helvetica', 'normal');
    const empCuit = empresas.find(e => e.id === accData.empresa_id)?.cuit || '—';
    doc.text(empCuit, 302, 92);

    // Dirección del establecimiento seleccionado (sola en la fila)
    doc.setFont('Helvetica', 'bold');
    doc.text('Dirección:', 17, 107);
    doc.setFont('Helvetica', 'normal');
    const estab = allEstablecimientos.find(e => e.id === accData.establecimiento_id) || {};
    const estabDireccion = accData.establecimiento_direccion || estab.direccion || '—';
    const estabLocalidad = accData.establecimiento_localidad || estab.localidad_barrio || '—';
    const estabPartido = accData.establecimiento_partido || estab.partido || '—';
    const estabProvincia = accData.establecimiento_provincia || estab.provincia || '—';
    doc.text(estabDireccion, 62, 107, { maxWidth: 470 });

    doc.setFont('Helvetica', 'bold');
    doc.text('Provincia:', 17, 122);
    doc.setFont('Helvetica', 'normal');
    doc.text(estabProvincia, 65, 122);

    doc.setFont('Helvetica', 'bold');
    doc.text('Partido:', 200, 122);
    doc.setFont('Helvetica', 'normal');
    doc.text(estabPartido, 235, 122);

    doc.setFont('Helvetica', 'bold');
    doc.text('Localidad/Barrio:', 380, 122);
    doc.setFont('Helvetica', 'normal');
    doc.text(estabLocalidad, 455, 122);

    doc.setFillColor(60, 120, 216);
    doc.rect(14, 143, 567, 13, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('Helvetica', 'bold');
    doc.text('Datos del trabajador', 18, 152);

    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('Apellido y nombre del accidentado:', 17, 171);
    doc.setFont('Helvetica', 'normal');
    doc.text(accData.nombre_trabajador || accData.nombre_apellido || '—', 158, 171);

    doc.setFont('Helvetica', 'bold');
    doc.text('CUIL:', 276, 171);
    doc.setFont('Helvetica', 'normal');
    doc.text(accData.cuil || '—', 305, 171);

    doc.setFont('Helvetica', 'bold');
    doc.text('Fecha Ingreso:', 17, 186);
    doc.setFont('Helvetica', 'normal');
    doc.text(formatDate(accData.fecha_ingreso) || '—', 80, 186);

    doc.setFont('Helvetica', 'bold');
    doc.text('Turno Trabajo:', 276, 186);
    doc.setFont('Helvetica', 'normal');
    doc.text(accData.turno_trabajo || '—', 335, 186);

    doc.setFont('Helvetica', 'bold');
    doc.text('Jornada Habitual:', 415, 186);
    doc.setFont('Helvetica', 'normal');
    doc.text(accData.jornada_habitual || '—', 490, 186);

    doc.setFont('Helvetica', 'bold');
    doc.text('Antigüedad Empresa:', 17, 201);
    doc.setFont('Helvetica', 'normal');
    doc.text(accData.antiguedad_empresa || '—', 105, 201);

    doc.setFont('Helvetica', 'bold');
    doc.text('Antigüedad Puesto:', 276, 201);
    doc.setFont('Helvetica', 'normal');
    doc.text(accData.antiguedad_puesto || '—', 355, 201);

    doc.setFont('Helvetica', 'bold');
    doc.text('Puesto de Trabajo:', 17, 216);
    doc.setFont('Helvetica', 'normal');
    doc.text(accData.puesto_operacion || '—', 95, 216);

    doc.setFont('Helvetica', 'bold');
    doc.text('Área/Sector:', 276, 216);
    doc.setFont('Helvetica', 'normal');
    doc.text(accData.area_sector || '—', 330, 216);

    doc.setFillColor(60, 120, 216);
    doc.rect(14, 237, 567, 13, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('Helvetica', 'bold');
    doc.text('Datos del siniestro', 18, 246);

    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('Fecha Accidente / Siniestro:', 17, 265);
    doc.setFont('Helvetica', 'normal');
    doc.text(formatDate(accData.fecha_siniestro) || '—', 132, 265);

    doc.setFont('Helvetica', 'bold');
    doc.text('Hora:', 276, 265);
    doc.setFont('Helvetica', 'normal');
    doc.text(accData.hora || '—', 302, 265);

    doc.setFont('Helvetica', 'bold');
    doc.text('Fecha Denuncia:', 17, 280);
    doc.setFont('Helvetica', 'normal');
    doc.text(formatDate(accData.fecha_denuncia) || '—', 92, 280);

    doc.setFont('Helvetica', 'bold');
    doc.text('N° de Siniestro ART:', 276, 280);
    doc.setFont('Helvetica', 'normal');
    doc.text(accData.nro_siniestro || '—', 368, 280);

    // Domicilio de Ocurrencia del siniestro (solo en la fila)
    doc.setFont('Helvetica', 'bold');
    doc.text('Domicilio Ocurrencia:', 17, 295);
    doc.setFont('Helvetica', 'normal');
    doc.text(accData.domicilio_ocurrencia || '—', 115, 295, { maxWidth: 460 });

    // Fila de abajo: Provincia, Partido, Localidad/Barrio
    doc.setFont('Helvetica', 'bold');
    doc.text('Provincia:', 17, 310);
    doc.setFont('Helvetica', 'normal');
    doc.text(accData.provincia_ocurrencia || '—', 65, 310);

    doc.setFont('Helvetica', 'bold');
    doc.text('Partido:', 200, 310);
    doc.setFont('Helvetica', 'normal');
    doc.text(accData.partido_ocurrencia || '—', 235, 310);

    doc.setFont('Helvetica', 'bold');
    doc.text('Localidad/Barrio:', 380, 310);
    doc.setFont('Helvetica', 'normal');
    doc.text(accData.localidad_barrio_ocurrencia || '—', 455, 310);

    doc.setFont('Helvetica', 'bold');
    doc.text('Tipo:', 17, 322);
    doc.setFont('Helvetica', 'normal');
    doc.text(accData.tipo || '—', 42, 322);

    doc.setFont('Helvetica', 'bold');
    doc.text('Gravedad:', 276, 322);
    doc.setFont('Helvetica', 'normal');
    doc.text(accData.gravedad || '—', 324, 322);

    // Campos de clasificación uno por renglón completo (reposicionados tras remover fecha alta / días baja)
    doc.setFont('Helvetica', 'bold');
    doc.text('Forma Accidente:', 17, 337);
    doc.setFont('Helvetica', 'normal');
    doc.text(getFormaName(accData.forma_accidente_id) || '—', 92, 337, { maxWidth: 470 });

    doc.setFont('Helvetica', 'bold');
    doc.text('Agente Material:', 17, 352);
    doc.setFont('Helvetica', 'normal');
    doc.text(getAgenteName(accData.agente_material_id) || '—', 88, 352, { maxWidth: 470 });

    doc.setFont('Helvetica', 'bold');
    doc.text('Descripción Lesión:', 17, 367);
    doc.setFont('Helvetica', 'normal');
    doc.text(getDescLesionName(accData.descripcion_lesion_id) || '—', 100, 367, { maxWidth: 470 });

    doc.setFont('Helvetica', 'bold');
    doc.text('Zona Cuerpo:', 17, 382);
    doc.setFont('Helvetica', 'normal');
    doc.text(getZonaName(accData.zona_cuerpo_id) || '—', 78, 382, { maxWidth: 470 });

    doc.setFont('Helvetica', 'bold');
    doc.text('Diagnóstico Médico:', 17, 397);
    doc.setFont('Helvetica', 'normal');
    doc.text(accData.diagnostico || '—', 102, 397, { maxWidth: 470 });

    doc.setFont('Helvetica', 'bold');
    doc.text('Descripción de los hechos denunciados:', 17, 417);
    const descHechosLines = doc.splitTextToSize(accData.descripcion_hechos || '—', 560);
    const descHechosHeight = descHechosLines.length * 12;
    doc.setFont('Helvetica', 'normal');
    doc.text(descHechosLines, 17, 429);

    // Extraer fotos desde fotos_urls o fotos_files según corresponda para la visualización en el reporte técnico PDF
    let fotos = [];
    if (accData.fotos_urls && accData.fotos_urls.length > 0) {
      fotos = accData.fotos_urls;
    } else if (accData.fotos_files && accData.fotos_files.length > 0) {
      fotos = accData.fotos_files.map(f => f.path || f.preview).filter(Boolean);
    }

    if (fotos.length > 0) {
      const evidenciasTitleY = Math.max(530, 429 + descHechosHeight + 15);
      const fotosY = evidenciasTitleY + 22;

      doc.setFillColor(60, 120, 216);
      doc.rect(14, evidenciasTitleY, 567, 13, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('Helvetica', 'bold');
      doc.text('Imágenes', 18, evidenciasTitleY + 9);

      const loadedBase64Fotos = [];
      for (const pathOrUrl of fotos) {
        try {
          if (pathOrUrl.startsWith('data:') || pathOrUrl.startsWith('mock') || pathOrUrl.startsWith('/') || pathOrUrl.startsWith('http') || pathOrUrl.startsWith('blob:')) {
            if (pathOrUrl.startsWith('data:')) {
              loadedBase64Fotos.push(pathOrUrl);
            } else if (pathOrUrl.startsWith('http') || pathOrUrl.startsWith('blob:')) {
              const b64 = await getBase64ImageFromUrl(pathOrUrl);
              loadedBase64Fotos.push(b64);
            } else {
              loadedBase64Fotos.push('/brand/logo-primary.png');
            }
          } else {
            const { data } = await supabase.storage.from('documents').createSignedUrl(pathOrUrl, 3600);
            if (data?.signedUrl) {
              const b64 = await getBase64ImageFromUrl(data.signedUrl);
              loadedBase64Fotos.push(b64);
            }
          }
        } catch (fErr) {
          console.warn('Error cargando foto para PDF:', fErr);
        }
      }

      const maxDraw = Math.min(loadedBase64Fotos.length, 3);
      for (let i = 0; i < maxDraw; i++) {
        const fX = 14 + (i * 192);
        try {
          doc.rect(fX, fotosY, 180, 120);
          const format = loadedBase64Fotos[i].startsWith('data:image/png') ? 'PNG' : 'JPEG';
          doc.addImage(loadedBase64Fotos[i], format, fX + 2, fotosY + 2, 176, 116);
        } catch (drawImgErr) {
          console.error(drawImgErr);
        }
      }
    }

    // ==========================================
    // PAGINA 2: ACCIONES PREVENTIVAS E ISHIKAWA
    // ==========================================
    doc.addPage();
    drawHeaderAndFooter(2);

    doc.setFillColor(60, 120, 216);
    doc.rect(14, 64, 567, 13, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('Helvetica', 'bold');
    doc.text('Acciones preventivas propuestas', 18, 73);

    const preventivas = report.acciones_preventivas || [];
    const tableDataPrev = preventivas.map(item => [
      item.descripcion || '—',
      item.responsable || '—',
      item.fecha_planificada || '—'
    ]);

    autoTable(doc, {
      startY: 90,
      margin: { left: 14, right: 14 },
      theme: 'grid',
      styles: {
        font: 'Helvetica',
        fontSize: 7,
        cellPadding: 4,
        textColor: '#000000',
        lineColor: '#000000',
        lineWidth: 0.5
      },
      headStyles: {
        fillColor: '#D9D9D9',
        textColor: '#000000',
        fontStyle: 'bold',
        halign: 'center'
      },
      columnStyles: {
        0: { cellWidth: 320 },
        1: { cellWidth: 140 },
        2: { cellWidth: 106.5 }
      },
      head: [['Acción preventiva propuesta', 'Responsable de ejecución', 'Plazo planificado']],
      body: tableDataPrev.length > 0 ? tableDataPrev : [['— No se registraron acciones preventivas —', '—', '—']]
    });

    const ishikawaY = doc.lastAutoTable.finalY + 15;

    doc.setFillColor(60, 120, 216);
    doc.rect(14, ishikawaY, 567, 13, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('Helvetica', 'bold');
    doc.text('Método de análisis de causa: Diagrama de Ishikawa (6M)', 18, ishikawaY + 9);

    const ish = report.ishikawa || {};
    const ishData = [
      ['Mano de Obra:', ish.mano_de_obra || 'N/A', 'Maquinaria:', ish.maquinaria || 'N/A'],
      ['Materiales:', ish.material || 'N/A', 'Método:', ish.metodo || 'N/A'],
      ['Medio Ambiente:', ish.medio || 'N/A', 'Medida:', ish.medida || 'N/A']
    ];

    autoTable(doc, {
      startY: ishikawaY + 18,
      margin: { left: 14, right: 14 },
      theme: 'grid',
      styles: {
        font: 'Helvetica',
        fontSize: 7,
        cellPadding: 4,
        textColor: '#000000',
        lineColor: '#000000',
        lineWidth: 0.5
      },
      headStyles: {
        fillColor: '#E2E8F0',
        textColor: '#000000',
        fontStyle: 'bold'
      },
      columnStyles: {
        0: { cellWidth: 80, fontStyle: 'bold', fillColor: '#F8FAFC' },
        1: { cellWidth: 200 },
        2: { cellWidth: 80, fontStyle: 'bold', fillColor: '#F8FAFC' },
        3: { cellWidth: 206.5 }
      },
      body: ishData
    });

    const porquesY = doc.lastAutoTable.finalY + 15;

    doc.setFillColor(60, 120, 216);
    doc.rect(14, porquesY, 567, 13, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('Helvetica', 'bold');
    doc.text('Método de los 5 Porqués', 18, porquesY + 9);

    const porques = report.cinco_porques || [];
    const colWidth = 567 / 5;
    
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7);
    const alturasCalculadas = [];
    for (let i = 0; i < 5; i++) {
      const lines = doc.splitTextToSize(porques[i] || '', colWidth - 8);
      alturasCalculadas.push(Math.max(65, lines.length * 9 + 15));
    }
    const maxPorqueHeight = Math.max(...alturasCalculadas);

    for (let i = 0; i < 5; i++) {
      const px = 14 + (i * colWidth);
      doc.setDrawColor(0, 0, 0);
      doc.setFillColor(217, 217, 217);
      doc.rect(px, porquesY + 18, colWidth, 12, 'FD');
      doc.setTextColor(0, 0, 0);
      doc.setFont('Helvetica', 'bold');
      
      const labelText = i < 4 ? `${i + 1}° ¿Por qué? ->` : `${i + 1}° ¿Por qué?`;
      doc.text(labelText, px + (colWidth / 2), porquesY + 27, { align: 'center' });

      doc.setDrawColor(0, 0, 0);
      doc.rect(px, porquesY + 30, colWidth, maxPorqueHeight);
      doc.setFont('Helvetica', 'normal');
      doc.text(porques[i] || '—', px + 4, porquesY + 40, { maxWidth: colWidth - 8 });

      // Celda "← entonces" debajo de cada cuadro de detalle
      doc.setFillColor(245, 245, 245);
      doc.rect(px, porquesY + 30 + maxPorqueHeight, colWidth, 12, 'FD');
      doc.setFont('Helvetica', 'bold');
      doc.text('<- Entonces', px + (colWidth / 2), porquesY + 30 + maxPorqueHeight + 9, { align: 'center' });
    }

    const causaRaizY = porquesY + 30 + maxPorqueHeight + 12 + 15;
    doc.setFillColor(60, 120, 216);
    doc.rect(14, causaRaizY, 567, 13, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('Helvetica', 'bold');
    doc.text('Causa Raíz Identificada', 18, causaRaizY + 9);

    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(report.causa_raiz || '—', 17, causaRaizY + 24, { maxWidth: 560 });

    // ==========================================
    // PAGINA 3: ACCIONES CORRECTIVAS Y FIRMAS
    // ==========================================
    doc.addPage();
    drawHeaderAndFooter(3);

    doc.setFillColor(60, 120, 216);
    doc.rect(14, 64, 567, 13, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('Helvetica', 'bold');
    doc.text('Acciones correctivas propuestas', 18, 73);

    const correctivas = report.acciones_correctivas || [];
    const tableDataCorr = correctivas.map(item => [
      item.descripcion || '—',
      item.responsable || '—',
      item.fecha_planificada || '—'
    ]);

    autoTable(doc, {
      startY: 90,
      margin: { left: 14, right: 14 },
      theme: 'grid',
      styles: {
        font: 'Helvetica',
        fontSize: 7,
        cellPadding: 4,
        textColor: '#000000',
        lineColor: '#000000',
        lineWidth: 0.5
      },
      headStyles: {
        fillColor: '#D9D9D9',
        textColor: '#000000',
        fontStyle: 'bold',
        halign: 'center'
      },
      columnStyles: {
        0: { cellWidth: 320 },
        1: { cellWidth: 140 },
        2: { cellWidth: 106.5 }
      },
      head: [['Acción correctiva propuesta', 'Responsable de ejecución', 'Plazo planificado']],
      body: tableDataCorr.length > 0 ? tableDataCorr : [['— No se registraron acciones correctivas —', '—', '—']]
    });

    const signatureY = 680;

    console.log('DEBUG PDF - hasSignedResp:', hasSignedResp, 'firmaRespCanvasRef.current:', !!firmaRespCanvasRef.current, 'firmaRespSavedUrl:', !!firmaRespSavedUrl);
    console.log('DEBUG PDF - firmaTipo:', firmaTipo, 'firmaPerfilPreviewUrl:', !!firmaPerfilPreviewUrl, 'hasSignedProf:', hasSignedProf, 'firmaProfCanvasRef.current:', !!firmaProfCanvasRef.current, 'firmaProfSavedUrl:', !!firmaProfSavedUrl);

    let finalFirmaRespBase64 = '';
    try {
      if (hasSignedResp && firmaRespCanvasRef.current) {
        finalFirmaRespBase64 = firmaRespCanvasRef.current.toDataURL('image/png');
      } else if (firmaRespSavedUrl) {
        finalFirmaRespBase64 = await getBase64ImageFromUrl(firmaRespSavedUrl);
      }
    } catch (eSig) {
      console.warn('Error al obtener la firma del responsable para PDF:', eSig);
    }

    let finalFirmaProfBase64 = '';
    try {
      if (firmaTipo === 'perfil' && firmaPerfilPreviewUrl) {
        finalFirmaProfBase64 = await getBase64ImageFromUrl(firmaPerfilPreviewUrl);
      } else if (firmaTipo === 'mano') {
        if (hasSignedProf && firmaProfCanvasRef.current) {
          finalFirmaProfBase64 = firmaProfCanvasRef.current.toDataURL('image/png');
        } else if (firmaProfSavedUrl) {
          finalFirmaProfBase64 = await getBase64ImageFromUrl(firmaProfSavedUrl);
        }
      }
    } catch (eSigProf) {
      console.warn('Error al obtener la firma del profesional para PDF:', eSigProf);
    }

    // Resolver dimensiones de la firma del responsable
    let respWidth = 180;
    let respHeight = 90;
    let respX = 61;
    let respY = signatureY - 95;

    if (finalFirmaRespBase64) {
      try {
        const dimensions = await getImageDimensions(finalFirmaRespBase64);
        const ratio = dimensions.width / dimensions.height;
        // Escalar con un ancho máximo de 180 y alto máximo de 90
        respWidth = 180;
        respHeight = respWidth / ratio;
        if (respHeight > 90) {
          respHeight = 90;
          respWidth = respHeight * ratio;
        }
        // Centrar en el espacio de 61 a 240 (ancho de 179)
        const centerX = 61 + 179 / 2;
        respX = centerX - respWidth / 2;
        respY = signatureY - respHeight - 5;
      } catch (errSigDim) {
        console.warn('Error resolviendo dimensiones de la firma del responsable:', errSigDim);
      }
    }

    // Resolver dimensiones de la firma del profesional
    let profWidth = 130;
    let profHeight = 90;
    let profX = 379;
    let profY = signatureY - 95;

    if (finalFirmaProfBase64) {
      try {
        const dimensions = await getImageDimensions(finalFirmaProfBase64);
        const ratio = dimensions.width / dimensions.height;
        // Escalar con un ancho máximo de 130 y alto máximo de 100
        profWidth = 130;
        profHeight = profWidth / ratio;
        if (profHeight > 100) {
          profHeight = 100;
          profWidth = profHeight * ratio;
        }
        // Centrar en el espacio de 354 a 533 (ancho de 179)
        const centerX = 354 + 179 / 2;
        profX = centerX - profWidth / 2;
        profY = signatureY - profHeight - 5;
      } catch (errSigDim2) {
        console.warn('Error resolviendo dimensiones de la firma del profesional:', errSigDim2);
      }
    }

    if (finalFirmaRespBase64) {
      try {
        doc.addImage(finalFirmaRespBase64, 'PNG', respX, respY, respWidth, respHeight);
      } catch (errSig1) {
        console.error('Error dibujando firma del responsable en PDF:', errSig1);
      }
    }
    doc.setLineDashPattern([1, 2], 0);
    doc.setDrawColor(0, 0, 0);
    doc.line(61, signatureY, 240, signatureY);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(0, 0, 0);
    doc.text('Firma y aclaración del responsable de la empresa', 150, signatureY + 8, { align: 'center' });
    doc.setFont('Helvetica', 'bold');
    doc.text(firmaResponsableAclaracion || '—', 150, signatureY + 18, { align: 'center' });

    if (finalFirmaProfBase64) {
      try {
        doc.addImage(finalFirmaProfBase64, 'PNG', profX, profY, profWidth, profHeight);
      } catch (errSig2) {
        console.error('Error dibujando firma del profesional en PDF:', errSig2);
      }
    }
    doc.line(354, signatureY, 533, signatureY);
    doc.setFont('Helvetica', 'normal');
    doc.text('Firma y aclaración del profesional de Higiene y Seguridad', 443, signatureY + 8, { align: 'center' });
    doc.setFont('Helvetica', 'bold');
    doc.text(firmaProfesionalAclaracion || '—', 443, signatureY + 18, { align: 'center' });

    return doc;
  };

  const handleExportTechnicalReportPdf = async (report, accData) => {
    try {
      triggerToast('Generando reporte PDF...', 'info');
      const doc = await generateTechnicalReportPdfDoc(report, accData);
      const pdfName = `Informe_Investigacion_${accData.nombre_apellido?.replace(/\s+/g, '_') || 'Accidente'}_${Date.now()}.pdf`;
      doc.save(pdfName);
      triggerToast('Reporte PDF descargado con éxito.');
    } catch (pdfErr) {
      console.error(pdfErr);
      triggerToast('Error al generar el archivo PDF.', 'error');
    }
  };

  const handleSaveTechnicalReportToSiniestro = async (report, accData) => {
    const yaExiste = accData.informe_investigacion_url || informeUrl;
    if (yaExiste) {
      setModalAlert({
        show: true,
        title: 'Reemplazar informe existente',
        message: 'Ya existe un informe de investigación guardado para este siniestro. ¿Deseas reemplazarlo con la nueva versión?',
        confirmText: 'Reemplazar',
        onConfirm: () => {
          closeAlert();
          executeSaveTechnicalReportToSiniestro(report, accData);
        }
      });
    } else {
      executeSaveTechnicalReportToSiniestro(report, accData);
    }
  };

  const executeSaveTechnicalReportToSiniestro = async (report, accData) => {
    setSaveReportLoading(true);
    try {
      triggerToast('Generando reporte PDF...', 'info');
      const doc = await generateTechnicalReportPdfDoc(report, accData);
      
      const pdfBlob = doc.output('blob');
      const pdfName = `Informe_Investigacion_${accData.nombre_apellido?.replace(/\s+/g, '_') || 'Accidente'}_${Date.now()}.pdf`;
      const pdfFile = new File([pdfBlob], pdfName, { type: 'application/pdf' });

      if (editingId) {
        let finalPath = '';
        if (isDevMode) {
          finalPath = `mock-path/${pdfName}`;
        } else {
          finalPath = await uploadPdf(pdfFile, 'informe_investigacion');
        }

        if (isDevMode) {
          setAccidentes(prev => prev.map(a => a.id === editingId ? { ...a, informe_investigacion_url: finalPath } : a));
        } else {
          const { error } = await supabase
            .from('accidentes')
            .update({ informe_investigacion_url: finalPath, updated_at: new Date().toISOString() })
            .eq('id', editingId);
          if (error) throw error;
          console.log('DEBUG executeSaveTechnicalReportToSiniestro - DB update successful for id:', editingId, 'with path:', finalPath);
          await loadRealData();
        }
        console.log('DEBUG executeSaveTechnicalReportToSiniestro - setting informeUrl state to:', finalPath);
        setInformeUrl(finalPath);
        setInformeFileName(pdfName);
        triggerToast('Informe técnico guardado en el siniestro con éxito.');
      } else {
        setInformeFile(pdfFile);
        setInformeFileName(pdfName);
        setInformeUrl(URL.createObjectURL(pdfBlob));
        triggerToast('Informe preparado. Se guardará automáticamente al registrar el siniestro.');
      }
    } catch (err) {
      console.error('Error al guardar el informe en el siniestro:', err);
      triggerToast('Error al guardar el informe en el siniestro.', 'error');
    } finally {
      setSaveReportLoading(false);
    }
  };

  // ── Cierre de formulario ──────────────────────────────────────────────────
  const handleExitForm = () => {
    if (isReadOnlyView) { handleCloseForm(); return; }
    setModalAlert({
      show: true,
      title: 'Salir sin guardar',
      message: '¿Estás seguro de que deseas salir del formulario? Perderás los cambios no guardados.',
      confirmText: 'Confirmar',
      onConfirm: () => { closeAlert(); handleCloseForm(); },
    });
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingId(null);
    setIsReadOnlyView(profile?.role === 'cliente' ? true : false);
    // Reset form
    setEmpresaId(''); setEstablecimientoId(''); setAreaSector(''); setPuestoOperacion('');
    setNombreApellido(''); setCuil(''); setFechaSiniestro(''); setHora(''); setFechaDenuncia('');
    setNroSiniestro(''); setTipo(''); setGravedad(''); setDescripcionHechos('');
    setFormaAccidenteId(''); setDescripcionLesionId(''); setZonaCuerpoId(''); setAgenteMaterialId('');
    setDiagnostico(''); setFechaAltaRechazo(''); setDiasBaja(null); setObservaciones('');
    setDenunciaFile(null); setDenunciaFileName(''); setDenunciaUrl('');
    setInformeFile(null); setInformeFileName(''); setInformeUrl('');
    setDenunciaDeleted(false);
    setInformeDeleted(false);
    setFechaIngreso('');
    setTurnoTrabajo('');
    setJornadaHabitual('');
    setAntiguedadEmpresa('');
    setAntiguedadPuesto('');
    setDomicilioOcurrenciaSelect('');
    setDomicilioOcurrenciaOtro('');
    setProvinciaOcurrencia('');
    setPartidoOcurrencia('');
    setLocalidadBarrioOcurrencia('');
    setPartidosOcurrencia([]);
    setLocalidadesOcurrencia([]);
    setFotosFiles([]);
    // Limpieza de firmas
    setFirmaTipo('perfil');
    setFirmaResponsableAclaracion('');
    setFirmaProfesionalAclaracion(profile?.role !== 'cliente' ? (profile?.full_name || '') : '');
    setFirmaRespSavedUrl('');
    setFirmaProfSavedUrl('');
    setHasSignedResp(false);
    setHasSignedProf(false);
    setSignaturePath('');
    setFirmaPerfilPreviewUrl('');
  };

  // ── Navegación del sidebar ────────────────────────────────────────────────
  const handleSidebarNavigation = (e, path) => {
    if (!isFormOpen) return;
    if (isReadOnlyView) {
      if (path.endsWith('/accidentes')) { handleCloseForm(); } else { window.location.href = path; }
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
        if (path.endsWith('/accidentes')) { handleCloseForm(); } else { window.location.href = path; }
      },
    });
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen bg-[#D9D9D9] overflow-hidden font-sans text-slate-700">
      {/* ── Sidebar ── */}
      <Sidebar
        tenantSlug={tenantSlug}
        profile={profile}
        currentSection="accidentes"
        isSidebarCollapsed={isSidebarCollapsed}
        toggleSidebar={toggleSidebar}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
        handleLogout={handleLogout}
        onNavigate={handleSidebarNavigation}
      />

      {/* ── Main Container ── */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        
        {/* ── Header Estático ── */}
        <AppPageHeader
          title="Registro y Seguimiento de Accidentes y Enfermedades profesionales"
          icon={ShieldAlert}
          tenantName={tenant?.name || 'Cargando...'}
          planId={tenant?.plan_id}
          showPlanBadge={profile && profile.role !== 'cliente'}
          setIsMobileMenuOpen={setIsMobileMenuOpen}
        />

        {loading ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-[#468DFF] mx-auto" />
              <p className="text-xs text-slate-500 font-semibold">Cargando siniestros...</p>
            </div>
          </div>
        ) : (
          <div className="max-w-[95%] mx-auto w-full py-8 px-4 md:px-0 flex-1 flex flex-col min-h-0">
            
            {isFormOpen ? (
              /* ────────── VISTA FORMULARIO UNIFICADO ────────── */
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col max-h-[85vh] animate-fade-in">
                
                {/* Encabezado del Formulario */}
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
                      {editingId
                        ? isReadOnlyView ? 'Detalle de Siniestro' : 'Editar Registro de Siniestro'
                        : 'Registrar Nuevo Siniestro'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={handleExitForm} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-200 cursor-pointer">
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                <form onSubmit={handleSave} className="p-6 space-y-6 overflow-y-auto flex-1 scrollbar-thin">
                  <fieldset disabled={isFormDisabled} className="space-y-6">

                    {/* SECCIÓN 1: Datos del empleador */}
                    <div className="space-y-4">
                      <span className="font-outfit text-sm font-bold text-slate-800 border-b border-slate-100 pb-1.5 uppercase tracking-wider flex items-center gap-2">
                        <Building className="h-4 w-4 text-[#468DFF]" />
                        Datos del empleador
                      </span>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {/* Razón Social */}
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1.5">Razón Social <span className="text-red-500">*</span></label>
                          <select
                            value={empresaId}
                            onChange={e => { setEmpresaId(e.target.value); setEstablecimientoId(''); }}
                            required
                            className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-700 focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all cursor-pointer disabled:opacity-50 disabled:bg-slate-50/50"
                          >
                            <option value="">Seleccioná una empresa</option>
                            {empresas.map(emp => <option key={emp.id} value={emp.id}>{emp.razon_social}</option>)}
                          </select>
                        </div>

                        {/* CUIT */}
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1.5">CUIT</label>
                          <input
                            type="text"
                            value={empresas.find(e => e.id === empresaId)?.cuit || ''}
                            disabled
                            placeholder="Seleccioná un cliente..."
                            className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-700 bg-slate-100/60 font-mono transition-all disabled:opacity-70 disabled:bg-slate-100"
                          />
                        </div>

                        {/* Establecimiento */}
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1.5">Establecimiento <span className="text-red-500">*</span></label>
                          <select
                            value={establecimientoId}
                            onChange={e => setEstablecimientoId(e.target.value)}
                            required
                            disabled={!empresaId}
                            className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-700 focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all cursor-pointer disabled:opacity-50 disabled:bg-slate-50/50"
                          >
                            <option value="">Seleccioná un establecimiento</option>
                            {filteredEstabs.map(est => <option key={est.id} value={est.id}>{est.denominacion}</option>)}
                          </select>
                        </div>

                        {/* Dirección del establecimiento */}
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1.5">Dirección</label>
                          <input
                            type="text"
                            value={allEstablecimientos.find(est => est.id === establecimientoId)?.direccion || ''}
                            disabled
                            placeholder="Dirección del establecimiento..."
                            className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-700 bg-slate-100/60 transition-all disabled:opacity-70 disabled:bg-slate-100"
                          />
                        </div>

                        {/* Provincia del establecimiento */}
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1.5">Provincia</label>
                          <input
                            type="text"
                            value={allEstablecimientos.find(est => est.id === establecimientoId)?.provincia || ''}
                            disabled
                            placeholder="Provincia..."
                            className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-700 bg-slate-100/60 transition-all disabled:opacity-70 disabled:bg-slate-100"
                          />
                        </div>

                        {/* Partido del establecimiento */}
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1.5">Partido</label>
                          <input
                            type="text"
                            value={allEstablecimientos.find(est => est.id === establecimientoId)?.partido || ''}
                            disabled
                            placeholder="Partido..."
                            className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-700 bg-slate-100/60 transition-all disabled:opacity-70 disabled:bg-slate-100"
                          />
                        </div>

                        {/* Localidad / Barrio del establecimiento */}
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1.5">Localidad / Barrio</label>
                          <input
                            type="text"
                            value={allEstablecimientos.find(est => est.id === establecimientoId)?.localidad_barrio || ''}
                            disabled
                            placeholder="Localidad / Barrio..."
                            className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-700 bg-slate-100/60 transition-all disabled:opacity-70 disabled:bg-slate-100"
                          />
                        </div>
                      </div>
                    </div>

                    {/* SECCIÓN 2: Datos del trabajador */}
                    <div className="space-y-4">
                      <span className="font-outfit text-sm font-bold text-slate-800 border-b border-slate-100 pb-1.5 uppercase tracking-wider flex items-center gap-2">
                        <Users className="h-4 w-4 text-[#468DFF]" />
                        Datos del trabajador
                      </span>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {/* Apellido y nombre del accidentado */}
                        <div className="md:col-span-2">
                          <label className="block text-xs font-bold text-slate-600 mb-1.5">Apellido y nombre del accidentado <span className="text-red-500">*</span></label>
                          <input
                            type="text"
                            value={nombreApellido}
                            onChange={e => setNombreApellido(e.target.value)}
                            required
                            placeholder="Ej.: Pérez, Juan Carlos"
                            className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-700 focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all disabled:opacity-70 disabled:bg-slate-50/50"
                          />
                        </div>

                        {/* CUIL */}
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1.5">CUIL <span className="text-[10px] font-normal text-slate-400">(11 dígitos sin guiones)</span></label>
                          <input
                            type="text"
                            value={cuil}
                            onChange={e => {
                              const v = e.target.value.replace(/[^0-9]/g, '').slice(0, 11);
                              setCuil(v);
                            }}
                            maxLength={11}
                            placeholder="20304445556"
                            className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-700 focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all disabled:opacity-70 disabled:bg-slate-50/50 font-mono"
                          />
                        </div>

                        {/* Área / Sector de trabajo */}
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1.5">Área / Sector de trabajo</label>
                          <input
                            type="text"
                            value={areaSector}
                            onChange={e => setAreaSector(e.target.value)}
                            placeholder="Ej.: Producción"
                            className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-700 focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all disabled:opacity-70 disabled:bg-slate-50/50"
                          />
                        </div>

                        {/* Puesto / Operación de trabajo al momento del accidente o detección de la enfermedad profesional */}
                        <div className="md:col-span-2">
                          <label className="block text-xs font-bold text-slate-600 mb-1.5">Puesto / Operación de trabajo al momento del accidente o detección de la enfermedad profesional</label>
                          <input
                            type="text"
                            value={puestoOperacion}
                            onChange={e => setPuestoOperacion(e.target.value)}
                            placeholder="Ej.: Operario de línea al momento del evento"
                            className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-700 focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all disabled:opacity-70 disabled:bg-slate-50/50"
                          />
                        </div>

                        {/* Fecha de ingreso a la empresa */}
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1.5">Fecha de ingreso a la empresa</label>
                          <div className="relative">
                            <input
                              type="text"
                              placeholder="DD/MM/YYYY"
                              maxLength={10}
                              value={fechaIngreso}
                              onChange={e => setFechaIngreso(formatAsDateInput(e.target.value))}
                              disabled={isFormDisabled}
                              className="w-full border border-slate-200 rounded-xl pl-3.5 pr-10 py-2 text-sm text-slate-700 focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all disabled:opacity-70 disabled:bg-slate-50/50 font-mono"
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-slate-400 hover:text-[#468DFF] flex items-center">
                              <Calendar className="h-4 w-4" />
                              <input
                                type="date"
                                disabled={isFormDisabled}
                                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                onChange={e => {
                                  const val = e.target.value;
                                  if (val) {
    const parts = val.split('-');
    if (parts.length === 3) {
      setFechaIngreso(`${parts[2]}/${parts[1]}/${parts[0]}`);
    }
  } else {
    setFechaIngreso('');
  }
                                }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Turno de trabajo habitual */}
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1.5">Turno de trabajo habitual</label>
                          <input
                            type="text"
                            value={turnoTrabajo}
                            onChange={e => setTurnoTrabajo(e.target.value)}
                            placeholder="Ej.: Tarde"
                            className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-700 focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all disabled:opacity-70 disabled:bg-slate-50/50"
                          />
                        </div>

                        {/* Jornada habitual de trabajo */}
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1.5">Jornada habitual de trabajo</label>
                          <input
                            type="text"
                            value={jornadaHabitual}
                            onChange={e => setJornadaHabitual(e.target.value)}
                            placeholder="Ej.: Lunes a Viernes 8hs"
                            className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-700 focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all disabled:opacity-70 disabled:bg-slate-50/50"
                          />
                        </div>

                        {/* Antigüedad en la empresa */}
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1.5">Antigüedad en la empresa</label>
                          <input
                            type="text"
                            value={antiguedadEmpresa}
                            onChange={e => setAntiguedadEmpresa(e.target.value)}
                            placeholder="Ej.: 2 años y 3 meses"
                            className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-700 focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all disabled:opacity-70 disabled:bg-slate-50/50"
                          />
                        </div>

                        {/* Antigüedad en el puesto */}
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1.5">Antigüedad en el puesto</label>
                          <input
                            type="text"
                            value={antiguedadPuesto}
                            onChange={e => setAntiguedadPuesto(e.target.value)}
                            placeholder="Ej.: 1 año"
                            className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-700 focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all disabled:opacity-70 disabled:bg-slate-50/50"
                          />
                        </div>
                      </div>
                    </div>

                    {/* SECCIÓN 3: Información sobre el siniestro (Accidente de trabajo / Enfermedad profesional) */}
                    <div className="space-y-4">
                      <span className="font-outfit text-sm font-bold text-slate-800 border-b border-slate-100 pb-1.5 uppercase tracking-wider flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-[#468DFF]" />
                        Información sobre el siniestro (Accidente de trabajo / Enfermedad profesional)
                      </span>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {/* Fecha siniestro / reingreso */}
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1.5">Fecha siniestro / reingreso <span className="text-red-500">*</span></label>
                          <div className="relative">
                            <input
                              type="text"
                              required
                              placeholder="DD/MM/YYYY"
                              maxLength={10}
                              value={fechaSiniestro}
                              onChange={e => setFechaSiniestro(formatAsDateInput(e.target.value))}
                              disabled={isFormDisabled}
                              className="w-full border border-slate-200 rounded-xl pl-3.5 pr-10 py-2 text-sm text-slate-700 focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all disabled:opacity-70 disabled:bg-slate-50/50 font-mono"
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-slate-400 hover:text-[#468DFF] flex items-center">
                              <Calendar className="h-4 w-4" />
                              <input
                                type="date"
                                disabled={isFormDisabled}
                                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                onChange={e => {
                                  const val = e.target.value;
                                  if (val) {
    const parts = val.split('-');
    if (parts.length === 3) {
      setFechaSiniestro(`${parts[2]}/${parts[1]}/${parts[0]}`);
    }
  } else {
    setFechaSiniestro('');
  }
                                }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Hora */}
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1.5">Hora <span className="text-red-500">*</span></label>
                          <input
                            type="time"
                            required
                            value={hora}
                            onChange={e => setHora(e.target.value)}
                            className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-700 focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all disabled:opacity-70 disabled:bg-slate-50/50 font-mono"
                          />
                        </div>

                        {/* Fecha de denuncia */}
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1.5">Fecha de denuncia</label>
                          <div className="relative">
                            <input
                              type="text"
                              placeholder="DD/MM/YYYY"
                              maxLength={10}
                              value={fechaDenuncia}
                              onChange={e => setFechaDenuncia(formatAsDateInput(e.target.value))}
                              disabled={isFormDisabled}
                              className="w-full border border-slate-200 rounded-xl pl-3.5 pr-10 py-2 text-sm text-slate-700 focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all disabled:opacity-70 disabled:bg-slate-50/50 font-mono"
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-slate-400 hover:text-[#468DFF] flex items-center">
                              <Calendar className="h-4 w-4" />
                              <input
                                type="date"
                                disabled={isFormDisabled}
                                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                onChange={e => {
                                  const val = e.target.value;
                                  if (val) {
    const parts = val.split('-');
    if (parts.length === 3) {
      setFechaDenuncia(`${parts[2]}/${parts[1]}/${parts[0]}`);
    }
  } else {
    setFechaDenuncia('');
  }
                                }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* N° de siniestro (ART) */}
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1.5">N° de siniestro (ART)</label>
                          <input
                            type="text"
                            value={nroSiniestro}
                            onChange={e => setNroSiniestro(e.target.value)}
                            placeholder="Número de denuncia ART"
                            className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-700 focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all disabled:opacity-70 disabled:bg-slate-50/50"
                          />
                        </div>

                        {/* Domicilio de ocurrencia del accidente */}
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1.5">Domicilio de ocurrencia del accidente</label>
                          <select
                            value={domicilioOcurrenciaSelect}
                            onChange={e => handleDomicilioSelectChange(e.target.value)}
                            className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-700 focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all cursor-pointer disabled:opacity-50 disabled:bg-slate-50/50 text-slate-700 font-sans"
                          >
                            <option value="">Seleccioná una dirección</option>
                            {filteredEstabs.map(est => (
                              <option key={est.id} value={est.direccion}>{est.direccion} ({est.denominacion})</option>
                            ))}
                            <option value="Otro">Otro (agregar...)</option>
                          </select>
                        </div>

                        {/* Domicilio de ocurrencia Otro input */}
                        {domicilioOcurrenciaSelect === 'Otro' && (
                          <div className="md:col-span-2 xl:col-span-3 animate-fade-in">
                            <label className="block text-xs font-bold text-slate-600 mb-1.5">Especificar otro domicilio de ocurrencia <span className="text-red-500">*</span></label>
                            <input
                              type="text"
                              value={domicilioOcurrenciaOtro}
                              onChange={e => setDomicilioOcurrenciaOtro(e.target.value)}
                              required={domicilioOcurrenciaSelect === 'Otro'}
                              placeholder="Ingrese el domicilio (calle y número)"
                              className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-700 focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all disabled:opacity-70 disabled:bg-slate-50/50"
                            />
                          </div>
                        )}

                        {/* Provincia */}
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1.5">Provincia</label>
                          <select
                            value={provinciaOcurrencia}
                            onChange={e => { setProvinciaOcurrencia(e.target.value); setPartidoOcurrencia(''); setLocalidadBarrioOcurrencia(''); }}
                            disabled={isFormDisabled || domicilioOcurrenciaSelect !== 'Otro'}
                            className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-700 focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all cursor-pointer disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                          >
                            <option value="">Seleccionar Provincia...</option>
                            {PROVINCIAS_ARGENTINAS.map(p => <option key={p} value={p}>{p}</option>)}
                          </select>
                        </div>

                        {/* Partido */}
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1.5">Partido</label>
                          <select
                            value={partidoOcurrencia}
                            onChange={e => { setPartidoOcurrencia(e.target.value); setLocalidadBarrioOcurrencia(''); }}
                            disabled={isFormDisabled || domicilioOcurrenciaSelect !== 'Otro' || !provinciaOcurrencia}
                            className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-700 focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all cursor-pointer disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                          >
                            <option value="">Seleccionar Partido...</option>
                            {partidosOcurrencia.map(p => <option key={p} value={p}>{p}</option>)}
                          </select>
                        </div>

                        {/* Localidad/Barrio */}
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1.5">Localidad/Barrio</label>
                          <select
                            value={localidadBarrioOcurrencia}
                            onChange={e => setLocalidadBarrioOcurrencia(e.target.value)}
                            disabled={isFormDisabled || domicilioOcurrenciaSelect !== 'Otro' || !partidoOcurrencia}
                            className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-700 focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all cursor-pointer disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                          >
                            <option value="">Seleccionar Localidad/Barrio...</option>
                            {localidadesOcurrencia.map(l => <option key={l} value={l}>{l}</option>)}
                          </select>
                        </div>

                        {/* Tipo de accidente y Gravedad en la misma fila */}
                        <div className="md:col-span-2 xl:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Tipo */}
                          <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1.5">Tipo <span className="text-red-500">*</span></label>
                            <select
                              value={tipo}
                              onChange={e => setTipo(e.target.value)}
                              required
                              className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-700 focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all cursor-pointer disabled:opacity-50 disabled:bg-slate-50/50 text-slate-700"
                            >
                              <option value="">Seleccioná el tipo</option>
                              {TIPO_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                          </div>

                          {/* Gravedad */}
                          <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1.5 flex items-center gap-1.5">
                              Gravedad <span className="text-red-500">*</span>
                              <span
                                role="button"
                                onClick={() => setShowGravedadGuide(true)}
                                className="text-slate-400 hover:text-[#468DFF] transition-colors cursor-pointer inline-flex items-center"
                                title="Ver guía de clasificación de gravedad"
                              >
                                <HelpCircle className="h-3.5 w-3.5" />
                              </span>
                            </label>
                            <select
                              value={gravedad}
                              onChange={e => setGravedad(e.target.value)}
                              required
                              className={`w-full border rounded-xl px-3.5 py-2 text-sm font-bold focus:outline-none transition-colors disabled:opacity-70
                                ${gravedad === 'Leve' ? 'border-green-400 bg-green-100 text-green-800 focus:border-green-500' : ''}
                                ${gravedad === 'Grave' ? 'border-yellow-400 bg-yellow-100 text-yellow-800 focus:border-yellow-500' : ''}
                                ${gravedad === 'Mortal' ? 'border-red-400 bg-red-100 text-red-800 focus:border-red-500' : ''}
                                ${!gravedad ? 'border-slate-300 bg-slate-50 text-slate-700 focus:border-[#468DFF]' : ''}
                              `}
                            >
                              <option value="">Seleccioná la gravedad</option>
                              {GRAVEDAD_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
                            </select>
                          </div>
                        </div>

                        {/* Forma Accidente */}
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1.5">Forma Accidente</label>
                          <select
                            value={formaAccidenteId}
                            onChange={e => setFormaAccidenteId(e.target.value)}
                            disabled={isFormDisabled}
                            className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-700 focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all cursor-pointer disabled:opacity-50 disabled:bg-slate-50/50 text-slate-700 font-sans"
                          >
                            <option value="">Seleccionar Forma...</option>
                            {formasAccidente.map(f => <option key={f.id} value={f.id}>{f.nombre}</option>)}
                          </select>
                        </div>

                        {/* Agente Material Asociado */}
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1.5">Agente Material Asociado</label>
                          <select
                            value={agenteMaterialId}
                            onChange={e => setAgenteMaterialId(e.target.value)}
                            disabled={isFormDisabled}
                            className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-700 focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all cursor-pointer disabled:opacity-50 disabled:bg-slate-50/50 text-slate-700 font-sans"
                          >
                            <option value="">Seleccionar Agente...</option>
                            {agentesMateriales.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                          </select>
                        </div>

                        {/* Descripción Lesión */}
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1.5">Descripción Lesión</label>
                          <select
                            value={descripcionLesionId}
                            onChange={e => setDescripcionLesionId(e.target.value)}
                            disabled={isFormDisabled}
                            className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-700 focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all cursor-pointer disabled:opacity-50 disabled:bg-slate-50/50 text-slate-700 font-sans"
                          >
                            <option value="">Seleccionar Lesión...</option>
                            {descripcionesLesion.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
                          </select>
                        </div>

                        {/* Zona Cuerpo */}
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1.5">Zona Cuerpo</label>
                          <select
                            value={zonaCuerpoId}
                            onChange={e => setZonaCuerpoId(e.target.value)}
                            disabled={isFormDisabled}
                            className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-700 focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all cursor-pointer disabled:opacity-50 disabled:bg-slate-50/50 text-slate-700 font-sans"
                          >
                            <option value="">Seleccionar Zona...</option>
                            {zonasCuerpo.map(z => <option key={z.id} value={z.id}>{z.nombre}</option>)}
                          </select>
                        </div>

                        {/* Diagnóstico Médico */}
                        <div className="md:col-span-2 xl:col-span-3">
                          <div className="flex items-center justify-between gap-2 min-h-[28px] mb-1.5">
                            <label className="block text-xs font-bold text-slate-600 mb-0">Diagnóstico Médico</label>
                            <AITextHelper
                              value={diagnostico}
                              onChange={setDiagnostico}
                              context="Diagnóstico médico formal emitido por la institución de salud o ART para el trabajador accidentado"
                              disabled={isReadOnlyView}
                            />
                          </div>
                          <textarea
                            value={diagnostico}
                            onChange={e => setDiagnostico(e.target.value)}
                            disabled={isFormDisabled}
                            rows={2}
                            placeholder="Ingrese el diagnóstico médico detallado..."
                            className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-700 focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all resize-y disabled:opacity-70 disabled:bg-slate-50/50 font-sans"
                          />
                        </div>

                        {/* Descripción de los hechos */}
                        <div className="md:col-span-2 xl:col-span-3">
                          <div className="flex items-center justify-between gap-2 min-h-[28px] mb-1.5">
                            <label className="block text-xs font-bold text-slate-600 mb-0">Descripción de los hechos <span className="text-red-500">*</span></label>
                            <AITextHelper
                              value={descripcionHechos}
                              onChange={setDescripcionHechos}
                              context="Descripción detallada de cómo ocurrió el accidente o incidente laboral"
                              disabled={isReadOnlyView}
                            />
                          </div>
                          <textarea
                            value={descripcionHechos}
                            onChange={e => setDescripcionHechos(e.target.value)}
                            required
                            rows={3}
                            placeholder="Describí cómo ocurrió el accidente..."
                            className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-700 focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all resize-y disabled:opacity-70 disabled:bg-slate-50/50"
                          />
                        </div>

                        {/* Imágenes */}
                        <div className="md:col-span-2 xl:col-span-3 space-y-2 pt-4">
                          <ImageUploadZone
                            label="Imágenes"
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
                            disabled={isFormDisabled}
                            maxSizeMB={5}
                            onToast={triggerToast}
                          />
                        </div>
                      </div>
                    </div>

                    {/* SECCIÓN 3: Alta / Seguimiento */}
                    <div className="space-y-4">
                      <span className="font-outfit text-sm font-bold text-slate-800 border-b border-slate-100 pb-1.5 uppercase tracking-wider flex items-center gap-2">
                        <Activity className="h-4 w-4 text-[#468DFF]" />
                        Alta / Seguimiento
                      </span>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Fecha de alta / rechazo */}
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1.5">Fecha de alta / rechazo</label>
                          <div className="relative">
                            <input
                              type="text"
                              placeholder="DD/MM/YYYY"
                              maxLength={10}
                              value={fechaAltaRechazo}
                              onChange={e => setFechaAltaRechazo(formatAsDateInput(e.target.value))}
                              disabled={isFormDisabled}
                              className="w-full border border-slate-200 rounded-xl pl-3.5 pr-10 py-2 text-sm text-slate-700 focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all disabled:opacity-70 disabled:bg-slate-50/50 font-mono"
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-slate-400 hover:text-[#468DFF] flex items-center">
                              <Calendar className="h-4 w-4" />
                              <input
                                type="date"
                                disabled={isFormDisabled}
                                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                onChange={e => {
                                  const val = e.target.value;
                                  if (val) {
    const parts = val.split('-');
    if (parts.length === 3) {
      setFechaAltaRechazo(`${parts[2]}/${parts[1]}/${parts[0]}`);
    }
  } else {
    setFechaAltaRechazo('');
  }
                                }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Días de baja (calculado) */}
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1.5">
                            Días de baja
                            <span className="ml-1 text-[10px] font-normal text-slate-400">(calculado automático)</span>
                          </label>
                          <div className={`w-full border rounded-xl px-3.5 py-2 text-sm font-semibold flex items-center gap-2 transition-all
                            ${diasBaja !== null ? 'bg-blue-50/50 border-blue-200 text-blue-700' : 'bg-slate-50/50 border-slate-200 text-slate-400'}`}>
                            <Clock className="h-4 w-4" />
                            {diasBaja !== null ? `${diasBaja} día${diasBaja !== 1 ? 's' : ''}` : '—'}
                          </div>
                        </div>

                        {/* Observaciones */}
                        <div className="md:col-span-3">
                          <div className="flex items-center justify-between gap-2 min-h-[28px] mb-1.5">
                            <label className="block text-xs font-bold text-slate-600 mb-0">Observaciones</label>
                            <AITextHelper
                              value={observaciones}
                              onChange={setObservaciones}
                              context="Observaciones y comentarios adicionales del reporte de accidente"
                              disabled={isReadOnlyView}
                            />
                          </div>
                          <textarea
                            value={observaciones}
                            onChange={e => setObservaciones(e.target.value)}
                            rows={2}
                            placeholder="Observaciones adicionales..."
                            className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-700 focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all resize-y disabled:opacity-70 disabled:bg-slate-50/50"
                          />
                      </div>
                    </div>
                  </div>
                  </fieldset>

                  {/* SECCIÓN 4: Documentos */}
                  <div className="space-y-4">
                      <span className="font-outfit text-sm font-bold text-slate-800 border-b border-slate-100 pb-1.5 uppercase tracking-wider flex items-center gap-2">
                        <Upload className="h-4 w-4 text-[#468DFF]" />
                        Documentos
                      </span>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Denuncia de accidente */}
                        <div>
                          <DocumentUploadZone
                            label="Denuncia de accidente"
                            file={denunciaFile}
                            fileName={denunciaFileName}
                            url={denunciaUrl}
                            signedUrl={editingId ? accidentes.find(a => a.id === editingId)?.denuncia_signed_url : ''}
                            onFileChange={handleDenunciaFileChange}
                            onDriveImportSuccess={(filePath) => {
                              setDenunciaUrl(filePath);
                              setDenunciaFileName('Archivo de Drive importado');
                            }}
                            onViewPdf={handleViewPdf}
                            onDelete={handleClearDenuncia}
                            disabled={isFormDisabled}
                            tenantId={tenant?.id}
                            onToast={triggerToast}
                          />
                        </div>

                        {/* Informe de investigación */}
                        <div>
                          <DocumentUploadZone
                            label="Informe de investigación de accidente"
                            file={informeFile}
                            fileName={informeFileName}
                            url={informeUrl}
                            signedUrl={editingId ? accidentes.find(a => a.id === editingId)?.informe_signed_url : ''}
                            onFileChange={handleInformeFileChange}
                            onDriveImportSuccess={(filePath) => {
                              setInformeUrl(filePath);
                              setInformeFileName('Archivo de Drive importado');
                            }}
                            onViewPdf={handleViewPdf}
                            onDelete={handleClearInforme}
                            disabled={isFormDisabled}
                            tenantId={tenant?.id}
                            onToast={triggerToast}
                          />
                        </div>
                      </div>
                    </div>

                    {/* SECCIÓN 5: Firmas */}
                    <div className="space-y-4 pt-4 border-t border-slate-100">
                      <h3 className="font-outfit text-sm font-bold text-slate-800 border-b border-slate-100 pb-1.5 uppercase tracking-wider flex items-center gap-2">
                        <Users className="h-4.5 w-4.5 text-[#468DFF]" />
                        5. Firmas
                      </h3>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Responsable del Establecimiento */}
                        <div className="space-y-2 flex flex-col">
                          <div className="flex flex-row justify-between items-end gap-2 min-h-[18px]">
                            <label className="text-xs font-bold text-slate-600 pr-2">Firma del Responsable del Establecimiento</label>
                            {!isReadOnlyView && (hasSignedResp || firmaRespSavedUrl) && (
                              <button
                                type="button"
                                onClick={() => {
                                  const canvas = firmaRespCanvasRef.current;
                                  if (canvas) {
                                    const ctx = canvas.getContext('2d');
                                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                                  }
                                  setHasSignedResp(false);
                                  setFirmaRespSavedUrl('');
                                }}
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
                                ref={firmaRespRefCallback}
                                width={400}
                                height={200}
                                className={`w-full h-full bg-white block ${!isReadOnlyView ? 'cursor-crosshair' : 'cursor-default'}`}
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
                              disabled={isReadOnlyView}
                              value={firmaResponsableAclaracion}
                              onChange={(e) => setFirmaResponsableAclaracion(e.target.value)}
                              placeholder="Nombre completo..."
                              className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all disabled:opacity-60 text-slate-700 font-semibold"
                            />
                          </div>
                        </div>

                        {/* Profesional Higiene y Seguridad */}
                        <div className="space-y-2 flex flex-col">
                          <div className="flex flex-row justify-between items-end gap-2 min-h-[18px]">
                            <label className="text-xs font-bold text-slate-600 pr-2">Firma del Profesional de Higiene y Seguridad</label>
                            {firmaTipo === 'mano' && !isReadOnlyView && (hasSignedProf || firmaProfSavedUrl) && (
                              <button
                                type="button"
                                onClick={() => {
                                  const canvas = firmaProfCanvasRef.current;
                                  if (canvas) {
                                    const ctx = canvas.getContext('2d');
                                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                                  }
                                  setHasSignedProf(false);
                                  setFirmaProfSavedUrl('');
                                }}
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
                                disabled={isReadOnlyView}
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
                                disabled={isReadOnlyView}
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
                              {firmaPerfilPreviewUrl ? (
                                <div className="flex flex-col items-center justify-center h-full w-full">
                                  <div className="bg-white border border-slate-200 rounded-lg p-2 max-w-[200px] h-[80px] flex items-center justify-center overflow-hidden shadow-sm">
                                    <img 
                                      src={firmaPerfilPreviewUrl} 
                                      alt="Firma Perfil" 
                                      className="max-w-full max-h-full object-contain"
                                    />
                                  </div>
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
                                  ref={firmaProfRefCallback}
                                  width={400}
                                  height={200}
                                  className={`w-full h-full bg-white block ${!isReadOnlyView ? 'cursor-crosshair' : 'cursor-default'}`}
                                />
                              )}
                              {!hasSignedProf && !firmaProfSavedUrl && (
                                <span className="absolute pointer-events-none text-[10px] text-slate-400 font-bold uppercase tracking-wider">Dibuje la firma aquí</span>
                              )}
                            </div>
                          )}

                          <div className="flex flex-col gap-1 pt-1.5">
                            <label className="text-xs font-bold text-slate-500">Profesional Interviniente</label>
                            {!isReadOnlyView ? (
                              <select
                                value={firmaProfesionalAclaracion}
                                onChange={(e) => {
                                  setFirmaProfesionalAclaracion(e.target.value);
                                  const selectedMember = miembrosList.find(m => m.full_name === e.target.value);
                                  if (selectedMember?.signature_url) {
                                    const cleanedPath = cleanSignaturePath(selectedMember.signature_url);
                                    supabase.storage
                                      .from('signatures')
                                      .createSignedUrl(cleanedPath, 3600)
                                      .then(({ data }) => {
                                        if (data?.signedUrl) {
                                          setFirmaPerfilPreviewUrl(data.signedUrl);
                                        }
                                      });
                                  } else {
                                    setFirmaPerfilPreviewUrl('');
                                  }
                                }}
                                className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 cursor-pointer font-semibold text-slate-700"
                              >
                                <option value="">Seleccionar profesional...</option>
                                {miembrosList.map(m => (
                                  <option key={m.id} value={m.full_name}>{m.full_name}</option>
                                ))}
                              </select>
                            ) : (
                              <input
                                type="text"
                                disabled
                                value={firmaProfesionalAclaracion || 'N/A'}
                                className="w-full border border-slate-200 bg-slate-100 text-slate-500 rounded-xl px-3.5 py-2 text-sm font-semibold"
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Botones del Formulario */}
                  <div className="flex justify-between items-center pt-6 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={handleExitForm}
                      className="inline-flex items-center justify-center px-5 h-[42px] bg-[#FFFFFF] text-[#468DFF] border border-[#468DFF] rounded-xl text-sm font-bold hover:bg-[#468DFF] hover:text-[#FFFFFF] hover:border-[#FFFFFF] transition-all active:scale-[0.98] cursor-pointer"
                    >
                      Salir
                    </button>
                    <div className="flex items-center gap-3">
                      {editingId && (
                        <button
                          type="button"
                          onClick={handleOpenAiModalForCurrentForm}
                          className="inline-flex items-center justify-center px-5 h-[42px] bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-sm font-bold gap-2 transition-all active:scale-[0.98] cursor-pointer shadow-sm"
                        >
                          <Sparkles className="h-4 w-4" />
                          Generar Informe IA
                        </button>
                      )}
                      {isReadOnlyView ? (
                        canEditar && (
                          <button
                            type="button"
                            onClick={() => setIsReadOnlyView(false)}
                            className="inline-flex items-center justify-center px-5 h-[42px] bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-bold transition-all active:scale-[0.98] cursor-pointer shadow-lg shadow-amber-500/10"
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
                              className="inline-flex items-center justify-center px-5 h-[42px] bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold transition-all active:scale-[0.98] cursor-pointer shadow-lg shadow-red-600/10 animate-fade-in"
                            >
                              Eliminar
                            </button>
                          )}
                          {!isFormDisabled && (
                            <button
                              type="submit"
                              disabled={saveLoading}
                              className="inline-flex items-center justify-center px-5 h-[42px] bg-[#468DFF] hover:bg-[#0511F2] text-white rounded-xl text-sm font-bold gap-2 transition-all active:scale-[0.98] cursor-pointer shadow-lg shadow-[#468DFF]/10 disabled:opacity-50"
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
              /* ────────── LISTADO (BÚSQUEDA, FILTROS Y TABLA) ────────── */
              <div className="space-y-6 flex-1 flex flex-col min-h-0">

                {/* Panel de Filtros y Búsqueda */}
                <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-sm space-y-3 shrink-0">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
                    {/* Espaciador para empujar el buscador a la derecha en desktop */}
                    <div className="hidden md:block flex-1"></div>

                    {/* Buscador */}
                    <div className="flex flex-col md:flex-row md:items-center gap-2 w-full md:w-auto">
                      <div className="relative w-full md:w-64">
                        <span className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none">
                          <Search className="h-4 w-4" />
                        </span>
                        <input
                          type="text"
                          placeholder="Buscar por accidentado, N° siniestro, diagnóstico..."
                          value={filterText}
                          onChange={(e) => setFilterText(e.target.value)}
                          className="w-full pl-9 pr-3.5 py-1.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all text-slate-700 placeholder-slate-400 font-semibold"
                        />
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
                        {(filterEmpresa || filterEstablecimiento || filterFecha || filterTipo || filterGravedad) && (
                          <button
                            onClick={() => {
                              setFilterEmpresa('');
                              setFilterEstablecimiento('');
                              setFilterFecha('');
                              setFilterTipo('');
                              setFilterGravedad('');
                            }}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[10px] font-semibold cursor-pointer transition-all border border-slate-200"
                          >
                            Limpiar filtros
                          </button>
                        )}
                      </div>

                      {canCargar && (
                        <button
                          onClick={() => {
                            setIsReadOnlyView(false);
                            setEditingId(null);
                            handleCloseForm();
                            setTimeout(() => setIsFormOpen(true), 0);
                          }}
                          className="px-3 py-1.5 bg-[#468DFF] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-[#0511F2] transition-all cursor-pointer shadow-lg shadow-[#468DFF]/10 shrink-0 font-sans"
                        >
                          <PlusCircle className="h-3.5 w-3.5" />
                          Nuevo Siniestro
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
                              className="border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-600 focus:outline-none focus:border-[#468DFF] text-xs w-full cursor-pointer"
                            >
                              <option value="">Todas las empresas</option>
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

                        {/* Selector Año */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Filtrar por Año</label>
                          <input
                            type="text"
                            value={filterFecha}
                            onChange={(e) => setFilterFecha(e.target.value)}
                            placeholder="Año (ej: 2026)"
                            className="border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-600 focus:outline-none focus:border-[#468DFF] text-xs w-full cursor-pointer"
                          />
                        </div>

                        {/* Selector Tipo */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Filtrar por Tipo</label>
                          <select
                            value={filterTipo}
                            onChange={(e) => setFilterTipo(e.target.value)}
                            className="border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-600 focus:outline-none focus:border-[#468DFF] text-xs w-full cursor-pointer"
                          >
                            <option value="">Todos los tipos</option>
                            {TIPO_OPTIONS.map((t) => (
                              <option key={t} value={t}>{t}</option>
                            ))}
                          </select>
                        </div>

                        {/* Selector Gravedad */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Filtrar por Gravedad</label>
                          <select
                            value={filterGravedad}
                            onChange={(e) => setFilterGravedad(e.target.value)}
                            className="border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-600 focus:outline-none focus:border-[#468DFF] text-xs w-full cursor-pointer"
                          >
                            <option value="">Toda gravedad</option>
                            {GRAVEDAD_OPTIONS.map((g) => (
                              <option key={g} value={g}>{g}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Listado / Tabla */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col" style={{ height: showFilters ? 'calc(100vh - 310px)' : 'calc(100vh - 240px)' }}>
                  {filteredAccidentes.length === 0 ? (
                    <div className="flex-grow flex flex-col items-center justify-center p-8 text-center gap-3 h-full">
                      <AlertCircle className="h-10 w-10 text-slate-300" />
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-slate-800">No hay siniestros registrados</p>
                        <p className="text-xs text-slate-400">Registra un nuevo siniestro para comenzar.</p>
                      </div>
                      {canCargar && (
                        <button
                          onClick={() => {
                            setIsReadOnlyView(false);
                            setEditingId(null);
                            handleCloseForm();
                            setTimeout(() => setIsFormOpen(true), 0);
                          }}
                          className="px-4 py-2 mt-2 bg-[#468DFF] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-[#0511F2] transition-all cursor-pointer shadow-md shadow-[#468DFF]/10 shrink-0"
                        >
                          <PlusCircle className="h-3.5 w-3.5" />
                          Registrar siniestro
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="overflow-auto font-sans flex-grow h-full">
                      <table className="w-full text-left border-collapse min-w-[850px]">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-400 uppercase tracking-wider select-none">
                            <th
                              className="px-6 py-4 cursor-pointer hover:text-slate-700 transition-colors sticky top-0 z-10 bg-slate-50 border-b border-slate-200 whitespace-nowrap"
                              onClick={() => handleSort('empresa_id')}
                            >
                              <div className="flex items-center gap-1">
                                Empresa / Establecimiento <SortIcon field="empresa_id" />
                              </div>
                            </th>
                            <th
                              className="px-6 py-4 cursor-pointer hover:text-slate-700 transition-colors sticky top-0 z-10 bg-slate-50 border-b border-slate-200 whitespace-nowrap"
                              onClick={() => handleSort('nombre_apellido')}
                            >
                              <div className="flex items-center gap-1">
                                Accidentado <SortIcon field="nombre_apellido" />
                              </div>
                            </th>
                            <th
                              className="px-6 py-4 cursor-pointer hover:text-slate-700 transition-colors sticky top-0 z-10 bg-slate-50 border-b border-slate-200 whitespace-nowrap"
                              onClick={() => handleSort('fecha_siniestro')}
                            >
                              <div className="flex items-center gap-1">
                                Fecha siniestro <SortIcon field="fecha_siniestro" />
                              </div>
                            </th>
                            <th className="px-6 py-4 sticky top-0 z-10 bg-slate-50 border-b border-slate-200 whitespace-nowrap">
                              Tipo
                            </th>
                            <th
                              className="px-6 py-4 cursor-pointer hover:text-slate-700 transition-colors sticky top-0 z-10 bg-slate-50 border-b border-slate-200 whitespace-nowrap"
                              onClick={() => handleSort('gravedad')}
                            >
                              <div className="flex items-center gap-1">
                                Gravedad <SortIcon field="gravedad" />
                              </div>
                            </th>
                            <th className="px-6 py-4 text-center sticky top-0 z-10 bg-slate-50 border-b border-slate-200 whitespace-nowrap">
                              Días de baja
                            </th>
                            <th className="px-6 py-4 text-center sticky top-0 z-10 bg-slate-50 border-b border-slate-200 whitespace-nowrap">
                              Docs.
                            </th>
                            <th className="px-6 py-4 text-center sticky top-0 z-10 bg-slate-50 border-b border-slate-200 whitespace-nowrap">
                              Acciones
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs font-normal text-slate-700">
                          {filteredAccidentes.map(acc => {
                            const grav = GRAVEDAD_CONFIG[acc.gravedad] || {};
                            return (
                              <tr
                                key={acc.id}
                                className="hover:bg-slate-100 transition-colors cursor-pointer"
                                onClick={() => handleEditClick(acc, true)}
                              >
                                <td className="px-6 py-4 font-semibold text-slate-900">
                                  <span className="block">{getEmpresaNombre(acc.empresa_id)}</span>
                                  <span className="text-[10px] text-slate-400 font-normal block mt-0.5">{getEstabNombre(acc.establecimiento_id)}</span>
                                </td>
                                <td className="px-6 py-4 font-bold text-[#468DFF]">
                                  <span className="block">{acc.nombre_apellido}</span>
                                  {acc.cuil && <span className="text-slate-400 text-[10px] font-mono font-normal">CUIL: {acc.cuil}</span>}
                                </td>
                                <td className="px-6 py-4 text-slate-600 font-semibold whitespace-nowrap">
                                  {formatDate(acc.fecha_siniestro) || '—'}
                                </td>
                                <td className="px-6 py-4 text-slate-600 font-medium">
                                  {acc.tipo || '—'}
                                </td>
                                <td className="px-6 py-4">
                                  {acc.gravedad ? (
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold ${grav.badge}`}>
                                      <span className={`h-1.5 w-1.5 rounded-full ${grav.dot}`} />
                                      {acc.gravedad}
                                    </span>
                                  ) : '—'}
                                </td>
                                <td className="px-6 py-4 text-center font-bold">
                                  {(() => {
                                    const computedDias = (acc.dias_baja !== null && acc.dias_baja !== undefined)
                                      ? acc.dias_baja
                                      : calcDiasBaja(acc.fecha_siniestro, acc.fecha_alta_rechazo);
                                    return computedDias !== null && computedDias !== undefined ? (
                                      <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                                        {computedDias}d
                                      </span>
                                    ) : '—';
                                  })()}
                                </td>
                                <td className="px-6 py-4 text-center" onClick={e => e.stopPropagation()}>
                                  <div className="flex items-center justify-center gap-1">
                                    {acc.denuncia_signed_url && (
                                      <button
                                        onClick={e => { e.stopPropagation(); handleViewPdf(acc.denuncia_signed_url); }}
                                        title="Ver denuncia de accidente"
                                        className="p-1.5 rounded-lg bg-blue-50 text-[#468DFF] hover:bg-blue-100 hover:text-[#0511F2] transition-colors inline-flex items-center justify-center shadow-sm"
                                      >
                                        <FileText className="h-4.5 w-4.5" />
                                      </button>
                                    )}
                                    {acc.informe_signed_url && (
                                      <button
                                        onClick={e => { e.stopPropagation(); handleViewPdf(acc.informe_signed_url); }}
                                        title="Ver informe de investigación"
                                        className="p-1.5 rounded-lg bg-blue-50 text-[#468DFF] hover:bg-blue-100 hover:text-[#0511F2] transition-colors inline-flex items-center justify-center shadow-sm"
                                      >
                                        <FileText className="h-4.5 w-4.5" />
                                      </button>
                                    )}
                                    {!acc.denuncia_signed_url && !acc.informe_signed_url && (
                                      <span className="text-slate-350 text-[10px] font-semibold">—</span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-6 py-4 text-center" onClick={e => e.stopPropagation()}>
                                  <div className="flex items-center justify-center gap-1.5">
                                    {profile?.role !== 'cliente' && (
                                      <button
                                        onClick={e => { e.stopPropagation(); handleOpenAiModalFromList(acc); }}
                                        title="Generar informe con IA"
                                        className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700 transition-colors bg-indigo-50 cursor-pointer inline-flex items-center justify-center shadow-sm"
                                      >
                                        <Sparkles className="h-4.5 w-4.5" />
                                      </button>
                                    )}
                                    {canEditar ? (
                                      <button
                                        onClick={e => { e.stopPropagation(); handleEditClick(acc, false); }}
                                        title="Editar accidente"
                                        className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 hover:text-amber-700 transition-colors bg-amber-50"
                                      >
                                        <Edit className="h-4.5 w-4.5" />
                                      </button>
                                    ) : (
                                      <button
                                        onClick={e => { e.stopPropagation(); handleEditClick(acc, true); }}
                                        title="Ver Detalle"
                                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-all cursor-pointer inline-flex items-center"
                                      >
                                        <Eye className="h-4.5 w-4.5" />
                                      </button>
                                    )}
                                    {canEliminar && (
                                      <button
                                        onClick={e => { e.stopPropagation(); handleDeleteClick(acc.id); }}
                                        title="Eliminar accidente"
                                        className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors bg-red-50"
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
      </main>

      {/* ── Toast Flotante ── removido - consumido globalmente */}

      {/* ── Modal Confirmación ── */}
      {modalAlert.show && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
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

      {/* ── Modal Guía de Gravedad ── */}
      {showGravedadGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full mx-4 animate-scaleUp overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
              <div className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-[#468DFF]" />
                <h3 className="font-outfit font-bold text-slate-900">Guía de clasificación de gravedad</h3>
              </div>
              <button
                onClick={() => setShowGravedadGuide(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {GRAVEDAD_GUIA.map(g => (
                <div key={g.nivel} className={`rounded-xl border p-4 ${g.color}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`h-3 w-3 rounded-full ${g.dot}`} />
                    <span className="font-outfit font-bold text-slate-800">{g.nivel}</span>
                  </div>
                  <p className="text-sm text-slate-700 mb-1 leading-relaxed">{g.criterio}</p>
                  <p className="text-xs text-slate-500"><strong>Ejemplos:</strong> {g.ejemplos}</p>
                </div>
              ))}
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setShowGravedadGuide(false)}
                className="px-5 py-2 text-sm font-semibold text-white bg-[#468DFF] rounded-xl hover:bg-[#0511F2] transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ── Modal 1: Comentarios Adicionales para IA ── */}
      {isAiCommentsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xl max-w-lg w-full animate-scale-up space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Sparkles className="h-5 w-5 text-indigo-600" />
              <h3 className="font-outfit font-bold text-slate-800 text-sm leading-snug">Generar Informe de investigación de accidente / enfermedad profesional con IA</h3>
            </div>
            
            <div className="space-y-3">
              <p className="text-xs text-slate-500 leading-relaxed">
                El asistente técnico analizará los datos de este siniestro (Área, Puesto, Tipo, Descripción de hechos, etc.) aplicando metodologías <strong>Ishikawa 6M</strong> y <strong>5 Porqués</strong>.
              </p>
              
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2 min-h-[28px] mb-1">
                  <label className="block text-xs font-bold text-slate-700">Comentarios u observaciones adicionales (opcional)</label>
                  <AITextHelper
                    value={aiAdditionalComments}
                    onChange={setAiAdditionalComments}
                    context="Comentarios u observaciones adicionales para guiar la generación del informe de investigación del siniestro"
                    disabled={false}
                  />
                </div>
                <textarea
                  value={aiAdditionalComments}
                  onChange={e => setAiAdditionalComments(e.target.value)}
                  placeholder="Ej: El suelo estaba resbaladizo por tareas de limpieza previas. El trabajador portaba su calzado de seguridad."
                  rows={4}
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-700 focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all resize-none"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2 justify-end">
              <button
                type="button"
                onClick={() => setIsAiCommentsModalOpen(false)}
                className="px-4 py-2 bg-white text-[#468DFF] border border-[#468DFF] rounded-xl text-xs font-bold hover:bg-[#468DFF] hover:text-white transition-all active:scale-[0.98] cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={aiReportLoading}
                onClick={() => handleCallGenerateReportApi(aiTargetAccident, aiAdditionalComments)}
                className="px-4 py-2 bg-[#468DFF] hover:bg-[#0511F2] text-white border border-transparent rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-[0.98] cursor-pointer shadow-md shadow-[#468DFF]/10"
              >
                {aiReportLoading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Analizando...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" />
                    Generar análisis
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal 2: Previsualización y Edición de Informe de IA ── */}
      {isAiReportModalOpen && aiReportDataEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-4xl w-full animate-scale-up flex flex-col my-8 max-h-[85vh]">
            {/* Cabecera */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-indigo-50/50 to-white">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-indigo-600" />
                <div>
                  <h3 className="font-outfit font-bold text-slate-900 text-sm">Previsualización y Edición del Informe de investigación de accidente</h3>
                  <p className="text-[10px] text-slate-400">Revisá y modificá el análisis propuesto por la IA antes de exportar el PDF.</p>
                </div>
              </div>
              <button
                onClick={() => setIsAiReportModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Cuerpo del Formulario */}
            <div className="p-6 space-y-6 overflow-y-auto flex-grow text-xs text-slate-700">

              {/* Acciones Preventivas (Ubicadas antes de Ishikawa) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-1">
                  <h4 className="font-outfit font-bold text-slate-800 text-xs uppercase tracking-wider text-indigo-600">
                    Acciones Preventivas Propuestas
                  </h4>
                  <button
                    type="button"
                    onClick={() => {
                      const newActs = [...(aiReportDataEdit.acciones_preventivas || [])];
                      newActs.push({ descripcion: '', responsable: '', fecha_planificada: '', fecha_implementacion: '' });
                      setAiReportDataEdit({ ...aiReportDataEdit, acciones_preventivas: newActs });
                    }}
                    className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                  >
                    + Añadir Acción
                  </button>
                </div>
                <div className="space-y-3">
                  {(aiReportDataEdit.acciones_preventivas || []).map((act, idx) => {
                    return (
                      <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-start bg-slate-50/30 border border-slate-200 p-2.5 rounded-xl relative">
                        <div className="md:col-span-1 text-[10px] font-bold text-slate-400 pt-2 text-center">#{idx + 1}</div>
                        <div className="md:col-span-6 space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 block">Descripción de la acción</label>
                          <textarea
                            value={act.descripcion}
                            onChange={e => {
                              const newActs = [...(aiReportDataEdit.acciones_preventivas || [])];
                              newActs[idx] = { ...act, descripcion: e.target.value };
                              setAiReportDataEdit({ ...aiReportDataEdit, acciones_preventivas: newActs });
                            }}
                            placeholder="Acción preventiva..."
                            rows={2}
                            className="w-full border border-slate-200 rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-[#468DFF] resize-y text-xs"
                          />
                        </div>
                        <div className="md:col-span-3 space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 block">Responsable</label>
                          <input
                            type="text"
                            value={act.responsable}
                            onChange={e => {
                              const newActs = [...(aiReportDataEdit.acciones_preventivas || [])];
                              newActs[idx] = { ...act, responsable: e.target.value };
                              setAiReportDataEdit({ ...aiReportDataEdit, acciones_preventivas: newActs });
                            }}
                            placeholder="Ej: Mantenimiento"
                            className="w-full border border-slate-200 rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-[#468DFF] text-xs"
                          />
                        </div>
                        <div className="md:col-span-2 space-y-1 flex gap-1.5 items-end">
                          <div className="flex-grow space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 block">Plazo/Fecha</label>
                            <input
                              type="text"
                              value={act.fecha_planificada}
                              onChange={e => {
                                const newActs = [...(aiReportDataEdit.acciones_preventivas || [])];
                                newActs[idx] = { ...act, fecha_planificada: e.target.value };
                                setAiReportDataEdit({ ...aiReportDataEdit, acciones_preventivas: newActs });
                              }}
                              placeholder="Plazo planificado"
                              className="w-full border border-slate-200 rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-[#468DFF] text-xs"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const newActs = (aiReportDataEdit.acciones_preventivas || []).filter((_, i) => i !== idx);
                              setAiReportDataEdit({ ...aiReportDataEdit, acciones_preventivas: newActs });
                            }}
                            className="p-2 bg-red-50 text-red-500 hover:bg-red-100 rounded-xl transition-colors cursor-pointer shrink-0"
                            title="Eliminar acción"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {(!aiReportDataEdit.acciones_preventivas || aiReportDataEdit.acciones_preventivas.length === 0) && (
                    <div className="text-center text-slate-400 text-xs py-2 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">No hay acciones preventivas cargadas.</div>
                  )}
                </div>
              </div>
              
              {/* 1. Ishikawa 6M */}
              <div className="space-y-3">
                <h4 className="font-outfit font-bold text-slate-800 text-xs border-b border-slate-100 pb-1 uppercase tracking-wider text-indigo-600">
                  Método de Ishikawa (6M)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">Material</label>
                    <textarea
                      value={aiReportDataEdit.ishikawa?.material || ''}
                      onChange={e => setAiReportDataEdit({
                        ...aiReportDataEdit,
                        ishikawa: { ...aiReportDataEdit.ishikawa, material: e.target.value }
                      })}
                      rows={3}
                      className="w-full border border-slate-200 rounded-xl px-2.5 py-1.5 bg-slate-50/50 focus:outline-none focus:border-[#468DFF] transition-all resize-y"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">Maquinaria</label>
                    <textarea
                      value={aiReportDataEdit.ishikawa?.maquinaria || ''}
                      onChange={e => setAiReportDataEdit({
                        ...aiReportDataEdit,
                        ishikawa: { ...aiReportDataEdit.ishikawa, maquinaria: e.target.value }
                      })}
                      rows={3}
                      className="w-full border border-slate-200 rounded-xl px-2.5 py-1.5 bg-slate-50/50 focus:outline-none focus:border-[#468DFF] transition-all resize-y"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">Método</label>
                    <textarea
                      value={aiReportDataEdit.ishikawa?.metodo || ''}
                      onChange={e => setAiReportDataEdit({
                        ...aiReportDataEdit,
                        ishikawa: { ...aiReportDataEdit.ishikawa, metodo: e.target.value }
                      })}
                      rows={3}
                      className="w-full border border-slate-200 rounded-xl px-2.5 py-1.5 bg-slate-50/50 focus:outline-none focus:border-[#468DFF] transition-all resize-y"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">Mano de Obra</label>
                    <textarea
                      value={aiReportDataEdit.ishikawa?.mano_de_obra || ''}
                      onChange={e => setAiReportDataEdit({
                        ...aiReportDataEdit,
                        ishikawa: { ...aiReportDataEdit.ishikawa, mano_de_obra: e.target.value }
                      })}
                      rows={3}
                      className="w-full border border-slate-200 rounded-xl px-2.5 py-1.5 bg-slate-50/50 focus:outline-none focus:border-[#468DFF] transition-all resize-y"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">Medio</label>
                    <textarea
                      value={aiReportDataEdit.ishikawa?.medio || ''}
                      onChange={e => setAiReportDataEdit({
                        ...aiReportDataEdit,
                        ishikawa: { ...aiReportDataEdit.ishikawa, medio: e.target.value }
                      })}
                      rows={3}
                      className="w-full border border-slate-200 rounded-xl px-2.5 py-1.5 bg-slate-50/50 focus:outline-none focus:border-[#468DFF] transition-all resize-y"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">Medida</label>
                    <textarea
                      value={aiReportDataEdit.ishikawa?.medida || ''}
                      onChange={e => setAiReportDataEdit({
                        ...aiReportDataEdit,
                        ishikawa: { ...aiReportDataEdit.ishikawa, medida: e.target.value }
                      })}
                      rows={3}
                      className="w-full border border-slate-200 rounded-xl px-2.5 py-1.5 bg-slate-50/50 focus:outline-none focus:border-[#468DFF] transition-all resize-y"
                    />
                  </div>
                </div>
              </div>

              {/* 2. 5 Porqués y Causa Raíz */}
              <div className="space-y-3 pt-2">
                <h4 className="font-outfit font-bold text-slate-800 text-xs border-b border-slate-100 pb-1 uppercase tracking-wider text-indigo-600">
                  Método de los 5 Porqués y Causa Raíz
                </h4>
                <div className="space-y-3">
                  {(aiReportDataEdit.cinco_porques || []).map((porq, idx) => (
                    <div key={idx} className="flex items-start gap-2.5">
                      <span className="font-bold text-slate-400 w-24 shrink-0 pt-2">{idx + 1}° ¿Por qué?</span>
                      <textarea
                        value={porq}
                        onChange={e => {
                          const newPorques = [...aiReportDataEdit.cinco_porques];
                          newPorques[idx] = e.target.value;
                          setAiReportDataEdit({ ...aiReportDataEdit, cinco_porques: newPorques });
                        }}
                        rows={2}
                        className="flex-grow border border-slate-200 rounded-xl px-3 py-1.5 bg-slate-50/50 focus:outline-none focus:border-[#468DFF] transition-all resize-y"
                      />
                    </div>
                  ))}
                </div>

                <div className="space-y-1.5 pt-2">
                  <label className="block font-bold text-slate-700">Causa Raíz Identificada</label>
                  <textarea
                    value={aiReportDataEdit.causa_raiz || ''}
                    onChange={e => setAiReportDataEdit({ ...aiReportDataEdit, causa_raiz: e.target.value })}
                    rows={2}
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2 bg-slate-50/50 focus:outline-none focus:border-[#468DFF] transition-all font-semibold"
                  />
                </div>
              </div>

              {/* 4. Acciones Correctivas */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between border-b border-slate-100 pb-1">
                  <h4 className="font-outfit font-bold text-slate-800 text-xs uppercase tracking-wider text-indigo-600">
                    Acciones Correctivas Propuestas
                  </h4>
                  <button
                    type="button"
                    onClick={() => {
                      const newActs = [...(aiReportDataEdit.acciones_correctivas || [])];
                      newActs.push({ descripcion: '', responsable: '', fecha_planificada: '', fecha_implementacion: '' });
                      setAiReportDataEdit({ ...aiReportDataEdit, acciones_correctivas: newActs });
                    }}
                    className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                  >
                    + Añadir Acción
                  </button>
                </div>
                <div className="space-y-3">
                  {(aiReportDataEdit.acciones_correctivas || []).map((act, idx) => {
                    return (
                      <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-start bg-slate-50/30 border border-slate-200 p-2.5 rounded-xl relative">
                        <div className="md:col-span-1 text-[10px] font-bold text-slate-400 pt-2 text-center">#{idx + 1}</div>
                        <div className="md:col-span-6 space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 block">Descripción de la acción</label>
                          <textarea
                            value={act.descripcion}
                            onChange={e => {
                              const newActs = [...(aiReportDataEdit.acciones_correctivas || [])];
                              newActs[idx] = { ...act, descripcion: e.target.value };
                              setAiReportDataEdit({ ...aiReportDataEdit, acciones_correctivas: newActs });
                            }}
                            placeholder="Acción correctiva..."
                            rows={2}
                            className="w-full border border-slate-200 rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-[#468DFF] resize-y text-xs"
                          />
                        </div>
                        <div className="md:col-span-3 space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 block">Responsable</label>
                          <input
                            type="text"
                            value={act.responsable}
                            onChange={e => {
                              const newActs = [...(aiReportDataEdit.acciones_correctivas || [])];
                              newActs[idx] = { ...act, responsable: e.target.value };
                              setAiReportDataEdit({ ...aiReportDataEdit, acciones_correctivas: newActs });
                            }}
                            placeholder="Ej: Mantenimiento"
                            className="w-full border border-slate-200 rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-[#468DFF] text-xs"
                          />
                        </div>
                        <div className="md:col-span-2 space-y-1 flex gap-1.5 items-end">
                          <div className="flex-grow space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 block">Plazo/Fecha</label>
                            <input
                              type="text"
                              value={act.fecha_planificada}
                              onChange={e => {
                                const newActs = [...(aiReportDataEdit.acciones_correctivas || [])];
                                newActs[idx] = { ...act, fecha_planificada: e.target.value };
                                setAiReportDataEdit({ ...aiReportDataEdit, acciones_correctivas: newActs });
                              }}
                              placeholder="Plazo planificado"
                              className="w-full border border-slate-200 rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-[#468DFF] text-xs"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const newActs = (aiReportDataEdit.acciones_correctivas || []).filter((_, i) => i !== idx);
                              setAiReportDataEdit({ ...aiReportDataEdit, acciones_correctivas: newActs });
                            }}
                            className="p-2 bg-red-50 text-red-500 hover:bg-red-100 rounded-xl transition-colors cursor-pointer shrink-0"
                            title="Eliminar acción"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {(!aiReportDataEdit.acciones_correctivas || aiReportDataEdit.acciones_correctivas.length === 0) && (
                    <div className="text-center text-slate-400 text-xs py-2 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">No hay acciones correctivas cargadas.</div>
                  )}
                </div>
              </div>

              {/* 5. Reintentar / Regenerar */}
              <div className="p-4 border border-indigo-100 bg-indigo-50/30 rounded-2xl space-y-3 pt-3">
                <div className="flex items-center justify-between gap-2 min-h-[28px]">
                  <div className="flex items-center gap-1.5 text-indigo-700 font-bold">
                    <Sparkles className="h-4.5 w-4.5" />
                    <span>Volver a intentar con nuevas directivas o comentarios</span>
                  </div>
                  <AITextHelper
                    value={aiTempComments}
                    onChange={setAiTempComments}
                    context="Directivas adicionales para guiar la regeneración del informe de investigación del siniestro por la IA"
                    disabled={false}
                  />
                </div>
                <div className="flex gap-3 items-end">
                  <textarea
                    value={aiTempComments}
                    onChange={e => setAiTempComments(e.target.value)}
                    placeholder="Ej: Enfocarse más en la maquinaria (la traba móvil no funcionó) y proponer acciones de mantenimiento preventivo semanales."
                    rows={2}
                    className="flex-grow border border-slate-200 rounded-xl px-3 py-1.5 bg-white text-xs text-slate-700 focus:outline-none focus:border-[#468DFF] resize-none"
                  />
                  <button
                    type="button"
                    disabled={aiReportLoading}
                    onClick={() => {
                      const fullComments = aiAdditionalComments ? `${aiAdditionalComments}\nNueva directiva: ${aiTempComments}` : aiTempComments;
                      handleCallGenerateReportApi(aiTargetAccident, fullComments);
                      setAiTempComments('');
                    }}
                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all active:scale-[0.98] shrink-0 flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    {aiReportLoading ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Reanalizando...
                      </>
                    ) : (
                      'Reintentar con IA'
                    )}
                  </button>
                </div>
              </div>

            </div>

            {/* Botonera de Acción */}
            <div className="px-6 py-4 border-t border-slate-100 flex justify-between bg-slate-50/50">
              <button
                type="button"
                onClick={() => setIsAiReportModalOpen(false)}
                className="px-5 py-2 bg-white border border-slate-350 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all cursor-pointer"
              >
                Cerrar
              </button>
              <div className="flex items-center gap-3">
                {!isReadOnlyView && (
                  <button
                    type="button"
                    disabled={saveReportLoading}
                    onClick={() => handleSaveTechnicalReportToSiniestro(aiReportDataEdit, aiTargetAccident)}
                    className="px-5 py-2 bg-white text-[#468DFF] border border-[#468DFF] rounded-xl text-xs font-bold hover:bg-[#468DFF] hover:text-white transition-all cursor-pointer flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                  >
                    {saveReportLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Guardando...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        Guardar informe
                      </>
                    )}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleExportTechnicalReportPdf(aiReportDataEdit, aiTargetAccident)}
                  className="px-5 py-2 bg-[#468DFF] hover:bg-[#0511F2] text-white border border-transparent rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-[#468DFF]/10"
                >
                  <Download className="h-4 w-4" />
                  Descargar PDF
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
