'use client';
import React, { useState } from 'react';
import { Search, FileCheck, CheckCircle2, XCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function DecretosPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [contribuyentes, setContribuyentes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const searchContribuyentes = async () => {
    if (!searchTerm) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('inmuebles')
        .select('*')
        .or(`identidad.ilike.%${searchTerm}%,nombre.ilike.%${searchTerm}%`)
        .limit(20);
        
      if (error) throw error;
      setContribuyentes(data || []);
    } catch (e: any) {
      alert("Error buscando usuarios: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleConvenio = async (id: number, currentStatus: boolean) => {
    try {
      const newStatus = !currentStatus;
      const { error } = await supabase
        .from('inmuebles')
        .update({ convenio_activo: newStatus })
        .eq('id', id);

      if (error) {
        if (error.message.includes('convenio_activo')) {
          const { error: err2 } = await supabase
            .from('inmuebles')
            .update({ decreto_activo: newStatus })
            .eq('id', id);
          if (err2) {
             alert('El usuario no tiene columna de convenio en la bd. Error: ' + err2.message);
             return;
          }
        } else {
          throw error;
        }
      }
      
      setContribuyentes(prev => prev.map(c => 
        c.id === id ? { ...c, convenio_activo: newStatus, decreto_activo: newStatus } : c
      ));
    } catch (e: any) {
      alert("Error actualizando convenio: " + e.message);
      console.error(e);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-3 border-b pb-4">
        <div className="bg-emerald-100 p-3 rounded-lg">
          <FileCheck className="w-6 h-6 text-emerald-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Decretos y Convenios</h1>
          <p className="text-sm text-slate-500">Activación de beneficios (Borra tu Deuda / Decretos 010-013)</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar contribuyente por Nombre o RIF/Cédula..." 
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchContribuyentes()}
            />
          </div>
          <button 
            onClick={searchContribuyentes}
            disabled={loading}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            {loading ? 'Buscando...' : 'Buscar'}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-500 font-medium">
              <tr>
                <th className="px-6 py-3 border-b">RIF / Cédula</th>
                <th className="px-6 py-3 border-b">Nombre o Razón Social</th>
                <th className="px-6 py-3 border-b">Clasificación</th>
                <th className="px-6 py-3 border-b text-center">Estado del Decreto/Convenio</th>
                <th className="px-6 py-3 border-b text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {contribuyentes.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                    No se encontraron contribuyentes.
                  </td>
                </tr>
              ) : (
                contribuyentes.map(c => {
                  const isActive = c.convenio_activo === true || c.decreto_activo === true;
                  return (
                    <tr key={c.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 font-medium text-slate-800">{c.identidad}</td>
                      <td className="px-6 py-4">{c.nombre}</td>
                      <td className="px-6 py-4 capitalize">{c.clasificacion || 'N/A'}</td>
                      <td className="px-6 py-4 text-center">
                        {isActive ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Activo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                            <XCircle className="w-3.5 h-3.5" /> Inactivo
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => toggleConvenio(c.id, isActive)}
                          className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${isActive ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}
                        >
                          {isActive ? 'Desactivar Convenio' : 'Activar Convenio'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
