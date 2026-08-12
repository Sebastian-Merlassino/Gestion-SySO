// src/components/ui/AppTooltip.js
'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * AppTooltip
 * Componente unificado de globos emergentes explicativos (Tooltips).
 * Reemplaza el atributo title="" nativo del navegador con diseño accesible y compatible con dispositivos móviles/táctiles.
 */
export default function AppTooltip({
  content,
  children,
  position = 'top',
  className = '',
  disabled = false,
}) {
  const [isVisible, setIsVisible] = useState(false);

  if (!content || disabled) {
    return <>{children}</>;
  }

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 border-t-slate-900 border-x-transparent border-b-transparent',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-slate-900 border-x-transparent border-t-transparent',
    left: 'left-full top-1/2 -translate-y-1/2 border-l-slate-900 border-y-transparent border-r-transparent',
    right: 'right-full top-1/2 -translate-y-1/2 border-r-slate-900 border-y-transparent border-l-transparent',
  };

  return (
    <div
      className="relative inline-flex items-center"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
      onClick={() => setIsVisible((prev) => !prev)}
    >
      {children}
      {isVisible && (
        <div
          role="tooltip"
          className={cn(
            'absolute z-50 px-2.5 py-1 text-[11px] font-medium leading-snug text-white bg-slate-900 rounded-lg shadow-xl whitespace-nowrap pointer-events-none animate-fade-in transition-opacity',
            positionClasses[position] || positionClasses.top,
            className
          )}
        >
          {content}
          <div
            className={cn(
              'absolute border-4 border-solid w-0 h-0',
              arrowClasses[position] || arrowClasses.top
            )}
          />
        </div>
      )}
    </div>
  );
}
