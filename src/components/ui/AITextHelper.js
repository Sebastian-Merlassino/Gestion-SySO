// src/components/ui/AITextHelper.js
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Sparkles, Loader2, Trash2, X, Smartphone, Monitor, HelpCircle, Square } from 'lucide-react';

const MAX_RECORDING_SEC = 60;

// ── Detectar contexto ─────────────────────────────────────────────────────────
function getContext() {
  if (typeof navigator === 'undefined' || typeof window === 'undefined') return 'desktop_browser';
  const ua = navigator.userAgent || '';
  const isPWA = window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true;
  if (/iPhone|iPad|iPod/.test(ua)) return isPWA ? 'ios_pwa' : 'ios_browser';
  if (/Android/.test(ua)) return isPWA ? 'android_pwa' : 'android_browser';
  return isPWA ? 'desktop_pwa' : 'desktop_browser';
}

// ── Instrucciones de permisos por contexto ────────────────────────────────────
const INSTRUCTIONS = {
  desktop_browser: {
    label: 'Chrome / Edge en PC',
    icon: Monitor,
    steps: [
      'En la barra de dirección, hacé clic en el ícono a la IZQUIERDA de la URL (ícono de ajuste ⚙, ojo o candado 🔒).',
      'Se abre un menú: buscá "Micrófono" y cambialo de "Bloqueado" a "Permitir".',
      'Si no ves "Micrófono", seleccioná "Configuración del sitio" y buscalo dentro.',
      'La página se recarga sola. Presioná el micrófono nuevamente.',
    ],
    settingsUrl: 'chrome://settings/content/microphone',
  },
  desktop_pwa: {
    label: 'App instalada en PC',
    icon: Monitor,
    steps: [
      'Abrí Chrome (el navegador, no la app).',
      'En una pestaña nueva, pegá: chrome://settings/content/microphone',
      'Buscá "app.gestionsyso.com" en "Bloqueado" y hacé clic en la papelera.',
      'Cerrá y volvé a abrir la app instalada. Chrome te pedirá el permiso.',
      'Hacé clic en "Permitir".',
    ],
    settingsUrl: 'chrome://settings/content/microphone',
  },
  android_browser: {
    label: 'Chrome en Android',
    icon: Smartphone,
    steps: [
      'Tocá el ícono ⓘ a la izquierda de la URL.',
      'Tocá "Permisos" → "Micrófono" → "Permitir".',
      'Recargá la página y probá nuevamente.',
    ],
  },
  android_pwa: {
    label: 'App instalada en Android',
    icon: Smartphone,
    steps: [
      'Abrí Chrome (el navegador, no la app).',
      'Visitá https://app.gestionsyso.com en Chrome.',
      'Tocá ⓘ → "Permisos" → "Micrófono" → "Permitir".',
      'Volvé a abrir la app instalada.',
    ],
  },
  ios_browser: {
    label: 'Safari en iPhone / iPad',
    icon: Smartphone,
    steps: [
      'Abrí Ajustes del iPhone/iPad.',
      'Tocá "Safari" → "Configuración para sitios web" → "Micrófono".',
      'Cambiá a "Permitir". Volvé y recargá la página.',
    ],
  },
  ios_pwa: {
    label: 'App instalada en iPhone / iPad',
    icon: Smartphone,
    steps: [
      'Abrí Ajustes del iPhone/iPad.',
      'Buscá "Gestión SySO" → activá el interruptor de "Micrófono".',
      'Volvé a abrir la app.',
    ],
  },
};

// ── Modal de Permisos ─────────────────────────────────────────────────────────
function MicPermissionModal({ onClose }) {
  const ctx = getContext();
  const info = INSTRUCTIONS[ctx] || INSTRUCTIONS.desktop_browser;
  const DeviceIcon = info.icon;
  const [copied, setCopied] = useState(false);

  const copyUrl = () => {
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
                <DeviceIcon className="h-3 w-3" />{info.label}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-5 py-4">
          <p className="text-[11px] text-slate-400 mb-3.5 leading-relaxed">
            El micrófono está bloqueado para este sitio. Seguí estos pasos:
          </p>
          {info.settingsUrl && (
            <button
              type="button"
              onClick={copyUrl}
              className="w-full mb-4 py-2 px-3 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 text-xs text-slate-500 hover:border-[#468DFF] hover:text-[#468DFF] hover:bg-blue-50 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              {copied
                ? <span className="text-green-600 font-bold">✓ Copiado al portapapeles</span>
                : <><span className="font-mono text-[10px]">{info.settingsUrl}</span><span className="shrink-0 font-bold">— Copiar</span></>
              }
            </button>
          )}
          <ol className="space-y-3">
            {info.steps.map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#468DFF] text-white text-[10px] font-bold flex items-center justify-center mt-px">{i + 1}</span>
                <span className="text-xs text-slate-600 leading-relaxed">{step}</span>
              </li>
            ))}
          </ol>
        </div>
        <div className="px-5 pb-5">
          <button type="button" onClick={onClose} className="w-full py-2.5 rounded-xl bg-[#468DFF] text-white text-sm font-bold hover:bg-[#0511F2] transition-colors cursor-pointer">
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Componente Principal ──────────────────────────────────────────────────────
export default function AITextHelper({ value, onChange, context = '', disabled = false }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [hasMediaSupport, setHasMediaSupport] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
      setHasMediaSupport(true);
    }
  }, []);

  // Limpiar al desmontar
  useEffect(() => {
    return () => {
      stopRecordingCleanup();
    };
  }, []);

  const showError = (msg, ms = 6000) => {
    setErrorMessage(msg);
    setTimeout(() => setErrorMessage(''), ms);
  };

  const stopRecordingCleanup = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setRecordingSeconds(0);
  };

  // Convertir blob a base64
  const blobToBase64 = (blob) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      // reader.result = "data:audio/webm;base64,AAAA..."
      const base64 = reader.result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

  // Enviar audio grabado a Gemini para transcripción
  const transcribeAudio = async (audioBlob) => {
    setIsTranscribing(true);
    try {
      const base64 = await blobToBase64(audioBlob);
      const mimeType = audioBlob.type || 'audio/webm';

      const response = await fetch('/api/ai/transcribe-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioBase64: base64, mimeType }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Error al transcribir.');
      if (data.transcript) {
        const newValue = value?.trim()
          ? `${value.trim()} ${data.transcript}`
          : data.transcript;
        onChange(newValue);
      }
    } catch (err) {
      console.error('[AITextHelper] Transcription error:', err);
      showError(err.message || 'Error al transcribir el audio.');
    } finally {
      setIsTranscribing(false);
    }
  };

  const startRecording = async () => {
    try {
      setErrorMessage('');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Detectar formato soportado
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')
            ? 'audio/ogg;codecs=opus'
            : '';

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stopRecordingCleanup();
        const audioBlob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        });
        audioChunksRef.current = [];
        if (audioBlob.size > 0) {
          await transcribeAudio(audioBlob);
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start(100); // chunk cada 100ms
      setIsRecording(true);
      setRecordingSeconds(0);

      // Timer: auto-stop a los MAX_RECORDING_SEC
      timerRef.current = setInterval(() => {
        setRecordingSeconds(prev => {
          if (prev + 1 >= MAX_RECORDING_SEC) {
            stopRecording();
            return 0;
          }
          return prev + 1;
        });
      }, 1000);

    } catch (err) {
      console.error('[AITextHelper] getUserMedia error:', err);
      const isPermission = err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError';
      if (isPermission) {
        setShowPermissionModal(true);
      } else {
        showError('No se pudo acceder al micrófono.');
      }
      stopRecordingCleanup();
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const toggleRecording = () => {
    if (disabled || isTranscribing || isRefining) return;
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleRefineText = async () => {
    if (disabled || isRecording || isTranscribing || isRefining || !value?.trim()) return;
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

  const isWorking = isRecording || isTranscribing;

  return (
    <>
      {showPermissionModal && (
        <MicPermissionModal onClose={() => setShowPermissionModal(false)} />
      )}

      <div className="flex flex-col items-end gap-1 shrink-0">
        <div className="flex items-center gap-1.5">

          {/* Indicador de grabación / transcripción */}
          {isRecording && (
            <span className="text-[10px] font-bold text-red-600 flex items-center gap-1 bg-red-50 px-2 py-1 rounded-lg border border-red-200 animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
              {recordingSeconds}s — Tocá ■ para detener
            </span>
          )}
          {isTranscribing && (
            <span className="text-[10px] font-bold text-[#468DFF] flex items-center gap-1 bg-blue-50 px-2 py-1 rounded-lg border border-blue-200">
              <Loader2 className="h-3 w-3 animate-spin" />
              Transcribiendo…
            </span>
          )}

          {/* Error genérico */}
          {errorMessage && !isWorking && (
            <span className="text-[10px] font-bold text-red-500 flex items-center gap-1 bg-red-50 px-2 py-1 rounded-lg border border-red-100">
              {errorMessage}
            </span>
          )}

          {/* Limpiar texto */}
          {value?.trim() && !isWorking && (
            <button
              type="button"
              onClick={() => onChange('')}
              title="Limpiar texto"
              className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-500 hover:text-red-600 hover:bg-red-50 transition-all duration-300 flex items-center justify-center cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}

          {/* Botón micrófono / detener */}
          {hasMediaSupport && (
            <button
              type="button"
              onClick={toggleRecording}
              disabled={isTranscribing || isRefining}
              title={isRecording ? 'Detener grabación' : 'Grabar observaciones por voz'}
              className={`p-1.5 rounded-lg border transition-all duration-300 flex items-center justify-center cursor-pointer ${
                isRecording
                  ? 'bg-red-50 text-red-500 border-red-200 animate-pulse'
                  : isTranscribing || isRefining
                    ? 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed'
                    : 'bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-100'
              }`}
            >
              {isRecording
                ? <Square className="h-3.5 w-3.5 fill-current" />
                : <Mic className="h-3.5 w-3.5" />
              }
            </button>
          )}

          {/* Botón IA refinar */}
          <button
            type="button"
            onClick={handleRefineText}
            disabled={!value?.trim() || isRefining || isWorking}
            title="Refinar y formalizar redacción con IA (Gemini)"
            className={`p-1.5 rounded-lg border transition-all duration-300 flex items-center justify-center cursor-pointer ${
              isRefining
                ? 'bg-blue-50 border-blue-200 text-[#468DFF]'
                : !value?.trim() || isWorking
                  ? 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed'
                  : 'bg-blue-50/50 border-[#468DFF]/15 text-[#468DFF] hover:bg-[#468DFF] hover:text-white hover:border-[#468DFF]'
            }`}
          >
            {isRefining
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <Sparkles className="h-3.5 w-3.5" />
            }
          </button>
        </div>
      </div>
    </>
  );
}
