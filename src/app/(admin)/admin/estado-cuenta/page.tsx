'use client';
import React, { useState } from 'react';
import { DataTable } from '@/components/DataTable';
import { FileSpreadsheet, Download, Filter } from 'lucide-react';

export default function EstadoCuentaPage() {
  const [data] = useState([
    { id: 'FAC-001', contribuyente: 'Juan Pérez', monto: 'Bs. 450.00', estado: 'Pendiente', emision: '15-08-2026', vencimiento: '30-08-2026' },
    { id: 'FAC-002', contribuyente: 'Inversiones Global C.A.', monto: 'Bs. 1200.00', estado: 'Pagado', emision: '01-08-2026', vencimiento: '15-08-2026' },
    { id: 'FAC-003', contribuyente: 'María Gómez', monto: 'Bs. 150.00', estado: 'Vencido', emision: '01-07-2026', vencimiento: '15-07-2026' },
    { id: 'FAC-004', contribuyente: 'Condominio El Sol', monto: 'Bs. 3500.00', estado: 'Pendiente', emision: '10-08-2026', vencimiento: '25-08-2026' }
  ]);

  const columns = [
    { key: 'id', header: 'Nro. Factura' },
    { key: 'contribuyente', header: 'Contribuyente' },
    { key: 'monto', header: 'Monto' },
    { key: 'estado', header: 'Estado', render: (row: any) => (
      <span className={`px-2 py-1 rounded text-xs font-semibold ${
        row.estado === 'Pagado' ? 'bg-green-100 text-green-700' :
        row.estado === 'Pendiente' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
      }`}>{row.estado}</span>
    ) },
    { key: 'emision', header: 'F. Emisión' },
    { key: 'vencimiento', header: 'F. Vencimiento' },
    { key: 'actions', header: 'Acciones', render: () => (
      <button className="text-blue-600 hover:text-blue-800 text-xs flex items-center gap-1">
        <Download size={14} /> Descargar
      </button>
    ) }
  ];

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto p-6">
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-slate-700" />
          <h1 className="text-lg font-semibold text-slate-800 uppercase tracking-wide">
            Estado de Cuenta General
          </h1>
        </div>
        <button className="bg-slate-100 text-slate-700 hover:bg-slate-200 px-4 py-2 rounded text-sm font-medium transition-colors flex items-center gap-2 border border-slate-300">
          <Filter className="w-4 h-4" /> Filtrar
        </button>
      </div>
      <DataTable data={data} columns={columns} itemsPerPage={10} />
    </div>
  );
}
