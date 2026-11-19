'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { verificarSolvenciaAseo, SolvenciaStatus } from '@/lib/solvenciaAseo';
import { tarifasHaciendaCatastro } from '@/data/ordenanza';
import { esContribuyenteHacienda, deduplicarContribuyentes } from '@/lib/filtroHacienda';
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
  Trash2,
  Landmark,
  BadgePercent
} from 'lucide-react';
import { formatBs } from '@/lib/formatCurrency';

const bancosVenezuela = [
  'Banco de Venezuela', 'Banesco', 'Bancaribe', 'Banco Mercantil', 'Banco Provincial',
  'Banco Nacional de Crédito (BNC)', 'Bancamiga', 'Banco Exterior', 'Banco Activo',
  'Banco Plaza', 'Banco del Tesoro', 'Banco Digital de los Trabajadores', 'Banplus',
  '100% Banco', 'Otro'
];

interface ConceptoItem {
  id: string;
  concepto: string;
  periodo: string;
  montoTcmmv: number;
  montoBs: number;
  seleccionado: boolean;
  esFijo?: boolean;
}

export default function HaciendaCajaPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState<'Todos' | 'Comercial' | 'Industrial'>('Comercial');
  const [contribuyentes, setContribuyentes] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [checkingSolvencia, setCheckingSolvencia] = useState(false);
  const [solvenciaAseo, setSolvenciaAseo] = useState<SolvenciaStatus | null>(null);

  // Tasa Oficial TCMMV (Euro BCV)
  const [tasaBcv, setTasaBcv] = useState<number>(1007.39);

  // Conceptos dinámicos en base a TCMMV
  const [conceptos, setConceptos] = useState<ConceptoItem[]>([]);

  // Formulario de Pago (SOLO Punto de Venta y Transferencia Bancaria Oficial - Sin efectivo ni pago móvil)
  const [metodoPago, setMetodoPago] = useState<'Debito' | 'Transferencia'>('Debito');
  const [referenciaDebito, setReferenciaDebito] = useState('');
  const [banco, setBanco] = useState('Banco de Venezuela');
  const [referenciaTransferencia, setReferenciaTransferencia] = useState('');
  const [fechaTransaccion, setFechaTransaccion] = useState(new Date().toISOString().split('T')[0]);

  // Override de supervisor
  const [checkSupervisor, setCheckSupervisor] = useState(false);
  const [procesandoPago, setProcesandoPago] = useState(false);
  const [reciboEmitido, setReciboEmitido] = useState<any>(null);

  // Cargar tasa BCV oficial
  useEffect(() => {
    async function loadTasa() {
      try {
        const { data: cfg } = await supabase.from('sistema_config').select('valor').eq('id', 'tasa_bcv_semanal').maybeSingle();
        if (cfg && cfg.valor) {
          const val = parseFloat(cfg.valor);
          if (!isNaN(val) && val > 0) {
            setTasaBcv(val);
            return;
          }
        }
        const res = await fetch(`/api/bcv?t=${Date.now()}`);
        const json = await res.json();
        if (json && json.tcmmv) {
          setTasaBcv(json.tcmmv);
        }
      } catch (e) {
        console.warn('Usando tasa de respaldo:', e);
      }
    }
    loadTasa();
  }, []);

  // Generar conceptos reales basados en el contribuyente y la tasa TCMMV
  const actualizarConceptos = (user: any, rate: number) => {
    const th = tarifasHaciendaCatastro.hacienda;
    const mesActual = new Date().toLocaleDateString('es-VE', { month: 'long', year: 'numeric' }).toUpperCase();

    // Determinar mínimo o alícuota estimada según clasificación
    let minimoTcmmv = th.minimosTributariosISAE.comercioGeneral;
    const act = (user?.actividad_principal || user?.clasificacion || '').toLowerCase();
    if (act.includes('alimento') || act.includes('viveres') || act.includes('panaderia')) {
      minimoTcmmv = th.minimosTributariosISAE.comercioAlimentosSalud;
    } else if (act.includes('licor') || act.includes('bar') || act.includes('bodegon')) {
      minimoTcmmv = th.minimosTributariosISAE.licoresBaresDiscotecas;
    } else if (act.includes('hotel') || act.includes('posada') || act.includes('turism')) {
      minimoTcmmv = th.minimosTributariosISAE.hotelesTurismo;
    } else if (act.includes('marina') || act.includes('nautic') || act.includes('lancha')) {
      minimoTcmmv = th.minimosTributariosISAE.marinasNautica;
    } else if (act.includes('industria') || act.includes('fabrica')) {
      minimoTcmmv = th.minimosTributariosISAE.industriaManufactura;
    }

    const items: ConceptoItem[] = [
      {
        id: '1',
        concepto: 'Impuesto sobre Actividades Económicas (ISAE) - Mínimo Tributable',
        periodo: mesActual,
        montoTcmmv: minimoTcmmv,
        montoBs: parseFloat((minimoTcmmv * rate).toFixed(2)),
        seleccionado: true
      },
      {
        id: '2',
        concepto: 'Tasa Administrativa y Verificación Fiscal Municipal',
        periodo: `AÑO ${new Date().getFullYear()}`,
        montoTcmmv: th.tasaAdministrativaFiscal.tcmmv,
        montoBs: parseFloat((th.tasaAdministrativaFiscal.tcmmv * rate).toFixed(2)),
        seleccionado: false
      },
      {
        id: '3',
        concepto: 'Tasa de Propaganda y Publicidad Comercial',
        periodo: 'TRIMESTRAL',
        montoTcmmv: th.propagandaPublicidadBase.tcmmv,
        montoBs: parseFloat((th.propagandaPublicidadBase.tcmmv * rate).toFixed(2)),
        seleccionado: false
      },
      {
        id: '4',
        concepto: 'Certificado de Solvencia Municipal de Hacienda',
        periodo: 'TRÁMITE',
        montoTcmmv: th.solvenciaMunicipal.tcmmv,
        montoBs: parseFloat((th.solvenciaMunicipal.tcmmv * rate).toFixed(2)),
        seleccionado: false
      }
    ];

    setConceptos(items);
  };

  // Buscar contribuyentes
  const buscarContribuyentes = async () => {
    setLoading(true);
    try {
      let query = supabase.from('inmuebles').select('*').limit(200);

      if (searchTerm.trim()) {
        const term = searchTerm.trim();
        query = query.or(`identidad.ilike.%${term}%,contribuyente.ilike.%${term}%,cod_cont.ilike.%${term}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      // 1. Excluir condominios y filtrar solo comercios e industrias
      let filtrados = (data || []).filter(i => esContribuyenteHacienda(i));

      if (tipoFiltro === 'Comercial') {
        filtrados = filtrados.filter(i => !(i.clasificacion || '').toUpperCase().includes('INDUSTRIAL'));
      } else if (tipoFiltro === 'Industrial') {
        filtrados = filtrados.filter(i => (i.clasificacion || '').toUpperCase().includes('INDUSTRIAL'));
      }

      // 2. Deduplicar por RIF único
      const unicos = deduplicarContribuyentes(filtrados);

      setContribuyentes(unicos);
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

    actualizarConceptos(user, tasaBcv);

    const res = await verificarSolvenciaAseo(user.identidad);
    setSolvenciaAseo(res);
    setCheckingSolvencia(false);
  };

  const totalPagar = conceptos.filter(c => c.seleccionado).reduce((acc, c) => acc + c.montoBs, 0);
  const totalTcmmv = conceptos.filter(c => c.seleccionado).reduce((acc, c) => acc + c.montoTcmmv, 0);
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
      const refFinal = metodoPago === 'Debito' ? referenciaDebito.trim() : referenciaTransferencia.trim();

      const nuevoPago = {
        numero_recibo: numRecibo,
        identidad: selectedUser.identidad,
        contribuyente: selectedUser.contribuyente,
        clasificacion: selectedUser.clasificacion || 'Comercial',
        ramo: 'Hacienda Municipal',
        conceptos: conceptos.filter(c => c.seleccionado).map(c => c.concepto).join(', '),
        monto_bs: totalPagar,
        monto_tcmmv: totalTcmmv,
        tasa_bcv: tasaBcv,
        metodo_pago: metodoPago,
        banco: metodoPago === 'Transferencia' ? banco : 'Punto de Venta (TD/TC)',
        referencia: refFinal,
        fecha: fechaTransaccion,
        cajero: 'dzara (Hacienda)',
        solvencia_aseo: solvenciaAseo?.solvente || false,
        autorizado_supervisor: checkSupervisor,
        created_at: new Date().toISOString()
      };

      // Registrar en base de datos hacienda_declaraciones
      await supabase.from('hacienda_declaraciones').insert([{
        empresa_id: selectedUser.id,
        periodo: new Date().toISOString().slice(0, 7),
        tipo_declaracion: nuevoPago.conceptos,
        ingresos_brutos: totalPagar,
        impuesto_calculado: totalPagar
      }]);

      // Registrar también en hacienda_pagos
      try {
        await supabase.from('hacienda_pagos').insert([{
          contribuyente_identidad: selectedUser.identidad,
          contribuyente_nombre: selectedUser.contribuyente,
          concepto: nuevoPago.conceptos,
          monto_total: totalPagar,
          metodo_pago: metodoPago === 'Debito' ? 'Punto de Venta' : 'Transferencia',
          referencia_comprobante: refFinal
        }]);
      } catch (errHac) {
        console.warn('Registro en hacienda_pagos opcional:', errHac);
      }

      // Registrar en pagos_reportados para libro de ingresos y cuadre
      try {
        await supabase.from('pagos_reportados').insert([{
          identidad: selectedUser.identidad,
          monto: totalPagar,
          banco: nuevoPago.banco,
          referencia: refFinal,
          tipo: 'Hacienda',
          estado: 'Aprobado',
          detalles: {
            numero_recibo: numRecibo,
            modulo: 'Hacienda',
            concepto: nuevoPago.conceptos,
            monto_tcmmv: totalTcmmv,
            tasa_bcv: tasaBcv,
            cajero: 'dzara',
            clasificacion: selectedUser.clasificacion || 'Comercial',
            solvencia_aseo: solvenciaAseo?.solvente || false,
            autorizado_supervisor: checkSupervisor
          }
        }]);
      } catch (errRep) {
        console.warn('Registro en pagos_reportados opcional:', errRep);
      }

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
      <div className="border-b border-slate-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <CreditCard className="w-7 h-7 text-sky-400" />
            Caja de Recaudación - Hacienda Municipal
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Cobro oficial de tributos municipales según Ley de Armonización Tributaria.
            <span className="text-amber-400 font-semibold ml-1">Solo Punto de Venta y Transferencia Bancaria Directa.</span>
          </p>
        </div>

        {/* Indicador de Tasa Oficial */}
        <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 px-3.5 py-2 rounded-2xl shadow-inner">
          <BadgePercent className="w-4 h-4 text-sky-400" />
          <div className="text-right">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">Unidad de Cuenta TCMMV:</span>
            <span className="font-mono font-bold text-white text-xs">
              Bs. {formatBs(tasaBcv)} <span className="text-[10px] text-sky-400 font-normal">/ Euro BCV</span>
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* PANEL IZQUIERDO: Búsqueda y Padrón */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Padrón de Contribuyentes</span>
              {/* Filtro Comercial / Industrial */}
              <div className="flex bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-xs">
                {(['Todos', 'Comercial', 'Industrial'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setTipoFiltro(f)}
                    className={`px-2.5 py-1 rounded-md font-semibold transition-all ${tipoFiltro === f ? 'bg-sky-600 text-white shadow' : 'text-slate-400 hover:text-white'
                      }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {/* Input de Búsqueda */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Buscar por RIF, Razón Social o N° Inmueble..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && buscarContribuyentes()}
                className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
            </div>

            {/* Lista de Contribuyentes */}
            <div className="max-h-[500px] overflow-y-auto space-y-2 pr-1">
              {loading ? (
                <div className="text-center py-8 text-xs text-slate-500">Cargando padrón...</div>
              ) : contribuyentes.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-500">No se encontraron comercios ni industrias.</div>
              ) : (
                contribuyentes.map((user) => {
                  const isSelected = selectedUser?.id === user.id;
                  return (
                    <button
                      key={user.id}
                      onClick={() => seleccionarContribuyente(user)}
                      className={`w-full text-left p-3 rounded-xl border transition-all ${isSelected
                        ? 'bg-sky-950/60 border-sky-500 shadow-md ring-1 ring-sky-500'
                        : 'bg-slate-900/40 border-slate-800/80 hover:bg-slate-900 hover:border-slate-700'
                        }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-bold text-white text-xs truncate block max-w-[220px]">
                          {user.contribuyente || 'Sin Razón Social'}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold bg-slate-800 text-sky-300">
                          {user.clasificacion || 'Comercial'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-400">
                        <span className="font-mono text-slate-300 font-semibold">{user.identidad}</span>
                        <span>•</span>
                        <span className="truncate">{user.sector || 'Tucacas'}</span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* PANEL DERECHO: Facturación, Validación de Aseo y Cobro */}
        <div className="lg:col-span-7 space-y-4">
          {!selectedUser ? (
            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-12 text-center text-slate-500 text-xs">
              <Building2 className="w-12 h-12 text-slate-700 mx-auto mb-3" />
              <p className="font-bold text-slate-400 text-sm">Seleccione un Contribuyente</p>
              <p className="mt-1">Haga clic en un comercio o industria del panel izquierdo para cargar sus conceptos y verificar solvencia.</p>
            </div>
          ) : (
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-5">
              {/* Encabezado del Contribuyente */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-4 gap-2">
                <div>
                  <h2 className="text-base font-black text-white">{selectedUser.contribuyente}</h2>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    RIF: {selectedUser.identidad} • Código: {selectedUser.cod_cont || selectedUser.inmueble || 'S/C'}
                  </p>
                  <p className="text-[11px] text-sky-400 mt-0.5">
                    Actividad: {selectedUser.actividad_principal || selectedUser.clasificacion || 'Comercial'}
                  </p>
                </div>
                <span className="self-start px-2.5 py-1 rounded-full text-[10px] font-bold bg-sky-950 text-sky-300 border border-sky-800">
                  {selectedUser.clasificacion || 'Comercial'}
                </span>
              </div>

              {/* SEMÁFORO DE INTERCONEXIÓN: DEUDA DE ASEO URBANO Y ALERTA DE CONDOMINIO */}
              <div className="p-4 rounded-xl border transition-all">
                {checkingSolvencia ? (
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span className="w-3 h-3 rounded-full border-2 border-sky-400 border-t-transparent animate-spin"></span>
                    Consultando solvencia en Aseo Urbano...
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Alerta si pertenece a un Centro Comercial o Condominio */}
                    {solvenciaAseo?.esCondominio && (
                      <div className="bg-amber-950/40 border border-amber-700/60 rounded-xl p-3 flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2.5">
                          <Building2 className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded border border-amber-500/30">
                                Local en Centro Comercial / Condominio
                              </span>
                              <span className="text-xs font-bold text-white">
                                {solvenciaAseo.numeroUnidad ? `Local: ${solvenciaAseo.numeroUnidad}` : 'Unidad Comercial'}
                              </span>
                            </div>
                            <p className="text-xs text-amber-200/90 font-semibold mt-1">
                              Edificio / Complejo: <span className="text-white font-bold">{solvenciaAseo.condominioNombre}</span> ({solvenciaAseo.condominioRif})
                            </p>
                            <p className="text-[11px] text-amber-300/80 mt-0.5">
                              {solvenciaAseo.condominioSolvente
                                ? '✓ El Condominio Matriz se encuentra SOLVENTE en Aseo Urbano.'
                                : `⚠️ El Complejo Matriz presenta saldo pendiente de Bs. ${formatBs(solvenciaAseo.condominioDeudaBs || 0)} en Aseo Urbano.`}
                            </p>
                          </div>
                        </div>
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase border shrink-0 ${
                          solvenciaAseo.condominioSolvente
                            ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                            : 'bg-rose-950 text-rose-300 border-rose-800'
                        }`}>
                          {solvenciaAseo.condominioSolvente ? 'Condominio Al Día' : 'Condominio Moroso'}
                        </span>
                      </div>
                    )}

                    {/* Estatus Directo de Solvencia */}
                    {solvenciaAseo?.solvente ? (
                      <div className="bg-emerald-950/40 border border-emerald-800/60 rounded-xl p-3 flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                        <div>
                          <h4 className="font-bold text-emerald-300 text-xs">SOLVENTE EN ASEO URBANO</h4>
                          <p className="text-[11px] text-emerald-400/80 mt-0.5">
                            {solvenciaAseo.detalles || 'El contribuyente no presenta facturas pendientes en aseosilvaad. Autorizado para cancelar en Hacienda.'}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-rose-950/40 border border-rose-800/80 rounded-xl p-3 space-y-3">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                          <div>
                            <h4 className="font-bold text-rose-300 text-xs uppercase tracking-wide">
                              ⛔ BLOQUEO FISCAL: INSOLVENTE EN ASEO URBANO
                            </h4>
                            <p className="text-[11px] text-rose-300/80 mt-0.5">
                              Tiene una deuda pendiente de <strong className="text-white font-mono">Bs. {formatBs(solvenciaAseo?.montoDeuda || 0)}</strong> en el servicio de aseo.
                              Por ordenanza municipal, no puede tramitar ni cancelar Hacienda sin estar solvente.
                            </p>
                            {solvenciaAseo?.esCondominio && (
                              <p className="text-[10px] text-amber-300/90 italic mt-1">
                                * Nota de Taquilla: Si el contribuyente posee otra actividad comercial independiente que esté solvente, puede cancelarla sin que la deuda de este condominio lo limite.
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Switch de Desbloqueo por Supervisor */}
                        <div className="pt-2 border-t border-rose-900/50 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {checkSupervisor ? <Unlock className="w-4 h-4 text-amber-400" /> : <Lock className="w-4 h-4 text-slate-500" />}
                            <span className="text-[11px] font-bold text-slate-300">Autorización Especial de Supervisor:</span>
                          </div>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={checkSupervisor}
                              onChange={(e) => setCheckSupervisor(e.target.checked)}
                              className="w-4 h-4 accent-amber-500 rounded"
                            />
                            <span className="text-[10px] text-amber-400 font-bold uppercase">
                              {checkSupervisor ? 'Autorizado' : 'Bloqueado'}
                            </span>
                          </label>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* CONCEPTOS TRIBUTARIOS CALCULADOS EN TCMMV */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-300 uppercase">Conceptos Tributarios a Liquidar:</span>
                  <span className="text-[11px] text-slate-400">Tasas oficiales armonizadas</span>
                </div>
                <div className="space-y-2">
                  {conceptos.map(c => (
                    <label key={c.id} className={`flex items-center justify-between p-3 rounded-xl border text-xs cursor-pointer transition-all ${c.seleccionado ? 'bg-sky-950/40 border-sky-500 text-white' : 'bg-slate-900/40 border-slate-800 text-slate-400'
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
                          <p className="text-[10px] text-slate-500 font-mono">
                            {c.periodo} • <span className="text-sky-400 font-semibold">{c.montoTcmmv.toFixed(2)} TCMMV</span>
                          </p>
                        </div>
                      </div>
                      <span className="font-mono font-bold text-sky-400 text-sm">Bs. {formatBs(c.montoBs)}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* RESUMEN DE PAGO Y PASARELA DE COBRO */}
              <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <span className="text-xs font-bold uppercase text-slate-400 block">Total a Cancelar en Hacienda:</span>
                    <span className="text-[11px] text-sky-400 font-mono font-semibold">{totalTcmmv.toFixed(2)} TCMMV</span>
                  </div>
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
                    disabled={true}
                    className="w-full py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all bg-slate-800 text-slate-400 border border-slate-700 cursor-not-allowed opacity-80"
                    title="Módulo de recaudación en taquilla en fase de homologación contable"
                  >
                    <span>Módulo de Cobro en Caja (Próximamente disponible)</span>
                  </button>
                </form>
              </div>

              {/* RECIBO EMITIDO */}
              {reciboEmitido && (
                <div className="p-4 bg-emerald-950/50 border border-emerald-800 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-emerald-300 font-bold text-xs">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      RECIBO OFICIAL DE HACIENDA GENERADO
                    </div>
                    <span className="font-mono text-xs font-bold text-white bg-emerald-900/60 px-2.5 py-1 rounded border border-emerald-700">
                      {reciboEmitido.numero_recibo}
                    </span>
                  </div>

                  <div className="text-xs text-slate-300 space-y-1 bg-slate-950/70 p-3 rounded-lg font-mono">
                    <p><strong className="text-slate-400">Contribuyente:</strong> {reciboEmitido.contribuyente}</p>
                    <p><strong className="text-slate-400">RIF:</strong> {reciboEmitido.identidad}</p>
                    <p><strong className="text-slate-400">Conceptos:</strong> {reciboEmitido.conceptos}</p>
                    <p><strong className="text-slate-400">Monto Cancelado:</strong> Bs. {formatBs(reciboEmitido.monto_bs)} ({reciboEmitido.monto_tcmmv?.toFixed(2)} TCMMV)</p>
                    <p><strong className="text-slate-400">Forma de Pago:</strong> {reciboEmitido.metodo_pago} ({reciboEmitido.banco})</p>
                    <p><strong className="text-slate-400">Referencia:</strong> {reciboEmitido.referencia}</p>
                    <p><strong className="text-slate-400">Cajero Operador:</strong> {reciboEmitido.cajero}</p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => window.print()}
                      className="flex-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      Imprimir Comprobante Oficial
                    </button>
                    <button
                      onClick={() => setReciboEmitido(null)}
                      className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                    >
                      Cerrar
                    </button>
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
