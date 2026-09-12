import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { logos } from '@/lib/logosBase64';

// Helper de formato de moneda
const formatBs = (num: number) => {
  return 'Bs. ' + num.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const generarCorteCajaPDF = (
  pagosFiltrados: any[], 
  contribuyentes: any[], 
  fechaInicio: string,
  fechaFin: string
) => {
  if (pagosFiltrados.length === 0) {
    alert("No hay pagos en el rango de fechas seleccionado.");
    return;
  }

  const doc = new jsPDF('p', 'pt', 'letter');
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  
  // ==============================
  // HEADER
  // ==============================
  if (logos.isma) {
    doc.addImage(logos.isma, 'PNG', 40, 20, 110, 40);
  }
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text("CORTE DE CAJA", pageWidth / 2, 40, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text("Reporte Detallado de Transacciones", pageWidth / 2, 55, { align: 'center' });

  // Divider 1
  doc.setLineWidth(1.5);
  doc.line(40, 70, pageWidth - 40, 70);

  // ==============================
  // METADATA
  // ==============================
  const startDate = fechaInicio ? new Date(fechaInicio + 'T00:00:00').toLocaleString('es-VE', {hour12: true, day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit'}) : new Date().toLocaleString('es-VE');
  const endDate = fechaFin ? new Date(fechaFin + 'T23:59:59').toLocaleString('es-VE', {hour12: true, day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit'}) : new Date().toLocaleString('es-VE');
  
  doc.setFontSize(9);
  doc.text(`Periodo: Desde ${startDate}`, 40, 85);
  doc.text(`Hasta ${endDate}`, pageWidth - 40, 85, { align: 'right' });
  doc.text(`Registros: ${pagosFiltrados.length}`, 40, 100);
  doc.text(`Cajero: Todos`, pageWidth - 40, 100, { align: 'right' });

  // Divider 2
  doc.setLineWidth(0.5);
  doc.line(40, 105, pageWidth - 40, 105);

  // ==============================
  // RESUMEN DE OPERACIONES
  // ==============================
  const debitos = pagosFiltrados.filter(p => p.tipo?.toUpperCase().includes('DEBITO') || p.tipo === 'Punto de Venta');
  const transferencias = pagosFiltrados.filter(p => p.tipo?.toUpperCase().includes('TRANSFERENCIA'));
  // Asumiendo que hay un tipo "Saldo a Favor" o similar. Si no, lo dejamos vacío por ahora o deducimos de la data.
  const saldosAFavor = pagosFiltrados.filter(p => p.tipo?.toUpperCase().includes('SALDO'));

  const totalDebito = debitos.reduce((acc: number, p: any) => acc + parseFloat(p.monto || '0'), 0);
  const totalTransf = transferencias.reduce((acc: number, p: any) => acc + parseFloat(p.monto || '0'), 0);
  const totalSaldo = saldosAFavor.reduce((acc: number, p: any) => acc + parseFloat(p.monto || '0'), 0);
  const totalGeneral = totalDebito + totalTransf + totalSaldo;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text("RESUMEN DE OPERACIONES", pageWidth / 2, 130, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text("Debito", 40, 155);
  doc.text(formatBs(totalDebito), pageWidth - 40, 155, { align: 'right' });

  doc.text("Transferencias Conciliadas", 40, 170);
  doc.text(formatBs(totalTransf), pageWidth - 40, 170, { align: 'right' });

  doc.text("Saldo a Favor", 40, 185);
  doc.text(formatBs(totalSaldo), pageWidth - 40, 185, { align: 'right' });

  // Divider for total
  doc.setLineWidth(1);
  doc.line(40, 195, pageWidth - 40, 195);
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text("TOTAL GENERAL", 40, 210);
  doc.text(formatBs(totalGeneral), pageWidth - 40, 210, { align: 'right' });

  doc.setLineWidth(1.5);
  doc.line(40, 220, pageWidth - 40, 220);

  // ==============================
  // DETALLE DE TRANSACCIONES
  // ==============================
  doc.setFontSize(12);
  doc.text("DETALLE DE TRANSACCIONES", pageWidth / 2, 250, { align: 'center' });

  let startY = 270;

  // Helper function to draw sub-tables
  const drawSubTable = (title: string, dataItems: any[], columns: string[], rowMapper: (p: any, cInfo: any) => any[], footerTotal: number, footerLabel: string) => {
    if (dataItems.length === 0) return;
    
    // Check if we need a new page for the title
    if (startY > pageHeight - 100) {
      doc.addPage();
      startY = 40;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(title, pageWidth / 2, startY, { align: 'center' });
    
    const body = dataItems.map(p => {
      const cInfo = contribuyentes.find(c => c.Identidad === p.identidad) || {};
      return rowMapper(p, cInfo);
    });

    autoTable(doc, {
      startY: startY + 10,
      head: [columns],
      body: body,
      theme: 'plain',
      styles: { fontSize: 7, cellPadding: 2, textColor: [0, 0, 0] },
      headStyles: { fontStyle: 'bold', lineWidth: { top: 0.5, bottom: 0.5 }, lineColor: [0, 0, 0] },
      columnStyles: { [columns.length - 1]: { halign: 'right' } }, // El monto siempre a la derecha
      didDrawPage: function (data) {
        // Guardamos el Y para saber donde terminó
      }
    });

    let currentY = (doc as any).lastAutoTable.finalY + 10;
    
    // Draw footer total
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(footerLabel, pageWidth - 100, currentY, { align: 'right' });
    doc.text(formatBs(footerTotal).replace('Bs. ', ''), pageWidth - 40, currentY, { align: 'right' }); // Just the number to match image
    
    currentY += 5;
    doc.setLineWidth(1);
    doc.line(40, currentY, pageWidth - 40, currentY);

    startY = currentY + 30;
  };

  // 1. Débito
  drawSubTable(
    "TRANSACCIONES CON TARJETA DE DEBITO", 
    debitos, 
    ["FECHA/HORA", "TIPO", "CONTRIBUYENTE", "FACTURA", "BANCO", "APROBACION", "LOTE", "MONTO"],
    (p, c) => [
      new Date(p.created_at).toLocaleString('es-VE', {hour12: false, day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit'}),
      p.tipo.substring(0,3).toUpperCase(),
      (c.Contribuyente || p.identidad).substring(0,35), // Truncate
      p.factura_ref || p.referencia || 'N/A', // O factura
      p.banco_origen || 'N/A',
      p.referencia || 'N/A',
      '0390', // Default lote or from data
      parseFloat(p.monto).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    ],
    totalDebito,
    "Total Debito:"
  );

  // 2. Transferencias
  drawSubTable(
    "TRANSFERENCIAS CONCILIADAS", 
    transferencias, 
    ["FECHA/HORA", "FECHA BCO", "TIPO", "FECHA LIBRO", "DOCUMENTO", "BANCO ORIGEN", "REFERENCIA", "BANCO DESTINO", "REF. DESTINO", "MONTO"],
    (p, c) => [
      new Date(p.created_at).toLocaleString('es-VE', {hour12: false, day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit'}),
      new Date(p.fecha_pago || p.created_at).toLocaleDateString('es-VE', {day:'2-digit', month:'2-digit', year:'numeric'}),
      p.tipo.substring(0,3).toUpperCase(),
      "NO FACTURADO",
      p.referencia_bancaria || p.referencia || 'N/A',
      (p.banco_origen || 'N/A').substring(0,15),
      p.referencia || 'N/A',
      (p.banco_destino || 'N/A').substring(0,15),
      p.referencia || 'N/A',
      parseFloat(p.monto).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    ],
    totalTransf,
    "Total Transferencias:"
  );

  // 3. Saldo a Favor
  drawSubTable(
    "SALDO A FAVOR APLICADO", 
    saldosAFavor, 
    ["FECHA/HORA", "TIPO", "CAJERO", "CONTRIBUYENTE", "APLICADO A NUMERO", "MONTO"],
    (p, c) => [
      new Date(p.created_at).toLocaleString('es-VE', {hour12: false, day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit'}),
      p.tipo.substring(0,3).toUpperCase(),
      "Todos", // Asumido
      c.Contribuyente || p.identidad,
      p.factura_ref || p.referencia || 'N/A',
      parseFloat(p.monto).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    ],
    totalSaldo,
    "Total Saldo a Favor:"
  );

  // ==============================
  // FOOTER APLICADO A TODAS LAS PÁGINAS
  // ==============================
  const pageCount = (doc as any).internal.getNumberOfPages();
  const emisionStr = new Date().toLocaleString('es-VE', {hour12: true, day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit', second:'2-digit'});
  
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setLineWidth(0.5);
    doc.line(40, pageHeight - 40, pageWidth - 40, pageHeight - 40);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`Sistema de Gestion - ${new Date().getFullYear()}`, 40, pageHeight - 25);
    doc.text(`Emitido: ${emisionStr}`, 40, pageHeight - 15);

    doc.text(`Pagina ${i} de ${pageCount}`, pageWidth - 40, pageHeight - 25, { align: 'right' });
    doc.text(`Cajero: Todos`, pageWidth - 40, pageHeight - 15, { align: 'right' });
  }

  doc.save(`Corte_Caja_${new Date().getTime()}.pdf`);
};

// ============================================
// INGRESO BANCARIO (SIN ALTERAR, SOLO ACTUALIZAR EXPORTS)
// ============================================
export const generarIngresoBancarioPDF = (
  pagosFiltrados: any[], 
  contribuyentes: any[], 
  tipo: 'Diario' | 'Semanal' | 'Mensual',
  fechaInicio: string,
  fechaFin: string
) => {
  if (pagosFiltrados.length === 0) {
    alert("No hay pagos en el rango de fechas seleccionado.");
    return;
  }

  const doc = new jsPDF('p', 'pt', 'letter');
  const pageWidth = doc.internal.pageSize.width;
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(`REPORTE DE INGRESO BANCARIO ${tipo.toUpperCase()}`, pageWidth / 2, 40, { align: 'center' });
  
  const startDate = fechaInicio ? new Date(fechaInicio + 'T00:00:00').toLocaleDateString('es-VE') : new Date().toLocaleDateString('es-VE');
  const endDate = fechaFin ? new Date(fechaFin + 'T23:59:59').toLocaleDateString('es-VE') : new Date().toLocaleDateString('es-VE');
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Período: ${startDate} - ${endDate}`, 40, 60);
  
  const transferencias = pagosFiltrados.filter(p => p.tipo === 'Transferencia');
  const puntos = pagosFiltrados.filter(p => p.tipo === 'Debito');
  const otros = pagosFiltrados.filter(p => p.tipo !== 'Transferencia' && p.tipo !== 'Debito');

  let currentY = 80;

  const addTable = (title: string, pagos: any[]) => {
    if (pagos.length === 0) return;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(title, 40, currentY);
    
    const tableData = pagos.map((p: any, idx: number) => {
      const contribuyenteInfo = contribuyentes.find((c: any) => c.Identidad === p.identidad);
      return [
        idx + 1,
        new Date(p.created_at).toLocaleDateString('es-VE'),
        p.referencia || 'N/A',
        p.identidad,
        contribuyenteInfo ? contribuyenteInfo.Contribuyente : 'N/A',
        parseFloat(p.monto).toFixed(2)
      ];
    });

    const total = pagos.reduce((acc: number, p: any) => acc + parseFloat(p.monto || '0'), 0);
    tableData.push(['', '', '', '', 'TOTAL', total.toFixed(2)]);

    autoTable(doc, {
      startY: currentY + 10,
      head: [['Nº', 'Fecha', 'Referencia', 'RIF/CI', 'Cliente', 'Monto (Bs)']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [52, 73, 94], textColor: 255, fontSize: 9, halign: 'center' },
      bodyStyles: { fontSize: 8 },
      columnStyles: { 0: { halign: 'center' }, 1: { halign: 'center' }, 5: { halign: 'right' } },
      didParseCell: function(data) {
        if (data.row.index === tableData.length - 1) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [240, 240, 240];
        }
      }
    });
    currentY = (doc as any).lastAutoTable.finalY + 30;
  };

  addTable('TRANSFERENCIAS', transferencias);
  addTable('PUNTO DE VENTA', puntos);
  addTable('OTROS MÉTODOS', otros);

  const totalGeneral = pagosFiltrados.reduce((acc: number, p: any) => acc + parseFloat(p.monto || '0'), 0);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`TOTAL GENERAL INGRESADO: ${totalGeneral.toFixed(2)} Bs`, 40, currentY);

  doc.save(`Ingreso_Bancario_${tipo}_${new Date().getTime()}.pdf`);
};
