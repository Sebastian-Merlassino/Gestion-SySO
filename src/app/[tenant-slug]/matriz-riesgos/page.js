// src/app/[tenant-slug]/matriz-riesgos/page.js
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import { supabase } from '@/lib/supabase';
import { formatDate, formatAsDateInput, convertToDbDate } from '@/lib/utils';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
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
  Printer
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
  const [profile, setProfile] = useState(() => {
    if (typeof window !== 'undefined') {
      const cached = sessionStorage.getItem('user-profile');
      return cached ? JSON.parse(cached) : null;
    }
    return null;
  });
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

  // Campos de formulario a nivel matriz / cabecera
  const [empresaId, setEmpresaId] = useState('');
  const [establecimientoId, setEstablecimientoId] = useState('');

  // Estructura para modo Bulk (Carga Masiva)
  // [ { id, sector, isManual, puestos: [ { id, puesto, isManual, tareas, frecuencia, situacion, peligro, peligroIsManual, riesgo, riesgoIsManual, consecuencia, probabilidad, gravedad, medidas_control_adm, medidas_control_ing, medidas_control_epp, medidas_control_recomendadas, responsable, responsableIsManual, fecha_planificada, fecha_realizacion, post_probabilidad, post_gravedad, observaciones } ] } ]
  const [bulkSectores, setBulkSectores] = useState([]);

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

  // Modales y Feedback
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [modalAlert, setModalAlert] = useState({ show: false, title: '', message: '', onConfirm: null, confirmText: 'Confirmar' });
  const [saveLoading, setSaveLoading] = useState(false);

  // Modal informativo para Frecuencia / Probabilidad / Gravedad
  const [helpModal, setHelpModal] = useState({ show: false, type: '' });

  // Ordenamiento
  const [sortField, setSortField] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');

  // Cargar datos al montar
  useEffect(() => {
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

  const triggerToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 4000);
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
      triggerToast('Error al conectar con Supabase: ' + err.message, 'error');
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

        d.setDrawColor(217, 217, 217);
        d.setLineWidth(1);
        d.line(40, 70, 801, 70);
      };

      const headers = [['Cliente', 'Establecimiento', 'Sector / Puesto', 'Peligro / Riesgo / Consecuencias', 'Prob. / Grav. / Nivel', 'Medidas de Control Existentes', 'Medidas Control Recom.']];
      
      const body = sortedMatriz.map(row => {
        const emp = empresas.find(e => e.id === row.empresa_id);
        const est = allEstablecimientos.find(e => e.id === row.establecimiento_id);
        
        return [
          emp ? emp.razon_social : 'N/A',
          est ? est.denominacion : 'N/A',
          `Sector: ${row.sector || 'N/A'}\nPuesto: ${row.puesto || 'N/A'}`,
          `Peligro: ${row.peligro || 'N/A'}\nRiesgo: ${row.riesgo || 'N/A'}\nConsecuencias: ${row.consecuencia || 'N/A'}`,
          `Ini: P=${row.probabilidad}, G=${row.gravedad} -> ${row.nivel_riesgo}\nRes: P=${row.post_probabilidad || '-'}, G=${row.post_gravedad || '-'} -> ${row.post_nivel_riesgo || '-'}`,
          `Ingeniería: ${row.medidas_control_ing || 'N/A'}\nAdm: ${row.medidas_control_adm || 'N/A'}\nEPPs: ${row.medidas_control_epp || 'N/A'}`,
          `${row.medidas_control_recomendadas || 'N/A'}${row.responsable ? `\nResp: ${row.responsable}` : ''}${row.fecha_planificada ? `\nPlazo: ${formatDate(row.fecha_planificada)}` : ''}`
        ];
      });

      autoTable(doc, {
        head: headers,
        body: body,
        startY: 90,
        margin: { left: 40, right: 40 },
        theme: 'grid',
        headStyles: { fillColor: [68, 114, 196], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
        bodyStyles: { fontSize: 7, textColor: [50, 50, 50] },
        columnStyles: {
          0: { cellWidth: 80 },
          1: { cellWidth: 80 },
          2: { cellWidth: 90 },
          3: { cellWidth: 160 },
          4: { cellWidth: 100 },
          5: { cellWidth: 130 },
          6: { cellWidth: 120 }
        },
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
      puestos: []
    };
    setBulkSectores([...bulkSectores, newSec]);
  };

  const handleRemoveBulkSector = (secId) => {
    setBulkSectores(bulkSectores.filter(s => s.id !== secId));
  };

  // Agregar puesto de trabajo dentro de un sector bulk
  const handleAddBulkPuesto = (secId) => {
    const updated = bulkSectores.map(sec => {
      if (sec.id === secId) {
        const newPst = {
          id: 'bulk-pst-' + Date.now() + Math.random().toString(36).substr(2, 5),
          puesto: '',
          isManual: false,
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
          puestos: [...sec.puestos, newPst]
        };
      }
      return sec;
    });
    setBulkSectores(updated);
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
        if ('sector' in updates) {
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

  // Guardado de la Matriz (Inserción en lote o actualización)
  const handleSaveMatriz = async (e) => {
    e.preventDefault();
    if (!empresaId || !establecimientoId) {
      triggerToast('La Razón Social y el Establecimiento son obligatorios.', 'error');
      return;
    }

    setSaveLoading(true);

    try {
      const recordsToInsert = [];

      if (isBulkMode) {
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

      if (isDevMode) {
        if (isBulkMode) {
          const newMocks = recordsToInsert.map((rec, i) => ({
            ...rec,
            id: `mock-mat-${Date.now()}-${i}`
          }));
          setMatrizRiesgos([...newMocks, ...matrizRiesgos]);
          triggerToast('Matriz registrada con éxito (Simulación).');
        } else {
          const updated = {
            ...recordsToInsert[0],
            id: editingId
          };
          setMatrizRiesgos(matrizRiesgos.map(x => x.id === editingId ? updated : x));
          triggerToast('Evaluación actualizada con éxito (Simulación).');
        }
      } else {
        if (isBulkMode) {
          const formatted = recordsToInsert.map(rec => ({
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
            .update(recordsToInsert[0])
            .eq('id', editingId);
          if (error) throw error;
          triggerToast('Evaluación de riesgo guardada exitosamente.');
        }
        await loadRealData();
      }

      handleCloseForm();
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
        <header className="h-16 border-b border-slate-200 flex items-center justify-between px-4 md:px-6 bg-white shrink-0 sticky top-0 z-20">
          <div className="flex items-center gap-2.5 min-w-0">
            <button 
              onClick={() => setIsMobileMenuOpen(true)} 
              className="p-2 -ml-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 md:hidden cursor-pointer shrink-0"
            >
              <Menu className="h-5 w-5" />
            </button>
            <ClipboardList className="h-5 w-5 text-[#468DFF] shrink-0" />
            <h1 className="font-outfit text-base md:text-lg font-bold text-slate-900 truncate leading-none">
              Matriz de identificación de peligros y valoración de riesgos
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

        {loading ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-[#468DFF] mx-auto" />
              <p className="text-xs text-slate-500 font-semibold">Cargando matriz de riesgos...</p>
            </div>
          </div>
        ) : (
          <div className="p-6 md:p-8 space-y-6 max-w-[95%] mx-auto w-full">
            
            {isFormOpen ? (
              // FORMULARIO DE ALTA O EDICIÓN INLINE
              <div className="bg-white rounded-2xl border border-slate-150 shadow-sm overflow-hidden animate-fade-in">
                <div className="h-16 px-4 md:px-6 bg-slate-50 border-b border-slate-150 flex items-center justify-between shrink-0">
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

                <form onSubmit={handleSaveMatriz} className="p-6 space-y-6">
                  <fieldset disabled={!canEdit} className="space-y-6">

                    {/* Sección 1: Cliente y Establecimiento */}
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

                    {isBulkMode ? (
                      // CARGA BULK / MASIVA (SECTORES -> PUESTOS)
                      <div className="space-y-6">
                        <div className="flex items-center justify-between border-b border-slate-150 pb-2">
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
                            <span className="text-xs text-slate-400 font-semibold">Seleccione un Establecimiento para comenzar a estructurar la matriz.</span>
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
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex-grow flex flex-col gap-1">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Sector de Trabajo #{secIdx + 1}</label>
                                {sec.isManual ? (
                                  <div className="space-y-1">
                                    <input
                                      type="text"
                                      required
                                      placeholder="Ingresar sector a mano..."
                                      value={sec.sector}
                                      onChange={(e) => handleUpdateBulkSector(sec.id, 'sector', e.target.value)}
                                      className="w-full border border-slate-200 rounded-xl px-3 py-1.5 text-xs bg-white focus:outline-none"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => {
                                        handleUpdateBulkSector(sec.id, { isManual: false, sector: '' });
                                      }}
                                      className="text-[10px] text-[#468DFF] hover:underline block"
                                    >
                                      Seleccionar de la lista predefinida
                                    </button>
                                  </div>
                                ) : (
                                  <select
                                    required
                                    value={sec.sector}
                                    onChange={(e) => {
                                      if (e.target.value === 'MANUAL') {
                                        handleUpdateBulkSector(sec.id, { isManual: true, sector: '' });
                                      } else {
                                        handleUpdateBulkSector(sec.id, 'sector', e.target.value);
                                      }
                                    }}
                                    className="w-full border border-slate-200 rounded-xl px-3 py-1.5 text-xs bg-white focus:outline-none cursor-pointer"
                                  >
                                    <option value="">Selecciona sector...</option>
                                    {currentEstSectores.map(s => (
                                      <option key={s.id} value={s.denominacion}>{s.denominacion}</option>
                                    ))}
                                    <option value="MANUAL">+ Ingresar manualmente...</option>
                                  </select>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-5">
                                <button
                                  type="button"
                                  onClick={() => handleAddBulkPuesto(sec.id)}
                                  disabled={!sec.sector}
                                  className="px-2.5 py-1.5 bg-[#468DFF] hover:bg-[#0511F2] text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-1"
                                >
                                  <PlusCircle className="h-3 w-3" />
                                  Puesto
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveBulkSector(sec.id)}
                                  className="p-1.5 text-red-500 hover:bg-red-55 rounded-lg transition-colors border border-red-200"
                                  title="Eliminar Sector"
                                >
                                  <Trash2 className="h-4 w-4" />
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
                                  <div key={pst.id} className="border border-slate-150 rounded-xl bg-white p-4 space-y-4">
                                    <div className="flex items-center justify-between gap-4 pb-2 border-b border-slate-100">
                                      <div className="flex-1 grid md:grid-cols-2 gap-4">
                                        <div className="flex flex-grow flex-col gap-1">
                                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Puesto / Operación *</label>
                                          {pst.isManual ? (
                                            <div className="space-y-1">
                                              <input
                                                type="text"
                                                required
                                                placeholder="Ingresar puesto a mano..."
                                                value={pst.puesto}
                                                onChange={(e) => handleUpdateBulkPuesto(sec.id, pst.id, 'puesto', e.target.value)}
                                                className="w-full border border-slate-200 rounded-xl px-3 py-1.5 text-xs bg-white focus:outline-none"
                                              />
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  handleUpdateBulkPuesto(sec.id, pst.id, { isManual: false, puesto: '' });
                                                }}
                                                className="text-[9px] text-[#468DFF] hover:underline block"
                                              >
                                                Seleccionar de la lista predefinida
                                              </button>
                                            </div>
                                          ) : (
                                            <select
                                              required
                                              value={pst.puesto}
                                              onChange={(e) => {
                                                if (e.target.value === 'MANUAL') {
                                                  handleUpdateBulkPuesto(sec.id, pst.id, { isManual: true, puesto: '' });
                                                } else {
                                                  handleUpdateBulkPuesto(sec.id, pst.id, 'puesto', e.target.value);
                                                }
                                              }}
                                              className="w-full border border-slate-200 rounded-xl px-3 py-1.5 text-xs bg-white focus:outline-none cursor-pointer"
                                            >
                                              <option value="">Selecciona puesto...</option>
                                              {predefPuestos.map(p => (
                                                <option key={p.id} value={p.denominacion}>{p.denominacion}</option>
                                              ))}
                                              <option value="MANUAL">+ Ingresar manualmente...</option>
                                            </select>
                                          )}
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

                                      <button
                                        type="button"
                                        onClick={() => handleRemoveBulkPuesto(sec.id, pst.id)}
                                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-red-200 mt-4"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
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
                                        <span className="text-[10px] text-slate-400 font-bold block mb-1">Nivel de Riesgo Inicial</span>
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
                                          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer text-slate-400 hover:text-[#468DFF] flex items-center">
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
                                          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer text-slate-400 hover:text-[#468DFF] flex items-center">
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
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Riesgo Residual Resultante:</span>
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
                                    <div className="flex flex-col gap-1">
                                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Observaciones del Puesto</label>
                                      <textarea
                                        rows={2}
                                        placeholder="Detalles u observaciones de este puesto..."
                                        value={pst.observaciones}
                                        onChange={(e) => handleUpdateBulkPuesto(sec.id, pst.id, 'observaciones', e.target.value)}
                                        className="w-full border border-slate-200 rounded-xl px-2.5 py-1 text-xs focus:outline-none"
                                      />
                                    </div>

                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
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
                              {singleSectorIsManual ? (
                                <div className="space-y-1">
                                  <input
                                    type="text"
                                    required
                                    placeholder="Ingresar sector..."
                                    value={singleSector}
                                    onChange={(e) => setSingleSector(e.target.value)}
                                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSingleSectorIsManual(false);
                                      setSingleSector('');
                                      setSinglePuesto('');
                                    }}
                                    className="text-xs text-[#468DFF] hover:underline block"
                                  >
                                    Seleccionar de la lista predefinida
                                  </button>
                                </div>
                              ) : (
                                <select
                                  required
                                  disabled={!establecimientoId}
                                  value={singleSector}
                                  onChange={(e) => {
                                    if (e.target.value === 'MANUAL') {
                                      setSingleSectorIsManual(true);
                                      setSingleSector('');
                                      setSinglePuesto('');
                                    } else {
                                      setSingleSector(e.target.value);
                                      setSinglePuesto('');
                                    }
                                  }}
                                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] cursor-pointer bg-slate-50/50 disabled:bg-slate-100 disabled:text-slate-400"
                                >
                                  <option value="">{!establecimientoId ? 'Seleccione establecimiento primero' : 'Selecciona sector'}</option>
                                  {currentEstSectores.map(s => (
                                    <option key={s.id} value={s.denominacion}>{s.denominacion}</option>
                                  ))}
                                  <option value="MANUAL">+ Ingresar manualmente...</option>
                                </select>
                              )}
                            </div>

                            <div className="flex flex-col gap-1.5">
                              <label className="text-xs font-bold text-slate-600">Puesto de Trabajo / Operación *</label>
                              {singlePuestoIsManual ? (
                                <div className="space-y-1">
                                  <input
                                    type="text"
                                    required
                                    placeholder="Ingresar puesto..."
                                    value={singlePuesto}
                                    onChange={(e) => setSinglePuesto(e.target.value)}
                                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSinglePuestoIsManual(false);
                                      setSinglePuesto('');
                                    }}
                                    className="text-xs text-[#468DFF] hover:underline block"
                                  >
                                    Seleccionar de la lista predefinida
                                  </button>
                                </div>
                              ) : (
                                <select
                                  required
                                  disabled={!singleSector || singleSectorIsManual}
                                  value={singlePuesto}
                                  onChange={(e) => {
                                    if (e.target.value === 'MANUAL') {
                                      setSinglePuestoIsManual(true);
                                      setSinglePuesto('');
                                    } else {
                                      setSinglePuesto(e.target.value);
                                    }
                                  }}
                                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] cursor-pointer bg-slate-50/50 disabled:bg-slate-100 disabled:text-slate-400"
                                >
                                  <option value="">{!singleSector ? 'Seleccione sector primero' : 'Selecciona puesto'}</option>
                                  {(currentEstSectores.find(s => s.denominacion === singleSector)?.puestos || []).map(p => (
                                    <option key={p.id} value={p.denominacion}>{p.denominacion}</option>
                                  ))}
                                  <option value="MANUAL">+ Ingresar manualmente...</option>
                                </select>
                              )}
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

                          <div className="grid md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-150">
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
                              <label className="text-xs font-bold text-slate-600 mb-1">Nivel de Riesgo Inicial</label>
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
                            <div className="flex items-center justify-end gap-3 bg-slate-50 p-4 rounded-xl border border-slate-150">
                              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Nivel de Riesgo Residual:</span>
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
                      <label className="text-xs font-bold text-slate-700 block mb-1">Observaciones</label>
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
              // VISTA DE LISTADO PRINCIPAL (CONTENEDORES SEPARADOS DE FILTRO Y TABLA)
              <div className="space-y-6">
                
                {/* Contenedor 1: Panel de Filtros y Búsqueda */}
                <div className="bg-white rounded-2xl border border-slate-150 p-3 shadow-sm space-y-3 shrink-0">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="hidden md:block flex-1"></div>

                    <div className="flex flex-col md:flex-row md:items-center gap-3 w-full md:w-auto">
                      <div className="relative w-full md:w-72">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
                        <input
                          type="text"
                          placeholder="Buscar por sector, puesto, peligro, riesgo..."
                          value={filterText}
                          onChange={(e) => setFilterText(e.target.value)}
                          className="w-full pl-9 pr-4 py-1.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all text-slate-700 placeholder-slate-400"
                        />
                      </div>

                      <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
                        <button
                          type="button"
                          onClick={() => handleExportPdfReport(false)}
                          className="py-1.5 px-3 rounded-xl border border-[#468DFF] text-xs font-bold bg-white text-[#468DFF] hover:bg-[#468DFF] hover:text-white transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                          title="Descargar listado en formato PDF"
                        >
                          <FileText className="h-4 w-4" />
                          Descargar PDF
                        </button>
                        <button
                          type="button"
                          onClick={() => handleExportPdfReport(true)}
                          className="py-1.5 px-3 rounded-xl border border-[#468DFF] text-xs font-bold bg-white text-[#468DFF] hover:bg-[#468DFF] hover:text-white transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                          title="Imprimir listado completo"
                        >
                          <Printer className="h-4 w-4" />
                          Imprimir
                        </button>
                      </div>
                      
                      {canCargar && (
                        <button
                          onClick={() => { setIsBulkMode(true); setIsReadOnlyView(false); setIsFormOpen(true); }}
                          className="px-3.5 py-1.5 bg-[#468DFF] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-[#0511F2] transition-all cursor-pointer shadow-md shadow-[#468DFF]/10 shrink-0 w-full md:w-auto"
                        >
                          <PlusCircle className="h-3.5 w-3.5" />
                          Nueva Matriz de Riesgos
                        </button>
                      )}
                    </div>
                  </div>

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
                          Limpiar Filtros
                        </button>
                      )}
                    </div>

                    {showFilters && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1 animate-fade-in">
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
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-280px)] min-h-[400px]">
                  {sortedMatriz.length === 0 ? (
                    <div className="flex-grow flex flex-col items-center justify-center p-8 text-center gap-3 h-full">
                      <AlertCircle className="h-10 w-10 text-slate-300" />
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-slate-800">No hay evaluaciones de riesgo registradas</p>
                        <p className="text-xs text-slate-400">Registra una nueva matriz de riesgo para comenzar.</p>
                      </div>
                      {canCargar && (
                        <button
                          onClick={() => { setIsBulkMode(true); setIsReadOnlyView(false); setIsFormOpen(true); }}
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
                        <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider sticky top-0 border-b border-slate-200 z-10">
                          <tr>
                            <th className="px-6 py-4 text-center w-28">Acciones</th>
                            <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('cliente')}>Cliente</th>
                            <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('establecimiento')}>Establecimiento</th>
                            <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('sector')}>Sector</th>
                            <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('puesto')}>Puesto / Operación</th>
                            <th className="px-6 py-4">Peligro</th>
                            <th className="px-6 py-4">Riesgo</th>
                            <th className="px-6 py-4 text-center">Riesgo Inicial</th>
                            <th className="px-6 py-4 text-center">Riesgo Residual</th>
                            <th className="px-6 py-4">Responsable</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-150">
                          {sortedMatriz.map((row) => {
                            const emp = empresas.find(e => e.id === row.empresa_id);
                            const est = allEstablecimientos.find(e => e.id === row.establecimiento_id);
                            
                            const initialRisk = getRiskLevel(row.probabilidad, row.gravedad);
                            const residualRisk = row.post_probabilidad && row.post_gravedad 
                              ? getRiskLevel(row.post_probabilidad, row.post_gravedad) 
                              : null;

                            return (
                              <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-6 py-3 text-center">
                                  <div className="flex items-center justify-center gap-1.5">
                                    {isReadOnlyView ? (
                                      <button
                                        type="button"
                                        onClick={() => { handleEditClick(row); }}
                                        className="p-1.5 rounded-lg bg-blue-50 text-[#468DFF] hover:bg-blue-100 hover:text-[#0511F2] transition-all cursor-pointer"
                                        title="Ver detalles"
                                      >
                                        <Eye className="h-4.5 w-4.5" />
                                      </button>
                                    ) : (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => handleEditClick(row)}
                                          className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-600 transition-colors cursor-pointer"
                                          title="Editar evaluación"
                                        >
                                          <Edit className="h-4 w-4" />
                                        </button>
                                        {canEliminar && (
                                          <button
                                            type="button"
                                            onClick={() => handleDeleteClick(row.id)}
                                            className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition-colors cursor-pointer"
                                            title="Eliminar registro"
                                          >
                                            <Trash2 className="h-4 w-4" />
                                          </button>
                                        )}
                                      </>
                                    )}
                                  </div>
                                </td>
                                <td className="px-6 py-3 font-semibold text-slate-800">{emp?.razon_social || 'Desconocido'}</td>
                                <td className="px-6 py-3 text-slate-600">{est?.denominacion || 'Desconocido'}</td>
                                <td className="px-6 py-3 text-slate-600 font-semibold">{row.sector}</td>
                                <td className="px-6 py-3 text-slate-600 font-medium">{row.puesto}</td>
                                <td className="px-6 py-3 text-slate-600">{row.peligro}</td>
                                <td className="px-6 py-3 text-slate-600">{row.riesgo}</td>
                                <td className="px-6 py-3 text-center">
                                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${initialRisk?.bgClass}`}>
                                    {row.nivel_riesgo}
                                  </span>
                                </td>
                                <td className="px-6 py-3 text-center">
                                  {residualRisk ? (
                                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${residualRisk?.bgClass}`}>
                                      {row.post_nivel_riesgo}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 italic text-[11px]">-</span>
                                  )}
                                </td>
                                <td className="px-6 py-3 text-slate-600 font-medium">{row.responsable || 'No asignado'}</td>
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
          <div className="bg-white rounded-2xl border border-slate-150 p-6 shadow-xl max-w-sm w-full animate-scale-up space-y-4 text-center">
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

      {/* TOAST ALERT FEEDBACK */}
      {toast.show && (
        <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl border shadow-lg animate-fade-in-up ${
          toast.type === 'error' 
            ? 'bg-red-50 text-red-700 border-red-200' 
            : 'bg-green-50 text-green-700 border-green-200'
        }`}>
          {toast.type === 'success' ? <Check className="h-4 w-4 shrink-0" /> : <X className="h-4 w-4 shrink-0" />}
          <span className="text-xs font-bold">{toast.message}</span>
        </div>
      )}

    </div>
  );
}
