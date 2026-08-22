// src/content/help/articles/nomina.js
import React from 'react';
import { 
  HelpPurpose, 
  HelpStep, 
  HelpTip, 
  HelpWarning, 
  HelpFaq, 
  HelpSection 
} from '@/components/help/HelpComponents';
import { Users, FileSpreadsheet, UserPlus, FileText } from 'lucide-react';

export const nominaHelp = {
  key: 'nomina',
  title: 'Nómina de Personal y Trabajadores',
  subtitle: 'Padrón de empleados por cliente, puestos, legajos y capacitaciones asociadas',
  icon: Users,
  tags: ['nomina', 'trabajadores', 'personal', 'cuil', 'puestos', 'excel', 'importar'],
  render: () => (
    <div className="space-y-5">
      <HelpPurpose>
        El módulo de **Nómina de Personal** te permite administrar el padrón de empleados expuestos de cada empresa cliente, agilizando el registro de asistencia en capacitaciones, entrega de EPP y relevamiento de puestos.
      </HelpPurpose>

      <HelpSection title="1. Carga Individual o Masiva" id="carga-personal">
        <HelpStep
          number={1}
          title="Alta Individual de un Trabajador"
        >
          Cargá: Nombre y Apellido, CUIL/DNI, Establecimiento, Sector de trabajo, Puesto/Función y fecha de ingreso.
        </HelpStep>

        <HelpStep
          number={2}
          title="Importación y Exportación por Planilla Excel"
        >
          Podés descargar la plantilla modelo de Excel, pegar la nómina enviada por Recursos Humanos de tu cliente y cargar decenas de trabajadores con un solo clic.
        </HelpStep>
      </HelpSection>
    </div>
  )
};
