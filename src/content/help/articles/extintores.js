// src/content/help/articles/extintores.js
import React from 'react';
import { 
  HelpPurpose, 
  HelpStep, 
  HelpTip, 
  HelpWarning, 
  HelpFaq, 
  HelpSection 
} from '@/components/help/HelpComponents';
import { Flame, CheckCircle2, Clock, AlertTriangle, FileText } from 'lucide-react';

export const extintoresHelp = {
  key: 'extintores',
  title: 'Control e Inventario de Extintores',
  subtitle: 'Parque de extintores, fechas de recarga, prueba hidráulica e inspecciones periódicas',
  icon: Flame,
  tags: ['extintores', 'matafuegos', 'recarga', 'prueba-hidraulica', 'marbete', 'iramm', 'inspeccion', 'pdf'],
  render: () => (
    <div className="space-y-5">
      <HelpPurpose>
        El módulo de **Extintores** te permite llevar un control exhaustivo del parque de extintores (matafuegos) de cada cliente, alertando sobre vencimientos de recarga anual y prueba hidráulica quinquenal, y generando planillas de control periódico e informes según normas IRAM y Decreto 351/79.
      </HelpPurpose>

      <HelpSection title="1. Inventario y Carga de Extintores" id="inventario">
        <HelpStep
          number={1}
          title="Alta de Extintor Individual"
        >
          Indicá el Cliente, Establecimiento y Sector físico de ubicación (ej. <em>Oficina Técnica, Pasillo Principal, Tablero General</em>).
        </HelpStep>

        <HelpStep
          number={2}
          title="Datos Técnicos del Equipo"
        >
          Completá:
          <ul className="list-disc pl-4 space-y-1 mt-1">
            <li><strong>Número de Puesto / Baliza:</strong> Identificador correlativo en planta.</li>
            <li><strong>Tipo de Agente:</strong> Polvo ABC, CO2, Agua bajo presión, Haloclean, HCFC, etc.</li>
            <li><strong>Capacidad:</strong> 5kg, 10kg, 2.5kg, 50kg rodante, etc.</li>
            <li><strong>Fabricante y Número de Chapa / Marbete.</strong></li>
          </ul>
        </HelpStep>

        <HelpStep
          number={3}
          title="Vencimientos Críticos"
        >
          Ingresá la <strong>Fecha de Última Recarga</strong> (vence al año) y la <strong>Fecha de Prueba Hidráulica</strong> (vence a los 5 años). El sistema calculará automáticamente el estado del semáforo.
          <HelpTip>
            Los extintores con vencimiento próximo a 30 días se iluminan en color amarillo, y los vencidos en rojo, alertando directamente en el Dashboard general.
          </HelpTip>
        </HelpStep>
      </HelpSection>

      <HelpSection title="2. Inspección Mensual y Planillas" id="inspeccion">
        <HelpStep
          number={4}
          title="Chequeo de Componentes"
        >
          Durante las recorridas mensuales, verificá y registrá: manómetro en rango verde, precinto de seguridad intacto, manguera/tobera en buen estado, altura reglamentaria, señalización IRAM y baliza despejada.
        </HelpStep>

        <HelpStep
          number={5}
          title="Reporte e Informe de Extintores en PDF"
        >
          Descargá la planilla completa de extintores para entregar a la empresa y al servicio de recarga autorizado.
        </HelpStep>
      </HelpSection>

      <HelpSection title="Preguntas Frecuentes (FAQs)" id="faqs">
        <HelpFaq question="¿Puedo filtrar extintores por estado o por sector?">
          Sí. La tabla cuenta con filtros rápidos para ver solo extintores vencidos, próximos a vencer o de un sector en particular.
        </HelpFaq>
      </HelpSection>
    </div>
  )
};
