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
