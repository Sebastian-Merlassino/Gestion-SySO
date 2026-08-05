# Informe de Auditoría de Diseño UI y Consistencia Visual — Gestión SySO

**Fecha:** 5 de Agosto de 2026  
**Auditor:** Arquitecto Principal de UX/UI & Frontend  
**Estado de Código:** Auditoría pasiva sin modificación de código fuente  

---

## 1. Resumen Ejecutivo

### 1.1 Diagnóstico General
La interfaz web de **Gestión SySO** presenta una base estética limpia, moderna y profesional orientada al ámbito de Higiene y Seguridad Laboral. Se destaca la utilización del color de marca principal (`#468DFF` / **Blue-500**) y un esfuerzo marcado por unificar componentes primarios como `AppButton`, `AppInput`, `AppSelect`, `AppCard` y `AppInfoModal`.

Sin embargo, a lo largo de la evolución del proyecto se han acumulado **desviaciones e inconsistencias visuales y técnicas relevantes** que afectan la predictibilidad del diseño, la densidad de información en dispositivos móviles, la accesibilidad y el mantenimiento a largo plazo:

1. **Variaciones de Tipografía y Escalas**: Coexistencia entre clases como `font-outfit` (utilizada en encabezados seleccionados) y la fuente sans-serif por defecto de Tailwind (`Inter` / system-ui), así como el uso atomizado de tamaños como `text-[10px]`, `text-[11px]`, `text-xs`, `text-sm` y `text-base` sin escala semántica estandarizada.
2. **Casing Inconsistente (Mayúsculas/Minúsculas)**: Mezcla aleatoria de `UPPERCASE`, `Title Case` y `Sentence case` en botones (`"NUEVO PROTOCOLO"` vs `"Nuevo Protocolo"`), encabezados de tabla, etiquetas de campo (`RAZÓN SOCIAL *` vs `Dirección`), y títulos de modales.
3. **Dispersión de la Paleta de Colores**: Presencia de múltiples tonalidades de gris (`slate-50`, `slate-100`, `slate-200`, `slate-300`, `slate-400`, `slate-500`, `slate-700`, `slate-800`, `slate-900`) y verde/rojo/amarillo heterogéneos sin abstracción a tokens semánticos (ej. `#00b050`, `emerald-500`, `green-600` conviviendo para estados exitosos/cerrados).
4. **Comportamiento Responsivo en Dispositivos Móviles (<768px)**: Las tarjetas y tablas han requerido ajustes progresivos mediante media queries para forzar la eliminación de padding y bordes redondeados (`border-radius: 0`), provocando a veces colisiones con grillas de formularios de carga o brechas de espacio gris no deseadas.
5. **Accesibilidad Visual (a11y)**: Uso frecuente de textos de contraste reducido como `text-slate-400` en etiquetas de tamaño muy pequeño (`text-[10px]`), lo cual compromete el cumplimiento de normas WCAG 2.1 AA.

---

## 2. Mapa Visual por Sección y Módulo

| Módulo / Sección | Ruta Principal | Estado Visual | Tipografía | Colores | Botones | Formularios | Tablas Web | Nivel de Riesgo |
|---|---|---|---|---|---|---|---|---|
| **Dashboard** | `/[tenant-slug]/dashboard` | Aceptable | `font-outfit` + Sans | `#468DFF`, `slate-*`, `#00b050` | Estandarizado (`AppButton`) | N/A | Mixta (Tablas custom) | **Medio** |
| **Legajo Técnico** | `/[tenant-slug]/legajo` | Bueno | Sans-serif / `font-outfit` | `#468DFF`, `slate-*` | `AppButton` + icons | Inline + Modales | Nítida con scroll mobile | **Bajo** |
| **Protocolo Ergonomía** | `/[tenant-slug]/protocolos/ergonomia` | Complejo | Sans-serif | `#468DFF`, `slate-*`, `amber-*` | Mixto (`AppButton` y `<button>`) | Formulario extenso multi-paso | Grillas complejas SRT 886/15 | **Alto** |
| **Protocolo Ruido** | `/[tenant-slug]/protocolos/ruido` | Complejo | Sans-serif | `#468DFF`, `slate-*` | `AppButton` + `<button>` | Extenso con anexos SRT | Tablas extensas de medición | **Alto** |
| **Protocolo Iluminación** | `/[tenant-slug]/protocolos/iluminacion` | Complejo | Sans-serif | `#468DFF`, `slate-*` | `AppButton` + `<button>` | Extenso con anexos SRT | Tablas de puntos de medición | **Alto** |
| **Visitas Técnicas** | `/[tenant-slug]/visitas` | Muy Bueno | Sans-serif / Outfit | `#468DFF`, `slate-*` | `AppButton` | Inline + Voice Helper | Tabla estandarizada | **Bajo** |
| **Acciones Correctivas** | `/[tenant-slug]/correctivas` | Bueno | Sans-serif | `#468DFF`, `amber-*`, `red-*` | `AppButton` | Inline | Tabla estandarizada | **Medio** |
| **Avisos de Riesgo** | `/[tenant-slug]/avisos` | Bueno | Sans-serif | `#468DFF`, `red-*` | `AppButton` | Inline | Tabla estandarizada | **Medio** |
| **Investigación Accidentes** | `/[tenant-slug]/accidentes` | Bueno | Sans-serif | `#468DFF`, `red-*` | `AppButton` | Inline + Voice Helper | Tabla estandarizada | **Medio** |
| **Programa Anual** | `/[tenant-slug]/programa` | Bueno | Sans-serif | `#468DFF`, `slate-*` | `AppButton` | Inline | Tabla de cronograma | **Medio** |
| **Clientes / Empresas** | `/[tenant-slug]/empresas` | Bueno | Sans-serif | `#468DFF`, `slate-*` | `AppButton` | Inline | Tabla de clientes | **Bajo** |
| **Billing / Planes** | `/[tenant-slug]/profile` | Bueno | `font-outfit` | `#468DFF`, `#0511F2` | `AppButton` | Formularios de tarjeta | Cards de suscripción | **Medio** |

---

## 3. Inventario Tipográfico

| Uso / Elemento | Clase / Tamaño Actual | Dónde Aparece | Problema Detectado | Recomendación de Normalización |
|---|---|---|---|---|
| **Títulos Principales (H1)** | `font-outfit text-xl sm:text-2xl font-extrabold text-slate-900` | Encabezados de página, Dashboard | Variación ocasional entre `text-xl` y `text-2xl` | `text-2xl font-extrabold font-outfit` estandarizado en `AppPageHeader` |
| **Subtítulos (H2 / H3)** | `text-base font-bold text-slate-800` / `font-outfit text-sm font-bold` | Secciones de tarjetas, Modales | Mezcla de `text-base` y `text-sm` con y sin `font-outfit` | Usar `text-base font-bold font-outfit` para H2 y `text-sm font-bold` para H3 |
| **Etiquetas de Campo (Labels)** | `text-[10px] font-bold text-slate-400 uppercase tracking-wider` | Formularios de carga, Protocolos | Tamaño `text-[10px]` en `slate-400` tiene bajo contraste | `text-xs font-bold text-slate-600 uppercase tracking-wider` |
| **Textos de Celdas de Tabla** | `text-xs font-medium text-slate-700` | Tablas de Visitas, Clientes, Legajo | Coexistencia de `text-xs` y `text-sm` según el módulo | `text-xs font-medium text-slate-700` unificado para todas las tablas |
| **Textos de Ayuda / Hints** | `text-[11px] text-slate-500` / `text-xs text-slate-400` | Formularios, Zonas de carga | Tamaño muy pequeño e inconsistente | `text-xs text-slate-500` |
| **Botones Primarios** | `text-xs font-bold uppercase` / `text-sm font-semibold` | Múltiples botones de la app | Mezcla entre mayúsculas y Sentence case | `text-xs font-bold` con Sentence case (`Guardar Registro`) |

---

## 4. Inventario de Colores y Tokens

| Color / Hex / Clase | Uso Actual | Módulos | Pertenece a Marca Oficial | Problema | Recomendación |
|---|---|---|---|---|---|
| `#468DFF` (`bg-[#468DFF]`) | Azul Primario, botones, íconos | Toda la aplicación | **SÍ (Oficial)** | Ninguno (Color Institucional) | Mantener como token `--primary` |
| `#0511F2` (`bg-[#0511F2]`) | Hover de botones primarios, acento | Botones y CTA | **SÍ (Oficial)** | Ninguno | Mantener como token `--primary-hover` |
| `#cbd5e1` (`slate-300`) | Bordes de inputs, cards y tablas | Global (`globals.css`) | **SÍ (Normalizado)** | Ninguno (Resuelve nitidez) | Mantener como token `--border` |
| `#00b050` | Badges de estado "Realizado" / "Cerrado" | Visitas, Correctivas, PDFs | **NO (Hardcodeado)** | Inconsistencia con `emerald-500` / `green-600` | Abstraer a token `--success` |
| `#ef4444` / `red-500` | Botones de eliminar, errores, alertas | Toda la app | **SÍ** | Variaciones con `red-600`, `red-700` | Estandarizar en token `--destructive` |
| `#f59e0b` / `amber-500` | Botones de edición, alertas warning | Toda la app | **SÍ** | Variaciones entre `amber-500`, `amber-600`, `yellow-500` | Estandarizar en token `--warning` |
| `#D9D9D9` (`syso-bg`) | Fondo secundario | Layouts | **SÍ (Oficial)** | Coexiste con `#f1f5f9` (`slate-100`) | Usar `#f1f5f9` para canvas de app y `#D9D9D9` como neutro secundario |

---

## 5. Inventario de Botones

| Tipo de Botón | Clases Actuales Predominantes | Módulos donde se usa | Inconsistencias Detectadas | Estándar Proporcionado (`AppButton`) |
|---|---|---|---|---|
| **Primario** | `bg-[#468DFF] hover:bg-[#0511F2] text-white rounded-xl text-xs font-bold` | Formularios, Modales, Acciones | Algunos botones usan `rounded-lg` o `text-sm` | `variant="primary"` (`h-10 px-4 rounded-xl font-bold`) |
| **Secundario / Cancelar** | `bg-white border border-slate-200 text-slate-700 hover:bg-slate-50` | Modales, Cancelación | Algunos usan `border-[#468DFF]` y texto azul | `variant="secondary"` |
| **Editar** | `bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold` | Tablas y Formularios | En tablas se usa botón compacto con `p-1.5 bg-amber-50 text-amber-600` | `variant="edit"` / `variant="table-edit"` |
| **Eliminar / Destructivo** | `bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-bold` | Confirmaciones y Tablas | En tablas se usa `p-1.5 bg-red-50 text-red-600` | `variant="destructive"` / `variant="table-delete"` |
| **Icon-Only** | `p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100` | Cabeceras de tabla, Filtros | Tamaños de ícono variables (14px, 16px, 20px) | Estandarizar a `h-4 w-4` (16px) |

---

## 6. Inventario de Formularios y Carga

| Elemento | Variante Actual | Módulos | Problema | Recomendación |
|---|---|---|---|---|
| **Inputs de Texto** | `h-10 border border-slate-300 rounded-xl px-3 text-xs bg-white` | Formularios principales | Muy unificado con `AppInput`, salvo en protocolos SRT | Enforzar `AppInput` en el 100% de los módulos |
| **Selects / Combos** | `h-10 border border-slate-300 rounded-xl px-3 text-xs bg-white` | Clientes, Legajo, Protocolos | Algunos comboboxes nativos no tienen flecha personalizada | Enforzar `AppSelect` |
| **Textareas** | `border border-slate-300 rounded-xl p-3 text-xs min-h-[100px]` | Observaciones, Visitas | Debe integrar obligatoriamente `<AITextHelper />` | Enforzar `AppTextarea` con IA integrada |
| **Labels** | `text-[10px] font-bold text-slate-400 uppercase tracking-wider` | Toda la app | `slate-400` es muy claro para lectura accesible | Cambiar a `text-xs font-bold text-slate-600 uppercase` |

---

## 7. Inventario de Mayúsculas y Minúsculas (Casing)

| Elemento UI | Variantes Inconsistentes Encontradas | Regla Estándar Propuesta |
|---|---|---|
| **Botones Acciones Principales** | `GUARDAR REGISTRO` vs `Guardar Registro` vs `Guardar` | **Sentence case** (`Guardar Registro`, `Cargar Protocolo`) |
| **Labels de Formulario** | `RAZÓN SOCIAL *` vs `Dirección` vs `Fecha de Visita` | **UPPERCASE** para labels técnicos (`RAZÓN SOCIAL *`, `C.U.I.T.`, `ESTABLECIMIENTO *`) |
| **Encabezados de Tabla** | `Cliente / Razón Social` vs `CLIENTE` vs `Fecha` | **UPPERCASE** conciso (`CLIENTE / RAZÓN SOCIAL`, `FECHA`, `ESTADO`, `ACCIONES`) |
| **Títulos de Modales** | `Instructivo de Completado` vs `INSTRUCTIVO DE COMPLETADO` | **Title Case** (`Instructivo de Completado — Res. SRT Nº 886/15`) |
| **Badges de Estado** | `Realizada` vs `REALIZADA` vs `hecho` | **UPPERCASE** (`REALIZADA`, `PENDIENTE`, `EN ANÁLISIS`) |

---

## 8. Revisión Responsive y Accesibilidad (a11y)

### 8.1 Comportamiento Responsive
- **Pantallas Celular (<768px)**: Las páginas de la app se extienden al 100% del viewport sin márgenes laterales redundantes (`px-0`), las tarjetas de tablas de filtros se integran continuamente (`border-b border-slate-200 md:rounded-2xl`) y las tablas cuentan con scroll horizontal accesible (`overflow-x-auto`).
- **Pantallas Tablet (>=768px y <1024px)**: Recuperan márgenes exteriores (`md:py-8 md:max-w-[95%] md:mx-auto`), bordes redondeados y sombras elegantes.

### 8.2 Accesibilidad Visual (a11y)
- **Contraste de Fuentes**: El gris `#94a3b8` (`slate-400`) sobre blanco en fuentes pequeñas de 10px no cumple con el ratio de contraste mínimo 4.5:1 de WCAG 2.1 AA. Se requiere elevar a `#475569` (`slate-600`).
- **Áreas Táctiles en Celulares**: Los botones de acción en tablas deben garantizar un área de toque mínima de `36x36px` o `40x40px` en pantallas táctiles.

---

## 9. Clasificación de Hallazgos

### Hallazgos Críticos (Severidad Alta / Bloqueante)
1. **Contraste Deficiente en Labels de Formulario**: Uso de `text-[10px] text-slate-400` en campos de entrada técnica, dificultando la lectura a usuarios en dispositivos móviles con brillo reducido.
2. **Duplicación de Librerías y Clases de Botón**: Presencia de componentes `<button>` con estilos inline Tailwind compitiendo con la librería unificada `AppButton`.

### Hallazgos Medios
1. **Casing Heterogéneo en Botones y Badges**: Mezcla de mayúsculas y minúsculas sin criterio semántico estricto.
2. **Diversidad de Tonos de Verde/Rojo**: Coexistencia de `#00b050`, `emerald-500` y `green-600` para estados positivos.
