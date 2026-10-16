'use client';
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Download, RefreshCw, Filter, UserCheck, Calendar, MapPin } from 'lucide-react';
import * as xlsx from 'xlsx';

export default function NuevosInscritosView({ onBack }: { onBack: () => void }) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [fechaDesde, setFechaDesde] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [fechaHasta, setFechaHasta] = useState(() => new Date().toISOString().slice(0, 10));
  const [filtroSector, setFiltroSector] = useState('TODOS');
  const [filtroClasif, setFiltroClasif] = useState('TODOS');

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

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const { data: inms } = await supabase
        .from('inmuebles')
        .select('*')
        .order('id', { ascending: false });

      if (inms) setData(inms);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const filtered = data.filter((item) => {
    if (item.created_at) {
      const d = item.created_at.slice(0, 10);
      if (fechaDesde && d < fechaDesde) return false;
      if (fechaHasta && d > fechaHasta) return false;
    }
    if (filtroSector !== 'TODOS') {
      const dir = (item.direccion || '').toUpperCase();
      if (!dir.includes(filtroSector)) return false;
    }
    if (filtroClasif !== 'TODOS') {
      const c = (item.clasificacion || '').toUpperCase();
      if (!c.includes(filtroClasif)) return false;
    }
    return true;
  });

  const exportarExcel = () => {
    const rows = filtered.map((r, i) => [
      i + 1,
      r.created_at ? new Date(r.created_at).toLocaleDateString('es-VE') : 'N/D',
      r.identidad || '—',
      r.contribuyente || '—',
      r.inmueble || 'Principal',
      r.clasificacion || 'Residencial',
      r.actividad_principal || '—',
      r.direccion || '—',
      r.telefono || '—',
      r.correo_electronico || '—',
      parseFloat(r.mmv_mes || '0')
    ]);

    const wsData = [
      ['INSTITUTO AUTÓNOMO MUNICIPAL DE GESTIÓN AMBIENTAL - MUNICIPIO SILVA (ISMA)'],
      ['REPORTE OFICIAL DE NUEVOS CONTRIBUYENTES INSCRITOS'],
      [`Período: ${fechaDesde} al ${fechaHasta}  |  Sector: ${filtroSector}  |  Total Registros: ${filtered.length}`],
      [],
      ['N°', 'FECHA', 'IDENTIDAD', 'CONTRIBUYENTE', 'INMUEBLE', 'CLASIFICACIÓN', 'ACTIVIDAD', 'DIRECCIÓN', 'TELÉFONO', 'CORREO', 'MMV MENSUAL'],
      ...rows,
      [],
      ['', '', '', '', '', '', '', '', '', 'TOTAL INSCRITOS:', filtered.length]
    ];

    const ws = xlsx.utils.aoa_to_sheet(wsData);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'Nuevos Inscritos');
    xlsx.writeFile(wb, `Reporte_Nuevos_Inscritos_${fechaDesde}_al_${fechaHasta}.xlsx`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-sm text-blue-600 hover:text-blue-800 font-medium">← Regresar</button>
          <span className="text-slate-300">|</span>
          <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-emerald-600" />
            Reporte de Nuevos Contribuyentes Inscritos
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

      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" /> Fecha Desde
            </label>
            <input
              type="date"
              value={fechaDesde}
              onChange={e => setFechaDesde(e.target.value)}
              className="w-full border border-slate-300 rounded-lg p-2 text-xs text-slate-700 bg-white"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" /> Fecha Hasta
            </label>
            <input
              type="date"
              value={fechaHasta}
              onChange={e => setFechaHasta(e.target.value)}
              className="w-full border border-slate-300 rounded-lg p-2 text-xs text-slate-700 bg-white"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-slate-400" /> Sector / Zona
            </label>
            <select
              value={filtroSector}
              onChange={e => setFiltroSector(e.target.value)}
              className="w-full border border-slate-300 rounded-lg p-2 text-xs text-slate-700 bg-white"
            >
              {SECTORES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-slate-400" /> Clasificación
            </label>
            <select
              value={filtroClasif}
              onChange={e => setFiltroClasif(e.target.value)}
              className="w-full border border-slate-300 rounded-lg p-2 text-xs text-slate-700 bg-white"
            >
              <option value="TODOS">Todas</option>
              <option value="RESIDENCIAL">Residencial</option>
              <option value="COMERCIAL">Comercial</option>
              <option value="INDUSTRIAL">Industrial</option>
            </select>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Mostrando <strong>{filtered.length}</strong> contribuyentes inscritos bajo los filtros seleccionados.</span>
          <button onClick={cargarDatos} className="text-emerald-700 hover:text-emerald-900 font-semibold flex items-center gap-1">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refrescar
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left" style={{ minWidth: '850px' }}>
            <thead className="bg-emerald-50 text-emerald-900 font-bold uppercase border-b border-emerald-100">
              <tr>
                <th className="px-3 py-2.5">#</th>
                <th className="px-3 py-2.5">Fecha</th>
                <th className="px-3 py-2.5">Identidad</th>
                <th className="px-3 py-2.5">Contribuyente</th>
                <th className="px-3 py-2.5">Sector / Dirección</th>
                <th className="px-3 py-2.5">Clasificación</th>
                <th className="px-3 py-2.5">Actividad</th>
                <th className="px-3 py-2.5 text-right">MMV Mes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.slice(0, 100).map((r, i) => (
                <tr key={r.id || i} className="hover:bg-slate-50 transition-colors">
                  <td className="px-3 py-2 font-mono text-slate-400">{i + 1}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-slate-500">{r.created_at ? new Date(r.created_at).toLocaleDateString('es-VE') : '—'}</td>
                  <td className="px-3 py-2 font-mono font-bold text-emerald-800">{r.identidad}</td>
                  <td className="px-3 py-2 font-semibold text-slate-800">{r.contribuyente}</td>
                  <td className="px-3 py-2 text-slate-600 max-w-xs truncate">{r.direccion || '—'}</td>
                  <td className="px-3 py-2">
                    <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-slate-100 text-slate-700">{r.clasificacion || 'Residencial'}</span>
                  </td>
                  <td className="px-3 py-2 text-slate-500 truncate max-w-xs">{r.actividad_principal || '—'}</td>
                  <td className="px-3 py-2 text-right font-mono font-bold text-slate-700">{parseFloat(r.mmv_mes || '0').toFixed(2)}</td>
                </tr>
              ))}
              {filtered.length === 0 && !loading && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    No se encontraron contribuyentes inscritos en este rango y filtros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
