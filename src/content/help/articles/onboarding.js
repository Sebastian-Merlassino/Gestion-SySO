// src/content/help/articles/onboarding.js
import React from 'react';
import { 
  HelpPurpose, 
  HelpStep, 
  HelpTip, 
  HelpWarning, 
  HelpFaq, 
  HelpSection 
} from '@/components/help/HelpComponents';
import { Sparkles, Building, CheckCircle2 } from 'lucide-react';

export const onboardingHelp = {
  key: 'onboarding',
  title: 'Asistente de Configuración Inicial (Onboarding)',
  subtitle: 'Primeros pasos para poner en marcha tu entorno de Gestión SySO',
  icon: Sparkles,
  tags: ['onboarding', 'inicio', 'configuracion', 'slug', 'nombre-empresa', 'bienvenida'],
  render: () => (
    <div className="space-y-5">
      <HelpPurpose>
        El **Onboarding** te acompaña en tus primeros minutos en la plataforma para configurar el nombre de tu consultora o empresa, definir tu URL personalizada (slug) y dejar tu espacio de trabajo listo para comenzar.
      </HelpPurpose>

      <HelpSection title="1. Pasos de la Configuración Inicial" id="pasos">
        <HelpStep
          number={1}
          title="Nombre de la Consultora o Servicio"
        >
          Ingresá la denominación con la que querés que tus clientes y técnicos reconozcan tu espacio de trabajo.
        </HelpStep>

        <HelpStep
          number={2}
          title="Elección del Slug de tu URL"
        >
          El slug es el identificador único de tu cuenta (ej. <em>app.gestionsyso.com/mi-consultora</em>). Podés personalizarlo con letras minúsculas, números y guiones.
        </HelpStep>

        <HelpStep
          number={3}
          title="¡Listo para Operar!"
        >
          Al completar estos pasos accederás inmediatamente al Dashboard principal de tu cuenta y podrás comenzar a cargar tus clientes y protocolos.
        </HelpStep>
      </HelpSection>
    </div>
  )
};
