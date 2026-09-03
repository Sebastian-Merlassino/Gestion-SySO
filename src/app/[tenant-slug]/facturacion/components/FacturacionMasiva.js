// src/app/[tenant-slug]/facturacion/components/FacturacionMasiva.js
'use strict';
import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { normalizeDateToYMD } from '@/lib/arca/arcaDates';
import { normalizeJurisdiction } from '@/lib/arca/arcaJurisdictions';
import {
  FileSpreadsheet,
  Download,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Send,
  RefreshCw,
  Eye,
  Trash2,
  Check,
  X,
  Receipt,
} from 'lucide-react';

export default function FacturacionMasiva({
  config,
  onEmitirLote,
  isProcessingBatch = false,
  onNavigateToComprobantes,
}) {
  const [parsedRows, setParsedRows] = useState([]);
  const [fileName, setFileName] = useState('');
  const [parseErrors, setParseErrors] = useState([]);
  const [batchResult, setBatchResult] = useState(null);
  const fileInputRef = useRef(null);

  const handleReset = () => {
    setParsedRows([]);
    setFileName('');
    setParseErrors([]);
    setBatchResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Generate and download Excel template
  const handleDownloadTemplate = () => {
    const isMonotributo = config?.condicion_iva === 'monotributista';
    const defaultCbte = isMonotributo ? 11 : 6;

    const templateData = [
      {
        'Tipo Comprobante (1=A, 6=B, 11=C)': defaultCbte,
        'Concepto (1=Prod, 2=Serv, 3=Ambos)': 2,
        'Doc Tipo (80=CUIT, 96=DNI, 99=CF)': 80,
        'Doc Numero (CUIT/DNI)': 30712345678,
        'Razon Social / Cliente': 'Industrias Metalúrgicas S.A.',
        'Condicion IVA': 'Responsable Inscripto',
        'Descripcion Item': 'Servicio Mensual de Higiene y Seguridad Laboral',
        'Cantidad': 1,
        'Precio Unitario': 150000,
        'Alicuota IVA (21, 10.5, 0)': isMonotributo ? 0 : 21,
        'Jurisdicción (opcional: CABA, Buenos Aires, etc.)': 'Buenos Aires',
        'Fecha Serv Desde (YYYY-MM-DD)': new Date().toISOString().split('T')[0],
        'Fecha Serv Hasta (YYYY-MM-DD)': new Date().toISOString().split('T')[0],
        'Fecha Vto Pago (YYYY-MM-DD)': new Date().toISOString().split('T')[0],
      },
      {
        'Tipo Comprobante (1=A, 6=B, 11=C)': defaultCbte,
        'Concepto (1=Prod, 2=Serv, 3=Ambos)': 2,
        'Doc Tipo (80=CUIT, 96=DNI, 99=CF)': 80,
        'Doc Numero (CUIT/DNI)': 30654321987,
        'Razon Social / Cliente': 'Constructora del Sur S.R.L.',
        'Condicion IVA': 'Responsable Inscripto',
        'Descripcion Item': 'Medición de Puesta a Tierra y Protocolo Iluminación',
        'Cantidad': 1,
        'Precio Unitario': 85000,
        'Alicuota IVA (21, 10.5, 0)': isMonotributo ? 0 : 21,
        'Jurisdicción (opcional: CABA, Buenos Aires, etc.)': 'CABA',
        'Fecha Serv Desde (YYYY-MM-DD)': new Date().toISOString().split('T')[0],
        'Fecha Serv Hasta (YYYY-MM-DD)': new Date().toISOString().split('T')[0],
        'Fecha Vto Pago (YYYY-MM-DD)': new Date().toISOString().split('T')[0],
      },
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Facturas');
    XLSX.writeFile(wb, 'Plantilla_Facturacion_Masiva_SySO.xlsx');
  };

  // Handle Excel File Upload & Parsing
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setBatchResult(null);
    setParseErrors([]);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const rawData = XLSX.utils.sheet_to_json(ws, { defval: '' });

        if (!rawData || rawData.length === 0) {
          setParseErrors(['El archivo Excel no contiene filas de datos.']);
          return;
        }

        const validRows = [];
        const errors = [];

        const todayStr = new Date().toISOString().split('T')[0];

        rawData.forEach((row, idx) => {
          const filaNum = idx + 2; // header is row 1
          
          // Get values flexibly matching standard or trimmed keys
          const getVal = (possibleKeys) => {
            for (const k of possibleKeys) {
              if (row[k] !== undefined && row[k] !== '') return row[k];
            }
            // case-insensitive fallback
            for (const key of Object.keys(row)) {
              for (const pk of possibleKeys) {
                if (key.toLowerCase().trim().includes(pk.toLowerCase().trim())) {
                  if (row[key] !== undefined && row[key] !== '') return row[key];
                }
              }
            }
            return '';
          };

          const cbteTipoRaw = getVal(['Tipo Comprobante (1=A, 6=B, 11=C)', 'Tipo Comprobante', 'tipo_comprobante']) || (config?.condicion_iva === 'monotributista' ? 11 : 6);
          const conceptoRaw = getVal(['Concepto (1=Prod, 2=Serv, 3=Ambos)', 'Concepto', 'concepto']) || 2;
          const docTipoRaw = getVal(['Doc Tipo (80=CUIT, 96=DNI, 99=CF)', 'Doc Tipo', 'doc_tipo']) || 80;
          
          let docNroRaw = getVal(['Doc Numero (CUIT/DNI)', 'Doc Numero', 'Doc Número', 'cuit', 'documento']);
          if (typeof docNroRaw === 'number') {
            docNroRaw = String(Math.floor(docNroRaw));
          } else {
            docNroRaw = String(docNroRaw || '').replace(/[^0-9]/g, '');
          }

          const razonSocial = String(getVal(['Razon Social / Cliente', 'Razón Social / Cliente', 'Razon Social', 'Razón Social', 'Cliente']) || 'Cliente');
          const precioUnit = parseFloat(getVal(['Precio Unitario', 'precio_unitario', 'Precio', 'Importe', 'Total']) || 0);
          const cantidad = parseFloat(getVal(['Cantidad', 'cantidad']) || 1);
          const ivaPct = parseFloat(getVal(['Alicuota IVA (21, 10.5, 0)', 'Alícuota IVA', 'Alicuota IVA', 'IVA', 'iva']) || (config?.condicion_iva === 'monotributista' ? 0 : 21));

          const itemDesc = String(getVal(['Descripcion Item', 'Descripción Item', 'Descripcion', 'Descripción', 'Concepto Detalle']) || 'Servicio Profesional SySO');
          const domicilio = String(getVal(['Domicilio', 'Direccion', 'Dirección', 'domicilio']) || '');
          const rawJurisdiccion = String(getVal([
            'Jurisdicción (opcional: CABA, Buenos Aires, etc.)',
            'Jurisdiccion (opcional: CABA, Buenos Aires, etc.)',
            'Jurisdicción', 'Jurisdiccion', 'jurisdiccion', 'jurisdicción',
            'Provincia', 'provincia',
          ]) || '');
          const jurisdiccionVal = rawJurisdiccion.trim() ? normalizeJurisdiction(rawJurisdiccion) : null;

          if (!docNroRaw && parseInt(docTipoRaw) !== 99) {
            errors.push(`Fila ${filaNum}: Falta número de CUIT o Documento.`);
          }
          if (precioUnit <= 0) {
            errors.push(`Fila ${filaNum}: El precio unitario debe ser mayor a $0.`);
          }

          const subtotal = cantidad * precioUnit;
          const isMono = config?.condicion_iva === 'monotributista' || parseInt(cbteTipoRaw) === 11 || parseInt(cbteTipoRaw) === 99;
          const ivaAmt = isMono ? 0 : subtotal * (ivaPct / 100);
          const total = subtotal + ivaAmt;

          let detalleIva = null;
          if (!isMono && ivaAmt > 0) {
            let ivaId = 5;
            if (ivaPct === 10.5) ivaId = 4;
            else if (ivaPct === 27) ivaId = 6;
            detalleIva = [{ Id: ivaId, BaseImp: Number(subtotal.toFixed(2)), Importe: Number(ivaAmt.toFixed(2)) }];
          }

          const now = new Date();
          const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

          const rawDesde = getVal(['Fecha Serv Desde (YYYY-MM-DD)', 'Fecha Serv Desde', 'Desde', 'Serv Desde']);
          const rawHasta = getVal(['Fecha Serv Hasta (YYYY-MM-DD)', 'Fecha Serv Hasta', 'Hasta', 'Serv Hasta']);
          const rawVto = getVal(['Fecha Vto Pago (YYYY-MM-DD)', 'Fecha Vto Pago', 'Vencimiento', 'Vto Pago', 'Vto']);

          const fDesde = normalizeDateToYMD(rawDesde, firstDayOfMonth);
          const fHasta = normalizeDateToYMD(rawHasta, lastDayOfMonth);
          const fVto = normalizeDateToYMD(rawVto, now);

          validRows.push({
            fila_origen: filaNum,
            tipo_comprobante: parseInt(cbteTipoRaw) || (config?.condicion_iva === 'monotributista' ? 11 : 6),
            concepto: parseInt(conceptoRaw) || 2,
            receptor_doc_tipo: parseInt(docTipoRaw) || 80,
            receptor_doc_nro: parseInt(docNroRaw) || 0,
            receptor_razon_social: razonSocial,
            receptor_condicion_iva: getVal(['Condicion IVA', 'Condición IVA', 'Condicion']) || 'Responsable Inscripto',
            receptor_domicilio: domicilio || null,
            jurisdiccion: jurisdiccionVal,
            descripcion: itemDesc,
            imp_neto: Number(subtotal.toFixed(2)),
            imp_iva: Number(ivaAmt.toFixed(2)),
            imp_total: Number(total.toFixed(2)),
            detalle_iva: detalleIva,
            items: [
              {
                descripcion: itemDesc,
                cantidad,
                precio_unitario: precioUnit,
                subtotal: Number(subtotal.toFixed(2)),
                iva_porcentaje: ivaPct,
              }
            ],
            fecha_serv_desde: fDesde,
            fecha_serv_hasta: fHasta,
            fecha_vto_pago: fVto,
          });
        });

        setParsedRows(validRows);
        setParseErrors(errors);
      } catch (err) {
        setParseErrors([`Error al procesar archivo Excel: ${err.message}`]);
      }
    };
    reader.readAsBinaryString(file);
  };

  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const handleEmitir = () => {
    if (parsedRows.length === 0) return;
    setShowConfirmModal(true);
  };

  const handleConfirmEmitir = async () => {
    setShowConfirmModal(false);
    const result = await onEmitirLote({
      nombre_archivo: fileName || 'facturacion_masiva.xlsx',
      facturas: parsedRows,
    });
    if (result) {
      setBatchResult(result);
      if (result.detalles && Array.isArray(result.detalles)) {
        const detallesMap = new Map();
        result.detalles.forEach(d => {
          detallesMap.set(d.fila, d);
        });
        const erroresMap = new Map();
        if (result.errores && Array.isArray(result.errores)) {
          result.errores.forEach(e => {
            erroresMap.set(e.fila, e);
          });
        }
        setParsedRows(prev => prev.map(r => ({
          ...r,
          resultado: detallesMap.get(r.fila_origen) || null,
          error_arca: erroresMap.get(r.fila_origen)?.error || null,
        })));
      }
    }
  };

  const totalMontoLote = parsedRows.reduce((acc, r) => acc + (parseFloat(r.imp_total) || 0), 0);

  return (
    <div className="space-y-6">
      {/* 1. Header & Actions */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-7 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-[#468DFF]" />
              Facturación Masiva desde Excel
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Emití decenas de facturas oficiales simultáneamente subiendo una planilla de cálculo con resguardo previo de datos.
            </p>
          </div>

          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="px-4 py-2 border border-[#468DFF] text-[#468DFF] bg-white hover:bg-blue-50/50 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <Download className="h-4 w-4" />
            Descargar Plantilla Excel
          </button>
        </div>

        {/* Upload Zone */}
        <div className="mt-5">
          <label className="relative border-2 border-dashed border-slate-300 hover:border-[#468DFF] bg-slate-50/50 hover:bg-blue-50/20 rounded-2xl p-6 sm:p-8 text-center transition-all flex flex-col items-center justify-center cursor-pointer group">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileUpload}
              className="sr-only"
            />
            <div className="p-3 bg-white rounded-2xl shadow-sm border border-slate-200 group-hover:scale-110 transition-transform mb-3">
              <Upload className="h-6 w-6 text-[#468DFF]" />
            </div>
            <span className="text-sm font-bold text-slate-800">
              {fileName ? fileName : 'Hacé clic o arrastrá tu planilla Excel aquí'}
            </span>
            <span className="text-xs text-slate-400 mt-1">
              Archivos compatibles: .xlsx, .xls, .csv (hasta 500 comprobantes por lote)
            </span>
          </label>
        </div>

        {/* Parse Errors Banner */}
        {parseErrors.length > 0 && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl space-y-1">
            <span className="text-xs font-bold text-red-700 flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4" /> Se detectaron advertencias en el archivo:
            </span>
            <ul className="list-disc list-inside text-xs text-red-600 space-y-0.5 pl-2">
              {parseErrors.slice(0, 5).map((err, i) => (
                <li key={i}>{err}</li>
              ))}
              {parseErrors.length > 5 && (
                <li>... y {parseErrors.length - 5} observaciones más.</li>
              )}
            </ul>
          </div>
        )}
      </div>

      {/* 2. Batch Result Summary Card (Métricas al tope) */}
      {batchResult && (
        <div className="bg-white border border-emerald-200 rounded-2xl p-5 sm:p-7 shadow-sm space-y-4 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-800">
                  Resultado del Procesamiento del Lote
                </h4>
                <p className="text-xs text-slate-500">
                  Archivo: <span className="font-mono font-semibold text-slate-700">{fileName}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {onNavigateToComprobantes && (
                <button
                  type="button"
                  onClick={onNavigateToComprobantes}
                  className="px-4 py-2 bg-[#468DFF] hover:bg-[#0511F2] text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-[#468DFF]/20 flex items-center gap-1.5 cursor-pointer"
                >
                  <Receipt className="h-4 w-4" />
                  Ver Comprobantes Emitidos
                </button>
              )}
              <button
                type="button"
                onClick={handleReset}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Cargar Otra Planilla
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-center">
              <span className="text-xs text-slate-500 block font-medium">Total Procesadas</span>
              <span className="text-xl font-extrabold text-slate-800">{batchResult.resumen?.total || 0}</span>
            </div>
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
              <span className="text-xs text-emerald-700 block font-bold">Autorizadas ✅</span>
              <span className="text-xl font-extrabold text-emerald-700">{batchResult.resumen?.exitosas || 0}</span>
            </div>
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-center">
              <span className="text-xs text-red-700 block font-bold">Rechazadas ❌</span>
              <span className="text-xl font-extrabold text-red-700">{batchResult.resumen?.fallidas || 0}</span>
            </div>
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-center">
              <span className="text-xs text-amber-700 block font-bold">Pendientes Red ⚠️</span>
              <span className="text-xl font-extrabold text-amber-700">{batchResult.resumen?.pendientes || 0}</span>
            </div>
          </div>
        </div>
      )}

      {/* 3. Preview Table */}
      {parsedRows.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-7 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Eye className="h-4 w-4 text-[#468DFF]" />
                Vista Previa de Comprobantes ({parsedRows.length} filas detectadas)
              </h4>
              <span className="text-xs text-slate-500">
                {batchResult
                  ? 'El lote ya fue procesado en ARCA. Podés consultar el estado de cada fila.'
                  : 'Verificá que los datos y montos correspondan antes de enviar a ARCA.'}
              </span>
            </div>

            {batchResult ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3.5 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs">
                  <CheckCircle2 className="h-4 w-4" />
                  Lote Ya Emitido ({batchResult.resumen?.exitosas || 0} facturas)
                </span>
                {onNavigateToComprobantes && (
                  <button
                    type="button"
                    onClick={onNavigateToComprobantes}
                    className="px-4 py-2 bg-[#468DFF] hover:bg-[#0511F2] text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-[#468DFF]/20 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Receipt className="h-3.5 w-3.5" />
                    Ir a Comprobantes
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Nueva Carga
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleEmitir}
                disabled={isProcessingBatch || parseErrors.length > 0}
                className="px-6 py-2.5 bg-[#468DFF] text-white hover:bg-[#0511F2] rounded-xl text-xs font-bold transition-all shadow-md shadow-[#468DFF]/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                {isProcessingBatch ? 'Procesando Lote en ARCA...' : `Emitir ${parsedRows.length} Facturas`}
              </button>
            )}
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-xs text-left text-slate-700">
              <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Fila</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">CUIT / Doc</th>
                  <th className="px-4 py-3">Cliente / Razón Social</th>
                  <th className="px-4 py-3">Descripción</th>
                  <th className="px-4 py-3">Jurisdicción</th>
                  <th className="px-4 py-3">Período Serv.</th>
                  <th className="px-4 py-3 text-right">Neto ($)</th>
                  <th className="px-4 py-3 text-right">IVA ($)</th>
                  <th className="px-4 py-3 text-right">Total ($)</th>
                  {batchResult && <th className="px-4 py-3">Estado / CAE</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {parsedRows.map((r, i) => (
                  <tr key={i} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-2.5 font-bold text-slate-400">{r.fila_origen}</td>
                    <td className="px-4 py-2.5">
                      <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-blue-50 text-[#468DFF]">
                        {r.tipo_comprobante === 1 ? 'FA-A' : r.tipo_comprobante === 6 ? 'FA-B' : r.tipo_comprobante === 99 ? 'INT-X' : 'FA-C'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-mono">{r.receptor_doc_nro}</td>
                    <td className="px-4 py-2.5 font-semibold text-slate-800 truncate max-w-[160px]">{r.receptor_razon_social}</td>
                    <td className="px-4 py-2.5 text-slate-500 truncate max-w-[180px]">{r.descripcion}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      {r.jurisdiccion ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          {r.jurisdiccion}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-500 italic" title="Se resolverá automáticamente por el CUIT en la cartera de clientes de Gestión SySO">
                          Auto (por CUIT)
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <span className="text-[11px] font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                        {r.fecha_serv_desde} al {r.fecha_serv_hasta}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono">${r.imp_neto.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                    <td className="px-4 py-2.5 text-right font-mono">${r.imp_iva.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                    <td className="px-4 py-2.5 text-right font-bold text-slate-900 font-mono">${r.imp_total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                    {batchResult && (
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        {r.resultado?.cae ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            CAE: {r.resultado.cae}
                          </span>
                        ) : r.resultado?.tipo_comprobante === 99 ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-50 text-[#468DFF] border border-blue-200">
                            INT-{String(r.resultado.numero_comprobante || 1).padStart(8, '0')}
                          </span>
                        ) : r.error_arca ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-red-50 text-red-700 border border-red-200 block truncate max-w-[140px]" title={r.error_arca}>
                            {r.error_arca}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-500">
                            -
                          </span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de Confirmación para Facturación Masiva */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-5 sm:p-6 space-y-4 animate-scale-up">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <div className="p-2 rounded-xl bg-blue-50 text-[#468DFF]">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm sm:text-base font-bold text-slate-800">
                  ¿Confirmar Emisión Masiva en ARCA?
                </h4>
                <p className="text-[11px] text-slate-400">
                  Revisá el resumen del lote antes de procesar comprobantes oficiales.
                </p>
              </div>
            </div>

            {/* Resumen del Lote */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs text-slate-700">
              <div className="flex justify-between">
                <span className="text-slate-500">Archivo de Origen:</span>
                <span className="font-mono font-semibold text-slate-800 truncate max-w-[200px]">{fileName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Cantidad de Comprobantes:</span>
                <span className="font-bold text-slate-900">{parsedRows.length} facturas</span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex justify-between items-baseline">
                <span className="font-bold text-slate-700">Monto Total del Lote:</span>
                <span className="text-base font-extrabold text-[#468DFF] font-mono">
                  ${totalMontoLote.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
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
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmEmitir}
                disabled={isProcessingBatch}
                className="px-5 py-2 text-xs font-bold text-white bg-[#468DFF] hover:bg-[#0511F2] rounded-xl shadow-md shadow-[#468DFF]/20 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Send className="h-3.5 w-3.5" />
                Confirmar Emisión Masiva
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
