'use client';
import { useState, useMemo } from 'react';
import { ChevronDown, RefreshCw } from 'lucide-react';
import { generarCorteCajaPDF } from '../generators/PdfReports';
import { generarCorteCajaExcel } from '../generators/ExcelCorteCaja';

interface Props {
  pagos: any[];
  cajeros: string[];
  isAdmin: boolean;
  currentUser: string;
  onBack: () => void;
  loading?: boolean;
  onRefresh?: () => Promise<void>;
}

const fmtBs = (n: number) => n.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = (d: string) => { try { return new Date(d).toLocaleDateString('es-VE'); } catch { return d; } };
const fmtDT = (d: string) => {
  try {
    const dt = new Date(d);
    return dt.toLocaleDateString('es-VE') + ' - ' + dt.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch { return d; }
};
function parseDet(p: any): any {
  if (!p.detalles) return {};
  if (typeof p.detalles === 'object') return p.detalles;
  try { return JSON.parse(p.detalles); } catch { return {}; }
}
function isDebito(p: any) { return p.tipo === 'Debito' || p.tipo === 'REC' || p.tipo === 'Punto de Venta'; }
function isSaldo(p: any) { return p.tipo === 'Saldo a Favor'; }

function getEstadoStyle(estado: string): React.CSSProperties {
  if (estado === 'Aprobado') return { color: '#166534', fontWeight: 700 };
  if (estado === 'Por Verificar') return { color: '#b45309', fontWeight: 700, backgroundColor: '#fef3c7', padding: '2px 6px', borderRadius: 4 };
  if (estado === 'Con Diferencia') return { color: '#6d28d9', fontWeight: 700, backgroundColor: '#ede9fe', padding: '2px 6px', borderRadius: 4 };
  if (estado === 'Pendiente') return { color: '#c0392b', fontWeight: 700 };
  return { color: '#555' };
}

const getTodayStr = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const normalizeCajero = (s: string) => (s || '').replace(/^[A-Z]-/, '').trim().toLowerCase();
const matchCajero = (cajeroVal: string, filterVal: string) => {
  if (!filterVal || filterVal === '__todos__' || filterVal === 'Todos') return true;
  return normalizeCajero(cajeroVal) === normalizeCajero(filterVal);
};

const FORMAS = ['Todas', 'Debito', 'Transferencia', 'Saldo a Favor'];

export default function CuadreCaja({ pagos, cajeros, isAdmin, currentUser, onBack, loading, onRefresh }: Props) {
  const [cajero, setCajero] = useState(isAdmin ? '' : currentUser);
  const [forma, setForma] = useState('Todas');
  const [fecha, setFecha] = useState(getTodayStr());
  const [showReport, setShowReport] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      if (onRefresh) await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  const pagosFiltrados = useMemo(() => {
    if (!showReport) return [];
    const s = new Date(fecha + 'T00:00:00');
    const e = new Date(fecha + 'T23:59:59.999');

    return pagos.filter(p => {
      // Excluir pagos cancelados o rechazados
      if (p.estado === 'Anulado' || p.estado === 'Reversado' || p.estado === 'Condonado' || p.estado === 'Rechazado') return false;

      const det = parseDet(p);
      const dCreated = new Date(p.created_at);
      const dRegistro = det.fecha_registro ? new Date(det.fecha_registro) : null;
      const inRange = (dCreated >= s && dCreated <= e) || (dRegistro && dRegistro >= s && dRegistro <= e);
      if (!inRange) return false;

      const pCajero = det.cajero || det.analista || det.usuario || det.operador || det.origen || '';
      if (!isAdmin && !matchCajero(pCajero, currentUser)) return false;
      if (cajero && !matchCajero(pCajero, cajero)) return false;

      if (forma !== 'Todas') {
        if (forma === 'Debito' && !isDebito(p)) return false;
        if (forma === 'Transferencia' && (isDebito(p) || isSaldo(p))) return false;
        if (forma === 'Saldo a Favor' && !isSaldo(p)) return false;
      }

      return true;
    });
  }, [showReport, pagos, fecha, cajero, forma, isAdmin, currentUser]);

  const debitos = pagosFiltrados.filter(p => isDebito(p));
  const transferencias = pagosFiltrados.filter(p => !isDebito(p) && !isSaldo(p));
  const saldos = pagosFiltrados.filter(p => isSaldo(p));

  const totalDebito = debitos.reduce((s, p) => s + (parseFloat(p.monto) || 0), 0);
  const totalTransf = transferencias.reduce((s, p) => { const d = parseDet(p); return s + (parseFloat(d.monto_conciliado || p.monto) || 0); }, 0);
  const totalSaldo = saldos.reduce((s, p) => s + (parseFloat(p.monto) || 0), 0);
  const totalCuadre = totalDebito + totalTransf + totalSaldo;
  const cajeroLabel = cajero ? cajero : 'Todos';

  const S: Record<string, React.CSSProperties> = {
    hdr: { background: '#eeeef6', borderBottom: '1px solid #d5d5e5', padding: '10px 16px' },
    hdrTitle: { fontSize: 11, fontWeight: 700, color: '#444', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
    hdrRow: { display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'flex-end', width: '100%' },
    btnGen: { background: '#26b5b5', color: '#fff', border: 'none', padding: '8px 20px', borderRadius: 6, fontWeight: 700, cursor: 'pointer', fontSize: 13, whiteSpace: 'nowrap', alignSelf: 'flex-end' },
    btnRef: { background: '#3b82f6', color: '#fff', border: 'none', padding: '8px 18px', borderRadius: 6, fontWeight: 700, cursor: 'pointer', fontSize: 13, whiteSpace: 'nowrap', alignSelf: 'flex-end', display: 'inline-flex', alignItems: 'center', gap: 6 },
    fw: { display: 'flex', flexDirection: 'column' },
    fl: { fontSize: 11, fontWeight: 700, color: '#2a5298', marginBottom: 2 },
    fi: { border: '1px solid #bbb', borderRadius: 4, padding: '6px 10px', fontSize: 12, background: '#fff' },
    rptBox: { border: '1px solid #ccc', borderRadius: 4, marginTop: 12, overflow: 'hidden', fontFamily: 'Arial,sans-serif', fontSize: 13 },
    secHdr: { background: '#e8ecf2', textAlign: 'center', fontWeight: 700, fontSize: 13, padding: '7px 0', borderTop: '1px solid #ccc', borderBottom: '1px solid #ccc', letterSpacing: 1, position: 'relative' },
    th: { background: '#4a6fa5', color: '#fff', padding: '6px 8px', fontSize: 11, fontWeight: 700, textAlign: 'left', borderRight: '1px solid #3a5a90', whiteSpace: 'nowrap' },
    td: { padding: '5px 8px', fontSize: 11, borderRight: '1px solid #ebebeb', borderBottom: '1px solid #f0f0f0', whiteSpace: 'nowrap' },
    tf: { background: '#f0f4f8', fontWeight: 700, padding: '5px 8px', fontSize: 11, borderTop: '1px solid #ccc' },
  };

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', fontSize: 13 }}>
      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>🗂 Cuadre de Caja</div>
      <button onClick={onBack} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#2a5298', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 12 }}>
        ← Regresar
      </button>

      <div style={S.hdr}>
        <div style={S.hdrTitle}>Cuadre Caja</div>
        <div style={S.hdrRow}>
          <div style={S.fw}>
            <span style={S.fl}>Recaudacion - Cuadre Caja</span>
            <select value="Cuadre Caja" disabled style={S.fi}><option>Cuadre Caja</option></select>
          </div>

          <div style={S.fw}>
            <span style={S.fl}>Cajero</span>
            <select value={cajero} onChange={e => setCajero(e.target.value)} style={{ ...S.fi, minWidth: 220 }}>
              {isAdmin && <option value="">Todos los cajeros</option>}
              {cajeros.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div style={S.fw}>
            <span style={S.fl}>Forma de pago</span>
            <select value={forma} onChange={e => setForma(e.target.value)} style={S.fi}>
              {FORMAS.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>

          <div style={S.fw}>
            <span style={S.fl}>Fecha de Operación</span>
            <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} style={S.fi} />
          </div>

          <button onClick={() => setShowReport(true)} style={S.btnGen}>Generar Reporte</button>

          <button
            onClick={handleRefresh}
            disabled={loading || isRefreshing}
            style={{
              ...S.btnRef,
              opacity: (loading || isRefreshing) ? 0.7 : 1,
            }}
          >
            <RefreshCw size={14} className={(loading || isRefreshing) ? 'animate-spin' : ''} />
            {(loading || isRefreshing) ? 'Actualizando...' : 'Actualizar'}
          </button>
        </div>
      </div>

      {showReport && (
        <div style={S.rptBox}>
          <div style={{ ...S.secHdr, fontSize: 15, padding: '10px 0' }}>
            RESUMEN CUADRE DE CAJA
            <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', display: 'flex', gap: 6 }}>
              <button onClick={() => generarCorteCajaPDF(pagosFiltrados, [], fecha, fecha, 0, cajeroLabel)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }} title="Imprimir PDF">🖨</button>
              <button onClick={() => generarCorteCajaExcel(pagosFiltrados, cajeroLabel, fecha, fecha)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }} title="Descargar Excel">📊</button>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 200px', borderBottom: '1px solid #ccc' }}>
            <div style={{ padding: '10px 14px', borderRight: '1px solid #ccc', fontSize: 13 }}>
              <div><b>Debito Bs.:</b><span style={{ float: 'right' }}>{fmtBs(totalDebito)}</span></div>
              <div style={{ marginTop: 4 }}><b>Transferencia Bs.:</b><span style={{ float: 'right' }}>{fmtBs(totalTransf)}</span></div>
              {totalSaldo > 0 && <div style={{ marginTop: 4 }}><b>Saldo a Favor Bs.:</b><span style={{ float: 'right', color: '#1d4ed8' }}>{fmtBs(totalSaldo)}</span></div>}
            </div>
            <div style={{ padding: '10px 14px', borderRight: '1px solid #ccc', fontSize: 12 }}>
              <div><b>Fecha:</b> {fecha}</div>
              <div style={{ marginTop: 4 }}><b>Cajero:</b> {cajeroLabel}</div>
              <div style={{ textAlign: 'right', marginTop: 4 }}>Total Registros: <b>{pagosFiltrados.length}</b></div>
            </div>
            <div style={{ padding: '10px 14px', background: '#edfaed', textAlign: 'center' }}>
              <div style={{ fontWeight: 700, color: '#2a5298', marginBottom: 4 }}>Total Cuadre:</div>
              <div style={{ fontSize: 22, fontWeight: 900 }}>Bs. {fmtBs(totalCuadre)}</div>
            </div>
          </div>

          {/* Transferencias */}
          {transferencias.length > 0 && <>
            <div style={S.secHdr}>TRANSFERENCIAS ({transferencias.length})</div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>{['#', 'Fecha/Hora', 'Tipo', 'Cajero', 'Contribuyente', 'Recibo', 'Banco Emisor', 'Banco Destino', 'Referencia', 'Estado', 'Monto']
                    .map(h => <th key={h} style={S.th}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {transferencias.map((p, i) => {
                    const det = parseDet(p);
                    const recs: string[] = det.recibos || [];
                    const mC = parseFloat(det.monto_conciliado || p.monto) || 0;
                    return (
                      <tr key={p.id} style={{ background: i % 2 === 0 ? '#fff' : '#f9fafe' }}>
                        <td style={S.td}>{i + 1}</td>
                        <td style={S.td}>{fmtDT(p.created_at)}</td>
                        <td style={{ ...S.td, fontWeight: 700 }}>{p.tipo}</td>
                        <td style={S.td}>{det.cajero || '-'}</td>
                        <td style={{ ...S.td, color: '#2a5298' }}>{p.identidad} - {p.contribuyente || ''}</td>
                        <td style={S.td}>{recs[0] || '-'}</td>
                        <td style={S.td}>{p.banco || '-'}</td>
                        <td style={S.td}>{det.banco_destino || det.banco_receptor || '-'}</td>
                        <td style={S.td}>{p.referencia || '-'}</td>
                        <td style={S.td}><span style={getEstadoStyle(p.estado)}>{p.estado || '-'}</span></td>
                        <td style={{ ...S.td, textAlign: 'right', fontWeight: 700 }}>{fmtBs(mC)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={10} style={S.tf}>Total Items: {transferencias.length}</td>
                    <td style={{ ...S.tf, textAlign: 'right' }}>Total Transferencia: {fmtBs(totalTransf)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </>}

          {/* Debitos */}
          {debitos.length > 0 && <>
            <div style={S.secHdr}>DÉBITO / PUNTO DE VENTA ({debitos.length})</div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>{['#', 'Fecha/Hora', 'Tipo', 'Cajero', 'Contribuyente', 'Recibo', 'Banco', 'Aprobacion', 'Lote', 'Estado', 'Monto']
                    .map(h => <th key={h} style={S.th}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {debitos.map((p, i) => {
                    const det = parseDet(p);
                    const recs: string[] = det.recibos || [];
                    return (
                      <tr key={p.id} style={{ background: i % 2 === 0 ? '#fff' : '#f9fafe' }}>
                        <td style={S.td}>{i + 1}</td>
                        <td style={S.td}>{fmtDT(p.created_at)}</td>
                        <td style={{ ...S.td, fontWeight: 700 }}>{p.tipo}</td>
                        <td style={S.td}>{det.cajero || '-'}</td>
                        <td style={{ ...S.td, color: '#2a5298' }}>{p.identidad} - {p.contribuyente || ''}</td>
                        <td style={S.td}>{recs[0] || p.referencia || '-'}</td>
                        <td style={S.td}>{p.banco || '-'}</td>
                        <td style={S.td}>{det.aprobacion || '-'}</td>
                        <td style={S.td}>{det.lote || '-'}</td>
                        <td style={S.td}><span style={getEstadoStyle(p.estado)}>{p.estado || 'Aprobado'}</span></td>
                        <td style={{ ...S.td, textAlign: 'right', fontWeight: 700 }}>{fmtBs(parseFloat(p.monto) || 0)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={10} style={S.tf}>Total Items: {debitos.length}</td>
                    <td style={{ ...S.tf, textAlign: 'right' }}>Total Debito: {fmtBs(totalDebito)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </>}

          {/* Saldo a Favor */}
          {saldos.length > 0 && <>
            <div style={S.secHdr}>SALDO A FAVOR ({saldos.length})</div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>{['#', 'Fecha/Hora', 'Tipo', 'Cajero', 'Contribuyente', 'Recibo', 'Referencia', 'Estado', 'Monto']
                    .map(h => <th key={h} style={S.th}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {saldos.map((p, i) => {
                    const det = parseDet(p);
                    const recs: string[] = det.recibos || [];
                    return (
                      <tr key={p.id} style={{ background: i % 2 === 0 ? '#fff' : '#f9fafe' }}>
                        <td style={S.td}>{i + 1}</td>
                        <td style={S.td}>{fmtDT(p.created_at)}</td>
                        <td style={{ ...S.td, fontWeight: 700 }}>{p.tipo}</td>
                        <td style={S.td}>{det.cajero || '-'}</td>
                        <td style={{ ...S.td, color: '#2a5298' }}>{p.identidad} - {p.contribuyente || ''}</td>
                        <td style={S.td}>{recs[0] || '-'}</td>
                        <td style={S.td}>{p.referencia || '-'}</td>
                        <td style={S.td}><span style={getEstadoStyle(p.estado)}>{p.estado || 'Aprobado'}</span></td>
                        <td style={{ ...S.td, textAlign: 'right', fontWeight: 700, color: '#1d4ed8' }}>{fmtBs(parseFloat(p.monto) || 0)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={8} style={S.tf}>Total Items: {saldos.length}</td>
                    <td style={{ ...S.tf, textAlign: 'right' }}>Total Saldo: {fmtBs(totalSaldo)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </>}

          {pagosFiltrados.length === 0 && (
            <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>
              No se encontraron registros de caja para la fecha seleccionada ({fecha}).
            </div>
          )}
        </div>
      )}
    </div>
  );
}
