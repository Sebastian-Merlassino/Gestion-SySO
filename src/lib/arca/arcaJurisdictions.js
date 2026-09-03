// src/lib/arca/arcaJurisdictions.js
// Normalizador y catálogo de las 24 jurisdicciones provinciales de la República Argentina

export const JURISDICCIONES_ARGENTINA = [
  'CABA',
  'Buenos Aires',
  'Córdoba',
  'Santa Fe',
  'Mendoza',
  'Tucumán',
  'Entre Ríos',
  'Salta',
  'Misiones',
  'Chaco',
  'Corrientes',
  'Santiago del Estero',
  'San Juan',
  'Jujuy',
  'Río Negro',
  'Neuquén',
  'Formosa',
  'Chubut',
  'San Luis',
  'Catamarca',
  'La Rioja',
  'La Pampa',
  'Santa Cruz',
  'Tierra del Fuego',
  'Otras / No especificada',
];

/**
 * Normaliza un texto de provincia o jurisdicción al estándar oficial.
 * @param {string|null|undefined} raw
 * @param {string} fallback
 * @returns {string}
 */
export function normalizeJurisdiction(raw, fallback = 'CABA') {
  if (!raw || typeof raw !== 'string') return fallback;

  const clean = raw
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // Remover tildes

  // Mapeos rápidos por alias habituales
  if (['caba', 'capital', 'capital federal', 'ciudad de buenos aires', 'ciudad autonoma de buenos aires'].includes(clean)) {
    return 'CABA';
  }
  if (['buenos aires', 'pba', 'bs as', 'bsas', 'provincia de buenos aires', 'gran buenos aires', 'gba', 'la plata', 'avellaneda', 'vicente lopez', 'san isidro', 'pilar', 'campana', 'zarate'].includes(clean)) {
    return 'Buenos Aires';
  }
  if (['cordoba', 'cba', 'villa maria', 'rio cuarto'].includes(clean)) {
    return 'Córdoba';
  }
  if (['santa fe', 'rosario', 'rafaela', 'venado tuerto'].includes(clean)) {
    return 'Santa Fe';
  }
  if (['mendoza', 'mza', 'san rafael', 'godoy cruz'].includes(clean)) {
    return 'Mendoza';
  }
  if (['tucuman', 'san miguel de tucuman'].includes(clean)) {
    return 'Tucumán';
  }
  if (['entre rios', 'parana', 'concordia', 'gualeguaychu'].includes(clean)) {
    return 'Entre Ríos';
  }
  if (['salta'].includes(clean)) {
    return 'Salta';
  }
  if (['misiones', 'posadas', 'obera', 'iguazu'].includes(clean)) {
    return 'Misiones';
  }
  if (['chaco', 'resistencia'].includes(clean)) {
    return 'Chaco';
  }
  if (['corrientes', 'paso de los libres', 'goya'].includes(clean)) {
    return 'Corrientes';
  }
  if (['santiago del estero', 'la banda'].includes(clean)) {
    return 'Santiago del Estero';
  }
  if (['san juan'].includes(clean)) {
    return 'San Juan';
  }
  if (['jujuy', 'san salvador de jujuy'].includes(clean)) {
    return 'Jujuy';
  }
  if (['rio negro', 'bariloche', 'viedma', 'cipolletti', 'general roca'].includes(clean)) {
    return 'Río Negro';
  }
  if (['neuquen', 'san martin de los andes'].includes(clean)) {
    return 'Neuquén';
  }
  if (['formosa'].includes(clean)) {
    return 'Formosa';
  }
  if (['chubut', 'comodoro rivadavia', 'rawson', 'puerto madryn', 'trelew'].includes(clean)) {
    return 'Chubut';
  }
  if (['san luis', 'villa mercedes'].includes(clean)) {
    return 'San Luis';
  }
  if (['catamarca', 'san fernando del valle de catamarca'].includes(clean)) {
    return 'Catamarca';
  }
  if (['la rioja', 'chilecito'].includes(clean)) {
    return 'La Rioja';
  }
  if (['la pampa', 'santa rosa', 'general pico'].includes(clean)) {
    return 'La Pampa';
  }
  if (['santa cruz', 'rio gallegos', 'calafate', 'caleta olivia'].includes(clean)) {
    return 'Santa Cruz';
  }
  if (['tierra del fuego', 'tdf', 'ushuaia', 'rio grande', 'tolhuin'].includes(clean)) {
    return 'Tierra del Fuego';
  }

  // Búsqueda aproximada entre las 24 oficiales
  const match = JURISDICCIONES_ARGENTINA.find(j => {
    const normJ = j.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return normJ === clean || clean.includes(normJ);
  });

  return match || fallback;
}
