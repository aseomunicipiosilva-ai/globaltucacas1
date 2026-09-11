import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

export const generarFiscalizacionExcel = async (data: any[], tipo: string) => {
  if (data.length === 0) {
    alert("No hay registros para este reporte.");
    return;
  }

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('FISCALIZACION');

  sheet.mergeCells('B6:J6');
  const titleCell = sheet.getCell('B6');
  titleCell.value = tipo === 'general' ? 'REPORTE GENERAL DE FISCALIZACIONES' : 'REPORTE POR FISCALIZAR';
  titleCell.font = { bold: true, size: 12 };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

  const headers = ['N°', 'FECHA', 'CONTRIBUYENTE', 'RIF', 'INMUEBLE', 'TIPO', 'ESTATUS FISCAL', 'DEUDA', 'OBSERVACION'];
  const row7 = sheet.getRow(7);
  headers.forEach((h, i) => {
    const cell = row7.getCell(i + 2);
    cell.value = h;
    cell.font = { bold: true, size: 9, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF800080' } }; // Purpura
  });

  sheet.getColumn('B').width = 5;
  sheet.getColumn('C').width = 12;
  sheet.getColumn('D').width = 40;
  sheet.getColumn('E').width = 15;
  sheet.getColumn('F').width = 15;
  sheet.getColumn('G').width = 15;
  sheet.getColumn('H').width = 15;
  sheet.getColumn('I').width = 15;
  sheet.getColumn('J').width = 30;

  let currentRow = 8;
  data.forEach((d, index) => {
    const row = sheet.getRow(currentRow);
    row.getCell('B').value = index + 1;
    row.getCell('C').value = new Date().toLocaleDateString('es-VE'); // Simulado
    row.getCell('D').value = d.Contribuyente || '';
    row.getCell('E').value = d.Identidad || '';
    row.getCell('F').value = d.CodCont || '';
    row.getCell('G').value = 'Comercial';
    row.getCell('H').value = 'Por Fiscalizar';
    row.getCell('I').value = parseFloat(d.Deuda || '0');
    row.getCell('J').value = 'Requiere visita técnica';

    row.eachCell((cell, colNum) => {
      cell.font = { size: 9 };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      if (colNum === 9) cell.numFmt = '#,##0.00';
    });
    currentRow++;
  });

  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), `Fiscalizacion_${tipo}_${new Date().getTime()}.xlsx`);
};
