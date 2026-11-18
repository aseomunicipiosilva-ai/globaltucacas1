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
  DollarSign,
  Printer,
  Calendar,
  Lock,
  Unlock,
  Plus,
  Trash2
} from 'lucide-react';
import { formatBs } from '@/lib/formatCurrency';

const bancosVenezuela = [
  'Banco de Venezuela', 'Banesco', 'Bancaribe', 'Banco Mercantil', 'Banco Provincial',
  'Banco Nacional de Crédito (BNC)', 'Bancamiga', 'Banco Exterior', 'Banco Activo',
  'Banco Plaza', 'Banco del Tesoro', 'Banco Digital de los Trabajadores', 'Banplus',
  '100% Banco', 'Otro'
];

export default function HaciendaCajaPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState<'Todos' | 'Comercial' | 'Industrial'>('Comercial');
  const [contribuyentes, setContribuyentes] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [checkingSolvencia, setCheckingSolvencia] = useState(false);
  const [solvenciaAseo, setSolvenciaAseo] = useState<SolvenciaStatus | null>(null);

  // Conceptos tributarios seleccionables
  const [conceptos, setConceptos] = useState<
    { id: string; concepto: string; periodo: string; monto: number; seleccionado: boolean }[]
  >([
    { id: '1', concepto: 'Impuesto Actividades Económicas (ISAE)', periodo: 'NOVIEMBRE 2026', monto: 1850.00, seleccionado: true },
    { id: '2', concepto: 'Tasa Administrativa / Trámite Fiscal', periodo: 'AÑO 2026', monto: 350.00, seleccionado: false },
    { id: '3', concepto: 'Propaganda y Publicidad Comercial', periodo: '4TO TRIMESTRE', monto: 720.00, seleccionado: false }
  ]);

  // Formulario de Pago idéntico a Caja Principal
  const [metodoPago, setMetodoPago] = useState<'Debito' | 'Transferencia' | 'Efectivo'>('Debito');
  const [referenciaDebito, setReferenciaDebito] = useState('');
  const [banco, setBanco] = useState('Banco de Venezuela');
  const [referenciaTransferencia, setReferenciaTransferencia] = useState('');
  const [montoTransferido, setMontoTransferido] = useState('');
  const [fechaTransaccion, setFechaTransaccion] = useState(new Date().toISOString().split('T')[0]);
  const [observacion, setObservacion] = useState('');
  
  // Override de supervisor
  const [checkSupervisor, setCheckSupervisor] = useState(false);
  const [procesandoPago, setProcesandoPago] = useState(false);
  const [reciboEmitido, setReciboEmitido] = useState<any>(null);

  // Buscar contribuyentes
  const buscarContribuyentes = async () => {
    setLoading(true);
    try {
      let query = supabase.from('inmuebles').select('*').limit(60);

      if (searchTerm.trim()) {
        const term = searchTerm.trim();
        query = query.or(`identidad.ilike.%${term}%,contribuyente.ilike.%${term}%,cod_cont.ilike.%${term}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      let filtrados = data || [];
      if (tipoFiltro === 'Comercial') {
        filtrados = filtrados.filter(i => {
          const cls = (i.clasificacion || '').toUpperCase();
          return cls.includes('COMERCIAL') || cls.includes('TIPO D') || cls.includes('TIPO B') || cls.includes('TIPO C');
        });
      } else if (tipoFiltro === 'Industrial') {
        filtrados = filtrados.filter(i => (i.clasificacion || '').toUpperCase().includes('INDUSTRIAL'));
      }

      setContribuyentes(filtrados);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    buscarContribuyentes();
  }, [tipoFiltro]);

  const seleccionarContribuyente = async (user: any) => {
    setSelectedUser(user);
    setReciboEmitido(null);
    setCheckSupervisor(false);
    setCheckingSolvencia(true);

    const res = await verificarSolvenciaAseo(user.identidad);
    setSolvenciaAseo(res);
    setCheckingSolvencia(false);
  };

  const totalPagar = conceptos.filter(c => c.seleccionado).reduce((acc, c) => acc + c.monto, 0);
  const puedeCobrar = (solvenciaAseo?.solvente || checkSupervisor) && totalPagar > 0;

  const toggleConcepto = (id: string) => {
    setConceptos(prev => prev.map(c => c.id === id ? { ...c, seleccionado: !c.seleccionado } : c));
  };

  const handleProcesarCobro = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    if (!puedeCobrar) {
      alert('⛔ BLOQUEO FISCAL: No puede procesar cobros de Hacienda si el contribuyente tiene deuda de Aseo Urbano.');
      return;
    }

    if (metodoPago === 'Debito') {
      if (!referenciaDebito.trim()) return alert('Debe ingresar el número de comprobante de punto de venta.');
      if (referenciaDebito.trim().length > 8) return alert('La referencia no puede exceder 8 dígitos.');
    } else if (metodoPago === 'Transferencia') {
      if (!referenciaTransferencia.trim()) return alert('Debe ingresar el número de referencia bancaria.');
      if (referenciaTransferencia.trim().length !== 8) return alert('La referencia de transferencia debe tener exactamente 8 dígitos.');
    }

    setProcesandoPago(true);
    try {
      const numRecibo = `HAC-REC-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 900 + 100)}`;
      const refFinal = metodoPago === 'Debito' ? referenciaDebito.trim() : metodoPago === 'Transferencia' ? referenciaTransferencia.trim() : 'EFECTIVO';

      const nuevoPago = {
        numero_recibo: numRecibo,
        identidad: selectedUser.identidad,
        contribuyente: selectedUser.contribuyente,
        clasificacion: selectedUser.clasificacion || 'Comercial',
        ramo: 'Hacienda Municipal',
        conceptos: conceptos.filter(c => c.seleccionado).map(c => c.concepto).join(', '),
        monto_bs: totalPagar,
        metodo_pago: metodoPago,
        banco: metodoPago === 'Transferencia' ? banco : 'Punto de Venta',
        referencia: refFinal,
        fecha: fechaTransaccion,
        cajero: 'dzara (Hacienda)',
        solvencia_aseo: solvenciaAseo?.solvente || false,
        autorizado_supervisor: checkSupervisor,
        created_at: new Date().toISOString()
      };

      // Registrar en base de datos
      await supabase.from('hacienda_declaraciones').insert([{
        empresa_id: selectedUser.id,
        periodo: new Date().toISOString().slice(0, 7),
        tipo_declaracion: nuevoPago.conceptos,
        ingresos_brutos: totalPagar,
        impuesto_calculado: totalPagar
      }]);

      setReciboEmitido(nuevoPago);
      setReferenciaDebito('');
      setReferenciaTransferencia('');
      alert(`✅ Cobro de Hacienda procesado exitosamente. Recibo: ${numRecibo}`);
    } catch (err: any) {
      alert('Error procesando pago: ' + err.message);
    } finally {
      setProcesandoPago(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header y Filtro Superior */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <Building2 className="w-7 h-7 text-sky-400" />
            Caja de Recaudación • Hacienda Municipal
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Cobro de ISAE, tasas, patentes y publicidad con validación obligatoria de Solvencia de Aseo Urbano.
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Columna Izquierda: Buscador de Contribuyentes (5 cols) */}
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
                  placeholder="Ej: J-12345678 o Nombre..."
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

          <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
            {loading ? (
              <p className="text-center py-8 text-xs text-slate-500">Buscando contribuyentes...</p>
            ) : contribuyentes.length === 0 ? (
              <p className="text-center py-8 text-xs text-slate-500">No se encontraron contribuyentes.</p>
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
                      <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase bg-slate-950 text-slate-300 border border-slate-700">
                        {c.clasificacion || 'Comercial'}
                      </span>
                    </div>
                    <p className="font-bold text-slate-100 line-clamp-1">{c.contribuyente}</p>
                    <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{c.direccion}</p>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Columna Derecha: Panel de Cobro Funcional Idéntico a Caja (7 cols) */}
        <div className="lg:col-span-7 bg-slate-950/70 border border-slate-800 rounded-2xl p-6 space-y-5">
          {!selectedUser ? (
            <div className="py-20 text-center text-slate-500 space-y-2">
              <CreditCard className="w-12 h-12 text-slate-700 mx-auto" />
              <p className="text-sm font-semibold">Seleccione un contribuyente del panel izquierdo para cobrar.</p>
              <p className="text-xs text-slate-600">Se validará automáticamente si está solvente con Aseo Urbano.</p>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Contribuyente Seleccionado */}
              <div className="flex items-start justify-between border-b border-slate-800 pb-4">
                <div>
                  <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider">Contribuyente Seleccionado</span>
                  <h2 className="text-lg font-black text-white">{selectedUser.contribuyente}</h2>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">RIF: {selectedUser.identidad} • Actividad: {selectedUser.actividad_principal || 'Comercio General'}</p>
                </div>
                <span className="px-3 py-1 rounded-lg text-xs font-bold uppercase bg-slate-900 text-slate-300 border border-slate-700">
                  {selectedUser.clasificacion || 'Comercial'}
                </span>
              </div>

              {/* SEMÁFORO DE SOLVENCIA DE ASEO URBANO */}
              <div className={`p-4 rounded-xl border ${
                checkingSolvencia 
                  ? 'bg-slate-900 border-slate-700 text-slate-400'
                  : solvenciaAseo?.solvente
                  ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
                  : 'bg-red-950/40 border-red-500/50 text-red-200'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    {checkingSolvencia ? (
                      <span className="text-xs animate-pulse">Verificando solvencia en Aseo Urbano...</span>
                    ) : solvenciaAseo?.solvente ? (
                      <>
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        <div>
                          <p className="text-xs font-black uppercase text-emerald-300 tracking-wide">SOLVENTE CON EL ASEO URBANO</p>
                          <p className="text-[11px] text-emerald-400/80">{solvenciaAseo.detalles}</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-5 h-5 text-red-400" />
                        <div>
                          <p className="text-xs font-black uppercase text-red-300 tracking-wide">BLOQUEO FISCAL: DEUDA PENDIENTE EN ASEO URBANO</p>
                          <p className="text-[11px] text-red-400 font-semibold">{solvenciaAseo?.detalles}</p>
                          <p className="text-[11px] text-red-300 font-bold mt-0.5">
                            Deuda Total: Bs. {formatBs(solvenciaAseo?.montoDeuda || 0)}
                          </p>
                        </div>
                      </>
                    )}
                  </div>

                  {!checkingSolvencia && (
                    <span className={`px-2.5 py-1 rounded text-[10px] font-black uppercase border ${
                      solvenciaAseo?.solvente 
                        ? 'bg-emerald-900/60 text-emerald-300 border-emerald-700' 
                        : 'bg-red-900/60 text-red-300 border-red-700'
                    }`}>
                      {solvenciaAseo?.solvente ? 'HABILITADO' : 'INHABILITADO'}
                    </span>
                  )}
                </div>

                {/* Checkbox de Supervisor */}
                {!solvenciaAseo?.solvente && (
                  <label className="mt-3 flex items-center gap-2 p-2.5 rounded-lg bg-slate-900 border border-slate-800 cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      checked={checkSupervisor}
                      onChange={(e) => setCheckSupervisor(e.target.checked)}
                      className="w-4 h-4 accent-amber-500 rounded"
                    />
                    <span className="text-slate-300">
                      <strong>Check Supervisor:</strong> Autorizar cobro manual con excepción (Registra auditoría dzara).
                    </span>
                  </label>
                )}
              </div>

              {/* LISTA DE CONCEPTOS TRIBUTARIOS */}
              <div>
                <span className="text-xs font-bold text-slate-300 uppercase block mb-2">Conceptos Tributarios a Liquidar:</span>
                <div className="space-y-2">
                  {conceptos.map(c => (
                    <label key={c.id} className={`flex items-center justify-between p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                      c.seleccionado ? 'bg-sky-950/40 border-sky-500 text-white' : 'bg-slate-900/40 border-slate-800 text-slate-400'
                    }`}>
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={c.seleccionado}
                          onChange={() => toggleConcepto(c.id)}
                          className="w-4 h-4 accent-sky-500 rounded"
                        />
                        <div>
                          <p className="font-bold text-slate-200">{c.concepto}</p>
                          <p className="text-[10px] text-slate-500">{c.periodo}</p>
                        </div>
                      </div>
                      <span className="font-mono font-bold text-sky-400">Bs. {formatBs(c.monto)}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* RESUMEN DE PAGO Y PASARELA DE COBRO */}
              <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <span className="text-xs font-bold uppercase text-slate-400">Total a Cancelar en Hacienda:</span>
                  <span className="text-2xl font-black text-sky-400 font-mono">Bs. {formatBs(totalPagar)}</span>
                </div>

                <form onSubmit={handleProcesarCobro} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Método de Pago</label>
                      <select
                        value={metodoPago}
                        onChange={(e: any) => setMetodoPago(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
                      >
                        <option value="Debito">Punto de Venta (TD/TC)</option>
                        <option value="Transferencia">Transferencia Bancaria</option>
                        <option value="Efectivo">Efectivo (Taquilla)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Fecha de Transacción</label>
                      <input
                        type="date"
                        value={fechaTransaccion}
                        onChange={e => setFechaTransaccion(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white font-semibold"
                      />
                    </div>
                  </div>

                  {metodoPago === 'Debito' && (
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                        N° de Comprobante / Referencia Punto (Máx. 8 dígitos):
                      </label>
                      <input
                        type="text"
                        maxLength={8}
                        placeholder="Ej. 00012345"
                        value={referenciaDebito}
                        onChange={e => setReferenciaDebito(e.target.value.replace(/\D/g, '').slice(0, 8))}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white font-mono"
                      />
                    </div>
                  )}

                  {metodoPago === 'Transferencia' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Banco Emisor</label>
                        <select
                          value={banco}
                          onChange={e => setBanco(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
                        >
                          {bancosVenezuela.map(b => <option key={b} value={b}>{b}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">N° Referencia (8 dígitos)</label>
                        <input
                          type="text"
                          maxLength={8}
                          placeholder="Ej. 75912451"
                          value={referenciaTransferencia}
                          onChange={e => setReferenciaTransferencia(e.target.value.replace(/\D/g, '').slice(0, 8))}
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white font-mono"
                        />
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={!puedeCobrar || procesandoPago}
                    className={`w-full py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg transition-all ${
                      puedeCobrar
                        ? 'bg-sky-600 hover:bg-sky-500 text-white shadow-sky-600/30'
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

                {reciboEmitido && (
                  <div className="p-4 bg-sky-950/60 border border-sky-500 rounded-xl text-xs space-y-2">
                    <div className="flex items-center justify-between border-b border-sky-800 pb-2">
                      <span className="font-bold text-sky-300">RECIBO DE HACIENDA EMITIDO</span>
                      <span className="font-mono font-black text-white">{reciboEmitido.numero_recibo}</span>
                    </div>
                    <p><span className="text-slate-400">Contribuyente:</span> {reciboEmitido.contribuyente}</p>
                    <p><span className="text-slate-400">Conceptos:</span> {reciboEmitido.conceptos}</p>
                    <p><span className="text-slate-400">Monto:</span> <strong>Bs. {formatBs(reciboEmitido.monto_bs)}</strong> ({reciboEmitido.metodo_pago} - Ref: {reciboEmitido.referencia})</p>
                    <button
                      onClick={() => alert(`Imprimiendo Recibo Oficial de Hacienda N° ${reciboEmitido.numero_recibo}...`)}
                      className="mt-2 w-full py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-lg flex items-center justify-center gap-2"
                    >
                      <Printer className="w-4 h-4" /> Imprimir Recibo Oficial
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
