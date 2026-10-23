import React, { useState, useEffect } from 'react';
import { Calculator, X, AlertCircle, Calendar, CheckSquare, Layers, Check } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { useAppContext } from '@/store/AppContext';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const MESES_NOMBRES = [
  { num: '01', nombre: 'Enero', corto: 'ENE' },
  { num: '02', nombre: 'Febrero', corto: 'FEB' },
  { num: '03', nombre: 'Marzo', corto: 'MAR' },
  { num: '04', nombre: 'Abril', corto: 'ABR' },
  { num: '05', nombre: 'Mayo', corto: 'MAY' },
  { num: '06', nombre: 'Junio', corto: 'JUN' },
  { num: '07', nombre: 'Julio', corto: 'JUL' },
  { num: '08', nombre: 'Agosto', corto: 'AGO' },
  { num: '09', nombre: 'Septiembre', corto: 'SEP' },
  { num: '10', nombre: 'Octubre', corto: 'OCT' },
  { num: '11', nombre: 'Noviembre', corto: 'NOV' },
  { num: '12', nombre: 'Diciembre', corto: 'DIC' }
];

export function DebtAdjustmentModal({ row, inmuebles, tcmmv, recibos, setFacturas, onClose, addAuditLog }: any) {
  const { ordenanzasConfig: ordenanzaData } = useAppContext();
  const [modo, setModo] = useState<'periodo' | 'especifico'>('periodo');
  const [debtMonths, setDebtMonths] = useState(1);
  const [anioSeleccionado, setAnioSeleccionado] = useState(2026);
  const [mesesSeleccionados, setMesesSeleccionados] = useState<string[]>([]); // Array of 'YYYY-MM'
  const [reemplazarExistentes, setReemplazarExistentes] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [calculoDetalle, setCalculoDetalle] = useState<any>(null);
  const [dynamicTcmmv, setDynamicTcmmv] = useState<number>(tcmmv || 1);
  
  useEffect(() => {
    // Fetch fresh rate just in case AppContext has a stale one
    fetch(`/api/bcv?t=${Date.now()}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(data => {
        if (data.tcmmv) setDynamicTcmmv(data.tcmmv);
      })
      .catch(console.error);
      
    const calcView = async () => {
      try {
        let factorTotal = 0;
        let leyenda = '';
        const todasLasActividades = [...ordenanzaData.actividadesComerciales, ...ordenanzaData.actividadesIndustriales];

        const misInmuebles = inmuebles.filter((i: any) => i.identidad === row.Identidad || i.identidad === row.identidad);

        if (misInmuebles.length > 0) {
          const isCondominio = misInmuebles.some((i: any) => (parseInt(i.cant_inmuebles) || 1) > 1);
          leyenda = isCondominio ? 'Condominio / Complejo Residencial' : misInmuebles.map((i: any) => i.actividad_principal || 'Residencial').join(', ');
          
          misInmuebles.forEach((inm: any) => {
            const localFactor = parseFloat(inm.mmv_mes) || 0;
            const cant = parseInt(inm.cant_inmuebles) || 1;
            factorTotal += (localFactor * cant);
          });
        }
        
        if (factorTotal === 0) {
          const rowClasificacion = row.Clasificacion || row.tipo || 'Residencial';
          const rowTipoResidencia = row.TipoResidencia || row.Actividad || row.actividad || '';
          const rowActividadComercial = row.ActividadComercial || row.Actividad || row.actividad || '';
          const rowNivelMetraje = row.NivelMetraje || row.codigo || '';

          if (rowClasificacion === 'Residencial') {
            const tipo = ordenanzaData.tiposResidenciales.find(t => t.label === rowTipoResidencia);
            if (tipo) {
              factorTotal = tipo.factor;
              leyenda = `Clasificador de Tasa Residencial: ${tipo.label}`;
            }
          } else {
            const act = todasLasActividades.find(a => a.label === rowActividadComercial);
            const nivelIndex = Math.max(0, ordenanzaData.nivelesMetraje.indexOf(rowNivelMetraje));
            if (act) {
              factorTotal = act.factores[nivelIndex];
              leyenda = `Tasa Com/Ind: ${act.label} (Nivel: ${rowNivelMetraje || '1 (0-50m2)'})`;
            }
          }
        }

        setCalculoDetalle({
          factor: factorTotal,
          leyenda
        });
      } catch (error) {
        console.error(error);
      }
    };
    if (row) calcView();
  }, [row, inmuebles]);

  // Generar lista de meses a crear según el modo
  const getMesesFinales = (): { mes: string; anio: string; emision: string; vencimiento: string }[] => {
    if (modo === 'especifico') {
      return mesesSeleccionados.sort().map(key => {
        const [y, m] = key.split('-');
        const lastDay = new Date(parseInt(y), parseInt(m), 0).getDate();
        return {
          mes: m,
          anio: y,
          emision: `${y}-${m}-01`,
          vencimiento: `${y}-${m}-${String(lastDay).padStart(2, '0')}`
        };
      });
    } else {
      // Modo período: N meses hacia atrás empezando por el mes actual
      const resultado: { mes: string; anio: string; emision: string; vencimiento: string }[] = [];
      const hoy = new Date();
      for (let i = 0; i < Math.max(1, debtMonths); i++) {
        const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
        const y = String(d.getFullYear());
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
        resultado.push({
          mes: m,
          anio: y,
          emision: `${y}-${m}-01`,
          vencimiento: `${y}-${m}-${String(lastDay).padStart(2, '0')}`
        });
      }
      return resultado.reverse(); // cronológico más antiguo a más reciente
    }
  };

  const toggleMesEspecifico = (key: string) => {
    if (mesesSeleccionados.includes(key)) {
      setMesesSeleccionados(mesesSeleccionados.filter(k => k !== key));
    } else {
      setMesesSeleccionados([...mesesSeleccionados, key]);
    }
  };

  const totalMeses = modo === 'periodo' ? Math.max(1, debtMonths) : mesesSeleccionados.length;
  const montoMensualBs = calculoDetalle ? (calculoDetalle.factor * dynamicTcmmv) : 0;
  const deudaTotalMMV = calculoDetalle ? (calculoDetalle.factor * totalMeses) : 0;
  const deudaTotalBs = deudaTotalMMV * dynamicTcmmv;

  const handleConfirmAdjustDebt = async () => {
    if (!calculoDetalle || !row) return;
    const mesesACrear = getMesesFinales();
    if (mesesACrear.length === 0) {
      alert("Por favor seleccione al menos un mes de deuda.");
      return;
    }

    setIsProcessing(true);
    try {
      const rowIdentidad = row.Identidad || row.identidad;
      const rowContribuyente = row.Contribuyente || row.contribuyente || row.nombre;

      // Obtener datos del inmueble para el código de referencia
      const misInmuebles = inmuebles.filter((i: any) => 
        (i.identidad || '').replace(/[-.\s]/g, '').toUpperCase() === (rowIdentidad || '').replace(/[-.\s]/g, '').toUpperCase()
      );
      const inm = misInmuebles[0] || {};
      const codRef = inm.inmueble || inm.cod_cont || row.CodCont || row.cod_cont || (rowIdentidad || '001').replace(/[^a-zA-Z0-9]/g, '');

      // 1. Si reemplazar está activo, eliminar facturas pendientes anteriores
      if (reemplazarExistentes) {
        const { error: delErr } = await supabase
          .from('facturas')
          .delete()
          .or(`identidad.eq.${rowIdentidad},contribuyente.eq.${rowContribuyente}`)
          .eq('estado', 'Pendiente');
        if (delErr) console.warn('Aviso eliminando facturas pendientes previas:', delErr);
      }

      // 2. Insertar cada mes como factura separada e individual
      const facturasNuevas: any[] = [];
      for (const m of mesesACrear) {
        const refFactura = `CM-${codRef}-${m.mes}-${m.anio}`;
        const facturaData = {
          referencia: refFactura,
          contribuyente: rowContribuyente,
          identidad: rowIdentidad,
          monto: montoMensualBs.toFixed(2),
          emision: m.emision,
          vencimiento: m.vencimiento,
          estado: 'Pendiente'
        };

        const { data: newFactura, error: errInsert } = await supabase
          .from('facturas')
          .insert([facturaData])
          .select()
          .single();

        if (errInsert) {
          // Si ya existe esa referencia, actualizar a Pendiente y monto actual
          await supabase
            .from('facturas')
            .update({ monto: montoMensualBs.toFixed(2), estado: 'Pendiente' })
            .eq('referencia', refFactura);
        } else if (newFactura) {
          facturasNuevas.push(newFactura);
        }
      }

      // 3. Actualizar deuda_mmv en inmuebles
      await supabase
        .from('inmuebles')
        .update({ 
          deuda_mmv: deudaTotalMMV,
          convenio_activo: false,
          decreto_activo: false
        })
        .or(`identidad.eq.${rowIdentidad},contribuyente.eq.${rowContribuyente}`);

      // 4. Actualizar store en AppContext
      if (setFacturas) {
        const facturasRestantes = (recibos || []).filter((f: any) => 
          !(reemplazarExistentes && f.contribuyente === rowContribuyente && f.estado === 'Pendiente')
        );
        setFacturas([...facturasNuevas, ...facturasRestantes]);
      }

      if (addAuditLog) {
        await addAuditLog(
          'AJUSTAR_DEUDA_SEPARADA',
          `Deuda ajustada para ${rowContribuyente}: ${mesesACrear.length} meses creados individualmente (${deudaTotalBs.toFixed(2)} Bs)`
        );
      }

      alert(`✅ Se generaron exitosamente ${mesesACrear.length} meses de deuda separados para ${rowContribuyente}. Ahora pueden ser cobrados o evaluados por decreto individualmente.`);
      onClose();
      if (typeof window !== 'undefined') window.location.reload();
    } catch (e: any) {
      console.error(e);
      alert('Error al ajustar la deuda: ' + e.message);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!row || !calculoDetalle) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl overflow-hidden border border-slate-200">
        
        {/* CABECERA */}
        <div className="bg-slate-900 p-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-orange-400" />
            <h2 className="font-bold text-base">Ajustar Meses de Deuda (Facturas Separadas)</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 space-y-5 max-h-[85vh] overflow-y-auto">
          {/* Info Contribuyente */}
          <div className="bg-slate-50 rounded-lg p-3.5 border border-slate-200 text-xs space-y-1">
            <p><span className="font-bold text-slate-700">Contribuyente:</span> <span className="font-semibold text-slate-900">{row.Contribuyente || row.contribuyente || row.nombre}</span></p>
            <p><span className="font-bold text-slate-700">Identidad / RIF:</span> {row.Identidad || row.identidad}</p>
            <p><span className="font-bold text-slate-700">Actividad / Clasificación:</span> {calculoDetalle.leyenda || 'General'}</p>
          </div>

          {/* Tarifa y Tasa */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
              <span className="text-slate-500 font-medium block">Tarifa Mensual</span>
              <span className="font-bold text-blue-900 text-base">{calculoDetalle.factor.toFixed(2)} MMV</span>
            </div>
            <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100">
              <span className="text-slate-500 font-medium block">Monto por Mes (Bs)</span>
              <span className="font-bold text-emerald-800 text-base">Bs. {montoMensualBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>

          {/* SELECTOR DE MODALIDAD: PERIODO VS MESES ESPECÍFICOS */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">
              Modo de Asignación de Deuda
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-lg border border-slate-200">
              <button
                type="button"
                onClick={() => setModo('periodo')}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-md text-xs font-bold transition-all ${
                  modo === 'periodo' ? 'bg-white text-orange-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers className="w-4 h-4" />
                Por Período (Últimos N Meses)
              </button>
              <button
                type="button"
                onClick={() => setModo('especifico')}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-md text-xs font-bold transition-all ${
                  modo === 'especifico' ? 'bg-white text-orange-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CheckSquare className="w-4 h-4" />
                Escoger Meses Específicos
              </button>
            </div>
          </div>

          {/* OPCION A: POR PERIODO */}
          {modo === 'periodo' ? (
            <div className="space-y-3 bg-orange-50/40 p-4 rounded-lg border border-orange-200">
              <label className="block text-xs font-bold text-slate-700">
                Cantidad de Meses Retroactivos a Generar
              </label>
              <div className="flex items-center gap-3">
                <input 
                  type="number" 
                  min="1"
                  max="36"
                  value={debtMonths} 
                  onChange={(e) => setDebtMonths(Math.max(1, Number(e.target.value)))}
                  className="w-32 border-2 border-slate-300 rounded-lg px-3 py-2 font-bold text-slate-800 text-lg focus:border-orange-500 outline-none bg-white"
                />
                <span className="text-xs text-slate-500 font-medium">
                  Se generarán <strong>{debtMonths} recibos individuales</strong> mensuales hacia atrás desde el mes actual.
                </span>
              </div>
            </div>
          ) : (
            /* OPCION B: ESCOGER MESES ESPECIFICOS */
            <div className="space-y-3 bg-slate-50 p-4 rounded-lg border border-slate-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">Seleccionar Año:</span>
                <div className="flex gap-1">
                  {[2026, 2025, 2024].map(y => (
                    <button
                      key={y}
                      type="button"
                      onClick={() => setAnioSeleccionado(y)}
                      className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${
                        anioSeleccionado === y ? 'bg-orange-600 text-white shadow-xs' : 'bg-white text-slate-600 border border-slate-200'
                      }`}
                    >
                      {y}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pt-1">
                {MESES_NOMBRES.map(m => {
                  const key = `${anioSeleccionado}-${m.num}`;
                  const isChecked = mesesSeleccionados.includes(key);
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => toggleMesEspecifico(key)}
                      className={`p-2.5 rounded-lg border text-left flex items-center justify-between text-xs font-semibold transition-all ${
                        isChecked 
                          ? 'bg-orange-100 border-orange-400 text-orange-950 font-bold' 
                          : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <span>{m.corto} {anioSeleccionado}</span>
                      {isChecked && <Check className="w-3.5 h-3.5 text-orange-700" />}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                <span>{mesesSeleccionados.length} meses seleccionados en total</span>
                {mesesSeleccionados.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setMesesSeleccionados([])}
                    className="text-orange-600 hover:underline font-semibold"
                  >
                    Desmarcar todos
                  </button>
                )}
              </div>
            </div>
          )}

          {/* CHECKBOX REEMPLAZAR EXISTENTES */}
          <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700 bg-slate-50 p-2.5 rounded-md border border-slate-200">
            <input
              type="checkbox"
              checked={reemplazarExistentes}
              onChange={(e) => setReemplazarExistentes(e.target.checked)}
              className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
            />
            <span>Reemplazar facturas pendientes existentes con estos nuevos meses generados</span>
          </label>

          {/* RESUMEN TOTAL */}
          <div className="flex justify-between items-center bg-orange-50 p-4 rounded-xl border border-orange-200 shadow-inner">
            <div>
              <span className="font-bold text-orange-900 block text-sm">Total Deuda Nueva:</span>
              <span className="text-xs text-orange-700 font-medium">({totalMeses} meses individuales a crear)</span>
            </div>
            <div className="text-right">
              <span className="block font-black text-orange-600 text-2xl">{deudaTotalMMV.toFixed(2)} MMV</span>
              <span className="block text-xs font-bold text-orange-800 mt-0.5">
                ≈ Bs. {deudaTotalBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <div className="flex items-start gap-2 bg-amber-50 p-3 rounded-lg border border-amber-200">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-800 leading-relaxed font-medium">
              Cada mes se registrará como una <strong>factura separada</strong> en el sistema, lo que permitirá cobrar meses parciales en caja y aplicar el Decreto de Regularización Fiscal según los meses adeudados.
            </p>
          </div>

          {/* ACCIONES */}
          <div className="flex gap-3 pt-3 border-t border-slate-100">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 font-bold py-2.5 rounded-lg transition-colors text-xs"
            >
              Cancelar
            </button>
            <button 
              type="button"
              onClick={handleConfirmAdjustDebt}
              disabled={isProcessing || totalMeses === 0}
              className="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-bold py-2.5 rounded-lg transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2 text-xs"
            >
              {isProcessing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Generando Meses...
                </>
              ) : (
                `Generar ${totalMeses} Meses Separados`
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
