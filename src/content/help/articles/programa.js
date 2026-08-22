// src/content/help/articles/programa.js
import React from 'react';
import { 
  HelpPurpose, 
  HelpStep, 
  HelpTip, 
  HelpWarning, 
  HelpFaq, 
  HelpSection 
} from '@/components/help/HelpComponents';
import { Calendar, CheckCircle2, Clock, FileText } from 'lucide-react';

export const programaHelp = {
  key: 'programa',
  title: 'Programa de Gestión Anual',
  subtitle: 'Planificación de metas, cronograma anual de actividades y cumplimiento SySO',
  icon: Calendar,
  tags: ['programa', 'gestion', 'anual', 'cronograma', 'metas', 'actividades', 'cumplimiento', 'pdf'],
  render: () => (
    <div className="space-y-5">
      <HelpPurpose>
        El **Programa de Gestión Anual** permite planificar y estructurar todas las actividades preventivas de Higiene, Seguridad y Medio Ambiente a lo largo del año calendario para cada empresa cliente, dando cumplimiento a las exigencias normativas y de ART.
      </HelpPurpose>

      <HelpSection title="1. Planificación de Actividades" id="planificacion">
        <HelpStep
          number={1}
          title="Definición de Actividades y Metas"
        >
          Cargá las actividades programadas: <em>Medición de Iluminación, Medición de Puesta a Tierra, Simulacro de Evacuación, Inspección de EPP, Auditoría de Extintores, Exámenes Periódicos</em>.
        </HelpStep>

        <HelpStep
          number={2}
          title="Asignación Temporal por Meses"
        >
          Marcá los meses planificados (Enero a Diciembre) y el responsable de la ejecución.
        </HelpStep>
      </HelpSection>

      <HelpSection title="2. Seguimiento y Cumplimiento" id="seguimiento">
        <HelpStep
          number={3}
          title="Marcado de Ejecución Real"
        >
          A medida que transcurre el año, registrá los meses de ejecución efectiva. El sistema computará el índice de avance programado vs. ejecutado.
        </HelpStep>

        <HelpStep
          number={4}
          title="Emisión del Cronograma en PDF"
        >
          Descargá el cronograma gráfico anual en formato PDF listo para firmar y presentar ante inspecciones.
        </HelpStep>
      </HelpSection>
    </div>
  )
};
