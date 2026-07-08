// src/components/ui/AppInput.js
import React from 'react';
import { cn } from '@/lib/utils';
import AppLabel from './AppLabel';

export default function AppInput({
  label,
  error,
  required = false,
  className = '',
  containerClassName = '',
  type = 'text',
  id,
  ...props
}) {
  const inputId = id || (label ? `input-${label.toLowerCase().replace(/[^a-z0-9]/g, '-')}` : undefined);
  
  return (
    <div className={cn('flex flex-col w-full', containerClassName)}>
      {label && (
        <AppLabel htmlFor={inputId} required={required}>
          {label}
        </AppLabel>
      )}
      <input
        type={type}
        id={inputId}
        required={required}
        className={cn(
          'w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] focus:ring-2 focus:ring-[#468DFF]/20 bg-slate-50/50 transition-all text-slate-700 placeholder-slate-400 disabled:opacity-50 disabled:bg-slate-100 disabled:pointer-events-none',
          error && 'border-red-500 focus:border-red-500 focus:ring-red-500/20',
          className
        )}
        {...props}
      />
      {error && (
        <p className="text-[10px] text-red-500 font-bold mt-1.5 px-1 animate-fade-in">
          {error}
        </p>
      )}
    </div>
  );
}
