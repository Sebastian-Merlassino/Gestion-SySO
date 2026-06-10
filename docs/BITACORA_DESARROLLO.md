# Bitácora de Desarrollo - Gestión SySO

Este documento registra las decisiones técnicas, cambios de arquitectura y progresos del proyecto de manera cronológica.

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
