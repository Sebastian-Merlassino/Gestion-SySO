// src/components/ui/AppFormNavigator.js
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import AppUnsavedChangesDialog from './AppUnsavedChangesDialog';

export default function AppFormNavigator({
  activeList = [],
  currentId = null,
  onNavigate = null,
  hasUnsavedChanges = false,
  isFormOpen = false
}) {
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [pendingItem, setPendingItem] = useState(null);
  const [sidebarWidth, setSidebarWidth] = useState(0);

  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  // Detección dinámica del ancho de la barra lateral (Sidebar) para evitar superposición
  useEffect(() => {
    if (!isFormOpen) return;

    const updateSidebarWidth = () => {
      const asideEl = document.querySelector('aside.hidden.md\\:flex');
      if (asideEl && window.innerWidth >= 768) {
        setSidebarWidth(asideEl.getBoundingClientRect().width);
      } else {
        setSidebarWidth(0);
      }
    };

    // Ejecutar al montar
    updateSidebarWidth();

    // Observar cambios de clase en el Sidebar (cuando se contrae/expande)
    const asideEl = document.querySelector('aside.hidden.md\\:flex');
    let observer;
    if (asideEl) {
      observer = new MutationObserver(() => {
        updateSidebarWidth();
      });
      observer.observe(asideEl, { attributes: true, attributeFilter: ['class'] });
    }

    // Escuchar el evento de redimensionado de ventana
    window.addEventListener('resize', updateSidebarWidth);

    return () => {
      if (observer) observer.disconnect();
      window.removeEventListener('resize', updateSidebarWidth);
    };
  }, [isFormOpen]);

  // 1. Obtener índices y elementos adyacentes
  const currentIndex = activeList.findIndex(item => item.id === currentId);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < activeList.length - 1;

  const prevItem = hasPrev ? activeList[currentIndex - 1] : null;
  const nextItem = hasNext ? activeList[currentIndex + 1] : null;

  // 2. Manejo de navegación con verificación de cambios sin guardar
  const handleNavigationAttempt = (targetItem, e) => {
    if (!targetItem || !onNavigate) return;
    if (e && typeof e.stopPropagation === 'function') {
      e.stopPropagation();
    }

    if (hasUnsavedChanges) {
      setPendingItem(targetItem);
      setIsConfirmDialogOpen(true);
    } else {
      executeNavigation(targetItem);
    }
  };

  const executeNavigation = (targetItem) => {
    onNavigate(targetItem);
    // Reiniciar scroll vertical del contenedor del formulario
    setTimeout(() => {
      const scrollContainers = document.querySelectorAll('.overflow-auto, .overflow-y-auto, main');
      scrollContainers.forEach(container => {
        container.scrollTop = 0;
      });
    }, 50);
  };

  const handleConfirmLeave = () => {
    if (pendingItem) {
      executeNavigation(pendingItem);
      setPendingItem(null);
    }
  };

  // 3. Atajos de teclado (Flecha Izquierda y Derecha)
  useEffect(() => {
    if (!isFormOpen) return;

    const handleKeyDown = (e) => {
      // Evitar si el foco está en un input, textarea o editor
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.isContentEditable)
      ) {
        return;
      }

      if (e.key === 'ArrowLeft' && hasPrev) {
        e.preventDefault();
        handleNavigationAttempt(prevItem);
      } else if (e.key === 'ArrowRight' && hasNext) {
        e.preventDefault();
        handleNavigationAttempt(nextItem);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFormOpen, hasPrev, hasNext, prevItem, nextItem, hasUnsavedChanges]);

  // 4. Gestos Swipe (Táctil)
  useEffect(() => {
    if (!isFormOpen) return;

    const handleTouchStart = (e) => {
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
    };

    const handleTouchEnd = (e) => {
      if (!touchStartX.current || !touchStartY.current) return;

      const diffX = touchStartX.current - e.changedTouches[0].clientX;
      const diffY = touchStartY.current - e.changedTouches[0].clientY;

      // Detectar deslizamiento horizontal predominante y con un umbral mínimo de 75px
      if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 75) {
        if (diffX > 0 && hasNext) {
          // Deslizó hacia la izquierda -> ir al Siguiente
          handleNavigationAttempt(nextItem);
        } else if (diffX < 0 && hasPrev) {
          // Deslizó hacia la derecha -> ir al Anterior
          handleNavigationAttempt(prevItem);
        }
      }

      touchStartX.current = 0;
      touchStartY.current = 0;
    };

    window.addEventListener('touchstart', handleTouchStart);
    window.addEventListener('touchend', handleTouchEnd);
    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isFormOpen, hasPrev, hasNext, prevItem, nextItem, hasUnsavedChanges]);

  if (!isFormOpen) return null;

  return (
    <>
      {/* Botón flotante Anterior (Izquierda) - Visible en md+ */}
      {hasPrev && (
        <button
          type="button"
          onClick={(e) => handleNavigationAttempt(prevItem, e)}
          style={{ left: `${sidebarWidth + 24}px` }}
          className="fixed top-1/2 -translate-y-1/2 z-40 hidden md:flex items-center justify-center w-12 h-12 rounded-full border border-slate-200/50 bg-white/70 text-slate-700 hover:bg-[#468DFF] hover:text-white backdrop-blur-md shadow-lg transition-all duration-300 active:scale-95 group cursor-pointer"
          title="Anterior registro (Flecha Izquierda)"
        >
          <ChevronLeft className="h-6 w-6 transition-transform duration-300 group-hover:-translate-x-0.5" />
        </button>
      )}

      {/* Botón Móvil Anterior (Izquierda) - Solo flecha minimalista para móvil */}
      {hasPrev && (
        <button
          type="button"
          onClick={(e) => handleNavigationAttempt(prevItem, e)}
          className="fixed left-2 top-1/2 -translate-y-1/2 z-40 flex md:hidden items-center justify-center p-2 text-[#468DFF] active:scale-90 transition-all cursor-pointer opacity-75 active:opacity-100"
          title="Anterior registro"
        >
          <ChevronLeft className="h-8 w-8" />
        </button>
      )}

      {/* Botón flotante Siguiente (Derecha) - Visible en md+ */}
      {hasNext && (
        <button
          type="button"
          onClick={(e) => handleNavigationAttempt(nextItem, e)}
          className="fixed right-4 md:right-8 top-1/2 -translate-y-1/2 z-40 hidden md:flex items-center justify-center w-12 h-12 rounded-full border border-slate-200/50 bg-white/70 text-slate-700 hover:bg-[#468DFF] hover:text-white backdrop-blur-md shadow-lg transition-all duration-300 active:scale-95 group cursor-pointer"
          title="Siguiente registro (Flecha Derecha)"
        >
          <ChevronRight className="h-6 w-6 transition-transform duration-300 group-hover:translate-x-0.5" />
        </button>
      )}

      {/* Botón Móvil Siguiente (Derecha) - Solo flecha minimalista para móvil */}
      {hasNext && (
        <button
          type="button"
          onClick={(e) => handleNavigationAttempt(nextItem, e)}
          className="fixed right-2 top-1/2 -translate-y-1/2 z-40 flex md:hidden items-center justify-center p-2 text-[#468DFF] active:scale-90 transition-all cursor-pointer opacity-75 active:opacity-100"
          title="Siguiente registro"
        >
          <ChevronRight className="h-8 w-8" />
        </button>
      )}

      {/* Diálogo unificado de cambios sin guardar integrado */}
      <AppUnsavedChangesDialog
        open={isConfirmDialogOpen}
        onOpenChange={setIsConfirmDialogOpen}
        onLeave={handleConfirmLeave}
        title="Cambios sin guardar"
        description="Tenés cambios sin guardar. Si cambiás de registro ahora, perderás las modificaciones realizadas."
        leaveText="Navegar sin guardar"
        stayText="Quedarse en este registro"
      />
    </>
  );
}
