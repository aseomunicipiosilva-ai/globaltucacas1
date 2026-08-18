'use client';
import React, { useState } from 'react';
import { DataTable } from '@/components/DataTable';
import { Clock, CheckSquare } from 'lucide-react';

export default function PorFacturarPage() {
  const [data] = useState([
    { id: 'PF-001', contribuyente: 'Carlos Ruiz', concepto: 'Aseo Urbano (Agosto)', montoBase: 'Bs. 450.00', fechaCorte: '30-08-2026' },
    { id: 'PF-002', contribuyente: 'Tienda La Esquina', concepto: 'Aseo Urbano (Agosto)', montoBase: 'Bs. 1200.00', fechaCorte: '30-08-2026' },
    { id: 'PF-003', contribuyente: 'Condominio El Sol', concepto: 'Aseo Urbano (Agosto)', montoBase: 'Bs. 3500.00', fechaCorte: '30-08-2026' },
  ]);

  const columns = [
    { key: 'id', header: 'Referencia' },
    { key: 'contribuyente', header: 'Contribuyente' },
    { key: 'concepto', header: 'Concepto' },
    { key: 'montoBase', header: 'Monto Base Estimado' },
    { key: 'fechaCorte', header: 'Fecha de Corte' },
    { key: 'actions', header: 'Acciones', render: () => (
      <button className="bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-1 rounded text-xs font-medium border border-blue-200 flex items-center gap-1">
        <CheckSquare size={14} /> Generar Factura
      </button>
    ) }
  ];

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto p-6">
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-slate-700" />
          <h1 className="text-lg font-semibold text-slate-800 uppercase tracking-wide">
            Cuentas Por Facturar (Pre-liquidación)
          </h1>
        </div>
        <button className="bg-slate-800 text-white hover:bg-slate-700 px-4 py-2 rounded text-sm font-medium transition-colors flex items-center gap-2">
          Generar Facturación Masiva
        </button>
      </div>
      <DataTable data={data} columns={columns} itemsPerPage={10} />
    </div>
  );
}
