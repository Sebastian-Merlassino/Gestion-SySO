# Estándar Normativo de Diseño y Generación de Documentos PDF — Gestión SySO

**Fecha:** 12 de Agosto de 2026  
**Área:** Arquitectura Documental, Reportes Impresos & Generación PDF  
**Motor Principal:** `jsPDF` ^2.5.1 + `jspdf-autotable` ^3.8.2  
**Helpers Centralizados:** `src/lib/pdf/`  

---

## 1. Geometría, Formato y Márgenes de Hoja

### 1.1 Formato Estándar A4
- **Unidad de Medida Oficial**: Milímetros (`mm`).
- **Dimensiones A4**: `210 x 297 mm`.
- **Orientación**:
  - **Retrato (Portrait / Vertical)**: Para Constancias de Visitas, Registros de Capacitación HSYST, Avisos de Riesgo, Investigaciones de Accidentes, Control Eléctrico, Extintores y Checklists.
  - **Paisaje (Landscape / Horizontal)**: Para Programa Anual de Gestión, Matriz de Riesgos IPER y Protocolo de Ergonomía SRT 886/15 (Planillas Anexo II).
- **Márgenes Obligatorios**:
  - `Top`: `18 mm` (Espacio para encabezado institucional).
  - `Bottom`: `20 mm` (Protección de franja de pie de página).
  - `Left / Right`: `15 mm`.

---

## 2. Encabezado Institucional Estándar (`pdfHeader.js`)

Todos los PDFs generados en Gestión SySO deben incorporar una cabecera homogénea compuesta por:

1. **Logo Corporativo (Izquierda)**: Logo de la empresa o de Gestión SySO en formato base64/PNG con fondo transparente, escalado dinámicamente según su relación de aspecto mediante `getImageDimensions` (`maxW = 65 mm`, `maxH = 22 mm`).
2. **Título del Documento (Derecha / Arriba)**: Texto en mayúsculas, fuente `helvetica`, tamaño `13pt`, peso `bold`, color `#0d0d0d`.
3. **Ficha Metadatos (Sub-cabecera)**:
   - Razón Social de la Empresa
   - C.U.I.T.
   - Denominación del Establecimiento y Dirección
   - Fecha de Emisión y Código Unívoco de Documento (ej. `VIS-2026-0812`)
4. **Línea Divisoria Horizonal**: Línea de `0.8 pt` en color `#468DFF` (`Blue-500`) separando la cabecera del cuerpo técnico.

---

## 3. Pie de Página y Paginación Dinámica (`pdfFooter.js`)

Todos los documentos deben contar con un pie de página estandarizado:

1. **Línea Divisoria Inferior**: Línea de `0.5 pt` en color `#cbd5e1` (`slate-300`) a `15 mm` del borde inferior.
2. **Leyenda Institucional (Izquierda)**: `[Nombre Comercial] • Tel: [telefono] • Email: [email]` (Datos dinámicos del equipo/tenant).
3. **Leyenda Normativa / Confidencialidad (Centro)**: `Documento generado conforme a normativa SRT / Disposición SRT 2/22`.
4. **Número de Página (Derecha)**: Formato obligatorio en 2 pasadas: `Página X de Y` (utilizando `doc.putTotalPages('{totalPages}')`).

---

## 4. Sistema Tipográfico y Colores PDF

### 4.1 Escala Tipográfica en jsPDF
- **Título de Sección**: 11pt / Bold / Color `#468DFF`
- **Subtítulo / Campos**: 9.5pt / Bold / Color `#1e293b` (`slate-800`)
- **Texto Normal / Cuerpo**: 8.5pt / Normal / Color `#334155` (`slate-700`)
- **Texto de Tabla (`autoTable`)**: 8pt / Normal / Color `#334155`
- **Notas Normativas**: 7.5pt / Italic / Color `#64748b` (`slate-500`)

### 4.2 Paleta de Colores PDF (`pdfTheme.js`)

```javascript
export const PDF_THEME = {
  primary: '#468DFF',      // Azul institucional SySO
  primaryDark: '#0511F2',  // Acento intenso / hover
  textDark: '#0d0d0d',     // Títulos principales
  textBody: '#334155',     // Texto normal (Slate-700)
  textMuted: '#64748b',    // Captions y pies (Slate-500)
  border: '#cbd5e1',       // Bordes de tabla y rectángulos (Slate-300)
  bgHeader: '#468DFF',     // Relleno de cabecera de autoTable
  bgSubHeader: '#E2E8F0',  // Relleno de subencabezados (Slate-200)
  bgAltRow: '#f8fafc',     // Filas alternadas
  success: '#16a34a',      // Estado completado / realizado
  warning: '#d97706',      // Estado pendiente / advertencia
  destructive: '#dc2626',  // Estado vencido / riesgo alto
};
```

---

## 5. Estándar de Tablas (`jspdf-autotable`)

Todas las tablas dentro de los PDFs deben configurarse importando `pdfTableStyles.js`:

```javascript
autoTable(doc, {
  startY: currentY,
  head: [['CAMPO / CONCEPTO', 'DETALLE / VALOR', 'ESTADO']],
  body: tableData,
  theme: 'grid',
  showHead: 'everyPage', // Repetir encabezado al cambiar de página
  headStyles: {
    fillColor: PDF_THEME.primary,
    textColor: '#FFFFFF',
    fontSize: 9,
    fontStyle: 'bold',
    halign: 'left',
  },
  bodyStyles: {
    textColor: PDF_THEME.textBody,
    fontSize: 8,
  },
  alternateRowStyles: {
    fillColor: PDF_THEME.bgAltRow,
  },
  margin: { top: 18, bottom: 20, left: 15, right: 15 },
});
```

---

## 6. Firmas Digitales, Asincronismo y Trazabilidad (`pdfSignatures.js`)

1. **Resolución Asíncrona de Storage (`resolveStorageUrl`)**:
   - Detecta si la firma o imagen proviene de Supabase Storage (`signatures`, `documents`, `logos`).
   - Ejecuta `supabase.storage.from(bucket).createSignedUrl` o `getPublicUrl` para obtener URLs accesibles por `getBase64ImageFromUrl` antes de invocar `doc.addImage`.
2. **Formato Multi-Matrícula**:
   - Concatenación de matrículas del profesional (`COPIME N° L002210 / CPSH N° LHS-000179 PSA`).
3. **Fórmula de Solapamiento Estético (`0.78`)**:
   - Altura máxima de firma `maxH = 32 mm`.
   - Coordenada vertical `renderY = lineY - (renderH * 0.78)`, haciendo flotar el 78% de la firma sobre el renglón.
4. **Protección de Salto de Página (Page Break Guard)**:
   - Si el espacio vertical restante en la hoja es menor a `35 mm`, el generador invoca `doc.addPage()` automáticamente antes de dibujar el bloque de firmas.

---

## 7. Nombres de Archivo PDF (`pdfFileName.js`)

Formato unificado obligatorio para descargas y envíos de PDF:

```javascript
formatPdfFileName({
  tipoDoc: 'constancia-visita',
  empresa: 'acme-sa',
  establecimiento: 'planta-central',
  fecha: '2026-08-12',
  id: 'VIS-104'
});
// Resultado: constancia-visita_acme-sa_planta-central_2026-08-12_VIS-104.pdf
```

---
