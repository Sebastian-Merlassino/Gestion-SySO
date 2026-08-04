import { PDFDocument, PDFName } from 'pdf-lib';
import { formatDate } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
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
        .from('protocolos-ergonomia')
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
        .from('protocolos-ergonomia')
        .createSignedUrl(path, 3600);
      if (sData?.signedUrl) targetUrl = sData.signedUrl;
    } catch (e) {
      const { data: pData } = supabase.storage
        .from('protocolos-ergonomia')
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

export const generateErgonomyProtocolPdf = async (
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

  // Download Header Logo (Tenant, User Profile Admin or Default)
  let logoBase64 = '';
  try {
    const logoUrl = tenant?.logo_1_url || userProfile?.logo_1_url || userProfile?.logo_url;
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

  // Helper to download signature base64 if present (regenerate signed URL if expired)
  const resolveSignatureImage = async (signatureField) => {
    if (!signatureField) return '';
    try {
      let sigUrl = signatureField;
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

      let base64 = await getBase64ImageFromUrl(sigUrl);
      if (base64) {
        base64 = await resizeImageForPdf(base64, 450, 450);
      }
      return base64;
    } catch (e) {
      console.error('Error fetching signature:', e);
      return '';
    }
  };

  const signatureBase64 = await resolveSignatureImage(proto.firma_profesional);
  const firmaEmpleadorBase64 = await resolveSignatureImage(proto.firma_empleador);
  const firmaMedicinaBase64 = await resolveSignatureImage(proto.firma_medicina);
  let signatureDims = { width: 150, height: 60 };
  if (signatureBase64) {
    try {
      signatureDims = await getImgDimensions(signatureBase64);
    } catch (e) {
      console.error('Error getting signature dimensions:', e);
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
  const drawSignatureBlock = (x, y, w, h, signatureImg, name, credential, label) => {
    const imgMaxW = w;
    const imgMaxH = Math.max(28, h - 8);

    // 1. Signature image
    if (signatureImg) {
      try {
        const ratio = 2.5; // default ratio
        let renderW = imgMaxW;
        let renderH = imgMaxW / ratio;
        if (renderH > imgMaxH) {
          renderH = imgMaxH;
          renderW = imgMaxH * ratio;
        }

        const renderX = x + (w - renderW) / 2;
        const lineY = y + 24;
        const renderY = lineY - (renderH * 0.72);

        doc.addImage(signatureImg, 'PNG', renderX, renderY, renderW, renderH, undefined, 'FAST');
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
    doc.text(label, x + (w / 2), lineY + 3.5, { align: 'center' });

    // 4. Nombre y Aclaración
    let currentTextY = lineY + 7.5;
    if (name) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      setTextColor(doc, COLOR_SLATE_900);
      doc.text(name, x + (w / 2), currentTextY, { align: 'center' });
      currentTextY += 3.8;
    }

    // 5. Credential (matricula)
    if (credential) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      setTextColor(doc, COLOR_SLATE_600);
      doc.text(credential, x + (w / 2), currentTextY, { align: 'center' });
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
  const ciiu = proto.ciiu_text || (emp?.actividades_ciiu || []).join(', ') || '—';
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
  const titleLines = doc.splitTextToSize('Protocolo para la Medición del nivel de Ergonomía en el Ambiente Laboral', 145);
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
  const t1H = 42;

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

  // Row: CP, CUIT y CIIU
  doc.rect(t1X, rY, 30, 6, 'S');
  doc.rect(t1X + 30, rY, 75, 6, 'S');
  doc.rect(t1X + 105, rY, 75, 6, 'S');
  drawCellText(doc, 'C.P.:', t1X, rY, 12, 6, { fontStyle: 'bold', fontSize: 8.5 });
  drawCellText(doc, cp, t1X + 12, rY, 18, 6, { fontSize: 8.5 });
  drawCellText(doc, 'C.U.I.T.:', t1X + 30, rY, 18, 6, { fontStyle: 'bold', fontSize: 8.5 });
  drawCellText(doc, cuit, t1X + 48, rY, 57, 6, { fontSize: 8.5 });
  drawCellText(doc, 'CIIU:', t1X + 105, rY, 12, 6, { fontStyle: 'bold', fontSize: 8.5 });
  drawCellText(doc, ciiu, t1X + 117, rY, 63, 6, { fontSize: 8.5 });
  rY += 6;

  // Row: Fecha de la Evaluación
  doc.rect(t1X, rY, t1W, 6, 'S');
  drawCellText(doc, 'Fecha de la Evaluación:', t1X, rY, 40, 6, { fontStyle: 'bold', fontSize: 8.5 });
  drawCellText(doc, fechaMedicion, t1X + 40, rY, 140, 6, { fontSize: 8.5 });

  // Firma Profesional (Alineada abajo a la derecha, debajo de la Tabla 1)
  drawSignatureBlock(105, t1Y + t1H + 6, 90, 36, signatureBase64, profNombre, profMatricula, 'Firma, Aclaración y Registro del Profesional Interviniente');

  // ==========================================
  // PAGINAS 3 Y SIGUIENTES: TABLA GENERAL DE MEDICIÓN RUIDO (A4 Apaisado - RES. SRT 85/12)
  // ==========================================
  // ==========================================
  // PAGINAS 3 Y SIGUIENTES: PLANILLA 1 (ANEXO I) POR PUESTO DE TRABAJO (A4 Apaisado - RES. SRT 886/15)
  // ==========================================
  puntosList.forEach((pt, ptIdx) => {
    doc.addPage('a4', 'landscape');
    pageCounter++;

    drawHeader(true);
    drawProtocolTitleBar(true, { x: 15, y: 22, w: 267, h: 5.5 });

    // 1. Datos Generales del Puesto de Trabajo
    const dX = 15;
    const dY = 29;
    const dW = 267;

    doc.setLineWidth(0.45);
    setDrawColor(doc, COLOR_NEGRO);
    // Draw outer box for puesto info
    doc.rect(dX, dY, dW, 25, 'S');
    doc.setLineWidth(0.25);

    // Fila 1: Área/Sector (100mm) | Puesto (100mm) | Número de trabajadores (67mm)
    doc.rect(dX, dY, 100, 6, 'S');
    drawCellText(doc, 'Área y sector de estudio:', dX, dY, 40, 6, { fontStyle: 'bold', fontSize: 7.5 });
    drawCellText(doc, pt.sector_text || pt.sector || '-', dX + 40, dY, 60, 6, { fontSize: 7.5 });

    doc.rect(dX + 100, dY, 100, 6, 'S');
    drawCellText(doc, 'Puesto / Sección:', dX + 100, dY, 35, 6, { fontStyle: 'bold', fontSize: 7.5 });
    drawCellText(doc, pt.puesto_text || pt.puesto || '-', dX + 135, dY, 65, 6, { fontSize: 7.5 });

    doc.rect(dX + 200, dY, 67, 6, 'S');
    drawCellText(doc, 'Trabajadores en puesto:', dX + 200, dY, 38, 6, { fontStyle: 'bold', fontSize: 7.5 });
    drawCellText(doc, String(pt.cantidad_expuestos || 1), dX + 238, dY, 29, 6, { fontSize: 7.5 });

    // Fila 2: Procedimiento (60mm) | Capacitación (60mm) | Manifestación (60mm) | Ubicación (67mm)
    doc.rect(dX, dY + 6, 60, 6, 'S');
    drawCellText(doc, 'Procedimiento escrito:', dX, dY + 6, 35, 6, { fontStyle: 'bold', fontSize: 7.5 });
    drawCellText(doc, (pt.procedimiento_escrito || 'no').toUpperCase(), dX + 35, dY + 6, 25, 6, { fontSize: 7.5 });

    doc.rect(dX + 60, dY + 6, 60, 6, 'S');
    drawCellText(doc, 'Capacitación:', dX + 60, dY + 6, 25, 6, { fontStyle: 'bold', fontSize: 7.5 });
    drawCellText(doc, (pt.capacitacion || 'no').toUpperCase(), dX + 85, dY + 6, 35, 6, { fontSize: 7.5 });

    doc.rect(dX + 120, dY + 6, 60, 6, 'S');
    drawCellText(doc, 'Manifestación Temprana:', dX + 120, dY + 6, 38, 6, { fontStyle: 'bold', fontSize: 7.5 });
    drawCellText(doc, (pt.manifestacion_temprana || 'no').toUpperCase(), dX + 158, dY + 6, 22, 6, { fontSize: 7.5 });

    doc.rect(dX + 180, dY + 6, 87, 6, 'S');
    drawCellText(doc, 'Ubicación síntoma:', dX + 180, dY + 6, 30, 6, { fontStyle: 'bold', fontSize: 7.5 });
    drawCellText(doc, pt.ubicacion_sintoma || '-', dX + 210, dY + 6, 57, 6, { fontSize: 7.5 });

    // Fila 3: Nombre del trabajador/es (267mm)
    doc.rect(dX, dY + 12, 267, 13, 'S');
    drawCellText(doc, 'Nombre del trabajador/es:', dX, dY + 12, 267, 4, { fontStyle: 'bold', fontSize: 7.5 });
    drawCellText(doc, pt.nombres_trabajadores || '-', dX + 2, dY + 16, 263, 8, { fontSize: 7.5, valign: 'top' });

    // 2. Tabla Matricial Planilla 1
    const colY = dY + 28;
    const colH = 15;

    const drawHeaderBox = (x, y, w, h, text, opts = {}) => {
      setFillColor(doc, COLOR_SLATE_200);
      doc.rect(x, y, w, h, 'FD');
      drawCellText(doc, text, x, y, w, h, {
        align: 'center',
        fontStyle: 'bold',
        fontSize: 6.5,
        color: COLOR_NEGRO,
        ...opts
      });
    };

    const tblX = 16;
    
    // Tareas del puesto de trabajo
    const tList = pt.tareas || [];
    const t1 = tList[0] || { nombre: 'Tarea 1' };
    const t2 = tList[1] || { nombre: 'Tarea 2' };
    const t3 = tList[2] || { nombre: 'Tarea 3' };

    // Draw main headers
    // Col 1: Factor (90mm)
    drawHeaderBox(tblX, colY, 90, colH, 'Factor de riesgo de la jornada habitual de trabajo', { fontSize: 7.5, maxLines: 2 });
    
    // Col 2: Tareas Habituales (75mm total: 25mm each)
    drawHeaderBox(tblX + 90, colY, 75, 6, 'Tareas habituales del Puesto de Trabajo', { fontSize: 7 });
    drawHeaderBox(tblX + 90, colY + 6, 25, 9, `Tarea 1:\n${t1.nombre || '-'}`, { fontSize: 5.5, maxLines: 2 });
    drawHeaderBox(tblX + 115, colY + 6, 25, 9, `Tarea 2:\n${t2.nombre || '-'}`, { fontSize: 5.5, maxLines: 2 });
    drawHeaderBox(tblX + 140, colY + 6, 25, 9, `Tarea 3:\n${t3.nombre || '-'}`, { fontSize: 5.5, maxLines: 2 });

    // Col 3: Tiempo total (40mm)
    drawHeaderBox(tblX + 165, colY, 40, colH, 'Tiempo Total de exposición al\nfactor de riesgo', { fontSize: 7, maxLines: 2 });

    // Col 4: Nivel de riesgo (60mm total: 20mm each)
    drawHeaderBox(tblX + 205, colY, 60, 6, 'Nivel de riesgo', { fontSize: 7 });
    drawHeaderBox(tblX + 205, colY + 6, 20, 9, 'Tarea 1', { fontSize: 6.5 });
    drawHeaderBox(tblX + 225, colY + 6, 20, 9, 'Tarea 2', { fontSize: 6.5 });
    drawHeaderBox(tblX + 245, colY + 6, 20, 9, 'Tarea 3', { fontSize: 6.5 });

    // Rows def
    const rowStartY = colY + colH;
    const rowH = 6.2;
    
    const factorsDef = [
      { key: 'levantamiento', label: 'A. Levantamiento y descenso' },
      { key: 'empuje_arrastre', label: 'B. Empuje / Arrastre' },
      { key: 'transporte', label: 'C. Transporte' },
      { key: 'bipedestacion', label: 'D. Bipedestación' },
      { key: 'mov_repetitivos', label: 'E. Movimientos Repetitivos de MMSS' },
      { key: 'posturas_forzadas', label: 'F. Posturas Forzadas' },
      { key: 'vibraciones_mano_brazo', label: 'G. Vibraciones Mano - Brazo (5 a 1500 Hz)' },
      { key: 'vibraciones_cuerpo_entero', label: 'G2. Vibraciones Cuerpo Entero (1 a 80 Hz)' },
      { key: 'confort_termico', label: 'H. Confort Térmico' },
      { key: 'estres_contacto', label: 'I. Estrés de Contacto' }
    ];

    factorsDef.forEach((f, rIdx) => {
      const rowY = rowStartY + (rIdx * rowH);

      // Col 1: Factor label
      doc.rect(tblX, rowY, 90, rowH, 'S');
      drawCellText(doc, f.label, tblX + 2, rowY, 88, rowH, { align: 'left', fontSize: 7.5 });

      // Col 2: Presence check (X or -)
      const hasT1 = tList[0] && tList[0][`f_${f.key}_identificado`] === 'si';
      const hasT2 = tList[1] && tList[1][`f_${f.key}_identificado`] === 'si';
      const hasT3 = tList[2] && tList[2][`f_${f.key}_identificado`] === 'si';

      doc.rect(tblX + 90, rowY, 25, rowH, 'S');
      drawCellText(doc, tList[0] ? (hasT1 ? 'X' : '-') : '', tblX + 90, rowY, 25, rowH, { align: 'center', fontSize: 8 });

      doc.rect(tblX + 115, rowY, 25, rowH, 'S');
      drawCellText(doc, tList[1] ? (hasT2 ? 'X' : '-') : '', tblX + 115, rowY, 25, rowH, { align: 'center', fontSize: 8 });

      doc.rect(tblX + 140, rowY, 25, rowH, 'S');
      drawCellText(doc, tList[2] ? (hasT3 ? 'X' : '-') : '', tblX + 140, rowY, 25, rowH, { align: 'center', fontSize: 8 });

      // Col 3: Exposure time
      const timesList = tList.map((t, idx) => {
        const tVal = t[`f_${f.key}_tiempo`]?.trim();
        return tVal ? `T${idx+1}: ${tVal}` : '';
      }).filter(Boolean);
      const expTime = timesList.join(', ') || '-';
      doc.rect(tblX + 165, rowY, 40, rowH, 'S');
      drawCellText(doc, expTime, tblX + 165, rowY, 40, rowH, { align: 'center', fontSize: 6.5, maxLines: 2 });

      // Col 4: Risk levels (1, 2, 3 or -)
      const rskT1 = tList[0] && hasT1 ? (tList[0][`f_${f.key}_riesgo`] || '-') : '-';
      const rskT2 = tList[1] && hasT2 ? (tList[1][`f_${f.key}_riesgo`] || '-') : '-';
      const rskT3 = tList[2] && hasT3 ? (tList[2][`f_${f.key}_riesgo`] || '-') : '-';

      doc.rect(tblX + 205, rowY, 20, rowH, 'S');
      drawCellText(doc, tList[0] ? String(rskT1) : '', tblX + 205, rowY, 20, rowH, { align: 'center', fontSize: 8 });

      doc.rect(tblX + 225, rowY, 20, rowH, 'S');
      drawCellText(doc, tList[1] ? String(rskT2) : '', tblX + 225, rowY, 20, rowH, { align: 'center', fontSize: 8 });

      doc.rect(tblX + 245, rowY, 20, rowH, 'S');
      drawCellText(doc, tList[2] ? String(rskT3) : '', tblX + 245, rowY, 20, rowH, { align: 'center', fontSize: 8 });
    });

    // 3. Resultado del Puesto, Nivel de Riesgo y Observaciones
    const resY = rowStartY + (factorsDef.length * rowH) + 4;
    const resH = 20;

    doc.setLineWidth(0.45);
    doc.rect(15, resY, 267, resH, 'S');
    doc.setLineWidth(0.25);

    // Col 1: Riesgo Global & Verificación (100mm)
    doc.rect(15, resY, 100, 10, 'S');
    drawCellText(doc, 'Nivel de Riesgo Global:', 15, resY, 40, 10, { fontStyle: 'bold', fontSize: 7.5 });
    drawCellText(doc, `Nivel ${pt.nivel_de_riesgo === 'Bajo' ? '1' : (pt.nivel_de_riesgo === 'Medio' ? '2' : '3')} - ${pt.nivel_de_riesgo || 'Bajo'}`, 55, resY, 60, 10, { fontSize: 7.5 });

    doc.rect(15, resY + 10, 100, 10, 'S');
    drawCellText(doc, 'Resultado de Cumplimiento:', 15, resY + 10, 40, 10, { fontStyle: 'bold', fontSize: 7.5 });
    const isPass = pt.resultado_punto === 'Cumple';
    const isFail = pt.resultado_punto === 'No cumple';
    drawCellText(doc, (pt.resultado_punto || 'Cumple').toUpperCase(), 55, resY + 10, 60, 10, {
      fontStyle: 'bold',
      fontSize: 7.5,
      color: isFail ? COLOR_ROJO_NO_CUMPLE : (isPass ? COLOR_VERDE_CUMPLE : COLOR_NEGRO)
    });

    // Col 2: Observaciones (167mm)
    doc.rect(115, resY, 167, 20, 'S');
    drawCellText(doc, 'Observaciones / Medidas correctivas propuestas:', 115, resY, 167, 5, { fontStyle: 'bold', fontSize: 7.5 });
    drawCellText(doc, pt.observaciones_punto || 'Sin observaciones.', 117, resY + 5, 163, 14, { fontSize: 7.5, valign: 'top' });

    // Firma Profesional (Esquina inferior derecha de cada hoja de puesto)
    drawSignatureBlock(185, resY + resH + 3, 90, 22, signatureBase64, profNombre, profMatricula, 'Firma, Aclaración y Registro del Profesional Interviniente');

    // Check if we need to print a Planilla 2 page for this puesto
    const presentFactors = [];
    tList.forEach((t, tIdx) => {
      factorsDef.forEach(f => {
        if (t[`f_${f.key}_identificado`] === 'si') {
          presentFactors.push({
            factorKey: f.key,
            factorLabel: f.label,
            taskName: t.nombre || `Tarea habitual ${tIdx + 1}`,
            taskIdx: tIdx + 1,
            respuestas: t[`f_${f.key}_respuestas`] || {},
            riesgo: t[`f_${f.key}_riesgo`] || '1'
          });
        }
      });
    });

    if (presentFactors.length > 0) {
      doc.addPage('a4', 'landscape');
      pageCounter++;
      drawHeader(true);
      drawProtocolTitleBar(true, { x: 15, y: 22, w: 267, h: 5.5 });

      // Title
      setFillColor(doc, '#468DFF');
      doc.rect(15, 29, 267, 7, 'F');
      drawCellText(doc, `PUESTO: ${(pt.puesto_text || pt.puesto || '-').toUpperCase()} — EVALUACIÓN INICIAL DE FACTORES DE RIESGO (PLANILLA 2)`, 15, 29, 267, 7, {
        align: 'center',
        fontStyle: 'bold',
        fontSize: 8.5,
        color: '#FFFFFF'
      });

      const CUESTIONARIOS_PLANILLA2_LOCAL = {
        levantamiento: {
          isTwoStep: true,
          paso1: [
            { id: 'p1_1', text: 'Levantar y/o bajar manualmente cargas de peso superior a 2 kg. y hasta 25 kg.' },
            { id: 'p1_2', text: 'Realizar diariamente y en forma cíclica operaciones de levantamiento / descenso con una frecuencia > 1 por hora o < 360 (si se realiza en forma esporádica consignar NO)' },
            { id: 'p1_3', text: 'Levantar y/o bajar manualmente cargas de peso superior a 25 kg.' }
          ],
          paso2: [
            { id: 'p2_1', text: 'El trabajador levanta, sostiene y deposita la carga sobrepasando con sus manos 30 cm sobre la altura del hombro' },
            { id: 'p2_2', text: 'El trabajador levanta, sostiene y deposita la carga sobrepasando con sus manos una distancia horizontal mayor a 80 cm desde el punto medio entre los tobillos' },
            { id: 'p2_3', text: 'Entre la toma y el deposito de la carga, el trabajador gira o inclina la cintura mas de 30° a uno u otro (o a ambos) considerados desde el plano sagital' },
            { id: 'p2_4', text: 'Las cargas poseen formas irregulares, son difíciles de asir, se deforman o hay movimiento en su interior' },
            { id: 'p2_5', text: 'El trabajador levanta, sostiene y deposita la carga con un solo brazo' },
            { id: 'p2_6', text: 'El trabajador presenta alguna manifestación temprana de las enfermedades mencionadas en el ART 1 de la presente Resolución' }
          ]
        },
        empuje_arrastre: {
          isTwoStep: true,
          paso1: [
            { id: 'p1_1', text: 'Se realizan diariamente tareas cíclicas con una frecuencia >1 movimientos por jornada (si son esporádicas consignar NO)' },
            { id: 'p1_2', text: 'El trabajador se desplaza empujando y/o arrastrando manualmente un objeto recorriendo una distancia mayor a 60 mts.' },
            { id: 'p1_3', text: 'En el puesto de trabajo se empujan o arrastran cíclicamente objetos (bolsones, cajas, muebles, maquinas etc.) cuyo esfuerzo medido con dinamómetro superior a 34 kgf' }
          ],
          paso2: [
            { id: 'p2_1', text: 'Para empujar el objeto rodante se requiere un esfuerzo inicial medido con dinamómetro > 12 kgf para hombres o 10 kgf para mujeres' },
            { id: 'p2_2', text: 'Para arrastrar el objeto rodante se requiere un esfuerzo inicial medido con dinamómetro > 10 kgf para hombres o mujeres' },
            { id: 'p2_3', text: 'El objeto rodante es empujado y/o arrastrado con dificultad (la superficie de deslizamiento es despareja, hay rampas que subir o bajar, hay roturas u obstáculos en el recorrido, ruedas en mal estado, mal diseño del asa etc.)' },
            { id: 'p2_4', text: 'El objeto rodante no puede ser empujado y/o arrastrado con ambas manos, y en caso de que lo permita, el apoyo de las manos se encuentra a una altura incomoda (por encima del pecho o por debajo de la cintura)' },
            { id: 'p2_5', text: 'En el movimiento de empujar y/o arrastrar, el esfuerzo inicial requerido se mantiene significativamente una vez puesto en movimiento el objeto (se produce atascamiento de las ruedas, tirones o falta de deslizamiento uniforme)' },
            { id: 'p2_6', text: 'El trabajador empuja o arrastra el objeto rodante asiéndolo con una sola mano' },
            { id: 'p2_7', text: 'El trabajador presenta alguna manifestación temprana de las enfermedades mencionadas en el artículo 1 de la presente resolución' }
          ]
        },
        transporte: {
          isTwoStep: true,
          paso1: [
            { id: 'p1_1', text: 'Transporta manualmente carga superiores a 2 kg. Hasta 25 kg.' },
            { id: 'p1_2', text: 'El trabajador se desplaza sosteniendo manualmente la carga recorriendo una distancia mayor a 1 metro' },
            { id: 'p1_3', text: 'Realiza diariamente en forma cíclica (si es esporádica consignar NO)' },
            { id: 'p1_4', text: 'Se transporta manualmente cargas a una distancia superior a 20 mts.' },
            { id: 'p1_5', text: 'Se transporta manualmente cargas superiores a 25 kg.' }
          ],
          paso2: [
            { id: 'p2_1', text: 'En condiciones habituales de levantamiento el trabajador transporta la carga entre 1 y 10 metros con una masa acumulada (el producto de la masa por frecuencia) mayor que 10.000 kg durante la jornada habitual' },
            { id: 'p2_2', text: 'En condiciones habituales de levantamiento el trabajador transporta la carga entre 10 y 20 metros con una masa acumulada (el producto de la masa por la frecuencia) mayor a 6.000 kg durante la jornada habitual' },
            { id: 'p2_3', text: 'Las cargas poseen formas irregulares, son difíciles de asir, se deforman o hay movimientos en su interior' },
            { id: 'p2_4', text: 'El trabajador presenta alguna manifestación temprana de las enfermedades mencionadas en el artículo 1 de la presente Resolución' }
          ]
        },
        bipedestacion: {
          isTwoStep: true,
          paso1: [
            { id: 'p1_1', text: 'El puesto de trabajo se desarrolla en posición de pie, sin posibilidad de sentarse durante 2 horas seguidas o mas' }
          ],
          paso2: [
            { id: 'p2_1', text: 'En el puesto se realizan tareas donde se permanece de pie durante 3 horas seguidas o más, sin posibilidades de sentarse con escasa deambulación (caminando no más de 100 mts. Por hora).' },
            { id: 'p2_2', text: 'En el puesto se realizan tareas donde se permanece de pie durante 2 horas seguidas o más, sin posibilidades de sentarse o con escasa deambulación levantando y transportando cargas > 2 kg.' },
            { id: 'p2_3', text: 'Trabajos efectuados con bipedestación prolongada en ambientes donde la temperatura y humedad del aire sobrepasan los limites legalmente admisibles y que demanden actividad física.' },
            { id: 'p2_4', text: 'El trabajador presenta alguna manifestación temprana de enfermedades mencionadas en el artículo 1° de la presente Resolución.' }
          ]
        },
        mov_repetitivos: {
          isTwoStep: true,
          paso1: [
            { id: 'p1_1', text: 'Realizar diariamente una o más tareas donde se utilizan las extremidades superiores, durante 4 o más horas en la jornada habitual de trabajo en forma cíclica (en forma continuada o alternada)' }
          ],
          paso2: [
            { id: 'p2_1', text: 'Las extremidades superiores están activas por más del 40% del tiempo total del ciclo de trabajo' },
            { id: 'p2_2', text: 'En el ciclo de trabajo se realiza un esfuerzo superior a moderado a 3 según la escala de Borg, durante más de 6 segundos y más de una vez por minuto.' },
            { id: 'p2_3', text: 'Se realiza un esfuerzo superior a 7 según la escala de Borg.' },
            { id: 'p2_4', text: 'El trabajador presenta alguna manifestación temprana de las enfermedades mencionadas en el artículo 1º de la presente resolución' }
          ]
        },
        posturas_forzadas: {
          isTwoStep: true,
          paso1: [
            { id: 'p1_1', text: 'Adoptar posturas forzadas en forma habitual durante la jornada de trabajo, con o sin aplicación de fuerza. (No se deben considerar si las posturas son ocasionales)' }
          ],
          paso2: [
            { id: 'p2_1', text: 'Cuello en extensión, flexión, lateralización y/o rotación' },
            { id: 'p2_2', text: 'Brazos por encima de los hombros o con movimientos de supinación, pronación o rotación' },
            { id: 'p2_3', text: 'Muñecas y manos en flexión, extensión desviación cubital o radial' },
            { id: 'p2_4', text: 'Cintura en flexión, extensión, lateralización y/o rotación' },
            { id: 'p2_5', text: 'Miembros inferiores: trabajo en posición de rodillas o cuclillas' },
            { id: 'p2_6', text: 'El trabajador presenta alguna manifestación temprana de las enfermedades mencionadas en el Artículo 1º de la presente resolución' }
          ]
        },
        vibraciones_mano_brazo: {
          isTwoStep: true,
          paso1: [
            { id: 'p1_1', text: 'Trabajar con herramientas que producen vibraciones (martillo neumático, perforadora, destornilladores, pulidoras, esmeriladoras, otros).' },
            { id: 'p1_2', text: 'Sujetar piezas con las manos mientras estas son mecanizadas' },
            { id: 'p1_3', text: 'Sujetar palancas, volantes, etc. Que transmiten vibraciones' }
          ],
          paso2: [
            { id: 'p2_1', text: 'El valor de las vibraciones supera los límites establecidos en la Tabla I, de la parte correspondiente a Vibración (segmental) mano-brazo, del Anexo V, Resolución MTEySS Nº 295/03' },
            { id: 'p2_2', text: 'El trabajador presenta una manifestación temprana de las enfermedades mencionadas en el Artículo 1º de la presente Resolución' }
          ]
        },
        vibraciones_cuerpo_entero: {
          isTwoStep: true,
          paso1: [
            { id: 'p1_1', text: 'Conducir vehículos industriales, camiones, maquinas agrícolas, transporte público y otros.' },
            { id: 'p1_2', text: 'Trabajar próximo a máximas generadoras de impacto' }
          ],
          paso2: [
            { id: 'p2_1', text: 'El valor de las vibraciones supera los límites establecidos en la parte correspondiente a Vibración Cuerpo entero, del Anexo V. Resolución MTEySS Nº 295/03' },
            { id: 'p2_2', text: 'El trabajador presenta una manifestación temprana de las enfermedades mencionadas en el Artículo 1º de la presente Resolución' }
          ]
        },
        confort_termico: {
          isTwoStep: true,
          paso1: [
            { id: 'p1_1', text: 'En el puesto de trabajo se perciben temperaturas no confortables para la realización de tareas' }
          ],
          paso2: [
            { id: 'p2_1', text: 'Resultado del uso de la curva de Confort de Fanger, se encuentra por fuera de la zona de confort' }
          ]
        },
        estres_contacto: {
          isTwoStep: true,
          paso1: [
            { id: 'p1_1', text: 'Mantener apoyada alguna parte del cuerpo ejerciendo una presión, contra una herramienta, plano de trabajo, máquina herramienta o partes y materiales' }
          ],
          paso2: [
            { id: 'p2_1', text: 'El trabajador mantiene apoyada la muñeca, antebrazo, axila o muslo u otro segmento corporal sobre una superficie aguda o con canto' },
            { id: 'p2_2', text: 'El trabajador utiliza herramientas de mano o manipula piezas que presionan sobre sus dedos y/o palma de la mano hábil' },
            { id: 'p2_3', text: 'El trabajador realiza movimientos de percusión sobre partes o herramientas' },
            { id: 'p2_4', text: 'El trabajador presenta alguna manifestación temprana de las enfermedades mencionadas en el Artículo 1º de la presente resolución' }
          ]
        }
      };

      let currentY = 38;

      presentFactors.forEach((pf) => {
        const qDef = CUESTIONARIOS_PLANILLA2_LOCAL[pf.factorKey];
        let flatQuestions = [];
        
        if (qDef && qDef.isTwoStep) {
          flatQuestions.push({ id: 'header_p1', isHeader: true, text: 'Paso 1: Identificar si la tarea del puesto de trabajo implica:' });
          qDef.paso1.forEach(q => flatQuestions.push(q));
          
          const showP2 = Object.keys(pf.respuestas).some(k => k.startsWith('p1_') && pf.respuestas[k] === 'si');
          if (showP2) {
            flatQuestions.push({ id: 'header_p2', isHeader: true, text: 'Paso 2: Determinar el nivel de riesgo' });
            qDef.paso2.forEach(q => flatQuestions.push(q));
          }
        } else if (Array.isArray(qDef)) {
          flatQuestions = qDef;
        }

        const totalLines = flatQuestions.length;
        const cardH = 15 + (totalLines * 6) + 6;

        if (currentY + cardH > 170) {
          drawSignatureBlock(185, 175, 90, 22, signatureBase64, profNombre, profMatricula, 'Firma, Aclaración y Registro del Profesional Interviniente');
          
          doc.addPage('a4', 'landscape');
          pageCounter++;
          drawHeader(true);
          drawProtocolTitleBar(true, { x: 15, y: 22, w: 267, h: 5.5 });
          
          setFillColor(doc, '#468DFF');
          doc.rect(15, 29, 267, 7, 'F');
          drawCellText(doc, `PUESTO: ${(pt.puesto_text || pt.puesto || '-').toUpperCase()} — EVALUACIÓN INICIAL (PLANILLA 2) - CONTINUACIÓN`, 15, 29, 267, 7, {
            align: 'center',
            fontStyle: 'bold',
            fontSize: 8.5,
            color: '#FFFFFF'
          });
          currentY = 38;
        }

        setFillColor(doc, '#F8FAFC');
        doc.rect(15, currentY, 267, 7, 'FD');
        setDrawColor(doc, '#CBD5E1');
        doc.rect(15, currentY, 267, cardH, 'S');

        drawCellText(doc, `Tarea #${pf.taskIdx} (${pf.taskName}) — ${pf.factorLabel}`, 17, currentY, 200, 7, {
          align: 'left',
          fontStyle: 'bold',
          fontSize: 7.5,
          color: COLOR_NEGRO
        });

        const isRskHigh = pf.riesgo === '3';
        const isRskMed = pf.riesgo === '2';
        const rskText = `Nivel de Riesgo: Nivel ${pf.riesgo} - ${pf.riesgo === '3' ? 'Crítico (Alto)' : (pf.riesgo === '2' ? 'Moderado (Medio)' : 'Tolerable (Bajo)')}`;
        drawCellText(doc, rskText, 210, currentY, 70, 7, {
          align: 'right',
          fontStyle: 'bold',
          fontSize: 7,
          color: isRskHigh ? '#DC2626' : (isRskMed ? '#D97706' : '#00B050')
        });

        let qY = currentY + 7;
        doc.line(15, qY, 282, qY);
        drawCellText(doc, 'Pregunta / Condición Evaluada (Checklist Inicial)', 17, qY, 210, 6, { fontStyle: 'bold', fontSize: 6.5, color: '#475569' });
        drawCellText(doc, 'Respuesta', 230, qY, 20, 6, { fontStyle: 'bold', fontSize: 6.5, color: '#475569', align: 'center' });
        drawCellText(doc, 'Resultado', 255, qY, 25, 6, { fontStyle: 'bold', fontSize: 6.5, color: '#475569', align: 'center' });
        
        qY += 6;
        doc.line(15, qY, 282, qY);

        let hasAnySi = false;

        flatQuestions.forEach((q) => {
          if (q.isHeader) {
            setFillColor(doc, '#F1F5F9');
            doc.rect(15, qY, 267, 6, 'FD');
            drawCellText(doc, q.text, 17, qY, 260, 6, { align: 'left', fontStyle: 'bold', fontSize: 6.5, color: '#334155' });
            qY += 6;
            doc.line(15, qY, 282, qY);
            return;
          }

          const ans = pf.respuestas[q.id] || 'no';
          if (ans === 'si') hasAnySi = true;
          
          drawCellText(doc, q.text, 17, qY, 210, 6, { align: 'left', fontSize: 6.5 });
          drawCellText(doc, ans.toUpperCase(), 230, qY, 20, 6, { align: 'center', fontSize: 6.5, fontStyle: 'bold', color: ans === 'si' ? '#DC2626' : '#00B050' });
          drawCellText(doc, ans === 'si' ? 'Riesgo' : 'Tolerable', 255, qY, 25, 6, { align: 'center', fontSize: 6.5, fontStyle: 'bold', color: ans === 'si' ? '#DC2626' : '#00B050' });
          
          qY += 6;
          doc.line(15, qY, 282, qY);
        });

        let diagText = '';
        if (qDef && qDef.isTwoStep) {
          const isP1_3 = pf.respuestas['p1_3'] === 'si';
          const hasP1Si = pf.respuestas['p1_1'] === 'si' || pf.respuestas['p1_2'] === 'si' || pf.respuestas['p1_3'] === 'si';
          const hasP2Si = Object.keys(pf.respuestas).some(k => k.startsWith('p2_') && pf.respuestas[k] === 'si');

          if (isP1_3) {
            diagText = 'Diagnóstico: Riesgo NO tolerable (Nivel 3). La carga supera los 25 kg. Se debe solicitar mejoras en tiempo prudencial.';
          } else if (!hasP1Si) {
            diagText = 'Diagnóstico: Riesgo Tolerable (Nivel 1). Todas las respuestas del Paso 1 son "No".';
          } else if (hasP2Si) {
            diagText = 'Diagnóstico: Alguna respuesta del Paso 2 es "Sí". No se puede presumir tolerable. Por lo tanto, se debe realizar una Evaluación de Riesgos (Nivel 2).';
          } else {
            diagText = 'Diagnóstico: Todas las respuestas del Paso 2 son "No". Se presume riesgo tolerable (Nivel 1).';
          }
        } else {
          diagText = hasAnySi 
            ? 'Diagnóstico: Se identificaron condiciones de riesgo. Se aconseja Nivel de Riesgo 2 o 3 y medidas correctivas/preventivas en Planilla 3.'
            : 'Diagnóstico: No se identificaron condiciones de riesgo adicionales. Riesgo considerado Tolerable.';
        }
        
        drawCellText(doc, diagText, 17, qY, 260, 6, {
          align: 'left',
          fontSize: 6.5,
          fontStyle: 'bold',
          color: (qDef?.isTwoStep ? (pf.riesgo === '3' ? '#DC2626' : (pf.riesgo === '2' ? '#D97706' : '#00B050')) : (hasAnySi ? '#D97706' : '#00B050'))
        });

        currentY += cardH + 4;
      });

      drawSignatureBlock(185, 175, 90, 22, signatureBase64, profNombre, profMatricula, 'Firma, Aclaración y Registro del Profesional Interviniente');
    }
  });

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

  // Fila 1: Razón Social (160mm) | C.U.I.T. (63mm) | CIIU (40mm)
  doc.rect(aX, aY, 160, 7, 'S');
  drawCellText(doc, 'Razón Social:', aX, aY, 22, 7, { fontStyle: 'bold', fontSize: 8 });
  drawCellText(doc, razonSocial, aX + 22, aY, 138, 7, { fontSize: 8 });

  doc.rect(aX + 160, aY, 63, 7, 'S');
  drawCellText(doc, 'C.U.I.T.:', aX + 160, aY, 15, 7, { fontStyle: 'bold', fontSize: 8 });
  drawCellText(doc, cuit, aX + 175, aY, 48, 7, { fontSize: 8 });

  doc.rect(aX + 223, aY, 40, 7, 'S');
  drawCellText(doc, 'CIIU:', aX + 223, aY, 10, 7, { fontStyle: 'bold', fontSize: 8 });
  drawCellText(doc, ciiu, aX + 233, aY, 30, 7, { fontSize: 8 });

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

  // Título de Conformidad del Protocolo
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  setTextColor(doc, COLOR_NEGRO);
  doc.text('CONFORMIDAD DEL PROTOCOLO DE ERGONOMÍA (RESOLUCIÓN SRT 886/15)', 297 / 2, 47, { align: 'center' });

  // 1. Firma del Empleador (Por encima del Profesional)
  drawSignatureBlock(
    101, 
    52, 
    95, 
    32, 
    firmaEmpleadorBase64, 
    proto.empleador_nombre, 
    '', 
    'Firma y Aclaración del Empleador Responsable'
  );

  // 2. Firma del Profesional de Higiene y Seguridad
  drawSignatureBlock(
    101, 
    95, 
    95, 
    32, 
    signatureBase64, 
    profNombre, 
    profMatricula, 
    'Firma, Aclaración y Reg. de Higiene y Seguridad'
  );

  // 3. Firma del Responsable del Servicio de Medicina del Trabajo (Por debajo del Profesional)
  drawSignatureBlock(
    101, 
    138, 
    95, 
    32, 
    firmaMedicinaBase64, 
    proto.medicina_nombre, 
    proto.medicina_matricula, 
    'Firma, Aclaración y Reg. del Servicio de Medicina del Trabajo'
  );

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
    setFillColor(doc, COLOR_SLATE_200);
    doc.rect(kX, kY, kW, 6, 'FD');
    
    const planoTitle = rawAdj.descripcion || rawAdj.nombre_archivo || rawAdj.nombre || `PLANO O CROQUIS DE MEDICIÓN (${cIdx + 1} de ${planoAdjuntos.length})`;
    drawCellText(doc, planoTitle.toUpperCase(), kX, kY, kW, 6, { fontStyle: 'bold', fontSize: 9, align: 'center', color: COLOR_NEGRO });

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
            const { data: blob } = await supabase.storage.from('protocolos-ergonomia').download(path);
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
        link.download = filename || 'Protocolo_Ergonomia.pdf';
        link.click();
      };
    } catch (mergeErr) {
      console.error('Error al fusionar certificado PDF con pdf-lib:', mergeErr);
    }
  }

  return doc;
};
