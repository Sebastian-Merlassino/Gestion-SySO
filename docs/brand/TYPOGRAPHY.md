# Pautas de Tipografía - Gestión SySO

La tipografía de **Gestión SySO** busca equilibrar la legibilidad de datos complejos (reportes, planillas, checklists) con una estética moderna e industrial.

---

## 1. Familias Tipográficas

### Tipografía Primaria: **Outfit** o **Inter**
- **Outfit**: Recomendada para títulos, encabezados principales y landing pages. Tiene formas redondeadas y geométricas que transmiten modernidad y amigabilidad.
- **Inter**: Recomendada para texto de cuerpo, tablas, formularios y paneles de datos densos debido a su legibilidad excepcional en pantallas pequeñas y interfaces complejas.

### Tipografía Monospaciada (Para códigos, IDs y logs): **JetBrains Mono** o **SF Mono**
- Utilizada para ID de incidentes, folios de auditoría y registros del sistema (ej. `AUD-9021-X`).

---

## 2. Escala Tipográfica (Rem / Pixels)

| Elemento | Clases CSS (Tailwind) | Peso (Weight) | Tamaño (Rem / px) | Uso Sugerido |
| :--- | :--- | :--- | :--- | :--- |
| **H1** | `text-4xl font-extrabold tracking-tight` | Extra Bold (800) | `2.25rem` (36px) | Título de landing page o sección principal |
| **H2** | `text-2xl font-bold tracking-tight` | Bold (700) | `1.5rem` (24px) | Títulos de Dashboard o tarjetas principales |
| **H3** | `text-xl font-semibold` | Semibold (600) | `1.25rem` (20px) | Sub-encabezados y diálogos |
| **Body Large** | `text-lg font-medium` | Medium (500) | `1.125rem` (18px) | Párrafos introductorios |
| **Body Regular**| `text-base font-normal` | Regular (400) | `1rem` (16px) | Texto principal de lectura y campos de formularios |
| **Small / Detail**| `text-sm font-normal` | Regular (400) | `0.875rem` (14px) | Tablas de datos, metadatos, etiquetas y alertas |
| **Tiny / Caption**| `text-xs font-semibold` | Semibold (600) | `0.75rem` (12px) | Badges de estado, fechas, y subtítulos secundarios |

---

## 3. Reglas de Legibilidad
- **Interlineado (Line Height)**:
  - Títulos: `leading-tight` (1.25) para evitar exceso de aire en encabezados de múltiples líneas.
  - Cuerpo: `leading-relaxed` (1.625) para mejorar la facilidad de lectura de largos reportes de inspección.
- **Contraste**:
  - Texto principal en modo oscuro: `text-slate-100` (`#f8fafc`).
  - Texto secundario / descriptivo: `text-slate-400` (`#94a3b8`).
  - Texto deshabilitado: `text-slate-600` (`#475569`).
