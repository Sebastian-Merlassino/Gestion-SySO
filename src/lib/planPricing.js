// src/lib/planPricing.js
import { PLAN_FEATURES } from './utils';
import { supabase } from './supabase';

/**
 * Obtiene las características y límites de los planes fusionando
 * la configuración estática con los precios dinámicos persistidos en la base de datos.
 * 
 * @param {object} supabaseClient - Cliente de Supabase (Server, Admin o Browser).
 * @returns {Promise<object>} Objeto con la configuración completa de planes.
 */
export async function getDynamicPlanFeatures(supabaseClient) {
  // Clonar la estructura estática base
  const dynamicFeatures = JSON.parse(JSON.stringify(PLAN_FEATURES));

  if (!supabaseClient) {
    return dynamicFeatures;
  }

  try {
    const { data: configs, error } = await supabaseClient
      .from('plan_configs')
      .select('id, name, price');

    if (error || !configs || configs.length === 0) {
      return dynamicFeatures;
    }

    configs.forEach((cfg) => {
      if (dynamicFeatures[cfg.id]) {
        dynamicFeatures[cfg.id].price = Number(cfg.price);
        if (cfg.name) dynamicFeatures[cfg.id].name = cfg.name;
      }
    });

    return dynamicFeatures;
  } catch (err) {
    console.warn('[planPricing] No se pudieron cargar precios dinámicos, usando predeterminados:', err.message);
    return dynamicFeatures;
  }
}

/**
 * Obtiene la lista formateada de planes y precios para APIs y componentes clientes.
 */
export async function getAllPlanPricing(supabaseClient) {
  const client = supabaseClient || supabase;
  const features = await getDynamicPlanFeatures(client);

  return Object.keys(features)
    .filter(k => k !== 'free')
    .map(key => ({
      id: key,
      name: features[key].name,
      currentPrice: features[key].price,
      maxClients: features[key].maxClients,
      maxMembers: features[key].maxMembers,
    }));
}

