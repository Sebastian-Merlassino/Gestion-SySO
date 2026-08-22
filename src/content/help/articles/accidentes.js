// src/content/help/articles/accidentes.js
import React from 'react';
import { 
  HelpPurpose, 
  HelpStep, 
  HelpTip, 
  HelpWarning, 
  HelpFaq, 
  HelpSection 
} from '@/components/help/HelpComponents';
import { ShieldAlert, User, Activity, PenTool, FileText } from 'lucide-react';

export const accidentesHelp = {
  key: 'accidentes',
  title: 'Investigación de Accidentes e Incidentes',
  subtitle: 'Registro formal, método del Árbol de Causas y medidas preventivas',
  icon: ShieldAlert,
  tags: ['accidentes', 'incidentes', 'arbol-de-causas', 'investigacion', 'art', 'lesiones', 'firmas', 'pdf'],
  render: () => (
    <div className="space-y-5">
      <HelpPurpose>
        El módulo de **Investigación de Accidentes** permite documentar de forma rigurosa y legal los eventos no deseados (accidentes con/sin baja, accidentes <em>in itinere</em> o incidentes de alto potencial), analizar la causa raíz mediante el método del Árbol de Causas y plasmar las medidas correctivas con firmas digitales.
      </HelpPurpose>

      <HelpSection title="1. Datos del Evento y del Trabajador" id="datos">
        <HelpStep
          number={1}
          title="Identificación del Accidente"
        >
          Indicá la fecha, hora exacta, lugar físico/sector donde ocurrió el hecho y la tipología (accidente típico, trayecto o incidente).
        </HelpStep>

        <HelpStep
          number={2}
          title="Datos del Trabajador Afectado"
        >
          Completá los datos del damnificado: Nombre, DNI, puesto de trabajo, antigüedad en la empresa y en el puesto, y naturaleza de la lesión si existiese.
        </HelpStep>
      </HelpSection>

      <HelpSection title="2. Investigación Técnica y Causa Raíz" id="investigacion">
        <HelpStep
          number={3}
          title="Relato de los Hechos"
        >
          Describí la cronología fáctica de lo sucedido. Podés ayudarte con dictado por voz para transcribir declaraciones de testigos o del operario.
        </HelpStep>

        <HelpStep
          number={4}
          title="Árbol de Causas / Factores Contribuyentes"
        >
          Estructurá los hechos antecedentes y factores humanos, de equipamiento, organizacionales y del medio ambiente de trabajo que facilitaron la ocurrencia del accidente.
          <HelpTip>
            Recordá que el objetivo del Árbol de Causas es la prevención de recurrencias y la mejora de las condiciones de trabajo, no la búsqueda de culpables individuales.
          </HelpTip>
        </HelpStep>

        <HelpStep
          number={5}
          title="Plan de Acción y Medidas Correctivas"
        >
          Definí las acciones concretas a implementar, con fecha de compromiso y responsable asignado en la planta.
        </HelpStep>

        <HelpStep
          number={6}
          title="Firmas Digitales y Exportación PDF"
        >
          El formulario cuenta con un lienzo de firma táctil / digital (`AppSignatureCanvas`) para que el Responsable SySO y el representante de la empresa validen el informe in situ. Al finalizar, emití el PDF oficial.
        </HelpStep>
      </HelpSection>

      <HelpSection title="Preguntas Frecuentes (FAQs)" id="faqs">
        <HelpFaq question="¿Se puede registrar un incidente sin días de baja médica?">
          Sí, el sistema permite tipificar el evento como incidente o casi-accidente (Near Miss) sin requerir carga de días caídos de ART.
        </HelpFaq>
        <HelpFaq question="¿Cómo firmo si estoy en una tablet o celular?">
          El panel de firma táctil se adapta al tamaño de la pantalla y permite firmar directamente con el dedo o un lápiz óptico.
        </HelpFaq>
      </HelpSection>
    </div>
  )
};
