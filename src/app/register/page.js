// src/app/register/page.js
'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Mail, Lock, User, ShieldAlert, ArrowRight, Loader2, Award, AlertTriangle, X, CheckCircle, Eye, EyeOff } from 'lucide-react';
import AppCard from '@/components/ui/AppCard';
import AppInput from '@/components/ui/AppInput';
import AppButton from '@/components/ui/AppButton';
import PublicFooter from '@/components/PublicFooter';
export default function RegisterPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState({ show: false, message: '', type: 'success' });
  const [isDevMode, setIsDevMode] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('placeholder')) {
      setIsDevMode(true);
    }
  }, []);

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setModal({ show: false, message: '', type: 'success' });

    // Validaciones básicas
    if (password !== confirmPassword) {
      setModal({ show: true, message: 'Las contraseñas no coinciden.', type: 'error' });
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
      setModal({ 
        show: true, 
        message: 'La contraseña debe tener al menos 8 caracteres, incluir al menos una letra mayúscula y al menos un número.', 
        type: 'error' 
      });
      setLoading(false);
      return;
    }

    if (isDevMode) {
      console.log('Simulando registro con:', { fullName, email });
      localStorage.setItem('onboarding_email', email);
      localStorage.setItem('onboarding_full_name', fullName);
      setTimeout(() => {
        setLoading(false);
        setRegistered(true);
      }, 1500);
      return;
    }

    try {
      // Registrar usuario con metadatos
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/onboarding`,
          data: {
            full_name: fullName,
            role: 'admin', // El primer usuario registrado es el administrador/dueño del workspace
          },
        },
      });

      if (signUpError) throw signUpError;

      // Detección de correo duplicado en Supabase Auth
      if (data.user && data.user.identities && data.user.identities.length === 0) {
        setLoading(false);
        setModal({
          show: true,
          message: 'El correo electrónico ya está registrado. Por favor, iniciá sesión o utilizá una dirección diferente.',
          type: 'error'
        });
        return;
      }

      if (data.user) {
        localStorage.setItem('onboarding_email', email);
        localStorage.setItem('onboarding_full_name', fullName);
        setRegistered(true);
        setLoading(false);
      }
    } catch (err) {
      setModal({ show: true, message: err.message || 'Error al registrar la cuenta. Intente nuevamente.', type: 'error' });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-syso-bg text-slate-700 flex flex-col justify-between items-center relative overflow-hidden font-sans">
      {/* Background gradients */}
      <div className="absolute top-[-20%] left-[-20%] w-[600px] h-[600px] rounded-full bg-[#468DFF]/5 blur-[180px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[600px] h-[600px] rounded-full bg-[#0511F2]/5 blur-[180px] pointer-events-none" />

      <div className="w-full max-w-md z-10 flex-1 flex items-center justify-center my-8 px-4">
        {/* Form Card */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-8 shadow-xl w-full">
          {!registered && (
            <>
              <img
                src="/brand/logo-black.png"
                alt="Logo Gestión SySO"
                width="220"
                style={{ width: '220px', height: 'auto', display: 'block', margin: '0 auto' }}
                className="mx-auto object-contain mb-4"
              />
              <p className="text-sm text-slate-600 font-medium text-center mb-6">
                Registrate para comenzar a gestionar tus clientes de Higiene y Seguridad
              </p>
            </>
          )}

          {registered ? (
            <div className="text-center space-y-6 animate-scaleUp">
              <div className="flex justify-center">
                <div className="p-4 rounded-full bg-emerald-50 border border-emerald-100 text-[#468DFF] shadow-sm">
                  <Mail className="h-10 w-10 text-[#468DFF]" />
                </div>
              </div>
              <h3 className="font-outfit text-xl font-extrabold text-slate-900">
                ¡Confirmá tu correo!
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Hemos enviado un correo de verificación a <strong className="text-slate-800">{email}</strong>. 
                Por favor, ingresá a tu bandeja de entrada y hacé clic en el enlace para verificar tu cuenta e ingresar.
              </p>
              <div className="pt-2">
                <a
                  href="/login"
                  className="w-full py-3 rounded-xl bg-[#468DFF] hover:bg-[#0511F2] text-white font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/10 hover:shadow-blue-500/25 active:scale-[0.98]"
                >
                  Ir a Iniciar Sesión
                  <ArrowRight className="h-4 w-4" />
                </a>
              </div>
            </div>
          ) : (
            <>
              {isDevMode && (
                <div className="mb-6 p-3 rounded-lg border border-amber-500/20 bg-amber-50 text-amber-700 text-xs flex items-center gap-2">
                  <span>
                    <strong>Modo Demo / Desarrollo Activo</strong>: Se simulará el registro y se mostrará la pantalla de confirmación.
                  </span>
                </div>
              )}

              <form onSubmit={handleRegister} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Nombre y Apellido
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                      <User className="h-5 w-5" />
                    </span>
                    <input
                      type="text"
                      required
                      placeholder="Juan Pérez"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      autoComplete="name"
                      className="w-full bg-slate-50 border border-slate-300 focus:border-[#468DFF] focus:ring-1 focus:ring-[#468DFF] rounded-xl py-3 pl-10 pr-4 text-slate-800 placeholder-slate-400 focus:outline-none transition-all"
                    />
                  </div>
                </div>

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
                      placeholder="juan.perez@empresa.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                      className="w-full bg-slate-50 border border-slate-300 focus:border-[#468DFF] focus:ring-1 focus:ring-[#468DFF] rounded-xl py-3 pl-10 pr-4 text-slate-800 placeholder-slate-400 focus:outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Contraseña
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

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-[#468DFF] hover:bg-[#0511F2] text-white font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/10 hover:shadow-blue-500/25 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none mt-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Registrando cuenta...
                    </>
                  ) : (
                    <>
                      Crear Cuenta
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Registro link inside the card container with stable layout height to prevent jumping */}
              <div className="mt-6 text-center text-sm text-slate-600 min-h-[24px] flex items-center justify-center">
                <span>
                  ¿Ya tenés una cuenta?{' '}
                  <a href="/login" className="text-[#468DFF] hover:text-[#0511F2] font-bold transition-colors">
                    Iniciá sesión
                  </a>
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* CENTERED MODAL NOTIFICATION (VENTANA EMERGENTE) */}
      {modal.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md p-6 rounded-2xl border shadow-2xl text-center bg-white border-slate-200 animate-scaleUp">
            <div className="flex justify-center mb-4">
              {modal.type === 'error' ? (
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
              {modal.type === 'error' ? 'Notificación de Error' : 'Operación Exitosa'}
            </h3>
            <p className="text-sm text-slate-600 mb-6 leading-relaxed">
              {modal.message}
            </p>
            <button
              type="button"
              onClick={() => setModal({ show: false, message: '', type: 'success' })}
              className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs transition-all active:scale-[0.98] cursor-pointer ${
                modal.type === 'error'
                  ? 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-500/10'
                  : 'bg-[#468DFF] hover:bg-[#0511F2] text-white shadow-lg shadow-blue-500/10'
              }`}
            >
              Aceptar
            </button>
          </div>
        </div>
      )}

      <PublicFooter />
    </div>
  );
}
