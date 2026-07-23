// src/lib/pdf/pdfLayout.js
import { PDF_THEME } from './pdfTheme';

/**
 * Constantes globales de maquetación de PDF (Puntos pt / A4)
 * Formato A4 Vertical: 595.28 x 841.89 pt
 * Formato A4 Horizontal: 841.89 x 595.28 pt
 */
export const PAGE_SPECS = {
  portrait: {
    width: 595.28,
    height: 841.89,
    marginTop: 40,
    marginBottom: 45,
    marginLeft: 35,
    marginRight: 35,
    printableWidth: 525.28,
  },
  landscape: {
    width: 841.89,
    height: 595.28,
    marginTop: 40,
    marginBottom: 45,
    marginLeft: 35,
    marginRight: 35,
    printableWidth: 771.89,
  }
};

/**
 * Crea una nueva instancia estandarizada de jsPDF
 */
export async function createPdfDocument(orientation = 'portrait') {
  const { jsPDF } = await import('jspdf');
  await import('jspdf-autotable');

  const doc = new jsPDF({
    orientation,
    unit: 'pt',
    format: 'a4',
    compress: true
  });

  return doc;
}
