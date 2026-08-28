// src/app/[tenant-slug]/facturacion/components/HistorialFacturas.js
'use strict';
import React, { useState } from 'react';
import {
  Search,
  FileText,
  Download,
  Eye,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Clock,
  Send,
  AlertCircle,
  FileSpreadsheet
} from 'lucide-react';
import { getVoucherTypeDetails } from '../utils/facturaPdfGenerator';

export default function HistorialFacturas({
  facturas = [],
  loading = false,
  config,
  tenant,
  onVerPdf,
  onDescargarPdf,
  onReconciliarFactura,
  onReintentarFactura,
  isReconciling = false
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('all');
  const [tipoFilter, setTipoFilter] = useState('all');

  const filteredFacturas = facturas.filter((f) => {
    // Estado filter
    if (estadoFilter !== 'all' && f.estado !== estadoFilter) return false;
    // Tipo filter
    if (tipoFilter !== 'all' && f.tipo_comprobante !== parseInt(tipoFilter)) return false;
    // Search term
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchDoc = String(f.receptor_doc_nro || '').toLowerCase().includes(q);
      const matchRazon = String(f.receptor_razon_social || '').toLowerCase().includes(q);
      const matchCae = String(f.cae || '').toLowerCase().includes(q);
      const matchComp = String(f.numero_comprobante || '').toLowerCase().includes(q);
      if (!matchDoc && !matchRazon && !matchCae && !matchComp) return false;
    }
    return true;
  });

  const renderStatusBadge = (estado) => {
    switch (estado) {
      case 'autorizada':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 w-fit">
            <CheckCircle2 className="h-3 w-3" /> Autorizada (CAE)
          </span>
        );
      case 'borrador':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1 w-fit">
            <Clock className="h-3 w-3" /> Borrador
          </span>
        );
      case 'error_conexion':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1 w-fit">
            <AlertTriangle className="h-3 w-3" /> Error de Red
          </span>
        );
      case 'rechazada':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-50 text-red-700 border border-red-200 flex items-center gap-1 w-fit">
            <AlertCircle className="h-3 w-3" /> Rechazada
          </span>
        );
      case 'pendiente':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-[#468DFF] border border-blue-200 flex items-center gap-1 w-fit">
            <RefreshCw className="h-3 w-3 animate-spin" /> Procesando
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-600">
            {estado}
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Search and Filters Bar (SySO Compact Layout) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por cliente, CUIT, N° o CAE..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#468DFF] transition-all"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <select
            value={estadoFilter}
            onChange={(e) => setEstadoFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#468DFF] flex-1 sm:flex-initial"
          >
            <option value="all">Todos los Estados</option>
            <option value="autorizada">Autorizadas ✅</option>
            <option value="borrador">Borradores 📝</option>
            <option value="error_conexion">Error de Conexión ⚠️</option>
            <option value="rechazada">Rechazadas ❌</option>
          </select>

          <select
            value={tipoFilter}
            onChange={(e) => setTipoFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#468DFF] flex-1 sm:flex-initial"
          >
            <option value="all">Todos los Comprobantes</option>
            <option value="11">Factura C</option>
            <option value="1">Factura A</option>
            <option value="6">Factura B</option>
            <option value="13">Nota Crédito C</option>
          </select>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto min-h-[350px]">
          <table className="w-full text-xs text-left text-slate-700">
            <thead className="bg-slate-50 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-150">
              <tr>
                <th className="px-5 py-3.5">Comprobante</th>
                <th className="px-5 py-3.5">Fecha</th>
                <th className="px-5 py-3.5">Cliente / Receptor</th>
                <th className="px-5 py-3.5">CAE / Estado</th>
                <th className="px-5 py-3.5 text-right">Importe Total</th>
                <th className="px-5 py-3.5 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-400">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto text-[#468DFF] mb-2" />
                    Cargando facturas...
                  </td>
                </tr>
              ) : filteredFacturas.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-400">
                    <FileText className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                    <span className="block font-bold text-slate-700">No se encontraron facturas</span>
                    <span className="text-[11px]">Probá ajustando los filtros de búsqueda o emití una nueva factura.</span>
                  </td>
                </tr>
              ) : (
                filteredFacturas.map((f) => {
                  const { letra, desc } = getVoucherTypeDetails(f.tipo_comprobante);
                  const ptoVta = String(f.punto_venta || 1).padStart(5, '0');
                  const compNro = f.numero_comprobante ? String(f.numero_comprobante).padStart(8, '0') : '--------';

                  return (
                    <tr key={f.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Comprobante Info */}
                      <td className="px-5 py-3.5 font-mono">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-blue-50 text-[#468DFF] border border-blue-100">
                            {letra}
                          </span>
                          <div>
                            <span className="font-bold text-slate-900 block">{desc}</span>
                            <span className="text-[11px] text-slate-500">{ptoVta}-{compNro}</span>
                          </div>
                        </div>
                      </td>

                      {/* Fecha */}
                      <td className="px-5 py-3.5 text-slate-600 whitespace-nowrap">
                        {f.fecha_emision || '-'}
                      </td>

                      {/* Receptor */}
                      <td className="px-5 py-3.5 max-w-xs truncate">
                        <span className="font-bold text-slate-800 block truncate">
                          {f.receptor_razon_social || 'Consumidor Final'}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          CUIT/DNI: {f.receptor_doc_nro || '-'}
                        </span>
                      </td>

                      {/* CAE & Estado */}
                      <td className="px-5 py-3.5">
                        <div className="space-y-1">
                          {renderStatusBadge(f.estado)}
                          {f.cae && (
                            <span className="text-[10px] font-mono text-slate-500 block">
                              CAE: {f.cae}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Total */}
                      <td className="px-5 py-3.5 text-right font-mono font-bold text-slate-900 text-sm">
                        ${Number(f.imp_total || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {f.estado === 'autorizada' ? (
                            <>
                              <button
                                type="button"
                                onClick={() => onVerPdf(f)}
                                className="p-1.5 rounded-lg bg-blue-50 text-[#468DFF] hover:bg-blue-100 transition-colors"
                                title="Ver Vista Previa PDF"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => onDescargarPdf(f)}
                                className="p-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                                title="Descargar PDF Oficial"
                              >
                                <Download className="h-4 w-4" />
                              </button>
                            </>
                          ) : f.estado === 'error_conexion' ? (
                            <button
                              type="button"
                              onClick={() => onReconciliarFactura(f.id)}
                              disabled={isReconciling}
                              className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-[11px] transition-colors flex items-center gap-1"
                              title="Consultar en ARCA si el comprobante fue procesado"
                            >
                              <RefreshCw className="h-3 w-3" /> Verificar en ARCA
                            </button>
                          ) : f.estado === 'borrador' || f.estado === 'rechazada' ? (
                            <button
                              type="button"
                              onClick={() => onReintentarFactura(f.id)}
                              className="px-2.5 py-1 rounded-lg bg-[#468DFF] hover:bg-[#0511F2] text-white font-bold text-[11px] transition-colors flex items-center gap-1"
                              title="Emitir comprobante oficial a ARCA"
                            >
                              <Send className="h-3 w-3" /> Emitir
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
