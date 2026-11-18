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
  Briefcase, 
  Filter, 
  Receipt, 
  FileCheck2,
  DollarSign
} from 'lucide-react';

export default function HaciendaCajaPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState<'Todos' | 'Comercial' | 'Industrial'>('Comercial');
  const [loading, setLoading] = useState(false);
  const [contribuyentes, setContribuyentes] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  
  // Solvencia de Aseo (REGLA DE ORO)
  const [solvenciaAseo, setSolvenciaAseo] = useState<SolvenciaStatus | null>(null);
  const [checkingSolvencia, setCheckingSolvencia] = useState(false);
  
  // Check manual de supervisor
  const [checkSupervisor, setCheckSupervisor] = useState(false);
  
  // Conceptos de Hacienda a cobrar
  const [tipoTramite, setTipoTramite] = useState('ISAE');
  const [montoTributo, setMontoTributo] = useState('');
  const [observacion, setObservacion] = useState('');
  const [procesandoPago, setProcesandoPago] = useState(false);
  const [reciboEmitido, setReciboEmitido] = useState<any>(null);

  useEffect(() => {
    buscarContribuyentes();
  }, [tipoFiltro]);

  const buscarContribuyentes = async () => {
    setLoading(true);
    try {
      let query = supabase.from('inmuebles').select('id, identidad, contribuyente, clasificacion, actividad_principal, direccion, telefono');
      
      if (tipoFiltro === 'Comercial') {
        query = query.or('clasificacion.ilike.%Comercial%,actividad_principal.ilike.%Comercial%,actividad_principal.ilike.%Hotel%,actividad_principal.ilike.%Posada%,actividad_principal.ilike.%Marina%');
      } else if (tipoFiltro === 'Industrial') {
        query = query.or('clasificacion.ilike.%Industrial%,actividad_principal.ilike.%Industrial%,actividad_principal.ilike.%Galpon%');
      }

      if (searchTerm.trim()) {
        const clean = searchTerm.trim();
        query = query.or(`identidad.ilike.%${clean}%,contribuyente.ilike.%${clean}%`);
      }

      const { data, error } = await query.limit(25);
      if (!error && data) {
        // Eliminar duplicados de RIF para la búsqueda
        const map = new Map();
        data.forEach((item: any) => {
          if (!map.has(item.identidad)) map.set(item.identidad, item);
        });
        setContribuyentes(Array.from(map.values()));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const seleccionarContribuyente = async (user: any) => {
    setSelectedUser(user);
    setReciboEmitido(null);
    setCheckingSolvencia(true);
    setCheckSupervisor(false);
    
    // Consultar solvencia de aseo
    const res = await verificarSolvenciaAseo(user.identidad);
    setSolvenciaAseo(res);
    setCheckingSolvencia(false);
  };

  const puedeCobrar = (solvenciaAseo?.solvente || checkSupervisor) && parseFloat(montoTributo) > 0;

  const handleProcesarCobro = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    if (!puedeCobrar) {
      alert('⛔ BLOQUEO FISCAL: No puede procesar cobros de Hacienda si el contribuyente tiene deuda de Aseo Urbano.');
      return;
    }

    setProcesandoPago(true);
    try {
      const numRecibo = `HAC-REC-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 900 + 100)}`;
      const montoNum = parseFloat(montoTributo);

      const nuevoPago = {
        numero_recibo: numRecibo,
        identidad: selectedUser.identidad,
        contribuyente: selectedUser.contribuyente,
        clasificacion: selectedUser.clasificacion || 'Comercial',
        ramo: 'Hacienda Municipal',
        tipo_tramite: tipoTramite,
        monto_bs: montoNum,
        observaciones: observacion || 'Pago procesado en taquilla de Hacienda',
        cajero: 'dzara (Hacienda)',
        solvencia_aseo_validada: solvenciaAseo?.solvente || false,
        autorizado_supervisor: checkSupervisor,
        created_at: new Date().toISOString()
      };

      // Registrar declaración / cobro en tabla de hacienda
      await supabase.from('hacienda_declaraciones').insert([{
        empresa_id: selectedUser.id,
        periodo: new Date().toISOString().slice(0, 7),
        tipo_declaracion: tipoTramite,
        ingresos_brutos: montoNum,
        impuesto_calculado: montoNum
      }]);

      setReciboEmitido(nuevoPago);
      setMontoTributo('');
      setObservacion('');
      alert(`✅ Cobro de Hacienda procesado exitosamente. Recibo: ${numRecibo}`);
    } catch (err: any) {
      alert('Error procesando pago: ' + err.message);
    } finally {
      setProcesandoPago(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Título de Sección */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2.5">
            <CreditCard className="w-6 h-6 text-sky-400" />
            Caja de Recaudación — Hacienda Municipal
          </h2>
          <p className="text-xs text-slate-400">
            Cobro de ISAE, Licencias, Patentes y Aranceles Comerciales con validación cruzada de Aseo Urbano
          </p>
        </div>

        {/* Filtros Rápidos por Clasificación */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-800 text-xs">
          <span className="text-slate-400 text-[10px] font-bold px-2 uppercase">Filtrar por:</span>
          {(['Comercial', 'Industrial', 'Todos'] as const).map((tipo) => (
            <button
              key={tipo}
              type="button"
              onClick={() => setTipoFiltro(tipo)}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                tipoFiltro === tipo
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              {tipo === 'Comercial' ? '🏢 Comercial' : tipo === 'Industrial' ? '🏭 Industrial' : '🌐 Todos'}
            </button>
          ))}
        </div>
      </div>

      {/* Grid Principal: Buscador y Pantalla de Cobro */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Columna Izquierda: Buscador de Contribuyentes (5 columnas) */}
        <div className="lg:col-span-5 bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
              Buscar Contribuyente (RIF / Razón Social)
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Ej: J-12345678 o Posada..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && buscarContribuyentes()}
                  className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
              <button
                type="button"
                onClick={buscarContribuyentes}
                className="px-3 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl transition-colors"
              >
                Buscar
              </button>
            </div>
          </div>

          {/* Listado de Resultados */}
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {loading ? (
              <p className="text-center py-8 text-xs text-slate-500">Buscando en padrón comercial...</p>
            ) : contribuyentes.length === 0 ? (
              <p className="text-center py-8 text-xs text-slate-500">No se encontraron contribuyentes para este filtro.</p>
            ) : (
              contribuyentes.map((c) => {
                const isSelected = selectedUser?.identidad === c.identidad;
                return (
                  <div
                    key={c.id || c.identidad}
                    onClick={() => seleccionarContribuyente(c)}
                    className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-sky-950/60 border-sky-500 text-white shadow-md'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono font-bold text-sky-400">{c.identidad}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                        (c.clasificacion || '').includes('Industrial')
                          ? 'bg-purple-950 text-purple-300 border border-purple-800'
                          : 'bg-blue-950 text-blue-300 border border-blue-800'
                      }`}>
                        {c.clasificacion || 'Comercial'}
                      </span>
                    </div>
                    <p className="font-bold text-slate-100 line-clamp-1">{c.contribuyente}</p>
                    <p className="text-[10px] text-slate-400 mt-1 line-clamp-1">{c.actividad_principal || c.direccion || 'Sin actividad'}</p>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Columna Derecha: Panel de Cobro y Validación de Aseo (7 columnas) */}
        <div className="lg:col-span-7 space-y-4">
          {!selectedUser ? (
            <div className="h-full min-h-[380px] bg-slate-950/40 border border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center p-8 text-center text-slate-500">
              <Briefcase className="w-12 h-12 text-slate-700 mb-3" />
              <p className="font-semibold text-sm text-slate-400">Seleccione un contribuyente del panel izquierdo</p>
              <p className="text-xs text-slate-600 mt-1">Podrá consultar su estado fiscal y procesar cobros de actividades económicas.</p>
            </div>
          ) : (
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-6 space-y-5">
              {/* Encabezado del Contribuyente */}
              <div className="flex items-start justify-between pb-4 border-b border-slate-800">
                <div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800 font-bold">
                    {selectedUser.identidad}
                  </span>
                  <h3 className="text-base font-bold text-white mt-1.5">{selectedUser.contribuyente}</h3>
                  <p className="text-xs text-slate-400">{selectedUser.actividad_principal || 'Actividad comercial regular'}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400 block font-medium">Clasificación:</span>
                  <span className="text-xs font-bold text-sky-400">{selectedUser.clasificacion || 'Comercial'}</span>
                </div>
              </div>

              {/* ── SEMÁFORO DE SOLVENCIA DE ASEO URBANO (REGLA DE ORO) ── */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase text-slate-300 tracking-wider">Validación de Aseo Urbano:</span>
                  {checkingSolvencia && <span className="text-xs text-sky-400 animate-pulse">Verificando facturas de aseo...</span>}
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
                          ⚠️ Condición Legal: Para pagar cualquier tributo o trámite en Hacienda Municipal, el contribuyente debe cancelar primero el Aseo Urbano.
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Checkbox de Supervisor / Excepción manual */}
                {!solvenciaAseo?.solvente && (
                  <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-900 border border-slate-800 cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      checked={checkSupervisor}
                      onChange={(e) => setCheckSupervisor(e.target.checked)}
                      className="w-4 h-4 accent-amber-500 rounded"
                    />
                    <span className="text-slate-300">
                      <strong>Check Supervisor:</strong> Autorizar excepción manual de cobro (Se registra en bitácora).
                    </span>
                  </label>
                )}
              </div>

              {/* Formulario de Cobro de Hacienda */}
              <form onSubmit={handleProcesarCobro} className="space-y-4 pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                      Tipo de Trámite / Tributo
                    </label>
                    <select
                      value={tipoTramite}
                      onChange={(e) => setTipoTramite(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                    >
                      <option value="ISAE">Impuesto Actividades Económicas (ISAE)</option>
                      <option value="Licencia">Renovación Licencia de Funcionamiento</option>
                      <option value="Publicidad">Propaganda y Publicidad Comercial</option>
                      <option value="TasaAdm">Tasa Administrativa / Constancia</option>
                      <option value="Multa">Multa / Sanción Tributaria</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                      Monto a Cobrar (Bs.)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="0.00"
                      value={montoTributo}
                      onChange={(e) => setMontoTributo(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                    Observaciones / Número de Comprobante
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Pago de patente anual 2026..."
                    value={observacion}
                    onChange={(e) => setObservacion(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={!puedeCobrar || procesandoPago}
                  className={`w-full py-3 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                    puedeCobrar
                      ? 'bg-sky-600 hover:bg-sky-500 text-white shadow-lg shadow-sky-600/30 cursor-pointer'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                  }`}
                >
                  <Receipt className="w-4 h-4" />
                  {procesandoPago
                    ? 'Procesando Pago...'
                    : puedeCobrar
                    ? 'Procesar Cobro y Emitir Recibo de Hacienda'
                    : 'Cobro Bloqueado: Requiere Solvencia de Aseo'}
                </button>
              </form>

              {/* Recibo Emitido Reciente */}
              {reciboEmitido && (
                <div className="p-4 rounded-xl bg-sky-950/50 border border-sky-600/40 text-xs text-sky-200 space-y-2">
                  <div className="flex items-center justify-between border-b border-sky-800/40 pb-2">
                    <span className="font-bold text-sky-300">RECIBO OFICIAL DE HACIENDA EMITIDO</span>
                    <span className="font-mono font-black text-white">{reciboEmitido.numero_recibo}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <p><span className="text-slate-400">Contribuyente:</span> {reciboEmitido.contribuyente}</p>
                    <p><span className="text-slate-400">RIF:</span> {reciboEmitido.identidad}</p>
                    <p><span className="text-slate-400">Concepto:</span> {reciboEmitido.tipo_tramite}</p>
                    <p><span className="text-slate-400">Monto:</span> <strong>Bs. {reciboEmitido.monto_bs.toFixed(2)}</strong></p>
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
