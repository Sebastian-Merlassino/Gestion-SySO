// src/content/help/articles/capacitacion.js
import React from 'react';
import { 
  HelpPurpose, 
  HelpStep, 
  HelpTip, 
  HelpWarning, 
  HelpFaq, 
  HelpSection 
} from '@/components/help/HelpComponents';
import { GraduationCap, Users, FileText, CheckCircle2 } from 'lucide-react';

export const capacitacionHelp = {
  key: 'capacitacion',
  title: 'Programa de Capacitación Anual',
  subtitle: 'Plan anual de formación, registro de asistencia presencial y constancias',
  icon: GraduationCap,
  tags: ['capacitacion', 'formacion', 'asistencia', 'temas', 'art', 'trabajadores', 'pdf'],
  render: () => (
    <div className="space-y-5">
      <HelpPurpose>
        El módulo de **Programa de Capacitación Anual** permite planificar las temáticas de adiestramiento obligatorio según riesgos por puesto (ej. <em>Uso de EPP, Ergonomía, Riesgo Eléctrico, Primeros Auxilios, Uso de Extintores</em>), registrar la asistencia nominal de los trabajadores y emitir las constancias legales requeridas por la ART.
      </HelpPurpose>

      <HelpSection title="1. Plan Anual y Temáticas" id="plan">
        <HelpStep
          number={1}
          title="Cronograma de Cursos"
        >
          Definí los temas previstos para el año, la carga horaria estimada y los sectores destinatarios de la empresa.
        </HelpStep>
      </HelpSection>

      <HelpSection title="2. Registro de Asistencia y Constancias" id="asistencia">
        <HelpStep
          number={2}
          title="Carga de Participantes"
        >
          Al dictar el curso, seleccioná a los trabajadores asistentes directamente desde la nómina de personal de la empresa.
        </HelpStep>

        <HelpStep
          number={3}
          title="Emisión de la Planilla de Capacitación Oficial"
        >
          Generá el PDF con el encabezado de la empresa, temática detallada, capacitador y firmas de los operarios capacitados.
        </HelpStep>
      </HelpSection>
    </div>
  )
};
