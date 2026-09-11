'use client';
import React, { useState, useEffect, useCallback } from 'react';
import {
  CheckCheck, RefreshCw, Filter, Landmark, Eye, Download, X,
  Pencil, Mail, Building2
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

type Pago = {
  id: string;
  identidad: string;
  cod_inmueble?: string;
  contribuyente?: string;
  referencia?: string;
  created_at?: string;
  fecha_transaccion?: string;
  tipo?: string;
  banco?: string;
  banco_destino?: string;
  estado?: string;
  monto?: string | number;
  detalles?: any;
  correo?: string;
  telefono?: string;
};

type Filtros = {
  desde: string;
  hasta: string;
  estatus: string;
  bancoDestino: string;
  formaPago: string;
  referencia: string;
  monto: string;
};

const BANCOS_DESTINO = [
  'Todos',
  'BANESCO - 0134 - 1715',
  'BANCO DE VENEZUELA - 0102',
  'BANCO MERCANTIL - 0105',
  'BANCO PROVINCIAL - 0108',
];

const FORMAS_PAGO = ['Todos', 'Transferencia', 'Punto de Venta', 'Debito', 'Efectivo'];
const ESTATUS_LIST = ['Todos', 'Pendiente', 'Por Verificar', 'Aprobado', 'Rechazado'];
const ESTATUS_CONCILIAR = ['Aprobado', 'Rechazado', 'Con Diferencia'];

function fmt(val: string | number | undefined) {
  const n = parseFloat(String(val || '0').replace(/[^0-9.]/g, ''));
  return isNaN(n) ? '0,00' : n.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtFecha(iso: string | undefined) {
  if (!iso) return '---';
  try {
    return new Date(iso).toLocaleDateString('es-VE', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  } catch { return iso; }
}

function parseDetalles(raw: any): any {
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  try { return JSON.parse(raw); } catch { return {}; }
}

// ─── MODAL COMPROBANTE ──────────────────────────────────
function ModalComprobante({ pago, onClose }: { pago: Pago; onClose: () => void }) {
  const det = parseDetalles(pago.detalles);
  const [archivos, setArchivos] = useState<{ name: string; url: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const urls: { name: string; url: string }[] = [];
      if (det.comprobante_url) {
        urls.push({ name: det.comprobante_nombre || 'comprobante.jpg', url: det.comprobante_url });
      }
      try {
        const { data: files } = await supabase.storage
          .from('comprobantes').list('pagos/' + pago.id, { limit: 20 });
        if (files && files.length > 0) {
          for (const f of files) {
            const { data: sd } = await supabase.storage.from('comprobantes')
              .createSignedUrl('pagos/' + pago.id + '/' + f.name, 3600);
            if (sd?.signedUrl) urls.push({ name: f.name, url: sd.signedUrl });
          }
        }
      } catch { /* sin storage */ }
      setArchivos(urls);
      setLoading(false);
    })();
  }, [pago.id]);

  const label = (det.cod_inmueble || pago.cod_inmueble || '') + '-' + (pago.contribuyente || pago.identidad || '');

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-800 uppercase tracking-wide">Archivos Adjuntos</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>
        <div className="p-6">
          <div className="bg-blue-600 text-white rounded-lg px-4 py-2 mb-4 text-sm font-semibold">
            Listado de Adjuntos del usuario {label}
          </div>
          {loading ? (
            <div className="text-center py-8 text-slate-400">Cargando archivos...</div>
          ) : archivos.length === 0 ? (
            <div className="text-center py-8 text-slate-400">No hay archivos adjuntos para este pago.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-900 text-white">
                  <th className="px-4 py-2 text-left w-12">#</th>
                  <th className="px-4 py-2 text-left">Nombre del Archivo</th>
                  <th className="px-4 py-2 text-center">Descargar</th>
                  <th className="px-4 py-2 text-center">Visualizar</th>
                </tr>
              </thead>
              <tbody>
                {archivos.map((arch, i) => (
                  <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-500">{i + 1}</td>
                    <td className="px-4 py-3 text-blue-600 font-mono text-xs">{arch.name}</td>
                    <td className="px-4 py-3 text-center">
                      <a href={arch.url} download target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center justify-center text-blue-600 hover:text-blue-800">
                        <Download size={20} />
                      </a>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <a href={arch.url} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center justify-center text-blue-600 hover:text-blue-800">
                        <Eye size={20} />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="flex justify-end px-6 pb-4">
          <button onClick={onClose} className="px-5 py-2 border border-red-400 text-red-600 hover:bg-red-50 rounded font-semibold text-sm flex items-center gap-2">
            <X size={14} /> Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── MODAL ESTADO DE CUENTA ──────────────────────────────
function ModalEstadoCuenta({ pago, onClose }: { pago: Pago; onClose: () => void }) {
  const [facturas, setFacturas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [inmueble, setInmueble] = useState<any>(null);
  const det = parseDetalles(pago.detalles);
  const mesesNombre = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const idLimpio = (pago.identidad || '').replace(/-/g, '');
        // Buscar por identidad en inmuebles (campo real: identidad minúscula)
        const { data: inms } = await supabase
          .from('inmuebles')
          .select('*')
          .or(`identidad.eq.${pago.identidad},identidad.eq.${idLimpio}`);

        if (inms && inms.length > 0) {
          // Calcular totales
          const deudaTotal = inms.reduce((a: number, i: any) =>
            a + (parseFloat(i.deuda_congelada_bs || '0') || 0) + (parseFloat(i.deuda_mmv || '0') || 0), 0);
          const saldoFavor = inms.reduce((a: number, i: any) =>
            a + (parseFloat(i.saldo_favor_bs || '0') || 0), 0);
          const codInmDet = det.cod_inmueble || pago.cod_inmueble;
          const inmPrincipal = codInmDet
            ? (inms.find((i: any) => i.cod_cont === codInmDet || i.cod_cont === codInmDet.replace(/-/g,'')) || inms[0])
            : inms[0];
          setInmueble({ ...inmPrincipal, _deudaTotal: deudaTotal, _saldoFavor: saldoFavor, _todos: inms });
        }
        const { data: facs } = await supabase.from('facturas').select('*')
          .or(`identidad.eq.${pago.identidad},identidad.eq.${idLimpio}`)
          .order('emision', { ascending: true });
        setFacturas(facs || []);
      } catch(e) { console.error(e); }
      setLoading(false);
    })();
  }, [pago.identidad]);

  const pendientes = facturas.filter(f => f.estado === 'Pendiente');
  const pagadas = facturas.filter(f => f.estado === 'Pagado');
  const totalDoc = parseFloat(String(pago.monto || '0').replace(/[^0-9.]/g, '').replace(',','.')) || 0;
  const totalPendiente = pendientes.reduce((a, f) => a + (parseFloat(String(f.monto||'0').replace(/[^0-9.]/g,''))||0), 0);
  const totalPagado = pagadas.reduce((a, f) => a + (parseFloat(String(f.monto||'0').replace(/[^0-9.]/g,''))||0), 0);

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl my-4" onClick={e => e.stopPropagation()}>
        <div className="bg-slate-100 px-6 py-4 border-b border-slate-200 flex items-center justify-between rounded-t-xl">
          <div>
            <h1 className="text-xl font-bold text-slate-800">ESTADO DE CUENTA</h1>
            <p className="text-xs text-slate-500">Generado por: {det.analista || 'Administrador'}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold text-slate-600">Nro.: {String(pago.id || '').slice(-5).padStart(5, '0')}</p>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 mt-1"><X size={18} /></button>
          </div>
        </div>
        <div className="p-6 space-y-4">
          {loading ? <div className="text-center py-12 text-slate-400">Cargando estado de cuenta...</div> : (
            <>
              {/* DATOS COMPLETOS DEL CONTRIBUYENTE */}
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="bg-slate-800 px-4 py-2">
                  <p className="text-xs font-bold text-white uppercase tracking-wide">Datos del Contribuyente</p>
                </div>
                <div className="grid grid-cols-2 gap-0 text-sm">
                  <div className="border-b border-r border-slate-100 px-3 py-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">RIF / Cédula</span>
                    <span className="font-semibold text-slate-800">{pago.identidad || '---'}</span>
                  </div>
                  <div className="border-b border-slate-100 px-3 py-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Código Inmueble</span>
                    <span className="font-semibold text-slate-800">{inmueble?.cod_cont || det.cod_inmueble || pago.cod_inmueble || '---'}</span>
                  </div>
                  <div className="border-b border-r border-slate-100 px-3 py-2 col-span-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Nombre / Razón Social</span>
                    <span className="font-bold text-slate-900 text-base">{inmueble?.contribuyente || pago.contribuyente || '---'}</span>
                  </div>
                  <div className="border-b border-r border-slate-100 px-3 py-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Clasificación / Uso</span>
                    <span className="text-slate-700">{inmueble?.clasificacion || '---'}</span>
                  </div>
                  <div className="border-b border-slate-100 px-3 py-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Actividad Principal</span>
                    <span className="text-slate-700">{inmueble?.actividad_principal || '---'}</span>
                  </div>
                  <div className="border-b border-r border-slate-100 px-3 py-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Teléfono</span>
                    <span className="text-slate-700">{inmueble?.telefono || '---'}</span>
                  </div>
                  <div className="border-b border-slate-100 px-3 py-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Correo Electrónico</span>
                    <span className="text-slate-700 text-xs">{inmueble?.correo_electronico || inmueble?.correo || '---'}</span>
                  </div>
                  <div className="border-b border-slate-100 px-3 py-2 col-span-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Dirección del Inmueble</span>
                    <span className="text-slate-700">{inmueble?.direccion || 'Tucacas Municipio Silva, Falcón'}</span>
                  </div>
                  <div className="border-r border-slate-100 px-3 py-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Estado</span>
                    <span className={`font-bold ${inmueble?.estado === 'Activo' ? 'text-green-700' : 'text-red-600'}`}>{inmueble?.estado || 'Activo'}</span>
                  </div>
                  <div className="px-3 py-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Área (Mt²)</span>
                    <span className="text-slate-700">{inmueble?.area_m2 ? inmueble.area_m2 + ' Mt²' : '---'}</span>
                  </div>
                </div>
                {/* Resumen financiero total del contribuyente */}
                <div className="grid grid-cols-3 gap-0 border-t border-slate-200">
                  <div className="bg-red-50 px-3 py-2 text-center border-r border-slate-200">
                    <p className="text-[9px] font-bold text-red-500 uppercase">Deuda Total en Sistema</p>
                    <p className="text-sm font-black text-red-700">Bs. {fmt(inmueble?._deudaTotal || 0)}</p>
                  </div>
                  <div className="bg-green-50 px-3 py-2 text-center border-r border-slate-200">
                    <p className="text-[9px] font-bold text-green-500 uppercase">Saldo a Favor</p>
                    <p className="text-sm font-black text-green-700">Bs. {fmt(inmueble?._saldoFavor || 0)}</p>
                  </div>
                  <div className="bg-blue-50 px-3 py-2 text-center">
                    <p className="text-[9px] font-bold text-blue-500 uppercase">Inmuebles Registrados</p>
                    <p className="text-sm font-black text-blue-700">{inmueble?._todos?.length || 1}</p>
                  </div>
                </div>
              </div>
              <div>
                <div className="bg-slate-200 px-3 py-1.5 font-bold text-sm text-slate-700 text-center uppercase mb-2 rounded">Estado de Cuenta Resumido</div>
                <div className="space-y-1 text-sm px-2">
                  <div className="flex justify-between">
                    <span className="text-blue-600 font-semibold">Periodos Calculados ({pendientes.length}):</span>
                    <span className="font-bold">{pendientes.map(f => { const p = (f.emision||'').split('-'); return p.length>=2 ? mesesNombre[parseInt(p[1])-1]+'-'+p[0] : f.emision; }).join(', ') || '---'}</span>
                  </div>
                  <div className="flex justify-between"><span className="text-blue-600">Monto del Pago Reportado Bs.:</span><span className="font-bold">{fmt(totalDoc)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-600">Total Facturas Pendientes:</span><span className="text-red-600 font-semibold">{fmt(totalPendiente)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-600">Total Facturas Pagadas:</span><span className="text-green-600 font-semibold">{fmt(totalPagado)}</span></div>
                  <div className="flex justify-between"><span className="text-blue-600">Total Exento Bs.:</span><span>{fmt(totalDoc)}</span></div>
                  <div className="flex justify-between"><span>Base Imponible Bs.:</span><span>0,00</span></div>
                  <div className="flex justify-between"><span>IVA (16.00%) Bs.:</span><span>0,00</span></div>
                  <div className="flex justify-between border-t pt-1 mt-1"><span className="font-semibold">Total estado de cuenta Bs.:</span><span className="font-bold">{fmt(totalDoc)}</span></div>
                </div>
              </div>
              <div className="bg-slate-50 border border-slate-300 rounded-lg px-4 py-3 flex justify-between items-center">
                <span className="text-lg font-bold text-slate-800 uppercase">Total a Pagar</span>
                <span className="text-xl font-bold text-slate-900">Bs. {fmt(totalDoc)}</span>
              </div>
              <div>
                <div className="bg-slate-200 px-3 py-1.5 font-bold text-sm text-slate-700 text-center uppercase mb-2 rounded">Estado de Cuenta Detallado</div>
                <table className="w-full text-xs border border-slate-200 rounded">
                  <thead className="bg-slate-100">
                    <tr>{['Periodo','Detalle','Recoleccion','Int Rec','Multa','IVA','Total BS'].map(h=><th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {pendientes.length > 0 ? pendientes.map((f,i) => {
                      const m = parseFloat(String(f.monto||'0').replace(/[^0-9.]/g,''));
                      return (
                        <tr key={i} className="border-t border-slate-100 hover:bg-slate-50">
                          <td className="px-3 py-2">{f.emision||'---'}</td>
                          <td className="px-3 py-2">{inmueble?.clasificacion ? 'Aseo '+inmueble.clasificacion : 'Aseo urbano'}</td>
                          <td className="px-3 py-2 text-right">{fmt(m)}</td>
                          <td className="px-3 py-2 text-right">0,00</td><td className="px-3 py-2 text-right">0,00</td>
                          <td className="px-3 py-2 text-right">0,00</td><td className="px-3 py-2 text-right font-bold">{fmt(m)}</td>
                        </tr>
                      );
                    }) : <tr><td colSpan={7} className="px-3 py-4 text-center text-slate-400">Sin facturas pendientes</td></tr>}
                  </tbody>
                </table>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-600">
                <p className="font-bold text-slate-700 mb-1 uppercase text-[11px]">Informacion para pagos y transferencias</p>
                <p><span className="font-semibold">Banco:</span> BANESCO (0134)</p>
                <p><span className="font-semibold">Cta:</span> 01340415144151031715</p>
                <p className="mt-1 italic">Pagos a nombre de: <strong>INST SOC MUN PARA EL AMBIENTE R.I.F.: G-200076739</strong></p>
              </div>
            </>
          )}
        </div>
        <div className="flex justify-end gap-3 px-6 pb-4">
          <button onClick={() => window.print()} className="px-5 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded font-semibold text-sm">Imprimir</button>
          <button onClick={onClose} className="px-5 py-2 border border-red-400 text-red-600 hover:bg-red-50 rounded font-semibold text-sm flex items-center gap-2"><X size={14}/> Cerrar</button>
        </div>
      </div>
    </div>
  );
}

// ─── MODAL CONCILIACION ──────────────────────────────────
function ModalConciliacion({ pago, onClose, onSuccess }: { pago: Pago; onClose: () => void; onSuccess: () => void }) {
  const det = parseDetalles(pago.detalles);

  // Información del contribuyente cargada desde Supabase (solo lectura)
  const [contribInfo, setContribInfo] = useState<any>(null);
  const [loadingContrib, setLoadingContrib] = useState(true);

  // Normalizar monto reportado (quitar formato venezolano)
  const montoReportadoNum = parseFloat(
    String(pago.monto || '0').replace(/./g, '').replace(',', '.')
  ) || parseFloat(String(pago.monto || '0').replace(/[^0-9.]/g, '')) || 0;

  const [estatus, setEstatus] = useState<string>(
    ['Aprobado','Rechazado','Con Diferencia'].includes(pago.estado || '')
      ? (pago.estado || 'Aprobado')
      : 'Aprobado'
  );
  // Monto conciliado: auto-fill segun estatus
  const [montoConciliado, setMontoConciliado] = useState<string>(
    String(det.monto_conciliado || montoReportadoNum.toFixed(2))
  );
  const [bancoEmisor, setBancoEmisor] = useState(pago.banco || '');
  const [bancoReceptor, setBancoReceptor] = useState(pago.banco_destino || 'BANESCO - 0134 - 1715');
  const [referenciaOrigen, setReferenciaOrigen] = useState(pago.referencia || '');
  const [correoResponsable, setCorreoResponsable] = useState(det.correo || '');
  const [telefonoResponsable, setTelefonoResponsable] = useState(det.telefono || '');
  const [fechaTransaccion, setFechaTransaccion] = useState(det.fecha_transaccion || new Date().toISOString().split('T')[0]);
  const [fechaBanco, setFechaBanco] = useState(det.fecha_banco || new Date().toISOString().split('T')[0]);
  const [enviarCorreo, setEnviarCorreo] = useState(true);
  const [observaciones, setObservaciones] = useState(det.observaciones || '');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showComp, setShowComp] = useState(false);
  const [showEdo, setShowEdo] = useState(false);

  const bancosVenezuela = [
    '100% Banco','Bancamiga','Bancaribe','Banco Activo','Banco Agricola de Venezuela',
    'Banco Bicentenario','Banco Caroni','Banco de Venezuela','Banco del Tesoro',
    'Banco Exterior','Banco Mercantil','Banco Nacional de Credito BNC','Banco Plaza',
    'Banco Provincial','Banco Sofitasa','Banesco','Banplus','Bancrecer','Mi Banco',
  ].sort();

  // Cargar TODA la info del contribuyente desde inmuebles
  useEffect(() => {
    (async () => {
      setLoadingContrib(true);
      try {
        const idLimpio = (pago.identidad || '').replace(/-/g, '');
        // Buscar en inmuebles - puede haber múltiples registros (varios inmuebles)
        const { data: inms } = await supabase
          .from('inmuebles')
          .select('*')
          .or(`identidad.eq.${pago.identidad},identidad.eq.${idLimpio}`);

        // Buscar el inmueble que coincide con el cod_inmueble del pago si existe
        const detCod = det.cod_inmueble || pago.cod_inmueble;
        let inm = null;
        if (inms && inms.length > 0) {
          if (detCod) {
            inm = inms.find((i: any) => i.cod_cont === detCod || i.cod_cont === detCod.replace(/-/g,'')) || inms[0];
          } else {
            inm = inms[0];
          }
        }

        if (inm) {
          // Calcular deuda total de todos sus inmuebles
          const deudaTotal = (inms || []).reduce((acc: number, i: any) => {
            return acc + (parseFloat(i.deuda_congelada_bs || '0') || 0) + (parseFloat(i.deuda_mmv || '0') || 0);
          }, 0);
          const saldoFavor = (inms || []).reduce((acc: number, i: any) => {
            return acc + (parseFloat(i.saldo_favor_bs || '0') || 0);
          }, 0);
          setContribInfo({
            ...inm,
            _deudaTotal: deudaTotal,
            _saldoFavor: saldoFavor,
            _totalInmuebles: (inms || []).length,
            _todosInmuebles: inms || [],
          });
          if (!correoResponsable && (inm.correo_electronico || inm.correo)) {
            setCorreoResponsable(inm.correo_electronico || inm.correo);
          }
          if (!telefonoResponsable && inm.telefono) setTelefonoResponsable(inm.telefono);
        } else {
          // Fallback: buscar factura por identidad para obtener nombre
          const { data: fac } = await supabase
            .from('facturas')
            .select('contribuyente, identidad')
            .eq('identidad', pago.identidad)
            .limit(1)
            .maybeSingle();
          if (fac) setContribInfo({ contribuyente: fac.contribuyente, identidad: fac.identidad, _fallback: true });
        }
      } catch(e) { console.error('[Conciliacion] Error cargando contribuyente:', e); }
      setLoadingContrib(false);
    })();
  }, [pago.identidad]);

  // Auto-fill monto conciliado cuando cambia estatus
  const handleEstatusChange = (val: string) => {
    setEstatus(val);
    if (val === 'Aprobado') {
      // Auto-llenar con el monto reportado
      setMontoConciliado(montoReportadoNum.toFixed(2));
    } else if (val === 'Rechazado') {
      setMontoConciliado('0.00');
    }
    // 'Con Diferencia' → el usuario ingresa manualmente el monto de diferencia
  };

  const recibos: string[] = det.recibos || [];
  const periodos = det.periodos || (recibos.length > 0 ? recibos.join(' | ') : '---');

  const handleConciliar = async () => {
    setIsProcessing(true);
    try {
      const montoConciliadoNum = parseFloat(montoConciliado) || 0;
      const updatedDet = {
        ...det,
        correo: correoResponsable,
        telefono: telefonoResponsable,
        fecha_transaccion: fechaTransaccion,
        fecha_banco: fechaBanco,
        monto_conciliado: montoConciliado,
        observaciones,
        enviar_correo: enviarCorreo,
        cod_inmueble: det.cod_inmueble || pago.cod_inmueble || contribInfo?.codigo,
        analista: typeof window !== 'undefined' ? localStorage.getItem('adminUser') || 'Administrador' : 'Administrador',
      };

      // Actualizar el pago
      const { error } = await supabase.from('pagos_reportados').update({
        estado: estatus,
        banco: bancoEmisor,
        banco_destino: bancoReceptor,
        tipo: pago.tipo,
        detalles: updatedDet,
      }).eq('id', pago.id);
      if (error) throw error;

      // Aprobado: marcar facturas como Pagado
      if (estatus === 'Aprobado' && recibos.length > 0) {
        await supabase.from('facturas').update({ estado: 'Pagado' }).in('referencia', recibos);
      }

      // Con Diferencia: agregar monto de diferencia como saldo a favor
      if (estatus === 'Con Diferencia' && montoConciliadoNum > 0) {
        // Buscar inmueble del contribuyente para actualizar saldo_favor_bs
        const { data: inmList } = await supabase
          .from('inmuebles')
          .select('id, saldo_favor_bs')
          .eq('identidad', pago.identidad);
        if (inmList && inmList.length > 0) {
          const inm = inmList[0];
          const saldoActual = parseFloat(inm.saldo_favor_bs || '0') || 0;
          const nuevoSaldo = saldoActual + montoConciliadoNum;
          await supabase.from('inmuebles').update({ saldo_favor_bs: nuevoSaldo }).eq('id', inm.id);
          // Registrar en documentos como Nota de Credito
          await supabase.from('documentos').insert([{
            identidad: pago.identidad,
            contribuyente: pago.contribuyente || contribInfo?.Contribuyente || contribInfo?.nombre || '',
            tipo: 'Nota de Credito',
            estado: 'Vigente',
            detalles: JSON.stringify({
              monto: montoConciliadoNum.toFixed(2),
              origen_referencia: `Conciliación con diferencia. Referencia: ${pago.referencia || pago.id}`,
              fecha_emision: new Date().toISOString(),
              analista: updatedDet.analista,
            })
          }]);
        }
        // Marcar facturas como Pagado también (el pago se concilia aunque con diferencia)
        if (recibos.length > 0) {
          await supabase.from('facturas').update({ estado: 'Pagado' }).in('referencia', recibos);
        }
      }

      alert('Conciliacion guardada exitosamente.');
      onSuccess();
    } catch (e: any) { alert('Error al conciliar: ' + e.message); }
    setIsProcessing(false);
  };

  const ic = "w-full border border-slate-300 rounded px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500";
  const icRO = "w-full border border-slate-200 rounded px-3 py-1.5 text-sm bg-slate-50 text-slate-700 cursor-not-allowed font-medium";
  const lc = "block text-xs font-semibold text-blue-600 mb-1";

  // Campos reales en la tabla inmuebles: contribuyente (min), cod_cont, direccion, clasificacion, etc.
  const nombreContrib = contribInfo?.contribuyente || contribInfo?.Contribuyente || pago.contribuyente || '---';
  const codInmueble = det.cod_inmueble || pago.cod_inmueble || contribInfo?.cod_cont || contribInfo?.CodCont || '---';
  const direccion = contribInfo?.direccion || contribInfo?.Direccion || '---';
  const clasificacion = contribInfo?.clasificacion || contribInfo?.Clasificacion || '---';
  const identidad = pago.identidad || '---';
  const telefono = contribInfo?.telefono || '---';
  const correo = contribInfo?.correo_electronico || contribInfo?.correo || '---';
  const actividadPrincipal = contribInfo?.actividad_principal || contribInfo?.Actividad || '---';
  const saldoFavor = (contribInfo?._saldoFavor || 0).toFixed(2);
  const deudaTotal = (contribInfo?._deudaTotal || 0).toFixed(2);
  const totalInmuebles = contribInfo?._totalInmuebles || 1;
  const estadoCont = contribInfo?.estado || 'Activo';

  const estatusColor: Record<string,string> = {
    Aprobado: 'bg-green-100 border-green-400',
    Rechazado: 'bg-red-100 border-red-400',
    'Con Diferencia': 'bg-amber-100 border-amber-400',
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-40 flex items-center justify-center p-4 overflow-y-auto" onClick={onClose}>
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl my-4" onClick={e => e.stopPropagation()}>
          <div className="text-center py-4 border-b border-slate-200 bg-slate-50 rounded-t-xl">
            <h2 className="text-xl font-bold text-slate-800 uppercase tracking-wider">Conciliacion de Pagos</h2>
          </div>
          <div className="p-6 space-y-4">

            {/* INFO CONTRIBUYENTE — Solo lectura - TODOS los datos */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold text-blue-700 uppercase tracking-wide flex items-center gap-2">
                  <Building2 size={14}/> Información del Contribuyente
                  {loadingContrib && <span className="text-[10px] text-blue-400 font-normal animate-pulse">(cargando...)</span>}
                </p>
                <div className="flex gap-2 text-[10px]">
                  <span className={`px-2 py-0.5 rounded-full font-bold ${estadoCont === 'Activo' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{estadoCont}</span>
                  <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-bold">{totalInmuebles} inmueble{totalInmuebles !== 1 ? 's' : ''}</span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={lc}>RIF / Cédula</label>
                  <input value={identidad} readOnly className={icRO}/>
                </div>
                <div>
                  <label className={lc}>Nombre / Razón Social</label>
                  <input value={nombreContrib} readOnly className={icRO}/>
                </div>
                <div>
                  <label className={lc}>Código Inmueble</label>
                  <input value={codInmueble} readOnly className={icRO}/>
                </div>
                <div>
                  <label className={lc}>Clasificación</label>
                  <input value={clasificacion} readOnly className={icRO}/>
                </div>
                <div>
                  <label className={lc}>Actividad Principal</label>
                  <input value={actividadPrincipal} readOnly className={icRO}/>
                </div>
                <div>
                  <label className={lc}>Estado</label>
                  <input value={estadoCont} readOnly className={`${icRO} ${estadoCont === 'Activo' ? 'text-green-700' : 'text-red-700'} font-bold`}/>
                </div>
                <div className="col-span-2">
                  <label className={lc}>Dirección</label>
                  <input value={direccion} readOnly className={icRO}/>
                </div>
                <div>
                  <label className={lc}>Teléfono</label>
                  <input value={telefono} readOnly className={icRO}/>
                </div>
                <div className="col-span-2">
                  <label className={lc}>Correo Electrónico</label>
                  <input value={correo} readOnly className={icRO}/>
                </div>
              </div>
              {/* Resumen financiero */}
              <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-blue-200">
                <div className="bg-red-50 border border-red-200 rounded p-2 text-center">
                  <p className="text-[10px] text-red-500 font-bold uppercase">Deuda Total en Sistema</p>
                  <p className="text-sm font-black text-red-700">Bs. {fmt(parseFloat(deudaTotal))}</p>
                </div>
                <div className="bg-green-50 border border-green-200 rounded p-2 text-center">
                  <p className="text-[10px] text-green-500 font-bold uppercase">Saldo a Favor</p>
                  <p className="text-sm font-black text-green-700">Bs. {fmt(parseFloat(saldoFavor))}</p>
                </div>
              </div>
            </div>

            {/* DATOS DEL PAGO */}
            <div className="grid grid-cols-3 gap-4">
              <div><label className={lc}>Forma de Pago</label>
                <input value={pago.tipo || '---'} readOnly className={icRO}/>
              </div>
              <div><label className={lc}>Banco Emisor</label>
                <select value={bancoEmisor} onChange={e=>setBancoEmisor(e.target.value)} className={ic}>
                  <option value="">-- Seleccionar --</option>
                  {bancosVenezuela.map(b=><option key={b}>{b}</option>)}
                </select>
              </div>
              <div><label className={lc}>Referencia Origen</label>
                <input value={referenciaOrigen} onChange={e=>setReferenciaOrigen(e.target.value)} className={ic}/>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div><label className={lc}>Banco Receptor</label>
                <select value={bancoReceptor} onChange={e=>setBancoReceptor(e.target.value)} className={ic}>
                  {BANCOS_DESTINO.filter(b=>b!=='Todos').map(b=><option key={b}>{b}</option>)}
                </select>
              </div>
              <div><label className={lc}>Fecha Transacción</label>
                <input type="date" value={fechaTransaccion} onChange={e=>setFechaTransaccion(e.target.value)} className={ic}/>
              </div>
              <div><label className={lc}>Fecha en Banco</label>
                <input type="date" value={fechaBanco} onChange={e=>setFechaBanco(e.target.value)} className={ic}/>
              </div>
            </div>

            {/* CONCILIACIÓN */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className={lc}>Monto Reportado</label>
                <input value={fmt(montoReportadoNum)} readOnly className={icRO + ' font-bold text-slate-800'}/>
              </div>
              <div>
                <label className={lc}>Estatus de Conciliación</label>
                <select
                  value={estatus}
                  onChange={e => handleEstatusChange(e.target.value)}
                  className={`${ic} font-semibold ${estatus === 'Aprobado' ? 'text-green-700 bg-green-50 border-green-400' : estatus === 'Rechazado' ? 'text-red-700 bg-red-50 border-red-400' : 'text-amber-700 bg-amber-50 border-amber-400'}`}
                >
                  {ESTATUS_CONCILIAR.map(s=><option key={s}>{s}</option>)}
                </select>
                {estatus === 'Con Diferencia' && (
                  <p className="text-[10px] text-amber-600 mt-1 font-medium">
                    ⚠️ El monto ingresado se agregará como saldo a favor del contribuyente.
                  </p>
                )}
              </div>
              <div>
                <label className={lc}>
                  {estatus === 'Con Diferencia' ? 'Monto de Diferencia (→ Saldo a Favor)' : 'Monto Conciliado'}
                </label>
                <input
                  value={montoConciliado}
                  onChange={e => setMontoConciliado(e.target.value)}
                  readOnly={estatus === 'Aprobado'}
                  className={`${estatus === 'Aprobado' ? icRO + ' font-bold text-green-800' : ic} ${estatus === 'Con Diferencia' ? 'border-amber-400 bg-amber-50' : ''}`}
                  type="number"
                  step="0.01"
                  min="0"
                />
              </div>
            </div>

            {/* RESPONSABLE */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={lc}>Correo Responsable</label>
                <div className="flex gap-1">
                  <input value={correoResponsable} onChange={e=>setCorreoResponsable(e.target.value)} className={ic}/>
                  <span className="text-blue-500 px-1 flex items-center"><Mail size={16}/></span>
                </div>
              </div>
              <div>
                <label className={lc}>Teléfono Responsable</label>
                <input value={telefonoResponsable} onChange={e=>setTelefonoResponsable(e.target.value)} className={ic}/>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-sm font-semibold text-slate-600 mb-2">Notificar al Usuario?</p>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={enviarCorreo} onChange={e=>setEnviarCorreo(e.target.checked)} className="w-4 h-4 accent-blue-600"/>
                  <span className="text-sm font-medium text-slate-700">Enviar Correo</span>
                </label>
              </div>
              <div>
                <textarea value={observaciones} onChange={e=>setObservaciones(e.target.value)} rows={3}
                  placeholder="Observaciones (se copian al correo del usuario)"
                  className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"/>
              </div>
            </div>

            {/* RESUMEN */}
            <div className={`border rounded-lg p-4 ${estatusColor[estatus] || 'bg-slate-50 border-slate-200'}`}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-500">Periodo(s)</span>
                <span className="font-mono text-slate-700 text-xs">{periodos}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-blue-600 font-semibold">Total Documento</span>
                <span className="text-blue-600 font-bold">{fmt(montoReportadoNum)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-green-600 font-semibold">Total Retenciones</span>
                <span className="text-green-600 font-bold">0,00</span>
              </div>
              <div className="flex justify-between text-sm border-t pt-1 mt-1">
                <span className="font-bold text-slate-800">Total a Pagar</span>
                <span className="font-bold text-slate-800">{fmt(montoReportadoNum)}</span>
              </div>
              {estatus === 'Con Diferencia' && parseFloat(montoConciliado) > 0 && (
                <div className="flex justify-between text-sm border-t pt-1 mt-1 text-amber-700 font-bold">
                  <span>Saldo a Favor a Acreditar</span>
                  <span>+ {fmt(parseFloat(montoConciliado))}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-between items-center px-6 pb-5">
            <div className="flex gap-2">
              <button onClick={()=>setShowComp(true)} className="px-4 py-2 border border-red-500 text-red-600 hover:bg-red-50 rounded font-semibold text-sm">Ver Comprobante</button>
              <button onClick={()=>setShowEdo(true)} className="px-4 py-2 border border-red-500 text-red-600 hover:bg-red-50 rounded font-semibold text-sm">Ver Estado de Cuenta</button>
            </div>
            <div className="flex gap-2">
              <button onClick={onClose} className="px-4 py-2 border border-slate-400 text-slate-600 hover:bg-slate-50 rounded font-semibold text-sm flex items-center gap-1"><X size={14}/> Cerrar</button>
              <button onClick={handleConciliar} disabled={isProcessing} className="px-5 py-2 bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 rounded font-bold text-sm flex items-center gap-2">
                {isProcessing ? <RefreshCw size={14} className="animate-spin"/> : <CheckCheck size={14}/>} Conciliar
              </button>
            </div>
          </div>
        </div>
      </div>
      {showComp && <ModalComprobante pago={pago} onClose={()=>setShowComp(false)}/>}
      {showEdo && <ModalEstadoCuenta pago={pago} onClose={()=>setShowEdo(false)}/>}
    </>
  );
}

// ─── PAGINA PRINCIPAL ────────────────────────────────────
export default function ConciliacionPage() {
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [loading, setLoading] = useState(false);
  const [filtros, setFiltros] = useState<Filtros>({
    desde: new Date().toISOString().split('T')[0],
    hasta: new Date().toISOString().split('T')[0],
    estatus: 'Todos', bancoDestino: 'Todos', formaPago: 'Todos', referencia: '', monto: '',
  });
  const [pagoSel, setPagoSel] = useState<Pago | null>(null);
  const [mode, setMode] = useState<'conciliar'|'comprobante'|'edoCuenta'|null>(null);

  const fetchPagos = useCallback(async () => {
    setLoading(true);
    try {
      let q = supabase.from('pagos_reportados').select('*').order('created_at', { ascending: false }).limit(500);
      if (filtros.desde) q = q.gte('created_at', filtros.desde + 'T00:00:00');
      if (filtros.hasta) q = q.lte('created_at', filtros.hasta + 'T23:59:59');
      if (filtros.estatus !== 'Todos') q = q.eq('estado', filtros.estatus);
      if (filtros.formaPago !== 'Todos') q = q.eq('tipo', filtros.formaPago);
      if (filtros.referencia) q = q.ilike('referencia', '%' + filtros.referencia + '%');
      if (filtros.monto) q = q.eq('monto', filtros.monto);
      const { data } = await q;
      let result = data || [];
      if (filtros.bancoDestino !== 'Todos') {
        result = result.filter((p: any) => {
          const det = parseDetalles(p.detalles);
          return (p.banco_destino || det.banco_destino || '').includes(filtros.bancoDestino.split(' - ')[0]);
        });
      }
      setPagos(result);
    } catch(e) { console.error(e); }
    setLoading(false);
  }, [filtros]);

  useEffect(() => { fetchPagos(); }, []);

  const abrir = (pago: Pago, m: 'conciliar'|'comprobante'|'edoCuenta') => { setPagoSel(pago); setMode(m); };
  const cerrar = () => { setPagoSel(null); setMode(null); };
  const onSuccess = () => { cerrar(); fetchPagos(); };

  const estatusCls = (e: string) => {
    if (e === 'Aprobado') return 'text-green-600 font-bold';
    if (e === 'Por Verificar' || e === 'Pendiente') return 'text-yellow-600 font-bold';
    if (e === 'Rechazado') return 'text-red-600 font-bold';
    return 'text-slate-600';
  };

  const filas: React.ReactNode[] = [];
  pagos.forEach((pago, idx) => {
    const det = parseDetalles(pago.detalles);
    const docInfo = 'id pago => ' + pago.id + ' Documento Nro. => ' + (det.doc_nro || '') + ' Responsable => ' + (det.responsable || '') + ' Analista => ' + (det.analista || '');
    const esPendiente = pago.estado === 'Por Verificar' || pago.estado === 'Pendiente';
    const esAprobado = pago.estado === 'Aprobado';
    const m = parseFloat(String(pago.monto||'0').replace(/[^0-9.]/g,''));
    filas.push(
      <tr key={'doc'+idx} className="bg-slate-100 border-t border-slate-200">
        <td colSpan={10} className="px-3 py-1 text-xs text-slate-600 font-mono truncate">{docInfo}</td>
      </tr>,
      <tr key={'d'+idx} className="hover:bg-blue-50/30 transition-colors border-b border-slate-100">
        <td className="px-3 py-2 text-xs font-mono text-slate-700">{pago.identidad}</td>
        <td className="px-3 py-2 text-xs text-slate-600">{det.cod_inmueble || pago.cod_inmueble || '---'}</td>
        <td className="px-3 py-2 text-xs font-mono text-slate-600">{pago.referencia || '---'}</td>
        <td className="px-3 py-2 text-xs text-slate-500 whitespace-nowrap">{fmtFecha(pago.created_at)}</td>
        <td className="px-3 py-2 text-xs text-slate-500 whitespace-nowrap">{det.fecha_transaccion || (pago.fecha_transaccion||'').split('T')[0] || '---'}</td>
        <td className="px-3 py-2 text-xs text-slate-600">{pago.tipo || '---'}</td>
        <td className="px-3 py-2 text-xs text-slate-600">{pago.banco || '---'}</td>
        <td className="px-3 py-2 text-xs text-slate-600">{pago.banco_destino || det.banco_destino || 'BANESCO - 0134 - 1715'}</td>
        <td className={'px-3 py-2 text-xs '+estatusCls(pago.estado||'')}>{pago.estado || '---'}</td>
        <td className="px-3 py-2 text-sm font-bold text-right text-slate-800">
          <div className="flex items-center justify-end gap-2">
            <span>{fmt(m)}</span>
            {esPendiente && <button onClick={()=>abrir(pago,'conciliar')} title="Conciliar pago" className="text-slate-500 hover:text-blue-700 transition-colors"><Landmark size={18}/></button>}
            {esAprobado && det.comprobante_url && <button onClick={()=>abrir(pago,'comprobante')} title="Ver comprobante" className="text-blue-600 hover:text-blue-800 transition-colors"><Eye size={18}/></button>}
            {esAprobado && !det.comprobante_url && <button onClick={()=>abrir(pago,'conciliar')} title="Editar" className="text-green-600 hover:text-green-800 transition-colors"><Pencil size={16}/></button>}
          </div>
        </td>
      </tr>
    );
  });

  return (
    <div className="space-y-4 max-w-[1600px] mx-auto p-4">
      <div className="flex items-center gap-3 border-b border-slate-200 pb-3">
        <CheckCheck className="w-7 h-7 text-slate-700"/>
        <h1 className="text-2xl font-bold text-slate-800 uppercase tracking-wide">Conciliacion</h1>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-slate-50 rounded-t-xl">
          <span className="font-bold text-slate-700 text-sm uppercase tracking-wide flex items-center gap-2"><Filter size={15}/> Seleccione los Filtros</span>
          <button onClick={fetchPagos} disabled={loading} className="flex items-center gap-2 bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-2 rounded-lg font-semibold text-sm transition-colors disabled:opacity-50">
            <Filter size={14}/> {loading ? 'Cargando...' : 'Aplicar Filtros'}
          </button>
        </div>
        <div className="p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 items-end">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Rango de Fechas</label>
            <div className="flex gap-1">
              <input type="date" value={filtros.desde} onChange={e=>setFiltros(f=>({...f,desde:e.target.value}))} className="w-full border border-slate-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-400"/>
              <input type="date" value={filtros.hasta} onChange={e=>setFiltros(f=>({...f,hasta:e.target.value}))} className="w-full border border-slate-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-400"/>
            </div>
          </div>
          <div><label className="block text-xs font-semibold text-slate-500 mb-1">Estatus</label><select value={filtros.estatus} onChange={e=>setFiltros(f=>({...f,estatus:e.target.value}))} className="w-full border border-slate-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-400">{ESTATUS_LIST.map(s=><option key={s}>{s}</option>)}</select></div>
          <div><label className="block text-xs font-semibold text-slate-500 mb-1">Banco Destino</label><select value={filtros.bancoDestino} onChange={e=>setFiltros(f=>({...f,bancoDestino:e.target.value}))} className="w-full border border-slate-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-400">{BANCOS_DESTINO.map(b=><option key={b}>{b}</option>)}</select></div>
          <div><label className="block text-xs font-semibold text-slate-500 mb-1">Forma de pago</label><select value={filtros.formaPago} onChange={e=>setFiltros(f=>({...f,formaPago:e.target.value}))} className="w-full border border-slate-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-400">{FORMAS_PAGO.map(fp=><option key={fp}>{fp}</option>)}</select></div>
          <div><label className="block text-xs font-semibold text-slate-500 mb-1">Referencia de Pago</label><input value={filtros.referencia} onChange={e=>setFiltros(f=>({...f,referencia:e.target.value}))} placeholder="Referencia..." className="w-full border border-slate-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-400"/></div>
          <div><label className="block text-xs font-semibold text-slate-500 mb-1">Monto</label><input value={filtros.monto} onChange={e=>setFiltros(f=>({...f,monto:e.target.value}))} placeholder="Monto exacto" type="number" className="w-full border border-slate-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-400"/></div>
        </div>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-400"><RefreshCw size={24} className="animate-spin mr-3"/> Cargando pagos...</div>
        ) : pagos.length === 0 ? (
          <div className="text-center py-16 text-slate-400"><Building2 size={40} className="mx-auto mb-3 opacity-30"/><p>No se encontraron pagos. Aplique filtros y haga clic en "Aplicar Filtros".</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-100 border-b border-slate-300">
                <tr>{['Identidad','Inmueble','Referencia','Reportado','Transaccion','Tipo','Banco Orig','Banco Dest','Estatus','Monto'].map(h=><th key={h} className="px-3 py-2 text-[11px] font-bold text-slate-600 uppercase tracking-wide">{h}</th>)}</tr>
              </thead>
              <tbody>{filas}</tbody>
            </table>
          </div>
        )}
        {!loading && pagos.length > 0 && <div className="px-4 py-2 border-t border-slate-100 text-xs text-slate-400 bg-slate-50">{pagos.length} registro(s) encontrados</div>}
      </div>
      {pagoSel && mode === 'conciliar' && <ModalConciliacion pago={pagoSel} onClose={cerrar} onSuccess={onSuccess}/>}
      {pagoSel && mode === 'comprobante' && <ModalComprobante pago={pagoSel} onClose={cerrar}/>}
      {pagoSel && mode === 'edoCuenta' && <ModalEstadoCuenta pago={pagoSel} onClose={cerrar}/>}
    </div>
  );
}
