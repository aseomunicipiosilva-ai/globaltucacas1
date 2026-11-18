'use client';
import { useEffect, useState } from 'react';
import { FileText, Search, ShieldCheck, CheckCircle2, AlertTriangle, Printer, QrCode } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function LicenciasHaciendaPage() {
  const [inmuebles, setInmuebles] = useState<any[]>([]);
  const [filtro, setFiltro] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const { data } = await supabase
          .from('inmuebles')
          .select('*')
          .not('patente', 'is', null)
          .limit(100);
        if (data) setInmuebles(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtrados = inmuebles.filter(i => {
    if (!filtro) return true;
    const q = filtro.toLowerCase();
    return (
      (i.contribuyente || '').toLowerCase().includes(q) ||
      (i.identidad || '').toLowerCase().includes(q) ||
      (i.patente || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-800 pb-4">
        <h1 className="text-2xl font-black text-white flex items-center gap-2">
          <FileText className="w-7 h-7 text-sky-400" />
          Licencias y Patentes de Actividades Económicas
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Registro de números de patente comercial, licencias y solvencias del Municipio Silva.
        </p>
      </div>

      <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex items-center gap-3 max-w-2xl">
        <Search className="w-5 h-5 text-slate-500" />
        <input
          type="text"
          value={filtro}
          onChange={e => setFiltro(e.target.value)}
          placeholder="Buscar por Patente, RIF o Razón Social..."
          className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none"
        />
      </div>

      <div className="bg-slate-950/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3.5">N° Patente</th>
                <th className="px-4 py-3.5">RIF</th>
                <th className="px-4 py-3.5">Contribuyente</th>
                <th className="px-4 py-3.5">Actividad Principal</th>
                <th className="px-4 py-3.5">Estado</th>
                <th className="px-4 py-3.5 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-500">Cargando licencias...</td></tr>
              ) : filtrados.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-500">No hay licencias registradas.</td></tr>
              ) : (
                filtrados.map(i => (
                  <tr key={i.id} className="hover:bg-slate-900/50">
                    <td className="px-4 py-3 font-mono font-bold text-sky-400">{i.patente || 'S/N'}</td>
                    <td className="px-4 py-3 font-mono text-slate-300">{i.identidad}</td>
                    <td className="px-4 py-3 font-semibold text-white">{i.contribuyente}</td>
                    <td className="px-4 py-3 text-slate-400">{i.actividad_principal || 'Comercial'}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                        Vigente
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => alert(`Certificado de Patente para ${i.contribuyente} (${i.patente}) en proceso de impresión.`)}
                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-sky-600/30 text-sky-300 hover:bg-sky-600 hover:text-white rounded-lg text-xs font-bold border border-sky-500/40 transition-all"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        Imprimir Cartel
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
