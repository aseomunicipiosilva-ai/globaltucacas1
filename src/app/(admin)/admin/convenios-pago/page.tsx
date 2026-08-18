'use client';
import React from 'react';
import { DataTable } from '@/components/DataTable';
import { Handshake, FileEdit } from 'lucide-react';
import { useAppContext } from '@/store/AppContext';

export default function ConveniosPagoPage() {
  const { convenios } = useAppContext();

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

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto p-6">
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <Handshake className="w-5 h-5 text-slate-700" />
          <h1 className="text-lg font-semibold text-slate-800 uppercase tracking-wide">
            Convenios de Pago (Refinanciamiento)
          </h1>
        </div>
      </div>
      <DataTable data={convenios} columns={columns} itemsPerPage={10} />
    </div>
  );
}
