// src/content/help/articles/protocoloRuido.js
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
  Volume2, 
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
  Table,
  Ear
} from 'lucide-react';

export const protocoloRuidoHelp = {
  key: 'protocolo-ruido',
  title: 'Protocolo de Ruido (Res. SRT 85/12)',
  subtitle: 'Guía oficial de evaluación sonora, Anexo V Dec. 351/79 y Res. MTEySS 295/03',
  icon: Volume2,
  tags: [
    'ruido', 
    'decibeles', 
    'srt-85-12', 
    'decreto-351', 
    'capitulo-13', 
    'anexo-5', 
    'res-295-03', 
    'laeq', 
    'dosimetria', 
    'sonometro', 
    'dosis', 
    'epp-auditivo', 
    'nrr', 
    'nsce'
  ],
  render: () => (
    <div className="space-y-6 text-slate-700">
      {/* Propósito y Marco Legal */}
      <HelpPurpose>
        El **Protocolo de Medición de Ruido en el Ambiente Laboral** da cumplimiento a la **Resolución SRT Nº 85/12**, el **Capítulo 13 (Anexo V) del Decreto 351/79** y la **Resolución MTEySS Nº 295/03 (Anexo V)**. Su objetivo es evaluar la exposición sonora continua, intermitente o de impacto a la que están sometidos los trabajadores en sus puestos, garantizando que no se supere la dosis máxima admisible para prevenir la hipoacusia perceptiva laboral y daños a la salud.
      </HelpPurpose>

      {/* 1. Marco Normativo y Límites Permisibles */}
      <HelpSection title="1. Marco Normativo y Límites de Exposición Sonora" id="marco-normativo" icon={BookOpen}>
        <p className="text-xs text-slate-600 leading-relaxed">
          La legislación argentina establece un <strong>Nivel Límite Ponderado de 85 dBA</strong> para una jornada habitual de <strong>8 horas diarias</strong>, con una <strong>Tasa de Intercambio de 3 dBA</strong> (por cada incremento de 3 dBA, el tiempo máximo de permanencia permitido se reduce a la mitad):
        </p>

        {/* Tabla de Límites Res. 295/03 */}
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
          <p className="font-bold text-slate-900 flex items-center gap-1.5 font-outfit uppercase tracking-wider">
            <Table className="h-4 w-4 text-[#468DFF]" /> Tabla de Valores Límite de Exposición Diaria (Res. 295/03 Anexo V)
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-slate-600 pt-1">
            <div className="flex justify-between items-center border-b border-slate-200/60 pb-1">
              <span><strong>8 horas:</strong></span>
              <span className="font-bold text-[#468DFF]">85 dBA</span>
            </div>
            <div className="flex justify-between items-center border-b border-slate-200/60 pb-1">
              <span><strong>4 horas:</strong></span>
              <span className="font-bold text-[#468DFF]">88 dBA</span>
            </div>
            <div className="flex justify-between items-center border-b border-slate-200/60 pb-1">
              <span><strong>2 horas:</strong></span>
              <span className="font-bold text-[#468DFF]">91 dBA</span>
            </div>
            <div className="flex justify-between items-center border-b border-slate-200/60 pb-1">
              <span><strong>1 hora:</strong></span>
              <span className="font-bold text-[#468DFF]">94 dBA</span>
            </div>
            <div className="flex justify-between items-center border-b border-slate-200/60 pb-1">
              <span><strong>30 minutos:</strong></span>
              <span className="font-bold text-[#468DFF]">97 dBA</span>
            </div>
            <div className="flex justify-between items-center border-b border-slate-200/60 pb-1">
              <span><strong>15 minutos:</strong></span>
              <span className="font-bold text-[#468DFF]">100 dBA</span>
            </div>
            <div className="flex justify-between items-center border-b border-slate-200/60 pb-1">
              <span><strong>7,5 minutos:</strong></span>
              <span className="font-bold text-[#468DFF]">103 dBA</span>
            </div>
            <div className="flex justify-between items-center border-b border-slate-200/60 pb-1">
              <span><strong>3,75 minutos:</strong></span>
              <span className="font-bold text-[#468DFF]">106 dBA</span>
            </div>
          </div>
        </div>

        {/* Límite Techo de Impacto */}
        <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-xs text-amber-950 space-y-1">
          <p className="font-bold text-amber-900 flex items-center gap-1.5">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            Límite Techo para Ruidos de Impacto o Impulso
          </p>
          <p className="text-amber-900/90 leading-relaxed">
            No se permite ninguna exposición a ruido continuo, intermitente o de impacto no protegido que supere los <strong>140 dBC (Pico)</strong>.
          </p>
        </div>
      </HelpSection>

      {/* 2. Criterios de Evaluación y Dosis Acústica */}
      <HelpSection title="2. Criterios de Evaluación Técnica y Dosis Acústica" id="criterios-dosis" icon={Calculator}>
        <div className="space-y-3 text-xs">
          <p className="text-slate-600 leading-relaxed">
            El sistema admite las 3 modalidades técnicas contempladas en el protocolo oficial:
          </p>

          <div className="grid grid-cols-1 gap-2.5">
            <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200/80 space-y-1">
              <span className="font-bold text-[#0511F2] block">A. Nivel Sonoro Continuo Equivalente (LAeq,Te)</span>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Se mide con sonómetro integrador el nivel promedio en dBA ponderado 'A' con respuesta lenta (Slow), y se contrasta contra el límite calculado para el tiempo de permanencia real (<code className="font-mono bg-white px-1 rounded border">Te</code>):
              </p>
              <code className="text-[11px] font-mono bg-white px-2 py-0.5 rounded border border-blue-200 block text-center text-[#468DFF]">
                L_límite = 85 + 3 × log2(8 / Te)
              </code>
            </div>

            <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200/80 space-y-1">
              <span className="font-bold text-[#0511F2] block">B. Suma de Fracciones de Exposición (Exposición a Niveles Variables)</span>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Cuando un trabajador se expone a distintos niveles sonoros a lo largo del día, la suma de las fracciones de tiempo de permanencia (<code className="font-mono bg-white px-1 rounded border">C_i</code>) respecto al tiempo máximo permitido (<code className="font-mono bg-white px-1 rounded border">T_i</code>) no debe superar la unidad:
              </p>
              <code className="text-[11px] font-mono bg-white px-2 py-0.5 rounded border border-blue-200 block text-center text-[#468DFF]">
                D = (C1 / T1) + (C2 / T2) + ... + (Cn / Tn) ≤ 1,00
              </code>
            </div>

            <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200/80 space-y-1">
              <span className="font-bold text-[#0511F2] block">C. Dosis de Ruido Dosimétrica (%)</span>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Medición mediante dosímetro personal portado por el trabajador durante al menos el 80% de su jornada. La dosis diaria acumulada no debe superar el <strong>100%</strong> (criterio 85 dBA / tasa 3 dB).
              </p>
            </div>
          </div>
        </div>
      </HelpSection>

      {/* 3. Instructivo Paso a Paso */}
      <HelpSection title="3. Instructivo Paso a Paso de Carga en la App" id="paso-a-paso" icon={Sliders}>
        <HelpStep
          number={1}
          title="Encabezado: Cliente y Establecimiento"
        >
          Elegí la Razón Social y el Establecimiento inspeccionado. Indicá la fecha de medición.
        </HelpStep>

        <HelpStep
          number={2}
          title="Datos del Instrumental y Calibración Acústica"
        >
          Cargá:
          <ul className="list-disc pl-4 space-y-1 mt-1">
            <li><strong>Sonómetro / Dosímetro:</strong> Marca, Modelo, Número de Serie y Fecha de Certificado de Calibración en laboratorio autorizado.</li>
            <li><strong>Calibrador Acústico (Pistófono):</strong> Marca, Modelo, Número de Serie y nivel de calibración de referencia (ej. 94 dB / 114 dB a 1000 Hz).</li>
          </ul>
          <HelpTip>
            El instrumento debe haber sido calibrado en laboratorio acreditado (SAC/INTI) y contar con calibración vigente según las recomendaciones del fabricante y SRT.
          </HelpTip>
        </HelpStep>

        <HelpStep
          number={3}
          title="Carga de Puntos de Muestreo y Puestos de Trabajo"
        >
          Para cada punto de medición:
          <ul className="list-disc pl-4 space-y-1 mt-1">
            <li><strong>Sector y Puesto de Trabajo:</strong> Seleccioná de la estructura de la empresa.</li>
            <li><strong>Cantidad de Trabajadores Expuestos:</strong> Número de personas que realizan la tarea.</li>
            <li><strong>Características del Ruido:</strong> Continuo/Intermitente o Impulso/Impacto.</li>
            <li><strong>Valores Medidos:</strong> Cargá el <code className="font-mono">LAeq,Te</code> en dBA y las horas de permanencia diaria (<code className="font-mono">Te</code>), o bien la dosis porcentual/fracción.</li>
            <li><strong>Protección Auditiva (EPP):</strong> Registrá tipo de protector (copa, endoaural), marca, modelo, NRR y si los operarios lo utilizan en forma efectiva.</li>
          </ul>
        </HelpStep>

        <HelpStep
          number={4}
          title="Evaluación Automática y Semáforo de Cumplimiento"
        >
          La aplicación compara automáticamente el valor medido contra el límite normativo:
          <div className="flex flex-wrap gap-1.5 pt-1.5">
            <HelpBadge label="Cumple (Nivel seguro ≤ límite)" variant="green" />
            <HelpBadge label="No Cumple (Supera límite permisible)" variant="red" />
          </div>
        </HelpStep>

        <HelpStep
          number={5}
          title="Conclusiones Técnicas y Medidas Preventivas"
        >
          Completá las conclusiones profesionales y recomendaciones según la jerarquía de control:
          <ol className="list-decimal pl-4 space-y-1 mt-1 text-xs">
            <li><strong>Control en la Fuente:</strong> Mantenimiento mecánico, lubricación, amortiguadores de vibración, reemplazo de partes ruidosas.</li>
            <li><strong>Control en el Medio:</strong> Cerramientos acústicos, cabinas insonorizadas, pantallas fonoabsorbentes.</li>
            <li><strong>Control en el Receptor:</strong> Reducción de tiempos de exposición, rotación de personal, provisión de protectores auditivos certificados con NRR adecuado y audiometrías de control.</li>
          </ol>
        </HelpStep>

        <HelpStep
          number={6}
          title="Firma Digital y Emisión del Protocolo SRT 85/12 en PDF"
        >
          Validá el informe con la firma digital profesional y generá el documento oficial bajo el formato homologado por la Superintendencia de Riesgos del Trabajo.
        </HelpStep>
      </HelpSection>

      {/* 4. Preguntas Frecuentes */}
      <HelpSection title="4. Preguntas Frecuentes y Criterios Técnicos" id="faqs" icon={Activity}>
        <HelpFaq question="¿A qué distancia del oído debe ubicarse el micrófono?">
          En mediciones dosimétricas, el micrófono debe fijarse sobre la parte superior del hombro, a una distancia aproximada de <strong>10 a 20 cm del canal auditivo</strong> del trabajador. En sonometría de puesto, se ubica a la altura del oído en la posición habitual de trabajo orientando el micrófono hacia la fuente.
        </HelpFaq>

        <HelpFaq question="¿Qué ponderación de frecuencia y tiempo se utiliza?">
          Para ruido continuo o intermitente se utiliza <strong>ponderación de frecuencia 'A'</strong> y <strong>respuesta temporal lenta ('Slow')</strong>. Para ruidos de impacto o impulso se debe utilizar <strong>ponderación 'C' con respuesta de pico ('Peak')</strong>.
        </HelpFaq>

        <HelpFaq question="¿Cómo se calcula el nivel efectivo con protector auditivo (NRR)?">
          El nivel sonoro estimado que ingresa al canal auditivo con EPP se calcula mediante: <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-[11px]">L_efectivo = LAeq - (NRR - 7)</code>. Si el valor resultante es inferior a 85 dBA (preferentemente entre 75 y 80 dBA), el nivel de protección se considera adecuado.
        </HelpFaq>

        <HelpFaq question="¿Qué vigencia tiene el Protocolo de Ruido?">
          El protocolo tiene vigencia anual, o debe actualizarse cada vez que se incorporen nuevas maquinarias, se modifiquen los procesos productivos o se detecten signos de hipoacusia en los exámenes médicos periódicos.
        </HelpFaq>
      </HelpSection>
    </div>
  )
};
