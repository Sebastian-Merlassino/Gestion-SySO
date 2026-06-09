# Bitácora de Desarrollo - Gestión SySO

Este documento registra las decisiones técnicas, cambios de arquitectura y progresos del proyecto de manera cronológica.

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
