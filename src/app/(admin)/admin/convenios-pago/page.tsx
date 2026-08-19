'use client';
import React, { useState } from 'react';
import { DataTable } from '@/components/DataTable';
import { Handshake, FileEdit, Plus, X, Search } from 'lucide-react';
import { useAppContext } from '@/store/AppContext';
import { supabase } from '@/lib/supabase';

export default function ConveniosPagoPage() {
  const { convenios, inmuebles, tcmmv } = useAppContext();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchDoc, setSearchDoc] = useState('');
  const [foundUser, setFoundUser] = useState<any>(null);
  const [cuotas, setCuotas] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);

  const columns = [
    { key: 'numero', header: 'Nro. Convenio' },
    { key: 'contribuyente', header: 'Contribuyente' },
    { key: 'monto_total', header: 'Deuda Refinanciada' },
    { key: 'cuotas', header: 'Cuotas Acordadas' },
    { key: 'inicio', header: 'Fecha de Inicio' },
    { key: 'estado', header: 'Estado del Acuerdo', render: (row: any) => (
      <span className={`px-2 py-1 rounded text-xs font-semibold ${
        row.estado === 'Al Día' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
      }`}>{row.estado}</span>
    ) },
    { key: 'actions', header: 'Gestión', render: () => (
      <button className="text-slate-600 hover:text-slate-900 text-xs flex items-center gap-1">
        <FileEdit size={14} /> Detalle de Cuotas
      </button>
    ) }
  ];

  const handleSearch = () => {
    const userInmuebles = inmuebles.filter(i => i.identidad === searchDoc || i.cod_cont === searchDoc);
    if (userInmuebles.length > 0) {
      const totalMMV = userInmuebles.reduce((acc, curr) => acc + (curr.DeudaMMV || 0), 0);
      const totalCongelada = userInmuebles.reduce((acc, curr) => acc + (curr.DeudaCongelada || 0), 0);
      setFoundUser({
        identidad: userInmuebles[0].identidad,
        contribuyente: userInmuebles[0].contribuyente,
        inmuebles: userInmuebles,
        totalMMV,
        totalCongelada,
        montoACongelar: (totalMMV * tcmmv).toFixed(2)
      });
    } else {
      setFoundUser(null);
      alert('Contribuyente no encontrado o no tiene deuda pendiente.');
    }
  };

  const handleCrearConvenio = async () => {
    if (!foundUser) return;
    setIsProcessing(true);
    
    try {
      const montoTotalFijado = parseFloat(foundUser.montoACongelar);
      if (montoTotalFijado <= 0) {
        alert('El contribuyente no tiene deuda fluctuante que congelar.');
        setIsProcessing(false);
        return;
      }

      // Actualizar inmuebles
      for (const inm of foundUser.inmuebles) {
        const mmv = inm.DeudaMMV || 0;
        if (mmv > 0) {
          const bsToFreeze = mmv * tcmmv;
          const currentFrozen = inm.DeudaCongelada || 0;
          await supabase
            .from('inmuebles')
            .update({ 
              deuda_mmv: 0, 
              deuda_congelada_bs: currentFrozen + bsToFreeze 
            })
            .eq('id', inm.id);
        }
      }

      // Crear registro en convenios
      const nroConvenio = `CONV-${Date.now().toString().slice(-6)}`;
      await supabase.from('convenios').insert({
        numero: nroConvenio,
        contribuyente: foundUser.contribuyente,
        identidad: foundUser.identidad,
        monto_total: `${montoTotalFijado} Bs`,
        cuotas: cuotas,
        inicio: new Date().toISOString().split('T')[0],
        estado: 'Al Día'
      });

      // Crear registro de auditoría
      await supabase.from('audit').insert({
        action: 'Creación de Convenio (Congelamiento)',
        details: `Convenio ${nroConvenio} para ${foundUser.identidad}. Monto Congelado: ${montoTotalFijado} Bs a Tasa: ${tcmmv}`,
        user_email: 'Admin',
        module: 'Convenios'
      });

      alert('Convenio creado exitosamente. La deuda ha sido congelada.');
      setIsModalOpen(false);
      window.location.reload();
      
    } catch (error) {
      console.error(error);
      alert('Error al crear el convenio');
    }
    setIsProcessing(false);
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto p-6 relative">
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <Handshake className="w-5 h-5 text-slate-700" />
          <h1 className="text-lg font-semibold text-slate-800 uppercase tracking-wide">
            Convenios de Pago (Refinanciamiento)
          </h1>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-colors"
        >
          <Plus size={16} /> Crear Convenio
        </button>
      </div>

      <DataTable data={convenios} columns={columns} itemsPerPage={10} />

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-semibold text-slate-800 uppercase text-sm flex items-center gap-2">
                <Handshake size={16} /> Nuevo Convenio de Pago
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Buscar Contribuyente (Cédula/RIF o Código)
                </label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={searchDoc}
                    onChange={(e) => setSearchDoc(e.target.value)}
                    placeholder="V-12345678 o C-001"
                    className="flex-1 border border-slate-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  />
                  <button onClick={handleSearch} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded border border-slate-200">
                    <Search size={16} />
                  </button>
                </div>
              </div>

              {foundUser && (
                <div className="bg-blue-50 p-4 rounded-md border border-blue-100 text-sm space-y-2">
                  <p><span className="font-semibold">Contribuyente:</span> {foundUser.contribuyente}</p>
                  <p><span className="font-semibold">Identidad:</span> {foundUser.identidad}</p>
                  <div className="pt-2 mt-2 border-t border-blue-200/50">
                    <p className="text-xs text-slate-500 mb-1">Tasa BCV (TCMMV) Actual: <span className="font-semibold text-slate-700">{tcmmv} Bs</span></p>
                    <p className="flex justify-between items-center text-red-600 font-medium">
                      <span>Deuda Fluctuante (MMV):</span>
                      <span>{foundUser.totalMMV} MMV</span>
                    </p>
                    <p className="flex justify-between items-center text-emerald-700 font-bold text-lg mt-1 pt-1 border-t border-blue-200/50">
                      <span>Monto Final a Congelar (Bs):</span>
                      <span>{foundUser.montoACongelar} Bs</span>
                    </p>
                  </div>
                </div>
              )}

              {foundUser && (
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Número de Cuotas a Acordar
                  </label>
                  <select 
                    value={cuotas}
                    onChange={(e) => setCuotas(parseInt(e.target.value))}
                    className="w-full border border-slate-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  >
                    {[1,2,3,4,5,6,12].map(n => <option key={n} value={n}>{n} {n===1?'cuota':'cuotas'}</option>)}
                  </select>
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800"
              >
                Cancelar
              </button>
              <button 
                onClick={handleCrearConvenio}
                disabled={!foundUser || isProcessing}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded text-sm font-medium disabled:opacity-50 transition-colors"
              >
                {isProcessing ? 'Procesando...' : 'Congelar y Crear Convenio'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
