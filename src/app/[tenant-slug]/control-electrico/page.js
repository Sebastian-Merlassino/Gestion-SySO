// src/app/[tenant-slug]/control-electrico/page.js
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import { supabase } from '@/lib/supabase';
import { formatDate, formatAsDateInput, convertToDbDate } from '@/lib/utils';
import { useToast } from '@/components/providers/ToastProvider';
import AppPageHeader from '@/components/ui/AppPageHeader';
import AppButton from '@/components/ui/AppButton';
import AppInput from '@/components/ui/AppInput';
import AppSelect from '@/components/ui/AppSelect';
import AppConfirmDialog from '@/components/ui/AppConfirmDialog';
import AppCard from '@/components/ui/AppCard';
import AppEmptyState from '@/components/ui/AppEmptyState';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import ImageUploadZone from '@/components/ui/ImageUploadZone';
import AITextHelper from '@/components/ui/AITextHelper';
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
  ChevronDown,
  Image as ImageIcon,
  Send,
  Download,
  Mail
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
  const [fotosFiles, setFotosFiles] = useState([]);

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
  const globalToast = useToast();
  const [modalAlert, setModalAlert] = useState({ show: false, title: '', message: '', onConfirm: null, confirmText: 'Confirmar' });
  const [saveLoading, setSaveLoading] = useState(false);

  // Estados de Envío por Correo (Fase 3)
  const [isMailModalOpen, setIsMailModalOpen] = useState(false);
  const [mailTargetControl, setMailTargetControl] = useState(null);
  const [availableEmails, setAvailableEmails] = useState([]);
  const [manualEmail, setManualEmail] = useState('');
  const [mailLoading, setMailLoading] = useState(false);

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
    const resolveProfileSignaturePreview = async () => {
      if (!signaturePath || firmaTipo !== 'perfil' || !isFormOpen) {
        setFirmaPerfilPreviewUrl('');
        return;
      }

      if (signaturePath.startsWith('data:')) {
        setFirmaPerfilPreviewUrl(signaturePath);
      } else if (isDevMode || signaturePath.startsWith('mock')) {
        setFirmaPerfilPreviewUrl('/brand/logo-primary.png');
      } else {
        try {
          let relativePath = signaturePath;
          let isExternal = false;
          
          if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
            try {
              const urlObj = new URL(relativePath);
              const pathParts = urlObj.pathname.split('/');
              const bucketIndex = pathParts.findIndex(part => part === 'signatures' || part === 'documents');
              if (bucketIndex !== -1 && bucketIndex < pathParts.length - 1) {
                relativePath = pathParts.slice(bucketIndex + 1).join('/');
              } else {
                isExternal = true;
              }
            } catch (urlErr) {
              console.error('Error parseando URL de firma de perfil:', urlErr);
              isExternal = true;
            }
          }

          if (isExternal) {
            setFirmaPerfilPreviewUrl(relativePath);
          } else {
            const { data: sData, error: sErr } = await supabase.storage
              .from('signatures')
              .createSignedUrl(relativePath, 3600);
            if (!sErr && sData?.signedUrl) {
              setFirmaPerfilPreviewUrl(sData.signedUrl);
            } else {
              setFirmaPerfilPreviewUrl('/brand/logo-primary.png');
            }
          }
        } catch (e) {
          console.error('Error cargando previsualización de firma de perfil:', e);
          setFirmaPerfilPreviewUrl('/brand/logo-primary.png');
        }
      }
    };

    resolveProfileSignaturePreview();
  }, [isFormOpen, signaturePath, profesionalTipo, firmaTipo, isDevMode]);

  const triggerToast = (message, type = 'success') => {
    globalToast.toast(message, type);
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
        .select('id, razon_social, cuit')
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
      { id: 'mock-empresa-1', razon_social: 'Ams Inversiones S.A.', cuit: '30-12345678-9' },
      { id: 'mock-empresa-2', razon_social: 'Argento Via Publica', cuit: '30-98765432-1' }
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
    // Revocar preview blobs
    fotosFiles.forEach(foto => {
      if (foto.preview && foto.preview.startsWith('blob:')) {
        URL.revokeObjectURL(foto.preview);
      }
    });
    setFotosFiles([]);
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
    setFotosFiles([]);

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
      const tenantIdValue = isDevMode ? 'mock-tenant' : (tenant?.id || profile?.tenant_id);
      if (!tenantIdValue) {
        triggerToast('No se detectó una sesión de organización activa.', 'error');
        setSaveLoading(false);
        return;
      }

      const tempId = editingId || crypto.randomUUID();

      // Subir firmas si hay dibujos nuevos
      let finalFirmaProf = '';

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

      // Subir fotos
      const finalFotosUrls = [];
      for (let i = 0; i < fotosFiles.length; i++) {
        const foto = fotosFiles[i];
        if (foto.file) {
          const uploadedPath = await uploadFileToStorage(foto.file, 'control_electrico_registro', i);
          finalFotosUrls.push(uploadedPath);
        } else if (foto.path) {
          finalFotosUrls.push(foto.path);
        }
      }

      const payload = {
        id: tempId,
        tenant_id: tenantIdValue,
        empresa_id: empresaId,
        establecimiento_id: establecimientoId,
        fecha: convertToDbDate(fecha) || null,
        items: formItems.map(it => ({ id: it.id, text: it.text, estado: it.estado, observaciones: '' })),
        responsable_aclaracion: null,
        profesional_tipo: profesionalTipo,
        profesional_nombre: finalProfNombre,
        profesional_id: (profesionalTipo === 'miembro' && profesionalId && profesionalId !== '') ? profesionalId : null,
        firma_tipo: firmaTipo,
        firma_responsable: null,
        firma_profesional: finalFirmaProf,
        observaciones: observaciones.trim() || null,
        adjuntar_registros_urls: finalFotosUrls,
        updated_at: new Date().toISOString()
      };

      if (isDevMode) {
        const mockCe = {
          ...payload,
          fotos_preview_urls: fotosFiles.map(f => f.preview),
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
    setFotosFiles([]);
    setHasSignedResp(false);
    setHasSignedProf(false);

    if (isDevMode) {
      setFirmaRespSavedUrl(c.firma_responsable ? '/brand/logo-primary.png' : '');
      setFirmaProfSavedUrl((c.firma_tipo || 'perfil') === 'mano' && c.firma_profesional ? '/brand/logo-primary.png' : '');
      if (c.adjuntar_registros_urls && c.adjuntar_registros_urls.length > 0) {
        setFotosFiles(c.adjuntar_registros_urls.map(p => ({
          file: null,
          preview: '/brand/logo-primary.png',
          path: p
        })));
      }
    } else {
      const pathsToSign = [];
      if (c.firma_responsable && c.firma_responsable !== 'N/A' && !c.firma_responsable.startsWith('http')) {
        pathsToSign.push(c.firma_responsable);
      }
      if ((c.firma_tipo || 'perfil') === 'mano' && c.firma_profesional && c.firma_profesional !== 'N/A' && !c.firma_profesional.startsWith('http')) {
        pathsToSign.push(c.firma_profesional);
      }
      if (c.adjuntar_registros_urls && c.adjuntar_registros_urls.length > 0) {
        c.adjuntar_registros_urls.forEach(p => {
          if (p && p !== 'N/A' && p !== '') {
            if (!p.startsWith('http://') && !p.startsWith('https://')) {
              pathsToSign.push(p);
            }
          }
        });
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
        if (c.adjuntar_registros_urls && c.adjuntar_registros_urls.length > 0) {
          const validUrls = c.adjuntar_registros_urls.filter(p => p && p !== 'N/A' && p !== '');
          const loadedFotos = validUrls.map(path => {
            let preview = '/brand/logo-primary.png';
            if (path.startsWith('http://') || path.startsWith('https://')) {
              preview = path;
            } else {
              preview = signedUrlsMap[path] || '/brand/logo-primary.png';
            }
            return {
              file: null,
              preview,
              path
            };
          });
          setFotosFiles(loadedFotos);
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

  const getImgDimensions = (base64Str) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        resolve({ width: img.width, height: img.height });
      };
      img.onerror = () => {
        resolve({ width: 127.5, height: 49.5 });
      };
    });
  };

  const handleExportPdfReport = async (c, shouldPrint = false, shouldDownload = true) => {
    try {
      triggerToast('Generando reporte PDF...', 'info');

      // A4 portrait en pt es aprox 595.28 x 841.89 (redondeado a 596 x 842)
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'pt',
        format: 'a4',
        compress: true
      });

      const emp = empresas.find(e => e.id === c.empresa_id);
      const est = allEstablecimientos.find(e => e.id === c.establecimiento_id);

      // 1. Cargar firma del profesional
      let fProfBase64 = '';
      if (c.firma_profesional) {
        try {
          if (c.firma_profesional.startsWith('data:')) {
            fProfBase64 = c.firma_profesional;
          } else if (isDevMode || c.firma_profesional.startsWith('mock')) {
            fProfBase64 = await getBase64ImageFromUrl('/brand/logo-primary.png');
          } else {
            // Extraer path relativo si es una URL de Supabase Storage (pública o privada)
            let relativePath = c.firma_profesional;
            let isExternal = false;
            
            if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
              try {
                const urlObj = new URL(relativePath);
                const pathParts = urlObj.pathname.split('/');
                const bucketIndex = pathParts.findIndex(part => part === 'signatures' || part === 'documents');
                if (bucketIndex !== -1 && bucketIndex < pathParts.length - 1) {
                  relativePath = pathParts.slice(bucketIndex + 1).join('/');
                } else {
                  isExternal = true;
                }
              } catch (urlErr) {
                console.error('Error parseando URL de firma:', urlErr);
                isExternal = true;
              }
            }

            if (isExternal) {
              fProfBase64 = await getBase64ImageFromUrl(c.firma_profesional);
            } else {
              const bucketName = c.firma_tipo === 'perfil' ? 'signatures' : 'documents';
              const { data: sData, error: sErr } = await supabase.storage
                .from(bucketName)
                .createSignedUrl(relativePath, 3600);
              if (!sErr && sData?.signedUrl) {
                fProfBase64 = await getBase64ImageFromUrl(sData.signedUrl);
              }
            }
          }
        } catch (errSig) {
          console.error('Error al resolver firma del profesional para PDF:', errSig);
        }
      }
      if (fProfBase64) fProfBase64 = await resizeImageForPdf(fProfBase64, 250, 150);

      // 2. Cargar fotos del anexo
      const fotosBase64 = [];
      if (c.adjuntar_registros_urls && c.adjuntar_registros_urls.length > 0) {
        for (let i = 0; i < c.adjuntar_registros_urls.length; i++) {
          const path = c.adjuntar_registros_urls[i];
          if (path && path !== 'N/A' && path !== '') {
            try {
              let signedUrl = path;
              if (!isDevMode && !path.startsWith('http')) {
                const { data } = await supabase.storage.from('documents').createSignedUrl(path, 360);
                if (data) signedUrl = data.signedUrl;
              }
              const b64 = await getBase64ImageFromUrl(signedUrl || '/brand/logo-primary.png');
              if (b64) {
                const resized = await resizeImageForPdf(b64, 400, 300);
                fotosBase64.push(resized);
              }
            } catch (err) {
              console.error('Error cargando foto para PDF:', err);
            }
          }
        }
      }

      // Obtener nombre de la consultora de la sesión o de la base de datos
      let tenantName = tenant?.name;
      if (isDevMode && !tenantName) {
        tenantName = 'Consultora de Prueba';
      }
      const activeTenantId = profile?.tenant_id || tenant?.id || c.tenant_id;
      if (!tenantName && activeTenantId) {
        try {
          const { data: tenData } = await supabase
            .from('tenants')
            .select('name')
            .eq('id', activeTenantId)
            .single();
          if (tenData) tenantName = tenData.name;
        } catch (errTen) {
          console.warn('Error cargando tenant desde BD para reporte PDF:', errTen);
        }
      }
      const companyName = tenantName || 'Gestión SySO';

      // 3. Logo del Tenant (sin deformación y tamaño idéntico a Visitas)
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
        logoBase64 = await resizeImageForPdf(logoBase64, 300, 300);
      }

      let logoWidth = 142.5;
      let logoHeight = 55;
      if (logoBase64) {
        try {
          const dims = await getImgDimensions(logoBase64);
          const ratio = dims.width / dims.height;
          const maxW = 142.5;
          const maxH = 55;
          if (ratio > maxW / maxH) {
            logoWidth = maxW;
            logoHeight = maxW / ratio;
          } else {
            logoHeight = maxH;
            logoWidth = maxH * ratio;
          }
        } catch (e) {
          console.error('Error calculando proporciones de logo:', e);
        }
      }

      const drawHeaderLogo = (d) => {
        if (logoBase64) {
          try {
            // Alinear exactamente al borde izquierdo de la tabla (x = 36 pt)
            d.addImage(logoBase64, 'PNG', 36, 15.65 + (55 - logoHeight)/2, logoWidth, logoHeight);
          } catch (err) {
            console.error('Error dibujando logo:', err);
          }
        }
      };

      // ==========================================
      // PÁGINA 1
      // ==========================================
      drawHeaderLogo(doc);

      // Barra de Título
      doc.setFillColor(60, 120, 216); // #3C78D8
      doc.rect(36, 75.2, 522.75, 18, 'F');
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(1);
      doc.rect(36, 75.2, 522.75, 18, 'S');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(255, 255, 255);
      doc.text('Inspección Visual de Instalaciones Eléctricas', 297.37, 88.5, { align: 'center' });

      // Tabla de Datos Generales
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(1);
      // Contorno exterior
      doc.rect(36, 107, 523, 37, 'S');
      // Línea horizontal media
      doc.line(36, 125.5, 559, 125.5);
      // Línea vertical central
      doc.line(397.5, 107, 397.5, 144);

      // Fila 1 - Razón Social & CUIT
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text('Razón social:', 41.25, 120);
      doc.setFont('helvetica', 'normal');
      doc.text(emp?.razon_social || 'N/A', 118, 120);

      doc.setFont('helvetica', 'bold');
      doc.text('C.U.I.T.:', 402.75, 120);
      doc.setFont('helvetica', 'normal');
      doc.text(emp?.cuit || 'N/A', 452, 120);

      // Fila 2 - Dirección & Fecha
      doc.setFont('helvetica', 'bold');
      doc.text('Dirección:', 41.25, 138);
      
      doc.setFont('helvetica', 'normal');
      const dirVal = est?.direccion || 'N/A';
      const dirLines = doc.splitTextToSize(dirVal, 290);
      if (dirLines.length > 1) {
        doc.setFontSize(10);
        doc.text(dirLines[0], 103, 134);
        doc.text(dirLines[1], 103, 142);
      } else {
        doc.setFontSize(12);
        doc.text(dirLines[0], 103, 138);
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('Fecha:', 402.75, 138);
      doc.setFont('helvetica', 'normal');
      doc.text(formatDate(c.fecha), 444, 138);

      // Tabla de Inspección - Encabezado
      doc.setFillColor(60, 120, 216); // #3C78D8
      doc.rect(36, 158.3, 522.5, 26.2, 'F');
      
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(1);
      doc.rect(36, 158.3, 522.5, 26.2, 'S');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(255, 255, 255);
      doc.text('N°', 48.5, 175.5, { align: 'center' });
      doc.text('Ítem a Verificar', 250, 175.5, { align: 'center' });
      
      doc.setFontSize(10);
      doc.text('Ok / No Ok / No aplica', 499, 174.5, { align: 'center' });

      // Tabla de Inspección - Filas
      const yLines = [
        158.5, 184.5, 216.5, 249.5, 281.5, 313.5, 345.5, 378.5, 
        410.5, 442.5, 474.5, 507.5, 539.5, 571.5, 603.5, 636.5, 668.5
      ];

      // Dibujar líneas horizontales
      for (let i = 0; i < yLines.length; i++) {
        doc.line(36, yLines[i], 558.5, yLines[i]);
      }
      // Dibujar líneas verticales
      const xLines = [36.5, 60.5, 439.5, 558.5];
      for (let i = 0; i < xLines.length; i++) {
        doc.line(xLines[i], 158.5, xLines[i], 668.5);
      }

      // Renderizar items y respuestas
      const itemsList = c.items || INITIAL_ITEMS;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);

      for (let i = 0; i < 15; i++) {
        const yStart = yLines[i + 1];
        const yEnd = yLines[i + 2];
        const it = itemsList[i] || { id: i + 1, text: '', estado: '' };

        // Columna N°
        doc.text((i + 1).toString(), 48.5, yStart + 20, { align: 'center' });

        // Columna Ítem a Verificar (salto de línea automático si es largo)
        const itLines = doc.splitTextToSize(it.text || '', 370);
        if (itLines.length === 1) {
          doc.text(itLines[0], 65.25, yStart + 20);
        } else {
          doc.text(itLines[0], 65.25, yStart + 14);
          doc.text(itLines[1], 65.25, yStart + 26);
        }

        // Columna Estado
        if (it.estado) {
          doc.setFont('helvetica', 'bold');
          doc.text(it.estado, 499, yStart + 20, { align: 'center' });
          doc.setFont('helvetica', 'normal');
        }
      }

      // ==========================================
      // PÁGINA 2
      // ==========================================
      doc.addPage();
      drawHeaderLogo(doc);

      // Bloque de Observaciones
      // Barra de Título
      doc.setFillColor(60, 120, 216); // #3C78D8
      doc.rect(36, 89, 523, 24.75, 'F');
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(1);
      doc.rect(36, 89, 523, 24.75, 'S');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(255, 255, 255);
      doc.text('Observaciones / Recomendaciones', 297.5, 105, { align: 'center' });

      // Área de Escritura
      doc.setFillColor(255, 255, 255);
      doc.rect(36, 113.75, 523, 149, 'F');
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(1);
      doc.rect(36, 113.75, 523, 149, 'S');

      // Texto Observaciones
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      const obsText = c.observaciones || 'N/A.';
      const splitObs = doc.splitTextToSize(obsText, 510);
      let curObsY = 130;
      for (let idx = 0; idx < splitObs.length; idx++) {
        if (curObsY < 255) {
          doc.text(splitObs[idx], 42, curObsY);
          curObsY += 13.8;
        }
      }

      // Bloque de Firma
      // Firma real del profesional
      if (fProfBase64 && fProfBase64.startsWith('data:image/')) {
        try {
          const sigDims = await getImgDimensions(fProfBase64);
          const sigRatio = sigDims.width / sigDims.height;
          const maxSigW = 240;
          const maxSigH = 120;
          let sigW = maxSigW;
          let sigH = maxSigH;
          if (sigRatio > maxSigW / maxSigH) {
            sigW = maxSigW;
            sigH = maxSigW / sigRatio;
          } else {
            sigH = maxSigH;
            sigW = maxSigH * sigRatio;
          }
          // Acotar el ancho al tramo de la línea física (194.25 pt) si excede
          if (sigW > 194.25) {
            sigW = 194.25;
            sigH = 194.25 / sigRatio;
          }
          const sigX = 34.5 + (194.25 - sigW) / 2;
          const sigY = 652 - sigH - 5;
          doc.addImage(fProfBase64, 'PNG', sigX, sigY, sigW, sigH);
        } catch (e) {
          console.error('Error insertando firma en reporte:', e);
        }
      }

      // Línea de firma punteada
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(1);
      doc.setLineDashPattern([2, 2], 0);
      doc.line(34.5, 652, 228.75, 652);
      doc.setLineDashPattern([], 0);

      // Texto de Aclaración de Firma
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text('Firma y aclaración del responsable', 131.62, 665, { align: 'center' });

      doc.setFont('helvetica', 'bold');
      doc.text(c.profesional_nombre || 'N/A', 131.62, 680, { align: 'center' });
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text('Responsable de Higiene y Seguridad', 131.62, 692, { align: 'center' });

      // ==========================================
      // ANEXO FOTOGRÁFICO (Páginas 3+)
      // ==========================================
      if (fotosBase64.length > 0) {
        for (let i = 0; i < fotosBase64.length; i++) {
          doc.addPage();
          drawHeaderLogo(doc);

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(12);
          doc.setTextColor(0, 0, 0);
          doc.text('ANEXO FOTOGRÁFICO', 36, 85);

          const fotoB64 = fotosBase64[i];
          if (fotoB64 && fotoB64.startsWith('data:image/')) {
            try {
              // Borde de la foto
              doc.setDrawColor(200, 200, 200);
              doc.setLineWidth(1);
              doc.rect(98, 160, 400, 300);

              // Render de foto
              doc.addImage(fotoB64, 'PNG', 100, 162, 396, 296);

              doc.setFont('helvetica', 'normal');
              doc.setFontSize(9);
              doc.setTextColor(120, 120, 120);
              doc.text(`Registro Fotográfico N° ${i + 1}`, 297.5, 485, { align: 'center' });
            } catch (err) {
              console.error('Error insertando foto en anexo:', err);
            }
          }
        }
      }

      // ==========================================
      // PIE DE PÁGINA GENERAL (Se aplica a todas las páginas al final)
      // ==========================================
      const totalPages = doc.internal.getNumberOfPages();
      
      const drawFooter = (d, pageNum) => {
        // Barra azul inferior
        d.setFillColor(60, 120, 216); // #3C78D8
        d.rect(34.5, 780.9, 525.75, 10.5, 'F');

        // Texto institucional
        d.setFont('helvetica', 'normal');
        d.setFontSize(8);
        d.setTextColor(0, 0, 0);
        
        const phoneVal = profile?.role === 'miembro' ? (profile?.phone || '') : adminContact.phone;
        const emailVal = profile?.role === 'miembro' ? (profile?.email || '') : adminContact.email;
        
        d.setFont('helvetica', 'bold');
        const compW = d.getTextWidth(companyName);
        d.text(companyName, 135.72, 798.68);
        
        d.setFont('helvetica', 'normal');
        d.text(` - Tel.: ${phoneVal || '1159969956 / 1132296691'} - Email: ${emailVal || 'info@gestionsyso.com'}`, 135.72 + compW, 798.68);

        // Número de página
        d.setFont('helvetica', 'normal');
        d.setFontSize(9);
        d.setTextColor(128, 128, 128); // #808080
        d.text(`Página ${pageNum} de ${totalPages}`, 552.75, 799.05, { align: 'right' });
      };

      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        drawFooter(doc, i);
      }

      // Acciones de salida
      if (shouldPrint) {
        doc.autoPrint();
        const blobUrl = doc.output('bloburl');
        window.open(blobUrl, '_blank');
        triggerToast('Vista previa abierta.');
      } else if (shouldDownload) {
        doc.save(`Control_Electrico_${emp?.razon_social.replace(/\s+/g, '_') || ''}_${c.fecha}.pdf`);
        triggerToast('PDF descargado exitosamente.');
      } else {
        return doc;
      }
    } catch (e) {
      console.error('Error al generar PDF:', e);
      triggerToast('Error al generar el reporte PDF.', 'error');
    }
  };

  const handleOpenPdf = async (c) => {
    try {
      const doc = await handleExportPdfReport(c, false, false);
      if (doc) {
        const blob = doc.output('blob');
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, '_blank');
        triggerToast('Vista previa abierta.');
      }
    } catch (e) {
      console.error('Error al abrir la vista previa:', e);
      triggerToast('Error al generar el reporte PDF.', 'error');
    }
  };

  const handleOpenEmailModal = (c) => {
    setMailTargetControl(c);
    const emp = empresas.find(e => e.id === c.empresa_id);
    if (emp && emp.contactos_correos && emp.contactos_correos.length > 0) {
      const formatted = emp.contactos_correos.map((cont, i) => {
        const mailStr = (typeof cont === 'object') ? (cont.correo || cont.valor || '') : String(cont);
        const nameStr = (typeof cont === 'object' && cont.nombre) ? cont.nombre : 'Contacto';
        const cargoStr = (typeof cont === 'object' && cont.cargo) ? cont.cargo : '';
        return {
          valor: mailStr,
          descripcion: nameStr 
            ? `${nameStr}${cargoStr ? ` - ${cargoStr}` : ''} (${mailStr})` 
            : mailStr,
          checked: i === 0
        };
      }).filter(item => item.valor);
      setAvailableEmails(formatted);
    } else {
      setAvailableEmails([]);
    }
    setManualEmail('');
    setIsMailModalOpen(true);
  };

  const handleSendEmail = async (e) => {
    if (e) e.preventDefault();
    if (!mailTargetControl) return;

    const checkedEmails = availableEmails.filter(em => em.checked).map(em => em.valor);
    const manualList = manualEmail.split(',').map(em => em.trim()).filter(Boolean);
    const recipients = [...checkedEmails, ...manualList];

    if (recipients.length === 0) {
      triggerToast('Debe ingresar o seleccionar al menos un correo de destino.', 'error');
      return;
    }

    setMailLoading(true);
    try {
      const doc = await handleExportPdfReport(mailTargetControl, false, false);
      if (!doc) throw new Error('No se pudo generar el PDF del control eléctrico.');

      const pdfBlob = doc.output('blob');
      
      const fileId = crypto.randomUUID();
      const filePath = `${profile?.id || 'anonymous'}/control_electrico_${mailTargetControl.id}_${fileId}.pdf`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, pdfBlob, {
          contentType: 'application/pdf',
          upsert: true
        });

      if (uploadError) {
        throw new Error(`Error al subir el adjunto a Storage: ${uploadError.message}`);
      }

      const emp = empresas.find(emp => emp.id === mailTargetControl.empresa_id);
      const est = allEstablecimientos.find(est => est.id === mailTargetControl.establecimiento_id);

      let tenantLogoBase64 = '';
      if (tenant && tenant.logo_1_url) {
        try {
          tenantLogoBase64 = await getBase64ImageFromUrl(tenant.logo_1_url);
          if (tenantLogoBase64) {
            tenantLogoBase64 = await resizeImageForPdf(tenantLogoBase64, 400, 200);
          }
        } catch (logoErr) {
          console.warn('No se pudo cargar el logo para el email:', logoErr);
        }
      }

      const payload = {
        emails: recipients,
        filePath,
        companyName: emp ? emp.razon_social : 'N/A',
        establishmentName: est ? est.denominacion : 'N/A',
        date: formatDate(mailTargetControl.fecha),
        inspectorName: mailTargetControl.profesional_nombre,
        tenantLogoBase64: tenantLogoBase64 || null,
        tenantName: tenant?.name || 'Gestión SySO',
        documentType: 'control_electrico'
      };

      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const resData = await res.json();
      if (!res.ok || resData.error) {
        throw new Error(resData.error || 'Error del servidor al enviar correo.');
      }

      triggerToast('Correo enviado exitosamente.');
      setIsMailModalOpen(false);
    } catch (err) {
      console.error('Error al enviar correo:', err);
      triggerToast(err.message || 'Error al intentar enviar el correo.', 'error');
    } finally {
      setMailLoading(false);
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
        <AppPageHeader
          title="Control Visual de Instalaciones Eléctricas"
          icon={Zap}
          tenantName={tenant?.name || 'Cargando...'}
          planId={tenant?.plan_id}
          showPlanBadge={profile && profile.role !== 'cliente'}
          setIsMobileMenuOpen={setIsMobileMenuOpen}
        />

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
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col max-h-[85vh] animate-fade-in">
                
                {/* Cabecera del formulario */}
                <div className="h-16 px-4 md:px-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-3">
                    <button 
                      type="button" 
                      onClick={handleExitForm}
                      className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 cursor-pointer"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </button>
                    <span className="font-outfit text-xs sm:text-sm md:text-base font-bold text-slate-900 truncate max-w-[55vw] sm:max-w-none">
                      {isReadOnlyView ? 'Detalle / Visualización de Control Eléctrico' : editingId ? 'Detalle / Editar Control Eléctrico' : 'Registrar Nuevo Control Eléctrico'}
                    </span>
                  </div>
                  <button 
                    type="button" 
                    onClick={handleExitForm}
                    className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-200 cursor-pointer"
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
                          className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm bg-slate-100 text-slate-500 outline-none"
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
                          className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm bg-slate-100 text-slate-500 outline-none truncate"
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

                    </div>
                  </div>

                  {/* SECCIÓN 2: PLANILLA DE VERIFICACIÓN */}
                  <div className="space-y-4">
                    <h3 className="font-outfit text-sm font-bold text-slate-800 border-b border-slate-100 pb-1.5 uppercase tracking-wider flex items-center gap-2">
                      <Zap className="h-4 w-4 text-[#468DFF]" />
                      2. Ítems a Verificar (Grilla de Control)
                    </h3>
                    
                    <div className="space-y-3.5">
                      {formItems.map((item) => (
                        <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border border-slate-200 bg-white">
                          <div className="flex gap-2 items-start">
                            <span className="font-mono text-xs font-bold text-slate-400 mt-0.5">{item.id}.</span>
                            <span className="text-xs font-bold text-slate-700 leading-normal">{item.text}</span>
                          </div>
                          <div className="flex items-center gap-1.5 w-full sm:w-48 shrink-0">
                            {['Ok', 'No Ok', 'N.A.'].map(opt => {
                              const dbValue = opt === 'N.A.' ? 'No aplica' : opt;
                              const isSelected = item.estado === dbValue;
                              return (
                                <button
                                  key={opt}
                                  type="button"
                                  onClick={() => handleItemEstadoChange(item.id, dbValue)}
                                  disabled={isFormDisabled}
                                  className={`flex-1 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                                    isSelected
                                      ? opt === 'Ok'
                                        ? 'bg-[#00b050] text-white border-[#00b050] shadow-sm'
                                        : opt === 'No Ok'
                                          ? 'bg-red-500 text-white border-red-500 shadow-sm'
                                          : 'bg-slate-500 text-white border-slate-500 shadow-sm'
                                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-50'
                                  }`}
                                >
                                  {opt}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* SECCIÓN 3: OBSERVACIONES / RECOMENDACIONES */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-1.5 min-h-[28px]">
                      <h3 className="font-outfit text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 border-none pb-0">
                        <ClipboardList className="h-4 w-4 text-[#468DFF]" />
                        3. Observaciones / Recomendaciones
                      </h3>
                      <AITextHelper
                        value={observaciones}
                        onChange={setObservaciones}
                        context="Observaciones y recomendaciones sobre instalaciones eléctricas y tableros"
                        disabled={isFormDisabled}
                      />
                    </div>
                    <textarea
                      value={observaciones}
                      onChange={(e) => setObservaciones(e.target.value)}
                      placeholder="Escriba comentarios o notas generales adicionales sobre el control..."
                      disabled={isFormDisabled}
                      rows={3}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-[#468DFF] resize-y scrollbar-thin disabled:bg-slate-100 disabled:cursor-not-allowed"
                    />
                  </div>

                  {/* SECCIÓN 4: REGISTROS FOTOGRÁFICOS */}
                  <div className="space-y-4">
                    <h3 className="font-outfit text-sm font-bold text-slate-800 border-b border-slate-100 pb-1.5 uppercase tracking-wider flex items-center gap-2">
                      <ImageIcon className="h-4.5 w-4.5 text-[#468DFF]" />
                      4. Registros Fotográficos
                    </h3>
                    <div className="flex flex-col gap-2">
                      <ImageUploadZone
                        label="Adjuntar registros fotográficos (Tableros, cableado, protecciones, etc.)"
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

                  {/* SECCIÓN 5: FIRMA DEL CONTROL */}
                  <div className="space-y-4">
                    <h3 className="font-outfit text-sm font-bold text-slate-800 border-b border-slate-100 pb-1.5 uppercase tracking-wider flex items-center gap-2">
                      <Check className="h-4 w-4 text-[#468DFF]" />
                      5. Firma del Control
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <span className="font-outfit text-xs font-extrabold text-slate-800 block uppercase tracking-wider">
                          Profesional Técnico Interviniente
                        </span>
                        
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-bold text-slate-600">Selección de Profesional *</label>
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

                      {/* Configuración de Firma */}
                      <div className="space-y-2 flex flex-col">
                        <div className="flex flex-row justify-between items-end gap-2 min-h-[18px]">
                          <label className="text-xs font-bold text-slate-600 pr-2">Firma del Profesional de Higiene y Seguridad</label>
                          {firmaTipo === 'mano' && !isFormDisabled && (hasSignedProf || firmaProfSavedUrl) && (
                            <button
                              type="button"
                              onClick={() => handleClearCanvas(firmaProfCanvasRef, setHasSignedProf, setFirmaProfSavedUrl)}
                              className="text-[10px] font-bold text-red-500 hover:text-red-700 cursor-pointer shrink-0 border-none bg-transparent"
                            >
                              Limpiar Firma
                            </button>
                          )}
                        </div>

                        {/* Selector de Tipo de Firma del Profesional */}
                        <div className="space-y-1.5 h-[51px] flex flex-col justify-end">
                          <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block">Origen de Firma del Profesional</label>
                          <div className="flex border border-slate-200 bg-white text-[11px] font-semibold shrink-0 rounded-lg overflow-hidden border">
                            <button
                              type="button"
                              onClick={() => {
                                setFirmaTipo('perfil');
                                setFirmaProfSavedUrl('');
                                setHasSignedProf(false);
                              }}
                              className={`flex-1 py-1 transition-colors cursor-pointer ${
                                firmaTipo === 'perfil'
                                  ? 'bg-[#468DFF] text-white'
                                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
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
                              className={`flex-1 py-1 transition-colors cursor-pointer ${
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
                            {signaturePath ? (
                              <div className="flex flex-col items-center justify-center h-full w-full">
                                {firmaPerfilPreviewUrl ? (
                                  <div className="bg-white border border-slate-200 rounded-lg p-2 max-w-[200px] h-[80px] flex items-center justify-center overflow-hidden shadow-sm">
                                    <img 
                                      src={firmaPerfilPreviewUrl} 
                                      alt="Vista previa de firma de perfil" 
                                      className="max-w-full max-h-full object-contain"
                                    />
                                  </div>
                                ) : (
                                  <Loader2 className="h-5 w-5 animate-spin text-[#468DFF]" />
                                )}
                                <p className="text-[10px] text-green-600 font-bold mt-2">✓ Firma del perfil cargada correctamente.</p>
                              </div>
                            ) : (
                              <p className="text-[10px] text-amber-600 font-bold p-4">⚠ El profesional seleccionado no tiene una firma digital configurada.</p>
                            )}
                          </div>
                        ) : (
                          <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl aspect-[2/1] relative overflow-hidden flex items-center justify-center">
                            {firmaProfSavedUrl && !hasSignedProf ? (
                              <img src={firmaProfSavedUrl} alt="Firma Profesional" className="w-full h-full object-contain p-2" />
                            ) : (
                              <canvas
                                ref={firmaProfRefCallback}
                                width={400}
                                height={200}
                                className={`w-full h-full bg-white block ${!isFormDisabled ? 'cursor-crosshair' : 'cursor-default'}`}
                              />
                            )}
                            {!hasSignedProf && !firmaProfSavedUrl && (
                              <span className="absolute pointer-events-none text-[10px] text-slate-400 font-bold uppercase tracking-wider">Dibuje la firma aquí</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Footer de Acciones del Formulario */}
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
                            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-bold transition-all cursor-pointer shadow-lg shadow-amber-500/10"
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
                              className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold transition-all cursor-pointer shadow-lg shadow-red-600/10"
                            >
                              Eliminar
                            </button>
                          )}
                          {!isFormDisabled && (
                            <button
                              type="submit"
                              disabled={saveLoading}
                              className="px-5 py-2.5 bg-[#468DFF] hover:bg-[#0511F2] text-white rounded-xl text-sm font-bold flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-[#468DFF]/10 disabled:opacity-50"
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
              /* SI NO ESTÁ ABIERTO EL FORMULARIO - MOSTRAR TABLA DE CONTENIDOS Y FILTROS */
              <div className="space-y-6 flex-grow flex flex-col min-h-0">
                
                {/* PANEL DE FILTROS (SySO Compact Layout) */}
                <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-sm space-y-3 shrink-0">
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
                  className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col flex-1 min-h-0 transition-all duration-300 ease-in-out"
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
                          <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-wider sticky top-0 z-10">
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
                            <th className="px-6 py-4 text-right w-36">Acciones</th>
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
                                  className="px-6 py-4 text-slate-600 font-semibold"
                                >
                                  {c.profesional_nombre || 'N/A'}
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
                                <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                                  <div className="flex items-center justify-end gap-2">
                                    <button
                                      onClick={() => handleOpenPdf(c)}
                                      title="Visualizar PDF"
                                      className="p-1.5 rounded-lg bg-[#EFF6FF] hover:bg-[#DBEAFE] text-[#468DFF] hover:text-[#0511F2] transition-all cursor-pointer"
                                    >
                                      <FileText className="h-4.5 w-4.5" />
                                    </button>
                                    <button
                                      onClick={() => handleExportPdfReport(c, false, true)}
                                      title="Descargar PDF"
                                      className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-all cursor-pointer"
                                    >
                                      <Download className="h-4.5 w-4.5" />
                                    </button>
                                    {profile && profile.role !== 'cliente' && (
                                      <button
                                        onClick={() => handleOpenEmailModal(c)}
                                        title="Enviar por Correo"
                                        className="p-1.5 rounded-lg bg-blue-50 hover:bg-[#468DFF]/25 text-[#468DFF] transition-all cursor-pointer"
                                      >
                                        <Mail className="h-4.5 w-4.5" />
                                      </button>
                                    )}
                                    {profile && profile.role !== 'cliente' && (
                                      canEditar ? (
                                        <button
                                          onClick={() => {
                                            setIsReadOnlyView(false);
                                            handleEditClick(c);
                                          }}
                                          className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-600 transition-all cursor-pointer"
                                          title="Editar"
                                        >
                                          <Edit className="h-4.5 w-4.5" />
                                        </button>
                                      ) : (
                                        <button
                                          onClick={() => {
                                            setIsReadOnlyView(true);
                                            handleEditClick(c);
                                          }}
                                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-all cursor-pointer"
                                          title="Ver Detalle"
                                        >
                                          <Eye className="h-4.5 w-4.5" />
                                        </button>
                                      )
                                    )}
                                    {profile && profile.role !== 'cliente' && canEliminar && (
                                      <button
                                        onClick={() => handleDeleteClick(c.id)}
                                        className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition-all cursor-pointer"
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
                    )}
                  </div>
                </div>

              </div>
            )}

          </div>
        )}

      </main>

      {/* Modal de Envío de Email */}
      {isMailModalOpen && mailTargetControl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setIsMailModalOpen(false)} className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-md w-full z-10 shadow-2xl relative space-y-4 animate-fade-in">
            
            <div className="flex justify-between items-center">
              <h4 className="font-outfit text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Mail className="h-4.5 w-4.5 text-[#468DFF]" />
                Enviar Control Eléctrico por Correo
              </h4>
              <button onClick={() => setIsMailModalOpen(false)} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 font-medium">
              Seleccione los contactos registrados de la empresa o ingrese correos electrónicos manualmente (separados por comas) para enviar el reporte de control eléctrico en PDF.
            </p>

            <div className="space-y-3">
              
              {/* Contactos de la empresa */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-600 block">Correos de la Empresa:</label>
                {availableEmails.length === 0 ? (
                  <p className="text-xs text-slate-400 italic font-semibold">No hay contactos registrados para esta empresa.</p>
                ) : (
                  <div className="bg-slate-50 p-3 border border-slate-200 rounded-xl max-h-36 overflow-y-auto space-y-1.5">
                    {availableEmails.map((e, idx) => (
                      <label key={idx} className="flex items-center gap-2.5 text-xs font-semibold text-slate-700 cursor-pointer hover:bg-slate-100/50 py-1 rounded">
                        <input
                          type="checkbox"
                          checked={e.checked}
                          onChange={() => {
                            setAvailableEmails(prev => prev.map((item, i) => i === idx ? { ...item, checked: !item.checked } : item));
                          }}
                          className="accent-[#468DFF] h-4 w-4"
                        />
                        {e.descripcion}
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Ingreso manual */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-600">Correos Manuales:</label>
                <textarea
                  rows="2"
                  placeholder="ejemplo1@correo.com, ejemplo2@correo.com..."
                  value={manualEmail}
                  onChange={(e) => setManualEmail(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#468DFF] bg-slate-50/50"
                />
              </div>

            </div>

            {/* Acciones */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsMailModalOpen(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-100 cursor-pointer transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={mailLoading}
                onClick={handleSendEmail}
                className="px-4 py-2 bg-[#468DFF] hover:bg-[#0511F2] text-white text-xs font-bold rounded-lg cursor-pointer transition-all flex items-center gap-1.5 shadow-md shadow-[#468DFF]/10 disabled:bg-slate-400"
              >
                {mailLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
                Enviar Correo
              </button>
            </div>

          </div>
        </div>
      )}

      {/* TOAST FEEDBACK removidos - consumidos globalmente */}

      {/* MODAL DIALOG PREGUNTA/ALERTA */}
      {modalAlert.show && (
        <div className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xl max-w-sm w-full animate-scale-up space-y-4 text-center">
            <div className="mx-auto p-3 rounded-full w-12 h-12 flex items-center justify-center bg-amber-50 text-amber-500 animate-pulse">
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
                className="flex-1 py-2.5 border border-slate-350 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all cursor-pointer"
              >
                Cancelar
              </button>
              {modalAlert.onConfirm && (
                <button
                  type="button"
                  onClick={modalAlert.onConfirm}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  {modalAlert.confirmText || 'Confirmar'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
