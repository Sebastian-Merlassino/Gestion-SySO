// src/content/help/articles/empresas.js
import React from 'react';
import { 
  HelpPurpose, 
  HelpStep, 
  HelpTip, 
  HelpWarning, 
  HelpFaq, 
  HelpSection, 
  HelpBadge 
} from '@/components/help/HelpComponents';
import { Users, Building, Plus, MapPin, Sliders, ShieldCheck } from 'lucide-react';

export const empresasHelp = {
  key: 'empresas',
  title: 'Gestión de Clientes (Razones Sociales)',
  subtitle: 'Administración de empresas, establecimientos, sectores y contactos',
  icon: Users,
  tags: ['empresas', 'clientes', 'cuit', 'establecimientos', 'sectores', 'puestos', 'contactos', 'logo'],
  render: () => (
    <div className="space-y-5">
      <HelpPurpose>
        En este módulo gestionás las **Razones Sociales (Clientes)** a las que brindás servicios de Seguridad y Salud Ocupacional. Cada cliente agrupa sus sedes/establecimientos físicos, sectores de trabajo, puestos de los operarios, contactos clave y documentación técnica.
      </HelpPurpose>

      <HelpSection title="1. Alta y Edición de Clientes" id="alta">
        <HelpStep
          number={1}
          title="Crear o Seleccionar un Cliente"
        >
          Hacé clic en el botón azul <strong>"+ Nueva Empresa"</strong> o <strong>"+ Agregar Cliente"</strong>. Se desplegará el formulario interactivo estructurado por pestañas y secciones.
        </HelpStep>

        <HelpStep
          number={2}
          title="Datos Fiscales y de Contacto"
        >
          Completá los datos base:
          <ul className="list-disc pl-4 space-y-1 mt-1">
            <li><strong>Razón Social:</strong> Nombre legal de la empresa.</li>
            <li><strong>CUIT:</strong> Número fiscal (el sistema valida duplicados en tu cuenta).</li>
            <li><strong>Actividad Principal / CIIU:</strong> Ramo o rubro productivo.</li>
            <li><strong>Logo de la Empresa:</strong> Podés subir la imagen en formato JPG o PNG para que figure en las cabeceras de todos los reportes PDF emitidos para este cliente.</li>
          </ul>
        </HelpStep>
      </HelpSection>

      <HelpSection title="2. Establecimientos, Sectores y Puestos" id="establecimientos">
        <HelpStep
          number={3}
          title="Gestión de Establecimientos Físicos"
        >
          Una razón social puede tener múltiples sucursales o plantas. Podés añadir cada establecimiento con su dirección, localidad y provincia.
        </HelpStep>

        <HelpStep
          number={4}
          title="Sectores y Puestos de Trabajo"
        >
          Dentro de cada establecimiento, definí los sectores (ej. <em>Taller de Mantenimiento, Depósito Central, Oficinas</em>) y sus puestos asociados (ej. <em>Soldador, Clarkista, Administrativo</em>).
          <HelpTip title="Sincronización Inteligente">
            Los sectores y puestos cargados aquí alimentarán de forma automática las listas desplegables en **Acciones Correctivas, Protocolos (Iluminación, Ruido, PAT, Ergonomía) y Matriz de Riesgos**.
          </HelpTip>
        </HelpStep>

        <HelpStep
          number={5}
          title="Contactos y Destinatarios de Reportes"
        >
          Registrá los contactos de la empresa (Responsable SySO, RRHH, Gerencia) con sus teléfonos y correos electrónicos. Al emitir o compartir reportes PDF por Email o WhatsApp, el sistema precargará estos destinatarios de forma automática.
        </HelpStep>
      </HelpSection>

      <HelpSection title="Preguntas Frecuentes (FAQs)" id="faqs">
        <HelpFaq question="¿Qué ocurre si supero el límite de clientes de mi plan?">
          El sistema te notificará amistosamente que has alcanzado la cuota de clientes contratada. Podrás ampliar tu plan al instante desde el botón <em>Mejorar Plan</em> sin perder ningún dato.
        </HelpFaq>
        <HelpFaq question="¿Puedo dar de baja un cliente sin borrar sus protocolos históricos?">
          Te recomendamos deshabilitar o pausar la relación, o mantener el cliente activo si necesitás emitir copias de reportes históricos.
        </HelpFaq>
        <HelpFaq question="¿El logo del cliente es obligatorio?">
          No es obligatorio, pero es sumamente recomendado: cuando cargás el logo del cliente, todos los certificados y protocolos PDF se generan con imagen corporativa dual (tu consultora + el cliente).
        </HelpFaq>
      </HelpSection>
    </div>
  )
};
