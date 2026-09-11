import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text("REPORTE DE CORTE DE CAJA A LAS 12", pageWidth / 2, 20, { align: 'center' });
  
  const startDate = fechaInicio ? new Date(fechaInicio + 'T00:00:00').toLocaleDateString('es-VE') : new Date().toLocaleDateString('es-VE');
  const endDate = fechaFin ? new Date(fechaFin + 'T23:59:59').toLocaleDateString('es-VE') : new Date().toLocaleDateString('es-VE');
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Período: ${startDate} - ${endDate}`, 14, 30);
  
  const tableData = pagosFiltrados.map((p: any, idx: number) => {
    const contribuyenteInfo = contribuyentes.find((c: any) => c.Identidad === p.identidad);
    return [
      idx + 1,
      new Date(p.created_at).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' }),
      p.referencia || 'N/A',
      p.identidad,
      contribuyenteInfo ? contribuyenteInfo.Contribuyente : 'N/A',
      p.tipo,
      parseFloat(p.monto).toFixed(2)
    ];
  });

  const total = pagosFiltrados.reduce((acc: number, p: any) => acc + parseFloat(p.monto || '0'), 0);
  tableData.push(['', '', '', '', '', 'TOTAL', total.toFixed(2)]);

  autoTable(doc, {
    startY: 35,
    head: [['Nº', 'Hora', 'Recibo', 'Identidad', 'Nombre / Razón Social', 'Método', 'Monto (Bs)']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [41, 128, 185], textColor: 255, fontSize: 9, halign: 'center' },
    bodyStyles: { fontSize: 8 },
    columnStyles: {
      0: { halign: 'center' },
      1: { halign: 'center' },
      5: { halign: 'center' },
      6: { halign: 'right' }
    },
    didParseCell: function(data) {
      if (data.row.index === tableData.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [240, 240, 240];
      }
    }
  });

  doc.save(`Corte_Caja_${new Date().getTime()}.pdf`);
};

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

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(`REPORTE DE INGRESO BANCARIO ${tipo.toUpperCase()}`, pageWidth / 2, 20, { align: 'center' });
  
  const startDate = fechaInicio ? new Date(fechaInicio + 'T00:00:00').toLocaleDateString('es-VE') : new Date().toLocaleDateString('es-VE');
  const endDate = fechaFin ? new Date(fechaFin + 'T23:59:59').toLocaleDateString('es-VE') : new Date().toLocaleDateString('es-VE');
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Período: ${startDate} - ${endDate}`, 14, 30);
  
  // Agrupar por banco / método
  const transferencias = pagosFiltrados.filter(p => p.tipo === 'Transferencia');
  const puntos = pagosFiltrados.filter(p => p.tipo === 'Debito');
  const otros = pagosFiltrados.filter(p => p.tipo !== 'Transferencia' && p.tipo !== 'Debito');

  let currentY = 35;

  const addTable = (title: string, pagos: any[]) => {
    if (pagos.length === 0) return;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(title, 14, currentY);
    
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
      startY: currentY + 5,
      head: [['Nº', 'Fecha', 'Referencia', 'RIF/CI', 'Cliente', 'Monto (Bs)']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [52, 73, 94], textColor: 255, fontSize: 9, halign: 'center' },
      bodyStyles: { fontSize: 8 },
      columnStyles: {
        0: { halign: 'center' },
        1: { halign: 'center' },
        5: { halign: 'right' }
      },
      didParseCell: function(data) {
        if (data.row.index === tableData.length - 1) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [240, 240, 240];
        }
      }
    });
    currentY = (doc as any).lastAutoTable.finalY + 15;
  };

  addTable('TRANSFERENCIAS', transferencias);
  addTable('PUNTO DE VENTA', puntos);
  addTable('OTROS MÉTODOS', otros);

  // Resumen
  const totalGeneral = pagosFiltrados.reduce((acc: number, p: any) => acc + parseFloat(p.monto || '0'), 0);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`TOTAL GENERAL INGRESADO: ${totalGeneral.toFixed(2)} Bs`, 14, currentY);

  doc.save(`Ingreso_Bancario_${tipo}_${new Date().getTime()}.pdf`);
};
