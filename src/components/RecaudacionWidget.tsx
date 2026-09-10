'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { TrendingUp, FileSpreadsheet, Calendar, RefreshCw, Filter } from 'lucide-react';
import { formatBs } from '@/lib/formatCurrency';
import { exportToExcelWithLogos } from '@/lib/excelExport';

type Periodo = 'hoy' | 'semana' | 'mes' | 'mes_pasado' | 'personalizado';

function getRange(periodo: Periodo, desde: string, hasta: string) {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const toISO = (d: Date) => d.getFullYear() + '-' + pad(d.getMonth()+1) + '-' + pad(d.getDate());
  switch (periodo) {
    case 'hoy': { const t = toISO(now); return { desde: t, hasta: t }; }
    case 'semana': {
      const day = now.getDay() || 7;
      const lunes = new Date(now);
      lunes.setDate(now.getDate() - day + 1);
      return { desde: toISO(lunes), hasta: toISO(now) };
    }
    case 'mes': return { desde: now.getFullYear() + '-' + pad(now.getMonth()+1) + '-01', hasta: toISO(now) };
    case 'mes_pasado': {
      const first = new Date(now.getFullYear(), now.getMonth()-1, 1);
      const last = new Date(now.getFullYear(), now.getMonth(), 0);
      return { desde: toISO(first), hasta: toISO(last) };
    }
    case 'personalizado': return { desde, hasta };
    default: return { desde: toISO(now), hasta: toISO(now) };
  }
}

export default function RecaudacionWidget() {
  const [periodo, setPeriodo] = useState<Periodo>('mes');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [pagos, setPagos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchPagos = async () => {
    setIsLoading(true);
    const range = getRange(periodo, desde, hasta);
    try {
      const { data } = await supabase
        .from('pagos_reportados')
        .select('*')
        .eq('estado', 'Aprobado')
        .gte('created_at', range.desde + 'T00:00:00')
        .lte('created_at', range.hasta + 'T23:59:59')
        .order('created_at', { ascending: false });
      setPagos(data || []);
    } catch(e) { console.error(e); }
    setIsLoading(false);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchPagos(); }, [periodo, desde, hasta]);

  const tot = pagos.reduce((a, p) => a + parseFloat(p.monto || '0'), 0);
  const deb = pagos.filter(p => p.tipo === 'Debito').reduce((a, p) => a + parseFloat(p.monto || '0'), 0);
  const tra = pagos.filter(p => p.tipo === 'Transferencia').reduce((a, p) => a + parseFloat(p.monto || '0'), 0);
  const lbl: Record<Periodo, string> = {
    hoy: 'Hoy', semana: 'Esta semana', mes: 'Este mes',
    mes_pasado: 'Mes pasado', personalizado: 'Periodo'
  };

  const exportar = () => {
    if (!pagos.length) return alert('No hay registros.');
    const d = pagos.map(p => ({
      'Fecha': new Date(p.created_at).toLocaleDateString('es-VE'),
      'Identidad': p.identidad,
      'Banco': p.banco || '--',
      'Tipo': p.tipo,
      'Referencia': p.referencia || '--',
      'Monto (Bs)': Number(p.monto || 0).toFixed(2)
    }));
    const fname = 'Recaudacion_' + new Date().toISOString().split('T')[0] + '.xlsx';
    exportToExcelWithLogos(d, fname, 'Recaudacion');
  };

  const btnCls = (active: boolean) =>
    'px-3 py-1.5 rounded text-xs font-semibold transition-colors ' +
    (active ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200');

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
      <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-emerald-600" />
          <h2 className="font-semibold text-slate-700">Recaudacion por Periodo</h2>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {(['hoy', 'semana', 'mes', 'mes_pasado'] as Periodo[]).map(p => (
            <button key={p} onClick={() => setPeriodo(p)} className={btnCls(periodo === p)}>{lbl[p]}</button>
          ))}
          <button
            onClick={() => setPeriodo('personalizado')}
            className={btnCls(periodo === 'personalizado') + ' flex items-center gap-1'}
          >
            <Filter className="w-3 h-3" />Personalizado
          </button>
          <button onClick={fetchPagos} className="p-1.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-600">
            <RefreshCw className={'w-3.5 h-3.5 ' + (isLoading ? 'animate-spin' : '')} />
          </button>
          <button onClick={exportar} className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white rounded text-xs font-bold hover:bg-emerald-700">
            <FileSpreadsheet className="w-3.5 h-3.5" />Excel
          </button>
        </div>
      </div>
      {periodo === 'personalizado' && (
        <div className="px-6 py-3 border-b flex items-center gap-3 flex-wrap bg-slate-50">
          <Calendar className="w-4 h-4 text-slate-500" />
          <label className="text-xs font-semibold text-slate-600">Desde:</label>
          <input type="date" value={desde} onChange={e => setDesde(e.target.value)} className="border border-slate-300 rounded px-2 py-1 text-xs outline-none" />
          <label className="text-xs font-semibold text-slate-600">Hasta:</label>
          <input type="date" value={hasta} onChange={e => setHasta(e.target.value)} className="border border-slate-300 rounded px-2 py-1 text-xs outline-none" />
        </div>
      )}
      <div className="p-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-center">
            <p className="text-xs text-emerald-600 font-semibold uppercase mb-1">Total Recaudado</p>
            <p className="text-2xl font-black text-emerald-700">Bs. {formatBs(tot)}</p>
            <p className="text-xs text-emerald-500 mt-1">{pagos.length} transacciones</p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
            <p className="text-xs text-blue-600 font-semibold uppercase mb-1">Punto de Venta</p>
            <p className="text-xl font-bold text-blue-700">Bs. {formatBs(deb)}</p>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center">
            <p className="text-xs text-purple-600 font-semibold uppercase mb-1">Transferencia</p>
            <p className="text-xl font-bold text-purple-700">Bs. {formatBs(tra)}</p>
          </div>
        </div>
        {isLoading ? (
          <div className="text-center py-8 text-slate-500 text-sm">Cargando...</div>
        ) : pagos.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-sm">No hay pagos aprobados en este periodo.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b text-slate-600 uppercase">
                <tr>
                  <th className="px-3 py-2">Fecha</th>
                  <th className="px-3 py-2">Identidad</th>
                  <th className="px-3 py-2">Tipo</th>
                  <th className="px-3 py-2">Referencia</th>
                  <th className="px-3 py-2 text-right">Monto (Bs)</th>
                </tr>
              </thead>
              <tbody>
                {pagos.slice(0, 50).map(p => (
                  <tr key={p.id} className="border-b hover:bg-slate-50">
                    <td className="px-3 py-2">{new Date(p.created_at).toLocaleDateString('es-VE')}</td>
                    <td className="px-3 py-2 font-medium">{p.identidad}</td>
                    <td className="px-3 py-2">
                      <span className={'px-2 py-0.5 rounded text-[10px] font-bold ' + (p.tipo === 'Debito' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700')}>{p.tipo}</span>
                    </td>
                    <td className="px-3 py-2 font-mono">{p.referencia || '--'}</td>
                    <td className="px-3 py-2 text-right font-bold text-emerald-700">Bs. {formatBs(parseFloat(p.monto || '0'))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {pagos.length > 50 && <p className="text-center text-xs text-slate-400 mt-2">Mostrando 50 de {pagos.length}. Exporta Excel para todos.</p>}
          </div>
        )}
      </div>
    </div>
  );
}
