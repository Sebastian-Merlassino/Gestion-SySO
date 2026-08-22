// src/components/ui/ContextualHelpTrigger.js
'use client';

import React from 'react';
import { HelpCircle } from 'lucide-react';
import { useContextualHelp } from '@/components/providers/ContextualHelpProvider';
import { cn } from '@/lib/utils';

export default function ContextualHelpTrigger({
  helpKey = null,
  section = null,
  variant = 'header', // 'header' | 'inline' | 'button'
  title = '¿Necesitás ayuda? Ver instructivo de esta sección',
  label = 'Ayuda',
  className = '',
}) {
  const { openHelp } = useContextualHelp();

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    openHelp(helpKey, section);
  };

  if (variant === 'inline') {
    return (
      <button
        type="button"
        onClick={handleClick}
        className={cn(
          "inline-flex items-center justify-center p-1 rounded-lg text-slate-400 hover:text-[#468DFF] hover:bg-blue-50/80 transition-all cursor-pointer shrink-0 focus:outline-none focus:ring-2 focus:ring-[#468DFF]/40",
          className
        )}
        title={title}
        aria-label={title}
      >
        <HelpCircle className="h-4.5 w-4.5" />
      </button>
    );
  }

  if (variant === 'button') {
    return (
      <button
        type="button"
        onClick={handleClick}
        className={cn(
          "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#468DFF]/25 bg-[#468DFF]/10 hover:bg-[#468DFF]/20 text-[#468DFF] text-xs font-bold transition-all active:scale-[0.98] cursor-pointer shadow-2xs",
          className
        )}
        title={title}
        aria-label={title}
      >
        <HelpCircle className="h-4 w-4 shrink-0" />
        <span>{label}</span>
      </button>
    );
  }

  // Default: 'header' (para AppPageHeader)
  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "h-8 w-8 rounded-xl flex items-center justify-center bg-[#468DFF]/10 hover:bg-[#468DFF]/20 border border-[#468DFF]/25 text-[#468DFF] hover:text-[#0511F2] transition-all duration-200 active:scale-95 cursor-pointer shadow-2xs shrink-0 select-none group focus:outline-none focus:ring-2 focus:ring-[#468DFF]/40",
        className
      )}
      title={title}
      aria-label={title}
    >
      <HelpCircle className="h-4.5 w-4.5 group-hover:scale-110 transition-transform" />
    </button>
  );
}
