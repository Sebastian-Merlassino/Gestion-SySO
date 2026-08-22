// src/content/help/articles/matrizRiesgos.js
import React from 'react';
import { 
  HelpPurpose, 
  HelpStep, 
  HelpTip, 
  HelpWarning, 
  HelpFaq, 
  HelpSection 
} from '@/components/help/HelpComponents';
import { AlertTriangle, Sliders, ShieldCheck, FileText, CheckCircle2 } from 'lucide-react';

export const matrizRiesgosHelp = {
  key: 'matriz-riesgos',
  title: 'Matriz de Evaluación de Riesgos',
  subtitle: 'Identificación de peligros, probabilidad, severidad y jerarquía de controles',
  icon: AlertTriangle,
  tags: ['matriz', 'riesgos', 'peligros', 'probabilidad', 'severidad', 'controles', 'epp', 'pdf'],
  render: () => (
    <div className="space-y-5">
      <HelpPurpose>
        La **Matriz de Riesgos (IPER)** te permite identificar peligros en cada puesto de trabajo de la empresa, cuantificar la magnitud del riesgo (Probabilidad × Severidad) y establecer la jerarquía de medidas de control y EPP recomendados para garantizar condiciones seguras.
      </HelpPurpose>

      <HelpSection title="1. Estructura de la Evaluación" id="estructura">
        <HelpStep
          number={1}
          title="Selección de Puesto y Tarea"
        >
          Elegí la Razón Social, el Establecimiento y el Puesto / Sector específico a evaluar.
        </HelpStep>

        <HelpStep
          number={2}
          title="Identificación de Peligros y Riesgos Asociados"
        >
          Seleccioná de la biblioteca estandarizada o ingresá peligros particulares: <em>Riesgo mecánico, caídas a distinto nivel, contacto eléctrico, ruido continuo, carga postural, sustancias químicas, etc.</em>
        </HelpStep>

        <HelpStep
          number={3}
          title="Valoración Cuantitativa (Nivel de Riesgo)"
        >
          Asigná los valores de **Probabilidad (P)** y **Severidad (S)**. El sistema calcula automáticamente el **Nivel de Riesgo (NR)** clasificándolo en: <em>Trivial, Tolerable, Moderado, Importante o Intolerable</em> con códigos cromáticos según la norma.
        </HelpStep>

        <HelpStep
          number={4}
          title="Jerarquía de Medidas de Control"
        >
          Establecé las contramedidas siguiendo la pirámide preventiva:
          <ol className="list-decimal pl-4 space-y-1 mt-1">
            <li>Eliminación / Sustitución del peligro</li>
            <li>Controles de Ingeniería (protecciones, guardas, extractores)</li>
            <li>Controles Administrativos y Señalización (procedimientos, capacitación)</li>
            <li>Elementos de Protección Personal (EPP certificados)</li>
          </ol>
        </HelpStep>
      </HelpSection>

      <HelpSection title="2. Exportación de Matriz" id="exportacion">
        <HelpStep
          number={5}
          title="Generación de la Matriz IPER en PDF"
        >
          Podés generar el documento tabular completo para presentar ante la ART, auditorías de certificación ISO 45001 o autoridades laborales.
        </HelpStep>
      </HelpSection>

      <HelpSection title="Preguntas Frecuentes (FAQs)" id="faqs">
        <HelpFaq question="¿Se actualizan los sectores si los modifico en la empresa?">
          Sí. La matriz está sincronizada con el perfil de establecimientos y sectores de la Razón Social.
        </HelpFaq>
      </HelpSection>
    </div>
  )
};
