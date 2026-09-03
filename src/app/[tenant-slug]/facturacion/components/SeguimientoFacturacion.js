// src/app/[tenant-slug]/facturacion/components/SeguimientoFacturacion.js
// Panel interactivo de Seguimiento de Facturación, Cobranzas y Análisis por Jurisdicción
'use strict';

import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  DollarSign, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  Calendar, 
  Filter, 
  FileText, 
  ChevronRight,
  AlertCircle,
  CreditCard,
  Building,
  ArrowUpRight,
  FileSpreadsheet
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { getVoucherTypeDetails } from '../utils/facturaPdfGenerator';
import AppButton from '@/components/ui/AppButton';
import AppTooltip from '@/components/ui/AppTooltip';
import { JURISDICCIONES_ARGENTINA, normalizeJurisdiction } from '@/lib/arca/arcaJurisdictions';

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

function formatDate(dateStr) {
  if (!dateStr) return '-';
  try {
    if (typeof dateStr === 'string' && dateStr.includes('-')) {
      const parts = dateStr.split('T')[0].split('-');
      if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return new Date(dateStr).toLocaleDateString('es-AR');
  } catch (e) {
    return dateStr;
  }
}

/**
 * Deduce la jurisdicción a partir del domicilio o metadata
 */
function inferJurisdiction(factura) {
  // 1. Check direct metadata
  let obs = {};
  if (typeof factura.observaciones_arca === 'object' && factura.observaciones_arca !== null) {
    obs = factura.observaciones_arca;
  } else if (typeof factura.observaciones_arca === 'string') {
    try { obs = JSON.parse(factura.observaciones_arca); } catch (e) {}
  }
  if (obs.jurisdiccion) return normalizeJurisdiction(obs.jurisdiccion);

  // 2. Check company relationship and registered establishments
  if (factura.empresas?.establecimientos && Array.isArray(factura.empresas.establecimientos) && factura.empresas.establecimientos.length > 0) {
    const prov = factura.empresas.establecimientos[0]?.provincia;
    if (prov) return normalizeJurisdiction(prov);
  }
  if (factura.empresas?.provincia) return normalizeJurisdiction(factura.empresas.provincia);

  // 3. Deduce from domicilio
  if (factura.receptor_domicilio) {
    return normalizeJurisdiction(factura.receptor_domicilio, 'CABA');
  }

  return 'CABA'; // Default fallback común para consultoras
}

function getPagoInfo(factura) {
  let obs = {};
  if (typeof factura.observaciones_arca === 'object' && factura.observaciones_arca !== null) {
    obs = factura.observaciones_arca;
  } else if (typeof factura.observaciones_arca === 'string') {
    try { obs = JSON.parse(factura.observaciones_arca); } catch (e) {}
  }

  return {
    estado_pago: obs.estado_pago || 'pendiente',
    fecha_pago: obs.fecha_pago || null,
    metodo_pago: obs.metodo_pago || 'transferencia',
    notas_pago: obs.notas_pago || '',
    jurisdiccion: obs.jurisdiccion || inferJurisdiction(factura),
  };
}

export default function SeguimientoFacturacion({
  facturas = [],
  onUpdatePago,
  onOpenFacturaDetail,
  onVerPdf,
  updatingPagoId,
}) {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth(); // 0 to 11

  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedJurisdiccion, setSelectedJurisdiccion] = useState('all');
  const [filterPago, setFilterPago] = useState('all'); // 'all', 'pagada', 'pendiente'

  // Anos disponibles basados en las facturas
  const availableYears = useMemo(() => {
    const yearsSet = new Set([currentYear]);
    facturas.forEach(f => {
      if (f.fecha_emision) {
        const y = new Date(f.fecha_emision).getFullYear();
        if (!isNaN(y)) yearsSet.add(y);
      }
    });
    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [facturas, currentYear]);

  // Facturas autorizadas (con validez real) para el seguimiento
  const validFacturas = useMemo(() => {
    return facturas.filter(f => f.estado === 'autorizada' || f.estado === 'pendiente_cobro' || f.numero_comprobante);
  }, [facturas]);

  // Facturas filtradas por año y jurisdicción
  const filteredFacturas = useMemo(() => {
    return validFacturas.filter(f => {
      const fDate = f.fecha_emision ? new Date(f.fecha_emision) : new Date();
      if (fDate.getFullYear() !== selectedYear) return false;

      const info = getPagoInfo(f);
      if (selectedJurisdiccion !== 'all' && info.jurisdiccion !== selectedJurisdiccion) return false;
      if (filterPago !== 'all' && info.estado_pago !== filterPago) return false;

      return true;
    });
  }, [validFacturas, selectedYear, selectedJurisdiccion, filterPago]);

  // Totales de KPIs
  const stats = useMemo(() => {
    let totalAnual = 0;
    let totalMesActual = 0;
    let totalCobrado = 0;
    let totalPendiente = 0;
    let countPagadas = 0;
    let countPendientes = 0;

    // Totales por Mes (12 meses)
    const porMes = Array(12).fill(0);
    const porMesCobrado = Array(12).fill(0);

    // Totales por Jurisdicción
    const porJurisdiccion = {};

    validFacturas.forEach(f => {
      const fDate = f.fecha_emision ? new Date(f.fecha_emision) : new Date();
      const y = fDate.getFullYear();
      const m = fDate.getMonth();
      const total = Number(f.imp_total || 0);
      const isNotaCredito = f.tipo_comprobante === 3 || f.tipo_comprobante === 8 || f.tipo_comprobante === 13;
      const effectiveTotal = isNotaCredito ? -total : total;

      if (y === selectedYear) {
        totalAnual += effectiveTotal;
        porMes[m] += effectiveTotal;

        if (m === currentMonth && y === currentYear) {
          totalMesActual += effectiveTotal;
        }

        const pago = getPagoInfo(f);
        if (pago.estado_pago === 'pagada') {
          totalCobrado += effectiveTotal;
          countPagadas += 1;
          porMesCobrado[m] += effectiveTotal;
        } else {
          totalPendiente += effectiveTotal;
          countPendientes += 1;
        }

        const jur = pago.jurisdiccion;
        porJurisdiccion[jur] = (porJurisdiccion[jur] || 0) + effectiveTotal;
      }
    });

    const porcentajeCobrado = totalAnual > 0 ? Math.round((totalCobrado / totalAnual) * 100) : 0;

    // Jurisdicciones ordenadas de mayor a menor monto
    const rankingJurisdicciones = Object.entries(porJurisdiccion)
      .map(([jur, monto]) => ({
        jurisdiccion: jur,
        monto,
        porcentaje: totalAnual > 0 ? Math.round((monto / totalAnual) * 100) : 0,
      }))
      .sort((a, b) => b.monto - a.monto);

    return {
      totalAnual,
      totalMesActual,
      totalCobrado,
      totalPendiente,
      porcentajeCobrado,
      countPagadas,
      countPendientes,
      porMes,
      porMesCobrado,
      rankingJurisdicciones,
    };
  }, [validFacturas, selectedYear, currentMonth, currentYear]);

  // Exportar Seguimiento a Excel
  const handleExportExcel = () => {
    if (!filteredFacturas || filteredFacturas.length === 0) return;
    try {
      const dataToExport = filteredFacturas.map(f => {
        const { desc, letra } = getVoucherTypeDetails(f.tipo_comprobante);
        const ptoVta = String(f.punto_venta || 1).padStart(5, '0');
        const compNro = f.numero_comprobante ? String(f.numero_comprobante).padStart(8, '0') : '--------';
        const pago = getPagoInfo(f);

        return {
          'Tipo Comprobante': `${desc} (${letra})`,
          'Punto de Venta': ptoVta,
          'N° Comprobante': compNro,
          'Comprobante': `${letra} ${ptoVta}-${compNro}`,
          'Fecha Emisión': f.fecha_emision ? formatDate(f.fecha_emision) : '',
          'Cliente / Receptor': f.receptor_razon_social || 'Consumidor Final',
          'CUIT / Documento': f.receptor_doc_nro || '-',
          'Jurisdicción': pago.jurisdiccion || 'CABA',
          'Monto Total ($)': Number(f.imp_total || 0),
          'Estado de Cobro': pago.estado_pago === 'pagada' ? 'Pagada' : 'Pendiente',
          'Fecha de Pago': pago.estado_pago === 'pagada' && pago.fecha_pago ? formatDate(pago.fecha_pago) : '',
          'Método de Pago': pago.estado_pago === 'pagada' ? (pago.metodo_pago || 'Transferencia Bancaria') : '',
          'CAE': f.cae || '-'
        };
      });

      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Seguimiento Cobranzas');
      XLSX.writeFile(wb, `Seguimiento_Cobranzas_${selectedYear}_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (err) {
      console.error('Error al exportar cobranzas a Excel:', err);
    }
  };

  // Max value for monthly chart scaling
  const maxMonthlyVal = useMemo(() => {
    const max = Math.max(...stats.porMes, 1);
    return max;
  }, [stats.porMes]);

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Barra de Filtros Superiores */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-blue-50 text-[#468DFF]">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 font-outfit">
              Seguimiento y Análisis de Facturación
            </h3>
            <p className="text-[11px] text-slate-500">
              Métricas anuales, mensuales, distribución geográfica y control de cobranzas.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Selector de Año */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs">
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            <span className="font-semibold text-slate-600">Año:</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer"
            >
              {availableYears.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {/* Selector de Jurisdicción */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs">
            <MapPin className="h-3.5 w-3.5 text-slate-400" />
            <span className="font-semibold text-slate-600">Jurisdicción:</span>
            <select
              value={selectedJurisdiccion}
              onChange={(e) => setSelectedJurisdiccion(e.target.value)}
              className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer max-w-[140px] truncate"
            >
              <option value="all">Todas las provincias</option>
              {JURISDICCIONES_ARGENTINA.map(j => (
                <option key={j} value={j}>{j}</option>
              ))}
            </select>
          </div>

          {/* Filtro de Cobro */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <select
              value={filterPago}
              onChange={(e) => setFilterPago(e.target.value)}
              className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="all">Todos los pagos</option>
              <option value="pagada">🟢 Cobradas / Pagadas</option>
              <option value="pendiente">🟡 Pendientes de cobro</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tarjetas de Métricas Clave (KPIs) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Facturación Anual */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Facturación Anual ({selectedYear})
            </span>
            <div className="p-2 rounded-xl bg-blue-50 text-[#468DFF]">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-extrabold text-slate-900 font-mono">
              ${stats.totalAnual.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-[11px] text-slate-400 block mt-1">
              Total acumulado del período fiscal
            </span>
          </div>
        </div>

        {/* Facturación del Mes */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Facturación del Mes ({MESES[currentMonth]})
            </span>
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <Calendar className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-extrabold text-slate-900 font-mono">
              ${stats.totalMesActual.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-[11px] text-slate-400 block mt-1">
              Comprobantes emitidos este mes
            </span>
          </div>
        </div>

        {/* Total Cobrado / Pagado */}
        <div className="bg-white border border-emerald-200 rounded-2xl p-5 shadow-xs bg-emerald-50/20 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
              Total Cobrado ({stats.porcentajeCobrado}%)
            </span>
            <div className="p-2 rounded-xl bg-emerald-100/70 text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-extrabold text-emerald-700 font-mono">
              ${stats.totalCobrado.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
            </span>
            <div className="w-full bg-emerald-100 rounded-full h-1.5 mt-2 overflow-hidden">
              <div 
                className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                style={{ width: `${stats.porcentajeCobrado}%` }}
              />
            </div>
            <span className="text-[11px] text-emerald-600 block mt-1">
              {stats.countPagadas} factura(s) cobrada(s)
            </span>
          </div>
        </div>

        {/* Pendiente de Cobro */}
        <div className="bg-white border border-amber-200 rounded-2xl p-5 shadow-xs bg-amber-50/20 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
              Pendiente de Cobro
            </span>
            <div className="p-2 rounded-xl bg-amber-100/70 text-amber-700">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-extrabold text-amber-700 font-mono">
              ${stats.totalPendiente.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-[11px] text-amber-600 block mt-1">
              {stats.countPendientes} factura(s) por cobrar
            </span>
          </div>
        </div>
      </div>

      {/* Sección de Gráficos: Evolución Mensual + Facturación por Jurisdicción */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Gráfico Mensual (Ene - Dic) */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h4 className="text-sm font-bold text-slate-900 font-outfit">
                Evolución de Facturación Mensual ({selectedYear})
              </h4>
              <p className="text-[11px] text-slate-500">
                Monto facturado mes a mes con desglose de cobrado vs pendiente
              </p>
            </div>
            <div className="flex items-center gap-3 text-[10px] font-semibold text-slate-600">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-[#468DFF]"></span> Total Facturado
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-emerald-500"></span> Cobrado
              </span>
            </div>
          </div>

          <div className="h-52 flex items-end justify-between gap-1.5 sm:gap-3 pt-6 pb-2">
            {stats.porMes.map((val, idx) => {
              const heightPct = maxMonthlyVal > 0 ? Math.max((val / maxMonthlyVal) * 100, 4) : 4;
              const cobradoPct = val > 0 ? (stats.porMesCobrado[idx] / val) * 100 : 0;
              const isCurrent = idx === currentMonth && selectedYear === currentYear;

              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group relative">
                  {/* Tooltip on hover */}
                  <div className="opacity-0 group-hover:opacity-100 pointer-events-none absolute bottom-full mb-2 z-20 bg-slate-900 text-white text-[10px] rounded-lg py-1 px-2 whitespace-nowrap shadow-md transition-opacity">
                    <span className="font-bold block">{MESES[idx]}</span>
                    <span>Total: ${val.toLocaleString('es-AR', { minimumFractionDigits: 0 })}</span>
                    <span className="block text-emerald-300">Cobrado: ${stats.porMesCobrado[idx].toLocaleString('es-AR', { minimumFractionDigits: 0 })}</span>
                  </div>

                  {/* Bar */}
                  <div className="w-full max-w-[24px] bg-slate-100 rounded-t-lg overflow-hidden flex flex-col justify-end transition-all group-hover:brightness-95" style={{ height: `${heightPct}%` }}>
                    <div 
                      className="w-full bg-[#468DFF] rounded-t-lg relative flex flex-col justify-end"
                      style={{ height: '100%' }}
                    >
                      <div 
                        className="w-full bg-emerald-500 rounded-t-xs transition-all"
                        style={{ height: `${cobradoPct}%` }}
                      />
                    </div>
                  </div>

                  {/* Label */}
                  <span className={`text-[10px] truncate max-w-full font-semibold ${isCurrent ? 'text-[#468DFF] font-bold' : 'text-slate-500'}`}>
                    {MESES[idx].slice(0, 3)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Facturación por Jurisdicción / Provincia */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h4 className="text-sm font-bold text-slate-900 font-outfit">
                  Facturación por Jurisdicción
                </h4>
                <p className="text-[11px] text-slate-500">
                  Desglose geográfico impositivo provincial
                </p>
              </div>
              <MapPin className="h-4 w-4 text-[#468DFF]" />
            </div>

            <div className="space-y-3 mt-4 max-h-60 overflow-y-auto pr-1 scrollbar-thin">
              {stats.rankingJurisdicciones.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">
                  No hay comprobantes emitidos en el año {selectedYear}.
                </p>
              ) : (
                stats.rankingJurisdicciones.map((item, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#468DFF]"></span>
                        {item.jurisdiccion}
                      </span>
                      <div className="text-right font-mono">
                        <span className="font-bold text-slate-900">
                          ${item.monto.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                        </span>
                        <span className="text-[10px] text-slate-400 ml-1.5">({item.porcentaje}%)</span>
                      </div>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div 
                        className="bg-[#468DFF] h-full rounded-full transition-all"
                        style={{ width: `${Math.max(item.porcentaje, 3)}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-[11px] text-slate-500">
            💡 Podés asignar o modificar la jurisdicción de cada factura directamente en la tabla inferior.
          </div>
        </div>
      </div>

      {/* Tabla de Seguimiento de Cobranzas y Pagos */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden space-y-3">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-bold text-slate-900 font-outfit">
              Planilla de Seguimiento de Cobranzas
            </h4>
            <p className="text-[11px] text-slate-500">
              Registrá si cada factura fue pagada, la fecha de cobro y el método para llevar tu control administrativo.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-xs text-slate-500 font-medium">
              Mostrando <strong>{filteredFacturas.length}</strong> comprobantes
            </div>

            <AppButton
              type="button"
              variant="success"
              size="sm"
              onClick={handleExportExcel}
              title="Descargar planilla de cobranzas en Excel"
              className="shadow-xs shrink-0"
              disabled={filteredFacturas.length === 0}
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span>Exportar Excel</span>
            </AppButton>
          </div>
        </div>

        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="px-5 py-3.5">Comprobante</th>
                <th className="px-5 py-3.5">Fecha Emisión</th>
                <th className="px-5 py-3.5">Cliente / Receptor</th>
                <th className="px-5 py-3.5">Jurisdicción</th>
                <th className="px-5 py-3.5 text-right">Monto Total</th>
                <th className="px-5 py-3.5 text-center">Estado de Cobro</th>
                <th className="px-5 py-3.5">Fecha de Pago</th>
                <th className="px-5 py-3.5">Método</th>
                <th className="px-5 py-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredFacturas.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-10 text-slate-400">
                    No se encontraron facturas con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                filteredFacturas.map((f) => {
                  const { letra, desc } = getVoucherTypeDetails(f.tipo_comprobante);
                  const ptoVta = String(f.punto_venta || 1).padStart(5, '0');
                  const compNro = f.numero_comprobante ? String(f.numero_comprobante).padStart(8, '0') : '--------';
                  const pago = getPagoInfo(f);
                  const isUpdating = updatingPagoId === f.id;

                  return (
                    <tr 
                      key={f.id} 
                      className="hover:bg-blue-50/20 transition-colors cursor-pointer"
                      onClick={() => onOpenFacturaDetail?.(f)}
                    >
                      {/* Comprobante */}
                      <td className="px-5 py-3.5 font-mono">
                        <span className="font-bold text-slate-900 block font-sans">{desc}</span>
                        <span className="text-[11px] text-slate-500">
                          {f.tipo_comprobante === 99 ? `INT-${compNro}` : `${ptoVta}-${compNro}`}
                        </span>
                      </td>

                      {/* Fecha */}
                      <td className="px-5 py-3.5 text-slate-600 whitespace-nowrap">
                        {f.fecha_emision ? formatDate(f.fecha_emision) : '-'}
                      </td>

                      {/* Cliente */}
                      <td className="px-5 py-3.5 max-w-[180px] truncate">
                        <span className="font-bold text-slate-800 block truncate">
                          {f.receptor_razon_social || 'Consumidor Final'}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          Doc: {f.receptor_doc_nro || '-'}
                        </span>
                      </td>

                      {/* Jurisdicción (Editable inline) */}
                      <td className="px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
                        <select
                          value={pago.jurisdiccion}
                          onChange={(e) => onUpdatePago?.({
                            factura_id: f.id,
                            estado_pago: pago.estado_pago,
                            fecha_pago: pago.fecha_pago,
                            metodo_pago: pago.metodo_pago,
                            jurisdiccion: e.target.value,
                          })}
                          disabled={isUpdating}
                          className="px-2 py-1 text-[11px] font-semibold rounded-lg border border-slate-200 bg-white hover:border-[#468DFF] focus:outline-none cursor-pointer"
                        >
                          {JURISDICCIONES_ARGENTINA.map(j => (
                            <option key={j} value={j}>{j}</option>
                          ))}
                        </select>
                      </td>

                      {/* Monto Total */}
                      <td className="px-5 py-3.5 text-right font-mono font-bold text-slate-900 text-sm">
                        ${Number(f.imp_total || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                      </td>

                      {/* Toggle Estado de Pago (1 Clic) */}
                      <td className="px-5 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => {
                            const newEstado = pago.estado_pago === 'pagada' ? 'pendiente' : 'pagada';
                            onUpdatePago?.({
                              factura_id: f.id,
                              estado_pago: newEstado,
                              fecha_pago: newEstado === 'pagada' ? new Date().toISOString().split('T')[0] : null,
                              metodo_pago: pago.metodo_pago,
                              jurisdiccion: pago.jurisdiccion,
                            });
                          }}
                          className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 mx-auto ${
                            pago.estado_pago === 'pagada'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                              : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
                          }`}
                        >
                          {pago.estado_pago === 'pagada' ? (
                            <>
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                              <span>Pagada</span>
                            </>
                          ) : (
                            <>
                              <Clock className="h-3.5 w-3.5 text-amber-600" />
                              <span>Pendiente</span>
                            </>
                          )}
                        </button>
                      </td>

                      {/* Fecha de Pago */}
                      <td className="px-5 py-3.5 text-slate-600 whitespace-nowrap">
                        {pago.estado_pago === 'pagada' ? (
                          <span className="font-semibold text-emerald-700">
                            {formatDate(pago.fecha_pago)}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Por cobrar</span>
                        )}
                      </td>

                      {/* Método de Pago */}
                      <td className="px-5 py-3.5 capitalize text-slate-700">
                        {pago.estado_pago === 'pagada' ? pago.metodo_pago : '-'}
                      </td>

                      {/* Acciones */}
                      <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5 h-full">
                          <AppTooltip content="Visualizar Detalle y PDF">
                            <AppButton
                              variant="document-table"
                              size="icon"
                              onClick={() => onOpenFacturaDetail?.(f)}
                            >
                              <FileText className="h-4.5 w-4.5" />
                            </AppButton>
                          </AppTooltip>
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
