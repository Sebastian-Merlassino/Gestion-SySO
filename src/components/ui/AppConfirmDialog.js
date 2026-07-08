// src/components/ui/AppConfirmDialog.js
'use client';

import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { AlertTriangle, HelpCircle, Info, X } from 'lucide-react';
import Button from './button';

export default function AppConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  type = 'info', // 'info' | 'warning' | 'destructive'
  onConfirm,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar'
}) {
  let Icon = HelpCircle;
  let iconBg = 'bg-blue-50 text-[#468DFF] border-blue-100';
  let confirmVariant = 'default';

  if (type === 'destructive') {
    Icon = AlertTriangle;
    iconBg = 'bg-red-50 text-red-600 border-red-100';
    confirmVariant = 'destructive';
  } else if (type === 'warning') {
    Icon = AlertTriangle;
    iconBg = 'bg-amber-50 text-amber-600 border-amber-100';
  } else if (type === 'info') {
    Icon = Info;
    iconBg = 'bg-blue-50 text-[#468DFF] border-blue-100';
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        {/* Backdrop overlay */}
        <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm animate-fade-in" />
        
        {/* Modal content container */}
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <Dialog.Content className="relative w-full max-w-sm p-6 bg-white border border-slate-200 rounded-2xl shadow-2xl animate-scale-up focus:outline-none space-y-4 text-center">
            
            {/* Close button at top right */}
            <Dialog.Close asChild>
              <button 
                className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#468DFF]"
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
              {description && (
                <Dialog.Description className="text-xs text-slate-500 leading-relaxed">
                  {description}
                </Dialog.Description>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 pt-2">
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="flex-1 py-2.5 px-4 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all active:scale-[0.98] cursor-pointer focus:outline-none focus:ring-2 focus:ring-slate-400"
                >
                  {cancelText}
                </button>
              </Dialog.Close>

              {onConfirm && (
                <button
                  type="button"
                  onClick={() => {
                    onConfirm();
                    onOpenChange(false);
                  }}
                  className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all active:scale-[0.98] cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                    confirmVariant === 'destructive'
                      ? 'bg-red-500 hover:bg-red-650 text-white shadow-lg shadow-red-500/10 focus:ring-red-500'
                      : 'bg-[#468DFF] hover:bg-[#0511F2] text-white shadow-lg shadow-blue-500/10 focus:ring-[#468DFF]'
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
