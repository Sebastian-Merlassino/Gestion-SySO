# Estándar de Ordenamiento en Encabezados de Tablas (TABLES_SORTING_STANDARD)

Este documento define el diseño visual y comportamiento interactivo unificado para el ordenamiento de columnas en las tablas de listados del proyecto **Gestión SySO**.

## Pautas de UI/UX

1. **Elemento Interactuable (`<th>`)**:
   Todo encabezado de columna que admita ordenamiento interactivo por parte del usuario debe configurarse con las siguientes clases CSS de Tailwind:
   ```html
   <th className="cursor-pointer select-none hover:text-slate-700 transition-colors" onClick={() => handleSort('nombre_campo')}>
   ```

2. **Alineación y Contenedor Flex**:
   Para asegurar que el texto del encabezado y el icono indicador de ordenamiento queden perfectamente alineados en una sola línea horizontal (y que el icono no se colapse ante anchos variables), el contenido del `<th>` debe envolverse en un contenedor flex:
   ```jsx
   <div className="flex items-center gap-1.5">
     Texto del Encabezado
     <AppSortIcon field="nombre_campo" sortField={sortField} sortOrder={sortOrder} />
   </div>
   ```

3. **Componente Visual Unificado (`<AppSortIcon />`)**:
   Queda estrictamente prohibido utilizar caracteres de texto crudos (`▲`, `▼`), flechas de texto con estilos inline, o componentes locales duplicados. En su lugar, se debe importar y utilizar el componente unificado:
   ```javascript
   import AppSortIcon from '@/components/ui/AppSortIcon';
   ```

## Estados Visuales del Icono

- **Columna Inactiva** (`sortField !== field`):
  Muestra una flecha doble de color gris suave (`ArrowUpDown` de Lucide React, clase `text-slate-300` de tamaño `h-3 w-3`). Esto ayuda al usuario a identificar inmediatamente qué columnas son ordenables.
  
- **Columna Activa - Ascendente** (`sortField === field && sortOrder === 'asc'`):
  Muestra una flecha recta hacia arriba (`ArrowUp` de Lucide React, clase `text-[#468DFF]` de tamaño `h-3.5 w-3.5`) en el azul corporativo de la marca, indicando foco activo.

- **Columna Activa - Descendente** (`sortField === field && sortOrder === 'desc'`):
  Muestra una flecha recta hacia abajo (`ArrowDown` de Lucide React, clase `text-[#468DFF]` de tamaño `h-3.5 w-3.5`) en el azul corporativo de la marca, indicando foco activo.

## Ejemplo de Implementación

```jsx
import React, { useState } from 'react';
import AppSortIcon from '@/components/ui/AppSortIcon';

export default function MiListado({ datos }) {
  const [sortField, setSortField] = useState('fecha');
  const [sortOrder, setSortOrder] = useState('desc');

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  return (
    <table>
      <thead>
        <tr className="bg-slate-50 text-xs font-bold text-slate-400 uppercase tracking-wider">
          <th className="px-6 py-4 cursor-pointer select-none hover:text-slate-700 transition-colors" onClick={() => handleSort('cliente')}>
            <div className="flex items-center gap-1.5">
              Cliente
              <AppSortIcon field="cliente" sortField={sortField} sortOrder={sortOrder} />
            </div>
          </th>
          <th className="px-6 py-4 cursor-pointer select-none hover:text-slate-700 transition-colors" onClick={() => handleSort('fecha')}>
            <div className="flex items-center gap-1.5">
              Fecha
              <AppSortIcon field="fecha" sortField={sortField} sortOrder={sortOrder} />
            </div>
          </th>
        </tr>
      </thead>
      <tbody>
        {/* Renderizado de filas */}
      </tbody>
    </table>
  );
}
```
