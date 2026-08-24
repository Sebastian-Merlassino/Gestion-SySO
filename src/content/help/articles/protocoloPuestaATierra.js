// src/content/help/articles/protocoloPuestaATierra.js
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
  Zap, 
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
  Camera
} from 'lucide-react';

export const protocoloPuestaATierraHelp = {
  key: 'protocolo-puesta-a-tierra',
  title: 'Protocolo de Puesta a Tierra (Res. SRT 900/15)',
  subtitle: 'Guía de medición de resistencia (PAT), continuidad de masas y Dec. 351/79 Cap. 14',
  icon: Zap,
  tags: [
    'puesta-a-tierra', 
    'pat', 
    'srt-900-15', 
    'decreto-351', 
    'capitulo-14', 
    'anexo-6', 
    'aea-90364', 
    'iram-2281', 
    'telurometro', 
    'ohmios', 
    'continuidad', 
    'disyuntor', 
    'diferencial', 
    'esquema-tt'
  ],
  render: () => (
    <div className="space-y-6 text-slate-700">
      {/* Propósito y Marco Legal */}
      <HelpPurpose>
        El **Protocolo de Medición del Valor de Puesta a Tierra y Verificación de la Continuidad de las Masas** es de exigencia legal obligatoria bajo la **Resolución SRT Nº 900/15**, el **Capítulo 14 (Anexo VI) del Decreto 351/79**, la **Reglamentación AEA 90364** y la **Norma IRAM 2281**. Su fin es garantizar que las masas metálicas de la instalación estén equipotencializadas y conectadas a tierra, de modo que ante cualquier falla de aislación los dispositivos de protección desconecten automáticamente el suministro antes de que ocurra una electrocución o incendio.
      </HelpPurpose>

      {/* 1. Marco Normativo y Criterios Eléctricos */}
      <HelpSection title="1. Marco Normativo y Valores Límite de Resistencia" id="marco-normativo" icon={BookOpen}>
        <p className="text-xs text-slate-600 leading-relaxed">
          La <strong>Resolución SRT 900/15</strong> y la reglamentación <strong>AEA 90364</strong> establecen los valores admisibles de resistencia de tierra (<code className="font-mono bg-slate-100 px-1 rounded">R_A</code>) según el esquema de conexión y la protección asociada:
        </p>

        {/* Tabla de Criterios y Valores Límites */}
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
          <p className="font-bold text-slate-900 flex items-center gap-1.5 font-outfit uppercase tracking-wider">
            <Table className="h-4 w-4 text-[#468DFF]" /> Valores Límites Reglamentarios de Puesta a Tierra
          </p>
          <ul className="space-y-1.5 text-slate-600">
            <li className="flex justify-between items-start border-b border-slate-200/60 pb-1">
              <span><strong>Circuito con Interruptor Diferencial (ID ≤ 30 mA):</strong> Protección de personas contra contactos indirectos en esquema TT.</span>
              <span className="font-bold text-[#468DFF] ml-2 shrink-0">≤ 40 Ω</span>
            </li>
            <li className="flex justify-between items-start border-b border-slate-200/60 pb-1">
              <span><strong>Circuito sin Interruptor Diferencial:</strong> Masas protegidas solo por interruptores automáticos o fusibles.</span>
              <span className="font-bold text-[#468DFF] ml-2 shrink-0">≤ 10 Ω</span>
            </li>
            <li className="flex justify-between items-start border-b border-slate-200/60 pb-1">
              <span><strong>Sistema de Protección contra Descargas Atmosféricas (Pararrayos):</strong> Según Norma IRAM 2184.</span>
              <span className="font-bold text-[#468DFF] ml-2 shrink-0">≤ 10 Ω</span>
            </li>
            <li className="flex justify-between items-start">
              <span><strong>Puesta a Tierra de Equipos Electrónicos / Informática:</strong> Reducción de ruidos e interferencias de alta frecuencia.</span>
              <span className="font-bold text-[#468DFF] ml-2 shrink-0">≤ 5 Ω</span>
            </li>
          </ul>
        </div>

        {/* Vigencia Legal */}
        <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-xl text-xs text-blue-950 space-y-1">
          <p className="font-bold text-[#0511F2] flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-[#468DFF]" />
            Vigencia Legal Obligatoria (Art. 2 Res. SRT 900/15)
          </p>
          <p className="text-blue-900/90 leading-relaxed">
            La medición de puesta a tierra y el informe técnico tienen una <strong>vigencia legal máxima de UN (1) AÑO</strong> calendario.
          </p>
        </div>
      </HelpSection>

      {/* 2. Conceptos Técnicos Clave */}
      <HelpSection title="2. Parámetros Técnicos de Evaluación" id="parametros-tecnicos" icon={Calculator}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
            <span className="font-bold text-slate-800 block">Esquemas de Conexión a Tierra (ECT)</span>
            <ul className="list-disc pl-4 space-y-0.5 text-slate-600 text-[11px]">
              <li><strong>TT:</strong> Neutro de transformador a tierra y masas del usuario a tierra local independiente (el más difundido en Argentina).</li>
              <li><strong>TN-S / TN-C-S:</strong> Conductor de protección y neutro combinados o separados.</li>
              <li><strong>IT:</strong> Neutro aislado o impedante (quirófanos, procesos continuos).</li>
            </ul>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
            <span className="font-bold text-slate-800 block">Verificación de Continuidad de Masas</span>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Comprobación con óhmetro / telurímetro de que todas las estructuras metálicas, carcasas de motores, tableros y bornes de tierra de tomacorrientes posean conexión permanente de baja resistencia (&lt; 0,2 Ω) con el conductor equipotencial de protección (PE).
            </p>
          </div>
        </div>
      </HelpSection>

      {/* 3. Instructivo Paso a Paso */}
      <HelpSection title="3. Instructivo Paso a Paso de Carga en la App" id="paso-a-paso" icon={Sliders}>
        <HelpStep
          number={1}
          title="Encabezado: Cliente, Establecimiento y Horarios"
        >
          Seleccioná la Razón Social y la Sede de trabajo. Indicá la fecha de medición y los horarios de actividad.
        </HelpStep>

        <HelpStep
          number={2}
          title="Datos del Instrumental y Metodología"
        >
          Cargá:
          <ul className="list-disc pl-4 space-y-1 mt-1">
            <li><strong>Telurímetro:</strong> Marca, Modelo y Número de Serie del instrumento.</li>
            <li><strong>Fecha de Certificado de Calibración:</strong> Emitido por laboratorio acreditado.</li>
            <li><strong>Metodología:</strong> Método de caída de potencial (3 picas según Norma IRAM 2281 Parte II) o pinza de bucle de tierra.</li>
          </ul>
          <HelpTip title="Recomendación">
            El instrumento debe haber sido calibrado en laboratorio acreditado (SAC/INTI) y contar con calibración vigente según las recomendaciones del fabricante y SRT.
          </HelpTip>
        </HelpStep>

        <HelpStep
          number={3}
          title="Carga de Tomas de Tierra (Jabalinas / Mallas)"
        >
          Por cada toma de tierra relevada en la planta:
          <ul className="list-disc pl-4 space-y-1 mt-1">
            <li><strong>Sector y Uso:</strong> Seguridad de masas, transformador, pararrayos, informática, iluminación, etc.</li>
            <li><strong>Condición del Terreno:</strong> Lecho seco, lecho húmedo, arcilloso, pantanoso o lluvias recientes.</li>
            <li><strong>Esquema ECT:</strong> Seleccioná TT, TN-S, TN-C, etc.</li>
            <li><strong>Valor Medido (Ω):</strong> Ingresá la resistencia obtenida en el telurímetro.</li>
            <li><strong>Continuidad Permanente:</strong> Verificá que el conductor PE esté mecánicamente firme y sin cortes.</li>
            <li><strong>Dispositivo de Protección Asociado:</strong> Dispositivo diferencial (DD), interruptor automático o fusible.</li>
            <li><strong>Desconexión Automática:</strong> Registrá si se comprobó el disparo del disyuntor en tiempo y forma.</li>
            <li><strong>Evidencia Fotográfica:</strong> Podés adjuntar fotografías de la jabalina, electrodo y del display del telurímetro.</li>
          </ul>
        </HelpStep>

        <HelpStep
          number={4}
          title="Evaluación de Cumplimiento Normativo"
        >
          El sistema clasifica el estado del punto en base a los criterios de la Res. SRT 900/15 y AEA 90364:
          <div className="flex flex-wrap gap-1.5 pt-1.5">
            <HelpBadge label="Cumple (≤ 40 Ω con disyuntor / ≤ 10 Ω)" variant="green" />
            <HelpBadge label="No Cumple (Resistencia elevada o sin continuidad)" variant="red" />
          </div>
        </HelpStep>

        <HelpStep
          number={5}
          title="Conclusiones Técnicas y Recomendaciones de Adecuación"
        >
          El sistema precarga las recomendaciones estándar de la SRT (hincado de nuevas jabalinas, reemplazo de morsetos sulfatados, instalación de disyuntores diferenciales de 30 mA, adecuación de secciones de conductores de protección PE). Podés editarlas según el diagnóstico de campo.
        </HelpStep>

        <HelpStep
          number={6}
          title="Firma Digital y Emisión del Protocolo SRT 900/15 en PDF"
        >
          Firmá digitalmente como profesional habilitado (con matrícula profesional) y descargá el protocolo legal oficial con las tablas de puntos, valores medidos, conclusiones y anexos fotográficos.
        </HelpStep>
      </HelpSection>

      {/* 4. Preguntas Frecuentes */}
      <HelpSection title="4. Preguntas Frecuentes y Criterios Técnicos" id="faqs" icon={Activity}>
        <HelpFaq question="¿Por qué se exige un valor ≤ 40 Ω si la fórmula teórica da 800 Ω con disyuntor de 30 mA?">
          Aunque la fórmula teórica de tensión de contacto límite en locales secos (24 V / 0,03 A = 800 Ω) garantiza el disparo, la Reglamentación AEA 90364 e IRAM 2281 fijan un valor límite máximo práctico de <strong>40 Ω</strong> para evitar variaciones estacionales por sequía, garantizar el drenaje de sobretensiones transitorias y brindar un factor de seguridad robusto.
        </HelpFaq>

        <HelpFaq question="¿Cómo se comprueba la continuidad de las masas metálicas?">
          Se mide la resistencia eléctrica entre el borne de la jabalina de puesta a tierra y las partes conductoras accesibles de tableros, máquinas y motores. Dicha resistencia no debe superar los <strong>0,2 Ω</strong>.
        </HelpFaq>

        <HelpFaq question="¿Qué profesionales están habilitados para firmar el Protocolo SRT 900/15?">
          Debe ser suscripto por un profesional universitario o técnico con título e incumbencia reconocida en la materia con matrícula profesional activa habilitada por su respectivo Colegio o Consejo Profesional (Ingenieros Electricistas, Electromecánicos, Laborales o Licenciados en Higiene y Seguridad con incumbencias eléctricas).
        </HelpFaq>

        <HelpFaq question="¿Qué hacer si una jabalina arroja un valor superior a 40 Ω?">
          Se debe indicar en las recomendaciones la necesidad de hincar electrodos o jabalinas adicionales en paralelo (interconectadas con cable de cobre desnudo de al menos 35 mm² o 50 mm²), realizar tratamiento de suelo o verificar el estado de corrosión del morseto y conductor de bajada.
        </HelpFaq>
      </HelpSection>
    </div>
  )
};
