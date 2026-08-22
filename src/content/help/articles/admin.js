// src/content/help/articles/admin.js
import React from 'react';
import { 
  HelpPurpose, 
  HelpStep, 
  HelpTip, 
  HelpWarning, 
  HelpFaq, 
  HelpSection 
} from '@/components/help/HelpComponents';
import { ShieldCheck, Users, Building, Activity, Database } from 'lucide-react';

export const adminHelp = {
  key: 'admin',
  title: 'Consola de SuperAdministrador',
  subtitle: 'Monitoreo global de tenants, usuarios, métricas del SaaS y operaciones',
  icon: ShieldCheck,
  tags: ['admin', 'superadmin', 'tenants', 'metricas', 'planes', 'soporte'],
  render: () => (
    <div className="space-y-5">
      <HelpPurpose>
        La **Consola SuperAdmin** es el panel exclusivo de control para los administradores globales de la plataforma Gestión SySO. Permite supervisar cuentas activas, otorgar exenciones o bonificaciones de plan, auditar registros y brindar soporte técnico.
      </HelpPurpose>

      <HelpSection title="1. Gestión Global de Tenants y Usuarios" id="tenants">
        <HelpStep
          number={1}
          title="Supervisión de Cuentas"
        >
          Visualizá el listado completo de consultoras y empresas registradas, sus propietarios, planes activos y volúmenes de uso.
        </HelpStep>

        <HelpStep
          number={2}
          title="Gestión de Planes y Bonificaciones"
        >
          Asigná planes de cortesía, extensiones de prueba o estado de exención a cuentas estratégicas.
        </HelpStep>
      </HelpSection>
    </div>
  )
};
