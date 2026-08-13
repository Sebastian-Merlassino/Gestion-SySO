// src/app/api/send-email/route.js
import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import nodemailer from 'nodemailer';
import { z } from 'zod';

const sendEmailSchema = z.object({
  emails: z.union([
    z.string().min(1, 'El destinatario es requerido.'),
    z.array(z.string().email('Dirección de correo electrónico inválida.'))
  ]),
  filePath: z.string().max(500).optional().nullable(),
  customSubject: z.string().max(300).optional().nullable(),
  customMessage: z.string().max(10000).optional().nullable(),
  companyName: z.string().max(200).optional(),
  establishmentName: z.string().max(200).optional(),
  date: z.string().max(100).optional(),
  inspectorName: z.string().max(200).optional(),
  tenantLogoBase64: z.string().max(2 * 1024 * 1024, 'El logo excede el tamaño máximo permitido de 2 MB.').nullable().optional(),
  tenantName: z.string().max(200).optional(),
  documentType: z.string().max(100).optional(), // can be 'aviso_riesgo', 'capacitacion_online', etc.
  checklistName: z.string().max(200).optional()
});

export async function POST(request) {
  try {
    // ── Autenticación: solo usuarios con sesión activa pueden enviar correos ──
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const cookieStore = cookies();

    const serverClient = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        get(name) { return cookieStore.get(name)?.value; },
        set(name, value, options) { cookieStore.set({ name, value, ...options }); },
        remove(name, options) { cookieStore.set({ name, value: '', ...options }); },
      },
    });

    const { data: { user }, error: authError } = await serverClient.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'No autorizado. Debe iniciar sesión para enviar correos.' },
        { status: 401 }
      );
    }

    // Obtener perfil para verificar rol (sólo admin o miembro del tenant pueden enviar mails)
    const { data: profile, error: profError } = await serverClient
      .from('profiles')
      .select('role, tenant_id')
      .eq('id', user.id)
      .single();

    if (profError || !profile) {
      return NextResponse.json(
        { error: 'No se pudo verificar el perfil del usuario.' },
        { status: 403 }
      );
    }

    if (profile.role !== 'admin' && profile.role !== 'miembro') {
      return NextResponse.json(
        { error: 'No autorizado. Solo el personal técnico o administradores del tenant pueden enviar constancias por email.' },
        { status: 403 }
      );
    }
    // ─────────────────────────────────────────────────────────────────────────

    const body = await request.json();
    const parseResult = sendEmailSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json({ 
        error: 'Parámetros inválidos.', 
        details: parseResult.error.format() 
      }, { status: 400 });
    }
    const { emails, filePath, customSubject, customMessage, companyName, establishmentName, date, inspectorName, tenantLogoBase64, tenantName, documentType, checklistName } = parseResult.data;

    // Sanitización HTML para evitar inyección en el correo (HIGH-02)
    const escapeHtml = (str) => {
      if (!str) return '';
      return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    };

    const companyNameEscaped = escapeHtml(companyName);
    const establishmentNameEscaped = escapeHtml(establishmentName);
    const dateEscaped = escapeHtml(date);
    const inspectorNameEscaped = escapeHtml(inspectorName);
    const tenantNameEscaped = escapeHtml(tenantName);
    const checklistNameEscaped = escapeHtml(checklistName);

    // Convert comma-separated string to array if necessary
    const emailList = Array.isArray(emails)
      ? emails
      : emails.split(',').map(e => e.trim()).filter(Boolean);

    if (emailList.length === 0) {
      return NextResponse.json(
        { error: 'Debe especificar al menos un destinatario válido.' },
        { status: 400 }
      );
    }

    // Validar formato de correos destinatarios
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = emailList.filter(email => !emailRegex.test(email));
    if (invalidEmails.length > 0) {
      return NextResponse.json(
        { error: `Se detectaron correos electrónicos inválidos: ${invalidEmails.join(', ')}` },
        { status: 400 }
      );
    }

    // Inline attachments list
    const attachments = [];

    // Descargar el PDF desde Supabase Storage si se especifica un filePath (RLS valida el acceso)
    if (filePath) {
      console.log(`[API Send-Email] Downloading PDF from Storage: ${filePath}`);
      const { data: fileData, error: downloadErr } = await serverClient.storage
        .from('documents')
        .download(filePath);

      if (downloadErr || !fileData) {
        console.error('[API Send-Email] Failed to download PDF from storage:', downloadErr);
        return NextResponse.json(
          { error: 'El archivo adjunto no existe o no se tienen permisos para acceder a él.' },
          { status: 403 }
        );
      }

      const pdfBuffer = Buffer.from(await fileData.arrayBuffer());

      // Validar tamaño máximo del PDF adjunto (5 MB)
      if (pdfBuffer.length > 5 * 1024 * 1024) {
        return NextResponse.json(
          { error: 'El archivo PDF adjunto excede el tamaño máximo permitido de 5 MB.' },
          { status: 413 }
        );
      }

      // Validar firma mágica del PDF
      if (pdfBuffer.length < 4 || pdfBuffer.toString('ascii', 0, 4) !== '%PDF') {
        return NextResponse.json(
          { error: 'El archivo adjunto no es un documento PDF válido.' },
          { status: 415 }
        );
      }

      const isAvisoRiesgo = documentType === 'aviso_riesgo';
      const isControlElectrico = documentType === 'control_electrico';
      const isChecklistPersonalizado = documentType === 'checklist_personalizado';
      const isProtocoloIluminacion = documentType === 'protocolo_iluminacion';

      attachments.push({
        filename: isAvisoRiesgo
          ? `Aviso_Riesgo_${(companyName || 'Cliente').replace(/\s+/g, '_')}_${date || 'aviso'}.pdf`
          : isControlElectrico
          ? `Inspección_Visual_Instalaciones_Eléctricas_${(companyName || 'Cliente').replace(/\s+/g, '_')}_${date || 'control'}.pdf`
          : isChecklistPersonalizado
          ? `Checklist_${(checklistName || 'Personalizado').replace(/\s+/g, '_')}_${(companyName || 'Cliente').replace(/\s+/g, '_')}_${date || 'checklist'}.pdf`
          : isProtocoloIluminacion
          ? `Protocolo_Iluminacion_${(companyName || 'Cliente').replace(/\s+/g, '_')}_${date || 'iluminacion'}.pdf`
          : `Constancia_Visita_${(companyName || 'Cliente').replace(/\s+/g, '_')}_${date || 'visita'}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf'
      });
    }

    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587;
    const user_smtp = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const from = process.env.SMTP_FROM || user_smtp || 'no-reply@gestionsyso.com';

    const isAvisoRiesgo = documentType === 'aviso_riesgo';
    const isControlElectrico = documentType === 'control_electrico';
    const isChecklistPersonalizado = documentType === 'checklist_personalizado';
    const isProtocoloIluminacion = documentType === 'protocolo_iluminacion';
    const isCapacitacionOnline = documentType === 'capacitacion_online';

    const mailSubject = customSubject
      ? customSubject
      : isAvisoRiesgo
      ? `Aviso de Riesgo de Higiene y Seguridad - ${companyName || 'Cliente'}`
      : isControlElectrico
      ? `Inspección Visual de Instalaciones Eléctricas - ${companyName || 'Cliente'}`
      : isChecklistPersonalizado
      ? `${checklistName || 'Checklist'} - ${companyName || 'Cliente'}`
      : isProtocoloIluminacion
      ? `Protocolo para Medición de Iluminación - ${companyName || 'Cliente'}`
      : isCapacitacionOnline
      ? `Capacitación virtual de higiene y seguridad en el trabajo`
      : `Constancia de Visita de Higiene y Seguridad - ${companyName || 'Cliente'}`;

    console.log(`[API Send-Email] Tenant: ${profile.tenant_id} | Sender: ${user.email} | To: ${emailList.join(', ')} | Subject: ${mailSubject}`);

    // Helper para convertir URL de imagen a Base64 en servidor
    const fetchImageAsBase64 = async (url) => {
      if (!url || typeof url !== 'string' || !url.startsWith('http')) return null;
      try {
        const res = await fetch(url);
        if (!res.ok) return null;
        const arrayBuffer = await res.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const contentType = res.headers.get('content-type') || 'image/png';
        return `data:${contentType};base64,${buffer.toString('base64')}`;
      } catch (err) {
        console.error('[API Send-Email] Error al convertir URL de logo a Base64:', err);
        return null;
      }
    };

    // Obtener y preparar el logo del Tenant como adjunto CID embebido
    let logoBase64 = null;
    if (tenantLogoBase64 && tenantLogoBase64.startsWith('data:image/')) {
      logoBase64 = tenantLogoBase64;
    } else if (tenantLogoBase64 && tenantLogoBase64.startsWith('http')) {
      logoBase64 = await fetchImageAsBase64(tenantLogoBase64);
    }

    if (!logoBase64 && profile?.tenant_id) {
      const { data: tenantRow } = await serverClient
        .from('tenants')
        .select('logo_1_url')
        .eq('id', profile.tenant_id)
        .single();
      
      if (tenantRow?.logo_1_url) {
        logoBase64 = await fetchImageAsBase64(tenantRow.logo_1_url);
      }
    }

    let logoCid = null;
    if (logoBase64 && logoBase64.startsWith('data:image/')) {
      try {
        const mimeMatch = logoBase64.match(/^data:(image\/[a-zA-Z+.-]+);base64,/);
        if (mimeMatch) {
          const contentType = mimeMatch[1].toLowerCase();
          const allowedImageTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
          if (allowedImageTypes.includes(contentType)) {
            const base64Data = logoBase64.substring(mimeMatch[0].length);
            const logoBuffer = Buffer.from(base64Data, 'base64');
            if (logoBuffer.length <= 2 * 1024 * 1024) {
              logoCid = 'tenantlogo';
              attachments.push({
                filename: `logo.${contentType.split('/')[1] || 'png'}`,
                content: logoBuffer,
                contentType: contentType,
                cid: logoCid,
              });
            }
          }
        }
      } catch (logoErr) {
        console.error('[Email Route] Error al procesar el adjunto del logo:', logoErr);
      }
    }

    const formattedCustomMessage = customMessage
      ? escapeHtml(customMessage).replace(/\n/g, '<br />')
      : null;

    const mailHtml = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${escapeHtml(mailSubject)} — Gestión SySO</title>
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

                <!-- Header con Logo del Tenant o Nombre de Organización -->
                <tr>
                  <td style="padding: 32px 32px 24px 32px; text-align: center; background-color: #ffffff; border-bottom: 1px solid #D9D9D9;">
                    ${logoCid
                      ? `<img src="cid:${logoCid}" alt="${tenantNameEscaped || 'Logo'}" style="max-height: 72px; max-width: 240px; object-fit: contain; display: block; margin: 0 auto;" />`
                      : `<h2 style="margin: 0; font-size: 22px; font-weight: 800; color: #0f172a; letter-spacing: -0.025em;">${tenantNameEscaped || 'Gestión SySO'}</h2>`
                    }
                  </td>
                </tr>

                <!-- Título y Categoría de Documento -->
                <tr>
                  <td style="padding: 32px 32px 0 32px; text-align: center;">
                    <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #0f172a; letter-spacing: -0.02em;">
                      ${isCapacitacionOnline ? 'Capacitación Virtual de Higiene y Seguridad' : isAvisoRiesgo ? 'Aviso de Riesgo' : isControlElectrico ? 'Inspección Visual de Instalaciones Eléctricas' : isChecklistPersonalizado ? (checklistNameEscaped || 'Checklist Personalizado') : isProtocoloIluminacion ? 'Protocolo de Medición de Iluminación' : 'Constancia de Visita Técnica'}
                    </h1>
                    <p style="margin: 6px 0 0 0; font-size: 13px; font-weight: 600; color: #468DFF; text-transform: uppercase; letter-spacing: 0.06em;">
                      ${companyNameEscaped ? companyNameEscaped : 'Notificación Oficial de Servicio'}
                    </p>
                    <div style="width: 40px; height: 3px; background-color: #468DFF; border-radius: 2px; margin: 16px auto 0 auto;"></div>
                  </td>
                </tr>

                <!-- Cuerpo del Mensaje -->
                <tr>
                  <td style="padding: 24px 32px;">
                    <div style="background-color: #ffffff; padding: 20px; border-radius: 12px; border: 1px solid #D9D9D9; font-size: 15px; line-height: 1.7; color: #334155;">
                      ${formattedCustomMessage ? `
                        <div>${formattedCustomMessage}</div>
                      ` : `
                        <p style="margin-top: 0; font-size: 15px; line-height: 1.7; color: #334155;">
                          Estimado cliente,
                        </p>
                        <p style="margin-bottom: 0; font-size: 15px; line-height: 1.7; color: #334155;">
                          Se adjunta la documentación técnica correspondiente a sus instalaciones.
                        </p>
                      `}
                    </div>
                  </td>
                </tr>

                <!-- Caja Informativa de Adjunto -->
                ${filePath ? `
                  <tr>
                    <td style="padding: 0 32px 24px 32px;">
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f8fafc; border: 1px solid #D9D9D9; border-radius: 12px;">
                        <tr>
                          <td style="padding: 16px 20px;">
                            <p style="margin: 0 0 4px 0; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">
                              📄 Archivo Adjunto Incluido
                            </p>
                            <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #475569;">
                              El informe oficial en formato PDF ha sido adjuntado a este correo electrónico para su descarga y archivado.
                            </p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                ` : ''}

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

    if (host && user_smtp && pass) {
      console.log(`[Email Route] Enviando correo real a ${emailList.join(', ')} via ${host}:${port} — usuario: ${user.email}`);

      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465, // STARTTLS para 587, SSL para 465
        auth: {
          user: user_smtp,
          pass,
        },
      });

      await transporter.sendMail({
        from: `"${tenantName || process.env.SMTP_SENDER_NAME || 'Gestión SySO'}" <${from}>`,
        to: emailList.join(', '),
        subject: mailSubject,
        html: mailHtml,
        attachments: attachments,
      });

      return NextResponse.json({
        success: true,
        message: 'Correo electrónico enviado exitosamente.',
      });
    } else {
      // SMTP no configurado — modo simulación (solo en desarrollo)
      console.log('================= SIMULACIÓN DE ENVÍO DE CORREO =================');
      console.log(`Para: ${emailList.join(', ')}`);
      console.log(`De: "${tenantName || process.env.SMTP_SENDER_NAME || 'Gestión SySO'}" <${from}>`);
      console.log(`Asunto: ${mailSubject}`);
      console.log(`Adjuntos: ${attachments.map(a => `${a.filename} (${a.content.length} bytes)`).join(', ')}`);
      console.log('================================================================');

      return NextResponse.json({
        success: true,
        simulated: true,
        message: 'Simulación: Correo procesado correctamente. Para enviar correos reales, configure las variables SMTP en el archivo .env.',
      });
    }

  } catch (err) {
    console.error('[Email Route] Error al procesar envío de correo:', err);
    return NextResponse.json(
      { error: `Error al procesar el envío: ${err.message}` },
      { status: 500 }
    );
  }
}
