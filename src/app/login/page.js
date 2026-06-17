// src/app/login/page.js
'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Mail, Lock, ShieldAlert, ArrowRight, Loader2, X, CheckCircle, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
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

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (isDevMode) {
      console.log('Simulando login con:', email);
      setTimeout(() => {
        setLoading(false);
        window.location.href = '/onboarding';
      }, 1500);
      return;
    }

    if (cooldownSeconds > 0) {
      setErrorMessage(`Demasiados intentos fallidos. Por favor, espera ${cooldownSeconds} segundos antes de intentar nuevamente.`);
      setShowErrorModal(true);
      setLoading(false);
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
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setForgotLoading(true);
    setForgotError(null);
    setForgotSuccess(false);

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
      setForgotError('Ocurrió un error al enviar el enlace. Por favor, verifica el correo ingresado.');
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#D9D9D9] text-slate-700 flex items-center justify-center relative overflow-hidden font-sans px-4">
      {/* Background gradients */}
      <div className="absolute top-[-20%] left-[-20%] w-[600px] h-[600px] rounded-full bg-[#468DFF]/5 blur-[180px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[600px] h-[600px] rounded-full bg-[#0511F2]/5 blur-[180px] pointer-events-none" />

      <div className="w-full max-w-md z-10">
        {/* Header */}
        <div className="text-center mb-6">
          <p className="text-sm text-slate-600 mt-2 font-medium">
            Ingresá a tu panel de seguridad e higiene laboral
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-8 shadow-xl">
          <img
            src="/brand/logo-black.png"
            alt="Logo Gestión SySO"
            width="220"
            style={{ width: '220px', height: 'auto', display: 'block', margin: '0 auto' }}
            className="mx-auto object-contain mb-6"
          />

          {isDevMode && (
            <div className="mb-6 p-3 rounded-lg border border-amber-500/20 bg-amber-50 text-amber-700 text-xs">
              <strong>Modo Demo / Desarrollo Activo</strong>: Se simulará el login para permitir pruebas visuales sin base de datos activa.
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
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
                  className="w-full bg-slate-50 border border-slate-300 focus:border-[#468DFF] focus:ring-1 focus:ring-[#468DFF] rounded-xl py-3 pl-10 pr-4 text-slate-800 placeholder-slate-400 focus:outline-none transition-all"
                />
              </div>
            </div>

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
                  className="w-full bg-slate-50 border border-slate-300 focus:border-[#468DFF] focus:ring-1 focus:ring-[#468DFF] rounded-xl py-3 pl-10 pr-12 text-slate-800 placeholder-slate-400 focus:outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-700"
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
        </div>

        {/* Footer info */}
        <p className="text-center text-xs text-slate-600 mt-8">
          ¿No tenés una cuenta?{' '}
          <a href="/register" className="text-[#468DFF] hover:text-[#0511F2] font-bold transition-colors">
            Registrate gratis
          </a>
        </p>
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
              className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition-all"
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
              <h3 className="font-outfit text-lg font-bold text-slate-900 mb-2">Recuperar Contraseña</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Ingresá tu correo electrónico para recibir un enlace seguro de restablecimiento.
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
                  className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-semibold transition-all mt-4"
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
                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="w-full py-2.5 rounded-xl bg-[#468DFF] hover:bg-[#0511F2] text-white text-xs font-semibold transition-all flex items-center justify-center gap-2"
                >
                  {forgotLoading ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Enviando enlace...
                    </>
                  ) : (
                    <>Enviar correo</>
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
