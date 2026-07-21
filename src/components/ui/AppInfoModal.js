// src/components/ui/AppInfoModal.js
'use client';

import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AppInfoModal({
  isOpen,
  onClose,
  title,
  subtitle,
  icon: Icon = HelpCircle,
  maxWidth = 'max-w-2xl',
  children,
  closeButtonText = 'Cerrar'
}) {
  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm animate-fade-in" />
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <Dialog.Content
            className={cn(
              'relative w-full bg-white border border-slate-200 rounded-2xl shadow-2xl animate-scale-up focus:outline-none overflow-hidden my-8 flex flex-col max-h-[85vh]',
              maxWidth
            )}
          >
            {/* Cabecera Estándar del Modal Explicativo */}
            <div className="h-16 px-6 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3 min-w-0 pr-4">
                <div className="p-2 bg-[#468DFF]/20 text-[#468DFF] rounded-xl border border-[#468DFF]/30 shrink-0">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <Dialog.Title className="font-outfit text-base font-extrabold leading-none text-white truncate">
                    {title}
                  </Dialog.Title>
                  {subtitle && (
                    <p className="text-[11px] text-slate-300 font-medium mt-1 truncate">
                      {subtitle}
                    </p>
                  )}
                </div>
              </div>
              <Dialog.Close asChild>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
                  aria-label="Cerrar modal"
                >
                  <X className="h-5 w-5" />
                </button>
              </Dialog.Close>
            </div>

            {/* Cuerpo del Modal con Scrollbar Personalizada */}
            <div className="p-6 space-y-5 overflow-y-auto text-xs text-slate-600 leading-relaxed scrollbar-thin flex-1">
              {children}
            </div>

            {/* Pie de Página del Modal */}
            <div className="h-16 px-6 bg-slate-50 border-t border-slate-200 flex items-center justify-end shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 bg-[#468DFF] hover:bg-[#0511F2] text-white rounded-xl text-xs font-bold transition-all active:scale-[0.98] cursor-pointer shadow-md shadow-[#468DFF]/20"
              >
                {closeButtonText}
              </button>
            </div>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
