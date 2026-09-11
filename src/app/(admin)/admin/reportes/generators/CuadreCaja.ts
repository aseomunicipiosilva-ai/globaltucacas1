import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const generarCuadreCajaPDF = (
  pagosFiltrados: any[], 
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
  doc.text("CUADRE DE CAJA", pageWidth / 2, 20, { align: 'center' });
  
  const startDate = fechaInicio ? new Date(fechaInicio + 'T00:00:00').toLocaleDateString('es-VE') : new Date().toLocaleDateString('es-VE');
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Fecha: ${startDate}`, 14, 30);
  
  // Agrupar por método
  const transferencias = pagosFiltrados.filter(p => p.tipo === 'Transferencia').reduce((a, b) => a + parseFloat(b.monto || '0'), 0);
  const puntos = pagosFiltrados.filter(p => p.tipo === 'Debito').reduce((a, b) => a + parseFloat(b.monto || '0'), 0);
  const otros = pagosFiltrados.filter(p => p.tipo !== 'Transferencia' && p.tipo !== 'Debito').reduce((a, b) => a + parseFloat(b.monto || '0'), 0);
  const total = transferencias + puntos + otros;

  const tableData = [
    ['TRANSFERENCIAS BANCARIAS', transferencias.toFixed(2)],
    ['PUNTO DE VENTA', puntos.toFixed(2)],
    ['OTROS', otros.toFixed(2)],
    ['TOTAL RECAUDADO', total.toFixed(2)]
  ];

  autoTable(doc, {
    startY: 35,
    head: [['CONCEPTO', 'MONTO (Bs)']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [46, 204, 113], textColor: 255, fontSize: 10, halign: 'center' },
    bodyStyles: { fontSize: 9 },
    columnStyles: {
      0: { halign: 'left' },
      1: { halign: 'right' }
    },
    didParseCell: function(data) {
      if (data.row.index === tableData.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [240, 240, 240];
      }
    }
  });

  // Firmas
  const finalY = (doc as any).lastAutoTable.finalY + 30;
  doc.text("_________________________", 40, finalY);
  doc.text("FIRMA CAJERO", 50, finalY + 5);
  
  doc.text("_________________________", 120, finalY);
  doc.text("FIRMA SUPERVISOR", 125, finalY + 5);

  doc.save(`Cuadre_Caja_${new Date().getTime()}.pdf`);
};
