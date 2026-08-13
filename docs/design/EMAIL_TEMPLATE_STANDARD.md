# Estándar Unificado de Diseño Estético para Correos Electrónicos — Gestión SySO

**Código de Estándar:** `SySO-Email-Template-Standard-v1.0`  
**Fecha de Publicación:** 13 de Agosto de 2026  
**Aplica a:** Todos los correos del sistema (Auth, Restablecimiento de clave, Confirmación de cuenta, Constancias de Visita, Avisos de Riesgo, Control Eléctrico, Checklists Personalizados, Protocolos de Iluminación/Ruido/Ergonomía, Capacitaciones Virtuales).

---

## 1. Principios Visuales y Paleta Oficial

Todos los correos despachados por la plataforma deben respetar la identidad corporativa definida en `docs/brand/BRAND_GUIDELINES.md` y `AGENTS.md`:

- **Barra Superior de Acento:** Relleno de `6px` de alto con el color primario de marca `#468DFF`.
- **Fondo General del Mensaje:** `#F8FAFC` (Slate-50).
- **Contenedor Tarjeta Principal:** Fondo blanco `#FFFFFF`, bordes definidos con el gris secundario oficial `#D9D9D9` (`border: 1px solid #D9D9D9`), radio de esquinas `16px`, sombra sutil `box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05)`.
- **Títulos Principales:** `#0F172A` (Slate-900), peso `800` (extra bold), tamaño `22px`.
- **Subtítulos y Enlaces Destacados:** Azul corporativo `#468DFF`, peso `600`, mayúsculas con tracking espaciado (`letter-spacing: 0.06em`).
- **Botón Primario de Acción (CTA):**
  - Relleno (Background): `#468DFF`
  - Texto: `#FFFFFF` (negrita `700`, `15px`)
  - Bordes redondeados: `12px`
  - Sombra: `box-shadow: 0 4px 14px rgba(70, 141, 255, 0.35)`
- **Cajas de Resaltado Informativo (Cajas Secundarias):** Fondo `#F8FAFC`, borde `#D9D9D9`, radio `12px`.
- **Cajas de Advertencia / Seguridad:** Fondo `#FFF7ED`, borde `#FED7AA`, texto `#9A3412` (Amber/Orange).
- **Pie de Página (Footer):**
  - Fondo `#F8FAFC` con borde superior `#D9D9D9`.
  - Título del producto: `Gestión <span style="color: #468DFF;">SySO</span>` (`color: #0F172A; font-size: 13px; font-weight: 700;`).
  - Leyenda institucional: `Plataforma SaaS de Higiene y Seguridad Ocupacional.` (`color: #475569; font-size: 12px; font-weight: 600;`).
  - Copyright y Derechos: `© {{ANIO}} Gestión SySO. Todos los derechos reservados.` (`color: #475569; font-size: 12px; font-weight: 600;` con alto contraste y legibilidad clara).

---

## 2. Embebido de Logos via CID Inline (Obligatorio)

Para evitar que los clientes de correo (Gmail, Outlook, Apple Mail, Yahoo) bloqueen la carga de imágenes o muestren iconos de imágenes rotas:

1. **Nunca usar únicamente URLs HTTP externas** para el logo principal.
2. **Utilizar adjuntos inline CID (Content-ID)** en Nodemailer (`cid:syso_brand_logo` para la marca o `cid:tenantlogo` para empresas cliente).
3. **Fallback en HTML:** Renderizar `<img src="cid:${cidName}" alt="Logo" width="210" style="max-width: 210px; height: auto; display: block; margin: 0 auto;" />`.

---

## 3. Estructura HTML Estándar Reutilizable

```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{{SUBJECT}} — Gestión SySO</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: 'Segoe UI', Inter, Helvetica, Arial, sans-serif; color: #0f172a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f8fafc; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05); border: 1px solid #D9D9D9;">
          
          <!-- Barra Superior de Acento de Marca (#468DFF) -->
          <tr>
            <td style="background-color: #468DFF; height: 6px; font-size: 0; line-height: 0;">&nbsp;</td>
          </tr>

          <!-- Encabezado con Logo Embebido CID -->
          <tr>
            <td style="padding: 32px 32px 24px 32px; text-align: center; background-color: #ffffff; border-bottom: 1px solid #D9D9D9;">
              <img src="cid:{{LOGO_CID}}" alt="{{TENANT_O_MARCA}}" width="210" style="max-width: 210px; max-height: 72px; object-fit: contain; display: block; margin: 0 auto;" />
            </td>
          </tr>

          <!-- Título y Categoría -->
          <tr>
            <td style="padding: 32px 32px 0 32px; text-align: center;">
              <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #0f172a; letter-spacing: -0.02em;">
                {{TITULO_DEL_CORREO}}
              </h1>
              <p style="margin: 6px 0 0 0; font-size: 13px; font-weight: 600; color: #468DFF; text-transform: uppercase; letter-spacing: 0.06em;">
                {{CATEGORIA_O_SUBTITULO}}
              </p>
              <div style="width: 40px; height: 3px; background-color: #468DFF; border-radius: 2px; margin: 16px auto 0 auto;"></div>
            </td>
          </tr>

          <!-- Contenido Principal -->
          <tr>
            <td style="padding: 24px 32px;">
              <div style="font-size: 15px; line-height: 1.7; color: #334155;">
                {{CUERPO_DEL_MENSAJE}}
              </div>
            </td>
          </tr>

          <!-- Botón de Acción (Opcional) -->
          {{#IF_CTA}}
          <tr>
            <td style="padding: 0 32px 32px 32px; text-align: center;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto;">
                <tr>
                  <td style="background-color: #468DFF; border-radius: 12px; box-shadow: 0 4px 14px rgba(70, 141, 255, 0.35);">
                    <a href="{{CTA_URL}}" target="_blank" style="display: inline-block; padding: 16px 36px; font-size: 15px; font-weight: 700; color: #ffffff; text-decoration: none; border-radius: 12px; background-color: #468DFF;">
                      {{CTA_TEXTO}} →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          {{/IF_CTA}}

          <!-- Pie de Página Institucional (Estándar de Contraste y Leyenda) -->
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #D9D9D9; padding: 24px 32px; text-align: center;">
              <p style="margin: 0 0 6px 0; font-size: 13px; font-weight: 700; color: #0f172a;">
                Gestión <span style="color: #468DFF;">SySO</span>
              </p>
              <p style="margin: 0 0 6px 0; font-size: 12px; font-weight: 600; color: #475569;">
                Plataforma SaaS de Higiene y Seguridad Ocupacional.
              </p>
              <p style="margin: 0; font-size: 12px; font-weight: 600; color: #475569;">
                © {{ANIO}} Gestión SySO. Todos los derechos reservados.
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

## 4. Regla de Cumplimiento para Agentes

Ningún módulo ni endpoint backend debe despachar correos en texto plano crudo o con HTML improvisado. Toda integración de envío de emails en `src/app/api/` debe implementar o consumir `SySO-Email-Template-Standard-v1.0`.
