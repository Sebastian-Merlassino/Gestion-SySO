// src/content/help/articles/auth.js
import React from 'react';
import { 
  HelpPurpose, 
  HelpStep, 
  HelpTip, 
  HelpWarning, 
  HelpFaq, 
  HelpSection 
} from '@/components/help/HelpComponents';
import { Key, Lock, Mail, ShieldCheck } from 'lucide-react';

export const loginHelp = {
  key: 'login',
  title: 'Acceso a la Plataforma (Iniciar Sesión)',
  subtitle: 'Ingreso seguro con credenciales de usuario',
  icon: Lock,
  tags: ['login', 'iniciar-sesion', 'email', 'password', 'acceso'],
  render: () => (
    <div className="space-y-5">
      <HelpPurpose>
        Ingresá tu correo electrónico y contraseña registrados para acceder a tu entorno de trabajo seguro en Gestión SySO.
      </HelpPurpose>

      <HelpSection title="1. Inicio de Sesión y Recuperación" id="acceso">
        <HelpStep
          number={1}
          title="Credenciales de Acceso"
        >
          Ingresá el email con el que te diste de alta y tu contraseña.
        </HelpStep>

        <HelpStep
          number={2}
          title="¿Olvidaste tu contraseña?"
        >
          Hacé clic en el enlace <em>"¿Olvidaste tu contraseña?"</em> para recibir un enlace seguro de restablecimiento en tu casilla de correo.
        </HelpStep>
      </HelpSection>
    </div>
  )
};

export const registerHelp = {
  key: 'register',
  title: 'Registro y Creación de Cuenta',
  subtitle: 'Comenzá a usar Gestión SySO con prueba gratuita de 15 días',
  icon: Key,
  tags: ['register', 'registro', 'cuenta-nueva', 'prueba-gratis'],
  render: () => (
    <div className="space-y-5">
      <HelpPurpose>
        Creá tu cuenta en simples pasos para comenzar tu período de prueba sin costo y descubrir cómo digitalizar la gestión integral de Higiene y Seguridad.
      </HelpPurpose>

      <HelpSection title="1. Alta de Nueva Cuenta" id="registro">
        <HelpStep
          number={1}
          title="Completá tus Datos Básicos"
        >
          Ingresá tu Nombre, Apellido, Correo Electrónico y una contraseña segura de al menos 6 caracteres.
        </HelpStep>

        <HelpStep
          number={2}
          title="Confirmación de Email"
        >
          Revisá tu bandeja de entrada para verificar tu cuenta y activar tu acceso inmediato.
        </HelpStep>
      </HelpSection>
    </div>
  )
};
