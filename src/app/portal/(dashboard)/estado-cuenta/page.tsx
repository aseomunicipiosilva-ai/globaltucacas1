'use client';
import { useState, useEffect, useMemo } from 'react';
import { FileText, Building, Handshake, AlertCircle, CheckCircle2, Wrench, ClipboardCheck, ShieldCheck, FlaskConical } from 'lucide-react';
import { useAppContext } from '@/store/AppContext';
import { supabase } from '@/lib/supabase';
import { formatBs } from '@/lib/formatCurrency';

const TIPO_ICON: Record<string, any> = {
  especial: Wrench, extraordinario: FlaskConical, inspeccion: ClipboardCheck, visto_bueno: ShieldCheck
};
const TIPO_LABEL: Record<string, string> = {
  especial: 'Servicio Especial', extraordinario: 'Serv. Extraordinario', inspeccion: 'Inspección', visto_bueno: 'Visto Bueno'
};

export default function EstadoCuentaPage() {
  const { inmuebles, facturas } = useAppContext();
  const [portalDoc, setPortalDoc] = useState('');
  const [tasaBcv, setTasaBcv] = useState(0);
  const [cuotasData, setCuotasData] = useState<any[]>([]);
  const [serviciosEsp, setServiciosEsp] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fullDoc = localStorage.getItem('portal_doc') || '';
    setPortalDoc(fullDoc);

    const fetchAll = async () => {
      try {
        const bcvRes = await fetch('/api/bcv?t=' + Date.now(), { cache: 'no-store' });
        const bcvData = await bcvRes.json();
        setTasaBcv(bcvData.tcmmv || 0);

        if (fullDoc) {
          const idLimpio = fullDoc.replace(/-/g, '').toUpperCase();
          const idFmt = idLimpio.charAt(0) + '-' + idLimpio.slice(1);
          const soloNum = fullDoc.replace(/D/g, '');

          // Convenios
          const { data: convenios } = await supabase.from('convenios').select('*')
            .or('identidad.eq.' + idFmt + ',identidad.eq.' + idLimpio + ',identidad.eq.' + fullDoc.toUpperCase() + ',identidad.eq.' + soloNum)
            .in('estado', ['Al Día', 'Activo']);
          if (convenios) {
            const hoy = new Date().toISOString().split('T')[0];
            const cuotas: any[] = [];
            for (const conv of convenios) {
              let parsed: any[] = [];
              try { parsed = JSON.parse(conv.detalle_cuotas || '[]'); } catch {}
              parsed.forEach((c: any) => {
                if (c.estado === 'Pendiente') {
                  cuotas.push({ conv: conv.numero, cuota: c.id + 1, fecha: c.fecha, vencida: c.fecha <= hoy, monto: parseFloat(c.monto) || 0 });
                }
              });
            }
            setCuotasData(cuotas);
          }

          // Servicios Especiales pendientes
          const { data: servs } = await supabase.from('servicios_especiales').select('*')
            .or('identidad.eq.' + idFmt + ',identidad.eq.' + idLimpio + ',identidad.eq.' + fullDoc.toUpperCase() + ',identidad.eq.' + soloNum)
            .not('estado', 'eq', 'Pagado');
          setServiciosEsp(servs || []);
        }
      } catch (e) { console.error(e); }
      setIsLoading(false);
    };
    fetchAll();
  }, []);

  // Filtrar inmuebles del usuario
  const docNorm = portalDoc.replace(/-/g, '').toUpperCase();
  const docFmt = docNorm ? docNorm.charAt(0) + '-' + docNorm.slice(1) : '';
  const soloNum = portalDoc.replace(/D/g, '');

  const misInmuebles = useMemo(() => inmuebles.filter((inm: any) => {
    const id = (inm.identidad || '').replace(/-/g, '').toUpperCase();
    const idFmt2 = id.charAt(0) + '-' + id.slice(1);
    return portalDoc && (id === docNorm || idFmt2 === docFmt || id === portalDoc.toUpperCase() || id === soloNum);
  }), [inmuebles, portalDoc, docNorm, docFmt, soloNum]);

  // Filtrar facturas del usuario
  const misFact = useMemo(() => facturas.filter((f: any) => {
    const contrib = (f.contribuyente || f.identidad || '').replace(/-/g, '').toUpperCase();
    return portalDoc && (contrib === docNorm || contrib.includes(soloNum));
  }), [facturas, portalDoc, docNorm, soloNum]);

  const pendientes = misFact.filter((f: any) => f.estado === 'Pendiente');
  const pagadas = misFact.filter((f: any) => f.estado === 'Pagada' || f.estado === 'Pagado').slice(0, 10);

  // Calculos
  const totalMensual = misInmuebles.reduce((acc: number, inm: any) => {
    const factor = parseFloat(inm.mmv_mes) || 0;
    const cant = parseInt(inm.cant_inmuebles) || 1;
    return acc + factor * cant * tasaBcv;
  }, 0);

  const totalPendBs = pendientes.reduce((acc: number, f: any) => {
    const m = parseFloat((f.monto || '0').toString().replace(/[^d.,]/g, '').replace(',', '.')) || 0;
    return acc + m;
  }, 0);

  const cuotasVencidas = cuotasData.filter(c => c.vencida);
  const totalCuotas = cuotasVencidas.reduce((a, c) => a + c.monto, 0);

  const serviciosPendientes = serviciosEsp.filter(s => s.estado !== 'Pagado');
  const totalServiciosBs = serviciosPendientes.reduce((a: number, s: any) => a + (parseFloat(s.monto) || 0), 0);

  const deudaTotalEstimada = totalPendBs + totalCuotas + totalServiciosBs;

  const MESES = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];
  const mesLabel = (d?: string) => {
    if (!d) return '';
    const p = d.split('-');
    if (p.length >= 2) return MESES[parseInt(p[1]) - 1] + ' ' + p[0];
    return d;
  };

  if (isLoading) return <div className="flex items-center justify-center py-20 text-slate-400 text-sm">Cargando estado de cuenta...</div>;

  return (
    <div className="space-y-5 max-w-4xl mx-auto pb-16">
      
      {/* Resumen Financiero */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center shadow-sm">
          <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Cuota Mensual</div>
          <div className="text-lg font-bold text-slate-800">Bs. {formatBs(totalMensual)}</div>
          <div className="text-[10px] text-slate-400 mt-1">tasa: {tasaBcv.toFixed(2)}</div>
        </div>
        <div className={"rounded-xl border p-4 text-center shadow-sm " + (pendientes.length > 0 ? "bg-red-50 border-red-200" : "bg-emerald-50 border-emerald-200")}>
          <div className={"text-[10px] font-bold uppercase mb-1 " + (pendientes.length > 0 ? "text-red-400" : "text-emerald-400")}>Facturas Pend.</div>
          <div className={"text-lg font-bold " + (pendientes.length > 0 ? "text-red-700" : "text-emerald-700")}>{pendientes.length}</div>
          <div className={"text-[10px] mt-1 " + (pendientes.length > 0 ? "text-red-500" : "text-emerald-500")}>
            {pendientes.length > 0 ? "Bs. " + formatBs(totalPendBs) : "Al día ✓"}
          </div>
        </div>
        <div className={"rounded-xl border p-4 text-center shadow-sm " + (cuotasVencidas.length > 0 ? "bg-orange-50 border-orange-200" : "bg-white border-slate-200")}>
          <div className={"text-[10px] font-bold uppercase mb-1 " + (cuotasVencidas.length > 0 ? "text-orange-400" : "text-slate-400")}>Cuotas Conv.</div>
          <div className={"text-lg font-bold " + (cuotasVencidas.length > 0 ? "text-orange-700" : "text-slate-700")}>{cuotasData.length}</div>
          <div className="text-[10px] text-slate-400 mt-1">{cuotasVencidas.length} vencidas</div>
        </div>
        <div className={"rounded-xl border p-4 text-center shadow-sm " + (serviciosPendientes.length > 0 ? "bg-purple-50 border-purple-200" : "bg-white border-slate-200")}>
          <div className={"text-[10px] font-bold uppercase mb-1 " + (serviciosPendientes.length > 0 ? "text-purple-400" : "text-slate-400")}>Servicios Esp.</div>
          <div className={"text-lg font-bold " + (serviciosPendientes.length > 0 ? "text-purple-700" : "text-slate-700")}>{serviciosPendientes.length}</div>
          <div className="text-[10px] text-slate-400 mt-1">
            {serviciosPendientes.length > 0 ? "Bs. " + formatBs(totalServiciosBs) : "Sin pendientes"}
          </div>
        </div>
        <div className={"col-span-2 lg:col-span-1 rounded-xl border p-4 text-center shadow-sm " + (deudaTotalEstimada > 0 ? "bg-red-600 border-red-700" : "bg-emerald-600 border-emerald-700")}>
          <div className="text-[10px] font-bold text-white/80 uppercase mb-1">Deuda Total</div>
          <div className="text-lg font-bold text-white">Bs. {formatBs(deudaTotalEstimada)}</div>
          <div className="text-[10px] text-white/60 mt-1">fact + cuotas + servs</div>
        </div>
      </div>

      {/* Mis Inmuebles */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center gap-2">
          <Building className="w-4 h-4 text-slate-500" />
          <h2 className="font-bold text-slate-700 uppercase text-sm tracking-wide">Mis Inmuebles Registrados</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Código</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Actividad</th>
                <th className="px-4 py-3">Dirección</th>
                <th className="px-4 py-3 text-center">Factor</th>
                <th className="px-4 py-3 text-right">Cuota Mensual</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {misInmuebles.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400 text-sm">No se encontraron inmuebles asociados a su cuenta.</td></tr>
              ) : (
                misInmuebles.map((inm: any, i: number) => {
                  const factor = parseFloat(inm.mmv_mes) || 0;
                  const cuotaBs = factor * tasaBcv;
                  return (
                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-slate-700">{inm.inmueble || inm.cod_cont || '-'}</td>
                      <td className="px-4 py-3">{inm.tipo || 'N/A'}</td>
                      <td className="px-4 py-3">{inm.actividad_principal || 'Residencial'}</td>
                      <td className="px-4 py-3 text-xs text-slate-500 max-w-[200px]">{inm.direccion || 'Sin dirección'}</td>
                      <td className="px-4 py-3 text-center">{factor.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right font-bold text-emerald-700">Bs. {formatBs(cuotaBs)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Servicios Especiales Pendientes */}
      {serviciosPendientes.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-purple-200 overflow-hidden">
          <div className="bg-purple-50 px-4 py-3 border-b border-purple-200 flex items-center gap-2">
            <Wrench className="w-4 h-4 text-purple-500" />
            <h3 className="font-bold text-purple-700 uppercase text-sm tracking-wide">Servicios Especiales / Inspecciones Asignados</h3>
            <span className="ml-auto text-xs font-bold text-purple-600">Total: Bs. {formatBs(totalServiciosBs)}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-purple-50/50 border-b border-purple-100 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Descripción</th>
                  <th className="px-4 py-3">Referencia</th>
                  <th className="px-4 py-3 text-center">Fecha</th>
                  <th className="px-4 py-3 text-center">Estado</th>
                  <th className="px-4 py-3 text-right">Monto (Bs)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {serviciosPendientes.map((s: any, i: number) => {
                  const Icon = TIPO_ICON[s.tipo] || Wrench;
                  const estadoColor = s.estado === 'Pendiente' ? 'bg-red-100 text-red-700' : s.estado === 'Por Verificar' ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-100 text-slate-600';
                  return (
                    <tr key={i} className="hover:bg-purple-50/20 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 text-purple-600">
                          <Icon className="w-3.5 h-3.5" />
                          <span className="text-xs font-semibold">{TIPO_LABEL[s.tipo] || s.tipo}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-800">{s.descripcion}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">{s.referencia || '--'}</td>
                      <td className="px-4 py-3 text-center text-xs">{s.fecha}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={"px-2 py-0.5 rounded-full text-[10px] font-bold " + estadoColor}>{s.estado}</span>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-purple-700">Bs. {formatBs(parseFloat(s.monto || '0'))}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="bg-purple-50/50 px-4 py-2 border-t border-purple-100 text-xs text-purple-600 text-center">
            💡 Para cancelar estos servicios, diríjase a la oficina de Aseo Urbano o pague desde el menú <strong>Pagar</strong>.
          </div>
        </div>
      )}

      {/* Facturas Pendientes */}
      {pendientes.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-red-200 overflow-hidden">
          <div className="bg-red-50 px-4 py-3 border-b border-red-200 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <h3 className="font-bold text-red-700 uppercase text-sm tracking-wide">Facturas Pendientes</h3>
            <span className="ml-auto text-xs font-bold text-red-600">Total: Bs. {formatBs(totalPendBs)}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-red-50/50 border-b border-red-100 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Referencia</th>
                  <th className="px-4 py-3">Mes</th>
                  <th className="px-4 py-3 text-center">Vencimiento</th>
                  <th className="px-4 py-3 text-right">Monto (Bs)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pendientes.sort((a: any, b: any) => new Date(a.emision).getTime() - new Date(b.emision).getTime()).map((f: any, i: number) => (
                  <tr key={i} className="hover:bg-red-50/20 transition-colors">
                    <td className="px-4 py-3 font-mono text-slate-700">{f.referencia}</td>
                    <td className="px-4 py-3 font-medium">{mesLabel(f.emision)}</td>
                    <td className="px-4 py-3 text-center text-red-600 text-xs">{f.vencimiento || 'N/A'}</td>
                    <td className="px-4 py-3 text-right font-bold text-red-700">{f.monto}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Cuotas de Convenio */}
      {cuotasData.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-orange-200 overflow-hidden">
          <div className="bg-orange-50 px-4 py-3 border-b border-orange-200 flex items-center gap-2">
            <Handshake className="w-4 h-4 text-orange-500" />
            <h3 className="font-bold text-orange-700 uppercase text-sm tracking-wide">Cuotas de Convenio de Pago</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-orange-50/50 border-b border-orange-100 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Convenio</th>
                  <th className="px-4 py-3">Cuota</th>
                  <th className="px-4 py-3 text-center">Fecha</th>
                  <th className="px-4 py-3 text-center">Estado</th>
                  <th className="px-4 py-3 text-right">Monto (Bs)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cuotasData.map((c, i) => (
                  <tr key={i} className={"transition-colors " + (c.vencida ? 'bg-red-50/30 hover:bg-red-50/50' : 'hover:bg-orange-50/20')}>
                    <td className="px-4 py-3 font-mono text-slate-700">{c.conv}</td>
                    <td className="px-4 py-3 text-center">#{c.cuota}</td>
                    <td className="px-4 py-3 text-center text-xs">{c.fecha}</td>
                    <td className="px-4 py-3 text-center">
                      {c.vencida ? <span className="text-red-600 font-bold text-xs">VENCIDA</span> : <span className="text-blue-600 text-xs">Próxima</span>}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-orange-700">Bs. {formatBs(c.monto)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Historial de Pagos */}
      {pagadas.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-emerald-200 overflow-hidden">
          <div className="bg-emerald-50 px-4 py-3 border-b border-emerald-200 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <h3 className="font-bold text-emerald-700 uppercase text-sm tracking-wide">Últimos Pagos</h3>
            <span className="ml-auto text-xs text-emerald-500">(últimos 10)</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-emerald-50/50 border-b border-emerald-100 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Referencia</th>
                  <th className="px-4 py-3">Mes</th>
                  <th className="px-4 py-3 text-center">Fecha Pago</th>
                  <th className="px-4 py-3 text-right">Monto (Bs)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pagadas.map((f: any, i: number) => (
                  <tr key={i} className="hover:bg-emerald-50/20 transition-colors">
                    <td className="px-4 py-3 font-mono text-slate-700">{f.referencia}</td>
                    <td className="px-4 py-3 font-medium">{mesLabel(f.emision)}</td>
                    <td className="px-4 py-3 text-center text-xs text-emerald-600">{f.fecha_pago || f.updated_at?.split('T')[0] || 'N/A'}</td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-700">{f.monto}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sin datos */}
      {misInmuebles.length === 0 && pendientes.length === 0 && pagadas.length === 0 && serviciosPendientes.length === 0 && (
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-10 text-center">
          <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No se encontraron registros para su cuenta.</p>
          <p className="text-xs text-slate-400 mt-1">Si cree que esto es un error, comuníquese con la oficina de aseo urbano.</p>
        </div>
      )}
    </div>
  );
}
