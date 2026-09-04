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
import { 
  Building, 
  Calendar, 
  Clock, 
  Users, 
  Activity, 
  FileText, 
  Printer, 
  Download, 
  AlertTriangle, 
  TrendingUp, 
  Sparkles, 
  Mic, 
  PlusCircle, 
  CheckCircle2, 
  ListChecks, 
  UserCheck, 
  BarChart3, 
  ShieldCheck,
  CalendarDays,
  Flame,
  ArrowRight
} from 'lucide-react';

export const dashboardHelp = {
  key: 'dashboard',
  title: 'Dashboard Principal',
  subtitle: 'Centro de comando, vencimientos del programa, agenda de calendario, tareas internas y estadísticas oficiales de siniestralidad',
  icon: Building,
  tags: ['dashboard', 'vencimientos', 'calendario', 'tareas', 'tecnicos', 'asignacion', 'estadisticas', 'siniestralidad', 'srt', 'pdf', 'incidencia', 'mortalidad', 'dmb', 'jornadas-perdidas', 'kpi', 'nomina'],
  render: () => (
    <div className="space-y-6">
      {/* PROPÓSITO */}
      <HelpPurpose>
        El **Dashboard Principal** es el centro neurálgico y panel de control operativo de tu servicio de Higiene y Seguridad. Desde aquí supervisás el estado general de tu cuenta, controlás los vencimientos técnicos próximos del Programa de Gestión, administrás la agenda en un calendario interactivo, coordinás tareas y asignaciones para tu equipo técnico de campo con asistencia por IA, y analizás las estadísticas e índices oficiales de siniestralidad laboral (SRT) con descarga de reportes ejecutivos en PDF.
      </HelpPurpose>

      {/* SECCIÓN 1: VENCIMIENTOS */}
      <HelpSection title="1. Panel de Vencimientos (Programa de Gestión)" id="vencimientos" icon={Clock}>
        <div className="text-xs text-slate-600 leading-relaxed space-y-2">
          La pestaña <strong>"Vencimientos"</strong> te brinda visibilidad preventiva inmediata sobre los hitos técnicos, inspecciones, mediciones y actividades programadas para tus clientes que requieren cumplimiento urgente.
        </div>

        <HelpStep
          number={1}
          title="Ventana Temporal de Control"
        >
          El sistema filtra y ordena automáticamente todas las actividades del <strong>Programa de Gestión Anual</strong> planificadas entre el <strong>primer día del mes actual</strong> y el <strong>último día del mes siguiente</strong> (ventana bimestral de anticipación).
        </HelpStep>

        <HelpStep
          number={2}
          title="Columnas de Información y Semáforo de Alertas"
        >
          Para cada actividad programada se detalla:
          <ul className="list-disc pl-4 space-y-1.5 mt-1 text-slate-600">
            <li><strong>Cliente / Razón Social:</strong> Empresa destinataria de la labor técnica.</li>
            <li><strong>Establecimiento:</strong> Sucursal, planta fabril o sede física donde se efectúa.</li>
            <li><strong>Actividad:</strong> Tarea técnica planificada (ej. <em>Capacitación sobre extintores</em>, <em>Medición de Puesta a Tierra</em>, <em>Relevamiento ergonómico</em>).</li>
            <li>
              <strong>Fecha Planificada y Alertas Visuales:</strong>
              <div className="mt-1 space-y-1 pl-1 text-[11px]">
                <div className="flex items-center gap-1.5 text-red-600 font-semibold">
                  <span className="h-2 w-2 rounded-full bg-red-500" />
                  <span>En rojo:</span> Actividad con fecha límite vencida y sin registrar fecha de realización.
                </div>
                <div className="flex items-center gap-1.5 text-amber-600 font-semibold">
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  <span>En amarillo:</span> Actividad que vence en los próximos 15 días corridos.
                </div>
                <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                  <span className="h-2 w-2 rounded-full bg-slate-400" />
                  <span>En texto estándar:</span> Actividad con margen superior a 15 días.
                </div>
              </div>
            </li>
            <li>
              <strong>Estado en Tiempo Real:</strong>
              <span className="inline-flex gap-1 ml-1 items-center">
                <HelpBadge label="Vigente" variant="green" />
                <HelpBadge label="Vencido" variant="red" />
              </span>
            </li>
          </ul>
        </HelpStep>

        <HelpStep
          number={3}
          title="Acceso Rápido al Programa Completo"
          isLast={true}
        >
          Al pie de la tabla disponés del enlace <strong>"Ver todos los vencimientos (N) →"</strong> y el botón superior <strong>"PROGRAMA DE GESTIÓN"</strong>, los cuales te redirigen directamente al módulo integral para auditar o asentar realizaciones de todo el ejercicio anual.
        </HelpStep>
      </HelpSection>

      {/* SECCIÓN 2: CALENDARIO */}
      <HelpSection title="2. Calendario Interactivo y Programación de Actividades" id="calendario" icon={CalendarDays}>
        <div className="text-xs text-slate-600 leading-relaxed">
          La pestaña <strong>"Calendario"</strong> transforma las fechas de compromisos técnicos y tareas internas en una vista de agenda mensual dinámica.
        </div>

        <HelpStep
          number={4}
          title="Navegación Mensual y Código de Puntos de Color"
        >
          Podés retroceder y avanzar de mes con los botones <strong>&lt;</strong> y <strong>&gt;</strong> situados en la cabecera. Cada día del mes que posea actividades o tareas asignadas exhibe un <strong>punto indicador inferior (Dot)</strong> codificado por color:
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2">
            <div className="p-2.5 rounded-xl border border-emerald-200 bg-emerald-50/50 text-[11px] text-emerald-900 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-emerald-700">
                <span className="h-2 w-2 rounded-full bg-[#00b050]" />
                Punto Verde
              </div>
              <p>Todas las actividades y tareas programadas para ese día fueron cumplidas.</p>
            </div>
            <div className="p-2.5 rounded-xl border border-amber-200 bg-amber-50/50 text-[11px] text-amber-900 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-amber-700">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                Punto Ámbar
              </div>
              <p>Hay actividades o tareas pendientes dentro de término para esa fecha.</p>
            </div>
            <div className="p-2.5 rounded-xl border border-red-200 bg-red-50/50 text-[11px] text-red-900 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-red-700">
                <span className="h-2 w-2 rounded-full bg-red-500" />
                Punto Rojo
              </div>
              <p>Existe al menos una actividad o tarea con fecha superada que sigue pendiente.</p>
            </div>
          </div>
        </HelpStep>

        <HelpStep
          number={5}
          title="Selección de Día y 'Tareas del Día'"
        >
          Al hacer clic sobre cualquier casillero numérico, la fecha se resalta en azul y se despliega abajo la sección <strong>"TAREAS DEL DÍA (AAAA-MM-DD)"</strong> con el detalle individual de:
          <ul className="list-disc pl-4 space-y-1 mt-1 text-slate-600">
            <li><strong>Actividades del Programa Anual:</strong> Con indicación de cliente y badge de estado (<em>Hecho</em> en verde o <em>Pendiente</em> en ámbar).</li>
            <li><strong>Tareas Internas:</strong> Asuntos operativos y recordatorios agendados para esa jornada.</li>
          </ul>
        </HelpStep>

        <HelpStep
          number={6}
          title="Atajo '+ Añadir Actividad'"
          isLast={true}
        >
          Si seleccionás una fecha y pulsás el botón azul <strong>"+ Añadir Actividad"</strong>, el sistema te redirige directamente al formulario del <em>Programa de Gestión Anual</em> con la <strong>fecha seleccionada pre-completada de manera automática</strong> en la URL (<code>?add-date=AAAA-MM-DD</code>).
          <HelpTip>
            Esto te permite planificar visitas, mediciones o auditorías sobre el calendario visual sin tener que volver a tipear o buscar la fecha en el formulario.
          </HelpTip>
        </HelpStep>
      </HelpSection>

      {/* SECCIÓN 3: TAREAS PENDIENTES Y ASIGNACIÓN */}
      <HelpSection title="3. Tareas Pendientes, Asignación a Técnicos y Dictado IA" id="tareas" icon={ListChecks}>
        <div className="text-xs text-slate-600 leading-relaxed">
          La tarjeta <strong>"Tareas"</strong> permite organizar los pendientes operativos del día a día, delegar trabajos de campo a colaboradores y mantener un seguimiento estricto de ejecuciones.
        </div>

        <HelpStep
          number={7}
          title="Pestañas de Estado (Pendientes vs. Terminadas)"
        >
          Permite conmutar instantáneamente entre la lista activa de <strong>Pendientes (N)</strong> y el historial de <strong>Terminadas (N)</strong>.
          <ul className="list-disc pl-4 space-y-1 mt-1 text-slate-600">
            <li><strong>Completar una tarea:</strong> Hacé clic en la casilla de verificación (checkbox) a la izquierda. La tarea se tachará y pasará automáticamente al listado de terminadas.</li>
            <li><strong>Eliminar una tarea:</strong> Presioná el ícono de cesto de basura rojo a la derecha para borrarla definitivamente.</li>
          </ul>
        </HelpStep>

        <HelpStep
          number={8}
          title="Formulario de Carga Rápida y Campos Disponibles"
        >
          En la parte inferior de la tarjeta podés registrar un nuevo pendiente completando:
          <div className="space-y-2 mt-2">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
              <strong className="text-slate-900 block text-xs">A. Título de la tarea y Asistente IA de Voz</strong>
              <p className="text-[11px] text-slate-600">
                Escribí el texto o hacé clic en el ícono de <strong>micrófono</strong> para dictar por voz la tarea (ideal desde el teléfono en planta). Podés usar el botón de <strong>varita mágica</strong> para que la Inteligencia Artificial refine y redacte profesionalmente la descripción técnica.
              </p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
              <strong className="text-slate-900 block text-xs">B. Fecha Límite (DD/MM/AAAA)</strong>
              <p className="text-[11px] text-slate-600">
                Indicá la fecha límite estipulada para concluir la tarea. Esta fecha se reflejará también en los puntos del calendario.
              </p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
              <strong className="text-slate-900 block text-xs">C. Razón Social y Establecimiento (Opcionales)</strong>
              <p className="text-[11px] text-slate-600">
                Podés asociar la tarea a una empresa cliente. Al seleccionar una Razón Social, el selector de establecimientos se filtrará automáticamente mostrando únicamente las sedes de esa empresa.
              </p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
              <strong className="text-slate-900 block text-xs">D. Asignar a (Técnico del Equipo)</strong>
              <p className="text-[11px] text-slate-600">
                Desplegá el selector para delegar la tarea a un profesional específico de tu equipo de trabajo registrado en el módulo <em>Equipo de Trabajo</em>.
              </p>
            </div>
          </div>
        </HelpStep>

        <HelpStep
          number={9}
          title="Regla de Privacidad y Visibilidad Multi-Usuario"
          isLast={true}
        >
          Para mantener la privacidad y evitar que la bandeja de tareas se sature de pendientes ajenos, el sistema aplica un <strong>filtrado estricto por usuario conectado</strong>:
          <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 mt-2 text-xs text-blue-950 space-y-1">
            <p className="font-bold flex items-center gap-1.5 text-blue-900">
              <UserCheck className="h-4 w-4 text-[#468DFF]" />
              ¿Qué tareas ve cada integrante en su Dashboard?
            </p>
            <ul className="list-disc pl-4 space-y-1 text-[11px] text-blue-900/90">
              <li>Tareas creadas directamente por él mismo (<code>created_by</code>).</li>
              <li>Tareas que otro administrador o colega le haya <strong>asignado expresamente a su usuario o ID de técnico</strong> (<code>assigned_to</code>).</li>
            </ul>
          </div>
        </HelpStep>
      </HelpSection>

      {/* SECCIÓN 4: ESTADÍSTICAS Y SINIESTRALIDAD */}
      <HelpSection title="4. Estadísticas e Índices Oficiales de Siniestralidad (Normativa SRT)" id="estadisticas" icon={Activity}>
        <div className="text-xs text-slate-600 leading-relaxed space-y-2">
          El panel inferior de <strong>Estadísticas e Índices de Siniestralidad</strong> computa y grafica los indicadores epidemiológicos estandarizados de la <em>Superintendencia de Riesgos del Trabajo (SRT)</em> de la República Argentina.
        </div>

        <HelpStep
          number={10}
          title="Filtros Requeridos: ¿Por qué debes seleccionar una Empresa?"
        >
          En la cabecera del panel encontrarás tres filtros determinantes:
          <ul className="list-disc pl-4 space-y-1 mt-1 text-slate-600">
            <li>
              <strong>Cliente / Razón Social (MANDATORIO para administradores y técnicos):</strong> 
              <br /><span className="text-amber-800 font-semibold text-[11px]">IMPORTANTE:</span> Cada razón social cuenta con una dotación de personal y un registro de siniestralidad independiente. Si este filtro se encuentra en <em>"Selecciona una empresa"</em>, <strong>todos los contadores y gráficos mostrarán 0</strong> para no mezclar universos de trabajadores dispares. (Si ingresás con rol <em>Cliente</em>, tu empresa se fija automáticamente).
            </li>
            <li><strong>Establecimiento:</strong> Opcional. Permite analizar la siniestralidad de una planta o sucursal particular, o dejarlo en blanco para obtener el consolidado de toda la razón social.</li>
            <li><strong>Año:</strong> Año del ejercicio anual a analizar (por defecto el año actual, permitiendo seleccionar ejercicios pasados).</li>
          </ul>
        </HelpStep>

        <HelpStep
          number={11}
          title="Datos Indispensables en el Sistema para el Cálculo"
        >
          Para que las fórmulas estadísticas puedan calcularse y no arrojen valores nulos o en cero, es obligatorio contar con datos previamente cargados en dos módulos clave:
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
            <div className="p-3 rounded-xl border border-slate-200 bg-white space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs">
                <Users className="h-4 w-4 text-[#468DFF]" />
                1. Nómina de Trabajadores (Módulo Clientes)
              </div>
              <p className="text-[11px] text-slate-600 leading-normal">
                En <strong>Clientes &gt; Establecimientos &gt; Nómina</strong> deben estar dados de alta los empleados asociados al establecimiento y con su <em>fecha de carga</em> correspondiente al año en estudio. La cantidad total define el <strong>Personal Cubierto</strong> (denominador de las tasas SRT). <em>Si la nómina está vacía, el denominador es cero y los índices darán 0.</em>
              </p>
            </div>

            <div className="p-3 rounded-xl border border-slate-200 bg-white space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                2. Registro de Siniestros (Módulo Accidentes)
              </div>
              <p className="text-[11px] text-slate-600 leading-normal">
                En el módulo <strong>Accidentes</strong> deben registrarse los eventos indicando: <em>Fecha del siniestro</em>, <em>Tipo</em> (Accidente de trabajo o Enfermedad profesional), <em>Nivel de Gravedad</em> (Leve, Grave, Mortal) y la cantidad de <strong>Días de baja médica</strong> (jornadas caídas por ILT).
              </p>
            </div>
          </div>
        </HelpStep>

        <HelpStep
          number={12}
          title="Tarjetas de Conteo Rápido de Siniestralidad"
        >
          El tablero superior resume las cantidades de eventos registrados en el período y empresa seleccionados:
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2 text-[11px]">
            <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
              <span className="font-bold text-slate-700 block">Acc. Trabajo</span>
              <span className="text-slate-500">Ocurridos en ocasión de las tareas laborales en planta.</span>
            </div>
            <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
              <span className="font-bold text-slate-700 block">In Itinere</span>
              <span className="text-slate-500">Ocurridos en el trayecto entre el domicilio y el trabajo.</span>
            </div>
            <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
              <span className="font-bold text-slate-700 block">Enf. Profesional</span>
              <span className="text-slate-500">Patologías listadas en el Decreto 658/96.</span>
            </div>
            <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
              <span className="font-bold text-slate-700 block">Reingreso</span>
              <span className="text-slate-500">Recaídas o secuelas de siniestros precedentes.</span>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-2 text-[11px] font-semibold text-slate-700">
            <span>Clasificación de Gravedad (AT y EP):</span>
            <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">Leve</span>
            <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800">Grave</span>
            <span className="px-2 py-0.5 rounded bg-red-100 text-red-800">Mortal</span>
          </div>
        </HelpStep>

        <HelpStep
          number={13}
          title="¿Qué es y cómo funciona cada uno de los 4 Índices Oficiales?"
        >
          Haciendo clic en las pestañas del gráfico podés auditar en profundidad cada indicador:

          <div className="space-y-4 mt-3">
            {/* ÍNDICE 1 */}
            <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <h6 className="font-outfit font-bold text-xs text-slate-900 flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#468DFF]" />
                  1. Índice de Incidencia (AT y EP)
                </h6>
                <span className="text-[10px] font-bold text-[#468DFF] bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                  Casos por cada 1.000 trabajadores
                </span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                <strong>¿Qué es?</strong> Es la tasa de frecuencia epidemiológica relativa. Representa la cantidad de trabajadores que sufrieron un accidente laboral con días de baja o secuela incapacitante, o una enfermedad profesional, en el término de un año por cada mil trabajadores cubiertos.
              </p>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                <strong>¿Para qué sirve?</strong> Permite medir la probabilidad de sufrir un infortunio laboral dentro de la empresa y compararse de forma estandarizada contra las estadísticas sectoriales de la SRT y de las ART.
              </p>
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 font-mono text-[10px] text-slate-800 font-bold">
                Fórmula: [(Casos de Accidentes de Trabajo + Casos de Enf. Profesionales) / Personal Cubierto] × 1.000
              </div>
            </div>

            {/* ÍNDICE 2 */}
            <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <h6 className="font-outfit font-bold text-xs text-slate-900 flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#0511F2]" />
                  2. Índice de Incidencia de Casos Mortales
                </h6>
                <span className="text-[10px] font-bold text-[#0511F2] bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                  Muertes por cada 1.000.000 de trabajadores
                </span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                <strong>¿Qué es?</strong> Es la tasa de letalidad laboral. Expresa la cantidad de fallecimientos derivados de contingencias laborales ocurridas en el trabajo por cada millón de personas cubiertas.
              </p>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                <strong>¿Para qué sirve?</strong> Monitorea eventos catastróficos o fallas severas no tolerables en los sistemas de gestión de riesgos. Su valor meta profesional es siempre cero.
              </p>
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 font-mono text-[10px] text-slate-800 font-bold">
                Fórmula: [Casos Mortales de AT y EP / Personal Cubierto] × 1.000.000
              </div>
            </div>

            {/* ÍNDICE 3 */}
            <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <h6 className="font-outfit font-bold text-xs text-slate-900 flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-500" />
                  3. Índice de Pérdida (IP - Jornadas No Trabajadas)
                </h6>
                <span className="text-[10px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-300">
                  Días perdidos por cada 1.000 trabajadores
                </span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                <strong>¿Qué es?</strong> Es la tasa de gravedad global acumulada. Refleja la cantidad total de jornadas laborales no trabajadas debido a incapacidad laboral temporaria (bajas de ART) por cada mil trabajadores cubiertos en la dotación anual.
              </p>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                <strong>¿Para qué sirve?</strong> Cuantifica el impacto real del daño y el ausentismo laboral que provocan los siniestros sobre la productividad general de la empresa.
              </p>
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 font-mono text-[10px] text-slate-800 font-bold">
                Fórmula: [Total de Días de Baja por AT y EP / Personal Cubierto] × 1.000
              </div>
            </div>

            {/* ÍNDICE 4 */}
            <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <h6 className="font-outfit font-bold text-xs text-slate-900 flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-800" />
                  4. Duración Media de las Bajas (DMB)
                </h6>
                <span className="text-[10px] font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-300">
                  Días promedio por siniestro con baja
                </span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                <strong>¿Qué es?</strong> Es el promedio de días caídos de reposo médico que genera cada siniestro que ocasionó ausentismo.
              </p>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                <strong>¿Para qué sirve?</strong> A diferencia del Índice de Pérdida (que relaciona los días con toda la dotación de la empresa), la DMB divide únicamente por la cantidad de accidentados con baja. Permite discernir si los eventos ocurridos fueron de rápida recuperación (baja duración) o traumatismos complejos de larga convalecencia (alta duración).
              </p>
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 font-mono text-[10px] text-slate-800 font-bold">
                Fórmula: Total de Días de Baja por AT y EP / Cantidad de Casos con Días de Baja
              </div>
            </div>
          </div>
        </HelpStep>

        <HelpStep
          number={14}
          title="Lectura del Gráfico: Comparativa Anual y Evolución Mensual"
          isLast={true}
        >
          El gráfico de barras interactivo presenta tres dimensiones temporales directas:
          <ul className="list-disc pl-4 space-y-1 mt-1 text-slate-600">
            <li><strong>Año Anterior (Barra Gris):</strong> Benchmark de referencia histórica para constatar si el índice mejoró o desmejoró respecto al año previo.</li>
            <li><strong>YTD (Year-To-Date - Barra Azul Claro):</strong> Tasa consolidada del año en curso acumulada hasta la fecha actual.</li>
            <li><strong>Meses (Ene a Dic - Barras Azules):</strong> Evolución mes a mes para detectar picos estacionales de accidentes o validar la eficacia de medidas preventivas implementadas.</li>
          </ul>
        </HelpStep>
      </HelpSection>

      {/* SECCIÓN 5: DESCARGA PDF E IMPRESIÓN */}
      <HelpSection title="5. Descarga de Reporte PDF e Impresión con Gráficos" id="reporte-pdf" icon={FileText}>
        <div className="text-xs text-slate-600 leading-relaxed space-y-2">
          En el extremo superior derecho del panel de siniestralidad se encuentran los botones de acción para exportar la información con calidad de informe gerencial:
        </div>

        <HelpStep
          number={15}
          title="Botón 'Descargar PDF': Estructura del Informe"
        >
          Al presionar <strong>"Descargar PDF"</strong>, el sistema genera automáticamente un documento oficial en formato <strong>A4 Apaisado (Landscape) de 4 páginas</strong> (una página exclusiva por cada uno de los 4 índices de la SRT):
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 mt-2 space-y-2 text-xs text-slate-700">
            <div className="flex items-center gap-2 font-bold text-slate-900">
              <Download className="h-4 w-4 text-[#468DFF]" />
              Contenido de cada página del reporte:
            </div>
            <ul className="list-disc pl-4 space-y-1.5 text-[11px] text-slate-600">
              <li><strong>Identidad Institucional (Branding):</strong> Encabezado con el Logo Corporativo de tu consultora (Logo 1 configurado en Mi Perfil), barra superior y colores con la paleta de tu organización.</li>
              <li><strong>Datos del Filtro:</strong> Razón Social, Establecimiento y Período Anual analizado.</li>
              <li><strong>Título y Fórmula Legal:</strong> Denominación formal del índice y la fórmula matemática oficial de la SRT.</li>
              <li><strong>Gráfico de Barras Vectorial de Alta Resolución:</strong> Ilustra de forma nítida la barra del Año Anterior, barra YTD y las 12 barras mensuales con sus valores numéricos y unidad correspondiente.</li>
              <li>
                <strong>Tabla de Datos Desglosada al Pie:</strong> Cuadrícula técnica con el desglose exacto de:
                <ul className="list-[circle] pl-4 mt-0.5 space-y-0.5 text-slate-500">
                  <li>Fila 1: Numerador (Casos / Días de baja).</li>
                  <li>Fila 2: Denominador (Personal cubierto / Casos con baja).</li>
                  <li>Fila 3: Valor del Índice calculado para el año previo, acumulado YTD y cada mes del año.</li>
                </ul>
              </li>
              <li><strong>Pie de Página Corporativo:</strong> Razón social o nombre de tu consultora en negrita, teléfonos, correo electrónico de contacto profesional y paginación (Página X de 4).</li>
            </ul>
          </div>
          <HelpTip>
            El archivo se descarga automáticamente con una nomenclatura clara: <code>Reporte_Siniestralidad_[RazonSocial]_[Año].pdf</code>.
          </HelpTip>
        </HelpStep>

        <HelpStep
          number={16}
          title="Botón 'Imprimir'"
          isLast={true}
        >
          El botón <strong>"Imprimir"</strong> abre la ventana de impresión nativa del navegador con el documento PDF ya renderizado en memoria, permitiéndote imprimir copias físicas directamente o guardarlo con tu impresora virtual predilecta sin ocupar espacio en el disco.
        </HelpStep>
      </HelpSection>

      {/* SECCIÓN 6: PREGUNTAS FRECUENTES */}
      <HelpSection title="Preguntas Frecuentes (FAQs)" id="faqs">
        <HelpFaq question="¿Por qué veo los gráficos y contadores de siniestralidad en cero?">
          En las cuentas de administradores y técnicos, los gráficos se mantienen en cero hasta que seleccionás una empresa en el filtro <strong>"Cliente / Razón Social"</strong>. Como las tasas dividen por el personal cubierto de cada empresa, el sistema requiere que especifiques qué cliente deseas auditar. Además, verificá que dicho cliente tenga cargada su <strong>Nómina de Personal</strong> para el año consultado.
        </HelpFaq>

        <HelpFaq question="¿Quiénes pueden ver una tarea asignada a un técnico?">
          Para garantizar la confidencialidad y el orden operativo, cada técnico de equipo visualiza en su dashboard únicamente las tareas creadas por él mismo y aquellas que le hayan sido asignadas a su nombre. Los administradores pueden consultar y gestionar las tareas creadas y asignadas en la organización.
        </HelpFaq>

        <HelpFaq question="¿Qué diferencia hay entre una Actividad del Calendario y una Tarea del panel derecho?">
          Las <strong>Actividades del Calendario</strong> son hitos y compromisos técnicos formales pertenecientes al <em>Programa de Gestión Anual</em> acordado con la empresa cliente (auditorías, mediciones, cursos). Las <strong>Tareas</strong> son recordatorios, órdenes de trabajo o pendientes operativos internos que podés cargar con dictado por voz y delegar a técnicos específicos.
        </HelpFaq>

        <HelpFaq question="¿Cómo se calcula el Personal Cubierto de un año si la nómina varió?">
          El sistema computa la cantidad de trabajadores registrados en la sección <strong>Clientes &gt; Nómina</strong> cuya fecha de carga o alta pertenezca al ejercicio anual analizado. Si la nómina no fue cargada, el sistema asumirá cero expuestos.
        </HelpFaq>

        <HelpFaq question="¿Los clientes con acceso al portal pueden descargar este reporte PDF?">
          Sí. Los usuarios con rol <em>Cliente</em> disponen del panel de estadísticas filtrado exclusivamente para su propia Razón Social y pueden visualizar los índices y descargar o imprimir el reporte PDF oficial de 4 páginas en cualquier momento.
        </HelpFaq>
      </HelpSection>
    </div>
  )
};
