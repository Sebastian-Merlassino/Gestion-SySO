// src/app/[tenant-slug]/facturacion/utils/facturaPdfGenerator.js
// Generates official ARCA-compliant invoice PDF using jsPDF and jspdf-autotable
'use strict';
import { PDF_THEME, getPdfPrimaryColor, setFillColor, setDrawColor, setTextColor } from '@/lib/pdf/pdfTheme';

/**
 * Returns human-readable voucher letter and code
 */
export function getVoucherTypeDetails(cbteTipo) {
  const map = {
    1: { letra: 'A', desc: 'FACTURA A', codigo: '01' },
    6: { letra: 'B', desc: 'FACTURA B', codigo: '06' },
    11: { letra: 'C', desc: 'FACTURA C', codigo: '11' },
    2: { letra: 'A', desc: 'NOTA DE DÉBITO A', codigo: '02' },
    7: { letra: 'B', desc: 'NOTA DE DÉBITO B', codigo: '07' },
    12: { letra: 'C', desc: 'NOTA DE DÉBITO C', codigo: '12' },
    3: { letra: 'A', desc: 'NOTA DE CRÉDITO A', codigo: '03' },
    8: { letra: 'B', desc: 'NOTA DE CRÉDITO B', codigo: '08' },
    13: { letra: 'C', desc: 'NOTA DE CRÉDITO C', codigo: '13' },
    99: { letra: 'X', desc: 'COMPROBANTE / REMITO INTERNO', codigo: 'X', isInterno: true },
  };
  return map[cbteTipo] || { letra: 'C', desc: 'FACTURA C', codigo: '11' };
}

/**
 * Generates verification QR payload URL for ARCA
 */
export function generateArcaQrUrl({
  fecha,
  cuitEmisor,
  ptoVta,
  tipoCmp,
  nroCmp,
  importe,
  moneda = 'PES',
  cotiz = 1,
  tipoDocRec = 80,
  nroDocRec = 0,
  tipoCodAut = 'E',
  codAut,
}) {
  const qrData = {
    ver: 1,
    fecha: fecha || new Date().toISOString().split('T')[0],
    cuit: cuitEmisor ? parseInt(String(cuitEmisor).replace(/\D/g, '')) : 0,
    ptoVta: parseInt(ptoVta) || 1,
    tipoCmp: parseInt(tipoCmp) || 11,
    nroCmp: parseInt(nroCmp) || 1,
    importe: parseFloat(importe) || 0,
    moneda,
    ctz: cotiz,
    tipoDocRec: parseInt(tipoDocRec) || 99,
    nroDocRec: parseInt(String(nroDocRec).replace(/\D/g, '')) || 0,
    tipoCodAut,
    codAut: codAut ? parseInt(String(codAut).replace(/\D/g, '')) : 0,
  };

  const jsonStr = JSON.stringify(qrData);
  const base64 = typeof window !== 'undefined' ? btoa(unescape(encodeURIComponent(jsonStr))) : Buffer.from(jsonStr).toString('base64');
  return `https://www.afip.gob.ar/fe/qr/?p=${base64}`;
}

/**
 * Generates an official invoice PDF
 * 
 * @param {Object} params
 * @param {Object} params.factura - Invoice record
 * @param {Object} params.config - Tenant ARCA configuration
 * @param {Object} [params.tenant] - Tenant record for styling/branding
 * @param {Object} [params.profile] - User profile for fallback info
 * @param {string} [params.mode] - 'download' | 'preview' | 'blob'
 * @returns {Promise<Blob|string|void>}
 */
export async function generateFacturaPdf({ factura, config, tenant = null, profile = null, mode = 'preview' }) {
  const jspdfModule = await import('jspdf');
  const jsPDF = jspdfModule.jsPDF || jspdfModule.default;
  const autoTableModule = await import('jspdf-autotable');
  const autoTable = autoTableModule.default || autoTableModule.autoTable || autoTableModule;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210
  const pageHeight = doc.internal.pageSize.getHeight(); // 297
  const margin = 12;
  const contentWidth = pageWidth - (margin * 2); // 186

  const primaryColor = getPdfPrimaryColor(tenant || profile?.tenants || profile?.primary_color);
  const voucherDetails = getVoucherTypeDetails(factura?.tipo_comprobante);
  const { letra, desc, codigo, isInterno } = voucherDetails;

  const formattedPtoVta = String(factura?.punto_venta || config?.punto_venta || 1).padStart(5, '0');
  const formattedNro = String(factura?.numero_comprobante || 0).padStart(8, '0');

  // ==========================================
  // 1. HEADER CONTAINER
  // ==========================================
  const headerY = 12;
  const headerHeight = 44;

  // Main Outer Box
  setDrawColor(doc, PDF_THEME.border);
  setFillColor(doc, PDF_THEME.white);
  doc.roundedRect(margin, headerY, contentWidth, headerHeight, 2, 2, 'FD');

  // Center Voucher Type Box (Letter Box)
  // Perfectly centered box of 14x13 mm
  const letterBoxWidth = 14;
  const letterBoxHeight = 13;
  const letterBoxX = (pageWidth / 2) - (letterBoxWidth / 2); // 98mm to 112mm

  setFillColor(doc, primaryColor);
  doc.roundedRect(letterBoxX, headerY, letterBoxWidth, letterBoxHeight, 1.5, 1.5, 'F');

  // Big Letter
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(letra, pageWidth / 2, headerY + 8.5, { align: 'center' });

  // Code label below letter
  doc.setFontSize(6);
  doc.text(`COD. ${codigo}`, pageWidth / 2, headerY + 11.5, { align: 'center' });

  // Center vertical dividing line below letter box
  setDrawColor(doc, PDF_THEME.border);
  doc.line(pageWidth / 2, headerY + letterBoxHeight, pageWidth / 2, headerY + headerHeight);

  // --- LEFT COLUMN: Emisor (Width max: 76mm, from X=16 to X=92) ---
  const leftX = margin + 4; // 16mm
  const maxLeftWidth = (pageWidth / 2) - leftX - 10; // ~79mm
  let curY = headerY + 6.5;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  setTextColor(doc, primaryColor);
  const razonSocialEmisor = config?.razon_social || profile?.full_name || tenant?.name || 'Gestión SySO';
  const splitRazon = doc.splitTextToSize(razonSocialEmisor.toUpperCase(), maxLeftWidth);
  doc.text(splitRazon, leftX, curY);
  curY += (splitRazon.length * 4.2);

  const nombreFantasia = config?.nombre_fantasia || tenant?.name;
  if (nombreFantasia && nombreFantasia.trim().toLowerCase() !== razonSocialEmisor.trim().toLowerCase()) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    setTextColor(doc, PDF_THEME.textMuted);
    const splitFantasia = doc.splitTextToSize(nombreFantasia, maxLeftWidth);
    doc.text(splitFantasia, leftX, curY);
    curY += (splitFantasia.length * 3.8);
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  setTextColor(doc, PDF_THEME.textMuted);
  const splitDom = doc.splitTextToSize(config?.domicilio_comercial || 'Lascano 6373, Capital Federal', maxLeftWidth);
  doc.text(splitDom, leftX, curY);
  curY += (splitDom.length * 3.5);

  doc.setFont('helvetica', 'bold');
  setTextColor(doc, PDF_THEME.textPrimary);
  doc.text(`Condición IVA: `, leftX, curY);
  doc.setFont('helvetica', 'normal');
  const condIvaMap = {
    responsable_inscripto: 'IVA Responsable Inscripto',
    monotributista: 'Responsable Monotributo',
    exento: 'IVA Exento',
    consumidor_final: 'Consumidor Final',
  };
  doc.text(condIvaMap[config?.condicion_iva] || 'Responsable Monotributo', leftX + 20, curY);

  // --- RIGHT COLUMN: Comprobante & Datos Fiscales (Starts at X = 117mm) ---
  const rightX = (pageWidth / 2) + 12; // 117mm
  let curRY = headerY + 6.5;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  setTextColor(doc, PDF_THEME.textPrimary);
  doc.text(desc, rightX, curRY);

  curRY += 5.5;
  doc.setFontSize(8.5);
  doc.text(`Punto de Venta: ${formattedPtoVta}   Comp. Nro: ${formattedNro}`, rightX, curRY);

  curRY += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  setTextColor(doc, PDF_THEME.textMuted);
  const fechaEmisionStr = factura?.fecha_emision
    ? (typeof factura.fecha_emision === 'string' && factura.fecha_emision.includes('-')
        ? factura.fecha_emision.split('T')[0].split('-').reverse().join('/')
        : new Date(factura.fecha_emision).toLocaleDateString('es-AR'))
    : new Date().toLocaleDateString('es-AR');
  doc.text(`Fecha de Emisión: ${fechaEmisionStr}`, rightX, curRY);

  curRY += 4.5;
  setTextColor(doc, PDF_THEME.textPrimary);
  doc.text(`CUIT: ${config?.cuit || '20-27536690-1'}`, rightX, curRY);

  curRY += 4.5;
  doc.text(`Ingresos Brutos: ${config?.ingresos_brutos || '0'}`, rightX, curRY);

  curRY += 4.5;
  doc.text(`Fecha Inicio de Actividades: ${config?.inicio_actividades || '01/04/2019'}`, rightX, curRY);

  // ==========================================
  // 2. PERIOD & SERVICE DATES (if applicable)
  // ==========================================
  let nextY = headerY + headerHeight + 3;

  if (factura?.concepto >= 2 && (factura?.fecha_serv_desde || factura?.fecha_vto_pago)) {
    const servHeight = 9;
    setFillColor(doc, PDF_THEME.cardBg);
    setDrawColor(doc, PDF_THEME.border);
    doc.roundedRect(margin, nextY, contentWidth, servHeight, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    setTextColor(doc, PDF_THEME.textPrimary);

    const fDesde = factura.fecha_serv_desde || '-';
    const fHasta = factura.fecha_serv_hasta || '-';
    const fVto = factura.fecha_vto_pago || '-';

    doc.text(`Período Facturado Desde: ${fDesde}`, margin + 4, nextY + 6);
    doc.text(`Hasta: ${fHasta}`, margin + 70, nextY + 6);
    doc.text(`Vencimiento para el Pago: ${fVto}`, margin + 125, nextY + 6);

    nextY += servHeight + 3;
  }

  // ==========================================
  // 3. RECEPTOR CONTAINER
  // ==========================================
  const receptorHeight = 22;
  setFillColor(doc, PDF_THEME.white);
  setDrawColor(doc, PDF_THEME.border);
  doc.roundedRect(margin, nextY, contentWidth, receptorHeight, 2, 2, 'FD');

  const docTipoLabels = { 80: 'CUIT', 96: 'DNI', 99: 'Doc' };
  const docTipoLabel = docTipoLabels[factura?.receptor_doc_tipo] || 'Doc';

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  setTextColor(doc, PDF_THEME.textPrimary);

  // Row 1
  doc.text(`${docTipoLabel}: `, margin + 4, nextY + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(`${factura?.receptor_doc_nro || '0'}`, margin + 14, nextY + 6);

  doc.setFont('helvetica', 'bold');
  doc.text(`Apellido y Nombre / Razón Social: `, margin + 50, nextY + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(`${factura?.receptor_razon_social || 'Consumidor Final'}`, margin + 98, nextY + 6);

  // Row 2
  doc.setFont('helvetica', 'bold');
  doc.text(`Condición frente al IVA: `, margin + 4, nextY + 12);
  doc.setFont('helvetica', 'normal');
  const condIvaReceptor = condIvaMap[factura?.receptor_condicion_iva] || factura?.receptor_condicion_iva || 'Consumidor Final';
  doc.text(`${condIvaReceptor}`, margin + 38, nextY + 12);

  doc.setFont('helvetica', 'bold');
  doc.text(`Domicilio: `, margin + 95, nextY + 12);
  doc.setFont('helvetica', 'normal');
  doc.text(`${factura?.receptor_domicilio || '-'}`, margin + 110, nextY + 12);

  // Row 3
  doc.setFont('helvetica', 'bold');
  doc.text(`Condición de Venta: `, margin + 4, nextY + 18);
  doc.setFont('helvetica', 'normal');
  doc.text(`Contado / Transferencia`, margin + 32, nextY + 18);

  nextY += receptorHeight + 4;

  // ==========================================
  // 4. ITEMS TABLE (jspdf-autotable)
  // ==========================================
  let tableRows = [];
  let parsedItems = factura?.items;
  if (typeof parsedItems === 'string') {
    try {
      parsedItems = JSON.parse(parsedItems);
    } catch (e) {
      parsedItems = [];
    }
  }

  if (Array.isArray(parsedItems) && parsedItems.length > 0) {
    tableRows = parsedItems.map((it, idx) => [
      String(idx + 1).padStart(2, '0'),
      it.descripcion || 'Servicio Profesional de Higiene y Seguridad',
      Number(it.cantidad || 1).toFixed(2),
      'unidades',
      `$ ${Number(it.precio_unitario || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`,
      `$ ${Number(it.subtotal || (Number(it.cantidad || 1) * Number(it.precio_unitario || 0))).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`,
    ]);
  } else {
    tableRows = [
      [
        '01',
        factura?.descripcion || 'Servicios profesionales de Higiene, Seguridad y Salud Ocupacional',
        '1.00',
        'unidades',
        `$ ${Number(factura?.imp_neto || factura?.imp_total || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`,
        `$ ${Number(factura?.imp_neto || factura?.imp_total || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`,
      ]
    ];
  }

  const tableOptions = {
    startY: nextY,
    margin: { left: margin, right: margin },
    head: [['Código', 'Descripción / Producto / Servicio', 'Cantidad', 'U. Medida', 'Precio Unit.', 'Subtotal']],
    body: tableRows,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2.5,
      textColor: PDF_THEME.textPrimary,
      lineColor: PDF_THEME.border,
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 16 },
      1: { halign: 'left' },
      2: { halign: 'right', cellWidth: 20 },
      3: { halign: 'center', cellWidth: 22 },
      4: { halign: 'right', cellWidth: 28 },
      5: { halign: 'right', cellWidth: 28 },
    },
  };

  if (typeof doc.autoTable === 'function') {
    doc.autoTable(tableOptions);
  } else if (typeof autoTable === 'function') {
    autoTable(doc, tableOptions);
  }

  const finalTableY = (doc.lastAutoTable && doc.lastAutoTable.finalY) ? doc.lastAutoTable.finalY + 4 : nextY + 30;

  // ==========================================
  // 5. TOTALS BOX
  // ==========================================
  const totalsBoxHeight = 26;
  const totalsBoxWidth = 85;
  const totalsBoxX = pageWidth - margin - totalsBoxWidth;

  setFillColor(doc, PDF_THEME.cardBg);
  setDrawColor(doc, PDF_THEME.border);
  doc.roundedRect(totalsBoxX, finalTableY, totalsBoxWidth, totalsBoxHeight, 2, 2, 'FD');

  doc.setFontSize(8);
  setTextColor(doc, PDF_THEME.textPrimary);

  // Subtotal Neto
  doc.setFont('helvetica', 'normal');
  doc.text('Importe Neto Gravado:', totalsBoxX + 4, finalTableY + 7);
  doc.setFont('helvetica', 'bold');
  doc.text(`$ ${Number(factura?.imp_neto || factura?.imp_total || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`, totalsBoxX + totalsBoxWidth - 4, finalTableY + 7, { align: 'right' });

  // IVA
  doc.setFont('helvetica', 'normal');
  doc.text('Importe IVA (21% / 10.5%):', totalsBoxX + 4, finalTableY + 13);
  doc.setFont('helvetica', 'bold');
  doc.text(`$ ${Number(factura?.imp_iva || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`, totalsBoxX + totalsBoxWidth - 4, finalTableY + 13, { align: 'right' });

  // Divider
  setDrawColor(doc, primaryColor);
  doc.line(totalsBoxX + 3, finalTableY + 16.5, totalsBoxX + totalsBoxWidth - 3, finalTableY + 16.5);

  // TOTAL
  doc.setFontSize(10);
  setTextColor(doc, primaryColor);
  doc.setFont('helvetica', 'bold');
  doc.text('IMPORTE TOTAL:', totalsBoxX + 4, finalTableY + 22);
  doc.text(`$ ${Number(factura?.imp_total || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`, totalsBoxX + totalsBoxWidth - 4, finalTableY + 22, { align: 'right' });

  // ==========================================
  // 6. FOOTER (CAE & ARCA OR INTERNAL TRACKING)
  // ==========================================
  const footerBoxY = pageHeight - 34;
  const footerBoxHeight = 24;

  setFillColor(doc, PDF_THEME.white);
  setDrawColor(doc, PDF_THEME.border);
  doc.roundedRect(margin, footerBoxY, contentWidth, footerBoxHeight, 2, 2, 'FD');

  if (isInterno) {
    // Left Box: Internal badge
    setFillColor(doc, [243, 244, 246]);
    setDrawColor(doc, [209, 213, 219]);
    doc.roundedRect(margin + 3, footerBoxY + 2.5, 19, 19, 1.5, 1.5, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    setTextColor(doc, primaryColor);
    doc.text('X', margin + 12.5, footerBoxY + 11, { align: 'center' });
    doc.setFontSize(5);
    doc.text('INTERNO', margin + 12.5, footerBoxY + 16, { align: 'center' });

    // Middle banner: Internal registration info
    const middleX = margin + 25;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    setTextColor(doc, primaryColor);
    doc.text('Comprobante de Control y Registro Interno', middleX, footerBoxY + 6.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    setTextColor(doc, PDF_THEME.textMuted);
    doc.text('Documento no fiscal emitido para registro interno de servicios y seguimiento de cobranzas.', middleX, footerBoxY + 11.5);
    doc.text(`Generado digitalmente por Gestión SySO — SaaS de Higiene y Seguridad Laboral`, middleX, footerBoxY + 16.5);

    // Right column: Internal number and Date
    const caeX = pageWidth - margin - 5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    setTextColor(doc, PDF_THEME.textPrimary);
    doc.text(`REGISTRO: INT-${formattedNro}`, caeX, footerBoxY + 8, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    setTextColor(doc, PDF_THEME.textMuted);
    doc.text(`Fecha: ${fechaEmisionStr}`, caeX, footerBoxY + 15.5, { align: 'right' });
  } else {
    // Embed official ARCA QR Code
    try {
      const qrPayloadUrl = generateArcaQrUrl({
        fecha: factura?.fecha_emision || new Date().toISOString().split('T')[0],
        cuitEmisor: config?.cuit || '30712345678',
        ptoVta: factura?.punto_venta || config?.punto_venta || 1,
        tipoCmp: factura?.tipo_comprobante || 11,
        nroCmp: factura?.numero_comprobante || 0,
        importe: factura?.imp_total || 0,
        tipoDocRec: factura?.receptor_doc_tipo || 99,
        nroDocRec: factura?.receptor_doc_nro || 0,
        tipoCodAut: 'E',
        codAut: factura?.cae || 0,
      });
      const QRCode = (await import('qrcode')).default || (await import('qrcode'));
      const qrDataUrl = await QRCode.toDataURL(qrPayloadUrl, { margin: 0, width: 140 });
      doc.addImage(qrDataUrl, 'PNG', margin + 3, footerBoxY + 2.5, 19, 19);
    } catch (err) {
      console.warn('QR code generation notice:', err);
    }

    // Middle banner: ARCA Authorization badge
    const middleX = margin + 25;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    setTextColor(doc, primaryColor);
    doc.text('Comprobante Autorizado por ARCA (ex AFIP)', middleX, footerBoxY + 6.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    setTextColor(doc, PDF_THEME.textMuted);
    doc.text('Esta administración federal no se responsabiliza por los datos ingresados en el comprobante.', middleX, footerBoxY + 11.5);
    doc.text(`Generado digitalmente por Gestión SySO — SaaS de Higiene y Seguridad Laboral`, middleX, footerBoxY + 16.5);

    // Right column: CAE and Expiration
    const caeX = pageWidth - margin - 5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    setTextColor(doc, PDF_THEME.textPrimary);
    doc.text(`CAE N°:  ${factura?.cae || '-'}`, caeX, footerBoxY + 8, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    setTextColor(doc, PDF_THEME.textMuted);
    const formattedCaeVto = factura?.cae_vencimiento
      ? (typeof factura.cae_vencimiento === 'string' && factura.cae_vencimiento.includes('-')
          ? factura.cae_vencimiento.split('T')[0].split('-').reverse().join('/')
          : new Date(factura.cae_vencimiento).toLocaleDateString('es-AR'))
      : '-';
    doc.text(`Fecha de Vto. de CAE:  ${formattedCaeVto}`, caeX, footerBoxY + 15.5, { align: 'right' });
  }

  // ==========================================
  // Output handling
  // ==========================================
  const prefix = desc.toLowerCase().includes('crédito')
    ? 'Nota_Credito'
    : desc.toLowerCase().includes('débito')
    ? 'Nota_Debito'
    : 'Factura';
  const fileName = `${prefix}_${letra}_${formattedPtoVta}-${formattedNro}.pdf`;

  if (mode === 'download') {
    doc.save(fileName);
    return;
  }

  if (mode === 'blob') {
    return doc.output('blob');
  }

  if (mode === 'doc') {
    return doc;
  }

  if (mode === 'print') {
    const { printPdfDocument } = require('@/lib/pdf/pdfPrintHelper');
    printPdfDocument(doc, null, fileName);
    return;
  }

  // Default: preview in new tab
  const pdfBlob = doc.output('blob');
  const blobUrl = URL.createObjectURL(pdfBlob);
  if (typeof window !== 'undefined') {
    window.open(blobUrl, '_blank');
  }
  return blobUrl;
}
