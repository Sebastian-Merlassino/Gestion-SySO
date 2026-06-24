# ADR 0004: Incorporación del Módulo "Legajo Técnico" al Sistema SaaS

- **Estado**: Propuesto
- **Fecha**: 2026-06-24
- **Autores**: Antigravity Technical Setup Agent

---

## Contexto y Problema

El sistema de **Gestión SySO** requiere una nueva sección llamada **"Legajo Técnico"** que sirva como repositorio organizado y digitalizado de documentos y registros técnicos de Higiene y Seguridad. La sección debe estructurarse mediante una navegación de carpetas y subcarpetas (ej: ART, Estudios y mediciones, Protección contra incendios) y permitir asociar documentos por Razón Social, Establecimiento y Tipo de Registro. Se requiere que admita archivos locales PDF y enlaces externos a Google Drive, con políticas estrictas de multi-tenancy y control de acceso (solo lectura para usuarios con rol `cliente`).

## Decisión

Se decide implementar la arquitectura de la sección de la siguiente manera:

1. **Estructura de Base de Datos**: Se creará la tabla `public.legajo_tecnico` en Supabase para almacenar las referencias físicas de los documentos. La tabla contendrá referencias externas a la organización (`tenant_id`), cliente (`empresa_id`), establecimiento (`establecimiento_id`) y registro del catálogo (`registro_id` opcional). Las carpetas y subcarpetas se modelarán mediante dos columnas de texto: `categoria` (carpeta raíz) y `subcategoria` (subcarpeta).
2. **Seguridad Row Level Security (RLS)**:
   - Los usuarios con rol `cliente` solo podrán leer registros donde `empresa_id = public.get_current_user_empresa_id()`.
   - La edición, creación y eliminación estará restringida mediante la función `public.user_has_action_permission('legajo', 'cargar' | 'editar' | 'eliminar')`.
3. **Mapeo de Catálogo Estático**: Los nombres de documentos se seleccionarán desde la tabla `public.registros`, manteniendo la posibilidad de ingreso manual para casos no tabulados.
4. **Navegación e Interfaz**: Se desarrollará un explorador de archivos basado en el dashboard y directrices de marca (azul principal `#468DFF`, fondo oscuro en barra lateral), con un flujo interactivo de navegación por tarjetas y barra de migas de pan (breadcrumbs) para simplificar la UX en computadoras y dispositivos móviles.
5. **Subida Dual de Archivos**: Se replicará el mecanismo implementado en el módulo de programas:
   - Archivos locales (PDF) se suben al bucket `documents` usando el cliente Supabase Storage.
   - Enlaces de Google Drive se procesan a través del endpoint `/api/upload-from-url` para persistirlos internamente en el storage del tenant.

## Consecuencias

### Positivas
- **Aislamiento Multi-tenant Robusto**: RLS a nivel de base de datos previene fugas de información entre clientes de diferentes tenants.
- **Experiencia de Usuario Premium**: Un explorador de carpetas interactivo simula la familiaridad de servicios como Google Drive o Dropbox, aportando gran valor visual.
- **Fácil Mantenimiento**: El uso de columnas `categoria` y `subcategoria` con un árbol estático en código elimina la complejidad de consultas jerárquicas recurrentes (como clausuras transitivas o queries recursivos `WITH RECURSIVE`) para la estructura de carpetas fijas requerida por el negocio.

### Desventajas/Mitigaciones
- **Desincronización de Catálogo**: Si un usuario ingresa nombres manuales repetidamente se pierde coherencia en los nombres. Se mitiga sugiriendo por defecto los nombres pre-cargados del catálogo `public.registros` correspondientes a la carpeta/subcarpeta seleccionada.
