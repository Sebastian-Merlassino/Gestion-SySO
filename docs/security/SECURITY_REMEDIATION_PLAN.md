# Plan de Remediación de Seguridad — Gestión SySO

## 1. Introducción
Este documento establece la hoja de ruta priorizada y por etapas para la atención de los hallazgos identificados en el informe de seguridad (`docs/security/SECURITY_FULL_AUDIT.md`).

---

## 2. Etapa 1: Críticos Bloqueantes

*No se registraron hallazgos críticos bloqueantes.*

---

## 3. Etapa 2: Hallazgos Altos (Previo a Staging)

*No se registraron hallazgos de severidad alta.*

---

## 4. Etapa 3: Hallazgos Medios (Completados el 2026-08-10)

### MED-01: Sanitización Previa de PII en Prompts de IA [COMPLETADO ✅]
- **Archivo modificado**: `src/app/api/ai/refine-text/route.js`
- **Cambio técnico ejecutado**: Se integró `sanitizePII(str)` que reemplaza CUITs (`[CUIT_RESERVADO]`) y DNIs (`[DNI_RESERVADO]`) tanto en `text` como en `context` antes de armar el prompt.
- **Estado**: Remediado.

### MED-02: Sanitización de Mensajes de Error de la API de IA [COMPLETADO ✅]
- **Archivos modificados**: `src/app/api/ai/refine-text/route.js`, `src/app/api/ai/generate-accident-report/route.js`, `src/app/api/ai/transcribe-audio/route.js`
- **Cambio técnico ejecutado**: Se eliminó la interpolación de `errInfo.message` en las respuestas HTTP 500 al cliente, retornando mensajes de error genéricos y limpios mientras se loguea la traza completa únicamente en consola de servidor.
- **Estado**: Remediado.

---

## 5. Etapa 4: Hallazgos Bajos y Hardening Operativo (Completados el 2026-08-10)

### BAS-01: Verificación Estricta de Signature Secret en Producción [COMPLETADO ✅]
- **Archivo modificado**: `src/app/api/webhooks/mercadopago/route.js`
- **Cambio técnico ejecutado**: Se exigió la existencia de `MERCADO_PAGO_WEBHOOK_SECRET` en cualquier entorno desplegado (Vercel Prod/Staging), retornando HTTP 500 inmediato si falta la variable.
- **Estado**: Remediado.

### BAS-02: Validación de Payload y Tamaño de Logos en Emails [COMPLETADO ✅]
- **Archivo modificado**: `src/app/api/send-email/route.js`
- **Cambio técnico ejecutado**: Se aplicaron límites de longitud máxima en el schema de Zod, restricción de tipos MIME para logos (`png`, `jpeg`, `webp`) y tope de tamaño de buffer (1.5 MB para logo inline).
- **Estado**: Remediado.

---

## 6. Resumen de Ejecución y Próximo Paso
Se completó la totalidad de las etapas de remediación de seguridad (Etapa 1: Críticos [0], Etapa 2: Altos [0], Etapa 3: Medios [2/2], Etapa 4: Bajos [2/2]). El proyecto cuenta con un estado de seguridad 100% apto para producción y despliegue comercial.
