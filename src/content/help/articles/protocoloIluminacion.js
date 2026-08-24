// src/content/help/articles/protocoloIluminacion.js
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
  Sun, 
  BookOpen, 
  Calculator, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  Activity, 
  Sliders, 
  Clock, 
  ShieldCheck, 
  Sparkles,
  Layers,
  Table
} from 'lucide-react';

export const protocoloIluminacionHelp = {
  key: 'protocolo-iluminacion',
  title: 'Protocolo de Iluminación (Res. SRT 84/12)',
  subtitle: 'Guía oficial de medición, Anexo IV Dec. 351/79 y Método de la Cuadrícula',
  icon: Sun,
  tags: [
    'iluminacion', 
    'luxometro', 
    'srt-84-12', 
    'decreto-351', 
    'anexo-4', 
    'capitulo-12', 
    'iram-aadl-j2006', 
    'metodo-cuadricula', 
    'indice-local', 
    'uniformidad', 
    'lux'
  ],
  render: () => (
    <div className="space-y-6 text-slate-700">
      {/* Propósito y Marco Normativo */}
      <HelpPurpose>
        El **Protocolo de Medición de Iluminación en el Ambiente Laboral** es de cumplimiento obligatorio bajo la **Resolución SRT Nº 84/12** y el **Capítulo 12 (Anexo IV) del Decreto Reglamentario 351/79** (basado en la Norma IRAM-AADL J 20-06). Su finalidad es evaluar técnicamente la iluminancia existente en cada plano de trabajo para garantizar el confort visual, evitar la fatiga y prevenir accidentes laborales.
      </HelpPurpose>

      {/* 1. Marco Normativo y Exigencias Legales */}
      <HelpSection title="1. Marco Normativo y Niveles de Iluminación Exigidos" id="marco-normativo" icon={BookOpen}>
        <p className="text-xs text-slate-600 leading-relaxed">
          El <strong>Decreto 351/79 (Anexo IV)</strong> establece la iluminancia mínima requerida según la exigencia visual de cada actividad en dos tablas fundamentales:
        </p>

        {/* Tabla 1 Resumen */}
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
          <p className="font-bold text-slate-900 flex items-center gap-1.5 font-outfit uppercase tracking-wider">
            <Table className="h-4 w-4 text-[#468DFF]" /> Tabla 1 — Intensidad Media por Clase de Tarea Visual
          </p>
          <ul className="space-y-1.5 text-slate-600">
            <li className="flex justify-between items-start border-b border-slate-200/60 pb-1">
              <span><strong>Visión ocasional / Poco tránsito:</strong> Salas de calderas, depósitos voluminosos.</span>
              <span className="font-bold text-[#468DFF] ml-2 shrink-0">100 lux</span>
            </li>
            <li className="flex justify-between items-start border-b border-slate-200/60 pb-1">
              <span><strong>Tareas intermitentes ordinarias:</strong> Trabajos mecánicos simples, stock, máquinas pesadas.</span>
              <span className="font-bold text-[#468DFF] ml-2 shrink-0">100 a 300 lux</span>
            </li>
            <li className="flex justify-between items-start border-b border-slate-200/60 pb-1">
              <span><strong>Tareas moderadamente críticas y prolongadas:</strong> Oficinas, lectura, archivo, talleres generales.</span>
              <span className="font-bold text-[#468DFF] ml-2 shrink-0">300 a 750 lux</span>
            </li>
            <li className="flex justify-between items-start border-b border-slate-200/60 pb-1">
              <span><strong>Tareas severas y prolongadas (poco contraste):</strong> Trabajos finos, pintura de precisión, costura oscura.</span>
              <span className="font-bold text-[#468DFF] ml-2 shrink-0">750 a 1500 lux</span>
            </li>
            <li className="flex justify-between items-start border-b border-slate-200/60 pb-1">
              <span><strong>Tareas muy severas y minuciosas:</strong> Montajes delicados, matricería, calibración fina.</span>
              <span className="font-bold text-[#468DFF] ml-2 shrink-0">1500 a 3000 lux</span>
            </li>
            <li className="flex justify-between items-start">
              <span><strong>Tareas excepcionales / Cirugía:</strong> Quirófanos, áreas quirúrgicas especiales.</span>
              <span className="font-bold text-[#468DFF] ml-2 shrink-0">5000 a 10000 lux</span>
            </li>
          </ul>
        </div>

        <HelpTip title="Consulta de Tabla 2 Integrada">
          Al cargar los puntos de medición en la app, podés hacer clic en el botón <strong>"Ver Tabla 1 y 2"</strong> para buscar por rubro industrial exacto (alimenticia, metalúrgica, oficinas, textil, etc.) y cargar el valor en Lux con un solo clic.
        </HelpTip>
      </HelpSection>

      {/* 2. Método de la Cuadrícula */}
      <HelpSection title="2. Método de la Cuadrícula y Cálculo Geométrico" id="metodo-cuadricula" icon={Calculator}>
        <div className="space-y-3 text-xs">
          <p className="text-slate-600 leading-relaxed">
            El <strong>Método de la Cuadrícula</strong> (definido en la Res. SRT 84/12 y Anexo IV Dec. 351/79) determina la cantidad mínima de puntos de medición en base a las dimensiones del local y la altura de las luminarias:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200/80 space-y-1">
              <span className="font-bold text-[#0511F2] block">A. Índice de Local (I)</span>
              <code className="text-[11px] font-mono bg-white px-2 py-1 rounded border border-blue-200 block text-center text-[#468DFF]">
                I = (Largo × Ancho) / [Altura × (Largo + Ancho)]
              </code>
              <span className="text-[10px] text-slate-500 block">
                *Altura = Distancia vertical desde la luminaria al plano de trabajo.
              </span>
            </div>

            <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200/80 space-y-1">
              <span className="font-bold text-[#0511F2] block">B. Puntos Mínimos (N)</span>
              <code className="text-[11px] font-mono bg-white px-2 py-1 rounded border border-blue-200 block text-center text-[#468DFF]">
                N = (x + 2)²
              </code>
              <span className="text-[10px] text-slate-500 block">
                *x = Índice I redondeado al entero superior (Máx x = 4).
              </span>
            </div>
          </div>

          {/* Tabla de relación de cuadrícula */}
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            <table className="w-full text-left text-[11px]">
              <thead className="bg-slate-100 text-slate-700 font-bold">
                <tr>
                  <th className="p-2 border-b border-slate-200">Índice Corregido (x)</th>
                  <th className="p-2 border-b border-slate-200">Rango de Índice (I)</th>
                  <th className="p-2 border-b border-slate-200 text-center">Fórmula (x+2)²</th>
                  <th className="p-2 border-b border-slate-200 text-center font-bold text-[#468DFF]">Puntos (N)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                <tr>
                  <td className="p-2 font-bold">x = 1</td>
                  <td className="p-2">I &lt; 1.5</td>
                  <td className="p-2 text-center">(1 + 2)²</td>
                  <td className="p-2 text-center font-bold text-[#468DFF]">9 mediciones</td>
                </tr>
                <tr>
                  <td className="p-2 font-bold">x = 2</td>
                  <td className="p-2">1.5 ≤ I &lt; 2.5</td>
                  <td className="p-2 text-center">(2 + 2)²</td>
                  <td className="p-2 text-center font-bold text-[#468DFF]">16 mediciones</td>
                </tr>
                <tr>
                  <td className="p-2 font-bold">x = 3</td>
                  <td className="p-2">2.5 ≤ I &lt; 3.0</td>
                  <td className="p-2 text-center">(3 + 2)²</td>
                  <td className="p-2 text-center font-bold text-[#468DFF]">25 mediciones</td>
                </tr>
                <tr>
                  <td className="p-2 font-bold">x = 4</td>
                  <td className="p-2">I ≥ 3.0</td>
                  <td className="p-2 text-center">(4 + 2)²</td>
                  <td className="p-2 text-center font-bold text-[#468DFF]">36 mediciones</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Criterio de Uniformidad */}
          <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-1">
            <span className="font-bold text-amber-900 flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-amber-600" />
              3. Criterio de Uniformidad de Iluminancia
            </span>
            <p className="text-[11px] text-amber-900/90">
              En locales con iluminación general, la iluminancia mínima medida (<code className="font-mono bg-white px-1 rounded border border-amber-300">E_mín</code>) no debe ser inferior a la mitad del promedio general (<code className="font-mono bg-white px-1 rounded border border-amber-300">E_media / 2</code>):
            </p>
            <code className="text-xs font-mono font-bold text-amber-950 block text-center py-1">
              E_mín ≥ (E_media / 2)
            </code>
            <p className="text-[10px] text-amber-800 italic">
              Esto garantiza una distribución armónica sin sombras pronunciadas ni zonas oscuras perjudiciales para la visión.
            </p>
          </div>
        </div>
      </HelpSection>

      {/* 3. Guía Paso a Paso en la App */}
      <HelpSection title="3. Instructivo Paso a Paso de Carga en la App" id="paso-a-paso" icon={Sliders}>
        <HelpStep
          number={1}
          title="Encabezado: Cliente, Establecimiento y Condiciones"
        >
          Elegí la Razón Social y el Establecimiento inspeccionado. Indicá la fecha de medición y el horario de trabajo correspondiente (diurno o nocturno).
        </HelpStep>

        <HelpStep
          number={2}
          title="Datos del Instrumental (Luxómetro)"
        >
          Cargá la <strong>Marca, Modelo y Número de Serie</strong> del luxómetro utilizado, junto con la <strong>Fecha del Certificado de Calibración</strong> emitido por laboratorio autorizado.
        </HelpStep>

        <HelpStep
          number={3}
          title="Carga de Sectores y Puntos de Muestreo"
        >
          Por cada punto o sector relevado:
          <ul className="list-disc pl-4 space-y-1 mt-1">
            <li><strong>Sector y Puesto de Trabajo:</strong> Identificá el área física de trabajo.</li>
            <li><strong>Tipo de Iluminación y Fuente:</strong> Natural, artificial (LED, fluorescente, vapor de sodio) o mixta.</li>
            <li><strong>Dimensiones del Recinto:</strong> Ingresá Largo (m), Ancho (m) y Altura de montaje de la luminaria (m). La app calculará automáticamente el <em>Índice de Local</em> y la cantidad de mediciones recomendadas por cuadrícula.</li>
            <li><strong>Valor Requerido Legal (Lux):</strong> Indicá la exigencia según Tabla 1 o Tabla 2 del Dec. 351/79.</li>
            <li><strong>Mediciones en Lux:</strong> Cargá los valores medidos en los puntos de la cuadrícula.</li>
          </ul>
        </HelpStep>

        <HelpStep
          number={4}
          title="Evaluación Automática de Resultados y Uniformidad"
        >
          El sistema computa en tiempo real:
          <ul className="list-disc pl-4 space-y-1 mt-1">
            <li><strong>Iluminancia Media (E_media):</strong> Promedio de las mediciones tomadas.</li>
            <li><strong>Verificación Legal:</strong> Compara <code className="font-mono">E_media ≥ E_req</code>.</li>
            <li><strong>Verificación de Uniformidad:</strong> Compara <code className="font-mono">E_mín ≥ E_media / 2</code>.</li>
          </ul>
          <div className="flex flex-wrap gap-1.5 pt-1.5">
            <HelpBadge label="Cumple" variant="green" />
            <HelpBadge label="Parcial" variant="amber" />
            <HelpBadge label="No Cumple" variant="red" />
          </div>
        </HelpStep>

        <HelpStep
          number={5}
          title="Conclusiones Técnicas y Recomendaciones Normalizadas"
        >
          El formulario precarga conclusiones y recomendaciones tipo según el Dec. 351/79 (limpieza de luminarias, redistribución de artefactos, incorporación de iluminación localizada). Podés editar o complementar el texto con tus observaciones profesionales.
        </HelpStep>

        <HelpStep
          number={6}
          title="Firma Digital y Emisión del Protocolo SRT 84/12 en PDF"
        >
          Validá con la firma digital del profesional actuante y generá el PDF oficial con las tablas normalizadas de puntos, mediciones, conclusiones y dictamen técnico.
        </HelpStep>
      </HelpSection>

      {/* 4. Preguntas Frecuentes */}
      <HelpSection title="4. Preguntas Frecuentes y Consejos Técnicos" id="faqs" icon={Activity}>
        <HelpFaq question="¿A qué altura se debe colocar el sensor del luxómetro?">
          Las mediciones deben realizarse a la altura del plano de trabajo real (ej. plano de la mesa de escritorio, mesada de trabajo o banco de taller). Si no existe un plano específico, la altura normalizada por defecto es de <strong>0,75 m sobre el nivel del suelo</strong>.
        </HelpFaq>

        <HelpFaq question="¿Cómo evitar errores de sombra durante la medición?">
          El técnico debe ubicarse de espaldas a la fuente de luz de modo que su cuerpo o ropa no proyecte sombras sobre la fotocelda, manteniendo el sensor completamente horizontal.
        </HelpFaq>

        <HelpFaq question="¿Qué hacer si un punto da 'No Cumple' o 'Parcial'?">
          El sistema te permite documentar las recomendaciones correctivas obligatorias (ej. recambio a paneles LED de mayor flujo, limpieza de difusores o reubicación de planos de trabajo) para regularizar el desvío.
        </HelpFaq>

        <HelpFaq question="¿Qué vigencia tiene el Protocolo de Iluminación?">
          Se recomienda una frecuencia anual de medición o ante cualquier reforma edilicia, relocalización de puestos de trabajo o sustitución del sistema de luminarias.
        </HelpFaq>
      </HelpSection>
    </div>
  )
};
