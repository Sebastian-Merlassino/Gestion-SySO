// src/app/register/page.js
'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Mail, Lock, User, ShieldAlert, ArrowRight, Loader2, Award, AlertTriangle, X, CheckCircle } from 'lucide-react';

export default function RegisterPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState({ show: false, message: '', type: 'success' });
  const [isDevMode, setIsDevMode] = useState(false);

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

    if (password.length < 6) {
      setModal({ show: true, message: 'La contraseña debe tener al menos 6 caracteres.', type: 'error' });
      setLoading(false);
      return;
    }

    if (isDevMode) {
      console.log('Simulando registro con:', { fullName, email });
      setTimeout(() => {
        setLoading(false);
        // Redirigir a onboarding
        window.location.href = '/onboarding';
      }, 1500);
      return;
    }

    try {
      // Registrar usuario con metadatos
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: 'owner', // El primer usuario registrado es el dueño del workspace
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
        // Redirigir directamente al onboarding para completar datos (firma, logos, matricula)
        window.location.href = '/onboarding';
      }
    } catch (err) {
      setModal({ show: true, message: err.message || 'Error al registrar la cuenta. Intente nuevamente.', type: 'error' });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center relative overflow-hidden font-sans px-4">
      {/* Background gradients */}
      <div className="absolute top-[-20%] left-[-20%] w-[600px] h-[600px] rounded-full bg-blue-600/10 blur-[180px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[600px] h-[600px] rounded-full bg-indigo-600/10 blur-[180px] pointer-events-none" />

      <div className="w-full max-w-md z-10 my-8">
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <h2 className="font-outfit text-3xl font-extrabold tracking-tight bg-gradient-to-r from-slate-50 via-slate-200 to-slate-400 bg-clip-text text-transparent">
            Crear Cuenta <span className="text-blue-500">SySO</span>
          </h2>
          <p className="text-sm text-slate-400 mt-2">
            Registrate para comenzar a gestionar tus obras y auditorías
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-8 backdrop-blur-xl shadow-2xl">
          {isDevMode && (
            <div className="mb-6 p-3 rounded-lg border border-yellow-500/20 bg-yellow-950/20 text-yellow-400 text-xs flex items-center gap-2">
              <span>
                <strong>Modo Demo / Desarrollo Activo</strong>: Se simulará el registro y se redirigirá a onboarding para pruebas visuales.
              </span>
            </div>
          )}



          <form onSubmit={handleRegister} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Nombre y Apellido
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                  <User className="h-5 w-5" />
                </span>
                <input
                  type="text"
                  required
                  placeholder="Juan Pérez"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl py-3 pl-10 pr-4 text-slate-200 placeholder-slate-600 focus:outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Correo Electrónico
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                  <Mail className="h-5 w-5" />
                </span>
                <input
                  type="email"
                  required
                  placeholder="juan.perez@empresa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl py-3 pl-10 pr-4 text-slate-200 placeholder-slate-600 focus:outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Contraseña
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                  <Lock className="h-5 w-5" />
                </span>
                <input
                  type="password"
                  required
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl py-3 pl-10 pr-4 text-slate-200 placeholder-slate-600 focus:outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Confirmar Contraseña
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                  <Lock className="h-5 w-5" />
                </span>
                <input
                  type="password"
                  required
                  placeholder="Repita la contraseña"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl py-3 pl-10 pr-4 text-slate-200 placeholder-slate-600 focus:outline-none transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/10 hover:shadow-blue-500/25 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none mt-2"
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
        </div>

        {/* Footer info */}
        <p className="text-center text-xs text-slate-500 mt-8">
          ¿Ya tenés una cuenta?{' '}
          <a href="/login" className="text-blue-400 hover:text-blue-300 font-semibold transition-colors">
            Iniciá sesión
          </a>
        </p>
      </div>

      {/* CENTERED MODAL NOTIFICATION (VENTANA EMERGENTE) */}
      {modal.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md p-6 rounded-2xl border shadow-2xl text-center bg-slate-900 border-slate-800 animate-scaleUp">
            <div className="flex justify-center mb-4">
              {modal.type === 'error' ? (
                <div className="p-3 rounded-full bg-red-500/10 border border-red-500/20 text-red-400">
                  <AlertTriangle className="h-8 w-8" />
                </div>
              ) : (
                <div className="p-3 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  <CheckCircle className="h-8 w-8" />
                </div>
              )}
            </div>
            <h3 className="font-outfit text-lg font-bold text-slate-100 mb-2">
              {modal.type === 'error' ? 'Notificación de Error' : 'Operación Exitosa'}
            </h3>
            <p className="text-sm text-slate-400 mb-6 leading-relaxed">
              {modal.message}
            </p>
            <button
              type="button"
              onClick={() => setModal({ show: false, message: '', type: 'success' })}
              className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs transition-all active:scale-[0.98] cursor-pointer ${
                modal.type === 'error'
                  ? 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-500/10'
                  : 'bg-gradient-to-r from-[#468DFF] to-[#0511F2] hover:brightness-110 text-white shadow-lg shadow-blue-500/10'
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
