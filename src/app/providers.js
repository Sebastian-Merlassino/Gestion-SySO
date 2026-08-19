// src/app/providers.js
'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { ToastProvider } from '../components/providers/ToastProvider';
import { PostHogProvider } from '../components/providers/PostHogProvider';

const ThemeContext = createContext({
  theme: 'light',
  toggleTheme: () => {},
});

export const useTheme = () => useContext(ThemeContext);

export default function Providers({ children }) {
  const [theme, setTheme] = useState('light');

  // Cargar tema persistido de localStorage al iniciar
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem('syso_theme');
      if (savedTheme === 'dark' || savedTheme === 'light') {
        setTheme(savedTheme);
        document.documentElement.classList.toggle('dark', savedTheme === 'dark');
      }
    } catch (err) {
      console.warn('[ThemeProvider] No se pudo leer localStorage:', err);
    }
  }, []);

  // Sincronizar clase dark en el elemento raíz (html) y registrar SW
  useEffect(() => {
    try {
      document.documentElement.classList.toggle('dark', theme === 'dark');
      localStorage.setItem('syso_theme', theme);
    } catch (err) {}
  }, [theme]);

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
        <PostHogProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </PostHogProvider>
      </div>
    </ThemeContext.Provider>
  );
}
