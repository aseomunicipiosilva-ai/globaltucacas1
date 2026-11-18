'use client';
import { useEffect, useState } from 'react';
import { Search, Building2, ShieldCheck, CheckCircle2, AlertTriangle, ArrowRight, MapPin } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { verificarSolvenciaAseo } from '@/lib/solvenciaAseo';

export default function SolvenciasCatastroPage() {
  const [identidad, setIdentidad] = useState('');
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<any>(null);

  const consultar = async (doc?: string) => {
    const q = (doc || identidad).trim();
    if (!q) return;
    setLoading(true);
    try {
      const { data: inms } = await supabase
        .from('inmuebles')
        .select('*')
        .or(`identidad.ilike.%${q}%,contribuyente.ilike.%${q}%,cod_cont.ilike.%${q}%,inmueble.ilike.%${q}%`);

      if (inms && inms.length > 0) {
        const solv = await verificarSolvenciaAseo(inms[0].identidad);
        setResultado({
          inmueble: inms[0],
          solvencia: solv
        });
      } else {
        setResultado({ error: 'No se encontraron inmuebles con los datos ingresados.' });
      }
    } catch (e: any) {
      setResultado({ error: e.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-stone-800 pb-4">
        <h1 className="text-2xl font-black text-white flex items-center gap-2">
          <ShieldCheck className="w-7 h-7 text-orange-400" />
          Verificador de Solvencia • Catastro Municipal
        </h1>
        <p className="text-xs text-stone-400 mt-1">
          Validación estricta de solvencia de Aseo Urbano para propietarios y parcelas antes de expedir avalúos o cobrar Derecho de Frente.
        </p>
      </div>

      {/* Buscador */}
      <div className="bg-stone-950/80 border border-stone-800 rounded-2xl p-5 shadow-sm max-w-2xl">
        <label className="block text-xs font-bold text-stone-300 uppercase mb-2">
          Buscar por Código Catastral, Inmueble, RIF o Propietario:
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={identidad}
            onChange={e => setIdentidad(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && consultar()}
            placeholder="Ej: C-000180, V-14537488 o Nombre"
            className="flex-1 px-4 py-2.5 bg-stone-900 border border-stone-700 rounded-xl text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
          <button
            onClick={() => consultar()}
            disabled={loading}
            className="px-6 py-2.5 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl text-sm transition-all shadow-md shadow-orange-600/30 disabled:opacity-50 flex items-center gap-2"
          >
            <Search className="w-4 h-4" />
            {loading ? 'Consultando...' : 'Verificar'}
          </button>
        </div>
      </div>

      {/* Resultado */}
      {resultado && (
        <div className="max-w-3xl">
          {resultado.error ? (
            <div className="p-4 bg-red-950/50 border border-red-800 text-red-300 rounded-xl text-sm">
              {resultado.error}
            </div>
          ) : (
            <div className={`p-6 rounded-2xl border ${resultado.solvencia.solvente ? 'bg-emerald-950/30 border-emerald-500/50' : 'bg-red-950/30 border-red-500/50'} space-y-4`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {resultado.solvencia.solvente ? (
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                      <CheckCircle2 className="w-7 h-7" />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center">
                      <AlertTriangle className="w-7 h-7" />
                    </div>
                  )}
                  <div>
                    <h3 className="text-lg font-black text-white">{resultado.inmueble.contribuyente}</h3>
                    <p className="text-xs text-stone-400">Inmueble: <span className="font-mono text-orange-400">{resultado.inmueble.inmueble || resultado.inmueble.cod_cont}</span> • RIF/CI: {resultado.inmueble.identidad}</p>
                  </div>
                </div>

                <span className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider ${resultado.solvencia.solvente ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-red-500/20 text-red-300 border border-red-500/40'}`}>
                  {resultado.solvencia.solvente ? 'SOLVENTE EN ASEO' : 'CON DEUDA EN ASEO'}
                </span>
              </div>

              <div className="p-4 bg-stone-900/80 rounded-xl border border-stone-800 text-xs space-y-1">
                <p className="text-stone-300 font-semibold">{resultado.solvencia.detalles}</p>
                {!resultado.solvencia.solvente && (
                  <p className="text-red-400 font-bold text-sm pt-1">
                    Total Deuda Aseo Urbano: Bs. {resultado.solvencia.montoDeuda.toLocaleString('es-VE', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Link
                  href="/catastro/caja"
                  className="px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs flex items-center gap-2 shadow-md transition-all"
                >
                  Proceder a Caja de Catastro
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
