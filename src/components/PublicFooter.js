// src/components/PublicFooter.js
'use client';

import React from 'react';
import Link from 'next/link';
import { Globe, Linkedin, Instagram, Facebook, Twitter, Mail } from 'lucide-react';

export default function PublicFooter() {
  return (
    <footer className="w-full bg-[#2F3033] border-t border-white/10 flex flex-col font-sans text-slate-300 text-xs z-10 shrink-0 select-none">
      {/* Fila 1 (Nivel Superior): 3 Columnas de igual ancho, contenido centrado */}
      <div className="px-6 py-6 sm:px-12 grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Fila 1 - Columna 1: Marca y Propósito */}
        <div className="flex flex-col items-center text-center gap-2 w-full">
          <div className="flex items-center gap-2">
            <img src="/brand/logo-primary.png" alt="Logo" className="h-6 w-6 object-contain" />
            <span className="text-sm font-extrabold tracking-tight">
              <span className="text-[#468DFF]" style={{ fontFamily: "'Virgo 01', 'Virgo01', 'Virgo', sans-serif" }}>GESTIÓN</span>
              <span className="text-white ml-1" style={{ fontFamily: "'Audiowide', sans-serif" }}>SySO</span>
            </span>
          </div>
          <p className="text-slate-400 text-[10px] leading-relaxed max-w-xs">
            Gestión SySO es la plataforma SaaS que centraliza la gestión de Seguridad, Higiene y Salud Ocupacional. Administre clientes, inspecciones, checklists, programas, accidentes, acciones correctivas y documentación técnica desde un único lugar.
          </p>
        </div>

        {/* Fila 1 - Columna 2: Políticas y Privacidad */}
        <div className="flex flex-col items-center text-center gap-2 w-full">
          <span className="text-white font-bold tracking-wider uppercase text-[10px] mb-0.5">
            Políticas y Privacidad
          </span>
          <div className="flex flex-col items-center gap-1.5 font-medium w-full max-w-[200px] text-[11px]">
            <Link
              href="/terminos"
              className="hover:text-[#468DFF] hover:underline transition-colors"
            >
              Términos y Condiciones
            </Link>
            <Link
              href="/privacidad"
              className="hover:text-[#468DFF] hover:underline transition-colors"
            >
              Política de Privacidad
            </Link>
            <Link
              href="/cookies"
              className="hover:text-[#468DFF] hover:underline transition-colors"
            >
              Política de Cookies
            </Link>
          </div>
        </div>

        {/* Fila 1 - Columna 3: Soporte Técnico */}
        <div className="flex flex-col items-center text-center gap-2 w-full">
          <span className="text-white font-bold tracking-wider uppercase text-[10px] mb-0.5">
            Soporte Técnico
          </span>
          <div className="flex flex-col items-center gap-2 font-medium w-full max-w-[240px] text-[11px]">
            <a
              href="mailto:soporte@gestionsyso.com"
              className="inline-flex items-center justify-center gap-2 text-slate-300 hover:text-white transition-colors w-full"
            >
              <Mail className="h-4 w-4 text-[#468DFF] shrink-0" />
              <span className="truncate">soporte@gestionsyso.com</span>
            </a>
          </div>
        </div>

      </div>

      {/* Fila 2 (Nivel Inferior): 3 Columnas de igual ancho, contenido centrado */}
      <div className="px-6 py-3.5 sm:px-12 grid grid-cols-1 md:grid-cols-3 gap-4 items-center text-center border-t border-white/10 w-full">
        
        {/* Fila 2 - Columna 1: Copyright */}
        <div className="flex items-center justify-center w-full">
          <p className="font-medium text-[11px] text-slate-400">
            © 2026 Gestión SySO. Todos los derechos reservados.
          </p>
        </div>

        {/* Fila 2 - Columna 2: Enlace Web Corporativo */}
        <div className="flex items-center justify-center w-full">
          <a
            href="https://gestionsyso.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-slate-400 hover:text-[#468DFF] font-semibold transition-colors"
          >
            <Globe className="h-3.5 w-3.5 text-[#468DFF]" />
            gestionsyso.com
          </a>
        </div>

        {/* Fila 2 - Columna 3: Redes Sociales oficiales */}
        <div className="flex items-center justify-center gap-3 w-full">
          <a
            href="https://www.linkedin.com/company/gestionsyso/"
            target="_blank"
            rel="noopener noreferrer"
            title="LinkedIn oficial de Gestión SySO"
            className="p-1.5 rounded-full bg-white/5 hover:bg-[#0077B5] hover:text-white transition-all text-slate-400 animate-hover"
          >
            <Linkedin className="h-3.5 w-3.5" />
          </a>
          <a
            href="https://www.instagram.com/gestionsyso/"
            target="_blank"
            rel="noopener noreferrer"
            title="Instagram oficial de Gestión SySO"
            className="p-1.5 rounded-full bg-white/5 hover:bg-[#E1306C] hover:text-white transition-all text-slate-400 animate-hover"
          >
            <Instagram className="h-3.5 w-3.5" />
          </a>
          <a
            href="https://www.facebook.com/GestionSySO/"
            target="_blank"
            rel="noopener noreferrer"
            title="Facebook oficial de Gestión SySO"
            className="p-1.5 rounded-full bg-white/5 hover:bg-[#1877F2] hover:text-white transition-all text-slate-400 animate-hover"
          >
            <Facebook className="h-3.5 w-3.5" />
          </a>
          <a
            href="https://x.com/Gestion_SySO"
            target="_blank"
            rel="noopener noreferrer"
            title="Twitter / X oficial de Gestión SySO"
            className="p-1.5 rounded-full bg-white/5 hover:bg-black hover:text-white transition-all text-slate-400 animate-hover"
          >
            <Twitter className="h-3.5 w-3.5" />
          </a>
        </div>

      </div>
    </footer>
  );
}
