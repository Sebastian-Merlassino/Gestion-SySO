// src/lib/pdf/pdfImages.js
import { supabase } from '@/lib/supabase';

/**
 * Helper para carga, compresión y cálculo proporcional de imágenes en jsPDF.
 * Soporta URLs públicas, URLs firmadas de Supabase Storage, rutas relativas y Data URLs Base64.
 */

// Helper para resolver URL firmada de Supabase si es una ruta o URL pública de un bucket privado
async function resolveStorageSignedUrl(rawUrl) {
  if (!supabase || !rawUrl || typeof rawUrl !== 'string') return null;
  try {
    let bucket = 'signatures';
    let path = rawUrl;

    if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
      try {
        const urlObj = new URL(rawUrl);
        const pathParts = urlObj.pathname.split('/');
        const bIdx = pathParts.findIndex(p => p === 'signatures' || p === 'documents' || p === 'avatars' || p === 'logos' || p === 'protocolos-ergonomia');
        if (bIdx !== -1 && bIdx < pathParts.length - 1) {
          bucket = pathParts[bIdx];
          path = pathParts.slice(bIdx + 1).join('/');
        } else {
          return null;
        }
      } catch {
        return null;
      }
    }

    if (path && !path.startsWith('http') && !path.startsWith('data:')) {
      const candidateBuckets = Array.from(new Set([bucket, 'signatures', 'documents', 'avatars', 'logos']));
      for (const b of candidateBuckets) {
        try {
          const { data, error } = await supabase.storage.from(b).createSignedUrl(path, 3600);
          if (!error && data?.signedUrl) {
            return data.signedUrl;
          }
        } catch {
          // Continuar con siguiente bucket candidato
        }
      }
    }
  } catch (e) {
    console.warn('[pdfImages] Error resolviendo URL firmada:', e);
  }
  return null;
}

export async function getBase64ImageFromUrl(url) {
  if (!url || typeof url !== 'string') return null;
  if (url.startsWith('data:image/')) return url;

  const blobToBase64 = (blob) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  try {
    let fetchUrl = url;

    // Si detectamos que es una URL pública de Supabase Storage para un bucket privado (ej: signatures),
    // resolvemos la URL firmada directamente para evitar el 400 Bad Request de Supabase
    if (url.includes('/storage/v1/object/public/signatures') || url.includes('/storage/v1/object/public/documents')) {
      const signed = await resolveStorageSignedUrl(url);
      if (signed) fetchUrl = signed;
    }

    const res = await fetch(fetchUrl);
    if (res.ok) {
      const blob = await res.blob();
      return await blobToBase64(blob);
    }

    // Fallback: Si el fetch devolvió error (ej: 400 Bad Request por bucket privado), intentamos resolver signedUrl
    if (fetchUrl === url && (url.includes('supabase.co') || url.startsWith('http'))) {
      const signed = await resolveStorageSignedUrl(url);
      if (signed && signed !== fetchUrl) {
        const retryRes = await fetch(signed);
        if (retryRes.ok) {
          const blob = await retryRes.blob();
          return await blobToBase64(blob);
        }
      }
    }

    console.warn(`[pdfImages] No se pudo obtener la imagen (Status ${res.status}):`, url);
    return null;
  } catch (err) {
    console.warn('[pdfImages] Error al convertir imagen a Base64:', err.message || err);
    return null;
  }
}

/**
 * Calcula las dimensiones óptimas para la imagen manteniendo su aspecto original
 */
export function calculateAspectRatioFit(srcWidth, srcHeight, maxWidth, maxHeight) {
  if (!srcWidth || !srcHeight) return { width: maxWidth, height: maxHeight };
  const ratio = Math.min(maxWidth / srcWidth, maxHeight / srcHeight);
  return {
    width: srcWidth * ratio,
    height: srcHeight * ratio
  };
}
