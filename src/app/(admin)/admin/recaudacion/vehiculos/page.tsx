'use client';
import { useState, useEffect } from 'react';
import { Car, Plus, Search, X } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function VehiculosPage() {
  const [vehiculos, setVehiculos] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    placa: '',
    propietario: '',
    cedula_rif: '',
    marca: '',
    modelo: '',
    anio: 2024,
    clase_vehiculo: 'Automóvil',
    uso: 'Particular',
    peso_tara: 0,
    puestos: 5
  });

  useEffect(() => {
    fetchVehiculos();
  }, []);

  const fetchVehiculos = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('hacienda_vehiculos').select('*').order('created_at', { ascending: false });
    if (!error && data) {
      setVehiculos(data);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from('hacienda_vehiculos').insert([formData]);
    setSaving(false);
    
    if (!error) {
      alert('Vehículo registrado exitosamente');
      setShowForm(false);
      setFormData({
        placa: '', propietario: '', cedula_rif: '', marca: '', modelo: '', 
        anio: 2024, clase_vehiculo: 'Automóvil', uso: 'Particular', peso_tara: 0, puestos: 5
      });
      fetchVehiculos();
    } else {
      alert('Error al registrar vehículo: ' + error.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Car className="w-6 h-6 text-purple-500" />
            Registro Automotor
          </h1>
          <p className="text-slate-500 mt-1">Gestión de placas, trimestres y características vehiculares.</p>
        </div>

        <div className="flex gap-3">
          <button onClick={() => setShowForm(true)} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Registrar Vehículo
          </button>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center sticky top-0 bg-white">
              <h2 className="text-xl font-bold text-slate-800">Registrar Nuevo Vehículo</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Placa</label>
                  <input required type="text" value={formData.placa} onChange={e => setFormData({...formData, placa: e.target.value.toUpperCase()})} className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:border-purple-500" placeholder="Ej. ABC-123" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Cédula / RIF</label>
                  <input required type="text" value={formData.cedula_rif} onChange={e => setFormData({...formData, cedula_rif: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:border-purple-500" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Propietario</label>
                  <input required type="text" value={formData.propietario} onChange={e => setFormData({...formData, propietario: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:border-purple-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Marca</label>
                  <input required type="text" value={formData.marca} onChange={e => setFormData({...formData, marca: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:border-purple-500" placeholder="Toyota, Ford..." />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Modelo</label>
                  <input required type="text" value={formData.modelo} onChange={e => setFormData({...formData, modelo: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:border-purple-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Año</label>
                  <input required type="number" value={formData.anio} onChange={e => setFormData({...formData, anio: parseInt(e.target.value)})} className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:border-purple-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Clase de Vehículo</label>
                  <select value={formData.clase_vehiculo} onChange={e => setFormData({...formData, clase_vehiculo: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:border-purple-500">
                    <option value="Automóvil">Automóvil</option>
                    <option value="Camioneta">Camioneta</option>
                    <option value="Motocicleta">Motocicleta</option>
                    <option value="Camión">Camión</option>
                    <option value="Autobús">Autobús</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Uso</label>
                  <select value={formData.uso} onChange={e => setFormData({...formData, uso: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:border-purple-500">
                    <option value="Particular">Particular</option>
                    <option value="Transporte Público">Transporte Público</option>
                    <option value="Carga">Carga</option>
                    <option value="Gobierno">Gobierno</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Peso (Kg)</label>
                    <input type="number" value={formData.peso_tara} onChange={e => setFormData({...formData, peso_tara: parseInt(e.target.value)})} className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:border-purple-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Puestos</label>
                    <input type="number" value={formData.puestos} onChange={e => setFormData({...formData, puestos: parseInt(e.target.value)})} className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:border-purple-500" />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Cancelar</button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50">
                  {saving ? 'Guardando...' : 'Guardar Vehículo'}
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
              placeholder="Buscar por Placa o Propietario..."
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-4 py-2.5 outline-none focus:ring-2 focus:ring-purple-500/20"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Placa</th>
                <th className="px-6 py-4">Propietario</th>
                <th className="px-6 py-4">Marca/Modelo</th>
                <th className="px-6 py-4">Uso</th>
                <th className="px-6 py-4">Estatus</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={6} className="p-6 text-center text-slate-500">Cargando vehículos...</td></tr>
              ) : vehiculos.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-slate-500">
                    <Car className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>No hay vehículos registrados aún.</p>
                  </td>
                </tr>
              ) : (
                vehiculos.map((veh) => (
                  <tr key={veh.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-700">{veh.placa}</td>
                    <td className="px-6 py-4 text-slate-600">{veh.propietario}</td>
                    <td className="px-6 py-4 text-slate-500 text-xs">{veh.marca} {veh.modelo} ({veh.anio})</td>
                    <td className="px-6 py-4 text-slate-600">{veh.uso}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                        {veh.estatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-purple-600 hover:text-purple-800 font-medium text-xs">Ver Trimestres</button>
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
