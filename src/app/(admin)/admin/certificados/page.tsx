'use client';
import React from 'react';
import { DataTable } from '@/components/DataTable';
import { Award, Printer, CheckCircle } from 'lucide-react';
import { useAppContext } from '@/store/AppContext';

export default function CertificadosPage() {
  const { certificados } = useAppContext();

  const columns = [
    { key: 'codigo', header: 'Código Certificado' },
    { key: 'contribuyente', header: 'Contribuyente' },
    { key: 'tipo', header: 'Tipo de Certificado' },
    { key: 'emision', header: 'Emisión' },
    { key: 'vencimiento', header: 'Vencimiento' },
    { key: 'estado', header: 'Estado', render: (row: any) => (
      <span className={`px-2 py-1 rounded text-xs font-semibold flex items-center gap-1 w-fit ${
        row.estado === 'Vigente' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
      }`}>
        {row.estado === 'Vigente' && <CheckCircle size={12} />}
        {row.estado}
      </span>
    ) },
    { key: 'actions', header: 'Acciones', render: () => (
      <button className="text-slate-600 hover:text-slate-900 text-xs flex items-center gap-1">
        <Printer size={14} /> Imprimir
      </button>
    ) }
  ];

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto p-6">
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <Award className="w-5 h-5 text-slate-700" />
          <h1 className="text-lg font-semibold text-slate-800 uppercase tracking-wide">
            Certificados y Solvencias Emitidas
          </h1>
        </div>
      </div>
      <DataTable data={certificados} columns={columns} itemsPerPage={10} />
    </div>
  );
}
