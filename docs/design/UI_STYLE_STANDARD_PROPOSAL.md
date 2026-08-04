# Propuesta de Estándar de Diseño Visual y Componentes — Gestión SySO

Este documento establece la propuesta formal de estandarización visual y el catálogo de componentes base para el proyecto **Gestión SySO**, con el fin de corregir la deuda técnica estética y asegurar consistencia visual premium, responsive y accesible en toda la plataforma.

---

## 1. Propuesta de Estándar Visual (Tokens de Diseño)

### 1.1 Tipografía

La tipografía unificada para todo el SaaS será:
*   **Fuente para Títulos y Encabezados principales**: **`Outfit`** (Para H1, H2, H3, headers principales).
*   **Fuente para Contenido y Datos**: **`Inter`** (Para textos descriptivos, inputs, tablas, logs y badges).
*   **Fuente Monospaciada**: **`JetBrains Mono`** o `SF Mono` (Para IDs, códigos, folios e importes).

#### Escala Tipográfica Estandarizada:

| Token / Elemento | Clases CSS (Tailwind) | Peso (Weight) | Tamaño (Rem / px) | Uso Sugerido |
| :--- | :--- | :--- | :--- | :--- |
| **`font-h1`** | `font-outfit text-2xl md:text-3xl font-extrabold tracking-tight` | Extra Bold (800) | `1.875rem` / 30px | Título principal de módulo o sección |
| **`font-h2`** | `font-outfit text-xl font-bold tracking-tight` | Bold (700) | `1.5rem` / 24px | Títulos de tarjetas principales en Dashboard |
| **`font-h3`** | `font-outfit text-base font-bold uppercase tracking-wider` | Bold (700) | `1rem` / 16px | Cabeceras de sección dentro de formularios |
| **`font-body-lg`** | `font-sans text-sm md:text-base font-normal` | Regular (400) | `1rem` / 16px | Párrafos introductorios y texto explicativo largo |
| **`font-body`** | `font-sans text-xs md:text-sm font-normal` | Regular (400) | `0.875rem` / 14px | Texto base de controles, inputs, selects y tablas |
| **`font-label`** | `font-sans text-xs font-bold text-slate-500 uppercase tracking-wider` | Bold (700) | `0.75rem` / 12px | Etiquetas de campos de formulario y headers |
| **`font-detail`** | `font-sans text-[10px] text-slate-400 font-medium` | Medium (500) | `0.625rem` / 10px | Textos aclaratorios inline, microdatos y fechas |
| **`font-badge`** | `font-sans text-[10px] font-bold uppercase tracking-wide` | Bold (700) | `0.625rem` / 10px | Estados, planes, chips de clasificación |

---

### 1.2 Paleta de Colores y Variables CSS

Se propone corregir y alinear la sección `:root` de `globals.css` para implementar un sistema **Light Mode por defecto** en las variables de Tailwind (lo cual resolverá los conflictos de color en componentes Radix), delegando el Dark Mode a la clase `.dark`.

#### Variables CSS Propuestas (`globals.css`):

```css
@layer base {
  :root {
    /* Color de Fondo y Superficie */
    --background: 210 20% 98%; /* #f1f5f9 (slate-100) */
    --foreground: 222.2 84% 4.9%; /* #020617 (slate-950) */

    /* Tarjetas y Contenedores */
    --card: 0 0% 100%; /* #ffffff */
    --card-foreground: 222.2 84% 4.9%;

    /* Elemento de Acción Principal (Corporate Blue) */
    --primary: 217 100% 63.7%; /* #468DFF */
    --primary-foreground: 210 40% 98%;

    /* Resaltados (Highlight Deep Blue) */
    --accent: 237 96% 49%; /* #0511F2 */
    --accent-foreground: 0 0% 100%;

    /* Bordes y Líneas Divisorias */
    --border: 214.3 31.8% 91.4%; /* #e2e8f0 (slate-200) */
    --input: 214.3 31.8% 91.4%;

    /* Estados de Cumplimiento (Seguridad e Higiene) */
    --success: 142.1 76.2% 36.3%; /* #22c55e (Safety Green) */
    --success-foreground: 355.7 100% 97.3%;

    --warning: 47.9 95.8% 44.7%; /* #eab308 (Warning Yellow) */
    --warning-foreground: 26 83.3% 14.1%;

    --destructive: 0 84.2% 60.2%; /* #ef4444 (Safety Red / Orange) */
    --destructive-foreground: 210 40% 98%;

    --radius: 0.75rem; /* rounded-xl por defecto en formularios y cards */
  }
}
```

---

### 1.3 Botones Estandarizados

Los botones se centralizarán en el componente reutilizable `<AppButton />`. Se definen las siguientes variantes formales de diseño:

1.  **Primary**:
    *   *Propósito*: Acción principal del formulario o modal.
    *   *Estilo*: Fondo `#468DFF` (Azul principal), texto `#FFFFFF`. Sombra sutil `shadow-md shadow-blue-500/10`. Hover: `#0511F2`. Active: `scale-[0.98]`.
2.  **Secondary** (e.g. Cancelar, Volver, Salir):
    *   *Propósito*: Acciones de escape o secundarias.
    *   *Estilo*: Fondo `#FFFFFF`, borde y texto `#468DFF`. Hover: Fondo `#468DFF` con texto `#FFFFFF`.
3.  **Outline**:
    *   *Propósito*: Acciones auxiliares neutras (e.g. Filtros, Limpiar).
    *   *Estilo*: Fondo `#FFFFFF`, borde `border-slate-200`, texto `text-slate-600`. Hover: `bg-slate-50 text-slate-900`.
4.  **Ghost**:
    *   *Propósito*: Acciones discretas en tablas, menús colapsables o sliders.
    *   *Estilo*: Fondo transparente, texto `text-slate-500`. Hover: `bg-slate-100 text-slate-800`.
5.  **Destructive**:
    *   *Propósito*: Botones de eliminación física o desactivación permanente.
    *   *Estilo*: Fondo `#EF4444` (Safety Red), texto `#FFFFFF`. Hover: `#DC2626`.
6.  **Acciones Rápidas de Tabla (Icon Buttons)**:
    *   **Editar**: Fondo `#FEF3C7` (Amber-50), texto `#D97706` (Amber-600). Hover: Fondo `#FEEB99`, texto `#B45309`.
    *   **Eliminar**: Fondo `#FEE2E2` (Red-50), texto `#DC2626` (Red-600). Hover: Fondo `#FCA5A5`, texto `#B91C1C`.
    *   **Documento (PDF/Adjunto)**: Fondo `#EFF6FF` (Blue-50), texto `#468DFF`. Hover: Fondo `#DBEAFE`, texto `#0511F2`.

---

### 1.4 Formularios Estandarizados

Todos los campos de formulario deberán ajustarse a los siguientes tokens:
*   **Altura de Inputs**: `h-10` (40px) para mantener alineación.
*   **Bordes e Inputs**: Borde fino `border border-slate-200`, esquinas `rounded-xl` (12px), fondo sutil `bg-slate-50/50`.
*   **Placeholders**: Color suave consistente `placeholder-slate-400`.
*   **Focus Ring**: Ante foco, pintar borde azul y un anillo reactivo: `focus:ring-2 focus:ring-[#468DFF]/20 focus:border-[#468DFF] transition-all`.
*   **Campos Requeridos**: Indicado con `<span className="text-[#468DFF] ml-1 font-bold">*</span>` de forma automatizada.
*   **Texto de error inline**: `text-[10px] text-[#ef4444] font-semibold mt-1 px-1 flex items-center gap-1`.

---

### 1.5 Tablas Estandarizadas

Las planillas y grillas de datos densos seguirán el siguiente esquema visual:
*   **Cabeceras (`thead`)**: Fondo gris plano `bg-slate-50/80`, borde inferior `border-b border-slate-200`, texto `text-xs font-bold text-slate-400 uppercase tracking-wider`.
*   **Celdas (`tbody td`)**: Altura de fila cómoda `py-4 px-6`, texto principal `text-xs text-slate-700`.
*   **Fila Hover**: Hover gris suave unificado reactivo `hover:bg-slate-100 transition-colors`.
*   **Scroll Responsive**: Siempre encapsuladas en un contenedor `w-full overflow-x-auto border border-slate-200 rounded-2xl bg-white shadow-sm`.
*   **Indicadores de Ordenación**: Si la columna es ordenable, mostrar el icono dinámico `ChevronUp` o `ChevronDown` de Lucide React al lado del texto.

---

### 1.6 Cards y Contenedores Estandarizados

*   **Fondo de Tarjeta**: Blanco puro `#FFFFFF`.
*   **Redondeo**: Siempre `rounded-2xl` (16px).
*   **Bordes**: Fino unificado `border border-slate-200` (reemplazando `slate-150`).
*   **Sombra**: Sombra sutil `shadow-sm` para evitar sobrecarga.
*   **Separación Interna (Padding)**: `p-6` en layouts normales, `p-3` o `p-4` en grillas densas.

---

### 1.7 Modales y Alertas

*   **Overlay**: Fondo semitransparente oscuro con desenfoque: `fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 animate-fade-in`.
*   **Contenedor del Modal**: Redondeado `rounded-2xl`, borde `border border-slate-200`, fondo blanco `#FFFFFF`, sombra de alta profundidad `shadow-2xl`.
*   **Accesibilidad (A11y)**:
    *   Uso de `Radix UI Dialog Portal` para captura de foco y cierre con `Esc`.
    *   Botón de cierre `X` en la parte superior derecha de tamaño mínimo `h-8 w-8`.
    *   Títulos en `h4` o `Title` c---

## 2. Catálogo de Componentes de la Biblioteca Unificada (Existentes en `src/components/ui/`)

Para asegurar la homogeneidad visual y evitar la repetición de markup inline en las 16 páginas del tenant y los módulos de protocolos, es **obligatorio** importar y consumir los componentes base unificados ya disponibles en la carpeta `src/components/ui/`. Queda estrictamente prohibido usar etiquetas HTML nativas con clases de Tailwind ad-hoc para estos elementos base.

| Componente | Archivo de Origen | Propósito | Estados / Variantes Soportadas |
| :--- | :--- | :--- | :--- |
| **`AppButton`** | `src/components/ui/AppButton.js` | Botones de acción del sistema con hover/focus unificados. | `primary`, `secondary`, `outline`, `ghost`, `destructive` |
| **`AppInput`** | `src/components/ui/AppInput.js` | Inputs de texto con estilo de borde, focus ring y manejo de estados. | Default, Disabled, Error, ReadOnly |
| **`AppSelect`** | `src/components/ui/AppSelect.js` | Selectores dropdown estandarizados con iconos. | Default, Disabled, Error |
| **`AppTextarea`** | `src/components/ui/AppTextarea.js` | Campo de texto largo con dictado de voz Gemini integrado. | Default, Disabled, Error (integra automáticamente `AITextHelper`) |
| **`AppLabel`** | `src/components/ui/AppLabel.js` | Etiquetas de campos que auto-generan el asterisco de requerido. | Default, required (`*` azul corporativo), Error |
| **`AppPageHeader`** | `src/components/ui/AppPageHeader.js` | Cabecera superior unificada con título e indicador del Plan del tenant. | Desktop y Mobile responsivo (elimina duplicación de Navbar) |
| **`AppEmptyState`** | `src/components/ui/AppEmptyState.js` | Estado vacío unificado para listas sin registros. | Centrado con icono, título, descripción y botón de acción |
| **`AppConfirmDialog`** | `src/components/ui/AppConfirmDialog.js` | Modal de confirmación genérico utilizando Radix UI. | Info, Warning, Confirmación (sustituye alertas inline) |
| **`AppDestructiveConfirmDialog`** | `src/components/ui/AppDestructiveConfirmDialog.js` | Modal unificado de confirmación destructiva (ej. eliminación física). | Destructive (con botón rojo safety y overlay desenfocado) |
| **`AppUnsavedChangesDialog`** | `src/components/ui/AppUnsavedChangesDialog.js` | Modal de alerta ante cambios no guardados en formularios. | Warning (evita la pérdida accidental de datos) |
| **`AppCard`** | `src/components/ui/AppCard.js` | Contenedor básico con bordes redondeados y sombra sutil. | Default, border-slate-200 |
| **`DocumentUploadZone`** | `src/components/ui/DocumentUploadZone.js` | Zona estándar de arrastre y subida de archivos (local y Drive). | Active Dragover, File Preview, Local/Drive Tabs |
| **`ImageUploadZone`** | `src/components/ui/ImageUploadZone.js` | Zona estándar de carga y previsualización de imágenes/evidencias. | Image Cropper, Aspect Ratio containment, Storage fallback |

---

## 3. Plan de Normalización Recomendado (Por Fases)

### Fase 1 — Ajustes de Variables y Estilo Global (1-2 días)
1. **Corrección de variables CSS**: Ajustar `:root` en `src/app/globals.css` a Light Mode por defecto. Mapear Dark Mode al selector `.dark`.
2. **Mapeo de Tailwind**: Asegurar el registro de tokens de color de marca (`primary`, `primary-hover`/`accent`, `success`, `destructive`) en `tailwind.config.js`.
3. **Depuración de clases rotas**: Reemplazar automáticamente `border-slate-150` por `border-slate-200` y `border-amber-250` por `border-amber-200` en los archivos JS de la aplicación, incluyendo las 5 referencias en `protocolos/ergonomia`.

### Fase 2 — Hardening y Refinamiento de Componentes Base (2-3 días)
1. **Revisar accesibilidad y foco**: Validar que `AppInput`, `AppSelect` y `AppTextarea` tengan focus rings correctos y cumplan contraste.
2. **Documentar API de props**: Crear una pequeña guía rápida en la carpeta de componentes sobre el uso correcto de props en `AppButton` y `AppLabel`.

### Fase 3 — Migración de Módulos Críticos y Protocolos (5-7 días)
1. **Dashboard y Visitas**: Extraer el Navbar/Sidebar local y moverlo a `/[tenant-slug]/layout.js`. Reemplazar diálogos inline por `AppConfirmDialog` y `AppDestructiveConfirmDialog`.
2. **Protocolos (Iluminación, Ergonomía, Ruido)**: 
   - Eliminar las constantes duplicadas de iluminación e imports residuales en los formularios de ruido y ergonomía.
   - Normalizar la grilla de Planilla 2 de ergonomía para que los controles Sí/No se comporten como un subcomponente segmentado reutilizable y no repitan clases.
   - Reemplazar inputs locales por `AppInput` y `AppTextarea` con `AITextHelper` incorporado.
3. **Resto de formularios**: Reemplazar de forma progresiva las etiquetas HTML nativas por la biblioteca unificada.

### Fase 4 — Ajustes de Responsividad y Accesibilidad (2 días)
1. **Anchos flexibles**: Modales adaptables a `max-w-[90vw]` en móviles.
2. **Ocultamiento de columnas**: Tablas con clases adaptativas (`hidden lg:table-cell`) para evitar el desborde horizontal excesivo en celulares.

### Fase 5 — Documentación Operativa (1 día)
1. Crear `docs/design/UI_STYLE_GUIDE.md` consolidando el estándar final.
2. Registrar el cumplimiento en la Bitácora de Desarrollo.
