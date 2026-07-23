// src/lib/pdf/pdfTheme.js
/**
 * Theme y Tokens de Color estandarizados para generación de PDFs en jsPDF.
 * Convierte automáticamente valores Hexadecimales a RGB (r, g, b) enteros para
 * evitar incompatibilidades nativas de jsPDF (ej. rellenos negros).
 */

export const PDF_THEME = {
  // Paleta Oficial Gestión SySO (Valores RGB)
  primary: [70, 141, 255],      // #468DFF (Azul Corporativo)
  primaryDark: [5, 17, 242],    // #0511F2 (Azul Intenso)
  textPrimary: [13, 13, 13],    // #0D0D0D (Negro Carbón)
  textMuted: [100, 116, 139],   // #64748B (Gris Slate)
  border: [217, 217, 217],      // #D9D9D9 (Gris Claro)
  cardBg: [248, 250, 252],      // #F8FAFC (Gris Cebra)
  tableHeaderBg: [70, 141, 255],
  tableHeaderAltBg: [226, 232, 240], // #E2E8F0
  white: [255, 255, 255],
  
  // Estados de Alerta / Cumplimiento
  success: [34, 197, 94],       // #22C55E (Verde Cumplimiento)
  warning: [234, 179, 8],       // #EAB308 (Amarillo Advertencia)
  destructive: [239, 68, 68],   // #EF4444 (Rojo Desvío)
};

/**
 * Convierte un string Hexadecimal (#468DFF o 468DFF) a un arreglo RGB [r, g, b].
 */
export function hexToRgb(hex) {
  if (!hex || typeof hex !== 'string') return [0, 0, 0];
  let cleanHex = hex.replace('#', '');
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map(c => c + c).join('');
  }
  if (cleanHex.length !== 6) return [0, 0, 0];
  const num = parseInt(cleanHex, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

/**
 * Auxiliares de asignación de color seguros para jsPDF
 */
export function setFillColor(doc, color) {
  const rgb = Array.isArray(color) ? color : hexToRgb(color);
  doc.setFillColor(rgb[0], rgb[1], rgb[2]);
}

export function setDrawColor(doc, color) {
  const rgb = Array.isArray(color) ? color : hexToRgb(color);
  doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
}

export function setTextColor(doc, color) {
  const rgb = Array.isArray(color) ? color : hexToRgb(color);
  doc.setTextColor(rgb[0], rgb[1], rgb[2]);
}
