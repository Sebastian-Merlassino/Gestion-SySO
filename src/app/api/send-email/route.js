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
  filePath: z.string().min(1, 'El path del archivo adjunto es requerido.'),
  companyName: z.string().optional(),
  establishmentName: z.string().optional(),
  date: z.string().optional(),
  inspectorName: z.string().optional(),
  tenantLogoBase64: z.string().nullable().optional(),
  tenantName: z.string().optional(),
  documentType: z.string().optional(), // can be 'aviso_riesgo' or others
  checklistName: z.string().optional()
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
    const { emails, filePath, companyName, establishmentName, date, inspectorName, tenantLogoBase64, tenantName, documentType, checklistName } = parseResult.data;

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

    // Descargar el PDF desde Supabase Storage (RLS valida el acceso)
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

    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587;
    const user_smtp = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const from = process.env.SMTP_FROM || user_smtp || 'no-reply@gestionsyso.com';

    const isAvisoRiesgo = documentType === 'aviso_riesgo';
    const isControlElectrico = documentType === 'control_electrico';
    const isChecklistPersonalizado = documentType === 'checklist_personalizado';
    
    const mailSubject = isAvisoRiesgo
      ? `Aviso de Riesgo de Higiene y Seguridad - ${companyName || 'Cliente'}`
      : isControlElectrico
      ? `Inspección Visual de Instalaciones Eléctricas - ${companyName || 'Cliente'}`
      : isChecklistPersonalizado
      ? `${checklistName || 'Checklist'} - ${companyName || 'Cliente'}`
      : `Constancia de Visita de Higiene y Seguridad - ${companyName || 'Cliente'}`;

    console.log(`[API Send-Email] Tenant: ${profile.tenant_id} | Sender: ${user.email} | To: ${emailList.join(', ')} | Subject: ${mailSubject} | Size: ${pdfBuffer.length} bytes`);

    // Inline attachments list
    const attachments = [];

    attachments.push({
      filename: isAvisoRiesgo
        ? `Aviso_Riesgo_${(companyName || 'Cliente').replace(/\s+/g, '_')}_${date || 'aviso'}.pdf`
        : isControlElectrico
        ? `Inspección_Visual_Instalaciones_Eléctricas_${(companyName || 'Cliente').replace(/\s+/g, '_')}_${date || 'control'}.pdf`
        : isChecklistPersonalizado
        ? `Checklist_${(checklistName || 'Personalizado').replace(/\s+/g, '_')}_${(companyName || 'Cliente').replace(/\s+/g, '_')}_${date || 'checklist'}.pdf`
        : `Constancia_Visita_${(companyName || 'Cliente').replace(/\s+/g, '_')}_${date || 'visita'}.pdf`,
      content: pdfBuffer,
      contentType: 'application/pdf'
    });

    // Handle tenant logo as CID inline attachment to bypass webmail block (Gmail)
    let logoCid = null;
    if (tenantLogoBase64 && tenantLogoBase64.startsWith('data:image/')) {
      try {
        const mimeMatch = tenantLogoBase64.match(/^data:(image\/[a-zA-Z+.-]+);base64,/);
        if (mimeMatch) {
          const contentType = mimeMatch[1];
          const base64Data = tenantLogoBase64.substring(mimeMatch[0].length);
          const logoBuffer = Buffer.from(base64Data, 'base64');
          logoCid = 'tenantlogo';
          attachments.push({
            filename: `logo.${contentType.split('/')[1] || 'png'}`,
            content: logoBuffer,
            contentType: contentType,
            cid: logoCid,
          });
        }
      } catch (logoErr) {
        console.error('[Email Route] Error al procesar el adjunto del logo:', logoErr);
      }
    }

    const mailHtml = `
      <div style="font-family: 'Segoe UI', Inter, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1e293b; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px;">
        <div style="text-align: center; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid #e2e8f0;">
          ${logoCid
            ? `<img src="cid:${logoCid}" alt="${tenantNameEscaped || 'Logo'}" style="max-height: 72px; max-width: 240px; object-fit: contain; display: block; margin: 0 auto 8px auto;" />`
            : `<h2 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 800; color: #0f172a; letter-spacing: -0.025em;">${tenantNameEscaped || 'Gestión SySO'}</h2>`
          }
          <p style="margin: 0; font-size: 13px; font-weight: 600; color: #468DFF; text-transform: uppercase; letter-spacing: 0.05em;">${isAvisoRiesgo ? 'Aviso de Riesgo' : isControlElectrico ? 'Inspección Visual de Instalaciones Eléctricas' : isChecklistPersonalizado ? (checklistNameEscaped || 'Checklist Personalizado') : 'Constancia de Visita'}</p>
        </div>

        <div style="background-color: #ffffff; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0; margin-bottom: 24px; box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05);">
          <p style="margin-top: 0; font-size: 15px; line-height: 1.6; color: #334155;">
            Estimado cliente,
          </p>
          <p style="font-size: 15px; line-height: 1.6; color: #334155;">
            Se adjunta el reporte de <strong>${isAvisoRiesgo ? 'Aviso de Riesgo de Higiene y Seguridad' : isControlElectrico ? 'Inspección Visual de Instalaciones Eléctricas' : isChecklistPersonalizado ? (checklistNameEscaped || 'Checklist Personalizado') : 'Constancia de Visita de Higiene y Seguridad'}</strong> correspondiente a sus instalaciones.
          </p>

          <table style="width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 14px;">
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 10px 0; font-weight: 600; color: #64748b; width: 40%;">Razón Social:</td>
              <td style="padding: 10px 0; font-weight: 700; color: #0f172a;">${companyNameEscaped || 'N/A'}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 10px 0; font-weight: 600; color: #64748b;">Establecimiento:</td>
              <td style="padding: 10px 0; font-weight: 700; color: #0f172a;">${establishmentNameEscaped || 'N/A'}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 10px 0; font-weight: 600; color: #64748b;">${isAvisoRiesgo ? 'Fecha de emisión:' : isControlElectrico ? 'Fecha de control:' : isChecklistPersonalizado ? 'Fecha:' : 'Fecha de visita:'}</td>
              <td style="padding: 10px 0; font-weight: 700; color: #0f172a;">${dateEscaped || 'N/A'}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; font-weight: 600; color: #64748b;">Profesional a cargo:</td>
              <td style="padding: 10px 0; font-weight: 700; color: #0f172a;">${inspectorNameEscaped || 'N/A'}</td>
            </tr>
          </table>
        </div>

        <p style="font-size: 12px; line-height: 1.6; color: #64748b; margin-top: 0; text-align: center;">
          Este es un correo automático enviado a través de la plataforma de Gestión SySO.<br />
          Por favor, no responda directamente a este email.
        </p>
      </div>
    `;

    // Attachment helper setup is done above.
    const pdfBufferLength = pdfBuffer.length;

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
