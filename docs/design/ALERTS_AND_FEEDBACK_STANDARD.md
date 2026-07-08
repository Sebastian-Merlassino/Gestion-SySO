# Estándar de Alertas, Toasts y Diálogos — Gestión SySO

Este documento establece el estándar oficial de diseño, accesibilidad, seguridad y comportamiento para todos los mensajes temporales, modales de confirmación y alertas en la plataforma **Gestión SySO**. **Todos los agentes e ingenieros de software deben seguir este estándar de manera obligatoria.**

---

## 1. Notificaciones Temporales (Toasts)

Las notificaciones flotantes temporales se gestionan de forma centralizada mediante el provider `ToastProvider` y el hook `useToast()`. **Bajo ninguna circunstancia se deben declarar estados locales `[toast, setToast]` o markup de toast dentro de una página.**

### Implementación Técnica
```javascript
import { useToast } from '@/components/providers/ToastProvider';

const globalToast = useToast();
// Uso básico:
globalToast.toast('Operación realizada con éxito', 'success');
```

### Variantes y Parámetros

| Variante | Propósito | Icono | Duración por Defecto | Color de Fondo | Borde / Texto |
| :--- | :--- | :--- | :---: | :--- | :--- |
| `success` | Acción completada correctamente | `Check` | 4000 ms | `bg-green-50` | `border-green-200` / `text-green-800` |
| `error` | Fallo operativo o RLS de Supabase | `AlertTriangle` | 6000 ms | `bg-red-50` | `border-red-200` / `text-red-800` |
| `warning` | Riesgo crítico o advertencia de datos | `AlertOctagon` | 6000 ms | `bg-amber-50` | `border-amber-200` / `text-amber-800` |
| `info` | Notificaciones de descargas o carga | `Loader2` (spin) | 4000 ms | `bg-blue-50` | `border-blue-200` / `text-blue-800` |

*Para alertas informativas de carga persistente que no deben auto-cierren, llamar a `globalToast.toast('Mensaje', 'info', 0)`.*

---

## 2. Diálogos de Confirmación (Modales Radix UI)

Para interrumpir el flujo del usuario con el objetivo de prevenir la pérdida de datos o confirmar una acción crítica, se deben emplear los diálogos reutilizables basados en Radix UI. **Está estrictamente prohibido el uso de `window.alert()`, `window.confirm()` o `window.prompt()` nativos.**

### Componentes Oficiales

1.  **`<AppConfirmDialog />`**
    *   *Uso*: Confirmaciones de guardado, envío de correos o avisos informativos.
    *   *Variantes*: `'info'` o `'warning'`.
2.  **`<AppDestructiveConfirmDialog />`**
    *   *Uso*: Eliminación de registros críticos (Empresas, Técnicos, etc.) o de la cuenta/tenant de usuario.
    *   *Hardening*: Requiere que el usuario escriba textualmente una cadena de confirmación (ej: `"ELIMINAR MI CUENTA"`) para habilitar el botón de borrado físico en base de datos.
3.  **`<AppUnsavedChangesDialog />`**
    *   *Uso*: Disparado al intentar abandonar un formulario que contiene campos modificados (dirty checking).

---

## 3. Seguridad en Mensajes de Alerta (Sanitización)

Para evitar la fuga de información técnica sensible (criterio de seguridad **HC-02**), **nunca se debe inyectar `err.message` crudo de Supabase o PostgreSQL en un Toast de error de cara al usuario.**

*   **Práctica Incorrecta**: `triggerToast('Error: ' + err.message, 'error')` (revela tablas, RLS o triggers internos).
*   **Práctica Correcta**:
    ```javascript
    try {
      // ... consulta o acción Supabase
    } catch (err) {
      console.error('Detalle técnico interno:', err);
      triggerToast('Error al procesar la solicitud. Por favor, reintente en unos minutos.', 'error');
    }
    ```

---

## 4. Accesibilidad (A11y)

Todas las notificaciones y diálogos deben cumplir con los siguientes requisitos mínimos:
-   **Anunciación por Lectores**: Todos los componentes presentacionales de toast deben incluir `role="alert"` y `aria-live="assertive"`.
-   **Captura de Foco (`Focus Trap`)**: Los modales deben capturar el foco del teclado al abrirse y retornarlo al botón disparador al cerrarse.
-   **Tecla de escape**: Todo modal/diálogo no bloqueante debe poder cerrarse pulsando la tecla `Esc`.
