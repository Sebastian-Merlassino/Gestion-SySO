// src/app/cookies/page.js
'use client';

import React from 'react';
import { ArrowLeft, Cookie, ShieldCheck, HelpCircle, Mail } from 'lucide-react';

export default function CookiesPage() {
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
                <p className="text-white/60 text-[10px] font-semibold">Política de Cookies</p>
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
              <Cookie className="h-4 w-4 text-[#468DFF] shrink-0" />
              1. ¿Qué son las Cookies?
            </h2>
            <p className="text-xs leading-relaxed text-slate-655">
              Las cookies son pequeños archivos de texto que los sitios web o aplicaciones móviles descargan y almacenan en el navegador o dispositivo del usuario al acceder a ciertas páginas. Estos archivos permiten recordar información básica sobre la navegación del usuario para hacer la experiencia más eficiente, segura y fluida.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-outfit text-base font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-[#468DFF] shrink-0" />
              2. Cookies Usadas en la Plataforma
            </h2>
            <p className="text-xs leading-relaxed text-slate-655">
              En **Gestión SySO**, aplicamos una política de cookies estrictamente técnica. **No utilizamos cookies de rastreo publicitario ni compartimos perfiles de usuario con empresas comerciales de marketing de terceros.**
            </p>
            <p className="text-xs leading-relaxed text-slate-655">
              Las cookies que emplea la plataforma se dividen exclusivamente en las siguientes:
            </p>
            
            <div className="overflow-x-auto border border-slate-200 rounded-xl mt-4">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                  <tr>
                    <th className="p-3">Nombre / Tipo</th>
                    <th className="p-3">Proveedor / Origen</th>
                    <th className="p-3">Propósito y Función</th>
                    <th className="p-3">Duración</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-600">
                  <tr>
                    <td className="p-3 font-semibold text-slate-800">`sb-*` (Session / Auth)</td>
                    <td className="p-3">Supabase (`@supabase/ssr`)</td>
                    <td className="p-3">Identificar la sesión activa del usuario y validar el token JWT seguro para autorizar las solicitudes a base de datos.</td>
                    <td className="p-3">Sesión / Persistente</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold text-slate-800">`csrf-token` / Headers</td>
                    <td className="p-3">Gestión SySO (Servidor)</td>
                    <td className="p-3">Frenar peticiones de origen cruzado no autorizadas y evitar ataques de falsificación de solicitud en sitios cruzados.</td>
                    <td className="p-3">Sesión</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold text-slate-800">`sessionStorage` (Caché local)</td>
                    <td className="p-3">Navegador del Cliente</td>
                    <td className="p-3">Guardar temporalmente el perfil de usuario del tenant y sus permisos de plan para optimizar la velocidad y eliminar el parpadeo de carga del Sidebar.</td>
                    <td className="p-3">Hasta cerrar pestaña</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="font-outfit text-base font-bold text-slate-900 flex items-center gap-2">
              <HelpCircle className="h-4 w-4 text-[#468DFF] shrink-0" />
              3. Gestión y Desactivación de Cookies
            </h2>
            <p className="text-xs leading-relaxed text-slate-655">
              Dado que las cookies que utilizamos son estrictamente necesarias para la autenticación de usuarios y el aislamiento multi-tenant de seguridad, **la desactivación de las mismas impedirá por completo el uso de la Plataforma**, imposibilitando el inicio de sesión y la navegación interna.
            </p>
            <p className="text-xs leading-relaxed text-slate-655">
              No obstante, si lo desea, puede configurar su navegador para bloquear o eliminar las cookies en cualquier momento. A continuación, se detallan los enlaces explicativos para los navegadores más habituales:
            </p>
            <ul className="list-disc pl-5 text-xs text-slate-655 space-y-1">
              <li><a href="https://support.google.com/chrome/answer/95647" target="_blank" className="text-[#468DFF] hover:underline">Google Chrome</a></li>
              <li><a href="https://support.mozilla.org/es/kb/habilitar-y-deshabilitar-cookies-sitios-web-rastrear-preferencias" target="_blank" className="text-[#468DFF] hover:underline">Mozilla Firefox</a></li>
              <li><a href="https://support.apple.com/es-es/guide/safari/sfri11471/mac" target="_blank" className="text-[#468DFF] hover:underline">Apple Safari</a></li>
              <li><a href="https://support.microsoft.com/es-es/microsoft-edge/eliminar-y-administrar-cookies-168dab11-0753-043d-7c16-ede5947fc64d" target="_blank" className="text-[#468DFF] hover:underline">Microsoft Edge</a></li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="font-outfit text-base font-bold text-slate-900 flex items-center gap-2">
              <Mail className="h-4 w-4 text-[#468DFF] shrink-0" />
              4. Contacto
            </h2>
            <p className="text-xs leading-relaxed text-slate-655">
              Si tiene dudas sobre nuestra política técnica de cookies o sobre el resguardo de sesión, por favor envíe un correo electrónico a nuestro equipo de soporte técnico:
            </p>
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <p className="text-xs font-bold text-slate-900">Soporte Técnico Gestión SySO</p>
                <p className="text-[10px] text-slate-500">Gestión de sesión y accesibilidad segura</p>
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
            <a href="/privacidad" className="text-[10px] text-slate-500 hover:text-[#468DFF] font-semibold transition-colors">
              Política de Privacidad
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
