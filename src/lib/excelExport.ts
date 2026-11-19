import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { logos } from './logosBase64';

export const exportToExcelWithLogos = async (
  data: any[],
  filename: string,
  sheetName: string = 'Data',
  reportTitle?: string
) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName, {
    views: [{ showGridLines: true }]
  });

  // Función para agregar logos con proporción correcta y segura
  const addLogo = (base64Str: string, col: number, row: number, width: number, height: number) => {
    try {
      if (!base64Str) return;
      const cleanBase64 = base64Str.includes('base64,') ? base64Str.split('base64,')[1] : base64Str;
      const imageId = workbook.addImage({
        base64: cleanBase64,
        extension: 'png',
      });
      worksheet.addImage(imageId, {
        tl: { col: col, row: row },
        ext: { width, height }
      });
    } catch (e) {
      console.warn('Could not add image to excel', e);
    }
  };

  // Insertar logos oficiales institucionales
  addLogo(logos.alcaldia, 0.2, 0.4, 75, 75);
  addLogo(logos.isma, 2.2, 0.4, 75, 75);
  addLogo(logos.global_rec || logos.global_green, 4.2, 0.4, 85, 75);
  addLogo(logos.basura_cero, 6.2, 0.4, 75, 75);

  // Espacio para membrete
  for (let i = 0; i < 5; i++) {
    worksheet.addRow([]);
  }

  // Fila institucional de Alcaldía y Municipio
  const institucionRow = worksheet.addRow(['ALCALDÍA DEL MUNICIPIO JOSÉ LAURENCIO SILVA · TUCACAS, ESTADO FALCÓN']);
  institucionRow.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF1E293B' } };
  institucionRow.alignment = { vertical: 'middle' };

  const subInstitucionRow = worksheet.addRow(['INSTITUTO DE SERVICIOS MUNICIPALES DE ASEO URBANO (ISMA) & GLOBAL REC COLLECTION SYSTEM']);
  subInstitucionRow.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF64748B' } };
  subInstitucionRow.alignment = { vertical: 'middle' };

  // Título del reporte
  const titleText = reportTitle || `Padrón Oficial de Contribuyentes (${sheetName})`;
  const titleRow = worksheet.addRow([titleText.toUpperCase()]);
  titleRow.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FF0F172A' } };
  titleRow.alignment = { vertical: 'middle' };

  // Fecha y hora de emisión del reporte
  const nowStr = new Date().toLocaleString('es-VE', { dateStyle: 'long', timeStyle: 'short' });
  const metaRow = worksheet.addRow([`Fecha de Generación: ${nowStr}  |  Total de Registros: ${data.length}`]);
  metaRow.font = { name: 'Calibri', size: 9, italic: true, color: { argb: 'FF475569' } };

  worksheet.addRow([]); // Fila vacía separadora

  if (data.length > 0) {
    const headers = Object.keys(data[0]);
    const headerRow = worksheet.addRow(headers);
    headerRow.height = 28;

    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1E3A8A' } // Azul corporativo oscuro
      };
      cell.font = {
        name: 'Calibri',
        size: 10,
        bold: true,
        color: { argb: 'FFFFFFFF' }
      };
      cell.alignment = {
        vertical: 'middle',
        horizontal: 'center',
        wrapText: true
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
        left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
      };
    });

    // Agregar filas de datos con formato alternado (cebra)
    data.forEach((item, index) => {
      const row = worksheet.addRow(Object.values(item));
      row.height = 20;
      const isEven = index % 2 === 0;

      row.eachCell((cell, colNumber) => {
        cell.font = { name: 'Calibri', size: 10, color: { argb: 'FF1E293B' } };
        cell.alignment = { vertical: 'middle' };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: isEven ? 'FFFFFFFF' : 'FFF8FAFC' }
        };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
        };

        // Si es la columna de deuda o meses o montos, centrar o alinear a la derecha
        const headerName = headers[colNumber - 1] || '';
        if (headerName.includes('(Bs)') || headerName.includes('MONTO') || headerName.includes('DEUDA')) {
          cell.alignment = { vertical: 'middle', horizontal: 'right' };
          cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF047857' } }; // Verde oscuro
        } else if (headerName.includes('CÓDIGO') || headerName.includes('R.I.F') || headerName.includes('TELÉFONO') || headerName.includes('MESES') || headerName.includes('CLASIFICACIÓN')) {
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        }
      });
    });

    // Autoajustar el ancho de las columnas
    worksheet.columns.forEach((column: any, i: number) => {
      let maxLen = headers[i] ? headers[i].length : 12;
      data.forEach((item) => {
        const val = Object.values(item)[i];
        if (val !== undefined && val !== null) {
          const strLen = String(val).length;
          if (strLen > maxLen) maxLen = strLen;
        }
      });
      column.width = Math.min(Math.max(maxLen + 4, 14), 45);
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), filename);
};

