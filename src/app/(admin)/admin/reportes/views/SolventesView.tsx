'use client';
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Download, RefreshCw, Award, MapPin } from 'lucide-react';
import * as xlsx from 'xlsx';

export default function SolventesView({ onBack }: { onBack: () => void }) {
  const [solventes, setSolventes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroSector, setFiltroSector] = useState('TODOS');

  const SECTORES = [
    'TODOS',
    'TUCACAS CENTRO',
    'PARQUE NACIONAL MORROCOY',
    'BOCA DE AROA',
    'LIZARDO',
    'LAS LAPAS',
    'FELIPA',
    'AGUA SALOBRE',
    'CARACARA'
  ];

  const cargarSolventes = async () => {
    setLoading(true);
    try {
      // Contribuyentes solventes: aquellos cuyos inmuebles no tienen facturas pendientes
      const { data: inms } = await supabase.from('inmuebles').select('*');
      const { data: facs } = await supabase.from('facturas').select('identidad, estado').in('estado', ['Pendiente', 'Abonado']);

      const morososSet = new Set((facs || []).map((f: any) => (f.identidad || '').replace(/[-.s]/g, '').toUpperCase()));

      const solList = (inms || []).filter((inm: any) => {
        const id = (inm.identidad || '').replace(/[-.s]/g, '').toUpperCase();
        return !morososSet.has(id);
      });

      setSolventes(solList);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    cargarSolventes();
  }, []);

  const filtered = solventes.filter(item => {
    if (filtroSector !== 'TODOS') {
      const dir = (item.direccion || '').toUpperCase();
      if (!dir.includes(filtroSector)) return false;
    }
    return true;
  });

  const exportarExcel = () => {
    const rows = filtered.map((r, i) => [
      i + 1,
      r.cod_cont || '—',
      r.identidad || '—',
      r.contribuyente || '—',
      r.inmueble || 'Principal',
      r.clasificacion || 'Residencial',
      r.direccion || '—',
      'SOLVENTE',
      parseFloat(r.saldo_favor_bs || '0')
    ]);

    const wsData = [
      ['INSTITUTO AUTÓNOMO MUNICIPAL DE GESTIÓN AMBIENTAL - MUNICIPIO SILVA (ISMA)'],
      ['PADRÓN OFICIAL DE CONTRIBUYENTES SOLVENTES'],
      [`Sector: ${filtroSector}  |  Total Solventes: ${filtered.length}  |  Fecha: ${new Date().toLocaleDateString('es-VE')}`],
      [],
      ['N°', 'CÓDIGO', 'IDENTIDAD', 'CONTRIBUYENTE', 'INMUEBLE', 'CLASIFICACIÓN', 'DIRECCIÓN', 'ESTADO', 'SALDO A FAVOR (Bs)'],
      ...rows,
      [],
      ['', '', '', '', '', '', '', 'TOTAL SOLVENTES:', filtered.length]
    ];

    const ws = xlsx.utils.aoa_to_sheet(wsData);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'Solventes');
    xlsx.writeFile(wb, `Reporte_Contribuyentes_Solventes_${filtroSector}.xlsx`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-sm text-blue-600 hover:text-blue-800 font-medium">← Regresar</button>
          <span className="text-slate-300">|</span>
          <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Award className="w-5 h-5 text-emerald-600" />
            Reporte de Contribuyentes Solventes
          </h1>
        </div>
        <button
          onClick={exportarExcel}
          disabled={loading || filtered.length === 0}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 shadow-sm disabled:opacity-50"
        >
          <Download className="w-4 h-4" /> Exportar a Excel (.xlsx)
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MapPin className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-bold text-slate-600">Filtrar por Sector:</span>
          <select value={filtroSector} onChange={e => setFiltroSector(e.target.value)} className="border border-slate-300 rounded-lg p-2 text-xs bg-white font-medium">
            {SECTORES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="text-xs text-slate-500">
          Total solventes activos: <strong className="text-emerald-700">{filtered.length}</strong>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left" style={{ minWidth: '800px' }}>
            <thead className="bg-emerald-50 text-emerald-900 font-bold uppercase border-b border-emerald-100">
              <tr>
                <th className="px-3 py-2.5">#</th>
                <th className="px-3 py-2.5">Código</th>
                <th className="px-3 py-2.5">Identidad</th>
                <th className="px-3 py-2.5">Contribuyente</th>
                <th className="px-3 py-2.5">Sector / Dirección</th>
                <th className="px-3 py-2.5">Clasificación</th>
                <th className="px-3 py-2.5 text-center">Estatus</th>
                <th className="px-3 py-2.5 text-right">Saldo a Favor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.slice(0, 150).map((r, i) => (
                <tr key={r.id || i} className="hover:bg-slate-50 transition-colors">
                  <td className="px-3 py-2 font-mono text-slate-400">{i + 1}</td>
                  <td className="px-3 py-2 font-mono text-slate-500">{r.cod_cont || '—'}</td>
                  <td className="px-3 py-2 font-mono font-bold text-emerald-800">{r.identidad}</td>
                  <td className="px-3 py-2 font-semibold text-slate-800">{r.contribuyente}</td>
                  <td className="px-3 py-2 text-slate-600 max-w-xs truncate">{r.direccion || '—'}</td>
                  <td className="px-3 py-2 text-slate-500">{r.clasificacion || 'Residencial'}</td>
                  <td className="px-3 py-2 text-center">
                    <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-emerald-100 text-emerald-800">SOLVENTE</span>
                  </td>
                  <td className="px-3 py-2 text-right font-mono font-semibold text-slate-700">
                    Bs. {parseFloat(r.saldo_favor_bs || '0').toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && !loading && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">No hay contribuyentes solventes con este filtro.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
