# Estándar de Diseño de Interfaz (UX/UI) - Gestión SySO

Este documento establece el estándar visual y de experiencia de usuario (UX/UI) del proyecto SaaS **Gestión SySO**, basado en el diseño del módulo **Constancia de Visita** (`/visitas`). 

Todas las secciones operativas del sistema deben cumplir estrictamente con estas reglas de estilo, clases y componentes para garantizar una experiencia consistente, fluida y premium.

---

## 1. Diseño de Contenedores y Layout General

- **Fondo de la Página**: `#D9D9D9` (Gris claro estándar).
  - Clase: `bg-syso-bg`
- **Margen Interno del Cuerpo**: `p-6` para el scroll central, con un contenedor de ancho útil máximo al **95%** alineado horizontalmente.
  - Clase: `max-w-[95%] mx-auto space-y-6`
- **Fondo de las Tarjetas (Cards)**: Blanco puro (`#FFFFFF`) con bordes semitransparentes finos en color gris claro `#E2E8F0` / `#E8ECF2` (Slate 150) y esquinas muy redondeadas (`rounded-2xl`).
  - Clase: `bg-white rounded-2xl border border-slate-150 shadow-sm`
  - *Nota*: Evitar el uso de `border-slate-200` y `rounded-xl` que lucen más toscos. Usar `border-slate-150` y `rounded-2xl`.

### 1.1 Encabezado de Página (Top Navbar)
El encabezado superior de la página (Top Navbar) debe mantenerse sticky y tener una altura fija de exactamente `h-16`, con paddings horizontales responsivos y un botón de menú responsivo para móviles:
- **Estructura HTML/JSX**:
  ```javascript
  <header className="h-16 border-b border-slate-200 flex items-center justify-between px-4 md:px-6 bg-white shrink-0 sticky top-0 z-20">
    <div className="flex items-center gap-2.5 min-w-0">
      <button 
        onClick={() => setIsMobileMenuOpen(true)} 
        className="p-2 -ml-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 md:hidden cursor-pointer shrink-0"
      >
        <Menu className="h-5 w-5" />
      </button>
      <ICON_COMPONENT className="h-5 w-5 text-[#468DFF] shrink-0" />
      <h1 className="font-outfit text-base md:text-lg font-bold text-slate-900 truncate leading-none">
        TITULO_DE_LA_SECCION
      </h1>
    </div>
    <div className="flex items-center gap-3 shrink-0">
      <span className="text-xs font-semibold text-slate-500 bg-slate-50 py-1.5 px-3 rounded-xl border border-slate-150 hidden sm:inline-block">
        {tenant?.name || 'Cargando...'}
      </span>
      <span className="px-2.5 py-1.5 rounded-lg bg-[#468DFF]/15 border border-[#468DFF]/25 text-[#468DFF] text-[10px] font-bold uppercase tracking-wider">
        {tenant?.plan_id ? (tenant.plan_id.toLowerCase() === 'libre' ? 'Plan Full' : tenant.plan_id.toLowerCase().startsWith('standard') ? 'Plan Standard' : tenant.plan_id.toLowerCase().startsWith('basic') ? 'Plan Basic' : `Plan ${tenant.plan_id}`) : 'Plan Pro'}
      </span>
    </div>
  </header>
  ```

---

## 2. Tipografías y Textos

- **Tipografía General**: `font-sans` (Inter).
- **Tipografía de Títulos y Headers**: `font-outfit` (Outfit).
- **Título de la Sección (Navbar)**:
  - Clase: `font-outfit text-base md:text-lg font-bold text-slate-900 truncate leading-none`
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

## 3. Barra de Herramientas, Búsqueda y Filtros (Layout Compacto SySO)

El panel superior de búsqueda y filtrado debe estructurarse en una tarjeta única unificada con la especificación de diseño compacto **"Layout Compacto de Tabla y Filtros de SySO"**:
- **Clase del Contenedor**: `bg-white border border-slate-150 rounded-2xl p-3 shadow-sm space-y-3 shrink-0` (padding de 12px y espaciado vertical de 12px para maximizar la superficie útil de la grilla inferior).

### 3.1 Fila Superior (Buscador y Herramientas)
- **Buscador (Input de Texto)**:
  - Clase: `w-full pl-9 pr-3.5 py-1.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all text-slate-700 placeholder-slate-400`
  - Debe incluir un icono `Search` a la izquierda con clase `absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none`.
- **Botones de Exportación / Acción Secundaria (Descargar PDF / Imprimir)**:
  - Clase: `py-1.5 px-3 rounded-xl border border-[#468DFF] text-xs font-bold bg-white text-[#468DFF] hover:bg-[#468DFF] hover:text-white transition-all flex items-center gap-1.5 cursor-pointer shrink-0`
  - Iconos de soporte (ej: `FileText`, `Printer`): Clase `h-3.5 w-3.5`.
- **Colapso Responsivo de Exportación (Móvil)**:
  - El input de búsqueda se agrupa con un botón de flecha visible solo en móvil (`md:hidden`) en un div con clase `flex items-center gap-2 w-full md:w-64`.
  - Botón de flecha: Clase `p-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-all cursor-pointer flex items-center justify-center shrink-0 h-[29px] w-[29px]` (con icono `ChevronUp`/`ChevronDown` de `h-4 w-4`).
  - Contenedor de botones de exportación: Usa la clase condicional `${showExportMobile ? 'flex' : 'hidden md:flex'}` con clases de alineación responsiva `items-center gap-1.5 w-full md:w-auto shrink-0 justify-end`, asegurando que en móviles se contraigan o expandan dinámicamente. El botón de exportación individual en móvil se expande proporcionalmente con `flex-1 md:flex-initial justify-center`.

### 3.2 Fila Inferior (Filtros Rápidos y Botón de Creación)
Esta fila utiliza un layout flex de extremos distribuidos (`flex items-center justify-between min-h-[28px] border-t border-slate-100 pt-1.5`) para agrupar los filtros y el botón de creación principal:
- **Contenedor Izquierdo (Filtros)**: Clase `flex items-center gap-2`.
  - **Etiqueta del Panel de Filtros**: Clase `font-bold text-slate-400 flex items-center gap-1.5 uppercase tracking-wider text-[10px] hover:text-slate-600 transition-colors cursor-pointer` (con icono `Sliders` de clase `h-3 w-3` y Chevron de colapso de clase `h-3 w-3`).
  - **Selects del Panel de Filtros**: Clase `border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-600 focus:outline-none focus:border-[#468DFF] text-xs cursor-pointer`
  - **Botón "Limpiar Filtros"**: Clase `px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[10px] font-semibold cursor-pointer transition-all border border-slate-200`
- **Contenedor Derecho (Botón de Creación Principal - "Nuevo...")**:
  - Ubicación: Se coloca a la derecha de la misma línea de filtros para ahorrar altura de pantalla.
  - Clase: `px-3 py-1.5 bg-[#468DFF] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-[#0511F2] transition-all cursor-pointer shadow-lg shadow-[#468DFF]/10 shrink-0`
  - Icono de soporte (ej: `PlusCircle`): Clase `h-3.5 w-3.5`.

---

## 4. Estilo de Tablas de Datos (Tabla Compacta SySO)

Las tablas deben estar envueltas en un contenedor con clase `bg-white border border-slate-150 rounded-2xl shadow-sm overflow-hidden flex flex-col` y permitir el scroll horizontal. La altura está calculada dinámicamente y con transiciones según la visibilidad de los filtros.

- **Comportamiento de la Altura y Pantalla**:
  - Altura con filtros visibles: `height: calc(100vh - 310px)` (evita que la página tenga scroll vertical externo, fijando la tabla al viewport).
  - Altura con filtros colapsados: `height: calc(100vh - 240px)`
  - Transición de contracción suave: `transition-all duration-300 ease-in-out`
- **Estructura Interna**:
  - Wrapper del scroll: `overflow-auto flex-grow`
  - Tabla: `<table className="w-full text-left border-collapse min-w-[850px]">`
- **Encabezado (`<thead>`)**:
  - Fila: `<tr className="bg-slate-50 border-b border-slate-150 text-xs font-bold text-slate-400 uppercase tracking-wider">`
  - Celdas: `<th className="px-6 py-4 cursor-pointer hover:text-slate-700 select-none transition-colors">` (con flechas de ordenamiento opcionales).
- **Cuerpo (`<tbody>`)**:
  - Fila: `<tr className="hover:bg-slate-100 cursor-pointer divide-y divide-slate-100 transition-colors">`
  - Celdas (`<td>`): `px-6 py-4 text-xs font-normal text-slate-700`
  - Texto Principal de Celda (Ej. Cliente, Descripción): `font-semibold text-slate-900`
  - Texto Secundario de Celda / Detalle: `text-slate-600 font-medium`
  - Sub-etiquetas descriptivas secundarias (en una segunda línea de celda): `text-[10px] text-slate-400 block mt-0.5 font-normal`
  - Fechas e Indicadores numéricos: `text-slate-500 font-mono text-[10px]`

### Botones de Acciones en la Tabla
Los botones de acción en las celdas finales de la tabla deben estar contenidos en un flex alineado a la derecha: `<td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>` y `<div className="flex items-center justify-end gap-2">`.

- **Botón Descargar / PDF**:
  - Clase: `p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-all cursor-pointer`
  - Icono: `Download` (`h-4 w-4` o `h-4.5 w-4.5`)
- **Botón Correo / Mail**:
  - Clase: `p-1.5 rounded-lg bg-blue-50 hover:bg-[#468DFF]/25 text-[#468DFF] transition-all cursor-pointer`
  - Icono: `Mail` (`h-4.5 w-4.5`)
- **Botón Editar**:
  - Clase: `p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-600 transition-all cursor-pointer inline-flex items-center justify-center`
  - Icono: `Edit` (`h-4.5 w-4.5`)
- **Botón Eliminar**:
  - Clase: `p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition-all cursor-pointer inline-flex items-center justify-center`
  - Icono: `Trash2` (`h-4.5 w-4.5`)
- **Botón Ver Detalle (Solo lectura para Clientes)**:
  - Clase: `p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-all cursor-pointer inline-flex items-center justify-center`
  - Icono: `Eye` (`h-4.5 w-4.5`)

---

## 5. Diseño del Formulario de Carga (Inline Form)

El formulario reemplaza la vista de listado y se despliega con una animación suave (`animate-fade-in`) dentro de una tarjeta unificada.

- **Contenedor Principal del Formulario**:
  - Clase: `bg-white rounded-2xl border border-slate-150 shadow-sm overflow-hidden flex flex-col max-h-[85vh]`
- **Cabecera del Formulario**:
  - Clase: `h-16 px-4 md:px-6 bg-slate-50 border-b border-slate-150 flex items-center justify-between shrink-0`
  - Botón de regreso: `<button type="button" onClick={handleExitForm} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 cursor-pointer"><ArrowLeft className="h-5 w-5" /></button>`
  - Título: `<span className="font-outfit text-base font-bold text-slate-900">TITULO_DEL_FORMULARIO</span>`
  - Botón de cruz de cierre: `<button type="button" onClick={handleExitForm} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-200 cursor-pointer"><X className="h-5 w-5" /></button>`
- **Cuerpo del Formulario**:
  - Clase: `<form onSubmit={...} className="p-6 md:p-8 space-y-6 overflow-y-auto flex-1 scrollbar-thin">`
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

---

## 7. Sección Programa de Capacitación (Especificaciones Detalladas)

Para la sección de **Programa de Capacitación Anual** (`/capacitacion`), se establece un diseño estructurado y de alto contraste que asegura un control impecable del espacio de pantalla y consistencia visual:

### 7.1 Contenedor Superior (Buscador y Acciones)
El panel superior está unificado en una tarjeta única y colapsable que agrupa la búsqueda global, exportación y altas. Debe respetar las siguientes clases e interacciones:
- **Estructura y Bordes**: Tarjeta con clase `bg-white border border-slate-150 rounded-2xl p-4 shadow-sm space-y-4 shrink-0`.
- **Buscador (Input de Texto)**:
  - Clase: `w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all text-slate-700 placeholder-slate-400`
  - Icono `Search`: Lucide React posicionado a la izquierda con `absolute left-3.5 top-3 h-4.5 w-4.5 text-slate-400 pointer-events-none`.
- **Botones de Descarga e Impresión (Estilo Secundario)**:
  - Clase: `py-2 px-4 rounded-xl border border-[#468DFF] text-sm font-bold bg-white text-[#468DFF] hover:bg-[#468DFF] hover:text-white transition-all flex items-center gap-2 cursor-pointer shrink-0`
- **Botón Registrar Capacitación (Estilo Primario)**:
  - Clase: `px-4 py-2 bg-[#468DFF] text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-[#0511F2] transition-all cursor-pointer shadow-lg shadow-[#468DFF]/10 shrink-0 w-full md:w-auto`
- **Selects de Filtrado (Desplegables)**:
  - Clase: `border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-600 focus:outline-none focus:border-[#468DFF] text-xs cursor-pointer w-full disabled:opacity-50 disabled:bg-slate-50 disabled:text-slate-400`
- **Botón Limpiar Filtros**:
  - Clase: `px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[10px] font-semibold cursor-pointer transition-all border border-slate-200`

### 7.2 Tabla de Contenidos (Listado de Datos)
La tabla de visualización debe ocupar una porción de pantalla fija y predecible, evitando desplazamientos de la página mediante una altura de tarjeta controlada por el estado de los filtros:
- **Estructura y Dimensiones**:
  - Altura con filtros visibles: `height: calc(100vh - 310px)`
  - Altura con filtros colapsados: `height: calc(100vh - 240px)`
  - Clase contenedora: `bg-white border border-slate-150 rounded-2xl shadow-sm overflow-hidden flex flex-col`
  - Contenedor interno del scroll: `overflow-auto flex-grow`
  - Clase de tabla: `w-full text-left border-collapse min-w-[850px]`
- **Encabezados de Columna (`<thead>`)**:
  - Clase de fila: `bg-slate-50 border-b border-slate-150 text-xs font-bold text-slate-400 uppercase tracking-wider`
  - Celdas (`<th>`): `px-6 py-4`
  - Distribución de Anchos (Respecto al 100% de la grilla):
    - Cliente / Establecimiento: `w-[20%]`
    - Puesto: `w-[15%]`
    - Tema de Capacitación: `w-[25%]`
    - Capacitador: `w-[15%]`
    - Fechas Programadas: `w-[12%]`
    - Progreso / Estado: `w-[8%]`
    - Acciones: `w-[5%]`
- **Celdas de Cuerpo (`<tbody>`)**:
  - Fila interactiva: `hover:bg-slate-100 cursor-pointer transition-colors` con `divide-y divide-slate-100`
  - Paddings y fuentes generales: `px-6 py-4 text-xs font-normal text-slate-700`
  - Textos principales (Cliente, Tema): `font-semibold text-slate-900`
  - Sub-etiquetas secundarias (Establecimiento, Contenido): `text-[10px] text-slate-400 block mt-0.5 font-normal`
  - Fechas: `text-slate-500 font-mono text-[10px]`
- **Badges de Estado de Progreso**:
  - Planificado (0%): `bg-slate-100 text-slate-700 border-slate-200 border rounded-full px-2 py-0.5 text-[10px] font-bold`
  - En curso (> 0%): `bg-blue-500/10 text-[#468DFF] border-blue-500/20 border rounded-full px-2 py-0.5 text-[10px] font-bold`
  - Completado (100%): `bg-[#00b050]/10 text-[#00b050] border-[#00b050]/20 border rounded-full px-2 py-0.5 text-[10px] font-bold`
- **Barra de Progreso Miniatura**:
  - Clase contenedor: `w-16 h-1.5 bg-slate-100 border border-slate-150 rounded-full overflow-hidden`
  - Clase barra activa: `bg-[#468DFF] h-full`
- **Botonera de Acciones (Columna final)**:
  - Clase del contenedor: `flex items-center justify-end gap-2`
  - Botón Ver Fotos: `p-1.5 rounded-lg bg-blue-50 text-[#468DFF] hover:bg-blue-100 hover:text-[#0511F2] transition-colors inline-flex items-center justify-center shadow-sm` (Icono: `ImageIcon` `h-4.5 w-4.5`).
  - Botón Editar: `p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-600 transition-colors inline-flex items-center justify-center` (Icono: `Edit` `h-4.5 w-4.5`).
  - Botón Eliminar: `p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition-colors inline-flex items-center justify-center` (Icono: `Trash2` `h-4.5 w-4.5`).
  - Botón Ver Detalle (Solo lectura para Clientes): `p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors inline-flex items-center justify-center` (Icono: `Eye` `h-4.5 w-4.5`).

