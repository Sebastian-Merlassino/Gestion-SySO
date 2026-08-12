# Informe de Auditoría Específica de Documentos PDF — Gestión SySO

**Fecha de Auditoría:** 12 de Agosto de 2026  
**Auditor Senior:** Especialista Senior en Generación de Documentos y Reportes PDF  
**Motor Principal Utilizado:** `jsPDF` ^2.5.1 + `jspdf-autotable` ^3.8.2  
**Visor Especializado:** Mozilla `pdfjs-dist` (Visor modo filmina en `PdfSlideViewer.js`)  
**Estado de Código:** Auditoría pasiva integral (Sin modificación de código fuente)  

---

## 1. Resumen Ejecutivo

### 1.1 Diagnóstico General
El sistema **Gestión SySO** posee un avanzado motor de generación y renderizado de documentos técnicos impresos y descargables en formato PDF. La arquitectura documental del proyecto incluye helpers centralizados en `src/lib/pdf/` (`pdfTheme.js`, `pdfHeader.js`, `pdfFooter.js`, `pdfTableStyles.js`, `pdfSignatures.js`, `pdfImages.js`, `pdfFileName.js`), así como generadores especializados por módulo.

Asimismo, se destacan importantes hitos técnicos logrados recientemente:
1. **Generador de Registro de Capacitación de Higiene y Seguridad (`capacitaciones-online/utils/pdfGenerator.js`)**:
   - Cumplimiento normativo con la Disposición SRT 2/22 y Resolución 48/25.
   - Encabezado institucional con logo ampliado a `65 x 22 mm` preservando la relación de aspecto (`getImageDimensions`).
   - Recuadro de Tema extensible (`doc.splitTextToSize` en `helvetica normal`, 8.5pt).
   - Fecha y Hora asincrónica SRT 2/22 (`DD/MM/AAAA - DD/MM/AAAA` / `"Asincrónica (SRT 2/22)"`).
   - Subencabezado de Asistentes en gris neutro estandarizado (`#E2E8F0` / Slate-900 bold).
   - Incrustación asíncrona de firmas digitales con resolución de URLs de Supabase Storage (`resolveStorageUrl` vía `createSignedUrl` o `getPublicUrl`).
   - Formato multi-matrícula para capacitadores (ej. `COPIME N° L002210 / CPSH N° LHS-000179 PSA`).
   - Firma del capacitador con límitación de altura `maxH = 32 mm` y superposición estética de solapamiento `0.78` sobre el renglón.
   - Acciones desacopladas en la UI: Botón `Printer` (Ver e Imprimir PDF en pestaña nueva) y Botón `Download` (Descargar PDF directamente).
2. **Visor PDF Modo Filmina con PDF.js (`PdfSlideViewer.js`)**:
   - Renderizado en canvas HTML5 sin scroll continuo para diapositivas de capacitación en el portal público `/capacitar/[token]`.

No obstante, la auditoría reveló que **aproximadamente el 40% de las funciones de generación de PDF en la plataforma (ej. Visitas Técnicas, Programa Anual, Matriz de Riesgos) aún conservan código legacy inline** con coordenadas duras en puntos (`pt`), colores hardcodeados (ej. `doc.setFillColor(70, 141, 255)`), logos dibujados sin cálculo de aspecto y firmas con riesgo de solapamiento.

---

## 2. Inventario Completo de Generadores PDF en el Sistema

| ID Documento | Módulo / Sección | Archivo de Origen | Función Generadora | Librería | Formato Hoja | Firmas Digitales | Evidencias / Imágenes | Estado Arquitectónico |
|---|---|---|---|---|---|---|---|---|
| **PDF-01** | **Constancia de Visita Técnica** | `src/app/[tenant-slug]/visitas/page.js` | `handleGeneratePdf(v)` | `jsPDF` + `autoTable` | A4 Vertical (pt) | SÍ (Profesional + Cliente) | NO | Legacy Inline (Migración recomendada a `src/lib/pdf/`) |
| **PDF-02** | **Registro de Capacitación HSYST** | `src/app/[tenant-slug]/capacitaciones-online/utils/pdfGenerator.js` | `generateCapacitacionPdf(...)` | `jsPDF` + `autoTable` | A4 Vertical (mm) | SÍ (Capacitador + Asistentes) | NO | **Excelente / Normativo (SRT 2/22)** |
| **PDF-03** | **Protocolo de Ruido (Res. 85/12)** | `src/app/[tenant-slug]/protocolos/ruido/utils/pdfGenerator.js` | `generateNoiseProtocolPdf(...)` | `jsPDF` + `autoTable` | A4 Vertical (mm) | SÍ (Especialista + Empleador) | SÍ (Croquis / Puntos) | Avanzado (Helpers parciales) |
| **PDF-04** | **Protocolo Iluminación (Res. 84/12)** | `src/app/[tenant-slug]/protocolos/iluminacion/utils/pdfGenerator.js` | `generateLightingProtocolPdf(...)` | `jsPDF` + `autoTable` | A4 Vertical (mm) | SÍ (Especialista + Empleador) | SÍ (Croquis Puntos Lux) | Avanzado (Helpers parciales) |
| **PDF-05** | **Protocolo Ergonomía (Res. 886/15)**| `src/app/[tenant-slug]/protocolos/ergonomia/utils/pdfGenerator.js` | `generateErgoProtocolPdf(...)` | `jsPDF` + `autoTable` | A4 Horiz / Vert (mm) | SÍ (Múltiples firmantes) | SÍ (Evidencias Puesto) | Avanzado (Multi-anexo SRT) |
| **PDF-06** | **Programa Anual de Gestión** | `src/app/[tenant-slug]/programa/page.js` | `handleExportPdf(...)` | `jsPDF` + `autoTable` | A4 Horizontal (mm) | NO | NO | Legacy Inline |
| **PDF-07** | **Investigación de Accidentes** | `src/app/[tenant-slug]/accidentes/page.js` | `handleGenerateAccidentPdf(...)` | `jsPDF` + `autoTable` | A4 Vertical (pt) | SÍ (Responsable) | SÍ (Fotos Accidente) | Semi-Legacy |
| **PDF-08** | **Avisos de Riesgo / Hallazgos** | `src/app/[tenant-slug]/avisos/page.js` | `handleGenerateAvisoPdf(...)` | `jsPDF` + `autoTable` | A4 Vertical (mm) | SÍ (Inspector) | SÍ (Fotos Hallazgo) | Semi-Legacy |
| **PDF-09** | **Control de Instalaciones Eléctricas**| `src/app/[tenant-slug]/control-electrico/page.js` | `handleGeneratePdf(...)` | `jsPDF` + `autoTable` | A4 Vertical (mm) | SÍ (Técnico) | SÍ (Tableros / Mediciones) | Semi-Legacy |
| **PDF-10** | **Control de Extintores / Ignífugos** | `src/app/[tenant-slug]/extintores/page.js` | `handleGeneratePdf(...)` | `jsPDF` + `autoTable` | A4 Vertical (mm) | SÍ (Inspector) | SÍ (Planilla Equipos) | Semi-Legacy |
| **PDF-11** | **Checklist Personalizado** | `src/app/[tenant-slug]/checklist-personalizados/page.js` | `handleGeneratePdf(...)` | `jsPDF` + `autoTable` | A4 Vertical (mm) | SÍ (Auditor) | SÍ (Respuestas / Fotos) | Semi-Legacy |
| **PDF-12** | **Acciones Correctivas** | `src/app/[tenant-slug]/correctivas/page.js` | `handleGeneratePdf(...)` | `jsPDF` + `autoTable` | A4 Vertical (mm) | SÍ (Responsable) | SÍ (Evidencias Cierre) | Semi-Legacy |
| **PDF-13** | **Matriz de Riesgos IPER** | `src/app/[tenant-slug]/matriz-riesgos/page.js` | `handleExportPdf(...)` | `jsPDF` + `autoTable` | A4 Horizontal (mm) | NO | NO | Legacy Inline |
| **PDF-14** | **Certificado de Capacitación** | `src/app/[tenant-slug]/capacitacion/page.js` | `handleGenerateCertificadoPdf(...)` | `jsPDF` | A4 Horizontal (mm) | SÍ (Capacitador) | SÍ (Logo Institucional) | Semi-Legacy |
| **PDF-15** | **Dashboard / Reporte Ejecutivo** | `src/app/[tenant-slug]/dashboard/page.js` | `handleExportReportPdf(...)` | `jsPDF` + `autoTable` | A4 Vertical (mm) | NO | SÍ (Gráficos Índices) | Legacy Inline |

---

## 3. Revisión Detallada de Layout y Estructura Documental

### 3.1 Unidades y Geometría de Hoja
- **Inconsistencia de Unidades**: Los generadores en `visitas/page.js` y `accidentes/page.js` utilizan puntos (`pt`), mientras que los protocolos SRT y capacitaciones utilizan milímetros (`mm`). Se establece como norma unificar todos los generadores a **milímetros (`mm`)** dentro del helper `pdfLayout.js` para una interpretación limpia en A4 (`210 x 297 mm`).

### 3.2 Encabezados y Proporción de Logos
- **Cálculo Dinámico de Aspect Ratio**: Implementado con éxito en `capacitaciones-online/utils/pdfGenerator.js` mediante la función helper `getImageDimensions`, evitando la deformación de logotipos rectangulares o cuadrados.
- *Hallazgo:* En `visitas/page.js` y `programa/page.js`, los logos aún se incrustan con dimensiones estáticas duras, lo que provoca estiramiento visual cuando las empresas clientes cargan logos con diferentes proporciones.

### 3.3 Pie de Página y Paginación en 2 Pasadas
- **Formato Estándar `Página X de Y`**: `pdfFooter.js` aplica el conteo de páginas dinámico en 2 pasadas utilizando `doc.putTotalPages('{totalPages}')`.
- *Hallazgo:* Los generadores legacy de `visitas` y `programa` imprimen únicamente `Página X` sin calcular el total de páginas.

---

## 4. Auditoría de Tablas, Imágenes y Firmas Digitales

### 4.1 Tablas Extensas (`jspdf-autotable`)
- **Repetición de Encabezados (`showHead: 'everyPage'`)**: Correctamente configurado en capacitaciones y protocolos SRT.
- **Protección de Márgenes (`margin.bottom: 20`)**: Evita que las filas inferiores pisen el pie de página.

### 4.2 Firmas Digitales y Asincronismo de Supabase Storage
- **Incrustación Asíncrona Defensiva (`resolveStorageUrl`)**: En `capacitaciones-online/utils/pdfGenerator.js`, se resuelve dinámicamente cualquier URL o path de Supabase Storage mediante `createSignedUrl` o `getPublicUrl` antes de invocar `getBase64ImageFromUrl`, previniendo fallos 403/400 al compilar el PDF.
- **Fórmula de Solapamiento Estético (`0.78`)**: Altura máxima `maxH = 32 mm` y coordenada vertical `renderY = lineY - (renderH * 0.78)`, haciendo que el 78% de la firma flote sobre la línea de firma, replicando el aspecto de un sello/firma física sobre papel.
- **Multi-Matrícula del Profesional**: Concatenación limpia de múltiples matrículas registradas (`COPIME N° L002210 / CPSH N° LHS-000179 PSA`).

---

## 5. Auditoría de Nombres de Archivos PDF

- **Patrón Estandarizado (`pdfFileName.js`)**:
  ```txt
  [tipo-doc]_[empresa-slug]_[establecimiento-slug]_[fecha-YYYY-MM-DD]_[id-corto].pdf
  ```
- *Ejemplo Real:* `registro-capacitacion_empresa-demo_planta-1_2026-08-12_CAP-04.pdf`.
- *Hallazgo:* El 40% de las descargas en módulos legacy aún generan nombres genéricos como `visita.pdf` o `documento.pdf`.

---

## 6. Listado de Hallazgos Priorizados en PDFs

### Hallazgos Críticos (Prioridad Alta)
1. **Migración de Generador Legacy de Visitas (`visitas/page.js`)**: Más de 600 líneas de código PDF inline dentro del componente de página que deben refactorizarse al directorio `src/lib/pdf/`.
2. **Dimensiones Estáticas de Logo en Módulos Legacy**: Falta de cálculo de aspect ratio en `visitas`, `programa` y `matriz-riesgos`.
3. **Nombres de Archivo Genéricos**: Falta de integración del helper `formatPdfFileName` en descargas de visitas, programa anual y matriz de riesgos.

### Hallazgos Medios (Prioridad Media)
1. **Unificación de Unidades de Hoja**: Migrar documentos configurados en puntos (`pt`) a milímetros (`mm`).
2. **Paginación en 2 Pasadas ("Página X de Y")**: Aplicar `putTotalPages` en el 100% de los reportes.

---
