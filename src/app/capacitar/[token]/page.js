// src/app/capacitar/[token]/page.js
'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useToast } from '@/components/providers/ToastProvider';
import { supabase } from '@/lib/supabase';
import PublicFooter from '@/components/PublicFooter';
import AppSignatureCanvas from '@/components/ui/AppSignatureCanvas';
import AITextHelper from '@/components/ui/AITextHelper';
import { 
  GraduationCap, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  Tv, 
  PenTool, 
  RotateCcw, 
  Loader2, 
  Building2, 
  Briefcase, 
  User, 
  CreditCard,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Maximize2,
  Lock,
  MapPin,
  MessageSquare,
  X
} from 'lucide-react';

// Cargar PdfSlideViewer solo en cliente (usa canvas de browser)
const PdfSlideViewer = dynamic(() => import('@/components/ui/PdfSlideViewer'), {
  ssr: false,
  loading: () => (
    <div className="w-full min-h-[300px] flex flex-col items-center justify-center bg-slate-900 gap-3">
      <Loader2 className="w-8 h-8 animate-spin text-[#468DFF]" />
      <p className="text-xs font-semibold text-slate-300">Cargando presentación PDF...</p>
    </div>
  )
});

// Componente para reproductor interactivo de YouTube mediante la API IFrame de YouTube (con fallback robusto a iframe)
function YouTubePlayer({ videoId, onEnded, title }) {
  const containerRef = useRef(null);
  const playerRef = useRef(null);
  const [apiFailed, setApiFailed] = useState(false);

  useEffect(() => {
    if (!videoId) return;
    let isMounted = true;

    const initPlayer = () => {
      if (!isMounted || !containerRef.current || !window.YT || !window.YT.Player) return;

      if (playerRef.current && typeof playerRef.current.destroy === 'function') {
        try {
          playerRef.current.destroy();
        } catch (e) {}
      }

      try {
        playerRef.current = new window.YT.Player(containerRef.current, {
          videoId: videoId,
          width: '100%',
          height: '100%',
          playerVars: {
            autoplay: 0,
            controls: 1,
            rel: 0,
            modestbranding: 1,
            origin: typeof window !== 'undefined' ? window.location.origin : ''
          },
          events: {
            onStateChange: (event) => {
              // event.data === 0 (YT.PlayerState.ENDED) representa la finalización del video
              if (event.data === 0) {
                onEnded?.();
              }
            }
          }
        });
      } catch (err) {
        console.warn('Error al instanciar YT.Player, activando iframe de resguardo:', err);
        if (isMounted) setApiFailed(true);
      }
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      if (!document.getElementById('youtube-iframe-api-script')) {
        const tag = document.createElement('script');
        tag.id = 'youtube-iframe-api-script';
        tag.src = 'https://www.youtube.com/iframe_api';
        tag.onerror = () => {
          if (isMounted) setApiFailed(true);
        };
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);
      }

      const previousCallback = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (previousCallback) previousCallback();
        initPlayer();
      };

      const intervalId = setInterval(() => {
        if (window.YT && window.YT.Player) {
          clearInterval(intervalId);
          initPlayer();
        }
      }, 300);

      const timeoutId = setTimeout(() => {
        if (isMounted && (!window.YT || !window.YT.Player)) {
          setApiFailed(true);
        }
      }, 3500);

      return () => {
        isMounted = false;
        clearInterval(intervalId);
        clearTimeout(timeoutId);
      };
    }

    return () => {
      isMounted = false;
      if (playerRef.current && typeof playerRef.current.destroy === 'function') {
        try {
          playerRef.current.destroy();
        } catch (e) {}
      }
    };
  }, [videoId, onEnded]);

  if (apiFailed) {
    const originParam = typeof window !== 'undefined' ? `&origin=${encodeURIComponent(window.location.origin)}` : '';
    return (
      <iframe
        src={`https://www.youtube.com/embed/${videoId}?enablejsapi=1${originParam}`}
        title={title || 'Video de la Capacitación'}
        className="w-full h-full border-0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    );
  }

  return (
    <div className="w-full h-full min-h-[300px]">
      <div ref={containerRef} className="w-full h-full min-h-[300px]" />
    </div>
  );
}

export default function PublicCapacitacionPage({ params }) {
  const token = params?.token;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [capacitacion, setCapacitacion] = useState(null);
  const { toast } = useToast();
  
  // Form State
  const [nombre, setNombre] = useState('');
  const [dni, setDni] = useState('');
  const [puesto, setPuesto] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [isNombreDropdownOpen, setIsNombreDropdownOpen] = useState(false);
  const [customNombreInput, setCustomNombreInput] = useState('');
  const [isPuestoDropdownOpen, setIsPuestoDropdownOpen] = useState(false);
  const [customPuestoInput, setCustomPuestoInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [documentSignedUrl, setDocumentSignedUrl] = useState('');

  // Extraer lista de empleados asignados a la capacitación
  const assignedEmployees = useMemo(() => {
    if (!capacitacion?.empleados_asignados) return [];
    if (Array.isArray(capacitacion.empleados_asignados)) {
      return capacitacion.empleados_asignados.filter(Boolean);
    }
    return [];
  }, [capacitacion]);

  // Extraer lista de puestos de trabajo asignados
  const assignedPuestos = useMemo(() => {
    const setPuestos = new Set();

    if (capacitacion?.target_puesto && typeof capacitacion.target_puesto === 'string') {
      capacitacion.target_puesto.split(',').forEach(p => {
        const trimmed = p.trim();
        if (trimmed && trimmed !== 'Todo el personal' && !trimmed.toLowerCase().includes('nombre 1')) {
          setPuestos.add(trimmed);
        }
      });
    }

    if (Array.isArray(capacitacion?.empleados_asignados)) {
      capacitacion.empleados_asignados.forEach(emp => {
        if (typeof emp === 'object' && emp?.puesto && emp.puesto.trim()) {
          setPuestos.add(emp.puesto.trim());
        }
      });
    }

    return Array.from(setPuestos);
  }, [capacitacion]);

  // Estado de Navegación de Diapositivas / Filminas y Progreso
  const [currentSlide, setCurrentSlide] = useState(1);
  const [totalSlides, setTotalSlides] = useState(1);
  const [hasCompletedMaterial, setHasCompletedMaterial] = useState(false);
  const [isFullscreenModalOpen, setIsFullscreenModalOpen] = useState(false);

  // Bloquear scroll del body cuando el modal de pantalla completa está abierto
  useEffect(() => {
    if (isFullscreenModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isFullscreenModalOpen]);

  // Canvas Signature State
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Token de capacitación no especificado.');
      setLoading(false);
      return;
    }

    const fetchCapacitacion = async () => {
      setLoading(true);
      setError(null);
      try {
        // 1. Intentar llamar a la función RPC pública get_capacitacion_publica
        const { data, error: rpcError } = await supabase.rpc('get_capacitacion_publica', {
          p_token: token
        });

        let loadedCap = null;
        if (!rpcError && data && data.success) {
          loadedCap = data;
        }

        if (loadedCap) {
          setCapacitacion(loadedCap);

          // Firmar URL si el documento es una ruta relativa en Supabase Storage
          const docUrl = loadedCap.document_url;
          if (docUrl && !docUrl.startsWith('http://') && !docUrl.startsWith('https://')) {
            try {
              const { data: signedData } = await supabase.storage
                .from('documents')
                .createSignedUrl(docUrl, 7200);
              if (signedData?.signedUrl) {
                setDocumentSignedUrl(signedData.signedUrl);
              }
            } catch (e) {
              console.warn('No se pudo firmar URL del documento:', e);
            }
          }
        } else {
          setError('La capacitación solicitada no existe, ha expirado o se encuentra inactiva.');
        }
      } catch (err) {
        console.error('Error al cargar la capacitación:', err);
        setError('Ocurrió un error al cargar la capacitación. Por favor intente nuevamente.');
      } finally {
        setLoading(false);
      }
    };

    fetchCapacitacion();
  }, [token]);

  // Helper para armar visor interactivo de diapositivas / PDF
  const getDocumentViewerInfo = (url, signedUrl) => {
    if (!url) return null;
    const target = signedUrl || url;

    // Si es una ruta relativa y signedUrl todavía no cargó, retornar estado cargando
    const isRelative = !target.startsWith('http://') && !target.startsWith('https://');
    if (isRelative) {
      return { loading: true, type: 'pending', embedUrl: null, rawUrl: null };
    }

    // 1. Google Presentation / Slides — soporta navegación por diapositiva via URL
    const slidesMatch = target.match(/\/presentation\/d\/([a-zA-Z0-9_-]+)/);
    if (slidesMatch) {
      return {
        loading: false,
        type: 'slides',
        slidesId: slidesMatch[1],
        rawUrl: target
      };
    }

    // 2. Google Docs
    const docMatch = target.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
    if (docMatch) {
      return {
        loading: false,
        type: 'docs',
        embedUrl: `https://docs.google.com/document/d/${docMatch[1]}/preview`,
        rawUrl: target
      };
    }

    // 3. Google Drive File (PPTX o similar)
    const driveMatch = target.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || target.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (driveMatch) {
      return {
        loading: false,
        type: 'drive',
        embedUrl: `https://drive.google.com/file/d/${driveMatch[1]}/preview`,
        rawUrl: target
      };
    }

    // 4. PDF directo (URL publica o URL firmada de Supabase Storage)
    // → Usa PdfSlideViewer con PDF.js (renderizado en canvas, control total de pagina)
    return {
      loading: false,
      type: 'pdf',
      rawUrl: target
    };
  };

  // Helper para formatear los puestos sin listar nombres de empleados
  const getPuestosFormatted = (cap) => {
    if (!cap) return 'General / Todo el personal';

    // 1. Si asignacion_tipo es 'puesto' y hay target_puesto no vacío (sin nombres autogenerados)
    if (cap.target_puesto && !cap.target_puesto.toLowerCase().includes('nombre 1') && !cap.target_puesto.toLowerCase().includes('nombre 2')) {
      return cap.target_puesto;
    }

    // 2. Si asignacion_tipo es 'nomina' y hay empleados_asignados con campo puesto
    if (Array.isArray(cap.empleados_asignados) && cap.empleados_asignados.length > 0) {
      const puestosSet = new Set();
      cap.empleados_asignados.forEach(emp => {
        if (typeof emp === 'object' && emp?.puesto && emp.puesto.trim()) {
          puestosSet.add(emp.puesto.trim());
        }
      });
      const puestosList = Array.from(puestosSet);
      if (puestosList.length > 0) {
        return puestosList.join(', ');
      }
    }

    return 'General / Todo el personal';
  };

  // Callback para cuando PdfSlideViewer informa el total de paginas
  const handleTotalPages = useCallback((n) => {
    setTotalSlides(n);
  }, []);

  // Callback unificado cuando finaliza la reproducción de un video
  const handleVideoEnd = useCallback(() => {
    setHasCompletedMaterial(true);
    toast('¡Ha finalizado la visualización del video! El formulario de registro se ha habilitado.', 'info');
    setTimeout(() => {
      document.getElementById('firma-section')?.scrollIntoView({ behavior: 'smooth' });
    }, 300);
  }, [toast]);

  // Helper para determinar el tipo de video y URL de embed
  const getVideoInfo = (url) => {
    if (!url) return null;
    const trimmed = url.trim();
    const lowerUrl = trimmed.toLowerCase();

    // 1. Archivo de video HTML5 directo (.mp4, .webm, .mov, o Supabase Storage)
    const isDirectVideo = lowerUrl.endsWith('.mp4') || lowerUrl.endsWith('.webm') || lowerUrl.endsWith('.mov') || lowerUrl.includes('/storage/v1/object/');
    if (isDirectVideo) {
      return { type: 'html5', url: trimmed };
    }

    // 2. YouTube
    try {
      let videoId = '';
      if (trimmed.includes('youtu.be/')) {
        videoId = trimmed.split('youtu.be/')[1]?.split('?')[0];
      } else if (trimmed.includes('youtube.com/watch')) {
        const urlObj = new URL(trimmed);
        videoId = urlObj.searchParams.get('v');
      } else if (trimmed.includes('youtube.com/embed/')) {
        const parts = trimmed.split('youtube.com/embed/')[1]?.split('?')[0];
        videoId = parts;
      }
      if (videoId) {
        return {
          type: 'youtube',
          videoId: videoId
        };
      }
    } catch (e) {
      console.warn('Error parseando URL de YouTube:', e);
    }

    // 3. Fallback a iframe genérico
    return { type: 'iframe', embedUrl: trimmed };
  };

  // Helper para obtener coordenadas relativas al canvas escaladas proporcionalmente
  const getCanvasPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches && e.touches.length > 0 ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches && e.touches.length > 0 ? e.touches[0].clientY : e.clientY;

    const x = ((clientX - rect.left) / (rect.width || 1)) * canvas.width;
    const y = ((clientY - rect.top) / (rect.height || 1)) * canvas.height;

    return { x, y };
  };

  // Lógica del Canvas de Firma Táctil / Mouse
  const startDrawing = (e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const pos = getCanvasPos(e, canvas);

    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const pos = getCanvasPos(e, canvas);

    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0F172A'; // Slate-900

    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validaciones en castellano usando el sistema de toasts unificado
    if (!nombre.trim()) {
      toast('Debe completar su nombre y apellido para continuar.', 'warning');
      return;
    }
    if (!dni.trim()) {
      toast('Debe completar su número de DNI/Documento para continuar.', 'warning');
      return;
    }
    if (!puesto.trim()) {
      toast('Debe completar el campo Puesto de Trabajo para continuar.', 'warning');
      return;
    }
    if (!hasSignature || !canvasRef.current) {
      toast('Debe dibujar su firma digital en el recuadro antes de registrar la capacitación.', 'warning');
      return;
    }

    const firmaBase64 = canvasRef.current.toDataURL('image/png');
    setSubmitting(true);

    try {
      // 1. Intentar registrar vía RPC registrar_asistencia_capacitacion
      const { data, error: rpcError } = await supabase.rpc('registrar_asistencia_capacitacion', {
        p_token: token,
        p_nombre: nombre.trim(),
        p_dni: dni.trim(),
        p_puesto: puesto.trim(),
        p_firma: firmaBase64,
        p_observaciones: observaciones.trim() || null
      });

      if (!rpcError && data && data.success) {
        setSubmittedSuccess(true);
        setSubmitting(false);
        return;
      }

      // 2. Fallback de inserción directa si la RPC fallase
      const { error: directInsertError } = await supabase
        .from('capacitaciones_online_registros')
        .insert([{
          tenant_id: capacitacion.tenant_id,
          capacitacion_id: capacitacion.id,
          nombre_apellido: nombre.trim(),
          dni: dni.trim(),
          puesto: puesto.trim(),
          firma_url: firmaBase64,
          observaciones: observaciones.trim() || null
        }]);

      if (directInsertError) {
        throw directInsertError;
      }

      setSubmittedSuccess(true);
    } catch (err) {
      console.error('Error al registrar la asistencia:', err);
      toast('No se pudo guardar el registro de capacitación. Por favor intente nuevamente.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-syso-bg text-slate-700 flex flex-col justify-between items-center relative font-sans">
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute top-[-20%] left-[-20%] w-[600px] h-[600px] rounded-full bg-[#468DFF]/5 blur-[180px]" />
          <div className="absolute bottom-[-20%] right-[-20%] w-[600px] h-[600px] rounded-full bg-[#0511F2]/5 blur-[180px]" />
        </div>
        <div className="w-full max-w-md z-10 flex-1 flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-200 text-center w-full">
            <Loader2 className="w-10 h-10 text-[#468DFF] animate-spin mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-slate-800">Cargando Capacitación...</h2>
            <p className="text-sm text-slate-500 mt-1">Obteniendo el material y formulario de asistencia</p>
          </div>
        </div>
        <PublicFooter />
      </div>
    );
  }

  if (error || !capacitacion) {
    return (
      <div className="min-h-screen bg-syso-bg text-slate-700 flex flex-col justify-between items-center relative font-sans">
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute top-[-20%] left-[-20%] w-[600px] h-[600px] rounded-full bg-[#468DFF]/5 blur-[180px]" />
          <div className="absolute bottom-[-20%] right-[-20%] w-[600px] h-[600px] rounded-full bg-[#0511F2]/5 blur-[180px]" />
        </div>
        <div className="w-full max-w-md z-10 flex-1 flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-200 text-center w-full">
            <div className="w-14 h-14 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">Acceso No Disponible</h2>
            <p className="text-slate-600 text-sm mb-6">{error || 'La capacitación no existe o fue desactivada.'}</p>
          </div>
        </div>
        <PublicFooter />
      </div>
    );
  }

  if (submittedSuccess) {
    return (
      <div className="min-h-screen bg-syso-bg text-slate-700 flex flex-col justify-between items-center relative font-sans">
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute top-[-20%] left-[-20%] w-[600px] h-[600px] rounded-full bg-[#468DFF]/5 blur-[180px]" />
          <div className="absolute bottom-[-20%] right-[-20%] w-[600px] h-[600px] rounded-full bg-[#0511F2]/5 blur-[180px]" />
        </div>
        <div className="w-full max-w-lg z-10 flex-1 flex items-center justify-center p-4">
          <div className="bg-white p-6 sm:p-7 pt-5 sm:pt-6 rounded-2xl shadow-xl border border-slate-200 text-center w-full">
            {/* Logo principal cargado en el perfil del usuario administrador */}
            {capacitacion.tenant_logo_url && (
              <div className="mb-3 flex justify-center">
                <img 
                  src={capacitacion.tenant_logo_url} 
                  alt="Logo Empresa Administradora" 
                  className="h-20 sm:h-24 max-w-[280px] sm:max-w-[320px] object-contain mx-auto"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              </div>
            )}

            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">¡Asistencia Registrada!</h2>
            <p className="text-slate-600 text-base mb-6">
              Muchas gracias <strong className="text-slate-800">{nombre}</strong>. Tu constancia de capacitación de higiene y seguridad para la empresa <strong className="text-[#468DFF]">{capacitacion.empresa_nombre}</strong> se ha firmado y registrado exitosamente.
            </p>

            <div className="bg-slate-50 p-4 rounded-xl text-left border border-slate-200 text-sm space-y-2 mb-6">
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500">Capacitación:</span>
                <span className="font-semibold text-slate-800 text-right">{capacitacion.titulo}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500">Nombre y Apellido:</span>
                <span className="font-semibold text-slate-800 text-right">{nombre}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500">DNI:</span>
                <span className="font-semibold text-slate-800">{dni}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Puesto:</span>
                <span className="font-semibold text-slate-800">{puesto}</span>
              </div>
            </div>

            <div className="text-xs text-slate-400 flex items-center justify-center gap-1">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              Registro firmado digitalmente con validez técnica
            </div>
          </div>
        </div>
        <PublicFooter />
      </div>
    );
  }

  const videoInfo = getVideoInfo(capacitacion.video_url);

  // Formatear los temas sin saltos de línea dobles
  const formattedTemas = (capacitacion.descripcion || capacitacion.titulo || '')
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .join('\n');

  return (
    <div className="min-h-screen bg-syso-bg text-slate-700 flex flex-col justify-between items-center relative font-sans">
      {/* Gradiantes de fondo iguales a Login — fixed inset-0 para evitar desbordamiento al scroll */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-20%] w-[600px] h-[600px] rounded-full bg-[#468DFF]/5 blur-[180px]" />
        <div className="absolute bottom-[-20%] right-[-20%] w-[600px] h-[600px] rounded-full bg-[#0511F2]/5 blur-[180px]" />
      </div>

      <div className="w-full max-w-3xl py-6 px-4 md:py-10 space-y-6 z-10 flex-1">
        
        {/* Cabecera Principal */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-md">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 bg-blue-50 text-[#468DFF] rounded-xl">
              <GraduationCap className="w-7 h-7" />
            </div>
            <div>
              <span className="text-xs font-semibold text-[#468DFF] uppercase tracking-wider block">
                Módulo de Capacitación Virtual
              </span>
              <h1 className="text-xl md:text-2xl font-bold text-slate-900 leading-tight">
                Capacitación de Higiene y Seguridad en el trabajo
              </h1>
            </div>
          </div>

          {/* Ficha de Metadatos: Empresa y Establecimiento */}
          <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-600 bg-slate-50 p-3.5 rounded-xl border border-slate-200 mt-4">
            <div className="flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-slate-400" />
              <span>Empresa: <strong className="text-slate-800">{capacitacion.empresa_nombre}</strong></span>
            </div>
            {capacitacion.establecimiento_nombre && (
              <div className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-slate-400" />
                <span>Establecimiento: <strong className="text-slate-800">{capacitacion.establecimiento_nombre}</strong></span>
              </div>
            )}
          </div>

          {/* Listado de Temas Incluidos en la Capacitación (sin saltos dobles) */}
          <div className="mt-5 border-t border-slate-100 pt-4">
            <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-[#468DFF]" />
              Temas incluidos en la capacitación:
            </h2>
            <div className="text-slate-700 text-sm leading-relaxed whitespace-pre-line bg-slate-50/70 p-4 rounded-xl border border-slate-200">
              {formattedTemas}
            </div>
          </div>
        </div>

        {/* Sección 1: Material audiovisual (Video de la Capacitación) */}
        {videoInfo && (
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-md space-y-4">
            <div>
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Tv className="w-5 h-5 text-[#468DFF]" />
                Video de la Capacitación
              </h2>
              <span className="text-xs text-slate-500 block mt-1">
                Visualice el video antes de completar el registro de capacitación. El formulario de registro se habilitará al finalizar la visualización o al confirmar la lectura.
              </span>
            </div>

            <div className="aspect-video w-full rounded-xl overflow-hidden bg-slate-900 border border-slate-200 shadow-inner">
              {videoInfo.type === 'youtube' ? (
                <YouTubePlayer
                  videoId={videoInfo.videoId}
                  onEnded={handleVideoEnd}
                  title={capacitacion.titulo}
                />
              ) : videoInfo.type === 'html5' ? (
                <video
                  src={videoInfo.url}
                  controls
                  controlsList="nodownload"
                  onEnded={handleVideoEnd}
                  className="w-full h-full object-contain"
                />
              ) : (
                <iframe
                  src={videoInfo.embedUrl}
                  title={capacitacion.titulo}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              )}
            </div>
          </div>
        )}

        {/* Sección 2: Documento / Presentación Interactiva — Modo Filmina */}
        {capacitacion.document_url && (() => {
          const viewer = getDocumentViewerInfo(capacitacion.document_url, documentSignedUrl);
          if (!viewer) return null;

          // Para Google Slides: construir embed URL con numero de diapositiva
          const getSlidesEmbedUrl = (slide) =>
            `https://docs.google.com/presentation/d/${viewer.slidesId}/embed?start=false&loop=false&delayms=99999&slide=${slide - 1}`;

          const isLastSlide = currentSlide >= totalSlides;

          const handleNextSlide = () => {
            setCurrentSlide(prev => {
              const next = prev + 1;
              // Habilitar firma cuando se llega a la ultima pagina/diapositiva
              if (next >= totalSlides) {
                setHasCompletedMaterial(true);
              }
              return next;
            });
          };

          const handlePrevSlide = () => {
            if (currentSlide > 1) setCurrentSlide(currentSlide - 1);
          };

          // Render del visor según tipo
          const renderViewer = (fullscreen = false) => {
            const containerCls = fullscreen
              ? 'flex-1 w-full overflow-hidden bg-black flex items-center justify-center'
              : 'w-full rounded-xl overflow-hidden bg-slate-900 border border-slate-200 shadow-inner relative';

            if (viewer.loading) {
              return (
                <div className={`${containerCls} min-h-[300px] flex flex-col items-center justify-center gap-3`}>
                  <Loader2 className="w-8 h-8 animate-spin text-[#468DFF]" />
                  <p className="text-xs font-semibold text-slate-300">Cargando presentación...</p>
                </div>
              );
            }

            if (viewer.type === 'pdf') {
              // PDF propio → PdfSlideViewer con PDF.js (sin scroll, control real de página)
              return (
                <div className={containerCls} style={fullscreen ? {} : { aspectRatio: '16/10' }}>
                  <PdfSlideViewer
                    url={viewer.rawUrl}
                    currentPage={currentSlide}
                    onTotalPages={handleTotalPages}
                  />
                </div>
              );
            }

            if (viewer.type === 'slides') {
              // Google Slides → iframe con parámetro slide= para navegar por diapositiva
              return (
                <div className={containerCls} style={fullscreen ? {} : { aspectRatio: '16/10' }}>
                  <iframe
                    key={`slides-${currentSlide}`}
                    src={getSlidesEmbedUrl(currentSlide)}
                    title="Presentación Google Slides"
                    className="w-full h-full border-0"
                    allow="autoplay; fullscreen"
                    allowFullScreen
                  />
                </div>
              );
            }

            // Google Docs / Drive — iframe sin control de página
            return (
              <div className={containerCls} style={fullscreen ? {} : { aspectRatio: '16/10' }}>
                <iframe
                  src={viewer.embedUrl}
                  title="Visor de Documento"
                  className="w-full h-full border-0"
                  allow="autoplay; fullscreen"
                  allowFullScreen
                />
              </div>
            );
          };

          // Barra de controles de navegación compartida
          const renderNavBar = (dark = false) => {
            if (viewer.type !== 'pdf') {
              return (
                <div className="flex items-center p-3 rounded-xl gap-3 bg-slate-900 text-white text-xs">
                  <div className="flex items-center gap-2 font-medium">
                    <span className="text-[#468DFF] font-bold shrink-0">📌 Visor de Google Presentation / Drive:</span>
                    <span className="text-slate-300">Utilizá los controles integrados en la parte inferior del visor (flechas &lt; &gt;) para navegar las filminas.</span>
                  </div>
                </div>
              );
            }

            return (
              <div className={`flex items-center justify-between p-3 rounded-xl gap-3 ${
                dark ? 'bg-slate-900' : 'bg-slate-900'
              }`}>
                <button
                  type="button"
                  onClick={handlePrevSlide}
                  disabled={currentSlide <= 1}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer disabled:cursor-default"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Anterior
                </button>

                <div className="flex items-center gap-2 text-xs font-mono font-bold text-white">
                  <span>Filmina</span>
                  <span className="bg-[#468DFF] px-2.5 py-0.5 rounded-md text-white">
                    {currentSlide}
                  </span>
                  {totalSlides > 1 && (
                    <span className="text-slate-400">/ {totalSlides}</span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleNextSlide}
                  disabled={isLastSlide}
                  className="px-3 py-1.5 bg-[#468DFF] hover:bg-[#0511F2] disabled:opacity-50 disabled:cursor-default text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-all shadow-sm cursor-pointer"
                >
                  Siguiente
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            );
          };

          return (
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-md space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-[#468DFF]" />
                    Material de Lectura y Presentación
                  </h2>
                  <span className="text-xs text-slate-500 block mt-0.5">
                    Modo Presentación — Use las flechas para avanzar filminas. El formulario de registro se habilitará al completar la capacitación.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (viewer.type !== 'pdf') setHasCompletedMaterial(true);
                    setIsFullscreenModalOpen(true);
                  }}
                  className="text-xs font-bold text-[#468DFF] hover:bg-blue-100 flex items-center gap-1.5 bg-blue-50 px-3.5 py-2 rounded-xl border border-blue-200 transition-all cursor-pointer shadow-sm"
                >
                  <Maximize2 className="w-4 h-4 text-[#468DFF]" />
                  Pantalla Completa
                </button>
              </div>

              {/* Barra de navegación */}
              {renderNavBar()}

              {/* Visor principal */}
              {renderViewer(false)}

              {/* Modal de Pantalla Completa */}
              {isFullscreenModalOpen && (
                <div className="fixed inset-0 z-[9999] bg-slate-950 flex flex-col">
                  {/* Cabecera del Modal */}
                  <div className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between flex-wrap gap-2 text-white">
                    <div className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-[#468DFF]" />
                      <span className="text-sm font-bold truncate max-w-[180px] sm:max-w-md">
                        {capacitacion.titulo}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {viewer.type === 'pdf' ? (
                        <>
                          <button
                            type="button"
                            onClick={handlePrevSlide}
                            disabled={currentSlide <= 1}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer disabled:cursor-default"
                          >
                            <ChevronLeft className="w-4 h-4" />
                            Anterior
                          </button>

                          <span className="text-xs font-mono font-bold bg-[#468DFF] px-2.5 py-1 rounded-md">
                            {currentSlide}{totalSlides > 1 ? ` / ${totalSlides}` : ''}
                          </span>

                          <button
                            type="button"
                            onClick={handleNextSlide}
                            disabled={isLastSlide}
                            className="px-3 py-1.5 bg-[#468DFF] hover:bg-[#0511F2] disabled:opacity-50 disabled:cursor-default text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer shadow-sm"
                          >
                            Siguiente
                            <ChevronRight className="w-4 h-4" />
                          </button>

                          {hasCompletedMaterial && (
                            <button
                              type="button"
                              onClick={() => {
                                setIsFullscreenModalOpen(false);
                                setTimeout(() => {
                                  document.getElementById('firma-section')?.scrollIntoView({ behavior: 'smooth' });
                                }, 100);
                              }}
                              className="px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 bg-[#468DFF] hover:bg-[#0511F2] text-white cursor-pointer transition-all shadow-sm"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              Ir a Firma
                            </button>
                          )}
                        </>
                      ) : (
                        <span className="text-xs text-slate-300 font-medium bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 hidden sm:inline-block">
                          📌 Navegación por controles del visor (flechas &lt; &gt;)
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => setIsFullscreenModalOpen(false)}
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors cursor-pointer"
                        title="Cerrar Pantalla Completa"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Cuerpo de Pantalla Completa */}
                  {renderViewer(true)}
                </div>
              )}
            </div>
          );
        })()}

        {/* Sección 3: Formulario de Asistencia y Firma Digital */}
        <div id="firma-section" className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-md">
          {!hasCompletedMaterial && (capacitacion.document_url || capacitacion.video_url) ? (
            <div className="bg-amber-50/90 border border-amber-200 rounded-2xl p-6 text-center space-y-3">
              <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-amber-900">
                Registro digital de capacitación
              </h3>
              <p className="text-xs text-amber-700 max-w-md mx-auto leading-relaxed">
                El formulario de registro se habilitará al completar la capacitación.
              </p>
              <button
                type="button"
                onClick={() => {
                  setHasCompletedMaterial(true);
                  setTimeout(() => {
                    document.getElementById('firma-section')?.scrollIntoView({ behavior: 'smooth' });
                  }, 100);
                }}
                className="px-5 py-2.5 bg-[#468DFF] hover:bg-[#0511F2] text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-[#468DFF]/20 flex items-center gap-2 mx-auto cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                Confirmar lectura/visualización del material y habilitar formulario
              </button>
            </div>
          ) : (
            <>
              <div className="border-b border-slate-200 pb-4 mb-6 flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <PenTool className="w-5 h-5 text-[#468DFF]" />
                    Registro y Firma Digital de Asistencia
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Complete sus datos personales e ingrese su firma táctil para dejar constancia de haber realizado la capacitación.
                  </p>
                </div>
                {(capacitacion.document_url || capacitacion.video_url) && (
                  <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[11px] font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Material Revisado
                  </span>
                )}
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Campo Nombre y Apellido con Desplegable + Añadir Manual */}
              <div className="relative">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Nombre y Apellido *
                </label>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsNombreDropdownOpen(!isNombreDropdownOpen)}
                    className="w-full min-h-[42px] border border-slate-300 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50 transition-all text-left flex items-center justify-between gap-2 cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      <User className="h-4 w-4 text-slate-400 shrink-0" />
                      {nombre ? (
                        <span className="text-slate-900 font-medium truncate">{nombre}</span>
                      ) : (
                        <span className="text-slate-400 font-normal">-- Selecciona o ingresa tu nombre --</span>
                      )}
                    </div>
                    <ChevronDown className={`h-4 w-4 text-slate-400 shrink-0 transition-transform ${isNombreDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Backdrop para cerrar al hacer clic afuera */}
                  {isNombreDropdownOpen && (
                    <div
                      className="fixed inset-0 z-20"
                      onClick={() => setIsNombreDropdownOpen(false)}
                    />
                  )}

                  {/* Desplegable emergente */}
                  {isNombreDropdownOpen && (
                    <div className="absolute z-30 left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl p-3 space-y-2.5 animate-scaleUp">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <span className="text-xs font-bold text-slate-700">
                          Personal de la Nómina ({assignedEmployees.length})
                        </span>
                        {nombre && (
                          <button
                            type="button"
                            onClick={() => {
                              setNombre('');
                              setIsNombreDropdownOpen(false);
                            }}
                            className="text-[11px] font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
                          >
                            Limpiar
                          </button>
                        )}
                      </div>

                      {/* Lista de Empleados scrollable */}
                      <div className="max-h-48 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                        {assignedEmployees.length === 0 ? (
                          <p className="text-xs text-slate-400 italic py-2 text-center">
                            No hay personal prefijado para esta capacitación. Use el campo inferior para añadir su nombre.
                          </p>
                        ) : (
                          assignedEmployees.map((emp, idx) => {
                            const empName = typeof emp === 'string' ? emp : emp.nombre_apellido;
                            const empPuesto = typeof emp === 'object' && emp?.puesto ? emp.puesto : '';
                            const isSelected = nombre === empName;
                            return (
                              <div
                                key={idx}
                                onClick={() => {
                                  setNombre(empName);
                                  if (typeof emp === 'object') {
                                    if (emp.cuil) {
                                      const cleanCuil = emp.cuil.replace(/\D/g, '');
                                      if (cleanCuil.length === 11) {
                                        setDni(cleanCuil.substring(2, 10));
                                      } else {
                                        setDni(emp.cuil);
                                      }
                                    }
                                    if (emp.puesto) {
                                      setPuesto(emp.puesto);
                                    }
                                  }
                                  setIsNombreDropdownOpen(false);
                                }}
                                className={`flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                                  isSelected ? 'bg-[#468DFF]/10 text-[#468DFF] font-bold' : 'hover:bg-slate-50 text-slate-700'
                                }`}
                              >
                                <div className="flex items-center gap-2 truncate">
                                  <User className="h-3.5 w-3.5 text-[#468DFF] shrink-0" />
                                  <span className="truncate">{empName}</span>
                                </div>
                                {empPuesto && (
                                  <span className="text-[10px] text-slate-400 shrink-0 font-normal">({empPuesto})</span>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>

                      {/* Opción para agregar un Nombre manualmente (+ Añadir) */}
                      <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Escribir un nuevo nombre..."
                          value={customNombreInput}
                          onChange={(e) => setCustomNombreInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              if (customNombreInput.trim()) {
                                setNombre(customNombreInput.trim());
                                setCustomNombreInput('');
                                setIsNombreDropdownOpen(false);
                              }
                            }
                          }}
                          className="flex-1 border border-slate-200 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-[#468DFF] bg-slate-50"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (customNombreInput.trim()) {
                              setNombre(customNombreInput.trim());
                              setCustomNombreInput('');
                              setIsNombreDropdownOpen(false);
                            }
                          }}
                          className="px-2.5 py-1 bg-[#468DFF] text-white rounded-lg text-xs font-bold hover:bg-[#0511F2] transition-colors cursor-pointer shrink-0"
                        >
                          + Añadir
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Input oculto para validación HTML5 required */}
                <input
                  type="text"
                  required
                  value={nombre}
                  onChange={() => {}}
                  tabIndex={-1}
                  className="opacity-0 h-0 w-0 absolute pointer-events-none"
                />
              </div>

              {/* Campo DNI / Documento */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  DNI / Documento *
                </label>
                <div className="relative">
                  <CreditCard className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={dni}
                    onChange={(e) => setDni(e.target.value)}
                    placeholder="Ej. 35123456"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#468DFF] focus:bg-white text-slate-900"
                  />
                </div>
              </div>
            </div>

            {/* Campo Puesto de Trabajo con Desplegable + Añadir Manual */}
            <div className="relative">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Puesto de Trabajo *
              </label>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsPuestoDropdownOpen(!isPuestoDropdownOpen)}
                  className="w-full min-h-[42px] border border-slate-300 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50 transition-all text-left flex items-center justify-between gap-2 cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <Briefcase className="h-4 w-4 text-slate-400 shrink-0" />
                    {puesto ? (
                      <span className="text-slate-900 font-medium truncate">{puesto}</span>
                    ) : (
                      <span className="text-slate-400 font-normal">-- Selecciona o ingresa tu puesto de trabajo --</span>
                    )}
                  </div>
                  <ChevronDown className={`h-4 w-4 text-slate-400 shrink-0 transition-transform ${isPuestoDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Backdrop para cerrar al hacer clic afuera */}
                {isPuestoDropdownOpen && (
                  <div
                    className="fixed inset-0 z-20"
                    onClick={() => setIsPuestoDropdownOpen(false)}
                  />
                )}

                {/* Desplegable emergente */}
                {isPuestoDropdownOpen && (
                  <div className="absolute z-30 left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl p-3 space-y-2.5 animate-scaleUp">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <span className="text-xs font-bold text-slate-700">
                        Puestos de Trabajo ({assignedPuestos.length})
                      </span>
                      {puesto && (
                        <button
                          type="button"
                          onClick={() => {
                            setPuesto('');
                            setIsPuestoDropdownOpen(false);
                          }}
                          className="text-[11px] font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          Limpiar
                        </button>
                      )}
                    </div>

                    {/* Lista de Puestos scrollable */}
                    <div className="max-h-48 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                      {assignedPuestos.length === 0 ? (
                        <p className="text-xs text-slate-400 italic py-2 text-center">
                          No hay puestos prefijados para esta capacitación. Use el campo inferior para añadir su puesto.
                        </p>
                      ) : (
                        assignedPuestos.map((puestoName, idx) => {
                          const isSelected = puesto === puestoName;
                          return (
                            <div
                              key={idx}
                              onClick={() => {
                                setPuesto(puestoName);
                                setIsPuestoDropdownOpen(false);
                              }}
                              className={`flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                                isSelected ? 'bg-[#468DFF]/10 text-[#468DFF] font-bold' : 'hover:bg-slate-50 text-slate-700'
                              }`}
                            >
                              <span className="truncate">{puestoName}</span>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Opción para agregar un Puesto manualmente (+ Añadir) */}
                    <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Escribir un nuevo puesto..."
                        value={customPuestoInput}
                        onChange={(e) => setCustomPuestoInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (customPuestoInput.trim()) {
                              setPuesto(customPuestoInput.trim());
                              setCustomPuestoInput('');
                              setIsPuestoDropdownOpen(false);
                            }
                          }
                        }}
                        className="flex-1 border border-slate-200 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-[#468DFF] bg-slate-50"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (customPuestoInput.trim()) {
                            setPuesto(customPuestoInput.trim());
                            setCustomPuestoInput('');
                            setIsPuestoDropdownOpen(false);
                          }
                        }}
                        className="px-2.5 py-1 bg-[#468DFF] text-white rounded-lg text-xs font-bold hover:bg-[#0511F2] transition-colors cursor-pointer shrink-0"
                      >
                        + Añadir
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Input oculto para validación HTML5 required */}
              <input
                type="text"
                required
                value={puesto}
                onChange={() => {}}
                tabIndex={-1}
                className="opacity-0 h-0 w-0 absolute pointer-events-none"
              />
            </div>

            {/* Campo Observaciones / Comentarios con SySO-AI-Voice-Helper */}
            <div className="pt-1">
              <div className="flex items-center justify-between gap-2 mb-1.5 min-h-[28px]">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-[#468DFF]" />
                  Observaciones / Comentarios (Opcional)
                </label>
                <AITextHelper
                  value={observaciones}
                  onChange={setObservaciones}
                  context="Observaciones del trabajador en la capacitación de Higiene y Seguridad en el Trabajo"
                  publicToken={token}
                  allowExpand={true}
                />
              </div>
              <textarea
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                rows={3}
                placeholder="Escriba o utilice el dictado por voz para ingresar cualquier observación o aclaración sobre la capacitación realizada..."
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#468DFF] focus:bg-white text-slate-900 transition-all resize-y min-h-[85px]"
              />
            </div>

            {/* Pad de Firma Digital Canvas */}
            <div className="pt-2">
              <AppSignatureCanvas
                ref={canvasRef}
                label="Firma Digital (Con el dedo en pantalla táctil o mouse en PC)"
                required
                height={175}
                width={600}
                onChange={(signed) => setHasSignature(signed)}
                onClear={() => setHasSignature(false)}
              />
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 bg-[#468DFF] text-white rounded-xl font-bold text-base flex items-center justify-center gap-2 hover:bg-[#0511F2] transition-colors shadow-md disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Registrando...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    Registrar Capacitación
                  </>
                )}
              </button>
            </div>
          </form>
        </>
      )}
        </div>
      </div>

      <PublicFooter />
    </div>
  );
}
