'use client';
import React from 'react';
import { DataTable } from '@/components/DataTable';
import { Clock, CheckSquare } from 'lucide-react';
import { useAppContext } from '@/store/AppContext';

export default function PorFacturarPage() {
  const { preLiquidaciones } = useAppContext();

  const columns = [
    { key: 'referencia', header: 'Referencia' },
    { key: 'contribuyente', header: 'Contribuyente' },
    { key: 'concepto', header: 'Concepto' },
    { key: 'monto', header: 'Monto Base Estimado' },
    { key: 'fecha_corte', header: 'Fecha de Corte' },
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
      
      <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg flex items-start gap-3">
        <div className="bg-blue-100 p-2 rounded-full mt-0.5 text-blue-600 shrink-0">
          <Clock size={20} />
        </div>
        <div>
          <h3 className="text-blue-800 font-bold text-sm">¿Qué es este módulo?</h3>
          <p className="text-blue-700 text-xs mt-1 leading-relaxed">
            Este módulo muestra los <strong>próximos ciclos automatizados</strong> a generar para comercios y residencias. 
            Actúa como una <strong>sala de espera o pre-liquidación</strong> donde se calculan las deudas del mes en curso antes de convertirse en facturas reales.
            Puedes generar las facturas de forma individual o usar la "Facturación Masiva" para emitirlas todas a la vez en el próximo corte.
          </p>
        </div>
      </div>

      <DataTable data={preLiquidaciones} columns={columns} itemsPerPage={10} />
    </div>
  );
}
