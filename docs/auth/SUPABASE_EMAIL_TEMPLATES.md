# Plantillas Oficiales de Correo Electrónico — Supabase Auth

**Código de Estándar:** `SySO-Supabase-Auth-Emails-v1.0`  
**Dominio Corporativo:** `gestionsyso.com`  
**Remitente Oficial:** `Gestión SySO <no-reply@gestionsyso.com>`  
**Soporte Técnico:** `soporte@gestionsyso.com`  

---

## 1. Configuración General en el Panel de Supabase

Para aplicar estas plantillas en tu proyecto de producción:

1. Ingresá a [Supabase Dashboard](https://supabase.com/dashboard) ➔ Seleccioná tu proyecto.
2. Andá a **Authentication** ➔ **SMTP Settings** (Configuración de Correo):
   - **Enable Custom SMTP:** `Activado`
   - **Sender Email:** `no-reply@gestionsyso.com`
   - **Sender Name:** `Gestión SySO`
   - **Host:** `smtp.gmail.com`
   - **Port:** `587`
   - **User:** `notificaciones@gestionsyso.com`
   - **Password:** `[Tu Contraseña de Aplicación de Google Workspace]`
3. Andá a **Authentication** ➔ **Email Templates** y copiá los bloques HTML correspondientes a cada evento listados a continuación.

---

## 2. Plantilla: Confirm Signup (Confirmación de Cuenta)

> **Asunto:** `Confirmá tu cuenta en Gestión SySO`

```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Confirmá tu cuenta — Gestión SySO</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: 'Segoe UI', Inter, Helvetica, Arial, sans-serif; color: #0f172a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f8fafc; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05); border: 1px solid #D9D9D9;">
          
          <!-- Barra Superior de Marca (#468DFF) -->
          <tr>
            <td style="background-color: #468DFF; height: 6px; font-size: 0; line-height: 0;">&nbsp;</td>
          </tr>

          <!-- Encabezado con Nombre de Plataforma -->
          <tr>
            <td style="padding: 32px 32px 24px 32px; text-align: center; background-color: #ffffff; border-bottom: 1px solid #D9D9D9;">
              <h2 style="margin: 0; font-size: 24px; font-weight: 800; color: #0f172a; letter-spacing: -0.025em;">
                Gestión <span style="color: #468DFF;">SySO</span>
              </h2>
            </td>
          </tr>

          <!-- Título del Mensaje -->
          <tr>
            <td style="padding: 32px 32px 0 32px; text-align: center;">
              <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #0f172a; letter-spacing: -0.02em;">
                ¡Bienvenido a Gestión SySO!
              </h1>
              <p style="margin: 6px 0 0 0; font-size: 13px; font-weight: 600; color: #468DFF; text-transform: uppercase; letter-spacing: 0.06em;">
                Verificación de Cuenta de Usuario
              </p>
              <div style="width: 40px; height: 3px; background-color: #468DFF; border-radius: 2px; margin: 16px auto 0 auto;"></div>
            </td>
          </tr>

          <!-- Cuerpo Principal -->
          <tr>
            <td style="padding: 24px 32px;">
              <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.7; color: #334155;">
                Hola,
              </p>
              <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.7; color: #334155;">
                Gracias por registrarte en <strong style="color: #0f172a;">Gestión SySO</strong>, la plataforma integral para la gestión profesional de Higiene, Seguridad y Medio Ambiente.
              </p>
              <p style="margin: 0 0 28px 0; font-size: 15px; line-height: 1.7; color: #334155;">
                Para activar tu cuenta y configurar tu espacio de trabajo, hacé clic en el botón a continuación:
              </p>
            </td>
          </tr>

          <!-- Botón Primario de Acción (CTA) -->
          <tr>
            <td style="padding: 0 32px 32px 32px; text-align: center;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto;">
                <tr>
                  <td style="background-color: #468DFF; border-radius: 12px; box-shadow: 0 4px 14px rgba(70, 141, 255, 0.35);">
                    <a href="{{ .ConfirmationURL }}" target="_blank" style="display: inline-block; padding: 16px 36px; font-size: 15px; font-weight: 700; color: #ffffff; text-decoration: none; border-radius: 12px; background-color: #468DFF;">
                      Confirmar mi Cuenta →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Enlace Alternativo Directo -->
          <tr>
            <td style="padding: 0 32px 24px 32px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f8fafc; border: 1px solid #D9D9D9; border-radius: 12px;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <p style="margin: 0 0 6px 0; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">
                      Enlace Alternativo
                    </p>
                    <p style="margin: 0 0 8px 0; font-size: 12px; line-height: 1.5; color: #64748b;">
                      Si el botón no funciona, copiá y pegá la siguiente URL en tu navegador:
                    </p>
                    <p style="margin: 0;">
                      <a href="{{ .ConfirmationURL }}" target="_blank" style="color: #468DFF; font-size: 11px; word-break: break-all; line-height: 1.4; text-decoration: underline;">
                        {{ .ConfirmationURL }}
                      </a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Caja de Seguridad y Aviso No-Reply -->
          <tr>
            <td style="padding: 0 32px 28px 32px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;">
                <tr>
                  <td style="padding: 12px 16px; text-align: center;">
                    <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #64748b;">
                      ℹ️ Este es un correo automático generado por el sistema (No-Reply). Por favor no respondas a este mensaje. Ante cualquier consulta técnica, podés escribir a <a href="mailto:soporte@gestionsyso.com" style="color: #468DFF; font-weight: 600; text-decoration: underline;">soporte@gestionsyso.com</a>.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Pie de Página Institucional -->
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #D9D9D9; padding: 24px 32px; text-align: center;">
              <p style="margin: 0 0 6px 0; font-size: 13px; font-weight: 700; color: #0f172a;">
                Gestión <span style="color: #468DFF;">SySO</span>
              </p>
              <p style="margin: 0 0 6px 0; font-size: 12px; font-weight: 600; color: #475569;">
                Plataforma SaaS de Higiene y Seguridad Ocupacional.
              </p>
              <p style="margin: 0; font-size: 12px; font-weight: 600; color: #475569;">
                © Gestión SySO. Todos los derechos reservados.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## 3. Plantilla: Invite User (Invitación a Equipo / Workspace)

> **Asunto:** `Te invitaron a sumarte a Gestión SySO`

```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Invitación a Equipo — Gestión SySO</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: 'Segoe UI', Inter, Helvetica, Arial, sans-serif; color: #0f172a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f8fafc; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05); border: 1px solid #D9D9D9;">
          
          <!-- Barra Superior de Marca (#468DFF) -->
          <tr>
            <td style="background-color: #468DFF; height: 6px; font-size: 0; line-height: 0;">&nbsp;</td>
          </tr>

          <!-- Encabezado con Nombre de Plataforma -->
          <tr>
            <td style="padding: 32px 32px 24px 32px; text-align: center; background-color: #ffffff; border-bottom: 1px solid #D9D9D9;">
              <h2 style="margin: 0; font-size: 24px; font-weight: 800; color: #0f172a; letter-spacing: -0.025em;">
                Gestión <span style="color: #468DFF;">SySO</span>
              </h2>
            </td>
          </tr>

          <!-- Título del Mensaje -->
          <tr>
            <td style="padding: 32px 32px 0 32px; text-align: center;">
              <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #0f172a; letter-spacing: -0.02em;">
                Invitación a Equipo de Trabajo
              </h1>
              <p style="margin: 6px 0 0 0; font-size: 13px; font-weight: 600; color: #468DFF; text-transform: uppercase; letter-spacing: 0.06em;">
                Colaboración en Higiene y Seguridad
              </p>
              <div style="width: 40px; height: 3px; background-color: #468DFF; border-radius: 2px; margin: 16px auto 0 auto;"></div>
            </td>
          </tr>

          <!-- Cuerpo Principal -->
          <tr>
            <td style="padding: 24px 32px;">
              <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.7; color: #334155;">
                Hola,
              </p>
              <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.7; color: #334155;">
                Fuiste invitado a unirte como profesional técnico a un espacio de trabajo en <strong style="color: #0f172a;">Gestión SySO</strong>.
              </p>
              <p style="margin: 0 0 28px 0; font-size: 15px; line-height: 1.7; color: #334155;">
                Para aceptar la invitación y definir tu clave de acceso, hacé clic en el botón siguiente:
              </p>
            </td>
          </tr>

          <!-- Botón Primario de Acción (CTA) -->
          <tr>
            <td style="padding: 0 32px 32px 32px; text-align: center;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto;">
                <tr>
                  <td style="background-color: #468DFF; border-radius: 12px; box-shadow: 0 4px 14px rgba(70, 141, 255, 0.35);">
                    <a href="{{ .ConfirmationURL }}" target="_blank" style="display: inline-block; padding: 16px 36px; font-size: 15px; font-weight: 700; color: #ffffff; text-decoration: none; border-radius: 12px; background-color: #468DFF;">
                      Aceptar Invitación →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Enlace Alternativo Directo -->
          <tr>
            <td style="padding: 0 32px 24px 32px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f8fafc; border: 1px solid #D9D9D9; border-radius: 12px;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <p style="margin: 0 0 6px 0; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">
                      Enlace Alternativo
                    </p>
                    <p style="margin: 0 0 8px 0; font-size: 12px; line-height: 1.5; color: #64748b;">
                      Si el botón no abre correctamente, podés pegar este enlace en tu navegador:
                    </p>
                    <p style="margin: 0;">
                      <a href="{{ .ConfirmationURL }}" target="_blank" style="color: #468DFF; font-size: 11px; word-break: break-all; line-height: 1.4; text-decoration: underline;">
                        {{ .ConfirmationURL }}
                      </a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Caja de Seguridad y Aviso No-Reply -->
          <tr>
            <td style="padding: 0 32px 28px 32px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;">
                <tr>
                  <td style="padding: 12px 16px; text-align: center;">
                    <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #64748b;">
                      ℹ️ Este es un correo automático generado por el sistema (No-Reply). Por favor no respondas a este mensaje. Ante cualquier consulta técnica, podés escribir a <a href="mailto:soporte@gestionsyso.com" style="color: #468DFF; font-weight: 600; text-decoration: underline;">soporte@gestionsyso.com</a>.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Pie de Página Institucional -->
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #D9D9D9; padding: 24px 32px; text-align: center;">
              <p style="margin: 0 0 6px 0; font-size: 13px; font-weight: 700; color: #0f172a;">
                Gestión <span style="color: #468DFF;">SySO</span>
              </p>
              <p style="margin: 0 0 6px 0; font-size: 12px; font-weight: 600; color: #475569;">
                Plataforma SaaS de Higiene y Seguridad Ocupacional.
              </p>
              <p style="margin: 0; font-size: 12px; font-weight: 600; color: #475569;">
                © Gestión SySO. Todos los derechos reservados.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```
