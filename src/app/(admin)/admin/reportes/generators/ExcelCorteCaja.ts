import * as XLSX from 'xlsx-js-style';

export const generarCorteCajaExcel = (
  pagosFiltrados: any[], 
  cajeroNombre: string, 
  fechaInicio: string, 
  fechaFin: string
) => {
  function parseDet(p: any): any {
    if (!p.detalles) return {};
    if (typeof p.detalles === 'object') return p.detalles;
    try { return JSON.parse(p.detalles); } catch { return {}; }
  }
  function isDebito(p: any) { return p.tipo === 'Debito' || p.tipo === 'REC' || p.tipo === 'Punto de Venta'; }
  function isSaldo(p: any) { return p.tipo === 'Saldo a Favor'; }

  const debitos = pagosFiltrados.filter(p => isDebito(p));
  const transferencias = pagosFiltrados.filter(p => !isDebito(p) && !isSaldo(p));
  const saldos = pagosFiltrados.filter(p => isSaldo(p));

  const defaultRate = 976.9007;
  const wb = XLSX.utils.book_new();

  // STYLES
  const TITLE_STYLE = {
    font: { bold: true, color: { rgb: "FFFFFF" }, sz: 12 },
    fill: { fgColor: { rgb: "315ba1" } },
    alignment: { horizontal: "right", vertical: "center" }
  };
  const SUBTITLE_STYLE = {
    font: { color: { rgb: "FFFFFF" }, sz: 10, italic: true },
    fill: { fgColor: { rgb: "315ba1" } },
    alignment: { horizontal: "right", vertical: "center" }
  };
  const SECTION_STYLE = {
    font: { bold: true, color: { rgb: "FFFFFF" }, sz: 11 },
    fill: { fgColor: { rgb: "497ac9" } }, // Slightly lighter blue
    alignment: { horizontal: "left", vertical: "center" }
  };
  const HEADER_STYLE = {
    font: { bold: true, color: { rgb: "315ba1" }, sz: 10 },
    fill: { fgColor: { rgb: "e2e9f3" } },
    alignment: { horizontal: "center", vertical: "center" },
    border: {
      top: { style: "thin", color: { rgb: "000000" } },
      bottom: { style: "thin", color: { rgb: "000000" } },
      left: { style: "thin", color: { rgb: "000000" } },
      right: { style: "thin", color: { rgb: "000000" } }
    }
  };
  const CELL_STYLE = {
    font: { sz: 10 },
    alignment: { horizontal: "center", vertical: "center" },
    border: {
      bottom: { style: "hair", color: { rgb: "cccccc" } },
      left: { style: "thin", color: { rgb: "000000" } },
      right: { style: "thin", color: { rgb: "000000" } }
    }
  };
  const MONEY_STYLE = {
    ...CELL_STYLE,
    alignment: { horizontal: "right", vertical: "center" },
    numFmt: "#,##0.00"
  };
  const EDITABLE_STYLE = {
    font: { bold: true, color: { rgb: "000000" }, sz: 11 },
    fill: { fgColor: { rgb: "ffffcc" } },
    alignment: { horizontal: "right", vertical: "center" },
    border: {
      top: { style: "thin", color: { rgb: "000000" } },
      bottom: { style: "thin", color: { rgb: "000000" } },
      left: { style: "thin", color: { rgb: "000000" } },
      right: { style: "thin", color: { rgb: "000000" } }
    },
    numFmt: "#,##0.0000"
  };

  const wsData: any[][] = [];
  const merges: any[] = [];

  // ROW 1: Margin
  wsData.push([]); 

  // ROW 2: Header 1
  wsData.push([{ v: "", s: TITLE_STYLE }, { v: "ALCALDÍA DEL MUNICIPIO SILVA - ISMA", s: TITLE_STYLE }]);
  merges.push({ s: { r: 1, c: 1 }, e: { r: 1, c: 12 } });

  // ROW 3: Header 2
  wsData.push([{ v: "", s: TITLE_STYLE }, { v: "CORTE DE CAJA - REPORTE DETALLADO DE TRANSACCIONES Y SISTEMA DE PANTALLA", s: TITLE_STYLE }]);
  merges.push({ s: { r: 2, c: 1 }, e: { r: 2, c: 12 } });

  // ROW 4: Header 3
  const fechas = fechaInicio === fechaFin ? fechaInicio : `${fechaInicio} al ${fechaFin}`;
  wsData.push([{ v: "", s: SUBTITLE_STYLE }, { v: `Fecha de Reporte: ${fechas} | Registros Totales: ${pagosFiltrados.length} | Cajero / Operador: ${cajeroNombre || 'Todos'}`, s: SUBTITLE_STYLE }]);
  merges.push({ s: { r: 3, c: 1 }, e: { r: 3, c: 12 } });

  // ROW 5: Empty
  wsData.push([]);

  // ROW 6: Tasa
  wsData.push([
    "", 
    { v: "Tasa de Cambio Referencial (Bs. / EUR):", s: { font: { bold: true } } }, 
    { v: defaultRate, t: 'n', s: EDITABLE_STYLE }, 
    { v: "*Celda editable: Tasa tomada para la conversión exacta a Euros*", s: { font: { italic: true, color: { rgb: "666666" } } } }
  ]);
  merges.push({ s: { r: 5, c: 3 }, e: { r: 5, c: 6 } }); // Merge the text cell

  // ROW 7: Empty
  wsData.push([]);

  // RESUMEN
  wsData.push([{ v: "", s: SECTION_STYLE }, { v: "RESUMEN DE OPERACIONES", s: SECTION_STYLE }]);
  merges.push({ s: { r: 7, c: 1 }, e: { r: 7, c: 12 } });

  wsData.push([
    "", 
    { v: "Concepto", s: HEADER_STYLE }, 
    { v: "Transacciones", s: HEADER_STYLE }, 
    { v: "Monto Total (Bs.)", s: HEADER_STYLE }, 
    { v: "Monto Total (EUR)", s: HEADER_STYLE }
  ]);
  
  const totalDebito = debitos.reduce((s, p) => s + (parseFloat(p.monto) || 0), 0);
  const totalTransf = transferencias.reduce((s, p) => { const d = parseDet(p); return s + (parseFloat(d.monto_conciliado || p.monto) || 0); }, 0);
  const totalSaldo = saldos.reduce((s, p) => s + (parseFloat(p.monto) || 0), 0);
  const totalGeneral = totalDebito + totalTransf + totalSaldo;

  const rowBaseBs = wsData.length;
  wsData.push(["", { v: "Tarjeta de Débito (Punto de Venta)", s: CELL_STYLE }, { v: debitos.length, s: CELL_STYLE }, { v: totalDebito, t: 'n', s: MONEY_STYLE }, { v: totalDebito / defaultRate, t: 'n', f: `IF($C$6>0, D${rowBaseBs + 1}/$C$6, 0)`, s: MONEY_STYLE }]);
  wsData.push(["", { v: "Transferencias Bancarias", s: CELL_STYLE }, { v: transferencias.length, s: CELL_STYLE }, { v: totalTransf, t: 'n', s: MONEY_STYLE }, { v: totalTransf / defaultRate, t: 'n', f: `IF($C$6>0, D${rowBaseBs + 2}/$C$6, 0)`, s: MONEY_STYLE }]);
  wsData.push(["", { v: "Saldo a Favor", s: CELL_STYLE }, { v: saldos.length, s: CELL_STYLE }, { v: totalSaldo, t: 'n', s: MONEY_STYLE }, { v: totalSaldo / defaultRate, t: 'n', f: `IF($C$6>0, D${rowBaseBs + 3}/$C$6, 0)`, s: MONEY_STYLE }]);
  
  wsData.push([
    "", 
    { v: "TOTAL GENERAL", s: { ...CELL_STYLE, font: { bold: true }, fill: { fgColor: { rgb: "e2e9f3" } } } }, 
    { v: pagosFiltrados.length, s: { ...CELL_STYLE, font: { bold: true }, fill: { fgColor: { rgb: "e2e9f3" } } } }, 
    { t: 'n', f: `SUM(D${rowBaseBs + 1}:D${rowBaseBs + 3})`, s: { ...MONEY_STYLE, font: { bold: true }, fill: { fgColor: { rgb: "e2e9f3" } } } }, 
    { v: totalGeneral / defaultRate, t: 'n', f: `SUM(E${rowBaseBs + 1}:E${rowBaseBs + 3})`, s: { ...MONEY_STYLE, font: { bold: true }, fill: { fgColor: { rgb: "e2e9f3" } } } }
  ]);
  
  wsData.push([]);

  // DEBITOS
  let curRow = wsData.length;
  wsData.push([{ v: "", s: SECTION_STYLE }, { v: "TRANSACCIONES DE PUNTO DE VENTA (DÉBITO) - VISTA DETALLADA CON CAJERO Y SISTEMA", s: SECTION_STYLE }]);
  merges.push({ s: { r: curRow, c: 1 }, e: { r: curRow, c: 12 } });

  wsData.push([
    "", 
    { v: "#", s: HEADER_STYLE }, 
    { v: "Fecha", s: HEADER_STYLE }, 
    { v: "Tipo", s: HEADER_STYLE }, 
    { v: "Cajero / Operador", s: HEADER_STYLE }, 
    { v: "Contribuyente (RIF / Nombre)", s: HEADER_STYLE }, 
    { v: "Recibo Sistema", s: HEADER_STYLE }, 
    { v: "Aprobación", s: HEADER_STYLE }, 
    { v: "Lote", s: HEADER_STYLE }, 
    { v: "Monto (Bs.)", s: HEADER_STYLE }, 
    { v: "Monto (EUR)", s: HEADER_STYLE }
  ]);
  
  debitos.forEach((p, i) => {
    const det = parseDet(p);
    const recs = det.recibos || [];
    const date = new Date(p.created_at).toLocaleDateString('es-VE');
    const monto = parseFloat(p.monto) || 0;
    const rIdx = wsData.length + 1;
    wsData.push([
      "", 
      { v: i + 1, s: CELL_STYLE }, 
      { v: date, s: CELL_STYLE }, 
      { v: "Debito", s: CELL_STYLE }, 
      { v: det.origen || det.cajero || '-', s: CELL_STYLE }, 
      { v: `${p.identidad} ${p.contribuyente || ''}`, s: { ...CELL_STYLE, alignment: { horizontal: "left" } } },
      { v: recs[0] || p.referencia || '-', s: CELL_STYLE }, 
      { v: det.aprobacion || '-', s: CELL_STYLE }, 
      { v: det.lote || '-', s: CELL_STYLE }, 
      { v: monto, t: 'n', s: MONEY_STYLE }, 
      { t: 'n', f: `IF($C$6>0, J${rIdx}/$C$6, 0)`, s: MONEY_STYLE }
    ]);
  });
  
  wsData.push([
    "", 
    { v: `Total Items: ${debitos.length}`, s: { ...CELL_STYLE, font: { bold: true }, fill: { fgColor: { rgb: "e2e9f3" } } } }, 
    { v: "", s: { ...CELL_STYLE, fill: { fgColor: { rgb: "e2e9f3" } } } }, 
    { v: "", s: { ...CELL_STYLE, fill: { fgColor: { rgb: "e2e9f3" } } } }, 
    { v: "", s: { ...CELL_STYLE, fill: { fgColor: { rgb: "e2e9f3" } } } }, 
    { v: "", s: { ...CELL_STYLE, fill: { fgColor: { rgb: "e2e9f3" } } } }, 
    { v: "", s: { ...CELL_STYLE, fill: { fgColor: { rgb: "e2e9f3" } } } }, 
    { v: "", s: { ...CELL_STYLE, fill: { fgColor: { rgb: "e2e9f3" } } } }, 
    { v: "", s: { ...CELL_STYLE, fill: { fgColor: { rgb: "e2e9f3" } } } }, 
    { v: totalDebito, t: 'n', s: { ...MONEY_STYLE, font: { bold: true }, fill: { fgColor: { rgb: "e2e9f3" } } } }, 
    { v: totalDebito / defaultRate, t: 'n', f: `IF($C$6>0, J${wsData.length + 1}/$C$6, 0)`, s: { ...MONEY_STYLE, font: { bold: true }, fill: { fgColor: { rgb: "e2e9f3" } } } }
  ]);
  merges.push({ s: { r: wsData.length - 1, c: 1 }, e: { r: wsData.length - 1, c: 8 } });
  wsData.push([]);

  // TRANSFERENCIAS
  curRow = wsData.length;
  wsData.push([{ v: "", s: SECTION_STYLE }, { v: "TRANSFERENCIAS REGISTRADAS EN EL SISTEMA (VISTA DE PANTALLA COMPLETA CON OPERADOR / CAJERO)", s: SECTION_STYLE }]);
  merges.push({ s: { r: curRow, c: 1 }, e: { r: curRow, c: 12 } });

  wsData.push([
    "", 
    { v: "#", s: HEADER_STYLE }, 
    { v: "Conciliado", s: HEADER_STYLE }, 
    { v: "Registro", s: HEADER_STYLE }, 
    { v: "Tipo", s: HEADER_STYLE }, 
    { v: "Cajero / Operador", s: HEADER_STYLE }, 
    { v: "Contribuyente (RIF / Razón Social)", s: HEADER_STYLE }, 
    { v: "Recibo Sistema", s: HEADER_STYLE }, 
    { v: "Banco", s: HEADER_STYLE }, 
    { v: "Referencia", s: HEADER_STYLE }, 
    { v: "Banco Destino", s: HEADER_STYLE }, 
    { v: "Monto (Bs.)", s: HEADER_STYLE }, 
    { v: "Monto (EUR)", s: HEADER_STYLE }
  ]);
  
  transferencias.forEach((p, i) => {
    const det = parseDet(p);
    const recs = det.recibos || [];
    const createdDate = new Date(p.created_at).toLocaleDateString('es-VE');
    const bankDate = det.fecha_banco ? new Date(det.fecha_banco).toLocaleDateString('es-VE') : '-';
    const monto = parseFloat(det.monto_conciliado || p.monto) || 0;
    const rIdx = wsData.length + 1;
    wsData.push([
      "", 
      { v: i + 1, s: CELL_STYLE }, 
      { v: createdDate, s: CELL_STYLE }, 
      { v: bankDate, s: CELL_STYLE }, 
      { v: "Transferencia", s: CELL_STYLE }, 
      { v: det.origen || det.cajero || '-', s: CELL_STYLE }, 
      { v: `${p.identidad} ${p.contribuyente || ''}`, s: { ...CELL_STYLE, alignment: { horizontal: "left" } } },
      { v: recs[0] || '-', s: CELL_STYLE }, 
      { v: p.banco || '-', s: CELL_STYLE }, 
      { v: p.referencia || '-', s: CELL_STYLE }, 
      { v: det.banco_destino || det.banco_receptor || '-', s: CELL_STYLE }, 
      { v: monto, t: 'n', s: MONEY_STYLE },
      { t: 'n', f: `IF($C$6>0, L${rIdx}/$C$6, 0)`, s: MONEY_STYLE }
    ]);
  });
  
  wsData.push([
    "", 
    { v: `Total Items: ${transferencias.length}`, s: { ...CELL_STYLE, font: { bold: true }, fill: { fgColor: { rgb: "e2e9f3" } } } }, 
    { v: "", s: { ...CELL_STYLE, fill: { fgColor: { rgb: "e2e9f3" } } } }, 
    { v: "", s: { ...CELL_STYLE, fill: { fgColor: { rgb: "e2e9f3" } } } }, 
    { v: "", s: { ...CELL_STYLE, fill: { fgColor: { rgb: "e2e9f3" } } } }, 
    { v: "", s: { ...CELL_STYLE, fill: { fgColor: { rgb: "e2e9f3" } } } }, 
    { v: "", s: { ...CELL_STYLE, fill: { fgColor: { rgb: "e2e9f3" } } } }, 
    { v: "", s: { ...CELL_STYLE, fill: { fgColor: { rgb: "e2e9f3" } } } }, 
    { v: "", s: { ...CELL_STYLE, fill: { fgColor: { rgb: "e2e9f3" } } } }, 
    { v: "", s: { ...CELL_STYLE, fill: { fgColor: { rgb: "e2e9f3" } } } }, 
    { v: "", s: { ...CELL_STYLE, fill: { fgColor: { rgb: "e2e9f3" } } } }, 
    { v: totalTransf, t: 'n', s: { ...MONEY_STYLE, font: { bold: true }, fill: { fgColor: { rgb: "e2e9f3" } } } }, 
    { v: totalTransf / defaultRate, t: 'n', f: `IF($C$6>0, L${wsData.length + 1}/$C$6, 0)`, s: { ...MONEY_STYLE, font: { bold: true }, fill: { fgColor: { rgb: "e2e9f3" } } } }
  ]);
  merges.push({ s: { r: wsData.length - 1, c: 1 }, e: { r: wsData.length - 1, c: 10 } });
  wsData.push([]);

  // SALDOS
  if (saldos.length > 0) {
    curRow = wsData.length;
    wsData.push([{ v: "", s: SECTION_STYLE }, { v: "SALDOS A FAVOR REGISTRADOS", s: SECTION_STYLE }]);
    merges.push({ s: { r: curRow, c: 1 }, e: { r: curRow, c: 12 } });

    wsData.push([
      "", 
      { v: "#", s: HEADER_STYLE }, 
      { v: "Fecha", s: HEADER_STYLE }, 
      { v: "Tipo", s: HEADER_STYLE }, 
      { v: "Cajero / Operador", s: HEADER_STYLE }, 
      { v: "Contribuyente (RIF / Razón Social)", s: HEADER_STYLE }, 
      { v: "Aplicado a", s: HEADER_STYLE }, 
      { v: "Monto (Bs.)", s: HEADER_STYLE }, 
      { v: "Monto (EUR)", s: HEADER_STYLE }
    ]);
    
    saldos.forEach((p, i) => {
      const date = new Date(p.created_at).toLocaleDateString('es-VE');
      const monto = parseFloat(p.monto) || 0;
      const rIdx = wsData.length + 1;
      wsData.push([
        "", 
        { v: i + 1, s: CELL_STYLE }, 
        { v: date, s: CELL_STYLE }, 
        { v: "Saldo a Favor", s: CELL_STYLE }, 
        { v: cajeroNombre || '-', s: CELL_STYLE }, 
        { v: `${p.identidad} ${p.contribuyente || ''}`, s: { ...CELL_STYLE, alignment: { horizontal: "left" } } },
        { v: p.referencia || '-', s: CELL_STYLE }, 
        { v: monto, t: 'n', s: MONEY_STYLE },
        { t: 'n', f: `IF($C$6>0, H${rIdx}/$C$6, 0)`, s: MONEY_STYLE }
      ]);
    });
    
    wsData.push([
      "", 
      { v: `Total Items: ${saldos.length}`, s: { ...CELL_STYLE, font: { bold: true }, fill: { fgColor: { rgb: "e2e9f3" } } } }, 
      { v: "", s: { ...CELL_STYLE, fill: { fgColor: { rgb: "e2e9f3" } } } }, 
      { v: "", s: { ...CELL_STYLE, fill: { fgColor: { rgb: "e2e9f3" } } } }, 
      { v: "", s: { ...CELL_STYLE, fill: { fgColor: { rgb: "e2e9f3" } } } }, 
      { v: "", s: { ...CELL_STYLE, fill: { fgColor: { rgb: "e2e9f3" } } } }, 
      { v: "", s: { ...CELL_STYLE, fill: { fgColor: { rgb: "e2e9f3" } } } }, 
      { v: totalSaldo, t: 'n', s: { ...MONEY_STYLE, font: { bold: true }, fill: { fgColor: { rgb: "e2e9f3" } } } }, 
      { v: totalSaldo / defaultRate, t: 'n', f: `IF($C$6>0, H${wsData.length + 1}/$C$6, 0)`, s: { ...MONEY_STYLE, font: { bold: true }, fill: { fgColor: { rgb: "e2e9f3" } } } }
    ]);
    merges.push({ s: { r: wsData.length - 1, c: 1 }, e: { r: wsData.length - 1, c: 6 } });
  }

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws['!merges'] = merges;
  ws['!cols'] = [
    { wch: 2 }, { wch: 10 }, { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 50 }, { wch: 18 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 18 }, { wch: 18 }
  ];
  
  XLSX.utils.book_append_sheet(wb, ws, "Corte de Caja");
  XLSX.writeFile(wb, `Corte_Caja_${new Date().getTime()}.xlsx`);
};
