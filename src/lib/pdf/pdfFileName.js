// src/lib/pdf/pdfFileName.js
/**
 * Helper para formatear y sanitizar nombres de archivo PDF de forma segura.
 * Patrón estándar: [modulo]_[empresa]_[establecimiento]_[fecha]_[id].pdf
 * Ejemplo: visita_empresa-acme_planta-1_2026-07-23_VIS-0042.pdf
 */

export function sanitizeSlug(text) {
  if (!text || typeof text !== 'string') return 'general';
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Eliminar acentos
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')     // Reemplazar espacios y caracteres especiales por guiones
    .replace(/^-+|-+$/g, '');        // Quitar guiones sobrantes
}

export function formatPdfFileName({ modulo, empresa, establecimiento, fecha, id }) {
  const modSlug = sanitizeSlug(modulo || 'documento');
  const empSlug = sanitizeSlug(empresa || 'empresa');
  const estSlug = establecimiento ? sanitizeSlug(establecimiento) : null;
  const dateStr = fecha ? sanitizeSlug(fecha) : new Date().toISOString().split('T')[0];
  const idStr = id ? sanitizeSlug(String(id)) : null;

  const parts = [modSlug, empSlug];
  if (estSlug) parts.push(estSlug);
  parts.push(dateStr);
  if (idStr) parts.push(idStr);

  return `${parts.join('_')}.pdf`;
}
