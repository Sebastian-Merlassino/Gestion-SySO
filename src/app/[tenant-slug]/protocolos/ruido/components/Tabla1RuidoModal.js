// src/app/[tenant-slug]/protocolos/ruido/components/Tabla1RuidoModal.js
'use client';

import React, { useState } from 'react';
import { Search, Info, Check } from 'lucide-react';
import AppInput from '@/components/ui/AppInput';
import AppButton from '@/components/ui/AppButton';
import AppInfoModal from '@/components/ui/AppInfoModal';
import { TABLA_1_RUIDO } from '../utils/tablasAnexoV';

export default function Tabla1RuidoModal({ isOpen, onClose, onSelectHoras }) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredItems = TABLA_1_RUIDO.filter(item => {
    const q = searchQuery.toLowerCase();
    return (
      item.label.toLowerCase().includes(q) ||
      String(item.duracion).includes(q) ||
      item.unidad.toLowerCase().includes(q) ||
      String(item.nivel_presion_acustica_dba).includes(q)
    );
  });

  return (
    <AppInfoModal
      isOpen={isOpen}
      onClose={onClose}
      title="Tabla 1 — Valores límite para ruido"
      subtitle="Resolución MTEySS N° 295/2003 - ANEXO V (Infrasonido, Ruido y Ultrasonido)"
      icon={Info}
      maxWidth="max-w-3xl"
      closeButtonText="Cerrar"
    >
      {/* Buscador Integrado */}
      <div className="relative mb-3.5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <AppInput
          type="text"
          className="pl-9 text-xs"
          placeholder="Buscar por nivel dBA, duración u horas..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Contenido Tabla Normativa */}
      <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="max-h-[60vh] overflow-y-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-100 text-slate-700 font-outfit uppercase text-[10px] tracking-wider font-extrabold sticky top-0 border-b border-slate-200 z-10">
              <tr>
                <th className="p-3 w-[45%]">Duración por día</th>
                <th className="p-3 w-[35%] text-center">Nivel de Presión Acústica (dBA)</th>
                {onSelectHoras && <th className="p-3 w-[20%] text-center">Acción</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={onSelectHoras ? 3 : 2} className="p-6 text-center text-slate-400 font-medium">
                    No se encontraron valores con la búsqueda "{searchQuery}".
                  </td>
                </tr>
              ) : (
                filteredItems.map((item, idx) => (
                  <tr key={idx} className="hover:bg-blue-50/50 transition-colors">
                    <td className="p-3 font-semibold text-slate-800">
                      {item.duracion.toString().replace('.', ',')} {item.unidad}
                    </td>
                    <td className="p-3 text-center font-extrabold text-[#468DFF] text-sm">
                      {item.nivel_presion_acustica_dba} dBA
                    </td>
                    {onSelectHoras && (
                      <td className="p-3 text-center">
                        <AppButton
                          size="xs"
                          variant="secondary"
                          onClick={() => {
                            onSelectHoras(item);
                            onClose();
                          }}
                          className="text-[11px] gap-1 font-bold"
                        >
                          <Check className="h-3 w-3" /> Usar {item.horas_decimales} hs
                        </AppButton>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-3 bg-amber-50 p-2.5 rounded-lg border border-amber-200 text-[11px] text-amber-800">
        <p className="font-semibold">Nota legal (Res. 295/03 ANEXO V):</p>
        <p className="mt-0.5">
          No se permite ninguna exposición a ruido continuo, intermitente o de impacto no protegido que sea superior a 140 dBC (pico). Para tiempos entre los valores indicados en la tabla, utilizar la fórmula de la suma de las fracciones $\Sigma (C_i / T_i) \le 1.00$.
        </p>
      </div>
    </AppInfoModal>
  );
}
