// src/lib/supabase.js
import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "⚠️ Supabase Error: NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY no están configurados en el archivo .env"
  );
}

export const supabase = createBrowserClient(
  supabaseUrl || 'https://placeholder-project.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);

// Caché en memoria para evitar re-consultas redundantes a la tabla estática geografia
const geographyCache = new Map();

/**
 * Utility function to recursively fetch all matching records in pages of 1,000
 * through the geography table to bypass the PostgREST default limit of 1000 records.
 * 
 * @param {string} provincia - Name of the province
 * @param {string} [partido] - Optional name of the department/partido
 * @returns {Promise<Array>} - Array of fetched database rows
 */
export const fetchAllGeography = async (provincia, partido = null) => {
  if (!provincia || typeof provincia !== 'string') return [];

  const cleanProv = provincia.trim().toUpperCase();
  const cleanPart = partido && typeof partido === 'string' ? partido.trim().toUpperCase() : '';
  const cacheKey = `${cleanProv}:${cleanPart}`;

  if (geographyCache.has(cacheKey)) {
    return geographyCache.get(cacheKey);
  }

  let allRows = [];
  let from = 0;
  const step = 1000;
  let finished = false;

  while (!finished) {
    let query = supabase
      .from('geografia')
      .select(cleanPart ? 'localidad_barrio' : 'departamento_partido')
      .eq('provincia', cleanProv);

    if (cleanPart) {
      query = query.eq('departamento_partido', cleanPart);
    }

    const { data, error } = await query
      .range(from, from + step - 1)
      .order(cleanPart ? 'localidad_barrio' : 'departamento_partido');

    if (error) throw error;

    if (data && data.length > 0) {
      allRows = allRows.concat(data);
      if (data.length < step) {
        finished = true;
      } else {
        from += step;
      }
    } else {
      finished = true;
    }
  }

  geographyCache.set(cacheKey, allRows);
  return allRows;
};

