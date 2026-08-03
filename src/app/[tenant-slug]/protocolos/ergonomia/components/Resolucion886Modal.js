// src/app/[tenant-slug]/protocolos/ergonomia/components/Resolucion886Modal.js
'use client';

import React from 'react';
import { Info, ExternalLink } from 'lucide-react';
import AppInfoModal from '@/components/ui/AppInfoModal';
import AppButton from '@/components/ui/AppButton';

export default function Resolucion886Modal({ isOpen, onClose }) {
  return (
    <AppInfoModal
      isOpen={isOpen}
      onClose={onClose}
      title="Instructivo de Completado — Res. SRT Nº 886/15"
      subtitle="Resolución de la Superintendencia de Riesgos del Trabajo"
      icon={Info}
      maxWidth="max-w-4xl"
      closeButtonText="Cerrar"
    >
      <div className="space-y-4">
        {/* Botón de Enlace Externo */}
        <div className="flex justify-end">
          <AppButton
            variant="secondary"
            onClick={() => window.open('https://servicios.infoleg.gob.ar/infolegInternet/anexos/245000-249999/246272/norma.htm', '_blank')}
            className="text-xs font-bold gap-1.5"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Ver Resolución Completa (Infoleg)
          </AppButton>
        </div>

        {/* Texto del Instructivo */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-xs text-slate-700 leading-relaxed font-sans max-h-[60vh] overflow-y-auto space-y-4 shadow-inner">
          <div>
            <h4 className="font-extrabold text-slate-900 text-sm uppercase mb-2 border-b border-slate-200 pb-1">
              1. PLANILLA N° 1: IDENTIFICACIÓN DE FACTORES DE RIESGO
            </h4>
            <p className="mb-2">
              A los fines de identificar la presencia de factores de riesgo que contribuyan al desarrollo de las enfermedades señaladas en el artículo 1° de la presente resolución, se debe completar la Planilla N° 1 sobre Identificación de Factores de Riesgo, según el siguiente detalle:
            </p>
            <ul className="list-disc pl-5 space-y-1 mb-2">
              <li>
                <strong>a)</strong> Por puesto de trabajo, cuando los trabajadores realizan las mismas tareas durante la jornada de trabajo, siempre que se realicen en condiciones de trabajo similares.
              </li>
              <li>
                <strong>b)</strong> Por trabajador, en los siguientes casos:
                <ul className="list-decimal pl-5 mt-1 space-y-1">
                  <li>Cuando el trabajador realice tareas de características y condiciones diferentes a las del resto de los trabajadores del establecimiento.</li>
                  <li>Cuando el trabajador denuncie alguna de las enfermedades señaladas en el artículo 1° de la presente resolución.</li>
                  <li>Cuando el trabajador presente una manifestación temprana de enfermedad durante el desarrollo de sus tareas habituales, de acuerdo a lo comunicado a los Servicios de Medicina del Trabajo y de Higiene y Seguridad en el Trabajo del establecimiento, o de lo manifestado al supervisor, al delegado gremial o que exista algún otro antecedente donde ello se evidencie.</li>
                </ul>
              </li>
            </ul>
            <p className="italic text-slate-500">
              Para la confección de esta planilla se consideró hipotéticamente que el puesto de trabajo está compuesto por tres tareas principales. En el caso que el puesto de trabajo esté compuesto por más de tres tareas, se apegarán las planillas que sean necesarias.
            </p>
          </div>

          <div>
            <h4 className="font-extrabold text-slate-900 text-sm uppercase mb-2 border-b border-slate-200 pb-1">
              2. PLANILLA N° 2: EVALUACIÓN INICIAL DE FACTORES DE RIESGO
            </h4>
            <p className="mb-2">
              A los fines de evaluar en forma inicial los factores de riesgo, se deberán completar las Planillas que correspondan de acuerdo a los factores de riesgo identificados en la Planilla N° 1, según el siguiente detalle:
            </p>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3 bg-white p-3 rounded-lg border border-slate-200 font-semibold text-slate-800">
              <li>• Planilla 2.A: Levantamiento y/o descenso manual de cargas sin transporte.</li>
              <li>• Planilla 2.B: Empuje y arrastre manual de cargas.</li>
              <li>• Planilla 2.C: Transporte manual de cargas.</li>
              <li>• Planilla 2.D: Bipedestación.</li>
              <li>• Planilla 2.E: Movimientos repetitivos de miembros superiores.</li>
              <li>• Planilla 2.F: Posturas forzadas.</li>
              <li>• Planilla 2.G: Vibraciones del conjunto mano-brazo y de cuerpo entero.</li>
              <li>• Planilla 2.H: Confort térmico y 2.I: Estrés de contacto.</li>
            </ul>
            <p className="mb-2">
              Cuando se obtenga como resultado de la Evaluación Inicial de la tarea, que el nivel de riesgo es tolerable, se debe completar el resultado en la Planilla N° 1, asignando el Nivel 1 en la columna “Nivel de Riesgo”.
            </p>

            <h5 className="font-bold text-slate-800 mt-3 mb-1">2.1. EVALUACION DE RIESGOS</h5>
            <p className="mb-2">
              Cuando de la Evaluación Inicial de Factores de Riesgo de la Planilla N° 2 se obtenga que el nivel de riesgo es No Tolerable, deberá realizarse una Evaluación de Riesgos del puesto de trabajo, por un profesional con conocimientos en ergonomía.
            </p>
            <p className="mb-2">
              Entiéndase por profesional con conocimiento en ergonomía, a un profesional experimentado y debidamente capacitado que certifique su conocimiento en materia ergonómica.
            </p>
            <p className="mb-2">
              El resultado de la Evaluación de Riesgos deberá plasmarse en la Planilla N° 1, colocando el valor 2 ó 3 en la columna “Nivel de Riesgo”, según el resultado obtenido. A partir de ello, se identifican las prioridades de implementación de medidas preventivas y/o correctivas para proteger la salud del trabajador.
            </p>
            <p className="mb-2">
              A efectos de evaluar los factores de riesgo se deben utilizar los métodos de evaluación citados en el Anexo I —Ergonomía— de la Resolución M.T.E. y S.S. N° 295 de fecha 10 de noviembre de 2003 de acuerdo al alcance de los mismos:
            </p>
            <ul className="list-disc pl-5 space-y-1 mb-2">
              <li>
                <strong>a) Nivel de Actividad Manual:</strong> para movimientos repetitivos del segmento mano-muñeca-antebrazo realizados durante más de la mitad del tiempo de la jornada.
              </li>
              <li>
                <strong>b) Tablas del método Levantamiento Manual de Cargas:</strong> para tareas donde se realiza levantamiento y descenso manual de cargas sin traslado. Además, se utilizarán otros métodos reconocidos internacionalmente en cuanto se adapten a los riesgos que se propone evaluar. El profesional con conocimiento en ergonomía debe registrar el método o técnica utilizada, junto con el desarrollo del mismo y el resultado alcanzado, de acuerdo a lo mencionado precedentemente.
              </li>
            </ul>
            <p className="mb-2">
              La evaluación de riesgos de un puesto de trabajo, debe ser realizada cuando se obtenga como resultado un nivel no tolerable en la Planilla N° 2, y también podrá hacerse en forma preventiva/proactiva cuando el empleador, el responsable del Servicio de Higiene y Seguridad, el de Medicina del Trabajo, el profesional con conocimiento en ergonomía o el delegado gremial lo solicitaren.
            </p>

            <h5 className="font-bold text-slate-800 mt-3 mb-1">2.2. NIVELES DE RIESGO</h5>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Nivel de riesgo 1:</strong> El nivel es tolerable, por lo que no se considera necesaria la implementación de medidas correctivas y/o preventivas para proteger la salud del trabajador.</li>
              <li><strong>Nivel de riesgo 2:</strong> El nivel es moderado, por lo cual se deberán implementar medidas correctivas y/o preventivas para proteger la salud del trabajador.</li>
              <li><strong>Nivel de riesgo 3:</strong> El nivel es no tolerable, por lo que se deberán implementar medidas correctivas y/o preventivas en forma inmediata, con el objeto de disminuir el nivel de riesgo.</li>
            </ul>
          </div>

          <div>
            <h4 className="font-extrabold text-slate-900 text-sm uppercase mb-2 border-b border-slate-200 pb-1">
              3. PLANILLA N° 3: IDENTIFICACIÓN DE MEDIDAS CORRECTIVAS Y PREVENTIVAS
            </h4>
            <p className="mb-2">
              La Planilla N° 3 deberá ser completada en forma posterior a la Evaluación de Riesgo y consta de dos partes:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong>a) Medidas Preventivas Generales:</strong> Deberán ser realizadas para todos los trabajadores. El empleador debe mantener registro documental que acredite el cumplimiento de dichas medidas.
              </li>
              <li>
                <strong>b) Medidas Correctivas y Preventivas Específicas:</strong> Comprenderá un listado de medidas a implementar para prevenir, eliminar o mitigar el riesgo, las cuales deberán ser definidas en forma conjunta entre el responsable del Servicio de Higiene y Seguridad, el responsable del Servicio de Medicina del Trabajo y el profesional con conocimiento en ergonomía, con la participación del trabajador que se desempeña en el puesto de trabajo y los representantes de los trabajadores, con acuerdo del encargado del establecimiento.
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-extrabold text-slate-900 text-sm uppercase mb-2 border-b border-slate-200 pb-1">
              4. PLANILLA N° 4: MATRIZ DE SEGUIMIENTO DE MEDIDAS PREVENTIVAS
            </h4>
            <p>
              En la Planilla N° 4 se deberán enumerar las medidas preventivas definidas en la Planilla N° 3 y registrar el nombre del puesto de trabajo al cual pertenece, el nivel de riesgo identificado en la Planilla N° 1, la fecha en que se identificó el riesgo, la fecha en que se implementó la medida administrativa, la fecha en que se implementó la medida de ingeniería y la fecha en que se verificó que dichas medidas alcanzaron el objetivo buscado (Fecha de cierre).
            </p>
          </div>

          <div>
            <h4 className="font-extrabold text-slate-900 text-sm uppercase mb-2 border-b border-slate-200 pb-1">
              5. PLAZOS DE CUMPLIMIENTO
            </h4>
            <p className="mb-2">
              A los fines del cumplimiento de la presente resolución, se establecen los siguientes plazos:
            </p>
            <ul className="list-disc pl-5 space-y-2 mb-2">
              <li>
                <strong>a)</strong> Para la confección de las Planillas N° 1 y N° 2 se establece un plazo de DOCE (12) meses a partir de la fecha de entrada en vigencia de la norma.
                <p className="mt-1">
                  Los resultados de la identificación de riesgos plasmados en la Planilla N° 1, tendrán vigencia de UN (1) año desde su confección, siempre y cuando durante dicho período:
                </p>
                <ul className="list-decimal pl-5 mt-1 space-y-1">
                  <li>No se hayan realizado cambios sustanciales en el proceso, las máquinas, las herramientas, la organización del trabajo, el nivel de exigencia.</li>
                  <li>No se haya efectuado alguna modificación a las condiciones y medio ambiente de trabajo.</li>
                  <li>No se haya presentado alguna enfermedad profesional ni manifestación temprana de enfermedad vinculada con las mencionadas en el artículo 1° de la presente resolución, ni se haya producido un accidente de trabajo durante el desarrollo de las tareas habituales.</li>
                </ul>
                <p className="mt-1">
                  En tales casos, se deberá realizar una nueva identificación de riesgos, dando ello inicio al proceso indicado en el Diagrama de Flujo —Anexo II—.
                </p>
              </li>
              <li>
                <strong>b)</strong> Para la Evaluación de Riesgo y la confección de las Planillas N° 3 y N° 4 se establece un plazo de VEINTICUATRO (24) meses a partir de la entrada en vigencia de la presente resolución.
              </li>
              <li>
                <strong>c)</strong> Se debe realizar una reevaluación posterior a la implementación de las medidas administrativas y de ingeniería, con el objeto de asegurar que se haya alcanzado un nivel de riesgo tolerable, dentro de los TREINTA (30) días posteriores a la fecha de implementación.
              </li>
            </ul>
            <p className="italic text-slate-500 mt-2">
              (Nota Infoleg: por art. 1° de la Disposición N° 1/2016 de la Gerencia de Prevención B.O. 11/04/2016 se prorroga por el término de DOCE (12) meses los plazos establecidos en el presente punto. Vigencia: a partir del día siguiente al de su publicación en el Boletín Oficial de la REPÚBLICA ARGENTINA)
            </p>
          </div>

          <div>
            <h4 className="font-extrabold text-slate-900 text-sm uppercase mb-2 border-b border-slate-200 pb-1">
              6. FIRMAS
            </h4>
            <p>
              Las Planillas Nros. 1, 2, 3 y 4 deberán incluir la firma, aclaración y registro del responsable del Servicio de Higiene y Seguridad, del Servicio de Medicina del Trabajo, y la firma y aclaración del empleador responsable del establecimiento o quien legalmente lo represente.
            </p>
          </div>
        </div>
      </div>
    </AppInfoModal>
  );
}
