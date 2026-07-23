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
  const baseClasses = 'inline-flex items-center justify-center rounded-xl font-bold transition-all duration-200 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 select-none focus:outline-none focus:ring-2 focus:ring-[#468DFF]/30 focus:ring-offset-1';
  
  const variants = {
    primary: 'bg-[#468DFF] text-white border border-[#468DFF] hover:bg-[#0511F2] hover:border-[#0511F2] shadow-md shadow-blue-500/10 hover:shadow-blue-500/20',
    secondary: 'bg-white text-[#468DFF] border border-[#468DFF] hover:bg-[#468DFF] hover:text-white hover:border-[#468DFF]',
    outline: 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:text-slate-900',
    ghost: 'bg-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-800 border border-transparent',
    destructive: 'bg-red-500 text-white border border-red-500 hover:bg-red-600 hover:border-red-600 shadow-md shadow-red-500/10',
    
    // Acciones rápidas de tabla
    'edit-table': 'p-1.5 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 hover:text-amber-800 transition-colors border border-amber-200/40 shadow-sm',
    'delete-table': 'p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-800 transition-colors border border-red-200/40 shadow-sm',
    'document-table': 'p-1.5 rounded-lg bg-blue-50 text-[#468DFF] hover:bg-blue-100 hover:text-[#0511F2] transition-colors border border-blue-200/40 shadow-sm',
  };

  const sizes = {
    sm: 'h-8 px-3 text-xs',
    md: 'h-10 px-5 text-sm',
    lg: 'h-11 px-8 text-base',
    icon: 'p-1.5 text-xs',
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
