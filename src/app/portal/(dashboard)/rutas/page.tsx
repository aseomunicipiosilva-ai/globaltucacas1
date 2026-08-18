'use client';
import { CalendarDays, Map, Clock, AlertCircle } from 'lucide-react';
import { useState } from 'react';

export default function RutasPage() {
  const [sector, setSector] = useState('Casco Central');

  const rutasBase = [
    { nombre: 'Casco Central', dias: 'Lunes, Miércoles y Viernes', horario: '08:00 AM - 12:00 PM', tipo: 'Residencial y Comercial' },
    { nombre: 'Vía Morrocoy', dias: 'Martes y Jueves', horario: '01:00 PM - 05:00 PM', tipo: 'Residencial y Turístico' },
    { nombre: 'Zona Hotelera', dias: 'Lunes a Sábado', horario: '06:00 AM - 10:00 AM', tipo: 'Comercial' },
    { nombre: 'Urb. El Tuque', dias: 'Miércoles y Sábados', horario: '08:00 AM - 02:00 PM', tipo: 'Residencial' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Rutas y Horarios de Recolección</h1>
          <p className="text-slate-500 mt-1">Conoce los días que el camión del aseo pasa por tu sector.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-sm font-bold text-slate-700 uppercase mb-4">Selecciona tu Sector</h2>
            <div className="space-y-2">
              {rutasBase.map((r) => (
                <button
                  key={r.nombre}
                  onClick={() => setSector(r.nombre)}
                  className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${sector === r.nombre ? 'border-green-500 bg-green-50 text-green-800 font-bold' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}
                >
                  {r.nombre}
                </button>
              ))}
            </div>

            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
              <p className="text-xs text-blue-800">
                Los horarios son estimados y pueden variar debido a condiciones climáticas o de tráfico. Por favor saca tu basura en bolsas bien cerradas.
              </p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden h-full">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
              <h2 className="font-bold text-slate-700 flex items-center gap-2">
                <Map className="w-5 h-5" /> Información de Ruta: {sector}
              </h2>
            </div>
            
            {rutasBase.filter(r => r.nombre === sector).map((r, i) => (
              <div key={i} className="p-8 space-y-8">
                <div className="flex items-center gap-6 p-6 bg-slate-50 border border-slate-100 rounded-xl">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center shrink-0">
                    <CalendarDays className="w-8 h-8 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Días de Recolección</h3>
                    <p className="text-xl font-bold text-slate-800">{r.dias}</p>
                  </div>
                </div>

                <div className="flex items-center gap-6 p-6 bg-slate-50 border border-slate-100 rounded-xl">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                    <Clock className="w-8 h-8 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Horario Estimado</h3>
                    <p className="text-xl font-bold text-slate-800">{r.horario}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-6 p-6 bg-slate-50 border border-slate-100 rounded-xl">
                  <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center shrink-0">
                    <Map className="w-8 h-8 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Tipo de Servicio</h3>
                    <p className="text-xl font-bold text-slate-800">{r.tipo}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
