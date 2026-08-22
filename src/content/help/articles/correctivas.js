// src/content/help/articles/correctivas.js
import React from 'react';
import { 
  HelpPurpose, 
  HelpStep, 
  HelpTip, 
  HelpWarning, 
  HelpFaq, 
  HelpSection 
} from '@/components/help/HelpComponents';
import { ClipboardList, Camera, Mic, CheckCircle2, Clock, Share2 } from 'lucide-react';

export const correctivasHelp = {
  key: 'correctivas',
  title: 'Acciones Correctivas y Desvíos',
  subtitle: 'Detección, seguimiento y cierre de hallazgos en planta',
  icon: ClipboardList,
  tags: ['correctivas', 'desvios', 'hallazgos', 'evidencia', 'fotos', 'sectores', 'pdf', 'prioridad'],
  render: () => (
    <div className="space-y-5">
      <HelpPurpose>
        El módulo de **Acciones Correctivas** te permite registrar no conformidades, desvíos y oportunidades de mejora detectadas en auditorías o recorridas en planta, asignando responsables, niveles de prioridad, plazos y evidencia fotográfica antes/después.
      </HelpPurpose>

      <HelpSection title="1. Registro de una Nueva Acción" id="alta">
        <HelpStep
          number={1}
          title="Selección de Cliente y Establecimiento"
        >
          Elegí la Razón Social y el Establecimiento inspeccionado. Esto cargará automáticamente la estructura de <strong>Áreas / Sectores</strong> y <strong>Puestos de Trabajo</strong> configurados.
          <HelpTip title="Ingreso Manual Asistido">
            Si estás relevando un área nueva no registrada previamente, podés elegir <em>"+ Ingresar sector manual..."</em> para tipear el nombre sin salir del formulario.
          </HelpTip>
        </HelpStep>

        <HelpStep
          number={2}
          title="Descripción del Desvío y Dictado por Voz (IA)"
        >
          Detallá la no conformidad encontrada. Podés presionar el botón de micrófono en el componente <strong>SySO AI Voice Helper</strong> para dictar tu reporte técnico por voz; la IA de Gemini corregirá la sintaxis y redactará un texto profesional y claro.
        </HelpStep>

        <HelpStep
          number={3}
          title="Nivel de Riesgo y Fecha Límite"
        >
          Asigná la criticidad: <em>Baja, Media, Alta o Inmediata</em>, e indicá la fecha estimada para la regularización de la medida preventiva.
        </HelpStep>

        <HelpStep
          number={4}
          title="Carga de Evidencia Fotográfica"
        >
          Adjuntá fotografías del desvío antes de la corrección. Las imágenes se optimizan de forma automática para incorporarse en el reporte PDF.
        </HelpStep>
      </HelpSection>

      <HelpSection title="2. Seguimiento y Cierre" id="seguimiento">
        <HelpStep
          number={5}
          title="Estados de la Acción"
        >
          La acción puede transitar por los estados:
          <ul className="list-disc pl-4 space-y-1 mt-1">
            <li><strong>Pendiente:</strong> Recién detectada, esperando acción correctiva.</li>
            <li><strong>En Proceso:</strong> Medida en ejecución o adquisición de insumos.</li>
            <li><strong>Cerrada / Regularizada:</strong> Medida implementada con foto de evidencia de cierre.</li>
          </ul>
        </HelpStep>

        <HelpStep
          number={6}
          title="Generación y Despacho de Reporte PDF"
        >
          Al hacer clic en el botón de PDF, se emitirá el documento formal con encabezados corporativos, fotos comparativas y la opción de despacho por correo electrónico o WhatsApp.
        </HelpStep>
      </HelpSection>

      <HelpSection title="Preguntas Frecuentes (FAQs)" id="faqs">
        <HelpFaq question="¿Quién puede marcar una acción como cerrada?">
          Cualquier profesional o técnico asignado al servicio con permisos de edición sobre el módulo de correctivas.
        </HelpFaq>
        <HelpFaq question="¿Qué ocurre si se vence el plazo sin regularizar?">
          El sistema resalta la tarjeta de la acción en color rojo y genera una alerta visual en el Dashboard principal para alertar sobre el desvío vencido.
        </HelpFaq>
      </HelpSection>
    </div>
  )
};
