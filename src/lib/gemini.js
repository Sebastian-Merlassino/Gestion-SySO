// src/lib/gemini.js

/**
 * Llama a la API de Google Gemini utilizando un pool de modelos y reintentos automáticos
 * ante errores de cuota (429) o sobrecarga (503).
 * 
 * @param {Object} params
 * @param {Array} params.contents - Contenido del mensaje (formato oficial de la API de Gemini)
 * @param {string} [params.systemInstruction] - Instrucción del sistema opcional
 * @param {Object} [params.generationConfig] - Configuración de generación opcional (ej: responseMimeType)
 * @returns {Promise<Object>} - La respuesta parseada de la API de Gemini
 */
export async function callGemini({ contents, systemInstruction, generationConfig }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY no está configurada.');
  }

  // Pool de modelos estables de producción en la API v1beta
  const models = [
    'gemini-3.1-flash-lite',
    'gemini-3.5-flash',
    'gemini-3-flash',
    'gemini-2.5-flash-lite',
    'gemini-1.5-flash',
    'gemini-flash-latest',
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-1.5-pro'
  ];

  let lastError = null;
  let lastStatus = 500;

  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const body = { contents };
    if (systemInstruction) {
      body.systemInstruction = {
        parts: [{ text: systemInstruction }]
      };
    }
    if (generationConfig) {
      body.generationConfig = generationConfig;
    }

    try {
      console.log(`[Gemini Helper] Llamando a modelo: ${model} (Intento ${i + 1}/${models.length})`);
      const response = await fetch(geminiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`[Gemini Helper] Llamada exitosa con el modelo: ${model}`);
        return data;
      }

      lastStatus = response.status;
      const errorText = await response.text();
      console.warn(`[Gemini Helper] El modelo ${model} falló con status ${response.status}:`, errorText);

      let errJson = {};
      try {
        errJson = JSON.parse(errorText);
      } catch (e) {}
      lastError = errJson.error?.message || errorText || 'Error desconocido';

      // Si no es un error temporal/de carga (429 o 503), no tiene sentido probar otros modelos
      if (response.status !== 429 && response.status !== 503) {
        break;
      }

      // Si es un error temporal (429/503) y quedan modelos por intentar, esperamos 1 segundo antes del fallback
      if (i < models.length - 1) {
        console.log(`[Gemini Helper] Error temporal detectado. Esperando 1 segundo antes de reintentar con el siguiente modelo...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (fetchErr) {
      console.error(`[Gemini Helper] Error de red con el modelo ${model}:`, fetchErr);
      lastError = fetchErr.message;
      lastStatus = 500;

      if (i < models.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  // Si todos los modelos fallaron o salimos por un error de cliente (400, etc.)
  throw { message: lastError, status: lastStatus };
}
