// src/components/ui/AppLoadingSpinner.js
'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AppLoadingSpinner({
  message = 'Cargando...',
  className = '',
  size = 'md', // 'sm' | 'md' | 'lg'
  minHeight = 'min-h-[300px]',
  compact = false
}) {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-10 w-10',
    lg: 'h-12 w-12',
  };

  const iconClass = sizeClasses[size] || sizeClasses.md;

  if (compact) {
    return (
      <div className={cn('flex flex-col items-center justify-center p-6 text-center space-y-2.5', className)}>
        <Loader2 className={cn(iconClass, 'animate-spin text-[#468DFF] shrink-0 mx-auto')} />
        {message && (
          <p className="text-xs text-slate-500 font-medium">
            {message}
          </p>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex-1 flex flex-col items-center justify-center p-8 w-full',
        minHeight,
        className
      )}
    >
      <div className="text-center space-y-3 flex flex-col items-center justify-center">
        <Loader2 className={cn(iconClass, 'animate-spin text-[#468DFF] shrink-0 mx-auto')} />
        {message && (
          <p className="text-xs sm:text-sm text-slate-500 font-medium tracking-tight">
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
