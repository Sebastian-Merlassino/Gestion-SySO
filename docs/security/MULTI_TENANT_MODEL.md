# Modelo de Seguridad Multi-tenant con Supabase RLS

Este documento describe la arquitectura y estrategia de seguridad multi-tenant adoptada en **Gestión SySO** para garantizar el aislamiento absoluto de los datos de cada organización cliente.

---

## 1. Estrategia Logística de Aislamiento
Adoptamos una estrategia de **Base de Datos Compartida con Esquema Compartido**. Cada tabla de datos contiene una columna `tenant_id` que asocia los registros con una empresa específica.
Para evitar filtraciones accidentales de información por errores en las consultas de la aplicación backend o frontend, delegamos el aislamiento a la base de datos a través de **Row Level Security (RLS)** de PostgreSQL en Supabase.

---

## 2. Funcionamiento de Row Level Security (RLS)
Cuando RLS está habilitado en una tabla, Postgres intercepta cada consulta y le aplica automáticamente políticas condicionales adicionales basadas en el rol o la identidad de la sesión autenticada.

### Obtención del `tenant_id` del Usuario
Para saber a qué tenant pertenece el usuario logueado en la sesión de Supabase, creamos una función auxiliar de base de datos SQL (`get_current_tenant_id()`) que busca el tenant del perfil asociado al usuario autenticado (`auth.uid()`).

```sql
CREATE OR REPLACE FUNCTION public.get_current_tenant_id()
RETURNS uuid AS $$
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;
```

---

## 3. Políticas de RLS por Defecto

### Tabla `tenants`
- **Lectura (SELECT)**: Permitida solo si el usuario pertenece al tenant.
  ```sql
  CREATE POLICY tenant_select_policy ON public.tenants
    FOR SELECT USING (id = public.get_current_tenant_id());
  ```
- **Modificación (UPDATE)**: Permitida solo para usuarios con el rol de administradores (`admin` o `owner`) en ese tenant.

### Tablas Operativas (ej: `audits`, `incidents`, `employees`)
Cada consulta que se realice en estas tablas obligatoriamente filtrará por el `tenant_id` del usuario activo en la sesión.
- **Lectura/Escritura/Modificación**:
  ```sql
  CREATE POLICY audit_tenant_isolation ON public.audits
    FOR ALL USING (tenant_id = public.get_current_tenant_id());
  ```

---

## 4. Ventajas Clave de esta Arquitectura
1. **Seguridad Centralizada**: La regla de seguridad se escribe una sola vez en la base de datos. Si un desarrollador olvida filtrar por `tenant_id` en una consulta de Next.js, Postgres aplica el filtro automáticamente de fondo. El desarrollador no puede acceder a datos de otros tenants por accidente.
2. **Eficiencia en Costos**: No requiere levantar bases de datos independientes por cliente en fases iniciales, reduciendo costos de infraestructura.
3. **Escalabilidad**: Soporta millones de registros utilizando índices de Postgres estructurados por `(tenant_id, id)`.
