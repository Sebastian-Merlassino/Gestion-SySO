// src/app/manifest.js
export default function manifest() {
  return {
    name: 'Gestión SySO',
    short_name: 'Gestión SySO',
    description: 'Plataforma SaaS de Higiene y Seguridad Ocupacional',
    start_url: '/',
    display: 'standalone',
    background_color: '#020617',
    theme_color: '#468DFF',
    icons: [
      {
        src: '/brand/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/brand/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
