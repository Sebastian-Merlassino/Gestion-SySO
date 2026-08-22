// src/content/help/articles/equipo.js
import React from 'react';
import { 
  HelpPurpose, 
  HelpStep, 
  HelpTip, 
  HelpWarning, 
  HelpFaq, 
  HelpSection 
} from '@/components/help/HelpComponents';
import { Briefcase, UserPlus, Shield, Key } from 'lucide-react';

export const equipoHelp = {
  key: 'equipo',
  title: 'Equipo de Trabajo y Permisos',
  subtitle: 'Gestión de subusuarios, técnicos, auditores y asignación granular de módulos',
  icon: Briefcase,
  tags: ['equipo', 'usuarios', 'tecnicos', 'roles', 'permisos', 'invitaciones', 'seguridad'],
  render: () => (
    <div className="space-y-5">
      <HelpPurpose>
        En **Equipo de Trabajo** administrás a los profesionales, técnicos de campo y auditores que colaboran en tu consultora o departamento de Higiene y Seguridad, configurando de forma granular a qué clientes y módulos puede acceder cada uno.
      </HelpPurpose>

      <HelpSection title="1. Invitar Miembros del Equipo" id="invitar">
        <HelpStep
          number={1}
          title="Envío de Invitación por Email"
        >
          Hacé clic en <strong>"+ Invitar Miembro"</strong>, ingresá el correo electrónico del profesional e indicá su nombre y rol inicial.
        </HelpStep>

        <HelpStep
          number={2}
          title="Permisos Granulares por Módulo"
        >
          Podés asignar permisos de lectura, creación o edición módulo por módulo (ej. habilitar solo *Visitas y Correctivas* para un técnico auxiliar sin darle acceso a *Facturación* ni *SuperAdmin*).
        </HelpStep>
      </HelpSection>
    </div>
  )
};
