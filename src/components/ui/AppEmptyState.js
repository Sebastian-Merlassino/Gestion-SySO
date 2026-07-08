// src/components/ui/AppEmptyState.js
import React from 'react';
import { ClipboardList } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AppEmptyState({
  title = 'No se encontraron registros',
  description = 'Probá modificando los filtros de búsqueda o registrá un elemento nuevo.',
  icon: Icon = ClipboardList,
  colSpan,
  className = '',
}) {
  const content = (
    <div className={cn("text-center py-20 px-6 flex flex-col items-center justify-center space-y-3 bg-slate-50/10", className)}>
      <div className="p-3 bg-slate-100 text-slate-400 rounded-full w-12 h-12 flex items-center justify-center border border-slate-200">
        <Icon className="h-6 w-6 shrink-0" />
      </div>
      <div className="space-y-1 max-w-xs mx-auto">
        <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider">{title}</h4>
        <p className="text-[11px] text-slate-400 leading-relaxed font-medium">{description}</p>
      </div>
    </div>
  );

  if (colSpan) {
    return (
      <tr>
        <td colSpan={colSpan} className="p-0">
          {content}
        </td>
      </tr>
    );
  }

  return content;
}
