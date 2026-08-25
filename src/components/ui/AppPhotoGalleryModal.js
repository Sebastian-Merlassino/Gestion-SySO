'use client';

import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, ExternalLink, Image as ImageIcon, FileText } from 'lucide-react';
import AppButton from './AppButton';

/**
 * AppPhotoGalleryModal - Modal universal para previsualizar evidencias fotográficas y adjuntos
 * 
 * @param {boolean} open - Estado de apertura
 * @param {function} onOpenChange - Handler para cambiar estado
 * @param {string} title - Título del modal (ej: "Registros de visita")
 * @param {string} subtitle - Subtítulo descriptivo
 * @param {Array<string|{url: string, title?: string}>} photos - Lista de URLs o items de foto
 * @param {string} currentPhoto - Foto individual en caso de visualizador simple
 */
export default function AppPhotoGalleryModal({
  open,
  onOpenChange,
  title = 'Registro fotográfico',
  subtitle,
  photos = [],
  currentPhoto = null,
}) {
  const photoList = currentPhoto ? [currentPhoto] : (Array.isArray(photos) ? photos : []);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm animate-fade-in" />
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <Dialog.Content 
            className="bg-white rounded-2xl md:rounded-3xl border border-slate-200 p-5 sm:p-6 max-w-4xl w-full z-10 shadow-2xl relative space-y-4 animate-scale-up flex flex-col max-h-[88vh] focus:outline-none"
            aria-describedby={subtitle ? 'photo-gallery-description' : undefined}
          >
            {/* Header */}
            <div className="flex justify-between items-center shrink-0 border-b border-slate-100 pb-3 pr-8">
              <div>
                <Dialog.Title className="font-outfit text-base sm:text-lg font-bold text-slate-900">
                  {title}
                </Dialog.Title>
                {subtitle && (
                  <Dialog.Description id="photo-gallery-description" className="text-xs text-slate-500 font-semibold mt-0.5">
                    {subtitle}
                  </Dialog.Description>
                )}
              </div>
              <Dialog.Close asChild>
                <button 
                  type="button" 
                  className="absolute top-4 right-4 p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors border border-slate-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#468DFF]"
                  aria-label="Cerrar"
                >
                  <X className="h-4 w-4" />
                </button>
              </Dialog.Close>
            </div>

            {/* Photo List / Grid */}
            <div className="flex-1 overflow-y-auto min-h-0 py-2 scrollbar-thin">
              {photoList.length === 0 ? (
                <div className="text-center py-16 text-slate-400 flex flex-col items-center justify-center gap-2">
                  <ImageIcon className="h-10 w-10 text-slate-300" />
                  <p className="text-xs font-semibold">No hay archivos o imágenes disponibles</p>
                </div>
              ) : photoList.length === 1 && !((typeof photoList[0] === 'string' ? photoList[0] : photoList[0]?.url)?.toLowerCase().includes('.pdf') || (typeof photoList[0] === 'string' ? photoList[0] : photoList[0]?.url)?.includes('drive.google.com')) ? (
                <div className="flex items-center justify-center h-full max-h-[60vh] bg-slate-950/5 rounded-2xl border border-slate-200 p-2 overflow-hidden">
                  <img
                    src={typeof photoList[0] === 'string' ? photoList[0] : photoList[0]?.url}
                    alt={title}
                    className="max-h-[58vh] max-w-full object-contain rounded-xl shadow-sm"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {photoList.map((item, i) => {
                    const url = typeof item === 'string' ? item : item?.url;
                    const itemTitle = typeof item === 'object' && item?.title ? item.title : `Registro #${i + 1}`;
                    const urlLower = (url || '').toLowerCase();
                    const isPdf = urlLower.includes('.pdf') || urlLower.includes('pdf') || (url || '').includes('/documents/');
                    const isDrive = urlLower.includes('drive.google.com') || ((url || '').startsWith('http') && !isPdf && !urlLower.match(/\.(jpeg|jpg|gif|png|webp)/i));

                    if (isPdf) {
                      return (
                        <div key={i} className="relative group rounded-xl border border-slate-200 bg-slate-50/50 p-4 flex flex-col items-center justify-center text-center shadow-sm aspect-video gap-2">
                          <FileText className="h-10 w-10 text-red-500" />
                          <span className="text-xs font-bold text-slate-700 truncate max-w-full">{itemTitle !== `Registro #${i + 1}` ? itemTitle : 'Documento PDF'}</span>
                          <a 
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1 py-1.5 px-3 bg-[#468DFF]/15 hover:bg-[#468DFF]/25 text-[#468DFF] rounded-lg text-xs font-bold transition-all flex items-center gap-1.5"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            Abrir PDF
                          </a>
                        </div>
                      );
                    }

                    if (isDrive) {
                      return (
                        <div key={i} className="relative group rounded-xl border border-slate-200 bg-slate-50/50 p-4 flex flex-col items-center justify-center text-center shadow-sm aspect-video gap-2">
                          <ExternalLink className="h-10 w-10 text-[#468DFF]" />
                          <span className="text-xs font-bold text-slate-700">Google Drive compartido</span>
                          <a 
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1 py-1.5 px-3 bg-[#468DFF] hover:bg-[#0511F2] text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            Ir a Drive
                          </a>
                        </div>
                      );
                    }

                    return (
                      <div key={i} className="group border border-slate-200 rounded-xl overflow-hidden shadow-sm aspect-video bg-slate-900/5 relative flex items-center justify-center">
                        <img 
                          src={url} 
                          alt={itemTitle} 
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-90 transition-opacity flex items-end justify-between p-2.5">
                          <span className="text-white text-[11px] font-bold truncate max-w-[70%]">
                            {itemTitle}
                          </span>
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 rounded-md bg-white/20 hover:bg-white/30 text-white transition-colors"
                            title="Abrir en pestaña nueva"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end pt-2 border-t border-slate-100 shrink-0">
              <Dialog.Close asChild>
                <AppButton variant="secondary" size="md">
                  Cerrar
                </AppButton>
              </Dialog.Close>
            </div>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
