// src/app/layout.js
import './globals.css';
import Providers from './providers';

export const metadata = {
  title: 'Gestión SySO | App',
  description: 'Plataforma web integral para la gestión de Seguridad, Higiene y Salud Ocupacional. Centralizá clientes, inspecciones, informes y matrices de riesgo.',
  openGraph: {
    title: 'Gestión SySO | App',
    description: 'Plataforma web integral para la gestión de Seguridad, Higiene y Salud Ocupacional. Centralizá clientes, inspecciones, informes y matrices de riesgo.',
    url: 'https://app.gestionsyso.com',
    siteName: 'Gestión SySO',
    locale: 'es_AR',
    type: 'website',
  },
  icons: {
    icon: '/brand/favicon.ico',
    apple: '/brand/apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Gestión SySO',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" className="scroll-smooth">
      <head>
        {/* Enlace a Google Fonts para Outfit e Inter */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Outfit:wght@400;500;600;700;800&family=Audiowide&display=swap" rel="stylesheet" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="bg-background font-sans text-foreground antialiased selection:bg-slate-500/30">
        <Providers>
          <div className="relative flex min-h-screen flex-col">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
