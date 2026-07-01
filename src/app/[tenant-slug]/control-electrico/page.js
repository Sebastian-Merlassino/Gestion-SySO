// src/app/[tenant-slug]/control-electrico/page.js
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  GraduationCap,
  Eye,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Printer,
  FileText,
  Zap,
  Info,
  Award,
  Sliders,
  ChevronUp,
  ChevronDown
} from 'lucide-react';

const INITIAL_ITEMS = [
  { id: 1, text: "Estado general de tableros eléctricos (limpieza, señalización, acceso libre)", estado: '', observaciones: '' },
  { id: 2, text: "Integridad de tapas, cerraduras y bisagras de tableros eléctricos", estado: '', observaciones: '' },
  { id: 3, text: "Identificación de circuitos en tableros (etiquetas legibles y actualizadas)", estado: '', observaciones: '' },
  { id: 4, text: "Ausencia de cables expuestos o empalmes no autorizados", estado: '', observaciones: '' },
  { id: 5, text: "Correcto conexionado a tierra de instalaciones y equipos", estado: '', observaciones: '' },
  { id: 6, text: "Interruptores y disyuntores en buen estado y sin daños visibles", estado: '', observaciones: '' },
  { id: 7, text: "Tomas y enchufes sin signos de deterioro, sobrecalentamiento o roturas", estado: '', observaciones: '' },
  { id: 8, text: "Canalizaciones (bandejas, caños, canaletas) bien fijadas y sin obstrucciones", estado: '', observaciones: '' },
  { id: 9, text: "Iluminación de emergencia: funcionamiento y autonomía", estado: '', observaciones: '' },
  { id: 10, text: "Luminarias en condiciones, sin cables expuestos ni portalámparas dañados", estado: '', observaciones: '' },
  { id: 11, text: "Instalación libre de objetos inflamables o combustibles cerca de tableros", estado: '', observaciones: '' },
  { id: 12, text: "Protecciones diferenciales (disyuntores) testeadas periódicamente", estado: '', observaciones: '' },
  { id: 13, text: "Ausencia de sobrecargas visibles (múltiples artefactos en un solo tomacorriente)", estado: '', observaciones: '' },
  { id: 14, text: "Verificación del cableado en áreas húmedas o exteriores (IP adecuada)", estado: '', observaciones: '' },
  { id: 15, text: "Estado de puesta a tierra (jabalina, continuidad, conexiones firmes)", estado: '', observaciones: '' }
];

export default function ControlElectricoPage({ params }) {
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

  const sectionPerms = getSectionPermissions(profile, 'control_electrico');
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

  // Datos principales de controles eléctricos
  const [controles, setControles] = useState([]);

  // Estados del CRUD / Vista Formulario
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Campos del Formulario
  const [empresaId, setEmpresaId] = useState('');
  const [establecimientoId, setEstablecimientoId] = useState('');
  const [fecha, setFecha] = useState('');
  const [formItems, setFormItems] = useState(INITIAL_ITEMS);
  const [observaciones, setObservaciones] = useState('');
  const [responsableAclaracion, setResponsableAclaracion] = useState('');
  
  // Firmas
  const [firmaRespSavedUrl, setFirmaRespSavedUrl] = useState('');
  const [firmaProfSavedUrl, setFirmaProfSavedUrl] = useState('');
  const [firmaTipo, setFirmaTipo] = useState('perfil'); // 'perfil' o 'mano'
  const [profesionalTipo, setProfesionalTipo] = useState('miembro'); // 'miembro' o 'manual'
  const [profesionalId, setProfesionalId] = useState('');
  const [profesionalNombre, setProfesionalNombre] = useState('');
  const [signaturePath, setSignaturePath] = useState(''); // profile signature url
  const [firmaPerfilPreviewUrl, setFirmaPerfilPreviewUrl] = useState('');

  // Banderas de si se ha dibujado
  const [hasSignedResp, setHasSignedResp] = useState(false);
  const [hasSignedProf, setHasSignedProf] = useState(false);

  // Canvas Refs
  const firmaRespCanvasRef = useRef(null);
  const firmaProfCanvasRef = useRef(null);

  // Filtros
  const [filterText, setFilterText] = useState('');
  const [filterEmpresa, setFilterEmpresa] = useState('');
  const [filterEstablecimiento, setFilterEstablecimiento] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showExportMobile, setShowExportMobile] = useState(false);

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

  // Sincronizar firma del profesional interviniente al cambiar de profesional o tipo
  useEffect(() => {
    if (isFormOpen && signaturePath && profesionalTipo === 'miembro' && firmaTipo === 'perfil') {
      const getSignedProfileSig = async () => {
        if (isDevMode) {
          setFirmaPerfilPreviewUrl('/brand/logo-primary.png');
          return;
        }
        try {
          if (signaturePath.startsWith('http://') || signaturePath.startsWith('https://')) {
            setFirmaPerfilPreviewUrl(signaturePath);
          } else {
            const { data, error } = await supabase.storage
              .from('documents')
              .createSignedUrl(signaturePath, 3600);
            if (!error && data) {
              setFirmaPerfilPreviewUrl(data.signedUrl);
            } else {
              setFirmaPerfilPreviewUrl('/brand/logo-primary.png');
            }
          }
        } catch (e) {
          console.error(e);
          setFirmaPerfilPreviewUrl('/brand/logo-primary.png');
        }
      };
      getSignedProfileSig();
    } else {
      setFirmaPerfilPreviewUrl('');
    }
  }, [isFormOpen, signaturePath, profesionalTipo, firmaTipo, isDevMode]);

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
            window.location.href = `/${homeTen.slug}/control-electrico`;
            return;
          }
        }
        window.location.href = '/login';
        return;
      }

      // Verificar acceso
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
            window.location.href = `/${homeTen.slug}/control-electrico`;
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

      // Clientes
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
        .select('id, empresa_id, denominacion, direccion')
        .eq('tenant_id', ten.id);
      if (prof.role === 'cliente') {
        estsQuery = estsQuery.eq('empresa_id', prof.empresa_id);
      }
      const { data: ests, error: estErr } = await estsQuery.order('denominacion');
      if (estErr) throw estErr;
      setAllEstablecimientos(ests || []);

      // Miembros de equipo
      const { data: mems, error: memErr } = await supabase
        .from('miembros_equipo')
        .select('id, full_name, signature_url, profile_id')
        .eq('tenant_id', ten.id)
        .order('full_name');
      if (memErr) throw memErr;
      setMiembrosList(mems || []);

      // Controles Eléctricos
      let ceQuery = supabase
        .from('control_electrico')
        .select('*')
        .eq('tenant_id', ten.id);
      if (prof.role === 'cliente') {
        ceQuery = ceQuery.eq('empresa_id', prof.empresa_id);
      }
      const { data: ces, error: ceErr } = await ceQuery.order('fecha', { ascending: false });
      if (ceErr) throw ceErr;

      setControles(ces || []);
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
      { id: 'mock-est-1', empresa_id: 'mock-empresa-1', denominacion: 'Callao 727', direccion: 'Av. Callao 727, CABA' },
      { id: 'mock-est-2', empresa_id: 'mock-empresa-1', denominacion: 'Cordoba 2045', direccion: 'Av. Córdoba 2045, CABA' },
      { id: 'mock-est-3', empresa_id: 'mock-empresa-2', denominacion: 'Único', direccion: 'Perú 345, CABA' }
    ]);
    setMiembrosList([
      { id: 'mock-m-1', full_name: 'Ing. Carlos Gómez', signature_url: '', profile_id: '' }
    ]);
    setControles([
      {
        id: 'mock-ce-1',
        empresa_id: 'mock-empresa-1',
        establecimiento_id: 'mock-est-1',
        fecha: '2026-06-15',
        items: INITIAL_ITEMS.map(it => it.id === 4 ? { ...it, estado: 'No Ok', observaciones: 'Se observó empalme con cinta en tablero secundario' } : { ...it, estado: 'Ok' }),
        firma_responsable: '',
        responsable_aclaracion: 'Juan Pérez',
        firma_profesional: '',
        profesional_tipo: 'miembro',
        profesional_nombre: 'Ing. Carlos Gómez',
        profesional_id: 'mock-m-1',
        firma_tipo: 'mano',
        observaciones: 'Generalmente en buen estado con excepción del tablero secundario de cocina.'
      }
    ]);
    setLoading(false);
  };

  // Dibujo en Canvas
  const setupCanvas = useCallback((canvas, setHasSigned) => {
    if (!canvas || !canEdit) return;
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    let drawing = false;
    let lastX = 0;
    let lastY = 0;

    const getPos = (clientX, clientY) => {
      const rect = canvas.getBoundingClientRect();
      const x = ((clientX - rect.left) / rect.width) * canvas.width;
      const y = ((clientY - rect.top) / rect.height) * canvas.height;
      return { x, y };
    };

    const startDrawing = (e) => {
      drawing = true;
      const client = e.touches ? e.touches[0] : e;
      const pos = getPos(client.clientX, client.clientY);
      lastX = pos.x;
      lastY = pos.y;
      setHasSigned(true);
    };

    const draw = (e) => {
      if (!drawing) return;
      if (e.cancelable) e.preventDefault();
      const client = e.touches ? e.touches[0] : e;
      const pos = getPos(client.clientX, client.clientY);

      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();

      lastX = pos.x;
      lastY = pos.y;
    };

    const stopDrawing = () => {
      drawing = false;
    };

    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseleave', stopDrawing);
    canvas.addEventListener('touchstart', startDrawing, { passive: false });
    canvas.addEventListener('touchmove', draw, { passive: false });
    canvas.addEventListener('touchend', stopDrawing);

    canvas._cleanup = () => {
      canvas.removeEventListener('mousedown', startDrawing);
      canvas.removeEventListener('mousemove', draw);
      canvas.removeEventListener('mouseup', stopDrawing);
      canvas.removeEventListener('mouseleave', stopDrawing);
      canvas.removeEventListener('touchstart', startDrawing);
      canvas.removeEventListener('touchmove', draw);
      canvas.removeEventListener('touchend', stopDrawing);
    };
  }, [canEdit]);

  // Callback refs para Canvas
  const firmaRespRefCallback = useCallback((node) => {
    if (node) {
      setupCanvas(node, setHasSignedResp);
      firmaRespCanvasRef.current = node;
    } else {
      if (firmaRespCanvasRef.current && firmaRespCanvasRef.current._cleanup) {
        firmaRespCanvasRef.current._cleanup();
      }
      firmaRespCanvasRef.current = null;
    }
  }, [setupCanvas]);

  const firmaProfRefCallback = useCallback((node) => {
    if (node) {
      setupCanvas(node, setHasSignedProf);
      firmaProfCanvasRef.current = node;
    } else {
      if (firmaProfCanvasRef.current && firmaProfCanvasRef.current._cleanup) {
        firmaProfCanvasRef.current._cleanup();
      }
      firmaProfCanvasRef.current = null;
    }
  }, [setupCanvas]);

  const handleClearCanvas = (canvasRef, setHasSigned, savedUrlSetter) => {
    if (savedUrlSetter) savedUrlSetter('');
    setHasSigned(false);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

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
        if (path.endsWith('/control-electrico')) {
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
          if (path.endsWith('/control-electrico')) {
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
    setFecha('');
    setFormItems(INITIAL_ITEMS.map(it => ({ ...it, estado: '', observaciones: '' })));
    setObservaciones('');
    setResponsableAclaracion('');
    setFirmaRespSavedUrl('');
    setFirmaProfSavedUrl('');
    setFirmaTipo('perfil');
    setProfesionalTipo('miembro');
    setProfesionalId('');
    setProfesionalNombre('');
    setSignaturePath('');
    setHasSignedResp(false);
    setHasSignedProf(false);
  };

  const handleAddNew = () => {
    setIsReadOnlyView(false);
    setEditingId(null);
    setEmpresaId('');
    setEstablecimientoId('');
    setFecha(formatDate(new Date().toISOString().split('T')[0]));
    setFormItems(INITIAL_ITEMS.map(it => ({ ...it, estado: '', observaciones: '' })));
    setObservaciones('');
    setResponsableAclaracion('');
    setFirmaRespSavedUrl('');
    setFirmaProfSavedUrl('');
    setHasSignedResp(false);
    setHasSignedProf(false);

    const currentMember = miembrosList.find(m => m.profile_id === profile?.id);
    if (currentMember) {
      setProfesionalTipo('miembro');
      setProfesionalId(currentMember.id);
      setProfesionalNombre(currentMember.full_name);
      setSignaturePath(currentMember.signature_url || '');
      setFirmaTipo(currentMember.signature_url ? 'perfil' : 'mano');
    } else {
      setProfesionalTipo('miembro');
      setProfesionalId('');
      setProfesionalNombre('');
      setSignaturePath('');
      setFirmaTipo('perfil');
    }
    setIsFormOpen(true);
  };

  const handleProfesionalChange = (value) => {
    setProfesionalId(value);
    if (value === '__custom__') {
      setProfesionalTipo('manual');
      setProfesionalNombre('');
      setSignaturePath('');
      setFirmaTipo('mano');
    } else {
      setProfesionalTipo('miembro');
      const m = miembrosList.find(mem => mem.id === value);
      if (m) {
        setProfesionalNombre(m.full_name);
        setSignaturePath(m.signature_url || '');
        setFirmaTipo(m.signature_url ? 'perfil' : 'mano');
      } else {
        setProfesionalNombre('');
        setSignaturePath('');
        setFirmaTipo('perfil');
      }
    }
  };

  const handleItemEstadoChange = (id, newEstado) => {
    setFormItems(prev => prev.map(item => item.id === id ? { ...item, estado: newEstado } : item));
  };

  const handleItemObsChange = (id, newObs) => {
    setFormItems(prev => prev.map(item => item.id === id ? { ...item, observaciones: newObs } : item));
  };

  // Helper para subir archivos al storage
  const uploadFileToStorage = async (file, prefix) => {
    if (isDevMode) return `mock-path/${prefix}_${Date.now()}_${file.name}`;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No autorizado');

      const fileExt = file.name.split('.').pop();
      const uuid = editingId || crypto.randomUUID();
      const fileName = `${user.id}/${prefix}_${uuid}_${Date.now()}.${fileExt}`;

      const { error } = await supabase.storage
        .from('documents')
        .upload(fileName, file, { cacheControl: '3600', upsert: true });

      if (error) throw error;
      return fileName;
    } catch (err) {
      console.error(`Error al subir archivo ${prefix}:`, err);
      throw err;
    }
  };

  // Helper para subir canvas de firma al storage
  const uploadCanvasToStorage = async (canvas, prefix) => {
    if (!canvas) return '';
    return new Promise((resolve, reject) => {
      canvas.toBlob(async (blob) => {
        if (!blob) {
          resolve('');
          return;
        }
        const file = new File([blob], `${prefix}_signature.png`, { type: 'image/png' });
        try {
          const path = await uploadFileToStorage(file, prefix);
          resolve(path);
        } catch (err) {
          reject(err);
        }
      }, 'image/png');
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!canEdit) {
      triggerToast('No tiene permisos para modificar este registro.', 'error');
      return;
    }
    if (!empresaId || !establecimientoId || !fecha) {
      triggerToast('Complete la Razón Social, Establecimiento y Fecha.', 'error');
      return;
    }

    const finalProfNombre = profesionalTipo === 'miembro'
      ? (miembrosList.find(m => m.id === profesionalId)?.full_name || '')
      : profesionalNombre.trim();

    if (!finalProfNombre) {
      triggerToast('Especifique el profesional interviniente.', 'error');
      return;
    }

    setSaveLoading(true);
    try {
      const tempId = editingId || crypto.randomUUID();

      // Subir firmas si hay dibujos nuevos
      let finalFirmaResp = firmaRespSavedUrl;
      let finalFirmaProf = '';

      if (hasSignedResp && firmaRespCanvasRef.current) {
        finalFirmaResp = await uploadCanvasToStorage(firmaRespCanvasRef.current, 'firma_resp');
      }

      if (firmaTipo === 'perfil') {
        finalFirmaProf = signaturePath;
      } else {
        if (hasSignedProf && firmaProfCanvasRef.current) {
          finalFirmaProf = await uploadCanvasToStorage(firmaProfCanvasRef.current, 'firma_prof');
        } else {
          const originalCe = controles.find(c => c.id === editingId);
          if (originalCe && originalCe.firma_tipo === 'mano') {
            finalFirmaProf = originalCe.firma_profesional || '';
          }
        }
      }

      if (firmaTipo === 'perfil' && !finalFirmaProf) {
        triggerToast('El profesional seleccionado no tiene una firma de perfil configurada.', 'error');
        setSaveLoading(false);
        return;
      }

      if (firmaTipo === 'mano' && !finalFirmaProf) {
        triggerToast('Debe firmar a mano en el panel del profesional.', 'error');
        setSaveLoading(false);
        return;
      }

      const payload = {
        id: tempId,
        tenant_id: tenant.id,
        empresa_id: empresaId,
        establecimiento_id: establecimientoId,
        fecha: convertToDbDate(fecha) || null,
        items: formItems,
        responsable_aclaracion: responsableAclaracion.trim() || null,
        profesional_tipo: profesionalTipo,
        profesional_nombre: finalProfNombre,
        profesional_id: profesionalTipo === 'miembro' ? profesionalId : null,
        firma_tipo: firmaTipo,
        firma_responsable: finalFirmaResp,
        firma_profesional: finalFirmaProf,
        observaciones: observaciones.trim() || null,
        updated_at: new Date().toISOString()
      };

      if (isDevMode) {
        const mockCe = {
          ...payload,
          firma_resp_preview_url: finalFirmaResp.startsWith('mock') ? '/brand/logo-primary.png' : finalFirmaResp,
          firma_prof_preview_url: finalFirmaProf.startsWith('mock') ? '/brand/logo-primary.png' : finalFirmaProf
        };

        if (editingId) {
          setControles(controles.map(c => c.id === editingId ? mockCe : c));
          triggerToast('Control eléctrico actualizado exitosamente (Mock).');
        } else {
          setControles([mockCe, ...controles]);
          triggerToast('Control eléctrico registrado exitosamente (Mock).');
        }
      } else {
        if (editingId) {
          const { error } = await supabase
            .from('control_electrico')
            .update(payload)
            .eq('id', editingId);
          if (error) throw error;
          triggerToast('Control eléctrico actualizado con éxito.');
        } else {
          const { error } = await supabase
            .from('control_electrico')
            .insert([{ ...payload, created_at: new Date().toISOString() }]);
          if (error) throw error;
          triggerToast('Control eléctrico registrado con éxito.');
        }
        await loadRealData();
      }

      handleCloseForm();
    } catch (err) {
      console.error('Error al guardar control eléctrico:', err);
      triggerToast('Error al guardar el registro.', 'error');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleEditClick = (c) => {
    setEditingId(c.id);
    setEmpresaId(c.empresa_id);
    setEstablecimientoId(c.establecimiento_id);
    setFecha(formatDate(c.fecha) || '');
    setFormItems(c.items || INITIAL_ITEMS);
    setObservaciones(c.observaciones || '');
    setResponsableAclaracion(c.responsable_aclaracion || '');
    setFirmaTipo(c.firma_tipo || 'perfil');
    setProfesionalTipo(c.profesional_tipo || 'miembro');
    if (c.profesional_tipo === 'miembro') {
      setProfesionalId(c.profesional_id || '');
      setProfesionalNombre('');
    } else {
      setProfesionalId('__custom__');
      setProfesionalNombre(c.profesional_nombre || '');
    }

    let latestProfileSig = '';
    if (c.profesional_tipo === 'miembro' && c.profesional_id) {
      const m = miembrosList.find(mem => mem.id === c.profesional_id);
      if (m) {
        latestProfileSig = m.signature_url || '';
      }
    }
    setSignaturePath(latestProfileSig || (c.firma_tipo === 'perfil' ? (c.firma_profesional || '') : ''));

    setFirmaRespSavedUrl('');
    setFirmaProfSavedUrl('');
    setHasSignedResp(false);
    setHasSignedProf(false);

    if (isDevMode) {
      setFirmaRespSavedUrl(c.firma_responsable ? '/brand/logo-primary.png' : '');
      setFirmaProfSavedUrl((c.firma_tipo || 'perfil') === 'mano' && c.firma_profesional ? '/brand/logo-primary.png' : '');
    } else {
      const pathsToSign = [];
      if (c.firma_responsable && c.firma_responsable !== 'N/A' && !c.firma_responsable.startsWith('http')) {
        pathsToSign.push(c.firma_responsable);
      }
      if ((c.firma_tipo || 'perfil') === 'mano' && c.firma_profesional && c.firma_profesional !== 'N/A' && !c.firma_profesional.startsWith('http')) {
        pathsToSign.push(c.firma_profesional);
      }

      const loadSignatures = async () => {
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
            console.error('Error al firmar URLs de control en lote:', e);
          }
        }

        if (c.firma_responsable) {
          setFirmaRespSavedUrl(c.firma_responsable.startsWith('http') ? c.firma_responsable : (signedUrlsMap[c.firma_responsable] || ''));
        }
        if ((c.firma_tipo || 'perfil') === 'mano' && c.firma_profesional) {
          setFirmaProfSavedUrl(c.firma_profesional.startsWith('http') ? c.firma_profesional : (signedUrlsMap[c.firma_profesional] || ''));
        }
      };
      loadSignatures();
    }

    setIsFormOpen(true);
  };

  const handleDeleteClick = (id) => {
    if (!canEdit) {
      triggerToast('No tiene permisos para eliminar registros.', 'error');
      return;
    }
    setModalAlert({
      show: true,
      title: '¿Eliminar Control Eléctrico?',
      message: 'Esta acción eliminará permanentemente la planilla seleccionada y todos sus archivos asociados. No se puede deshacer.',
      confirmText: 'Eliminar',
      onConfirm: async () => {
        try {
          if (isDevMode) {
            setControles(controles.filter(c => c.id !== id));
            triggerToast('Registro eliminado exitosamente (Mock).');
            handleCloseForm();
          } else {
            const { error } = await supabase
              .from('control_electrico')
              .delete()
              .eq('id', id);
            if (error) throw error;
            triggerToast('Control eléctrico eliminado con éxito.');
            handleCloseForm();
            await loadRealData();
          }
        } catch (err) {
          console.error(err);
          triggerToast('Error al eliminar el registro.', 'error');
        } finally {
          closeAlert();
        }
      }
    });
  };

  // Helper para convertir imagen URL a base64
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
          reject(new Error("Error reading image blob"));
        }, false);
        reader.readAsDataURL(blob);
      });
    } catch (e) {
      console.error('Error fetching image to base64:', e);
      return '';
    }
  };

  // Redimensionar imagen para PDF
  const resizeImageForPdf = (base64Str, maxWidth = 350, maxHeight = 350) => {
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

  const handleExportPdfReport = async (c, shouldPrint = false) => {
    try {
      triggerToast('Generando reporte PDF...', 'info');

      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'pt',
        format: 'a4',
        compress: true
      });

      const emp = empresas.find(e => e.id === c.empresa_id);
      const est = allEstablecimientos.find(e => e.id === c.establecimiento_id);

      // Cargar firmas
      let fRespBase64 = '';
      let fProfBase64 = '';

      if (c.firma_responsable) {
        let fRespUrl = c.firma_responsable;
        if (!isDevMode && !c.firma_responsable.startsWith('http')) {
          const { data } = await supabase.storage.from('documents').createSignedUrl(c.firma_responsable, 360);
          if (data) fRespUrl = data.signedUrl;
        }
        fRespBase64 = await getBase64ImageFromUrl(fRespUrl || '/brand/logo-primary.png');
      }

      if (c.firma_profesional) {
        let fProfUrl = c.firma_profesional;
        if (!isDevMode && !c.firma_profesional.startsWith('http')) {
          const { data } = await supabase.storage.from('documents').createSignedUrl(c.firma_profesional, 360);
          if (data) fProfUrl = data.signedUrl;
        }
        fProfBase64 = await getBase64ImageFromUrl(fProfUrl || '/brand/logo-primary.png');
      }

      if (fRespBase64) fRespBase64 = await resizeImageForPdf(fRespBase64, 150, 75);
      if (fProfBase64) fProfBase64 = await resizeImageForPdf(fProfBase64, 150, 75);

      // Logo del Tenant
      let logoBase64 = '';
      try {
        if (tenant && tenant.logo_1_url) {
          logoBase64 = await getBase64ImageFromUrl(tenant.logo_1_url);
        }
      } catch (e) {
        console.error('Error cargando logo del Tenant:', e);
      }
      if (!logoBase64) {
        logoBase64 = await getBase64ImageFromUrl('/brand/logo-primary.png');
      }
      if (logoBase64) {
        logoBase64 = await resizeImageForPdf(logoBase64, 120, 50);
      }

      // Dibujar cabecera
      const drawHeader = (d) => {
        if (logoBase64) {
          d.addImage(logoBase64, 'PNG', 40, 20, 100, 40);
        }
        d.setFont('helvetica', 'bold');
        d.setFontSize(13);
        d.setTextColor(13, 13, 13);
        d.text('Control Visual de Instalaciones Eléctricas', 555, 38, { align: 'right' });
        
        d.setFont('helvetica', 'normal');
        d.setFontSize(8);
        d.setTextColor(100, 100, 100);
        d.text(`Fecha: ${formatDate(c.fecha)}`, 555, 52, { align: 'right' });

        d.setDrawColor(217, 217, 217);
        d.setLineWidth(1);
        d.line(40, 70, 555, 70);
      };

      drawHeader(doc);

      // Bloque de información general
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(13, 13, 13);
      doc.text('INFORMACIÓN DE CONTROL', 40, 95);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(80, 80, 80);
      doc.text(`Razón Social:`, 40, 115);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(13, 13, 13);
      doc.text(emp?.razon_social || 'N/A', 110, 115);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(80, 80, 80);
      doc.text(`Establecimiento:`, 40, 130);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(13, 13, 13);
      doc.text(`${est?.denominacion || 'N/A'} (${est?.direccion || 'Sin dirección'})`, 120, 130);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(80, 80, 80);
      doc.text(`Profesional:`, 40, 145);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(13, 13, 13);
      doc.text(c.profesional_nombre || 'N/A', 105, 145);

      // Tabla de ítems checked
      const headers = [['N°', 'Ítem a Verificar', 'Estado', 'Observaciones / Recomendaciones']];
      const body = (c.items || INITIAL_ITEMS).map(it => [
        it.id.toString(),
        it.text,
        it.estado || 'N/A',
        it.observaciones || ''
      ]);

      autoTable(doc, {
        head: headers,
        body: body,
        startY: 165,
        margin: { top: 90, bottom: 120, left: 40, right: 40 },
        theme: 'striped',
        rowPageBreak: 'avoid',
        headStyles: { fillColor: [70, 141, 255], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
        bodyStyles: { fontSize: 7.5, textColor: [50, 50, 50], minCellHeight: 18 },
        columnStyles: {
          0: { cellWidth: 20 },
          1: { cellWidth: 250 },
          2: { cellWidth: 55, fontStyle: 'bold' },
          3: { cellWidth: 190 }
        },
        didDrawPage: function(data) {
          if (data.pageNumber > 1) {
            drawHeader(doc);
          }
        }
      });

      // Añadir observaciones finales y firmas en la última página
      let finalY = doc.previousAutoTable.finalY + 15;
      
      // Comprobar si hay espacio suficiente para observaciones y firmas en la página actual
      const pageHeight = doc.internal.pageSize.getHeight();
      if (finalY + 150 > pageHeight) {
        doc.addPage();
        drawHeader(doc);
        finalY = 90;
      }

      if (c.observaciones) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text('Observaciones Generales:', 40, finalY);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(80, 80, 80);
        
        const splitObs = doc.splitTextToSize(c.observaciones, 515);
        doc.text(splitObs, 40, finalY + 13);
        finalY += (splitObs.length * 11) + 20;
      }

      if (finalY + 110 > pageHeight) {
        doc.addPage();
        drawHeader(doc);
        finalY = 90;
      }

      // Dibujar bloque de firmas
      doc.setDrawColor(230, 230, 230);
      doc.setLineWidth(1);
      doc.line(40, finalY, 555, finalY);

      const sigY = finalY + 15;
      
      // Firma Responsable
      if (fRespBase64 && fRespBase64.startsWith('data:image/')) {
        try {
          doc.addImage(fRespBase64, 'PNG', 80, sigY, 120, 60);
        } catch (e) {
          console.error(e);
        }
      }
      doc.setDrawColor(180, 180, 180);
      doc.line(50, sigY + 65, 230, sigY + 65);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(13, 13, 13);
      doc.text('Firma del Responsable', 140, sigY + 77, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text(`Aclaración: ${c.responsable_aclaracion || 'N/A'}`, 140, sigY + 87, { align: 'center' });

      // Firma Profesional
      if (fProfBase64 && fProfBase64.startsWith('data:image/')) {
        try {
          doc.addImage(fProfBase64, 'PNG', 360, sigY, 120, 60);
        } catch (e) {
          console.error(e);
        }
      }
      doc.line(330, sigY + 65, 510, sigY + 65);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(13, 13, 13);
      doc.text('Firma del Profesional de SySO', 420, sigY + 77, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text(c.profesional_nombre || 'N/A', 420, sigY + 87, { align: 'center' });

      // Pie de página general
      const pagesCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pagesCount; i++) {
        doc.setPage(i);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(150, 150, 150);
        
        doc.setDrawColor(230, 230, 230);
        doc.line(40, pageHeight - 40, 555, pageHeight - 40);

        const companyName = tenant?.name || 'Gestión SySO';
        const phoneVal = profile?.role === 'miembro' ? (profile?.phone || '') : adminContact.phone;
        const emailVal = profile?.role === 'miembro' ? (profile?.email || '') : adminContact.email;
        const footerText = `${companyName} - Tel: ${phoneVal} - Email: ${emailVal}`;
        doc.text(footerText, 297.5, pageHeight - 27, { align: 'center' });
        doc.text(`Página ${i} de ${pagesCount}`, 555, pageHeight - 27, { align: 'right' });
      }

      if (shouldPrint) {
        doc.autoPrint();
        const blobUrl = doc.output('bloburl');
        window.open(blobUrl, '_blank');
      } else {
        doc.save(`Control_Electrico_${emp?.razon_social.replace(/\s+/g, '_') || ''}_${c.fecha}.pdf`);
      }
    } catch (e) {
      console.error('Error al generar PDF:', e);
      triggerToast('Error al exportar reporte PDF.', 'error');
    }
  };

  // Filtrado de registros
  const filteredControles = controles.filter((c) => {
    const emp = empresas.find(e => e.id === c.empresa_id);
    const est = allEstablecimientos.find(e => e.id === c.establecimiento_id);
    const searchString = `${emp?.razon_social || ''} ${est?.denominacion || ''} ${c.profesional_nombre || ''} ${formatDate(c.fecha)}`.toLowerCase();
    
    const matchesSearch = searchString.includes(filterText.toLowerCase());
    const matchesEmpresa = !filterEmpresa || c.empresa_id === filterEmpresa;
    const matchesEstablecimiento = !filterEstablecimiento || c.establecimiento_id === filterEstablecimiento;

    return matchesSearch && matchesEmpresa && matchesEstablecimiento;
  });

  const sortedControles = [...filteredControles].sort((a, b) => {
    let aVal = a[sortField] || '';
    let bVal = b[sortField] || '';

    if (sortField === 'empresa') {
      const empA = empresas.find(e => e.id === a.empresa_id);
      const empB = empresas.find(e => e.id === b.empresa_id);
      aVal = empA?.razon_social || '';
      bVal = empB?.razon_social || '';
    } else if (sortField === 'establecimiento') {
      const estA = allEstablecimientos.find(e => e.id === a.establecimiento_id);
      const estB = allEstablecimientos.find(e => e.id === b.establecimiento_id);
      aVal = estA?.denominacion || '';
      bVal = estB?.denominacion || '';
    }

    if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const filteredEstablecimientos = allEstablecimientos.filter(
    (est) => est.empresa_id === empresaId
  );

  const selectedEmpresa = empresas.find(e => e.id === empresaId);
  const derivedCuit = selectedEmpresa ? selectedEmpresa.cuit : '';

  const selectedEstablecimiento = allEstablecimientos.find(est => est.id === establecimientoId);
  const derivedDireccion = selectedEstablecimiento ? selectedEstablecimiento.direccion : '';

  return (
    <div className="h-screen overflow-hidden bg-syso-bg text-slate-700 flex font-sans">
      
      <Sidebar
        tenantSlug={tenantSlug}
        profile={profile}
        currentSection="control-electrico"
        isSidebarCollapsed={isSidebarCollapsed}
        toggleSidebar={toggleSidebar}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
        handleLogout={handleLogout}
        onNavigate={handleSidebarNavigation}
      />

      <main className="flex-grow flex flex-col min-w-0 overflow-y-auto">
        
        {/* HEADER */}
        <header className="h-16 border-b border-slate-200 flex items-center justify-between px-4 md:px-6 bg-white shrink-0 sticky top-0 z-20">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 -ml-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 md:hidden cursor-pointer shrink-0"
            >
              <Menu className="h-5 w-5" />
            </button>
            <Zap className="h-5 w-5 text-[#468DFF] shrink-0" />
            <h1 className="font-outfit text-base md:text-lg font-bold text-slate-900 truncate leading-none">
              Control Visual de Instalaciones Eléctricas
            </h1>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs font-semibold text-slate-500 bg-slate-50 py-1.5 px-3 rounded-xl border border-slate-150 hidden sm:inline-block">
              {tenant?.name || 'Cargando...'}
            </span>
          </div>
        </header>

        {loading ? (
          <div className="flex-grow flex items-center justify-center p-8">
            <div className="text-center space-y-4">
              <Loader2 className="h-10 w-10 animate-spin text-[#468DFF] mx-auto" />
              <p className="text-xs text-slate-500 font-medium">Cargando registros de control eléctrico...</p>
            </div>
          </div>
        ) : (
          <div className="max-w-[95%] mx-auto w-full py-8 px-4 md:px-0 flex-1 flex flex-col min-h-0">
            
            {/* SI FORMULARIO ESTÁ ABIERTO */}
            {isFormOpen ? (
              <div className="bg-white border border-slate-150 rounded-2xl shadow-sm flex-1 flex flex-col min-h-0 overflow-hidden max-h-[85vh] animate-scaleUp">
                
                {/* Cabecera del formulario */}
                <div className="px-5 py-4 border-b border-slate-150 bg-slate-50/50 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2">
                    <button 
                      type="button" 
                      onClick={handleExitForm}
                      className="p-1 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-all cursor-pointer"
                      title="Volver"
                    >
                      <ArrowLeft className="h-4.5 w-4.5" />
                    </button>
                    <h2 className="text-sm font-bold text-slate-800 font-outfit uppercase tracking-wider">
                      {isReadOnlyView ? 'Visualización de Planilla' : editingId ? 'Editar Control Eléctrico' : 'Registrar Nuevo Control Eléctrico'}
                    </h2>
                  </div>
                  <button 
                    type="button" 
                    onClick={handleExitForm}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-all cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Formulario con Scroll local */}
                <form onSubmit={handleSave} className="overflow-y-auto flex-1 scrollbar-thin p-5 sm:p-6 space-y-6">
                  
                  {/* SECCIÓN 1: DATOS GENERALES */}
                  <div className="space-y-4">
                    <h3 className="font-outfit text-sm font-bold text-slate-800 border-b border-slate-100 pb-1.5 uppercase tracking-wider flex items-center gap-2">
                      <Building className="h-4 w-4 text-[#468DFF]" />
                      1. Información del Establecimiento y Fecha
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      
                      {/* Razón Social */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-600">Razón Social *</label>
                        <select
                          value={empresaId}
                          onChange={(e) => {
                            setEmpresaId(e.target.value);
                            setEstablecimientoId('');
                          }}
                          required
                          disabled={isFormDisabled || (profile && profile.role === 'cliente')}
                          className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                        >
                          <option value="">Seleccionar Cliente...</option>
                          {empresas.map(emp => (
                            <option key={emp.id} value={emp.id}>{emp.razon_social}</option>
                          ))}
                        </select>
                      </div>

                      {/* Establecimiento */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-600">Establecimiento *</label>
                        <select
                          value={establecimientoId}
                          onChange={(e) => setEstablecimientoId(e.target.value)}
                          required
                          disabled={isFormDisabled || !empresaId}
                          className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                        >
                          <option value="">Seleccionar Establecimiento...</option>
                          {filteredEstablecimientos.map(est => (
                            <option key={est.id} value={est.id}>{est.denominacion}</option>
                          ))}
                        </select>
                      </div>

                      {/* C.U.I.T. (Lectura) */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-500">C.U.I.T. (Lectura)</label>
                        <input
                          type="text"
                          value={derivedCuit}
                          readOnly
                          placeholder="CUIT automático"
                          className="w-full border border-slate-150 rounded-xl px-3.5 py-2 text-sm bg-slate-100 text-slate-500 outline-none"
                        />
                      </div>

                      {/* Dirección (Lectura) */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-500">Dirección (Lectura)</label>
                        <input
                          type="text"
                          value={derivedDireccion}
                          readOnly
                          placeholder="Dirección automática"
                          className="w-full border border-slate-150 rounded-xl px-3.5 py-2 text-sm bg-slate-100 text-slate-500 outline-none truncate"
                        />
                      </div>

                      {/* Fecha */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-600">Fecha *</label>
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="DD/MM/YYYY"
                            maxLength={10}
                            value={fecha}
                            onChange={(e) => setFecha(formatAsDateInput(e.target.value))}
                            required
                            disabled={isFormDisabled}
                            className="w-full border border-slate-200 rounded-xl pl-3.5 pr-10 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 font-mono disabled:bg-slate-100 disabled:text-slate-450"
                          />
                          {!isFormDisabled && (
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
                                  }
                                }}
                              />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Profesional Interviniente */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-600">Profesional Interviniente *</label>
                        <select
                          value={profesionalId || (profesionalTipo === 'manual' ? '__custom__' : '')}
                          onChange={(e) => handleProfesionalChange(e.target.value)}
                          required
                          disabled={isFormDisabled || (profile && profile.role === 'cliente')}
                          className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 cursor-pointer disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                        >
                          <option value="">Seleccionar Profesional...</option>
                          {miembrosList.map(m => (
                            <option key={m.id} value={m.id}>{m.full_name}</option>
                          ))}
                          <option value="__custom__">Otro (cargar manualmente)...</option>
                        </select>

                        {profesionalTipo === 'manual' && (
                          <input
                            type="text"
                            placeholder="Nombre y Apellido del Profesional"
                            value={profesionalNombre}
                            onChange={(e) => setProfesionalNombre(e.target.value)}
                            required
                            disabled={isFormDisabled}
                            className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-white mt-2 transition-all disabled:bg-slate-100 disabled:text-slate-400"
                          />
                        )}
                      </div>

                    </div>
                  </div>

                  {/* SECCIÓN 2: PLANILLA DE VERIFICACIÓN */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
                      <Zap className="h-4 w-4 text-[#468DFF]" />
                      2. Ítems a Verificar (Grilla de Control)
                    </h3>
                    
                    <div className="border border-slate-150 rounded-xl overflow-hidden shadow-sm">
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-left text-xs min-w-[700px]">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-150 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                              <th className="px-4 py-3 w-12 text-center">N°</th>
                              <th className="px-4 py-3 w-[350px]">Ítem a Verificar</th>
                              <th className="px-4 py-3 w-44 text-center">Estado (Ok / No Ok / N.A.)</th>
                              <th className="px-4 py-3">Observaciones / Recomendaciones</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 bg-white">
                            {formItems.map((item) => (
                              <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-4 py-3 text-center font-bold text-slate-400">{item.id}</td>
                                <td className="px-4 py-3 font-semibold text-slate-700 break-words leading-normal">{item.text}</td>
                                <td className="px-4 py-3">
                                  <div className="flex border border-slate-200 rounded-xl overflow-hidden text-[10px] font-bold bg-slate-50 shrink-0 select-none">
                                    <button
                                      type="button"
                                      onClick={() => handleItemEstadoChange(item.id, 'Ok')}
                                      disabled={isFormDisabled}
                                      className={`px-2.5 py-1.5 transition-colors cursor-pointer text-center flex-1 ${
                                        item.estado === 'Ok'
                                          ? 'bg-[#00b050] text-white font-extrabold shadow-sm'
                                          : 'text-slate-500 hover:text-slate-700 bg-white font-semibold'
                                      }`}
                                    >
                                      Ok
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleItemEstadoChange(item.id, 'No Ok')}
                                      disabled={isFormDisabled}
                                      className={`px-2.5 py-1.5 transition-colors cursor-pointer text-center flex-1 border-l border-slate-200 ${
                                        item.estado === 'No Ok'
                                          ? 'bg-red-500 text-white font-extrabold shadow-sm'
                                          : 'text-slate-500 hover:text-slate-700 bg-white font-semibold'
                                      }`}
                                    >
                                      No Ok
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleItemEstadoChange(item.id, 'No aplica')}
                                      disabled={isFormDisabled}
                                      className={`px-2.5 py-1.5 transition-colors cursor-pointer text-center flex-1 border-l border-slate-200 ${
                                        item.estado === 'No aplica'
                                          ? 'bg-slate-500 text-white font-extrabold shadow-sm'
                                          : 'text-slate-500 hover:text-slate-700 bg-white font-semibold'
                                      }`}
                                    >
                                      N.A.
                                    </button>
                                  </div>
                                </td>
                                <td className="px-4 py-2">
                                  <input
                                    type="text"
                                    value={item.observaciones || ''}
                                    onChange={(e) => handleItemObsChange(item.id, e.target.value)}
                                    placeholder="Ingrese recomendaciones o detalles si corresponde..."
                                    disabled={isFormDisabled}
                                    className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 bg-white focus:outline-none focus:border-[#468DFF] disabled:bg-slate-100 disabled:cursor-not-allowed font-medium"
                                  />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  {/* SECCIÓN 3: DETALLES Y OBSERVACIONES FINALES */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
                      <ClipboardList className="h-4 w-4 text-[#468DFF]" />
                      3. Observaciones Generales
                    </h3>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-600">Observaciones Generales o Diagnóstico Final</label>
                      <textarea
                        value={observaciones}
                        onChange={(e) => setObservaciones(e.target.value)}
                        placeholder="Escriba comentarios o notas generales adicionales sobre el control..."
                        disabled={isFormDisabled}
                        rows={3}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-[#468DFF] resize-y scrollbar-thin disabled:bg-slate-100 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>

                  {/* SECCIÓN 4: FIRMAS */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
                      <Check className="h-4 w-4 text-[#468DFF]" />
                      4. Firmas del Control
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                      {/* Columna Izquierda: Firma Responsable */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between pb-1">
                          <label className="text-xs font-bold text-slate-600 pr-2">Firma del Responsable de la Empresa</label>
                          {!isReadOnlyView && firmaRespSavedUrl && (
                            <button
                              type="button"
                              onClick={() => handleClearCanvas(firmaRespCanvasRef, setHasSignedResp, setFirmaRespSavedUrl)}
                              className="text-[10px] font-bold text-red-500 hover:underline cursor-pointer border-none bg-transparent"
                            >
                              Limpiar Firma
                            </button>
                          )}
                        </div>
                        
                        <div className="border border-slate-250 rounded-xl bg-slate-50 overflow-hidden flex flex-col">
                          {firmaRespSavedUrl ? (
                            <div className="aspect-[2/1] bg-white flex items-center justify-center p-3">
                              <img src={firmaRespSavedUrl} alt="Firma Responsable" className="max-h-full max-w-full object-contain" />
                            </div>
                          ) : (
                            <div className="relative aspect-[2/1] bg-white">
                              {isReadOnlyView && (
                                <div className="absolute inset-0 bg-slate-50/70 flex items-center justify-center text-xs text-slate-400 italic font-semibold">
                                  Sin firma registrada
                                </div>
                              )}
                              <canvas
                                ref={firmaRespRefCallback}
                                width={400}
                                height={200}
                                className="w-full h-full block cursor-crosshair"
                              />
                            </div>
                          )}
                          <div className="bg-slate-50 border-t border-slate-200 px-3.5 py-2.5 flex items-center gap-2">
                            <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider shrink-0 mt-0.5">Aclaración:</span>
                            <input
                              type="text"
                              value={responsableAclaracion}
                              onChange={(e) => setResponsableAclaracion(e.target.value)}
                              placeholder="Nombre impreso del firmante..."
                              disabled={isFormDisabled}
                              className="flex-1 bg-transparent border-none p-0 text-xs text-slate-800 font-bold focus:outline-none focus:ring-0 placeholder:text-slate-400 placeholder:font-normal"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Columna Derecha: Firma Profesional */}
                      <div className="space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1">
                          <label className="text-xs font-bold text-slate-600">Firma del Profesional de Higiene y Seguridad</label>
                          {!isReadOnlyView && (
                            <div className="flex border border-slate-200 rounded-xl overflow-hidden text-[10px] font-bold bg-slate-100 shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  setFirmaTipo('perfil');
                                  setFirmaProfSavedUrl('');
                                  setHasSignedProf(false);
                                }}
                                className={`px-2.5 py-1.5 transition-all cursor-pointer ${
                                  firmaTipo === 'perfil'
                                    ? 'bg-[#468DFF] text-white font-extrabold'
                                    : 'text-slate-500 hover:text-slate-700 bg-white font-semibold'
                                }`}
                              >
                                Firma de Perfil
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setFirmaTipo('mano');
                                  setFirmaProfSavedUrl('');
                                  setHasSignedProf(false);
                                }}
                                className={`px-2.5 py-1.5 transition-all cursor-pointer border-l border-slate-200 ${
                                  firmaTipo === 'mano'
                                    ? 'bg-[#468DFF] text-white font-extrabold'
                                    : 'text-slate-500 hover:text-slate-700 bg-white font-semibold'
                                }`}
                              >
                                Firmar a mano
                              </button>
                            </div>
                          )}
                        </div>

                        <div className="border border-slate-250 rounded-xl bg-slate-50 overflow-hidden flex flex-col">
                          
                          {firmaTipo === 'perfil' ? (
                            <div className="aspect-[2/1] bg-white flex flex-col items-center justify-center p-3 gap-2">
                              {firmaPerfilPreviewUrl ? (
                                <img src={firmaPerfilPreviewUrl} alt="Firma de Perfil" className="max-h-[85%] max-w-full object-contain" />
                              ) : (
                                <span className="text-[10px] text-slate-400 font-semibold italic">El profesional seleccionado no posee firma de perfil</span>
                              )}
                            </div>
                          ) : (
                            /* Firma a mano */
                            <>
                              {firmaProfSavedUrl ? (
                                <div className="aspect-[2/1] bg-white flex items-center justify-center p-3 relative">
                                  <img src={firmaProfSavedUrl} alt="Firma Profesional" className="max-h-full max-w-full object-contain" />
                                  {!isReadOnlyView && (
                                    <button
                                      type="button"
                                      onClick={() => handleClearCanvas(firmaProfCanvasRef, setHasSignedProf, setFirmaProfSavedUrl)}
                                      className="absolute top-2 right-2 text-[10px] font-bold text-red-500 hover:underline bg-white/80 px-2 py-0.5 rounded shadow-sm cursor-pointer"
                                    >
                                      Re-firmar
                                    </button>
                                  )}
                                </div>
                              ) : (
                                <div className="relative aspect-[2/1] bg-white">
                                  {isReadOnlyView && (
                                    <div className="absolute inset-0 bg-slate-50/70 flex items-center justify-center text-xs text-slate-400 italic font-semibold">
                                      Sin firma registrada
                                    </div>
                                  )}
                                  <canvas
                                    ref={firmaProfRefCallback}
                                    width={400}
                                    height={200}
                                    className="w-full h-full block cursor-crosshair"
                                  />
                                  {!isReadOnlyView && hasSignedProf && (
                                    <button
                                      type="button"
                                      onClick={() => handleClearCanvas(firmaProfCanvasRef, setHasSignedProf, setFirmaProfSavedUrl)}
                                      className="absolute top-2 right-2 text-[10px] font-bold text-red-500 hover:underline bg-white/80 px-2 py-0.5 rounded shadow-sm cursor-pointer"
                                    >
                                      Limpiar
                                    </button>
                                  )}
                                </div>
                              )}
                            </>
                          )}

                        </div>
                      </div>

                    </div>
                  </div>

                  {/* SECCIÓN DE BOTONES DE ACCIÓN */}
                  {!isReadOnlyView && (
                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-150">
                      <button
                        type="button"
                        onClick={handleCloseForm}
                        className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-all cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={saveLoading}
                        className="px-5 py-2 bg-[#468DFF] hover:bg-[#0511F2] disabled:bg-slate-200 text-white border border-[#468DFF] hover:border-[#0511F2] rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed shadow-md shadow-[#468DFF]/10"
                      >
                        {saveLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                        {editingId ? 'Guardar Cambios' : 'Registrar Control'}
                      </button>
                    </div>
                  )}

                </form>
              </div>
            ) : (
              /* SI NO ESTÁ ABIERTO EL FORMULARIO - MOSTRAR TABLA DE CONTENIDOS Y FILTROS */
              <div className="space-y-6 flex-grow flex flex-col min-h-0">
                
                {/* PANEL DE FILTROS (SySO Compact Layout) */}
                <div className="bg-white border border-slate-150 rounded-2xl p-3 shadow-sm space-y-3 shrink-0">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
                    {/* Espaciador para empujar el buscador a la derecha en desktop */}
                    <div className="hidden md:block flex-1"></div>

                    {/* Buscador */}
                    <div className="flex flex-col md:flex-row md:items-center gap-2 w-full md:w-auto">
                      <div className="relative w-full md:w-64">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
                        <input
                          type="text"
                          placeholder="Buscar por profesional, aclaración, observaciones..."
                          value={filterText}
                          onChange={(e) => setFilterText(e.target.value)}
                          className="w-full pl-9 pr-3.5 py-1.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all text-slate-700 placeholder-slate-400"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Filtros avanzados colapsables */}
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

                        {(filterText || filterEmpresa || filterEstablecimiento) && (
                          <button
                            onClick={() => {
                              setFilterText('');
                              setFilterEmpresa('');
                              setFilterEstablecimiento('');
                            }}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[10px] font-semibold cursor-pointer transition-all border border-slate-200"
                          >
                            Limpiar filtros
                          </button>
                        )}
                      </div>

                      {canCargar && (
                        <button
                          type="button"
                          onClick={handleAddNew}
                          className="px-3 py-1.5 bg-[#468DFF] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-[#0511F2] transition-all cursor-pointer shadow-lg shadow-[#468DFF]/10 shrink-0 border border-[#468DFF] hover:border-[#0511F2]"
                        >
                          <PlusCircle className="h-3.5 w-3.5" />
                          Nuevo Control
                        </button>
                      )}
                    </div>

                    {showFilters && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 pt-1 animate-scaleUp">
                        {/* Empresa Filter */}
                        {profile && profile.role !== 'cliente' && (
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Cliente / Empresa</label>
                            <select
                              value={filterEmpresa}
                              onChange={(e) => {
                                setFilterEmpresa(e.target.value);
                                setFilterEstablecimiento('');
                              }}
                              className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-[11px] font-semibold text-slate-600 bg-white focus:outline-none focus:ring-1 focus:ring-[#468DFF] cursor-pointer"
                            >
                              <option value="">Todos los Clientes...</option>
                              {empresas.map(emp => (
                                <option key={emp.id} value={emp.id}>{emp.razon_social}</option>
                              ))}
                            </select>
                          </div>
                        )}

                        {/* Establecimiento Filter */}
                        <div className="space-y-1 col-span-1 md:col-span-2">
                          <label className="text-[10px] font-bold text-slate-400 uppercase">Establecimiento</label>
                          <select
                            value={filterEstablecimiento}
                            onChange={(e) => setFilterEstablecimiento(e.target.value)}
                            disabled={!filterEmpresa && profile?.role !== 'cliente'}
                            className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-[11px] font-semibold text-slate-600 bg-white focus:outline-none focus:ring-1 focus:ring-[#468DFF] cursor-pointer disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed"
                          >
                            <option value="">Todos los Establecimientos...</option>
                            {allEstablecimientos.filter(est => !filterEmpresa || est.empresa_id === filterEmpresa).map(est => (
                              <option key={est.id} value={est.id}>{est.denominacion}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* CONTENEDOR DE TABLA (SySO Compact Layout) */}
                <div 
                  className="bg-white border border-slate-150 rounded-2xl shadow-sm overflow-hidden flex flex-col flex-1 min-h-0 transition-all duration-300 ease-in-out"
                  style={{ height: showFilters ? 'calc(100vh - 310px)' : 'calc(100vh - 240px)' }}
                >
                  <div className="overflow-auto flex-grow scrollbar-thin">
                    {sortedControles.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center p-8 text-center gap-3">
                        <AlertTriangle className="h-10 w-10 text-slate-300" />
                        <p className="text-sm font-bold text-slate-800">No hay controles eléctricos registrados</p>
                        <p className="text-xs text-slate-400">Registra un nuevo control visual de instalaciones eléctricas para comenzar.</p>
                        {canCargar && (
                          <button
                            onClick={handleAddNew}
                            className="px-4 py-2 mt-2 bg-[#468DFF] hover:bg-[#0511F2] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-[#0511F2] transition-all cursor-pointer shadow-md shadow-[#468DFF]/10 shrink-0 border border-[#468DFF] hover:border-[#0511F2]"
                          >
                            + Registrar Control
                          </button>
                        )}
                      </div>
                    ) : (
                      <table className="w-full border-collapse text-left text-xs min-w-[850px]">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-150 text-[10px] font-bold text-slate-400 uppercase tracking-wider sticky top-0 z-10">
                            <th onClick={() => toggleSort('empresa')} className="px-6 py-4 cursor-pointer select-none">
                              Cliente / Razón Social {sortField === 'empresa' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                            </th>
                            <th onClick={() => toggleSort('establecimiento')} className="px-6 py-4 cursor-pointer select-none">
                              Establecimiento {sortField === 'establecimiento' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                            </th>
                            <th onClick={() => toggleSort('fecha')} className="px-6 py-4 cursor-pointer select-none">
                              Fecha {sortField === 'fecha' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                            </th>
                            <th className="px-6 py-4">Profesional Interviniente</th>
                            <th className="px-6 py-4">Aclaración Responsable</th>
                            <th className="px-6 py-4 text-center">Resultado</th>
                            <th className="px-6 py-4 text-center w-28">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {sortedControles.map((c) => {
                            const emp = empresas.find(e => e.id === c.empresa_id);
                            const est = allEstablecimientos.find(e => e.id === c.establecimiento_id);
                            
                            // Calcular cantidad de items Ok y No Ok
                            const totalItems = c.items ? c.items.length : INITIAL_ITEMS.length;
                            const okItems = c.items ? c.items.filter(it => it.estado === 'Ok').length : 0;
                            const noOkItems = c.items ? c.items.filter(it => it.estado === 'No Ok').length : 0;
                            const naItems = c.items ? c.items.filter(it => it.estado === 'No aplica').length : 0;
                            const pendingItems = totalItems - okItems - noOkItems - naItems;

                            return (
                              <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                                <td 
                                  onClick={() => {
                                    setIsReadOnlyView(true);
                                    handleEditClick(c);
                                  }} 
                                  className="px-6 py-4 font-bold text-slate-800"
                                >
                                  {emp ? emp.razon_social : 'N/A'}
                                </td>
                                <td 
                                  onClick={() => {
                                    setIsReadOnlyView(true);
                                    handleEditClick(c);
                                  }} 
                                  className="px-6 py-4 font-semibold text-slate-600"
                                >
                                  {est ? est.denominacion : 'N/A'}
                                </td>
                                <td 
                                  onClick={() => {
                                    setIsReadOnlyView(true);
                                    handleEditClick(c);
                                  }} 
                                  className="px-6 py-4 font-mono font-bold text-slate-500"
                                >
                                  {formatDate(c.fecha)}
                                </td>
                                <td 
                                  onClick={() => {
                                    setIsReadOnlyView(true);
                                    handleEditClick(c);
                                  }} 
                                  className="px-6 py-4 text-slate-600 font-medium"
                                >
                                  {c.profesional_nombre}
                                </td>
                                <td 
                                  onClick={() => {
                                    setIsReadOnlyView(true);
                                    handleEditClick(c);
                                  }} 
                                  className="px-6 py-4 text-slate-500 font-medium"
                                >
                                  {c.responsable_aclaracion || 'N/A'}
                                </td>
                                <td 
                                  onClick={() => {
                                    setIsReadOnlyView(true);
                                    handleEditClick(c);
                                  }} 
                                  className="px-6 py-4 text-center font-semibold"
                                >
                                  <div className="inline-flex flex-col gap-1 items-center justify-center">
                                    <span className="text-[10px] text-slate-500">
                                      Ok: {okItems} / No Ok: {noOkItems}
                                    </span>
                                    {noOkItems > 0 ? (
                                      <span className="px-2 py-0.5 rounded bg-red-100 text-red-700 text-[9px] font-bold">Riesgos</span>
                                    ) : pendingItems > 0 ? (
                                      <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-700 text-[9px] font-bold">Incompleto</span>
                                    ) : (
                                      <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[9px] font-bold">Conforme</span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex items-center justify-center gap-1.5">
                                    <button
                                      onClick={() => handleExportPdfReport(c, false)}
                                      className="p-1.5 rounded-lg bg-blue-50 text-[#468DFF] hover:bg-blue-100 hover:text-[#0511F2] transition-colors"
                                      title="Exportar PDF"
                                    >
                                      <FileText className="h-4 w-4" />
                                    </button>
                                    <button
                                      onClick={() => handleExportPdfReport(c, true)}
                                      className="p-1.5 rounded-lg bg-blue-50 text-[#468DFF] hover:bg-blue-100 hover:text-[#0511F2] transition-colors"
                                      title="Imprimir"
                                    >
                                      <Printer className="h-4 w-4" />
                                    </button>
                                    
                                    {canEditar && (
                                      <button
                                        onClick={() => {
                                          setIsReadOnlyView(false);
                                          handleEditClick(c);
                                        }}
                                        className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-600 transition-colors"
                                        title="Editar"
                                      >
                                        <Edit className="h-4 w-4" />
                                      </button>
                                    )}

                                    {canEliminar && (
                                      <button
                                        onClick={() => handleDeleteClick(c.id)}
                                        className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition-colors"
                                        title="Eliminar"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>

              </div>
            )}

          </div>
        )}

      </main>

      {/* TOAST FEEDBACK */}
      {toast.show && (
        <div className={`fixed bottom-4 right-4 z-50 px-4.5 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs font-bold text-white transition-all animate-slideIn ${
          toast.type === 'error' ? 'bg-red-500' : toast.type === 'info' ? 'bg-[#468DFF]' : 'bg-emerald-500'
        }`}>
          {toast.type === 'error' ? <AlertTriangle className="h-4.5 w-4.5" /> : <Check className="h-4.5 w-4.5" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* MODAL DIALOG PREGUNTA/ALERTA */}
      {modalAlert.show && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-150 rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4 animate-scaleUp">
            <h3 className="font-outfit text-base font-extrabold text-slate-900">{modalAlert.title}</h3>
            <p className="text-xs text-slate-500 leading-relaxed">{modalAlert.message}</p>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={closeAlert}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={modalAlert.onConfirm}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                {modalAlert.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
