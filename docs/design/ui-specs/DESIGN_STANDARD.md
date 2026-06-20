# Estándar de Diseño de Interfaz (UX/UI) - Gestión SySO

Este documento establece el estándar visual y de experiencia de usuario (UX/UI) del proyecto SaaS **Gestión SySO**, basado en el diseño del módulo **Constancia de Visita** (`/visitas`). 

Todas las secciones operativas del sistema deben cumplir estrictamente con estas reglas de estilo, clases y componentes para garantizar una experiencia consistente, fluida y premium.

---

## 1. Diseño de Contenedores y Layout General

- **Fondo de la Página**: `#f8fafc` (Slate 50 / Slate 100 suave).
  - Clase: `bg-[#f8fafc]`
- **Margen Interno del Cuerpo**: `p-6` para el scroll central, con un contenedor de ancho útil máximo al **95%** alineado horizontalmente.
  - Clase: `max-w-[95%] mx-auto space-y-6`
- **Fondo de las Tarjetas (Cards)**: Blanco puro (`#FFFFFF`) con bordes semitransparentes finos en color gris claro `#E2E8F0` / `#E8ECF2` (Slate 150) y esquinas muy redondeadas (`rounded-2xl`).
  - Clase: `bg-white rounded-2xl border border-slate-150 shadow-sm`
  - *Nota*: Evitar el uso de `border-slate-200` y `rounded-xl` que lucen más toscos. Usar `border-slate-150` y `rounded-2xl`.

---

## 2. Tipografías y Textos

- **Tipografía General**: `font-sans` (Inter).
- **Tipografía de Títulos y Headers**: `font-outfit` (Outfit).
- **Título de la Sección (Navbar)**:
  - Clase: `font-outfit text-lg font-bold text-slate-900 leading-none`
- **Título de Tarjeta / Formulario**:
  - Clase: `font-outfit text-base font-bold text-slate-900`
- **Títulos de Subsección en Formularios**:
  - Clase: `font-outfit text-sm font-bold text-slate-800 border-b border-slate-100 pb-1.5 uppercase tracking-wider flex items-center gap-2`
  - Debe incorporar un icono de Lucide con clase `h-4 w-4 text-[#468DFF]`.
- **Etiquetas de Formularios (Labels)**:
  - Clase: `text-xs font-bold text-slate-600`
- **Textos de Lectura / CUIT / Datos Derivados**:
  - Clase: `text-sm text-slate-500 font-medium`

---

## 3. Barra de Herramientas, Búsqueda y Filtros

El panel superior de búsqueda y filtrado debe estructurarse en una tarjeta única unificada (`bg-white rounded-2xl border border-slate-150 p-4 shadow-sm space-y-4`).

- **Buscador (Input de Texto)**:
  - Clase: `w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50`
  - Debe incluir un icono `Search` a la izquierda con clase `absolute left-3.5 top-3 h-4.5 w-4.5 text-slate-400`.
- **Botón Primario ("Nuevo...")**:
  - Clase: `px-4 py-2 bg-[#468DFF] text-white rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-[#0511F2] transition-all cursor-pointer shadow-lg shadow-[#468DFF]/10 shrink-0`
- **Etiqueta del Panel de Filtros**:
  - Clase: `font-bold text-slate-400 flex items-center gap-1.5 uppercase tracking-wider shrink-0` (con icono `Sliders` de clase `h-3.5 w-3.5`).
- **Selects del Panel de Filtros**:
  - Clase: `border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-600 focus:outline-none focus:border-[#468DFF] text-xs`
- **Botón "Limpiar Filtros"**:
  - Clase: `px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg font-semibold cursor-pointer transition-all text-xs`

---

## 4. Estilo de Tablas de Datos

Las tablas deben estar envueltas en un contenedor con clase `bg-white rounded-2xl border border-slate-150 shadow-sm overflow-hidden` y permitir el scroll horizontal.

- **Estructura**:
  - `<table className="w-full text-left border-collapse">`
- **Encabezado (`<thead>`)**:
  - Fila: `<tr className="bg-slate-50 border-b border-slate-150 text-xs font-bold text-slate-400 uppercase tracking-wider">`
  - Celdas: `<th className="px-6 py-4 cursor-pointer hover:text-slate-700">`
- **Cuerpo (`<tbody>`)**:
  - Fila: `<tr className="hover:bg-slate-50/50 cursor-pointer" onClick={...}>` (con borde separador `divide-y divide-slate-100`).
  - Celdas de Texto Principal (Ej. Razón Social, CUIT, N° Extintor): `px-6 py-4 font-semibold text-slate-900`
  - Celdas de Texto Secundario (Ej. Establecimiento, Tema): `px-6 py-4 font-medium text-slate-600`
  - Celdas de Metadatos o Detalles: `px-6 py-4 text-slate-500`

### Botones de Acciones en la Tabla
Los botones de acción en las celdas finales de la tabla deben estar contenidos en un flex alineado a la derecha: `<td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>` y `<div className="flex items-center justify-end gap-2">`.

- **Botón Descargar / PDF**:
  - Clase: `p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-all cursor-pointer`
  - Icono: `Download` (`h-4.5 w-4.5`)
- **Botón Correo / Mail**:
  - Clase: `p-1.5 rounded-lg bg-blue-50 hover:bg-[#468DFF]/25 text-[#468DFF] transition-all cursor-pointer`
  - Icono: `Mail` (`h-4.5 w-4.5`)
- **Botón Editar**:
  - Clase: `p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-600 transition-all cursor-pointer`
  - Icono: `Edit` (`h-4.5 w-4.5`)
- **Botón Eliminar**:
  - Clase: `p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition-all cursor-pointer`
  - Icono: `Trash2` (`h-4.5 w-4.5`)

---

## 5. Diseño del Formulario de Carga (Inline Form)

El formulario reemplaza la vista de listado y se despliega con una animación suave (`animate-fade-in`) dentro de un contenedor estándar.

- **Contenedor Principal del Formulario**:
  - Clase: `bg-white rounded-2xl border border-slate-150 shadow-sm overflow-hidden`
- **Cabecera del Formulario**:
  - Clase: `px-6 py-4 bg-slate-50 border-b border-slate-150 flex items-center justify-between`
  - Botón de regreso: `<button onClick={handleExitForm} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 cursor-pointer"><ArrowLeft className="h-5 w-5" /></button>`
  - Botón de cruz de cierre: `<button onClick={handleExitForm} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-200 cursor-pointer"><X className="h-5 w-5" /></button>`
- **Campos del Formulario (Inputs, Selects, Textareas)**:
  - Clase General: `w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all`
  - Clase Deshabilitado / Solo Lectura: `w-full border border-slate-150 rounded-xl px-3.5 py-2 text-sm bg-slate-100 text-slate-500 outline-none`
- **Botones del Formulario (Pie de Página)**:
  - Contenedor: `flex justify-between items-center pt-6 border-t border-slate-100`
  - Botón de Salida (Izquierda): `px-5 py-2.5 border border-slate-300 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-all active:scale-[0.98] cursor-pointer`
  - Botón de Guardar (Derecha): `px-5 py-2.5 bg-[#468DFF] hover:bg-[#0511F2] text-white rounded-xl text-sm font-bold flex items-center gap-2 transition-all active:scale-[0.98] cursor-pointer shadow-lg shadow-[#468DFF]/10`

---

## 6. Diseño de Modales y Diálogos

- **Overlay**:
  - Clase: `fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in`
- **Contenedor del Diálogo**:
  - Clase: `bg-white rounded-2xl border border-slate-150 p-6 shadow-xl max-w-sm w-full animate-scale-up space-y-4`
- **Botón Aceptar / Acción Destructiva (Rojo)**:
  - Clase: `flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all active:scale-[0.98] cursor-pointer`
- **Botón Cancelar / Volver (Neutro)**:
  - Clase: `flex-1 py-2.5 border border-slate-350 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all active:scale-[0.98] cursor-pointer`
