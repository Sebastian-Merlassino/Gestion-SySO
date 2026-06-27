# Reglas globales del workspace — Gestión SySO

## Alcance

Estas reglas aplican a todo el proyecto `Gestion-SySO/` y a cualquier agente que trabaje dentro del workspace.

## Principios obligatorios

- Este proyecto es un SaaS multi-tenant con foco en seguridad, trazabilidad, mantenibilidad y escalabilidad.
- Toda intervención debe comenzar leyendo `docs/BITACORA_DESARROLLO.md`.
- Ningún agente debe modificar archivos sin antes presentar un plan breve y concreto.
- Ningún agente debe ejecutar acciones destructivas.
- Ningún agente debe asumir que el frontend es una capa confiable para seguridad.
- Todo control sensible debe validarse del lado servidor.
- Toda tabla multiempresa debe contemplar aislamiento por tenant y RLS estricta.
- Todo cambio importante de arquitectura debe reflejarse en un ADR dentro de `docs/adr/`.
- Todo flujo funcional relevante debe documentarse en `docs/WORKFLOWS/`.

## Bitácora obligatoria

Archivo obligatorio:
- `docs/BITACORA_DESARROLLO.md`

Antes de cambiar código:
1. Leer la última entrada.
2. Identificar riesgos, bloqueos y archivos ya intervenidos.
3. Resumir el plan de la tarea.

Después de cambiar código:
1. Registrar fecha y hora.
2. Describir objetivo de la intervención.
3. Indicar skills utilizadas.
4. Listar archivos creados o modificados.
5. Registrar validaciones ejecutadas.
6. Registrar riesgos detectados.
7. Dejar siguiente paso recomendado.

## Reglas no destructivas

Prohibido, salvo autorización explícita:
- borrar archivos;
- borrar carpetas;
- reescribir `.env`;
- reescribir `.agents/skills`;
- eliminar migraciones;
- alterar seeds existentes sin justificación;
- ejecutar comandos equivalentes a `rm -rf`, `git reset --hard`, `drop table`, `truncate` o similares.

Si un archivo ya existe:
- no sobrescribir sin indicar el motivo;
- preferir edición incremental;
- preservar comentarios y contexto si siguen vigentes.

## Convenciones de nombres

### General
- usar nombres claros, consistentes y en inglés para código;
- usar kebab-case para carpetas;
- usar PascalCase para componentes React;
- usar camelCase para funciones y variables;
- usar snake_case en SQL cuando convenga y sea consistente con el esquema.

### Documentación
- `docs/adr/ADR-0001-stack-inicial.md`
- `docs/WORKFLOWS/nombre-del-flujo.md`
- `docs/brand/BRAND_GUIDELINES.md`

### Assets
- originales en `assets/brand/source/`
- archivos de uso público en `public/brand/`
- logos normalizados:
  - `logo-primary.png`
  - `logo-black.png`
  - `logo-white.png`

## Reglas de marca y diseño

Respetar siempre:
- color principal: `#468DFF`
- color de resaltado: `#0511F2`
- secundarios: `#D9D9D9`, `#FFFFFF`, `#000000`
- una sola familia tipográfica definida en `docs/brand/TYPOGRAPHY.md`
- diseño responsive para web, tablet y celular
- botones estandarizados:
  - Botón primario: relleno `#468DFF`, texto/borde `#FFFFFF`. Hover: relleno `#0511F2` y texto/borde `#FFFFFF`.
  - Botón secundario y "Salir": relleno `#FFFFFF`, borde/texto `#468DFF`. Hover: relleno `#468DFF` y texto/borde `#FFFFFF`.
  - Botón "Editar": relleno `#F59E0B` (Amber-500), texto/borde `#FFFFFF`. Hover: relleno `#D97706` (Amber-600). En tabla (icono): relleno `#FEF3C7`, texto `#D97706`, hover relleno `#FEEB99`, texto `#B45309`.
  - Botón "Eliminar": relleno `#EF4444` (Red-500), texto/borde `#FFFFFF`. Hover: relleno `#DC2626` (Red-600). En tabla (icono): relleno `#FEE2E2`, texto `#DC2626`, hover relleno `#FCA5A5`, texto `#B91C1C`.
  - Botón/Icono de Documento: relleno `#EFF6FF` (Blue-50), borde/texto `#468DFF`. Hover: relleno `#DBEAFE` (Blue-100), texto/borde `#0511F2`. En tabla (icono): `FileText` de Lucide con tamaño `h-4.5 w-4.5`.
- referencia estructural de dashboard en `docs/design/reference/dashboard-reference.jpg`
- diseño estándar de carga de documentos (`DocumentUploadZone`): contenedor de bordes redondeados (`rounded-xl border border-slate-200 bg-slate-50`), pestañas de alternancia superior para local/Drive (`flex border-b border-slate-200 bg-white text-xs font-semibold`), y zona de arrastre punteada reactiva.

No alterar:
- proporciones de logos;
- contraste mínimo de accesibilidad;
- consistencia entre sidebar, navbar, cards, tablas y formularios.

## Reglas de seguridad

Obligatorio en todo cambio técnico:
- validación server-side;
- aislamiento por tenant;
- RLS estricta para toda tabla con datos por empresa;
- prevención de IDOR;
- prevención de escalamiento de privilegios;
- límites por plan;
- límites por usuario;
- límites por empresa;
- auditoría de eventos críticos;
- control de carga de archivos;
- validación de tipo, tamaño y destino de archivos;
- no exponer secretos al cliente.

## Documentación de seguridad obligatoria

Antes de crear o modificar endpoints, Server Actions, autenticación, Supabase, storage, Mercado Pago, formularios o carga de archivos, leer y aplicar:

- `docs/security/SECURITY_BASELINE.md`
- `docs/security/MULTI_TENANT_MODEL.md`

Estas reglas son obligatorias para todo cambio técnico del SaaS.


## Rate limiting y anti abuso

Todo endpoint sensible debe contemplar:
- rate limiting;
- retry controlado;
- protección ante fuerza bruta;
- protección ante creación masiva de registros;
- límites de consultas costosas;
- paginación obligatoria en listados grandes;
- topes por plan para clientes, técnicos, archivos y operaciones clave.

## Backups y recuperabilidad

Documentar estrategia en `scripts/backup-storage-plan.md` y luego evolucionarla.

Debe contemplar:
- backup de base de datos;
- backup de storage;
- versionado de migraciones;
- restauración de catálogos;
- plan ante corrupción o borrado accidental.

## Flujo de trabajo base obligatorio

1. Leer bitácora.
2. Leer skills pertinentes.
3. Inspeccionar archivos implicados.
4. Presentar plan.
5. Esperar aprobación si el cambio es amplio o sensible.
6. Ejecutar cambios de forma incremental.
7. Validar con pruebas, build o chequeos pertinentes.
8. Actualizar bitácora.
9. Resumir resultados, riesgos y próximo paso.

## Checklist universal antes de actuar

- [ ] Leí `docs/BITACORA_DESARROLLO.md`.
- [ ] Leí las skills relevantes.
- [ ] Identifiqué archivos a tocar.
- [ ] No haré cambios destructivos.
- [ ] Tengo un plan breve de ejecución.
- [ ] Sé qué validaciones correré al final.

## Checklist universal después de actuar

- [ ] Actualicé `docs/BITACORA_DESARROLLO.md`.
- [ ] Listé archivos modificados.
- [ ] Corrí validaciones.
- [ ] Informé riesgos remanentes.
- [ ] No expuse secretos ni claves.
- [ ] No dejé rutas o políticas sin protección.
