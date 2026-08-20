'use client';
import React, { useState, useEffect } from 'react';
import { DataTable } from '@/components/DataTable';
import { FileSpreadsheet, Download, Filter, RefreshCw, Zap, Printer, X, CheckCircle, XCircle } from 'lucide-react';
import { useAppContext } from '@/store/AppContext';
import { supabase } from '@/lib/supabase';
import tarifasData from '@/data/tarifas.json';
import { ReciboImprimible } from '@/components/ReciboImprimible';

export default function EstadoCuentaPage() {
  const { facturas, inmuebles } = useAppContext();
  const [tcmmv, setTcmmv] = useState<number | null>(null);
  const [loadingTasa, setLoadingTasa] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedRecibo, setSelectedRecibo] = useState<any>(null);
  
  const [activeTab, setActiveTab] = useState<'General' | 'PorVerificar'>('General');
  const [pagosVerificar, setPagosVerificar] = useState<any[]>([]);
  const [loadingPagos, setLoadingPagos] = useState(false);

  const [filterStatus, setFilterStatus] = useState('Todos');
  const [actionModal, setActionModal] = useState<{ isOpen: boolean, action: 'Anular' | 'Reversar', factura: any, nota: string }>({ isOpen: false, action: 'Anular', factura: null, nota: '' });
  
  const filteredFacturas = facturas.filter((f: any) => filterStatus === 'Todos' || f.estado === filterStatus);

  const fetchPagos = async () => {
    setLoadingPagos(true);
    try {
      const { data, error } = await supabase
        .from('pagos_reportados')
        .select('*')
        .eq('estado', 'Por Verificar')
        .order('created_at', { ascending: false });
      
      if (data) setPagosVerificar(data);
    } catch (e) {
      console.log('Tabla pagos_reportados no existe aún o hubo un error');
    }
    setLoadingPagos(false);
  };

  useEffect(() => {
    if (activeTab === 'PorVerificar') {
      fetchPagos();
    }
  }, [activeTab]);

  const procesarPago = async (pago: any, accion: 'Aprobar' | 'Rechazar') => {
    if (!confirm(`¿Estás seguro de ${accion.toUpperCase()} este pago por Bs. ${pago.monto}?`)) return;

    try {
      // 1. Update the pago record
      await supabase.from('pagos_reportados').update({ estado: accion === 'Aprobar' ? 'Aprobado' : 'Rechazado' }).eq('id', pago.id);

      // 2. Parse details
      let detalles = { recibos: [], cuotas: [] };
      try { detalles = JSON.parse(pago.detalles); } catch(e){}

      // 3. Update related items
      if (accion === 'Rechazar') {
        // Simple revert to Pendiente
        if (detalles.recibos && detalles.recibos.length > 0) {
          await supabase.from('facturas').update({ estado: 'Pendiente' }).in('referencia', detalles.recibos);
        }
        if (detalles.cuotas && detalles.cuotas.length > 0) {
          const { data: convs } = await supabase.from('convenios').select('*');
          if (convs) {
            const convMap = new Map();
            detalles.cuotas.forEach((sc: any) => {
              if (!convMap.has(sc.convId)) convMap.set(sc.convId, { toUpdate: [] });
              convMap.get(sc.convId).toUpdate.push(sc.cuotaId);
            });
            for (const [cId, data] of convMap.entries()) {
              const rawConv = convs.find(c => c.id === cId);
              if (rawConv) {
                let parsed = [];
                try { parsed = JSON.parse(rawConv.detalle_cuotas); } catch(e){}
                parsed.forEach((c: any) => {
                  if (data.toUpdate.includes(c.id)) c.estado = 'Pendiente';
                });
                await supabase.from('convenios').update({ detalle_cuotas: JSON.stringify(parsed) }).eq('id', cId);
              }
            }
          }
        }
      } else if (accion === 'Aprobar') {
        const esAbono = (detalles as any).es_abono === true;

        if (!esAbono) {
          // Pago completo normal
          if (detalles.recibos && detalles.recibos.length > 0) {
            await supabase.from('facturas').update({ estado: 'Pagado' }).in('referencia', detalles.recibos);
          }
          if (detalles.cuotas && detalles.cuotas.length > 0) {
            const { data: convs } = await supabase.from('convenios').select('*');
            if (convs) {
              const convMap = new Map();
              detalles.cuotas.forEach((sc: any) => {
                if (!convMap.has(sc.convId)) convMap.set(sc.convId, { toUpdate: [] });
                convMap.get(sc.convId).toUpdate.push(sc.cuotaId);
              });
              for (const [cId, data] of convMap.entries()) {
                const rawConv = convs.find(c => c.id === cId);
                if (rawConv) {
                  let parsed = [];
                  try { parsed = JSON.parse(rawConv.detalle_cuotas); } catch(e){}
                  parsed.forEach((c: any) => {
                    if (data.toUpdate.includes(c.id)) c.estado = 'Pagado';
                  });
                  await supabase.from('convenios').update({ detalle_cuotas: JSON.stringify(parsed) }).eq('id', cId);
                }
              }
            }
          }
        } else {
          // LÓGICA DE ABONO (Pago Parcial)
          let dineroDisponible = parseFloat(pago.monto);

          // 1. Process Facturas first
          if (detalles.recibos && detalles.recibos.length > 0) {
            const { data: facturasData } = await supabase.from('facturas').select('*').in('referencia', detalles.recibos).order('emision', { ascending: true });
            if (facturasData) {
              for (const f of facturasData) {
                const montoFac = parseFloat((f.monto || '0').replace(/[^\d.]/g, ''));
                if (dineroDisponible >= montoFac) {
                  dineroDisponible -= montoFac;
                  await supabase.from('facturas').update({ estado: 'Pagado' }).eq('id', f.id);
                } else if (dineroDisponible > 0) {
                  const montoRestante = (montoFac - dineroDisponible).toFixed(2);
                  await supabase.from('facturas').update({ estado: 'Pendiente', monto: `${montoRestante} Bs` }).eq('id', f.id);
                  dineroDisponible = 0;
                } else {
                  await supabase.from('facturas').update({ estado: 'Pendiente' }).eq('id', f.id);
                }
              }
            }
          }

          // 2. Process Cuotas
          if (detalles.cuotas && detalles.cuotas.length > 0) {
            const { data: convs } = await supabase.from('convenios').select('*');
            if (convs) {
              // Extract all selected cuotas to sort them by date across all convenios
              let flatCuotas: any[] = [];
              detalles.cuotas.forEach((sc: any) => {
                const rawConv = convs.find(c => c.id === sc.convId);
                if (rawConv) {
                  let parsed = [];
                  try { parsed = JSON.parse(rawConv.detalle_cuotas); } catch(e){}
                  const cuotaObj = parsed.find((c: any) => c.id === sc.cuotaId);
                  if (cuotaObj) {
                    flatCuotas.push({ ...cuotaObj, convId: sc.convId, rawConv });
                  }
                }
              });

              // Sort by date oldest first
              flatCuotas.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());

              // Apply dinero
              const convUpdates = new Map();
              for (const c of flatCuotas) {
                const montoC = parseFloat(c.monto || '0');
                let newEstado = 'Pendiente';
                let newMonto = c.monto;

                if (dineroDisponible >= montoC) {
                  dineroDisponible -= montoC;
                  newEstado = 'Pagado';
                } else if (dineroDisponible > 0) {
                  const montoRestante = (montoC - dineroDisponible).toFixed(2);
                  newEstado = 'Pendiente';
                  newMonto = `${montoRestante}`;
                  dineroDisponible = 0;
                }

                if (!convUpdates.has(c.convId)) {
                  let parsed = [];
                  try { parsed = JSON.parse(c.rawConv.detalle_cuotas); } catch(e){}
                  convUpdates.set(c.convId, parsed);
                }
                const parsedList = convUpdates.get(c.convId);
                const targetCuota = parsedList.find((tc: any) => tc.id === c.id);
                if (targetCuota) {
                  targetCuota.estado = newEstado;
                  targetCuota.monto = newMonto;
                }
              }

              for (const [cId, parsed] of convUpdates.entries()) {
                await supabase.from('convenios').update({ detalle_cuotas: JSON.stringify(parsed) }).eq('id', cId);
              }
            }
          }
        }
      }

      // 4. Handle Saldo a Favor
      if (accion === 'Aprobar' && (detalles as any).saldo_favor > 0) {
        const saldoFavor = parseFloat((detalles as any).saldo_favor);
        
        // Fetch current inmuebles for this taxpayer
        const { data: userInmuebles } = await supabase.from('inmuebles').select('id, saldo_favor_bs').eq('identidad', pago.identidad);
        
        if (userInmuebles && userInmuebles.length > 0) {
          // Add the total saldo_favor to the first property (or distribute it, but usually adding to the first is fine)
          const firstInmueble = userInmuebles[0];
          const newSaldo = parseFloat(firstInmueble.saldo_favor_bs || '0') + saldoFavor;
          await supabase.from('inmuebles').update({ saldo_favor_bs: newSaldo }).eq('id', firstInmueble.id);
        }
      }

      alert(`Pago ${accion.toLowerCase()}o exitosamente.`);
      fetchPagos();
    } catch (e: any) {
      alert("Error: " + e.message);
    }
  };

  const handleOpenRecibo = (row: any) => {
    const montoNumerico = parseFloat((row.monto || "0").replace(/[^\d.]/g, '')) || 0;
    
    // Obtener mes y año
    let mesTexto = '---';
    if (row.emision) {
      const date = new Date(row.emision);
      const meses = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
      // Se ajusta usando la fecha local o UTC dependiendo del formato (YYYY-MM-DD usa UTC si se parsea directo o local si tiene T)
      // Extraemos los trozos manualmente para evitar desfases horarios:
      const parts = row.emision.split('-');
      if(parts.length >= 2) {
        mesTexto = `${meses[parseInt(parts[1]) - 1]} ${parts[0]}`;
      }
    }

    const cajeroActivo = (typeof window !== 'undefined' ? localStorage.getItem('adminUser') : null) || 'ADMINISTRADOR';

    setSelectedRecibo({
      reciboNo: row.referencia ? row.referencia.split('-').pop()?.padStart(7, '0') : '0000001',
      controlWeb: row.estado === 'Pagado' ? 'WEB-0000001' : '',
      fechaEmision: row.emision || new Date().toISOString().split('T')[0],
      codContribuyente: row.identidad || '---',
      razonSocial: row.contribuyente || '---',
      domicilioFiscal: "ZONA TUCACAS (SECTOR NO ESPECIFICADO)",
      rifCi: row.identidad || '---',
      caja: cajeroActivo,
      conceptos: [
        { 
          descripcion: `Servicio Aseo Residencial/Comercial. Correspondiente al mes de: ${mesTexto}`, 
          precioUnit: montoNumerico, 
          total: montoNumerico 
        }
      ],
      subTotal: montoNumerico,
      exento: montoNumerico,
      iva: 0,
      total: montoNumerico,
      formaPago: row.estado === 'Pagado' ? 'TRANSFERENCIA' : 'POR PAGAR',
      banco: row.estado === 'Pagado' ? 'BANCO CONFIRMADO' : '---',
      referencia: row.estado === 'Pagado' ? Math.floor(Math.random() * 90000000 + 10000000).toString() : '---'
    });
  };

  const handleTest6Meses = () => {
    const meses = ['MARZO 2026', 'ABRIL 2026', 'MAYO 2026', 'JUNIO 2026', 'JULIO 2026', 'AGOSTO 2026'];
    const montoUnitario = 150.00;
    const conceptos = meses.map(mes => ({
      descripcion: `Servicio Aseo Residencial/Comercial. Correspondiente al mes de: ${mes}`,
      precioUnit: montoUnitario,
      total: montoUnitario
    }));

    setSelectedRecibo({
      reciboNo: '0000888',
      controlWeb: 'WEB-0000001',
      fechaEmision: new Date().toISOString().split('T')[0],
      codContribuyente: 'V-12345678',
      razonSocial: 'CONTRIBUYENTE DE PRUEBA (6 MESES)',
      domicilioFiscal: "ZONA TUCACAS (SECTOR NO ESPECIFICADO)",
      rifCi: 'V-12345678',
      caja: "F-OMAR",
      conceptos: conceptos,
      subTotal: montoUnitario * 6,
      exento: montoUnitario * 6,
      iva: 0,
      total: montoUnitario * 6,
      formaPago: 'TRANSFERENCIA',
      banco: 'BANESCO',
      referencia: Math.floor(Math.random() * 90000000 + 10000000).toString()
    });
  };

  useEffect(() => {
    actualizarTasa();
  }, []);

  const actualizarTasa = async () => {
    setLoadingTasa(true);
    try {
      const res = await fetch('/api/bcv');
      const data = await res.json();
      if (data.tcmmv) {
        setTcmmv(data.tcmmv);
      }
    } catch (e) {
      console.error(e);
    }
    setLoadingTasa(false);
  };

  const generarFacturacionMensual = async () => {
    if (!tcmmv) {
      alert("Debes actualizar la tasa TCMMV primero.");
      return;
    }
    
    if (!confirm(`¿Generar facturación usando TCMMV de ${tcmmv} Bs? Esto facturará a los ${inmuebles.length} inmuebles.`)) {
      return;
    }

    setIsGenerating(true);
    
    let noConfigurados: string[] = [];
    const nuevasFacturas = [];
    
    // Obtener mes actual
    const fecha = new Date();
    const emision = fecha.toISOString().split('T')[0];
    fecha.setMonth(fecha.getMonth() + 1);
    const vencimiento = fecha.toISOString().split('T')[0];

    for (let i = 0; i < inmuebles.length; i++) {
      const inm = inmuebles[i];
      const actividad = inm.actividad_principal;
      const clasificacion = inm.clasificacion || 'A';
      
      const tarifasPorActividad = (tarifasData as any)[actividad];
      
      if (!tarifasPorActividad) {
        if (!noConfigurados.includes(actividad)) noConfigurados.push(actividad);
        continue;
      }
      
      const tarifaMMV = tarifasPorActividad[clasificacion] || tarifasPorActividad['A'];
      const montoCalculado = (tarifaMMV * tcmmv).toFixed(2);
      
      nuevasFacturas.push({
        referencia: `FAC-${Date.now().toString().slice(-6)}-${i}`,
        identidad: inm.identidad,
        contribuyente: inm.contribuyente,
        monto: `${montoCalculado} Bs`,
        emision: emision,
        vencimiento: vencimiento,
        estado: 'Pendiente'
      });
    }

    if (noConfigurados.length > 0) {
      alert(`Atención: Las siguientes actividades no están en la ordenanza y no se facturaron:\n${noConfigurados.join(', ')}`);
    }

    // Insertar masivo (en lotes si es necesario, pero supabase acepta arrays grandes)
    // Para simplificar enviamos de 500 en 500
    for(let i=0; i<nuevasFacturas.length; i+=500){
      const chunk = nuevasFacturas.slice(i, i+500);
      await supabase.from('facturas').insert(chunk);
    }

    alert(`Se han generado ${nuevasFacturas.length} facturas exitosamente.`);
    setIsGenerating(false);
    // Idealmente haríamos un refetch del context aquí, o se actualiza en tiempo real
    window.location.reload();
  };

  const handleActionSubmit = async () => {
    if (!actionModal.factura || !actionModal.nota.trim()) {
      alert("Debes ingresar un comentario obligatorio.");
      return;
    }
    try {
      const { error } = await supabase.from('facturas').update({
        estado: actionModal.action === 'Anular' ? 'Anulado' : 'Reversado',
        nota: actionModal.nota
      }).eq('id', actionModal.factura.id);
      
      if (error) throw error;
      
      alert(`Factura ${actionModal.action.toLowerCase()}a correctamente.`);
      setActionModal({ isOpen: false, action: 'Anular', factura: null, nota: '' });
      window.location.reload(); // Quick refresh to reflect changes, or context refresh
    } catch (e: any) {
      alert("Error: " + e.message);
    }
  };

  const columns = [
    { key: 'referencia', header: 'Nro. Factura' },
    { key: 'contribuyente', header: 'Contribuyente' },
    { key: 'monto', header: 'Monto' },
    { key: 'estado', header: 'Estado', render: (row: any) => (
      <span className={`px-2 py-1 rounded text-xs font-semibold ${
        row.estado === 'Pagado' ? 'bg-green-100 text-green-700' :
        row.estado === 'Pendiente' ? 'bg-yellow-100 text-yellow-700' :
        row.estado === 'Anulado' ? 'bg-red-100 text-red-700' :
        row.estado === 'Reversado' ? 'bg-orange-100 text-orange-700' :
        'bg-slate-100 text-slate-700'
      }`}>{row.estado}</span>
    ) },
    { key: 'emision', header: 'F. Emisión' },
    { key: 'vencimiento', header: 'F. Vencimiento' },
    { key: 'actions', header: 'Acciones', render: (row: any) => (
      <div className="flex gap-2">
        <button 
          onClick={() => handleOpenRecibo(row)}
          className="bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-1.5 rounded text-xs flex items-center gap-2 transition-colors font-medium border border-blue-200"
          title="Ver Recibo"
        >
          <Printer size={14} />
        </button>
        {(row.estado === 'Pendiente' || row.estado === 'Pagado') && (
          <>
            <button 
              onClick={() => setActionModal({ isOpen: true, action: 'Reversar', factura: row, nota: '' })}
              className="bg-orange-50 text-orange-600 hover:bg-orange-100 px-3 py-1.5 rounded text-xs transition-colors font-medium border border-orange-200"
              title="Reversar Factura"
            >
              Reversar
            </button>
            <button 
              onClick={() => setActionModal({ isOpen: true, action: 'Anular', factura: row, nota: '' })}
              className="bg-red-50 text-red-600 hover:bg-red-100 px-3 py-1.5 rounded text-xs transition-colors font-medium border border-red-200"
              title="Anular Factura"
            >
              Anular
            </button>
          </>
        )}
      </div>
    ) }
  ];

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto p-6">
      
      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button 
          onClick={() => setActiveTab('General')}
          className={`px-6 py-3 font-semibold text-sm transition-colors ${activeTab === 'General' ? 'border-b-2 border-blue-600 text-blue-700' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Estado de Cuenta General
        </button>
        <button 
          onClick={() => setActiveTab('PorVerificar')}
          className={`px-6 py-3 font-semibold text-sm transition-colors ${activeTab === 'PorVerificar' ? 'border-b-2 border-orange-600 text-orange-700' : 'text-slate-500 hover:text-slate-700'} flex items-center gap-2`}
        >
          Pagos por Verificar
          {pagosVerificar.length > 0 && activeTab !== 'PorVerificar' && (
            <span className="bg-orange-500 text-white text-[10px] px-2 py-0.5 rounded-full">{pagosVerificar.length}</span>
          )}
        </button>
      </div>

      {activeTab === 'General' && (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-slate-700" />
            <h1 className="text-lg font-semibold text-slate-800 uppercase tracking-wide">
              Estado de Cuenta General
            </h1>
          </div>
          <select 
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border border-slate-200 rounded-md px-3 py-1.5 text-sm bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="Todos">Todos los Estados</option>
            <option value="Pendiente">Pendiente</option>
            <option value="Pagado">Pagado (Conciliado)</option>
            <option value="Anulado">Anulado</option>
            <option value="Reversado">Reversado</option>
          </select>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-slate-100 px-3 py-1.5 rounded-lg flex items-center gap-2 border border-slate-200">
            <span className="text-xs font-medium text-slate-500">TCMMV (Euro):</span>
            <span className="text-sm font-bold text-slate-800">
              {tcmmv ? `${tcmmv} Bs` : '---'}
            </span>
            <button 
              onClick={actualizarTasa}
              disabled={loadingTasa}
              className="ml-2 text-slate-400 hover:text-blue-600 transition-colors"
              title="Actualizar Tasa desde BCV"
            >
              <RefreshCw size={14} className={loadingTasa ? 'animate-spin' : ''} />
            </button>
          </div>

          <button 
            onClick={handleTest6Meses}
            className="bg-purple-600 text-white hover:bg-purple-700 px-4 py-2 rounded text-sm font-medium transition-colors shadow-sm"
          >
            Prueba 6 Meses
          </button>
          
          <button 
            onClick={generarFacturacionMensual}
            disabled={isGenerating || !tcmmv}
            className="bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 px-4 py-2 rounded text-sm font-medium transition-colors flex items-center gap-2 shadow-sm"
          >
            <Zap className="w-4 h-4" /> 
            {isGenerating ? 'Generando...' : 'Generar Facturación'}
          </button>
          </div>
        </div>
        
        {/* ACTION MODAL */}
        {actionModal.isOpen && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
              <div className="flex justify-between items-center mb-4">
                <h2 className={`text-xl font-bold ${actionModal.action === 'Anular' ? 'text-red-700' : 'text-orange-700'}`}>
                  {actionModal.action} Factura
                </h2>
                <button 
                  onClick={() => setActionModal({ isOpen: false, action: 'Anular', factura: null, nota: '' })} 
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="bg-slate-50 p-4 rounded-lg mb-4 text-sm text-slate-700">
                <p><strong>Nro. Factura:</strong> {actionModal.factura.referencia}</p>
                <p><strong>Contribuyente:</strong> {actionModal.factura.contribuyente}</p>
                <p><strong>Monto:</strong> {actionModal.factura.monto}</p>
              </div>

              <div className="space-y-3">
                <label className="block text-sm font-semibold text-slate-700">
                  Comentario / Motivo (Obligatorio) *
                </label>
                <textarea 
                  value={actionModal.nota}
                  onChange={(e) => setActionModal(prev => ({ ...prev, nota: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px] resize-none"
                  placeholder={`Por favor describe por qué se está ${actionModal.action.toLowerCase()}ndo esta factura...`}
                />
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button 
                  onClick={() => setActionModal({ isOpen: false, action: 'Anular', factura: null, nota: '' })} 
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleActionSubmit}
                  className={`px-4 py-2 text-sm font-bold text-white rounded-lg transition-colors shadow-sm ${
                    actionModal.action === 'Anular' ? 'bg-red-600 hover:bg-red-700' : 'bg-orange-600 hover:bg-orange-700'
                  }`}
                >
                  Confirmar {actionModal.action}
                </button>
              </div>
            </div>
          </div>
        )}

        <DataTable data={filteredFacturas} columns={columns} itemsPerPage={10} />
      </>
      )}

      {activeTab === 'PorVerificar' && (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200">
          <div className="bg-orange-50 px-4 py-3 border-b border-orange-200">
            <h3 className="font-bold text-orange-800">Transferencias Pendientes de Verificación</h3>
          </div>
          <div className="p-0">
            {loadingPagos ? (
              <div className="p-8 text-center text-slate-500">Cargando pagos...</div>
            ) : pagosVerificar.length === 0 ? (
              <div className="p-8 text-center text-slate-500">No hay pagos por verificar.</div>
            ) : (
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Identidad</th>
                    <th className="px-4 py-3 font-semibold">Banco</th>
                    <th className="px-4 py-3 font-semibold">Referencia</th>
                    <th className="px-4 py-3 font-semibold">Monto</th>
                    <th className="px-4 py-3 font-semibold text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pagosVerificar.map((pago: any) => {
                    let detalles: any = {};
                    try { detalles = JSON.parse(pago.detalles); } catch(e){}
                    
                    return (
                    <tr key={pago.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-700">{pago.identidad}</td>
                      <td className="px-4 py-3">{pago.banco}</td>
                      <td className="px-4 py-3 font-mono">{pago.referencia}</td>
                      <td className="px-4 py-3">
                        <span className="font-bold text-emerald-600">{pago.monto} Bs</span>
                        {detalles.saldo_favor > 0 && (
                          <span className="block text-[10px] text-orange-600 font-semibold">
                            + Saldo a favor: {detalles.saldo_favor} Bs
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-center gap-2">
                          <button 
                            onClick={() => procesarPago(pago, 'Aprobar')}
                            className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 p-1.5 rounded flex items-center gap-1 text-xs font-semibold transition-colors"
                          >
                            <CheckCircle size={14} /> Aprobar
                          </button>
                          <button 
                            onClick={() => procesarPago(pago, 'Rechazar')}
                            className="bg-red-100 text-red-700 hover:bg-red-200 p-1.5 rounded flex items-center gap-1 text-xs font-semibold transition-colors"
                          >
                            <XCircle size={14} /> Rechazar
                          </button>
                        </div>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {selectedRecibo && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50 rounded-t-lg print:hidden">
              <h3 className="font-semibold text-slate-800">Vista Previa del Recibo</h3>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => window.print()}
                  className="bg-slate-800 text-white hover:bg-slate-700 px-4 py-2 rounded text-sm font-medium transition-colors flex items-center gap-2"
                >
                  <Printer size={16} /> Imprimir
                </button>
                <button 
                  onClick={() => setSelectedRecibo(null)}
                  className="text-slate-400 hover:text-slate-600 p-2"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            
            {/* Contenedor imprimible */}
            <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 140px)' }}>
              
              <div id="recibo-print-area">
                <style dangerouslySetInnerHTML={{__html: `
                  @media print {
                    body * { visibility: hidden; }
                    #recibo-print-area, #recibo-print-area * { visibility: visible; }
                    #recibo-print-area { position: absolute; left: 0; top: 0; width: 100%; }
                  }
                `}} />
                <ReciboImprimible data={selectedRecibo} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
