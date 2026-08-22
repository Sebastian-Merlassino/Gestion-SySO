// src/components/providers/ContextualHelpProvider.js
'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import ContextualHelpPanel from '@/components/ui/ContextualHelpPanel';

const ContextualHelpContext = createContext({
  isOpen: false,
  activeHelpKey: null,
  activeSection: null,
  openHelp: (helpKey, section) => {},
  closeHelp: () => {},
  toggleHelp: (helpKey) => {},
  setHelpKey: (helpKey) => {},
});

export const useContextualHelp = () => {
  const context = useContext(ContextualHelpContext);
  if (!context) {
    throw new Error('useContextualHelp debe utilizarse dentro de un ContextualHelpProvider');
  }
  return context;
};

export function ContextualHelpProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeHelpKey, setActiveHelpKey] = useState(null);
  const [activeSection, setActiveSection] = useState(null);

  const openHelp = useCallback((helpKey = null, section = null) => {
    if (helpKey) {
      setActiveHelpKey(helpKey);
    }
    setActiveSection(section);
    setIsOpen(true);
  }, []);

  const closeHelp = useCallback(() => {
    setIsOpen(false);
    setActiveSection(null);
  }, []);

  const toggleHelp = useCallback((helpKey = null) => {
    setIsOpen((prev) => {
      if (!prev && helpKey) {
        setActiveHelpKey(helpKey);
      }
      return !prev;
    });
  }, []);

  const setHelpKey = useCallback((helpKey) => {
    setActiveHelpKey(helpKey);
  }, []);

  return (
    <ContextualHelpContext.Provider
      value={{
        isOpen,
        activeHelpKey,
        activeSection,
        openHelp,
        closeHelp,
        toggleHelp,
        setHelpKey,
      }}
    >
      {children}
      <ContextualHelpPanel />
    </ContextualHelpContext.Provider>
  );
}
