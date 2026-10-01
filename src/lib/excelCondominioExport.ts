import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { logos } from './logosBase64';

export const exportCondominioEstadoCuenta = async (
  condominio: any,
  recibos: any[],
  unidades: any[],
  tcmmv: number
) => {
  const workbook = new ExcelJS.Workbook();
  const dateStr = new Date().toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const periodStr = `${new Date().getMonth() + 1}/${new Date().getFullYear()} - ${new Date().getMonth() + 1}/${new Date().getFullYear()}`;

  // Calcula deuda consolidada
  let totalDeudaBs = 0;
  let totalMultasBs = 0;
  recibos.forEach(f => {
    let monto = parseFloat(String(f.monto || '0').replace(/[^\d.]/g, '')) || 0;
    totalDeudaBs += monto;
  });

  const deudaTotalBs = totalDeudaBs + totalMultasBs;
  const mesesPendientes = recibos.length;
  const cantidadUnidades = unidades.length > 0 ? unidades.length : (condominio.cantidad_unidades || 0);

  // Helper formats
  const formatBs = (num: number) => `Bs. ${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const blueFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
  const lightBlueFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFB4C6E7' } };
  const borders = {
    top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}
  };

  const addLogos = (sheet: ExcelJS.Worksheet) => {
    try {
      const img1 = workbook.addImage({ base64: logos.isma, extension: 'jpeg' });
      sheet.addImage(img1, { tl: { col: 0, row: 0 }, ext: { width: 180, height: 60 } });
      sheet.addRow([]);
      sheet.addRow([]);
      sheet.addRow([]);
    } catch (e) {}
  };

  // ===================== HOJA 1: RESUMEN =====================
  const sheetResumen = workbook.addWorksheet('Resumen');
  addLogos(sheetResumen);

  const titleRow = sheetResumen.addRow(['ESTADO DE CUENTA - CONDOMINIO']);
  titleRow.font = { size: 11, bold: true };
  sheetResumen.mergeCells('A4:D4');
  sheetResumen.getCell('A4').fill = blueFill;

  sheetResumen.addRow([]);
  sheetResumen.addRow(['Empresa', 'ISMA', 'Fecha de Emisión', dateStr]).font = { bold: true };
  sheetResumen.addRow(['Agencia', 'Paseo La Granja', 'Período', periodStr]).font = { bold: true };
  sheetResumen.addRow([]);

  sheetResumen.addRow(['DATOS DEL CONDOMINIO']).font = { bold: true, size: 11 };
  sheetResumen.addRow(['Código', condominio.codigo || 'N/A']);
  sheetResumen.addRow(['Propietario', condominio.nombre || 'N/A']);
  sheetResumen.addRow(['RIF / C.I.', condominio.identidad || 'N/A']);
  sheetResumen.addRow(['Dirección', condominio.direccion || 'N/A']);
  sheetResumen.addRow(['Cantidad de Unidades', '', '', cantidadUnidades]);
  sheetResumen.addRow([]);

  sheetResumen.addRow(['RESUMEN DE DEUDA']).font = { bold: true, size: 11 };
  sheetResumen.addRow(['Deuda por Servicio de Aseo (Bs.)', '', '', formatBs(totalDeudaBs)]);
  sheetResumen.addRow(['Multas e Intereses (Bs.)', '', '', formatBs(totalMultasBs)]);
  sheetResumen.addRow(['DEUDA TOTAL (Bs.)', '', '', formatBs(deudaTotalBs)]).font = { bold: true };
  sheetResumen.addRow(['Meses Pendientes', '', '', mesesPendientes]);
  sheetResumen.addRow([]);

  sheetResumen.addRow(['ÍNDICE DE HOJAS']).font = { bold: true, size: 11 };
  sheetResumen.addRow(['Hoja 1 - Resumen', 'Resumen general del condominio y glosario de conceptos (esta hoja)']);
  sheetResumen.addRow(['Hoja 2 - Deuda Consolidada', 'Detalle mes a mes de la deuda consolidada del condominio']);
  sheetResumen.addRow(['Hoja 3 - Detalle por Unidad', 'Desglose de la deuda de cada unidad que compone el condominio']);
  sheetResumen.addRow([]);

  sheetResumen.addRow(['GLOSARIO DE CONCEPTOS']).font = { bold: true, size: 11 };
  sheetResumen.addRow(['Aseo Urbano', 'Monto mensual correspondiente al servicio de aseo urbano domiciliario.']);
  sheetResumen.addRow(['I.V.A', 'Impuesto al Valor Agregado aplicado sobre el monto del servicio. Aplica solo a actividades no exentas.']);
  sheetResumen.addRow(['Multas', 'Sanciones e intereses de mora aplicados por incumplimiento en el pago del servicio.']);
  sheetResumen.addRow(['Deuda Total', 'Suma de la deuda por servicio de aseo, IVA, multas e intereses de mora.']);
  sheetResumen.addRow(['UCD', 'Unidad de Cuenta de Deuda. Los montos se almacenan en UCD y se convierten a Bolívares.']);
  
  sheetResumen.columns.forEach(col => { col.width = 35; });

  // Agrega bordes a la seccion del glosario e indice para parecerse a la imagen
  for(let i=21; i<=31; i++) {
    sheetResumen.getRow(i).eachCell((cell) => {
      cell.border = borders;
    });
  }
  for(let i=8; i<=18; i++) {
    if(i !== 14 && i !== 13) {
      sheetResumen.getRow(i).eachCell((cell) => {
        cell.border = borders;
      });
    }
  }

  // ===================== HOJA 2: DEUDA CONSOLIDADA =====================
  const sheetConsolidada = workbook.addWorksheet('Deuda Consolidada');
  addLogos(sheetConsolidada);

  const title2Row = sheetConsolidada.addRow(['DEUDA CONSOLIDADA DEL CONDOMINIO - DETALLE POR MES']);
  title2Row.font = { size: 11, bold: true };
  sheetConsolidada.mergeCells('A4:E4');
  sheetConsolidada.getCell('A4').fill = blueFill;
  sheetConsolidada.addRow([]);

  sheetConsolidada.addRow(['Código', condominio.codigo || 'N/A', '', 'Fecha de Emisión', dateStr]);
  sheetConsolidada.addRow(['Propietario', condominio.nombre || 'N/A', '', 'Período', periodStr]);
  sheetConsolidada.addRow(['RIF / C.I.', condominio.identidad || 'N/A', '', 'Meses Pendientes', mesesPendientes]);
  sheetConsolidada.addRow(['Actividad Económica', 'N/A']);
  sheetConsolidada.addRow([]);

  const headersConsolidada = ['Período', 'Aseo Urbano (Bs.)', 'I.V.A (Bs.)', 'Multas e Intereses (Bs.)', 'Total (Bs.)'];
  const hRow = sheetConsolidada.addRow(headersConsolidada);
  hRow.font = { bold: true };
  hRow.eachCell(c => c.border = borders);

  let sumAseo = 0;
  let sumIva = 0;
  let sumMultas = 0;
  let sumTotal = 0;

  recibos.forEach(f => {
    let monto = parseFloat(String(f.monto || '0').replace(/[^\d.]/g, '')) || 0;
    let iva = 0; 
    let multas = 0;
    let total = monto + iva + multas;
    sumAseo += monto; sumIva += iva; sumMultas += multas; sumTotal += total;

    const row = sheetConsolidada.addRow([
      f.emision ? f.emision.substring(0,7) : periodStr, 
      formatBs(monto), formatBs(iva), formatBs(multas), formatBs(total)
    ]);
    row.eachCell(c => c.border = borders);
  });

  const tRow = sheetConsolidada.addRow(['TOTALES', formatBs(sumAseo), formatBs(sumIva), formatBs(sumMultas), formatBs(sumTotal)]);
  tRow.font = { bold: true };
  tRow.eachCell(c => c.border = borders);
  sheetConsolidada.columns.forEach(col => { col.width = 25; });

  // ===================== HOJA 3: DETALLE POR UNIDAD =====================
  const sheetUnidades = workbook.addWorksheet('Detalle por Unidad');
  addLogos(sheetUnidades);

  const title3Row = sheetUnidades.addRow([`DETALLE POR UNIDAD - CONDOMINIO ${condominio.codigo || ''}`]);
  title3Row.font = { size: 11, bold: true };
  sheetUnidades.mergeCells('A4:K4');
  sheetUnidades.getCell('A4').fill = blueFill;
  sheetUnidades.addRow([]);

  sheetUnidades.addRow(['Condominio', `${condominio.codigo || ''} - ${condominio.nombre || ''}`, '', '', 'Emisión', dateStr, 'Período', periodStr]);
  sheetUnidades.addRow([]);

  const headersUnidades = [
    'Código', 'Nombre / Razón Social', 'Nro. Inmueble', 'RIF / C.I.', 
    'Actividad Económica', 'Monto Mensual (Bs.)', 'Meses Pend.', 
    'Deuda Aseo (Bs.)', 'Meses Multas', 'Multas e Int. (Bs.)'
  ];
  const hRow3 = sheetUnidades.addRow(headersUnidades);
  hRow3.font = { bold: true };
  hRow3.eachCell(c => { c.fill = lightBlueFill; c.border = borders; });

  const deudaUnitariaMensual = cantidadUnidades > 0 ? ((sumAseo / cantidadUnidades) / (mesesPendientes || 1)) : 0;
  const deudaUnitariaTotal = cantidadUnidades > 0 ? (sumAseo / cantidadUnidades) : 0;

  if (unidades.length > 0) {
    unidades.forEach(u => {
      const uRow = sheetUnidades.addRow([
        u.codigo || 'N/A',
        u.propietario || 'No asignado',
        u.numero_unidad || 'N/A',
        u.cedula_rif || 'N/A',
        u.actividad_economica || 'N/A',
        formatBs(deudaUnitariaMensual),
        mesesPendientes,
        formatBs(deudaUnitariaTotal),
        0,
        formatBs(0)
      ]);
      uRow.eachCell(c => c.border = borders);
    });
  } else {
    sheetUnidades.addRow(['Sin unidades registradas', '', '', '', '', '', '', '', '', '']);
  }

  sheetUnidades.columns.forEach(col => { col.width = 20; });

  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), `EstadoCuenta_Condominio_${condominio.identidad}.xlsx`);
};
