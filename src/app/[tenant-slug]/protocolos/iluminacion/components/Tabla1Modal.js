// src/app/[tenant-slug]/protocolos/iluminacion/components/Tabla1Modal.js
'use client';

import React, { useState } from 'react';
import { Search, Info, Check } from 'lucide-react';
import AppInput from '@/components/ui/AppInput';
import AppButton from '@/components/ui/AppButton';
import AppInfoModal from '@/components/ui/AppInfoModal';
import { TABLA_1_ILUMINACION } from '../utils/tablasAnexoIV';

export default function Tabla1Modal({ isOpen, onClose, onSelectLux }) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredItems = TABLA_1_ILUMINACION.filter(item => {
    const q = searchQuery.toLowerCase();
    return (
      item.clase.toLowerCase().includes(q) ||
      item.ejemplos.toLowerCase().includes(q) ||
      item.luxTexto.includes(q)
    );
  });

  return (
    <AppInfoModal
      isOpen={isOpen}
      onClose={onClose}
      title="Anexo IV - Capítulo 12: Decreto 351/79"
      subtitle="TABLA 1: Intensidad Media de Iluminación para Diversas Clases de Tarea Visual (Norma IRAM-AADL J 20-06)"
      icon={Info}
      maxWidth="max-w-4xl"
      closeButtonText="Cerrar"
    >
      {/* Buscador Integrado */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <AppInput
          type="text"
          className="pl-9 text-xs"
          placeholder="Buscar por clase de tarea visual, lux o ejemplos..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Contenido Tabla Normativa */}
      <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-left text-xs text-slate-700">
          <thead className="bg-slate-100 text-slate-700 font-outfit uppercase text-[10px] tracking-wider font-extrabold border-b border-slate-200">
            <tr>
              <th className="p-3 w-[30%]">Clase de tarea visual</th>
              <th className="p-3 w-[20%] text-center">Iluminación en plano (lux)</th>
              <th className="p-3 w-[40%]">Ejemplos de tareas visuales</th>
              <th className="p-3 w-[10%] text-center">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-6 text-center text-slate-400 font-medium">
                  No se encontraron clases de tareas visuales con la búsqueda "{searchQuery}".
                </td>
              </tr>
            ) : (
              filteredItems.map((item, idx) => (
                <tr key={idx} className="hover:bg-blue-50/50 transition-colors">
                  <td className="p-3 font-semibold text-slate-800">
                    {item.clase}
                  </td>
                  <td className="p-3 text-center font-bold text-[#468DFF]">
                    <span className="inline-block bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-lg">
                      {item.luxTexto} lux
                    </span>
                  </td>
                  <td className="p-3 text-slate-600 leading-relaxed">
                    {item.ejemplos}
                  </td>
                  <td className="p-3 text-center">
                    <AppButton
                      type="button"
                      variant="secondary"
                      className="h-7 text-[11px] px-2"
                      onClick={() => {
                        if (onSelectLux) {
                          onSelectLux(item.luxMin);
                        }
                        onClose();
                      }}
                    >
                      <Check className="h-3 w-3 mr-1" /> Usar {item.luxMin} lx
                    </AppButton>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="text-[11px] text-slate-400 font-medium pt-1">
        *Normativa de Referencia: Anexo IV Dec. 351/79 (Reglamentación Ley 19.587).
      </p>
    </AppInfoModal>
  );
}
