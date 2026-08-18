'use client';
import React from 'react';
import { DataTable } from '@/components/DataTable';
import { Building2, Settings } from 'lucide-react';
import { useAppContext } from '@/store/AppContext';

export default function CondominiosCOBPage() {
  const { condominios } = useAppContext();

  const columns = [
    { key: 'codigo', header: 'Código' },
    { key: 'nombre', header: 'Nombre del Condominio' },
    { key: 'direccion', header: 'Dirección' },
    { key: 'unidades', header: 'Unidades / Locales', render: (row: any) => (
      <span className="font-semibold text-slate-700">{row.unidades}</span>
    ) },
    { key: 'representante', header: 'Representante' },
    { key: 'estado', header: 'Estado', render: (row: any) => (
      <span className={`px-2 py-1 rounded text-xs font-semibold ${
        row.estado === 'Activo' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'
      }`}>{row.estado}</span>
    ) },
    { key: 'actions', header: 'Gestión', render: () => (
      <button className="text-blue-600 hover:text-blue-900 text-xs flex items-center gap-1">
        <Settings size={14} /> Administrar Unidades
      </button>
    ) }
  ];

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto p-6">
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-slate-700" />
          <h1 className="text-lg font-semibold text-slate-800 uppercase tracking-wide">
            Gestión de Condominios COB
          </h1>
        </div>
      </div>
      <DataTable data={condominios} columns={columns} itemsPerPage={10} />
    </div>
  );
}
