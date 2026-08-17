import { PDFDocument, PDFName } from 'pdf-lib';
import { formatDate } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { getLimiteDbaForTe, getPuntoCalculos } from './tablasAnexoV';
import { setFillColor, setDrawColor, setTextColor, hexToRgb, PDF_THEME } from '@/lib/pdf/pdfTheme';

import { getBase64ImageFromUrl } from '@/lib/pdf/pdfImages';

// Robust Base64 getter for attachments from Supabase storage / URLs
const getAdjuntoBase64 = async (adj) => {
  if (!adj) return '';

  // 1. Check direct base64 data URLs
  if (adj.preview && adj.preview.startsWith('data:image/')) return adj.preview;
  if (adj.public_url && adj.public_url.startsWith('data:image/')) return adj.public_url;

  const path = adj.storage_path || adj.original_path || adj.public_url || adj.url || adj.archivo_url;
  if (!path) return '';

  // 2. Direct download from Supabase Storage bucket for relative paths
  if (!path.startsWith('http') && !path.startsWith('data:')) {
    try {
      const { data: blob, error } = await supabase.storage
        .from('protocolos-ruido')
        .download(path);

      if (!error && blob) {
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result || '');
          reader.onerror = () => resolve('');
          reader.readAsDataURL(blob);
        });
      }
    } catch (err) {
      console.warn('[getAdjuntoBase64] Direct Supabase storage download warning:', err);
    }
  }

  // 3. If HTTP URL or fallback: fetch signed/public URL
  let targetUrl = path;
  if (!targetUrl.startsWith('http') && !targetUrl.startsWith('data:')) {
    try {
      const { data: sData } = await supabase.storage
        .from('protocolos-ruido')
        .createSignedUrl(path, 3600);
      if (sData?.signedUrl) targetUrl = sData.signedUrl;
    } catch (e) {
      const { data: pData } = supabase.storage
        .from('protocolos-ruido')
        .getPublicUrl(path);
      if (pData?.publicUrl) targetUrl = pData.publicUrl;
    }
  }

  return await getBase64ImageFromUrl(targetUrl);
};

// Resize image for PDF
const resizeImageForPdf = (base64Str, maxWidth = 400, maxHeight = 400) => {
  return new Promise((resolve) => {
    if (!base64Str || !base64Str.startsWith('data:image/')) {
      resolve('');
      return;
    }
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => {
      resolve(base64Str);
    };
  });
};

// Get original dimensions of base64 image
const getImgDimensions = (base64Str) => {
  return new Promise((resolve) => {
    if (!base64Str || !base64Str.startsWith('data:image/')) {
      resolve({ width: 120, height: 50 });
      return;
    }
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      resolve({ width: img.width, height: img.height });
    };
    img.onerror = () => {
      resolve({ width: 120, height: 50 });
    };
  });
};

export const generateNoiseProtocolPdf = async (
  proto,
  tenant,
  empresas,
  allEstablecimientos,
  puntosList,
  adjuntosList,
  isDevMode = false,
  userProfile = null
) => {
  const { jsPDF } = await import('jspdf');

  // A4 size in mm: 210 x 297 (Portrait) / 297 x 210 (Landscape)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true
  });

  const emp = empresas.find(e => e.id === proto.razon_social_id);
  const est = allEstablecimientos.find(e => e.id === proto.establecimiento_id);

  // Download Header Logo (User Profile Admin, Tenant or Default)
  let logoBase64 = '';
  try {
    const logoUrl = userProfile?.logo_1_url || userProfile?.logo_url || tenant?.logo_1_url || tenant?.logo_url;
    if (logoUrl) {
      logoBase64 = await getBase64ImageFromUrl(logoUrl);
    }
  } catch (logoErr) {
    console.error('Error al descargar logo para PDF:', logoErr);
  }
  if (!logoBase64) {
    logoBase64 = await getBase64ImageFromUrl('/brand/logo-primary.png');
  }
  if (logoBase64) {
    logoBase64 = await resizeImageForPdf(logoBase64, 400, 400);
  }

  // Calculate logo dimensions preserving exact aspect ratio
  let logoDims = { width: 120, height: 50 };
  if (logoBase64) {
    logoDims = await getImgDimensions(logoBase64);
  }

  // Download Signature base64 if present (regenerate signed URL if expired)
  let signatureBase64 = '';
  let signatureDims = { width: 150, height: 60 };
  if (proto.firma_profesional) {
    try {
      let sigUrl = proto.firma_profesional;
      if (sigUrl && !sigUrl.startsWith('data:')) {
        let relativePath = sigUrl;
        let bucketName = 'signatures';

        if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
          try {
            const urlObj = new URL(relativePath);
            const pathParts = urlObj.pathname.split('/');
            const bIdx = pathParts.findIndex(p => p === 'signatures' || p === 'documents' || p === 'avatars');
            if (bIdx !== -1 && bIdx < pathParts.length - 1) {
              bucketName = pathParts[bIdx];
              relativePath = pathParts.slice(bIdx + 1).join('/');
            }
          } catch (urlErr) {
            console.error('Error parseando URL de firma:', urlErr);
          }
        }

        if (relativePath && !relativePath.startsWith('http')) {
          try {
            const { data: sData, error: sErr } = await supabase.storage
              .from(bucketName)
              .createSignedUrl(relativePath, 3600);
            if (!sErr && sData?.signedUrl) {
              sigUrl = sData.signedUrl;
            }
          } catch (sErr) {
            console.error('Error generando URL firmada para la firma:', sErr);
          }
        }
      }

      signatureBase64 = await getBase64ImageFromUrl(sigUrl);
      if (signatureBase64) {
        signatureBase64 = await resizeImageForPdf(signatureBase64, 450, 450);
        signatureDims = await getImgDimensions(signatureBase64);
      }
    } catch (e) {
      console.error('Error fetching signature:', e);
    }
  }

  // Color Tokens (Gestión SySO Brand & PDF standard)
  const COLOR_AZUL_PRINCIPAL = '#468DFF';
  const COLOR_AZUL_SECUNDARIO = '#4F81BD';
  const COLOR_SLATE_900 = '#0F172A';
  const COLOR_SLATE_700 = '#334155';
  const COLOR_SLATE_600 = '#475569';
  const COLOR_SLATE_500 = '#64748B';
  const COLOR_SLATE_300 = '#CBD5E1';
  const COLOR_SLATE_200 = '#D9D9D9'; // Neutral header gray #D9D9D9
  const COLOR_SLATE_50 = '#F2F2F2';  // Empty cells soft gray #F2F2F2
  const COLOR_NEGRO = '#000000';
  const COLOR_BLANCO = '#FFFFFF';
  const COLOR_VERDE_CUMPLE = '#00B050'; // Green
  const COLOR_ROJO_NO_CUMPLE = '#FF0000'; // Red

  // Contact Info for Footer
  const companyName = tenant?.name || tenant?.razon_social || userProfile?.empresa || userProfile?.consultora || 'Gestión SySO';
  const emailVal = userProfile?.email || tenant?.email || tenant?.correo || '—';
  const phoneVal = userProfile?.phone || userProfile?.telefono || tenant?.phone || tenant?.telefono || '—';

  // Helper: Draw cell text perfectly constrained within width & height without overflow
  const drawCellText = (docInst, text, x, y, w, h, options = {}) => {
    const {
      align = 'left',
      valign = 'middle',
      fontSize = 8,
      fontStyle = 'normal',
      color = COLOR_NEGRO,
      padding = 1.2,
      maxLines = 0
    } = options;

    docInst.setFont('helvetica', fontStyle);
    docInst.setFontSize(fontSize);
    setTextColor(docInst, color);

    const availableW = Math.max(2, w - (padding * 2));
    let lines = docInst.splitTextToSize(String(text !== null && text !== undefined ? text : ''), availableW);

    if (maxLines > 0 && lines.length > maxLines) {
      lines = lines.slice(0, maxLines);
      if (lines[maxLines - 1]) {
        lines[maxLines - 1] = lines[maxLines - 1].replace(/\.?\s*$/, '...');
      }
    }

    const lineHeight = fontSize * 0.3527 * 1.15; // pt to mm conversion factor
    const totalTextH = lines.length * lineHeight;

    let startY = y + padding + (lineHeight * 0.75);
    if (valign === 'middle') {
      startY = y + (h - totalTextH) / 2 + (lineHeight * 0.75);
    } else if (valign === 'bottom') {
      startY = y + h - padding - (totalTextH - lineHeight);
    }

    lines.forEach((line, idx) => {
      let posX = x + padding;
      if (align === 'center') posX = x + (w / 2);
      else if (align === 'right') posX = x + w - padding;

      docInst.text(line, posX, startY + (idx * lineHeight), { align });
    });
  };

  // Helper: Draw Header Logo maintaining aspect ratio
  const drawHeaderLogo = (isLandscape = false) => {
    if (!logoBase64) return;
    const maxW = 38;
    const maxH = 15;
    const ratio = logoDims.width / logoDims.height;

    let renderW = maxW;
    let renderH = maxW / ratio;
    if (renderH > maxH) {
      renderH = maxH;
      renderW = maxH * ratio;
    }

    const x = isLandscape ? 17 : 15;
    const y = 6 + (maxH - renderH) / 2;

    try {
      doc.addImage(logoBase64, 'PNG', x, y, renderW, renderH, undefined, 'FAST');
    } catch (err) {
      console.error('Error drawing header logo:', err);
    }
  };

  // Helper: Header across all inner pages
  const drawHeader = (isLandscape = false) => {
    // Logo únicamente (se elimina texto del anexo, cliente y línea divisoria superior)
    drawHeaderLogo(isLandscape);
  };

  // Helper: Footer across all inner pages
  const drawFooter = (isLandscape = false, pageNum = 1, totalPages = 1) => {
    const startX = isLandscape ? 15 : 15;
    const endX = isLandscape ? 282 : 195;
    const barY = isLandscape ? 196 : 281;
    const textY = isLandscape ? 200.5 : 285.5;
    const subFooterY = isLandscape ? 204.5 : 289.5;
    const totalW = endX - startX;

    // Accent Blue Bar (espesor 0.35 mm o ~1 pt)
    setDrawColor(doc, COLOR_AZUL_PRINCIPAL);
    doc.setLineWidth(0.35);
    doc.line(startX, barY, endX, barY);

    // Contact Info Line Centered
    const boldText = companyName;
    const normalText = `  •  Tel: ${phoneVal}  •  Email: ${emailVal}`;

    doc.setFontSize(7.5);
    setTextColor(doc, COLOR_SLATE_700);

    // Medir anchos de los segmentos según su estilo
    doc.setFont('helvetica', 'bold');
    const boldWidth = doc.getTextWidth(boldText);

    doc.setFont('helvetica', 'normal');
    const normalWidth = doc.getTextWidth(normalText);

    const totalTextWidth = boldWidth + normalWidth;
    const lineStartX = startX + (totalW / 2) - (totalTextWidth / 2);

    // Dibujar secuencialmente
    doc.setFont('helvetica', 'bold');
    doc.text(boldText, lineStartX, textY);

    doc.setFont('helvetica', 'normal');
    doc.text(normalText, lineStartX + boldWidth, textY);

    // Sub-footer: Page count right
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    setTextColor(doc, COLOR_SLATE_600);
    doc.text(`Página ${pageNum} de ${totalPages}`, endX, subFooterY, { align: 'right' });
  };

  // Helper: Protocol Bar Title
  const drawProtocolTitleBar = (isLandscape = false, customPos = null) => {
    const pos = customPos || (isLandscape ? { x: 17, y: 22, w: 263, h: 5.5 } : { x: 15, y: 22, w: 180, h: 5.5 });
    setFillColor(doc, COLOR_AZUL_PRINCIPAL);
    doc.rect(pos.x, pos.y, pos.w, pos.h, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    setTextColor(doc, COLOR_BLANCO);
    const textY = pos.y + (pos.h / 2) + 1.1;
    doc.text('PROTOCOLO PARA MEDICIÓN DE RUIDO EN EL AMBIENTE LABORAL', pos.x + (pos.w / 2), textY, { align: 'center' });
  };

  // Helper: Signature Block
  const drawSignatureBlock = (x, y, w, h) => {
    const imgMaxW = w;
    const imgMaxH = Math.max(28, h - 8);

    // 1. Signature image (rendered larger, allowed to overlap line/text as transparent PNG without deforming aspect ratio)
    if (signatureBase64) {
      try {
        const ratio = (signatureDims.width && signatureDims.height)
          ? signatureDims.width / signatureDims.height
          : 2.5;

        let renderW = imgMaxW;
        let renderH = imgMaxW / ratio;
        if (renderH > imgMaxH) {
          renderH = imgMaxH;
          renderW = imgMaxH * ratio;
        }

        const renderX = x + (w - renderW) / 2;
        const lineY = y + 24;
        const renderY = lineY - (renderH * 0.72);

        doc.addImage(signatureBase64, 'PNG', renderX, renderY, renderW, renderH, undefined, 'FAST');
      } catch (e) {
        console.error('Error drawing signature image:', e);
      }
    }

    // 2. Dotted line
    const lineY = y + 24;
    setDrawColor(doc, COLOR_NEGRO);
    doc.setLineWidth(0.25);
    const startX = x + 2;
    const endX = x + w - 2;
    let currX = startX;
    while (currX < endX) {
      doc.line(currX, lineY, Math.min(currX + 1.5, endX), lineY);
      currX += 2.5;
    }

    // 3. Label below line
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    setTextColor(doc, COLOR_NEGRO);
    doc.text('Firma, Aclaración y Registro del Profesional Interviniente', x + (w / 2), lineY + 3.5, { align: 'center' });

    // 4. Nombre y Apellido del Profesional
    let currentTextY = lineY + 7.5;
    if (profNombre) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      setTextColor(doc, COLOR_SLATE_900);
      doc.text(profNombre, x + (w / 2), currentTextY, { align: 'center' });
      currentTextY += 3.8;
    }

    // 5. Matrícula Profesional
    if (profMatricula) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      setTextColor(doc, COLOR_SLATE_600);
      doc.text(profMatricula, x + (w / 2), currentTextY, { align: 'center' });
    }
  };

  // Helper: Draw math fraction
  const drawFraction = (topText, bottomText, x, y, width, height) => {
    doc.setFontSize(8);
    setTextColor(doc, COLOR_NEGRO);
    const midX = x + (width / 2);
    const topStr = String(topText);

    // Numerator
    if (topStr.includes('Σ')) {
      const restText = topStr.replace('Σ', '').trim();
      doc.setFont('symbol', 'normal');
      doc.setFontSize(8);
      const sigWidth = doc.getTextWidth('S');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      const restWidth = doc.getTextWidth(' ' + restText);
      const totalW = sigWidth + restWidth;
      const startX = midX - (totalW / 2);

      doc.setFont('symbol', 'normal');
      doc.text('S', startX, y + (height * 0.38));
      doc.setFont('helvetica', 'normal');
      doc.text(' ' + restText, startX + sigWidth, y + (height * 0.38));
    } else {
      doc.setFont('helvetica', 'normal');
      doc.text(topStr, midX, y + (height * 0.38), { align: 'center' });
    }

    // Line
    setDrawColor(doc, COLOR_NEGRO);
    doc.setLineWidth(0.25);
    doc.line(x + 2, y + (height * 0.52), x + width - 2, y + (height * 0.52));

    // Denominator
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(String(bottomText), midX, y + (height * 0.88), { align: 'center' });
  };

  // Safe data getters
  const razonSocial = proto.razon_social_text || emp?.razon_social || 'SUPEH TURISMO-HOTEL 8 DE OCTUBRE';
  const cuit = proto.cuit_text || emp?.cuit || '30-68308043-4';
  const direccion = proto.direccion_text || est?.direccion || 'PARAGUAY N°1420';
  const localidad = proto.localidad_text || est?.localidad || 'CABA';
  const provincia = proto.provincia_text || est?.provincia || 'BUENOS AIRES';
  const cp = proto.cp_text || est?.cp || '1061';
  const horarios = proto.horarios_turnos_text || 'Lunes a viernes de 8:00 a 17:00 hs';
  const marcaModeloNser = proto.instrumento_marca_modelo_serie || 'Sonómetro / Dosímetro marca Amprobe, modelo LM 100, N° de serie 12093081';
  const fechaCalib = proto.fecha_calibracion ? formatDate(proto.fecha_calibracion) : '';
  const metodologia = proto.metodologia_utilizada || 'Método de la Cuadrícula';
  const fechaMedicion = proto.fecha_medicion ? formatDate(proto.fecha_medicion) : '17/07/26';
  const horaInicio = proto.hora_inicio || '13:30';
  const horaFin = proto.hora_finalizacion || '';
  const condAtmos = proto.condiciones_atmosfericas || 'Parcialmente nublado\nTemperatura: 8 °C\nNubosidad: 80%\nHumedad: 96 %\nVisibilidad: 10 Km';

  const profNombre = proto.profesional_nombre || userProfile?.full_name || '';
  let profMatricula = proto.profesional_matricula || '';
  if (!profMatricula && userProfile) {
    if (userProfile.matricula_institucion && userProfile.matricula_numero) {
      profMatricula = `${userProfile.matricula_institucion} N° ${userProfile.matricula_numero}`;
    } else if (userProfile.matricula_numero) {
      profMatricula = `Mat. N° ${userProfile.matricula_numero}`;
    }
  }

  let pageCounter = 1;

  // ==========================================
  // PAGINA 1: PORTADA (A4 Vertical)
  // ==========================================
  // Outer Border (A4: 210 x 297 mm, 10mm margin from all paper edges)
  setDrawColor(doc, COLOR_AZUL_PRINCIPAL);
  doc.setLineWidth(0.4);
  doc.rect(10, 10, 190, 277, 'S');

  // Year Rectangle
  const currentYear = proto.fecha_medicion ? new Date(proto.fecha_medicion).getFullYear() : 2026;
  setFillColor(doc, COLOR_AZUL_PRINCIPAL);
  doc.rect(168, 15, 20, 28, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  setTextColor(doc, COLOR_BLANCO);
  doc.text(String(currentYear), 178, 32, { align: 'center' });

  // Main Cover Logo
  if (logoBase64) {
    const maxCoverW = 85;
    const maxCoverH = 45;
    const ratio = logoDims.width / logoDims.height;
    let coverW = maxCoverW;
    let coverH = maxCoverW / ratio;
    if (coverH > maxCoverH) {
      coverH = maxCoverH;
      coverW = maxCoverH * ratio;
    }
    const coverX = 39 + (maxCoverW - coverW) / 2;
    const coverY = 105 + (maxCoverH - coverH) / 2;
    try {
      doc.addImage(logoBase64, 'PNG', coverX, coverY, coverW, coverH, undefined, 'FAST');
    } catch (e) {
      console.error('Error drawing cover logo:', e);
    }
  }

  // Cover Main Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(30);
  setTextColor(doc, COLOR_AZUL_PRINCIPAL);
  const titleLines = doc.splitTextToSize('Protocolo para la Medición del nivel de Ruido en el Ambiente Laboral', 145);
  doc.text(titleLines, 39, 172);

  // Normative reference
  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'normal');
  setTextColor(doc, COLOR_SLATE_600);
  doc.text('LEY Nº 19.587 - DECRETO Nº 351/79, ANEXO V, CAPITULO 13 - ACUSTICA', 39, 222);
  doc.text('ANEXO - RESOLUCIÓN SRT 85 / 2012 (PROTOCOLO DE MEDICIÓN DE RUIDO)', 39, 228);

  // Brand / Consultora
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  setTextColor(doc, COLOR_SLATE_900);
  doc.text(companyName.toUpperCase(), 39, 246);

  // ==========================================
  // HOJAS INFORMATIVAS: ACÚSTICA (ANEXO V - CAPÍTULO 13 - DEC. 351/79)
  // ==========================================
  doc.addPage('a4', 'portrait');
  pageCounter++;
  drawHeader(false);

  // Section Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  setTextColor(doc, COLOR_NEGRO);
  doc.text('Acústica (ANEXO V - Capítulo 13 – Dec. 351/79)', 15, 28);
  setDrawColor(doc, COLOR_AZUL_PRINCIPAL);
  doc.setLineWidth(0.4);
  doc.line(15, 30, 195, 30);

  let currentY = 36;

  const checkPageY = (neededH) => {
    if (currentY + neededH > 275) {
      doc.addPage('a4', 'portrait');
      pageCounter++;
      drawHeader(false);
      currentY = 28;
      return true;
    }
    return false;
  };

  const printSectionHeader = (titleText) => {
    checkPageY(10);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    setTextColor(doc, COLOR_AZUL_PRINCIPAL);
    doc.text(titleText.toUpperCase(), 15, currentY);
    currentY += 6;
  };

  const printParagraph = (pText, pStyle = 'normal') => {
    if (pStyle === 'formula') {
      checkPageY(10);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      setTextColor(doc, COLOR_NEGRO);
      doc.text(pText, 25, currentY);
      currentY += 6;
    } else if (pStyle === 'legend') {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      setTextColor(doc, COLOR_SLATE_600);
      const lines = doc.splitTextToSize(pText, 180);
      const blockH = (lines.length * 3.8) + 4.5;
      checkPageY(blockH);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      setTextColor(doc, COLOR_SLATE_600);
      doc.text(pText, 15, currentY, { align: 'justify', maxWidth: 180 });
      currentY += blockH;
    } else {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      setTextColor(doc, COLOR_SLATE_900);
      const lines = doc.splitTextToSize(pText, 180);
      const blockH = (lines.length * 4.2) + 4.5;
      checkPageY(blockH);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      setTextColor(doc, COLOR_SLATE_900);
      doc.text(pText, 15, currentY, { align: 'justify', maxWidth: 180 });
      currentY += blockH;
    }
  };

  // 1. Infrasonido y sonido de baja frecuencia
  printSectionHeader('Infrasonido y sonido de baja frecuencia');
  printParagraph('Estos límites representan las exposiciones al sonido a los que se cree que casi todos los trabajadores pueden estar expuestos repetidamente sin efectos adversos para la audición.');
  printParagraph('Excepto para el sonido de impulsos de banda de un tercio de octava, con duración inferior a 2 segundos, los niveles para frecuencias entre 1 y 80 Hz de nivel de presión sonoro (NPS), no deben exceder el valor techo de 145 dB. Además, el NPS global no ponderado no debe exceder el valor techo de 150 dB.');
  printParagraph('No hay tiempo límite para estas exposiciones. Sin embargo, la aplicación de los valores límite para el Ruido y el Ultrasonido, recomendados para prevenir la pérdida de audición por el ruido, puede proporcionar un nivel reducido aceptable en el tiempo.');
  printParagraph('Una alternativa que puede utilizarse, pero con un criterio ligeramente más restrictivo, es cuando el pico NPS medido con la escala de frecuencias, del sonómetro en lineal o no ponderada, no exceda de 145 dB para situaciones de sonido sin impulsos.');
  printParagraph('La resonancia en el pecho de los sonidos de baja frecuencia en el intervalo aproximado de 50 Hz a 60 Hz puede causar vibración del cuerpo entero. Este efecto puede causar molestias e incomodidad, hasta hacerse necesario reducir el NPS de este sonido a un nivel al que desaparezca el problema.');
  printParagraph('Las mediciones de la exposición al ruido se deberán ajustar a las prescripciones establecidas por las normas nacionales e internacionales.');
  printParagraph('Estos valores límite se refieren a los niveles de presión acústica y duraciones de exposición que representan las condiciones en las que se cree que casi todos los trabajadores pueden estar expuestos repetidamente sin efectos adversos sobre su capacidad para oír y comprender una conversación normal.');
  printParagraph('Cuando los trabajadores estén expuestos al ruido a niveles iguales o superiores a los valores límite, es necesario un programa completo de conservación de la audición que incluya pruebas audiométricas.');

  // 2. Ruido continuo o intermitente
  printSectionHeader('Ruido continuo o intermitente');
  printParagraph('El nivel de presión acústica se debe determinar por medio de un sonómetro o dosímetro que se ajusten, como mínimo, a los requisitos de la especificación de las normas nacionales o internacionales. El sonómetro deberá disponer de filtro de ponderación frecuencial A y respuesta lenta. La duración de la exposición no deberá exceder de los valores que se dan en la Tabla 1.');
  printParagraph('Estos valores son de aplicación a la duración total de la exposición por día de trabajo, con independencia de si se trata de una exposición continua o de varias exposiciones de corta duración.');
  printParagraph('Cuando la exposición diaria al ruido se compone de dos o más períodos de exposición a distintos niveles de ruidos, se debe tomar en consideración el efecto global, en lugar del efecto individual de cada período. Si la suma de las fracciones siguientes:');
  
  // Fórmula
  printParagraph('Ecuación para Exposición Combinada a Ruido:', 'formula');
  printParagraph('C1 / T1 + C2 / T2 + ... + Cn / Tn', 'formula');
  printParagraph('es mayor que la unidad, entonces se debe considerar que la exposición global sobrepasa el valor límite umbral. C1 indica la duración total de la exposición a un nivel específico de ruido y T1 indica la duración total de la exposición permitida a ese nivel. En los cálculos citados, se usarán todas las exposiciones al ruido en el lugar de trabajo que alcancen o sean superiores a los 80 dBA. Esta fórmula se debe aplicar cuando se utilicen los sonómetros para sonidos con niveles estables de por lo menos 3 segundos. Para sonidos que no cumplan esta condición, se debe utilizar un dosímetro o sonómetro de integración. El límite se excede cuando la dosis es mayor de 100%, medida en un dosímetro fijado para un índice de conversión de 3 dB y un nivel de 85 dBA como criterio para las 8 horas.');
  printParagraph('Utilizando el sonómetro de integración el valor límite se excede cuando el nivel medio de sonido supere los valores de la Tabla 1.');
  currentY += 2;

  // Tabla 1: Valores Límite para Ruido Continuo o Intermitente
  const drawTabla1RuidoNormativa = () => {
    const tX = 15;
    const tW = 180;
    
    checkPageY(14);
    setFillColor(doc, COLOR_AZUL_PRINCIPAL);
    doc.rect(tX, currentY, tW, 6, 'F');
    drawCellText(doc, 'TABLA 1: VALORES LÍMITE UMBRAL PARA RUIDO (Dec. 351/79 - ANEXO V)', tX, currentY, tW, 6, { align: 'center', fontStyle: 'bold', fontSize: 8, color: COLOR_BLANCO });
    currentY += 6;

    setDrawColor(doc, COLOR_SLATE_300);
    setFillColor(doc, COLOR_SLATE_200);
    doc.rect(tX, currentY, 60, 6, 'FD');
    doc.rect(tX + 60, currentY, 40, 6, 'FD');
    doc.rect(tX + 100, currentY, 80, 6, 'FD');
    drawCellText(doc, 'Duración por Día', tX, currentY, 60, 6, { align: 'center', fontStyle: 'bold', fontSize: 7.5 });
    drawCellText(doc, 'Unidad', tX + 60, currentY, 40, 6, { align: 'center', fontStyle: 'bold', fontSize: 7.5 });
    drawCellText(doc, 'Nivel de Presión Acústica (dBA)', tX + 100, currentY, 80, 6, { align: 'center', fontStyle: 'bold', fontSize: 7.5 });
    currentY += 6;

    const filasTabla1 = [
      { dur: '24', uni: 'horas', dba: '80' },
      { dur: '16', uni: 'horas', dba: '82' },
      { dur: '8', uni: 'horas', dba: '85' },
      { dur: '4', uni: 'horas', dba: '88' },
      { dur: '2', uni: 'horas', dba: '91' },
      { dur: '1', uni: 'hora', dba: '94' },
      { dur: '30', uni: 'minutos', dba: '97' },
      { dur: '15', uni: 'minutos', dba: '100' },
      { dur: '7,50', uni: 'minutos', dba: '103' },
      { dur: '3,75', uni: 'minutos', dba: '106' },
      { dur: '1,88', uni: 'minutos', dba: '109' },
      { dur: '0,94', uni: 'minutos', dba: '112' },
      { dur: '28,12', uni: 'segundos', dba: '115' },
      { dur: '14,06', uni: 'segundos', dba: '118' },
      { dur: '7,03', uni: 'segundos', dba: '121' },
      { dur: '3,52', uni: 'segundos', dba: '124' },
      { dur: '1,76', uni: 'segundos', dba: '127' },
      { dur: '0,88', uni: 'segundos', dba: '130' },
      { dur: '0,44', uni: 'segundos', dba: '133' },
      { dur: '0,22', uni: 'segundos', dba: '136' },
      { dur: '0,11', uni: 'segundos', dba: '139' },
    ];

    filasTabla1.forEach(row => {
      const rowH = 5;
      if (checkPageY(rowH)) {
        setDrawColor(doc, COLOR_SLATE_300);
        setFillColor(doc, COLOR_SLATE_200);
        doc.rect(tX, currentY, 60, 6, 'FD');
        doc.rect(tX + 60, currentY, 40, 6, 'FD');
        doc.rect(tX + 100, currentY, 80, 6, 'FD');
        drawCellText(doc, 'Duración por Día', tX, currentY, 60, 6, { align: 'center', fontStyle: 'bold', fontSize: 7.5 });
        drawCellText(doc, 'Unidad', tX + 60, currentY, 40, 6, { align: 'center', fontStyle: 'bold', fontSize: 7.5 });
        drawCellText(doc, 'Nivel de Presión Acústica (dBA)', tX + 100, currentY, 80, 6, { align: 'center', fontStyle: 'bold', fontSize: 7.5 });
        currentY += 6;
      }

      setDrawColor(doc, COLOR_SLATE_300);
      doc.rect(tX, currentY, 60, rowH, 'S');
      doc.rect(tX + 60, currentY, 40, rowH, 'S');
      doc.rect(tX + 100, currentY, 80, rowH, 'S');

      drawCellText(doc, row.dur, tX + 2, currentY, 56, rowH, { fontSize: 7.5, valign: 'middle' });
      drawCellText(doc, row.uni, tX + 62, currentY, 36, rowH, { align: 'center', fontSize: 7.5, valign: 'middle' });
      drawCellText(doc, row.dba + ' dBA', tX + 102, currentY, 76, rowH, { align: 'center', fontStyle: 'bold', fontSize: 7.5, color: COLOR_AZUL_PRINCIPAL, valign: 'middle' });

      currentY += rowH;
    });

    currentY += 2;
    printParagraph('* No ha de haber exposiciones a ruido continuo, intermitente o de impacto por encima de un nivel pico C ponderado de 140 dB.', 'legend');
    printParagraph('** El nivel se mide con sonómetro en ponderación A y respuesta lenta.', 'legend');
    currentY += 4;
  };

  drawTabla1RuidoNormativa();

  // 3. Ruido de impulso o de impacto
  printSectionHeader('Ruido de impulso o de impacto');
  printParagraph('La medida del ruido de impulso o de impacto estará en el rango de 80 y 140 dBA y el rango del pulso debe ser por lo menos de 63 dB. No se permitirán exposiciones sin protección auditiva por encima de un nivel pico C ponderado de presión acústica de 140 dB.');
  printParagraph('Si no se dispone de la instrumentación para medir un pico C ponderado, se puede utilizar la medida de un pico no ponderado por debajo de 140 dB para suponer que el pico C ponderado está por debajo de ese valor.');
  currentY += 4;

  // 4. Ultrasonido
  printSectionHeader('Ultrasonido');
  printParagraph('Estos valores límite representan las condiciones bajo las cuales se cree que casi todos los trabajadores pueden estar expuestos repetidamente sin deteriorarse su capacidad para oír y escuchar una conversación normal.');
  printParagraph('Los valores límite establecidos para las frecuencias de 10 kilohercios (kHz) a 20 kHz, para prevenir los efectos subjetivos, se indican en la Tabla 1 con uno o dos asteriscos como notas de advertencia al pie de la tabla. Los valores sonoros de la media ponderada en el tiempo de 8 horas son una ampliación del valor límite para el ruido que es un media ponderada en el tiempo para 8 horas de 85 dBA.');

  const drawTablaUltrasonidoNormativa = () => {
    const tX = 15;
    const tW = 180;

    checkPageY(14);
    setFillColor(doc, COLOR_AZUL_PRINCIPAL);
    doc.rect(tX, currentY, tW, 6, 'F');
    drawCellText(doc, 'VALORES LÍMITE PARA ULTRASONIDO (Dec. 351/79 - ANEXO V)', tX, currentY, tW, 6, { align: 'center', fontStyle: 'bold', fontSize: 8, color: COLOR_BLANCO });
    currentY += 6;

    setDrawColor(doc, COLOR_SLATE_300);
    setFillColor(doc, COLOR_SLATE_200);
    doc.rect(tX, currentY, 50, 6, 'FD');
    doc.rect(tX + 50, currentY, 40, 6, 'FD');
    doc.rect(tX + 90, currentY, 45, 6, 'FD');
    doc.rect(tX + 135, currentY, 45, 6, 'FD');
    drawCellText(doc, 'Frecuencia Central (kHz)', tX, currentY, 50, 6, { align: 'center', fontStyle: 'bold', fontSize: 7.5 });
    drawCellText(doc, 'Techo Aire (dB)', tX + 50, currentY, 40, 6, { align: 'center', fontStyle: 'bold', fontSize: 7.5 });
    drawCellText(doc, 'TWA 8h Aire (dB)', tX + 90, currentY, 45, 6, { align: 'center', fontStyle: 'bold', fontSize: 7.5 });
    drawCellText(doc, 'Techo Agua (dB)', tX + 135, currentY, 45, 6, { align: 'center', fontStyle: 'bold', fontSize: 7.5 });
    currentY += 6;

    const filasUltrasonido = [
      { f: '10', tAire: '105*', twa: '88*', tAgua: '167' },
      { f: '12,5', tAire: '105*', twa: '89*', tAgua: '167' },
      { f: '16', tAire: '105*', twa: '92*', tAgua: '167' },
      { f: '20', tAire: '105*', twa: '94*', tAgua: '167' },
      { f: '25', tAire: '110**', twa: '—', tAgua: '172' },
      { f: '31,5', tAire: '115**', twa: '—', tAgua: '177' },
      { f: '40', tAire: '115**', twa: '—', tAgua: '177' },
      { f: '50', tAire: '115**', twa: '—', tAgua: '177' },
      { f: '63', tAire: '115**', twa: '—', tAgua: '177' },
      { f: '80', tAire: '115**', twa: '—', tAgua: '177' },
      { f: '100', tAire: '115**', twa: '—', tAgua: '177' },
    ];

    filasUltrasonido.forEach(row => {
      const rowH = 5;
      if (checkPageY(rowH)) {
        setDrawColor(doc, COLOR_SLATE_300);
        setFillColor(doc, COLOR_SLATE_200);
        doc.rect(tX, currentY, 50, 6, 'FD');
        doc.rect(tX + 50, currentY, 40, 6, 'FD');
        doc.rect(tX + 90, currentY, 45, 6, 'FD');
        doc.rect(tX + 135, currentY, 45, 6, 'FD');
        drawCellText(doc, 'Frecuencia Central (kHz)', tX, currentY, 50, 6, { align: 'center', fontStyle: 'bold', fontSize: 7.5 });
        drawCellText(doc, 'Techo Aire (dB)', tX + 50, currentY, 40, 6, { align: 'center', fontStyle: 'bold', fontSize: 7.5 });
        drawCellText(doc, 'TWA 8h Aire (dB)', tX + 90, currentY, 45, 6, { align: 'center', fontStyle: 'bold', fontSize: 7.5 });
        drawCellText(doc, 'Techo Agua (dB)', tX + 135, currentY, 45, 6, { align: 'center', fontStyle: 'bold', fontSize: 7.5 });
        currentY += 6;
      }

      setDrawColor(doc, COLOR_SLATE_300);
      doc.rect(tX, currentY, 50, rowH, 'S');
      doc.rect(tX + 50, currentY, 40, rowH, 'S');
      doc.rect(tX + 90, currentY, 45, rowH, 'S');
      doc.rect(tX + 135, currentY, 45, rowH, 'S');

      drawCellText(doc, row.f + ' kHz', tX + 2, currentY, 46, rowH, { fontStyle: 'bold', fontSize: 7.5, valign: 'middle' });
      drawCellText(doc, row.tAire, tX + 52, currentY, 36, rowH, { align: 'center', fontSize: 7.5, valign: 'middle' });
      drawCellText(doc, row.twa, tX + 92, currentY, 41, rowH, { align: 'center', fontSize: 7.5, valign: 'middle' });
      drawCellText(doc, row.tAgua, tX + 137, currentY, 41, rowH, { align: 'center', fontSize: 7.5, valign: 'middle' });

      currentY += rowH;
    });

    currentY += 2;
  };

  drawTablaUltrasonidoNormativa();

  printParagraph('* Pueden darse molestias y malestar subjetivos en algunos individuos a niveles entre 75 y 105 dB para las frecuencias desde 10 kHz, especialmente si son de naturaleza tonal. Para prevenir los efectos subjetivos puede ser necesaria la protección auditiva o reducir a 80 dB los sonidos tonales de frecuencias por debajo de 10 kHZ.', 'legend');
  printParagraph('** En estos valores se asume que existe acoplamiento humano con el agua u otro sustrato. Cuando no hay posibilidad de que el ultrasonido pueda acoplarse con el cuerpo en contacto con el agua o algún otro medio, estos valores umbrales pueden aumentarse en 30 dB. (Los valores de esta tabla no se aplican cuando la fuente de ultrasonido está en contacto directo con el cuerpo. Se debe utilizar el nivel de vibración en el hueso mastoideo).', 'legend');
  printParagraph('Se deben evitar los valores de la aceleración de 15 dB por encima de la referencia de 1 g.v.c.m., reduciendo la exposición o aislando el cuerpo de la fuente de acoplamiento (g = aceleración debida a la fuerza de la gravedad, 9,80665 m/s; v.c.m.= valor cuadrático medio).');

  // ==========================================
  // HOJA 1: FORMULARIO OFICIAL RUIDO (A4 Vertical - RES. SRT 85/12)
  // ==========================================
  doc.addPage('a4', 'portrait');
  pageCounter++;

  drawHeader(false);
  drawProtocolTitleBar(false, { x: 15, y: 22, w: 180, h: 6 });

  // Tabla 1: Datos del Establecimiento
  const t1X = 15;
  const t1Y = 29;
  const t1W = 180;
  const t1H = 36;

  setDrawColor(doc, COLOR_NEGRO);
  doc.setLineWidth(0.45);
  doc.rect(t1X, t1Y, t1W, t1H, 'S');

  // Title: Datos del establecimiento
  setFillColor(doc, COLOR_SLATE_200);
  doc.rect(t1X, t1Y, t1W, 6, 'FD');
  drawCellText(doc, 'Datos del establecimiento', t1X, t1Y, t1W, 6, { align: 'center', fontStyle: 'bold', fontSize: 9 });

  let rY = t1Y + 6;
  doc.setLineWidth(0.25);

  // Row: Razón Social
  doc.rect(t1X, rY, t1W, 6, 'S');
  drawCellText(doc, 'Razón Social:', t1X, rY, 30, 6, { fontStyle: 'bold', fontSize: 8.5 });
  drawCellText(doc, razonSocial, t1X + 30, rY, 150, 6, { fontSize: 8.5 });
  rY += 6;

  // Row: Dirección
  doc.rect(t1X, rY, t1W, 6, 'S');
  drawCellText(doc, 'Dirección:', t1X, rY, 30, 6, { fontStyle: 'bold', fontSize: 8.5 });
  drawCellText(doc, direccion, t1X + 30, rY, 150, 6, { fontSize: 8.5 });
  rY += 6;

  // Row: Localidad
  doc.rect(t1X, rY, t1W, 6, 'S');
  drawCellText(doc, 'Localidad:', t1X, rY, 30, 6, { fontStyle: 'bold', fontSize: 8.5 });
  drawCellText(doc, localidad, t1X + 30, rY, 150, 6, { fontSize: 8.5 });
  rY += 6;

  // Row: Provincia
  doc.rect(t1X, rY, t1W, 6, 'S');
  drawCellText(doc, 'Provincia:', t1X, rY, 30, 6, { fontStyle: 'bold', fontSize: 8.5 });
  drawCellText(doc, provincia, t1X + 30, rY, 150, 6, { fontSize: 8.5 });
  rY += 6;

  // Row: CP y CUIT
  doc.rect(t1X, rY, 50, 6, 'S');
  doc.rect(t1X + 50, rY, 130, 6, 'S');
  drawCellText(doc, 'C.P.:', t1X, rY, 14, 6, { fontStyle: 'bold', fontSize: 8.5 });
  drawCellText(doc, cp, t1X + 14, rY, 36, 6, { fontSize: 8.5 });
  drawCellText(doc, 'C.U.I.T.:', t1X + 50, rY, 20, 6, { fontStyle: 'bold', fontSize: 8.5 });
  drawCellText(doc, cuit, t1X + 70, rY, 110, 6, { fontSize: 8.5 });

  // Tabla 2: Datos para la Medición
  const t2X = 15;
  const t2Y = t1Y + t1H + 3;
  const t2W = 180;
  const t2H = 125;

  doc.setLineWidth(0.45);
  doc.rect(t2X, t2Y, t2W, t2H, 'S');

  // Title: Datos para la medición
  setFillColor(doc, COLOR_SLATE_200);
  doc.rect(t2X, t2Y, t2W, 6, 'FD');
  drawCellText(doc, 'Datos para la medición', t2X, t2Y, t2W, 6, { align: 'center', fontStyle: 'bold', fontSize: 9 });

  rY = t2Y + 6;
  doc.setLineWidth(0.25);

  // Marca, modelo y número de serie del instrumento utilizado
  doc.rect(t2X, rY, t2W, 12, 'S');
  drawCellText(doc, 'Marca, modelo y número de serie del instrumento utilizado:', t2X, rY, t2W, 5, { fontStyle: 'bold', fontSize: 8.5 });
  drawCellText(doc, marcaModeloNser, t2X, rY + 5, t2W, 7, { fontSize: 8.5 });
  rY += 12;

  // Fecha del certificado de calibración del instrumento utilizado en la medición
  doc.rect(t2X, rY, t2W, 6, 'S');
  drawCellText(doc, 'Fecha del certificado de calibración del instrumento utilizado en la medición:', t2X, rY, 130, 6, { fontStyle: 'bold', fontSize: 8.5 });
  drawCellText(doc, fechaCalib, t2X + 130, rY, 50, 6, { fontSize: 8.5 });
  rY += 6;

  // Fecha de la medición | Hora de inicio | Hora finalización
  doc.rect(t2X, rY, 60, 7, 'S');
  drawCellText(doc, 'Fecha de la medición:', t2X, rY, 34, 7, { fontStyle: 'bold', fontSize: 8.5 });
  drawCellText(doc, fechaMedicion, t2X + 34, rY, 26, 7, { fontSize: 8.5 });

  doc.rect(t2X + 60, rY, 55, 7, 'S');
  drawCellText(doc, 'Hora de inicio:', t2X + 60, rY, 28, 7, { fontStyle: 'bold', fontSize: 8.5 });
  drawCellText(doc, horaInicio, t2X + 88, rY, 27, 7, { fontSize: 8.5 });

  doc.rect(t2X + 115, rY, 65, 7, 'S');
  drawCellText(doc, 'Hora finalización:', t2X + 115, rY, 32, 7, { fontStyle: 'bold', fontSize: 8.5 });
  drawCellText(doc, horaFin, t2X + 147, rY, 33, 7, { fontSize: 8.5 });
  rY += 7;

  // Horarios/turnos habituales de trabajo
  doc.rect(t2X, rY, t2W, 12, 'S');
  drawCellText(doc, 'Horarios/turnos habituales de trabajo:', t2X, rY, t2W, 5, { fontStyle: 'bold', fontSize: 8.5 });
  drawCellText(doc, horarios || 'Lunes a viernes de 8:00 a 17:00 hs', t2X, rY + 5, t2W, 7, { fontSize: 8.5, valign: 'top' });
  rY += 12;

  // Describa las condiciones normales y/o habituales de trabajo.
  doc.rect(t2X, rY, t2W, 41, 'S');
  drawCellText(doc, 'Describa las condiciones normales y/o habituales de trabajo.', t2X, rY, t2W, 5, { fontStyle: 'bold', fontSize: 8.5 });
  const condHabitualesText = proto.condiciones_atmosfericas || 'Al momento de la medición, el establecimiento se encontraba funcionando en condiciones normales de producción.';
  drawCellText(doc, condHabitualesText, t2X + 2, rY + 5, t2W - 4, 35, { fontSize: 8.5, valign: 'top' });
  rY += 41;

  // Describa las condiciones de trabajo al momento de la medición.
  doc.rect(t2X, rY, t2W, 41, 'S');
  drawCellText(doc, 'Describa las condiciones de trabajo al momento de la medición.', t2X, rY, t2W, 5, { fontStyle: 'bold', fontSize: 8.5 });
  const obsText = proto.observaciones || 'Al momento de la medición, el establecimiento se encontraba funcionando en condiciones normales.';
  drawCellText(doc, obsText, t2X + 2, rY + 5, t2W - 4, 35, { fontSize: 8.5, valign: 'top' });

  // Tabla 3: Documentación que se Adjuntará a la Medición (Cuadro único sin división horizontal en el medio)
  const t3X = 15;
  const t3Y = t2Y + t2H + 3;
  const t3W = 180;
  const t3H = 19;

  doc.setLineWidth(0.45);
  doc.rect(t3X, t3Y, t3W, t3H, 'S');
  setFillColor(doc, COLOR_SLATE_200);
  doc.rect(t3X, t3Y, t3W, 6, 'FD');
  drawCellText(doc, 'Documentación que se adjuntará a la medición', t3X, t3Y, t3W, 6, { align: 'center', fontStyle: 'bold', fontSize: 9 });

  const docAdjText = proto.documentacion_adjunta || 'Certificado de Calibración.\nPlano o Croquis del establecimiento.';
  drawCellText(doc, docAdjText, t3X + 3, t3Y + 6.5, t3W - 6, 12, { fontSize: 8.5, valign: 'top' });

  // Firma Profesional (Alineada abajo a la derecha de la hoja 1)
  drawSignatureBlock(105, t3Y + t3H + 4, 90, 36);

  // ==========================================
  // PAGINAS 3 Y SIGUIENTES: TABLA GENERAL DE MEDICIÓN RUIDO (A4 Apaisado - RES. SRT 85/12)
  // ==========================================
  const maxRowsPerPage = 12;
  const totalPoints = puntosList.length;
  const totalTablePages = Math.max(1, Math.ceil(totalPoints / maxRowsPerPage));

  for (let pIdx = 0; pIdx < totalTablePages; pIdx++) {
    doc.addPage('a4', 'landscape');
    pageCounter++;

    drawHeader(true);
    drawProtocolTitleBar(true, { x: 15, y: 22, w: 267, h: 5.5 });

    // Encabezado Establecimiento
    const eX = 15;
    const eY = 29;
    const eW = 267;

    doc.setLineWidth(0.45);
    setDrawColor(doc, COLOR_NEGRO);
    doc.rect(eX, eY, eW, 14, 'S');
    doc.setLineWidth(0.25);

    // Fila 1: Razón Social (164mm) | C.U.I.T. (103mm)
    doc.rect(eX, eY, 164, 7, 'S');
    drawCellText(doc, 'Razón social:', eX, eY, 22, 7, { fontStyle: 'bold', fontSize: 8 });
    drawCellText(doc, razonSocial, eX + 22, eY, 142, 7, { fontSize: 8 });

    doc.rect(eX + 164, eY, 103, 7, 'S');
    drawCellText(doc, 'C.U.I.T.:', eX + 164, eY, 18, 7, { fontStyle: 'bold', fontSize: 8 });
    drawCellText(doc, cuit, eX + 182, eY, 85, 7, { fontSize: 8 });

    // Fila 2: Dirección (135mm) | Localidad (55mm) | C.P. (25mm) | Provincia (52mm)
    doc.rect(eX, eY + 7, 135, 7, 'S');
    drawCellText(doc, 'Dirección:', eX, eY + 7, 18, 7, { fontStyle: 'bold', fontSize: 8 });
    drawCellText(doc, direccion, eX + 18, eY + 7, 117, 7, { fontSize: 8 });

    doc.rect(eX + 135, eY + 7, 55, 7, 'S');
    drawCellText(doc, 'Localidad:', eX + 135, eY + 7, 18, 7, { fontStyle: 'bold', fontSize: 8 });
    drawCellText(doc, localidad, eX + 153, eY + 7, 37, 7, { fontSize: 8 });

    doc.rect(eX + 190, eY + 7, 25, 7, 'S');
    drawCellText(doc, 'C.P.:', eX + 190, eY + 7, 10, 7, { fontStyle: 'bold', fontSize: 8 });
    drawCellText(doc, cp, eX + 200, eY + 7, 15, 7, { fontSize: 8 });

    doc.rect(eX + 215, eY + 7, 52, 7, 'S');
    drawCellText(doc, 'Provincia:', eX + 215, eY + 7, 18, 7, { fontStyle: 'bold', fontSize: 8 });
    drawCellText(doc, provincia, eX + 233, eY + 7, 34, 7, { fontSize: 8 });

    // Tabla 4: Puntos de Muestreo de Ruido (Encabezados estándar)
    const colY = eY + 17;
    const colH = 20;

    const drawHeaderBox = (x, y, w, h, text, opts = {}) => {
      setFillColor(doc, COLOR_SLATE_200);
      doc.rect(x, y, w, h, 'FD');
      drawCellText(doc, text, x, y, w, h, {
        align: 'center',
        fontStyle: 'bold',
        fontSize: 6,
        color: COLOR_NEGRO,
        ...opts
      });
    };

    let xPos = 15;
    
    // Col 1: Punto de medición (16mm)
    drawHeaderBox(xPos, colY, 16, colH, 'Punto de medición', { fontSize: 6.5, maxLines: 3 });
    xPos += 16;

    // Col 2: Sector (36mm)
    drawHeaderBox(xPos, colY, 36, colH, 'Sector', { fontSize: 7, maxLines: 2 });
    xPos += 36;

    // Col 3: Puesto (38mm)
    drawHeaderBox(xPos, colY, 38, colH, 'Puesto / Puesto tipo / Puesto móvil', { fontSize: 6.5, maxLines: 3 });
    xPos += 38;

    // Col 4: Tiempo exposición (22mm)
    drawHeaderBox(xPos, colY, 22, colH, 'Tiempo de exposición (Te en hs o min)', { fontSize: 6, maxLines: 5 });
    xPos += 22;

    // Col 5: Tiempo integración (22mm)
    drawHeaderBox(xPos, colY, 22, colH, 'Tiempo de integración (tiempo de medición)', { fontSize: 6, maxLines: 5 });
    xPos += 22;

    // Col 6: Características del ruido (34mm)
    drawHeaderBox(xPos, colY, 34, colH, 'Características generales del ruido a medir (continuo / intermitente / de impulso o de impacto)', { fontSize: 6, maxLines: 5 });
    xPos += 34;

    // Col 7: RUIDO DE IMPULSO O DE IMPACTO (25mm)
    drawHeaderBox(xPos, colY, 25, 7, 'RUIDO DE IMPULSO O DE IMPACTO', { fontSize: 5.5, maxLines: 2 });
    drawHeaderBox(xPos, colY + 7, 25, 13, 'Nivel pico de presión acústica ponderado C (LC pico, en dBC)', { fontSize: 5.5, maxLines: 5 });
    xPos += 25;

    // Col 8: SONIDO CONTINUO o INTERMITENTE (54mm)
    drawHeaderBox(xPos, colY, 54, 7, 'SONIDO CONTINUO o INTERMITENTE', { fontSize: 6.5 });
    drawHeaderBox(xPos, colY + 7, 19, 13, 'Nivel de presión acústica integrado (LAeq,Te en dBA)', { fontSize: 5.5, maxLines: 5 });
    drawHeaderBox(xPos + 19, colY + 7, 18, 13, 'Resultado de la suma de las fracciones', { fontSize: 5.5, maxLines: 5 });
    drawHeaderBox(xPos + 37, colY + 7, 17, 13, 'Dosis (en porcentaje %)', { fontSize: 5.5, maxLines: 4 });
    xPos += 54;

    // Col 9: Cumple (20mm)
    drawHeaderBox(xPos, colY, 20, colH, 'Cumple con los valores de exposición diaria permitidos? (SI / NO)', { fontSize: 5.5, maxLines: 6 });

    // Data Rows (12 filas por página)
    const rowStartY = colY + colH;
    const rowH = 5.8;

    const startSlice = pIdx * maxRowsPerPage;
    const endSlice = startSlice + maxRowsPerPage;
    const pagePuntos = puntosList.slice(startSlice, endSlice);

    const tableColsDef = [
      { w: 16, key: 'punto' },
      { w: 36, key: 'sector' },
      { w: 38, key: 'puesto' },
      { w: 22, key: 'tiempo_exp' },
      { w: 22, key: 'tiempo_integ' },
      { w: 34, key: 'caracteristica' },
      { w: 25, key: 'lc_pico' },
      { w: 19, key: 'laeq_te' },
      { w: 18, key: 'suma_fracciones' },
      { w: 17, key: 'dosis' },
      { w: 20, key: 'cumple' }
    ];

    for (let r = 0; r < maxRowsPerPage; r++) {
      const rowY = rowStartY + (r * rowH);
      const pt = pagePuntos[r];
      let currXPos = 15;

      if (!pt) {
        tableColsDef.forEach(c => {
          setFillColor(doc, COLOR_SLATE_50);
          doc.rect(currXPos, rowY, c.w, rowH, 'FD');
          drawCellText(doc, '-', currXPos, rowY, c.w, rowH, { align: 'center', fontSize: 7, color: COLOR_SLATE_500 });
          currXPos += c.w;
        });
      } else {
        const cal = getPuntoCalculos(pt);
        const isImpulso = pt.caracteristicas_ruido === 'impulso_impacto';
        const tipoContinuo = pt.tipo_carga_continuo || 'laeq';

        const rowData = {
          punto: String(pt.punto_muestreo),
          sector: pt.sector_text || pt.sector || '-',
          puesto: pt.puesto_text || pt.puesto || '-',
          tiempo_exp: pt.tiempo_exposicion_hs ? `${pt.tiempo_exposicion_hs} hs` : '8 hs',
          tiempo_integ: pt.tiempo_integracion || '15 min',
          caracteristica: isImpulso ? 'Impulso / Impacto' : 'Continuo / Intermitente',
          lc_pico: isImpulso ? (pt.nivel_pico_lc_pico_dbc ? `${pt.nivel_pico_lc_pico_dbc} dBC` : '—') : '—',
          laeq_te: (!isImpulso && tipoContinuo === 'laeq' && pt.nivel_laeq_te_dba) ? `${pt.nivel_laeq_te_dba} dBA` : '—',
          suma_fracciones: (!isImpulso && tipoContinuo === 'suma_fracciones' && pt.resultado_suma_fracciones) ? String(pt.resultado_suma_fracciones) : '—',
          dosis: (!isImpulso && tipoContinuo === 'dosis' && pt.dosis_porcentaje) ? `${pt.dosis_porcentaje}%` : '—',
          cumple: cal.resultado_punto === 'Cumple' ? 'SI' : (cal.resultado_punto === 'No cumple' ? 'NO' : '—')
        };

        tableColsDef.forEach(c => {
          doc.rect(currXPos, rowY, c.w, rowH, 'S');
          const val = rowData[c.key] || '—';
          const isFail = (c.key === 'cumple' && val === 'NO');
          const isPass = (c.key === 'cumple' && val === 'SI');

          drawCellText(doc, val, currXPos, rowY, c.w, rowH, {
            align: 'center',
            fontSize: 7,
            fontStyle: (isFail || isPass) ? 'bold' : 'normal',
            color: isFail ? COLOR_ROJO_NO_CUMPLE : (isPass ? COLOR_VERDE_CUMPLE : COLOR_NEGRO),
            maxLines: 1
          });
          currXPos += c.w;
        });
      }
    }

    // Bottom Box: Información adicional (Adosado directamente sin espacio a la última fila de la tabla)
    const infoY = rowStartY + (maxRowsPerPage * rowH);
    const infoH = 20;
    doc.setLineWidth(0.45);
    doc.rect(15, infoY, 267, infoH, 'S');
    doc.setLineWidth(0.25);

    drawCellText(doc, 'Información adicional:', 15, infoY, 267, 5, { fontStyle: 'bold', fontSize: 8, color: COLOR_NEGRO });
    const addInfoText = proto.informacion_adicional || 'Sin información adicional registrada.';
    drawCellText(doc, addInfoText, 15 + 2, infoY + 5, 267 - 4, 14, { fontSize: 8, valign: 'top', color: COLOR_NEGRO });

    // Firma Profesional (Esquina inferior derecha)
    drawSignatureBlock(185, infoY + infoH + 3, 90, 32);
  }

  // ==========================================
  // PAGINA 6: ANÁLISIS Y MEJORAS (A4 Apaisado)
  // ==========================================
  doc.addPage('a4', 'landscape');
  pageCounter++;

  drawHeader(true);
  drawProtocolTitleBar(true, { x: 18, y: 22, w: 263, h: 5.5 });

  // Encabezado Establecimiento
  const aX = 18;
  const aY = 29;
  const aW = 263;

  doc.setLineWidth(0.45);
  setDrawColor(doc, COLOR_NEGRO);
  doc.rect(aX, aY, aW, 14, 'S');
  doc.setLineWidth(0.25);

  // Fila 1: Razón Social (160mm) | C.U.I.T. (103mm)
  doc.rect(aX, aY, 160, 7, 'S');
  drawCellText(doc, 'Razón Social:', aX, aY, 22, 7, { fontStyle: 'bold', fontSize: 8 });
  drawCellText(doc, razonSocial, aX + 22, aY, 138, 7, { fontSize: 8 });

  doc.rect(aX + 160, aY, 103, 7, 'S');
  drawCellText(doc, 'C.U.I.T.:', aX + 160, aY, 18, 7, { fontStyle: 'bold', fontSize: 8 });
  drawCellText(doc, cuit, aX + 178, aY, 85, 7, { fontSize: 8 });

  // Fila 2: Dirección (135mm) | Localidad (55mm) | C.P. (25mm) | Provincia (48mm)
  doc.rect(aX, aY + 7, 135, 7, 'S');
  drawCellText(doc, 'Dirección:', aX, aY + 7, 18, 7, { fontStyle: 'bold', fontSize: 8 });
  drawCellText(doc, direccion, aX + 18, aY + 7, 117, 7, { fontSize: 8 });

  doc.rect(aX + 135, aY + 7, 55, 7, 'S');
  drawCellText(doc, 'Localidad:', aX + 135, aY + 7, 18, 7, { fontStyle: 'bold', fontSize: 8 });
  drawCellText(doc, localidad, aX + 153, aY + 7, 37, 7, { fontSize: 8 });

  doc.rect(aX + 190, aY + 7, 25, 7, 'S');
  drawCellText(doc, 'C.P.:', aX + 190, aY + 7, 10, 7, { fontStyle: 'bold', fontSize: 8 });
  drawCellText(doc, cp, aX + 200, aY + 7, 15, 7, { fontSize: 8 });

  doc.rect(aX + 215, aY + 7, 48, 7, 'S');
  drawCellText(doc, 'Provincia:', aX + 215, aY + 7, 16, 7, { fontStyle: 'bold', fontSize: 8 });
  drawCellText(doc, provincia, aX + 231, aY + 7, 32, 7, { fontSize: 8 });

  // Tabla Análisis
  const tAX = 18;
  const tAY = 45;
  const tAW = 263;
  const contentH = 75;
  const totalBoxH = 6 + 8 + contentH; // 89mm total height (49 a 138mm)

  doc.setLineWidth(0.45);
  doc.rect(tAX, tAY, tAW, totalBoxH, 'S');

  // Title Header
  setFillColor(doc, COLOR_SLATE_200);
  doc.rect(tAX, tAY, tAW, 6, 'FD');
  drawCellText(doc, 'Análisis de los Datos y Mejoras a Realizar', tAX, tAY, tAW, 6, { align: 'center', fontStyle: 'bold', fontSize: 9, color: COLOR_NEGRO });

  // 2 Columns Subheader Titles
  const colW = tAW / 2;
  setFillColor(doc, COLOR_SLATE_200);
  doc.rect(tAX, tAY + 6, colW, 8, 'FD');
  doc.rect(tAX + colW, tAY + 6, colW, 8, 'FD');

  drawCellText(doc, 'Conclusiones', tAX, tAY + 6, colW, 8, { fontStyle: 'bold', fontSize: 8.5, color: COLOR_NEGRO });
  drawCellText(doc, 'Recomendaciones para adecuar el nivel de ruido a la legislación vigente.', tAX + colW, tAY + 6, colW, 8, { fontStyle: 'bold', fontSize: 8.5, color: COLOR_NEGRO });

  doc.rect(tAX, tAY + 14, colW, contentH, 'S');
  doc.rect(tAX + colW, tAY + 14, colW, contentH, 'S');

  // Conclusiones text
  const rawConc = proto.conclusiones || "Los valores obtenidos en todos los puntos de muestreo, Cumplen con lo establecido en el ANEXO V - CAPITULO 13 (Acústica), del Decreto Nº 351/79.";
  const concText = rawConc.trim().replace(/^[•\-\*\.\s]+/, '');
  drawCellText(doc, concText, tAX, tAY + 14, colW, contentH, { fontSize: 8.5, valign: 'top', padding: 2 });

  // Recomendaciones text
  const defaultRecomStr = `Cuando los niveles de exposición al ruido superen o se encuentren próximos a los valores establecidos en el ANEXO V - CAPITULO 13 (Acústica), del Decreto Nº 351/79, se recomienda:\n\n• Implementar controles de ingeniería sobre las fuentes generadoras, mediante mantenimiento, reparación, aislamiento, encapsulamiento, instalación de barreras acústicas, silenciadores o elementos antivibratorios.\n• Evaluar la sustitución o modificación de máquinas, herramientas, equipos o procesos por alternativas de menor emisión sonora.\n• Delimitar y señalizar el sector, restringiendo el acceso al personal autorizado y estableciendo el uso obligatorio de protección auditiva cuando corresponda.\n• Proveer protectores auditivos adecuados, seleccionados según el nivel de exposición, la atenuación requerida y su compatibilidad con otros elementos de protección personal.\n• Capacitar al personal expuesto sobre los riesgos del ruido, las medidas preventivas y el uso, ajuste, conservación y reposición de los protectores auditivos.\n• Controlar los tiempos de exposición, mediante rotación de tareas, reducción de permanencia o reorganización de las actividades, cuando las medidas técnicas no resulten suficientes.`;

  const recomText = proto.recomendaciones || defaultRecomStr;
  drawCellText(doc, recomText, tAX + colW, tAY + 14, colW, contentH, { fontSize: 7.5, valign: 'top', padding: 2 });

  // Firma Profesional (Ubicada debajo del cuadro de análisis alineada a la derecha)
  drawSignatureBlock(185, tAY + totalBoxH + 5, 95, 38);

  // ==========================================
  // PLANOS Y CROQUIS DEL ESTABLECIMIENTO (Tantas páginas como planos adjuntos cargados)
  // ==========================================
  const planoAdjuntos = (adjuntosList || []).filter(adj => 
    adj.tipo === 'Evidencia Fotográfica Plano' ||
    adj.tipo === 'Foto Plano' ||
    adj.tipo === 'Plano' ||
    adj.tipo === 'Croquis' ||
    (adj.tipo !== 'Certificado de Calibración' && adj.tipo !== 'Certificado' && adj.tipo !== 'Certificado de Calibración del Instrumental')
  );

  for (let cIdx = 0; cIdx < planoAdjuntos.length; cIdx++) {
    const rawAdj = planoAdjuntos[cIdx];

    doc.addPage('a4', 'landscape');
    pageCounter++;

    drawHeader(true);
    drawProtocolTitleBar(true, { x: 15, y: 22, w: 267, h: 5.5 });

    const kX = 15;
    const kY = 29;
    const kW = 267;

    doc.setLineWidth(0.45);
    setDrawColor(doc, COLOR_NEGRO);
    doc.rect(kX, kY, kW, 6, 'S');
    setFillColor(doc, COLOR_BLANCO);
    doc.rect(kX, kY, kW, 6, 'FD');
    
    const planoTitle = 'Puntos de muestreo';
    drawCellText(doc, planoTitle, kX, kY, kW, 6, { fontStyle: 'bold', fontSize: 9, align: 'center', color: COLOR_NEGRO });

    const mY = 37;
    const mH = 150;
    doc.rect(kX, mY, kW, mH, 'S');

    let finalBase64 = '';
    if (rawAdj) {
      try {
        const rawBase64 = await getAdjuntoBase64(rawAdj);
        if (rawBase64) {
          const resized = await resizeImageForPdf(rawBase64, 1200, 1200);
          finalBase64 = resized || rawBase64;
        }
      } catch (err) {
        console.error('Error al procesar base64 de croquis:', err);
      }
    }

    if (finalBase64 && finalBase64.startsWith('data:image/')) {
      try {
        const dims = await getImgDimensions(finalBase64);
        const maxW = kW - 10;
        const maxH = mH - 8;
        const ratio = (dims.width && dims.height) ? (dims.width / dims.height) : 1.5;

        let renderW = maxW;
        let renderH = maxW / ratio;
        if (renderH > maxH) {
          renderH = maxH;
          renderW = maxH * ratio;
        }

        const imgX = kX + (kW - renderW) / 2;
        const imgY = mY + 4 + (maxH - renderH) / 2;

        doc.addImage(finalBase64, 'PNG', imgX, imgY, renderW, renderH, undefined, 'FAST');
      } catch (err) {
        console.error('Error al insertar imagen de croquis en PDF:', err);
        setDrawColor(doc, COLOR_SLATE_300);
        doc.setLineWidth(0.3);
        doc.rect(kX + 10, mY + 14, kW - 20, mH - 20, 'S');
        drawCellText(doc, `[ PLANO O CROQUIS DEL ESTABLECIMIENTO ]`, kX + 10, mY + 14, kW - 20, mH - 20, { align: 'center', fontStyle: 'bold', fontSize: 11, color: COLOR_SLATE_500 });
      }
    } else {
      setDrawColor(doc, COLOR_SLATE_300);
      doc.setLineWidth(0.3);
      doc.rect(kX + 10, mY + 14, kW - 20, mH - 20, 'S');
      drawCellText(doc, `[ PLANO O CROQUIS DEL ESTABLECIMIENTO ]`, kX + 10, mY + 14, kW - 20, mH - 20, { align: 'center', fontStyle: 'bold', fontSize: 11, color: COLOR_SLATE_500 });
    }
  }

  // ==========================================
  // PAGINAS FINALES: ANEXO CERTIFICADO DE CALIBRACIÓN
  // ==========================================
  const certAdjunto = (adjuntosList || []).filter(adj => 
    adj.tipo === 'Certificado de Calibración' || adj.tipo === 'Certificado' || adj.tipo === 'Certificado de Calibración del Instrumental'
  )[0];

  let certPdfArrayBuffer = null;

  if (certAdjunto) {
    try {
      const path = certAdjunto.storage_path || certAdjunto.original_path || certAdjunto.public_url || certAdjunto.url || certAdjunto.archivo_url;
      const fileName = certAdjunto.nombre_archivo || certAdjunto.name || '';
      const isPdfFile = fileName.toLowerCase().endsWith('.pdf') || (path && path.toLowerCase().endsWith('.pdf')) || (certAdjunto.preview && certAdjunto.preview.startsWith('data:application/pdf'));

      if (isPdfFile) {
        if (certAdjunto.preview && certAdjunto.preview.startsWith('data:application/pdf')) {
          const res = await fetch(certAdjunto.preview);
          certPdfArrayBuffer = await res.arrayBuffer();
        } else if (path) {
          if (!path.startsWith('http') && !path.startsWith('data:')) {
            const { data: blob } = await supabase.storage.from('protocolos-ruido').download(path);
            if (blob) {
              certPdfArrayBuffer = await blob.arrayBuffer();
            }
          } else {
            const res = await fetch(path);
            if (res.ok) {
              const blob = await res.blob();
              certPdfArrayBuffer = await blob.arrayBuffer();
            }
          }
        }
      } else {
        const certBase64 = await getAdjuntoBase64(certAdjunto);
        if (certBase64 && certBase64.startsWith('data:image/')) {
          doc.addPage('a4', 'portrait');
          pageCounter++;

          drawHeader(false);
          drawProtocolTitleBar(false, { x: 15, y: 22, w: 180, h: 5.5 });

          const cX = 15;
          const cY = 29;
          const cW = 180;
          const cH = 238;

          doc.setLineWidth(0.45);
          setDrawColor(doc, COLOR_NEGRO);
          doc.rect(cX, cY, cW, 6, 'S');
          drawCellText(doc, 'ANEXO: CERTIFICADO DE CALIBRACIÓN DEL INSTRUMENTAL', cX, cY, cW, 6, { fontStyle: 'bold', fontSize: 9, align: 'center' });

          const imgY = 37;
          const imgH = 228;
          doc.rect(cX, imgY, cW, imgH, 'S');

          const dims = await getImgDimensions(certBase64);
          const maxW = cW - 10;
          const maxH = imgH - 10;
          const ratio = (dims.width && dims.height) ? (dims.width / dims.height) : 0.75;

          let renderW = maxW;
          let renderH = maxW / ratio;
          if (renderH > maxH) {
            renderH = maxH;
            renderW = maxH * ratio;
          }

          const imgX = cX + (cW - renderW) / 2;
          const posX = imgY + (imgH - renderH) / 2;

          doc.addImage(certBase64, 'PNG', imgX, posX, renderW, renderH, undefined, 'FAST');
        }
      }
    } catch (e) {
      console.error('Error procesando certificado de calibración en PDF:', e);
    }
  }

  // Draw headers and footers across all pages with total page count
  const totalPagesCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPagesCount; i++) {
    doc.setPage(i);
    if (i > 1) {
      const pageInfo = doc.internal.pageSize;
      const isLand = pageInfo.width > pageInfo.height;
      drawFooter(isLand, i, totalPagesCount);
    }
  }

  // If a PDF certificate document was uploaded, merge pages using pdf-lib
  if (certPdfArrayBuffer) {
    try {
      const mainPdfBytes = doc.output('arraybuffer');
      const finalPdfDoc = await PDFDocument.load(mainPdfBytes);
      const certDoc = await PDFDocument.load(certPdfArrayBuffer);
      const certPages = await finalPdfDoc.copyPages(certDoc, certDoc.getPageIndices());
      certPages.forEach(p => finalPdfDoc.addPage(p));

      // Preserve / Inject OpenAction Print catalog entry so browser auto-opens print dialog
      const catalog = finalPdfDoc.catalog;
      const openAction = finalPdfDoc.context.obj({
        S: PDFName.of('Named'),
        N: PDFName.of('Print'),
      });
      catalog.set(PDFName.of('OpenAction'), openAction);

      const mergedPdfBytes = await finalPdfDoc.save();
      const mergedBlob = new Blob([mergedPdfBytes], { type: 'application/pdf' });

      // Override doc output & save methods to return merged PDF
      const origOutput = doc.output.bind(doc);
      doc.output = (type, ...args) => {
        if (type === 'blob') return mergedBlob;
        if (type === 'arraybuffer') return mergedPdfBytes.buffer;
        if (type === 'bloburl' || type === 'bloburi') return URL.createObjectURL(mergedBlob);
        if (type === 'datauristring' || type === 'dataurlstring') {
          return 'data:application/pdf;base64,' + Buffer.from(mergedPdfBytes).toString('base64');
        }
        return origOutput(type, ...args);
      };

      doc.save = (filename) => {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(mergedBlob);
        link.download = filename || 'Protocolo_Ruido.pdf';
        link.click();
      };
    } catch (mergeErr) {
      console.error('Error al fusionar certificado PDF con pdf-lib:', mergeErr);
    }
  }

  return doc;
};
