// src/app/[tenant-slug]/correctivas/page.js
'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { formatDate } from '@/lib/utils';
import { 
  Plus, 
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
  ChevronUp
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

export default function AccionesCorrectivasPage({ params }) {
  const tenantSlug = params['tenant-slug'];

  // Estados estructurales
  const [profile, setProfile] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [empresas, setEmpresas] = useState([]);
  const [allEstablecimientos, setAllEstablecimientos] = useState([]);
  const [miembrosList, setMiembrosList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDevMode, setIsDevMode] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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

  // Datos principales de acciones
  const [acciones, setAcciones] = useState([]);

  // Estados del CRUD / Vista Formulario
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

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
  
  // Archivo e Imagenes
  const [imagenFile, setImagenFile] = useState(null);
  const [imagenPreview, setImagenPreview] = useState('');
  const [imagenPath, setImagenPath] = useState(''); // relative path stored in database

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
  const [showFilters, setShowFilters] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setShowFilters(false);
    }
  }, []);

  // Ordenamiento
  const [sortField, setSortField] = useState('fecha');
  const [sortOrder, setSortOrder] = useState('desc');

  // Modales y Feedback
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [modalAlert, setModalAlert] = useState({ show: false, title: '', message: '', onConfirm: null, confirmText: 'Confirmar' });
  const [saveLoading, setSaveLoading] = useState(false);

  // Cargar datos
  useEffect(() => {
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

  const triggerToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 4000);
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

      // 3. Clientes
      const { data: emps, error: empErr } = await supabase
        .from('empresas')
        .select('id, razon_social')
        .eq('tenant_id', ten.id)
        .order('razon_social');
      if (empErr) throw empErr;
      setEmpresas(emps || []);

      // 4. Establecimientos
      const { data: ests, error: estErr } = await supabase
        .from('establecimientos')
        .select('id, empresa_id, denominacion')
        .eq('tenant_id', ten.id)
        .order('denominacion');
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
      const { data: accs, error: accErr } = await supabase
        .from('acciones_correctivas')
        .select('*')
        .eq('tenant_id', ten.id)
        .order('created_at', { ascending: false });
      if (accErr) throw accErr;

      // Resuelve URLs firmadas para las imágenes
      const resolvedAcciones = await Promise.all((accs || []).map(async (acc) => {
        let signedUrl = '';
        if (acc.imagen_url) {
          try {
            const { data, error: signErr } = await supabase.storage
              .from('documents')
              .createSignedUrl(acc.imagen_url, 3600, { download: false }); // 1 hora de validez
            if (!signErr && data) {
              signedUrl = data.signedUrl;
            }
          } catch (e) {
            console.error('Error resolviendo URL firmada:', e);
          }
        }
        return {
          ...acc,
          imagen_preview_url: signedUrl
        };
      }));

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
    setProfile({ full_name: 'Profesional de SySO (Mock)', role: 'owner' });
    setTenant({ id: 'mock-tenant', name: 'Consultora de Prueba' });
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

  // Cierre de sesión
  const handleLogout = async () => {
    await supabase.auth.signOut();
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
      let finalImagenUrl = imagenPath;

      // Subir archivo de imagen si se seleccionó uno nuevo
      if (imagenFile) {
        finalImagenUrl = await uploadImageToStorage(imagenFile);
      }

      const dbFuente = fuente === 'Otra' ? fuenteOtra.trim() : fuente;
      const dbTipoHallazgo = tipoHallazgo === 'Otro' ? tipoHallazgoOtro.trim() : tipoHallazgo;

      const payload = {
        tenant_id: tenant.id,
        empresa_id: empresaId,
        establecimiento_id: establecimientoId,
        fuente: dbFuente,
        fecha: fecha,
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
        fecha_planificada: fechaPlanificada || null,
        fecha_implementacion: fechaImplementacion || null,
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

  // Preparar edición
  const handleEditClick = (acc) => {
    setEditingId(acc.id);

    setEmpresaId(acc.empresa_id);
    setEstablecimientoId(acc.establecimiento_id);
    
    // Si la fuente original no está en la lista de opciones, se asume "Otra"
    if (FUENTE_OPTIONS.includes(acc.fuente)) {
      setFuente(acc.fuente);
      setFuenteOtra('');
    } else {
      setFuente('Otra');
      setFuenteOtra(acc.fuente);
    }

    setFecha(acc.fecha);
    setAreaSector(acc.area_sector || '');
    setPuestoOperacion(acc.puesto_operacion || '');

    // Si el tipo de hallazgo no está en la lista de opciones, se asume "Otro"
    if (TIPO_HALLAZGO_OPTIONS.includes(acc.tipo_hallazgo)) {
      setTipoHallazgo(acc.tipo_hallazgo);
      setTipoHallazgoOtro('');
    } else {
      setTipoHallazgo('Otro');
      setTipoHallazgoOtro(acc.tipo_hallazgo);
    }

    setDescripcionHallazgo(acc.descripcion_hallazgo || '');
    setNivelRiesgo(acc.nivel_riesgo);

    setImagenFile(null);
    setImagenPreview(acc.imagen_preview_url || '');
    setImagenPath(acc.imagen_url || '');

    setRecomendacion(acc.recomendacion || '');
    setAccionPreventiva(acc.accion_preventiva || '');
    setCausaRaiz(acc.causa_raiz || '');
    setAccionCorrectiva(acc.accion_correctiva || '');
    setResponsable(acc.responsable || '');
    setFechaPlanificada(acc.fecha_planificada || '');
    setFechaImplementacion(acc.fecha_implementacion || '');
    setObservaciones(acc.observaciones || '');

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
    setImagenFile(null);
    setImagenPreview('');
    setImagenPath('');
    setRecomendacion('');
    setAccionPreventiva('');
    setCausaRaiz('');
    setAccionCorrectiva('');
    setResponsable('');
    setFechaPlanificada('');
    setFechaImplementacion('');
    setObservaciones('');
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
    <div className="h-screen overflow-hidden bg-syso-bg text-slate-700 flex flex-col md:flex-row relative font-sans">
      
      {/* Menu Hamburguesa Mobile Drawer Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div onClick={() => setIsMobileMenuOpen(false)} className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
          
          <aside className="relative w-64 bg-[#0D0D0D] flex flex-col justify-between p-6 z-10 border-r border-white/5 animate-fade-in-right">
            <div>
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <img src="/brand/logo-primary.png" alt="Logo" className="h-9 w-9 object-contain" />
                  <span className="font-outfit text-base font-extrabold text-white tracking-tight">Gestión SySO</span>
                </div>
                <button onClick={() => setIsMobileMenuOpen(false)} className="p-1 rounded-lg text-white/50 hover:text-white hover:bg-white/10 cursor-pointer">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <nav className="space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 px-3 block mb-2">Panel principal</span>
                <a href={`/${tenantSlug}/dashboard`} onClick={(e) => handleSidebarNavigation(e, `/${tenantSlug}/dashboard`)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-[#468DFF] font-semibold text-sm transition-all">
                  <Building className="h-4 w-4" />
                  Dashboard
                </a>
                <a href={`/${tenantSlug}/empresas`} onClick={(e) => handleSidebarNavigation(e, `/${tenantSlug}/empresas`)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-[#468DFF] font-semibold text-sm transition-all">
                  <Users className="h-4 w-4" />
                  Clientes
                </a>
                {(profile?.role === 'owner' || profile?.role === 'admin') && (
                  <a href={`/${tenantSlug}/equipo`} onClick={(e) => handleSidebarNavigation(e, `/${tenantSlug}/equipo`)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-[#468DFF] font-semibold text-sm transition-all">
                    <Briefcase className="h-4 w-4" />
                    Equipo de Trabajo
                  </a>
                )}
                <a href={`/${tenantSlug}/programa`} onClick={(e) => handleSidebarNavigation(e, `/${tenantSlug}/programa`)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-[#468DFF] font-semibold text-sm transition-all">
                  <Calendar className="h-4 w-4" />
                  Programa de Gestión Anual
                </a>
                <a href={`/${tenantSlug}/capacitacion`} onClick={(e) => handleSidebarNavigation(e, `/${tenantSlug}/capacitacion`)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-[#468DFF] font-semibold text-sm transition-all">
                  <GraduationCap className="h-4 w-4" />
                  Programa de Capacitación Anual
                </a>
                <a href={`/${tenantSlug}/correctivas`} onClick={(e) => handleSidebarNavigation(e, `/${tenantSlug}/correctivas`)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[#468DFF] text-white font-semibold text-sm transition-all shadow-md shadow-[#468DFF]/10">
                  <ClipboardList className="h-4 w-4" />
                  Acciones Correctivas
                </a>
                <a href={`/${tenantSlug}/extintores`} onClick={(e) => handleSidebarNavigation(e, `/${tenantSlug}/extintores`)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-[#468DFF] font-semibold text-sm transition-all">
                  <Flame className="h-4 w-4" />
                  Extintores
                </a>
                <a href={`/${tenantSlug}/visitas`} onClick={(e) => handleSidebarNavigation(e, `/${tenantSlug}/visitas`)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-[#468DFF] font-semibold text-sm transition-all">
                  <ClipboardCheck className="h-4 w-4" />
                  Constancia de Visita
                </a>
                
                <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 px-3 block pt-6 mb-2">Configuración</span>
                <a href={`/${tenantSlug}/profile`} onClick={(e) => handleSidebarNavigation(e, `/${tenantSlug}/profile`)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-[#468DFF] font-semibold text-sm transition-all">
                  <Settings className="h-4 w-4" />
                  Editar Perfil
                </a>
              </nav>
            </div>

            <div className="pt-4 border-t border-white/10">
              <div className="flex items-center justify-between rounded-xl bg-black/40 p-3 border border-white/5">
                <div className="truncate pr-2">
                  <span className="text-xs font-bold text-white block truncate">{profile?.full_name || 'Usuario'}</span>
                  <span className="text-[10px] text-white/40 block truncate uppercase tracking-wider">{profile?.role || 'Profesional'}</span>
                </div>
                <button onClick={handleLogout} className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-600 hover:text-white transition-all cursor-pointer shrink-0">
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className={`bg-[#0D0D0D] flex flex-col justify-between shrink-0 hidden md:flex transition-all duration-300 ${isSidebarCollapsed ? 'w-20' : 'w-64'}`}>
        <div className="p-6">
          {/* Logo Brand */}
          <div className={`flex items-center justify-between gap-3 mb-8 ${isSidebarCollapsed ? 'flex-col' : ''}`}>
            <div className="flex items-center gap-3">
              <img src="/brand/logo-primary.png" alt="Logo" className="h-9 w-9 object-contain shrink-0" />
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
            <a 
              href={`/${tenantSlug}/dashboard`} 
              title="Dashboard"
              onClick={(e) => handleSidebarNavigation(e, `/${tenantSlug}/dashboard`)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-[#468DFF] font-semibold text-sm transition-all ${isSidebarCollapsed ? 'justify-center' : ''}`}
            >
              <Building className="h-4 w-4 shrink-0" />
              {!isSidebarCollapsed && <span className="animate-fade-in">Dashboard</span>}
            </a>
            <a 
              href={`/${tenantSlug}/empresas`} 
              title="Clientes"
              onClick={(e) => handleSidebarNavigation(e, `/${tenantSlug}/empresas`)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-[#468DFF] font-semibold text-sm transition-all ${isSidebarCollapsed ? 'justify-center' : ''}`}
            >
              <Users className="h-4 w-4 shrink-0" />
              {!isSidebarCollapsed && <span className="animate-fade-in">Clientes</span>}
            </a>
            {(profile?.role === 'owner' || profile?.role === 'admin') && (
              <a 
                href={`/${tenantSlug}/equipo`} 
                title="Equipo de Trabajo"
                onClick={(e) => handleSidebarNavigation(e, `/${tenantSlug}/equipo`)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-[#468DFF] font-semibold text-sm transition-all ${isSidebarCollapsed ? 'justify-center' : ''}`}
              >
                <Briefcase className="h-4 w-4 shrink-0" />
                {!isSidebarCollapsed && <span className="animate-fade-in">Equipo de Trabajo</span>}
              </a>
            )}
            <a 
              href={`/${tenantSlug}/programa`} 
              title="Programa de Gestión Anual"
              onClick={(e) => handleSidebarNavigation(e, `/${tenantSlug}/programa`)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-[#468DFF] font-semibold text-sm transition-all ${isSidebarCollapsed ? 'justify-center' : ''}`}
            >
              <Calendar className="h-4 w-4 shrink-0" />
              {!isSidebarCollapsed && <span className="animate-fade-in">Programa de Gestión Anual</span>}
            </a>
            <a 
              href={`/${tenantSlug}/capacitacion`} 
              title="Programa de Capacitación Anual"
              onClick={(e) => handleSidebarNavigation(e, `/${tenantSlug}/capacitacion`)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-[#468DFF] font-semibold text-sm transition-all ${isSidebarCollapsed ? 'justify-center' : ''}`}
            >
              <GraduationCap className="h-4 w-4 shrink-0" />
              {!isSidebarCollapsed && <span className="animate-fade-in">Programa de Capacitación Anual</span>}
            </a>
            <a 
              href={`/${tenantSlug}/correctivas`} 
              title="Acciones Correctivas"
              onClick={(e) => handleSidebarNavigation(e, `/${tenantSlug}/correctivas`)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[#468DFF] text-white font-semibold text-sm transition-all shadow-md shadow-[#468DFF]/10 ${isSidebarCollapsed ? 'justify-center' : ''}`}
            >
              <ClipboardList className="h-4 w-4 shrink-0" />
              {!isSidebarCollapsed && <span className="animate-fade-in">Acciones Correctivas</span>}
            </a>
            <a 
              href={`/${tenantSlug}/extintores`} 
              title="Extintores"
              onClick={(e) => handleSidebarNavigation(e, `/${tenantSlug}/extintores`)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-[#468DFF] font-semibold text-sm transition-all ${isSidebarCollapsed ? 'justify-center' : ''}`}
            >
              <Flame className="h-4 w-4 shrink-0" />
              {!isSidebarCollapsed && <span className="animate-fade-in">Extintores</span>}
            </a>
            <a 
              href={`/${tenantSlug}/visitas`} 
              title="Constancia de Visita"
              onClick={(e) => handleSidebarNavigation(e, `/${tenantSlug}/visitas`)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-[#468DFF] font-semibold text-sm transition-all ${isSidebarCollapsed ? 'justify-center' : ''}`}
            >
              <ClipboardCheck className="h-4.5 w-4.5 shrink-0" />
              {!isSidebarCollapsed && <span className="animate-fade-in">Constancia de Visita</span>}
            </a>

            {!isSidebarCollapsed ? (
              <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 px-3 block pt-6 mb-2">Configuración</span>
            ) : (
              <div className="h-px bg-white/10 my-6" />
            )}
            <a 
              href={`/${tenantSlug}/profile`} 
              title="Editar Perfil"
              onClick={(e) => handleSidebarNavigation(e, `/${tenantSlug}/profile`)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-[#468DFF] font-semibold text-sm transition-all ${isSidebarCollapsed ? 'justify-center' : ''}`}
            >
              <Settings className="h-4 w-4 shrink-0" />
              {!isSidebarCollapsed && <span className="animate-fade-in">Editar Perfil</span>}
            </a>
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
            <button onClick={handleLogout} className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-600 hover:text-white transition-all cursor-pointer shrink-0">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Container */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <header className="h-16 border-b border-slate-300/60 flex items-center justify-between px-6 md:px-8 bg-white/80 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 -ml-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 md:hidden cursor-pointer">
              <Menu className="h-5 w-5" />
            </button>
            <h2 className="font-outfit text-lg font-bold text-slate-900 flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-[#468DFF]" />
              Seguimiento de Acciones Correctivas
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-500 bg-slate-100 py-1.5 px-3 rounded-lg border border-slate-200">
              {tenant?.name || 'Mi Consultora'}
            </span>
            {tenant?.plan_id && (
              <span className="px-2.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/25 text-[#468DFF] text-[10px] font-semibold uppercase tracking-wider hidden sm:inline-block">
                {tenant.plan_id === 'libre' ? 'Plan Libre' : tenant.plan_id === 'standard_25' ? 'Plan 25' : tenant.plan_id === 'basic_5' ? 'Plan 5' : 'Plan Gratis'}
              </span>
            )}
          </div>
        </header>

        {loading ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-[#468DFF] mx-auto" />
              <p className="text-xs text-slate-500 font-semibold">Cargando acciones correctivas...</p>
            </div>
          </div>
        ) : (
          <div className="p-6 md:p-8 space-y-6 max-w-[95%] mx-auto w-full">
            
            {/* VISTA FORMULARIO O TABLA */}
            {isFormOpen ? (
              <div className="bg-white rounded-2xl border border-slate-150 shadow-sm overflow-hidden animate-fade-in">
                <div className="px-6 py-4 bg-slate-50 border-b border-slate-150 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={handleExitForm}
                      className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 cursor-pointer"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </button>
                    <h3 className="font-outfit text-base font-bold text-slate-900">
                      {editingId ? 'Editar Hallazgo / Acción' : 'Incorporar Nuevo Hallazgo'}
                    </h3>
                  </div>
                  <button onClick={handleExitForm} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-200 cursor-pointer">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <form onSubmit={handleSaveHallazgo} className="p-6 space-y-6">
                  
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
                        <input
                          type="date"
                          required
                          value={fecha}
                          onChange={(e) => setFecha(e.target.value)}
                          className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-600 block mb-1">
                          Nivel de Riesgo <span className="text-[#468DFF]">*</span>
                        </label>
                        <select
                          required
                          value={nivelRiesgo}
                          onChange={(e) => setNivelRiesgo(e.target.value)}
                          className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all cursor-pointer"
                        >
                          {NIVEL_RIESGO_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
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
                        <label className="text-xs font-bold text-slate-600 block mb-1">Descripción Detallada del Hallazgo</label>
                        <textarea
                          rows="3"
                          placeholder="Describe detalladamente lo observado..."
                          value={descripcionHallazgo}
                          onChange={(e) => setDescripcionHallazgo(e.target.value)}
                          className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all resize-none"
                        />
                      </div>
                    </div>

                    {/* Imagen de Respaldo */}
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-150">
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-3 flex items-center gap-1">
                        <ImageIcon className="h-4 w-4 text-[#468DFF]" />
                        Imagen de Evidencia (Hallazgo)
                      </span>
                      <div className="flex flex-col sm:flex-row items-center gap-4">
                        {imagenPreview ? (
                          <div className="relative h-32 w-32 rounded-xl overflow-hidden border border-slate-150 bg-white group shrink-0">
                            <img src={imagenPreview} alt="Vista previa" className="h-full w-full object-cover" />
                            <button
                              type="button"
                              onClick={() => {
                                setImagenFile(null);
                                setImagenPreview('');
                                setImagenPath('');
                              }}
                              className="absolute top-1 right-1 p-1 rounded-full bg-red-600 text-white shadow hover:bg-red-700 cursor-pointer transition-colors"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ) : (
                          <div className="h-32 w-32 rounded-xl border-2 border-dashed border-slate-200 bg-white flex flex-col items-center justify-center text-slate-400 shrink-0">
                            <ImageIcon className="h-8 w-8 mb-1 opacity-50" />
                            <span className="text-[9px] font-bold text-center">Sin imagen</span>
                          </div>
                        )}

                        <div className="flex flex-wrap items-center gap-3 flex-1">
                          <label className="inline-flex items-center gap-2 py-2.5 px-4 rounded-xl border border-slate-350 text-slate-700 hover:bg-slate-100 font-bold text-xs bg-white shadow-sm transition-all cursor-pointer">
                            <Upload className="h-4 w-4 text-slate-500" />
                            Seleccionar imagen
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleImagenChange}
                              className="hidden"
                            />
                          </label>

                          <label className="inline-flex items-center gap-2 py-2.5 px-4 rounded-xl border border-slate-350 text-slate-700 hover:bg-slate-100 font-bold text-xs bg-white shadow-sm transition-all cursor-pointer">
                            <Camera className="h-4 w-4 text-slate-500" />
                            Sacar foto (Cámara)
                            <input
                              type="file"
                              accept="image/*"
                              capture="environment"
                              onChange={handleImagenChange}
                              className="hidden"
                            />
                          </label>

                          <p className="text-[9px] text-slate-400 w-full mt-1">
                            Formatos soportados: JPG, PNG, GIF, WEBP. Tamaño máximo recomendado: 5 MB.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Seccion 3: Acciones y Planificación */}
                  <div className="space-y-4">
                    <span className="font-outfit text-sm font-bold text-slate-800 border-b border-slate-100 pb-1.5 uppercase tracking-wider flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-[#468DFF]" />
                      Acciones, Plazos y Responsabilidades
                    </span>
                    
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-600 block mb-1">Causa Raíz (Análisis)</label>
                        <input
                          type="text"
                          placeholder="¿Por qué ocurrió?"
                          value={causaRaiz}
                          onChange={(e) => setCausaRaiz(e.target.value)}
                          className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-600 block mb-1">Recomendación Técnica</label>
                        <input
                          type="text"
                          placeholder="Medida preventiva recomendada..."
                          value={recomendacion}
                          onChange={(e) => setRecomendacion(e.target.value)}
                          className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all"
                        />
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-600 block mb-1">Acción Preventiva Definida</label>
                        <input
                          type="text"
                          placeholder="Acción a largo plazo..."
                          value={accionPreventiva}
                          onChange={(e) => setAccionPreventiva(e.target.value)}
                          className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-600 block mb-1">Acción Correctiva Inmediata</label>
                        <input
                          type="text"
                          placeholder="Acción correctora directa..."
                          value={accionCorrectiva}
                          onChange={(e) => setAccionCorrectiva(e.target.value)}
                          className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all"
                        />
                      </div>
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
                        <input
                          type="date"
                          value={fechaPlanificada}
                          onChange={(e) => setFechaPlanificada(e.target.value)}
                          className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-600 block mb-1">Fecha de Realización / Implementación</label>
                        <input
                          type="date"
                          value={fechaImplementacion}
                          onChange={(e) => setFechaImplementacion(e.target.value)}
                          className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-600 block mb-1">Observaciones Generales</label>
                      <textarea
                        rows="3"
                        placeholder="Comentarios adicionales..."
                        value={observaciones}
                        onChange={(e) => setObservaciones(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all resize-none"
                      />
                    </div>
                  </div>

                  {/* Botones del Formulario */}
                  <div className="flex justify-between items-center pt-6 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={handleExitForm}
                      className="px-5 py-2.5 border border-slate-350 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all active:scale-[0.98] cursor-pointer"
                    >
                      Salir
                    </button>
                    <div className="flex items-center gap-3">
                      {editingId && (
                        <button
                          type="button"
                          onClick={() => handleDeleteClick(editingId)}
                          className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold transition-all active:scale-[0.98] cursor-pointer shadow-lg shadow-red-600/10"
                        >
                          Eliminar
                        </button>
                      )}
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
                    </div>
                  </div>
                </form>
              </div>
            ) : (
              // TABLA DE HALLAZGOS Y FILTROS
              <div className="space-y-6">
                
                {/* Panel de Filtros y Búsqueda */}
                <div className="bg-white rounded-2xl border border-slate-150 p-3 shadow-sm space-y-3 shrink-0">
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
                          placeholder="Buscar por descripción, área, puesto, responsable..."
                          value={filterText}
                          onChange={(e) => setFilterText(e.target.value)}
                          className="w-full pl-9 pr-4 py-1.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all text-slate-700 placeholder-slate-400"
                        />
                      </div>
                      
                      <button
                        onClick={() => setIsFormOpen(true)}
                        className="px-3.5 py-1.5 bg-[#468DFF] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-[#0511F2] transition-all cursor-pointer shadow-md shadow-[#468DFF]/10 shrink-0 w-full md:w-auto"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Incorporar Nuevo Hallazgo
                      </button>
                    </div>
                  </div>

                  {/* Selectores de Filtrado */}
                  <div className="pt-2 border-t border-slate-100 space-y-2">
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
                    
                    {showFilters && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 pt-1 animate-fade-in">
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
                            <option value="">Todos los clientes</option>
                            {empresas.map((emp) => (
                              <option key={emp.id} value={emp.id}>{emp.razon_social}</option>
                            ))}
                          </select>
                        </div>

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
                            className="border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-600 focus:outline-none focus:border-[#468DFF] text-xs w-full cursor-pointer"
                          >
                            <option value="">Todos los riesgos</option>
                            {NIVEL_RIESGO_OPTIONS.map((opt) => (
                              <option key={opt} value={opt}>{opt}</option>
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
                <div className="bg-white rounded-2xl border border-slate-150 shadow-sm overflow-hidden">
                  <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 320px)' }}>
                    <table className="w-full text-left border-collapse">
                      <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-150">
                        <tr className="bg-slate-50 border-b border-slate-150 text-xs font-bold text-slate-400 uppercase tracking-wider">
                          <th className="px-6 py-4 cursor-pointer hover:text-slate-700 select-none transition-colors" onClick={() => handleSort('cliente')}>
                            <div className="flex items-center gap-1">
                              Cliente / Establecimiento
                              {sortField === 'cliente' && (sortOrder === 'asc' ? ' ▲' : ' ▼')}
                            </div>
                          </th>
                          <th className="px-6 py-4 cursor-pointer hover:text-slate-700 select-none transition-colors" onClick={() => handleSort('fuente')}>
                            <div className="flex items-center gap-1">
                              Fuente / Fecha
                              {sortField === 'fuente' && (sortOrder === 'asc' ? ' ▲' : ' ▼')}
                            </div>
                          </th>
                          <th className="px-6 py-4 cursor-pointer hover:text-slate-700 select-none transition-colors" onClick={() => handleSort('hallazgo')}>
                            <div className="flex items-center gap-1">
                              Hallazgo / Tipo
                              {sortField === 'hallazgo' && (sortOrder === 'asc' ? ' ▲' : ' ▼')}
                            </div>
                          </th>
                          <th className="px-6 py-4 text-center cursor-pointer hover:text-slate-700 select-none transition-colors" onClick={() => handleSort('nivel_riesgo')}>
                            <div className="flex items-center justify-center gap-1">
                              Nivel Riesgo
                              {sortField === 'nivel_riesgo' && (sortOrder === 'asc' ? ' ▲' : ' ▼')}
                            </div>
                          </th>
                          <th className="px-6 py-4 text-center cursor-pointer hover:text-slate-700 select-none transition-colors" onClick={() => handleSort('estado')}>
                            <div className="flex items-center justify-center gap-1">
                              Estado
                              {sortField === 'estado' && (sortOrder === 'asc' ? ' ▲' : ' ▼')}
                            </div>
                          </th>
                          <th className="px-6 py-4 cursor-pointer hover:text-slate-700 select-none transition-colors" onClick={() => handleSort('responsable')}>
                            <div className="flex items-center gap-1">
                              Responsable
                              {sortField === 'responsable' && (sortOrder === 'asc' ? ' ▲' : ' ▼')}
                            </div>
                          </th>
                          <th className="px-6 py-4 text-right">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs font-normal text-slate-700">
                        {sortedAcciones.length === 0 ? (
                          <tr>
                            <td colSpan="7" className="py-12 px-6 text-center text-slate-400 italic">
                              No se encontraron registros de acciones correctivas.
                            </td>
                          </tr>
                        ) : (
                          sortedAcciones.map((acc) => {
                            const emp = empresas.find(e => e.id === acc.empresa_id);
                            const est = allEstablecimientos.find(t => t.id === acc.establecimiento_id);
                            const status = getCalculatedStatus(acc.fecha_planificada, acc.fecha_implementacion);
                            
                            // Color del nivel de riesgo
                            let riskBadge = 'bg-slate-100 text-slate-700 border-slate-200';
                            if (acc.nivel_riesgo === 'Riesgo trivial') riskBadge = 'bg-[#0b8043]/10 text-[#0b8043] border-[#0b8043]/20';
                            else if (acc.nivel_riesgo === 'Riesgo tolerable') riskBadge = 'bg-[#00b050]/10 text-[#00b050] border-[#00b050]/20';
                            else if (acc.nivel_riesgo === 'Riesgo moderado') riskBadge = 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20';
                            else if (acc.nivel_riesgo === 'Riesgo sustancial') riskBadge = 'bg-orange-500/10 text-orange-700 border-orange-500/20';
                            else if (acc.nivel_riesgo === 'Riesgo intolerable') riskBadge = 'bg-red-500/10 text-red-600 border-red-500/20';

                            return (
                              <tr 
                                key={acc.id} 
                                onClick={() => handleEditClick(acc)}
                                className="hover:bg-slate-50/50 transition-colors cursor-pointer"
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
                                <td className="px-6 py-4 text-center">
                                  <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-bold inline-block ${status.color}`}>
                                    {status.text}
                                  </span>
                                </td>
                                <td className="px-6 py-4 font-semibold text-slate-900">
                                  {acc.responsable || 'No asignado'}
                                </td>
                                <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                                  <div className="flex items-center justify-end gap-2">
                                    {acc.imagen_preview_url && (
                                      <a 
                                        href={acc.imagen_preview_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        title="Ver Evidencia"
                                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-all cursor-pointer inline-flex items-center"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <Eye className="h-4.5 w-4.5" />
                                      </a>
                                    )}
                                    <button
                                      onClick={() => handleEditClick(acc)}
                                      title="Editar"
                                      className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-600 transition-all cursor-pointer inline-flex items-center"
                                    >
                                      <Edit className="h-4.5 w-4.5" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteClick(acc.id)}
                                      title="Eliminar"
                                      className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition-all cursor-pointer inline-flex items-center"
                                    >
                                      <Trash2 className="h-4.5 w-4.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            )}

          </div>
        )}

      </main>

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

      {/* Notificación Toast flotante */}
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
