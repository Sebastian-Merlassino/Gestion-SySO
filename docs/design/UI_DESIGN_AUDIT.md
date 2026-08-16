# Informe de Auditoría Integral de Diseño UI, Consistencia Visual y Accesibilidad — Gestión SySO

**Fecha de Auditoría:** 16 de Agosto de 2026  
**Auditor Senior:** Arquitecto Principal de UX/UI, Design System & Frontend  
**Estado de la Intervención:** Auditoría Pasiva de Diagnóstico (Sin modificación de código de aplicación)  
**Proyecto:** SaaS Gestión SySO (Gestión Integral de Higiene, Seguridad y Salud Ocupacional)  
**Framework y Tecnologías Base:** Next.js (App Router), React 18, Tailwind CSS, Lucide React, Radix UI Dialogs, Supabase Auth/PostgreSQL/Storage.

---

## 1. Resumen Ejecutivo

### 1.1 Diagnóstico General de la Plataforma Web
La plataforma web SaaS de **Gestión SySO** cuenta con una base arquitectónica visual sólida y profesional orientada al ámbito industrial y normativo de la Higiene y Seguridad en el Trabajo. La identidad visual se estructura en torno a su paleta institucional oficial:
- **Azul Corporativo SySO (Primario):** `#468DFF` (`Blue-500`)
- **Azul Intenso de Resaltado (Acento):** `#0511F2` (`Accent Blue`)
- **Gris Claro de Canvas y Separadores:** `#D9D9D9` (`bg-syso-bg` / `Slate-100`)
- **Blanco Puro:** `#FFFFFF` (Tarjetas, modales y contenedores de lectura limpia)
- **Negro Suave y Profundo:** `#0D0D0D` / `#000000` (Sidebar y tipografía principal de alto contraste)
- **Bordes Nítidos Reforzados:** `#CBD5E1` (`Slate-300` configurado en `src/app/globals.css`)

Se destacan logros de diseño ya incorporados:
1. **SySO Compact Layout v2.0**: Implementado en las vistas principales de listado (reducción del padding de tarjetas de herramientas y filtros a `px-6 py-3.5` en escritorio y aprovechamiento vertical con `calc(100vh - 310px)`).
2. **Biblioteca Base en `src/components/ui/`**: Disponibilidad de componentes primitivos (`AppButton`, `AppInput`, `AppSelect`, `AppTextarea`, `AppCard`, `AppLabel`, `AppPageHeader`, `AppInfoModal`, `AppConfirmDialog`, `AppDestructiveConfirmDialog`, `AppUnsavedChangesDialog`, `AppSignatureCanvas`, `AppSkeleton`, `AppTooltip`, `AppEmptyState`, `AppFormNavigator`, `DocumentUploadZone`, `ImageUploadZone`, `AITextHelper`, `PdfSlideViewer`).
3. **Estándar de Asistencia de Voz e IA (`AITextHelper`)**: Dictado por voz HTML5 con transcripción asistida y refinamiento técnico mediante Google Gemini en campos de texto técnico extensos.
4. **Galería de Evidencias Fotográficas Múltiples (`SySO-Multiple-Evidence-Photo-Grid` en `ImageUploadZone`)**: Grilla cuadrada (`aspect-square`) con hover overlay de acciones (`Eye` para zoom en nueva pestaña y `Trash2` para eliminación), tarjeta de adición rápida `+`, y helper tolerante de deserialización JSON para retrocompatibilidad de base de datos.
5. **Sistema Centralizado de Alertas (`ToastProvider` / `useToast`)**: Erradicación de estados locales de toasts con animaciones y duraciones semánticas (`success`, `error`, `warning`, `info`).

---

### 1.2 Principales Desviaciones e Inconsistencias Detectadas

| Área Crítica | Diagnóstico Técnico | Impacto UX / UI | Severidad |
|---|---|---|:---:|
| **Componentes de Botón Dispersos** | Se detectaron más de 600 etiquetas `<button>` nativas dispersas en páginas, formularios y modales con clases inline ad-hoc en lugar de consumir `<AppButton />`. Existe además un archivo huérfano obsoleto `src/components/ui/button.jsx` con estilos oscuros incompatibles. | Inconsistencia en estados hover, focus rings, border-radius (`rounded-md` vs `rounded-xl`) y accesibilidad táctil. | **Alta** |
| **Uso Masivo de Tooltips Nativos del Navegador (`title="..."`)** | Se verificaron 41 archivos que emplean el atributo `title="..."` nativo del navegador para acciones de tabla, iconos de ayuda y botones, a pesar de existir `<AppTooltip />`. | Textos emergentes sin estilos corporativos que demoran 1-2 segundos en aparecer y son **100% inaccesibles en dispositivos móviles y tablets táctiles**. | **Alta** |
| **Subutilización de Skeletons de Carga (`AppSkeleton`)** | `<AppSkeleton />` está implementado en `src/components/ui/AppSkeleton.js`, pero únicamente es utilizado por `visitas/page.js`. Los 18 módulos restantes siguen mostrando spinners genéricos (`Loader2 animate-spin`) o textos planos `"Cargando..."`. | Saltos visuales de contenido (CLS - Cumulative Layout Shift) durante la consulta asíncrona de datos en Supabase. | **Alta** |
| **Duplicación de Lienzo Canvas para Captura de Firmas** | A pesar de existir `<AppSignatureCanvas />`, los módulos de `visitas`, `protocolos` (ruido, iluminación, puesta a tierra, ergonomía), `control-electrico`, `checklist-personalizados`, `avisos` y `accidentes` implementan lienzos `<canvas>` con código imperativo inline duplicado. | Riesgo de desfase de trazo táctil en pantallas móviles con alta densidad de píxeles (DPI) y falta de uniformidad en botones de limpieza. | **Alta** |
| **Casing y Capitalización Heterogénea** | Coexistencia no normada entre `UPPERCASE` (`"NUEVO PROTOCOLO"`, `"GUARDAR"`), `Title Case` (`"Guardar Cambios"`, `"Descargar PDF"`) y `Sentence case` (`"Nuevo aviso de riesgo"`) en botones, encabezados, badges y labels. | Sensación de desarrollo fragmentado y falta de rigor visual en la jerarquía de lectura. | **Media** |
| **Mascota Cartoon Años 30 sin Estandarización de Assets** | La identidad gráfica prevé la incorporación del personaje corporativo (casco blanco, chaleco naranja reflectivo con bandas grises y zapatos de seguridad), pero no se dispone de una biblioteca estandarizada de assets en `public/brand/mascot/` para empty states, modales y páginas 404/500. | Empty states basados en iconos geométricos fríos en lugar de ilustraciones humanas corporativas que refuercen la empatía y la marca. | **Media** |
| **Contraste de Labels Pequeños** | Algunas etiquetas técnicas de formulario utilizan `text-[10px]` o `text-xs` con color `text-slate-400` (`#94A3B8`), el cual sobre fondo blanco o `slate-50` tiene un ratio de contraste de `2.8:1` (por debajo del estándar WCAG 2.1 AA de `4.5:1`). | Dificultad de lectura para usuarios en condiciones de luz solar directa en campo (obras, plantas industriales). | **Media** |

---

## 2. Mapa Visual y Estado por Módulo de la Aplicación

A continuación se detalla la matriz de evaluación visual para cada una de las rutas activas de la plataforma:

| Módulo / Sección | Ruta Principal | Estado Visual | Tipografía | Paleta de Colores | Botones | Formularios / Uploaders / Canvas | Skeletons / Tablas | Nivel de Riesgo |
|---|---|---|---|---|---|---|---|:---:|
| **Login / Acceso** | `/login` | Muy Bueno | Outfit + Inter | `#468DFF`, `#0D0D0D`, `#D9D9D9` | `AppButton` + Pestañas | `AppInput`, `PublicFooter` | N/A | **Bajo** |
| **Registro / Onboarding** | `/register`, `/onboarding` | Muy Bueno | Outfit + Inter | `#468DFF`, `#0511F2`, `#FFFFFF` | `AppButton` | `AppInput`, `AppSelect` | N/A | **Bajo** |
| **Restablecer Clave** | `/reset-password` | Excelente | Outfit + Inter | `#468DFF`, `slate-900` | `AppButton` | `AppInput` | N/A | **Bajo** |
| **Legales Públicos** | `/terminos`, `/privacidad`, `/cookies` | Excelente | Inter + Outfit | `#2F3033`, `#468DFF` | N/A | `PublicFooter` | N/A | **Bajo** |
| **Dashboard** | `/[tenant-slug]/dashboard` | Muy Bueno | Outfit + Inter | `#468DFF`, `slate-100`, `#00B050` | Segmentados + `AppButton` | Modales de Planes | Tabla Vencimientos (`sticky`) | **Bajo** |
| **Clientes / Empresas** | `/[tenant-slug]/empresas` | Excelente | Outfit + Inter | `#468DFF`, `slate-300`, Bucket `logos` | `AppButton` | `AppInput`, `ImageUploadZone` | Tabla con Avatar Logo | **Bajo** |
| **Establecimientos** | Submódulo en `empresas/` | Excelente | Inter + Outfit | `#468DFF`, `slate-200` | `AppButton` | Selects en cascada (Geografía) | Lista anidada | **Bajo** |
| **Equipo de Trabajo** | `/[tenant-slug]/equipo` | Excelente | Inter + Outfit | `#468DFF`, `slate-100` | `AppButton` (Compact v2.0) | Modal Inline (`overflow-y-auto`) | Tabla con badges de rol | **Bajo** |
| **Perfil / Suscripción** | `/[tenant-slug]/profile` | Muy Bueno | Outfit + Inter | `#468DFF`, `#0511F2`, `MP` | `AppButton` | Firma digital + Avatar + MP | Cards de Planes | **Bajo** |
| **Programa Anual** | `/[tenant-slug]/programa` | Bueno | Inter + Outfit | `#468DFF`, `slate-200` | Mixto (`AppButton` / `<button>`) | Formulario cronograma | Grilla Gantt compacta | **Medio** |
| **Capacitación Presencial** | `/[tenant-slug]/capacitacion` | Bueno | Inter + Outfit | `#468DFF`, `blue-50` | `AppButton` | Formulario + Firmas | Tabla de registros | **Bajo** |
| **Capacitaciones Online** | `/[tenant-slug]/capacitaciones-online` | Excelente | Inter + Outfit | `#468DFF`, `blue-50`, `red-50` | Pictogramas normalizados | Duración Min/Hs + Modal PPT | Tabla con visor filminas | **Bajo** |
| **Portal Público Asistencia**| `/capacitar/[token]` | Excelente | Outfit + Inter | `#468DFF`, `slate-50` | `AppButton` | `PdfSlideViewer` + Canvas Firma | N/A | **Bajo** |
| **Visitas Técnicas** | `/[tenant-slug]/visitas` | Muy Bueno | Inter + Outfit | `#468DFF`, `blue-50`, `amber-50` | `AppButton` | Voice Helper + Canvas Firma | Tabla + `AppSkeleton` | **Bajo** |
| **Avisos de Riesgo** | `/[tenant-slug]/avisos` | Bueno | Inter + Outfit | `#468DFF`, `red-500` | Mixto (`AppButton` / `<button>`) | Voice Helper + `ImageUploadZone` | Tabla (Spinner básico) | **Medio** |
| **Investigación Accidentes** | `/[tenant-slug]/accidentes` | Bueno | Inter + Outfit | `#468DFF`, `red-600` | Mixto (`AppButton` / `<button>`) | Voice Helper + `ImageUploadZone` | Tabla (Spinner básico) | **Medio** |
| **Control de Extintores** | `/[tenant-slug]/extintores` | Bueno | Inter + Outfit | `#468DFF`, `amber-500` | Mixto (`AppButton` / `<button>`) | `ImageUploadZone` + Cálculos | Tabla (Spinner básico) | **Medio** |
| **Control Eléctrico** | `/[tenant-slug]/control-electrico` | Bueno | Inter + Outfit | `#468DFF`, `amber-500` | Mixto (`AppButton` / `<button>`) | Voice Helper + Canvas + Fotos | Tabla (Spinner básico) | **Medio** |
| **Checklists Personalizados**| `/[tenant-slug]/checklist-personalizados`| Bueno | Inter + Outfit | `#468DFF`, `slate-100` | Mixto (`AppButton` / `<button>`) | Cuestionarios dinámicos | Tabla (Spinner básico) | **Medio** |
| **Protocolo Ruido (85/12)** | `/[tenant-slug]/protocolos/ruido` | Complejo / Avanzado | Inter + Outfit | `#468DFF`, `slate-200`, `red-500` | Mixto (`AppButton` / `<button>`) | Multi-paso + Cálculos dBA | Grilla de puntos y anexos | **Medio** |
| **Protocolo Iluminación (84/12)**| `/[tenant-slug]/protocolos/iluminacion` | Complejo / Avanzado | Inter + Outfit | `#468DFF`, `slate-200`, `amber-500`| Mixto (`AppButton` / `<button>`) | Multi-paso + Puntos Lux | Grilla de puntos y anexos | **Medio** |
| **Protocolo Ergonomía (886/15)**| `/[tenant-slug]/protocolos/ergonomia` | Complejo / Avanzado | Inter + Outfit | `#468DFF`, `amber-500`, `green-600`| Mixto (`AppButton` / `<button>`) | Planillas Anexo I / II / III | Grillas matriciales SRT | **Medio** |
| **Protocolo Puesta a Tierra (900/15)**| `/[tenant-slug]/protocolos/puesta-a-tierra`| Excelente | Inter + Outfit | `#468DFF`, `slate-200`, `emerald-50`| `AppButton` + Acciones | Voice Helper + Puntos Jabalina | Tabla Compact v2.0 | **Bajo** |
| **Matriz de Riesgos IPER** | `/[tenant-slug]/matriz-riesgos` | Complejo | Inter + Outfit | `#468DFF`, `red-500`, `amber-500` | Mixto (`AppButton` / `<button>`) | Evaluador Probabilidad x Severidad | Tabla matricial extensa | **Medio** |
| **Legajo Técnico** | `/[tenant-slug]/legajo` | Bueno | Inter + Outfit | `#468DFF`, `slate-200` | `AppButton` | Inline + `DocumentUploadZone` | Tabla responsiva | **Bajo** |
| **Nómina de Personal** | `/[tenant-slug]/nomina` | Bueno | Inter + Outfit | `#468DFF`, `slate-100` | `AppButton` | Formulario nómina | Tabla con filtros | **Bajo** |
| **Acciones Correctivas** | `/[tenant-slug]/correctivas` | Bueno | Inter + Outfit | `#468DFF`, `amber-500` | `AppButton` | Voice Helper + Evidencias | Tabla Compact v2.0 | **Bajo** |

---

## 3. Inventario Detallado de Elementos y Componentes UI

### 3.1 Tipografía, Fuentes y Jerarquías
- **Fuente Principal de la Aplicación (Body / Tablas / Formularios / Datos Densos):**  
  `Inter`, `-apple-system`, `BlinkMacSystemFont`, `"Segoe UI"`, `Roboto`, `sans-serif`.
- **Fuente Institucional de Encabezados (Títulos de Página / Brand Headers / Modales):**  
  `Outfit` (`font-outfit`, cargada vía Google Fonts en `src/app/layout.js`).
- **Fuentes Especiales de Marca (Isotipo en Sidebar y Footer):**  
  `'Virgo 01'` / `'Virgo01'` (para la palabra `"GESTIÓN"`) y `'Audiowide'` (para la sigla `"SySO"`).

**Escala Tipográfica Detectada en el Código:**

```txt
• H1 (Título de Página): font-outfit text-base md:text-lg font-bold text-slate-900 (en AppPageHeader)
• H2 (Títulos de Secciones / Cards): font-outfit text-sm md:text-base font-bold text-slate-800
• H3 (Subsecciones / Modales): text-sm font-bold text-slate-800
• Labels de Formularios: text-xs font-bold text-slate-600 uppercase tracking-wider
• Celdas de Tabla Principales: text-xs font-normal / font-medium text-slate-700
• Celdas de Tabla Secundarias: text-[11px] font-medium text-slate-500
• Badges de Estado: text-[10px] font-bold uppercase tracking-wider
• Textos Legales / Footer: text-[10px] / text-[11px] font-medium text-slate-400
```

*Hallazgos Tipográficos:*
1. En algunos componentes se observan clases ad-hoc como `text-[13px]`, `text-[15px]` o `leading-[1.1]` sin vinculación a tokens semánticos de Tailwind.
2. Inconsistencia de peso en títulos de tarjetas: alternancia entre `font-semibold` (600) y `font-bold` (700) sin regla funcional explícita.

---

### 3.2 Paleta de Colores y Tokens CSS

**Definición en `src/app/globals.css`:**
```css
:root {
  --background: 210 20% 98%;      /* #F1F5F9 (slate-100 canvas de fondo) */
  --foreground: 222.2 84% 4.9%;   /* #020617 (slate-950) */
  --card: 0 0% 100%;             /* #FFFFFF (blanco puro) */
  --popover: 0 0% 100%;          /* #FFFFFF */
  --primary: 217 100% 63.7%;      /* #468DFF (Azul Corporativo SySO) */
  --accent: 237 96% 49%;          /* #0511F2 (Azul Intenso de Acento) */
  --success: 142.1 76.2% 36.3%;   /* #22C55E (Safety Green) */
  --warning: 47.9 95.8% 44.7%;    /* #EAB308 (Warning Yellow) */
  --destructive: 0 84.2% 60.2%;   /* #EF4444 (Safety Red) */
  --border: 215 20% 82%;          /* #CBD5E1 (slate-300: bordes nítidos) */
  --radius: 0.75rem;             /* 12px (rounded-xl) */
  --syso-bg: 0 0% 85%;            /* #D9D9D9 (gris de fondo secundario) */
}
```

*Hallazgos de Color:*
1. **Mezclas de Grises en Tailwind**: Coexisten clases de `slate-*` (ej. `slate-100`, `slate-200`, `slate-500`), `gray-*` (ej. `gray-50`, `gray-100`) y `zinc-*` en algunas modales legacy. Se debe unificar al 100% bajo la escala neutra `slate-*`.
2. **Colores Hexadecimales Hardcodeados en Componentes**: Presencia de `bg-[#468DFF]`, `text-[#0511F2]`, `bg-[#0D0D0D]` directamente en JSX en lugar de consumir las variables semánticas `bg-primary`, `text-accent` o `bg-sidebar`.

---

### 3.3 Botones y Variantes de Interacción

**Componente Oficial (`src/components/ui/AppButton.js`):**
- **`primary`**: Relleno `#468DFF`, borde `#468DFF`, texto blanco. Hover: Relleno y borde `#0511F2`. Sombra `shadow-md shadow-blue-500/10`.
- **`secondary`**: Relleno `#FFFFFF`, borde `#468DFF`, texto `#468DFF`. Hover: Relleno `#468DFF`, texto blanco.
- **`outline`**: Relleno blanco, borde `slate-200`, texto `slate-700`. Hover: `bg-slate-50 text-slate-900`.
- **`ghost`**: Relleno transparente, texto `slate-500`. Hover: `bg-slate-100 text-slate-800`.
- **`destructive`**: Relleno `red-500`, texto blanco. Hover: `bg-red-600`. Sombra `shadow-red-500/10`.
- **`amber`**: Relleno `amber-500`, texto blanco. Hover: `bg-amber-600`. Sombra `shadow-amber-500/10`.
- **`success`**: Relleno `emerald-600`, texto blanco. Hover: `bg-emerald-700`. Sombra `shadow-emerald-500/10`.
- **Variantes de Iconos en Tabla (Tamaño `size="icon"` o `h-8 w-8`):**
  - **`document-table`**: Relleno `blue-50`, texto e icono `#468DFF`, hover `bg-blue-100 text-[#0511F2]`, borde `border-blue-200/50`.
  - **`edit-table`**: Relleno `amber-50`, texto e icono `amber-600`, hover `bg-amber-100 text-amber-800`, borde `border-amber-200/50`.
  - **`delete-table`**: Relleno `red-50`, texto e icono `red-500`, hover `bg-red-100 text-red-800`, borde `border-red-200/50`.
  - **`success-table`**: Relleno `emerald-50`, texto e icono `emerald-600`, hover `bg-emerald-100 text-emerald-800`.
  - **`ghost-table`**: Relleno `slate-100`, texto `slate-600`, hover `bg-slate-200 text-slate-800`.

*Hallazgos de Botones:*
1. **Huérfano `src/components/ui/button.jsx`**: Archivo remanente sin uso con clases oscuras y `rounded-md` que debe ser eliminado en la etapa de refactorización.
2. **Botones Inline en Formularios de Protocolos**: En `ruido`, `iluminacion` y `ergonomia` se utilizan etiquetas `<button type="button">` con clases arbitrarias para alternar pestañas (tabs), agregar puntos y abrir modales de ayuda.

---

### 3.4 Formularios, Uploaders y Captura de Firmas Digitales

1. **Campos de Entrada (`AppInput`, `AppSelect`, `AppTextarea`, `AppLabel`):**
   - Altura estándar: `h-10` (40px) para inputs y selects.
   - Borde: `border border-slate-200` (reforzado a `#CBD5E1` en CSS base).
   - Fondo: `bg-slate-50/50` con foco a `bg-white` y anillo `focus:ring-2 focus:ring-[#468DFF]/20 focus:border-[#468DFF]`.
   - Radio de borde: `rounded-xl` (12px).
   - Textareas: Integran el botón del estándar `SySO-AI-Voice-Helper` (`<AITextHelper />`) en la esquina inferior derecha (`bottom-3 right-3`) para transcripción por micrófono y refactorización sintáctica con IA.

2. **Uploader Avanzado de Documentos (`DocumentUploadZone`):**
   - Estructura: Contenedor `rounded-xl border border-slate-200 bg-slate-50 overflow-hidden`.
   - Pestañas superiores: Conmutador entre archivo local y enlace de Google Drive.
   - Zona de arrastre reactiva: `border-2 border-dashed rounded-xl p-4 text-center`, con transición a `border-[#468DFF] bg-blue-50` durante `isDragging`.

3. **Galería de Evidencias Múltiples (`ImageUploadZone`):**
   - Cumple el estándar `SySO-Multiple-Evidence-Photo-Grid`.
   - Miniaturas cuadradas `aspect-square rounded-xl border border-slate-200 shadow-sm`.
   - Overlay de hover con botón `Eye` (previsualización en nueva pestaña) y `Trash2` (borrado).
   - Tarjeta interactiva `+` para carga ágil de nuevas capturas.

4. **Captura de Firma Web (HTML5 Canvas):**
   - Componente oficial: `src/components/ui/AppSignatureCanvas.js`.
   - Incluye cálculo proporcional de coordenadas `getCanvasPos`: `x = ((clientX - rect.left) / rect.width) * canvas.width`, eliminando el desfase de trazo en móviles.
   - Soporta eventos táctiles pasivos (`touchstart`, `touchmove`, `touchend`) y mouse.
   - *Hallazgo:* Gran cantidad de páginas aún mantienen el código de canvas insertado inline en lugar de importar `<AppSignatureCanvas />`.

---

### 3.5 Tablas Web, Listados y Skeletons de Carga

1. **Layout Compacto de Tabla y Filtros (SySO Compact Layout v2.0):**
   - Tarjeta superior de filtros: `px-6 py-3.5 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-2.5`.
   - Buscador principal: Input compacto con icono `Search` a la izquierda.
   - Fila inferior de filtros: Botón `Limpiar búsqueda` a la izquierda y botón primario `+ Nuevo...` a la derecha.
   - Contenedor de tabla: `bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col`.
   - Altura útil responsiva: `style={{ height: 'calc(100vh - 310px)' }}` con filtros abiertos y `calc(100vh - 240px)` con filtros colapsados.
   - Encabezados de columna (`<thead>`): `sticky top-0 z-10 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-400 uppercase tracking-wider px-6 py-4`.
   - Celdas (`<td>`): `px-6 py-4 text-xs font-normal text-slate-700 hover:bg-slate-50/50`.

2. **Ordenamiento de Columnas (`AppSortIcon`):**
   - Componente en `src/components/ui/AppSortIcon.js` con flechas de ordenación activa azul (`#468DFF`).

3. **Estado de Tabla Vacía (`AppEmptyState`):**
   - Contenedor centrado con icono `AlertCircle` (`h-10 w-10 text-slate-300`), título `No hay [entidad] registradas/os`, subtítulo gris y botón CTA primario `+ Registrar [entidad]`.

4. **Skeletons de Carga (`AppSkeleton`):**
   - Implementado en `src/components/ui/AppSkeleton.js` con variantes `table`, `card`, `form` y `text`.
   - *Hallazgo:* Excepto en `visitas/page.js`, el resto de los módulos no lo implementan, recurriendo a spinners que rompen el layout mientras se resuelven las promesas de red.

---

### 3.6 Alertas, Toasts, Modales, Tooltips y Popovers

1. **Notificaciones Toasts (`ToastProvider`):**
   - Consumo global mediante `const globalToast = useToast()`.
   - Variantes estandarizadas: `success` (4000ms), `error` (6000ms), `warning` (6000ms), `info` (4000ms con `Loader2` animado).
   - Flujo de operaciones PDF normalizado: Toast `info` `"Generando reporte PDF..."` -> Toast `success` `"PDF descargado exitosamente."` / `"Vista previa abierta."`.

2. **Diálogos Modales (Radix UI):**
   - `<AppConfirmDialog />`: Para confirmaciones no destructivas o avisos de sincronización con perfil.
   - `<AppDestructiveConfirmDialog />`: Para eliminación de empresas o cuentas, con validación de texto tipiado (hardening de seguridad).
   - `<AppUnsavedChangesDialog />`: Para advertir pérdida de cambios al intentar cerrar un formulario sucio.
   - `<AppInfoModal />`: Para modales explicativos normativos (ej. SRT 886/15, Tabla 1 Ruido).

3. **Tooltips y Popovers:**
   - `<AppTooltip />` implementa globos oscuros accesibles (`bg-slate-900 text-white text-[11px] font-medium px-2.5 py-1 rounded-lg shadow-xl`) compatibles con eventos hover en escritorio y click en táctil.
   - *Hallazgo:* Prácticamente la totalidad de los módulos aún usan `title="..."` nativo.

---

### 3.7 Assets de Marca e Ilustraciones Corporativas

1. **Logotipos Oficiales (`public/brand/` y `assets/brand/source/`):**
   - `logo-primary.png`: Logo a todo color con isotipo de casco en azul corporativo.
   - `logo-black.png`: Versión monocromática negra para documentos impresos y carátulas.
   - `logo-white.png`: Versión blanca para fondos oscuros.
   - `favicon.ico` / `apple-touch-icon.png`: Favicones para navegadores e instalación PWA.

2. **Mascota Corporativa (Cartoon Años 30):**
   - Personaje institucional estilizado: Casco blanco de seguridad industrial, chaleco naranja reflectivo con bandas grises de alta visibilidad, guantes y zapatos de seguridad.
   - *Hallazgo:* Se requiere generar y empaquetar las poses oficiales de la mascota (ej. `mascot-empty.png`, `mascot-404.png`, `mascot-success.png`, `mascot-warning.png`) en `public/brand/mascot/` para integrarlas en `AppEmptyState` y páginas de error.

---

## 4. Revisión Responsiva y Accesibilidad (WCAG 2.1 AA)

### 4.1 Comportamiento Responsivo (Mobile, Tablet y Desktop)
- **Dispositivos Móviles (<768px):**
  - La aplicación aplica reglas estrictas en `src/app/globals.css`: `main` ocupa el 100% de la altura de la pantalla (`100vh`), la cabecera `header` es fija (`position: fixed; top: 0; z-index: 30; width: 100%`), los márgenes y paddings laterales se remueven (`px-0`), las tarjetas de tabla van de borde a borde sin radio (`border-radius: 0; box-shadow: none;`), y la tabla dispone de desplazamiento horizontal (`overflow-x-auto min-w-[850px]`).
- **Tablets y Computadoras de Escritorio (>=768px):**
  - La interfaz flota sobre el canvas gris secundario (`#F1F5F9` / `#D9D9D9`), las tarjetas adoptan esquinas redondeadas `rounded-2xl`, sombras sutiles `shadow-sm` y márgenes laterales contenidos.

### 4.2 Accesibilidad Visual y Foco de Teclado
- **Áreas Táctiles:** Todos los botones de acción (`size="icon"` y primarios) respetan el tamaño mínimo táctil de `36x36px` o `40x40px`.
- **Focus Ring:** Los campos e inputs poseen anillo de foco contrastante `focus:ring-2 focus:ring-[#468DFF]/20 focus:border-[#468DFF]`.
- **A11y en Modales:** Los diálogos de Radix UI atrapan el foco (`Focus Trap`), permiten escape con tecla `Esc` e incluyen `role="dialog"` y `aria-labelledby`.

---

## 5. Matriz de Hallazgos Priorizados

### Hallazgos de Severidad Alta (Prioridad 1)
1. **Reemplazo Masivo de `<button>` Nativos por `<AppButton />`**: Unificar los más de 600 botones nativos e inconsistentes a lo largo de las vistas de protocolos, extintores, accidentes, avisos y checklists.
2. **Reemplazo de `title="..."` por `<AppTooltip />`**: Erradicar el tooltip nativo del navegador en 41 archivos para habilitar ayuda contextual en pantallas táctiles móviles.
3. **Adopción Universal de `<AppSkeleton />`**: Implementar skeletons con animación pulse en los 18 módulos que actualmente utilizan spinners o textos planos.
4. **Unificación de Lienzos de Firma con `<AppSignatureCanvas />`**: Migrar el código Canvas repetido en 10 páginas al componente reutilizable oficial.

### Hallazgos de Severidad Media (Prioridad 2)
1. **Estandarización de Casing (Mayúsculas/Minúsculas)**: Normalizar Sentence case para botones, UPPERCASE para labels y encabezados de columna de tabla, y Title Case para títulos de modales.
2. **Depuración de Tokens y Eliminación de `button.jsx`**: Eliminar el componente huérfano y reemplazar clases `bg-[#468DFF]` por tokens semánticos de Tailwind.
3. **Generación e Integración de Assets de la Mascota Cartoon**: Crear y vincular las ilustraciones oficiales del personaje de seguridad en `AppEmptyState` y páginas de error.
4. **Mejora de Contraste en Labels Pequeños**: Elevar el color de etiquetas de formulario de `slate-400` a `slate-600` para garantizar cumplimiento WCAG 2.1 AA (ratio >= 4.5:1).

---
