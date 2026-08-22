// src/content/help/articles/visitas.js
import React from 'react';
import { 
  HelpPurpose, 
  HelpStep, 
  HelpTip, 
  HelpWarning, 
  HelpFaq, 
  HelpSection 
} from '@/components/help/HelpComponents';
import { ClipboardCheck, FileText, Send, Share2, PenTool, CheckCircle2 } from 'lucide-react';

export const visitasHelp = {
  key: 'visitas',
  title: 'Constancia de Visita Técnica',
  subtitle: 'Actas de inspección en campo, observaciones, firmas y despacho digital',
  icon: ClipboardCheck,
  tags: ['visitas', 'constancias', 'actas', 'auditoria', 'firmas', 'whatsapp', 'email', 'pdf'],
  render: () => (
    <div className="space-y-5">
      <HelpPurpose>
        La **Constancia de Visita** es el documento fehaciente que certifica tu presencia técnica en el establecimiento de la empresa cliente, registrando los sectores relevados, las observaciones constatadas, las recomendaciones preventivas y las firmas de conformidad.
      </HelpPurpose>

      <HelpSection title="1. Carga de la Constancia" id="carga">
        <HelpStep
          number={1}
          title="Selección de Cliente y Establecimiento"
        >
          Indicá la empresa y sede visitada. Se cargará la fecha y hora de la visita, junto con los datos de tu matrícula profesional precargada en tu perfil.
        </HelpStep>

        <HelpStep
          number={2}
          title="Motivo de la Visita y Sectores Recorridos"
        >
          Elegí el motivo (inspección periódica, auditoría de extintores, relevamiento ergonómico, investigación, etc.) y marcá las áreas de la planta inspeccionadas.
        </HelpStep>

        <HelpStep
          number={3}
          title="Observaciones y Recomendaciones (con IA)"
        >
          Ingresá el detalle de las condiciones relevadas y las recomendaciones técnicas de seguridad. Podés usar el asistente de voz por IA para dictar fluidamente mientras caminás por la fábrica o el depósito.
          <HelpTip>
            Las recomendaciones cargadas pueden vincularse directamente con el módulo de Acciones Correctivas para automatizar el seguimiento.
          </HelpTip>
        </HelpStep>

        <HelpStep
          number={4}
          title="Firmas de Conformidad"
        >
          El documento cuenta con dos bloques de firma digital: la del Profesional SySO y la del Receptor de la Empresa (dueño, gerente, jefe de planta o delegado).
        </HelpStep>
      </HelpSection>

      <HelpSection title="2. Generación y Despacho Unificado" id="despacho">
        <HelpStep
          number={5}
          title="Emisión del PDF y Compartir"
        >
          Al presionar <strong>"Generar PDF"</strong> o <strong>"Compartir"</strong>, se abrirá el diálogo unificado de despacho:
          <ul className="list-disc pl-4 space-y-1 mt-1">
            <li><strong>Pestaña Email:</strong> Envío con plantilla oficial corporativa y PDF adjunto a los contactos de la Razón Social.</li>
            <li><strong>Pestaña WhatsApp:</strong> Envío rápido del enlace de la constancia al número del responsable de la empresa.</li>
          </ul>
        </HelpStep>
      </HelpSection>

      <HelpSection title="Preguntas Frecuentes (FAQs)" id="faqs">
        <HelpFaq question="¿Puedo generar la constancia desde el celular?">
          Sí. Todo el formulario y el lienzo de firmas están optimizados para dispositivos móviles (smartphones y tablets).
        </HelpFaq>
        <HelpFaq question="¿La firma de mi perfil se inserta automáticamente?">
          Sí. Si ya dibujaste o subiste tu firma digital en la sección <em>Editar Perfil</em>, el sistema la estampa automáticamente en el bloque del profesional.
        </HelpFaq>
      </HelpSection>
    </div>
  )
};
