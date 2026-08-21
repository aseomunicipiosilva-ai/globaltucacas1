'use client';
import React, { useState } from 'react';
import { useAppContext } from '@/store/AppContext';
import { Save, AlertCircle, CheckCircle, Calendar, MapPin } from 'lucide-react';
import { ordenanzaData } from '@/data/ordenanza';
import Select from 'react-select';
import { createClient } from '@supabase/supabase-js';

const todasLasActividades = [...ordenanzaData.actividadesComerciales, ...ordenanzaData.actividadesIndustriales];
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function CensoPage() {
  const { addAuditLog } = useAppContext();
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  const [formData, setFormData] = useState({
    Identidad: '',
    Contribuyente: '',
    Telefono: '',
    telefonoPrefijo: '0414',
    telefonoNumero: '',
    Correo: '',
    correoNombre: '',
    correoDominio: '@gmail.com',
    correoDominioOtro: '',
    Direccion: '',
    Clasificacion: 'Residencial',
    TipoResidencia: ordenanzaData.tiposResidenciales[0].label,
    ActividadComercial: '',
    NivelMetraje: ordenanzaData.nivelesMetraje[0],
    FechaInicioActividad: new Date().toISOString().split('T')[0]
  });

  const handleSaveCenso = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const fullTelefono = formData.telefonoPrefijo + formData.telefonoNumero;
      const fullCorreo = formData.correoDominio === 'Otro' ? formData.correoNombre + formData.correoDominioOtro : formData.correoNombre + formData.correoDominio;
      const act = formData.Clasificacion === 'Residencial' ? formData.TipoResidencia : formData.ActividadComercial;

      // Save to pre_registros
      const { error } = await supabase.from('pre_registros').insert([{
        identidad: formData.Identidad,
        contribuyente: formData.Contribuyente,
        registro: fullTelefono,
        tipo: formData.Clasificacion,
        actividad: act,
        codigo: formData.Clasificacion === 'Residencial' ? formData.TipoResidencia : formData.NivelMetraje,
        origen: 'Censo',
        fecha_inicio: formData.FechaInicioActividad
      }]);

      if (error) throw error;
      
      await addAuditLog('CENSO_CREADO', `Censo registrado para ${formData.Identidad} - ${formData.Contribuyente}`);
      setShowSuccess(true);
      
      // Reset form
      setFormData({
        ...formData,
        Identidad: '',
        Contribuyente: '',
        telefonoNumero: '',
        correoNombre: '',
        Direccion: '',
        ActividadComercial: '',
        FechaInicioActividad: new Date().toISOString().split('T')[0]
      });

      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error(error);
      alert('Hubo un error al guardar el censo.');
    }
    setIsSaving(false);
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center bg-white p-4 rounded-lg shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Censo de Contribuyentes</h1>
          <p className="text-sm text-slate-500">Registra nuevos usuarios sin agregar deuda directa. Pasarán a pre-registros.</p>
        </div>
      </div>

      {showSuccess && (
        <div className="mb-6 p-4 bg-green-50 text-green-700 border border-green-200 rounded-lg flex items-center gap-2">
          <CheckCircle className="w-5 h-5" />
          ¡Censo guardado y enviado a pre-registros correctamente!
        </div>
      )}

      <form onSubmit={handleSaveCenso} className="bg-white p-6 rounded-lg shadow-sm mb-6">
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-700">Formulario de Censo</h2>
          <button 
            type="submit" 
            disabled={isSaving}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            {isSaving ? <AlertCircle className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isSaving ? 'Guardando...' : 'Guardar en Pre-registros'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-medium text-slate-500 mb-1">Razón Social / Nombre <span className="text-red-500">*</span></label>
            <input type="text" value={formData.Contribuyente} onChange={e => setFormData({...formData, Contribuyente: e.target.value})} className="w-full border border-slate-300 rounded px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500 uppercase" required />
          </div>
          <div>
            <label className="block text-[10px] font-medium text-slate-500 mb-1">Cédula / RIF <span className="text-red-500">*</span></label>
            <input type="text" value={formData.Identidad} onChange={e => setFormData({...formData, Identidad: e.target.value})} placeholder="V12345678" className="w-full border border-slate-300 rounded px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500 uppercase" required />
          </div>
          
          <div>
            <label className="block text-[10px] font-medium text-slate-500 mb-1">Teléfono Móvil <span className="text-red-500">*</span></label>
            <div className="flex gap-2">
              <select value={formData.telefonoPrefijo} onChange={e => setFormData({...formData, telefonoPrefijo: e.target.value})} className="w-1/3 border border-slate-300 rounded px-2 py-2 text-sm text-slate-700 outline-none focus:border-blue-500">
                <option value="0412">0412</option>
                <option value="0414">0414</option>
                <option value="0424">0424</option>
                <option value="0416">0416</option>
                <option value="0426">0426</option>
                <option value="0422">0422</option>
              </select>
              <input type="tel" value={formData.telefonoNumero} onChange={e => setFormData({...formData, telefonoNumero: e.target.value.replace(/\D/g, '')})} placeholder="1234567" className="w-2/3 border border-slate-300 rounded px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500" required />
            </div>
          </div>
          
          <div>
            <label className="block text-[10px] font-medium text-slate-500 mb-1">Email <span className="text-red-500">*</span></label>
            <div className="flex gap-1 mb-1">
              <input type="text" value={formData.correoNombre} onChange={e => setFormData({...formData, correoNombre: e.target.value.replace(/\s/g, '')})} placeholder="usuario" className="w-1/2 border border-slate-300 rounded px-2 py-2 text-sm text-slate-700 outline-none focus:border-blue-500" required />
              <select value={formData.correoDominio} onChange={e => setFormData({...formData, correoDominio: e.target.value})} className="w-1/2 border border-slate-300 rounded px-1 py-2 text-sm text-slate-700 outline-none focus:border-blue-500">
                <option value="@gmail.com">@gmail.com</option>
                <option value="@yahoo.com">@yahoo.com</option>
                <option value="@hotmail.com">@hotmail.com</option>
                <option value="@outlook.com">@outlook.com</option>
                <option value="Otro">Otro...</option>
              </select>
            </div>
          </div>
          
          <div className="md:col-span-2">
            <label className="block text-[10px] font-medium text-slate-500 mb-1">Dirección <span className="text-red-500">*</span></label>
            <textarea value={formData.Direccion} onChange={e => setFormData({...formData, Direccion: e.target.value})} rows={2} className="w-full border border-slate-300 rounded px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500" required />
          </div>
          
          {/* Clasificación de Ordenanza */}
          <div className="md:col-span-2 mt-6 border-t border-slate-200 pt-6">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-4">Clasificación (Según Ordenanza)</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-semibold text-blue-600 mb-1">Clasificación Principal</label>
                <select 
                  value={formData.Clasificacion} 
                  onChange={e => {
                    const val = e.target.value;
                    setFormData({
                      ...formData, 
                      Clasificacion: val,
                      TipoResidencia: (val === 'Residencial' || val === 'Mixto') ? (formData.TipoResidencia || ordenanzaData.tiposResidenciales[0].label) : '',
                      ActividadComercial: (val.includes('Comercial') || val === 'Industrial' || val === 'Mixto') ? (formData.ActividadComercial || todasLasActividades[0].label) : '',
                      NivelMetraje: (val.includes('Comercial') || val === 'Industrial' || val === 'Mixto') ? (formData.NivelMetraje || ordenanzaData.nivelesMetraje[0]) : '',
                    });
                  }}
                  className="w-full border border-blue-300 bg-blue-50 rounded px-3 py-2 text-sm text-blue-800 outline-none focus:border-blue-500 font-medium"
                >
                  {ordenanzaData.clasificaciones.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {(formData.Clasificacion === 'Residencial') && (
                <div>
                  <label className="block text-[10px] font-medium text-slate-500 mb-1">Tipo de Residencia (Clasificador)</label>
                  <select 
                    value={formData.TipoResidencia || ordenanzaData.tiposResidenciales[0].label} 
                    onChange={e => setFormData({...formData, TipoResidencia: e.target.value})}
                    className="w-full border border-slate-300 rounded px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500"
                  >
                    {ordenanzaData.tiposResidenciales.map(t => <option key={t.label} value={t.label}>{t.label}</option>)}
                  </select>
                </div>
              )}

              {(formData.Clasificacion?.includes('Comercial') || formData.Clasificacion === 'Industrial' || formData.Clasificacion === 'Mixto') && (
                <>
                  <div>
                    <label className="block text-[10px] font-medium text-slate-500 mb-1">Actividad Económica</label>
                    <Select
                      options={todasLasActividades.map(a => ({ value: a.label, label: a.label }))}
                      value={{ value: formData.ActividadComercial, label: formData.ActividadComercial }}
                      onChange={(selected: any) => setFormData({...formData, ActividadComercial: selected?.value || ''})}
                      placeholder="Buscar o seleccionar..."
                      className="text-sm text-slate-700"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-slate-500 mb-1">Nivel (Rango de Metraje)</label>
                    <select 
                      value={formData.NivelMetraje || ordenanzaData.nivelesMetraje[0]} 
                      onChange={e => setFormData({...formData, NivelMetraje: e.target.value})}
                      className="w-full border border-slate-300 rounded px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500"
                    >
                      {ordenanzaData.nivelesMetraje.map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                </>
              )}
            </div>
          </div>
          
          <div className="md:col-span-2 mt-6 border-t border-slate-200 pt-6">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-4">Datos del Censo</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-semibold text-orange-600 mb-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Fecha Inicio de Actividad Económica <span className="text-red-500">*</span>
                </label>
                <input 
                  type="date" 
                  value={formData.FechaInicioActividad} 
                  onChange={e => setFormData({...formData, FechaInicioActividad: e.target.value})} 
                  className="w-full border border-orange-300 bg-orange-50 rounded px-3 py-2 text-sm text-orange-800 outline-none focus:border-orange-500" 
                  required 
                />
                <p className="text-[10px] text-slate-500 mt-1">Se usará para calcular la deuda retroactiva al aprobar este registro.</p>
              </div>
            </div>
          </div>

        </div>
      </form>
    </div>
  );
}
