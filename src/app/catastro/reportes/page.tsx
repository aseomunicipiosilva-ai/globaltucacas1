'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  BarChart3, 
  Download, 
  Printer, 
  Calendar, 
  DollarSign, 
  Users, 
  CheckCircle2, 
  AlertTriangle, 
  Building2, 
  Home, 
  Compass, 
  MapPin, 
  FileText,
  FileSpreadsheet
} from 'lucide-react';
import { formatBs } from '@/lib/formatCurrency';
import * as xlsx from 'xlsx';

type ActiveCard = 'cuadre' | 'libro' | 'censo' | 'fichas' | 'solventes' | 'morosos';

export default function ReportesCatastroPage() {
  const [activeCard, setActiveCard] = useState<ActiveCard>('cuadre');
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);

  // Data states
  const [pagosCatastro, setPagosCatastro] = useState<any[]>([]);
  const [inmuebles, setInmuebles] = useState<any[]>([]);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      // 1. Pagos de catastro desde pagos_reportados
      const { data: pagosRep } = await supabase
        .from('pagos_reportados')
        .select('*')
        .or('tipo.eq.Catastro,detalles->>modulo.eq.Catastro')
        .order('created_at', { ascending: false });

      const consolidados: any[] = [];
      if (pagosRep) {
        pagosRep.forEach(p => {
          let det = p.detalles;
          if (typeof det === 'string') {
            try { det = JSON.parse(det); } catch(e) { det = {}; }
          }
          consolidados.push({
            id: p.id,
            recibo: det?.numero_recibo || `CAT-${p.referencia || p.id}`,
            identidad: p.identidad,
            propietario: det?.contribuyente || p.identidad,
            inmueble_codigo: det?.inmueble_codigo || 'PARCELA',
            concepto: det?.concepto || p.tipo || 'Impuesto Inmuebles Urbanos',
            monto: Number(p.monto) || 0,
            forma_pago: p.banco?.includes('Punto') ? 'Débito / Punto' : 'Transferencia',
            banco: p.banco,
            referencia: p.referencia,
            fecha: p.created_at ? p.created_at.split('T')[0] : '',
            cajero: det?.cajero || 'dzara',
            estado: p.estado || 'Aprobado'
          });
        });
      }
      setPagosCatastro(consolidados);

      // 2. Cargar parcelas e inmuebles
      const { data: inms } = await supabase
        .from('inmuebles')
        .select('*')
        .order('inmueble', { ascending: true })
        .limit(300);

      if (inms) {
        setInmuebles(inms);
      }
    } catch (e) {
      console.error('Error cargando reportes catastro:', e);
    } finally {
      setLoading(false);
    }
  };

  // Filtrado de pagos por fecha
  const pagosFecha = pagosCatastro.filter(p => !fecha || p.fecha === fecha);
  const totalRecaudadoFecha = pagosFecha.reduce((acc, p) => acc + (p.monto || 0), 0);
  const totalDebitoFecha = pagosFecha.filter(p => p.forma_pago.includes('Débito') || p.forma_pago.includes('Punto')).reduce((acc, p) => acc + (p.monto || 0), 0);
  const totalTransfFecha = pagosFecha.filter(p => p.forma_pago.includes('Transf')).reduce((acc, p) => acc + (p.monto || 0), 0);

  const exportarExcelLibro = () => {
    const dataRows = pagosCatastro.map(p => ({
      'N° Recibo': p.recibo,
      'Fecha': p.fecha,
      'Cédula / RIF': p.identidad,
      'Propietario': p.propietario,
      'Código Catastral': p.inmueble_codigo,
      'Concepto': p.concepto,
      'Forma de Pago': p.forma_pago,
      'Banco': p.banco,
      'Referencia': p.referencia,
      'Monto (Bs)': p.monto,
      'Cajero': p.cajero,
      'Estado': p.estado
    }));

    const ws = xlsx.utils.json_to_sheet(dataRows);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'Libro Ingresos Catastro');
    xlsx.writeFile(wb, `Libro_Ingresos_Catastro_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportarExcelCuadre = () => {
    const dataRows = pagosFecha.map(p => ({
      'N° Recibo': p.recibo,
      'Fecha': p.fecha,
      'Cédula / RIF': p.identidad,
      'Propietario': p.propietario,
      'Código Parcela': p.inmueble_codigo,
      'Concepto': p.concepto,
      'Forma de Pago': p.forma_pago,
      'Referencia': p.referencia,
      'Monto (Bs)': p.monto,
      'Cajero': p.cajero
    }));

    const ws = xlsx.utils.json_to_sheet(dataRows);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'Cuadre Diario Catastro');
    xlsx.writeFile(wb, `Cuadre_Caja_Catastro_${fecha}.xlsx`);
  };

  const CARDS = [
    { id: 'cuadre' as ActiveCard, label: 'Cuadre Diario de Taquilla', emoji: '🗂️', desc: 'Arqueo de ingresos por Derecho de Frente y tasas' },
    { id: 'libro' as ActiveCard, label: 'Libro de Recaudación', emoji: '🖨️', desc: 'Registro histórico de pagos inmobiliarios asentados' },
    { id: 'censo' as ActiveCard, label: 'Padrón Inmobiliario', emoji: '🗺️', desc: 'Resumen de parcelas residenciales, comerciales e industriales' },
    { id: 'fichas' as ActiveCard, label: 'Fichas y Expedientes', emoji: '📂', desc: 'Inmuebles con cédula catastral y georreferenciación' },
    { id: 'solventes' as ActiveCard, label: 'Solvencias Catastrales', emoji: '🎖️', desc: 'Propietarios al día aptos para trámites notariales' },
    { id: 'morosos' as ActiveCard, label: 'Deudores Inmobiliarios', emoji: '🔴', desc: 'Inmuebles con períodos vencidos de Derecho de Frente' },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="border-b border-stone-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-orange-400" />
            Centro de Reportes y Cierres - Catastro Municipal
          </h1>
          <p className="text-xs text-stone-400 mt-1">
            Auditoría de recaudación inmobiliaria, cuadre de caja de Derecho de Frente y estadísticas del padrón urbano.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-stone-950 border border-stone-800 px-3 py-1.5 rounded-xl text-xs text-stone-300">
            <Calendar className="w-4 h-4 text-orange-400" />
            <span>Fecha Cuadre:</span>
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="bg-stone-900 border border-stone-700 rounded px-2 py-0.5 text-xs text-white"
            />
          </div>
        </div>
      </div>

      {/* Grid de Tarjetas de Reportes */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {CARDS.map((card) => {
          const isActive = activeCard === card.id;
          return (
            <button
              key={card.id}
              onClick={() => setActiveCard(card.id)}
              className={`p-3.5 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                isActive
                  ? 'bg-orange-950/70 border-orange-500 shadow-lg shadow-orange-950/50 ring-1 ring-orange-500'
                  : 'bg-stone-950/80 border-stone-800 hover:border-stone-700 hover:bg-stone-900/60'
              }`}
            >
              <div>
                <span className="text-2xl mb-2 block">{card.emoji}</span>
                <h4 className="font-bold text-xs text-white leading-tight">{card.label}</h4>
              </div>
              <p className="text-[10px] text-stone-400 mt-2 line-clamp-2 leading-tight">
                {card.desc}
              </p>
            </button>
          );
        })}
      </div>

      {/* VISTA 1: CUADRE DIARIO */}
      {activeCard === 'cuadre' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-stone-950 border border-stone-800 rounded-2xl p-4">
              <span className="text-[11px] text-stone-400 font-medium">Total Recaudado ({fecha})</span>
              <p className="text-2xl font-black text-orange-400 mt-1 font-mono">
                {formatBs(totalRecaudadoFecha)}
              </p>
              <span className="text-[10px] text-stone-500 mt-1 block">
                {pagosFecha.length} transacciones de catastro
              </span>
            </div>
            <div className="bg-stone-950 border border-stone-800 rounded-2xl p-4">
              <span className="text-[11px] text-stone-400 font-medium">Punto de Venta / Débito</span>
              <p className="text-2xl font-black text-emerald-400 mt-1 font-mono">
                {formatBs(totalDebitoFecha)}
              </p>
              <span className="text-[10px] text-stone-500 mt-1 block">Taquilla Catastral</span>
            </div>
            <div className="bg-stone-950 border border-stone-800 rounded-2xl p-4">
              <span className="text-[11px] text-stone-400 font-medium">Transferencias Bancarias</span>
              <p className="text-2xl font-black text-amber-400 mt-1 font-mono">
                {formatBs(totalTransfFecha)}
              </p>
              <span className="text-[10px] text-stone-500 mt-1 block">Verificadas en Cuenta</span>
            </div>
          </div>

          <div className="bg-stone-950/80 border border-stone-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-stone-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-white text-sm">Detalle de Cobros Catastrales del Día</h3>
                <p className="text-xs text-stone-400">Cuadre por cajero y concepto de tasa / frente</p>
              </div>
              <button
                onClick={exportarExcelCuadre}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow"
              >
                <Download className="w-3.5 h-3.5" />
                Exportar Excel
              </button>
            </div>

            {pagosFecha.length === 0 ? (
              <div className="p-12 text-center text-stone-500 text-xs">
                No hay cobros de Catastro registrados en la fecha seleccionada ({fecha}).
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-900/90 text-stone-400 border-b border-stone-800 text-[10px] uppercase">
                    <tr>
                      <th className="p-3">Recibo</th>
                      <th className="p-3">Cédula / RIF</th>
                      <th className="p-3">Propietario</th>
                      <th className="p-3">Parcela</th>
                      <th className="p-3">Concepto</th>
                      <th className="p-3">Método</th>
                      <th className="p-3">Referencia</th>
                      <th className="p-3 text-right">Monto (Bs)</th>
                      <th className="p-3">Cajero</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-800/60 font-medium">
                    {pagosFecha.map((p) => (
                      <tr key={p.id} className="hover:bg-stone-900/40">
                        <td className="p-3 font-mono text-orange-400 font-bold">{p.recibo}</td>
                        <td className="p-3 font-mono text-stone-300">{p.identidad}</td>
                        <td className="p-3 text-white font-bold max-w-xs truncate">{p.propietario}</td>
                        <td className="p-3 font-mono text-stone-400">{p.inmueble_codigo}</td>
                        <td className="p-3 text-stone-300">{p.concepto}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded bg-stone-900 border border-stone-800 text-[10px]">
                            {p.forma_pago}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-stone-400">{p.referencia}</td>
                        <td className="p-3 text-right font-mono font-bold text-white">{formatBs(p.monto)}</td>
                        <td className="p-3 text-stone-400">{p.cajero}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VISTA 2: LIBRO DE RECAUDACIÓN */}
      {activeCard === 'libro' && (
        <div className="bg-stone-950/80 border border-stone-800 rounded-2xl overflow-hidden shadow-xl space-y-4">
          <div className="p-4 border-b border-stone-800 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-white text-sm">Libro de Recaudación Catastral</h3>
              <p className="text-xs text-stone-400">Histórico de ingresos por Derecho de Frente y avalúos</p>
            </div>
            <button
              onClick={exportarExcelLibro}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold shadow"
            >
              <Download className="w-3.5 h-3.5" />
              Descargar Libro Excel
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-900/90 text-stone-400 border-b border-stone-800 text-[10px] uppercase">
                <tr>
                  <th className="p-3">N° Recibo</th>
                  <th className="p-3">Fecha</th>
                  <th className="p-3">Cédula / RIF</th>
                  <th className="p-3">Propietario</th>
                  <th className="p-3">Parcela</th>
                  <th className="p-3">Concepto</th>
                  <th className="p-3">Forma Pago</th>
                  <th className="p-3">Referencia</th>
                  <th className="p-3 text-right">Monto (Bs)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800/60 font-medium">
                {pagosCatastro.map((p) => (
                  <tr key={p.id} className="hover:bg-stone-900/40">
                    <td className="p-3 font-mono text-orange-400 font-bold">{p.recibo}</td>
                    <td className="p-3 text-stone-400">{p.fecha}</td>
                    <td className="p-3 font-mono text-stone-300 font-bold">{p.identidad}</td>
                    <td className="p-3 text-white font-bold max-w-xs truncate">{p.propietario}</td>
                    <td className="p-3 font-mono text-stone-400">{p.inmueble_codigo}</td>
                    <td className="p-3 text-stone-300">{p.concepto}</td>
                    <td className="p-3 text-stone-400">{p.forma_pago}</td>
                    <td className="p-3 font-mono text-stone-400">{p.referencia}</td>
                    <td className="p-3 text-right font-mono font-bold text-white">{formatBs(p.monto)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VISTA 3: PADRON INMOBILIARIO */}
      {activeCard === 'censo' && (
        <div className="bg-stone-950/80 border border-stone-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-stone-800">
            <h3 className="font-bold text-white text-sm">Padrón de Inmuebles Urbanos Silva</h3>
            <p className="text-xs text-stone-400">Total de parcelas registradas por sector geográfico</p>
          </div>
          <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-stone-900/60 border border-stone-800 p-3 rounded-xl">
              <span className="text-[10px] text-stone-400">Total Parcelas</span>
              <p className="text-xl font-black text-white mt-1">{inmuebles.length}</p>
            </div>
            <div className="bg-stone-900/60 border border-stone-800 p-3 rounded-xl">
              <span className="text-[10px] text-stone-400">Residenciales</span>
              <p className="text-xl font-black text-orange-400 mt-1">
                {inmuebles.filter(i => (i.clasificacion || '').toUpperCase().includes('RESIDENCIAL') || (i.clasificacion || '').toUpperCase().includes('TIPO A')).length}
              </p>
            </div>
            <div className="bg-stone-900/60 border border-stone-800 p-3 rounded-xl">
              <span className="text-[10px] text-stone-400">Comerciales / Mixtos</span>
              <p className="text-xl font-black text-emerald-400 mt-1">
                {inmuebles.filter(i => (i.clasificacion || '').toUpperCase().includes('COMERCIAL') || (i.clasificacion || '').toUpperCase().includes('TIPO D') || (i.clasificacion || '').toUpperCase().includes('TIPO C')).length}
              </p>
            </div>
            <div className="bg-stone-900/60 border border-stone-800 p-3 rounded-xl">
              <span className="text-[10px] text-stone-400">Sectores Urbanos</span>
              <p className="text-xl font-black text-sky-400 mt-1">
                {new Set(inmuebles.map(i => i.sector)).size}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* VISTA 4: FICHAS */}
      {activeCard === 'fichas' && (
        <div className="bg-stone-950/80 border border-stone-800 rounded-2xl p-6 text-center text-stone-400 text-xs">
          <Compass className="w-10 h-10 text-orange-400 mx-auto mb-2" />
          <h3 className="font-bold text-white text-sm">Expedientes Catastrales Digitalizados</h3>
          <p className="mt-1">Inmuebles que cuentan con ficha técnica levantada en campo y coordenadas georreferenciadas.</p>
        </div>
      )}

      {/* VISTA 5: SOLVENTES */}
      {activeCard === 'solventes' && (
        <div className="bg-stone-950/80 border border-stone-800 rounded-2xl p-6 text-center text-stone-400 text-xs">
          <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
          <h3 className="font-bold text-white text-sm">Solvencias Catastrales Emitidas</h3>
          <p className="mt-1">Inmuebles solventes con el aseo y el derecho de frente al día.</p>
        </div>
      )}

      {/* VISTA 6: MOROSOS */}
      {activeCard === 'morosos' && (
        <div className="bg-stone-950/80 border border-stone-800 rounded-2xl p-6 text-center text-stone-400 text-xs">
          <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto mb-2" />
          <h3 className="font-bold text-white text-sm">Deudores de Derecho de Frente</h3>
          <p className="mt-1">Parcelas con adeudos pendientes por concepto de impuesto inmobiliario municipal.</p>
        </div>
      )}
    </div>
  );
}
