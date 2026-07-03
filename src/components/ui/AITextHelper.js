// src/components/ui/AITextHelper.js
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Mic, Sparkles, Loader2, Trash2, X, Smartphone, Monitor, HelpCircle } from 'lucide-react';

// ── Detectar contexto de ejecución ─────────────────────────────────────────────
function getContext() {
  if (typeof navigator === 'undefined' || typeof window === 'undefined') return 'desktop_browser';
  const ua = navigator.userAgent || '';
  const isPWA = window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true;

  if (/iPhone|iPad|iPod/.test(ua)) return isPWA ? 'ios_pwa' : 'ios_browser';
  if (/Android/.test(ua)) return isPWA ? 'android_pwa' : 'android_browser';
  return isPWA ? 'desktop_pwa' : 'desktop_browser';
}

// ── Instrucciones por contexto ────────────────────────────────────────────────
const INSTRUCTIONS = {
  desktop_browser: {
    label: 'Chrome / Edge en PC',
    icon: Monitor,
    steps: [
      'En la barra de dirección, hacé clic en el ícono que aparece a la IZQUIERDA de la URL (ícono de ajuste ⚙, ojo o candado 🔒).',
      'Se abre un menú: buscá "Micrófono" y cambialo de "Bloqueado" a "Permitir".',
      'Si no ves "Micrófono" ahí, seleccioná "Configuración del sitio" y buscalo dentro.',
      'La página se recarga sola. Presioná el micrófono nuevamente.',
    ],
    settingsUrl: 'chrome://settings/content/microphone',
  },
  desktop_pwa: {
    label: 'App instalada en PC',
    icon: Monitor,
    steps: [
      'Abrí Chrome (el navegador, no la app).',
      'En una pestaña nueva, pegá esta dirección: chrome://settings/content/microphone',
      'Buscá "app.gestionsyso.com" en la sección "Bloqueado" y hacé clic en la papelera para eliminarlo.',
      'Cerrá Chrome, abrí nuevamente la app instalada y presioná el micrófono.',
      'Chrome te va a pedir el permiso esta vez. Hacé clic en "Permitir".',
    ],
    settingsUrl: 'chrome://settings/content/microphone',
  },
  android_browser: {
    label: 'Chrome en Android',
    icon: Smartphone,
    steps: [
      'En la barra de dirección, tocá el ícono ⓘ o el candado a la izquierda de la URL.',
      'Tocá "Permisos" en el menú que aparece.',
      'Tocá "Micrófono" y seleccioná "Permitir".',
      'Recargá la página y probá nuevamente.',
    ],
  },
  android_pwa: {
    label: 'App instalada en Android',
    icon: Smartphone,
    steps: [
      'Abrí Chrome (el navegador, no la app).',
      'Visitá https://app.gestionsyso.com en Chrome.',
      'Tocá el ícono ⓘ a la izquierda de la URL → "Permisos" → "Micrófono" → "Permitir".',
      'Volvé a abrir la app instalada y presioná el micrófono.',
    ],
  },
  ios_browser: {
    label: 'Safari en iPhone / iPad',
    icon: Smartphone,
    steps: [
      'Abrí la app Ajustes de tu iPhone / iPad.',
      'Buscá y tocá "Safari".',
      'Bajá hasta "Configuración para sitios web" → "Micrófono".',
      'Cambiá la opción a "Permitir".',
      'Volvé a Safari, recargá la página y probá.',
    ],
  },
  ios_pwa: {
    label: 'App instalada en iPhone / iPad',
    icon: Smartphone,
    steps: [
      'Abrí la app Ajustes de tu iPhone / iPad.',
      'Bajá en la lista y buscá "Gestión SySO" (o el nombre de la app).',
      'Tocá la app y activá el interruptor de "Micrófono".',
      'Volvé a abrir la app y presioná el micrófono.',
    ],
  },
};

// ── Modal de Permisos ─────────────────────────────────────────────────────────
function MicPermissionModal({ onClose }) {
  const ctx = getContext();
  const info = INSTRUCTIONS[ctx] || INSTRUCTIONS.desktop_browser;
  const DeviceIcon = info.icon;
  const [copied, setCopied] = useState(false);

  const copySettingsUrl = () => {
    if (info.settingsUrl && navigator.clipboard) {
      navigator.clipboard.writeText(info.settingsUrl).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      });
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-orange-50">
              <Mic className="h-4 w-4 text-orange-500" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">Habilitá el micrófono</p>
              <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                <DeviceIcon className="h-3 w-3" />
                {info.label}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-4">
          <p className="text-[11px] text-slate-400 mb-3.5 leading-relaxed">
            El micrófono está bloqueado para este sitio. Seguí estos pasos exactos:
          </p>

          {/* Botón copiar URL de ajustes (solo desktop) */}
          {info.settingsUrl && (
            <button
              type="button"
              onClick={copySettingsUrl}
              className="w-full mb-4 py-2 px-3 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 text-xs text-slate-500 hover:border-[#468DFF] hover:text-[#468DFF] hover:bg-blue-50 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              {copied ? (
                <><span className="text-green-600 font-bold">✓ Copiado</span></>
              ) : (
                <><span className="font-mono text-[10px] truncate">{info.settingsUrl}</span><span className="shrink-0 font-bold">— Copiar y pegar en Chrome</span></>
              )}
            </button>
          )}

          <ol className="space-y-3">
            {info.steps.map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#468DFF] text-white text-[10px] font-bold flex items-center justify-center mt-px">
                  {i + 1}
                </span>
                <span className="text-xs text-slate-600 leading-relaxed">{step}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="px-5 pb-5">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-[#468DFF] text-white text-sm font-bold hover:bg-[#0511F2] transition-colors cursor-pointer"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Componente Principal ──────────────────────────────────────────────────────
export default function AITextHelper({ value, onChange, context = '', disabled = false }) {
  const [isListening, setIsListening] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [hasSpeechSupport, setHasSpeechSupport] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  // Estado separado para error de permiso: muestra botón de ayuda inline sin abrir modal solo
  const [permissionError, setPermissionError] = useState(null); // null | { code: string }

  const recognitionRef = useRef(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SR) setHasSpeechSupport(true);
    }
  }, []);

  const clearErrors = () => {
    setErrorMessage('');
    setPermissionError(null);
  };

  const showError = (msg, ms = 5000) => {
    setErrorMessage(msg);
    setPermissionError(null);
    setTimeout(() => setErrorMessage(''), ms);
  };

  const toggleListening = () => {
    if (disabled || isRefining) return;

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    clearErrors();

    if (typeof window !== 'undefined' && !window.isSecureContext) {
      showError('Se requiere conexión HTTPS para usar el micrófono.');
      return;
    }

    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        showError('Tu navegador no soporta dictado por voz.');
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.lang = 'es-AR';
      recognition.interimResults = false;
      recognition.continuous = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        clearErrors();
      };

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          const newValue = value?.trim()
            ? `${value.trim()} ${transcript}`
            : transcript;
          onChange(newValue);
        }
      };

      recognition.onerror = (event) => {
        setIsListening(false);
        const code = event.error;
        // Loguear siempre para diagnóstico
        console.warn('[AITextHelper] SpeechRecognition error:', code);

        if (code === 'not-allowed' || code === 'service-not-allowed') {
          // Mostrar error inline con botón de ayuda en lugar de abrir modal directamente.
          // El usuario puede abrir el modal con el botón si necesita instrucciones.
          setPermissionError({ code });
          setErrorMessage('');
        } else if (code === 'no-speech') {
          showError('No se detectó voz. Intentá de nuevo.');
        } else if (code === 'audio-capture') {
          showError('No se encontró micrófono en el dispositivo.');
        } else if (code === 'network') {
          showError('Error de red. Verificá la conexión.');
        } else {
          showError(`Error al capturar audio (${code}).`);
        }
      };

      recognition.onend = () => setIsListening(false);

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      console.error('[AITextHelper] Error iniciando dictado:', e);
      showError('No se pudo iniciar el dictado.');
      setIsListening(false);
    }
  };

  const handleRefineText = async () => {
    if (disabled || isListening || isRefining || !value?.trim()) return;
    setIsRefining(true);
    clearErrors();
    try {
      const response = await fetch('/api/ai/refine-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: value, context }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Error al refinar el texto.');
      if (data.refinedText) onChange(data.refinedText);
    } catch (error) {
      showError(error.message || 'Error al conectar con la IA.');
    } finally {
      setIsRefining(false);
    }
  };

  if (disabled) return null;

  return (
    <>
      {showPermissionModal && (
        <MicPermissionModal onClose={() => setShowPermissionModal(false)} />
      )}

      <div className="flex flex-col items-end gap-1 shrink-0">
        <div className="flex items-center gap-1.5">

          {/* Error genérico inline */}
          {errorMessage && (
            <span className="text-[10px] font-bold text-red-500 flex items-center gap-1 bg-red-50 px-2 py-1 rounded-lg border border-red-100">
              {errorMessage}
            </span>
          )}

          {/* Error de permiso inline con código + botón de ayuda */}
          {permissionError && !showPermissionModal && (
            <span className="text-[10px] font-bold text-orange-600 flex items-center gap-1.5 bg-orange-50 px-2 py-1 rounded-lg border border-orange-200">
              <span>Mic. bloqueado ({permissionError.code})</span>
              <button
                type="button"
                onClick={() => setShowPermissionModal(true)}
                className="flex items-center gap-0.5 underline underline-offset-2 hover:text-orange-800 cursor-pointer font-bold"
              >
                <HelpCircle className="h-3 w-3" />
                Ayuda
              </button>
            </span>
          )}

          {value?.trim() && (
            <button
              type="button"
              onClick={() => onChange('')}
              title="Limpiar texto"
              className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-500 hover:text-red-600 hover:bg-red-50 hover:border-red-150 transition-all duration-300 flex items-center justify-center cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}

          {hasSpeechSupport && (
            <button
              type="button"
              onClick={toggleListening}
              title={isListening ? 'Detener dictado' : 'Dictar por voz'}
              className={`p-1.5 rounded-lg border transition-all duration-300 flex items-center justify-center cursor-pointer ${
                isListening
                  ? 'bg-red-50 text-red-500 border-red-200 animate-pulse'
                  : 'bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Mic className={`h-3.5 w-3.5 ${isListening ? 'scale-110' : ''}`} />
            </button>
          )}

          <button
            type="button"
            onClick={handleRefineText}
            disabled={!value?.trim() || isRefining || isListening}
            title="Refinar y formalizar redacción con IA (Gemini)"
            className={`p-1.5 rounded-lg border transition-all duration-300 flex items-center justify-center cursor-pointer ${
              isRefining
                ? 'bg-blue-50 border-blue-200 text-[#468DFF]'
                : !value?.trim()
                  ? 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed'
                  : 'bg-blue-50/50 border-[#468DFF]/15 text-[#468DFF] hover:bg-[#468DFF] hover:text-white hover:border-[#468DFF]'
            }`}
          >
            {isRefining ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </div>
    </>
  );
}
