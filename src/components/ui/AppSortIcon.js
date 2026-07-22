// src/components/ui/AppSortIcon.js
import React from 'react';
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';

/**
 * Componente unificado para mostrar el indicador de ordenamiento en las cabeceras de tablas.
 * 
 * @param {string} field - El nombre del campo/columna que representa esta cabecera.
 * @param {string} sortField - El campo por el cual está ordenada la tabla actualmente en el estado.
 * @param {'asc'|'desc'} sortOrder - La dirección del ordenamiento actual.
 */
export default function AppSortIcon({ field, sortField, sortOrder }) {
  if (sortField !== field) {
    // Retorna una flecha bidireccional muy tenue para indicar que la columna es ordenable
    return <ArrowUpDown className="h-3 w-3 text-slate-300 ml-1.5 inline shrink-0" />;
  }
  return sortOrder === 'asc' ? (
    <ArrowUp className="h-3.5 w-3.5 text-[#468DFF] ml-1.5 inline shrink-0 font-bold" />
  ) : (
    <ArrowDown className="h-3.5 w-3.5 text-[#468DFF] ml-1.5 inline shrink-0 font-bold" />
  );
}
