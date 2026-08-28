// src/components/ui/AppDatePicker.js
'use client';

import React from 'react';
import { Calendar, X } from 'lucide-react';
import { cn, formatAsDateInput, formatDate, convertToDbDate } from '@/lib/utils';
import AppLabel from './AppLabel';

/**
 * AppDatePicker - Componente de fecha estandarizado para Gestión SySO.
 * Permite tipeo directo con máscara DD/MM/YYYY y apertura del calendario nativo del navegador/sistema.
 * 
 * @param {string} label - Etiqueta superior (renderizada con AppLabel en UPPERCASE)
 * @param {string} value - Valor en formato DD/MM/YYYY o YYYY-MM-DD
 * @param {function} onChange - Handler invocado con el nuevo valor (o synthetic event)
 * @param {string} error - Mensaje de error de validación
 * @param {boolean} required - Si es campo obligatorio
 * @param {boolean} disabled - Si está deshabilitado
 * @param {boolean} allowClear - Si muestra botón para limpiar fecha
 * @param {string} mode - 'dmy' (por defecto, almacena/emite DD/MM/YYYY) o 'ymd' (almacena/emite YYYY-MM-DD)
 * @param {string} className - Clases extra para el input
 * @param {string} containerClassName - Clases extra para el contenedor
 * @param {string} helperText - Texto de ayuda debajo del input
 */
export default function AppDatePicker({
  label,
  value = '',
  onChange,
  error,
  required = false,
  disabled = false,
  allowClear = false,
  mode = 'dmy',
  className = '',
  containerClassName = '',
  helperText,
  id,
  name,
  placeholder = 'DD/MM/YYYY',
  ...props
}) {
  const inputId = id || (label ? `datepicker-${label.toLowerCase().replace(/[^a-z0-9]/g, '-')}` : (name ? `datepicker-${name}` : undefined));

  // Determinar valor para el input de texto (siempre mostrar formato visual DD/MM/AAAA)
  let displayValue = '';
  if (value) {
    if (/^\d{4}-\d{2}-\d{2}/.test(String(value))) {
      displayValue = formatDate(value);
    } else {
      displayValue = String(value);
    }
  }

  // Determinar valor ISO para el input de tipo date nativo oculto/overlay
  let isoValue = '';
  if (value) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) {
      isoValue = String(value);
    } else {
      isoValue = convertToDbDate(value) || '';
    }
  }

  // Handler cuando se tipea en el input de texto
  const handleTextChange = (e) => {
    if (disabled) return;
    const rawVal = e.target.value;
    const formattedVal = formatAsDateInput(rawVal);

    if (onChange) {
      let emitVal = formattedVal;
      if (mode === 'ymd') {
        if (formattedVal.length === 10) {
          emitVal = convertToDbDate(formattedVal) || formattedVal;
        } else {
          emitVal = formattedVal;
        }
      }

      const syntheticEvent = {
        ...e,
        target: {
          ...e.target,
          name: name || '',
          value: emitVal,
        },
      };
      onChange(syntheticEvent);
    }
  };

  // Handler cuando se elige desde el popup de calendario nativo
  const handleNativePickerChange = (e) => {
    if (disabled) return;
    const selectedIso = e.target.value; // YYYY-MM-DD
    let nextValue = '';

    if (selectedIso) {
      if (mode === 'dmy') {
        nextValue = formatDate(selectedIso);
      } else {
        nextValue = selectedIso;
      }
    }

    if (onChange) {
      const syntheticEvent = {
        target: {
          name: name || '',
          value: nextValue,
        },
      };
      onChange(syntheticEvent);
    }
  };

  // Limpiar valor
  const handleClear = (e) => {
    e.stopPropagation();
    if (disabled) return;
    if (onChange) {
      const syntheticEvent = {
        target: {
          name: name || '',
          value: '',
        },
      };
      onChange(syntheticEvent);
    }
  };

  return (
    <div className={cn('flex flex-col w-full', containerClassName)}>
      {label && (
        <AppLabel htmlFor={inputId} required={required}>
          {label}
        </AppLabel>
      )}

      <div className="relative flex items-center">
        <input
          type="text"
          id={inputId}
          name={name}
          maxLength={mode === 'dmy' ? 10 : undefined}
          placeholder={placeholder}
          value={displayValue}
          onChange={handleTextChange}
          disabled={disabled}
          required={required}
          className={cn(
            'w-full border border-slate-200 rounded-xl pl-3.5 pr-10 py-2 text-sm focus:outline-none focus:border-[#468DFF] focus:ring-2 focus:ring-[#468DFF]/20 bg-slate-50/50 transition-all text-slate-700 placeholder-slate-400 disabled:opacity-50 disabled:bg-slate-100 font-mono',
            error && 'border-red-500 focus:border-red-500 focus:ring-red-500/20',
            className
          )}
          {...props}
        />

        {/* Botón de limpiar si está activo y hay valor */}
        {allowClear && displayValue && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-9 top-1/2 -translate-y-1/2 p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition-colors"
            title="Limpiar fecha"
            aria-label="Limpiar fecha"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}

        {/* Icono de Calendario interactivo que despliega el selector nativo */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-slate-400 hover:text-[#468DFF] flex items-center">
          <Calendar className="h-4 w-4 pointer-events-none" />
          <input
            type="date"
            value={isoValue}
            onChange={handleNativePickerChange}
            disabled={disabled}
            tabIndex={-1}
            aria-label="Seleccionar fecha en calendario"
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          />
        </div>
      </div>

      {helperText && !error && (
        <p className="text-[11px] text-slate-400 mt-1 px-1 font-medium leading-normal">
          {helperText}
        </p>
      )}

      {error && (
        <p className="text-[10px] text-red-500 font-bold mt-1.5 px-1 animate-fade-in">
          {error}
        </p>
      )}
    </div>
  );
}
