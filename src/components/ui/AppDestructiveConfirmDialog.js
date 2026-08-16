// src/components/ui/AppDestructiveConfirmDialog.js
'use client';

import React, { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { AlertTriangle, X } from 'lucide-react';

export default function AppDestructiveConfirmDialog({
  open,
  onOpenChange,
  onCancel,
  onClose,
  title,
  description,
  requiredText = 'ELIMINAR',
  onConfirm,
  confirmText = 'Eliminar',
  cancelText = 'Cancelar',
  placeholder = 'Escribí aquí...'
}) {
  const [inputText, setInputText] = useState('');

  // Limpiar input al abrir/cerrar
  useEffect(() => {
    if (!open) {
      setInputText('');
    }
  }, [open]);

  const isConfirmed = inputText === requiredText;

  const handleClose = () => {
    if (onOpenChange) onOpenChange(false);
    if (onCancel) onCancel();
    if (onClose) onClose();
  };

  const handleOpenChange = (isOpen) => {
    if (onOpenChange) onOpenChange(isOpen);
    if (!isOpen) {
      if (onCancel) onCancel();
      if (onClose) onClose();
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        {/* Backdrop overlay */}
        <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm animate-fade-in" />
        
        {/* Modal content container */}
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <Dialog.Content 
            onPointerDownOutside={(e) => {
              e.preventDefault();
              handleClose();
            }}
            onInteractOutside={(e) => {
              e.preventDefault();
              handleClose();
            }}
            className="relative w-full max-w-sm p-6 bg-white border border-slate-200 rounded-2xl shadow-2xl animate-scale-up focus:outline-none space-y-4 text-center"
          >
            
            {/* Close button at top right */}
            <Dialog.Close asChild>
              <button 
                type="button"
                onClick={handleClose}
                className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500 cursor-pointer"
                aria-label="Cerrar"
              >
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>

            {/* Red AlertTriangle icon */}
            <div className="mx-auto p-3 rounded-full w-12 h-12 flex items-center justify-center border bg-red-50 text-red-600 border-red-100">
              <AlertTriangle className="h-6 w-6 shrink-0" />
            </div>

            {/* Texts */}
            <div className="space-y-1">
              <Dialog.Title className="font-outfit text-base font-extrabold text-slate-800">
                {title}
              </Dialog.Title>
              {description && (
                <Dialog.Description className="text-xs text-slate-500 leading-relaxed">
                  {description}
                </Dialog.Description>
              )}
            </div>

            {/* Text confirmation prompt input */}
            <div className="space-y-2 text-left pt-2">
              <label htmlFor="confirm-phrase-input" className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                Para confirmar la eliminación definitiva, escribí <span className="text-red-600 font-extrabold font-mono">"{requiredText}"</span> en mayúsculas:
              </label>
              <input
                id="confirm-phrase-input"
                type="text"
                autoComplete="off"
                placeholder={placeholder}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="w-full border border-slate-250 rounded-xl px-3 py-2.5 text-xs text-slate-800 text-center font-bold font-mono focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 pt-2">
              <Dialog.Close asChild>
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 py-2.5 px-4 border border-slate-350 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all active:scale-[0.98] cursor-pointer focus:outline-none focus:ring-2 focus:ring-slate-400"
                >
                  {cancelText}
                </button>
              </Dialog.Close>

              {onConfirm && (
                <button
                  type="button"
                  disabled={!isConfirmed}
                  onClick={() => {
                    onConfirm();
                    handleClose();
                  }}
                  className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all active:scale-[0.98] shadow-md ${
                    isConfirmed
                      ? 'bg-red-600 hover:bg-red-700 text-white shadow-red-600/20 cursor-pointer'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                  }`}
                >
                  {confirmText}
                </button>
              )}
            </div>
            
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
