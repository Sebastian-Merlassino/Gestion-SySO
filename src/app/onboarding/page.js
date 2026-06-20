// src/app/onboarding/page.js
'use client';

import React, { useState, useEffect } from 'react';
import { supabase, fetchAllGeography } from '@/lib/supabase';
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
  PlusCircle
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

export default function OnboardingPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isDevMode, setIsDevMode] = useState(false);
  
  // Notificación de tipo Toast
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const triggerToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 3500);
  };
  
  // Datos del Usuario
  const [currentUser, setCurrentUser] = useState(null);
  const [initialValues, setInitialValues] = useState(null);

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
  const [birthDate, setBirthDate] = useState(''); // Ahora Obligatorio

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
  const [companySlug, setCompanySlug] = useState('');
  const [fotoFirma, setFotoFirma] = useState(null);
  const [fotoFirmaPreview, setFotoFirmaPreview] = useState('');
  const [logo1, setLogo1] = useState(null);
  const [logo1Preview, setLogo1Preview] = useState('');
  const [logo2, setLogo2] = useState(null);
  const [logo2Preview, setLogo2Preview] = useState('');

  // Campos Opcionales - Sitio Web y Redes Sociales de la Empresa
  const [website, setWebsite] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [instagram, setInstagram] = useState('');
  const [facebook, setFacebook] = useState('');
  const [tiktok, setTiktok] = useState('');
  const [youtube, setYoutube] = useState('');

  // Control del modal de contratación de planes
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('free'); // 'free' por defecto

  useEffect(() => {
    // Verificar si las variables de Supabase reales están configuradas
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const isDev = !supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('placeholder');
    if (isDev) {
      setIsDevMode(true);
    }

    // Obtener sesión y datos del perfil del usuario
    const fetchUser = async () => {
      try {
        const cachedEmail = localStorage.getItem('onboarding_email') || '';
        const cachedName = localStorage.getItem('onboarding_full_name') || '';
        if (cachedEmail) setEmail(cachedEmail);
        if (cachedName) setFullName(cachedName);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user && !isDev) {
          window.location.href = '/login';
          return;
        }

        if (user) {
          setCurrentUser(user);
          const emailVal = user.email || cachedEmail || '';
          setEmail(emailVal);

          let nameVal = '';
          // Consultar el perfil de Supabase para obtener el nombre cargado
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', user.id)
            .single();

          if (profile?.full_name) {
            nameVal = profile.full_name;
            setFullName(nameVal);
          } else {
            nameVal = user.user_metadata?.full_name || cachedName || '';
            setFullName(nameVal);
          }

          setInitialValues({
            fullName: nameVal,
            email: emailVal,
            phone: '',
            cuit: '',
            provincia: '',
            partido: '',
            localidad: '',
            birthDate: '',
            companyName: '',
            website: '',
            linkedin: '',
            instagram: '',
            facebook: '',
            tiktok: '',
            youtube: '',
            matriculas: [
              {
                institucion: '',
                numero: '',
                vencimiento: '',
                fotoFrentePreview: '',
                fotoDorsoPreview: ''
              }
            ],
            planId: 'free'
          });
        }
      } catch (e) {
        console.error('Error al recuperar datos del perfil:', e);
      }
    };
    fetchUser();
  }, []);

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
      if (isDevMode) {
        // En modo desarrollo sin variables, mockeamos partidos de prueba
        const mockPartidos = provincia === 'BUENOS AIRES'
          ? ['ADOLFO ALSINA', 'AVELLANEDA', 'TIGRE']
          : ['COMUNA 1', 'COMUNA 14'];
        setPartidosList(mockPartidos.sort());
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

    const loadLocalidades = async () => {
      if (!partido) {
        setLocalidadesList([]);
        setLocalidad('');
        return;
      }
      if (isDevMode) {
        // En modo desarrollo sin variables, mockeamos localidades de prueba
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

  // Autogenerar slug en base al nombre de la empresa
  useEffect(() => {
    const baseName = companyName || fullName || 'mi-empresa';
    const slug = baseName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Quitar acentos
      .replace(/[^a-z0-9\s-]/g, '') // Quitar caracteres especiales
      .trim()
      .replace(/\s+/g, '-');
    setCompanySlug(slug);
  }, [companyName, fullName]);

  // Validar CUIT en tiempo real (solo 11 números enteros)
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

  // Manejar selección y preview de imágenes
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

  // Enviar el formulario completo (Alta en una sola ventana)
  const handleSaveData = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Validar únicamente campos obligatorios (localidad es opcional)
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

    const userId = currentUser?.id || 'd290f1ee-6c54-4b01-90e6-d701748f0851'; // fallback en dev
    const finalCompanyName = companyName || `${fullName} Consultora`;

    if (isDevMode) {
      console.log('Simulando guardado de onboarding en modo desarrollo...');
      setTimeout(() => {
        setLoading(false);
        triggerToast('¡Datos guardados con éxito!', 'success');
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 }
        });
        setTimeout(() => {
          window.location.href = `/${companySlug}/dashboard`;
        }, 2000);
      }, 2000);
      return;
    }

    try {
      // 1. Crear o Reutilizar el Tenant (Empresa)
      let tenant = null;
      const { data: existingTenant } = await supabase
        .from('tenants')
        .select('*')
        .eq('slug', companySlug)
        .maybeSingle();

      if (existingTenant) {
        // Verificar si hay perfiles asociados a este tenant
        const { data: assocProfiles } = await supabase
          .from('profiles')
          .select('id')
          .eq('tenant_id', existingTenant.id);

        const isOrphaned = !assocProfiles || assocProfiles.length === 0;
        const belongsToMe = assocProfiles && assocProfiles.some(p => p.id === userId);

        if (isOrphaned || belongsToMe) {
          // Reutilizar el tenant existente y actualizar sus datos
          const { data: updatedTenant, error: tenantUpdateErr } = await supabase
            .from('tenants')
            .update({
              name: finalCompanyName,
              plan_id: selectedPlan,
              website: website || null,
              social_linkedin: linkedin || null,
              social_instagram: instagram || null,
              social_facebook: facebook || null,
              social_tiktok: tiktok || null,
              social_youtube: youtube || null,
            })
            .eq('id', existingTenant.id)
            .select()
            .single();

          if (tenantUpdateErr) throw tenantUpdateErr;
          tenant = updatedTenant;
        } else {
          // Si está ocupado por otra persona, generamos un slug único
          const newSlug = `${companySlug}-${Math.random().toString(36).substring(2, 6)}`;
          const { data: newTenant, error: tenantErr } = await supabase
            .from('tenants')
            .insert({
              name: finalCompanyName,
              slug: newSlug,
              status: 'active',
              plan_id: selectedPlan,
              website: website || null,
              social_linkedin: linkedin || null,
              social_instagram: instagram || null,
              social_facebook: facebook || null,
              social_tiktok: tiktok || null,
              social_youtube: youtube || null,
            })
            .select()
            .single();

          if (tenantErr) throw tenantErr;
          tenant = newTenant;
        }
      } else {
        // No existe, crear uno nuevo
        const { data: newTenant, error: tenantErr } = await supabase
          .from('tenants')
          .insert({
            name: finalCompanyName,
            slug: companySlug,
            status: 'active',
            plan_id: selectedPlan,
            website: website || null,
            social_linkedin: linkedin || null,
            social_instagram: instagram || null,
            social_facebook: facebook || null,
            social_tiktok: tiktok || null,
            social_youtube: youtube || null,
          })
          .select()
          .single();

        if (tenantErr) throw tenantErr;
        tenant = newTenant;
      }

      // 2. Subir archivos de las matrículas
      const updatedMatriculas = await Promise.all(
        matriculas.map(async (m, idx) => {
          let frenteUrl = m.fotoFrentePreview;
          let dorsoUrl = m.fotoDorsoPreview;

          if (m.fotoFrente) {
            const ext = m.fotoFrente.name.split('.').pop();
            frenteUrl = await uploadFileToStorage('documents', `${userId}/matricula_${idx}_frente_${Date.now()}.${ext}`, m.fotoFrente);
          }

          if (m.fotoDorso) {
            const ext = m.fotoDorso.name.split('.').pop();
            dorsoUrl = await uploadFileToStorage('documents', `${userId}/matricula_${idx}_dorso_${Date.now()}.${ext}`, m.fotoDorso);
          }

          return {
            ...m,
            fotoFrentePreview: frenteUrl,
            fotoDorsoPreview: dorsoUrl
          };
        })
      );

      // Subir firma y logos
      let signatureUrl = null;
      let logo1Url = null;
      let logo2Url = null;

      const uploadPromises = [];
      const uploadKeys = [];

      if (fotoFirma) {
        const ext = fotoFirma.name.split('.').pop();
        uploadPromises.push(uploadFileToStorage('signatures', `${userId}/firma_${Date.now()}.${ext}`, fotoFirma));
        uploadKeys.push('signature');
      }

      if (logo1) {
        const ext = logo1.name.split('.').pop();
        uploadPromises.push(uploadFileToStorage('logos', `${tenant.id}/logo1_${Date.now()}.${ext}`, logo1));
        uploadKeys.push('logo1');
      }

      if (logo2) {
        const ext = logo2.name.split('.').pop();
        uploadPromises.push(uploadFileToStorage('logos', `${tenant.id}/logo2_${Date.now()}.${ext}`, logo2));
        uploadKeys.push('logo2');
      }

      if (uploadPromises.length > 0) {
        const uploadUrls = await Promise.all(uploadPromises);
        uploadKeys.forEach((key, idx) => {
          if (key === 'signature') signatureUrl = uploadUrls[idx];
          if (key === 'logo1') logo1Url = uploadUrls[idx];
          if (key === 'logo2') logo2Url = uploadUrls[idx];
        });

        // Actualizar Tenant si se subieron logos
        if (logo1Url || logo2Url) {
          const { error: logoUpdateErr } = await supabase
            .from('tenants')
            .update({
              logo_1_url: logo1Url,
              logo_2_url: logo2Url,
            })
            .eq('id', tenant.id);

          if (logoUpdateErr) throw logoUpdateErr;
        }
      }

      // 3. Actualizar Perfil de Usuario (Fallback de la primera matrícula para retrocompatibilidad)
      const firstMatricula = updatedMatriculas[0] || {};
      const { error: profileErr } = await supabase
        .from('profiles')
        .update({
          tenant_id: tenant.id,
          full_name: fullName,
          email: email,
          phone: phone,
          cuit: cuit,
          provincia: provincia,
          departamento_partido: partido,
          localidad: localidad,
          birth_date: birthDate,
          signature_url: signatureUrl,
          matricula_institucion: firstMatricula.institucion || null,
          matricula_numero: firstMatricula.numero || null,
          matricula_vencimiento: firstMatricula.vencimiento || null,
          matricula_foto_frente_url: firstMatricula.fotoFrentePreview || null,
          matricula_foto_dorso_url: firstMatricula.fotoDorsoPreview || null,
          role: 'owner',
        })
        .eq('id', userId);

      if (profileErr) throw profileErr;

      // 4. Insertar listado de Matrículas
      const toInsert = updatedMatriculas
        .filter(m => m.numero.trim() !== '' || m.institucion.trim() !== '')
        .map(m => ({
          profile_id: userId,
          institucion: m.institucion,
          numero: m.numero,
          vencimiento: m.vencimiento || null,
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
      triggerToast('¡Datos de perfil guardados con éxito!', 'success');

      // Celebrar onboarding exitoso
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 }
      });

      // Redirigir al workspace del tenant
      setTimeout(() => {
        window.location.href = `/${companySlug}/dashboard`;
      }, 2000);

    } catch (err) {
      triggerToast(err.message || 'Error al guardar los datos del perfil.', 'error');
      setLoading(false);
    }
  };

  // Guardar solo campos obligatorios mínimos y redirigir
  const handleSaveOnlyRequired = async () => {
    // Validar únicamente campos obligatorios (localidad es opcional)
    if (!fullName || !email || !phone || !cuit || !provincia || !partido || !birthDate) {
      triggerToast('Por favor completa todos los campos obligatorios (*) antes de salir.', 'error');
      return;
    }

    if (cuit.length !== 11) {
      triggerToast('El CUIT debe contener exactamente 11 números.', 'error');
      return;
    }

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

    // Verificar si el formulario tiene algún cambio respecto al inicio
    const isDirty = 
      fullName !== (initialValues?.fullName || '') ||
      email !== (initialValues?.email || '') ||
      phone !== '' ||
      cuit !== '' ||
      provincia !== '' ||
      partido !== '' ||
      localidad !== '' ||
      birthDate !== '' ||
      companyName !== '' ||
      website !== '' ||
      linkedin !== '' ||
      instagram !== '' ||
      facebook !== '' ||
      tiktok !== '' ||
      youtube !== '' ||
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
      selectedPlan !== 'free' ||
      matriculas.some(m => m.fotoFrente !== null || m.fotoDorso !== null) ||
      fotoFirma !== null ||
      logo1 !== null ||
      logo2 !== null;

    if (isDirty) {
      const confirmExit = window.confirm('Tienes cambios sin guardar. ¿Deseas salir sin guardar los cambios?');
      if (!confirmExit) return;
    }

    setLoading(true);
    const userId = currentUser?.id || 'd290f1ee-6c54-4b01-90e6-d701748f0851'; // fallback en dev
    const finalCompanyName = companyName || `${fullName} Consultora`;

    if (isDevMode) {
      console.log('Simulando guardado mínimo en modo desarrollo...');
      setTimeout(() => {
        setLoading(false);
        triggerToast('¡Perfil mínimo creado con éxito!', 'success');
        confetti({
          particleCount: 100,
          spread: 60,
          origin: { y: 0.6 }
        });
        setTimeout(() => {
          window.location.href = `/${companySlug}/dashboard`;
        }, 1500);
      }, 1500);
      return;
    }

    try {
      // 1. Crear o Reutilizar el Tenant básico (Empresa)
      let tenant = null;
      const { data: existingTenant } = await supabase
        .from('tenants')
        .select('*')
        .eq('slug', companySlug)
        .maybeSingle();

      if (existingTenant) {
        // Verificar si hay perfiles asociados a este tenant
        const { data: assocProfiles } = await supabase
          .from('profiles')
          .select('id')
          .eq('tenant_id', existingTenant.id);

        const isOrphaned = !assocProfiles || assocProfiles.length === 0;
        const belongsToMe = assocProfiles && assocProfiles.some(p => p.id === userId);

        if (isOrphaned || belongsToMe) {
          // Reutilizar el tenant existente y actualizar sus datos
          const { data: updatedTenant, error: tenantUpdateErr } = await supabase
            .from('tenants')
            .update({
              name: finalCompanyName,
              plan_id: selectedPlan,
            })
            .eq('id', existingTenant.id)
            .select()
            .single();

          if (tenantUpdateErr) throw tenantUpdateErr;
          tenant = updatedTenant;
        } else {
          // Generar slug único
          const newSlug = `${companySlug}-${Math.random().toString(36).substring(2, 6)}`;
          const { data: newTenant, error: tenantErr } = await supabase
            .from('tenants')
            .insert({
              name: finalCompanyName,
              slug: newSlug,
              status: 'active',
              plan_id: selectedPlan,
            })
            .select()
            .single();

          if (tenantErr) throw tenantErr;
          tenant = newTenant;
        }
      } else {
        // Crear uno nuevo
        const { data: newTenant, error: tenantErr } = await supabase
          .from('tenants')
          .insert({
            name: finalCompanyName,
            slug: companySlug,
            status: 'active',
            plan_id: selectedPlan,
          })
          .select()
          .single();

        if (tenantErr) throw tenantErr;
        tenant = newTenant;
      }

      // 2. Actualizar Perfil de Usuario solo con obligatorios
      const { error: profileErr } = await supabase
        .from('profiles')
        .update({
          tenant_id: tenant.id,
          full_name: fullName,
          email: email,
          phone: phone,
          cuit: cuit,
          provincia: provincia,
          departamento_partido: partido,
          localidad: localidad,
          birth_date: birthDate,
          role: 'owner',
          signature_url: null,
          matricula_institucion: null,
          matricula_numero: null,
          matricula_vencimiento: null,
          matricula_foto_frente_url: null,
          matricula_foto_dorso_url: null,
        })
        .eq('id', userId);

      if (profileErr) throw profileErr;

      setLoading(false);
      triggerToast('¡Perfil mínimo creado con éxito!', 'success');

      confetti({
        particleCount: 100,
        spread: 60,
        origin: { y: 0.6 }
      });

      // Redirigir al workspace del tenant
      setTimeout(() => {
        window.location.href = `/${companySlug}/dashboard`;
      }, 1500);

    } catch (err) {
      triggerToast(err.message || 'Error al guardar los datos mínimos del perfil.', 'error');
      setLoading(false);
    }
  };

  const handleExitWithoutSaving = async () => {
    const confirmExit = window.confirm('¿Estás seguro de que deseas salir? Perderás todos los datos cargados.');
    if (confirmExit) {
      localStorage.removeItem('onboarding_email');
      localStorage.removeItem('onboarding_full_name');
      await supabase.auth.signOut();
      window.location.href = '/login';
    }
  };

  return (
    <div className="min-h-screen bg-[#D9D9D9] text-slate-700 flex flex-col items-center justify-center relative overflow-hidden font-sans py-12 px-4">
      {/* Background gradients */}
      <div className="absolute top-[-10%] left-[-20%] w-[600px] h-[600px] rounded-full bg-[#468DFF]/5 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-20%] w-[600px] h-[600px] rounded-full bg-[#0511F2]/5 blur-[150px] pointer-events-none" />

      <div className="w-full max-w-3xl z-10">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="font-outfit text-3xl font-extrabold tracking-tight text-slate-900">
            Perfil de usuario
          </h1>
          <p className="text-sm text-slate-600 mt-2 font-medium">
            Ingresá tus datos para dar de alta tu consultorio o consultora en la plataforma
          </p>
        </div>

        {/* Form Container */}
        <form onSubmit={handleSaveData} className="space-y-8">
          
          {/* SECCIÓN 1: INFORMACIÓN DEL USUARIO */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-8 shadow-sm space-y-6">
            <h3 className="text-lg font-bold text-slate-900 border-b border-slate-200 pb-3 flex items-center gap-2">
              <User className="text-[#468DFF] h-5 w-5" />
              Información del usuario
            </h3>

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
                  className="w-full bg-slate-50 border border-slate-300 focus:border-[#468DFF] focus:ring-1 focus:ring-[#468DFF] rounded-xl py-3 px-4 text-slate-800 focus:outline-none transition-all"
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
                    placeholder="juan.perez@empresa.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-slate-500 cursor-not-allowed focus:outline-none"
                    disabled
                  />
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  CUIT (11 números enteros) <span className="text-[#468DFF]">*</span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <Hash className="h-4 w-4" />
                  </span>
                  <input
                    type="text"
                    required
                    placeholder="20123456789"
                    value={cuit}
                    onChange={handleCuitChange}
                    className="w-full bg-slate-50 border border-slate-300 focus:border-[#468DFF] focus:ring-1 focus:ring-[#468DFF] rounded-xl py-3 pl-10 pr-4 text-slate-800 focus:outline-none transition-all"
                  />
                </div>
                {cuitError && <p className="text-[10px] text-red-500 font-bold mt-1.5">{cuitError}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Teléfono Móvil <span className="text-[#468DFF]">*</span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <Phone className="h-4 w-4" />
                  </span>
                  <input
                    type="tel"
                    required
                    placeholder="1123456789"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ''))}
                    className="w-full bg-slate-50 border border-slate-300 focus:border-[#468DFF] focus:ring-1 focus:ring-[#468DFF] rounded-xl py-3 pl-10 pr-4 text-slate-800 focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Fecha de Nacimiento <span className="text-[#468DFF]">*</span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <Calendar className="h-4 w-4" />
                  </span>
                  <input
                    type="date"
                    required
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 focus:border-[#468DFF] focus:ring-1 focus:ring-[#468DFF] rounded-xl py-3 pl-10 pr-4 text-slate-800 focus:outline-none transition-all"
                  />
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
                  className="w-full bg-slate-50 border border-slate-300 focus:border-[#468DFF] focus:ring-1 focus:ring-[#468DFF] rounded-xl py-3 px-4 text-slate-800 focus:outline-none transition-all"
                >
                  <option value="" disabled>Selecciona una provincia</option>
                  {PROVINCIAS_ARGENTINAS.map((prov) => (
                    <option key={prov} value={prov}>{prov}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Partido <span className="text-[#468DFF]">*</span>
                </label>
                <select
                  required
                  disabled={!provincia}
                  value={partido}
                  onChange={(e) => {
                    setPartido(e.target.value);
                    setLocalidad('');
                  }}
                  className="w-full bg-slate-50 border border-slate-300 focus:border-[#468DFF] focus:ring-1 focus:ring-[#468DFF] rounded-xl py-3 px-4 text-slate-800 focus:outline-none transition-all disabled:opacity-50"
                >
                  <option value="" disabled>
                    {!provincia ? 'Selecciona una provincia primero' : 'Selecciona un partido'}
                  </option>
                  {partidosList.map((part) => (
                    <option key={part} value={part}>{part}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Localidad (Opcional)
                </label>
                <select
                  disabled={!partido}
                  value={localidad}
                  onChange={(e) => setLocalidad(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 focus:border-[#468DFF] focus:ring-1 focus:ring-[#468DFF] rounded-xl py-3 px-4 text-slate-800 focus:outline-none transition-all disabled:opacity-50"
                >
                  <option value="">
                    {!partido ? 'Selecciona un partido primero' : 'Selecciona una localidad (opcional)'}
                  </option>
                  {localidadesList.map((loc) => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* SECCIÓN 2: MATRÍCULAS PROFESIONALES (OPCIONAL) */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-8 shadow-sm space-y-6">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Briefcase className="text-[#468DFF] h-5 w-5" />
                Matrículas profesionales (opcional)
              </h3>
              <button
                type="button"
                onClick={handleAddMatricula}
                className="py-1.5 px-3 rounded-lg border border-[#468DFF]/40 hover:bg-[#468DFF]/10 text-[#468DFF] font-semibold text-xs transition-all flex items-center gap-1.5 shadow-sm"
              >
                <PlusCircle className="h-3.5 w-3.5" />
                Agregar Matrícula
              </button>
            </div>

            {matriculas.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No has agregado ninguna matrícula aún.</p>
            ) : (
              <div className="space-y-8">
                {matriculas.map((mat, idx) => (
                  <div key={idx} className="p-6 border border-slate-200/80 rounded-xl bg-slate-50/50 space-y-6 relative hover:border-[#468DFF]/25 transition-all">
                    <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                      <span className="text-xs font-bold text-[#468DFF] bg-[#468DFF]/10 px-2 py-0.5 rounded">
                        Matrícula #{idx + 1}
                      </span>
                      {matriculas.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveMatricula(idx)}
                          className="text-xs font-bold text-red-500 hover:text-red-700 flex items-center gap-1"
                        >
                          <X className="h-3.5 w-3.5" /> Quitar
                        </button>
                      )}
                    </div>

                    <div className="grid md:grid-cols-3 gap-6">
                      <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                          Colegio o Institución Emisora
                        </label>
                        <input
                          type="text"
                          placeholder="Ej: COPIME, CIPBA, Colegio de Ingenieros"
                          value={mat.institucion}
                          onChange={(e) => handleMatriculaChange(idx, 'institucion', e.target.value)}
                          className="w-full bg-white border border-slate-300 focus:border-[#468DFF] rounded-xl py-3 px-4 text-slate-800 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                          Número de Matrícula
                        </label>
                        <input
                          type="text"
                          placeholder="Ej: 12345"
                          value={mat.numero}
                          onChange={(e) => handleMatriculaChange(idx, 'numero', e.target.value)}
                          className="w-full bg-white border border-slate-300 focus:border-[#468DFF] rounded-xl py-3 px-4 text-slate-800 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                          Fecha de Vencimiento
                        </label>
                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                            <Calendar className="h-4 w-4" />
                          </span>
                          <input
                            type="date"
                            value={mat.vencimiento}
                            onChange={(e) => handleMatriculaChange(idx, 'vencimiento', e.target.value)}
                            className="w-full bg-white border border-slate-300 focus:border-[#468DFF] rounded-xl py-3 pl-10 pr-4 text-slate-800 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                          Foto Matrícula (Frente)
                        </label>
                        <div className="relative border border-dashed border-slate-300 hover:border-[#468DFF]/40 rounded-xl p-2 transition-all bg-white flex flex-col items-center justify-center text-center h-28 overflow-hidden group">
                          {mat.fotoFrentePreview ? (
                            <div className="relative w-full h-full">
                              <img src={mat.fotoFrentePreview} alt="Frente" className="w-full h-full object-contain" />
                              <button
                                type="button"
                                onClick={() => handleMatriculaFileClear(idx, 'Frente')}
                                className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white rounded-md p-1 text-[9px] font-bold"
                              >
                                Remover
                              </button>
                            </div>
                          ) : (
                            <>
                              <ImageIcon className="h-5 w-5 text-slate-400 group-hover:text-[#468DFF] mb-1" />
                              <span className="text-[11px] text-slate-500 font-medium">Subir Frente (JPG/PNG)</span>
                              <input
                                type="file"
                                accept=".png, .jpg, .jpeg"
                                onChange={(e) => handleMatriculaFileChange(idx, 'fotoFrente', 'fotoFrentePreview', e)}
                                className="absolute inset-0 opacity-0 cursor-pointer"
                              />
                            </>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                          Foto Matrícula (Dorso)
                        </label>
                        <div className="relative border border-dashed border-slate-300 hover:border-[#468DFF]/40 rounded-xl p-2 transition-all bg-white flex flex-col items-center justify-center text-center h-28 overflow-hidden group">
                          {mat.fotoDorsoPreview ? (
                            <div className="relative w-full h-full">
                              <img src={mat.fotoDorsoPreview} alt="Dorso" className="w-full h-full object-contain" />
                              <button
                                type="button"
                                onClick={() => handleMatriculaFileClear(idx, 'Dorso')}
                                className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white rounded-md p-1 text-[9px] font-bold"
                              >
                                Remover
                              </button>
                            </div>
                          ) : (
                            <>
                              <ImageIcon className="h-5 w-5 text-slate-400 group-hover:text-[#468DFF] mb-1" />
                              <span className="text-[11px] text-slate-500 font-medium">Subir Dorso (JPG/PNG)</span>
                              <input
                                type="file"
                                accept=".png, .jpg, .jpeg"
                                onChange={(e) => handleMatriculaFileChange(idx, 'fotoDorso', 'fotoDorsoPreview', e)}
                                className="absolute inset-0 opacity-0 cursor-pointer"
                              />
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SECCIÓN 3: FIRMA DIGITALIZADA (OPCIONAL) */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-8 shadow-sm space-y-6">
            <h3 className="text-lg font-bold text-slate-900 border-b border-slate-200 pb-3 flex items-center gap-2">
              <Upload className="text-[#468DFF] h-5 w-5" />
              Firma digitalizada (opcional)
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed font-medium">
              Subí tu firma digitalizada en formato JPG o PNG. Esta firma se utilizará para firmar automáticamente los reportes y documentos generados en la plataforma.
            </p>
            <div className="max-w-md">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Firma Digitalizada (para reportes en PDF)
              </label>
              <div className="relative border border-dashed border-slate-300 hover:border-[#468DFF]/40 rounded-xl p-2 transition-all bg-slate-50 flex flex-col items-center justify-center text-center h-28 overflow-hidden group">
                {fotoFirmaPreview ? (
                  <div className="relative w-full h-full">
                    <img src={fotoFirmaPreview} alt="Firma" className="w-full h-full object-contain" />
                    <button
                      type="button"
                      onClick={() => { setFotoFirma(null); setFotoFirmaPreview(''); }}
                      className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white rounded-md p-1 text-[9px] font-bold"
                    >
                      Remover
                    </button>
                  </div>
                ) : (
                  <>
                    <Upload className="h-5 w-5 text-slate-400 group-hover:text-[#468DFF] mb-1" />
                    <span className="text-[11px] text-slate-500 font-medium">Subir firma escaneada (JPG/PNG)</span>
                    <input
                      type="file"
                      accept=".png, .jpg, .jpeg"
                      onChange={(e) => handleImageChange(e, setFotoFirma, setFotoFirmaPreview)}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                  </>
                )}
              </div>
            </div>
          </div>

          {/* SECCIÓN 4: IDENTIDAD DE MARCA (OPCIONAL) */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-8 shadow-sm space-y-6">
            <h3 className="text-lg font-bold text-slate-900 border-b border-slate-200 pb-3 flex items-center gap-2">
              <Globe className="text-[#468DFF] h-5 w-5" />
              Identidad de marca de la consultora (opcional)
            </h3>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600 block mb-1">Nombre Comercial de la Consultora</label>
              <input
                type="text"
                placeholder="Ej: Consultora Integral de SySO"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 focus:border-[#468DFF] focus:ring-1 focus:ring-[#468DFF] rounded-xl py-3 px-4 text-slate-800 focus:outline-none transition-all text-xs"
              />
              <p className="text-[10px] text-slate-400 font-medium mt-1 leading-relaxed">
                Generará tu espacio de trabajo en: <strong>app.gestionsyso.com/{companySlug}</strong>
              </p>
            </div>

            {/* Redes Sociales y Sitio Web */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <span className="text-xs font-bold text-slate-800 block">Sitio Web y Redes Sociales</span>
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Sitio Web</label>
                  <input
                    type="url"
                    placeholder="https://consultora.com"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 focus:border-[#468DFF] rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">LinkedIn</label>
                  <input
                    type="url"
                    placeholder="https://linkedin.com/in/usuario"
                    value={linkedin}
                    onChange={(e) => setLinkedin(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 focus:border-[#468DFF] rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Instagram</label>
                  <input
                    type="url"
                    placeholder="https://instagram.com/usuario"
                    value={instagram}
                    onChange={(e) => setInstagram(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 focus:border-[#468DFF] rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Facebook</label>
                  <input
                    type="url"
                    placeholder="https://facebook.com/usuario"
                    value={facebook}
                    onChange={(e) => setFacebook(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 focus:border-[#468DFF] rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">TikTok</label>
                  <input
                    type="url"
                    placeholder="https://tiktok.com/@usuario"
                    value={tiktok}
                    onChange={(e) => setTiktok(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 focus:border-[#468DFF] rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">YouTube</label>
                  <input
                    type="url"
                    placeholder="https://youtube.com/@canal"
                    value={youtube}
                    onChange={(e) => setYoutube(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 focus:border-[#468DFF] rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Carga de Logos */}
            <div className="grid md:grid-cols-2 gap-6 pt-4">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Logo Principal (Logo 1)
                </label>
                <div className="relative border border-dashed border-slate-300 hover:border-[#468DFF]/40 rounded-xl p-2 transition-all bg-slate-50 flex flex-col items-center justify-center text-center h-28 overflow-hidden group">
                  {logo1Preview ? (
                    <div className="relative w-full h-full">
                      <img src={logo1Preview} alt="Logo 1" className="w-full h-full object-contain" />
                      <button
                        type="button"
                        onClick={() => { setLogo1(null); setLogo1Preview(''); }}
                        className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white rounded-md p-1 text-[9px] font-bold"
                      >
                        Remover
                      </button>
                    </div>
                  ) : (
                    <>
                      <ImageIcon className="h-5 w-5 text-slate-400 group-hover:text-[#468DFF] mb-1" />
                      <span className="text-[11px] text-slate-500 font-medium">Subir Logo 1 (JPG/PNG)</span>
                      <input
                        type="file"
                        accept=".png, .jpg, .jpeg"
                        onChange={(e) => handleImageChange(e, setLogo1, setLogo1Preview)}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Logo Secundario (Logo 2)
                </label>
                <div className="relative border border-dashed border-slate-300 hover:border-[#468DFF]/40 rounded-xl p-2 transition-all bg-slate-50 flex flex-col items-center justify-center text-center h-28 overflow-hidden group">
                  {logo2Preview ? (
                    <div className="relative w-full h-full">
                      <img src={logo2Preview} alt="Logo 2" className="w-full h-full object-contain" />
                      <button
                        type="button"
                        onClick={() => { setLogo2(null); setLogo2Preview(''); }}
                        className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white rounded-md p-1 text-[9px] font-bold"
                      >
                        Remover
                      </button>
                    </div>
                  ) : (
                    <>
                      <ImageIcon className="h-5 w-5 text-slate-400 group-hover:text-[#468DFF] mb-1" />
                      <span className="text-[11px] text-slate-500 font-medium">Subir Logo 2 (JPG/PNG)</span>
                      <input
                        type="file"
                        accept=".png, .jpg, .jpeg"
                        onChange={(e) => handleImageChange(e, setLogo2, setLogo2Preview)}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* SECCIÓN 5: TIPO DE PLAN */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-8 shadow-sm space-y-6">
            <h3 className="text-lg font-bold text-slate-900 border-b border-slate-200 pb-3 flex items-center gap-2">
              <Award className="text-[#468DFF] h-5 w-5" />
              Tipo de plan
            </h3>

            <div className="relative rounded-2xl border border-blue-500/15 bg-gradient-to-br from-blue-50/50 via-slate-50 to-indigo-50/10 p-6 overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-[#468DFF]/5 blur-xl pointer-events-none" />
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-[#468DFF]/10 border border-[#468DFF]/20 text-[#468DFF] text-[10px] font-semibold uppercase tracking-wider">
                    Suscripción Activa
                  </span>
                  {selectedPlan !== 'free' && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-[10px] font-semibold uppercase tracking-wider">
                      Plan Elegido
                    </span>
                  )}
                </div>
                <h4 className="font-outfit text-xl font-extrabold text-slate-900">
                  {selectedPlan === 'free' && 'Plan Gratis Permanente'}
                  {selectedPlan === 'basic_5' && 'Plan 5 Empresas'}
                  {selectedPlan === 'standard_25' && 'Plan 25 Empresas'}
                  {selectedPlan === 'libre' && 'Plan Libre (Ilimitado)'}
                </h4>
                <p className="text-xs text-slate-600 max-w-md font-medium leading-relaxed">
                  {selectedPlan === 'free' && 'Probá la plataforma cargando hasta 1 empresa cliente en tu base de datos, sin límite de tiempo.'}
                  {selectedPlan === 'basic_5' && 'Gestioná hasta 5 empresas clientes en simultáneo con todas las herramientas de la plataforma.'}
                  {selectedPlan === 'standard_25' && 'Para consultoras con carteras medianas, hasta 25 empresas clientes activas.'}
                  {selectedPlan === 'libre' && 'Empresas y clientes ilimitados, con branding y configuraciones de auditoría personalizadas.'}
                </p>
              </div>

              <div className="flex flex-col items-stretch md:items-end gap-3 shrink-0">
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 block">Costo mensual</span>
                  <span className="font-outfit text-2xl font-extrabold text-[#468DFF]">
                    {selectedPlan === 'free' && '$0'}
                    {selectedPlan === 'basic_5' && '$3.500'}
                    {selectedPlan === 'standard_25' && '$7.500'}
                    {selectedPlan === 'libre' && '$12.000'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPlanModal(true)}
                  className="py-2.5 px-4 rounded-xl border border-[#468DFF]/40 hover:bg-[#468DFF]/10 text-[#468DFF] font-semibold text-xs transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Contratar / Subir Plan
                </button>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex flex-col md:flex-row md:items-center justify-between pt-4 gap-4 border-t border-slate-300 pt-6">
            <button
              type="button"
              disabled={loading}
              onClick={handleExitWithoutSaving}
              className="py-3 px-6 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-800 font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              Salir
            </button>

            <button
              type="submit"
              disabled={loading}
              className="py-4 px-10 rounded-xl bg-[#468DFF] hover:bg-[#0511F2] text-white font-bold text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/10 active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  Guardar
                  <CheckCircle className="h-4 w-4 text-blue-100" />
                </>
              )}
            </button>
          </div>

        </form>

      </div>

      {/* PLAN SELECTION MODAL */}
      {showPlanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl p-6 shadow-2xl relative animate-scaleUp">
            {/* Close Button */}
            <button 
              onClick={() => setShowPlanModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors border border-slate-200"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="text-center mb-6">
              <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-[#468DFF] text-[10px] font-semibold uppercase tracking-wider">
                Suscripciones SaaS
              </span>
              <h3 className="font-outfit text-2xl font-extrabold text-slate-900 mt-2">
                Seleccioná tu Plan Comercial
              </h3>
              <p className="text-xs text-slate-600 mt-1 font-medium">
                Elegí el plan que mejor se adapte a tus necesidades de seguridad e higiene.
              </p>
            </div>

            {/* Grid of Plans */}
            <div className="grid md:grid-cols-4 gap-4">
              
              {/* Plan Free */}
              <div className={`rounded-xl border p-3 flex flex-col justify-between transition-all ${selectedPlan === 'free' ? 'border-[#468DFF] bg-[#468DFF]/5' : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'}`}>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Plan Gratis</h4>
                  <p className="text-[9px] text-slate-500 mt-1 font-medium leading-tight">Ideal para probar la herramienta.</p>
                  <span className="font-outfit text-base font-extrabold text-[#468DFF] mt-2 block">$0 <span className="text-[9px] text-slate-500 font-normal">/ permanente</span></span>
                  <ul className="text-[8px] text-slate-600 mt-3 space-y-1 border-t border-slate-200 pt-2 font-medium">
                    <li className="flex items-center gap-1"><CheckCircle className="h-2.5 w-2.5 text-[#468DFF] shrink-0" /> 1 Empresa cliente</li>
                    <li className="flex items-center gap-1"><CheckCircle className="h-2.5 w-2.5 text-[#468DFF] shrink-0" /> Sin límite tiempo</li>
                  </ul>
                </div>
                <button
                  type="button"
                  onClick={() => { setSelectedPlan('free'); setShowPlanModal(false); }}
                  className={`w-full py-1 rounded-lg mt-3 text-[10px] font-semibold transition-all ${selectedPlan === 'free' ? 'bg-[#468DFF] text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
                >
                  {selectedPlan === 'free' ? 'Seleccionado' : 'Elegir'}
                </button>
              </div>

              {/* Plan 5 */}
              <div className={`rounded-xl border p-3 flex flex-col justify-between transition-all ${selectedPlan === 'basic_5' ? 'border-[#468DFF] bg-[#468DFF]/5' : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'}`}>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Plan 5</h4>
                  <p className="text-[9px] text-slate-500 mt-1 font-medium leading-tight">Para profesionales de campo.</p>
                  <span className="font-outfit text-base font-extrabold text-[#468DFF] mt-2 block">$3.500 <span className="text-[9px] text-slate-500 font-normal">/ mes</span></span>
                  <ul className="text-[8px] text-slate-600 mt-3 space-y-1 border-t border-slate-200 pt-2 font-medium">
                    <li className="flex items-center gap-1"><CheckCircle className="h-2.5 w-2.5 text-[#468DFF] shrink-0" /> 5 Empresas clientes</li>
                    <li className="flex items-center gap-1"><CheckCircle className="h-2.5 w-2.5 text-[#468DFF] shrink-0" /> Todas las funciones</li>
                  </ul>
                </div>
                <button
                  type="button"
                  onClick={() => { setSelectedPlan('basic_5'); setShowPlanModal(false); }}
                  className={`w-full py-1 rounded-lg mt-3 text-[10px] font-semibold transition-all ${selectedPlan === 'basic_5' ? 'bg-[#468DFF] text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
                >
                  {selectedPlan === 'basic_5' ? 'Seleccionado' : 'Elegir'}
                </button>
              </div>

              {/* Plan 25 */}
              <div className={`rounded-xl border p-3 flex flex-col justify-between transition-all ${selectedPlan === 'standard_25' ? 'border-[#468DFF] bg-[#468DFF]/5' : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'}`}>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Plan 25</h4>
                  <p className="text-[9px] text-slate-500 mt-1 font-medium leading-tight">Para consultoras medianas.</p>
                  <span className="font-outfit text-base font-extrabold text-[#468DFF] mt-2 block">$7.500 <span className="text-[9px] text-slate-500 font-normal">/ mes</span></span>
                  <ul className="text-[8px] text-slate-600 mt-3 space-y-1 border-t border-slate-200 pt-2 font-medium">
                    <li className="flex items-center gap-1"><CheckCircle className="h-2.5 w-2.5 text-[#468DFF] shrink-0" /> 25 Empresas clientes</li>
                    <li className="flex items-center gap-1"><CheckCircle className="h-2.5 w-2.5 text-[#468DFF] shrink-0" /> Soporte priorizado</li>
                  </ul>
                </div>
                <button
                  type="button"
                  onClick={() => { setSelectedPlan('standard_25'); setShowPlanModal(false); }}
                  className={`w-full py-1 rounded-lg mt-3 text-[10px] font-semibold transition-all ${selectedPlan === 'standard_25' ? 'bg-[#468DFF] text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
                >
                  {selectedPlan === 'standard_25' ? 'Seleccionado' : 'Elegir'}
                </button>
              </div>

              {/* Plan Libre */}
              <div className={`rounded-xl border p-3 flex flex-col justify-between transition-all ${selectedPlan === 'libre' ? 'border-[#468DFF] bg-[#468DFF]/5' : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'}`}>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Plan Libre</h4>
                  <p className="text-[9px] text-slate-500 mt-1 font-medium leading-tight">Constructoras y corporaciones.</p>
                  <span className="font-outfit text-base font-extrabold text-[#468DFF] mt-2 block">$12.000 <span className="text-[9px] text-slate-500 font-normal">/ mes</span></span>
                  <ul className="text-[8px] text-slate-600 mt-3 space-y-1 border-t border-slate-200 pt-2 font-medium">
                    <li className="flex items-center gap-1"><CheckCircle className="h-2.5 w-2.5 text-[#468DFF] shrink-0" /> Empresas ilimitadas</li>
                    <li className="flex items-center gap-1"><CheckCircle className="h-2.5 w-2.5 text-[#468DFF] shrink-0" /> Branding completo</li>
                  </ul>
                </div>
                <button
                  type="button"
                  onClick={() => { setSelectedPlan('libre'); setShowPlanModal(false); }}
                  className={`w-full py-1 rounded-lg mt-3 text-[10px] font-semibold transition-all ${selectedPlan === 'libre' ? 'bg-[#468DFF] text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
                >
                  {selectedPlan === 'libre' ? 'Seleccionado' : 'Elegir'}
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* CENTERED MODAL NOTIFICATION (VENTANA EMERGENTE) */}
      {toast.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-md p-6 rounded-2xl border shadow-2xl text-center bg-white border-slate-200 animate-scaleUp">
            <div className="flex justify-center mb-4">
              {toast.type === 'error' ? (
                <div className="p-3 rounded-full bg-red-50 border border-red-100 text-red-500">
                  <AlertTriangle className="h-8 w-8" />
                </div>
              ) : (
                <div className="p-3 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-500">
                  <CheckCircle className="h-8 w-8" />
                </div>
              )}
            </div>
            <h3 className="font-outfit text-lg font-bold text-slate-900 mb-2">
              {toast.type === 'error' ? 'Notificación de Error' : 'Operación Exitosa'}
            </h3>
            <p className="text-sm text-slate-600 mb-6 leading-relaxed font-medium">
              {toast.message}
            </p>
            <button
              type="button"
              onClick={() => setToast({ show: false, message: '', type: 'success' })}
              className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs transition-all active:scale-[0.98] cursor-pointer ${
                toast.type === 'error'
                  ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/10'
                  : 'bg-[#468DFF] hover:bg-[#0511F2] text-white shadow-lg shadow-blue-500/10'
              }`}
            >
              Aceptar
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
