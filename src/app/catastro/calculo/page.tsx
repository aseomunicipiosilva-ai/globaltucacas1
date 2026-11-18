'use client';
import { useState } from 'react';
import { Calculator, MapPin, Building2, AlertTriangle, CheckCircle2, ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { verificarSolvenciaAseo } from '@/lib/solvenciaAseo';

export default function CalculoCatastroPage() {
  const [identidad, setIdentidad] = useState('');
  const [inmueble, setInmueble] = useState<any>(null);
  const [solvencia, setSolvencia] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Parámetros de avalúo
  const [m2Terreno, setM2Terreno] = useState('200');
  const [valorM2Terreno, setValorM2Terreno] = useState('15');
  const [m2Construccion, setM2Construccion] = useState('120');
  const [valorM2Construccion, setValorM2Construccion] = useState('80');
  const [alicuota, setAlicuota] = useState('0.5'); // 0.5% anual
  const [resultado, setResultado] = useState<any>(null);

  const buscar = async () => {
    if (!identidad.trim()) return;
    setLoading(true);
    setResultado(null);
    try {
      const { data } = await supabase
        .from('inmuebles')
        .select('*')
        .or(`identidad.ilike.%${identidad.trim()}%,cod_cont.ilike.%${identidad.trim()}%,inmueble.ilike.%${identidad.trim()}%`)
        .limit(1)
        .maybeSingle();

      if (data) {
        setInmueble(data);
        if (data.area) {
          setM2Terreno(String(data.area));
          setM2Construccion(String(data.area_operativa || Math.round(data.area * 0.7)));
        }
        const solv = await verificarSolvenciaAseo(data.identidad);
        setSolvencia(solv);
      } else {
        alert('Inmueble no encontrado.');
      }
    } catch (e: any) {
      alert('Error: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const calcular = () => {
    const tM2 = parseFloat(m2Terreno) || 0;
    const vT = parseFloat(valorM2Terreno) || 0;
    const cM2 = parseFloat(m2Construccion) || 0;
    const vC = parseFloat(valorM2Construccion) || 0;
    const ali = parseFloat(alicuota) || 0;

    const avaluoTerreno = tM2 * vT;
    const avaluoConstruccion = cM2 * vC;
    const avaluoTotal = avaluoTerreno + avaluoConstruccion;
    const impuestoAnual = (avaluoTotal * ali) / 100;
    const impuestoTrimestral = impuestoAnual / 4;

    setResultado({
      avaluoTerreno,
      avaluoConstruccion,
      avaluoTotal,
      impuestoAnual,
      impuestoTrimestral
    });
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="border-b border-stone-800 pb-4">
        <h1 className="text-2xl font-black text-white flex items-center gap-2">
          <Calculator className="w-7 h-7 text-orange-400" />
          Cálculo y Avalúo de Derecho de Frente Inmobiliario
        </h1>
        <p className="text-xs text-stone-400 mt-1">
          Tabla de valores por sector (Tucacas, Boca de Aroa) y tasación del impuesto sobre inmuebles urbanos.
        </p>
      </div>

      <div className="bg-stone-950/80 border border-stone-800 rounded-2xl p-5 max-w-2xl">
        <label className="block text-xs font-bold text-stone-300 uppercase mb-2">
          Cód. Catastro, Inmueble o Cédula/RIF:
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={identidad}
            onChange={e => setIdentidad(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && buscar()}
            placeholder="Ej: C-000180 o V-14537488"
            className="flex-1 px-4 py-2 bg-stone-900 border border-stone-700 rounded-xl text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
          <button
            onClick={buscar}
            disabled={loading}
            className="px-6 py-2 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl text-sm shadow-md transition-all"
          >
            {loading ? 'Buscando...' : 'Buscar'}
          </button>
        </div>
      </div>

      {inmueble && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-stone-950/80 border border-stone-800 rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-bold uppercase text-stone-400 tracking-wider">Inmueble Identificado</h3>
            <div className="space-y-1">
              <p className="text-lg font-black text-white">{inmueble.contribuyente}</p>
              <p className="text-xs text-orange-400 font-mono font-bold">Código: {inmueble.inmueble || inmueble.cod_cont}</p>
              <p className="text-xs text-stone-400">Sector: {inmueble.sector || 'Casco Central Tucacas'}</p>
              <p className="text-xs text-stone-400">Dirección: {inmueble.direccion}</p>
            </div>

            <div className={`p-4 rounded-xl border ${solvencia?.solvente ? 'bg-emerald-950/40 border-emerald-500/40' : 'bg-red-950/40 border-red-500/40'}`}>
              <div className="flex items-center gap-2">
                {solvencia?.solvente ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                )}
                <span className="text-xs font-black uppercase text-white">
                  {solvencia?.solvente ? 'Solvente en Aseo Urbano' : 'Bloqueado: Deuda en Aseo'}
                </span>
              </div>
              <p className="text-[11px] text-stone-300 mt-1">{solvencia?.detalle}</p>
            </div>
          </div>

          <div className="bg-stone-950/80 border border-stone-800 rounded-2xl p-6 space-y-3">
            <h3 className="text-sm font-bold uppercase text-stone-400 tracking-wider">Parámetros del Avalúo</h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-stone-300 mb-1">M² Terreno:</label>
                <input
                  type="number"
                  value={m2Terreno}
                  onChange={e => setM2Terreno(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-900 border border-stone-700 rounded-lg text-sm text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-stone-300 mb-1">Valor M² Terreno ($/Bs):</label>
                <input
                  type="number"
                  value={valorM2Terreno}
                  onChange={e => setValorM2Terreno(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-900 border border-stone-700 rounded-lg text-sm text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-stone-300 mb-1">M² Construcción:</label>
                <input
                  type="number"
                  value={m2Construccion}
                  onChange={e => setM2Construccion(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-900 border border-stone-700 rounded-lg text-sm text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-stone-300 mb-1">Valor M² Construcción:</label>
                <input
                  type="number"
                  value={valorM2Construccion}
                  onChange={e => setValorM2Construccion(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-900 border border-stone-700 rounded-lg text-sm text-white font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-stone-300 mb-1">Alícuota Inmobiliaria (%):</label>
              <input
                type="number"
                step="0.05"
                value={alicuota}
                onChange={e => setAlicuota(e.target.value)}
                className="w-full px-3 py-2 bg-stone-900 border border-stone-700 rounded-lg text-sm text-white font-mono"
              />
            </div>

            <button
              onClick={calcular}
              className="w-full py-2.5 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl text-sm transition-all shadow-md mt-2"
            >
              Calcular Avalúo y Derecho de Frente
            </button>

            {resultado && (
              <div className="p-4 bg-orange-950/40 border border-orange-500/40 rounded-xl space-y-1 text-center mt-3">
                <p className="text-xs text-orange-300 uppercase font-semibold">Avalúo Fiscal Total: Bs. {resultado.avaluoTotal.toLocaleString('es-VE', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                <p className="text-2xl font-black text-white">Derecho de Frente Anual: Bs. {resultado.impuestoAnual.toLocaleString('es-VE', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                <p className="text-xs text-stone-400">Cuota Trimestral Sugerida: Bs. {resultado.impuestoTrimestral.toLocaleString('es-VE', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
