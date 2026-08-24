// src/components/ui/AppConfirmDialog.js
'use client';

import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { AlertTriangle, HelpCircle, Info, X } from 'lucide-react';
import AppButton from './AppButton';

export default function AppConfirmDialog({
  open,
  isOpen,
  onOpenChange,
  onCancel,
  onClose,
  title,
  description,
  message,
  type,
  variant = 'info',
  onConfirm,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar'
}) {
  const isActuallyOpen = open !== undefined ? open : (isOpen || false);
  const effectiveDescription = description || message;
  const effectiveType = type || (variant === 'danger' ? 'destructive' : variant) || 'info';

  let Icon = HelpCircle;
  let iconBg = 'bg-blue-50 text-[#468DFF] border-blue-100';
  let confirmVariant = 'primary';

  if (effectiveType === 'destructive' || effectiveType === 'danger') {
    Icon = AlertTriangle;
    iconBg = 'bg-red-50 text-red-600 border-red-100';
    confirmVariant = 'destructive';
  } else if (effectiveType === 'warning') {
    Icon = AlertTriangle;
    iconBg = 'bg-amber-50 text-amber-600 border-amber-100';
    confirmVariant = 'amber';
  } else if (effectiveType === 'info') {
    Icon = Info;
    iconBg = 'bg-blue-50 text-[#468DFF] border-blue-100';
    confirmVariant = 'primary';
  }

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
    <Dialog.Root open={isActuallyOpen} onOpenChange={handleOpenChange}>
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
                className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#468DFF] cursor-pointer"
                aria-label="Cerrar"
              >
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>

            {/* Icon header */}
            <div className={`mx-auto p-3 rounded-full w-12 h-12 flex items-center justify-center border ${iconBg}`}>
              <Icon className="h-6 w-6 shrink-0" />
            </div>

            {/* Texts */}
            <div className="space-y-1">
              <Dialog.Title className="font-outfit text-base font-extrabold text-slate-800">
                {title}
              </Dialog.Title>
              {effectiveDescription && (
                <Dialog.Description className="text-xs text-slate-500 leading-relaxed">
                  {effectiveDescription}
                </Dialog.Description>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 pt-2">
              <Dialog.Close asChild>
                <AppButton
                  type="button"
                  variant="outline"
                  size="md"
                  className="flex-1"
                  onClick={handleClose}
                >
                  {cancelText}
                </AppButton>
              </Dialog.Close>

              {onConfirm && (
                <AppButton
                  type="button"
                  variant={confirmVariant}
                  size="md"
                  className="flex-1"
                  onClick={() => {
                    onConfirm();
                    handleClose();
                  }}
                >
                  {confirmText}
                </AppButton>
              )}
            </div>
            
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
