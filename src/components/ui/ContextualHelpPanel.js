// src/components/ui/ContextualHelpPanel.js
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { 
  X, 
  HelpCircle, 
  Search, 
  BookOpen, 
  ChevronRight, 
  Sparkles, 
  ArrowLeft,
  Sliders,
  ExternalLink
} from 'lucide-react';
import { useContextualHelp } from '@/components/providers/ContextualHelpProvider';
import { getHelpArticle, searchHelpArticles } from '@/lib/helpContent';
import { cn } from '@/lib/utils';

export default function ContextualHelpPanel() {
  const { isOpen, activeHelpKey, activeSection, closeHelp, openHelp } = useContextualHelp();
  const pathname = usePathname();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const scrollContainerRef = useRef(null);

  // Obtener artículo activo según el helpKey o el pathname
  const currentArticle = getHelpArticle(activeHelpKey, pathname);
  const Icon = currentArticle.icon || HelpCircle;

  // Cerrar al presionar Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        closeHelp();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeHelp]);

  // Si se especifica una sección (anclaje), scrollear hasta ella suavemente
  useEffect(() => {
    if (isOpen && activeSection && scrollContainerRef.current) {
      setTimeout(() => {
        const element = document.getElementById(activeSection);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 150);
    }
  }, [isOpen, activeSection]);

  // Limpiar búsqueda al cambiar de artículo
  useEffect(() => {
    setSearchQuery('');
    setIsSearching(false);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [activeHelpKey, pathname]);

  const searchResults = searchQuery.trim() ? searchHelpArticles(searchQuery) : [];

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop oscuro translúcido para móviles */}
      <div 
        onClick={closeHelp}
        className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs md:hidden animate-fade-in"
        aria-hidden="true"
      />

      {/* Contenedor Slide-Over Panel */}
      <aside 
        className={cn(
          "fixed right-0 top-0 bottom-0 z-40 w-full sm:w-[420px] bg-white border-l border-slate-200 shadow-2xl flex flex-col transition-all duration-300 ease-out select-none",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-panel-title"
      >
        {/* Cabecera del Panel: Fondo Slate-900 Corporativo */}
        <header className="h-16 px-5 bg-slate-900 text-white flex items-center justify-between shrink-0 shadow-xs border-b border-slate-800">
          <div className="flex items-center gap-3 min-w-0 pr-2">
            <div className="p-2 bg-[#468DFF]/20 text-[#468DFF] rounded-xl border border-[#468DFF]/30 shrink-0">
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] uppercase font-bold text-[#468DFF] tracking-wider">
                  Instructivo In-App
                </span>
              </div>
              <h2 id="help-panel-title" className="font-outfit text-sm md:text-base font-bold text-white truncate leading-tight">
                {currentArticle.title}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={closeHelp}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#468DFF]/40"
            title="Cerrar panel de ayuda (Esc)"
            aria-label="Cerrar panel de ayuda"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        {/* Barra de Búsqueda Rápida de Temas */}
        <div className="p-3 bg-slate-50 border-b border-slate-200 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsSearching(Boolean(e.target.value.trim()));
              }}
              placeholder="Buscar en la guía o en otros módulos..."
              className="w-full pl-9 pr-8 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#468DFF] focus:border-transparent transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setIsSearching(false);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Cuerpo del Panel con Desplazamiento */}
        <div 
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto p-5 space-y-5 text-slate-600 scrollbar-thin select-text"
        >
          {isSearching ? (
            /* Vista de Resultados de Búsqueda */
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                <span className="text-xs font-bold text-slate-700">
                  Resultados encontrados ({searchResults.length})
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setIsSearching(false);
                  }}
                  className="text-xs text-[#468DFF] font-semibold hover:underline cursor-pointer flex items-center gap-1"
                >
                  <ArrowLeft className="h-3 w-3" />
                  Volver a la guía actual
                </button>
              </div>

              {searchResults.length === 0 ? (
                <div className="text-center py-8 space-y-2">
                  <HelpCircle className="h-8 w-8 text-slate-300 mx-auto" />
                  <p className="text-xs text-slate-500 font-medium">
                    No se encontraron temas para "{searchQuery}"
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {searchResults.map((art) => {
                    const ArtIcon = art.icon || BookOpen;
                    return (
                      <button
                        key={art.key}
                        type="button"
                        onClick={() => {
                          openHelp(art.key);
                          setSearchQuery('');
                          setIsSearching(false);
                        }}
                        className="w-full text-left p-3 rounded-xl border border-slate-200 bg-white hover:border-[#468DFF]/40 hover:bg-blue-50/40 transition-all flex items-center justify-between group cursor-pointer shadow-2xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="p-1.5 bg-[#468DFF]/10 text-[#468DFF] rounded-lg group-hover:bg-[#468DFF] group-hover:text-white transition-colors">
                            <ArtIcon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-900 group-hover:text-[#468DFF] transition-colors truncate">
                              {art.title}
                            </p>
                            {art.subtitle && (
                              <p className="text-[11px] text-slate-500 truncate font-normal">
                                {art.subtitle}
                              </p>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-[#468DFF] group-hover:translate-x-0.5 transition-all shrink-0" />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* Vista del Artículo de Ayuda Activo */
            <div>
              {typeof currentArticle.render === 'function' ? (
                currentArticle.render()
              ) : (
                <div className="text-xs text-slate-500">
                  Contenido en preparación para esta sección.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Pie del Panel */}
        <footer className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500 shrink-0">
          <span className="flex items-center gap-1">
            <Sparkles className="h-3.5 w-3.5 text-[#468DFF]" />
            Ayuda Contextual Gestión SySO
          </span>
          <button
            type="button"
            onClick={closeHelp}
            className="px-3.5 py-1.5 bg-[#468DFF] hover:bg-[#0511F2] text-white rounded-lg text-xs font-bold transition-all active:scale-[0.98] cursor-pointer shadow-2xs"
          >
            Entendido
          </button>
        </footer>
      </aside>
    </>
  );
}
