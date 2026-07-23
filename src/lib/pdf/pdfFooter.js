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

    // 1. Línea Superior de Acento
    setDrawColor(doc, PDF_THEME.primary);
    doc.setLineWidth(1);
    doc.line(marginLeft, footerY - 10, pageWidth - marginRight, footerY - 10);

    // 2. Identificación del Módulo (Izquierda)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    setTextColor(doc, PDF_THEME.textMuted);
    const leftText = codigo ? `${codigo} — Gestión SySO` : 'Gestión SySO SaaS';
    doc.text(leftText, marginLeft, footerY);

    // 3. Datos Institucionales / Contacto (Centro)
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    setTextColor(doc, PDF_THEME.textMuted);
    const contactParts = [consultora];
    if (telefono) contactParts.push(`Tel: ${telefono}`);
    if (email) contactParts.push(`Email: ${email}`);
    doc.text(contactParts.join(' • '), pageWidth / 2, footerY, { align: 'center' });

    // 4. Numeración de Página Estándar (Derecha: Página X de Y)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    setTextColor(doc, PDF_THEME.textPrimary);
    doc.text(`Página ${i} de ${totalPages}`, pageWidth - marginRight, footerY, { align: 'right' });
  }
}
