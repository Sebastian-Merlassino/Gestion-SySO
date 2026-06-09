// src/app/page.js
'use client';

import React from 'react';

export default function HomePage() {
  return (
    <div className="flex-1 bg-slate-950 text-slate-100 flex flex-col relative overflow-hidden font-sans">
      {/* Background gradients */}
      <div className="absolute top-[-10%] left-[-20%] w-[600px] h-[600px] rounded-full bg-orange-600/10 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-20%] w-[600px] h-[600px] rounded-full bg-blue-600/10 blur-[150px] pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-900 bg-slate-950/80 backdrop-blur-md">
        <div className="container mx-auto max-w-7xl flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center font-bold text-slate-950 text-lg shadow-lg shadow-orange-500/20">
              S
            </div>
            <span className="font-outfit text-xl font-bold tracking-tight bg-gradient-to-r from-slate-50 to-slate-300 bg-clip-text text-transparent">
              Gestión <span className="text-orange-500">SySO</span>
            </span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-400">
            <a href="#features" className="hover:text-slate-100 transition-colors">Características</a>
            <a href="#flows" className="hover:text-slate-100 transition-colors">Flujos</a>
            <a href="#security" className="hover:text-slate-100 transition-colors">Seguridad RLS</a>
          </nav>
          <div className="flex items-center gap-4">
            <a 
              href="/login" 
              className="text-sm font-semibold text-slate-300 hover:text-slate-100 px-4 py-2 rounded-md hover:bg-slate-900 transition-all duration-200"
            >
              Iniciar Sesión
            </a>
            <a 
              href="/onboarding" 
              className="text-sm font-semibold bg-gradient-to-r from-orange-500 to-amber-500 text-slate-950 px-4 py-2 rounded-md hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-orange-500/20"
            >
              Probar Demo
            </a>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-20 pb-16 md:pt-32 md:pb-24 flex flex-col items-center justify-center px-6 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-orange-500/30 bg-orange-950/20 text-orange-400 text-xs font-semibold mb-6 animate-pulse">
          <span>🚀 Setup Inicial SaaS Multi-tenant</span>
        </div>
        
        <h1 className="font-outfit text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight max-w-4xl leading-tight">
          La plataforma inteligente para <br />
          <span className="bg-gradient-to-r from-orange-500 via-amber-500 to-orange-400 bg-clip-text text-transparent">
            Seguridad e Higiene Industrial
          </span>
        </h1>

        <p className="mt-6 text-base sm:text-lg md:text-xl text-slate-400 max-w-2xl leading-relaxed">
          Digitalizá inspecciones, monitoreá desvíos en tiempo real y gestioná el cumplimiento normativo con aislamiento de datos absoluto para cada empresa.
        </p>

        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <a 
            href="#features" 
            className="px-6 py-3 rounded-lg font-semibold bg-gradient-to-r from-orange-500 to-amber-500 text-slate-950 hover:shadow-lg hover:shadow-orange-500/20 transition-all duration-200 active:scale-95"
          >
            Comenzar Exploración
          </a>
          <a 
            href="https://github.com/Sebastian-Merlassino/Gestion-SySO" 
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3 rounded-lg font-semibold border border-slate-800 bg-slate-900/50 hover:bg-slate-900 hover:border-slate-700 transition-all duration-200"
          >
            Ver Repositorio
          </a>
        </div>

        {/* Mock Screen Showcase */}
        <div className="mt-16 w-full max-w-5xl rounded-xl border border-slate-800 bg-slate-900/40 p-2 backdrop-blur-sm shadow-2xl">
          <div className="aspect-[16/9] w-full rounded-lg bg-slate-950 relative overflow-hidden flex items-center justify-center border border-slate-800">
            <img 
              src="/assets/placeholder_hero.png" 
              alt="Dashboard Preview de Gestión SySO" 
              className="object-cover w-full h-full opacity-80"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent" />
            <div className="absolute bottom-8 left-8 right-8 flex flex-col md:flex-row md:items-end justify-between gap-4 text-left">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-orange-500">Módulo de Inspecciones</span>
                <h3 className="font-outfit text-xl font-bold mt-1">Checklists Digitales y Reportes Automatizados</h3>
                <p className="text-sm text-slate-400 mt-2 max-w-xl">
                  Acceso optimizado para dispositivos móviles en plantas industriales, obras de construcción y minería.
                </p>
              </div>
              <div className="flex gap-2">
                <span className="px-3 py-1 rounded bg-slate-900 text-slate-300 text-xs border border-slate-800">Next.js App Router</span>
                <span className="px-3 py-1 rounded bg-slate-900 text-slate-300 text-xs border border-slate-800">Supabase RLS</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-20 px-6 border-t border-slate-900 bg-slate-950 relative">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="font-outfit text-3xl font-bold tracking-tight">
              Diseñado para los Desafíos de Seguridad Modernos
            </h2>
            <p className="text-slate-400 mt-4">
              Uniendo potencia, accesibilidad y aislamiento multi-tenant estricto.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Card 1 */}
            <div className="group rounded-xl border border-slate-800/80 bg-slate-900/30 p-8 hover:border-orange-500/50 hover:bg-slate-900/60 transition-all duration-300">
              <div className="h-12 w-12 rounded-lg bg-orange-950/50 border border-orange-500/30 flex items-center justify-center text-orange-400 font-bold text-lg mb-6 group-hover:scale-110 transition-transform">
                🛡️
              </div>
              <h3 className="font-outfit text-xl font-bold text-slate-100">Seguridad Multi-tenant</h3>
              <p className="text-slate-400 text-sm mt-3 leading-relaxed">
                Aislamiento completo a nivel de base de datos gracias a Row Level Security (RLS) en Postgres. Un cliente jamás podrá ver datos de otro.
              </p>
            </div>

            {/* Card 2 */}
            <div className="group rounded-xl border border-slate-800/80 bg-slate-900/30 p-8 hover:border-orange-500/50 hover:bg-slate-900/60 transition-all duration-300">
              <div className="h-12 w-12 rounded-lg bg-orange-950/50 border border-orange-500/30 flex items-center justify-center text-orange-400 font-bold text-lg mb-6 group-hover:scale-110 transition-transform">
                📋
              </div>
              <h3 className="font-outfit text-xl font-bold text-slate-100">Checklists Inteligentes</h3>
              <p className="text-slate-400 text-sm mt-3 leading-relaxed">
                Ejecución móvil ágil en campo. Configuración dinámica según la legislación y normas vigentes en el país del tenant.
              </p>
            </div>

            {/* Card 3 */}
            <div className="group rounded-xl border border-slate-800/80 bg-slate-900/30 p-8 hover:border-orange-500/50 hover:bg-slate-900/60 transition-all duration-300">
              <div className="h-12 w-12 rounded-lg bg-orange-950/50 border border-orange-500/30 flex items-center justify-center text-orange-400 font-bold text-lg mb-6 group-hover:scale-110 transition-transform">
                📊
              </div>
              <h3 className="font-outfit text-xl font-bold text-slate-100">Métricas & Planes de Acción</h3>
              <p className="text-slate-400 text-sm mt-3 leading-relaxed">
                Asignación de plazos a desvíos y generación de informes de cumplimiento en PDF automatizados para los responsables del área.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-900 bg-slate-950 py-8 text-center text-xs text-slate-500 px-6">
        <p>© 2026 Gestión SySO. Todos los derechos reservados.</p>
        <p className="mt-2 text-slate-600">Implementación de Estructura de Setup Base - Next.js & Supabase</p>
      </footer>
    </div>
  );
}
