// src/app/admin/layout.js
'use client';

import React from 'react';
import Link from 'next/link';
import { useTheme } from '../providers';
import { 
  ShieldCheck, 
  ArrowLeft, 
  Sun, 
  Moon, 
  Activity,
  Layers,
  CreditCard,
  Building2
} from 'lucide-react';

export default function AdminLayout({ children }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="flex-1 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 border-b border-slate-200 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Left Brand and Badge */}
            <div className="flex items-center gap-3">
              <Link 
                href="/" 
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                title="Volver a la aplicación"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline font-medium">Volver a la App</span>
              </Link>

              <div className="h-5 w-px bg-slate-200 dark:bg-slate-800" />

              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white leading-tight">
                    Gestión SySO <span className="text-indigo-600 dark:text-indigo-400 text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 ml-1">SuperAdmin Console</span>
                  </h1>
                </div>
              </div>
            </div>

            {/* Right Tools */}
            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-400 text-xs font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Sistemas en Línea
              </div>

              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
                aria-label="Cambiar tema"
                title={`Cambiar a modo ${theme === 'dark' ? 'claro' : 'oscuro'}`}
              >
                {theme === 'dark' ? (
                  <Sun className="w-5 h-5 text-amber-400" />
                ) : (
                  <Moon className="w-5 h-5 text-slate-600" />
                )}
              </button>
            </div>

          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="admin-main max-w-7xl mx-auto w-full px-3 sm:px-6 lg:px-8 py-6 sm:py-8">
        {children}
      </main>
    </div>
  );
}
