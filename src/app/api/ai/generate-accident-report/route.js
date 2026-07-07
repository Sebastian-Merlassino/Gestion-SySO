// src/app/api/ai/generate-accident-report/route.js
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const cookieStore = cookies();

    const serverClient = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value;
        },
      },
    });

    const { data: { user }, error: authError } = await serverClient.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'No autorizado. Debe iniciar sesión.' },
        { status: 401 }
      );
    }

    const { accidentData, additionalComments } = await req.json();

    if (!accidentData) {
      return NextResponse.json({ error: 'Los datos del accidente son obligatorios' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('Error: GEMINI_API_KEY no está configurada en las variables de entorno.');
      return NextResponse.json(
        { error: 'El servicio de IA no está configurado (falta la clave de API).' },
        { status: 500 }
      );
    }

    // Instrucciones del sistema estructuradas para obtener JSON de análisis
    const systemInstruction = `Sos un Asistente especialista en Higiene y Seguridad en el Trabajo en Argentina, con amplia experiencia en la normativa argentina (Ley 19.587, Decreto 351/79, Resoluciones de la SRT) y en sistemas de gestión ISO 45001:2018.
Tu único objetivo es analizar el accidente, incidente de trabajo o enfermedad profesional provisto por el usuario y elaborar un informe técnico detallado.

Debes responder estrictamente en formato JSON utilizando las siguientes claves:
- "acciones_preventivas": Un arreglo de exactamente entre 2 y 4 elementos. Cada elemento debe ser un objeto con las claves:
    * "descripcion" (string): La acción preventiva propuesta (lenguaje técnico, objetivo y formal).
    * "responsable" (string): El cargo o responsable sugerido (ej: "Supervisor de Área", "Jefe de Mantenimiento", "Líder de Seguridad").
    * "fecha_planificada" (string): Plazo sugerido para implementarla (ej: "7 días", "15 días", "Inmediato").
    * "fecha_implementacion" (string): Dejar vacío "".
- "ishikawa": Un objeto con las claves correspondientes al método de las 6 M:
    * "material" (string): Análisis de los factores relacionados con materias primas, insumos, repuestos o materiales.
    * "maquinaria" (string): Análisis de factores relacionados con máquinas, herramientas, equipos o instalaciones eléctricas e hidráulicas.
    * "metodo" (string): Análisis de desvíos en el procedimiento operativo, instructivos, permisos de trabajo o su ausencia.
    * "mano_de_obra" (string): Análisis del factor humano, aptitud, capacitación recibida, fatiga o prácticas fuera de norma.
    * "medio" (string): Análisis de las condiciones de contorno ambientales (iluminación, ruido, orden, limpieza, ordenamiento).
    * "medida" (string): Análisis de controles, auditorías previas, mediciones ambientales o test de calibración aplicables.
- "cinco_porques": Un arreglo de EXACTAMENTE 5 strings (nunca más ni menos). Si el análisis técnico natural tiene más o menos causas, debes resumir, unificar o sintetizar las causas en exactamente 5 porqués lógicos y consecutivos. Cada elemento representa la respuesta técnica a la causa anterior.
- "causa_raiz": Un string con la definición técnica e integral de la causa raíz identificada (derivada del 5° porqué).
- "acciones_correctivas": Un arreglo de exactamente entre 2 y 4 elementos. Cada elemento debe ser un objeto con las claves:
    * "descripcion" (string): La acción correctiva propuesta para eliminar la causa raíz y evitar la recurrencia del siniestro.
    * "responsable" (string): El responsable sugerido.
    * "fecha_planificada" (string): Plazo de ejecución sugerido (ej: "15 días", "30 días").
    * "fecha_implementacion" (string): Dejar vacío "".

Reglas obligatorias:
1. Utiliza lenguaje sumamente técnico, formal, objetivo y directo.
2. Mantén coherencia conceptual con la normativa argentina vigente e ISO 45001:2018, pero no cites ni menciones explícitamente leyes, decretos o resoluciones (ej: no menciones "Decreto 351/79" o "ISO 45001"), salvo que sea necesario conceptualmente.
3. No agregues introducciones, ni comentarios aclaratorios, ni notas fuera del JSON. Devuelve únicamente el objeto JSON.
4. Si faltan datos en la entrada para realizar un análisis correcto, rellena los campos del JSON con inferencias lógicas razonables y técnicas en base al contexto para no romper la respuesta, pero prioriza el análisis formal de los datos entregados.
5. El arreglo "cinco_porques" debe tener estrictamente 5 ítems. Debes resumir, condensar o unificar las deducciones necesarias para no sobrepasar ni quedar por debajo de este límite exacto.`;

    // Formatear el prompt de entrada con el contexto integral del siniestro
    const userMessage = `Por favor, analiza el siguiente evento y genera el informe técnico:

Datos del Trabajador:
- Nombre y Apellido: ${accidentData.nombre_trabajador || 'No especificado'}
- CUIL: ${accidentData.cuil || 'No especificado'}
- Fecha de ingreso: ${accidentData.fecha_ingreso || 'No especificado'}
- Antigüedad en la empresa: ${accidentData.antiguedad_empresa || 'No especificada'}
- Antigüedad en el puesto: ${accidentData.antiguedad_puesto || 'No especificada'}

Datos de la Tarea:
- Área / Sector: ${accidentData.area_sector || 'No especificado'}
- Puesto de trabajo / Operación: ${accidentData.puesto_operacion || 'No especificado'}
- Turno de trabajo habitual: ${accidentData.turno_trabajo || 'No especificado'}
- Jornada habitual de trabajo: ${accidentData.jornada_habitual || 'No especificada'}

Datos del Siniestro y Ubicación:
- Fecha y hora del siniestro: ${accidentData.fecha_siniestro || 'No especificado'} ${accidentData.hora || ''}
- Tipo de evento: ${accidentData.tipo || 'No especificado'}
- Gravedad del siniestro: ${accidentData.gravedad || 'No especificado'}
- Lugar / Domicilio de ocurrencia: ${accidentData.domicilio_ocurrencia || 'No especificado'}, ${accidentData.localidad_barrio_ocurrencia || ''}, ${accidentData.partido_ocurrencia || ''}, ${accidentData.provincia_ocurrencia || ''}

Descripción detallada de los hechos:
${accidentData.descripcion_hechos || 'No especificado'}

Observaciones adicionales del usuario:
${additionalComments || 'Ninguna'}
`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: userMessage,
              },
            ],
          },
        ],
        systemInstruction: {
          parts: [
            {
              text: systemInstruction,
            },
          ],
        },
        generationConfig: {
          responseMimeType: "application/json",
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error de respuesta de Gemini API:', errorText);

      if (response.status === 429) {
        return NextResponse.json(
          { error: 'El servicio de IA (Gemini) ha superado su límite de solicitudes de cuota diaria. Por favor, esperá un minuto e intentá de nuevo.' },
          { status: 429 }
        );
      }

      return NextResponse.json(
        { error: 'Error en la comunicación con el servicio de IA.' },
        { status: response.status }
      );
    }

    const data = await response.json();
    const rawReportText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';

    if (!rawReportText) {
      throw new Error('No se recibió análisis de la API de Gemini.');
    }

    // Parsear el JSON devuelto por Gemini para verificar consistencia
    let parsedReport;
    try {
      parsedReport = JSON.parse(rawReportText);
    } catch (parseErr) {
      console.error('Error parseando JSON de Gemini:', parseErr, '\nTexto original:', rawReportText);
      return NextResponse.json(
        { error: 'La respuesta de la IA no posee un formato estructurado válido.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ report: parsedReport });
  } catch (error) {
    console.error('Error en el endpoint de generación de informe de accidente:', error);
    return NextResponse.json(
      { error: 'Ocurrió un error al procesar el informe de accidente.' },
      { status: 500 }
    );
  }
}
