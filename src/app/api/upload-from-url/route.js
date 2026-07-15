// src/app/api/upload-from-url/route.js
import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { z } from 'zod';

const uploadSchema = z.object({
  url: z.string().url('URL inválida.'),
  tenantId: z.string().uuid('tenantId debe ser un UUID válido.')
});

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function getGoogleDriveDownloadUrl(url) {
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
    const parseResult = uploadSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Parámetros inválidos.', details: parseResult.error.format() },
        { status: 400 }
      );
    }
    const { url, tenantId } = parseResult.data;

    // 1. Autenticación y Autorización a nivel de Tenant
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

    // 2. Prevención de SSRF (Solo dominios autorizados de Google Drive)
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

    const downloadUrl = getGoogleDriveDownloadUrl(url);
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

    console.log(`[API Upload] Downloading from: ${downloadUrl}`);
    const res = await fetch(downloadUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      signal: AbortSignal.timeout(30000)
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: `No se pudo descargar el archivo. Código de estado HTTP: ${res.status}` },
        { status: 400 }
      );
    }

    // 3. Control de tamaño máximo de descarga (10 MB) para prevenir DoS
    const contentLength = res.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'El archivo excede el tamaño máximo permitido de 10 MB.' },
        { status: 413 }
      );
    }

    // Descarga progresiva y compatible por streams para evitar OOM/DoS
    const chunks = [];
    let receivedLength = 0;

    for await (const chunk of res.body) {
      receivedLength += chunk.length;
      if (receivedLength > 10 * 1024 * 1024) {
        return NextResponse.json(
          { error: 'El archivo excede el tamaño máximo permitido de 10 MB.' },
          { status: 413 }
        );
      }
      chunks.push(chunk);
    }

    const buffer = Buffer.concat(chunks);
    console.log(`[API Upload] Download complete. Size: ${buffer.length} bytes`);

    // 4. Validación de tipo de archivo mediante magic number (PDF)
    if (buffer.length < 4 || buffer.toString('ascii', 0, 4) !== '%PDF') {
      return NextResponse.json(
        { error: 'El archivo no es un documento PDF válido.' },
        { status: 415 }
      );
    }

    // 5. Carga a storage utilizando el contexto del usuario autenticado (RLS)
    const fileId = crypto.randomUUID();
    const storagePath = `${user.id}/programa_${fileId}.pdf`;

    console.log(`[API Upload] Uploading to Storage documents bucket: ${storagePath}`);
    const { error: uploadErr } = await serverClient.storage
      .from('documents')
      .upload(storagePath, buffer, {
        contentType: 'application/pdf',
        upsert: true
      });

    if (uploadErr) {
      console.error('[API Upload] Supabase Storage upload failed:', uploadErr);
      return NextResponse.json(
        { error: 'Error al subir el archivo a Supabase Storage.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      filePath: storagePath
    });

  } catch (err) {
    console.error('[API Upload] Internal error:', err);
    return NextResponse.json(
      { error: 'Error interno del servidor. Intente de nuevo.', details: err.message },
      { status: 500 }
    );
  }
}
