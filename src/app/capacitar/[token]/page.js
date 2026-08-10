// src/app/capacitar/[token]/page.js
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';
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
  Maximize2,
  Lock,
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

export default function PublicCapacitacionPage({ params }) {
  const token = params?.token;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [capacitacion, setCapacitacion] = useState(null);
  
  // Form State
  const [nombre, setNombre] = useState('');
  const [dni, setDni] = useState('');
  const [puesto, setPuesto] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [documentSignedUrl, setDocumentSignedUrl] = useState('');

  // Estado de Navegación de Diapositivas / Filminas y Progreso
  const [currentSlide, setCurrentSlide] = useState(1);
  const [totalSlides, setTotalSlides] = useState(1);
  const [hasCompletedMaterial, setHasCompletedMaterial] = useState(false);
  const [isFullscreenModalOpen, setIsFullscreenModalOpen] = useState(false);

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
          if (loadedCap.target_puesto) {
            setPuesto(loadedCap.target_puesto);
          }

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

  // Callback para cuando PdfSlideViewer informa el total de paginas
  const handleTotalPages = useCallback((n) => {
    setTotalSlides(n);
  }, []);

  // Helper para convertir URLs de YouTube en Iframe Embed URLs
  const getYouTubeEmbedUrl = (url) => {
    if (!url) return null;
    try {
      let videoId = '';
      if (url.includes('youtu.be/')) {
        videoId = url.split('youtu.be/')[1]?.split('?')[0];
      } else if (url.includes('youtube.com/watch')) {
        const urlObj = new URL(url);
        videoId = urlObj.searchParams.get('v');
      } else if (url.includes('youtube.com/embed/')) {
        return url;
      }
      return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
    } catch (e) {
      return url;
    }
  };

  // Lógica del Canvas de Firma Táctil / Mouse
  const startDrawing = (e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0F172A'; // Slate-900

    ctx.lineTo(clientX - rect.left, clientY - rect.top);
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
    if (!nombre.trim() || !dni.trim() || !puesto.trim()) {
      alert('Por favor complete todos los datos personales (Nombre, DNI y Puesto).');
      return;
    }

    if (!hasSignature || !canvasRef.current) {
      alert('Por favor dibuje su firma digital en el cuadro correspondiente antes de enviar.');
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
        p_firma: firmaBase64
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
          firma_url: firmaBase64
        }]);

      if (directInsertError) {
        throw directInsertError;
      }

      setSubmittedSuccess(true);
    } catch (err) {
      console.error('Error al registrar la asistencia:', err);
      alert('No se pudo guardar la constancia de firma. Por favor intente nuevamente.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center max-w-md w-full">
          <Loader2 className="w-10 h-10 text-[#468DFF] animate-spin mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-slate-800">Cargando Capacitación...</h2>
          <p className="text-sm text-slate-500 mt-1">Obteniendo el material y formulario de asistencia</p>
        </div>
      </div>
    );
  }

  if (error || !capacitacion) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center max-w-md w-full">
          <div className="w-14 h-14 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Acceso No Disponible</h2>
          <p className="text-slate-600 text-sm mb-6">{error || 'La capacitación no existe o fue desactivada.'}</p>
          <div className="text-xs text-slate-400 border-t border-slate-100 pt-4">
            Gestión SySO — Plataforma de Seguridad y Salud Ocupacional
          </div>
        </div>
      </div>
    );
  }

  if (submittedSuccess) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 animate-fade-in">
        <div className="bg-white p-8 rounded-2xl shadow-md border border-slate-200 text-center max-w-lg w-full">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">¡Asistencia Registrada!</h2>
          <p className="text-slate-600 text-base mb-6">
            Muchas gracias <strong className="text-slate-800">{nombre}</strong>. Tu constancia de capacitación para la empresa <strong className="text-[#468DFF]">{capacitacion.empresa_nombre}</strong> se ha firmado y registrado exitosamente.
          </p>

          <div className="bg-slate-50 p-4 rounded-xl text-left border border-slate-200 text-sm space-y-2 mb-6">
            <div className="flex justify-between border-b border-slate-200 pb-2">
              <span className="text-slate-500">Capacitación:</span>
              <span className="font-semibold text-slate-800 text-right">{capacitacion.titulo}</span>
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
    );
  }

  const embedVideoUrl = getYouTubeEmbedUrl(capacitacion.video_url);

  return (
    <div className="min-h-screen bg-slate-100 py-6 px-4 md:py-10">
      <div className="max-w-3xl mx-auto space-y-6">
        
        {/* Cabecera Principal */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 bg-blue-50 text-[#468DFF] rounded-xl">
              <GraduationCap className="w-7 h-7" />
            </div>
            <div>
              <span className="text-xs font-semibold text-[#468DFF] uppercase tracking-wider block">
                Módulo de Capacitación Virtual
              </span>
              <h1 className="text-xl md:text-2xl font-bold text-slate-900 leading-tight">
                {capacitacion.titulo}
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200 mt-4">
            <div className="flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-slate-400" />
              <span>Empresa: <strong className="text-slate-800">{capacitacion.empresa_nombre}</strong></span>
            </div>
            {capacitacion.target_puesto && (
              <div className="flex items-center gap-1.5">
                <Briefcase className="w-4 h-4 text-slate-400" />
                <span>Puesto: <strong className="text-slate-800">{capacitacion.target_puesto}</strong></span>
              </div>
            )}
          </div>

          {capacitacion.descripcion && (
            <p className="text-slate-600 text-sm mt-4 leading-relaxed whitespace-pre-line border-t border-slate-100 pt-4">
              {capacitacion.descripcion}
            </p>
          )}
        </div>

        {/* Sección 1: Material audiovisual (Video YouTube) */}
        {embedVideoUrl && (
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 mb-4">
              <Tv className="w-5 h-5 text-[#468DFF]" />
              Video Instructivo de la Capacitación
            </h2>
            <div className="aspect-video w-full rounded-xl overflow-hidden bg-slate-900 border border-slate-200 shadow-inner">
              <iframe
                src={embedVideoUrl}
                title={capacitacion.titulo}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
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
          const renderNavBar = (dark = false) => (
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

          return (
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-[#468DFF]" />
                    Material de Lectura y Presentación
                  </h2>
                  <span className="text-xs text-slate-500 block mt-0.5">
                    Modo Presentación — Use las flechas para avanzar filminas. La firma se habilitará al llegar a la última.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsFullscreenModalOpen(true)}
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

              {/* Indicador de progreso */}
              <div className={`pt-2 flex items-center justify-end gap-2 text-xs font-semibold ${
                hasCompletedMaterial ? 'text-emerald-700' : 'text-amber-700'
              }`}>
                {hasCompletedMaterial ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Presentación completada — Firma habilitada
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4 text-amber-500" />
                    Avance hasta la última filmina para habilitar la firma
                  </>
                )}
              </div>

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
                          className="px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer transition-all"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          Ir a Firma
                        </button>
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

        {/* Sección 3: Formulario de Asistencia y Firma Digital (Desbloqueo Progresivo Auditado) */}
        <div id="firma-section" className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          {!hasCompletedMaterial && (capacitacion.document_url || capacitacion.video_url) ? (
            <div className="bg-amber-50/90 border border-amber-200 rounded-2xl p-6 text-center space-y-3">
              <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-amber-900">
                Firma Digital Temporariamente Bloqueada
              </h3>
              <p className="text-xs text-amber-700 max-w-md mx-auto leading-relaxed">
                Por normativas de seguridad y salud ocupacional, debe navegar las filminas/diapositivas o revisar el material audiovisual antes de registrar su firma de asistencia.
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
                Confirmar lectura completa del material y habilitar firma
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
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Nombre y Apellido *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Ej. Juan Pérez"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#468DFF] focus:bg-white text-slate-900"
                  />
                </div>
              </div>

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

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Puesto de Trabajo *
              </label>
              <div className="relative">
                <Briefcase className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  value={puesto}
                  onChange={(e) => setPuesto(e.target.value)}
                  placeholder="Ej. Operador de Autoelevador / Técnico de Mantenimiento"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#468DFF] focus:bg-white text-slate-900"
                />
              </div>
            </div>

            {/* Pad de Firma Digital Canvas */}
            <div className="pt-2">
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Firma Digital (Con el dedo en pantalla táctil o mouse en PC) *
                </label>
                <button
                  type="button"
                  onClick={clearSignature}
                  className="text-xs text-red-600 hover:text-red-700 font-medium flex items-center gap-1 py-1 px-2 rounded-lg hover:bg-red-50 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Limpiar trazo
                </button>
              </div>

              <div className="relative bg-slate-50 rounded-xl border-2 border-dashed border-slate-300 overflow-hidden touch-none">
                <canvas
                  ref={canvasRef}
                  width={600}
                  height={180}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="w-full h-44 cursor-crosshair block"
                />
                {!hasSignature && (
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-slate-400 text-xs font-medium">
                    Firme sobre la línea punteada
                  </div>
                )}
              </div>
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
                    Registrando Asistencia...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    Firmar y Registrar Capacitación
                  </>
                )}
              </button>
            </div>
          </form>
        </>
      )}
    </div>

        <div className="text-center text-xs text-slate-400 py-2">
          Gestión SySO — Sistema de Gestión Integral en Seguridad y Salud Ocupacional
        </div>
      </div>
    </div>
  );
}
