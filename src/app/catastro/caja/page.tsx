'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { verificarSolvenciaAseo, SolvenciaStatus } from '@/lib/solvenciaAseo';
import { tarifasHaciendaCatastro } from '@/data/ordenanza';
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
  MapPin,
  Printer,
  BadgePercent
} from 'lucide-react';
import { formatBs } from '@/lib/formatCurrency';

const bancosVenezuela = [
  'Banco de Venezuela', 'Banesco', 'Bancaribe', 'Banco Mercantil', 'Banco Provincial',
  'Banco Nacional de Crédito (BNC)', 'Bancamiga', 'Banco Exterior', 'Banco Activo',
  'Banco Plaza', 'Banco del Tesoro', 'Banco Digital de los Trabajadores', 'Banplus',
  '100% Banco', 'Otro'
];

interface ConceptoCatastroItem {
  id: string;
  concepto: string;
  periodo: string;
  montoTcmmv: number;
  montoBs: number;
  seleccionado: boolean;
}

export default function CatastroCajaPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState<'Todos' | 'Residencial' | 'Comercial' | 'Industrial'>('Residencial');
  const [inmuebles, setInmuebles] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [checkingSolvencia, setCheckingSolvencia] = useState(false);
  const [solvenciaAseo, setSolvenciaAseo] = useState<SolvenciaStatus | null>(null);
  const [userInmueblesList, setUserInmueblesList] = useState<any[]>([]);
  const [inmuebleActivoIndex, setInmuebleActivoIndex] = useState<number>(0);

  // Tasa Oficial TCMMV (Euro BCV)
  const [tasaBcv, setTasaBcv] = useState<number>(1007.39);

  // Conceptos Catastrales Dinámicos en TCMMV
  const [conceptos, setConceptos] = useState<ConceptoCatastroItem[]>([]);

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

  // Calcular conceptos según el inmueble y la tasa TCMMV
  const actualizarConceptos = (user: any, rate: number) => {
    const tc = tarifasHaciendaCatastro.catastro;
    const anioActual = new Date().getFullYear();

    // Determinar derecho de frente base según clasificación y metros
    let dfTcmmv = tc.derechoFrenteTrimestralBase.residencialCasaApto;
    const cls = (user?.clasificacion || '').toUpperCase();
    if (cls.includes('TIPO A') || cls.includes('POPULAR')) {
      dfTcmmv = tc.derechoFrenteTrimestralBase.residencialPopular;
    } else if (cls.includes('TIPO C') || cls.includes('CONDOMINIO') || cls.includes('QUINTA')) {
      dfTcmmv = tc.derechoFrenteTrimestralBase.residencialQuintaTownhouse;
    } else if (cls.includes('COMERCIAL') || cls.includes('TIPO D')) {
      dfTcmmv = tc.derechoFrenteTrimestralBase.comercialMedianoGrande;
    } else if (cls.includes('INDUSTRIAL')) {
      dfTcmmv = tc.derechoFrenteTrimestralBase.industrial;
    }

    const items: ConceptoCatastroItem[] = [
      {
        id: '1',
        concepto: 'Impuesto sobre Inmuebles Urbanos (Derecho de Frente Trimestral)',
        periodo: `4TO TRIMESTRE ${anioActual}`,
        montoTcmmv: dfTcmmv,
        montoBs: parseFloat((dfTcmmv * rate).toFixed(2)),
        seleccionado: true
      },
      {
        id: '2',
        concepto: 'Tasa de Ficha y Levantamiento de Mensura Catastral',
        periodo: 'TRÁMITE',
        montoTcmmv: tc.fichaMensura.tcmmv,
        montoBs: parseFloat((tc.fichaMensura.tcmmv * rate).toFixed(2)),
        seleccionado: false
      },
      {
        id: '3',
        concepto: 'Certificado de Avalúo Inmobiliario Oficial',
        periodo: 'TRÁMITE',
        montoTcmmv: tc.certificadoAvaluo.tcmmv,
        montoBs: parseFloat((tc.certificadoAvaluo.tcmmv * rate).toFixed(2)),
        seleccionado: false
      },
      {
        id: '4',
        concepto: 'Emisión de Cédula Catastral de Parcela',
        periodo: 'TRÁMITE',
        montoTcmmv: tc.cedulaCatastral.tcmmv,
        montoBs: parseFloat((tc.cedulaCatastral.tcmmv * rate).toFixed(2)),
        seleccionado: false
      },
      {
        id: '5',
        concepto: 'Certificado de Solvencia Catastral',
        periodo: 'TRÁMITE',
        montoTcmmv: tc.solvenciaCatastral.tcmmv,
        montoBs: parseFloat((tc.solvenciaCatastral.tcmmv * rate).toFixed(2)),
        seleccionado: false
      }
    ];

    setConceptos(items);
  };

  const buscarInmuebles = async () => {
    setLoading(true);
    try {
      let query = supabase.from('inmuebles').select('*').limit(250);

      if (searchTerm.trim()) {
        const term = searchTerm.trim();
        query = query.or(`identidad.ilike.%${term}%,contribuyente.ilike.%${term}%,cod_cont.ilike.%${term}%,inmueble.ilike.%${term}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Regla de Oro: En Catastro NO deben salir condominios matrices (J-...), solo propietarios individuales o parcelas
      let filtrados = (data || []).filter(i => {
        const nom = (i.contribuyente || '').toUpperCase();
        const act = (i.actividad_principal || i.actividad || '').toUpperCase();
        const cls = (i.clasificacion || '').toUpperCase();
        const cant = parseInt(i.cant_inmuebles || '1', 10);

        if (nom.includes('CONDOMINIO') || nom.includes('CONJUNTO RESIDENCIAL') || nom.includes('RESIDENCIAS') || act.includes('CONDOMINIO') || act.includes('ÁREA COMÚN') || act.includes('AREA COMUN')) {
          return false;
        }
        if (cls.includes('TIPO C') && cant > 1) {
          return false;
        }
        return true;
      });
      if (tipoFiltro === 'Residencial') {
        filtrados = filtrados.filter(i => {
          const cls = (i.clasificacion || '').toUpperCase();
          return cls.includes('RESIDENCIAL') || cls.includes('TIPO A') || cls.includes('TIPO C') || !cls.includes('COMERCIAL');
        });
      } else if (tipoFiltro === 'Comercial') {
        filtrados = filtrados.filter(i => {
          const cls = (i.clasificacion || '').toUpperCase();
          return cls.includes('COMERCIAL') || cls.includes('TIPO D') || cls.includes('TIPO B');
        });
      } else if (tipoFiltro === 'Industrial') {
        filtrados = filtrados.filter(i => (i.clasificacion || '').toUpperCase().includes('INDUSTRIAL'));
      }

      setInmuebles(filtrados);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    buscarInmuebles();
  }, [tipoFiltro]);

  const cambiarPropiedadActiva = async (index: number, propsList?: any[]) => {
    const list = propsList || userInmueblesList;
    setInmuebleActivoIndex(index);
    const prop = list[index];
    if (!prop) return;

    setSelectedUser(prop);
    actualizarConceptos(prop, tasaBcv);
    setCheckingSolvencia(true);

    const res = await verificarSolvenciaAseo(prop.identidad, {
      esUnidadCondo: prop.esCondo,
      numeroUnidad: prop.numeroUnidad
    });
    setSolvenciaAseo(res);
    setCheckingSolvencia(false);
  };

  const seleccionarInmueble = async (user: any) => {
    setSelectedUser(user);
    setReciboEmitido(null);
    setCheckSupervisor(false);
    setCheckingSolvencia(true);

    actualizarConceptos(user, tasaBcv);

    try {
      const idClean = (user.identidad || '').replace(/[-.\s]/g, '').toUpperCase();
      const idConGuion = idClean.length > 1 ? idClean.charAt(0) + '-' + idClean.slice(1) : idClean;

      // Buscar si tiene otros inmuebles directos
      const { data: directos } = await supabase
        .from('inmuebles')
        .select('*')
        .or('identidad.eq.' + user.identidad + ',identidad.eq.' + idClean + ',identidad.eq.' + idConGuion);

      // Buscar si tiene unidades en condominios
      const { data: unidades } = await supabase
        .from('unidades_condominio')
        .select('id, condominio_id, numero_unidad, propietario, cedula_rif, estado')
        .or('cedula_rif.eq.' + user.identidad + ',cedula_rif.eq.' + idClean + ',cedula_rif.eq.' + idConGuion);

      let allProps: any[] = [];
      (directos || []).forEach(d => {
        allProps.push({
          ...d,
          tipoPropiedad: 'Inmueble Independiente',
          etiqueta: d.inmueble || d.cod_cont || 'Casa / Parcela',
          esCondo: false
        });
      });

      if (unidades && unidades.length > 0) {
        const condoIds = [...new Set(unidades.map(u => u.condominio_id).filter(Boolean))];
        const { data: condoRows } = await supabase
          .from('inmuebles')
          .select('id, contribuyente, identidad, saldo')
          .in('id', condoIds);
        const condoMap = new Map((condoRows || []).map(c => [c.id, c]));

        unidades.forEach(u => {
          const cMatriz = condoMap.get(u.condominio_id);
          allProps.push({
            id: 'condo-' + u.id,
            contribuyente: u.propietario || user.contribuyente,
            identidad: u.cedula_rif || user.identidad,
            inmueble: u.numero_unidad,
            cod_cont: u.numero_unidad,
            direccion: cMatriz?.contribuyente || 'Condominio',
            clasificacion: 'Apartamento en Condominio',
            tipoPropiedad: 'Apartamento / Villa',
            etiqueta: u.numero_unidad + ' (' + (cMatriz?.contribuyente || 'Condominio') + ')',
            esCondo: true,
            condominioMatriz: cMatriz,
            numeroUnidad: u.numero_unidad
          });
        });
      }

      if (allProps.length === 0) {
        allProps = [{ ...user, tipoPropiedad: 'Inmueble Independiente', etiqueta: user.inmueble || user.cod_cont || 'Parcela', esCondo: false }];
      }

      setUserInmueblesList(allProps);
      
      let initialIdx = allProps.findIndex(p => p.id === user.id);
      if (initialIdx === -1) initialIdx = 0;
      setInmuebleActivoIndex(initialIdx);

      const propInicial = allProps[initialIdx];
      const res = await verificarSolvenciaAseo(user.identidad, {
        esUnidadCondo: propInicial.esCondo,
        numeroUnidad: propInicial.numeroUnidad
      });
      setSolvenciaAseo(res);
    } catch (e) {
      console.error(e);
      const res = await verificarSolvenciaAseo(user.identidad);
      setSolvenciaAseo(res);
    } finally {
      setCheckingSolvencia(false);
    }
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
      alert('⛔ BLOQUEO FISCAL: No puede procesar cobros de Catastro si el propietario tiene deuda de Aseo Urbano.');
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
      const numRecibo = `CAT-REC-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 900 + 100)}`;
      const refFinal = metodoPago === 'Debito' ? referenciaDebito.trim() : referenciaTransferencia.trim();

      const nuevoPago = {
        numero_recibo: numRecibo,
        inmueble_codigo: selectedUser.inmueble || selectedUser.cod_cont,
        identidad: selectedUser.identidad,
        contribuyente: selectedUser.contribuyente,
        clasificacion: selectedUser.clasificacion || 'Residencial',
        conceptos: conceptos.filter(c => c.seleccionado).map(c => c.concepto).join(', '),
        monto_bs: totalPagar,
        monto_tcmmv: totalTcmmv,
        tasa_bcv: tasaBcv,
        metodo_pago: metodoPago,
        banco: metodoPago === 'Transferencia' ? banco : 'Punto de Venta (TD/TC)',
        referencia: refFinal,
        fecha: fechaTransaccion,
        cajero: 'dzara (Catastro)',
        solvencia_aseo: solvenciaAseo?.solvente || false,
        autorizado_supervisor: checkSupervisor,
        created_at: new Date().toISOString()
      };

      // Registrar en pagos_reportados para libro de ingresos y cuadre
      try {
        await supabase.from('pagos_reportados').insert([{
          identidad: selectedUser.identidad,
          monto: totalPagar,
          banco: nuevoPago.banco,
          referencia: refFinal,
          tipo: 'Catastro',
          estado: 'Aprobado',
          detalles: {
            numero_recibo: numRecibo,
            modulo: 'Catastro',
            inmueble_codigo: nuevoPago.inmueble_codigo,
            concepto: nuevoPago.conceptos,
            monto_tcmmv: totalTcmmv,
            tasa_bcv: tasaBcv,
            cajero: 'dzara',
            clasificacion: selectedUser.clasificacion || 'Residencial',
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
      alert(`✅ Cobro de Catastro procesado exitosamente. Recibo: ${numRecibo}`);
    } catch (err: any) {
      alert('Error procesando pago: ' + err.message);
    } finally {
      setProcesandoPago(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header y Filtro Superior */}
      <div className="border-b border-stone-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <CreditCard className="w-7 h-7 text-orange-400" />
            Caja de Recaudación - Catastro Municipal
          </h1>
          <p className="text-xs text-stone-400 mt-1">
            Cobro oficial de Derecho de Frente y Tasas Catastrales en TCMMV. 
            <span className="text-amber-400 font-semibold ml-1">Solo Punto de Venta y Transferencia Bancaria Oficial.</span>
          </p>
        </div>

        {/* Indicador de Tasa Oficial */}
        <div className="flex items-center gap-2 bg-stone-950 border border-stone-800 px-3.5 py-2 rounded-2xl shadow-inner">
          <BadgePercent className="w-4 h-4 text-orange-400" />
          <div className="text-right">
            <span className="text-[10px] uppercase tracking-wider text-stone-400 font-bold block">Unidad de Cuenta TCMMV:</span>
            <span className="font-mono font-bold text-white text-xs">
              Bs. {formatBs(tasaBcv)} <span className="text-[10px] text-orange-400 font-normal">/ Euro BCV</span>
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* PANEL IZQUIERDO: Búsqueda y Padrón */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-stone-950/80 border border-stone-800 rounded-2xl p-4 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-400">Padrón Inmobiliario</span>
              {/* Filtro Residencial / Comercial */}
              <div className="flex bg-stone-900 p-0.5 rounded-lg border border-stone-800 text-xs">
                {(['Todos', 'Residencial', 'Comercial', 'Industrial'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setTipoFiltro(f)}
                    className={`px-2 py-1 rounded-md font-semibold transition-all ${
                      tipoFiltro === f ? 'bg-orange-600 text-white shadow' : 'text-stone-400 hover:text-white'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {/* Input de Búsqueda */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
              <input
                type="text"
                placeholder="Buscar por Cédula/RIF, Propietario o Código Parcela..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && buscarInmuebles()}
                className="w-full pl-9 pr-4 py-2 bg-stone-900 border border-stone-800 rounded-xl text-xs text-white placeholder-stone-500 focus:outline-none focus:border-orange-500"
              />
            </div>

            {/* Lista de Inmuebles */}
            <div className="max-h-[500px] overflow-y-auto space-y-2 pr-1">
              {loading ? (
                <div className="text-center py-8 text-xs text-stone-500">Cargando padrón...</div>
              ) : inmuebles.length === 0 ? (
                <div className="text-center py-8 text-xs text-stone-500">No se encontraron parcelas.</div>
              ) : (
                inmuebles.map((user) => {
                  const isSelected = selectedUser?.id === user.id;
                  return (
                    <button
                      key={user.id}
                      onClick={() => seleccionarInmueble(user)}
                      className={`w-full text-left p-3 rounded-xl border transition-all ${
                        isSelected
                          ? 'bg-orange-950/60 border-orange-500 shadow-md ring-1 ring-orange-500'
                          : 'bg-stone-900/40 border-stone-800/80 hover:bg-stone-900 hover:border-stone-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-bold text-white text-xs truncate block max-w-[220px]">
                          {user.contribuyente || 'Sin Propietario'}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold bg-stone-800 text-orange-300">
                          {user.inmueble || user.cod_cont || 'PARCELA'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-[11px] text-stone-400">
                        <span className="font-mono text-stone-300 font-semibold">{user.identidad}</span>
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
            <div className="bg-stone-950/60 border border-stone-800 rounded-2xl p-12 text-center text-stone-500 text-xs">
              <Home className="w-12 h-12 text-stone-700 mx-auto mb-3" />
              <p className="font-bold text-stone-400 text-sm">Seleccione un Inmueble</p>
              <p className="mt-1">Haga clic en una parcela o contribuyente del panel izquierdo para cargar sus conceptos y verificar solvencia.</p>
            </div>
          ) : (
            <div className="bg-stone-950/80 border border-stone-800 rounded-2xl p-5 shadow-xl space-y-5">
              {/* Encabezado del Inmueble */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-stone-800 pb-4 gap-2">
                <div>
                  <h2 className="text-base font-black text-white">{selectedUser.contribuyente}</h2>
                  <p className="text-xs text-stone-400 font-mono mt-0.5">
                    Cédula/RIF: {selectedUser.identidad} • Parcela: {selectedUser.inmueble || selectedUser.cod_cont}
                  </p>
                  <p className="text-[11px] text-stone-400 mt-0.5">
                    Sector: {selectedUser.sector || 'Tucacas'} • Destino: {selectedUser.clasificacion || 'Residencial'}
                  </p>
                </div>
                <span className="self-start px-2.5 py-1 rounded-full text-[10px] font-bold bg-orange-950 text-orange-300 border border-orange-800">
                  {selectedUser.clasificacion || 'Residencial'}
                </span>
              </div>

              {/* SELECTOR DE PROPIEDADES / MULTI-INMUEBLE DEL CONTRIBUYENTE */}
              {userInmueblesList.length > 1 && (
                <div className="bg-stone-900/90 border border-stone-800 rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-stone-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Home className="w-3.5 h-3.5 text-orange-400" />
                      Propiedades del Contribuyente ({userInmueblesList.length}) - Seleccione cuál pagar:
                    </span>
                    <span className="text-[10px] text-stone-500 font-mono">Independencia de cobro garantizada</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {userInmueblesList.map((prop, idx) => {
                      const isAct = idx === inmuebleActivoIndex;
                      return (
                        <button
                          key={prop.id || idx}
                          type="button"
                          onClick={() => cambiarPropiedadActiva(idx)}
                          className={`p-2.5 rounded-lg border text-left transition-all ${
                            isAct
                              ? 'bg-orange-950/80 border-orange-500 ring-1 ring-orange-500 text-white'
                              : 'bg-stone-950/40 border-stone-800 hover:bg-stone-900 text-stone-400'
                          }`}
                        >
                          <div className="flex items-center justify-between text-xs font-bold">
                            <span className="truncate max-w-[170px]">{prop.etiqueta}</span>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${
                              prop.esCondo ? 'bg-amber-950 text-amber-300 border border-amber-800' : 'bg-stone-800 text-stone-300'
                            }`}>
                              {prop.esCondo ? 'Condominio' : 'Independiente'}
                            </span>
                          </div>
                          <div className="text-[10px] text-stone-500 mt-1 flex items-center gap-1">
                            <span>{prop.esCondo ? (prop.condominioMatriz?.contribuyente || 'Edificio') : (prop.sector || 'Tucacas')}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* SEMÁFORO DE INTERCONEXIÓN: DEUDA DE ASEO URBANO Y ALERTA DE CONDOMINIO */}
              <div className="p-4 rounded-xl border transition-all">
                {checkingSolvencia ? (
                  <div className="flex items-center gap-2 text-xs text-stone-400">
                    <span className="w-3 h-3 rounded-full border-2 border-orange-400 border-t-transparent animate-spin"></span>
                    Consultando solvencia en Aseo Urbano...
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Alerta si pertenece a un Condominio */}
                    {solvenciaAseo?.esCondominio && (
                      <div className="bg-amber-950/40 border border-amber-700/60 rounded-xl p-3 flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2.5">
                          <Building2 className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded border border-amber-500/30">
                                Inmueble en Condominio
                              </span>
                              <span className="text-xs font-bold text-white">
                                {solvenciaAseo.numeroUnidad ? `Unidad / Apto: ${solvenciaAseo.numeroUnidad}` : 'Unidad en Edificio'}
                              </span>
                            </div>
                            <p className="text-xs text-amber-200/90 font-semibold mt-1">
                              Edificio / Conjunto: <span className="text-white font-bold">{solvenciaAseo.condominioNombre}</span> ({solvenciaAseo.condominioRif})
                            </p>
                            <p className="text-[11px] text-amber-300/80 mt-0.5">
                              {solvenciaAseo.condominioSolvente
                                ? '✓ El Condominio Matriz se encuentra SOLVENTE en Aseo Urbano.'
                                : `⚠️ El Condominio Matriz presenta saldo pendiente de Bs. ${formatBs(solvenciaAseo.condominioDeudaBs || 0)} en Aseo Urbano.`}
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
                            {solvenciaAseo.detalles || 'El propietario no presenta deudas pendientes en aseosilvaad. Autorizado para cancelar Catastro.'}
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
                              Por ordenanza municipal, no puede tramitar ni pagar Catastro sin estar solvente.
                            </p>
                            {solvenciaAseo?.esCondominio && (
                              <p className="text-[10px] text-amber-300/90 italic mt-1">
                                * Nota de Taquilla: Si el contribuyente posee otra casa o local independiente que esté solvente, puede cancelar esa propiedad sin que la deuda de este condominio lo limite.
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Switch de Desbloqueo por Supervisor */}
                        <div className="pt-2 border-t border-rose-900/50 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold text-stone-300">Autorización Especial de Supervisor:</span>
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
                  <span className="text-xs font-bold text-stone-300 uppercase">Conceptos Catastrales a Liquidar:</span>
                  <span className="text-[11px] text-stone-400">Tarifas oficiales armonizadas</span>
                </div>
                <div className="space-y-2">
                  {conceptos.map(c => (
                    <label key={c.id} className={`flex items-center justify-between p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                      c.seleccionado ? 'bg-orange-950/40 border-orange-500 text-white' : 'bg-stone-900/40 border-stone-800 text-stone-400'
                    }`}>
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={c.seleccionado}
                          onChange={() => toggleConcepto(c.id)}
                          className="w-4 h-4 accent-orange-500 rounded"
                        />
                        <div>
                          <p className="font-bold text-stone-200">{c.concepto}</p>
                          <p className="text-[10px] text-stone-500 font-mono">
                            {c.periodo} • <span className="text-orange-400 font-semibold">{c.montoTcmmv.toFixed(2)} TCMMV</span>
                          </p>
                        </div>
                      </div>
                      <span className="font-mono font-bold text-orange-400 text-sm">Bs. {formatBs(c.montoBs)}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* PASARELA DE COBRO */}
              <div className="p-4 bg-stone-900 rounded-xl border border-stone-800 space-y-4">
                <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                  <div>
                    <span className="text-xs font-bold uppercase text-stone-400 block">Total a Pagar en Catastro:</span>
                    <span className="text-[11px] text-orange-400 font-mono font-semibold">{totalTcmmv.toFixed(2)} TCMMV</span>
                  </div>
                  <span className="text-2xl font-black text-orange-400 font-mono">Bs. {formatBs(totalPagar)}</span>
                </div>

                <form onSubmit={handleProcesarCobro} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-stone-400 uppercase mb-1">Método de Pago</label>
                      <select
                        value={metodoPago}
                        onChange={(e: any) => setMetodoPago(e.target.value)}
                        className="w-full px-3 py-2 bg-stone-950 border border-stone-700 rounded-lg text-xs text-white"
                      >
                        <option value="Debito">Punto de Venta (TD/TC)</option>
                        <option value="Transferencia">Transferencia Bancaria</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-stone-400 uppercase mb-1">Fecha de Transacción</label>
                      <input
                        type="date"
                        value={fechaTransaccion}
                        onChange={e => setFechaTransaccion(e.target.value)}
                        className="w-full px-3 py-2 bg-stone-950 border border-stone-700 rounded-lg text-xs text-white font-semibold"
                      />
                    </div>
                  </div>

                  {metodoPago === 'Debito' && (
                    <div>
                      <label className="block text-[11px] font-bold text-stone-400 uppercase mb-1">
                        N° de Comprobante / Referencia Punto (Máx. 8 dígitos):
                      </label>
                      <input
                        type="text"
                        maxLength={8}
                        placeholder="Ej. 00012345"
                        value={referenciaDebito}
                        onChange={e => setReferenciaDebito(e.target.value.replace(/\D/g, '').slice(0, 8))}
                        className="w-full px-3 py-2 bg-stone-950 border border-stone-700 rounded-lg text-xs text-white font-mono"
                      />
                    </div>
                  )}

                  {metodoPago === 'Transferencia' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-stone-400 uppercase mb-1">Banco Emisor</label>
                        <select
                          value={banco}
                          onChange={e => setBanco(e.target.value)}
                          className="w-full px-3 py-2 bg-stone-950 border border-stone-700 rounded-lg text-xs text-white"
                        >
                          {bancosVenezuela.map(b => <option key={b} value={b}>{b}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-stone-400 uppercase mb-1">N° Referencia (8 dígitos)</label>
                        <input
                          type="text"
                          maxLength={8}
                          placeholder="Ej. 75912451"
                          value={referenciaTransferencia}
                          onChange={e => setReferenciaTransferencia(e.target.value.replace(/\D/g, '').slice(0, 8))}
                          className="w-full px-3 py-2 bg-stone-950 border border-stone-700 rounded-lg text-xs text-white font-mono"
                        />
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={true}
                    className="w-full py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all bg-stone-800 text-stone-400 border border-stone-700 cursor-not-allowed opacity-80"
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
                      RECIBO OFICIAL DE CATASTRO GENERADO
                    </div>
                    <span className="font-mono text-xs font-bold text-white bg-emerald-900/60 px-2.5 py-1 rounded border border-emerald-700">
                      {reciboEmitido.numero_recibo}
                    </span>
                  </div>

                  <div className="text-xs text-stone-300 space-y-1 bg-stone-950/70 p-3 rounded-lg font-mono">
                    <p><strong className="text-stone-400">Propietario:</strong> {reciboEmitido.contribuyente}</p>
                    <p><strong className="text-stone-400">Cédula/RIF:</strong> {reciboEmitido.identidad}</p>
                    <p><strong className="text-stone-400">Parcela:</strong> {reciboEmitido.inmueble_codigo}</p>
                    <p><strong className="text-stone-400">Conceptos:</strong> {reciboEmitido.conceptos}</p>
                    <p><strong className="text-stone-400">Monto Cancelado:</strong> Bs. {formatBs(reciboEmitido.monto_bs)} ({reciboEmitido.monto_tcmmv?.toFixed(2)} TCMMV)</p>
                    <p><strong className="text-stone-400">Forma de Pago:</strong> {reciboEmitido.metodo_pago} ({reciboEmitido.banco})</p>
                    <p><strong className="text-stone-400">Referencia:</strong> {reciboEmitido.referencia}</p>
                    <p><strong className="text-stone-400">Cajero Operador:</strong> {reciboEmitido.cajero}</p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => window.print()}
                      className="flex-1 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      Imprimir Comprobante Oficial
                    </button>
                    <button
                      onClick={() => setReciboEmitido(null)}
                      className="px-4 py-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold"
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
