// src/app/reset-password/page.js
'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Lock, ShieldAlert, CheckCircle, Loader2, ArrowRight, X } from 'lucide-react';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [isDevMode, setIsDevMode] = useState(false);
  
  // Modal de error
  const [showErrorModal, setShowErrorModal] = useState(false);

  useEffect(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('placeholder')) {
      setIsDevMode(true);
    }
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

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
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

      setLoading(false);
      setSuccess(true);

    } catch (err) {
      setError(err.message || 'Error al cambiar la contraseña. Vuelva a solicitar el enlace.');
      setShowErrorModal(true);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center relative overflow-hidden font-sans px-4">
      {/* Background gradients */}
      <div className="absolute top-[-20%] left-[-20%] w-[600px] h-[600px] rounded-full bg-blue-600/10 blur-[180px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[600px] h-[600px] rounded-full bg-indigo-600/10 blur-[180px] pointer-events-none" />

      <div className="w-full max-w-md z-10">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 items-center justify-center font-bold text-white text-2xl shadow-lg shadow-blue-500/20 mb-4">
            S
          </div>
          <h2 className="font-outfit text-3xl font-extrabold tracking-tight bg-gradient-to-r from-slate-50 via-slate-200 to-slate-400 bg-clip-text text-transparent">
            Nueva Contraseña
          </h2>
          <p className="text-sm text-slate-400 mt-2">
            Ingresá tu nueva contraseña para volver a acceder de forma segura
          </p>
        </div>

        {/* Card Form */}
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-8 backdrop-blur-xl shadow-2xl">
          {success ? (
            <div className="text-center space-y-4">
              <div className="h-12 w-12 rounded-full bg-emerald-950/30 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mx-auto">
                <CheckCircle className="h-6 w-6" />
              </div>
              <h3 className="font-outfit text-lg font-bold text-slate-50">¡Contraseña Cambiada!</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Tu clave ha sido actualizada con éxito en Supabase.
              </p>
              <button
                onClick={() => { window.location.href = '/login'; }}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold text-sm transition-all flex items-center justify-center gap-2"
              >
                Ir a Iniciar Sesión
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <form onSubmit={handleReset} className="space-y-6">
              {isDevMode && (
                <div className="p-3 rounded-lg border border-yellow-500/20 bg-yellow-950/20 text-yellow-400 text-xs">
                  <strong>Modo Demo</strong>: Simulación local del cambio de contraseña.
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Nueva Contraseña
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
                className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/10 hover:shadow-blue-500/25 active:scale-[0.98] disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Actualizando contraseña...
                  </>
                ) : (
                  <>
                    Actualizar Contraseña
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>

      </div>

      {/* ERROR MODAL POPUP */}
      {showErrorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-red-500/20 rounded-2xl w-full max-w-sm p-6 shadow-2xl relative text-center animate-scaleUp">
            <button 
              onClick={() => setShowErrorModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-slate-100 transition-colors border border-slate-800"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="h-12 w-12 rounded-full bg-red-950/30 border border-red-500/20 flex items-center justify-center text-red-400 mx-auto mb-4">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <h3 className="font-outfit text-lg font-bold text-slate-50 mb-2">Error de Validación</h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-6">
              {error}
            </p>
            <button
              onClick={() => setShowErrorModal(false)}
              className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition-all"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
