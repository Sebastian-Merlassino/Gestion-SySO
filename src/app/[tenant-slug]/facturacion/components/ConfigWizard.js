// src/app/[tenant-slug]/facturacion/components/ConfigWizard.js
'use strict';
import React, { useState } from 'react';
import {
  CheckCircle2,
  Circle,
  ExternalLink,
  ShieldCheck,
  FileText,
  Key,
  Plug,
  ArrowRight,
  ArrowLeft,
  AlertTriangle,
  HelpCircle,
  Building,
  Info
} from 'lucide-react';

export default function ConfigWizard({
  config,
  onOpenConfigTab,
  onTestConnection,
  testingConnection
}) {
  const [currentStep, setCurrentStep] = useState(1);

  const steps = [
    { number: 1, title: 'Datos Fiscales', icon: Building },
    { number: 2, title: 'Certificado ARCA', icon: Key },
    { number: 3, title: 'Asociación de Servicio', icon: ShieldCheck },
    { number: 4, title: 'Punto de Venta & Test', icon: Plug },
  ];

  const hasFiscalData = Boolean(config?.cuit && config?.razon_social && config?.condicion_iva);
  const hasCerts = Boolean(config?.has_certificate && config?.has_private_key);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-7 shadow-sm mb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-5 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-blue-50 text-[#468DFF] border border-blue-100">
              Guía Asistida
            </span>
            <h3 className="text-base sm:text-lg font-bold text-slate-800">
              Paso a Paso: Conexión con ARCA (ex AFIP)
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Seguí esta guía interactiva para habilitar la emisión de facturas electrónicas oficiales en tu cuenta.
          </p>
        </div>

        {/* Global Progress Indicator */}
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600">
          <span>Estado:</span>
          {hasFiscalData && hasCerts ? (
            <span className="flex items-center gap-1 text-emerald-600 font-bold">
              <CheckCircle2 className="h-3.5 w-3.5" /> Listo para Facturar
            </span>
          ) : (
            <span className="flex items-center gap-1 text-amber-600 font-bold">
              <AlertTriangle className="h-3.5 w-3.5" /> Configuración Pendiente
            </span>
          )}
        </div>
      </div>

      {/* Stepper Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 my-6">
        {steps.map((s) => {
          const Icon = s.icon;
          const isActive = currentStep === s.number;
          const isDone = currentStep > s.number;

          return (
            <button
              key={s.number}
              type="button"
              onClick={() => setCurrentStep(s.number)}
              className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all cursor-pointer ${
                isActive
                  ? 'border-[#468DFF] bg-blue-50/40 shadow-sm shadow-blue-500/5'
                  : isDone
                  ? 'border-emerald-200 bg-emerald-50/30 text-emerald-800'
                  : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
              }`}
            >
              <div
                className={`h-7 w-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                  isActive
                    ? 'bg-[#468DFF] text-white shadow-sm shadow-[#468DFF]/20'
                    : isDone
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                {isDone ? <CheckCircle2 className="h-4 w-4" /> : s.number}
              </div>
              <div className="min-w-0">
                <span className="block text-[11px] font-bold leading-tight truncate">
                  {s.title}
                </span>
                <span className="text-[10px] text-slate-400">
                  {isActive ? 'Paso actual' : isDone ? 'Completado' : 'Pendiente'}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Step Content */}
      <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-5 sm:p-6">
        {/* Step 1: Fiscal Data */}
        {currentStep === 1 && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-blue-100/70 text-[#468DFF] shrink-0 mt-0.5">
                <Building className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-800">
                  1. Cargar tus Datos Fiscales de Emisor
                </h4>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Ingresá tu CUIT, Razón Social o Nombre Profesional, Condición frente al IVA (Monotributista o Responsable Inscripto), Domicilio Comercial e Ingresos Brutos. Estos datos se imprimirán automáticamente en el encabezado oficial de cada factura emitida.
                </p>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2 text-xs text-slate-700">
              <p className="font-semibold text-slate-800">Requisitos:</p>
              <ul className="list-disc list-inside space-y-1 text-slate-600">
                <li>CUIT con clave fiscal nivel 3 o superior en ARCA.</li>
                <li>Estar inscripto en AFIP/ARCA en el régimen de Monotributo o IVA General.</li>
              </ul>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => onOpenConfigTab?.('datos-fiscales-form')}
                className="px-4 py-2 bg-[#468DFF] text-white rounded-xl text-xs font-bold hover:bg-[#0511F2] transition-colors shadow-sm shadow-[#468DFF]/20 cursor-pointer"
              >
                Completar Datos Fiscales Ahora →
              </button>
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="px-4 py-2 text-slate-600 hover:text-slate-900 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                Siguiente <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Digital Certificate (CSR & AFIP) */}
        {currentStep === 2 && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-blue-100/70 text-[#468DFF] shrink-0 mt-0.5">
                <Key className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-800">
                  2. Obtener el Certificado Digital en el Portal de ARCA
                </h4>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Para que Gestión SySO pueda comunicarse de forma segura con ARCA, se requiere un certificado digital X.509 (.crt) emitido por el organismo.
                </p>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 text-xs">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-[11px] text-slate-700">
                <strong>¿Qué es el CSR (PKCS#10) que te pide ARCA?</strong> Es un archivo de solicitud digital con tu CUIT y clave pública. Podés generarlo automáticamente con 1 clic en el botón <strong>"Generar CSR y Clave Privada"</strong> que está justo debajo en esta sección.
              </div>

              {/* Instrucciones Producción */}
              <div className="p-3 bg-slate-50 border border-emerald-200 rounded-xl space-y-2">
                <div className="flex items-center gap-1.5 text-emerald-800 font-bold text-xs">
                  <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                  <span>Pasos para obtener tu Certificado Digital (.crt):</span>
                </div>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-600 text-[11px]">
                  <li>
                    Ingresá con CUIT y Clave Fiscal en{' '}
                    <a
                      href="https://auth.afip.gob.ar/contribuyente/"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#468DFF] underline font-semibold inline-flex items-center gap-0.5"
                    >
                      Portal ARCA <ExternalLink className="h-2.5 w-2.5 inline" />
                    </a>
                  </li>
                  <li>Abrí el servicio <strong>"Administración de Certificados Digitales"</strong>.</li>
                  <li>Hacé clic en <strong>"Agregar Alias"</strong>, escribí <code className="bg-white px-1 py-0.5 rounded text-slate-700 font-mono">Gestión SySO</code> y subí el archivo <strong>.csr</strong> descargado.</li>
                  <li>Descargá el archivo <strong>.crt</strong> oficial emitido por ARCA para cargarlo en el Paso 4.</li>
                </ol>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="px-4 py-2 text-slate-600 hover:text-slate-900 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Anterior
              </button>
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="px-4 py-2 bg-[#468DFF] text-white rounded-xl text-xs font-bold hover:bg-[#0511F2] transition-colors cursor-pointer"
              >
                Siguiente: Asociar Servicio <ArrowRight className="h-3.5 w-3.5 inline ml-1" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Authorization Relation */}
        {currentStep === 3 && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-blue-100/70 text-[#468DFF] shrink-0 mt-0.5">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-800">
                  3. Asociar el Certificado al Web Service de Facturación
                </h4>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Autorizá a tu alias a operar con el servicio de Facturación Electrónica de ARCA (WSFE).
                </p>
              </div>
            </div>

            {/* Delegación en Producción */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2 text-xs text-slate-600">
              <span className="font-bold text-slate-800 block text-xs border-b pb-1.5 border-slate-100 flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                En ARCA &gt; Administrador de Relaciones de Clave Fiscal:
              </span>
              <ol className="list-decimal list-inside space-y-1.5 text-[11px]">
                <li>En ARCA, entrá al servicio <strong>"Administrador de Relaciones de Clave Fiscal"</strong>.</li>
                <li>Hacé clic en <strong>"Nueva Relación"</strong> &gt; <strong>"Buscar Servicio"</strong>.</li>
                <li>Seleccioná: <strong className="text-slate-800">ARCA &gt; WebServices &gt; "Facturación Electrónica" (WSFE)</strong>.</li>
                <li>En <em>Representante / Alias</em>, seleccioná el alias creado (<code className="bg-slate-100 px-1 py-0.5 rounded font-mono">Gestión SySO</code>).</li>
                <li>Confirmá la operación para vincular tu certificado con el servicio de facturación.</li>
              </ol>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="px-4 py-2 text-slate-600 hover:text-slate-900 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Anterior
              </button>
              <button
                type="button"
                onClick={() => setCurrentStep(4)}
                className="px-4 py-2 bg-[#468DFF] text-white rounded-xl text-xs font-bold hover:bg-[#0511F2] transition-colors cursor-pointer"
              >
                Siguiente: Punto de Venta & Conexión <ArrowRight className="h-3.5 w-3.5 inline ml-1" />
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Point of Sale & Connection Test */}
        {currentStep === 4 && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-blue-100/70 text-[#468DFF] shrink-0 mt-0.5">
                <Plug className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-800">
                  4. Habilitar Punto de Venta & Probar Conexión
                </h4>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Creá tu punto de venta Web Services en ARCA y probá la comunicación segura en vivo.
                </p>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2 text-xs text-slate-600">
              <p className="font-bold text-slate-800">En ARCA &gt; "Administración de Puntos de Venta y Domicilios":</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Agregar nuevo punto de venta.</li>
                <li>Seleccionar tipo: <strong className="text-slate-800">Factura Electrónica - Web Services</strong> (o Monotributo - Web Services).</li>
                <li>Anotar el número de punto de venta (ej: 1, 2, 5, etc.) y guardarlo en la sección de Configuración.</li>
              </ul>
            </div>

            {/* Test Action Card */}
            <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50/60 border border-blue-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-slate-800 block">
                  Probar Comunicación con ARCA
                </span>
                <span className="text-[11px] text-slate-500">
                  Verifica que los certificados y el punto de venta respondan correctamente sin emitir comprobantes reales.
                </span>
              </div>
              <button
                type="button"
                onClick={onTestConnection}
                disabled={testingConnection}
                className="px-4 py-2 bg-[#468DFF] text-white rounded-xl text-xs font-bold hover:bg-[#0511F2] transition-all shadow-sm shrink-0 flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
              >
                <Plug className="h-3.5 w-3.5" />
                {testingConnection ? 'Probando...' : '🔌 Probar Conexión'}
              </button>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="px-4 py-2 text-slate-600 hover:text-slate-900 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Anterior
              </button>
              <button
                type="button"
                onClick={onOpenConfigTab}
                className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-black transition-colors cursor-pointer"
              >
                Ir a Panel de Configuración Completo
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
