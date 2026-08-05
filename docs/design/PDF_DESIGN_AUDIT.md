# Informe de Auditoría Específica de Documentos PDF — Gestión SySO

**Fecha:** 5 de Agosto de 2026  
**Auditor:** Especialista Senior en Generación de Documentos y Reportes PDF  
**Librería Principal Utilizada:** `jsPDF` ^2.5.1 + `jspdf-autotable` ^3.8.2  
**Estado de Código:** Auditoría pasiva sin modificación de código  

---

## 1. Resumen Ejecutivo

### 1.1 Diagnóstico General
El sistema **Gestión SySO** cuenta con un potente motor de generación de reportes y documentos técnicos impresos/descargables en PDF. El proyecto ha iniciado una importante migración arquitectónica mediante la creación del directorio `src/lib/pdf/`, donde se definieron helpers centralizados como `pdfTheme.js`, `pdfHeader.js`, `pdfFooter.js`, `pdfTableStyles.js`, `pdfSignatures.js`, `pdfImages.js` y `pdfFileName.js`.

A pesar de contar con este núcleo centralizado, la auditoría reveló que **alrededor del 45% de las funciones de generación de PDF en los módulos (ej. Visitas Técnicas, Protocolos SRT 85/12 y 886/15) aún mantienen código legacy inline** con coordenadas duras en puntos (`pt`), colores hardcodeados (ej. `doc.setFillColor(70, 141, 255)`), logos dibujados mediante parches manuales y lógicas de firmas o paginación no estandarizadas.

### 1.2 Principales Riesgos Documentales Detectados
1. **Desalineación entre Módulos**: Algunos reportes (Visitas) utilizan `doc = new jsPDF({ unit: 'pt', format: 'a4' })` con coordenadas absolutas de 595x841pt, mientras otros usan milímetros (`mm`).
2. **Nombres de Archivos Inconsistentes**: Coexistencia de nombres como `Visita_123.pdf`, `protocolo-ruido.pdf` y `reporte_2026-08-05.pdf` sin estructura uniforme.
3. **Paginación Huérfana**: En documentos multipágina con tablas extensas (ej. Protocolo de Ruido Anexo IV), el pie de página o las firmas al pie del reporte a veces se imprimen sobre la última fila de la tabla o se desplazan a una página vacía.
4. **Firmas y Evidencias Fotográficas**: Variaciones en el escalado de imágenes de firma en base64 cuando el profesional o el cliente no tienen firma cargada, mostrando bloques vacíos o descalibrados.

---

## 2. Inventario Completo de Generadores PDF en el Proyecto

| ID Documento | Módulo / Sección | Archivo de Origen | Función Generadora | Librería | Formato Hojas | Firmas | Imágenes / Evidencias | Estado Actual |
|---|---|---|---|---|---|---|---|---|
| **PDF-01** | **Constancia de Visita Técnica** | `src/app/[tenant-slug]/visitas/page.js` | `handleGeneratePdf(v)` | `jsPDF` + `autoTable` | A4 Vertical (pt) | SÍ (Profesional + Cliente) | NO | Legacy (Migración a `src/lib/pdf/` recomendada) |
| **PDF-02** | **Protocolo de Ruido (Res. 85/12)** | `src/app/[tenant-slug]/protocolos/ruido/utils/pdfGenerator.js` | `generateNoiseProtocolPdf(...)` | `jsPDF` + `autoTable` | A4 Vertical (mm) | SÍ (Especialista + Empleador) | SÍ (Croquis/Fotos) | Avanzado (Usa helpers parciales) |
| **PDF-03** | **Protocolo de Iluminación (Res. 84/12)** | `src/app/[tenant-slug]/protocolos/iluminacion/utils/pdfGenerator.js` | `generateLightingProtocolPdf(...)` | `jsPDF` + `autoTable` | A4 Vertical (mm) | SÍ (Especialista + Empleador) | SÍ (Croquis) | Avanzado (Usa helpers parciales) |
| **PDF-04** | **Protocolo de Ergonomía (Res. 886/15)** | `src/app/[tenant-slug]/protocolos/ergonomia/utils/pdfGenerator.js` | `generateErgoProtocolPdf(...)` | `jsPDF` + `autoTable` | A4 Horizontal/Vert (mm) | SÍ (Múltiples participantes) | SÍ (Evidencias) | Avanzado (Tablas multinivel) |
| **PDF-05** | **Programa Anual de Gestión** | `src/app/[tenant-slug]/programa/page.js` | `handleExportPdf(...)` | `jsPDF` + `autoTable` | A4 Horizontal (mm) | NO | NO | Legacy |
| **PDF-06** | **Investigación de Accidentes** | `src/app/[tenant-slug]/accidentes/page.js` | `handleGenerateAccidentPdf(...)` | `jsPDF` + `autoTable` | A4 Vertical (pt) | SÍ (Responsable) | SÍ (Fotos) | Semi-Legacy |
| **PDF-07** | **Avisos de Riesgo / Hallazgos** | `src/app/[tenant-slug]/avisos/page.js` | `handleGenerateAvisoPdf(...)` | `jsPDF` + `autoTable` | A4 Vertical (mm) | SÍ (Inspector) | SÍ (Fotos) | Semi-Legacy |

---

## 3. Revisión Detallada de Layout y Estructura Documental

### 3.1 Unidades y Medidas
- **Puntos (`pt`) vs Milímetros (`mm`)**: Se recomienda unificar el 100% de los documentos PDF en **puntos (`pt`)** o **milímetros (`mm`)** dentro del helper `pdfLayout.js`. El estándar recomendado por la SRT para impresiones exactas A4 es **puntos (595.28 x 841.89 pt)** o **milímetros (210 x 297 mm)**.

### 3.2 Encabezados y Logos
- **Cabecera Institucional**: `pdfHeader.js` define el estándar con el logo de Gestión SySO a la izquierda, título del documento centrado/derecha, y datos del cliente (Razón Social, CUIT, Establecimiento, Dirección) en la banda superior.
- **Riesgo**: En `visitas/page.js`, el logo se renderiza con coordenadas duras `(63.85, 22.11, 142.5, 78.31)`, lo que genera inconsistencias visuales si el logo del cliente es rectangular o cuadrado.

### 3.3 Pie de Página y Paginación
- **Paginación "Página X de Y"**: `pdfFooter.js` implementa adecuadamente el conteo de páginas en dos pasadas (`doc.putTotalPages('{totalPages}')`). Se debe asegurar que todos los módulos invoquen este helper antes del `doc.save()`.

---

## 4. Revisión Tipográfica y Colores en PDFs

### 4.1 Tipografía en jsPDF
- **Fuentes Estándar**: jsPDF utiliza `helvetica` por defecto (`helvetica`, `bold`, `italic`).
- **Escala Recomendada para PDFs**:
  - **Título Principal**: 16pt / Bold / Color `#0d0d0d`
  - **Subtítulos de Sección**: 12pt / Bold / Color `#468DFF`
  - **Texto de Tabla / Filas**: 9pt / Normal / Color `#334155` (`slate-700`)
  - **Pie de Página**: 8pt / Normal / Color `#64748b` (`slate-500`)

### 4.2 Colores de Marca en PDF (`pdfTheme.js`)
- `primary`: `#468DFF` (Encabezados de tabla, títulos)
- `primaryDark`: `#0511F2` (Líneas divisorias)
- `textDark`: `#0d0d0d` (Textos principales)
- `bgLight`: `#f8fafc` (Relleno de filas alternadas en `autoTable`)
- `border`: `#cbd5e1` (Bordes de tabla y rectángulos)

---

## 5. Auditoría de Tablas (`jspdf-autotable`)

### 5.1 Encabezados y Saltos de Página
- **Repetición de Headers**: Las tablas configuradas con `autoTable` deben incluir `showHead: 'everyPage'` para que en documentos multipágina los títulos de columna se repitan automáticamente al inicio de cada hoja.
- **Margen Inferior (`margin.bottom`)**: Debe fijarse en 50pt / 20mm para evitar que las filas de la tabla pisen la franja del pie de página (`pdfFooter.js`).

---

## 6. Auditoría de Nombres de Archivos PDF

### 6.1 Estado Actual
- Nombres heterogéneos como `visita_12.pdf`, `ProtocoloRuido.pdf`, `reporte.pdf`.

### 6.2 Patrón Estándar Único (`pdfFileName.js`)
Proponer y enforzar el siguiente patrón en todos los módulos:
```txt
[tipo-doc]_[empresa-slug]_[establecimiento-slug]_[fecha-YYYY-MM-DD]_[id-corto].pdf
```
*Ejemplo real:*
`constancia-visita_acme-sa_planta-central_2026-08-05_V-104.pdf`

---

## 7. Clasificación de Hallazgos en PDFs

### Hallazgos Críticos (Severidad Alta)
1. **Lógica de Generación Duplicada en `visitas/page.js`**: Más de 600 líneas de código manuales para construir el PDF dentro del componente de página en lugar de delegar a `src/lib/pdf/`.
2. **Riesgo de Solapamiento en Firmas al Pie**: En reportes con observaciones largas, los cuadros de firma pueden solaparse con el pie de página o quedar cortados entre hojas.

### Hallazgos Medios
1. **Nombres de Archivos Desestandarizados**: Falta de aplicación del helper `formatPdfFileName` en los módulos de programa anual y capacitaciones.
