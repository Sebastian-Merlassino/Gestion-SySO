// src/app/api/auth/reset-password-request/route.js
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';

const resetRequestSchema = z.object({
  type: z.enum(['profesional', 'cliente']),
  email: z.string().email('Dirección de correo electrónico inválida.').optional().nullable(),
  cuit: z.string().optional().nullable(),
});

export async function POST(request) {
  try {
    const body = await request.json();
    const parseResult = resetRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Parámetros de solicitud inválidos.', details: parseResult.error.format() },
        { status: 400 }
      );
    }

    const { type, email, cuit } = parseResult.data;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseSecretKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

    if (!supabaseUrl || !supabaseSecretKey) {
      console.error('[Reset Password API Error] Faltan variables de entorno de Supabase Service Role.');
      return NextResponse.json(
        { error: 'Error de configuración del servidor. Por favor, contacte a soporte.' },
        { status: 500 }
      );
    }

    const adminClient = createClient(supabaseUrl, supabaseSecretKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    let targetEmail = '';

    if (type === 'profesional') {
      if (!email) {
        return NextResponse.json(
          { error: 'Por favor, ingrese una dirección de correo electrónico válida.' },
          { status: 400 }
        );
      }
      targetEmail = email.trim().toLowerCase();
    } else {
      // Tipo CLIENTE (por CUIT)
      const cleanCuit = (cuit || '').replace(/[^0-9]/g, '');
      if (cleanCuit.length !== 11) {
        return NextResponse.json(
          { error: 'El CUIT debe contener exactamente 11 números enteros.' },
          { status: 400 }
        );
      }

      // Buscar email asociado en la tabla profiles
      const { data: profile, error: dbError } = await adminClient
        .from('profiles')
        .select('email')
        .eq('cuit', cleanCuit)
        .eq('role', 'cliente')
        .maybeSingle();

      if (dbError) {
        console.error('[Reset Password API Error] Error buscando CUIT:', dbError);
      }

      if (!profile || !profile.email) {
        // Respuesta genérica defensiva para evitar cosechado de CUITs
        return NextResponse.json({
          success: true,
          message: '¡Enlace enviado! Revisá tu bandeja de entrada y spam para restablecer tu clave.',
        });
      }

      targetEmail = profile.email.trim().toLowerCase();
    }

    // Determinar la URL base de la aplicación (producción o local)
    const appUrl = process.env.APP_URL || new URL(request.url).origin;

    // Generar enlace seguro de recuperación via Supabase Admin API
    const { data: linkData, error: genError } = await adminClient.auth.admin.generateLink({
      type: 'recovery',
      email: targetEmail,
    });

    if (genError) {
      console.error('[Reset Password API] Error al generar token de recuperación:', genError);
      // Si el correo no existe en auth.users, responder con mensaje neutro por seguridad
      return NextResponse.json({
        success: true,
        message: '¡Enlace enviado! Revisá tu bandeja de entrada y spam para restablecer tu clave.',
      });
    }

    // Extraer el hashed_token que permite verificar el OTP directamente en el cliente
    const hashedToken = linkData?.properties?.hashed_token;

    if (!hashedToken) {
      console.error('[Reset Password API] No se obtuvo hashed_token en la respuesta de Supabase Admin.');
      return NextResponse.json({
        success: true,
        message: '¡Enlace enviado! Revisá tu bandeja de entrada y spam para restablecer tu clave.',
      });
    }

    // Construir enlace que pasa por la verificación server-side.
    const resetLink = `${appUrl}/api/auth/verify-recovery?token_hash=${encodeURIComponent(hashedToken)}&type=recovery`;

    // Cargar logo local para adjuntar como inline CID (se muestra siempre en cualquier cliente de correo)
    let logoSrc = `${appUrl}/brand/logo-black.png`;
    const mailAttachments = [];

    try {
      const logoPath = path.join(process.cwd(), 'public', 'brand', 'logo-black.png');
      if (fs.existsSync(logoPath)) {
        const logoBuffer = fs.readFileSync(logoPath);
        mailAttachments.push({
          filename: 'logo-black.png',
          content: logoBuffer,
          cid: 'syso_brand_logo',
        });
        logoSrc = 'cid:syso_brand_logo';
      }
    } catch (logoErr) {
      console.error('[Reset Password API] Error cargando logo local para CID:', logoErr);
    }

    // Configuración SMTP
    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587;
    const user_smtp = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const from = process.env.SMTP_FROM || user_smtp || 'no-reply@gestionsyso.com';
    const senderName = process.env.SMTP_SENDER_NAME || 'Gestión SySO';

    if (host && user_smtp && pass) {
      console.log(`[Reset Password API] Despachando correo de restablecimiento a ${targetEmail} via ${host}:${port}`);

      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: {
          user: user_smtp,
          pass,
        },
      });

      const mailHtml = `
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Restablecer Contraseña — Gestión SySO</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: 'Segoe UI', Inter, Helvetica, Arial, sans-serif; color: #0f172a;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f8fafc; padding: 40px 16px;">
            <tr>
              <td align="center">
                <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05); border: 1px solid #D9D9D9;">
                  
                  <!-- Barra Superior con Color de Marca (#468DFF) -->
                  <tr>
                    <td style="background-color: #468DFF; height: 6px; font-size: 0; line-height: 0;">&nbsp;</td>
                  </tr>

                  <!-- Header con Logo Oficial de la Marca -->
                  <tr>
                    <td style="padding: 32px 32px 24px 32px; text-align: center; background-color: #ffffff; border-bottom: 1px solid #D9D9D9;">
                      <img src="${logoSrc}" alt="Gestión SySO — Marca Registrada" width="210" style="max-width: 210px; height: auto; display: block; margin: 0 auto; outline: none; border: none; text-decoration: none;" />
                    </td>
                  </tr>

                  <!-- Encabezado de la Notificación -->
                  <tr>
                    <td style="padding: 32px 32px 0 32px; text-align: center;">
                      <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #0f172a; letter-spacing: -0.02em;">
                        Restablecimiento de Contraseña
                      </h1>
                      <p style="margin: 6px 0 0 0; font-size: 13px; font-weight: 600; color: #468DFF; text-transform: uppercase; letter-spacing: 0.06em;">
                        Acceso Seguro a la Plataforma
                      </p>
                      <div style="width: 40px; height: 3px; background-color: #468DFF; border-radius: 2px; margin: 16px auto 0 auto;"></div>
                    </td>
                  </tr>

                  <!-- Cuerpo del Mensaje -->
                  <tr>
                    <td style="padding: 24px 32px;">
                      <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.7; color: #334155;">
                        Hola,
                      </p>
                      <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.7; color: #334155;">
                        Recibimos una solicitud para restablecer la clave de acceso de tu cuenta en la plataforma de <strong style="color: #0f172a;">Gestión SySO</strong>.
                      </p>
                      <p style="margin: 0 0 28px 0; font-size: 15px; line-height: 1.7; color: #334155;">
                        Para definir una nueva contraseña de forma rápida y segura, hacé clic en el botón principal a continuación:
                      </p>
                    </td>
                  </tr>

                  <!-- Botón Primario de Acción (Estándar de Marca #468DFF) -->
                  <tr>
                    <td style="padding: 0 32px 32px 32px; text-align: center;">
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto;">
                        <tr>
                          <td style="background-color: #468DFF; border-radius: 12px; box-shadow: 0 4px 14px rgba(70, 141, 255, 0.35);">
                            <a href="${resetLink}" target="_blank" style="display: inline-block; padding: 16px 36px; font-size: 15px; font-weight: 700; color: #ffffff; text-decoration: none; letter-spacing: 0.01em; border-radius: 12px; background-color: #468DFF;">
                              Restablecer mi Contraseña →
                            </a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- Enlace Secundario Alternativo -->
                  <tr>
                    <td style="padding: 0 32px 24px 32px;">
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f8fafc; border: 1px solid #D9D9D9; border-radius: 12px;">
                        <tr>
                          <td style="padding: 16px 20px;">
                            <p style="margin: 0 0 6px 0; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">
                              Enlace Alternativo Directo
                            </p>
                            <p style="margin: 0 0 8px 0; font-size: 12px; line-height: 1.5; color: #64748b;">
                              Si el botón no abre correctamente, podés copiar y pegar la siguiente dirección en tu navegador:
                            </p>
                            <p style="margin: 0;">
                              <a href="${resetLink}" target="_blank" style="color: #468DFF; font-size: 11px; word-break: break-all; line-height: 1.4; text-decoration: underline;">
                                ${resetLink}
                              </a>
                            </p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- Caja de Aviso de Seguridad -->
                  <tr>
                    <td style="padding: 0 32px 28px 32px;">
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #fff7ed; border: 1px solid #fed7aa; border-radius: 12px;">
                        <tr>
                          <td style="padding: 16px 20px;">
                            <p style="margin: 0; font-size: 12px; line-height: 1.6; color: #9a3412;">
                              <strong>Aviso de Seguridad:</strong> Este enlace expirará automáticamente en 1 hora y solo puede utilizarse una vez. Si no solicitaste este cambio, podés ignorar este correo sin ningún riesgo.
                            </p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- Footer Oficial con Colores Corporativos -->
                  <tr>
                    <td style="background-color: #f8fafc; border-top: 1px solid #D9D9D9; padding: 24px 32px; text-align: center;">
                      <p style="margin: 0 0 6px 0; font-size: 13px; font-weight: 700; color: #0f172a;">
                        Gestión <span style="color: #468DFF;">SySO</span>
                      </p>
                      <p style="margin: 0 0 6px 0; font-size: 12px; font-weight: 600; color: #475569;">
                        Plataforma SaaS de Higiene y Seguridad Ocupacional.
                      </p>
                      <p style="margin: 0; font-size: 12px; font-weight: 600; color: #475569;">
                        © ${new Date().getFullYear()} Gestión SySO. Todos los derechos reservados.
                      </p>
                    </td>
                  </tr>

                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `;

      await transporter.sendMail({
        from: `"${senderName}" <${from}>`,
        to: targetEmail,
        subject: 'Restablecé tu contraseña — Gestión SySO',
        html: mailHtml,
        attachments: mailAttachments,
      });

      console.log(`[Reset Password API] Correo enviado exitosamente a ${targetEmail}`);
    } else {
      console.log('[Reset Password API] Modo desarrollo / SMTP no configurado.');
      console.log('[Reset Password API] Recovery resetLink:', resetLink);
    }

    return NextResponse.json({
      success: true,
      message: '¡Enlace enviado! Revisá tu bandeja de entrada y spam para restablecer tu clave.',
    });
  } catch (err) {
    console.error('[Reset Password API] Excepción no controlada:', err);
    return NextResponse.json(
      { error: 'Ocurrió un error inesperado al procesar la solicitud. Por favor, intente nuevamente.' },
      { status: 500 }
    );
  }
}
