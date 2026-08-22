// src/content/help/articles/controlElectrico.js
import React from 'react';
import { 
  HelpPurpose, 
  HelpStep, 
  HelpTip, 
  HelpWarning, 
  HelpFaq, 
  HelpSection 
} from '@/components/help/HelpComponents';
import { Zap, ShieldCheck, CheckCircle2, FileText } from 'lucide-react';

export const controlElectricoHelp = {
  key: 'control-electrico',
  title: 'Control Eléctrico y Tableros',
  subtitle: 'Inspección de tableros seccionales/generales, disyuntores y protecciones térmicas',
  icon: Zap,
  tags: ['control-electrico', 'tableros', 'disyuntor', 'termomagneticas', 'puesta-a-tierra', 'aea', 'pdf'],
  render: () => (
    <div className="space-y-5">
      <HelpPurpose>
        El módulo de **Control Eléctrico** permite realizar la inspección técnica periódica de las instalaciones eléctricas, tableros generales y seccionales (TGBT, TS), interruptores diferenciales, puesta a tierra asociada y contratapas según la reglamentación AEA y Decreto 351/79.
      </HelpPurpose>

      <HelpSection title="1. Datos del Tablero y Chequeo" id="tablero">
        <HelpStep
          number={1}
          title="Identificación y Ubicación del Tablero"
        >
          Indicá la denominación (ej. <em>TGBT-01, Tablero Seccional Taller</em>), el sector donde se encuentra y el material del gabinete (chapa, PVC ignífugo).
        </HelpStep>

        <HelpStep
          number={2}
          title="Lista de Verificación de Seguridad"
        >
          Auditá los ítems normativos:
          <ul className="list-disc pl-4 space-y-1 mt-1">
            <li>Presencia y estado del disyuntor diferencial (botón de testeo).</li>
            <li>Protecciones termomagnéticas calibradas adecuadamente.</li>
            <li>Contratapa / contrafrente que impida contacto directo accidental.</li>
            <li>Puesta a tierra conectada a la estructura metálica del gabinete.</li>
            <li>Identificación y diagrama unifilar visible.</li>
            <li>Señalización de riesgo eléctrico (rayo normalizado IRAM).</li>
          </ul>
        </HelpStep>

        <HelpStep
          number={3}
          title="Observaciones y Plan de Regularización"
        >
          Describí los hallazgos y desvíos eléctricos encontrados, sugiriendo las adecuaciones técnicas a cargo del personal electricista matriculado.
        </HelpStep>
      </HelpSection>

      <HelpSection title="2. Reporte PDF de Control Eléctrico" id="pdf">
        <HelpStep
          number={4}
          title="Generación del Informe"
        >
          Emití el informe oficial con el estado de conformidad de cada tablero inspeccionado.
        </HelpStep>
      </HelpSection>
    </div>
  )
};
