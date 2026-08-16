# Estándar Normativo de Diseño y Generación de Documentos PDF — Gestión SySO

**Fecha:** 16 de Agosto de 2026  
**Área:** Arquitectura Documental, Reportes Impresos & Generación PDF  
**Estado:** Norma Técnica Institucional Obligatoria  
**Motor Principal:** `jsPDF` ^4.2.1 + `jspdf-autotable` ^5.0.8  
**Librerías Complementarias:** `pdf-lib` ^1.17.1 (fusión de adjuntos), `pdfjs-dist` ^6.2.108 (visor web de filminas)  
**Ubicación de Helpers Centralizados:** `src/lib/pdf/`

---

## 1. Geometría, Formato y Márgenes de Hoja

### 1.1 Formato Oficial A4
- **Unidad de Medida Obligatoria:** Milímetros (`mm`). *(Queda deprecado el uso de puntos `pt`).*
- **Dimensiones A4 Estándar:** `210 x 297 mm`.
- **Orientación:**
  - **Retrato (Portrait / Vertical):** Para Constancias de Visita, Registros de Capacitación HSYST, Avisos de Riesgo, Investigaciones de Accidentes, Control de Instalaciones Eléctricas, Protocolo de Puesta a Tierra Res. 900/15 y Checklists.
  - **Paisaje (Landscape / Horizontal):** Para Programa Anual de Gestión, Matriz de Riesgos IPER, Control de Extintores, Acciones Correctivas y Planillas de Protocolo de Ergonomía SRT 886/15 (Anexos II).

### 1.2 Márgenes de Hoja Obligatorios
- **Margen Superior (`Top`):** `15 mm` (deja espacio limpio para el encabezado institucional).
- **Margen Inferior (`Bottom`):** `22 mm` (reserva de seguridad para la franja del pie de página).
- **Márgenes Laterales (`Left / Right`):** `15 mm` (ancho útil imprimible: `180 mm` en vertical / `267 mm` en horizontal).

---

## 2. Encabezado Institucional Estándar (`pdfHeader.js`)

Todos los documentos generados en Gestión SySO deben incorporar una cabecera homogénea compuesta por los siguientes 4 elementos:

```javascript
// Ejemplo de invocación del helper
const currentY = drawPdfHeader(doc, {
  title: 'CONSTANCIA DE VISITA TÉCNICA',
  codigo: 'VIS-2026-0816',
  fecha: '16/08/2026',
  empresa: 'Acme S.A.',
  establecimiento: 'Planta Central',
  logoBase64: logoDataUrl,
  orientation: 'portrait'
});
```

### Especificación Gráfica:
1. **Logotipo Corporativo (Esquina Superior Izquierda):**
   - Inserción asíncrona mediante `doc.addImage(logoBase64, 'PNG', ...)`.
   - Dimensiones máximas acotadas: `maxW = 60 mm`, `maxH = 20 mm`.
   - Cálculo dinámico de relación de aspecto (`getImageDimensions`) para impedir estiramientos:
     ```javascript
     const ratio = dims.width / dims.height;
     let renderW = maxW;
     let renderH = maxW / ratio;
     if (renderH > maxH) {
       renderH = maxH;
       renderW = maxH * ratio;
     }
     ```
2. **Título del Documento (Alineado a la Derecha o Barra Azul Centrada):**
   - Fuente `helvetica`, tamaño `12pt`, peso `bold`, color `#0D0D0D` o fondo azul corporativo `#468DFF` con texto blanco.
3. **Ficha de Metadatos (Sub-cabecera):**
   - Razón Social de la Empresa Cliente
   - C.U.I.T.
   - Denominación del Establecimiento y Dirección
   - Fecha de Emisión y Código Unívoco de Documento (ej. `VIS-2026-0816`)
4. **Línea Divisoria Institucional:**
   - Línea horizontal de `0.4 mm` (o `1.25 pt`) en color Azul Corporativo `#468DFF` (`[70, 141, 255]`) separando la cabecera del cuerpo técnico.

---

## 3. Pie de Página y Paginación Dinámica en 2 Pasadas (`pdfFooter.js`)

Todo reporte debe cerrarse ejecutando el footer en dos pasadas sobre la totalidad de las fojas generadas:

```javascript
export function drawPdfFooter(doc, options = {}) {
  const {
    consultora = 'Gestión SySO — Soluciones Integrales en Higiene y Seguridad',
    telefono = '1159969956',
    email = 'soporte@gestionsyso.com',
    codigo = '',
    orientation = 'portrait'
  } = options;

  const totalPages = doc.internal.getNumberOfPages();
  const startX = 15;
  const endX = orientation === 'landscape' ? 282 : 195;
  const totalW = endX - startX;
  const barY = orientation === 'landscape' ? 196 : 281;
  const textY = orientation === 'landscape' ? 200.5 : 285.5;

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // 1. Línea Superior de Acento Azul
    doc.setDrawColor(70, 141, 255); // #468DFF
    doc.setLineWidth(0.35);
    doc.line(startX, barY, endX, barY);

    // 2. Datos Institucionales Centrados
    const boldText = String(consultora);
    const normalText = `  •  Tel: ${telefono}  •  Email: ${email}`;

    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105); // Slate-600

    doc.setFont('helvetica', 'bold');
    const boldWidth = doc.getTextWidth(boldText);
    doc.setFont('helvetica', 'normal');
    const normalWidth = doc.getTextWidth(normalText);
    const totalTextWidth = boldWidth + normalWidth;
    const lineStartX = startX + (totalW / 2) - (totalTextWidth / 2);

    doc.setFont('helvetica', 'bold');
    doc.text(boldText, lineStartX, textY);
    doc.setFont('helvetica', 'normal');
    doc.text(normalText, lineStartX + boldWidth, textY);

    // 3. Numeración de Página Estándar a la Derecha (Página X de Y)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`Página ${i} de ${totalPages}`, endX, textY, { align: 'right' });
  }
}
```

---

## 4. Sistema Tipográfico y Tokens de Color PDF (`pdfTheme.js`)

### 4.1 Escala Tipográfica para Impresión
- **Título de Documento / Portada:** `18pt - 24pt` / Bold / Color `#468DFF`
- **Títulos de Secciones Técnicas:** `11pt` / Bold / Color `#468DFF` o `#0D0D0D`
- **Subtítulos y Etiquetas de Ficha:** `8.5pt - 9pt` / Bold / Color `#0F172A`
- **Cuerpo y Valores de Medición:** `8pt` / Normal / Color `#1E293B`
- **Celdas de Tabla (`jspdf-autotable`):** `7.5pt - 8pt` / Normal / Color `#0F172A`
- **Notas Normativas y Aclaraciones:** `7pt - 7.5pt` / Italic / Color `#64748B`

### 4.2 Tokens de Color RGB Seguros (`src/lib/pdf/pdfTheme.js`)

```javascript
export const PDF_THEME = {
  // Paleta Oficial Gestión SySO (Valores RGB)
  primary: [70, 141, 255],        // #468DFF (Azul Corporativo)
  primaryDark: [5, 17, 242],      // #0511F2 (Azul Intenso de Acento)
  textPrimary: [13, 13, 13],      // #0D0D0D (Negro Carbón)
  textBody: [30, 41, 59],         // #1E293B (Slate-800)
  textMuted: [100, 116, 139],     // #64748B (Slate-500)
  border: [203, 213, 225],        // #CBD5E1 (Slate-300)
  cardBg: [248, 250, 252],        // #F8FAFC (Gris Cebra Filas Alternadas)
  subHeaderBg: [226, 232, 240],   // #E2E8F0 (Slate-200 Subencabezados)
  white: [255, 255, 255],

  // Estados Semánticos de Cumplimiento / Desvío
  success: [22, 163, 74],         // #16A34A (Verde Cumple)
  warning: [217, 119, 6],         // #D97706 (Ámbar Advertencia / Parcial)
  destructive: [220, 38, 38],     // #DC2626 (Rojo No Cumple / Peligro)
};
```

---

## 5. Estándar de Tablas Técnicas (`jspdf-autotable`)

Todas las tablas de reportes PDF deben consumir las opciones base de `src/lib/pdf/pdfTableStyles.js`:

```javascript
import autoTable from 'jspdf-autotable';
import { PDF_THEME } from '@/lib/pdf/pdfTheme';

autoTable(doc, {
  startY: currentY,
  head: [['SECTOR', 'PUNTO / EQUIPO', 'VALOR OBTENIDO', 'LÍMITE', 'RESULTADO']],
  body: tableData,
  theme: 'grid',
  tableLineWidth: 0.3,
  tableLineColor: PDF_THEME.border,
  showHead: 'everyPage', // Repite cabeceras en saltos de página automáticos
  rowPageBreak: 'avoid',  // Evita cortar filas por la mitad
  headStyles: {
    fillColor: PDF_THEME.primary,
    textColor: PDF_THEME.white,
    fontSize: 8.5,
    fontStyle: 'bold',
    halign: 'center',
    valign: 'middle',
    lineWidth: 0.3,
    lineColor: PDF_THEME.border
  },
  bodyStyles: {
    fontSize: 8,
    textColor: PDF_THEME.textBody,
    valign: 'middle',
    minCellHeight: 7,
    lineWidth: 0.3,
    lineColor: PDF_THEME.border
  },
  alternateRowStyles: {
    fillColor: PDF_THEME.cardBg // Fila cebra suave #F8FAFC
  },
  margin: { left: 15, right: 15, top: 20, bottom: 22 }
});
```

---

## 6. Firmas Digitales, Asincronismo y Trazabilidad (`pdfSignatures.js`)

1. **Resolución Asíncrona de Supabase Storage (`resolveStorageUrl`):**  
   Antes de solicitar el Base64 de una firma, se debe resolver su URL firmada si reside en los buckets `signatures`, `documents` o `avatars` mediante `supabase.storage.from(bucket).createSignedUrl(path, 3600)`.

2. **Fórmula de Solapamiento Estético (`0.78`):**  
   Para simular una firma manuscrita real que cruza el renglón sin deformarse:
   ```javascript
   const lineY = boxY + 24;
   const renderY = lineY - (renderH * 0.78);
   doc.addImage(firmaBase64, 'PNG', renderX, renderY, renderW, renderH, undefined, 'FAST');
   ```

3. **Guarda de Salto de Página (Page Break Protection):**  
   Si el espacio vertical disponible en la página antes de estampar las firmas es inferior a `35 mm`, el generador debe ejecutar `doc.addPage()` para evitar que el bloque de firmas se corte entre dos páginas.

4. **Multi-Matrícula del Profesional:**  
   Concatenación obligatoria de todas las matrículas registradas en la tabla `matriculas` de Supabase:
   `COPIME N° L002210 / CPSH N° LHS-000179 PSA`.

---

## 7. Evidencias Fotográficas, Croquis y Fusión de Adjuntos (`pdf-lib`)

1. **Grillas de Evidencias Fotográficas:**
   - Miniaturas proporcionales con borde gris `#CBD5E1`, subtítulo de fecha/hora y número de toma (ej. `Toma N° 1 - Jabalina Tablero Principal`).
2. **Marcadores Numéricos en Croquis:**
   - Renderizado de círculos azules (`#468DFF`) con números secuenciales (`①`, `②`, `③`, ...) sobre planos de planta.
3. **Fusión de Certificados de Calibración con `pdf-lib`:**
   - En protocolos de Ruido e Iluminación, cuando el usuario adjunta el Certificado de Calibración del Instrumental en PDF, el sistema lo concatena al final del documento principal:
     ```javascript
     import { PDFDocument } from 'pdf-lib';
     
     const mainPdfBytes = doc.output('arraybuffer');
     const finalPdfDoc = await PDFDocument.load(mainPdfBytes);
     const certDoc = await PDFDocument.load(certPdfArrayBuffer);
     const copiedPages = await finalPdfDoc.copyPages(certDoc, certDoc.getPageIndices());
     copiedPages.forEach((page) => finalPdfDoc.addPage(page));
     const mergedPdfBytes = await finalPdfDoc.save();
     ```

---

## 8. Formato Estándar de Nombres de Archivo PDF (`pdfFileName.js`)

Todos los documentos descargados o enviados por correo electrónico deben formatearse mediante el helper `formatPdfFileName`:

```javascript
import { formatPdfFileName } from '@/lib/pdf/pdfFileName';

const fileName = formatPdfFileName({
  tipoDoc: 'protocolo-puesta-a-tierra',
  empresa: 'metalurgica-central',
  establecimiento: 'planta-1',
  fecha: '2026-08-16',
  id: 'PAT-004'
});
// Resultado: protocolo-puesta-a-tierra_metalurgica-central_planta-1_2026-08-16_PAT-004.pdf
```

---
