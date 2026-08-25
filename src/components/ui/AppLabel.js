// src/components/ui/AppLabel.js
import React from 'react';
import { cn } from '@/lib/utils';

export default function AppLabel({
  children,
  required = false,
  size = 'md',
  className = '',
  ...props
}) {
  const sizeClasses = {
    xs: 'text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1',
    sm: 'text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5',
    md: 'text-xs font-bold text-slate-600 uppercase tracking-wider mb-2',
    lg: 'text-sm font-bold text-slate-700 uppercase tracking-wider mb-2.5',
  };

  const selectedSizeClass = sizeClasses[size] || sizeClasses.md;

  return (
    <label
      className={cn(
        'block select-none',
        selectedSizeClass,
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
