import * as xlsx from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export async function generarMorososExcel(
  facturasPendientes: any[],
  contribuyentes: any[],
  tcmmv: number
): Promise<void> {
  const grouped: Record<string, { facturas: any[]; contrib: any }> = {};
  for (const f of facturasPendientes) {
    const id = (f.identidad || '').replace(/-/g, '').toUpperCase();
    if (!id) continue;
    if (!grouped[id]) {
      const contrib = contribuyentes.find((c: any) =>
        (c.Identidad || '').replace(/-/g, '').toUpperCase() === id
      );
      grouped[id] = { facturas: [], contrib };
    }
    grouped[id].facturas.push(f);
  }
  const MESES = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];
  const getMes = (d: string) => {
    const p = d?.split('-');
    return p?.length >= 2 ? `${MESES[parseInt(p[1])-1]}-${p[0]}` : d || '—';
  };
  const rows = Object.values(grouped)
    .filter(g => g.facturas.length > 0)
    .map(g => {
      const { facturas, contrib } = g;
      let totalDeudaBs = 0;
      for (const f of facturas) totalDeudaBs += parseFloat(String(f.monto || '0').replace(/[^\d.]/g, '')) || 0;
      const periodos = facturas
        .sort((a: any, b: any) => new Date(a.emision).getTime() - new Date(b.emision).getTime())
        .map((f: any) => getMes(f.emision)).join(', ');
      return {
        cod_cont: contrib?.CodCont || contrib?.cod_cont || '—',
        contribuyente: contrib?.Contribuyente || facturas[0]?.contribuyente || '—',
        identidad: contrib?.Identidad || facturas[0]?.identidad || '—',
        clasificacion: contrib?.Clasificacion || '—',
        mesesPendientes: facturas.length,
        periodos,
        totalDeudaBs,
      };
    })
    .sort((a, b) => b.mesesPendientes - a.mesesPendientes || b.totalDeudaBs - a.totalDeudaBs);

  const today = new Date().toLocaleDateString('es-VE');
  const wsData = [
    ['REPORTE DE MOROSOS — ISMA (MUNICIPIO SILVA)'],
    [`Fecha: ${today}  |  Tasa BCV: ${tcmmv ? tcmmv + ' Bs/EUR' : 'N/D'}  |  Total morosos: ${rows.length}`],
    [],
    ['N°','CÓDIGO','CONTRIBUYENTE','IDENTIDAD','CLASIFICACIÓN','MESES PENDIENTES','PERÍODOS','DEUDA TOTAL (Bs)'],
    ...rows.map((r, i) => [i+1, r.cod_cont, r.contribuyente, r.identidad, r.clasificacion, r.mesesPendientes, r.periodos,
      r.totalDeudaBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })]),
    [],
    ['','','','','','TOTAL MOROSOS:', rows.length, ''],
    ['','','','','','TOTAL DEUDA (Bs):','', rows.reduce((s, r) => s + r.totalDeudaBs, 0).toLocaleString('es-VE', { minimumFractionDigits: 2 })],
  ];
  const wb = xlsx.utils.book_new();
  const ws = xlsx.utils.aoa_to_sheet(wsData);
  ws['!cols'] = [{wch:5},{wch:12},{wch:40},{wch:15},{wch:18},{wch:18},{wch:50},{wch:20}];
  ws['!merges'] = [{ s:{r:0,c:0}, e:{r:0,c:7} }, { s:{r:1,c:0}, e:{r:1,c:7} }];
  xlsx.utils.book_append_sheet(wb, ws, 'Morosos');
  xlsx.writeFile(wb, `Reporte_Morosos_${today.replace(/\//g, '-')}.xlsx`);
}

export async function generarMorososPDF(
  facturasPendientes: any[],
  contribuyentes: any[],
  tcmmv: number
): Promise<void> {
  const grouped: Record<string, { facturas: any[]; contrib: any }> = {};
  for (const f of facturasPendientes) {
    const id = (f.identidad || '').replace(/-/g, '').toUpperCase();
    if (!id) continue;
    if (!grouped[id]) {
      const contrib = contribuyentes.find((c: any) =>
        (c.Identidad || '').replace(/-/g, '').toUpperCase() === id
      );
      grouped[id] = { facturas: [], contrib };
    }
    grouped[id].facturas.push(f);
  }
  const MESES = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];
  const getMes = (d: string) => {
    const p = d?.split('-');
    return p?.length >= 2 ? `${MESES[parseInt(p[1])-1]}-${p[0]}` : d || '—';
  };
  const rows = Object.values(grouped)
    .filter(g => g.facturas.length > 0)
    .map(g => {
      const { facturas, contrib } = g;
      let totalDeudaBs = 0;
      for (const f of facturas) totalDeudaBs += parseFloat(String(f.monto || '0').replace(/[^\d.]/g, '')) || 0;
      const periodos = facturas
        .sort((a: any, b: any) => new Date(a.emision).getTime() - new Date(b.emision).getTime())
        .map((f: any) => getMes(f.emision)).join(', ');
      return {
        cod_cont: contrib?.CodCont || '—',
        contribuyente: contrib?.Contribuyente || facturas[0]?.contribuyente || '—',
        identidad: contrib?.Identidad || facturas[0]?.identidad || '—',
        clasificacion: contrib?.Clasificacion || '—',
        mesesPendientes: facturas.length,
        periodos,
        totalDeudaBs,
      };
    })
    .sort((a, b) => b.mesesPendientes - a.mesesPendientes || b.totalDeudaBs - a.totalDeudaBs);

  const today = new Date();
  const todayStr = today.toLocaleDateString('es-VE', { day:'2-digit', month:'2-digit', year:'numeric' });
  const doc = new jsPDF({ unit:'mm', format:'a4', orientation:'landscape' });

  doc.setFontSize(16); doc.setFont('helvetica', 'bold');
  doc.text('REPORTE DE MOROSOS', 148, 14, { align:'center' });
  doc.setFontSize(9); doc.setFont('helvetica', 'normal');
  doc.text('INSTITUTO SOCIAL MUNICIPAL DEL AMBIENTE (ISMA) — MUNICIPIO SILVA', 148, 20, { align:'center' });
  doc.setTextColor(100,100,100); doc.setFontSize(8);
  doc.text(`Fecha: ${todayStr}  |  Tasa BCV: ${tcmmv ? tcmmv + ' Bs/EUR' : 'N/D'}  |  Total morosos: ${rows.length}`, 148, 25, { align:'center' });
  doc.setTextColor(0,0,0); doc.setLineWidth(0.5); doc.line(14, 28, 282, 28);

  const totalDeuda = rows.reduce((s, r) => s + r.totalDeudaBs, 0);

  autoTable(doc, {
    startY: 32,
    head: [['N°','CÓDIGO','CONTRIBUYENTE / RAZÓN SOCIAL','IDENTIDAD','CLASIFICACIÓN','MESES\nPENDIENTES','PERÍODOS ADEUDADOS','DEUDA TOTAL (Bs)']],
    body: [
      ...rows.map((r, i) => [
        i+1, r.cod_cont, r.contribuyente, r.identidad, r.clasificacion,
        r.mesesPendientes, r.periodos,
        r.totalDeudaBs.toLocaleString('es-VE', { minimumFractionDigits:2 }),
      ]),
      ['','','','','',
        { content: `TOTAL: ${rows.length} morosos`, colSpan:2, styles:{ fontStyle:'bold', halign:'right' } },
        { content: `Bs. ${totalDeuda.toLocaleString('es-VE', { minimumFractionDigits:2 })}`, styles:{ fontStyle:'bold', halign:'right', textColor:[220,38,38] } }
      ],
    ],
    theme: 'striped',
    headStyles: { fillColor:[15,23,42], textColor:[255,255,255], fontStyle:'bold', fontSize:8, halign:'center' },
    styles: { fontSize:7.5, cellPadding:2 },
    columnStyles: {
      0:{ cellWidth:8, halign:'center' },
      1:{ cellWidth:20 },
      2:{ cellWidth:70 },
      3:{ cellWidth:22 },
      4:{ cellWidth:22 },
      5:{ cellWidth:16, halign:'center', fontStyle:'bold' },
      6:{ cellWidth:70 },
      7:{ cellWidth:30, halign:'right', fontStyle:'bold' },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.row.index < rows.length) {
        const r = rows[data.row.index];
        if (r && r.mesesPendientes >= 3) data.cell.styles.textColor = [185, 28, 28];
      }
    },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 6;
  doc.setFontSize(7); doc.setFont('helvetica','italic'); doc.setTextColor(100,100,100);
  doc.text('* Contribuyentes en rojo tienen 3 o más meses pendientes.', 14, finalY);
  doc.text(`Generado: ${todayStr} | Sistema ISMA`, 282, finalY, { align:'right' });
  doc.save(`Morosos_${todayStr.replace(/\//g, '-')}.pdf`);
}
