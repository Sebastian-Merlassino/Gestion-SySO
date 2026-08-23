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

export const protocoloIluminacionHelp = {
  key: 'protocolo-iluminacion',
  title: 'Protocolo de Iluminación (Res. SRT 84/12)',
  subtitle: 'Medición de lux en puestos de trabajo y cálculo de uniformidad',
  icon: Sun,
  tags: ['iluminacion', 'luxometro', 'srt-84-12', 'protocolos', 'uniformidad', 'eav', 'decreto-351'],
  render: () => (
    <div className="space-y-5">
      <HelpPurpose>
        El **Protocolo de Medición de Iluminación en el Ambiente Laboral** da estricto cumplimiento a la **Resolución SRT 84/12**. Permite registrar los puntos de medición en cada puesto/sector, contrastar el valor medio obtenido (E_med) contra la exigencia mínima visual (E_req) del Decreto 351/79 y determinar la uniformidad lumínica.
      </HelpPurpose>

      <HelpSection title="1. Datos Generales y del Instrumental" id="instrumental">
        <HelpStep
          number={1}
          title="Instrumento Luxómetro y Certificado de Calibración"
        >
          Cargá la marca, modelo, número de serie del luxómetro utilizado y la fecha de vigencia de su certificado de calibración en laboratorio acreditado (SAC/INTI).
        </HelpStep>

        <HelpStep
          number={2}
          title="Condiciones de Medición y Turno"
        >
          Indicá fecha, hora, turno de trabajo (diurno/nocturno), tipo de alumbrado (LED, fluorescente, natural) y estado del tiempo.
        </HelpStep>
      </HelpSection>

      <HelpSection title="2. Puntos de Medición y Evaluación" id="puntos">
        <HelpStep
          number={3}
          title="Carga de Puntos y Valores de Iluminancia"
        >
          Para cada punto, seleccioná el Sector y Puesto, la tarea visual desarrollada, y cargá los valores medidos en Lux. El sistema coteja automáticamente con la tabla legal y clasifica el punto en <em>CUMPLE / NO CUMPLE</em>.
          <HelpTip>
            Si detectás no conformidades, el sistema sugerirá medidas correctivas estandarizadas (ej. <em>limpieza de luminarias, reubicación de planos de trabajo, incorporación de luminarias LED puntuales</em>).
          </HelpTip>
        </HelpStep>

        <HelpStep
          number={4}
          title="Emisión del Protocolo SRT 84/12 en PDF"
        >
          Descargá el anexo legal oficial con las tablas de puntos de medición, cálculos de uniformidad, conclusiones técnicas y firma del profesional actuante.
        </HelpStep>
      </HelpSection>
    </div>
  )
};

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
