'use client';
import React, { useState } from 'react';
import { DataTable } from '@/components/DataTable';
import { useAppContext } from '@/store/AppContext';
import { List, Check, X, CheckCircle, Calculator, AlertCircle } from 'lucide-react';
import { ordenanzaData } from '@/data/ordenanza';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function PreRegistrosPage() {
  const { preRegistros, setPreRegistros, setInmuebles, setFacturas, addAuditLog, currentTcmmv } = useAppContext();
  const [showSuccess, setShowSuccess] = useState<string | null>(null);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [rowToApprove, setRowToApprove] = useState<any>(null);
  const [meses, setMeses] = useState(1);
  const [calculatedFactor, setCalculatedFactor] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  const calculateFactor = (row: any) => {
    let factor = 0;
    if (row.clasificacion === 'Residencial') {
       const t = ordenanzaData.tiposResidenciales.find(x => x.label === row.actividad);
       if (t) factor = t.factor;
    } else if (row.clasificacion === 'Industrial') {
       const t = ordenanzaData.actividadesIndustriales.find(x => x.label === row.actividad);
       if (t) {
          const nivelIdx = ordenanzaData.nivelesMetraje.indexOf(row.nivel);
          if(nivelIdx >= 0 && t.factores.length > nivelIdx) factor = t.factores[nivelIdx];
       }
    } else {
       const t = ordenanzaData.actividadesComerciales.find(x => x.label === row.actividad);
       if (t) {
          const nivelIdx = ordenanzaData.nivelesMetraje.indexOf(row.nivel);
          if(nivelIdx >= 0 && t.factores.length > nivelIdx) factor = t.factores[nivelIdx];
       }
    }
    return factor;
  };

  const handleApproveClick = (row: any) => {
    setRowToApprove(row);
    setCalculatedFactor(calculateFactor(row));
    setMeses(1);
    setIsModalOpen(true);
  };

  const handleConfirmApproval = async () => {
    if (!rowToApprove) return;
    setIsProcessing(true);
    try {
      const deudaMMV = calculatedFactor * meses;
      const codCont = `N-${Math.floor(Math.random() * 100000)}`;

      // 1. Insert into inmuebles
      const inmuebleData = {
        identidad: rowToApprove.identidad,
        contribuyente: rowToApprove.contribuyente,
        telefono: rowToApprove.telefono,
        correo_electronico: rowToApprove.correo_electronico,
        direccion: rowToApprove.direccion,
        cod_cont: codCont,
        clasificacion: rowToApprove.clasificacion,
        actividad_principal: rowToApprove.actividad,
        inmueble: rowToApprove.tipo || 'Principal',
        deuda_mmv: deudaMMV,
        deuda_congelada_bs: 0
      };

      const { data: newInmueble, error: err1 } = await supabase.from('inmuebles').insert([inmuebleData]).select().single();
      if (err1) throw err1;

      // 2. Generate Factura if debt > 0
      if (deudaMMV > 0) {
        const facturaData = {
          referencia: `FACT-${Math.floor(Math.random() * 1000000)}`,
          contribuyente: rowToApprove.contribuyente,
          monto: (deudaMMV * (currentTcmmv || 1)).toFixed(2), // We store in Bs for the factura
          emision: new Date().toISOString().split('T')[0],
          vencimiento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          estado: 'Pendiente'
        };
        const { data: newFactura, error: err2 } = await supabase.from('facturas').insert([facturaData]).select().single();
        if (err2) throw err2;
        if (newFactura) setFacturas((prev: any) => [newFactura, ...prev]);
      }

      // 3. Delete from pre_registros
      const { error: err3 } = await supabase.from('pre_registros').delete().eq('id', rowToApprove.id);
      if (err3) throw err3;

      // Update state
      setInmuebles((prev: any) => [newInmueble, ...prev]);
      setPreRegistros((prev: any) => prev.filter((r: any) => r.id !== rowToApprove.id));
      await addAuditLog('APROBAR_PREREGISTRO', `Aprobado con deuda inicial de ${deudaMMV} MMV para ${rowToApprove.identidad}`);

      setShowSuccess(`Contribuyente ${rowToApprove.contribuyente} aprobado y deuda inicial asignada.`);
      setTimeout(() => setShowSuccess(null), 4000);
      setIsModalOpen(false);
    } catch (e: any) {
      console.error(e);
      alert('Error al aprobar: ' + e.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async (row: any) => {
    if (confirm('¿Está seguro de rechazar y eliminar esta solicitud?')) {
      await supabase.from('pre_registros').delete().eq('id', row.id);
      setPreRegistros((prev: any) => prev.filter((r: any) => r.id !== row.id));
      setShowSuccess(`El pre-registro ha sido rechazado.`);
      setTimeout(() => setShowSuccess(null), 3000);
    }
  };

  const columns = [
    { key: 'id', header: 'Ítem' },
    { key: 'identidad', header: 'Identidad' },
    { key: 'contribuyente', header: 'Contribuyente' },
    { key: 'clasificacion', header: 'Clasificación' },
    { key: 'actividad', header: 'Actividad P.' },
    { key: 'nivel', header: 'Metraje' },
    {
      key: 'acciones',
      header: 'Acciones',
      render: (row: any) => (
        <div className="flex gap-2">
          <button onClick={() => handleApproveClick(row)} className="bg-emerald-50 text-emerald-600 hover:bg-emerald-100 p-1.5 rounded transition-colors" title="Aprobar y Asignar Deuda">
            <Check className="w-4 h-4" />
          </button>
          <button onClick={() => handleReject(row)} className="bg-red-50 text-red-600 hover:bg-red-100 p-1.5 rounded transition-colors" title="Rechazar">
            <X className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto p-6 relative">
      {/* Header */}
      <div className="flex items-center gap-2 pb-4 border-b border-slate-200">
        <List className="w-5 h-5 text-slate-700" />
        <h1 className="text-lg font-semibold text-slate-800 uppercase tracking-wide">
          Listados Generales
        </h1>
      </div>

      {showSuccess && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded relative flex items-center gap-2 shadow-sm" role="alert">
          <CheckCircle className="w-5 h-5" />
          <span className="block sm:inline">{showSuccess}</span>
        </div>
      )}

      <div className="flex bg-slate-100 p-2 rounded text-sm text-slate-700 font-medium mb-4">
        <div className="px-4 py-1 flex items-center gap-2 bg-white rounded shadow-sm border border-slate-200">
          <Check className="w-4 h-4 text-green-500" />
          Pre-registros WEB PENDIENTES ({preRegistros.length})
        </div>
      </div>

      <DataTable data={preRegistros} columns={columns} itemsPerPage={10} />

      {/* MODAL DE APROBACION Y DEUDA */}
      {isModalOpen && rowToApprove && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200">
            <div className="bg-slate-800 p-4 flex items-center justify-between">
              <h2 className="text-white font-bold flex items-center gap-2">
                <Calculator className="w-5 h-5 text-emerald-400" />
                Aprobar y Calcular Deuda Inicial
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 space-y-2">
                <p className="text-sm"><span className="font-semibold text-slate-700">Contribuyente:</span> {rowToApprove.contribuyente} ({rowToApprove.identidad})</p>
                <p className="text-sm"><span className="font-semibold text-slate-700">Clasificación:</span> {rowToApprove.clasificacion}</p>
                <p className="text-sm"><span className="font-semibold text-slate-700">Actividad:</span> {rowToApprove.actividad}</p>
                <p className="text-sm"><span className="font-semibold text-slate-700">Nivel/Metraje:</span> {rowToApprove.nivel}</p>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center bg-blue-50 p-3 rounded border border-blue-100">
                  <span className="text-sm font-semibold text-blue-800">Tarifa Mensual (MMV):</span>
                  <span className="font-bold text-blue-900 text-lg">{calculatedFactor.toFixed(2)}</span>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Meses a adeudar (Morosidad Inicial)</label>
                  <input 
                    type="number" 
                    min="0"
                    value={meses} 
                    onChange={(e) => setMeses(Number(e.target.value))}
                    className="w-full border-2 border-slate-200 rounded-lg px-4 py-2 font-semibold text-slate-700 focus:border-emerald-500 outline-none"
                  />
                </div>

                <div className="flex justify-between items-center bg-emerald-50 p-4 rounded-lg border border-emerald-200 shadow-inner">
                  <span className="font-bold text-emerald-800">Deuda Total Inicial:</span>
                  <div className="text-right">
                    <span className="block font-black text-emerald-600 text-2xl">{(calculatedFactor * meses).toFixed(2)} MMV</span>
                    <span className="block text-xs font-semibold text-emerald-700 mt-1">≈ Bs. {(calculatedFactor * meses * (currentTcmmv || 1)).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2 bg-amber-50 p-3 rounded border border-amber-200">
                <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 leading-relaxed font-medium">
                  Al confirmar, este registro será movido a la tabla de Inmuebles/Contribuyentes y se le generará una factura inicial por el monto reflejado arriba.
                </p>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 font-bold py-2.5 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleConfirmApproval}
                  disabled={isProcessing}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-lg transition-colors shadow-sm disabled:opacity-70 flex justify-center"
                >
                  {isProcessing ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : 'Confirmar Aprobación'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
