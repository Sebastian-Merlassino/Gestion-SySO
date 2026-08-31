// src/app/[tenant-slug]/facturacion/components/NuevaFacturaForm.js
'use strict';
import React, { useState, useEffect } from 'react';
import {
  FileText,
  Plus,
  Trash2,
  Building,
  User,
  Calculator,
  Send,
  Save,
  AlertCircle,
  HelpCircle,
  Calendar,
  Layers,
  ChevronDown,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { getVoucherTypeDetails } from '../utils/facturaPdfGenerator';
import AppDatePicker from '@/components/ui/AppDatePicker';

export const SERVICIOS_SYSO_PREDEFINIDOS = [
  'Análisis de trabajo seguro (ATS)',
  'Análisis fisicoquímico y bacteriológico de agua para el consumo humano',
  'Asesoría ISO 14001 / ISO 45001',
  'Capacitación',
  'Carga de Sistema de Vigilancia y Control de Sustancias y Agentes (S.V.C.C.)',
  'Elaboración de procedimientos de trabajo seguro',
  'Estudio de carga de fuego',
  'Estudio de carga térmica',
  'Estudio de iluminación',
  'Estudio de ruido',
  'Estudio de ventilación',
  'Estudio de vibraciones',
  'Estudio ergonómico (Análisis Ergonómico por puesto de trabajo y confección de planillas 3 y 4 según Res. 886/2015)',
  'Estudio ergonómico (Confección de planillas 1 y 2 según Res. 886/2015 y Análisis Ergonómico por puesto de trabajo + confección de planillas 3 y 4 según Res. 886/2015)',
  'Estudio ergonómico (Confección de planillas 1 y 2 según Res. 886/2015)',
  'Estudio ergonómico (Confección informe según Res. 295/03)',
  'Gestión ante la A.R.T. (confección y carga de RGRL y RAR)',
  'Informe antisiniestral',
  'Informe de investigación de accidente (con análisis de causa raíz y definición de acciones correctivas)',
  'Medición de puesta a tierra y continuidad de masas',
  'Plano de evacuación',
  'Procedimiento de acción ante emergencias',
  'Procedimiento de trabajo seguro',
  'Programa de ergonomía integrado',
  'Programa de Seguridad (Res. 51/97; Res. 35/98; Res. 319/99)',
  'Programa de Seguridad y Protocolo de Higiene y Salud en el Trabajo, Emergencia Sanitaria COVID19',
  'Protocolo de Higiene y Salud en el Trabajo, Emergencia Sanitaria COVID19',
  'Realizar / renovar aplicación de retardante de llamas - tratamiento ignífugo',
  'Servicio externo de Salud y Seguridad Ocupacional',
  'Simulacro de derrame',
  'Simulacro de evacuación',
  'Simulacro de incendio',
  'Sistema de autoprotección',
  'Toma de muestra para análisis fisicoquímico y bacteriológico de agua para el consumo humano',
  'Visita de técnico a obra / establecimiento'
];

export default function NuevaFacturaForm({
  config,
  empresas = [],
  onEmitirFactura,
  onGuardarBorrador,
  isSubmitting = false
}) {
  const [tipoComprobante, setTipoComprobante] = useState(
    config?.condicion_iva === 'monotributista' ? 11 : 6
  );
  const [concepto, setConcepto] = useState(2); // 2 = Servicios (standard for SySO)
  const [selectedEmpresaId, setSelectedEmpresaId] = useState('');

  // Receiver Data
  const [receiver, setReceiver] = useState({
    doc_tipo: 80, // 80 = CUIT
    doc_nro: '',
    razon_social: '',
    condicion_iva: 'responsable_inscripto',
    domicilio: '',
  });

  // Dates
  const todayStr = new Date().toISOString().split('T')[0];
  const [fechaServDesde, setFechaServDesde] = useState(todayStr);
  const [fechaServHasta, setFechaServHasta] = useState(todayStr);
  const [fechaVtoPago, setFechaVtoPago] = useState(todayStr);

  // Line items
  const [items, setItems] = useState([
    {
      descripcion: '',
      cantidad: 1,
      precio_unitario: 0,
      iva_porcentaje: config?.condicion_iva === 'monotributista' ? 0 : 21,
    }
  ]);

  // When picking an existing client from SySO
  const handleSelectEmpresa = (empresaId) => {
    setSelectedEmpresaId(empresaId);
    if (!empresaId) return;

    const emp = empresas.find(e => e.id === empresaId);
    if (emp) {
      const cuitClean = (emp.cuit || '').replace(/[^0-9]/g, '');
      setReceiver({
        doc_tipo: cuitClean.length === 11 ? 80 : 99,
        doc_nro: cuitClean || '',
        razon_social: emp.razon_social || '',
        condicion_iva: emp.condicion_iva || 'responsable_inscripto',
        domicilio: emp.direccion || '',
      });
    }
  };

  // Calculations
  const isMonotributo = config?.condicion_iva === 'monotributista' || tipoComprobante === 11;

  const calculateTotals = () => {
    let impNeto = 0;
    let impIva = 0;
    const ivaMap = {};

    items.forEach((it) => {
      const qty = parseFloat(it.cantidad) || 0;
      const price = parseFloat(it.precio_unitario) || 0;
      const subtotal = qty * price;

      if (isMonotributo) {
        impNeto += subtotal;
      } else {
        const ivaPct = parseFloat(it.iva_porcentaje) || 0;
        const ivaAmt = subtotal * (ivaPct / 100);
        impNeto += subtotal;
        impIva += ivaAmt;

        // ARCA IVA Id map: 5 = 21%, 4 = 10.5%, 6 = 27%, 8 = 5%, 9 = 2.5%, 3 = 0%
        let ivaId = 5;
        if (ivaPct === 10.5) ivaId = 4;
        else if (ivaPct === 27) ivaId = 6;
        else if (ivaPct === 0) ivaId = 3;

        if (!ivaMap[ivaId]) {
          ivaMap[ivaId] = { Id: ivaId, BaseImp: 0, Importe: 0 };
        }
        ivaMap[ivaId].BaseImp += subtotal;
        ivaMap[ivaId].Importe += ivaAmt;
      }
    });

    const impTotal = impNeto + impIva;
    const detalleIva = Object.values(ivaMap).map(v => ({
      Id: v.Id,
      BaseImp: Number(v.BaseImp.toFixed(2)),
      Importe: Number(v.Importe.toFixed(2)),
    }));

    return {
      impNeto: Number(impNeto.toFixed(2)),
      impIva: Number(impIva.toFixed(2)),
      impTotal: Number(impTotal.toFixed(2)),
      detalleIva: isMonotributo ? null : detalleIva,
    };
  };

  const totals = calculateTotals();

  // Item handlers
  const handleItemChange = (index, field, value) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        descripcion: '',
        cantidad: 1,
        precio_unitario: 0,
        iva_porcentaje: isMonotributo ? 0 : 21,
      }
    ]);
  };

  const handleRemoveItem = (index) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const buildPayload = (soloBorrador = false) => {
    const formattedItems = items.map(it => ({
      descripcion: it.descripcion,
      cantidad: parseFloat(it.cantidad) || 1,
      precio_unitario: parseFloat(it.precio_unitario) || 0,
      subtotal: (parseFloat(it.cantidad) || 1) * (parseFloat(it.precio_unitario) || 0),
      iva_porcentaje: isMonotributo ? 0 : (parseFloat(it.iva_porcentaje) || 0),
    }));

    const cleanDocNro = parseInt(String(receiver.doc_nro).replace(/[^0-9]/g, '')) || 0;

    return {
      tipo_comprobante: parseInt(tipoComprobante),
      concepto: parseInt(concepto),
      receptor_doc_tipo: parseInt(receiver.doc_tipo),
      receptor_doc_nro: cleanDocNro,
      receptor_razon_social: receiver.razon_social || null,
      receptor_condicion_iva: receiver.condicion_iva || null,
      receptor_domicilio: receiver.domicilio || null,
      imp_neto: totals.impNeto,
      imp_iva: totals.impIva,
      imp_total: totals.impTotal,
      detalle_iva: totals.detalleIva,
      items: formattedItems,
      descripcion: items.map(i => i.descripcion).filter(Boolean).join('; '),
      fecha_serv_desde: concepto >= 2 ? fechaServDesde : null,
      fecha_serv_hasta: concepto >= 2 ? fechaServHasta : null,
      fecha_vto_pago: concepto >= 2 ? fechaVtoPago : null,
      empresa_id: selectedEmpresaId || null,
      solo_borrador: soloBorrador,
    };
  };

  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const handleEmitir = (e) => {
    e.preventDefault();
    if (totals.impTotal <= 0) {
      alert('El importe total del comprobante debe ser mayor a cero.');
      return;
    }
    // Abrir modal de confirmación antes de enviar a ARCA
    setShowConfirmModal(true);
  };

  const handleConfirmEmitir = () => {
    setShowConfirmModal(false);
    const payload = buildPayload(false);
    onEmitirFactura(payload);
  };

  const handleGuardarBorrador = () => {
    const payload = buildPayload(true);
    onGuardarBorrador(payload);
  };

  // When switching document type (CUIT vs DNI vs Consumidor Final)
  const handleDocTipoChange = (newDocTipo) => {
    const val = parseInt(newDocTipo);
    setReceiver(prev => {
      let newCond = prev.condicion_iva;
      let newDocNro = prev.doc_nro;
      let newRazon = prev.razon_social;

      if (val === 99) {
        newCond = 'consumidor_final';
        newDocNro = '0';
        if (!newRazon || newRazon === 'Consumidor Final') {
          newRazon = 'Consumidor Final';
        }
      } else if (val === 96) {
        newCond = 'consumidor_final';
        if (newDocNro === '0') newDocNro = '';
        if (newRazon === 'Consumidor Final') newRazon = '';
      } else if (val === 80) {
        if (newCond === 'consumidor_final') newCond = 'responsable_inscripto';
        if (newDocNro === '0') newDocNro = '';
        if (newRazon === 'Consumidor Final') newRazon = '';
      }

      return {
        ...prev,
        doc_tipo: val,
        doc_nro: newDocNro,
        condicion_iva: newCond,
        razon_social: newRazon,
      };
    });
  };

  return (
    <form onSubmit={handleEmitir} className="space-y-6">
      {/* 1. Header: Tipo de Comprobante & Concepto */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-7 shadow-sm">
        <h3 className="text-base font-bold text-slate-800 pb-3 mb-4 border-b border-slate-100 flex items-center gap-2">
          <Layers className="h-4.5 w-4.5 text-[#468DFF]" />
          Tipo de Comprobante y Concepto
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Tipo de Comprobante *
            </label>
            <select
              value={tipoComprobante}
              onChange={(e) => setTipoComprobante(parseInt(e.target.value))}
              className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#468DFF] transition-all"
            >
              <optgroup label="Facturas">
                <option value={11}>Factura C (Monotributo / IVA Exento)</option>
                <option value={1}>Factura A (Responsable Inscripto a Resp. Inscripto)</option>
                <option value={6}>Factura B (Resp. Inscripto a Consumidor Final / Monotributo)</option>
              </optgroup>
              <optgroup label="Comprobantes Internos (No Fiscales / Sin CAE)">
                <option value={99}>Comprobante / Remito Interno (X) — Control y Seguimiento</option>
              </optgroup>
              <optgroup label="Notas de Crédito">
                <option value={13}>Nota de Crédito C</option>
                <option value={3}>Nota de Crédito A</option>
                <option value={8}>Nota de Crédito B</option>
              </optgroup>
              <optgroup label="Notas de Débito">
                <option value={12}>Nota de Débito C</option>
                <option value={2}>Nota de Débito A</option>
                <option value={7}>Nota de Débito B</option>
              </optgroup>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Concepto a Facturar *
            </label>
            <select
              value={concepto}
              onChange={(e) => setConcepto(parseInt(e.target.value))}
              className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#468DFF] transition-all"
            >
              <option value={2}>Servicios (Higiene, Seguridad, Capacitación)</option>
              <option value={1}>Productos / Bienes</option>
              <option value={3}>Productos y Servicios (Ambos)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Punto de Venta
            </label>
            <div className="px-3.5 py-2.5 text-xs font-bold rounded-xl border border-slate-200 bg-slate-100 text-slate-700">
              {tipoComprobante === 99 ? 'Punto 0001 (Interno)' : `Punto ${String(config?.punto_venta || 1).padStart(4, '0')} (Web Services)`}
            </div>
          </div>
        </div>

        {/* Banner Informativo para Comprobante Interno */}
        {tipoComprobante === 99 && (
          <div className="mt-4 p-3.5 bg-purple-50 border border-purple-200/80 rounded-xl flex items-start gap-3 text-xs text-purple-900 animate-fade-in">
            <span className="px-2 py-1 bg-purple-200 text-purple-800 rounded-lg font-extrabold text-xs shrink-0">X</span>
            <div>
              <p className="font-bold">Comprobante / Remito Interno (No Fiscal)</p>
              <p className="text-purple-800 text-[11px] mt-0.5 leading-relaxed">
                Este registro se guardará para control administrativo y seguimiento de cobranzas. <strong>No se comunica con los servidores de ARCA ni genera CAE fiscal.</strong>
              </p>
            </div>
          </div>
        )}

        {/* Service Date Range (only for Concepto 2 or 3) */}
        {concepto >= 2 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 mt-4 border-t border-slate-100 animate-fade-in">
            <div>
              <AppDatePicker
                label="Período Facturado Desde"
                required
                value={fechaServDesde}
                onChange={(val) => {
                  const finalVal = typeof val === 'string' ? val : val?.target?.value || '';
                  setFechaServDesde(finalVal);
                }}
                mode="ymd"
                placeholder="DD/MM/AAAA"
              />
            </div>
            <div>
              <AppDatePicker
                label="Período Facturado Hasta"
                required
                value={fechaServHasta}
                onChange={(val) => {
                  const finalVal = typeof val === 'string' ? val : val?.target?.value || '';
                  setFechaServHasta(finalVal);
                }}
                mode="ymd"
                placeholder="DD/MM/AAAA"
              />
            </div>
            <div>
              <AppDatePicker
                label="Vencimiento para el Pago"
                required
                value={fechaVtoPago}
                onChange={(val) => {
                  const finalVal = typeof val === 'string' ? val : val?.target?.value || '';
                  setFechaVtoPago(finalVal);
                }}
                mode="ymd"
                placeholder="DD/MM/AAAA"
              />
            </div>
          </div>
        )}
      </div>

      {/* 2. Receptor Data */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-7 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 mb-4 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Building className="h-4.5 w-4.5 text-[#468DFF]" />
            Datos del Receptor / Cliente
          </h3>

          {empresas.length > 0 && (
            <div className="w-full sm:w-64">
              <select
                value={selectedEmpresaId}
                onChange={(e) => handleSelectEmpresa(e.target.value)}
                className="w-full px-3 py-1.5 text-xs font-medium rounded-xl border border-slate-200 bg-blue-50/50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#468DFF]"
              >
                <option value="">Seleccionar de Mis Clientes...</option>
                {empresas.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.razon_social} ({emp.cuit || 'Sin CUIT'})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Tipo de Documento *
            </label>
            <select
              value={receiver.doc_tipo}
              onChange={(e) => handleDocTipoChange(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#468DFF]"
            >
              <option value={80}>CUIT (Empresas / Resp. Inscripto / Monotributo)</option>
              <option value={96}>DNI (Personas Físicas)</option>
              <option value={99}>Consumidor Final (Sin Documento)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Número de CUIT / Documento *
            </label>
            <input
              type="text"
              required={receiver.doc_tipo !== 99}
              placeholder={receiver.doc_tipo === 99 ? '0' : '20-12345678-9'}
              value={receiver.doc_nro}
              onChange={(e) => setReceiver(r => ({ ...r, doc_nro: e.target.value }))}
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#468DFF]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Razón Social / Nombre *
            </label>
            <input
              type="text"
              required
              placeholder="Ej: Consumidor Final o Juan Pérez"
              value={receiver.razon_social}
              onChange={(e) => setReceiver(r => ({ ...r, razon_social: e.target.value }))}
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#468DFF]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Condición frente al IVA *
            </label>
            <select
              value={receiver.condicion_iva}
              onChange={(e) => setReceiver(r => ({ ...r, condicion_iva: e.target.value }))}
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#468DFF]"
            >
              <option value="responsable_inscripto">IVA Responsable Inscripto</option>
              <option value="monotributista">Responsable Monotributo</option>
              <option value="consumidor_final">Consumidor Final</option>
              <option value="exento">IVA Exento</option>
            </select>
          </div>
        </div>
      </div>

      {/* 3. Items Table */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-7 shadow-sm">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Calculator className="h-4.5 w-4.5 text-[#468DFF]" />
            Líneas y Conceptos a Facturar
          </h3>

          <button
            type="button"
            onClick={handleAddItem}
            className="px-3 py-1.5 bg-blue-50 text-[#468DFF] hover:bg-blue-100 rounded-xl text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" /> Agregar Línea
          </button>
        </div>

        {/* Table Header for Desktop */}
        <div className="hidden lg:grid grid-cols-12 gap-2.5 px-3.5 py-2 text-[11px] font-bold text-slate-600 uppercase tracking-wider bg-slate-100/80 rounded-xl mb-2 border border-slate-200/60">
          <div className="col-span-5 flex items-center gap-1">
            <span>Descripción del Servicio / Concepto *</span>
          </div>
          <div className="col-span-2 text-right">
            <span>Cantidad *</span>
          </div>
          <div className="col-span-2 text-right">
            <span>Precio Unitario ($) *</span>
          </div>
          {!isMonotributo && (
            <div className="col-span-2">
              <span>Alícuota IVA</span>
            </div>
          )}
          <div className={`text-right ${isMonotributo ? 'col-span-3' : 'col-span-1'}`}>
            <span>Subtotal</span>
          </div>
        </div>

        <div className="space-y-3">
          {items.map((item, idx) => (
            <div
              key={idx}
              className="grid grid-cols-12 gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50/50 items-center"
            >
              <div className="col-span-12 lg:col-span-5">
                <label className="block text-[11px] font-bold text-slate-700 mb-1 lg:hidden">
                  Descripción del Servicio / Concepto *
                </label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    required
                    list="servicios-syso-list"
                    placeholder="Escribí o seleccioná un servicio..."
                    value={item.descripcion}
                    onChange={(e) => handleItemChange(idx, 'descripcion', e.target.value)}
                    className="w-full pl-3 pr-8 py-2 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#468DFF] transition-all font-medium text-slate-800 placeholder-slate-400 [&::-webkit-calendar-picker-indicator]:hidden"
                  />
                  
                  {/* Selector desplegable de acceso directo */}
                  <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center">
                    <div className="relative">
                      <select
                        value=""
                        onChange={(e) => {
                          if (e.target.value) {
                            handleItemChange(idx, 'descripcion', e.target.value);
                          }
                        }}
                        className="opacity-0 absolute inset-0 w-6 h-6 cursor-pointer z-10"
                        title="Seleccionar de la lista de servicios sugeridos"
                      >
                        <option value="" disabled>Seleccionar servicio sugerido...</option>
                        {SERVICIOS_SYSO_PREDEFINIDOS.map((s, sIdx) => (
                          <option key={sIdx} value={s}>{s}</option>
                        ))}
                      </select>
                      <div className="p-1 rounded text-slate-400 hover:text-[#468DFF] hover:bg-slate-100 transition-colors pointer-events-none">
                        <ChevronDown className="h-3.5 w-3.5" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-span-4 lg:col-span-2">
                <label className="block text-[11px] font-bold text-slate-700 mb-1 lg:hidden text-right">
                  Cantidad *
                </label>
                <input
                  type="number"
                  min={0.01}
                  step="any"
                  required
                  placeholder="1"
                  value={item.cantidad}
                  onChange={(e) => handleItemChange(idx, 'cantidad', e.target.value)}
                  className="w-full px-3 py-2 text-xs text-right rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#468DFF] font-mono"
                />
              </div>

              <div className="col-span-4 lg:col-span-2">
                <label className="block text-[11px] font-bold text-slate-700 mb-1 lg:hidden text-right">
                  Precio Unitario ($) *
                </label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-semibold">$</span>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={item.precio_unitario}
                    onChange={(e) => handleItemChange(idx, 'precio_unitario', e.target.value)}
                    className="w-full pl-6 pr-3 py-2 text-xs text-right rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#468DFF] font-mono"
                  />
                </div>
              </div>

              {!isMonotributo && (
                <div className="col-span-3 lg:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1 lg:hidden">
                    Alícuota IVA
                  </label>
                  <select
                    value={item.iva_porcentaje}
                    onChange={(e) => handleItemChange(idx, 'iva_porcentaje', parseFloat(e.target.value))}
                    className="w-full px-2 py-2 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#468DFF]"
                  >
                    <option value={21}>21%</option>
                    <option value={10.5}>10.5%</option>
                    <option value={27}>27%</option>
                    <option value={0}>0%</option>
                  </select>
                </div>
              )}

              <div className={`flex items-center justify-end gap-2 ${isMonotributo ? 'col-span-4 lg:col-span-3' : 'col-span-1 lg:col-span-1'}`}>
                <div className="text-right">
                  <span className="block text-[10px] text-slate-400 lg:hidden">Subtotal:</span>
                  <span className="text-xs font-bold text-slate-800 font-mono">
                    ${((parseFloat(item.cantidad) || 0) * (parseFloat(item.precio_unitario) || 0)).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(idx)}
                    className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors cursor-pointer ml-1"
                    title="Eliminar línea"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Datalist de servicios SySO para autocompletado nativo editable */}
        <datalist id="servicios-syso-list">
          {SERVICIOS_SYSO_PREDEFINIDOS.map((srv, sIdx) => (
            <option key={sIdx} value={srv} />
          ))}
        </datalist>

        {/* Totals Summary */}
        <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col sm:flex-row items-end sm:justify-end">
          <div className="w-full sm:w-72 bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-xs text-slate-600">
              <span>Subtotal Neto:</span>
              <span className="font-semibold">${totals.impNeto.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
            </div>
            {!isMonotributo && (
              <div className="flex justify-between text-xs text-slate-600">
                <span>IVA Liquidado:</span>
                <span className="font-semibold">${totals.impIva.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            <div className="pt-2 border-t border-slate-200 flex justify-between text-sm font-bold text-slate-900">
              <span className="text-[#468DFF]">IMPORTE TOTAL:</span>
              <span>${totals.impTotal.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
            </div>
            {totals.impTotal <= 0 && (
              <span className="text-[11px] text-amber-600 font-medium block text-right pt-1">
                ⚠️ Ingresá un precio unitario mayor a $0 para habilitar la emisión.
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 4. Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
        <div className="text-xs text-slate-500 flex items-center gap-1.5">
          <HelpCircle className="h-4 w-4 text-slate-400 shrink-0" />
          <span>
            {tipoComprobante === 99
              ? 'Registro interno: se guarda para control administrativo sin enviar a ARCA ni requerir CAE.'
              : 'Al emitir, los datos se resguardan como borrador antes de solicitar CAE a ARCA.'}
          </span>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            type="button"
            onClick={handleGuardarBorrador}
            disabled={isSubmitting}
            className="px-4 py-2.5 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 flex-1 sm:flex-initial"
          >
            <Save className="h-4 w-4" />
            Guardar Borrador
          </button>

          <button
            type="submit"
            disabled={isSubmitting || totals.impTotal <= 0}
            className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex-1 sm:flex-initial text-white ${
              tipoComprobante === 99
                ? 'bg-purple-600 hover:bg-purple-700 shadow-purple-600/20'
                : 'bg-[#468DFF] hover:bg-[#0511F2] shadow-[#468DFF]/20'
            }`}
          >
            {tipoComprobante === 99 ? (
              <>
                <CheckCircle2 className="h-4 w-4" />
                {isSubmitting ? 'Registrando...' : 'Registrar Comprobante Interno'}
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                {isSubmitting
                  ? 'Emitiendo en ARCA...'
                  : [3, 8, 13].includes(tipoComprobante)
                  ? 'Emitir Nota de Crédito'
                  : 'Emitir Factura'}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Modal de Confirmación y Revisión de Datos */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-5 sm:p-6 space-y-4 animate-scale-up">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <div className={`p-2 rounded-xl ${tipoComprobante === 99 ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-[#468DFF]'}`}>
                {tipoComprobante === 99 ? <CheckCircle2 className="h-5 w-5" /> : <Send className="h-5 w-5" />}
              </div>
              <div>
                <h4 className="text-sm sm:text-base font-bold text-slate-800">
                  {tipoComprobante === 99
                    ? '¿Confirmar Registro Interno (X)?'
                    : '¿Confirmar Emisión en ARCA?'}
                </h4>
                <p className="text-[11px] text-slate-400">
                  {tipoComprobante === 99
                    ? 'Este comprobante se guardará para control y seguimiento de cobranzas (no fiscal).'
                    : 'Revisá el resumen del comprobante antes de solicitar CAE oficial.'}
                </p>
              </div>
            </div>

            {/* Tarjeta de Resumen */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs text-slate-700">
              <div className="flex justify-between">
                <span className="text-slate-500">Comprobante:</span>
                <span className="font-bold text-slate-900">
                  {getVoucherTypeDetails(tipoComprobante).desc} ({getVoucherTypeDetails(tipoComprobante).letra})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Receptor / Cliente:</span>
                <span className="font-bold text-slate-900 truncate max-w-[220px]">
                  {receiver.razon_social || 'Consumidor Final'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Documento / CUIT:</span>
                <span className="font-mono font-semibold text-slate-800">{receiver.doc_nro || '0'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Condición IVA:</span>
                <span className="capitalize font-semibold text-slate-800">
                  {receiver.condicion_iva.replace('_', ' ')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Conceptos:</span>
                <span className="font-semibold text-slate-800">{items.length} ítem(s)</span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex justify-between items-baseline">
                <span className="font-bold text-slate-700">Importe Total:</span>
                <span className={`text-base font-extrabold font-mono ${tipoComprobante === 99 ? 'text-purple-600' : 'text-[#468DFF]'}`}>
                  ${totals.impTotal.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Botones de acción */}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Volver a Revisar
              </button>
              <button
                type="button"
                onClick={handleConfirmEmitir}
                disabled={isSubmitting}
                className={`px-5 py-2 text-xs font-bold text-white rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5 ${
                  tipoComprobante === 99
                    ? 'bg-purple-600 hover:bg-purple-700 shadow-purple-600/20'
                    : 'bg-[#468DFF] hover:bg-[#0511F2] shadow-[#468DFF]/20'
                }`}
              >
                {tipoComprobante === 99 ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Send className="h-3.5 w-3.5" />}
                {tipoComprobante === 99 ? 'Confirmar y Registrar' : 'Confirmar y Emitir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
