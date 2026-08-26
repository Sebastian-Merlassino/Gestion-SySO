// src/lib/pdf/pdfMatriculasAnexo.js
import { supabase } from '@/lib/supabase';
import { formatDate } from '@/lib/utils';
import { getBase64ImageFromUrl } from './pdfImages';

/**
 * Resuelve una imagen de Supabase Storage o URL externa y retorna su Base64
 */
async function resolveStorageImageBase64(pathOrUrl) {
  if (!pathOrUrl) return null;
  if (pathOrUrl.startsWith('data:image/')) return pathOrUrl;

  try {
    let targetUrl = pathOrUrl;
    let relativePath = pathOrUrl;
    let bucketName = 'documents';

    if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
      try {
        const urlObj = new URL(relativePath);
        const pathParts = urlObj.pathname.split('/');
        const bIdx = pathParts.findIndex(p => p === 'documents' || p === 'signatures' || p === 'avatars' || p === 'logos');
        if (bIdx !== -1 && bIdx < pathParts.length - 1) {
          bucketName = pathParts[bIdx];
          relativePath = pathParts.slice(bIdx + 1).join('/');
        }
      } catch (urlErr) {
        console.warn('[pdfMatriculasAnexo] Error parseando URL de matrícula:', urlErr);
      }
    }

    if (relativePath && !relativePath.startsWith('http') && !relativePath.startsWith('data:')) {
      const candidateBuckets = Array.from(new Set([bucketName, 'documents', 'signatures', 'avatars', 'logos']));
      for (const b of candidateBuckets) {
        try {
          const { data: sData, error: sErr } = await supabase.storage
            .from(b)
            .createSignedUrl(relativePath, 3600);
          if (!sErr && sData?.signedUrl) {
            targetUrl = sData.signedUrl;
            break;
          }
        } catch (e) {
          // Continuar con siguiente bucket
        }
      }
    }

    const base64 = await getBase64ImageFromUrl(targetUrl);
    return base64 && base64.startsWith('data:image/') ? base64 : null;
  } catch (err) {
    console.error('[pdfMatriculasAnexo] Error descargando imagen de matrícula:', err);
    return null;
  }
}

/**
 * Obtiene las dimensiones originales de una imagen Base64 en el entorno del navegador
 */
function getImageDimensions(base64Str) {
  return new Promise((resolve) => {
    if (!base64Str || typeof window === 'undefined') {
      resolve({ width: 400, height: 250 });
      return;
    }
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      resolve({
        width: img.naturalWidth || img.width || 400,
        height: img.naturalHeight || img.height || 250
      });
    };
    img.onerror = () => {
      resolve({ width: 400, height: 250 });
    };
  });
}

/**
 * Consulta en Supabase las matrículas con fotos asociadas al profesional que firma el protocolo
 */
export async function fetchProfessionalMatriculasWithImages({
  profNombre = '',
  profMatricula = '',
  userProfile = null,
  tenantId = null,
  profesionalId = null
}) {
  if (!supabase) return [];

  try {
    const matchedProfileIds = new Set();
    const matchedMiembroIds = new Set();

    // 1. Si se pasó profesionalId explícito
    if (profesionalId && profesionalId !== '__custom__') {
      matchedProfileIds.add(profesionalId);
      matchedMiembroIds.add(profesionalId);
    }

    // 2. Si coincide con el usuario logueado / perfil actual
    if (userProfile?.id) {
      if (
        !profNombre ||
        (userProfile.full_name && userProfile.full_name.trim().toLowerCase() === profNombre.trim().toLowerCase())
      ) {
        matchedProfileIds.add(userProfile.id);
      }
    }

    // 3. Buscar por nombre en profiles y miembros_equipo
    if (profNombre && profNombre.trim() !== '') {
      const cleanName = profNombre.trim();

      // Buscar en profiles
      let profQuery = supabase.from('profiles').select('id, full_name');
      if (tenantId) profQuery = profQuery.eq('tenant_id', tenantId);
      const { data: profs } = await profQuery.ilike('full_name', `%${cleanName}%`);
      if (profs && profs.length > 0) {
        profs.forEach(p => matchedProfileIds.add(p.id));
      }

      // Buscar en miembros_equipo
      let eqQuery = supabase.from('miembros_equipo').select('id, profile_id, full_name');
      if (tenantId) eqQuery = eqQuery.eq('tenant_id', tenantId);
      const { data: eqMems } = await eqQuery.ilike('full_name', `%${cleanName}%`);
      if (eqMems && eqMems.length > 0) {
        eqMems.forEach(m => {
          matchedMiembroIds.add(m.id);
          if (m.profile_id) matchedProfileIds.add(m.profile_id);
        });
      }
    }

    // Si aún no hay IDs y tenemos el perfil actual, usarlo de fallback
    if (matchedProfileIds.size === 0 && matchedMiembroIds.size === 0 && userProfile?.id) {
      matchedProfileIds.add(userProfile.id);
    }

    const pIds = Array.from(matchedProfileIds).filter(Boolean);
    const mIds = Array.from(matchedMiembroIds).filter(Boolean);

    let rawMatriculas = [];

    if (pIds.length > 0 || mIds.length > 0) {
      const orConditions = [];
      if (pIds.length > 0) {
        orConditions.push(`profile_id.in.(${pIds.join(',')})`);
      }
      if (mIds.length > 0) {
        orConditions.push(`miembro_id.in.(${mIds.join(',')})`);
      }

      const { data: matData, error: matErr } = await supabase
        .from('matriculas')
        .select('*')
        .or(orConditions.join(','))
        .order('created_at', { ascending: true });

      if (!matErr && matData && matData.length > 0) {
        rawMatriculas = matData;
      }
    }

    // Fallback con datos directos del perfil si la tabla matriculas no tiene fotos
    if (
      rawMatriculas.length === 0 &&
      userProfile &&
      (userProfile.matricula_foto_frente_url || userProfile.matricula_foto_dorso_url)
    ) {
      rawMatriculas = [
        {
          institucion: userProfile.matricula_institucion || '',
          numero: userProfile.matricula_numero || userProfile.matricula || '',
          vencimiento: userProfile.matricula_vencimiento || null,
          foto_frente_url: userProfile.matricula_foto_frente_url,
          foto_dorso_url: userProfile.matricula_foto_dorso_url
        }
      ];
    }

    // Filtrar aquellas que tengan al menos una foto (frente o dorso)
    const validWithPhotos = rawMatriculas.filter(
      m => Boolean(m.foto_frente_url || m.foto_dorso_url)
    );

    if (validWithPhotos.length === 0) return [];

    // Procesar imágenes a Base64 y calcular dimensiones (máximo 2 matrículas para mantener reporte conciso)
    const processedMatriculas = await Promise.all(
      validWithPhotos.slice(0, 2).map(async (m) => {
        let frenteB64 = null;
        let dorsoB64 = null;
        let frenteDims = { width: 400, height: 250 };
        let dorsoDims = { width: 400, height: 250 };

        if (m.foto_frente_url) {
          frenteB64 = await resolveStorageImageBase64(m.foto_frente_url);
          if (frenteB64) {
            frenteDims = await getImageDimensions(frenteB64);
          }
        }

        if (m.foto_dorso_url) {
          dorsoB64 = await resolveStorageImageBase64(m.foto_dorso_url);
          if (dorsoB64) {
            dorsoDims = await getImageDimensions(dorsoB64);
          }
        }

        return {
          id: m.id || null,
          institucion: m.institucion || '',
          numero: m.numero || '',
          vencimiento: m.vencimiento || null,
          fotoFrenteBase64: frenteB64,
          fotoFrenteDims: frenteDims,
          fotoDorsoBase64: dorsoB64,
          fotoDorsoDims: dorsoDims
        };
      })
    );

    // Retornar solo las que lograron descargar al menos 1 imagen
    return processedMatriculas.filter(m => Boolean(m.fotoFrenteBase64 || m.fotoDorsoBase64));
  } catch (err) {
    console.error('[pdfMatriculasAnexo] Error en fetchProfessionalMatriculasWithImages:', err);
    return [];
  }
}

/**
 * Renderiza 1 o 2 hojas con las credenciales del profesional firmante en el documento PDF
 */
export function renderMatriculasAnexoPages(doc, {
  matriculas = [],
  profNombre = '',
  drawHeader = null,
  drawProtocolTitleBar = null,
  tenantPrimaryColor = null
}) {
  if (!doc || !matriculas || matriculas.length === 0) {
    return 0;
  }

  // Paleta estándar de colores
  const COLOR_AZUL_PRINCIPAL = tenantPrimaryColor || [70, 141, 255];
  const COLOR_SLATE_700 = [51, 65, 85];
  const COLOR_SLATE_500 = [100, 116, 139];
  const COLOR_SLATE_300 = [203, 213, 225];
  const COLOR_SLATE_200 = [226, 232, 240];
  const COLOR_SLATE_100 = [241, 245, 249];
  const COLOR_SLATE_50 = [248, 250, 252];
  const COLOR_NEGRO = [0, 0, 0];
  const COLOR_BLANCO = [255, 255, 255];

  const setFill = (rgb) => doc.setFillColor(rgb[0], rgb[1], rgb[2]);
  const setDraw = (rgb) => doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
  const setText = (rgb) => doc.setTextColor(rgb[0], rgb[1], rgb[2]);

  let pagesAdded = 0;

  matriculas.forEach((m, idx) => {
    doc.addPage('a4', 'portrait');
    pagesAdded++;

    // 1. Cabecera institucional superior
    if (typeof drawHeader === 'function') {
      try {
        drawHeader(false);
      } catch (e) {
        console.warn('[pdfMatriculasAnexo] Error ejecutando drawHeader:', e);
      }
    }

    // 2. Barra de título del protocolo
    if (typeof drawProtocolTitleBar === 'function') {
      try {
        drawProtocolTitleBar(false, { x: 15, y: 22, w: 180, h: 5.5 });
      } catch (e) {
        console.warn('[pdfMatriculasAnexo] Error ejecutando drawProtocolTitleBar:', e);
      }
    }

    const cX = 15;
    const cW = 180;

    // 3. Título del Anexo
    const titleY = 29;
    const titleH = 6.5;
    setDraw(COLOR_NEGRO);
    setFill(COLOR_SLATE_200);
    doc.setLineWidth(0.4);
    doc.rect(cX, titleY, cW, titleH, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    setText(COLOR_NEGRO);
    const titleText = matriculas.length > 1
      ? `ANEXO: CREDENCIAL / MATRÍCULA PROFESIONAL HABILITANTE (${idx + 1} DE ${matriculas.length})`
      : 'ANEXO: CREDENCIAL / MATRÍCULA PROFESIONAL HABILITANTE';
    doc.text(titleText, cX + (cW / 2), titleY + 4.5, { align: 'center' });

    // 4. Ficha Técnica con los datos de la matrícula
    const metaY = 36.5;
    const metaH = 13.5;
    const halfW = cW / 2;

    doc.setLineWidth(0.25);
    setDraw(COLOR_NEGRO);
    doc.rect(cX, metaY, cW, metaH, 'S');
    doc.line(cX + halfW, metaY, cX + halfW, metaY + metaH);
    doc.line(cX, metaY + (metaH / 2), cX + cW, metaY + (metaH / 2));

    // Fila 1 - Izquierda: Profesional
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    setText(COLOR_SLATE_700);
    doc.text('Profesional Firmante:', cX + 2.5, metaY + 4.5);
    doc.setFont('helvetica', 'normal');
    setText(COLOR_NEGRO);
    doc.text(profNombre || '—', cX + 32, metaY + 4.5);

    // Fila 1 - Derecha: Institución
    doc.setFont('helvetica', 'bold');
    setText(COLOR_SLATE_700);
    doc.text('Institución / Consejo:', cX + halfW + 2.5, metaY + 4.5);
    doc.setFont('helvetica', 'normal');
    setText(COLOR_NEGRO);
    doc.text(m.institucion || '—', cX + halfW + 33, metaY + 4.5);

    // Fila 2 - Izquierda: Matrícula Nº
    doc.setFont('helvetica', 'bold');
    setText(COLOR_SLATE_700);
    doc.text('Matrícula Nº:', cX + 2.5, metaY + 11);
    doc.setFont('helvetica', 'normal');
    setText(COLOR_NEGRO);
    doc.text(m.numero || '—', cX + 22, metaY + 11);

    // Fila 2 - Derecha: Vigencia / Vencimiento
    doc.setFont('helvetica', 'bold');
    setText(COLOR_SLATE_700);
    doc.text('Vencimiento / Vigencia:', cX + halfW + 2.5, metaY + 11);
    doc.setFont('helvetica', 'normal');
    setText(COLOR_NEGRO);
    const vencStr = m.vencimiento ? formatDate(m.vencimiento) : 'Vigente / Sin Vencimiento';
    doc.text(vencStr, cX + halfW + 36, metaY + 11);

    const hasFrente = Boolean(m.fotoFrenteBase64);
    const hasDorso = Boolean(m.fotoDorsoBase64);

    // 5. Renderizado de Fotos (Frente y Dorso)
    if (hasFrente && hasDorso) {
      // Caso A: Ambas fotos presentes (Frente arriba, Dorso abajo)
      const boxH = 104;

      // --- Caja 1: Frente ---
      const fY = 52;
      setDraw(COLOR_SLATE_300);
      setFill(COLOR_SLATE_50);
      doc.setLineWidth(0.3);
      doc.rect(cX, fY, cW, boxH, 'FD');

      // Banner Frente
      setFill(COLOR_SLATE_200);
      setDraw(COLOR_SLATE_300);
      doc.rect(cX, fY, cW, 5.5, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      setText(COLOR_SLATE_700);
      doc.text('CREDENCIAL PROFESIONAL — FRENTE', cX + (cW / 2), fY + 3.8, { align: 'center' });

      // Imagen Frente centrada y proporcional
      const maxImgW = cW - 10;
      const maxImgH = boxH - 12;
      const fRatio = (m.fotoFrenteDims.width && m.fotoFrenteDims.height)
        ? (m.fotoFrenteDims.width / m.fotoFrenteDims.height)
        : 1.58;

      let rW = maxImgW;
      let rH = maxImgW / fRatio;
      if (rH > maxImgH) {
        rH = maxImgH;
        rW = maxImgH * fRatio;
      }
      const posX = cX + (cW - rW) / 2;
      const posY = (fY + 6.5) + (maxImgH - rH) / 2;

      try {
        doc.addImage(m.fotoFrenteBase64, 'PNG', posX, posY, rW, rH, undefined, 'FAST');
      } catch (err) {
        console.error('[pdfMatriculasAnexo] Error dibujando foto frente:', err);
      }

      // --- Caja 2: Dorso ---
      const dY = 160;
      setDraw(COLOR_SLATE_300);
      setFill(COLOR_SLATE_50);
      doc.setLineWidth(0.3);
      doc.rect(cX, dY, cW, boxH, 'FD');

      // Banner Dorso
      setFill(COLOR_SLATE_200);
      setDraw(COLOR_SLATE_300);
      doc.rect(cX, dY, cW, 5.5, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      setText(COLOR_SLATE_700);
      doc.text('CREDENCIAL PROFESIONAL — DORSO', cX + (cW / 2), dY + 3.8, { align: 'center' });

      // Imagen Dorso centrada y proporcional
      const dRatio = (m.fotoDorsoDims.width && m.fotoDorsoDims.height)
        ? (m.fotoDorsoDims.width / m.fotoDorsoDims.height)
        : 1.58;

      let dW = maxImgW;
      let dH = maxImgW / dRatio;
      if (dH > maxImgH) {
        dH = maxImgH;
        dW = maxImgH * dRatio;
      }
      const dPosX = cX + (cW - dW) / 2;
      const dPosY = (dY + 6.5) + (maxImgH - dH) / 2;

      try {
        doc.addImage(m.fotoDorsoBase64, 'PNG', dPosX, dPosY, dW, dH, undefined, 'FAST');
      } catch (err) {
        console.error('[pdfMatriculasAnexo] Error dibujando foto dorso:', err);
      }

    } else {
      // Caso B: Una sola foto presente (Frente o Dorso) - Formato grande centrado
      const singleBoxY = 52;
      const singleBoxH = 212;
      const targetB64 = m.fotoFrenteBase64 || m.fotoDorsoBase64;
      const targetDims = m.fotoFrenteBase64 ? m.fotoFrenteDims : m.fotoDorsoDims;
      const label = m.fotoFrenteBase64 ? 'CREDENCIAL PROFESIONAL — FRENTE' : 'CREDENCIAL PROFESIONAL — DORSO';

      setDraw(COLOR_SLATE_300);
      setFill(COLOR_SLATE_50);
      doc.setLineWidth(0.3);
      doc.rect(cX, singleBoxY, cW, singleBoxH, 'FD');

      // Banner
      setFill(COLOR_SLATE_200);
      setDraw(COLOR_SLATE_300);
      doc.rect(cX, singleBoxY, cW, 6, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      setText(COLOR_SLATE_700);
      doc.text(label, cX + (cW / 2), singleBoxY + 4.2, { align: 'center' });

      const maxImgW = cW - 14;
      const maxImgH = singleBoxH - 16;
      const ratio = (targetDims.width && targetDims.height)
        ? (targetDims.width / targetDims.height)
        : 1.58;

      let rW = maxImgW;
      let rH = maxImgW / ratio;
      if (rH > maxImgH) {
        rH = maxImgH;
        rW = maxImgH * ratio;
      }
      const posX = cX + (cW - rW) / 2;
      const posY = (singleBoxY + 8) + (maxImgH - rH) / 2;

      try {
        doc.addImage(targetB64, 'PNG', posX, posY, rW, rH, undefined, 'FAST');
      } catch (err) {
        console.error('[pdfMatriculasAnexo] Error dibujando foto única de matrícula:', err);
      }
    }
  });

  return pagesAdded;
}
