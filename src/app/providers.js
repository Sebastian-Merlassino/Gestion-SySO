// src/app/providers.js
'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { ToastProvider } from '../components/providers/ToastProvider';

const ThemeContext = createContext({
  theme: 'dark',
  toggleTheme: () => {},
});

export const useTheme = () => useContext(ThemeContext);

export default function Providers({ children }) {
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js')
        .then((reg) => {
          console.log('Service Worker registrado con éxito:', reg.scope);
        })
        .catch((err) => {
          console.error('Error al registrar el Service Worker:', err);
        });
    }
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <div className={theme === 'dark' ? 'dark' : ''}>
        <ToastProvider>
          {children}
        </ToastProvider>
      </div>
    </ThemeContext.Provider>
  );
}
