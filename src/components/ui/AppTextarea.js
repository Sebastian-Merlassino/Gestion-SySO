// src/components/ui/AppTextarea.js
import React from 'react';
import { cn } from '@/lib/utils';
import AppLabel from './AppLabel';
import AITextHelper from './AITextHelper';

export default function AppTextarea({
  label,
  error,
  required = false,
  className = '',
  containerClassName = '',
  id,
  value = '',
  onChange,
  voiceHelper = false,
  context = '',
  allowExpand = false,
  ...props
}) {
  const textareaId = id || (label ? `textarea-${label.toLowerCase().replace(/[^a-z0-9]/g, '-')}` : undefined);
  
  return (
    <div className={cn('flex flex-col w-full relative', containerClassName)}>
      {label && (
        <AppLabel htmlFor={textareaId} required={required}>
          {label}
        </AppLabel>
      )}
      <div className="relative w-full flex flex-col">
        <textarea
          id={textareaId}
          required={required}
          value={value}
          onChange={onChange}
          className={cn(
            'w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] focus:ring-2 focus:ring-[#468DFF]/20 bg-slate-50/50 transition-all text-slate-700 placeholder-slate-400 disabled:opacity-50 disabled:bg-slate-100 disabled:pointer-events-none min-h-[80px]',
            error && 'border-red-500 focus:border-red-500 focus:ring-red-500/20',
            voiceHelper && 'pr-12',
            className
          )}
          {...props}
        />
        
        {voiceHelper && (
          <div className="absolute right-3 bottom-3 z-10">
            <AITextHelper
              value={value}
              onChange={onChange}
              context={context || label}
              allowExpand={allowExpand}
            />
          </div>
        )}
      </div>
      {error && (
        <p className="text-[10px] text-red-500 font-bold mt-1.5 px-1 animate-fade-in">
          {error}
        </p>
      )}
    </div>
  );
}
