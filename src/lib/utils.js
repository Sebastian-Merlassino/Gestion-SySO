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

/**
 * Constante que define los límites y características habilitadas para cada plan comercial.
 */
export const PLAN_FEATURES = {
  free: {
    name: 'Plan Gratis',
    price: 0,
    maxClients: 1,
    maxMembers: 1,
    features: ['programa', 'capacitacion', 'correctivas', 'accidentes', 'matriz-riesgos', 'nomina', 'empresas', 'equipo']
  },
  basic_5: {
    name: 'Plan 25000',
    price: 25000,
    maxClients: 5,
    maxMembers: 5,
    features: ['programa', 'capacitacion', 'correctivas', 'accidentes', 'matriz-riesgos', 'nomina', 'extintores', 'control-electrico', 'empresas', 'equipo']
  },
  standard_25: {
    name: 'Plan 35000',
    price: 35000,
    maxClients: 15,
    maxMembers: 15,
    features: ['programa', 'capacitacion', 'correctivas', 'accidentes', 'matriz-riesgos', 'nomina', 'extintores', 'control-electrico', 'visitas', 'avisos', 'empresas', 'equipo']
  },
  libre: {
    name: 'Plan Full',
    price: 45000,
    maxClients: Infinity,
    maxMembers: Infinity,
    features: ['programa', 'capacitacion', 'correctivas', 'accidentes', 'matriz-riesgos', 'nomina', 'extintores', 'control-electrico', 'visitas', 'avisos', 'checklist-personalizados', 'legajo', 'portal-clientes', 'empresas', 'equipo']
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


