# Estándar Normativo de Diseño de Documentos PDF — Gestión SySO

**Fecha:** 5 de Agosto de 2026  
**Área:** Arquitectura Documental y Generación de Reportes PDF  
**Motor Principal:** `jsPDF` + `jspdf-autotable`  
**Helpers Centralizados:** `src/lib/pdf/`  

---

## 1. Geometría y Formato de Página

### 1.1 Formato de Hoja Estándar
- **Tamaño de Hoja**: A4 por defecto (`210 x 297 mm` o `595.28 x 841.89 pt`).
- **Orientación**:
  - **Retrato (Portrait / Vertical)**: Para Constancias de Visitas, Avisos de Riesgo, Investigaciones de Accidentes, Inspecciones y Certificados.
  - **Paisaje (Landscape / Horizontal)**: Para Programa Anual de Gestión, Matriz de Riesgos IPER y Planillas Complejas SRT 886/15 (Anexos 2.A - 2.I).
- **Márgenes Imprescindibles**:
  - `Top`: 50pt / 18mm (para dar espacio al encabezado institucional).
  - `Bottom`: 50pt / 18mm (para proteger la franja del pie de página).
  - `Left / Right`: 36pt / 15mm.

---

## 2. Encabezado Institucional Estándar (`pdfHeader.js`)

Todos los documentos PDF generados en Gestión SySO deben incorporar una cabecera homogénea compuesta por:

1. **Logo Oficial (Izquierda)**: Logo de Gestión SySO o de la Empresa Cliente en formato PNG con fondo transparente (`height: 35pt`).
2. **Título del Documento (Derecha / Arriba)**: Texto en mayúsculas, fuente `helvetica`, tamaño `14pt`, peso `bold`, color `#0d0d0d`.
3. **Banda de Datos Clave (Sub-cabecera)**:
   - Razón Social de la Empresa
   - C.U.I.T.
   - Denominación del Establecimiento y Dirección
   - Fecha de Emisión y Código Unívoco de Documento (ej. `VIS-2026-0805`)
4. **Línea Divisoria Horizonal**: Línea de `1pt` en color `#468DFF` (`Blue-500`) separando la cabecera del cuerpo técnico.

---

## 3. Pie de Página y Paginación Dinámica (`pdfFooter.js`)

Todos los PDFs deben contar con un pie de página estandarizado que incluya:

1. **Línea Divisoria Inferior**: Línea de `0.5pt` en color `#cbd5e1` (`slate-300`) situada a `40pt` del borde inferior.
2. **Leyenda Institucional (Izquierda)**: `Gestión SySO — Plataforma de Gestión de Higiene y Seguridad Laboral`.
3. **Número de Página (Derecha)**: Formato obligatorio en 2 pasadas: `Página X de Y` (ej. `Página 1 de 3`).

---

## 4. Sistema Tipográfico y Colores PDF

### 4.1 Escala Tipográfica
- **Título de Sección**: 12pt / Bold / Color `#468DFF`
- **Subtítulo / Campos**: 10pt / Bold / Color `#1e293b` (`slate-800`)
- **Texto Normal / Cuerpo**: 9pt / Normal / Color `#334155` (`slate-700`)
- **Texto de Tabla (`autoTable`)**: 8pt / Normal / Color `#334155`
- **Pies y Notas**: 8pt / Italic / Color `#64748b` (`slate-500`)

### 4.2 Paleta de Colores en PDF (`pdfTheme.js`)
```javascript
export const PDF_THEME = {
  primary: '#468DFF',      // Azul institucional
  primaryDark: '#0511F2',  // Acento / hover
  textDark: '#0d0d0d',     // Títulos principales
  textBody: '#334155',     // Texto normal
  textMuted: '#64748b',    // Captions y pies
  border: '#cbd5e1',       // Bordes de tabla y rectángulos
  bgHeader: '#f8fafc',     // Fondo de encabezado autoTable
  bgAltRow: '#f1f5f9',     // Filas alternadas
  success: '#00b050',      // Estado completado
  warning: '#d97706',      // Estado pendiente
  destructive: '#dc2626',  // Estado vencido / riesgo alto
};
```

---

## 5. Estándar de Tablas (`jspdf-autotable`)

Todas las tablas dentro de los PDFs generados deben configurarse importando `pdfTableStyles.js`:

```javascript
autoTable(doc, {
  startY: currentY,
  head: [['CAMPO / CONCEPTO', 'DETALLE / VALOR', 'ESTADO']],
  body: tableData,
  theme: 'grid',
  showHead: 'everyPage', // Repetir encabezado en cada página
  headStyles: {
    fillColor: '#468DFF',
    textColor: '#FFFFFF',
    fontSize: 9,
    fontStyle: 'bold',
    halign: 'left',
  },
  bodyStyles: {
    textColor: '#334155',
    fontSize: 8,
  },
  alternateRowStyles: {
    fillColor: '#f8fafc',
  },
  margin: { top: 50, bottom: 50, left: 36, right: 36 },
});
```

---

## 6. Cuadro de Firmas y Trazabilidad (`pdfSignatures.js`)

1. **Ubicación de Firmas**: Las firmas deben disponerse en un bloque final de 2 o 3 columnas al término del documento.
2. **Verificación de Espacio**: Si el espacio restante en la última página es menor a `100pt`, el sistema debe invocar `doc.addPage()` automáticamente antes de renderizar las firmas para evitar que queden solapadas con el pie.
3. **Estructura del Cuadro de Firma**:
   - Imagen de Firma Base64 (`height: 35pt`) o leyenda `(Sin firma registrada)` en color `#94a3b8`.
   - Línea horizontal superior de `1pt` en `#cbd5e1`.
   - Aclaración (Nombre Completo) en `9pt Bold`.
   - Cargo / DNI / Matrícula Profesional en `8pt Normal`.
   - Rol (`Profesional SySO` / `Responsable de Empresa` / `Trabajador`).

---

## 7. Patrón de Nombres de Archivo PDF (`pdfFileName.js`)

Todos los documentos descargados o adjuntados por email deben formatearse estrictamente mediante el helper unificado:

```javascript
formatPdfFileName({
  tipoDoc: 'constancia-visita',
  empresa: 'Acme S.A.',
  establecimiento: 'Planta Central',
  fecha: '2026-08-05',
  id: 'V-104'
});
// Resultado: constancia-visita_acme-sa_planta-central_2026-08-05_V-104.pdf
```
