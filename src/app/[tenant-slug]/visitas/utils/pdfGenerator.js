// src/app/[tenant-slug]/visitas/utils/pdfGenerator.js
import { formatPdfFileName } from '@/lib/pdf/pdfFileName';
import { getPdfPrimaryColor } from '@/lib/pdf/pdfTheme';

const MEDICIONES_OPTS = ['Ruido (Res. 85/12)', 'Iluminación (Res. 84/12)', 'Evaluación ergonómica', 'Puesta a tierra (Res. 900/15)'];

const getBase64ImageFromUrl = async (imageUrl) => {
  const res = await fetch(imageUrl);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

const getImgDimensions = (base64) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.width, height: img.height });
    };
    img.onerror = () => {
      resolve({ width: 200, height: 100 });
    };
    img.src = base64;
  });
};

const resizeImage = (base64Str, maxWidth = 300, maxHeight = 300, isTransparent = false) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
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

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!isTransparent) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
      }

      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL(isTransparent ? 'image/png' : 'image/jpeg', 0.85));
    };
    img.onerror = () => resolve(base64Str);
  });
};

const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
};

/**
 * generateVisitaPdf
 * Generador normativo de PDF para Constancia de Visita Técnica en Gestión SySO.
 * Preserva exactamente los 3 modos de ejecución: 'download' (o true), 'bloburl', 'blob', y 'datauristring'.
 */
export const generateVisitaPdf = async (
  visita,
  shouldDownload = true,
  {
    empresas = [],
    allEstablecimientos = [],
    tenant = null,
    profile = null,
    adminContact = { phone: '', email: '' },
    supabase = null,
    triggerToast = () => {},
    isDevMode = false,
  } = {}
) => {
  try {
    triggerToast('Generando reporte PDF...', 'info');

    const { jsPDF } = await import('jspdf');
    await import('jspdf-autotable');

    const v = visita;
    const emp = empresas.find((e) => e.id === v.empresa_id);
    const est = allEstablecimientos.find((e) => e.id === v.establecimiento_id);

    const empName = emp ? emp.razon_social : 'N/A';
    const cuit = emp ? emp.cuit : 'N/A';
    const estName = est ? est.denominacion : 'N/A';
    const address = est ? est.direccion : 'N/A';

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'a4',
      compress: true,
    });

    let logoBase64 = '';
    const TENANT_PRIMARY = getPdfPrimaryColor(tenant); // Tenant primary_color or default [70, 141, 255]
    try {
      if (tenant && tenant.logo_1_url) {
        logoBase64 = await getBase64ImageFromUrl(tenant.logo_1_url);
      }
    } catch (e) {
      console.error('No se pudo cargar el logo 1 personalizado, intentando logo principal:', e);
    }

    if (!logoBase64) {
      try {
        logoBase64 = await getBase64ImageFromUrl('/brand/logo-primary.png');
      } catch (e) {
        console.error('No se pudo cargar el logo de la cabecera por defecto:', e);
      }
    }

    if (logoBase64) {
      logoBase64 = await resizeImage(logoBase64, 300, 300);
    }

    const drawHeaderAndFooter = (pageNum) => {
      if (logoBase64) {
        try {
          doc.addImage(logoBase64, 'PNG', 63.85, 22.11, 142.5, 78.31);
        } catch (e) {
          console.error('Error dibujando el logo de la cabecera:', e);
        }
      }

      // Footer: Línea Azul Corporativo
      doc.setDrawColor(...TENANT_PRIMARY);
      doc.setLineWidth(1);
      doc.line(42.1, 735.63, 567.85, 735.63);

      const boldText = tenant?.name || 'Gestión SySO';
      const phoneVal = profile?.role === 'miembro' ? profile?.phone || '' : adminContact.phone;
      const emailVal = profile?.role === 'miembro' ? profile?.email || '' : adminContact.email;
      const normalText = `  •  Tel: ${phoneVal}  •  Email: ${emailVal}`;

      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);

      doc.setFont('helvetica', 'bold');
      const boldWidth = doc.getTextWidth(boldText);

      doc.setFont('helvetica', 'normal');
      const normalWidth = doc.getTextWidth(normalText);

      const totalTextWidth = boldWidth + normalWidth;
      const totalW = 567.85 - 42.1;
      const lineStartX = 42.1 + totalW / 2 - totalTextWidth / 2;

      doc.setFont('helvetica', 'bold');
      doc.text(boldText, lineStartX, 751);

      doc.setFont('helvetica', 'normal');
      doc.text(normalText, lineStartX + boldWidth, 751);

      doc.setFont('helvetica', 'bold');
      doc.text(`${pageNum}`, 567.85, 751, { align: 'right' });
    };

    // PAGINA 1
    drawHeaderAndFooter(1);

    doc.setFillColor(...TENANT_PRIMARY);
    doc.rect(61.6, 116.71, 486.75, 25.5, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(255, 255, 255);
    doc.text('Constancia de visita', 61.6 + 486.75 / 2, 116.71 + 16.5, { align: 'center' });

    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.8);
    doc.rect(62, 156, 487, 144);

    for (let i = 1; i <= 5; i++) {
      doc.line(62, 156 + 24 * i, 62 + 487, 156 + 24 * i);
    }
    doc.line(305, 180, 305, 204);
    doc.line(305, 228, 305, 252);

    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);

    doc.setFont('helvetica', 'bold');
    doc.text('Razón social de la empresa:', 68, 171);
    doc.setFont('helvetica', 'normal');
    doc.text(empName, 205, 171);

    doc.setFont('helvetica', 'bold');
    doc.text('C.U.I.T.:', 68, 195);
    doc.setFont('helvetica', 'normal');
    doc.text(cuit, 115, 195);
    doc.setFont('helvetica', 'bold');
    doc.text('Establecimiento:', 311, 195);
    doc.setFont('helvetica', 'normal');
    doc.text(estName, 395, 195);

    doc.setFont('helvetica', 'bold');
    doc.text('Dirección:', 68, 219);
    doc.setFont('helvetica', 'normal');
    doc.text(address, 120, 219);

    doc.setFont('helvetica', 'bold');
    doc.text('Fecha:', 68, 243);
    doc.setFont('helvetica', 'normal');
    doc.text(formatDate(v.fecha), 105, 243);
    doc.setFont('helvetica', 'bold');
    doc.text('Hora de finalización:', 311, 243);
    doc.setFont('helvetica', 'normal');
    doc.text(v.hora_finalizacion || 'N/A', 415, 243);

    doc.setFont('helvetica', 'bold');
    doc.text('Nombre y cargo del responsable presente:', 68, 267);
    doc.setFont('helvetica', 'normal');
    doc.text(v.responsable_presente || 'N/A', 285, 267);

    doc.setFont('helvetica', 'bold');
    doc.text('Profesional interviniente:', 68, 291);
    doc.setFont('helvetica', 'normal');
    doc.text(v.profesional_nombre || 'N/A', 205, 291);

    doc.setFillColor(102, 102, 102);
    doc.rect(62.35, 314.25, 486, 24.75, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text('Actividades realizadas durante la visita', 68, 314.25 + 15.5);
    doc.text('Si', 462.85 + 14.25, 314.25 + 15.5, { align: 'center' });
    doc.text('No', 491.35 + 14.25, 314.25 + 15.5, { align: 'center' });
    doc.text('NA', 519.85 + 14.25, 314.25 + 15.5, { align: 'center' });

    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.8);
    doc.line(462.85, 314.25, 462.85, 314.25 + 24.75);
    doc.line(491.35, 314.25, 491.35, 314.25 + 24.75);
    doc.line(519.85, 314.25, 519.85, 314.25 + 24.75);

    const isMedFisQuim = (v.mediciones_realizadas || []).some((x) => x !== 'Evaluación ergonómica' && x !== 'N/A');
    const isMedErg = (v.mediciones_realizadas || []).includes('Evaluación ergonómica');
    const isMedOther = (v.mediciones_realizadas || []).some((x) => !MEDICIONES_OPTS.includes(x) && x !== 'N/A');
    const fisQuimMedText = (v.mediciones_realizadas || []).filter((x) => x !== 'Evaluación ergonómica' && MEDICIONES_OPTS.includes(x) && x !== 'N/A').join(', ');
    const otherMedText = (v.mediciones_realizadas || []).filter((x) => x !== 'Evaluación ergonómica' && !MEDICIONES_OPTS.includes(x)).join(', ');

    const p1Rows = [
      { id: '1', text: '1. ¿Ocurrieron incidentes o accidentes laborales desde la última visita?', type: 'main', height: 25, val: v.ocurrieron_incidentes ? 'Sí' : 'No' },
      { id: '1.1', text: '  1.1. ¿Se realizó el análisis correspondiente (causa raíz, acciones correctivas)?', type: 'sub', height: 25, val: v.analisis_correspondiente },
      { id: '1.2', text: '  1.2. ¿Cuál fue la causa raíz?:\n  ' + (v.causa_raiz || 'N/A'), type: 'desc', height: 36 },
      { id: '1.3', text: '  1.3. ¿Qué acción correctiva se planificó / realizó?:\n  ' + (v.accion_correctiva || 'N/A'), type: 'desc', height: 37 },
      { id: '2', text: '2. ¿Se realizó relevamiento de:', type: 'group', height: 24 },
      { id: '2.1', text: '  2.1. Condiciones inseguras', type: 'sub', height: 25, val: v.relevamiento_higiene_seguridad },
      { id: '2.2', text: '  2.2. Actos inseguros', type: 'sub', height: 25, val: v.relevamiento_practicas_seguras },
      { id: '2.3', text: '  2.3. Uso adecuado de elementos de protección personal (EPP’s)', type: 'sub', height: 25, val: v.relevamiento_epp },
      { id: '3', text: '3. ¿Se realizaron mediciones o evaluaciones técnicas específicas?', type: 'main', height: 25, val: v.realizaron_mediciones },
      { id: '3.1', text: '  3.1. Medición de contaminantes físicos y/o químicos?: ' + (fisQuimMedText || 'Ninguna'), type: 'sub', height: 25, val: isMedFisQuim ? 'Sí' : v.realizaron_mediciones === 'N/A' ? 'N/A' : 'No' },
      { id: '3.2', text: '  3.2. Evaluación de riesgos ergonómicos', type: 'sub', height: 25, val: isMedErg ? 'Sí' : v.realizaron_mediciones === 'N/A' ? 'N/A' : 'No' },
      { id: '3.3', text: '  3.3. Otras (especificar): ' + (otherMedText || 'Ninguna'), type: 'sub', height: 25, val: isMedOther ? 'Sí' : v.realizaron_mediciones === 'N/A' ? 'N/A' : 'No' },
      { id: '4', text: '4. ¿Se verificó la implementación de acciones correctivas previamente recomendadas?', type: 'main', height: 37, val: v.verifico_acciones_correctivas },
    ];

    let curY = 314.25 + 24.75;
    doc.rect(62.35, 314.25, 486, 385);

    p1Rows.forEach((row) => {
      doc.line(62.35, curY + row.height, 62.35 + 486, curY + row.height);

      if (row.type !== 'desc') {
        doc.line(462.85, curY, 462.85, curY + row.height);
        doc.line(491.35, curY, 491.35, curY + row.height);
        doc.line(519.85, curY, 519.85, curY + row.height);
      }

      doc.setFont('helvetica', row.type === 'main' || row.type === 'group' ? 'bold' : 'normal');
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);

      if (row.type === 'desc') {
        doc.text(row.text, 68, curY + 14, { maxWidth: 475 });
      } else {
        doc.text(row.text, 68, curY + 15, { maxWidth: 390 });
      }

      if (row.type === 'main' || row.type === 'sub') {
        const checkVal = row.val;
        const cbSize = 8;
        const cbY = curY + row.height / 2 - 4;

        doc.rect(462.85 + 10.25, cbY, cbSize, cbSize);
        doc.rect(491.35 + 10.25, cbY, cbSize, cbSize);
        doc.rect(519.85 + 10.25, cbY, cbSize, cbSize);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        if (checkVal === 'Sí' || checkVal === 'Si' || checkVal === true) {
          doc.text('X', 462.85 + 12, cbY + 7);
        } else if (checkVal === 'No' || checkVal === false) {
          doc.text('X', 491.35 + 12, cbY + 7);
        } else if (checkVal === 'N/A' || checkVal === 'NA') {
          doc.text('X', 519.85 + 12, cbY + 7);
        }
      }

      curY += row.height;
    });

    // PAGINA 2
    doc.addPage();
    drawHeaderAndFooter(2);

    doc.setFillColor(102, 102, 102);
    doc.rect(62.35, 102.91, 486, 24.75, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text('Actividades realizadas durante la visita', 68, 102.91 + 15.5);
    doc.text('Si', 462.85 + 14.25, 102.91 + 15.5, { align: 'center' });
    doc.text('No', 491.35 + 14.25, 102.91 + 15.5, { align: 'center' });
    doc.text('NA', 519.85 + 14.25, 102.91 + 15.5, { align: 'center' });

    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.8);
    doc.line(462.85, 102.91, 462.85, 102.91 + 24.75);
    doc.line(491.35, 102.91, 491.35, 102.91 + 24.75);
    doc.line(519.85, 102.91, 519.85, 102.91 + 24.75);

    const capTemas = (v.capacitaciones_temas || []).join(', ');
    const p2Rows = [
      { id: '5', text: '5. ¿Se dictaron capacitaciones? Especificar temas: ' + (capTemas || 'N/A'), type: 'main', height: 37, val: v.dictaron_capacitaciones ? 'Sí' : 'No' },
      { id: '6', text: '6. ¿Se realizaron simulacros?', type: 'main', height: 25, val: v.realizaron_simulacros ? 'Sí' : 'No' },
      { id: '6.1', text: '  6.1. Tipo: Evacuación / Incendio / Derrame / Fuga de gas / Otro:', type: 'simulacro_options', height: 25 },
      { id: '7', text: '7. ¿Se emitieron avisos por condiciones inseguras o actos inseguros?', type: 'main', height: 25, val: v.emite_aviso_riesgo ? 'Sí' : 'No' },
      { id: '8', text: '8. Documentación incorporada al Legajo de SySO:\n  ' + ((v.documentacion_incorporada || []).join(', ') || 'Ninguna'), type: 'desc', height: 37 },
    ];

    let curY2 = 102.91 + 24.75;
    doc.rect(62.35, 102.91, 486, 174);

    p2Rows.forEach((row) => {
      doc.line(62.35, curY2 + row.height, 62.35 + 486, curY2 + row.height);

      if (row.type !== 'desc' && row.type !== 'simulacro_options') {
        doc.line(462.85, curY2, 462.85, curY2 + row.height);
        doc.line(491.35, curY2, 491.35, curY2 + row.height);
        doc.line(519.85, curY2, 519.85, curY2 + row.height);
      }

      doc.setFont('helvetica', row.type === 'main' ? 'bold' : 'normal');
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);

      if (row.type === 'desc') {
        doc.text(row.text, 68, curY2 + 14, { maxWidth: 475 });
      } else if (row.type === 'simulacro_options') {
        doc.setFont('helvetica', 'normal');
        doc.text('  6.1. Tipo:', 68, curY2 + 15);

        const opts = [
          { name: 'Evacuación', x: 130 },
          { name: 'Incendio', x: 210 },
          { name: 'Derrame', x: 280 },
          { name: 'Fuga de gas', x: 350 },
          { name: 'Otro', x: 430 },
        ];

        opts.forEach((opt) => {
          const cbSize = 8;
          const cbY = curY2 + 7;

          doc.rect(opt.x, cbY, cbSize, cbSize);
          doc.text(opt.name, opt.x + 12, curY2 + 15);

          const hasOpt = (v.simulacros_tipo || []).includes(opt.name);
          if (hasOpt) {
            doc.setFont('helvetica', 'bold');
            doc.text('X', opt.x + 1.5, cbY + 7);
            doc.setFont('helvetica', 'normal');
          }
        });
      } else {
        doc.text(row.text, 68, curY2 + 15, { maxWidth: 390 });
      }

      if (row.type === 'main') {
        const checkVal = row.val;
        const cbSize = 8;
        const cbY = curY2 + row.height / 2 - 4;

        doc.rect(462.85 + 10.25, cbY, cbSize, cbSize);
        doc.rect(491.35 + 10.25, cbY, cbSize, cbSize);
        doc.rect(519.85 + 10.25, cbY, cbSize, cbSize);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        if (checkVal === 'Sí' || checkVal === 'Si' || checkVal === true) {
          doc.text('X', 462.85 + 12, cbY + 7);
        } else if (checkVal === 'No' || checkVal === false) {
          doc.text('X', 491.35 + 12, cbY + 7);
        } else if (checkVal === 'N/A' || checkVal === 'NA') {
          doc.text('X', 519.85 + 12, cbY + 7);
        }
      }

      curY2 += row.height;
    });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    doc.text('* Indicar con una X si corresponde: Sí / No / No Aplica (NA)', 62, 290);

    const obsY = 302.25;
    doc.setFillColor(102, 102, 102);
    doc.rect(62.35, obsY, 486.75, 24.75, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text('Observaciones y recomendaciones preventivas:', 68, obsY + 15.5);

    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.8);
    doc.rect(62.35, obsY, 486.75, 237.75);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(64, 64, 64);
    doc.text('Se realiza la presente visita a efectos de verificar las condiciones de Higiene y Seguridad en el establecimiento, supervisar las prácticas laborales y dar seguimiento a las acciones correctivas recomendadas.', 68, obsY + 42, { maxWidth: 475 });
    doc.text('Se detallan a continuación las observaciones relevantes y sugerencias preventivas:', 68, obsY + 80);

    doc.setLineDash([1, 2], 0);
    doc.setLineWidth(1);
    doc.setDrawColor(128, 128, 128);
    const lineYs = [412, 436, 459, 483, 507, 531];
    lineYs.forEach((lineY) => {
      doc.line(61.875, lineY, 548.875, lineY);
    });
    doc.setLineDash([], 0);

    let fullObsText = v.observaciones_recomendaciones || '';
    if (v.observaciones) {
      fullObsText += '\n\nNotas internas generales:\n' + v.observaciones;
    }

    if (fullObsText) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      const lines = doc.splitTextToSize(fullObsText, 475);
      for (let i = 0; i < Math.min(lines.length, 6); i++) {
        doc.text(lines[i], 68, lineYs[i] - 4);
      }
    }

    const sigY = 675;
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(1);

    doc.line(79, sigY, 263, sigY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    doc.text('Firma del responsable de la empresa', 171, sigY + 10, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.text(v.responsable_presente || '', 171, sigY + 22, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.text('Responsable del Establecimiento', 171, sigY + 32, { align: 'center' });

    doc.line(346, sigY, 530, sigY);
    doc.text('Firma del profesional de Higiene y', 438, sigY + 10, { align: 'center' });
    doc.text('Seguridad', 438, sigY + 20, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.text(v.profesional_nombre || '', 438, sigY + 32, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.text('Profesional Interviniente', 438, sigY + 42, { align: 'center' });

    let imgRespBase64 = '';
    let imgProfBase64 = '';

    if (v.firma_responsable_empresa && v.firma_responsable_empresa !== 'N/A') {
      try {
        if (v.firma_responsable_empresa.startsWith('data:')) {
          imgRespBase64 = v.firma_responsable_empresa;
        } else if (isDevMode || v.firma_responsable_empresa.startsWith('mock')) {
          imgRespBase64 = await getBase64ImageFromUrl('/brand/logo-primary.png');
        } else if (supabase) {
          let relativePath = v.firma_responsable_empresa;
          let isExternal = false;

          if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
            try {
              const urlObj = new URL(relativePath);
              const pathParts = urlObj.pathname.split('/');
              const bucketIndex = pathParts.findIndex((part) => part === 'documents' || part === 'signatures');
              if (bucketIndex !== -1 && bucketIndex < pathParts.length - 1) {
                relativePath = pathParts.slice(bucketIndex + 1).join('/');
              } else {
                isExternal = true;
              }
            } catch (urlErr) {
              console.error('Error parseando URL de firma responsable:', urlErr);
              isExternal = true;
            }
          }

          if (isExternal) {
            imgRespBase64 = await getBase64ImageFromUrl(v.firma_responsable_empresa);
          } else {
            // Intentar en bucket documents y signatures
            let signedUrl = null;
            for (const b of ['documents', 'signatures']) {
              const { data: sData, error: sErr } = await supabase.storage
                .from(b)
                .createSignedUrl(relativePath, 3600);
              if (!sErr && sData?.signedUrl) {
                signedUrl = sData.signedUrl;
                break;
              }
            }
            if (signedUrl) {
              imgRespBase64 = await getBase64ImageFromUrl(signedUrl);
            } else {
              imgRespBase64 = await getBase64ImageFromUrl(v.firma_responsable_empresa);
            }
          }
        }
        if (imgRespBase64) {
          imgRespBase64 = await resizeImage(imgRespBase64, 200, 100);
        }
      } catch (err) {
        console.error('Error fetching responsable signature:', err);
      }
    }

    if (v.firma_profesional && v.firma_profesional !== 'N/A') {
      try {
        if (v.firma_profesional.startsWith('data:')) {
          imgProfBase64 = v.firma_profesional;
        } else if (isDevMode || v.firma_profesional.startsWith('mock')) {
          imgProfBase64 = await getBase64ImageFromUrl('/brand/logo-primary.png');
        } else if (supabase) {
          let relativePath = v.firma_profesional;
          let isExternal = false;
          let detectedBucket = null;

          if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
            try {
              const urlObj = new URL(relativePath);
              const pathParts = urlObj.pathname.split('/');
              const bucketIndex = pathParts.findIndex((part) => part === 'signatures' || part === 'documents');
              if (bucketIndex !== -1 && bucketIndex < pathParts.length - 1) {
                detectedBucket = pathParts[bucketIndex];
                relativePath = pathParts.slice(bucketIndex + 1).join('/');
              } else {
                isExternal = true;
              }
            } catch (urlErr) {
              console.error('Error parseando URL de firma profesional:', urlErr);
              isExternal = true;
            }
          }

          if (isExternal) {
            imgProfBase64 = await getBase64ImageFromUrl(v.firma_profesional);
          } else {
            const preferredBucket = detectedBucket || (v.firma_tipo === 'perfil' ? 'signatures' : 'documents');
            const candidateBuckets = Array.from(new Set([preferredBucket, 'signatures', 'documents']));
            let signedUrl = null;

            for (const b of candidateBuckets) {
              const { data: sData, error: sErr } = await supabase.storage
                .from(b)
                .createSignedUrl(relativePath, 3600);
              if (!sErr && sData?.signedUrl) {
                signedUrl = sData.signedUrl;
                break;
              }
            }

            if (signedUrl) {
              imgProfBase64 = await getBase64ImageFromUrl(signedUrl);
            } else {
              imgProfBase64 = await getBase64ImageFromUrl(v.firma_profesional);
            }
          }
        }
        if (imgProfBase64) {
          imgProfBase64 = await resizeImage(imgProfBase64, 1200, 600, true);
        }
      } catch (err) {
        console.error('Error fetching profesional signature:', err);
      }
    }

    if (imgRespBase64 && imgRespBase64.startsWith('data:image/')) {
      try {
        const dims = await getImgDimensions(imgRespBase64);
        const imgRatio = dims.width / dims.height;
        const maxW = 100;
        const maxH = 40;
        let imgW = maxW;
        let imgH = maxH;
        if (imgRatio > maxW / maxH) {
          imgW = maxW;
          imgH = maxW / imgRatio;
        } else {
          imgH = maxH;
          imgW = maxH * imgRatio;
        }
        const imgX = 171 - imgW / 2;
        const imgY = sigY - 5 - imgH;
        doc.addImage(imgRespBase64, 'PNG', imgX, imgY, imgW, imgH);
      } catch (err) {
        console.error('Error rendering imgRespBase64:', err);
      }
    }
    if (imgProfBase64 && imgProfBase64.startsWith('data:image/')) {
      try {
        const dims = await getImgDimensions(imgProfBase64);
        const imgRatio = dims.width / dims.height;
        const maxW = 240;
        const maxH = 120;
        let imgW = maxW;
        let imgH = maxH;
        if (imgRatio > maxW / maxH) {
          imgW = maxW;
          imgH = maxW / imgRatio;
        } else {
          imgH = maxH;
          imgW = maxH * imgRatio;
        }
        const imgX = 438 - imgW / 2;
        const imgY = sigY - 5 - imgH;
        doc.addImage(imgProfBase64, 'PNG', imgX, imgY, imgW, imgH);
      } catch (err) {
        console.error('Error rendering imgProfBase64:', err);
      }
    }

    if (shouldDownload === true || shouldDownload === 'download') {
      const fileName = formatPdfFileName({
        tipoDoc: 'constancia-visita',
        empresa: empName,
        establecimiento: estName,
        fecha: v.fecha,
        id: v.id,
      });
      doc.save(fileName);
      triggerToast('PDF descargado exitosamente.');
      return null;
    } else if (shouldDownload === 'bloburl') {
      const blob = doc.output('blob');
      return URL.createObjectURL(blob);
    } else if (shouldDownload === 'blob') {
      return doc.output('blob');
    } else {
      return doc.output('datauristring');
    }
  } catch (e) {
    console.error('Error al generar PDF:', e);
    triggerToast('Error al generar el reporte PDF.', 'error');
    return null;
  }
};
