const fs = require('fs');
const path = 'c:/Users/david/Desktop/tucacas/global_green_tucacas/src/app/(admin)/admin/reportes/views/CajaIngresosMain.tsx';
let c = fs.readFileSync(path, 'utf8');
const nl = c.includes('\r\n') ? '\r\n' : '\n';

// 1. Add new states after existing showReport/showCajaDD states
const OLD1 = `  const [showReport, setShowReport] = useState(false);
  const [showCajaDD, setShowCajaDD] = useState(false);`;
const NEW1 = `  const [showReport, setShowReport] = useState(false);
  const [showCajaDD, setShowCajaDD] = useState(false);
  const [cerrando, setCerrando] = useState(false);
  const [cajaCerrada, setCajaCerrada] = useState(false);
  const [showConfirmCierre, setShowConfirmCierre] = useState(false);`;

// 2. Add handleCerrarCaja function before return (
const OLD2 = `  return (
    <div style={{ fontFamily: 'Arial, sans-serif', fontSize: 13 }}>`;
const NEW2 = `  const handleCerrarCaja = async () => {
    setCerrando(true);
    setShowConfirmCierre(false);
    try {
      // Mostrar el reporte automaticamente
      setShowReport(true);
      await new Promise(r => setTimeout(r, 400));
      // Descargar PDF del Corte de Caja
      generarCorteCajaPDF(pagosFiltrados, contribuyentes, fechaInicio, fechaFin);
      setCajaCerrada(true);
    } catch (e) {
      alert('Error al cerrar caja: ' + e.message);
    } finally {
      setCerrando(false);
    }
  };

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', fontSize: 13 }}>`;

// 3. Replace the single Generar Reporte button with it + Cerrar Caja button + Confirm modal
const OLD3 = `          <button onClick={() => { setShowReport(true); setShowCajaDD(false); }} style={S.btnGen}>Generar Reporte</button>
        </div>
      </div>`;
const NEW3 = `          <button onClick={() => { setShowReport(true); setShowCajaDD(false); }} style={S.btnGen}>Generar Reporte</button>
          <button
            onClick={() => setShowConfirmCierre(true)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: cajaCerrada ? '#166534' : '#dc2626',
              color: '#fff', border: 'none', borderRadius: 6,
              padding: '8px 18px', fontWeight: 700, fontSize: 13,
              cursor: cerrando ? 'not-allowed' : 'pointer',
              opacity: cerrando ? 0.7 : 1,
              boxShadow: '0 2px 8px rgba(220,38,38,0.35)',
              transition: 'all 0.2s',
              letterSpacing: 0.3,
            }}
            disabled={cerrando}
          >
            {cajaCerrada ? '✅ Caja Cerrada' : cerrando ? '⏳ Cerrando...' : '🔒 Cerrar Caja'}
          </button>
        </div>
      </div>

      {/* Modal de confirmacion de cierre de caja */}
      {showConfirmCierre && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            background: '#fff', borderRadius: 12, padding: 32, maxWidth: 420, width: '90%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.4)', textAlign: 'center',
          }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🔒</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#1e293b', marginBottom: 8 }}>
              ¿Cerrar Caja?
            </div>
            <div style={{ fontSize: 13, color: '#64748b', marginBottom: 20, lineHeight: 1.6 }}>
              Se generará y descargará automáticamente el{' '}
              <b>Reporte de Corte de Caja</b> en PDF para el período seleccionado.
              <br />
              <span style={{ color: '#dc2626', fontWeight: 600 }}>
                Cajero: {cajeroLabel}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button
                onClick={() => setShowConfirmCierre(false)}
                style={{
                  padding: '10px 24px', borderRadius: 6, border: '1px solid #cbd5e1',
                  background: '#f8fafc', color: '#475569', fontWeight: 600, fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleCerrarCaja}
                style={{
                  padding: '10px 28px', borderRadius: 6, border: 'none',
                  background: '#dc2626', color: '#fff', fontWeight: 700, fontSize: 13,
                  cursor: 'pointer', boxShadow: '0 2px 8px rgba(220,38,38,0.4)',
                }}
              >
                🔒 Confirmar Cierre
              </button>
            </div>
          </div>
        </div>
      )}`;

// Apply replacements (try LF and CRLF)
let applied = 0;
for (const [o, n] of [[OLD1,NEW1],[OLD2,NEW2],[OLD3,NEW3]]) {
  const oCrlf = o.replace(/\n/g, '\r\n');
  if (c.includes(oCrlf)) { c = c.replace(oCrlf, n.replace(/\n/g, '\r\n')); applied++; console.log('✅ Replaced (CRLF) chunk', applied); }
  else if (c.includes(o)) { c = c.replace(o, n); applied++; console.log('✅ Replaced (LF) chunk', applied); }
  else { console.log('❌ NOT FOUND chunk', applied+1, '- snippet:', o.substring(0,80)); }
}

fs.writeFileSync(path, c, 'utf8');
console.log('Saved. Applied', applied, '/3 chunks');
if (c.includes('handleCerrarCaja')) console.log('✅ handleCerrarCaja present');
if (c.includes('showConfirmCierre')) console.log('✅ showConfirmCierre present');
if (c.includes('Cerrar Caja')) console.log('✅ Cerrar Caja button present');
