# Propuesta de Estándar Unificado de Diseño UI — Gestión SySO

**Fecha:** 5 de Agosto de 2026  
**Área:** Arquitectura de Frontend & Design System  
**Objetivo:** Normar tokens visuales, componentes de interfaz y guías de maquetación para eliminar la deriva visual en Gestión SySO.

---

## 1. Sistema Tipográfico

### 1.1 Fuente Principal y Secundaria
- **Fuente Principal (Sans-serif)**: `Inter`, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto.
- **Fuente de Títulos / Identidad (`font-outfit`)**: `Outfit`, sans-serif (utilizada exclusivamente en encabezados H1/H2, títulos de cards principales, modales y marca).

### 1.2 Escala Jerárquica de Fuentes

| Nivel Semántico | Clase Tailwind Estándar | Tamaño (px) | Peso (Weight) | Interlineado | Tracking | Caso de Uso |
|---|---|---|---|---|---|---|
| **H1 (Título de Página)** | `font-outfit text-2xl font-extrabold` | 24px | 800 (Extrabold) | `leading-tight` | `tracking-tight` | Encabezado principal (`AppPageHeader`) |
| **H2 (Sección Principal)** | `font-outfit text-lg font-bold` | 18px | 700 (Bold) | `leading-snug` | Normal | Títulos de tarjetas de módulo y modales |
| **H3 (Subsección / Card)** | `text-sm font-bold` | 14px | 700 (Bold) | `leading-normal` | Normal | Cabeceras de formularios y paneles |
| **Body / Celdas Tabla** | `text-xs font-medium` | 12px | 500 (Medium) | `leading-relaxed` | Normal | Textos principales de tablas, listas e inputs |
| **Labels Técnicos** | `text-xs font-bold uppercase` | 12px | 700 (Bold) | `leading-none` | `tracking-wider` | Etiquetas de campos de carga en formularios |
| **Captions / Hints** | `text-xs font-normal text-slate-500` | 12px | 400 (Normal) | `leading-normal` | Normal | Ayudas, subtítulos de input e instrucciones |
| **Badges / Tags** | `text-[10px] font-bold uppercase` | 10px | 700 (Bold) | `leading-none` | `tracking-wider` | Estados en tablas (`REALIZADA`, `PENDIENTE`) |

---

## 2. Paleta de Colores y Tokens CSS

### 2.1 Tokens Oficiales (`src/app/globals.css`)

```css
:root {
  /* Brand Tokens */
  --primary: 217 100% 63.7%; /* #468DFF (Azul SySO Principal) */
  --primary-hover: 236 96% 48%; /* #0511F2 (Azul Intenso Acento) */
  --primary-foreground: 0 0% 100%; /* #FFFFFF */

  /* Neutral Surface & Backgrounds */
  --background: 210 40% 98%; /* #f8fafc (Slate-50) */
  --foreground: 222.2 84% 4.9%; /* #020817 (Slate-950) */
  --card: 0 0% 100%; /* #FFFFFF */
  --card-foreground: 222.2 84% 4.9%;
  
  /* Borders & Inputs */
  --border: 215 20% 82%; /* #cbd5e1 (Slate-300: gris nítido de alto contraste) */
  --input: 215 20% 82%;
  --ring: 217 100% 63.7%;

  /* Semantic Feedback Tokens */
  --success: 142.1 76.2% 36.3%; /* #16a34a (Green-600) */
  --success-foreground: 0 0% 100%;
  --warning: 38 92% 50%; /* #f59e0b (Amber-500) */
  --warning-foreground: 0 0% 100%;
  --destructive: 0 84.2% 60.2%; /* #ef4444 (Red-500) */
  --destructive-foreground: 0 0% 100%;

  /* Geometry Radius */
  --radius: 0.75rem; /* 12px (rounded-xl) */
}
```

---

## 3. Especificación de Componentes Base UI

### 3.1 Botones (`AppButton`)
- **Altura estándar**: `h-10` (40px) para escritorio y móvil.
- **Padding horizontal**: `px-4`.
- **Border Radius**: `rounded-xl` (12px).
- **Variantes Obligatorias**:
  - `primary`: Relleno `#468DFF`, texto `#FFFFFF`. Hover: `#0511F2`.
  - `secondary`: Relleno `#FFFFFF`, borde `#cbd5e1`, texto `#468DFF`. Hover: `#468DFF`, texto `#FFFFFF`.
  - `edit`: Relleno `#f59e0b` (Amber-500), texto `#FFFFFF`. Hover: `#d97706` (Amber-600). En tabla (icono): relleno `#fef3c7`, texto `#d97706`.
  - `destructive`: Relleno `#ef4444` (Red-500), texto `#FFFFFF`. Hover: `#dc2626` (Red-600). En tabla (icono): relleno `#fee2e2`, texto `#dc2626`.
  - `icon-only`: `h-9 w-9 border border-slate-200 rounded-lg p-2 text-slate-500 hover:bg-slate-100`.

### 3.2 Formularios de Carga (`AppInput`, `AppSelect`, `AppTextarea`)
- **Altura de Input / Select**: `h-10` (40px).
- **Borde**: `1px solid #cbd5e1` (`slate-300`).
- **Radius**: `rounded-xl`.
- **Focus Ring**: `focus:ring-2 focus:ring-[#468DFF]/20 focus:border-[#468DFF]`.
- **Labels**: Siempre visibles sobre el campo, en `text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5`.
- **Textareas técnicas**: Integración obligatoria de `<AITextHelper />` para dictado por voz y refinamiento por IA (Gemini).

### 3.3 Tablas Web (`AppTable`)
- **Encabezado (`thead`)**: Fondo `bg-slate-50`, texto `text-[10px] font-bold text-slate-500 uppercase tracking-wider`, alto de fila `h-10`, borde inferior `border-b border-slate-200`.
- **Celdas (`tbody tr`)**: Alto de fila `h-12` (48px), texto `text-xs font-medium text-slate-700`, hover en fila `hover:bg-slate-50/80 transition-colors`.
- **Acciones**: Botones de acción alineados a la derecha en la última columna, utilizando `AppButton` variante tabla.

### 3.4 Modales (`AppInfoModal`, `AppConfirmDialog`, `AppDestructiveConfirmDialog`)
- **Cabecera**: Fondo `bg-slate-900`, ícono en contenedor `#468DFF/20`, título `font-outfit text-base font-extrabold text-white`.
- **Cuerpo**: Fondo `#FFFFFF`, scrollbar nativa sobre el contenedor principal (`overflow-y-auto max-h-[75vh]`).
- **Pie**: Fondo `bg-slate-50`, borde superior `border-t border-slate-200`, botón primario alineado a la derecha.

---

## 4. Reglas de Maquetación Responsiva
- **Móvil (<768px)**: Las tarjetas de tablas y listados se adhieren de borde a borde (`px-0`), sin márgenes laterales redundantes, eliminando redondeados flotantes (`border-radius: 0`) y aplicando `border-b border-slate-200` entre elementos consecutivos.
- **Tablet y Desktop (>=768px)**: Las páginas flotan ordenadamente sobre el canvas de la app (`md:max-w-[95%] md:mx-auto md:py-8`), recuperando tarjetas redondeadas (`md:rounded-2xl md:border md:shadow-sm`) y separaciones verticales de `space-y-6`.
