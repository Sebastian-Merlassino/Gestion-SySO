// src/app/capacitar/[token]/page.js
'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  ExternalLink
} from 'lucide-react';

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
        } else if (!directError && directData) {
          loadedCap = {
            id: directData.id,
            titulo: directData.titulo,
            descripcion: directData.descripcion,
            asignacion_tipo: directData.asignacion_tipo,
            target_puesto: directData.target_puesto,
            material_tipo: directData.material_tipo,
            video_url: directData.video_url,
            document_url: directData.document_url,
            empresa_nombre: directData.empresas?.razon_social || 'Gestión SySO'
          };
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

  // Helper para armar visor interactivo de diapositivas / PDF (Google Slides / Docs / Drive / PDF)
  const getDocumentViewerInfo = (url, signedUrl) => {
    if (!url) return null;
    const target = signedUrl || url;

    // Si es una ruta relativa y signedUrl todavía no cargó, retornar estado cargando
    const isRelative = !target.startsWith('http://') && !target.startsWith('https://');
    if (isRelative) {
      return {
        loading: true,
        type: 'pending',
        embedUrl: null,
        rawUrl: null
      };
    }

    // 1. Google Presentation / Slides
    const slidesMatch = target.match(/\/presentation\/d\/([a-zA-Z0-9_-]+)/);
    if (slidesMatch) {
      return {
        loading: false,
        type: 'slides',
        embedUrl: `https://docs.google.com/presentation/d/${slidesMatch[1]}/embed?start=false&loop=false&delayms=3000`,
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

    // 3. Google Drive File
    const driveMatch = target.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || target.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (driveMatch) {
      return {
        loading: false,
        type: 'drive',
        embedUrl: `https://drive.google.com/file/d/${driveMatch[1]}/preview`,
        rawUrl: target
      };
    }

    // 4. Direct PDF URL / Supabase Storage PDF
    return {
      loading: false,
      type: 'pdf',
      embedUrl: target,
      rawUrl: target
    };
  };

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

        {/* Sección 2: Documento / Presentación Interactiva (Navegar Diapositivas / Páginas) */}
        {capacitacion.document_url && (() => {
          const viewer = getDocumentViewerInfo(capacitacion.document_url, documentSignedUrl);
          if (!viewer) return null;

          return (
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-[#468DFF]" />
                  Material de Lectura / Presentación Adjunta
                </h2>
                {viewer.rawUrl && (
                  <a
                    href={viewer.rawUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-bold text-[#468DFF] hover:underline flex items-center gap-1"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Abrir en ventana completa
                  </a>
                )}
              </div>

              <p className="text-xs text-slate-500">
                Visualice la presentación a continuación. Puede avanzar y retroceder de diapositivas o páginas antes de registrar su asistencia.
              </p>

              {/* Visor Interactivo Iframe Embed (Slides/PDF) */}
              <div className="aspect-[4/3] sm:aspect-[16/10] w-full rounded-xl overflow-hidden bg-slate-900 border border-slate-200 shadow-inner relative">
                {viewer.loading ? (
                  <div className="w-full h-full flex flex-col items-center justify-center text-white space-y-2">
                    <Loader2 className="w-8 h-8 animate-spin text-[#468DFF]" />
                    <p className="text-xs font-semibold text-slate-300">Cargando presentación...</p>
                  </div>
                ) : (
                  <iframe
                    src={viewer.embedUrl}
                    title="Visor de Presentación y Documentos"
                    className="w-full h-full border-0"
                    allow="autoplay; fullscreen"
                    allowFullScreen
                  />
                )}
              </div>
            </div>
          );
        })()}

        {/* Sección 3: Formulario de Asistencia y Firma Digital */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="border-b border-slate-200 pb-4 mb-6">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <PenTool className="w-5 h-5 text-[#468DFF]" />
              Registro y Firma Digital de Asistencia
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Complete sus datos personales e ingrese su firma táctil para dejar constancia de haber realizado la capacitación.
            </p>
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
        </div>

        <div className="text-center text-xs text-slate-400 py-2">
          Gestión SySO — Sistema de Gestión Integral en Seguridad y Salud Ocupacional
        </div>
      </div>
    </div>
  );
}
