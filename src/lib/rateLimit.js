// src/lib/rateLimit.js

// Almacenamiento local en memoria (Map) para desarrollo, testing local o fallback.
const rateLimitMap = new Map();

// Limpieza automática cada 5 minutos de registros vencidos en memoria
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of rateLimitMap.entries()) {
      if (now > record.resetTime) {
        rateLimitMap.delete(key);
      }
    }
  }, 5 * 60 * 1000).unref?.();
}

/**
 * Verifica si la petición excede el rate limit de la ventana de tiempo.
 * 
 * Soportará Upstash Redis REST si las variables de entorno correspondientes
 * están configuradas. De lo contrario, o ante fallos de conexión, hace fallback en memoria.
 * 
 * @param {string} ip - IP del cliente
 * @param {string} route - Identificador de la ruta / API
 * @param {number} limit - Máximo de peticiones permitidas en la ventana
 * @param {number} windowMs - Duración de la ventana en milisegundos (defecto 15 min)
 * @returns {Promise<{ success: boolean, limit: number, remaining: number, resetTime: number }>}
 */
export async function checkRateLimit(ip, route, limit = 100, windowMs = 15 * 60 * 1000) {
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  // En staging o producción, exigir obligatoriamente Upstash Redis para evitar bypasses en Vercel
  const isEnvRestricted = process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging';
  if (isEnvRestricted && (!redisUrl || !redisToken)) {
    throw new Error('[RateLimit] Se requiere la configuración de Upstash Redis (UPSTASH_REDIS_REST_URL y UPSTASH_REDIS_REST_TOKEN) en producción/staging.');
  }

  if (redisUrl && redisToken) {
    try {
      const key = `ratelimit:${ip}:${route}`;
      const windowSeconds = Math.ceil(windowMs / 1000);

      // Enviamos un pipeline HTTP POST a Upstash Redis REST
      // 1. Incrementamos la clave
      // 2. Obtenemos el TTL de la clave
      // 3. Establecemos expiración con la opción NX (solo si no tiene expiración previa)
      const response = await fetch(`${redisUrl}/pipeline`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${redisToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify([
          ['INCR', key],
          ['TTL', key],
          ['EXPIRE', key, windowSeconds, 'NX']
        ]),
        // Agregamos timeout de 2 segundos para evitar demoras si la conexión REST es inestable
        signal: AbortSignal.timeout ? AbortSignal.timeout(2000) : undefined
      });

      if (response.ok) {
        const results = await response.json();

        // El pipeline responde con una lista de objetos: [{ result: 1 }, { result: 900 }, { result: 1 }]
        if (Array.isArray(results) && results.length === 3) {
          const countResult = results[0];
          const ttlResult = results[1];

          if (countResult && typeof countResult.result === 'number') {
            const count = countResult.result;
            const ttl = ttlResult && typeof ttlResult.result === 'number' ? ttlResult.result : -1;

            const now = Date.now();
            // Si el TTL era -1 (no existía), el reinicio ocurrirá en now + windowMs.
            // Si el TTL es positivo, calculamos el reinicio a partir de la expiración real en Redis.
            const resetTime = (ttl === -1 || ttl <= 0)
              ? now + windowMs
              : now + (ttl * 1000);

            const remaining = Math.max(0, limit - count);

            return {
              success: count <= limit,
              limit,
              remaining,
              resetTime
            };
          }
        }
        console.warn('[RateLimit Redis] Respuesta inesperada del pipeline de Upstash Redis, usando fallback local.');
      } else {
        console.warn(`[RateLimit Redis] Error HTTP ${response.status} en Upstash Redis REST, usando fallback local.`);
      }
    } catch (err) {
      console.error('[RateLimit Redis Error] Fallo al conectar con Upstash Redis REST, usando fallback local:', err.message || err);
    }
  }

  // --- FALLBACK: Almacenamiento local en memoria ---
  const key = `${ip}:${route}`;
  const now = Date.now();

  let record = rateLimitMap.get(key);

  if (!record || now > record.resetTime) {
    record = {
      count: 0,
      resetTime: now + windowMs
    };
  }

  record.count += 1;
  rateLimitMap.set(key, record);

  const remaining = Math.max(0, limit - record.count);

  return {
    success: record.count <= limit,
    limit,
    remaining,
    resetTime: record.resetTime
  };
}

/**
 * Retorna las cabeceras HTTP estándares para control de rate limit.
 */
export function getRateLimitHeaders(limit, remaining, resetTime) {
  return {
    'X-RateLimit-Limit': limit.toString(),
    'X-RateLimit-Remaining': remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(resetTime / 1000).toString()
  };
}

