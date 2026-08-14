# Auditoría de Escalabilidad, Rendimiento y Concurrencia — Gestión SySO

**Fecha:** 14 de Agosto de 2026  
**Proyecto:** SaaS Gestión SySO (Seguridad y Salud Ocupacional)  
**Autor:** Arquitecto Cloud Senior, Especialista en Performance & DBA  
**Estado:** Finalizado — Diagnóstico y Análisis Estático  

---

## 1. Resumen Ejecutivo

Se ha llevado a cabo una auditoría profunda, predictiva y exhaustiva sobre la arquitectura técnica, base de datos PostgreSQL en Supabase, infraestructura Serverless en Vercel (Next.js App Router) y código fuente del SaaS **Gestión SySO**.

El objetivo principal de esta auditoría es evaluar el comportamiento del sistema ante un crecimiento masivo en el número de organizaciones (*tenants*) y usuarios operando en simultáneo, identificando cuellos de botella, riesgos de caída de la aplicación, agotamiento de recursos y problemas de concurrencia.

### Diagnóstico General y Principales Puntos de Quiebre (Breaking Points)

El diseño conceptual y funcional del SaaS es sólido y cumple con altos estándares de seguridad multi-tenant. Sin embargo, la infraestructura y la capa de acceso a datos actual presentan **5 cuellos de botella críticos** que impedirían al sistema escalar a un nivel empresarial masivo (cientos o miles de empresas):

1. **Agotamiento de Conexiones por Middleware Ineficiente:** El middleware de Next.js (`src/middleware.js`) intercepta cada solicitud HTTP (excepto assets estáticos) y realiza **dos consultas síncronas de red** (una a Supabase Auth via `auth.getUser()` y una consulta SQL a la base de datos a `profiles` JOIN `tenants`). Bajo una carga de 1,000 usuarios concurrentes, el middleware por sí solo genera **2,000 peticiones/segundo** a Supabase Auth y Postgres antes de ejecutar el código de la página o API, causando congelamiento de puertos y errores HTTP 503 (`upstream connect error / delayed connect error 111`).
2. **Escaneos Secuenciales Masivos (Falta de Índices en BD):** De las 97 migraciones de base de datos analizadas, **solo 2 tablas** (`capacitaciones_online` y `geografia`) cuentan con índices explícitos. Las más de 20 tablas operativas principales (`visitas`, `extintores`, `empresas`, `establecimientos`, `accidentes`, `nomina_personal`, `control_electrico`, `avisos_riesgo`, `protocolos`, etc.) **carecen por completo de índices en `tenant_id` y claves foráneas**. Con tablas de decenas de miles de registros, Postgres se ve obligado a realizar *Sequential Scans* completos en cada consulta.
3. **Subconsultas Recursivas en RLS (Row Level Security):** La función de seguridad multi-tenant `user_has_tenant_access(p_tenant_id)` es evaluada por Postgres en **cada fila escaneada** de cada consulta. Al no estar declarada como `STABLE` y realizar subconsultas internas a `profiles` y `miembros_equipo`, el número de ejecuciones SQL se multiplica exponencialmente por el número de filas de la tabla ($N \times M$).
4. **Ausencia Total de Paginación en el Servidor (Server-Side Pagination):** El 100% de los módulos de la aplicación utilizan la instrucción `.select('*')` sin límites (`.range()`), trayendo colecciones completas a la memoria del cliente y de las Serverless Functions de Vercel. Un tenant con 50,000 extintores o 200,000 registros causará desbordamientos de memoria (*Out of Memory - OOM*), respuestas HTTP 504 (Timeout) y colapsos en las pestañas del navegador.
5. **Operaciones Pesadas Síncronas en Funciones Serverless:** La generación de PDFs complejos con imágenes en Base64, la descarga y subida de archivos pesados desde URLs externas (`/api/upload-from-url`), el refinamiento de textos vía IA (`/api/ai/refine-text`) y el despacho de correos SMTP (`/api/send-email`) se ejecutan síncronamente dentro del ciclo de vida de las Serverless Functions de Vercel. Estas operaciones corren el riesgo inminente de superar el tiempo límite de ejecución (*Timeout* de 10s - 60s en Vercel), resultando en errores 504 Gateway Timeout.

---

## 2. Análisis de Base de Datos y Supabase

### 2.1 Estado del Connection Pooling
- **Situación Actual:** La aplicación interactúa con Supabase mediante los SDKs `@supabase/supabase-js` y `@supabase/ssr`, los cuales consumen la API REST de PostgREST sobre HTTP (puerto 443). PostgREST mantiene un *connection pool* interno hacia PostgreSQL.
- **Riesgo bajo Alta Concurrencia:** En los planes estándar o gratuitos de Supabase Cloud, el pool de conexiones de PostgREST está limitado (típicamente entre 10 y 20 conexiones simultáneas por nodo).
- **Evidencia Empírica de Fallo:** La bitácora del proyecto (`docs/BITACORA_DESARROLLO.md`) ya registra eventos de micro-caídas con código `HTTP 503 (Service Unavailable)` y mensajes de error `upstream connect error or disconnect/reset before headers ... delayed connect error: 111`. Esto confirma que, bajo picos de concurrencia o checkpoints de la base de datos, los proxies Envoy/Kong y PostgREST agotan sus sockets TCP disponibles (`ECONNREFUSED`).
- **Diagnóstico:** Si 1,000 usuarios realizan peticiones simultáneas a Next.js, las llamadas síncronas provenientes del middleware y de los componentes colapsarán instantáneamente la cola de conexiones de PostgREST si no se utiliza un *pooler* de transacciones como Supavisor o PgBouncer (puerto 6543).

### 2.2 Eficiencia y Riesgos del RLS (Row Level Security)
- **Definición de la Función RLS:**
  ```sql
  CREATE OR REPLACE FUNCTION public.user_has_tenant_access(p_tenant_id UUID)
  RETURNS BOOLEAN AS $$
  BEGIN
      RETURN (
          EXISTS (
              SELECT 1 FROM public.profiles 
              WHERE id = auth.uid() AND tenant_id = p_tenant_id
          )
          OR
          EXISTS (
              SELECT 1 FROM public.miembros_equipo 
              WHERE (profile_id = auth.uid() OR email = (SELECT email FROM public.profiles WHERE id = auth.uid())) 
                AND tenant_id = p_tenant_id 
                AND tiene_acceso = true
          )
      );
  END;
  $$ LANGUAGE plpgsql SECURITY DEFINER;
  ```
- **Evaluación de Rendimiento:**
  - **Falta de Volatilidad Especificada:** La función se creó sin la palabra clave `STABLE` o `IMMUTABLE`. Por defecto, PostgreSQL la trata como `VOLATILE`, lo que **impide que el planificador de consultas optimice o almacene en caché** el resultado dentro de una misma transacción SQL.
  - **Multiplicación de Subconsultas:** Cada política RLS (ej: `CREATE POLICY extintores_tenant_isolation ON public.extintores FOR ALL USING (public.user_has_tenant_access(tenant_id))`) invoca `user_has_tenant_access(tenant_id)` por **cada registro escaneado** en la tabla. Si una consulta debe evaluar 10,000 registros, Postgres ejecutará hasta 20,000 subconsultas adicionales contra las tablas `profiles` y `miembros_equipo`.

### 2.3 Índices y Estructura SQL
- **Auditoría de Índices:** Se revisaron las 97 migraciones contenidas en `supabase/migrations/`.
- **Hallazgo Crítico:** **El 95% de las tablas carece de índices explícitos.** Las claves foráneas en PostgreSQL **no crean índices automáticamente**.
- **Tablas Operativas Vulnerables sin Índice en `tenant_id` o FKs:**
  - `audits` (sin índice en `tenant_id`, `created_by`)
  - `profiles` (sin índice en `tenant_id`)
  - `empresas` (sin índice en `tenant_id`)
  - `establecimientos` (sin índice en `tenant_id`, `empresa_id`)
  - `miembros_equipo` (sin índice en `tenant_id`, `profile_id`, `email`)
  - `matriculas` (sin índice en `profile_id`, `miembro_id`)
  - `programa_anual` (sin índice en `tenant_id`)
  - `acciones_correctivas` (sin índice en `tenant_id`)
  - `extintores` (sin índice en `tenant_id`, `establecimiento_id`)
  - `visitas` (sin índice en `tenant_id`)
  - `avisos_riesgo` (sin índice en `tenant_id`)
  - `registros` (sin índice en `tenant_id`)
  - `legajo_tecnico` (sin índice en `tenant_id`)
  - `nomina_personal` (sin índice en `tenant_id`, `establecimiento_id`)
  - `accidentes` (sin índice en `tenant_id`, `empresa_id`)
  - `matriz_riesgos` (sin índice en `tenant_id`)
  - `control_electrico` (sin índice en `tenant_id`)
  - `checklist_personalizados` (sin índice en `tenant_id`)
  - `pagos_procesados` (sin índice en `payment_id`, `tenant_id`)
  - `protocolo_iluminacion` (sin índice en `tenant_id`)
  - `protocolo_ruido` (sin índice en `tenant_id`)
  - `protocolo_ergonomia` (sin índice en `tenant_id`)
- **Impacto:** Cualquier consulta filtrada por `tenant_id` en una tabla con miles de filas provocará un *Sequential Scan* completo, consumiendo CPU e I/O de la base de datos de forma desmedida.

### 2.4 Consultas N+1 Detectadas en el Código Backend / Client
- **`src/app/[tenant-slug]/empresas/page.js` (Líneas 983-998):**
  Al cargar los establecimientos de una empresa (`mappedEsts`), se ejecuta una iteración `.map(async (est) => ...)` que llama repetidamente a la función `fetchAllGeography(est.provincia)` y `fetchAllGeography(est.provincia, est.partido)` por **cada establecimiento**. Si una empresa posee 20 establecimientos, se realizan **40 consultas SQL/REST en paralelo** a la tabla `geografia`.
- **`src/app/[tenant-slug]/avisos/page.js` (Líneas 1155-1174):**
  Al preparar el reporte PDF, la función `resolvedFindings` realiza un mapa asíncrono (`findings.map(async (f) => ...)`), descargando y redimensionando en Canvas la imagen de cada hallazgo de forma individual.
- **`src/app/[tenant-slug]/equipo/page.js` y `profile/page.js`:**
  Se realizan mapeos asíncronos iterativos para resolver las matrículas de cada miembro del equipo una por una.

### 2.5 Paginación Masiva
- **Diagnóstico:** Se constató mediante análisis estático que **ningún módulo de la aplicación utiliza paginación en el servidor** (`.range(from, to)`).
- **Antipatrón:** Las consultas ejecutan `.select('*')` trayendo todos los registros del tenant a la memoria de la aplicación. Bajo carga masiva, esto provocará saturación de ancho de banda entre Supabase y Vercel, alto uso de RAM en Vercel Serverless Functions y bloqueos en el navegador del usuario.

---

## 3. Análisis de Infraestructura Serverless (Vercel & Next.js)

### 3.1 Endpoints y Server Actions en Riesgo Crítico de Timeouts y OOM
- **Límites de Vercel:** 10 segundos en plan Hobby, 15 segundos en plan Pro, hasta 60 segundos en plan Enterprise.
- **Endpoints Vulnerables a Timeouts (HTTP 504):**
  1. `src/app/api/send-email/route.js`: Descarga el archivo PDF desde Supabase Storage, descarga/convierte el logo a Base64, construye el cuerpo MIME HTML y envía el correo síncronamente vía SMTP mediante Nodemailer. Si la conexión SMTP o el storage sufren latencia, la Serverless Function excederá el límite de ejecución.
  2. `src/app/api/upload-from-url/route.js`: Descarga archivos PDF/Presentaciones de Google Drive de hasta 10 MB mediante *streams*, resuelve páginas de confirmación HTML de Google, convalida la firma mágica del PDF en memoria y re-sube el archivo a Supabase Storage. Un archivo de 10 MB bajo redes lentas provocará un Timeout seguro.
  3. `src/app/api/ai/refine-text/route.js`: Utiliza la librería `callGemini`, la cual itera síncronamente en un bucle por un pool de 9 modelos de Gemini con un tiempo de espera de 1 segundo (`setTimeout(1000)`) entre reintentos ante errores 429/503. Si varios modelos rebotan, la función tardará más de 15 segundos y Vercel cortará la ejecución.

### 3.2 Evaluación de Límites de Payload (4.5 MB)
- **Límite de Vercel:** Vercel impone un límite estricto de **4.5 MB** para el cuerpo de peticiones y respuestas en Serverless Functions.
- **Riesgos Detectados:**
  - Si un usuario envía un correo con un PDF adjunto o logo en Base64 que supere los 4.5 MB hacia `/api/send-email`, Vercel rechazará la solicitud inmediatamente con un error `413 Payload Too Large`.
  - Subir evidencias fotográficas de inspecciones enviando cadenas Base64 o `FormData` a través de API Routes de Next.js en lugar de subir directamente desde el navegador a Supabase Storage mediante URLs firmadas (*Presigned URLs*) viola la mejor práctica serverless.

### 3.3 Cuello de Botella en Middleware (`src/middleware.js`)
- **Funcionamiento Actual:**
  1. En **cada petición HTTP** que no sea asset estático, ejecuta `const { data: { user } } = await supabase.auth.getUser()`. Esto requiere una llamada HTTP/gRPC saliente hacia Supabase Auth (GoTrue API).
  2. Si el usuario está autenticado, ejecuta:
     ```javascript
     const { data: profile } = await supabase
       .from('profiles')
       .select('tenant_id, role, tenants(slug, plan_id, plan_ends_at, is_exempt, gift_plan_id, gift_ends_at)')
       .eq('id', user.id)
       .single();
     ```
     Esto ejecuta una consulta SQL con `JOIN` a la base de datos PostgreSQL.
- **Impacto Masivo:** El middleware no almacena en caché la sesión ni el perfil en la galleta criptográfica (cookie) o en Edge Memory. Por lo tanto, si una página realiza 5 llamadas a recursos o navegaciones de rutas, la base de datos recibe 5 consultas identicas de perfil instantáneamente. Bajo 1,000 usuarios navegando, el middleware satura las conexiones de PostgreSQL por sí solo.

### 3.4 Diagnóstico de la Estrategia de Caché
- **Renderizado Dinámico Excesivo:** La presencia de `export const dynamic = 'force-dynamic'` en rutas API e interfaces deshabilita la caché Edge de Vercel, obligando a re-evaluar la lógica del servidor en cada petición.
- **Sin Caché para Diccionarios Estáticos:** Tablas de referencia como `geografia` (decenas de miles de filas con provincias y localidades de Argentina), `actividades_economicas` (códigos CIIU) y `temas_capacitacion` son consultadas repetidamente a PostgreSQL en lugar de ser consolidadas mediante Incremental Static Regeneration (ISR) o caché SWR/Redis.

---

## 4. Análisis de Concurrencia y Múltiples Peticiones

### 4.1 Resiliencia ante Picos de Login Masivo
- **Escenario:** 2,000 técnicos de diferentes empresas inician sesión a las 8:00 AM para comenzar la jornada laboral.
- **Comportamiento Pronosticado:**
  1. La API de autenticación de Supabase (`/auth/v1/token`) recibirá un pico sostenido de 2,000 solicitudes en pocos minutos.
  2. Cada login exitoso redirige al dashboard `/[tenant-slug]/dashboard`, disparando la ejecución del middleware (1 Auth check + 1 DB query) más las consultas iniciales del dashboard (resumen de vencimientos, tareas pendientes, contadores de inspecciones y gráficos de siniestralidad).
  3. **Resultado:** Congelamiento de las respuestas de Supabase, errores HTTP 503 por agotamiento de conexiones de PostgREST y retrasos en la carga del panel superior a los 10 segundos.

### 4.2 Evaluación de Condiciones de Carrera (Race Conditions)
- **Procesamiento de Pagos en Webhook (`src/app/api/webhooks/mercadopago/route.js`):**
  La verificación de idempotencia se realiza consultando la tabla `pagos_procesados` mediante un `select`:
  ```javascript
  const { data: existingPayment } = await adminClient
    .from('pagos_procesados')
    .select('id')
    .eq('payment_id', String(dataId))
    .maybeSingle();
  ```
  Si Mercado Pago envía dos notificaciones HTTP simultáneas (reintentos o picos concurrentes), ambas ejecutan el `select` al mismo milisegundo, determinan que el pago no existe, e intentan insertar la acreditación dos veces. Si la columna `payment_id` no cuenta con una restricción de unicidad (`UNIQUE CONSTRAINT`) a nivel de base de datos, se duplicará la acreditación de días del plan.
- **Guardado de Formularios Operativos:** No existen mecanismos de *Optimistic Locking* (como columnas `version` o timestamps de modificación) en tablas críticas (`visitas`, `accidentes`, `extintores`). Si dos inspectores editan el mismo informe simultáneamente, la última escritura sobrescribirá silenciosamente la primera.

### 4.3 Impacto del Problema "Noisy Neighbor" (Vecino Ruidoso)
- **Arquitectura:** SaaS Multi-tenant con esquema compartido (*Single Database, Shared Schema*).
- **Riesgo:** Si un **Tenant A** realiza un proceso masivo (ej: importar 10,000 extintores desde Excel o generar 100 reportes PDF simultáneos), consumirá la CPU, I/O de disco y pool de conexiones de la única base de datos PostgreSQL.
- **Consecuencia:** Los **Tenants B, C y D** experimentarán lentitud extrema o errores HTTP 503 en sus dashboards, a pesar de estar realizando operaciones livianas.

### 4.4 Estado de Defensas Rate Limiting
- **Implementación Actual (`src/lib/rateLimit.js`):** Cuenta con integración para Upstash Redis REST utilizando un pipeline HTTP (`INCR`, `TTL`, `EXPIRE`).
- **Punto Débil:** Si las variables `UPSTASH_REDIS_REST_URL` y `UPSTASH_REDIS_REST_TOKEN` no están configuradas en el entorno, el sistema cae en un *fallback* en memoria local (`new Map()`).
- **Fallo en Serverless:** En Vercel, cada función Serverless se ejecuta en una instancia aislada e efímera. El almacenamiento en memoria local `Map()` **no se comparte entre instancias**, por lo que un atacante puede eludir el Rate Limiting simplemente enviando peticiones que caigan en distintas instancias del clúster de Vercel.

---

## 5. Procesos Asíncronos, Pagos y Webhooks

### 5.1 Nivel de Idempotencia en Pagos (Mercado Pago)
- **Fortalezas:**
  - Verificación estricta de firma digital HMAC-SHA256 mediante `x-signature` y `x-request-id` usando `crypto.timingSafeEqual`.
  - Manejo diferenciado de eventos `preapproval` (suscripciones recurrentes) y `payment` (cobros individuales).
  - Cálculo de prorrateo por cambio de plan y cancelación de suscripciones anteriores en la API de Mercado Pago.
- **Vulnerabilidad de Concurrencia:** Como se detalló en la sección 4.2, la validación de idempotencia depende de una lectura previa por software (`select`) en lugar de una restricción atómica en PostgreSQL (`INSERT ... ON CONFLICT DO NOTHING`).

### 5.2 Riesgos de Latencia en Módulo IA y SMTP
- **Procesamiento Síncrono:** Tanto el refinamiento de texto con Gemini (`/api/ai/refine-text`) como la distribución de correos con Nodemailer (`/api/send-email`) retienen la conexión HTTP abierta mientras esperan respuesta de las APIs externas.
- **Riesgo de Saturación:** Si el servicio SMTP de Gmail/Custom Mail o la API de Gemini aumentan su latencia (ej: 5 a 10 segundos por llamada), los workers de Vercel quedarán bloqueados esperando la respuesta, agotando la cuota de concurrencia de la cuenta de Vercel.

### 5.3 Necesidad de Colas Asíncronas (Background Jobs)
Actualmente el sistema **carece de un motor de colas de tareas en segundo plano**. Operaciones pesadas como:
- Compilación y despacho por email de reportes PDF masivos,
- Refinamiento de texto técnico por IA,
- Procesamiento batch de webhooks de Mercado Pago,
deben desacoplarse del hilo HTTP principal mediante colas de mensajes (ej. Upstash QStash, Inngest o Trigger.dev).

---

## 6. Resultados de Simulación de Escenarios de Estrés

A continuación se presentan los resultados predictivos y el pronóstico de fallas analíticas para los 4 escenarios de estrés definidos:

```
+---------------------------------------------------------------------------------------------------------+
| SIMULACIÓN ANALÍTICA DE ESCENARIOS DE ESTRÉS                                                             |
+------------------------------------+------------------------------------+-------------------------------+
| Escenario                          | Comportamiento Pronosticado         | Punto de Quiebre / Falla      |
+------------------------------------+------------------------------------+-------------------------------+
| 1. Pico Matutino                   | 2,000 usuarios / 50 empresas       | HTTP 503 Service Unavailable  |
|    (8:00 AM, 3 minutos window)     | 4,000 queries/min desde Middleware | PostgREST Connection Exhaust  |
|                                    | 100% Seq Scans en Dashboard        | Latencia de carga > 12 seg.   |
+------------------------------------+------------------------------------+-------------------------------+
| 2. Cierre de Mes                   | 500 descargas simultáneas de PDFs  | HTTP 504 Gateway Timeout      |
|    (Reportes PDF masivos)          | Procesamiento de imágenes Base64   | Colapso de memoria RAM cliente|
|                                    | en memoria del navegador/Vercel    | Vercel Payload Limit (4.5 MB) |
+------------------------------------+------------------------------------+-------------------------------+
| 3. Facturación Masiva              | 1,000 webhooks en 10 segundos      | Race condition en DB Insert   |
|    (Webhooks de Mercado Pago)      | Reintentos masivos desde MP        | Exceso de concurrencia Vercel |
|                                    | Consultas simultáneas a MP API     | Throttling en API de MP       |
+------------------------------------+------------------------------------+-------------------------------+
| 4. El Tenant Gigante               | 1 consulta `SELECT *`              | HTTP 504 Timeout / Vercel OOM |
|    (50,000 extintores /            | 50,000 ejecuciones de RLS          | Cuelgue de pestaña de cliente |
|    200,000 capacitaciones)         | Carga de 25+ MB de JSON en memoria | Consumo de CPU Postgres al 100%|
+------------------------------------+------------------------------------+-------------------------------+
```

---

## 7. Plan de Remediación y Optimización Arquitectónica

Para garantizar que **Gestión SySO** pueda escalar a miles de empresas de manera fluida y resiliente, se establece la siguiente hoja de ruta priorizada. *(Nota: De acuerdo con la regla estricta de esta fase, esta sección constituye un diseño de arquitectura y no representa cambios aplicados en el código).*

```mermaid
flowchart TD
    subgraph Fase 1 [Fase 1: Crítica - Corto Plazo]
        A1[Habilitar Transaction Pooler 6543 Supavisor/PgBouncer]
        A2[Optimizar Middleware: Cachear Sesión y Perfil en Cookie/JWT]
        A3[Agregar UNIQUE Constraint en pagos_procesados.payment_id]
        A4[Exigir Upstash Redis en Producción para Rate Limit]
    end

    subgraph Fase 2 [Fase 2: Refactor Medio - Mediano Plazo]
        B1[Crear Índices Compuestos SQL en tenant_id y Foreign Keys]
        B2[Optimizar RLS: Declarar STABLE y simplificar subconsultas]
        B3[Implementar Paginación Servidora .range en todos los módulos]
        B4[Cargar Evidencias vía Presigned URLs a Supabase Storage]
        B5[Caché ISR/SWR para diccionarios estáticos Geografia/CIIU]
    end

    subgraph Fase 3 [Fase 3: Alta Escala - Largo Plazo]
        C1[Implementar Colas Asíncronas Upstash QStash / Inngest]
        C2[Desacoplar Generación de PDFs y Envíos SMTP a Background Jobs]
        C3[Caché Redis Global para Permisos y Suscripciones]
        C4[Evaluación de Read Replicas / Partitioning para Tenants Gigantes]
    end

    Fase 1 --> Fase 2 --> Fase 3
```

### Fase 1 — Crítica (Corto Plazo)
*Objetivo: Eliminar riesgos inminentes de caída de la aplicación y pérdidas financieras.*

1. **Configuración de Connection Pooling:**
   - Conectar la aplicación al puerto `6543` (Supavisor / PgBouncer en modo *Transaction Pooling*) de Supabase en lugar del puerto directo o REST no optimizado para Serverless.
2. **Inmunización del Middleware (`src/middleware.js`):**
   - Refactorizar la estrategia del middleware para verificar el token JWT criptográficamente sin realizar llamadas de red a Supabase Auth en cada solicitud.
   - Almacenar el `tenant_id` y el `slug` dentro de las *claims* del JWT o en una cookie firmada, eliminando las consultas SQL a `profiles` y `tenants` por cada click de navegación.
3. **Idempotencia Atómica en Webhooks de Pagos:**
   - Aplicar una restricción `ALTER TABLE public.pagos_procesados ADD CONSTRAINT unique_payment_id UNIQUE (payment_id);`.
   - Modificar el webhook para utilizar `INSERT ... ON CONFLICT (payment_id) DO NOTHING`, garantizando idempotencia a nivel de motor SQL sin depender de lecturas previas por software.
4. **Protección de Rate Limit Obligatoria:**
   - Asegurar el aprovisionamiento de Upstash Redis en los entornos de Staging y Producción para evitar que el Rate Limit caiga en la memoria local `Map()` ineficiente de Vercel.

---

### Fase 2 — Refactor Medio (Mediano Plazo)
*Objetivo: Optimizar el rendimiento de la base de datos y la velocidad de carga UI.*

1. **Estrategia de Indexación SQL:**
   - Crear índices compuestoss en las 20+ tablas principales. Ejemplo:
     ```sql
     CREATE INDEX idx_visitas_tenant_id ON public.visitas(tenant_id);
     CREATE INDEX idx_extintores_tenant_estab ON public.extintores(tenant_id, establecimiento_id);
     CREATE INDEX idx_accidentes_tenant_emp ON public.accidentes(tenant_id, empresa_id);
     CREATE INDEX idx_establecimientos_empresa ON public.establecimientos(empresa_id);
     CREATE INDEX idx_miembros_equipo_profile ON public.miembros_equipo(profile_id);
     ```
2. **Optimización de Funciones RLS:**
   - Declarar la función `user_has_tenant_access` como `STABLE` para permitir la reutilización del resultado durante el escaneo de una consulta SQL:
     ```sql
     CREATE OR REPLACE FUNCTION public.user_has_tenant_access(p_tenant_id UUID)
     RETURNS BOOLEAN AS $$ ... $$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
     ```
3. **Implementación de Paginación en Servidor (Server-Side Pagination):**
   - Incorporar parámetros de paginación (`page = 1`, `pageSize = 50`) en todas las Server Actions y consultas del frontend, utilizando `.range(from, to)` de Supabase.
4. **Subida Directa de Archivos (Direct Storage Uploads):**
   - Reemplazar las subidas de imágenes y evidencias a través de rutas API de Next.js (`POST FormData` o Base64) por subidas directas desde el cliente a Supabase Storage mediante el SDK o URLs pre-firmadas, derivando la transferencia pesada fuera de Vercel y eliminando el límite de 4.5 MB.
5. **Caché de Datos Estáticos:**
   - Implementar caché estático (ISR o SWR) para la tabla `geografia` y `actividades_economicas`, evitando consultas redundantes a la base de datos en la gestión de establecimientos.

---

### Fase 3 — Alta Escala (Largo Plazo)
*Objetivo: Arquitectura de alto rendimiento para miles de tenants y procesamiento pesado asíncrono.*

1. **Implementación de Background Workers / Queue Processing:**
   - Integrar un sistema de colas Serverless (como Upstash QStash, Inngest o Trigger.dev).
   - El endpoint `/api/send-email` y la generación de PDFs masivos en Cierre de Mes se encolarán como tareas asíncronas en segundo plano. El servidor responderá `HTTP 202 Accepted` de inmediato, evitando bloqueos HTTP y timeouts.
2. **Desacoplamiento del Procesamiento de IA:**
   - El refinamiento de texto con Gemini se procesará de forma asíncrona o mediante *streaming* (`response.body` stream) para mejorar la percepción de velocidad en el usuario.
3. **Caché Redis Global de Sesiones y Permisos:**
   - Implementar una capa de caché Redis para almacenar los roles, permisos granulares y estados de suscripción de los usuarios activos, reduciendo a cero la carga de lectura en PostgreSQL para la capa de autorización.
4. **Aislamiento para "Tenants Gigantes":**
   - Evaluar la implementación de réplicas de lectura (*Read Replicas*) o particionado de tablas PostgreSQL (*Table Partitioning* por `tenant_id`) si una organización supera los 500,000 registros operativos.

---

## 8. Conclusión

El SaaS **Gestión SySO** cuenta con las bases funcionales y de seguridad multi-tenant necesarias para el mercado corporativo. La aplicación de este **Plan de Remediación** en sus tres fases inmunizará al sistema contra caídas, optimizará los costos de infraestructura en Vercel y Supabase, y garantizará una experiencia de usuario fluida y de alta disponibilidad sin importar el volumen de datos cargado.
