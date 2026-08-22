// src/components/help/HelpComponents.js
'use client';

import React, { useState } from 'react';
import { 
  Lightbulb, 
  AlertTriangle, 
  ChevronDown, 
  ChevronUp, 
  Info, 
  CheckCircle2, 
  ExternalLink,
  HelpCircle,
  Sparkles,
  Command,
  Bookmark
} from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Tarjeta de Propósito / Objetivo de la sección
 */
export function HelpPurpose({ icon: Icon = Sparkles, title = '¿Para qué sirve esta sección?', children, className = '' }) {
  return (
    <div className={cn("p-4 rounded-2xl bg-gradient-to-br from-blue-50/80 to-slate-50 border border-blue-100/80 shadow-xs space-y-2", className)}>
      <div className="flex items-center gap-2 text-[#468DFF]">
        <div className="p-1.5 bg-[#468DFF]/15 text-[#468DFF] rounded-lg border border-[#468DFF]/25">
          <Icon className="h-4 w-4 shrink-0" />
        </div>
        <h4 className="font-outfit font-bold text-xs md:text-sm text-slate-900 leading-tight">
          {title}
        </h4>
      </div>
      <div className="text-xs text-slate-600 leading-relaxed pl-0.5 font-normal">
        {children}
      </div>
    </div>
  );
}

/**
 * Paso numerado dentro de una guía instructiva
 */
export function HelpStep({ number, title, children, isLast = false, id, className = '' }) {
  return (
    <div id={id} className={cn("relative flex gap-3.5 group", className)}>
      {/* Línea conectora entre pasos */}
      {!isLast && (
        <div className="absolute left-3.5 top-8 bottom-0 w-0.5 bg-slate-200 group-hover:bg-[#468DFF]/30 transition-colors" />
      )}
      
      {/* Badge circular con número */}
      <div className="relative z-10 flex items-center justify-center h-7 w-7 rounded-full bg-[#468DFF] text-white text-xs font-bold font-outfit shadow-sm shadow-[#468DFF]/25 shrink-0 select-none">
        {number}
      </div>

      {/* Contenido del paso */}
      <div className="flex-1 pb-5 pt-0.5 space-y-1.5 min-w-0">
        {title && (
          <h5 className="font-outfit font-bold text-xs md:text-sm text-slate-900 leading-snug">
            {title}
          </h5>
        )}
        <div className="text-xs text-slate-600 leading-relaxed space-y-2">
          {children}
        </div>
      </div>
    </div>
  );
}

/**
 * Tarjeta de Consejo / Recomendación Práctica (Tip)
 */
export function HelpTip({ title = 'Consejo práctico', children, className = '' }) {
  return (
    <div className={cn("flex gap-2.5 p-3.5 rounded-xl bg-blue-50/90 border border-blue-200/70 text-blue-950 text-xs shadow-2xs leading-relaxed", className)}>
      <Lightbulb className="h-4 w-4 text-[#468DFF] shrink-0 mt-0.5" />
      <div className="flex-1 space-y-0.5">
        {title && <p className="font-bold text-[#0511F2]">{title}</p>}
        <div className="text-blue-900/90 font-normal">{children}</div>
      </div>
    </div>
  );
}

/**
 * Tarjeta de Advertencia / Caso crítico (Warning)
 */
export function HelpWarning({ title = 'Atención', children, className = '' }) {
  return (
    <div className={cn("flex gap-2.5 p-3.5 rounded-xl bg-amber-50/90 border border-amber-200/80 text-amber-950 text-xs shadow-2xs leading-relaxed", className)}>
      <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
      <div className="flex-1 space-y-0.5">
        {title && <p className="font-bold text-amber-900">{title}</p>}
        <div className="text-amber-900/90 font-normal">{children}</div>
      </div>
    </div>
  );
}

/**
 * Acordeón colapsable para Preguntas Frecuentes (FAQs)
 */
export function HelpFaq({ question, children, defaultOpen = false, id, className = '' }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div id={id} className={cn("border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs transition-colors", isOpen ? "border-slate-300" : "hover:border-slate-300", className)}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full py-2.5 px-3.5 flex items-center justify-between text-left gap-2.5 hover:bg-slate-50/80 transition-colors cursor-pointer select-none"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2 min-w-0">
          <HelpCircle className="h-4 w-4 text-[#468DFF] shrink-0" />
          <span className="font-outfit font-semibold text-xs text-slate-800 leading-snug">
            {question}
          </span>
        </div>
        <div className="p-0.5 text-slate-400 shrink-0">
          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </button>

      {isOpen && (
        <div className="px-3.5 pb-3 pt-1 border-t border-slate-100 bg-slate-50/40 text-xs text-slate-600 leading-relaxed font-normal animate-fade-in">
          {children}
        </div>
      )}
    </div>
  );
}

/**
 * Contenedor de sección temática
 */
export function HelpSection({ title, id, icon: Icon = Bookmark, children, className = '' }) {
  return (
    <section id={id} className={cn("space-y-3 pt-2 scroll-mt-4", className)}>
      {title && (
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
          {Icon && <Icon className="h-4 w-4 text-[#468DFF] shrink-0" />}
          <h3 className="font-outfit text-xs md:text-sm font-bold text-slate-900 uppercase tracking-wide">
            {title}
          </h3>
        </div>
      )}
      <div className="space-y-3">
        {children}
      </div>
    </section>
  );
}

/**
 * Badge de permisos o roles
 */
export function HelpBadge({ label, variant = 'primary', className = '' }) {
  const styles = {
    primary: 'bg-[#468DFF]/15 border-[#468DFF]/30 text-[#468DFF]',
    amber: 'bg-amber-100/80 border-amber-300 text-amber-800',
    green: 'bg-emerald-100/80 border-emerald-300 text-emerald-800',
    slate: 'bg-slate-100 border-slate-200 text-slate-700',
  };

  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border", styles[variant] || styles.primary, className)}>
      {label}
    </span>
  );
}

/**
 * Contenedor para Referencia Visual / Esquemas
 */
export function HelpVisualReference({ title, caption, src, alt, children, className = '' }) {
  return (
    <div className={cn("rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2 overflow-hidden", className)}>
      {title && (
        <p className="font-outfit font-bold text-xs text-slate-800 flex items-center gap-1.5">
          <Info className="h-3.5 w-3.5 text-[#468DFF]" />
          {title}
        </p>
      )}
      {src ? (
        <div className="rounded-lg overflow-hidden border border-slate-200 bg-white shadow-2xs">
          <img src={src} alt={alt || title || 'Referencia visual'} className="w-full h-auto object-cover" />
        </div>
      ) : (
        children
      )}
      {caption && (
        <p className="text-[11px] text-slate-500 italic text-center font-normal">
          {caption}
        </p>
      )}
    </div>
  );
}

/**
 * Atajo de teclado visual
 */
export function HelpShortcut({ keys = [] }) {
  return (
    <span className="inline-flex items-center gap-1">
      {keys.map((k, i) => (
        <kbd key={i} className="px-1.5 py-0.5 text-[10px] font-semibold text-slate-700 bg-slate-100 border border-slate-300 rounded-sm shadow-2xs font-mono">
          {k}
        </kbd>
      ))}
    </span>
  );
}
