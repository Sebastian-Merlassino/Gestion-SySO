// src/app/[tenant-slug]/empresas/page.js
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase, fetchAllGeography } from '@/lib/supabase';
import { 
  Building, 
  Users, 
  FileText, 
  Calendar, 
  Settings, 
  LogOut, 
  PlusCircle, 
  Edit, 
  Trash2, 
  ArrowLeft, 
  Loader2, 
  Check, 
  Briefcase, 
  Phone, 
  Mail, 
  MapPin, 
  Plus, 
  Minus,
  AlertTriangle,
  Info,
  Menu,
  X,
  ClipboardList,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  GraduationCap,
  Search,
  Sliders,
  Flame,
  ClipboardCheck,
  Folder
} from 'lucide-react';

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

const DECRETO_CHAPTERS = [
  { id: 'cap_5', name: 'CAPÍTULO 5 - Proyecto, Instalación, Ampliación, Acondicionamiento y Modificación' },
  { id: 'cap_6', name: 'CAPÍTULO 6 - Provisión de Agua Potable' },
  { id: 'cap_7', name: 'CAPÍTULO 7 - Desagües Industriales' },
  { id: 'cap_8', name: 'CAPÍTULO 8 - Carga Térmica' },
  { id: 'cap_9', name: 'CAPÍTULO 9 - Contaminación Ambiental' },
  { id: 'cap_10', name: 'CAPÍTULO 10 - Radiaciones' },
  { id: 'cap_11', name: 'CAPÍTULO 11 - Ventilación' },
  { id: 'cap_12', name: 'CAPÍTULO 12 - Iluminación y Color' },
  { id: 'cap_13', name: 'CAPÍTULO 13 - Ruidos y Vibraciones' },
  { id: 'cap_14', name: 'CAPÍTULO 14 - Instalaciones Eléctricas' },
  { id: 'cap_15', name: 'CAPÍTULO 15 - Máquinas y Herramientas' },
  { id: 'cap_16', name: 'CAPÍTULO 16 - Aparatos que puedan desarrollar presión interna' },
  { id: 'cap_17', name: 'CAPÍTULO 17 - Trabajos con Riesgos Especiales' },
  { id: 'cap_18', name: 'CAPÍTULO 18 - Protección contra Incendios' },
  { id: 'cap_19', name: 'CAPÍTULO 19 - Equipos y Elementos de Protección Personal' },
  { id: 'cap_20', name: 'CAPÍTULO 20 - Selección de Personal' },
  { id: 'cap_21', name: 'CAPÍTULO 21 - Capacitación' }
];

const MAQUINAS_FIJAS_OPTS = ['Prensas hidráulicas / mecánicas', 'Guillotinas', 'Cizallas', 'Tornos', 'Fresadoras', 'Taladros de banco', 'Sierras circular / cinta', 'Esmeriladoras de banco', 'Inyectoras / extrusoras', 'Mezcladoras industriales', 'Trituradoras / molinos', 'Cintas transportadoras'];
const MAQUINAS_MOVILES_OPTS = ['Retroexcavadoras', 'Palas cargadoras', 'Motoniveladoras', 'Compactadoras', 'Rodillos'];
const HERRAMIENTAS_PORTATILES_OPTS = ['Amoladoras', 'Taladros manuales', 'Atornilladores eléctricos', 'Sierras eléctricas', 'Lijadoras'];
const APARATOS_PRESION_OPTS = ['Calderas', 'Compresores / aire comprimido', 'Recipientes a presión', 'Intercambiadores y equipos asociados', 'Cilindros de gases a presión'];
const EQUIPOS_TERMICOS_OPTS = ['Termotanques', 'Calefones', 'Calderas chicas domésticas o comerciales no registradas como ASP', 'Hornos eléctricos', 'Hornos a gas', 'Estufas industriales', 'Secadores térmicos', 'Equipos de calentamiento por resistencias'];
const EQUIPOS_ELEVACION_OPTS = ['Ascensores', 'Montacargas', 'Plataformas elevadoras tipo tijera', 'Plataformas articuladas / telescópicas', 'Hidroelevadores (camión con canastilla)', 'Andamios motorizados colgantes', 'Plataformas suspendidas'];
const EQUIPOS_IZAJE_OPTS = ['Puentes grúa', 'Pórticos', 'Semipórticos', 'Plumas', 'Grúas móviles', 'Camiones grúa', 'Autoelevadores', 'Polipastos eléctricos', 'Polipastos manuales', 'Tornos de izaje', 'Ganchos', 'Grilletes', 'Cables de acero', 'Cadenas', 'Balancines', 'Eslingas textiles, de cadena o de cable'];

export default function EmpresasClientes({ params }) {
  const tenantSlug = params['tenant-slug'];
  
  // Vista activa: 'list' o 'form'
  const [view, setView] = useState('list');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDevMode, setIsDevMode] = useState(false);
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

  // Datos del Tenant y Perfil
  const [profile, setProfile] = useState(null);
  const [tenant, setTenant] = useState(null);
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

  const sectionPerms = getSectionPermissions(profile, 'empresas');
  const canCargar = sectionPerms.cargar;
  const canEditar = sectionPerms.editar;
  const canEliminar = sectionPerms.eliminar;
  const isFormDisabled = (editingId ? !canEditar : !canCargar) || isReadOnlyView;
  const canEdit = !isFormDisabled; // Maintain compatibility

  // Listados de datos
  const [empresas, setEmpresas] = useState([]);
  const [actividadesEconomicas, setActividadesEconomicas] = useState([]);

  // Filtros y ordenamiento para listado
  const [filterEmpresa, setFilterEmpresa] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState('razon_social');
  const [sortOrder, setSortOrder] = useState('asc');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setShowFilters(false);
    }
  }, []);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const filteredEmpresas = empresas.filter(emp => {
    const matchesSearch = searchQuery ? (
      (emp.razon_social || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (emp.nombre_comercial || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (emp.cuit || '').includes(searchQuery)
    ) : true;

    const matchesEmpresa = filterEmpresa ? emp.id === filterEmpresa : true;

    return matchesSearch && matchesEmpresa;
  });

  const sortedEmpresas = [...filteredEmpresas].sort((a, b) => {
    let valA = a[sortField] || '';
    let valB = b[sortField] || '';

    if (typeof valA === 'string') {
      valA = valA.toLowerCase();
      valB = valB.toLowerCase();
    }

    if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  // Búsqueda de actividades
  const [searchTermCiiu, setSearchTermCiiu] = useState('');
  const [ciiuResults, setCiiuResults] = useState([]);

  // ID de la empresa en edición (null si es nueva)

  // Estado del Formulario Principal (Empresa)
  const [razonSocial, setRazonSocial] = useState('');
  const [nombreComercial, setNombreComercial] = useState('');
  const [cuit, setCuit] = useState('');
  const [cuitError, setCuitError] = useState('');
  
  // Actividades CIIU seleccionadas (array de objetos actividad)
  const [selectedCiiu, setSelectedCiiu] = useState([]);

  // Listas de Contactos
  const [telefonos, setTelefonos] = useState([]);
  const [correos, setCorreos] = useState([]);
  const [facturacion, setFacturacion] = useState([]);

  // Establecimientos
  const [establecimientos, setEstablecimientos] = useState([]);

  // Credenciales
  const [artWeb, setArtWeb] = useState('');
  const [artUsuario, setArtUsuario] = useState('');
  const [artClave, setArtClave] = useState('');
  const [mibaUsuario, setMibaUsuario] = useState('');
  const [mibaClave, setMibaClave] = useState('');
  const [ambienteUsuario, setAmbienteUsuario] = useState('');
  const [ambienteClave, setAmbienteClave] = useState('');

  // Observaciones
  const [observaciones, setObservaciones] = useState('');

  // Tab activo en el formulario
  const [activeTab, setActiveTab] = useState('general');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Estados para visibilidad de contraseñas de portales
  const [showArtClave, setShowArtClave] = useState(false);
  const [showMibaClave, setShowMibaClave] = useState(false);
  const [showAmbienteClave, setShowAmbienteClave] = useState(false);

  // Diálogo modal de alerta / confirmación
  const [modalAlert, setModalAlert] = useState({ show: false, title: '', message: '', type: 'info', onConfirm: null, confirmText: 'Confirmar' });
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  // Estados para el Portal de Cliente
  const [clientProfile, setClientProfile] = useState(null);
  const [clientEmail, setClientEmail] = useState('');
  const [clientPassword, setClientPassword] = useState('');
  const [clientName, setClientName] = useState('');
  const [portalLoading, setPortalLoading] = useState(false);

  // Cargar datos iniciales
  useEffect(() => {
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

  // Verificar query params (para ?new=true de accesos rápidos)
  useEffect(() => {
    if (view === 'list' && !loading) {
      const queryParams = new URLSearchParams(window.location.search);
      if (queryParams.get('new') === 'true') {
        // Limpiar query param de la url
        window.history.replaceState({}, document.title, window.location.pathname);
        handleAddNew();
      }
    }
  }, [view, loading]);

  const triggerToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 4000);
  };

  const showAlert = (title, message, type = 'info', onConfirm = null, confirmText = 'Confirmar') => {
    setModalAlert({ show: true, title, message, type, onConfirm, confirmText });
  };

  const closeAlert = () => {
    setModalAlert({ show: false, title: '', message: '', type: 'info', onConfirm: null, confirmText: 'Confirmar' });
  };

  const loadMockData = () => {
    setProfile({ full_name: 'Profesional de SySO (Mock)', role: 'admin' });
    setTenant({ id: 'mock-tenant', name: 'Consultora de Prueba', plan_id: 'free' });
    setEmpresas([
      {
        id: 'mock-empresa-1',
        razon_social: 'Acme Argentina S.A.',
        nombre_comercial: 'Acme Solutions',
        cuit: '30712345678',
        actividades_ciiu: ['11111', '492290'],
        establecimientos_count: 1
      }
    ]);
    setActividadesEconomicas([
      { codigo: '11111', descripcion: 'Cultivo de arroz' },
      { codigo: '11112', descripcion: 'Cultivo de trigo' },
      { codigo: '492290', descripcion: 'Servicio de transporte automotor de cargas n.c.p.' },
      { codigo: '524120', descripcion: 'Servicios de playas de estacionamiento y garajes' }
    ]);
    setLoading(false);
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
      
      if (prof.role === 'cliente') {
        window.location.href = `/${tenantSlug}/dashboard`;
        return;
      }
      
      setProfile(prof);

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
            window.location.href = `/${homeTen.slug}/empresas`;
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
            window.location.href = `/${homeTen.slug}/empresas`;
            return;
          }
        }
        window.location.href = '/login';
        return;
      }

      setTenant(ten);

      // Cargar Catálogo de Actividades
      const { data: acts, error: actErr } = await supabase
        .from('actividades_economicas')
        .select('codigo, descripcion')
        .order('codigo');
      if (actErr) throw actErr;
      setActividadesEconomicas(acts);

      // Cargar Empresas del Tenant con su conteo de establecimientos
      const { data: emps, error: empErr } = await supabase
        .from('empresas')
        .select(`
          id, razon_social, nombre_comercial, cuit, actividades_ciiu,
          establecimientos:establecimientos(count)
        `)
        .eq('tenant_id', ten.id)
        .order('razon_social');
      if (empErr) throw empErr;

      const mappedEmps = emps.map(e => ({
        id: e.id,
        razon_social: e.razon_social,
        nombre_comercial: e.nombre_comercial,
        cuit: e.cuit,
        actividades_ciiu: e.actividades_ciiu,
        establecimientos_count: e.establecimientos?.[0]?.count || 0
      }));

      setEmpresas(mappedEmps);
      setLoading(false);
    } catch (err) {
      console.error('Error al cargar datos reales:', err);
      triggerToast('Error de conexión con la base de datos.', 'error');
      loadMockData();
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.signOut();
      window.location.href = '/login';
    } catch (err) {
      window.location.href = '/login';
    }
  };

  // Filtrar actividades CIIU al buscar
  useEffect(() => {
    if (!searchTermCiiu.trim()) {
      setCiiuResults([]);
      return;
    }
    const query = searchTermCiiu.toLowerCase();
    const filtered = actividadesEconomicas.filter(
      act => act.codigo.includes(query) || act.descripcion.toLowerCase().includes(query)
    ).slice(0, 8); // limitar a 8 resultados
    setCiiuResults(filtered);
  }, [searchTermCiiu, actividadesEconomicas]);

  // Validaciones del CUIT
  const handleCuitChange = (e) => {
    const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 11);
    setCuit(val);
    if (val.length > 0 && val.length < 11) {
      setCuitError('El CUIT debe contener exactamente 11 números enteros.');
    } else {
      setCuitError('');
    }
  };

  const checkPlanLimits = () => {
    if (!tenant) return true;
    const count = empresas.length;
    const plan = tenant.plan_id;

    if (plan === 'free' && count >= 1) {
      showAlert(
        'Límite de Plan Excedido',
        'Tu Plan Gratis Permanente está limitado a 1 empresa cliente. Por favor actualiza tu suscripción en el Perfil para agregar más clientes.',
        'warning'
      );
      return false;
    }
    if (plan === 'basic_5' && count >= 5) {
      showAlert(
        'Límite de Plan Excedido',
        'Tu Plan 5 está limitado a un máximo de 5 empresas clientes. Por favor actualiza tu plan para continuar agregando.',
        'warning'
      );
      return false;
    }
    if (plan === 'standard_25' && count >= 25) {
      showAlert(
        'Límite de Plan Excedido',
        'Tu Plan 25 está limitado a un máximo de 25 empresas clientes. Por favor actualiza tu plan para continuar agregando.',
        'warning'
      );
      return false;
    }
    return true;
  };

  const handleAddNew = () => {
    setIsReadOnlyView(false);
    if (!checkPlanLimits()) return;

    setEditingId(null);
    setRazonSocial('');
    setNombreComercial('');
    setCuit('');
    setCuitError('');
    setSelectedCiiu([]);
    setTelefonos([{ nombre: '', cargo: '', valor: '' }]);
    setCorreos([{ nombre: '', cargo: '', valor: '' }]);
    setFacturacion([{ nombre: '', cargo: '', valor: '' }]);
    setEstablecimientos([]);
    setArtWeb('');
    setArtUsuario('');
    setArtClave('');
    setMibaUsuario('');
    setMibaClave('');
    setAmbienteUsuario('');
    setAmbienteClave('');
    setObservaciones('');
    
    // Resetear estados del portal de cliente
    setClientProfile(null);
    setClientEmail('');
    setClientPassword('');
    setClientName('');

    setActiveTab('general');
    setView('form');
  };

  const handleEdit = async (empresaId) => {
    setLoading(true);
    setEditingId(empresaId);
    setActiveTab('general');

    if (isDevMode) {
      // Cargar mock data
      setRazonSocial('Acme Argentina S.A.');
      setNombreComercial('Acme Solutions');
      setCuit('30712345678');
      setSelectedCiiu([
        { codigo: '11111', descripcion: 'Cultivo de arroz' },
        { codigo: '492290', descripcion: 'Servicio de transporte automotor de cargas n.c.p.' }
      ]);
      setTelefonos([{ nombre: 'Juan Pérez', cargo: 'Gerente', valor: '1123456789' }]);
      setCorreos([{ nombre: 'Soporte Acme', cargo: 'Soporte', valor: 'info@acme.com' }]);
      setFacturacion([{ nombre: 'Admin Acme', cargo: 'Administración', valor: 'factura@acme.com' }]);
      setEstablecimientos([
        {
          denominacion: 'Planta Industrial Pilar',
          direccion: 'Calle Falsa 123',
          provincia: 'BUENOS AIRES',
          partido: 'PILAR',
          localidad_barrio: 'PILAR',
          cp: '1629',
          superficie_total: '5000',
          superficie_cubierta: '3500',
          superficie_piso: '3500',
          cantidad_plantas: '2',
          horario_funcionamiento: '08:00 a 17:00',
          trabajadores_administrativos: 10,
          trabajadores_productivos: 40,
          trabajadores_equivalentes: 45,
          capitulos_decreto: { cap_5: true, cap_6: true, cap_11: true, cap_12: true, cap_14: true, cap_18: true, cap_19: true, cap_20: true, cap_21: true },
          horas_profesional: 8,
          maquinas_fijas: ['Guillotinas', 'Tornos'],
          maquinas_moviles: ['Palas cargadoras'],
          herramientas_electricas: ['Amoladoras', 'Taladros manuales'],
          aparatos_presion: ['Compresores / aire comprimido'],
          equipos_termicos: ['Termotanques'],
          equipos_elevacion: ['Montacargas'],
          equipos_izaje: ['Autoelevadores'],
          partidosList: ['PILAR', 'TIGRE'],
          localidadesList: ['PILAR', 'DEL VISO']
        }
      ]);
      setArtWeb('https://art.example.com');
      setArtUsuario('acme_art');
      setArtClave('clave_art');
      setMibaUsuario('acme_miba');
      setMibaClave('clave_miba');
      setAmbienteUsuario('acme_ambiente');
      setAmbienteClave('clave_ambiente');
      setObservaciones('Establecimiento crítico de alta exigencia.');
      
      // Mock del portal de cliente en modo desarrollo
      setClientProfile({
        id: 'mock-client-id',
        email: 'cliente@acme.com',
        full_name: 'Juan Pérez Acme',
        cuit: '30712345678'
      });
      setClientEmail('cliente@acme.com');
      setClientName('Juan Pérez Acme');
      setClientPassword('');

      setView('form');
      setLoading(false);
      return;
    }

    try {
      // Cargar Empresa real de Supabase
      const { data: emp, error: empErr } = await supabase
        .from('empresas')
        .select('*')
        .eq('id', empresaId)
        .single();
      if (empErr) throw empErr;

      setRazonSocial(emp.razon_social);
      setNombreComercial(emp.nombre_comercial || '');
      setCuit(emp.cuit);
      setCuitError('');
      
      // Mapear CIIUs
      const mappedCiius = (emp.actividades_ciiu || []).map(code => {
        const match = actividadesEconomicas.find(a => a.codigo === code);
        return match || { codigo: code, descripcion: 'Actividad sin clasificar' };
      });
      setSelectedCiiu(mappedCiius);

      setTelefonos(emp.contactos_telefonos || []);
      setCorreos(emp.contactos_correos || []);
      setFacturacion(emp.contactos_facturacion || []);

      setArtWeb(emp.art_web || '');
      setArtUsuario(emp.art_usuario || '');
      setArtClave(emp.art_clave || '');
      setMibaUsuario(emp.miba_usuario || '');
      setMibaClave(emp.miba_clave || '');
      setAmbienteUsuario(emp.ambiente_usuario || '');
      setAmbienteClave(emp.ambiente_clave || '');
      setObservaciones(emp.observaciones || '');

      // Cargar Establecimientos reales de Supabase
      const { data: ests, error: estsErr } = await supabase
        .from('establecimientos')
        .select('*')
        .eq('empresa_id', empresaId);
      if (estsErr) throw estsErr;

      // Cargar la geografía en cascada de cada establecimiento cargado
      const mappedEsts = await Promise.all(ests.map(async (est) => {
        // Cargar listas de geografía para rellenar los selects
        let partidosList = [];
        let localidadesList = [];
        try {
          if (est.provincia) {
            const parts = await fetchAllGeography(est.provincia);
            partidosList = Array.from(new Set((parts || []).map(p => p.departamento_partido))).sort();
          }
          if (est.provincia && est.partido) {
            const locs = await fetchAllGeography(est.provincia, est.partido);
            localidadesList = Array.from(new Set((locs || []).map(l => l.localidad_barrio))).sort();
          }
        } catch (gErr) {
          console.error('Error al precargar geografía del establecimiento:', gErr);
        }

        return {
          id: est.id,
          denominacion: est.denominacion,
          direccion: est.direccion,
          provincia: est.provincia,
          partido: est.partido,
          localidad_barrio: est.localidad_barrio,
          cp: est.cp || '',
          superficie_total: est.superficie_total || '',
          superficie_cubierta: est.superficie_cubierta || '',
          superficie_piso: est.superficie_piso || '',
          cantidad_plantas: est.cantidad_plantas || '',
          horario_funcionamiento: est.horario_funcionamiento || '',
          trabajadores_administrativos: est.trabajadores_administrativos || 0,
          trabajadores_productivos: est.trabajadores_productivos || 0,
          trabajadores_equivalentes: parseFloat(est.trabajadores_equivalentes) || 0,
          capitulos_decreto: est.capitulos_decreto || {},
          horas_profesional: parseFloat(est.horas_profesional) || 0,
          maquinas_fijas: est.maquinas_fijas || [],
          maquinas_moviles: est.maquinas_moviles || [],
          herramientas_electricas: est.herramientas_electricas || [],
          aparatos_presion: est.aparatos_presion || [],
          equipos_termicos: est.equipos_termicos || [],
          equipos_elevacion: est.equipos_elevacion || [],
          equipos_izaje: est.equipos_izaje || [],
          partidosList,
          localidadesList,
          isCollapsed: true
        };
      }));

      setEstablecimientos(mappedEsts);

      // Cargar Perfil de portal del cliente si existe
      if (isDevMode) {
        setClientProfile({
          id: 'mock-client-id',
          email: 'cliente@acme.com',
          full_name: 'Juan Pérez Acme',
          cuit: emp.cuit || '30712345678'
        });
        setClientEmail('cliente@acme.com');
        setClientName('Juan Pérez Acme');
      } else {
        const { data: clientProf, error: clientProfErr } = await supabase
          .from('profiles')
          .select('*')
          .eq('empresa_id', empresaId)
          .eq('role', 'cliente')
          .maybeSingle();

        if (!clientProfErr && clientProf) {
          setClientProfile(clientProf);
          setClientEmail(clientProf.email || '');
          setClientName(clientProf.full_name || emp.razon_social);
        } else {
          setClientProfile(null);
          // Pre-cargar email sugerido con el primer correo si existe
          const primaryEmail = (emp.contactos_correos && emp.contactos_correos.length > 0) 
            ? emp.contactos_correos[0].valor 
            : '';
          setClientEmail(primaryEmail);
          setClientName(emp.razon_social);
        }
      }
      setClientPassword('');

      setView('form');
      setLoading(false);
    } catch (err) {
      console.error('Error al editar empresa:', err);
      triggerToast('Error al obtener datos de la empresa.', 'error');
      setLoading(false);
    }
  };

  const handleDelete = async (empresaId, name) => {
    showAlert(
      'Eliminar Empresa Cliente',
      `¿Estás seguro de que deseas eliminar permanentemente a "${name}" y todos sus establecimientos asociados? Esta acción no se puede deshacer.`,
      'warning',
      async () => {
        setLoading(true);
        if (isDevMode) {
          setEmpresas(prev => prev.filter(e => e.id !== empresaId));
          triggerToast('Empresa eliminada con éxito (Simulación).');
          setLoading(false);
          setView('list');
          closeAlert();
          return;
        }

        try {
          const { error } = await supabase
            .from('empresas')
            .delete()
            .eq('id', empresaId);
          if (error) throw error;
          
          triggerToast('Empresa cliente eliminada con éxito.');
          setView('list');
          await loadRealData();
        } catch (err) {
          console.error('Error al borrar empresa:', err);
          triggerToast('Error al borrar la empresa.', 'error');
        } finally {
          setLoading(false);
          closeAlert();
        }
      },
      'Eliminar'
    );
  };

  const handleEnablePortal = async () => {
    if (!clientEmail || !clientName) {
      triggerToast('Por favor completa todos los campos requeridos para habilitar el portal.', 'error');
      return;
    }

    setPortalLoading(true);

    if (isDevMode) {
      setTimeout(() => {
        setClientProfile({
          id: 'mock-client-id',
          email: clientEmail,
          full_name: clientName,
          cuit: cuit
        });
        setClientPassword('');
        setPortalLoading(false);
        triggerToast('Acceso al portal habilitado con éxito (Simulación).');
      }, 1500);
      return;
    }

    try {
      const response = await fetch('/api/clientes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          empresaId: editingId,
          email: clientEmail,
          password: clientPassword || cuit, // Si no se especifica, usa el CUIT
          full_name: clientName,
          cuit: cuit
        })
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Error al habilitar el portal de cliente');
      }

      // Volver a cargar el perfil de cliente creado
      const { data: clientProf, error: clientProfErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', result.userId)
        .single();

      if (clientProfErr) throw clientProfErr;

      setClientProfile(clientProf);
      setClientPassword('');
      triggerToast('Portal de cliente habilitado exitosamente.');
    } catch (err) {
      console.error('Error al habilitar portal:', err);
      triggerToast(err.message || 'Error al habilitar el portal.', 'error');
    } finally {
      setPortalLoading(false);
    }
  };

  const handleDisablePortal = async () => {
    if (!clientProfile?.id) return;

    showAlert(
      'Deshabilitar Portal de Cliente',
      '¿Estás seguro de que deseas revocar de manera permanente las credenciales de ingreso para el portal de cliente? El usuario ya no podrá iniciar sesión.',
      'warning',
      async () => {
        setPortalLoading(true);

        if (isDevMode) {
          setTimeout(() => {
            setClientProfile(null);
            setClientEmail('');
            setPortalLoading(false);
            triggerToast('Acceso al portal deshabilitado con éxito (Simulación).');
            closeAlert();
          }, 1500);
          return;
        }

        try {
          const response = await fetch(`/api/clientes?userId=${clientProfile.id}`, {
            method: 'DELETE'
          });

          const result = await response.json();
          if (!response.ok) {
            throw new Error(result.error || 'Error al deshabilitar el portal');
          }

          setClientProfile(null);
          setClientEmail('');
          setClientPassword('');
          triggerToast('Portal de cliente deshabilitado exitosamente.');
        } catch (err) {
          console.error('Error al deshabilitar portal:', err);
          triggerToast(err.message || 'Error al deshabilitar el portal.', 'error');
        } finally {
          setPortalLoading(false);
          closeAlert();
        }
      },
      'Deshabilitar'
    );
  };

  // Lógica de cálculo reactivo
  const handleWorkerChange = (index, field, value) => {
    const updated = [...establecimientos];
    const val = parseInt(value) || 0;
    
    updated[index][field] = val;
    
    // Calcular trabajadores equivalentes
    const admin = field === 'trabajadores_administrativos' ? val : updated[index].trabajadores_administrativos;
    const prod = field === 'trabajadores_productivos' ? val : updated[index].trabajadores_productivos;
    const equiv = (admin / 2) + prod;
    
    updated[index].trabajadores_equivalentes = equiv;

    // Recalcular horas profesionales
    const { category, hours } = calculateHoursAndCategory(equiv, updated[index].capitulos_decreto);
    updated[index].horas_profesional = hours;

    setEstablecimientos(updated);
  };

  const handleChapterCheckboxChange = (estIndex, chapterId) => {
    const updated = [...establecimientos];
    const currentCaps = { ...updated[estIndex].capitulos_decreto };
    
    currentCaps[chapterId] = !currentCaps[chapterId];
    updated[estIndex].capitulos_decreto = currentCaps;

    // Recalcular horas profesionales basadas en la nueva categoría resultante
    const equiv = updated[estIndex].trabajadores_equivalentes;
    const { category, hours } = calculateHoursAndCategory(equiv, currentCaps);
    updated[estIndex].horas_profesional = hours;

    setEstablecimientos(updated);
  };

  // Determinación de categoría y horas del decreto 351/79
  const calculateHoursAndCategory = (equiv, chapters) => {
    const hasCatC = chapters.cap_8 || chapters.cap_9 || chapters.cap_10;
    const hasCatB = chapters.cap_7 || chapters.cap_13 || chapters.cap_15 || chapters.cap_16 || chapters.cap_17;

    let category = 'A';
    if (hasCatC) {
      category = 'C';
    } else if (hasCatB) {
      category = 'B';
    }

    let hours = 0;
    if (equiv >= 1 && equiv <= 15) {
      hours = category === 'A' ? 0 : (category === 'B' ? 2 : 4);
    } else if (equiv > 15 && equiv <= 30) {
      hours = category === 'A' ? 0 : (category === 'B' ? 4 : 8);
    } else if (equiv > 30 && equiv <= 60) {
      hours = category === 'A' ? 0 : (category === 'B' ? 8 : 16);
    } else if (equiv > 60 && equiv <= 100) {
      hours = category === 'A' ? 1 : (category === 'B' ? 16 : 28);
    } else if (equiv > 100 && equiv <= 150) {
      hours = category === 'A' ? 2 : (category === 'B' ? 22 : 44);
    } else if (equiv > 150 && equiv <= 250) {
      hours = category === 'A' ? 4 : (category === 'B' ? 30 : 60);
    } else if (equiv > 250 && equiv <= 350) {
      hours = category === 'A' ? 8 : (category === 'B' ? 45 : 78);
    } else if (equiv > 350 && equiv <= 500) {
      hours = category === 'A' ? 12 : (category === 'B' ? 60 : 96);
    } else if (equiv > 500 && equiv <= 650) {
      hours = category === 'A' ? 16 : (category === 'B' ? 75 : 114);
    } else if (equiv > 650 && equiv <= 850) {
      hours = category === 'A' ? 20 : (category === 'B' ? 90 : 132);
    } else if (equiv > 850 && equiv <= 1100) {
      hours = category === 'A' ? 24 : (category === 'B' ? 105 : 150);
    } else if (equiv > 1100 && equiv <= 1400) {
      hours = category === 'A' ? 28 : (category === 'B' ? 120 : 168);
    } else if (equiv > 1400 && equiv <= 1900) {
      hours = category === 'A' ? 32 : (category === 'B' ? 135 : 186);
    } else if (equiv > 1900 && equiv <= 3000) {
      hours = category === 'A' ? 36 : (category === 'B' ? 150 : 204);
    } else if (equiv > 3000) {
      hours = category === 'A' ? 40 : (category === 'B' ? 170 : 220);
    }

    return { category, hours };
  };

  // Manejo de la selección de Geografía en los establecimientos
  const handleEstProvinciaChange = async (estIndex, provValue) => {
    const updated = [...establecimientos];
    updated[estIndex].provincia = provValue;
    updated[estIndex].partido = '';
    updated[estIndex].localidad_barrio = '';
    updated[estIndex].partidosList = [];
    updated[estIndex].localidadesList = [];

    if (!provValue) {
      setEstablecimientos(updated);
      return;
    }

    if (isDevMode) {
      const mockParts = provValue === 'BUENOS AIRES' ? ['PILAR', 'TIGRE'] : ['CENTRO', 'PALERMO'];
      updated[estIndex].partidosList = mockParts;
      setEstablecimientos(updated);
      return;
    }

    try {
      const data = await fetchAllGeography(provValue);
      const uniqueParts = Array.from(new Set(data.map(p => p.departamento_partido))).sort();
      updated[estIndex].partidosList = uniqueParts;
      setEstablecimientos(updated);
    } catch (err) {
      console.error('Error al cargar partidos del establecimiento:', err);
      triggerToast('Error al cargar partidos.', 'error');
    }
  };

  const handleEstPartidoChange = async (estIndex, partValue) => {
    const updated = [...establecimientos];
    updated[estIndex].partido = partValue;
    updated[estIndex].localidad_barrio = '';
    updated[estIndex].localidadesList = [];

    if (!partValue) {
      setEstablecimientos(updated);
      return;
    }

    if (isDevMode) {
      const mockLocs = partValue === 'PILAR' ? ['PILAR', 'DEL VISO'] : ['PALERMO I', 'PALERMO II'];
      updated[estIndex].localidadesList = mockLocs;
      setEstablecimientos(updated);
      return;
    }

    try {
      const data = await fetchAllGeography(updated[estIndex].provincia, partValue);
      const uniqueLocs = Array.from(new Set(data.map(l => l.localidad_barrio))).sort();
      updated[estIndex].localidadesList = uniqueLocs;
      setEstablecimientos(updated);
    } catch (err) {
      console.error('Error al cargar localidades del establecimiento:', err);
      triggerToast('Error al cargar localidades.', 'error');
    }
  };

  // Manejadores de subida/edición de arrays dinámicos de máquinas y herramientas
  const handleMachineOptionToggle = (estIndex, listKey, optionValue) => {
    const updated = [...establecimientos];
    const currentList = [...(updated[estIndex][listKey] || [])];
    
    if (currentList.includes(optionValue)) {
      updated[estIndex][listKey] = currentList.filter(o => o !== optionValue);
    } else {
      updated[estIndex][listKey] = [...currentList, optionValue];
    }
    setEstablecimientos(updated);
  };

  const handleAddCustomMachine = (estIndex, listKey, textState, setTextState) => {
    if (!textState.trim()) return;
    
    const updated = [...establecimientos];
    const currentList = [...(updated[estIndex][listKey] || [])];
    
    if (!currentList.includes(textState.trim())) {
      updated[estIndex][listKey] = [...currentList, textState.trim()];
    }
    
    setEstablecimientos(updated);
    setTextState(''); // Limpiar input
  };

  // Eliminar un establecimiento del listado local
  const handleRemoveEstablecimiento = (index) => {
    setEstablecimientos(prev => prev.filter((_, i) => i !== index));
  };

  // Agregar un establecimiento vacío al listado local
  const handleAddEstablecimiento = () => {
    const emptyEst = {
      denominacion: '',
      direccion: '',
      provincia: '',
      partido: '',
      localidad_barrio: '',
      cp: '',
      superficie_total: '',
      superficie_cubierta: '',
      superficie_piso: '',
      cantidad_plantas: '',
      horario_funcionamiento: '',
      trabajadores_administrativos: 0,
      trabajadores_productivos: 0,
      trabajadores_equivalentes: 0,
      capitulos_decreto: { cap_5: true, cap_6: true, cap_11: true, cap_12: true, cap_14: true, cap_18: true, cap_19: true, cap_20: true, cap_21: true },
      horas_profesional: 0,
      maquinas_fijas: [],
      maquinas_moviles: [],
      herramientas_electricas: [],
      aparatos_presion: [],
      equipos_termicos: [],
      equipos_elevacion: [],
      equipos_izaje: [],
      partidosList: [],
      localidadesList: [],
      customFijas: '',
      customMoviles: '',
      customPortatiles: '',
      customPresion: '',
      customTermicos: '',
      customElevacion: '',
      customIzaje: '',
      isCollapsed: false
    };
    setEstablecimientos(prev => [...prev, emptyEst]);
  };

  const handleExitForm = () => {
    if (isReadOnlyView) {
      setView('list');
      return;
    }
    showAlert(
      'Salir sin guardar',
      '¿Estás seguro de que deseas salir del formulario? Perderás todos los cambios cargados que no se hayan guardado.',
      'warning',
      () => {
        closeAlert();
        setView('list');
      },
      'Confirmar'
    );
  };

  const handleSidebarNavigation = (e, path) => {
    if (view === 'form') {
      if (isReadOnlyView) {
        if (path === 'list') {
          setView('list');
        } else {
          window.location.href = path;
        }
        return;
      }
      e.preventDefault();
      showAlert(
        'Salir sin guardar',
        '¿Estás seguro de que deseas salir? Los cambios no guardados se perderán.',
        'warning',
        () => {
          closeAlert();
          if (path === 'list') {
            setView('list');
          } else {
            window.location.href = path;
          }
        },
        'Confirmar'
      );
    }
  };

  // Guardar todo en Supabase
  const handleSaveAll = async (e) => {
    e.preventDefault();
    if (!(razonSocial || '').trim()) {
      triggerToast('La Razón Social es requerida.', 'error');
      return;
    }
    if (!(cuit || '').trim() || cuit.length !== 11) {
      triggerToast('CUIT inválido. Debe poseer exactamente 11 números enteros.', 'error');
      return;
    }

    // Verificar si algún establecimiento tiene campos requeridos vacíos
    for (let i = 0; i < establecimientos.length; i++) {
      const est = establecimientos[i];
      if (!(est.direccion || '').trim() || !est.provincia || !est.partido) {
        triggerToast(`El establecimiento #${i + 1} tiene campos requeridos incompletos (Dirección, Geografía).`, 'error');
        setActiveTab('establecimientos');
        return;
      }
    }

    setSaving(true);

    if (isDevMode) {
      // Simular guardado
      const newEmpMock = {
        id: editingId || 'mock-empresa-' + Date.now(),
        razon_social: razonSocial,
        nombre_comercial: nombreComercial,
        cuit: cuit,
        actividades_ciiu: selectedCiiu.map(c => c.codigo),
        establecimientos_count: establecimientos.length
      };

      if (editingId) {
        setEmpresas(prev => prev.map(e => e.id === editingId ? newEmpMock : e));
      } else {
        setEmpresas(prev => [...prev, newEmpMock]);
      }

      triggerToast('Los datos se guardaron con éxito (Simulación).');
      setSaving(false);
      setView('list');
      return;
    }

    try {
      const activitiesCodes = selectedCiiu.map(c => c.codigo);

      const payloadEmpresa = {
        tenant_id: tenant.id,
        razon_social: (razonSocial || '').trim(),
        nombre_comercial: (nombreComercial || '').trim() || null,
        cuit: cuit,
        actividades_ciiu: activitiesCodes,
        contactos_telefonos: telefonos.filter(t => (t.valor || '').trim() !== ''),
        contactos_correos: correos.filter(c => (c.valor || '').trim() !== ''),
        contactos_facturacion: facturacion.filter(f => (f.valor || '').trim() !== ''),
        art_web: (artWeb || '').trim() || null,
        art_usuario: (artUsuario || '').trim() || null,
        art_clave: (artClave || '').trim() || null,
        miba_usuario: (mibaUsuario || '').trim() || null,
        miba_clave: (mibaClave || '').trim() || null,
        ambiente_usuario: (ambienteUsuario || '').trim() || null,
        ambiente_clave: (ambienteClave || '').trim() || null,
        observaciones: (observaciones || '').trim() || null,
        updated_at: new Date().toISOString()
      };

      let empresaId = editingId;

      if (editingId) {
        // Actualizar empresa existente
        const { error: updErr } = await supabase
          .from('empresas')
          .update(payloadEmpresa)
          .eq('id', editingId);
        if (updErr) throw updErr;
      } else {
        // Insertar nueva empresa
        const { data: newEmp, error: insErr } = await supabase
          .from('empresas')
          .insert({ ...payloadEmpresa, created_at: new Date().toISOString() })
          .select('id')
          .single();
        if (insErr) throw insErr;
        empresaId = newEmp.id;
      }

      // Guardar establecimientos asociados
      if (editingId) {
        // Obtener todos los establecimientos que ya existen en la base de datos para esta empresa
        const { data: dbEsts, error: fetchEstsErr } = await supabase
          .from('establecimientos')
          .select('id')
          .eq('empresa_id', editingId);
        
        if (fetchEstsErr) throw fetchEstsErr;

        if (dbEsts && dbEsts.length > 0) {
          const currentEstIds = establecimientos.map(est => est.id).filter(Boolean);
          // Los establecimientos a borrar son los que están en la base de datos pero NO en la UI
          const idsToDelete = dbEsts
            .map(dbEst => dbEst.id)
            .filter(dbId => !currentEstIds.includes(dbId));

          if (idsToDelete.length > 0) {
            const { error: delErr } = await supabase
              .from('establecimientos')
              .delete()
              .in('id', idsToDelete);
            if (delErr) throw delErr;
          }
        }
      }

      if (establecimientos.length > 0) {
        const payloadEsts = establecimientos.map(est => {
          const item = {
            empresa_id: empresaId,
            tenant_id: tenant.id,
            denominacion: (est.denominacion || '').trim(),
            direccion: (est.direccion || '').trim(),
            provincia: est.provincia,
            partido: est.partido,
            localidad_barrio: (est.localidad_barrio || '').trim(),
            cp: (est.cp || '').trim() || null,
            superficie_total: (est.superficie_total || '').trim() || null,
            superficie_cubierta: (est.superficie_cubierta || '').trim() || null,
            superficie_piso: (est.superficie_piso || '').trim() || null,
            cantidad_plantas: (est.cantidad_plantas || '').trim() || null,
            horario_funcionamiento: (est.horario_funcionamiento || '').trim() || null,
            trabajadores_administrativos: est.trabajadores_administrativos,
            trabajadores_productivos: est.trabajadores_productivos,
            trabajadores_equivalentes: est.trabajadores_equivalentes,
            capitulos_decreto: est.capitulos_decreto,
            horas_profesional: est.horas_profesional,
            maquinas_fijas: est.maquinas_fijas,
            maquinas_moviles: est.maquinas_moviles,
            herramientas_electricas: est.herramientas_electricas,
            aparatos_presion: est.aparatos_presion,
            equipos_termicos: est.equipos_termicos,
            equipos_elevacion: est.equipos_elevacion,
            equipos_izaje: est.equipos_izaje,
            updated_at: new Date().toISOString()
          };
          if (est.id) {
            item.id = est.id; // Preservar ID para actualización
          } else {
            item.created_at = new Date().toISOString();
          }
          return item;
        });

        // Separar inserciones de actualizaciones para evitar errores de claves nulas/por defecto en PostgREST
        const toUpdate = payloadEsts.filter(item => item.id);
        const toInsert = payloadEsts.filter(item => !item.id);

        if (toUpdate.length > 0) {
          const { error: upsertEstsErr } = await supabase
            .from('establecimientos')
            .upsert(toUpdate, { onConflict: 'id' });
          if (upsertEstsErr) throw upsertEstsErr;
        }

        if (toInsert.length > 0) {
          const { error: insertEstsErr } = await supabase
            .from('establecimientos')
            .insert(toInsert);
          if (insertEstsErr) throw insertEstsErr;
        }
      }

      triggerToast('Los datos de la empresa y establecimientos se guardaron con éxito.');
      await loadRealData();
      setView('list');
    } catch (err) {
      console.error('Error al guardar datos:', err);
      triggerToast(err.message || 'Error al guardar la empresa cliente.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="h-screen overflow-hidden bg-syso-bg text-slate-700 flex font-sans">
      
      {/* Mobile Sidebar (Drawer Overlay) */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          {/* Overlay background */}
          <div 
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300"
          />

          {/* Drawer Panel */}
          <aside className="relative flex-1 flex flex-col max-w-xs w-full bg-[#0D0D0D] p-6 justify-between animate-scaleUp">
            <div className="absolute top-4 right-4">
              <button 
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 sidebar-scrollbar pr-1">
              {/* Logo Brand */}
              <div className="flex items-center gap-3 mb-8">
                <img 
                  src="/brand/logo-primary.png" 
                  alt="Logo Gestión SySO" 
                  className="h-9 w-9 object-contain shrink-0" 
                />
                <span className="font-outfit text-base font-extrabold text-white tracking-tight block">Gestión SySO</span>
              </div>

              {/* Menú de navegación */}
              <nav className="space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 px-3 block mb-2">Panel principal</span>
                <Link href={`/${tenantSlug}/dashboard`} onClick={(e) => handleSidebarNavigation(e, `/${tenantSlug}/dashboard`)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-[#468DFF] font-semibold text-sm transition-all">
                  <Building className="h-4 w-4" />
                  Dashboard
                </Link>
                {profile && profile.role !== 'cliente' && (
                  <Link href="#" onClick={(e) => handleSidebarNavigation(e, 'list')} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[#468DFF] text-white font-semibold text-sm transition-all shadow-md shadow-[#468DFF]/10">
                    <Users className="h-4 w-4" />
                    Clientes
                  </Link>
                )}
                {profile && profile.role !== 'cliente' && (
                  <Link href={`/${tenantSlug}/equipo`} onClick={(e) => handleSidebarNavigation(e, `/${tenantSlug}/equipo`)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-[#468DFF] font-semibold text-sm transition-all">
                    <Briefcase className="h-4 w-4" />
                    Equipo de Trabajo
                  </Link>
                )}
                <Link href={`/${tenantSlug}/programa`} onClick={(e) => handleSidebarNavigation(e, `/${tenantSlug}/programa`)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-[#468DFF] font-semibold text-sm transition-all">
                  <Calendar className="h-4 w-4" />
                  Programa de Gestión Anual
                </Link>
                <Link href={`/${tenantSlug}/capacitacion`} onClick={(e) => handleSidebarNavigation(e, `/${tenantSlug}/capacitacion`)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-[#468DFF] font-semibold text-sm transition-all">
                  <GraduationCap className="h-4 w-4" />
                  Programa de Capacitación Anual
                </Link>
                <Link href={`/${tenantSlug}/correctivas`} onClick={(e) => handleSidebarNavigation(e, `/${tenantSlug}/correctivas`)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-[#468DFF] font-semibold text-sm transition-all">
                  <ClipboardList className="h-4 w-4" />
                  Acciones Correctivas
                </Link>
                <Link href={`/${tenantSlug}/extintores`} onClick={(e) => handleSidebarNavigation(e, `/${tenantSlug}/extintores`)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-[#468DFF] font-semibold text-sm transition-all">
                  <Flame className="h-4 w-4" />
                  Extintores
                </Link>
                <Link href={`/${tenantSlug}/visitas`} onClick={(e) => handleSidebarNavigation(e, `/${tenantSlug}/visitas`)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-[#468DFF] font-semibold text-sm transition-all">
                  <ClipboardCheck className="h-4 w-4" />
                  Constancia de Visita
                </Link>
                <Link href={`/${tenantSlug}/avisos`} onClick={(e) => handleSidebarNavigation(e, `/${tenantSlug}/avisos`)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-[#468DFF] font-semibold text-sm transition-all">
                  <AlertTriangle className="h-4 w-4" />
                  Aviso de Riesgo
                </Link>
                <Link href={`/${tenantSlug}/legajo`} onClick={(e) => handleSidebarNavigation(e, `/${tenantSlug}/legajo`)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-[#468DFF] font-semibold text-sm transition-all">
                  <Folder className="h-4 w-4" />
                  Legajo Técnico
                </Link>
                
                <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 px-3 block pt-6 mb-2">Configuración</span>
                <Link href={`/${tenantSlug}/profile`} onClick={(e) => handleSidebarNavigation(e, `/${tenantSlug}/profile`)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-[#468DFF] font-semibold text-sm transition-all">
                  <Settings className="h-4 w-4" />
                  Editar Perfil
                </Link>
              </nav>
            </div>

            {/* Footer Sidebar */}
            <div className="pt-4 border-t border-white/10">
              <div className="flex items-center justify-between rounded-xl bg-black/40 p-3 border border-white/5">
                <div className="truncate pr-2">
                  <span className="text-xs font-bold text-white block truncate">{profile?.full_name || 'Usuario'}</span>
                  <span className="text-[10px] text-white/40 block truncate uppercase tracking-wider">{profile?.role || 'Profesional'}</span>
                </div>
                <button 
                  onClick={handleLogout}
                  title="Cerrar sesión"
                  className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-600 hover:text-white transition-all cursor-pointer shrink-0"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* Sidebar - Barra Lateral (Idéntica al Dashboard para consistencia) */}
      <aside className={`bg-[#0D0D0D] flex flex-col justify-between shrink-0 hidden md:flex transition-all duration-300 ${isSidebarCollapsed ? 'w-20' : 'w-64'}`}>
        <div className="p-6 flex-1 overflow-y-auto min-h-0 sidebar-scrollbar">
          {/* Logo Brand */}
          <div className={`flex items-center justify-between gap-3 mb-8 ${isSidebarCollapsed ? 'flex-col' : ''}`}>
            <div className="flex items-center gap-3">
              <img 
                src="/brand/logo-primary.png" 
                alt="Logo" 
                className="h-9 w-9 object-contain shrink-0" 
              />
              {!isSidebarCollapsed && (
                <span className="font-outfit text-base font-extrabold text-white tracking-tight block animate-fade-in">Gestión SySO</span>
              )}
            </div>
            <button
              onClick={toggleSidebar}
              title={isSidebarCollapsed ? 'Expandir barra lateral' : 'Contraer barra lateral'}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all cursor-pointer"
            >
              {isSidebarCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </button>
          </div>

          <nav className="space-y-1.5">
            {!isSidebarCollapsed ? (
              <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 px-3 block mb-2">Panel principal</span>
            ) : (
              <div className="h-px bg-white/10 my-3" />
            )}
            <Link 
              href={`/${tenantSlug}/dashboard`} 
              title="Dashboard"
              onClick={(e) => handleSidebarNavigation(e, `/${tenantSlug}/dashboard`)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-[#468DFF] font-semibold text-sm transition-all ${isSidebarCollapsed ? 'justify-center' : ''}`}
            >
              <Building className="h-4 w-4 shrink-0" />
              {!isSidebarCollapsed && <span className="animate-fade-in">Dashboard</span>}
            </Link>
            {profile && profile.role !== 'cliente' && (
              <Link 
                href="#" 
                title="Clientes"
                onClick={(e) => handleSidebarNavigation(e, 'list')}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[#468DFF] text-white font-semibold text-sm transition-all shadow-md shadow-[#468DFF]/10 ${isSidebarCollapsed ? 'justify-center' : ''}`}
              >
                <Users className="h-4 w-4 shrink-0" />
                {!isSidebarCollapsed && <span className="animate-fade-in">Clientes</span>}
              </Link>
            )}
            {profile && profile.role !== 'cliente' && (
              <Link 
                href={`/${tenantSlug}/equipo`} 
                title="Equipo de Trabajo"
                onClick={(e) => handleSidebarNavigation(e, `/${tenantSlug}/equipo`)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-[#468DFF] font-semibold text-sm transition-all ${isSidebarCollapsed ? 'justify-center' : ''}`}
              >
                <Briefcase className="h-4 w-4 shrink-0" />
                {!isSidebarCollapsed && <span className="animate-fade-in">Equipo de Trabajo</span>}
              </Link>
            )}
            <Link 
              href={`/${tenantSlug}/programa`} 
              title="Programa de Gestión Anual"
              onClick={(e) => handleSidebarNavigation(e, `/${tenantSlug}/programa`)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-[#468DFF] font-semibold text-sm transition-all ${isSidebarCollapsed ? 'justify-center' : ''}`}
            >
              <Calendar className="h-4 w-4 shrink-0" />
              {!isSidebarCollapsed && <span className="animate-fade-in">Programa de Gestión Anual</span>}
            </Link>
            <Link 
              href={`/${tenantSlug}/capacitacion`} 
              title="Programa de Capacitación Anual"
              onClick={(e) => handleSidebarNavigation(e, `/${tenantSlug}/capacitacion`)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-[#468DFF] font-semibold text-sm transition-all ${isSidebarCollapsed ? 'justify-center' : ''}`}
            >
              <GraduationCap className="h-4 w-4 shrink-0" />
              {!isSidebarCollapsed && <span className="animate-fade-in">Programa de Capacitación Anual</span>}
            </Link>
            <Link 
              href={`/${tenantSlug}/correctivas`} 
              title="Acciones Correctivas"
              onClick={(e) => handleSidebarNavigation(e, `/${tenantSlug}/correctivas`)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-[#468DFF] font-semibold text-sm transition-all ${isSidebarCollapsed ? 'justify-center' : ''}`}
            >
              <ClipboardList className="h-4 w-4 shrink-0" />
              {!isSidebarCollapsed && <span className="animate-fade-in">Acciones Correctivas</span>}
            </Link>
            <Link 
              href={`/${tenantSlug}/extintores`} 
              title="Extintores"
              onClick={(e) => handleSidebarNavigation(e, `/${tenantSlug}/extintores`)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-[#468DFF] font-semibold text-sm transition-all ${isSidebarCollapsed ? 'justify-center' : ''}`}
            >
              <Flame className="h-4 w-4 shrink-0" />
              {!isSidebarCollapsed && <span className="animate-fade-in">Extintores</span>}
            </Link>
            <Link 
              href={`/${tenantSlug}/visitas`} 
              title="Constancia de Visita"
              onClick={(e) => handleSidebarNavigation(e, `/${tenantSlug}/visitas`)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-[#468DFF] font-semibold text-sm transition-all ${isSidebarCollapsed ? 'justify-center' : ''}`}
            >
              <ClipboardCheck className="h-4 w-4 shrink-0" />
              {!isSidebarCollapsed && <span className="animate-fade-in">Constancia de Visita</span>}
            </Link>
            <Link 
              href={`/${tenantSlug}/avisos`} 
              title="Aviso de Riesgo"
              onClick={(e) => handleSidebarNavigation(e, `/${tenantSlug}/avisos`)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-[#468DFF] font-semibold text-sm transition-all ${isSidebarCollapsed ? 'justify-center' : ''}`}
            >
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {!isSidebarCollapsed && <span className="animate-fade-in">Aviso de Riesgo</span>}
            </Link>
            <Link 
              href={`/${tenantSlug}/legajo`} 
              title="Legajo Técnico"
              onClick={(e) => handleSidebarNavigation(e, `/${tenantSlug}/legajo`)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-[#468DFF] font-semibold text-sm transition-all ${isSidebarCollapsed ? 'justify-center' : ''}`}
            >
              <Folder className="h-4 w-4 shrink-0" />
              {!isSidebarCollapsed && <span className="animate-fade-in">Legajo Técnico</span>}
            </Link>
            
            {!isSidebarCollapsed ? (
              <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 px-3 block pt-6 mb-2">Configuración</span>
            ) : (
              <div className="h-px bg-white/10 my-6" />
            )}
            <Link 
              href={`/${tenantSlug}/profile`} 
              title="Editar Perfil"
              onClick={(e) => handleSidebarNavigation(e, `/${tenantSlug}/profile`)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-[#468DFF] font-semibold text-sm transition-all ${isSidebarCollapsed ? 'justify-center' : ''}`}
            >
              <Settings className="h-4 w-4 shrink-0" />
              {!isSidebarCollapsed && <span className="animate-fade-in">Editar Perfil</span>}
            </Link>
          </nav>
        </div>

        <div className="p-4 border-t border-white/10">
          <div className={`flex items-center justify-between rounded-xl bg-black/40 p-3 border border-white/5 ${isSidebarCollapsed ? 'flex-col gap-2' : ''}`}>
            {!isSidebarCollapsed && (
              <div className="truncate pr-2">
                <span className="text-xs font-bold text-white block truncate">{profile?.full_name || 'Usuario'}</span>
                <span className="text-[10px] text-white/40 block truncate uppercase tracking-wider">{profile?.role || 'Profesional'}</span>
              </div>
            )}
            <button 
              onClick={handleLogout}
              title="Cerrar sesión"
              className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-600 hover:text-white transition-all cursor-pointer shrink-0"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Area del Contenido Principal */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <header className="h-16 border-b border-slate-200 flex items-center justify-between px-4 md:px-6 bg-white shrink-0 sticky top-0 z-20">
          <div className="flex items-center gap-2.5 min-w-0">
            <button 
              onClick={() => setIsMobileMenuOpen(true)} 
              className="p-2 -ml-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 md:hidden cursor-pointer shrink-0"
            >
              <Menu className="h-5 w-5" />
            </button>
            <Building className="h-5 w-5 text-[#468DFF] shrink-0" />
            <h1 className="font-outfit text-base md:text-lg font-bold text-slate-900 truncate leading-none">
              Clientes / Empresas
            </h1>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs font-semibold text-slate-500 bg-slate-50 py-1.5 px-3 rounded-xl border border-slate-150 hidden sm:inline-block">
              {tenant?.name || 'Cargando...'}
            </span>
            <span className="px-2.5 py-1.5 rounded-lg bg-[#468DFF]/15 border border-[#468DFF]/25 text-[#468DFF] text-[10px] font-bold uppercase tracking-wider">
              {tenant?.plan_id ? (tenant.plan_id.toLowerCase() === 'libre' ? 'Plan Libre' : tenant.plan_id.toLowerCase().startsWith('standard') ? 'Plan Standard' : tenant.plan_id.toLowerCase().startsWith('basic') ? 'Plan Basic' : `Plan ${tenant.plan_id}`) : 'Plan Pro'}
            </span>
          </div>
        </header>

        <div className="p-6 md:p-8 space-y-8 max-w-[95%] mx-auto w-full">
          
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
              <Loader2 className="h-10 w-10 animate-spin text-[#468DFF]" />
              <p className="text-sm text-slate-500 font-medium">Cargando información comercial...</p>
            </div>
          ) : view === 'list' ? (
            
            // ==========================================
            // VISTA: LISTADO DE EMPRESAS (TABLA)
            // ==========================================
            <div className="space-y-6">
              
              {empresas.length === 0 ? (
                <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center space-y-4 shadow-sm">
                  <div className="p-3 bg-blue-50 text-[#468DFF] rounded-full w-12 h-12 flex items-center justify-center mx-auto">
                    <Building className="h-6 w-6" />
                  </div>
                  <h4 className="font-outfit text-base font-bold text-slate-800">No hay clientes registrados</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                    Comienza a cargar los datos de tus clientes para realizar diagnósticos y planes de adecuación según Decreto 351/79.
                  </p>
                  {canCargar && (
                    <button
                      onClick={handleAddNew}
                      className="py-2 px-4 rounded-xl bg-[#468DFF] hover:bg-[#0511F2] text-white text-xs font-bold transition-all inline-block shadow-sm"
                    >
                      Cargar mi primer cliente
                    </button>
                  )}
                </div>
              ) : (
                <>
                  {/* Toolbar y Filtros Unificados */}
                  <div className="bg-white rounded-2xl border border-slate-150 p-3 shadow-sm space-y-3">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      {/* Espaciador para empujar el buscador y botón a la derecha en desktop */}
                      <div className="hidden md:block flex-1"></div>

                      {/* Buscador y Botón agrupados */}
                      <div className="flex flex-col md:flex-row md:items-center gap-3 w-full md:w-auto">
                        <div className="relative w-full md:w-72">
                          <span className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none">
                            <Search className="h-3.5 w-3.5" />
                          </span>
                          <input
                            type="text"
                            placeholder="Buscar por razón social, nombre comercial o CUIT..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-1.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all text-slate-700 placeholder-slate-400"
                          />
                        </div>

                        {/* Botón de Agregar */}
                        {canCargar && (
                          <button
                            onClick={handleAddNew}
                            className="px-3.5 py-1.5 bg-[#468DFF] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-[#0511F2] transition-all cursor-pointer shadow-md shadow-[#468DFF]/10 shrink-0 w-full md:w-auto"
                          >
                            <PlusCircle className="h-3.5 w-3.5" />
                            Agregar nueva empresa
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Filtros rápidos */}
                    <div className="border-t border-slate-100 pt-2 space-y-2">
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
                        {(filterEmpresa || searchQuery) && (
                          <button
                            onClick={() => {
                              setFilterEmpresa('');
                              setSearchQuery('');
                            }}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[10px] font-semibold cursor-pointer transition-all border border-slate-200"
                          >
                            Limpiar filtros
                          </button>
                        )}
                      </div>

                      {showFilters && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-1 animate-fade-in">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Cliente</label>
                            <select
                              value={filterEmpresa}
                              onChange={(e) => setFilterEmpresa(e.target.value)}
                              className="border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-600 focus:outline-none focus:border-[#468DFF] text-xs w-full cursor-pointer"
                            >
                              <option value="">Todos los clientes</option>
                              {empresas.map(e => (
                                <option key={e.id} value={e.id}>{e.razon_social}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Tabla */}
                  <div className="bg-white border border-slate-150 rounded-2xl shadow-sm overflow-hidden">
                    <div className="overflow-auto" style={{ maxHeight: showFilters ? 'calc(100vh - 310px)' : 'calc(100vh - 240px)' }}>
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-150 text-xs font-bold text-slate-400 uppercase tracking-wider font-outfit">
                            <th 
                              className="px-6 py-4 cursor-pointer hover:text-slate-700 select-none transition-colors w-[30%] sticky top-0 z-10 bg-slate-50 border-b border-slate-150"
                              onClick={() => handleSort('razon_social')}
                            >
                              <div className="flex items-center gap-1">
                                Razón Social
                                {sortField === 'razon_social' && (sortOrder === 'asc' ? ' ▲' : ' ▼')}
                              </div>
                            </th>
                            <th 
                              className="px-6 py-4 cursor-pointer hover:text-slate-700 select-none transition-colors w-[28%] sticky top-0 z-10 bg-slate-50 border-b border-slate-150"
                              onClick={() => handleSort('nombre_comercial')}
                            >
                              <div className="flex items-center gap-1">
                                Nombre Comercial
                                {sortField === 'nombre_comercial' && (sortOrder === 'asc' ? ' ▲' : ' ▼')}
                              </div>
                            </th>
                            <th 
                              className="px-6 py-4 cursor-pointer hover:text-slate-700 select-none transition-colors w-[18%] sticky top-0 z-10 bg-slate-50 border-b border-slate-150"
                              onClick={() => handleSort('cuit')}
                            >
                              <div className="flex items-center gap-1">
                                C.U.I.T.
                                {sortField === 'cuit' && (sortOrder === 'asc' ? ' ▲' : ' ▼')}
                              </div>
                            </th>
                            <th className="px-6 py-4 text-center w-[12%] sticky top-0 z-10 bg-slate-50 border-b border-slate-150">Establecimientos</th>
                            {(canEditar || canEliminar) && <th className="px-6 py-4 text-right w-[12%] sticky top-0 z-10 bg-slate-50 border-b border-slate-150">Acciones</th>}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                          {sortedEmpresas.length === 0 ? (
                            <tr>
                              <td colSpan={(canEditar || canEliminar) ? 5 : 4} className="px-6 py-10 text-center text-slate-400 font-semibold">
                                No se encontraron clientes con los filtros aplicados.
                              </td>
                            </tr>
                          ) : (
                            sortedEmpresas.map((emp) => (
                              <tr 
                                key={emp.id} 
                                onClick={() => { setIsReadOnlyView(true); handleEdit(emp.id); }}
                                className="hover:bg-slate-50/50 cursor-pointer transition-colors"
                              >
                                <td className="px-6 py-4">
                                  <span className="font-semibold text-slate-900 block truncate max-w-[240px]" title={emp.razon_social}>
                                    {emp.razon_social}
                                  </span>
                                </td>
                                <td className="px-6 py-4">
                                  <span className="text-slate-600 block truncate max-w-[220px]" title={emp.nombre_comercial || 'Sin nombre comercial'}>
                                    {emp.nombre_comercial || <span className="text-slate-400 italic font-normal">No especificado</span>}
                                  </span>
                                </td>
                                <td className="px-6 py-4 font-mono text-slate-500">{emp.cuit}</td>
                                <td className="px-6 py-4 text-center">
                                  <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold">
                                    {emp.establecimientos_count}
                                  </span>
                                </td>
                                {(canEditar || canEliminar) && (
                                  <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                                    <div className="flex items-center justify-end gap-2">
                                      {canEditar ? (
                                        <button
                                          onClick={() => { setIsReadOnlyView(false); handleEdit(emp.id); }}
                                          className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-600 transition-all cursor-pointer inline-flex items-center justify-center shadow-sm"
                                          title="Editar ficha de cliente"
                                        >
                                          <Edit className="h-4.5 w-4.5" />
                                        </button>
                                      ) : (
                                        <button
                                          onClick={() => { setIsReadOnlyView(true); handleEdit(emp.id); }}
                                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-all cursor-pointer inline-flex items-center justify-center shadow-sm"
                                          title="Ver Detalle"
                                        >
                                          <Eye className="h-4.5 w-4.5" />
                                        </button>
                                      )}
                                      {canEliminar && (
                                        <button
                                          onClick={() => handleDelete(emp.id, emp.razon_social)}
                                          className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition-all cursor-pointer inline-flex items-center justify-center shadow-sm"
                                          title="Borrar cliente"
                                        >
                                          <Trash2 className="h-4.5 w-4.5" />
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                )}
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>

          ) : (

            // ==========================================
            // VISTA: FORMULARIO DE CARGA / EDICIÓN (TABS)
            // ==========================================
            <div className="bg-white rounded-2xl border border-slate-150 shadow-sm overflow-hidden flex flex-col max-h-[85vh] animate-fade-in">
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
                    {editingId ? 'Editar Cliente' : 'Agregar Cliente'}
                  </span>
                </div>
                <button 
                  type="button" 
                  onClick={handleExitForm} 
                  className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-200 cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSaveAll} className="p-6 md:p-8 space-y-6 overflow-y-auto flex-1 scrollbar-thin">

              {/* Encabezado Ficha */}
              <div className="bg-white border border-slate-150 rounded-2xl p-6 shadow-sm space-y-4">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-blue-50 text-[#468DFF] rounded-xl shrink-0">
                    <Building className="h-6 w-6" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-outfit text-lg font-bold text-slate-800">
                      {razonSocial || 'Razón Social de la Empresa'}
                    </h3>
                    <p className="text-xs text-slate-500">
                      CUIT: {cuit || 'Sin completar'} {nombreComercial && `| Nombre Comercial: ${nombreComercial}`}
                    </p>
                  </div>
                </div>

                {/* Navegación por Pestañas */}
                <div className="flex flex-wrap gap-1 border-t border-slate-100 pt-4">
                  {[
                    { id: 'general', label: 'Datos Generales' },
                    { id: 'establecimientos', label: `Establecimientos (${establecimientos.length})` },
                    { id: 'credenciales', label: 'Plataformas & Credenciales' },
                    ...(editingId ? [{ id: 'portal', label: 'Portal de Cliente' }] : [])
                  ].map(tab => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        activeTab === tab.id 
                          ? 'bg-[#468DFF]/10 text-[#468DFF] border border-[#468DFF]/20' 
                          : 'text-slate-500 hover:bg-slate-50 border border-transparent'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* CONTENIDOS DE LAS PESTAÑAS */}
              <fieldset disabled={!canEdit} className="space-y-6">

                {/* TAB 1: DATOS GENERALES Y CONTACTOS */}
                {activeTab === 'general' && (
                  <div className="space-y-6">
                    <div className="bg-white border border-slate-150 rounded-2xl p-6 shadow-sm space-y-4">
                      <h4 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">Identidad de la empresa</h4>
                      
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-600 block">Razón Social <span className="text-[#468DFF]">*</span></label>
                          <input
                            type="text"
                            value={razonSocial}
                            onChange={(e) => setRazonSocial(e.target.value)}
                            required
                            placeholder="Ej: Acme S.R.L."
                            className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-600 block">Nombre Comercial</label>
                          <input
                            type="text"
                            value={nombreComercial}
                            onChange={(e) => setNombreComercial(e.target.value)}
                            placeholder="Ej: Acme Solutions"
                            className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all"
                          />
                        </div>

                        <div className="space-y-1 md:col-span-2">
                          <label className="text-xs font-bold text-slate-600 block">C.U.I.T. <span className="text-[#468DFF]">*</span></label>
                          <input
                            type="text"
                            value={cuit}
                            onChange={handleCuitChange}
                            required
                            placeholder="Ej: 30712345678 (11 números sin puntos ni guiones)"
                            className={`w-full border ${cuitError ? 'border-red-400 focus:border-red-500' : 'border-slate-200 focus:border-[#468DFF]'} rounded-xl px-3.5 py-2 text-sm focus:outline-none bg-slate-50/50 transition-all`}
                          />
                          {cuitError && <p className="text-[10px] text-red-500 font-bold mt-1">{cuitError}</p>}
                        </div>

                        {/* Actividad Económica (CIIU) dentro de Identidad de la empresa */}
                        <div className="space-y-3 pt-4 border-t border-slate-100 relative md:col-span-2">
                          <label className="text-xs font-bold text-slate-600 block">Actividad Económica (CIIU)</label>
                          <p className="text-[10px] text-slate-500">Busca y agrega las actividades económicas de la empresa.</p>
                          <input
                            type="text"
                            placeholder="Buscar por código o descripción (Ej: arroz, 11111)..."
                            value={searchTermCiiu}
                            onChange={(e) => setSearchTermCiiu(e.target.value)}
                            className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all"
                          />

                          {/* Dropdown de Resultados de Búsqueda */}
                          {ciiuResults.length > 0 && (
                            <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-30 divide-y divide-slate-100 max-h-60 overflow-y-auto">
                              {ciiuResults.map((result) => (
                                <button
                                  key={result.codigo}
                                  type="button"
                                  onClick={() => {
                                    if (!selectedCiiu.some(x => x.codigo === result.codigo)) {
                                      setSelectedCiiu([...selectedCiiu, result]);
                                    }
                                    setSearchTermCiiu('');
                                    setCiiuResults([]);
                                  }}
                                  className="w-full text-left px-4 py-3 text-xs hover:bg-[#468DFF]/5 text-slate-700 flex items-start gap-2 transition-colors cursor-pointer"
                                >
                                  <span className="font-bold text-[#468DFF] shrink-0 font-mono">{result.codigo}</span>
                                  <span className="truncate">{result.descripcion}</span>
                                </button>
                              ))}
                            </div>
                          )}

                          {/* Listado de Actividades Seleccionadas */}
                          <div className="space-y-2 mt-3">
                            <span className="text-[11px] font-bold text-slate-600 block">Actividades de la Empresa ({selectedCiiu.length})</span>
                            {selectedCiiu.length === 0 ? (
                              <p className="text-[10px] text-slate-400 italic">No has seleccionado ninguna actividad.</p>
                            ) : (
                              <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                                {selectedCiiu.map((act) => (
                                  <div key={act.codigo} className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs">
                                    <div className="flex gap-2 items-start min-w-0 pr-2">
                                      <span className="font-bold text-[#468DFF] font-mono shrink-0">{act.codigo}</span>
                                      <span className="truncate text-slate-700 font-semibold">{act.descripcion}</span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => setSelectedCiiu(selectedCiiu.filter(x => x.codigo !== act.codigo))}
                                      className="text-[9px] text-red-500 hover:text-red-700 font-bold px-2.5 py-1 rounded-lg border border-red-200 bg-white hover:bg-red-50/20 transition-all cursor-pointer shrink-0"
                                    >
                                      Quitar
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                      </div>
                    </div>

                    {/* CONTACTOS (TELEFONOS, CORREOS, FACTURACION) */}
                    <div className="bg-white border border-slate-150 rounded-2xl p-6 shadow-sm space-y-6">
                      <div className="space-y-1">
                        <h4 className="text-sm font-bold text-slate-900">Contactos y Administración</h4>
                        <p className="text-[10px] text-slate-500">Agrega múltiples contactos para teléfonos, correos y notificaciones de cobro.</p>
                      </div>

                      {/* Telefonos sub-form */}
                      <div className="space-y-3 pt-3 border-t border-slate-100">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-[#468DFF]" /> Teléfonos de Contacto</span>
                          <button
                            type="button"
                            onClick={() => setTelefonos([...telefonos, { nombre: '', cargo: '', valor: '' }])}
                            className="text-[10px] text-[#468DFF] hover:text-[#0511F2] font-bold flex items-center gap-1"
                          >
                            <Plus className="h-3 w-3" /> Agregar Teléfono
                          </button>
                        </div>
                        {telefonos.map((tel, idx) => (
                          <div key={idx} className="grid grid-cols-1 md:grid-cols-3 gap-2 items-center bg-slate-50/50 p-3 rounded-2xl border border-slate-150 shadow-sm">
                            <input
                              type="text"
                              placeholder="Nombre y Apellido"
                              value={tel.nombre}
                              onChange={(e) => {
                                const copy = [...telefonos];
                                copy[idx].nombre = e.target.value;
                                setTelefonos(copy);
                              }}
                              className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-white transition-all text-slate-700"
                            />
                            <input
                              type="text"
                              placeholder="Cargo / Puesto"
                              value={tel.cargo}
                              onChange={(e) => {
                                const copy = [...telefonos];
                                copy[idx].cargo = e.target.value;
                                setTelefonos(copy);
                              }}
                              className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-white transition-all text-slate-700"
                            />
                            <div className="flex gap-2 items-center">
                              <input
                                type="text"
                                placeholder="Teléfono"
                                value={tel.valor}
                                onChange={(e) => {
                                  const copy = [...telefonos];
                                  copy[idx].valor = e.target.value;
                                  setTelefonos(copy);
                                }}
                                className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-white transition-all text-slate-700 flex-1"
                              />
                              <button
                                type="button"
                                onClick={() => setTelefonos(telefonos.filter((_, i) => i !== idx))}
                                className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition-all cursor-pointer inline-flex items-center justify-center shadow-sm"
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Correos sub-form */}
                      <div className="space-y-3 pt-3 border-t border-slate-100">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5"><Mail className="h-3.5 w-3.5 text-[#468DFF]" /> Correos Electrónicos</span>
                          <button
                            type="button"
                            onClick={() => setCorreos([...correos, { nombre: '', cargo: '', valor: '' }])}
                            className="text-[10px] text-[#468DFF] hover:text-[#0511F2] font-bold flex items-center gap-1"
                          >
                            <Plus className="h-3 w-3" /> Agregar Correo
                          </button>
                        </div>
                        {correos.map((cor, idx) => (
                          <div key={idx} className="grid grid-cols-1 md:grid-cols-3 gap-2 items-center bg-slate-50/50 p-3 rounded-2xl border border-slate-150 shadow-sm">
                            <input
                              type="text"
                              placeholder="Nombre y Apellido"
                              value={cor.nombre}
                              onChange={(e) => {
                                const copy = [...correos];
                                copy[idx].nombre = e.target.value;
                                setCorreos(copy);
                              }}
                              className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-white transition-all text-slate-700"
                            />
                            <input
                              type="text"
                              placeholder="Cargo / Puesto"
                              value={cor.cargo}
                              onChange={(e) => {
                                const copy = [...correos];
                                copy[idx].cargo = e.target.value;
                                setCorreos(copy);
                              }}
                              className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-white transition-all text-slate-700"
                            />
                            <div className="flex gap-2 items-center">
                              <input
                                type="email"
                                placeholder="Correo"
                                value={cor.valor}
                                onChange={(e) => {
                                  const copy = [...correos];
                                  copy[idx].valor = e.target.value;
                                  setCorreos(copy);
                                }}
                                className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-white transition-all text-slate-700 flex-1"
                              />
                              <button
                                type="button"
                                onClick={() => setCorreos(correos.filter((_, i) => i !== idx))}
                                className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition-all cursor-pointer inline-flex items-center justify-center shadow-sm"
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Facturacion sub-form */}
                      <div className="space-y-3 pt-3 border-t border-slate-100">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5"><FileText className="h-3.5 w-3.5 text-[#468DFF]" /> Correos de Facturación</span>
                          <button
                            type="button"
                            onClick={() => setFacturacion([...facturacion, { nombre: '', cargo: '', valor: '' }])}
                            className="text-[10px] text-[#468DFF] hover:text-[#0511F2] font-bold flex items-center gap-1"
                          >
                            <Plus className="h-3 w-3" /> Agregar correo
                          </button>
                        </div>
                        {facturacion.map((fac, idx) => (
                          <div key={idx} className="grid grid-cols-1 md:grid-cols-3 gap-2 items-center bg-slate-50/50 p-3 rounded-2xl border border-slate-150 shadow-sm">
                            <input
                              type="text"
                              placeholder="Nombre y Apellido"
                              value={fac.nombre}
                              onChange={(e) => {
                                const copy = [...facturacion];
                                copy[idx].nombre = e.target.value;
                                setFacturacion(copy);
                              }}
                              className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-white transition-all text-slate-700"
                            />
                            <input
                              type="text"
                              placeholder="Cargo / Puesto"
                              value={fac.cargo}
                              onChange={(e) => {
                                const copy = [...facturacion];
                                copy[idx].cargo = e.target.value;
                                setFacturacion(copy);
                              }}
                              className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-white transition-all text-slate-700"
                            />
                            <div className="flex gap-2 items-center">
                              <input
                                type="email"
                                placeholder="Correo de Facturación"
                                value={fac.valor}
                                onChange={(e) => {
                                  const copy = [...facturacion];
                                  copy[idx].valor = e.target.value;
                                  setFacturacion(copy);
                                }}
                                className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-white transition-all text-slate-700 flex-1"
                              />
                              <button
                                type="button"
                                onClick={() => setFacturacion(facturacion.filter((_, i) => i !== idx))}
                                className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition-all cursor-pointer inline-flex items-center justify-center shadow-sm"
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}



                {/* TAB 3: ESTABLECIMIENTOS */}
                {activeTab === 'establecimientos' && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center bg-white border border-slate-150 rounded-2xl p-5 shadow-sm">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">Listado de Establecimientos</h4>
                        <p className="text-[10px] text-slate-500 mt-0.5">Una empresa puede constar de múltiples sedes, fábricas u oficinas.</p>
                      </div>
                      <button
                        type="button"
                        onClick={handleAddEstablecimiento}
                        className="py-2 px-3 rounded-xl border border-[#468DFF]/40 hover:bg-[#468DFF] hover:text-white text-center text-[#468DFF] font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-sm bg-white hover:border-[#468DFF] active:scale-[0.98]"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Agregar establecimiento
                      </button>
                    </div>

                    {establecimientos.length === 0 ? (
                      <div className="bg-white border border-slate-150 rounded-2xl p-10 text-center space-y-3 shadow-sm">
                        <MapPin className="h-6 w-6 text-slate-400 mx-auto" />
                        <h5 className="font-bold text-slate-800 text-xs">No hay establecimientos cargados</h5>
                        <p className="text-[10px] text-slate-500 max-w-xs mx-auto">
                          Debes agregar al menos un establecimiento para poder calcular las horas de profesionales requeridas de este cliente.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-8">
                        {establecimientos.map((est, idx) => (
                          <div key={idx} className="bg-white border border-slate-150 rounded-2xl p-6 shadow-sm space-y-6 relative hover:border-[#468DFF]/20 transition-all">
                            
                            {/* Header Establecimiento */}
                            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                              <span className="text-[10px] font-bold text-[#468DFF] bg-[#468DFF]/10 border border-[#468DFF]/15 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                                Establecimiento #{idx + 1}
                              </span>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const copy = [...establecimientos];
                                    copy[idx].isCollapsed = !copy[idx].isCollapsed;
                                    setEstablecimientos(copy);
                                  }}
                                  className="text-[10px] text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 font-bold px-2.5 py-1 rounded-lg border border-slate-200 transition-all cursor-pointer flex items-center gap-1 shadow-sm"
                                  title={est.isCollapsed ? "Expandir todos los campos" : "Contraer detalles"}
                                >
                                  {est.isCollapsed ? (
                                    <>
                                      <ChevronDown className="h-3 w-3" />
                                      Expandir
                                    </>
                                  ) : (
                                    <>
                                      <ChevronUp className="h-3 w-3" />
                                      Contraer
                                    </>
                                  )}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveEstablecimiento(idx)}
                                  className="text-[10px] text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 font-bold px-2.5 py-1 rounded-lg border border-red-200 transition-all cursor-pointer flex items-center gap-1 shadow-sm"
                                >
                                  <Trash2 className="h-3 w-3" /> Quitar
                                </button>
                              </div>
                            </div>

                            {/* Datos Básicos y Geografía */}
                            <div className="grid md:grid-cols-3 gap-4">
                              <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-600 block">Denominación</label>
                                <input
                                  type="text"
                                  placeholder="Ej: Planta Pilar, Oficinas Centrales"
                                  value={est.denominacion}
                                  onChange={(e) => {
                                    const copy = [...establecimientos];
                                    copy[idx].denominacion = e.target.value;
                                    setEstablecimientos(copy);
                                  }}
                                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all text-slate-700"
                                />
                              </div>

                              <div className="space-y-1 md:col-span-2">
                                <label className="text-xs font-bold text-slate-600 block">Dirección <span className="text-[#468DFF]">*</span></label>
                                <input
                                  type="text"
                                  placeholder="Ej: Av. del Libertador 450"
                                  value={est.direccion}
                                  onChange={(e) => {
                                    const copy = [...establecimientos];
                                    copy[idx].direccion = e.target.value;
                                    setEstablecimientos(copy);
                                  }}
                                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all text-slate-700"
                                />
                              </div>
                            </div>

                            {!est.isCollapsed && (
                              <>
                                <div className="grid md:grid-cols-3 gap-4">

                              {/* Geografía en cascada */}
                              <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-600 block">Provincia <span className="text-[#468DFF]">*</span></label>
                                <select
                                  value={est.provincia}
                                  onChange={(e) => handleEstProvinciaChange(idx, e.target.value)}
                                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all text-slate-700 cursor-pointer"
                                >
                                  <option value="" disabled>Selecciona provincia</option>
                                  {PROVINCIAS_ARGENTINAS.map(p => (
                                    <option key={p} value={p}>{p}</option>
                                  ))}
                                </select>
                              </div>

                              <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-600 block">Partido <span className="text-[#468DFF]">*</span></label>
                                <select
                                  value={est.partido}
                                  onChange={(e) => handleEstPartidoChange(idx, e.target.value)}
                                  disabled={!est.provincia || est.partidosList.length === 0}
                                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all text-slate-700 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  <option value="" disabled>{!est.provincia ? 'Primero elige provincia' : 'Selecciona partido'}</option>
                                  {est.partidosList.map(p => (
                                    <option key={p} value={p}>{p}</option>
                                  ))}
                                </select>
                              </div>

                              <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-600 block">Localidad / Barrio</label>
                                <select
                                  value={est.localidad_barrio}
                                  onChange={(e) => {
                                    const copy = [...establecimientos];
                                    copy[idx].localidad_barrio = e.target.value;
                                    setEstablecimientos(copy);
                                  }}
                                  disabled={!est.partido}
                                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all text-slate-700 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  <option value="" disabled>{!est.partido ? 'Primero elige partido' : 'Selecciona localidad'}</option>
                                  {est.localidadesList.map(l => (
                                    <option key={l} value={l}>{l}</option>
                                  ))}
                                </select>
                              </div>

                              <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-600 block">Código Postal</label>
                                <input
                                  type="text"
                                  placeholder="Ej: 1629"
                                  value={est.cp}
                                  onChange={(e) => {
                                    const copy = [...establecimientos];
                                    copy[idx].cp = e.target.value;
                                    setEstablecimientos(copy);
                                  }}
                                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all text-slate-700"
                                />
                              </div>

                              <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-600 block">Sup. Total [m²]</label>
                                <input
                                  type="text"
                                  placeholder="Ej: 5000"
                                  value={est.superficie_total}
                                  onChange={(e) => {
                                    const copy = [...establecimientos];
                                    copy[idx].superficie_total = e.target.value;
                                    setEstablecimientos(copy);
                                  }}
                                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all text-slate-700"
                                />
                              </div>

                              <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-600 block">Sup. Cubierta [m²]</label>
                                <input
                                  type="text"
                                  placeholder="Ej: 3500"
                                  value={est.superficie_cubierta}
                                  onChange={(e) => {
                                    const copy = [...establecimientos];
                                    copy[idx].superficie_cubierta = e.target.value;
                                    setEstablecimientos(copy);
                                  }}
                                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all text-slate-700"
                                />
                              </div>

                              <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-600 block">Sup. de Piso [m²]</label>
                                <input
                                  type="text"
                                  placeholder="Ej: 3500"
                                  value={est.superficie_piso}
                                  onChange={(e) => {
                                    const copy = [...establecimientos];
                                    copy[idx].superficie_piso = e.target.value;
                                    setEstablecimientos(copy);
                                  }}
                                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all text-slate-700"
                                />
                              </div>

                              <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-600 block">Cantidad de plantas</label>
                                <input
                                  type="text"
                                  placeholder="Ej: 2"
                                  value={est.cantidad_plantas}
                                  onChange={(e) => {
                                    const copy = [...establecimientos];
                                    copy[idx].cantidad_plantas = e.target.value;
                                    setEstablecimientos(copy);
                                  }}
                                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all text-slate-700"
                                />
                              </div>

                              <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-600 block">Horario de funcionamiento</label>
                                <input
                                  type="text"
                                  placeholder="Ej: L a V de 08:00 a 17:00"
                                  value={est.horario_funcionamiento}
                                  onChange={(e) => {
                                    const copy = [...establecimientos];
                                    copy[idx].horario_funcionamiento = e.target.value;
                                    setEstablecimientos(copy);
                                  }}
                                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all text-slate-700"
                                />
                              </div>
                            </div>

                            {/* Dotación y Trabajadores Equivalentes */}
                            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-150 space-y-4">
                              <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider block">Dotación de trabajadores</span>
                              <div className="grid md:grid-cols-3 gap-4">
                                <div className="space-y-1">
                                  <label className="text-[11px] font-bold text-slate-600 block">Trabajadores Administrativos</label>
                                  <input
                                    type="number"
                                    min="0"
                                    value={est.trabajadores_administrativos}
                                    onChange={(e) => handleWorkerChange(idx, 'trabajadores_administrativos', e.target.value)}
                                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-white transition-all text-slate-700"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[11px] font-bold text-slate-600 block">Trabajadores Productivos</label>
                                  <input
                                    type="number"
                                    min="0"
                                    value={est.trabajadores_productivos}
                                    onChange={(e) => handleWorkerChange(idx, 'trabajadores_productivos', e.target.value)}
                                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-white transition-all text-slate-700"
                                  />
                                </div>
                                <div className="space-y-1 bg-[#468DFF]/5 p-3 rounded-2xl border border-[#468DFF]/15 text-center flex flex-col justify-center">
                                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Trabajadores Equivalentes</span>
                                  <span className="font-outfit text-xl font-extrabold text-[#468DFF] block mt-0.5">
                                    {est.trabajadores_equivalentes}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* RIESGOS DE DECRETO 351/79 */}
                            <div className="space-y-3">
                              <div className="space-y-1">
                                <span className="text-xs font-bold text-slate-800 block">Riesgos de la actividad según Decreto Nº 351/79</span>
                                <span className="text-[10px] text-slate-500 block">Indica los capítulos de cumplimiento obligatorio aplicables al establecimiento.</span>
                              </div>
                              
                              <div className="grid md:grid-cols-2 gap-2 max-h-60 overflow-y-auto p-4 border border-slate-150 rounded-2xl bg-slate-50/50">
                                {DECRETO_CHAPTERS.map((cap) => (
                                  <label key={cap.id} className="flex items-start gap-2.5 p-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-150 text-[11px] font-semibold text-slate-700 transition-all cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={!!est.capitulos_decreto[cap.id]}
                                      onChange={() => handleChapterCheckboxChange(idx, cap.id)}
                                      className="h-3.5 w-3.5 mt-0.5 rounded text-[#468DFF] border-slate-300 focus:ring-[#468DFF]"
                                    />
                                    <span>{cap.name}</span>
                                  </label>
                                ))}
                              </div>
                            </div>

                            {/* CÁLCULO DE HORAS PROFESIONALES RESULTANTES */}
                            <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50/30 border border-blue-500/15 flex flex-col md:flex-row justify-between items-center gap-4">
                              <div className="space-y-1 text-center md:text-left">
                                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 justify-center md:justify-start">
                                  <Info className="h-4 w-4 text-[#468DFF]" /> Horas-Profesional Mensuales
                                </span>
                                <p className="text-[10px] text-slate-500 max-w-md">
                                  Cálculo automático de la categoría y asignación obligatoria según trabajadores equivalentes y capítulos del Anexo I del Decreto Nº 351/79.
                                </p>
                              </div>
                              <div className="flex gap-4">
                                <div className="text-center bg-white px-5 py-2.5 rounded-2xl border border-slate-150 shadow-sm shrink-0 min-w-[100px]">
                                  <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wider">Categoría</span>
                                  <span className="font-outfit text-xl font-extrabold text-slate-800 block mt-0.5">
                                    {est.capitulos_decreto.cap_8 || est.capitulos_decreto.cap_9 || est.capitulos_decreto.cap_10 
                                      ? 'C' 
                                      : (est.capitulos_decreto.cap_7 || est.capitulos_decreto.cap_13 || est.capitulos_decreto.cap_15 || est.capitulos_decreto.cap_16 || est.capitulos_decreto.cap_17 
                                        ? 'B' 
                                        : 'A')}
                                  </span>
                                </div>
                                <div className="text-center bg-[#468DFF] text-white px-5 py-2.5 rounded-2xl border border-[#468DFF] shadow-sm shrink-0 min-w-[120px]">
                                  <span className="text-[9px] text-white/70 font-bold block uppercase tracking-wider">Horas Asignadas</span>
                                  <span className="font-outfit text-xl font-extrabold block mt-0.5">
                                    {est.horas_profesional} hs/mes
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* MÁQUINAS, EQUIPOS Y HERRAMIENTAS */}
                            <div className="space-y-4 pt-4 border-t border-slate-100">
                              <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Máquinas, Equipos y Herramientas</h5>
                              
                              {[
                                { key: 'maquinas_fijas', label: 'Máquinas Fijas', options: MAQUINAS_FIJAS_OPTS, customKey: 'customFijas', setCustomKey: (val) => { const copy = [...establecimientos]; copy[idx].customFijas = val; setEstablecimientos(copy); } },
                                { key: 'maquinas_moviles', label: 'Máquinas Móviles / Equipos de Trabajo', options: MAQUINAS_MOVILES_OPTS, customKey: 'customMoviles', setCustomKey: (val) => { const copy = [...establecimientos]; copy[idx].customMoviles = val; setEstablecimientos(copy); } },
                                { key: 'herramientas_electricas', label: 'Herramientas Eléctricas Portátiles', options: HERRAMIENTAS_PORTATILES_OPTS, customKey: 'customPortatiles', setCustomKey: (val) => { const copy = [...establecimientos]; copy[idx].customPortatiles = val; setEstablecimientos(copy); } },
                                { key: 'aparatos_presion', label: 'Aparatos Sometidos a Presión (ASP)', options: APARATOS_PRESION_OPTS, customKey: 'customPresion', setCustomKey: (val) => { const copy = [...establecimientos]; copy[idx].customPresion = val; setEstablecimientos(copy); } },
                                { key: 'equipos_termicos', label: 'Equipos Térmicos (NO ASP)', options: EQUIPOS_TERMICOS_OPTS, customKey: 'customTermicos', setCustomKey: (val) => { const copy = [...establecimientos]; copy[idx].customTermicos = val; setEstablecimientos(copy); } },
                                { key: 'equipos_elevacion', label: 'Equipos de Elevación de Personas', options: EQUIPOS_ELEVACION_OPTS, customKey: 'customElevacion', setCustomKey: (val) => { const copy = [...establecimientos]; copy[idx].customElevacion = val; setEstablecimientos(copy); } },
                                { key: 'equipos_izaje', label: 'Equipos de Izaje de Cargas', options: EQUIPOS_IZAJE_OPTS, customKey: 'customIzaje', setCustomKey: (val) => { const copy = [...establecimientos]; copy[idx].customIzaje = val; setEstablecimientos(copy); } }
                              ].map((item) => (
                                <div key={item.key} className="space-y-2 p-4 rounded-2xl border border-slate-150 bg-slate-50/20">
                                  <span className="text-[11px] font-bold text-slate-700 block">{item.label}</span>
                                  
                                  {/* Listado de Opciones Fijas */}
                                  <div className="flex flex-wrap gap-1.5">
                                    {item.options.map(opt => {
                                      const isSelected = (est[item.key] || []).includes(opt);
                                      return (
                                        <button
                                          key={opt}
                                          type="button"
                                          onClick={() => handleMachineOptionToggle(idx, item.key, opt)}
                                          className={`px-3 py-1.5 rounded-xl text-[10px] font-bold border transition-all cursor-pointer ${
                                            isSelected 
                                              ? 'bg-slate-800 text-white border-slate-800' 
                                              : 'bg-white text-slate-600 border-slate-150 hover:bg-slate-50'
                                          }`}
                                        >
                                          {opt}
                                        </button>
                                      );
                                    })}
                                  </div>

                                  {/* Mostrar Otras custom agregadas */}
                                  { (est[item.key] || []).filter(o => !item.options.includes(o)).length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 border-t border-dashed border-slate-200 pt-2 mt-2">
                                      { (est[item.key] || []).filter(o => !item.options.includes(o)).map(opt => (
                                        <div key={opt} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 text-[#468DFF] text-[10px] font-bold">
                                          <span>{opt}</span>
                                          <button
                                            type="button"
                                            onClick={() => handleMachineOptionToggle(idx, item.key, opt)}
                                            className="text-red-500 font-bold hover:text-red-700"
                                          >
                                            ×
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  {/* Input para agregar "otra" personalizada */}
                                  <div className="flex gap-2 items-center pt-2">
                                    <input
                                      type="text"
                                      placeholder="Agregar otra..."
                                      value={est[item.customKey] || ''}
                                      onChange={(e) => item.setCustomKey(e.target.value)}
                                      className="flex-1 text-[10px] bg-white border border-slate-200 rounded-xl px-3 py-1.5 outline-none focus:border-[#468DFF] focus:bg-slate-50/50 transition-all text-slate-700"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleAddCustomMachine(idx, item.key, est[item.customKey] || '', () => item.setCustomKey(''))}
                                      className="py-1.5 px-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-[10px] font-bold text-slate-700 transition-all cursor-pointer"
                                    >
                                      Añadir
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>

                            </>
                          )}

                          </div>
                        ))}
                      </div>
                    )}

                    {/* Observaciones en Establecimientos */}
                    <div className="bg-white border border-slate-150 rounded-2xl p-6 shadow-sm space-y-4 mt-6">
                      <h4 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">Observaciones Generales</h4>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-600 block">Notas / Observaciones sobre la empresa</label>
                        <textarea
                          rows="4"
                          value={observaciones}
                          onChange={(e) => setObservaciones(e.target.value)}
                          placeholder="Escribe comentarios, deudas técnicas, particularidades operativas, etc..."
                          className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all text-slate-700 resize-y"
                        />
                      </div>
                    </div>

                  </div>
                )}

                {/* TAB 4: PLATAFORMAS & CREDENCIALES */}
                {activeTab === 'credenciales' && (
                  <div className="space-y-6">
                    <div className="bg-white border border-slate-150 rounded-2xl p-6 shadow-sm space-y-4">
                      <h4 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">Aseguradora de Riesgos del Trabajo (ART)</h4>
                      
                      <div className="grid md:grid-cols-3 gap-4">
                        <div className="space-y-1 md:col-span-3">
                          <div className="flex justify-between items-center">
                            <label className="text-xs font-bold text-slate-600 block">Web de la ART</label>
                            {artWeb && (
                              <a 
                                href={artWeb.startsWith('http') ? artWeb : `https://${artWeb}`} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="text-[10px] text-[#468DFF] hover:underline font-bold"
                              >
                                Visitar sitio web del portal
                              </a>
                            )}
                          </div>
                          <input
                            type="text"
                            value={artWeb}
                            onChange={(e) => setArtWeb(e.target.value)}
                            placeholder="Ej: https://www.art.com.ar"
                            className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all text-slate-700"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-600 block">Usuario ART</label>
                          <input
                            type="text"
                            value={artUsuario}
                            onChange={(e) => setArtUsuario(e.target.value)}
                            placeholder="Usuario"
                            autoComplete="new-username"
                            className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all text-slate-700"
                          />
                        </div>

                        <div className="space-y-1 md:col-span-2">
                          <label className="text-xs font-bold text-slate-600 block">Clave de Acceso</label>
                          <div className="relative">
                            <input
                              type={showArtClave ? 'text' : 'password'}
                              value={artClave}
                              onChange={(e) => setArtClave(e.target.value)}
                              placeholder="Clave"
                              autoComplete="new-password"
                              className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all text-slate-700"
                            />
                            <button
                              type="button"
                              onClick={() => setShowArtClave(!showArtClave)}
                              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-700"
                            >
                              {showArtClave ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white border border-slate-150 rounded-2xl p-6 shadow-sm space-y-4">
                      <h4 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">Plataforma MiBA / Trámites a Distancia (TAD)</h4>
                      
                      <div className="grid md:grid-cols-3 gap-4">
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-600 block">Usuario MiBA / TAD</label>
                          <input
                            type="text"
                            value={mibaUsuario}
                            onChange={(e) => setMibaUsuario(e.target.value)}
                            placeholder="Usuario"
                            autoComplete="new-username"
                            className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all text-slate-700"
                          />
                        </div>

                        <div className="space-y-1 md:col-span-2">
                          <label className="text-xs font-bold text-slate-600 block">Clave de Acceso</label>
                          <div className="relative">
                            <input
                              type={showMibaClave ? 'text' : 'password'}
                              value={mibaClave}
                              onChange={(e) => setMibaClave(e.target.value)}
                              placeholder="Clave"
                              autoComplete="new-password"
                              className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all text-slate-700"
                            />
                            <button
                              type="button"
                              onClick={() => setShowMibaClave(!showMibaClave)}
                              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-700"
                            >
                              {showMibaClave ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white border border-slate-150 rounded-2xl p-6 shadow-sm space-y-4">
                      <h4 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">Ministerio de Ambiente PBA / APRA</h4>
                      
                      <div className="grid md:grid-cols-3 gap-4">
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-600 block">Usuario Ambiente / APRA</label>
                          <input
                            type="text"
                            value={ambienteUsuario}
                            onChange={(e) => setAmbienteUsuario(e.target.value)}
                            placeholder="Usuario"
                            autoComplete="new-username"
                            className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all text-slate-700"
                          />
                        </div>

                        <div className="space-y-1 md:col-span-2">
                          <label className="text-xs font-bold text-slate-600 block">Clave de Acceso</label>
                          <div className="relative">
                            <input
                              type={showAmbienteClave ? 'text' : 'password'}
                              value={ambienteClave}
                              onChange={(e) => setAmbienteClave(e.target.value)}
                              placeholder="Clave"
                              autoComplete="new-password"
                              className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all text-slate-700"
                            />
                            <button
                              type="button"
                              onClick={() => setShowAmbienteClave(!showAmbienteClave)}
                              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-700"
                            >
                              {showAmbienteClave ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Observaciones en Plataformas */}
                    <div className="bg-white border border-slate-150 rounded-2xl p-6 shadow-sm space-y-4 mt-6">
                      <h4 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">Observaciones Generales</h4>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-600 block">Notas / Observaciones sobre la empresa</label>
                        <textarea
                          rows="4"
                          value={observaciones}
                          onChange={(e) => setObservaciones(e.target.value)}
                          placeholder="Escribe comentarios, deudas técnicas, particularidades operativas, etc..."
                          className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all text-slate-700 resize-y"
                        />
                      </div>
                    </div>

                  </div>
                )}

                {/* TAB 5: PORTAL DE CLIENTE */}
                {activeTab === 'portal' && (
                  <div className="space-y-6">
                    <div className="bg-white border border-slate-150 rounded-2xl p-6 shadow-sm space-y-6">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-2.5 rounded-xl ${clientProfile ? 'bg-emerald-50 text-emerald-500' : 'bg-slate-100 text-slate-400'}`}>
                            <Users className="h-6 w-6" />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-slate-900">Portal de Acceso del Cliente</h4>
                            <p className="text-xs text-slate-500 mt-0.5">Configuración de credenciales y seguridad del portal.</p>
                          </div>
                        </div>
                        <div>
                          {clientProfile ? (
                            <span className="px-2.5 py-1 rounded-full bg-emerald-100 border border-emerald-200 text-emerald-700 text-xs font-bold uppercase tracking-wider">
                              Activo
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-500 text-xs font-bold uppercase tracking-wider">
                              Inactivo
                            </span>
                          )}
                        </div>
                      </div>

                      {clientProfile ? (
                        <div className="space-y-6">
                          <div className="p-4 rounded-xl bg-slate-50/50 border border-slate-150 space-y-4">
                            <div className="grid md:grid-cols-2 gap-4">
                              <div>
                                <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Nombre de Usuario (CUIT)</span>
                                <span className="text-sm font-semibold text-slate-800 block bg-white border border-slate-150 rounded-xl px-3 py-2">{cuit}</span>
                              </div>
                              <div>
                                <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Correo Electrónico de Acceso</span>
                                <span className="text-sm font-semibold text-slate-800 block bg-white border border-slate-150 rounded-xl px-3 py-2">{clientProfile.email}</span>
                              </div>
                            </div>
                            <div>
                              <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Nombre del Responsable</span>
                              <span className="text-sm font-semibold text-slate-800 block bg-white border border-slate-150 rounded-xl px-3 py-2">{clientProfile.full_name}</span>
                            </div>
                          </div>

                          <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-red-800 text-xs leading-relaxed">
                            <strong>Atención:</strong> Si deshabilitas el acceso, las credenciales del cliente serán eliminadas de inmediato de manera permanente y éste ya no podrá iniciar sesión en la plataforma. Sus datos e informes de seguridad no serán borrados, sólo el acceso del usuario.
                          </div>

                          <div className="flex justify-start">
                            <button
                              type="button"
                              disabled={portalLoading}
                              onClick={handleDisablePortal}
                              className="py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-red-500/10 active:scale-[0.98] disabled:opacity-50"
                            >
                              {portalLoading ? (
                                <>
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  Deshabilitando...
                                </>
                              ) : (
                                <>
                                  <Trash2 className="h-4 w-4" />
                                  Deshabilitar Acceso al Portal
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-6">
                          <div className="text-xs text-slate-650 leading-relaxed max-w-xl">
                            El portal de cliente permite que los directores o encargados de la empresa ingresen en modo **Solo Lectura** para visualizar sus planes anuales, constancias de visita, capacitaciones y acciones correctivas.
                            El usuario del cliente será su número de CUIT (**{cuit || 'Sin CUIT asignado'}**) y la contraseña inicial será también su CUIT.
                          </div>

                          {(!cuit || cuit.length !== 11) ? (
                            <div className="p-4 rounded-xl bg-amber-50 border border-amber-250 text-amber-800 text-xs flex items-start gap-2.5">
                              <AlertTriangle className="h-4.5 w-4.5 text-amber-600 shrink-0 mt-0.5" />
                              <div>
                                <strong>CUIT no configurado o inválido:</strong> Para poder habilitar el portal de clientes, debes ingresar primero un número de CUIT válido de 11 dígitos en la pestaña <strong>Datos Generales</strong> y guardar la empresa.
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-4 max-w-xl">
                              <div className="grid md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                  <label className="text-xs font-bold text-slate-600 block">Nombre del Contacto / Responsable <span className="text-[#468DFF]">*</span></label>
                                  <input
                                    type="text"
                                    value={clientName}
                                    onChange={(e) => setClientName(e.target.value)}
                                    placeholder="Nombre del cliente"
                                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all text-slate-700"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-xs font-bold text-slate-600 block">Correo Electrónico del Contacto <span className="text-[#468DFF]">*</span></label>
                                  <input
                                    type="email"
                                    value={clientEmail}
                                    onChange={(e) => setClientEmail(e.target.value)}
                                    placeholder="correo@cliente.com"
                                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all text-slate-700"
                                  />
                                </div>
                              </div>

                              <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-600 block">Contraseña Inicial (Opcional - por defecto será el CUIT)</label>
                                <input
                                  type="password"
                                  value={clientPassword}
                                  onChange={(e) => setClientPassword(e.target.value)}
                                  placeholder="Dejar vacío para usar el CUIT como clave"
                                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all text-slate-700"
                                />
                              </div>

                              <div className="flex justify-end pt-2">
                                <button
                                  type="button"
                                  disabled={portalLoading}
                                  onClick={handleEnablePortal}
                                  className="py-2.5 px-5 rounded-xl bg-[#468DFF] hover:bg-[#0511F2] text-white font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-blue-500/10 active:scale-[0.98] disabled:opacity-50"
                                >
                                  {portalLoading ? (
                                    <>
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                      Habilitando Portal...
                                    </>
                                  ) : (
                                    <>
                                      <Check className="h-4 w-4" />
                                      Habilitar Portal de Cliente
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Standalone Tab 5 Observaciones removed (integrated inside each section) */}

              </fieldset>

              {/* Botones de Acción */}
              <div className="flex justify-between items-center pt-6 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleExitForm}
                  className="px-5 py-2.5 border border-slate-350 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all active:scale-[0.98] cursor-pointer"
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
                      {canEliminar && editingId && (
                        <button
                          type="button"
                          onClick={() => handleDelete(editingId, razonSocial)}
                          className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold transition-all active:scale-[0.98] cursor-pointer shadow-lg shadow-red-600/10"
                        >
                          Eliminar
                        </button>
                      )}
                      {!isFormDisabled && (
                        <button
                          type="submit"
                          disabled={saving}
                          className="px-5 py-2.5 bg-[#468DFF] hover:bg-[#0511F2] text-white rounded-xl text-sm font-bold flex items-center gap-2 transition-all active:scale-[0.98] cursor-pointer shadow-lg shadow-[#468DFF]/10 disabled:opacity-50"
                        >
                          {saving ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin text-white" />
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
          )}

        </div>
      </main>

      {/* Ventanas Emergentes Modales Centradas (Backdrop-blur-sm) */}
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

      {/* Notificación Toast flotante en esquina */}
      {toast.show && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl border shadow-lg transition-all text-xs font-bold ${
          toast.type === 'error'
            ? 'bg-red-50 border-red-200 text-red-600'
            : 'bg-emerald-50 border-emerald-200 text-emerald-600'
        }`}>
          <Check className="h-4 w-4 shrink-0" />
          <span>{toast.message}</span>
        </div>
      )}

    </div>
  );
}
