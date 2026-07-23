# Auditoría de Diseño Documental y Documentos PDF — Gestión SySO

## 1. Resumen Ejecutivo PDF

Se realizó un relevamiento exhaustivo de todos los componentes, funciones y rutas dentro del SaaS **Gestión SySO** que generan documentos PDF descargables, imprimibles o de previsualización.

* **Cantidad de PDFs detectados**: Se identificaron 12 documentos PDF operativos generados a través de las distintas secciones del sistema.
* **Módulos que generan PDFs**:
  1. `visitas` — Constancia de Visita Técnica de Seguridad e Higiene.
  2. `protocolos/iluminacion` — Protocolo de Medición de Iluminación (Res. SRT 84/2012 / Dec. 351/79).
  3. `programa` — Reporte del Programa Anual de Prevención.
  4. `matriz-riesgos` — Matriz de Identificación de Peligros y Evaluación de Riesgos (IPER).
  5. `extintores` — Registro y Control Periódico de Extintores.
  6. `dashboard` — Informe Resumen de Indicadores y Estado del Tenant.
  7. `control-electrico` — Inspección y Control de Instalaciones Eléctricas.
  8. `correctivas` — Plan y Seguimiento de Acciones Correctivas.
  9. `checklist-personalizados` — Reportes de Inspecciones Personalizadas.
  10. `capacitacion` — Constancia y Registro de Capacitación de Personal.
  11. `avisos` — Avisos de Riesgo y Notificaciones Preventivas.
  12. `accidentes` — Informe de Investigación de Accidentes e Incidentes (con Análisis de 5 Porqués).
* **Librerías utilizadas**: `jsPDF` y `jspdf-autotable` (ambas importadas dinámicamente mediante `await import()` client-side).
* **Estado general de consistencia documental**: Heterogéneo y atomizado. Si bien los documentos más recientes (como el Protocolo de Iluminación y la Constancia de Visita) cuentan con maquetaciones avanzadas, el resto de los módulos duplica la lógica de dibujo, usa diferentes sistemas de unidades (`pt` vs `mm`), paletas de color dispares, headers no normalizados y sistemas de paginación inconsistentes.
* **Principales problemas visuales**:
  - Incompatibilidad nativa en `jsPDF` al pasar cadenas hexadecimales a `setFillColor(hexString)` (pueden renderizar rellenos negros por error de tipo si no se convierten a enteros RGB `(r, g, b)`).
  - Títulos e imágenes desbordadas por falta de envoltorio y truncamiento matemático uniforme.
  - Logos con proporciones deformadas o escalado desigual.
* **Principales problemas técnicos**:
  - Paginación trunca: varios PDFs usan `Página ${i}` sin el total de páginas `Y` (`Página X de Y`) por falta de invocación de `doc.putTotalPages()`.
  - Duplicación de lógica de firma y descarga en más de 10 archivos de vista (`page.js`).
* **Principales riesgos de impresión**:
  - Tablas con columnas que se cortan en margen derecho en A4 vertical.
  - Firmas o bloques de observaciones huérfanos al final de hoja sin salto de página inteligente (`pageBreak: 'auto'`).
* **Documentos críticos a normalizar primero**:
  1. Constancia de Visita Técnica (`visitas`)
  2. Protocolo de Iluminación (`protocolos/iluminacion`)
  3. Avisos de Riesgo (`avisos`)
  4. Investigación de Accidentes (`accidentes`)
  5. Control de Instalaciones Eléctricas (`control-electrico`)

---

## 2. Inventario Completo de PDFs Generados

| ID | Documento | Módulo | Archivo Origen | Función Generadora | Librería | Estado | Riesgo |
|---|---|---|---|---|---|---|---|
| **PDF-01** | Constancia de Visita Técnica | Visitas | `src/app/[tenant-slug]/visitas/page.js` | `handleGeneratePdf` / `handlePreviewPdf` | jsPDF + autoTable | Bueno | Medio |
| **PDF-02** | Protocolo de Medición de Iluminación | Iluminación | `src/app/[tenant-slug]/protocolos/iluminacion/utils/pdfGenerator.js` | `generateLightingProtocolPdf` | jsPDF + autoTable | Excelente | Bajo |
| **PDF-03** | Reporte Programa Anual | Programa Anual | `src/app/[tenant-slug]/programa/page.js` | `handleGeneratePdf` | jsPDF + autoTable | Regular | Medio |
| **PDF-04** | Matriz de Riesgos IPER | Matriz Riesgos | `src/app/[tenant-slug]/matriz-riesgos/page.js` | `handleGeneratePdf` | jsPDF + autoTable | Regular | Alto |
| **PDF-05** | Control Periódico de Extintores | Extintores | `src/app/[tenant-slug]/extintores/page.js` | `handleGeneratePdf` | jsPDF + autoTable | Regular | Medio |
| **PDF-06** | Informe Resumen Dashboard | Dashboard | `src/app/[tenant-slug]/dashboard/page.js` | `handleGeneratePdf` | jsPDF + autoTable | Regular | Medio |
| **PDF-07** | Inspección Control Eléctrico | Control Eléctrico | `src/app/[tenant-slug]/control-electrico/page.js` | `handleGeneratePdf` | jsPDF + autoTable | Bueno | Medio |
| **PDF-08** | Plan Acciones Correctivas | Correctivas | `src/app/[tenant-slug]/correctivas/page.js` | `handleGeneratePdf` | jsPDF + autoTable | Regular | Medio |
| **PDF-09** | Reporte Checklist Personalizado | Checklists | `src/app/[tenant-slug]/checklist-personalizados/page.js` | `handleGeneratePdf` | jsPDF + autoTable | Regular | Medio |
| **PDF-10** | Constancia de Capacitación | Capacitación | `src/app/[tenant-slug]/capacitacion/page.js` | `handleGeneratePdf` | jsPDF + autoTable | Bueno | Medio |
| **PDF-11** | Aviso de Riesgo y Notificación | Avisos | `src/app/[tenant-slug]/avisos/page.js` | `generateAvisoPdf` | jsPDF + autoTable | Bueno | Medio |
| **PDF-12** | Informe Investigación de Accidente | Accidentes | `src/app/[tenant-slug]/accidentes/page.js` | `handleGeneratePdf` | jsPDF + autoTable | Bueno | Alto |

---

## 3. Revisión de Layout Documental

* **Tamaño de Hoja**: Se utiliza el formato **A4** (210 x 297 mm o 595.28 x 841.89 pt) en todos los módulos.
* **Orientación**:
  - Vertical (`portrait`) por defecto en 10 módulos.
  - Horizontal (`landscape`) en tablas complejas como las Fichas Generales de Medición de Iluminación y Matriz de Riesgos IPER.
* **Márgenes**:
  - Inconsistencia en las unidades de medida: `protocolos/iluminacion` utiliza milímetros (`unit: 'mm'`) con márgenes de 10-15 mm.
  - El resto de los módulos utiliza puntos (`unit: 'pt'`) con márgenes de 30-40 pt.
* **Encabezados y Logos**:
  - Todos los documentos intentan obtener el logo corporativo (`tenant.logo_1_url` o fallback `/brand/logo-primary.png`).
  - No todos los módulos calculan la relación de aspecto `(width / height)` de la imagen antes de dibujarla con `doc.addImage`, lo que provoca logos estirados o aplastados en algunos visores.
* **Pie de Página**:
  - `iluminacion` y `visitas` implementan una barra inferior corporativa en `#468DFF` con datos institucionales centralizados.
  - Otros módulos solo escriben texto simple sin separadores visuales.

---

## 4. Revisión Tipográfica de PDFs

| Uso | Tamaño Actual | Peso | Documento | Problema | Recomendación |
|---|---|---|---|---|---|
| **Título Principal Documento** | 16pt a 20pt / 34pt en portada | Bold / ExtraBold | Todos los PDFs | Variación en jerarquía y tamaños entre portadas y encabezados simples. | Estandarizar Título Principal en 16pt (Encabezado) / 28pt (Portada). |
| **Subtítulos y Secciones** | 10pt a 12pt | Bold | `visitas`, `avisos`, `electrico` | Inconsistencia en case (mayúsculas vs Title Case). | Estandarizar Secciones en 11pt Bold UPPERCASE. |
| **Texto de Cuerpo / Datos** | 8pt a 10pt | Normal | Todos | Algunos textos comprimidos en 8pt son difíciles de leer al imprimir. | Texto normal a 9.5pt en cuerpo y 9pt en tablas. |
| **Tablas (Header)** | 8pt a 10pt | Bold | `programa`, `extintores`, `matriz` | Encabezados de tabla con tamaños dispares y sin uppercase estandarizado. | Encabezado de tabla a 8.5pt Bold UPPERCASE. |
| **Tablas (Celdas)** | 7pt a 9pt | Normal | `matriz-riesgos`, `iluminacion` | Celdas con datos densos a 7pt resultan muy pequeñas en papel impreso. | Mantener mínimo 8pt en celdas extensas. |
| **Pies de Página / Leyendas** | 7.5pt a 8.5pt | Normal / Italic | Todos | Inconsistencia en la sintaxis de numeración de página. | Pie de página a 8pt con sintaxis `"Página X de Y"`. |

---

## 5. Revisión de Colores en PDFs

| Color Hex | Uso | Documento | Pertenece a Marca | Problema | Recomendación |
|---|---|---|---|---|---|
| **`#468DFF`** | Encabezados, barras de acento, bordes | `visitas`, `iluminacion`, `electrico` | **Sí** (Principal) | Invocado a veces como string hexadecimal directo a `doc.setFillColor('#468DFF')`. | Usar helper RGB `(70, 141, 255)`. |
| **`#0511F2`** | Resaltados, títulos secundarios | `iluminacion`, `visitas` | **Sí** (Highlight) | Invocación en string hexadecimal directo en algunos handlers. | Usar helper RGB `(5, 17, 242)`. |
| **`#0F172A` / `#000000`** | Texto principal | Todos | **Sí** | En algunos módulos el texto de tabla es gris tenue en lugar de negro legible. | Usar `#0D0D0D` / RGB `(13, 13, 13)` para contraste impreso. |
| **`#D9D9D9` / `#F8FAFC`** | Fondos de cabecera de tabla | `iluminacion`, `visitas` | **Sí** (Gris Secundario) | Incompatibilidad previa en `jsPDF` renderizaba fondo negro por usar hex sin convertir a RGB. | Usar helper `setFillColorHex('#D9D9D9')`. |
| **`#4F81BD` / `#1F4E78`** | Portadas | `iluminacion` (Legacy) | **No** | Tonos azules de Microsoft Word heredados no alineados con la marca SySO. | Sustituir por Azul Corporativo `#468DFF`. |
| **`#00B050` / `#FF0000`** | Estado Cumple / No Cumple | `iluminacion`, `matriz` | **No** | Verde/Rojo puros no normalizados con la paleta de alertas de la app. | Sustituir por `#22c55e` (Cumple) y `#ef4444` (No cumple). |

---

## 6. Revisión de Tablas PDF

| Documento | Tabla | Encabezados | Celdas | Saltos de Página | Problema | Recomendación |
|---|---|---|---|---|---|---|
| **Visitas** | Hallazgos y Tareas | `#468DFF` texto blanco | Padding 4pt, 9pt fuente | `pageBreak: 'auto'` | En visitas largas la tabla se parte dejando la firma aislada. | Activar `showHead: 'everyPage'` y mantener firmas unidas. |
| **Iluminación** | General de Medición | `#D9D9D9` texto negro | Truncamiento `drawCellText` | Repite header | Tablas apaisadas con 10 columnas quedan ajustadas si el texto es largo. | Aplicar autoTable con `overflow: 'linebreak'`. |
| **Matriz Riesgos**| Evaluación IPER | `#0F172A` texto blanco | 7.5pt fuente | Corta en margen | Ancho de tabla excede área útil en modo vertical. | Forzar orientación apaisada (`landscape`). |
| **Extintores** | Inventario Puestos | `#468DFF` texto blanco | Padding 3pt | `pageBreak: 'auto'` | Filas con observaciones extensas se enciman si no hay auto-height. | Configurar `cellWidth: 'wrap'`. |
| **Accidentes** | Causa Raíz 5 Porqués | `#468DFF` texto blanco | Multi-línea | Sin header repetido | Al pasar a página 2 no repite la cabecera del análisis. | Habilitar `showHead: 'everyPage'`. |

---

## 7. Revisión de Imágenes y Firmas PDF

| Documento | Elemento | Problema | Impacto | Recomendación |
|---|---|---|---|---|
| **Visitas / Avisos** | Evidencias fotográficas | En algunos casos las fotos adjuntas deforman su relación de aspecto al forzar `w=150, h=150`. | Medio | Utilizar escalado dinámico en modo `contain` respetando proporciones. |
| **Iluminación** | Croquis / Planos | Imágenes de croquis pesadas demoran la compilación del PDF en el navegador. | Medio | Comprimir imágenes a JPEG al 80% antes de `addImage`. |
| **Control Eléctrico**| Firma Profesional | Si la firma en Supabase Storage es privada, falla la descarga si no se usa URL firmada. | Alto | Usar helper seguro `createSignedUrl` de Supabase Storage para recuperar la firma. |
| **Accidentes** | Firma Trabajador / Responsable | Si no se ha firmado, queda un espacio en blanco sin recuadro explicativo. | Bajo | Renderizar línea punteada con leyenda `"(Sin firma registrada)"`. |

---

## 8. Revisión de Paginación PDF

| Documento | Paginación | Encabezado Repetido | Pie Repetido | Problema | Recomendación |
|---|---|---|---|---|---|
| **Visitas** | `"Página X de Y"` | Sí | Sí | Correcto, utiliza `doc.putTotalPages()`. | Mantener patrón. |
| **Iluminación** | `"Página X de Y"` | Sí | Sí | Correcto, utiliza `doc.putTotalPages()`. | Mantener patrón. |
| **Programa Anual**| `"Página 1"`, `"Página 2"` | No | No | No muestra el total de páginas `Y` y no repite el pie en la última hoja. | Implementar hook de footer en autoTable para todas las páginas. |
| **Extintores** | `"Página 1"` | No | Sí | Falta total de páginas. | Integrar `putTotalPages()`. |
| **Dashboard** | Sin paginación | No | No | Al exportar resumen multipágina no incluye número de hoja. | Agregar footer estandarizado. |

---

## 9. Revisión de Nombres de Archivo PDF

| Documento | Nombre Actual | Problema | Recomendación |
|---|---|---|---|
| **Visitas** | `Constancia_Visita_${empName}_${fecha}.pdf` | Espacios en blanco no sanitizados en razón social. | `visita_${empresa}_${establecimiento}_${fecha}_${id}.pdf` |
| **Iluminación** | `Protocolo_Iluminacion_${estName}_${fecha}.pdf` | Falta ID o folio único del protocolo. | `protocolo-iluminacion_${empresa}_${establecimiento}_${fecha}_${id}.pdf` |
| **Avisos** | `Aviso_Riesgo_${id}.pdf` | Omite la empresa y la fecha en el nombre descargado. | `aviso-riesgo_${empresa}_${establecimiento}_${fecha}_${id}.pdf` |
| **Extintores** | `Reporte_Extintores.pdf` | Nombre genérico estático sin fecha ni empresa. | `control-extintores_${empresa}_${establecimiento}_${fecha}.pdf` |
| **Accidentes** | `Investigacion_Accidente_${id}.pdf` | Omite la fecha e información del establecimiento. | `investigacion-accidente_${empresa}_${establecimiento}_${fecha}_${id}.pdf` |

---

## 10. Hallazgos Críticos PDF

| ID | Hallazgo | Evidencia | Impacto | Recomendación | Archivo |
|---|---|---|---|---|---|
| **HCP-01** | Incompatibilidad de Hex en `jsPDF` | Invocación de `doc.setFillColor('#D9D9D9')` en jsPDF puede pintar rellenos negros. | Crítico | Implementar convertidor hexadecimal a RGB `(r, g, b)` en un helper `pdfTheme.js`. | Todos los generadores PDF |
| **HCP-02** | Nombres de archivo con caracteres especiales | Razones sociales con espacios, acentos o `/` rompen descargas en móviles/Safari. | Crítico | Sanitizar nombres con helper `formatPdfFileName()`. | 10 páginas de tenant |
| **HCP-03** | Fórmulas y tablas IPER desbordadas | Matriz de riesgos en A4 vertical corta columnas en el margen derecho. | Crítico | Configurar orientación horizontal (`landscape`) para la Matriz IPER. | `matriz-riesgos/page.js` |

---

## 11. Hallazgos Altos PDF

| ID | Hallazgo | Evidencia | Impacto | Recomendación | Archivo |
|---|---|---|---|---|---|
| **HAP-01** | Paginación incompleta sin total de páginas | Uso de `Página ${i}` en lugar de `Página X de Y`. | Alto | Usar `doc.putTotalPages()` en el cierre de generación. | `programa`, `extintores`, `correctivas` |
| **HAP-02** | Imágenes y logos deformados | `doc.addImage` con anchos y altos estáticos `(100, 100)`. | Alto | Calcular escalado dinámico `(aspectRatio)` antes de insertar imágenes. | `avisos`, `extintores`, `checklist` |
| **HAP-03** | Firmas huérfanas al final de página | El bloque de firma se dibuja en el borde inferior rozando el margen o cortándose. | Alto | Verificar espacio vertical disponible `y + height > pageHeight - margin` y forzar `addPage()`. | `visitas`, `capacitacion`, `electrico` |

---

## 12. Hallazgos Medios PDF

| ID | Hallazgo | Evidencia | Impacto | Recomendación | Archivo |
|---|---|---|---|---|---|
| **HMP-01** | Unidades de medida dispares (`pt` vs `mm`) | `iluminacion` usa `mm` mientras que otros 11 módulos usan `pt`. | Medio | Unificar todas las dimensiones en milímetros (`mm`) o puntos (`pt`) bajo `pdfLayout.js`. | Todos los generadores |
| **HMP-02** | Títulos de tablas sin repetición en multipágina | `jspdf-autotable` sin `showHead: 'everyPage'`. | Medio | Habilitar la repetición automática de cabeceras en cada página. | `correctivas`, `checklist` |
| **HMP-03** | Colores de cabecera no institucionales | Uso de `#4F81BD` o `#1F4E78` heredados de plantillas externas. | Medio | Normalizar todos los fondos de tabla al Azul Corporativo `#468DFF` o Gris `#D9D9D9`. | `iluminacion/pdfGenerator.js` |

---

## 13. Hallazgos Bajos y Observaciones PDF

| ID | Hallazgo | Evidencia | Impacto | Recomendación | Archivo |
|---|---|---|---|---|---|
| **HBP-01** | Textos "N/A" crudos en observaciones vacías | Campos vacíos muestran `"N/A"` en lugar de un texto descriptivo neutro. | Bajo | Reemplazar `"N/A"` por `"-"` o `"Sin observaciones registrados."`. | `visitas`, `avisos` |
| **HBP-02** | Logos remotos sin fallback offline | Si falla la conexión a Supabase Storage, el PDF no muestra logo corporativo. | Bajo | Utilizar siempre la imagen Base64 local `/brand/logo-primary.png` como fallback seguro. | Todos los generadores |
