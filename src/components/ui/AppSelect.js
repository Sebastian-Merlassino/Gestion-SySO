// src/components/ui/AppSelect.js
import React from 'react';
import { cn } from '@/lib/utils';
import AppLabel from './AppLabel';

export default function AppSelect({
  label,
  error,
  required = false,
  options = [],
  className = '',
  containerClassName = '',
  placeholder = 'Seleccione una opción...',
  id,
  children,
  ...props
}) {
  const selectId = id || (label ? `select-${label.toLowerCase().replace(/[^a-z0-9]/g, '-')}` : undefined);
  
  return (
    <div className={cn('flex flex-col w-full', containerClassName)}>
      {label && (
        <AppLabel htmlFor={selectId} required={required}>
          {label}
        </AppLabel>
      )}
      <div className="relative w-full">
        <select
          id={selectId}
          required={required}
          className={cn(
            'w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] focus:ring-2 focus:ring-[#468DFF]/20 bg-slate-50/50 transition-all text-slate-700 disabled:opacity-50 disabled:bg-slate-100 disabled:pointer-events-none appearance-none cursor-pointer pr-10',
            error && 'border-red-500 focus:border-red-500 focus:ring-red-500/20',
            className
          )}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {children ? children : options.map((opt) => {
            const val = typeof opt === 'object' ? opt.value : opt;
            const lbl = typeof opt === 'object' ? opt.label : opt;
            return (
              <option key={val} value={val}>
                {lbl}
              </option>
            );
          })}
        </select>
        
        {/* Flecha personalizada */}
        <div className="absolute inset-y-0 right-0 flex items-center pr-3.5 pointer-events-none text-slate-400">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
      {error && (
        <p className="text-[10px] text-red-500 font-bold mt-1.5 px-1 animate-fade-in">
          {error}
        </p>
      )}
    </div>
  );
}
