// src/components/ui/AITextHelper.js
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Mic, Sparkles, Loader2, Trash2, X, Smartphone, Monitor } from 'lucide-react';

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
      'Hacé clic en el ícono junto a la URL (puede ser un candado, un ojo o un signo de ajuste ⚙).',
      'En el menú que aparece, seleccioná "Configuración del sitio".',
      'Buscá "Micrófono" y cambiá el valor a Permitir.',
      'Recargá la página con F5 y presioná el micrófono nuevamente.',
    ],
  },
  desktop_pwa: {
    label: 'App instalada en PC',
    icon: Monitor,
    steps: [
      'Hacé clic en los tres puntos ⋮ en la esquina superior derecha de la ventana.',
      'Seleccioná "Información de la app" (App info).',
      'Dentro de la información, buscá y tocá "Configuración" (Settings).',
      'Tocá "Permisos" y habilitá el Micrófono.',
      'Volvé a la app y probá nuevamente.',
    ],
  },
  android_browser: {
    label: 'Chrome en Android',
    icon: Smartphone,
    steps: [
      'Tocá el ícono de información ⓘ o el candado que aparece a la izquierda de la URL.',
      'En el menú, seleccioná "Permisos" o "Configuración del sitio".',
      'Tocá "Micrófono" y seleccioná Permitir.',
      'Recargá la página y probá nuevamente.',
    ],
  },
  android_pwa: {
    label: 'App instalada en Android',
    icon: Smartphone,
    steps: [
      'Salí de la app y volvé a la pantalla de inicio.',
      'Mantenés presionado el ícono de la app Gestión SySO.',
      'Seleccioná "Información de la app" (App info) o ⓘ.',
      'Tocá "Permisos" → "Micrófono" → Seleccioná "Permitir".',
      'Volvé a abrir la app y presioná el micrófono.',
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

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        {/* Header */}
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
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Cuerpo */}
        <div className="px-5 py-4">
          <p className="text-[11px] text-slate-400 mb-3.5 leading-relaxed">
            El permiso de micrófono fue bloqueado. Seguí estos pasos para activarlo:
          </p>
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

        {/* Footer */}
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

  const recognitionRef = useRef(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) setHasSpeechSupport(true);
    }
  }, []);

  const showError = (msg, ms = 5000) => {
    setErrorMessage(msg);
    setTimeout(() => setErrorMessage(''), ms);
  };

  const checkPermissionDenied = async () => {
    try {
      if (navigator.permissions?.query) {
        const status = await navigator.permissions.query({ name: 'microphone' });
        return status.state === 'denied';
      }
    } catch (_) {}
    return false;
  };

  const toggleListening = async () => {
    if (disabled || isRefining) return;

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    try {
      setErrorMessage('');

      if (typeof window !== 'undefined' && !window.isSecureContext) {
        showError('Se requiere conexión HTTPS para usar el micrófono.');
        return;
      }

      // Si ya está bloqueado permanentemente → abrir modal directo
      const isDenied = await checkPermissionDenied();
      if (isDenied) {
        setShowPermissionModal(true);
        return;
      }

      // Solicitar permiso (dispara popup nativo la primera vez)
      if (navigator.mediaDevices?.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          stream.getTracks().forEach(t => t.stop());
        } catch (err) {
          // El usuario rechazó el popup → mostrar modal
          setShowPermissionModal(true);
          return;
        }
      }

      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.lang = 'es-AR';
      recognition.interimResults = false;
      recognition.continuous = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => setIsListening(true);

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
        if (event.error === 'not-allowed') {
          setShowPermissionModal(true);
        } else if (event.error === 'no-speech') {
          showError('No se detectó voz. Intentá de nuevo.');
        } else {
          showError('Error al capturar audio.');
        }
      };

      recognition.onend = () => setIsListening(false);

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      showError('No se pudo iniciar el dictado.');
      setIsListening(false);
    }
  };

  const handleRefineText = async () => {
    if (disabled || isListening || isRefining || !value?.trim()) return;
    setIsRefining(true);
    setErrorMessage('');
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

          {errorMessage && (
            <span className="text-[10px] font-bold text-red-500 flex items-center gap-1 bg-red-50 px-2 py-1 rounded-lg border border-red-100">
              {errorMessage}
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
