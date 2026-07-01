# ADR 0005: Incorporación del Módulo "Control Visual de Instalaciones Eléctricas" al Sistema SaaS

- **Estado**: Propuesto
- **Fecha**: 2026-06-30
- **Autores**: Antigravity Technical Setup Agent

---

## Contexto y Problema

El sistema de **Gestión SySO** requiere una nueva sección llamada **"Control Visual de Instalaciones Eléctricas"** que sirva para registrar inspecciones trimestrales de tableros, cableados, puestas a tierra e iluminación de emergencia de los clientes. La sección debe respetar las especificaciones visuales de la plataforma (estilo compacto **SySO Compact Layout**) y la carga de datos debe ser homóloga a la de la "Constancia de Visita" (con registro de firmas manuales o digitales y aclaración del responsable). El formulario de carga debe evaluar 15 ítems específicos con su respectivo estado ("Ok", "No Ok", "No aplica") y observaciones.

## Decisión

Se decide implementar la arquitectura de la sección de la siguiente manera:

1. **Estructura de Base de Datos y JSONB**: 
   - Para no saturar el esquema relacional con 30 columnas redundantes (15 para estados, 15 para observaciones), se decide almacenar la grilla de verificación de 15 ítems en una columna de tipo `JSONB` llamada `items` dentro de la tabla `public.control_electrico`.
   - El valor por defecto de esta columna será un arreglo con los 15 ítems estructurados listos para ser controlados.
2. **Seguridad Row Level Security (RLS)**:
   - Toda consulta a la tabla validará la pertenencia al tenant activo a través de la función `public.user_has_tenant_access(tenant_id)`.
   - Los usuarios con rol `cliente` solo podrán ver los registros que correspondan a su propia empresa (`empresa_id = public.get_current_user_empresa_id()`).
   - Las operaciones de escritura (`INSERT`, `UPDATE`, `DELETE`) estarán condicionadas mediante la validación del permiso granular `'control_electrico'` (ej: `public.user_has_action_permission('control_electrico', 'cargar')`).
3. **Firmas y Almacenamiento**:
   - Se utilizarán los componentes de firma manual en canvas de dibujo (utilizando Callback Refs en React para asegurar su ciclo de montaje dinámico) y firmas de perfil del profesional interviniente.
   - Las firmas manuales convertidas a imagen PNG se almacenarán en el bucket de almacenamiento multi-tenant `'documents'`.
4. **Diseño de Interfaz**:
   - El listado de registros y controles utilizará el estándar **SySO Compact Layout** con filtros responsivos y tabla con scroll local.
   - El formulario de creación/edición de datos utilizará las clases de altura limitada `max-h-[85vh]` y scroll local interno (`overflow-y-auto`) para no bloquear ni provocar scroll doble en el layout principal.

## Consecuencias

### Positivas
- **Eficiencia y Flexibilidad**: El almacenamiento mediante JSONB mantiene la base de datos esbelta, permitiendo añadir, remover o alterar los ítems del checklist en el futuro sin realizar costosas migraciones de alteración de tablas.
- **Consistencia Visual**: La homologación del flujo de firmas y el diseño del formulario respecto al módulo de visitas reduce la curva de aprendizaje para los inspectores y mantiene coherencia de marca.
- **Aislamiento Multi-tenant Robusto**: RLS a nivel de base de datos previene vulnerabilidades de tipo IDOR o exposición de registros entre empresas o tenants distintos.

### Desventajas/Mitigaciones
- **Búsquedas de Base de Datos sobre Ítems Específicos**: Almacenar los ítems en JSONB dificulta búsquedas indexadas y agregados rápidos (ej: "listar controles donde el ítem 5 sea No Ok") directamente en SQL nativo simple.
  - *Mitigación*: Se considera aceptable dado que el caso de uso primordial es la auditoría individual de la planilla. Si en el futuro se requieren métricas indexadas sobre fallas eléctricas recurrentes, se puede extraer mediante operadores JSONB de PostgreSQL (`items @>`) o crear un índice funcional indexando los valores fallidos.
