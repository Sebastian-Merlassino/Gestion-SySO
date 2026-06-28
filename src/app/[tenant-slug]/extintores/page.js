// src/app/[tenant-slug]/extintores/page.js
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import { supabase } from '@/lib/supabase';
import { formatDate, formatAsDateInput, convertToDbDate } from '@/lib/utils';
import ImageUploadZone from '@/components/ui/ImageUploadZone';
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
  GraduationCap,
  Image as ImageIcon,
  MapPin,
  Eye,
  ArrowLeft,
  Camera,
  Upload,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Sliders,
  Flame,
  ClipboardCheck,
  Folder
} from 'lucide-react';

const TIPO_EXTINTORES = [
  'Agua a presión (A)',
  'Agua pulverizada (A)',
  'Espuma AFFF (AB)',
  'CO2 (BC)',
  'Polvo químico seco (ABC)',
  'Polvo químico seco (BC)',
  'Polvo químico seco (D)',
  'FM200 (ABC)',
  'FE-36 (ABC)',
  'Acetato de Potasio (K)',
  'Cloruro Sódico (D)',
  'NOVEC 1230 (ABC)',
  'Otro'
];

const PRESION_OPTIONS = ['Ok', 'Despresurizado', 'Sobrepresurizado', 'N/A'];
const CHECK_OPTIONS = ['Ok', 'No Ok', 'N/A'];

export default function ExtintoresPage({ params }) {
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
  const [empresas, setEmpresas] = useState([]);
  const [allEstablecimientos, setAllEstablecimientos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDevMode, setIsDevMode] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isReadOnlyView, setIsReadOnlyView] = useState(false);

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

  const sectionPerms = getSectionPermissions(profile, 'extintores');
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

  // Datos principales de extintores
  const [extintores, setExtintores] = useState([]);

  // Estados del CRUD / Vista Formulario
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Campos del Formulario
  const [empresaId, setEmpresaId] = useState('');
  const [establecimientoId, setEstablecimientoId] = useState('');
  const [areaSector, setAreaSector] = useState('');
  const [puestoOperacionRef, setPuestoOperacionRef] = useState('');
  const [nPuesto, setNPuesto] = useState('');
  const [nExtintor, setNExtintor] = useState('');
  const [tipo, setTipo] = useState('');
  const [tipoOtro, setTipoOtro] = useState('');
  const [capacidad, setCapacidad] = useState('');
  const [vencRecarga, setVencRecarga] = useState('');
  const [vencPh, setVencPh] = useState('');
  const [presion, setPresion] = useState('N/A');
  const [precinto, setPrecinto] = useState('N/A');
  const [marbete, setMarbete] = useState('N/A');
  const [partesMecanicas, setPartesMecanicas] = useState('N/A');
  const [mangueraBoquilla, setMangueraBoquilla] = useState('N/A');
  const [cilindro, setCilindro] = useState('N/A');
  const [senalizacion, setSenalizacion] = useState('N/A');
  
  // Archivo e Imagenes
  const [imagenFile, setImagenFile] = useState(null);
  const [imagenPreview, setImagenPreview] = useState('');
  const [imagenPath, setImagenPath] = useState(''); 

  const [fechaControl, setFechaControl] = useState('');
  const [observaciones, setObservaciones] = useState('');

  // Filtros
  const [filterText, setFilterText] = useState('');
  const [filterEmpresa, setFilterEmpresa] = useState('');
  const [filterEstablecimiento, setFilterEstablecimiento] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [filterTipo, setFilterTipo] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setShowFilters(false);
    }
  }, []);

  // Ordenamiento
  const [sortField, setSortField] = useState('n_extintor');
  const [sortOrder, setSortOrder] = useState('asc');

  // Modales y Feedback
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [modalAlert, setModalAlert] = useState({ show: false, title: '', message: '', onConfirm: null, confirmText: 'Confirmar' });
  const [saveLoading, setSaveLoading] = useState(false);

  // Cargar datos
  useEffect(() => {
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
            window.location.href = `/${homeTen.slug}/extintores`;
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
            window.location.href = `/${homeTen.slug}/extintores`;
            return;
          }
        }
        window.location.href = '/login';
        return;
      }

      setTenant(ten);

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

      // 5. Extintores
      let extsQuery = supabase
        .from('extintores')
        .select('*')
        .eq('tenant_id', ten.id);
      if (prof.role === 'cliente') {
        extsQuery = extsQuery.eq('empresa_id', prof.empresa_id);
      }
      const { data: exts, error: extErr } = await extsQuery.order('created_at', { ascending: false });
      if (extErr) throw extErr;

      // Recopilar paths de Supabase para firmar en lote (en una sola llamada de red)
      const pathsToSign = [];
      (exts || []).forEach(ext => {
        if (ext.imagen_url && ext.imagen_url !== 'N/A') {
          if (!ext.imagen_url.startsWith('http://') && !ext.imagen_url.startsWith('https://')) {
            pathsToSign.push(ext.imagen_url);
          }
        }
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
          console.error('Error al firmar URLs de extintores en lote:', e);
        }
      }

      const resolvedExtintores = (exts || []).map(ext => {
        let signedUrl = '';
        if (ext.imagen_url && ext.imagen_url !== 'N/A') {
          if (ext.imagen_url.startsWith('http://') || ext.imagen_url.startsWith('https://')) {
            signedUrl = ext.imagen_url;
          } else {
            signedUrl = signedUrlsMap[ext.imagen_url] || '';
          }
        }
        return {
          ...ext,
          imagen_preview_url: signedUrl
        };
      });

      setExtintores(resolvedExtintores);
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
    setExtintores([
      {
        id: 'mock-ext-1',
        empresa_id: 'mock-empresa-1',
        establecimiento_id: 'mock-est-1',
        area_sector: 'Cocina Planta Alta',
        puesto_operacion_ref: 'Salida de emergencia',
        n_puesto: 'P1',
        n_extintor: '001542',
        tipo: 'Acetato de Potasio (K)',
        capacidad: 6,
        venc_recarga: '2026-12-10',
        venc_ph: '2027-06-15',
        presion: 'Ok',
        precinto: 'Ok',
        marbete: 'Ok',
        partes_mecanicas: 'Ok',
        manguera_boquilla: 'Ok',
        cilindro: 'Ok',
        senalizacion: 'Ok',
        imagen_url: '',
        fecha_control: '2026-06-10',
        observaciones: 'Sin novedades. Ubicación despejada.'
      },
      {
        id: 'mock-ext-2',
        empresa_id: 'mock-empresa-1',
        establecimiento_id: 'mock-est-2',
        area_sector: 'Depósito Central',
        puesto_operacion_ref: 'Cerca de portón de carga',
        n_puesto: 'P5',
        n_extintor: '001289',
        tipo: 'Polvo químico seco (ABC)',
        capacidad: 10,
        venc_recarga: '2026-05-18', // Vencido
        venc_ph: '2028-04-10',
        presion: 'Ok',
        precinto: 'Ok',
        marbete: 'Ok',
        partes_mecanicas: 'Ok',
        manguera_boquilla: 'Ok',
        cilindro: 'Ok',
        senalizacion: 'Ok',
        imagen_url: '',
        fecha_control: '2026-05-20',
        observaciones: 'Vencida la recarga anual.'
      }
    ]);
    setLoading(false);
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
    if (isDevMode) return `mock-path/extintor_${Date.now()}_${file.name}`;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No autorizado');

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/extintor_${Date.now()}.${fileExt}`;

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

  // Cálculo dinámico de estado
  const getCalculatedEstado = (recarga, ph) => {
    if (!recarga && !ph) return { text: '', color: '' };
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let isVencido = false;
    let hasDate = false;

    if (recarga) {
      hasDate = true;
      const recDate = new Date(recarga + 'T00:00:00');
      recDate.setHours(0, 0, 0, 0);
      if (recDate < today) isVencido = true;
    }

    if (ph) {
      hasDate = true;
      const phDate = new Date(ph + 'T00:00:00');
      phDate.setHours(0, 0, 0, 0);
      if (phDate < today) isVencido = true;
    }

    if (!hasDate) return { text: '', color: '' };
    if (isVencido) {
      return { text: 'Vencido', color: 'bg-red-500/10 text-red-600 border-red-500/20' };
    }
    return { text: 'Vigente', color: 'bg-[#00b050]/10 text-[#00b050] border-[#00b050]/20' };
  };

  // Guardado
  const handleSaveExtintor = async (e) => {
    e.preventDefault();
    if (!empresaId || !establecimientoId) {
      triggerToast('La Razón Social y el Establecimiento son obligatorios.', 'error');
      return;
    }

    setSaveLoading(true);
    try {
      let finalImagenUrl = imagenPath;

      // Subir archivo si hay
      if (imagenFile) {
        finalImagenUrl = await uploadImageToStorage(imagenFile);
      }

      const dbTipo = tipo === 'Otro' ? tipoOtro.trim() : tipo;

      const payload = {
        tenant_id: tenant.id,
        empresa_id: empresaId,
        establecimiento_id: establecimientoId,
        area_sector: areaSector || null,
        puesto_operacion_ref: puestoOperacionRef || null,
        n_puesto: nPuesto || null,
        n_extintor: nExtintor || null,
        tipo: dbTipo || null,
        capacidad: capacidad ? parseInt(capacidad) : null,
        venc_recarga: convertToDbDate(vencRecarga) || null,
        venc_ph: convertToDbDate(vencPh) || null,
        presion: presion || null,
        precinto: precinto || null,
        marbete: marbete || null,
        partes_mecanicas: partesMecanicas || null,
        manguera_boquilla: mangueraBoquilla || null,
        cilindro: cilindro || null,
        senalizacion: senalizacion || null,
        imagen_url: finalImagenUrl || null,
        fecha_control: convertToDbDate(fechaControl) || null,
        observaciones: observaciones || null,
        updated_at: new Date().toISOString()
      };

      if (isDevMode) {
        const updatedExt = {
          ...payload,
          id: editingId || `mock-ext-${Date.now()}`
        };
        if (editingId) {
          setExtintores(extintores.map(x => x.id === editingId ? updatedExt : x));
          triggerToast('Extintor actualizado exitosamente (Mock).');
        } else {
          setExtintores([updatedExt, ...extintores]);
          triggerToast('Extintor incorporado exitosamente (Mock).');
        }
      } else {
        if (editingId) {
          const { error } = await supabase
            .from('extintores')
            .update(payload)
            .eq('id', editingId);
          if (error) throw error;
          triggerToast('Extintor actualizado exitosamente.');
        } else {
          const { error } = await supabase
            .from('extintores')
            .insert([{ ...payload, created_at: new Date().toISOString() }]);
          if (error) throw error;
          triggerToast('Extintor incorporado exitosamente.');
        }
        await loadRealData();
      }

      handleCloseForm();
    } catch (err) {
      console.error('Error al guardar extintor:', err);
      triggerToast(err.message || 'Error al guardar el extintor.', 'error');
    } finally {
      setSaveLoading(false);
    }
  };

  // Carga para Edición
  const handleEditClick = (ext) => {
    setEditingId(ext.id);
    setEmpresaId(ext.empresa_id);
    setEstablecimientoId(ext.establecimiento_id);
    setAreaSector(ext.area_sector || '');
    setPuestoOperacionRef(ext.puesto_operacion_ref || '');
    setNPuesto(ext.n_puesto || '');
    setNExtintor(ext.n_extintor || '');

    if (TIPO_EXTINTORES.includes(ext.tipo)) {
      setTipo(ext.tipo);
      setTipoOtro('');
    } else if (ext.tipo) {
      setTipo('Otro');
      setTipoOtro(ext.tipo);
    } else {
      setTipo('');
      setTipoOtro('');
    }

    setCapacidad(ext.capacidad || '');
    setVencRecarga(formatDate(ext.venc_recarga) || '');
    setVencPh(formatDate(ext.venc_ph) || '');
    setPresion(ext.presion || 'N/A');
    setPrecinto(ext.precinto || 'N/A');
    setMarbete(ext.marbete || 'N/A');
    setPartesMecanicas(ext.partes_mecanicas || 'N/A');
    setMangueraBoquilla(ext.manguera_boquilla || 'N/A');
    setCilindro(ext.cilindro || 'N/A');
    setSenalizacion(ext.senalizacion || 'N/A');

    setImagenFile(null);
    setImagenPreview(ext.imagen_preview_url || '');
    setImagenPath(ext.imagen_url || '');
    
    setFechaControl(formatDate(ext.fecha_control) || '');
    setObservaciones(ext.observaciones || '');

    setIsFormOpen(true);
  };

  // Confirmar Eliminación
  const handleDeleteClick = (id) => {
    setModalAlert({
      show: true,
      title: '¿Eliminar Extintor?',
      message: 'Esta acción eliminará de forma permanente el registro del extintor seleccionado y no se podrá deshacer.',
      confirmText: 'Eliminar',
      onConfirm: async () => {
        try {
          if (isDevMode) {
            setExtintores(extintores.filter(x => x.id !== id));
            triggerToast('Extintor eliminado exitosamente (Mock).');
            handleCloseForm();
          } else {
            const { error } = await supabase
              .from('extintores')
              .delete()
              .eq('id', id);
            if (error) throw error;
            triggerToast('Extintor eliminado exitosamente.');
            handleCloseForm();
            await loadRealData();
          }
        } catch (err) {
          console.error('Error al eliminar:', err);
          triggerToast('Error al eliminar el extintor.', 'error');
        } finally {
          closeAlert();
        }
      }
    });
  };

  // Cierre del Formulario (con advertencia si hay cambios)
  const handleExitForm = () => {
    if (isReadOnlyView) {
      handleCloseForm();
      return;
    }
    setModalAlert({
      show: true,
      title: 'Salir sin guardar',
      message: '¿Estás seguro de que deseas salir? Los cambios no guardados se perderán.',
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
        if (path.endsWith('/extintores')) {
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
          if (path.endsWith('/extintores')) {
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
    setAreaSector('');
    setPuestoOperacionRef('');
    setNPuesto('');
    setNExtintor('');
    setTipo('');
    setTipoOtro('');
    setCapacidad('');
    setVencRecarga('');
    setVencPh('');
    setPresion('N/A');
    setPrecinto('N/A');
    setMarbete('N/A');
    setPartesMecanicas('N/A');
    setMangueraBoquilla('N/A');
    setCilindro('N/A');
    setSenalizacion('N/A');
    setImagenFile(null);
    setImagenPreview('');
    setImagenPath('');
    setFechaControl('');
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

  // Filtrado de extintores
  const filteredExtintores = extintores.filter((ext) => {
    if (filterText) {
      const query = filterText.toLowerCase();
      const nExt = (ext.n_extintor || '').toLowerCase();
      const nPuestoStr = (ext.n_puesto || '').toLowerCase();
      const area = (ext.area_sector || '').toLowerCase();
      const ref = (ext.puesto_operacion_ref || '').toLowerCase();
      
      if (!nExt.includes(query) && !nPuestoStr.includes(query) && !area.includes(query) && !ref.includes(query)) {
        return false;
      }
    }

    if (filterEmpresa && ext.empresa_id !== filterEmpresa) return false;
    if (filterEstablecimiento && ext.establecimiento_id !== filterEstablecimiento) return false;
    if (filterTipo && ext.tipo !== filterTipo) return false;

    if (filterEstado) {
      const calc = getCalculatedEstado(ext.venc_recarga, ext.venc_ph);
      if (calc.text !== filterEstado) return false;
    }

    return true;
  });

  const sortedExtintores = [...filteredExtintores].sort((a, b) => {
    if (!sortField) return 0;

    let valA = '';
    let valB = '';

    if (sortField === 'cliente') {
      const empA = empresas.find(e => e.id === a.empresa_id);
      const empB = empresas.find(e => e.id === b.empresa_id);
      valA = empA ? empA.razon_social.toLowerCase() : '';
      valB = empB ? empB.razon_social.toLowerCase() : '';
    } else if (sortField === 'establecimiento') {
      const estA = allEstablecimientos.find(t => t.id === a.establecimiento_id);
      const estB = allEstablecimientos.find(t => t.id === b.establecimiento_id);
      valA = estA ? estA.denominacion.toLowerCase() : '';
      valB = estB ? estB.denominacion.toLowerCase() : '';
    } else if (sortField === 'n_extintor') {
      valA = a.n_extintor || '';
      valB = b.n_extintor || '';
    } else if (sortField === 'tipo') {
      valA = a.tipo || '';
      valB = b.tipo || '';
    } else if (sortField === 'capacidad') {
      valA = a.capacidad || 0;
      valB = b.capacidad || 0;
    } else if (sortField === 'estado') {
      const statusA = getCalculatedEstado(a.venc_recarga, a.venc_ph).text;
      const statusB = getCalculatedEstado(b.venc_recarga, b.venc_ph).text;
      valA = statusA.toLowerCase();
      valB = statusB.toLowerCase();
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
      
      {/* Sidebar (Desktop & Mobile) */}
      <Sidebar
        tenantSlug={tenantSlug}
        profile={profile}
        currentSection="extintores"
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
            <Flame className="h-5 w-5 text-[#468DFF] shrink-0" />
            <h1 className="font-outfit text-base md:text-lg font-bold text-slate-900 truncate leading-none">
              Control de Extintores
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
              <p className="text-xs text-slate-500 font-semibold">Cargando equipos extintores...</p>
            </div>
          </div>
        ) : (
          <div className="p-6 md:p-8 space-y-6 max-w-[95%] mx-auto w-full">
            
            {isFormOpen ? (
              // FORMULARIO DE ALTA Y EDICIÓN INLINE
              <div className="bg-white rounded-2xl border border-slate-150 shadow-sm overflow-hidden animate-fade-in">
                <div className="h-16 px-4 md:px-6 bg-slate-50 border-b border-slate-150 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={handleExitForm}
                      className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 cursor-pointer"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </button>
                    <span className="font-outfit text-base font-bold text-slate-900">
                      {editingId ? 'Editar Equipo Extintor' : 'Registrar Nuevo Extintor'}
                    </span>
                  </div>
                  <button type="button" onClick={handleExitForm} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-200 cursor-pointer">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <form onSubmit={handleSaveExtintor} className="p-6 space-y-6">
                  <fieldset disabled={!canEdit} className="space-y-6">
                  
                  {/* Seccion 1: Identificación y Ubicación */}
                  <div className="space-y-4">
                    <h3 className="font-outfit text-sm font-bold text-slate-800 border-b border-slate-100 pb-1.5 uppercase tracking-wider flex items-center gap-2">
                      <Building className="h-4 w-4 text-[#468DFF]" />
                      1. Ubicación e Identificación
                    </h3>
                    
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-600">Cliente / Razón Social *</label>
                        <select
                          required
                          value={empresaId}
                          onChange={(e) => { setEmpresaId(e.target.value); setEstablecimientoId(''); }}
                          className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all cursor-pointer"
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
                          disabled={!empresaId}
                          value={establecimientoId}
                          onChange={(e) => setEstablecimientoId(e.target.value)}
                          className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all cursor-pointer disabled:bg-slate-100 disabled:text-slate-400"
                        >
                          <option value="">{!empresaId ? 'Selecciona un cliente primero' : 'Selecciona un establecimiento'}</option>
                          {filteredEstablecimientos.map(est => (
                            <option key={est.id} value={est.id}>{est.denominacion}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-600">Área / Sector</label>
                        <input
                          type="text"
                          placeholder="Ej: Cocina, Oficinas 1er Piso..."
                          value={areaSector}
                          onChange={(e) => setAreaSector(e.target.value)}
                          className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all"
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-600">Puesto / Operación / Referencia</label>
                        <input
                          type="text"
                          placeholder="Ej: Cerca de salida de emergencia..."
                          value={puestoOperacionRef}
                          onChange={(e) => setPuestoOperacionRef(e.target.value)}
                          className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all"
                        />
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-600">N° de Puesto</label>
                        <input
                          type="text"
                          placeholder="Ej: P01"
                          value={nPuesto}
                          onChange={(e) => setNPuesto(e.target.value)}
                          className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all"
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-600">N° de Extintor</label>
                        <input
                          type="text"
                          placeholder="Ej: 004812"
                          value={nExtintor}
                          onChange={(e) => setNExtintor(e.target.value)}
                          className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Seccion 2: Características Técnicas y Fechas */}
                  <div className="space-y-4">
                    <h3 className="font-outfit text-sm font-bold text-slate-800 border-b border-slate-100 pb-1.5 uppercase tracking-wider flex items-center gap-2">
                      <Sliders className="h-4 w-4 text-[#468DFF]" />
                      2. Especificaciones Técnicas y Vencimientos
                    </h3>
                    
                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-600">Tipo de Extintor</label>
                        <select
                          value={tipo}
                          onChange={(e) => setTipo(e.target.value)}
                          className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all cursor-pointer"
                        >
                          <option value="">Selecciona tipo</option>
                          {TIPO_EXTINTORES.map(t => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      </div>

                      {tipo === 'Otro' && (
                        <div className="flex flex-col gap-1.5 md:col-span-2">
                          <label className="text-xs font-bold text-slate-600">Especificar otro tipo <span className="text-red-500">*</span></label>
                          <input
                            required
                            type="text"
                            placeholder="Ej: Halotrón, Arena..."
                            value={tipoOtro}
                            onChange={(e) => setTipoOtro(e.target.value)}
                            className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all"
                          />
                        </div>
                      )}

                      <div className={`flex flex-col gap-1.5 ${tipo === 'Otro' ? 'md:col-span-3' : 'md:col-span-2'}`}>
                        <label className="text-xs font-bold text-slate-600">Capacidad [Kg] / [l]</label>
                        <input
                          type="number"
                          placeholder="Ej: 5, 10, 6..."
                          value={capacidad}
                          onChange={(e) => setCapacidad(e.target.value)}
                          className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all"
                        />
                      </div>
                    </div>

                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-600">Vencimiento de Recarga</label>
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="DD/MM/YYYY"
                            maxLength={10}
                            value={vencRecarga}
                            onChange={(e) => setVencRecarga(formatAsDateInput(e.target.value))}
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
                                    setVencRecarga(`${parts[2]}/${parts[1]}/${parts[0]}`);
                                  }
                                }
                              }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-600">Vencimiento P.H. (Prueba Hidráulica)</label>
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="DD/MM/YYYY"
                            maxLength={10}
                            value={vencPh}
                            onChange={(e) => setVencPh(formatAsDateInput(e.target.value))}
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
                                    setVencPh(`${parts[2]}/${parts[1]}/${parts[0]}`);
                                  }
                                }
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Seccion 3: Inspección y Estado Visual */}
                  <div className="space-y-4">
                    <h3 className="font-outfit text-sm font-bold text-slate-800 border-b border-slate-100 pb-1.5 uppercase tracking-wider flex items-center gap-2">
                      <Eye className="h-4 w-4 text-[#468DFF]" />
                      3. Inspección y Estado Visual
                    </h3>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-600">Presión</label>
                        <select
                          value={presion}
                          onChange={(e) => setPresion(e.target.value)}
                          className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all cursor-pointer"
                        >
                          {PRESION_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-600">Precinto</label>
                        <select
                          value={precinto}
                          onChange={(e) => setPrecinto(e.target.value)}
                          className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all cursor-pointer"
                        >
                          {CHECK_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-600">Marbete</label>
                        <select
                          value={marbete}
                          onChange={(e) => setMarbete(e.target.value)}
                          className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all cursor-pointer"
                        >
                          {CHECK_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-600">Partes Mecánicas</label>
                        <select
                          value={partesMecanicas}
                          onChange={(e) => setPartesMecanicas(e.target.value)}
                          className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all cursor-pointer"
                        >
                          {CHECK_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-600">Manguera / Boquilla</label>
                        <select
                          value={mangueraBoquilla}
                          onChange={(e) => setMangueraBoquilla(e.target.value)}
                          className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all cursor-pointer"
                        >
                          {CHECK_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-600">Cilindro</label>
                        <select
                          value={cilindro}
                          onChange={(e) => setCilindro(e.target.value)}
                          className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all cursor-pointer"
                        >
                          {CHECK_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-600">Señalización</label>
                        <select
                          value={senalizacion}
                          onChange={(e) => setSenalizacion(e.target.value)}
                          className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all cursor-pointer"
                        >
                          {CHECK_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </div>
                    </div>

                    {/* Foto / Evidencia de Control */}
                    <div>
                      <ImageUploadZone
                        label="Imagen / Evidencia Fotográfica"
                        preview={imagenPreview}
                        onFileChange={(file) => {
                          setImagenFile(file);
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setImagenPreview(reader.result);
                          };
                          reader.readAsDataURL(file);
                        }}
                        onClear={() => {
                          setImagenFile(null);
                          setImagenPreview('');
                          setImagenPath('');
                        }}
                        disabled={!canEdit}
                        maxSizeMB={5}
                        onToast={triggerToast}
                      />
                    </div>
                  </div>

                  {/* Seccion 4: Fecha Control y Comentarios */}
                  <div className="space-y-4">
                    <h3 className="font-outfit text-sm font-bold text-slate-800 border-b border-slate-100 pb-1.5 uppercase tracking-wider flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-[#468DFF]" />
                      4. Control y Trazabilidad
                    </h3>
                    
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-600">Fecha de Control</label>
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="DD/MM/YYYY"
                            maxLength={10}
                            value={fechaControl}
                            onChange={(e) => setFechaControl(formatAsDateInput(e.target.value))}
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
                                    setFechaControl(`${parts[2]}/${parts[1]}/${parts[0]}`);
                                  }
                                }
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-slate-600">Observaciones Generales</label>
                      <textarea
                        rows="3"
                        placeholder="Comentarios o aclaraciones sobre el estado del extintor..."
                        value={observaciones}
                        onChange={(e) => setObservaciones(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all resize-none"
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
              // TABLA DE LISTADO Y FILTROS
              <div className="space-y-6">
                
                {/* Panel de Filtros y Búsqueda */}
                <div className="bg-white rounded-2xl border border-slate-150 p-3 shadow-sm space-y-3 shrink-0">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    {/* Espaciador para empujar el buscador y botón a la derecha en desktop */}
                    <div className="hidden md:block flex-1"></div>

                    {/* Buscador y Botón agrupados */}
                    <div className="flex flex-col md:flex-row md:items-center gap-3 w-full md:w-auto">
                      <div className="relative w-full md:w-72">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
                        <input
                          type="text"
                          placeholder="Buscar por N° de Extintor, N° de puesto, sector, referencia..."
                          value={filterText}
                          onChange={(e) => setFilterText(e.target.value)}
                          className="w-full pl-9 pr-4 py-1.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all text-slate-700 placeholder-slate-400"
                        />
                      </div>
                      
                      {canCargar && (
                        <button
                          onClick={() => { setIsReadOnlyView(false); setIsFormOpen(true); }}
                          className="px-3.5 py-1.5 bg-[#468DFF] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-[#0511F2] transition-all cursor-pointer shadow-md shadow-[#468DFF]/10 shrink-0 w-full md:w-auto"
                        >
                          <PlusCircle className="h-3.5 w-3.5" />
                          Incorporar Nuevo Extintor
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Selectores de Filtrado */}
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

                      {(filterEmpresa || filterEstablecimiento || filterEstado || filterTipo || filterText) && (
                        <button 
                          onClick={() => {
                            setFilterEmpresa('');
                            setFilterEstablecimiento('');
                            setFilterEstado('');
                            setFilterTipo('');
                            setFilterText('');
                          }}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[10px] font-semibold cursor-pointer transition-all border border-slate-200"
                        >
                          Limpiar Filtros
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

                        {/* Selector Estado */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Filtrar por Estado</label>
                          <select
                            value={filterEstado}
                            onChange={(e) => setFilterEstado(e.target.value)}
                            className="border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-600 focus:outline-none focus:border-[#468DFF] text-xs w-full cursor-pointer"
                          >
                            <option value="">Todos los estados</option>
                            <option value="Vigente">Vigente</option>
                            <option value="Vencido">Vencido</option>
                          </select>
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
                            {TIPO_EXTINTORES.map((t) => (
                              <option key={t} value={t}>{t}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Listado / Tabla */}
                <div className="bg-white rounded-2xl border border-slate-150 shadow-sm overflow-hidden flex flex-col" style={{ height: showFilters ? 'calc(100vh - 310px)' : 'calc(100vh - 240px)' }}>
                  <div className="overflow-auto flex-grow">
                    <table className="w-full text-left border-collapse min-w-[850px]">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-150 text-xs font-bold text-slate-400 uppercase tracking-wider">
                          <th className="sticky top-0 z-10 bg-slate-50 border-b border-slate-150 py-4 px-6 cursor-pointer hover:text-slate-700 select-none transition-colors" onClick={() => handleSort('cliente')}>
                            Cliente / Establecimiento
                            {sortField === 'cliente' && (sortOrder === 'asc' ? ' ▲' : ' ▼')}
                          </th>
                          <th className="sticky top-0 z-10 bg-slate-50 border-b border-slate-150 py-4 px-4 cursor-pointer hover:text-slate-700 select-none transition-colors" onClick={() => handleSort('n_extintor')}>
                            N° Ext / Puesto / Sector
                            {sortField === 'n_extintor' && (sortOrder === 'asc' ? ' ▲' : ' ▼')}
                          </th>
                          <th className="sticky top-0 z-10 bg-slate-50 border-b border-slate-150 py-4 px-4 cursor-pointer hover:text-slate-700 select-none transition-colors" onClick={() => handleSort('tipo')}>
                            Tipo / Capacidad
                            {sortField === 'tipo' && (sortOrder === 'asc' ? ' ▲' : ' ▼')}
                          </th>
                          <th className="sticky top-0 z-10 bg-slate-50 border-b border-slate-150 py-4 px-4 text-center cursor-pointer hover:text-slate-700 select-none transition-colors" onClick={() => handleSort('venc_recarga')}>
                            Venc. Recarga
                            {sortField === 'venc_recarga' && (sortOrder === 'asc' ? ' ▲' : ' ▼')}
                          </th>
                          <th className="sticky top-0 z-10 bg-slate-50 border-b border-slate-150 py-4 px-4 text-center cursor-pointer hover:text-slate-700 select-none transition-colors" onClick={() => handleSort('venc_ph')}>
                            Venc. P.H.
                            {sortField === 'venc_ph' && (sortOrder === 'asc' ? ' ▲' : ' ▼')}
                          </th>
                          <th className="sticky top-0 z-10 bg-slate-50 border-b border-slate-150 py-4 px-4 text-center cursor-pointer hover:text-slate-700 select-none transition-colors" onClick={() => handleSort('estado')}>
                            Estado
                            {sortField === 'estado' && (sortOrder === 'asc' ? ' ▲' : ' ▼')}
                          </th>
                          {(canEditar || canEliminar || profile?.role === 'cliente') && <th className="sticky top-0 z-10 bg-slate-50 border-b border-slate-150 py-4 px-6 text-right">Acciones</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-sm">
                        {sortedExtintores.length === 0 ? (
                          <tr>
                            <td colSpan={(canEditar || canEliminar || profile?.role === 'cliente') ? 7 : 6} className="text-center py-20 text-slate-400 font-bold bg-slate-50/10">
                              <Flame className="h-10 w-10 mx-auto mb-2 text-slate-350 shrink-0" />
                              <p className="font-outfit text-sm text-slate-700">No hay extintores registrados</p>
                              <p className="text-[11px] text-slate-400 font-normal mt-1">Registra un nuevo extintor para comenzar.</p>
                              {canCargar && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setIsReadOnlyView(false);
                                    setEditingId(null);
                                    handleCloseForm();
                                    setTimeout(() => setIsFormOpen(true), 0);
                                  }}
                                  className="mt-3 text-xs text-[#468DFF] hover:underline font-bold block mx-auto"
                                >
                                  + Registrar el primero
                                </button>
                              )}
                            </td>
                          </tr>
                        ) : (
                          sortedExtintores.map((ext) => {
                            const emp = empresas.find(e => e.id === ext.empresa_id);
                            const est = allEstablecimientos.find(t => t.id === ext.establecimiento_id);
                            const status = getCalculatedEstado(ext.venc_recarga, ext.venc_ph);

                            return (
                              <tr 
                                key={ext.id} 
                                onClick={() => {
                                  setIsReadOnlyView(true);
                                  handleEditClick(ext);
                                }}
                                className="hover:bg-slate-50/50 cursor-pointer"
                              >
                                <td className="py-4 px-6">
                                  <span className="font-semibold text-slate-900 block">{emp?.razon_social || 'Desconocido'}</span>
                                  <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5 font-medium">
                                    <MapPin className="h-3 w-3 shrink-0" />
                                    {est?.denominacion || 'Único'}
                                  </span>
                                </td>
                                <td className="py-4 px-4">
                                  <span className="font-semibold text-slate-900 block">N° {ext.n_extintor || 'S/N'}</span>
                                  <span className="text-[10px] text-slate-500 font-medium block">Puesto: {ext.n_puesto || 'S/D'}</span>
                                  <span className="text-[10px] text-slate-400 block truncate max-w-[150px] font-medium">{ext.area_sector || 'S/D'}</span>
                                </td>
                                <td className="py-4 px-4">
                                  <span className="font-medium text-slate-600 block max-w-[150px] truncate" title={ext.tipo}>{ext.tipo || 'S/D'}</span>
                                  <span className="text-[10px] text-slate-400 block mt-0.5 font-medium">{ext.capacidad ? `${ext.capacidad} Kg / l` : 'S/D'}</span>
                                </td>
                                <td className="py-4 px-4 text-center font-mono text-[10px] text-slate-500 font-medium">
                                  {ext.venc_recarga ? formatDate(ext.venc_recarga) : 'S/D'}
                                </td>
                                <td className="py-4 px-4 text-center font-mono text-[10px] text-slate-500 font-medium">
                                  {ext.venc_ph ? formatDate(ext.venc_ph) : 'S/D'}
                                </td>
                                <td className="py-4 px-4 text-center">
                                  {status.text ? (
                                    <span className={`px-2.5 py-0.5 rounded-md border text-[10px] font-bold inline-block uppercase tracking-wider ${status.color}`}>
                                      {status.text}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 italic text-[10px]">S/Fechas</span>
                                  )}
                                </td>
                                  {(canEditar || canEliminar || profile?.role === 'cliente') && (
                                    <td className="py-4 px-6 text-right" onClick={(e) => e.stopPropagation()}>
                                      <div className="flex items-center justify-end gap-2">
                                        {ext.imagen_preview_url && (
                                          <a 
                                            href={ext.imagen_preview_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            title="Ver Foto"
                                            className="p-1.5 rounded-lg bg-blue-50 text-[#468DFF] hover:bg-blue-100 hover:text-[#0511F2] transition-colors inline-flex items-center justify-center shadow-sm"
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            <ImageIcon className="h-4.5 w-4.5" />
                                          </a>
                                        )}
                                        {canEditar ? (
                                          <button
                                            onClick={() => {
                                              setIsReadOnlyView(false);
                                              handleEditClick(ext);
                                            }}
                                            title="Editar"
                                            className="p-1.5 rounded-lg transition-all cursor-pointer bg-amber-50 hover:bg-amber-100 text-amber-600 inline-flex items-center"
                                          >
                                            <Edit className="h-4.5 w-4.5" />
                                          </button>
                                        ) : (
                                          <button
                                            onClick={() => {
                                              setIsReadOnlyView(true);
                                              handleEditClick(ext);
                                            }}
                                            title="Ver Detalle"
                                            className="p-1.5 rounded-lg transition-all cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-600 inline-flex items-center"
                                          >
                                            <Eye className="h-4.5 w-4.5" />
                                          </button>
                                        )}
                                        {canEliminar && (
                                          <button
                                            onClick={() => handleDeleteClick(ext.id)}
                                            title="Eliminar"
                                            className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition-all cursor-pointer"
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
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Alertas y Confirmaciones */}
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

      {/* Toast notifications */}
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
