// src/app/[tenant-slug]/equipo/page.js
'use client';

import React, { useState, useEffect } from 'react';
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
  Menu
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

export default function EquipoPage({ params }) {
  const tenantSlug = params['tenant-slug'];
  
  // Active view: 'list' or 'form'
  const [view, setView] = useState('list');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDevMode, setIsDevMode] = useState(false);

  // Tenant and Profile data
  const [profile, setProfile] = useState(null);
  const [tenant, setTenant] = useState(null);

  // List of members
  const [miembros, setMiembros] = useState([]);

  // Form states
  const [editingId, setEditingId] = useState(null);
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

  // Modals / Toasts
  const [modalAlert, setModalAlert] = useState({ show: false, title: '', message: '', type: 'info', onConfirm: null });
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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

  // Signed URLs helper
  const getSignedUrl = async (bucket, pathOrUrl) => {
    if (!pathOrUrl) return '';
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
        .createSignedUrl(path, 3600);
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
    setProfile({ full_name: 'Profesional de SySO (Mock)', role: 'owner' });
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
        role: 'inspector'
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
        role: 'inspector'
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
      
      // Bloquear acceso a inspectores / supervisores
      if (prof.role !== 'owner' && prof.role !== 'admin') {
        window.location.href = `/${tenantSlug}/dashboard`;
        return;
      }
      
      setProfile(prof);

      // Load Tenant
      const { data: ten, error: tErr } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', prof.tenant_id)
        .single();
      if (tErr) throw tErr;
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
    try {
      await supabase.auth.signOut();
      window.location.href = '/login';
    } catch (err) {
      window.location.href = '/login';
    }
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
  const handleImageChange = (e, setFile, setPreview) => {
    const file = e.target.files[0];
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
        fotoDorsoPreview: '',
        fotoFrentePath: '',
        fotoDorsoPath: ''
      }
    ]);
  };

  const handleRemoveMatricula = (index) => {
    setMatriculas(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleMatriculaChange = (index, field, value) => {
    setMatriculas(prev => prev.map((m, idx) => idx === index ? { ...m, [field]: value } : m));
  };

  const handleMatriculaFileChange = (index, fileField, previewField, e) => {
    const file = e.target.files[0];
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
          await loadRealData();
        } catch (err) {
          console.error('Error deleting member:', err);
          triggerToast(err.message || 'Error al eliminar el miembro de equipo.', 'error');
        } finally {
          setLoading(false);
          closeAlert();
        }
      }
    );
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);

    // General Validations
    if (!fullName || !email || !phone || !cuit || !provincia || !partido || !birthDate) {
      triggerToast('Por favor completa todos los campos obligatorios (*).', 'error');
      setSaving(false);
      return;
    }

    if (cuit.length !== 11) {
      triggerToast('El CUIT debe contener exactamente 11 números enteros.', 'error');
      setSaving(false);
      return;
    }

    if (tieneAcceso) {
      if (!editingId && !password) {
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
          body: JSON.stringify({ email, password, full_name: fullName, role: 'inspector' })
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
        birth_date: birthDate,
        provincia,
        partido,
        localidad: localidad || null,
        tiene_acceso: tieneAcceso,
        profile_id: linkedProfileId,
        signature_url: finalSignatureUrl
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

  const handleExitWithoutSave = () => {
    if (view === 'list') {
      window.location.href = `/${tenantSlug}/dashboard`;
      return;
    }

    // Checking dirty state
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

    const isDirty = 
      fullName !== (initialValues?.fullName || '') ||
      email !== (initialValues?.email || '') ||
      cuit !== (initialValues?.cuit || '') ||
      phone !== (initialValues?.phone || '') ||
      birthDate !== (initialValues?.birthDate || '') ||
      provincia !== (initialValues?.provincia || '') ||
      partido !== (initialValues?.partido || '') ||
      localidad !== (initialValues?.localidad || '') ||
      tieneAcceso !== (initialValues?.tieneAcceso || false) ||
      signatureUrl !== (initialValues?.signatureUrl || '') ||
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
      fotoFirma !== null ||
      matriculas.some(m => m.fotoFrente !== null || m.fotoDorso !== null);

    if (isDirty) {
      const confirmExit = window.confirm('Tienes cambios sin guardar. ¿Deseas descartarlos y volver al listado?');
      if (!confirmExit) return;
    }

    setView('list');
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
                <a href={`/${tenantSlug}/empresas`} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-[#468DFF] font-semibold text-sm transition-all">
                  <Users className="h-4 w-4" />
                  Clientes
                </a>
                {(profile?.role === 'owner' || profile?.role === 'admin') && (
                  <a href="#" className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[#468DFF] text-white font-semibold text-sm transition-all shadow-md shadow-[#468DFF]/10">
                    <Briefcase className="h-4 w-4" />
                    Equipo de Trabajo
                  </a>
                )}
                <a href={`/${tenantSlug}/programa`} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-[#468DFF] font-semibold text-sm transition-all">
                  <Calendar className="h-4 w-4" />
                  Programa de Gestión Anual
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
            <a href={`/${tenantSlug}/empresas`} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-[#468DFF] font-semibold text-sm transition-all">
              <Users className="h-4 w-4" />
              Clientes
            </a>
            {(profile?.role === 'owner' || profile?.role === 'admin') && (
              <a href="#" className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[#468DFF] text-white font-semibold text-sm transition-all shadow-md shadow-[#468DFF]/10">
                <Briefcase className="h-4 w-4" />
                Equipo de Trabajo
              </a>
            )}
            <a href={`/${tenantSlug}/programa`} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-[#468DFF] font-semibold text-sm transition-all">
              <Calendar className="h-4 w-4" />
              Programa de Gestión Anual
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

      {/* Main Content Area */}
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
              <Briefcase className="h-5 w-5 text-[#468DFF]" />
              Equipo de Trabajo
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
              <p className="text-sm text-slate-500 font-medium">Cargando información del equipo...</p>
            </div>
          ) : view === 'list' ? (
            
            // ==========================================
            // VIEW: MEMBERS LIST (TABLE)
            // ==========================================
            <div className="space-y-6">
              
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-outfit text-xl font-extrabold text-slate-800 tracking-tight">Integrantes del Equipo</h3>
                  <p className="text-xs text-slate-500 mt-1">Administra los técnicos, licenciados y colaboradores asignados a tu consultora.</p>
                </div>
                <button
                  onClick={handleAddNew}
                  className="py-2.5 px-4 rounded-xl bg-[#468DFF] hover:bg-[#0511F2] text-white text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-blue-500/10 active:scale-[0.98] cursor-pointer"
                >
                  <PlusCircle className="h-4.5 w-4.5" />
                  Agregar Integrante
                </button>
              </div>

              {/* Members Grid/List */}
              {miembros.length === 0 ? (
                <div className="bg-white border border-slate-200/80 rounded-2xl p-16 text-center shadow-sm">
                  <Briefcase className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                  <h4 className="text-base font-bold text-slate-800">No hay integrantes cargados</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto mt-2 leading-relaxed">
                    Carga el personal técnico de higiene, seguridad y ambiente que trabaja en tu equipo para asignarlos como responsables.
                  </p>
                  <button
                    onClick={handleAddNew}
                    className="mt-6 py-2 px-4 rounded-xl border border-slate-300 hover:border-slate-400 text-slate-600 hover:text-slate-800 text-xs font-bold transition-all inline-flex items-center gap-2 bg-slate-50 shadow-sm"
                  >
                    Agregar mi primer miembro
                  </button>
                </div>
              ) : (
                <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-150 bg-slate-50/75">
                          <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">Nombre</th>
                          <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">CUIT</th>
                          <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">Contacto</th>
                          <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">Ubicación</th>
                          <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">Acceso Login</th>
                          <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-500 text-right">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {miembros.map((m) => (
                          <tr key={m.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-[#468DFF]/10 flex items-center justify-center text-[#468DFF] font-bold text-xs">
                                  {m.full_name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <span className="font-semibold text-slate-800 text-xs block">{m.full_name}</span>
                                  <span className="text-[10px] text-slate-400 block">{m.email}</span>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-xs font-mono text-slate-600">
                              {m.cuit}
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-xs text-slate-600 space-y-0.5">
                                <span className="flex items-center gap-1.5">
                                  <Phone className="h-3 w-3 text-slate-400 shrink-0" />
                                  {m.phone}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-xs text-slate-600">
                              {m.localidad ? `${m.localidad}, ` : ''}{m.provincia}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                m.tiene_acceso 
                                  ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' 
                                  : 'bg-slate-100 text-slate-500 border border-slate-200'
                              }`}>
                                {m.tiene_acceso ? 'Con Acceso' : 'Solo Registro'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="inline-flex items-center gap-2">
                                <button
                                  onClick={() => handleEdit(m.id)}
                                  className="p-1.5 rounded-lg border border-slate-200 hover:border-slate-300 text-slate-500 hover:text-slate-800 transition-colors bg-white shadow-sm cursor-pointer"
                                  title="Editar"
                                >
                                  <Edit className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDelete(m.id, m.full_name, m.profile_id)}
                                  className="p-1.5 rounded-lg border border-red-200 hover:border-red-300 text-red-500 hover:text-red-700 transition-colors bg-white shadow-sm cursor-pointer"
                                  title="Eliminar"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
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
            // VIEW: CREATE / EDIT FORM
            // ==========================================
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-300/60 pb-5">
                <button
                  onClick={handleExitWithoutSave}
                  className="flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-850 transition-colors py-2 px-3.5 rounded-xl border border-slate-350 bg-white shadow-sm cursor-pointer"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Volver al listado
                </button>
                <h3 className="font-outfit text-xl font-extrabold text-slate-900 tracking-tight">
                  {editingId ? 'Editar Integrante' : 'Agregar Integrante'}
                </h3>
              </div>

              <form onSubmit={handleSave} className="space-y-8">
                
                {/* 1. INFORMACIÓN PERSONAL */}
                <div className="bg-white border border-slate-200/80 rounded-2xl p-6 md:p-8 shadow-sm space-y-6">
                  <h4 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
                    <User className="text-[#468DFF] h-4.5 w-4.5" />
                    Información Personal
                  </h4>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                        Nombre y Apellido <span className="text-[#468DFF]">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ing. Carlos Gómez"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 focus:border-[#468DFF] focus:ring-1 focus:ring-[#468DFF] rounded-xl py-3 px-4 text-xs text-slate-800 focus:outline-none transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
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
                          className="w-full bg-slate-50 border border-slate-300 focus:border-[#468DFF] focus:ring-1 focus:ring-[#468DFF] text-slate-800 rounded-xl py-3 pl-10 pr-4 text-xs focus:outline-none transition-all"
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
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                        CUIT (11 números) <span className="text-[#468DFF]">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="20304567891"
                        value={cuit}
                        onChange={handleCuitChange}
                        className={`w-full bg-slate-50 border ${cuitError ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500' : 'border-slate-300 focus:border-[#468DFF] focus:ring-1 focus:ring-[#468DFF]'} rounded-xl py-3 px-4 text-xs text-slate-800 focus:outline-none transition-all`}
                      />
                      {cuitError && (
                        <span className="text-[10px] text-red-600 mt-1 block font-semibold">{cuitError}</span>
                      )}
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                        Teléfono <span className="text-[#468DFF]">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="1144445555"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 focus:border-[#468DFF] focus:ring-1 focus:ring-[#468DFF] rounded-xl py-3 px-4 text-xs text-slate-800 focus:outline-none transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                        Fecha de Nacimiento <span className="text-[#468DFF]">*</span>
                      </label>
                      <input
                        type="date"
                        required
                        value={birthDate}
                        onChange={(e) => setBirthDate(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 focus:border-[#468DFF] focus:ring-1 focus:ring-[#468DFF] rounded-xl py-3 px-3 text-xs text-slate-800 focus:outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
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
                        className="w-full bg-slate-50 border border-slate-300 focus:border-[#468DFF] focus:ring-1 focus:ring-[#468DFF] rounded-xl py-3 px-4 text-xs text-slate-800 focus:outline-none cursor-pointer transition-all"
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
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
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
                        className="w-full bg-slate-50 border border-slate-300 focus:border-[#468DFF] focus:ring-1 focus:ring-[#468DFF] rounded-xl py-3 px-4 text-xs text-slate-800 focus:outline-none cursor-pointer transition-all disabled:opacity-50"
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
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                        Localidad <span className="text-slate-400">(Opcional)</span>
                      </label>
                      <select
                        disabled={!partido || localidadesList.length === 0}
                        value={localidad}
                        onChange={(e) => setLocalidad(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 focus:border-[#468DFF] focus:ring-1 focus:ring-[#468DFF] rounded-xl py-3 px-4 text-xs text-slate-800 focus:outline-none cursor-pointer transition-all disabled:opacity-50"
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
                <div className="bg-white border border-slate-200/80 rounded-2xl p-6 md:p-8 shadow-sm space-y-6">
                  <h4 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
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
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                            {editingId ? 'Nueva Contraseña (Opcional)' : 'Contraseña de Acceso'} <span className="text-[#468DFF]">{!editingId && '*'}</span>
                          </label>
                          <div className="relative">
                            <input
                              type={showPassword ? 'text' : 'password'}
                              required={tieneAcceso && !editingId}
                              placeholder={editingId ? 'Dejar en blanco para mantener' : 'Mínimo 8 caracteres, 1 mayúscula y 1 número'}
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-300 focus:border-[#468DFF] focus:ring-1 focus:ring-[#468DFF] rounded-xl py-3 pl-4 pr-12 text-xs text-slate-800 focus:outline-none transition-all"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-650"
                            >
                              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-1">
                            Debe tener al menos 8 caracteres, incluir al menos una letra mayúscula y al menos un número.
                          </p>
                        </div>
 
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                            {editingId ? 'Confirmar Nueva Contraseña (Opcional)' : 'Confirmar Contraseña'} <span className="text-[#468DFF]">{!editingId && '*'}</span>
                          </label>
                          <div className="relative">
                            <input
                              type={showConfirmPassword ? 'text' : 'password'}
                              required={tieneAcceso && !editingId}
                              placeholder={editingId ? 'Repetir nueva contraseña' : 'Repetir contraseña'}
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-300 focus:border-[#468DFF] focus:ring-1 focus:ring-[#468DFF] rounded-xl py-3 pl-4 pr-12 text-xs text-slate-800 focus:outline-none transition-all"
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-650"
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

                {/* 3. MATRÍCULAS PROFESIONALES */}
                <div className="bg-white border border-slate-200/80 rounded-2xl p-6 md:p-8 shadow-sm space-y-6">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                    <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Award className="text-[#468DFF] h-4.5 w-4.5" />
                      Matrículas Profesionales
                    </h4>
                    <button
                      type="button"
                      onClick={handleAddMatricula}
                      className="py-1.5 px-3 rounded-lg border border-slate-300 hover:border-slate-400 text-slate-600 hover:text-slate-800 text-[10px] font-bold transition-all flex items-center gap-1.5 bg-slate-50 shadow-sm"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Agregar Matrícula
                    </button>
                  </div>

                  <div className="space-y-8 divide-y divide-slate-100">
                    {matriculas.map((mat, idx) => (
                      <div key={idx} className={`space-y-6 ${idx > 0 ? 'pt-8' : ''}`}>
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-[#468DFF] bg-blue-500/5 px-2.5 py-1 rounded-md">
                            Matrícula #{idx + 1}
                          </span>
                          {matriculas.length > 1 && (
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

                        <div className="grid md:grid-cols-3 gap-6">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                              Colegio / Consejo Emisor
                            </label>
                            <input
                              type="text"
                              placeholder="COPIME, CPSH, etc."
                              value={mat.institucion}
                              onChange={(e) => handleMatriculaChange(idx, 'institucion', e.target.value)}
                              className="w-full bg-slate-50 border border-slate-300 focus:border-[#468DFF] focus:ring-1 focus:ring-[#468DFF] rounded-xl py-3 px-4 text-xs text-slate-800 focus:outline-none transition-all"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                              Número de Matrícula
                            </label>
                            <input
                              type="text"
                              placeholder="L000000"
                              value={mat.numero}
                              onChange={(e) => handleMatriculaChange(idx, 'numero', e.target.value)}
                              className="w-full bg-slate-50 border border-slate-300 focus:border-[#468DFF] focus:ring-1 focus:ring-[#468DFF] rounded-xl py-3 px-4 text-xs text-slate-800 focus:outline-none transition-all"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                              Fecha de Vencimiento
                            </label>
                            <input
                              type="date"
                              value={mat.vencimiento}
                              onChange={(e) => handleMatriculaChange(idx, 'vencimiento', e.target.value)}
                              className="w-full bg-slate-50 border border-slate-300 focus:border-[#468DFF] focus:ring-1 focus:ring-[#468DFF] rounded-xl py-3 px-3 text-xs text-slate-800 focus:outline-none transition-all"
                            />
                          </div>
                        </div>

                        {/* Photos of License (Frente and Dorso) */}
                        <div className="grid md:grid-cols-2 gap-6">
                          {/* Frente */}
                          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                              Foto de Matrícula (Frente)
                            </label>
                            {mat.fotoFrentePreview ? (
                              <div className="relative aspect-[3/2] w-full max-w-[280px] bg-slate-100 rounded-lg overflow-hidden border border-slate-300 mx-auto">
                                <img src={mat.fotoFrentePreview} alt="Frente" className="w-full h-full object-cover" />
                                <button
                                  type="button"
                                  onClick={() => handleMatriculaFileClear(idx, 'Frente')}
                                  className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            ) : (
                              <div className="relative border-2 border-dashed border-slate-300 hover:border-slate-400 rounded-lg p-6 text-center cursor-pointer transition-colors max-w-[280px] mx-auto bg-white">
                                <input
                                  type="file"
                                  accept="image/jpeg,image/jpg,image/png"
                                  onChange={(e) => handleMatriculaFileChange(idx, 'fotoFrente', 'fotoFrentePreview', e)}
                                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                />
                                <Upload className="h-6 w-6 text-slate-400 mx-auto mb-2" />
                                <span className="text-[10px] font-bold text-slate-600 block">Subir Foto Frente</span>
                                <span className="text-[8px] text-slate-400 block mt-1">Formatos JPG, PNG</span>
                              </div>
                            )}
                          </div>

                          {/* Dorso */}
                          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                              Foto de Matrícula (Dorso)
                            </label>
                            {mat.fotoDorsoPreview ? (
                              <div className="relative aspect-[3/2] w-full max-w-[280px] bg-slate-100 rounded-lg overflow-hidden border border-slate-300 mx-auto">
                                <img src={mat.fotoDorsoPreview} alt="Dorso" className="w-full h-full object-cover" />
                                <button
                                  type="button"
                                  onClick={() => handleMatriculaFileClear(idx, 'Dorso')}
                                  className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            ) : (
                              <div className="relative border-2 border-dashed border-slate-300 hover:border-slate-400 rounded-lg p-6 text-center cursor-pointer transition-colors max-w-[280px] mx-auto bg-white">
                                <input
                                  type="file"
                                  accept="image/jpeg,image/jpg,image/png"
                                  onChange={(e) => handleMatriculaFileChange(idx, 'fotoDorso', 'fotoDorsoPreview', e)}
                                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                />
                                <Upload className="h-6 w-6 text-slate-400 mx-auto mb-2" />
                                <span className="text-[10px] font-bold text-slate-600 block">Subir Foto Dorso</span>
                                <span className="text-[8px] text-slate-400 block mt-1">Formatos JPG, PNG</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 4. FIRMA DIGITAL */}
                <div className="bg-white border border-slate-200/80 rounded-2xl p-6 md:p-8 shadow-sm space-y-6">
                  <h4 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
                    <FileText className="text-[#468DFF] h-4.5 w-4.5" />
                    Firma Digital
                  </h4>

                  <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 max-w-[320px] mx-auto">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 text-center">
                      Imagen de Firma Digital <span className="text-slate-400">(Opcional)</span>
                    </label>
                    {fotoFirmaPreview ? (
                      <div className="relative aspect-[4/2] w-full bg-white rounded-lg overflow-hidden border border-slate-300 mx-auto flex items-center justify-center p-4">
                        <img src={fotoFirmaPreview} alt="Firma digital" className="max-w-full max-h-full object-contain" />
                        <button
                          type="button"
                          onClick={() => {
                            setFotoFirma(null);
                            setFotoFirmaPreview('');
                          }}
                          className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="relative border-2 border-dashed border-slate-300 hover:border-slate-400 rounded-lg p-6 text-center cursor-pointer transition-colors bg-white">
                        <input
                          type="file"
                          accept="image/jpeg,image/jpg,image/png"
                          onChange={(e) => handleImageChange(e, setFotoFirma, setFotoFirmaPreview)}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <Upload className="h-6 w-6 text-slate-400 mx-auto mb-2" />
                        <span className="text-[10px] font-bold text-slate-600 block">Subir Firma</span>
                        <span className="text-[8px] text-slate-400 block mt-1">Formatos JPG, PNG con fondo blanco o transparente</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* BOTÓN UNIFICADO DE ACCIÓN */}
                <div className="flex items-center justify-end gap-4 border-t border-slate-200 pt-6">
                  <button
                    type="button"
                    onClick={handleExitWithoutSave}
                    className="py-3 px-6 rounded-xl border border-slate-300 hover:border-slate-400 text-slate-600 hover:text-slate-800 text-xs font-bold transition-all bg-white cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="py-3 px-8 rounded-xl bg-[#468DFF] hover:bg-[#0511F2] text-white text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-blue-500/10 active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Guardando...
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4" />
                        Guardar
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </main>

      {/* TOAST NOTIFICATION */}
      {toast.show && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 bg-slate-900 border border-slate-850 px-4 py-3.5 rounded-xl shadow-2xl animate-fade-in-up">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 md:p-8 max-w-md w-full shadow-2xl animate-scale-up space-y-4">
            <div className="flex items-start gap-4">
              {modalAlert.type === 'warning' ? (
                <div className="h-10 w-10 rounded-full bg-red-500/10 text-red-600 flex items-center justify-center shrink-0">
                  <AlertTriangle className="h-5 w-5" />
                </div>
              ) : (
                <div className="h-10 w-10 rounded-full bg-blue-500/10 text-[#468DFF] flex items-center justify-center shrink-0">
                  <Info className="h-5 w-5" />
                </div>
              )}
              <div className="space-y-1">
                <h4 className="font-outfit text-base font-extrabold text-slate-900">{modalAlert.title}</h4>
                <p className="text-xs text-slate-500 leading-relaxed font-normal">{modalAlert.message}</p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={closeAlert}
                className="py-2.5 px-4 rounded-xl border border-slate-300 text-slate-600 hover:text-slate-800 text-xs font-bold transition-all bg-white cursor-pointer"
              >
                {modalAlert.onConfirm ? 'Cancelar' : 'Cerrar'}
              </button>
              {modalAlert.onConfirm && (
                <button
                  onClick={modalAlert.onConfirm}
                  className="py-2.5 px-5 rounded-xl bg-red-650 hover:bg-red-750 text-white text-xs font-bold transition-all cursor-pointer shadow-md"
                >
                  Confirmar
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      
    </div>
  );
}
