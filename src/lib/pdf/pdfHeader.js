// src/lib/pdf/pdfHeader.js
import { PDF_THEME, setFillColor, setDrawColor, setTextColor } from './pdfTheme';
import { PAGE_SPECS } from './pdfLayout';

/**
 * Dibuja la cabecera institucional estandarizada en la página activa del PDF.
 */
export function drawPdfHeader(doc, options = {}) {
  const {
    title = 'DOCUMENTO TÉCNICO',
    subtitle = '',
    empresa = '',
    establecimiento = '',
    codigo = '',
    fecha = '',
    logoBase64 = null,
    orientation = 'portrait'
  } = options;

  const specs = PAGE_SPECS[orientation] || PAGE_SPECS.portrait;
  const { marginLeft, marginRight, printableWidth, width: pageWidth } = specs;
  const startY = 30;

  // 1. Logotipo (Esquina superior izquierda)
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, 'PNG', marginLeft, startY - 5, 80, 35, undefined, 'FAST');
    } catch (err) {
      console.error('Error al insertar logo en PDF:', err);
    }
  }

  // 2. Título Principal y Folio (Alineado a la derecha)
  const titleX = pageWidth - marginRight;
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  setTextColor(doc, PDF_THEME.primary);
  doc.text(title.toUpperCase(), titleX, startY + 5, { align: 'right' });

  if (codigo) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    setTextColor(doc, PDF_THEME.textMuted);
    doc.text(`CÓDIGO: ${codigo}`, titleX, startY + 16, { align: 'right' });
  }

  if (fecha) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    setTextColor(doc, PDF_THEME.textMuted);
    doc.text(`FECHA: ${fecha}`, titleX, startY + 26, { align: 'right' });
  }

  // 3. Subcabecera (Empresa y Establecimiento)
  let currentY = startY + 38;
  if (empresa || establecimiento) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    setTextColor(doc, PDF_THEME.textPrimary);
    
    const empText = empresa ? `EMPRESA: ${empresa.toUpperCase()}` : '';
    const estText = establecimiento ? ` | ESTABLECIMIENTO: ${establecimiento.toUpperCase()}` : '';
    doc.text(`${empText}${estText}`, marginLeft, currentY);
    currentY += 10;
  }

  // 4. Línea Divisoria Institucional
  setDrawColor(doc, PDF_THEME.primary);
  doc.setLineWidth(1.25);
  doc.line(marginLeft, currentY, pageWidth - marginRight, currentY);

  return currentY + 12; // Retorna la posición Y útil resultante
}
