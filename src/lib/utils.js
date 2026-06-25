// src/lib/utils.js
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combina clases CSS condicionales y resuelve conflictos de clases de Tailwind.
 * @param  {...any} inputs - Lista de clases o expresiones condicionales.
 * @returns {string} - Cadena de clases unificada y limpia.
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Formatea una fecha YYYY-MM-DD a DD/MM/YYYY.
 * @param {string} dateStr - Fecha en formato YYYY-MM-DD.
 * @returns {string} - Fecha en formato DD/MM/YYYY.
 */
export function formatDate(dateStr) {
  if (!dateStr) return '';
  if (dateStr.includes('/')) return dateStr;
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

/**
 * Convierte una fecha de formato DD/MM/YYYY a YYYY-MM-DD.
 * @param {string} dateStr - Fecha en formato DD/MM/YYYY.
 * @returns {string|null} - Fecha en formato YYYY-MM-DD o null si está vacía.
 */
export function convertToDbDate(dateStr) {
  if (!dateStr) return null;
  const parts = dateStr.split('/');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}-${parts[1]}-${parts[0]}`;
}

/**
 * Formatea un string de texto como entrada de fecha DD/MM/YYYY en tiempo real al escribir.
 * @param {string} val - Entrada de texto del input.
 * @returns {string} - Texto formateado con barras agregadas automáticamente.
 */
export function formatAsDateInput(val) {
  // Limpiar caracteres no numéricos
  const numbers = val.replace(/[^0-9]/g, '');
  const len = numbers.length;

  if (len <= 2) {
    return numbers;
  }
  if (len <= 4) {
    return `${numbers.slice(0, 2)}/${numbers.slice(2)}`;
  }
  return `${numbers.slice(0, 2)}/${numbers.slice(2, 4)}/${numbers.slice(4, 8)}`;
}

