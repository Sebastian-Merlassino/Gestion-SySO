// src/app/[tenant-slug]/facturacion/components/AuditoriaFacturacion.js
'use strict';
import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import {
  ShieldCheck,
  Download,
  Search,
  Clock,
  User,
  Activity,
  ChevronDown,
  ChevronRight,
  FileCode
} from 'lucide-react';

export default function AuditoriaFacturacion({
  logs = [],
  loading = false,
}) {
  const [expandedLogId, setExpandedLogId] = useState(null);
  const [filterAction, setFilterAction] = useState('all');

  const actionLabels = {
    borrador_creado: { label: 'Borrador Creado', color: 'bg-slate-100 text-slate-700' },
    emision_iniciada: { label: 'Emisión Iniciada', color: 'bg-blue-50 text-[#468DFF]' },
    emision_exitosa: { label: 'Emisión Exitosa (CAE)', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    emision_rechazada: { label: 'Emisión Rechazada', color: 'bg-red-50 text-red-700' },
    emision_error_conexion: { label: 'Error de Red / Timeout', color: 'bg-amber-50 text-amber-700' },
    reintento_iniciado: { label: 'Reintento Iniciado', color: 'bg-purple-50 text-purple-700' },
    reconciliacion_ejecutada: { label: 'Reconciliación Ejecutada', color: 'bg-indigo-50 text-indigo-700' },
    reconciliacion_cae_encontrado: { label: 'Reconciliación: CAE Encontrado', color: 'bg-emerald-50 text-emerald-700' },
    reconciliacion_no_encontrado: { label: 'Reconciliación: No Encontrado', color: 'bg-slate-100 text-slate-700' },
    config_creada: { label: 'Configuración Creada', color: 'bg-blue-50 text-[#468DFF]' },
    config_modificada: { label: 'Configuración Modificada', color: 'bg-amber-50 text-amber-700' },
    certificado_actualizado: { label: 'Certificado Actualizado', color: 'bg-emerald-50 text-emerald-700' },
    entorno_cambiado: { label: 'Entorno Cambiado', color: 'bg-red-50 text-red-700' },
    batch_iniciado: { label: 'Lote Iniciado', color: 'bg-blue-50 text-[#468DFF]' },
    batch_completado: { label: 'Lote Completado', color: 'bg-emerald-50 text-emerald-700' },
  };

  const filteredLogs = logs.filter((l) => {
    if (filterAction !== 'all' && l.accion !== filterAction) return false;
    return true;
  });

  const handleExportAudit = () => {
    if (filteredLogs.length === 0) return;

    const exportData = filteredLogs.map((l) => ({
      Fecha: new Date(l.created_at).toLocaleString('es-AR'),
      Accion: l.accion,
      Usuario: l.profiles?.email || l.performed_by || 'Sistema',
      'Estado Anterior': l.estado_anterior || '-',
      'Estado Nuevo': l.estado_nuevo || '-',
      'Direccion IP': l.ip_address || '-',
      Detalle: l.detalle ? JSON.stringify(l.detalle) : '',
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Auditoria_Fiscal');
    XLSX.writeFile(wb, `Auditoria_Facturacion_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="space-y-4">
      {/* Header and Filter */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-indigo-600" />
          <div>
            <h3 className="text-sm font-bold text-slate-800">
              Registro Inmutable de Auditoría Fiscal
            </h3>
            <p className="text-[11px] text-slate-400">
              Trazabilidad completa append-only de todas las operaciones, intentos y estados de facturación.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#468DFF] flex-1 sm:flex-initial"
          >
            <option value="all">Todas las Acciones</option>
            <option value="emision_exitosa">Emisiones Exitosas</option>
            <option value="emision_error_conexion">Errores de Red / Timeout</option>
            <option value="emision_rechazada">Rechazos</option>
            <option value="reconciliacion_cae_encontrado">Reconciliaciones</option>
            <option value="certificado_actualizado">Certificados</option>
          </select>

          <button
            type="button"
            onClick={handleExportAudit}
            className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <Download className="h-3.5 w-3.5" /> Exportar
          </button>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto min-h-[300px]">
          <table className="w-full text-xs text-left text-slate-700">
            <thead className="bg-slate-50 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-150">
              <tr>
                <th className="px-5 py-3.5">Fecha y Hora</th>
                <th className="px-5 py-3.5">Acción</th>
                <th className="px-5 py-3.5">Usuario / IP</th>
                <th className="px-5 py-3.5">Transición Estado</th>
                <th className="px-5 py-3.5 text-center">Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-slate-400">
                    Cargando registros de auditoría...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-slate-400">
                    No se encontraron registros de auditoría.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((l) => {
                  const act = actionLabels[l.accion] || { label: l.accion, color: 'bg-slate-100 text-slate-700' };
                  const isExpanded = expandedLogId === l.id;

                  return (
                    <React.Fragment key={l.id}>
                      <tr className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-5 py-3 font-mono text-slate-600 whitespace-nowrap">
                          {new Date(l.created_at).toLocaleString('es-AR')}
                        </td>
                        <td className="px-5 py-3">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${act.color}`}>
                            {act.label}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-slate-600">
                          <span className="font-semibold block text-slate-800">
                            {l.profiles?.email || l.performed_by || 'Sistema'}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            IP: {l.ip_address || '-'}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-slate-600 font-mono text-[11px]">
                          {l.estado_anterior ? `${l.estado_anterior} → ` : ''}
                          <strong className="text-slate-800">{l.estado_nuevo || '-'}</strong>
                        </td>
                        <td className="px-5 py-3 text-center">
                          {l.detalle ? (
                            <button
                              type="button"
                              onClick={() => setExpandedLogId(isExpanded ? null : l.id)}
                              className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                              title="Ver detalle JSON"
                            >
                              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </button>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                      </tr>

                      {isExpanded && l.detalle && (
                        <tr className="bg-slate-900 text-emerald-400">
                          <td colSpan={5} className="p-4 font-mono text-[11px] overflow-x-auto">
                            <pre className="whitespace-pre-wrap">
                              {JSON.stringify(l.detalle, null, 2)}
                            </pre>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
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
