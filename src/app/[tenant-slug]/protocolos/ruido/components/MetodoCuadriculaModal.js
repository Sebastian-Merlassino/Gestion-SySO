// src/app/[tenant-slug]/protocolos/ruido/components/MetodoCuadriculaModal.js
'use client';

import React from 'react';
import { BookOpen, Volume2, ShieldAlert, Activity, Table, CheckCircle2, Info } from 'lucide-react';
import AppInfoModal from '@/components/ui/AppInfoModal';

export default function MetodoCuadriculaModal({ isOpen, onClose }) {
  return (
    <AppInfoModal
      isOpen={isOpen}
      onClose={onClose}
      title="Decreto Nº 351/79 — ANEXO V"
      subtitle="Decreto Nº 351/79 - ANEXO V - CAPITULO 13 (Acústica)"
      icon={BookOpen}
      maxWidth="max-w-4xl"
      closeButtonText="Cerrar"
    >
      <div className="space-y-6 text-xs text-slate-700 font-sans">
        
        {/* SECCIÓN 1: INFRASONIDO Y SONIDO DE BAJA FRECUENCIA */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 md:p-5 space-y-3 shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2.5">
            <Volume2 className="h-4.5 w-4.5 text-[#468DFF]" />
            <h3 className="font-outfit text-sm font-extrabold text-slate-800 uppercase tracking-wider">
              Infrasonido y Sonido de Baja Frecuencia
            </h3>
          </div>

          <p className="text-slate-600 leading-relaxed font-medium">
            Estos límites representan las exposiciones al sonido a los que se cree que casi todos los trabajadores pueden estar expuestos repetidamente sin efectos adversos para la audición.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-1">
              <span className="font-bold text-slate-800 text-[11px] block">Frecuencias 1 Hz a 80 Hz (NPS)</span>
              <p className="text-slate-600 text-[11px]">
                Excepto para el sonido de impulsos de banda de un tercio de octava (&lt; 2 s), el Nivel de Presión Sonora (NPS) no debe exceder el valor techo de <strong className="text-[#468DFF] font-bold">145 dB</strong>.
              </p>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-1">
              <span className="font-bold text-slate-800 text-[11px] block">NPS Global No Ponderado</span>
              <p className="text-slate-600 text-[11px]">
                El Nivel de Presión Sonora global no ponderado no debe exceder el valor techo de <strong className="text-[#468DFF] font-bold">150 dB</strong>.
              </p>
            </div>
          </div>

          <div className="bg-blue-50/60 p-3 rounded-xl border border-blue-100 text-slate-600 text-[11px] space-y-1.5 font-medium">
            <p>
              <strong>Tiempo límite:</strong> No hay tiempo límite para estas exposiciones. Sin embargo, la aplicación de los valores límite para el ruido y el ultrasonido puede proporcionar un nivel reducido aceptable en el tiempo.
            </p>
            <p>
              <strong>Alternativa no ponderada:</strong> El pico NPS medido con la escala de frecuencias del sonómetro en lineal o no ponderada no debe exceder de <strong className="text-slate-800">145 dB</strong> para situaciones de sonido sin impulsos.
            </p>
            <p className="text-slate-500">
              <strong>Resonancia torácica:</strong> La resonancia en el pecho de los sonidos de baja frecuencia (intervalo aproximado de <strong>50 Hz a 60 Hz</strong>) puede causar vibración del cuerpo entero, generando molestias hasta hacerse necesario reducir el NPS a un nivel donde desaparezca el problema.
            </p>
          </div>
        </div>

        {/* SECCIÓN 2: RUIDO CONTINUO O INTERMITENTE */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 md:p-5 space-y-3 shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2.5">
            <Activity className="h-4.5 w-4.5 text-[#468DFF]" />
            <h3 className="font-outfit text-sm font-extrabold text-slate-800 uppercase tracking-wider">
              Ruido Continuo o Intermitente
            </h3>
          </div>

          <p className="text-slate-600 leading-relaxed font-medium">
            Cuando los trabajadores estén expuestos al ruido a niveles iguales o superiores a los valores límite, es necesario un programa completo de conservación de la audición que incluya pruebas audiométricas.
          </p>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2">
            <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wider block">Requisitos del Sonómetro / Dosímetro</span>
            <ul className="list-disc list-inside space-y-1 text-slate-600 text-[11px] font-medium">
              <li>Filtro de ponderación frecuencial: <strong>A</strong></li>
              <li>Respuesta: <strong>Lenta</strong></li>
              <li>Exposición combinada: se aplica la fórmula de adición de dosis de ruido cuando la jornada se compone de 2 o más períodos de distinta intensidad.</li>
            </ul>
          </div>

          {/* Fórmula de Dosis */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2 text-center">
            <span className="font-bold text-slate-700 text-xs block">Ecuación para Exposición Combinada a Ruido:</span>
            <div className="bg-slate-50 py-2.5 px-4 rounded-lg border border-slate-200 inline-block font-mono text-sm text-[#468DFF] font-bold">
              C1 / T1 + C2 / T2 + ... + Cn / Tn
            </div>
            <p className="text-[11px] text-slate-500 max-w-xl mx-auto">
              Si la suma es <strong>mayor que 1 (unidad)</strong>, la exposición sobrepasa el Valor Límite Umbral. Se usan todas las exposiciones que alcancen o superen los <strong>80 dBA</strong> (sonidos estables ≥ 3 s).
            </p>
          </div>

          {/* Criterios del Dosímetro */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
            <div className="bg-white p-2.5 rounded-xl border border-slate-200 text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Índice de Conversión</span>
              <span className="text-sm font-extrabold text-[#468DFF]">3 dB</span>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-slate-200 text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Nivel Criterio</span>
              <span className="text-sm font-extrabold text-[#468DFF]">85 dBA</span>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-slate-200 text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Tiempo Criterio</span>
              <span className="text-sm font-extrabold text-[#468DFF]">8 horas</span>
            </div>
          </div>
        </div>

        {/* TABLA 1: VALORES LÍMITE PARA RUIDO */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 md:p-5 space-y-3 shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2.5">
            <Table className="h-4.5 w-4.5 text-[#468DFF]" />
            <h3 className="font-outfit text-sm font-extrabold text-slate-800 uppercase tracking-wider">
              Tabla 1: Valores Límite Umbral para Ruido (Res. 295/03)
            </h3>
          </div>

          <div className="overflow-x-auto max-h-72 scrollbar-thin border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 text-slate-600 font-bold sticky top-0 border-b border-slate-200 text-[11px] uppercase">
                <tr>
                  <th className="px-4 py-2.5">Duración por Día</th>
                  <th className="px-4 py-2.5">Unidad</th>
                  <th className="px-4 py-2.5 text-right">Nivel de Presión Acústica (dBA)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {[
                  { dur: '24', uni: 'horas', dba: '80' },
                  { dur: '16', uni: 'horas', dba: '82' },
                  { dur: '8', uni: 'horas', dba: '85' },
                  { dur: '4', uni: 'horas', dba: '88' },
                  { dur: '2', uni: 'horas', dba: '91' },
                  { dur: '1', uni: 'hora', dba: '94' },
                  { dur: '30', uni: 'minutos', dba: '97' },
                  { dur: '15', uni: 'minutos', dba: '100' },
                  { dur: '7,50', uni: 'minutos', dba: '103' },
                  { dur: '3,75', uni: 'minutos', dba: '106' },
                  { dur: '1,88', uni: 'minutos', dba: '109' },
                  { dur: '0,94', uni: 'minutos', dba: '112' },
                  { dur: '28,12', uni: 'segundos', dba: '115' },
                  { dur: '14,06', uni: 'segundos', dba: '118' },
                  { dur: '7,03', uni: 'segundos', dba: '121' },
                  { dur: '3,52', uni: 'segundos', dba: '124' },
                  { dur: '1,76', uni: 'segundos', dba: '127' },
                  { dur: '0,88', uni: 'segundos', dba: '130' },
                  { dur: '0,44', uni: 'segundos', dba: '133' },
                  { dur: '0,22', uni: 'segundos', dba: '136' },
                  { dur: '0,11', uni: 'segundos', dba: '139' },
                ].map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-4 py-1.5 font-bold text-slate-800">{row.dur}</td>
                    <td className="px-4 py-1.5 text-slate-500">{row.uni}</td>
                    <td className="px-4 py-1.5 text-right font-extrabold text-[#468DFF]">{row.dba} dBA</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-1.5 text-[11px] text-slate-500 pt-1 font-medium">
            <p><strong>*</strong> No ha de haber exposiciones a ruido continuo, intermitente o de impacto por encima de un nivel pico C ponderado de <strong>140 dB</strong>.</p>
            <p><strong>**</strong> El nivel se mide con sonómetro en ponderación A y respuesta lenta.</p>
            <p><strong>Δ</strong> Limitado por la fuente de ruido. Se recomienda dosímetro para sonidos superiores a <strong>120 decibeles</strong>.</p>
          </div>
        </div>

        {/* SECCIÓN 3: RUIDO DE IMPULSO O DE IMPACTO */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 md:p-5 space-y-2 shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
            <ShieldAlert className="h-4.5 w-4.5 text-amber-500" />
            <h3 className="font-outfit text-sm font-extrabold text-slate-800 uppercase tracking-wider">
              Ruido de Impulso o de Impacto
            </h3>
          </div>
          <p className="text-slate-600 text-[11px] leading-relaxed font-medium">
            La medida del ruido de impulso estará en el rango de <strong>80 a 140 dBA</strong> (rango del pulso de al menos 63 dB). No se permitirán exposiciones sin protección auditiva por encima de un nivel pico C ponderado de <strong>140 dB</strong>.
          </p>
        </div>

        {/* SECCIÓN 4: ULTRASONIDO */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 md:p-5 space-y-3 shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2.5">
            <Activity className="h-4.5 w-4.5 text-indigo-500" />
            <h3 className="font-outfit text-sm font-extrabold text-slate-800 uppercase tracking-wider">
              Ultrasonido
            </h3>
          </div>

          <p className="text-slate-600 leading-relaxed font-medium">
            Valores límite para frecuencias de <strong>10 kHz a 100 kHz</strong> para prevenir efectos subjetivos y deterioro auditivo.
          </p>

          <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200 text-[10px] uppercase">
                <tr>
                  <th className="px-3 py-2">Frecuencia Central (kHz)</th>
                  <th className="px-3 py-2 text-center">Techo Aire (dB)</th>
                  <th className="px-3 py-2 text-center">TWA 8h Aire (dB)</th>
                  <th className="px-3 py-2 text-right">Techo Agua (dB)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[11px] font-medium text-slate-700">
                {[
                  { f: '10', tAire: '105*', twa: '88*', tAgua: '167' },
                  { f: '12,5', tAire: '105*', twa: '89*', tAgua: '167' },
                  { f: '16', tAire: '105*', twa: '92*', tAgua: '167' },
                  { f: '20', tAire: '105*', twa: '94*', tAgua: '167' },
                  { f: '25', tAire: '110**', twa: '—', tAgua: '172' },
                  { f: '31,5', tAire: '115**', twa: '—', tAgua: '177' },
                  { f: '40', tAire: '115**', twa: '—', tAgua: '177' },
                  { f: '50', tAire: '115**', twa: '—', tAgua: '177' },
                  { f: '63', tAire: '115**', twa: '—', tAgua: '177' },
                  { f: '80', tAire: '115**', twa: '—', tAgua: '177' },
                  { f: '100', tAire: '115**', twa: '—', tAgua: '177' },
                ].map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="px-3 py-1 font-bold text-slate-800">{row.f} kHz</td>
                    <td className="px-3 py-1 text-center font-semibold text-slate-700">{row.tAire}</td>
                    <td className="px-3 py-1 text-center font-semibold text-slate-700">{row.twa}</td>
                    <td className="px-3 py-1 text-right font-semibold text-slate-700">{row.tAgua}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-1 text-[11px] text-slate-500 pt-1 font-medium">
            <p><strong>*</strong> Molestias subjetivas posibles entre 75 y 105 dB. Para sonidos tonales &lt; 10 kHz se recomienda reducir a 80 dB.</p>
            <p><strong>**</strong> Asume acoplamiento con agua u otro medio. En ausencia de acoplamiento corporal directo, los valores umbrales pueden incrementarse en 30 dB.</p>
          </div>
        </div>

      </div>
    </AppInfoModal>
  );
}
