import { formatDate } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

// Helper to convert hex color string to RGB array [r, g, b]
const hexToRgb = (hex) => {
  if (!hex || typeof hex !== 'string') return [0, 0, 0];
  let c = hex.replace('#', '').trim();
  if (c.length === 3) c = c.split('').map(x => x + x).join('');
  const num = parseInt(c, 16);
  if (isNaN(num)) return [0, 0, 0];
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
};

// Safe color setter helpers for jsPDF (guarantees RGB integers, preventing black solid fills)
const setFillColor = (docInst, hex) => {
  const [r, g, b] = hexToRgb(hex);
  docInst.setFillColor(r, g, b);
};

const setDrawColor = (docInst, hex) => {
  const [r, g, b] = hexToRgb(hex);
  docInst.setDrawColor(r, g, b);
};

const setTextColor = (docInst, hex) => {
  const [r, g, b] = hexToRgb(hex);
  docInst.setTextColor(r, g, b);
};

// Helper to convert image URL to base64
const getBase64ImageFromUrl = async (imageUrl) => {
  if (!imageUrl) return '';
  if (imageUrl.startsWith('data:')) return imageUrl;
  try {
    const res = await fetch(imageUrl);
    if (!res.ok) {
      console.warn(`[getBase64ImageFromUrl] No se pudo descargar la imagen (${res.status}): ${imageUrl}`);
      return '';
    }
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.addEventListener("load", () => {
        resolve(reader.result);
      }, false);
      reader.addEventListener("error", () => {
        resolve('');
      }, false);
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.error('Error fetching image to base64:', e);
    return '';
  }
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

export const generateLightingProtocolPdf = async (
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

  // Download Header Logo (Tenant or Default)
  let logoBase64 = '';
  try {
    if (tenant && tenant.logo_1_url) {
      logoBase64 = await getBase64ImageFromUrl(tenant.logo_1_url);
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
    // Logo
    drawHeaderLogo(isLandscape);

    // Right Header Text (Normative Protocol Title & Client Name)
    const rightX = isLandscape ? 280 : 195;
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    setTextColor(doc, COLOR_AZUL_PRINCIPAL);
    doc.text('ANEXO - RESOLUCIÓN 84 / 2012 (PROTOCOLO DE ILUMINACIÓN)', rightX, 11, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    setTextColor(doc, COLOR_SLATE_700);
    const clientText = String(razonSocial || '').toUpperCase();
    const maxClientWidth = isLandscape ? 200 : 120;
    const clientLines = doc.splitTextToSize(clientText, maxClientWidth);
    doc.text(clientLines[0], rightX, 16, { align: 'right' });

    // Divider line
    const startX = isLandscape ? 17 : 15;
    const endX = isLandscape ? 280 : 195;
    setDrawColor(doc, COLOR_SLATE_300);
    doc.setLineWidth(0.3);
    doc.line(startX, 23, endX, 23);
  };

  // Helper: Footer across all inner pages
  const drawFooter = (isLandscape = false, pageNum = 1, totalPages = 1) => {
    const startX = isLandscape ? 15 : 15;
    const endX = isLandscape ? 282 : 195;
    const barY = isLandscape ? 196 : 281;
    const textY = isLandscape ? 200.5 : 285.5;
    const subFooterY = isLandscape ? 204.5 : 289.5;
    const totalW = endX - startX;

    // Accent Blue Bar
    setFillColor(doc, COLOR_AZUL_PRINCIPAL);
    doc.rect(startX, barY, totalW, 0.8, 'F');

    // Contact Info Line Centered
    const contactText = `${companyName}  •  Tel: ${phoneVal}  •  Email: ${emailVal}`;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    setTextColor(doc, COLOR_SLATE_700);
    doc.text(contactText, startX + (totalW / 2), textY, { align: 'center' });

    // Sub-footer: Page count right
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    setTextColor(doc, COLOR_SLATE_600);
    doc.text(`Página ${pageNum} de ${totalPages}`, endX, subFooterY, { align: 'right' });
  };

  // Helper: Protocol Bar Title
  const drawProtocolTitleBar = (isLandscape = false, customPos = null) => {
    const pos = customPos || (isLandscape ? { x: 17, y: 26, w: 263, h: 5.5 } : { x: 15, y: 26, w: 180, h: 5.5 });
    setFillColor(doc, COLOR_AZUL_PRINCIPAL);
    doc.rect(pos.x, pos.y, pos.w, pos.h, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    setTextColor(doc, COLOR_BLANCO);
    const textY = pos.y + (pos.h / 2) + 1.1;
    doc.text('PROTOCOLO PARA MEDICIÓN DE ILUMINACIÓN EN EL AMBIENTE LABORAL', pos.x + (pos.w / 2), textY, { align: 'center' });
  };

  // Helper: Signature Block
  const drawSignatureBlock = (x, y, w, h) => {
    const imgMaxW = w - 4;
    const imgMaxH = 28;

    // 1. Signature image (rendered larger, allowed to overlap line/text as transparent PNG)
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
        const lineY = y + 21;
        const renderY = lineY - (renderH * 0.70);

        doc.addImage(signatureBase64, 'PNG', renderX, renderY, renderW, renderH, undefined, 'FAST');
      } catch (e) {
        console.error('Error drawing signature image:', e);
      }
    }

    // 2. Dotted line
    const lineY = y + 21;
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
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    setTextColor(doc, COLOR_NEGRO);
    const midX = x + (width / 2);
    // Numerator
    doc.text(String(topText), midX, y + (height * 0.38), { align: 'center' });
    // Line
    setDrawColor(doc, COLOR_NEGRO);
    doc.setLineWidth(0.25);
    doc.line(x + 2, y + (height * 0.52), x + width - 2, y + (height * 0.52));
    // Denominator
    doc.text(String(bottomText), midX, y + (height * 0.88), { align: 'center' });
  };

  // Safe data getters
  const razonSocial = proto.razon_social_text || emp?.razon_social || 'SUPEH TURISMO-HOTEL 8 DE OCTUBRE';
  const cuit = proto.cuit_text || emp?.cuit || '30-68308043-4';
  const direccion = proto.direccion_text || est?.direccion || 'PARAGUAY N°1420';
  const localidad = proto.localidad_text || est?.localidad || 'CABA';
  const provincia = proto.provincia_text || est?.provincia || 'BUENOS AIRES';
  const cp = proto.cp_text || est?.cp || '1061';
  const horarios = proto.horarios_turnos_text || '24hs';
  const marcaModeloNser = proto.instrumento_marca_modelo_serie || 'Luxómetro marca Amprobe, modelo LM 100, N° de serie 12093081';
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
  doc.setFontSize(32);
  setTextColor(doc, COLOR_AZUL_PRINCIPAL);
  const titleLines = doc.splitTextToSize('Protocolo de medición de iluminación en el ambiente laboral', 145);
  doc.text(titleLines, 39, 172);

  // Normative reference
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  setTextColor(doc, COLOR_SLATE_600);
  doc.text('DECRETO Nº 351/79, ANEXO IV - CAPÍTULO 12 - ILUMINACIÓN Y COLOR', 39, 222);
  doc.text('ANEXO - RESOLUCIÓN 84 / 2012 (PROTOCOLO DE ILUMINACIÓN)', 39, 228);

  // Brand / Consultora
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  setTextColor(doc, COLOR_SLATE_900);
  doc.text(companyName.toUpperCase(), 39, 246);

  // ==========================================
  // PAGINA 2: INTRODUCCIÓN NORMATIVA (A4 Vertical)
  // ==========================================
  doc.addPage('a4', 'portrait');
  pageCounter++;

  drawHeader(false);

  // Section Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  setTextColor(doc, COLOR_AZUL_PRINCIPAL);
  doc.text('Iluminación y Color (ANEXO IV - Capítulo 12 – Dec. 351/79)', 15, 33);
  setDrawColor(doc, COLOR_AZUL_PRINCIPAL);
  doc.setLineWidth(0.4);
  doc.line(15, 35, 195, 35);

  // Body Text
  const introParagraphs = [
    {
      text: "La intensidad mínima de iluminación, medida sobre el plano de trabajo, ya sea este horizontal, vertical u oblicuo, está establecida en la tabla 1, de acuerdo con la dificultad de la tarea visual y en la tabla 2, de acuerdo con el destino del local.",
      style: 'normal'
    },
    {
      text: "Los valores indicados en la tabla 1, se usarán para estimar los requeridos para tareas que no han sido incluidas en la tabla 2.",
      style: 'normal'
    },
    {
      text: "Con el objeto de evitar diferencias de iluminancias causantes de incomodidad visual o deslumbramiento, se deberán mantener las relaciones máximas indicadas en la tabla 3.",
      style: 'normal'
    },
    {
      text: "La tarea visual se sitúa en el centro del campo visual y abarca un cono cuyo ángulo de abertura es de un grado, estando el vértice del mismo en el ojo del trabajador.",
      style: 'normal'
    },
    {
      text: "Para asegurar una uniformidad razonable en la iluminancia de un local, se exigirá una relación no menor de 0,5 entre sus valores mínimo y medio.",
      style: 'normal'
    },
    {
      text: "E mínima >= E media / 2",
      style: 'formula'
    },
    {
      text: "* E = Exigencia",
      style: 'legend'
    },
    {
      text: "La iluminancia media se determinará efectuando la media aritmética de la iluminancia general considerada en todo el local, y la iluminancia mínima será el menor valor de iluminancia en las superficies de trabajo o en un plano horizontal a 0,80 m. del suelo. Este procedimiento no se aplicará a lugares de tránsito, de ingreso o egreso de personal o iluminación de emergencia",
      style: 'normal'
    },
    {
      text: "En los casos en que se ilumine en forma localizada uno o varios lugares de trabajo para completar la iluminación general, esta última no podrá tener una intensidad menor que la indicada en la tabla 4.",
      style: 'normal'
    }
  ];

  let currentY = 43;
  introParagraphs.forEach(p => {
    if (p.style === 'formula') {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      setTextColor(doc, COLOR_AZUL_PRINCIPAL);
      doc.text(p.text, 25, currentY);
      currentY += 6;
    } else if (p.style === 'legend') {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      setTextColor(doc, COLOR_SLATE_600);
      doc.text(p.text, 25, currentY);
      currentY += 7;
    } else {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      setTextColor(doc, COLOR_SLATE_900);
      const lines = doc.splitTextToSize(p.text, 180);
      doc.text(lines, 15, currentY);
      currentY += (lines.length * 4.2) + 4.5;
    }
  });

  // ==========================================
  // PAGINA 3: DATOS DEL ESTABLECIMIENTO Y MEDICIÓN (A4 Vertical)
  // ==========================================
  doc.addPage('a4', 'portrait');
  pageCounter++;

  drawHeader(false);
  drawProtocolTitleBar(false, { x: 15, y: 26, w: 180, h: 5.5 });

  // Tabla 1: Datos del Establecimiento
  const t1X = 15;
  const t1Y = 34;
  const t1W = 180;

  setDrawColor(doc, COLOR_NEGRO);
  doc.setLineWidth(0.45);
  doc.rect(t1X, t1Y, t1W, 90, 'S');

  // Title
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

  // Row: CP / CUIT
  doc.rect(t1X, rY, 50, 6, 'S');
  doc.rect(t1X + 50, rY, 130, 6, 'S');
  drawCellText(doc, 'C.P.:', t1X, rY, 12, 6, { fontStyle: 'bold', fontSize: 8.5 });
  drawCellText(doc, cp, t1X + 12, rY, 38, 6, { fontSize: 8.5 });
  drawCellText(doc, 'C.U.I.T.:', t1X + 50, rY, 20, 6, { fontStyle: 'bold', fontSize: 8.5 });
  drawCellText(doc, cuit, t1X + 70, rY, 110, 6, { fontSize: 8.5 });
  rY += 6;

  // Row: Horarios/Turnos
  doc.rect(t1X, rY, t1W, 54, 'S');
  drawCellText(doc, 'Horarios/Turnos Habituales de Trabajo:', t1X, rY, t1W, 5, { fontStyle: 'bold', fontSize: 8.5 });
  drawCellText(doc, horarios, t1X, rY + 5, t1W, 48, { fontSize: 8.5, valign: 'top' });

  // Tabla 2: Datos de la Medición
  const t2X = 15;
  const t2Y = 127;
  const t2W = 180;

  doc.setLineWidth(0.45);
  doc.rect(t2X, t2Y, t2W, 77, 'S');

  // Title
  setFillColor(doc, COLOR_SLATE_200);
  doc.rect(t2X, t2Y, t2W, 6, 'FD');
  drawCellText(doc, 'Datos de la Medición', t2X, t2Y, t2W, 6, { align: 'center', fontStyle: 'bold', fontSize: 9 });

  rY = t2Y + 6;
  doc.setLineWidth(0.25);

  // Instrumento
  doc.rect(t2X, rY, t2W, 13, 'S');
  drawCellText(doc, 'Marca, modelo y número de serie del instrumento utilizado:', t2X, rY, t2W, 5, { fontStyle: 'bold', fontSize: 8.5 });
  drawCellText(doc, marcaModeloNser, t2X, rY + 5, t2W, 7.5, { fontSize: 8.5 });
  rY += 13;

  // Fecha Calibracion
  doc.rect(t2X, rY, t2W, 6, 'S');
  drawCellText(doc, 'Fecha de Calibración del Instrumental utilizado en la medición:', t2X, rY, 105, 6, { fontStyle: 'bold', fontSize: 8.5 });
  drawCellText(doc, fechaCalib, t2X + 105, rY, 75, 6, { fontSize: 8.5 });
  rY += 6;

  // Metodologia
  doc.rect(t2X, rY, t2W, 6, 'S');
  drawCellText(doc, 'Metodología Utilizada en la Medición:', t2X, rY, 68, 6, { fontStyle: 'bold', fontSize: 8.5 });
  drawCellText(doc, metodologia, t2X + 68, rY, 112, 6, { fontSize: 8.5 });
  rY += 6;

  // Fechas y Horas
  doc.rect(t2X, rY, t2W, 6, 'S');
  drawCellText(doc, 'Fecha de la Medición:', t2X, rY, 36, 6, { fontStyle: 'bold', fontSize: 8.5 });
  drawCellText(doc, fechaMedicion, t2X + 36, rY, 25, 6, { fontSize: 8.5 });
  drawCellText(doc, 'Hora de Inicio:', t2X + 65, rY, 25, 6, { fontStyle: 'bold', fontSize: 8.5 });
  drawCellText(doc, horaInicio, t2X + 90, rY, 20, 6, { fontSize: 8.5 });
  drawCellText(doc, 'Hora de Finalización:', t2X + 115, rY, 35, 6, { fontStyle: 'bold', fontSize: 8.5 });
  drawCellText(doc, horaFin, t2X + 150, rY, 30, 6, { fontSize: 8.5 });
  rY += 6;

  // Condiciones Atmosfericas
  doc.rect(t2X, rY, t2W, 40, 'S');
  drawCellText(doc, 'Condiciones Atmosféricas:', t2X, rY, t2W, 5, { fontStyle: 'bold', fontSize: 8.5 });
  drawCellText(doc, condAtmos, t2X, rY + 5, t2W, 34, { fontSize: 8.5, valign: 'top' });

  // Tabla 3: Documentación Adjunta
  const t3X = 15;
  const t3Y = 207;
  const t3W = 180;

  doc.setLineWidth(0.45);
  doc.rect(t3X, t3Y, t3W, 23, 'S');
  setFillColor(doc, COLOR_SLATE_200);
  doc.rect(t3X, t3Y, t3W, 6, 'FD');
  drawCellText(doc, 'Documentación que se Adjuntará a la Medición', t3X, t3Y, t3W, 6, { align: 'center', fontStyle: 'bold', fontSize: 9 });

  drawCellText(doc, '•  Certificado de Calibración.', t3X + 2, t3Y + 7, t3W, 5, { fontSize: 8.5 });
  drawCellText(doc, '•  Plano o Croquis del establecimiento.', t3X + 2, t3Y + 13, t3W, 5, { fontSize: 8.5 });

  // Tabla 4: Observaciones
  const t4X = 15;
  const t4Y = 233;
  const t4W = 110;
  const t4H = 35;

  doc.setLineWidth(0.45);
  doc.rect(t4X, t4Y, t4W, t4H, 'S');
  drawCellText(doc, 'Observaciones:', t4X, t4Y, t4W, 5, { fontStyle: 'bold', fontSize: 8.5 });
  const obsText = proto.observaciones || 'NA';
  drawCellText(doc, obsText, t4X + 2, t4Y + 5, t4W - 4, t4H - 6, { fontSize: 8.5, valign: 'top' });

  // Firma Profesional (Box independiente de 67mm de ancho alineado a la derecha)
  drawSignatureBlock(128, 233, 67, 35);

  // ==========================================
  // PAGINAS 4 Y 5: TABLA GENERAL DE MEDICIÓN (A4 Apaisado)
  // ==========================================
  const maxRowsPerPage = 12;
  const totalPoints = puntosList.length;
  const totalTablePages = Math.max(2, Math.ceil(totalPoints / maxRowsPerPage));

  for (let pIdx = 0; pIdx < totalTablePages; pIdx++) {
    doc.addPage('a4', 'landscape');
    pageCounter++;

    drawHeader(true);
    drawProtocolTitleBar(true, { x: 17, y: 26, w: 263, h: 5.5 });

    // Encabezado Establecimiento
    const eX = 17;
    const eY = 33;
    const eW = 263;

    doc.setLineWidth(0.45);
    setDrawColor(doc, COLOR_NEGRO);
    doc.rect(eX, eY, eW, 14, 'S');
    doc.setLineWidth(0.25);
    doc.rect(eX, eY, eW, 7, 'S');

    drawCellText(doc, 'Razón Social:', eX, eY, 22, 7, { fontStyle: 'bold', fontSize: 8 });
    drawCellText(doc, razonSocial, eX + 22, eY, 138, 7, { fontSize: 8 });
    drawCellText(doc, 'C.U.I.T.:', eX + 160, eY, 18, 7, { fontStyle: 'bold', fontSize: 8 });
    drawCellText(doc, cuit, eX + 178, eY, 85, 7, { fontSize: 8 });

    drawCellText(doc, 'Dirección:', eX, eY + 7, 18, 7, { fontStyle: 'bold', fontSize: 8 });
    drawCellText(doc, direccion, eX + 18, eY + 7, 117, 7, { fontSize: 8 });
    drawCellText(doc, 'Localidad:', eX + 135, eY + 7, 18, 7, { fontStyle: 'bold', fontSize: 8 });
    drawCellText(doc, localidad, eX + 153, eY + 7, 37, 7, { fontSize: 8 });
    drawCellText(doc, 'C.P.:', eX + 190, eY + 7, 10, 7, { fontStyle: 'bold', fontSize: 8 });
    drawCellText(doc, cp, eX + 200, eY + 7, 15, 7, { fontSize: 8 });
    drawCellText(doc, 'Provincia:', eX + 215, eY + 7, 16, 7, { fontStyle: 'bold', fontSize: 8 });
    drawCellText(doc, provincia, eX + 231, eY + 7, 32, 7, { fontSize: 8 });

    // Tabla de Datos Apaisada
    const gX = 17;
    const gY = 49;
    const gW = 263;

    doc.setLineWidth(0.45);
    doc.rect(gX, gY, gW, 95, 'S');

    // Title Header "Datos de la Medición"
    setFillColor(doc, COLOR_SLATE_200);
    doc.rect(gX, gY, gW, 6, 'FD');
    drawCellText(doc, 'Datos de la Medición', gX, gY, gW, 6, { align: 'center', fontStyle: 'bold', fontSize: 9, color: COLOR_NEGRO });

    // Columns Definition
    const cols = [
      { key: 'punto', name: 'Punto de Muestreo', w: 17 },
      { key: 'hora', name: 'Hora', w: 13.6 },
      { key: 'sector', name: 'Sector', w: 42 },
      { key: 'puesto', name: 'Sección / Puesto / Puesto Tipo', w: 42 },
      { key: 'tipo_ilum', name: 'Tipo de Iluminación: Natural / Artificial / Mixta', w: 20.5 },
      { key: 'fuente', name: 'Tipo de Fuente Lumínica: Incandescente / Descarga / Mixta / Led', w: 23 },
      { key: 'iluminacion', name: 'Iluminación: General / Localizada / Mixta', w: 27.5 },
      { key: 'uniformidad', name: 'Valor de la uniformidad de Iluminancia E mínima ≥ (E media)/2', w: 29.5 },
      { key: 'valor_medido', name: 'Valor Medido (Lux)', w: 23 },
      { key: 'valor_req', name: 'Valor requerido legalmente Según Anexo IV Dec. 351/79', w: 25 }
    ];

    let currX = gX;
    const colHeaderY = gY + 6;
    const colHeaderH = 14;

    // Render Column Headers with soft gray fill and crisp black text
    cols.forEach(c => {
      setFillColor(doc, COLOR_SLATE_200);
      doc.rect(currX, colHeaderY, c.w, colHeaderH, 'FD');
      drawCellText(doc, c.name, currX, colHeaderY, c.w, colHeaderH, { align: 'center', fontStyle: 'bold', fontSize: 7, color: COLOR_NEGRO, maxLines: 4 });
      currX += c.w;
    });

    const rowStartY = colHeaderY + colHeaderH;
    const rowH = 5.2;

    const startSlice = pIdx * maxRowsPerPage;
    const endSlice = startSlice + maxRowsPerPage;
    const pagePuntos = puntosList.slice(startSlice, endSlice);

    for (let r = 0; r < maxRowsPerPage; r++) {
      const rowY = rowStartY + (r * rowH);
      const pt = pagePuntos[r];

      currX = gX;

      if (!pt) {
        // Empty row with background fill
        cols.forEach(c => {
          setFillColor(doc, COLOR_SLATE_50);
          doc.rect(currX, rowY, c.w, rowH, 'FD');
          drawCellText(doc, '-', currX, rowY, c.w, rowH, { align: 'center', fontSize: 7.5, color: COLOR_SLATE_500 });
          currX += c.w;
        });
      } else {
        const validVals = (pt.mediciones || [])
          .map(m => parseFloat(m.valor_lux))
          .filter(val => !isNaN(val));

        let avgLux = 0;
        let minLux = 0;
        if (validVals.length > 0) {
          avgLux = validVals.reduce((a, b) => a + b, 0) / validVals.length;
          minLux = Math.min(...validVals);
        }

        const reqLux = parseFloat(pt.valor_requerido_legal_lux) || 0;
        const uniformidadLimit = avgLux / 2;

        const cumpleUniformidad = validVals.length > 0 ? (minLux >= uniformidadLimit) : true;
        const cumpleMedido = validVals.length > 0 ? (avgLux >= reqLux) : true;

        const rowValues = {
          punto: String(pt.punto_muestreo),
          hora: pt.hora || horaInicio,
          sector: pt.sector_text || pt.sector || '-',
          puesto: pt.puesto_text || pt.puesto || '-',
          tipo_ilum: pt.tipo_iluminacion || 'Artificial',
          fuente: pt.tipo_fuente_luminica || 'Led',
          iluminacion: pt.iluminacion || 'General',
          uniformidad: cumpleUniformidad ? 'Cumple' : 'No cumple',
          valor_medido: validVals.length > 0 ? Math.round(avgLux) + ' Lux' : '-',
          valor_req: reqLux > 0 ? reqLux + ' Lux' : '-'
        };

        cols.forEach(c => {
          setDrawColor(doc, COLOR_NEGRO);
          doc.rect(currX, rowY, c.w, rowH, 'S');
          const valText = rowValues[c.key] || '-';
          let isFail = false;

          if (c.key === 'uniformidad' && valText === 'No cumple') isFail = true;
          if (c.key === 'valor_medido' && !cumpleMedido) isFail = true;

          drawCellText(doc, valText, currX, rowY, c.w, rowH, {
            align: 'center',
            fontSize: 7.5,
            fontStyle: isFail ? 'bold' : 'normal',
            color: isFail ? COLOR_ROJO_NO_CUMPLE : COLOR_NEGRO,
            maxLines: 1
          });

          currX += c.w;
        });
      }
    }

    // Fila Observaciones
    const obsY = gY + 81;
    setDrawColor(doc, COLOR_NEGRO);
    doc.rect(gX, obsY, gW, 14, 'S');
    drawCellText(doc, 'Observaciones:', gX, obsY, 26, 14, { fontStyle: 'bold', fontSize: 8.5 });
    drawCellText(doc, proto.observaciones || 'N/A', gX + 26, obsY, gW - 26, 14, { fontSize: 8.5, valign: 'top' });

    // Firma
    drawSignatureBlock(190, 146, 75, 30);
  }

  // ==========================================
  // PAGINA 6: ANÁLISIS Y MEJORAS (A4 Apaisado)
  // ==========================================
  doc.addPage('a4', 'landscape');
  pageCounter++;

  drawHeader(true);
  drawProtocolTitleBar(true, { x: 18, y: 26, w: 263, h: 5.5 });

  // Encabezado Establecimiento
  const aX = 18;
  const aY = 33;
  const aW = 263;

  doc.setLineWidth(0.45);
  setDrawColor(doc, COLOR_NEGRO);
  doc.rect(aX, aY, aW, 14, 'S');
  drawCellText(doc, 'Razón Social:', aX, aY, 22, 7, { fontStyle: 'bold', fontSize: 8 });
  drawCellText(doc, razonSocial, aX + 22, aY, 138, 7, { fontSize: 8 });
  drawCellText(doc, 'C.U.I.T.:', aX + 160, aY, 18, 7, { fontStyle: 'bold', fontSize: 8 });
  drawCellText(doc, cuit, aX + 178, aY, 85, 7, { fontSize: 8 });

  drawCellText(doc, 'Dirección:', aX, aY + 7, 18, 7, { fontStyle: 'bold', fontSize: 8 });
  drawCellText(doc, direccion, aX + 18, aY + 7, 117, 7, { fontSize: 8 });
  drawCellText(doc, 'Localidad:', aX + 135, aY + 7, 18, 7, { fontStyle: 'bold', fontSize: 8 });
  drawCellText(doc, localidad, aX + 153, aY + 7, 37, 7, { fontSize: 8 });

  // Tabla Análisis
  const tAX = 18;
  const tAY = 49;
  const tAW = 263;

  doc.setLineWidth(0.45);
  doc.rect(tAX, tAY, tAW, 118, 'S');

  // Title
  setFillColor(doc, COLOR_SLATE_200);
  doc.rect(tAX, tAY, tAW, 6, 'FD');
  drawCellText(doc, 'Análisis de los Datos y Mejoras a Realizar', tAX, tAY, tAW, 6, { align: 'center', fontStyle: 'bold', fontSize: 9, color: COLOR_NEGRO });

  // 2 Columns
  const colW = tAW / 2;
  doc.rect(tAX, tAY + 6, colW, 8, 'FD');
  doc.rect(tAX + colW, tAY + 6, colW, 8, 'FD');

  drawCellText(doc, 'Conclusiones.', tAX, tAY + 6, colW, 8, { fontStyle: 'bold', fontSize: 8.5 });
  drawCellText(doc, 'Recomendaciones para adecuar el nivel de iluminación a la legislación vigente.', tAX + colW, tAY + 6, colW, 8, { fontStyle: 'bold', fontSize: 8.5 });

  doc.rect(tAX, tAY + 14, colW, 104, 'S');
  doc.rect(tAX + colW, tAY + 14, colW, 104, 'S');

  // Conclusiones text
  const concText = proto.conclusiones || "Indicar puntos que no cumplen valores mínimos de iluminación y puntos que no cumplen relación de uniformidad.";
  drawCellText(doc, concText, tAX, tAY + 14, colW, 104, { fontSize: 8.5, valign: 'top' });

  // Recomendaciones text
  const defaultRecom = [
    "Limpiar y reparar luminarias defectuosas.",
    "Implementar plan de mantenimiento preventivo.",
    "Bajar la altura de luminarias instaladas si corresponde.",
    "Incorporar nuevas luminarias.",
    "Agregar iluminación localizada en puestos fijos si corresponde."
  ];

  let recomItems = [];
  if (proto.recomendaciones) {
    recomItems = proto.recomendaciones.split('\n').filter(Boolean);
  } else {
    recomItems = defaultRecom;
  }

  let recY = tAY + 16;
  recomItems.forEach(item => {
    const cleanItem = item.replace(/^[•\-\*\s]+/, '');
    const fullItem = `•  ${cleanItem}`;
    const lines = doc.splitTextToSize(fullItem, colW - 4);
    drawCellText(doc, fullItem, tAX + colW, recY, colW, (lines.length * 4), { fontSize: 8.5, valign: 'top' });
    recY += (lines.length * 4) + 2;
  });

  // Firma
  drawSignatureBlock(185, 146, 78, 30);

  // ==========================================
  // PAGINAS 7 A N: FICHAS DE CÁLCULO POR PUNTO DE MUESTREO (A4 Vertical)
  // ==========================================
  puntosList.forEach((pt, pIndex) => {
    doc.addPage('a4', 'portrait');
    pageCounter++;

    drawHeader(false);
    drawProtocolTitleBar(false, { x: 16, y: 26, w: 175, h: 5.5 });

    const puntoNum = pt.punto_muestreo || (pIndex + 1);
    const sectorStr = pt.sector_text || pt.sector || 'SUBSUELO';
    const puestoStr = pt.puesto_text || pt.puesto || 'COCINA';

    const largoM = parseFloat(pt.largo_m) || 0;
    const anchoM = parseFloat(pt.ancho_m) || 0;
    const alturaM = parseFloat(pt.altura_m) || 0;
    const reqLuxLegal = parseFloat(pt.valor_requerido_legal_lux) || 300;

    let indiceDec = 0;
    let indiceCorregido = 0;
    let ptosMinimos = 0;
    if (largoM > 0 && anchoM > 0 && alturaM > 0) {
      const rawI = (largoM * anchoM) / (alturaM * (largoM + anchoM));
      indiceDec = rawI;
      indiceCorregido = Math.round(rawI);
      if (rawI < 1) indiceCorregido = 1;
      const xVal = rawI >= 3 ? 4 : Math.ceil(rawI);
      ptosMinimos = Math.pow(xVal + 2, 2);
    }

    const validVals = (pt.mediciones || [])
      .map(m => parseFloat(m.valor_lux))
      .filter(val => !isNaN(val));

    const sumLux = validVals.reduce((a, b) => a + b, 0);
    const countLux = validVals.length;
    const iluminanciaMedia = countLux > 0 ? (sumLux / countLux) : 0;
    const menorValorMedido = countLux > 0 ? Math.min(...validVals) : 0;
    const uniformidadLimit = iluminanciaMedia / 2;

    const cumpleIluminancia = iluminanciaMedia >= reqLuxLegal;
    const cumpleUniformidad = countLux > 0 ? (menorValorMedido >= uniformidadLimit) : true;

    // Tabla Identificación Punto
    const ptX = 16;
    const ptY = 33;
    const ptW = 175;

    doc.setLineWidth(0.45);
    setDrawColor(doc, COLOR_NEGRO);
    doc.rect(ptX, ptY, ptW, 20, 'S');

    setFillColor(doc, COLOR_SLATE_200);
    doc.rect(ptX, ptY, 75, 8, 'FD');
    drawCellText(doc, `PUNTO DE MUESTREO ${puntoNum}`, ptX, ptY, 75, 8, { align: 'center', fontStyle: 'bold', fontSize: 9, color: COLOR_NEGRO });

    doc.rect(ptX + 75, ptY, 50, 8, 'S');
    drawCellText(doc, sectorStr, ptX + 75, ptY, 50, 8, { align: 'center', fontSize: 8.5 });

    doc.rect(ptX + 125, ptY, 7, 8, 'S');
    drawCellText(doc, '-', ptX + 125, ptY, 7, 8, { align: 'center', fontSize: 8.5 });

    doc.rect(ptX + 132, ptY, 43, 8, 'S');
    drawCellText(doc, puestoStr, ptX + 132, ptY, 43, 8, { align: 'center', fontSize: 8.5 });

    // Formula Índice
    doc.rect(ptX, ptY + 8, 75, 12, 'S');
    drawCellText(doc, 'Índice', ptX, ptY + 8, 75, 12, { fontSize: 8.5 });

    doc.rect(ptX + 75, ptY + 8, 100, 12, 'S');
    drawFraction('Largo  x  Ancho', 'Altura  x  ( Largo + Ancho )', ptX + 75, ptY + 8, 100, 12);

    // Tabla Datos Dimensión Local
    const dX = 16;
    const dY = 55;
    const dW = 175;

    doc.rect(dX, dY, dW, 25, 'S');
    setFillColor(doc, COLOR_SLATE_200);
    doc.rect(dX, dY, 75, 6, 'FD');
    doc.rect(dX + 75, dY, 100, 6, 'FD');
    drawCellText(doc, 'DATOS', dX, dY, 75, 6, { align: 'center', fontStyle: 'bold', fontSize: 8.5, color: COLOR_NEGRO });

    const dimRows = [
      { label: 'Largo ( en metros )', val: largoM > 0 ? largoM.toFixed(2) : '' },
      { label: 'Ancho ( en metros)', val: anchoM > 0 ? anchoM.toFixed(2) : '' },
      { label: 'Altura ( en metros)', val: alturaM > 0 ? alturaM.toFixed(2) : '' }
    ];

    let dimY = dY + 6;
    dimRows.forEach(r => {
      doc.rect(dX, dimY, 75, 6.3, 'S');
      doc.rect(dX + 75, dimY, 100, 6.3, 'S');
      drawCellText(doc, r.label, dX, dimY, 75, 6.3, { fontSize: 8.5 });
      drawCellText(doc, r.val, dX + 75, dimY, 100, 6.3, { align: 'center', fontStyle: 'bold', fontSize: 8.5 });
      dimY += 6.3;
    });

    // Bloques Cálculo Índice
    const bX = 16;
    let bY = 83;

    // Item 1: Indice Local I (fraccion)
    doc.rect(bX, bY, 75, 12, 'S');
    setFillColor(doc, COLOR_SLATE_200); doc.rect(bX, bY, 75, 12, 'FD');
    drawCellText(doc, 'Índice de Local “ I “', bX, bY, 75, 12, { fontSize: 8.5, color: COLOR_NEGRO });

    doc.rect(bX + 75, bY, 100, 12, 'S');
    if (largoM > 0 && anchoM > 0 && alturaM > 0) {
      drawFraction(`${largoM} x ${anchoM}`, `${alturaM} x (${largoM} + ${anchoM})`, bX + 75, bY, 100, 12);
    }
    bY += 14;

    // Item 2: Indice Local I (decimal)
    doc.rect(bX, bY, 75, 6, 'S');
    setFillColor(doc, COLOR_SLATE_200); doc.rect(bX, bY, 75, 6, 'FD');
    drawCellText(doc, 'Índice de Local “ I “', bX, bY, 75, 6, { fontSize: 8.5, color: COLOR_NEGRO });

    doc.rect(bX + 75, bY, 100, 6, 'S');
    drawCellText(doc, indiceDec > 0 ? indiceDec.toFixed(2) : '', bX + 75, bY, 100, 6, { align: 'center', fontStyle: 'bold', fontSize: 8.5 });
    bY += 8;

    // Item 3: Indice Corregido
    doc.rect(bX, bY, 75, 6, 'S');
    setFillColor(doc, COLOR_SLATE_200); doc.rect(bX, bY, 75, 6, 'FD');
    drawCellText(doc, 'Índice de Local Corregido “ I “', bX, bY, 75, 6, { fontSize: 8.5, color: COLOR_NEGRO });

    doc.rect(bX + 75, bY, 100, 6, 'S');
    drawCellText(doc, indiceCorregido > 0 ? String(indiceCorregido) : '', bX + 75, bY, 100, 6, { align: 'center', fontStyle: 'bold', fontSize: 8.5 });
    bY += 8;

    // Item 4: Numero Minimo Puntos Formula
    doc.rect(bX, bY, 75, 6, 'S');
    setFillColor(doc, COLOR_SLATE_200); doc.rect(bX, bY, 75, 6, 'FD');
    drawCellText(doc, 'Número Mínimo de Puntos de Medición', bX, bY, 75, 6, { fontSize: 8.5, color: COLOR_NEGRO });

    doc.rect(bX + 75, bY, 100, 6, 'S');
    drawCellText(doc, '( I + 2 )²', bX + 75, bY, 100, 6, { align: 'center', fontStyle: 'bold', fontSize: 8.5 });
    bY += 8;

    // Item 5: Numero Minimo Puntos Resultado
    doc.rect(bX, bY, 75, 6, 'S');
    setFillColor(doc, COLOR_SLATE_200); doc.rect(bX, bY, 75, 6, 'FD');
    drawCellText(doc, 'Número Mínimo de Puntos de Medición', bX, bY, 75, 6, { fontSize: 8.5, color: COLOR_NEGRO });

    doc.rect(bX + 75, bY, 100, 6, 'S');
    drawCellText(doc, ptosMinimos > 0 ? String(ptosMinimos) : '', bX + 75, bY, 100, 6, { align: 'center', fontStyle: 'bold', fontSize: 8.5 });

    // Bloque Iluminancia Media
    const iX = 16;
    let iY = 135;

    doc.rect(iX, iY, 75, 14, 'S');
    setFillColor(doc, COLOR_SLATE_200); doc.rect(iX, iY, 75, 14, 'FD');
    drawCellText(doc, 'Iluminancia Media', iX, iY, 75, 14, { fontSize: 8.5, color: COLOR_NEGRO });

    doc.rect(iX + 75, iY, 100, 14, 'S');
    drawFraction('Σ Valores Puntos de Medición', 'Cantidad Puntos de Medición', iX + 75, iY, 100, 14);
    iY += 15;

    // Matrix Values Lux
    const mRows = 5;
    const mCols = 9;
    const cellW = 11.1;
    const cellH = 5.2;

    doc.rect(iX, iY, 75, mRows * cellH, 'S');
    setFillColor(doc, COLOR_SLATE_200); doc.rect(iX, iY, 75, mRows * cellH, 'FD');
    drawCellText(doc, 'Iluminancia Media', iX, iY, 75, mRows * cellH, { fontSize: 8.5, color: COLOR_NEGRO });

    let mX = iX + 75;
    for (let r = 0; r < mRows; r++) {
      for (let c = 0; c < mCols; c++) {
        const cellIdx = (r * mCols) + c;
        const valLux = validVals[cellIdx];
        const cx = mX + (c * cellW);
        const cy = iY + (r * cellH);

        if (valLux !== undefined) {
          setDrawColor(doc, COLOR_NEGRO);
          doc.rect(cx, cy, cellW, cellH, 'S');
          drawCellText(doc, String(valLux), cx, cy, cellW, cellH, { align: 'center', fontSize: 7.5 });
        } else {
          setFillColor(doc, COLOR_SLATE_50);
          doc.rect(cx, cy, cellW, cellH, 'FD');
        }
      }
    }
    iY += (mRows * cellH) + 1;

    // Formula Suma / N
    doc.rect(iX, iY, 75, 12, 'S');
    setFillColor(doc, COLOR_SLATE_200); doc.rect(iX, iY, 75, 12, 'FD');
    drawCellText(doc, 'Iluminancia Media', iX, iY, 75, 12, { fontSize: 8.5, color: COLOR_NEGRO });

    doc.rect(iX + 75, iY, 100, 12, 'S');
    if (countLux > 0) {
      drawFraction(String(sumLux), String(countLux), iX + 75, iY, 100, 12);
    }
    iY += 13;

    // Iluminancia Media Obtenida
    doc.rect(iX, iY, 75, 6, 'S');
    setFillColor(doc, COLOR_SLATE_200); doc.rect(iX, iY, 75, 6, 'FD');
    drawCellText(doc, 'Iluminancia Media Obtenida', iX, iY, 75, 6, { fontSize: 8.5, color: COLOR_NEGRO });

    doc.rect(iX + 75, iY, 100, 6, 'S');
    drawCellText(doc, countLux > 0 ? Math.round(iluminanciaMedia) + ' Lux' : '', iX + 75, iY, 100, 6, { align: 'center', fontStyle: 'bold', fontSize: 8.5 });
    iY += 7;

    // Ilum. Media Mínima S/ Tabla 2
    doc.rect(iX, iY, 75, 6, 'S');
    setFillColor(doc, COLOR_SLATE_200); doc.rect(iX, iY, 75, 6, 'FD');
    drawCellText(doc, 'Ilum. Media Mínima S/ Tabla 2 Anexo IV', iX, iY, 75, 6, { fontSize: 8.5, color: COLOR_NEGRO });

    doc.rect(iX + 75, iY, 100, 6, 'S');
    drawCellText(doc, reqLuxLegal + ' Lux', iX + 75, iY, 100, 6, { align: 'center', fontStyle: 'bold', fontSize: 8.5 });
    iY += 7;

    // Verificación Iluminancia
    doc.rect(iX, iY, 75, 6, 'S');
    setFillColor(doc, COLOR_SLATE_200); doc.rect(iX, iY, 75, 6, 'FD');
    drawCellText(doc, 'Verificación', iX, iY, 75, 6, { fontSize: 8.5, color: COLOR_NEGRO });

    const resIlumColor = cumpleIluminancia ? COLOR_VERDE_CUMPLE : COLOR_ROJO_NO_CUMPLE;
    setFillColor(doc, resIlumColor);
    doc.rect(iX + 75, iY, 100, 6, 'FD');
    drawCellText(doc, cumpleIluminancia ? 'Cumple' : 'No cumple', iX + 75, iY, 100, 6, { align: 'center', fontStyle: 'bold', fontSize: 8.5, color: COLOR_BLANCO });

    // Bloque Uniformidad de Iluminancia
    const uX = 16;
    let uY = 205;

    doc.rect(uX, uY, 75, 12, 'S');
    setFillColor(doc, COLOR_SLATE_200); doc.rect(uX, uY, 75, 12, 'FD');
    drawCellText(doc, 'Uniformidad de Iluminancia', uX, uY, 75, 12, { fontSize: 8.5, color: COLOR_NEGRO });

    doc.rect(uX + 75, uY, 100, 12, 'S');
    drawFraction('Iluminancia Media', '2', uX + 75, uY, 100, 12);
    uY += 13;

    doc.rect(uX, uY, 75, 12, 'S');
    setFillColor(doc, COLOR_SLATE_200); doc.rect(uX, uY, 75, 12, 'FD');
    drawCellText(doc, 'Uniformidad de Iluminancia', uX, uY, 75, 12, { fontSize: 8.5, color: COLOR_NEGRO });

    doc.rect(uX + 75, uY, 100, 12, 'S');
    if (countLux > 0) {
      drawFraction(String(Math.round(iluminanciaMedia)), '2', uX + 75, uY, 100, 12);
    }
    uY += 13;

    doc.rect(uX, uY, 75, 6, 'S');
    setFillColor(doc, COLOR_SLATE_200); doc.rect(uX, uY, 75, 6, 'FD');
    drawCellText(doc, 'Uniformidad de Iluminancia', uX, uY, 75, 6, { fontSize: 8.5, color: COLOR_NEGRO });

    doc.rect(uX + 75, uY, 100, 6, 'S');
    drawCellText(doc, countLux > 0 ? Math.round(uniformidadLimit) + ' Lux' : '', uX + 75, uY, 100, 6, { align: 'center', fontStyle: 'bold', fontSize: 8.5 });
    uY += 7;

    doc.rect(uX, uY, 75, 6, 'S');
    setFillColor(doc, COLOR_SLATE_200); doc.rect(uX, uY, 75, 6, 'FD');
    drawCellText(doc, 'Verificación de Uniformidad', uX, uY, 75, 6, { fontSize: 8.5, color: COLOR_NEGRO });

    doc.rect(uX + 75, uY, 100, 6, 'S');
    drawCellText(doc, 'Menor Valor Medido ≥ Uniformidad', uX + 75, uY, 100, 6, { align: 'center', fontStyle: 'bold', fontSize: 8.5 });
    uY += 7;

    doc.rect(uX, uY, 75, 6, 'S');
    setFillColor(doc, COLOR_SLATE_200); doc.rect(uX, uY, 75, 6, 'FD');
    drawCellText(doc, 'Verificación de Uniformidad', uX, uY, 75, 6, { fontSize: 8.5, color: COLOR_NEGRO });

    doc.rect(uX + 75, uY, 100, 6, 'S');
    const compStr = countLux > 0 ? `${Math.round(menorValorMedido)} ≥ ${Math.round(uniformidadLimit)}` : '';
    drawCellText(doc, compStr, uX + 75, uY, 100, 6, { align: 'center', fontStyle: 'bold', fontSize: 8.5 });
    uY += 7;

    doc.rect(uX, uY, 75, 6, 'S');
    setFillColor(doc, COLOR_SLATE_200); doc.rect(uX, uY, 75, 6, 'FD');
    drawCellText(doc, 'Verificación', uX, uY, 75, 6, { fontSize: 8.5, color: COLOR_NEGRO });

    const resUnifColor = cumpleUniformidad ? COLOR_VERDE_CUMPLE : COLOR_ROJO_NO_CUMPLE;
    setFillColor(doc, resUnifColor);
    doc.rect(uX + 75, uY, 100, 6, 'FD');
    drawCellText(doc, cumpleUniformidad ? 'Cumple' : 'No cumple', uX + 75, uY, 100, 6, { align: 'center', fontStyle: 'bold', fontSize: 8.5, color: COLOR_BLANCO });

    // Firma
    drawSignatureBlock(110, 238, 70, 32);
  });

  // ==========================================
  // PAGINAS N+1 A M: CROQUIS PUNTOS DE MUESTREO (A4 Apaisado)
  // ==========================================
  const croquisPagesDef = [
    { title: "Subsuelo" },
    { title: "Planta baja" },
    { title: "Piso 1 a 9" },
    { title: "Piso 10" },
    { title: "Piso 11" },
    { title: "Piso 12" }
  ];

  const croquisItems = (adjuntosList && adjuntosList.length > 0)
    ? adjuntosList.map((adj, idx) => ({ title: adj.descripcion || adj.nombre || `Plano ${idx + 1}`, url: adj.url || adj.archivo_url }))
    : croquisPagesDef.map(c => ({ title: c.title, url: '' }));

  for (let cIdx = 0; cIdx < croquisItems.length; cIdx++) {
    const cItem = croquisItems[cIdx];

    doc.addPage('a4', 'landscape');
    pageCounter++;

    drawHeader(true);
    drawProtocolTitleBar(true, { x: 15, y: 26, w: 267, h: 5.5 });

    const kX = 15;
    const kY = 33;
    const kW = 267;

    doc.setLineWidth(0.45);
    setDrawColor(doc, COLOR_NEGRO);
    doc.rect(kX, kY, kW, 6, 'S');
    drawCellText(doc, 'Puntos de muestreo', kX, kY, kW, 6, { fontStyle: 'bold', fontSize: 9 });

    const mY = 41;
    const mH = 145;
    doc.rect(kX, mY, kW, mH, 'S');

    drawCellText(doc, cItem.title, kX, mY + 2, kW, 10, { align: 'center', fontStyle: 'bold', fontSize: 13, color: COLOR_AZUL_PRINCIPAL });

    if (cItem.url) {
      try {
        const croqBase64 = await getBase64ImageFromUrl(cItem.url);
        if (croqBase64) {
          const dims = await getImgDimensions(croqBase64);
          const maxW = kW - 20;
          const maxH = mH - 18;
          const ratio = dims.width / dims.height;

          let renderW = maxW;
          let renderH = maxW / ratio;
          if (renderH > maxH) {
            renderH = maxH;
            renderW = maxH * ratio;
          }

          const imgX = kX + (kW - renderW) / 2;
          const imgY = mY + 14 + (maxH - renderH) / 2;

          doc.addImage(croqBase64, 'PNG', imgX, imgY, renderW, renderH, undefined, 'FAST');
        }
      } catch (err) {
        console.error('Error al insertar imagen de croquis:', err);
      }
    } else {
      setDrawColor(doc, COLOR_SLATE_300);
      doc.setLineWidth(0.3);
      doc.rect(kX + 10, mY + 14, kW - 20, mH - 20, 'S');
      drawCellText(doc, `[ CROQUIS / PLANO DEL ESTABLECIMIENTO: ${cItem.title.toUpperCase()} ]`, kX + 10, mY + 14, kW - 20, mH - 20, { align: 'center', fontStyle: 'bold', fontSize: 11, color: COLOR_SLATE_500 });
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

  return doc;
};
