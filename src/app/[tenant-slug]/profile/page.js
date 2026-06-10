// src/app/[tenant-slug]/profile/page.js
'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
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
  ArrowLeft
} from 'lucide-react';
import confetti from 'canvas-confetti';
import geodata from '@/data/localidades_agrupado.json';

export default function ProfilePage({ params }) {
  const tenantSlug = params['tenant-slug'];
  
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [isDevMode, setIsDevMode] = useState(false);
  
  // Datos de Usuario y Empresa
  const [currentUser, setCurrentUser] = useState(null);
  const [profileData, setProfileData] = useState(null);
  const [tenantData, setTenantData] = useState(null);

  // Campos Obligatorios
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [cuit, setCuit] = useState('');
  const [cuitError, setCuitError] = useState('');
  const [provincia, setProvincia] = useState('');
  const [localidad, setLocalidad] = useState('');
  const [localidadesList, setLocalidadesList] = useState([]);
  const [birthDate, setBirthDate] = useState('');

  // Campos Opcionales - Matrícula Profesional
  const [matriculaInstitucion, setMatriculaInstitucion] = useState('');
  const [matriculaNumero, setMatriculaNumero] = useState('');
  const [matriculaVencimiento, setMatriculaVencimiento] = useState('');
  const [fotoFrente, setFotoFrente] = useState(null);
  const [fotoFrentePreview, setFotoFrentePreview] = useState('');
  const [fotoDorso, setFotoDorso] = useState(null);
  const [fotoDorsoPreview, setFotoDorsoPreview] = useState('');

  // Campos Opcionales - Firma e Identidad de Empresa
  const [companyName, setCompanyName] = useState('');
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

  // Plan
  const [selectedPlan, setSelectedPlan] = useState('free');
  const [showPlanModal, setShowPlanModal] = useState(false);

  useEffect(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('placeholder')) {
      setIsDevMode(true);
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

        // Pre-cargar inputs de perfil
        setFullName(profile.full_name || '');
        setEmail(profile.email || '');
        setPhone(profile.phone || '');
        setCuit(profile.cuit || '');
        setProvincia(profile.provincia || '');
        setLocalidad(profile.localidad || '');
        setBirthDate(profile.birth_date || '');
        setMatriculaInstitucion(profile.matricula_institucion || '');
        setMatriculaNumero(profile.matricula_numero || '');
        setMatriculaVencimiento(profile.matricula_vencimiento || '');
        setFotoFrentePreview(profile.matricula_foto_frente_url || '');
        setFotoDorsoPreview(profile.matricula_foto_dorso_url || '');
        setFotoFirmaPreview(profile.signature_url || '');

        // Cargar Tenant
        if (profile.tenant_id) {
          const { data: tenant, error: tErr } = await supabase
            .from('tenants')
            .select('*')
            .eq('id', profile.tenant_id)
            .single();

          if (tErr) throw tErr;
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
        }

        setInitialLoading(false);
      } catch (e) {
        console.error('Error al cargar perfil:', e);
        setInitialLoading(false);
      }
    };

    if (!isDevMode) {
      loadProfileAndTenant();
    }
  }, [isDevMode]);

  // Manejar cambio de provincia para cargar localidades
  useEffect(() => {
    if (!provincia) {
      setLocalidadesList([]);
      return;
    }
    
    const provMatch = geodata.find(
      (p) => p.provincia.trim().toUpperCase() === provincia.trim().toUpperCase()
    );

    if (provMatch && provMatch.departamentos) {
      const allLocalities = [];
      provMatch.departamentos.forEach((dept) => {
        if (dept.localidades_barrios) {
          dept.localidades_barrios.forEach((loc) => {
            if (loc && !allLocalities.includes(loc)) {
              allLocalities.push(loc);
            }
          });
        }
      });
      allLocalities.sort();
      setLocalidadesList(allLocalities);
    } else {
      setLocalidadesList([]);
    }
  }, [provincia]);

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

  const handleImageChange = (e, setFile, setPreview) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
      alert('Por favor, selecciona una imagen en formato JPG o PNG.');
      return;
    }

    setFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result);
    };
    reader.readAsDataURL(file);
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
    setError(null);
    setSuccess(false);
    setLoading(true);

    // Validar obligatorios
    if (!fullName || !email || !phone || !cuit || !provincia || !localidad || !birthDate) {
      setError('Por favor completa todos los campos obligatorios (*).');
      setLoading(false);
      return;
    }

    if (cuit.length !== 11) {
      setError('El CUIT debe contener exactamente 11 números.');
      setLoading(false);
      return;
    }

    const userId = currentUser?.id || 'd290f1ee-6c54-4b01-90e6-d701748f0851';
    const tenantId = profileData?.tenant_id;

    if (isDevMode) {
      console.log('Simulando guardado en desarrollo...');
      setTimeout(() => {
        setLoading(false);
        setSuccess(true);
        confetti({
          particleCount: 100,
          spread: 60,
          origin: { y: 0.6 }
        });
      }, 2000);
      return;
    }

    try {
      // 1. Subida de imágenes nuevas
      let signatureUrl = fotoFirmaPreview;
      let frontUrl = fotoFrentePreview;
      let backUrl = fotoDorsoPreview;
      let logo1Url = logo1Preview;
      let logo2Url = logo2Preview;

      const uploadPromises = [];
      const uploadKeys = [];

      if (fotoFirma) {
        const ext = fotoFirma.name.split('.').pop();
        uploadPromises.push(uploadFileToStorage('signatures', `${userId}/firma_${Date.now()}.${ext}`, fotoFirma));
        uploadKeys.push('signature');
      }

      if (fotoFrente) {
        const ext = fotoFrente.name.split('.').pop();
        uploadPromises.push(uploadFileToStorage('documents', `${userId}/matricula_frente_${Date.now()}.${ext}`, fotoFrente));
        uploadKeys.push('fotoFrente');
      }

      if (fotoDorso) {
        const ext = fotoDorso.name.split('.').pop();
        uploadPromises.push(uploadFileToStorage('documents', `${userId}/matricula_dorso_${Date.now()}.${ext}`, fotoDorso));
        uploadKeys.push('fotoDorso');
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
          if (key === 'fotoFrente') frontUrl = uploadUrls[idx];
          if (key === 'fotoDorso') backUrl = uploadUrls[idx];
          if (key === 'logo1') logo1Url = uploadUrls[idx];
          if (key === 'logo2') logo2Url = uploadUrls[idx];
        });
      }

      // 2. Actualizar Tenant
      if (tenantId) {
        const { error: tenantErr } = await supabase
          .from('tenants')
          .update({
            name: companyName || `${fullName} Consultora`,
            logo_1_url: logo1Url,
            logo_2_url: logo2Url,
            plan_id: selectedPlan,
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

      // 3. Actualizar Perfil
      const { error: profileErr } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          phone: phone,
          cuit: cuit,
          provincia: provincia,
          localidad: localidad,
          birth_date: birthDate,
          signature_url: signatureUrl,
          matricula_institucion: matriculaInstitucion || null,
          matricula_numero: matriculaNumero || null,
          matricula_vencimiento: matriculaVencimiento || null,
          matricula_foto_frente_url: frontUrl,
          matricula_foto_dorso_url: backUrl,
        })
        .eq('id', userId);

      if (profileErr) throw profileErr;

      setLoading(false);
      setSuccess(true);
      
      confetti({
        particleCount: 100,
        spread: 60,
        origin: { y: 0.6 }
      });

    } catch (err) {
      setError(err.message || 'Error al actualizar tus datos.');
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto" />
          <p className="text-xs text-slate-400">Cargando datos de perfil...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center relative overflow-hidden font-sans py-12 px-4">
      {/* Background gradients */}
      <div className="absolute top-[-10%] left-[-20%] w-[600px] h-[600px] rounded-full bg-blue-600/10 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-20%] w-[600px] h-[600px] rounded-full bg-indigo-600/10 blur-[150px] pointer-events-none" />

      <div className="w-full max-w-3xl z-10">
        
        {/* Back Link and Header */}
        <div className="flex justify-between items-center mb-8">
          <a
            href={`/${tenantSlug}/dashboard`}
            className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors py-2 px-4 rounded-xl border border-slate-900 bg-slate-950/40 backdrop-blur"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al Dashboard
          </a>
          <h1 className="font-outfit text-2xl font-extrabold tracking-tight bg-gradient-to-r from-slate-50 to-slate-300 bg-clip-text text-transparent">
            Mi Perfil Profesional
          </h1>
        </div>

        <form onSubmit={handleSaveChanges} className="space-y-8">
          
          {/* SECCIÓN 1: DATOS OBLIGATORIOS */}
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-8 backdrop-blur-xl shadow-2xl space-y-6">
            <h3 className="text-lg font-bold text-slate-100 border-b border-slate-800/60 pb-3 flex items-center gap-2">
              <span className="flex items-center justify-center h-6 w-6 rounded-md bg-blue-500/10 text-blue-400 text-xs font-bold border border-blue-500/20">1</span>
              Información Obligatoria
            </h3>

            {error && (
              <div className="p-3 rounded-lg border border-red-500/20 bg-red-950/20 text-red-400 text-xs flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Nombre y Apellido <span className="text-blue-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Juan Pérez"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl py-3 px-4 text-slate-200 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Correo Electrónico <span className="text-blue-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                    <Mail className="h-4 w-4" />
                  </span>
                  <input
                    type="email"
                    required
                    value={email}
                    className="w-full bg-slate-950/40 border border-slate-800 rounded-xl py-3 pl-10 pr-4 text-slate-500 cursor-not-allowed focus:outline-none"
                    disabled
                  />
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  CUIT <span className="text-blue-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="20443332225"
                  value={cuit}
                  onChange={handleCuitChange}
                  className={`w-full bg-slate-950/60 border ${cuitError ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-slate-800 focus:border-blue-500 focus:ring-blue-500'} rounded-xl py-3 px-4 text-slate-200 focus:outline-none`}
                />
                {cuitError && (
                  <span className="text-[10px] text-red-400 mt-1 block">{cuitError}</span>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Teléfono <span className="text-blue-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="1165432109"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-800 focus:border-blue-500 rounded-xl py-3 px-4 text-slate-200 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Fecha de Nacimiento <span className="text-blue-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-800 focus:border-blue-500 rounded-xl py-3 px-3 text-slate-200 text-xs focus:outline-none"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Provincia <span className="text-blue-500">*</span>
                </label>
                <select
                  required
                  value={provincia}
                  onChange={(e) => setProvincia(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-800 focus:border-blue-500 rounded-xl py-3 px-4 text-slate-200 focus:outline-none cursor-pointer"
                >
                  <option value="" disabled>Selecciona una provincia</option>
                  {geodata.map((prov) => (
                    <option key={prov.provincia} value={prov.provincia}>
                      {prov.provincia}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Localidad <span className="text-blue-500">*</span>
                </label>
                <select
                  required
                  disabled={!provincia}
                  value={localidad}
                  onChange={(e) => setLocalidad(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-800 focus:border-blue-500 rounded-xl py-3 px-4 text-slate-200 focus:outline-none cursor-pointer"
                >
                  <option value="" disabled>
                    {!provincia ? 'Primero selecciona una provincia' : 'Selecciona una localidad'}
                  </option>
                  {localidadesList.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* SECCIÓN 2: IDENTIDAD DE EMPRESA Y REDES SOCIALES (OPCIONAL) */}
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-8 backdrop-blur-xl shadow-2xl space-y-6">
            <h3 className="text-lg font-bold text-slate-100 border-b border-slate-800/60 pb-3 flex items-center gap-2">
              <span className="flex items-center justify-center h-6 w-6 rounded-md bg-blue-500/10 text-blue-400 text-xs font-bold border border-blue-500/20">2</span>
              Identidad de Empresa y Redes Sociales (Opcional)
            </h3>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Nombre de Empresa o Consultora
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-800 focus:border-blue-500 rounded-xl py-3 px-4 text-slate-200 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Página Web de la Empresa
                </label>
                <input
                  type="url"
                  placeholder="https://miweb.com"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-800 focus:border-blue-500 rounded-xl py-3 px-4 text-slate-200 focus:outline-none"
                />
              </div>
            </div>

            {/* Redes */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Redes Sociales</h4>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">LinkedIn</label>
                  <input
                    type="url"
                    value={linkedin}
                    onChange={(e) => setLinkedin(e.target.value)}
                    className="w-full bg-slate-950/40 border border-slate-800/80 rounded-xl py-2 px-3 text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Instagram</label>
                  <input
                    type="url"
                    value={instagram}
                    onChange={(e) => setInstagram(e.target.value)}
                    className="w-full bg-slate-950/40 border border-slate-800/80 rounded-xl py-2 px-3 text-xs focus:outline-none"
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
                    className="w-full bg-slate-950/40 border border-slate-800/80 rounded-xl py-2 px-3 text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">TikTok</label>
                  <input
                    type="url"
                    value={tiktok}
                    onChange={(e) => setTiktok(e.target.value)}
                    className="w-full bg-slate-950/40 border border-slate-800/80 rounded-xl py-2 px-3 text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">YouTube</label>
                  <input
                    type="url"
                    value={youtube}
                    onChange={(e) => setYoutube(e.target.value)}
                    className="w-full bg-slate-950/40 border border-slate-800/80 rounded-xl py-2 px-3 text-xs focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Logos */}
            <div className="grid md:grid-cols-2 gap-6 pt-4">
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Logo Principal (Logo 1)
                </label>
                <div className="relative border border-dashed border-slate-800 hover:border-blue-500/40 rounded-xl p-2 transition-all bg-slate-950/40 flex flex-col items-center justify-center text-center h-28 overflow-hidden group">
                  {logo1Preview ? (
                    <div className="relative w-full h-full">
                      <img src={logo1Preview} alt="Logo 1" className="w-full h-full object-contain" />
                      <button
                        type="button"
                        onClick={() => { setLogo1(null); setLogo1Preview(''); }}
                        className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white rounded-md p-1 text-[9px] font-bold"
                      >
                        Quitar
                      </button>
                    </div>
                  ) : (
                    <>
                      <ImageIcon className="h-5 w-5 text-slate-500 group-hover:text-blue-400 mb-1" />
                      <span className="text-[11px] text-slate-400">Subir Logo 1</span>
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
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Logo Secundario (Logo 2)
                </label>
                <div className="relative border border-dashed border-slate-800 hover:border-blue-500/40 rounded-xl p-2 transition-all bg-slate-950/40 flex flex-col items-center justify-center text-center h-28 overflow-hidden group">
                  {logo2Preview ? (
                    <div className="relative w-full h-full">
                      <img src={logo2Preview} alt="Logo 2" className="w-full h-full object-contain" />
                      <button
                        type="button"
                        onClick={() => { setLogo2(null); setLogo2Preview(''); }}
                        className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white rounded-md p-1 text-[9px] font-bold"
                      >
                        Quitar
                      </button>
                    </div>
                  ) : (
                    <>
                      <ImageIcon className="h-5 w-5 text-slate-500 group-hover:text-blue-400 mb-1" />
                      <span className="text-[11px] text-slate-400">Subir Logo 2</span>
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

          {/* SECCIÓN 3: MATRÍCULA Y FIRMA (OPCIONAL) */}
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-8 backdrop-blur-xl shadow-2xl space-y-6">
            <h3 className="text-lg font-bold text-slate-100 border-b border-slate-800/60 pb-3 flex items-center gap-2">
              <span className="flex items-center justify-center h-6 w-6 rounded-md bg-blue-500/10 text-blue-400 text-xs font-bold border border-blue-500/20">3</span>
              Matrícula Profesional y Firma (Opcional)
            </h3>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Colegio o Institución Emisora
                </label>
                <input
                  type="text"
                  placeholder="COPAIPA, Colegio de Ingenieros..."
                  value={matriculaInstitucion}
                  onChange={(e) => setMatriculaInstitucion(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-800 focus:border-blue-500 rounded-xl py-3 px-4 text-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Número
                  </label>
                  <input
                    type="text"
                    placeholder="M-7534"
                    value={matriculaNumero}
                    onChange={(e) => setMatriculaNumero(e.target.value)}
                    className="w-full bg-slate-950/60 border border-slate-800 focus:border-blue-500 rounded-xl py-3 px-4 text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Vencimiento
                  </label>
                  <input
                    type="date"
                    value={matriculaVencimiento}
                    onChange={(e) => setMatriculaVencimiento(e.target.value)}
                    className="w-full bg-slate-950/60 border border-slate-800 focus:border-blue-500 rounded-xl py-3 px-2 text-xs text-slate-200"
                  />
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6 pt-4">
              {/* Foto Frente */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Foto Frente Matrícula
                </label>
                <div className="relative border border-dashed border-slate-800 hover:border-blue-500/40 rounded-xl p-2 transition-all bg-slate-950/40 flex flex-col items-center justify-center text-center h-32 overflow-hidden group">
                  {fotoFrentePreview ? (
                    <div className="relative w-full h-full">
                      <img src={fotoFrentePreview} alt="Frente" className="w-full h-full object-contain" />
                      <button
                        type="button"
                        onClick={() => { setFotoFrente(null); setFotoFrentePreview(''); }}
                        className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white rounded-md p-1 text-[9px] font-bold"
                      >
                        Quitar
                      </button>
                    </div>
                  ) : (
                    <>
                      <Upload className="h-5 w-5 text-slate-500 group-hover:text-blue-400 mb-1" />
                      <span className="text-[11px] text-slate-400">Subir Frente</span>
                      <input
                        type="file"
                        accept=".png, .jpg, .jpeg"
                        onChange={(e) => handleImageChange(e, setFotoFrente, setFotoFrentePreview)}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                    </>
                  )}
                </div>
              </div>

              {/* Foto Dorso */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Foto Dorso Matrícula
                </label>
                <div className="relative border border-dashed border-slate-800 hover:border-blue-500/40 rounded-xl p-2 transition-all bg-slate-950/40 flex flex-col items-center justify-center text-center h-32 overflow-hidden group">
                  {fotoDorsoPreview ? (
                    <div className="relative w-full h-full">
                      <img src={fotoDorsoPreview} alt="Dorso" className="w-full h-full object-contain" />
                      <button
                        type="button"
                        onClick={() => { setFotoDorso(null); setFotoDorsoPreview(''); }}
                        className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white rounded-md p-1 text-[9px] font-bold"
                      >
                        Quitar
                      </button>
                    </div>
                  ) : (
                    <>
                      <Upload className="h-5 w-5 text-slate-500 group-hover:text-blue-400 mb-1" />
                      <span className="text-[11px] text-slate-400">Subir Dorso</span>
                      <input
                        type="file"
                        accept=".png, .jpg, .jpeg"
                        onChange={(e) => handleImageChange(e, setFotoDorso, setFotoDorsoPreview)}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                    </>
                  )}
                </div>
              </div>

              {/* Firma */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Firma Digital
                </label>
                <div className="relative border border-dashed border-slate-800 hover:border-blue-500/40 rounded-xl p-2 transition-all bg-slate-950/40 flex flex-col items-center justify-center text-center h-32 overflow-hidden group">
                  {fotoFirmaPreview ? (
                    <div className="relative w-full h-full">
                      <img src={fotoFirmaPreview} alt="Firma" className="w-full h-full object-contain" />
                      <button
                        type="button"
                        onClick={() => { setFotoFirma(null); setFotoFirmaPreview(''); }}
                        className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white rounded-md p-1 text-[9px] font-bold"
                      >
                        Quitar
                      </button>
                    </div>
                  ) : (
                    <>
                      <FileText className="h-5 w-5 text-slate-500 group-hover:text-blue-400 mb-1" />
                      <span className="text-[11px] text-slate-400">Subir Firma</span>
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
          </div>

          {/* SECCIÓN 4: PLAN */}
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-8 backdrop-blur-xl shadow-2xl space-y-6">
            <h3 className="text-lg font-bold text-slate-100 border-b border-slate-800/60 pb-3 flex items-center gap-2">
              <span className="flex items-center justify-center h-6 w-6 rounded-md bg-blue-500/10 text-blue-400 text-xs font-bold border border-blue-500/20">4</span>
              Plan Suscrito
            </h3>

            <div className="relative rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-950/15 via-slate-900/40 to-indigo-950/10 p-6 overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-blue-500/5 blur-xl pointer-events-none" />
              
              <div className="space-y-2">
                <span className="px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-semibold uppercase tracking-wider">
                  Plan Activo
                </span>
                <h4 className="font-outfit text-xl font-extrabold text-slate-100">
                  {selectedPlan === 'free' && 'Plan Gratis Permanente'}
                  {selectedPlan === 'basic_5' && 'Plan 5 Empresas'}
                  {selectedPlan === 'standard_25' && 'Plan 25 Empresas'}
                  {selectedPlan === 'libre' && 'Plan Libre (Ilimitado)'}
                </h4>
                <p className="text-xs text-slate-400">
                  {selectedPlan === 'free' && 'Límite de hasta 1 empresa cliente en base de datos, sin vencimiento de prueba.'}
                  {selectedPlan === 'basic_5' && 'Límite de hasta 5 empresas clientes en simultáneo.'}
                  {selectedPlan === 'standard_25' && 'Límite de hasta 25 empresas clientes en simultáneo.'}
                  {selectedPlan === 'libre' && 'Soporte ilimitado de empresas, inspectores y marca personal.'}
                </p>
              </div>

              <div className="flex flex-col items-stretch md:items-end gap-3 shrink-0">
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 block">Costo mensual</span>
                  <span className="font-outfit text-2xl font-extrabold text-blue-400">
                    {selectedPlan === 'free' && '$0'}
                    {selectedPlan === 'basic_5' && '$3.500'}
                    {selectedPlan === 'standard_25' && '$7.500'}
                    {selectedPlan === 'libre' && '$12.000'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPlanModal(true)}
                  className="py-2.5 px-4 rounded-xl border border-blue-500/40 hover:bg-blue-500/10 text-blue-400 font-semibold text-xs transition-all flex items-center justify-center gap-2"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Cambiar / Subir Plan
                </button>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end pt-4 gap-4">
            {success && (
              <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1.5">
                <CheckCircle className="h-4 w-4" />
                ¡Cambios guardados con éxito en Supabase!
              </span>
            )}
            <button
              type="submit"
              disabled={loading}
              className="py-4 px-10 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-bold text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/15 hover:shadow-blue-500/30 active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Guardando cambios...
                </>
              ) : (
                <>
                  Guardar datos
                  <CheckCircle2 className="h-4 w-4 text-blue-100" />
                </>
              )}
            </button>
          </div>

        </form>

      </div>

      {/* PLAN SELECTION MODAL */}
      {showPlanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl p-6 shadow-2xl relative animate-scaleUp">
            <button 
              onClick={() => setShowPlanModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-slate-100 transition-colors border border-slate-800"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="text-center mb-6">
              <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 text-[10px] font-semibold uppercase tracking-wider">
                Suscripciones SaaS
              </span>
              <h3 className="font-outfit text-2xl font-extrabold text-slate-50 mt-2">
                Modificar tu Plan Comercial
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Elegí el plan que mejor se adapte a tus necesidades de seguridad e higiene.
              </p>
            </div>

            {/* Grid of Plans */}
            <div className="grid md:grid-cols-4 gap-4">
              
              {/* Plan Free */}
              <div className={`rounded-xl border p-3 flex flex-col justify-between transition-all ${selectedPlan === 'free' ? 'border-blue-500 bg-blue-950/10' : 'border-slate-800/80 bg-slate-950/40 hover:border-slate-700'}`}>
                <div>
                  <h4 className="text-xs font-bold text-slate-100">Plan Gratis</h4>
                  <p className="text-[9px] text-slate-400 mt-1">Ideal para probar la herramienta.</p>
                  <span className="font-outfit text-base font-extrabold text-blue-400 mt-2 block">$0 <span className="text-[9px] text-slate-500 font-normal">/ permanente</span></span>
                  <ul className="text-[8px] text-slate-300 mt-3 space-y-1 border-t border-slate-800 pt-2">
                    <li className="flex items-center gap-1"><CheckCircle className="h-2.5 w-2.5 text-blue-400 shrink-0" /> 1 Empresa cliente</li>
                    <li className="flex items-center gap-1"><CheckCircle className="h-2.5 w-2.5 text-blue-400 shrink-0" /> Sin límite tiempo</li>
                  </ul>
                </div>
                <button
                  type="button"
                  onClick={() => { setSelectedPlan('free'); setShowPlanModal(false); }}
                  className={`w-full py-1 rounded-lg mt-3 text-[10px] font-semibold transition-all ${selectedPlan === 'free' ? 'bg-blue-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'}`}
                >
                  {selectedPlan === 'free' ? 'Seleccionado' : 'Elegir'}
                </button>
              </div>

              {/* Plan 5 */}
              <div className={`rounded-xl border p-3 flex flex-col justify-between transition-all ${selectedPlan === 'basic_5' ? 'border-blue-500 bg-blue-950/10' : 'border-slate-800/80 bg-slate-950/40 hover:border-slate-700'}`}>
                <div>
                  <h4 className="text-xs font-bold text-slate-100">Plan 5</h4>
                  <p className="text-[9px] text-slate-400 mt-1">Para profesionales de campo.</p>
                  <span className="font-outfit text-base font-extrabold text-blue-400 mt-2 block">$3.500 <span className="text-[9px] text-slate-500 font-normal">/ mes</span></span>
                  <ul className="text-[8px] text-slate-300 mt-3 space-y-1 border-t border-slate-800 pt-2">
                    <li className="flex items-center gap-1"><CheckCircle className="h-2.5 w-2.5 text-blue-400 shrink-0" /> 5 Empresas clientes</li>
                    <li className="flex items-center gap-1"><CheckCircle className="h-2.5 w-2.5 text-blue-400 shrink-0" /> Todas las funciones</li>
                  </ul>
                </div>
                <button
                  type="button"
                  onClick={() => { setSelectedPlan('basic_5'); setShowPlanModal(false); }}
                  className={`w-full py-1 rounded-lg mt-3 text-[10px] font-semibold transition-all ${selectedPlan === 'basic_5' ? 'bg-blue-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'}`}
                >
                  {selectedPlan === 'basic_5' ? 'Seleccionado' : 'Elegir'}
                </button>
              </div>

              {/* Plan 25 */}
              <div className={`rounded-xl border p-3 flex flex-col justify-between transition-all ${selectedPlan === 'standard_25' ? 'border-blue-500 bg-blue-950/10' : 'border-slate-800/80 bg-slate-950/40 hover:border-slate-700'}`}>
                <div>
                  <h4 className="text-xs font-bold text-slate-100">Plan 25</h4>
                  <p className="text-[9px] text-slate-400 mt-1">Para consultoras medianas.</p>
                  <span className="font-outfit text-base font-extrabold text-blue-400 mt-2 block">$7.500 <span className="text-[9px] text-slate-500 font-normal">/ mes</span></span>
                  <ul className="text-[8px] text-slate-300 mt-3 space-y-1 border-t border-slate-800 pt-2">
                    <li className="flex items-center gap-1"><CheckCircle className="h-2.5 w-2.5 text-blue-400 shrink-0" /> 25 Empresas clientes</li>
                    <li className="flex items-center gap-1"><CheckCircle className="h-2.5 w-2.5 text-blue-400 shrink-0" /> Soporte priorizado</li>
                  </ul>
                </div>
                <button
                  type="button"
                  onClick={() => { setSelectedPlan('standard_25'); setShowPlanModal(false); }}
                  className={`w-full py-1 rounded-lg mt-3 text-[10px] font-semibold transition-all ${selectedPlan === 'standard_25' ? 'bg-blue-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'}`}
                >
                  {selectedPlan === 'standard_25' ? 'Seleccionado' : 'Elegir'}
                </button>
              </div>

              {/* Plan Libre */}
              <div className={`rounded-xl border p-3 flex flex-col justify-between transition-all ${selectedPlan === 'libre' ? 'border-blue-500 bg-blue-950/10' : 'border-slate-800/80 bg-slate-950/40 hover:border-slate-700'}`}>
                <div>
                  <h4 className="text-xs font-bold text-slate-100">Plan Libre</h4>
                  <p className="text-[9px] text-slate-400 mt-1">Constructoras y corporaciones.</p>
                  <span className="font-outfit text-base font-extrabold text-blue-400 mt-2 block">$12.000 <span className="text-[9px] text-slate-500 font-normal">/ mes</span></span>
                  <ul className="text-[8px] text-slate-300 mt-3 space-y-1 border-t border-slate-800 pt-2">
                    <li className="flex items-center gap-1"><CheckCircle className="h-2.5 w-2.5 text-blue-400 shrink-0" /> Empresas ilimitadas</li>
                    <li className="flex items-center gap-1"><CheckCircle className="h-2.5 w-2.5 text-blue-400 shrink-0" /> Branding completo</li>
                  </ul>
                </div>
                <button
                  type="button"
                  onClick={() => { setSelectedPlan('libre'); setShowPlanModal(false); }}
                  className={`w-full py-1 rounded-lg mt-3 text-[10px] font-semibold transition-all ${selectedPlan === 'libre' ? 'bg-blue-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'}`}
                >
                  {selectedPlan === 'libre' ? 'Seleccionado' : 'Elegir'}
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
