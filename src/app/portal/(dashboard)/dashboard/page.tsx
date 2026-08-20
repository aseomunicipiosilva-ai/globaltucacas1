'use client';
import { Save, Plus, Edit2, Trash2, Lock, MessageSquare } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function DatosContribuyentePage() {
  const [userData, setUserData] = useState({
    nombre: 'Cargando...',
    codigo: 'Cargando...',
    docType: 'V',
    docNum: 'Cargando...',
    email: '',
    telefonoFijo: '',
    telefonoMovil: '',
    direccion: '',
    nombreComercial: '',
    esCondominio: false
  });
  
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchUserData = async () => {
      const nombre = localStorage.getItem('portal_user') || '';
      const codigo = localStorage.getItem('portal_codigo') || '';
      const fullDoc = localStorage.getItem('portal_doc') || '';
      
      setUserData(prev => ({
        ...prev,
        nombre,
        codigo,
        docType: fullDoc ? fullDoc.charAt(0) : 'V',
        docNum: fullDoc ? fullDoc.substring(1) : ''
      }));

      if (fullDoc) {
        const idLimpio = fullDoc.replace(/-/g, '').toUpperCase();
        const idFormateado = `${idLimpio.charAt(0)}-${idLimpio.slice(1)}`;

        const { data, error } = await supabase
          .from('inmuebles')
          .select('correo_electronico, correo, telefono, direccion, actividad_principal')
          .or(`identidad.eq.${idFormateado},identidad.eq.${idLimpio},identidad.eq.${fullDoc.toUpperCase()}`)
          .limit(1)
          .single();
          
        if (data && !error) {
          setUserData(prev => ({
            ...prev,
            email: data.correo_electronico || data.correo || '',
            telefonoMovil: data.telefono || '',
            direccion: data.direccion || '',
            nombreComercial: data.actividad_principal || '',
            esCondominio: !!(data.actividad_principal?.toLowerCase().includes('condominio'))
          }));
        }
      }
    };
    
    fetchUserData();
  }, []);

  const handleSave = async () => {
    const fullDoc = localStorage.getItem('portal_doc');
    if (!fullDoc) return;
    
    setIsSaving(true);
    setMessage('');
    
    try {
      const idLimpio = fullDoc.replace(/-/g, '').toUpperCase();
      const idFormateado = `${idLimpio.charAt(0)}-${idLimpio.slice(1)}`;

      const { error } = await supabase
        .from('inmuebles')
        .update({
          correo_electronico: userData.email,
          telefono: userData.telefonoMovil,
          direccion: userData.direccion
        })
        .or(`identidad.eq.${idFormateado},identidad.eq.${idLimpio},identidad.eq.${fullDoc.toUpperCase()}`);
        
      if (error) throw error;
      setMessage('Datos actualizados correctamente');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error updating data:', error);
      setMessage('Error al actualizar datos');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 relative pb-12">
      {/* Botón Flotante Enviar Mensaje (Sticky Tab Derecho) */}
      <div className="fixed right-0 top-1/2 -translate-y-1/2 z-50">
        <button className="bg-[#ff5722] hover:bg-[#f4511e] text-white py-2 px-3 rounded-l-md shadow-lg flex flex-col items-center gap-2 transform transition-transform hover:-translate-x-1" style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}>
          <span className="font-semibold text-sm tracking-widest pt-2">Enviar mensaje</span>
          <MessageSquare className="w-5 h-5 -rotate-90" />
        </button>
      </div>

      {/* Datos Principales */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200">
        <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
          <h2 className="font-semibold text-slate-700 uppercase text-sm">DATOS DEL CONTRIBUYENTE</h2>
          {message && <span className={`text-xs font-medium ${message.includes('Error') ? 'text-red-500' : 'text-green-500'}`}>{message}</span>}
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Código</label>
              <input type="text" value={userData.codigo} disabled className="w-full text-sm border border-slate-200 rounded px-3 py-2 bg-slate-50 text-slate-700 font-bold" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Tipo Identidad</label>
              <select value={userData.docType} disabled className="w-full text-sm border border-slate-200 rounded px-3 py-2 bg-slate-50 text-slate-700 font-bold">
                <option value="V">V - Venezolano</option>
                <option value="J">J - Jurídico</option>
                <option value="G">G - Gubernamental</option>
                <option value="E">E - Extranjero</option>
                <option value="P">P - Pasaporte</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Nro. Identidad</label>
              <input type="text" value={userData.docNum} disabled className="w-full text-sm border border-slate-200 rounded px-3 py-2 bg-slate-50 text-slate-700 font-bold" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Nombre o Razón Social</label>
              <input type="text" value={userData.nombre} disabled className="w-full text-sm border border-slate-200 rounded px-3 py-2 bg-green-50 text-green-800 font-bold" />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Teléfono Móvil</label>
              <input type="text" value={userData.telefonoMovil} onChange={e => setUserData({...userData, telefonoMovil: e.target.value})} className="w-full text-sm border border-slate-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Teléfono Fijo</label>
              <input type="text" value={userData.telefonoFijo} onChange={e => setUserData({...userData, telefonoFijo: e.target.value})} placeholder="Teléfono Fijo" className="w-full text-sm border border-slate-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-500 mb-1">Email</label>
              <input type="email" value={userData.email} onChange={e => setUserData({...userData, email: e.target.value})} className="w-full text-sm border border-slate-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
              <p className="text-[10px] text-red-500 mt-1">Este será el correo de contacto para el sistema.</p>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-500 mb-1">Dirección Fiscal (como aparece en el RIF)</label>
              <input type="text" value={userData.direccion} onChange={e => setUserData({...userData, direccion: e.target.value})} className="w-full text-sm border border-slate-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-500 mb-1">Nombre Comercial</label>
              <input type="text" value={userData.nombreComercial} onChange={e => setUserData({...userData, nombreComercial: e.target.value})} placeholder="Nombre Comercial" className="w-full text-sm border border-slate-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
            </div>
            
            <div className="md:col-span-4 flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={userData.esCondominio} onChange={e => setUserData({...userData, esCondominio: e.target.checked})} className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                <span className="text-sm text-slate-700">Es un Condominio</span>
              </label>

              <button onClick={handleSave} disabled={isSaving} className="px-4 py-2 bg-white border border-[#ff5722] text-[#ff5722] rounded hover:bg-orange-50 text-sm font-medium flex items-center gap-2 transition-colors disabled:opacity-50">
                <Save className="w-4 h-4" />
                {isSaving ? 'Guardando...' : 'Actualizar datos'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Firmas Personales */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200">
          <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
            <h3 className="font-semibold text-slate-700 uppercase text-xs">Firmas Personales</h3>
            <button className="text-xs text-[#ff5722] flex items-center gap-1 font-medium hover:underline">
              <Plus className="w-3 h-3" /> Añadir
            </button>
          </div>
          <div className="p-4 text-center py-8">
            <span className="text-sm text-blue-500">Ningún dato disponible en esta tabla</span>
          </div>
        </div>

        {/* Vehículos */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200">
          <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
            <h3 className="font-semibold text-slate-700 uppercase text-xs">Vehículos</h3>
            <button className="text-xs text-[#ff5722] flex items-center gap-1 font-medium hover:underline">
              <Plus className="w-3 h-3" /> Añadir
            </button>
          </div>
          <div className="p-4 text-center py-8">
            <span className="text-sm text-blue-500">Ningún dato disponible en esta tabla</span>
          </div>
        </div>

        {/* Datos de Contacto */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200">
          <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
            <h3 className="font-semibold text-slate-700 uppercase text-xs">Datos de Contacto</h3>
            <button className="text-xs text-[#ff5722] flex items-center gap-1 font-medium hover:underline">
              <Plus className="w-3 h-3" /> Añadir
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 border-b border-slate-200">
                  <th className="px-4 py-2 font-medium">NOMBRE</th>
                  <th className="px-4 py-2 font-medium">CARGO</th>
                  <th className="px-4 py-2 font-medium">TELÉFONO</th>
                  <th className="px-4 py-2 font-medium text-right">ACCIONES</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-sm text-blue-500">
                    Ningún dato disponible en esta tabla
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Cambiar Clave */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200">
          <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
            <h3 className="font-semibold text-slate-700 uppercase text-xs">Cambiar Clave</h3>
            <button className="text-xs text-white bg-[#ff5722] hover:bg-[#f4511e] px-2 py-1 rounded flex items-center gap-1 font-medium transition-colors">
              <Lock className="w-3 h-3" /> Cambiar Clave
            </button>
          </div>
          <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] font-medium text-slate-500 mb-1 uppercase">Clave Actual</label>
              <input type="password" placeholder="Clave Actual" className="w-full text-sm border border-slate-300 rounded px-2 py-1.5 outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-[10px] font-medium text-slate-500 mb-1 uppercase">Nueva Clave</label>
              <input type="password" placeholder="Nueva Clave" className="w-full text-sm border border-slate-300 rounded px-2 py-1.5 outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-[10px] font-medium text-slate-500 mb-1 uppercase">Confirmar</label>
              <input type="password" placeholder="Confirmar" className="w-full text-sm border border-slate-300 rounded px-2 py-1.5 outline-none focus:border-blue-500" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
