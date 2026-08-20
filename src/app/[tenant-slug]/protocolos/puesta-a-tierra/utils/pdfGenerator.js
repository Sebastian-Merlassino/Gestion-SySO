import { PDFDocument, PDFName } from 'pdf-lib';
import { formatDate } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { setFillColor, setDrawColor, setTextColor, hexToRgb, PDF_THEME } from '@/lib/pdf/pdfTheme';
import { getBase64ImageFromUrl } from '@/lib/pdf/pdfImages';
import { fetchProfessionalMatriculasWithImages, renderMatriculasAnexoPages } from '@/lib/pdf/pdfMatriculasAnexo';

// Helper de cálculo de límites y estado para compatibilidad de puntos
const getLimiteDbaForTe = (teHours) => {
  if (teHours <= 0.11 / 3600) return 139;
  if (teHours <= 0.22 / 3600) return 136;
  if (teHours <= 0.44 / 3600) return 133;
  if (teHours <= 0.88 / 3600) return 130;
  if (teHours <= 1.76 / 3600) return 127;
  if (teHours <= 3.52 / 3600) return 124;
  if (teHours <= 7.03 / 3600) return 121;
  if (teHours <= 14.06 / 3600) return 118;
  if (teHours <= 28.12 / 3600) return 115;
  if (teHours <= 0.94 / 60) return 112;
  if (teHours <= 1.88 / 60) return 109;
  if (teHours <= 3.75 / 60) return 106;
  if (teHours <= 7.5 / 60) return 103;
  if (teHours <= 15 / 60) return 100;
  if (teHours <= 30 / 60) return 97;
  if (teHours <= 1) return 94;
  if (teHours <= 2) return 91;
  if (teHours <= 4) return 88;
  if (teHours <= 8) return 85;
  if (teHours <= 16) return 82;
  return 80;
};

const getPuntoCalculos = (p) => {
  if (!p) return { resultado_punto: '—' };
  if (p.cumple === true || p.resultado === 'Cumple' || p.resultado_punto === 'Cumple') return { resultado_punto: 'Cumple' };
  if (p.cumple === false || p.resultado === 'No cumple' || p.resultado_punto === 'No cumple') return { resultado_punto: 'No cumple' };

  if (p.caracteristicas_ruido === 'impulso_impacto') {
    if (p.nivel_pico_lc_pico_dbc) {
      return { resultado_punto: Number(p.nivel_pico_lc_pico_dbc) <= 140 ? 'Cumple' : 'No cumple' };
    }
  } else {
    const te = Number(p.tiempo_exposicion_hs || 8);
    const limite = getLimiteDbaForTe(te);
    if (p.nivel_laeq_te_dba) {
      return { resultado_punto: Number(p.nivel_laeq_te_dba) <= limite ? 'Cumple' : 'No cumple' };
    }
    if (p.resultado_suma_fracciones) {
      return { resultado_punto: Number(p.resultado_suma_fracciones) <= 1 ? 'Cumple' : 'No cumple' };
    }
    if (p.dosis_porcentaje) {
      return { resultado_punto: Number(p.dosis_porcentaje) <= 100 ? 'Cumple' : 'No cumple' };
    }
  }
  return { resultado_punto: 'Cumple' };
};

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
    const bucketsToTry = ['protocolos-puesta-a-tierra', 'protocolos-ruido', 'documents'];
    for (const b of bucketsToTry) {
      try {
        const { data: blob, error } = await supabase.storage
          .from(b)
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
        // continue trying other buckets
      }
    }
  }

  // 3. If HTTP URL or fallback: fetch signed/public URL
  let targetUrl = path;
  if (!targetUrl.startsWith('http') && !targetUrl.startsWith('data:')) {
    try {
      const { data: sData } = await supabase.storage
        .from('protocolos-puesta-a-tierra')
        .createSignedUrl(path, 3600);
      if (sData?.signedUrl) targetUrl = sData.signedUrl;
    } catch (e) {
      const { data: pData } = supabase.storage
        .from('protocolos-puesta-a-tierra')
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

export const generatePuestaATierraPdf = async (
  proto,
  tenant,
  empresas,
  allEstablecimientos,
  puntosList = [],
  adjuntosList = [],
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

  const emp = (empresas || []).find(e => e.id === proto.razon_social_id);
  const est = (allEstablecimientos || []).find(e => e.id === proto.establecimiento_id);

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
    doc.setFontSize(8.5);
    setTextColor(doc, COLOR_BLANCO);
    const textY = pos.y + (pos.h / 2) + 1.1;
    doc.text('PROTOCOLO DE MEDICIÓN DE LA PUESTA A TIERRA Y CONTINUIDAD DE LAS MASAS', pos.x + (pos.w / 2), textY, { align: 'center' });
  };

  // Helper: Signature Block
  const drawSignatureBlock = (x, y, w, h) => {
    const imgMaxW = w;
    const imgMaxH = Math.max(28, h - 8);

    // 1. Signature image
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

  // Safe data getters
  const razonSocial = proto.razon_social_text || emp?.razon_social || 'EMPRESA CLIENTE S.A.';
  const cuit = proto.cuit_text || emp?.cuit || '30-00000000-0';
  const direccion = proto.direccion_text || est?.direccion || 'DIRECCIÓN DE PLANTA';
  const localidad = proto.localidad_text || est?.localidad || 'LOCALIDAD';
  const provincia = proto.provincia_text || est?.provincia || 'BUENOS AIRES';
  const cp = proto.cp_text || est?.cp || '0000';
  const horarios = proto.horarios_turnos_text || 'Lunes a viernes de 8:00 a 17:00 hs';
  const marcaModeloNser = proto.instrumento_marca_modelo_serie || 'Telurímetro Digital marca CEM, modelo DT-5300B, N° de serie 19082201';
  const fechaCalib = proto.fecha_calibracion ? formatDate(proto.fecha_calibracion) : '';
  const metodologia = proto.metodologia_utilizada || 'Método de Caída de Potencial (3 picas)';
  const fechaMedicion = proto.fecha_medicion ? formatDate(proto.fecha_medicion) : formatDate(new Date());
  const horaInicio = proto.hora_inicio || '09:00';
  const horaFin = proto.hora_finalizacion || '12:00';
  const condAtmos = proto.condiciones_atmosfericas || 'Cielo despejado\nTemperatura: 22 °C\nHumedad: 55 %\nSuelo: Seco';

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
  setDrawColor(doc, COLOR_AZUL_PRINCIPAL);
  doc.setLineWidth(0.4);
  doc.rect(10, 10, 190, 277, 'S');

  // Year Rectangle
  const currentYear = proto.fecha_medicion ? new Date(proto.fecha_medicion).getFullYear() : new Date().getFullYear();
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
  doc.setFontSize(26);
  setTextColor(doc, COLOR_AZUL_PRINCIPAL);
  const titleLines = doc.splitTextToSize('Protocolo de medición de la puesta a tierra y continuidad de las masas', 145);
  doc.text(titleLines, 39, 168);

  // Normative reference
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  setTextColor(doc, COLOR_SLATE_600);
  doc.text('DECRETO Nº 351/79, ANEXO VI - CAPÍTULO 14 - INSTALACIONES ELÉCTRICAS', 39, 218);
  const normLines = doc.splitTextToSize('ANEXO - RESOLUCIÓN 900/2015 (PROTOCOLO PARA LA MEDICIÓN DEL VALOR DE PUESTA A TIERRA Y LA VERIFICACIÓN DE LA CONTINUIDAD DE LAS MASAS EN EL AMBIENTE LABORAL)', 145);
  doc.text(normLines, 39, 224);

  // Brand / Consultora
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  setTextColor(doc, COLOR_SLATE_900);
  doc.text(companyName.toUpperCase(), 39, 246);

  // ==========================================
  // HOJAS INFORMATIVAS: INSTALACIONES ELÉCTRICAS (ANEXO VI - CAPÍTULO 14 - DEC. 351/79)
  // ==========================================
  doc.addPage('a4', 'portrait');
  pageCounter++;
  drawHeader(false);

  // Section Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  setTextColor(doc, COLOR_NEGRO);
  doc.text('Instalaciones Eléctricas (Título V - Capítulo 14 – Dec. 351/79)', 15, 28);
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

  const printParagraph = (pText) => {
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
  };

  // Párrafos normativos oficiales del Decreto 351/79 Título V - Capítulo 14
  printParagraph('Las instalaciones y equipos eléctricos de los establecimientos deberán cumplir con las prescripciones necesarias para evitar riesgos a personas o cosas.');
  printParagraph('Los materiales y equipos que se utilicen en las instalaciones eléctricas cumplirán con las exigencias de las normas técnicas correspondientes. En caso de no estar normalizados deberán asegurar las prescripciones previstas en el presente capítulo.');
  printParagraph('Los proyectos de instalaciones y equipos eléctricos responderán a los Anexos correspondientes de este reglamento y además los de más de 1000 voltios de tensión deberán estar aprobados en los rubros de su competencia por el responsable del Servicio de Higiene y Seguridad en el Trabajo de cada establecimiento.');
  printParagraph('Las tareas de montaje, maniobra o mantenimiento sin o con tensión, se regirán por las disposiciones del Anexo VI.');
  printParagraph('Los trabajos de mantenimiento serán efectuados exclusivamente por personal capacitado, debidamente autorizado por la empresa para su ejecución.');
  printParagraph('Los establecimientos efectuarán el mantenimiento de las instalaciones y verificarán las mismas periódicamente en base a sus respectivos programas, confeccionados de acuerdo con normas de seguridad, registrando debidamente sus resultados.');
  printParagraph('Se extremarán las medidas de seguridad en salas de baterías y en aquellos locales donde se fabriquen, manipulen o almacenen materiales inflamables, explosivos o de alto riesgo; igualmente en locales húmedos, mojados o con sustancias corrosivas, conforme a lo establecido en el Anexo VI.');
  printParagraph('En lo referente a motores, conductores, interruptores, seccionadores, transformadores, condensadores, alternadores, celdas de protección, cortacircuitos, equipos y herramientas, máquinas de elevación y transporte, se tendrá en cuenta lo establecido en el Anexo VI.');
  printParagraph('Se deberán adoptar las medidas tendientes a la eliminación de la electricidad estática en todas aquellas operaciones donde pueda producirse. Los métodos se detallan en el Anexo VI. Se extremarán los recaudos en ambientes con riesgos de incendio o atmósferas explosivas.');
  printParagraph('Los establecimientos e instalaciones expuestos a descargas atmosféricas poseerán una instalación contra las sobretensiones de este origen que asegure la eficaz protección de las personas y cosas. Las tomas a tierra de estas instalaciones deberán ser exclusivas e independientes de cualquier otra.');

  // ==========================================
  // HOJA 1: FORMULARIO OFICIAL PUESTA A TIERRA (A4 Vertical - RES. SRT 900/15)
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

  // Metodología utilizada:
  doc.rect(t2X, rY, t2W, 47, 'S');
  drawCellText(doc, 'Metodología utilizada:', t2X, rY, t2W, 5, { fontStyle: 'bold', fontSize: 8.5 });
  const metodoText = proto.metodologia_utilizada || proto.metodologia || '“de caída de tensión” según Norma IRAM 2281 parte II: “Guía de mediciones de magnitudes de puesta a tierra”';
  drawCellText(doc, metodoText, t2X + 2, rY + 5, t2W - 4, 41, { fontSize: 8.5, valign: 'top' });
  rY += 47;

  // Observaciones:
  doc.rect(t2X, rY, t2W, 47, 'S');
  drawCellText(doc, 'Observaciones:', t2X, rY, t2W, 5, { fontStyle: 'bold', fontSize: 8.5 });
  const obsText = proto.observaciones_generales || proto.observaciones || 'Valores límites recomendados: Circuito con protección contra contactos indirectos (DID / 30 mA) < 40 ohms; Circuito sin protección contra contactos indirectos < 10 ohms.';
  drawCellText(doc, obsText, t2X + 2, rY + 5, t2W - 4, 41, { fontSize: 8.5, valign: 'top' });

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

  const docAdjText = (proto.documentacion_adjunta || 'Certificado de Calibración.\nPlano o Croquis del establecimiento.').replace(/\[NO_MATRICULA_PDF\]/g, '').trim();
  drawCellText(doc, docAdjText, t3X + 3, t3Y + 6.5, t3W - 6, 12, { fontSize: 8.5, valign: 'top' });

  // Firma Profesional (Alineada abajo a la derecha de la hoja 1)
  drawSignatureBlock(105, t3Y + t3H + 4, 90, 36);

  // ==========================================
  // HOJA 2: TABLA GENERAL DE MEDICIÓN (A4 Apaisada / Landscape - RES. SRT 900/15)
  // ==========================================
  const maxRowsPerPage = 10;
  const totalPoints = (puntosList || []).length;
  const totalTablePages = Math.max(1, Math.ceil(totalPoints / maxRowsPerPage));

  for (let pIdx = 0; pIdx < totalTablePages; pIdx++) {
    doc.addPage('a4', 'landscape');
    pageCounter++;

    drawHeader(true);
    drawProtocolTitleBar(true, { x: 15, y: 22, w: 267, h: 5.5 });

    // Encabezado Establecimiento (Mini tabla de datos - 267mm)
    const eX = 15;
    const eY = 29;
    const eW = 267;

    doc.setLineWidth(0.45);
    setDrawColor(doc, COLOR_NEGRO);
    doc.rect(eX, eY, eW, 12, 'S');
    doc.setLineWidth(0.25);

    // Fila 1: Razón Social (175mm) | C.U.I.T. (92mm)
    doc.rect(eX, eY, 175, 6, 'S');
    drawCellText(doc, 'Razón Social:', eX, eY, 24, 6, { fontStyle: 'bold', fontSize: 8 });
    drawCellText(doc, razonSocial, eX + 24, eY, 151, 6, { fontSize: 8 });

    doc.rect(eX + 175, eY, 92, 6, 'S');
    drawCellText(doc, 'C.U.I.T.:', eX + 175, eY, 18, 6, { fontStyle: 'bold', fontSize: 8 });
    drawCellText(doc, cuit, eX + 193, eY, 74, 6, { fontSize: 8 });

    // Fila 2: Dirección (95mm) | Localidad (60mm) | CP (30mm) | Provincia (82mm)
    doc.rect(eX, eY + 6, 95, 6, 'S');
    drawCellText(doc, 'Dirección:', eX, eY + 6, 18, 6, { fontStyle: 'bold', fontSize: 8 });
    drawCellText(doc, direccion, eX + 18, eY + 6, 77, 6, { fontSize: 8 });

    doc.rect(eX + 95, eY + 6, 60, 6, 'S');
    drawCellText(doc, 'Localidad:', eX + 95, eY + 6, 16, 6, { fontStyle: 'bold', fontSize: 8 });
    drawCellText(doc, localidad, eX + 111, eY + 6, 44, 6, { fontSize: 8 });

    doc.rect(eX + 155, eY + 6, 30, 6, 'S');
    drawCellText(doc, 'CP:', eX + 155, eY + 6, 8, 6, { fontStyle: 'bold', fontSize: 8 });
    drawCellText(doc, cp, eX + 163, eY + 6, 22, 6, { fontSize: 8 });

    doc.rect(eX + 185, eY + 6, 82, 6, 'S');
    drawCellText(doc, 'Provincia:', eX + 185, eY + 6, 18, 6, { fontStyle: 'bold', fontSize: 8 });
    drawCellText(doc, provincia, eX + 203, eY + 6, 64, 6, { fontSize: 8 });

    // Header Tabla: Datos de la Medición
    const tHeadY = eY + 13.5;
    setFillColor(doc, COLOR_SLATE_200);
    doc.rect(eX, tHeadY, eW, 5, 'FD');
    drawCellText(doc, 'Datos de la Medición', eX, tHeadY, eW, 5, { align: 'center', fontStyle: 'bold', fontSize: 8.5 });

    // Definición de Columnas (Total = 267mm)
    const colY = tHeadY + 5;
    const colH = 22;

    const drawHBox = (x, y, w, h, text, opts = {}) => {
      setFillColor(doc, COLOR_SLATE_200);
      doc.rect(x, y, w, h, 'FD');
      drawCellText(doc, text, x, y, w, h, {
        align: 'center',
        fontStyle: 'bold',
        fontSize: 5,
        color: COLOR_NEGRO,
        ...opts
      });
    };

    let xPos = 15;

    // Col 1: Número de toma de tierra (16mm)
    drawHBox(xPos, colY, 16, colH, 'Número\nde toma\nde tierra', { fontSize: 5.5, maxLines: 3 });
    xPos += 16;

    // Col 2: Sector (36mm)
    drawHBox(xPos, colY, 36, colH, 'Sector', { fontSize: 7, maxLines: 2 });
    xPos += 36;

    // Col 3: Descripción de la condición del terreno... (30mm)
    drawHBox(xPos, colY, 30, colH, 'Descripción de la condición del terreno al momento de la medición:\nLecho seco / Lecho húmedo / Arcilloso / Pantanoso / Lluvias recientes / Arenoso seco o húmedo / Otro', { fontSize: 4.5, maxLines: 8, padding: 0.6 });
    xPos += 30;

    // Col 4: Uso de la puesta a tierra... (34mm)
    drawHBox(xPos, colY, 34, colH, 'Uso de la puesta a tierra: Toma de Tierra del neutro de Transformador / Toma de Tierra de Seguridad de las Masas / De Protección de equipos Electrónicos / De Informática / De Iluminación / De Pararrayos / Otros.', { fontSize: 4.5, maxLines: 8, padding: 0.6 });
    xPos += 34;

    // Col 5: Esquema de conexión a tierra utilizado... (20mm)
    drawHBox(xPos, colY, 20, colH, 'Esquema de conexión a tierra utilizado: TT / TN-S / TN-C / TN-C-S / IT', { fontSize: 5, maxLines: 6, padding: 0.6 });
    xPos += 20;

    // Col 6 & 7 Group: Medición de la puesta a tierra (32mm)
    drawHBox(xPos, colY, 32, 6.5, 'Medición de la puesta a tierra', { fontSize: 5.5, maxLines: 2 });
    drawHBox(xPos, colY + 6.5, 18, colH - 6.5, 'Valor obtenido en la medición expresado en ohm [Ω]', { fontSize: 4.8, maxLines: 4, padding: 0.5 });
    drawHBox(xPos + 18, colY + 6.5, 14, colH - 6.5, 'Cumple\nSI / NO', { fontSize: 5.5, maxLines: 2 });
    xPos += 32;

    // Col 8 & 9 Group: Continuidad de las masas (41mm)
    drawHBox(xPos, colY, 41, 6.5, 'Continuidad de las masas', { fontSize: 5.5, maxLines: 2 });
    drawHBox(xPos, colY + 6.5, 19, colH - 6.5, 'El circuito de puesta a tierra es continuo y permanente SI / NO', { fontSize: 4.6, maxLines: 4, padding: 0.5 });
    drawHBox(xPos + 19, colY + 6.5, 22, colH - 6.5, 'El circuito de puesta a tierra tiene la capacidad de carga para conducir la corriente de falla y una resistencia apropiada SI / NO', { fontSize: 4.4, maxLines: 5, padding: 0.5 });
    xPos += 41;

    // Col 10: Para la protección contra contactos indirectos se utiliza... (30mm)
    drawHBox(xPos, colY, 30, colH, 'Para la protección contra contactos indirectos se utiliza: dispositivo diferencial (DD), interruptor automático (IA) o fusible (Fus).', { fontSize: 4.6, maxLines: 6, padding: 0.6 });
    xPos += 30;

    // Col 11: El dispositivo de protección empleado ¿puede desconectar...? (28mm)
    drawHBox(xPos, colY, 28, colH, 'El dispositivo de protección empleado ¿puede desconectar en forma automática la alimentación para lograr la protección contra los contactos indirectos?', { fontSize: 4.5, maxLines: 6, padding: 0.6 });

    // Table Data Rows
    const rowStartY = colY + colH;
    const rowH = 7.0;

    const startSlice = pIdx * maxRowsPerPage;
    const endSlice = startSlice + maxRowsPerPage;
    const pagePuntos = (puntosList || []).slice(startSlice, endSlice);

    const tableColsDef = [
      { w: 16, key: 'num', align: 'center' },
      { w: 36, key: 'sector', align: 'center' },
      { w: 30, key: 'condicion', align: 'center' },
      { w: 34, key: 'uso', align: 'center' },
      { w: 20, key: 'esquema', align: 'center' },
      { w: 18, key: 'valor', align: 'center' },
      { w: 14, key: 'cumple', align: 'center' },
      { w: 19, key: 'continuo', align: 'center' },
      { w: 22, key: 'capacidad', align: 'center' },
      { w: 30, key: 'dispositivo', align: 'center' },
      { w: 28, key: 'desconexion', align: 'center' }
    ];

    for (let r = 0; r < maxRowsPerPage; r++) {
      const rowY = rowStartY + (r * rowH);
      const pt = pagePuntos[r];
      let currXPos = 15;

      if (!pt) {
        // Fila vacía numerada estándar
        tableColsDef.forEach((c, cIdx) => {
          doc.rect(currXPos, rowY, c.w, rowH, 'S');
          if (cIdx === 0) {
            drawCellText(doc, String(startSlice + r + 1), currXPos, rowY, c.w, rowH, { align: 'center', fontSize: 7.5, color: COLOR_NEGRO });
          }
          currXPos += c.w;
        });
      } else {
        const rawValOhm = (pt.valor_medido_ohm !== undefined && pt.valor_medido_ohm !== null) ? String(pt.valor_medido_ohm).trim() : '';
        const valOhm = (rawValOhm !== '' && rawValOhm !== 'NaN') ? rawValOhm.replace('.', ',') : '-';
        const formatSiNo = (val) => {
          if (val === true || val === 'SI' || val === 'Si' || val === 'Cumple' || val === 'CUMPLE') return 'SI';
          if (val === false || val === 'NO' || val === 'No' || val === 'No cumple' || val === 'NO CUMPLE') return 'NO';
          if (val !== undefined && val !== null && String(val).trim() !== '') return String(val).trim();
          return '-';
        };

        const rowData = {
          num: String(pt.toma_tierra_num || pt.orden || (startSlice + r + 1)),
          sector: (pt.sector || pt.ubicacion || '').trim() || '-',
          condicion: (pt.condicion_terreno || '').trim() || '-',
          uso: (pt.uso_puesta_a_tierra || '').trim() || '-',
          esquema: (pt.esquema_conexion || '').trim() || '-',
          valor: valOhm,
          cumple: formatSiNo(pt.cumple_ohm),
          continuo: formatSiNo(pt.continuidad_permanente),
          capacidad: formatSiNo(pt.capacidad_carga),
          dispositivo: (pt.dispositivo_proteccion || '').trim() || '-',
          desconexion: formatSiNo(pt.desconexion_automatica)
        };

        tableColsDef.forEach(c => {
          doc.rect(currXPos, rowY, c.w, rowH, 'S');
          const rawVal = rowData[c.key];
          const val = (rawVal !== undefined && rawVal !== null && String(rawVal).trim() !== '') 
            ? String(rawVal).trim() 
            : '-';
          drawCellText(doc, val, currXPos, rowY, c.w, rowH, {
            align: c.align || 'center',
            fontSize: (c.key === 'sector' || c.key === 'uso' || c.key === 'condicion' || c.key === 'dispositivo') ? 6.5 : 7.5,
            fontStyle: 'normal',
            color: COLOR_NEGRO,
            maxLines: 3,
            padding: 0.6
          });
          currXPos += c.w;
        });
      }
    }

    // Cuadro Información Adicional y Firma
    const infoY = rowStartY + (maxRowsPerPage * rowH) + 2.5;
    const infoW = 168;
    const infoH = 26;
    doc.setLineWidth(0.45);
    doc.rect(15, infoY, infoW, infoH, 'S');
    doc.setLineWidth(0.25);

    drawCellText(doc, 'Información adicional:', 15, infoY, infoW, 5, { fontStyle: 'bold', fontSize: 8, color: COLOR_NEGRO });
    const addInfoText = (proto.informacion_adicional !== undefined && proto.informacion_adicional !== null && String(proto.informacion_adicional).trim() !== '')
      ? proto.informacion_adicional
      : (proto.informacion_adicional === '' ? '' : 'Se probó disparo de disyuntores. Tipo y corriente de disparo, dentro de parámetros.');
    drawCellText(doc, addInfoText, 15 + 2, infoY + 5.5, infoW - 4, infoH - 6.5, { fontSize: 7.5, valign: 'top', color: COLOR_NEGRO, padding: 0.5 });

    // Firma Profesional (Alineada a la derecha)
    drawSignatureBlock(188, infoY, 94, 38);
  }

  // ==========================================
  // HOJA 3: ANÁLISIS DE LOS DATOS Y MEJORAS A REALIZAR (A4 Apaisada / Landscape - RES. SRT 900/15)
  // ==========================================
  doc.addPage('a4', 'landscape');
  pageCounter++;

  drawHeader(true);
  drawProtocolTitleBar(true, { x: 15, y: 22, w: 267, h: 5.5 });

  // Encabezado Establecimiento (267mm)
  const aX = 15;
  const aY = 29;
  const aW = 267;

  doc.setLineWidth(0.45);
  setDrawColor(doc, COLOR_NEGRO);
  doc.rect(aX, aY, aW, 12, 'S');
  doc.setLineWidth(0.25);

  // Fila 1: Razón Social (175mm) | C.U.I.T. (92mm)
  doc.rect(aX, aY, 175, 6, 'S');
  drawCellText(doc, 'Razón Social:', aX, aY, 24, 6, { fontStyle: 'bold', fontSize: 8 });
  drawCellText(doc, razonSocial, aX + 24, aY, 151, 6, { fontSize: 8 });

  doc.rect(aX + 175, aY, 92, 6, 'S');
  drawCellText(doc, 'C.U.I.T.:', aX + 175, aY, 18, 6, { fontStyle: 'bold', fontSize: 8 });
  drawCellText(doc, cuit, aX + 193, aY, 74, 6, { fontSize: 8 });

  // Fila 2: Dirección (95mm) | Localidad (60mm) | CP (30mm) | Provincia (82mm)
  doc.rect(aX, aY + 6, 95, 6, 'S');
  drawCellText(doc, 'Dirección:', aX, aY + 6, 18, 6, { fontStyle: 'bold', fontSize: 8 });
  drawCellText(doc, direccion, aX + 18, aY + 6, 77, 6, { fontSize: 8 });

  doc.rect(aX + 95, aY + 6, 60, 6, 'S');
  drawCellText(doc, 'Localidad:', aX + 95, aY + 6, 16, 6, { fontStyle: 'bold', fontSize: 8 });
  drawCellText(doc, localidad, aX + 111, aY + 6, 44, 6, { fontSize: 8 });

  doc.rect(aX + 155, aY + 6, 30, 6, 'S');
  drawCellText(doc, 'CP:', aX + 155, aY + 6, 8, 6, { fontStyle: 'bold', fontSize: 8 });
  drawCellText(doc, cp, aX + 163, aY + 6, 22, 6, { fontSize: 8 });

  doc.rect(aX + 185, aY + 6, 82, 6, 'S');
  drawCellText(doc, 'Provincia:', aX + 185, aY + 6, 18, 6, { fontStyle: 'bold', fontSize: 8 });
  drawCellText(doc, provincia, aX + 203, aY + 6, 64, 6, { fontSize: 8 });

  // Tabla Análisis (267mm)
  const tAX = 15;
  const tAY = 43.5;
  const tAW = 267;
  const contentH = 92;
  const totalBoxH = 5.5 + 6.5 + contentH; // 104mm total height

  doc.setLineWidth(0.45);
  doc.rect(tAX, tAY, tAW, totalBoxH, 'S');

  // Title Header
  setFillColor(doc, COLOR_SLATE_200);
  doc.rect(tAX, tAY, tAW, 5.5, 'FD');
  drawCellText(doc, 'Análisis de los Datos y Mejoras a Realizar', tAX, tAY, tAW, 5.5, { align: 'center', fontStyle: 'bold', fontSize: 9, color: COLOR_NEGRO });

  // 2 Columns Subheader Titles (133.5mm cada una)
  const colW = tAW / 2;
  setFillColor(doc, COLOR_SLATE_200);
  doc.rect(tAX, tAY + 5.5, colW, 6.5, 'FD');
  doc.rect(tAX + colW, tAY + 5.5, colW, 6.5, 'FD');

  drawCellText(doc, 'Conclusiones', tAX, tAY + 5.5, colW, 6.5, { fontStyle: 'bold', fontSize: 8.5, color: COLOR_NEGRO });
  drawCellText(doc, 'Recomendaciones', tAX + colW, tAY + 5.5, colW, 6.5, { fontStyle: 'bold', fontSize: 8.5, color: COLOR_NEGRO });

  doc.rect(tAX, tAY + 12, colW, contentH, 'S');
  doc.rect(tAX + colW, tAY + 12, colW, contentH, 'S');

  // Conclusiones text
  const rawConc = proto.conclusiones || "Los valores hallados de la medición de la puesta a tierra cumplen con lo establecido en la Resolución 900/15.";
  const concText = rawConc.trim().replace(/^[•\-\*\.\s]+/, '');
  drawCellText(doc, concText, tAX, tAY + 12, colW, contentH, { fontSize: 8.5, valign: 'top', padding: 3 });

  // Recomendaciones text
  const defaultRecomStr = `Es recomendable mantener limpio y libre de óxido las terminales de las jabalinas.\n\n• Inspeccionar periódicamente la continuidad de las masas y conductores de protección.\n• Verificar el correcto funcionamiento periódico de los dispositivos de corte diferencial (disyuntores).\n• Realizar el mantenimiento preventivo según lo establecido en la normativa vigente.`;
  const recomText = proto.recomendaciones || defaultRecomStr;
  drawCellText(doc, recomText, tAX + colW, tAY + 12, colW, contentH, { fontSize: 8, valign: 'top', padding: 3 });

  // Firma Profesional (Alineada abajo a la derecha de la hoja)
  drawSignatureBlock(188, tAY + totalBoxH + 3, 94, 38);

  // ==========================================
  // PUNTOS DE MUESTREO (PLANOS Y CROQUIS CON MARCADORES)
  // ==========================================
  const planoAdjuntos = (adjuntosList || []).filter(adj => 
    adj.tipo === 'Evidencia Fotográfica Plano' ||
    adj.tipo === 'Foto Plano' ||
    adj.tipo === 'Plano' ||
    adj.tipo === 'Croquis' ||
    (adj.markers && adj.markers.length > 0)
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
    setFillColor(doc, COLOR_BLANCO);
    doc.rect(kX, kY, kW, 6, 'FD');
    
    drawCellText(doc, 'Puntos de muestreo', kX, kY, kW, 6, { fontStyle: 'bold', fontSize: 9, align: 'center', color: COLOR_NEGRO });

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
        drawCellText(doc, `[ PUNTOS DE MUESTREO ]`, kX + 10, mY + 14, kW - 20, mH - 20, { align: 'center', fontStyle: 'bold', fontSize: 11, color: COLOR_SLATE_500 });
      }
    } else {
      setDrawColor(doc, COLOR_SLATE_300);
      doc.setLineWidth(0.3);
      doc.rect(kX + 10, mY + 14, kW - 20, mH - 20, 'S');
      drawCellText(doc, `[ PUNTOS DE MUESTREO ]`, kX + 10, mY + 14, kW - 20, mH - 20, { align: 'center', fontStyle: 'bold', fontSize: 11, color: COLOR_SLATE_500 });
    }
  }

  // ==========================================
  // EVIDENCIA FOTOGRÁFICA POR PUNTO DE MEDICIÓN (TOMAS)
  // ==========================================
  const tomaFotos = [];

  // 1. Recopilar desde adjuntosList (con tipo específico "Evidencia Fotográfica Toma N° X")
  (adjuntosList || []).forEach(adj => {
    if (adj.tipo && adj.tipo.startsWith('Evidencia Fotográfica Toma N° ')) {
      const tomaStr = adj.tipo.replace('Evidencia Fotográfica ', '').trim();
      tomaFotos.push({
        title: `Evidencia fotográfica: ${tomaStr}`,
        rawAdj: adj
      });
    } else if (
      adj.tipo !== 'Evidencia Fotográfica Plano' &&
      adj.tipo !== 'Foto Plano' &&
      adj.tipo !== 'Plano' &&
      adj.tipo !== 'Croquis' &&
      adj.tipo !== 'Certificado de Calibración' &&
      adj.tipo !== 'Certificado' &&
      adj.tipo !== 'Certificado de Calibración del Instrumental' &&
      (!adj.markers || adj.markers.length === 0)
    ) {
      let tomaLabel = 'Toma';
      if (adj.tipo && adj.tipo.includes('Toma')) {
        tomaLabel = adj.tipo.replace(/^Evidencia Fotogr[aá]fica\s*/i, '').trim();
      }
      tomaFotos.push({
        title: `Evidencia fotográfica: ${tomaLabel}`,
        rawAdj: adj
      });
    }
  });

  // 2. Recopilar desde puntosList (evidencia_fotografica cargada directamente en cada punto)
  (puntosList || []).forEach((pt, pIdx) => {
    const tNum = pt.toma_tierra_num || pt.orden || (pIdx + 1);
    const evList = Array.isArray(pt.evidencia_fotografica) ? pt.evidencia_fotografica : [];
    evList.forEach(ev => {
      const alreadyIncluded = tomaFotos.some(tf => 
        (ev.id && tf.rawAdj.id === ev.id) ||
        (ev.path && (tf.rawAdj.storage_path === ev.path || tf.rawAdj.path === ev.path)) ||
        (ev.storage_path && (tf.rawAdj.storage_path === ev.storage_path || tf.rawAdj.path === ev.storage_path))
      );
      if (!alreadyIncluded) {
        tomaFotos.push({
          title: `Evidencia fotográfica: Toma N° ${tNum}`,
          rawAdj: ev
        });
      }
    });
  });

  for (let tIdx = 0; tIdx < tomaFotos.length; tIdx++) {
    const tItem = tomaFotos[tIdx];

    doc.addPage('a4', 'landscape');
    pageCounter++;

    drawHeader(true);
    drawProtocolTitleBar(true, { x: 15, y: 22, w: 267, h: 5.5 });

    const kX = 15;
    const kY = 29;
    const kW = 267;

    doc.setLineWidth(0.45);
    setDrawColor(doc, COLOR_NEGRO);
    setFillColor(doc, COLOR_BLANCO);
    doc.rect(kX, kY, kW, 6, 'FD');
    
    drawCellText(doc, tItem.title, kX, kY, kW, 6, { fontStyle: 'bold', fontSize: 9, align: 'center', color: COLOR_NEGRO });

    const mY = 37;
    const mH = 150;
    doc.rect(kX, mY, kW, mH, 'S');

    let finalBase64 = '';
    if (tItem.rawAdj) {
      try {
        const rawBase64 = await getAdjuntoBase64(tItem.rawAdj);
        if (rawBase64) {
          const resized = await resizeImageForPdf(rawBase64, 1200, 1200);
          finalBase64 = resized || rawBase64;
        }
      } catch (err) {
        console.error('Error al procesar base64 de evidencia:', err);
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
        console.error('Error al insertar imagen de evidencia en PDF:', err);
        setDrawColor(doc, COLOR_SLATE_300);
        doc.setLineWidth(0.3);
        doc.rect(kX + 10, mY + 14, kW - 20, mH - 20, 'S');
        drawCellText(doc, `[ ${tItem.title.toUpperCase()} ]`, kX + 10, mY + 14, kW - 20, mH - 20, { align: 'center', fontStyle: 'bold', fontSize: 11, color: COLOR_SLATE_500 });
      }
    } else {
      setDrawColor(doc, COLOR_SLATE_300);
      doc.setLineWidth(0.3);
      doc.rect(kX + 10, mY + 14, kW - 20, mH - 20, 'S');
      drawCellText(doc, `[ ${tItem.title.toUpperCase()} ]`, kX + 10, mY + 14, kW - 20, mH - 20, { align: 'center', fontStyle: 'bold', fontSize: 11, color: COLOR_SLATE_500 });
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
            const bucketsToTry = ['protocolos-puesta-a-tierra', 'protocolos-ruido', 'documents'];
            for (const b of bucketsToTry) {
              const { data: blob } = await supabase.storage.from(b).download(path);
              if (blob) {
                certPdfArrayBuffer = await blob.arrayBuffer();
                break;
              }
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

  // ==========================================
  // PAGINAS FINALES: ANEXO MATRÍCULAS / CREDENCIALES PROFESIONALES
  // ==========================================
  const shouldIncludeMatricula = proto.incluir_matricula_pdf !== false && !((proto.documentacion_adjunta || proto.observaciones || '').includes('[NO_MATRICULA_PDF]'));
  if (shouldIncludeMatricula) {
    try {
      const profMatriculas = await fetchProfessionalMatriculasWithImages({
        profNombre,
        profMatricula,
        userProfile,
        tenantId: tenant?.id,
        profesionalId: proto.profesional_id
      });
      if (profMatriculas.length > 0) {
        renderMatriculasAnexoPages(doc, {
          matriculas: profMatriculas,
          profNombre,
          drawHeader,
          drawProtocolTitleBar
        });
      }
    } catch (mAnexoErr) {
      console.warn('[PDF PAT] Error renderizando anexo de matrículas:', mAnexoErr);
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
        link.download = filename || 'Protocolo_Puesta_A_Tierra.pdf';
        link.click();
      };
    } catch (mergeErr) {
      console.error('Error al fusionar certificado PDF con pdf-lib:', mergeErr);
    }
  }

  return doc;
};

export const generateNoiseProtocolPdf = generatePuestaATierraPdf;
