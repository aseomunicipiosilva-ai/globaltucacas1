'use client';
import { useState, useEffect } from 'react';
import { MoreVertical, Printer, FileText, Send, Calendar, CheckSquare, Building, Handshake } from 'lucide-react';
import { useAppContext } from '@/store/AppContext';
import { supabase } from '@/lib/supabase';

export default function EstadoCuentaPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { inmuebles } = useAppContext();
  const [viewCalculo, setViewCalculo] = useState<any>(null);

  useEffect(() => {
    // Simulamos que el usuario en sesion es J-298551488 (Condominio Residencias Villarena) u otro.
    // Como el portal esta harcodeado, tomaremos el primer contribuyente o los inmuebles del mismo.
    const calcView = async () => {
      try {
        const res = await fetch(`/api/bcv?t=${Date.now()}`, { cache: 'no-store' });
        const data = await res.json();
        
        let factorTotal = 0;
        let leyenda = '';
        const desgloseLocales: any[] = [];
        const desgloseCuotas: any[] = [];
        let totalCuotasVencidas = 0;

        // Buscar convenios del usuario logueado
        const fullDoc = localStorage.getItem('portal_doc') || '';
        const idLimpio = fullDoc.replace(/-/g, '').toUpperCase();
        const idFormateado = idLimpio ? `${idLimpio.charAt(0)}-${idLimpio.slice(1)}` : '';
        const soloNumeros = fullDoc.replace(/\D/g, '');

        if (idFormateado) {
          const { data: convenios } = await supabase
            .from('convenios')
            .select('*')
            .or(`identidad.eq.${idFormateado},identidad.eq.${idLimpio},identidad.eq.${fullDoc.toUpperCase()},identidad.eq.${soloNumeros}`)
            .eq('estado', 'Al Día');
            
          if (convenios) {
            const hoy = new Date().toISOString().split('T')[0];
            for (const conv of convenios) {
              let cuotasParsed = [];
              try { cuotasParsed = JSON.parse(conv.detalle_cuotas || '[]'); } catch(e){}
              
              cuotasParsed.forEach((c: any) => {
                 if (c.estado === 'Pendiente') {
                    const isVencida = c.fecha <= hoy;
                    const montoFloat = parseFloat(c.monto) || 0;
                    desgloseCuotas.push({
                      numeracion: `${conv.numero} - Cuota ${c.id + 1}`,
                      fecha: c.fecha,
                      isVencida,
                      montoBs: montoFloat.toFixed(2)
                    });
                    if (isVencida) {
                       totalCuotasVencidas += montoFloat;
                    }
                 }
              });
            }
          }
        }

        // Por ahora, como es un portal de prueba (mock), usamos un inmueble hardcodeado si no hay login real.
        // O usamos los inmuebles reales si los hay.
        // Vamos a simular que el usuario tiene el inmueble "I-000252" o sumar todos si es una demo
        const misInmuebles = inmuebles.slice(0, 1); // Mock: tomar el primero para mostrar la funcionalidad

        if (misInmuebles.length > 0) {
          const isCondominio = misInmuebles.some(i => (parseInt(i.cant_inmuebles) || 1) > 1);
          leyenda = isCondominio ? `Condominio / Complejo Residencial` : misInmuebles.map(i => i.actividad_principal || 'Residencial').join(', ');
          
          misInmuebles.forEach(inm => {
            const localFactor = parseFloat(inm.mmv_mes) || 3.0; // Mock 3.0 fallback
            const cant = parseInt(inm.cant_inmuebles) || 1;
            const metraje = inm.area || inm.area_operativa || 'N/A';
            const actividad = inm.actividad_principal || 'No especificada';
            const tipoVivienda = inm.tipo || 'Inmueble';
            
            const conceptoTexto = `${actividad} | Nivel: ${metraje} m² | ${tipoVivienda}`;
            
            factorTotal += (localFactor * cant);
            
            if (localFactor > 0) {
              if (cant > 1) {
                for(let i=1; i<=cant; i++) {
                  desgloseLocales.push({
                    numeracion: `${inm.inmueble || inm.cod_cont || 'I-000252'} - Unidad ${i}`,
                    leyenda: conceptoTexto,
                    factor: localFactor,
                    montoBs: (Math.trunc((localFactor * data.tcmmv) * 100) / 100).toFixed(2)
                  });
                }
              } else {
                desgloseLocales.push({
                  numeracion: inm.inmueble || inm.cod_cont || 'I-000252',
                  leyenda: conceptoTexto,
                  factor: localFactor,
                  montoBs: (Math.trunc((localFactor * data.tcmmv) * 100) / 100).toFixed(2)
                });
              }
            }
          });
        } else {
          // Fallback puramente hardcodeado si no hay supabase conectado
          factorTotal = 3.0;
          leyenda = 'Residencial';
          desgloseLocales.push({
            numeracion: 'I-000252',
            leyenda: 'Residencial',
            factor: 3.0,
            montoBs: (Math.trunc((3.0 * data.tcmmv) * 100) / 100).toFixed(2)
          });
        }

        const rawTotal = (factorTotal * data.tcmmv) + totalCuotasVencidas;
        const totalTruncado = (Math.trunc(rawTotal * 100) / 100).toFixed(2);

        setViewCalculo({
          factor: factorTotal,
          leyenda,
          totalBs: totalTruncado,
          tasaBcv: data.tcmmv,
          desglose: desgloseLocales,
          cuotas: desgloseCuotas,
          totalCuotasVencidas
        });
      } catch (e) {
        console.error(e);
      }
    };
    calcView();
  }, [inmuebles]);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden text-sm">
        <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
          <h2 className="font-semibold text-slate-700 uppercase flex items-center gap-2">
            <CheckSquare className="w-4 h-4" />
            ESTADO DE CUENTA
          </h2>
        </div>

        {viewCalculo && (
          <div className="bg-blue-50/50 p-4 border-b border-slate-200">
            <h4 className="font-bold text-slate-700 uppercase tracking-wide mb-3 flex items-center gap-2 text-xs">
              <Building className="w-4 h-4 text-slate-500" /> Tu Cálculo Mensual de Aseo Urbano
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-600 bg-white p-3 border border-blue-100 rounded">
              <div>
                <p className="mb-1"><span className="font-semibold text-slate-700">Clasificación:</span> {viewCalculo.leyenda}</p>
                <p className="mb-1"><span className="font-semibold text-slate-700">Factor Multiplicador:</span> {viewCalculo.factor} TCMMV</p>
              </div>
              <div>
                <p className="mb-1"><span className="font-semibold text-slate-700">Tasa de Cambio Oficial (BCV):</span> {viewCalculo.tasaBcv} Bs</p>
              </div>
              <div className="md:col-span-2 pt-2 border-t border-slate-100 flex justify-between items-center">
                <p className="text-xs font-medium">Fórmula: ({viewCalculo.factor} × {viewCalculo.tasaBcv} Bs) {viewCalculo.totalCuotasVencidas > 0 ? `+ Cuotas Vencidas (${viewCalculo.totalCuotasVencidas.toFixed(2)} Bs)` : ''}</p>
                <p className="text-lg font-bold text-green-700">Total a Cancelar: Bs. {viewCalculo.totalBs}</p>
              </div>
            </div>
            
            {viewCalculo.desglose && viewCalculo.desglose.length > 0 && (
              <div className="mt-4 border border-blue-100 rounded overflow-hidden shadow-sm">
                <div className="bg-blue-100/50 px-3 py-2 border-b border-blue-100">
                  <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wide">Desglose de Inmuebles</span>
                </div>
                <div className="max-h-[150px] overflow-y-auto bg-white">
                  <table className="w-full text-left text-[10px] text-slate-600">
                    <thead className="bg-slate-50 border-b border-slate-100 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 font-semibold">Identificador</th>
                        <th className="px-3 py-2 font-semibold">Concepto</th>
                        <th className="px-3 py-2 font-semibold text-right">Factor (EUR)</th>
                        <th className="px-3 py-2 font-semibold text-right text-green-700">Monto (Bs)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {viewCalculo.desglose.map((item: any, i: number) => (
                        <tr key={i} className="border-b border-slate-50 last:border-0">
                          <td className="px-3 py-2 font-medium">{item.numeracion}</td>
                          <td className="px-3 py-2">{item.leyenda}</td>
                          <td className="px-3 py-2 text-right">{item.factor.toFixed(2)}</td>
                          <td className="px-3 py-2 text-right font-bold text-green-700">{item.montoBs}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {viewCalculo.cuotas && viewCalculo.cuotas.length > 0 && (
              <div className="mt-4 border border-orange-200 rounded overflow-hidden shadow-sm">
                <div className="bg-orange-50 px-3 py-2 border-b border-orange-200 flex items-center gap-2">
                  <Handshake className="w-3 h-3 text-orange-600" />
                  <span className="text-[10px] font-bold text-orange-700 uppercase tracking-wide">Cuotas de Convenio de Pago</span>
                </div>
                <div className="max-h-[200px] overflow-y-auto bg-white">
                  <table className="w-full text-left text-[10px] text-slate-600">
                    <thead className="bg-slate-50 border-b border-slate-100 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 font-semibold">Convenio</th>
                        <th className="px-3 py-2 font-semibold">Fecha de Pago</th>
                        <th className="px-3 py-2 font-semibold text-center">Estado</th>
                        <th className="px-3 py-2 font-semibold text-right text-orange-700">Monto (Bs)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {viewCalculo.cuotas.map((item: any, i: number) => (
                        <tr key={i} className={`border-b border-slate-50 last:border-0 ${item.isVencida ? 'bg-red-50/30' : ''}`}>
                          <td className="px-3 py-2 font-medium text-slate-700">{item.numeracion}</td>
                          <td className="px-3 py-2">{item.fecha}</td>
                          <td className="px-3 py-2 text-center">
                            {item.isVencida ? (
                              <span className="text-red-600 font-bold">VENCIDA</span>
                            ) : (
                              <span className="text-blue-600 font-medium">Próxima / Adelantar</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right font-bold text-orange-700">{item.montoBs}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
        
        <div className="p-0 overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-indigo-50/50 text-indigo-900 text-xs uppercase tracking-wider border-b border-slate-200">
                <th className="px-4 py-3 font-semibold">Inmueble</th>
                <th className="px-4 py-3 font-semibold">Tipo</th>
                <th className="px-4 py-3 font-semibold">Uso</th>
                <th className="px-4 py-3 font-semibold">Solvente</th>
                <th className="px-4 py-3 font-semibold text-right">Deuda</th>
                <th className="px-4 py-3 font-semibold">Base</th>
                <th className="px-4 py-3 font-semibold">Dirección</th>
                <th className="px-4 py-3 font-semibold text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-4 text-slate-700">I-000252</td>
                <td className="px-4 py-4 text-slate-600">Casa</td>
                <td className="px-4 py-4 text-slate-600">Residencial</td>
                <td className="px-4 py-4">
                  <span className="text-red-600 font-semibold text-xs flex flex-col">
                    <span>NO</span>
                    <span className="text-[10px] text-slate-500">Con deudas</span>
                  </span>
                </td>
                <td className="px-4 py-4 text-right">
                  <span className="text-red-600 font-semibold">49.153,50</span>
                </td>
                <td className="px-4 py-4 text-slate-600">Pro</td>
                <td className="px-4 py-4 text-slate-500 text-xs whitespace-normal min-w-[250px]">
                  Avenida Hugo Chavez Casa 05 El Calvario Municipio Silva, Falcón Zona Postal 2055
                </td>
                <td className="px-4 py-4 text-center relative">
                  <button 
                    onClick={() => setMenuOpen(!menuOpen)}
                    className="p-1 hover:bg-slate-200 rounded transition-colors"
                  >
                    <MoreVertical className="w-5 h-5 text-slate-600" />
                  </button>

                  {/* Dropdown Menu */}
                  {menuOpen && (
                    <div className="absolute right-8 top-10 w-48 bg-white rounded-md shadow-lg border border-slate-200 z-10 py-1 text-left">
                      <button className="w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-blue-600 flex items-center gap-2">
                        <span className="text-lg leading-none">+</span> Detalle Pagos
                      </button>
                      <button className="w-full px-4 py-2 text-sm text-blue-600 bg-blue-50/50 hover:bg-blue-50 flex items-center gap-2 border-l-2 border-blue-600">
                        <FileText className="w-4 h-4" />
                        Ver Estado de Cuenta
                      </button>
                      <button className="w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                        <Printer className="w-4 h-4 text-slate-500" />
                        Imprimir Recibo
                      </button>
                      <button className="w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                        <Send className="w-4 h-4 text-slate-500" />
                        Reenviar Recibo
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
