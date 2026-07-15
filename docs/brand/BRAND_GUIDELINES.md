# Guías de Marca - Gestión SySO

Este documento establece los lineamientos visuales, conceptuales y de estilo para la interfaz de **Gestión SySO**, con el objetivo de lograr una identidad premium, coherente y profesional.

---

## 1. Identidad de la Marca
**Gestión SySO** es una plataforma SaaS B2B moderna que simplifica el cumplimiento de las normativas de Seguridad y Salud Ocupacional (SySO) y Medio Ambiente. 
- **Personalidad**: Confiable, profesional, moderna, segura, y de alta precisión.
- **Tono de Comunicación**: Claro, directo, preventivo y asertivo.

## 2. Paleta de Colores (Alineada con RULES_WORKSPACE.md)

Para transmitir seguridad industrial y corporativa de una forma sofisticada y premium, se utiliza una paleta de colores basada en grises y negros profundos con acentos azules limpios.

### Colores Principales (Fondo y Estructura)
- **Fondo de la Página (SySO Background)**: `#D9D9D9` (Gris claro secundario, clase `bg-syso-bg`).
- **Fondo de Tarjetas e Información y Formularios de Carga (Card Background)**: `#FFFFFF` (Blanco puro, clase `bg-white` para tarjetas, modales y formularios inline).
- **Líneas Divisorias y Bordes (Border/Muted Line)**: `#E2E8F0` / `#E8ECF2` (Gris suave, clase `border-slate-150`).

### Colores de Resaltado e Identidad
- **Color Principal / Acción (Corporate Blue)**: `#468DFF` (Azul corporativo brillante, usado para botones primarios, llamadas a la acción importantes y elementos de navegación activos).
- **Color de Resaltado (Highlight Blue)**: `#0511F2` (Azul profundo/neon para elementos de enfoque, llamadas secundarias y acentos complementarios).
- **Secundarios Neutros**:
  - Gris Claro: `#D9D9D9`
  - Blanco: `#FFFFFF`
  - Negro: `#000000`

### Colores de Estado (Seguridad e Higiene)
- **Advertencia / Atención (Warning Yellow)**: `#eab308` (Para riesgos menores o elementos pendientes).
- **Éxito / Aprobado (Safety Green)**: `#22c55e` (Para indicar que un área cumple con los estándares, auditorías aprobadas, y reportes limpios).
- **Peligro / Alerta (Safety Orange / Red)**: `#ef4444` (Para condiciones inseguras, desvíos críticos o incidentes registrados).

## 3. Principios de Diseño Visual
1. **Glassmorphism Sutil**: Uso de efectos de desenfoque de fondo (`backdrop-filter: blur(8px)`) con bordes semitransparentes en tarjetas y barras de navegación superiores para dar sensación de profundidad.
2. **Gradientes Modernos**: Uso de degradados suaves para el fondo principal, botones o texto destacado (ej. un degradado de azul principal `#468DFF` a azul de resaltado `#0511F2`).
3. **Micro-animaciones**: Transiciones suaves (`transition: all 0.2s ease-in-out`) en botones, tarjetas clicables y campos de entrada.
4. **Espaciado Generoso**: Respetar el espacio en blanco para evitar la sobrecarga visual típica de los sistemas tradicionales de seguridad industrial.

## 4. Tipografías y Encabezados Estandarizados
- **Tipografía de Marca (Outfit)**: Utilizada estrictamente en el Top Navbar (`h-16`) de todas las páginas, cabeceras de formularios inline y títulos principales de subsección para dotar al SaaS de una imagen moderna y profesional.
- **Badge del Plan**: Los badges que detallan el plan suscrito (`Plan Full`, `Plan Standard`, etc.) deben presentarse en la parte superior derecha de cada Navbar, empleando el color azul corporativo `#468DFF` en un estilo suave y distinguido:
  - Clase: `bg-[#468DFF]/15 border border-[#468DFF]/25 text-[#468DFF] text-[10px] font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-lg`

## 5. Estructura de Carga de Documentos (DocumentUploadZone)
Para mantener homogeneidad estética en todos los formularios que requieren subida de documentación o comprobantes (ej. PDF de denuncias, legajos técnicos, planillas Excel), se estandariza el componente `DocumentUploadZone` con los siguientes lineamientos visuales:

1. **Contenedor Principal**:
   - Fondo sutil grisáceo: `#F8FAFC` o `#F1F5F9` (usar clase `bg-slate-50`).
   - Borde suave: `border border-slate-200` y esquinas bien redondeadas: `rounded-xl`.
   - Limitar desbordamientos: `overflow-hidden`.
2. **Encabezado de Pestañas (Local vs Drive)**:
   - Contenedor con borde inferior: `flex border-b border-slate-200 bg-white text-xs font-semibold`.
   - Pestaña Activa: Relleno azul corporativo brillante `#468DFF` con texto blanco (`bg-[#468DFF] text-white`).
   - Pestaña Inactiva: Texto gris suave con hover a gris oscuro (`text-slate-500 hover:text-slate-700 transition-colors`).
3. **Zona Interna de Arrastre (Drag Zone)**:
   - Bordes discontinuos: `border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all`.
   - Estado pasivo: Borde gris y fondo blanco (`border-slate-200 bg-white hover:border-[#468DFF] hover:bg-blue-50/30`).
   - Estado de arrastre activo (Dragover): Borde azul y fondo azulado muy suave (`border-[#468DFF] bg-blue-50`).
   - Visualización de archivo: Enlace en azul con icono de documento (`FileText`) y botón para previsualizar (`Eye`) con comportamiento reactivo (`text-[#468DFF] hover:text-[#0511F2]`).
4. **Zona de Importación (Drive Link)**:
   - Input de tipo texto elegante (`flex-1 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#468DFF]`).
   - Botón azul corporativo con iconos consistentes de `ExternalLink` o de carga (`Loader2` animado).

## 6. Estándar de Botones
Para mantener la coherencia y profesionalismo en la interfaz, todos los botones de acción primarios y secundarios deben cumplir con las siguientes especificaciones:

### 1. Botón Primario
- **Estado Pasivo**:
  - Fondo (Relleno): `#468DFF` (Azul corporativo)
  - Texto y Borde: `#FFFFFF` (Blanco)
- **Estado Hover**:
  - Fondo (Relleno): `#0511F2` (Azul resaltado/profundo)
  - Texto y Borde: `#FFFFFF` (Blanco)

### 2. Botón Secundario (y Botón "Salir")
- **Estado Pasivo**:
  - Fondo (Relleno): `#FFFFFF` (Blanco)
  - Borde y Texto: `#468DFF` (Azul corporativo)
- **Estado Hover**:
  - Fondo (Relleno): `#468DFF` (Azul corporativo)
  - Borde y Texto: `#FFFFFF` (Blanco)

### 3. Botón "Editar" (Modificar / Cambiar)
- **Formulario (Botón Estándar)**:
  - **Estado Pasivo**: Fondo `#F59E0B` (Amber-500), texto/borde `#FFFFFF`.
  - **Estado Hover**: Fondo `#D97706` (Amber-600), texto/borde `#FFFFFF`.
- **Tabla (Icono de Acción)**:
  - **Estado Pasivo**: Fondo `#FEF3C7` (Amber-50), texto `#D97706` (`text-amber-600`).
  - **Estado Hover**: Fondo `#FEEB99` (Amber-100/200), texto `#B45309` (`text-amber-800`).

### 4. Botón "Eliminar" (Borrar / Remover)
- **Formulario (Botón Estándar)**:
  - **Estado Pasivo**: Fondo `#EF4444` (Red-500), texto/borde `#FFFFFF`.
  - **Estado Hover**: Fondo `#DC2626` (Red-600), texto/borde `#FFFFFF`.
- **Tabla (Icono de Acción)**:
  - **Estado Pasivo**: Fondo `#FEE2E2` (Red-50), texto `#DC2626` (`text-red-600`).
  - **Estado Hover**: Fondo `#FCA5A5` (Red-200), texto `#B91C1C` (`text-red-800`).

### 5. Pictograma de Documento en Tabla (Visualización / Acceso a PDF)
- **Tabla (Icono de Acción)**:
  - **Estado Pasivo**: Fondo `#EFF6FF` (Blue-50), texto e icono `#468DFF` (Azul corporativo).
  - **Estado Hover**: Fondo `#DBEAFE` (Blue-100), texto e icono `#0511F2` (Azul de resaltado).
  - **Icono**: `FileText` (Lucide React) de tamaño `h-4.5 w-4.5`.
  - **Clases recomendadas**: `p-1.5 rounded-lg bg-blue-50 text-[#468DFF] hover:bg-blue-100 hover:text-[#0511F2] transition-colors inline-flex items-center justify-center shadow-sm`


