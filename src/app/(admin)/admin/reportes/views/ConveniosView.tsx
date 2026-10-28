'use client';
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Download, RefreshCw, Handshake, Calendar, Filter } from 'lucide-react';
import * as xlsx from 'xlsx';

export default function ConveniosView({ onBack }: { onBack: () => void }) {
  const [convenios, setConvenios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('TODOS');

  const cargarConvenios = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('convenios')
        .select('*')
        .not('estado', 'in', '(Anulado,Eliminado)')
        .order('id', { ascending: false });
      if (data) setConvenios(data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    cargarConvenios();
  }, []);

  const filtered = convenios.filter(c => {
    if (c.estado === 'Anulado' || c.estado === 'Eliminado') return false;
    if (filtroEstado !== 'TODOS' && c.estado !== filtroEstado) return false;
    if (c.fecha_creacion) {
      const d = c.fecha_creacion.slice(0, 10);
      if (fechaDesde && d < fechaDesde) return false;
      if (fechaHasta && d > fechaHasta) return false;
    }
    return true;
  });

  const exportarExcel = () => {
    const rows = filtered.map((c, i) => {
      let cuotas: any[] = [];
      try { cuotas = JSON.parse(c.detalle_cuotas || '[]'); } catch(e){}
      const pagadas = cuotas.filter((q: any) => q.estado === 'Pagado').length;
      return [
        i + 1,
        c.numero || 'S/N',
        c.fecha_creacion ? new Date(c.fecha_creacion).toLocaleDateString('es-VE') : 'N/D',
        c.identidad || '—',
        c.contribuyente || '—',
        c.estado || 'Al Día',
        cuotas.length,
        pagadas,
        cuotas.length - pagadas,
        parseFloat(c.monto_total || '0')
      ];
    });

    const wsData = [
      ['INSTITUTO AUTÓNOMO MUNICIPAL DE GESTIÓN AMBIENTAL - MUNICIPIO SILVA (ISMA)'],
      ['REPORTE OFICIAL DE CONVENIOS DE PAGO'],
      [`Estado: ${filtroEstado}  |  Total Convenios: ${filtered.length}`],
      [],
      ['N°', 'CONVENIO', 'FECHA', 'IDENTIDAD', 'CONTRIBUYENTE', 'ESTADO', 'TOTAL CUOTAS', 'PAGADAS', 'RESTANTES', 'MONTO TOTAL (Bs)'],
      ...rows,
      [],
      ['', '', '', '', '', '', '', '', 'TOTAL Bs:', filtered.reduce((s, c) => s + parseFloat(c.monto_total || '0'), 0)]
    ];

    const ws = xlsx.utils.aoa_to_sheet(wsData);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'Convenios');
    xlsx.writeFile(wb, `Reporte_Convenios_Pago_${filtroEstado}.xlsx`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-sm text-blue-600 hover:text-blue-800 font-medium">← Regresar</button>
          <span className="text-slate-300">|</span>
          <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Handshake className="w-5 h-5 text-indigo-600" />
            Reporte General de Convenios de Pago
          </h1>
        </div>
        <button
          onClick={exportarExcel}
          disabled={loading || filtered.length === 0}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 shadow-sm disabled:opacity-50"
        >
          <Download className="w-4 h-4" /> Exportar a Excel (.xlsx)
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Fecha Desde</label>
            <input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} className="w-full border border-slate-300 rounded-lg p-2 text-xs" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Fecha Hasta</label>
            <input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} className="w-full border border-slate-300 rounded-lg p-2 text-xs" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Estado de Convenio</label>
            <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} className="w-full border border-slate-300 rounded-lg p-2 text-xs bg-white font-medium">
              <option value="TODOS">Todos</option>
              <option value="Al Día">Al Día</option>
              <option value="Atrasado">Atrasado</option>
              <option value="Cumplido">Cumplido</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left" style={{ minWidth: '800px' }}>
            <thead className="bg-indigo-50 text-indigo-900 font-bold uppercase border-b border-indigo-100">
              <tr>
                <th className="px-3 py-2.5">#</th>
                <th className="px-3 py-2.5">N° Convenio</th>
                <th className="px-3 py-2.5">Fecha</th>
                <th className="px-3 py-2.5">Identidad</th>
                <th className="px-3 py-2.5">Contribuyente</th>
                <th className="px-3 py-2.5 text-center">Cuotas</th>
                <th className="px-3 py-2.5">Estado</th>
                <th className="px-3 py-2.5 text-right">Monto Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((c, i) => {
                let cuotas: any[] = [];
                try { cuotas = JSON.parse(c.detalle_cuotas || '[]'); } catch(e){}
                const pagadas = cuotas.filter((q: any) => q.estado === 'Pagado').length;
                return (
                  <tr key={c.id || i} className="hover:bg-slate-50 transition-colors">
                    <td className="px-3 py-2 font-mono text-slate-400">{i + 1}</td>
                    <td className="px-3 py-2 font-bold font-mono text-indigo-700">{c.numero}</td>
                    <td className="px-3 py-2 text-slate-500">{c.fecha_creacion ? new Date(c.fecha_creacion).toLocaleDateString('es-VE') : '—'}</td>
                    <td className="px-3 py-2 font-mono font-bold text-slate-700">{c.identidad}</td>
                    <td className="px-3 py-2 font-medium text-slate-800">{c.contribuyente}</td>
                    <td className="px-3 py-2 text-center">
                      <span className="font-semibold text-slate-700">{pagadas}</span> / <span className="text-slate-400">{cuotas.length}</span>
                    </td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                        c.estado === 'Al Día' ? 'bg-emerald-100 text-emerald-800' :
                        c.estado === 'Cumplido' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {c.estado}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right font-bold text-indigo-900 font-mono">
                      Bs. {parseFloat(c.monto_total || '0').toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && !loading && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">No hay convenios registrados bajo estos filtros.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
