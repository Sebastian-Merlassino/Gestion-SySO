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
  if (dateStr instanceof Date) {
    if (isNaN(dateStr.getTime())) return '';
    const d = dateStr.getDate().toString().padStart(2, '0');
    const m = (dateStr.getMonth() + 1).toString().padStart(2, '0');
    const y = dateStr.getFullYear();
    return `${d}/${m}/${y}`;
  }
  if (typeof dateStr !== 'string') {
    dateStr = String(dateStr);
  }
  const cleanStr = dateStr.trim();
  if (!cleanStr) return '';
  if (cleanStr.includes('/')) return cleanStr;
  const isoPart = cleanStr.split('T')[0];
  const parts = isoPart.split('-');
  if (parts.length !== 3) return cleanStr;
  if (parts[0].length === 4) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return cleanStr;
}

/**
 * Convierte una fecha de cualquier formato (DD/MM/YYYY, DD-MM-YYYY, ISO) a YYYY-MM-DD para la base de datos.
 * Retorna null si la entrada es nula, vacía o no es una fecha válida.
 * @param {string|Date} dateStr - Fecha de entrada.
 * @returns {string|null} - Fecha en formato YYYY-MM-DD o null.
 */
export function convertToDbDate(dateStr) {
  if (!dateStr) return null;
  if (dateStr instanceof Date) {
    if (isNaN(dateStr.getTime())) return null;
    const d = dateStr.getDate().toString().padStart(2, '0');
    const m = (dateStr.getMonth() + 1).toString().padStart(2, '0');
    const y = dateStr.getFullYear();
    return `${y}-${m}-${d}`;
  }
  if (typeof dateStr !== 'string') {
    dateStr = String(dateStr);
  }
  const clean = dateStr.trim();
  if (!clean) return null;

  // Si ya es formato ISO YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    return clean;
  }

  // Si viene con timestamp ISO (ej: 1979-08-26T03:00:00.000Z)
  if (clean.includes('T')) {
    const isoDate = clean.split('T')[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
      return isoDate;
    }
  }

  // Si viene con separadores /, - o .
  const parts = clean.split(/[\/\-.]/);
  if (parts.length === 3) {
    // Caso 1: YYYY/MM/DD o YYYY.MM.DD
    if (parts[0].length === 4) {
      const year = parts[0];
      const month = parts[1].padStart(2, '0');
      const day = parts[2].padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    // Caso 2: DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY (ej: 26/08/1979)
    if (parts[2].length === 4) {
      const day = parts[0].padStart(2, '0');
      const month = parts[1].padStart(2, '0');
      const year = parts[2];
      return `${year}-${month}-${day}`;
    }
  }

  return null;
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

/**
 * Constante que define los límites y características habilitadas para cada plan comercial.
 */
export const PLAN_FEATURES = {
  free: {
    name: 'Plan Gratis',
    price: 0,
    maxClients: 1,
    maxMembers: 1,
    features: ['programa', 'capacitacion', 'capacitaciones-online', 'correctivas', 'accidentes', 'matriz-riesgos', 'nomina', 'empresas', 'equipo']
  },
  basic_5: {
    name: 'Plan 25000',
    price: 25000,
    maxClients: 5,
    maxMembers: 5,
    features: ['programa', 'capacitacion', 'capacitaciones-online', 'correctivas', 'accidentes', 'matriz-riesgos', 'nomina', 'extintores', 'control-electrico', 'empresas', 'equipo']
  },
  standard_25: {
    name: 'Plan 35000',
    price: 35000,
    maxClients: 15,
    maxMembers: 15,
    features: ['programa', 'capacitacion', 'capacitaciones-online', 'correctivas', 'accidentes', 'matriz-riesgos', 'nomina', 'extintores', 'control-electrico', 'visitas', 'avisos', 'empresas', 'equipo']
  },
  libre: {
    name: 'Plan Full',
    price: 45000,
    maxClients: Infinity,
    maxMembers: Infinity,
    features: ['programa', 'capacitacion', 'capacitaciones-online', 'correctivas', 'accidentes', 'matriz-riesgos', 'nomina', 'extintores', 'control-electrico', 'visitas', 'avisos', 'checklist-personalizados', 'legajo', 'portal-clientes', 'empresas', 'equipo']
  }
};

/**
 * Resuelve el plan comercial efectivo de un tenant, evaluando exenciones por dueño global,
 * regalos promocionales activos o vencimiento de la suscripción.
 * @param {object} tenant - Datos del tenant.
 * @returns {string} - ID del plan efectivo ('free', 'basic_5', 'standard_25', 'libre').
 */
export function getEffectivePlan(tenant) {
  if (!tenant) return 'free';
  if (tenant.is_exempt) return 'libre';

  // Evaluar regalo activo primero
  if (tenant.gift_plan_id && tenant.gift_ends_at && new Date(tenant.gift_ends_at) > new Date()) {
    return tenant.gift_plan_id;
  }

  // Evaluar si expiró su suscripción
  if (tenant.plan_ends_at && new Date(tenant.plan_ends_at) < new Date()) {
    return 'free';
  }

  return tenant.plan_id || 'free';
}

/**
 * Comprueba si el plan efectivo del tenant tiene acceso a un módulo o característica.
 * @param {object} tenant - Datos del tenant.
 * @param {string} sectionId - ID de la sección.
 * @returns {boolean} - true si tiene acceso, false en caso contrario.
 */
export function hasFeatureAccess(tenant, sectionId) {
  const plan = getEffectivePlan(tenant);
  const features = PLAN_FEATURES[plan]?.features || [];
  return features.includes(sectionId);
}


