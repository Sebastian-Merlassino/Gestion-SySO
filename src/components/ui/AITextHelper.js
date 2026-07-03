// src/components/ui/AITextHelper.js
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Mic, Sparkles, Loader2, Trash2, X, Settings, Smartphone, Monitor } from 'lucide-react';

// ── Detectar tipo de dispositivo ──────────────────────────────────────────────
function getDeviceType() {
  if (typeof navigator === 'undefined') return 'desktop';
  const ua = navigator.userAgent || '';
  if (/iPhone|iPad|iPod/.test(ua)) return 'ios';
  if (/Android/.test(ua)) return 'android';
  return 'desktop';
}

// ── Modal de Permisos (bloqueados) ────────────────────────────────────────────
function MicPermissionModal({ onClose }) {
  const device = getDeviceType();

  const steps = {
    ios: [
      'Cerrar la app o el navegador Safari.',
      'Ir a Ajustes de tu iPhone / iPad.',
      'Bajar hasta Safari (o la app Gestión SySO si está instalada).',
      'Tocar "Micrófono" y seleccionar Permitir.',
      'Volver a la app y probar nuevamente.',
    ],
    android: [
      'Tocar el ícono 🔒 o ⋮ en la barra de dirección del navegador.',
      'Seleccionar "Configuración del sitio" o "Permisos".',
      'Tocar "Micrófono" y cambiar a Permitir.',
      'Recargar la página y volver a intentarlo.',
    ],
    desktop: [
      'Hacer clic en el ícono de candado 🔒 a la izquierda de la URL.',
      'Seleccionar "Configuración del sitio" o "Permisos del sitio".',
      'Cambiar "Micrófono" de Bloqueado → Permitir.',
      'Recargar la página con F5.',
    ],
  };

  const deviceLabel = {
    ios: 'iPhone / iPad',
    android: 'Android',
    desktop: 'PC / Mac',
  };

  const DeviceIcon = device === 'desktop' ? Monitor : Smartphone;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-red-50 text-red-500">
              <Mic className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800 leading-none">Micrófono bloqueado</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                <DeviceIcon className="h-3 w-3 inline mr-0.5" />
                {deviceLabel[device]}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Cuerpo */}
        <div className="px-5 py-4">
          <p className="text-xs text-slate-500 mb-4">
            Tu navegador bloqueó el micrófono para esta página. Seguí estos pasos para habilitarlo:
          </p>
          <ol className="space-y-2.5">
            {steps[device].map((step, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#468DFF] text-white text-[10px] font-bold flex items-center justify-center mt-0.5">
                  {i + 1}
                </span>
                <span className="text-xs text-slate-600 leading-relaxed">{step}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 pt-2 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => {
              // En Desktop podemos abrir la página de configuración de permisos directamente (Chrome)
              if (getDeviceType() === 'desktop' && navigator.userAgent.includes('Chrome')) {
                window.open('chrome://settings/content/microphone', '_blank');
              }
              onClose();
            }}
            className="flex-1 py-2 rounded-xl bg-[#468DFF] text-white text-xs font-bold hover:bg-[#0511F2] transition-colors cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Settings className="h-3.5 w-3.5" />
            Abrir ajustes
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

  // Verificar soporte de Web Speech API
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        setHasSpeechSupport(true);
      }
    }
  }, []);

  // Helper para limpiar mensaje de error automáticamente
  const showError = (msg, durationMs = 5000) => {
    setErrorMessage(msg);
    setTimeout(() => setErrorMessage(''), durationMs);
  };

  // Determinar si el permiso está permanentemente bloqueado
  const checkPermissionDenied = async () => {
    try {
      if (navigator.permissions && navigator.permissions.query) {
        const status = await navigator.permissions.query({ name: 'microphone' });
        return status.state === 'denied';
      }
    } catch (_) { /* API no soportada */ }
    return false;
  };

  // Inicializar o destruir el reconocimiento de voz
  const toggleListening = async () => {
    if (disabled || isRefining) return;

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    try {
      setErrorMessage('');

      // Sin contexto HTTPS: bloqueo duro del sistema
      if (typeof window !== 'undefined' && !window.isSecureContext) {
        showError('El micrófono requiere conexión HTTPS segura.');
        return;
      }

      // Verificar si el permiso ya fue denegado permanentemente → mostrar modal
      const isDenied = await checkPermissionDenied();
      if (isDenied) {
        setShowPermissionModal(true);
        return;
      }

      // Solicitar el permiso con getUserMedia (dispara el popup nativo la primera vez)
      if (navigator.mediaDevices?.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          stream.getTracks().forEach(track => track.stop());
        } catch (err) {
          console.error('getUserMedia rechazado:', err);
          // El usuario rechazó el popup → mostrar modal con instrucciones
          setShowPermissionModal(true);
          return;
        }
      }

      // Iniciar SpeechRecognition
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

      recognition.onerror = async (event) => {
        console.error('Speech Recognition error:', event.error);
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
      console.error('Error iniciando dictado:', e);
      showError('No se pudo iniciar el dictado.');
      setIsListening(false);
    }
  };

  // Refinar texto con Gemini
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
      console.error('Error AI refine:', error);
      showError(error.message || 'Error al conectar con la IA.');
    } finally {
      setIsRefining(false);
    }
  };

  if (disabled) return null;

  return (
    <>
      {/* Modal de permisos bloqueados */}
      {showPermissionModal && (
        <MicPermissionModal onClose={() => setShowPermissionModal(false)} />
      )}

      <div className="flex flex-col items-end gap-1 shrink-0">
        <div className="flex items-center gap-1.5">
          {/* Indicador de error efímero */}
          {errorMessage && (
            <span className="text-[10px] font-bold text-red-500 flex items-center gap-1 bg-red-50 px-2 py-1 rounded-lg border border-red-100">
              {errorMessage}
            </span>
          )}

          {/* Botón de Limpiar Texto */}
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

          {/* Botón de Dictado por Voz */}
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

          {/* Botón de IA */}
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
