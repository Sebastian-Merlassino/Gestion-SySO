# Estándar de Diseño Documental y Generación de PDF — Gestión SySO

Este documento establece el **estándar único de diseño documental** para la generación de archivos PDF descargables, reportes e informes imprimibles en el SaaS **Gestión SySO**.

---

## 1. Especificaciones de Página y Documento

* **Formato de Hoja**: **A4** (210 x 297 mm / 595.28 x 841.89 pt).
* **Orientación**:
  - **Vertical (`portrait`)**: Por defecto para todos los formularios, constancias de visita, avisos de riesgo, control de extintores, capacitaciones, accidentes e inspecciones eléctricas.
  - **Horizontal (`landscape`)**: Reservado exclusivamente para planillas y matrices extensas (ej. Matriz de Riesgos IPER, Ficha de Medición de Iluminación apaisada).
* **Márgenes**:
  - Superior: `15 mm` (o `40 pt`).
  - Inferior: `15 mm` (o `40 pt`).
  - Izquierdo: `12 mm` (o `35 pt`).
  - Derecho: `12 mm` (o `35 pt`).
* **Área Útil**:
  - Vertical (Portrait): `186 mm` de ancho x `267 mm` de alto.
  - Horizontal (Landscape): `273 mm` de ancho x `180 mm` de alto.
* **Criterio de Saltos de Página**:
  - Ninguna sección crítica (bloque de firmas, conclusiones o tablas cortadas) debe quedar como elemento huérfano.
  - Al superar `y > pageHeight - margin - minSpaceNeeded` (ej. 30 mm antes del margen inferior), se debe forzar un salto de página limpio (`doc.addPage()`).

---

## 2. Estándar de Encabezado (Header)

Todos los documentos PDF deben incluir una cabecera institucional normalizada en todas las páginas:

* **Altura del Encabezado**: `20 mm` (o `56 pt`).
* **Isotipo / Logotipo Corporativo**:
  - Ubicación: Esquina superior izquierda.
  - Dimensiones: Ancho máximo de `35 mm` (o `100 pt`), manteniendo la relación de aspecto original `(aspectRatio)` calculada dinámicamente.
  - Fallback: Si el tenant no tiene logo configurado (`tenant.logo_1_url`), utilizar siempre `/brand/logo-primary.png` en Base64.
* **Título del Documento**:
  - Ubicación: Centro o derecha superior.
  - Fuente: `Helvetica` o `Inter` en negrita (`Bold`), tamaño `14pt` a `16pt`.
  - Color: Azul Corporativo `#468DFF` o Carbón `#0D0D0D`.
  - Formato: UPPERCASE (ej. `CONSTANCIA DE VISITA TÉCNICA`).
* **Bloque de Datos del Registro (Subcabecera)**:
  - Razón Social de Empresa, Establecimiento, Fecha de Emisión y Folio / Código Único del Documento.
  - Tamaño de texto: `8.5pt` en color `text-slate-600` (`#475569`).
* **Línea Divisoria de Encabezado**:
  - Trazo fino de `0.75 pt` en color Gris Secundario `#D9D9D9` o Azul `#468DFF` a `y = 22 mm`.

---

## 3. Estándar de Pie de Página (Footer)

El pie de página debe renderizarse automáticamente en **todas** las hojas del PDF mediante `doc.putTotalPages()` o hooks de `jspdf-autotable`:

* **Barra Inferior de Acento**: Línea horizontal de `1 pt` de grosor en Azul Corporativo `#468DFF`.
* **Texto Institucional Central**:
  - Texto: `${NombreConsultora} • Tel: ${Telefono} • Email: ${Email}`.
  - Tamaño: `8pt`, alineado al centro en color `#64748B`.
* **Identificación del Módulo (Izquierda)**:
  - Texto: `${CódigoDocumento} — Gestión SySO`.
  - Tamaño: `7.5pt` en negrita.
* **Contador de Páginas Dinámico (Derecha)**:
  - Sintaxis estandarizada: `"Página X de Y"` (ej. `Página 1 de 3`).
  - Tamaño: `8pt` en negrita, alineado a la derecha.

---

## 4. Tipografía Estandarizada para PDFs

| Elemento | Tamaño (pt) | Peso | Color Hex / RGB | Uso |
|---|---|---|---|---|
| **Título Principal Documento** | `16 pt` | Bold | `#468DFF` / RGB(70, 141, 255) | Encabezado principal del PDF |
| **Título de Sección / Bloque** | `11 pt` | Bold | `#0D0D0D` / RGB(13, 13, 13) | Títulos de bloques (ej. `1. DATOS DE LA EMPRESA`) |
| **Subtítulos y Headers de Formulario**| `9.5 pt` | Bold | `#475569` / RGB(71, 85, 105) | Subcategorías de datos |
| **Texto de Cuerpo / Datos** | `9 pt` | Regular | `#0D0D0D` / RGB(13, 13, 13) | Descripciones, observaciones y respuestas |
| **Encabezado de Tabla (`thead`)** | `8.5 pt` | Bold | `#FFFFFF` o `#0D0D0D` | Títulos de columnas de tabla |
| **Celdas de Tabla (`tbody td`)** | `8 pt` | Regular | `#1E293B` / RGB(30, 41, 59) | Valores, ítems y registros |
| **Pie de Página / Leyenda** | `8 pt` | Regular | `#64748B` / RGB(100, 116, 139) | Numeración de página y datos de contacto |

---

## 5. Paleta de Colores Estandarizada para PDFs

Para garantizar la compatibilidad con el motor de renderizado de `jsPDF`, **todos los colores deben pasarse como arreglos o valores RGB enteros `(r, g, b)`**:

* **Primary (Azul Corporativo)**: `#468DFF` $\rightarrow$ `RGB(70, 141, 255)`.
* **Accent / Highlight (Azul Intenso)**: `#0511F2` $\rightarrow$ `RGB(5, 17, 242)`.
* **Text Primary (Negro Carbón)**: `#0D0D0D` $\rightarrow$ `RGB(13, 13, 13)`.
* **Text Muted (Gris Slate)**: `#64748B` $\rightarrow$ `RGB(100, 116, 139)`.
* **Border / Separator (Gris Claro)**: `#D9D9D9` $\rightarrow$ `RGB(217, 217, 217)`.
* **Table Header Fill (Fondo Encabezado Tabla)**: `#468DFF` o `#E2E8F0` `RGB(226, 232, 240)`.
* **Table Row Alt (Fila Cebra)**: `#F8FAFC` $\rightarrow$ `RGB(248, 250, 252)`.
* **Success (Verde Cumplimiento)**: `#22C55E` $\rightarrow$ `RGB(34, 197, 94)`.
* **Warning (Amarillo Advertencia)**: `#EAB308` $\rightarrow$ `RGB(234, 179, 8)`.
* **Destructive / Error (Rojo Desvío)**: `#EF4444` $\rightarrow$ `RGB(239, 68, 68)`.

---

## 6. Estándar de Tablas PDF (`jspdf-autotable`)

Las tablas generadas en los PDFs seguirán las siguientes propiedades de estilo:

```js
autoTable(doc, {
  startY: currentY,
  theme: 'grid',
  headStyles: {
    fillColor: [70, 141, 255], // #468DFF
    textColor: [255, 255, 255],
    fontSize: 8.5,
    fontStyle: 'bold',
    halign: 'left',
    cellPadding: 4
  },
  bodyStyles: {
    textColor: [30, 41, 59],
    fontSize: 8,
    cellPadding: 4,
    valign: 'middle'
  },
  alternateRowStyles: {
    fillColor: [248, 250, 252] // #F8FAFC
  },
  showHead: 'everyPage', // Repetir encabezado en cada página
  margin: { left: 35, right: 35, top: 50, bottom: 40 }
});
```

---

## 7. Estándar de Firmas

Toda sección de firmas (Profesional, Trabajador, Responsable) debe maquetarse así:

* **Bloque de Firma**:
  - Ancho de recuadro: `60 mm` (o `170 pt`).
  - Alto de recuadro: `25 mm` (o `70 pt`).
  - Imagen de Firma: Ajustada proporcionalmente en modo `contain` centrada sobre la línea de firma.
  - Línea de Firma: Trazo horizontal de `0.75 pt` en color `#94A3B8`.
* **Aclaración de Firma**:
  - Nombre Completo: `9pt` Bold en negrita debajo de la línea.
  - Cargo / Rol: `8pt` Regular (ej. `Profesional en Higiene y Seguridad`).
  - Matrícula / DNI: `8pt` Regular (ej. `Matrícula MP: 12345`).
* **Firma Faltante**:
  - Si el registro no posee firma cargada, renderizar un recuadro con borde punteado gris y el texto aclaratorio neutro: `"(Sin firma registrada)"`.

---

## 8. Estándar de Evidencias e Imágenes Fotografías

* **Grilla de Evidencias Fotográficas**:
  - Renderizar en grilla de **2 columnas** por fila.
  - Ancho máximo de imagen: `80 mm` (o `225 pt`).
  - Alto máximo de imagen: `55 mm` (o `155 pt`).
  - Relación de aspecto: Mantener `object-fit: contain` para no distorsionar las fotografías tomadas en campo.
  - Epígrafe / Pie de Foto: Texto explicativo a `7.5pt` debajo de cada imagen con el hallazgo o sector inspeccionado.

---

## 9. Patron Estandarizado de Nombres de Archivo PDF

Todos los archivos generados deben descargarse utilizando estrictamente el siguiente patrón de nombrado sanitizado (sin espacios, caracteres especiales ni acentos):

```txt
[modulo]_[empresa]_[establecimiento]_[fecha]_[id].pdf
```

### Ejemplos Estandarizados:

* **Constancia de Visita**: `visita_empresa-acme_planta-1_2026-07-23_VIS-0042.pdf`
* **Protocolo de Iluminación**: `protocolo-iluminacion_empresa-acme_planta-1_2026-07-23_ILU-0012.pdf`
* **Aviso de Riesgo**: `aviso-riesgo_empresa-acme_deposito-central_2026-07-23_AR-0005.pdf`
* **Control de Extintores**: `control-extintores_empresa-acme_planta-1_2026-07-23.pdf`
* **Investigación de Accidente**: `investigacion-accidente_empresa-acme_sector-prensas_2026-07-23_INC-0003.pdf`

---

## 10. Helpers PDF Recomendados para Normalización (Fase 3)

Para evitar duplicar código en las 12 vistas, se propone crear la biblioteca de helpers reutilizables en `src/lib/pdf/`:

1. `src/lib/pdf/pdfTheme.js`: Centraliza tokens de color RGB (`PRIMARY_RGB`, `SUCCESS_RGB`, `DESTRUCTIVE_RGB`), fuentes y convertidores `hexToRgb()`.
2. `src/lib/pdf/pdfLayout.js`: Centraliza la inicialización de `jsPDF` con márgenes y orientación unificada.
3. `src/lib/pdf/pdfHeader.js`: Función reutilizable `drawPdfHeader(doc, options)` para dibujar el logo, razón social y título.
4. `src/lib/pdf/pdfFooter.js`: Función `drawPdfFooter(doc, options)` para renderizar la barra de acento, datos de contacto y `"Página X de Y"` con `putTotalPages()`.
5. `src/lib/pdf/pdfTableStyles.js`: Define configuraciones preestablecidas de `autoTable` para listas simples, grillas densas y matrices.
6. `src/lib/pdf/pdfFileName.js`: Helper `formatPdfFileName({ modulo, empresa, establecimiento, fecha, id })` para sanitizar cadenas.
7. `src/lib/pdf/pdfImages.js`: Carga, compresión Base64 y cálculo de proporciones `aspectRatio` para evitar imágenes deformadas.
8. `src/lib/pdf/pdfSignatures.js`: Dibuja bloques estandarizados de firma con aclaraciones y recuadros de fallback.

---

## 11. Plan de Normalización de PDFs por Fases

* **Fase 1 — Helpers de Infraestructura PDF**: Crear el módulo `src/lib/pdf/` con los 8 helpers especificados.
* **Fase 2 — Migración de Documentos Legales Críticos**: Migrar los generadores de `visitas`, `iluminacion`, `avisos` y `accidentes` a los helpers comunes.
* **Fase 3 — Migración de Inspecciones y Controles**: Migrar `control-electrico`, `extintores`, `checklist-personalizados` y `capacitacion`.
* **Fase 4 — Migración de Reportes Generales**: Migrar `programa`, `matriz-riesgos`, `correctivas` y `dashboard`.
* **Fase 5 — Pruebas de Impresión y Compatibilidad**: Validar descargas en Chrome, Edge, Safari Móvil y visores PDF de Android/iOS.
