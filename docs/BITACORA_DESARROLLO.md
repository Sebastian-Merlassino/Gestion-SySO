# Bitácora de Desarrollo - Gestión SySO

Este documento registra las decisiones técnicas, cambios de arquitectura y progresos del proyecto de manera cronológica.

---

## [2026-06-12] Ajuste de Políticas de RLS, Ventanas Emergentes, Remoción de Logo, Intercepción de Correos Duplicados y Corrección de Middleware

### Resumen de Cambios
- **Corrección Crítica de Middleware y Cookies**: Se solucionó el bug que causaba un bucle de redirección en `/login` al no persistir o leer correctamente la sesión del usuario. Se detectó que el middleware (`src/middleware.js`) utilizaba los métodos `getAll()` y `setAll()` de `@supabase/ssr`, los cuales no eran compatibles con la versión instalada en el proyecto (`^0.3.0`), la cual utiliza los métodos específicos `get(name)`, `set(name, value, options)` y `remove(name, options)`. 
- **Decodificación de Cookies en Middleware**: Se implementó la decodificación explícita de cookies usando `decodeURIComponent` dentro del método `get` de `createServerClient`. Al estar codificadas en formato URL por el navegador, la versión anterior de la librería de Supabase no lograba parsear el JSON de sesión, arrojando el error `Auth session missing!` y redirigiendo de vuelta a `/login`.
- **Corrección de RLS en Creación de Tenant**: Se resolvió el error de violación de RLS en la tabla `tenants` al guardar. Se detectó que el método `.select()` de Supabase gatillaba la política de SELECT, la cual requería de forma restrictiva que el perfil tuviera un `tenant_id` ya asignado (problema de huevo o gallina). Se ajustó la política `tenant_isolation_select` de `tenants` para permitir lectura pública (`USING (true)`), manteniendo las de creación (autenticado) y modificación (propietario) seguras.
- **Ventanas Emergentes en toda la App**: Se migraron todas las notificaciones flotantes tipo Toast (esquina inferior derecha) y alertas de error inline en Onboarding (`onboarding/page.js`), Edición de Perfil (`profile/page.js`) y Registro (`register/page.js`) a **Ventanas Emergentes Modales Centradas** en pantalla con difuminado de fondo (`backdrop-blur-sm`), cumpliendo con el requerimiento estricto del usuario.
- **Remoción del Logo "S" en Login y Registro**: Se retiró el isotipo circular decorativo "S" de la cabecera en las pantallas de Login (`login/page.js`) y Registro (`register/page.js`).
- **Intercepción de Correo Duplicado**: Se implementó una verificación de duplicados de correo en el Registro basada en la propiedad `identities` devuelta por `supabase.auth.signUp`. Esto previene el comportamiento de "simulación exitosa" estándar de Supabase y despliega una ventana emergente modal clara de error si el correo ya está registrado.
- **Política RLS Autocentrada de Perfiles**: Se agregó la política `profile_self_select` para permitir a cualquier usuario autenticado ver su propio perfil independientemente de su estado de onboarding.
- **Inicio de Servidor de Desarrollo**: Se inició el servidor Next.js en el puerto 3000 usando `npm.cmd run dev:next` en segundo plano para mitigar restricciones de PowerShell.

### Decisiones Clave
- **Esquema de Lectura Pública de Tenants**: Permitir SELECT libre en la tabla `tenants` es estándar y necesario para flujos de login por subdominio/slug y logos públicos. La seguridad operativa sigue garantizada dado que las tablas con información sensible (`empresas`, `audits`, etc.) permanecen con aislamiento estricto por `tenant_id`.

### Skills Utilizadas
- `gestion-syso-bitacora`
- `gestion-syso-multitenant-security`
- `next-best-practices`

### Archivos Modificados / Creados
- `[NEW] supabase/migrations/20260612000000_add_profile_self_select.sql`
- `[NEW] supabase/migrations/20260612010000_adjust_tenant_select_policy.sql`
- `[MODIFY] src/app/login/page.js`
- `[MODIFY] src/app/register/page.js`
- `[MODIFY] src/app/onboarding/page.js`
- `[MODIFY] src/app/[tenant-slug]/profile/page.js`
- `[MODIFY] docs/BITACORA_DESARROLLO.md`

### Validaciones Ejecutadas
- Simulación SQL del comando `INSERT` con rol `authenticated` y claims de JWT, validando la desaparición del error de RLS.
- Compilación de producción con `npm.cmd run build:next` exitosa.

### Riesgos Detectados / Remanentes
- Los navegadores de los usuarios pueden almacenar en caché los viejos scripts JavaScript compilados, por lo que es necesario realizar un refresco de pantalla completo (Ctrl + F5) tras la reactivación del servidor.

### Próximo Paso Recomendado
- El usuario puede abrir la aplicación, verificar la desaparición del isotipo "S" y probar registrar un correo repetido para validar la alerta modal emergente.

---

## [2026-06-11] Reestructuración, Unificación y Rediseño de Perfil de Usuario (Onboarding y Edición)

### Resumen de Cambios
- **Remoción de la letra "S"**: Se eliminó el isotipo decorativo "S" de la cabecera en el Onboarding (`src/app/onboarding/page.js`).
- **Unificación de Títulos**: Se cambiaron los títulos a **"Perfil de usuario"** en ambas pantallas para homogenizar la experiencia de creación y edición.
- **Eliminación de Numeraciones**: Se quitaron los números identificadores de sección ("1", "2", "3", "5") en los subtítulos de Onboarding y Perfil.
- **Reorganización de Campos**: Se integraron los campos opcionales de matrícula profesional y firma digital dentro del primer bloque: **"Información del usuario"** (tanto en onboarding como en edición).
- **Subtítulo de Empresa**: Se renombró la sección empresarial a **"Identidad de la empresa"**.
- **Tipo de Plan**: Se reubicó la sección del plan comercial al final de las pantallas bajo el subtítulo **"Tipo de plan"**.
- **Notificaciones Toast**: Se migró el Onboarding a notificaciones flotantes y autolimpiables de tipo **Toast**, idénticas a las de la pantalla de perfil, retirando el antiguo banner superior estático.
- **Botones Unificados de Guardar y Salir con Detección de Cambios**: Se simplificaron las acciones de guardado y escape en Onboarding y Perfil. El botón de envío principal se renombró a **"Guardar"** y el de escape secundario a **"Salir"** (que en Onboarding persiste los datos mínimos obligatorios y en Perfil sale sin guardar, redirigiendo a la pantalla de inicio/dashboard). Si el usuario modificó algún dato en el formulario y presiona "Salir", el sistema lo detecta ("dirty check") y le solicita confirmación mediante un diálogo emergente antes de abandonar la edición.
- **Bypass de Columnas de Redes en Guardado Rápido**: Se simplificó el payload del insert mínimo del Tenant en `handleSaveOnlyRequired` omitiendo columnas de redes sociales (`social_facebook`, `social_linkedin`, etc.). Esto previene errores del schema cache de PostgREST en Supabase en caso de que la migración incremental no se haya ejecutado físicamente en la base de datos del usuario.
- **Creación de Pantalla de Inicio (Dashboard)**: Se creó la ruta y página del panel de control de la SaaS en `src/app/[tenant-slug]/dashboard/page.js` con sidebar, métricas interactivas de clientes cargados, cumplimiento y plan contratado, permitiendo que la redirección tras guardar o salir cargue correctamente esta pantalla de inicio en Next.js.
- **Branding y Colores de Marca**: Alineación total del frontend con la paleta corporativa (`#468DFF` y `#0511F2`) en loaders, bordes de entrada activos, hovers y gradientes en botones de guardado.

### Decisiones Clave
- **Integridad y Flujo de Registro**: El botón de escape en Onboarding no realiza una simple redirección, sino que persiste en Supabase los datos obligatorios indispensables (creando el Tenant y asociándole el `tenant_id` al perfil) para asegurar que el middleware no bloquee al usuario y el sistema multi-tenant funcione correctamente.

### Skills Utilizadas
- `gestion-syso-bitacora`
- `gestion-syso-brand-guidelines`
- `next-best-practices`
- `supabase`

### Archivos Modificados / Creados
- `[MODIFY] src/app/onboarding/page.js`
- `[MODIFY] src/app/[tenant-slug]/profile/page.js`
- `[MODIFY] docs/BITACORA_DESARROLLO.md`

### Validaciones Ejecutadas
- Compilación del bundle de producción exitosa con `npm run build:next`.

---

## [2026-06-10] Recuperación de Contraseña, Edición de Perfil, Alertas Modales y Nuevo Modelo Comercial de Planes

### Resumen de Cambios
- Reemplazo de banners de error de acceso en el Login por **ventanas emergentes modales de notificación** de error.
- Implementación de modal de **¿La olvidaste?** en el Login para ingreso de correo y envío de enlace de restablecimiento por correo.
- Creación de la pantalla **/reset-password** para el restablecimiento de contraseñas de manera segura conectada a `supabase.auth.updateUser`.
- Modificación del Onboarding para **auto-rellenar el Nombre y Correo** del usuario autenticado en la carga de la página.
- Configuración de la **Fecha de Nacimiento como dato estrictamente obligatorio** en el alta y edición de perfil.
- Creación de la pantalla de **Edición de Perfil** `/[tenant-slug]/profile` para actualización segura de datos, re-agrupando matrícula y firma bajo la sección de "Información del usuario".
- Incorporación de notificaciones de tipo **Toast flotantes auto-cerrables** para el guardado de datos en el perfil.
- Adición de la acción **"Salir al Dashboard"** en la edición para permitir el retorno sin persistencia forzada de inputs opcionales.
- Alineación del diseño del frontend con los **colores oficiales de la marca** (`#468DFF` y `#0511F2`).
- Reestructuración de la base de datos y la interfaz del plan a: **Gratis permanente (1 cliente)**, Plan 5 ($3.500), Plan 25 ($7.500) y Plan Libre ($12.000).
- Creación de la migración incremental SQL `20260610010000_adjust_plans_constraint.sql` para actualizar la restricción de planes.

### Decisiones Clave
- **Privacidad y Rutas**: Registro de la ruta `/reset-password` en el middleware de Next.js como pública para que los usuarios puedan reestablecer su clave sin bloqueos de ruteo.
- **Persistencia Segura**: Habilitación de la edición de perfil bajo la política RLS Postgres `profile_self_update` que garantiza que el usuario solo pueda modificar sus propios datos.

### Skills Utilizadas
- `gestion-syso-bitacora`
- `gestion-syso-multitenant-security`
- `next-best-practices`
- `supabase`

### Archivos Modificados / Creados
- `[NEW] supabase/migrations/20260610010000_adjust_plans_constraint.sql`
- `[NEW] src/app/reset-password/page.js`
- `[NEW] src/app/[tenant-slug]/profile/page.js`
- `[MODIFY] src/app/login/page.js`
- `[MODIFY] src/app/onboarding/page.js`
- `[MODIFY] src/middleware.js`
- `[MODIFY] docs/BITACORA_DESARROLLO.md`

### Validaciones Ejecutadas
- Compilación y build de verificación de Next.js finalizada con éxito.

### Riesgos Detectados / Remanentes
- Los enlaces de recuperación locales redirigen a `http://localhost:3000/reset-password` y deberán configurarse en las variables de entorno de Supabase para producción.

### Próximo Paso Recomendado
- Aplicar la nueva migración SQL incremental en Supabase y continuar con el desarrollo de la pantalla del Dashboard de Clientes para validar el límite del Plan Gratis de 1 cliente.

---

## [2026-06-09] Sistema de Login, Registro y Onboarding Completo en Next.js

### Resumen de Cambios
- Consolidación del flujo de onboarding en una **pantalla única** (eliminando el stepper por pasos previos).
- Reclasificación de campos obligatorios: **Nombre, Correo (autocompletado), Teléfono, CUIT (11 números) y Geografía (Provincia/Localidad)**. El resto de datos (Matrícula, Firma, Logos, Redes) se configuran como **opcionales**.
- Inclusión de campos de **Redes Sociales** (LinkedIn, Instagram, Facebook, TikTok, YouTube) y Sitio Web en la base de datos y formulario de empresa.
- Redirección automática desde la raíz `/` directamente a la pantalla de `/login` para evitar el showcase promocional estático.
- Cambio de textos de acción: botón principal renombrado a **"Guardar datos"** y adición de la opción interactiva **"Contratar / Subir Plan"** con selector de planes en modal.
- Creación de la migración incremental de base de datos `20260610000000_add_tenant_social_fields.sql`.

### Decisiones Clave
- **Políticas RLS en Storage**: Los buckets `signatures`, `documents` (privados) y `logos` (público) se configuran con políticas a nivel de Postgres que restringen la subida/edición basándose en `auth.uid()` o en el `tenant_id` del perfil.
- **Transición de Entorno**: Actualización del archivo `package.json` agregando dependencias de Next.js y Supabase para permitir el desarrollo frontend unificado.

### Skills Utilizadas
- `gestion-syso-bitacora`
- `gestion-syso-multitenant-security`
- `next-best-practices`
- `supabase`

### Archivos Modificados / Creados
- `[NEW] supabase/migrations/20260609000000_add_user_onboarding_fields.sql`
- `[NEW] src/app/login/page.js`
- `[NEW] src/app/register/page.js`
- `[NEW] src/app/onboarding/page.js`
- `[NEW] src/middleware.js`
- `[NEW] jsconfig.json`
- `[MODIFY] package.json`
- `[MODIFY] src/lib/supabase.js`
- `[MODIFY] .env`
- `[MODIFY] docs/BITACORA_DESARROLLO.md`

### Validaciones Ejecutadas
- Instalación de dependencias de npm finalizada con éxito.
- Compilación y build de validación de Next.js.

### Riesgos Detectados / Remanentes
- El backend Express existente sigue viviendo en `src/server.js` y debe convivir con el enrutamiento y API de Next.js, coordinando variables de entorno comunes.

### Próximo Paso Recomendado
- Aplicar la migración SQL de Supabase y proceder con la construcción del Dashboard de la empresa (`/[tenant-slug]/dashboard`).

---

## [2026-06-08] Setup de Arquitectura y Alineación de Marca

### Resumen de Cambios
- Creación e instalación de las skills locales `.agents/skills/gestion-syso-bitacora/SKILL.md` y `.agents/skills/gestion-syso-multitenant-security/SKILL.md`.
- Corrección y alineación de la paleta de colores de marca y estilos CSS con respecto a la guía de `RULES_WORKSPACE.md`, remapeando el color principal al azul corporativo `#468DFF` y el resaltado a `#0511F2` (reemplazando el naranja previo).
- Actualización de los estilos en `globals.css`, `layout.js`, `page.js` y `button.jsx` para reflejar uniformemente el tema visual azul.

### Decisiones Clave
- **Consistencia Visual**: Se adoptan los códigos hexadecimales estipulados en las reglas globales del workspace. Para Tailwind, se mapearon sus equivalencias HSL en las variables de capa base (`globals.css`).
- **Formalización de Skills**: Se documenta la bitácora técnica de desarrollo y las pautas multi-tenant como reglas automatizadas para futuros agentes.

### Skills Utilizadas
- `gestion-syso-bitacora`
- `gestion-syso-multitenant-security`
- `next-best-practices`

### Archivos Modificados / Creados
- `[NEW] .agents/skills/gestion-syso-bitacora/SKILL.md`
- `[NEW] .agents/skills/gestion-syso-multitenant-security/SKILL.md`
- `[MODIFY] docs/brand/BRAND_GUIDELINES.md`
- `[MODIFY] src/app/globals.css`
- `[MODIFY] src/app/layout.js`
- `[MODIFY] src/app/page.js`
- `[MODIFY] src/components/ui/button.jsx`

### Validaciones Ejecutadas
- Ejecución de prueba del servidor Express existente para asegurar estabilidad del backend.
- Verificación visual y de consistencia de clases CSS condicionales.

### Riesgos Detectados / Remanentes
- El mockup estático `placeholder_hero.png` sigue mostrando el color naranja inicial. Deberá regenerarse cuando se realicen actualizaciones estéticas mayores.

### Próximo Paso Recomendado
- Proceder con la configuración de las skills comunitarias propuestas (`openapi-contracts`, `zod-validation`) e iniciar la integración de la API con Supabase Auth y el modelo multi-tenant.

---

## [2026-06-08] Setup Inicial de la Estructura de Carpetas

### Resumen de Cambios
- Creación de la estructura base del proyecto para soportar la futura migración a Next.js App Router y Supabase sin interferir con el servidor Express actual.
- Configuración inicial de documentos de arquitectura (ADR) y guías de marca (Branding, Tipografía).
- Definición de flujos críticos de la aplicación (Autenticación, Registro de Tenant, Auditoría).
- Estructuración inicial de base de datos Supabase (esquemas de migración multi-tenant con RLS y archivo seed).
- Preparación del espacio de trabajo para Next.js con archivos de layout, páginas, estilos globales (`globals.css` utilizando variables CSS compatibles con shadcn/ui), utilidades y configuración de `components.json` y `vercel.json`.

### Decisiones Clave
- **Coexistencia**: El backend actual basado en Node/Express/Mongoose sigue estando activo y operativo en `src/server.js`, mientras que la nueva estructura Next.js se prepara bajo `src/app/` y `src/components/`.
- **Enfoque Multi-tenant**: Se ha establecido desde el inicio un esquema relacional con `tenant_id` obligatorio en todas las tablas sensibles del tenant, protegido a nivel de base de datos usando Row Level Security (RLS) en Postgres/Supabase.
