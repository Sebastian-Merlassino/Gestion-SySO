# Informe de Auditoría Específica de Documentos PDF y Reportes Técnicos — Gestión SySO

**Fecha de Auditoría:** 16 de Agosto de 2026  
**Auditor Senior:** Especialista Senior en Generación Documental, Reportes PDF & Impresión  
**Estado de la Intervención:** Auditoría Pasiva de Diagnóstico (Sin modificación de código fuente)  
**Proyecto:** SaaS Gestión SySO (Gestión Integral de Higiene, Seguridad y Salud Ocupacional)  
**Motores de Generación y Render:** `jsPDF` ^4.2.1, `jspdf-autotable` ^5.0.8, `pdf-lib` ^1.17.1, `pdfjs-dist` ^6.2.108.

---

## 1. Resumen Ejecutivo

### 1.1 Diagnóstico General de la Arquitectura Documental PDF
La generación de documentos PDF es uno de los componentes más críticos y de mayor valor operativo en **Gestión SySO**. La plataforma emite constancias legales, protocolos oficiales exigidos por la Superintendencia de Riesgos del Trabajo (SRT) y el Ministerio de Trabajo de la República Argentina, informes de investigación de accidentes, registros de capacitación y matrices de riesgo.

La plataforma cuenta con un conjunto de utilidades centralizadas en `src/lib/pdf/`:
- `pdfTheme.js`: Tokens de color RGB y conversores seguros Hex -> RGB para evitar rellenos negros en jsPDF.
- `pdfHeader.js`: Generador de cabecera con logotipo institucional, títulos y metadatos.
- `pdfFooter.js`: Generador de pie de página en 2 pasadas (`Página X de Y`), datos de contacto del tenant y líneas divisorias.
- `pdfLayout.js`: Constantes de geometría de página en A4 y fábrica de instancias `createPdfDocument`.
- `pdfSignatures.js`: Bloque estandarizado de firmas digitales con soporte para firma en base64 y aclaraciones.
- `pdfImages.js`: Carga asíncrona de URLs a base64 y cálculo de proporciones de aspecto (`calculateAspectRatioFit`).
- `pdfTableStyles.js`: Opciones predefinidas para tablas `jspdf-autotable` (`theme: 'grid'`, `showHead: 'everyPage'`).
- `pdfFileName.js`: Sanitizador de cadenas Unicode y formateador unificado de nombres de archivo.

---

### 1.2 Principales Fortalezas y Avances Técnicos

1. **Cumplimiento Normativo de Vanguardia en Capacitaciones Online (`capacitaciones-online/utils/pdfGenerator.js`):**
   - Adecuado a la Disposición SRT 2/22 y Resolución 48/25.
   - Paginación automática calculada a razón de exactamente 15 asistentes por foja oficial.
   - Cálculo dinámico de aspect ratio en logotipo institucional (`getImageDimensions`).
   - Resolución asíncrona robusta de firmas y storage mediante `resolveStorageUrl` (`createSignedUrl` / `getPublicUrl`).
   - Bloque de firma del capacitador con límitación de altura (`maxH = 30 mm`) y fórmula de solapamiento estético `0.78` sobre el renglón.
   - Paginación exacta en 2 pasadas (`Página X de Y`).
   - Concatenación de multi-matrícula del profesional interviniente (ej. `COPIME N° L002210 / CPSH N° LHS-000179 PSA`).

2. **Protocolo Oficial de Puesta a Tierra Res. SRT 900/15 (`protocolos/puesta-a-tierra/utils/pdfGenerator.js`):**
   - Estructura exacta de 6 carillas normativas (Carátula, Marco Legal Dec. 351/79, Anexo Fotográfico, Hoja 1 Datos e Instrumental, Hoja 2 Tabla de Jabalinas y Continuidad, Hoja 3 Análisis y Conclusiones).
   - Generación en milímetros (`mm`) sobre hoja A4.

3. **Protocolos de Ruido (Res. 85/12) e Iluminación (Res. 84/12) con Fusión de Certificados (`pdf-lib`):**
   - Utilizan `pdf-lib` para fusionar al final del protocolo los certificados de calibración del instrumental en PDF adjuntos por el usuario.

---

### 1.3 Principales Desviaciones y Hallazgos Críticos en PDFs

| Hallazgo / Desviación | Diagnóstico Técnico | Impacto Documental | Severidad |
|---|---|---|:---:|
| **Generación PDF Inline en Archivos de Página (`page.js`)** | Aproximadamente el 55% de los módulos (ej. `extintores`, `control-electrico`, `checklist-personalizados`, `correctivas`, `matriz-riesgos`, `programa`, `accidentes`) tienen entre 300 y 600 líneas de código PDF embebidas dentro del componente React de la página. | Dificultad de mantenimiento, duplicación de helpers de formateo y sobrecarga del bundle del cliente. | **Alta** |
| **Inconsistencia en Unidades de Medida (`pt` vs `mm`)** | Coexistencia no normada: mientras los protocolos SRT y capacitaciones online operan en milímetros (`unit: 'mm'`), `visitas`, `extintores`, `control-electrico`, `accidentes` y `avisos` operan en puntos (`unit: 'pt'`). | Dificultad para compartir helpers de maquetación de `src/lib/pdf/` que esperan coordenadas unificadas. | **Alta** |
| **Colores no Institucionales Hardcodeados** | En `extintores/page.js` se detectó el uso de `headStyles: { fillColor: [68, 114, 196] }` (color azul `#4472C4` predeterminado de Microsoft Office) en lugar de la paleta oficial `#468DFF` (`[70, 141, 255]`). | Ruptura de la identidad visual de la marca en reportes entregados a clientes. | **Alta** |
| **Deformación de Logotipos en Módulos Legacy** | En `visitas`, `programa` y `matriz-riesgos` los logotipos se dibujan con dimensiones estáticas duras (ej. `80 x 35 pt` o `142 x 78 pt`) sin calcular el ratio real de la imagen. | Logotipos cuadrados o apaisados de empresas clientes resultan estirados o achatados. | **Alta** |
| **Paginación Incompleta ("Página X" vs "Página X de Y")** | Varios generadores legacy imprimen únicamente el número de página actual sin ejecutar el bucle en 2 pasadas con `getNumberOfPages()` o `putTotalPages()`. | Falta de validez formal en auditorías legales y peritajes donde se exige certificar el total de fojas del reporte. | **Media** |
| **Nombres de Archivo Genéricos** | En algunos módulos legacy la descarga produce nombres estáticos como `visita.pdf` o `informe.pdf` en lugar de invocar `formatPdfFileName`. | Confusión al archivar múltiples documentos en la computadora del cliente. | **Media** |

---

## 2. Inventario Completo de Generadores PDF en el Sistema

A continuación se presenta el inventario exhaustivo de los **18 puntos de generación de PDF** relevados en la plataforma:

| ID | Documento / Reporte | Ubicación en el Código | Función Generadora | Unidad | Orientación | Firmas Digitales | Evidencias / Fotos | Estado Arquitectónico |
|---|---|---|---|---|---|---|---|---|
| **PDF-01** | **Constancia de Visita Técnica** | `visitas/utils/pdfGenerator.js` | `generateVisitaPdf(...)` | `pt` | A4 Vertical | SÍ (Profesional + Cliente) | NO | Migrado a utils (Requiere unificar a `mm`) |
| **PDF-02** | **Registro de Capacitación HSYST** | `capacitaciones-online/utils/pdfGenerator.js` | `generateCapacitacionOnlinePdf(...)` | `mm` | A4 Vertical | SÍ (Capacitador + 15 Asist./hoja) | NO | **Excelente / Normativo (SRT 2/22)** |
| **PDF-03** | **Protocolo de Ruido (Res. SRT 85/12)**| `protocolos/ruido/utils/pdfGenerator.js` | `generateNoiseProtocolPdf(...)` | `mm` | A4 Vert / Horiz | SÍ (Profesional) | SÍ (Croquis + `pdf-lib` merge) | Avanzado (1447 líneas en utils) |
| **PDF-04** | **Protocolo Iluminación (Res. SRT 84/12)**| `protocolos/iluminacion/utils/pdfGenerator.js` | `generateLightingProtocolPdf(...)` | `mm` | A4 Vert / Horiz | SÍ (Profesional) | SÍ (Puntos lux + `pdf-lib` merge)| Avanzado (1850 líneas en utils) |
| **PDF-05** | **Protocolo Ergonomía (Res. SRT 886/15)**| `protocolos/ergonomia/utils/pdfGenerator.js` | `generateErgoProtocolPdf(...)` | `mm` | A4 Vert / Horiz | SÍ (Profesional) | SÍ (Fotos puesto NAM/RULA/REBA) | Avanzado (Multi-anexo SRT) |
| **PDF-06** | **Protocolo Puesta a Tierra (Res. 900/15)**| `protocolos/puesta-a-tierra/utils/pdfGenerator.js`| `generatePuestaATierraPdf(...)` | `mm` | A4 Vertical | SÍ (Profesional) | SÍ (Jabalinas + Croquis) | **Excelente (6 carillas normativas)**|
| **PDF-07** | **Programa Anual de Gestión** | `programa/page.js` (Línea 631) | `handleExportPdfReport(...)` | `pt` | A4 Horizontal | NO | NO | Legacy Inline en `page.js` |
| **PDF-08** | **Investigación de Accidentes (Informe)**| `accidentes/page.js` (Línea 2025) | `generateTechnicalReportPdfDoc(...)`| `pt` | A4 Vertical | SÍ (Responsable + Técnico) | SÍ (Fotos accidente) | Legacy Inline en `page.js` |
| **PDF-09** | **Investigación de Accidentes (Legacy)** | `accidentes/page.js` (Línea 1120) | `handleExportTechnicalReportPdfOLD(...)`| `pt`| A4 Vertical | SÍ (Responsable) | SÍ (Fotos) | Legacy Inline (Obsoleto) |
| **PDF-10** | **Avisos de Riesgo / Hallazgos** | `avisos/page.js` (Línea 1094) | `generateAvisoPdf(...)` | `pt` | A4 Vertical | SÍ (Inspector) | SÍ (Fotos hallazgos) | Semi-Legacy Inline en `page.js` |
| **PDF-11** | **Control de Instalaciones Eléctricas** | `control-electrico/page.js` (Línea 1197)| `handleExportPdfReport(...)` | `pt` | A4 Vertical | SÍ (Profesional) | SÍ (Anexo fotográfico) | Semi-Legacy Inline en `page.js` |
| **PDF-12** | **Control de Extintores / Ignífugos** | `extintores/page.js` (Línea 570) | `handleExportPdfReport(...)` | `pt` | A4 Horizontal | NO | SÍ (Miniaturas por equipo) | Legacy Inline en `page.js` |
| **PDF-13** | **Checklist Personalizado** | `checklist-personalizados/page.js` (L. 1189)| `handleExportPdfReport(...)` | `pt` | A4 Vertical | SÍ (Auditor) | SÍ (Fotos respuestas) | Semi-Legacy Inline en `page.js` |
| **PDF-14** | **Acciones Correctivas** | `correctivas/page.js` (Línea 663) | `handleExportPdfReport(...)` | `pt` | A4 Horizontal | NO | SÍ (Fotos desvíos/cierre) | Legacy Inline en `page.js` |
| **PDF-15** | **Matriz de Riesgos IPER** | `matriz-riesgos/page.js` (Línea 714) | `handleExportPdfReport(...)` | `pt` | A4 Horizontal | NO | NO | Legacy Inline en `page.js` |
| **PDF-16** | **Programa de Capacitación Presencial** | `capacitacion/page.js` (Línea 547) | `handleExportPdfReport(...)` | `pt` | A4 Horizontal | NO | NO | Legacy Inline en `page.js` |
| **PDF-17** | **Reporte Ejecutivo Dashboard** | `dashboard/page.js` (Línea 833) | `handleExportPdfReport(...)` | `pt` | A4 Vertical | NO | NO | Legacy Inline en `page.js` |
| **PDF-18** | **Fábrica Global de PDF** | `src/lib/pdf/pdfLayout.js` (Línea 33) | `createPdfDocument(...)` | `pt` | A4 Vert / Horiz | SÍ (Modular) | SÍ (Modular) | **Helper Centralizado** |

---

## 3. Revisión Detallada de Layout, Estructura y Elementos Gráficos

### 3.1 Unidades de Medida y Dimensiones de Hoja
- **Norma Internacional A4:** `210 x 297 mm` (en vertical) o `297 x 210 mm` (en horizontal).
- **Problema de Puntos vs Milímetros:**  
  En puntos (`pt`), A4 equivale a `595.28 x 841.89 pt`. Los generadores en `pt` utilizan redondeos arbitrarios (`595 x 842 pt`, `596 x 842 pt` o `612 x 792 pt`), lo que genera ligeros desajustes al imprimir en impresoras con márgenes físicos fijos.  
  *Recomendación:* Estandarizar el 100% de los generadores a **milímetros (`mm`)**.

---

### 3.2 Encabezados Institucionales y Logotipos

1. **Cálculo de Proporción de Aspecto (Aspect Ratio):**
   - Los generadores avanzados (`capacitaciones-online` y `protocolos`) implementan:
     ```javascript
     function getImageDimensions(base64) {
       return new Promise((resolve) => {
         const img = new Image();
         img.onload = () => resolve({ width: img.width, height: img.height });
         img.src = base64;
       });
     }
     ```
   - Calculan `renderW` y `renderH` respetando los límites de la caja (`maxW = 60 mm`, `maxH = 20 mm`) sin deformar la imagen.
2. **Desviaciones en Módulos Legacy:**
   - En `visitas` se inyecta `doc.addImage(logoBase64, 'PNG', 63.85, 22.11, 142.5, 78.31)`, forzando una relación `1.82:1` independientemente de si el logo es cuadrado o rectangular.

---

### 3.3 Pie de Página y Numeración Dinámica

1. **Formato Estándar Oficial:**
   - Línea divisoria superior de `0.35 mm` en Azul Corporativo `#468DFF` (`[70, 141, 255]`).
   - Datos institucionales centrados: `[Nombre Comercial / Consultora]  •  Tel: [teléfono]  •  Email: [email]`.
   - Numeración en dos pasadas a la derecha: `Página X de Y`.
2. **Implementación de 2 Pasadas:**
   ```javascript
   const totalPages = doc.internal.getNumberOfPages();
   for (let i = 1; i <= totalPages; i++) {
     doc.setPage(i);
     doc.text(`Página ${i} de ${totalPages}`, pageWidth - marginRight, footerY, { align: 'right' });
   }
   ```
   *Hallazgo:* Módulos como `programa`, `extintores` y `dashboard` usan `pageNum` en un hook de una sola pasada, omitiendo el `de Y`.

---

### 3.4 Tablas Técnicas (`jspdf-autotable`)

1. **Protección contra Ruptura de Página (`showHead: 'everyPage'`):**
   - Garantiza que al desbordar el contenido hacia una foja siguiente, la cabecera de la tabla se repita automáticamente con sus títulos y anchos de columna.
2. **Protección de Márgenes Inferiores (`margin: { bottom: 22 }`):**
   - Evita que las últimas filas de datos pisen la línea divisoria del pie de página.
3. **Colores de Cabecera:**
   - Todas las tablas deben usar `fillColor: [70, 141, 255]` (`#468DFF`) con texto blanco en negrita, y filas alternadas `bgAltRow: [248, 250, 252]` (`#F8FAFC`).

---

### 3.5 Firmas Digitales y Asincronismo de Supabase Storage

1. **Fórmula de Solapamiento Estético (`0.78`):**
   - Para replicar la firma física real sobre papel:
     ```javascript
     const lineY = boxY + 24; // Línea de firma
     const renderY = lineY - (renderH * 0.78); // El 78% de la firma flota sobre la línea
     doc.addImage(firmaBase64, 'PNG', renderX, renderY, renderW, renderH, undefined, 'FAST');
     ```
2. **Resolución Asíncrona Defensiva (`resolveStorageUrl`):**
   - Convierte paths relativos o URLs públicas/privadas de Supabase Storage (`signatures`, `documents`, `logos`) en URLs firmadas accesibles mediante `createSignedUrl(path, 3600)` antes de convertirlas a Base64 con `fetch` y `FileReader`.
3. **Mapeo Multi-Matrícula:**
   - Consulta a la tabla `matriculas` en Supabase para concatenar todas las matrículas habilitadas del profesional interviniente (`COPIME N° L002210 / CPSH N° LHS-000179 PSA`).

---

### 3.6 Formato y Nombres de Archivo PDF (`pdfFileName.js`)

**Estándar Obligatorio:**
```txt
[tipo-doc]_[empresa-slug]_[establecimiento-slug]_[fecha-YYYY-MM-DD]_[id-corto].pdf
```

*Ejemplos Oficiales:*
- `constancia-visita_acme-sa_planta-norte_2026-08-16_VIS-104.pdf`
- `registro-capacitacion_logistica-sur_centro-distribucion_2026-08-16_CAP-12.pdf`
- `protocolo-puesta-a-tierra_metalurgica-central_planta-1_2026-08-16_PAT-03.pdf`
- `aviso-riesgo_industrias-rio_planta-quilmes_2026-08-16_AR-008.pdf`

---

## 4. Matriz de Hallazgos Priorizados en PDFs

### Hallazgos de Severidad Alta (Prioridad 1)
1. **Desacoplamiento de Generadores Inline en `page.js`**: Refactorizar las funciones de PDF de `extintores`, `control-electrico`, `checklist-personalizados`, `correctivas`, `matriz-riesgos`, `programa` y `accidentes` a módulos dedicados en `src/lib/pdf/` o subcarpetas `utils/pdfGenerator.js`.
2. **Unificación Global a Milímetros (`mm`)**: Migrar todos los documentos que utilizan puntos (`pt`) a milímetros para asegurar medidas estandarizadas A4 (`210 x 297 mm`).
3. **Corrección de Colores Hardcodeados en Extintores**: Reemplazar `fillColor: [68, 114, 196]` por el Azul Institucional `PDF_THEME.primary` (`[70, 141, 255]`).
4. **Cálculo Dinámico de Aspect Ratio para Logotipos**: Aplicar `getImageDimensions` en todos los generadores para erradicar el estiramiento de logotipos en `visitas`, `programa` y `matriz-riesgos`.

### Hallazgos de Severidad Media (Prioridad 2)
1. **Paginación Uniforme en 2 Pasadas (`Página X de Y`)**: Implementar `doc.internal.getNumberOfPages()` y el footer estandarizado en el 100% de los reportes descargables.
2. **Adopción Universal de `formatPdfFileName`**: Reemplazar nombres de archivo fijos (`visita.pdf`, `informe.pdf`) por el formateador estandarizado que incluye tipo, empresa, establecimiento, fecha e ID.
3. **Incorporación de Alertas Toast Estandarizadas**: Garantizar que todas las descargas e impresiones de PDF disparen el ciclo de toasts normativo (`info` al iniciar -> `success` al finalizar).

---
