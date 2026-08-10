// src/app/[tenant-slug]/capacitaciones-online/utils/pdfGenerator.js
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatDate } from '@/lib/utils';

export async function generateCapacitacionOnlinePdf({ capacitacion, registros = [], tenant, empresa }) {
  const doc = new jsPDF('p', 'mm', 'a4');

  const COLOR_AZUL = [70, 141, 255]; // #468DFF
  const COLOR_NEGRO = [15, 23, 42]; // Slate-900
  const COLOR_GRIS = [100, 116, 139]; // Slate-500
  const COLOR_BG_HEADER = [241, 245, 249]; // Slate-100

  // 1. Carátula / Encabezado Principal
  let y = 15;

  // Recuadro superior
  doc.setLineWidth(0.5);
  doc.setDrawColor(...COLOR_AZUL);
  doc.setFillColor(...COLOR_BG_HEADER);
  doc.roundedRect(14, y, 182, 26, 3, 3, 'FD');

  // Título principal en PDF
  doc.setTextColor(...COLOR_AZUL);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('REGISTRO DE CAPACITACIÓN Y ASISTENCIA', 20, y + 10);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLOR_GRIS);
  doc.text('Constancia Digital de Asistencia — Res. SRT 905/15 / Ley 19.587 Dec. 351/79', 20, y + 18);

  y += 32;

  // 2. Bloque de Datos de la Capacitación
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, y, 182, 38, 2, 2, 'FD');

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLOR_NEGRO);

  doc.text('Tema / Tema de Capacitación:', 18, y + 8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLOR_AZUL);
  doc.text(String(capacitacion?.titulo || 'Capacitación General'), 72, y + 8);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLOR_NEGRO);
  doc.text('Razón Social (Empresa):', 18, y + 15);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.text(String(empresa?.razon_social || capacitacion?.empresa_nombre || 'Gestión SySO'), 65, y + 15);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLOR_NEGRO);
  doc.text('Puesto / Alcance Asignado:', 18, y + 22);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.text(String(capacitacion?.target_puesto || 'Todo el Personal'), 70, y + 22);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLOR_NEGRO);
  doc.text('Materiales Incluidos:', 18, y + 29);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  const materialTxt = [
    capacitacion?.video_url ? 'Video Instructivo (YouTube)' : null,
    capacitacion?.document_url ? 'Presentación PDF/PPT' : null
  ].filter(Boolean).join(' + ') || 'Material Multimedia Virtual';
  doc.text(materialTxt, 60, y + 29);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLOR_NEGRO);
  doc.text('Total Asistentes Firmantes:', 130, y + 15);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLOR_AZUL);
  doc.text(`${registros.length} Empleado(s)`, 130, y + 22);

  y += 44;

  // 3. Tabla de Asistentes Firmantes
  const tableHead = [['Nº', 'Nombre y Apellido', 'DNI', 'Puesto de Trabajo', 'Fecha / Hora', 'Firma Digital']];

  const tableData = registros.map((reg, idx) => [
    idx + 1,
    reg.nombre_apellido || '-',
    reg.dni || '-',
    reg.puesto || '-',
    reg.registrado_at ? formatDate(reg.registrado_at) : '-',
    '' // Espacio reservado para la firma
  ]);

  autoTable(doc, {
    startY: y,
    head: tableHead,
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: COLOR_AZUL,
      textColor: [255, 255, 255],
      fontSize: 9,
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle'
    },
    bodyStyles: {
      fontSize: 8.5,
      textColor: [30, 41, 59],
      valign: 'middle',
      minCellHeight: 14
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 48 },
      2: { cellWidth: 26, halign: 'center' },
      3: { cellWidth: 42 },
      4: { cellWidth: 26, halign: 'center' },
      5: { cellWidth: 30, halign: 'center' }
    },
    didDrawCell: (data) => {
      // Si es celda de firma en el cuerpo
      if (data.section === 'body' && data.column.index === 5) {
        const reg = registros[data.row.index];
        if (reg && reg.firma_url && reg.firma_url.startsWith('data:image/')) {
          try {
            doc.addImage(
              reg.firma_url,
              'PNG',
              data.cell.x + 2,
              data.cell.y + 1,
              data.cell.width - 4,
              data.cell.height - 2,
              undefined,
              'FAST'
            );
          } catch (e) {
            console.error('Error al incrustar firma en PDF:', e);
          }
        }
      }
    }
  });

  // Pie de página con numeración
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(...COLOR_GRIS);
    doc.setLineWidth(0.3);
    doc.setDrawColor(226, 232, 240);
    doc.line(14, 282, 196, 282);
    
    doc.text('Gestión SySO — Plataforma de Higiene, Seguridad y Medicina del Trabajo', 14, 287);
    doc.text(`Página ${i} de ${pageCount}`, 196, 287, { align: 'right' });
  }

  // Descargar el PDF
  const cleanTitle = (capacitacion?.titulo || 'capacitacion')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .slice(0, 30);
  doc.save(`registro_capacitacion_${cleanTitle}.pdf`);
}
