// src/app/[tenant-slug]/protocolos/iluminacion/components/MetodoCuadriculaModal.js
'use client';

import React from 'react';
import { BookOpen, CheckCircle2, Calculator, Info } from 'lucide-react';
import AppInfoModal from '@/components/ui/AppInfoModal';

export default function MetodoCuadriculaModal({ isOpen, onClose }) {
  return (
    <AppInfoModal
      isOpen={isOpen}
      onClose={onClose}
      title="Método de la Cuadrícula (Res. SRT 84/12 & Dec. 351/79)"
      subtitle="Criterio Técnico para la Medición de Iluminación en el Ambiente Laboral"
      icon={BookOpen}
      maxWidth="max-w-2xl"
      closeButtonText="Cerrar"
    >
      {/* Sección 1: Introducción */}
      <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-4 space-y-2">
        <h3 className="font-bold text-[#468DFF] text-xs flex items-center gap-1.5 font-outfit uppercase tracking-wider">
          <Info className="h-4 w-4" /> 1. Marco Normativo y Objetivo
        </h3>
        <p>
          El <strong>Método de la Cuadrícula</strong> (definido por el <strong>Decreto 351/79 Anexo IV</strong> y la <strong>Resolución SRT N° 84/2012</strong>) establece el procedimiento técnico normalizado para la evaluación de la iluminancia media (E_media) e iluminancia mínima (E_mín) en ambientes de trabajo. Su objetivo es garantizar niveles óptimos de luz y prevenir fatiga visual o accidentes laborales.
        </p>
      </div>

      {/* Sección 2: Cálculo del Número Mínimo de Puntos */}
      <div className="space-y-2 border-l-2 border-[#468DFF] pl-4">
        <h3 className="font-bold text-slate-800 text-xs flex items-center gap-1.5 font-outfit uppercase tracking-wider">
          <Calculator className="h-4 w-4 text-[#468DFF]" /> 2. Geometría y Puntos Mínimos de Medición
        </h3>
        <p>
          La cantidad de puntos de medición requeridos se determina en función de la relación geométrica entre el área del sector y la altura de montaje de las luminarias respecto al plano de trabajo:
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
            <span className="font-bold text-slate-700 block mb-1">A. Índice de Local (I)</span>
            <code className="text-[11px] font-mono bg-white px-2 py-1 rounded border border-slate-200 block text-center text-[#468DFF]">
              I = (Largo × Ancho) / [Altura × (Largo + Ancho)]
            </code>
            <span className="text-[10px] text-slate-400 block mt-1">
              *Altura = Distancia de la luminaria al plano de trabajo.
            </span>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
            <span className="font-bold text-slate-700 block mb-1">B. Número Mínimo de Puntos (N)</span>
            <code className="text-[11px] font-mono bg-white px-2 py-1 rounded border border-slate-200 block text-center text-[#468DFF]">
              N = (x + 2)²
            </code>
            <span className="text-[10px] text-slate-400 block mt-1">
              *x = Índice I redondeado al entero superior (Máx x=4).
            </span>
          </div>
        </div>

        <div className="overflow-x-auto pt-2">
          <table className="w-full text-[11px] text-left border-collapse border border-slate-200 rounded-lg">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-bold">
                <th className="p-2 border border-slate-200">Índice Corregido (x)</th>
                <th className="p-2 border border-slate-200">Rango de Índice Local (I)</th>
                <th className="p-2 border border-slate-200 text-center">Fórmula N = (x+2)²</th>
                <th className="p-2 border border-slate-200 text-center font-bold text-[#468DFF]">Puntos Mínimos (N)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              <tr>
                <td className="p-2 border border-slate-200 font-bold">x = 1</td>
                <td className="p-2 border border-slate-200">I &lt; 1.5</td>
                <td className="p-2 border border-slate-200 text-center">(1 + 2)²</td>
                <td className="p-2 border border-slate-200 text-center font-bold text-[#468DFF]">9 mediciones</td>
              </tr>
              <tr>
                <td className="p-2 border border-slate-200 font-bold">x = 2</td>
                <td className="p-2 border border-slate-200">1.5 ≤ I &lt; 2.5</td>
                <td className="p-2 border border-slate-200 text-center">(2 + 2)²</td>
                <td className="p-2 border border-slate-200 text-center font-bold text-[#468DFF]">16 mediciones</td>
              </tr>
              <tr>
                <td className="p-2 border border-slate-200 font-bold">x = 3</td>
                <td className="p-2 border border-slate-200">2.5 ≤ I &lt; 3.0</td>
                <td className="p-2 border border-slate-200 text-center">(3 + 2)²</td>
                <td className="p-2 border border-slate-200 text-center font-bold text-[#468DFF]">25 mediciones</td>
              </tr>
              <tr>
                <td className="p-2 border border-slate-200 font-bold">x = 4</td>
                <td className="p-2 border border-slate-200">I ≥ 3.0</td>
                <td className="p-2 border border-slate-200 text-center">(4 + 2)²</td>
                <td className="p-2 border border-slate-200 text-center font-bold text-[#468DFF]">36 mediciones</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Sección 3: Criterio de Uniformidad */}
      <div className="space-y-2 border-l-2 border-amber-500 pl-4">
        <h3 className="font-bold text-slate-800 text-xs flex items-center gap-1.5 font-outfit uppercase tracking-wider">
          <CheckCircle2 className="h-4 w-4 text-amber-500" /> 3. Verificación de Uniformidad (E_mín ≥ E_media / 2)
        </h3>
        <p>
          <strong>¿Cuándo Aplica?</strong> La verificación de uniformidad aplica principalmente en recintos o locales con <strong>Iluminación de distribución General</strong> o áreas evaluadas mediante cuadrícula completa.
        </p>
        <div className="bg-amber-50/70 p-3 rounded-xl border border-amber-200 text-amber-900 space-y-1">
          <p className="font-bold text-[11px]">Criterio Exigido por Norma:</p>
          <code className="text-[11px] font-mono bg-white px-2 py-0.5 rounded border border-amber-300 inline-block font-bold text-amber-800">
            Iluminancia Mínima (E_mín) ≥ (Iluminancia Media (E_media) / 2)
          </code>
          <p className="text-[11px] text-amber-800 pt-1">
            Esto asegura que ninguna zona medida dentro del sector presente una caída de iluminación inferior a la mitad del promedio del recinto, evitando contrastes o sombras marcadas que afecten la visión.
          </p>
        </div>
      </div>

      {/* Sección 4: Recomendaciones Operativas */}
      <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
        <h4 className="font-bold text-slate-700 text-[11px] uppercase tracking-wider">Recomendaciones de Medición</h4>
        <ul className="list-disc list-inside text-[11px] text-slate-500 space-y-0.5">
          <li>Las mediciones deben tomarse a la altura del plano de trabajo (0,75 m por defecto si no es específico).</li>
          <li>El instrumental debe ubicarse horizontal y calibrado en cero antes del ensayo.</li>
          <li>Evitar que la sombra del técnico de medición se proyecte sobre la celda fotoeléctrica.</li>
        </ul>
      </div>
    </AppInfoModal>
  );
}
