// src/app/[tenant-slug]/avisos/page.js
'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import { supabase } from '@/lib/supabase';
import { formatDate, formatAsDateInput, convertToDbDate } from '@/lib/utils';
import { useToast } from '@/components/providers/ToastProvider';
import AppPageHeader from '@/components/ui/AppPageHeader';
import AppButton from '@/components/ui/AppButton';
import AppInput from '@/components/ui/AppInput';
import AppSelect from '@/components/ui/AppSelect';
import AppTextarea from '@/components/ui/AppTextarea';
import AppConfirmDialog from '@/components/ui/AppConfirmDialog';
import AppCard from '@/components/ui/AppCard';
import AppEmptyState from '@/components/ui/AppEmptyState';
import AppFormNavigator from '@/components/ui/AppFormNavigator';
import { 
  PlusCircle, 
  AlertCircle,
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
  Menu,
  GraduationCap,
  Calendar,
  ClipboardList,
  MapPin,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  Sliders,
  Flame,
  Image as ImageIcon,
  Camera,
  Upload,
  Eye,
  ClipboardCheck,
  Mail,
  Download,
  Send,
  Trash,
  CheckCircle,
  FileText,
  Folder,
  Phone,
  MessageCircle
} from 'lucide-react';
import { jsPDF } from 'jspdf';

const RISK_LEVELS = {
  trivial: { label: 'Trivial', color: '#00B050', text: '#FFFFFF' },
  tolerable: { label: 'Tolerable', color: '#00FF00', text: '#000000' },
  moderado: { label: 'Moderado', color: '#FFFF00', text: '#000000' },
  sustancial: { label: 'Sustancial', color: '#FF9900', text: '#FFFFFF' },
  intolerable: { label: 'Intolerable', color: '#FF0000', text: '#FFFFFF' }
};

const MONTHS_OPTS = [
  { value: '01', label: 'Enero' },
  { value: '02', label: 'Febrero' },
  { value: '03', label: 'Marzo' },
  { value: '04', label: 'Abril' },
  { value: '05', label: 'Mayo' },
  { value: '06', label: 'Junio' },
  { value: '07', label: 'Julio' },
  { value: '08', label: 'Agosto' },
  { value: '09', label: 'Septiembre' },
  { value: '10', label: 'Octubre' },
  { value: '11', label: 'Noviembre' },
  { value: '12', label: 'Diciembre' }
];

const getAvailableYears = (records) => {
  const years = records.map(r => r.fecha ? r.fecha.substring(0, 4) : '').filter(Boolean);
  const uniqueYears = [...new Set(years)];
  const currentYear = new Date().getFullYear().toString();
  if (!uniqueYears.includes(currentYear)) {
    uniqueYears.push(currentYear);
  }
  return uniqueYears.sort((a, b) => b.localeCompare(a));
};

export default function AvisosRiesgoPage({ params }) {
  const tenantSlug = params['tenant-slug'];

  // Vista activa y estados generales
  const [view, setView] = useState('list'); // 'list' o 'form'
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDevMode, setIsDevMode] = useState(false);

  // Sesión y Contexto
  const [profile, setProfile] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

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

  const sectionPerms = getSectionPermissions(profile, 'avisos');
  const canCargar = sectionPerms.cargar;
  const canEditar = sectionPerms.editar;
  const canEliminar = sectionPerms.eliminar;

  // Listados principales
  const [avisos, setAvisos] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [allEstablecimientos, setAllEstablecimientos] = useState([]);
  const [miembros, setMiembros] = useState([]);
  const [correctivas, setCorrectivas] = useState([]);

  // Búsqueda y Filtros de la lista
  const [searchQuery, setSearchQuery] = useState('');
  const [filterEmpresa, setFilterEmpresa] = useState('');
  const [filterEstablecimiento, setFilterEstablecimiento] = useState('');
  const [filterFecha, setFilterFecha] = useState('');
  const [filterAnio, setFilterAnio] = useState('');
  const [filterMes, setFilterMes] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showExportMobile, setShowExportMobile] = useState(false);
  const [sortField, setSortField] = useState('fecha');
  const [sortOrder, setSortOrder] = useState('desc');

  // Estado del Formulario
  const [editingId, setEditingId] = useState(null);
  const [isReadOnlyView, setIsReadOnlyView] = useState(false);
  const [empresaId, setEmpresaId] = useState('');
  const [establecimientoId, setEstablecimientoId] = useState('');
  const [fecha, setFecha] = useState('');
  const [avisoNumero, setAvisoNumero] = useState('');
  const [profesionalTipo, setProfesionalTipo] = useState('miembro'); // 'miembro' o 'manual'
  const [profesionalNombre, setProfesionalNombre] = useState('');
  const [profesionalId, setProfesionalId] = useState('');
  const [firmaTipo, setFirmaTipo] = useState('perfil'); // 'perfil' o 'mano'
  const [signaturePath, setSignaturePath] = useState(''); // relative path of profile signature
  const [firmaPerfilPreviewUrl, setFirmaPerfilPreviewUrl] = useState(''); // preview URL of profile signature
  const [firmaManoSavedUrl, setFirmaManoSavedUrl] = useState(''); // saved canvas signature URL
  const [observaciones, setObservaciones] = useState('');
  const [loadedFindings, setLoadedFindings] = useState([]);
  const [isLoadingFindings, setIsLoadingFindings] = useState(false);
  const [adminContact, setAdminContact] = useState({ email: 'info@gestionsyso.com', phone: '1159969956 / 1132296691' });

  // Firma a mano (Canvas)
  const canvasRef = useRef(null);
  const [hasSignedMano, setHasSignedMano] = useState(false);

  const originalDataRef = useRef('');

  // Sincronizar datos originales para control de cambios sin guardar
  useEffect(() => {
    if (view === 'form' && !saving) {
      originalDataRef.current = JSON.stringify({
        empresaId,
        establecimientoId,
        fecha,
        avisoNumero,
        profesionalTipo,
        profesionalNombre,
        profesionalId,
        firmaTipo,
        signaturePath,
        observaciones
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, saving, editingId]);

  const checkHasUnsavedChanges = () => {
    if (isReadOnlyView || view !== 'form') return false;
    const currentData = JSON.stringify({
      empresaId,
      establecimientoId,
      fecha,
      avisoNumero,
      profesionalTipo,
      profesionalNombre,
      profesionalId,
      firmaTipo,
      signaturePath,
      observaciones
    });
    return originalDataRef.current !== currentData;
  };

  // Modales y Toasts
  const globalToast = useToast();
  const [modalAlert, setModalAlert] = useState({ show: false, title: '', message: '', onConfirm: null, confirmText: 'Confirmar' });
  const [isMailModalOpen, setIsMailModalOpen] = useState(false);
  const [mailTargetAviso, setMailTargetAviso] = useState(null);
  const [availableEmails, setAvailableEmails] = useState([]); // { valor, descripcion, checked }
  const [manualEmail, setManualEmail] = useState('');
  const [mailLoading, setMailLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('email'); // 'email' o 'whatsapp'
  const [availablePhones, setAvailablePhones] = useState([]); // { valor, descripcion, checked }
  const [manualPhone, setManualPhone] = useState('');
  const [whatsappLoading, setWhatsappLoading] = useState(false);

  // ----------------------------------------------------
  // Efectos Iniciales
  // ----------------------------------------------------
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const cached = sessionStorage.getItem('user-profile');
      if (cached) {
        setProfile(JSON.parse(cached));
      }
    }
    const collapsed = localStorage.getItem('sidebar-collapsed');
    if (collapsed === 'true') {
      setIsSidebarCollapsed(true);
    }
    
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setShowFilters(false);
    }

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

  // Auto-filtrar por cliente si la sesión iniciada es de rol 'cliente'
  useEffect(() => {
    if (profile && profile.role === 'cliente' && profile.empresa_id) {
      setFilterEmpresa(profile.empresa_id);
    }
  }, [profile]);

  const triggerToast = (message, type = 'success') => {
    globalToast.toast(message, type);
  };

  const showAlert = (title, message, onConfirm, confirmText = 'Confirmar') => {
    setModalAlert({ show: true, title, message, onConfirm, confirmText });
  };

  const closeAlert = () => {
    setModalAlert({ show: false, title: '', message: '', onConfirm: null, confirmText: 'Confirmar' });
  };

  // ----------------------------------------------------
  // Carga de Datos
  // ----------------------------------------------------
  const loadMockData = () => {
    const mockProfileId = 'mock-user-123';
    setProfile({ id: mockProfileId, full_name: 'Profesional SySO (Mock)', role: 'admin', signature_url: 'mock-signature-path' });
    setTenant({ id: 'mock-tenant', name: 'Consultora de Seguridad e Higiene Mock', plan_id: 'free' });
    setEmpresas([
      { id: 'mock-emp-1', razon_social: 'Empresa Constructora S.A.' },
      { id: 'mock-emp-2', razon_social: 'Metalúrgica del Norte' }
    ]);
    setAllEstablecimientos([
      { id: 'mock-est-1', empresa_id: 'mock-emp-1', denominacion: 'Obra Av. Santa Fe' },
      { id: 'mock-est-2', empresa_id: 'mock-emp-1', denominacion: 'Depósito Munro' },
      { id: 'mock-est-3', empresa_id: 'mock-emp-2', denominacion: 'Planta Principal' }
    ]);
    setMiembros([
      { id: 'mock-miembro-1', profile_id: mockProfileId, full_name: 'Profesional SySO (Mock)', signature_url: 'mock-signature-path' },
      { id: 'mock-miembro-2', profile_id: 'mock-user-456', full_name: 'Lic. Laura Martínez', signature_url: 'mock-signature-2' }
    ]);
    setCorrectivas([
      {
        id: 'mock-corr-1',
        empresa_id: 'mock-emp-1',
        establecimiento_id: 'mock-est-1',
        fecha: '2026-06-22',
        area_sector: 'Sector Excavación',
        puesto_operacion: 'Operador de Excavadora',
        descripcion_hallazgo: 'Falta de vallado perimetral en zanja de profundidad mayor a 1.5 metros.',
        nivel_riesgo: 'Riesgo sustancial',
        recomendacion: 'Instalar vallado de protección resistente de forma inmediata.',
        imagen_url: ''
      },
      {
        id: 'mock-corr-2',
        empresa_id: 'mock-emp-1',
        establecimiento_id: 'mock-est-1',
        fecha: '2026-06-22',
        area_sector: 'Tablero Eléctrico Principal',
        puesto_operacion: 'Mantenimiento Eléctrico',
        descripcion_hallazgo: 'Cables expuestos sin aislación adecuada y falta de disyuntor de seguridad.',
        nivel_riesgo: 'Riesgo intolerable',
        recomendacion: 'Desenergizar circuito, reparar cableado y colocar disyuntor diferencial.',
        imagen_url: ''
      }
    ]);
    setAvisos([
      {
        id: 'mock-aviso-1',
        tenant_id: 'mock-tenant',
        empresa_id: 'mock-emp-1',
        establecimiento_id: 'mock-est-1',
        fecha: '2026-06-22',
        aviso_numero: '0001',
        profesional_tipo: 'miembro',
        profesional_nombre: 'Ing. Carlos Gómez',
        profesional_id: 'mock-miembro-1',
        firma_tipo: 'perfil',
        firma_digital: 'mock-signature-1',
        observaciones: 'Se solicita al responsable de obra subsanar los desvíos con carácter prioritario.',
        created_at: new Date().toISOString()
      }
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

      // Cargar Tenant por slug
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
            window.location.href = `/${homeTen.slug}/avisos`;
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

      // Cargar Empresas Clientes
      let empresasQuery = supabase
        .from('empresas')
        .select('id, razon_social, contactos_correos, contactos_telefonos')
        .eq('tenant_id', ten.id);
      if (prof.role === 'cliente') {
        empresasQuery = empresasQuery.eq('id', prof.empresa_id);
      }
      const { data: emps, error: empErr } = await empresasQuery.order('razon_social');
      if (empErr) throw empErr;
      setEmpresas(emps || []);

      // Cargar Establecimientos
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

      // Cargar Miembros de Equipo con sus firmas
      const { data: mems, error: memErr } = await supabase
        .from('miembros_equipo')
        .select('id, full_name, signature_url, profile_id')
        .eq('tenant_id', ten.id)
        .order('full_name');
      if (memErr) throw memErr;
      setMiembros(mems || []);

      // Cargar Avisos de Riesgo
      let avsQuery = supabase
        .from('avisos_riesgo')
        .select('*')
        .eq('tenant_id', ten.id);
      if (prof.role === 'cliente') {
        avsQuery = avsQuery.eq('empresa_id', prof.empresa_id);
      }
      const { data: avs, error: avsErr } = await avsQuery.order('created_at', { ascending: false });
      if (avsErr) throw avsErr;
      setAvisos(avs || []);

      setLoading(false);
    } catch (err) {
      console.error('Error cargando datos de Supabase:', err);
      triggerToast('Error al conectar con la base de datos.', 'error');
      setIsDevMode(true);
      loadMockData();
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('user-profile');
    }
    window.location.href = '/login';
  };

  const toggleSidebar = () => {
    const newVal = !isSidebarCollapsed;
    setIsSidebarCollapsed(newVal);
    localStorage.setItem('sidebar-collapsed', String(newVal));
  };

  // ----------------------------------------------------
  // Setup de Canvas
  // ----------------------------------------------------
  useEffect(() => {
    if (view !== 'form' || isReadOnlyView || firmaTipo !== 'mano') return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    
    let drawing = false;
    
    const getPos = (e) => {
      const rect = canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const x = ((clientX - rect.left) / rect.width) * canvas.width;
      const y = ((clientY - rect.top) / rect.height) * canvas.height;
      return { x, y };
    };

    const startDrawing = (e) => {
      drawing = true;
      const pos = getPos(e);
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
      e.preventDefault();
    };

    const draw = (e) => {
      if (!drawing) return;
      const pos = getPos(e);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      setHasSignedMano(true);
      e.preventDefault();
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

    return () => {
      canvas.removeEventListener('mousedown', startDrawing);
      canvas.removeEventListener('mousemove', draw);
      canvas.removeEventListener('mouseup', stopDrawing);
      canvas.removeEventListener('mouseleave', stopDrawing);
      canvas.removeEventListener('touchstart', startDrawing);
      canvas.removeEventListener('touchmove', draw);
      canvas.removeEventListener('touchend', stopDrawing);
    };
  }, [view, isReadOnlyView, firmaTipo]);

  const handleClearCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    setHasSignedMano(false);
    setFirmaManoSavedUrl('');
  };

  // Previsualización de firma de perfil técnica
  useEffect(() => {
    const resolveProfileSignaturePreview = async () => {
      setFirmaPerfilPreviewUrl('');
      if (!signaturePath || firmaTipo !== 'perfil') return;

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
            setFirmaPerfilPreviewUrl(signaturePath);
          } else {
            const { data: sData, error: sErr } = await supabase.storage
              .from('signatures')
              .createSignedUrl(relativePath, 3600);
            if (!sErr && sData?.signedUrl) {
              setFirmaPerfilPreviewUrl(sData.signedUrl);
            }
          }
        } catch (e) {
          console.error('Error cargando previsualización de firma de perfil:', e);
        }
      }
    };

    resolveProfileSignaturePreview();
  }, [signaturePath, firmaTipo, isDevMode]);

  // ----------------------------------------------------
  // Carga Automática de Hallazgos
  // ----------------------------------------------------
  useEffect(() => {
    if (!empresaId || !establecimientoId || !fecha || fecha.length < 10) {
      setLoadedFindings([]);
      return;
    }

    const fetchFindings = async () => {
      setIsLoadingFindings(true);
      try {
        const dbDate = convertToDbDate(fecha);
        if (!dbDate) {
          setLoadedFindings([]);
          return;
        }

        if (isDevMode) {
          const match = correctivas.filter(c => 
            c.empresa_id === empresaId && 
            c.establecimiento_id === establecimientoId && 
            c.fecha === dbDate
          );
          setLoadedFindings(match);
        } else {
          const { data, error } = await supabase
            .from('acciones_correctivas')
            .select('*')
            .eq('empresa_id', empresaId)
            .eq('establecimiento_id', establecimientoId)
            .eq('fecha', dbDate);
          
          if (error) throw error;
          
          // Recopilar paths de Supabase para firmar en lote
          const pathsToSign = [];
          (data || []).forEach(acc => {
            if (acc.imagen_url && acc.imagen_url !== 'N/A') {
              if (!acc.imagen_url.startsWith('http://') && !acc.imagen_url.startsWith('https://')) {
                pathsToSign.push(acc.imagen_url);
              }
            }
          });

          let signedUrlsMap = {};
          if (pathsToSign.length > 0) {
            try {
              const { data: sData, error: sErr } = await supabase.storage
                .from('documents')
                .createSignedUrls(pathsToSign, 3600);
              if (!sErr && sData) {
                sData.forEach(item => {
                  if (item.signedUrl) {
                    signedUrlsMap[item.path] = item.signedUrl;
                  }
                });
              }
            } catch (e) {
              console.error('Error al firmar URLs de hallazgos en lote:', e);
            }
          }

          const resolvedData = (data || []).map(acc => {
            let signedUrl = '';
            if (acc.imagen_url && acc.imagen_url !== 'N/A') {
              if (acc.imagen_url.startsWith('http://') || acc.imagen_url.startsWith('https://')) {
                signedUrl = acc.imagen_url;
              } else {
                signedUrl = signedUrlsMap[acc.imagen_url] || '';
              }
            }
            return {
              ...acc,
              imagen_preview_url: signedUrl
            };
          });

          setLoadedFindings(resolvedData);
        }
      } catch (err) {
        console.error('Error cargando hallazgos:', err);
        triggerToast('Error al cargar hallazgos de acciones correctivas.', 'error');
      } finally {
        setIsLoadingFindings(false);
      }
    };

    fetchFindings();
  }, [empresaId, establecimientoId, fecha, isDevMode, correctivas]);

  // Manejar cambio de profesional seleccionado
  const handleProfesionalChange = (value) => {
    setProfesionalId(value);
    if (value === '__custom__') {
      setProfesionalTipo('manual');
      setProfesionalNombre('');
      setSignaturePath('');
      setFirmaTipo('mano');
    } else {
      setProfesionalTipo('miembro');
      const m = miembros.find(mem => mem.id === value);
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

  // ----------------------------------------------------
  // Guardado y Edición
  // ----------------------------------------------------
  const handleAddNew = () => {
    setIsReadOnlyView(false);
    setEditingId(null);
    setEmpresaId('');
    setEstablecimientoId('');
    setFecha(formatDate(new Date().toISOString().split('T')[0]));
    // Auto-increment aviso_numero
    let nextNum = '0001';
    if (avisos.length > 0) {
      const maxVal = Math.max(...avisos.map(a => parseInt(a.aviso_numero) || 0));
      if (maxVal > 0) {
        nextNum = String(maxVal + 1).padStart(4, '0');
      }
    }
    setAvisoNumero(nextNum);
    
    // Auto-seleccionar al profesional logueado si coincide en miembros de equipo
    const currentMember = miembros.find(m => m.profile_id === profile?.id);
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

    setObservaciones('');
    setLoadedFindings([]);
    setHasSignedMano(false);
    setFirmaManoSavedUrl('');
    setView('form');
  };

  const handleEdit = async (av) => {
    setEditingId(av.id);
    setEmpresaId(av.empresa_id);
    setEstablecimientoId(av.establecimiento_id);
    setFecha(formatDate(av.fecha) || '');
    setAvisoNumero(av.aviso_numero || '');
    setProfesionalTipo(av.profesional_tipo || 'miembro');
    setProfesionalNombre(av.profesional_nombre || '');
    
    const profIdVal = av.profesional_tipo === 'manual' ? '__custom__' : av.profesional_id || '';
    setProfesionalId(profIdVal);
    setFirmaTipo(av.firma_tipo || 'perfil');
    
    // Cargar la firma del perfil actual de este miembro de equipo
    let latestProfileSig = '';
    if (av.profesional_tipo === 'miembro' && av.profesional_id) {
      const m = miembros.find(mem => mem.id === av.profesional_id);
      if (m) {
        latestProfileSig = m.signature_url || '';
      }
    }
    setSignaturePath(latestProfileSig || (av.firma_tipo === 'perfil' ? (av.firma_digital || '') : ''));
    setObservaciones(av.observaciones || '');
    setHasSignedMano(false);
    
    // Set manual signature preview if exists and is of type hand-drawn
    setFirmaManoSavedUrl('');
    if (av.firma_tipo === 'mano' && av.firma_digital) {
      if (isDevMode) {
        setFirmaManoSavedUrl('/brand/logo-primary.png');
      } else {
        try {
          const { data: sData } = await supabase.storage
            .from('documents')
            .createSignedUrl(av.firma_digital, 3600);
          if (sData?.signedUrl) {
            setFirmaManoSavedUrl(sData.signedUrl);
          }
        } catch (e) {
          console.error('Error fetching manual signature signed URL:', e);
        }
      }
    }

    setView('form');
  };

  const handleExitForm = () => {
    if (isReadOnlyView) {
      setView('list');
      return;
    }
    showAlert(
      'Salir sin guardar',
      '¿Estás seguro de que deseas salir? Los cambios no guardados se perderán.',
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
        window.location.href = path;
        return;
      }
      e.preventDefault();
      showAlert(
        'Salir sin guardar',
        '¿Estás seguro de que deseas salir? Los cambios no guardados se perderán.',
        () => {
          closeAlert();
          window.location.href = path;
        },
        'Confirmar'
      );
    }
  };

  const uploadCanvasToStorage = async (canvas, avisoId) => {
    if (!canvas) return '';
    if (isDevMode) return `mock-canvas-signature-${Date.now()}.png`;

    try {
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) return '';

      const file = new File([blob], `aviso_riesgo_signature_${avisoId}.png`, { type: 'image/png' });
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No autorizado');

      const filePath = `${user.id}/aviso_riesgo_${avisoId}_${Date.now()}.png`;
      const { error } = await supabase.storage
        .from('documents')
        .upload(filePath, file, { cacheControl: '3600', upsert: true });

      if (error) throw error;
      return filePath;
    } catch (err) {
      console.error('Error al subir firma canvas:', err);
      throw err;
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (isFormDisabled) return;

    if (!empresaId || !establecimientoId || !fecha) {
      triggerToast('Complete la Razón Social, Establecimiento y Fecha.', 'error');
      return;
    }

    if (profesionalId === '') {
      triggerToast('Seleccione un profesional autorizado.', 'error');
      return;
    }

    if (profesionalId === '__custom__' && !profesionalNombre.trim()) {
      triggerToast('Ingrese el nombre del profesional manual.', 'error');
      return;
    }

    if (firmaTipo === 'perfil' && profesionalTipo === 'manual') {
      triggerToast('Un profesional manual debe firmar a mano.', 'error');
      return;
    }

    setSaving(true);
    try {
      const tempId = editingId || crypto.randomUUID();
      let finalSignature = '';

      if (firmaTipo === 'perfil') {
        finalSignature = signaturePath;
      } else {
        // firmaTipo === 'mano'
        if (hasSignedMano && canvasRef.current) {
          finalSignature = await uploadCanvasToStorage(canvasRef.current, tempId);
        } else {
          // Si no se volvió a firmar a mano, recuperar firma previa
          const originalAviso = avisos.find(a => a.id === editingId);
          if (originalAviso && originalAviso.firma_tipo === 'mano') {
            finalSignature = originalAviso.firma_digital || '';
          }
        }
      }

      if (firmaTipo === 'perfil' && !finalSignature) {
        triggerToast('El profesional seleccionado no tiene una firma configurada en su perfil.', 'error');
        setSaving(false);
        return;
      }

      if (firmaTipo === 'mano' && !finalSignature) {
        triggerToast('Debe firmar a mano en el panel para guardar.', 'error');
        setSaving(false);
        return;
      }

      const payload = {
        tenant_id: isDevMode ? 'mock-tenant' : tenant.id,
        empresa_id: empresaId,
        establecimiento_id: establecimientoId,
        fecha: convertToDbDate(fecha) || null,
        aviso_numero: avisoNumero,
        profesional_tipo: profesionalTipo,
        profesional_nombre: profesionalTipo === 'miembro' 
          ? (miembros.find(m => m.id === profesionalId)?.full_name || '') 
          : profesionalNombre.trim(),
        profesional_id: profesionalTipo === 'miembro' ? profesionalId : null,
        firma_tipo: firmaTipo,
        firma_digital: finalSignature,
        observaciones: observaciones || null,
        updated_at: new Date().toISOString()
      };

      if (isDevMode) {
        if (editingId) {
          setAvisos(prev => prev.map(a => a.id === editingId ? { ...a, ...payload } : a));
        } else {
          setAvisos(prev => [{ id: tempId, created_at: new Date().toISOString(), ...payload }, ...prev]);
        }
        triggerToast('Datos guardados exitosamente (Mock).');
        setView('list');
      } else {
        if (editingId) {
          const { error } = await supabase
            .from('avisos_riesgo')
            .update(payload)
            .eq('id', editingId);
          if (error) throw error;
          triggerToast('Aviso de riesgo actualizado correctamente.');
        } else {
          const { error } = await supabase
            .from('avisos_riesgo')
            .insert([{ id: tempId, created_at: new Date().toISOString(), ...payload }]);
          if (error) throw error;
          triggerToast('Aviso de riesgo registrado correctamente.');
        }
        await loadRealData();
        setView('list');
      }
    } catch (err) {
      console.error('Error al guardar aviso:', err);
      triggerToast('Error al intentar guardar los datos.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id) => {
    showAlert(
      '¿Eliminar Aviso de Riesgo?',
      'Esta acción eliminará de forma permanente el aviso de riesgo seleccionado y no se podrá deshacer.',
      async () => {
        try {
          if (isDevMode) {
            setAvisos(prev => prev.filter(a => a.id !== id));
            triggerToast('Aviso de riesgo eliminado (Mock).');
          } else {
            const { error } = await supabase
              .from('avisos_riesgo')
              .delete()
              .eq('id', id);
            if (error) throw error;
            triggerToast('Aviso de riesgo eliminado correctamente.');
            await loadRealData();
          }
          setView('list');
        } catch (err) {
          console.error('Error al eliminar:', err);
          triggerToast('Error al intentar eliminar el registro.', 'error');
        } finally {
          closeAlert();
        }
      },
      'Eliminar'
    );
  };

  // ----------------------------------------------------
  // Helpers de Imagen
  // ----------------------------------------------------
  const getBase64ImageFromUrl = async (imageUrl) => {
    if (!imageUrl) return '';
    if (typeof imageUrl === 'string' && imageUrl.includes('gettablefileurl')) {
      try {
        const urlObj = new URL(imageUrl);
        const fileName = urlObj.searchParams.get('fileName');
        if (!fileName || fileName.trim() === '') {
          return '';
        }
      } catch (e) {
        if (imageUrl.endsWith('fileName=') || imageUrl.includes('fileName=&')) {
          return '';
        }
      }
    }
    try {
      const res = await fetch(imageUrl);
      const blob = await res.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Error al decodificar imagen'));
        reader.readAsDataURL(blob);
      });
    } catch (e) {
      console.error('Error descargando imagen base64:', e);
      return '';
    }
  };

  const resizeImage = (base64Str, maxWidth = 300, maxHeight = 300, forcePng = false) => {
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
        const isPng = forcePng || base64Str.startsWith('data:image/png') || base64Str.includes('signature') || base64Str.includes('octet-stream');
        ctx.drawImage(img, 0, 0, width, height);
        
        if (isPng) {
          resolve(canvas.toDataURL('image/png'));
        } else {
          resolve(canvas.toDataURL('image/jpeg', 0.95));
        }
      };
      img.onerror = () => {
        resolve(base64Str);
      };
    });
  };

  const getImgDimensions = (base64Str) => {
    return new Promise((resolve) => {
      if (!base64Str) {
        resolve({ width: 1, height: 1 });
        return;
      }
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        resolve({ width: img.width, height: img.height });
      };
      img.onerror = () => {
        resolve({ width: 1, height: 1 });
      };
    });
  };

  // ----------------------------------------------------
  // Generación de PDF (4 páginas estrictas A4)
  // ----------------------------------------------------
  const generateAvisoPdf = async (av, shouldDownload = true) => {
    try {
      triggerToast('Generando reporte PDF...', 'info');
      const emp = empresas.find(e => e.id === av.empresa_id);
      const est = allEstablecimientos.find(e => e.id === av.establecimiento_id);
      const empName = emp ? emp.razon_social : 'N/A';
      const estName = est ? est.denominacion : 'N/A';

      // 1. Obtener hallazgos asociados
      let findings = [];
      if (isDevMode) {
        findings = correctivas.filter(c => 
          c.empresa_id === av.empresa_id && 
          c.establecimiento_id === av.establecimiento_id && 
          c.fecha === av.fecha
        );
      } else {
        const { data, error } = await supabase
          .from('acciones_correctivas')
          .select('*')
          .eq('empresa_id', av.empresa_id)
          .eq('establecimiento_id', av.establecimiento_id)
          .eq('fecha', av.fecha);
        
        if (error) throw error;
        findings = data || [];
      }

      // Convertir imágenes de hallazgos a base64 firmadas
      const pathsToSign = [];
      if (!isDevMode) {
        findings.forEach(f => {
          if (f.imagen_url && f.imagen_url !== 'N/A') {
            if (!f.imagen_url.startsWith('http://') && !f.imagen_url.startsWith('https://')) {
              pathsToSign.push(f.imagen_url);
            }
          }
        });
      }

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
          console.error('Error al firmar URLs de hallazgos en lote para PDF:', e);
        }
      }

      const resolvedFindings = await Promise.all(findings.map(async (f) => {
        let base64 = '';
        let imgRatio = 1;
        if (f.imagen_url && f.imagen_url !== 'N/A') {
          try {
            if (isDevMode) {
              base64 = await getBase64ImageFromUrl('/brand/logo-primary.png');
            } else if (f.imagen_url.startsWith('http://') || f.imagen_url.startsWith('https://')) {
              base64 = await getBase64ImageFromUrl(f.imagen_url);
            } else {
              const signedUrl = signedUrlsMap[f.imagen_url];
              if (signedUrl) {
                base64 = await getBase64ImageFromUrl(signedUrl);
              }
            }
            if (base64) {
              base64 = await resizeImage(base64, 150, 150);
              const dims = await getImgDimensions(base64);
              imgRatio = dims.width / dims.height;
            }
          } catch (e) {
            console.error('Error cargando imagen del hallazgo en PDF:', e);
          }
        }
        return {
          ...f,
          base64Image: base64,
          imgRatio: imgRatio
        };
      }));

      // 2. Inicializar jsPDF en puntos (A4: 595 x 842 pt)
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'pt',
        format: 'a4',
        compress: true
      });

      // 3. Obtener Logotipo principal
      let logoBase64 = '';
      try {
        if (tenant && tenant.logo_1_url) {
          logoBase64 = await getBase64ImageFromUrl(tenant.logo_1_url);
        }
      } catch (e) {
        console.error('Error al cargar logo principal del tenant:', e);
      }

      if (!logoBase64) {
        try {
          logoBase64 = await getBase64ImageFromUrl('/brand/logo-primary.png');
        } catch (e) {
          console.error('Error al cargar logo por defecto:', e);
        }
      }

      if (logoBase64) {
        logoBase64 = await resizeImage(logoBase64, 250, 250);
      }

      // 4. Obtener firma del profesional
      let signatureBase64 = '';
      if (av.firma_digital) {
        try {
          if (av.firma_digital.startsWith('data:')) {
            signatureBase64 = av.firma_digital;
          } else if (isDevMode || av.firma_digital.startsWith('mock')) {
            signatureBase64 = await getBase64ImageFromUrl('/brand/logo-primary.png');
          } else {
            // Extraer path relativo si es una URL de Supabase Storage (pública o privada)
            let relativePath = av.firma_digital;
            let isExternal = false;
            
            if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
              try {
                const urlObj = new URL(relativePath);
                const pathParts = urlObj.pathname.split('/');
                // Buscar el índice del bucket para extraer el path relativo del objeto
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
              signatureBase64 = await getBase64ImageFromUrl(av.firma_digital);
            } else {
              const bucketName = av.firma_tipo === 'perfil' ? 'signatures' : 'documents';
              const { data: sData, error: sErr } = await supabase.storage
                .from(bucketName)
                .createSignedUrl(relativePath, 3600);
              if (!sErr && sData?.signedUrl) {
                signatureBase64 = await getBase64ImageFromUrl(sData.signedUrl);
              }
            }
          }
          if (signatureBase64) {
            signatureBase64 = await resizeImage(signatureBase64, 1200, 600, true);
          }
        } catch (e) {
          console.error('Error al cargar firma digital para PDF:', e);
        }
      }

      // Helper Cabecera y Pie de página
      const drawHeaderAndFooter = (pageNum) => {
        // Logo
        if (logoBase64) {
          try {
            if (pageNum <= 3) {
              doc.addImage(logoBase64, 'PNG', 28.35, 28.35, 95.86, 53.92);
            } else {
              doc.addImage(logoBase64, 'PNG', 28.35, 28.35, 87.53, 49.23);
            }
          } catch (e) {
            console.error('Error pintando logo en cabecera PDF:', e);
          }
        }

        if (pageNum <= 3) {
          // Barra de título (Páginas 1 a 3)
          doc.setFillColor(68, 114, 196); // #4472C4
          doc.rect(27.89, 82.27, 539.22, 14.5, 'F');
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(11.78);
          doc.setTextColor(255, 255, 255);
          doc.text('Aviso de Riesgo', 27.89 + 539.22 / 2, 82.27 + 10.5, { align: 'center' });

          // Datos Generales y_inicio = 96.77, h = 32.62
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8.25);
          doc.setTextColor(0, 0, 0);

          // Fila 1 (y=111.0)
          doc.text('Razón Social:', 29.71, 111.0);
          doc.text('Establecimiento:', 319.7, 111.0);

          doc.setFont('helvetica', 'normal');
          const maxEmpWidth = 200;
          const maxEstWidth = 120;
          doc.text(doc.splitTextToSize(empName, maxEmpWidth)[0] || '', 109.46, 111.0);
          
          doc.setFontSize(7.07);
          doc.text(doc.splitTextToSize(estName, maxEstWidth)[0] || '', 432.08, 111.0);

          // Fila 2 (y=122.0)
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8.25);
          doc.text('Fecha:', 29.71, 122.0);
          doc.text('Aviso N°:', 319.7, 122.0);

          doc.setFont('helvetica', 'normal');
          doc.text(formatDate(av.fecha), 109.46, 122.0);
          doc.text(String(av.aviso_numero || 'N/A'), 432.08, 122.0);

        } else {
          // Página 4
          // Barra de título
          doc.setFillColor(68, 114, 196); // #4472C4
          doc.rect(27.93, 77.58, 539.14, 13.24, 'F');
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(10.76);
          doc.setTextColor(255, 255, 255);
          doc.text('Aviso de Riesgo', 27.93 + 539.14 / 2, 77.58 + 9.5, { align: 'center' });

          // Datos Generales y_inicio = 90.82, h = 38.07
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(7.53);
          doc.setTextColor(0, 0, 0);

          // Fila 1 (y=105.0)
          doc.text('Razón Social:', 29.59, 105.0);
          doc.text('Establecimiento:', 341.15, 105.0);

          doc.setFont('helvetica', 'normal');
          doc.text(doc.splitTextToSize(empName, 220)[0] || '', 102.41, 105.0);
          doc.text(doc.splitTextToSize(estName, 110)[0] || '', 443.77, 105.0);

          // Fila 2 (y=116.0)
          doc.setFont('helvetica', 'bold');
          doc.text('Fecha:', 29.59, 116.0);
          doc.text('Aviso N°:', 341.15, 116.0);

          doc.setFont('helvetica', 'normal');
          doc.text(formatDate(av.fecha), 102.41, 116.0);
          doc.text(String(av.aviso_numero || 'N/A'), 443.77, 116.0);
        }

        // Footer: Línea azul y texto comercial
        doc.setFillColor(68, 114, 196); // #4472C4
        doc.rect(27.89, 790, 539.22, 5, 'F');

        // Footer Central Text (centered at x=297.5)
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9.75);
        doc.setTextColor(0, 0, 0);
        const companyName = tenant?.name || 'Gestión SySO';
        const phoneVal = profile?.role === 'miembro' ? (profile?.phone || '') : adminContact.phone;
        const emailVal = profile?.role === 'miembro' ? (profile?.email || '') : adminContact.email;
        const footerText = `${companyName} - Tel: ${phoneVal} - Email: ${emailVal}`;
        doc.text(footerText, 297.5, 812.23, { align: 'center' });

        // Footer Page Number (right-aligned at x=567.11)
        doc.text(`Pág. ${pageNum}`, 567.11, 812.23, { align: 'right' });
      };

      const drawWrappedCellText = (text, x, rowY, rowHeight, colWidth, align = 'left', bold = false) => {
        if (!text) return;
        doc.setFont('helvetica', bold ? 'bold' : 'normal');
        doc.setFontSize(6.48);
        doc.setTextColor(0, 0, 0);
        const padding = 2;
        const maxWidth = colWidth - padding * 2;
        const lines = doc.splitTextToSize(text, maxWidth);
        const lineHeight = 7.45;
        const totalHeight = lines.length * lineHeight;
        
        let startY = rowY + (rowHeight - totalHeight) / 2 + lineHeight - 1;
        
        lines.forEach((line) => {
          const textX = align === 'center' ? x + colWidth / 2 : x + padding;
          doc.text(line, textX, startY, { align });
          startY += lineHeight;
        });
      };

      const drawRiesgoCell = (riesgoStr, rowY, rowHeight) => {
        let color = [240, 240, 240];
        let textColor = [0, 0, 0];
        let label = 'N/A';
        
        const cleanRiesgo = (riesgoStr || '').toLowerCase();
        if (cleanRiesgo.includes('trivial')) {
          color = [0, 176, 80];
          textColor = [0, 0, 0];
          label = 'Riesgo\ntrivial';
        } else if (cleanRiesgo.includes('tolerable')) {
          color = [0, 255, 0];
          textColor = [0, 0, 0];
          label = 'Riesgo\ntolerable';
        } else if (cleanRiesgo.includes('moderado')) {
          color = [255, 255, 0];
          textColor = [0, 0, 0];
          label = 'Riesgo\nmoderado';
        } else if (cleanRiesgo.includes('sustancial')) {
          color = [255, 153, 0];
          textColor = [0, 0, 0];
          label = 'Riesgo\nsustancial';
        } else if (cleanRiesgo.includes('intolerable')) {
          color = [255, 0, 0];
          textColor = [0, 0, 0];
          label = 'Riesgo\nintolerable';
        }

        // Fill cell: Col 4 starts at x=283.45, w=34.89, yStart=rowY, height=rowHeight
        doc.setFillColor(color[0], color[1], color[2]);
        doc.rect(283.45 + 0.2, rowY + 0.2, 34.89 - 0.4, rowHeight - 0.4, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.48);
        doc.setTextColor(textColor[0], textColor[1], textColor[2]);

        const lines = label.split('\n');
        const lineHeight = 7.45;
        const totalHeight = lines.length * lineHeight;
        let startY = rowY + (rowHeight - totalHeight) / 2 + lineHeight - 1;

        lines.forEach((line) => {
          doc.text(line, 283.45 + 34.89 / 2, startY, { align: 'center' });
          startY += lineHeight;
        });
      };

      const tableY = 128.94;
      const headerHeight = 15.86;
      const rowBounds = [
        { yStart: 144.35, height: 102.4 },
        { yStart: 246.3,  height: 102.4 },
        { yStart: 348.25, height: 102.4 },
        { yStart: 450.2,  height: 102.41 },
        { yStart: 552.15, height: 102.41 },
        { yStart: 654.11, height: 102.4 }
      ];

      // PAGINAS 1, 2, 3: Grilla de Hallazgos
      for (let p = 0; p < 3; p++) {
        if (p > 0) doc.addPage();
        drawHeaderAndFooter(p + 1);

        // Tabla: Cabecera Background Fill
        doc.setFillColor(102, 102, 102); // #666666
        doc.rect(27.89, tableY, 539.22, headerHeight, 'F');

        // Filas Background Fill alternating (odd: #F3F3F3, even: #FFFFFF)
        for (let r = 0; r < 6; r++) {
          const bounds = rowBounds[r];
          const bgVal = (r % 2 === 0) ? '#F3F3F3' : '#FFFFFF';
          doc.setFillColor(bgVal);
          doc.rect(27.89, bounds.yStart, 539.22, bounds.height, 'F');
        }

        // Draw Table Grid Borders (#999999, 0.453 pt)
        doc.setDrawColor(153, 153, 153);
        doc.setLineWidth(0.453);
        doc.rect(27.89, tableY, 539.22, headerHeight + 627.57 - headerHeight); // 128.94 to 756.51
        
        // Horizontal separators
        doc.line(27.89, tableY + headerHeight, 567.11, tableY + headerHeight);
        for (let r = 0; r < 6; r++) {
          const bounds = rowBounds[r];
          doc.line(27.89, bounds.yStart + bounds.height, 567.11, bounds.yStart + bounds.height);
        }

        // Vertical separators (x boundaries)
        const xCoords = [27.89, 40.58, 111.72, 139.99, 283.45, 318.34, 404.55, 567.11];
        for (let i = 1; i < xCoords.length - 1; i++) {
          doc.line(xCoords[i], tableY, xCoords[i], 756.51);
        }

        // Header Texts
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.48);
        doc.setTextColor(255, 255, 255);
        doc.text('N°', 27.89 + 12.69 / 2, tableY + 10, { align: 'center' });
        doc.text('Área / Sector', 40.58 + 71.14 / 2, tableY + 10, { align: 'center' });
        
        doc.text('Puesto /', 111.72 + 28.27 / 2, tableY + 6.5, { align: 'center' });
        doc.text('Operación', 111.72 + 28.27 / 2, tableY + 13.5, { align: 'center' });
        
        doc.text('Descripción de la condición insegura', 139.99 + 143.46 / 2, tableY + 10, { align: 'center' });
        
        doc.text('Nivel de', 283.45 + 34.89 / 2, tableY + 6.5, { align: 'center' });
        doc.text('riesgo', 283.45 + 34.89 / 2, tableY + 13.5, { align: 'center' });
        
        doc.text('Imagen', 318.34 + 86.21 / 2, tableY + 10, { align: 'center' });
        doc.text('Recomendaciones', 404.55 + 162.56 / 2, tableY + 10, { align: 'center' });

        // Renglones de hallazgos
        for (let r = 0; r < 6; r++) {
          const bounds = rowBounds[r];
          const index = p * 6 + r;
          const findingNum = index + 1;

          // Pintar índice N° (Col 0)
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(6.48);
          doc.setTextColor(0, 0, 0);
          doc.text(String(findingNum), 27.89 + 12.69 / 2, bounds.yStart + bounds.height / 2 + 3, { align: 'center' });

          const f = resolvedFindings[index];
          if (f) {
            // Área / Sector (Col 1)
            drawWrappedCellText(f.area_sector, 40.58, bounds.yStart, bounds.height, 71.14, 'left');
            // Puesto / Operación (Col 2)
            drawWrappedCellText(f.puesto_operacion, 111.72, bounds.yStart, bounds.height, 28.27, 'center');
            // Descripción del hallazgo (Col 3)
            drawWrappedCellText(f.descripcion_hallazgo, 139.99, bounds.yStart, bounds.height, 143.46, 'left');
            // Nivel de riesgo (Col 4)
            drawRiesgoCell(f.nivel_riesgo, bounds.yStart, bounds.height);
            // Imagen (Col 5 - Aspect ratio scale)
            if (f.base64Image) {
              try {
                const maxW = 86.21;
                const maxH = bounds.height;
                const imgRatio = f.imgRatio || 1;
                
                let imgW = maxW;
                let imgH = maxH;
                
                if (imgRatio < 1) {
                  // Vertical: adapt to cell height (alto de la celda)
                  imgH = maxH;
                  imgW = maxH * imgRatio;
                  if (imgW > maxW) {
                    imgW = maxW;
                    imgH = maxW / imgRatio;
                  }
                } else {
                  // Horizontal (or square): adapt to cell width (ancho de la celda)
                  imgW = maxW;
                  imgH = maxW / imgRatio;
                  if (imgH > maxH) {
                    imgH = maxH;
                    imgW = maxH * imgRatio;
                  }
                }
                
                const imgX = 318.34 + (maxW - imgW) / 2;
                const imgY = bounds.yStart + (maxH - imgH) / 2;
                doc.addImage(f.base64Image, 'PNG', imgX + 0.2, imgY + 0.2, imgW - 0.4, imgH - 0.4);
              } catch (e) {
                console.error('Error dibujando imagen de hallazgo:', e);
              }
            }
            // Recomendaciones (Col 6)
            drawWrappedCellText(f.recomendacion, 404.55, bounds.yStart, bounds.height, 162.56, 'left');
          }
        }
      }

      // PAGINA 4: Referencias, Observaciones e Firmas
      doc.addPage();
      drawHeaderAndFooter(4);

      // 1. Referencias Table
      const refY = 128.48;
      // Título "Referencias" (Se extiende para cubrir la brecha hasta la cabecera)
      doc.setFillColor(68, 114, 196);
      doc.rect(27.93, refY, 539.14, 17.38, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.53);
      doc.setTextColor(255, 255, 255);
      doc.text('Referencias', 27.93 + 539.14 / 2, refY + 11.5, { align: 'center' });

      // Encabezado (Comienza exactamente en y = 145.86, resolviendo el espacio en blanco)
      doc.setFillColor(217, 217, 217); // #D9D9D9
      doc.rect(27.93, 145.86, 539.14, 8.68, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.45);
      doc.setTextColor(0, 0, 0);
      doc.text('Nivel de Riesgo', 27.93 + 73.24 / 2, 145.86 + 6.5, { align: 'center' });
      doc.text('Acción y cronograma', 101.17 + 465.9 / 2, 145.86 + 6.5, { align: 'center' });

      const refRows = [
        {
          nivel: 'Riesgo trivial',
          yStart: 154.54,
          height: 8.69,
          bg: '#00B050',
          accion: 'No se requiere ninguna acción y no es necesario guardar registros documentados.'
        },
        {
          nivel: 'Riesgo tolerable',
          yStart: 163.23,
          height: 15.72,
          bg: '#00FF00',
          accion: 'No hacen falta controles adicionales. Puede prestarse mayor consideración a una mejor costo/beneficio, o mejora que no imponga una carga de costos adicionales. Se requiere monitoreo para asegurar que se mantengan los controles.'
        },
        {
          nivel: 'Riesgo moderado',
          yStart: 178.95,
          height: 30.61,
          bg: '#FFFF00',
          accion: 'Deben tomarse los recaudos para reducir el riesgo, pero los costos de prevención deben medirse y restringirse cuidadosamente. Deben implementarse medidas de reducción de riesgo dentro de un lapso definido. Cuando el riesgo moderado está asociado con consecuencias de daño extremo, pueden resultar necesarias ulteriores evaluaciones para establecer con más precisión la probabilidad de daño como base para determinar la necesidad de tomar mejores medidas de control.'
        },
        {
          nivel: 'Riesgo sustancial',
          yStart: 209.56,
          height: 15.72,
          bg: '#FF9900',
          accion: 'No debe comenzar el trabajo hasta que se haya reducido el riesgo. Puede ser necesario asignar recursos considerables para reducir el riesgo. Cuando éste involucra trabajo en proceso, debe tomarse acción urgente.'
        },
        {
          nivel: 'Riesgo intolerable',
          yStart: 225.28,
          height: 8.69,
          bg: '#FF0000',
          accion: 'No debe comenzar ni continuar el trabajo hasta que se haya reducido el riesgo. Si no es posible reducir el riesgo, el trabajo tiene que permanecer prohibido.'
        }
      ];

      // Draw rows background and text
      refRows.forEach((row) => {
        // Nivel (Col 1) background
        doc.setFillColor(row.bg);
        doc.rect(27.93 + 0.2, row.yStart + 0.2, 73.24 - 0.4, row.height - 0.4, 'F');
        
        // Nivel text
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.45);
        doc.setTextColor(0, 0, 0);
        const labelLines = doc.splitTextToSize(row.nivel, 70);
        const lh = 7.42;
        const labelH = labelLines.length * lh;
        let labelY = row.yStart + (row.height - labelH) / 2 + lh - 1;
        labelLines.forEach((line) => {
          doc.text(line, 27.93 + 73.24 / 2, labelY, { align: 'center' });
          labelY += lh;
        });

        // Acción (Col 2) text
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.45);
        doc.setTextColor(0, 0, 0);
        const actionLines = doc.splitTextToSize(row.accion, 459.9);
        const actionH = actionLines.length * lh;
        let actionY = row.yStart + (row.height - actionH) / 2 + lh - 1;
        actionLines.forEach((line) => {
          doc.text(line, 101.17 + 3, actionY);
          actionY += lh;
        });
      });

      // Draw table borders (black, 0.414 pt)
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.414);
      doc.rect(27.93, refY, 539.14, 105.49);
      doc.line(27.93, 145.86, 567.07, 145.86);
      doc.line(27.93, 154.54, 567.07, 154.54);
      doc.line(101.17, 145.86, 101.17, 233.97);
      refRows.forEach((row) => {
        doc.line(27.93, row.yStart + row.height, 567.07, row.yStart + row.height);
      });

      // 2. Observaciones Block (Reducido a una altura de 300.0 pt, finaliza en y=549.3 pt)
      const obsY = 239.78;
      // Título "Observaciones"
      doc.setFillColor(68, 114, 196);
      doc.rect(27.93, obsY, 539.14, 9.52, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.53);
      doc.setTextColor(255, 255, 255);
      doc.text('Observaciones', 27.93 + 539.14 / 2, obsY + 7.5, { align: 'center' });

      // Box (Alto reducido de 400.0 pt a 300.0 pt)
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.414);
      doc.rect(28.35, 249.3, 538.72, 300.0);

      // Render Text
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.45);
      doc.setTextColor(0, 0, 0);
      const obsText = av.observaciones || 'NA.';
      const obsLines = doc.splitTextToSize(obsText, 532.72);
      let obsLineY = 258.61;
      const obsLh = 7.45;
      obsLines.forEach((line) => {
        if (obsLineY < 540) { // Se adapta al nuevo alto límite de 549.3 pt
          doc.text(line, 28.35 + 3, obsLineY);
          obsLineY += obsLh;
        }
      });

      // 3. Firma del Profesional (Posicionada por fuera, en el espacio y=600 a 752 pt)
      // Dibujar imagen de la firma (y = 600 a 720) sin deformación
      if (signatureBase64) {
        try {
          const maxSigW = 240;
          const maxSigH = 120;
          const sigDims = await getImgDimensions(signatureBase64);
          const sigRatio = sigDims.width / sigDims.height;
          
          let sigW = maxSigW;
          let sigH = maxSigH;
          
          if (sigRatio > maxSigW / maxSigH) {
            // Más horizontal: se adapta al ancho máximo
            sigW = maxSigW;
            sigH = maxSigW / sigRatio;
          } else {
            // Más vertical: se adapta al alto máximo
            sigH = maxSigH;
            sigW = maxSigH * sigRatio;
          }
          
          // Centrar horizontal y verticalmente en la zona de firma
          const sigX = 327.07 + (maxSigW - sigW) / 2;
          const sigY = 600 + (maxSigH - sigH) / 2;
          
          doc.addImage(signatureBase64, 'PNG', sigX, sigY, sigW, sigH);
        } catch (e) {
          console.error('Error dibujando firma en PDF:', e);
        }
      }

      // Línea de firma (y = 730)
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.414);
      doc.line(377.07, 730, 517.07, 730);

      // Aclaración (Nombre del profesional) - Posicionada por debajo de la línea de firma (y=742)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(0, 0, 0);
      doc.text(av.profesional_nombre || 'N/A', 447.07, 742, { align: 'center' });

      // Cargo pie de firma (y=752)
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5.92);
      doc.setTextColor(0, 0, 0);
      doc.text('Responsable de Higiene y Seguridad', 447.07, 752, { align: 'center' });

      if (shouldDownload) {
        doc.save(`Aviso_Riesgo_${av.aviso_numero || 'N_A'}.pdf`);
        triggerToast('PDF descargado exitosamente.');
      } else {
        return doc;
      }
    } catch (err) {
      console.error('Error generando PDF:', err);
      triggerToast('Error al generar el reporte PDF.', 'error');
    }
  };

  const handleOpenPdf = async (av) => {
    try {
      const doc = await generateAvisoPdf(av, false);
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

  // ----------------------------------------------------
  // Envío por Correo Electrónico
  // ----------------------------------------------------
  const handleOpenEmailModal = (av) => {
    setMailTargetAviso(av);
    setActiveTab('email');
    const emp = empresas.find(e => e.id === av.empresa_id);
    
    // Cargar Correos
    if (emp && emp.contactos_correos && emp.contactos_correos.length > 0) {
      const formatted = emp.contactos_correos.map((c, i) => {
        const mailStr = (typeof c === 'object') ? (c.correo || c.valor || '') : String(c);
        const nameStr = (typeof c === 'object' && c.nombre) ? c.nombre : 'Contacto';
        const cargoStr = (typeof c === 'object' && c.cargo) ? c.cargo : '';
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

    // Cargar Teléfonos
    if (emp && emp.contactos_telefonos && emp.contactos_telefonos.length > 0) {
      const formatted = emp.contactos_telefonos.map((t, i) => {
        const phoneStr = (typeof t === 'object') ? (t.telefono || t.valor || '') : String(t);
        const nameStr = (typeof t === 'object' && t.nombre) ? t.nombre : 'Contacto';
        const cargoStr = (typeof t === 'object' && t.cargo) ? t.cargo : '';
        return {
          valor: phoneStr,
          descripcion: nameStr 
            ? `${nameStr}${cargoStr ? ` - ${cargoStr}` : ''} (${phoneStr})` 
            : phoneStr,
          checked: i === 0
        };
      }).filter(item => item.valor);
      setAvailablePhones(formatted);
    } else {
      setAvailablePhones([]);
    }
    setManualPhone('');
    setIsMailModalOpen(true);
  };

  const handleSendEmail = async (e) => {
    if (e) e.preventDefault();
    if (!mailTargetAviso) return;
    
    const checkedEmails = availableEmails.filter(e => e.checked).map(e => e.valor);
    const manualList = manualEmail.split(',').map(e => e.trim()).filter(Boolean);
    const recipients = [...checkedEmails, ...manualList];

    if (recipients.length === 0) {
      triggerToast('Debe ingresar o seleccionar al menos un correo de destino.', 'error');
      return;
    }

    setMailLoading(true);
    try {
      const doc = await generateAvisoPdf(mailTargetAviso, false);
      if (!doc) throw new Error('No se pudo generar el PDF del aviso.');
      
      const pdfBlob = doc.output('blob');
      
      // Subir archivo al storage en la carpeta del usuario (RSL lo valida)
      const fileId = crypto.randomUUID();
      const filePath = `${profile?.id || 'anonymous'}/aviso_${mailTargetAviso.id}_${fileId}.pdf`;
      
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, pdfBlob, {
          contentType: 'application/pdf',
          upsert: true
        });

      if (uploadError) {
        throw new Error(`Error al subir el adjunto a Storage: ${uploadError.message}`);
      }

      const emp = empresas.find(e => e.id === mailTargetAviso.empresa_id);
      const est = allEstablecimientos.find(e => e.id === mailTargetAviso.establecimiento_id);

      // Obtener logo del tenant como base64 (para el encabezado del email)
      let tenantLogoBase64 = '';
      if (tenant && tenant.logo_1_url) {
        try {
          tenantLogoBase64 = await getBase64ImageFromUrl(tenant.logo_1_url);
          if (tenantLogoBase64) {
            tenantLogoBase64 = await resizeImage(tenantLogoBase64, 400, 200);
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
        date: formatDate(mailTargetAviso.fecha),
        inspectorName: mailTargetAviso.profesional_nombre,
        tenantLogoBase64: tenantLogoBase64 || null,
        tenantName: tenant?.name || 'Gestión SySO',
        documentType: 'aviso_riesgo'
      };

      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Error del servidor al enviar correo.');
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

  // Enviar por WhatsApp
  const handleSendWhatsApp = async () => {
    setWhatsappLoading(true);
    try {
      // 1. Obtener destinatario (si hay)
      const checkedPhones = availablePhones.filter(p => p.checked).map(p => p.valor);
      const manualVal = manualPhone.trim();
      
      let targetPhone = '';
      if (checkedPhones.length > 0) {
        targetPhone = checkedPhones[0];
      } else if (manualVal) {
        targetPhone = manualVal;
      }
      
      let cleanPhone = targetPhone.replace(/[^0-9]/g, '');
      
      // 2. Generar el PDF
      const docPdf = await generateAvisoPdf(mailTargetAviso, false);
      if (!docPdf) throw new Error('No se pudo generar el reporte PDF.');
      const pdfBlob = docPdf.output('blob');
      
      // 3. Subir a Storage
      const fileId = crypto.randomUUID();
      const filePath = `${profile?.id || 'anonymous'}/aviso_${mailTargetAviso.id}_${fileId}.pdf`;
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, pdfBlob, {
          contentType: 'application/pdf',
          upsert: true
        });

      if (uploadError) {
        throw new Error(`Error al subir el reporte a Storage: ${uploadError.message}`);
      }

      // 4. Obtener URL firmada
      const { data: signData, error: signError } = await supabase.storage
        .from('documents')
        .createSignedUrl(filePath, 604800);
      
      if (signError || !signData?.signedUrl) {
        throw new Error(`Error al generar enlace seguro de descarga: ${signError?.message || 'Enlace nulo'}`);
      }

      const pdfUrl = signData.signedUrl;
      const emp = empresas.find(e => e.id === mailTargetAviso.empresa_id);
      const est = allEstablecimientos.find(e => e.id === mailTargetAviso.establecimiento_id);
      const empName = emp ? emp.razon_social : 'N/A';
      const estName = est ? est.denominacion : 'N/A';

      // 5. Construir mensaje
      const tName = tenant ? (tenant.razon_social || tenant.nombre || 'Gestión SySO') : 'Gestión SySO';
      const textMessage = `Estimado cliente de *${empName}* (Establecimiento: *${estName}*),\n\nLe adjuntamos el *Aviso de Riesgo* N° *${mailTargetAviso.aviso_numero || 'N/A'}* del día *${formatDate(mailTargetAviso.fecha)}* generado por el profesional *${mailTargetAviso.profesional_nombre}* de *${tName}*.\n\nPuede ver y descargar el documento PDF ingresando al siguiente enlace seguro:\n${pdfUrl}`;
      
      const encodedMsg = encodeURIComponent(textMessage);
      
      // 6. Abrir WhatsApp
      let waUrl = '';
      if (cleanPhone) {
        waUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedMsg}`;
      } else {
        waUrl = `https://api.whatsapp.com/send?text=${encodedMsg}`;
      }
      
      window.open(waUrl, '_blank');
      triggerToast('Redirigiendo a WhatsApp...');
      setIsMailModalOpen(false);
    } catch (e) {
      console.error(e);
      triggerToast(e.message || 'Error al intentar enviar por WhatsApp.', 'error');
    } finally {
      setWhatsappLoading(false);
    }
  };

  // ----------------------------------------------------
  // Filtrado y Ordenamiento de Avisos
  // ----------------------------------------------------
  const filteredAvisos = avisos.filter(a => {
    const emp = empresas.find(e => e.id === a.empresa_id);
    const est = allEstablecimientos.find(e => e.id === a.establecimiento_id);
    const search = searchQuery.toLowerCase();
    
    const matchesSearch = 
      (emp?.razon_social || '').toLowerCase().includes(search) ||
      (est?.denominacion || '').toLowerCase().includes(search) ||
      (a.aviso_numero || '').toLowerCase().includes(search) ||
      (a.profesional_nombre || '').toLowerCase().includes(search);

    const matchesEmpresa = !filterEmpresa || a.empresa_id === filterEmpresa;
    const matchesEstablecimiento = !filterEstablecimiento || a.establecimiento_id === filterEstablecimiento;
    const matchesFecha = !filterFecha || a.fecha === filterFecha;
    const matchesAnio = !filterAnio || (a.fecha && a.fecha.substring(0, 4) === filterAnio);
    const matchesMes = !filterMes || (a.fecha && a.fecha.substring(5, 7) === filterMes);

    return matchesSearch && matchesEmpresa && matchesEstablecimiento && matchesFecha && matchesAnio && matchesMes;
  });

  const sortedAvisos = [...filteredAvisos].sort((a, b) => {
    let valA = '';
    let valB = '';

    if (sortField === 'cliente') {
      const empA = empresas.find(e => e.id === a.empresa_id);
      const empB = empresas.find(e => e.id === b.empresa_id);
      valA = (empA?.razon_social || '').toLowerCase();
      valB = (empB?.razon_social || '').toLowerCase();
    } else if (sortField === 'establecimiento') {
      const estA = allEstablecimientos.find(e => e.id === a.establecimiento_id);
      const estB = allEstablecimientos.find(e => e.id === b.establecimiento_id);
      valA = (estA?.denominacion || '').toLowerCase();
      valB = (estB?.denominacion || '').toLowerCase();
    } else {
      valA = a[sortField] || '';
      valB = b[sortField] || '';
    }

    if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const isFormDisabled = (editingId ? !canEditar : !canCargar) || isReadOnlyView;

  return (
    <div className="h-screen overflow-hidden bg-syso-bg text-slate-700 flex font-sans">
      
      <Sidebar
        tenantSlug={tenantSlug}
        profile={profile}
        currentSection="avisos"
        isSidebarCollapsed={isSidebarCollapsed}
        toggleSidebar={toggleSidebar}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
        handleLogout={handleLogout}
        onNavigate={handleSidebarNavigation}
      />

      {/* Main Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <AppPageHeader
          title="Avisos de Riesgo"
          icon={AlertTriangle}
          tenantName={tenant?.name || 'Cargando...'}
          planId={tenant?.plan_id}
          showPlanBadge={profile && profile.role !== 'cliente'}
          setIsMobileMenuOpen={setIsMobileMenuOpen}
        />

        {loading ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-[#468DFF] mx-auto" />
              <p className="text-xs text-slate-500 font-semibold">Cargando avisos de riesgo...</p>
            </div>
          </div>
        ) : (
          <div className="max-w-[95%] mx-auto w-full py-8 px-4 md:px-0 flex-1 flex flex-col min-h-0">
            
            {view === 'form' ? (
              // FORMULARIO DE ALTA Y EDICIÓN INLINE
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col max-h-[85vh] animate-fade-in">
                <div className="h-16 px-4 md:px-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={handleExitForm} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 cursor-pointer">
                      <ArrowLeft className="h-5 w-5" />
                    </button>
                    <span className="font-outfit text-base font-bold text-slate-900">
                      {editingId ? 'Detalle / Editar Aviso de Riesgo' : 'Nuevo Registro Aviso de Riesgo'}
                    </span>
                  </div>
                  <button type="button" onClick={handleExitForm} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-200 cursor-pointer">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <form onSubmit={handleSave} className="p-6 space-y-6 overflow-y-auto flex-1 scrollbar-thin">
                  <fieldset disabled={isFormDisabled} className="space-y-6">
                    
                    {/* Fila 1: Número, Cliente, Establecimiento, Fecha */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <label className="text-xs font-bold text-slate-600 block mb-1.5">
                          Aviso N° <span className="text-[#468DFF]">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={avisoNumero}
                          onChange={(e) => setAvisoNumero(e.target.value)}
                          className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50"
                        />
                      </div>
                      
                      <div>
                        <label className="text-xs font-bold text-slate-600 block mb-1.5">
                          Cliente / Razón Social <span className="text-[#468DFF]">*</span>
                        </label>
                        <select
                          required
                          value={empresaId}
                          onChange={(e) => {
                            setEmpresaId(e.target.value);
                            setEstablecimientoId('');
                          }}
                          className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 cursor-pointer"
                        >
                          <option value="">Seleccione un cliente</option>
                          {empresas.map(emp => (
                            <option key={emp.id} value={emp.id}>{emp.razon_social}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-600 block mb-1.5">
                          Establecimiento <span className="text-[#468DFF]">*</span>
                        </label>
                        <select
                          required
                          disabled={!empresaId}
                          value={establecimientoId}
                          onChange={(e) => setEstablecimientoId(e.target.value)}
                          className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 cursor-pointer disabled:bg-slate-100"
                        >
                          <option value="">Seleccione establecimiento</option>
                          {allEstablecimientos
                            .filter(est => est.empresa_id === empresaId)
                            .map(est => (
                              <option key={est.id} value={est.id}>{est.denominacion}</option>
                            ))
                          }
                        </select>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-600 block mb-1.5">
                          Fecha <span className="text-[#468DFF]">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="DD/MM/YYYY"
                            maxLength={10}
                            value={fecha}
                            onChange={(e) => setFecha(formatAsDateInput(e.target.value))}
                            required
                            className="w-full border border-slate-200 rounded-xl pl-3.5 pr-10 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 font-mono"
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
      setFecha(`${parts[2]}/${parts[1]}/${parts[0]}`);
    }
  } else {
    setFecha('');
  }
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Previsualización de Hallazgos Cargados */}
                    <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 space-y-3">
                      <span className="font-outfit text-xs font-extrabold text-slate-800 block uppercase tracking-wider flex items-center gap-1.5">
                        <ClipboardList className="h-4 w-4 text-[#468DFF]" />
                        Condiciones Inseguras Cargadas ({loadedFindings.length})
                      </span>
                      {isLoadingFindings ? (
                        <div className="flex justify-center py-4">
                          <Loader2 className="h-6 w-6 animate-spin text-[#468DFF]" />
                        </div>
                      ) : loadedFindings.length === 0 ? (
                        <p className="text-xs text-slate-500 italic">
                          No se encontraron acciones correctivas registradas para el Cliente, Establecimiento y Fecha seleccionados.
                        </p>
                      ) : (
                        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                          <table className="w-full text-left text-xs border-collapse min-w-[700px]">
                            <thead>
                              <tr className="bg-slate-100 border-b border-slate-200 font-bold text-slate-500">
                                <th className="px-3 py-2">Sector</th>
                                <th className="px-3 py-2">Puesto</th>
                                <th className="px-3 py-2">Descripción</th>
                                <th className="px-3 py-2">Nivel de Riesgo</th>
                                <th className="px-3 py-2">Recomendaciones</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-medium">
                              {loadedFindings.map((f, idx) => {
                                const level = RISK_LEVELS[f.nivel_riesgo?.toLowerCase().replace('riesgo ', '')] || { label: f.nivel_riesgo, color: '#64748B', text: '#FFFFFF' };
                                return (
                                  <tr key={idx} className="hover:bg-slate-100">
                                    <td className="px-3 py-2 truncate max-w-[100px]">{f.area_sector}</td>
                                    <td className="px-3 py-2 truncate max-w-[100px]">{f.puesto_operacion}</td>
                                    <td className="px-3 py-2 truncate max-w-[150px]">{f.descripcion_hallazgo}</td>
                                    <td className="px-3 py-2">
                                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ backgroundColor: level.color, color: level.text }}>
                                        {level.label}
                                      </span>
                                    </td>
                                    <td className="px-3 py-2 truncate max-w-[150px]">{f.recomendacion}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    {/* Profesional Interviniente */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <span className="font-outfit text-xs font-extrabold text-slate-800 block uppercase tracking-wider">
                          Profesional Técnico Interviniente
                        </span>
                        
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-bold text-slate-600">Selección de Profesional *</label>
                          <select
                            value={profesionalId}
                            onChange={(e) => handleProfesionalChange(e.target.value)}
                            required
                            className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 cursor-pointer"
                          >
                            <option value="">Seleccionar Profesional...</option>
                            {miembros.map(m => (
                              <option key={m.id} value={m.id}>{m.full_name}</option>
                            ))}
                            <option value="__custom__">Otro (cargar manualmente)...</option>
                          </select>

                          {profesionalId === '__custom__' && (
                            <input
                              type="text"
                              placeholder="Nombre y Apellido del Profesional"
                              value={profesionalNombre}
                              onChange={(e) => setProfesionalNombre(e.target.value)}
                              required
                              className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-white mt-2 transition-all"
                            />
                          )}
                        </div>
                      </div>

                      {/* Configuración de Firma */}
                      <div className="space-y-2 flex flex-col">
                        <div className="flex flex-row justify-between items-end gap-2 min-h-[18px]">
                          <label className="text-xs font-bold text-slate-600 pr-2">Firma del Profesional de Higiene y Seguridad</label>
                          {firmaTipo === 'mano' && !isFormDisabled && (hasSignedMano || firmaManoSavedUrl) && (
                            <button
                              type="button"
                              onClick={handleClearCanvas}
                              className="text-[10px] font-bold text-red-500 hover:text-red-700 cursor-pointer shrink-0"
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
                              onClick={() => setFirmaTipo('perfil')}
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
                              onClick={() => setFirmaTipo('mano')}
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
                            {firmaManoSavedUrl && !hasSignedMano ? (
                              <img src={firmaManoSavedUrl} alt="Firma Profesional" className="w-full h-full object-contain p-2" />
                            ) : (
                              <canvas
                                ref={canvasRef}
                                width={400}
                                height={200}
                                className={`w-full h-full bg-white block ${!isFormDisabled ? 'cursor-crosshair' : 'cursor-default'}`}
                              />
                            )}
                            {!hasSignedMano && !firmaManoSavedUrl && (
                              <span className="absolute pointer-events-none text-[10px] text-slate-400 font-bold uppercase tracking-wider">Dibuje la firma aquí</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Observaciones Generales */}
                    <div>
                      <label className="text-xs font-bold text-slate-600 block mb-1.5">
                        Observaciones
                      </label>
                      <textarea
                        rows="3"
                        placeholder="Escribe comentarios de cierre del reporte, recomendaciones complementarias, etc..."
                        value={observaciones}
                        onChange={(e) => setObservaciones(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all h-24 resize-none"
                      />
                    </div>

                  </fieldset>

                  {/* Footer de Acciones del Formulario */}
                  <div className="flex justify-between items-center pt-6 border-t border-slate-100 shrink-0">
                    <AppButton
                      variant="secondary"
                      onClick={handleExitForm}
                    >
                      Salir
                    </AppButton>
                    
                    <div className="flex items-center gap-3">
                      {editingId && (
                        <>
                          <AppButton
                            variant="secondary"
                            onClick={() => {
                              const av = avisos.find(a => a.id === editingId);
                              if (av) handleOpenEmailModal(av);
                            }}
                            className="flex items-center gap-1.5 shadow-sm"
                          >
                            <Mail className="h-4 w-4" />
                            Enviar PDF
                          </AppButton>
                          <AppButton
                            variant="primary"
                            onClick={() => {
                              const av = avisos.find(a => a.id === editingId);
                              if (av) generateAvisoPdf(av);
                            }}
                            className="flex items-center gap-1.5 shadow-md shadow-[#468DFF]/10"
                          >
                            <Download className="h-4 w-4" />
                            Descargar PDF
                          </AppButton>
                        </>
                      )}
                      
                      {isReadOnlyView ? (
                        canEditar && (
                          <AppButton
                            className="bg-amber-500 hover:bg-amber-600 border-amber-500 hover:border-amber-600 text-white shadow-lg shadow-amber-500/10"
                            onClick={() => setIsReadOnlyView(false)}
                          >
                            Editar
                          </AppButton>
                        )
                      ) : (
                        <>
                          {editingId && canEliminar && (
                            <AppButton
                              variant="destructive"
                              onClick={() => handleDelete(editingId)}
                            >
                              Eliminar
                            </AppButton>
                          )}
                          {!isFormDisabled && (
                            <AppButton
                              type="submit"
                              loading={saving}
                            >
                              Guardar
                            </AppButton>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </form>
              </div>
            ) : (
              // VISTA: TABLA Y BUSCADOR
              <div className="space-y-6 flex-1 flex flex-col min-h-0">
                <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-sm space-y-3 shrink-0">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
                    {/* Espaciador para empujar el buscador a la derecha en desktop */}
                    <div className="hidden md:block flex-1"></div>

                    {/* Buscador */}
                    <div className="flex flex-col md:flex-row md:items-center gap-2 w-full md:w-auto">
                      <div className="relative w-full md:w-64">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
                        <input
                          type="text"
                          placeholder="Buscar por cliente, profesional, nro de aviso..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
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
                        {(searchQuery || filterEmpresa || filterEstablecimiento || filterFecha || filterAnio || filterMes) && (
                          <button
                            onClick={() => {
                              setSearchQuery('');
                              setFilterEmpresa('');
                              setFilterEstablecimiento('');
                              setFilterFecha('');
                              setFilterAnio('');
                              setFilterMes('');
                            }}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[10px] font-semibold cursor-pointer transition-all border border-slate-200"
                          >
                            Limpiar Filtros
                          </button>
                        )}
                      </div>

                      {canCargar && (
                        <button
                          onClick={handleAddNew}
                          className="px-3 py-1.5 bg-[#468DFF] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-[#0511F2] transition-all cursor-pointer shadow-lg shadow-[#468DFF]/10 shrink-0"
                        >
                          <PlusCircle className="h-3.5 w-3.5" />
                          Generar Aviso
                        </button>
                      )}
                    </div>
                    {showFilters && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 pt-1 animate-fade-in">
                        {/* Selector Cliente */}
                        {profile?.role !== 'cliente' && (
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Filtrar por Razón Social</label>
                            <select
                              value={filterEmpresa}
                              onChange={(e) => {
                                setFilterEmpresa(e.target.value);
                                setFilterEstablecimiento('');
                              }}
                              className="border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-600 focus:outline-none focus:border-[#468DFF] text-xs w-full cursor-pointer"
                            >
                              <option value="">Todas las Razones Sociales</option>
                              {empresas.map(e => (
                                <option key={e.id} value={e.id}>{e.razon_social}</option>
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
                            <option value="">Todos los Establecimientos</option>
                            {allEstablecimientos
                              .filter(est => est.empresa_id === filterEmpresa)
                              .map(est => (
                                <option key={est.id} value={est.id}>{est.denominacion}</option>
                              ))
                            }
                          </select>
                        </div>

                        {/* Selector Fecha */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Filtrar por Fecha</label>
                          <input
                            type="date"
                            value={filterFecha}
                            onChange={(e) => setFilterFecha(e.target.value)}
                            className="border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-600 focus:outline-none focus:border-[#468DFF] text-xs w-full cursor-pointer font-sans"
                          />
                        </div>

                        {/* Selector Año */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Filtrar por Año</label>
                          <select 
                            value={filterAnio}
                            onChange={(e) => setFilterAnio(e.target.value)}
                            className="border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-600 focus:outline-none focus:border-[#468DFF] text-xs w-full cursor-pointer"
                          >
                            <option value="">Todos los Años</option>
                            {getAvailableYears(avisos).map(y => (
                              <option key={y} value={y}>{y}</option>
                            ))}
                          </select>
                        </div>

                        {/* Selector Mes */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Filtrar por Mes</label>
                          <select 
                            value={filterMes}
                            onChange={(e) => setFilterMes(e.target.value)}
                            className="border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-600 focus:outline-none focus:border-[#468DFF] text-xs w-full cursor-pointer"
                          >
                            <option value="">Todos los Meses</option>
                            {MONTHS_OPTS.map(m => (
                              <option key={m.value} value={m.value}>{m.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Tabla de Avisos */}
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col transition-all duration-300 ease-in-out" style={{ height: showFilters ? 'calc(100vh - 310px)' : 'calc(100vh - 240px)' }}>
                  {sortedAvisos.length === 0 ? (
                    <div className="flex-grow flex flex-col items-center justify-center p-8 text-center gap-3 h-full">
                      <AlertCircle className="h-10 w-10 text-slate-300" />
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-slate-800">No hay avisos de riesgo registrados</p>
                        <p className="text-xs text-slate-400">Registra un nuevo aviso de riesgo para comenzar.</p>
                      </div>
                      {canCargar && (
                        <button
                          onClick={handleAddNew}
                          className="px-4 py-2 mt-2 bg-[#468DFF] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-[#0511F2] transition-all cursor-pointer shadow-md shadow-[#468DFF]/10 shrink-0"
                        >
                          <PlusCircle className="h-3.5 w-3.5" />
                          Registrar aviso
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="overflow-auto flex-grow">
                      <table className="w-full text-left border-collapse min-w-[850px]">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-400 uppercase tracking-wider">
                            <th className="px-6 py-4 cursor-pointer hover:text-slate-700 sticky top-0 z-10 bg-slate-50 border-b border-slate-200" onClick={() => handleSort('aviso_numero')}>N° Aviso</th>
                            <th className="px-6 py-4 cursor-pointer hover:text-slate-700 sticky top-0 z-10 bg-slate-50 border-b border-slate-200" onClick={() => handleSort('cliente')}>Cliente / Razón Social</th>
                            <th className="px-6 py-4 cursor-pointer hover:text-slate-700 sticky top-0 z-10 bg-slate-50 border-b border-slate-200" onClick={() => handleSort('establecimiento')}>Establecimiento</th>
                            <th className="px-6 py-4 cursor-pointer hover:text-slate-700 sticky top-0 z-10 bg-slate-50 border-b border-slate-200" onClick={() => handleSort('fecha')}>Fecha</th>
                            <th className="px-6 py-4 sticky top-0 z-10 bg-slate-50 border-b border-slate-200">Profesional</th>
                            <th className="px-6 py-4 text-right sticky top-0 z-10 bg-slate-50 border-b border-slate-200">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs font-normal text-slate-700">
                          {sortedAvisos.map(av => {
                            const emp = empresas.find(e => e.id === av.empresa_id);
                            const est = allEstablecimientos.find(e => e.id === av.establecimiento_id);
                            return (
                              <tr key={av.id} onClick={() => { setIsReadOnlyView(true); handleEdit(av); }} className="hover:bg-slate-100 cursor-pointer">
                                <td className="px-6 py-4 font-semibold text-slate-900">{av.aviso_numero}</td>
                                <td className="px-6 py-4 font-semibold text-slate-900">{emp ? emp.razon_social : 'N/A'}</td>
                                <td className="px-6 py-4 font-medium text-slate-600">{est ? est.denominacion : 'N/A'}</td>
                                <td className="px-6 py-4 font-semibold text-slate-600">{formatDate(av.fecha)}</td>
                                <td className="px-6 py-4 text-slate-600">{av.profesional_nombre}</td>
                                <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                                  <div className="flex items-center justify-end gap-2">
                                    <button
                                      onClick={() => handleOpenPdf(av)}
                                      title="Visualizar PDF"
                                      className="p-1.5 rounded-lg bg-[#EFF6FF] hover:bg-[#DBEAFE] text-[#468DFF] hover:text-[#0511F2] transition-all cursor-pointer"
                                    >
                                      <FileText className="h-4.5 w-4.5" />
                                    </button>
                                    <button
                                      onClick={() => generateAvisoPdf(av)}
                                      title="Descargar PDF"
                                      className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-all cursor-pointer"
                                    >
                                      <Download className="h-4.5 w-4.5" />
                                    </button>
                                    {profile && profile.role !== 'cliente' && (
                                      <button
                                        onClick={() => handleOpenEmailModal(av)}
                                        title="Enviar por Correo"
                                        className="p-1.5 rounded-lg bg-blue-50 hover:bg-[#468DFF]/25 text-[#468DFF] transition-all cursor-pointer"
                                      >
                                        <Mail className="h-4.5 w-4.5" />
                                      </button>
                                    )}
                                    {profile && profile.role !== 'cliente' && (
                                      canEditar ? (
                                        <button
                                          onClick={() => { setIsReadOnlyView(false); handleEdit(av); }}
                                          className="p-1.5 rounded-lg transition-all cursor-pointer bg-amber-50 hover:bg-amber-100 text-amber-600"
                                          title="Editar Aviso"
                                        >
                                          <Edit className="h-4.5 w-4.5" />
                                        </button>
                                      ) : (
                                        <button
                                          onClick={() => { setIsReadOnlyView(true); handleEdit(av); }}
                                          className="p-1.5 rounded-lg transition-all cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-600"
                                          title="Ver Detalle"
                                        >
                                          <Eye className="h-4.5 w-4.5" />
                                        </button>
                                      )
                                    )}
                                    {profile && profile.role !== 'cliente' && canEliminar && (
                                      <button
                                        onClick={() => handleDelete(av.id)}
                                        className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition-all cursor-pointer"
                                        title="Eliminar Aviso"
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

        {/* MODAL DE ENVÍO DE REPORTE (CORREO / WHATSAPP) */}
        {isMailModalOpen && mailTargetAviso && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div onClick={() => setIsMailModalOpen(false)} className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
            <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-md w-full z-10 shadow-2xl relative space-y-4 animate-fade-in">
              
              <div className="flex justify-between items-center">
                <h4 className="font-outfit text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Send className="h-4.5 w-4.5 text-[#468DFF]" />
                  Enviar Aviso de Riesgo (PDF)
                </h4>
                <button onClick={() => setIsMailModalOpen(false)} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Pestañas (Tabs) */}
              <div className="flex border-b border-slate-200">
                <button
                  type="button"
                  onClick={() => setActiveTab('email')}
                  className={`flex-1 pb-2 text-xs font-bold transition-all border-b-2 flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeTab === 'email'
                      ? 'border-[#468DFF] text-[#468DFF]'
                      : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <Mail className="h-3.5 w-3.5" />
                  Correo Electrónico
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('whatsapp')}
                  className={`flex-1 pb-2 text-xs font-bold transition-all border-b-2 flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeTab === 'whatsapp'
                      ? 'border-[#468DFF] text-[#468DFF]'
                      : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  WhatsApp
                </button>
              </div>

              {activeTab === 'email' ? (
                // PESTAÑA: CORREO ELECTRÓNICO
                <div className="space-y-4">
                  <p className="text-[11px] text-slate-500 font-medium">
                    Seleccione los contactos registrados de la empresa o ingrese correos electrónicos manualmente (separados por comas) para enviar el aviso de riesgo en PDF.
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

                  {/* Acciones Correo */}
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
              ) : (
                // PESTAÑA: WHATSAPP
                <div className="space-y-4">
                  <p className="text-[11px] text-slate-500 font-medium">
                    Seleccione un contacto registrado de la empresa o ingrese un número manualmente para compartir el aviso de riesgo. Se subirá el documento temporalmente a la nube de forma segura.
                  </p>

                  <div className="space-y-3">
                    {/* Contactos de la empresa */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-600 block">Teléfonos de la Empresa:</label>
                      {availablePhones.length === 0 ? (
                        <p className="text-xs text-slate-400 italic font-semibold">No hay contactos con teléfono registrados.</p>
                      ) : (
                        <div className="bg-slate-50 p-3 border border-slate-200 rounded-xl max-h-36 overflow-y-auto space-y-1.5">
                          {availablePhones.map((p, idx) => (
                            <label key={idx} className="flex items-center gap-2.5 text-xs font-semibold text-slate-700 cursor-pointer hover:bg-slate-100/50 py-1 rounded">
                              <input
                                type="checkbox"
                                checked={p.checked}
                                onChange={() => {
                                  // WhatsApp es uno a la vez
                                  setAvailablePhones(prev => prev.map((item, i) => i === idx ? { ...item, checked: !item.checked } : { ...item, checked: false }));
                                }}
                                className="accent-[#468DFF] h-4 w-4"
                              />
                              {p.descripcion}
                            </label>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Ingreso manual */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-slate-600">Número Manual (ej: 5491159969956):</label>
                      <input
                        type="text"
                        placeholder="Código de país + área + número (sin espacios ni guiones)"
                        value={manualPhone}
                        onChange={(e) => setManualPhone(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#468DFF] bg-slate-50/50"
                      />
                    </div>
                  </div>

                  {/* Acciones WhatsApp */}
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
                      disabled={whatsappLoading}
                      onClick={handleSendWhatsApp}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg cursor-pointer transition-all flex items-center gap-1.5 shadow-md shadow-green-500/10 disabled:bg-slate-400"
                    >
                      {whatsappLoading ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <MessageCircle className="h-3.5 w-3.5" />
                      )}
                      Enviar por WhatsApp
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        )}

        {/* Modal de Alerta Global */}
        {modalAlert.show && (
          <div className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
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

        {/* Toast Notificación removido - consumido globalmente */}
        <AppFormNavigator
          activeList={filteredAvisos}
          currentId={editingId}
          onNavigate={(newAviso) => handleEdit(newAviso)}
          hasUnsavedChanges={checkHasUnsavedChanges()}
          isFormOpen={view === 'form'}
        />

      </main>
    </div>
  );
}
