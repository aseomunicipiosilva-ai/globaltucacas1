'use client';
import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { ordenanzaData } from '@/data/ordenanza';
import { PlayCircle, ChevronDown, ChevronUp, Loader2, BarChart3 } from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const todasLasActividades = [
  ...ordenanzaData.actividadesComerciales,
  ...ordenanzaData.actividadesIndustriales,
];

function calcularFactorMensual(inm: any): number {
  const clasificacion = (inm.clasificacion || '').toLowerCase();
  if (clasificacion === 'residencial') {
    const tipo = ordenanzaData.tiposResidenciales.find((t: any) => t.label === inm.tipo_residencia);
    return tipo ? tipo.factor : 0;
  }
  const act = todasLasActividades.find((a: any) => a.label === inm.actividad_principal);
  const nivelIndex = ordenanzaData.nivelesMetraje.indexOf(inm.nivel_metraje || '');
  if (act && nivelIndex !== -1) return (act as any).factores[nivelIndex];
  return 0;
}

export default function ActualizacionDeudasPage() {
  const [tcmmv, setTcmmv] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [analisis, setAnalisis] = useState<any[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [resultado, setResultado] = useState<string>('');
  const [filtro, setFiltro] = useState<'todos' | 'con_deuda' | 'sin_tarifa'>('con_deuda');

  useEffect(() => {
    fetch('/api/bcv?t=' + Date.now(), { cache: 'no-store' })
      .then(r => r.json())
      .then(d => { if (d?.tcmmv > 0) setTcmmv(d.tcmmv); })
      .catch(() => {});
  }, []);

  const fmt = (n: number) => n.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const ejecutarAnalisis = async () => {
    setLoading(true);
    setAnalisis([]);
    setResultado('');
    try {
      const { data: inms, error } = await supabase
        .from('inmuebles')
        .select('id, identidad, contribuyente, clasificacion, actividad_principal, tipo_residencia, nivel_metraje, deuda_mmv, deuda_congelada_bs')
        .neq('estado', 'Eliminado')
        .order('contribuyente');
      if (error) throw error;
      const res = (inms || []).map((inm: any) => {
        const deudaMMV = parseFloat(inm.deuda_mmv || 0);
        const factor = calcularFactorMensual(inm);
        const meses = factor > 0 ? Math.round(deudaMMV / factor) : 0;
        return { ...inm, deuda_mmv: deudaMMV, deuda_congelada_bs: parseFloat(inm.deuda_congelada_bs || 0), factorMensual: factor, mesesAdeudados: meses, estadoCalc: factor === 0 ? 'sin_tarifa' : deudaMMV <= 0 ? 'solvente' : 'ok' };
      });
      setAnalisis(res);
    } catch (e: any) {
      setResultado('Error: ' + e.message);
    }
    setLoading(false);
  };

  const filtrados = analisis.filter(i => filtro === 'con_deuda' ? i.deuda_mmv > 0 : filtro === 'sin_tarifa' ? i.estadoCalc === 'sin_tarifa' && i.deuda_mmv > 0 : true);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="bg-gradient-to-r from-indigo-900 to-indigo-700 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <BarChart3 size={28} />
          <h1 className="text-2xl font-black">Análisis de Meses Adeudados</h1>
        </div>
        <p className="text-indigo-200 text-sm">Fórmula: <strong className="text-white">Meses Adeudados = Deuda en MMV ÷ Factor Mensual MMV</strong></p>
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <span className="text-indigo-300 text-xs">TCMMV activo:</span>
          <span className="bg-indigo-600 px-2 py-0.5 rounded font-bold text-sm">{tcmmv > 0 ? `Bs. ${fmt(tcmmv)}` : 'No disponible'}</span>
          {tcmmv === 0 && <input type="number" placeholder="Ingresa TCMMV" className="ml-2 px-2 py-1 rounded text-slate-800 text-xs w-40" onChange={e => setTcmmv(parseFloat(e.target.value) || 0)} />}
        </div>
      </div>

      <div className="bg-white rounded-xl border p-4 flex flex-wrap gap-4 items-center justify-between">
        <button onClick={ejecutarAnalisis} disabled={loading} className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-bold rounded-lg text-sm">
          {loading ? <Loader2 size={16} className="animate-spin" /> : <PlayCircle size={16} />}
          {loading ? 'Analizando...' : '▶ Ejecutar Análisis Completo'}
        </button>
        {analisis.length > 0 && (
          <div className="flex gap-2">
            {(['todos','con_deuda','sin_tarifa'] as const).map(f => (
              <button key={f} onClick={() => setFiltro(f)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${filtro===f?'bg-indigo-600 text-white border-indigo-600':'bg-white text-slate-600 border-slate-300'}`}>
                {f==='todos'?'Todos':f==='con_deuda'?'Con Deuda':'Sin Tarifa'}
              </button>
            ))}
          </div>
        )}
      </div>

      {resultado && <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-800 text-sm">{resultado}</div>}

      {analisis.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {l:'Total Analizados',v:analisis.length,c:'indigo'},
            {l:'Con Deuda',v:analisis.filter(i=>i.deuda_mmv>0).length,c:'red'},
            {l:'Solventes',v:analisis.filter(i=>i.deuda_mmv<=0).length,c:'green'},
            {l:'Sin Tarifa Asignada',v:analisis.filter(i=>i.estadoCalc==='sin_tarifa'&&i.deuda_mmv>0).length,c:'amber'},
          ].map(({l,v,c})=>(
            <div key={l} className="bg-white rounded-xl border p-4 shadow-sm">
              <p className="text-[11px] font-semibold text-slate-500 mb-1 uppercase">{l}</p>
              <p className={`text-3xl font-black text-${c}-700`}>{v}</p>
            </div>
          ))}
        </div>
      )}

      {analisis.length > 0 && (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="bg-slate-50 px-4 py-3 border-b flex items-center justify-between">
            <h2 className="font-bold text-slate-700 text-sm">{filtrados.length} inmuebles — Meses acumulados: <span className="text-indigo-700 font-black">{filtrados.reduce((s,i)=>s+i.mesesAdeudados,0)}</span></h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 text-slate-600 text-[11px] uppercase font-semibold">
                <tr>
                  <th className="px-4 py-2 text-left">Contribuyente</th>
                  <th className="px-4 py-2 text-left">RIF/CI</th>
                  <th className="px-4 py-2 text-left">Clasificación</th>
                  <th className="px-4 py-2 text-right">Factor (MMV/mes)</th>
                  <th className="px-4 py-2 text-right">Tarifa Bs/mes</th>
                  <th className="px-4 py-2 text-right">Deuda MMV</th>
                  <th className="px-4 py-2 text-right text-indigo-700">Meses Adeudados</th>
                  <th className="px-4 py-2 text-center">Estado</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((inm)=>(
                  <React.Fragment key={inm.id}>
                    <tr className={`border-b border-slate-100 hover:bg-indigo-50/20 cursor-pointer ${expandedId===inm.id?'bg-indigo-50':''}`} onClick={()=>setExpandedId(expandedId===inm.id?null:inm.id)}>
                      <td className="px-4 py-2.5 font-medium text-slate-800 text-xs flex items-center gap-1">
                        {expandedId===inm.id?<ChevronUp size={11}/>:<ChevronDown size={11}/>} {inm.contribuyente}
                      </td>
                      <td className="px-4 py-2.5 text-slate-500 text-xs">{inm.identidad}</td>
                      <td className="px-4 py-2.5 text-slate-600 text-xs">{inm.clasificacion}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-xs">{inm.factorMensual>0?fmt(inm.factorMensual):'—'}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-xs">{inm.factorMensual>0&&tcmmv>0?`Bs. ${fmt(inm.factorMensual*tcmmv)}`:'—'}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-xs font-bold text-red-700">{inm.deuda_mmv>0?fmt(inm.deuda_mmv):'—'}</td>
                      <td className="px-4 py-2.5 text-right">
                        <span className={`font-black text-xl ${inm.mesesAdeudados>=12?'text-red-700':inm.mesesAdeudados>=6?'text-orange-600':inm.mesesAdeudados>0?'text-amber-600':'text-emerald-600'}`}>
                          {inm.mesesAdeudados>0?inm.mesesAdeudados:'✓'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        {inm.estadoCalc==='sin_tarifa'&&<span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-[10px] font-bold">Sin Tarifa</span>}
                        {inm.estadoCalc==='solvente'&&<span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-[10px] font-bold">Solvente</span>}
                        {inm.estadoCalc==='ok'&&<span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${inm.mesesAdeudados>=12?'bg-red-100 text-red-700':'bg-orange-100 text-orange-700'}`}>{inm.mesesAdeudados}m pendientes</span>}
                      </td>
                    </tr>
                    {expandedId===inm.id&&(
                      <tr className="bg-indigo-50/60">
                        <td colSpan={8} className="px-6 py-4">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs mb-3">
                            <div><span className="font-semibold text-slate-500 block">Actividad / Tipo</span><span className="text-slate-800">{inm.clasificacion==='Residencial'?inm.tipo_residencia:inm.actividad_principal}</span></div>
                            <div><span className="font-semibold text-slate-500 block">Nivel Metraje</span><span className="text-slate-800">{inm.nivel_metraje}</span></div>
                            <div><span className="font-semibold text-slate-500 block">Factor MMV/mes</span><span className="text-indigo-700 font-black text-lg">{inm.factorMensual||'N/A'}</span></div>
                            <div><span className="font-semibold text-slate-500 block">Deuda Congelada Bs</span><span className="text-red-600 font-bold">Bs. {fmt(inm.deuda_congelada_bs)}</span></div>
                          </div>
                          {inm.factorMensual>0&&(
                            <div className="bg-white border border-indigo-200 rounded-lg p-3">
                              <span className="font-bold text-indigo-800 block mb-1">📐 Fórmula aplicada:</span>
                              <span className="font-mono text-indigo-700 text-sm">{fmt(inm.deuda_mmv)} MMV ÷ {inm.factorMensual} MMV/mes = <strong className="text-indigo-900 text-base">{inm.mesesAdeudados} meses</strong></span>
                              {tcmmv>0&&<span className="text-slate-500 block mt-1 text-xs">En Bs: Bs.{fmt(inm.deuda_mmv*tcmmv)} ÷ Bs.{fmt(inm.factorMensual*tcmmv)}/mes = <strong>{inm.mesesAdeudados} meses</strong></span>}
                            </div>
                          )}
                          {inm.estadoCalc==='sin_tarifa'&&(
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-2">
                              <span className="text-amber-800 font-bold text-xs">⚠️ Sin tarifa: Verificar Clasificación + {inm.clasificacion==='Residencial'?'Tipo de Residencia':'Actividad Principal y Nivel de Metraje'} en el perfil del contribuyente.</span>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
