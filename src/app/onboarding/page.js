// src/app/onboarding/page.js
'use client';

import React, { useState, useEffect } from 'react';
import ImageUploadZone from '@/components/ui/ImageUploadZone';
import { supabase, fetchAllGeography } from '@/lib/supabase';
import { formatDate, formatAsDateInput, convertToDbDate, getEffectivePlan, PLAN_FEATURES } from '@/lib/utils';
import AppCard from '@/components/ui/AppCard';
import AppInput from '@/components/ui/AppInput';
import AppSelect from '@/components/ui/AppSelect';
import AppButton from '@/components/ui/AppButton';
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
import { useToast } from '@/components/providers/ToastProvider';
import AppConfirmDialog from '@/components/ui/AppConfirmDialog';
import AppUnsavedChangesDialog from '@/components/ui/AppUnsavedChangesDialog';
import PublicFooter from '@/components/PublicFooter';

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
  
  // Toasts y Diálogos accesibles Radix
  const globalToast = useToast();
  const triggerToast = (message, type = 'success') => {
    globalToast.toast(message, type);
  };

  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmDialogConfig, setConfirmDialogConfig] = useState({ title: '', description: '', type: 'info', onConfirm: null, confirmText: 'Confirmar', cancelText: 'Cancelar' });

  const [showUnsavedChangesDialog, setShowUnsavedChangesDialog] = useState(false);
  const [unsavedChangesConfig, setUnsavedChangesConfig] = useState({ onLeave: null });
  
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

    const cachedEmail = localStorage.getItem('onboarding_email') || '';
    const cachedName = localStorage.getItem('onboarding_full_name') || '';
    if (cachedEmail) setEmail(cachedEmail);
    if (cachedName) setFullName(cachedName);

    let redirectTimeout = null;

    const checkSession = async (user) => {
      if (user) {
        if (redirectTimeout) clearTimeout(redirectTimeout);
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
    };

    // 1. Verificar sesión inmediata
    const initFetch = async () => {
      // Si la URL contiene el parámetro 'code', intentamos intercambiarlo en el cliente como fallback
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      if (code) {
        try {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            console.error('[Onboarding Client Fallback Error]:', exchangeError.message);
          }
        } catch (err) {
          console.error('[Onboarding Client Fallback Exception]:', err);
        }
      }

      // Si la URL contiene el parámetro 'token_hash' (flujo verify OTP), también lo procesamos como fallback
      const tokenHash = urlParams.get('token_hash');
      const type = urlParams.get('type');
      if (tokenHash && type) {
        try {
          const { error: verifyError } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
          if (verifyError) {
            console.error('[Onboarding Client verifyOtp Error]:', verifyError.message);
          }
        } catch (err) {
          console.error('[Onboarding Client verifyOtp Exception]:', err);
        }
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        checkSession(user);
      } else {
        // Si no hay usuario inmediato pero hay un token en la URL, damos tiempo para procesarlo
        const hasHash = window.location.hash && window.location.hash.includes('access_token');
        const hasCode = window.location.search && (window.location.search.includes('code=') || window.location.search.includes('token_hash='));
        
        const delay = (hasHash || hasCode) ? 2000 : 800; // Si no hay tokens, un delay menor para redirigir rápido
        
        redirectTimeout = setTimeout(async () => {
          const { data: { user: delayedUser } } = await supabase.auth.getUser();
          if (!delayedUser && !isDevMode) {
            window.location.href = '/login';
          } else if (delayedUser) {
            checkSession(delayedUser);
          }
        }, delay);
      }
    };

    // 2. Suscribirse a cambios de autenticación (esto captura cuando Supabase procesa el hash del email)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        checkSession(session.user);
      }
    });

    initFetch();

    return () => {
      if (redirectTimeout) clearTimeout(redirectTimeout);
      subscription.unsubscribe();
    };
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
          matricula_foto_frente_url: firstMatricula.fotoFrentePreview || null,
          matricula_foto_dorso_url: firstMatricula.fotoDorsoPreview || null,
          role: 'admin',
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
  const handleSaveOnlyRequired = () => {
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
      setUnsavedChangesConfig({
        onLeave: () => {
          executeSaveOnlyRequired();
        }
      });
      setShowUnsavedChangesDialog(true);
    } else {
      executeSaveOnlyRequired();
    }
  };

  const executeSaveOnlyRequired = async () => {
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
          role: 'admin',
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

  const handleExitWithoutSaving = () => {
    setConfirmDialogConfig({
      title: '¿Estás seguro de que deseas salir?',
      description: 'Perderás todos los datos cargados en esta sesión y se cerrará tu sesión activa.',
      type: 'warning',
      onConfirm: executeExitWithoutSaving,
      confirmText: 'Salir y borrar',
      cancelText: 'Cancelar'
    });
    setShowConfirmDialog(true);
  };

  const executeExitWithoutSaving = async () => {
    localStorage.removeItem('onboarding_email');
    localStorage.removeItem('onboarding_full_name');
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen bg-syso-bg text-slate-700 flex flex-col justify-between items-center relative overflow-hidden font-sans">
      {/* Background gradients */}
      <div className="absolute top-[-10%] left-[-20%] w-[600px] h-[600px] rounded-full bg-[#468DFF]/5 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-20%] w-[600px] h-[600px] rounded-full bg-[#0511F2]/5 blur-[150px] pointer-events-none" />

      <div className="w-full max-w-4xl z-10 py-12 px-4">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="font-outfit text-3xl font-extrabold tracking-tight text-slate-900">
            Perfil de usuario
          </h1>
          <p className="text-sm text-slate-600 mt-2 font-medium">
            Ingresá tus datos para dar de alta tu perfil o consultora en la plataforma
          </p>
        </div>

        {/* Form Container */}
        <form onSubmit={handleSaveData} className="space-y-6">
          
          {/* SECCIÓN 1: INFORMACIÓN DEL USUARIO */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 md:p-6 shadow-sm space-y-5">
            <h3 className="font-outfit text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-2 uppercase tracking-wider">
              <User className="text-[#468DFF] h-4 w-4" />
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
                  placeholder="20123456789"
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
                  placeholder="1123456789"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ''))}
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
                  />
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

            {/* Matrículas Profesionales */}
            <div className="pt-4 border-t border-slate-200 space-y-6">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Briefcase className="h-4 w-4 text-[#468DFF]" />
                Matrículas Profesionales
              </h4>

              {matriculas.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No has agregado ninguna matrícula aún.</p>
              ) : (
                <div className="space-y-6">
                  {matriculas.map((mat, index) => (
                    <div key={index} className="p-6 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-6 relative hover:border-[#468DFF]/25 transition-all">
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
                          value={mat.institucion}
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
                            value={mat.numero}
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
                              value={mat.vencimiento}
                              onChange={(e) => handleMatriculaChange(index, 'vencimiento', formatAsDateInput(e.target.value))}
                              className="w-full border border-slate-200 rounded-xl pl-3.5 pr-10 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all font-mono text-slate-700"
                            />
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
                          </div>
                        </div>
                      </div>

                      {/* Uploads de la matrícula actual */}
                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="flex flex-col justify-center">
                          <div className="w-full">
                            <ImageUploadZone
                              label={`Foto Frente Matrícula #${index + 1}`}
                              preview={mat.fotoFrentePreview}
                              onFileChange={(file) => handleMatriculaFileChange(index, 'fotoFrente', 'fotoFrentePreview', file)}
                              onClear={() => handleMatriculaFileClear(index, 'Frente')}
                              disabled={loading}
                              maxSizeMB={5}
                              onToast={triggerToast}
                            />
                          </div>
                        </div>

                        <div className="flex flex-col justify-center">
                          <div className="w-full">
                            <ImageUploadZone
                              label={`Foto Dorso Matrícula #${index + 1}`}
                              preview={mat.fotoDorsoPreview}
                              onFileChange={(file) => handleMatriculaFileChange(index, 'fotoDorso', 'fotoDorsoPreview', file)}
                              onClear={() => handleMatriculaFileClear(index, 'Dorso')}
                              disabled={loading}
                              maxSizeMB={5}
                              onToast={triggerToast}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

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
            </div>

            {/* Firma Digital (Separada de las matrículas en su propia subsección) */}
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
                      disabled={loading}
                      maxSizeMB={5}
                      onToast={triggerToast}
                    />
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* SECCIÓN 2: IDENTIDAD DE LA EMPRESA */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 md:p-6 shadow-sm space-y-5">
            <h3 className="font-outfit text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-2 uppercase tracking-wider">
              <Building className="text-[#468DFF] h-4 w-4" />
              Identidad de la empresa
            </h3>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Nombre Comercial de la Consultora
                </label>
                <input
                  type="text"
                  placeholder="Ej: Consultora Integral de SySO"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all text-slate-700"
                />
                <p className="text-[10px] text-slate-400 font-medium mt-1 leading-relaxed">
                  Generará tu espacio de trabajo en: <strong>app.gestionsyso.com/{companySlug}</strong>
                </p>
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
                    placeholder="https://linkedin.com/in/usuario"
                    value={linkedin}
                    onChange={(e) => setLinkedin(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all text-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Instagram</label>
                  <input
                    type="url"
                    placeholder="https://instagram.com/usuario"
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
                    placeholder="https://facebook.com/usuario"
                    value={facebook}
                    onChange={(e) => setFacebook(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all text-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">TikTok</label>
                  <input
                    type="url"
                    placeholder="https://tiktok.com/@usuario"
                    value={tiktok}
                    onChange={(e) => setTiktok(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all text-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">YouTube</label>
                  <input
                    type="url"
                    placeholder="https://youtube.com/@canal"
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
                    disabled={loading}
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
                    disabled={loading}
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

            <div className="relative rounded-2xl border border-[#468DFF]/15 bg-gradient-to-br from-blue-50/50 via-slate-50 to-indigo-50/10 p-6 overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-[#468DFF]/5 blur-xl pointer-events-none" />
              
              <div className="space-y-2">
                <span className="px-2 py-0.5 rounded-full bg-[#468DFF]/10 border border-[#468DFF]/20 text-[#468DFF] text-[10px] font-semibold uppercase tracking-wider">
                  Plan Activo
                </span>
                <h4 className="font-outfit text-xl font-extrabold text-slate-900">
                  {PLAN_FEATURES[selectedPlan]?.name || (selectedPlan === 'free' ? 'Plan Gratis Permanente' : selectedPlan)}
                </h4>
                <p className="text-xs text-slate-600 font-medium leading-relaxed">
                  {selectedPlan === 'free' && 'Límite de hasta 1 empresa cliente en base de datos, sin vencimiento de prueba.'}
                  {selectedPlan === 'basic_5' && 'Límite de hasta 5 empresas clientes y 5 miembros de equipo.'}
                  {selectedPlan === 'standard_25' && 'Límite de hasta 25 empresas clientes y 25 miembros de equipo.'}
                  {selectedPlan === 'libre' && 'Soporte ilimitado de empresas, inspectores y marca personal.'}
                </p>
              </div>

              <div className="flex flex-col items-stretch md:items-end gap-3 shrink-0">
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 block">Costo mensual</span>
                  <span className="font-outfit text-2xl font-extrabold text-[#468DFF]">
                    {selectedPlan === 'free' ? '$0' : `$${(PLAN_FEATURES[selectedPlan]?.price || 0).toLocaleString()}`}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPlanModal(true)}
                  className="py-2.5 px-4 rounded-xl border border-[#468DFF]/40 hover:bg-[#468DFF]/5 text-[#468DFF] font-semibold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Cambiar / Subir Plan
                </button>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-between items-center pt-6 border-t border-slate-100">
            <button
              type="button"
              disabled={loading}
              onClick={handleExitWithoutSaving}
              className="px-5 py-2.5 bg-[#FFFFFF] text-[#468DFF] border border-[#468DFF] rounded-xl text-sm font-bold hover:bg-[#468DFF] hover:text-[#FFFFFF] hover:border-[#FFFFFF] transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
            >
              Salir
            </button>

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
          </div>

        </form>

      </div>

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
            <div className="overflow-y-auto scrollbar-thin flex-1 pt-1.5 pb-6 px-6 md:px-8">
              <div className="text-center mb-2">
                <img src="/brand/logo-black.png" alt="Gestión SySO" className="h-36 w-36 object-contain mx-auto -mt-5 -mb-7" />
                <h3 className="font-outfit text-3xl font-black text-slate-900">
                  Seleccioná tu Plan Comercial
                </h3>
                <p className="text-xs text-slate-600 mt-1 font-medium">
                  Elegí el plan que mejor se adapte a tus necesidades de seguridad e higiene.
                </p>
              </div>

              {/* Grid of Plans */}
              <div className="grid md:grid-cols-4 gap-6 items-stretch pb-2">
                
                {/* Plan Free */}
                <div className={`rounded-2xl border p-5 flex flex-col justify-between transition-all ${selectedPlan === 'free' ? 'border-[#468DFF] bg-[#468DFF]/5 ring-2 ring-[#468DFF]/20 shadow-md' : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'}`}>
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
                    onClick={() => {
                      setSelectedPlan('free');
                      setShowPlanModal(false);
                    }}
                    className={`w-full py-2.5 rounded-xl mt-6 text-xs font-bold transition-all ${selectedPlan === 'free' ? 'bg-[#468DFF] text-white opacity-80 cursor-default' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer'}`}
                  >
                    {selectedPlan === 'free' ? 'Seleccionado' : 'Elegir'}
                  </button>
                </div>

                {/* Plan Básico */}
                <div className={`rounded-2xl border p-5 flex flex-col justify-between transition-all ${selectedPlan === 'basic_5' ? 'border-[#468DFF] bg-[#468DFF]/5 ring-2 ring-[#468DFF]/20 shadow-md' : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'}`}>
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
                    onClick={() => {
                      setSelectedPlan('basic_5');
                      setShowPlanModal(false);
                    }}
                    className={`w-full py-2.5 rounded-xl mt-6 text-xs font-bold transition-all ${selectedPlan === 'basic_5' ? 'bg-[#468DFF] text-white opacity-80 cursor-default' : 'bg-[#468DFF] hover:bg-[#0511F2] text-white cursor-pointer'}`}
                  >
                    {selectedPlan === 'basic_5' ? 'Seleccionado' : 'Elegir'}
                  </button>
                </div>

                {/* Plan Profesional */}
                <div className={`rounded-2xl border p-5 flex flex-col justify-between transition-all ${selectedPlan === 'standard_25' ? 'border-[#468DFF] bg-[#468DFF]/5 ring-2 ring-[#468DFF]/20 shadow-md' : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'}`}>
                  <div>
                    <h4 className="text-base font-bold text-slate-900">Plan Profesional</h4>
                    <p className="text-xs text-slate-500 mt-1.5 font-medium leading-relaxed">Para consultoras medianas.</p>
                    <span className="font-outfit text-2xl font-extrabold text-[#468DFF] mt-3 block">$35.000 <span className="text-xs text-slate-500 font-normal">/ mes</span></span>
                    <ul className="text-[11px] text-slate-600 mt-4 space-y-1.5 border-t border-slate-200 pt-4 font-semibold leading-relaxed">
                      <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-[#468DFF] shrink-0" /> hasta 15 clientes</li>
                      <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-[#468DFF] shrink-0" /> hasta 15 miembros equipo</li>
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
                    onClick={() => {
                      setSelectedPlan('standard_25');
                      setShowPlanModal(false);
                    }}
                    className={`w-full py-2.5 rounded-xl mt-6 text-xs font-bold transition-all ${selectedPlan === 'standard_25' ? 'bg-[#468DFF] text-white opacity-80 cursor-default' : 'bg-[#468DFF] hover:bg-[#0511F2] text-white cursor-pointer'}`}
                  >
                    {selectedPlan === 'standard_25' ? 'Seleccionado' : 'Elegir'}
                  </button>
                </div>

                {/* Plan Full */}
                <div className={`rounded-2xl border p-5 flex flex-col justify-between transition-all ${selectedPlan === 'libre' ? 'border-[#468DFF] bg-[#468DFF]/5 ring-2 ring-[#468DFF]/20 shadow-md' : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'}`}>
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
                    onClick={() => {
                      setSelectedPlan('libre');
                      setShowPlanModal(false);
                    }}
                    className={`w-full py-2.5 rounded-xl mt-6 text-xs font-bold transition-all ${selectedPlan === 'libre' ? 'bg-[#468DFF] text-white opacity-80 cursor-default' : 'bg-[#468DFF] hover:bg-[#0511F2] text-white cursor-pointer'}`}
                  >
                    {selectedPlan === 'libre' ? 'Seleccionado' : 'Elegir'}
                  </button>
                </div>

            </div>
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
        cancelText={confirmDialogConfig.cancelText}
      />

      <AppUnsavedChangesDialog
        open={showUnsavedChangesDialog}
        onOpenChange={setShowUnsavedChangesDialog}
        onLeave={unsavedChangesConfig.onLeave}
      />

      <PublicFooter />
    </div>
  );
}
