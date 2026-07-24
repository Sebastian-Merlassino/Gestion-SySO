// src/lib/pdf/pdfFooter.js
import { PDF_THEME, setFillColor, setDrawColor, setTextColor } from './pdfTheme';
import { PAGE_SPECS } from './pdfLayout';

/**
 * Dibuja el pie de página institucional en todas las páginas creadas.
 * Debe ejecutarse justo antes de guardar o retornar el PDF, o mediante hooks autotable.
 */
export function drawPdfFooter(doc, options = {}) {
  const {
    consultora = 'Gestión SySO — Soluciones Integrales en Higiene y Seguridad',
    telefono = '',
    email = '',
    codigo = '',
    orientation = 'portrait'
  } = options;

  const totalPages = doc.internal.getNumberOfPages();
  const specs = PAGE_SPECS[orientation] || PAGE_SPECS.portrait;
  const { marginLeft, marginRight, width: pageWidth, height: pageHeight } = specs;
  const footerY = pageHeight - 25;

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // 1. Línea Superior de Acento (espesor 0.35 mm o ~1 pt)
    setDrawColor(doc, PDF_THEME.primary);
    doc.setLineWidth(0.35);
    doc.line(marginLeft, footerY - 10, pageWidth - marginRight, footerY - 10);

    // 2. Identificación del Módulo (Izquierda)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    setTextColor(doc, PDF_THEME.textMuted);
    const leftText = codigo ? `${codigo} — Gestión SySO` : 'Gestión SySO SaaS';
    doc.text(leftText, marginLeft, footerY);

    // 3. Datos Institucionales / Contacto (Centro)
    // Nombre de la consultora en bold y los detalles en normal
    const boldText = consultora;
    const normalParts = [];
    if (telefono) normalParts.push(`Tel: ${telefono}`);
    if (email) normalParts.push(`Email: ${email}`);
    const normalText = normalParts.length > 0 ? `  •  ${normalParts.join('  •  ')}` : '';

    doc.setFontSize(7.5);
    setTextColor(doc, PDF_THEME.textMuted);

    // Medir anchos de los segmentos según su estilo
    doc.setFont('helvetica', 'bold');
    const boldWidth = doc.getTextWidth(boldText);

    doc.setFont('helvetica', 'normal');
    const normalWidth = doc.getTextWidth(normalText);

    const totalTextWidth = boldWidth + normalWidth;
    const totalW = pageWidth - marginLeft - marginRight;
    const lineStartX = marginLeft + (totalW / 2) - (totalTextWidth / 2);

    // Dibujar secuencialmente
    doc.setFont('helvetica', 'bold');
    doc.text(boldText, lineStartX, footerY);

    doc.setFont('helvetica', 'normal');
    doc.text(normalText, lineStartX + boldWidth, footerY);

    // 4. Numeración de Página Estándar (Derecha: Página X de Y)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    setTextColor(doc, PDF_THEME.textPrimary);
    doc.text(`Página ${i} de ${totalPages}`, pageWidth - marginRight, footerY, { align: 'right' });
  }
}
