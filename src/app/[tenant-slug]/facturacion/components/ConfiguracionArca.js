// src/app/[tenant-slug]/facturacion/components/ConfiguracionArca.js
// Panel de Configuración de Datos Fiscales y Certificados ARCA (Exclusivo Producción)
'use client';

import { useState, useEffect } from 'react';
import { 
  Building2, 
  Key, 
  Upload, 
  Plug, 
  CheckCircle2, 
  AlertTriangle, 
  Save, 
  FileCheck,
  Download,
  Info
} from 'lucide-react';
import AppDatePicker from '@/components/ui/AppDatePicker';

export default function ConfiguracionArca({
  config,
  tenant,
  profile,
  onSaveFiscal,
  onUploadCerts,
  onTestConnection,
  testingConnection,
  savingConfig
}) {
  const [formData, setFormData] = useState({
    cuit: '',
    razon_social: '',
    nombre_fantasia: '',
    condicion_iva: 'monotributista',
    punto_venta: 1,
    domicilio_comercial: '',
    inicio_actividades: '',
    ingresos_brutos: '',
    environment: 'produccion',
  });

  const [certFile, setCertFile] = useState(null);
  const [keyFile, setKeyFile] = useState(null);
  const [uploadingCerts, setUploadingCerts] = useState(false);
  const [generatingCsr, setGeneratingCsr] = useState(false);
  const [generatedCsrData, setGeneratedCsrData] = useState(null);

  useEffect(() => {
    if (config) {
      setFormData({
        cuit: config.cuit ? String(config.cuit) : '',
        razon_social: config.razon_social || '',
        nombre_fantasia: config.nombre_fantasia || tenant?.name || '',
        condicion_iva: config.condicion_iva || 'monotributista',
        punto_venta: config.punto_venta || 1,
        domicilio_comercial: config.domicilio_comercial || '',
        inicio_actividades: config.inicio_actividades || '',
        ingresos_brutos: config.ingresos_brutos || '',
        environment: 'produccion',
      });
    } else {
      // Pre-cargar datos del tenant o perfil si existen
      const prefillCuit = tenant?.cuit || profile?.cuit || '';
      const prefillLegalName = profile?.full_name || '';
      const prefillBrandName = tenant?.name || 'Gestión SySO';
      setFormData(prev => ({
        ...prev,
        cuit: prev.cuit || (prefillCuit ? String(prefillCuit) : ''),
        razon_social: prev.razon_social || prefillLegalName || '',
        nombre_fantasia: prev.nombre_fantasia || prefillBrandName || '',
        environment: 'produccion',
      }));
    }
  }, [config, tenant, profile]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmitFiscal = async (e) => {
    e.preventDefault();
    const payload = {
      ...formData,
      cuit: parseInt(formData.cuit.replace(/[^0-9]/g, '')),
      punto_venta: parseInt(formData.punto_venta),
      environment: 'produccion',
    };
    await onSaveFiscal(payload);
  };

  const handleUploadCerts = async (e) => {
    e.preventDefault();
    if (!certFile && !keyFile) return;
    setUploadingCerts(true);
    try {
      await onUploadCerts({ certFile, keyFile });
      setCertFile(null);
      setKeyFile(null);
    } finally {
      setUploadingCerts(false);
    }
  };

  /**
   * Generación automática de CSR y Clave Privada en el frontend
   */
  const handleGenerateCsr = async () => {
    if (!formData.cuit || !formData.razon_social) {
      alert('Por favor ingresá tu CUIT y Razón Social antes de generar el CSR.');
      return;
    }

    setGeneratingCsr(true);
    try {
      const res = await fetch('/api/facturacion/generar-csr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cuit: formData.cuit,
          razon_social: formData.razon_social,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al generar CSR');

      setGeneratedCsrData(data);

      // Auto-descargar el archivo .csr
      downloadBlob(data.csr, data.csr_filename, 'application/pkcs10');

      // Auto-descargar la clave privada .key
      setTimeout(() => {
        downloadBlob(data.key, data.key_filename, 'application/x-pem-file');
      }, 700);

    } catch (err) {
      console.error('Error generando CSR:', err);
      alert(`Error: ${err.message}`);
    } finally {
      setGeneratingCsr(false);
    }
  };

  const downloadBlob = (content, filename, contentType) => {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* 1. Datos Fiscales Card */}
      <form 
        onSubmit={handleSubmitFiscal} 
        id="datos-fiscales-form"
        className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-7 shadow-sm scroll-mt-6"
      >
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 text-[#468DFF]">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">
                1. Datos Fiscales del Titular / Emisor
              </h3>
              <p className="text-xs text-slate-500">
                Información de tu constancia de inscripción en ARCA (AFIP).
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              CUIT del Titular / Emisor *
            </label>
            <input
              id="cuit-input"
              type="text"
              name="cuit"
              required
              placeholder="Ej: 20123456789"
              value={formData.cuit}
              onChange={handleChange}
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#468DFF] transition-all font-mono"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">11 dígitos sin guiones ni espacios</span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Razón Social o Nombre Legal Fiscal *
            </label>
            <input
              type="text"
              name="razon_social"
              required
              placeholder="Ej: Consultora SySO S.A. o Pérez Juan Carlos"
              value={formData.razon_social}
              onChange={handleChange}
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#468DFF] transition-all"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">Tal cual figura en tu constancia ARCA</span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Nombre Fantasía / Marca Comercial
            </label>
            <input
              type="text"
              name="nombre_fantasia"
              placeholder="Ej: Gestión SySO"
              value={formData.nombre_fantasia}
              onChange={handleChange}
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#468DFF] transition-all"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">Opcional (se muestra en encabezado de PDF)</span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Condición frente al IVA *
            </label>
            <select
              name="condicion_iva"
              value={formData.condicion_iva}
              onChange={handleChange}
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#468DFF] transition-all"
            >
              <option value="monotributista">Responsable Monotributo</option>
              <option value="responsable_inscripto">IVA Responsable Inscripto</option>
              <option value="exento">IVA Exento</option>
            </select>
            <span className="text-[10px] text-slate-400 mt-1 block">Determina el tipo de comprobante (A, B, C)</span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Punto de Venta Web Service *
            </label>
            <input
              type="number"
              name="punto_venta"
              required
              min="1"
              max="99999"
              placeholder="Ej: 5"
              value={formData.punto_venta}
              onChange={handleChange}
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#468DFF] transition-all font-mono"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">Tipo "Facturación Electrónica - Web Services" en ARCA</span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Ingresos Brutos (IIBB)
            </label>
            <input
              type="text"
              name="ingresos_brutos"
              placeholder="Ej: 0 o N° de Inscripción / CUIT"
              value={formData.ingresos_brutos}
              onChange={handleChange}
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#468DFF] transition-all"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">0 / Exento o N° CUIT / Padrón</span>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Domicilio Comercial *
            </label>
            <input
              type="text"
              name="domicilio_comercial"
              required
              placeholder="Ej: Lascano 6373, Capital Federal"
              value={formData.domicilio_comercial}
              onChange={handleChange}
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#468DFF] transition-all"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">Domicilio fiscal legal para el encabezado del comprobante</span>
          </div>

          <div>
            <AppDatePicker
              label="Inicio de Actividades"
              name="inicio_actividades"
              value={formData.inicio_actividades}
              onChange={(val) => {
                const finalVal = typeof val === 'string' ? val : val?.target?.value || '';
                setFormData((prev) => ({ ...prev, inicio_actividades: finalVal }));
              }}
              placeholder="DD/MM/AAAA"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">Fecha de alta en ARCA</span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-5 mt-5 border-t border-slate-100">
          <button
            type="submit"
            disabled={savingConfig}
            className="px-5 py-2.5 bg-[#468DFF] text-white rounded-xl text-xs font-bold hover:bg-[#0511F2] transition-all shadow-md shadow-[#468DFF]/20 flex items-center gap-2 cursor-pointer disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {savingConfig ? 'Guardando...' : 'Guardar Datos Fiscales'}
          </button>
        </div>
      </form>

      {/* 2. Generador de CSR y Clave Privada para ARCA */}
      <div id="csr-generator-section" className="bg-gradient-to-r from-blue-50/80 via-indigo-50/60 to-slate-50 border border-blue-200 rounded-2xl p-5 sm:p-6 shadow-xs scroll-mt-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-[#468DFF] text-white uppercase tracking-wider">
                Paso 2 • Solicitud de Certificado
              </span>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 font-outfit">
                Generador de Solicitud CSR (PKCS#10) para ARCA
              </h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">
              Generá tu archivo de solicitud <strong>CSR (.csr)</strong> con tu CUIT ({formData.cuit || 'sin ingresar'}) y tu <strong>Clave Privada (.key)</strong> en 1 solo clic para subirlo en el servicio <em>"Administración de Certificados Digitales"</em> de ARCA.
            </p>
          </div>

          <button
            type="button"
            onClick={handleGenerateCsr}
            disabled={generatingCsr}
            className="px-4 py-2.5 bg-[#468DFF] hover:bg-[#0511F2] text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-[#468DFF]/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 shrink-0"
          >
            <Key className="h-4 w-4" />
            <span>{generatingCsr ? 'Generando llaves...' : 'Generar CSR y Clave Privada'}</span>
          </button>
        </div>

        {/* Panel de descargas directas cuando ya se generaron */}
        {generatedCsrData && (
          <div className="mt-4 pt-4 border-t border-blue-200/80 space-y-3">
            <div className="flex items-center gap-2 text-emerald-800 text-xs font-bold">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>¡Archivos generados con éxito! Si tu navegador bloqueó la segunda descarga automática, hacé clic en los botones:</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-white/95 border border-blue-200 rounded-xl p-3 flex flex-col justify-between gap-2 shadow-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#468DFF] block">Paso A • Para subir a ARCA</span>
                  <span className="text-xs font-bold text-slate-800 font-mono block mt-0.5">{generatedCsrData.csr_filename}</span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">Archivo de Solicitud Digital CSR (PKCS#10)</span>
                </div>
                <button
                  type="button"
                  onClick={() => downloadBlob(generatedCsrData.csr, generatedCsrData.csr_filename, 'application/pkcs10')}
                  className="w-full py-2 px-3 bg-blue-50 hover:bg-blue-100 text-[#468DFF] border border-blue-200 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                >
                  <Download className="h-3.5 w-3.5" />
                  Descargar archivo .csr
                </button>
              </div>

              <div className="bg-white/95 border border-indigo-200 rounded-xl p-3 flex flex-col justify-between gap-2 shadow-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 block">Paso B • Para cargar en Paso 3</span>
                  <span className="text-xs font-bold text-slate-800 font-mono block mt-0.5">{generatedCsrData.key_filename}</span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">Clave Privada RSA 2048 bits (Guardala)</span>
                </div>
                <button
                  type="button"
                  onClick={() => downloadBlob(generatedCsrData.key, generatedCsrData.key_filename, 'application/x-pem-file')}
                  className="w-full py-2 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                >
                  <Download className="h-3.5 w-3.5" />
                  Descargar clave .key
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. Certificados Digitales Card */}
      <div id="certificados-section" className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-7 shadow-sm scroll-mt-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <Key className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">
                3. Certificados Digitales de ARCA
              </h3>
              <p className="text-xs text-slate-500">
                Carga tu certificado (.crt entregado por ARCA) y la clave privada (.key descargada en el Paso 2).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {config?.has_certificate && config?.has_private_key ? (
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" /> Certificados Activos
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5" /> Sin Certificados
              </span>
            )}
          </div>
        </div>

        <form onSubmit={handleUploadCerts} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* CRT File */}
            <div className="p-4 rounded-xl border border-dashed border-slate-300 bg-slate-50/50 hover:bg-blue-50/20 hover:border-[#468DFF] transition-all">
              <span className="block text-xs font-bold text-slate-700 mb-1">
                Certificado Digital (.crt / .pem)
              </span>
              <p className="text-[11px] text-slate-500 mb-3">
                Emitido por ARCA tras subir el archivo <code>.csr</code>.
              </p>
              <input
                type="file"
                accept=".crt,.pem"
                onChange={(e) => setCertFile(e.target.files?.[0] || null)}
                className="w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-[#468DFF] hover:file:bg-blue-100 cursor-pointer"
              />
              {config?.has_certificate && !certFile && (
                <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1 mt-2">
                  <FileCheck className="h-3.5 w-3.5" /> Certificado ya cargado en el servidor
                </span>
              )}
            </div>

            {/* KEY File */}
            <div className="p-4 rounded-xl border border-dashed border-slate-300 bg-slate-50/50 hover:bg-blue-50/20 hover:border-[#468DFF] transition-all">
              <span className="block text-xs font-bold text-slate-700 mb-1">
                Clave Privada (.key)
              </span>
              <p className="text-[11px] text-slate-500 mb-3">
                Clave privada <code>.key</code> descargada en el Paso 2.
              </p>
              <input
                type="file"
                accept=".key,.pem"
                onChange={(e) => setKeyFile(e.target.files?.[0] || null)}
                className="w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-[#468DFF] hover:file:bg-blue-100 cursor-pointer"
              />
              {config?.has_private_key && !keyFile && (
                <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1 mt-2">
                  <FileCheck className="h-3.5 w-3.5" /> Clave privada ya resguardada en Storage cifrado
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100">
            <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
              <Info className="h-4 w-4 text-[#468DFF] shrink-0" />
              <span>Los archivos se resguardan en un almacenamiento privado con cifrado seguro.</span>
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <button
                type="button"
                onClick={onTestConnection}
                disabled={testingConnection}
                className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60 flex-1 sm:flex-initial"
              >
                <Plug className="h-3.5 w-3.5 text-[#468DFF]" />
                {testingConnection ? 'Probando...' : '🔌 Probar Conexión'}
              </button>

              <button
                type="submit"
                disabled={uploadingCerts || (!certFile && !keyFile)}
                className="px-5 py-2 bg-[#468DFF] text-white rounded-xl text-xs font-bold hover:bg-[#0511F2] transition-all shadow-md shadow-[#468DFF]/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 flex-1 sm:flex-initial"
              >
                <Upload className="h-3.5 w-3.5" />
                {uploadingCerts ? 'Subiendo...' : 'Actualizar Certificados'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
