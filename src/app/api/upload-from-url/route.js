// src/app/api/upload-from-url/route.js
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Setup Supabase admin client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY; // Admin key to bypass RLS in script context
const supabase = createClient(supabaseUrl, supabaseKey);

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
    const { url, tenantId } = await request.json();

    if (!url || !tenantId) {
      return NextResponse.json(
        { error: 'Parámetros url y tenantId requeridos.' },
        { status: 400 }
      );
    }

    // Translate URL if it is Google Drive
    const downloadUrl = getGoogleDriveDownloadUrl(url);

    console.log(`[API Upload] Downloading from: ${downloadUrl}`);
    const res = await fetch(downloadUrl);
    if (!res.ok) {
      return NextResponse.json(
        { error: `No se pudo descargar el archivo. Código de estado HTTP: ${res.status}` },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await res.arrayBuffer());
    console.log(`[API Upload] Download complete. Size: ${buffer.length} bytes`);

    // Find a valid profile of this tenant to construct RLS path
    const { data: profiles, error: profErr } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('tenant_id', tenantId);

    if (profErr || !profiles || profiles.length === 0) {
      return NextResponse.json(
        { error: 'No se encontró un perfil de usuario asociado para el tenant.' },
        { status: 400 }
      );
    }

    // Prefer admin or first user
    const admin = profiles.find(p => p.role === 'admin');
    const userId = admin ? admin.id : profiles[0].id;

    // Build RLS-compliant path
    const fileId = crypto.randomUUID();
    const storagePath = `${userId}/programa_${fileId}.pdf`;

    console.log(`[API Upload] Uploading to Storage documents bucket: ${storagePath}`);
    const { error: uploadErr } = await supabase.storage
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
      { error: 'Error interno del servidor. Intente de nuevo.' },
      { status: 500 }
    );
  }
}
