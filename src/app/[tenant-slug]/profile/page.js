// src/app/[tenant-slug]/profile/page.js
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import ImageUploadZone from '@/components/ui/ImageUploadZone';
import { supabase, fetchAllGeography } from '@/lib/supabase';
import { formatDate, formatAsDateInput, convertToDbDate, getEffectivePlan, PLAN_FEATURES } from '@/lib/utils';
import { useToast } from '@/components/providers/ToastProvider';
import AppPageHeader from '@/components/ui/AppPageHeader';
import AppButton from '@/components/ui/AppButton';
import AppInput from '@/components/ui/AppInput';
import AppSelect from '@/components/ui/AppSelect';
import AppCard from '@/components/ui/AppCard';
import AppConfirmDialog from '@/components/ui/AppConfirmDialog';
import AppDestructiveConfirmDialog from '@/components/ui/AppDestructiveConfirmDialog';
import AppUnsavedChangesDialog from '@/components/ui/AppUnsavedChangesDialog';
import {
  User, 
  Briefcase, 
  Building, 
  Globe, 
  CheckCircle2, 
  Upload, 
  ImageIcon, 
  FileText, 
  Loader2, 
  Sparkles,
  Phone,
  Hash,
  AlertTriangle,
  Award,
  Mail,
  Calendar,
  X,
  CheckCircle,
  ArrowLeft,
  PlusCircle,
  Lock,
  Eye,
  EyeOff,
  Menu,
  ClipboardList,
  ChevronLeft,
  ChevronRight,
  Users,
  Settings,
  LogOut,
  GraduationCap,
  Flame,
  ClipboardCheck,
  Folder
} from 'lucide-react';
import confetti from 'canvas-confetti';

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

export default function ProfilePage({ params }) {
  const tenantSlug = params['tenant-slug'];
  
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('user-profile');
    }
    window.location.href = '/login';
  };

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isDevMode, setIsDevMode] = useState(false);
  
  // Datos de Usuario y Empresa
  const [currentUser, setCurrentUser] = useState(null);
  const [profileData, setProfileData] = useState(null);
  const [tenantData, setTenantData] = useState(null);
  const [initialValues, setInitialValues] = useState(null);

  // Toasts y Diálogos accesibles Radix
  const globalToast = useToast();
  const triggerToast = (message, type = 'success') => {
    globalToast.toast(message, type);
  };

  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmDialogConfig, setConfirmDialogConfig] = useState({ title: '', description: '', type: 'info', onConfirm: null, confirmText: 'Confirmar' });

  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);

  const [showUnsavedChangesDialog, setShowUnsavedChangesDialog] = useState(false);
  const [unsavedChangesConfig, setUnsavedChangesConfig] = useState({ onLeave: null });

  const showAlert = (title, message, type = 'info', onConfirm = null, confirmText = 'Confirmar') => {
    setConfirmDialogConfig({
      title,
      description: message,
      type,
      onConfirm,
      confirmText
    });
    setShowConfirmDialog(true);
  };

  // Campos Obligatorios
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [cuit, setCuit] = useState('');
  const [cuitError, setCuitError] = useState('');
  const [provincia, setProvincia] = useState('');
const [partido, setPartido] = useState('');
const [partidosList, setPartidosList] = useState([]);
  const [localidad, setLocalidad] = useState('');
  const [localidadesList, setLocalidadesList] = useState([]);
  const [birthDate, setBirthDate] = useState('');

  // Campos Opcionales - Matrículas Profesionales (Múltiples)
  const [matriculas, setMatriculas] = useState([
    {
      id: null,
      institucion: '',
      numero: '',
      vencimiento: '',
      fotoFrente: null,
      fotoFrentePreview: '',
      fotoDorso: null,
      fotoDorsoPreview: ''
    }
  ]);

  // Campos Opcionales - Firma e Identidad de Empresa
  const [companyName, setCompanyName] = useState('');
  const [fotoFirma, setFotoFirma] = useState(null);
  const [fotoFirmaPreview, setFotoFirmaPreview] = useState('');
  const [signaturePath, setSignaturePath] = useState('');
  const [logo1, setLogo1] = useState(null);
  const [logo1Preview, setLogo1Preview] = useState('');
  const [logo2, setLogo2] = useState(null);
  const [logo2Preview, setLogo2Preview] = useState('');

  // Cambio de contraseña
  const [currentPassword, setCurrentPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passLoading, setPassLoading] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Eliminación de cuenta
  const [deletePassword, setDeletePassword] = useState('');
  const [showDeletePassword, setShowDeletePassword] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Campos Opcionales - Sitio Web y Redes Sociales de la Empresa
  const [website, setWebsite] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [instagram, setInstagram] = useState('');
  const [facebook, setFacebook] = useState('');
  const [tiktok, setTiktok] = useState('');
  const [youtube, setYoutube] = useState('');

  // Plan
  const [selectedPlan, setSelectedPlan] = useState('free');
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showDeleteSection, setShowDeleteSection] = useState(false);

  // Efecto para abrir el modal si viene desde una redirección por falta de plan
  useEffect(() => {
    if (!initialLoading && typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('upgrade') === 'true') {
        setShowPlanModal(true);
        const section = params.get('section');
        const sectionNames = {
          'extintores': 'Control de Extintores',
          'control-electrico': 'Control Eléctrico',
          'visitas': 'Constancia de Visita',
          'avisos': 'Aviso de Riesgo',
          'checklist-personalizados': 'Checklist Personalizados',
          'legajo': 'Legajo Técnico',
          'portal-clientes': 'Portal de Clientes'
        };
        const sectionName = sectionNames[section] || 'la sección solicitada';
        setTimeout(() => {
          triggerToast(`Tu plan actual no incluye acceso a ${sectionName}. Selecciona un plan superior para habilitarla.`, 'info');
        }, 500);
      }
    }
  }, [initialLoading]);

  // Manejar redireccionamiento a checkout de Mercado Pago para cambiar de plan
  const handleUpgradePlan = async (planId) => {
    if (planId === tenantData?.plan_id) {
      triggerToast('Tu organización ya tiene este plan contratado.', 'info');
      setShowPlanModal(false);
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          planId,
          tenantId: tenantData?.id
        })
      });
      
      const data = await response.json();
      if (!response.ok || data.error) {
        console.error('[Checkout API Error Completo]:', data);
        throw new Error(data.message || data.error || 'Fallo al procesar el checkout de Mercado Pago. Intente de nuevo.');
      }
      
      if (data.initPoint) {
        triggerToast('Redirigiendo a la pasarela de pagos seguros de Mercado Pago...', 'info');
        setTimeout(() => {
          window.location.href = data.initPoint;
        }, 1000);
      } else {
        throw new Error('No se recibió la URL de pago de la pasarela.');
      }
    } catch (err) {
      console.error('Error al iniciar el checkout de plan:', err);
      triggerToast(err.message || 'Error al conectar con la pasarela de pagos. Intente de nuevo.', 'error');
      setLoading(false);
    }
  };

  const getSignedUrl = async (bucket, pathOrUrl) => {
    if (!pathOrUrl || pathOrUrl === 'N/A') return '';
    if (pathOrUrl.startsWith('data:') || pathOrUrl.startsWith('blob:') || pathOrUrl.startsWith('http://localhost') || pathOrUrl.includes('placeholder')) {
      return pathOrUrl;
    }
    
    let path = pathOrUrl;
    if (pathOrUrl.includes('/storage/v1/object/')) {
      const parts = pathOrUrl.split(`/storage/v1/object/public/${bucket}/`);
      if (parts.length > 1) {
        path = parts[1];
      } else {
        const partsAuthenticated = pathOrUrl.split(`/storage/v1/object/authenticated/${bucket}/`);
        if (partsAuthenticated.length > 1) {
          path = partsAuthenticated[1];
        }
      }
    }
    
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, 3600, { download: false });
      if (error) throw error;
      return data.signedUrl;
    } catch (err) {
      console.error('Error generating signed URL for:', bucket, path, err);
      return pathOrUrl;
    }
  };

  useEffect(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('placeholder')) {
      setIsDevMode(true);
      setTenantData({ name: 'Consultora de Prueba', plan_id: 'basic_5' });
      setProfileData({ full_name: 'Profesional de SySO (Mock)', role: 'admin' });
      setInitialLoading(false);
    }

    const loadProfileAndTenant = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          window.location.href = '/login';
          return;
        }
        setCurrentUser(user);

        // Cargar Perfil
        const { data: profile, error: pErr } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (pErr) throw pErr;
        setProfileData(profile);
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('user-profile', JSON.stringify(profile));
        }

        // Pre-cargar inputs de perfil
        setFullName(profile.full_name || '');
        setEmail(profile.email || '');
        setPhone(profile.phone || '');
        setCuit(profile.cuit || '');
        setProvincia(profile.provincia || '');
        setPartido(profile.departamento_partido || '');
        setLocalidad(profile.localidad || '');
        setBirthDate(formatDate(profile.birth_date) || '');
        
        const signatureSignedUrl = profile.signature_url ? await getSignedUrl('signatures', profile.signature_url) : '';
        setFotoFirmaPreview(signatureSignedUrl);
        setSignaturePath(profile.signature_url || '');

        // Cargar Matrículas
        let initialMatriculas = [];
        if (isDevMode) {
          initialMatriculas = [
            {
              id: null,
              institucion: profile.matricula_institucion || '',
              numero: profile.matricula_numero || '',
              vencimiento: formatDate(profile.matricula_vencimiento) || '',
              fotoFrentePreview: profile.matricula_foto_frente_url || '',
              fotoDorsoPreview: profile.matricula_foto_dorso_url || '',
              fotoFrentePath: profile.matricula_foto_frente_url || '',
              fotoDorsoPath: profile.matricula_foto_dorso_url || '',
              fotoFrente: null,
              fotoDorso: null
            }
          ];
        } else {
          const { data: matriculasData, error: mErr } = await supabase
            .from('matriculas')
            .select('*')
            .eq('profile_id', user.id)
            .order('created_at');
          
          if (mErr) throw mErr;

          initialMatriculas = matriculasData && matriculasData.length > 0
            ? await Promise.all(matriculasData.map(async m => ({
                id: m.id,
                institucion: m.institucion || '',
                numero: m.numero || '',
                vencimiento: formatDate(m.vencimiento) || '',
                fotoFrentePreview: m.foto_frente_url ? await getSignedUrl('documents', m.foto_frente_url) : '',
                fotoDorsoPreview: m.foto_dorso_url ? await getSignedUrl('documents', m.foto_dorso_url) : '',
                fotoFrentePath: m.foto_frente_url || '',
                fotoDorsoPath: m.foto_dorso_url || '',
                fotoFrente: null,
                fotoDorso: null
              })))
            : [
                {
                  id: null,
                  institucion: '',
                  numero: '',
                  vencimiento: '',
                  fotoFrentePreview: '',
                  fotoDorsoPreview: '',
                  fotoFrentePath: '',
                  fotoDorsoPath: '',
                  fotoFrente: null,
                  fotoDorso: null
                }
              ];
        }
        setMatriculas(initialMatriculas);

        // Cargar Tenant por slug de URL
        const { data: tenant, error: tErr } = await supabase
          .from('tenants')
          .select('*')
          .eq('slug', tenantSlug)
          .single();

        if (tErr || !tenant) {
          if (profile.tenant_id) {
            const { data: homeTen } = await supabase
              .from('tenants')
              .select('slug')
              .eq('id', profile.tenant_id)
              .single();
            if (homeTen) {
              window.location.href = `/${homeTen.slug}/profile`;
              return;
            }
          }
          window.location.href = '/login';
          return;
        }

        // Verificar acceso: ¿Es el owner o es miembro activo con acceso?
        let hasAccess = false;
        if (profile.tenant_id === tenant.id) {
          hasAccess = true;
        } else {
          const { data: member } = await supabase
            .from('miembros_equipo')
            .select('id, tiene_acceso')
            .eq('tenant_id', tenant.id)
            .eq('profile_id', user.id)
            .maybeSingle();

          if (member && member.tiene_acceso) {
            hasAccess = true;
          }
        }

        if (!hasAccess) {
          if (profile.tenant_id) {
            const { data: homeTen } = await supabase
              .from('tenants')
              .select('slug')
              .eq('id', profile.tenant_id)
              .single();
            if (homeTen) {
              window.location.href = `/${homeTen.slug}/profile`;
              return;
            }
          }
          window.location.href = '/login';
          return;
        }

        setTenantData(tenant);

        // Pre-cargar inputs de tenant
        setCompanyName(tenant.name || '');
        setSelectedPlan(tenant.plan_id || 'free');
        setLogo1Preview(tenant.logo_1_url || '');
        setLogo2Preview(tenant.logo_2_url || '');
        setWebsite(tenant.website || '');
        setLinkedin(tenant.social_linkedin || '');
        setInstagram(tenant.social_instagram || '');
        setFacebook(tenant.social_facebook || '');
        setTiktok(tenant.social_tiktok || '');
        setYoutube(tenant.social_youtube || '');

        // Guardar valores iniciales para dirty checking
        setInitialValues({
          fullName: profile.full_name || '',
          phone: profile.phone || '',
          cuit: profile.cuit || '',
          provincia: profile.provincia || '',
          partido: profile.departamento_partido || '',
          localidad: profile.localidad || '',
          birthDate: formatDate(profile.birth_date) || '',
          matriculas: initialMatriculas.map(m => ({
            institucion: m.institucion,
            numero: m.numero,
            vencimiento: m.vencimiento,
            fotoFrentePreview: m.fotoFrentePreview,
            fotoDorsoPreview: m.fotoDorsoPreview
          })),
          companyName: tenant.name || '',
          website: tenant.website || '',
          linkedin: tenant.social_linkedin || '',
          instagram: tenant.social_instagram || '',
          facebook: tenant.social_facebook || '',
          tiktok: tenant.social_tiktok || '',
          youtube: tenant.social_youtube || '',
          planId: tenant.plan_id || 'free'
        });

        setInitialLoading(false);
      } catch (e) {
        console.error('Error al cargar perfil:', e);
        setInitialLoading(false);
        triggerToast('Error al cargar la información del perfil.', 'error');
      }
    };

    if (!isDevMode) {
      loadProfileAndTenant();
    }
  }, [isDevMode]);

  // Manejar cambio de provincia para cargar localidades dinámicamente desde Supabase
  useEffect(() => {
    if (!provincia) {
      setLocalidadesList([]);
      setPartidosList([]);
      setPartido('');
      setLocalidad('');
      return;
    }

    const loadPartidos = async () => {
      try {
        const data = await fetchAllGeography(provincia);
        const uniquePartidos = Array.from(new Set(data.map(item => item.departamento_partido))).sort();
        setPartidosList(uniquePartidos);
      } catch (err) {
        console.error('Error al cargar partidos:', err);
        triggerToast('Error al cargar el listado de partidos.', 'error');
      }
    };

    const loadLocalidades = async () => {
      if (!partido) {
        setLocalidadesList([]);
        setLocalidad('');
        return;
      }
      if (isDevMode) {
        // mock localities based on province and partido for dev mode
        const mockLocalities = provincia === 'BUENOS AIRES'
          ? ['25 DE MAYO', '9 DE JULIO', 'RIVERA', 'CARHUE']
          : ['BALVANERA', 'PALERMO'];
        const sorted = mockLocalities.sort();
        setLocalidadesList(sorted);
        setLocalidad(prev => sorted.includes(prev) ? prev : '');
        return;
      }
      try {
        const data = await fetchAllGeography(provincia, partido);
        if (data) {
          const uniqueLocs = Array.from(new Set(data.map(item => item.localidad_barrio))).sort();
          setLocalidadesList(uniqueLocs);
          setLocalidad(prev => uniqueLocs.includes(prev) ? prev : '');
        }
      } catch (err) {
        console.error('Error al cargar localidades:', err);
        triggerToast('Error al cargar el listado de localidades.', 'error');
      }
    };

    loadPartidos();
    loadLocalidades();
  }, [provincia, partido, isDevMode]);

  const handleCuitChange = (e) => {
    const value = e.target.value;
    const cleaned = value.replace(/[^0-9]/g, '').slice(0, 11);
    setCuit(cleaned);
    
    if (cleaned.length > 0 && cleaned.length < 11) {
      setCuitError('El CUIT debe contener exactamente 11 números enteros.');
    } else {
      setCuitError('');
    }
  };

  const handleImageChange = (fileOrEvent, setFile, setPreview) => {
    const file = fileOrEvent?.target ? fileOrEvent.target.files[0] : fileOrEvent;
    if (!file) return;

    if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
      triggerToast('Por favor, selecciona una imagen en formato JPG o PNG.', 'error');
      return;
    }

    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
    if (file.size > MAX_FILE_SIZE) {
      triggerToast('El archivo no debe superar los 5 MB.', 'error');
      return;
    }

    setFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleAddMatricula = () => {
    setMatriculas(prev => [
      ...prev,
      {
        id: null,
        institucion: '',
        numero: '',
        vencimiento: '',
        fotoFrente: null,
        fotoFrentePreview: '',
        fotoDorso: null,
        fotoDorsoPreview: ''
      }
    ]);
  };

  const handleRemoveMatricula = (index) => {
    setMatriculas(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleMatriculaChange = (index, field, value) => {
    setMatriculas(prev => prev.map((m, idx) => idx === index ? { ...m, [field]: value } : m));
  };

  const handleMatriculaFileChange = (index, fileField, previewField, fileOrEvent) => {
    const file = fileOrEvent?.target ? fileOrEvent.target.files[0] : fileOrEvent;
    if (!file) return;

    if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
      triggerToast('Por favor, selecciona una imagen en formato JPG o PNG.', 'error');
      return;
    }

    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
    if (file.size > MAX_FILE_SIZE) {
      triggerToast('El archivo no debe superar los 5 MB.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setMatriculas(prev => prev.map((m, idx) => idx === index ? { ...m, [fileField]: file, [previewField]: reader.result } : m));
    };
    reader.readAsDataURL(file);
  };

  const handleMatriculaFileClear = (index, type) => {
    setMatriculas(prev => prev.map((m, idx) => {
      if (idx === index) {
        if (type === 'Frente') {
          return { ...m, fotoFrente: null, fotoFrentePreview: '' };
        } else {
          return { ...m, fotoDorso: null, fotoDorsoPreview: '' };
        }
      }
      return m;
    }));
  };

  const uploadFileToStorage = async (bucket, path, file) => {
    if (isDevMode) return `https://placeholder-storage.com/${bucket}/${path}`;
    
    const { data, error: uploadErr } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        upsert: true,
        cacheControl: '3600',
      });

    if (uploadErr) throw uploadErr;

    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);

    return publicUrl;
  };

  const handleSaveChanges = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Validar obligatorios (localidad es opcional)
    if (!fullName || !email || !phone || !cuit || !provincia || !partido || !birthDate) {
      triggerToast('Por favor completa todos los campos obligatorios (*).', 'error');
      setLoading(false);
      return;
    }

    if (cuit.length !== 11) {
      triggerToast('El CUIT debe contener exactamente 11 números.', 'error');
      setLoading(false);
      return;
    }

    const userId = currentUser?.id || 'd290f1ee-6c54-4b01-90e6-d701748f0851';
    const tenantId = profileData?.tenant_id;

    if (isDevMode) {
      console.log('Simulando guardado en desarrollo...');
      setTimeout(() => {
        setLoading(false);
        triggerToast('¡Datos guardados con éxito en la simulación!', 'success');
        setInitialValues({
          fullName,
          phone,
          cuit,
          provincia,
          partido,
          localidad,
          birthDate,
          matriculas: matriculas.map(m => ({
            institucion: m.institucion,
            numero: m.numero,
            vencimiento: m.vencimiento,
            fotoFrentePreview: m.fotoFrentePreview,
            fotoDorsoPreview: m.fotoDorsoPreview
          })),
          companyName,
          website,
          linkedin,
          instagram,
          facebook,
          tiktok,
          youtube,
          planId: selectedPlan
        });
      }, 1500);
      return;
    }

    try {
      // 1. Subir archivos de matrículas
      const updatedMatriculas = await Promise.all(
        matriculas.map(async (m, idx) => {
          let frenteUrl = m.fotoFrentePath || '';
          let dorsoUrl = m.fotoDorsoPath || '';

          if (m.fotoFrente) {
            const ext = m.fotoFrente.name.split('.').pop();
            frenteUrl = await uploadFileToStorage('documents', `${userId}/matricula_${idx}_frente_${Date.now()}.${ext}`, m.fotoFrente);
          }

          if (m.fotoDorso) {
            const ext = m.fotoDorso.name.split('.').pop();
            dorsoUrl = await uploadFileToStorage('documents', `${userId}/matricula_${idx}_dorso_${Date.now()}.${ext}`, m.fotoDorso);
          }

          // If preview was cleared, empty the path
          if (!m.fotoFrentePreview) frenteUrl = '';
          if (!m.fotoDorsoPreview) dorsoUrl = '';

          return {
            ...m,
            fotoFrentePreview: frenteUrl,
            fotoDorsoPreview: dorsoUrl,
            fotoFrentePath: frenteUrl,
            fotoDorsoPath: dorsoUrl
          };
        })
      );

      // Subir firma y logos
      let signatureUrl = signaturePath || '';
      let logo1Url = tenantData?.logo_1_url || '';
      let logo2Url = tenantData?.logo_2_url || '';

      const uploadPromises = [];
      const uploadKeys = [];

      if (fotoFirma) {
        const ext = fotoFirma.name.split('.').pop();
        uploadPromises.push(uploadFileToStorage('signatures', `${userId}/firma_${Date.now()}.${ext}`, fotoFirma));
        uploadKeys.push('signature');
      }

      if (logo1 && tenantId) {
        const ext = logo1.name.split('.').pop();
        uploadPromises.push(uploadFileToStorage('logos', `${tenantId}/logo1_${Date.now()}.${ext}`, logo1));
        uploadKeys.push('logo1');
      }

      if (logo2 && tenantId) {
        const ext = logo2.name.split('.').pop();
        uploadPromises.push(uploadFileToStorage('logos', `${tenantId}/logo2_${Date.now()}.${ext}`, logo2));
        uploadKeys.push('logo2');
      }

      if (uploadPromises.length > 0) {
        const uploadUrls = await Promise.all(uploadPromises);
        uploadKeys.forEach((key, idx) => {
          if (key === 'signature') signatureUrl = uploadUrls[idx];
          if (key === 'logo1') logo1Url = uploadUrls[idx];
          if (key === 'logo2') logo2Url = uploadUrls[idx];
        });
      }

      // If preview was cleared, empty the path
      if (!fotoFirmaPreview) signatureUrl = '';
      if (!logo1Preview) logo1Url = '';
      if (!logo2Preview) logo2Url = '';

      // 2. Actualizar Tenant
      if (tenantId && profileData?.role === 'admin') {
        const { error: tenantErr } = await supabase
          .from('tenants')
          .update({
            name: companyName || `${fullName} Consultora`,
            logo_1_url: logo1Url,
            logo_2_url: logo2Url,
            website: website || null,
            social_linkedin: linkedin || null,
            social_instagram: instagram || null,
            social_facebook: facebook || null,
            social_tiktok: tiktok || null,
            social_youtube: youtube || null,
          })
          .eq('id', tenantId);

        if (tenantErr) throw tenantErr;
      }

      // 3. Actualizar Perfil (Fallback de la primera matrícula para retrocompatibilidad)
      const firstMatricula = updatedMatriculas[0] || {};
      const { error: profileErr } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          phone: phone,
          cuit: cuit,
          provincia: provincia,
          departamento_partido: partido,
          localidad: localidad,
          birth_date: convertToDbDate(birthDate) || null,
          signature_url: signatureUrl,
          matricula_institucion: firstMatricula.institucion || null,
          matricula_numero: firstMatricula.numero || null,
          matricula_vencimiento: convertToDbDate(firstMatricula.vencimiento) || null,
          matricula_foto_frente_url: firstMatricula.fotoFrentePreview || null,
          matricula_foto_dorso_url: firstMatricula.fotoDorsoPreview || null,
        })
        .eq('id', userId);

      if (profileErr) throw profileErr;
      
      if (typeof window !== 'undefined') {
        const cached = sessionStorage.getItem('user-profile');
        const parsed = cached ? JSON.parse(cached) : {};
        sessionStorage.setItem('user-profile', JSON.stringify({
          ...parsed,
          full_name: fullName,
          phone: phone,
          cuit: cuit,
          provincia: provincia,
          departamento_partido: partido,
          localidad: localidad,
          birth_date: convertToDbDate(birthDate) || null,
          signature_url: signatureUrl
        }));
      }

      // 4. Actualizar listado de Matrículas
      const { error: deleteErr } = await supabase
        .from('matriculas')
        .delete()
        .eq('profile_id', userId);

      if (deleteErr) throw deleteErr;

      const toInsert = updatedMatriculas
        .filter(m => m.numero.trim() !== '' || m.institucion.trim() !== '')
        .map(m => ({
          profile_id: userId,
          institucion: m.institucion,
          numero: m.numero,
          vencimiento: convertToDbDate(m.vencimiento) || null,
          foto_frente_url: m.fotoFrentePreview || null,
          foto_dorso_url: m.fotoDorsoPreview || null
        }));

      if (toInsert.length > 0) {
        const { error: insertErr } = await supabase
          .from('matriculas')
          .insert(toInsert);

        if (insertErr) throw insertErr;
      }

      setLoading(false);
      triggerToast('¡Datos guardados con éxito en Supabase!', 'success');
      
      // Resolve signed URLs for updated paths
      const signedSignature = signatureUrl ? await getSignedUrl('signatures', signatureUrl) : '';
      setFotoFirmaPreview(signedSignature);
      setSignaturePath(signatureUrl);

      const finalMatriculas = await Promise.all(updatedMatriculas.map(async m => ({
        ...m,
        fotoFrente: null,
        fotoDorso: null,
        fotoFrentePreview: m.fotoFrentePath ? await getSignedUrl('documents', m.fotoFrentePath) : '',
        fotoDorsoPreview: m.fotoDorsoPath ? await getSignedUrl('documents', m.fotoDorsoPath) : '',
      })));
      setMatriculas(finalMatriculas);

      setFotoFirma(null);
      setLogo1(null);
      setLogo2(null);

      // Sincronizar previews con URLs finales cargadas
      setLogo1Preview(logo1Url);
      setLogo2Preview(logo2Url);

      // Actualizar valores iniciales para evitar falsas advertencias de dirty check
      setInitialValues({
        fullName,
        phone,
        cuit,
        provincia,
        partido,
        localidad,
        birthDate,
        matriculas: finalMatriculas.map(m => ({
          institucion: m.institucion,
          numero: m.numero,
          vencimiento: m.vencimiento,
          fotoFrentePreview: m.fotoFrentePreview,
          fotoDorsoPreview: m.fotoDorsoPreview
        })),
        companyName,
        website,
        linkedin,
        instagram,
        facebook,
        tiktok,
        youtube,
        planId: selectedPlan
      });

    } catch (err) {
      triggerToast(err.message || 'Error al actualizar tus datos.', 'error');
      setLoading(false);
    }
  };

  const handleExitWithoutSave = () => {
    setUnsavedChangesConfig({
      onLeave: () => {
        window.location.href = `/${tenantSlug}/dashboard`;
      }
    });
    setShowUnsavedChangesDialog(true);
  };

  const handleSidebarNavigation = (e, path) => {
    if (path.endsWith('/profile')) return;

    // Verificar si las matriculas cambiaron
    const areMatriculasEqual = (a, b) => {
      if (!a || !b || a.length !== b.length) return false;
      for (let i = 0; i < a.length; i++) {
        if (
          a[i].institucion !== b[i].institucion ||
          a[i].numero !== b[i].numero ||
          a[i].vencimiento !== b[i].vencimiento ||
          a[i].fotoFrentePreview !== b[i].fotoFrentePreview ||
          a[i].fotoDorsoPreview !== b[i].fotoDorsoPreview
        ) return false;
      }
      return true;
    };

    // Verificar si el formulario está sucio
    const isDirty = 
      fullName !== (initialValues?.fullName || '') ||
      phone !== (initialValues?.phone || '') ||
      cuit !== (initialValues?.cuit || '') ||
      provincia !== (initialValues?.provincia || '') ||
      partido !== (initialValues?.partido || '') ||
      localidad !== (initialValues?.localidad || '') ||
      birthDate !== (initialValues?.birthDate || '') ||
      !areMatriculasEqual(
        matriculas.map(m => ({
          institucion: m.institucion,
          numero: m.numero,
          vencimiento: m.vencimiento,
          fotoFrentePreview: m.fotoFrentePreview,
          fotoDorsoPreview: m.fotoDorsoPreview
        })),
        initialValues?.matriculas
      ) ||
      companyName !== (initialValues?.companyName || '') ||
      website !== (initialValues?.website || '') ||
      linkedin !== (initialValues?.linkedin || '') ||
      instagram !== (initialValues?.instagram || '') ||
      facebook !== (initialValues?.facebook || '') ||
      tiktok !== (initialValues?.tiktok || '') ||
      youtube !== (initialValues?.youtube || '') ||
      selectedPlan !== (initialValues?.planId || 'free') ||
      matriculas.some(m => m.fotoFrente !== null || m.fotoDorso !== null) ||
      fotoFirma !== null ||
      logo1 !== null ||
      logo2 !== null;

    if (isDirty) {
      e.preventDefault();
      setModalAlert({
        show: true,
        title: 'Salir sin guardar',
        message: '¿Estás seguro de que deseas salir? Los cambios no guardados se perderán.',
        confirmText: 'Confirmar',
        onConfirm: () => {
          closeAlert();
          window.location.href = path;
        }
      });
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      triggerToast('Por favor completa todos los campos de contraseña.', 'error');
      return;
    }

    const isStrongPassword = (pwd) => {
      if (pwd.length < 8) return false;
      if (!/[A-Z]/.test(pwd)) return false;
      if (!/[0-9]/.test(pwd)) return false;
      return true;
    };

    if (!isStrongPassword(newPassword)) {
      triggerToast('La contraseña debe tener al menos 8 caracteres, incluir al menos una letra mayúscula y al menos un número.', 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      triggerToast('Las contraseñas no coinciden.', 'error');
      return;
    }

    setPassLoading(true);
    try {
      // Verificar la contraseña actual firmando al usuario de nuevo
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: email, // El email del usuario actual cargado del perfil
        password: currentPassword
      });

      if (signInErr) {
        triggerToast('La contraseña actual ingresada es incorrecta.', 'error');
        setPassLoading(false);
        return;
      }

      // Proceder a actualizar la contraseña
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      
      triggerToast('¡Contraseña actualizada con éxito!', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      console.error('Error al actualizar contraseña:', err);
      triggerToast(err.message || 'Error al actualizar la contraseña.', 'error');
    } finally {
      setPassLoading(false);
    }
  };

  const handleDeleteAccount = () => {
    if (!deletePassword) {
      triggerToast('Por favor, ingresá tu contraseña para confirmar.', 'error');
      return;
    }
    setShowDeleteConfirmDialog(true);
  };

  const executeDeleteAccount = async () => {
    setDeleteLoading(true);
    try {
      // 1. Re-autenticar al usuario para validar su contraseña
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email,
        password: deletePassword,
      });

      if (authError) {
        throw new Error('La contraseña ingresada es incorrecta.');
      }

      // 2. Llamar a la función RPC delete_own_account
      const { error: rpcError } = await supabase.rpc('delete_own_account');
      if (rpcError) {
        console.error('RPC Error:', rpcError);
        throw new Error('No se pudo procesar la eliminación de la cuenta. Intente de nuevo.');
      }

      // 3. Cerrar sesión local
      await supabase.auth.signOut();
      localStorage.clear();

      triggerToast('Tu cuenta ha sido eliminada correctamente.');
      setTimeout(() => {
        window.location.href = '/login';
      }, 1500);
    } catch (err) {
      console.error('Error deleting account:', err);
      // Sanitizar el error técnico
      const friendlyMsg = err.message && (err.message.includes('Database') || err.message.includes('policy') || err.message.includes('security'))
        ? 'Error interno del servidor. Por favor, reintente en unos minutos.'
        : err.message || 'Error al eliminar la cuenta.';
      triggerToast(friendlyMsg, 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="h-screen overflow-hidden bg-syso-bg text-slate-700 flex font-sans">
      
      {/* Sidebar (Desktop & Mobile) */}
      <Sidebar
        tenantSlug={tenantSlug}
        profile={profileData}
        currentSection="profile"
        isSidebarCollapsed={isSidebarCollapsed}
        toggleSidebar={toggleSidebar}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
        handleLogout={handleLogout}
        onNavigate={handleSidebarNavigation}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto overflow-x-hidden relative py-0 px-0">
        {/* Background gradients */}
        <div className="absolute top-[-10%] left-[-20%] w-[600px] h-[600px] rounded-full bg-[#468DFF]/5 blur-[150px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-20%] w-[600px] h-[600px] rounded-full bg-[#0511F2]/5 blur-[150px] pointer-events-none" />

        {/* Navbar */}
        <AppPageHeader
          title="Editar Perfil"
          icon={Settings}
          tenantName={tenantData?.name || 'Cargando...'}
          planId={tenantData?.plan_id}
          showPlanBadge={profileData && profileData.role !== 'cliente'}
          setIsMobileMenuOpen={setIsMobileMenuOpen}
        />

        {initialLoading ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center space-y-4">
              <Loader2 className="h-10 w-10 animate-spin text-[#468DFF] mx-auto" />
              <p className="text-xs text-slate-500 font-medium">Cargando datos del perfil...</p>
            </div>
          </div>
        ) : (
          <div className="py-6 px-4 md:px-0 space-y-6 max-w-[95%] mx-auto w-full z-10">
        
        <form onSubmit={handleSaveChanges} className="space-y-6">
          
          {/* SECCIÓN 1: INFORMACIÓN DEL USUARIO */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 md:p-6 shadow-sm space-y-5">
            <h3 className="font-outfit text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-2 uppercase tracking-wider">
              <User className="text-[#468DFF] h-4 w-4" />
              Información del usuario
            </h3>

            <fieldset disabled={profileData?.role === 'cliente'} className="space-y-5">

            {/* Datos Personales */}
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Nombre y Apellido <span className="text-[#468DFF]">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Juan Pérez"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  autoComplete="off"
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all text-slate-700"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Correo Electrónico <span className="text-[#468DFF]">*</span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <Mail className="h-4 w-4" />
                  </span>
                  <input
                    type="email"
                    required
                    value={email}
                    autoComplete="username"
                    className="w-full border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-sm bg-slate-100 text-slate-500 outline-none cursor-not-allowed focus:outline-none"
                    disabled
                  />
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  CUIT <span className="text-[#468DFF]">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="20443332225"
                  value={cuit}
                  onChange={handleCuitChange}
                  autoComplete="off"
                  className={`w-full border ${cuitError ? 'border-red-400 focus:border-red-500' : 'border-slate-200 focus:border-[#468DFF]'} rounded-xl px-3.5 py-2 text-sm focus:outline-none bg-slate-50/50 transition-all text-slate-700`}
                />
                {cuitError && (
                  <span className="text-[10px] text-red-600 mt-1 block font-semibold">{cuitError}</span>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Teléfono <span className="text-[#468DFF]">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="1165432109"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  autoComplete="off"
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all text-slate-700"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Fecha de Nacimiento <span className="text-[#468DFF]">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="DD/MM/YYYY"
                    maxLength={10}
                    value={birthDate}
                    onChange={(e) => setBirthDate(formatAsDateInput(e.target.value))}
                    className="w-full border border-slate-200 rounded-xl pl-3.5 pr-10 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all font-mono text-slate-700"
                    disabled={profileData?.role === 'cliente'}
                  />
                  {profileData?.role !== 'cliente' && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-slate-400 hover:text-[#468DFF] flex items-center" onClick={(e) => e.stopPropagation()}>
                      <Calendar className="h-4 w-4" />
                      <input
                        type="date"
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val) {
                            const parts = val.split('-');
                            if (parts.length === 3) {
                              setBirthDate(`${parts[2]}/${parts[1]}/${parts[0]}`);
                            }
                          }
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Provincia <span className="text-[#468DFF]">*</span>
                </label>
                <select
                  required
                  value={provincia}
                  onChange={(e) => {
                    setProvincia(e.target.value);
                    setPartido('');
                    setLocalidad('');
                  }}
                  className="w-full max-w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all text-slate-700 cursor-pointer"
                >
                  <option value="" disabled>Selecciona una provincia</option>
                  {PROVINCIAS_ARGENTINAS.map((prov) => (
                    <option key={prov} value={prov}>
                      {prov}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Partido <span className="text-[#468DFF]">*</span>
                </label>
                <select
                  required
                  disabled={!provincia || partidosList.length === 0}
                  value={partido}
                  onChange={(e) => {
                    setPartido(e.target.value);
                    setLocalidad('');
                  }}
                  className="w-full max-w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all text-slate-700 cursor-pointer disabled:opacity-50"
                >
                  <option value="" disabled>{!provincia ? 'Primero selecciona una provincia' : 'Selecciona un partido'}</option>
                  {partidosList.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Localidad (Opcional)
                </label>
                <select
                  disabled={!partido || localidadesList.length === 0}
                  value={localidad}
                  onChange={(e) => setLocalidad(e.target.value)}
                  className="w-full max-w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all text-slate-700 cursor-pointer disabled:opacity-50"
                >
                  <option value="">
                    {!partido ? 'Primero selecciona un partido' : 'Selecciona una localidad (opcional)'}
                  </option>
                  {localidadesList.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            </fieldset>

            {/* Matrículas Profesionales */}
            {profileData?.role !== 'cliente' && (
              <div className="pt-4 border-t border-slate-200 space-y-6">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Briefcase className="h-4 w-4 text-[#468DFF]" />
                Matrículas Profesionales
              </h4>

              {matriculas.map((m, index) => (
                <div key={index} className="p-6 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-6 relative">
                  {matriculas.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveMatricula(index)}
                      className="absolute top-4 right-4 text-xs font-bold text-red-600 hover:text-red-800 flex items-center gap-1 bg-red-50 hover:bg-red-100 py-1.5 px-3 rounded-lg border border-red-200 transition-colors"
                    >
                      <X className="h-3 w-3" />
                      Eliminar Matrícula
                    </button>
                  )}
                  
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Colegio o Institución Emisora
                    </label>
                    <input
                      type="text"
                      placeholder="COPIME, CPSH..."
                      value={m.institucion}
                      onChange={(e) => handleMatriculaChange(index, 'institucion', e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all text-slate-700"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                        Número
                      </label>
                      <input
                        type="text"
                        placeholder="L000000"
                        value={m.numero}
                        onChange={(e) => handleMatriculaChange(index, 'numero', e.target.value)}
                        autoComplete="off"
                        className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all text-slate-700"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                        Vencimiento
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="DD/MM/YYYY"
                          maxLength={10}
                          value={m.vencimiento}
                          onChange={(e) => handleMatriculaChange(index, 'vencimiento', formatAsDateInput(e.target.value))}
                          className="w-full border border-slate-200 rounded-xl pl-3.5 pr-10 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all font-mono text-slate-700"
                          disabled={profileData?.role === 'cliente'}
                        />
                        {profileData?.role !== 'cliente' && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-slate-400 hover:text-[#468DFF] flex items-center" onClick={(e) => e.stopPropagation()}>
                            <Calendar className="h-4 w-4" />
                            <input
                              type="date"
                              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val) {
                                  const parts = val.split('-');
                                  if (parts.length === 3) {
                                    handleMatriculaChange(index, 'vencimiento', `${parts[2]}/${parts[1]}/${parts[0]}`);
                                  }
                                }
                              }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Uploads de la matrícula actual */}
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="flex flex-col justify-center">
                      <div className="w-full">
                        <ImageUploadZone
                          label={`Foto Frente Matrícula #${index + 1}`}
                          preview={m.fotoFrentePreview}
                          onFileChange={(file) => handleMatriculaFileChange(index, 'fotoFrente', 'fotoFrentePreview', file)}
                          onClear={() => handleMatriculaFileClear(index, 'Frente')}
                          disabled={profileData?.role === 'cliente'}
                          maxSizeMB={5}
                          onToast={triggerToast}
                        />
                      </div>
                    </div>

                    <div className="flex flex-col justify-center">
                      <div className="w-full">
                        <ImageUploadZone
                          label={`Foto Dorso Matrícula #${index + 1}`}
                          preview={m.fotoDorsoPreview}
                          onFileChange={(file) => handleMatriculaFileChange(index, 'fotoDorso', 'fotoDorsoPreview', file)}
                          onClear={() => handleMatriculaFileClear(index, 'Dorso')}
                          disabled={profileData?.role === 'cliente'}
                          maxSizeMB={5}
                          onToast={triggerToast}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleAddMatricula}
                  className="py-2.5 px-4 rounded-xl border border-[#468DFF]/40 hover:bg-[#468DFF] hover:text-white text-[#468DFF] font-bold text-xs transition-all flex items-center gap-2 active:scale-[0.98] cursor-pointer"
                >
                  <PlusCircle className="h-4 w-4" />
                  Agregar otra matrícula
                </button>
              </div>

              {/* Firma Digital (Separada de las matrículas en su propia sección) */}
              <div className="pt-5 border-t border-slate-100 space-y-4">
                <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="h-4 w-4 text-[#468DFF]" />
                  Firma Digital
                </h4>
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="md:col-span-1 flex flex-col justify-center">
                    <div className="w-full">
                      <ImageUploadZone
                        label="Firma Digital (Imagen)"
                        preview={fotoFirmaPreview}
                        onFileChange={(file) => handleImageChange(file, setFotoFirma, setFotoFirmaPreview)}
                        onClear={() => {
                          setFotoFirma(null);
                          setFotoFirmaPreview('');
                        }}
                        disabled={profileData?.role === 'cliente'}
                        maxSizeMB={5}
                        onToast={triggerToast}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          </div>

          {/* SECCIÓN: SEGURIDAD (CAMBIAR CONTRASEÑA) */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 md:p-6 shadow-sm space-y-5">
            <h3 className="font-outfit text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-2 uppercase tracking-wider">
              <Lock className="text-[#468DFF] h-4 w-4" />
              Seguridad (Cambiar Contraseña)
            </h3>
            
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Contraseña Actual
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    placeholder="Contraseña actual"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    autoComplete="current-password"
                    className="w-full border border-slate-200 rounded-xl py-2 pl-3.5 pr-12 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all text-slate-700"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Nueva Contraseña
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    placeholder="Mínimo 8 caracteres, 1 mayúscula y 1 número"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoComplete="new-password"
                    className="w-full border border-slate-200 rounded-xl py-2 pl-3.5 pr-12 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all text-slate-700"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Debe tener al menos 8 caracteres, incluir al menos una letra mayúscula y al menos un número.
                </p>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Confirmar Nueva Contraseña
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Repetir contraseña"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    className="w-full border border-slate-200 rounded-xl py-2 pl-3.5 pr-12 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all text-slate-700"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Debe tener al menos 8 caracteres, incluir al menos una letra mayúscula y al menos un número.
                </p>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleChangePassword}
                disabled={passLoading}
                className="py-2.5 px-6 rounded-xl border border-[#468DFF] hover:bg-[#468DFF] hover:text-white text-[#468DFF] font-bold text-xs transition-all flex items-center gap-2 active:scale-[0.98] disabled:opacity-50 cursor-pointer"
              >
                {passLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Actualizando...
                  </>
                ) : (
                  'Actualizar Contraseña'
                )}
              </button>
            </div>
          </div>

          {profileData?.role === 'admin' && (
            <>
              {/* SECCIÓN 2: IDENTIDAD DE LA EMPRESA */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 md:p-6 shadow-sm space-y-5">
            <h3 className="font-outfit text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-2 uppercase tracking-wider">
              <Building className="text-[#468DFF] h-4 w-4" />
              Identidad de la empresa
            </h3>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Nombre de Empresa o Consultora
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all text-slate-700"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Página Web de la Empresa
                </label>
                <input
                  type="url"
                  placeholder="https://miweb.com"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all text-slate-700"
                />
              </div>
            </div>

            {/* Redes */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Redes Sociales de la Empresa</h4>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">LinkedIn</label>
                  <input
                    type="url"
                    value={linkedin}
                    onChange={(e) => setLinkedin(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all text-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Instagram</label>
                  <input
                    type="url"
                    value={instagram}
                    onChange={(e) => setInstagram(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all text-slate-700"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Facebook</label>
                  <input
                    type="url"
                    value={facebook}
                    onChange={(e) => setFacebook(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all text-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">TikTok</label>
                  <input
                    type="url"
                    value={tiktok}
                    onChange={(e) => setTiktok(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all text-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">YouTube</label>
                  <input
                    type="url"
                    value={youtube}
                    onChange={(e) => setYoutube(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all text-slate-700"
                  />
                </div>
              </div>
            </div>

            {/* Logos */}
            <div className="grid md:grid-cols-2 gap-6 pt-4">
              <div className="flex flex-col justify-center">
                <div className="w-full">
                  <ImageUploadZone
                    label="Logo Principal (Logo 1)"
                    preview={logo1Preview}
                    onFileChange={(file) => handleImageChange(file, setLogo1, setLogo1Preview)}
                    onClear={() => {
                      setLogo1(null);
                      setLogo1Preview('');
                    }}
                    disabled={profileData?.role === 'cliente'}
                    maxSizeMB={5}
                    onToast={triggerToast}
                  />
                </div>
              </div>

              <div className="flex flex-col justify-center">
                <div className="w-full">
                  <ImageUploadZone
                    label="Logo Secundario (Logo 2)"
                    preview={logo2Preview}
                    onFileChange={(file) => handleImageChange(file, setLogo2, setLogo2Preview)}
                    onClear={() => {
                      setLogo2(null);
                      setLogo2Preview('');
                    }}
                    disabled={profileData?.role === 'cliente'}
                    maxSizeMB={5}
                    onToast={triggerToast}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SECCIÓN 3: PLAN */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 md:p-6 shadow-sm space-y-5">
            <h3 className="font-outfit text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-2 uppercase tracking-wider">
              <Award className="text-[#468DFF] h-4 w-4" />
              Plan Suscrito
            </h3>

            {(() => {
              const effectivePlan = tenantData ? getEffectivePlan(tenantData) : 'free';
              const isGift = tenantData?.gift_plan_id && tenantData?.gift_ends_at && new Date(tenantData.gift_ends_at) > new Date();
              const isExempt = tenantData?.is_exempt;
              const isDiscountActive = tenantData?.discount_percentage > 0 && tenantData?.discount_ends_at && new Date(tenantData.discount_ends_at) > new Date();

              return (
                <div className="relative rounded-2xl border border-[#468DFF]/15 bg-gradient-to-br from-blue-50/50 via-slate-50 to-indigo-50/10 p-6 overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-[#468DFF]/5 blur-xl pointer-events-none" />
                  
                  <div className="space-y-2">
                    <span className="px-2 py-0.5 rounded-full bg-[#468DFF]/10 border border-[#468DFF]/20 text-[#468DFF] text-[10px] font-semibold uppercase tracking-wider">
                      Plan Activo
                    </span>
                    <h4 className="font-outfit text-xl font-extrabold text-slate-900">
                      {isExempt ? 'Plan Owner' : (isGift ? `${PLAN_FEATURES[effectivePlan]?.name} (Bonificado)` : PLAN_FEATURES[effectivePlan]?.name)}
                    </h4>
                    <p className="text-xs text-slate-600 font-medium leading-relaxed">
                      {isExempt && 'Acceso total e ilimitado de por vida a la plataforma como dueño de la aplicación.'}
                      {isGift && `Tu organización tiene un beneficio especial y acceso completo al plan ${PLAN_FEATURES[effectivePlan]?.name} bonificado hasta el ${formatDate(tenantData.gift_ends_at.slice(0, 10))}.`}
                      {!isExempt && !isGift && (
                        <>
                          {effectivePlan === 'free' && 'Límite de hasta 1 empresa cliente en base de datos, sin vencimiento de prueba.'}
                          {effectivePlan === 'basic_5' && 'Límite de hasta 5 empresas clientes y 5 miembros de equipo.'}
                          {effectivePlan === 'standard_25' && 'Límite de hasta 15 empresas clientes y 15 miembros de equipo.'}
                          {effectivePlan === 'libre' && 'Soporte ilimitado de empresas, inspectores y marca personal.'}
                        </>
                      )}
                    </p>
                  </div>

                  <div className="flex flex-col items-stretch md:items-end gap-3 shrink-0">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-500 block">Costo mensual</span>
                      <span className="font-outfit text-2xl font-extrabold text-[#468DFF]">
                        {isExempt || isGift ? 'Bonificado' : (
                          isDiscountActive ? (
                            `$${Math.round(PLAN_FEATURES[effectivePlan]?.price * (1 - tenantData.discount_percentage / 100)).toLocaleString()}`
                          ) : (
                            `$${(PLAN_FEATURES[effectivePlan]?.price || 0).toLocaleString()}`
                          )
                        )}
                      </span>
                      {isDiscountActive && !isExempt && !isGift && (
                        <span className="text-[10px] text-green-600 block font-semibold mt-0.5">
                          ¡Descuento del {tenantData.discount_percentage}% aplicado!
                        </span>
                      )}
                    </div>
                    {!isExempt && (
                      <button
                        type="button"
                        onClick={() => setShowPlanModal(true)}
                        className="py-2.5 px-4 rounded-xl border border-[#468DFF]/40 hover:bg-[#468DFF]/5 text-[#468DFF] font-semibold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        Cambiar / Subir Plan
                      </button>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </>
      )}

          {/* Form Actions */}
          <div className="flex justify-between items-center pt-6 border-t border-slate-100">
            <button
              type="button"
              onClick={handleExitWithoutSave}
              className="px-5 py-2.5 bg-[#FFFFFF] text-[#468DFF] border border-[#468DFF] rounded-xl text-sm font-bold hover:bg-[#468DFF] hover:text-[#FFFFFF] hover:border-[#FFFFFF] transition-all active:scale-[0.98] cursor-pointer"
            >
              Salir
            </button>

            {profileData?.role !== 'cliente' && (
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 bg-[#468DFF] hover:bg-[#0511F2] text-white rounded-xl text-sm font-bold flex items-center gap-2 transition-all active:scale-[0.98] cursor-pointer shadow-lg shadow-[#468DFF]/10 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    Guardar
                  </>
                )}
              </button>
            )}
          </div>

        </form>

        {/* ELIMINAR CUENTA (Disponible para todos los usuarios) */}
        {profileData && profileData.role !== 'cliente' && (
          <div className="mt-6 border-t border-slate-100 pt-5">
            {!showDeleteSection ? (
              <div className="flex justify-start">
                <button
                  type="button"
                  onClick={() => setShowDeleteSection(true)}
                  className="py-2.5 px-4 rounded-xl border border-red-200 hover:bg-red-50 text-red-600 text-xs font-bold transition-all cursor-pointer flex items-center gap-2 active:scale-[0.98]"
                >
                  <AlertTriangle className="h-4 w-4" />
                  {profileData?.role === 'admin' ? 'Eliminar Cuenta y Organización' : 'Eliminar Cuenta de Acceso'}
                </button>
              </div>
            ) : (
              <div className="bg-white border border-red-150 rounded-2xl p-5 shadow-sm space-y-5 animate-scaleUp">
                <div className="flex items-center justify-between border-b border-red-100 pb-2">
                  <h3 className="font-outfit text-sm font-bold text-red-600 flex items-center gap-2 uppercase tracking-wider">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    {profileData?.role === 'admin' ? 'Eliminar Cuenta y Organización' : 'Eliminar Cuenta de Acceso'}
                  </h3>
                  <button
                    type="button"
                    onClick={() => { setShowDeleteSection(false); setDeletePassword(''); }}
                    className="py-1.5 px-3 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-500 text-[10px] font-bold cursor-pointer transition-all active:scale-[0.98]"
                  >
                    Cancelar
                  </button>
                </div>
                
                {profileData?.role === 'admin' ? (
                  <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-red-800 text-sm space-y-3 leading-relaxed">
                    <p className="font-bold">¡ADVERTENCIA DE SEGURIDAD CRÍTICA!</p>
                    <p>
                      Al eliminar tu cuenta, se borrará de forma permanente e irreversible toda la información asociada a tu organización/consultora (<strong>{tenantData?.name}</strong>), incluyendo:
                    </p>
                    <ul className="list-disc pl-5 space-y-1 text-xs">
                      <li>Configuración y perfil del administrador y miembros de equipo.</li>
                      <li>Todas las empresas clientes y sus establecimientos cargados.</li>
                      <li>El historial completo de auditorías, capacitaciones, acciones correctivas y extintores.</li>
                      <li>Firmas, logotipos y archivos digitales subidos al almacenamiento.</li>
                    </ul>
                    <p className="font-semibold text-xs">
                      Esta acción no se puede deshacer y no habrá forma de recuperar los datos.
                    </p>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-red-800 text-sm space-y-3 leading-relaxed">
                    <p className="font-bold">¡ADVERTENCIA DE SEGURIDAD!</p>
                    <p>
                      Al confirmar, se elminará tu cuenta de usuario de forma permanente y ya no tendrás acceso a la organización/consultora <strong>{tenantData?.name}</strong>.
                    </p>
                    <p className="text-xs">
                      Tu perfil y configuraciones personales serán borrados definitivamente. Sin embargo, las constancias de visita, capacitaciones y actividades del programa anual que hayas registrado o firmado seguirán guardadas para el historial de la organización.
                    </p>
                    <p className="font-semibold text-xs">
                      Esta acción es irreversible y no podrás volver a ingresar con este usuario.
                    </p>
                  </div>
                )}

                <div className="space-y-4">
                  <div className="max-w-md">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Para confirmar la eliminación, ingresá tu contraseña actual:
                    </label>
                    <div className="relative">
                      <input
                        type={showDeletePassword ? 'text' : 'password'}
                        placeholder="Contraseña actual"
                        value={deletePassword}
                        onChange={(e) => setDeletePassword(e.target.value)}
                        autoComplete="current-password"
                        className="w-full border border-slate-200 rounded-xl py-2 pl-3.5 pr-12 text-sm focus:outline-none focus:border-red-500 bg-slate-50/50 transition-all text-slate-700"
                      />
                      <button
                        type="button"
                        onClick={() => setShowDeletePassword(!showDeletePassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-700 cursor-pointer"
                      >
                        {showDeletePassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-start">
                    <button
                      type="button"
                      onClick={handleDeleteAccount}
                      disabled={deleteLoading || !deletePassword}
                      className="py-3 px-6 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm transition-all flex items-center gap-2 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none shadow-lg shadow-red-500/10"
                    >
                      {deleteLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Eliminando cuenta y datos...
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="h-4 w-4" />
                          {profileData?.role === 'admin' ? 'Eliminar Cuenta y Organización Permanente' : 'Eliminar Mi Acceso Permanentemente'}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
        )}
    </main>

      {/* PLAN SELECTION MODAL */}
      {showPlanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-6xl shadow-2xl relative animate-scaleUp max-h-[90vh] overflow-hidden flex flex-col">
            <button 
              onClick={() => setShowPlanModal(false)}
              className="absolute top-4 right-4 p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors border border-slate-200 cursor-pointer z-10"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Contenedor interno con scroll para que la barra de desplazamiento se vea por dentro */}
            <div className="overflow-y-auto scrollbar-thin flex-1 pt-4 pb-6 px-6 md:px-8">
              <div className="text-center mb-3.5">
                <img src="/brand/logo-black.png" alt="Gestión SySO" className="h-14 w-14 object-contain mx-auto mb-2" />
                <h3 className="font-outfit text-2xl font-black text-slate-900">
                  Modificar tu Plan
                </h3>
              </div>

              {/* Grid of Plans */}
              {(() => {
                const currentActivePlan = tenantData ? getEffectivePlan(tenantData) : 'free';
                
                return (
                  <div className="grid md:grid-cols-4 gap-6 items-stretch pb-2">
                    
                    {/* Plan Free */}
                    <div className={`rounded-2xl border p-5 flex flex-col justify-between transition-all ${currentActivePlan === 'free' ? 'border-[#468DFF] bg-[#468DFF]/5 ring-2 ring-[#468DFF]/20 shadow-md' : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'}`}>
                      <div>
                        <h4 className="text-base font-bold text-slate-900">Plan Gratis</h4>
                        <p className="text-xs text-slate-500 mt-1.5 font-medium leading-relaxed">Ideal para probar la herramienta.</p>
                        <span className="font-outfit text-2xl font-extrabold text-[#468DFF] mt-3 block">$0 <span className="text-xs text-slate-500 font-normal">/ permanente</span></span>
                        <ul className="text-[11px] text-slate-600 mt-4 space-y-1.5 border-t border-slate-200 pt-4 font-semibold leading-relaxed">
                          <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-[#468DFF] shrink-0" /> hasta 1 cliente</li>
                          <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-[#468DFF] shrink-0" /> hasta 1 miembro equipo</li>
                          <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-[#468DFF] shrink-0" /> Prog. Gestión Anual</li>
                          <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-[#468DFF] shrink-0" /> Prog. Capacitación Anual</li>
                          <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-[#468DFF] shrink-0" /> Acciones Correctivas</li>
                          <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-[#468DFF] shrink-0" /> Accidentes + Informe IA</li>
                          <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-[#468DFF] shrink-0" /> Matriz de Riesgos</li>
                        </ul>
                      </div>
                      <button
                        type="button"
                        disabled={currentActivePlan === 'free'}
                        onClick={() => {
                          showAlert(
                            'Cancelar Suscripción',
                            'Para dar de baja tu plan activo y regresar al Plan Gratis, debes cancelar la suscripción desde tu panel de Mercado Pago. Al confirmarse la cancelación, tu organización se actualizará automáticamente a Gratis sin cargos adicionales.',
                            'info',
                            () => {
                              window.open('https://www.mercadopago.com.ar/subscriptions', '_blank');
                            },
                            'Ir a Mercado Pago'
                          );
                          setShowPlanModal(false);
                        }}
                        className={`w-full py-2.5 rounded-xl mt-6 text-xs font-bold transition-all ${currentActivePlan === 'free' ? 'bg-[#468DFF] text-white opacity-80 cursor-default' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer'}`}
                      >
                        {currentActivePlan === 'free' ? 'Activo' : 'Elegir'}
                      </button>
                    </div>

                    {/* Plan 25000 */}
                    <div className={`rounded-2xl border p-5 flex flex-col justify-between transition-all ${currentActivePlan === 'basic_5' ? 'border-[#468DFF] bg-[#468DFF]/5 ring-2 ring-[#468DFF]/20 shadow-md' : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'}`}>
                      <div>
                        <h4 className="text-base font-bold text-slate-900">Plan Básico</h4>
                        <p className="text-xs text-slate-500 mt-1.5 font-medium leading-relaxed">Para profesionales de campo.</p>
                        <span className="font-outfit text-2xl font-extrabold text-[#468DFF] mt-3 block">$25.000 <span className="text-xs text-slate-500 font-normal">/ mes</span></span>
                        <ul className="text-[11px] text-slate-600 mt-4 space-y-1.5 border-t border-slate-200 pt-4 font-semibold leading-relaxed">
                          <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-[#468DFF] shrink-0" /> hasta 5 clientes</li>
                          <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-[#468DFF] shrink-0" /> hasta 5 miembros equipo</li>
                          <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-[#468DFF] shrink-0" /> Prog. Gestión Anual</li>
                          <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-[#468DFF] shrink-0" /> Prog. Capacitación Anual</li>
                          <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-[#468DFF] shrink-0" /> Acciones Correctivas</li>
                          <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-[#468DFF] shrink-0" /> Accidentes + Informe IA</li>
                          <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-[#468DFF] shrink-0" /> Matriz de Riesgos</li>
                          <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-[#468DFF] shrink-0" /> Control Extintores + PDF</li>
                          <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-[#468DFF] shrink-0" /> Control Eléctrico + PDF</li>
                        </ul>
                      </div>
                      <button
                        type="button"
                        disabled={currentActivePlan === 'basic_5'}
                        onClick={() => handleUpgradePlan('basic_5')}
                        className={`w-full py-2.5 rounded-xl mt-6 text-xs font-bold transition-all ${currentActivePlan === 'basic_5' ? 'bg-[#468DFF] text-white opacity-80 cursor-default' : 'bg-[#468DFF] hover:bg-[#0511F2] text-white cursor-pointer'}`}
                      >
                        {currentActivePlan === 'basic_5' ? 'Activo' : 'Contratar'}
                      </button>
                    </div>

                    {/* Plan 35000 */}
                    <div className={`rounded-2xl border p-5 flex flex-col justify-between transition-all ${currentActivePlan === 'standard_25' ? 'border-[#468DFF] bg-[#468DFF]/5 ring-2 ring-[#468DFF]/20 shadow-md' : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'}`}>
                      <div>
                        <h4 className="text-base font-bold text-slate-900">Plan Estándar</h4>
                        <p className="text-xs text-slate-500 mt-1.5 font-medium leading-relaxed">Para consultoras medianas.</p>
                        <span className="font-outfit text-2xl font-extrabold text-[#468DFF] mt-3 block">$35.000 <span className="text-xs text-slate-500 font-normal">/ mes</span></span>
                        <ul className="text-[11px] text-slate-600 mt-4 space-y-1.5 border-t border-slate-200 pt-4 font-semibold leading-relaxed">
                          <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-[#468DFF] shrink-0" /> hasta 25 clientes</li>
                          <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-[#468DFF] shrink-0" /> hasta 25 miembros equipo</li>
                          <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-[#468DFF] shrink-0" /> Prog. Gestión Anual</li>
                          <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-[#468DFF] shrink-0" /> Prog. Capacitación Anual</li>
                          <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-[#468DFF] shrink-0" /> Acciones Correctivas</li>
                          <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-[#468DFF] shrink-0" /> Accidentes + Informe IA</li>
                          <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-[#468DFF] shrink-0" /> Matriz de Riesgos</li>
                          <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-[#468DFF] shrink-0" /> Control Extintores + PDF</li>
                          <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-[#468DFF] shrink-0" /> Control Eléctrico + PDF</li>
                          <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-[#468DFF] shrink-0" /> Constancias de Visita</li>
                          <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-[#468DFF] shrink-0" /> Avisos de Riesgo</li>
                        </ul>
                      </div>
                      <button
                        type="button"
                        disabled={currentActivePlan === 'standard_25'}
                        onClick={() => handleUpgradePlan('standard_25')}
                        className={`w-full py-2.5 rounded-xl mt-6 text-xs font-bold transition-all ${currentActivePlan === 'standard_25' ? 'bg-[#468DFF] text-white opacity-80 cursor-default' : 'bg-[#468DFF] hover:bg-[#0511F2] text-white cursor-pointer'}`}
                      >
                        {currentActivePlan === 'standard_25' ? 'Activo' : 'Contratar'}
                      </button>
                    </div>

                    {/* Plan Full */}
                    <div className={`rounded-2xl border p-5 flex flex-col justify-between transition-all ${currentActivePlan === 'libre' ? 'border-[#468DFF] bg-[#468DFF]/5 ring-2 ring-[#468DFF]/20 shadow-md' : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'}`}>
                      <div>
                        <h4 className="text-base font-bold text-slate-900">Plan Full</h4>
                        <p className="text-xs text-slate-500 mt-1.5 font-medium leading-relaxed">Constructoras y corporaciones.</p>
                        <span className="font-outfit text-2xl font-extrabold text-[#468DFF] mt-3 block">$45.000 <span className="text-xs text-slate-500 font-normal">/ mes</span></span>
                        <ul className="text-[11px] text-slate-600 mt-4 space-y-1.5 border-t border-slate-200 pt-4 font-semibold leading-relaxed">
                          <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-[#468DFF] shrink-0" /> Clientes ilimitados</li>
                          <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-[#468DFF] shrink-0" /> Equipo de trabajo ilimitado</li>
                          <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-[#468DFF] shrink-0" /> Prog. Gestión Anual</li>
                          <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-[#468DFF] shrink-0" /> Prog. Capacitación Anual</li>
                          <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-[#468DFF] shrink-0" /> Acciones Correctivas</li>
                          <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-[#468DFF] shrink-0" /> Accidentes + Informe IA</li>
                          <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-[#468DFF] shrink-0" /> Matriz de Riesgos</li>
                          <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-[#468DFF] shrink-0" /> Control Extintores + PDF</li>
                          <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-[#468DFF] shrink-0" /> Control Eléctrico + PDF</li>
                          <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-[#468DFF] shrink-0" /> Constancias de Visita</li>
                          <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-[#468DFF] shrink-0" /> Avisos de Riesgo</li>
                          <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-[#468DFF] shrink-0" /> Check list personalizados</li>
                          <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-[#468DFF] shrink-0" /> Legajo técnico online</li>
                          <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-[#468DFF] shrink-0" /> Portal de clientes</li>
                        </ul>
                      </div>
                      <button
                        type="button"
                        disabled={currentActivePlan === 'libre'}
                        onClick={() => handleUpgradePlan('libre')}
                        className={`w-full py-2.5 rounded-xl mt-6 text-xs font-bold transition-all ${currentActivePlan === 'libre' ? 'bg-[#468DFF] text-white opacity-80 cursor-default' : 'bg-[#468DFF] hover:bg-[#0511F2] text-white cursor-pointer'}`}
                      >
                        {currentActivePlan === 'libre' ? 'Activo' : 'Contratar'}
                      </button>
                    </div>

                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Diálogos accesibles Radix */}
      <AppConfirmDialog
        open={showConfirmDialog}
        onOpenChange={setShowConfirmDialog}
        title={confirmDialogConfig.title}
        description={confirmDialogConfig.description}
        type={confirmDialogConfig.type}
        onConfirm={confirmDialogConfig.onConfirm}
        confirmText={confirmDialogConfig.confirmText}
      />

      <AppDestructiveConfirmDialog
        open={showDeleteConfirmDialog}
        onOpenChange={setShowDeleteConfirmDialog}
        title="Eliminar Cuenta Definitivamente"
        description={profileData?.role === 'admin'
          ? '¿Estás ABSOLUTAMENTE seguro de que deseas eliminar tu cuenta? Esta acción destruirá por completo tu organización y todos sus datos.'
          : '¿Estás seguro de que deseas eliminar tu cuenta de usuario y revocar tu acceso a la organización?'}
        requiredText={profileData?.role === 'admin' ? 'ELIMINAR MI CUENTA' : 'ELIMINAR MI ACCESO'}
        onConfirm={executeDeleteAccount}
        confirmText="Eliminar permanentemente"
      />

      <AppUnsavedChangesDialog
        open={showUnsavedChangesDialog}
        onOpenChange={setShowUnsavedChangesDialog}
        onLeave={unsavedChangesConfig.onLeave}
      />


    </div>
  );
}
