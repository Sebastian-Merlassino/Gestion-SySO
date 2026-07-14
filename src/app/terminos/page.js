// src/app/terminos/page.js
'use client';

import React from 'react';
import { ArrowLeft, BookOpen, ShieldCheck, Mail } from 'lucide-react';

export default function TerminosPage() {
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
                <p className="text-white/60 text-[10px] font-semibold">Términos y Condiciones de Uso</p>
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
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Última actualización: 14 de Julio de 2026</p>
          </div>

          <section className="space-y-3">
            <h2 className="font-outfit text-base font-bold text-slate-900 flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-[#468DFF] shrink-0" />
              1. Aceptación de los Términos
            </h2>
            <p className="text-xs leading-relaxed text-slate-655">
              Al acceder, registrarse o utilizar la plataforma **Gestión SySO** (en adelante, la "Plataforma" o el "Servicio"), usted (en adelante, el "Usuario" o el "Cliente") acepta quedar vinculado por los presentes Términos y Condiciones. Si no está de acuerdo con alguna de las disposiciones aquí establecidas, no deberá acceder ni utilizar los servicios de la Plataforma.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-outfit text-base font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-[#468DFF] shrink-0" />
              2. Descripción del Servicio y Licencia
            </h2>
            <p className="text-xs leading-relaxed text-slate-655">
              Gestión SySO es una solución informática en la nube (SaaS) destinada a la administración técnica, seguimiento y control de programas de higiene, seguridad y salud ocupacional laboral. Se otorga al Usuario una licencia no exclusiva, intransferible y revocable para utilizar el Servicio según el plan contratado. El Servicio se comercializa bajo un modelo multi-tenant que garantiza el aislamiento lógico de los datos de cada cliente u organización.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-outfit text-base font-bold text-slate-900 flex items-center gap-2">
              <span className="text-[#468DFF] font-bold font-outfit">3.</span>
              Registro y Uso de Cuentas
            </h2>
            <p className="text-xs leading-relaxed text-slate-655">
              El Usuario se compromete a aportar información verídica, exacta y actualizada durante el registro y los procesos de incorporación (*onboarding*). Es responsabilidad exclusiva del Usuario mantener la confidencialidad de sus claves de acceso. Cualquier actividad realizada bajo su cuenta se considerará ejecutada por el Usuario, quien asumirá toda responsabilidad legal derivada de ello. Queda prohibida la transferencia o préstamo de cuentas a terceros fuera de la organización asignada.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-outfit text-base font-bold text-slate-900 flex items-center gap-2">
              <span className="text-[#468DFF] font-bold font-outfit">4.</span>
              Planes, Límites y Facturación (Mercado Pago)
            </h2>
            <p className="text-xs leading-relaxed text-slate-655">
              La Plataforma ofrece un plan gratuito con límites de uso básicos y planes premium pagados de renovación mensual recurrente.
            </p>
            <ul className="list-disc pl-5 text-xs text-slate-655 space-y-2">
              <li>
                **Límites de Uso**: Cada plan comercial posee topes en la cantidad de empresas clientes que pueden cargarse en el sistema, número de inspectores/técnicos registrados y acceso a módulos avanzados (ej. Extintores, Control Eléctrico, Legajo Técnico, Checklists Personalizados).
              </li>
              <li>
                **Procesamiento de Pagos**: Las suscripciones se pagan mensualmente por adelantado mediante la pasarela segura de **Mercado Pago**. Al suscribirse, usted autoriza el cobro automático mensual recurrente.
              </li>
              <li>
                **Incumplimiento de Pago**: En caso de no poder procesarse el cargo, la cuenta podrá ser degradada automáticamente al plan gratuito ("Plan Free"), restringiendo el acceso a las funciones premium e inhabilitando la carga o visualización de información protegida, hasta que se regularice la situación.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="font-outfit text-base font-bold text-slate-900 flex items-center gap-2">
              <span className="text-[#468DFF] font-bold font-outfit">5.</span>
              Uso Responsable y Exención de Responsabilidad Laboral
            </h2>
            <p className="text-xs leading-relaxed text-slate-655">
              Gestión SySO proporciona herramientas de software para facilitar el registro de datos, control de extintores, constancias de visitas, programas anuales y auditorías. No obstante, **el Servicio no sustituye bajo ninguna circunstancia el criterio técnico, la consultoría, ni la auditoría profesional presencial exigida por las leyes nacionales de higiene y seguridad**.
            </p>
            <p className="text-xs leading-relaxed text-slate-655">
              La Plataforma y sus desarrolladores quedan eximidos de cualquier responsabilidad por accidentes laborales, siniestros, sanciones administrativas o multas estatales que sufran los clientes o sus empresas afiliadas, siendo responsabilidad exclusiva del Profesional SySO y de la dirección de la empresa cliente asegurar el cumplimiento de la normativa legal aplicable.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-outfit text-base font-bold text-slate-900 flex items-center gap-2">
              <span className="text-[#468DFF] font-bold font-outfit">6.</span>
              Uso de Herramientas de Inteligencia Artificial (IA)
            </h2>
            <p className="text-xs leading-relaxed text-slate-655">
              El Servicio integra el asistente de voz y pulido de textos técnicos por IA (`SySO-AI-Voice-Helper`). Al hacer uso de esta herramienta para dictar o autocompletar observaciones de riesgo, medidas preventivas o recomendaciones, el Usuario acepta que el audio o el texto ingresado será procesado de forma confidencial a través de modelos de lenguaje autorizados de terceros (como Google Gemini). Está estrictamente prohibido introducir información de carácter privado, datos médicos de personas identificables o secretos industriales de alta confidencialidad en los campos asistidos por IA.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-outfit text-base font-bold text-slate-900 flex items-center gap-2">
              <span className="text-[#468DFF] font-bold font-outfit">7.</span>
              Propiedad Intelectual y Modificaciones del Servicio
            </h2>
            <p className="text-xs leading-relaxed text-slate-655">
              Todos los derechos de propiedad intelectual sobre el código fuente, diseño, logotipos, base de datos y marca pertenecen a Gestión SySO. Nos reservamos el derecho de modificar, actualizar o interrumpir temporalmente el Servicio para realizar tareas de mantenimiento o mejoras técnicas con previo aviso siempre que sea posible.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-outfit text-base font-bold text-slate-900 flex items-center gap-2">
              <Mail className="h-4 w-4 text-[#468DFF] shrink-0" />
              8. Contacto
            </h2>
            <p className="text-xs leading-relaxed text-slate-655">
              Para consultas de soporte técnico, facturación, reportes de vulnerabilidad o dudas referentes a estos Términos, comuníquese de forma directa a nuestro correo electrónico oficial:
            </p>
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <p className="text-xs font-bold text-slate-900">Soporte Técnico Gestión SySO</p>
                <p className="text-[10px] text-slate-500">Atención a profesionales y administradores</p>
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
            <a href="/privacidad" className="text-[10px] text-slate-500 hover:text-[#468DFF] font-semibold transition-colors">
              Política de Privacidad
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
