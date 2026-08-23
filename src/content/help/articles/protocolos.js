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

export const protocoloRuidoHelp = {
  key: 'protocolo-ruido',
  title: 'Protocolo de Ruido (Res. SRT 85/12)',
  subtitle: 'Medición de nivel sonoro continuo equivalente (NSCE) y dosis de ruido',
  icon: Volume2,
  tags: ['ruido', 'decibeles', 'srt-85-12', 'dosimetria', 'sonometro', 'dosis', 'nsce'],
  render: () => (
    <div className="space-y-5">
      <HelpPurpose>
        El **Protocolo de Medición de Ruido en el Ambiente Laboral** da cumplimiento a la **Resolución SRT 85/12**. Permite evaluar la exposición sonora del personal mediante mediciones con decibelímetro/sonómetro integrador (dBA) o dosímetro, calculando el Nivel Sonoro Continuo Equivalente y la Dosis de exposición diaria respecto al límite permisible de 85 dBA para 8 horas.
      </HelpPurpose>

      <HelpSection title="1. Instrumental y Puntos de Medición" id="ruido-puntos">
        <HelpStep
          number={1}
          title="Datos del Decibelímetro o Dosímetro"
        >
          Registrá el equipo, calibrador acústico empleado antes/después de la medición y vigencia del certificado de calibración.
        </HelpStep>

        <HelpStep
          number={2}
          title="Puntos de Muestreo y Tiempo de Exposición"
        >
          Cargá el sector, puesto, tiempo de permanencia diaria (horas) y el valor en dBA o dosis obtenida.
        </HelpStep>

        <HelpStep
          number={3}
          title="Atenuación de Protectores Auditivos (EPP)"
        >
          Si el nivel supera los 85 dBA, seleccioná el tipo de protector auditivo provisto (copa, endoaural) y su valor NRR para evaluar el nivel efectivo recibido en el oído del trabajador.
        </HelpStep>
      </HelpSection>
    </div>
  )
};

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
