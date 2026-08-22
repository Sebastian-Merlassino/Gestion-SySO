// src/content/help/articles/avisos.js
import React from 'react';
import { 
  HelpPurpose, 
  HelpStep, 
  HelpTip, 
  HelpWarning, 
  HelpFaq, 
  HelpSection 
} from '@/components/help/HelpComponents';
import { AlertTriangle, Send, Share2, PenTool } from 'lucide-react';

export const avisosHelp = {
  key: 'avisos',
  title: 'Aviso de Riesgo y Condiciones Peligrosas',
  subtitle: 'Notificación formal y preventiva ante riesgos inminentes o graves',
  icon: AlertTriangle,
  tags: ['avisos', 'riesgo', 'peligro', 'inminente', 'notificacion', 'firmas', 'whatsapp', 'email', 'pdf'],
  render: () => (
    <div className="space-y-5">
      <HelpPurpose>
        El **Aviso de Riesgo** es una herramienta de notificación formal y urgente para poner en conocimiento a la dirección de la empresa o a los mandos medios sobre una condición insegura grave o un riesgo inminente que requiere intervención prioritaria.
      </HelpPurpose>

      <HelpSection title="1. Confección del Aviso" id="confeccion">
        <HelpStep
          number={1}
          title="Ubicación y Sector"
        >
          Elegí la empresa, el establecimiento y el punto exacto donde se constata la condición riesgosa (ej. <em>Línea de producción #2, Montacargas averiado, Falta de barandas</em>).
        </HelpStep>

        <HelpStep
          number={2}
          title="Descripción del Riesgo y Medida Recomendada"
        >
          Explicá claramente por qué la condición es peligrosa y cuál es la medida de contención inmediata o preventiva requerida. Podés utilizar el dictado por voz para registrarlo rápidamente.
        </HelpStep>

        <HelpStep
          number={3}
          title="Firma Digital y Despacho Urgente"
        >
          Validá con la firma del profesional y utilizá el diálogo de despacho para notificar de inmediato por Correo Electrónico o WhatsApp al responsable de la empresa.
        </HelpStep>
      </HelpSection>
    </div>
  )
};
