// src/lib/helpContent.js
import { HELP_ARTICLES, ALL_ARTICLES_LIST } from '@/content/help';
import { HelpCircle } from 'lucide-react';

/**
 * Mapea una ruta (pathname) al identificador `helpKey` más apropiado
 */
export function resolveHelpKeyFromPath(pathname) {
  if (!pathname) return 'dashboard';

  const cleanPath = pathname.toLowerCase();

  if (cleanPath.includes('/admin')) return 'admin';
  if (cleanPath.includes('/onboarding')) return 'onboarding';
  if (cleanPath.includes('/login')) return 'login';
  if (cleanPath.includes('/register')) return 'register';
  
  if (cleanPath.includes('/protocolos/iluminacion')) return 'protocolo-iluminacion';
  if (cleanPath.includes('/protocolos/ruido')) return 'protocolo-ruido';
  if (cleanPath.includes('/protocolos/ergonomia')) return 'protocolo-ergonomia';
  if (cleanPath.includes('/protocolos/puesta-a-tierra')) return 'protocolo-puesta-a-tierra';

  if (cleanPath.includes('/empresas')) return 'empresas';
  if (cleanPath.includes('/equipo')) return 'equipo';
  if (cleanPath.includes('/programa')) return 'programa';
  if (cleanPath.includes('/capacitaciones-online') || cleanPath.includes('/capacitar')) return 'capacitaciones-online';
  if (cleanPath.includes('/capacitacion')) return 'capacitacion';
  if (cleanPath.includes('/correctivas')) return 'correctivas';
  if (cleanPath.includes('/accidentes')) return 'accidentes';
  if (cleanPath.includes('/matriz-riesgos')) return 'matriz-riesgos';
  if (cleanPath.includes('/extintores')) return 'extintores';
  if (cleanPath.includes('/control-electrico')) return 'control-electrico';
  if (cleanPath.includes('/visitas')) return 'visitas';
  if (cleanPath.includes('/avisos')) return 'avisos';
  if (cleanPath.includes('/checklist-personalizados')) return 'checklist-personalizados';
  if (cleanPath.includes('/legajo')) return 'legajo';
  if (cleanPath.includes('/nomina')) return 'nomina';
  if (cleanPath.includes('/profile')) return 'profile';
  if (cleanPath.includes('/dashboard')) return 'dashboard';

  return 'dashboard';
}

/**
 * Obtiene el artículo de ayuda correspondiente al key o al pathname
 */
export function getHelpArticle(helpKey, pathname) {
  const key = helpKey || resolveHelpKeyFromPath(pathname);
  if (HELP_ARTICLES[key]) {
    return HELP_ARTICLES[key];
  }

  // Fallback genérico si la clave no existe exactamente
  return {
    key: 'generico',
    title: 'Guía y Soporte Gestión SySO',
    subtitle: 'Centro de ayuda interactivo in-app',
    icon: HelpCircle,
    tags: ['ayuda', 'soporte'],
    render: () => null
  };
}

/**
 * Busca artículos de ayuda por término de búsqueda (título, subtítulo o tags)
 */
export function searchHelpArticles(query) {
  if (!query || typeof query !== 'string') return ALL_ARTICLES_LIST;
  const q = query.toLowerCase().trim();
  return ALL_ARTICLES_LIST.filter(art => {
    const matchTitle = art.title?.toLowerCase().includes(q);
    const matchSub = art.subtitle?.toLowerCase().includes(q);
    const matchTags = art.tags?.some(t => t.toLowerCase().includes(q));
    return matchTitle || matchSub || matchTags;
  });
}
