import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

export const generarLibroVentas = async (
  pagosFiltrados: any[], 
  contribuyentes: any[], 
  tipo: 'Diario' | 'Semanal' | 'Mensual',
  fechaInicio: string,
  fechaFin: string
) => {
  if (pagosFiltrados.length === 0) {
    alert('No hay pagos en el rango de fechas seleccionado.');
    return;
  }

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('LIBRO DE VENTAS');

  const startDate = fechaInicio ? new Date(fechaInicio + 'T00:00:00').toLocaleDateString('es-VE') : new Date().toLocaleDateString('es-VE');
  const endDate = fechaFin ? new Date(fechaFin + 'T23:59:59').toLocaleDateString('es-VE') : new Date().toLocaleDateString('es-VE');
  
  sheet.mergeCells('B6:Q6');
  const titleCell = sheet.getCell('B6');
  titleCell.value = 'LIBRO DE VENTAS Período desde ' + startDate + ' Hasta ' + endDate;
  titleCell.font = { bold: true, size: 12 };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

  sheet.mergeCells('B7:B9'); sheet.getCell('B7').value = 'Nº';
  sheet.mergeCells('C7:C9'); sheet.getCell('C7').value = 'FECHA';
  sheet.mergeCells('D7:D9'); sheet.getCell('D7').value = 'NOMBRE / DENOMINACIÓN COMERCIAL DEL CLIENTE';
  sheet.mergeCells('E7:E9'); sheet.getCell('E7').value = 'RIF';
  sheet.mergeCells('F7:F9'); sheet.getCell('F7').value = 'Nº FACTURA';
  sheet.mergeCells('G7:G9'); sheet.getCell('G7').value = 'Nº DE CONTROL DE FACTURA';
  sheet.mergeCells('H7:H9'); sheet.getCell('H7').value = 'Nº DE NOTA DE CREDITO';
  sheet.mergeCells('I7:I9'); sheet.getCell('I7').value = 'Nº DE NOTA DE DEBITO';
  sheet.mergeCells('J7:J9'); sheet.getCell('J7').value = 'TOTAL VENTAS INCLUYE IVA';
  sheet.mergeCells('K7:K9'); sheet.getCell('K7').value = 'VENTAS EXENTAS';

  sheet.mergeCells('L7:P7'); sheet.getCell('L7').value = 'VENTAS AFECTADAS (DEBITO FISCAL)';
  sheet.mergeCells('Q7:Q9'); sheet.getCell('Q7').value = 'RETENCION DE IVA';

  sheet.mergeCells('L8:N8'); sheet.getCell('L8').value = 'A CONTRIBUYENTE';
  sheet.mergeCells('O8:P8'); sheet.getCell('O8').value = 'NO CONTRIBUYENTE';

  sheet.getCell('L9').value = 'BASE';
  sheet.getCell('M9').value = 'IVA';
  sheet.getCell('N9').value = '%';
  sheet.getCell('O9').value = 'BASE';
  sheet.getCell('P9').value = 'IVA';

  for (let r = 7; r <= 9; r++) {
    const row = sheet.getRow(r);
    row.eachCell((cell) => {
      cell.font = { bold: true, size: 8 };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
      if (!cell.fill) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFD9D9D9' }
        };
      }
    });
  }

  sheet.getColumn('B').width = 5;
  sheet.getColumn('C').width = 12;
  sheet.getColumn('D').width = 40;
  sheet.getColumn('E').width = 15;
  sheet.getColumn('F').width = 15;
  sheet.getColumn('G').width = 15;
  sheet.getColumn('J').width = 15;
  sheet.getColumn('K').width = 15;
  sheet.getColumn('L').width = 12;
  sheet.getColumn('M').width = 12;
  sheet.getColumn('N').width = 5;
  sheet.getColumn('O').width = 12;
  sheet.getColumn('P').width = 12;
  sheet.getColumn('Q').width = 15;

  let currentRow = 10;
  let totalVentas = 0;
  let totalExentas = 0;

  pagosFiltrados.forEach((p, index) => {
    const contribuyenteInfo = contribuyentes.find((c: any) => c.Identidad === p.identidad);
    const monto = parseFloat(p.monto || '0');
    totalVentas += monto;
    totalExentas += monto;

    const row = sheet.getRow(currentRow);
    row.getCell('B').value = index + 1;
    row.getCell('C').value = new Date(p.created_at).toLocaleDateString('es-VE');
    row.getCell('D').value = contribuyenteInfo ? contribuyenteInfo.Contribuyente : 'N/A';
    row.getCell('E').value = p.identidad;
    row.getCell('F').value = p.referencia || 'N/A';
    row.getCell('G').value = 0;
    row.getCell('H').value = '';
    row.getCell('I').value = '';
    row.getCell('J').value = monto;
    row.getCell('K').value = monto;
    row.getCell('L').value = 0;
    row.getCell('M').value = 0;
    row.getCell('N').value = 16;
    row.getCell('O').value = 0;
    row.getCell('P').value = 0;
    row.getCell('Q').value = 0;

    row.eachCell((cell, colNumber) => {
      cell.font = { size: 9 };
      cell.alignment = { horizontal: colNumber === 4 ? 'left' : 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
      if (colNumber >= 10 && colNumber <= 17) {
        cell.numFmt = '#,##0.00';
      }
    });

    currentRow++;
  });

  const totalsRow = sheet.getRow(currentRow);
  sheet.mergeCells("B" + currentRow + ":I" + currentRow);
  const totalsLabel = totalsRow.getCell('B');
  totalsLabel.value = 'TOTALES';
  totalsLabel.font = { bold: true, size: 9 };
  totalsLabel.alignment = { horizontal: 'right', vertical: 'middle' };

  totalsRow.getCell('J').value = totalVentas;
  totalsRow.getCell('K').value = totalExentas;
  totalsRow.getCell('L').value = 0;
  totalsRow.getCell('M').value = 0;
  totalsRow.getCell('N').value = '';
  totalsRow.getCell('O').value = 0;
  totalsRow.getCell('P').value = 0;
  totalsRow.getCell('Q').value = 0;

  for(let c = 2; c <= 17; c++) {
    const cell = totalsRow.getCell(c);
    cell.font = { bold: true, size: 9 };
    cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
    };
    if (c >= 10 && c <= 17 && c !== 14) cell.numFmt = '#,##0.00';
  }

  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), `Libro_Ventas_${tipo}_${new Date().getTime()}.xlsx`);
};
