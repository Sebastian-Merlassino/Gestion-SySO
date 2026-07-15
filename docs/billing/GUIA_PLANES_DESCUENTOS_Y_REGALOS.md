# Guía de Administración: Planes, Descuentos y Membresías de Regalo

Esta guía detalla los métodos y procedimientos para administrar, simular y otorgar beneficios comerciales (descuentos o planes de regalo) a las organizaciones (tenants) del SaaS **Gestión SySO** utilizando la base de datos de Supabase.

---

## 1. Simulación y Cambio de Planes para Pruebas

Para probar las restricciones del Sidebar y las funcionalidades de cada sección, puedes modificar el `plan_id` de cualquier organización directamente en la tabla `tenants`.

### Valores del Plan y Acceso

| ID del Plan (`plan_id`) | Nombre Comercial | Secciones Habilitadas |
| :--- | :--- | :--- |
| **`free`** | Plan Gratis | Dashboard, Clientes, Equipo, Prog. Gestión Anual, Prog. Capacitación, Acciones Correctivas, Accidentes, Matriz de riesgos, Nómina de Personal, Perfil. |
| **`basic_5`** | Plan Básico | Todo lo de `free` + **Extintores** y **Control Eléctrico**. |
| **`standard_25`** | Plan Estándar | Todo lo de `basic_5` + **Constancia de Visita** y **Aviso de Riesgo**. |
| **`libre`** | Plan Full | **Acceso Total**: Todo lo de `standard_25` + **Checklist Personalizados** y **Legajo Técnico**. |

> [!IMPORTANT]
> **Pasos para simular el cambio de plan desde Supabase (Debido al trigger de seguridad):**
> Dado que la tabla `tenants` cuenta con un trigger de seguridad (`check_tenant_updates`) para evitar modificaciones maliciosas de planes desde el cliente, **no es posible utilizar el Table Editor de doble clic**. Debes usar obligatoriamente el **SQL Editor** de Supabase para ejecutar la consulta con privilegios de administrador (`postgres`):
> 1. Ve a **SQL Editor** en tu panel de control de Supabase.
> 2. Crea una nueva pestaña y ejecuta la siguiente consulta reemplazando el valor de `plan_id` (`free`, `basic_5`, `standard_25` o `libre`) y el `slug` según corresponda:
>    ```sql
>    UPDATE public.tenants
>    SET 
>      plan_id = 'libre', 
>      plan_ends_at = NULL, -- o una fecha futura como '2026-12-31 23:59:59+00'::timestamptz
>      preapproval_id = NULL
>    WHERE slug = 'sebastian-merlassino';
>    ```
> 3. Recarga tu aplicación local (`localhost:3000`).

---

## 2. Aplicar Ofertas y Descuentos en los Precios

El sistema tiene implementada una lógica de descuentos por porcentaje aplicables de forma temporal. Cuando un usuario va a realizar el pago en Mercado Pago, el backend calcula el precio con el descuento y genera el link de pago con el importe reducido.

### Campos en la tabla `tenants`
- **`discount_percentage`** *(numeric/int)*: Porcentaje de descuento a aplicar (ej: `20` para un 20% de descuento).
- **`discount_ends_at`** *(timestamp with time zone)*: Fecha límite de vigencia del descuento.

### Sentencia SQL para aplicar un descuento
Si quieres aplicar un **15% de descuento** a la organización `sebastian-merlassino` hasta el **31 de agosto de 2026**, ejecuta esta consulta en el **SQL Editor** de Supabase:

```sql
UPDATE public.tenants
SET 
  discount_percentage = 15,
  discount_ends_at = '2026-08-31 23:59:59+00'::timestamptz
WHERE slug = 'sebastian-merlassino';
```

> [!NOTE]
> Cuando el usuario intente contratar un plan mediante Mercado Pago, el backend descontará el porcentaje automáticamente. Si el descuento expira (la fecha actual supera a `discount_ends_at`), el cobro se generará al precio regular de forma automática.

---

## 3. Regalar Membresías / Promociones Activas (Gift Plans)

Si deseas dar acceso completo a un cliente de forma gratuita por un período de tiempo limitado (por ejemplo, otorgarles 30 días de "Plan Full" de cortesía), puedes utilizar la característica de **Gift Plans** sin afectar su suscripción base contratada.

### Campos en la tabla `tenants`
- **`gift_plan_id`** *(text)*: El plan de regalo que deseas otorgar (`basic_5`, `standard_25`, `libre`).
- **`gift_ends_at`** *(timestamp with time zone)*: Fecha de finalización del regalo.

### Lógica de evaluación
El sistema evalúa el plan efectivo en el siguiente orden de prioridad:
1. **Exención Global**: Si `is_exempt` es `true` -> Plan Full permanente.
2. **Plan de Regalo (Gift)**: Si `gift_plan_id` tiene un plan asignado y la fecha actual es anterior a `gift_ends_at` -> Se usa el plan de regalo.
3. **Suscripción Activa**: Si `plan_ends_at` es posterior a la fecha actual -> Se usa `plan_id`.
4. **Plan Gratis**: Si todo lo anterior falla o expira -> Cae por defecto a `free`.

### Sentencia SQL para regalar un Plan Full por 3 meses
Para regalar un **Plan Full** hasta el **15 de octubre de 2026**:

```sql
UPDATE public.tenants
SET 
  gift_plan_id = 'libre',
  gift_ends_at = '2026-10-15 23:59:59+00'::timestamptz
WHERE slug = 'sebastian-merlassino';
```

> [!IMPORTANT]
> Una vez llegada la fecha límite (`gift_ends_at`), la membresía de regalo expira y el usuario vuelve automáticamente a su plan de suscripción regular o al plan `free` si no tenía ninguna de pago activa, garantizando que no se queden sin servicio de forma brusca sino degradada.

---

## 4. Exenciones Permanentes (is_exempt)

Si tienes organizaciones asociadas a administradores del sistema, consultores principales o cuentas de prueba permanentes que no deben pagar nunca, puedes activar la exención.

### Campo en la tabla `tenants`
- **`is_exempt`** *(boolean)*: Si es `true`, la organización tendrá el "Plan Full" activo de manera perpetua e indefinida.

### Sentencia SQL para exención total
```sql
UPDATE public.tenants
SET is_exempt = true
WHERE slug = 'sebastian-merlassino';
```
