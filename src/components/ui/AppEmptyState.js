// src/components/ui/AppEmptyState.js
import React from 'react';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import AppButton from './AppButton';

export default function AppEmptyState({
  title = 'No se encontraron registros',
  description = 'Probá modificando los filtros de búsqueda o registrá un elemento nuevo.',
  icon: Icon = AlertCircle,
  actionButton,
  actionLabel,
  onAction,
  colSpan,
  className = '',
}) {
  const content = (
    <div className={cn("flex-grow flex flex-col items-center justify-center p-8 text-center gap-3 h-full w-full", className)}>
      <Icon className="h-10 w-10 text-slate-300 shrink-0" />
      <div className="space-y-1">
        <p className="text-sm font-bold text-slate-800">{title}</p>
        <p className="text-xs text-slate-400 leading-relaxed font-medium">{description}</p>
      </div>
      {actionButton ? (
        <div className="pt-1">
          {actionButton}
        </div>
      ) : actionLabel && onAction ? (
        <div className="pt-1">
          <AppButton
            onClick={onAction}
            variant="primary"
            size="sm"
            className="shadow-md shadow-[#468DFF]/10 flex items-center gap-1.5"
          >
            {actionLabel}
          </AppButton>
        </div>
      ) : null}
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

