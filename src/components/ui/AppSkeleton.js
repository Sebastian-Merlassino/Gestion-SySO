// src/components/ui/AppSkeleton.js
import React from 'react';
import { cn } from '@/lib/utils';

/**
 * AppSkeleton
 * Componente unificado para estados de carga estructurados con animación pulse.
 * Reemplaza spinners sueltos y textos desalineados preservando la grilla final.
 */
export default function AppSkeleton({
  variant = 'default',
  rows = 4,
  count = 1,
  className = '',
}) {
  if (variant === 'table') {
    return (
      <div className={cn('w-full space-y-3 p-4 bg-white border border-slate-200 rounded-2xl shadow-sm', className)}>
        {/* Cabecera de tabla skeleton */}
        <div className="flex items-center justify-between gap-4 pb-3 border-b border-slate-100">
          <div className="h-4 bg-slate-200 animate-pulse rounded-lg w-1/4" />
          <div className="h-4 bg-slate-200 animate-pulse rounded-lg w-1/6" />
          <div className="h-4 bg-slate-200 animate-pulse rounded-lg w-1/6" />
          <div className="h-4 bg-slate-200 animate-pulse rounded-lg w-1/8" />
        </div>
        {/* Filas de tabla skeleton */}
        {Array.from({ length: rows }).map((_, idx) => (
          <div key={idx} className="flex items-center justify-between gap-4 py-2.5 border-b border-slate-50 last:border-0">
            <div className="h-3.5 bg-slate-150 animate-pulse rounded-md w-1/3" />
            <div className="h-3.5 bg-slate-150 animate-pulse rounded-md w-1/5" />
            <div className="h-3.5 bg-slate-150 animate-pulse rounded-md w-1/6" />
            <div className="h-7 bg-slate-150 animate-pulse rounded-lg w-20" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <div className={cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full', className)}>
        {Array.from({ length: count }).map((_, idx) => (
          <div key={idx} className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-3.5 bg-slate-200 animate-pulse rounded-md w-1/2" />
              <div className="h-8 w-8 bg-slate-150 animate-pulse rounded-xl" />
            </div>
            <div className="h-6 bg-slate-200 animate-pulse rounded-lg w-2/3" />
            <div className="h-3 bg-slate-150 animate-pulse rounded-md w-3/4" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'form') {
    return (
      <div className={cn('space-y-4 w-full p-4 bg-white border border-slate-200 rounded-2xl', className)}>
        {Array.from({ length: rows }).map((_, idx) => (
          <div key={idx} className="space-y-1.5">
            <div className="h-3 bg-slate-200 animate-pulse rounded-md w-1/4" />
            <div className="h-10 bg-slate-150 animate-pulse rounded-xl w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'text') {
    return (
      <div className={cn('space-y-2 w-full', className)}>
        {Array.from({ length: rows }).map((_, idx) => (
          <div
            key={idx}
            className="h-3.5 bg-slate-200 animate-pulse rounded-md"
            style={{ width: `${100 - (idx % 3) * 15}%` }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn('h-10 bg-slate-200 animate-pulse rounded-xl w-full', className)}
    />
  );
}
