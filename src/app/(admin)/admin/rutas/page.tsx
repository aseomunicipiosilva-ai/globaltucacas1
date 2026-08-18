'use client';
import React, { useState } from 'react';
import { DataTable } from '@/components/DataTable';
import { Truck, Map, Edit, Check } from 'lucide-react';

export default function RutasCamionesPage() {
  const [rutas] = useState([
    { id: 'R-001', nombre: 'Ruta Centro 1', frecuencia: 'Lunes, Miércoles, Viernes', sectores: 'Casco Central, Av. Principal', chofer: 'Pedro Perez', vehiculo: 'Placa ABC-12D', estado: 'Activa' },
    { id: 'R-002', nombre: 'Ruta Sur', frecuencia: 'Martes, Jueves, Sábado', sectores: 'Las Salinas, Sanare', chofer: 'Luis Gomez', vehiculo: 'Placa XYZ-987', estado: 'Activa' },
    { id: 'R-003', nombre: 'Ruta Norte (Comercial)', frecuencia: 'Diario', sectores: 'Zona Comercial, Mercado', chofer: 'Carlos Ruiz', vehiculo: 'Placa DEF-345', estado: 'Mantenimiento' }
  ]);

  const columns = [
    { key: 'nombre', header: 'Nombre de Ruta' },
    { key: 'frecuencia', header: 'Frecuencia' },
    { key: 'sectores', header: 'Sectores Atendidos' },
    { key: 'chofer', header: 'Chofer Asignado' },
    { key: 'vehiculo', header: 'Vehículo' },
    { key: 'estado', header: 'Estatus', render: (row: any) => (
      <span className={`px-2 py-1 rounded text-xs font-semibold ${
        row.estado === 'Activa' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
      }`}>{row.estado}</span>
    ) },
    { key: 'acciones', header: 'Gestión', render: (row: any) => (
      <div className="flex gap-2">
        <button className="bg-slate-100 text-slate-600 hover:bg-slate-200 p-1.5 rounded transition-colors" title="Editar Ruta">
          <Edit className="w-4 h-4" />
        </button>
        <button className="bg-blue-50 text-blue-600 hover:bg-blue-100 p-1.5 rounded transition-colors" title="Ver en Mapa (Próximamente)">
          <Map className="w-4 h-4" />
        </button>
      </div>
    ) }
  ];

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto p-6">
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <Truck className="w-5 h-5 text-slate-700" />
          <h1 className="text-lg font-semibold text-slate-800 uppercase tracking-wide">
            Programación de Rutas de Camiones
          </h1>
        </div>
        <button className="bg-slate-800 text-white hover:bg-slate-700 px-4 py-2 rounded text-sm font-medium transition-colors">
          + Nueva Ruta
        </button>
      </div>
      
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4 rounded-r">
        <div className="flex">
          <div className="ml-3">
            <p className="text-sm text-blue-700">
              Esta tabla muestra el cronograma y zonas asignadas. Próximamente se habilitará el componente de mapa para visualizar las áreas de recolección georreferenciadas.
            </p>
          </div>
        </div>
      </div>

      <DataTable data={rutas} columns={columns} itemsPerPage={10} />
    </div>
  );
}
