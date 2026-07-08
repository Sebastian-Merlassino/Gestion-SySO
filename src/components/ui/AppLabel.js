// src/components/ui/AppLabel.js
import React from 'react';
import { cn } from '@/lib/utils';

export default function AppLabel({
  children,
  required = false,
  className = '',
  ...props
}) {
  return (
    <label
      className={cn(
        'block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 select-none',
        className
      )}
      {...props}
    >
      {children}
      {required && (
        <span className="text-[#468DFF] ml-1 font-bold" aria-hidden="true">*</span>
      )}
    </label>
  );
}
