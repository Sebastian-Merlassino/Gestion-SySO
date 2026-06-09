# ADR 0001: Adopción del Stack Tecnológico Inicial para SaaS

- **Estado**: Aceptado
- **Fecha**: 2026-06-08
- **Autores**: Antigravity Technical Setup Agent

---

## Contexto y Problema

El proyecto **Gestión SySO** (Sistema de Gestión de Seguridad y Salud Ocupacional) requiere evolucionar desde un prototipo/API monolítico inicial hacia una arquitectura robusta de Software como Servicio (SaaS) multi-tenant. Para garantizar alta velocidad de desarrollo, escalabilidad horizontal, seguridad estricta entre clientes (tenants) y un diseño de interfaz premium y dinámico, es necesario establecer un stack tecnológico de referencia y preparar la estructura de carpetas en consecuencia.

## Decisión

Se adopta el siguiente stack tecnológico principal para la interfaz y backend SaaS del proyecto:

1. **Framework Frontend/Backend (Full-stack)**: **Next.js App Router** (React 19, TypeScript/JavaScript)
   - *Razón*: Renderizado híbrido (RSC/SSR/Client), routing intuitivo basado en carpetas y optimización out-of-the-box para SEO y performance.
2. **Base de Datos y Backend-as-a-Service (BaaS)**: **Supabase (PostgreSQL)**
   - *Razón*: Aprovisionamiento rápido de base de datos relacional robusta, autenticación integrada de usuarios y soporte nativo de **Row Level Security (RLS)**, crucial para implementar multi-tenancy a nivel de base de datos.
3. **Estilos y Componentes de UI**: **Tailwind CSS + shadcn/ui**
   - *Razón*: Estilos rápidos, consistentes y componentes UI accesibles y altamente personalizables sin añadir dependencias pesadas que restrinjan la flexibilidad del diseño.
4. **Plataforma de Hosting & Deployments**: **Vercel**
   - *Razón*: Integración nativa óptima con Next.js y Supabase, permitiendo despliegues automáticos rápidos y previsualizaciones por rama de Git.

## Consecuencias

### Positivas
- **Aislamiento Multi-tenant**: RLS de Postgres garantiza que un tenant jamás pueda ver datos de otro, reduciendo la vulnerabilidad a nivel de código de aplicación.
- **Interacción Fluida**: La arquitectura de componentes de React junto con animaciones nativas de CSS y transiciones optimizadas por Tailwind permitirá crear una UI/UX premium.
- **Despliegues Continuos**: Vercel provee una infraestructura global optimizada sin fricciones de DevOps.

### Desventajas/Mitigaciones
- **Curva de Aprendizaje**: El uso de Server Components (RSC) y Client Components requiere cuidado al estructurar los límites de interactividad.
- **Fase de Coexistencia**: Se mantendrán los controladores Express existentes bajo `src/controllers` y `src/routes` mientras se completa la migración progresiva hacia Next.js Route Handlers y el SDK de Supabase client/server.
