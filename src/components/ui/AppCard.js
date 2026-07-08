// src/components/ui/AppCard.js
import React from 'react';
import { cn } from '@/lib/utils';

export default function AppCard({
  children,
  className = '',
  ...props
}) {
  return (
    <div
      className={cn(
        'bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
