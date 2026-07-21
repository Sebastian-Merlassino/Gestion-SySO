# Estándar de Ventanas Emergentes Aclaratorias e Informativas (Gestión SySO)

Este documento define las directrices y el estándar UI/UX obligatorio para todas las **ventanas emergentes aclaratorias, informativas y de guías de ayuda** en la plataforma **Gestión SySO**.

> [!NOTE]
> Este estándar aplica exclusivamente a modales **informativos y explicativos** (consultas normativas, guías técnicas, instructivos de cálculo, desgloses metodológicos). Para diálogos de interacción de alertas, avisos destructivos o confirmación de guardado, consultar `docs/design/ALERTS_AND_FEEDBACK_STANDARD.md`.

---

## 1. Reglas Generales de Accesibilidad y Visibilidad

1. **Acceso Universal en Cualquier Modo**:
   - Toda ventana o diálogo aclaratorio debe ser **siempre interactivo y visible** tanto para usuarios administradores como para **clientes y auditores en modo de solo lectura** (`mode === 'view'`).
   - Queda estrictamente prohibido deshabilitar o condicionar la apertura de botones de ayuda (`HelpCircle`, `?`, `Ver Tabla`, etc.) mediante validaciones como `!canEdit` o `disabled`.

2. **Componente Estándar Reutilizable**:
   - Todo modal de ayuda o consulta explicativa **debe implementar obligatoriamente** el componente unificado:
     ```jsx
     import AppInfoModal from '@/components/ui/AppInfoModal';
     ```

---

## 2. Anatomía y Estructura Visual del Modal (`AppInfoModal`)

```
+-----------------------------------------------------------------------+
|  [Icono Azulado]  TÍTULO DEL MODAL EXPLICATIVO                   [X]  |  <- Header Slate-900
|                   Subtítulo informativo o norma de referencia         |
+-----------------------------------------------------------------------+
|                                                                       |
|  Cuerpo del Modal (Secciones informativas, tarjetas, tablas)         |  <- Scrollbar personalizada
|                                                                       |
+-----------------------------------------------------------------------+
|                                                      [ Cerrar ]       |  <- Footer Slate-50 (#468DFF)
+-----------------------------------------------------------------------+
```

### Especificaciones Técnicas de Estilo

- **Encabezado (Header)**:
  - Fondo: `bg-slate-900` (`#0F172A`).
  - Título: Tipografía `font-outfit text-base font-extrabold text-white`.
  - Subtítulo: `text-[11px] text-slate-300 font-medium`.
  - Icono principal: Encapsulado en contenedor con fondo `bg-[#468DFF]/20 text-[#468DFF]` y borde `border-[#468DFF]/30`.
  - Botón de cierre: Icono `X` de `lucide-react` con `hover:bg-slate-800 hover:text-white`.

- **Cuerpo (Body)**:
  - Fondo: Blanco `bg-white` con `p-6` y separación interna `space-y-5`.
  - Desplazamiento: Scrollbar delgada `scrollbar-thin flex-1 max-h-[85vh]`.

- **Pie de Página (Footer)**:
  - Fondo: `bg-slate-50 border-t border-slate-200`.
  - Botón de Acción Principal: Botón primario institucional `#468DFF` con texto **`"Cerrar"`** (o acción secundaria si aplica).

---

## 3. Ejemplo de Uso en Código

```jsx
import AppInfoModal from '@/components/ui/AppInfoModal';
import { BookOpen, Info } from 'lucide-react';

export default function MiGuiaExplicativaModal({ isOpen, onClose }) {
  return (
    <AppInfoModal
      isOpen={isOpen}
      onClose={onClose}
      title="Criterio de Evaluación Técnica"
      subtitle="Normativa de Referencia: Res. SRT 84/12 & Decreto 351/79"
      icon={BookOpen}
      maxWidth="max-w-2xl"
      closeButtonText="Cerrar"
    >
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-2">
        <h4 className="font-bold text-[#468DFF]">Explicación Técnica</h4>
        <p>Detalle explicativo y referencias de cálculo...</p>
      </div>
    </AppInfoModal>
  );
}
```
