'use client';
import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { PlayCircle, Loader2, BarChart3, ChevronDown, ChevronUp, FileText, CheckSquare, Square, RefreshCw, AlertCircle, Building2, User } from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const MESES = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];

function generarMesesAtrasados(n: number): { label: string; mes: number; anio: number; emision: string }[] {
  const hoy = new Date();
  const result = [];
  for (let i = n; i >= 1; i--) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
    result.push({
      label: `${MESES[d.getMonth()]} ${d.getFullYear()}`,
      mes: d.getMonth() + 1,
      anio: d.getFullYear(),
      emision: d.toISOString().split('T')[0],
    });
  }
  return result;
}

interface ContribGroup {
  identidad: string;
  contribuyente: string;
  codCont: string;
  rows: any[];              // todos los rows de inmuebles para este contribuyente
  totalMmvMes: number;      // suma de mmv_mes de todos los rows
  totalDeudaMMV: number;    // suma de deuda_mmv de todos los rows
  mesesAdeudados: number;
  mesesDetalle: ReturnType<typeof generarMesesAtrasados>;
  isCondominio: boolean;
  unidades: number;
}

export default function HerramientasPage() {
  const [tcmmv, setTcmmv] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [grupos, setGrupos] = useState<ContribGroup[]>([]);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [seleccionados, setSeleccionados] = useState<Record<string, Set<number>>>({});
  const [msg, setMsg] = useState('');
  const [filtro, setFiltro] = useState<'con_deuda' | 'todos'>('con_deuda');

  useEffect(() => {
    fetch('/api/bcv?t=' + Date.now(), { cache: 'no-store' })
      .then(r => r.json()).then(d => { if (d?.tcmmv > 0) setTcmmv(d.tcmmv); }).catch(() => {});
  }, []);

  const fmt = (n: number) => n.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const cargarInmuebles = async () => {
    setLoading(true);
    setMsg('');
    setSeleccionados({});
    setGrupos([]);
    try {
      const { data, error } = await supabase
        .from('inmuebles')
        .select('id, identidad, contribuyente, cod_cont, clasificacion, actividad_principal, mmv_mes, deuda_mmv, deuda_congelada_bs, estado, inmueble')
        .neq('estado', 'Eliminado')
        .order('contribuyente');
      if (error) throw error;

      // Agrupar por identidad
      const mapa: Record<string, ContribGroup> = {};
      for (const row of (data || [])) {
        const key = (row.identidad || '').trim();
        if (!key) continue;
        if (!mapa[key]) {
          mapa[key] = {
            identidad: key,
            contribuyente: row.contribuyente || '---',
            codCont: row.cod_cont || '',
            rows: [],
            totalMmvMes: 0,
            totalDeudaMMV: 0,
            mesesAdeudados: 0,
            mesesDetalle: [],
            isCondominio: false,
            unidades: 0,
          };
        }
        mapa[key].rows.push(row);
        // Tarifa mensual = mmv_mes de CADA unidad (ya considera el factor × nivel)
        mapa[key].totalMmvMes += parseFloat(row.mmv_mes || 0);
        mapa[key].totalDeudaMMV += parseFloat(row.deuda_mmv || 0);
      }

      // Calcular meses y tipo para cada grupo
      const result: ContribGroup[] = Object.values(mapa).map(g => {
        const unidades = g.rows.length;
        const isCondominio = unidades > 1;
        const meses = g.totalMmvMes > 0 ? Math.round(g.totalDeudaMMV / g.totalMmvMes) : 0;
        return {
          ...g,
          isCondominio,
          unidades,
          mesesAdeudados: meses,
          mesesDetalle: meses > 0 ? generarMesesAtrasados(meses) : [],
        };
      });

      result.sort((a, b) => b.totalDeudaMMV - a.totalDeudaMMV);
      setGrupos(result);
    } catch (e: any) {
      setMsg('Error: ' + e.message);
    }
    setLoading(false);
  };

  const toggleMes = (key: string, idx: number) => {
    setSeleccionados(prev => {
      const set = new Set(prev[key] || []);
      set.has(idx) ? set.delete(idx) : set.add(idx);
      return { ...prev, [key]: set };
    });
  };

  const toggleTodos = (key: string, total: number) => {
    setSeleccionados(prev => {
      const set = prev[key] || new Set();
      const full = new Set(Array.from({ length: total }, (_, i) => i));
      return { ...prev, [key]: set.size === total ? new Set() : full };
    });
  };

  const generarFacturas = async (g: ContribGroup, idxs?: Set<number>) => {
    const sel = idxs || seleccionados[g.identidad] || new Set();
    if (sel.size === 0) { alert('Selecciona al menos un mes.'); return; }
    setSaving(true);
    setMsg('');
    try {
      const idLimpio = g.identidad.replace(/[^a-zA-Z0-9]/g, '');
      const montoPorMes = (g.totalMmvMes * tcmmv).toFixed(2);
      const facturas = Array.from(sel).map(idx => {
        const m = g.mesesDetalle[idx];
        return {
          referencia: `CM-${idLimpio}-${String(m.mes).padStart(2, '0')}-${m.anio}`,
          contribuyente: g.contribuyente,
          identidad: g.identidad,
          monto: montoPorMes,
          monto_mmv: g.totalMmvMes.toString(),
          emision: m.emision,
          vencimiento: m.emision,
          estado: 'Pendiente',
          concepto: `Aseo Urbano - ${m.label}${g.isCondominio ? ` (${g.unidades} unidades)` : ''}`,
        };
      });

      // Intentar upsert; si falla por constraint, hacer insert ignorando duplicados
      const { error } = await supabase.from('facturas')
        .upsert(facturas, { onConflict: 'referencia', ignoreDuplicates: true });

      if (error) {
        // Fallback: insertar uno a uno ignorando duplicados
        let insertados = 0;
        for (const f of facturas) {
          const { error: e2 } = await supabase.from('facturas').insert([f]);
          if (!e2) insertados++;
        }
        setMsg(`✅ Se generaron ${insertados} facturas para ${g.contribuyente} (${facturas.length - insertados} ya existían).`);
      } else {
        setMsg(`✅ ${facturas.length} facturas generadas para ${g.contribuyente}. Aparecen en Caja / Pagos.`);
      }
      setSeleccionados(prev => ({ ...prev, [g.identidad]: new Set() }));
    } catch (e: any) {
      setMsg('Error: ' + e.message);
    }
    setSaving(false);
  };

  const generarTodas = async () => {
    if (!confirm('¿Generar facturas mensuales individuales para TODOS los contribuyentes con deuda? Esta operación puede tardar varios minutos.')) return;
    setSaving(true);
    setMsg('Generando...');
    let total = 0;
    for (const g of grupos.filter(g => g.mesesAdeudados > 0 && g.totalMmvMes > 0)) {
      const allIdxs = new Set(Array.from({ length: g.mesesDetalle.length }, (_, i) => i));
      const idLimpio = g.identidad.replace(/[^a-zA-Z0-9]/g, '');
      const montoPorMes = (g.totalMmvMes * tcmmv).toFixed(2);
      const facturas = g.mesesDetalle.map((m) => ({
        referencia: `CM-${idLimpio}-${String(m.mes).padStart(2, '0')}-${m.anio}`,
        contribuyente: g.contribuyente,
        identidad: g.identidad,
        monto: montoPorMes,
        monto_mmv: g.totalMmvMes.toString(),
        emision: m.emision,
        vencimiento: m.emision,
        estado: 'Pendiente',
        concepto: `Aseo Urbano - ${m.label}${g.isCondominio ? ` (${g.unidades} unidades)` : ''}`,
      }));
      if (facturas.length > 0) {
        await supabase.from('facturas').upsert(facturas, { onConflict: 'referencia', ignoreDuplicates: true });
        total += facturas.length;
      }
    }
    setMsg(`✅ Proceso completado. ${total} facturas generadas en total.`);
    setSaving(false);
  };

  const filtrados = grupos.filter(g => filtro === 'con_deuda' ? g.totalDeudaMMV > 0 : true);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="bg-gradient-to-r from-indigo-900 to-indigo-700 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <BarChart3 size={28} />
          <h1 className="text-2xl font-black">Desglose de Deuda por Mes</h1>
        </div>
        <p className="text-indigo-200 text-sm">
          Agrupa todos los inmuebles por contribuyente, suma las tarifas de cada unidad y calcula los meses adeudados.<br />
          <strong className="text-white">Condominios:</strong> Tarifa Total = Σ mmv_mes de todas las unidades × TCMMV · Meses = Deuda MMV ÷ Tarifa Mensual MMV
        </p>
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <span className="text-indigo-300 text-xs">TCMMV:</span>
          <span className="bg-indigo-600 px-2 py-0.5 rounded font-bold text-sm">{tcmmv > 0 ? `Bs. ${fmt(tcmmv)}` : 'No disponible'}</span>
          {tcmmv === 0 && <input type="number" placeholder="Ingresar TCMMV" className="ml-2 px-2 py-1 rounded text-slate-800 text-xs w-36" onChange={e => setTcmmv(parseFloat(e.target.value) || 0)} />}
        </div>
      </div>

      <div className="bg-white rounded-xl border p-4 flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-3 flex-wrap">
          <button onClick={cargarInmuebles} disabled={loading} className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-bold rounded-lg text-sm">
            {loading ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
            {loading ? 'Calculando...' : 'Cargar y Calcular'}
          </button>
          {grupos.length > 0 && (
            <button onClick={generarTodas} disabled={saving} className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold rounded-lg text-sm">
              {saving ? <Loader2 size={15} className="animate-spin" /> : <FileText size={15} />}
              Generar TODAS las Facturas
            </button>
          )}
        </div>
        {grupos.length > 0 && (
          <div className="flex gap-2">
            {(['con_deuda', 'todos'] as const).map(f => (
              <button key={f} onClick={() => setFiltro(f)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${filtro === f ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-300'}`}>
                {f === 'con_deuda' ? `📛 Con Deuda (${grupos.filter(g => g.totalDeudaMMV > 0).length})` : `🌐 Todos (${grupos.length})`}
              </button>
            ))}
          </div>
        )}
      </div>

      {grupos.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { l: 'Contribuyentes', v: grupos.length, c: 'indigo' },
            { l: 'Con Deuda', v: grupos.filter(g => g.totalDeudaMMV > 0).length, c: 'red' },
            { l: 'Condominios', v: grupos.filter(g => g.isCondominio).length, c: 'blue' },
            { l: 'Sin Tarifa', v: grupos.filter(g => g.totalMmvMes === 0 && g.totalDeudaMMV > 0).length, c: 'amber' },
          ].map(({ l, v, c }) => (
            <div key={l} className="bg-white rounded-xl border p-4 shadow-sm">
              <p className="text-[11px] font-semibold text-slate-500 mb-1 uppercase">{l}</p>
              <p className={`text-3xl font-black text-${c}-700`}>{v}</p>
            </div>
          ))}
        </div>
      )}

      {msg && (
        <div className={`rounded-xl p-4 text-sm font-medium border ${msg.startsWith('✅') ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
          {msg}
        </div>
      )}

      <div className="space-y-3">
        {filtrados.map((g) => {
          const sel = seleccionados[g.identidad] || new Set();
          const isOpen = expandedKey === g.identidad;
          const colorClass = g.mesesAdeudados >= 12 ? 'border-red-200' : g.mesesAdeudados >= 6 ? 'border-orange-200' : g.totalDeudaMMV > 0 ? 'border-amber-200' : 'border-slate-100';

          return (
            <div key={g.identidad} className={`bg-white rounded-xl border shadow-sm overflow-hidden ${colorClass}`}>
              <div
                className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => setExpandedKey(isOpen ? null : g.identidad)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {isOpen ? <ChevronUp size={16} className="text-slate-400 flex-shrink-0" /> : <ChevronDown size={16} className="text-slate-400 flex-shrink-0" />}
                  <div className="flex items-center gap-2 min-w-0">
                    {g.isCondominio
                      ? <Building2 size={14} className="text-blue-500 flex-shrink-0" />
                      : <User size={14} className="text-slate-400 flex-shrink-0" />}
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800 text-sm truncate">{g.contribuyente}</p>
                      <p className="text-xs text-slate-500">{g.identidad} · Cód: {g.codCont || '—'} {g.isCondominio && <span className="text-blue-600 font-semibold">· {g.unidades} unidades</span>}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 flex-shrink-0 ml-4">
                  {g.totalMmvMes > 0 ? (
                    <>
                      <div className="text-right hidden md:block">
                        <p className="text-[10px] text-slate-400 uppercase">Tarifa/mes</p>
                        <p className="text-xs font-bold text-slate-700">{fmt(g.totalMmvMes)} MMV</p>
                        {tcmmv > 0 && <p className="text-[10px] text-slate-500">Bs. {fmt(g.totalMmvMes * tcmmv)}</p>}
                      </div>
                      <div className="text-right hidden md:block">
                        <p className="text-[10px] text-slate-400 uppercase">Deuda Total</p>
                        <p className="text-xs font-bold text-red-600">{fmt(g.totalDeudaMMV)} MMV</p>
                        {tcmmv > 0 && <p className="text-[10px] text-slate-500">Bs. {fmt(g.totalDeudaMMV * tcmmv)}</p>}
                      </div>
                      <div className={`text-center rounded-lg px-3 py-1.5 min-w-[56px] ${g.mesesAdeudados >= 12 ? 'bg-red-100 text-red-700' : g.mesesAdeudados >= 6 ? 'bg-orange-100 text-orange-700' : g.mesesAdeudados > 0 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                        <p className="text-2xl font-black leading-none">{g.mesesAdeudados > 0 ? g.mesesAdeudados : '✓'}</p>
                        <p className="text-[10px] font-semibold">{g.mesesAdeudados > 0 ? 'meses' : 'solvente'}</p>
                      </div>
                    </>
                  ) : (
                    <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                      <AlertCircle size={11} /> Sin Tarifa
                    </span>
                  )}
                  {sel.size > 0 && (
                    <button onClick={e => { e.stopPropagation(); generarFacturas(g); }} disabled={saving}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg flex items-center gap-1">
                      <FileText size={11} /> Generar {sel.size}
                    </button>
                  )}
                </div>
              </div>

              {isOpen && g.mesesAdeudados > 0 && g.totalMmvMes > 0 && (
                <div className="border-t border-slate-100 px-4 py-4 bg-slate-50">
                  {/* Info de la fórmula */}
                  <div className="bg-white border border-indigo-100 rounded-lg p-3 mb-3 text-xs text-indigo-800">
                    <strong>Fórmula:</strong>{' '}
                    {g.isCondominio
                      ? `${g.unidades} unidades × tarifa individual = ${fmt(g.totalMmvMes)} MMV/mes`
                      : `Tarifa: ${fmt(g.totalMmvMes)} MMV/mes`}
                    {' · '}Deuda: {fmt(g.totalDeudaMMV)} MMV ÷ {fmt(g.totalMmvMes)} MMV/mes = <strong>{g.mesesAdeudados} meses</strong>
                  </div>

                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-bold text-slate-600 uppercase">Selecciona los meses a facturar:</p>
                    <button onClick={() => toggleTodos(g.identidad, g.mesesDetalle.length)} className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1">
                      {sel.size === g.mesesDetalle.length ? <CheckSquare size={13} /> : <Square size={13} />}
                      {sel.size === g.mesesDetalle.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                    {g.mesesDetalle.map((m, idx) => {
                      const isSel = sel.has(idx);
                      return (
                        <button key={idx} onClick={() => toggleMes(g.identidad, idx)}
                          className={`rounded-lg p-2.5 border-2 text-left transition-all ${isSel ? 'border-indigo-500 bg-indigo-50 shadow' : 'border-slate-200 bg-white hover:border-indigo-300'}`}>
                          <div className="flex justify-end mb-1">
                            {isSel ? <CheckSquare size={12} className="text-indigo-600" /> : <Square size={12} className="text-slate-300" />}
                          </div>
                          <p className={`text-[11px] font-bold leading-tight ${isSel ? 'text-indigo-800' : 'text-slate-700'}`}>{m.label}</p>
                          <p className={`text-[10px] mt-0.5 font-semibold ${isSel ? 'text-indigo-600' : 'text-slate-400'}`}>
                            {tcmmv > 0 ? `Bs. ${fmt(g.totalMmvMes * tcmmv)}` : `${fmt(g.totalMmvMes)} MMV`}
                          </p>
                        </button>
                      );
                    })}
                  </div>

                  {sel.size > 0 && (
                    <div className="mt-3 flex items-center justify-between bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-2">
                      <span className="text-sm text-indigo-700 font-medium">
                        {sel.size} mes{sel.size > 1 ? 'es' : ''} · Total: <strong>Bs. {fmt(sel.size * g.totalMmvMes * tcmmv)}</strong>
                      </span>
                      <button onClick={() => generarFacturas(g)} disabled={saving}
                        className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-bold text-xs rounded-lg flex items-center gap-1">
                        {saving ? <Loader2 size={12} className="animate-spin" /> : <FileText size={12} />}
                        Generar Facturas Seleccionadas
                      </button>
                    </div>
                  )}
                </div>
              )}

              {isOpen && g.mesesAdeudados === 0 && g.totalMmvMes > 0 && (
                <div className="border-t px-4 py-4 bg-green-50 text-center text-green-700 font-medium text-sm">✅ Solvente.</div>
              )}
              {isOpen && g.totalMmvMes === 0 && (
                <div className="border-t px-4 py-4 bg-amber-50 text-amber-800 text-xs">
                  ⚠️ Sin tarifa configurada (mmv_mes = 0 en todos los inmuebles de este contribuyente). Verificar en el perfil que tenga Clasificación y Tipo/Actividad asignados.
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
