'use client';
import { useState } from 'react';
import { Calculator, Search, AlertCircle, CheckCircle2, ShieldCheck, DollarSign } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { verificarSolvenciaAseo } from '@/lib/solvenciaAseo';

export default function DeclaracionesHaciendaPage() {
  const [rif, setRif] = useState('');
  const [loading, setLoading] = useState(false);
  const [empresa, setEmpresa] = useState<any>(null);
  const [solvenciaAseo, setSolvenciaAseo] = useState<any>(null);
  const [ingresos, setIngresos] = useState('');
  const [alicuota, setAlicuota] = useState('1.5');
  const [periodo, setPeriodo] = useState('NOVIEMBRE 2026');
  const [calculo, setCalculo] = useState<any>(null);

  const buscarEmpresa = async () => {
    if (!rif.trim()) return;
    setLoading(true);
    setCalculo(null);
    try {
      const { data } = await supabase
        .from('inmuebles')
        .select('*')
        .ilike('identidad', `%${rif.trim()}%`)
        .limit(1)
        .maybeSingle();

      if (data) {
        setEmpresa(data);
        const solv = await verificarSolvenciaAseo(data.identidad);
        setSolvenciaAseo(solv);
      } else {
        alert('Contribuyente no encontrado en el padrón.');
      }
    } catch (e: any) {
      alert('Error: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const calcularImpuesto = () => {
    const ing = parseFloat(ingresos.replace(/[^0-9.]/g, '')) || 0;
    const ali = parseFloat(alicuota) || 0;
    const impuesto = (ing * ali) / 100;
    setCalculo({
      ingresos: ing,
      alicuota: ali,
      impuesto: impuesto
    });
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-800 pb-4">
        <h1 className="text-2xl font-black text-white flex items-center gap-2">
          <Calculator className="w-7 h-7 text-sky-400" />
          Declaración Mensual de Ingresos Brutos (ISAE)
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Cálculo del impuesto sobre actividades económicas con validación previa de solvencia de Aseo Urbano.
        </p>
      </div>

      {/* Buscador de Empresa */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 max-w-2xl">
        <label className="block text-xs font-bold text-slate-300 uppercase mb-2">
          RIF del Contribuyente Comercial:
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={rif}
            onChange={e => setRif(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && buscarEmpresa()}
            placeholder="Ej: J-303929451"
            className="flex-1 px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
          <button
            onClick={buscarEmpresa}
            disabled={loading}
            className="px-6 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl text-sm shadow-md transition-all"
          >
            {loading ? 'Buscando...' : 'Buscar'}
          </button>
        </div>
      </div>

      {empresa && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-5xl">
          {/* Ficha de Empresa y Validación de Aseo */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-bold uppercase text-slate-400 tracking-wider">Datos del Contribuyente</h3>
            <div className="space-y-1">
              <p className="text-lg font-black text-white">{empresa.contribuyente}</p>
              <p className="text-xs text-sky-400 font-mono font-bold">RIF: {empresa.identidad}</p>
              <p className="text-xs text-slate-400">Actividad: {empresa.actividad_principal || 'Comercio General'}</p>
            </div>

            {/* Validación de Solvencia de Aseo */}
            <div className={`p-4 rounded-xl border ${solvenciaAseo?.solvente ? 'bg-emerald-950/40 border-emerald-500/40' : 'bg-red-950/40 border-red-500/40'}`}>
              <div className="flex items-center gap-2">
                {solvenciaAseo?.solvente ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-400" />
                )}
                <span className="text-xs font-black uppercase text-white">
                  {solvenciaAseo?.solvente ? 'Solvente con Aseo Urbano' : 'Bloqueado: Deuda en Aseo'}
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mt-1">{solvenciaAseo?.detalles}</p>
            </div>
          </div>

          {/* Formulario de Declaración */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-bold uppercase text-slate-400 tracking-wider">Cálculo de Impuesto</h3>
            
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Período Gravable:</label>
                <input
                  type="text"
                  value={periodo}
                  onChange={e => setPeriodo(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Ingresos Brutos del Mes (Bs.):</label>
                <input
                  type="number"
                  step="0.01"
                  value={ingresos}
                  onChange={e => setIngresos(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Alícuota Aplicable (%):</label>
                <input
                  type="number"
                  step="0.01"
                  value={alicuota}
                  onChange={e => setAlicuota(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white font-mono"
                />
              </div>

              <button
                onClick={calcularImpuesto}
                disabled={!solvenciaAseo?.solvente}
                className="w-full py-2.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-all shadow-md"
              >
                {!solvenciaAseo?.solvente ? 'Inhabilitado por Deuda de Aseo' : 'Calcular Impuesto a Pagar'}
              </button>

              {calculo && (
                <div className="p-4 bg-sky-950/40 border border-sky-500/40 rounded-xl mt-3 text-center">
                  <p className="text-xs text-sky-300 font-semibold uppercase">Impuesto Estimado</p>
                  <p className="text-2xl font-black text-white mt-1">
                    Bs. {calculo.impuesto.toLocaleString('es-VE', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
