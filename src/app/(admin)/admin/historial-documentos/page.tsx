'use client';
import React, { useState } from 'react';
import { DataTable } from '@/components/DataTable';
import { History, Eye } from 'lucide-react';

export default function HistorialDocumentosPage() {
  const [data] = useState([
    { id: 'DOC-101', contribuyente: 'Carlos Ruiz', tipo: 'Solvencia', fecha: '18-08-2026', emisor: 'Admin', estado: 'Generado' },
    { id: 'DOC-102', contribuyente: 'Tienda La Esquina', tipo: 'Factura', fecha: '17-08-2026', emisor: 'Sistema', estado: 'Enviado' },
    { id: 'DOC-103', contribuyente: 'Condominio El Sol', tipo: 'Notificación', fecha: '15-08-2026', emisor: 'Fiscal 01', estado: 'Leído' },
  ]);

  const columns = [
    { key: 'id', header: 'ID Documento' },
    { key: 'contribuyente', header: 'Contribuyente' },
    { key: 'tipo', header: 'Tipo' },
    { key: 'fecha', header: 'Fecha' },
    { key: 'emisor', header: 'Emisor' },
    { key: 'estado', header: 'Estado', render: (row: any) => (
      <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2 py-1 rounded text-xs font-semibold">{row.estado}</span>
    ) },
    { key: 'actions', header: 'Acciones', render: () => (
      <button className="text-slate-600 hover:text-slate-900 text-xs flex items-center gap-1">
        <Eye size={14} /> Ver Detalle
      </button>
    ) }
  ];

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto p-6">
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-slate-700" />
          <h1 className="text-lg font-semibold text-slate-800 uppercase tracking-wide">
            Historial de Documentos
          </h1>
        </div>
      </div>
      <DataTable data={data} columns={columns} itemsPerPage={10} />
    </div>
  );
}
