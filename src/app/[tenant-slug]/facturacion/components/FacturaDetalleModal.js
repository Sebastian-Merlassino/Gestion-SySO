// src/app/[tenant-slug]/facturacion/components/FacturaDetalleModal.js
// Modal de vista detallada completa de comprobante / factura electrónica ARCA con control de pago
'use strict';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  FileText, 
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  Send, 
  Calendar, 
  Building2, 
  User, 
  ShieldCheck, 
  Clock, 
  CreditCard,
  MapPin,
  Save,
  Check,
  Printer,
  Mail,
  Trash2
} from 'lucide-react';
import { getVoucherTypeDetails } from '../utils/facturaPdfGenerator';
import AppDatePicker from '@/components/ui/AppDatePicker';
import AppLabel from '@/components/ui/AppLabel';

const JURISDICCIONES_ARGENTINA = [
  'CABA',
  'Buenos Aires',
  'Córdoba',
  'Santa Fe',
  'Mendoza',
  'Tucumán',
  'Entre Ríos',
  'Salta',
  'Misiones',
  'Chaco',
  'Corrientes',
  'Santiago del Estero',
  'San Juan',
  'Jujuy',
  'Río Negro',
  'Neuquén',
  'Formosa',
  'Chubut',
  'San Luis',
  'Catamarca',
  'La Rioja',
  'La Pampa',
  'Santa Cruz',
  'Tierra del Fuego',
  'Otras / No especificada'
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

export default function FacturaDetalleModal({
  factura,
  config,
  onClose,
  onVerPdf,
  onDescargarPdf,
  onPrintPdf,
  onOpenSendModal,
  onDeleteFactura,
  onReintentar,
  onReconciliar,
  onUpdatePago,
}) {
  if (!factura) return null;

  const { letra, desc, codigo } = getVoucherTypeDetails(factura.tipo_comprobante);
  const ptoVta = String(factura.punto_venta || config?.punto_venta || 1).padStart(5, '0');
  const compNro = factura.numero_comprobante ? String(factura.numero_comprobante).padStart(8, '0') : '--------';

  // Parse items safely
  let items = [];
  if (Array.isArray(factura.items)) {
    items = factura.items;
  } else if (typeof factura.items === 'string') {
    try {
      items = JSON.parse(factura.items);
    } catch (e) {
      items = [];
    }
  }

  // Parse payment info
  let initialObs = {};
  if (typeof factura.observaciones_arca === 'object' && factura.observaciones_arca !== null) {
    initialObs = factura.observaciones_arca;
  } else if (typeof factura.observaciones_arca === 'string') {
    try { initialObs = JSON.parse(factura.observaciones_arca); } catch (e) {}
  }

  const [estadoPago, setEstadoPago] = useState(initialObs.estado_pago || 'pendiente');
  const [fechaPago, setFechaPago] = useState(initialObs.fecha_pago || '');
  const [metodoPago, setMetodoPago] = useState(initialObs.metodo_pago || 'transferencia');
  const [notasPago, setNotasPago] = useState(initialObs.notas_pago || '');
  const [jurisdiccion, setJurisdiccion] = useState(initialObs.jurisdiccion || 'CABA');
  const [savingPago, setSavingPago] = useState(false);
  const [pagoSavedSuccess, setPagoSavedSuccess] = useState(false);

  useEffect(() => {
    let obs = {};
    if (typeof factura.observaciones_arca === 'object' && factura.observaciones_arca !== null) {
      obs = factura.observaciones_arca;
    } else if (typeof factura.observaciones_arca === 'string') {
      try { obs = JSON.parse(factura.observaciones_arca); } catch (e) {}
    }
    setEstadoPago(obs.estado_pago || 'pendiente');
    setFechaPago(obs.fecha_pago || '');
    setMetodoPago(obs.metodo_pago || 'transferencia');
    setNotasPago(obs.notas_pago || '');
    setJurisdiccion(obs.jurisdiccion || 'CABA');
    setPagoSavedSuccess(false);
  }, [factura]);

  const handleSavePago = async () => {
    setSavingPago(true);
    try {
      await onUpdatePago?.({
        factura_id: factura.id,
        estado_pago: estadoPago,
        fecha_pago: estadoPago === 'pagada' ? (fechaPago || new Date().toISOString().split('T')[0]) : null,
        metodo_pago: metodoPago,
        notas_pago: notasPago,
        jurisdiccion,
      });
      setPagoSavedSuccess(true);
      setTimeout(() => setPagoSavedSuccess(false), 2500);
    } finally {
      setSavingPago(false);
    }
  };

  const conceptoLabels = {
    1: 'Productos',
    2: 'Servicios',
    3: 'Productos y Servicios',
  };

  const condIvaLabels = {
    responsable_inscripto: 'IVA Responsable Inscripto',
    monotributista: 'Responsable Monotributo',
    exento: 'IVA Exento',
    consumidor_final: 'Consumidor Final',
  };

  const docTipoLabels = {
    80: 'CUIT',
    96: 'DNI',
    99: 'Consumidor Final / Sin Doc',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-white/10 border border-white/20 flex flex-col items-center justify-center shrink-0">
              <span className="font-extrabold text-base leading-none text-white">{letra}</span>
              <span className="text-[8px] font-mono text-slate-300">CÓD. {codigo}</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-outfit font-bold text-base sm:text-lg text-white">
                  {desc} {ptoVta}-{compNro}
                </h3>
                {factura.estado === 'autorizada' ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> CAE Aprobado
                  </span>
                ) : factura.estado === 'borrador' ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-500/20 text-slate-300 border border-slate-500/30 flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Borrador
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> {factura.estado}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Emitida el {formatDate(factura.fecha_emision)} • Concepto: {conceptoLabels[factura.concepto] || 'Servicios'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1 scrollbar-thin text-xs text-slate-700">
          
          {/* Tarjetas Emisor y Receptor */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Emisor */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs border-b border-slate-200/80 pb-1.5">
                <Building2 className="h-4 w-4 text-[#468DFF]" />
                <span>Datos del Emisor (Titular)</span>
              </div>
              <div className="space-y-1 text-[11px]">
                <p>
                  <span className="text-slate-500 font-medium">Razón Social: </span>
                  <strong className="text-slate-800">{config?.razon_social || 'Gestión SySO'}</strong>
                </p>
                <p>
                  <span className="text-slate-500 font-medium">CUIT: </span>
                  <span className="font-mono text-slate-800">{config?.cuit || '20-27536690-1'}</span>
                </p>
                <p>
                  <span className="text-slate-500 font-medium">Condición IVA: </span>
                  <span className="text-slate-800">{condIvaLabels[config?.condicion_iva] || 'Responsable Monotributo'}</span>
                </p>
                <p>
                  <span className="text-slate-500 font-medium">Domicilio: </span>
                  <span className="text-slate-800">{config?.domicilio_comercial || '-'}</span>
                </p>
                <p>
                  <span className="text-slate-500 font-medium">Punto de Venta: </span>
                  <span className="font-mono text-slate-800">{ptoVta} (Web Services)</span>
                </p>
              </div>
            </div>

            {/* Receptor */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs border-b border-slate-200/80 pb-1.5">
                <User className="h-4 w-4 text-[#468DFF]" />
                <span>Datos del Receptor (Cliente)</span>
              </div>
              <div className="space-y-1 text-[11px]">
                <p>
                  <span className="text-slate-500 font-medium">Razón Social / Nombre: </span>
                  <strong className="text-slate-800">{factura.receptor_razon_social || 'Consumidor Final'}</strong>
                </p>
                <p>
                  <span className="text-slate-500 font-medium">{docTipoLabels[factura.receptor_doc_tipo] || 'Documento'}: </span>
                  <span className="font-mono text-slate-800">{factura.receptor_doc_nro || '-'}</span>
                </p>
                <p>
                  <span className="text-slate-500 font-medium">Condición IVA: </span>
                  <span className="text-slate-800">{condIvaLabels[factura.receptor_condicion_iva] || factura.receptor_condicion_iva || 'Consumidor Final'}</span>
                </p>
                <p>
                  <span className="text-slate-500 font-medium">Domicilio: </span>
                  <span className="text-slate-800">{factura.receptor_domicilio || '-'}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Fechas de Servicio (si aplica) */}
          {factura.concepto >= 2 && (
            <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-200 grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
              <div>
                <span className="text-slate-500 block">Período Facturado Desde:</span>
                <strong className="text-slate-800">{formatDate(factura.fecha_serv_desde)}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Hasta:</span>
                <strong className="text-slate-800">{formatDate(factura.fecha_serv_hasta)}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Vencimiento para el Pago:</span>
                <strong className="text-slate-800">{formatDate(factura.fecha_vto_pago)}</strong>
              </div>
            </div>
          )}

          {/* Control y Seguimiento de Pago / Cobranza */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-slate-50 to-blue-50/40 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
              <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs">
                <CreditCard className="h-4 w-4 text-[#468DFF]" />
                <span>Seguimiento de Cobro / Pago de la Factura</span>
              </div>
              {pagoSavedSuccess && (
                <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                  <Check className="h-3.5 w-3.5" /> ¡Guardado!
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-[11px] items-start">
              <div className="space-y-1">
                <AppLabel size="sm">Estado de Cobro</AppLabel>
                <select
                  value={estadoPago}
                  onChange={(e) => {
                    const val = e.target.value;
                    setEstadoPago(val);
                    if (val === 'pagada' && !fechaPago) {
                      setFechaPago(new Date().toISOString().split('T')[0]);
                    }
                  }}
                  className="w-full h-[34px] px-2.5 rounded-lg border border-slate-200 bg-white font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#468DFF] cursor-pointer text-xs"
                >
                  <option value="pendiente">🟡 Pendiente de Cobro</option>
                  <option value="pagada">🟢 Cobrada / Pagada</option>
                  <option value="anulada">⚪ Anulada / NC</option>
                </select>
              </div>

              <div className="space-y-1">
                <AppDatePicker
                  label="Fecha de Cobro"
                  value={fechaPago}
                  onChange={(e) => {
                    const val = typeof e === 'string' ? e : e?.target?.value || '';
                    setFechaPago(val);
                  }}
                  mode="ymd"
                  disabled={estadoPago !== 'pagada'}
                  placeholder="DD/MM/AAAA"
                  className="text-xs h-[34px] py-1 px-3 bg-white font-sans rounded-lg"
                />
              </div>

              <div className="space-y-1">
                <AppLabel size="sm">Método de Cobro</AppLabel>
                <select
                  value={metodoPago}
                  onChange={(e) => setMetodoPago(e.target.value)}
                  className="w-full h-[34px] px-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#468DFF] cursor-pointer text-xs"
                >
                  <option value="transferencia">Transferencia Bancaria</option>
                  <option value="efectivo">Efectivo</option>
                  <option value="cheque">Cheque / Echeq</option>
                  <option value="mercadopago">Mercado Pago</option>
                  <option value="tarjeta">Tarjeta de Débito/Crédito</option>
                  <option value="otro">Otro</option>
                </select>
              </div>

              <div className="space-y-1">
                <AppLabel size="sm">Jurisdicción</AppLabel>
                <select
                  value={jurisdiccion}
                  onChange={(e) => setJurisdiccion(e.target.value)}
                  className="w-full h-[34px] px-2.5 rounded-lg border border-slate-200 bg-white font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#468DFF] cursor-pointer text-xs"
                >
                  {JURISDICCIONES_ARGENTINA.map(j => (
                    <option key={j} value={j}>{j}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-1">
              <input
                type="text"
                placeholder="Notas de cobro (ej. N° de transferencia, banco, comprobante)..."
                value={notasPago}
                onChange={(e) => setNotasPago(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-[#468DFF]"
              />
              <button
                type="button"
                onClick={handleSavePago}
                disabled={savingPago}
                className="px-3.5 py-1.5 bg-slate-900 hover:bg-black text-white rounded-lg text-xs font-bold transition-colors shrink-0 flex items-center gap-1 cursor-pointer disabled:opacity-60"
              >
                <Save className="h-3.5 w-3.5" />
                <span>{savingPago ? 'Guardando...' : 'Guardar Estado'}</span>
              </button>
            </div>
          </div>

          {/* Tabla de Ítems */}
          <div>
            <span className="font-bold text-slate-900 text-xs block mb-2">
              Detalle de Ítems / Conceptos Facturados:
            </span>
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100/80 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="px-3.5 py-2.5">#</th>
                    <th className="px-3.5 py-2.5">Descripción</th>
                    <th className="px-3.5 py-2.5 text-right">Cant.</th>
                    <th className="px-3.5 py-2.5 text-right">Precio Unit.</th>
                    <th className="px-3.5 py-2.5 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[11px]">
                  {items.length > 0 ? (
                    items.map((it, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="px-3.5 py-2.5 text-slate-400 font-mono">{String(idx + 1).padStart(2, '0')}</td>
                        <td className="px-3.5 py-2.5 font-medium text-slate-800">{it.descripcion || factura.descripcion || 'Servicio Profesional'}</td>
                        <td className="px-3.5 py-2.5 text-right font-mono">{Number(it.cantidad || 1).toFixed(2)}</td>
                        <td className="px-3.5 py-2.5 text-right font-mono">${Number(it.precio_unitario || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                        <td className="px-3.5 py-2.5 text-right font-mono font-bold text-slate-900">${Number(it.subtotal || (Number(it.cantidad || 1) * Number(it.precio_unitario || 0))).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="px-3.5 py-2.5 text-slate-400 font-mono">01</td>
                      <td className="px-3.5 py-2.5 font-medium text-slate-800">{factura.descripcion || 'Servicios profesionales de Higiene y Seguridad Laboral'}</td>
                      <td className="px-3.5 py-2.5 text-right font-mono">1.00</td>
                      <td className="px-3.5 py-2.5 text-right font-mono">${Number(factura.imp_neto || factura.imp_total || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                      <td className="px-3.5 py-2.5 text-right font-mono font-bold text-slate-900">${Number(factura.imp_neto || factura.imp_total || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Cuadro de Totales y CAE */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
            
            {/* Información Fiscal de ARCA (CAE) */}
            <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-emerald-900 text-xs border-b border-emerald-200 pb-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <span>Autorización Fiscal ARCA</span>
              </div>
              <div className="space-y-1.5 text-[11px]">
                <div className="flex justify-between items-center">
                  <span className="text-emerald-800 font-medium">CAE N°:</span>
                  <span className="font-mono font-bold text-emerald-950 bg-white px-2 py-0.5 rounded border border-emerald-200">
                    {factura.cae || 'Sin CAE'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-emerald-800 font-medium">Fecha Vto. CAE:</span>
                  <span className="font-mono font-semibold text-emerald-950">
                    {formatDate(factura.cae_vencimiento)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-emerald-800 font-medium">Resultado:</span>
                  <span className="font-bold text-emerald-700">
                    {factura.resultado_arca === 'A' ? 'Aprobado Oficial' : (factura.resultado_arca || 'Pendiente')}
                  </span>
                </div>
              </div>
            </div>

            {/* Desglose de Totales */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between text-slate-600">
                  <span>Importe Neto Gravado:</span>
                  <span className="font-mono">${Number(factura.imp_neto || factura.imp_total || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Importe IVA:</span>
                  <span className="font-mono">${Number(factura.imp_iva || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
              <div className="pt-2 border-t border-slate-200 flex justify-between items-baseline">
                <span className="font-extrabold text-slate-900 text-sm">TOTAL:</span>
                <span className="font-mono font-extrabold text-[#468DFF] text-lg">
                  ${Number(factura.imp_total || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Actions Footer */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              Cerrar
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onDeleteFactura?.(factura.id);
              }}
              className="px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Eliminar este comprobante"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Eliminar</span>
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {factura.estado === 'autorizada' ? (
              <>
                <button
                  type="button"
                  onClick={() => onVerPdf?.(factura)}
                  className="px-3 py-2 bg-blue-50 text-[#468DFF] hover:bg-blue-100 border border-blue-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                  title="Ver comprobante en nueva pestaña"
                >
                  <FileText className="h-3.5 w-3.5" />
                  <span>Ver PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => onDescargarPdf?.(factura)}
                  className="px-3 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                  title="Descargar archivo PDF"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Descargar</span>
                </button>
                <button
                  type="button"
                  onClick={() => onPrintPdf?.(factura)}
                  className="px-3 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                  title="Imprimir comprobante"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>Imprimir</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenSendModal?.(factura);
                  }}
                  className="px-3.5 py-2 bg-[#468DFF] text-white hover:bg-[#0511F2] rounded-xl text-xs font-bold transition-all shadow-sm shadow-[#468DFF]/20 flex items-center gap-1.5 cursor-pointer"
                  title="Enviar factura por Correo Electrónico o WhatsApp"
                >
                  <Mail className="h-3.5 w-3.5" />
                  <span>Enviar Factura</span>
                </button>
              </>
            ) : factura.estado === 'borrador' ? (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onReintentar?.(factura.id);
                }}
                className="px-4 py-2 bg-[#468DFF] text-white hover:bg-[#0511F2] rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Emitir a ARCA</span>
              </button>
            ) : factura.estado === 'error_conexion' ? (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onReconciliar?.(factura.id);
                }}
                className="px-4 py-2 bg-amber-500 text-white hover:bg-amber-600 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Reconciliar con ARCA</span>
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
