// src/app/[tenant-slug]/capacitaciones-online/utils/pdfGenerator.js
// jsPDF y autoTable se importan dinámicamente dentro de generateCapacitacionOnlinePDF()
import { formatDate } from '@/lib/utils';
import { printPdfDocument } from '@/lib/pdf/pdfPrintHelper';
import { getBase64ImageFromUrl } from '@/lib/pdf/pdfImages';
import { getPdfPrimaryColor } from '@/lib/pdf/pdfTheme';

function getImageDimensions(base64) {
  return new Promise((resolve) => {
    if (!base64 || typeof window === 'undefined') return resolve({ width: 100, height: 30 });
    const img = new Image();
    img.onload = () => resolve({ width: img.width || 100, height: img.height || 30 });
    img.onerror = () => resolve({ width: 100, height: 30 });
    img.src = base64;
  });
}

export async function generateCapacitacionOnlinePdf({
  capacitacion,
  registros = [],
  tenant = null,
  empresa = null,
  profile = null,
  adminProfile = null,
  supabase = null,
  action = 'download', // 'download' | 'print' | 'open'
  printWindow = null
}) {
  const jspdfModule = await import('jspdf');
  const jsPDF = jspdfModule.jsPDF || jspdfModule.default;
  const autoTableModule = await import('jspdf-autotable');
  const autoTable = autoTableModule.default || autoTableModule.autoTable || autoTableModule;
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Helper para resolver cualquier URL o path relativo de imagen en Supabase Storage
  const resolveStorageUrl = async (rawUrl, defaultBucket = 'signatures') => {
    if (!rawUrl) return null;
    if (rawUrl.startsWith('data:')) return rawUrl;

    let relativePath = rawUrl;
    let bucketName = defaultBucket;

    if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
      try {
        const urlObj = new URL(relativePath);
        const pathParts = urlObj.pathname.split('/');
        const bIdx = pathParts.findIndex(p => p === 'signatures' || p === 'documents' || p === 'avatars' || p === 'logos');
        if (bIdx !== -1 && bIdx < pathParts.length - 1) {
          bucketName = pathParts[bIdx];
          relativePath = pathParts.slice(bIdx + 1).join('/');
        } else {
          return rawUrl;
        }
      } catch (e) {
        console.error('Error parseando URL de firma:', e);
      }
    }

    if (supabase && relativePath && !relativePath.startsWith('http') && !relativePath.startsWith('data:')) {
      const candidateBuckets = Array.from(new Set([bucketName, 'signatures', 'documents', 'avatars', 'logos']));
      for (const b of candidateBuckets) {
        try {
          const { data: sData, error: sErr } = await supabase.storage
            .from(b)
            .createSignedUrl(relativePath, 3600);
          if (!sErr && sData?.signedUrl) {
            return sData.signedUrl;
          }
        } catch (sErr) {
          // Continuar con siguiente bucket candidato
        }
      }

      try {
        const { data: pData } = supabase.storage
          .from(bucketName)
          .getPublicUrl(relativePath);
        if (pData?.publicUrl) {
          return pData.publicUrl;
        }
      } catch (pErr) {
        console.error(`Error obteniendo URL pública para ${bucketName}/${relativePath}:`, pErr);
      }
    }

    return rawUrl;
  };

  // Colores del diseño base
  const COLOR_HEADER_BLUE = getPdfPrimaryColor(tenant); // Tenant primary_color or default [70, 141, 255]
  const COLOR_TEXT_MAIN = [15, 23, 42]; // Slate-900 / #0D0D0D
  const COLOR_TEXT_MUTED = [51, 65, 85]; // Slate-700
  const COLOR_BORDER = [0, 0, 0]; // Bordes negros exactos del diseño base

  const marginX = 10;
  const contentWidth = 190;

  // -------------------------------------------------------------
  // PRE-CARGA DE IMÁGENES (Logo y Firmas)
  // -------------------------------------------------------------
  let logoBase64 = null;
  try {
    const rawLogoUrl = tenant?.logo_1_url || profile?.logo_1_url || adminProfile?.logo_1_url || profile?.logo_url;
    const logoUrl = await resolveStorageUrl(rawLogoUrl, 'logos');
    if (logoUrl) {
      logoBase64 = await getBase64ImageFromUrl(logoUrl);
    }
  } catch (e) {
    logoBase64 = null;
  }

  if (!logoBase64) {
    try {
      logoBase64 = await getBase64ImageFromUrl('/brand/logo-black.png');
    } catch (e) {
      logoBase64 = null;
    }
  }

  // Pre-cargar imágenes base64 y dimensiones de firmas de asistentes
  const registrosWithSigBase64 = await Promise.all(
    registros.map(async (reg) => {
      if (!reg.firma_url) return { ...reg, firmaBase64: null, dims: null };
      try {
        const resolvedUrl = await resolveStorageUrl(reg.firma_url, 'signatures');
        const b64 = await getBase64ImageFromUrl(resolvedUrl);
        const dims = b64 ? await getImageDimensions(b64) : null;
        return { ...reg, firmaBase64: b64, dims };
      } catch (e) {
        return { ...reg, firmaBase64: null, dims: null };
      }
    })
  );

  // Pre-cargar firma del capacitador / administrador
  const rawTrainerSigUrl = profile?.signature_url || profile?.firma_url || adminProfile?.signature_url || adminProfile?.firma_url || null;
  const userHasSig = Boolean(profile?.signature_url || profile?.firma_url);

  let activeNombre = profile?.full_name || profile?.nombre_apellido || (profile?.nombre && profile?.apellido ? `${profile.nombre} ${profile.apellido}` : null);
  if (!userHasSig && adminProfile) {
    activeNombre = adminProfile?.full_name || adminProfile?.nombre_apellido || (adminProfile?.nombre && adminProfile?.apellido ? `${adminProfile.nombre} ${adminProfile.apellido}` : activeNombre);
  }
  if (!activeNombre) {
    activeNombre = capacitacion?.capacitador_nombre || 'Profesional de Higiene y Seguridad';
  }

  // Resolución completa de TODAS las matrículas asociadas al perfil/miembro en la tabla `matriculas`
  const activeProfile = userHasSig ? profile : (adminProfile || profile);
  const activeUserId = activeProfile?.id || profile?.id || adminProfile?.id;
  const activeMemberId = activeProfile?.miembro_id || activeProfile?.equipo_miembro_id || null;

  let matriculaItems = [];

  // Consulta limpia por profile_id sin incluir columnas inexistentes (evitando PostgREST 400 Bad Request)
  if (supabase && activeUserId) {
    try {
      const { data: matData, error: matErr } = await supabase
        .from('matriculas')
        .select('institucion, numero')
        .eq('profile_id', activeUserId)
        .order('created_at', { ascending: true });

      if (!matErr && matData && matData.length > 0) {
        matriculaItems = matData;
      }
    } catch (e) {
      console.error('Error al consultar tabla matriculas por profile_id:', e);
    }
  }

  if (matriculaItems.length === 0 && supabase && activeMemberId) {
    try {
      const { data: mMemberData, error: mMemberErr } = await supabase
        .from('matriculas')
        .select('institucion, numero')
        .eq('miembro_id', activeMemberId)
        .order('created_at', { ascending: true });

      if (!mMemberErr && mMemberData && mMemberData.length > 0) {
        matriculaItems = mMemberData;
      }
    } catch (e) {
      console.error('Error al consultar tabla matriculas por miembro_id:', e);
    }
  }

  if (matriculaItems.length === 0) {
    if (activeProfile?.matriculas && Array.isArray(activeProfile.matriculas) && activeProfile.matriculas.length > 0) {
      matriculaItems = activeProfile.matriculas;
    } else if (activeProfile?.matricula_numero || activeProfile?.matricula) {
      matriculaItems = [{
        institucion: activeProfile.matricula_institucion || '',
        numero: activeProfile.matricula_numero || activeProfile.matricula || ''
      }];
    } else if (adminProfile?.matricula_numero || adminProfile?.matricula) {
      matriculaItems = [{
        institucion: adminProfile.matricula_institucion || '',
        numero: adminProfile.matricula_numero || adminProfile.matricula || ''
      }];
    }
  }

  let activeMatricula = '';
  if (matriculaItems.length > 0) {
    const list = matriculaItems
      .map(m => {
        if (!m) return '';
        const inst = m.institucion ? m.institucion.trim() : '';
        let num = m.numero ? m.numero.trim() : '';
        if (!num) return inst;
        if (num.startsWith('N°') || num.startsWith('Mat') || num.startsWith('COPIME') || num.startsWith('CPSH')) {
          return inst ? `${inst} ${num}` : num;
        }
        return inst ? `${inst} N° ${num}` : `N° ${num}`;
      })
      .filter(Boolean);

    const uniqueList = Array.from(new Set(list));
    activeMatricula = uniqueList.join(' / ');
  }

  let trainerSigBase64 = null;
  let trainerSigDims = null;
  if (rawTrainerSigUrl) {
    try {
      const activeFirmaUrl = await resolveStorageUrl(rawTrainerSigUrl, 'signatures');
      if (activeFirmaUrl) {
        trainerSigBase64 = await getBase64ImageFromUrl(activeFirmaUrl);
        if (trainerSigBase64) {
          trainerSigDims = await getImageDimensions(trainerSigBase64);
        }
      }
    } catch (sigErr) {
      console.error('Error al pre-cargar firma de capacitador:', sigErr);
    }
  }

  // -------------------------------------------------------------
  // CÁLCULO DE PAGINACIÓN (Máximo 15 filas por hoja oficial)
  // -------------------------------------------------------------
  const ROWS_PER_PAGE = 15;
  const totalAttendeeRows = registrosWithSigBase64.length;
  const totalPagesCount = Math.max(1, Math.ceil(totalAttendeeRows / ROWS_PER_PAGE));

  for (let pageIdx = 0; pageIdx < totalPagesCount; pageIdx++) {
    if (pageIdx > 0) {
      doc.addPage();
    }
    let currentY = 5;

    // -------------------------------------------------------------
    // 1. ENCABEZADO (Logo Principal + Título Principal)
    // -------------------------------------------------------------
    if (logoBase64) {
      try {
        const dims = await getImageDimensions(logoBase64);
        const maxW = 60;
        const maxH = 20;
        const ratio = dims.width / dims.height;

        let renderW = maxW;
        let renderH = maxW / ratio;
        if (renderH > maxH) {
          renderH = maxH;
          renderW = maxH * ratio;
        }

        doc.addImage(logoBase64, 'PNG', marginX, currentY, renderW, renderH, undefined, 'FAST');
        // Espaciado limpio de 3mm entre el logo y la barra de título (evitando superposición)
        currentY += renderH + 3;
      } catch (e) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(...COLOR_HEADER_BLUE);
        doc.text('GESTIÓN SySO', marginX, currentY + 7);
        currentY += 11;
      }
    } else {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(...COLOR_HEADER_BLUE);
      doc.text('GESTIÓN SySO', marginX, currentY + 7);
      currentY += 11;
    }

    // Barra Azul de Título Principal (Relleno #468DFF)
    doc.setFillColor(...COLOR_HEADER_BLUE);
    doc.setDrawColor(...COLOR_BORDER);
    doc.setLineWidth(0.4);
    doc.rect(marginX, currentY, contentWidth, 7.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text('Registro de Capacitación de Higiene y Seguridad en el Trabajo', marginX + contentWidth / 2, currentY + 5.2, { align: 'center' });

    currentY += 7.5;

    // -------------------------------------------------------------
    // 2. CAMPO TEMA (Texto normal, soporte multilínea y recuadro dinámico)
    // -------------------------------------------------------------
    const temaText = String(capacitacion?.titulo || 'Capacitación General');
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    const temaLines = doc.splitTextToSize(temaText, contentWidth - 20);

    const lineH = 4.0;
    const padY = 3.5;
    const calculatedBoxHeight = Math.max(10, (padY * 2) + (temaLines.length * lineH) - 2);

    doc.setFillColor(255, 255, 255);
    doc.setLineWidth(0.4);
    doc.rect(marginX, currentY, contentWidth, calculatedBoxHeight, 'D');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...COLOR_TEXT_MAIN);
    doc.text('Tema:', marginX + 3, currentY + 5.8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);

    temaLines.forEach((line, idx) => {
      doc.text(line, marginX + 16, currentY + 5.8 + (idx * lineH));
    });

    currentY += calculatedBoxHeight;

    // -------------------------------------------------------------
    // 3. GRILLA DE METADATOS (Razón Social, Fecha, Hora, Duración, Metodología, Material entregado)
    // -------------------------------------------------------------
    const rowHeight = 6.5;
    const gridHeight = rowHeight * 3; // 19.5 mm

    doc.rect(marginX, currentY, contentWidth, gridHeight, 'D');

    // Líneas horizontales de división
    doc.line(marginX, currentY + rowHeight, marginX + contentWidth, currentY + rowHeight);
    doc.line(marginX, currentY + rowHeight * 2, marginX + contentWidth, currentY + rowHeight * 2);

    // Fila 1: Razón Social
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...COLOR_TEXT_MAIN);
    doc.text('Razón Social:', marginX + 3, currentY + 4.5);
    doc.setFont('helvetica', 'normal');
    const razonSocial = empresa?.razon_social || capacitacion?.empresa_nombre || tenant?.name || 'Gestión SySO';
    doc.text(String(razonSocial), marginX + 28, currentY + 4.5);

    // Fila 2: Fecha | Hora | Duración
    const col2_1 = marginX + 70;
    const col2_2 = marginX + 130;

    doc.line(col2_1, currentY + rowHeight, col2_1, currentY + rowHeight * 2);
    doc.line(col2_2, currentY + rowHeight, col2_2, currentY + rowHeight * 2);

    let fechaDisplay = '';
    let horaDisplay = '';

    if (capacitacion?.fecha) {
      fechaDisplay = formatDate(capacitacion.fecha);
    } else if (registros && registros.length > 0) {
      const dates = registros
        .map(r => r.registrado_at ? new Date(r.registrado_at) : null)
        .filter(Boolean)
        .sort((a, b) => a - b);

      if (dates.length > 0) {
        const minDate = dates[0];
        const maxDate = dates[dates.length - 1];
        const minStr = formatDate(minDate);
        const maxStr = formatDate(maxDate);

        fechaDisplay = minStr === maxStr ? minStr : `${minStr} - ${maxStr}`;
      }
    }

    if (!fechaDisplay) {
      fechaDisplay = capacitacion?.created_at ? formatDate(capacitacion.created_at) : formatDate(new Date());
    }

    if (capacitacion?.hora) {
      horaDisplay = capacitacion.hora;
    } else if (registros && registros.length > 1) {
      horaDisplay = 'Asincrónica (SRT 2/22)';
    } else if (registros && registros.length === 1 && registros[0].registrado_at) {
      horaDisplay = new Date(registros[0].registrado_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
    } else {
      horaDisplay = capacitacion?.created_at ? new Date(capacitacion.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) : 'Asincrónica';
    }

    // Fecha
    doc.setFont('helvetica', 'bold');
    doc.text('Fecha:', marginX + 3, currentY + rowHeight + 4.5);
    doc.setFont('helvetica', 'normal');
    doc.text(String(fechaDisplay), marginX + 17, currentY + rowHeight + 4.5);

    // Hora
    doc.setFont('helvetica', 'bold');
    doc.text('Hora:', col2_1 + 3, currentY + rowHeight + 4.5);
    doc.setFont('helvetica', 'normal');
    doc.text(String(horaDisplay), col2_1 + 16, currentY + rowHeight + 4.5);

    // Duración
    doc.setFont('helvetica', 'bold');
    doc.text('Duración:', col2_2 + 3, currentY + rowHeight + 4.5);
    doc.setFont('helvetica', 'normal');
    const duracionVal = capacitacion?.duracion_valor !== undefined && capacitacion?.duracion_valor !== null
      ? `${capacitacion.duracion_valor} ${capacitacion.duracion_unidad === 'hs' ? 'Hs' : 'Min'}`
      : (capacitacion?.duracion || '45 Min');
    doc.text(String(duracionVal), col2_2 + 21, currentY + rowHeight + 4.5);

    // Fila 3: Metodologia | Material entregado
    const col3_1 = marginX + 130;
    doc.line(col3_1, currentY + rowHeight * 2, col3_1, currentY + gridHeight);

    doc.setFont('helvetica', 'bold');
    doc.text('Metodologia:', marginX + 3, currentY + rowHeight * 2 + 4.5);
    doc.setFont('helvetica', 'normal');
    const metodolStr = capacitacion?.metodologia || 'Asincrónica con PowerPoint';
    doc.text(String(metodolStr), marginX + 28, currentY + rowHeight * 2 + 4.5);

    doc.setFont('helvetica', 'bold');
    doc.text('Material entregado:', col3_1 + 3, currentY + rowHeight * 2 + 4.5);
    doc.setFont('helvetica', 'normal');
    doc.text('NO', col3_1 + 38, currentY + rowHeight * 2 + 4.5);

    currentY += gridHeight;

    // -------------------------------------------------------------
    // 4. TABLA DE ASISTENTES (Exactamente 15 filas por hoja oficial)
    // -------------------------------------------------------------
    doc.setFillColor(226, 232, 240); // Slate-200 / #E2E8F0
    doc.setDrawColor(...COLOR_BORDER);
    doc.rect(marginX, currentY, contentWidth, 5.5, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...COLOR_TEXT_MAIN);
    doc.text('Asistentes', marginX + contentWidth / 2, currentY + 3.8, { align: 'center' });

    currentY += 5.5;

    const startIdx = pageIdx * ROWS_PER_PAGE;
    const endIdx = startIdx + ROWS_PER_PAGE;
    const pageRegistros = registrosWithSigBase64.slice(startIdx, endIdx);

    const tableData = [];
    for (let i = 0; i < ROWS_PER_PAGE; i++) {
      const reg = pageRegistros[i];
      if (reg) {
        tableData.push([
          reg.nombre_apellido || '',
          reg.dni || '',
          reg.puesto || '',
          ''
        ]);
      } else {
        tableData.push(['', '', '', '']);
      }
    }

    autoTable(doc, {
      startY: currentY,
      margin: { left: marginX, right: marginX },
      head: [['Nombre y Apellido', 'D.N.I.', 'Puesto / Cargo', 'Firma']],
      body: tableData,
      theme: 'grid',
      tableLineWidth: 0.3,
      tableLineColor: COLOR_BORDER,
      headStyles: {
        fillColor: [241, 245, 249],
        textColor: COLOR_TEXT_MAIN,
        fontSize: 8.5,
        fontStyle: 'bold',
        halign: 'center',
        valign: 'middle',
        lineWidth: 0.3,
        lineColor: COLOR_BORDER
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [30, 41, 59],
        valign: 'middle',
        minCellHeight: 7.8,
        lineWidth: 0.3,
        lineColor: COLOR_BORDER
      },
      columnStyles: {
        0: { cellWidth: 62 },
        1: { cellWidth: 32, halign: 'center' },
        2: { cellWidth: 54 },
        3: { cellWidth: 42, halign: 'center' }
      },
      didDrawCell: (data) => {
        if (data.section === 'body' && data.column.index === 3) {
          const reg = pageRegistros[data.row.index];
          if (reg && reg.firmaBase64) {
            try {
              const fmt = reg.firmaBase64.includes('data:image/jpeg') || reg.firmaBase64.includes('data:image/jpg') ? 'JPEG' : 'PNG';
              const maxW = data.cell.width - 6;
              const maxH = data.cell.height - 2;
              const ratio = (reg.dims && reg.dims.width && reg.dims.height) ? (reg.dims.width / reg.dims.height) : 2.5;

              let renderW = maxW;
              let renderH = maxW / ratio;
              if (renderH > maxH) {
                renderH = maxH;
                renderW = maxH * ratio;
              }

              const xPos = data.cell.x + (data.cell.width / 2) - (renderW / 2);
              const yPos = data.cell.y + (data.cell.height / 2) - (renderH / 2);

              doc.addImage(
                reg.firmaBase64,
                fmt,
                xPos,
                yPos,
                renderW,
                renderH,
                undefined,
                'FAST'
              );
            } catch (e) {
              console.error('Error al incrustar firma en celda PDF:', e);
            }
          }
        }
      }
    });

    let finalY = doc.lastAutoTable?.finalY || (currentY + 115);

    // -------------------------------------------------------------
    // 5. RECUADRO OBSERVACIONES (En todas las hojas oficiales)
    // -------------------------------------------------------------
    const legalNote = 'Los datos de los participantes se recabaron mediante el uso de una aplicación informática, según lo dispuesto en la Disposición SRT 2/22 y la Resolución 48/25.';
    const attendeeObsList = (registros || [])
      .filter(r => r.observaciones && r.observaciones.trim())
      .map(r => `${r.nombre_apellido}: ${r.observaciones.trim()}`);

    let fullObsStr = legalNote;
    if (attendeeObsList.length > 0) {
      fullObsStr += ` — Observaciones de asistentes: ${attendeeObsList.join('; ')}`;
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    const obsLines = doc.splitTextToSize(fullObsStr, contentWidth - 6);
    const calculatedObsHeight = Math.max(14, (obsLines.length * 3.4) + 6);

    doc.rect(marginX, finalY, contentWidth, calculatedObsHeight, 'D');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...COLOR_TEXT_MAIN);
    doc.text('Observaciones:', marginX + 3, finalY + 4);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(51, 65, 85);

    obsLines.forEach((line, idx) => {
      doc.text(line, marginX + 3, finalY + 8 + (idx * 3.4));
    });

    finalY += calculatedObsHeight;

    // -------------------------------------------------------------
    // 6. FIRMA Y ACLARACIÓN DEL CAPACITADOR / ADMINISTRADOR (En todas las hojas oficiales)
    // -------------------------------------------------------------
    const firmaBoxHeight = 28;
    doc.rect(marginX, finalY, contentWidth, firmaBoxHeight, 'D');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...COLOR_TEXT_MAIN);
    doc.text('Firma y Aclaración del Capacitador:', marginX + 3, finalY + 4.5);

    const lineY = finalY + 23.8;

    if (trainerSigBase64) {
      try {
        const maxW = 60;
        const maxH = 30;
        const ratio = (trainerSigDims && trainerSigDims.width && trainerSigDims.height) ? (trainerSigDims.width / trainerSigDims.height) : 2.2;

        let renderW = maxW;
        let renderH = maxW / ratio;
        if (renderH > maxH) {
          renderH = maxH;
          renderW = maxH * ratio;
        }

        const renderX = marginX + 4;
        const renderY = lineY - (renderH * 0.78);

        const fmt = trainerSigBase64.includes('data:image/jpeg') || trainerSigBase64.includes('data:image/jpg') ? 'JPEG' : 'PNG';
        doc.addImage(trainerSigBase64, fmt, renderX, renderY, renderW, renderH, undefined, 'FAST');
      } catch (sigErr) {
        console.error('Error al incrustar firma de capacitador:', sigErr);
      }
    }

    // Texto de Aclaración y Matrículas (En tipografía normal sin negrita, con todas las matrículas concatenadas)
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);
    const matText = activeMatricula ? ` - Matrícula: ${activeMatricula}` : '';
    doc.text(`${activeNombre}${matText}`, marginX + 3, lineY);

    finalY += firmaBoxHeight;

    // -------------------------------------------------------------
    // 7. MEDICIÓN DE LA EFICACIA & VERIFICADO POR (En todas las hojas oficiales)
    // -------------------------------------------------------------
    const eficaciaHeight = 20;
    const leftWidth = 114;
    const rightWidth = contentWidth - leftWidth; // 76 mm

    doc.rect(marginX, finalY, leftWidth, eficaciaHeight, 'D');
    doc.rect(marginX + leftWidth, finalY, rightWidth, eficaciaHeight, 'D');

    // Lado Izquierdo: Medición de la eficacia
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...COLOR_TEXT_MAIN);
    doc.text('Medición de la eficacia:', marginX + 3, finalY + 4);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);

    const effChoice = String(capacitacion?.medicion_eficacia || '').toLowerCase();

    const isOral = effChoice.includes('oral');
    const isEscrita = effChoice.includes('escrita');
    const isPractica = effChoice.includes('práctica') || effChoice.includes('practica');
    const isOtra = effChoice.includes('otra');

    doc.text(`${isOral ? '[X]' : '[  ]'} Evaluación oral`, marginX + 3, finalY + 8);
    doc.text(`${isEscrita ? '[X]' : '[  ]'} Evaluación escrita`, marginX + 3, finalY + 12);
    doc.text(`${isPractica ? '[X]' : '[  ]'} Evaluación práctica`, marginX + 3, finalY + 16);

    const isPuesto = effChoice.includes('puesto');
    const isAuditoria = effChoice.includes('auditoría') || effChoice.includes('auditoria');
    const isSimulacro = effChoice.includes('simulacro');

    doc.text(`${isPuesto ? '[X]' : '[  ]'} Evaluación en el puesto de trabajo`, marginX + 50, finalY + 8);
    doc.text(`${isAuditoria ? '[X]' : '[  ]'} Auditoría`, marginX + 50, finalY + 12);
    doc.text(`${isSimulacro ? '[X]' : '[  ]'} Simulacro`, marginX + 50, finalY + 16);

    doc.text(`${isOtra ? '[X]' : '[  ]'} Otra: ................................................................................`, marginX + 3, finalY + 19);

    // Lado Derecho: Fecha & Verificado por
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('Fecha:', marginX + leftWidth + 3, finalY + 4);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    if (capacitacion?.eficacia_fecha) {
      doc.text(String(formatDate(capacitacion.eficacia_fecha)), marginX + leftWidth + 18, finalY + 4);
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('Verificado por:', marginX + leftWidth + 3, finalY + 11);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    if (capacitacion?.eficacia_verificado_por) {
      doc.text(String(capacitacion.eficacia_verificado_por), marginX + leftWidth + 3, finalY + 15.5);
    }
  }

  // -------------------------------------------------------------
  // 8. PIE DE PÁGINA ESTÁNDAR GLOBAL (Línea Azul + Nombre Comercial + Teléfono + Email + Pagina X de Y)
  // -------------------------------------------------------------
  const totalPages = doc.internal.getNumberOfPages();
  const startX = 10;
  const endX = 200;
  const totalW = endX - startX; // 190 mm
  const barY = 282;
  const textY = 286.5;

  // Resolución de datos dinámicos según requerimiento
  const companyName = tenant?.name || tenant?.razon_social || profile?.nombre_comercial || profile?.empresa || adminProfile?.nombre_comercial || 'Gestión SySO';
  const phoneVal = profile?.phone || profile?.telefono || tenant?.phone || tenant?.telefono || '';
  const emailVal = profile?.email || tenant?.email || tenant?.correo || 'contacto@gestionsyso.com';

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // 1. Línea Superior de Acento Azul (#468DFF)
    doc.setDrawColor(...COLOR_HEADER_BLUE);
    doc.setLineWidth(0.35);
    doc.line(startX, barY, endX, barY);

    // 2. Texto de Contacto Centrado: [Nombre Comercial] • Tel: [telefono] • Email: [email]
    const boldText = String(companyName);
    const normalText = `  •  Tel: ${phoneVal}  •  Email: ${emailVal}`;

    doc.setFontSize(7.5);
    doc.setTextColor(...COLOR_TEXT_MUTED);

    doc.setFont('helvetica', 'bold');
    const boldWidth = doc.getTextWidth(boldText);

    doc.setFont('helvetica', 'normal');
    const normalWidth = doc.getTextWidth(normalText);

    const totalTextWidth = boldWidth + normalWidth;
    const lineStartX = startX + (totalW / 2) - (totalTextWidth / 2);

    doc.setFont('helvetica', 'bold');
    doc.text(boldText, lineStartX, textY);

    doc.setFont('helvetica', 'normal');
    textY && doc.text(normalText, lineStartX + boldWidth, textY);

    // 3. Numeración de Página Estándar a la Derecha (Página X de Y)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105); // Slate-600
    doc.text(`Página ${i} de ${totalPages}`, endX, textY, { align: 'right' });
  }

  // -------------------------------------------------------------
  // DESPACHO / ACCIÓN: DESCARGAR O ABRIR/IMPRIMIR
  // -------------------------------------------------------------
  const cleanTitle = (capacitacion?.titulo || 'capacitacion')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .slice(0, 30);
  const fileName = `registro_capacitacion_${cleanTitle}.pdf`;

  if (action === 'print') {
    printPdfDocument(doc, printWindow, `Registro Capacitación - ${capacitacion?.titulo || ''}`);
    return doc.output('bloburl');
  } else if (action === 'open') {
    const blobUrl = doc.output('bloburl');
    window.open(blobUrl, '_blank');
    return blobUrl;
  } else if (action === 'blob') {
    return doc.output('blob');
  } else if (action === 'doc') {
    return doc;
  } else {
    doc.save(fileName);
    return fileName;
  }
}
