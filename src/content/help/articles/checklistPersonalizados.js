// src/content/help/articles/checklistPersonalizados.js
import React from 'react';
import { 
  HelpPurpose, 
  HelpStep, 
  HelpTip, 
  HelpWarning, 
  HelpFaq, 
  HelpSection 
} from '@/components/help/HelpComponents';
import { ClipboardCheck, ListPlus, CheckSquare, FileText } from 'lucide-react';

export const checklistPersonalizadosHelp = {
  key: 'checklist-personalizados',
  title: 'Checklist Personalizados y Auditorías',
  subtitle: 'Creación de plantillas a medida y ejecución de listas de verificación',
  icon: ClipboardCheck,
  tags: ['checklist', 'auditorias', 'plantillas', 'inspecciones', 'items', 'cumplimiento', 'pdf'],
  render: () => (
    <div className="space-y-5">
      <HelpPurpose>
        El módulo de **Checklist Personalizados** te otorga total flexibilidad para diseñar y aplicar listas de chequeo a medida según los requerimientos específicos de tus clientes (ej. <em>Auditoría de Orden y Limpieza 5S, Relevamiento de Trabajos en Altura, Inspección de Autoelevadores, Seguridad en Obras</em>).
      </HelpPurpose>

      <HelpSection title="1. Creación de Plantillas" id="plantillas">
        <HelpStep
          number={1}
          title="Definir una Plantilla Maestra"
        >
          Creá una plantilla con un título descriptivo y agrupá los ítems por categorías o secciones técnicas.
        </HelpStep>

        <HelpStep
          number={2}
          title="Agregar Preguntas e Ítems de Chequeo"
        >
          Configurá cada ítem con opciones de respuesta: <em>Conforme / No Conforme / No Aplica</em>, más campo para observaciones y fotos de evidencia.
        </HelpStep>
      </HelpSection>

      <HelpSection title="2. Ejecución y Reporte" id="ejecucion">
        <HelpStep
          number={3}
          title="Ejecutar en Campo y Calcular Porcentaje de Cumplimiento"
        >
          Al completar la lista para un cliente y establecimiento, el sistema calcula de forma instantánea el porcentaje (%) global de cumplimiento normativo y genera el reporte PDF correspondiente.
        </HelpStep>
      </HelpSection>
    </div>
  )
};
