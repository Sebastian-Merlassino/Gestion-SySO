// src/app/login/page.js
'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Mail, Hash, Lock, ShieldAlert, ArrowRight, Loader2, X, CheckCircle, Eye, EyeOff } from 'lucide-react';
import AppCard from '@/components/ui/AppCard';
import AppInput from '@/components/ui/AppInput';
import AppButton from '@/components/ui/AppButton';
export default function LoginPage() {
  const [activeTab, setActiveTab] = useState('profesional'); // 'profesional' or 'cliente'
  const [email, setEmail] = useState('');
  const [cuit, setCuit] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isDevMode, setIsDevMode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  // Modales de Notificación y Olvido de Contraseña
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotCuit, setForgotCuit] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const [forgotError, setForgotError] = useState(null);

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = setInterval(() => {
      setCooldownSeconds(prev => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownSeconds]);

  useEffect(() => {
    // Detectar si no están configuradas las variables de Supabase reales
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('placeholder')) {
      setIsDevMode(true);
    }
  }, []);

  const handleCuitChange = (e, setter) => {
    const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 11);
    setter(val);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (cooldownSeconds > 0) {
      setErrorMessage(`Demasiados intentos fallidos. Por favor, espera ${cooldownSeconds} segundos antes de intentar nuevamente.`);
      setShowErrorModal(true);
      setLoading(false);
      return;
    }

    if (activeTab === 'profesional') {
      // --- FLUJO DE LOGIN PARA PROFESIONALES (EMAIL) ---
      if (isDevMode) {
        console.log('Simulando login con:', email);
        setTimeout(() => {
          setLoading(false);
          window.location.href = '/onboarding';
        }, 1500);
        return;
      }

      try {
        const { data, error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (authError) throw authError;

        // Obtener perfil para redirigir
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('tenant_id, tenants(slug)')
          .eq('id', data.user.id)
          .single();

        if (profileError && profileError.code !== 'PGRST116') {
          throw profileError;
        }

        setFailedAttempts(0); // Reset attempts on success

        if (profile?.tenant_id && profile?.tenants?.slug) {
          window.location.href = `/${profile.tenants.slug}/dashboard`;
        } else {
          localStorage.setItem('onboarding_email', email);
          window.location.href = '/onboarding';
        }
      } catch (err) {
        console.error('Login error:', err);
        let friendlyMessage = 'Error al iniciar sesión. Verifica tus credenciales.';
        if (err.message === 'Invalid login credentials' || err.status === 400) {
          friendlyMessage = 'Credenciales de inicio de sesión inválidas. Por favor, verifica tu correo y contraseña.';
        } else if (err.message === 'Email not confirmed') {
          friendlyMessage = 'El correo electrónico no ha sido verificado aún.';
        }

        handleLoginFailure(friendlyMessage);
      }
    } else {
      // --- FLUJO DE LOGIN PARA CLIENTES (CUIT) ---
      const cleanCuit = cuit.replace(/[^0-9]/g, '');
      if (cleanCuit.length !== 11) {
        setErrorMessage('El CUIT debe contener exactamente 11 números enteros, sin puntos ni guiones.');
        setShowErrorModal(true);
        setLoading(false);
        return;
      }

      if (isDevMode) {
        console.log('Simulando login de cliente con CUIT:', cleanCuit);
        setTimeout(() => {
          setLoading(false);
          window.location.href = '/demo/dashboard'; // Fallback link
        }, 1500);
        return;
      }

      try {
        // Enviar cuit y contraseña al endpoint seguro en el backend para autenticar y redirigir
        const response = await fetch('/api/auth/login-cuit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ cuit: cleanCuit, password })
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Credenciales de inicio de sesión inválidas.');
        }

        setFailedAttempts(0); // Restablecer intentos al ingresar con éxito
        window.location.href = result.redirectUrl;
      } catch (err) {
        console.error('Login client error:', err);
        let friendlyMessage = err.message || 'Error al iniciar sesión. Verifica tus credenciales.';
        if (err.message === 'Invalid login credentials' || err.status === 400) {
          friendlyMessage = 'Credenciales de inicio de sesión inválidas. Por favor, verifica tu CUIT y contraseña.';
        }

        handleLoginFailure(friendlyMessage);
      }
    }
  };

  const handleLoginFailure = (friendlyMessage) => {
    setFailedAttempts(prev => {
      const next = prev + 1;
      if (next >= 3) {
        setCooldownSeconds(30);
        setErrorMessage('Demasiados intentos fallidos consecutivos. Tu acceso ha sido temporalmente bloqueado por 30 segundos.');
        setShowErrorModal(true);
        return 0; // reset
      } else {
        setErrorMessage(friendlyMessage);
        setShowErrorModal(true);
        return next;
      }
    });
    setLoading(false);
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setForgotLoading(true);
    setForgotError(null);
    setForgotSuccess(false);

    if (activeTab === 'profesional') {
      // --- RECUPERAR CONTRASEÑA PROFESIONAL (EMAIL) ---
      if (isDevMode) {
        console.log('Simulando recuperación de clave para:', forgotEmail);
        setTimeout(() => {
          setForgotLoading(false);
          setForgotSuccess(true);
        }, 1500);
        return;
      }

      try {
        const { error: resetErr } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
          redirectTo: `${window.location.origin}/reset-password`,
        });

        if (resetErr) throw resetErr;

        setForgotLoading(false);
        setForgotSuccess(true);
      } catch (err) {
        console.error('Password reset error:', err);
        setForgotError(err.message || 'Ocurrió un error al enviar el enlace. Por favor, verifica el correo ingresado.');
        setForgotLoading(false);
      }
    } else {
      // --- RECUPERAR CONTRASEÑA CLIENTE (CUIT) ---
      const cleanCuit = forgotCuit.replace(/[^0-9]/g, '');
      if (cleanCuit.length !== 11) {
        setForgotError('El CUIT debe contener exactamente 11 números enteros.');
        setForgotLoading(false);
        return;
      }

      if (isDevMode) {
        console.log('Simulando recuperación de clave de cliente para CUIT:', cleanCuit);
        setTimeout(() => {
          setForgotLoading(false);
          setForgotSuccess(true);
        }, 1500);
        return;
      }

      try {
        // 1. Resolver el email asociado al CUIT
        const { data: clientEmail, error: rpcError } = await supabase.rpc('get_email_by_cuit', {
          p_cuit: cleanCuit
        });

        if (rpcError) throw rpcError;

        if (!clientEmail) {
          throw new Error('El CUIT ingresado no corresponde a ningún cliente registrado o con acceso habilitado.');
        }

        // 2. Disparar el flujo de reset de contraseña
        const { error: resetErr } = await supabase.auth.resetPasswordForEmail(clientEmail, {
          redirectTo: `${window.location.origin}/reset-password`,
        });

        if (resetErr) throw resetErr;

        setForgotLoading(false);
        setForgotSuccess(true);
      } catch (err) {
        console.error('Password reset client error:', err);
        setForgotError(err.message || 'Ocurrió un error al enviar el enlace de restablecimiento.');
        setForgotLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-syso-bg text-slate-700 flex items-center justify-center relative overflow-hidden font-sans px-4">
      {/* Background gradients */}
      <div className="absolute top-[-20%] left-[-20%] w-[600px] h-[600px] rounded-full bg-[#468DFF]/5 blur-[180px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[600px] h-[600px] rounded-full bg-[#0511F2]/5 blur-[180px] pointer-events-none" />

      <div className="w-full max-w-md z-10">
        {/* Form Card */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-8 shadow-xl">
          <img
            src="/brand/logo-black.png"
            alt="Logo Gestión SySO"
            width="220"
            style={{ width: '220px', height: 'auto', display: 'block', margin: '0 auto' }}
            className="mx-auto object-contain mb-4"
          />

           <p className="text-sm text-slate-600 font-semibold text-center mb-1">
            {activeTab === 'profesional' ? 'Portal Profesional' : 'Portal de Clientes'}
          </p>
          <div className="min-h-[32px] flex items-center justify-center mb-6">
            <p className="text-xs text-slate-500 font-medium text-center">
              {activeTab === 'profesional' 
                ? 'Ingresá a tu panel de Higiene y Seguridad laboral' 
                : 'Ingresa para visualizar tu legajo técnico de higiene y seguridad'}
            </p>
          </div>

          {/* Tab Selector */}
          <div className="flex bg-slate-100 p-1.5 rounded-xl mb-6">
            <button
              type="button"
              onClick={() => {
                setActiveTab('profesional');
                setPassword('');
              }}
              className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === 'profesional'
                  ? 'bg-[#468DFF] text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
              }`}
            >
              Profesionales
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('cliente');
                setPassword('');
              }}
              className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === 'cliente'
                  ? 'bg-[#468DFF] text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
              }`}
            >
              Clientes
            </button>
          </div>

          {isDevMode && (
            <div className="mb-6 p-3 rounded-lg border border-amber-500/20 bg-amber-50 text-amber-700 text-xs">
              <strong>Modo Demo / Desarrollo Activo</strong>: Se simulará el login para permitir pruebas visuales sin base de datos activa.
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            {activeTab === 'profesional' ? (
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Correo Electrónico
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <Mail className="h-5 w-5" />
                  </span>
                  <input
                    type="email"
                    required
                    placeholder="nombre@empresa.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="username"
                    className="w-full bg-slate-50 border border-slate-300 focus:border-[#468DFF] focus:ring-1 focus:ring-[#468DFF] rounded-xl py-3 pl-10 pr-4 text-slate-800 placeholder-slate-400 focus:outline-none transition-all"
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Número de CUIT
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <Hash className="h-5 w-5" />
                  </span>
                  <input
                    type="text"
                    required
                    placeholder="CUIT sin puntos ni guiones (ej. 30712345678)"
                    value={cuit}
                    onChange={(e) => handleCuitChange(e, setCuit)}
                    autoComplete="username"
                    className="w-full bg-slate-50 border border-slate-300 focus:border-[#468DFF] focus:ring-1 focus:ring-[#468DFF] rounded-xl py-3 pl-10 pr-4 text-slate-800 placeholder-slate-400 focus:outline-none transition-all"
                  />
                </div>
              </div>
            )}

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Contraseña
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setForgotSuccess(false);
                    setForgotError(null);
                    setForgotEmail('');
                    setForgotCuit('');
                    setShowForgotModal(true);
                  }}
                  className="text-xs text-[#468DFF] hover:text-[#0511F2] font-semibold transition-colors"
                >
                  ¿La olvidaste?
                </button>
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Lock className="h-5 w-5" />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className="w-full bg-slate-50 border border-slate-300 focus:border-[#468DFF] focus:ring-1 focus:ring-[#468DFF] rounded-xl py-3 pl-10 pr-12 text-slate-800 placeholder-slate-400 focus:outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || cooldownSeconds > 0}
              className="w-full py-3 rounded-xl bg-[#468DFF] hover:bg-[#0511F2] text-white font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/10 hover:shadow-blue-500/25 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Iniciando sesión...
                </>
              ) : cooldownSeconds > 0 ? (
                <>
                  Bloqueado ({cooldownSeconds}s)
                </>
              ) : (
                <>
                  Ingresar
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Registro link inside the card container with stable layout height to prevent jumping */}
          <div className="mt-6 text-center text-sm text-slate-600 min-h-[24px] flex items-center justify-center">
            <span className={`transition-all duration-200 ${
              activeTab === 'profesional' ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none select-none'
            }`}>
              ¿No tenés una cuenta?{' '}
              <a href="/register" className="text-[#468DFF] hover:text-[#0511F2] font-bold transition-colors">
                Registrate gratis
              </a>
            </span>
          </div>
        </div>
      </div>

      {/* ERROR MODAL POPUP */}
      {showErrorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-sm p-6 shadow-2xl relative text-center animate-scaleUp">
            <button 
              onClick={() => setShowErrorModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors border border-slate-200"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="h-12 w-12 rounded-full bg-red-50 border border-red-100 flex items-center justify-center text-red-500 mx-auto mb-4">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <h3 className="font-outfit text-lg font-bold text-slate-900 mb-2">Error de Acceso</h3>
            <p className="text-xs text-slate-600 leading-relaxed mb-6">
              {errorMessage}
            </p>
            <button
              onClick={() => setShowErrorModal(false)}
              className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition-all cursor-pointer"
            >
              Aceptar
            </button>
          </div>
        </div>
      )}

      {/* FORGOT PASSWORD MODAL POPUP */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-sm p-6 shadow-2xl relative animate-scaleUp">
            <button 
              onClick={() => setShowForgotModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors border border-slate-200"
            >
              <X className="h-4 w-4" />
            </button>
            
            <div className="text-center mb-6">
              <h3 className="font-outfit text-lg font-bold text-slate-900 mb-2">
                {activeTab === 'profesional' ? 'Recuperar Contraseña' : 'Recuperar Clave de Cliente'}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {activeTab === 'profesional'
                  ? 'Ingresá tu correo electrónico para recibir un enlace seguro de restablecimiento.'
                  : 'Ingresá tu número de CUIT registrado para recibir un enlace seguro de restablecimiento en tu correo de contacto asignado.'}
              </p>
            </div>

            {forgotSuccess ? (
              <div className="text-center py-4 space-y-4">
                <div className="h-12 w-12 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-500 mx-auto">
                  <CheckCircle className="h-6 w-6" />
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  ¡Enlace enviado! Revisá tu bandeja de entrada y spam para restablecer tu clave.
                </p>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-semibold transition-all mt-4 cursor-pointer"
                >
                  Cerrar Ventana
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                {forgotError && (
                  <div className="p-2.5 rounded-lg border border-red-200 bg-red-50 text-red-600 text-[10px]">
                    {forgotError}
                  </div>
                )}
                {activeTab === 'profesional' ? (
                  <div className="text-left">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Correo de Usuario
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="ejemplo@correo.com"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 focus:border-[#468DFF] rounded-xl py-2.5 px-4 text-xs text-slate-800 focus:outline-none"
                    />
                  </div>
                ) : (
                  <div className="text-left">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Número de CUIT
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="30712345678"
                      value={forgotCuit}
                      onChange={(e) => handleCuitChange(e, setForgotCuit)}
                      className="w-full bg-slate-50 border border-slate-300 focus:border-[#468DFF] rounded-xl py-2.5 px-4 text-xs text-slate-800 focus:outline-none"
                    />
                  </div>
                )}
                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="w-full py-2.5 rounded-xl bg-[#468DFF] hover:bg-[#0511F2] text-white text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {forgotLoading ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Enviando enlace...
                    </>
                  ) : (
                    <>Enviar enlace de recuperación</>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
