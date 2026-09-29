import * as XLSX from 'xlsx';

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
  const wsData: any[][] = [];

  wsData.push([]);
  wsData.push(["", "ALCALDÍA DEL MUNICIPIO SILVA - ISMA"]);
  wsData.push(["", "CORTE DE CAJA - REPORTE DETALLADO DE TRANSACCIONES Y SISTEMA DE PANTALLA"]);
  const fechas = fechaInicio === fechaFin ? fechaInicio : `${fechaInicio} al ${fechaFin}`;
  wsData.push(["", `Fecha de Reporte: ${fechas} | Registros Totales: ${pagosFiltrados.length} | Cajero / Operador: ${cajeroNombre || 'Todos'}`]);
  wsData.push([]);
  wsData.push(["", "Tasa de Cambio Referencial (Bs. / EUR):", defaultRate, "*Celda editable: Tasa tomada para la conversión exacta a Euros*"]);
  wsData.push([]);
  wsData.push(["", "RESUMEN DE OPERACIONES"]);
  wsData.push(["", "Concepto", "Transacciones", "Monto Total (Bs.)", "Monto Total (EUR)"]);
  
  const totalDebito = debitos.reduce((s, p) => s + (parseFloat(p.monto) || 0), 0);
  const totalTransf = transferencias.reduce((s, p) => { const d = parseDet(p); return s + (parseFloat(d.monto_conciliado || p.monto) || 0); }, 0);
  const totalSaldo = saldos.reduce((s, p) => s + (parseFloat(p.monto) || 0), 0);
  const totalGeneral = totalDebito + totalTransf + totalSaldo;

  const debitRowIdx = wsData.length + 1;
  wsData.push(["", "Tarjeta de Débito (Punto de Venta)", debitos.length, totalDebito, { t: 'n', f: `IF($C$6>0, D${debitRowIdx}/$C$6, 0)` }]);
  const transfRowIdx = wsData.length + 1;
  wsData.push(["", "Transferencias Bancarias", transferencias.length, totalTransf, { t: 'n', f: `IF($C$6>0, D${transfRowIdx}/$C$6, 0)` }]);
  const saldoRowIdx = wsData.length + 1;
  wsData.push(["", "Saldo a Favor", saldos.length, totalSaldo, { t: 'n', f: `IF($C$6>0, D${saldoRowIdx}/$C$6, 0)` }]);
  const totalRowIdx = wsData.length + 1;
  wsData.push(["", "TOTAL GENERAL", pagosFiltrados.length, totalGeneral, { t: 'n', f: `SUM(E${debitRowIdx}:E${saldoRowIdx-1})` }]);
  wsData.push([]);

  wsData.push(["", "TRANSACCIONES DE PUNTO DE VENTA (DÉBITO) - VISTA DETALLADA CON CAJERO Y SISTEMA"]);
  wsData.push(["", "#", "Fecha", "Tipo", "Cajero / Operador", "Contribuyente (RIF / Nombre)", "Recibo Sistema", "Aprobación", "Lote", "Monto (Bs.)", "Monto (EUR)"]);
  debitos.forEach((p, i) => {
    const det = parseDet(p);
    const recs = det.recibos || [];
    const date = new Date(p.created_at).toLocaleDateString('es-VE');
    const monto = parseFloat(p.monto) || 0;
    const rowIdx = wsData.length + 1;
    wsData.push([
      "", i + 1, date, "Debito", det.cajero || '-', `${p.identidad} ${p.contribuyente || ''}`,
      recs[0] || p.referencia || '-', det.aprobacion || '-', det.lote || '-', monto, 
      { t: 'n', f: `IF($C$6>0, J${rowIdx}/$C$6, 0)` }
    ]);
  });
  wsData.push(["", `Total Items: ${debitos.length}`, "", "", "", "", "", "", "", totalDebito, { t: 'n', f: `IF($C$6>0, J${wsData.length + 1}/$C$6, 0)` }]);
  wsData.push([]);

  wsData.push(["", "TRANSFERENCIAS REGISTRADAS EN EL SISTEMA (VISTA DE PANTALLA COMPLETA CON OPERADOR / CAJERO)"]);
  wsData.push(["", "#", "Conciliado", "Registro", "Tipo", "Cajero / Operador", "Contribuyente (RIF / Razón Social)", "Recibo Sistema", "Banco", "Referencia", "Banco Destino", "Monto (Bs.)", "Monto (EUR)"]);
  transferencias.forEach((p, i) => {
    const det = parseDet(p);
    const recs = det.recibos || [];
    const createdDate = new Date(p.created_at).toLocaleDateString('es-VE');
    const bankDate = det.fecha_banco ? new Date(det.fecha_banco).toLocaleDateString('es-VE') : '-';
    const monto = parseFloat(det.monto_conciliado || p.monto) || 0;
    const rowIdx = wsData.length + 1;
    wsData.push([
      "", i + 1, createdDate, bankDate, "Transferencia", det.cajero || '-', `${p.identidad} ${p.contribuyente || ''}`,
      recs[0] || '-', p.banco || '-', p.referencia || '-', det.banco_destino || det.banco_receptor || '-', monto,
      { t: 'n', f: `IF($C$6>0, L${rowIdx}/$C$6, 0)` }
    ]);
  });
  wsData.push(["", `Total Items: ${transferencias.length}`, "", "", "", "", "", "", "", "", "", totalTransf, { t: 'n', f: `IF($C$6>0, L${wsData.length + 1}/$C$6, 0)` }]);
  wsData.push([]);

  if (saldos.length > 0) {
    wsData.push(["", "SALDOS A FAVOR REGISTRADOS"]);
    wsData.push(["", "#", "Fecha", "Tipo", "Cajero / Operador", "Contribuyente (RIF / Razón Social)", "Aplicado a", "Monto (Bs.)", "Monto (EUR)"]);
    saldos.forEach((p, i) => {
      const date = new Date(p.created_at).toLocaleDateString('es-VE');
      const monto = parseFloat(p.monto) || 0;
      const rowIdx = wsData.length + 1;
      wsData.push([
        "", i + 1, date, "Saldo a Favor", cajeroNombre || '-', `${p.identidad} ${p.contribuyente || ''}`,
        p.referencia || '-', monto,
        { t: 'n', f: `IF($C$6>0, H${rowIdx}/$C$6, 0)` }
      ]);
    });
    wsData.push(["", `Total Items: ${saldos.length}`, "", "", "", "", "", totalSaldo, { t: 'n', f: `IF($C$6>0, H${wsData.length + 1}/$C$6, 0)` }]);
  }

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws['!cols'] = [
    { wch: 2 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 18 }, { wch: 45 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 15 }, { wch: 15 }
  ];
  XLSX.utils.book_append_sheet(wb, ws, "Corte de Caja");
  XLSX.writeFile(wb, `Corte_Caja_${new Date().getTime()}.xlsx`);
};
