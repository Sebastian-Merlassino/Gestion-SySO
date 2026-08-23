// src/content/help/articles/protocoloErgonomia.js
import React from 'react';
import { 
  HelpPurpose, 
  HelpStep, 
  HelpTip, 
  HelpWarning, 
  HelpFaq, 
  HelpSection,
  HelpBadge 
} from '@/components/help/HelpComponents';
import { 
  PersonStanding, 
  BookOpen, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  Activity, 
  Sliders, 
  Clock, 
  ShieldCheck, 
  Sparkles,
  Layers,
  ArrowRight
} from 'lucide-react';

export const protocoloErgonomiaHelp = {
  key: 'protocolo-ergonomia',
  title: 'Protocolo de Ergonomía (Res. SRT 886/15)',
  subtitle: 'Guía oficial integral de evaluación ergonómica y llenado de Planillas 1 a 4',
  icon: PersonStanding,
  tags: ['ergonomia', 'srt-886-15', 'planilla-1', 'planilla-2', 'planilla-3', 'planilla-4', 'niosh', 'rula', 'reba', 'nam', 'posturas', 'esfuerzos', 'repetitividad', 'bipedestacion', 'tme'],
  render: () => (
    <div className="space-y-6 text-slate-700">
      {/* Propósito y Marco Legal */}
      <HelpPurpose>
        El **Protocolo de Ergonomía Laboral** es el instrumento legal obligatorio establecido por la **Resolución SRT Nº 886/15** de la Superintendencia de Riesgos del Trabajo para identificar, evaluar y gestionar los factores de riesgo biomecánicos y ergonómicos en todos los establecimientos laborales del país, previniendo **Trastornos Músculo-Esqueléticos (TME)**, hernias discales, tendinitis y enfermedades profesionales asociadas (Decretos 658/96 y 49/14).
      </HelpPurpose>

      {/* 1. Marco Normativo y Criterios Básicos */}
      <HelpSection title="1. Marco Normativo y Criterio de Aplicación" id="marco-normativo" icon={BookOpen}>
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
          <p className="font-bold text-slate-900 flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-[#468DFF]" />
            ¿Cuándo evaluar por Puesto de Trabajo y cuándo por Trabajador?
          </p>
          <ul className="list-disc pl-4 space-y-1.5 text-slate-600">
            <li>
              <strong>Por Puesto de Trabajo:</strong> Cuando varios trabajadores desempeñan las mismas tareas durante la jornada bajo condiciones operativas y ambientales similares.
            </li>
            <li>
              <strong>Por Trabajador Individual:</strong> En los siguientes 3 casos específicos:
              <ol className="list-decimal pl-4 mt-1 space-y-0.5 text-slate-600">
                <li>Realiza tareas con características o exigencias diferentes al resto del equipo.</li>
                <li>Denunció alguna enfermedad profesional contemplada en la normativa.</li>
                <li>Presenta <em>manifestaciones tempranas de fatiga, dolor o disconfort</em> comunicadas al Servicio Médico, de Higiene y Seguridad, supervisor o delegado.</li>
              </ol>
            </li>
          </ul>
        </div>

        <HelpTip title="Vigencia Legal y Plazos (Art. 3 y Anexo I)">
          Los resultados plasmados en la Planilla Nº 1 tienen una vigencia de <strong>UN (1) AÑO</strong> calendario, siempre que no existan modificaciones en el proceso productivo, herramientas, ritmo de trabajo, o se denuncien accidentes/enfermedades laborales.
        </HelpTip>
      </HelpSection>

      {/* 2. Estructura de las 4 Planillas SRT 886/15 */}
      <HelpSection title="2. Estructura Oficial de Planillas (1 a 4)" id="planillas-srt" icon={Layers}>
        <div className="grid grid-cols-1 gap-2.5 text-xs">
          <div className="p-3 rounded-xl border border-blue-200 bg-blue-50/50">
            <span className="font-bold text-[#0511F2] block mb-1">📋 Planilla Nº 1 — Identificación de Factores de Riesgo</span>
            <span>Screening preliminar por puesto o trabajador para hasta 3 tareas habituales, detectando presencia de los 8 factores ergonómicos.</span>
          </div>

          <div className="p-3 rounded-xl border border-amber-200 bg-amber-50/50">
            <span className="font-bold text-amber-900 block mb-1">🔍 Planilla Nº 2 — Evaluación Inicial de Factores de Riesgo</span>
            <span>Cuestionarios específicos en 2 pasos para cada factor detectado en Planilla 1 (Subplanillas 2.A a 2.I).</span>
          </div>

          <div className="p-3 rounded-xl border border-purple-200 bg-purple-50/50">
            <span className="font-bold text-purple-900 block mb-1">🛠️ Planilla Nº 3 — Medidas Preventivas Generales y Específicas</span>
            <span>Acciones administrativas y de ingeniería a implementar para mitigar o eliminar los factores de riesgo no tolerables.</span>
          </div>

          <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/50">
            <span className="font-bold text-emerald-900 block mb-1">📊 Planilla Nº 4 — Matriz de Seguimiento y Verificación</span>
            <span>Cronograma de fechas de implementación, responsable y verificación de eficacia (cierre a los 30 días posteriores).</span>
          </div>
        </div>
      </HelpSection>

      {/* 3. Guía Paso a Paso en la Plataforma */}
      <HelpSection title="3. Instructivo Paso a Paso de Carga en la App" id="paso-a-paso" icon={Sliders}>
        <HelpStep
          number={1}
          title="Encabezado: Cliente, Establecimiento y Puesto"
        >
          Seleccioná la Razón Social y la Sede de trabajo. Indicá:
          <ul className="list-disc pl-4 space-y-1 mt-1">
            <li><strong>Área / Sector y Puesto de Trabajo:</strong> Podés seleccionarlo de la lista desplegable o tipear uno manual.</li>
            <li><strong>Cantidad de Trabajadores Expuestos:</strong> Total de operarios masculinos y femeninos en dicho puesto.</li>
            <li><strong>Tareas Principales del Puesto:</strong> Describí brevemente hasta 3 tareas habituales que componen la jornada (ej. <em>Tarea 1: Carga manual de bolsas; Tarea 2: Fraccionamiento; Tarea 3: Paletizado</em>).</li>
          </ul>
        </HelpStep>

        <HelpStep
          number={2}
          title="Planilla Nº 1: Identificación de Factores de Riesgo (SÍ / NO)"
        >
          Para cada una de las tareas cargadas, marcá si existe presencia de:
          <ul className="list-disc pl-4 space-y-1 mt-1">
            <li><strong>1. Levantamiento / Descenso:</strong> Manejo manual de cargas &gt; 2 kg.</li>
            <li><strong>2. Empuje y Arrastre:</strong> Traslado rodante o deslizante de objetos.</li>
            <li><strong>3. Transporte Manual:</strong> Desplazamiento sosteniendo cargas &gt; 2 kg a más de 1 metro.</li>
            <li><strong>4. Bipedestación:</strong> Trabajo de pie continuo (&gt; 2h) o acumulado (&gt; 4h).</li>
            <li><strong>5. Movimientos Repetitivos:</strong> Ciclos de trabajo &lt; 30 seg o movimientos repetitivos de brazos/manos en más del 50% de la tarea.</li>
            <li><strong>6. Posturas Forzadas:</strong> Tronco flexionado &gt; 20°, torsiones, brazos elevados sin apoyo, cuclillas.</li>
            <li><strong>7. Vibraciones:</strong> Uso de herramientas percutoras (mano-brazo) o conducción de autoelevadores/maquinaria pesada (cuerpo entero).</li>
            <li><strong>8. Confort Térmico / Estrés de Contacto:</strong> Frío/calor extremo o apoyos del cuerpo contra bordes filosos o superficies duras.</li>
          </ul>
        </HelpStep>

        <HelpStep
          number={3}
          title="Planilla Nº 2: Evaluación Inicial (Subplanillas 2.A a 2.I)"
        >
          Por cada factor marcado como <strong>SÍ</strong> en la Planilla 1, el sistema activará automáticamente su correspondiente sub-planilla de evaluación en dos fases:
          <ul className="list-disc pl-4 space-y-1 mt-1">
            <li><strong>Paso 1 (Límites Básicos):</strong> Evalúa pesos, distancias y frecuencias elementales. Si las respuestas son "NO", el riesgo se clasifica como <strong>Tolerable (Nivel 1)</strong>.</li>
            <li><strong>Paso 2 (Condiciones Críticas y Posturas):</strong> Si se superan los límites del Paso 1, se analizan asimetrías, giros, altura de agarre y presencia de síntomas tempranos. Si alguna respuesta es "SÍ", el factor es <strong>No Tolerable</strong> y exige Evaluación de Riesgo Específica.</li>
          </ul>
        </HelpStep>

        <HelpStep
          number={4}
          title="Evaluación de Riesgo Específica y Métodos Ergonómicos (Res. MTEySS 295/03 y Res. SRT 3345/15)"
        >
          Cuando un factor resulte <em>No Tolerable</em> en la Planilla 2, se debe consignar el método de evaluación ergonómica reconocido aplicado:
          <div className="my-2 p-2.5 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
            <p className="font-semibold text-slate-800">Métodos Ergonómicos y Normativa Aplicable:</p>
            <ul className="list-disc pl-4 space-y-1 text-[11px] text-slate-600">
              <li><strong>Resolución SRT Nº 3345/15 (Límites de Empuje, Arrastre y Traslado de Cargas):</strong> Establece las fuerzas máximas iniciales y de mantenimiento para traslado, empuje o arrastre manual de cargas según normas <strong>ISO 11228-1 e ISO 11228-2</strong> (medidas con dinamómetro).</li>
              <li><strong>Ecuación NIOSH / Tablas Levantamiento Res. MTEySS 295/03:</strong> Manipulación manual de cargas sin traslado.</li>
              <li><strong>Nivel de Actividad Manual (NAM / ACGIH):</strong> Movimientos repetitivos del segmento mano-muñeca-antebrazo.</li>
              <li><strong>Método RULA / REBA:</strong> Posturas forzadas, sobrecarga biomecánica de miembros superiores y cuerpo entero.</li>
              <li><strong>Check-List OCRA / JSI:</strong> Alta repetitividad y ciclos de trabajo intensivos.</li>
              <li><strong>Tablas de Snook y Ciriello:</strong> Evaluación psicofísica de fuerzas y capacidades de transporte.</li>
            </ul>
          </div>
          <div className="flex flex-wrap gap-1.5 pt-1">
            <HelpBadge label="Nivel 1: Tolerable (Verde)" variant="green" />
            <HelpBadge label="Nivel 2: Moderado (Amarillo)" variant="amber" />
            <HelpBadge label="Nivel 3: No Aceptable (Rojo)" variant="red" />
          </div>
        </HelpStep>

        <HelpStep
          number={5}
          title="Planilla Nº 3 y 4: Medidas Preventivas y Matriz de Seguimiento"
        >
          <ul className="list-disc pl-4 space-y-1">
            <li><strong>Medidas Preventivas Generales (Planilla 3.A):</strong> Capacitación en ergonomía, pausas de elongación, exámenes periódicos.</li>
            <li><strong>Medidas Específicas de Ingeniería y Administrativas (Planilla 3.B):</strong> Regulación de mesas de trabajo, elevadores hidráulicos, carros con ruedas de bajo rozamiento, rotación programada.</li>
            <li><strong>Seguimiento (Planilla 4):</strong> Registro de fechas de implementación y verificación de efectividad a los 30 días posteriores.</li>
          </ul>
        </HelpStep>

        <HelpStep
          number={6}
          title="Conclusiones, Fotos, Croquis y Firmas Digitales"
        >
          Adjuntá fotografías de las posturas relevadas, subí el croquis del puesto y completá las conclusiones técnicas. El sistema estampará las firmas digitales del Responsable SySO, Médico Laboral y Empleador.
        </HelpStep>
      </HelpSection>

      {/* 4. Preguntas Frecuentes y Consejos Prácticos */}
      <HelpSection title="4. Preguntas Frecuentes y Criterios SRT" id="faqs" icon={Activity}>
        <HelpFaq question="¿Quiénes deben firmar obligatoriamente el Protocolo SRT 886/15?">
          Según el punto 6 del Anexo I, las 4 planillas deben estar firmadas por:
          1) El Responsable del Servicio de Higiene y Seguridad en el Trabajo.
          2) El Responsable del Servicio de Medicina del Trabajo.
          3) El Empleador responsable del establecimiento o su representante legal.
        </HelpFaq>

        <HelpFaq question="¿Qué plazo existe para verificar las medidas implementadas?">
          Se debe realizar una reevaluación ergonómica dentro de los <strong>TREINTA (30) DÍAS posteriores</strong> a la fecha de implementación de las medidas de ingeniería o administrativas para asegurar que el nivel de riesgo haya descendido a Tolerable (Nivel 1).
        </HelpFaq>

        <HelpFaq question="¿Qué ocurre si un puesto tiene más de 3 tareas?">
          El formato oficial prevé 3 tareas base por planilla. En puestos complejos con más de 3 tareas, el sistema te permite duplicar o anexar bloques adicionales para cubrir la totalidad de las actividades del puesto.
        </HelpFaq>

        <HelpFaq question="¿Es obligatorio hacer la Planilla 2 si en la Planilla 1 todos los factores dieron NO?">
          No. Si en la Planilla 1 todos los factores fueron tildados como "NO", el puesto se considera en Nivel 1 (Tolerable) y se concluye el protocolo archivándolo en el Legajo Técnico con vigencia de 1 año.
        </HelpFaq>
      </HelpSection>
    </div>
  )
};
