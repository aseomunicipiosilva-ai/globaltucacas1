'use client';
import { useEffect, useState } from 'react';
import { Users, Search, Building2, MapPin, AlertTriangle, CheckCircle2, Download } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function CensoCatastroPage() {
  const [inmuebles, setInmuebles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('');
  const [clasificacion, setClasificacion] = useState<'Todos' | 'Residencial' | 'Comercial' | 'Industrial'>('Todos');

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const { data } = await supabase
          .from('inmuebles')
          .select('*')
          .order('inmueble', { ascending: true });

        if (data) setInmuebles(data);
      } catch (e) {
        console.error('Error cargando censo catastral:', e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const filtrados = inmuebles.filter(i => {
    const cls = (i.clasificacion || '').toUpperCase();
    if (clasificacion === 'Residencial' && !cls.includes('RESIDENCIAL') && !cls.includes('TIPO A')) return false;
    if (clasificacion === 'Comercial' && !cls.includes('COMERCIAL') && !cls.includes('TIPO D') && !cls.includes('TIPO B') && !cls.includes('TIPO C')) return false;
    if (clasificacion === 'Industrial' && !cls.includes('INDUSTRIAL')) return false;

    if (!filtro) return true;
    const q = filtro.toLowerCase();
    return (
      (i.contribuyente || '').toLowerCase().includes(q) ||
      (i.identidad || '').toLowerCase().includes(q) ||
      (i.inmueble || '').toLowerCase().includes(q) ||
      (i.cod_cont || '').toLowerCase().includes(q) ||
      (i.direccion || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-800 pb-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <Users className="w-7 h-7 text-orange-400" />
            Censo Inmobiliario y Catastral • Municipio Silva
          </h1>
          <p className="text-xs text-stone-400 mt-1">
            Padrón completo de inmuebles urbanos clasificados por uso: residencial, comercial e industrial.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-stone-950 p-1 rounded-xl border border-stone-800">
          {(['Todos', 'Residencial', 'Comercial', 'Industrial'] as const).map(tipo => (
            <button
              key={tipo}
              onClick={() => setClasificacion(tipo)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                clasificacion === tipo
                  ? 'bg-orange-600 text-white shadow-md'
                  : 'text-stone-400 hover:text-white'
              }`}
            >
              {tipo}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-stone-950/80 border border-stone-800 rounded-xl p-4 flex items-center gap-3">
        <Search className="w-5 h-5 text-stone-500" />
        <input
          type="text"
          value={filtro}
          onChange={e => setFiltro(e.target.value)}
          placeholder="Buscar por Código de Parcela, Propietario, Cédula o Dirección..."
          className="flex-1 bg-transparent text-sm text-white placeholder-stone-500 focus:outline-none"
        />
        <span className="text-xs font-bold text-orange-400 bg-orange-950/80 border border-orange-800/60 px-3 py-1 rounded-lg">
          {filtrados.length} Inmuebles
        </span>
      </div>

      <div className="bg-stone-950/80 border border-stone-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-stone-300">
            <thead className="bg-stone-900 border-b border-stone-800 text-stone-400 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3.5">Cód. Inmueble</th>
                <th className="px-4 py-3.5">Propietario / Titular</th>
                <th className="px-4 py-3.5">Cédula / RIF</th>
                <th className="px-4 py-3.5">Clasificación / Uso</th>
                <th className="px-4 py-3.5">Dirección / Sector</th>
                <th className="px-4 py-3.5">Solvencia Aseo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800/60">
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-stone-500">Cargando censo catastral...</td></tr>
              ) : filtrados.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-stone-500">No se encontraron parcelas.</td></tr>
              ) : (
                filtrados.slice(0, 100).map(i => {
                  const tieneDeuda = parseFloat(i.deuda_mmv || '0') > 0 || parseFloat(i.deuda_congelada_bs || '0') > 0;
                  return (
                    <tr key={i.id} className="hover:bg-stone-900/50">
                      <td className="px-4 py-3 font-mono font-bold text-orange-400">{i.inmueble || i.cod_cont}</td>
                      <td className="px-4 py-3 font-semibold text-white">{i.contribuyente}</td>
                      <td className="px-4 py-3 font-mono text-stone-300">{i.identidad}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded bg-stone-900 border border-stone-700 font-medium text-[10px] text-stone-300">
                          {i.clasificacion || 'Urbano'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-stone-400 max-w-xs truncate">{i.direccion}</td>
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
