# Plan de Implementación: Ayuda Contextual In-App — Gestión SySO

> **Versión:** 1.0  
> **Fecha:** 2026-08-22  
> **Autor:** Equipo de Producto — Gestión SySO  
> **Estado:** Borrador para Revisión

---

## 1. Resumen Ejecutivo

### 1.1. Propósito

Este documento establece el plan estratégico completo para diseñar, desarrollar e integrar un **sistema de Ayuda Contextual In-App** en toda la plataforma SaaS **Gestión SySO**. La visión del producto es que cada módulo, sección, vista y formulario cuente con un ícono de ayuda (`?`) siempre visible, que al ser activado despliegue un panel lateral (*Slide-Over*) con un instructivo paso a paso, específico para esa pantalla exacta, sin interrumpir el flujo de trabajo del usuario.

### 1.2. Filosofía: "Ayuda a un clic de distancia"

Los usuarios de Gestión SySO —profesionales de Seguridad e Higiene, técnicos en campo y administradores de empresas— trabajan con formularios técnicos complejos regulados por normativas (Res. SRT 84/12, Decreto 351/79, etc.) que requieren comprensión específica. En lugar de enviarlos a un manual PDF extenso o a una base de conocimiento externa donde pierden contexto, la ayuda contextual:

- **Reduce la fricción:** La respuesta está exactamente donde surge la duda.
- **Preserva el contexto:** El panel lateral permite leer la guía mientras el formulario permanece visible detrás.
- **Democratiza el conocimiento:** Equipos nuevos o clientes auditores en modo solo lectura acceden a la misma calidad de instrucciones.

### 1.3. Beneficios Esperados

| Métrica | Situación Actual | Objetivo Post-Implementación |
|---|---|---|
| Tickets de soporte por "¿cómo se usa X?" | ~60% del total estimado | Reducción del 40-50% |
| Tiempo de onboarding de nuevos usuarios | Alto (requiere acompañamiento) | Autoservicio guiado |
| Tasa de compleción de formularios complejos | Abandono parcial frecuente | +30% de compleción |
| Autonomía del usuario final | Depende de soporte externo | Autónomo en el 80% de las tareas |
| NPS / Satisfacción del producto | Baseline actual | +15 puntos proyectados |

---

## 2. Arquitectura de Interfaz y Componentes (UX/UI)

### 2.1. Especificación del Disparador — El Ícono `?`

#### 2.1.1. Ubicación Principal: Integración en `AppPageHeader`

El disparador de ayuda contextual se integrará como un **botón adicional** dentro del componente existente [`AppPageHeader`](file:///c:/Users/sebas/.gemini/antigravity-ide/scratch/Gestion-SySO/src/components/ui/AppPageHeader.js), posicionado en la zona derecha del encabezado, entre el badge de plan y las acciones adicionales (`actions`).

**Diseño del botón disparador:**

```
┌─────────────────────────────────────────────────────────────────────┐
│  [☰]  🔵 Título de la Sección        [Empresa] [Plan] [?] [...]   │
│         ▲                                              ▲            │
│         Ícono + Título existente             Botón de Ayuda nuevo   │
└─────────────────────────────────────────────────────────────────────┘
```

- **Ícono:** `HelpCircle` de `lucide-react` (ya importado en el proyecto).
- **Estilo visual:**
  - **Estado normal:** Fondo `bg-[#468DFF]/10`, texto `text-[#468DFF]`, borde `border border-[#468DFF]/20`, radio `rounded-xl`.
  - **Estado hover:** Fondo `bg-[#468DFF]/20`, borde `border-[#468DFF]/40`, con `transition-all duration-200`.
  - **Tamaño:** `h-8 w-8` (32×32px) para consistencia con el badge de plan existente.
  - **Accesibilidad:** `aria-label="Abrir ayuda contextual"`, `title="¿Necesitás ayuda? Abrí la guía de esta sección"`.
- **Comportamiento:** `onClick` → abre el `<ContextualHelpPanel />`.
- **Visibilidad:** Siempre visible para **todos los roles** (admin, técnico, cliente auditor, modo solo lectura). Nunca se deshabilita con `!canEdit` ni `disabled`.

#### 2.1.2. Disparador Secundario: Secciones dentro de Formularios

Para formularios extensos con múltiples sub-secciones (ej. Accidentes con 5+ secciones internas, Protocolos con mediciones), se podrán agregar **disparadores secundarios** junto a los títulos internos de sección. Estos se visualizarán como un ícono `HelpCircle` más pequeño (`h-4 w-4`) en `text-slate-400 hover:text-[#468DFF]`, con `cursor-pointer`, que al hacer clic abrirá el panel de ayuda y desplazará automáticamente (scroll) al anclaje (`#seccion-especifica`) correspondiente dentro del contenido.

#### 2.1.3. Componente Propuesto: `<ContextualHelpTrigger />`

```jsx
// Firma propuesta (no implementar aún)
<ContextualHelpTrigger 
  helpKey="dashboard"       // Clave única que mapea al contenido de ayuda
  section="kpi-cards"       // Opcional: anclaje a sub-sección dentro del contenido
  variant="header"          // "header" (grande) | "inline" (pequeño junto a títulos)
/>
```

**Props propuestas:**

| Prop | Tipo | Default | Descripción |
|---|---|---|---|
| `helpKey` | `string` | *requerido* | Identificador único del artículo de ayuda (ej. `"dashboard"`, `"empresas-form"`, `"extintores-listado"`) |
| `section` | `string` | `null` | Anclaje opcional para scroll a sub-sección dentro del panel |
| `variant` | `"header" \| "inline"` | `"header"` | Variante visual del botón |
| `className` | `string` | `""` | Clases CSS adicionales |

---

### 2.2. Especificación de Visualización — Panel Lateral (*Slide-Over*)

#### 2.2.1. Justificación Técnica: Slide-Over vs Modal vs Drawer

| Criterio | Modal (`AppInfoModal`) | Slide-Over (Panel lateral) | Drawer (inferior) |
|---|---|---|---|
| **Visibilidad de la pantalla de fondo** | ❌ Oculta completamente | ✅ Visible al 100% | ⚠️ Parcial |
| **Interacción simultánea** | ❌ Bloquea interacción | ✅ El usuario puede leer y operar | ❌ Bloquea |
| **Espacio para contenido largo** | ⚠️ Scroll interno limitado | ✅ Altura completa del viewport | ⚠️ Limitado |
| **Compatibilidad con capturas** | ⚠️ Ancho reducido | ✅ 380-420px óptimos | ❌ Muy estrecho |
| **Responsive mobile** | ✅ Funciona | ⚠️ Requiere adaptación a full-width | ✅ Natural en mobile |
| **Precedente en la app** | ✅ `AppInfoModal` existe | ❌ Nuevo componente | ❌ No existe |

**Decisión: Slide-Over (Panel lateral derecho)** como formato principal.

**Justificación:** La Ayuda Contextual difiere de los modales explicativos existentes (`AppInfoModal`) en su propósito de uso: los modales actuales muestran información puntual de normativa (ej. "Criterio de Evaluación Técnica") que no requiere interacción paralela con el formulario. La ayuda contextual, en cambio, es un **instructivo paso a paso** que el usuario necesita seguir mientras opera la pantalla, lo cual requiere visibilidad simultánea.

> **Nota de compatibilidad:** Los modales explicativos existentes (`AppInfoModal`) se mantendrán para su propósito actual (consulta normativa puntual). El `<ContextualHelpPanel />` es un componente nuevo, complementario y no reemplaza al `AppInfoModal`.

#### 2.2.2. Especificaciones del Panel Lateral `<ContextualHelpPanel />`

```
                    ┌──────── Pantalla de la App ────────┐┌── Panel de Ayuda ──┐
                    │                                    ││                    │
                    │  [Header]                          ││  [?] Título        │
                    │                                    ││  ─────────────────  │
                    │  ┌─ Formulario / Vista ──────────┐ ││  🎯 Propósito      │
                    │  │                               │ ││  Texto descriptivo │
                    │  │  (Visible y operable          │ ││                    │
                    │  │   mientras el panel está      │ ││  📋 Instrucciones  │
                    │  │   abierto)                    │ ││  1. Paso uno       │
                    │  │                               │ ││  2. Paso dos       │
                    │  │                               │ ││  3. Paso tres      │
                    │  │                               │ ││                    │
                    │  │                               │ ││  🖼️ Captura        │
                    │  │                               │ ││  [Imagen anotada]  │
                    │  │                               │ ││                    │
                    │  │                               │ ││  ❓ FAQs           │
                    │  └───────────────────────────────┘ ││  • Pregunta 1      │
                    │                                    ││  • Pregunta 2      │
                    │  [Sidebar]                         ││                    │
                    └────────────────────────────────────┘└────────────────────┘
```

**Especificaciones técnicas:**

| Propiedad | Valor |
|---|---|
| **Ancho desktop** | `w-[420px]` (420px) |
| **Ancho tablet** | `w-[380px]` |
| **Ancho mobile** | `w-full` (pantalla completa con botón cerrar visible) |
| **Posición** | `fixed right-0 top-0 h-full z-40` |
| **Animación de entrada** | `translate-x-full → translate-x-0` con `transition-transform duration-300 ease-out` |
| **Backdrop** | En mobile: `bg-slate-900/40 backdrop-blur-sm`. En desktop: sin backdrop (interacción libre con el fondo) |
| **Bordes** | `border-l border-slate-200 shadow-2xl` |
| **Fondo** | `bg-white` |
| **Scroll** | `overflow-y-auto` con scrollbar personalizada (`scrollbar-thin`) |
| **Z-index** | `z-40` (debajo de modales `z-50`, encima de sidebar `z-30`) |

**Anatomía del panel:**

```
┌─────────────────────────── 420px ──────────────────────────┐
│ ┌───────────────── Header (h-14) ──────────────────────┐  │
│ │  [?] Ayuda: Nombre de la Sección              [✕]    │  │
│ └──────────────────────────────────────────────────────┘  │
│ ┌───────────────── Body (scroll) ──────────────────────┐  │
│ │                                                      │  │
│ │  🎯 ¿Para qué sirve esta pantalla?                  │  │
│ │  Texto descriptivo del propósito...                  │  │
│ │                                                      │  │
│ │  ────────── Separador ──────────                     │  │
│ │                                                      │  │
│ │  📋 ¿Cómo se usa?                                   │  │
│ │  1. Primer paso con descripción...                   │  │
│ │  2. Segundo paso con descripción...                  │  │
│ │     💡 Tip: Consejo relevante                        │  │
│ │  3. Tercer paso con descripción...                   │  │
│ │                                                      │  │
│ │  ────────── Separador ──────────                     │  │
│ │                                                      │  │
│ │  🖼️ Referencia Visual                               │  │
│ │  ┌──────────────────────────────┐                    │  │
│ │  │   [Captura anotada 380px]   │                    │  │
│ │  └──────────────────────────────┘                    │  │
│ │  📝 Descripción de la captura                        │  │
│ │                                                      │  │
│ │  ────────── Separador ──────────                     │  │
│ │                                                      │  │
│ │  ❓ Preguntas Frecuentes                             │  │
│ │  ▸ ¿Qué pasa si no cargo X?                         │  │
│ │  ▸ ¿Puedo editar después de guardar?                 │  │
│ │                                                      │  │
│ └──────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────┘
```

**Estilos del header del panel:**

- Fondo: `bg-slate-900` (consistente con `AppInfoModal`).
- Título: `font-outfit text-sm font-bold text-white`.
- Ícono: `HelpCircle` envuelto en contenedor `bg-[#468DFF]/20 text-[#468DFF] rounded-lg border border-[#468DFF]/30`.
- Botón cerrar: `X` de Lucide, `text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg p-1`.

**Estilos del body del panel:**

- Tipografía base: `text-xs text-slate-600 leading-relaxed` (consistente con `AppInfoModal` body).
- Títulos de sección: `text-sm font-bold text-slate-900 font-outfit`.
- Pasos numerados: Contadores visuales con fondo `bg-[#468DFF] text-white rounded-full w-5 h-5 text-[10px] font-bold`.
- Tips/consejos: `bg-blue-50 border border-blue-100 rounded-xl p-3` con ícono `Lightbulb`.
- Advertencias: `bg-amber-50 border border-amber-100 rounded-xl p-3` con ícono `AlertTriangle`.

---

### 2.3. Enfoque Técnico para Gestionar el Contenido

#### 2.3.1. Evaluación de Opciones

| Opción | Pros | Contras | Adecuación |
|---|---|---|---|
| **Archivos MDX locales** | Soporte nativo de Markdown + JSX, versionados en Git, fácil para Technical Writers, permite componentes React embebidos | Requiere configurar MDX en Next.js 14, mayor bundle si se incluyen muchos artículos | ✅ **Recomendado** |
| **Archivos JSON locales** | Simple, tipado con TypeScript, sin dependencias extras | Limitado para contenido rico (sin formato Markdown nativo), difícil mantener textos largos | ⚠️ Parcial |
| **Base de datos (Supabase)** | Edición en caliente sin deploy, potencial CMS futuro | Latencia de red, complejidad de RLS para contenido público, no versionado en Git | ❌ Excesivo para esta fase |

#### 2.3.2. Arquitectura Recomendada: Archivos MDX Locales

```
src/
├── content/
│   └── help/
│       ├── dashboard.mdx
│       ├── empresas-listado.mdx
│       ├── empresas-form.mdx
│       ├── equipo.mdx
│       ├── programa.mdx
│       ├── capacitacion.mdx
│       ├── capacitaciones-online.mdx
│       ├── correctivas.mdx
│       ├── accidentes.mdx
│       ├── matriz-riesgos.mdx
│       ├── extintores.mdx
│       ├── control-electrico.mdx
│       ├── visitas.mdx
│       ├── avisos.mdx
│       ├── checklist-personalizados.mdx
│       ├── protocolos/
│       │   ├── iluminacion-listado.mdx
│       │   ├── iluminacion-form.mdx
│       │   ├── ruido-listado.mdx
│       │   ├── ruido-form.mdx
│       │   ├── ergonomia-listado.mdx
│       │   ├── ergonomia-form.mdx
│       │   ├── puesta-a-tierra-listado.mdx
│       │   └── puesta-a-tierra-form.mdx
│       ├── legajo.mdx
│       ├── nomina.mdx
│       ├── profile.mdx
│       └── _assets/
│           ├── dashboard-kpis.webp
│           ├── empresas-form-datos.webp
│           ├── extintores-tabla.webp
│           └── ...
```

**Resolución dinámica del contenido:**

Se creará un módulo utilitario `src/lib/helpContent.js` que, dado un `helpKey`, importará dinámicamente el archivo MDX correspondiente usando `next/dynamic` o `import()`:

```javascript
// Lógica conceptual (no implementar aún)
const HELP_MAP = {
  'dashboard': () => import('@/content/help/dashboard.mdx'),
  'empresas-listado': () => import('@/content/help/empresas-listado.mdx'),
  'empresas-form': () => import('@/content/help/empresas-form.mdx'),
  // ... etc
};

export function getHelpContent(helpKey) {
  return HELP_MAP[helpKey] || null;
}
```

**Ventajas de este enfoque:**

1. **Separación total** del contenido de ayuda respecto del código de los componentes React.
2. **Versionado en Git:** Cada cambio en los instructivos queda trazable.
3. **Autoría accesible:** Un Technical Writer puede editar archivos `.mdx` sin necesidad de entender React.
4. **Code splitting automático:** Next.js solo carga el MDX del artículo que el usuario solicita.
5. **Soporte de componentes React:** Permite embeber `<img>` optimizadas, acordeones para FAQs, y potencialmente GIFs animados con componentes dedicados.

#### 2.3.3. Dependencias Técnicas Requeridas

| Paquete | Propósito | Impacto en Bundle |
|---|---|---|
| `@next/mdx` | Soporte nativo de MDX en Next.js 14 | Mínimo (compilación) |
| `@mdx-js/react` | Provider de componentes MDX | ~5KB gzipped |
| `remark-gfm` (opcional) | Soporte de tablas, checkboxes y strikethrough en Markdown | ~3KB |

---

## 3. Plantilla Estándar y Guía de Estilo Visual

### 3.1. Template del Contenido — Estructura MDX Base

Cada artículo de ayuda renderizado en el panel lateral deberá seguir estrictamente la siguiente estructura:

```mdx
---
# Frontmatter obligatorio
helpKey: "empresas-form"
title: "Alta y Edición de Clientes (Razones Sociales)"
module: "Clientes"
route: "/[tenant-slug]/empresas"
lastUpdated: "2026-08-22"
author: "Equipo de Producto"
version: "1.0"
tags: ["clientes", "empresas", "alta", "cuit", "establecimientos"]
---

## 🎯 ¿Para qué sirve esta pantalla?

{/* Explicación conceptual breve — máximo 3 oraciones */}
En esta sección podés dar de alta, editar y gestionar las **Razones Sociales (clientes)**
a los que les prestás servicios profesionales de Seguridad e Higiene. Cada cliente
agrupa sus establecimientos, contactos y documentación técnica.

---

## 📋 ¿Cómo se usa?

{/* Secuencia de pasos numerada — cada paso es una acción concreta del usuario */}

<Step number={1} title="Accedé a la sección Clientes">
  Desde el **menú lateral (sidebar)**, hacé clic en **"Clientes"** (ícono de personas).
  Se abrirá el listado general de tus razones sociales.
</Step>

<Step number={2} title="Iniciá el alta de un nuevo cliente">
  Hacé clic en el botón azul **"+ Agregar Cliente"** ubicado en la esquina superior
  derecha de la tabla. Se abrirá el formulario de carga.
</Step>

<Step number={3} title="Completá los datos obligatorios">
  Cargá como mínimo:
  - **Razón Social:** Nombre legal completo de la empresa.
  - **CUIT:** Número de CUIT sin guiones ni puntos. El sistema valida el formato.
  - **Provincia y Localidad:** Seleccioná de las listas desplegables.

  <Tip>Si el CUIT ya existe en tu cuenta, el sistema te avisará automáticamente
  para evitar duplicados.</Tip>
</Step>

<Step number={4} title="Agregá establecimientos (opcional)">
  Dentro del mismo formulario, podés agregar uno o más establecimientos para este
  cliente. Cada establecimiento tiene su propia dirección, sectores y puestos de trabajo.
</Step>

<Step number={5} title="Guardá los cambios">
  Hacé clic en **"Guardar"** para confirmar el alta. El nuevo cliente aparecerá
  inmediatamente en tu listado.
</Step>

---

## 🖼️ Referencia Visual

{/* Capturas de pantalla anotadas del componente específico */}
<HelpImage 
  src="/help-assets/empresas-form-datos.webp" 
  alt="Formulario de alta de cliente con campos obligatorios señalados"
  caption="Los campos marcados con * son obligatorios"
/>

---

## ❓ Preguntas Frecuentes

<FAQ question="¿Puedo editar un cliente después de crearlo?">
  Sí. Desde el listado, hacé clic en el ícono de **lápiz (editar)** junto al cliente
  que querés modificar. Se abrirá el mismo formulario con los datos precargados.
</FAQ>

<FAQ question="¿Qué pasa si borro un cliente por error?">
  Actualmente, la eliminación de un cliente es permanente. Te recomendamos verificar
  antes de confirmar. Si necesitás recuperar datos, contactá a soporte.
</FAQ>

<FAQ question="¿Hay un límite de clientes que puedo cargar?">
  Sí, el límite depende de tu plan de suscripción. Podés ver tu cuota disponible
  en el **Dashboard** en la tarjeta de "Clientes Activos".
</FAQ>
```

### 3.2. Componentes MDX Personalizados

Los siguientes componentes React serán provistos como `MDXComponents` para que los autores de contenido los usen sin escribir JSX crudo:

| Componente | Propósito | Render visual |
|---|---|---|
| `<Step number={N} title="...">` | Paso numerado con contador visual azul | Círculo azul con número + título en negrita + cuerpo |
| `<Tip>` | Consejo o truco útil | Caja `bg-blue-50` con ícono `Lightbulb` |
| `<Warning>` | Advertencia o precaución | Caja `bg-amber-50` con ícono `AlertTriangle` |
| `<HelpImage src alt caption />` | Imagen anotada responsive | `<img>` con border, rounded, y caption debajo |
| `<HelpGif src alt caption />` | GIF animado embebido | Similar a `HelpImage` con indicador de "Animación" |
| `<FAQ question="...">` | Acordeón de pregunta frecuente | Expand/collapse con ícono `ChevronDown` |
| `<KeyboardShortcut keys={["Ctrl","S"]} />` | Atajo de teclado visual | Badges con estilo `<kbd>` |

---

### 3.3. Directrices Gráficas — Reglas para Capturas y Recursos Visuales

#### 3.3.1. Especificaciones de Capturas de Pantalla

| Regla | Especificación |
|---|---|
| **Formato de archivo** | WebP (preferido, menor peso) o PNG (si se necesita transparencia) |
| **Ancho máximo del archivo fuente** | 760px (para que encaje al 100% del ancho del panel de 420px con padding) |
| **Resolución** | 2x para pantallas retina (ej. exportar a 1520px de ancho, renderizar a 760px) |
| **Recorte** | **Siempre recortar al componente específico**, nunca captura de pantalla completa. Si se muestra un formulario, recortar solo el formulario. Si se muestra una tabla, recortar solo la tabla |
| **Datos en las capturas** | **Siempre usar datos ficticios**. Nombres: "Empresa Demo S.A.", "Juan Ejemplo". CUIT: "20-12345678-9". Nunca datos reales de clientes |
| **Borde de la captura** | `border border-slate-200 rounded-xl shadow-sm` aplicado vía CSS en el componente `<HelpImage />` |
| **Compresión** | ≤ 80KB por imagen. Optimizar con herramientas como Squoosh o Sharp |

#### 3.3.2. Estilo de Anotaciones Visuales

Las capturas deberán incluir anotaciones visuales para guiar la mirada del usuario:

| Elemento | Especificación |
|---|---|
| **Flechas indicadoras** | Color `#468DFF` (azul marca), grosor 2-3px, con punta de flecha rellena |
| **Recuadros de resaltado** | Borde `#468DFF` sólido de 2px con esquinas redondeadas (8px). Relleno `#468DFF` al 10% de opacidad |
| **Números de paso** | Círculos `#468DFF` rellenos de 24px de diámetro, con número blanco en `font-bold` |
| **Texto de anotación** | Tipografía Outfit Bold, 12px, color `#0F172A` (Slate-900) con fondo blanco semitransparente para legibilidad |
| **Herramienta recomendada** | CleanShot X (macOS) / ShareX (Windows) para captura + anotación |

#### 3.3.3. GIFs Animados y Videos Cortos

| Regla | Especificación |
|---|---|
| **Uso recomendado** | Flujos interactivos de más de 3 pasos que se benefician de ver el movimiento: firma digital (`AppSignatureCanvas`), drag & drop de archivos (`DocumentUploadZone`, `ImageUploadZone`), filtros y ordenamiento de tablas, navegación de formularios multi-sección (`AppFormNavigator`) |
| **Formato** | GIF animado (< 500KB) o WebM embebido con `autoplay muted loop` |
| **Duración máxima** | 8 segundos por GIF/video |
| **FPS** | 12-15 fps (suficiente para mostrar interacción, peso controlado) |
| **Ancho** | Igual que capturas: 760px fuente / 380px render |
| **Indicador visual** | El componente `<HelpGif />` mostrará un badge `▶ Animación` en la esquina superior derecha |

#### 3.3.4. Reglas de Privacidad y Datos Ficticios

| Dato | Valor Ficticio Estándar |
|---|---|
| Razón Social | "Empresa Demo S.A.", "Industrias Ejemplo S.R.L.", "Constructora Modelo S.A." |
| CUIT | "20-12345678-9", "30-98765432-1" |
| Nombre de contacto | "Juan Ejemplo", "María Demo", "Carlos Test" |
| Email | "demo@ejemplo.com", "prueba@gestionsyso.com" |
| Teléfono | "+54 11 1234-5678" |
| Dirección | "Av. Siempre Viva 742, Buenos Aires" |
| Matrícula profesional | "T-00001" |
| Nombre de establecimiento | "Planta Central", "Sucursal Norte", "Depósito Sur" |

> **Regla estricta:** Ninguna captura de pantalla o GIF animado en producción puede mostrar datos reales y privados de empresas, profesionales o trabajadores. Todo contenido gráfico debe ser generado usando los datos ficticios estándar o el entorno de demostración del producto.

---

## 4. Índice Maestro de Nodos de Ayuda (Mapa de Cobertura)

### 4.1. Leyenda

| Símbolo | Significado |
|---|---|
| 🟢 | Nodo de ayuda de nivel de página (un `helpKey` y un panel completo) |
| 🔵 | Sub-nodo con anclaje interno (sección dentro del panel de ayuda de la página padre) |
| 🔒 | Solo visible para usuarios admin/owner |
| 📝 | Contiene formulario de carga/edición |
| 📊 | Contiene dashboard, gráficos o KPIs |
| 📋 | Contiene tabla/listado |
| 📄 | Genera reportes PDF |

---

### 4.2. Rutas Públicas (Pre-Login)

| # | Ruta | `helpKey` | Nombre de la Guía | Tipo | Notas |
|---|---|---|---|---|---|
| 1 | `/login` | `login` | 🟢 Iniciar Sesión | 📝 | Incluir guía de "Olvidé mi contraseña" |
| 2 | `/register` | `register` | 🟢 Crear Cuenta | 📝 | Incluir requisitos de contraseña y confirmación de email |
| 3 | `/reset-password` | `reset-password` | 🟢 Restablecer Contraseña | 📝 | Flujo completo de recuperación |
| 4 | `/onboarding` | `onboarding` | 🟢 Configuración Inicial | 📝 | Configuración del tenant, nombre de empresa, slug, matrícula |

> **Nota:** Las páginas públicas `/terminos`, `/privacidad` y `/cookies` son contenido legal estático y no requieren ayuda contextual.

---

### 4.3. Rutas del Tenant — Core Operativo

#### 4.3.1. Dashboard y Configuración

| # | Ruta | `helpKey` | Nombre de la Guía | Tipo | Sub-nodos internos |
|---|---|---|---|---|---|
| 5 | `/[t]/dashboard` | `dashboard` | 🟢 Dashboard Principal | 📊📋 | 🔵 `dashboard#kpi-cards` — Tarjetas KPI<br>🔵 `dashboard#actividad-reciente` — Actividad Reciente<br>🔵 `dashboard#cuotas-plan` — Cuotas del Plan<br>🔵 `dashboard#accesos-rapidos` — Accesos Rápidos |
| 6 | `/[t]/profile` | `profile` | 🟢 Editar Perfil | 📝 | 🔵 `profile#datos-personales` — Datos Personales<br>🔵 `profile#firma-digital` — Firma Digital<br>🔵 `profile#cambiar-password` — Cambiar Contraseña<br>🔵 `profile#eliminar-cuenta` — Eliminar Cuenta |

#### 4.3.2. Gestión de Clientes y Equipo

| # | Ruta | `helpKey` | Nombre de la Guía | Tipo | Sub-nodos internos |
|---|---|---|---|---|---|
| 7 | `/[t]/empresas` (listado) | `empresas-listado` | 🟢🔒 Listado de Clientes | 📋 | 🔵 `empresas-listado#tabla` — Tabla de clientes<br>🔵 `empresas-listado#filtros` — Búsqueda y filtros<br>🔵 `empresas-listado#acciones` — Acciones (editar, eliminar, ver) |
| 8 | `/[t]/empresas` (formulario alta/edición) | `empresas-form` | 🟢🔒📝 Alta y Edición de Clientes | 📝 | 🔵 `empresas-form#datos-empresa` — Datos de la Razón Social<br>🔵 `empresas-form#establecimientos` — Establecimientos<br>🔵 `empresas-form#sectores-puestos` — Sectores y Puestos de Trabajo<br>🔵 `empresas-form#contactos` — Contactos<br>🔵 `empresas-form#documentacion` — Documentación Adjunta<br>🔵 `empresas-form#logo` — Logo del Cliente |
| 9 | `/[t]/equipo` | `equipo` | 🟢🔒 Equipo de Trabajo | 📋📝 | 🔵 `equipo#listado` — Listado de Técnicos/Subusuarios<br>🔵 `equipo#invitar` — Invitar Nuevo Miembro<br>🔵 `equipo#permisos` — Permisos por Módulo<br>🔵 `equipo#roles` — Roles y Accesos |

#### 4.3.3. Planificación y Capacitación

| # | Ruta | `helpKey` | Nombre de la Guía | Tipo | Sub-nodos internos |
|---|---|---|---|---|---|
| 10 | `/[t]/programa` | `programa` | 🟢 Programa de Gestión Anual | 📋📝📄 | 🔵 `programa#listado` — Listado de Actividades<br>🔵 `programa#alta` — Agregar Actividad<br>🔵 `programa#estados` — Estados (Pendiente, En Curso, Finalizado)<br>🔵 `programa#pdf` — Generar Reporte PDF |
| 11 | `/[t]/capacitacion` | `capacitacion` | 🟢 Programa de Capacitación Anual | 📋📝📄 | 🔵 `capacitacion#listado` — Listado de Capacitaciones<br>🔵 `capacitacion#alta` — Programar Nueva Capacitación<br>🔵 `capacitacion#asistencia` — Registro de Asistencia<br>🔵 `capacitacion#evaluacion` — Evaluación<br>🔵 `capacitacion#pdf` — Constancia PDF |
| 12 | `/[t]/capacitaciones-online` | `capacitaciones-online` | 🟢 Capacitaciones Online | 📋📝 | 🔵 `capacitaciones-online#catalogo` — Catálogo de Cursos<br>🔵 `capacitaciones-online#asignacion` — Asignar a Trabajadores<br>🔵 `capacitaciones-online#seguimiento` — Seguimiento de Progreso<br>🔵 `capacitaciones-online#resultados` — Resultados y Certificados |

#### 4.3.4. Gestión Operativa de Higiene y Seguridad

| # | Ruta | `helpKey` | Nombre de la Guía | Tipo | Sub-nodos internos |
|---|---|---|---|---|---|
| 13 | `/[t]/correctivas` | `correctivas` | 🟢 Acciones Correctivas | 📋📝📄 | 🔵 `correctivas#listado` — Listado de Acciones Correctivas<br>🔵 `correctivas#alta` — Nueva Acción Correctiva<br>🔵 `correctivas#cliente-establecimiento` — Selección de Cliente y Establecimiento<br>🔵 `correctivas#sector-puesto` — Sector / Puesto (listas dinámicas)<br>🔵 `correctivas#evidencia` — Carga de Evidencia Fotográfica<br>🔵 `correctivas#seguimiento` — Seguimiento y Cierre<br>🔵 `correctivas#pdf` — Generación de Reporte PDF |
| 14 | `/[t]/accidentes` | `accidentes` | 🟢 Registro de Accidentes | 📋📝📄 | 🔵 `accidentes#listado` — Listado de Accidentes<br>🔵 `accidentes#alta` — Registrar Nuevo Accidente<br>🔵 `accidentes#datos-accidente` — Datos del Accidente<br>🔵 `accidentes#datos-trabajador` — Datos del Trabajador Afectado<br>🔵 `accidentes#investigacion` — Investigación y Causa Raíz<br>🔵 `accidentes#arbol-causas` — Árbol de Causas<br>🔵 `accidentes#medidas` — Medidas Correctivas<br>🔵 `accidentes#firma` — Firmas Digitales<br>🔵 `accidentes#pdf` — Generación de Reporte PDF |
| 15 | `/[t]/matriz-riesgos` | `matriz-riesgos` | 🟢 Matriz de Riesgos | 📋📝📄 | 🔵 `matriz-riesgos#listado` — Listado de Evaluaciones<br>🔵 `matriz-riesgos#alta` — Nueva Evaluación<br>🔵 `matriz-riesgos#peligros` — Identificación de Peligros<br>🔵 `matriz-riesgos#valoracion` — Valoración del Riesgo<br>🔵 `matriz-riesgos#contramedidas` — Medidas de Control<br>🔵 `matriz-riesgos#sectores` — Sectores y Puestos<br>🔵 `matriz-riesgos#pdf` — Exportación PDF |
| 16 | `/[t]/extintores` | `extintores` | 🟢 Gestión de Extintores | 📋📝📄 | 🔵 `extintores#listado` — Inventario de Extintores<br>🔵 `extintores#alta` — Registrar Nuevo Extintor<br>🔵 `extintores#datos-tecnicos` — Datos Técnicos (tipo, capacidad, agente)<br>🔵 `extintores#vencimientos` — Control de Vencimientos<br>🔵 `extintores#inspeccion` — Inspección Periódica<br>🔵 `extintores#pdf` — Reporte PDF |
| 17 | `/[t]/control-electrico` | `control-electrico` | 🟢 Control Eléctrico | 📋📝📄 | 🔵 `control-electrico#listado` — Listado de Controles<br>🔵 `control-electrico#alta` — Nuevo Control Eléctrico<br>🔵 `control-electrico#tablero` — Datos del Tablero<br>🔵 `control-electrico#mediciones` — Mediciones<br>🔵 `control-electrico#observaciones` — Observaciones y Recomendaciones<br>🔵 `control-electrico#pdf` — Reporte PDF |
| 18 | `/[t]/visitas` | `visitas` | 🟢 Constancia de Visita | 📋📝📄 | 🔵 `visitas#listado` — Listado de Visitas<br>🔵 `visitas#alta` — Registrar Nueva Visita<br>🔵 `visitas#datos-visita` — Datos de la Visita<br>🔵 `visitas#observaciones` — Observaciones Técnicas<br>🔵 `visitas#recomendaciones` — Recomendaciones<br>🔵 `visitas#firma` — Firma Digital<br>🔵 `visitas#pdf` — Constancia PDF<br>🔵 `visitas#envio` — Envío por Email/WhatsApp |
| 19 | `/[t]/avisos` | `avisos` | 🟢 Aviso de Riesgo | 📋📝📄 | 🔵 `avisos#listado` — Listado de Avisos<br>🔵 `avisos#alta` — Nuevo Aviso de Riesgo<br>🔵 `avisos#datos` — Datos del Aviso<br>🔵 `avisos#evidencia` — Evidencia Fotográfica<br>🔵 `avisos#firma` — Firma Digital<br>🔵 `avisos#pdf` — Reporte PDF<br>🔵 `avisos#envio` — Envío por Email/WhatsApp |
| 20 | `/[t]/checklist-personalizados` | `checklist-personalizados` | 🟢 Checklist Personalizados | 📋📝📄 | 🔵 `checklist#listado` — Listado de Checklists<br>🔵 `checklist#crear-plantilla` — Crear Plantilla de Checklist<br>🔵 `checklist#items` — Agregar/Editar Ítems<br>🔵 `checklist#ejecutar` — Completar Checklist<br>🔵 `checklist#pdf` — Exportar PDF |

#### 4.3.5. Protocolos de Medición (Subrutas)

| # | Ruta | `helpKey` | Nombre de la Guía | Tipo | Sub-nodos internos |
|---|---|---|---|---|---|
| 21 | `/[t]/protocolos/iluminacion` | `protocolo-iluminacion-listado` | 🟢🔒 Protocolo de Iluminación — Listado | 📋 | 🔵 `protocolo-iluminacion-listado#tabla` — Tabla de protocolos<br>🔵 `protocolo-iluminacion-listado#nuevo` — Crear nuevo protocolo |
| 22 | `/[t]/protocolos/iluminacion/nuevo` | `protocolo-iluminacion-form` | 🟢🔒📝 Protocolo de Iluminación — Formulario | 📝📄 | 🔵 `protocolo-iluminacion-form#datos-generales` — Datos Generales<br>🔵 `protocolo-iluminacion-form#puntos-medicion` — Puntos de Medición<br>🔵 `protocolo-iluminacion-form#resultados` — Resultados y Evaluación<br>🔵 `protocolo-iluminacion-form#recomendaciones` — Recomendaciones<br>🔵 `protocolo-iluminacion-form#tabla-normativa` — Tabla Normativa de Referencia |
| 23 | `/[t]/protocolos/iluminacion/[id]/editar` | *(reutiliza `protocolo-iluminacion-form`)* | — | — | Mismo panel que el formulario nuevo |
| 24 | `/[t]/protocolos/iluminacion/[id]/pdf` | *(no requiere ayuda propia)* | — | — | Vista de previsualización PDF, no requiere panel de ayuda |
| 25 | `/[t]/protocolos/ruido` | `protocolo-ruido-listado` | 🟢🔒 Protocolo de Ruido — Listado | 📋 | Análogo a iluminación |
| 26 | `/[t]/protocolos/ruido/nuevo` | `protocolo-ruido-form` | 🟢🔒📝 Protocolo de Ruido — Formulario | 📝📄 | 🔵 `protocolo-ruido-form#datos-generales`<br>🔵 `protocolo-ruido-form#puntos-medicion`<br>🔵 `protocolo-ruido-form#resultados`<br>🔵 `protocolo-ruido-form#recomendaciones`<br>🔵 `protocolo-ruido-form#tabla-normativa` |
| 27 | `/[t]/protocolos/ruido/[id]/editar` | *(reutiliza `protocolo-ruido-form`)* | — | — | — |
| 28 | `/[t]/protocolos/ergonomia` | `protocolo-ergonomia-listado` | 🟢🔒 Protocolo de Ergonomía — Listado | 📋 | Análogo a iluminación |
| 29 | `/[t]/protocolos/ergonomia/nuevo` | `protocolo-ergonomia-form` | 🟢🔒📝 Protocolo de Ergonomía — Formulario | 📝📄 | 🔵 `protocolo-ergonomia-form#datos-generales`<br>🔵 `protocolo-ergonomia-form#evaluacion-puesto`<br>🔵 `protocolo-ergonomia-form#factores-riesgo`<br>🔵 `protocolo-ergonomia-form#recomendaciones` |
| 30 | `/[t]/protocolos/ergonomia/[id]/editar` | *(reutiliza `protocolo-ergonomia-form`)* | — | — | — |
| 31 | `/[t]/protocolos/puesta-a-tierra` | `protocolo-pat-listado` | 🟢🔒 Protocolo de Puesta a Tierra — Listado | 📋 | Análogo a iluminación |
| 32 | `/[t]/protocolos/puesta-a-tierra/nuevo` | `protocolo-pat-form` | 🟢🔒📝 Protocolo de Puesta a Tierra — Formulario | 📝📄 | 🔵 `protocolo-pat-form#datos-generales`<br>🔵 `protocolo-pat-form#puntos-medicion`<br>🔵 `protocolo-pat-form#resultados`<br>🔵 `protocolo-pat-form#recomendaciones` |
| 33 | `/[t]/protocolos/puesta-a-tierra/[id]/editar` | *(reutiliza `protocolo-pat-form`)* | — | — | — |

#### 4.3.6. Documentación y Nómina

| # | Ruta | `helpKey` | Nombre de la Guía | Tipo | Sub-nodos internos |
|---|---|---|---|---|---|
| 34 | `/[t]/legajo` | `legajo` | 🟢 Legajo Técnico | 📋📝📄 | 🔵 `legajo#listado` — Listado de Documentos<br>🔵 `legajo#carga` — Cargar Documento<br>🔵 `legajo#categorias` — Categorías de Documentos<br>🔵 `legajo#descarga` — Descarga de Documentos |
| 35 | `/[t]/nomina` | `nomina` | 🟢 Nómina de Personal | 📋📝📄 | 🔵 `nomina#listado` — Listado de Trabajadores<br>🔵 `nomina#alta` — Registrar Nuevo Trabajador<br>🔵 `nomina#datos-personales` — Datos Personales<br>🔵 `nomina#documentacion` — Documentación del Trabajador<br>🔵 `nomina#excel` — Importar/Exportar Excel |

#### 4.3.7. Páginas Públicas de Capacitación (Acceso sin Login)

| # | Ruta | `helpKey` | Nombre de la Guía | Tipo | Notas |
|---|---|---|---|---|---|
| 36 | `/capacitar/[token]` | `capacitar-online` | 🟢 Realizar Capacitación Online | 📝 | Vista pública del trabajador que completa un curso asignado |

#### 4.3.8. Panel de Administración (SuperAdmin)

| # | Ruta | `helpKey` | Nombre de la Guía | Tipo | Notas |
|---|---|---|---|---|---|
| 37 | `/admin` | `admin-panel` | 🟢🔒 Consola SuperAdmin | 📊📋 | Panel de administración global del sistema |

---

### 4.4. Resumen Estadístico del Inventario

| Categoría | Cantidad |
|---|---|
| **Nodos de ayuda de página (🟢)** | **37** |
| **Sub-nodos con anclaje (🔵)** | **~120** |
| **Archivos MDX a crear** | **~30** (algunos nodos comparten MDX, ej. listado+formulario) |
| **Capturas de pantalla estimadas** | **~60-80** |
| **GIFs animados estimados** | **~10-15** |
| **Páginas sin ayuda** (legales, PDF view, 404) | 5 |

---

## 5. Plan de Ejecución y Hoja de Ruta

### 5.1. Fase 1 — Arquitectura Base (Semana 1-2)

**Objetivo:** Desarrollar los componentes universales y la infraestructura de contenido.

| Tarea | Descripción | Archivos Involucrados | Prioridad |
|---|---|---|---|
| 1.1 | Configurar soporte MDX en Next.js 14 | `next.config.js`, `package.json` | Alta |
| 1.2 | Crear componente `<ContextualHelpTrigger />` | `src/components/ui/ContextualHelpTrigger.js` | Alta |
| 1.3 | Crear componente `<ContextualHelpPanel />` (Slide-Over) | `src/components/ui/ContextualHelpPanel.js` | Alta |
| 1.4 | Crear componentes MDX personalizados (`Step`, `Tip`, `Warning`, `FAQ`, `HelpImage`, `HelpGif`) | `src/components/help/MDXComponents.js` | Alta |
| 1.5 | Crear Context/Provider de ayuda contextual para estado global (abierto/cerrado, `helpKey` activo) | `src/components/providers/ContextualHelpProvider.js` | Alta |
| 1.6 | Crear módulo de resolución de contenido (`helpContent.js`) | `src/lib/helpContent.js` | Alta |
| 1.7 | Extender `AppPageHeader` para aceptar prop `helpKey` y renderizar el trigger automáticamente | `src/components/ui/AppPageHeader.js` | Alta |
| 1.8 | Crear estructura de carpetas `src/content/help/` y `src/content/help/_assets/` | Carpetas nuevas | Media |
| 1.9 | Crear MDX de prueba piloto (ej. `dashboard.mdx`) para validar pipeline completo | `src/content/help/dashboard.mdx` | Alta |
| 1.10 | Agregar animaciones de slide-in/slide-out al Tailwind config | `tailwind.config.js` | Baja |

**Criterio de aceptación de Fase 1:**
- El ícono `?` aparece en el `AppPageHeader` del Dashboard.
- Al hacer clic, se despliega el panel lateral con el contenido MDX de prueba.
- El panel se cierra con el botón `✕` y con clic fuera (en mobile).
- Responsive funcional en desktop, tablet y mobile.
- No se rompe ningún layout ni z-index existente.

---

### 5.2. Fase 2 — Contenido Crítico (Semana 3-5)

**Objetivo:** Redactar, capturar e integrar la ayuda para las secciones más utilizadas y con mayor carga de soporte.

| Tarea | `helpKey` | Sección | Estimación | Prioridad |
|---|---|---|---|---|
| 2.1 | `dashboard` | Dashboard Principal | 1 día | 🔴 Crítica |
| 2.2 | `onboarding` | Configuración Inicial (Onboarding) | 1 día | 🔴 Crítica |
| 2.3 | `login` + `register` + `reset-password` | Flujos de autenticación | 0.5 días | 🔴 Crítica |
| 2.4 | `empresas-listado` + `empresas-form` | Gestión de Clientes | 2 días | 🔴 Crítica |
| 2.5 | `equipo` | Equipo de Trabajo | 1 día | 🔴 Crítica |
| 2.6 | `profile` | Editar Perfil | 0.5 días | 🟡 Alta |

**Entregables de Fase 2:**
- 8 archivos MDX completos con contenido paso a paso.
- ~20 capturas de pantalla anotadas.
- ~3 GIFs animados (onboarding, firma digital del perfil, alta de cliente).

---

### 5.3. Fase 3 — Core Operativo de Higiene y Seguridad (Semana 6-10)

**Objetivo:** Inyectar la ayuda en todos los módulos técnicos del core del producto.

| Tarea | `helpKey` | Sección | Estimación | Prioridad |
|---|---|---|---|---|
| 3.1 | `visitas` | Constancia de Visita | 1.5 días | 🔴 Crítica |
| 3.2 | `correctivas` | Acciones Correctivas | 1.5 días | 🔴 Crítica |
| 3.3 | `accidentes` | Registro de Accidentes | 2 días | 🔴 Crítica |
| 3.4 | `extintores` | Gestión de Extintores | 1 día | 🟡 Alta |
| 3.5 | `control-electrico` | Control Eléctrico | 1 día | 🟡 Alta |
| 3.6 | `avisos` | Aviso de Riesgo | 1 día | 🟡 Alta |
| 3.7 | `programa` | Programa de Gestión Anual | 1 día | 🟡 Alta |
| 3.8 | `capacitacion` | Prog. Capacitación Anual | 1.5 días | 🟡 Alta |
| 3.9 | `capacitaciones-online` | Capacitaciones Online | 1 día | 🟡 Alta |
| 3.10 | `matriz-riesgos` | Matriz de Riesgos | 2 días | 🟡 Alta |
| 3.11 | `checklist-personalizados` | Checklist Personalizados | 1.5 días | 🟡 Alta |

**Entregables de Fase 3:**
- 11 archivos MDX completos.
- ~40 capturas de pantalla anotadas.
- ~8 GIFs animados (firma digital, drag & drop de archivos, filtros de tablas, formularios multi-sección).

---

### 5.4. Fase 4 — Protocolos, Documentación y Flujos Avanzados (Semana 11-14)

**Objetivo:** Completar la cobertura total del producto con las secciones especializadas y de menor frecuencia.

| Tarea | `helpKey` | Sección | Estimación | Prioridad |
|---|---|---|---|---|
| 4.1 | `protocolo-iluminacion-listado` + `protocolo-iluminacion-form` | Protocolo de Iluminación | 2 días | 🟡 Alta |
| 4.2 | `protocolo-ruido-listado` + `protocolo-ruido-form` | Protocolo de Ruido | 1.5 días | 🟡 Alta |
| 4.3 | `protocolo-ergonomia-listado` + `protocolo-ergonomia-form` | Protocolo de Ergonomía | 1.5 días | 🟡 Alta |
| 4.4 | `protocolo-pat-listado` + `protocolo-pat-form` | Protocolo de Puesta a Tierra | 1.5 días | 🟡 Alta |
| 4.5 | `legajo` | Legajo Técnico | 1 día | 🟢 Media |
| 4.6 | `nomina` | Nómina de Personal | 1 día | 🟢 Media |
| 4.7 | `capacitar-online` | Capacitación Online (vista pública) | 0.5 días | 🟢 Media |
| 4.8 | `admin-panel` | Consola SuperAdmin | 0.5 días | 🟢 Media |

**Entregables de Fase 4:**
- ~11 archivos MDX adicionales.
- ~20 capturas de pantalla anotadas.
- ~4 GIFs animados (formularios de protocolos, mediciones).

---

### 5.5. Fase 5 — Pulido, QA y Lanzamiento (Semana 15-16)

| Tarea | Descripción | Estimación |
|---|---|---|
| 5.1 | Revisión editorial completa de todos los MDX (ortografía, coherencia, tono) | 2 días |
| 5.2 | Validación de responsive del panel en todas las resoluciones | 1 día |
| 5.3 | Test de accesibilidad (navegación por teclado, screen readers) | 0.5 días |
| 5.4 | Test de performance (impacto en bundle size, lazy loading de MDX) | 0.5 días |
| 5.5 | Actualización de capturas si hubo cambios de UI durante las fases | 1 día |
| 5.6 | Deploy a staging y validación con usuarios beta | 1 día |
| 5.7 | Lanzamiento a producción y monitoreo de métricas | 0.5 días |

---

### 5.6. Cronograma Visual Resumido

```
Semana     1    2    3    4    5    6    7    8    9   10   11   12   13   14   15   16
          ├────┼────┼────┼────┼────┼────┼────┼────┼────┼────┼────┼────┼────┼────┼────┤
Fase 1    █████████                                                               
Fase 2              ████████████████                                              
Fase 3                             ███████████████████████████                     
Fase 4                                                       ████████████████     
Fase 5                                                                      ██████
```

**Estimación total:** ~16 semanas de trabajo (puede reducirse con paralelismo entre redacción de contenido y desarrollo de componentes).

---

## Apéndice A — Glosario Técnico

| Término | Definición |
|---|---|
| **helpKey** | Identificador único de cadena que vincula un disparador de ayuda (`?`) con su archivo de contenido MDX |
| **Sub-nodo / Anclaje** | Sección interna dentro de un artículo MDX, referenciada con `#id` para scroll automático |
| **Slide-Over** | Panel lateral que se desliza desde el borde derecho de la pantalla |
| **MDX** | Formato de archivo que combina Markdown con componentes JSX de React |
| **Trigger** | Botón o ícono que activa la apertura del panel de ayuda |

---

## Apéndice B — Design System Actual Auditado

| Elemento | Tecnología/Herramienta | Archivo de Referencia |
|---|---|---|
| Framework CSS | Tailwind CSS 3.4 | `tailwind.config.js` |
| Iconografía | Lucide React 0.379 | `lucide-react` |
| Componentes UI | Propios (`src/components/ui/`) + Radix UI (Dialog) | `components.json` |
| Tipografía | Outfit (Google Fonts) | `docs/brand/TYPOGRAPHY.md` |
| Color primario | `#468DFF` | `docs/brand/BRAND_GUIDELINES.md` |
| Color hover/resaltado | `#0511F2` | `docs/RULES_WORKSPACE.md` |
| Modales informativos | `AppInfoModal` (Radix Dialog) | `src/components/ui/AppInfoModal.js` |
| Header de página | `AppPageHeader` | `src/components/ui/AppPageHeader.js` |
| Toasts/Feedback | `ToastProvider` + `useToast()` | `src/components/providers/ToastProvider.js` |
| Animaciones existentes | `fade-in`, `scale-up`, `scale-down` | `tailwind.config.js` |

---

## Apéndice C — Componentes de la App que Requieren Atención Especial en la Ayuda

Estos componentes propios tienen interacciones complejas que justifican GIFs animados o instrucciones detalladas en la ayuda:

| Componente | Módulos donde se usa | Complejidad para el usuario |
|---|---|---|
| `AppSignatureCanvas` | Visitas, Avisos, Accidentes | Alta — Dibujar firma con el dedo/mouse |
| `DocumentUploadZone` | Legajo, Empresas, Capacitación | Alta — Drag & drop, pestañas Local/Drive |
| `ImageUploadZone` | Empresas (logos), Correctivas (evidencia) | Media — Carga de imágenes con preview |
| `AppFormNavigator` | Accidentes, Protocolos | Media — Navegación entre secciones de formulario largo |
| `AITextHelper` | Todos los campos de texto largo | Media — Dictado por voz + pulido IA |
| `PdfSlideViewer` | Protocolos (PDF preview) | Baja — Visualización de PDF embebido |
| `AppSortIcon` + filtros | Todas las tablas | Baja — Ordenamiento y filtrado de columnas |

---

> **Fin del documento — Plan de Implementación v1.0**  
> Próximo paso: Aprobación del plan → Fase 1 (Desarrollo de componentes base).
