import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { logos } from '@/lib/logosBase64';

export interface CensoMonthData {
  mesKey: string;
  mesNombre: string;
  catastroTotal: number;
  haciendaTotal: number;
  totalMes: number;
}

export interface CensoGeneralStats {
  catastroTotal: number;
  haciendaTotal: number;
  granTotal: number;
  catastroUsuarios: Record<string, number>;
  haciendaUsuarios: Record<string, number>;
  meses: CensoMonthData[];
}

const NOMBRES_MESES: Record<string, string> = {
  '01': 'ENERO', '02': 'FEBRERO', '03': 'MARZO', '04': 'ABRIL',
  '05': 'MAYO', '06': 'JUNIO', '07': 'JULIO', '08': 'AGOSTO',
  '09': 'SEPTIEMBRE', '10': 'OCTUBRE', '11': 'NOVIEMBRE', '12': 'DICIEMBRE'
};

export const procesarEstadisticasCenso = (logs: any[]): CensoGeneralStats => {
  const mesesMap: Record<string, { catastroTotal: number; haciendaTotal: number; totalMes: number }> = {};
  const catastroUsuarios: Record<string, number> = {};
  const haciendaUsuarios: Record<string, number> = {};
  let catastroTotal = 0;
  let haciendaTotal = 0;

  (logs || []).forEach(l => {
    const u = (l.user_id || '').toUpperCase();
    const d = (l.details || '').toUpperCase();
    let dept: 'CATASTRO' | 'HACIENDA' | null = null;
    let usuario = l.user_id || 'OPERADOR';

    if (u.includes('CATASTRO') || d.includes('CATASTRO') || u.includes('EMDRONADOR') || u.includes('EMPADRONADOR') || d.includes('EMDRONADOR') || d.includes('EMPADRONADOR')) {
      dept = 'CATASTRO';
      usuario = 'CATASTRO';
    } else if (u.includes('HACIENDA') || d.includes('HACIENDA')) {
      dept = 'HACIENDA';
      usuario = 'HACIENDA';
    }
    if (!dept) return;

    const fechaStr = l.created_at || '';
    const mesKey = fechaStr.slice(0, 7) || '2026-09';

    if (!mesesMap[mesKey]) {
      mesesMap[mesKey] = { catastroTotal: 0, haciendaTotal: 0, totalMes: 0 };
    }

    if (dept === 'CATASTRO') {
      catastroTotal++;
      catastroUsuarios[usuario] = (catastroUsuarios[usuario] || 0) + 1;
      mesesMap[mesKey].catastroTotal++;
    } else {
      haciendaTotal++;
      haciendaUsuarios[usuario] = (haciendaUsuarios[usuario] || 0) + 1;
      mesesMap[mesKey].haciendaTotal++;
    }
    mesesMap[mesKey].totalMes++;
  });

  const mesesSorted: CensoMonthData[] = Object.keys(mesesMap)
    .sort((a, b) => b.localeCompare(a))
    .map(key => {
      const parts = key.split('-');
      const mesNom = parts.length >= 2 ? (NOMBRES_MESES[parts[1]] || parts[1]) + ' ' + parts[0] : key;
      return {
        mesKey: key,
        mesNombre: mesNom,
        catastroTotal: mesesMap[key].catastroTotal,
        haciendaTotal: mesesMap[key].haciendaTotal,
        totalMes: mesesMap[key].totalMes
      };
    });

  return {
    catastroTotal,
    haciendaTotal,
    granTotal: catastroTotal + haciendaTotal,
    catastroUsuarios,
    haciendaUsuarios,
    meses: mesesSorted
  };
};

export const generarReporteCensoEstadisticoPDF = (stats: CensoGeneralStats, options?: { previewOnly?: boolean }): string | void => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter'
  });

  const pageWidth = doc.internal.pageSize.width; // 215.9 mm
  const pageHeight = doc.internal.pageSize.height; // 279.4 mm
  const margin = 14;
  const contentWidth = pageWidth - margin * 2; // 187.9 mm

  // ==========================================
  // 1. BANNER INSTITUCIONAL SUPERIOR
  // ==========================================
  doc.setFillColor(15, 23, 42); // Slate 900
  doc.rect(margin, 10, contentWidth, 24, 'F');

  // Acento dorado/verde
  doc.setFillColor(16, 185, 129); // Emerald 500
  doc.rect(margin, 34, contentWidth, 1.5, 'F');

  // Logos en esquinas superiores (si están disponibles)
  if (logos.alcaldia) {
    try { doc.addImage(logos.alcaldia, 'PNG', margin + 3, 11, 20, 20); } catch (_e) {}
  }
  if (logos.isma) {
    try { doc.addImage(logos.isma, 'PNG', pageWidth - margin - 23, 11, 20, 20); } catch (_e) {}
  }

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text('ALCALDÍA BOLIVARIANA DEL MUNICIPIO JOSÉ LAURENCIO SILVA', pageWidth / 2, 17, { align: 'center' });

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225);
  doc.text('INSTITUTO AUTÓNOMO MUNICIPAL DE GESTIÓN AMBIENTAL (ISMA)', pageWidth / 2, 22.5, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(248, 250, 252);
  doc.text('INFORME ESTADÍSTICO CONSOLIDADO DE CENSOS POR DEPARTAMENTO Y MESES', pageWidth / 2, 29, { align: 'center' });

  // ==========================================
  // 2. METADATOS Y CONTROL DEL DOCUMENTO
  // ==========================================
  let curY = 41;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, curY, contentWidth, 12, 2, 2, 'FD');

  const fechaActual = new Date().toLocaleDateString('es-VE', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true
  });

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('FECHA DE EMISIÓN:', margin + 4, curY + 4.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(fechaActual, margin + 34, curY + 4.5);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('TIPO DE INFORME:', margin + 95, curY + 4.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text('Consolidado General Cuantitativo (Sin datos nominales)', margin + 125, curY + 4.5);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('DEPARTAMENTOS:', margin + 4, curY + 9.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text('Dirección de Catastro & Dirección de Hacienda Municipal', margin + 34, curY + 9.5);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('ESTATUS:', margin + 95, curY + 9.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(16, 185, 129);
  doc.text('OFICIAL Y AUDITADO', margin + 125, curY + 9.5);

  // ==========================================
  // 3. TARJETAS DE INDICADORES CLAVE (KPIs)
  // ==========================================
  curY = 56;
  const cardGap = 4;
  const cardW = (contentWidth - cardGap * 2) / 3;
  const cardH = 22;

  // KPI 1: TOTAL GENERAL
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, curY, cardW, cardH, 2.5, 2.5, 'FD');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('TOTAL CENSOS REALIZADOS', margin + cardW / 2, curY + 5.5, { align: 'center' });
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(String(stats.granTotal), margin + cardW / 2, curY + 14.5, { align: 'center' });
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Consolidado Catastro + Hacienda', margin + cardW / 2, curY + 19, { align: 'center' });

  // KPI 2: CATASTRO
  const cardCatX = margin + cardW + cardGap;
  doc.setFillColor(239, 246, 255);
  doc.setDrawColor(191, 219, 254);
  doc.roundedRect(cardCatX, curY, cardW, cardH, 2.5, 2.5, 'FD');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 64, 175);
  doc.text('TOTAL CATASTRO', cardCatX + cardW / 2, curY + 5.5, { align: 'center' });
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(29, 78, 216);
  doc.text(String(stats.catastroTotal), cardCatX + cardW / 2, curY + 14.5, { align: 'center' });
  const pctCat = stats.granTotal > 0 ? ((stats.catastroTotal / stats.granTotal) * 100).toFixed(1) + '%' : '0%';
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(37, 99, 235);
  doc.text(`${pctCat} de participación territorial`, cardCatX + cardW / 2, curY + 19, { align: 'center' });

  // KPI 3: HACIENDA
  const cardHacX = cardCatX + cardW + cardGap;
  doc.setFillColor(254, 243, 199);
  doc.setDrawColor(253, 230, 138);
  doc.roundedRect(cardHacX, curY, cardW, cardH, 2.5, 2.5, 'FD');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(146, 64, 14);
  doc.text('TOTAL HACIENDA', cardHacX + cardW / 2, curY + 5.5, { align: 'center' });
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(180, 83, 9);
  doc.text(String(stats.haciendaTotal), cardHacX + cardW / 2, curY + 14.5, { align: 'center' });
  const pctHac = stats.granTotal > 0 ? ((stats.haciendaTotal / stats.granTotal) * 100).toFixed(1) + '%' : '0%';
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(217, 119, 6);
  doc.text(`${pctHac} de fiscalización censal`, cardHacX + cardW / 2, curY + 19, { align: 'center' });

  // ==========================================
  // 4. TABLA 1: DESGLOSE MENSUAL ESTADÍSTICO
  // ==========================================
  curY = 82;
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('1. CONSOLIDADO MENSUAL POR DEPARTAMENTO', margin, curY);

  const tableBodyMeses = stats.meses.map(m => {
    const pctCatMes = stats.granTotal > 0 ? ((m.catastroTotal / stats.granTotal) * 100).toFixed(1) + '%' : '0%';
    const pctHacMes = stats.granTotal > 0 ? ((m.haciendaTotal / stats.granTotal) * 100).toFixed(1) + '%' : '0%';
    const pctTotalMes = stats.granTotal > 0 ? ((m.totalMes / stats.granTotal) * 100).toFixed(1) + '%' : '0%';
    return [
      m.mesNombre,
      m.catastroTotal.toLocaleString('es-VE'),
      pctCatMes,
      m.haciendaTotal.toLocaleString('es-VE'),
      pctHacMes,
      m.totalMes.toLocaleString('es-VE'),
      pctTotalMes
    ];
  });

  tableBodyMeses.push([
    'TOTAL GENERAL ACUMULADO',
    stats.catastroTotal.toLocaleString('es-VE'),
    pctCat,
    stats.haciendaTotal.toLocaleString('es-VE'),
    pctHac,
    stats.granTotal.toLocaleString('es-VE'),
    '100.0%'
  ]);

  autoTable(doc, {
    startY: curY + 2.5,
    margin: { left: margin, right: margin },
    theme: 'grid',
    styles: {
      fontSize: 7.5,
      cellPadding: 2.2,
      textColor: [30, 41, 59],
      halign: 'center',
      lineColor: [226, 232, 240],
      lineWidth: 0.2
    },
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
      cellPadding: 3
    },
    columnStyles: {
      0: { halign: 'left', fontStyle: 'bold', cellWidth: 46 },
      1: { fontStyle: 'bold', textColor: [29, 78, 216], cellWidth: 26 },
      2: { fontSize: 7, textColor: [71, 85, 105], cellWidth: 20 },
      3: { fontStyle: 'bold', textColor: [180, 83, 9], cellWidth: 26 },
      4: { fontSize: 7, textColor: [71, 85, 105], cellWidth: 20 },
      5: { fontStyle: 'bold', fillColor: [241, 245, 249], textColor: [15, 23, 42], cellWidth: 26 },
      6: { fontStyle: 'bold', fillColor: [241, 245, 249], fontSize: 7, textColor: [15, 23, 42] }
    },
    head: [[
      'PERÍODO / MES',
      'CATASTRO',
      '% CATASTRO',
      'HACIENDA',
      '% HACIENDA',
      'TOTAL MES',
      '% TOTAL'
    ]],
    body: tableBodyMeses,
    didParseCell: (data) => {
      if (data.row.index === tableBodyMeses.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [226, 232, 240];
        data.cell.styles.textColor = [15, 23, 42];
      }
    }
  });

  const table1FinalY = (doc as any).lastAutoTable?.finalY || 135;

  // ==========================================
  // 5. TABLA 2: DISTRIBUCIÓN POR DEPARTAMENTO Y OPERADOR RESPONSABLE
  // ==========================================
  curY = table1FinalY + 7;
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('2. DISTRIBUCIÓN OPERATIVA POR DEPARTAMENTO', margin, curY);

  const operBody = [
    [
      'DIRECCIÓN DE CATASTRO MUNICIPAL',
      'CATASTRO (Operador Único Consolidado)',
      stats.catastroTotal.toLocaleString('es-VE'),
      pctCat,
      'Activo / Conforme'
    ],
    [
      'DIRECCIÓN DE HACIENDA MUNICIPAL',
      'HACIENDA (Fiscalización Consolidada)',
      stats.haciendaTotal.toLocaleString('es-VE'),
      pctHac,
      'Activo / Conforme'
    ],
    [
      'TOTAL GENERAL',
      '2 DIRECCIONES OPERATIVAS',
      stats.granTotal.toLocaleString('es-VE'),
      '100.0%',
      'Cierre Consolidado'
    ]
  ];

  autoTable(doc, {
    startY: curY + 2.5,
    margin: { left: margin, right: margin },
    theme: 'grid',
    styles: {
      fontSize: 7.5,
      cellPadding: 2.2,
      textColor: [30, 41, 59],
      halign: 'center',
      lineColor: [226, 232, 240],
      lineWidth: 0.2
    },
    headStyles: {
      fillColor: [51, 65, 85],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
      cellPadding: 3
    },
    columnStyles: {
      0: { halign: 'left', fontStyle: 'bold', cellWidth: 55 },
      1: { halign: 'left', cellWidth: 55 },
      2: { fontStyle: 'bold', cellWidth: 26 },
      3: { fontStyle: 'bold', cellWidth: 24 },
      4: { fontStyle: 'bold', textColor: [16, 185, 129] }
    },
    head: [[
      'DEPARTAMENTO',
      'USUARIO / OPERADOR',
      'CENSOS REALIZADOS',
      '% PARTICIPACIÓN',
      'ESTADO OPERATIVO'
    ]],
    body: operBody,
    didParseCell: (data) => {
      if (data.row.index === operBody.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [226, 232, 240];
        data.cell.styles.textColor = [15, 23, 42];
      }
    }
  });

  const table2FinalY = (doc as any).lastAutoTable?.finalY || 175;

  // ==========================================
  // 6. NOTAS DE AUDITORÍA Y METODOLOGÍA
  // ==========================================
  curY = table2FinalY + 6;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, curY, contentWidth, 26, 2, 2, 'FD');

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('NOTAS TÉCNICAS Y CRITERIOS DE AUDITORÍA CENSAL:', margin + 4, curY + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(71, 85, 105);
  const notas = [
    '1. Este informe refleja los datos oficiales registrados en el padrón y sistema de trazabilidad de censos del Municipio Silva.',
    '2. Los registros de Catastro representan el empadronamiento técnico e inmobiliario ejecutado en las distintas zonas del municipio.',
    '3. Los registros de Hacienda corresponden a los operativos de verificación y fiscalización censal tributaria comercial y residencial.',
    '4. Siguiendo directrices gerenciales, este reporte es estrictamente estadístico y no divulga información nominal individualizada.'
  ];
  let notY = curY + 9.5;
  notas.forEach(n => {
    doc.text(n, margin + 4, notY);
    notY += 4;
  });

  // ==========================================
  // 7. BLOQUE DE FIRMAS Y SELLOS
  // ==========================================
  const signY = pageHeight - 32;
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.5);
  doc.line(margin + 15, signY, margin + 65, signY);
  doc.line(pageWidth - margin - 65, signY, pageWidth - margin - 15, signY);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('DIRECCIÓN DE CATASTRO / HACIENDA', margin + 40, signY + 4, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Coordinación de Empadronamiento y Fiscalización', margin + 40, signY + 7.5, { align: 'center' });

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('INSTITUTO AUTÓNOMO MUNICIPAL (ISMA)', pageWidth - margin - 40, signY + 4, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Control de Gestión, Sistemas y Auditoría', pageWidth - margin - 40, signY + 7.5, { align: 'center' });

  // Pie de página final
  doc.setFontSize(6);
  doc.setTextColor(148, 163, 184);
  doc.text(`Documento generado automáticamente por el Sistema Integral ISMA  Página 1 de 1`, pageWidth / 2, pageHeight - 6, { align: 'center' });

  if (options?.previewOnly) {
    return doc.output('datauristring');
  }

  doc.save(`Reporte_Estadistico_Censo_${new Date().toISOString().slice(0, 10)}.pdf`);
};
