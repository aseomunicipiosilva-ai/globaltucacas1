'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { DataTable } from '@/components/DataTable';
import { Search, Download, ShieldCheck } from 'lucide-react';
import * as xlsx from 'xlsx';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function AuditoriaPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('auditoria')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000); // Last 1000 records
        
      if (data) {
        setLogs(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const exportarExcel = () => {
    const exportData = logs.map(l => ({
      'ID': l.id,
      'Fecha y Hora': new Date(l.created_at).toLocaleString('es-VE'),
      'Usuario': l.usuario,
      'Acción': l.accion,
      'Detalles': typeof l.detalles === 'object' ? JSON.stringify(l.detalles) : l.detalles
    }));

    const ws = xlsx.utils.json_to_sheet(exportData);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, "Auditoria");
    xlsx.writeFile(wb, `Reporte_Auditoria_${new Date().getTime()}.xlsx`);
  };

  const columns = [
    { key: 'created_at', header: 'Fecha y Hora', render: (row: any) => new Date(row.created_at).toLocaleString('es-VE') },
    { key: 'usuario', header: 'Usuario', render: (row: any) => <span className="font-semibold text-slate-700">{row.usuario}</span> },
    { key: 'accion', header: 'Acción', render: (row: any) => (
      <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs font-semibold">{row.accion}</span>
    )},
    { key: 'detalles', header: 'Detalles', render: (row: any) => {
      let d = row.detalles;
      if (typeof d === 'string') {
        try { d = JSON.parse(d); } catch(e){}
      }
      return <pre className="text-[10px] text-slate-500 max-w-xs overflow-hidden text-ellipsis whitespace-nowrap" title={JSON.stringify(d, null, 2)}>{JSON.stringify(d)}</pre>
    }}
  ];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-indigo-600" />
            Auditoría de Sistema
          </h1>
          <p className="text-slate-500 text-sm">Registro inmutable de actividades y operaciones.</p>
        </div>
        <button 
          onClick={exportarExcel}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded shadow-sm text-sm font-medium transition-colors"
        >
          <Download size={16} />
          Exportar Excel
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
          <h3 className="font-semibold text-slate-700">Últimos Registros (Solo Lectura)</h3>
        </div>
        {loading ? (
          <div className="p-8 text-center text-slate-500">Cargando registros...</div>
        ) : (
          <DataTable data={logs} columns={columns} searchable={true} itemsPerPage={50} />
        )}
      </div>
    </div>
  );
}