import { Mic, Sparkles, Loader2, Trash2, X, Smartphone, Monitor, Square, Maximize2 } from 'lucide-react';

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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
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

// ── Modal de Grabación Overlay (Solución Responsive Premium) ───────────────────
function RecordingOverlay({ seconds, maxSeconds, onStop, onCancel }) {
  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xs overflow-hidden p-6 flex flex-col items-center">
        <p className="text-xs font-bold text-slate-800 mb-0.5">Escuchando observaciones...</p>
        <p className="text-[10px] text-slate-400 mb-5 text-center">Hablá fuerte cerca del micrófono.</p>

        {/* Pulso de grabación */}
        <div className="relative flex items-center justify-center h-20 w-20 mb-5">
          <div className="absolute inset-0 rounded-full bg-red-500/10 animate-ping" style={{ animationDuration: '1.8s' }} />
          <div className="absolute inset-2 rounded-full bg-red-500/15 animate-pulse" />
          <div className="relative h-12 w-12 rounded-full bg-red-500 flex items-center justify-center shadow-lg shadow-red-500/20">
            <Mic className="h-5 w-5 text-white animate-pulse" />
          </div>
        </div>

        {/* Cronómetro */}
        <div className="text-lg font-mono font-bold text-slate-800 mb-5 flex items-center gap-1.5">
          <span className="text-red-500 animate-pulse">●</span>
          {formatTime(seconds)} <span className="text-slate-300 font-normal text-xs">/ {formatTime(maxSeconds)}</span>
        </div>

        {/* Botones de acción */}
        <div className="w-full flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onStop}
            className="flex-1 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1 shadow-md shadow-red-500/10"
          >
            <Square className="h-3 w-3 fill-current" />
            Terminar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal de Ampliación de Campo (Expand Modal) ─────────────────────────────────
function ExpandTextModal({ value, onChange, context, onClose, hasMediaSupport, isRecording, isTranscribing, isRefining, errorMessage, toggleRecording, handleRefineText, recordingSeconds, MAX_RECORDING_SEC }) {
  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-blue-50 text-[#468DFF]">
              <Maximize2 className="h-4 w-4" />
            </span>
            <p className="text-sm font-bold text-slate-800">Ampliar redacción</p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Textarea */}
        <div className="p-5 flex flex-col gap-3">
          <textarea
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Escribí o dictá observaciones detalladas..."
            className="w-full h-48 border border-slate-200 rounded-xl p-3 text-xs text-slate-700 outline-none focus:border-[#468DFF] transition-all resize-none font-semibold bg-slate-50/30"
          />
        </div>

        {/* Barra de estados */}
        {(isRecording || isTranscribing || errorMessage) && (
          <div className="px-5 pb-3 flex flex-wrap gap-2">
            {isRecording && (
              <span className="text-[10px] font-bold text-red-600 flex items-center gap-1 bg-red-50 px-2 py-1 rounded-lg border border-red-200 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
                {recordingSeconds}s / {MAX_RECORDING_SEC}s — Grabando
              </span>
            )}
            {isTranscribing && (
              <span className="text-[10px] font-bold text-[#468DFF] flex items-center gap-1 bg-blue-50 px-2 py-1 rounded-lg border border-blue-200">
                <Loader2 className="h-3 w-3 animate-spin" />
                Transcribiendo…
              </span>
            )}
            {errorMessage && !isRecording && !isTranscribing && (
              <span className="text-[10px] font-bold text-red-500 flex items-center gap-1 bg-red-50 px-2 py-1 rounded-lg border border-red-100">
                {errorMessage}
              </span>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="px-5 pb-5 pt-2 border-t border-slate-100 flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            {/* Limpiar */}
            {value?.trim() && !isRecording && !isTranscribing && (
              <button
                type="button"
                onClick={() => onChange('')}
                title="Limpiar texto"
                className="p-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-500 hover:text-red-600 hover:bg-red-50 transition-all duration-300 flex items-center justify-center cursor-pointer"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}

            {/* Micrófono */}
            {hasMediaSupport && (
              <button
                type="button"
                onClick={toggleRecording}
                disabled={isTranscribing || isRefining}
                title={isRecording ? 'Detener grabación' : 'Grabar observaciones por voz'}
                className={`p-2 rounded-lg border transition-all duration-300 flex items-center justify-center cursor-pointer ${
                  isRecording
                    ? 'bg-red-50 text-red-500 border-red-200 animate-pulse'
                    : isTranscribing || isRefining
                      ? 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed'
                      : 'bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                }`}
              >
                {isRecording ? <Square className="h-4 w-4 fill-current" /> : <Mic className="h-4 w-4" />}
              </button>
            )}

            {/* Refinar */}
            <button
              type="button"
              onClick={handleRefineText}
              disabled={!value?.trim() || isRefining || isRecording || isTranscribing}
              title="Refinar y formalizar redacción con IA (Gemini)"
              className={`p-2 rounded-lg border transition-all duration-300 flex items-center justify-center cursor-pointer ${
                isRefining
                  ? 'bg-blue-50 border-blue-200 text-[#468DFF]'
                  : !value?.trim() || isRecording || isTranscribing
                    ? 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed'
                    : 'bg-blue-50/50 border-[#468DFF]/15 text-[#468DFF] hover:bg-[#468DFF] hover:text-white hover:border-[#468DFF]'
              }`}
            >
              {isRefining ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#468DFF] text-white text-xs font-bold hover:bg-[#0511F2] transition-colors cursor-pointer"
          >
            Aceptar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Componente Principal ──────────────────────────────────────────────────────
export default function AITextHelper({ value, onChange, context = '', disabled = false, allowExpand = false }) {
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
  const isCancelledRef = useRef(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
      setHasMediaSupport(true);
    }
  }, []);

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

  const blobToBase64 = (blob) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

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
      isCancelledRef.current = false;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

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
        if (isCancelledRef.current) {
          audioChunksRef.current = [];
          return;
        }
        const audioBlob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        });
        audioChunksRef.current = [];
        if (audioBlob.size > 0) {
          await transcribeAudio(audioBlob);
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start(100);
      setIsRecording(true);
      setRecordingSeconds(0);

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

  const cancelRecording = () => {
    isCancelledRef.current = true;
    stopRecording();
  };

  const [showExpandModal, setShowExpandModal] = useState(false);

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

  return (
    <>
      {showPermissionModal && (
        <MicPermissionModal onClose={() => setShowPermissionModal(false)} />
      )}

      {/* Ventana Emergente Premium de Grabación */}
      {isRecording && (
        <RecordingOverlay
          seconds={recordingSeconds}
          maxSeconds={MAX_RECORDING_SEC}
          onStop={stopRecording}
          onCancel={cancelRecording}
        />
      )}

      {/* Modal de Ampliación de Campo */}
      {showExpandModal && (
        <ExpandTextModal
          value={value}
          onChange={onChange}
          context={context}
          onClose={() => setShowExpandModal(false)}
          hasMediaSupport={hasMediaSupport}
          isRecording={isRecording}
          isTranscribing={isTranscribing}
          isRefining={isRefining}
          errorMessage={errorMessage}
          toggleRecording={toggleRecording}
          handleRefineText={handleRefineText}
          recordingSeconds={recordingSeconds}
          MAX_RECORDING_SEC={MAX_RECORDING_SEC}
        />
      )}

      <div className="flex flex-col items-end gap-1 shrink-0">
        <div className="flex items-center gap-1.5">

          {/* Estado de Transcripción */}
          {isTranscribing && (
            <span className="text-[10px] font-bold text-[#468DFF] flex items-center gap-1 bg-blue-50 px-2 py-1 rounded-lg border border-blue-200 animate-pulse">
              <Loader2 className="h-3 w-3 animate-spin" />
              Transcribiendo…
            </span>
          )}

          {/* Mensajes de error en línea (no se solapan con inputs) */}
          {errorMessage && !isRecording && !isTranscribing && (
            <span className="text-[10px] font-bold text-red-500 flex items-center gap-1 bg-red-50 px-2 py-1 rounded-lg border border-red-100">
              {errorMessage}
            </span>
          )}

          {/* Limpiar texto */}
          {value?.trim() && !isRecording && !isTranscribing && !showExpandModal && (
            <button
              type="button"
              onClick={() => onChange('')}
              title="Limpiar texto"
              className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-500 hover:text-red-600 hover:bg-red-50 transition-all duration-300 flex items-center justify-center cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}

          {/* Botón Micrófono */}
          {hasMediaSupport && !showExpandModal && (
            <button
              type="button"
              onClick={startRecording}
              disabled={isTranscribing || isRefining || isRecording}
              title="Grabar observaciones por voz"
              className={`p-1.5 rounded-lg border transition-all duration-300 flex items-center justify-center cursor-pointer ${
                isTranscribing || isRefining
                  ? 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed'
                  : 'bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Mic className="h-3.5 w-3.5" />
            </button>
          )}

          {/* Botón Refinar */}
          {!showExpandModal && (
            <button
              type="button"
              onClick={handleRefineText}
              disabled={!value?.trim() || isRefining || isRecording || isTranscribing}
              title="Refinar y formalizar redacción con IA (Gemini)"
              className={`p-1.5 rounded-lg border transition-all duration-300 flex items-center justify-center cursor-pointer ${
                isRefining
                  ? 'bg-blue-50 border-blue-200 text-[#468DFF]'
                  : !value?.trim() || isRecording || isTranscribing
                    ? 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed'
                    : 'bg-blue-50/50 border-[#468DFF]/15 text-[#468DFF] hover:bg-[#468DFF] hover:text-white hover:border-[#468DFF]'
              }`}
            >
              {isRefining
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <Sparkles className="h-3.5 w-3.5" />
              }
            </button>
          )}

          {/* Botón Ampliar (Opcional) */}
          {allowExpand && !isRecording && !isTranscribing && !showExpandModal && (
            <button
              type="button"
              onClick={() => setShowExpandModal(true)}
              title="Ampliar y redactar en pantalla completa"
              className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-500 hover:text-[#468DFF] hover:bg-blue-50 hover:border-blue-150 transition-all duration-300 flex items-center justify-center cursor-pointer"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </>
  );
}
