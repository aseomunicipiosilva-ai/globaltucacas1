import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

export const generarEmpleadosExcel = async (data: any[]) => {
  if (data.length === 0) {
    alert("No hay registros de empleados.");
    return;
  }

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('EMPLEADOS');

  sheet.mergeCells('B6:J6');
  const titleCell = sheet.getCell('B6');
  titleCell.value = 'REPORTE MENSUAL DE GESTION DE EMPLEADOS';
  titleCell.font = { bold: true, size: 12 };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

  const headers = ['N°', 'FECHA', 'TIPO DE GESTION', 'CANAL DE COMUNICACION', 'CONTRIBUYENTE', 'INMUEBLE', 'EMPLEADO QUE GESTIONA', 'SOLVENTE', 'ULTIMO PAGO'];
  const row7 = sheet.getRow(7);
  headers.forEach((h, i) => {
    const cell = row7.getCell(i + 2);
    cell.value = h;
    cell.font = { bold: true, size: 9, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F497D' } }; // Azul oscuro
  });

  sheet.getColumn('B').width = 5;
  sheet.getColumn('C').width = 12;
  sheet.getColumn('D').width = 20;
  sheet.getColumn('E').width = 25;
  sheet.getColumn('F').width = 40;
  sheet.getColumn('G').width = 15;
  sheet.getColumn('H').width = 25;
  sheet.getColumn('I').width = 15;
  sheet.getColumn('J').width = 15;

  let currentRow = 8;
  data.forEach((d, index) => {
    const row = sheet.getRow(currentRow);
    row.getCell('B').value = index + 1;
    row.getCell('C').value = d.fecha ? new Date(d.fecha).toLocaleDateString('es-VE') : '';
    row.getCell('D').value = d.tipo_gestion || '';
    row.getCell('E').value = d.canal_comunicacion || '';
    row.getCell('F').value = d.nombre_contribuyente || '';
    row.getCell('G').value = d.inmueble || '';
    row.getCell('H').value = d.empleado || '';
    row.getCell('I').value = d.solvente_hasta || '';
    row.getCell('J').value = d.fecha_ultimo_pago ? new Date(d.fecha_ultimo_pago).toLocaleDateString('es-VE') : '';

    row.eachCell((cell) => {
      cell.font = { size: 9 };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    });
    currentRow++;
  });

  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), `Gestion_Empleados_${new Date().getTime()}.xlsx`);
};
