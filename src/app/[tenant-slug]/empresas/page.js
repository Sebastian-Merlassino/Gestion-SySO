// src/app/[tenant-slug]/empresas/page.js
'use client';

import React, { useState, useEffect } from 'react';
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
  ClipboardList
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

  // Datos del Tenant y Perfil
  const [profile, setProfile] = useState(null);
  const [tenant, setTenant] = useState(null);

  // Listados de datos
  const [empresas, setEmpresas] = useState([]);
  const [actividadesEconomicas, setActividadesEconomicas] = useState([]);

  // Búsqueda de actividades
  const [searchTermCiiu, setSearchTermCiiu] = useState('');
  const [ciiuResults, setCiiuResults] = useState([]);

  // ID de la empresa en edición (null si es nueva)
  const [editingId, setEditingId] = useState(null);

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

  // Diálogo modal de alerta / confirmación
  const [modalAlert, setModalAlert] = useState({ show: false, title: '', message: '', type: 'info', onConfirm: null });
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

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

  const showAlert = (title, message, type = 'info', onConfirm = null) => {
    setModalAlert({ show: true, title, message, type, onConfirm });
  };

  const closeAlert = () => {
    setModalAlert({ show: false, title: '', message: '', type: 'info', onConfirm: null });
  };

  const loadMockData = () => {
    setProfile({ full_name: 'Profesional de SySO (Mock)', role: 'owner' });
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
      setProfile(prof);

      // Cargar Tenant
      const { data: ten, error: tErr } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', prof.tenant_id)
        .single();
      if (tErr) throw tErr;
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
          localidadesList
        };
      }));

      setEstablecimientos(mappedEsts);
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
          await loadRealData();
        } catch (err) {
          console.error('Error al borrar empresa:', err);
          triggerToast('Error al borrar la empresa.', 'error');
        } finally {
          setLoading(false);
          closeAlert();
        }
      }
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
      customIzaje: ''
    };
    setEstablecimientos(prev => [...prev, emptyEst]);
  };

  // Guardar todo en Supabase
  const handleSaveAll = async (e) => {
    e.preventDefault();
    if (!razonSocial.trim()) {
      triggerToast('La Razón Social es requerida.', 'error');
      return;
    }
    if (!cuit.trim() || cuit.length !== 11) {
      triggerToast('CUIT inválido. Debe poseer exactamente 11 números enteros.', 'error');
      return;
    }

    // Verificar si algún establecimiento tiene campos requeridos vacíos
    for (let i = 0; i < establecimientos.length; i++) {
      const est = establecimientos[i];
      if (!est.direccion.trim() || !est.provincia || !est.partido) {
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
        razon_social: razonSocial.trim(),
        nombre_comercial: nombreComercial.trim() || null,
        cuit: cuit,
        actividades_ciiu: activitiesCodes,
        contactos_telefonos: telefonos.filter(t => t.valor.trim() !== ''),
        contactos_correos: correos.filter(c => c.valor.trim() !== ''),
        contactos_facturacion: facturacion.filter(f => f.valor.trim() !== ''),
        art_web: artWeb.trim() || null,
        art_usuario: artUsuario.trim() || null,
        art_clave: artClave.trim() || null,
        miba_usuario: mibaUsuario.trim() || null,
        miba_clave: mibaClave.trim() || null,
        ambiente_usuario: ambienteUsuario.trim() || null,
        ambiente_clave: ambienteClave.trim() || null,
        observaciones: observaciones.trim() || null,
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
      // Primero, remover todos los establecimientos anteriores si estamos editando
      if (editingId) {
        const { error: delErr } = await supabase
          .from('establecimientos')
          .delete()
          .eq('empresa_id', editingId);
        if (delErr) throw delErr;
      }

      if (establecimientos.length > 0) {
        const payloadEsts = establecimientos.map(est => ({
          empresa_id: empresaId,
          tenant_id: tenant.id,
          denominacion: (est.denominacion || '').trim(),
          direccion: (est.direccion || '').trim(),
          provincia: est.provincia,
          partido: est.partido,
          localidad_barrio: (est.localidad_barrio || '').trim(),
          cp: (est.cp || '').trim() || null,
          superficie_total: est.superficie_total.trim() || null,
          superficie_cubierta: est.superficie_cubierta.trim() || null,
          superficie_piso: est.superficie_piso.trim() || null,
          cantidad_plantas: est.cantidad_plantas.trim() || null,
          horario_funcionamiento: est.horario_funcionamiento.trim() || null,
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
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }));

        const { error: insEstsErr } = await supabase
          .from('establecimientos')
          .insert(payloadEsts);
        if (insEstsErr) throw insEstsErr;
      }

      triggerToast('Los datos de la empresa y establecimientos se guardaron con éxito.');
      await loadRealData();
      setView('list');
    } catch (err) {
      console.error('Error al guardar datos:', err);
      triggerToast('Error al guardar la empresa cliente.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#D9D9D9] text-slate-700 flex font-sans">
      
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

            <div>
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
                <a href={`/${tenantSlug}/dashboard`} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-[#468DFF] font-semibold text-sm transition-all">
                  <Building className="h-4 w-4" />
                  Dashboard
                </a>
                <a href="#" className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[#468DFF] text-white font-semibold text-sm transition-all shadow-md shadow-[#468DFF]/10">
                  <Users className="h-4 w-4" />
                  Clientes
                </a>
                {(profile?.role === 'owner' || profile?.role === 'admin') && (
                  <a href={`/${tenantSlug}/equipo`} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-[#468DFF] font-semibold text-sm transition-all">
                    <Briefcase className="h-4 w-4" />
                    Equipo de Trabajo
                  </a>
                )}
                <a href={`/${tenantSlug}/programa`} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-[#468DFF] font-semibold text-sm transition-all">
                  <Calendar className="h-4 w-4" />
                  Programa de Gestión Anual
                </a>
                <a href={`/${tenantSlug}/correctivas`} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-[#468DFF] font-semibold text-sm transition-all">
                  <ClipboardList className="h-4 w-4" />
                  Acciones Correctivas
                </a>
                
                <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 px-3 block pt-6 mb-2">Configuración</span>
                <a href={`/${tenantSlug}/profile`} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-[#468DFF] font-semibold text-sm transition-all">
                  <Settings className="h-4 w-4" />
                  Editar Perfil
                </a>
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
      <aside className="w-64 bg-[#0D0D0D] flex flex-col justify-between shrink-0 hidden md:flex">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8">
            <img 
              src="/brand/logo-primary.png" 
              alt="Logo Gestión SySO" 
              className="h-9 w-9 object-contain shrink-0" 
            />
            <span className="font-outfit text-base font-extrabold text-white tracking-tight block">Gestión SySO</span>
          </div>

          <nav className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 px-3 block mb-2">Panel principal</span>
            <a href={`/${tenantSlug}/dashboard`} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-[#468DFF] font-semibold text-sm transition-all">
              <Building className="h-4 w-4" />
              Dashboard
            </a>
            <a href="#" className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[#468DFF] text-white font-semibold text-sm transition-all shadow-md shadow-[#468DFF]/10">
              <Users className="h-4 w-4" />
              Clientes
            </a>
            {(profile?.role === 'owner' || profile?.role === 'admin') && (
              <a href={`/${tenantSlug}/equipo`} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-[#468DFF] font-semibold text-sm transition-all">
                <Briefcase className="h-4 w-4" />
                Equipo de Trabajo
              </a>
            )}
            <a href={`/${tenantSlug}/programa`} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-[#468DFF] font-semibold text-sm transition-all">
              <Calendar className="h-4 w-4" />
              Programa de Gestión Anual
            </a>
            <a href={`/${tenantSlug}/correctivas`} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-[#468DFF] font-semibold text-sm transition-all">
              <ClipboardList className="h-4 w-4" />
              Acciones Correctivas
            </a>
            
            <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 px-3 block pt-6 mb-2">Configuración</span>
            <a href={`/${tenantSlug}/profile`} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-[#468DFF] font-semibold text-sm transition-all">
              <Settings className="h-4 w-4" />
              Editar Perfil
            </a>
          </nav>
        </div>

        <div className="p-4 border-t border-white/10">
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

      {/* Area del Contenido Principal */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <header className="h-16 border-b border-slate-300/60 flex items-center justify-between px-6 md:px-8 bg-white/80 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center gap-3">
            {/* Hamburger Button (Mobile Only) */}
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 -ml-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 md:hidden cursor-pointer"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h2 className="font-outfit text-lg font-bold text-slate-900 flex items-center gap-2">
              <Users className="h-5 w-5 text-[#468DFF]" />
              Clientes
            </h2>
          </div>
          <div className="text-xs font-semibold text-slate-500 bg-slate-100 py-1.5 px-3 rounded-lg border border-slate-200">
            {tenant?.name || 'Mi Consultora'}
          </div>
        </header>

        <div className="p-6 md:p-8 space-y-8 max-w-5xl">
          
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
              
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-outfit text-xl font-extrabold text-slate-800 tracking-tight">Clientes</h3>
                  <p className="text-xs text-slate-500 mt-1">Registra y edita los datos generales y establecimientos de tus consultados.</p>
                </div>
                <button
                  onClick={handleAddNew}
                  className="py-2.5 px-4 rounded-xl bg-[#468DFF] hover:bg-[#0511F2] text-white text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-blue-500/10 active:scale-[0.98] cursor-pointer"
                >
                  <PlusCircle className="h-4 w-4" />
                  Agregar nueva empresa
                </button>
              </div>

              {empresas.length === 0 ? (
                <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center space-y-4 shadow-sm">
                  <div className="p-3 bg-blue-50 text-[#468DFF] rounded-full w-12 h-12 flex items-center justify-center mx-auto">
                    <Building className="h-6 w-6" />
                  </div>
                  <h4 className="font-outfit text-base font-bold text-slate-800">No hay clientes registrados</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                    Comienza a cargar los datos de tus clientes para realizar diagnósticos y planes de adecuación según Decreto 351/79.
                  </p>
                  <button
                    onClick={handleAddNew}
                    className="py-2 px-4 rounded-xl bg-[#468DFF] hover:bg-[#0511F2] text-white text-xs font-bold transition-all inline-block shadow-sm"
                  >
                    Cargar mi primer cliente
                  </button>
                </div>
              ) : (
                <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          <th className="py-4 px-6">Razón Social / Nombre Comercial</th>
                          <th className="py-4 px-6">C.U.I.T.</th>
                          <th className="py-4 px-6 text-center">Establecimientos</th>
                          <th className="py-4 px-6 text-right">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs font-normal text-slate-700">
                        {empresas.map((emp) => (
                          <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-4 px-6">
                              <span className="font-bold text-slate-800 block">{emp.razon_social}</span>
                              {emp.nombre_comercial && (
                                <span className="text-[10px] text-slate-400 block mt-0.5">{emp.nombre_comercial}</span>
                              )}
                            </td>
                            <td className="py-4 px-6 font-mono text-slate-600">{emp.cuit}</td>
                            <td className="py-4 px-6 text-center">
                              <span className="px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-[10px] font-bold">
                                {emp.establecimientos_count}
                              </span>
                            </td>
                            <td className="py-4 px-6 text-right space-x-1">
                              <button
                                onClick={() => handleEdit(emp.id)}
                                className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-all cursor-pointer shadow-sm inline-block"
                                title="Editar ficha de cliente"
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleDelete(emp.id, emp.razon_social)}
                                className="p-2 rounded-lg border border-red-100 bg-red-50/20 text-red-500 hover:bg-red-500 hover:text-white transition-all cursor-pointer shadow-sm inline-block"
                                title="Borrar cliente"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

          ) : (

            // ==========================================
            // VISTA: FORMULARIO DE CARGA / EDICIÓN (TABS)
            // ==========================================
            <form onSubmit={handleSaveAll} className="space-y-6">
              
              <div className="flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => setView('list')}
                  className="py-2 px-4 rounded-xl border border-slate-300/80 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 text-xs font-bold transition-all shadow-sm flex items-center gap-2"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Volver al listado
                </button>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400 bg-slate-100 border border-slate-200 px-2 py-1 rounded font-bold uppercase tracking-wider">
                    {editingId ? 'Modo Edición' : 'Ficha Nueva'}
                  </span>
                </div>
              </div>

              {/* Encabezado Ficha */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
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
                    { id: 'credenciales', label: 'Plataformas & Credenciales' }
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
              <div className="space-y-6">

                {/* TAB 1: DATOS GENERALES Y CONTACTOS */}
                {activeTab === 'general' && (
                  <div className="space-y-6">
                    <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
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
                            className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 outline-none focus:border-[#468DFF] focus:bg-white text-slate-700 transition-all"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-600 block">Nombre Comercial</label>
                          <input
                            type="text"
                            value={nombreComercial}
                            onChange={(e) => setNombreComercial(e.target.value)}
                            placeholder="Ej: Acme Solutions"
                            className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 outline-none focus:border-[#468DFF] focus:bg-white text-slate-700 transition-all"
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
                            className={`w-full text-xs bg-slate-50 border ${cuitError ? 'border-red-400 focus:border-red-500' : 'border-slate-300 focus:border-[#468DFF]'} rounded-xl px-4 py-2.5 outline-none focus:bg-white text-slate-700 transition-all`}
                          />
                          {cuitError && <p className="text-[10px] text-red-500 font-bold mt-1">{cuitError}</p>}
                        </div>

                        {/* Actividad Económica (CIIU) dentro de Identidad de la empresa */}
                        <div className="space-y-3 pt-4 border-t border-slate-100 relative md:col-span-2">
                          <label className="text-xs font-bold text-slate-600 block">Actividad Económica (CIIU) <span className="text-[#468DFF]">*</span></label>
                          <p className="text-[10px] text-slate-500">Busca y agrega las actividades económicas de la empresa.</p>
                          <input
                            type="text"
                            placeholder="Buscar por código o descripción (Ej: arroz, 11111)..."
                            value={searchTermCiiu}
                            onChange={(e) => setSearchTermCiiu(e.target.value)}
                            className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 outline-none focus:border-[#468DFF] focus:bg-white text-slate-700 transition-all"
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
                    <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-6">
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
                          <div key={idx} className="grid grid-cols-1 md:grid-cols-3 gap-2 items-center bg-slate-50 p-3 rounded-xl border border-slate-200">
                            <input
                              type="text"
                              placeholder="Nombre y Apellido"
                              value={tel.nombre}
                              onChange={(e) => {
                                const copy = [...telefonos];
                                copy[idx].nombre = e.target.value;
                                setTelefonos(copy);
                              }}
                              className="text-[11px] bg-white border border-slate-300 rounded-lg px-3 py-1.5 outline-none focus:border-[#468DFF] text-slate-700"
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
                              className="text-[11px] bg-white border border-slate-300 rounded-lg px-3 py-1.5 outline-none focus:border-[#468DFF] text-slate-700"
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
                                className="text-[11px] bg-white border border-slate-300 rounded-lg px-3 py-1.5 outline-none focus:border-[#468DFF] text-slate-700 flex-1"
                              />
                              <button
                                type="button"
                                onClick={() => setTelefonos(telefonos.filter((_, i) => i !== idx))}
                                className="p-1.5 rounded-lg border border-red-100 hover:bg-red-500 hover:text-white text-red-500 transition-colors"
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
                          <div key={idx} className="grid grid-cols-1 md:grid-cols-3 gap-2 items-center bg-slate-50 p-3 rounded-xl border border-slate-200">
                            <input
                              type="text"
                              placeholder="Nombre y Apellido"
                              value={cor.nombre}
                              onChange={(e) => {
                                const copy = [...correos];
                                copy[idx].nombre = e.target.value;
                                setCorreos(copy);
                              }}
                              className="text-[11px] bg-white border border-slate-300 rounded-lg px-3 py-1.5 outline-none focus:border-[#468DFF] text-slate-700"
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
                              className="text-[11px] bg-white border border-slate-300 rounded-lg px-3 py-1.5 outline-none focus:border-[#468DFF] text-slate-700"
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
                                className="text-[11px] bg-white border border-slate-300 rounded-lg px-3 py-1.5 outline-none focus:border-[#468DFF] text-slate-700 flex-1"
                              />
                              <button
                                type="button"
                                onClick={() => setCorreos(correos.filter((_, i) => i !== idx))}
                                className="p-1.5 rounded-lg border border-red-100 hover:bg-red-500 hover:text-white text-red-500 transition-colors"
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
                          <div key={idx} className="grid grid-cols-1 md:grid-cols-3 gap-2 items-center bg-slate-50 p-3 rounded-xl border border-slate-200">
                            <input
                              type="text"
                              placeholder="Nombre y Apellido"
                              value={fac.nombre}
                              onChange={(e) => {
                                const copy = [...facturacion];
                                copy[idx].nombre = e.target.value;
                                setFacturacion(copy);
                              }}
                              className="text-[11px] bg-white border border-slate-300 rounded-lg px-3 py-1.5 outline-none focus:border-[#468DFF] text-slate-700"
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
                              className="text-[11px] bg-white border border-slate-300 rounded-lg px-3 py-1.5 outline-none focus:border-[#468DFF] text-slate-700"
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
                                className="text-[11px] bg-white border border-slate-300 rounded-lg px-3 py-1.5 outline-none focus:border-[#468DFF] text-slate-700 flex-1"
                              />
                              <button
                                type="button"
                                onClick={() => setFacturacion(facturacion.filter((_, i) => i !== idx))}
                                className="p-1.5 rounded-lg border border-red-100 hover:bg-red-500 hover:text-white text-red-500 transition-colors"
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
                    <div className="flex justify-between items-center bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">Listado de Establecimientos</h4>
                        <p className="text-[10px] text-slate-500 mt-0.5">Una empresa puede constar de múltiples sedes, fábricas u oficinas.</p>
                      </div>
                      <button
                        type="button"
                        onClick={handleAddEstablecimiento}
                        className="py-2 px-3 rounded-xl border border-[#468DFF]/40 hover:bg-[#468DFF] hover:text-white text-center text-[#468DFF] font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Agregar establecimiento
                      </button>
                    </div>

                    {establecimientos.length === 0 ? (
                      <div className="bg-white border border-slate-200/80 rounded-2xl p-10 text-center space-y-3 shadow-sm">
                        <MapPin className="h-6 w-6 text-slate-400 mx-auto" />
                        <h5 className="font-bold text-slate-800 text-xs">No hay establecimientos cargados</h5>
                        <p className="text-[10px] text-slate-500 max-w-xs mx-auto">
                          Debes agregar al menos un establecimiento para poder calcular las horas de profesionales requeridas de este cliente.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-8">
                        {establecimientos.map((est, idx) => (
                          <div key={idx} className="bg-white border border-slate-200/85 rounded-2xl p-6 shadow-sm space-y-6 relative hover:border-[#468DFF]/20 transition-all">
                            
                            {/* Header Establecimiento */}
                            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                              <span className="text-[10px] font-bold text-[#468DFF] bg-[#468DFF]/10 border border-[#468DFF]/15 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                                Establecimiento #{idx + 1}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleRemoveEstablecimiento(idx)}
                                className="text-[10px] text-red-500 hover:text-white hover:bg-red-600 font-bold px-2 py-1 rounded-lg border border-red-200 hover:border-red-600 transition-all cursor-pointer flex items-center gap-1"
                              >
                                <Trash2 className="h-3 w-3" /> Quitar
                              </button>
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
                                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 outline-none focus:border-[#468DFF] focus:bg-white text-slate-700"
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
                                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 outline-none focus:border-[#468DFF] focus:bg-white text-slate-700"
                                />
                              </div>

                              {/* Geografía en cascada */}
                              <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-600 block">Provincia <span className="text-[#468DFF]">*</span></label>
                                <select
                                  value={est.provincia}
                                  onChange={(e) => handleEstProvinciaChange(idx, e.target.value)}
                                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 outline-none focus:border-[#468DFF] focus:bg-white text-slate-700"
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
                                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 outline-none focus:border-[#468DFF] focus:bg-white text-slate-700 disabled:opacity-50"
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
                                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 outline-none focus:border-[#468DFF] focus:bg-white text-slate-700 disabled:opacity-50"
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
                                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 outline-none focus:border-[#468DFF] focus:bg-white text-slate-700"
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
                                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 outline-none focus:border-[#468DFF] focus:bg-white text-slate-700"
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
                                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 outline-none focus:border-[#468DFF] focus:bg-white text-slate-700"
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
                                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 outline-none focus:border-[#468DFF] focus:bg-white text-slate-700"
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
                                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 outline-none focus:border-[#468DFF] focus:bg-white text-slate-700"
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
                                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 outline-none focus:border-[#468DFF] focus:bg-white text-slate-700"
                                />
                              </div>
                            </div>

                            {/* Dotación y Trabajadores Equivalentes */}
                            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/60 space-y-4">
                              <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider block">Dotación de trabajadores</span>
                              <div className="grid md:grid-cols-3 gap-4">
                                <div className="space-y-1">
                                  <label className="text-[11px] font-bold text-slate-600 block">Trabajadores Administrativos</label>
                                  <input
                                    type="number"
                                    min="0"
                                    value={est.trabajadores_administrativos}
                                    onChange={(e) => handleWorkerChange(idx, 'trabajadores_administrativos', e.target.value)}
                                    className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3.5 py-2 outline-none focus:border-[#468DFF]"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[11px] font-bold text-slate-600 block">Trabajadores Productivos</label>
                                  <input
                                    type="number"
                                    min="0"
                                    value={est.trabajadores_productivos}
                                    onChange={(e) => handleWorkerChange(idx, 'trabajadores_productivos', e.target.value)}
                                    className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3.5 py-2 outline-none focus:border-[#468DFF]"
                                  />
                                </div>
                                <div className="space-y-1 bg-[#468DFF]/5 p-3 rounded-xl border border-[#468DFF]/15 text-center flex flex-col justify-center">
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
                              
                              <div className="grid md:grid-cols-2 gap-2 max-h-60 overflow-y-auto p-4 border border-slate-200/80 rounded-xl bg-slate-50/50">
                                {DECRETO_CHAPTERS.map((cap) => (
                                  <label key={cap.id} className="flex items-start gap-2.5 p-2 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-[11px] font-semibold text-slate-700 transition-all cursor-pointer">
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
                                <div className="text-center bg-white px-5 py-2.5 rounded-xl border border-slate-250 shadow-sm shrink-0 min-w-[100px]">
                                  <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wider">Categoría</span>
                                  <span className="font-outfit text-xl font-extrabold text-slate-800 block mt-0.5">
                                    {est.capitulos_decreto.cap_8 || est.capitulos_decreto.cap_9 || est.capitulos_decreto.cap_10 
                                      ? 'C' 
                                      : (est.capitulos_decreto.cap_7 || est.capitulos_decreto.cap_13 || est.capitulos_decreto.cap_15 || est.capitulos_decreto.cap_16 || est.capitulos_decreto.cap_17 
                                        ? 'B' 
                                        : 'A')}
                                  </span>
                                </div>
                                <div className="text-center bg-[#468DFF] text-white px-5 py-2.5 rounded-xl border border-[#468DFF] shadow-sm shrink-0 min-w-[120px]">
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
                                <div key={item.key} className="space-y-2 p-4 rounded-xl border border-slate-200 bg-slate-50/20">
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
                                          className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                                            isSelected 
                                              ? 'bg-slate-800 text-white border-slate-800' 
                                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
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
                                      className="flex-1 text-[10px] bg-white border border-slate-300 rounded-lg px-3 py-1.5 outline-none focus:border-[#468DFF]"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleAddCustomMachine(idx, item.key, est[item.customKey] || '', () => item.setCustomKey(''))}
                                      className="py-1.5 px-3 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-[10px] font-bold text-slate-700 transition-all cursor-pointer"
                                    >
                                      Añadir
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>

                          </div>
                        ))}
                      </div>
                    )}

                    {/* Observaciones en Establecimientos */}
                    <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4 mt-6">
                      <h4 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">Observaciones Generales</h4>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-600 block">Notas / Observaciones sobre la empresa</label>
                        <textarea
                          rows="4"
                          value={observaciones}
                          onChange={(e) => setObservaciones(e.target.value)}
                          placeholder="Escribe comentarios, deudas técnicas, particularidades operativas, etc..."
                          className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 outline-none focus:border-[#468DFF] focus:bg-white text-slate-700 transition-all resize-y"
                        />
                      </div>
                    </div>

                  </div>
                )}

                {/* TAB 4: PLATAFORMAS & CREDENCIALES */}
                {activeTab === 'credenciales' && (
                  <div className="space-y-6">
                    <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
                      <h4 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">Aseguradora de Riesgos del Trabajo (ART)</h4>
                      
                      <div className="grid md:grid-cols-3 gap-4">
                        <div className="space-y-1 md:col-span-3">
                          <label className="text-xs font-bold text-slate-600 block">Web de la ART</label>
                          <input
                            type="text"
                            value={artWeb}
                            onChange={(e) => setArtWeb(e.target.value)}
                            placeholder="Ej: https://www.art.com.ar"
                            className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 outline-none focus:border-[#468DFF] focus:bg-white text-slate-700 transition-all"
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
                            className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 outline-none focus:border-[#468DFF] focus:bg-white text-slate-700 transition-all"
                          />
                        </div>

                        <div className="space-y-1 md:col-span-2">
                          <label className="text-xs font-bold text-slate-600 block">Clave de Acceso</label>
                          <input
                            type="password"
                            value={artClave}
                            onChange={(e) => setArtClave(e.target.value)}
                            placeholder="Clave"
                            autoComplete="new-password"
                            className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 outline-none focus:border-[#468DFF] focus:bg-white text-slate-700 transition-all"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
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
                            className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 outline-none focus:border-[#468DFF] focus:bg-white text-slate-700 transition-all"
                          />
                        </div>

                        <div className="space-y-1 md:col-span-2">
                          <label className="text-xs font-bold text-slate-600 block">Clave de Acceso</label>
                          <input
                            type="password"
                            value={mibaClave}
                            onChange={(e) => setMibaClave(e.target.value)}
                            placeholder="Clave"
                            autoComplete="new-password"
                            className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 outline-none focus:border-[#468DFF] focus:bg-white text-slate-700 transition-all"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
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
                            className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 outline-none focus:border-[#468DFF] focus:bg-white text-slate-700 transition-all"
                          />
                        </div>

                        <div className="space-y-1 md:col-span-2">
                          <label className="text-xs font-bold text-slate-600 block">Clave de Acceso</label>
                          <input
                            type="password"
                            value={ambienteClave}
                            onChange={(e) => setAmbienteClave(e.target.value)}
                            placeholder="Clave"
                            autoComplete="new-password"
                            className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 outline-none focus:border-[#468DFF] focus:bg-white text-slate-700 transition-all"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Observaciones en Plataformas */}
                    <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4 mt-6">
                      <h4 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">Observaciones Generales</h4>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-600 block">Notas / Observaciones sobre la empresa</label>
                        <textarea
                          rows="4"
                          value={observaciones}
                          onChange={(e) => setObservaciones(e.target.value)}
                          placeholder="Escribe comentarios, deudas técnicas, particularidades operativas, etc..."
                          className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 outline-none focus:border-[#468DFF] focus:bg-white text-slate-700 transition-all resize-y"
                        />
                      </div>
                    </div>

                  </div>
                )}

                {/* Standalone Tab 5 Observaciones removed (integrated inside each section) */}

              </div>

              {/* Botón de Guardado */}
              <div className="flex justify-end pt-4 border-t border-slate-300/40">
                <button
                  type="submit"
                  disabled={saving}
                  className="py-3 px-6 rounded-xl bg-[#468DFF] hover:bg-[#0511F2] text-white text-xs font-bold transition-all shadow-lg shadow-blue-500/10 active:scale-[0.98] cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-white" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 text-white" />
                      Guardar
                    </>
                  )}
                </button>
              </div>

            </form>
          )}

        </div>
      </main>

      {/* Ventanas Emergentes Modales Centradas (Backdrop-blur-sm) */}
      {modalAlert.show && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl max-w-sm w-full space-y-4 text-center">
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
                className="flex-1 py-2 px-4 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-all cursor-pointer"
              >
                {modalAlert.onConfirm ? 'Cancelar' : 'Entendido'}
              </button>
              {modalAlert.onConfirm && (
                <button
                  type="button"
                  onClick={modalAlert.onConfirm}
                  className="flex-1 py-2 px-4 rounded-xl bg-red-600 text-white font-bold text-xs hover:bg-red-700 transition-all cursor-pointer shadow-md shadow-red-500/10"
                >
                  Confirmar
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
