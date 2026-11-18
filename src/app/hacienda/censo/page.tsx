'use client';
import { useEffect, useState } from 'react';
import { Users, Search, Building2, ShieldCheck, AlertTriangle, CheckCircle2, Download, Filter } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function CensoHaciendaPage() {
  const [inmuebles, setInmuebles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('');
  const [clasificacion, setClasificacion] = useState<'Todos' | 'Comercial' | 'Industrial'>('Todos');

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const { data } = await supabase
          .from('inmuebles')
          .select('*')
          .order('contribuyente', { ascending: true });

        if (data) {
          // Filtrar por defecto solo los de ámbito comercial e industrial
          setInmuebles(data);
        }
      } catch (e) {
        console.error('Error cargando censo:', e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const inmueblesFiltrados = inmuebles.filter(i => {
    const cls = (i.clasificacion || '').toUpperCase();
    const esComercial = cls.includes('COMERCIAL') || cls.includes('TIPO D') || cls.includes('TIPO B') || cls.includes('TIPO C');
    const esIndustrial = cls.includes('INDUSTRIAL');

    if (clasificacion === 'Comercial' && !esComercial) return false;
    if (clasificacion === 'Industrial' && !esIndustrial) return false;
    if (clasificacion === 'Todos' && !esComercial && !esIndustrial) {
      // Si seleccionó Todos en Hacienda, mostrar al menos los que tienen actividad comercial/industrial
      if (!i.actividad_principal || i.actividad_principal === 'No aplica') return false;
    }

    if (!filtro) return true;
    const q = filtro.toLowerCase();
    return (
      (i.contribuyente || '').toLowerCase().includes(q) ||
      (i.identidad || '').toLowerCase().includes(q) ||
      (i.actividad_principal || '').toLowerCase().includes(q) ||
      (i.direccion || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <Users className="w-7 h-7 text-sky-400" />
            Censo y Padrón Fiscal • Hacienda Municipal
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Directorio compartido de contribuyentes comerciales e industriales del Municipio Silva.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
          {(['Todos', 'Comercial', 'Industrial'] as const).map(tipo => (
            <button
              key={tipo}
              onClick={() => setClasificacion(tipo)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                clasificacion === tipo
                  ? 'bg-sky-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tipo}
            </button>
          ))}
        </div>
      </div>

      {/* Buscador */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex items-center gap-3">
        <Search className="w-5 h-5 text-slate-500" />
        <input
          type="text"
          value={filtro}
          onChange={e => setFiltro(e.target.value)}
          placeholder="Buscar por RIF, Razón Social, Actividad Económica o Dirección..."
          className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none"
        />
        <span className="text-xs font-bold text-sky-400 bg-sky-950/80 border border-sky-800/60 px-3 py-1 rounded-lg">
          {inmueblesFiltrados.length} Registros
        </span>
      </div>

      {/* Tabla de Contribuyentes */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3.5">RIF / Cédula</th>
                <th className="px-4 py-3.5">Razón Social / Contribuyente</th>
                <th className="px-4 py-3.5">Actividad Económica</th>
                <th className="px-4 py-3.5">Clasificación</th>
                <th className="px-4 py-3.5">Teléfono / Contacto</th>
                <th className="px-4 py-3.5">Estado Aseo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500">Cargando censo...</td>
                </tr>
              ) : inmueblesFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500">No se encontraron contribuyentes en este filtro.</td>
                </tr>
              ) : (
                inmueblesFiltrados.slice(0, 100).map(i => {
                  const tieneDeuda = parseFloat(i.deuda_mmv || '0') > 0 || parseFloat(i.deuda_congelada_bs || '0') > 0;
                  return (
                    <tr key={i.id} className="hover:bg-slate-900/50 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-sky-400">{i.identidad}</td>
                      <td className="px-4 py-3 font-semibold text-white">{i.contribuyente}</td>
                      <td className="px-4 py-3 text-slate-300">{i.actividad_principal || 'Comercial'}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 font-medium text-[10px] text-slate-300">
                          {i.clasificacion || 'Comercial'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-400 font-mono text-[11px]">{i.telefono || 'No registrado'}</td>
                      <td className="px-4 py-3">
                        {tieneDeuda ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-950 text-red-400 border border-red-800">
                            <AlertTriangle className="w-3 h-3" /> Deuda Aseo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800">
                            <CheckCircle2 className="w-3 h-3" /> Solvente
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
