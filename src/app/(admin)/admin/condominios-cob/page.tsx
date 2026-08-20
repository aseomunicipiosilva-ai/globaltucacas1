'use client';
import React, { useState } from 'react';
import { DataTable } from '@/components/DataTable';
import { Building2, Settings, DollarSign, Handshake, Calculator } from 'lucide-react';
import { useAppContext } from '@/store/AppContext';
import { UnidadesModal } from '@/components/UnidadesModal';
import { DebtAdjustmentModal } from '@/components/DebtAdjustmentModal';
import Link from 'next/link';

export default function CondominiosCOBPage() {
  const { condominios, inmuebles, tcmmv, facturas, setFacturas, addAuditLog } = useAppContext();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCondominio, setSelectedCondominio] = useState<{ id: number, nombre: string, identidad: string } | null>(null);

  const [debtModalOpen, setDebtModalOpen] = useState(false);
  const [selectedDebtRow, setSelectedDebtRow] = useState<any>(null);

  const handleOpenModal = (row: any) => {
    setSelectedCondominio({ id: row.id, nombre: row.nombre, identidad: row.identidad });
    setModalOpen(true);
  };

  const columns = [
    { key: 'codigo', header: 'Código' },
    { key: 'identidad', header: 'RIF / Cédula' },
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
    { key: 'actions', header: 'Gestión / Estatus', render: (row: any) => {
      const hasDebt = Math.random() > 0.5;
      const debtAmount = hasDebt ? (Math.random() * 5000).toFixed(2) : '0.00';
      const hasAgreement = Math.random() > 0.7;

      return (
        <div className="flex gap-2 items-center">
          <button 
            onClick={() => handleOpenModal(row)}
            className="bg-slate-100 text-slate-600 hover:bg-slate-200 p-1.5 rounded transition-colors"
            title="Administrar Unidades"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button 
            onClick={() => { setSelectedDebtRow(row); setDebtModalOpen(true); }}
            className={`${hasDebt ? 'bg-orange-50 text-orange-600 hover:bg-orange-100' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'} p-1.5 rounded transition-colors`}
            title="Ajustar Deuda"
          >
            <Calculator className="w-4 h-4" />
          </button>
          <button 
            className={`${hasAgreement ? 'bg-blue-50 text-blue-600 hover:bg-blue-100' : 'bg-slate-50 text-slate-400 cursor-default'} p-1.5 rounded transition-colors`}
            title={hasAgreement ? 'Tiene convenio activo' : 'Sin convenios'}
          >
            <Handshake className="w-4 h-4" />
          </button>
        </div>
      );
    } }
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

      <div className="flex bg-slate-100 p-2 rounded text-sm text-slate-700 font-medium mb-4 w-fit">
        <Link href="/admin/inmuebles" className="px-4 py-1 text-slate-500 hover:text-slate-800 transition-colors">
          INMUEBLES
        </Link>
        <div className="px-4 py-1 bg-white shadow-sm rounded border border-slate-200 cursor-default">
          CONDOMINIOS Y COMERCIOS
        </div>
      </div>
      <DataTable data={condominios} columns={columns} itemsPerPage={10} />
      
      {modalOpen && selectedCondominio && (
        <UnidadesModal 
          condominioId={selectedCondominio.id} 
          condominioNombre={selectedCondominio.nombre} 
          condominioIdentidad={selectedCondominio.identidad}
          onClose={() => setModalOpen(false)} 
        />
      )}

      {debtModalOpen && selectedDebtRow && (
        <DebtAdjustmentModal
          row={selectedDebtRow}
          inmuebles={inmuebles}
          tcmmv={tcmmv}
          facturas={facturas}
          setFacturas={setFacturas}
          addAuditLog={addAuditLog}
          onClose={() => setDebtModalOpen(false)}
        />
      )}
    </div>
  );
}
