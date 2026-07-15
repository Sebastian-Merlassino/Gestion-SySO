// src/components/ui/AppPageHeader.js
import React from 'react';
import { Menu } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AppPageHeader({
  title,
  icon: Icon,
  tenantName = '',
  planId = 'Pro',
  showPlanBadge = true,
  setIsMobileMenuOpen,
  actions,
  className = '',
}) {
  const getPlanLabel = (pid) => {
    if (!pid) return 'Plan Pro';
    const cleanId = pid.toLowerCase();
    if (cleanId === 'libre') return 'Plan Full';
    if (cleanId.startsWith('standard')) return 'Plan Standard';
    if (cleanId.startsWith('basic')) return 'Plan Basic';
    return `Plan ${pid}`;
  };

  return (
    <header className={cn("h-16 border-b border-slate-200 flex items-center justify-between px-4 md:px-6 bg-white shrink-0 sticky top-0 z-20 select-none", className)}>
      <div className="flex items-center gap-2.5 min-w-0">
        {setIsMobileMenuOpen && (
          <button 
            type="button"
            onClick={() => setIsMobileMenuOpen(true)} 
            className="p-2 -ml-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 md:hidden cursor-pointer shrink-0"
            title="Abrir menú móvil"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}
        {Icon && <Icon className="h-5 w-5 text-[#468DFF] shrink-0" />}
        <h1 className="font-outfit text-base md:text-lg font-bold text-slate-900 truncate leading-none">
          {title}
        </h1>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        {tenantName && (
          <span className="text-xs font-semibold text-slate-500 bg-slate-50 py-1.5 px-3 rounded-xl border border-slate-200 hidden sm:inline-block">
            {tenantName}
          </span>
        )}
        {showPlanBadge && (
          <span className="px-2.5 py-1.5 rounded-lg bg-[#468DFF]/15 border border-[#468DFF]/25 text-[#468DFF] text-[10px] font-bold uppercase tracking-wider">
            {getPlanLabel(planId)}
          </span>
        )}
        {actions && (
          <div className="flex items-center gap-2 ml-1">
            {actions}
          </div>
        )}
      </div>
    </header>
  );
}
