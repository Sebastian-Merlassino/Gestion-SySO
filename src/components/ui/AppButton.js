// src/components/ui/AppButton.js
import React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export default function AppButton({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  className = '',
  type = 'button',
  ...props
}) {
  const baseClasses = 'inline-flex items-center justify-center rounded-xl font-bold transition-all duration-200 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 select-none focus:outline-none focus:ring-2 focus:ring-[#468DFF]/30 focus:ring-offset-1 cursor-pointer';
  
  const variants = {
    // Variantes Generales de Botonera / Formulario
    primary: 'bg-[#468DFF] text-white border border-[#468DFF] hover:bg-[#0511F2] hover:border-[#0511F2] shadow-md shadow-blue-500/10 hover:shadow-blue-500/20',
    secondary: 'bg-white text-[#468DFF] border border-[#468DFF] hover:bg-[#468DFF] hover:text-white hover:border-[#468DFF]',
    outline: 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:text-slate-900',
    ghost: 'bg-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-800 border border-transparent',
    destructive: 'bg-red-500 text-white border border-red-500 hover:bg-red-600 hover:border-red-600 shadow-md shadow-red-500/10',
    amber: 'bg-amber-500 text-white border border-amber-500 hover:bg-amber-600 hover:border-amber-600 shadow-md shadow-amber-500/10',
    success: 'bg-emerald-600 text-white border border-emerald-600 hover:bg-emerald-700 hover:border-emerald-700 shadow-md shadow-emerald-500/10',
    
    // Variantes para Paneles de Filtros
    'filter-primary': 'bg-[#468DFF] text-white border border-[#468DFF] rounded-xl text-xs font-bold shadow-md shadow-[#468DFF]/10 hover:bg-[#0511F2] hover:border-[#0511F2] shrink-0',
    'filter-secondary': 'bg-white text-[#468DFF] border border-[#468DFF] rounded-xl text-xs font-bold hover:bg-[#468DFF] hover:text-white shrink-0',

    // Acciones de Tabla Unificadas (Iconos de Tabla)
    'document-table': 'p-1.5 rounded-lg bg-blue-50 text-[#468DFF] hover:bg-blue-100 hover:text-[#0511F2] transition-colors border border-blue-200/50 shadow-xs',
    'edit-table': 'p-1.5 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 hover:text-amber-800 transition-colors border border-amber-200/50 shadow-xs',
    'delete-table': 'p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-800 transition-colors border border-red-200/50 shadow-xs',
    'success-table': 'p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-800 transition-colors border border-emerald-200/50 shadow-xs',
    'ghost-table': 'p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-800 transition-colors border border-slate-200/50 shadow-xs',
  };

  const sizes = {
    xs: 'h-7 px-2.5 text-[11px] gap-1',
    sm: 'h-8 px-3 text-xs gap-1.5',
    md: 'h-10 px-4 sm:px-5 text-xs sm:text-sm gap-2',
    lg: 'h-11 sm:h-12 px-6 sm:px-8 text-sm sm:text-base gap-2.5',
    icon: 'h-9 w-9 sm:h-8 sm:w-8 p-1.5 text-xs flex items-center justify-center shrink-0',
    'icon-sm': 'h-8 w-8 sm:h-7 sm:w-7 p-1 text-xs flex items-center justify-center shrink-0',
  };

  const selectedVariant = variants[variant] || variants.primary;
  const selectedSize = sizes[size] || sizes.md;

  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cn(baseClasses, selectedVariant, selectedSize, className)}
      {...props}
    >
      {loading && (
        <Loader2 className="h-4 w-4 animate-spin shrink-0 mr-1.5" />
      )}
      {children}
    </button>
  );
}

