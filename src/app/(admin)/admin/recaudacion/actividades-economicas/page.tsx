'use client';
import { useState, useEffect } from 'react';
import { Briefcase, Plus, FileText, Search, X } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function ActividadesEconomicasPage() {
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    rif: '',
    razon_social: '',
    representante_legal: '',
    direccion: '',
    telefono: '',
    correo: '',
    clasificador_actividad: '',
    alicuota: 0
  });

  useEffect(() => {
    fetchEmpresas();
  }, []);

  const fetchEmpresas = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('hacienda_empresas').select('*').order('created_at', { ascending: false });
    if (!error && data) {
      setEmpresas(data);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from('hacienda_empresas').insert([formData]);
    setSaving(false);
    
    if (!error) {
      alert('Empresa registrada exitosamente');
      setShowForm(false);
      setFormData({
        rif: '', razon_social: '', representante_legal: '', direccion: '', 
        telefono: '', correo: '', clasificador_actividad: '', alicuota: 0
      });
      fetchEmpresas();
    } else {
      alert('Error al registrar empresa: ' + error.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-blue-500" />
            Actividades Económicas
          </h1>
          <p className="text-slate-500 mt-1">Gestión de empresas, patentes y declaraciones juradas.</p>
        </div>

        <div className="flex gap-3">
          <button className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Nueva Declaración
          </button>
          <button onClick={() => setShowForm(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Registrar Empresa
          </button>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center sticky top-0 bg-white">
              <h2 className="text-xl font-bold text-slate-800">Registrar Nueva Empresa</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">RIF</label>
                  <input required type="text" value={formData.rif} onChange={e => setFormData({...formData, rif: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500" placeholder="J-123456789" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Razón Social</label>
                  <input required type="text" value={formData.razon_social} onChange={e => setFormData({...formData, razon_social: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Representante Legal</label>
                  <input required type="text" value={formData.representante_legal} onChange={e => setFormData({...formData, representante_legal: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Clasificador de Actividad</label>
                  <input required type="text" value={formData.clasificador_actividad} onChange={e => setFormData({...formData, clasificador_actividad: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500" placeholder="Ej. Venta de víveres" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Alícuota (%)</label>
                  <input required type="number" step="0.01" value={formData.alicuota} onChange={e => setFormData({...formData, alicuota: parseFloat(e.target.value)})} className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Teléfono</label>
                  <input type="text" value={formData.telefono} onChange={e => setFormData({...formData, telefono: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Dirección</label>
                  <textarea required value={formData.direccion} onChange={e => setFormData({...formData, direccion: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500" rows={2} />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Cancelar</button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50">
                  {saving ? 'Guardando...' : 'Guardar Empresa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por RIF o Razón Social..."
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <select className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 outline-none">
            <option value="todas">Todas las Empresas</option>
            <option value="activas">Activas</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">RIF</th>
                <th className="px-6 py-4">Razón Social</th>
                <th className="px-6 py-4">Actividad</th>
                <th className="px-6 py-4">Alícuota</th>
                <th className="px-6 py-4">Estatus</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={6} className="p-6 text-center text-slate-500">Cargando empresas...</td></tr>
              ) : empresas.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-slate-500">
                    <Briefcase className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>No hay empresas registradas aún.</p>
                  </td>
                </tr>
              ) : (
                empresas.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-700">{emp.rif}</td>
                    <td className="px-6 py-4 text-slate-600">{emp.razon_social}</td>
                    <td className="px-6 py-4 text-slate-500 text-xs truncate max-w-[200px]">{emp.clasificador_actividad}</td>
                    <td className="px-6 py-4 text-slate-600">{emp.alicuota}%</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                        {emp.estatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-blue-600 hover:text-blue-800 font-medium text-xs">Ver Detalles</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
