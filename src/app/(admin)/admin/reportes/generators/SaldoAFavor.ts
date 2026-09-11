import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

export const generarSaldosFavorExcel = async (
  contribuyentes: any[]
) => {
  const conSaldo = contribuyentes.filter((c: any) => parseFloat(c.SaldoFavor || '0') > 0);
  
  if (conSaldo.length === 0) {
    alert("No hay contribuyentes con saldo a favor.");
    return;
  }

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('SALDOS A FAVOR');

  // Title
  sheet.mergeCells('B6:H6');
  const titleCell = sheet.getCell('B6');
  titleCell.value = `REPORTE SALDOS A FAVOR ( Todos ) Al: ${new Date().toLocaleString('es-VE')}`;
  titleCell.font = { bold: true, size: 12 };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

  // Headers (Row 7)
  const headers = ['#', 'Contribuyente', 'Inmueble', 'Pago Hasta', 'Períodos Vencidos', 'Saldo a Favor', 'Deuda'];
  const row7 = sheet.getRow(7);
  headers.forEach((h, i) => {
    const cell = row7.getCell(i + 2); // Start at B (column 2)
    cell.value = h;
    cell.font = { bold: true, size: 9 };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' }
    };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
  });

  sheet.getColumn('B').width = 5;
  sheet.getColumn('C').width = 45;
  sheet.getColumn('D').width = 12;
  sheet.getColumn('E').width = 15;
  sheet.getColumn('F').width = 15;
  sheet.getColumn('G').width = 15;
  sheet.getColumn('H').width = 15;

  let currentRow = 8;
  let totalSaldo = 0;
  let totalDeuda = 0;

  conSaldo.forEach((c, index) => {
    const saldo = parseFloat(c.SaldoFavor || '0');
    const deuda = 0; // Se necesitaria conectar con las facturas para saber la deuda exacta
    totalSaldo += saldo;
    totalDeuda += deuda;

    const row = sheet.getRow(currentRow);
    row.getCell('B').value = index + 1;
    row.getCell('C').value = `${c.Identidad} ${c.Contribuyente}`;
    row.getCell('D').value = c.CodCont || 'N/A';
    row.getCell('E').value = 'N/A'; // Necesita historial de pago
    row.getCell('F').value = 0; // Necesita calculo
    row.getCell('G').value = saldo;
    row.getCell('H').value = deuda;

    row.eachCell((cell, colNumber) => {
      cell.font = { size: 9 };
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      if (colNumber === 7 || colNumber === 8) {
        cell.numFmt = '#,##0.00';
      }
    });

    currentRow++;
  });

  // Totals Row
  const totalsRow = sheet.getRow(currentRow);
  sheet.mergeCells(`B${currentRow}:F${currentRow}`);
  const totalsLabel = totalsRow.getCell('B');
  totalsLabel.value = 'TOTALES';
  totalsLabel.font = { bold: true, size: 10 };
  totalsLabel.alignment = { horizontal: 'right', vertical: 'middle' };

  totalsRow.getCell('G').value = totalSaldo;
  totalsRow.getCell('H').value = totalDeuda;

  for(let c = 2; c <= 8; c++) {
    const cell = totalsRow.getCell(c);
    cell.font = { bold: true, size: 10 };
    cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    if (c === 7 || c === 8) cell.numFmt = '#,##0.00';
  }

  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), `Saldo_A_Favor_${new Date().getTime()}.xlsx`);
};
