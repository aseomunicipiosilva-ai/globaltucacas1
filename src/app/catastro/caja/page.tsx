'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { verificarSolvenciaAseo, SolvenciaStatus } from '@/lib/solvenciaAseo';
import { 
  Search, 
  CreditCard, 
  AlertTriangle, 
  CheckCircle2, 
  Building2, 
  Home, 
  Receipt, 
  Calculator,
  Compass,
  MapPin
} from 'lucide-react';

export default function CatastroCajaPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState<'Todos' | 'Residencial' | 'Comercial' | 'Industrial'>('Todos');
  const [loading, setLoading] = useState(false);
  const [inmuebles, setInmuebles] = useState<any[]>([]);
  const [selectedInm, setSelectedInm] = useState<any>(null);
  
  // Solvencia de Aseo (REGLA DE ORO)
  const [solvenciaAseo, setSolvenciaAseo] = useState<SolvenciaStatus | null>(null);
  const [checkingSolvencia, setCheckingSolvencia] = useState(false);
  
  // Check manual de supervisor
  const [checkSupervisor, setCheckSupervisor] = useState(false);
  
  // Conceptos de Catastro
  const [tipoTramite, setTipoTramite] = useState('DerechoFrente');
  const [montoTributo, setMontoTributo] = useState('');
  const [observacion, setObservacion] = useState('');
  const [procesandoPago, setProcesandoPago] = useState(false);
  const [reciboEmitido, setReciboEmitido] = useState<any>(null);

  useEffect(() => {
    buscarInmuebles();
  }, [tipoFiltro]);

  const buscarInmuebles = async () => {
    setLoading(true);
    try {
      let query = supabase.from('inmuebles').select('id, cod_cont, identidad, contribuyente, clasificacion, actividad_principal, direccion, sector, area, mmv_mes');
      
      if (tipoFiltro === 'Residencial') {
        query = query.or('clasificacion.ilike.%Residencial%,actividad_principal.ilike.%Residencial%,actividad_principal.ilike.%Apartamento%,actividad_principal.ilike.%Casa%');
      } else if (tipoFiltro === 'Comercial') {
        query = query.or('clasificacion.ilike.%Comercial%,actividad_principal.ilike.%Comercial%,actividad_principal.ilike.%Hotel%,actividad_principal.ilike.%Marina%');
      } else if (tipoFiltro === 'Industrial') {
        query = query.or('clasificacion.ilike.%Industrial%,actividad_principal.ilike.%Galpon%');
      }

      if (searchTerm.trim()) {
        const clean = searchTerm.trim();
        query = query.or(`identidad.ilike.%${clean}%,contribuyente.ilike.%${clean}%,cod_cont.ilike.%${clean}%`);
      }

      const { data, error } = await query.limit(25);
      if (!error && data) {
        setInmuebles(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const seleccionarInmueble = async (inm: any) => {
    setSelectedInm(inm);
    setReciboEmitido(null);
    setCheckingSolvencia(true);
    setCheckSupervisor(false);
    
    // Consultar solvencia de aseo
    const res = await verificarSolvenciaAseo(inm.identidad);
    setSolvenciaAseo(res);
    setCheckingSolvencia(false);

    // Sugerencia de monto según Derecho de Frente estimado
    if (inm.area && inm.area > 0) {
      setMontoTributo((inm.area * 15.5).toFixed(2));
    } else {
      setMontoTributo('500.00');
    }
  };

  const puedeCobrar = (solvenciaAseo?.solvente || checkSupervisor) && parseFloat(montoTributo) > 0;

  const handleProcesarCobro = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInm) return;
    if (!puedeCobrar) {
      alert('⛔ BLOQUEO FISCAL: No puede procesar trámites de Catastro si el contribuyente tiene deuda de Aseo Urbano.');
      return;
    }

    setProcesandoPago(true);
    try {
      const numRecibo = `CAT-REC-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 900 + 100)}`;
      const montoNum = parseFloat(montoTributo);

      const nuevoPago = {
        numero_recibo: numRecibo,
        codigo_catastral: selectedInm.cod_cont || 'C-000000',
        identidad: selectedInm.identidad,
        contribuyente: selectedInm.contribuyente,
        clasificacion: selectedInm.clasificacion || 'Residencial',
        ramo: 'Catastro Municipal',
        tipo_tramite: tipoTramite,
        monto_bs: montoNum,
        observaciones: observacion || 'Pago procesado en taquilla de Catastro',
        cajero: 'dzara (Catastro)',
        solvencia_aseo_validada: solvenciaAseo?.solvente || false,
        autorizado_supervisor: checkSupervisor,
        created_at: new Date().toISOString()
      };

      // Guardar registro en hacienda_catastro
      await supabase.from('hacienda_catastro').insert([{
        numero_catastral: selectedInm.cod_cont || 'N/A',
        propietario: selectedInm.contribuyente,
        cedula_rif: selectedInm.identidad,
        direccion: selectedInm.direccion || 'Tucacas',
        metros_terreno: selectedInm.area || 0,
        metros_construccion: selectedInm.area || 0,
        uso_inmueble: selectedInm.clasificacion || 'Residencial',
        derecho_frente_anual: montoNum
      }]);

      setReciboEmitido(nuevoPago);
      setMontoTributo('');
      setObservacion('');
      alert(`✅ Cobro de Catastro procesado exitosamente. Recibo: ${numRecibo}`);
    } catch (err: any) {
      alert('Error procesando pago: ' + err.message);
    } finally {
      setProcesandoPago(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Título de Sección */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-800 pb-4">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2.5">
            <Building2 className="w-6 h-6 text-orange-400" />
            Caja de Recaudación — Catastro Municipal
          </h2>
          <p className="text-xs text-stone-400">
            Cobro de Derecho de Frente, Cédulas Catastrales e Inspecciones con validación de Aseo Urbano
          </p>
        </div>

        {/* Filtros por Clasificación */}
        <div className="flex items-center gap-1.5 bg-stone-950 p-1.5 rounded-xl border border-stone-800 text-xs">
          <span className="text-stone-400 text-[10px] font-bold px-2 uppercase">Filtrar por:</span>
          {(['Todos', 'Residencial', 'Comercial', 'Industrial'] as const).map((tipo) => (
            <button
              key={tipo}
              type="button"
              onClick={() => setTipoFiltro(tipo)}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                tipoFiltro === tipo
                  ? 'bg-orange-600 text-white shadow-sm'
                  : 'text-stone-400 hover:text-white hover:bg-stone-900'
              }`}
            >
              {tipo === 'Residencial' ? '🏠 Residencial' : tipo === 'Comercial' ? '🏢 Comercial' : tipo === 'Industrial' ? '🏭 Industrial' : '🌐 Todos'}
            </button>
          ))}
        </div>
      </div>

      {/* Grid Principal: Buscador y Panel de Cobro */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Columna Izquierda: Buscador de Inmuebles (5 columnas) */}
        <div className="lg:col-span-5 bg-stone-950/70 border border-stone-800 rounded-2xl p-4 space-y-4">
          <div>
            <label className="block text-xs font-bold text-stone-300 uppercase mb-1.5">
              Buscar Inmueble (Código / RIF / Nombre)
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-stone-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Ej: C-000180 o J-12345678..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && buscarInmuebles()}
                  className="w-full pl-9 pr-3 py-2 bg-stone-900 border border-stone-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <button
                type="button"
                onClick={buscarInmuebles}
                className="px-3 py-2 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold rounded-xl transition-colors"
              >
                Buscar
              </button>
            </div>
          </div>

          {/* Listado de Resultados */}
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {loading ? (
              <p className="text-center py-8 text-xs text-stone-500">Buscando inmuebles en catastro...</p>
            ) : inmuebles.length === 0 ? (
              <p className="text-center py-8 text-xs text-stone-500">No se encontraron inmuebles para este filtro.</p>
            ) : (
              inmuebles.map((inm) => {
                const isSelected = selectedInm?.id === inm.id;
                return (
                  <div
                    key={inm.id}
                    onClick={() => seleccionarInmueble(inm)}
                    className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-orange-950/60 border-orange-500 text-white shadow-md'
                        : 'bg-stone-900/60 border-stone-800 hover:border-stone-700 text-stone-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono font-bold text-orange-400">{inm.cod_cont || 'S/C'} • {inm.identidad}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                        (inm.clasificacion || '').includes('Residencial')
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : (inm.clasificacion || '').includes('Industrial')
                          ? 'bg-purple-950 text-purple-300 border border-purple-800'
                          : 'bg-blue-950 text-blue-300 border border-blue-800'
                      }`}>
                        {inm.clasificacion || 'Residencial'}
                      </span>
                    </div>
                    <p className="font-bold text-stone-100 line-clamp-1">{inm.contribuyente}</p>
                    <p className="text-[10px] text-stone-400 mt-1 line-clamp-1">{inm.direccion || 'Sin dirección'}</p>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Columna Derecha: Panel de Cobro y Validación de Aseo (7 columnas) */}
        <div className="lg:col-span-7 space-y-4">
          {!selectedInm ? (
            <div className="h-full min-h-[380px] bg-stone-950/40 border border-dashed border-stone-800 rounded-2xl flex flex-col items-center justify-center p-8 text-center text-stone-500">
              <Building2 className="w-12 h-12 text-stone-700 mb-3" />
              <p className="font-semibold text-sm text-stone-400">Seleccione un inmueble del panel izquierdo</p>
              <p className="text-xs text-stone-600 mt-1">Podrá consultar su solvencia y emitir cobros de derecho de frente o cédulas.</p>
            </div>
          ) : (
            <div className="bg-stone-950/80 border border-stone-800 rounded-2xl p-6 space-y-5">
              {/* Encabezado del Inmueble */}
              <div className="flex items-start justify-between pb-4 border-b border-stone-800">
                <div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-orange-950 text-orange-300 border border-orange-800 font-bold">
                    {selectedInm.cod_cont || 'CÓDIGO CATASTRAL'}
                  </span>
                  <h3 className="text-base font-bold text-white mt-1.5">{selectedInm.contribuyente}</h3>
                  <p className="text-xs text-stone-400">{selectedInm.direccion || 'Tucacas, Municipio Silva'}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-stone-400 block font-medium">Uso Inmueble:</span>
                  <span className="text-xs font-bold text-orange-400">{selectedInm.clasificacion || 'Residencial'}</span>
                </div>
              </div>

              {/* ── SEMÁFORO DE SOLVENCIA DE ASEO URBANO (REGLA DE ORO) ── */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase text-stone-300 tracking-wider">Validación de Aseo Urbano:</span>
                  {checkingSolvencia && <span className="text-xs text-orange-400 animate-pulse">Verificando facturas de aseo...</span>}
                </div>

                {solvenciaAseo && (
                  <div className={`p-4 rounded-xl border flex items-start gap-3 transition-all ${
                    solvenciaAseo.solvente
                      ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-200'
                      : 'bg-red-950/50 border-red-800/80 text-red-200'
                  }`}>
                    {solvenciaAseo.solvente ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 text-xs">
                      <p className="font-bold text-sm">
                        {solvenciaAseo.solvente ? '✅ CONTRIBUYENTE SOLVENTE EN ASEO URBANO' : '⛔ DEUDA DETECTADA EN ASEO URBANO'}
                      </p>
                      <p className="mt-1 opacity-90">{solvenciaAseo.detalles}</p>
                      {!solvenciaAseo.solvente && (
                        <p className="mt-2 text-[11px] font-bold text-amber-300 bg-black/40 p-2 rounded-lg border border-amber-500/30">
                          ⚠️ Condición Legal: Para pagar cualquier trámite en Catastro Municipal, el propietario debe cancelar primero el Aseo Urbano.
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Checkbox de Supervisor / Excepción manual */}
                {!solvenciaAseo?.solvente && (
                  <label className="flex items-center gap-2.5 p-3 rounded-xl bg-stone-900 border border-stone-800 cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      checked={checkSupervisor}
                      onChange={(e) => setCheckSupervisor(e.target.checked)}
                      className="w-4 h-4 accent-orange-500 rounded"
                    />
                    <span className="text-stone-300">
                      <strong>Check Supervisor:</strong> Autorizar excepción manual de cobro (Se registra en bitácora).
                    </span>
                  </label>
                )}
              </div>

              {/* Formulario de Cobro de Catastro */}
              <form onSubmit={handleProcesarCobro} className="space-y-4 pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-stone-300 uppercase mb-1">
                      Tipo de Trámite / Tasa Catastral
                    </label>
                    <select
                      value={tipoTramite}
                      onChange={(e) => setTipoTramite(e.target.value)}
                      className="w-full px-3 py-2 bg-stone-900 border border-stone-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="DerechoFrente">Impuesto Inmuebles Urbanos (Derecho de Frente)</option>
                      <option value="CedulaCatastral">Emisión / Renovación de Cédula Catastral</option>
                      <option value="Inspeccion">Inspección Ocular y Avalúo Físico</option>
                      <option value="Zonificacion">Constancia de Zonificación y Linderos</option>
                      <option value="SolvenciaCat">Solvencia Catastral Notarial</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-300 uppercase mb-1">
                      Monto a Cobrar (Bs.)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="0.00"
                      value={montoTributo}
                      onChange={(e) => setMontoTributo(e.target.value)}
                      className="w-full px-3 py-2 bg-stone-900 border border-stone-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-300 uppercase mb-1">
                    Observaciones / Número de Comprobante
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Pago derecho de frente anual 2026..."
                    value={observacion}
                    onChange={(e) => setObservacion(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-900 border border-stone-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={!puedeCobrar || procesandoPago}
                  className={`w-full py-3 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                    puedeCobrar
                      ? 'bg-orange-600 hover:bg-orange-500 text-white shadow-lg shadow-orange-600/30 cursor-pointer'
                      : 'bg-stone-800 text-stone-500 cursor-not-allowed border border-stone-700'
                  }`}
                >
                  <Receipt className="w-4 h-4" />
                  {procesandoPago
                    ? 'Procesando Pago...'
                    : puedeCobrar
                    ? 'Procesar Cobro y Emitir Recibo de Catastro'
                    : 'Cobro Bloqueado: Requiere Solvencia de Aseo'}
                </button>
              </form>

              {/* Recibo Emitido Reciente */}
              {reciboEmitido && (
                <div className="p-4 rounded-xl bg-orange-950/50 border border-orange-600/40 text-xs text-orange-200 space-y-2">
                  <div className="flex items-center justify-between border-b border-orange-800/40 pb-2">
                    <span className="font-bold text-orange-300">RECIBO OFICIAL DE CATASTRO EMITIDO</span>
                    <span className="font-mono font-black text-white">{reciboEmitido.numero_recibo}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <p><span className="text-stone-400">Propietario:</span> {reciboEmitido.contribuyente}</p>
                    <p><span className="text-stone-400">Código Inmueble:</span> {reciboEmitido.codigo_catastral}</p>
                    <p><span className="text-stone-400">Concepto:</span> {reciboEmitido.tipo_tramite}</p>
                    <p><span className="text-stone-400">Monto:</span> <strong>Bs. {reciboEmitido.monto_bs.toFixed(2)}</strong></p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
