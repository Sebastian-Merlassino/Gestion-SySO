// src/app/[tenant-slug]/extintores/page.js
'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Plus, 
  Search, 
  Building, 
  Users, 
  X, 
  Check, 
  Loader2, 
  Trash2, 
  Edit, 
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
  Sliders,
  Flame
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
  const [profile, setProfile] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [empresas, setEmpresas] = useState([]);
  const [allEstablecimientos, setAllEstablecimientos] = useState([]);
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

  // Datos principales de extintores
  const [extintores, setExtintores] = useState([]);

  // Estados del CRUD / Vista Formulario
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

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

      // 1. Perfil
      const { data: prof, error: pErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      if (pErr) throw pErr;
      setProfile(prof);

      // 2. Tenant
      const { data: ten, error: tErr } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', prof.tenant_id)
        .single();
      if (tErr) throw tErr;
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

      // 5. Extintores
      const { data: exts, error: extErr } = await supabase
        .from('extintores')
        .select('*')
        .eq('tenant_id', ten.id)
        .order('created_at', { ascending: false });
      if (extErr) throw extErr;

      // Resuelve URLs firmadas para las imágenes
      const resolvedExtintores = await Promise.all((exts || []).map(async (ext) => {
        let signedUrl = '';
        if (ext.imagen_url) {
          try {
            const { data, error: signErr } = await supabase.storage
              .from('documents')
              .createSignedUrl(ext.imagen_url, 3600, { download: false });
            if (!signErr && data) {
              signedUrl = data.signedUrl;
            }
          } catch (e) {
            console.error('Error resolviendo URL firmada:', e);
          }
        }
        return {
          ...ext,
          imagen_preview_url: signedUrl
        };
      }));

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
        venc_recarga: vencRecarga || null,
        venc_ph: vencPh || null,
        presion: presion || null,
        precinto: precinto || null,
        marbete: marbete || null,
        partes_mecanicas: partesMecanicas || null,
        manguera_boquilla: mangueraBoquilla || null,
        cilindro: cilindro || null,
        senalizacion: senalizacion || null,
        imagen_url: finalImagenUrl || null,
        fecha_control: fechaControl || null,
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
    setVencRecarga(ext.venc_recarga || '');
    setVencPh(ext.venc_ph || '');
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
    
    setFechaControl(ext.fecha_control || '');
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
          } else {
            const { error } = await supabase
              .from('extintores')
              .delete()
              .eq('id', id);
            if (error) throw error;
            triggerToast('Extintor eliminado exitosamente.');
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
    setModalAlert({
      show: true,
      title: 'Salir sin guardar',
      message: '¿Estás seguro de que deseas salir? Los cambios no guardados se perderán.',
      confirmText: 'Salir',
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
    <div className="h-screen overflow-hidden bg-[#D9D9D9] text-slate-700 flex flex-col md:flex-row relative font-sans">
      
      {/* Mobile Sidebar */}
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
                <a href={`/${tenantSlug}/dashboard`} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-[#468DFF] font-semibold text-sm transition-all">
                  <Building className="h-4 w-4" />
                  Dashboard
                </a>
                <a href={`/${tenantSlug}/empresas`} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-[#468DFF] font-semibold text-sm transition-all">
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
                <a href={`/${tenantSlug}/capacitacion`} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-[#468DFF] font-semibold text-sm transition-all">
                  <GraduationCap className="h-4 w-4" />
                  Programa de Capacitación Anual
                </a>
                <a href={`/${tenantSlug}/correctivas`} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-[#468DFF] font-semibold text-sm transition-all">
                  <ClipboardList className="h-4 w-4" />
                  Acciones Correctivas
                </a>
                <a href={`/${tenantSlug}/extintores`} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[#468DFF] text-white font-semibold text-sm transition-all shadow-md shadow-[#468DFF]/10">
                  <Flame className="h-4 w-4" />
                  Extintores
                </a>
                
                <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 px-3 block pt-6 mb-2">Configuración</span>
                <a href={`/${tenantSlug}/profile`} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-[#468DFF] font-semibold text-sm transition-all">
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
          <div className={`flex items-center justify-between gap-3 mb-8 ${isSidebarCollapsed ? 'flex-col' : ''}`}>
            <div className="flex items-center gap-3">
              <img src="/brand/logo-primary.png" alt="Logo" className="h-9 w-9 object-contain shrink-0" />
              {!isSidebarCollapsed && (
                <span className="font-outfit text-base font-extrabold text-white tracking-tight block animate-fade-in">Gestión SySO</span>
              )}
            </div>
            <button
              onClick={toggleSidebar}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all cursor-pointer"
            >
              {isSidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          </div>

          <nav className="space-y-1.5">
            {!isSidebarCollapsed ? (
              <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 px-3 block mb-2">Panel principal</span>
            ) : (
              <div className="h-px bg-white/10 my-3" />
            )}
            <a href={`/${tenantSlug}/dashboard`} title="Dashboard" className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-[#468DFF] font-semibold text-sm transition-all ${isSidebarCollapsed ? 'justify-center' : ''}`}>
              <Building className="h-4 w-4 shrink-0" />
              {!isSidebarCollapsed && <span className="animate-fade-in">Dashboard</span>}
            </a>
            <a href={`/${tenantSlug}/empresas`} title="Clientes" className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-[#468DFF] font-semibold text-sm transition-all ${isSidebarCollapsed ? 'justify-center' : ''}`}>
              <Users className="h-4 w-4 shrink-0" />
              {!isSidebarCollapsed && <span className="animate-fade-in">Clientes</span>}
            </a>
            {(profile?.role === 'owner' || profile?.role === 'admin') && (
              <a href={`/${tenantSlug}/equipo`} title="Equipo de Trabajo" className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-[#468DFF] font-semibold text-sm transition-all ${isSidebarCollapsed ? 'justify-center' : ''}`}>
                <Briefcase className="h-4 w-4 shrink-0" />
                {!isSidebarCollapsed && <span className="animate-fade-in">Equipo de Trabajo</span>}
              </a>
            )}
            <a href={`/${tenantSlug}/programa`} title="Programa de Gestión Anual" className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-[#468DFF] font-semibold text-sm transition-all ${isSidebarCollapsed ? 'justify-center' : ''}`}>
              <Calendar className="h-4 w-4 shrink-0" />
              {!isSidebarCollapsed && <span className="animate-fade-in">Programa de Gestión Anual</span>}
            </a>
            <a href={`/${tenantSlug}/capacitacion`} title="Programa de Capacitación Anual" className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-[#468DFF] font-semibold text-sm transition-all ${isSidebarCollapsed ? 'justify-center' : ''}`}>
              <GraduationCap className="h-4 w-4 shrink-0" />
              {!isSidebarCollapsed && <span className="animate-fade-in">Programa de Capacitación Anual</span>}
            </a>
            <a href={`/${tenantSlug}/correctivas`} title="Acciones Correctivas" className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-[#468DFF] font-semibold text-sm transition-all ${isSidebarCollapsed ? 'justify-center' : ''}`}>
              <ClipboardList className="h-4 w-4 shrink-0" />
              {!isSidebarCollapsed && <span className="animate-fade-in">Acciones Correctivas</span>}
            </a>
            <a href={`/${tenantSlug}/extintores`} title="Extintores" className={`flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[#468DFF] text-white font-semibold text-sm transition-all shadow-md shadow-[#468DFF]/10 ${isSidebarCollapsed ? 'justify-center' : ''}`}>
              <Flame className="h-4 w-4 shrink-0" />
              {!isSidebarCollapsed && <span className="animate-fade-in">Extintores</span>}
            </a>

            {!isSidebarCollapsed ? (
              <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 px-3 block pt-6 mb-2">Configuración</span>
            ) : (
              <div className="h-px bg-white/10 my-6" />
            )}
            <a href={`/${tenantSlug}/profile`} title="Editar Perfil" className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-[#468DFF] font-semibold text-sm transition-all ${isSidebarCollapsed ? 'justify-center' : ''}`}>
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

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <header className="h-16 border-b border-slate-300/60 flex items-center justify-between px-6 md:px-8 bg-white/80 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 -ml-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 md:hidden cursor-pointer">
              <Menu className="h-5 w-5" />
            </button>
            <h2 className="font-outfit text-lg font-bold text-slate-900 flex items-center gap-2">
              <Flame className="h-5 w-5 text-[#468DFF]" />
              Programa de Control de Extintores
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
              <p className="text-xs text-slate-500 font-semibold">Cargando equipos extintores...</p>
            </div>
          </div>
        ) : (
          <div className="p-6 md:p-8 space-y-6 max-w-[95%] mx-auto w-full">
            
            {isFormOpen ? (
              // FORMULARIO DE ALTA Y EDICIÓN INLINE
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden animate-fade-in-up">
                <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5 bg-slate-50">
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={handleExitForm}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-colors border border-slate-200 bg-white shadow-sm cursor-pointer"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </button>
                    <h3 className="font-outfit text-base font-extrabold text-slate-900">
                      {editingId ? 'Editar Equipo Extintor' : 'Registrar Nuevo Extintor'}
                    </h3>
                  </div>
                  <button onClick={handleExitForm} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <form onSubmit={handleSaveExtintor} className="p-6 space-y-6">
                  
                  {/* Seccion 1: Identificación y Ubicación */}
                  <div className="space-y-4">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block border-b border-slate-100 pb-1">Ubicación e Identificación</span>
                    
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Cliente / Razón Social <span className="text-red-500">*</span></label>
                        <select
                          required
                          value={empresaId}
                          onChange={(e) => { setEmpresaId(e.target.value); setEstablecimientoId(''); }}
                          className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 outline-none focus:border-[#468DFF] cursor-pointer"
                        >
                          <option value="">Selecciona un cliente</option>
                          {empresas.map(emp => (
                            <option key={emp.id} value={emp.id}>{emp.razon_social}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Establecimiento <span className="text-red-500">*</span></label>
                        <select
                          required
                          disabled={!empresaId}
                          value={establecimientoId}
                          onChange={(e) => setEstablecimientoId(e.target.value)}
                          className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 outline-none focus:border-[#468DFF] cursor-pointer disabled:opacity-50"
                        >
                          <option value="">{!empresaId ? 'Selecciona un cliente primero' : 'Selecciona un establecimiento'}</option>
                          {filteredEstablecimientos.map(est => (
                            <option key={est.id} value={est.id}>{est.denominacion}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Área / Sector</label>
                        <input
                          type="text"
                          placeholder="Ej: Cocina, Oficinas 1er Piso..."
                          value={areaSector}
                          onChange={(e) => setAreaSector(e.target.value)}
                          className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 outline-none focus:border-[#468DFF]"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Puesto / Operación / Referencia</label>
                        <input
                          type="text"
                          placeholder="Ej: Cerca de salida de emergencia..."
                          value={puestoOperacionRef}
                          onChange={(e) => setPuestoOperacionRef(e.target.value)}
                          className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 outline-none focus:border-[#468DFF]"
                        />
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">N° de Puesto</label>
                        <input
                          type="text"
                          placeholder="Ej: P01"
                          value={nPuesto}
                          onChange={(e) => setNPuesto(e.target.value)}
                          className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 outline-none focus:border-[#468DFF]"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">N° de Extintor</label>
                        <input
                          type="text"
                          placeholder="Ej: 004812"
                          value={nExtintor}
                          onChange={(e) => setNExtintor(e.target.value)}
                          className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 outline-none focus:border-[#468DFF]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Seccion 2: Características Técnicas y Fechas */}
                  <div className="space-y-4">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block border-b border-slate-100 pb-1">Especificaciones Técnicas y Vencimientos</span>
                    
                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Tipo de Extintor</label>
                        <select
                          value={tipo}
                          onChange={(e) => setTipo(e.target.value)}
                          className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 outline-none focus:border-[#468DFF] cursor-pointer"
                        >
                          <option value="">Selecciona tipo</option>
                          {TIPO_EXTINTORES.map(t => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      </div>

                      {tipo === 'Otro' && (
                        <div className="space-y-1 md:col-span-2">
                          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Especificar otro tipo <span className="text-red-500">*</span></label>
                          <input
                            required
                            type="text"
                            placeholder="Ej: Halotrón, Arena..."
                            value={tipoOtro}
                            onChange={(e) => setTipoOtro(e.target.value)}
                            className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 outline-none focus:border-[#468DFF]"
                          />
                        </div>
                      )}

                      <div className={`space-y-1 ${tipo === 'Otro' ? 'md:col-span-3' : 'md:col-span-2'}`}>
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Capacidad [Kg] / [l]</label>
                        <input
                          type="number"
                          placeholder="Ej: 5, 10, 6..."
                          value={capacidad}
                          onChange={(e) => setCapacidad(e.target.value)}
                          className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 outline-none focus:border-[#468DFF]"
                        />
                      </div>
                    </div>

                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Vencimiento de Recarga</label>
                        <input
                          type="date"
                          value={vencRecarga}
                          onChange={(e) => setVencRecarga(e.target.value)}
                          className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 outline-none focus:border-[#468DFF]"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Vencimiento de PH (Prueba Hidráulica)</label>
                        <input
                          type="date"
                          value={vencPh}
                          onChange={(e) => setVencPh(e.target.value)}
                          className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 outline-none focus:border-[#468DFF]"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Estado Estimado (Previsualización)</label>
                        <div className="h-10 flex items-center px-4 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold">
                          {(() => {
                            const calc = getCalculatedEstado(vencRecarga, vencPh);
                            if (!calc.text) return <span className="text-slate-400">Sin fechas asignadas</span>;
                            return (
                              <span className={`px-3 py-0.5 rounded-full border text-[10px] ${calc.color}`}>
                                {calc.text}
                              </span>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Seccion 3: Chequeo Visual e Imagen */}
                  <div className="space-y-4">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block border-b border-slate-100 pb-1">Chequeo e Inspección Visual</span>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Presión</label>
                        <select
                          value={presion}
                          onChange={(e) => setPresion(e.target.value)}
                          className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 outline-none focus:border-[#468DFF] cursor-pointer"
                        >
                          {PRESION_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Precinto</label>
                        <select
                          value={precinto}
                          onChange={(e) => setPrecinto(e.target.value)}
                          className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 outline-none focus:border-[#468DFF] cursor-pointer"
                        >
                          {CHECK_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Marbete</label>
                        <select
                          value={marbete}
                          onChange={(e) => setMarbete(e.target.value)}
                          className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 outline-none focus:border-[#468DFF] cursor-pointer"
                        >
                          {CHECK_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Partes Mecánicas</label>
                        <select
                          value={partesMecanicas}
                          onChange={(e) => setPartesMecanicas(e.target.value)}
                          className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 outline-none focus:border-[#468DFF] cursor-pointer"
                        >
                          {CHECK_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Manguera / Boquilla</label>
                        <select
                          value={mangueraBoquilla}
                          onChange={(e) => setMangueraBoquilla(e.target.value)}
                          className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 outline-none focus:border-[#468DFF] cursor-pointer"
                        >
                          {CHECK_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Cilindro</label>
                        <select
                          value={cilindro}
                          onChange={(e) => setCilindro(e.target.value)}
                          className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 outline-none focus:border-[#468DFF] cursor-pointer"
                        >
                          {CHECK_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Señalización</label>
                        <select
                          value={senalizacion}
                          onChange={(e) => setSenalizacion(e.target.value)}
                          className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 outline-none focus:border-[#468DFF] cursor-pointer"
                        >
                          {CHECK_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </div>
                    </div>

                    {/* Foto / Evidencia de Control */}
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Imagen / Evidencia Fotográfica</label>
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-slate-50 p-4 border border-slate-200 rounded-xl">
                        {imagenPreview ? (
                          <div className="relative h-32 w-32 rounded-xl overflow-hidden border border-slate-200 bg-white shrink-0 shadow-inner">
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
                          <div className="h-32 w-32 rounded-xl border-2 border-dashed border-slate-300 bg-white flex flex-col items-center justify-center text-slate-400 shrink-0">
                            <ImageIcon className="h-8 w-8 mb-1 opacity-50" />
                            <span className="text-[9px] font-bold text-center">Sin imagen</span>
                          </div>
                        )}

                        <div className="flex flex-wrap items-center gap-3 flex-1">
                          <label className="inline-flex items-center gap-2 py-2.5 px-4 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold text-xs bg-white shadow-sm transition-all cursor-pointer">
                            <Upload className="h-4 w-4 text-slate-500" />
                            Seleccionar imagen
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleImagenChange}
                              className="hidden"
                            />
                          </label>

                          <label className="inline-flex items-center gap-2 py-2.5 px-4 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold text-xs bg-white shadow-sm transition-all cursor-pointer">
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

                  {/* Seccion 4: Fecha Control y Comentarios */}
                  <div className="space-y-4">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block border-b border-slate-100 pb-1">Control y Trazabilidad</span>
                    
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Fecha de Control</label>
                        <input
                          type="date"
                          value={fechaControl}
                          onChange={(e) => setFechaControl(e.target.value)}
                          className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 outline-none focus:border-[#468DFF]"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Observaciones Generales</label>
                      <textarea
                        rows="3"
                        placeholder="Comentarios o aclaraciones sobre el estado del extintor..."
                        value={observaciones}
                        onChange={(e) => setObservaciones(e.target.value)}
                        className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 outline-none focus:border-[#468DFF] resize-none"
                      />
                    </div>
                  </div>

                  {/* Botones del Formulario */}
                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={handleExitForm}
                      className="py-3 px-6 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold text-xs bg-white shadow-sm transition-all cursor-pointer"
                    >
                      Salir
                    </button>
                    <button
                      type="submit"
                      disabled={saveLoading}
                      className="py-3 px-8 rounded-xl bg-[#468DFF] hover:bg-[#0511F2] text-white font-bold text-xs transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/10 active:scale-[0.98] disabled:opacity-50 cursor-pointer"
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
                </form>
              </div>
            ) : (
              // TABLA DE LISTADO Y FILTROS
              <div className="space-y-6">
                
                {/* Panel de Filtros y Búsqueda */}
                <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="relative flex-1">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
                        <Search className="h-4 w-4" />
                      </span>
                      <input
                        type="text"
                        placeholder="Buscar por N° de Extintor, N° de puesto, sector, referencia..."
                        value={filterText}
                        onChange={(e) => setFilterText(e.target.value)}
                        className="w-full text-xs bg-slate-50 border border-slate-300 focus:border-[#468DFF] focus:ring-1 focus:ring-[#468DFF] rounded-xl py-3 pl-10 pr-4 text-slate-800 placeholder-slate-400 focus:outline-none transition-all"
                      />
                    </div>
                    
                    <button
                      onClick={() => setIsFormOpen(true)}
                      className="py-3 px-5 rounded-xl bg-[#468DFF] hover:bg-[#0511F2] text-white font-bold text-xs transition-all duration-200 flex items-center justify-center gap-2 shadow-md shadow-blue-500/15 cursor-pointer shrink-0"
                    >
                      <Plus className="h-4 w-4" />
                      Incorporar Nuevo Extintor
                    </button>
                  </div>

                  {/* Selectores de Filtrado */}
                  <div className="pt-2 border-t border-slate-100 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Sliders className="h-3 w-3" />
                        Filtros de Búsqueda
                      </span>
                      {(filterEmpresa || filterEstablecimiento || filterEstado || filterTipo || filterText) && (
                        <button
                          onClick={() => {
                            setFilterEmpresa('');
                            setFilterEstablecimiento('');
                            setFilterEstado('');
                            setFilterTipo('');
                            setFilterText('');
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-red-50 text-slate-500 hover:text-red-600 border border-slate-200 hover:border-red-200 text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer"
                        >
                          <X className="h-3 w-3" />
                          Limpiar filtros
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Filtrar por Cliente</label>
                        <select
                          value={filterEmpresa}
                          onChange={(e) => {
                            setFilterEmpresa(e.target.value);
                            setFilterEstablecimiento('');
                          }}
                          className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 outline-none focus:border-[#468DFF] cursor-pointer"
                        >
                          <option value="">Todos los clientes</option>
                          {empresas.map((emp) => (
                            <option key={emp.id} value={emp.id}>{emp.razon_social}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Filtrar por Establecimiento</label>
                        <select
                          disabled={!filterEmpresa}
                          value={filterEstablecimiento}
                          onChange={(e) => setFilterEstablecimiento(e.target.value)}
                          className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 outline-none focus:border-[#468DFF] cursor-pointer disabled:opacity-50"
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

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Filtrar por Estado</label>
                        <select
                          value={filterEstado}
                          onChange={(e) => setFilterEstado(e.target.value)}
                          className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 outline-none focus:border-[#468DFF] cursor-pointer"
                        >
                          <option value="">Todos los estados</option>
                          <option value="Vigente">Vigente (Verde)</option>
                          <option value="Vencido">Vencido (Rojo)</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Filtrar por Tipo</label>
                        <select
                          value={filterTipo}
                          onChange={(e) => setFilterTipo(e.target.value)}
                          className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 outline-none focus:border-[#468DFF] cursor-pointer"
                        >
                          <option value="">Todos los tipos</option>
                          {TIPO_EXTINTORES.map((t) => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Listado / Tabla */}
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                  <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 320px)' }}>
                    <table className="w-full text-left border-collapse">
                      <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 shadow-sm">
                        <tr className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          <th className="py-4 px-6 cursor-pointer hover:bg-slate-100 select-none transition-colors" onClick={() => handleSort('cliente')}>
                            <div className="flex items-center gap-1">
                              Cliente / Establecimiento
                              {sortField === 'cliente' && (sortOrder === 'asc' ? ' ▲' : ' ▼')}
                            </div>
                          </th>
                          <th className="py-4 px-4 cursor-pointer hover:bg-slate-100 select-none transition-colors" onClick={() => handleSort('n_extintor')}>
                            <div className="flex items-center gap-1">
                              N° Ext / Puesto / Sector
                              {sortField === 'n_extintor' && (sortOrder === 'asc' ? ' ▲' : ' ▼')}
                            </div>
                          </th>
                          <th className="py-4 px-4 cursor-pointer hover:bg-slate-100 select-none transition-colors" onClick={() => handleSort('tipo')}>
                            <div className="flex items-center gap-1">
                              Tipo / Capacidad
                              {sortField === 'tipo' && (sortOrder === 'asc' ? ' ▲' : ' ▼')}
                            </div>
                          </th>
                          <th className="py-4 px-4 text-center cursor-pointer hover:bg-slate-100 select-none transition-colors" onClick={() => handleSort('venc_recarga')}>
                            <div className="flex items-center justify-center gap-1">
                              Vencimientos (Rec. / PH)
                              {sortField === 'venc_recarga' && (sortOrder === 'asc' ? ' ▲' : ' ▼')}
                            </div>
                          </th>
                          <th className="py-4 px-4 text-center cursor-pointer hover:bg-slate-100 select-none transition-colors" onClick={() => handleSort('estado')}>
                            <div className="flex items-center justify-center gap-1">
                              Estado
                              {sortField === 'estado' && (sortOrder === 'asc' ? ' ▲' : ' ▼')}
                            </div>
                          </th>
                          <th className="py-4 px-4 text-center">Controles</th>
                          <th className="py-4 px-6 text-right">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs font-normal text-slate-700">
                        {sortedExtintores.length === 0 ? (
                          <tr>
                            <td colSpan="7" className="py-12 px-6 text-center text-slate-400 italic">
                              No se encontraron registros de extintores.
                            </td>
                          </tr>
                        ) : (
                          sortedExtintores.map((ext) => {
                            const emp = empresas.find(e => e.id === ext.empresa_id);
                            const est = allEstablecimientos.find(t => t.id === ext.establecimiento_id);
                            const status = getCalculatedEstado(ext.venc_recarga, ext.venc_ph);

                            // Checklist summary icons
                            const cPresion = ext.presion === 'Ok' ? 'text-green-600' : ext.presion === 'N/A' ? 'text-slate-400' : 'text-red-500 font-bold';
                            const cPrecinto = ext.precinto === 'Ok' ? 'text-green-600' : ext.precinto === 'N/A' ? 'text-slate-400' : 'text-red-500 font-bold';
                            const cMarbete = ext.marbete === 'Ok' ? 'text-green-600' : ext.marbete === 'N/A' ? 'text-slate-400' : 'text-red-500 font-bold';
                            const cMecanica = ext.partes_mecanicas === 'Ok' ? 'text-green-600' : ext.partes_mecanicas === 'N/A' ? 'text-slate-400' : 'text-red-500 font-bold';
                            const cManguera = ext.manguera_boquilla === 'Ok' ? 'text-green-600' : ext.manguera_boquilla === 'N/A' ? 'text-slate-400' : 'text-red-500 font-bold';
                            const cCilindro = ext.cilindro === 'Ok' ? 'text-green-600' : ext.cilindro === 'N/A' ? 'text-slate-400' : 'text-red-500 font-bold';
                            const cSenal = ext.senalizacion === 'Ok' ? 'text-green-600' : ext.senalizacion === 'N/A' ? 'text-slate-400' : 'text-red-500 font-bold';

                            return (
                              <tr 
                                key={ext.id} 
                                onClick={() => handleEditClick(ext)}
                                className="hover:bg-slate-50 transition-colors cursor-pointer"
                              >
                                <td className="py-4 px-6">
                                  <span className="font-bold text-slate-800 block">{emp?.razon_social || 'Desconocido'}</span>
                                  <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                                    <MapPin className="h-3 w-3 shrink-0" />
                                    {est?.denominacion || 'Único'}
                                  </span>
                                </td>
                                <td className="py-4 px-4">
                                  <span className="font-bold text-slate-800 block">N° {ext.n_extintor || 'S/N'}</span>
                                  <span className="text-[10px] text-slate-500 block">Puesto: {ext.n_puesto || 'S/D'}</span>
                                  <span className="text-[10px] text-slate-400 block truncate max-w-[150px]">{ext.area_sector || 'S/D'}</span>
                                </td>
                                <td className="py-4 px-4">
                                  <span className="font-semibold text-slate-800 block max-w-[150px] truncate" title={ext.tipo}>{ext.tipo || 'S/D'}</span>
                                  <span className="text-[10px] text-slate-400 block mt-0.5">{ext.capacidad ? `${ext.capacidad} Kg / l` : 'S/D'}</span>
                                </td>
                                <td className="py-4 px-4 text-center">
                                  <span className="text-[10px] text-slate-600 block">Rec: <span className="font-mono">{ext.venc_recarga || 'S/D'}</span></span>
                                  <span className="text-[10px] text-slate-400 block font-normal">PH: <span className="font-mono">{ext.venc_ph || 'S/D'}</span></span>
                                </td>
                                <td className="py-4 px-4 text-center">
                                  {status.text ? (
                                    <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-bold inline-block ${status.color}`}>
                                      {status.text}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 italic text-[10px]">S/Fechas</span>
                                  )}
                                </td>
                                <td className="py-4 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                                  <div className="flex items-center justify-center gap-1.5 text-[9px] font-bold font-mono">
                                    <span title={`Presión: ${ext.presion}`} className={`px-1 py-0.5 rounded border border-slate-200 bg-slate-50 ${cPresion}`}>PR</span>
                                    <span title={`Precinto: ${ext.precinto}`} className={`px-1 py-0.5 rounded border border-slate-200 bg-slate-50 ${cPrecinto}`}>PC</span>
                                    <span title={`Marbete: ${ext.marbete}`} className={`px-1 py-0.5 rounded border border-slate-200 bg-slate-50 ${cMarbete}`}>MB</span>
                                    <span title={`Partes Mecánicas: ${ext.partes_mecanicas}`} className={`px-1 py-0.5 rounded border border-slate-200 bg-slate-50 ${cMecanica}`}>MC</span>
                                    <span title={`Manguera/Boquilla: ${ext.manguera_boquilla}`} className={`px-1 py-0.5 rounded border border-slate-200 bg-slate-50 ${cManguera}`}>MG</span>
                                    <span title={`Cilindro: ${ext.cilindro}`} className={`px-1 py-0.5 rounded border border-slate-200 bg-slate-50 ${cCilindro}`}>CL</span>
                                    <span title={`Señalización: ${ext.senalizacion}`} className={`px-1 py-0.5 rounded border border-slate-200 bg-slate-50 ${cSenal}`}>SE</span>
                                  </div>
                                </td>
                                <td className="py-4 px-6 text-right space-x-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                                  {ext.imagen_preview_url && (
                                    <a 
                                      href={ext.imagen_preview_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      title="Ver Foto"
                                      className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-700 transition-colors inline-block cursor-pointer"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <Eye className="h-3.5 w-3.5" />
                                    </a>
                                  )}
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleEditClick(ext); }}
                                    title="Editar"
                                    className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-blue-600 transition-colors inline-block cursor-pointer"
                                  >
                                    <Edit className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleDeleteClick(ext.id); }}
                                    title="Eliminar"
                                    className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-red-600 transition-colors inline-block cursor-pointer"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
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

      {/* Alertas y Confirmaciones */}
      {modalAlert.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={closeAlert} className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" />
          <div className="relative bg-white border border-slate-200 rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-scaleUp">
            <h4 className="font-outfit text-base font-extrabold text-slate-900 mb-2">{modalAlert.title}</h4>
            <p className="text-xs text-slate-500 mb-6 font-normal leading-relaxed">{modalAlert.message}</p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={closeAlert}
                className="py-2.5 px-4 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold text-xs bg-white shadow-sm transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button 
                onClick={() => { modalAlert.onConfirm(); }}
                className={`py-2.5 px-5 rounded-xl font-bold text-xs text-white transition-all cursor-pointer ${
                  modalAlert.confirmText === 'Eliminar' 
                    ? 'bg-red-600 hover:bg-red-700 shadow-md shadow-red-500/10' 
                    : 'bg-[#468DFF] hover:bg-[#0511F2] shadow-md shadow-blue-500/10'
                }`}
              >
                {modalAlert.confirmText}
              </button>
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
