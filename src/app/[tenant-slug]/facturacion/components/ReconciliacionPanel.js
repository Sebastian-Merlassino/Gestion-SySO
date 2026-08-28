// src/app/[tenant-slug]/facturacion/components/ReconciliacionPanel.js
'use strict';
import React from 'react';
import {
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  HelpCircle,
  Clock,
  ShieldCheck,
  Building
} from 'lucide-react';
import { getVoucherTypeDetails } from '../utils/facturaPdfGenerator';

export default function ReconciliacionPanel({
  facturasPendientes = [],
  onReconciliarTodas,
  onReconciliarIndividual,
  isReconciling = false
}) {
  if (facturasPendientes.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-3 shadow-sm">
        <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl w-fit mx-auto">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <h3 className="text-base font-bold text-slate-800">
          Todas las facturas están sincronizadas
        </h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          No hay comprobantes en estado de corte de red o timeout pendientes de verificación con los servidores de ARCA.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-amber-200 rounded-2xl p-5 sm:p-7 shadow-sm space-y-5">
      {/* Alert Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-amber-100">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-amber-100 text-amber-800 shrink-0 mt-0.5">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">
              Comprobantes Pendientes de Verificación ({facturasPendientes.length})
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Durante la emisión de estos comprobantes ocurrió un corte de conexión o timeout. La reconciliación consulta a ARCA si la factura fue autorizada o no, evitando duplicaciones.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onReconciliarTodas}
          disabled={isReconciling}
          className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-amber-500/20 flex items-center gap-2 cursor-pointer shrink-0 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${isReconciling ? 'animate-spin' : ''}`} />
          {isReconciling ? 'Verificando en ARCA...' : 'Verificar Todas en ARCA'}
        </button>
      </div>

      {/* Pending Items List */}
      <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
        {facturasPendientes.map((f) => {
          const { desc, letra } = getVoucherTypeDetails(f.tipo_comprobante);

          return (
            <div
              key={f.id}
              className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50/50 hover:bg-white transition-colors"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-blue-50 text-[#468DFF]">
                    {letra}
                  </span>
                  <span className="font-bold text-xs text-slate-800">{desc}</span>
                  <span className="text-xs font-mono text-slate-500">
                    (${Number(f.imp_total || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })})
                  </span>
                </div>
                <div className="text-xs text-slate-600 flex items-center gap-2">
                  <span>Receptor: <strong>{f.receptor_razon_social || 'Consumidor Final'}</strong></span>
                  <span>•</span>
                  <span>CUIT/Doc: <code>{f.receptor_doc_nro}</code></span>
                </div>
                <span className="text-[11px] text-amber-700 block">
                  Último error: {f.last_error_message || 'Timeout / Sin respuesta de ARCA'}
                </span>
              </div>

              <button
                type="button"
                onClick={() => onReconciliarIndividual(f.id)}
                disabled={isReconciling}
                className="px-3.5 py-1.5 bg-white border border-amber-300 hover:bg-amber-50 text-amber-900 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Verificar Esta Factura
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
