// src/components/providers/ToastProvider.js
'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { Check, AlertTriangle, Loader2, X, AlertOctagon } from 'lucide-react';

const ToastContext = createContext(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast debe usarse dentro de un ToastProvider');
  }
  return context;
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((message, type = 'success', duration = null) => {
    const id = Math.random().toString(36).substring(2, 9);
    
    let finalDuration = duration;
    if (!finalDuration) {
      if (type === 'success') finalDuration = 4000;
      else if (type === 'error' || type === 'warning') finalDuration = 6000;
      else finalDuration = 4000; // fallback info
    }

    setToasts((prev) => [...prev, { id, message, type }]);

    // Todos los toasts se auto-cierran por defecto a menos que se especifique una duración de 0.
    if (duration !== 0) {
      setTimeout(() => {
        removeToast(id);
      }, finalDuration);
    }

    return id; // Retorna ID para dismiss manual
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ toast, removeToast }}>
      {children}
      {/* Toast wrapper container */}
      <div 
        className="fixed bottom-4 left-1/2 -translate-x-1/2 md:bottom-6 md:right-6 md:left-auto md:translate-x-0 z-[70] flex flex-col gap-2 max-w-[90vw] sm:max-w-sm w-full pointer-events-none max-h-[80vh] overflow-y-auto"
        role="log"
        aria-label="Notificaciones del sistema"
      >
        {toasts.map((t) => {
          let bgClass = 'bg-green-50 border-green-200 text-green-800';
          let iconBg = 'bg-[#00b050] text-white';
          let Icon = Check;

          if (t.type === 'error') {
            bgClass = 'bg-red-50 border-red-200 text-red-800';
            iconBg = 'bg-red-500 text-white';
            Icon = AlertTriangle;
          } else if (t.type === 'warning') {
            bgClass = 'bg-amber-50 border-amber-200 text-amber-800';
            iconBg = 'bg-amber-500 text-white';
            Icon = AlertOctagon;
          } else if (t.type === 'info') {
            bgClass = 'bg-blue-50 border-blue-200 text-blue-800';
            iconBg = 'bg-[#468DFF] text-white';
            Icon = Loader2;
          }

          return (
            <div
              key={t.id}
              role="alert"
              aria-live="assertive"
              className={`pointer-events-auto px-4 py-3 rounded-xl shadow-xl flex items-center justify-between gap-3 border animate-fade-in ${bgClass}`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${iconBg}`}>
                  {t.type === 'info' ? (
                    <Icon className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Icon className="h-3.5 w-3.5" />
                  )}
                </div>
                <span className="text-xs font-semibold leading-normal">{t.message}</span>
              </div>
              <button
                type="button"
                onClick={() => removeToast(t.id)}
                className="p-1 rounded-lg hover:bg-black/5 text-slate-400 hover:text-slate-700 transition-colors shrink-0"
                aria-label="Cerrar notificación"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};
