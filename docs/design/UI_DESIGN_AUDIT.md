# Informe de Auditoría de Diseño UI, Consistencia Visual y Accesibilidad — Gestión SySO

**Fecha de Auditoría:** 12 de Agosto de 2026  
**Auditor Senior:** Arquitecto Principal de UX/UI, Design System & Frontend  
**Estado de Código:** Auditoría pasiva integral (Sin modificación de código fuente)  
**Proyecto:** SaaS Gestión SySO (Gestión Integral de Higiene y Seguridad en el Trabajo)  

---

## 1. Resumen Ejecutivo

### 1.1 Diagnóstico General de la Interfaz Web
La aplicación web de **Gestión SySO** exhibe una identidad visual profesional y limpia alineada al dominio de la Higiene, Seguridad y Salud Ocupacional. La plataforma ha consolidado su paleta oficial basada en el Azul Corporativo SySO (`#468DFF` / **Blue-500**), el Azul Intenso de Acento (`#0511F2`), Gris Neutro Secundario (`#D9D9D9` / `slate-100`), Blanco (`#FFFFFF`) y Negro Carbón (`#000000` / `slate-950`).

Adicionalmente, se registran importantes avances recientes como:
- **SySO Compact Layout v2.0**: Reducción del padding vertical en las tarjetas superiores de herramientas y filtros (de 24px a 14px en escritorio) implementado en 15 módulos del sistema.
- **Librería de Componentes Unificados en `src/components/ui/`**: `AppButton`, `AppInput`, `AppSelect`, `AppTextarea`, `AppCard`, `AppPageHeader`, `AppInfoModal`, `AppConfirmDialog`, `AppDestructiveConfirmDialog`, `AppUnsavedChangesDialog`, `DocumentUploadZone` e `ImageUploadZone`.
- **Estándar de Asistente de Voz e IA (`AITextHelper`)**: Integración de dictado por voz y pulido con Google Gemini en campos de texto técnico de largo formato.
- **Estándar `SySO-Multiple-Evidence-Photo-Grid`**: Grilla uniforme con miniaturas, visor en pantalla completa y botón de adición rápida `+`.

Sin embargo, tras la revisión exhaustiva de todas las rutas y componentes, se identifican **inconsistencias y desviaciones de diseño relevantes**:

1. **Variación de Tipografía y Escalas**: Coexistencia entre la tipografía de encabezados e identidad (`Outfit` / `.font-outfit`) y la fuente de cuerpo (`Inter` / system-ui), con dispersión de tamaños sin escala semántica estricta (`text-[10px]`, `text-[11px]`, `text-xs`, `text-sm`, `text-base`).
2. **Mezcla Inconsistente de Casing (Mayúsculas/Minúsculas)**: Convivencia no normada entre `UPPERCASE`, `Title Case` y `Sentence case` en botones (`"NUEVO PROTOCOLO"` vs `"Nuevo Protocolo"` vs `"Guardar"`), encabezados de tabla, etiquetas de formularios y badges de estado.
3. **Ausencia de Componente Estandarizado de Captura de Firma Canvas (`AppSignatureCanvas`)**: El lienzo interactivo de firma digital HTML5 Canvas se encuentra duplicado con lógica e interfaces nativas inline en `visitas/page.js`, `capacitar/[token]/page.js`, `profile/page.js` y generadores de protocolos, en lugar de consumir un componente reutilizable.
4. **Falta de Skeletons de Carga Reutilizables (`AppSkeleton`)**: La aplicación carece de componentes estructurados con animación de pulso (`animate-pulse`) para tarjetas, formularios y tablas, utilizando en su lugar indicadores de texto o spinners (`Loader2 animate-spin`) desalineados del layout final.
5. **Uso Exclusivo de Tooltips Nativos del Navegador (`title="..."`)**: Inexistencia de un componente `AppTooltip` o `AppPopover` accesible, provocando textos emergentes no estilizados que no funcionan en dispositivos táctiles/móviles.
6. **Integración Gráfica e Ilustraciones de Marca**: Ilustraciones de empty states y pantallas de error (404/500) dispersas, requiriendo normar la incorporación del personaje corporativo cartoon estilo años 30 (casco blanco, chaleco naranja reflectivo y zapatos de seguridad) para mantener el tono técnico humano de la plataforma.

---

## 2. Mapa Visual por Sección y Módulo de la Aplicación

| Módulo / Sección | Ruta | Estado Visual | Tipografía | Paleta de Colores | Botones | Formularios / Uploaders | Tablas Web | Nivel de Riesgo |
|---|---|---|---|---|---|---|---|---|
| **Portal de Autenticación / Login** | `/login`, `/registro` | Excelente | Outfit + Inter | `#468DFF`, `slate-900`, `syso-bg` | `AppButton` | `AppInput` | N/A | **Bajo** |
| **Onboarding** | `/onboarding` | Muy Bueno | Outfit + Inter | `#468DFF`, `#0511F2` | `AppButton` | `AppInput`, `AppSelect` | N/A | **Bajo** |
| **Dashboard Principal** | `/[tenant-slug]/dashboard` | Muy Bueno | Outfit + Inter | `#468DFF`, `slate-100`, `#00b050` | Segmentados + `AppButton` | N/A | Tabla Vencimientos (Sticky `thead`) | **Bajo** |
| **Clientes / Empresas** | `/[tenant-slug]/empresas` | Excelente | Outfit + Inter | `#468DFF`, `slate-300`, `logos` bucket | `AppButton` | `AppInput`, `ImageUploadZone` (Logo) | Tabla con Avatar Logo | **Bajo** |
| **Legajo Técnico** | `/[tenant-slug]/legajo` | Bueno | Inter + Outfit | `#468DFF`, `slate-200` | `AppButton` | Inline + `DocumentUploadZone` | Tabla responsiva | **Bajo** |
| **Equipo de Trabajo** | `/[tenant-slug]/equipo` | Excelente | Inter + Outfit | `#468DFF`, `slate-100` | `AppButton` (Compact v2.0) | Modal Inline (`overflow-y-auto`) | Tabla de integrantes | **Bajo** |
| **Visitas Técnicas** | `/[tenant-slug]/visitas` | Muy Bueno | Inter + Outfit | `#468DFF`, `blue-50`, `amber-50` | `AppButton` + Acciones | Voice Helper + Canvas Firma | Tabla estandarizada | **Medio** |
| **Avisos de Riesgo** | `/[tenant-slug]/avisos` | Bueno | Inter + Outfit | `#468DFF`, `red-500` | `AppButton` | Inline + Photo Grid | Tabla estandarizada | **Bajo** |
| **Investigación Accidentes** | `/[tenant-slug]/accidentes` | Bueno | Inter + Outfit | `#468DFF`, `red-600` | `AppButton` | Voice Helper + Photo Grid | Tabla estandarizada | **Bajo** |
| **Extintores / Ignífugos** | `/[tenant-slug]/extintores` | Bueno | Inter + Outfit | `#468DFF`, `amber-500` | `AppButton` | Inline + Photo Grid | Tabla estandarizada | **Bajo** |
| **Control Eléctrico** | `/[tenant-slug]/control-electrico` | Bueno | Inter + Outfit | `#468DFF`, `amber-500` | `AppButton` | Inline + Photo Grid | Tabla estandarizada | **Bajo** |
| **Checklists Personalizados**| `/[tenant-slug]/checklist-personalizados` | Bueno | Inter + Outfit | `#468DFF`, `slate-100` | `AppButton` | Cuestionarios dinámicos | Tabla estandarizada | **Bajo** |
| **Programa Anual** | `/[tenant-slug]/programa` | Bueno | Inter + Outfit | `#468DFF`, `slate-200` | `AppButton` | Formulario cronograma | Grilla Gantt / Cronograma | **Medio** |
| **Capacitaciones Presenciales**| `/[tenant-slug]/capacitacion` | Bueno | Inter + Outfit | `#468DFF`, `blue-50` | `AppButton` | Formulario + Firmas | Tabla de registros | **Bajo** |
| **Capacitaciones Online** | `/[tenant-slug]/capacitaciones-online` | Excelente | Inter + Outfit | `#468DFF`, `blue-50`, `red-50` | Pictogramas unificados | Duración MIN/HS + Modal PPT Tip | Tabla con Recursos PDF/Video | **Bajo** |
| **Portal Público Asistencia** | `/capacitar/[token]` | Excelente | Outfit + Inter | `#468DFF`, `slate-50`, `PublicFooter` | `AppButton` + Paneles | Visor PdfSlideViewer + Canvas | N/A | **Bajo** |
| **Protocolo Ergonomía** | `/[tenant-slug]/protocolos/ergonomia` | Complejo | Inter | `#468DFF`, `amber-500` | Mixto (`AppButton` / `<button>`) | Formulario multi-paso SRT 886/15 | Grillas complejas SRT | **Alto** |
| **Protocolo Ruido** | `/[tenant-slug]/protocolos/ruido` | Complejo | Inter | `#468DFF`, `slate-200` | Mixto (`AppButton` / `<button>`) | Formulario anexos SRT 85/12 | Grillas de mediciones | **Alto** |
| **Protocolo Iluminación** | `/[tenant-slug]/protocolos/iluminacion` | Complejo | Inter | `#468DFF`, `slate-200` | Mixto (`AppButton` / `<button>`) | Formulario anexos SRT 84/12 | Grillas de puntos lux | **Alto** |
| **Matriz de Riesgos IPER** | `/[tenant-slug]/matriz-riesgos` | Complejo | Inter | `#468DFF`, `red-500`, `amber-500` | `AppButton` | Evaluador de probabilidad/severidad | Tabla matricial extensa | **Alto** |
| **Acciones Correctivas** | `/[tenant-slug]/correctivas` | Bueno | Inter + Outfit | `#468DFF`, `amber-500` | `AppButton` | Inline + Voice Helper | Tabla estandarizada | **Bajo** |
| **Perfil / Planes Billing** | `/[tenant-slug]/profile` | Muy Bueno | Outfit + Inter | `#468DFF`, `#0511F2` | `AppButton` | Tarjeta MP + Modales Plan | Cards de Suscripción | **Bajo** |
| **Legales / Términos** | `/terminos`, `/privacidad` | Excelente | Inter + Outfit | `#468DFF`, `slate-800` | `AppButton` | N/A | N/A | **Bajo** |

---

## 3. Inventario Detallado de Elementos UI

### 3.1 Tipografía y Escalas Visuales
- **Fuente Principal del Sistema (Body / Datos)**: `Inter`, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto.
- **Fuente Institucional de Encabezados (Titles / Branding)**: `Outfit` (`.font-outfit`).

**Evaluación de Jerarquía Actual:**
- **H1 (Título de Página)**: Clases `font-outfit text-xl sm:text-2xl font-extrabold text-slate-900`. Renderizado consistente en `AppPageHeader`.
- **H2 (Títulos de Secciones y Cards)**: Clases `font-outfit text-base sm:text-lg font-bold text-slate-800`.
- **H3 (Subtítulos y Cabeceras de Modales)**: Clases `text-sm font-bold text-slate-800` o `font-outfit text-sm font-bold text-white` (en modales oscuros).
- **Labels Técnicos de Formularios**: Variaciones entre `text-[10px] font-bold text-slate-400 uppercase` y `text-xs font-bold text-slate-600 uppercase`.
- **Celdas de Tablas**: Clases `text-xs font-medium text-slate-700`.

### 3.2 Paleta de Colores y Tokens

```css
:root {
  --primary: 217 100% 63.7%; /* #468DFF - Azul Corporativo SySO */
  --accent: 237 96% 49%;     /* #0511F2 - Azul Intenso Acento */
  --syso-bg: 0 0% 85%;       /* #D9D9D9 - Neutral Secundario */
  --border: 215 20% 82%;     /* #cbd5e1 - Slate-300 Nítido */
  --foreground: 222.2 84% 4.9%; /* #020617 - Slate-950 */
}
```

- **Azul Primario (`#468DFF`)**: Aplicado en botones primarios, iconos de acción, sidebar activo, encabezados de tabla y badges informativos.
- **Azul Intenso (`#0511F2`)**: Aplicado en el estado `:hover` de botones primarios, enlaces activos y focos interactivos.
- **Gris de Bordes (`#cbd5e1` / `slate-300`)**: Configurado en `globals.css` como refuerzo visual de delineado nítido para todos los contenedores e inputs.
- **Colores Semánticos de Estado**:
  - **Éxito / Realizado**: `#16a34a` / `green-600` / `#00b050` (Badges de visitas/capacitaciones).
  - **Advertencia / En Proceso**: `#f59e0b` / `amber-500` / `amber-600` (Edición, avisos).
  - **Peligro / Vencido / Eliminar**: `#ef4444` / `red-500` / `red-600` (Eliminación, accidentes).

### 3.3 Botones y Variantes (`AppButton`)
El sistema utiliza el componente unificado `AppButton` con el siguiente patrón de diseño:
- **Primario**: `bg-[#468DFF] text-white border border-[#468DFF] hover:bg-[#0511F2] hover:border-[#0511F2] rounded-xl font-bold text-xs shadow-md shadow-[#468DFF]/10`.
- **Secundario / Salir**: `bg-white text-[#468DFF] border border-[#468DFF] hover:bg-[#468DFF] hover:text-white rounded-xl font-bold text-xs`.
- **Editar (Formulario)**: `bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold`.
- **Editar (Icono en Tabla)**: `p-1.5 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors`.
- **Eliminar (Formulario)**: `bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-bold`.
- **Eliminar (Icono en Tabla)**: `p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors`.
- **Documento / PDF (Icono en Tabla)**: `p-1.5 rounded-lg bg-blue-50 text-[#468DFF] hover:bg-blue-100 hover:text-[#0511F2] transition-colors` con icono `FileText` de Lucide React (`h-4.5 w-4.5`).

### 3.4 Formularios, Uploaders y Captura de Firmas
- **Campos de Entrada (`AppInput`, `AppSelect`, `AppTextarea`)**: Altura estandarizada `h-10` (40px) para inputs/selects, borde `#cbd5e1`, esquinas `rounded-xl`, focus ring en `#468DFF`.
- **Componentes Avanzados de Carga**:
  - `DocumentUploadZone`: Soporte para arrastre drag & drop y pestañas de conmutación local / Google Drive URL.
  - `ImageUploadZone` (`SySO-Multiple-Evidence-Photo-Grid`): Carga individual o múltiple con grilla de miniaturas cuadradas, overlay de hover (`Eye` / `Trash2`), botón de carga rápida `+` y helper de des-serialización JSON.
- **Captura de Firmas Web (Canvas HTML5)**:
  - Implementación con escalado de coordenadas proporcionales (`getCanvasPos`): `(clientX - rect.left) * (canvas.width / rect.width)` que elimina desfases de trazo en móviles y escritorio.
  - *Hallazgo:* Falta abstraer a `<AppSignatureCanvas />` para evitar duplicación de código en 4 módulos.

### 3.5 Tablas Web, Filtros y Skeletons de Carga
- **Layout Compacto de Tabla y Filtros (SySO Compact Layout v2.0)**:
  - Tarjeta superior de herramientas con padding compacto `px-3.5 py-2.5 sm:px-5 sm:py-3 md:px-6 md:py-3.5` y espacio `space-y-2.5`.
  - Buscador responsivo (`w-full md:w-64`) con icono `Search` a la izquierda.
  - Botones de exportación e impresión estandarizados.
  - Sub-barra inferior con botón `Limpiar búsqueda` a la izquierda y botón primario `+ Nuevo...` a la derecha.
- **Encabezados de Tabla (`<thead>`)**: Posicionamiento adhesivo (`sticky top-0 z-10 bg-slate-50 border-b border-slate-200`), texto `text-xs font-bold text-slate-400 uppercase tracking-wider`.
- **Estado de Tabla Vacía (`AppEmptyState`)**: Icono `AlertCircle` (`h-10 w-10 text-slate-300`), título `No hay [entidad] registradas/os` y botón CTA primario `+ Registrar [entidad]`.
- **Skeletons de Carga**: *Hallazgo:* Actualmente se utilizan leyendas de texto o spinners en lugar de un componente `<AppSkeleton />` con grillas y barras desdibujadas animadas (`animate-pulse`).

### 3.6 Alertas, Toasts, Modales, Tooltips y Popovers
- **Feedback y Notificaciones (Toasts)**: Consumo global de `useToast()` con estándares:
  - Operación PDF: Alerta `info` `"Generando reporte PDF..."` -> Alerta `success` `"PDF descargado exitosamente."` / `"Vista previa abierta."`.
- **Diálogos Emergentes**: Consumo de Radix UI unificado en `AppConfirmDialog`, `AppDestructiveConfirmDialog` y `AppUnsavedChangesDialog`.
- **Tooltips y Popovers**: *Hallazgo:* Prevalencia de `title="..."` nativo. Se requiere unificar con un componente `<AppTooltip />` estilizado y compatible con pantallas táctiles.

### 3.7 Assets de Marca e Ilustraciones Corporativas
- **Logotipos de Marca**: Ubicados en `public/brand/` (`logo-primary.png`, `logo-black.png`, `logo-white.png`, `favicon.ico`).
- **Mascota Corporativa (Cartoon 1930s)**: Personaje caricaturesco institucional (casco blanco de seguridad, chaleco naranja reflectivo con bandas grises y zapatos de seguridad) para ilustrar estados vacíos, mensajes informativos y páginas de bienvenida u error (404/500).

---

## 4. Revisión Responsiva y Accesibilidad (a11y)

### 4.1 Adaptabilidad Responsiva (Mobile, Tablet, Desktop)
- **Celular (<768px)**: Las páginas ocupan la totalidad de la pantalla sin padding sobrante (`px-0`), la cabecera es fija (`position: fixed; z-index: 30`), las tarjetas de listado van de borde a borde sin bordes redondeados (`border-radius: 0`), y las tablas poseen scroll horizontal independiente (`overflow-x-auto`).
- **Tablet y Desktop (>=768px)**: La interfaz flota sobre el canvas gris (`#f1f5f9` / `#D9D9D9`), recuperando tarjetas redondeadas (`rounded-2xl border border-slate-200 shadow-sm`) y márgenes laterales contenedores.

### 4.2 Accesibilidad Visual (WCAG 2.1 AA)
- **Relación de Contraste**: El texto `slate-400` (`#94a3b8`) sobre blanco en tamaños pequeños (10px) carece del ratio mínimo 4.5:1. Se propone elevar a `slate-600` (`#475569`).
- **Áreas Táctiles Mínimas**: Todos los botones e iconos interactivos en vista móvil garantizan una superficie mínima de toque de `36x36px` o `40x40px`.

---

## 5. Listado de Hallazgos Priorizados

### Hallazgos Críticos (Prioridad Alta)
1. **Ausencia de Componente Estandarizado de Firma Canvas (`AppSignatureCanvas`)**: Duplicación de lógica de firma interactiva en 4 módulos.
2. **Uso de Tooltips Nativos del Navegador (`title="..."`)**: Inaccesibles en dispositivos táctiles/móviles y desalineados del design system.
3. **Contraste Reducido en Labels de Formulario**: Uso de `slate-400` en etiquetas de campos en tamaño `10px`.

### Hallazgos Medios (Prioridad Media)
1. **Falta de Componente Skeleton de Carga (`AppSkeleton`)**: Sustitución de loaders visuales por spinners genéricos que mueven el layout durante el fetch.
2. **Casing Heterogéneo en Botones y Badges**: Convivencia de mayúsculas sostenidas y capitalización de oraciones.
3. **Estandarización de Ilustraciones de la Mascota Cartoon**: Integrar el personaje institucional en pantallas de error y empty states.

---
