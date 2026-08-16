// src/components/ui/AppUnsavedChangesDialog.js
'use client';

import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { AlertTriangle, X } from 'lucide-react';

export default function AppUnsavedChangesDialog({
  open,
  onOpenChange,
  onCancel,
  title = 'Cambios sin guardar',
  description = 'Tenés cambios sin guardar en el formulario. Si salís ahora, perderás toda la información ingresada.',
  onLeave,
  onConfirm,
  leaveText = 'Salir sin guardar',
  stayText = 'Quedarse y editar'
}) {
  const handleLeave = onLeave || onConfirm;
  const handleOpenChange = onOpenChange || (onCancel ? (val) => !val && onCancel() : () => {});

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        {/* Backdrop overlay */}
        <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm animate-fade-in" />
        
        {/* Modal content container */}
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <Dialog.Content 
            onPointerDownOutside={(e) => e.preventDefault()}
            onInteractOutside={(e) => e.preventDefault()}
            className="relative w-full max-w-sm p-6 bg-white border border-slate-200 rounded-2xl shadow-2xl animate-scale-up focus:outline-none flex flex-col items-center text-center"
          >
            
            {/* Close button at top right (matching standard AppConfirmDialog and ruido) */}
            <Dialog.Close asChild>
              <button 
                onClick={() => {
                  if (onCancel) onCancel();
                }}
                className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#468DFF]"
                aria-label="Cerrar"
              >
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>

            {/* Amber AlertTriangle circular icon */}
            <div className="mx-auto p-3 rounded-full w-12 h-12 flex items-center justify-center border bg-amber-50 text-amber-500 border-amber-100 mb-3 mt-1">
              <AlertTriangle className="h-6 w-6 shrink-0" />
            </div>

            {/* Title & Description */}
            <Dialog.Title className="font-outfit text-base font-extrabold text-slate-800 mb-1">
              {title}
            </Dialog.Title>
            {description && (
              <Dialog.Description className="text-xs text-slate-500 leading-relaxed mb-5 max-w-[280px]">
                {description}
              </Dialog.Description>
            )}

            {/* Action buttons (vertical stack matching reference image) */}
            <div className="flex flex-col gap-2.5 w-full">
              {/* Secondary button: Salir sin guardar */}
              {handleLeave && (
                <button
                  type="button"
                  onClick={() => {
                    handleLeave();
                    if (onOpenChange) onOpenChange(false);
                    if (onCancel) onCancel();
                  }}
                  className="w-full py-2.5 px-4 bg-white text-[#468DFF] border border-[#468DFF] rounded-xl text-xs font-bold hover:bg-[#468DFF] hover:text-white transition-all active:scale-[0.99] cursor-pointer"
                >
                  {leaveText}
                </button>
              )}

              {/* Primary button: Quedarse y editar */}
              <Dialog.Close asChild>
                <button
                  type="button"
                  onClick={() => {
                    if (onCancel) onCancel();
                  }}
                  className="w-full py-2.5 px-4 bg-[#468DFF] hover:bg-[#0511F2] text-white rounded-xl text-xs font-bold transition-all active:scale-[0.99] cursor-pointer shadow-md shadow-[#468DFF]/20"
                >
                  {stayText}
                </button>
              </Dialog.Close>
            </div>
            
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
