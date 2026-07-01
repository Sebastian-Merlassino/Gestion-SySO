// src/app/[tenant-slug]/equipo/page.js
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import ImageUploadZone from '@/components/ui/ImageUploadZone';
import { supabase, fetchAllGeography } from '@/lib/supabase';
import { 
  Users, 
  Building,
  User, 
  Mail, 
  Phone, 
  Calendar, 
  PlusCircle, 
  Edit, 
  Trash2, 
  ArrowLeft, 
  Loader2, 
  Check, 
  Briefcase, 
  MapPin, 
  Plus, 
  Minus,
  AlertTriangle,
  Info,
  Lock,
  Upload,
  X,
  Award,
  FileText,
  Settings,
  LogOut,
  Eye,
  EyeOff,
  Menu,
  ClipboardList,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Flame,
  ClipboardCheck,
  ChevronDown,
  ChevronUp,
  Search,
  Sliders,
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

const normalizePermisos = (perms) => {
  const sections = ['empresas', 'equipo', 'programa', 'capacitacion', 'correctivas', 'extintores', 'control_electrico', 'visitas', 'avisos', 'legajo', 'nomina'];
  const normalized = {};
  sections.forEach(sec => {
    const val = perms?.[sec];
    if (val === true || val === undefined) {
      normalized[sec] = { cargar: true, editar: true, eliminar: true };
    } else if (val === false) {
      normalized[sec] = { cargar: false, editar: false, eliminar: false };
    } else {
      normalized[sec] = {
        cargar: val.cargar === true,
        editar: val.editar === true,
        eliminar: val.eliminar === true
      };
    }
  });
  return normalized;
};

export default function EquipoPage({ params }) {
  const tenantSlug = params['tenant-slug'];
  
  // Active view: 'list' or 'form'
  const [view, setView] = useState('list');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDevMode, setIsDevMode] = useState(false);

  // Tenant and Profile data
  const [profile, setProfile] = useState(() => {
    if (typeof window !== 'undefined') {
      const cached = sessionStorage.getItem('user-profile');
      return cached ? JSON.parse(cached) : null;
    }
    return null;
  });
  const [tenant, setTenant] = useState(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
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

  const sectionPerms = getSectionPermissions(profile, 'equipo');
  const canCargar = sectionPerms.cargar;
  const canEditar = sectionPerms.editar;
  const canEliminar = sectionPerms.eliminar;
  const isFormDisabled = (editingId ? !canEditar : !canCargar) || isReadOnlyView;
  const canEdit = !isFormDisabled; // Maintain compatibility for general field interactions


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

  // List of members
  const [miembros, setMiembros] = useState([]);

  // Form states
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [cuit, setCuit] = useState('');
  const [cuitError, setCuitError] = useState('');
  const [phone, setPhone] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [provincia, setProvincia] = useState('');
  const [partido, setPartido] = useState('');
  const [partidosList, setPartidosList] = useState([]);
  const [localidad, setLocalidad] = useState('');
  const [localidadesList, setLocalidadesList] = useState([]);
  const [tieneAcceso, setTieneAcceso] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [signatureUrl, setSignatureUrl] = useState('');
  
  // Files
  const [fotoFirma, setFotoFirma] = useState(null);
  const [fotoFirmaPreview, setFotoFirmaPreview] = useState('');

  // Permisos de edición por sección
  const [permisos, setPermisos] = useState({
    empresas: { cargar: true, editar: true, eliminar: true },
    equipo: { cargar: true, editar: true, eliminar: true },
    programa: { cargar: true, editar: true, eliminar: true },
    capacitacion: { cargar: true, editar: true, eliminar: true },
    correctivas: { cargar: true, editar: true, eliminar: true },
    extintores: { cargar: true, editar: true, eliminar: true },
    control_electrico: { cargar: true, editar: true, eliminar: true },
    visitas: { cargar: true, editar: true, eliminar: true },
    avisos: { cargar: true, editar: true, eliminar: true },
    legajo: { cargar: true, editar: true, eliminar: true }
  });

  // Matrículas
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

  // Initial values for dirty checking
  const [initialValues, setInitialValues] = useState(null);

  // Filtros de búsqueda
  const [filterText, setFilterText] = useState('');

  // Modals / Toasts
  const [modalAlert, setModalAlert] = useState({ show: false, title: '', message: '', type: 'info', onConfirm: null, confirmText: 'Confirmar' });
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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

  // Signed URLs helper
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

  // Initial load
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

  const loadMockData = () => {
    setProfile({ full_name: 'Profesional de SySO (Mock)', role: 'admin' });
    setTenant({ id: 'mock-tenant', name: 'Consultora de Prueba', plan_id: 'free' });
    setMiembros([
      {
        id: 'mock-miembro-1',
        full_name: 'Ing. Carlos Gómez',
        email: 'carlos.gomez@consultora.com',
        cuit: '20304567891',
        phone: '1144445555',
        tiene_acceso: true,
        provincia: 'BUENOS AIRES',
        partido: 'PILAR',
        localidad: 'PILAR',
        role: 'miembro'
      },
      {
        id: 'mock-miembro-2',
        full_name: 'Lic. Laura Fernández',
        email: 'laura.fernandez@consultora.com',
        cuit: '27329876543',
        phone: '1133332222',
        tiene_acceso: false,
        provincia: 'BUENOS AIRES',
        partido: 'TIGRE',
        localidad: 'TIGRE',
        role: 'miembro'
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

      // Load Profile
      const { data: prof, error: pErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      if (pErr) throw pErr;
      
      // Removido condicional limitante de carga: los inspectores con acceso ahora pueden visualizar el listado.
      
      if (prof.role === 'cliente') {
        window.location.href = `/${tenantSlug}/dashboard`;
        return;
      }
      
      setProfile(prof);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('user-profile', JSON.stringify(prof));
      }

      // Load Tenant por slug de URL
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
            window.location.href = `/${homeTen.slug}/equipo`;
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
            window.location.href = `/${homeTen.slug}/equipo`;
            return;
          }
        }
        window.location.href = '/login';
        return;
      }

      setTenant(ten);

      // Load Team Members
      const { data: team, error: teamErr } = await supabase
        .from('miembros_equipo')
        .select('*')
        .eq('tenant_id', ten.id)
        .order('full_name');
      if (teamErr) throw teamErr;

      setMiembros(team);
      setLoading(false);
    } catch (err) {
      console.error('Error loading team members:', err);
      triggerToast('Error al conectar con la base de datos.', 'error');
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

  // Cuit Change Handler
  const handleCuitChange = (e) => {
    const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 11);
    setCuit(val);
    if (val.length > 0 && val.length < 11) {
      setCuitError('El CUIT debe contener exactamente 11 números enteros.');
    } else {
      setCuitError('');
    }
  };

  // Cascading geography selectors
  useEffect(() => {
    if (!provincia) {
      setPartidosList([]);
      setLocalidadesList([]);
      setPartido('');
      setLocalidad('');
      return;
    }

    const loadPartidos = async () => {
      if (isDevMode) {
        setPartidosList(['PILAR', 'TIGRE', 'SAN ISIDRO']);
        return;
      }
      try {
        const data = await fetchAllGeography(provincia);
        const uniquePartidos = Array.from(new Set(data.map(item => item.departamento_partido))).sort();
        setPartidosList(uniquePartidos);
      } catch (err) {
        console.error('Error al cargar partidos:', err);
        triggerToast('Error al cargar el listado de partidos.', 'error');
      }
    };

    loadPartidos();
  }, [provincia, isDevMode]);

  useEffect(() => {
    if (!provincia || !partido) {
      setLocalidadesList([]);
      setLocalidad('');
      return;
    }

    const loadLocalidades = async () => {
      if (isDevMode) {
        setLocalidadesList(['PILAR', 'DEL VISO', 'MANZANARES']);
        return;
      }
      try {
        const data = await fetchAllGeography(provincia, partido);
        const uniqueLocs = Array.from(new Set(data.map(item => item.localidad_barrio))).sort();
        setLocalidadesList(uniqueLocs);
      } catch (err) {
        console.error('Error al cargar localidades:', err);
        triggerToast('Error al cargar el listado de localidades.', 'error');
      }
    };

    loadLocalidades();
  }, [provincia, partido, isDevMode]);

  // Image Upload handler
  const handleImageChange = (fileOrEvent, setFile, setPreview) => {
    const file = fileOrEvent?.target ? fileOrEvent.target.files[0] : fileOrEvent;
    if (!file) return;

    if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
      alert('Por favor, selecciona una imagen en formato JPG o PNG.');
      return;
    }

    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
    if (file.size > MAX_FILE_SIZE) {
      alert('El archivo no debe superar los 5 MB.');
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
      alert('Por favor, selecciona una imagen en formato JPG o PNG.');
      return;
    }

    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
    if (file.size > MAX_FILE_SIZE) {
      alert('El archivo no debe superar los 5 MB.');
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

  const handleAddNew = () => {
    setIsReadOnlyView(false);
    setEditingId(null);
    setFullName('');
    setEmail('');
    setCuit('');
    setCuitError('');
    setPhone('');
    setBirthDate('');
    setProvincia('');
    setPartido('');
    setLocalidad('');
    setTieneAcceso(false);
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setShowConfirmPassword(false);
    setSignatureUrl('');
    setFotoFirma(null);
    setFotoFirmaPreview('');
    setPermisos({
      empresas: { cargar: true, editar: true, eliminar: true },
      equipo: { cargar: true, editar: true, eliminar: true },
      programa: { cargar: true, editar: true, eliminar: true },
      capacitacion: { cargar: true, editar: true, eliminar: true },
      correctivas: { cargar: true, editar: true, eliminar: true },
      extintores: { cargar: true, editar: true, eliminar: true },
      control_electrico: { cargar: true, editar: true, eliminar: true },
      visitas: { cargar: true, editar: true, eliminar: true },
      avisos: { cargar: true, editar: true, eliminar: true },
      legajo: { cargar: true, editar: true, eliminar: true },
      nomina: { cargar: true, editar: true, eliminar: true }
    });
    setMatriculas([
      {
        id: null,
        institucion: '',
        numero: '',
        vencimiento: '',
        fotoFrente: null,
        fotoFrentePreview: '',
        fotoDorso: null,
        fotoDorsoPreview: '',
        fotoFrentePath: '',
        fotoDorsoPath: ''
      }
    ]);
    setInitialValues({
      fullName: '',
      email: '',
      cuit: '',
      phone: '',
      birthDate: '',
      provincia: '',
      partido: '',
      localidad: '',
      tieneAcceso: false,
      signatureUrl: '',
      permisos: {
        empresas: { cargar: true, editar: true, eliminar: true },
        equipo: { cargar: true, editar: true, eliminar: true },
        programa: { cargar: true, editar: true, eliminar: true },
        capacitacion: { cargar: true, editar: true, eliminar: true },
        correctivas: { cargar: true, editar: true, eliminar: true },
        extintores: { cargar: true, editar: true, eliminar: true },
        control_electrico: { cargar: true, editar: true, eliminar: true },
        visitas: { cargar: true, editar: true, eliminar: true },
        avisos: { cargar: true, editar: true, eliminar: true },
        legajo: { cargar: true, editar: true, eliminar: true },
        nomina: { cargar: true, editar: true, eliminar: true }
      },
      matriculas: [{ institucion: '', numero: '', vencimiento: '', fotoFrentePreview: '', fotoDorsoPreview: '', fotoFrentePath: '', fotoDorsoPath: '' }]
    });
    setView('form');
  };

  const handleEdit = async (memberId) => {
    setLoading(true);
    setEditingId(memberId);
    
    if (isDevMode) {
      const match = miembros.find(m => m.id === memberId);
      setFullName(match.full_name);
      setEmail(match.email);
      setCuit(match.cuit);
      setCuitError('');
      setPhone(match.phone);
      setBirthDate('1985-05-15');
      setProvincia(match.provincia);
      setPartido(match.partido);
      setLocalidad(match.localidad);
      setTieneAcceso(match.tiene_acceso);
      setPassword('');
      setConfirmPassword('');
      setShowPassword(false);
      setShowConfirmPassword(false);
      setFotoFirmaPreview('https://placeholder-storage.com/signatures/mock-firma.png');
      setMatriculas([
        {
          id: 'mock-m-1',
          institucion: 'COPIME',
          numero: 'L123456',
          vencimiento: '2028-12-31',
          fotoFrente: null,
          fotoFrentePreview: 'https://placeholder-storage.com/documents/frente.png',
          fotoDorso: null,
          fotoDorsoPreview: 'https://placeholder-storage.com/documents/dorso.png'
        }
      ]);
      setView('form');
      setLoading(false);
      return;
    }

    try {
      const { data: member, error: memberErr } = await supabase
        .from('miembros_equipo')
        .select('*')
        .eq('id', memberId)
        .single();

      if (memberErr) throw memberErr;

      setFullName(member.full_name);
      setEmail(member.email);
      setCuit(member.cuit);
      setCuitError('');
      setPhone(member.phone);
      setBirthDate(member.birth_date);
      setProvincia(member.provincia);
      setPartido(member.partido);
      
      // Load cascade geography data
      const partsData = await fetchAllGeography(member.provincia);
      const uniquePartidos = Array.from(new Set((partsData || []).map(p => p.departamento_partido))).sort();
      setPartidosList(uniquePartidos);
      setPartido(member.partido);

      const locsData = await fetchAllGeography(member.provincia, member.partido);
      const uniqueLocs = Array.from(new Set((locsData || []).map(l => l.localidad_barrio))).sort();
      setLocalidadesList(uniqueLocs);
      setLocalidad(member.localidad || '');

      setTieneAcceso(member.tiene_acceso);
      setPermisos(normalizePermisos(member.permisos));
      setPassword('');
      setConfirmPassword('');
      setShowPassword(false);
      setShowConfirmPassword(false);

      const resolvedSignature = member.signature_url ? await getSignedUrl('signatures', member.signature_url) : '';
      setFotoFirmaPreview(resolvedSignature);
      setSignatureUrl(member.signature_url || '');

      // Load Matriculas
      const { data: matriculasData, error: mErr } = await supabase
        .from('matriculas')
        .select('*')
        .eq('miembro_id', memberId)
        .order('created_at');
      
      if (mErr) throw mErr;

      const loadedMatriculas = matriculasData && matriculasData.length > 0
        ? await Promise.all(matriculasData.map(async m => ({
            id: m.id,
            institucion: m.institucion || '',
            numero: m.numero || '',
            vencimiento: m.vencimiento || '',
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

      setMatriculas(loadedMatriculas);
      
      // Save initial values for dirty check
      setInitialValues({
        fullName: member.full_name,
        email: member.email,
        cuit: member.cuit,
        phone: member.phone,
        birthDate: member.birth_date,
        provincia: member.provincia,
        partido: member.partido,
        localidad: member.localidad || '',
        tieneAcceso: member.tiene_acceso,
        signatureUrl: member.signature_url || '',
        permisos: normalizePermisos(member.permisos),
        matriculas: loadedMatriculas.map(m => ({
          institucion: m.institucion,
          numero: m.numero,
          vencimiento: m.vencimiento,
          fotoFrentePreview: m.fotoFrentePreview,
          fotoDorsoPreview: m.fotoDorsoPreview
        }))
      });

      setView('form');
      setLoading(false);
    } catch (err) {
      console.error('Error al editar miembro:', err);
      triggerToast('Error al cargar datos del miembro.', 'error');
      setLoading(false);
    }
  };

  const handleDelete = async (memberId, name, memberProfileId) => {
    showAlert(
      'Eliminar Miembro de Equipo',
      `¿Estás seguro de que deseas eliminar permanentemente a "${name}"? Si posee acceso a la plataforma, su cuenta de usuario también será desactivada.`,
      'warning',
      async () => {
        setLoading(true);
        if (isDevMode) {
          setMiembros(prev => prev.filter(m => m.id !== memberId));
          triggerToast('Miembro eliminado con éxito (Simulación).');
          setLoading(false);
          setView('list');
          closeAlert();
          return;
        }

        try {
          if (memberProfileId) {
            // Delete from auth via server endpoint to maintain integrity
            const res = await fetch(`/api/equipo?userId=${memberProfileId}`, {
              method: 'DELETE'
            });
            const data = await res.json();
            if (!res.ok) {
              throw new Error(data.error || 'Error deleting authentication user');
            }
          }

          // Delete record from table (cascade should clean up matriculas too)
          const { error } = await supabase
            .from('miembros_equipo')
            .delete()
            .eq('id', memberId);

          if (error) throw error;

          triggerToast('Miembro del equipo eliminado con éxito.');
          setView('list');
          await loadRealData();
        } catch (err) {
          console.error('Error deleting member:', err);
          triggerToast(err.message || 'Error al eliminar el miembro de equipo.', 'error');
        } finally {
          setLoading(false);
          closeAlert();
        }
      },
      'Eliminar'
    );
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);

    // General Validations
    if (!fullName || !email || !phone || !cuit || !provincia || !partido) {
      triggerToast('Por favor completa todos los campos obligatorios (*).', 'error');
      setSaving(false);
      return;
    }

    if (cuit.length !== 11) {
      triggerToast('El CUIT debe contener exactamente 11 números enteros.', 'error');
      setSaving(false);
      return;
    }

    const hasLogin = editingId ? !!(miembros.find(m => m.id === editingId)?.profile_id) : false;

    if (tieneAcceso) {
      if (!hasLogin && !password) {
        triggerToast('Debes ingresar una contraseña para crear un usuario con acceso.', 'error');
        setSaving(false);
        return;
      }

      const isStrongPassword = (pwd) => {
        if (pwd.length < 8) return false;
        if (!/[A-Z]/.test(pwd)) return false;
        if (!/[0-9]/.test(pwd)) return false;
        return true;
      };

      if (password && !isStrongPassword(password)) {
        triggerToast('La contraseña debe tener al menos 8 caracteres, incluir al menos una letra mayúscula y al menos un número.', 'error');
        setSaving(false);
        return;
      }
      if (password && password !== confirmPassword) {
        triggerToast('Las contraseñas no coinciden.', 'error');
        setSaving(false);
        return;
      }
    }

    if (isDevMode) {
      console.log('Simulando guardado de miembro en desarrollo...');
      setTimeout(() => {
        setSaving(false);
        triggerToast('¡Miembro guardado con éxito en la simulación!');
        setView('list');
      }, 1500);
      return;
    }

    try {
      let linkedProfileId = editingId ? (miembros.find(m => m.id === editingId)?.profile_id || null) : null;

      // 1. Create or verify auth.users login access via Route Handler
      if (tieneAcceso && !linkedProfileId) {
        // Create user in Auth
        const response = await fetch('/api/equipo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            email, 
            password, 
            full_name: fullName, 
            role: 'miembro',
            cuit,
            tenant_id: tenant.id
          })
        });
        const apiData = await response.json();
        
        if (!response.ok) {
          throw new Error(apiData.error || 'Error al crear credenciales de acceso.');
        }

        linkedProfileId = apiData.userId;
      } else if (tieneAcceso && linkedProfileId) {
        // Always call PUT to sync email and full name, and update password if provided
        const response = await fetch('/api/equipo', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            userId: linkedProfileId, 
            email, 
            password: password || undefined, 
            full_name: fullName 
          })
        });
        const apiData = await response.json();
        
        if (!response.ok) {
          throw new Error(apiData.error || 'Error al actualizar credenciales de acceso.');
        }
      } else if (!tieneAcceso && linkedProfileId) {
        // Disable login access by deleting the auth user
        const response = await fetch(`/api/equipo?userId=${linkedProfileId}`, {
          method: 'DELETE'
        });
        const apiData = await response.json();
        
        if (!response.ok) {
          throw new Error(apiData.error || 'Error al deshabilitar el acceso del usuario.');
        }
        
        linkedProfileId = null;
      }

      // 2. Upload Signature File if added
      let finalSignatureUrl = signatureUrl;
      if (fotoFirma) {
        const prefix = linkedProfileId || `sin-acceso-${Date.now()}`;
        const ext = fotoFirma.name.split('.').pop();
        finalSignatureUrl = await uploadFileToStorage('signatures', `${prefix}/firma_${Date.now()}.${ext}`, fotoFirma);
      }
      if (!fotoFirmaPreview) {
        finalSignatureUrl = '';
      }

      // 3. Upsert member record
      const memberPayload = {
        tenant_id: tenant.id,
        full_name: fullName,
        email,
        cuit,
        phone,
        birth_date: birthDate || null,
        provincia,
        partido,
        localidad: localidad || null,
        tiene_acceso: tieneAcceso,
        profile_id: linkedProfileId,
        signature_url: finalSignatureUrl,
        permisos
      };

      let memberId = editingId;

      if (editingId) {
        const { error: updateErr } = await supabase
          .from('miembros_equipo')
          .update(memberPayload)
          .eq('id', editingId);

        if (updateErr) throw updateErr;
      } else {
        const { data: insertData, error: insertErr } = await supabase
          .from('miembros_equipo')
          .insert(memberPayload)
          .select()
          .single();

        if (insertErr) throw insertErr;
        memberId = insertData.id;
      }

      // 4. Upload & update member licenses (Matrículas)
      const updatedMatriculas = await Promise.all(
        matriculas.map(async (m, idx) => {
          let frenteUrl = m.fotoFrentePath || '';
          let dorsoUrl = m.fotoDorsoPath || '';
          const userFolder = linkedProfileId || `sin-acceso-${memberId}`;

          if (m.fotoFrente) {
            const ext = m.fotoFrente.name.split('.').pop();
            frenteUrl = await uploadFileToStorage('documents', `${userFolder}/matricula_${idx}_frente_${Date.now()}.${ext}`, m.fotoFrente);
          }

          if (m.fotoDorso) {
            const ext = m.fotoDorso.name.split('.').pop();
            dorsoUrl = await uploadFileToStorage('documents', `${userFolder}/matricula_${idx}_dorso_${Date.now()}.${ext}`, m.fotoDorso);
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

      // Delete old licenses and insert fresh ones
      const { error: mDeleteErr } = await supabase
        .from('matriculas')
        .delete()
        .eq('miembro_id', memberId);

      if (mDeleteErr) throw mDeleteErr;

      const toInsert = updatedMatriculas
        .filter(m => m.numero.trim() !== '' || m.institucion.trim() !== '')
        .map(m => ({
          miembro_id: memberId,
          profile_id: linkedProfileId || null,
          institucion: m.institucion,
          numero: m.numero,
          vencimiento: m.vencimiento || null,
          foto_frente_url: m.fotoFrentePreview || null,
          foto_dorso_url: m.fotoDorsoPreview || null
        }));

      if (toInsert.length > 0) {
        const { error: mInsertErr } = await supabase
          .from('matriculas')
          .insert(toInsert);

        if (mInsertErr) throw mInsertErr;
      }

      triggerToast('¡Miembro del equipo guardado con éxito!', 'success');
      setView('list');
      await loadRealData();
    } catch (err) {
      console.error('Error saving team member:', err);
      triggerToast(err.message || 'Error al guardar los datos del miembro.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleExitWithoutSave = (onConfirmOverride = null) => {
    if (view === 'list') {
      window.location.href = `/${tenantSlug}/dashboard`;
      return;
    }

    if (isReadOnlyView) {
      if (onConfirmOverride) {
        onConfirmOverride();
      } else {
        setView('list');
      }
      return;
    }

    showAlert(
      'Salir sin guardar',
      '¿Estás seguro de que deseas salir del formulario? Perderás todos los cambios cargados que no se hayan guardado.',
      'warning',
      () => {
        closeAlert();
        if (onConfirmOverride) {
          onConfirmOverride();
        } else {
          setView('list');
        }
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
      handleExitWithoutSave(() => {
        if (path === 'list') {
          setView('list');
        } else {
          window.location.href = path;
        }
      });
    }
  };

  const hasLogin = editingId ? !!(miembros.find(m => m.id === editingId)?.profile_id) : false;

  const filteredMiembros = miembros.filter(m => {
    return filterText ? (m.full_name || '').toLowerCase().includes(filterText.toLowerCase()) : true;
  });

  return (
    <div className="h-screen overflow-hidden bg-syso-bg text-slate-700 flex font-sans">
      
      {/* Sidebar (Desktop & Mobile) */}
      <Sidebar
        tenantSlug={tenantSlug}
        profile={profile}
        currentSection="equipo"
        isSidebarCollapsed={isSidebarCollapsed}
        toggleSidebar={toggleSidebar}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
        handleLogout={handleLogout}
        onNavigate={handleSidebarNavigation}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <header className="h-16 border-b border-slate-200 flex items-center justify-between px-4 md:px-6 bg-white shrink-0 sticky top-0 z-20">
          <div className="flex items-center gap-2.5 min-w-0">
            <button 
              onClick={() => setIsMobileMenuOpen(true)} 
              className="p-2 -ml-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 md:hidden cursor-pointer shrink-0"
            >
              <Menu className="h-5 w-5" />
            </button>
            <Users className="h-5 w-5 text-[#468DFF] shrink-0" />
            <h1 className="font-outfit text-base md:text-lg font-bold text-slate-900 truncate leading-none">
              Equipo de Trabajo
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

        <div className="max-w-[95%] mx-auto w-full py-8 px-4 md:px-0 flex-1 flex flex-col min-h-0">
          
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
              <Loader2 className="h-10 w-10 animate-spin text-[#468DFF]" />
              <p className="text-sm text-slate-500 font-medium">Cargando información del equipo...</p>
            </div>
          ) : view === 'list' ? (
            
            // ==========================================
            // VIEW: MEMBERS LIST (TABLE)
            // ==========================================
            <div className="space-y-6 flex-1 flex flex-col min-h-0">
              
              {/* Panel de Filtros y Búsqueda */}
              <div className="bg-white rounded-2xl border border-slate-150 p-3 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  {/* Espaciador para empujar el buscador y botón a la derecha en desktop */}
                  <div className="hidden md:block flex-1"></div>
 
                  {/* Buscador y Botón agrupados */}
                  <div className="flex flex-col md:flex-row md:items-center gap-3 w-full md:w-auto">
                    {filterText && (
                      <button
                        onClick={() => setFilterText('')}
                        className="px-2 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-semibold cursor-pointer transition-all border border-slate-200 self-end md:self-auto"
                      >
                        Limpiar búsqueda
                      </button>
                    )}
                    <div className="relative w-full md:w-72">
                      <span className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none">
                        <Search className="h-3.5 w-3.5" />
                      </span>
                      <input
                        type="text"
                        placeholder="Buscar por nombre y apellido..."
                        value={filterText}
                        onChange={(e) => setFilterText(e.target.value)}
                        className="w-full pl-9 pr-4 py-1.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all text-slate-700 placeholder-slate-400"
                      />
                    </div>
 
                    {canCargar && (
                      <button
                        onClick={handleAddNew}
                        className="px-3.5 py-1.5 bg-[#468DFF] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-[#0511F2] transition-all cursor-pointer shadow-lg shadow-[#468DFF]/10 shrink-0 w-full md:w-auto"
                      >
                        <PlusCircle className="h-3.5 w-3.5" />
                        Agregar Integrante
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Members Grid/List */}
              <div className="bg-white rounded-2xl border border-slate-150 shadow-sm overflow-hidden flex-1 flex flex-col min-h-0 transition-all duration-300 ease-in-out">
                {miembros.length === 0 ? (
                  <div className="flex-grow flex flex-col items-center justify-center p-20 text-center bg-slate-50/10 h-full">
                    <Briefcase className="h-10 w-10 text-slate-350 mx-auto mb-2 shrink-0" />
                    <p className="font-outfit text-sm text-slate-700 font-bold">No hay miembros de equipo registrados</p>
                    <p className="text-[11px] text-slate-400 font-normal mt-1">Registra un nuevo miembro de equipo para comenzar.</p>
                    {canCargar && (
                      <button
                        onClick={handleAddNew}
                        className="mt-3 text-xs text-[#468DFF] hover:underline font-bold block mx-auto"
                      >
                        + Registrar el primero
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="overflow-auto flex-grow">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-150 text-xs font-bold text-slate-400 uppercase tracking-wider">
                          <th className="px-6 py-4 sticky top-0 z-10 bg-slate-50 border-b border-slate-150">Nombre</th>
                          <th className="px-6 py-4 sticky top-0 z-10 bg-slate-50 border-b border-slate-150">CUIT</th>
                          <th className="px-6 py-4 sticky top-0 z-10 bg-slate-50 border-b border-slate-150">Contacto</th>
                          <th className="px-6 py-4 sticky top-0 z-10 bg-slate-50 border-b border-slate-150">Ubicación</th>
                          <th className="px-6 py-4 sticky top-0 z-10 bg-slate-50 border-b border-slate-150">Acceso Login</th>
                          {(canEditar || canEliminar) && <th className="px-6 py-4 text-right sticky top-0 z-10 bg-slate-50 border-b border-slate-150">Acciones</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredMiembros.length === 0 ? (
                          <tr>
                            <td colSpan={(canEditar || canEliminar) ? 6 : 5} className="py-12 px-6 text-center text-slate-400 italic">
                              No se encontraron integrantes que coincidan con la búsqueda.
                            </td>
                          </tr>
                        ) : (
                          filteredMiembros.map((m) => (
                            <tr key={m.id} className="hover:bg-slate-50/50 cursor-pointer transition-colors" onClick={() => { setIsReadOnlyView(true); handleEdit(m.id); }}>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="h-8 w-8 rounded-full bg-[#468DFF]/10 flex items-center justify-center text-[#468DFF] font-bold text-xs shrink-0">
                                    <User className="h-4 w-4" />
                                  </div>
                                  <div>
                                    <span className="font-semibold text-slate-800 text-xs block">{m.full_name}</span>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-xs font-mono text-slate-600">
                                {m.cuit}
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-xs text-slate-600 space-y-1">
                                  <span className="flex items-center gap-1.5">
                                    <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                    {m.phone}
                                  </span>
                                  <span className="flex items-center gap-1.5">
                                    <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                    {m.email}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-xs text-slate-600 flex items-center gap-1.5">
                                  <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                  <span>{m.localidad ? `${m.localidad}, ` : ''}{m.provincia}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                  m.tiene_acceso 
                                    ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' 
                                    : 'bg-slate-100 text-slate-500 border border-slate-200'
                                }`}>
                                  {m.tiene_acceso ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                                  {m.tiene_acceso ? 'Con Acceso' : 'Sin Acceso'}
                                </span>
                              </td>
                              {(canEditar || canEliminar) && (
                                <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                                  <div className="flex items-center justify-end gap-2">
                                    {canEditar ? (
                                      <button
                                        onClick={() => { setIsReadOnlyView(false); handleEdit(m.id); }}
                                        className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-600 transition-all cursor-pointer inline-flex items-center justify-center shadow-sm"
                                        title="Editar"
                                      >
                                        <Edit className="h-4.5 w-4.5" />
                                      </button>
                                    ) : (
                                      <button
                                        onClick={() => { setIsReadOnlyView(true); handleEdit(m.id); }}
                                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-all cursor-pointer inline-flex items-center justify-center shadow-sm"
                                        title="Ver Detalle"
                                      >
                                        <Eye className="h-4.5 w-4.5" />
                                      </button>
                                    )}
                                    {canEliminar && (
                                      <button
                                        onClick={() => handleDelete(m.id, m.full_name, m.profile_id)}
                                        className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition-all cursor-pointer inline-flex items-center justify-center shadow-sm"
                                        title="Eliminar"
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
                )}
              </div>
            </div>
            
          ) : (
            
            // ==========================================
            // VIEW: CREATE / EDIT FORM
            // ==========================================
            <div className="bg-white rounded-2xl border border-slate-150 shadow-sm overflow-hidden flex flex-col max-h-[85vh] animate-fade-in">
              <div className="h-16 px-4 md:px-6 bg-slate-50 border-b border-slate-150 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <button 
                    type="button"
                    onClick={() => handleExitWithoutSave()}
                    className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 cursor-pointer"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                  <span className="font-outfit text-base font-bold text-slate-900">
                    {editingId ? 'Editar Integrante' : 'Agregar Integrante'}
                  </span>
                </div>
                <button 
                  type="button" 
                  onClick={() => handleExitWithoutSave()} 
                  className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-200 cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSave} className="p-6 md:p-8 space-y-8 overflow-y-auto flex-1 scrollbar-thin">
                <fieldset disabled={!canEdit} className="space-y-8">
                  {/* 1. INFORMACIÓN PERSONAL */}
                  <div className="bg-white rounded-2xl border border-slate-150 p-6 md:p-8 shadow-sm space-y-6">
                  <h4 className="font-outfit text-sm font-bold text-slate-800 border-b border-slate-100 pb-1.5 uppercase tracking-wider flex items-center gap-2">
                    <User className="text-[#468DFF] h-4.5 w-4.5" />
                    Información Personal
                  </h4>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="text-xs font-bold text-slate-600 block mb-1">
                        Nombre y Apellido <span className="text-[#468DFF]">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ing. Carlos Gómez"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all text-slate-700"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-600 block mb-1">
                        Correo Electrónico <span className="text-[#468DFF]">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                          <Mail className="h-3.5 w-3.5" />
                        </span>
                        <input
                          type="email"
                          required
                          placeholder="carlos.gomez@consultora.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all text-slate-700"
                        />
                      </div>
                      {editingId && tieneAcceso && (
                        <span className="text-[9px] text-[#468DFF] mt-1 block font-medium">
                          Nota: Modificar el correo electrónico también actualizará la dirección de inicio de sesión del integrante.
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid md:grid-cols-3 gap-6">
                    <div>
                      <label className="text-xs font-bold text-slate-600 block mb-1">
                        CUIT <span className="text-[#468DFF]">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="20304567891"
                        value={cuit}
                        onChange={handleCuitChange}
                        className={`w-full border ${cuitError ? 'border-red-400 focus:border-red-500' : 'border-slate-200 focus:border-[#468DFF]'} rounded-xl px-3.5 py-2 text-sm focus:outline-none bg-slate-50/50 transition-all text-slate-700`}
                      />
                      {cuitError && (
                        <span className="text-[10px] text-red-600 mt-1 block font-semibold">{cuitError}</span>
                      )}
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-600 block mb-1">
                        Teléfono <span className="text-[#468DFF]">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="1144445555"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all text-slate-700"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-600 block mb-1">
                        Fecha de Nacimiento
                      </label>
                      <input
                        type="date"
                        value={birthDate}
                        onChange={(e) => setBirthDate(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all text-slate-700"
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-3 gap-6">
                    <div>
                      <label className="text-xs font-bold text-slate-600 block mb-1">
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
                      <label className="text-xs font-bold text-slate-600 block mb-1">
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
                        <option value="" disabled>{!provincia ? 'Selecciona provincia primero' : 'Selecciona un partido'}</option>
                        {partidosList.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-600 block mb-1">
                        Localidad <span className="text-slate-400">(Opcional)</span>
                      </label>
                      <select
                        disabled={!partido || localidadesList.length === 0}
                        value={localidad}
                        onChange={(e) => setLocalidad(e.target.value)}
                        className="w-full max-w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all text-slate-700 cursor-pointer disabled:opacity-50"
                      >
                        <option value="">{!partido ? 'Selecciona partido primero' : 'Selecciona localidad (Opcional)'}</option>
                        {localidadesList.map((loc) => (
                          <option key={loc} value={loc}>
                            {loc}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* 2. ACCESO Y LOGIN */}
                <div className="bg-white rounded-2xl border border-slate-150 p-6 md:p-8 shadow-sm space-y-6">
                  <h4 className="font-outfit text-sm font-bold text-slate-800 border-b border-slate-100 pb-1.5 uppercase tracking-wider flex items-center gap-2">
                    <Lock className="text-[#468DFF] h-4.5 w-4.5" />
                    Acceso a la plataforma
                  </h4>

                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        id="tieneAcceso"
                        checked={tieneAcceso}
                        onChange={(e) => setTieneAcceso(e.target.checked)}
                        className="h-4.5 w-4.5 rounded border-slate-300 text-[#468DFF] focus:ring-[#468DFF] mt-0.5 cursor-pointer"
                      />
                      <div>
                        <label htmlFor="tieneAcceso" className="font-bold text-xs text-slate-800 cursor-pointer block select-none">
                          Habilitar acceso de inicio de sesión (Login)
                        </label>
                        <p className="text-[10px] text-slate-500 leading-relaxed mt-0.5">
                          Si se activa, el integrante podrá ingresar a la plataforma utilizando su correo y la contraseña asignada. Compartirá la vista de tus clientes pero no podrá ver la facturación ni editar el perfil del dueño.
                        </p>
                        {editingId && initialValues?.tieneAcceso && !tieneAcceso && (
                          <p className="text-[10px] text-red-600 font-bold mt-1.5 flex items-center gap-1">
                            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                            ¡Atención! Al guardar, se eliminarán las credenciales de inicio de sesión de este integrante permanentemente.
                          </p>
                        )}
                      </div>
                    </div>

                    {tieneAcceso && (
                      <div className="grid md:grid-cols-2 gap-6 pt-2">
                        <div>
                          <label className="text-xs font-bold text-slate-600 block mb-1">
                            {hasLogin ? 'Nueva Contraseña (Opcional)' : 'Contraseña de Acceso'} <span className="text-[#468DFF]">{!hasLogin && '*'}</span>
                          </label>
                          <div className="relative">
                            <input
                              type={showPassword ? 'text' : 'password'}
                              required={tieneAcceso && !hasLogin}
                              placeholder={hasLogin ? 'Dejar en blanco para mantener' : 'Mínimo 8 caracteres, 1 mayúscula y 1 número'}
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              className="w-full border border-slate-200 rounded-xl py-3 pl-4 pr-12 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all text-slate-700"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-700 cursor-pointer"
                            >
                              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-1">
                            Debe tener al menos 8 caracteres, incluir al menos una letra mayúscula y al menos un número.
                          </p>
                        </div>
 
                        <div>
                          <label className="text-xs font-bold text-slate-600 block mb-1">
                            {hasLogin ? 'Confirmar Nueva Contraseña (Opcional)' : 'Confirmar Contraseña'} <span className="text-[#468DFF]">{!hasLogin && '*'}</span>
                          </label>
                          <div className="relative">
                            <input
                              type={showConfirmPassword ? 'text' : 'password'}
                              required={tieneAcceso && !hasLogin}
                              placeholder={hasLogin ? 'Repetir nueva contraseña' : 'Repetir contraseña'}
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                              className="w-full border border-slate-200 rounded-xl py-3 pl-4 pr-12 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all text-slate-700"
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
                    )}
                  </div>
                </div>

                {/* PERMISOS DE EDICIÓN (Se muestra si tiene acceso habilitado) */}
                {tieneAcceso && (
                  <div className="bg-white rounded-2xl border border-slate-150 p-6 md:p-8 shadow-sm space-y-6 animate-fade-in">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <h4 className="font-outfit text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                        <Lock className="text-[#468DFF] h-4.5 w-4.5" />
                        Permisos de Edición por Sección
                      </h4>
                      <button
                        type="button"
                        onClick={() => {
                          const allSelected = Object.values(permisos).every(v => v.cargar && v.editar && v.eliminar);
                          const targetVal = !allSelected;
                          setPermisos({
                            empresas: { cargar: targetVal, editar: targetVal, eliminar: targetVal },
                            equipo: { cargar: targetVal, editar: targetVal, eliminar: targetVal },
                            programa: { cargar: targetVal, editar: targetVal, eliminar: targetVal },
                            capacitacion: { cargar: targetVal, editar: targetVal, eliminar: targetVal },
                            correctivas: { cargar: targetVal, editar: targetVal, eliminar: targetVal },
                            extintores: { cargar: targetVal, editar: targetVal, eliminar: targetVal },
                            control_electrico: { cargar: targetVal, editar: targetVal, eliminar: targetVal },
                            visitas: { cargar: targetVal, editar: targetVal, eliminar: targetVal },
                            avisos: { cargar: targetVal, editar: targetVal, eliminar: targetVal },
                            legajo: { cargar: targetVal, editar: targetVal, eliminar: targetVal },
                            nomina: { cargar: targetVal, editar: targetVal, eliminar: targetVal }
                          });
                        }}
                        className="text-[10px] font-bold text-[#468DFF] hover:underline cursor-pointer bg-transparent border-none outline-none"
                      >
                        {Object.values(permisos).every(v => v.cargar && v.editar && v.eliminar) ? 'Deseleccionar Todos' : 'Seleccionar Todos'}
                      </button>
                    </div>

                    <div className="space-y-3">
                      {/* Header row for larger screens */}
                      <div className="hidden md:grid md:grid-cols-4 gap-4 px-4 py-2 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        <div>Sección</div>
                        <div className="text-center">Cargar</div>
                        <div className="text-center">Editar</div>
                        <div className="text-center">Eliminar</div>
                      </div>

                      {[
                        { key: 'empresas', name: 'Clientes / Empresas' },
                        { key: 'equipo', name: 'Equipo de Trabajo' },
                        { key: 'programa', name: 'Prog. de Gestión Anual' },
                        { key: 'capacitacion', name: 'Prog. de Capacitación' },
                        { key: 'correctivas', name: 'Acciones Correctivas' },
                        { key: 'extintores', name: 'Control de Extintores' },
                        { key: 'control_electrico', name: 'Control Eléctrico' },
                        { key: 'visitas', name: 'Constancias de Visita' },
                        { key: 'avisos', name: 'Avisos de Riesgo' },
                        { key: 'legajo', name: 'Legajo Técnico' },
                        { key: 'nomina', name: 'Nómina de Personal' }
                      ].map((section) => (
                        <div key={section.key} className="grid grid-cols-1 md:grid-cols-4 gap-2 md:gap-4 items-center p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-all select-none">
                          <div className="text-xs font-bold text-slate-700">{section.name}</div>
                          
                          <div className="flex items-center justify-between md:justify-center gap-2">
                            <span className="md:hidden text-[10px] font-bold text-slate-400 uppercase">Cargar</span>
                            <input
                              type="checkbox"
                              checked={permisos[section.key]?.cargar ?? false}
                              onChange={(e) => setPermisos(prev => ({
                                ...prev,
                                [section.key]: { ...prev[section.key], cargar: e.target.checked }
                              }))}
                              className="h-4.5 w-4.5 rounded border-slate-300 text-[#468DFF] focus:ring-[#468DFF] cursor-pointer"
                            />
                          </div>

                          <div className="flex items-center justify-between md:justify-center gap-2">
                            <span className="md:hidden text-[10px] font-bold text-slate-400 uppercase">Editar</span>
                            <input
                              type="checkbox"
                              checked={permisos[section.key]?.editar ?? false}
                              onChange={(e) => setPermisos(prev => ({
                                ...prev,
                                [section.key]: { ...prev[section.key], editar: e.target.checked }
                              }))}
                              className="h-4.5 w-4.5 rounded border-slate-300 text-[#468DFF] focus:ring-[#468DFF] cursor-pointer"
                            />
                          </div>

                          <div className="flex items-center justify-between md:justify-center gap-2">
                            <span className="md:hidden text-[10px] font-bold text-slate-400 uppercase">Eliminar</span>
                            <input
                              type="checkbox"
                              checked={permisos[section.key]?.eliminar ?? false}
                              onChange={(e) => setPermisos(prev => ({
                                ...prev,
                                [section.key]: { ...prev[section.key], eliminar: e.target.checked }
                              }))}
                              className="h-4.5 w-4.5 rounded border-slate-300 text-[#468DFF] focus:ring-[#468DFF] cursor-pointer"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. MATRÍCULAS PROFESIONALES */}
                <div className="bg-white rounded-2xl border border-slate-150 p-6 md:p-8 shadow-sm space-y-6">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                    <h4 className="font-outfit text-sm font-bold text-slate-800 border-b border-slate-100 pb-1.5 uppercase tracking-wider flex items-center gap-2">
                      <Award className="text-[#468DFF] h-4.5 w-4.5" />
                      Matrículas Profesionales
                    </h4>
                    {canEdit && (
                      <button
                        type="button"
                        onClick={handleAddMatricula}
                        className="py-2 px-3.5 rounded-xl border border-[#468DFF]/40 hover:bg-[#468DFF] hover:text-white text-center text-[#468DFF] font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-sm bg-white hover:border-[#468DFF] active:scale-[0.98]"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Agregar Matrícula
                      </button>
                    )}
                  </div>

                  <div className="space-y-8 divide-y divide-slate-100">
                    {matriculas.map((mat, idx) => (
                      <div key={idx} className={`space-y-6 ${idx > 0 ? 'pt-8' : ''}`}>
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-[#468DFF] bg-[#468DFF]/10 border border-[#468DFF]/15 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                            Matrícula #{idx + 1}
                          </span>
                          {canEdit && matriculas.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveMatricula(idx)}
                              className="text-[10px] font-bold text-red-500 hover:text-red-700 flex items-center gap-1.5 px-2 py-1 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Minus className="h-3.5 w-3.5" />
                              Quitar Matrícula
                            </button>
                          )}
                        </div>

                        <div>
                          <label className="text-xs font-bold text-slate-600 block mb-1">
                            Colegio / Consejo Emisor
                          </label>
                          <input
                            type="text"
                            placeholder="COPIME, CPSH, etc."
                            value={mat.institucion}
                            onChange={(e) => handleMatriculaChange(idx, 'institucion', e.target.value)}
                            className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all text-slate-700"
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <label className="text-xs font-bold text-slate-600 block mb-1">
                              Número de Matrícula
                            </label>
                            <input
                              type="text"
                              placeholder="L000000"
                              value={mat.numero}
                              onChange={(e) => handleMatriculaChange(idx, 'numero', e.target.value)}
                              className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all text-slate-700"
                            />
                          </div>

                          <div>
                            <label className="text-xs font-bold text-slate-600 block mb-1">
                              Fecha de Vencimiento
                            </label>
                            <input
                              type="date"
                              value={mat.vencimiento}
                              onChange={(e) => handleMatriculaChange(idx, 'vencimiento', e.target.value)}
                              className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all text-slate-700"
                            />
                          </div>
                        </div>

                        {/* Photos of License (Frente and Dorso) */}
                        <div className="grid md:grid-cols-2 gap-6">
                          {/* Frente */}
                          <div className="border border-slate-150 rounded-2xl p-4 bg-slate-50/50 flex flex-col justify-center">
                            <div className="max-w-[280px] w-full mx-auto">
                              <ImageUploadZone
                                label="Foto de Matrícula (Frente)"
                                preview={mat.fotoFrentePreview}
                                onFileChange={(file) => handleMatriculaFileChange(idx, 'fotoFrente', 'fotoFrentePreview', file)}
                                onClear={() => handleMatriculaFileClear(idx, 'Frente')}
                                disabled={!canEdit}
                                maxSizeMB={5}
                                onToast={triggerToast}
                              />
                            </div>
                          </div>

                          {/* Dorso */}
                          <div className="border border-slate-150 rounded-2xl p-4 bg-slate-50/50 flex flex-col justify-center">
                            <div className="max-w-[280px] w-full mx-auto">
                              <ImageUploadZone
                                label="Foto de Matrícula (Dorso)"
                                preview={mat.fotoDorsoPreview}
                                onFileChange={(file) => handleMatriculaFileChange(idx, 'fotoDorso', 'fotoDorsoPreview', file)}
                                onClear={() => handleMatriculaFileClear(idx, 'Dorso')}
                                disabled={!canEdit}
                                maxSizeMB={5}
                                onToast={triggerToast}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 4. FIRMA DIGITAL */}
                <div className="bg-white rounded-2xl border border-slate-150 p-6 md:p-8 shadow-sm space-y-6">
                  <h4 className="font-outfit text-sm font-bold text-slate-800 border-b border-slate-100 pb-1.5 uppercase tracking-wider flex items-center gap-2">
                    <FileText className="text-[#468DFF] h-4.5 w-4.5" />
                    Firma Digital
                  </h4>

                  <div className="border border-slate-150 rounded-2xl p-4 bg-slate-50/50 max-w-[320px] mx-auto flex flex-col justify-center">
                    <div className="w-full mx-auto">
                      <ImageUploadZone
                        label="Imagen de Firma Digital (Opcional)"
                        preview={fotoFirmaPreview}
                        onFileChange={(file) => handleImageChange(file, setFotoFirma, setFotoFirmaPreview)}
                        onClear={() => {
                          setFotoFirma(null);
                          setFotoFirmaPreview('');
                        }}
                        disabled={!canEdit}
                        maxSizeMB={5}
                        onToast={triggerToast}
                      />
                    </div>
                  </div>
                </div>

                </fieldset>

                {/* BOTÓN UNIFICADO DE ACCIÓN */}
                <div className="flex justify-between items-center pt-6 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => handleExitWithoutSave()}
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
                        {canEliminar && editingId && (
                          <button
                            type="button"
                            onClick={() => handleDelete(editingId, fullName, miembros.find(m => m.id === editingId)?.profile_id || null)}
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

      {/* TOAST NOTIFICATION */}
      {toast.show && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 bg-slate-900 border border-slate-800 px-4 py-3.5 rounded-xl shadow-2xl animate-fade-in-up">
          {toast.type === 'success' ? (
            <div className="h-5 w-5 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <Check className="h-3 w-3" />
            </div>
          ) : (
            <div className="h-5 w-5 rounded-full bg-red-500/10 flex items-center justify-center text-red-400">
              <AlertTriangle className="h-3 w-3" />
            </div>
          )}
          <span className="text-xs font-bold text-white tracking-wide">{toast.message}</span>
        </div>
      )}

      {/* MODAL DIALOG ALERT */}
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
      
    </div>
  );
}
