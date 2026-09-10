'use client';
import { useState, useEffect } from 'react';
import { FileText, Building, Handshake, Calendar, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAppContext } from '@/store/AppContext';
import { supabase } from '@/lib/supabase';
import { formatBs } from '@/lib/formatCurrency';

export default function EstadoCuentaPage() {
  const { inmuebles, facturas } = useAppContext();
  const [portalDoc, setPortalDoc] = useState('');
  const [tasaBcv, setTasaBcv] = useState(0);
  const [cuotasData, setCuotasData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fullDoc = localStorage.getItem('portal_doc') || '';
    setPortalDoc(fullDoc);

    const fetchBcvAndConvenios = async () => {
      try {
        const [bcvRes] = await Promise.all([
          fetch('/api/bcv?t=' + Date.now(), { cache: 'no-store' })
        ]);
        const bcvData = await bcvRes.json();
        setTasaBcv(bcvData.tcmmv || 0);

        // Cargar cuotas de convenios
        if (fullDoc) {
          const idLimpio = fullDoc.replace(/-/g, '').toUpperCase();
          const idFmt = idLimpio.charAt(0) + '-' + idLimpio.slice(1);
          const soloNum = fullDoc.replace(/D/g, '');
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
                  cuotas.push({
                    conv: conv.numero,
                    cuota: c.id + 1,
                    fecha: c.fecha,
                    vencida: c.fecha <= hoy,
                    monto: parseFloat(c.monto) || 0
                  });
                }
              });
            }
            setCuotasData(cuotas);
          }
        }
      } catch (e) { console.error(e); }
      setIsLoading(false);
    };
    fetchBcvAndConvenios();
  }, []);

  // Filtrar inmuebles del usuario actual
  const docNorm = portalDoc.replace(/-/g, '').toUpperCase();
  const docFmt = docNorm ? docNorm.charAt(0) + '-' + docNorm.slice(1) : '';
  const soloNum = portalDoc.replace(/D/g, '');

  const misInmuebles = inmuebles.filter((inm: any) => {
    const id = (inm.identidad || '').replace(/-/g, '').toUpperCase();
    const idFmt2 = id.charAt(0) + '-' + id.slice(1);
    return portalDoc && (
      id === docNorm ||
      idFmt2 === docFmt ||
      id === portalDoc.toUpperCase() ||
      id === soloNum
    );
  });

  // Filtrar facturas del usuario actual
  const misFact = facturas.filter((f: any) => {
    const contrib = (f.contribuyente || '').replace(/-/g, '').toUpperCase();
    return portalDoc && (contrib === docNorm || contrib.includes(soloNum));
  });
  const pendientes = misFact.filter((f: any) => f.estado === 'Pendiente');
  const pagadas = misFact.filter((f: any) => f.estado === 'Pagada').slice(0, 10);

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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center shadow-sm">
          <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Cuota Mensual</div>
          <div className="text-xl font-bold text-slate-800">Bs. {formatBs(totalMensual)}</div>
          <div className="text-[10px] text-slate-400 mt-1">tasa: {tasaBcv.toFixed(2)}</div>
        </div>
        <div className={"rounded-xl border p-4 text-center shadow-sm " + (pendientes.length > 0 ? "bg-red-50 border-red-200" : "bg-emerald-50 border-emerald-200")}>
          <div className={"text-[10px] font-bold uppercase mb-1 " + (pendientes.length > 0 ? "text-red-400" : "text-emerald-400")}>Facturas Pendientes</div>
          <div className={"text-xl font-bold " + (pendientes.length > 0 ? "text-red-700" : "text-emerald-700")}>{pendientes.length}</div>
          <div className={"text-[10px] mt-1 " + (pendientes.length > 0 ? "text-red-500" : "text-emerald-500")}>
            {pendientes.length > 0 ? "Bs. " + formatBs(totalPendBs) : "Al día ✓"}
          </div>
        </div>
        <div className={"rounded-xl border p-4 text-center shadow-sm " + (cuotasVencidas.length > 0 ? "bg-orange-50 border-orange-200" : "bg-white border-slate-200")}>
          <div className={"text-[10px] font-bold uppercase mb-1 " + (cuotasVencidas.length > 0 ? "text-orange-400" : "text-slate-400")}>Cuotas Convenio</div>
          <div className={"text-xl font-bold " + (cuotasVencidas.length > 0 ? "text-orange-700" : "text-slate-700")}>{cuotasData.length}</div>
          <div className="text-[10px] text-slate-400 mt-1">{cuotasVencidas.length} vencidas</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center shadow-sm">
          <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Inmuebles</div>
          <div className="text-xl font-bold text-slate-800">{misInmuebles.length}</div>
          <div className="text-[10px] text-slate-400 mt-1">registrados</div>
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
                <th className="px-4 py-3 text-center">Factor (EUR/mes)</th>
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
      {misInmuebles.length === 0 && pendientes.length === 0 && pagadas.length === 0 && (
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-10 text-center">
          <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No se encontraron registros para su cuenta.</p>
          <p className="text-xs text-slate-400 mt-1">Si cree que esto es un error, comuníquese con la oficina de aseo urbano.</p>
        </div>
      )}
    </div>
  );
}
