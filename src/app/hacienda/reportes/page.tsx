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
  FileText,
  CreditCard,
  Briefcase,
  Filter,
  FileSpreadsheet
} from 'lucide-react';
import { formatBs } from '@/lib/formatCurrency';
import * as xlsx from 'xlsx';

type ActiveCard = 'cuadre' | 'libro' | 'morosos' | 'solventes' | 'patentes' | 'censo';

export default function ReportesHaciendaPage() {
  const [activeCard, setActiveCard] = useState<ActiveCard>('cuadre');
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);

  // Data states
  const [pagosHacienda, setPagosHacienda] = useState<any[]>([]);
  const [inmuebles, setInmuebles] = useState<any[]>([]);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      // 1. Pagos de hacienda desde pagos_reportados y hacienda_pagos
      const { data: pagosRep } = await supabase
        .from('pagos_reportados')
        .select('*')
        .or('tipo.eq.Hacienda,detalles->>modulo.eq.Hacienda')
        .order('created_at', { ascending: false });

      const { data: hacPagos } = await supabase
        .from('hacienda_pagos')
        .select('*')
        .order('created_at', { ascending: false });

      // Consolidar pagos
      const consolidados: any[] = [];
      if (pagosRep) {
        pagosRep.forEach(p => {
          let det = p.detalles;
          if (typeof det === 'string') {
            try { det = JSON.parse(det); } catch(e) { det = {}; }
          }
          consolidados.push({
            id: p.id,
            recibo: det?.numero_recibo || `HAC-${p.referencia || p.id}`,
            identidad: p.identidad,
            contribuyente: det?.contribuyente || p.identidad,
            concepto: det?.concepto || p.tipo || 'Tributo Municipal',
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

      if (hacPagos) {
        hacPagos.forEach(hp => {
          if (!consolidados.some(c => c.referencia === hp.referencia_comprobante)) {
            consolidados.push({
              id: hp.id,
              recibo: `HAC-REC-${hp.id}`,
              identidad: hp.contribuyente_identidad,
              contribuyente: hp.contribuyente_nombre,
              concepto: hp.concepto,
              monto: Number(hp.monto_total) || 0,
              forma_pago: hp.metodo_pago,
              banco: hp.metodo_pago === 'Punto de Venta' ? 'Punto de Venta' : 'Banco',
              referencia: hp.referencia_comprobante,
              fecha: hp.created_at ? hp.created_at.split('T')[0] : '',
              cajero: 'dzara',
              estado: 'Aprobado'
            });
          }
        });
      }
      setPagosHacienda(consolidados);

      // 2. Cargar inmuebles comerciales e industriales
      const { data: inms } = await supabase
        .from('inmuebles')
        .select('*')
        .limit(300);

      if (inms) {
        setInmuebles(inms);
      }
    } catch (e) {
      console.error('Error cargando datos de reporte:', e);
    } finally {
      setLoading(false);
    }
  };

  // Filtrado de pagos por fecha para cuadre diario
  const pagosFecha = pagosHacienda.filter(p => !fecha || p.fecha === fecha);
  const totalRecaudadoFecha = pagosFecha.reduce((acc, p) => acc + (p.monto || 0), 0);
  const totalDebitoFecha = pagosFecha.filter(p => p.forma_pago.includes('Débito') || p.forma_pago.includes('Punto')).reduce((acc, p) => acc + (p.monto || 0), 0);
  const totalTransfFecha = pagosFecha.filter(p => p.forma_pago.includes('Transf')).reduce((acc, p) => acc + (p.monto || 0), 0);

  // Comerciales e Industriales
  const comerciosIndustrias = inmuebles.filter(i => {
    const cls = (i.clasificacion || '').toUpperCase();
    return cls.includes('COMERCIAL') || cls.includes('INDUSTRIAL') || cls.includes('TIPO D') || cls.includes('TIPO B') || cls.includes('TIPO C');
  });

  const exportarExcelLibro = () => {
    const dataRows = pagosHacienda.map(p => ({
      'N° Recibo': p.recibo,
      'Fecha': p.fecha,
      'RIF / Cédula': p.identidad,
      'Razón Social': p.contribuyente,
      'Concepto Tributario': p.concepto,
      'Forma de Pago': p.forma_pago,
      'Banco': p.banco,
      'Referencia': p.referencia,
      'Monto (Bs)': p.monto,
      'Cajero': p.cajero,
      'Estado': p.estado
    }));

    const ws = xlsx.utils.json_to_sheet(dataRows);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'Libro Ingresos Hacienda');
    xlsx.writeFile(wb, `Libro_Ingresos_Hacienda_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportarExcelCuadre = () => {
    const dataRows = pagosFecha.map(p => ({
      'N° Recibo': p.recibo,
      'Fecha': p.fecha,
      'RIF': p.identidad,
      'Contribuyente': p.contribuyente,
      'Concepto': p.concepto,
      'Forma de Pago': p.forma_pago,
      'Referencia': p.referencia,
      'Monto (Bs)': p.monto,
      'Cajero': p.cajero
    }));

    const ws = xlsx.utils.json_to_sheet(dataRows);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'Cuadre Diario Hacienda');
    xlsx.writeFile(wb, `Cuadre_Caja_Hacienda_${fecha}.xlsx`);
  };

  const CARDS = [
    { id: 'cuadre' as ActiveCard, label: 'Cuadre Diario de Taquilla', emoji: '🗂️', desc: 'Arqueo por cajero, punto de venta y transferencias' },
    { id: 'libro' as ActiveCard, label: 'Libro de Ingresos ISAE', emoji: '🖨️', desc: 'Registro histórico de recaudación tributaria municipal' },
    { id: 'patentes' as ActiveCard, label: 'Padrón de Patentes', emoji: '📜', desc: 'Licencias comerciales emitidas y en trámite' },
    { id: 'censo' as ActiveCard, label: 'Censo Comercial / Ind.', emoji: '🏢', desc: 'Padrón tributario clasificado por sectores económicos' },
    { id: 'solventes' as ActiveCard, label: 'Contribuyentes Solventes', emoji: '🎖️', desc: 'Empresas con solvencia municipal de hacienda al día' },
    { id: 'morosos' as ActiveCard, label: 'Pendientes por Declarar', emoji: '🔴', desc: 'Comercios con períodos omisos o deuda en revisión' },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="border-b border-slate-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-sky-400" />
            Centro de Reportes y Cierres - Hacienda Municipal
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Auditoría de recaudación, cuadre diario de cajeros, libro general de ingresos ISAE y padrón comercial.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl text-xs text-slate-300">
            <Calendar className="w-4 h-4 text-sky-400" />
            <span>Fecha Cuadre:</span>
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-xs text-white"
            />
          </div>
        </div>
      </div>

      {/* Grid de Tarjetas de Reportes (Estilo Aseo) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {CARDS.map((card) => {
          const isActive = activeCard === card.id;
          return (
            <button
              key={card.id}
              onClick={() => setActiveCard(card.id)}
              className={`p-3.5 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                isActive
                  ? 'bg-sky-950/70 border-sky-500 shadow-lg shadow-sky-950/50 ring-1 ring-sky-500'
                  : 'bg-slate-950/80 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
              }`}
            >
              <div>
                <span className="text-2xl mb-2 block">{card.emoji}</span>
                <h4 className="font-bold text-xs text-white leading-tight">{card.label}</h4>
              </div>
              <p className="text-[10px] text-slate-400 mt-2 line-clamp-2 leading-tight">
                {card.desc}
              </p>
            </button>
          );
        })}
      </div>

      {/* VISTA 1: CUADRE DIARIO */}
      {activeCard === 'cuadre' && (
        <div className="space-y-4">
          {/* Métricas del día */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
              <span className="text-[11px] text-slate-400 font-medium">Total Recaudado ({fecha})</span>
              <p className="text-2xl font-black text-sky-400 mt-1 font-mono">
                {formatBs(totalRecaudadoFecha)}
              </p>
              <span className="text-[10px] text-slate-500 mt-1 block">
                {pagosFecha.length} transacciones registradas
              </span>
            </div>
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
              <span className="text-[11px] text-slate-400 font-medium">Punto de Venta / Débito</span>
              <p className="text-2xl font-black text-emerald-400 mt-1 font-mono">
                {formatBs(totalDebitoFecha)}
              </p>
              <span className="text-[10px] text-slate-500 mt-1 block">Taquilla Municipal</span>
            </div>
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
              <span className="text-[11px] text-slate-400 font-medium">Transferencias Bancarias</span>
              <p className="text-2xl font-black text-amber-400 mt-1 font-mono">
                {formatBs(totalTransfFecha)}
              </p>
              <span className="text-[10px] text-slate-500 mt-1 block">Verificadas en Banco</span>
            </div>
          </div>

          {/* Tabla de Arqueo */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-white text-sm">Detalle de Transacciones del Día</h3>
                <p className="text-xs text-slate-400">Cuadre por cajero y concepto tributario</p>
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
              <div className="p-12 text-center text-slate-500 text-xs">
                No hay cobros de Hacienda registrados en la fecha seleccionada ({fecha}).
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800 text-[10px] uppercase">
                    <tr>
                      <th className="p-3">Recibo</th>
                      <th className="p-3">RIF / Cédula</th>
                      <th className="p-3">Contribuyente</th>
                      <th className="p-3">Concepto</th>
                      <th className="p-3">Método</th>
                      <th className="p-3">Referencia</th>
                      <th className="p-3 text-right">Monto (Bs)</th>
                      <th className="p-3">Cajero</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium">
                    {pagosFecha.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-900/40">
                        <td className="p-3 font-mono text-sky-400 font-bold">{p.recibo}</td>
                        <td className="p-3 font-mono text-slate-300">{p.identidad}</td>
                        <td className="p-3 text-white font-bold max-w-xs truncate">{p.contribuyente}</td>
                        <td className="p-3 text-slate-300">{p.concepto}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px]">
                            {p.forma_pago}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-slate-400">{p.referencia}</td>
                        <td className="p-3 text-right font-mono font-bold text-white">{formatBs(p.monto)}</td>
                        <td className="p-3 text-slate-400">{p.cajero}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VISTA 2: LIBRO DE INGRESOS */}
      {activeCard === 'libro' && (
        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl space-y-4">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-white text-sm">Libro General de Ingresos de Hacienda</h3>
              <p className="text-xs text-slate-400">Histórico completo de pagos tributarios asentados en el sistema</p>
            </div>
            <button
              onClick={exportarExcelLibro}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow"
            >
              <Download className="w-3.5 h-3.5" />
              Descargar Libro Excel
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800 text-[10px] uppercase">
                <tr>
                  <th className="p-3">N° Recibo</th>
                  <th className="p-3">Fecha</th>
                  <th className="p-3">RIF</th>
                  <th className="p-3">Contribuyente</th>
                  <th className="p-3">Concepto Tributario</th>
                  <th className="p-3">Forma Pago</th>
                  <th className="p-3">Referencia</th>
                  <th className="p-3 text-right">Monto (Bs)</th>
                  <th className="p-3">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {pagosHacienda.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-900/40">
                    <td className="p-3 font-mono text-sky-400 font-bold">{p.recibo}</td>
                    <td className="p-3 text-slate-400">{p.fecha}</td>
                    <td className="p-3 font-mono text-slate-300 font-bold">{p.identidad}</td>
                    <td className="p-3 text-white font-bold max-w-xs truncate">{p.contribuyente}</td>
                    <td className="p-3 text-slate-300">{p.concepto}</td>
                    <td className="p-3 text-slate-400">{p.forma_pago}</td>
                    <td className="p-3 font-mono text-slate-400">{p.referencia}</td>
                    <td className="p-3 text-right font-mono font-bold text-white">{formatBs(p.monto)}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-800/80 text-[10px]">
                        {p.estado}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VISTA 3: PADRON DE PATENTES */}
      {activeCard === 'patentes' && (
        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-slate-800">
            <h3 className="font-bold text-white text-sm">Padrón de Actividades Económicas y Patentes</h3>
            <p className="text-xs text-slate-400">Listado de licencias comerciales registradas en el Municipio Silva</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800 text-[10px] uppercase">
                <tr>
                  <th className="p-3">Código Inmueble</th>
                  <th className="p-3">Contribuyente</th>
                  <th className="p-3">RIF</th>
                  <th className="p-3">Patente Asignada</th>
                  <th className="p-3">Sector</th>
                  <th className="p-3">Clasificación</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {comerciosIndustrias.map((ci) => (
                  <tr key={ci.id} className="hover:bg-slate-900/40">
                    <td className="p-3 font-mono text-slate-400">{ci.cod_cont || ci.id}</td>
                    <td className="p-3 text-white font-bold">{ci.contribuyente}</td>
                    <td className="p-3 font-mono text-slate-300">{ci.identidad}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded bg-amber-950/50 text-amber-300 border border-amber-800 font-mono font-bold text-[10px]">
                        {ci.patente || 'EN TRAMITE'}
                      </span>
                    </td>
                    <td className="p-3 text-slate-400">{ci.sector || 'Tucacas'}</td>
                    <td className="p-3 text-sky-400">{ci.clasificacion || 'Comercial'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VISTA 4: CENSO COMERCIAL */}
      {activeCard === 'censo' && (
        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-slate-800">
            <h3 className="font-bold text-white text-sm">Censo Comercial e Industrial Silva</h3>
            <p className="text-xs text-slate-400">Estadísticas de comercios e industrias activas en la jurisdicción</p>
          </div>
          <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-xl">
              <span className="text-[10px] text-slate-400">Total Comercios Censados</span>
              <p className="text-xl font-black text-white mt-1">{comerciosIndustrias.length}</p>
            </div>
            <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-xl">
              <span className="text-[10px] text-slate-400">Con Patente Comercial</span>
              <p className="text-xl font-black text-emerald-400 mt-1">
                {comerciosIndustrias.filter(c => c.patente && c.patente !== 'SN').length}
              </p>
            </div>
            <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-xl">
              <span className="text-[10px] text-slate-400">En Trámite / Sin Patente</span>
              <p className="text-xl font-black text-amber-400 mt-1">
                {comerciosIndustrias.filter(c => !c.patente || c.patente === 'SN').length}
              </p>
            </div>
            <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-xl">
              <span className="text-[10px] text-slate-400">Sectores Activos</span>
              <p className="text-xl font-black text-sky-400 mt-1">
                {new Set(comerciosIndustrias.map(c => c.sector)).size}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* VISTA 5: SOLVENTES */}
      {activeCard === 'solventes' && (
        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-6 text-center text-slate-400 text-xs">
          <ShieldCheckIcon className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
          <h3 className="font-bold text-white text-sm">Padrón de Comercios Solventes</h3>
          <p className="mt-1">Empresas comerciales e industriales al día con el pago del impuesto de Aseo Urbano e ISAE.</p>
        </div>
      )}

      {/* VISTA 6: MOROSOS */}
      {activeCard === 'morosos' && (
        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-6 text-center text-slate-400 text-xs">
          <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto mb-2" />
          <h3 className="font-bold text-white text-sm">Reporte de Contribuyentes Omisos / Deuda Pendiente</h3>
          <p className="mt-1">Listado de comercios e industrias con períodos de declaración pendientes o deuda en Aseo Urbano.</p>
        </div>
      )}
    </div>
  );

  function ShieldCheckIcon(props: any) {
    return <CheckCircle2 {...props} />;
  }
}
