// src/components/ui/PdfSlideViewer.js
'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';

/**
 * PdfSlideViewer
 * Renderiza una sola pagina del PDF en un canvas a la vez.
 * Sin scroll continuo, exactamente como PowerPoint en modo presentacion.
 *
 * Props:
 *  - url: string — URL publica o firmada del PDF
 *  - currentPage: number — Pagina activa (1-indexed), controlado por el padre
 *  - onTotalPages: (n: number) => void — Callback cuando se conoce el total de paginas
 */
export default function PdfSlideViewer({ url, currentPage = 1, onTotalPages }) {
  const canvasRef = useRef(null);
  const [loadingPdf, setLoadingPdf] = useState(true);
  const [errorPdf, setErrorPdf] = useState(null);
  const [pdfDocRef, setPdfDocRef] = useState(null);
  const [renderingPage, setRenderingPage] = useState(false);
  const currentRenderTask = useRef(null);

  // Cargar el PDF al montar o cuando cambia la URL
  useEffect(() => {
    if (!url) return;

    let cancelled = false;
    setLoadingPdf(true);
    setErrorPdf(null);
    setPdfDocRef(null);

    const loadPdf = async () => {
      try {
        // Importar pdfjs-dist dinamicamente para no incrementar el bundle size de otras rutas
        const pdfjsLib = await import('pdfjs-dist');

        // Worker servido desde /public/ (mismo origen) para evitar violaciones de CSP
        // El archivo fue copiado de node_modules/pdfjs-dist/build/pdf.worker.min.mjs a public/
        if (typeof window !== 'undefined') {
          pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
        }

        const loadingTask = pdfjsLib.getDocument({
          url,
        });

        const pdf = await loadingTask.promise;

        if (cancelled) return;

        setPdfDocRef(pdf);
        if (onTotalPages) onTotalPages(pdf.numPages);
        setLoadingPdf(false);
      } catch (err) {
        if (cancelled) return;
        console.error('[PdfSlideViewer] Error al cargar PDF:', err);
        setErrorPdf(
          'No se pudo cargar el documento. Asegurese de que el archivo sea accesible publicamente o use un enlace de Google Drive/Slides.'
        );
        setLoadingPdf(false);
      }
    };

    loadPdf();
    return () => { cancelled = true; };
  }, [url, onTotalPages]);

  // Renderizar la pagina activa en el canvas cuando cambia currentPage o pdfDocRef
  const renderPage = useCallback(async (pdf, pageNumber) => {
    if (!pdf || !canvasRef.current) return;

    // Cancelar cualquier render previo en curso para evitar conflictos
    if (currentRenderTask.current) {
      try { currentRenderTask.current.cancel(); } catch (_) {}
      currentRenderTask.current = null;
    }

    setRenderingPage(true);

    try {
      const clampedPage = Math.max(1, Math.min(pageNumber, pdf.numPages));
      const page = await pdf.getPage(clampedPage);
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');

      // Calcular el viewport para que llene el contenedor del canvas manteniendo proporciones
      const containerWidth = canvas.parentElement?.clientWidth || 800;
      const viewport = page.getViewport({ scale: 1 });
      const scale = containerWidth / viewport.width;
      const scaledViewport = page.getViewport({ scale });

      canvas.width = Math.floor(scaledViewport.width);
      canvas.height = Math.floor(scaledViewport.height);

      const renderTask = page.render({
        canvasContext: ctx,
        viewport: scaledViewport,
      });

      currentRenderTask.current = renderTask;
      await renderTask.promise;
      currentRenderTask.current = null;
    } catch (err) {
      if (err?.name !== 'RenderingCancelledException') {
        console.error('[PdfSlideViewer] Error al renderizar pagina:', err);
      }
    } finally {
      setRenderingPage(false);
    }
  }, []);

  useEffect(() => {
    if (pdfDocRef) {
      renderPage(pdfDocRef, currentPage);
    }
  }, [pdfDocRef, currentPage, renderPage]);

  if (loadingPdf) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 gap-3 min-h-[300px]">
        <Loader2 className="w-8 h-8 animate-spin text-[#468DFF]" />
        <p className="text-xs font-semibold text-slate-300">Cargando presentacion PDF...</p>
      </div>
    );
  }

  if (errorPdf) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 gap-3 p-6 min-h-[300px] text-center">
        <AlertCircle className="w-8 h-8 text-red-400" />
        <p className="text-xs font-semibold text-red-300 max-w-xs">{errorPdf}</p>
      </div>
    );
  }

  return (
    <div className="relative w-full bg-slate-950 flex items-center justify-center overflow-hidden">
      {renderingPage && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950/60 z-10">
          <Loader2 className="w-5 h-5 animate-spin text-[#468DFF]" />
        </div>
      )}
      <canvas
        ref={canvasRef}
        className="block w-full h-auto"
        style={{ display: 'block', maxHeight: '80vh', objectFit: 'contain' }}
      />
    </div>
  );
}
