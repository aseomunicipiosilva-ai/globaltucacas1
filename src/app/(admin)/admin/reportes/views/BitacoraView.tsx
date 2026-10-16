'use client';
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Download, RefreshCw, ShieldAlert, Calendar, User, Search } from 'lucide-react';
import * as xlsx from 'xlsx';

export default function BitacoraView({ onBack }: { onBack: () => void }) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [filtroAccion, setFiltroAccion] = useState('TODAS');
  const [searchUser, setSearchUser] = useState('');

  const cargarLogs = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('audit_logs')
        .select('*')
        .order('id', { ascending: false })
        .limit(500);
      if (data) setLogs(data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    cargarLogs();
  }, []);

  const filtered = logs.filter(log => {
    if (filtroAccion !== 'TODAS' && log.accion !== filtroAccion) return false;
    if (searchUser && !(log.usuario || '').toLowerCase().includes(searchUser.toLowerCase())) return false;
    if (log.created_at) {
      const d = log.created_at.slice(0, 10);
      if (fechaDesde && d < fechaDesde) return false;
      if (fechaHasta && d > fechaHasta) return false;
    }
    return true;
  });

  const exportarExcel = () => {
    const rows = filtered.map((l, i) => [
      i + 1,
      l.created_at ? new Date(l.created_at).toLocaleString('es-VE') : 'N/D',
      l.usuario || 'Sistema',
      l.accion || 'ACCION',
      l.detalles || '—'
    ]);

    const wsData = [
      ['INSTITUTO AUTÓNOMO MUNICIPAL DE GESTIÓN AMBIENTAL - MUNICIPIO SILVA (ISMA)'],
      ['BITÁCORA OFICIAL DE AUDITORÍA Y TRAZABILIDAD DEL SISTEMA'],
      [`Filtro Acción: ${filtroAccion}  |  Total Registros: ${filtered.length}  |  Fecha: ${new Date().toLocaleDateString('es-VE')}`],
      [],
      ['N°', 'FECHA Y HORA', 'USUARIO / OPERADOR', 'ACCIÓN', 'DETALLES / EVENTO'],
      ...rows
    ];

    const ws = xlsx.utils.aoa_to_sheet(wsData);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'Bitacora Auditoria');
    xlsx.writeFile(wb, `Reporte_Bitacora_Auditoria_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-sm text-blue-600 hover:text-blue-800 font-medium">← Regresar</button>
          <span className="text-slate-300">|</span>
          <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-purple-600" />
            Bitácora de Auditoría y Trazabilidad Operativa
          </h1>
        </div>
        <button
          onClick={exportarExcel}
          disabled={loading || filtered.length === 0}
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 shadow-sm disabled:opacity-50"
        >
          <Download className="w-4 h-4" /> Exportar a Excel (.xlsx)
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Fecha Desde</label>
            <input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} className="w-full border border-slate-300 rounded-lg p-2 text-xs" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Fecha Hasta</label>
            <input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} className="w-full border border-slate-300 rounded-lg p-2 text-xs" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Usuario / Cajero</label>
            <input type="text" placeholder="Buscar por usuario..." value={searchUser} onChange={e => setSearchUser(e.target.value)} className="w-full border border-slate-300 rounded-lg p-2 text-xs" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Tipo de Acción</label>
            <select value={filtroAccion} onChange={e => setFiltroAccion(e.target.value)} className="w-full border border-slate-300 rounded-lg p-2 text-xs bg-white font-medium">
              <option value="TODAS">Todas las acciones</option>
              <option value="COBRO">Cobros de Caja</option>
              <option value="CENSO_CREADO">Censo Creado</option>
              <option value="CENSO_ACTUALIZACION">Censo Actualizado</option>
              <option value="CAMBIO_TASA_CAJA">Cambio Tasa BCV</option>
              <option value="ENVIOS_MASIVOS_SEMANAL">Envíos Masivos</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left" style={{ minWidth: '850px' }}>
            <thead className="bg-purple-50 text-purple-900 font-bold uppercase border-b border-purple-100">
              <tr>
                <th className="px-3 py-2.5">#</th>
                <th className="px-3 py-2.5">Fecha y Hora</th>
                <th className="px-3 py-2.5">Usuario</th>
                <th className="px-3 py-2.5">Acción</th>
                <th className="px-3 py-2.5">Detalles del Evento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((l, i) => (
                <tr key={l.id || i} className="hover:bg-slate-50 transition-colors">
                  <td className="px-3 py-2 font-mono text-slate-400">{i + 1}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-slate-500">
                    {l.created_at ? new Date(l.created_at).toLocaleString('es-VE') : '—'}
                  </td>
                  <td className="px-3 py-2 font-bold font-mono text-purple-800">{l.usuario || 'Sistema'}</td>
                  <td className="px-3 py-2">
                    <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-slate-100 text-slate-800 font-mono">
                      {l.accion}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-slate-700 max-w-lg truncate">{l.detalles || '—'}</td>
                </tr>
              ))}
              {filtered.length === 0 && !loading && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">No hay registros en la bitácora con los filtros seleccionados.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
