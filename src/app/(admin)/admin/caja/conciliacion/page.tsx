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
      const codInm = det.cod_inmueble || pago.cod_inmueble;
      if (codInm) {
        const { data: inm } = await supabase.from('inmuebles').select('*').eq('codigo', codInm).maybeSingle();
        setInmueble(inm);
      }
      const { data: facs } = await supabase.from('facturas').select('*')
        .eq('identidad', pago.identidad).order('emision', { ascending: true });
      setFacturas(facs || []);
      setLoading(false);
    })();
  }, [pago.identidad]);

  const pendientes = facturas.filter(f => f.estado === 'Pendiente');
  const totalDoc = parseFloat(String(pago.monto || '0').replace(/[^0-9.]/g, '')) || 0;

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
              <div className="grid grid-cols-2 gap-2 text-sm border border-slate-200 rounded-lg p-3">
                <div><span className="font-semibold text-slate-600">Codigo:</span> {det.cod_inmueble || pago.cod_inmueble || '---'}</div>
                <div><span className="font-semibold text-slate-600">Uso:</span> {inmueble?.clasificacion || '---'}</div>
                <div><span className="font-semibold text-slate-600">Area Operativa:</span> {inmueble?.area_m2 ? inmueble.area_m2 + ' Mt2' : '---'}</div>
                <div><span className="font-semibold text-slate-600">Identidad:</span> {pago.identidad}</div>
                <div className="col-span-2"><span className="font-semibold text-slate-600">Nombre o Razon Social:</span> <strong>{pago.contribuyente || '---'}</strong></div>
                <div className="col-span-2"><span className="font-semibold text-slate-600">Direccion Inmueble:</span> <span className="text-slate-600">{inmueble?.direccion || 'Tucacas Municipio Silva, Falcon'}</span></div>
              </div>
              <div>
                <div className="bg-slate-200 px-3 py-1.5 font-bold text-sm text-slate-700 text-center uppercase mb-2 rounded">Estado de Cuenta Resumido</div>
                <div className="space-y-1 text-sm px-2">
                  <div className="flex justify-between">
                    <span className="text-blue-600 font-semibold">Periodos Calculados ({pendientes.length}):</span>
                    <span className="font-bold">{pendientes.map(f => { const p = (f.emision||'').split('-'); return p.length>=2 ? mesesNombre[parseInt(p[1])-1]+'-'+p[0] : f.emision; }).join(', ') || '---'}</span>
                  </div>
                  <div className="flex justify-between"><span className="text-blue-600">Monto Recoleccion Aseo Urbano Bs.:</span><span>{fmt(totalDoc)}</span></div>
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
  const [form, setForm] = useState({
    formaPago: pago.tipo || 'Transferencia',
    codInmueble: det.cod_inmueble || pago.cod_inmueble || '',
    nombreContribuyente: pago.contribuyente || '',
    bancoEmisor: pago.banco || '',
    referenciaOrigen: pago.referencia || '',
    bancoReceptor: pago.banco_destino || 'BANESCO - 0134 - 1715',
    referenciaDestino: det.referencia_destino || '',
    montoReportado: String(pago.monto || '0'),
    estatus: pago.estado || 'Por Verificar',
    montoConciliado: String(det.monto_conciliado || '0.00'),
    correoResponsable: pago.correo || det.correo || '',
    telefonoResponsable: pago.telefono || det.telefono || '',
    fechaTransaccion: det.fecha_transaccion || new Date().toISOString().split('T')[0],
    fechaBanco: det.fecha_banco || new Date().toISOString().split('T')[0],
    enviarCorreo: true,
    observaciones: det.observaciones || '',
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [showComp, setShowComp] = useState(false);
  const [showEdo, setShowEdo] = useState(false);

  const bancosVenezuela = [
    '100% Banco','Bancamiga','Bancaribe','Banco Activo','Banco Agricola de Venezuela',
    'Banco Bicentenario','Banco Caroni','Banco de Venezuela','Banco del Tesoro',
    'Banco Exterior','Banco Mercantil','Banco Nacional de Credito BNC','Banco Plaza',
    'Banco Provincial','Banco Sofitasa','Banesco','Banplus','Bancrecer','Mi Banco',
  ].sort();

  const recibos: string[] = det.recibos || [];
  const periodos = det.periodos || (recibos.length > 0 ? recibos.join(' | ') : '---');
  const totalDoc = parseFloat(form.montoReportado.replace(/[^0-9.]/g,'')) || 0;

  const handleConciliar = async () => {
    setIsProcessing(true);
    try {
      const updatedDet = { ...det, correo: form.correoResponsable, telefono: form.telefonoResponsable, fecha_transaccion: form.fechaTransaccion, fecha_banco: form.fechaBanco, referencia_destino: form.referenciaDestino, monto_conciliado: form.montoConciliado, observaciones: form.observaciones, enviar_correo: form.enviarCorreo, cod_inmueble: form.codInmueble };
      const { error } = await supabase.from('pagos_reportados').update({ estado: form.estatus, banco: form.bancoEmisor, banco_destino: form.bancoReceptor, tipo: form.formaPago, detalles: updatedDet }).eq('id', pago.id);
      if (error) throw error;
      if (form.estatus === 'Aprobado' && recibos.length > 0) {
        await supabase.from('facturas').update({ estado: 'Pagado' }).in('referencia', recibos);
      }
      alert('Conciliacion guardada exitosamente.');
      onSuccess();
    } catch (e: any) { alert('Error al conciliar: ' + e.message); }
    setIsProcessing(false);
  };

  const ic = "w-full border border-slate-300 rounded px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500";
  const lc = "block text-xs font-semibold text-blue-600 mb-1";

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-40 flex items-center justify-center p-4 overflow-y-auto" onClick={onClose}>
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl my-4" onClick={e => e.stopPropagation()}>
          <div className="text-center py-4 border-b border-slate-200 bg-slate-50 rounded-t-xl">
            <h2 className="text-xl font-bold text-slate-800 uppercase tracking-wider">Conciliacion de Pagos</h2>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div><label className={lc}>Forma de Pago</label><select value={form.formaPago} onChange={e=>setForm(p=>({...p,formaPago:e.target.value}))} className={ic}>{FORMAS_PAGO.filter(f=>f!=='Todos').map(f=><option key={f}>{f}</option>)}</select></div>
              <div><label className={lc}>Codigo Inmueble</label><input value={form.codInmueble} readOnly className={ic+' bg-slate-50'}/></div>
              <div><label className={lc}>Nombre Contribuyente</label><input value={form.nombreContribuyente} readOnly className={ic+' bg-slate-50'}/></div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div><label className={lc}>Banco Emisor</label><select value={form.bancoEmisor} onChange={e=>setForm(p=>({...p,bancoEmisor:e.target.value}))} className={ic}><option value="">-- Seleccionar --</option>{bancosVenezuela.map(b=><option key={b}>{b}</option>)}</select></div>
              <div><label className={lc}>Referencia Origen</label><input value={form.referenciaOrigen} onChange={e=>setForm(p=>({...p,referenciaOrigen:e.target.value}))} className={ic}/></div>
              <div><label className={lc}>Banco Receptor</label><select value={form.bancoReceptor} onChange={e=>setForm(p=>({...p,bancoReceptor:e.target.value}))} className={ic}>{BANCOS_DESTINO.filter(b=>b!=='Todos').map(b=><option key={b}>{b}</option>)}</select></div>
            </div>
            <div className="grid grid-cols-4 gap-4">
              <div><label className={lc}>Monto Reportado</label><input value={form.montoReportado} readOnly className={ic+' bg-slate-50 font-bold'}/></div>
              <div><label className={lc}>Estatus</label><select value={form.estatus} onChange={e=>setForm(p=>({...p,estatus:e.target.value}))} className={ic}>{ESTATUS_LIST.filter(s=>s!=='Todos').map(s=><option key={s}>{s}</option>)}</select></div>
              <div><label className={lc}>Monto Conciliado</label><input value={form.montoConciliado} onChange={e=>setForm(p=>({...p,montoConciliado:e.target.value}))} className={ic} type="number" step="0.01"/></div>
              <div><label className={lc}>Correo Responsable</label><div className="flex gap-1"><input value={form.correoResponsable} onChange={e=>setForm(p=>({...p,correoResponsable:e.target.value}))} className={ic}/><span className="text-blue-500 px-1 flex items-center"><Mail size={16}/></span></div></div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div><label className={lc}>Telefono Responsable</label><input value={form.telefonoResponsable} onChange={e=>setForm(p=>({...p,telefonoResponsable:e.target.value}))} className={ic}/></div>
              <div><label className={lc}>Fecha Transaccion</label><input type="date" value={form.fechaTransaccion} onChange={e=>setForm(p=>({...p,fechaTransaccion:e.target.value}))} className={ic}/></div>
              <div><label className={lc}>Fecha en Banco</label><input type="date" value={form.fechaBanco} onChange={e=>setForm(p=>({...p,fechaBanco:e.target.value}))} className={ic}/></div>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div><p className="text-sm font-semibold text-slate-600 mb-2">Notificar al Usuario?</p><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.enviarCorreo} onChange={e=>setForm(p=>({...p,enviarCorreo:e.target.checked}))} className="w-4 h-4 accent-blue-600"/><span className="text-sm font-medium text-slate-700">Enviar Correo</span></label></div>
              <div><textarea value={form.observaciones} onChange={e=>setForm(p=>({...p,observaciones:e.target.value}))} rows={3} placeholder="Observaciones (se copian al correo del usuario)" className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"/></div>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <div className="flex justify-between text-sm mb-1"><span className="text-slate-500">Periodo(s)</span><span className="font-mono text-slate-700 text-xs">{periodos}</span></div>
              <div className="flex justify-between text-sm"><span className="text-blue-600 font-semibold">Total Documento</span><span className="text-blue-600 font-bold">{fmt(totalDoc)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-green-600 font-semibold">Total Retenciones</span><span className="text-green-600 font-bold">0,00</span></div>
              <div className="flex justify-between text-sm border-t pt-1 mt-1"><span className="font-bold text-slate-800">Total a Pagar</span><span className="font-bold text-slate-800">{fmt(totalDoc)}</span></div>
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
