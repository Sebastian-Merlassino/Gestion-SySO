// src/app/layout.js
import './globals.css';
import Providers from './providers';

export const metadata = {
  title: 'Gestión SySO | SaaS de Seguridad y Salud Ocupacional',
  description: 'Plataforma SaaS profesional para la gestión de seguridad, salud ocupacional e higiene industrial multi-tenant.',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" className="dark scroll-smooth">
      <head>
        {/* Enlace a Google Fonts para Outfit e Inter */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Outfit:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-screen bg-slate-950 font-sans text-slate-100 antialiased selection:bg-orange-500/30 selection:text-orange-200">
        <Providers>
          <div className="relative flex min-h-screen flex-col">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
