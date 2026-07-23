// src/lib/pdf/pdfSignatures.js
import { PDF_THEME, setDrawColor, setTextColor } from './pdfTheme';

/**
 * Dibuja un bloque estandarizado de firma (Profesional, Trabajador, Responsable)
 */
export function drawPdfSignature(doc, options = {}) {
  const {
    x = 35,
    y = 700,
    width = 170,
    height = 60,
    firmaBase64 = null,
    nombre = '',
    cargo = '',
    dniMatricula = '',
    label = 'Firma del Responsable'
  } = options;

  // 1. Recuadro o Imagen de Firma
  if (firmaBase64) {
    try {
      doc.addImage(firmaBase64, 'PNG', x + 10, y, width - 20, height - 20, undefined, 'FAST');
    } catch (err) {
      console.error('Error insertando firma en PDF:', err);
    }
  } else {
    // Recuadro punteado / fallback si no hay firma
    setDrawColor(doc, [203, 213, 225]);
    doc.setLineDashPattern([2, 2], 0);
    doc.rect(x, y, width, height - 15);
    doc.setLineDashPattern([], 0); // Reset dash
    
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    setTextColor(doc, PDF_THEME.textMuted);
    doc.text('(Sin firma registrada)', x + (width / 2), y + ((height - 15) / 2), { align: 'center' });
  }

  // 2. Línea de Firma
  const lineY = y + height - 15;
  setDrawColor(doc, PDF_THEME.border);
  doc.setLineWidth(0.75);
  doc.line(x, lineY, x + width, lineY);

  // 3. Aclaraciones y Leyendas
  let textY = lineY + 10;
  if (nombre) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    setTextColor(doc, PDF_THEME.textPrimary);
    doc.text(nombre, x + (width / 2), textY, { align: 'center' });
    textY += 9;
  }

  if (cargo) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    setTextColor(doc, PDF_THEME.textMuted);
    doc.text(cargo, x + (width / 2), textY, { align: 'center' });
    textY += 9;
  }

  if (dniMatricula) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    setTextColor(doc, PDF_THEME.textMuted);
    doc.text(dniMatricula, x + (width / 2), textY, { align: 'center' });
    textY += 9;
  }

  if (label && !nombre) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    setTextColor(doc, PDF_THEME.textMuted);
    doc.text(label, x + (width / 2), lineY + 10, { align: 'center' });
  }

  return textY;
}
