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
    <div className="min-h-screen bg-[#D9D9D9] text-slate-700 flex items-center justify-center relative overflow-hidden font-sans px-4">
      {/* Background gradients */}
      <div className="absolute top-[-20%] left-[-20%] w-[600px] h-[600px] rounded-full bg-[#468DFF]/5 blur-[180px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[600px] h-[600px] rounded-full bg-[#0511F2]/5 blur-[180px] pointer-events-none" />

      <div className="w-full max-w-md z-10">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex h-10 w-10 rounded-xl bg-gradient-to-br from-[#468DFF] to-[#0511F2] items-center justify-center font-bold text-white text-lg shadow-lg shadow-blue-500/20 mb-4">
            H
          </div>
          <h2 className="font-outfit text-3xl font-extrabold tracking-tight text-slate-900">
            Nueva Contraseña
          </h2>
          <p className="text-sm text-slate-600 mt-2 font-medium">
            Ingresá tu nueva contraseña para volver a acceder de forma segura
          </p>
        </div>

        {/* Card Form */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-8 shadow-xl">
          {success ? (
            <div className="text-center space-y-4">
              <div className="h-12 w-12 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-500 mx-auto">
                <CheckCircle className="h-6 w-6" />
              </div>
              <h3 className="font-outfit text-lg font-bold text-slate-900">¡Contraseña Cambiada!</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Tu clave ha sido actualizada con éxito en Supabase.
              </p>
              <button
                onClick={() => { window.location.href = '/login'; }}
                className="w-full py-3 rounded-xl bg-[#468DFF] hover:bg-[#0511F2] text-white font-semibold text-sm transition-all flex items-center justify-center gap-2"
              >
                Ir a Iniciar Sesión
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          ) : (
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
                    type="password"
                    required
                    placeholder="Mínimo 6 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 focus:border-[#468DFF] focus:ring-1 focus:ring-[#468DFF] rounded-xl py-3 pl-10 pr-4 text-slate-800 placeholder-slate-400 focus:outline-none transition-all"
                  />
                </div>
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
                    type="password"
                    required
                    placeholder="Repita la contraseña"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 focus:border-[#468DFF] focus:ring-1 focus:ring-[#468DFF] rounded-xl py-3 pl-10 pr-4 text-slate-800 placeholder-slate-400 focus:outline-none transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-[#468DFF] hover:bg-[#0511F2] text-white font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/10 hover:shadow-blue-500/25 active:scale-[0.98] disabled:opacity-50"
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
            <h3 className="font-outfit text-lg font-bold text-slate-900 mb-2">Error de Validación</h3>
            <p className="text-xs text-slate-600 leading-relaxed mb-6">
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
