// src/components/ui/AppSignatureCanvas.js
'use client';

import React, { useRef, useEffect, useState, useImperativeHandle, forwardRef, useCallback } from 'react';
import { RotateCcw, CheckCircle2, PenTool, Edit3 } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * AppSignatureCanvas
 * Componente unificado y reutilizable de lienzo interactivo Canvas HTML5 para captura de firmas digitales.
 * Soporta entrada táctil y mouse con escalado proporcional 1:1 sin desvinculación de trazo mid-stroke.
 */
const AppSignatureCanvas = forwardRef(function AppSignatureCanvas(
  {
    label = 'Firma Digital',
    required = false,
    disabled = false,
    height = 160,
    width = 500,
    initialUrl = '',
    onChange,
    onClear,
    className = '',
  },
  ref
) {
  const innerCanvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSigned, setHasSigned] = useState(false);

  const hasSignedRef = useRef(false);
  const onChangeRef = useRef(onChange);
  const onClearRef = useRef(onClear);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    onClearRef.current = onClear;
  }, [onClear]);

  // Sincronización inicial
  useEffect(() => {
    if (initialUrl && !hasSignedRef.current) {
      hasSignedRef.current = true;
      setHasSigned(true);
    }
  }, [initialUrl]);

  // Exponer el nodo canvas interno y helper de limpieza a través del ref pasado por el padre
  useImperativeHandle(ref, () => ({
    get canvas() {
      return innerCanvasRef.current;
    },
    get current() {
      return innerCanvasRef.current;
    },
    clear: () => {
      handleClear();
    },
    hasSigned: () => hasSignedRef.current || Boolean(initialUrl),
    toBlob: (callback, type, quality) => {
      if (innerCanvasRef.current) {
        innerCanvasRef.current.toBlob(callback, type, quality);
      }
    },
    toDataURL: (type, encoderOptions) => {
      return innerCanvasRef.current ? innerCanvasRef.current.toDataURL(type, encoderOptions) : '';
    }
  }));

  // Obtener coordenadas proporcionales de mouse/touch eliminando desfases de escalado CSS
  const getCanvasPos = useCallback((e) => {
    const canvas = innerCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    let clientX = e.clientX;
    let clientY = e.clientY;

    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    }

    const x = ((clientX - rect.left) / rect.width) * canvas.width;
    const y = ((clientY - rect.top) / rect.height) * canvas.height;
    return { x, y };
  }, []);

  // Configuración de lienzo y dibujo ininterrumpido sin desmontado de listeners
  useEffect(() => {
    const canvas = innerCanvasRef.current;
    if (!canvas || disabled) return;

    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    let drawing = false;

    const startDrawing = (e) => {
      if (disabled) return;
      drawing = true;
      setIsDrawing(true);
      const pos = getCanvasPos(e);
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
      if (e.cancelable && e.type && e.type.startsWith('touch')) {
        e.preventDefault();
      }
    };

    const draw = (e) => {
      if (!drawing || disabled) return;
      const pos = getCanvasPos(e);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();

      if (!hasSignedRef.current) {
        hasSignedRef.current = true;
        setHasSigned(true);
        if (onChangeRef.current) onChangeRef.current(true);
      }
      if (e.cancelable && e.type && e.type.startsWith('touch')) {
        e.preventDefault();
      }
    };

    const stopDrawing = () => {
      if (drawing) {
        drawing = false;
        setIsDrawing(false);
      }
    };

    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseleave', stopDrawing);

    canvas.addEventListener('touchstart', startDrawing, { passive: false });
    canvas.addEventListener('touchmove', draw, { passive: false });
    canvas.addEventListener('touchend', stopDrawing);

    return () => {
      canvas.removeEventListener('mousedown', startDrawing);
      canvas.removeEventListener('mousemove', draw);
      canvas.removeEventListener('mouseup', stopDrawing);
      canvas.removeEventListener('mouseleave', stopDrawing);

      canvas.removeEventListener('touchstart', startDrawing);
      canvas.removeEventListener('touchmove', draw);
      canvas.removeEventListener('touchend', stopDrawing);
    };
  }, [disabled, getCanvasPos]);

  // Limpiar trazo del canvas y rehabilitar pad
  const handleClear = () => {
    const canvas = innerCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    hasSignedRef.current = false;
    setHasSigned(false);
    if (onChangeRef.current) onChangeRef.current(false);
    if (onClearRef.current) onClearRef.current();
  };

  return (
    <div className={cn('flex flex-col gap-1.5 w-full', className)}>
      {label && (
        <div className="flex items-center justify-between flex-wrap gap-1">
          <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 uppercase tracking-wider select-none">
            <PenTool className="h-3.5 w-3.5 text-[#468DFF]" />
            <span>{label}</span>
            {required && <span className="text-[#468DFF] font-bold">*</span>}
          </label>

          {(hasSigned || Boolean(initialUrl)) && (
            <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 shadow-xs">
              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
              <span>Firma Registrada</span>
            </div>
          )}
        </div>
      )}

      <div className="relative w-full rounded-xl overflow-hidden border border-slate-300 bg-white shadow-sm transition-all focus-within:ring-2 focus-within:ring-[#468DFF]/20 focus-within:border-[#468DFF]">
        {/* Renderizado de Firma Previa cargada como URL si no se ha comenzado a trazar */}
        {initialUrl && !hasSigned && (
          <div className="absolute inset-0 flex items-center justify-center p-2 bg-white/90 z-10 pointer-events-none">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={initialUrl}
              alt="Firma registrada"
              className="max-h-full max-w-full object-contain"
            />
          </div>
        )}

        <canvas
          ref={innerCanvasRef}
          width={width}
          height={height}
          className={cn(
            'w-full touch-none select-none',
            disabled ? 'bg-slate-50 cursor-not-allowed opacity-70' : 'cursor-crosshair bg-white'
          )}
          style={{ height: `${height}px` }}
        />

        {!disabled && (
          <div className="absolute bottom-2 right-2 z-20">
            <button
              type="button"
              onClick={handleClear}
              className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white/90 hover:bg-white border border-slate-200 rounded-lg shadow-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
              title="Limpiar trazo de firma"
            >
              <RotateCcw className="h-3 w-3 text-slate-500" />
              <span>Limpiar</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
});

export default AppSignatureCanvas;
