import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { logos } from '@/lib/logosBase64';

export interface CensoMonthData {
  mesKey: string; // "2026-09"
  mesNombre: string; // "Septiembre 2026"
  catastroTotal: number;
  catastroUsuarios: Record<string, number>;
  haciendaTotal: number;
  haciendaUsuarios: Record<string, number>;
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
  '01': 'Enero', '02': 'Febrero', '03': 'Marzo', '04': 'Abril',
  '05': 'Mayo', '06': 'Junio', '07': 'Julio', '08': 'Agosto',
  '09': 'Septiembre', '10': 'Octubre', '11': 'Noviembre', '12': 'Diciembre'
};

export const formatearMes = (mesKey: string): string => {
  const parts = mesKey.split('-');
  if (parts.length >= 2) {
    const mesNom = NOMBRES_MESES[parts[1]] || parts[1];
    return `${mesNom} ${parts[0]}`;
  }
  return mesKey;
};

export const procesarEstadisticasCenso = (logs: any[]): CensoGeneralStats => {
  const mesesMap: Record<string, CensoMonthData> = {};
  const catastroUsuariosGlobal: Record<string, number> = {};
  const haciendaUsuariosGlobal: Record<string, number> = {};
  let catastroTotal = 0;
  let haciendaTotal = 0;

  (logs || []).forEach(l => {
    const u = (l.user_id || '').toUpperCase();
    const d = (l.details || '').toUpperCase();
    let dept: 'CATASTRO' | 'HACIENDA' | null = null;
    let usuarioDisplay = 'Operador';

    if (u.includes('CATASTRO') || d.includes('CATASTRO') || u.includes('EMDRONADOR') || u.includes('EMPADRONADOR') || d.includes('EMDRONADOR') || d.includes('EMPADRONADOR')) {
      dept = 'CATASTRO';
      usuarioDisplay = 'CATASTRO';
    } else if (u.includes('HACIENDA') || d.includes('HACIENDA')) {
      dept = 'HACIENDA';
      usuarioDisplay = 'HACIENDA';
    }
    if (!dept) return;

    const fechaStr = l.created_at || '';
    const mesKey = fechaStr.slice(0, 7) || '2026-09';

    if (!mesesMap[mesKey]) {
      mesesMap[mesKey] = {
        mesKey,
        mesNombre: formatearMes(mesKey),
        catastroTotal: 0,
        catastroUsuarios: {},
        haciendaTotal: 0,
        haciendaUsuarios: {},
        totalMes: 0
      };
    }

    if (dept === 'CATASTRO') {
      catastroTotal++;
      catastroUsuariosGlobal[usuarioDisplay] = (catastroUsuariosGlobal[usuarioDisplay] || 0) + 1;
      mesesMap[mesKey].catastroTotal++;
      mesesMap[mesKey].catastroUsuarios[usuarioDisplay] = (mesesMap[mesKey].catastroUsuarios[usuarioDisplay] || 0) + 1;
    } else {
      haciendaTotal++;
      haciendaUsuariosGlobal[usuarioDisplay] = (haciendaUsuariosGlobal[usuarioDisplay] || 0) + 1;
      mesesMap[mesKey].haciendaTotal++;
      mesesMap[mesKey].haciendaUsuarios[usuarioDisplay] = (mesesMap[mesKey].haciendaUsuarios[usuarioDisplay] || 0) + 1;
    }
    mesesMap[mesKey].totalMes++;
  });

  const mesesSorted = Object.values(mesesMap).sort((a, b) => b.mesKey.localeCompare(a.mesKey));

  return {
    catastroTotal,
    haciendaTotal,
    granTotal: catastroTotal + haciendaTotal,
    catastroUsuarios: catastroUsuariosGlobal,
    haciendaUsuarios: haciendaUsuariosGlobal,
    meses: mesesSorted
  };
};

export const generarReporteCensoEstadisticoPDF = (stats: CensoGeneralStats, options?: { previewOnly?: boolean }) => {
  const doc = new jsPDF('p', 'pt', 'letter');
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;

  // 1. LOGOS Y ENCABEZADO
  if (logos.alcaldia) {
    try { doc.addImage(logos.alcaldia, 'PNG', 40, 20, 60, 45); } catch (_e) {}
  }
  if (logos.global_green) {
    try { doc.addImage(logos.global_green, 'PNG', pageWidth - 100, 20, 60, 45); } catch (_e) {}
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(30, 41, 59);
  doc.text('ALCALD�A BOLIVARIANA DEL MUNICIPIO JOS� LAURENCIO SILVA', pageWidth / 2, 32, { align: 'center' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('INSTITUTO AUT�NOMO MUNICIPAL DE AMBIENTE Y RECOLECCI�N DE DESECHOS (ISMA)', pageWidth / 2, 47, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('REPORTE ESTAD�STICO GENERAL DE CENSOS POR DEPARTAMENTO Y MESES', pageWidth / 2, 65, { align: 'center' });

  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(1);
  doc.line(40, 75, pageWidth - 40, 75);

  // 2. METADATA DE EMISI�N
  const fechaActual = new Date().toLocaleDateString('es-VE', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true
  });

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(51, 65, 85);
  doc.text(`Fecha y Hora de Emisi�n: `, 40, 90);
  doc.setFont('helvetica', 'normal');
  doc.text(fechaActual, 145, 90);

  doc.setFont('helvetica', 'bold');
  doc.text(`Tipo de Reporte: `, 320, 90);
  doc.setFont('helvetica', 'normal');
  doc.text('Consolidado Estad�stico Mensual (Sin listado individual)', 395, 90);

  // 3. TARJETAS DE RESUMEN EJECUTIVO (KPIs)
  const cardY = 102;
  const cardHeight = 44;
  const cardGap = 8;
  const cardWidth = (pageWidth - 80 - cardGap * 2) / 3;

  // Tarjeta Gran Total
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(40, cardY, cardWidth, cardHeight, 4, 4, 'FD');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('TOTAL CENSOS REALIZADOS', 40 + cardWidth / 2, cardY + 14, { align: 'center' });
  doc.setFontSize(16);
  doc.setFont('helvetica', 'black');
  doc.setTextColor(15, 23, 42);
  doc.text(String(stats.granTotal), 40 + cardWidth / 2, cardY + 34, { align: 'center' });

  // Tarjeta Catastro
  const cardCatastroX = 40 + cardWidth + cardGap;
  doc.setFillColor(239, 246, 255);
  doc.setDrawColor(191, 219, 254);
  doc.roundedRect(cardCatastroX, cardY, cardWidth, cardHeight, 4, 4, 'FD');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 64, 175);
  doc.text('TOTAL CATASTRO', cardCatastroX + cardWidth / 2, cardY + 14, { align: 'center' });
  doc.setFontSize(16);
  doc.setFont('helvetica', 'black');
  doc.setTextColor(29, 78, 216);
  doc.text(String(stats.catastroTotal), cardCatastroX + cardWidth / 2, cardY + 34, { align: 'center' });

  // Tarjeta Hacienda
  const cardHaciendaX = cardCatastroX + cardWidth + cardGap;
  doc.setFillColor(254, 243, 199);
  doc.setDrawColor(253, 230, 138);
  doc.roundedRect(cardHaciendaX, cardY, cardWidth, cardHeight, 4, 4, 'FD');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(146, 64, 14);
  doc.text('TOTAL HACIENDA', cardHaciendaX + cardWidth / 2, cardY + 14, { align: 'center' });
  doc.setFontSize(16);
  doc.setFont('helvetica', 'black');
  doc.setTextColor(180, 83, 9);
  doc.text(String(stats.haciendaTotal), cardHaciendaX + cardWidth / 2, cardY + 34, { align: 'center' });

  // 4. TABLA 1: DESGLOSE ESTAD�STICO MENSUAL
  const tableDataMeses = stats.meses.map(m => {
    const pctCatastro = stats.granTotal > 0 ? ((m.catastroTotal / stats.granTotal) * 100).toFixed(1) + '%' : '0%';
    const pctHacienda = stats.granTotal > 0 ? ((m.haciendaTotal / stats.granTotal) * 100).toFixed(1) + '%' : '0%';
    const pctMes = stats.granTotal > 0 ? ((m.totalMes / stats.granTotal) * 100).toFixed(1) + '%' : '0%';
    return [
      m.mesNombre.toUpperCase(),
      m.catastroTotal.toLocaleString('es-VE'),
      pctCatastro,
      m.haciendaTotal.toLocaleString('es-VE'),
      pctHacienda,
      m.totalMes.toLocaleString('es-VE'),
      pctMes
    ];
  });

  // Fila Total
  tableDataMeses.push([
    'TOTAL GENERAL CONSOLIDADO',
    stats.catastroTotal.toLocaleString('es-VE'),
    stats.granTotal > 0 ? ((stats.catastroTotal / stats.granTotal) * 100).toFixed(1) + '%' : '100%',
    stats.haciendaTotal.toLocaleString('es-VE'),
    stats.granTotal > 0 ? ((stats.haciendaTotal / stats.granTotal) * 100).toFixed(1) + '%' : '100%',
    stats.granTotal.toLocaleString('es-VE'),
    '100.0%'
  ]);

  autoTable(doc, {
    startY: cardY + cardHeight + 15,
    margin: { left: 40, right: 40 },
    theme: 'grid',
    styles: { fontSize: 8.5, cellPadding: 4, textColor: [30, 41, 59], halign: 'center' },
    headStyles: { fillColor: [30, 58, 138], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 },
    columnStyles: {
      0: { halign: 'left', fontStyle: 'bold', cellWidth: 140 },
      1: { fontStyle: 'bold', textColor: [29, 78, 216] },
      2: { fontSize: 7.5, textColor: [71, 85, 105] },
      3: { fontStyle: 'bold', textColor: [180, 83, 9] },
      4: { fontSize: 7.5, textColor: [71, 85, 105] },
      5: { fontStyle: 'bold', fillColor: [241, 245, 249], textColor: [15, 23, 42] },
      6: { fontStyle: 'bold', fillColor: [241, 245, 249], fontSize: 7.5 }
    },
    head: [[
      'PER�ODO / MES',
      'CATASTRO (CENSADOS)',
      '% CATASTRO',
      'HACIENDA (CENSADOS)',
      '% HACIENDA',
      'TOTAL MES',
      '% PARTICIPACI�N'
    ]],
    body: tableDataMeses,
    didParseCell: (data) => {
      // Destacar la �ltima fila (totales)
      if (data.row.index === tableDataMeses.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [226, 232, 240];
        data.cell.styles.textColor = [15, 23, 42];
      }
    }
  });

  const lastTableY = (doc as any).lastAutoTable?.finalY || 320;

  // 5. TABLA 2: DISTRIBUCI�N POR USUARIOS/OPERADORES RESPONSABLES
  const catUsersEntries = Object.entries(stats.catastroUsuarios);
  const hacUsersEntries = Object.entries(stats.haciendaUsuarios);
  const maxRows = Math.max(catUsersEntries.length, hacUsersEntries.length);

  const operTableBody: any[] = [];
  for (let i = 0; i < maxRows; i++) {
    const cEntry = catUsersEntries[i];
    const hEntry = hacUsersEntries[i];

    const cUser = cEntry ? cEntry[0] : '-';
    const cCount = cEntry ? cEntry[1].toLocaleString('es-VE') : '-';
    const cPct = cEntry && stats.catastroTotal > 0 ? ((cEntry[1] / stats.catastroTotal) * 100).toFixed(1) + '%' : '-';

    const hUser = hEntry ? hEntry[0] : '-';
    const hCount = hEntry ? hEntry[1].toLocaleString('es-VE') : '-';
    const hPct = hEntry && stats.haciendaTotal > 0 ? ((hEntry[1] / stats.haciendaTotal) * 100).toFixed(1) + '%' : '-';

    operTableBody.push([cUser, cCount, cPct, hUser, hCount, hPct]);
  }

  // Fila total de operadores
  operTableBody.push([
    'TOTAL CATASTRO',
    stats.catastroTotal.toLocaleString('es-VE'),
    '100%',
    'TOTAL HACIENDA',
    stats.haciendaTotal.toLocaleString('es-VE'),
    '100%'
  ]);

  autoTable(doc, {
    startY: lastTableY + 20,
    margin: { left: 40, right: 40 },
    theme: 'grid',
    styles: { fontSize: 8.5, cellPadding: 4, textColor: [30, 41, 59], halign: 'center' },
    headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
    columnStyles: {
      0: { halign: 'left', fontStyle: 'bold' },
      1: { fontStyle: 'bold', textColor: [29, 78, 216] },
      2: { fontSize: 7.5, textColor: [71, 85, 105] },
      3: { halign: 'left', fontStyle: 'bold' },
      4: { fontStyle: 'bold', textColor: [180, 83, 9] },
      5: { fontSize: 7.5, textColor: [71, 85, 105] }
    },
    head: [[
      'USUARIO CATASTRO',
      'CENSOS',
      '% DPTO',
      'USUARIO HACIENDA',
      'CENSOS',
      '% DPTO'
    ]],
    body: operTableBody,
    didParseCell: (data) => {
      if (data.row.index === operTableBody.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [241, 245, 249];
        data.cell.styles.textColor = [15, 23, 42];
      }
    }
  });

  const finalY = (doc as any).lastAutoTable?.finalY || 500;

  // 6. OBSERVACIONES / RESUMEN NARRATIVO
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('NOTAS Y CRITERIOS DE AUDITOR�A:', 40, finalY + 25);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  const notas = [
    '� Este reporte consolida �nicamente datos estad�sticos y cuantitativos generales generados a trav�s del m�dulo de censo.',
    '� Los registros de Catastro representan empadronamientos y censos t�cnicos levantados en territorio municipal por la Direcci�n de Catastro.',
    '� Los registros de Hacienda corresponden al levantamiento y fiscalizaci�n censal tributaria realizada por la Direcci�n de Hacienda.',
    '� No se incluyen listados detallados nominales de contribuyentes conforme a los requerimientos de s�ntesis gerencial.'
  ];
  let curY = finalY + 38;
  notas.forEach(n => {
    doc.text(n, 40, curY);
    curY += 12;
  });

  // 7. PIE DE P�GINA Y FIRMAS
  const signY = pageHeight - 65;
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.8);
  doc.line(70, signY, 230, signY);
  doc.line(pageWidth - 230, signY, pageWidth - 70, signY);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('DIRECCI�N DE CATASTRO / HACIENDA', 150, signY + 12, { align: 'center' });
  doc.text('Validaci�n y Control', 150, signY + 22, { align: 'center' });

  doc.text('ISMA - MUNICIPIO SILVA', pageWidth - 150, signY + 12, { align: 'center' });
  doc.text('Coordinaci�n de Sistemas y Censo', pageWidth - 150, signY + 22, { align: 'center' });

  if (options?.previewOnly) {
    return doc.output('datauristring');
  }

  doc.save(`Reporte_Estadistico_Censo_Catastro_Hacienda_${new Date().toISOString().slice(0, 10)}.pdf`);
};
