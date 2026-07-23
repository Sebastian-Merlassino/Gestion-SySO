# Plan de Acción: Estandarización de la Alerta "Salir Sin Guardar" — Gestión SySO

## 1. Diagnóstico y Relevamiento por Sección

Tras auditar exhaustivamente los 16 módulos operacionales dentro del tenant (`src/app/[tenant-slug]/`), las vistas de configuración (`profile`), `onboarding` y los componentes de formularios complejos (`ProtocoloForm.js`), se constató una alta variabilidad e inconsistencia en cómo se gestiona la salida de formularios con cambios pendientes (*dirty form checking*).

Actualmente se identifican **3 comportamientos dispares**:
1. **Módulos Cumplidores (Estándar `<AppUnsavedChangesDialog />`)**:
   - `protocolos/iluminacion` ([ProtocoloForm.js](file:///c:/Users/sebas/.gemini/antigravity-ide/scratch/Gestion-SySO/src/app/%5Btenant-slug%5D/protocolos/iluminacion/components/ProtocoloForm.js))
   - `profile` ([profile/page.js](file:///c:/Users/sebas/.gemini/antigravity-ide/scratch/Gestion-SySO/src/app/%5Btenant-slug%5D/profile/page.js))
   - `onboarding` ([onboarding/page.js](file:///c:/Users/sebas/.gemini/antigravity-ide/scratch/Gestion-SySO/src/app/onboarding/page.js))
2. **Módulos con Modales Personalizados Inline (Violación de Estándar)**:
   - `visitas` ([visitas/page.js](file:///c:/Users/sebas/.gemini/antigravity-ide/scratch/Gestion-SySO/src/app/%5Btenant-slug%5D/visitas/page.js)): Utiliza un estado `modalAlert` propio con textos e íconos locales en lugar del diálogo Radix UI.
   - `programa` ([programa/page.js](file:///c:/Users/sebas/.gemini/antigravity-ide/scratch/Gestion-SySO/src/app/%5Btenant-slug%5D/programa/page.js)): Igualmente utiliza un estado `modalAlert` inline para confirmar la salida.
3. **Módulos sin Control de Salida o Cierre Directo (Riesgo de Pérdida de Datos)**:
   - `matriz-riesgos`
   - `accidentes`
   - `control-electrico`
   - `extintores`
   - `checklist-personalizados`
   - `capacitacion`
   - `avisos`
   - `correctivas`
   - `empresas`
   - `equipo`
   - `nomina`

---

## 2. Mapa de Inconsistencias Detectadas

| Módulo / Sección | Archivo de Origen | Estado Actual de Salida | Implementa `AppUnsavedChangesDialog` | Riesgo de UX / Datos |
|---|---|---|:---:|:---:|
| **Visitas** | `visitas/page.js` | Modal custom inline (`modalAlert`) | ❌ No | Medio (Inconsistencia visual) |
| **Programa Anual** | `programa/page.js` | Modal custom inline (`modalAlert`) | ❌ No | Medio (Inconsistencia visual) |
| **Matriz Riesgos** | `matriz-riesgos/page.js` | Cierre directo o `window.confirm` | ❌ No | **Alto** (Pérdida de matriz extensa) |
| **Accidentes** | `accidentes/page.js` | Cierre directo | ❌ No | **Alto** (Pérdida de 5 porqués) |
| **Extintores** | `extintores/page.js` | Cierre directo | ❌ No | Medio |
| **Control Eléctrico**| `control-electrico/page.js` | Cierre directo | ❌ No | **Alto** (Pérdida de mediciones) |
| **Checklists** | `checklist-personalizados/page.js` | Cierre directo | ❌ No | Medio |
| **Capacitación** | `capacitacion/page.js` | Cierre directo | ❌ No | Medio |
| **Avisos de Riesgo** | `avisos/page.js` | Cierre directo | ❌ No | Medio |
| **Acciones Correctivas**| `correctivas/page.js` | Cierre directo | ❌ No | Medio |
| **Clientes / Empresas**| `empresas/page.js` | Cierre directo | ❌ No | Bajo |
| **Equipo Técnico** | `equipo/page.js` | Cierre directo | ❌ No | Bajo |
| **Nómina** | `nomina/page.js` | Cierre directo | ❌ No | Bajo |
| **Perfil** | `profile/page.js` | `<AppUnsavedChangesDialog />` | ✅ Sí | N/A (Estándar) |
| **Onboarding** | `onboarding/page.js` | `<AppUnsavedChangesDialog />` | ✅ Sí | N/A (Estándar) |
| **Iluminación** | `iluminacion/ProtocoloForm.js` | `<AppUnsavedChangesDialog />` | ✅ Sí | N/A (Estándar) |

---

## 3. Especificación del Estándar Único "Salir Sin Guardar"

Todo formulario de la aplicación (creación o edición) que contenga campos modificados (*dirty form state*) **debe implementar obligatoriamente el componente `<AppUnsavedChangesDialog />`** siguiendo el siguiente patrón de diseño:

### 3.1 Componente Estandarizado (`src/components/ui/AppUnsavedChangesDialog.js`)

```jsx
<AppUnsavedChangesDialog
  open={unsavedDialogOpen}
  onOpenChange={setUnsavedDialogOpen}
  title="Cambios sin guardar"
  description="Tenés cambios sin guardar en el formulario. Si salís ahora, perderás toda la información ingresada."
  onLeave={handleExecuteLeave}
  leaveText="Salir sin guardar"
  stayText="Quedarse y editar"
/>
```

### 3.2 Reglas de Interacción e Interfaz

1. **Botón Principal (Enfatizado / Foco)**: **`Quedarse y editar`** (Fondo Azul `#468DFF`, texto blanco). Cierra el diálogo y mantiene al usuario en el formulario con sus datos intactos.
2. **Botón Secundario (Acción de Salida)**: **`Salir sin guardar`** (Fondo blanco, borde y texto Azul `#468DFF`). Descarta los cambios, limpia el estado local del formulario y cierra el panel o redirige.
3. **Disparadores Obligatorios**:
   - Clic en el botón **`Salir`** o **`Cancelar`** del formulario.
   - Clic en la **`X`** de la cabecera superior del modal / panel.
   - Intento de navegación o retroceso si hay cambios sin guardar.
4. **Cero Alertas Nativas**: Queda **estrictamente prohibido** utilizar `window.confirm()`, `confirm()`, `alert()` o alertas HTML inline manuales para notificar cambios sin guardar.

---

## 4. Plan de Acción de Migración (Por Fases)

### Fase 1 — Estandarización en Módulos Complejos Prioritarios
1. **`visitas/page.js`**: Reemplazar la llamada a `setModalAlert({ title: 'Salir sin guardar' ... })` en `handleExitForm()` por el estado `unsavedDialogOpen` e instanciar `<AppUnsavedChangesDialog />`.
2. **`programa/page.js`**: Sustituir el `modalAlert` inline en `handleExitForm()` por `<AppUnsavedChangesDialog />`.
3. **`matriz-riesgos/page.js`**: Integrar la verificación `isFormDirty` e instanciar el diálogo al cerrar la edición de matriz.

### Fase 2 — Estandarización en Módulos de Inspecciones y Protocolos
1. **`accidentes/page.js`**: Proteger la salida del formulario de 5 porqués con `<AppUnsavedChangesDialog />`.
2. **`control-electrico/page.js`**: Proteger el formulario de control de instalaciones eléctricas.
3. **`extintores/page.js`**: Proteger la planilla de inventario y recarga de extintores.
4. **`checklist-personalizados/page.js`**: Proteger la edición de inspecciones personalizadas.

### Fase 3 — Estandarización en Módulos Restantes
1. **`avisos/page.js`**, **`capacitacion/page.js`**, **`correctivas/page.js`**.
2. **`empresas/page.js`**, **`equipo/page.js`**, **`nomina/page.js`**.

### Fase 4 — Validación de QA y Cobertura
1. Probar en todas las secciones el flujo: modificar un campo $\rightarrow$ hacer clic en "Salir" $\rightarrow$ verificar que aparezca el diálogo estándar $\rightarrow$ probar "Quedarse y editar" $\rightarrow$ probar "Salir sin guardar".
2. Registrar la intervención en `docs/BITACORA_DESARROLLO.md`.
