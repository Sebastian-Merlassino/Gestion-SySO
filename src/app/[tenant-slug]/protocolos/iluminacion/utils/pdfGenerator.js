import { formatDate } from '@/lib/utils';

// Helper to convert image URL to base64
const getBase64ImageFromUrl = async (imageUrl) => {
  if (!imageUrl) return '';
  if (imageUrl.startsWith('data:')) return imageUrl;
  try {
    const res = await fetch(imageUrl);
    const blob = await res.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.addEventListener("load", () => {
        resolve(reader.result);
      }, false);
      reader.addEventListener("error", () => {
        reject(new Error("Error reading image"));
      }, false);
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.error('Error fetching image to base64:', e);
    return '';
  }
};

// Resize image for PDF
const resizeImageForPdf = (base64Str, maxWidth = 350, maxHeight = 350) => {
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

const getImgDimensions = (base64Str) => {
  return new Promise((resolve) => {
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

export const generateLightingProtocolPdf = async (proto, tenant, empresas, allEstablecimientos, puntosList, adjuntosList, isDevMode = false) => {
  const { jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  // A4 size in points: 595.28 x 841.89
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
    compress: true
  });

  const emp = empresas.find(e => e.id === proto.razon_social_id);
  const est = allEstablecimientos.find(e => e.id === proto.establecimiento_id);

  // Logo base64
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
    logoBase64 = await resizeImageForPdf(logoBase64, 300, 300);
  }

  let logoWidth = 120;
  let logoHeight = 45;
  if (logoBase64) {
    try {
      const dims = await getImgDimensions(logoBase64);
      const ratio = dims.width / dims.height;
      const maxW = 120;
      const maxH = 45;
      if (ratio > maxW / maxH) {
        logoWidth = maxW;
        logoHeight = maxW / ratio;
      } else {
        logoHeight = maxH;
        logoWidth = maxH * ratio;
      }
    } catch (e) {
      console.error(e);
    }
  }

  const tenantName = tenant?.name || 'Gestión SySO';

  // Margen general (36 pt = 0.5 pulgada)
  const margin = 36;
  const contentWidth = 595.28 - (margin * 2);

  // Helper for Header Logo / Title
  const drawPageDecorations = (d, pageNum, totalPages) => {
    // Header
    if (logoBase64) {
      try {
        d.addImage(logoBase64, 'PNG', margin, 15, logoWidth, logoHeight);
      } catch (err) {
        console.error(err);
      }
    }

    d.setFont('helvetica', 'bold');
    d.setFontSize(10);
    d.setTextColor(70, 141, 255); // primary color #468DFF
    d.text(tenantName.toUpperCase(), 595.28 - margin, 25, { align: 'right' });
    d.setFont('helvetica', 'normal');
    d.setFontSize(8);
    d.setTextColor(100, 116, 139);
    d.text('Sistemas de Higiene y Seguridad Laboral', 595.28 - margin, 37, { align: 'right' });

    // Divider Line
    d.setDrawColor(226, 232, 240);
    d.setLineWidth(1);
    d.line(margin, 70, 595.28 - margin, 70);

    // Footer
    d.setDrawColor(226, 232, 240);
    d.line(margin, 810, 595.28 - margin, 810);
    d.setFontSize(8);
    d.text(`Página ${pageNum} de ${totalPages}`, 595.28 - margin, 825, { align: 'right' });
    d.text('Protocolo Medición de Iluminación - Res. SRT 84/12', margin, 825, { align: 'left' });
  };

  // COVER / DOCUMENT DATA
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text('PROTOCOLO PARA MEDICIÓN DE ILUMINACIÓN EN EL AMBIENTE LABORAL', margin, 95);
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text('Resolución S.R.T. N° 84/12 - Higiene y Seguridad en el Trabajo', margin, 110);

  // Table 1: Datos de la Razón Social y del Establecimiento
  const tableData1 = [
    [
      { content: '1. DATOS DE LA RAZÓN SOCIAL Y DEL ESTABLECIMIENTO', colSpan: 2, styles: { fillColor: [70, 141, 255], textColor: [255, 255, 255], fontStyle: 'bold' } }
    ],
    ['Razón Social: ' + (proto.razon_social_text || 'N/A'), 'C.U.I.T.: ' + (proto.cuit_text || 'N/A')],
    ['Establecimiento: ' + (proto.establecimiento_text || 'N/A'), 'Dirección: ' + (proto.direccion_text || 'N/A')],
    ['Localidad: ' + (proto.localidad_text || 'N/A'), 'Provincia: ' + (proto.provincia_text || 'N/A')],
    ['Código Postal: ' + (proto.cp_text || 'N/A'), 'Horarios / Turnos: ' + (proto.horarios_turnos_text || 'N/A')]
  ];

  autoTable(doc, {
    startY: 125,
    head: [],
    body: tableData1,
    theme: 'grid',
    styles: { fontSize: 8.5, cellPadding: 5.5, font: 'helvetica' },
    columnStyles: {
      0: { width: contentWidth / 2 },
      1: { width: contentWidth / 2 }
    }
  });

  // Table 2: Datos de la Medición
  const tableData2 = [
    [
      { content: '2. DATOS DE LA MEDICIÓN E INSTRUMENTAL', colSpan: 2, styles: { fillColor: [70, 141, 255], textColor: [255, 255, 255], fontStyle: 'bold' } }
    ],
    ['Instrumental (Marca, Modelo, N/S): ' + (proto.instrumento_marca_modelo_serie || 'N/A'), 'Fecha de Calibración: ' + (proto.fecha_calibracion ? formatDate(proto.fecha_calibracion) : 'N/A')],
    ['Fecha de Medición: ' + (proto.fecha_medicion ? formatDate(proto.fecha_medicion) : 'N/A'), 'Hora Medición: ' + (proto.hora_inicio || 'N/A') + ' a ' + (proto.hora_finalizacion || 'N/A')],
    ['Condiciones Atmosféricas: ' + (proto.condiciones_atmosfericas || 'N/A'), 'Documentación Anexa: ' + (proto.documentacion_adjunta || 'N/A')],
    [{ content: 'Metodología Utilizada: ' + (proto.metodologia_utilizada || 'N/A'), colSpan: 2 }]
  ];

  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 15,
    head: [],
    body: tableData2,
    theme: 'grid',
    styles: { fontSize: 8.5, cellPadding: 5.5, font: 'helvetica' },
    columnStyles: {
      0: { width: contentWidth / 2 },
      1: { width: contentWidth / 2 }
    }
  });

  // Table 3: Puntos de Muestreo
  const tableHeaders3 = [
    [
      { content: '3. PLANILLA DE MEDICIONES Y CÁLCULOS TÉCNICOS', colSpan: 10, styles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' } }
    ],
    [
      { content: 'Punto / Sector / Puesto' },
      { content: 'Tipo / Fuente' },
      { content: 'Dimens. (L x A x H)' },
      { content: 'Índice Local (I)' },
      { content: 'Ptos Mín.' },
      { content: 'Muestras' },
      { content: 'E Med (lx)' },
      { content: 'E Mín (lx)' },
      { content: 'Requerido (lx)' },
      { content: 'Resultado' }
    ]
  ];

  const tableBody3 = puntosList.map(p => {
    // Calculados
    const largo = parseFloat(p.largo_m);
    const ancho = parseFloat(p.ancho_m);
    const altura = parseFloat(p.altura_m);
    const required = parseFloat(p.valor_requerido_legal_lux);

    let idxLocal = '-';
    let ptsMinVal = '-';

    if (largo > 0 && ancho > 0 && altura > 0) {
      const idx = (largo * ancho) / (altura * (largo + ancho));
      idxLocal = idx.toFixed(2);
      const x = idx >= 3 ? 4 : Math.ceil(idx);
      ptsMinVal = String(Math.pow(x + 2, 2));
    }

    const validVals = p.mediciones
      .map(m => parseFloat(m.valor_lux))
      .filter(val => !isNaN(val));

    const count = validVals.length;
    let avg = '-';
    let minVal = '-';

    if (count > 0) {
      const sum = validVals.reduce((a, b) => a + b, 0);
      avg = (sum / count).toFixed(1);
      minVal = Math.min(...validVals).toFixed(0);
    }

    // Cumplimiento
    let statusText = p.resultado_punto || 'Borrador';

    return [
      { content: `Punto #${p.punto_muestreo}\n${p.sector_text || '-'}\n${p.puesto_text || 'N/A'}` },
      { content: `${p.tipo_iluminacion || '-'}\n${p.tipo_fuente_luminica || '-'}\n(${p.iluminacion || 'G'})` },
      { content: `${p.largo_m || '-'} x ${p.ancho_m || '-'}\nalt: ${p.altura_m || '-'}` },
      { content: idxLocal },
      { content: ptsMinVal },
      { content: `${count} lux` },
      { content: avg },
      { content: minVal },
      { content: !isNaN(required) ? required : '-' },
      { content: statusText.toUpperCase(), styles: { fontStyle: 'bold', textColor: statusText === 'Cumple' ? [0, 176, 80] : statusText === 'No cumple' ? [255, 0, 0] : [255, 153, 0] } }
    ];
  });

  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 15,
    head: tableHeaders3,
    body: tableBody3,
    theme: 'grid',
    styles: { fontSize: 7.5, cellPadding: 4, font: 'helvetica', valign: 'middle' },
    columnStyles: {
      0: { width: contentWidth * 0.22 },
      1: { width: contentWidth * 0.12 },
      2: { width: contentWidth * 0.12 },
      3: { width: contentWidth * 0.08 },
      4: { width: contentWidth * 0.06 },
      5: { width: contentWidth * 0.08 },
      6: { width: contentWidth * 0.08 },
      7: { width: contentWidth * 0.08 },
      8: { width: contentWidth * 0.08 },
      9: { width: contentWidth * 0.08 }
    }
  });

  // Table 4: Conclusiones y Recomendaciones
  const tableData4 = [
    [
      { content: '4. ANÁLISIS DE LOS RESULTADOS Y RECOMENDACIONES PREVENTIVAS', colSpan: 1, styles: { fillColor: [70, 141, 255], textColor: [255, 255, 255], fontStyle: 'bold' } }
    ],
    ['Conclusiones:\n' + (proto.conclusiones || 'La medición general de iluminancia cumple con los niveles exigidos en los sectores indicados a excepción de los desvíos descritos.')],
    ['Recomendaciones preventivas recomendadas:\n' + (proto.recomendaciones || 'Realizar limpieza de las luminarias de forma semestral, adecuar potencia lumínica o incorporar luminarias de apoyo en puestos requeridos.')]
  ];

  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 15,
    head: [],
    body: tableData4,
    theme: 'grid',
    styles: { fontSize: 8.5, cellPadding: 6, font: 'helvetica', cellWidth: 'wrap' }
  });

  // Firmas block
  const finalY = doc.lastAutoTable.finalY;
  
  // Agregar Firmas si caben en la página, sino saltar de página
  let currentY = finalY + 40;
  if (currentY > 740) {
    doc.addPage();
    currentY = 120;
  }

  // Draw signatures line
  doc.setDrawColor(150, 150, 150);
  doc.setLineWidth(1);
  doc.line(margin + 50, currentY, margin + 200, currentY);
  doc.line(595.28 - margin - 200, currentY, 595.28 - margin - 50, currentY);

  doc.setFontSize(8.5);
  doc.setTextColor(50, 50, 50);
  doc.text('Responsable del Establecimiento\nAclaración y Cargo', margin + 125, currentY + 15, { align: 'center' });
  doc.text('Profesional de Higiene y Seguridad\nFirma y Matrícula', 595.28 - margin - 125, currentY + 15, { align: 'center' });

  // Decorate all pages
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawPageDecorations(doc, i, totalPages);
  }

  return doc;
};
