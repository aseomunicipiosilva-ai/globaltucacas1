'use client';
import React, { useState } from 'react';
import { DataTable } from '@/components/DataTable';
import { useAppContext } from '@/store/AppContext';
import { List, Check, X, CheckCircle } from 'lucide-react';

export default function PreRegistrosPage() {
  const { preRegistros, aprobarPreRegistro } = useAppContext();
  const [showSuccess, setShowSuccess] = useState<string | null>(null);

  const handleApprove = (item: number) => {
    aprobarPreRegistro(item);
    setShowSuccess(`El pre-registro fue aprobado correctamente.`);
    setTimeout(() => setShowSuccess(null), 3000);
  };

  const handleReject = (item: number) => {
    aprobarPreRegistro(item); // Simulate removal
    setShowSuccess(`El pre-registro ha sido rechazado.`);
    setTimeout(() => setShowSuccess(null), 3000);
  };

  const columns = [
    { key: 'item', header: 'Ítem' },
    { key: 'codigo', header: 'Código' },
    { key: 'identidad', header: 'Identidad' },
    { key: 'contribuyente', header: 'Contribuyente' },
    { key: 'registro', header: 'Registro' },
    { key: 'tipo', header: 'Tipo' },
    { key: 'actividad', header: 'Actividad P.' },
    { key: 'registrado', header: 'Registrado' },
    { 
      key: 'fiscalizado', 
      header: 'Fiscalizado',
      render: (row: any) => row.fiscalizado ? <span className="text-green-500">SI</span> : <span className="text-red-500">NO</span>
    },
    {
      key: 'acciones',
      header: 'Acciones',
      render: (row: any) => (
        <div className="flex gap-2">
          <button onClick={() => handleApprove(row.item)} className="bg-emerald-50 text-emerald-600 hover:bg-emerald-100 p-1.5 rounded transition-colors" title="Aprobar">
            <Check className="w-4 h-4" />
          </button>
          <button onClick={() => handleReject(row.item)} className="bg-red-50 text-red-600 hover:bg-red-100 p-1.5 rounded transition-colors" title="Rechazar">
            <X className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto p-6">
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

      <div className="bg-white border border-slate-200 rounded p-4 mb-4 flex items-center justify-between shadow-sm">
        <div className="w-1/3">
          <select className="w-full border border-slate-300 rounded px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500">
            <option>Inmuebles - Pre-registros WEB (Com)</option>
          </select>
        </div>
        <button className="bg-slate-800 text-white hover:bg-slate-700 px-6 py-2 rounded text-sm font-medium transition-colors shadow-sm">
          Buscar
        </button>
      </div>

      <div className="flex bg-slate-100 p-2 rounded text-sm text-slate-700 font-medium mb-4">
        <div className="px-4 py-1 flex items-center gap-2 bg-white rounded shadow-sm border border-slate-200">
          <Check className="w-4 h-4 text-green-500" />
          Pre-registros WEB PENDIENTES ({preRegistros.length})
        </div>
      </div>

      <DataTable data={preRegistros} columns={columns} itemsPerPage={10} />
    </div>
  );
}
