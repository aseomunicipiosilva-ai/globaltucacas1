'use client';
import React, { useState } from 'react';
import { Search, FileCheck, CheckCircle2, XCircle, Calculator, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function DecretosPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [inmuebles, setInmuebles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedInmueble, setSelectedInmueble] = useState<any>(null);
  const [evaluacionLoading, setEvaluacionLoading] = useState(false);
  const [evaluacionResult, setEvaluacionResult] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Simulador State
  const [cuotas, setCuotas] = useState(1);
  const [pagoInicial, setPagoInicial] = useState(0);

  const searchInmuebles = async () => {
    if (!searchTerm) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('inmuebles')
        .select('*')
        .or(`identidad.ilike.%${searchTerm}%,contribuyente.ilike.%${searchTerm}%`)
        .limit(20);
        
      if (error) throw error;
      setInmuebles(data || []);
    } catch (e: any) {
      alert("Error buscando usuarios: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const openEvaluador = async (inmueble: any) => {
    setSelectedInmueble(inmueble);
    setModalOpen(true);
    setEvaluacionLoading(true);
    setEvaluacionResult(null);
    setErrorMsg('');

    try {
      const res = await fetch('/api/decretos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          inmueble_id: inmueble.id, 
          identidad: inmueble.identidad,
          sector: (() => {
            const name = (inmueble.contribuyente || '').toUpperCase();
            const cls = (inmueble.clasificacion || '').toUpperCase();
            if (name.includes('CONDOMINIO') || name.includes('RESIDENCIAS') || name.includes('CONJUNTO') || cls.includes('TIPO C')) return 'CONDOMINIO';
            if (cls.includes('RESIDENCIAL')) return 'RESIDENCIAL';
            if (cls.includes('INFORMAL') || cls.includes('AMBULANTE')) return 'INFORMAL';
            return 'COMERCIAL';
          })()
        })
      });

      const result = await res.json();
      
      if (!res.ok) {
        throw new Error(result.error || 'Error desconocido del servidor');
      }

      setEvaluacionResult(result);

      if (result.eligible && result.detalles) {
        // Inicializar pagos mínimos
        const minPorcentaje = result.detalles.porcentaje_inicial_minimo / 100;
        setPagoInicial(result.detalles.montoTotalTcmdvm * minPorcentaje);
        setCuotas(1);
      }
      
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setEvaluacionLoading(false);
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedInmueble(null);
    setEvaluacionResult(null);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-3 border-b pb-4">
        <div className="bg-emerald-100 p-3 rounded-lg">
          <FileCheck className="w-6 h-6 text-emerald-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Decretos y Convenios</h1>
          <p className="text-sm text-slate-500">Activación de beneficios y Reliquidación 2026</p>
        </div>
      </div>

      {/* Buscador */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar por Nombre o RIF/Cédula..." 
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchInmuebles()}
            />
          </div>
          <button 
            onClick={searchInmuebles}
            disabled={loading}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            {loading ? 'Buscando...' : 'Buscar'}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-500 font-medium">
              <tr>
                <th className="px-6 py-3 border-b">RIF / Cédula</th>
                <th className="px-6 py-3 border-b">Contribuyente</th>
                <th className="px-6 py-3 border-b">Clasificación</th>
                <th className="px-6 py-3 border-b text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {inmuebles.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                    No se encontraron resultados.
                  </td>
                </tr>
              ) : (
                inmuebles.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-medium text-slate-800">{c.identidad}</td>
                    <td className="px-6 py-4">{c.contribuyente}</td>
                    <td className="px-6 py-4 capitalize">{c.clasificacion || 'COMERCIAL'}</td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => openEvaluador(c)}
                        className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-medium bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors"
                      >
                        <Calculator className="w-3.5 h-3.5" />
                        Evaluar Decreto
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Evaluación */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h2 className="text-lg font-bold text-slate-800">Evaluación de Convenio</h2>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              {evaluacionLoading ? (
                <div className="text-center py-10">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto mb-4"></div>
                  <p className="text-slate-500">Consultando facturas y calculando reliquidación...</p>
                </div>
              ) : errorMsg ? (
                <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-start gap-3">
                  <XCircle className="w-5 h-5 mt-0.5" />
                  <div>
                    <h3 className="font-semibold">Error al evaluar</h3>
                    <p className="text-sm">{errorMsg}</p>
                  </div>
                </div>
              ) : evaluacionResult && !evaluacionResult.eligible ? (
                <div className="bg-amber-50 text-amber-700 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">Contribuyente NO Elegible</h3>
                  <p className="text-sm">{evaluacionResult.mensaje}</p>
                  <p className="text-sm font-medium mt-2">Meses de morosidad detectados: {evaluacionResult.mesesMorosidad}</p>
                </div>
              ) : evaluacionResult && evaluacionResult.detalles ? (
                <div className="space-y-6">
                  {/* Info Aprobada */}
                  <div className="bg-emerald-50 text-emerald-800 p-4 rounded-lg border border-emerald-200">
                    <div className="flex items-center gap-2 font-semibold mb-2">
                      <CheckCircle2 className="w-5 h-5" />
                      Elegible para {evaluacionResult.decreto}
                    </div>
                    <p className="text-sm text-emerald-600">{evaluacionResult.mensaje}</p>
                  </div>

                  {/* Resumen Deuda Original vs Reliquidada */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="border rounded-lg p-4 bg-slate-50">
                      <h4 className="text-xs font-semibold text-slate-400 uppercase mb-3">Deuda Original Acumulada</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Capital:</span>
                          <span className="font-medium text-slate-700">{evaluacionResult.detalles.capitalOriginal.toFixed(2)} Bs</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Mora/Multas:</span>
                          <span className="font-medium text-slate-700">{evaluacionResult.detalles.accesoriosOriginal.toFixed(2)} Bs</span>
                        </div>
                        <div className="pt-2 mt-2 border-t flex justify-between font-bold">
                          <span className="text-slate-700">Total Original:</span>
                          <span className="text-slate-900">{(evaluacionResult.detalles.capitalOriginal + evaluacionResult.detalles.accesoriosOriginal).toFixed(2)} Bs</span>
                        </div>
                      </div>
                    </div>

                    <div className="border rounded-lg p-4 bg-indigo-50 border-indigo-100">
                      <h4 className="text-xs font-semibold text-indigo-400 uppercase mb-3">Saldo Reliquidado (Decreto)</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-indigo-600">Nuevo Capital:</span>
                          <span className="font-medium text-indigo-900">{evaluacionResult.detalles.nuevoCapitalPagar.toFixed(2)} Bs</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-indigo-600">Nuevos Accesorios:</span>
                          <span className="font-medium text-indigo-900">{evaluacionResult.detalles.nuevosAccesoriosPagar.toFixed(2)} Bs</span>
                        </div>
                        <div className="pt-2 mt-2 border-t border-indigo-200 flex justify-between font-bold text-lg">
                          <span className="text-indigo-700">TCMDVM (BCV):</span>
                          <span className="text-indigo-900">{evaluacionResult.detalles.montoTotalTcmdvm.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Simulador de Convenio */}
                  <div className="border rounded-lg p-4">
                    <h3 className="font-bold text-slate-700 mb-4">Parámetros del Convenio</h3>
                    
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-slate-600 mb-1">
                          Pago Inicial (TCMDVM)
                        </label>
                        <input 
                          type="number"
                          className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-emerald-500"
                          value={pagoInicial.toFixed(2)}
                          onChange={(e) => setPagoInicial(Number(e.target.value))}
                          min={evaluacionResult.detalles.montoTotalTcmdvm * (evaluacionResult.detalles.porcentaje_inicial_minimo / 100)}
                          max={evaluacionResult.detalles.montoTotalTcmdvm}
                          step="0.01"
                        />
                        <p className="text-xs text-slate-400 mt-1">Mínimo requerido: {evaluacionResult.detalles.porcentaje_inicial_minimo}%</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-600 mb-1">
                          Número de Cuotas
                        </label>
                        <select 
                          className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-emerald-500"
                          value={cuotas}
                          onChange={(e) => setCuotas(Number(e.target.value))}
                        >
                          {Array.from({length: evaluacionResult.detalles.max_cuotas}, (_, i) => i + 1).map(num => (
                            <option key={num} value={num}>{num} {num === 1 ? 'Cuota' : 'Cuotas'}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Resumen Final de Cuota */}
                    <div className="mt-4 p-3 bg-slate-100 rounded text-center">
                      <p className="text-sm text-slate-500">Monto de cada cuota fraccionada</p>
                      <p className="text-2xl font-bold text-slate-800 mt-1">
                        {((evaluacionResult.detalles.montoTotalTcmdvm - pagoInicial) / cuotas).toFixed(2)} TCMDVM
                      </p>
                      <p className="text-xs text-slate-400 mt-1">Vencimiento: 1ros 5 días de cada mes</p>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Acciones */}
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
              <button 
                onClick={closeModal}
                className="px-4 py-2 rounded-lg font-medium text-slate-600 hover:bg-slate-200 transition-colors"
              >
                Cancelar
              </button>
              {evaluacionResult && evaluacionResult.eligible && (
                <button className="px-6 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors shadow-sm">
                  Procesar Convenio
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
