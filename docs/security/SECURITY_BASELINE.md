# Security Baseline — Gestión SySO SaaS

## 1. Propósito

Este documento define la línea base obligatoria de seguridad para el desarrollo del SaaS **Gestión SySO**.

Aplica a todo el proyecto:

- Next.js
- React
- Supabase
- PostgreSQL
- Supabase Auth
- Supabase Storage
- Mercado Pago
- Nodemailer / SMTP
- Vercel
- API Routes
- Server Actions
- Middleware
- Formularios
- Carga de archivos
- Webhooks
- Paneles administrativos
- Funcionalidades multi-tenant

Toda funcionalidad nueva debe cumplir estas reglas antes de considerarse válida.

---

# 2. Principios generales

El proyecto debe aplicar seguridad por diseño y por defecto.

Reglas obligatorias:

- No generar código inseguro aunque sea más simple.
- No confiar en el frontend como capa de seguridad.
- Toda validación crítica debe ejecutarse del lado servidor.
- Todo endpoint debe validar autenticación, autorización, input y rate limit.
- Toda tabla con datos de clientes debe contemplar aislamiento multi-tenant.
- Toda acción sensible debe quedar registrada en logs seguros.
- Ningún secreto debe quedar expuesto en código fuente, frontend, logs o repositorio.
- No exponer información interna ante errores.
- No implementar funcionalidades que permitan acceso cross-tenant.
- No modificar seguridad, autenticación, RLS o permisos sin dejar registro en bitácora.

---

# 3. Variables de entorno y secretos

## 3.1 Reglas obligatorias

- Nunca escribir secretos directamente en el código.
- Usar siempre variables de entorno.
- Mantener `.env`, `.env.local`, `.env.production` y `.env.development` fuera del repositorio.
- Confirmar que `.env` y variantes estén en `.gitignore`.
- Crear o actualizar `.env.example` con los nombres de variables requeridas, sin valores reales.
- Validar al iniciar la aplicación que las variables obligatorias existan.
- Si falta una variable crítica, la aplicación debe fallar de forma explícita.
- No loguear valores de variables de entorno.
- No enviar secretos al cliente.
- No usar variables sin prefijo `NEXT_PUBLIC_` en componentes cliente.
- No usar `NEXT_PUBLIC_` para claves privadas.

## 3.2 Variables mínimas esperadas

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

SUPABASE_SERVICE_ROLE_KEY=

MERCADO_PAGO_ACCESS_TOKEN=
MERCADO_PAGO_WEBHOOK_SECRET=

SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
SMTP_FROM=

APP_URL=
NODE_ENV=
```

## 3.3 Reglas para Supabase

- `NEXT_PUBLIC_SUPABASE_URL` puede exponerse al cliente.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` puede exponerse al cliente, pero siempre debe estar protegida por RLS.
- `SUPABASE_SERVICE_ROLE_KEY` nunca puede exponerse al cliente.
- `SUPABASE_SERVICE_ROLE_KEY` solo puede usarse en código server-side.
- Ninguna operación con service role debe confiar en datos enviados desde frontend sin validación.

---

# 4. Supabase y seguridad multi-tenant

## 4.1 Modelo obligatorio

El SaaS funciona bajo un modelo multi-tenant. Cada empresa, cliente u organización debe tener aislamiento lógico de datos.

Toda tabla operativa con datos de clientes debe incluir una columna de aislamiento, según el modelo definido:

- `tenant_id`
- `empresa_id`
- equivalente aprobado por arquitectura

No crear tablas multiempresa sin una columna clara de aislamiento.

## 4.2 Row Level Security

Reglas obligatorias:

- Toda tabla con datos por empresa debe tener RLS activo.
- Toda tabla sensible debe tener políticas explícitas para:
  - `SELECT`
  - `INSERT`
  - `UPDATE`
  - `DELETE`
- No confiar en filtros del frontend para separar datos.
- No confiar en filtros manuales de queries como única protección.
- El aislamiento debe aplicarse desde PostgreSQL mediante RLS.
- No crear políticas permisivas del tipo `USING (true)` en tablas sensibles.
- No usar service role para saltar RLS salvo en procesos estrictamente server-side y justificados.

## 4.3 Reglas anti cross-tenant

Está prohibido:

- Leer registros de otra empresa.
- Editar registros de otra empresa.
- Eliminar registros de otra empresa.
- Consultar archivos de otra empresa.
- Inferir existencia de datos de otra empresa por mensajes de error.
- Permitir acceso directo por ID sin validación de tenant.
- Confiar en `tenant_id`, `empresa_id`, `user_id` o `role` enviado desde el frontend.

Toda operación debe resolver el tenant desde:

- sesión autenticada;
- perfil del usuario;
- políticas RLS;
- lógica backend verificada.

## 4.4 Índices recomendados

Toda tabla grande multi-tenant debe evaluar índices como:

```sql
CREATE INDEX idx_tabla_tenant_id ON public.tabla (tenant_id);
CREATE INDEX idx_tabla_tenant_id_id ON public.tabla (tenant_id, id);
```

Cuando haya búsquedas por estado, fecha o tipo:

```sql
CREATE INDEX idx_tabla_tenant_estado ON public.tabla (tenant_id, estado);
CREATE INDEX idx_tabla_tenant_fecha ON public.tabla (tenant_id, created_at);
```

---

# 5. Autenticación

## 5.1 Reglas generales

- Todo endpoint privado debe exigir usuario autenticado.
- Toda Server Action privada debe exigir usuario autenticado.
- Toda página privada debe validar sesión del lado servidor cuando corresponda.
- No basarse únicamente en ocultar botones o rutas desde frontend.
- No exponer datos sensibles en rutas públicas.
- No devolver información innecesaria del usuario autenticado.

## 5.2 Sesiones y cookies

Si se usan cookies de sesión:

- deben ser `httpOnly`;
- deben ser `secure` en producción;
- deben usar `sameSite=Lax` o `sameSite=Strict` según el flujo;
- deben tener expiración definida;
- no deben almacenar datos sensibles en texto plano.

## 5.3 Contraseñas

Si el sistema administra contraseñas propias:

- nunca almacenarlas en texto plano;
- usar `bcrypt` o `argon2`;
- aplicar políticas mínimas de complejidad razonable;
- aplicar protección contra fuerza bruta;
- no revelar si un email existe o no durante login o recuperación.

Si se usa Supabase Auth, respetar sus mecanismos nativos y no duplicar lógica insegura.

---

# 6. Autorización y roles

## 6.1 Principio obligatorio

Autenticación no equivale a autorización.

Un usuario autenticado no debe poder ejecutar una acción si no tiene permisos suficientes.

## 6.2 Roles mínimos sugeridos

El sistema debe contemplar, como mínimo:

| Rol | Alcance |
|---|---|
| `superadmin_saas` | Administración global del SaaS |
| `owner_empresa` | Administración total de una empresa/tenant |
| `admin_empresa` | Administración operativa de una empresa |
| `usuario_operativo` | Carga y gestión limitada |
| `solo_lectura` | Consulta sin edición |

## 6.3 Reglas obligatorias

- Todo endpoint debe validar permisos.
- Toda operación administrativa debe validar rol.
- Toda operación por empresa debe validar pertenencia al tenant.
- No basarse en roles enviados desde frontend.
- No permitir escalamiento de privilegios.
- No permitir que un usuario se asigne a sí mismo un rol superior.
- No permitir que un usuario cambie su propio tenant.
- No permitir acceso a paneles admin por rutas directas si el rol no corresponde.

---

# 7. CSRF

## 7.1 Cuándo aplica

Debe implementarse protección CSRF cuando la autenticación use cookies enviadas automáticamente por el navegador.

Aplica especialmente a:

- `POST`
- `PUT`
- `PATCH`
- `DELETE`
- Server Actions que modifiquen estado
- formularios administrativos
- cambios de configuración
- altas, bajas y modificaciones de datos
- operaciones de billing

## 7.2 Reglas obligatorias

- No usar `GET` para operaciones que modifiquen estado.
- Validar `Origin` y/o `Referer` en endpoints sensibles cuando corresponda.
- Usar tokens CSRF cuando el flujo lo requiera.
- No aceptar requests mutantes desde orígenes no confiables.

---

# 8. Rate limiting y anti abuso

## 8.1 Regla general

Todo endpoint sensible debe contemplar rate limiting.

En entornos serverless como Vercel no debe usarse rate limiting solo en memoria local para producción.

Usar preferentemente:

- Upstash Redis;
- Redis externo;
- Vercel Firewall / WAF;
- almacenamiento persistente equivalente.

## 8.2 Límites iniciales recomendados

| Tipo de endpoint | Límite recomendado |
|---|---:|
| API general | 100 solicitudes por IP cada 15 minutos |
| Login | 5 intentos por IP cada 15 minutos |
| Registro | 5 intentos por IP cada 15 minutos |
| Recuperación de contraseña | 3 intentos por IP cada 15 minutos |
| Endpoints admin | 10 solicitudes por IP cada 15 minutos |
| Endpoints de pagos | 10 solicitudes por IP cada 15 minutos |
| Uploads | límite por usuario, empresa y plan |
| Webhooks | límite razonable sin bloquear reintentos legítimos |

## 8.3 Respuesta ante exceso

Cuando se exceda el límite:

- devolver HTTP `429 Too Many Requests`;
- mostrar mensaje claro;
- no revelar detalles internos;
- registrar evento de seguridad;
- no bloquear webhooks legítimos sin criterio.

## 8.4 Protección anti abuso adicional

Todo listado grande debe tener:

- paginación;
- límite máximo de resultados;
- filtros controlados;
- protección ante consultas costosas;
- límites por plan cuando aplique.

---

# 9. Validación de inputs

## 9.1 Regla general

Validar todos los inputs del usuario antes de procesarlos.

La validación debe ejecutarse del lado servidor.

## 9.2 Librería recomendada

Usar Zod para definir schemas estrictos.

Aplicar validación a:

- body;
- query params;
- route params;
- headers relevantes;
- formularios;
- Server Actions;
- payloads de webhooks;
- datos antes de insertarlos en Supabase.

## 9.3 Reglas obligatorias

- Rechazar campos no esperados.
- Aplicar límites de longitud.
- Validar tipos.
- Validar formatos.
- Validar enums.
- Validar fechas.
- Validar UUIDs.
- Validar CUIT, DNI, email y teléfono cuando correspondan.
- Validar coherencia de negocio.
- No procesar inputs inválidos.
- Loguear rechazos de validación sin registrar datos sensibles completos.

## 9.4 Ejemplos de validación esperada

Validar:

- `empresa_id`
- `tenant_id`
- `establecimiento_id`
- `usuario_id`
- `rol`
- `estado`
- `fecha`
- `email`
- `cuit`
- `dni`
- `monto`
- `plan`
- `archivo`
- `mime_type`
- `size`

---

# 10. Anti-inyección SQL

## 10.1 Reglas obligatorias

- Nunca concatenar SQL con input del usuario.
- Usar Supabase client, query builder, ORM o queries parametrizadas.
- No construir filtros dinámicos sin allowlist.
- No ejecutar RPC inseguras.
- No exponer errores SQL completos al usuario.
- Sanitizar mensajes de error.
- Validar toda entrada antes de usarla en queries.
- Aplicar RLS aunque la query parezca segura.

## 10.2 SQL dinámico

Si se usa SQL dinámico:

- justificar necesidad;
- usar parámetros;
- aplicar allowlists;
- evitar interpolación directa;
- testear casos maliciosos.

---

# 11. Prevención XSS

## 11.1 Reglas obligatorias

- No usar `dangerouslySetInnerHTML` salvo necesidad justificada.
- Sanitizar contenido HTML si se permite ingreso de HTML.
- No renderizar contenido editable por usuarios como HTML libre.
- Escapar output renderizado.
- Usar protecciones nativas de React.
- Aplicar Content Security Policy.
- Evitar scripts inline.
- No permitir carga de `.html`, `.svg` o `.js` como contenido activo salvo justificación técnica y sanitización robusta.

## 11.2 Contenido generado por usuarios

Todo contenido generado por usuarios debe tratarse como no confiable:

- observaciones;
- descripciones;
- comentarios;
- nombres de archivos;
- campos libres;
- textos para documentos PDF;
- datos importados.

---

# 12. Headers de seguridad

Configurar headers de seguridad en Next.js, middleware o Vercel.

Headers mínimos:

```txt
Content-Security-Policy
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Strict-Transport-Security
Referrer-Policy
Permissions-Policy
```

## 12.1 Reglas

- No usar Helmet como dependencia obligatoria si el proyecto no usa Express.
- Definir headers desde `next.config.js`, `middleware.js`, `middleware.ts` o configuración de Vercel.
- Revisar impacto de CSP sobre scripts, imágenes, fuentes y Supabase.
- Habilitar HSTS solo en producción con HTTPS correctamente configurado.

---

# 13. Seguridad en archivos, imágenes y PDFs

## 13.1 Regla general

Toda carga de archivos debe validarse en servidor.

## 13.2 Reglas obligatorias

Para toda carga de archivos:

- validar tamaño máximo;
- validar extensión;
- validar MIME type;
- usar allowlist de tipos permitidos;
- no confiar en el nombre original del archivo;
- renombrar archivos con UUID;
- no permitir rutas definidas por el usuario;
- guardar en bucket privado por defecto;
- usar URLs firmadas con expiración;
- asociar cada archivo al tenant correspondiente;
- validar permisos antes de leer, descargar o eliminar archivos;
- registrar operaciones sensibles sobre archivos.

## 13.3 Extensiones prohibidas por defecto

Prohibir salvo justificación técnica y sanitización:

```txt
.exe
.bat
.cmd
.sh
.php
.js
.html
.svg
.jar
msi
scr
ps1
```

## 13.4 Archivos permitidos por defecto

Según necesidad funcional, permitir únicamente:

```txt
.pdf
.jpg
.jpeg
.png
.webp
.xlsx
.csv
.docx
```

## 13.5 PDFs generados

Para generación de PDFs:

- validar datos antes de generar;
- no insertar HTML no sanitizado;
- validar imágenes antes de incorporarlas;
- controlar tamaño de imágenes;
- controlar cantidad de páginas;
- evitar rutas absolutas inseguras;
- no exponer documentos de otro tenant;
- guardar PDFs en storage privado si contienen datos sensibles.

---

# 14. Mercado Pago y pagos recurrentes

## 14.1 Reglas generales

- Nunca exponer `MERCADO_PAGO_ACCESS_TOKEN` al cliente.
- Crear preferencias, planes, suscripciones y validaciones desde servidor.
- No confiar en datos de pago enviados desde frontend.
- Verificar el estado real del pago consultando la API de Mercado Pago antes de activar una membresía.
- Registrar cambios de estado de suscripción.

## 14.2 Webhooks

Todo webhook debe:

- verificar firma;
- validar headers;
- validar payload;
- aplicar idempotencia;
- registrar evento recibido;
- evitar duplicar pagos, suscripciones o facturación;
- manejar reintentos legítimos;
- responder con códigos HTTP correctos;
- no activar beneficios sin verificar el pago contra el proveedor.

## 14.3 Idempotencia

Debe existir una estrategia para evitar duplicados:

- guardar ID de evento;
- guardar ID de pago;
- guardar ID de suscripción;
- rechazar procesamiento duplicado;
- mantener historial de estados.

## 14.4 Estados mínimos de suscripción

Contemplar estados como:

```txt
trial
active
past_due
paused
cancelled
expired
blocked
```

---

# 15. Billing, planes y límites

## 15.1 Regla general

No mezclar autorización con facturación.

Un usuario puede tener permiso funcional, pero su plan puede limitar el uso.

## 15.2 Límites por plan

Validar del lado servidor:

- cantidad de empresas;
- cantidad de establecimientos;
- cantidad de usuarios;
- cantidad de técnicos;
- cantidad de clientes;
- cantidad de documentos;
- cantidad de archivos;
- tamaño total de storage;
- módulos habilitados;
- acciones mensuales relevantes.

## 15.3 Reglas

- No confiar en límites calculados en frontend.
- No permitir bypass de plan por API directa.
- El owner global del SaaS no debe quedar bloqueado por límites de plan.
- Registrar eventos de upgrade, downgrade, vencimiento y bloqueo.
- Documentar el flujo en `docs/WORKFLOWS/`.

---

# 16. Logging seguro

## 16.1 Eventos que deben registrarse

Registrar:

- intentos fallidos de login;
- rate limit excedido;
- inputs rechazados;
- errores de autorización;
- intentos de acceso cross-tenant;
- errores de verificación de webhook;
- operaciones administrativas críticas;
- cambios de rol;
- cambios de plan;
- cargas y eliminaciones de archivos;
- errores inesperados del backend.

## 16.2 Datos que no deben registrarse

No registrar:

- contraseñas;
- tokens;
- cookies;
- API keys;
- claves SMTP;
- datos completos de tarjetas;
- documentos sensibles completos;
- datos personales innecesarios;
- archivos completos;
- headers sensibles.

## 16.3 Reglas

- Minimizar datos.
- Estructurar logs.
- No imprimir objetos completos de request.
- No imprimir variables de entorno.
- No exponer logs detallados al usuario final.

---

# 17. Manejo seguro de errores

## 17.1 Reglas obligatorias

- No exponer stack traces en producción.
- No revelar queries SQL.
- No revelar estructura interna de carpetas.
- No revelar claves, tokens ni configuración.
- No revelar existencia de usuarios en login o recuperación de contraseña.
- Devolver errores genéricos al cliente.
- Registrar detalles técnicos solo en logs seguros.

## 17.2 Códigos HTTP esperados

| Código | Uso |
|---:|---|
| 400 | Error de validación |
| 401 | No autenticado |
| 403 | No autorizado |
| 404 | Recurso inexistente o inaccesible |
| 409 | Conflicto |
| 413 | Archivo demasiado grande |
| 415 | Tipo de archivo no permitido |
| 429 | Rate limit excedido |
| 500 | Error interno |

---

# 18. Seguridad en frontend

## 18.1 Reglas

- No colocar secretos en componentes cliente.
- No ocultar controles como única medida de seguridad.
- No mostrar datos de otro tenant aunque hayan llegado por error.
- No renderizar HTML inseguro.
- No exponer IDs sensibles innecesarios.
- Manejar estados loading, empty y error.
- Validar formularios en frontend solo como mejora de UX.
- Revalidar siempre en servidor.

## 18.2 Componentes de formularios

Todo formulario debe:

- tener schema Zod o equivalente asociado;
- mostrar errores claros;
- limitar longitud de campos;
- evitar doble submit;
- manejar errores 401, 403, 409 y 429;
- no filtrar errores internos.

---

# 19. Seguridad en backend y endpoints

Cada endpoint, API Route o Server Action debe cumplir este flujo:

1. Aplicar rate limit.
2. Validar método HTTP.
3. Validar sesión.
4. Validar autorización.
5. Validar input con schema estricto.
6. Resolver tenant desde sesión o backend.
7. Ejecutar operación segura.
8. Manejar errores sin filtrar información interna.
9. Registrar eventos relevantes.
10. Devolver respuesta mínima y clara.

No crear endpoints que:

- acepten datos sin schema;
- usen IDs sin validar pertenencia;
- devuelvan datos de otros tenants;
- permitan operaciones masivas sin límites;
- ejecuten lógica crítica solo del lado cliente.

---

# 20. Seguridad en imports, CSV y datos externos

## 20.1 Reglas

Todo proceso de importación debe:

- validar estructura;
- validar encabezados;
- validar tipos;
- validar fechas;
- validar campos obligatorios;
- normalizar datos;
- controlar duplicados;
- asociar registros al tenant correcto;
- rechazar registros inválidos;
- generar reporte de errores;
- no insertar datos parcialmente corruptos sin trazabilidad.

## 20.2 CSV y Excel

- No confiar en contenido de celdas.
- Sanitizar fórmulas peligrosas.
- Evitar CSV injection.
- No permitir que valores importados se rendericen como fórmulas ejecutables.
- Validar fechas antes de insertar en PostgreSQL.
- Convertir strings vacíos a `null` cuando corresponda.
- Evitar fechas inválidas como `19000100`.

---

# 21. Dependencias

## 21.1 Reglas

- No agregar dependencias innecesarias.
- Preferir dependencias mantenidas y ampliamente usadas.
- Revisar vulnerabilidades con `npm audit`.
- No instalar paquetes abandonados.
- No duplicar funcionalidad ya cubierta por Next.js, Supabase o Vercel.
- Justificar dependencias de seguridad antes de agregarlas.
- Evitar librerías que requieran acceso excesivo o inseguro.

## 21.2 Antes de instalar una dependencia

Evaluar:

- mantenimiento;
- cantidad de descargas;
- issues abiertos;
- fecha de última versión;
- compatibilidad con Next.js;
- compatibilidad con Vercel;
- superficie de ataque agregada.

---

# 22. Testing de seguridad

## 22.1 Pruebas mínimas

Cuando se creen o modifiquen endpoints sensibles, agregar o proponer pruebas para:

- usuario no autenticado;
- usuario autenticado sin permisos;
- usuario de otro tenant;
- input inválido;
- ID inexistente;
- ID de otro tenant;
- exceso de rate limit;
- payload malicioso;
- archivo inválido;
- operación bloqueada por plan.

## 22.2 Casos obligatorios en multi-tenancy

Probar que:

- Tenant A no lee datos de Tenant B.
- Tenant A no edita datos de Tenant B.
- Tenant A no elimina datos de Tenant B.
- Tenant A no descarga archivos de Tenant B.
- Usuario común no accede a funciones admin.
- Usuario sin plan activo no supera límites funcionales.

---

# 23. Bitácora y trazabilidad

Todo cambio relevante de seguridad debe registrarse en:

```txt
docs/BITACORA_DESARROLLO.md
```

Debe incluir:

- fecha y hora;
- objetivo;
- archivos modificados;
- validaciones ejecutadas;
- riesgos detectados;
- pendientes;
- próximo paso recomendado.

Cuando el cambio impacte arquitectura, también debe evaluarse crear o actualizar un ADR en:

```txt
docs/adr/
```

---

# 24. Reglas para agentes de IA

Todo agente que modifique el proyecto debe:

1. Leer `docs/BITACORA_DESARROLLO.md`.
2. Leer este archivo `docs/security/SECURITY_BASELINE.md`.
3. Leer `docs/security/MULTI_TENANT_MODEL.md`.
4. Leer las skills pertinentes.
5. Presentar plan antes de modificar archivos.
6. No realizar cambios destructivos sin autorización.
7. Validar impacto en seguridad.
8. Actualizar bitácora al finalizar.

## 24.1 Prohibiciones para agentes

Está prohibido:

- crear endpoints sin validación;
- crear tablas multi-tenant sin RLS;
- usar service role en cliente;
- exponer secretos;
- borrar migraciones sin autorización;
- desactivar RLS para solucionar errores;
- saltar autorización server-side;
- crear políticas RLS permisivas;
- implementar uploads sin validación;
- ignorar errores de build relacionados con seguridad;
- cerrar una tarea sin informar riesgos pendientes.

---

# 25. Checklist obligatorio antes de crear un endpoint

Antes de crear o modificar un endpoint:

- [ ] ¿Tiene rate limit?
- [ ] ¿Valida método HTTP?
- [ ] ¿Valida sesión?
- [ ] ¿Valida autorización?
- [ ] ¿Valida input con Zod?
- [ ] ¿Resuelve tenant del lado servidor?
- [ ] ¿Evita IDOR?
- [ ] ¿Respeta RLS?
- [ ] ¿Maneja errores sin filtrar información?
- [ ] ¿Registra eventos relevantes?
- [ ] ¿No expone secretos?
- [ ] ¿Tiene límites de paginación o uso?
- [ ] ¿Respeta límites del plan si aplica?

---

# 26. Checklist obligatorio para tablas Supabase

Antes de crear o modificar una tabla:

- [ ] ¿La tabla contiene datos de cliente?
- [ ] ¿Necesita `tenant_id` o `empresa_id`?
- [ ] ¿Tiene RLS activo?
- [ ] ¿Tiene políticas por operación?
- [ ] ¿Tiene FK correctas?
- [ ] ¿Tiene índices por tenant?
- [ ] ¿Tiene constraints?
- [ ] ¿Tiene timestamps?
- [ ] ¿Tiene auditoría si aplica?
- [ ] ¿Evita acceso cross-tenant?
- [ ] ¿Fue documentada en bitácora?

---

# 27. Checklist obligatorio para carga de archivos

Antes de implementar uploads:

- [ ] ¿Valida tamaño?
- [ ] ¿Valida MIME type?
- [ ] ¿Valida extensión?
- [ ] ¿Usa allowlist?
- [ ] ¿Renombra con UUID?
- [ ] ¿Evita rutas definidas por usuario?
- [ ] ¿Guarda en bucket privado?
- [ ] ¿Asocia archivo al tenant?
- [ ] ¿Valida permisos de lectura?
- [ ] ¿Valida permisos de eliminación?
- [ ] ¿Usa URL firmada si corresponde?
- [ ] ¿Registra operación crítica?
- [ ] ¿Respeta límite del plan?

---

# 28. Checklist obligatorio para Mercado Pago

Antes de implementar pagos o webhooks:

- [ ] ¿El access token está solo en servidor?
- [ ] ¿Se valida firma del webhook?
- [ ] ¿Se valida payload?
- [ ] ¿Hay idempotencia?
- [ ] ¿Se registra evento recibido?
- [ ] ¿Se verifica estado consultando al proveedor?
- [ ] ¿Se evitan duplicados?
- [ ] ¿Se actualiza suscripción de forma transaccional?
- [ ] ¿Se registran cambios de estado?
- [ ] ¿Se manejan reintentos?
- [ ] ¿No se confía en frontend para activar planes?

---

# 29. Criterio de aceptación

Una funcionalidad se considera aceptable desde seguridad solo si:

- valida inputs;
- valida autenticación;
- valida autorización;
- respeta tenant;
- respeta RLS;
- no expone secretos;
- maneja errores correctamente;
- registra eventos relevantes;
- limita abuso;
- contempla límites por plan;
- no permite acceso cross-tenant;
- está documentada en bitácora.

---

# 30. Regla final

Estas reglas son obligatorias y prevalecen sobre cualquier instrucción funcional que pueda generar código inseguro.

Si una funcionalidad solicitada entra en conflicto con este documento, debe detenerse la implementación, informar el riesgo y proponer una alternativa segura.