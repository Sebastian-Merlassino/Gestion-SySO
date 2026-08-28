// src/app/privacidad/page.js
'use client';

import React from 'react';
import { ArrowLeft, Shield, Eye, Lock, Mail, Cpu } from 'lucide-react';

export default function PrivacidadPage() {
  return (
    <div className="min-h-screen bg-syso-bg text-slate-700 font-sans py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-[-20%] left-[-20%] w-[600px] h-[600px] rounded-full bg-[#468DFF]/5 blur-[180px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[600px] h-[600px] rounded-full bg-[#0511F2]/5 blur-[180px] pointer-events-none" />

      <div className="max-w-3xl mx-auto bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden z-10 relative">
        {/* Header */}
        <div className="bg-[#0D0D0D] p-8 text-white relative">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <img src="/brand/logo-primary.png" alt="Logo Gestión SySO" className="h-9 w-9 object-contain" />
              <div>
                <h1 className="font-outfit text-base font-extrabold tracking-tight">Gestión SySO</h1>
                <p className="text-white/60 text-[10px] font-semibold">Política de Privacidad</p>
              </div>
            </div>
            <a href="/login" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all active:scale-[0.98]">
              <ArrowLeft className="h-3.5 w-3.5" />
              Volver al Login
            </a>
          </div>
        </div>

        {/* Content */}
        <div className="p-8 sm:p-10 space-y-8">
          <div className="border-b border-slate-100 pb-4">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Última actualización: 28 de Agosto de 2026</p>
          </div>

          <section className="space-y-3">
            <h2 className="font-outfit text-base font-bold text-slate-900 flex items-center gap-2">
              <Shield className="h-4 w-4 text-[#468DFF] shrink-0" />
              1. Compromiso de Confidencialidad y Seguridad
            </h2>
            <p className="text-xs leading-relaxed text-slate-655">
              En **Gestión SySO**, valoramos la privacidad de nuestros usuarios y clientes. Esta Política de Privacidad describe cómo recopilamos, utilizamos, protegemos y compartimos sus datos personales e información técnica en el contexto de nuestra plataforma SaaS de Gestión de Higiene y Seguridad Laboral y Facturación Electrónica. Al registrar una cuenta y utilizar el Servicio, usted acepta las prácticas descritas en este documento.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-outfit text-base font-bold text-slate-900 flex items-center gap-2">
              <Eye className="h-4 w-4 text-[#468DFF] shrink-0" />
              2. Datos que Recopilamos
            </h2>
            <p className="text-xs leading-relaxed text-slate-655">
              Recopilamos la información estrictamente necesaria para proveer, asegurar y optimizar nuestro Servicio. Los datos se agrupan en las siguientes categorías:
            </p>
            <ul className="list-disc pl-5 text-xs text-slate-655 space-y-2">
              <li>
                **Datos de Cuenta e Incorporación (Onboarding)**: Nombre completo, correo electrónico, número de teléfono, CUIT, provincia, partido/localidad, fecha de nacimiento, matrículas profesionales (incluyendo imágenes del frente y dorso de las credenciales), firma ológrafa/digital y logotipos de la consultora.
              </li>
              <li>
                **Datos Operativos del Tenant**: Información de empresas clientes del profesional, nómina de empleados, actas de capacitación, programa de capacitación anual, capacitaciones online, protocolos de medición y estudios técnicos (Iluminación Res. 84/12, Ruido Res. 85/12, Ergonomía Res. SRT 886/15, Puesta a Tierra Res. SRT 900/15), inspecciones de extintores, auditorías de control eléctrico, avisos de riesgo, registros de accidentes y acciones correctivas.
              </li>
              <li>
                **Credenciales Fiscales y Facturación Electrónica ARCA**: Certificados Digitales X.509 (.crt), Claves Privadas RSA (.key), Puntos de Venta y registros de comprobantes emitidos con CAE oficial para la interacción con los Web Services de ARCA.
              </li>
              <li>
                **Datos de Facturación Comercial**: Identificadores de transacciones de pago, estado de suscripciones y cupones de descuento procesados mediante Mercado Pago (no almacenamos directamente los datos de tarjetas de crédito o débito).
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="font-outfit text-base font-bold text-slate-900 flex items-center gap-2">
              <Lock className="h-4 w-4 text-[#468DFF] shrink-0" />
              3. Aislamiento Multi-Tenant y Seguridad de los Datos
            </h2>
            <p className="text-xs leading-relaxed text-slate-655">
              Nuestra base de datos en Supabase está estructurada bajo una arquitectura **multi-tenant**. Aplicamos políticas estrictas de seguridad a nivel de fila (**Row Level Security - RLS**) en PostgreSQL, lo que garantiza de manera absoluta que la información registrada por un profesional u organización esté lógicamente aislada y no pueda ser accedida, modificada ni visualizada por ningún otro usuario de la Plataforma.
            </p>
            <p className="text-xs leading-relaxed text-slate-655">
              Toda comunicación de datos se realiza cifrada a través de protocolos seguros HTTPS/TLS. Se efectúan controles preventivos contra suplantación de identidad (IDOR) y rate-limiting por dirección IP para evitar abusos o denegación de servicios.
            </p>
          </section>

          <section className="space-y-3 p-4 bg-blue-50/50 border border-blue-100 rounded-2xl">
            <h2 className="font-outfit text-base font-bold text-slate-900 flex items-center gap-2">
              <Cpu className="h-4 w-4 text-[#468DFF] shrink-0" />
              4. Tratamiento de Inteligencia Artificial (Google Gemini y Asistente de Voz)
            </h2>
            <p className="text-xs leading-relaxed text-slate-655 font-medium">
              Gestión SySO incluye características avanzadas de dictado por voz y optimización de textos a través del componente unificado **`SySO-AI-Voice-Helper`**, diseñado para facilitar el dictado por voz y el refinamiento técnico de observaciones de campo y recomendaciones de higiene y seguridad laboral mediante modelos de Inteligencia Artificial (Google Gemini).
            </p>
            <p className="text-xs leading-relaxed text-slate-655">
              Al hacer uso del dictado o presionar el botón de pulido con IA, usted consiente que el fragmento de texto redactado sea procesado por las APIs de lenguaje del proveedor de IA bajo las siguientes garantías de confidencialidad:
            </p>
            <ul className="list-disc pl-5 text-xs text-slate-655 space-y-1.5 mt-1">
              <li>
                **Cifrado y Seguridad**: Todas las comunicaciones y solicitudes viajan a través de canales estrictamente cifrados en tránsito mediante protocolos seguros (HTTPS/TLS).
              </li>
              <li>
                **No Entrenamiento de Modelos Públicos**: La información procesada **no se utiliza para entrenar modelos públicos de IA** ni es compartida con terceros con fines publicitarios o comerciales.
              </li>
              <li>
                **Ámbito Estrictamente Técnico**: El procesamiento se acota exclusivamente a la mejora sintáctica, ortográfica y terminológica de observaciones técnicas. No se recopilan ni envían a la IA datos médicos sensibles, credenciales de acceso ni información confidencial no relacionada.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="font-outfit text-base font-bold text-slate-900 flex items-center gap-2">
              <Shield className="h-4 w-4 text-[#468DFF] shrink-0" />
              5. Seguridad de Certificados Digitales y Datos Fiscales ARCA
            </h2>
            <p className="text-xs leading-relaxed text-slate-655">
              Los Certificados Digitales (`.crt`) y Claves Privadas (`.key`) cargados por el Usuario para la facturación electrónica son resguardados de forma estrictamente privada y confidencial:
            </p>
            <ul className="list-disc pl-5 text-xs text-slate-655 space-y-1.5 mt-1">
              <li>
                **Uso Exclusivo para Firma Fiscal**: Las credenciales se utilizan **única y exclusivamente** en el backend para la generación de Tickets de Acceso (TRA) firmados con PKCS#7 / CMS dirigidos a los Web Services de ARCA (WSAA).
              </li>
              <li>
                **Aislamiento y Confidencialidad**: Las claves privadas nunca son expuestas públicamente ni compartidas con terceros. El acceso a los registros fiscales está restringido de forma absoluta a los administradores del Tenant correspondiente mediante RLS.
              </li>
              <li>
                **Destrucción Segura**: En caso de que el Usuario decida renovar o eliminar su configuración fiscal, las credenciales previas son sobrescritas o eliminadas de manera definitiva del almacenamiento seguro.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="font-outfit text-base font-bold text-slate-900 flex items-center gap-2">
              <span className="text-[#468DFF] font-bold font-outfit">6.</span>
              Derechos del Usuario (Acceso, Rectificación y Supresión)
            </h2>
            <p className="text-xs leading-relaxed text-slate-655">
              Usted tiene derecho a acceder a sus datos personales guardados en la Plataforma, rectificarlos cuando sean incorrectos, y solicitar la baja o eliminación de su cuenta. 
            </p>
            <p className="text-xs leading-relaxed text-slate-655">
              *Nota operacional*: Para garantizar la integridad del sistema comercial y evitar fraudes o deudas pendientes, la auto-eliminación de la cuenta de organización (Tenant) está inhabilitada a través de la interfaz de usuario si el cliente posee suscripciones comerciales activas con Mercado Pago. En tales casos, se deberá tramitar la baja de la suscripción previamente o comunicarse con soporte técnico.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-outfit text-base font-bold text-slate-900 flex items-center gap-2">
              <span className="text-[#468DFF] font-bold font-outfit">7.</span>
              Retención de Datos
            </h2>
            <p className="text-xs leading-relaxed text-slate-655">
              Conservamos sus datos personales durante todo el tiempo que su cuenta permanezca activa. Si decide rescindir el contrato o solicitar la supresión de la cuenta, sus datos serán eliminados permanentemente de nuestros servidores en un plazo máximo de 30 días hábiles, exceptuando aquella información que estemos legalmente obligados a conservar para cumplir con regulaciones contables, impositivas o de auditoría estatal.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-outfit text-base font-bold text-slate-900 flex items-center gap-2">
              <Mail className="h-4 w-4 text-[#468DFF] shrink-0" />
              8. Contacto para Consultas de Privacidad
            </h2>
            <p className="text-xs leading-relaxed text-slate-655">
              Si tiene preguntas, objeciones o sugerencias sobre el tratamiento de sus datos o sobre el uso de la Inteligencia Artificial en la plataforma, por favor envíe un correo electrónico a nuestro oficial de privacidad:
            </p>
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <p className="text-xs font-bold text-slate-900">Oficial de Privacidad y Soporte</p>
                <p className="text-[10px] text-slate-500">Gestión SySO - Seguridad y Transparencia</p>
              </div>
              <a href="mailto:soporte@gestionsyso.com" className="text-xs font-bold text-[#468DFF] hover:text-[#0511F2] transition-colors">
                soporte@gestionsyso.com
              </a>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 p-6 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 text-center sm:text-left">
          <p className="text-[10px] text-slate-400 font-medium">
            © 2026 Gestión SySO. Todos los derechos reservados.
          </p>
          <div className="flex gap-4">
            <a href="/terminos" className="text-[10px] text-slate-500 hover:text-[#468DFF] font-semibold transition-colors">
              Términos y Condiciones
            </a>
            <a href="/cookies" className="text-[10px] text-slate-500 hover:text-[#468DFF] font-semibold transition-colors">
              Política de Cookies
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
