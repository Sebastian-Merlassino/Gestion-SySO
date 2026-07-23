// src/lib/pdf/pdfTableStyles.js
import { PDF_THEME } from './pdfTheme';

/**
 * Configuraciones y opciones predefinidas de autotable para jsPDF
 */
export function getPdfTableOptions(customOptions = {}) {
  return {
    theme: 'grid',
    headStyles: {
      fillColor: PDF_THEME.primary,
      textColor: [255, 255, 255],
      fontSize: 8.5,
      fontStyle: 'bold',
      halign: 'left',
      valign: 'middle',
      cellPadding: 5
    },
    bodyStyles: {
      textColor: [30, 41, 59],
      fontSize: 8,
      cellPadding: 4,
      valign: 'middle'
    },
    alternateRowStyles: {
      fillColor: PDF_THEME.cardBg
    },
    styles: {
      overflow: 'linebreak',
      lineColor: PDF_THEME.border,
      lineWidth: 0.5
    },
    showHead: 'everyPage', // Repetir cabeceras en multipágina
    margin: { left: 35, right: 35, top: 50, bottom: 45 },
    ...customOptions
  };
}
