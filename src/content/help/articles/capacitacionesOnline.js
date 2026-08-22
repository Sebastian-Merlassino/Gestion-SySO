// src/content/help/articles/capacitacionesOnline.js
import React from 'react';
import { 
  HelpPurpose, 
  HelpStep, 
  HelpTip, 
  HelpWarning, 
  HelpFaq, 
  HelpSection 
} from '@/components/help/HelpComponents';
import { GraduationCap, Video, Users, CheckCircle2, Award } from 'lucide-react';

export const capacitacionesOnlineHelp = {
  key: 'capacitaciones-online',
  title: 'Capacitaciones Online y E-Learning',
  subtitle: 'Cursos digitales interactivos, asignación por enlace y evaluaciones con certificado',
  icon: GraduationCap,
  tags: ['capacitaciones-online', 'elearning', 'cursos', 'videos', 'evaluaciones', 'certificados', 'qr'],
  render: () => (
    <div className="space-y-5">
      <HelpPurpose>
        El módulo de **Capacitaciones Online** permite capacitar al personal de forma remota y asincrónica mediante videos explicativos, cuestionarios evaluativos con preguntas de opción múltiple y emisión automática de certificados individuales de aprobación.
      </HelpPurpose>

      <HelpSection title="1. Catálogo y Asignación de Cursos" id="catalogo">
        <HelpStep
          number={1}
          title="Creación o Selección del Curso"
        >
          Elegí un curso existente o creá uno nuevo cargando el contenido temático, video introductorio y cuestionario de preguntas.
        </HelpStep>

        <HelpStep
          number={2}
          title="Asignación a Trabajadores y Enlace Único"
        >
          Asigná el curso a los operarios de una empresa. El sistema genera un enlace directo (URL con token) que podés enviar por WhatsApp o Email para que el trabajador ingrese desde su smartphone sin necesidad de crearse una cuenta ni recordar contraseñas.
        </HelpStep>
      </HelpSection>

      <HelpSection title="2. Seguimiento y Certificación" id="seguimiento">
        <HelpStep
          number={3}
          title="Monitoreo del Progreso"
        >
          Visualizá en tiempo real qué trabajadores completaron el curso, fecha, puntaje obtenido en la evaluación y estado de aprobación.
        </HelpStep>

        <HelpStep
          number={4}
          title="Certificados Oficiales"
        >
          Los trabajadores aprobados obtienen de inmediato su certificado de capacitación con código QR de verificación.
        </HelpStep>
      </HelpSection>
    </div>
  )
};
