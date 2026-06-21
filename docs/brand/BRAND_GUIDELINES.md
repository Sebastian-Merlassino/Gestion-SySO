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
- **Badge del Plan**: Los badges que detallan el plan suscrito (`Plan Libre`, `Plan Standard`, etc.) deben presentarse en la parte superior derecha de cada Navbar, empleando el color azul corporativo `#468DFF` en un estilo suave y distinguido:
  - Clase: `bg-[#468DFF]/15 border border-[#468DFF]/25 text-[#468DFF] text-[10px] font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-lg`
