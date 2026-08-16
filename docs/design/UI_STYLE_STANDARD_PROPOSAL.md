# Propuesta de Estándar Único de Diseño UI y Design System — Gestión SySO

**Fecha:** 16 de Agosto de 2026  
**Área:** Arquitectura de Frontend, UI/UX & Design System  
**Estado:** Propuesta Técnica de Estandarización Oficial  
**Objetivo:** Establecer la especificación normativa única de tokens visuales, componentes de interfaz, reglas de maquetación y accesibilidad para toda la aplicación web Gestión SySO.

---

## 1. Tokens de Marca, Tipografía y Colores

### 1.1 Tipografía y Familias Tipográficas
- **Fuente Principal de Datos y Lectura:**  
  `Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`  
  *Uso:* Cuerpo de texto, celdas de tablas, inputs, selects, textareas, listas y modales técnicos.
- **Fuente Institucional de Títulos e Identidad:**  
  `Outfit, 'Inter', sans-serif` (clase `.font-outfit` o `font-outfit`)  
  *Uso:* Títulos de página (`AppPageHeader`), títulos de tarjetas principales, headers de modales y landing pages.
- **Fuentes de Marca Especiales:**  
  `'Virgo 01'` / `'Virgo01'` y `'Audiowide'`  
  *Uso:* Exclusivamente en el logotipo institucional `"GESTIÓN SySO"` (Sidebar, Navbar y PublicFooter).

---

### 1.2 Escala Jerárquica Normalizada

| Nivel Semántico | Clases Tailwind Estándar | Tamaño | Peso (Weight) | Tracking / Line Height | Caso de Uso Obligatorio |
|---|---|---|---|---|---|
| **H1 (Título de Página)** | `font-outfit text-base md:text-lg font-bold text-slate-900` | 18px / 1.125rem | Bold (700) | `tracking-tight leading-none` | Cabecera superior (`AppPageHeader`) |
| **H2 (Sección / Tarjeta Principal)** | `font-outfit text-sm md:text-base font-bold text-slate-800` | 16px / 1rem | Bold (700) | Normal | Título de formularios y cards del dashboard |
| **H3 (Subsección / Header Modal)** | `text-sm font-bold text-slate-800` | 14px / 0.875rem | Bold (700) | Normal | Títulos de acordiones, grupos y modales |
| **Body Regular (Texto Lectura)** | `text-xs font-normal text-slate-700` | 12px / 0.75rem | Normal (400) | `leading-relaxed` | Párrafos descriptivos y notas técnicas |
| **Body Medium (Celdas de Tabla)** | `text-xs font-medium text-slate-700` | 12px / 0.75rem | Medium (500) | Normal | Textos principales de filas de tabla |
| **Detail (Metadatos Secundarios)** | `text-[11px] font-medium text-slate-500` | 11px / 0.6875rem | Medium (500) | Normal | Subtítulos de establecimiento y fechas |
| **Labels Técnicos de Formularios** | `text-xs font-bold text-slate-600 uppercase tracking-wider` | 12px / 0.75rem | Bold (700) | `tracking-wider` | Etiquetas de campos (`AppLabel`) |
| **Badges de Estado / Insignias** | `text-[10px] font-bold uppercase tracking-wider` | 10px / 0.625rem | Bold (700) | `tracking-wider` | Píldoras de estado (`CUMPLE`, `PENDIENTE`) |
| **Pies de Página / Copyright** | `text-[10px] sm:text-[11px] font-medium text-slate-400` | 10px-11px | Medium (500) | Normal | Textos legales y versiones del sistema |

---

### 1.3 Reglas de Capitalización y Casing

Para garantizar homogeneidad y profesionalismo en toda la interfaz, se establecen las siguientes reglas estrictas de casing:

1. **Botones de Acción y CTAs:**  
   **Sentence case** (primera letra mayúscula, resto minúsculas, respetando siglas y nombres propios).  
   *Ejemplos:* `"Guardar registro"`, `"Descargar PDF"`, `"Nuevo aviso de riesgo"`, `"Cancelar"`, `"Salir"`.  
   *(Prohibido el uso de mayúsculas sostenidas tipo `"GUARDAR"` o `"NUEVO AVISO"` en botones).*

2. **Etiquetas de Formularios (`AppLabel`):**  
   **UPPERCASE** (mayúsculas sostenidas con tracking espaciado `tracking-wider`).  
   *Ejemplos:* `"RAZÓN SOCIAL *"`, `"C.U.I.T."`, `"ESTABLECIMIENTO *"`, `"PROFESIONAL INTERVINIENTE *"`.

3. **Encabezados de Columna de Tabla (`<thead>`):**  
   **UPPERCASE** con color atenuado `text-slate-400` o `text-slate-500`.  
   *Ejemplos:* `"CLIENTE / RAZÓN SOCIAL"`, `"FECHA"`, `"ESTABLECIMIENTO"`, `"RESULTADO"`, `"ESTADO"`, `"ACCIONES"`.

4. **Badges e Insignias de Estado:**  
   **UPPERCASE**.  
   *Ejemplos:* `"REALIZADA"`, `"PENDIENTE"`, `"CUMPLE"`, `"NO CUMPLE"`, `"BORRADOR"`, `"EN PROCESO"`.

5. **Títulos de Diálogos y Modales:**  
   **Title Case**.  
   *Ejemplos:* `"Registrar Nueva Constancia de Visita"`, `"Sincronización con Perfil de Establecimiento"`.

---

### 1.4 Tokens CSS y Paleta de Colores (`src/app/globals.css`)

```css
:root {
  /* Azul Corporativo SySO y Acentos */
  --primary: 217 100% 63.7%;        /* #468DFF (Azul Corporativo Principal) */
  --primary-hover: 237 96% 49%;     /* #0511F2 (Azul Intenso de Resaltado) */
  --primary-foreground: 0 0% 100%;  /* #FFFFFF */

  /* Neutrales de Fondo, Canvas y Contenedores */
  --background: 210 20% 98%;        /* #F1F5F9 (slate-100 canvas de fondo) */
  --card: 0 0% 100%;               /* #FFFFFF (blanco puro de tarjetas) */
  --card-foreground: 222.2 84% 4.9%;/* #020617 (slate-950) */
  --popover: 0 0% 100%;            /* #FFFFFF */
  --popover-foreground: 222.2 84% 4.9%;
  --syso-bg: 0 0% 85%;              /* #D9D9D9 (gris secundario) */

  /* Bordes Nítidos y Líneas Divisorias */
  --border: 215 20% 82%;            /* #CBD5E1 (slate-300 reforzado) */
  --input: 215 20% 82%;             /* #CBD5E1 */
  --ring: 217 100% 63.7%;           /* #468DFF con opacidad 20% en focus */

  /* Estados Semánticos de Seguridad e Higiene */
  --success: 142.1 76.2% 36.3%;     /* #16A34A (green-600 / Safety Green) */
  --success-foreground: 0 0% 100%;
  --warning: 38 92% 50%;            /* #F59E0B (amber-500 / Advertencia / Edición) */
  --warning-foreground: 0 0% 100%;
  --destructive: 0 84.2% 60.2%;     /* #EF4444 (red-500 / Desvío Crítico / Eliminar) */
  --destructive-foreground: 0 0% 100%;

  /* Geometría */
  --radius: 0.75rem;                /* 12px (rounded-xl estándar) */
}
```

---

## 2. Especificación de Componentes Base (`src/components/ui/`)

### 2.1 Botones (`AppButton`)

Todos los botones deben consumir exclusivamente el componente `AppButton` (`src/components/ui/AppButton.js`):

```jsx
import AppButton from '@/components/ui/AppButton';

// Botón Primario (Acción Principal / Guardar / Nuevo)
<AppButton variant="primary" size="md">
  <PlusCircle className="h-4 w-4" />
  <span>Nuevo registro</span>
</AppButton>

// Botón Secundario / Salir
<AppButton variant="secondary" size="md">
  <span>Salir</span>
</AppButton>

// Botones de Tabla (Icon-Only / size="icon")
<AppButton variant="document-table" size="icon" title="Visualizar documento">
  <FileText className="h-4.5 w-4.5" />
</AppButton>

<AppButton variant="edit-table" size="icon" title="Editar registro">
  <Edit3 className="h-4 w-4" />
</AppButton>

<AppButton variant="delete-table" size="icon" title="Eliminar registro">
  <Trash2 className="h-4 w-4" />
</AppButton>
```

#### Catálogo de Clases por Variante:
- **`primary`**: `bg-[#468DFF] text-white border border-[#468DFF] hover:bg-[#0511F2] hover:border-[#0511F2] rounded-xl font-bold text-xs h-10 px-4 shadow-md shadow-[#468DFF]/10 transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-[0.98]`.
- **`secondary`**: `bg-white text-[#468DFF] border border-[#468DFF] hover:bg-[#468DFF] hover:text-white rounded-xl font-bold text-xs h-10 px-4 transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-[0.98]`.
- **`destructive`**: `bg-red-500 hover:bg-red-600 text-white border border-red-500 hover:border-red-600 rounded-xl text-xs font-bold h-10 px-4 transition-all shadow-md shadow-red-500/10`.
- **`amber`**: `bg-amber-500 hover:bg-amber-600 text-white border border-amber-500 hover:border-amber-600 rounded-xl text-xs font-bold h-10 px-4 transition-all shadow-md shadow-amber-500/10`.
- **`document-table`**: `p-1.5 rounded-lg bg-blue-50 text-[#468DFF] hover:bg-blue-100 hover:text-[#0511F2] transition-colors border border-blue-200/50 shadow-xs`.
- **`edit-table`**: `p-1.5 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 hover:text-amber-800 transition-colors border border-amber-200/50 shadow-xs`.
- **`delete-table`**: `p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-800 transition-colors border border-red-200/50 shadow-xs`.

---

### 2.2 Entradas de Formulario (`AppInput`, `AppSelect`, `AppTextarea`, `AppLabel`)

- **Altura estándar:** `h-10` (40px) para inputs y selects.
- **Clases base:** `w-full border border-slate-200 rounded-xl px-3.5 py-2 text-xs bg-slate-50/50 text-slate-700 placeholder-slate-400 focus:outline-none focus:border-[#468DFF] focus:ring-2 focus:ring-[#468DFF]/20 focus:bg-white transition-all`.
- **Integración de Asistente de Voz e IA:** Todo `AppTextarea` destinado a observaciones, conclusiones, causas de accidentes o recomendaciones debe incluir `voiceHelper={true}` para habilitar el componente flotante `<AITextHelper />`.

---

### 2.3 Captura de Firmas Web (`AppSignatureCanvas`)

Componente unificado con Canvas HTML5 interactivo (`src/components/ui/AppSignatureCanvas.js`):
- **Props estándar:** `label`, `required`, `disabled`, `height={160}`, `width={500}`, `initialUrl`, `onChange(hasSigned)`, `onClear()`.
- **Cálculo de trazo proporcional:** Elimina desfases de coordenadas entre eventos de mouse y touch en pantallas de alta densidad.
- **Indicador de estado:** Badge verde `CheckCircle2` `"Firma Registrada"` cuando existe trazo o firma cargada.
- **Botón de limpieza:** Botón compacto con icono `RotateCcw` `"Limpiar"`.

---

### 2.4 Uploaders Avanzados

1. **`DocumentUploadZone` (Carga de PDFs, Legajos y Planillas):**
   - Soporte drag & drop reactivo y pestañas para conmutación de archivo local / enlace de Google Drive.
2. **`ImageUploadZone` (`SySO-Multiple-Evidence-Photo-Grid`):**
   - Miniaturas cuadradas `aspect-square`, overlay con botón `Eye` (abrir foto completa en nueva pestaña) y `Trash2` (eliminar foto).
   - Tarjeta interactiva `+` para adición ágil de fotos.
   - Deserialización tolerante `getPathsFromImagenUrl` compatible con arrays `TEXT[]` o strings JSON.

---

### 2.5 Skeletons de Carga Estructurados (`AppSkeleton`)

Para prevenir el parpadeo de contenido (CLS) durante las consultas asíncronas de Supabase:
- **`variant="table"`**: Renderiza la cabecera fija y filas desdibujadas con animación `animate-pulse` y fondo `bg-slate-150 rounded-lg`.
- **`variant="card"`**: Renderiza siluetas de tarjetas de estadísticas para el dashboard.
- **`variant="form"`**: Renderiza siluetas de campos con sus etiquetas para formularios complejos.

---

### 2.6 Globos Explicativos Accesibles (`AppTooltip`)

Sustitución obligatoria del atributo `title="..."` nativo:
- **Estructura:** Envuelve cualquier icono o botón con `content="Texto de ayuda"`.
- **Estilos:** Globo oscuro `bg-slate-900 text-white text-[11px] font-medium px-2.5 py-1 rounded-lg shadow-xl animate-fade-in` con flecha indicadora y soporte táctil por click en móviles.

---

### 2.7 Assets e Ilustraciones Corporativas de la Mascota

Estandarización del personaje de seguridad cartoon años 30 en `public/brand/mascot/`:
- `mascot-empty.png`: Para el estado de tabla vacía (`AppEmptyState`).
- `mascot-404.png`: Para la pantalla de ruta no encontrada (`not-found.js`).
- `mascot-error.png`: Para la pantalla de error inesperado (`error.js`).
- `mascot-welcome.png`: Para el modal de bienvenida u onboarding inicial.

---

## 3. Estándar de Maquetación de Tablas (SySO Compact Layout v2.0)

Todas las vistas de listado del SaaS deben estructurarse bajo el siguiente patrón de contenedores:

```jsx
<main className="flex-1 flex flex-col min-w-0 min-h-0 relative overflow-hidden bg-background">
  {/* Cabecera Superior Fija de Página */}
  <AppPageHeader
    title="Constancias de Visita"
    icon={ClipboardCheck}
    tenantName={tenant?.name}
    planId={effectivePlan}
    setIsMobileMenuOpen={setIsMobileMenuOpen}
  />

  {/* Cuerpo Contenedor */}
  <div className="w-full flex-grow flex flex-col p-0 md:p-6 space-y-0 md:space-y-4 overflow-hidden">
    
    {/* Panel Superior: Filtros y Búsqueda Compacta (v2.0) */}
    <div className="bg-white border-y border-x-0 md:border md:border-slate-200 md:rounded-2xl p-3.5 sm:p-5 md:px-6 md:py-3.5 shadow-sm space-y-2.5 shrink-0">
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 w-full md:w-64">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por cliente, dirección..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#468DFF] focus:ring-2 focus:ring-[#468DFF]/20 text-slate-700 placeholder-slate-400"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 justify-end">
          <AppButton variant="secondary" size="sm" onClick={handleExportPdf}>
            <Download className="h-3.5 w-3.5" />
            <span>Descargar PDF</span>
          </AppButton>
          <AppButton variant="secondary" size="sm" onClick={handlePrint}>
            <Printer className="h-3.5 w-3.5" />
            <span>Imprimir</span>
          </AppButton>
        </div>
      </div>

      {/* Fila Inferior de Filtros */}
      <div className="flex items-center justify-between min-h-[28px] border-t border-slate-100 pt-1.5">
        <button
          type="button"
          onClick={handleClearFilters}
          className="text-[11px] font-semibold text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
        >
          Limpiar búsqueda
        </button>

        <AppButton variant="primary" size="sm" onClick={handleNew}>
          <PlusCircle className="h-3.5 w-3.5" />
          <span>Nueva visita</span>
        </AppButton>
      </div>
    </div>

    {/* Contenedor de Tabla con Altura Dinámica y Sticky Header */}
    <div
      className="bg-white border-y border-x-0 md:border md:border-slate-200 md:rounded-2xl shadow-sm overflow-hidden flex flex-col flex-grow"
      style={{ height: isFiltersOpen ? 'calc(100vh - 310px)' : 'calc(100vh - 240px)' }}
    >
      {isLoading ? (
        <AppSkeleton variant="table" rows={6} />
      ) : data.length === 0 ? (
        <AppEmptyState
          title="No hay visitas registradas"
          subtitle="Registrá una nueva constancia de visita para comenzar."
          actionText="Nueva visita"
          onAction={handleNew}
        />
      ) : (
        <div className="overflow-auto flex-grow">
          <table className="w-full text-left border-collapse min-w-[850px]">
            <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Cliente / Razón Social</th>
                <th className="px-6 py-4">Establecimiento</th>
                <th className="px-6 py-4">Fecha</th>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 text-xs font-bold text-slate-800">{row.cliente}</td>
                  <td className="px-6 py-4 text-xs text-slate-600">{row.establecimiento}</td>
                  <td className="px-6 py-4 text-xs text-slate-500">{formatDate(row.fecha)}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border bg-emerald-50 text-emerald-700 border-emerald-200">
                      Realizada
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <AppButton variant="document-table" size="icon" onClick={() => handleViewPdf(row)}>
                        <FileText className="h-4 w-4" />
                      </AppButton>
                      <AppButton variant="edit-table" size="icon" onClick={() => handleEdit(row)}>
                        <Edit3 className="h-4 w-4" />
                      </AppButton>
                      <AppButton variant="delete-table" size="icon" onClick={() => handleDelete(row)}>
                        <Trash2 className="h-4 w-4" />
                      </AppButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>

  </div>
</main>
```

---

## 4. Guía de Adaptabilidad Responsiva

### 4.1 Pantallas Móviles (< 768px)
- **Cabecera Fija:** `position: fixed; top: 0; left: 0; right: 0; z-index: 30; height: 4rem (64px)`.
- **Cuerpo a Pantalla Completa:** `padding: 0; margin: 0; height: calc(100vh - 4rem)`.
- **Tarjetas Borde a Borde:** `border-left: 0; border-right: 0; border-radius: 0; box-shadow: none`.
- **Barra de Acciones en Formularios:** Botones `Salir` y `Guardar` con `flex-1` distribuidos horizontalmente o apilados con acceso al pulgar.

### 4.2 Pantallas Desktop (>= 768px)
- **Canvas Flotante:** Fondo neutro `bg-syso-bg` (`#D9D9D9` / `#F1F5F9`) con márgenes `p-6`.
- **Tarjetas Contenedoras:** `rounded-2xl border border-slate-200 shadow-sm bg-white`.
- **Sidebar Plegable:** Ancho expandido `w-64` (256px) y colapsado `w-20` (80px).

---
