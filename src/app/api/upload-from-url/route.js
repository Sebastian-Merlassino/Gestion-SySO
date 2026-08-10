// src/app/api/upload-from-url/route.js
import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { z } from 'zod';

const uploadSchema = z.object({
  url: z.string().url('URL inválida.'),
  tenantId: z.string().uuid('tenantId debe ser un UUID válido.')
});

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function isAllowedGoogleHost(hostname) {
  return (
    hostname === 'docs.google.com' ||
    hostname === 'drive.google.com' ||
    hostname.endsWith('.google.com') ||
    hostname.endsWith('.googleusercontent.com')
  );
}

function getGoogleDriveDownloadUrl(url) {
  // 1. Google Presentation / Slides: /presentation/d/ID/
  const presentationMatch = url.match(/\/presentation\/d\/([a-zA-Z0-9_-]+)/);
  if (presentationMatch) {
    return `https://docs.google.com/presentation/d/${presentationMatch[1]}/export/pdf`;
  }

  // 2. Google Document / Docs: /document/d/ID/
  const docMatch = url.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
  if (docMatch) {
    return `https://docs.google.com/document/d/${docMatch[1]}/export?format=pdf`;
  }

  // 3. Google Spreadsheets / Sheets: /spreadsheets/d/ID/
  const sheetMatch = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (sheetMatch) {
    return `https://docs.google.com/spreadsheets/d/${sheetMatch[1]}/export?format=pdf`;
  }

  // 4. Google Drive File: /file/d/ID/ or /d/ID/ or ?id=ID
  const fileIdMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (fileIdMatch) {
    const fileId = fileIdMatch[1];
    return `https://drive.usercontent.google.com/download?id=${fileId}&export=download`;
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

    const { data: { session }, error: sessionError } = await serverClient.auth.getSession();
    if (sessionError || !session || !session.user) {
      return NextResponse.json(
        { error: 'No autorizado. Debe iniciar sesión.' },
        { status: 401 }
      );
    }
    const user = session.user;
    const token = session.access_token;

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

    if (!isAllowedGoogleHost(parsedUrl.hostname)) {
      return NextResponse.json(
        { error: 'Dominio no permitido. Solo se permiten descargas desde Google Drive, Slides o Docs.' },
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

    if (!isAllowedGoogleHost(parsedDownloadUrl.hostname)) {
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

    let buffer = Buffer.concat(chunks);
    console.log(`[API Upload] Download complete. Size: ${buffer.length} bytes`);

    // 4. Validación de tipo de archivo mediante magic number (PDF) o resolución de aviso HTML de Google Drive
    if (buffer.length >= 4 && buffer.toString('ascii', 0, 4) !== '%PDF') {
      const htmlText = buffer.toString('utf-8');
      console.log('[API Upload] Content is not raw PDF, resolving potential Google Drive warning/confirmation page...');

      // Extraer enlace directo de confirmación o acción de formulario de Google Drive HTML
      let confirmUrl = null;
      const userContentMatch = htmlText.match(/href="([^"]*drive\.usercontent\.google\.com\/download[^"]*)"/i) ||
                               htmlText.match(/action="([^"]*drive\.usercontent\.google\.com\/download[^"]*)"/i);
      if (userContentMatch) {
        confirmUrl = userContentMatch[1].replace(/&amp;/g, '&');
      }

      if (!confirmUrl) {
        const ucConfirmMatch = htmlText.match(/href="([^"]*uc\?export=download[^"]*confirm=[^"]*)"/i) ||
                               htmlText.match(/action="([^"]*uc\?export=download[^"]*confirm=[^"]*)"/i);
        if (ucConfirmMatch) {
          const relOrAbs = ucConfirmMatch[1].replace(/&amp;/g, '&');
          confirmUrl = relOrAbs.startsWith('/') ? `https://docs.google.com${relOrAbs}` : relOrAbs;
        }
      }

      if (!confirmUrl) {
        const fileIdMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
        const tokenMatch = htmlText.match(/name="confirm"\s+value="([^"]+)"/i) || htmlText.match(/confirm=([a-zA-Z0-9_-]+)/i);
        if (fileIdMatch && tokenMatch) {
          confirmUrl = `https://drive.usercontent.google.com/download?id=${fileIdMatch[1]}&export=download&confirm=${tokenMatch[1]}`;
        }
      }

      if (confirmUrl) {
        console.log(`[API Upload] Fetching confirmed Google Drive URL: ${confirmUrl}`);
        const secondRes = await fetch(confirmUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          },
          signal: AbortSignal.timeout(30000)
        });

        if (secondRes.ok) {
          const secChunks = [];
          let secLen = 0;
          for await (const chunk of secondRes.body) {
            secLen += chunk.length;
            if (secLen > 10 * 1024 * 1024) break;
            secChunks.push(chunk);
          }
          buffer = Buffer.concat(secChunks);
        }
      }
    }

    if (buffer.length < 4 || buffer.toString('ascii', 0, 4) !== '%PDF') {
      return NextResponse.json(
        { error: 'El archivo descargado no es un documento PDF válido. Asegúrate de que el archivo en Google Drive sea un PDF y tenga acceso público o por enlace.' },
        { status: 400 }
      );
    }

    // 5. Carga a storage utilizando el contexto del usuario autenticado (RLS)
    const fileId = crypto.randomUUID();
    const storagePath = `${user.id}/programa_${fileId}.pdf`;

    // Crear un cliente autenticado explícito con el JWT del usuario para que Storage aplique RLS correctamente
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    });

    console.log(`[API Upload] Uploading to Storage documents bucket: ${storagePath}`);
    const { error: uploadErr } = await authClient.storage
      .from('documents')
      .upload(storagePath, buffer, {
        contentType: 'application/pdf',
        upsert: true
      });

    if (uploadErr) {
      console.error('[API Upload] Supabase Storage upload failed:', uploadErr);
      const detailStr = typeof uploadErr === 'object' ? (uploadErr.message || JSON.stringify(uploadErr)) : uploadErr;
      return NextResponse.json(
        { error: `Error al subir el archivo a Supabase Storage: ${detailStr}` },
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
