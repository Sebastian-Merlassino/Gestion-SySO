// src/app/api/send-email/route.js
import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import nodemailer from 'nodemailer';

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
    // ─────────────────────────────────────────────────────────────────────────

    const { emails, pdfBase64, companyName, establishmentName, date, inspectorName } = await request.json();

    if (!emails || !pdfBase64) {
      return NextResponse.json(
        { error: 'Parámetros emails y pdfBase64 son requeridos.' },
        { status: 400 }
      );
    }

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

    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587;
    const user_smtp = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const from = process.env.SMTP_FROM || user_smtp || 'no-reply@gestionsyso.com';

    const mailSubject = `Constancia de Visita de Higiene y Seguridad - ${companyName || 'Cliente'}`;

    const mailHtml = `
      <div style="font-family: 'Segoe UI', Inter, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1e293b; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px;">
        <div style="text-align: center; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid #e2e8f0;">
          <h2 style="margin: 0; font-size: 22px; font-weight: 800; color: #0f172a; letter-spacing: -0.025em;">Gestión SySO</h2>
          <p style="margin: 4px 0 0 0; font-size: 13px; font-weight: 600; color: #468DFF; text-transform: uppercase; letter-spacing: 0.05em;">Constancia de Visita Técnica</p>
        </div>

        <div style="background-color: #ffffff; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0; margin-bottom: 24px; box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05);">
          <p style="margin-top: 0; font-size: 15px; line-height: 1.6; color: #334155;">
            Estimado cliente,
          </p>
          <p style="font-size: 15px; line-height: 1.6; color: #334155;">
            Se adjunta la <strong>Constancia de Visita de Higiene y Seguridad</strong> correspondiente a la inspección técnica realizada en sus instalaciones.
          </p>

          <table style="width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 14px;">
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 10px 0; font-weight: 600; color: #64748b; width: 40%;">Razón Social:</td>
              <td style="padding: 10px 0; font-weight: 700; color: #0f172a;">${companyName || 'N/A'}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 10px 0; font-weight: 600; color: #64748b;">Establecimiento:</td>
              <td style="padding: 10px 0; font-weight: 700; color: #0f172a;">${establishmentName || 'N/A'}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 10px 0; font-weight: 600; color: #64748b;">Fecha de visita:</td>
              <td style="padding: 10px 0; font-weight: 700; color: #0f172a;">${date || 'N/A'}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; font-weight: 600; color: #64748b;">Profesional a cargo:</td>
              <td style="padding: 10px 0; font-weight: 700; color: #0f172a;">${inspectorName || 'N/A'}</td>
            </tr>
          </table>
        </div>

        <p style="font-size: 12px; line-height: 1.6; color: #64748b; margin-top: 0; text-align: center;">
          Este es un correo automático enviado a través de la plataforma de Gestión SySO.<br />
          Por favor, no responda directamente a este email.
        </p>
      </div>
    `;

    // Attach PDF from base64
    const cleanBase64 = pdfBase64.replace(/^data:application\/pdf;.*base64,/, '');
    const pdfBuffer = Buffer.from(cleanBase64, 'base64');

    const attachment = {
      filename: `Constancia_Visita_${(companyName || 'Cliente').replace(/\s+/g, '_')}_${date || 'visita'}.pdf`,
      content: pdfBuffer,
      contentType: 'application/pdf'
    };

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
        from: `"${process.env.SMTP_SENDER_NAME || 'Gestión SySO'}" <${from}>`,
        to: emailList.join(', '),
        subject: mailSubject,
        html: mailHtml,
        attachments: [attachment],
      });

      return NextResponse.json({
        success: true,
        message: 'Correo electrónico enviado exitosamente.',
      });
    } else {
      // SMTP no configurado — modo simulación (solo en desarrollo)
      console.log('================= SIMULACIÓN DE ENVÍO DE CORREO =================');
      console.log(`Para: ${emailList.join(', ')}`);
      console.log(`De: ${from}`);
      console.log(`Asunto: ${mailSubject}`);
      console.log(`Adjunto: ${attachment.filename} (${pdfBuffer.length} bytes)`);
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
