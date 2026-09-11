'use client';
import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { ordenanzaData } from '@/data/ordenanza';
import { PlayCircle, Loader2, BarChart3, ChevronDown, ChevronUp, FileText, CheckSquare, Square, RefreshCw, AlertCircle } from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const todasLasActividades = [
  ...ordenanzaData.actividadesComerciales,
  ...ordenanzaData.actividadesIndustriales,
];

const MESES = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];

function calcularFactorMensual(inm: any): number {
  const cl = (inm.clasificacion || '').toLowerCase();
  // Para Residencial: actividad_principal guarda el tipo de residencia (Tipo I, Tipo II, etc.)
  if (cl === 'residencial') {
    const t = ordenanzaData.tiposResidenciales.find((t: any) => t.label === inm.actividad_principal);
    return t ? (t as any).factor : 0;
  }
  // Para Comercial/Industrial: actividad_principal = actividad, nivel_metraje = nivel
  const act = todasLasActividades.find((a: any) => a.label === inm.actividad_principal);
  const ni = ordenanzaData.nivelesMetraje.indexOf(inm.nivel_metraje || '');
  if (act && ni !== -1) return (act as any).factores[ni];
  return 0;
}

function generarMesesAtrasados(n: number): { label: string; mes: number; anio: number; emision: string }[] {
  const hoy = new Date();
  const result = [];
  for (let i = 1; i <= n; i++) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
    result.push({
      label: `${MESES[d.getMonth()]} ${d.getFullYear()}`,
      mes: d.getMonth() + 1,
      anio: d.getFullYear(),
      emision: d.toISOString().split('T')[0],
    });
  }
  return result.reverse();
}

export default function HerramientasPage() {
  const [tcmmv, setTcmmv] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [inmuebles, setInmuebles] = useState<any[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [seleccionados, setSeleccionados] = useState<Record<number, Set<number>>>({});
  const [msg, setMsg] = useState('');
  const [filtro, setFiltro] = useState<'con_deuda'|'todos'>('con_deuda');

  useEffect(() => {
    fetch('/api/bcv?t=' + Date.now(), { cache: 'no-store' })
      .then(r => r.json()).then(d => { if (d?.tcmmv > 0) setTcmmv(d.tcmmv); }).catch(() => {});
  }, []);

  const fmt = (n: number) => n.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const cargarInmuebles = async () => {
    setLoading(true);
    setMsg('');
    setSeleccionados({});
    try {
      const { data, error } = await supabase
        .from('inmuebles')
        .select('id, identidad, contribuyente, clasificacion, actividad_principal, nivel_metraje, deuda_mmv, deuda_congelada_bs, estado')
        .neq('estado', 'Eliminado')
        .order('contribuyente');
      if (error) throw error;

      const procesados = (data || []).map((inm: any) => {
        const deudaMMV = parseFloat(inm.deuda_mmv || 0);
        const factor = calcularFactorMensual(inm);
        const meses = factor > 0 ? Math.round(deudaMMV / factor) : 0;
        const montoPorMes = factor > 0 ? factor : 0;
        const mesesDetalle = meses > 0 ? generarMesesAtrasados(meses) : [];
        return { ...inm, deudaMMV, factor, meses, montoPorMes, mesesDetalle };
      });

      setInmuebles(procesados);
    } catch (e: any) {
      setMsg('Error: ' + e.message);
    }
    setLoading(false);
  };

  const toggleMes = (inmId: number, mesIdx: number) => {
    setSeleccionados(prev => {
      const set = new Set(prev[inmId] || []);
      set.has(mesIdx) ? set.delete(mesIdx) : set.add(mesIdx);
      return { ...prev, [inmId]: set };
    });
  };

  const toggleTodosMeses = (inmId: number, total: number) => {
    setSeleccionados(prev => {
      const set = prev[inmId] || new Set();
      if (set.size === total) {
        return { ...prev, [inmId]: new Set() };
      }
      return { ...prev, [inmId]: new Set(Array.from({length: total}, (_, i) => i)) };
    });
  };

  const generarFacturasSeleccionadas = async (inm: any) => {
    const sel = seleccionados[inm.id];
    if (!sel || sel.size === 0) { alert('Selecciona al menos un mes.'); return; }
    setSaving(true);
    setMsg('');
    try {
      // Verificar cuales ya existen (por referencia CM-{identidad}-{mes}-{año})
      const facturas = Array.from(sel).map(idx => {
        const m = inm.mesesDetalle[idx];
        return {
          referencia: `CM-${(inm.identidad || '').replace(/[^a-zA-Z0-9]/g,'')}-${String(m.mes).padStart(2,'0')}-${m.anio}`,
          contribuyente: inm.contribuyente,
          identidad: inm.identidad,
          monto: (inm.montoPorMes * tcmmv).toFixed(2),
          monto_mmv: inm.montoPorMes.toString(),
          emision: m.emision,
          vencimiento: m.emision,
          estado: 'Pendiente',
          concepto: `Aseo Urbano - ${m.label}`,
        };
      });

      // Upsert para no duplicar (basado en referencia unica)
      const { error } = await supabase.from('facturas').upsert(facturas, { onConflict: 'referencia', ignoreDuplicates: true });
      if (error) throw error;

      setMsg(`✅ Se generaron ${facturas.length} facturas para ${inm.contribuyente}. Ya aparecen en Caja/Pagos para selección individual.`);
      setSeleccionados(prev => ({ ...prev, [inm.id]: new Set() }));
    } catch (e: any) {
      setMsg('Error: ' + e.message);
    }
    setSaving(false);
  };

  const generarTodasPendientes = async () => {
    if (!confirm('¿Generar facturas individuales por mes para TODOS los inmuebles con deuda? Esta acción puede tardar varios minutos.')) return;
    setSaving(true);
    setMsg('Generando...');
    let total = 0;
    for (const inm of inmuebles.filter(i => i.meses > 0)) {
      const facturas = inm.mesesDetalle.map((m: any, idx: number) => ({
        referencia: `CM-${(inm.identidad || '').replace(/[^a-zA-Z0-9]/g,'')}-${String(m.mes).padStart(2,'0')}-${m.anio}`,
        contribuyente: inm.contribuyente,
        identidad: inm.identidad,
        monto: (inm.montoPorMes * tcmmv).toFixed(2),
        monto_mmv: inm.montoPorMes.toString(),
        emision: m.emision,
        vencimiento: m.emision,
        estado: 'Pendiente',
        concepto: `Aseo Urbano - ${m.label}`,
      }));
      if (facturas.length > 0) {
        await supabase.from('facturas').upsert(facturas, { onConflict: 'referencia', ignoreDuplicates: true });
        total += facturas.length;
      }
    }
    setMsg(`✅ Proceso completado. Se generaron ${total} facturas para todos los contribuyentes con deuda.`);
    setSaving(false);
  };

  const filtrados = inmuebles.filter(i => filtro === 'con_deuda' ? i.deudaMMV > 0 : true);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="bg-gradient-to-r from-indigo-900 to-indigo-700 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <BarChart3 size={28} />
          <h1 className="text-2xl font-black">Desglose de Deudas por Mes</h1>
        </div>
        <p className="text-indigo-200 text-sm">
          Divide la deuda total de cada contribuyente en facturas individuales por cada mes que adeuda.<br/>
          Las facturas generadas aparecen en <strong className="text-white">Caja / Pagos</strong> para que el cajero seleccione cuáles meses cobrar.
        </p>
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <span className="text-indigo-300 text-xs">TCMMV:</span>
          <span className="bg-indigo-600 px-2 py-0.5 rounded font-bold text-sm">{tcmmv > 0 ? `Bs. ${fmt(tcmmv)}` : 'No disponible'}</span>
          {tcmmv === 0 && <input type="number" placeholder="Ingresa TCMMV" className="ml-2 px-2 py-1 rounded text-slate-800 text-xs w-36" onChange={e => setTcmmv(parseFloat(e.target.value)||0)} />}
        </div>
      </div>

      <div className="bg-white rounded-xl border p-4 flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-3">
          <button onClick={cargarInmuebles} disabled={loading} className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-bold rounded-lg text-sm">
            {loading ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
            {loading ? 'Calculando...' : 'Cargar y Calcular'}
          </button>
          {inmuebles.length > 0 && (
            <button onClick={generarTodasPendientes} disabled={saving} className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold rounded-lg text-sm">
              {saving ? <Loader2 size={15} className="animate-spin" /> : <FileText size={15} />}
              Generar TODAS las Facturas
            </button>
          )}
        </div>
        {inmuebles.length > 0 && (
          <div className="flex gap-2">
            {(['con_deuda','todos'] as const).map(f => (
              <button key={f} onClick={() => setFiltro(f)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${filtro===f?'bg-indigo-600 text-white border-indigo-600':'bg-white text-slate-600 border-slate-300'}`}>
                {f === 'con_deuda' ? `📛 Con Deuda (${inmuebles.filter(i=>i.deudaMMV>0).length})` : `🌐 Todos (${inmuebles.length})`}
              </button>
            ))}
          </div>
        )}
      </div>

      {msg && (
        <div className={`rounded-xl p-4 text-sm font-medium border ${msg.startsWith('✅') ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
          {msg}
        </div>
      )}

      {inmuebles.length > 0 && (
        <div className="space-y-3">
          {filtrados.map((inm) => {
            const sel = seleccionados[inm.id] || new Set();
            const isOpen = expandedId === inm.id;
            return (
              <div key={inm.id} className={`bg-white rounded-xl border shadow-sm overflow-hidden transition-all ${inm.deudaMMV > 0 ? 'border-orange-200' : 'border-slate-100'}`}>
                {/* Header del inmueble */}
                <div
                  className={`flex items-center justify-between px-4 py-3 cursor-pointer ${inm.deudaMMV > 0 ? 'hover:bg-orange-50' : 'hover:bg-slate-50'}`}
                  onClick={() => setExpandedId(isOpen ? null : inm.id)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {isOpen ? <ChevronUp size={16} className="text-slate-400 flex-shrink-0"/> : <ChevronDown size={16} className="text-slate-400 flex-shrink-0"/>}
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800 text-sm truncate">{inm.contribuyente}</p>
                      <p className="text-xs text-slate-500">{inm.identidad} · {inm.clasificacion}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0 ml-4">
                    {inm.factor > 0 ? (
                      <>
                        <div className="text-right">
                          <p className="text-[10px] text-slate-400 uppercase">Tarifa/mes</p>
                          <p className="text-xs font-bold text-slate-700">{inm.factor} MMV · Bs.{fmt(inm.factor*tcmmv)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-slate-400 uppercase">Deuda Total</p>
                          <p className="text-xs font-bold text-red-600">{fmt(inm.deudaMMV)} MMV</p>
                        </div>
                        <div className={`text-center rounded-lg px-3 py-1.5 ${inm.meses >= 12 ? 'bg-red-100 text-red-700' : inm.meses >= 6 ? 'bg-orange-100 text-orange-700' : inm.meses > 0 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                          <p className="text-2xl font-black leading-none">{inm.meses > 0 ? inm.meses : '✓'}</p>
                          <p className="text-[10px] font-semibold">{inm.meses > 0 ? 'meses' : 'solvente'}</p>
                        </div>
                      </>
                    ) : (
                      <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                        <AlertCircle size={11}/> Sin Tarifa
                      </span>
                    )}
                    {sel.size > 0 && (
                      <button
                        onClick={e => { e.stopPropagation(); generarFacturasSeleccionadas(inm); }}
                        disabled={saving}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg flex items-center gap-1"
                      >
                        <FileText size={11}/> Generar {sel.size} factura{sel.size > 1 ? 's' : ''}
                      </button>
                    )}
                  </div>
                </div>

                {/* Detalle: meses seleccionables */}
                {isOpen && inm.meses > 0 && (
                  <div className="border-t border-slate-100 px-4 py-4 bg-slate-50">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-bold text-slate-600 uppercase">Meses adeudados — selecciona los que deseas generar como factura:</p>
                      <button
                        onClick={() => toggleTodosMeses(inm.id, inm.mesesDetalle.length)}
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
                      >
                        {sel.size === inm.mesesDetalle.length ? <CheckSquare size={13}/> : <Square size={13}/>}
                        {sel.size === inm.mesesDetalle.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
                      </button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                      {inm.mesesDetalle.map((m: any, idx: number) => {
                        const isSel = sel.has(idx);
                        return (
                          <button
                            key={idx}
                            onClick={() => toggleMes(inm.id, idx)}
                            className={`rounded-lg p-2.5 border-2 text-left transition-all cursor-pointer ${
                              isSel
                                ? 'border-indigo-500 bg-indigo-50 shadow-md'
                                : 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/30'
                            }`}
                          >
                            <div className="flex items-start justify-between mb-1">
                              {isSel
                                ? <CheckSquare size={13} className="text-indigo-600 flex-shrink-0 mt-0.5"/>
                                : <Square size={13} className="text-slate-300 flex-shrink-0 mt-0.5"/>
                              }
                            </div>
                            <p className={`text-[11px] font-bold leading-tight ${isSel ? 'text-indigo-800' : 'text-slate-700'}`}>{m.label}</p>
                            <p className={`text-[10px] font-semibold mt-0.5 ${isSel ? 'text-indigo-600' : 'text-slate-400'}`}>
                              Bs. {fmt(inm.montoPorMes * tcmmv)}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                    {sel.size > 0 && (
                      <div className="mt-3 flex items-center justify-between bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-2">
                        <span className="text-sm text-indigo-700 font-medium">
                          {sel.size} mes{sel.size > 1 ? 'es' : ''} seleccionado{sel.size > 1 ? 's' : ''} · Total: <strong>Bs. {fmt(sel.size * inm.montoPorMes * tcmmv)}</strong>
                        </span>
                        <button
                          onClick={() => generarFacturasSeleccionadas(inm)}
                          disabled={saving}
                          className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-bold text-xs rounded-lg flex items-center gap-1"
                        >
                          {saving ? <Loader2 size={12} className="animate-spin"/> : <FileText size={12}/>}
                          Generar Facturas Seleccionadas
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {isOpen && inm.meses === 0 && inm.factor > 0 && (
                  <div className="border-t border-slate-100 px-4 py-4 bg-green-50 text-center text-green-700 font-medium text-sm">
                    ✅ Este contribuyente está solvente.
                  </div>
                )}
                {isOpen && inm.factor === 0 && (
                  <div className="border-t border-slate-100 px-4 py-4 bg-amber-50 text-amber-800 text-xs">
                    ⚠️ Sin tarifa configurada. Verificar en el perfil: Clasificación + {inm.clasificacion === 'Residencial' ? 'Tipo de Residencia' : 'Actividad Principal y Nivel de Metraje'}.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}


