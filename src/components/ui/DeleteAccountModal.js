// src/components/ui/DeleteAccountModal.js
'use client';

import React, { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { AlertTriangle, X, Eye, EyeOff, Loader2, ShieldAlert, CheckCircle2 } from 'lucide-react';

export default function DeleteAccountModal({
  open,
  onOpenChange,
  isAdmin = false,
  tenantName = '',
  onConfirm,
  loading = false,
}) {
  const [step, setStep] = useState(1); // 1 = contraseña, 2 = frase de confirmación
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPhrase, setConfirmPhrase] = useState('');

  const requiredPhrase = isAdmin ? 'ELIMINAR MI CUENTA' : 'ELIMINAR MI ACCESO';

  // Reset completo al cerrar
  useEffect(() => {
    if (!open) {
      setStep(1);
      setPassword('');
      setShowPassword(false);
      setConfirmPhrase('');
    }
  }, [open]);

  const handleClose = () => {
    if (!loading) onOpenChange(false);
  };

  // Paso 1 → avanzar al paso 2
  const handleStep1Submit = (e) => {
    e.preventDefault();
    if (!password || loading) return;
    setStep(2);
  };

  // Paso 2 → ejecutar eliminación
  const handleStep2Submit = (e) => {
    e.preventDefault();
    if (confirmPhrase !== requiredPhrase || loading) return;
    onConfirm(password);
  };

  const phraseMatches = confirmPhrase === requiredPhrase;

  return (
    <Dialog.Root open={open} onOpenChange={(v) => { if (!loading) onOpenChange(v); }}>
      <Dialog.Portal>
        {/* Backdrop */}
        <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm animate-fade-in" />

        {/* Centrado en pantalla */}
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <Dialog.Content
            onPointerDownOutside={(e) => { e.preventDefault(); }}
            onInteractOutside={(e) => { e.preventDefault(); }}
            className="relative w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-2xl animate-scale-up focus:outline-none overflow-hidden"
          >
            {/* Header rojo */}
            <div className="bg-red-600 px-6 py-4 flex items-center gap-3">
              <div className="p-2 rounded-full bg-white/20">
                <AlertTriangle className="h-5 w-5 text-white shrink-0" />
              </div>
              <Dialog.Title className="font-outfit text-sm font-extrabold text-white tracking-wide uppercase flex-1">
                {isAdmin ? 'Eliminar Cuenta y Organización' : 'Eliminar Cuenta de Acceso'}
              </Dialog.Title>
              {!loading && (
                <Dialog.Close asChild>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors cursor-pointer focus:outline-none"
                    aria-label="Cerrar"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </Dialog.Close>
              )}
            </div>

            {/* Indicador de pasos */}
            <div className="px-6 pt-4 flex items-center gap-2">
              {/* Paso 1 */}
              <div className={`flex items-center gap-1.5 text-xs font-bold transition-colors ${step >= 1 ? 'text-red-600' : 'text-slate-400'}`}>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-extrabold transition-colors ${step > 1 ? 'bg-green-500 text-white' : step === 1 ? 'bg-red-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                  {step > 1 ? <CheckCircle2 className="h-3 w-3" /> : '1'}
                </div>
                <span className="hidden sm:inline">Contraseña</span>
              </div>
              <div className={`flex-1 h-px transition-colors ${step > 1 ? 'bg-green-400' : 'bg-slate-200'}`} />
              {/* Paso 2 */}
              <div className={`flex items-center gap-1.5 text-xs font-bold transition-colors ${step >= 2 ? 'text-red-600' : 'text-slate-400'}`}>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-extrabold transition-colors ${step === 2 ? 'bg-red-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                  2
                </div>
                <span className="hidden sm:inline">Confirmación</span>
              </div>
            </div>

            {/* ── PASO 1: Contraseña ── */}
            {step === 1 && (
              <form onSubmit={handleStep1Submit} className="p-6 space-y-5">

                {/* Advertencia */}
                <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-red-800 text-sm space-y-2 leading-relaxed">
                  <p className="font-bold text-xs uppercase tracking-wide">
                    {isAdmin ? '¡Advertencia de seguridad crítica!' : '¡Advertencia de seguridad!'}
                  </p>
                  {isAdmin ? (
                    <>
                      <p className="text-xs">
                        Al eliminar tu cuenta, se borrará de forma permanente e irreversible toda la información asociada a tu organización/consultora (<strong>{tenantName}</strong>), incluyendo:
                      </p>
                      <ul className="list-disc pl-4 space-y-0.5 text-xs">
                        <li>Configuración y perfil del administrador y miembros de equipo.</li>
                        <li>Todas las empresas clientes y sus establecimientos cargados.</li>
                        <li>El historial completo de auditorías, capacitaciones, acciones correctivas y extintores.</li>
                        <li>Firmas, logotipos y archivos digitales subidos al almacenamiento.</li>
                      </ul>
                    </>
                  ) : (
                    <p className="text-xs">
                      Al confirmar, se eliminará tu cuenta de usuario de forma permanente y ya no tendrás acceso a la organización/consultora <strong>{tenantName}</strong>. Tu perfil y configuraciones personales serán borrados definitivamente.
                    </p>
                  )}
                  <p className="font-semibold text-xs">Esta acción no se puede deshacer y no habrá forma de recuperar los datos.</p>
                </div>

                {/* Input contraseña */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Paso 1 — Verificá tu identidad:
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Contraseña actual"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
                      autoFocus
                      disabled={loading}
                      className="w-full border border-slate-200 rounded-xl py-2.5 pl-3.5 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-slate-50/50 transition-all text-slate-700 disabled:opacity-60"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={loading}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-700 cursor-pointer disabled:opacity-60"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Botones */}
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={loading}
                    className="flex-1 py-2.5 px-4 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all active:scale-[0.98] cursor-pointer focus:outline-none disabled:opacity-50 disabled:pointer-events-none"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={!password || loading}
                    className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all active:scale-[0.98] shadow-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none bg-red-600 hover:bg-red-700 text-white shadow-red-600/20 cursor-pointer"
                  >
                    Continuar →
                  </button>
                </div>
              </form>
            )}

            {/* ── PASO 2: Frase de confirmación ── */}
            {step === 2 && (
              <form onSubmit={handleStep2Submit} className="p-6 space-y-5">

                <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900">
                  <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5 text-amber-600" />
                  <p className="text-xs leading-relaxed">
                    Último paso. Para confirmar que entendés que esta acción es <strong>irreversible</strong>, escribí la siguiente frase exactamente en mayúsculas:
                  </p>
                </div>

                {/* Frase requerida */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Paso 2 — Escribí en mayúsculas:
                  </label>
                  <div className="p-2.5 rounded-lg bg-slate-100 border border-slate-200 text-center">
                    <span className="font-mono font-extrabold text-red-600 text-sm tracking-widest select-all">
                      {requiredPhrase}
                    </span>
                  </div>
                  <input
                    type="text"
                    placeholder={`Escribí: ${requiredPhrase}`}
                    value={confirmPhrase}
                    onChange={(e) => setConfirmPhrase(e.target.value)}
                    autoComplete="off"
                    autoFocus
                    disabled={loading}
                    className={`w-full border rounded-xl px-3 py-2.5 text-sm text-center font-bold font-mono focus:outline-none focus:ring-2 transition-all disabled:opacity-60 ${
                      confirmPhrase.length > 0
                        ? phraseMatches
                          ? 'border-green-400 focus:ring-green-400 text-green-700 bg-green-50'
                          : 'border-red-300 focus:ring-red-400 text-slate-800 bg-slate-50'
                        : 'border-slate-200 focus:ring-red-500 focus:border-red-500 bg-slate-50/50 text-slate-800'
                    }`}
                  />
                </div>

                {/* Botones */}
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => { setStep(1); setConfirmPhrase(''); }}
                    disabled={loading}
                    className="flex-1 py-2.5 px-4 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all active:scale-[0.98] cursor-pointer focus:outline-none disabled:opacity-50 disabled:pointer-events-none"
                  >
                    ← Atrás
                  </button>
                  <button
                    type="submit"
                    disabled={!phraseMatches || loading}
                    className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all active:scale-[0.98] shadow-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none bg-red-600 hover:bg-red-700 text-white shadow-red-600/20 cursor-pointer"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Eliminando...
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="h-3.5 w-3.5" />
                        {isAdmin ? 'Eliminar Cuenta y Organización' : 'Eliminar Mi Acceso'}
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
