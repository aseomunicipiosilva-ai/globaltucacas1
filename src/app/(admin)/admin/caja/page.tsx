'use client';
import React, { useState, useEffect } from 'react';
import { Search, CreditCard, Landmark, CheckCircle, XCircle, FileText, Handshake } from 'lucide-react';
import { useAppContext } from '@/store/AppContext';
import { supabase } from '@/lib/supabase';

export default function CajaPage() {
  const { facturas, convenios, contribuyentes, documentos, tcmmv } = useAppContext();
  
  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<'Pagos' | 'NotasCredito'>('Pagos');

  // Search State
  const [docType, setDocType] = useState('V');
  const [docNumber, setDocNumber] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [foundUser, setFoundUser] = useState<any>(null);
  
  // Debt State
  const [recibos, setRecibos] = useState<any[]>([]);
  const [cuotas, setCuotas] = useState<any[]>([]);
  
  // Selection State
  const [selectedRecibos, setSelectedRecibos] = useState<string[]>([]);
  const [selectedCuotas, setSelectedCuotas] = useState<{convId: string, cuotaId: number}[]>([]);
  const [totalBs, setTotalBs] = useState(0);

  // Payment State
  const [paymentMethod, setPaymentMethod] = useState<'Debito' | 'Transferencia'>('Debito');
  const [banco, setBanco] = useState('Banesco');
  const [referencia, setReferencia] = useState('');
  const [montoTransferido, setMontoTransferido] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [customBcvRate, setCustomBcvRate] = useState<string>('');
  const [useSaldoFavor, setUseSaldoFavor] = useState<boolean>(false);
  const [isNotaModalOpen, setIsNotaModalOpen] = useState(false);
  const [notaManualMonto, setNotaManualMonto] = useState('');
  const [notaManualRef, setNotaManualRef] = useState('');
  const currentBcvRate = customBcvRate && !isNaN(parseFloat(customBcvRate)) ? parseFloat(customBcvRate) : tcmmv;

  const bancosVenezuela = [
    'Banesco', 'Banco Mercantil', 'Banco Provincial', 'Banco de Venezuela', 
    'Bicentenario', 'Banco Nacional de Crédito (BNC)', 'Bancaribe', 
    'Banco Exterior', 'Banco del Tesoro', 'Banplus', 'Banco Plaza', 
    'Banco Activo', '100% Banco', 'Bancamiga', 'Mi Banco', 'Bancamiga', 'Banco Caroní', 'Banco Sofitasa'
  ].sort();

  const handleSearch = () => {
    setIsSearching(true);
    setFoundUser(null);
    setSelectedRecibos([]);
    setSelectedCuotas([]);
    setTotalBs(0);

    const idLimpioSearch = docNumber.replace(/-/g, '').toUpperCase();
    const cleanFullDoc = `${docType}${idLimpioSearch}`;

    const user = contribuyentes.find((c: any) => {
      if (!c.Identidad) return false;
      const idClean = String(c.Identidad).replace(/-/g, '').toUpperCase();
      return idClean === cleanFullDoc || idClean === idLimpioSearch;
    });
    
    if (user) {
      setFoundUser(user);
      
      const userFacturas = facturas.filter((f: any) => {
        const idCleanFactura = (f.identidad || '').replace(/-/g, '').toUpperCase();
        return (idCleanFactura === cleanFullDoc || f.contribuyente === user.Contribuyente) && f.estado === 'Pendiente';
      });
      setRecibos(userFacturas);
      
      // Load Convenios Cuotas
      const userConvenios = convenios.filter((c: any) => {
        const idCleanConv = (c.identidad || '').replace(/-/g, '').toUpperCase();
        return idCleanConv === cleanFullDoc && c.estado === 'Al Día';
      });
      const pendingCuotas: any[] = [];
      userConvenios.forEach((conv: any) => {
        let parsed = [];
        try { parsed = JSON.parse(conv.detalle_cuotas || '[]'); } catch(e){}
        parsed.forEach((c: any) => {
          if (c.estado === 'Pendiente') {
            pendingCuotas.push({
              convId: conv.id,
              numeroConv: conv.numero,
              cuotaId: c.id,
              fecha: c.fecha,
              monto: c.monto,
              rawConv: conv
            });
          }
        });
      });
      setCuotas(pendingCuotas);
    } else {
      alert("Contribuyente no encontrado");
    }
    
    setIsSearching(false);
  };

  // Recalculate Total
  useEffect(() => {
    let total = 0;
    
    selectedRecibos.forEach(ref => {
      const f = recibos.find(r => r.referencia === ref);
      if (f) total += parseFloat(f.monto || '0');
    });
    
    selectedCuotas.forEach(sc => {
      const c = cuotas.find(cq => cq.convId === sc.convId && cq.cuotaId === sc.cuotaId);
      if (c) total += parseFloat(c.monto || '0');
    });
    
    setTotalBs(total);
  }, [selectedRecibos, selectedCuotas, recibos, cuotas]);

  const toggleRecibo = (ref: string) => {
    if (selectedRecibos.includes(ref)) {
      setSelectedRecibos(selectedRecibos.filter(r => r !== ref));
    } else {
      setSelectedRecibos([...selectedRecibos, ref]);
    }
  };

  const toggleCuota = (convId: string, cuotaId: number) => {
    const exists = selectedCuotas.find(c => c.convId === convId && c.cuotaId === cuotaId);
    if (exists) {
      setSelectedCuotas(selectedCuotas.filter(c => !(c.convId === convId && c.cuotaId === cuotaId)));
    } else {
      setSelectedCuotas([...selectedCuotas, {convId, cuotaId}]);
    }
  };

  const handlePayment = async () => {
    if (totalBs <= 0) return alert("Debe seleccionar al menos una deuda a pagar.");
    
    const finalTotal = Math.max(0, totalBs - (useSaldoFavor ? foundUser.SaldoFavor : 0));
    const descuentoSaldoFavor = useSaldoFavor ? Math.min(totalBs, foundUser.SaldoFavor) : 0;
    
    let saldoAFavorNuevo = 0;
    let esAbono = false;
    let montoReal = finalTotal;

    if (paymentMethod === 'Transferencia') {
      if (!banco) return alert("Debe seleccionar el banco emisor.");
      if (referencia.length < 8) return alert("Debe ingresar los últimos 8 dígitos de la referencia.");
      
      const transferido = parseFloat(montoTransferido);
      if (isNaN(transferido) || transferido <= 0) return alert("Debe ingresar un monto transferido válido.");
      
      if (transferido < finalTotal) {
        esAbono = true;
        montoReal = transferido;
      } else if (transferido > finalTotal) {
        saldoAFavorNuevo = transferido - finalTotal;
        montoReal = transferido;
      } else {
        montoReal = transferido;
      }
    }
    
    if (!confirm(`¿Confirmar pago por Bs. ${montoReal.toFixed(2)}${saldoAFavorNuevo > 0 ? ` (Generará un Saldo a Favor de Bs. ${saldoAFavorNuevo.toFixed(2)})` : ''}${esAbono ? ` (Es un ABONO. Quedará un saldo pendiente de Bs. ${(finalTotal - montoReal).toFixed(2)})` : ''} mediante ${paymentMethod}?`)) return;

    setIsProcessing(true);
    
    try {
      // Si hay saldo a favor, generar Nota de Crédito
      if (saldoAFavorNuevo > 0) {
        await supabase.from('documentos').insert([{
          identidad: foundUser.Identidad,
          contribuyente: foundUser.Contribuyente,
          tipo: 'Nota de Credito',
          estado: 'Vigente',
          detalles: JSON.stringify({
            monto: saldoAFavorNuevo.toFixed(2),
            origen_referencia: paymentMethod === 'Transferencia' ? referencia : 'Debito',
            fecha_emision: new Date().toISOString()
          })
        }]);
        const { data: userInmuebles } = await supabase.from('inmuebles').select('id, saldo_favor_bs').eq('identidad', foundUser.Identidad);
        if (userInmuebles && userInmuebles.length > 0) {
          const firstInmueble = userInmuebles[0];
          const currentSaldo = parseFloat(firstInmueble.saldo_favor_bs || '0');
          if (paymentMethod === 'Debito') {
             await supabase.from('inmuebles').update({ saldo_favor_bs: currentSaldo + saldoAFavorNuevo }).eq('id', firstInmueble.id);
          }
        }
      }
      
      // Deduct used Saldo a Favor immediately
      if (descuentoSaldoFavor > 0) {
        const { data: userInmuebles } = await supabase.from('inmuebles').select('id, saldo_favor_bs').eq('identidad', foundUser.Identidad);
        if (userInmuebles && userInmuebles.length > 0) {
          const firstInmueble = userInmuebles[0];
          const currentSaldo = parseFloat(firstInmueble.saldo_favor_bs || '0');
          const newSaldo = Math.max(0, currentSaldo - descuentoSaldoFavor);
          await supabase.from('inmuebles').update({ saldo_favor_bs: newSaldo }).eq('id', firstInmueble.id);
        }
      }
      if (paymentMethod === 'Debito') {
        // Direct Payment (Pagado)
        if (selectedRecibos.length > 0) {
          const { error: fErr } = await supabase
            .from('facturas')
            .update({ estado: 'Pagado' })
            .in('referencia', selectedRecibos);
          if (fErr) throw fErr;
        }
        
        if (selectedCuotas.length > 0) {
          // Group by convenio
          const convMap = new Map();
          selectedCuotas.forEach(sc => {
            const cq = cuotas.find(q => q.convId === sc.convId && q.cuotaId === sc.cuotaId);
            if (cq) {
              if (!convMap.has(sc.convId)) convMap.set(sc.convId, { raw: cq.rawConv, toUpdate: [] });
              convMap.get(sc.convId).toUpdate.push(sc.cuotaId);
            }
          });
          
          for (const [cId, data] of convMap.entries()) {
            let parsed = [];
            try { parsed = JSON.parse(data.raw.detalle_cuotas); } catch(e){}
            parsed.forEach((c: any) => {
              if (data.toUpdate.includes(c.id)) {
                c.estado = 'Pagado';
              }
            });
            await supabase.from('convenios').update({ detalle_cuotas: JSON.stringify(parsed) }).eq('id', cId);
          }
        }
        
        setSuccessMsg("Pago procesado exitosamente por Tarjeta de Débito. La deuda ha sido eliminada.");
        
      } else {
        // Transferencia -> Enviar a Verificación
        const { error: pErr } = await supabase.from('pagos_reportados').insert({
          identidad: foundUser.Identidad,
          monto: montoReal,
          banco: banco,
          referencia: referencia,
          tipo: 'Transferencia',
          estado: 'Por Verificar',
          detalles: JSON.stringify({ 
            recibos: selectedRecibos, 
            cuotas: selectedCuotas,
            saldo_favor: saldoAFavorNuevo,
            es_abono: esAbono,
            total_seleccionado: totalBs,
            saldo_usado: descuentoSaldoFavor
          })
        });
        
        if (pErr) throw pErr;
        
        // Update items to 'Por Verificar'
        if (selectedRecibos.length > 0) {
          await supabase.from('facturas').update({ estado: 'Por Verificar' }).in('referencia', selectedRecibos);
        }
        
        if (selectedCuotas.length > 0) {
          const convMap = new Map();
          selectedCuotas.forEach(sc => {
            const cq = cuotas.find(q => q.convId === sc.convId && q.cuotaId === sc.cuotaId);
            if (cq) {
              if (!convMap.has(sc.convId)) convMap.set(sc.convId, { raw: cq.rawConv, toUpdate: [] });
              convMap.get(sc.convId).toUpdate.push(sc.cuotaId);
            }
          });
          
          for (const [cId, data] of convMap.entries()) {
            let parsed = [];
            try { parsed = JSON.parse(data.raw.detalle_cuotas); } catch(e){}
            parsed.forEach((c: any) => {
              if (data.toUpdate.includes(c.id)) {
                c.estado = 'Por Verificar';
              }
            });
            await supabase.from('convenios').update({ detalle_cuotas: JSON.stringify(parsed) }).eq('id', cId);
          }
        }

        setSuccessMsg("Transferencia registrada. Ha sido enviada al módulo de Facturación para su verificación.");
      }

      // Reset
      setTimeout(() => {
        setSuccessMsg('');
        handleSearch(); // Refresh list
        setBanco('');
        setReferencia('');
      }, 3000);
      
    } catch (err: any) {
      console.error(err);
      alert('Error: ' + err.message);
    }
    setIsProcessing(false);
  };

  const handleCrearNotaManual = async () => {
    if (!notaManualMonto || parseFloat(notaManualMonto) <= 0) return alert('Ingrese un monto válido');
    if (!notaManualRef) return alert('Ingrese la referencia origen');
    if (!foundUser) return;
    
    try {
      await supabase.from('documentos').insert([{
        identidad: foundUser.Identidad,
        contribuyente: foundUser.Contribuyente,
        tipo: 'Nota de Credito',
        estado: 'Vigente',
        detalles: JSON.stringify({
          monto: parseFloat(notaManualMonto).toFixed(2),
          origen_referencia: `Manual: ${notaManualRef}`,
          fecha_emision: new Date().toISOString()
        })
      }]);
      
      const { data: userInmuebles } = await supabase.from('inmuebles').select('id, saldo_favor_bs').eq('identidad', foundUser.Identidad);
      if (userInmuebles && userInmuebles.length > 0) {
        const firstInmueble = userInmuebles[0];
        const currentSaldo = parseFloat(firstInmueble.saldo_favor_bs || '0');
        await supabase.from('inmuebles').update({ saldo_favor_bs: currentSaldo + parseFloat(notaManualMonto) }).eq('id', firstInmueble.id);
      }
      
      setSuccessMsg('Nota de crédito manual generada exitosamente.');
      setIsNotaModalOpen(false);
      setNotaManualMonto('');
      setNotaManualRef('');
      setTimeout(() => setSuccessMsg(''), 4000);
      handleSearch(); // Refresh user data
    } catch (e: any) {
      alert('Error creando nota: ' + e.message);
    }
  };

  const generarExcelNotasCredito = async () => {
    try {
      const notas = (documentos || []).filter(d => d.tipo === 'Nota de Credito');
      const XLSX = await import('xlsx');
      
      const excelData = notas.map(n => {
        let details: any = {};
        try { details = JSON.parse(n.detalles); } catch(e){}
        return {
          "Fecha": n.created_at ? new Date(n.created_at).toLocaleDateString() : '',
          "Cédula/RIF": n.identidad,
          "Contribuyente": n.contribuyente,
          "Monto (Bs)": details.monto || 0,
          "Origen Ref": details.origen_referencia || '',
          "Estado": n.estado
        };
      });
      
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Notas de Crédito");
      XLSX.writeFile(workbook, `Notas_Credito_${new Date().getTime()}.xlsx`);
    } catch (e) {
      alert("Error exportando Excel");
    }
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto p-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <Landmark className="w-8 h-8 text-emerald-600" />
          <h1 className="text-2xl font-bold text-slate-800 uppercase tracking-wide">Módulo de Caja</h1>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="bg-emerald-50 text-emerald-700 px-4 py-2 rounded-lg text-sm font-semibold border border-emerald-200 flex flex-col justify-center">
            <div className="flex items-center gap-2">
              <span>Tasa BCV Aplicada:</span>
              <input 
                type="number" step="0.01" 
                value={customBcvRate} 
                onChange={e => setCustomBcvRate(e.target.value)}
                placeholder={tcmmv.toFixed(2)}
                className="w-24 px-2 py-0.5 rounded border border-emerald-300 bg-white text-emerald-900 font-bold outline-none focus:ring-1 focus:ring-emerald-500"
                title="Tasa BCV Manual (Requiere Permiso)"
              />
            </div>
          </div>
          <div className="flex bg-slate-100 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('Pagos')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'Pagos' ? 'bg-white text-emerald-700 shadow-sm font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Procesar Pagos
            </button>
            <button
              onClick={() => setActiveTab('NotasCredito')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'NotasCredito' ? 'bg-white text-emerald-700 shadow-sm font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Notas de Crédito
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'NotasCredito' ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold text-slate-800">Control de Saldos a Favor (Notas de Crédito)</h2>
            <button onClick={generarExcelNotasCredito} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
              <FileText className="w-4 h-4" /> Exportar a Excel
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-600 uppercase bg-slate-50 border-b">
                <tr>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Cédula / RIF</th>
                  <th className="px-4 py-3">Contribuyente</th>
                  <th className="px-4 py-3 text-right">Monto (Bs)</th>
                  <th className="px-4 py-3 text-center">Ref. Origen</th>
                  <th className="px-4 py-3 text-center">Estado</th>
                </tr>
              </thead>
              <tbody>
                {(documentos || []).filter(d => d.tipo === 'Nota de Credito').map(n => {
                  let details: any = {};
                  try { details = JSON.parse(n.detalles); } catch(e){}
                  return (
                    <tr key={n.id} className="border-b hover:bg-slate-50">
                      <td className="px-4 py-3">{new Date(n.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3 font-medium">{n.identidad}</td>
                      <td className="px-4 py-3">{n.contribuyente}</td>
                      <td className="px-4 py-3 text-right font-bold text-emerald-600">Bs. {details.monto}</td>
                      <td className="px-4 py-3 text-center">{details.origen_referencia}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-1 rounded text-xs font-semibold">{n.estado}</span>
                      </td>
                    </tr>
                  );
                })}
                {(documentos || []).filter(d => d.tipo === 'Nota de Credito').length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                      No hay notas de crédito registradas en el sistema.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
      <div className="space-y-6">
        {successMsg && (
        <div className="bg-emerald-50 text-emerald-800 p-4 rounded-lg border border-emerald-200 flex items-center gap-2 font-medium">
          <CheckCircle className="w-5 h-5 text-emerald-600" />
          {successMsg}
        </div>
      )}

      {/* Buscador */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
        <label className="block text-sm font-semibold text-slate-700 mb-2">Buscar Contribuyente</label>
        <div className="flex flex-col sm:flex-row gap-3">
          <select 
            value={docType}
            onChange={(e) => setDocType(e.target.value)}
            className="w-full sm:w-24 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
          >
            <option value="V">V -</option>
            <option value="J">J -</option>
            <option value="E">E -</option>
            <option value="G">G -</option>
            <option value="P">P -</option>
          </select>
          <input 
            type="text" 
            placeholder="Número de documento..."
            value={docNumber}
            onChange={(e) => setDocNumber(e.target.value)}
            className="flex-1 border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-emerald-500 outline-none"
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button 
            onClick={handleSearch}
            disabled={isSearching || !docNumber}
            className="bg-emerald-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
          >
            <Search className="w-4 h-4" /> Buscar
          </button>
        </div>
      </div>

      {foundUser && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between gap-4">
            <div>
              <div className="flex items-center gap-4">
                <h2 className="text-xl font-bold text-slate-800">{foundUser.Contribuyente}</h2>
                <button onClick={() => setIsNotaModalOpen(true)} className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-1.5 rounded-full border border-slate-300 transition-colors">
                  + Agregar Saldo a Favor / Nota Manual
                </button>
              </div>
              <p className="text-sm text-slate-500">{foundUser.Identidad}</p>
              <div className="mt-2 text-xs bg-slate-100 text-slate-600 px-3 py-2 rounded border border-slate-200 inline-block">
                <span className="font-bold">Fórmula de Referencia:</span> El cálculo original se realizó multiplicando el Factor MMV por la Tasa BCV vigente en la emisión.
              </div>
            </div>
            {foundUser.SaldoFavor > 0 && (
              <div className="bg-emerald-100 border-2 border-emerald-500 p-4 rounded-xl flex flex-col items-center justify-center min-w-[200px]">
                <span className="text-emerald-700 font-bold text-sm uppercase">Saldo a Favor</span>
                <span className="text-2xl font-black text-emerald-600">Bs. {foundUser.SaldoFavor.toFixed(2)}</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Listado de Deudas */}
            <div className="lg:col-span-2 space-y-6">
            
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center gap-2">
                <FileText className="w-5 h-5 text-slate-600" />
                <h3 className="font-bold text-slate-800">Recibos de Aseo Mensual</h3>
              </div>
              <div className="p-4">
                {recibos.length === 0 ? (
                  <p className="text-sm text-slate-500">No hay recibos pendientes.</p>
                ) : (
                  <div className="space-y-2">
                    {recibos.map(r => (
                      <label key={r.referencia} className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${selectedRecibos.includes(r.referencia) ? 'bg-emerald-50 border-emerald-200' : 'hover:bg-slate-50 border-slate-200'}`}>
                        <div className="flex items-center gap-3">
                          <input 
                            type="checkbox" 
                            checked={selectedRecibos.includes(r.referencia)}
                            onChange={() => toggleRecibo(r.referencia)}
                            className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                          />
                          <div>
                            <p className="font-semibold text-sm text-slate-800">{r.referencia}</p>
                            <p className="text-xs text-slate-500">Emisión: {r.emision}</p>
                          </div>
                        </div>
                        <span className="font-bold text-emerald-700">{r.monto}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
              <div className="bg-orange-50 px-4 py-3 border-b border-orange-200 flex items-center gap-2">
                <Handshake className="w-5 h-5 text-orange-600" />
                <h3 className="font-bold text-orange-800">Cuotas de Convenio de Pago</h3>
              </div>
              <div className="p-4">
                {cuotas.length === 0 ? (
                  <p className="text-sm text-slate-500">No hay cuotas pendientes.</p>
                ) : (
                  <div className="space-y-2">
                    {cuotas.map((c, i) => (
                      <label key={i} className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${selectedCuotas.find(sc => sc.convId === c.convId && sc.cuotaId === c.cuotaId) ? 'bg-orange-50 border-orange-200' : 'hover:bg-slate-50 border-slate-200'}`}>
                        <div className="flex items-center gap-3">
                          <input 
                            type="checkbox" 
                            checked={!!selectedCuotas.find(sc => sc.convId === c.convId && sc.cuotaId === c.cuotaId)}
                            onChange={() => toggleCuota(c.convId, c.cuotaId)}
                            className="w-4 h-4 text-orange-600 rounded border-slate-300 focus:ring-orange-500"
                          />
                          <div>
                            <p className="font-semibold text-sm text-slate-800">{c.numeroConv} - Cuota {c.cuotaId + 1}</p>
                            <p className="text-xs text-slate-500">Fecha de Pago: {c.fecha}</p>
                          </div>
                        </div>
                        <span className="font-bold text-orange-700">{c.monto} Bs</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Panel de Pago */}
          <div className="bg-slate-50 rounded-lg shadow-sm border border-slate-200 p-6 h-fit sticky top-6">
            <h3 className="font-bold text-slate-800 text-lg mb-4 border-b border-slate-200 pb-2">Resumen de Pago</h3>
            
            <div className="flex justify-between items-center mb-6">
              <span className="text-slate-600 font-medium">Total a Pagar:</span>
              <span className="text-2xl font-black text-emerald-700">Bs. {totalBs.toFixed(2)}</span>
            </div>

            <div className="space-y-4 mb-6">
              <label className="block">
                <span className="text-sm font-semibold text-slate-700 mb-1 block">Método de Pago</span>
                <select 
                  value={paymentMethod}
                  onChange={(e: any) => setPaymentMethod(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <option value="Debito">Tarjeta de Débito (Punto de Venta)</option>
                  <option value="Transferencia">Transferencia Bancaria</option>
                </select>
              </label>

              {paymentMethod === 'Transferencia' && (
                <div className="space-y-3 bg-white p-3 rounded border border-slate-200">
                  <label className="block">
                    <span className="text-xs font-semibold text-slate-600 mb-1 block">Banco Emisor</span>
                    <select
                      value={banco}
                      onChange={(e) => setBanco(e.target.value)}
                      className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                    >
                      <option value="" disabled>Seleccione un Banco...</option>
                      {bancosVenezuela.map(b => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-xs font-semibold text-slate-600 mb-1 block">Últimos 8 dígitos de la Referencia</span>
                    <input 
                      type="text" 
                      maxLength={8}
                      placeholder="12345678"
                      value={referencia}
                      onChange={(e) => setReferencia(e.target.value.replace(/\D/g, ''))}
                      className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-semibold text-slate-600 mb-1 block">Monto Total Transferido (Bs)</span>
                    <input 
                      type="number" 
                      step="0.01"
                      placeholder="Ej: 500.00"
                      value={montoTransferido}
                      onChange={(e) => setMontoTransferido(e.target.value)}
                      className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                    {parseFloat(montoTransferido) > Math.max(0, totalBs - (useSaldoFavor ? foundUser?.SaldoFavor || 0 : 0)) && (
                      <p className="text-[10px] text-emerald-600 mt-1 font-bold">
                        * Se generará un saldo a favor de Bs. {(parseFloat(montoTransferido) - Math.max(0, totalBs - (useSaldoFavor ? foundUser?.SaldoFavor || 0 : 0))).toFixed(2)}
                      </p>
                    )}
                    {(parseFloat(montoTransferido) > 0 && parseFloat(montoTransferido) < Math.max(0, totalBs - (useSaldoFavor ? foundUser?.SaldoFavor || 0 : 0))) && (
                      <p className="text-[10px] text-orange-600 mt-1 font-bold">
                        * Es un ABONO. Quedará un saldo pendiente de Bs. {(Math.max(0, totalBs - (useSaldoFavor ? foundUser?.SaldoFavor || 0 : 0)) - parseFloat(montoTransferido)).toFixed(2)}
                      </p>
                    )}
                  </label>
                </div>
              )}
            </div>

            <button 
              onClick={handlePayment}
              disabled={isProcessing || totalBs <= 0}
              className="w-full bg-slate-800 text-white py-3 rounded-lg font-bold hover:bg-slate-900 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              <CreditCard className="w-5 h-5" /> 
              {isProcessing ? 'Procesando...' : 'Procesar Pago'}
            </button>
          </div>
        </div>
        </div>
      )}
      </div>
      )}

      {/* Modal Nota Manual */}
      {isNotaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 rounded-t-lg">
              <h3 className="font-bold text-slate-800">Generar Nota de Crédito Manual</h3>
              <button onClick={() => setIsNotaModalOpen(false)} className="text-slate-500 hover:text-slate-700 font-bold">&times;</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Monto (Bs)</label>
                <input 
                  type="number" step="0.01" 
                  value={notaManualMonto} onChange={e => setNotaManualMonto(e.target.value)}
                  className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="Ej. 1000.00"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Motivo / Referencia Origen</label>
                <input 
                  type="text" 
                  value={notaManualRef} onChange={e => setNotaManualRef(e.target.value)}
                  className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="Ej. Transferencia no facturada #12345678"
                />
              </div>
            </div>
            <div className="p-4 border-t border-slate-200 bg-slate-50 rounded-b-lg flex justify-end gap-3">
              <button onClick={() => setIsNotaModalOpen(false)} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200 rounded">Cancelar</button>
              <button onClick={handleCrearNotaManual} className="px-4 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded shadow-sm">Generar Nota</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
