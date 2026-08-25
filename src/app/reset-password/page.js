// src/app/reset-password/page.js
'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Lock, ShieldAlert, CheckCircle, Loader2, ArrowRight, X, Eye, EyeOff } from 'lucide-react';
import AppCard from '@/components/ui/AppCard';
import AppInput from '@/components/ui/AppInput';
import AppButton from '@/components/ui/AppButton';
import PublicFooter from '@/components/PublicFooter';
export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [isDevMode, setIsDevMode] = useState(false);
  
  // Modal de error
  const [showErrorModal, setShowErrorModal] = useState(false);

  const [sessionReady, setSessionReady] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const isDev = !supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('placeholder');
    if (isDev) {
      setIsDevMode(true);
      setCheckingSession(false);
      setSessionReady(true);
      return;
    }

    const initPage = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      
      // Detectar errores de verificación server-side
      const errorParam = urlParams.get('error');
      if (errorParam === 'invalid_or_expired') {
        setError('El enlace de restablecimiento es inválido o ha expirado. Por favor, solicite uno nuevo.');
        setShowErrorModal(true);
        setCheckingSession(false);
        return;
      }
      if (errorParam === 'missing_token' || errorParam === 'config' || errorParam === 'unexpected') {
        setError('Ocurrió un error al procesar el enlace. Por favor, solicite uno nuevo.');
        setShowErrorModal(true);
        setCheckingSession(false);
        return;
      }

      // Soporte legacy: si llega con code (callback PKCE directo)
      const code = urlParams.get('code');
      if (code) {
        try {
          const { error: codeError } = await supabase.auth.exchangeCodeForSession(code);
          if (codeError) {
            console.error('[Reset Password] Code exchange error:', codeError.message);
            setError('El enlace de restablecimiento es inválido o ha expirado. Por favor, solicite uno nuevo.');
            setShowErrorModal(true);
            setCheckingSession(false);
            return;
          }
        } catch (err) {
          console.error('[Reset Password] Code exchange exception:', err);
        }
      }

      // Verificar si hay sesión activa (establecida por /api/auth/verify-recovery)
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setSessionReady(true);
      } else {
        setError('No se detectó una sesión activa. Por favor, solicitá un nuevo enlace de recuperación desde el login.');
        setShowErrorModal(true);
      }
      setCheckingSession(false);
    };

    initPage();
  }, []);

  const handleReset = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validaciones
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      setShowErrorModal(true);
      setLoading(false);
      return;
    }

    const isStrongPassword = (pwd) => {
      if (pwd.length < 8) return false;
      if (!/[A-Z]/.test(pwd)) return false;
      if (!/[0-9]/.test(pwd)) return false;
      return true;
    };

    if (!isStrongPassword(password)) {
      setError('La contraseña debe tener al menos 8 caracteres, incluir al menos una letra mayúscula y al menos un número.');
      setShowErrorModal(true);
      setLoading(false);
      return;
    }

    if (isDevMode) {
      console.log('Simulando cambio de contraseña en desarrollo...');
      setTimeout(() => {
        setLoading(false);
        setSuccess(true);
      }, 1500);
      return;
    }

    try {
      // Actualizar la contraseña del usuario en Supabase Auth
      const { error: updateErr } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateErr) throw updateErr;

      // Cerrar la sesión de recuperación para forzar un login limpio con la nueva contraseña
      await supabase.auth.signOut();

      setLoading(false);
      setSuccess(true);

    } catch (err) {
      let rawMsg = err.message || '';
      let userMsg = 'Error al cambiar la contraseña. Vuelva a solicitar el enlace.';
      
      if (rawMsg.includes('New password should be different') || rawMsg.includes('different from the old password')) {
        userMsg = 'La nueva contraseña debe ser diferente a la contraseña anterior.';
      } else if (rawMsg.includes('Password should be at least')) {
        userMsg = 'La contraseña debe tener al menos 8 caracteres, una mayúscula y un número.';
      } else if (rawMsg) {
        userMsg = rawMsg;
      }

      setError(userMsg);
      setShowErrorModal(true);
      setLoading(false);
    }
  };

  const handleGoToLogin = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error('Error al cerrar sesión:', e);
    }
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen bg-syso-bg text-slate-700 flex flex-col justify-between items-center relative overflow-hidden font-sans">
      {/* Background gradients */}
      <div className="absolute top-[-20%] left-[-20%] w-[600px] h-[600px] rounded-full bg-[#468DFF]/5 blur-[180px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[600px] h-[600px] rounded-full bg-[#0511F2]/5 blur-[180px] pointer-events-none" />

      <div className="w-full max-w-md z-10 flex-1 flex items-center justify-center py-12 px-4">
        {/* Card Form */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-8 shadow-xl w-full">
          {/* Logo a nivel de tarjeta */}
          <img
            src="/brand/logo-black.png"
            alt="Logo Gestión SySO"
            width="220"
            style={{ width: '220px', height: 'auto', display: 'block', margin: '0 auto' }}
            className="mx-auto object-contain mb-4"
          />

          {checkingSession ? (
            <div className="text-center space-y-4 py-8">
              <Loader2 className="h-8 w-8 text-[#468DFF] animate-spin mx-auto" />
              <p className="text-sm text-slate-500 font-medium">Verificando enlace de recuperación...</p>
            </div>
          ) : success ? (
            <div className="text-center space-y-4">
              <p className="text-sm text-slate-600 font-medium text-center mb-2">
                Restablecimiento completo
              </p>
              <div className="h-12 w-12 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-500 mx-auto">
                <CheckCircle className="h-6 w-6" />
              </div>
              <h3 className="font-outfit text-lg font-bold text-slate-900">¡Contraseña Cambiada!</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Tu clave ha sido actualizada con éxito. Ya podés ingresar a tu panel.
              </p>
              <button
                onClick={handleGoToLogin}
                className="w-full py-3 rounded-xl bg-[#468DFF] hover:bg-[#0511F2] text-white font-semibold text-sm transition-all flex items-center justify-center gap-2 mt-4"
              >
                Ir a Iniciar Sesión
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          ) : sessionReady ? (
            <>
              <p className="text-sm text-slate-600 font-medium text-center mb-6">
                Ingresá tu nueva contraseña para volver a acceder de forma segura
              </p>

              <form onSubmit={handleReset} className="space-y-6">
                {isDevMode && (
                  <div className="p-3 rounded-lg border border-amber-500/20 bg-amber-50 text-amber-700 text-xs">
                    <strong>Modo Demo</strong>: Simulación local del cambio de contraseña.
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Nueva Contraseña
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                      <Lock className="h-5 w-5" />
                    </span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="Mínimo 8 caracteres"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="new-password"
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
                  <p className="text-[10px] text-slate-500 mt-1.5 font-medium leading-relaxed">
                    Debe tener al menos 8 caracteres, incluir al menos una letra mayúscula y al menos un número.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Confirmar Contraseña
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                      <Lock className="h-5 w-5" />
                    </span>
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      placeholder="Repita la contraseña"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      autoComplete="new-password"
                      className="w-full bg-slate-50 border border-slate-300 focus:border-[#468DFF] focus:ring-1 focus:ring-[#468DFF] rounded-xl py-3 pl-10 pr-12 text-slate-800 placeholder-slate-400 focus:outline-none transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-700"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <AppButton
                  type="submit"
                  variant="primary"
                  size="lg"
                  loading={loading}
                  className="w-full"
                >
                  Actualizar contraseña
                  <ArrowRight className="h-4 w-4" />
                </AppButton>
              </form>
            </>
          ) : (
            <div className="text-center space-y-4 py-4">
              <div className="h-12 w-12 rounded-full bg-red-50 border border-red-100 flex items-center justify-center text-red-500 mx-auto">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <h3 className="font-outfit text-lg font-bold text-slate-900">Enlace no válido</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                El enlace de restablecimiento es inválido, ha expirado o ya fue utilizado. Por favor, solicitá uno nuevo.
              </p>
              <AppButton
                type="button"
                variant="primary"
                size="lg"
                onClick={() => { window.location.href = '/login'; }}
                className="w-full mt-4"
              >
                Volver al login
                <ArrowRight className="h-4 w-4" />
              </AppButton>
            </div>
          )}
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
            <h3 className="font-outfit text-lg font-bold text-slate-900 mb-2">Error de validación</h3>
            <p className="text-xs text-slate-600 leading-relaxed mb-6">
              {error}
            </p>
            <AppButton
              type="button"
              variant="destructive"
              size="md"
              onClick={() => setShowErrorModal(false)}
              className="w-full"
            >
              Cerrar
            </AppButton>
          </div>
        </div>
      )}
      <PublicFooter />
    </div>
  );
}
