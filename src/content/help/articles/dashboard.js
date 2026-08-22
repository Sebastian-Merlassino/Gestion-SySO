// src/content/help/articles/dashboard.js
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
import { Building, TrendingUp, Calendar, AlertTriangle, Flame, ShieldCheck, Gift } from 'lucide-react';

export const dashboardHelp = {
  key: 'dashboard',
  title: 'Dashboard Principal',
  subtitle: 'Panel de control centralizado y métricas de gestión',
  icon: Building,
  tags: ['dashboard', 'kpi', 'cuotas', 'vencimientos', 'estadísticas', 'accesos'],
  render: () => (
    <div className="space-y-5">
      <HelpPurpose>
        El **Dashboard Principal** es el centro de comando de tu cuenta. Te permite visualizar el estado global de tu servicio de Higiene y Seguridad, controlar vencimientos críticos, monitorear la cuota de tu plan y acceder rápidamente a todos los módulos operativos.
      </HelpPurpose>

      <HelpSection title="1. Métricas y Tarjetas KPI" id="kpis">
        <HelpStep
          number={1}
          title="Tarjetas de Estado y Conteos Rápidos"
        >
          En la parte superior encontrarás las métricas clave:
          <ul className="list-disc pl-4 space-y-1 mt-1">
            <li><strong>Clientes Activos:</strong> Cantidad de Razones Sociales cargadas vs. el límite de tu plan actual.</li>
            <li><strong>Visitas y Constancias:</strong> Cantidad total de visitas técnicas efectuadas.</li>
            <li><strong>Acciones Correctivas:</strong> Pendientes vs. cerradas para un seguimiento ágil.</li>
            <li><strong>Capacitaciones:</strong> Estado del plan formativo del período actual.</li>
          </ul>
        </HelpStep>

        <HelpStep
          number={2}
          title="Banner de Plan y Cuotas"
        >
          Muestra tu plan activo (Gratis, Básico, Estándar o Libre). Si tenés una bonificación o regalo activo, se refleja la fecha de vigencia con un banner distintivo.
          <HelpTip>
            Haciendo clic en el botón <strong>"Ver Planes"</strong> o <strong>"Mejorar Plan"</strong> podés actualizar la cuota de clientes o sumar nuevos técnicos a tu equipo.
          </HelpTip>
        </HelpStep>
      </HelpSection>

      <HelpSection title="2. Accesos Rápidos y Notificaciones" id="accesos">
        <HelpStep
          number={3}
          title="Panel de Vencimientos de Extintores"
        >
          Si contás con extintores registrados próximos a vencer o vencidos, el dashboard los resalta en color ámbar/rojo con enlace directo para gestionar la recarga o prueba hidráulica.
        </HelpStep>

        <HelpStep
          number={4}
          title="Próximas Visitas y Capacitaciones"
        >
          Agenda centralizada de compromisos técnicos para no perder de vista inspecciones en planta ni cursos programados con el personal.
          <HelpWarning>
            Los clientes o auditores con rol de solo lectura pueden consultar todos los indicadores pero no modificarán la cuota del plan ni los accesos del equipo.
          </HelpWarning>
        </HelpStep>
      </HelpSection>

      <HelpSection title="Preguntas Frecuentes (FAQs)" id="faqs">
        <HelpFaq question="¿Cómo actualizo las métricas si cargué un dato reciente?">
          El dashboard se sincroniza automáticamente con la base de datos al ingresar o refrescar la página. Si acabás de registrar una visita o cliente, los contadores se actualizarán al instante.
        </HelpFaq>
        <HelpFaq question="¿Qué significa el badge 'Plan Libre' o 'Plan Estándar'?">
          Indica el nivel de suscripción de tu cuenta profesional y la capacidad de clientes/técnicos habilitados en el sistema multi-tenant.
        </HelpFaq>
      </HelpSection>
    </div>
  )
};
