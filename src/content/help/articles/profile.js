// src/content/help/articles/profile.js
import React from 'react';
import { 
  HelpPurpose, 
  HelpStep, 
  HelpTip, 
  HelpWarning, 
  HelpFaq, 
  HelpSection 
} from '@/components/help/HelpComponents';
import { Settings, User, PenTool, Lock, Trash2 } from 'lucide-react';

export const profileHelp = {
  key: 'profile',
  title: 'Perfil Profesional y Firma Digital',
  subtitle: 'Datos de matrícula, logo consultora, firma digital y seguridad de la cuenta',
  icon: Settings,
  tags: ['profile', 'perfil', 'firma-digital', 'matricula', 'password', 'seguridad', 'logo-consultora'],
  render: () => (
    <div className="space-y-5">
      <HelpPurpose>
        En **Editar Perfil** configurás tus datos personales y profesionales (Nombre, Título, Matrícula Habilitante, Colegio/Consejo Profesional), tu firma digital para reportes y las opciones de seguridad de tu cuenta.
      </HelpPurpose>

      <HelpSection title="1. Datos Profesionales y Matrícula" id="datos">
        <HelpStep
          number={1}
          title="Matrícula y Datos de Cabecera"
        >
          Cargá tu número de matrícula profesional y título habilitante (ej. <em>Lic. en Higiene y Seguridad en el Trabajo - Mat. COPIME 12345</em>). Estos datos aparecerán impresos en el pie de todos los protocolos y constancias que generes.
        </HelpStep>

        <HelpStep
          number={2}
          title="Firma Digital y Sello"
        >
          Podés dibujar tu firma con el mouse o pantalla táctil, o subir una imagen limpia con tu firma y sello escaneado para estampar automáticamente en tus dictámenes.
        </HelpStep>
      </HelpSection>

      <HelpSection title="2. Seguridad y Contraseña" id="seguridad">
        <HelpStep
          number={3}
          title="Cambio de Contraseña"
        >
          Podés actualizar periódicamente tu clave de acceso garantizando la protección de los datos de tus clientes.
        </HelpStep>
      </HelpSection>
    </div>
  )
};
