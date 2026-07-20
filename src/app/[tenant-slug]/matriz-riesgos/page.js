// src/app/[tenant-slug]/matriz-riesgos/page.js
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import { supabase } from '@/lib/supabase';
import { formatDate, formatAsDateInput, convertToDbDate } from '@/lib/utils';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import DocumentUploadZone from '@/components/ui/DocumentUploadZone';
import AITextHelper from '@/components/ui/AITextHelper';
import { useToast } from '@/components/providers/ToastProvider';
import AppPageHeader from '@/components/ui/AppPageHeader';
import AppButton from '@/components/ui/AppButton';
import AppInput from '@/components/ui/AppInput';
import AppSelect from '@/components/ui/AppSelect';
import AppCard from '@/components/ui/AppCard';
import AppConfirmDialog from '@/components/ui/AppConfirmDialog';
import * as Dialog from '@radix-ui/react-dialog';
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
  ChevronDown,
  ChevronUp,
  HelpCircle,
  ShieldCheck,
  FileSpreadsheet,
  AlertCircle,
  Sliders,
  Printer,
  FileText,
  Upload,
  Download,
  FolderOpen,
  Copy
} from 'lucide-react';

const FRECUENCIAS = [
  { value: 'Continua', desc: 'Exposición permanente o varias veces durante la jornada.' },
  { value: 'Frecuente', desc: 'Exposición al menos una vez al día o diariamente.' },
  { value: 'Ocasional', desc: 'Exposición intermitente (semanal o varias veces al mes).' },
  { value: 'Esporádica/Poco usual', desc: 'Exposición mensual o anual; tarea muy ocasional.' },
  { value: 'Rara', desc: 'Exposición eventual o excepcional (mantenimiento anual).' }
];

const SITUACIONES = ['Normal', 'Anormal', 'Emergencia', 'Mantenimiento'];
const NIVELES_PROBABILIDAD = ['Baja', 'Mediana', 'Alta'];
const NIVELES_GRAVEDAD = ['Baja', 'Mediana', 'Alta'];

const MOCK_CATALOG = [
  {
    tipo_peligro: 'Mecánicos',
    peligro: 'Aplastamiento',
    riesgo: 'Aplastamiento entre dos objetos móviles (a excepción de los objetos volantes o que caen)',
    consecuencias: 'Amputaciones; Contusiones; Efectos de atricción y aplastamiento; Fracturas; Traumatismos internos',
    medidas_control_administrativas: 'Capacitación en higiene y seguridad; Procedimiento de trabajo seguro; Señalización de peligros.',
    medidas_control_ingenieria: 'Dispositivos de seguridad (bimanuales, barreras físicas, ópticas, sensores, paradas de emergencia).',
    epps: 'Casco de seguridad; Guantes; Calzado de seguridad.'
  },
  {
    tipo_peligro: 'Mecánicos',
    peligro: 'Aplastamiento',
    riesgo: 'Aplastamiento por caída de objetos',
    consecuencias: 'Contusiones; Fracturas; Heridas contusas; Traumatismos internos',
    medidas_control_administrativas: 'Capacitación del personal; Programa de orden y limpieza (5S); Señalización de advertencia.',
    medidas_control_ingenieria: 'Redes de seguridad, barreras físicas para delimitar zonas de caída, rodapiés.',
    epps: 'Casco de seguridad; Botas de seguridad con puntera de acero; Guantes.'
  },
  {
    tipo_peligro: 'Físicos',
    peligro: 'Ruido',
    riesgo: 'Exposición a niveles elevados de ruido continuo o de impacto',
    consecuencias: 'Hipoacusia inducida por ruido; Estrés laboral; Fatiga auditiva; Aumento de la presión arterial',
    medidas_control_administrativas: 'Exámenes médicos periódicos (audiometrías); Reducción del tiempo de exposición; Rotación de puestos.',
    medidas_control_ingenieria: 'Aislamiento de la fuente (cabinas acústicas); Paneles absorbentes de sonido; Silenciadores en escapes.',
    epps: 'Protectores auditivos de copa o tapones endoaurales certificados.'
  },
  {
    tipo_peligro: 'Químicos',
    peligro: 'Gases y vapores',
    riesgo: 'Contacto o inhalación de sustancias químicas tóxicas o irritantes',
    consecuencias: 'Asfixia; Intoxicaciones agudas/crónicas; Quemaduras químicas en vías respiratorias; Dermatitis',
    medidas_control_administrativas: 'Disponibilidad de Fichas de Datos de Seguridad (FDS); Capacitación en manipulación segura; Monitoreo ambiental.',
    medidas_control_ingenieria: 'Sistemas de ventilación localizada (campanas extractoras); Diques de contención y duchas de emergencia.',
    epps: 'Protección respiratoria con cartuchos para gases/vapores específicos; Gafas químicas; Guantes de nitrilo.'
  },
  {
    tipo_peligro: 'Ergonómicos',
    peligro: 'Levantamiento manual de cargas',
    riesgo: 'Esfuerzos físicos excesivos al levantar u operar objetos pesados',
    consecuencias: 'Hernias discales; Lumbalgias; Desgarros; Esguinces; Lesiones musculoesqueléticas',
    medidas_control_administrativas: 'Capacitación en técnicas de levantamiento seguro; Pausas activas; Rotación de tareas.',
    medidas_control_ingenieria: 'Ayuda mecánica (carros de transporte, polipastos, mesas elevadoras, grúas pescante).',
    epps: 'Calzado de seguridad; Guantes de protección mecánica.'
  },
  {
    tipo_peligro: 'Eléctricos',
    peligro: 'Contacto eléctrico directo',
    riesgo: 'Contacto con partes activas de instalaciones eléctricas bajo tensión',
    consecuencias: 'Fibrilación ventricular; Electrocución; Quemaduras eléctricas internas/externas; Muerte',
    medidas_control_administrativas: 'Procedimientos de trabajo con tensión (cinco reglas de oro); Señalización de tableros.',
    medidas_control_ingenieria: 'Instalación de interruptores diferenciales (30mA); Puesta a tierra y continuidad de masas; Disyuntores.',
    epps: 'Casco dieléctrico; Guantes dieléctricos; Calzado de seguridad aislante; Herramientas aisladas.'
  },
  {
    tipo_peligro: 'Físicos',
    peligro: 'Radiación no ionizante (U.V. / Infrarroja)',
    riesgo: 'Exposición a arcos eléctricos de soldadura sin protección adecuada',
    consecuencias: 'Queratoconjuntivitis; Quemaduras térmicas en ojos y piel; Daño corneal permanente',
    medidas_control_administrativas: 'Señalización del área de soldadura; Delimitación de biombos; Capacitación en radioprotección.',
    medidas_control_ingenieria: 'Instalación de biombos protectores opacos o pantallas de absorción de radiación.',
    epps: 'Máscara para soldador con lentes fotosensibles autorregulados; Delantal de cuero; Guantes de soldador.'
  }
];

export default function MatrizRiesgosPage({ params }) {
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
  const [catalog, setCatalog] = useState([]);

  // Permisos granulares
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

  const sectionPerms = getSectionPermissions(profile, 'matriz_riesgos');
  const canCargar = sectionPerms.cargar;
  const canEditar = sectionPerms.editar;
  const canEliminar = sectionPerms.eliminar;
  const isFormDisabled = (editingId ? !canEditar : !canCargar) || isReadOnlyView;
  const canEdit = !isFormDisabled;

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

  // Datos principales de matriz de riesgos
  const [matrizRiesgos, setMatrizRiesgos] = useState([]);

  // Estados del CRUD / Vista Formulario
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isBulkMode, setIsBulkMode] = useState(false); // true = Alta Masiva, false = Edición individual de fila
  const [loadType, setLoadType] = useState('excel');
  const [uploadType, setUploadType] = useState('local'); // 'local', 'drive', 'legajo'
  const [selectedFileName, setSelectedFileName] = useState('');
  const [selectedLegajoPath, setSelectedLegajoPath] = useState('');
  const [loadingLegajoFile, setLoadingLegajoFile] = useState(false);
  const [previewRows, setPreviewRows] = useState([]);
  const [legajoFiles, setLegajoFiles] = useState([]);

  // Campos de formulario a nivel matriz / cabecera
  const [empresaId, setEmpresaId] = useState('');
  const [establecimientoId, setEstablecimientoId] = useState('');

  // Estructura para modo Bulk (Carga Masiva)
  // [ { id, sector, isManual, puestos: [ { id, puesto, isManual, tareas, frecuencia, situacion, peligro, peligroIsManual, riesgo, riesgoIsManual, consecuencia, probabilidad, gravedad, medidas_control_adm, medidas_control_ing, medidas_control_epp, medidas_control_recomendadas, responsable, responsableIsManual, fecha_planificada, fecha_realizacion, post_probabilidad, post_gravedad, observaciones } ] } ]
  const [bulkSectores, setBulkSectores] = useState([]);

  // Estados para guardado automático de perfiles
  const [showProfileConfirmOpen, setShowProfileConfirmOpen] = useState(false);
  const [pendingSaveData, setPendingSaveData] = useState([]);
  const [pendingEstUpdates, setPendingEstUpdates] = useState([]);

  // Campos para Edición Individual
  const [singleSector, setSingleSector] = useState('');
  const [singleSectorIsManual, setSingleSectorIsManual] = useState(false);
  const [singlePuesto, setSinglePuesto] = useState('');
  const [singlePuestoIsManual, setSinglePuestoIsManual] = useState(false);
  const [singleTareas, setSingleTareas] = useState('');
  const [singleFrecuencia, setSingleFrecuencia] = useState('');
  const [singleSituacion, setSingleSituacion] = useState('Normal');
  const [singleTipoPeligro, setSingleTipoPeligro] = useState('');
  const [singlePeligro, setSinglePeligro] = useState('');
  const [singlePeligroIsManual, setSinglePeligroIsManual] = useState(false);
  const [singleRiesgo, setSingleRiesgo] = useState('');
  const [singleRiesgoIsManual, setSingleRiesgoIsManual] = useState(false);
  const [singleConsecuencia, setSingleConsecuencia] = useState('');
  const [singleProbabilidad, setSingleProbabilidad] = useState('');
  const [singleGravedad, setSingleGravedad] = useState('');
  const [singleMedidasAdm, setSingleMedidasAdm] = useState('');
  const [singleMedidasIng, setSingleMedidasIng] = useState('');
  const [singleMedidasEpp, setSingleMedidasEpp] = useState('');
  const [singleMedidasRecomendadas, setSingleMedidasRecomendadas] = useState('');
  const [singleResponsable, setSingleResponsable] = useState('');
  const [singleResponsableIsManual, setSingleResponsableIsManual] = useState(false);
  const [singleFechaPlanificada, setSingleFechaPlanificada] = useState('');
  const [singleFechaRealizacion, setSingleFechaRealizacion] = useState('');
  const [singlePostProbabilidad, setSinglePostProbabilidad] = useState('');
  const [singlePostGravedad, setSinglePostGravedad] = useState('');
  const [singleObservaciones, setSingleObservaciones] = useState('');

  // Filtros
  const [filterText, setFilterText] = useState('');
  const [filterEmpresa, setFilterEmpresa] = useState('');
  const [filterEstablecimiento, setFilterEstablecimiento] = useState('');
  const [filterNivelRiesgo, setFilterNivelRiesgo] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showExportMobile, setShowExportMobile] = useState(false);

  // Modales y Feedback
  const globalToast = useToast();
  const [modalAlert, setModalAlert] = useState({ show: false, title: '', message: '', onConfirm: null, confirmText: 'Confirmar' });
  const [saveLoading, setSaveLoading] = useState(false);

  // Modal informativo para Frecuencia / Probabilidad / Gravedad
  const [helpModal, setHelpModal] = useState({ show: false, type: '' });

  // Ordenamiento
  const [sortField, setSortField] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');

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
        setIsDevMode(false);
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

  // Bloquear foco en inputs cuando es vista de sólo lectura (canEdit === false)
  useEffect(() => {
    if (!canEdit) {
      const handleFocus = (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') {
          e.target.blur();
        }
      };
      const container = document.getElementById('matriz-form-container');
      if (container) {
        container.addEventListener('focusin', handleFocus);
      }
      return () => {
        if (container) {
          container.removeEventListener('focusin', handleFocus);
        }
      };
    }
  }, [canEdit, editingId, isBulkMode, loadType]);

  const triggerToast = (message, type = 'success') => {
    globalToast.toast(message, type);
  };

  const closeAlert = () => setModalAlert({ show: false, title: '', message: '', onConfirm: null, confirmText: 'Confirmar' });

  // Calcular Nivel de Riesgo (BS 8800)
  const getRiskLevel = (probabilidad, gravedad) => {
    if (!probabilidad || !gravedad) return null;
    const p = probabilidad.toLowerCase();
    const g = gravedad.toLowerCase();

    if (p === 'baja') {
      if (g === 'baja') return { text: 'Riesgo trivial', color: '#00B050', bgClass: 'bg-[#00B050] text-white' };
      if (g === 'mediana') return { text: 'Riesgo tolerable', color: '#00FF00', bgClass: 'bg-[#00FF00] text-black font-semibold' };
      if (g === 'alta') return { text: 'Riesgo moderado', color: '#FFFF00', bgClass: 'bg-[#FFFF00] text-black font-semibold' };
    }
    if (p === 'mediana') {
      if (g === 'baja') return { text: 'Riesgo tolerable', color: '#00FF00', bgClass: 'bg-[#00FF00] text-black font-semibold' };
      if (g === 'mediana') return { text: 'Riesgo moderado', color: '#FFFF00', bgClass: 'bg-[#FFFF00] text-black font-semibold' };
      if (g === 'alta') return { text: 'Riesgo sustancial', color: '#FF9900', bgClass: 'bg-[#FF9900] text-white font-semibold' };
    }
    if (p === 'alta') {
      if (g === 'baja') return { text: 'Riesgo moderado', color: '#FFFF00', bgClass: 'bg-[#FFFF00] text-black font-semibold' };
      if (g === 'mediana') return { text: 'Riesgo sustancial', color: '#FF9900', bgClass: 'bg-[#FF9900] text-white font-semibold' };
      if (g === 'alta') return { text: 'Riesgo intolerable', color: '#FF0000', bgClass: 'bg-[#FF0000] text-white font-semibold' };
    }
    return null;
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
            window.location.href = `/${homeTen.slug}/matriz-riesgos`;
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

      // Empresas (Clientes)
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

      // Establecimientos
      let estsQuery = supabase
        .from('establecimientos')
        .select('id, empresa_id, denominacion, sectores')
        .eq('tenant_id', ten.id);
      if (prof.role === 'cliente') {
        estsQuery = estsQuery.eq('empresa_id', prof.empresa_id);
      }
      const { data: ests, error: estErr } = await estsQuery.order('denominacion');
      if (estErr) throw estErr;
      setAllEstablecimientos(ests || []);

      // Miembros del equipo para Responsables
      const { data: mems, error: memErr } = await supabase
        .from('miembros_equipo')
        .select('id, full_name')
        .eq('tenant_id', ten.id)
        .order('full_name');
      if (memErr) throw memErr;
      setMiembrosList(mems || []);

      // Fetch Excel/CSV files from Legajo Técnico
      let legajoQuery = supabase.from('legajo_tecnico').select('id, documento_nombre, documento_url, empresa_id, fecha').eq('tenant_id', ten.id);
      if (prof.role === 'cliente') {
        legajoQuery = legajoQuery.eq('empresa_id', prof.empresa_id);
      }
      const { data: legajos, error: legErr } = await legajoQuery.order('fecha', { ascending: false });
      if (!legErr && legajos) {
        const excelLegajos = legajos.filter(l => {
          const name = (l.documento_nombre || '').toLowerCase();
          const url = (l.documento_url || '').toLowerCase();
          return name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.csv') ||
                 url.endsWith('.xlsx') || url.endsWith('.xls') || url.endsWith('.csv');
        });
        setLegajoFiles(excelLegajos);
      }

      // Catálogo de peligros
      const { data: catData, error: catErr } = await supabase
        .from('peligros_riesgos_contramedidas')
        .select('*')
        .order('peligro');
      if (catErr) throw catErr;
      setCatalog(catData || []);

      // Matriz de riesgos
      let matrizQuery = supabase
        .from('matriz_riesgos')
        .select('*')
        .eq('tenant_id', ten.id);
      if (prof.role === 'cliente') {
        matrizQuery = matrizQuery.eq('empresa_id', prof.empresa_id);
      }
      const { data: matData, error: matErr } = await matrizQuery.order('created_at', { ascending: false });
      if (matErr) throw matErr;
      setMatrizRiesgos(matData || []);

      setLoading(false);
    } catch (err) {
      console.error('Error cargando datos reales:', err);
      // Sanitizar el error para no revelar estructura SQL interna
      triggerToast('Error al cargar la matriz de riesgos. Por favor, reintente en unos minutos.', 'error');
      // No hacemos fallback silencioso en modo real para alertar errores del esquema
      setLoading(false);
    }
  };

  // Cargar datos mockeados
  const loadMockData = () => {
    setProfile({ full_name: 'Profesional de SySO (Mock)', role: 'admin' });
    setTenant({ id: 'mock-tenant', name: 'Consultora de Prueba', plan_id: 'free' });
    setEmpresas([
      { id: 'mock-empresa-1', razon_social: 'Ams Inversiones S.A.' },
      { id: 'mock-empresa-2', razon_social: 'Argento Via Publica' },
      { id: 'mock-empresa-3', razon_social: 'Metalúrgica del Sur' },
      { id: 'mock-empresa-4', razon_social: 'Logística Buenos Aires' },
      { id: 'mock-empresa-5', razon_social: 'Constructora Pilar' }
    ]);
    setAllEstablecimientos([
      { 
        id: 'mock-est-1', 
        empresa_id: 'mock-empresa-1', 
        denominacion: 'Callao 727',
        sectores: [
          {
            id: 'sec-1',
            denominacion: 'Producción',
            puestos: [
              { id: 'pst-1', denominacion: 'Operario de Torno' },
              { id: 'pst-2', denominacion: 'Supervisor de Turno' }
            ]
          },
          {
            id: 'sec-2',
            denominacion: 'Mantenimiento',
            puestos: [
              { id: 'pst-3', denominacion: 'Soldador' }
            ]
          }
        ]
      },
      { 
        id: 'mock-est-2', 
        empresa_id: 'mock-empresa-1', 
        denominacion: 'Cordoba 2045',
        sectores: []
      },
      { 
        id: 'mock-est-3', 
        empresa_id: 'mock-empresa-2', 
        denominacion: 'Único',
        sectores: [
          {
            id: 'sec-3',
            denominacion: 'Administración',
            puestos: [
              { id: 'pst-4', denominacion: 'Secretario/a' }
            ]
          }
        ]
      },
      {
        id: 'mock-est-4',
        empresa_id: 'mock-empresa-3',
        denominacion: 'Planta Industrial Lanús',
        sectores: [
          {
            id: 'sec-4',
            denominacion: 'Fundición',
            puestos: [
              { id: 'pst-5', denominacion: 'Operario de Horno' }
            ]
          }
        ]
      }
    ]);
    setMiembrosList([
      { id: 'mock-miembro-1', full_name: 'Gonzalo Merlo' },
      { id: 'mock-miembro-2', full_name: 'Florencia Benitez' },
      { id: 'mock-miembro-3', full_name: 'Sebastián Merlassino' },
      { id: 'mock-miembro-4', full_name: 'Alejandro Rodriguez' },
      { id: 'mock-miembro-5', full_name: 'Martina Rossi' }
    ]);
    setCatalog(MOCK_CATALOG);
    setMatrizRiesgos([
      {
        id: 'mock-mat-1',
        empresa_id: 'mock-empresa-1',
        establecimiento_id: 'mock-est-1',
        sector: 'Producción',
        puesto: 'Operario de Torno',
        tareas: 'Mecanizado de piezas de metal en torno paralelo.',
        frecuencia: 'Continua',
        situacion: 'Normal',
        tipo_peligro: 'Mecánicos',
        peligro: 'Aplastamiento',
        riesgo: 'Aplastamiento entre dos objetos móviles (a excepción de los objetos volantes o que caen)',
        consecuencia: 'Amputaciones; Contusiones; Efectos de atricción y aplastamiento; Fracturas; Traumatismos internos',
        probabilidad: 'Mediana',
        gravedad: 'Grave',
        nivel_riesgo: 'Riesgo sustancial',
        medidas_control_adm: 'Capacitación en uso seguro de máquinas rotativas.',
        medidas_control_ing: 'Parada de emergencia y resguardo móvil en plato del torno.',
        medidas_control_epp: 'Lentes de seguridad, ropa ajustada al cuerpo, calzado con puntera de acero.',
        medidas_control_recomendadas: 'Incorporar sensor óptico de presencia.',
        responsable: 'Gonzalo Merlo',
        fecha_planificada: '2026-07-20',
        fecha_realizacion: '',
        post_probabilidad: 'Baja',
        post_gravedad: 'Grave',
        post_nivel_riesgo: 'Riesgo tolerable',
        observaciones: 'Pendiente de cotización del sensor óptico.'
      },
      {
        id: 'mock-mat-2',
        empresa_id: 'mock-empresa-1',
        establecimiento_id: 'mock-est-1',
        sector: 'Mantenimiento',
        puesto: 'Soldador',
        tareas: 'Soldadura por arco eléctrico en estructuras mecánicas.',
        frecuencia: 'Ocasional',
        situacion: 'Normal',
        tipo_peligro: 'Químicos',
        peligro: 'Gases y vapores',
        riesgo: 'Contacto o inhalación de sustancias químicas tóxicas o irritantes',
        consecuencia: 'Asfixia; Intoxicaciones agudas/crónicas; Quemaduras químicas en vías respiratorias; Dermatitis',
        probabilidad: 'Mediana',
        gravedad: 'Mediana',
        nivel_riesgo: 'Riesgo moderado',
        medidas_control_adm: 'Procedimiento de soldadura en áreas ventiladas.',
        medidas_control_ing: 'Campana extractora portátil en banco de soldadura.',
        medidas_control_epp: 'Máscara fotosensible, delantal de cuero, guantes caña larga, respirador con filtro para humos metálicos.',
        medidas_control_recomendadas: 'Reemplazar extractor portátil por uno de mayor caudal.',
        responsable: 'Florencia Benitez',
        fecha_planificada: '2026-08-15',
        fecha_realizacion: '2026-06-25',
        post_probabilidad: 'Baja',
        post_gravedad: 'Mediana',
        post_nivel_riesgo: 'Riesgo tolerable',
        observaciones: 'Extractor instalado y validado.'
      }
    ]);
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
      if (filterNivelRiesgo) {
        filterParts.push(`Nivel Riesgo: ${filterNivelRiesgo}`);
      }
      const filterString = filterParts.join(' | ');

      const showEmpresaCol = !filterEmpresa;
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
        d.text('Matriz de Identificación de Peligros y Valoración de Riesgos', 801, 35, { align: 'right' });

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
      headersRow.push('Sector / Puesto', 'Peligro / Riesgo / Consecuencias', 'Prob. / Grav. / Nivel', 'Medidas de Control Existentes', 'Medidas Control Recom.');
      const headers = [headersRow];
      
      const body = sortedMatriz.map(row => {
        const emp = empresas.find(e => e.id === row.empresa_id);
        const est = allEstablecimientos.find(e => e.id === row.establecimiento_id);
        
        const rowData = [];
        if (showEmpresaCol) rowData.push(emp ? emp.razon_social : 'N/A');
        if (showEstablecimientoCol) rowData.push(est ? est.denominacion : 'N/A');
        rowData.push(
          `Sector: ${row.sector || 'N/A'}\nPuesto: ${row.puesto || 'N/A'}`,
          `Peligro: ${row.peligro || 'N/A'}\nRiesgo: ${row.riesgo || 'N/A'}\nConsecuencias: ${row.consecuencia || 'N/A'}`,
          `Ini: P=${row.probabilidad}, G=${row.gravedad} -> ${row.nivel_riesgo}\nRes: P=${row.post_probabilidad || '-'}, G=${row.post_gravedad || '-'} -> ${row.post_nivel_riesgo || '-'}`,
          `Ingeniería: ${row.medidas_control_ing || 'N/A'}\nAdm: ${row.medidas_control_adm || 'N/A'}\nEPPs: ${row.medidas_control_epp || 'N/A'}`,
          `${row.medidas_control_recomendadas || 'N/A'}${row.responsable ? `\nResp: ${row.responsable}` : ''}${row.fecha_planificada ? `\nPlazo: ${formatDate(row.fecha_planificada)}` : ''}`
        );
        return rowData;
      });

      const columnsDef = [];
      if (showEmpresaCol) columnsDef.push({ key: 'cliente', ratio: 1.15 });
      if (showEstablecimientoCol) columnsDef.push({ key: 'establecimiento', ratio: 1.15 });
      columnsDef.push(
        { key: 'sector_puesto', ratio: 1.45 },
        { key: 'peligro_riesgo', ratio: 2.2 },
        { key: 'prob_grav_nivel', ratio: 1.45 },
        { key: 'medidas_existentes', ratio: 1.8 },
        { key: 'medidas_recom', ratio: 1.6 }
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
        theme: 'grid',
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
      } else {
        doc.save(`Matriz_Riesgos_${new Date().getFullYear()}.pdf`);
      }
    } catch (e) {
      console.error('Error generating PDF:', e);
    }
  };

  // Filtrar los establecimientos dependientes del cliente elegido en el formulario
  const filteredEstablecimientos = allEstablecimientos.filter(
    (est) => est.empresa_id === empresaId
  );

  // Obtener sectores del establecimiento seleccionado (del JSONB)
  const currentEstSectores = allEstablecimientos.find(
    (est) => est.id === establecimientoId
  )?.sectores || [];

  // Mapear catálogo de peligros únicos
  const uniquePeligros = Array.from(new Set(catalog.map((c) => c.peligro))).sort();

  // Mapear riesgos según el peligro seleccionado
  const getRiesgosForPeligro = (peligroVal) => {
    return catalog
      .filter((c) => c.peligro === peligroVal)
      .map((c) => c.riesgo);
  };

  // Mapear detalles de control según peligro y riesgo seleccionados
  const getCatalogRow = (peligroVal, riesgoVal) => {
    return catalog.find((c) => c.peligro === peligroVal && c.riesgo === riesgoVal);
  };

  // Agregar sector al array de bulk load
  const handleAddBulkSector = () => {
    const newSec = {
      id: 'bulk-sec-' + Date.now() + Math.random().toString(36).substr(2, 5),
      sector: '',
      isManual: false,
      isCollapsed: false,
      puestos: []
    };
    setBulkSectores([newSec, ...bulkSectores]);
  };

  const handleRemoveBulkSector = (secId) => {
    setBulkSectores(bulkSectores.filter(s => s.id !== secId));
  };

  const handleDuplicateBulkSector = (sec) => {
    const newSecId = 'bulk-sec-' + Date.now() + Math.random().toString(36).substr(2, 5);
    const duplicatedPuestos = sec.puestos.map(p => ({
      ...p,
      id: 'bulk-pst-' + Date.now() + Math.random().toString(36).substr(2, 5) + Math.random().toString(36).substr(2, 5)
    }));
    
    const newSec = {
      ...sec,
      id: newSecId,
      puestos: duplicatedPuestos,
      isCollapsed: false
    };
    
    const idx = bulkSectores.findIndex(s => s.id === sec.id);
    if (idx !== -1) {
      const copy = [...bulkSectores];
      copy.splice(idx + 1, 0, newSec);
      setBulkSectores(copy);
    } else {
      setBulkSectores([newSec, ...bulkSectores]);
    }
    triggerToast('Sector duplicado con éxito.', 'success');
  };

  // Agregar puesto de trabajo dentro de un sector bulk
  const handleAddBulkPuesto = (secId) => {
    const updated = bulkSectores.map(sec => {
      if (sec.id === secId) {
        const newPst = {
          id: 'bulk-pst-' + Date.now() + Math.random().toString(36).substr(2, 5),
          puesto: '',
          isManual: false,
          isCollapsed: false,
          tareas: '',
          frecuencia: '',
          situacion: 'Normal',
          tipo_peligro: '',
          peligro: '',
          peligroIsManual: false,
          riesgo: '',
          riesgoIsManual: false,
          consecuencia: '',
          probabilidad: '',
          gravedad: '',
          medidas_control_adm: '',
          medidas_control_ing: '',
          medidas_control_epp: '',
          medidas_control_recomendadas: '',
          responsable: '',
          responsableIsManual: false,
          fecha_planificada: '',
          fecha_realizacion: '',
          post_probabilidad: '',
          post_gravedad: '',
          observaciones: ''
        };
        return {
          ...sec,
          puestos: [newPst, ...sec.puestos]
        };
      }
      return sec;
    });
    setBulkSectores(updated);
  };

  const handleDuplicateBulkPuesto = (secId, pst) => {
    const newPstId = 'bulk-pst-' + Date.now() + Math.random().toString(36).substr(2, 5);
    const newPst = {
      ...pst,
      id: newPstId,
      isCollapsed: false
    };
    
    const updated = bulkSectores.map(sec => {
      if (sec.id === secId) {
        const idx = sec.puestos.findIndex(p => p.id === pst.id);
        const copy = [...sec.puestos];
        if (idx !== -1) {
          copy.splice(idx + 1, 0, newPst);
        } else {
          copy.unshift(newPst);
        }
        return {
          ...sec,
          puestos: copy
        };
      }
      return sec;
    });
    setBulkSectores(updated);
    triggerToast('Puesto duplicado con éxito.', 'success');
  };

  const handleRemoveBulkPuesto = (secId, pstId) => {
    const updated = bulkSectores.map(sec => {
      if (sec.id === secId) {
        return {
          ...sec,
          puestos: sec.puestos.filter(p => p.id !== pstId)
        };
      }
      return sec;
    });
    setBulkSectores(updated);
  };

  // Actualizar campos del sector en bulk (soporta objeto de múltiples campos o firma simple campo/valor)
  const handleUpdateBulkSector = (secId, fieldOrUpdates, value) => {
    const updates = typeof fieldOrUpdates === 'string' 
      ? { [fieldOrUpdates]: value } 
      : fieldOrUpdates;

    setBulkSectores(prev => prev.map(sec => {
      if (sec.id === secId) {
        const next = { ...sec, ...updates };
        // Limpiamos los puestos de trabajo sólo si seleccionamos un sector predefinido diferente (no manual)
        if ('sector' in updates && !next.isManual && updates.sector !== sec.sector) {
          next.puestos = sec.puestos.map(p => ({
            ...p,
            puesto: '',
            isManual: false
          }));
        }
        return next;
      }
      return sec;
    }));
  };

  // Actualizar campos del puesto en bulk (soporta objeto de múltiples campos o firma simple campo/valor)
  const handleUpdateBulkPuesto = (secId, pstId, fieldOrUpdates, value) => {
    const updates = typeof fieldOrUpdates === 'string' 
      ? { [fieldOrUpdates]: value } 
      : fieldOrUpdates;

    setBulkSectores(prev => prev.map(sec => {
      if (sec.id === secId) {
        const updatedPuestos = sec.puestos.map(pst => {
          if (pst.id === pstId) {
            const nextPst = { ...pst, ...updates };

            // Si cambia el peligro, vaciamos riesgo
            if ('peligro' in updates) {
              const val = updates.peligro;
              if (val && !nextPst.peligroIsManual) {
                const match = catalog.find(c => c.peligro === val);
                nextPst.tipo_peligro = match ? match.tipo_peligro : '';
              } else {
                nextPst.tipo_peligro = '';
              }
              nextPst.riesgo = '';
              nextPst.consecuencia = '';
              nextPst.medidas_control_adm = '';
              nextPst.medidas_control_ing = '';
              nextPst.medidas_control_epp = '';
            }

            // Si cambia el riesgo, cargamos las medidas y consecuencias sugeridas del catálogo
            if ('riesgo' in updates) {
              const val = updates.riesgo;
              if (val && !nextPst.riesgoIsManual && nextPst.peligro) {
                const match = getCatalogRow(nextPst.peligro, val);
                if (match) {
                  nextPst.tipo_peligro = match.tipo_peligro;
                  nextPst.consecuencia = match.consecuencias || '';
                  nextPst.medidas_control_adm = match.medidas_control_administrativas || '';
                  nextPst.medidas_control_ing = match.medidas_control_ingenieria || '';
                  nextPst.medidas_control_epp = match.epps || '';
                }
              }
            }

            return nextPst;
          }
          return pst;
        });
        return { ...sec, puestos: updatedPuestos };
      }
      return sec;
    }));
  };

  const handleOpenCreateForm = () => {
    handleCloseForm();
    setIsReadOnlyView(false);
    setIsBulkMode(true);
    setLoadType('excel');
    setIsFormOpen(true);
  };

  const handleDownloadTemplate = async () => {
    try {
      triggerToast('Generando plantilla Excel con datos del sistema...', 'info');
      const ExcelJS = await import('exceljs');
      const workbook = new ExcelJS.Workbook();
      
      // Hoja 1: Matriz
      const wsMatriz = workbook.addWorksheet('Matriz');
      
      // Hoja 2: ListasDefinidas (lookup tables)
      const wsListas = workbook.addWorksheet('ListasDefinidas');
      wsListas.state = 'hidden';

      // 1. Escribir empresas del tenant en la columna A
      wsListas.getCell('A1').value = 'Razones Sociales';
      const uniqueRazones = Array.from(new Set(empresas.map(e => e.razon_social).filter(Boolean))).sort((a, b) => a.localeCompare(b));
      uniqueRazones.forEach((rz, i) => {
        wsListas.getCell(`A${i + 2}`).value = rz;
      });

      // 2. Escribir establecimientos del tenant en la columna B
      wsListas.getCell('B1').value = 'Establecimientos';
      const uniqueEstablecimientos = Array.from(new Set(allEstablecimientos.map(e => e.denominacion).filter(Boolean))).sort((a, b) => a.localeCompare(b));
      uniqueEstablecimientos.forEach((est, i) => {
        wsListas.getCell(`B${i + 2}`).value = est;
      });

      // 3. Escribir Frecuencias en la columna C
      wsListas.getCell('C1').value = 'Frecuencias';
      FRECUENCIAS.forEach((frec, i) => {
        wsListas.getCell(`C${i + 2}`).value = frec.value;
      });

      // 4. Escribir Situaciones en la columna D
      wsListas.getCell('D1').value = 'Situaciones';
      SITUACIONES.forEach((sit, i) => {
        wsListas.getCell(`D${i + 2}`).value = sit;
      });

      // 5. Escribir Probabilidades en la columna E
      wsListas.getCell('E1').value = 'Probabilidades';
      NIVELES_PROBABILIDAD.forEach((prob, i) => {
        wsListas.getCell(`E${i + 2}`).value = prob;
      });

      // 6. Escribir Gravedades en la columna F
      wsListas.getCell('F1').value = 'Gravedades';
      NIVELES_GRAVEDAD.forEach((grav, i) => {
        wsListas.getCell(`F${i + 2}`).value = grav;
      });

      const activeCatalog = catalog.length > 0 ? catalog : MOCK_CATALOG;
      
      const uniqueTiposPeligro = Array.from(new Set(activeCatalog.map(c => c.tipo_peligro).filter(Boolean))).sort((a, b) => a.localeCompare(b));
      const uniquePeligros = Array.from(new Set(activeCatalog.map(c => c.peligro).filter(Boolean))).sort((a, b) => a.localeCompare(b));
      const uniqueRiesgos = Array.from(new Set(activeCatalog.map(c => c.riesgo).filter(Boolean))).sort((a, b) => a.localeCompare(b));
      const uniqueConsecuencias = Array.from(new Set(activeCatalog.map(c => c.consecuencias || c.consecuencia).filter(Boolean))).sort((a, b) => a.localeCompare(b));
      const uniqueMedidasAdm = Array.from(new Set(activeCatalog.map(c => c.medidas_control_administrativas || c.medidas_adm).filter(Boolean))).sort((a, b) => a.localeCompare(b));
      const uniqueMedidasIng = Array.from(new Set(activeCatalog.map(c => c.medidas_control_ingenieria || c.medidas_ing).filter(Boolean))).sort((a, b) => a.localeCompare(b));
      const uniqueEpps = Array.from(new Set(activeCatalog.map(c => c.epps || c.epp).filter(Boolean))).sort((a, b) => a.localeCompare(b));

      // 7. Escribir Tipos de Peligro en la columna G
      wsListas.getCell('G1').value = 'Tipos de Peligro';
      uniqueTiposPeligro.forEach((val, i) => {
        wsListas.getCell(`G${i + 2}`).value = val;
      });

      // 8. Escribir Peligros en la columna H
      wsListas.getCell('H1').value = 'Peligros';
      uniquePeligros.forEach((val, i) => {
        wsListas.getCell(`H${i + 2}`).value = val;
      });

      // 9. Escribir Riesgos en la columna I
      wsListas.getCell('I1').value = 'Riesgos';
      uniqueRiesgos.forEach((val, i) => {
        wsListas.getCell(`I${i + 2}`).value = val;
      });

      // 10. Escribir Consecuencias en la columna J
      wsListas.getCell('J1').value = 'Consecuencias';
      uniqueConsecuencias.forEach((val, i) => {
        wsListas.getCell(`J${i + 2}`).value = val;
      });

      // 11. Escribir Medidas Adm en la columna K
      wsListas.getCell('K1').value = 'Medidas Adm';
      uniqueMedidasAdm.forEach((val, i) => {
        wsListas.getCell(`K${i + 2}`).value = val;
      });

      // 12. Escribir Medidas Ing en la columna L
      wsListas.getCell('L1').value = 'Medidas Ing';
      uniqueMedidasIng.forEach((val, i) => {
        wsListas.getCell(`L${i + 2}`).value = val;
      });

      // 13. Escribir EPPs en la columna M
      wsListas.getCell('M1').value = 'EPPs';
      uniqueEpps.forEach((val, i) => {
        wsListas.getCell(`M${i + 2}`).value = val;
      });

      // 14. Escribir Niveles de Riesgo en la columna N
      const NIVELES_RIESGO = [
        'Riesgo trivial',
        'Riesgo tolerable',
        'Riesgo moderado',
        'Riesgo sustancial',
        'Riesgo intolerable'
      ];
      wsListas.getCell('N1').value = 'Niveles de Riesgo';
      NIVELES_RIESGO.forEach((val, i) => {
        wsListas.getCell(`N${i + 2}`).value = val;
      });

      // Encabezados
      const headers = [
        'Razón Social',
        'Establecimiento',
        'Área / Sector',
        'Puesto / Operación',
        'Tareas',
        'Frecuencia',
        'Situación',
        'Tipo de peligro',
        'Peligro',
        'Riesgo',
        'Consecuencia',
        'Probabilidad',
        'Gravedad',
        'Nivel de Riesgo',
        'Medidas de control Administrativas',
        'Medidas de control de Ingeniería',
        'EPP\'s',
        'Medidas de control recomendadas',
        'Responsable',
        'Fecha planificada',
        'Fecha de realización',
        'Probabilidad',
        'Gravedad',
        'Nivel de Riesgo',
        'Observaciones'
      ];

      const headerRow = wsMatriz.getRow(1);
      headerRow.values = headers;
      headerRow.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = {
        type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF468DFF' }
      };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      headerRow.height = 30;

      // Anchos de columna
      const colWidths = [
        25, 25, 20, 20, 30, 15, 12, 18, 20, 30,
        30, 12, 12, 15, 30, 30, 20, 30, 20, 15,
        15, 12, 12, 15, 30
      ];
      colWidths.forEach((w, idx) => {
        wsMatriz.getColumn(idx + 1).width = w;
      });

      // Ejemplo
      const exampleRow = [
        empresas[0]?.razon_social || 'Ejemplo Cliente S.A.',
        allEstablecimientos.filter(e => e.empresa_id === empresas[0]?.id)[0]?.denominacion || 'Único',
        'Producción',
        'Operario de Torno',
        'Mecanizado de piezas de metal en torno.',
        'Continua',
        'Normal',
        'Mecánicos',
        'Aplastamiento',
        'Aplastamiento entre dos objetos móviles',
        'Amputaciones; Fracturas; Heridas',
        'Mediana',
        'Alta',
        'Riesgo sustancial',
        'Procedimiento de trabajo seguro.',
        'Parada de emergencia.',
        'Gafas y calzado de seguridad.',
        'Instalar resguardo óptico.',
        'Gonzalo Merlo',
        '20/07/2026',
        '',
        'Baja',
        'Alta',
        'Riesgo moderado',
        'Pendiente de compra.'
      ];
      wsMatriz.addRow(exampleRow);

      const totalEmp = uniqueRazones.length;
      const totalEst = uniqueEstablecimientos.length;
      const totalFrec = FRECUENCIAS.length;
      const totalSit = SITUACIONES.length;
      const totalPro = NIVELES_PROBABILIDAD.length;
      const totalGra = NIVELES_GRAVEDAD.length;

      const totalTipos = uniqueTiposPeligro.length;
      const totalPel = uniquePeligros.length;
      const totalRsg = uniqueRiesgos.length;
      const totalCons = uniqueConsecuencias.length;
      const totalMedAdm = uniqueMedidasAdm.length;
      const totalMedIng = uniqueMedidasIng.length;
      const totalEpps = uniqueEpps.length;

      for (let row = 2; row <= 500; row++) {
        if (totalEmp > 0) {
          wsMatriz.getCell(`A${row}`).dataValidation = {
            type: 'list', allowBlank: true, formulae: [`ListasDefinidas!$A$2:$A$${totalEmp + 1}`],
            showErrorMessage: true, errorTitle: 'Valor inválido', error: 'Seleccione una Razón Social de la lista.'
          };
        }
        if (totalEst > 0) {
          wsMatriz.getCell(`B${row}`).dataValidation = {
            type: 'list', allowBlank: true, formulae: [`ListasDefinidas!$B$2:$B$${totalEst + 1}`],
            showErrorMessage: true, errorTitle: 'Valor inválido', error: 'Seleccione un Establecimiento de la lista.'
          };
        }
        wsMatriz.getCell(`F${row}`).dataValidation = {
          type: 'list', allowBlank: true, formulae: [`ListasDefinidas!$C$2:$C$${totalFrec + 1}`],
          showErrorMessage: true, errorTitle: 'Valor inválido', error: 'Seleccione una Frecuencia de la lista.'
        };
        wsMatriz.getCell(`G${row}`).dataValidation = {
          type: 'list', allowBlank: true, formulae: [`ListasDefinidas!$D$2:$D$${totalSit + 1}`],
          showErrorMessage: true, errorTitle: 'Valor inválido', error: 'Seleccione una Situación de la lista.'
        };
        wsMatriz.getCell(`L${row}`).dataValidation = {
          type: 'list', allowBlank: true, formulae: [`ListasDefinidas!$E$2:$E$${totalPro + 1}`],
          showErrorMessage: true, errorTitle: 'Valor inválido', error: 'Seleccione una Probabilidad.'
        };
        wsMatriz.getCell(`M${row}`).dataValidation = {
          type: 'list', allowBlank: true, formulae: [`ListasDefinidas!$F$2:$F$${totalGra + 1}`],
          showErrorMessage: true, errorTitle: 'Valor inválido', error: 'Seleccione una Gravedad.'
        };
        wsMatriz.getCell(`V${row}`).dataValidation = {
          type: 'list', allowBlank: true, formulae: [`ListasDefinidas!$E$2:$E$${totalPro + 1}`],
          showErrorMessage: true, errorTitle: 'Valor inválido', error: 'Seleccione una Probabilidad.'
        };
        wsMatriz.getCell(`W${row}`).dataValidation = {
          type: 'list', allowBlank: true, formulae: [`ListasDefinidas!$F$2:$F$${totalGra + 1}`],
          showErrorMessage: true, errorTitle: 'Valor inválido', error: 'Seleccione una Gravedad.'
        };

        // H: Tipo de peligro
        if (totalTipos > 0) {
          wsMatriz.getCell(`H${row}`).dataValidation = {
            type: 'list', allowBlank: true, formulae: [`ListasDefinidas!$G$2:$G$${totalTipos + 1}`],
            showErrorMessage: false
          };
        }
        // I: Peligro
        if (totalPel > 0) {
          wsMatriz.getCell(`I${row}`).dataValidation = {
            type: 'list', allowBlank: true, formulae: [`ListasDefinidas!$H$2:$H$${totalPel + 1}`],
            showErrorMessage: false
          };
        }
        // J: Riesgo
        if (totalRsg > 0) {
          wsMatriz.getCell(`J${row}`).dataValidation = {
            type: 'list', allowBlank: true, formulae: [`ListasDefinidas!$I$2:$I$${totalRsg + 1}`],
            showErrorMessage: false
          };
        }
        // K: Consecuencia
        if (totalCons > 0) {
          wsMatriz.getCell(`K${row}`).dataValidation = {
            type: 'list', allowBlank: true, formulae: [`ListasDefinidas!$J$2:$J$${totalCons + 1}`],
            showErrorMessage: false
          };
        }
        // O: Medidas de control Administrativas
        if (totalMedAdm > 0) {
          wsMatriz.getCell(`O${row}`).dataValidation = {
            type: 'list', allowBlank: true, formulae: [`ListasDefinidas!$K$2:$K$${totalMedAdm + 1}`],
            showErrorMessage: false
          };
        }
        // P: Medidas de control de Ingeniería
        if (totalMedIng > 0) {
          wsMatriz.getCell(`P${row}`).dataValidation = {
            type: 'list', allowBlank: true, formulae: [`ListasDefinidas!$L$2:$L$${totalMedIng + 1}`],
            showErrorMessage: false
          };
        }
        // Q: EPP's
        if (totalEpps > 0) {
          wsMatriz.getCell(`Q${row}`).dataValidation = {
            type: 'list', allowBlank: true, formulae: [`ListasDefinidas!$M$2:$M$${totalEpps + 1}`],
            showErrorMessage: false
          };
        }

        // N: Nivel de Riesgo Inicial
        wsMatriz.getCell(`N${row}`).dataValidation = {
          type: 'list', allowBlank: true, formulae: ['ListasDefinidas!$N$2:$N$6'],
          showErrorMessage: false
        };

        // X: Nivel de Riesgo Residual
        wsMatriz.getCell(`X${row}`).dataValidation = {
          type: 'list', allowBlank: true, formulae: ['ListasDefinidas!$N$2:$N$6'],
          showErrorMessage: false
        };
      }

      // Hoja 3: Matriz de Valoración
      const wsValoracion = workbook.addWorksheet('Matriz de Valoración');
      
      // Título principal
      wsValoracion.mergeCells('A1:E1');
      const titleCell = wsValoracion.getCell('A1');
      titleCell.value = 'MATRIZ DE VALORACIÓN DE RIESGOS (Norma BS 8800)';
      titleCell.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
      titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF468DFF' } };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      wsValoracion.getRow(1).height = 30;

      // Breve explicación
      wsValoracion.mergeCells('A3:E3');
      const descCell = wsValoracion.getCell('A3');
      descCell.value = 'Esta tabla determina el Nivel de Riesgo cruzando la Probabilidad (filas) y la Gravedad (columnas) según la norma BS 8800.';
      descCell.font = { name: 'Arial', size: 10, italic: true };
      
      // Tabla 3x3
      wsValoracion.getCell('A5').value = 'Probabilidad \\ Gravedad';
      wsValoracion.getCell('A5').font = { name: 'Arial', size: 10, bold: true };
      wsValoracion.getCell('A5').alignment = { horizontal: 'center' };

      wsValoracion.getCell('B5').value = 'Baja (Gravedad)';
      wsValoracion.getCell('C5').value = 'Media (Gravedad)';
      wsValoracion.getCell('D5').value = 'Alta (Gravedad)';
      ['B5', 'C5', 'D5'].forEach(ref => {
        wsValoracion.getCell(ref).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
        wsValoracion.getCell(ref).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D0D0D' } };
        wsValoracion.getCell(ref).alignment = { horizontal: 'center' };
      });

      // Filas de Probabilidad
      const rowProbs = ['Baja (Probabilidad)', 'Mediana (Probabilidad)', 'Alta (Probabilidad)'];
      rowProbs.forEach((p, idx) => {
        const cell = wsValoracion.getCell(`A${6 + idx}`);
        cell.value = p;
        cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D0D0D' } };
        cell.alignment = { horizontal: 'center' };
      });

      // Celdas de la matriz
      const matrixData = [
        [
          { text: 'Riesgo trivial', fg: 'FF27AE60', bg: 'FFE8F8F5' },
          { text: 'Riesgo tolerable', fg: 'FF2ECC71', bg: 'FFEAF2F8' },
          { text: 'Riesgo moderado', fg: 'FFD68910', bg: 'FFFEEFAD' }
        ],
        [
          { text: 'Riesgo tolerable', fg: 'FF2ECC71', bg: 'FFEAF2F8' },
          { text: 'Riesgo moderado', fg: 'FFD68910', bg: 'FFFEEFAD' },
          { text: 'Riesgo sustancial', fg: 'FFE67E22', bg: 'FFF5CBA7' }
        ],
        [
          { text: 'Riesgo moderado', fg: 'FFD68910', bg: 'FFFEEFAD' },
          { text: 'Riesgo sustancial', fg: 'FFE67E22', bg: 'FFF5CBA7' },
          { text: 'Riesgo intolerable', fg: 'FFE74C3C', bg: 'FFFADBD8' }
        ]
      ];

      matrixData.forEach((rowVal, rIdx) => {
        rowVal.forEach((cellData, cIdx) => {
          const colLetter = String.fromCharCode(66 + cIdx); // B, C, D
          const cell = wsValoracion.getCell(`${colLetter}${6 + rIdx}`);
          cell.value = cellData.text;
          cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: cellData.fg } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: cellData.bg } };
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        });
      });

      // Bordes
      for (let r = 5; r <= 8; r++) {
        for (let c = 1; c <= 4; c++) {
          const cell = wsValoracion.getCell(r, c);
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFD9D9D9' } },
            left: { style: 'thin', color: { argb: 'FFD9D9D9' } },
            bottom: { style: 'thin', color: { argb: 'FFD9D9D9' } },
            right: { style: 'thin', color: { argb: 'FFD9D9D9' } }
          };
        }
      }

      // Frecuencia
      wsValoracion.mergeCells('A11:E11');
      const frecHeader = wsValoracion.getCell('A11');
      frecHeader.value = 'FRECUENCIA DE EXPOSICIÓN';
      frecHeader.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      frecHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF468DFF' } };
      wsValoracion.getRow(11).height = 20;

      wsValoracion.mergeCells('A12:E12');
      wsValoracion.getCell('A12').value = 'Define qué tan seguido el trabajador está expuesto al peligro identificado en su jornada de trabajo:';
      wsValoracion.getCell('A12').font = { name: 'Arial', size: 9, italic: true };

      const frecs = [
        { label: 'Continua', desc: 'Exposición permanente o varias veces durante la jornada.' },
        { label: 'Frecuente', desc: 'Exposición al menos una vez al día o diariamente.' },
        { label: 'Ocasional', desc: 'Exposición intermitente (semanal o varias veces al mes).' },
        { label: 'Esporádica / Poco usual', desc: 'Exposición mensual o anual; tarea muy ocasional.' },
        { label: 'Rara', desc: 'Exposición eventual o excepcional (ej: mantenimiento anual).' }
      ];

      frecs.forEach((f, idx) => {
        const row = 13 + idx;
        wsValoracion.getCell(`A${row}`).value = f.label;
        wsValoracion.getCell(`A${row}`).font = { name: 'Arial', size: 9, bold: true };
        
        wsValoracion.mergeCells(`B${row}:E${row}`);
        wsValoracion.getCell(`B${row}`).value = f.desc;
        wsValoracion.getCell(`B${row}`).font = { name: 'Arial', size: 9 };
      });

      // Probabilidad
      wsValoracion.mergeCells('A19:E19');
      const probHeader = wsValoracion.getCell('A19');
      probHeader.value = 'NIVELES DE PROBABILIDAD (Norma BS 8800)';
      probHeader.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      probHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF468DFF' } };
      wsValoracion.getRow(19).height = 20;

      wsValoracion.mergeCells('A20:E20');
      wsValoracion.getCell('A20').value = 'Establece la posibilidad de que ocurra el accidente o el daño si fallan las medidas preventivas:';
      wsValoracion.getCell('A20').font = { name: 'Arial', size: 9, italic: true };

      const probs = [
        {
          label: '1. Baja',
          desc: 'Rara vez ocurre. Mínima posibilidad de daño. Ocurre sólo bajo condiciones anormales o circunstancias excepcionales.',
          ex: 'Ejemplos: Resbalón en oficina limpia; explosión de batería con carga segura; caída de herramienta con amarras de seguridad.'
        },
        {
          label: '2. Media',
          desc: 'Podría ocurrir en algunas circunstancias. Evento no cotidiano, pero con posibilidad real si fallan parcialmente las medidas.',
          ex: 'Ejemplos: Contacto con solventes sin guantes por descuido; colisión de montacargas señalizado; caída de escalera de baja altura.'
        },
        {
          label: '3. Alta',
          desc: 'Frecuente o muy probable. El evento es recurrente o las condiciones actuales favorecen sustancialmente su aparición.',
          ex: 'Ejemplos: Lesiones por mala ergonomía persistente; caída de objetos sin redes en obra; inhalación de polvos sin mascarilla.'
        }
      ];

      probs.forEach((p, idx) => {
        const row = 21 + idx;
        wsValoracion.getCell(`A${row}`).value = p.label;
        wsValoracion.getCell(`A${row}`).font = { name: 'Arial', size: 9, bold: true };
        
        wsValoracion.mergeCells(`B${row}:C${row}`);
        wsValoracion.getCell(`B${row}`).value = p.desc;
        wsValoracion.getCell(`B${row}`).font = { name: 'Arial', size: 9 };
        wsValoracion.getCell(`B${row}`).alignment = { wrapText: true, vertical: 'top' };

        wsValoracion.mergeCells(`D${row}:E${row}`);
        wsValoracion.getCell(`D${row}`).value = p.ex;
        wsValoracion.getCell(`D${row}`).font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FF555555' } };
        wsValoracion.getCell(`D${row}`).alignment = { wrapText: true, vertical: 'top' };
        
        wsValoracion.getRow(row).height = 45;
      });

      // Gravedad
      wsValoracion.mergeCells('A25:E25');
      const gravHeader = wsValoracion.getCell('A25');
      gravHeader.value = 'NIVELES DE GRAVEDAD (Severidad)';
      gravHeader.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      gravHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF468DFF' } };
      wsValoracion.getRow(25).height = 20;

      wsValoracion.mergeCells('A26:E26');
      wsValoracion.getCell('A26').value = 'Evalúa las consecuencias físicas y de salud si el accidente ocurriera:';
      wsValoracion.getCell('A26').font = { name: 'Arial', size: 9, italic: true };

      const gravs = [
        {
          label: '1. Leve',
          desc: 'Sin incapacidad o incapacidad menor. Lesiones superficiales que no requieren hospitalización ni interrumpen la tarea.',
          ex: 'Ejemplos: Corte superficial resuelto con botiquín; golpe menor con moretón temporal sin fisuras; irritación ocular leve.'
        },
        {
          label: '2. Moderada',
          desc: 'Incapacidad temporal tratable. Lesiones que requieren atención médica profesional y conllevan días de baja con recuperación.',
          ex: 'Ejemplos: Esguince con fisioterapia; quemadura de segundo grado con metal caliente; fractura tras caída < 1 metro.'
        },
        {
          label: '3. Grave',
          desc: 'Incapacidad permanente o fatalidad. Consecuencias severas permanentes, amputaciones o de riesgo de muerte.',
          ex: 'Ejemplos: Amputación por atrapamiento sin resguardo; electrocución por media/alta tensión; caída > 2 metros sin arnés.'
        }
      ];

      gravs.forEach((g, idx) => {
        const row = 27 + idx;
        wsValoracion.getCell(`A${row}`).value = g.label;
        wsValoracion.getCell(`A${row}`).font = { name: 'Arial', size: 9, bold: true };
        
        wsValoracion.mergeCells(`B${row}:C${row}`);
        wsValoracion.getCell(`B${row}`).value = g.desc;
        wsValoracion.getCell(`B${row}`).font = { name: 'Arial', size: 9 };
        wsValoracion.getCell(`B${row}`).alignment = { wrapText: true, vertical: 'top' };

        wsValoracion.mergeCells(`D${row}:E${row}`);
        wsValoracion.getCell(`D${row}`).value = g.ex;
        wsValoracion.getCell(`D${row}`).font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FF555555' } };
        wsValoracion.getCell(`D${row}`).alignment = { wrapText: true, vertical: 'top' };

        wsValoracion.getRow(row).height = 45;
      });

      wsValoracion.getColumn(1).width = 25;
      wsValoracion.getColumn(2).width = 25;
      wsValoracion.getColumn(3).width = 25;
      wsValoracion.getColumn(4).width = 25;
      wsValoracion.getColumn(5).width = 25;

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'planilla-matriz-riesgos-modelo.xlsx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      triggerToast('Plantilla Excel descargada.');
    } catch (err) {
      console.error(err);
      triggerToast('Error al descargar la plantilla.', 'error');
    }
  };

  const handleLocalFileChange = (file) => {
    if (!file) return;
    setSelectedFileName(file.name);
    parseExcelFile(file);
  };

  const parseExcelFile = (file) => {
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target.result;
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        processExcelRows(rows);
      } catch (err) {
        console.error(err);
        triggerToast('Error al leer el archivo Excel.', 'error');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const processExcelRows = (rows) => {
    if (!rows || rows.length <= 1) {
      triggerToast('La planilla Excel no contiene filas de datos.', 'error');
      return;
    }

    const dataRows = rows.slice(1);
    const parsed = dataRows.map((row, idx) => {
      if (!row || row.length === 0 || row.every(val => val === undefined || val === null || String(val).trim() === '')) {
        return null;
      }

      const getVal = (colIndex) => {
        const val = row[colIndex];
        if (val === undefined || val === null) return '';
        return String(val).trim();
      };

      const razonSocialVal = getVal(0);
      const establecimientoVal = getVal(1);
      const sectorVal = getVal(2);
      const puestoVal = getVal(3);
      const tareasVal = getVal(4);
      const frecuenciaVal = getVal(5);
      const situacionVal = getVal(6);
      const tipoPeligroVal = getVal(7);
      const peligroVal = getVal(8);
      const riesgoVal = getVal(9);
      const consecuenciaVal = getVal(10);
      const probabilidadVal = getVal(11);
      const gravedadVal = getVal(12);
      const medidasAdmVal = getVal(14);
      const medidasIngVal = getVal(15);
      const medidasEppVal = getVal(16);
      const medidasRecomendadasVal = getVal(17);
      const responsableVal = getVal(18);
      const fechaPlanificadaVal = row[19];
      const fechaRealizacionVal = row[20];
      const postProbabilidadVal = getVal(21);
      const postGravedadVal = getVal(22);
      const observacionesVal = getVal(24);

      const errors = [];
      let matchedEmpresaId = null;
      let matchedEstablecimientoId = null;

      // 1. Razón Social
      if (!razonSocialVal) {
        errors.push('Razón Social es requerida.');
      } else {
        const matchingEmpresa = empresas.find(e => 
          e.razon_social.toLowerCase().trim() === razonSocialVal.toLowerCase()
        );
        if (matchingEmpresa) {
          matchedEmpresaId = matchingEmpresa.id;
        } else {
          errors.push(`Razón Social "${razonSocialVal}" no está registrada.`);
        }
      }

      // 2. Establecimiento
      if (!establecimientoVal) {
        errors.push('Establecimiento es requerido.');
      } else if (matchedEmpresaId) {
        const matchingEst = allEstablecimientos.find(e => 
          e.empresa_id === matchedEmpresaId &&
          e.denominacion.toLowerCase().trim() === establecimientoVal.toLowerCase()
        );
        if (matchingEst) {
          matchedEstablecimientoId = matchingEst.id;
        } else {
          errors.push(`Establecimiento "${establecimientoVal}" no pertenece al cliente.`);
        }
      } else {
        errors.push('Establecimiento no pudo validarse.');
      }

      if (!sectorVal) errors.push('Área / Sector es requerido.');
      if (!puestoVal) errors.push('Puesto / Operación es requerido.');
      if (!tareasVal) errors.push('Tareas es requerido.');
      
      // Frecuencia
      if (!frecuenciaVal) {
        errors.push('Frecuencia es requerida.');
      } else {
        const validFrec = FRECUENCIAS.find(f => f.value.toLowerCase() === frecuenciaVal.toLowerCase());
        if (!validFrec) {
          errors.push(`Frecuencia "${frecuenciaVal}" no válida.`);
        }
      }

      // Situación
      if (!situacionVal) {
        errors.push('Situación es requerida.');
      } else {
        const validSit = SITUACIONES.find(s => s.toLowerCase() === situacionVal.toLowerCase());
        if (!validSit) {
          errors.push(`Situación "${situacionVal}" no válida.`);
        }
      }

      if (!peligroVal) errors.push('Peligro es requerido.');
      if (!riesgoVal) errors.push('Riesgo es requerido.');
      if (!consecuenciaVal) errors.push('Consecuencia es requerida.');

      // Probabilidad y Gravedad
      if (!probabilidadVal) {
        errors.push('Probabilidad Inicial es requerida.');
      } else {
        const validProb = NIVELES_PROBABILIDAD.find(p => p.toLowerCase() === probabilidadVal.toLowerCase());
        if (!validProb) errors.push(`Probabilidad "${probabilidadVal}" no válida.`);
      }

      if (!gravedadVal) {
        errors.push('Gravedad Inicial es requerida.');
      } else {
        const validGrav = NIVELES_GRAVEDAD.find(g => g.toLowerCase() === gravedadVal.toLowerCase());
        if (!validGrav) errors.push(`Gravedad "${gravedadVal}" no válida.`);
      }

      // Post Probabilidad y Gravedad
      if (postProbabilidadVal || postGravedadVal) {
        if (!postProbabilidadVal) {
          errors.push('Falta Probabilidad Residual.');
        } else {
          const validProb = NIVELES_PROBABILIDAD.find(p => p.toLowerCase() === postProbabilidadVal.toLowerCase());
          if (!validProb) errors.push(`Probabilidad Residual "${postProbabilidadVal}" no válida.`);
        }

        if (!postGravedadVal) {
          errors.push('Falta Gravedad Residual.');
        } else {
          const validGrav = NIVELES_GRAVEDAD.find(g => g.toLowerCase() === postGravedadVal.toLowerCase());
          if (!validGrav) errors.push(`Gravedad Residual "${postGravedadVal}" no válida.`);
        }
      }

      // Fechas
      const parseDateVal = (val) => {
        if (!val) return null;
        if (val instanceof Date) return val;
        const dStr = String(val).trim();
        if (!dStr) return null;
        const parts = dStr.split('/');
        if (parts.length === 3) {
          const day = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10) - 1;
          const year = parseInt(parts[2], 10);
          const d = new Date(year, month, day);
          if (d.getDate() === day && d.getMonth() === month && d.getFullYear() === year) {
            return d;
          }
        }
        const d = new Date(dStr);
        if (!isNaN(d.getTime())) return d;
        return 'INVALID';
      };

      let parsedFechaPlanificada = null;
      if (fechaPlanificadaVal) {
        const parsed = parseDateVal(fechaPlanificadaVal);
        if (parsed === 'INVALID') {
          errors.push(`Fecha Planificada "${fechaPlanificadaVal}" no válida.`);
        } else {
          parsedFechaPlanificada = parsed;
        }
      }

      let parsedFechaRealizacion = null;
      if (fechaRealizacionVal) {
        const parsed = parseDateVal(fechaRealizacionVal);
        if (parsed === 'INVALID') {
          errors.push(`Fecha de Realización "${fechaRealizacionVal}" no válida.`);
        } else {
          parsedFechaRealizacion = parsed;
        }
      }

      const normalizeNivel = (val, list) => {
        if (!val) return '';
        const match = list.find(x => x.toLowerCase() === val.toLowerCase());
        return match || val;
      };

      const finalProbabilidad = normalizeNivel(probabilidadVal, NIVELES_PROBABILIDAD);
      const finalGravedad = normalizeNivel(gravedadVal, NIVELES_GRAVEDAD);
      const finalPostProbabilidad = normalizeNivel(postProbabilidadVal, NIVELES_PROBABILIDAD);
      const finalPostGravedad = normalizeNivel(postGravedadVal, NIVELES_GRAVEDAD);

      return {
        rowNum: idx + 2,
        empresa_id: matchedEmpresaId,
        establecimiento_id: matchedEstablecimientoId,
        razon_social_display: razonSocialVal,
        establecimiento_display: establecimientoVal,
        sector: sectorVal,
        puesto: puestoVal,
        tareas: tareasVal,
        frecuencia: normalizeNivel(frecuenciaVal, FRECUENCIAS.map(f => f.value)),
        situacion: normalizeNivel(situacionVal, SITUACIONES),
        tipo_peligro: tipoPeligroVal || 'N/A',
        peligro: peligroVal,
        riesgo: riesgoVal,
        consecuencia: consecuenciaVal,
        probabilidad: finalProbabilidad,
        gravedad: finalGravedad,
        medidas_control_adm: medidasAdmVal || null,
        medidas_control_ing: medidasIngVal || null,
        medidas_control_epp: medidasEppVal || null,
        medidas_control_recomendadas: medidasRecomendadasVal || null,
        responsable: responsableVal || null,
        fecha_planificada: parsedFechaPlanificada ? parsedFechaPlanificada.toISOString().split('T')[0] : null,
        fecha_planificada_display: parsedFechaPlanificada ? `${String(parsedFechaPlanificada.getDate()).padStart(2, '0')}/${String(parsedFechaPlanificada.getMonth() + 1).padStart(2, '0')}/${parsedFechaPlanificada.getFullYear()}` : '',
        fecha_realizacion: parsedFechaRealizacion ? parsedFechaRealizacion.toISOString().split('T')[0] : null,
        fecha_realizacion_display: parsedFechaRealizacion ? `${String(parsedFechaRealizacion.getDate()).padStart(2, '0')}/${String(parsedFechaRealizacion.getMonth() + 1).padStart(2, '0')}/${parsedFechaRealizacion.getFullYear()}` : '',
        post_probabilidad: finalPostProbabilidad || null,
        post_gravedad: finalPostGravedad || null,
        observaciones: observacionesVal || null,
        errors
      };
    }).filter(row => row !== null);

    setPreviewRows(parsed);
  };

  const handleDriveImport = async (link) => {
    if (!link) {
      triggerToast('Ingresa un enlace de Google Drive.', 'error');
      return;
    }
    try {
      const res = await fetch('/api/download-excel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: link, tenantId: tenant.id })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al descargar de Drive.');

      const binaryString = window.atob(data.fileBase64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const workbook = XLSX.read(bytes.buffer, { type: 'array', cellDates: true });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      processExcelRows(rows);
      setSelectedFileName('Plantilla de Drive importada');
      triggerToast('Planilla de Drive descargada y analizada.', 'success');
    } catch (err) {
      console.error(err);
      triggerToast('Error al importar desde Google Drive.', 'error');
    }
  };

  const handleLegajoSelect = async (path) => {
    setSelectedLegajoPath(path);
    if (!path) return;
    setLoadingLegajoFile(true);
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .createSignedUrl(path, 3600);
      if (error) throw error;

      const response = await fetch(data.signedUrl);
      const arrayBuffer = await response.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      processExcelRows(rows);
      triggerToast('Planilla del Legajo Técnico analizada.');
    } catch (err) {
      console.error(err);
      triggerToast('Error al descargar archivo del Legajo Técnico.', 'error');
    } finally {
      setLoadingLegajoFile(false);
    }
  };

  const executePersistMatrix = async (records) => {
    try {
      if (isDevMode) {
        if (isBulkMode) {
          const newMocks = records.map((rec, i) => ({
            ...rec,
            id: `mock-mat-${Date.now()}-${i}`
          }));
          setMatrizRiesgos([...newMocks, ...matrizRiesgos]);
          triggerToast('Matriz registrada con éxito (Simulación).');
        } else {
          const updated = {
            ...records[0],
            id: editingId
          };
          setMatrizRiesgos(matrizRiesgos.map(x => x.id === editingId ? updated : x));
          triggerToast('Evaluación actualizada con éxito (Simulación).');
        }
      } else {
        if (isBulkMode) {
          const formatted = records.map(rec => ({
            ...rec,
            created_at: new Date().toISOString()
          }));
          const { error } = await supabase
            .from('matriz_riesgos')
            .insert(formatted);
          if (error) throw error;
          triggerToast('Matriz de riesgos guardada exitosamente.');
        } else {
          const { error } = await supabase
            .from('matriz_riesgos')
            .update(records[0])
            .eq('id', editingId);
          if (error) throw error;
          triggerToast('Evaluación de riesgo guardada exitosamente.');
        }
        await loadRealData();
      }
      handleCloseForm();
    } catch (err) {
      console.error('Error al guardar matriz:', err);
      // Sanitizar el error de Supabase para cumplir con HC-02
      triggerToast('Error al guardar la información. Por favor, reintente en unos minutos.', 'error');
    }
  };

  const handleConfirmSaveProfile = async () => {
    setSaveLoading(true);
    try {
      // 1. Guardar perfiles de establecimientos
      for (const update of pendingEstUpdates) {
        if (!isDevMode) {
          const { error } = await supabase
            .from('establecimientos')
            .update({ sectores: update.sectores })
            .eq('id', update.id);
          if (error) throw error;
        }
        
        // Actualizar el estado local allEstablecimientos para mantenerlo en sincronía
        setAllEstablecimientos(prev => 
          prev.map(e => e.id === update.id ? { ...e, sectores: update.sectores } : e)
        );
      }
      
      // 2. Persistir matriz
      await executePersistMatrix(pendingSaveData);
    } catch (err) {
      console.error('Error al guardar perfiles:', err);
      // Sanitizar el error de Supabase para cumplir con HC-02
      triggerToast('Error al actualizar el perfil del cliente. Por favor, reintente.', 'error');
    } finally {
      // Limpiar estados pendientes
      setPendingSaveData([]);
      setPendingEstUpdates([]);
      setSaveLoading(false);
    }
  };

  const handleCancelSaveProfile = async () => {
    setSaveLoading(true);
    try {
      await executePersistMatrix(pendingSaveData);
    } finally {
      setPendingSaveData([]);
      setPendingEstUpdates([]);
      setSaveLoading(false);
    }
  };

  // Guardado de la Matriz (Inserción en lote o actualización)
  const handleSaveMatriz = async (e) => {
    e.preventDefault();
    
    if (isBulkMode && loadType === 'excel') {
      if (previewRows.length === 0) {
        triggerToast('No has cargado ninguna planilla Excel.', 'error');
        return;
      }
      const errRows = previewRows.filter(r => r.errors.length > 0);
      if (errRows.length > 0) {
        triggerToast(`Corrige los errores de la planilla (Fila ${errRows[0].rowNum}).`, 'error');
        return;
      }
    } else {
      if (!empresaId || !establecimientoId) {
        triggerToast('La Razón Social y el Establecimiento son obligatorios.', 'error');
        return;
      }
    }

    setSaveLoading(true);

    try {
      const recordsToInsert = [];

      if (isBulkMode) {
        if (loadType === 'manual') {
          // Validaciones Carga Masiva
          if (bulkSectores.length === 0) {
            throw new Error('Debe agregar al menos un sector de trabajo.');
          }

          for (const sec of bulkSectores) {
            const sectorName = sec.sector.trim();
            if (!sectorName) {
              throw new Error('Todos los sectores deben poseer una denominación.');
            }

            if (sec.puestos.length === 0) {
              throw new Error(`El sector "${sectorName}" debe poseer al menos un puesto de trabajo.`);
            }

            for (const pst of sec.puestos) {
              const puestoName = pst.puesto.trim();
              if (!puestoName) {
                throw new Error(`Todos los puestos en el sector "${sectorName}" deben poseer una denominación.`);
              }
              if (!pst.tareas.trim()) {
                throw new Error(`Ingrese las tareas del puesto "${puestoName}" en "${sectorName}".`);
              }
              if (!pst.frecuencia) {
                throw new Error(`Falta seleccionar la frecuencia en el puesto "${puestoName}".`);
              }
              if (!pst.peligro) {
                throw new Error(`Falta el peligro en el puesto "${puestoName}".`);
              }
              if (!pst.riesgo) {
                throw new Error(`Falta el riesgo en el puesto "${puestoName}".`);
              }
              if (!pst.consecuencia.trim()) {
                throw new Error(`Falta la consecuencia en el puesto "${puestoName}".`);
              }
              if (!pst.probabilidad || !pst.gravedad) {
                throw new Error(`Falta la evaluación inicial de riesgo en el puesto "${puestoName}".`);
              }

              const initialRisk = getRiskLevel(pst.probabilidad, pst.gravedad)?.text || 'Riesgo trivial';
              const residualRisk = pst.post_probabilidad && pst.post_gravedad 
                ? getRiskLevel(pst.post_probabilidad, pst.post_gravedad)?.text 
                : null;

              recordsToInsert.push({
                tenant_id: tenant.id,
                empresa_id: empresaId,
                establecimiento_id: establecimientoId,
                sector: sectorName,
                puesto: puestoName,
                tareas: pst.tareas.trim(),
                frecuencia: pst.frecuencia,
                situacion: pst.situacion,
                tipo_peligro: pst.tipo_peligro || 'N/A',
                peligro: pst.peligro.trim(),
                riesgo: pst.riesgo.trim(),
                consecuencia: pst.consecuencia.trim(),
                probabilidad: pst.probabilidad,
                gravedad: pst.gravedad,
                nivel_riesgo: initialRisk,
                medidas_control_adm: pst.medidas_control_adm || null,
                medidas_control_ing: pst.medidas_control_ing || null,
                medidas_control_epp: pst.medidas_control_epp || null,
                medidas_control_recomendadas: pst.medidas_control_recomendadas || null,
                responsable: pst.responsable || null,
                fecha_planificada: convertToDbDate(pst.fecha_planificada) || null,
                fecha_realizacion: convertToDbDate(pst.fecha_realizacion) || null,
                post_probabilidad: pst.post_probabilidad || null,
                post_gravedad: pst.post_gravedad || null,
                post_nivel_riesgo: residualRisk,
                observaciones: pst.observaciones || null,
                updated_at: new Date().toISOString()
              });
            }
          }
        } else {
          // Carga por Planilla Excel
          previewRows.forEach(row => {
            const initialRisk = getRiskLevel(row.probabilidad, row.gravedad)?.text || 'Riesgo trivial';
            const residualRisk = row.post_probabilidad && row.post_gravedad 
              ? getRiskLevel(row.post_probabilidad, row.post_gravedad)?.text 
              : null;

            recordsToInsert.push({
              tenant_id: tenant.id,
              empresa_id: row.empresa_id,
              establecimiento_id: row.establecimiento_id,
              sector: row.sector.trim(),
              puesto: row.puesto.trim(),
              tareas: row.tareas.trim(),
              frecuencia: row.frecuencia,
              situacion: row.situacion,
              tipo_peligro: row.tipo_peligro || 'N/A',
              peligro: row.peligro.trim(),
              riesgo: row.riesgo.trim(),
              consecuencia: row.consecuencia.trim(),
              probabilidad: row.probabilidad,
              gravedad: row.gravedad,
              nivel_riesgo: initialRisk,
              medidas_control_adm: row.medidas_control_adm,
              medidas_control_ing: row.medidas_control_ing,
              medidas_control_epp: row.medidas_control_epp,
              medidas_control_recomendadas: row.medidas_control_recomendadas,
              responsable: row.responsable,
              fecha_planificada: row.fecha_planificada || null,
              fecha_realizacion: row.fecha_realizacion || null,
              post_probabilidad: row.post_probabilidad,
              post_gravedad: row.post_gravedad,
              post_nivel_riesgo: residualRisk,
              observaciones: row.observaciones,
              updated_at: new Date().toISOString()
            });
          });
        }
      } else {
        // Validación Edición Individual
        const sectorName = singleSector.trim();
        const puestoName = singlePuesto.trim();
        if (!sectorName || !puestoName) {
          throw new Error('El sector y puesto de trabajo son obligatorios.');
        }
        if (!singleTareas.trim()) {
          throw new Error('La descripción de tareas es obligatoria.');
        }
        if (!singleFrecuencia) {
          throw new Error('La frecuencia es requerida.');
        }
        if (!singlePeligro) {
          throw new Error('El peligro es requerido.');
        }
        if (!singleRiesgo) {
          throw new Error('El riesgo es requerido.');
        }
        if (!singleConsecuencia.trim()) {
          throw new Error('La consecuencia es obligatoria.');
        }
        if (!singleProbabilidad || !singleGravedad) {
          throw new Error('La evaluación inicial de riesgo es requerida.');
        }

        const initialRisk = getRiskLevel(singleProbabilidad, singleGravedad)?.text || 'Riesgo trivial';
        const residualRisk = singlePostProbabilidad && singlePostGravedad 
          ? getRiskLevel(singlePostProbabilidad, singlePostGravedad)?.text 
          : null;

        recordsToInsert.push({
          tenant_id: tenant.id,
          empresa_id: empresaId,
          establecimiento_id: establecimientoId,
          sector: sectorName,
          puesto: puestoName,
          tareas: singleTareas.trim(),
          frecuencia: singleFrecuencia,
          situacion: singleSituacion,
          tipo_peligro: singleTipoPeligro || 'N/A',
          peligro: singlePeligro.trim(),
          riesgo: singleRiesgo.trim(),
          consecuencia: singleConsecuencia.trim(),
          probabilidad: singleProbabilidad,
          gravedad: singleGravedad,
          nivel_riesgo: initialRisk,
          medidas_control_adm: singleMedidasAdm || null,
          medidas_control_ing: singleMedidasIng || null,
          medidas_control_epp: singleMedidasEpp || null,
          medidas_control_recomendadas: singleMedidasRecomendadas || null,
          responsable: singleResponsable || null,
          fecha_planificada: convertToDbDate(singleFechaPlanificada) || null,
          fecha_realizacion: convertToDbDate(singleFechaRealizacion) || null,
          post_probabilidad: singlePostProbabilidad || null,
          post_gravedad: singlePostGravedad || null,
          post_nivel_riesgo: residualRisk,
          observaciones: singleObservaciones || null,
          updated_at: new Date().toISOString()
        });
      }

      // Escaneo de nuevos sectores/puestos/tareas para perfil del cliente
      const updatesMap = {};
      let hasDiscrepancies = false;

      for (const rec of recordsToInsert) {
        const estId = rec.establecimiento_id;
        if (!estId) continue;

        const est = allEstablecimientos.find(e => e.id === estId);
        if (!est) continue;

        if (!updatesMap[estId]) {
          updatesMap[estId] = JSON.parse(JSON.stringify(est.sectores || []));
        }

        const currentSectores = updatesMap[estId];
        const targetSectorName = (rec.sector || '').trim();
        const targetPuestoName = (rec.puesto || '').trim();
        const targetTareas = (rec.tareas || '').trim();

        if (!targetSectorName) continue;

        let sectorObj = currentSectores.find(s => 
          (s.denominacion || '').trim().toLowerCase() === targetSectorName.toLowerCase()
        );

        if (!sectorObj) {
          hasDiscrepancies = true;
          sectorObj = {
            id: 'sec-' + Date.now() + Math.random().toString(36).substr(2, 5),
            denominacion: targetSectorName,
            descripcion: '',
            largo: '',
            ancho: '',
            altura: '',
            isCollapsed: true,
            puestos: []
          };
          currentSectores.push(sectorObj);
        }

        if (targetPuestoName) {
          let puestoObj = (sectorObj.puestos || []).find(p => 
            (p.denominacion || '').trim().toLowerCase() === targetPuestoName.toLowerCase()
          );

          if (!puestoObj) {
            hasDiscrepancies = true;
            puestoObj = {
              id: 'pst-' + Date.now() + Math.random().toString(36).substr(2, 5),
              denominacion: targetPuestoName,
              descripcion: targetTareas,
              isCollapsed: true
            };
            if (!sectorObj.puestos) sectorObj.puestos = [];
            sectorObj.puestos.push(puestoObj);
          } else {
            const currentDesc = (puestoObj.descripcion || '').trim();
            if (!currentDesc && targetTareas) {
              hasDiscrepancies = true;
              puestoObj.descripcion = targetTareas;
            }
          }
        }
      }

      if (hasDiscrepancies) {
        setPendingSaveData(recordsToInsert);
        const formattedUpdates = Object.keys(updatesMap).map(estId => ({
          id: estId,
          sectores: updatesMap[estId]
        }));
        setPendingEstUpdates(formattedUpdates);
        setShowProfileConfirmOpen(true);
        setSaveLoading(false);
        return;
      }

      await executePersistMatrix(recordsToInsert);
    } catch (err) {
      console.error('Error al guardar:', err);
      triggerToast(err.message || 'Error al guardar la información.', 'error');
    } finally {
      setSaveLoading(false);
    }
  };

  // Preparar Edición Individual
  const handleEditClick = (row) => {
    setEditingId(row.id);
    setIsBulkMode(false);

    setEmpresaId(row.empresa_id);
    setEstablecimientoId(row.establecimiento_id);

    // Revisar si el sector coincide con los predefinidos
    const est = allEstablecimientos.find(e => e.id === row.establecimiento_id);
    const hasSector = est?.sectores?.some(s => s.denominacion === row.sector);
    setSingleSector(row.sector);
    setSingleSectorIsManual(!hasSector);

    // Revisar puesto en los predefinidos
    const secObj = est?.sectores?.find(s => s.denominacion === row.sector);
    const hasPuesto = secObj?.puestos?.some(p => p.denominacion === row.puesto);
    setSinglePuesto(row.puesto);
    setSinglePuestoIsManual(!hasPuesto);

    setSingleTareas(row.tareas);
    setSingleFrecuencia(row.frecuencia);
    setSingleSituacion(row.situacion || 'Normal');
    setSingleTipoPeligro(row.tipo_peligro || '');

    // Peligro y riesgo en el catálogo
    const catalogHasPeligro = catalog.some(c => c.peligro === row.peligro);
    setSinglePeligro(row.peligro);
    setSinglePeligroIsManual(!catalogHasPeligro);

    const catalogHasRiesgo = catalog.some(c => c.peligro === row.peligro && c.riesgo === row.riesgo);
    setSingleRiesgo(row.riesgo);
    setSingleRiesgoIsManual(!catalogHasRiesgo);

    setSingleConsecuencia(row.consecuencia || '');
    setSingleProbabilidad(row.probabilidad);
    setSingleGravedad(row.gravedad);

    setSingleMedidasAdm(row.medidas_control_adm || '');
    setSingleMedidasIng(row.medidas_control_ing || '');
    setSingleMedidasEpp(row.medidas_control_epp || '');
    setSingleMedidasRecomendadas(row.medidas_control_recomendadas || '');

    // Responsable
    const memHasRes = miembrosList.some(m => m.full_name === row.responsable);
    setSingleResponsable(row.responsable || '');
    setSingleResponsableIsManual(!memHasRes && !!row.responsable);

    setSingleFechaPlanificada(formatDate(row.fecha_planificada) || '');
    setSingleFechaRealizacion(formatDate(row.fecha_realizacion) || '');
    setSinglePostProbabilidad(row.post_probabilidad || '');
    setSinglePostGravedad(row.post_gravedad || '');
    setSingleObservaciones(row.observaciones || '');

    setIsFormOpen(true);
  };

  // Preparar eliminación
  const handleDeleteClick = (id) => {
    setModalAlert({
      show: true,
      title: '¿Eliminar Evaluación de Riesgo?',
      message: 'Esta acción eliminará de forma permanente el registro del riesgo seleccionado y no se podrá deshacer.',
      confirmText: 'Eliminar',
      onConfirm: async () => {
        try {
          if (isDevMode) {
            setMatrizRiesgos(matrizRiesgos.filter(x => x.id !== id));
            triggerToast('Evaluación eliminada exitosamente (Simulación).');
          } else {
            const { error } = await supabase
              .from('matriz_riesgos')
              .delete()
              .eq('id', id);
            if (error) throw error;
            triggerToast('Evaluación de riesgo eliminada exitosamente.');
            await loadRealData();
          }
          handleCloseForm();
        } catch (err) {
          console.error('Error al eliminar:', err);
          triggerToast('Error al eliminar la evaluación.', 'error');
        } finally {
          closeAlert();
        }
      }
    });
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
        if (path.endsWith('/matriz-riesgos')) {
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
        message: '¿Estás seguro de que deseas salir del formulario? Perderás todos los cambios cargados que no se hayan guardado.',
        confirmText: 'Confirmar',
        onConfirm: () => {
          closeAlert();
          if (path.endsWith('/matriz-riesgos')) {
            handleCloseForm();
          } else {
            window.location.href = path;
          }
        }
      });
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('user-profile');
    }
    window.location.href = '/login';
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingId(null);
    setEmpresaId('');
    setEstablecimientoId('');
    setBulkSectores([]);
    setSingleSector('');
    setSingleSectorIsManual(false);
    setSinglePuesto('');
    setSinglePuestoIsManual(false);
    setSingleTareas('');
    setSingleFrecuencia('');
    setSingleSituacion('Normal');
    setSingleTipoPeligro('');
    setSinglePeligro('');
    setSinglePeligroIsManual(false);
    setSingleRiesgo('');
    setSingleRiesgoIsManual(false);
    setSingleConsecuencia('');
    setSingleProbabilidad('');
    setSingleGravedad('');
    setSingleMedidasAdm('');
    setSingleMedidasIng('');
    setSingleMedidasEpp('');
    setSingleMedidasRecomendadas('');
    setSingleResponsable('');
    setSingleResponsableIsManual(false);
    setSingleFechaPlanificada('');
    setSingleFechaRealizacion('');
    setSinglePostProbabilidad('');
    setSinglePostGravedad('');
    setSingleObservaciones('');
    setLoadType('excel');
    setUploadType('local');
    setPreviewRows([]);
    setSelectedFileName('');
    setSelectedLegajoPath('');
  };

  // Ordenar columnas
  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Filtros aplicados
  const filteredMatriz = matrizRiesgos.filter((row) => {
    if (filterText) {
      const q = filterText.toLowerCase();
      const sec = (row.sector || '').toLowerCase();
      const pst = (row.puesto || '').toLowerCase();
      const pel = (row.peligro || '').toLowerCase();
      const rsg = (row.riesgo || '').toLowerCase();
      const resp = (row.responsable || '').toLowerCase();
      const tar = (row.tareas || '').toLowerCase();

      if (!sec.includes(q) && !pst.includes(q) && !pel.includes(q) && !rsg.includes(q) && !resp.includes(q) && !tar.includes(q)) {
        return false;
      }
    }

    if (filterEmpresa && row.empresa_id !== filterEmpresa) return false;
    if (filterEstablecimiento && row.establecimiento_id !== filterEstablecimiento) return false;
    if (filterNivelRiesgo && row.nivel_riesgo !== filterNivelRiesgo) return false;

    return true;
  });

  // Ordenar datos final
  const sortedMatriz = [...filteredMatriz].sort((a, b) => {
    if (!sortField) return 0;
    let valA = '';
    let valB = '';

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
    } else {
      valA = a[sortField] || '';
      valB = b[sortField] || '';
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();
    }

    if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  return (
    <div className="h-screen overflow-hidden bg-syso-bg text-slate-700 flex font-sans">
      
      {/* Sidebar */}
      <Sidebar
        tenantSlug={tenantSlug}
        profile={profile}
        currentSection="matriz-riesgos"
        isSidebarCollapsed={isSidebarCollapsed}
        toggleSidebar={toggleSidebar}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
        handleLogout={handleLogout}
        onNavigate={handleSidebarNavigation}
      />

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <AppPageHeader
          title="Matriz de identificación de peligros y valoración de riesgos"
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
              <p className="text-xs text-slate-500 font-semibold">Cargando matriz de riesgos...</p>
            </div>
          </div>
        ) : (
          <div className="max-w-[95%] mx-auto w-full py-8 px-4 md:px-0 flex-1 flex flex-col min-h-0">
            
            {isFormOpen ? (
              // FORMULARIO DE ALTA O EDICIÓN INLINE
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
                      {isBulkMode ? 'Cargar Nueva Matriz de Riesgos' : editingId ? 'Editar Evaluación de Riesgo' : 'Registrar Riesgo'}
                    </span>
                  </div>
                  <button type="button" onClick={handleExitForm} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-200 cursor-pointer">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <form onSubmit={handleSaveMatriz} className="p-6 space-y-6 overflow-y-auto flex-1 scrollbar-thin">
                  <fieldset id="matriz-form-container" className={`space-y-6 ${!canEdit ? '[&_input]:pointer-events-none [&_select]:pointer-events-none [&_textarea]:pointer-events-none [&_input]:bg-slate-100/60 [&_select]:bg-slate-100/60 [&_textarea]:bg-slate-100/60 [&_input]:text-slate-400 [&_select]:text-slate-400 [&_textarea]:text-slate-400' : ''}`}>

                    {isBulkMode && !editingId && (
                      <div className="flex gap-2 border-b border-slate-200 pb-1">
                        <button
                          type="button"
                          onClick={() => setLoadType('excel')}
                          className={`pb-2 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                            loadType === 'excel'
                              ? 'border-[#468DFF] text-[#468DFF]'
                              : 'border-transparent text-slate-400 hover:text-slate-600'
                          }`}
                        >
                          Cargar por Planilla Excel
                        </button>
                        <button
                          type="button"
                          onClick={() => setLoadType('manual')}
                          className={`pb-2 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                            loadType === 'manual'
                              ? 'border-[#468DFF] text-[#468DFF]'
                              : 'border-transparent text-slate-400 hover:text-slate-600'
                          }`}
                        >
                          Carga Manual de Matriz
                        </button>
                      </div>
                    )}

                    {(!isBulkMode || loadType === 'manual') && (
                      /* Sección 1: Cliente y Establecimiento */
                      <div className="space-y-4">
                        <h3 className="font-outfit text-sm font-bold text-slate-800 border-b border-slate-100 pb-1.5 uppercase tracking-wider flex items-center gap-2">
                          <Building className="h-4 w-4 text-[#468DFF]" />
                          1. Ubicación
                        </h3>
                        
                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-slate-600">Cliente / Razón Social *</label>
                            <select
                              required
                              disabled={editingId !== null}
                              value={empresaId}
                              onChange={(e) => { 
                                setEmpresaId(e.target.value); 
                                setEstablecimientoId(''); 
                                setBulkSectores([]);
                              }}
                              className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all cursor-pointer disabled:bg-slate-100 disabled:text-slate-400"
                            >
                              <option value="">Selecciona un cliente</option>
                              {empresas.map(emp => (
                                <option key={emp.id} value={emp.id}>{emp.razon_social}</option>
                              ))}
                            </select>
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-slate-600">Establecimiento *</label>
                            <select
                              required
                              disabled={!empresaId || editingId !== null}
                              value={establecimientoId}
                              onChange={(e) => {
                                setEstablecimientoId(e.target.value);
                                setBulkSectores([]);
                              }}
                              className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all cursor-pointer disabled:bg-slate-100 disabled:text-slate-400"
                            >
                              <option value="">{!empresaId ? 'Selecciona un cliente primero' : 'Selecciona un establecimiento'}</option>
                              {filteredEstablecimientos.map(est => (
                                <option key={est.id} value={est.id}>{est.denominacion}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    )}

                    {isBulkMode ? (
                      loadType === 'excel' ? (
                        /* B: EXCEL LOAD PIPELINE */
                        <div className="space-y-4">
                          {/* Descarga plantilla */}
                          <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-4 shadow-2xs">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div className="space-y-0.5">
                                <h4 className="text-xs font-bold text-slate-700">Descarga la plantilla de Excel modelo</h4>
                                <p className="text-[10px] text-slate-400 font-semibold">Completa los riesgos e impórtalos de forma masiva en el sistema.</p>
                              </div>
                              <button
                                type="button"
                                onClick={handleDownloadTemplate}
                                className="flex items-center gap-1.5 bg-white border border-slate-200 hover:border-[#468DFF] hover:text-[#468DFF] px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer text-slate-600 shrink-0 shadow-sm"
                              >
                                <Download className="h-4 w-4" />
                                <span>Descargar Plantilla</span>
                              </button>
                            </div>

                            <div className="border-t border-slate-200 pt-3">
                              <h5 className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                <ClipboardList className="h-3.5 w-3.5 text-[#468DFF]" />
                                Instrucciones de llenado
                              </h5>
                              <div className="grid md:grid-cols-3 gap-3 text-[10px] text-slate-500 font-semibold leading-relaxed">
                                <div className="space-y-1 bg-white p-2.5 rounded-lg border border-slate-100 shadow-2xs">
                                  <span className="text-[#468DFF] font-bold block">✓ Campos con Menú Desplegable</span>
                                  <span><b>Razón Social</b>, <b>Establecimiento</b>, <b>Frecuencia</b>, <b>Situación</b>, <b>Probabilidad</b> y <b>Gravedad</b> deben seleccionarse obligatoriamente desde las listas de las celdas. <i className="text-slate-400 block mt-1 font-medium">Nota: Si el cliente o establecimiento no figura, regístralo primero en la plataforma para que aparezca en las opciones del Excel.</i></span>
                                </div>
                                <div className="space-y-1 bg-white p-2.5 rounded-lg border border-slate-100 shadow-2xs">
                                  <span className="text-emerald-600 font-bold block">✎ Campos de Texto Libre</span>
                                  <span><b>Área/Sector</b>, <b>Puesto</b>, <b>Tareas</b>, <b>Peligro</b>, <b>Riesgo</b>, <b>Consecuencia</b>, <b>Medidas de control</b>, <b>Responsable</b>, <b>Fechas</b> y <b>Observaciones</b> son de texto libre. Completa detalladamente cada columna.</span>
                                </div>
                                <div className="space-y-1 bg-rose-50 p-2.5 rounded-lg border border-rose-100">
                                  <span className="text-rose-600 font-bold block flex items-center gap-1">⚠️ Restricciones Críticas</span>
                                  <span><b>No modifiques los nombres ni el orden de las columnas (Fila 1)</b>. No elimines ninguna hoja del archivo. Cualquier alteración de la estructura impedirá la importación de los datos.</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* DocumentUploadZone */}
                          <DocumentUploadZone
                            label="Planilla de Matriz de Riesgos"
                            file={null}
                            fileName={selectedFileName}
                            onFileChange={handleLocalFileChange}
                            onDriveImport={handleDriveImport}
                            disabled={isFormDisabled}
                            accept=".xlsx,.xls"
                            onToast={triggerToast}
                            uploadType={uploadType}
                            setUploadType={(newType) => {
                              setUploadType(newType);
                              setPreviewRows([]);
                              setSelectedFileName('');
                              setSelectedLegajoPath('');
                            }}
                            showTabs={true}
                            tabs={[
                              { id: 'local', name: 'Archivo Local' },
                              { id: 'drive', name: 'Enlace Drive' },
                              { id: 'legajo', name: 'Desde Legajo Técnico' }
                            ]}
                          >
                            {uploadType === 'legajo' && (
                              <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-600 block mb-1">Elegir planilla desde el Legajo Técnico</label>
                                {legajoFiles.length === 0 ? (
                                  <div className="border border-slate-200 rounded-2xl p-6 text-center text-xs font-bold text-slate-400 bg-slate-50/30 flex flex-col items-center justify-center gap-2">
                                    <FolderOpen className="h-8 w-8 text-slate-300" />
                                    <span>No hay planillas Excel en el Legajo Técnico de este tenant.</span>
                                  </div>
                                ) : (
                                  <div className="space-y-2">
                                    <select
                                      value={selectedLegajoPath}
                                      onChange={(e) => handleLegajoSelect(e.target.value)}
                                      className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all cursor-pointer font-semibold"
                                    >
                                      <option value="">-- Elige un archivo --</option>
                                      {legajoFiles.map(file => (
                                        <option key={file.id} value={file.documento_url}>
                                          {file.documento_nombre} (Fecha: {formatDate(file.fecha)})
                                        </option>
                                      ))}
                                    </select>
                                    {loadingLegajoFile && (
                                      <div className="flex items-center gap-2 text-[10px] font-bold text-[#468DFF] animate-pulse pl-1">
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        <span>Descargando y procesando archivo...</span>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </DocumentUploadZone>

                          {/* Preview Rows Table */}
                          {previewRows.length > 0 && (
                            <div className="space-y-3 pt-2">
                              <div className="flex items-center justify-between">
                                <h4 className="text-xs font-bold text-slate-700 font-outfit">Vista previa de riesgos ({previewRows.length} filas)</h4>
                                {previewRows.filter(r => r.errors.length > 0).length > 0 && (
                                  <span className="text-[10px] font-bold text-red-500 bg-red-50 px-2.5 py-0.5 rounded-full border border-red-200">
                                    {previewRows.filter(r => r.errors.length > 0).length} errores detectados
                                  </span>
                                )}
                              </div>

                              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-[35vh] overflow-y-auto">
                                <table className="w-full text-left border-collapse text-[11px] min-w-[1200px]">
                                  <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-400 uppercase select-none">
                                      <th className="px-4 py-2 text-center w-12">Fila</th>
                                      <th className="px-4 py-2">Razón Social</th>
                                      <th className="px-4 py-2">Establecimiento</th>
                                      <th className="px-4 py-2">Sector</th>
                                      <th className="px-4 py-2">Puesto</th>
                                      <th className="px-4 py-2">Peligro / Riesgo</th>
                                      <th className="px-4 py-2 text-center">Riesgo Inicial</th>
                                      <th className="px-4 py-2 text-center">Riesgo Residual</th>
                                      <th className="px-4 py-2 text-right">Estado</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 font-semibold text-slate-600">
                                    {previewRows.map((row, idx) => {
                                      const initLevel = getRiskLevel(row.probabilidad, row.gravedad);
                                      const resLevel = row.post_probabilidad && row.post_gravedad ? getRiskLevel(row.post_probabilidad, row.post_gravedad) : null;

                                      return (
                                        <tr key={idx} className={`hover:bg-slate-50/50 transition-colors ${row.errors.length > 0 ? 'bg-red-50/20' : ''}`}>
                                          <td className="px-4 py-2 text-center text-slate-400 font-bold">#{row.rowNum}</td>
                                          <td className="px-4 py-2">
                                            <span className={row.empresa_id ? 'text-slate-700' : 'text-red-500 font-bold'}>{row.razon_social_display || '(Vacío)'}</span>
                                          </td>
                                          <td className="px-4 py-2 font-mono">
                                            <span className={row.establecimiento_id ? 'text-slate-700' : 'text-red-500 font-bold'}>{row.establecimiento_display || '(Vacío)'}</span>
                                          </td>
                                          <td className="px-4 py-2">{row.sector || '(Vacío)'}</td>
                                          <td className="px-4 py-2">{row.puesto || '(Vacío)'}</td>
                                          <td className="px-4 py-2 text-slate-400 truncate max-w-[200px]" title={`Peligro: ${row.peligro}\nRiesgo: ${row.riesgo}`}>
                                            P: {row.peligro || '(Vacío)'} <br/> R: {row.riesgo || '(Vacío)'}
                                          </td>
                                          <td className="px-4 py-2 text-center">
                                            {initLevel ? (
                                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${initLevel.bgClass}`}>
                                                {initLevel.text}
                                              </span>
                                            ) : (
                                              <span className="text-red-500 font-bold">(Incompleto)</span>
                                            )}
                                          </td>
                                          <td className="px-4 py-2 text-center">
                                            {resLevel ? (
                                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${resLevel.bgClass}`}>
                                                {resLevel.text}
                                              </span>
                                            ) : (
                                              <span className="text-slate-400 font-normal">-</span>
                                            )}
                                          </td>
                                          <td className="px-4 py-2 text-right">
                                            {row.errors.length === 0 ? (
                                              <span className="text-green-600 flex items-center justify-end gap-1 font-bold">
                                                <Check className="h-3.5 w-3.5" /> Ok
                                              </span>
                                            ) : (
                                              <span className="text-red-500 flex items-center justify-end gap-1 font-bold hover:underline cursor-help group relative">
                                                <AlertTriangle className="h-3.5 w-3.5" /> Errores
                                                <div className="absolute right-0 bottom-6 bg-red-600 text-white rounded-lg p-2 shadow-xl text-[10px] w-64 max-w-xs text-left hidden group-hover:block z-50 leading-relaxed font-semibold">
                                                  <ul className="list-disc list-inside">
                                                    {row.errors.map((e, eIdx) => <li key={eIdx}>{e}</li>)}
                                                  </ul>
                                                </div>
                                              </span>
                                            )}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        /* C: MANUAL BULK SECTOR INPUT */
                        <div className="space-y-6">
                        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                          <h3 className="font-outfit text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                            <PlusCircle className="h-4 w-4 text-[#468DFF]" />
                            Sectores y Puestos de Trabajo
                          </h3>
                          <button
                            type="button"
                            disabled={!establecimientoId}
                            onClick={handleAddBulkSector}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#468DFF] hover:bg-[#0511F2] text-white text-xs font-bold transition-all disabled:opacity-50"
                          >
                            <PlusCircle className="h-3.5 w-3.5" />
                            Agregar Sector de Trabajo
                          </button>
                        </div>

                        {!establecimientoId && (
                          <div className="p-4 border border-dashed border-slate-250 bg-slate-50 rounded-xl text-center">
                            <span className="text-xs text-slate-400 font-semibold">Seleccione un Cliente / Razón Social y Establecimiento, para comenzar a estructurar la matriz.</span>
                          </div>
                        )}

                        {establecimientoId && bulkSectores.length === 0 && (
                          <div className="p-8 border border-dashed border-slate-200 bg-white rounded-xl text-center flex flex-col items-center justify-center gap-2">
                            <AlertCircle className="h-8 w-8 text-slate-300" />
                            <span className="text-xs text-slate-400 font-semibold block">La matriz está vacía. Comience agregando un sector de trabajo.</span>
                          </div>
                        )}

                        {bulkSectores.map((sec, secIdx) => (
                          <div key={sec.id} className="border border-slate-200 rounded-xl bg-slate-50/40 p-4 space-y-4">
                            {/* Cabecera del Sector */}
                            <div className="flex justify-between items-center border-b border-slate-200/80 pb-2.5">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-slate-700 bg-slate-200/80 px-2 py-0.5 rounded-lg border border-slate-300/40 uppercase">
                                  Sector #{secIdx + 1}
                                </span>
                                {sec.sector && (
                                  <span className="text-xs font-bold text-slate-800 max-w-[200px] truncate">
                                    - {sec.sector}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <span
                                  role="button"
                                  onClick={() => {
                                    const updated = bulkSectores.map(s => {
                                      if (s.id === sec.id) {
                                        return { ...s, isCollapsed: !s.isCollapsed };
                                      }
                                      return s;
                                    });
                                    setBulkSectores(updated);
                                  }}
                                  className="text-[9px] text-slate-600 hover:text-slate-800 bg-white hover:bg-slate-100 font-bold px-2 py-0.5 rounded-md border border-slate-200 transition-all cursor-pointer flex items-center gap-0.5 shadow-sm"
                                  title={sec.isCollapsed ? "Expandir sector" : "Contraer sector"}
                                >
                                  {sec.isCollapsed ? (
                                    <>
                                      <ChevronDown className="h-2.5 w-2.5" />
                                      Ver más
                                    </>
                                  ) : (
                                    <>
                                      <ChevronUp className="h-2.5 w-2.5" />
                                      Ver menos
                                    </>
                                  )}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleDuplicateBulkSector(sec)}
                                  className="p-1 text-slate-650 hover:bg-slate-100 rounded transition-colors border border-slate-200 flex items-center justify-center cursor-pointer"
                                  title="Duplicar Sector"
                                >
                                  <Copy className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveBulkSector(sec.id)}
                                  className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors border border-red-200 flex items-center justify-center cursor-pointer"
                                  title="Eliminar Sector"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Contenido del Sector */}
                            {!sec.isCollapsed && (
                              <div className="space-y-4">
                                <div className="flex justify-between items-center gap-4 bg-white/60 p-3 rounded-xl border border-slate-100">
                                  <div className="flex-grow flex flex-col gap-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Seleccionar Área / Sector *</label>
                                    <div className="space-y-2">
                                      <select
                                        required
                                        value={sec.isManual ? 'MANUAL' : sec.sector}
                                        onChange={(e) => {
                                          if (e.target.value === 'MANUAL') {
                                            handleUpdateBulkSector(sec.id, { isManual: true, sector: '' });
                                          } else {
                                            handleUpdateBulkSector(sec.id, { isManual: false, sector: e.target.value });
                                          }
                                        }}
                                        className="w-full border border-slate-200 rounded-xl px-3 py-1.5 text-xs bg-white focus:outline-none cursor-pointer font-medium"
                                      >
                                        <option value="">Selecciona sector...</option>
                                        {currentEstSectores.map(s => (
                                          <option key={s.id} value={s.denominacion}>{s.denominacion}</option>
                                        ))}
                                        <option value="MANUAL">Otro (especificar...)</option>
                                      </select>

                                      {sec.isManual && (
                                        <div className="flex flex-col gap-1">
                                          <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Ingresar sector *</label>
                                          <input
                                            type="text"
                                            required
                                            placeholder="Ingresar sector a mano..."
                                            value={sec.sector}
                                            onChange={(e) => handleUpdateBulkSector(sec.id, 'sector', e.target.value)}
                                            className="w-full border border-slate-200 rounded-xl px-3 py-1.5 text-xs bg-white focus:outline-none"
                                          />
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 mt-5">
                                    <button
                                      type="button"
                                      onClick={() => handleAddBulkPuesto(sec.id)}
                                      disabled={!sec.sector}
                                      className="px-2.5 py-1.5 bg-[#468DFF] hover:bg-[#0511F2] text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-1 cursor-pointer"
                                    >
                                      <PlusCircle className="h-3 w-3" />
                                      Puesto
                                    </button>
                                  </div>
                                </div>

                                {/* Puestos de Trabajo */}
                                <div className="pl-4 border-l-2 border-slate-200 space-y-4">
                                  {sec.puestos.length === 0 && (
                                    <span className="text-[10px] text-slate-400 font-semibold block py-1">No hay puestos agregados en este sector. Haga clic en "+ Puesto".</span>
                                  )}
                                  
                                  {sec.puestos.map((pst, pstIdx) => {
                                    const sectorEstObj = currentEstSectores.find(s => s.denominacion === sec.sector);
                                    const predefPuestos = sectorEstObj?.puestos || [];

                                    return (
                                      <div key={pst.id} className="border border-slate-200 rounded-xl bg-white p-4 space-y-4">
                                        {/* Cabecera del Puesto */}
                                        <div className="flex items-center justify-between gap-4 pb-2 border-b border-slate-100">
                                          <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-bold text-slate-700 bg-slate-200/80 px-2 py-0.5 rounded-lg border border-slate-300/40 uppercase">
                                              Puesto #{pstIdx + 1}
                                            </span>
                                            {pst.puesto && (
                                              <span className="text-xs font-bold text-slate-800 max-w-[200px] truncate">
                                                - {pst.puesto}
                                              </span>
                                            )}
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <span
                                              role="button"
                                              onClick={() => {
                                                const updated = bulkSectores.map(s => {
                                                  if (s.id === sec.id) {
                                                    return {
                                                      ...s,
                                                      puestos: s.puestos.map(p => {
                                                        if (p.id === pst.id) {
                                                          return { ...p, isCollapsed: !p.isCollapsed };
                                                        }
                                                        return p;
                                                      })
                                                    };
                                                  }
                                                  return s;
                                                });
                                                setBulkSectores(updated);
                                              }}
                                              className="text-[9px] text-slate-600 hover:text-slate-800 bg-white hover:bg-slate-100 font-bold px-2 py-0.5 rounded-md border border-slate-200 transition-all cursor-pointer flex items-center gap-0.5 shadow-sm"
                                              title={pst.isCollapsed ? "Expandir puesto" : "Contraer puesto"}
                                            >
                                              {pst.isCollapsed ? (
                                                <>
                                                  <ChevronDown className="h-2.5 w-2.5" />
                                                  Ver más
                                                </>
                                              ) : (
                                                <>
                                                  <ChevronUp className="h-2.5 w-2.5" />
                                                  Ver menos
                                                </>
                                              )}
                                            </span>
                                            <button
                                              type="button"
                                              onClick={() => handleDuplicateBulkPuesto(sec.id, pst)}
                                              className="p-1 text-slate-650 hover:bg-slate-100 rounded transition-colors border border-slate-200 flex items-center justify-center cursor-pointer"
                                              title="Duplicar puesto"
                                            >
                                              <Copy className="h-3.5 w-3.5" />
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => handleRemoveBulkPuesto(sec.id, pst.id)}
                                              className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors border border-red-200 flex items-center justify-center cursor-pointer"
                                              title="Eliminar puesto"
                                            >
                                              <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                          </div>
                                        </div>

                                        {/* Contenido del Puesto */}
                                        {!pst.isCollapsed && (
                                          <div className="space-y-4">
                                            <div className="grid md:grid-cols-2 gap-4">
                                              <div className="flex flex-col gap-1">
                                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Puesto / Operación *</label>
                                                <div className="space-y-2">
                                                  <select
                                                    required
                                                    value={pst.isManual ? 'MANUAL' : pst.puesto}
                                                    onChange={(e) => {
                                                      if (e.target.value === 'MANUAL') {
                                                        handleUpdateBulkPuesto(sec.id, pst.id, { isManual: true, puesto: '' });
                                                      } else {
                                                        handleUpdateBulkPuesto(sec.id, pst.id, { isManual: false, puesto: e.target.value });
                                                      }
                                                    }}
                                                    className="w-full border border-slate-200 rounded-xl px-3 py-1.5 text-xs bg-white focus:outline-none cursor-pointer font-medium"
                                                  >
                                                    <option value="">Selecciona puesto...</option>
                                                    {predefPuestos.map(p => (
                                                      <option key={p.id} value={p.denominacion}>{p.denominacion}</option>
                                                    ))}
                                                    <option value="MANUAL">Otro (especificar...)</option>
                                                  </select>

                                                  {pst.isManual && (
                                                    <div className="flex flex-col gap-1">
                                                      <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Ingresar puesto *</label>
                                                      <input
                                                        type="text"
                                                        required
                                                        placeholder="Ingresar puesto a mano..."
                                                        value={pst.puesto}
                                                        onChange={(e) => handleUpdateBulkPuesto(sec.id, pst.id, 'puesto', e.target.value)}
                                                        className="w-full border border-slate-200 rounded-xl px-3 py-1.5 text-xs bg-white focus:outline-none"
                                                      />
                                                    </div>
                                                  )}
                                                </div>
                                              </div>

                                              <div className="flex flex-col gap-1">
                                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tareas Ejecutadas *</label>
                                                <input
                                                  type="text"
                                                  required
                                                  placeholder="Descripción de las tareas..."
                                                  value={pst.tareas}
                                                  onChange={(e) => handleUpdateBulkPuesto(sec.id, pst.id, 'tareas', e.target.value)}
                                                  className="w-full border border-slate-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none"
                                                />
                                              </div>
                                            </div>

                                            {/* Campos de Análisis */}
                                            <div className="grid md:grid-cols-4 gap-4">
                                              <div className="flex flex-col gap-1">
                                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                                                  Frecuencia *
                                                  <button type="button" onClick={() => setHelpModal({ show: true, type: 'frecuencia' })} className="text-slate-400 hover:text-[#468DFF]"><HelpCircle className="h-3 w-3" /></button>
                                                </label>
                                                <select
                                                  required
                                                  value={pst.frecuencia}
                                                  onChange={(e) => handleUpdateBulkPuesto(sec.id, pst.id, 'frecuencia', e.target.value)}
                                                  className="w-full border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs bg-white focus:outline-none cursor-pointer"
                                                >
                                                  <option value="">Selecciona...</option>
                                                  {FRECUENCIAS.map(f => (
                                                    <option key={f.value} value={f.value}>{f.value}</option>
                                                  ))}
                                                </select>
                                              </div>

                                              <div className="flex flex-col gap-1">
                                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Situación *</label>
                                                <select
                                                  required
                                                  value={pst.situacion}
                                                  onChange={(e) => handleUpdateBulkPuesto(sec.id, pst.id, 'situacion', e.target.value)}
                                                  className="w-full border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs bg-white focus:outline-none cursor-pointer"
                                                >
                                                  {SITUACIONES.map(s => (
                                                    <option key={s} value={s}>{s}</option>
                                                  ))}
                                                </select>
                                              </div>

                                              <div className="flex flex-col gap-1">
                                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Peligro *</label>
                                                {pst.peligroIsManual ? (
                                                  <div className="space-y-1">
                                                    <input
                                                      type="text"
                                                      required
                                                      placeholder="Peligro a mano..."
                                                      value={pst.peligro}
                                                      onChange={(e) => handleUpdateBulkPuesto(sec.id, pst.id, 'peligro', e.target.value)}
                                                      className="w-full border border-slate-200 rounded-xl px-2.5 py-1 text-xs"
                                                    />
                                                    <button
                                                      type="button"
                                                      onClick={() => {
                                                        handleUpdateBulkPuesto(sec.id, pst.id, { peligroIsManual: false, peligro: '' });
                                                      }}
                                                      className="text-[9px] text-[#468DFF] hover:underline block"
                                                    >
                                                      Seleccionar del catálogo
                                                    </button>
                                                  </div>
                                                ) : (
                                                  <select
                                                    required
                                                    value={pst.peligro}
                                                    onChange={(e) => {
                                                      if (e.target.value === 'MANUAL') {
                                                        handleUpdateBulkPuesto(sec.id, pst.id, { peligroIsManual: true, peligro: '' });
                                                      } else {
                                                        handleUpdateBulkPuesto(sec.id, pst.id, 'peligro', e.target.value);
                                                      }
                                                    }}
                                                    className="w-full border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs bg-white focus:outline-none cursor-pointer"
                                                  >
                                                    <option value="">Selecciona...</option>
                                                    {uniquePeligros.map(p => (
                                                      <option key={p} value={p}>{p}</option>
                                                    ))}
                                                    <option value="MANUAL">+ Ingresar manualmente...</option>
                                                  </select>
                                                )}
                                              </div>

                                              <div className="flex flex-col gap-1">
                                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Riesgo *</label>
                                                {pst.riesgoIsManual ? (
                                                  <div className="space-y-1">
                                                    <input
                                                      type="text"
                                                      required
                                                      placeholder="Riesgo a mano..."
                                                      value={pst.riesgo}
                                                      onChange={(e) => handleUpdateBulkPuesto(sec.id, pst.id, 'riesgo', e.target.value)}
                                                      className="w-full border border-slate-200 rounded-xl px-2.5 py-1 text-xs"
                                                    />
                                                    <button
                                                      type="button"
                                                      onClick={() => {
                                                        handleUpdateBulkPuesto(sec.id, pst.id, { riesgoIsManual: false, riesgo: '' });
                                                      }}
                                                      className="text-[9px] text-[#468DFF] hover:underline block"
                                                    >
                                                      Seleccionar del catálogo
                                                    </button>
                                                  </div>
                                                ) : (
                                                  <select
                                                    required
                                                    disabled={!pst.peligro || pst.peligroIsManual}
                                                    value={pst.riesgo}
                                                    onChange={(e) => {
                                                      if (e.target.value === 'MANUAL') {
                                                        handleUpdateBulkPuesto(sec.id, pst.id, { riesgoIsManual: true, riesgo: '' });
                                                      } else {
                                                        handleUpdateBulkPuesto(sec.id, pst.id, 'riesgo', e.target.value);
                                                      }
                                                    }}
                                                    className="w-full border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs bg-white focus:outline-none cursor-pointer disabled:bg-slate-100 disabled:text-slate-400"
                                                  >
                                                    <option value="">{!pst.peligro ? 'Peligro primero' : 'Selecciona...'}</option>
                                                    {getRiesgosForPeligro(pst.peligro).map(r => (
                                                      <option key={r} value={r}>{r}</option>
                                                    ))}
                                                    <option value="MANUAL">+ Ingresar manualmente...</option>
                                                  </select>
                                                )}
                                              </div>
                                            </div>

                                            {/* Consecuencias y Tipo Peligro */}
                                            <div className="grid md:grid-cols-2 gap-4">
                                              <div className="flex flex-col gap-1">
                                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Consecuencia *</label>
                                                <textarea
                                                  required
                                                  rows={2}
                                                  placeholder="Consecuencias del riesgo (autocompletado o manual)..."
                                                  value={pst.consecuencia}
                                                  onChange={(e) => handleUpdateBulkPuesto(sec.id, pst.id, 'consecuencia', e.target.value)}
                                                  className="w-full border border-slate-200 rounded-xl px-2.5 py-1 text-xs focus:outline-none"
                                                />
                                              </div>
                                              <div className="flex flex-col gap-1">
                                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tipo Peligro (Autocompletado)</label>
                                                <input
                                                  type="text"
                                                  readOnly
                                                  value={pst.tipo_peligro}
                                                  placeholder="Tipo de Peligro"
                                                  className="w-full border border-slate-200 rounded-xl px-2.5 py-2 text-xs bg-slate-100 text-slate-500 font-semibold"
                                                />
                                              </div>
                                            </div>

                                            {/* Evaluación Inicial de Riesgo */}
                                            <div className="grid md:grid-cols-3 gap-4 bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                                              <div className="flex flex-col gap-1">
                                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                                                  Probabilidad Inicial *
                                                  <button type="button" onClick={() => setHelpModal({ show: true, type: 'probabilidad' })} className="text-slate-400 hover:text-[#468DFF]"><HelpCircle className="h-3 w-3" /></button>
                                                </label>
                                                <select
                                                  required
                                                  value={pst.probabilidad}
                                                  onChange={(e) => handleUpdateBulkPuesto(sec.id, pst.id, 'probabilidad', e.target.value)}
                                                  className="w-full border border-slate-200 rounded-xl px-2.5 py-1 text-xs bg-white focus:outline-none cursor-pointer"
                                                >
                                                  <option value="">Selecciona...</option>
                                                  {NIVELES_PROBABILIDAD.map(p => (
                                                    <option key={p} value={p}>{p}</option>
                                                  ))}
                                                </select>
                                              </div>

                                              <div className="flex flex-col gap-1">
                                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                                                  Gravedad Inicial *
                                                  <button type="button" onClick={() => setHelpModal({ show: true, type: 'gravedad' })} className="text-slate-400 hover:text-[#468DFF]"><HelpCircle className="h-3 w-3" /></button>
                                                </label>
                                                <select
                                                  required
                                                  value={pst.gravedad}
                                                  onChange={(e) => handleUpdateBulkPuesto(sec.id, pst.id, 'gravedad', e.target.value)}
                                                  className="w-full border border-slate-200 rounded-xl px-2.5 py-1 text-xs bg-white focus:outline-none cursor-pointer"
                                                >
                                                  <option value="">Selecciona...</option>
                                                  {NIVELES_GRAVEDAD.map(g => (
                                                    <option key={g} value={g}>{g}</option>
                                                  ))}
                                                </select>
                                              </div>

                                              <div className="flex flex-col justify-end pb-1">
                                                <div className="flex items-center gap-1 mb-1">
                                                  <span className="text-[10px] text-slate-400 font-bold block">Nivel de Riesgo Inicial</span>
                                                  <button type="button" onClick={() => setHelpModal({ show: true, type: 'nivelRiesgo' })} className="text-slate-400 hover:text-[#468DFF] cursor-pointer focus:outline-none"><HelpCircle className="h-3 w-3" /></button>
                                                </div>
                                                {pst.probabilidad && pst.gravedad ? (
                                                  (() => {
                                                    const r = getRiskLevel(pst.probabilidad, pst.gravedad);
                                                    return (
                                                      <span className={`px-3 py-1.5 rounded-lg text-xs text-center border font-bold ${r?.bgClass}`}>
                                                        {r?.text}
                                                      </span>
                                                    );
                                                  })()
                                                ) : (
                                                  <span className="text-xs text-slate-400 italic py-1">Incompleto</span>
                                                )}
                                              </div>
                                            </div>

                                            {/* Medidas de Control Existentes */}
                                            <div className="space-y-3">
                                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block border-b pb-0.5 border-slate-100">Medidas de Control Existentes</span>
                                              <div className="grid md:grid-cols-3 gap-4">
                                                <div className="flex flex-col gap-1">
                                                  <label className="text-[10px] font-semibold text-slate-600">Administrativas</label>
                                                  <textarea
                                                    rows={2}
                                                    placeholder="Editar o ingresar medidas administrativas..."
                                                    value={pst.medidas_control_adm}
                                                    onChange={(e) => handleUpdateBulkPuesto(sec.id, pst.id, 'medidas_control_adm', e.target.value)}
                                                    className="w-full border border-slate-200 rounded-xl px-2.5 py-1 text-xs focus:outline-none"
                                                  />
                                                </div>
                                                <div className="flex flex-col gap-1">
                                                  <label className="text-[10px] font-semibold text-slate-600">De Ingeniería</label>
                                                  <textarea
                                                    rows={2}
                                                    placeholder="Editar o ingresar medidas de ingeniería..."
                                                    value={pst.medidas_control_ing}
                                                    onChange={(e) => handleUpdateBulkPuesto(sec.id, pst.id, 'medidas_control_ing', e.target.value)}
                                                    className="w-full border border-slate-200 rounded-xl px-2.5 py-1 text-xs focus:outline-none"
                                                  />
                                                </div>
                                                <div className="flex flex-col gap-1">
                                                  <label className="text-[10px] font-semibold text-slate-600">EPP's</label>
                                                  <textarea
                                                    rows={2}
                                                    placeholder="Editar o ingresar equipo de protección..."
                                                    value={pst.medidas_control_epp}
                                                    onChange={(e) => handleUpdateBulkPuesto(sec.id, pst.id, 'medidas_control_epp', e.target.value)}
                                                    className="w-full border border-slate-200 rounded-xl px-2.5 py-1 text-xs focus:outline-none"
                                                  />
                                                </div>
                                              </div>
                                            </div>

                                            {/* Medidas Recomendadas y Responsable */}
                                            <div className="grid md:grid-cols-2 gap-4">
                                              <div className="flex flex-col gap-1">
                                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Medidas de Control Recomendadas</label>
                                                <textarea
                                                  rows={2}
                                                  placeholder="Acciones de mejora planificadas..."
                                                  value={pst.medidas_control_recomendadas}
                                                  onChange={(e) => handleUpdateBulkPuesto(sec.id, pst.id, 'medidas_control_recomendadas', e.target.value)}
                                                  className="w-full border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs focus:outline-none"
                                                />
                                              </div>

                                              <div className="flex flex-col gap-1">
                                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Responsable</label>
                                                {pst.responsableIsManual ? (
                                                  <div className="space-y-1">
                                                    <input
                                                      type="text"
                                                      placeholder="Nombre del responsable..."
                                                      value={pst.responsable}
                                                      onChange={(e) => handleUpdateBulkPuesto(sec.id, pst.id, 'responsable', e.target.value)}
                                                      className="w-full border border-slate-200 rounded-xl px-2 py-1 text-xs focus:outline-none"
                                                    />
                                                    <button
                                                      type="button"
                                                      onClick={() => {
                                                        handleUpdateBulkPuesto(sec.id, pst.id, { responsableIsManual: false, responsable: '' });
                                                      }}
                                                      className="text-[9px] text-[#468DFF] hover:underline block"
                                                    >
                                                      Seleccionar miembro del equipo
                                                    </button>
                                                  </div>
                                                ) : (
                                                  <select
                                                    value={pst.responsable}
                                                    onChange={(e) => {
                                                      if (e.target.value === 'MANUAL') {
                                                        handleUpdateBulkPuesto(sec.id, pst.id, { responsableIsManual: true, responsable: '' });
                                                      } else {
                                                        handleUpdateBulkPuesto(sec.id, pst.id, 'responsable', e.target.value);
                                                      }
                                                    }}
                                                    className="w-full border border-slate-200 rounded-xl px-2 py-1.5 text-xs bg-white focus:outline-none cursor-pointer"
                                                  >
                                                    <option value="">Selecciona...</option>
                                                    {miembrosList.map(m => (
                                                      <option key={m.id} value={m.full_name}>{m.full_name}</option>
                                                    ))}
                                                    <option value="MANUAL">+ Ingresar manualmente...</option>
                                                  </select>
                                                )}
                                              </div>
                                            </div>

                                            {/* Fechas con Selector Estándar y Evaluación Residual */}
                                            <div className="grid md:grid-cols-4 gap-4 pt-2 border-t border-slate-100">
                                              <div className="flex flex-col gap-1">
                                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Fecha Planificada</label>
                                                <div className="relative">
                                                  <input
                                                    type="text"
                                                    placeholder="DD/MM/YYYY"
                                                    maxLength={10}
                                                    value={pst.fecha_planificada}
                                                    onChange={(e) => handleUpdateBulkPuesto(sec.id, pst.id, 'fecha_planificada', formatAsDateInput(e.target.value))}
                                                    className="w-full border border-slate-200 rounded-xl pl-2.5 pr-8 py-1 text-xs focus:outline-none font-mono"
                                                  />
                                                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer text-slate-400 hover:text-[#468DFF] flex items-center font-sans">
                                                    <Calendar className="h-3.5 w-3.5" />
                                                    <input
                                                      type="date"
                                                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                                      onChange={(e) => {
                                                        const val = e.target.value;
                                                        if (val) {
                                                          const parts = val.split('-');
                                                          if (parts.length === 3) {
                                                            handleUpdateBulkPuesto(sec.id, pst.id, 'fecha_planificada', `${parts[2]}/${parts[1]}/${parts[0]}`);
                                                          }
                                                        }
                                                      }}
                                                    />
                                                  </div>
                                                </div>
                                              </div>

                                              <div className="flex flex-col gap-1">
                                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Fecha Realización</label>
                                                <div className="relative">
                                                  <input
                                                    type="text"
                                                    placeholder="DD/MM/YYYY"
                                                    maxLength={10}
                                                    value={pst.fecha_realizacion}
                                                    onChange={(e) => handleUpdateBulkPuesto(sec.id, pst.id, 'fecha_realizacion', formatAsDateInput(e.target.value))}
                                                    className="w-full border border-slate-200 rounded-xl pl-2.5 pr-8 py-1 text-xs focus:outline-none font-mono"
                                                  />
                                                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer text-slate-400 hover:text-[#468DFF] flex items-center font-sans">
                                                    <Calendar className="h-3.5 w-3.5" />
                                                    <input
                                                      type="date"
                                                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                                      onChange={(e) => {
                                                        const val = e.target.value;
                                                        if (val) {
                                                          const parts = val.split('-');
                                                          if (parts.length === 3) {
                                                            handleUpdateBulkPuesto(sec.id, pst.id, 'fecha_realizacion', `${parts[2]}/${parts[1]}/${parts[0]}`);
                                                          }
                                                        }
                                                      }}
                                                    />
                                                  </div>
                                                </div>
                                              </div>

                                              <div className="flex flex-col gap-1 bg-[#468DFF]/5 p-2 rounded-xl border border-[#468DFF]/15">
                                                <label className="text-[9px] font-bold text-[#468DFF] uppercase tracking-wider">Probabilidad Residual</label>
                                                <select
                                                  value={pst.post_probabilidad}
                                                  onChange={(e) => handleUpdateBulkPuesto(sec.id, pst.id, 'post_probabilidad', e.target.value)}
                                                  className="w-full border border-slate-200 rounded-xl px-1 py-0.5 text-xs bg-white focus:outline-none cursor-pointer"
                                                >
                                                  <option value="">Selecciona...</option>
                                                  {NIVELES_PROBABILIDAD.map(p => (
                                                    <option key={p} value={p}>{p}</option>
                                                  ))}
                                                </select>
                                              </div>

                                              <div className="flex flex-col gap-1 bg-[#468DFF]/5 p-2 rounded-xl border border-[#468DFF]/15">
                                                <label className="text-[9px] font-bold text-[#468DFF] uppercase tracking-wider">Gravedad Residual</label>
                                                <select
                                                  value={pst.post_gravedad}
                                                  onChange={(e) => handleUpdateBulkPuesto(sec.id, pst.id, 'post_gravedad', e.target.value)}
                                                  className="w-full border border-slate-200 rounded-xl px-1 py-0.5 text-xs bg-white focus:outline-none cursor-pointer"
                                                >
                                                  <option value="">Selecciona...</option>
                                                  {NIVELES_GRAVEDAD.map(g => (
                                                    <option key={g} value={g}>{g}</option>
                                                  ))}
                                                </select>
                                              </div>
                                            </div>

                                            {/* Nivel de Riesgo Residual Resultante */}
                                            {pst.post_probabilidad && pst.post_gravedad && (
                                              <div className="flex items-center justify-end gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                                                <div className="flex items-center gap-1">
                                                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Riesgo Residual Resultante:</span>
                                                  <button type="button" onClick={() => setHelpModal({ show: true, type: 'nivelRiesgo' })} className="text-slate-400 hover:text-[#468DFF] cursor-pointer focus:outline-none"><HelpCircle className="h-3 w-3" /></button>
                                                </div>
                                                {(() => {
                                                  const r = getRiskLevel(pst.post_probabilidad, pst.post_gravedad);
                                                  return (
                                                    <span className={`px-3 py-1 rounded-lg text-xs font-bold border ${r?.bgClass}`}>
                                                      {r?.text}
                                                    </span>
                                                  );
                                                })()}
                                              </div>
                                            )}

                                            {/* Observaciones (Bulk) */}
                                            <div className="flex flex-col gap-1.5">
                                              <div className="flex items-center justify-between gap-2 min-h-[24px]">
                                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Observaciones del Puesto</label>
                                                <AITextHelper
                                                  value={pst.observaciones || ''}
                                                  onChange={(val) => handleUpdateBulkPuesto(sec.id, pst.id, 'observaciones', val)}
                                                  context="Observaciones y notas sobre los desvíos y riesgos de este puesto de trabajo"
                                                  disabled={!canEdit}
                                                />
                                              </div>
                                              <textarea
                                                rows={2}
                                                placeholder="Detalles u observaciones de este puesto..."
                                                value={pst.observaciones}
                                                onChange={(e) => handleUpdateBulkPuesto(sec.id, pst.id, 'observaciones', e.target.value)}
                                                className="w-full border border-slate-200 rounded-xl px-2.5 py-1 text-xs focus:outline-none"
                                              />
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      )
                    ) : (
                      // EDICIÓN INDIVIDUAL DE FILA
                      <div className="space-y-6">
                        
                        {/* Identificación de Tarea */}
                        <div className="space-y-4">
                          <h3 className="font-outfit text-sm font-bold text-slate-800 border-b border-slate-100 pb-1.5 uppercase tracking-wider flex items-center gap-2">
                            <Briefcase className="h-4 w-4 text-[#468DFF]" />
                            2. Tarea y Ubicación Laboral
                          </h3>
                          
                          <div className="grid md:grid-cols-2 gap-4">
                            <div className="flex flex-col gap-1.5">
                              <label className="text-xs font-bold text-slate-600">Área / Sector de Trabajo *</label>
                              <div className="space-y-2">
                                <select
                                  required
                                  disabled={!establecimientoId}
                                  value={singleSectorIsManual ? 'MANUAL' : singleSector}
                                  onChange={(e) => {
                                    if (e.target.value === 'MANUAL') {
                                      setSingleSectorIsManual(true);
                                      setSingleSector('');
                                      setSinglePuesto('');
                                    } else {
                                      setSingleSectorIsManual(false);
                                      setSingleSector(e.target.value);
                                      setSinglePuesto('');
                                    }
                                  }}
                                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] cursor-pointer bg-slate-50/50 disabled:bg-slate-100 disabled:text-slate-400 font-medium"
                                >
                                  <option value="">{!establecimientoId ? 'Seleccione establecimiento primero' : 'Selecciona sector'}</option>
                                  {currentEstSectores.map(s => (
                                    <option key={s.id} value={s.denominacion}>{s.denominacion}</option>
                                  ))}
                                  <option value="MANUAL">Otro (especificar...)</option>
                                </select>

                                {singleSectorIsManual && (
                                  <div className="flex flex-col gap-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Especifique el Sector *</label>
                                    <input
                                      type="text"
                                      required
                                      placeholder="Ingresar sector..."
                                      value={singleSector}
                                      onChange={(e) => setSingleSector(e.target.value)}
                                      className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50"
                                    />
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="flex flex-col gap-1.5">
                              <label className="text-xs font-bold text-slate-600">Puesto de Trabajo / Operación *</label>
                              <div className="space-y-2">
                                <select
                                  required
                                  disabled={!singleSector}
                                  value={singlePuestoIsManual ? 'MANUAL' : singlePuesto}
                                  onChange={(e) => {
                                    if (e.target.value === 'MANUAL') {
                                      setSinglePuestoIsManual(true);
                                      setSinglePuesto('');
                                    } else {
                                      setSinglePuestoIsManual(false);
                                      setSinglePuesto(e.target.value);
                                    }
                                  }}
                                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] cursor-pointer bg-slate-50/50 disabled:bg-slate-100 disabled:text-slate-400 font-medium"
                                >
                                  <option value="">{!singleSector ? 'Seleccione sector primero' : 'Selecciona puesto'}</option>
                                  {(!singleSectorIsManual && (currentEstSectores.find(s => s.denominacion === singleSector)?.puestos || [])).map(p => (
                                    <option key={p.id} value={p.denominacion}>{p.denominacion}</option>
                                  ))}
                                  <option value="MANUAL">Otro (especificar...)</option>
                                </select>

                                {singlePuestoIsManual && (
                                  <div className="flex flex-col gap-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Especifique el Puesto *</label>
                                    <input
                                      type="text"
                                      required
                                      placeholder="Ingresar puesto..."
                                      value={singlePuesto}
                                      onChange={(e) => setSinglePuesto(e.target.value)}
                                      className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50"
                                    />
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-slate-600">Tareas Ejecutadas (Descripción) *</label>
                            <textarea
                              required
                              rows={2}
                              placeholder="Ej: Mecanizado, limpieza de moldes, transporte manual..."
                              value={singleTareas}
                              onChange={(e) => setSingleTareas(e.target.value)}
                              className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF]"
                            />
                          </div>
                        </div>

                        {/* Identificación del Peligro */}
                        <div className="space-y-4">
                          <h3 className="font-outfit text-sm font-bold text-slate-800 border-b border-slate-100 pb-1.5 uppercase tracking-wider flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-[#468DFF]" />
                            3. Identificación del Peligro y Riesgo
                          </h3>

                          <div className="grid md:grid-cols-4 gap-4">
                            <div className="flex flex-col gap-1.5">
                              <label className="text-xs font-bold text-slate-600 flex items-center gap-1">
                                Frecuencia *
                                <button type="button" onClick={() => setHelpModal({ show: true, type: 'frecuencia' })} className="text-slate-400 hover:text-[#468DFF]"><HelpCircle className="h-3.5 w-3.5" /></button>
                              </label>
                              <select
                                required
                                value={singleFrecuencia}
                                onChange={(e) => setSingleFrecuencia(e.target.value)}
                                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none cursor-pointer"
                              >
                                <option value="">Selecciona...</option>
                                {FRECUENCIAS.map(f => (
                                  <option key={f.value} value={f.value}>{f.value}</option>
                                ))}
                              </select>
                            </div>

                            <div className="flex flex-col gap-1.5">
                              <label className="text-xs font-bold text-slate-600">Situación *</label>
                              <select
                                required
                                value={singleSituacion}
                                onChange={(e) => setSingleSituacion(e.target.value)}
                                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none cursor-pointer"
                              >
                                {SITUACIONES.map(s => (
                                  <option key={s} value={s}>{s}</option>
                                ))}
                              </select>
                            </div>

                            <div className="flex flex-col gap-1.5">
                              <label className="text-xs font-bold text-slate-600">Peligro *</label>
                              {singlePeligroIsManual ? (
                                <div className="space-y-1">
                                  <input
                                    type="text"
                                    required
                                    placeholder="Escribir peligro..."
                                    value={singlePeligro}
                                    onChange={(e) => setSinglePeligro(e.target.value)}
                                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSinglePeligroIsManual(false);
                                      setSinglePeligro('');
                                      setSingleTipoPeligro('');
                                      setSingleRiesgo('');
                                    }}
                                    className="text-xs text-[#468DFF] hover:underline block"
                                  >
                                    Seleccionar del catálogo
                                  </button>
                                </div>
                              ) : (
                                <select
                                  required
                                  value={singlePeligro}
                                  onChange={(e) => {
                                    if (e.target.value === 'MANUAL') {
                                      setSinglePeligroIsManual(true);
                                      setSinglePeligro('');
                                      setSingleTipoPeligro('');
                                      setSingleRiesgo('');
                                    } else {
                                      setSinglePeligro(e.target.value);
                                      const match = catalog.find(c => c.peligro === e.target.value);
                                      setSingleTipoPeligro(match ? match.tipo_peligro : '');
                                      setSingleRiesgo('');
                                    }
                                  }}
                                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none cursor-pointer bg-slate-50/50 font-medium"
                                >
                                  <option value="">Selecciona...</option>
                                  {uniquePeligros.map(p => (
                                    <option key={p} value={p}>{p}</option>
                                  ))}
                                  <option value="MANUAL">+ Ingresar manualmente...</option>
                                </select>
                              )}
                            </div>

                            <div className="flex flex-col gap-1.5">
                              <label className="text-xs font-bold text-slate-600">Riesgo *</label>
                              {singleRiesgoIsManual ? (
                                <div className="space-y-1">
                                  <input
                                    type="text"
                                    required
                                    placeholder="Escribir riesgo..."
                                    value={singleRiesgo}
                                    onChange={(e) => setSingleRiesgo(e.target.value)}
                                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSingleRiesgoIsManual(false);
                                      setSingleRiesgo('');
                                    }}
                                    className="text-xs text-[#468DFF] hover:underline block"
                                  >
                                    Seleccionar del catálogo
                                  </button>
                                </div>
                              ) : (
                                <select
                                  required
                                  disabled={!singlePeligro || singlePeligroIsManual}
                                  value={singleRiesgo}
                                  onChange={(e) => {
                                    if (e.target.value === 'MANUAL') {
                                      setSingleRiesgoIsManual(true);
                                      setSingleRiesgo('');
                                    } else {
                                      setSingleRiesgo(e.target.value);
                                      const match = getCatalogRow(singlePeligro, e.target.value);
                                      if (match) {
                                        setSingleConsecuencia(match.consecuencias || '');
                                        setSingleMedidasAdm(match.medidas_control_administrativas || '');
                                        setSingleMedidasIng(match.medidas_control_ingenieria || '');
                                        setSingleMedidasEpp(match.epps || '');
                                      }
                                    }
                                  }}
                                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none cursor-pointer bg-slate-50/50 disabled:bg-slate-100 disabled:text-slate-400"
                                >
                                  <option value="">{!singlePeligro ? 'Peligro primero' : 'Selecciona...'}</option>
                                  {getRiesgosForPeligro(singlePeligro).map(r => (
                                    <option key={r} value={r}>{r}</option>
                                  ))}
                                  <option value="MANUAL">+ Ingresar manualmente...</option>
                                </select>
                              )}
                            </div>
                          </div>

                          <div className="grid md:grid-cols-2 gap-4">
                            <div className="flex flex-col gap-1.5">
                              <label className="text-xs font-bold text-slate-600">Consecuencia *</label>
                              <textarea
                                required
                                rows={2}
                                placeholder="Consecuencia asociada (editable)..."
                                value={singleConsecuencia}
                                onChange={(e) => setSingleConsecuencia(e.target.value)}
                                className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF]"
                              />
                            </div>
                            <div className="flex flex-col gap-1.5">
                              <label className="text-xs font-bold text-slate-600">Tipo de Peligro</label>
                              <input
                                type="text"
                                readOnly
                                value={singleTipoPeligro}
                                placeholder="Tipo de Peligro"
                                className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm bg-slate-100 text-slate-500 font-semibold"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Valoración Inicial del Riesgo */}
                        <div className="space-y-4">
                          <h3 className="font-outfit text-sm font-bold text-slate-800 border-b border-slate-100 pb-1.5 uppercase tracking-wider flex items-center gap-2">
                            <Sliders className="h-4 w-4 text-[#468DFF]" />
                            4. Valoración Inicial del Riesgo
                          </h3>

                          <div className="grid md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                            <div className="flex flex-col gap-1.5">
                              <label className="text-xs font-bold text-slate-600 flex items-center gap-1">
                                Probabilidad Inicial *
                                <button type="button" onClick={() => setHelpModal({ show: true, type: 'probabilidad' })} className="text-slate-400 hover:text-[#468DFF]"><HelpCircle className="h-3.5 w-3.5" /></button>
                              </label>
                              <select
                                required
                                value={singleProbabilidad}
                                onChange={(e) => setSingleProbabilidad(e.target.value)}
                                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none cursor-pointer bg-white"
                              >
                                <option value="">Selecciona...</option>
                                {NIVELES_PROBABILIDAD.map(p => (
                                  <option key={p} value={p}>{p}</option>
                                ))}
                              </select>
                            </div>

                            <div className="flex flex-col gap-1.5">
                              <label className="text-xs font-bold text-slate-600 flex items-center gap-1">
                                Gravedad Inicial *
                                <button type="button" onClick={() => setHelpModal({ show: true, type: 'gravedad' })} className="text-slate-400 hover:text-[#468DFF]"><HelpCircle className="h-3.5 w-3.5" /></button>
                              </label>
                              <select
                                required
                                value={singleGravedad}
                                onChange={(e) => setSingleGravedad(e.target.value)}
                                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none cursor-pointer bg-white"
                              >
                                <option value="">Selecciona...</option>
                                {NIVELES_GRAVEDAD.map(g => (
                                  <option key={g} value={g}>{g}</option>
                                ))}
                              </select>
                            </div>

                            <div className="flex flex-col justify-end">
                              <div className="flex items-center gap-1.5 mb-1">
                                <label className="text-xs font-bold text-slate-600">Nivel de Riesgo Inicial</label>
                                <button type="button" onClick={() => setHelpModal({ show: true, type: 'nivelRiesgo' })} className="text-slate-400 hover:text-[#468DFF] cursor-pointer focus:outline-none"><HelpCircle className="h-3.5 w-3.5" /></button>
                              </div>
                              {singleProbabilidad && singleGravedad ? (
                                (() => {
                                  const r = getRiskLevel(singleProbabilidad, singleGravedad);
                                  return (
                                    <span className={`px-4 py-2 rounded-xl text-sm font-bold text-center border ${r?.bgClass}`}>
                                      {r?.text}
                                    </span>
                                  );
                                })()
                              ) : (
                                <span className="text-sm text-slate-400 italic py-2">Falta completar Probabilidad y Gravedad</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Medidas de Control Existentes */}
                        <div className="space-y-4">
                          <h3 className="font-outfit text-sm font-bold text-slate-800 border-b border-slate-100 pb-1.5 uppercase tracking-wider flex items-center gap-2">
                            <ShieldCheck className="h-4 w-4 text-[#468DFF]" />
                            5. Medidas de Control Existentes
                          </h3>

                          <div className="grid md:grid-cols-3 gap-4">
                            <div className="flex flex-col gap-1.5">
                              <label className="text-xs font-bold text-slate-600">Administrativas</label>
                              <textarea
                                rows={3}
                                placeholder="Procedimientos, capacitaciones (editable)..."
                                value={singleMedidasAdm}
                                onChange={(e) => setSingleMedidasAdm(e.target.value)}
                                className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none"
                              />
                            </div>

                            <div className="flex flex-col gap-1.5">
                              <label className="text-xs font-bold text-slate-600">De Ingeniería</label>
                              <textarea
                                rows={3}
                                placeholder="Resguardos, extractores (editable)..."
                                value={singleMedidasIng}
                                onChange={(e) => setSingleMedidasIng(e.target.value)}
                                className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none"
                              />
                            </div>

                            <div className="flex flex-col gap-1.5">
                              <label className="text-xs font-bold text-slate-600">EPP's</label>
                              <textarea
                                rows={3}
                                placeholder="Calzado, protección ocular (editable)..."
                                value={singleMedidasEpp}
                                onChange={(e) => setSingleMedidasEpp(e.target.value)}
                                className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Planificación y Acciones de Mejora */}
                        <div className="space-y-4">
                          <h3 className="font-outfit text-sm font-bold text-slate-800 border-b border-slate-100 pb-1.5 uppercase tracking-wider flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-[#468DFF]" />
                            6. Medidas Recomendadas y Planificación
                          </h3>

                          <div className="grid md:grid-cols-2 gap-4">
                            <div className="flex flex-col gap-1.5">
                              <label className="text-xs font-bold text-slate-600">Medidas de Control Recomendadas</label>
                              <textarea
                                rows={3}
                                placeholder="Acciones de mejora planificadas..."
                                value={singleMedidasRecomendadas}
                                onChange={(e) => setSingleMedidasRecomendadas(e.target.value)}
                                className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none"
                              />
                            </div>

                            <div className="flex flex-col gap-1.5">
                              <label className="text-xs font-bold text-slate-600">Responsable de Acción</label>
                              {singleResponsableIsManual ? (
                                <div className="space-y-1">
                                  <input
                                    type="text"
                                    placeholder="Ingresar responsable..."
                                    value={singleResponsable}
                                    onChange={(e) => setSingleResponsable(e.target.value)}
                                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSingleResponsableIsManual(false);
                                      setSingleResponsable('');
                                    }}
                                    className="text-xs text-[#468DFF] hover:underline block"
                                  >
                                    Seleccionar miembro del equipo
                                  </button>
                                </div>
                              ) : (
                                <select
                                  value={singleResponsable}
                                  onChange={(e) => {
                                    if (e.target.value === 'MANUAL') {
                                      setSingleResponsableIsManual(true);
                                      setSingleResponsable('');
                                    } else {
                                      setSingleResponsable(e.target.value);
                                    }
                                  }}
                                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none cursor-pointer bg-white"
                                >
                                  <option value="">Selecciona...</option>
                                  {miembrosList.map(m => (
                                    <option key={m.id} value={m.full_name}>{m.full_name}</option>
                                  ))}
                                  <option value="MANUAL">+ Ingresar manualmente...</option>
                                </select>
                              )}
                            </div>
                          </div>

                          <div className="grid md:grid-cols-4 gap-4 pt-2 border-t border-slate-100">
                            <div className="flex flex-col gap-1.5">
                              <label className="text-xs font-bold text-slate-600">Fecha Planificada</label>
                              <div className="relative">
                                <input
                                  type="text"
                                  placeholder="DD/MM/YYYY"
                                  maxLength={10}
                                  value={singleFechaPlanificada}
                                  onChange={(e) => setSingleFechaPlanificada(formatAsDateInput(e.target.value))}
                                  className="w-full border border-slate-200 rounded-xl pl-3.5 pr-10 py-2 text-sm focus:outline-none font-mono"
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
      setSingleFechaPlanificada(`${parts[2]}/${parts[1]}/${parts[0]}`);
    }
  } else {
    setSingleFechaPlanificada('');
  }
                                    }}
                                  />
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-col gap-1.5">
                              <label className="text-xs font-bold text-slate-600">Fecha Realización</label>
                              <div className="relative">
                                <input
                                  type="text"
                                  placeholder="DD/MM/YYYY"
                                  maxLength={10}
                                  value={singleFechaRealizacion}
                                  onChange={(e) => setSingleFechaRealizacion(formatAsDateInput(e.target.value))}
                                  className="w-full border border-slate-200 rounded-xl pl-3.5 pr-10 py-2 text-sm focus:outline-none font-mono"
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
      setSingleFechaRealizacion(`${parts[2]}/${parts[1]}/${parts[0]}`);
    }
  } else {
    setSingleFechaRealizacion('');
  }
                                    }}
                                  />
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-col gap-1.5 bg-[#468DFF]/5 p-3 rounded-xl border border-[#468DFF]/15">
                              <label className="text-xs font-bold text-[#468DFF] flex items-center gap-1">
                                Probabilidad Residual
                                <button type="button" onClick={() => setHelpModal({ show: true, type: 'probabilidad' })} className="text-slate-400 hover:text-[#468DFF]"><HelpCircle className="h-3 w-3" /></button>
                              </label>
                              <select
                                value={singlePostProbabilidad}
                                onChange={(e) => setSinglePostProbabilidad(e.target.value)}
                                className="w-full border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs bg-white focus:outline-none cursor-pointer"
                              >
                                <option value="">Selecciona...</option>
                                {NIVELES_PROBABILIDAD.map(p => (
                                  <option key={p} value={p}>{p}</option>
                                ))}
                              </select>
                            </div>

                            <div className="flex flex-col gap-1.5 bg-[#468DFF]/5 p-3 rounded-xl border border-[#468DFF]/15">
                              <label className="text-xs font-bold text-[#468DFF] flex items-center gap-1">
                                Gravedad Residual
                                <button type="button" onClick={() => setHelpModal({ show: true, type: 'gravedad' })} className="text-slate-400 hover:text-[#468DFF]"><HelpCircle className="h-3 w-3" /></button>
                              </label>
                              <select
                                value={singlePostGravedad}
                                onChange={(e) => setSinglePostGravedad(e.target.value)}
                                className="w-full border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs bg-white focus:outline-none cursor-pointer"
                              >
                                <option value="">Selecciona...</option>
                                {NIVELES_GRAVEDAD.map(g => (
                                  <option key={g} value={g}>{g}</option>
                                ))}
                              </select>
                            </div>
                          </div>

                          {singlePostProbabilidad && singlePostGravedad && (
                            <div className="flex items-center justify-end gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Nivel de Riesgo Residual:</span>
                                <button type="button" onClick={() => setHelpModal({ show: true, type: 'nivelRiesgo' })} className="text-slate-400 hover:text-[#468DFF] cursor-pointer focus:outline-none"><HelpCircle className="h-3.5 w-3.5" /></button>
                              </div>
                              {(() => {
                                const r = getRiskLevel(singlePostProbabilidad, singlePostGravedad);
                                return (
                                  <span className={`px-4 py-2 rounded-xl text-sm font-bold border ${r?.bgClass}`}>
                                    {r?.text}
                                  </span>
                                );
                              })()}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Observaciones (Posición final y tamaño completo en el formulario) */}
                    <div className="flex flex-col gap-1.5 col-span-full border-t border-slate-100 pt-4">
                      <div className="flex items-center justify-between gap-2 min-h-[28px]">
                        <label className="text-xs font-bold text-slate-700">Observaciones</label>
                        <AITextHelper
                          value={singleObservaciones}
                          onChange={setSingleObservaciones}
                          context="Observaciones y detalles técnicos de la evaluación del peligro, riesgo y sus correspondientes medidas preventivas"
                          disabled={!canEdit}
                        />
                      </div>
                      <textarea
                        rows={4}
                        placeholder="Detalles u observaciones de la evaluación..."
                        value={singleObservaciones}
                        onChange={(e) => setSingleObservaciones(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all resize-none"
                      />
                    </div>

                  </fieldset>

                  {/* Botones del Formulario */}
                  <div className="flex justify-between items-center pt-6 border-t border-slate-100 mt-6">
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
                              disabled={saveLoading || (isBulkMode && loadType === 'excel' && (previewRows.length === 0 || previewRows.some(r => r.errors.length > 0)))}
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
              <div className="space-y-6 flex-1 flex flex-col min-h-0">
                
                {/* Contenedor 1: Panel de Filtros y Búsqueda */}
                <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-sm space-y-3 shrink-0">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
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
                            placeholder="Buscar por sector, puesto, peligro, riesgo..."
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

                        {(filterEmpresa || filterEstablecimiento || filterNivelRiesgo || filterText) && (
                          <button 
                            onClick={() => {
                              setFilterEmpresa('');
                              setFilterEstablecimiento('');
                              setFilterNivelRiesgo('');
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
                          onClick={handleOpenCreateForm}
                          className="px-3 py-1.5 bg-[#468DFF] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-[#0511F2] transition-all cursor-pointer shadow-lg shadow-[#468DFF]/10 shrink-0"
                        >
                          <PlusCircle className="h-3.5 w-3.5" />
                          Nueva Matriz de Riesgos
                        </button>
                      )}
                    </div>

                    {showFilters && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1 animate-fade-in">
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

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Filtrar por Establecimiento</label>
                          <select
                            disabled={!filterEmpresa}
                            value={filterEstablecimiento}
                            onChange={(e) => setFilterEstablecimiento(e.target.value)}
                            className="border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-600 focus:outline-none focus:border-[#468DFF] text-xs w-full cursor-pointer disabled:bg-slate-100 disabled:text-slate-400"
                          >
                            <option value="">{!filterEmpresa ? 'Selecciona cliente primero' : 'Todos los establecimientos'}</option>
                            {allEstablecimientos.filter(est => est.empresa_id === filterEmpresa).map(est => (
                              <option key={est.id} value={est.id}>{est.denominacion}</option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Nivel de Riesgo Inicial</label>
                          <select
                            value={filterNivelRiesgo}
                            onChange={(e) => setFilterNivelRiesgo(e.target.value)}
                            className="border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-600 focus:outline-none focus:border-[#468DFF] text-xs w-full cursor-pointer"
                          >
                            <option value="">Todos los niveles</option>
                            <option value="Riesgo trivial">Riesgo trivial</option>
                            <option value="Riesgo tolerable">Riesgo tolerable</option>
                            <option value="Riesgo moderado">Riesgo moderado</option>
                            <option value="Riesgo sustancial">Riesgo sustancial</option>
                            <option value="Riesgo intolerable">Riesgo intolerable</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Contenedor 2: Tabla del Listado */}
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col transition-all duration-300 ease-in-out" style={{ height: showFilters ? 'calc(100vh - 310px)' : 'calc(100vh - 240px)' }}>
                  {sortedMatriz.length === 0 ? (
                    <div className="flex-grow flex flex-col items-center justify-center p-8 text-center gap-3 h-full">
                      <AlertCircle className="h-10 w-10 text-slate-300" />
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-slate-800">No hay evaluaciones de riesgo registradas</p>
                        <p className="text-xs text-slate-400">Registra una nueva matriz de riesgo para comenzar.</p>
                      </div>
                      {canCargar && (
                        <button
                          onClick={handleOpenCreateForm}
                          className="px-4 py-2 mt-2 bg-[#468DFF] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-[#0511F2] transition-all cursor-pointer shadow-md shadow-[#468DFF]/10 shrink-0"
                        >
                          <PlusCircle className="h-3.5 w-3.5" />
                          Registrar matriz
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="overflow-auto flex-grow">
                      <table className="w-full text-left text-xs border-collapse min-w-[1200px]">
                        <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-400 uppercase tracking-wider sticky top-0 z-10">
                          <tr>
                            <th className="px-6 py-4 cursor-pointer hover:text-slate-700 select-none transition-colors w-[18%]" onClick={() => handleSort('cliente')}>
                              <div className="flex items-center gap-1">
                                Cliente / Establecimiento
                                {sortField === 'cliente' && (sortOrder === 'asc' ? ' ▲' : ' ▼')}
                              </div>
                            </th>
                            <th className="px-6 py-4 cursor-pointer hover:text-slate-700 select-none transition-colors w-[18%]" onClick={() => handleSort('sector')}>
                              <div className="flex items-center gap-1">
                                Área / Sector / Puesto / Operación
                                {sortField === 'sector' && (sortOrder === 'asc' ? ' ▲' : ' ▼')}
                              </div>
                            </th>
                            <th className="px-6 py-4 cursor-pointer hover:text-slate-700 select-none transition-colors w-[20%]" onClick={() => handleSort('tareas')}>
                              <div className="flex items-center gap-1">
                                Tareas
                                {sortField === 'tareas' && (sortOrder === 'asc' ? ' ▲' : ' ▼')}
                              </div>
                            </th>
                            <th className="px-6 py-4 cursor-pointer hover:text-slate-700 select-none transition-colors w-[10%]" onClick={() => handleSort('peligro')}>
                              <div className="flex items-center gap-1">
                                Peligro
                                {sortField === 'peligro' && (sortOrder === 'asc' ? ' ▲' : ' ▼')}
                              </div>
                            </th>
                            <th className="px-6 py-4 cursor-pointer hover:text-slate-700 select-none transition-colors w-[18%]" onClick={() => handleSort('riesgo')}>
                              <div className="flex items-center gap-1">
                                Riesgo
                                {sortField === 'riesgo' && (sortOrder === 'asc' ? ' ▲' : ' ▼')}
                              </div>
                            </th>
                            <th className="px-6 py-4 cursor-pointer hover:text-slate-700 select-none transition-colors w-[8%] text-center" onClick={() => handleSort('nivel_riesgo')}>
                              <div className="flex items-center justify-center gap-1">
                                Riesgo Inicial
                                {sortField === 'nivel_riesgo' && (sortOrder === 'asc' ? ' ▲' : ' ▼')}
                              </div>
                            </th>
                            <th className="px-6 py-4 cursor-pointer hover:text-slate-700 select-none transition-colors w-[8%] text-center" onClick={() => handleSort('post_nivel_riesgo')}>
                              <div className="flex items-center justify-center gap-1">
                                Riesgo Residual
                                {sortField === 'post_nivel_riesgo' && (sortOrder === 'asc' ? ' ▲' : ' ▼')}
                              </div>
                            </th>
                            <th className="px-6 py-4 text-center w-[5%]">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs font-normal text-slate-700">
                          {sortedMatriz.map((row) => {
                            const emp = empresas.find(e => e.id === row.empresa_id);
                            const est = allEstablecimientos.find(e => e.id === row.establecimiento_id);
                            
                            const initialRisk = getRiskLevel(row.probabilidad, row.gravedad);
                            const residualRisk = row.post_probabilidad && row.post_gravedad 
                              ? getRiskLevel(row.post_probabilidad, row.post_gravedad) 
                              : null;

                            return (
                              <tr 
                                key={row.id} 
                                onClick={() => { setIsReadOnlyView(true); handleEditClick(row); }}
                                className="hover:bg-slate-50/50 cursor-pointer transition-colors"
                              >
                                {/* 1. Cliente / Establecimiento */}
                                <td className="px-6 py-4">
                                  <span className="font-semibold text-slate-900 block">{emp?.razon_social || 'Desconocido'}</span>
                                  <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5 font-normal">
                                    <Building className="h-3 w-3 shrink-0" />
                                    {est?.denominacion || 'General / Todos'}
                                  </span>
                                </td>

                                {/* 2. Área / Sector / Puesto / Operación */}
                                <td className="px-6 py-4">
                                  <span className="text-slate-900 font-semibold block">{row.sector || 'N/A'}</span>
                                  <span className="text-[10px] text-slate-500 font-medium block mt-0.5">{row.puesto || 'N/A'}</span>
                                </td>

                                {/* 3. Tareas */}
                                <td className="px-6 py-4 text-slate-600 font-normal">
                                  <span className="block truncate max-w-[200px]" title={row.tareas}>
                                    {row.tareas || 'N/A'}
                                  </span>
                                </td>

                                {/* 4. Peligro */}
                                <td className="px-6 py-4 text-slate-600 font-normal">
                                  <span className="block truncate max-w-[120px]" title={row.peligro}>
                                    {row.peligro || 'N/A'}
                                  </span>
                                </td>

                                {/* 5. Riesgo */}
                                <td className="px-6 py-4 text-slate-600 font-normal">
                                  <span className="block truncate max-w-[200px]" title={row.riesgo}>
                                    {row.riesgo || 'N/A'}
                                  </span>
                                </td>

                                {/* 6. Riesgo Inicial */}
                                <td className="px-6 py-4 text-center">
                                  <span className={`inline-flex items-center justify-center text-center leading-[1.15] px-2.5 py-1 rounded-full text-[10px] font-bold border ${initialRisk?.bgClass}`}>
                                    {row.nivel_riesgo}
                                  </span>
                                </td>

                                {/* 7. Riesgo Residual */}
                                <td className="px-6 py-4 text-center">
                                  {residualRisk ? (
                                    <span className={`inline-flex items-center justify-center text-center leading-[1.15] px-2.5 py-1 rounded-full text-[10px] font-bold border ${residualRisk?.bgClass}`}>
                                      {row.post_nivel_riesgo}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 italic text-[11px]">-</span>
                                  )}
                                </td>

                                {/* 8. Acciones */}
                                <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                                  <div className="flex items-center justify-center gap-1.5">
                                    {isReadOnlyView ? (
                                      <button
                                        type="button"
                                        onClick={() => { handleEditClick(row); }}
                                        className="p-1.5 rounded-lg bg-blue-50 text-[#468DFF] hover:bg-blue-100 hover:text-[#0511F2] transition-all cursor-pointer inline-flex items-center"
                                        title="Ver detalles"
                                      >
                                        <Eye className="h-4.5 w-4.5" />
                                      </button>
                                    ) : (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => { setIsReadOnlyView(false); handleEditClick(row); }}
                                          className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-600 transition-colors cursor-pointer inline-flex items-center"
                                          title="Editar evaluación"
                                        >
                                          <Edit className="h-4.5 w-4.5" />
                                        </button>
                                        {canEliminar && (
                                          <button
                                            type="button"
                                            onClick={() => handleDeleteClick(row.id)}
                                            className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition-colors cursor-pointer inline-flex items-center"
                                            title="Eliminar registro"
                                          >
                                            <Trash2 className="h-4.5 w-4.5" />
                                          </button>
                                        )}
                                      </>
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

      {/* MODAL HELPER */}
      {helpModal.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setHelpModal({ show: false, type: '' })} />
          <div className="relative bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl border border-slate-200 animate-scaleUp max-h-[85vh] overflow-y-auto">
            <button 
              onClick={() => setHelpModal({ show: false, type: '' })} 
              className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            {helpModal.type === 'frecuencia' && (
              <div className="space-y-4 text-slate-700">
                <h3 className="font-outfit text-base font-bold text-slate-950 flex items-center gap-2 border-b pb-2">
                  <HelpCircle className="h-5 w-5 text-[#468DFF]" />
                  Frecuencia de Exposición
                </h3>
                <p className="text-xs leading-relaxed">
                  Define qué tan seguido el trabajador está expuesto al peligro identificado en su jornada de trabajo:
                </p>
                <ul className="space-y-3 text-xs">
                  <li className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                    <strong className="text-[#468DFF] block mb-0.5">Continua:</strong> Exposición permanente o varias veces durante la jornada.
                  </li>
                  <li className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                    <strong className="text-[#468DFF] block mb-0.5">Frecuente:</strong> Exposición al menos una vez al día o diariamente.
                  </li>
                  <li className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                    <strong className="text-[#468DFF] block mb-0.5">Ocasional:</strong> Exposición intermitente (semanal o varias veces al mes).
                  </li>
                  <li className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                    <strong className="text-[#468DFF] block mb-0.5">Esporádica / Poco usual:</strong> Exposición mensual o anual; tarea muy ocasional.
                  </li>
                  <li className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                    <strong className="text-[#468DFF] block mb-0.5">Rara:</strong> Exposición eventual o excepcional (ej: mantenimiento anual).
                  </li>
                </ul>
              </div>
            )}

            {helpModal.type === 'probabilidad' && (
              <div className="space-y-4 text-slate-700">
                <h3 className="font-outfit text-base font-bold text-slate-950 flex items-center gap-2 border-b pb-2">
                  <HelpCircle className="h-5 w-5 text-[#468DFF]" />
                  Niveles de Probabilidad (BS 8800)
                </h3>
                <p className="text-xs leading-relaxed">
                  Establece la posibilidad de que ocurra el accidente o el daño si fallan las medidas preventivas:
                </p>
                <div className="space-y-3 text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <strong className="text-[#00B050] block mb-1">1. Baja (Rara vez ocurre)</strong>
                    <p className="mb-2 text-[11px] text-slate-500">Mínima posibilidad de daño. Ocurre sólo bajo condiciones anormales o circunstancias excepcionales.</p>
                    <div className="border-t border-slate-200 pt-1.5">
                      <span className="font-semibold block text-[10px] text-slate-600 uppercase">Ejemplos:</span>
                      <ul className="list-disc pl-4 text-[11px] text-slate-500 space-y-0.5">
                        <li>Resbalón en una oficina bien mantenida y limpia.</li>
                        <li>Explosión de una batería en un dispositivo electrónico con carga segura.</li>
                        <li>Caída de herramienta en área con redes y amarras de seguridad.</li>
                      </ul>
                    </div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <strong className="text-[#FF9900] block mb-1">2. Media (Podría ocurrir en algunas circunstancias)</strong>
                    <p className="mb-2 text-[11px] text-slate-500">Evento no cotidiano, pero con posibilidad real si fallan parcialmente las medidas preventivas.</p>
                    <div className="border-t border-slate-200 pt-1.5">
                      <span className="font-semibold block text-[10px] text-slate-600 uppercase">Ejemplos:</span>
                      <ul className="list-disc pl-4 text-[11px] text-slate-500 space-y-0.5">
                        <li>Contacto con solventes sin guantes adecuados por descuido.</li>
                        <li>Colisiones ocasionales de montacargas en tránsito con señalización.</li>
                        <li>Caída de un operario desde una escalera de mano de baja altura.</li>
                      </ul>
                    </div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <strong className="text-[#FF0000] block mb-1">3. Alta (Frecuente o muy probable)</strong>
                    <p className="mb-2 text-[11px] text-slate-500">El evento es recurrente o las condiciones actuales favorecen sustancialmente su aparición.</p>
                    <div className="border-t border-slate-200 pt-1.5">
                      <span className="font-semibold block text-[10px] text-slate-600 uppercase">Ejemplos:</span>
                      <ul className="list-disc pl-4 text-[11px] text-slate-500 space-y-0.5">
                        <li>Lesiones musculoesqueléticas por mala ergonomía de oficina persistente.</li>
                        <li>Caída de objetos en obra civil en construcción sin redes ni barandas.</li>
                        <li>Inhalación de polvos tóxicos en fábrica sin ventilación ni mascarillas.</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {helpModal.type === 'gravedad' && (
              <div className="space-y-4 text-slate-700">
                <h3 className="font-outfit text-base font-bold text-slate-950 flex items-center gap-2 border-b pb-2">
                  <HelpCircle className="h-5 w-5 text-[#468DFF]" />
                  Niveles de Gravedad (Severidad)
                </h3>
                <p className="text-xs leading-relaxed">
                  Evalúa las consecuencias físicas y de salud si el accidente ocurriera:
                </p>
                <div className="space-y-3 text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <strong className="text-[#00B050] block mb-1">1. Leve (Sin incapacidad o incapacidad menor)</strong>
                    <p className="mb-2 text-[11px] text-slate-500">Lesiones superficiales que no requieren hospitalización ni interrumpen severamente las tareas habituales.</p>
                    <div className="border-t border-slate-200 pt-1.5">
                      <span className="font-semibold block text-[10px] text-slate-600 uppercase">Ejemplos:</span>
                      <ul className="list-disc pl-4 text-[11px] text-slate-500 space-y-0.5">
                        <li>Corte superficial en la mano que se resuelve con botiquín básico.</li>
                        <li>Golpe menor contra mobiliario con moretón temporal sin fisuras.</li>
                        <li>Irritación ocular leve resuelta con lavaojos rápido.</li>
                      </ul>
                    </div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <strong className="text-[#FF9900] block mb-1">2. Moderada (Incapacidad temporal tratable)</strong>
                    <p className="mb-2 text-[11px] text-slate-500">Lesiones que requieren atención médica profesional y conllevan días de baja, pero con recuperación total.</p>
                    <div className="border-t border-slate-200 pt-1.5">
                      <span className="font-semibold block text-[10px] text-slate-600 uppercase">Ejemplos:</span>
                      <ul className="list-disc pl-4 text-[11px] text-slate-500 space-y-0.5">
                        <li>Esguince por mala postura de levantamiento de peso con fisioterapia.</li>
                        <li>Quemadura de segundo grado por contacto con superficie metálica caliente.</li>
                        <li>Fractura ósea de extremidad superior tratable tras caída menor a 1 metro.</li>
                      </ul>
                    </div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <strong className="text-[#FF0000] block mb-1">3. Grave (Incapacidad permanente o fatalidad)</strong>
                    <p className="mb-2 text-[11px] text-slate-500">Consecuencias severas permanentes, amputaciones o de riesgo de muerte para el personal.</p>
                    <div className="border-t border-slate-200 pt-1.5">
                      <span className="font-semibold block text-[10px] text-slate-600 uppercase">Ejemplos:</span>
                      <ul className="list-disc pl-4 text-[11px] text-slate-500 space-y-0.5">
                        <li>Amputación de falanges por atrapamiento en engranajes sin resguardo.</li>
                        <li>Electrocución por cables de media o alta tensión.</li>
                        <li>Caída de altura superior a 2 metros sin arnés ni líneas de vida.</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {helpModal.type === 'nivelRiesgo' && (
              <div className="space-y-4 text-slate-700">
                <h3 className="font-outfit text-base font-bold text-slate-950 flex items-center gap-2 border-b pb-2">
                  <HelpCircle className="h-5 w-5 text-[#468DFF]" />
                  Nivel de Riesgo y Acciones <span className="font-normal text-slate-500 text-sm">(Método BS 8800)</span>
                </h3>
                <p className="text-xs leading-relaxed">
                  Basado en la combinación de la probabilidad y la gravedad del daño, determina las acciones requeridas y su cronograma:
                </p>
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
            )}

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setHelpModal({ show: false, type: '' })}
                className="px-4 py-2 bg-[#468DFF] text-white rounded-xl text-xs font-bold hover:bg-[#0511F2] cursor-pointer"
              >
                Cerrar Guía
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION / ALERT MODAL */}
      {modalAlert.show && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xl max-w-sm w-full animate-scale-up space-y-4 text-center">
            <div className="mx-auto p-3 rounded-full w-12 h-12 flex items-center justify-center bg-amber-50 text-amber-500">
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

      {/* Diálogo de Confirmación de Guardado en Perfil del Cliente */}
      <Dialog.Root open={showProfileConfirmOpen} onOpenChange={setShowProfileConfirmOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm animate-fade-in" />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <Dialog.Content className="relative w-full max-w-md p-6 bg-white border border-slate-200 rounded-2xl shadow-2xl animate-scale-up focus:outline-none space-y-4 text-center">
              
              <Dialog.Close asChild>
                <button 
                  className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#468DFF]"
                  aria-label="Cerrar"
                  onClick={() => {
                    setPendingSaveData([]);
                    setPendingEstUpdates([]);
                  }}
                >
                  <X className="h-4 w-4" />
                </button>
              </Dialog.Close>

              <div className="mx-auto p-3 rounded-full w-12 h-12 flex items-center justify-center border bg-blue-50 text-[#468DFF] border-blue-100">
                <HelpCircle className="h-6 w-6 shrink-0" />
              </div>

              <div className="space-y-2">
                <Dialog.Title className="font-outfit text-base font-extrabold text-slate-800">
                  Nuevos Sectores o Puestos Detectados
                </Dialog.Title>
                <Dialog.Description className="text-xs text-slate-500 leading-relaxed">
                  Se detectaron áreas/sectores, puestos de trabajo o descripciones de tareas que no están registrados en el perfil del cliente. ¿Deseas agregarlos automáticamente a su perfil antes de guardar la matriz?
                </Dialog.Description>
              </div>

              <div className="flex flex-col gap-2 pt-2 sm:flex-row">
                <Dialog.Close asChild>
                  <button
                    type="button"
                    onClick={() => {
                      setPendingSaveData([]);
                      setPendingEstUpdates([]);
                    }}
                    className="flex-1 py-2.5 px-3 border border-slate-350 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-bold transition-all active:scale-[0.98] cursor-pointer focus:outline-none focus:ring-2 focus:ring-slate-400"
                  >
                    Volver
                  </button>
                </Dialog.Close>

                <button
                  type="button"
                  onClick={() => {
                    setShowProfileConfirmOpen(false);
                    handleCancelSaveProfile();
                  }}
                  className="flex-1 py-2.5 px-3 border border-[#468DFF] text-[#468DFF] hover:bg-[#468DFF]/5 rounded-xl text-xs font-bold transition-all active:scale-[0.98] cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#468DFF]"
                >
                  Sólo matriz
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowProfileConfirmOpen(false);
                    handleConfirmSaveProfile();
                  }}
                  className="flex-1 py-2.5 px-3 bg-[#468DFF] hover:bg-[#0511F2] text-white shadow-lg shadow-blue-500/10 rounded-xl text-xs font-bold transition-all active:scale-[0.98] cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#468DFF]"
                >
                  Guardar en perfil
                </button>
              </div>
              
            </Dialog.Content>
          </div>
        </Dialog.Portal>
      </Dialog.Root>

      {/* TOAST ALERT FEEDBACK removidos - consumidos globalmente */}

    </div>
  );
}
