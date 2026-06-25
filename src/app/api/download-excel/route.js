// src/app/api/download-excel/route.js
import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { z } from 'zod';

const downloadSchema = z.object({
  url: z.string().url('URL inválida.'),
  tenantId: z.string().uuid('tenantId debe ser un UUID válido.')
});

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function getGoogleDriveExcelUrl(url) {
  // Caso 1: Enlace a planilla nativa de Google Sheets
  const sheetIdMatch = url.match(/\/spreadsheets\/d\/([^/]+)/);
  if (sheetIdMatch) {
    const sheetId = sheetIdMatch[1];
    return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=xlsx`;
  }

  // Caso 2: Enlace a archivo subido en Google Drive
  const fileIdMatch = url.match(/\/file\/d\/([^/]+)/) || url.match(/id=([^&]+)/);
  if (fileIdMatch) {
    const fileId = fileIdMatch[1];
    return `https://docs.google.com/uc?export=download&id=${fileId}`;
  }

  return url;
}

export async function POST(request) {
  try {
    const body = await request.json();
    const parseResult = downloadSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Parámetros inválidos.', details: parseResult.error.format() },
        { status: 400 }
      );
    }
    const { url, tenantId } = parseResult.data;

    // 1. Autenticación y Autorización
    const cookieStore = cookies();
    const serverClient = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value;
        },
        set(name, value, options) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name, options) {
          cookieStore.set({ name, value: '', ...options });
        },
      },
    });

    const { data: { user }, error: authError } = await serverClient.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'No autorizado. Debe iniciar sesión.' },
        { status: 401 }
      );
    }

    const { data: profile, error: profError } = await serverClient
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single();

    if (profError || !profile || profile.tenant_id !== tenantId) {
      return NextResponse.json(
        { error: 'No autorizado a operar sobre este tenant.' },
        { status: 403 }
      );
    }

    // 2. Prevención de SSRF
    let parsedUrl;
    try {
      parsedUrl = new URL(url);
    } catch (e) {
      return NextResponse.json({ error: 'URL inválida.' }, { status: 400 });
    }

    const allowedHosts = ['docs.google.com', 'drive.google.com', 'drive.usercontent.google.com'];
    if (!allowedHosts.includes(parsedUrl.hostname)) {
      return NextResponse.json(
        { error: 'Dominio no permitido. Solo se permiten descargas desde Google Drive.' },
        { status: 400 }
      );
    }

    const downloadUrl = getGoogleDriveExcelUrl(url);
    let parsedDownloadUrl;
    try {
      parsedDownloadUrl = new URL(downloadUrl);
    } catch (e) {
      return NextResponse.json({ error: 'URL de descarga inválida.' }, { status: 400 });
    }

    if (!allowedHosts.includes(parsedDownloadUrl.hostname)) {
      return NextResponse.json(
        { error: 'Dominio de descarga no permitido.' },
        { status: 400 }
      );
    }

    console.log(`[API Download Excel] Downloading from: ${downloadUrl}`);
    const res = await fetch(downloadUrl, { signal: AbortSignal.timeout(30000) });
    if (!res.ok) {
      return NextResponse.json(
        { error: `No se pudo descargar el archivo. Código de estado HTTP: ${res.status}` },
        { status: 400 }
      );
    }

    // 3. Límite de tamaño de descarga (10 MB) para prevenir DoS
    const contentLength = res.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'El archivo excede el tamaño máximo permitido de 10 MB.' },
        { status: 413 }
      );
    }

    const reader = res.body.getReader();
    const chunks = [];
    let receivedLength = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      chunks.push(value);
      receivedLength += value.length;

      if (receivedLength > 10 * 1024 * 1024) {
        await reader.cancel();
        return NextResponse.json(
          { error: 'El archivo excede el tamaño máximo permitido de 10 MB.' },
          { status: 413 }
        );
      }
    }

    const buffer = Buffer.concat(chunks);
    console.log(`[API Download Excel] Download complete. Size: ${buffer.length} bytes`);

    // Retorna el archivo en Base64 para que el cliente lo procese
    const base64String = buffer.toString('base64');
    return NextResponse.json({
      success: true,
      fileBase64: base64String,
      contentType: res.headers.get('content-type') || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

  } catch (err) {
    console.error('[API Download Excel] Internal error:', err);
    return NextResponse.json(
      { error: 'Error interno del servidor. Intente de nuevo.' },
      { status: 500 }
    );
  }
}
