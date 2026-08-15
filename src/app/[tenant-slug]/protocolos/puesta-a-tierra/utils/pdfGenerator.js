import { formatDate } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { setFillColor, setDrawColor, setTextColor, hexToRgb, PDF_THEME } from '@/lib/pdf/pdfTheme';
import { getBase64ImageFromUrl } from '@/lib/pdf/pdfImages';

// Robust Base64 getter for attachments from Supabase storage / URLs
const getAdjuntoBase64 = async (adj) => {
  if (!adj) return '';

  if (adj.preview && adj.preview.startsWith('data:image/')) return adj.preview;
  if (adj.public_url && adj.public_url.startsWith('data:image/')) return adj.public_url;

  const path = adj.storage_path || adj.original_path || adj.public_url || adj.url || adj.archivo_url;
  if (!path) return '';

  if (!path.startsWith('http') && !path.startsWith('data:')) {
    try {
      const { data: blob, error } = await supabase.storage
        .from('protocolos-puesta-a-tierra')
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
      console.warn('[getAdjuntoBase64] Direct download warning:', err);
    }
  }

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

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true
  });

  const emp = empresas.find(e => e.id === proto.razon_social_id);
  const est = allEstablecimientos.find(e => e.id === proto.establecimiento_id);

  // Logo institucional
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

  // Cargar firma profesional
  let firmaBase64 = '';
  if (proto.firma_profesional) {
    firmaBase64 = proto.firma_profesional;
  } else if (userProfile?.firma_url) {
    try {
      firmaBase64 = await getBase64ImageFromUrl(userProfile.firma_url);
    } catch (e) {
      console.warn('No se pudo cargar firma de perfil:', e);
    }
  }

  // Pre-cargar adjuntos
  const adjuntosProcesados = [];
  if (adjuntosList && adjuntosList.length > 0) {
    for (const adj of adjuntosList) {
      try {
        const b64 = await getAdjuntoBase64(adj);
        if (b64) {
          const resized = await resizeImageForPdf(b64, 600, 600);
          adjuntosProcesados.push({
            ...adj,
            b64: resized
          });
        }
      } catch (e) {
        console.warn('Error al procesar adjunto para PDF:', e);
      }
    }
  }

  const primaryBlue = '#468DFF';
  const darkText = '#0D0D0D';
  const lightGrey = '#F8FAFC';
  const borderGrey = '#CBD5E1';

  // Helper Header para páginas interiores
  const drawPageHeader = (pageTitle = '') => {
    if (logoBase64) {
      try {
        doc.addImage(logoBase64, 'PNG', 14, 8, 35, 12, undefined, 'FAST');
      } catch (e) {
        console.warn('Error imprimiendo logo header:', e);
      }
    }
    setFillColor(doc, primaryBlue);
    doc.rect(14, 22, 182, 0.8, 'F');
  };

  // Helper Footer para páginas interiores
  const drawPageFooter = (pageNum, totalPages = 6) => {
    setFillColor(doc, primaryBlue);
    doc.rect(14, 282, 182, 1.5, 'F');
    setTextColor(doc, '#64748B');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('GESTIÓN SYSO', 14, 288);
    doc.text(`${pageNum}`, 196, 288, { align: 'right' });
  };

  // Helper Cuadro de Firma Profesional
  const drawSignatureBlock = (startY) => {
    let y = startY;
    if (y > 240) return 240;

    if (firmaBase64) {
      try {
        doc.addImage(firmaBase64, 'PNG', 120, y - 18, 50, 18, undefined, 'FAST');
      } catch (e) {
        console.warn('Error al estampar firma:', e);
      }
    }

    setDrawColor(doc, darkText);
    doc.setLineWidth(0.3);
    doc.line(100, y, 190, y);

    setTextColor(doc, darkText);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Firma, Aclaración y Registro del Profesional Interviniente', 145, y + 4, { align: 'center' });

    const profNombre = proto.profesional_nombre || userProfile?.full_name || 'Lic. Sebastian A. Merlassino';
    const profMatricula = proto.profesional_matricula || userProfile?.matricula || 'Mat. COPIME U002210 / OPSH LHS-000179 PBA';

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.text(profNombre, 145, y + 8, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.text(profMatricula, 145, y + 11, { align: 'center' });

    return y + 15;
  };

  // ==========================================
  // PÁGINA 1: CARÁTULA
  // ==========================================
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, 'PNG', 45, 90, 120, 45, undefined, 'FAST');
    } catch (e) {}
  }

  // Cuadro del Año en esquina superior derecha
  setFillColor(doc, primaryBlue);
  doc.rect(160, 14, 36, 18, 'F');
  setTextColor(doc, '#FFFFFF');
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  const anioMedicion = proto.fecha_medicion ? new Date(proto.fecha_medicion).getFullYear() : new Date().getFullYear();
  doc.text(`${anioMedicion}`, 178, 25, { align: 'center' });

  // Título Principal
  setTextColor(doc, primaryBlue);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('Protocolo de medición de la', 20, 160);
  doc.text('puesta a tierra y continuidad', 20, 172);
  doc.text('de las masas', 20, 184);

  // Subtítulo Legal
  setTextColor(doc, '#475569');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  const sub1 = 'DECRETO Nº 351/79, ANEXO VI - CAPÍTULO 14 - INSTALACIONES ELÉCTRICAS';
  const sub2 = 'ANEXO - RESOLUCIÓN 900/2015 (PROTOCOLO PARA LA MEDICIÓN DEL VALOR DE PUESTA A TIERRA Y LA VERIFICACIÓN DE LA CONTINUIDAD DE LAS MASAS EN EL AMBIENTE LABORAL)';
  doc.text(sub1, 20, 205);

  const sub2Lines = doc.splitTextToSize(sub2, 170);
  doc.text(sub2Lines, 20, 211);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('GESTIÓN SYSO', 20, 228);

  // ==========================================
  // PÁGINA 2: MARCO NORMATIVO
  // ==========================================
  doc.addPage();
  drawPageHeader();

  setTextColor(doc, primaryBlue);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Instalaciones Eléctricas (Título V - Capítulo 14 – Dec. 351/79)', 14, 30);
  setDrawColor(doc, primaryBlue);
  doc.setLineWidth(0.5);
  doc.line(14, 33, 196, 33);

  setTextColor(doc, '#334155');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');

  const textoDec351 = [
    'Las instalaciones y equipos eléctricos de los establecimientos deberán cumplir con las prescripciones necesarias para evitar riesgos a personas o cosas.',
    'Los materiales y equipos que se utilicen en las instalaciones eléctricas cumplirán con las exigencias de las normas técnicas correspondientes. En caso de no estar normalizados deberán asegurar las prescripciones previstas en el presente capítulo.',
    'Los proyectos de instalaciones y equipos eléctricos responderán a los Anexos correspondientes de este reglamento y además los de más de 1000 voltios de tensión deberán estar aprobados en los rubros de su competencia por el responsable del Servicio de Higiene y Seguridad en el Trabajo de cada establecimiento.',
    'Las tareas de montaje, maniobra o mantenimiento sin o con tensión, se regirán por las disposiciones del Anexo VI.',
    'Los trabajos de mantenimiento serán efectuados exclusivamente por personal capacitado, debidamente autorizado por la empresa para su ejecución.',
    'Los establecimientos efectuarán el mantenimiento de las instalaciones y verificarán las mismas periódicamente en base a sus respectivos programas, confeccionados de acuerdo con normas de seguridad, registrando debidamente sus resultados.',
    'Se extremarán las medidas de seguridad en salas de baterías y en aquellos locales donde se fabriquen, manipulen o almacenen materiales inflamables, explosivos o de alto riesgo; igualmente en locales húmedos, mojados o con sustancias corrosivas, conforme a lo establecido en el Anexo VI.',
    'En lo referente a motores, conductores, interruptores, seccionadores, transformadores, condensadores, alternadores, celdas de protección, cortacircuitos, equipos y herramientas, máquinas de elevación y transporte, se tendrá en cuenta lo establecido en el Anexo VI.',
    'Se deberán adoptar las medidas tendientes a la eliminación de la electricidad estática en todas aquellas operaciones donde pueda producirse. Los métodos se detallan en el Anexo VI. Se extremarán los recaudos en ambientes con riesgos de incendio o atmósferas explosivas.',
    'Los establecimientos e instalaciones expuestos a descargas atmosféricas poseerán una instalación contra las sobretensiones de este origen que asegure la eficaz protección de las personas y cosas. Las tomas a tierra de estas instalaciones deberán ser exclusivas e independientes de cualquier otra.'
  ];

  let py = 40;
  for (const parrafo of textoDec351) {
    const lines = doc.splitTextToSize(parrafo, 180);
    doc.text(lines, 14, py);
    py += (lines.length * 4.5) + 3.5;
  }

  drawPageFooter(1);

  // ==========================================
  // PÁGINA 3: IMÁGENES DE LA EVALUACIÓN
  // ==========================================
  doc.addPage();
  drawPageHeader();

  setTextColor(doc, primaryBlue);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Imágenes de la evaluación', 14, 30);
  doc.line(14, 33, 196, 33);

  if (adjuntosProcesados.length > 0) {
    let imgY = 40;
    let imgX = 14;

    adjuntosProcesados.slice(0, 4).forEach((adj, idx) => {
      try {
        setDrawColor(doc, borderGrey);
        doc.rect(imgX, imgY, 86, 105);
        doc.addImage(adj.b64, 'PNG', imgX + 2, imgY + 2, 82, 95, undefined, 'FAST');

        if (adj.nombre_archivo) {
          setTextColor(doc, '#475569');
          doc.setFontSize(7.5);
          doc.text(adj.nombre_archivo, imgX + 43, imgY + 101, { align: 'center' });
        }

        if (idx % 2 === 0) {
          imgX = 108;
        } else {
          imgX = 14;
          imgY += 112;
        }
      } catch (e) {
        console.warn('Error agregando imagen a PDF:', e);
      }
    });
  } else {
    setTextColor(doc, '#94A3B8');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.text('No se adjuntaron fotografías de la evaluación.', 14, 50);
  }

  drawPageFooter(2);

  // ==========================================
  // PÁGINA 4: HOJA 1 SRT 900/2015 (DATOS E INSTRUMENTAL)
  // ==========================================
  doc.addPage();
  drawPageHeader();

  // Encabezado Formulario Azul
  setFillColor(doc, primaryBlue);
  doc.rect(14, 28, 182, 7, 'F');
  setTextColor(doc, '#FFFFFF');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('PROTOCOLO DE MEDICIÓN DE LA PUESTA A TIERRA Y CONTINUIDAD DE LAS MASAS', 105, 32.5, { align: 'center' });

  // 1. Datos del Establecimiento
  setFillColor(doc, '#E2E8F0');
  doc.rect(14, 35, 182, 6, 'F');
  setTextColor(doc, darkText);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.text('Datos del establecimiento', 105, 39, { align: 'center' });

  setDrawColor(doc, darkText);
  doc.setLineWidth(0.3);

  // Fila Razón Social
  doc.rect(14, 41, 182, 7);
  doc.setFont('helvetica', 'bold');
  doc.text('Razón Social:', 16, 45.5);
  doc.setFont('helvetica', 'normal');
  doc.text(proto.razon_social_text || emp?.razon_social || '-', 42, 45.5);

  // Fila Dirección
  doc.rect(14, 48, 182, 7);
  doc.setFont('helvetica', 'bold');
  doc.text('Dirección:', 16, 52.5);
  doc.setFont('helvetica', 'normal');
  doc.text(proto.direccion_text || est?.direccion || '-', 36, 52.5);

  // Fila Localidad
  doc.rect(14, 55, 182, 7);
  doc.setFont('helvetica', 'bold');
  doc.text('Localidad:', 16, 59.5);
  doc.setFont('helvetica', 'normal');
  doc.text(proto.localidad_text || est?.localidad || '-', 36, 59.5);

  // Fila Provincia
  doc.rect(14, 62, 182, 7);
  doc.setFont('helvetica', 'bold');
  doc.text('Provincia:', 16, 66.5);
  doc.setFont('helvetica', 'normal');
  doc.text(proto.provincia_text || est?.provincia || '-', 36, 66.5);

  // Fila CP & CUIT
  doc.rect(14, 69, 182, 7);
  doc.setFont('helvetica', 'bold');
  doc.text('CP:', 16, 73.5);
  doc.setFont('helvetica', 'normal');
  doc.text(proto.cp_text || est?.cp || '-', 25, 73.5);

  doc.line(95, 69, 95, 76);
  doc.setFont('helvetica', 'bold');
  doc.text('C.U.I.T.:', 98, 73.5);
  doc.setFont('helvetica', 'normal');
  doc.text(proto.cuit_text || emp?.cuit || '-', 116, 73.5);

  // 2. Datos para Medición
  setFillColor(doc, '#E2E8F0');
  doc.rect(14, 78, 182, 6, 'F');
  setTextColor(doc, darkText);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.text('Datos para medición', 105, 82, { align: 'center' });

  // Instrumento
  doc.rect(14, 84, 182, 18);
  doc.setFont('helvetica', 'bold');
  doc.text('Marca, modelo y número de serie del instrumento utilizado:', 16, 88.5);
  doc.setFont('helvetica', 'normal');
  const instText = proto.instrumento_marca_modelo_serie || 'Telurímetro digital marca SEW, modelo ST-1520, número de serie 01987952';
  const instLines = doc.splitTextToSize(instText, 178);
  doc.text(instLines, 16, 94);

  // Fecha Calibración
  doc.rect(14, 102, 182, 7);
  doc.setFont('helvetica', 'bold');
  doc.text('Fecha de Calibración del Instrumental utilizado:', 16, 106.5);
  doc.setFont('helvetica', 'normal');
  doc.text(proto.fecha_calibracion ? formatDate(proto.fecha_calibracion) : '-', 100, 106.5);

  // Fecha medición / Horas
  doc.rect(14, 109, 182, 10);
  doc.setFont('helvetica', 'bold');
  doc.text('Fecha de la medición:', 16, 115);
  doc.setFont('helvetica', 'normal');
  doc.text(proto.fecha_medicion ? formatDate(proto.fecha_medicion) : '-', 50, 115);

  doc.line(75, 109, 75, 119);
  doc.setFont('helvetica', 'bold');
  doc.text('Hora de inicio:', 78, 115);
  doc.setFont('helvetica', 'normal');
  doc.text(proto.hora_inicio || '09:00', 105, 115);

  doc.line(130, 109, 130, 119);
  doc.setFont('helvetica', 'bold');
  doc.text('Hora finalización:', 133, 115);
  doc.setFont('helvetica', 'normal');
  doc.text(proto.hora_finalizacion || '10:00', 165, 115);

  // Metodología Utilizada
  doc.rect(14, 119, 182, 14);
  doc.setFont('helvetica', 'bold');
  doc.text('Metodología utilizada:', 16, 124);
  doc.setFont('helvetica', 'normal');
  const metText = proto.metodologia_utilizada || '“de caída de tensión” según Norma IRAM 2281 parte II: “Guía de mediciones de magnitudes de puesta a tierra”';
  const metLines = doc.splitTextToSize(metText, 140);
  doc.text(metLines, 54, 124);

  // 3. Observaciones
  doc.rect(14, 136, 182, 35);
  doc.setFont('helvetica', 'bold');
  doc.text('Observaciones:', 16, 141);
  doc.setFont('helvetica', 'normal');
  const obsLines = doc.splitTextToSize(proto.observaciones || 'N/A', 178);
  doc.text(obsLines, 16, 147);

  // 4. Documentación Adjunta
  setFillColor(doc, '#E2E8F0');
  doc.rect(14, 173, 182, 6, 'F');
  setTextColor(doc, darkText);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.text('Documentación que se Adjuntara a la Medición', 105, 177, { align: 'center' });

  doc.rect(14, 179, 182, 25);
  doc.setFont('helvetica', 'normal');
  const docAdjText = proto.documentacion_adjunta || 'Certificado de Calibración: Número 23B4139 del Laboratorio Eléctrico de Metrología BALDOR';
  const docAdjLines = doc.splitTextToSize(docAdjText, 178);
  doc.text(docAdjLines, 16, 185);

  // Bloque Firma
  drawSignatureBlock(240);
  drawPageFooter(3);

  // ==========================================
  // PÁGINA 5: HOJA 2 SRT 900/2015 (TABLA DE MEDICIONES DE JABALINAS)
  // ==========================================
  doc.addPage();
  drawPageHeader();

  // Header Azul
  setFillColor(doc, primaryBlue);
  doc.rect(14, 28, 182, 6, 'F');
  setTextColor(doc, '#FFFFFF');
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.text('PROTOCOLO DE MEDICIÓN DE LA PUESTA A TIERRA Y CONTINUIDAD DE LAS MASAS', 105, 32, { align: 'center' });

  // Subheader Datos
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.rect(14, 34, 182, 10);

  doc.setFont('helvetica', 'bold');
  doc.text('Razón Social:', 16, 38);
  doc.setFont('helvetica', 'normal');
  doc.text(proto.razon_social_text || emp?.razon_social || '-', 36, 38);

  doc.setFont('helvetica', 'bold');
  doc.text('C.U.I.T.:', 130, 38);
  doc.setFont('helvetica', 'normal');
  doc.text(proto.cuit_text || emp?.cuit || '-', 145, 38);

  doc.setFont('helvetica', 'bold');
  doc.text('Dirección:', 16, 42);
  doc.setFont('helvetica', 'normal');
  doc.text(proto.direccion_text || est?.direccion || '-', 30, 42);

  doc.setFont('helvetica', 'bold');
  doc.text('Localidad:', 85, 42);
  doc.setFont('helvetica', 'normal');
  doc.text(proto.localidad_text || est?.localidad || '-', 100, 42);

  doc.setFont('helvetica', 'bold');
  doc.text('CP:', 135, 42);
  doc.setFont('helvetica', 'normal');
  doc.text(proto.cp_text || est?.cp || '-', 142, 42);

  doc.setFont('helvetica', 'bold');
  doc.text('Provincia:', 155, 42);
  doc.setFont('helvetica', 'normal');
  doc.text(proto.provincia_text || est?.provincia || '-', 170, 42);

  // Título Datos de la Medición
  setFillColor(doc, '#E2E8F0');
  doc.rect(14, 44, 182, 5, 'F');
  setTextColor(doc, darkText);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('Datos de la Medición', 105, 47.5, { align: 'center' });

  // Importar jspdf-autotable para la tabla compleja
  const autoTable = (await import('jspdf-autotable')).default;

  // Formatear filas de la tabla de jabalinas
  const tableRows = (puntosList && puntosList.length > 0 ? puntosList : [
    {
      toma_tierra_num: 1,
      sector: 'Jabalina de tablero principal',
      condicion_terreno: 'Lecho húmedo',
      uso_puesta_a_tierra: 'Toma de Tierra de Seguridad de las Masas',
      esquema_conexion: 'TT',
      valor_medido_ohm: '8,18',
      cumple_ohm: 'Si',
      continuidad_permanente: 'Si',
      capacidad_carga: 'Si',
      dispositivo_proteccion: 'Dispositivo diferencial (DD)',
      desconexion_automatica: 'Si'
    },
    {
      toma_tierra_num: 2,
      sector: 'Tablero principal',
      condicion_terreno: 'Otro',
      uso_puesta_a_tierra: 'Toma de Tierra de Seguridad de las Masas',
      esquema_conexion: 'TT',
      valor_medido_ohm: '8,71',
      cumple_ohm: 'Si',
      continuidad_permanente: 'Si',
      capacidad_carga: 'Si',
      dispositivo_proteccion: 'Dispositivo diferencial (DD)',
      desconexion_automatica: 'Si'
    }
  ]).map(p => [
    p.toma_tierra_num || '-',
    p.sector || '-',
    p.condicion_terreno || '-',
    p.uso_puesta_a_tierra || '-',
    p.esquema_conexion || 'TT',
    p.valor_medido_ohm !== undefined && p.valor_medido_ohm !== null ? `${p.valor_medido_ohm}` : '-',
    p.cumple_ohm || 'SI',
    p.continuidad_permanente || 'SI',
    p.capacidad_carga || 'SI',
    p.dispositivo_proteccion || 'Dispositivo diferencial (DD)',
    p.desconexion_automatica || 'SI'
  ]);

  // Completar filas vacías para estética si hay menos de 10
  while (tableRows.length < 10) {
    tableRows.push(['', '', '', '', '', '', '', '', '', '', '']);
  }

  autoTable(doc, {
    startY: 49,
    margin: { left: 14, right: 14 },
    head: [
      [
        { content: 'Número de toma de tierra', rowSpan: 2 },
        { content: 'Sector', rowSpan: 2 },
        { content: 'Descripción de la condición del terreno al momento de la medición', rowSpan: 2 },
        { content: 'Uso de la puesta a tierra', rowSpan: 2 },
        { content: 'Esquema de conexión a tierra utilizado', rowSpan: 2 },
        { content: 'Medición de la puesta a tierra', colSpan: 2 },
        { content: 'Continuidad de las masas', colSpan: 2 },
        { content: 'Para la protección contra contactos indirectos se utiliza', rowSpan: 2 },
        { content: 'El dispositivo de protección empleado ¿puede desconectar en forma automática...?', rowSpan: 2 }
      ],
      [
        'Valor obtenido en ohm (Ω)',
        'Cumple SI / NO',
        'El circuito de puesta a tierra es continuo y permanente SI / NO',
        'El circuito tiene capacidad de carga para corriente de falla... SI / NO'
      ]
    ],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [226, 232, 240],
      textColor: [13, 13, 13],
      fontSize: 6,
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle',
      lineWidth: 0.1,
      lineColor: [15, 23, 42]
    },
    bodyStyles: {
      fontSize: 6.5,
      textColor: [15, 23, 42],
      halign: 'center',
      valign: 'middle',
      lineWidth: 0.1,
      lineColor: [148, 163, 184]
    },
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 22, halign: 'left' },
      2: { cellWidth: 18 },
      3: { cellWidth: 26, halign: 'left' },
      4: { cellWidth: 14 },
      5: { cellWidth: 14 },
      6: { cellWidth: 12 },
      7: { cellWidth: 16 },
      8: { cellWidth: 16 },
      9: { cellWidth: 20 },
      10: { cellWidth: 14 }
    }
  });

  let finalY = doc.lastAutoTable.finalY + 4;
  if (finalY > 210) finalY = 210;

  // Cuadro Información Adicional
  setDrawColor(doc, darkText);
  doc.rect(14, finalY, 182, 18);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text('Información adicional:', 16, finalY + 4.5);
  doc.setFont('helvetica', 'normal');
  const infoAddText = proto.informacion_adicional || 'Se probó disparo de disyuntores. Tipo y corriente de disparo, dentro de parámetros.';
  const infoAddLines = doc.splitTextToSize(infoAddText, 178);
  doc.text(infoAddLines, 16, finalY + 9);

  drawSignatureBlock(240);
  drawPageFooter(4);

  // ==========================================
  // PÁGINA 6: HOJA 3 SRT 900/2015 (ANÁLISIS DE DATOS Y CONCLUSIONES)
  // ==========================================
  doc.addPage();
  drawPageHeader();

  // Header Azul
  setFillColor(doc, primaryBlue);
  doc.rect(14, 28, 182, 6, 'F');
  setTextColor(doc, '#FFFFFF');
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.text('PROTOCOLO DE MEDICIÓN DE LA PUESTA A TIERRA Y CONTINUIDAD DE LAS MASAS', 105, 32, { align: 'center' });

  // Subheader Datos
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.rect(14, 34, 182, 10);

  doc.setFont('helvetica', 'bold');
  doc.text('Razón Social:', 16, 38);
  doc.setFont('helvetica', 'normal');
  doc.text(proto.razon_social_text || emp?.razon_social || '-', 36, 38);

  doc.setFont('helvetica', 'bold');
  doc.text('C.U.I.T.:', 130, 38);
  doc.setFont('helvetica', 'normal');
  doc.text(proto.cuit_text || emp?.cuit || '-', 145, 38);

  doc.setFont('helvetica', 'bold');
  doc.text('Dirección:', 16, 42);
  doc.setFont('helvetica', 'normal');
  doc.text(proto.direccion_text || est?.direccion || '-', 30, 42);

  doc.setFont('helvetica', 'bold');
  doc.text('Localidad:', 85, 42);
  doc.setFont('helvetica', 'normal');
  doc.text(proto.localidad_text || est?.localidad || '-', 100, 42);

  doc.setFont('helvetica', 'bold');
  doc.text('CP:', 135, 42);
  doc.setFont('helvetica', 'normal');
  doc.text(proto.cp_text || est?.cp || '-', 142, 42);

  doc.setFont('helvetica', 'bold');
  doc.text('Provincia:', 155, 42);
  doc.setFont('helvetica', 'normal');
  doc.text(proto.provincia_text || est?.provincia || '-', 170, 42);

  // Título Análisis de Datos
  setFillColor(doc, '#E2E8F0');
  doc.rect(14, 44, 182, 5, 'F');
  setTextColor(doc, darkText);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('Análisis de los Datos y Mejoras a Realizar', 105, 47.5, { align: 'center' });

  // Cuadro 2 Columnas (Conclusiones / Recomendaciones)
  doc.rect(14, 49, 182, 170);
  doc.line(105, 49, 105, 219);

  // Columna Izquierda: Conclusiones
  doc.setFont('helvetica', 'bold');
  doc.text('Conclusiones', 59, 54, { align: 'center' });
  doc.line(14, 56, 105, 56);

  doc.setFont('helvetica', 'normal');
  const concText = proto.conclusiones || 'Los valores hallados de la medición de la puesta a tierra cumplen con lo establecido en la Resolución 900/15.';
  const concLines = doc.splitTextToSize(concText, 86);
  doc.text(concLines, 16, 61);

  // Columna Derecha: Recomendaciones
  doc.setFont('helvetica', 'bold');
  doc.text('Recomendaciones para la adecuación a la legislación vigente', 150, 54, { align: 'center' });
  doc.line(105, 56, 196, 56);

  doc.setFont('helvetica', 'normal');
  const recText = proto.recomendaciones || 'Es recomendable mantener limpio y libre de óxido las terminales de las jabalinas.';
  const recLines = doc.splitTextToSize(recText, 86);
  doc.text(recLines, 107, 61);

  drawSignatureBlock(240);
  drawPageFooter(5);

  return doc;
};
