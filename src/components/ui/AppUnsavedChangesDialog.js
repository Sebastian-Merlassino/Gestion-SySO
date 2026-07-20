// src/components/ui/AppUnsavedChangesDialog.js
'use client';

import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { AlertTriangle, X } from 'lucide-react';

export default function AppUnsavedChangesDialog({
  open,
  onOpenChange,
  title = 'Cambios sin guardar',
  description = 'Tenés cambios sin guardar en el formulario. Si salís ahora, perderás toda la información ingresada.',
  onLeave,
  leaveText = 'Salir sin guardar',
  stayText = 'Quedarse y editar'
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        {/* Backdrop overlay */}
        <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm animate-fade-in" />
        
        {/* Modal content container */}
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <Dialog.Content 
            onPointerDownOutside={(e) => e.preventDefault()}
            onInteractOutside={(e) => e.preventDefault()}
            className="relative w-full max-w-sm p-6 bg-white border border-slate-200 rounded-2xl shadow-2xl animate-scale-up focus:outline-none space-y-4 text-center"
          >
            
            {/* Close button at top right */}
            <Dialog.Close asChild>
              <button 
                className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#468DFF]"
                aria-label="Cerrar"
              >
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>

            {/* Amber AlertTriangle icon */}
            <div className="mx-auto p-3 rounded-full w-12 h-12 flex items-center justify-center border bg-amber-50 text-amber-500 border-amber-100">
              <AlertTriangle className="h-6 w-6 shrink-0" />
            </div>

            {/* Texts */}
            <div className="space-y-1">
              <Dialog.Title className="font-outfit text-base font-extrabold text-slate-800">
                {title}
              </Dialog.Title>
              <Dialog.Description className="text-xs text-slate-500 leading-relaxed">
                {description}
              </Dialog.Description>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              {/* Secondary button: Salir sin guardar */}
              {onLeave && (
                <button
                  type="button"
                  onClick={() => {
                    onLeave();
                    onOpenChange(false);
                  }}
                  className="flex-1 py-2.5 px-4 border border-[#468DFF] text-[#468DFF] bg-white rounded-xl text-xs font-bold hover:bg-[#468DFF] hover:text-white transition-all active:scale-[0.98] cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#468DFF]"
                >
                  {leaveText}
                </button>
              )}

              {/* Primary button: Quedarse y editar */}
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="flex-1 py-2.5 px-4 bg-[#468DFF] hover:bg-[#0511F2] text-white rounded-xl text-xs font-bold transition-all active:scale-[0.98] cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#468DFF] shadow-lg shadow-blue-500/10"
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
