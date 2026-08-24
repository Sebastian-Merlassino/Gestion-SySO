// src/content/help/articles/protocolos.js
import React from 'react';
import { 
  HelpPurpose, 
  HelpStep, 
  HelpTip, 
  HelpWarning, 
  HelpFaq, 
  HelpSection 
} from '@/components/help/HelpComponents';
import { Sun, Volume2, PersonStanding, Zap, CheckCircle2, Sliders, FileText } from 'lucide-react';

export { protocoloIluminacionHelp } from './protocoloIluminacion';

export { protocoloRuidoHelp } from './protocoloRuido';

export { protocoloErgonomiaHelp } from './protocoloErgonomia';

export const protocoloPuestaATierraHelp = {
  key: 'protocolo-puesta-a-tierra',
  title: 'Protocolo de Puesta a Tierra (Res. SRT 900/15)',
  subtitle: 'Medición de resistencia de jabalinas (PAT) y continuidad de masas eléctricas',
  icon: Zap,
  tags: ['puesta-a-tierra', 'pat', 'srt-900-15', 'telurometro', 'ohmios', 'continuidad', 'disyuntor'],
  render: () => (
    <div className="space-y-5">
      <HelpPurpose>
        El **Protocolo de Medición de Puesta a Tierra y Continuidad de las Masas** da estricto cumplimiento a la **Resolución SRT 900/15**. Permite registrar las tomas de tierra (jabalinas, mallas), los valores de resistencia medidos en Ohmios (Ω), el estado de los interruptores diferenciales y la continuidad de masas metálicas.
      </HelpPurpose>

      <HelpSection title="1. Instrumental y Puntos de Toma de Tierra" id="pat-puntos">
        <HelpStep
          number={1}
          title="Telurímetro y Certificado de Calibración"
        >
          Ingresá los datos del telurímetro empleado y el método de medición (3 picas / método de caída de potencial).
        </HelpStep>

        <HelpStep
          number={2}
          title="Puntos de Jabalina y Verificación de Continuidad"
        >
          Cargá cada toma de tierra, su ubicación física y el valor de resistencia (máximo legal: 40 Ω o menor según esquema TT/TN). Evaluá la continuidad de las masas y el correcto disparo del diferencial asociado.
        </HelpStep>
      </HelpSection>
    </div>
  )
};
