# Propuesta de Estándar Unificado de Diseño UI y Design System — Gestión SySO

**Fecha:** 12 de Agosto de 2026  
**Área:** Arquitectura de Frontend, UI/UX & Design System  
**Objetivo:** Establecer la especificación normativa única de tokens visuales, componentes de interfaz y guías de maquetación para la aplicación web Gestión SySO.

---

## 1. Tokens de Marca, Tipografía y Colores

### 1.1 Tipografía y Fuentes
- **Fuente Principal del Sistema (Body / Tablas / Inputs)**: `Inter`, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif.
- **Fuente Institucional de Títulos e Identidad**: `Outfit` (`font-outfit`, sans-serif).

#### Escala Jerárquica Normalizada

| Nivel Semántico | Clase Tailwind | Tamaño | Peso (Weight) | Tracking | Caso de Uso |
|---|---|---|---|---|---|
| **H1 (Título de Página)** | `font-outfit text-xl sm:text-2xl font-extrabold text-slate-900` | 24px | Extrabold (800) | `tracking-tight` | Header de Página (`AppPageHeader`) |
| **H2 (Sección Principal)** | `font-outfit text-base sm:text-lg font-bold text-slate-800` | 18px | Bold (700) | Normal | Títulos de tarjetas y modales |
| **H3 (Subsección)** | `text-sm font-bold text-slate-800` | 14px | Bold (700) | Normal | Cabeceras de formularios y subsecciones |
| **Body / Celdas Tabla** | `text-xs font-medium text-slate-700` | 12px | Medium (500) | Normal | Textos principales de tablas y listas |
| **Labels Técnicos** | `text-xs font-bold text-slate-600 uppercase` | 12px | Bold (700) | `tracking-wider` | Etiquetas de campos de entrada |
| **Hints / Ayudas** | `text-xs text-slate-500` | 12px | Normal (400) | Normal | Textos aclaratorios e instrucciones |
| **Badges / Estados** | `text-[10px] font-bold uppercase` | 10px | Bold (700) | `tracking-wider` | Insignias de estado en tablas |

### 1.2 Reglas de Mayúsculas y Minúsculas (Casing)
- **Botones de Acción**: **Sentence case** (`"Guardar registro"`, `"Nuevo aviso de riesgo"`, `"Cancelar"`).
- **Etiquetas de Campo (Labels)**: **UPPERCASE** (`"RAZÓN SOCIAL *"`, `"C.U.I.T."`, `"ESTABLECIMIENTO *"`).
- **Encabezados de Columna de Tabla**: **UPPERCASE** (`"CLIENTE / RAZÓN SOCIAL"`, `"FECHA"`, `"ESTADO"`, `"ACCIONES"`).
- **Badges de Estado**: **UPPERCASE** (`"REALIZADA"`, `"PENDIENTE"`, `"EN ANÁLISIS"`).
- **Títulos de Modales**: **Title Case** (`"Registrar Nueva Constancia de Visita"`).

### 1.3 Tokens CSS de Color (`src/app/globals.css`)

```css
:root {
  /* Brand Colors */
  --primary: 217 100% 63.7%; /* #468DFF (Azul SySO Principal) */
  --primary-hover: 237 96% 49%; /* #0511F2 (Azul Intenso Acento) */
  --primary-foreground: 0 0% 100%;

  /* Neutral Backgrounds & Canvas */
  --background: 210 20% 98%; /* #f1f5f9 (slate-100 canvas) */
  --card: 0 0% 100%; /* #FFFFFF (Blanco puro) */
  --foreground: 222.2 84% 4.9%; /* #020617 (slate-950) */

  /* Borders & Focus Rings */
  --border: 215 20% 82%; /* #cbd5e1 (slate-300: bordes nítidos) */
  --input: 215 20% 82%;
  --ring: 217 100% 63.7%;

  /* Semantic Feedback */
  --success: 142.1 76.2% 36.3%; /* #16a34a (Green-600) */
  --warning: 38 92% 50%; /* #f59e0b (Amber-500) */
  --destructive: 0 84.2% 60.2%; /* #ef4444 (Red-500) */

  --radius: 0.75rem; /* rounded-xl (12px) */
}
```

---

## 2. Componentes Base Estandarizados (`src/components/ui/`)

### 2.1 Botones (`AppButton`)
- **Primario**: `bg-[#468DFF] text-white border border-[#468DFF] hover:bg-[#0511F2] hover:border-[#0511F2] rounded-xl font-bold text-xs h-10 px-4 shadow-md shadow-[#468DFF]/10 transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-[0.98]`.
- **Secundario / Salir**: `bg-white text-[#468DFF] border border-[#468DFF] hover:bg-[#468DFF] hover:text-white rounded-xl font-bold text-xs h-10 px-4 transition-all cursor-pointer flex items-center justify-center gap-1.5`.
- **Editar (Formulario)**: `bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold h-10 px-4 transition-all shadow-md shadow-amber-500/10`.
- **Editar (Tabla)**: `p-1.5 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors cursor-pointer`.
- **Eliminar (Formulario)**: `bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-bold h-10 px-4 transition-all shadow-md shadow-red-500/10`.
- **Eliminar (Tabla)**: `p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors cursor-pointer`.
- **Documento / PDF (Tabla)**: `p-1.5 rounded-lg bg-blue-50 text-[#468DFF] hover:bg-blue-100 hover:text-[#0511F2] transition-colors cursor-pointer` con icono `FileText` de Lucide React (`h-4.5 w-4.5`).

### 2.2 Entradas de Formulario (`AppInput`, `AppSelect`, `AppTextarea`)
- **Input / Select**: `h-10 border border-slate-300 rounded-xl px-3 py-2 text-xs bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#468DFF]/20 focus:border-[#468DFF] transition-all`.
- **Textarea Técnica**: `border border-slate-300 rounded-xl p-3 text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#468DFF]/20 focus:border-[#468DFF] transition-all min-h-[100px]`. Incorpora obligatoriamente el componente `<AITextHelper />` para dictado por voz y refino por IA (Gemini).

### 2.3 Captura de Firmas Web (`AppSignatureCanvas` - Propuesta)
Componente reutilizable de lienzo interactivo Canvas HTML5 para captura de firmas digitales:
- **Props**: `onSave(base64)`, `onClear()`, `initialUrl`, `disabled`, `height`, `width`.
- **Características**:
  - Escalado de coordenadas proporcionales (`getCanvasPos`): `x = ((clientX - rect.left) / rect.width) * canvas.width`.
  - Soporte táctil (`onTouchStart`, `onTouchMove`, `onTouchEnd`) y mouse (`onMouseDown`, `onMouseMove`, `onMouseUp`).
  - Botón de limpieza `"Limpiar Firma"` (`RotateCcw`) y badge de estado de firma registrada (`CheckCircle2`).

### 2.4 Uploaders Avanzados (`DocumentUploadZone` e `ImageUploadZone`)
- **DocumentUploadZone**: Contenedor de bordes redondeados (`rounded-xl border border-slate-200 bg-slate-50`), pestañas de alternancia superior para archivo local / Google Drive URL, y zona de arrastre punteada reactiva.
- **ImageUploadZone (`SySO-Multiple-Evidence-Photo-Grid`)**: Grilla de miniaturas cuadradas (`aspect-square`), overlay de hover con acciones (`Eye` para visualizar y `Trash2` para eliminar), tarjeta de carga rápida `+`, y helper de deserialización JSON de URLs de imágenes.

### 2.5 Skeletons de Carga (`AppSkeleton` - Propuesta)
Componente reutilizable para renderizado defensivo durante la carga de datos:
- `<AppSkeleton variant="table" rows={5} />`: Mantiene la cabecera fija y muestra filas desdibujadas con animación `animate-pulse` y fondo `bg-slate-100 rounded-lg`.
- `<AppSkeleton variant="card" />`: Muestra la silueta de tarjetas contadoras o paneles descriptivos.

### 2.6 Tooltips y Popovers (`AppTooltip` / `AppPopover` - Propuesta)
- **AppTooltip**: Componente estilizado que envuelve elementos interactivos, mostrando un globo oscuro (`bg-slate-900 text-white text-[11px] font-medium px-2.5 py-1 rounded-lg shadow-lg z-50 animate-fade-in`) en eventos hover en escritorio y click/tap sostenido en pantallas móviles.

### 2.7 Assets e Ilustraciones de Marca
- **Assets Públicos**: Organizados en `public/brand/` (`logo-primary.png`, `logo-black.png`, `logo-white.png`, `favicon.ico`).
- **Ilustración Corporativa Mascot (Cartoon 1930s)**: Representación caricaturesca de la mascota oficial (casco blanco, chaleco naranja reflectivo y zapatos de seguridad) normada para empty states (`AppEmptyState`), modales informativos y páginas de bienvenida o error.

---

## 3. Guía de Maquetación Responsiva

- **Vista Celular (<768px)**:
  - Header fijo superior (`position: fixed; z-index: 30`).
  - Margen lateral cero (`px-0`), las tarjetas de tabla y herramientas van de borde a borde con `border-radius: 0` y `border-b border-slate-200`.
  - Tablas con scroll horizontal independiente (`overflow-x-auto`).
- **Vista Desktop (>=768px)**:
  - Tarjetas flotantes con bordes redondeados (`md:rounded-2xl md:border md:border-slate-200 md:shadow-sm`).
  - Layout compacto de tabla con SySO Compact Layout v2.0 (padding `px-6 py-3.5`).

---
