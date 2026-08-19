'use client';
import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { DataTable } from '@/components/DataTable';
import { useAppContext } from '@/store/AppContext';
import { Users, Save, ArrowLeft, Plus, Building, Home as HomeIcon, MapPin, Edit, DollarSign, Handshake, Eye, X, CheckCircle } from 'lucide-react';
import { ordenanzaData } from '@/data/ordenanza';
import Select from 'react-select';
import dynamic from 'next/dynamic';

const MapPicker = dynamic(() => import('@/components/MapPicker'), { ssr: false });

function ContribuyentesPageContent() {
  const { inmuebles, contribuyentes, facturas, updateContribuyente, addContribuyente } = useAppContext();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [formData, setFormData] = useState<any>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewData, setViewData] = useState<any>(null);
  const [viewCalculo, setViewCalculo] = useState<any>(null);
  
  // Calculadora state
  const [bcvRate, setBcvRate] = useState<string | null>(null);
  const [bcvDate, setBcvDate] = useState<string>('');
  const [showCalculation, setShowCalculation] = useState(false);
  const [calculoDetalle, setCalculoDetalle] = useState<any>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get('action') === 'new') {
      handleAdd();
    }
  }, [searchParams]);

  useEffect(() => {
    if (isViewModalOpen && viewData) {
      const calcView = async () => {
        try {
          const res = await fetch('/api/bcv');
          const data = await res.json();
          
          let factorTotal = 0;
          let leyenda = '';
          const desgloseLocales: any[] = [];

          // Encontrar todos los inmuebles asociados a este contribuyente
          const misInmuebles = inmuebles.filter(i => i.identidad === viewData.Identidad);

          if (misInmuebles.length > 0) {
            const isCondominio = misInmuebles.some(i => (parseInt(i.cant_inmuebles) || 1) > 1);
            leyenda = isCondominio ? `Condominio / Complejo Residencial` : misInmuebles.map(i => i.actividad_principal || 'Residencial').join(', ');
            
            misInmuebles.forEach(inm => {
              const localFactor = parseFloat(inm.mmv_mes) || 0;
              const cant = parseInt(inm.cant_inmuebles) || 1;
              const metraje = inm.area || inm.area_operativa || 'N/A';
              const actividad = inm.actividad_principal || 'No especificada';
              const tipoVivienda = inm.tipo || 'Inmueble';
              
              const conceptoTexto = `${actividad} | Nivel: ${metraje} m² | ${tipoVivienda}`;
              
              factorTotal += (localFactor * cant);
              
              if (localFactor > 0) {
                if (cant > 1) {
                  for(let i=1; i<=cant; i++) {
                    desgloseLocales.push({
                      numeracion: `${inm.inmueble || inm.cod_cont} - Unidad ${i}`,
                      leyenda: conceptoTexto,
                      factor: localFactor,
                      montoBs: (Math.trunc((localFactor * data.tcmmv) * 100) / 100).toFixed(2)
                    });
                  }
                } else {
                  desgloseLocales.push({
                    numeracion: inm.inmueble || inm.cod_cont,
                    leyenda: conceptoTexto,
                    factor: localFactor,
                    montoBs: (Math.trunc((localFactor * data.tcmmv) * 100) / 100).toFixed(2)
                  });
                }
              }
            });
          }

          const rawTotal = factorTotal * data.tcmmv;
          const totalTruncado = (Math.trunc(rawTotal * 100) / 100).toFixed(2);

          setViewCalculo({
            factor: factorTotal,
            leyenda,
            totalBs: totalTruncado,
            tasaBcv: data.tcmmv,
            desglose: desgloseLocales
          });
        } catch (e) {
          console.error(e);
        }
      };
      calcView();
    } else {
      setViewCalculo(null);
    }
  }, [isViewModalOpen, viewData]);

  const handleEdit = (row: any) => {
    let telefonoPrefijo = '0414';
    let telefonoNumero = '';
    if (row.Telefono) {
      if (row.Telefono.length >= 11) {
        telefonoPrefijo = row.Telefono.substring(0, 4);
        telefonoNumero = row.Telefono.substring(4);
      } else {
        telefonoNumero = row.Telefono;
      }
    }

    let correoNombre = '';
    let correoDominio = '@gmail.com';
    let correoDominioOtro = '';
    if (row.Correo && row.Correo.includes('@')) {
      const parts = row.Correo.split('@');
      correoNombre = parts[0];
      const dom = '@' + parts[1];
      if (['@gmail.com', '@yahoo.com', '@hotmail.com', '@outlook.com'].includes(dom)) {
        correoDominio = dom;
      } else {
        correoDominio = 'Otro';
        correoDominioOtro = dom;
      }
    } else if (row.Correo) {
      correoNombre = row.Correo;
    }

    setFormData({ 
      ...row,
      telefonoPrefijo,
      telefonoNumero,
      correoNombre,
      correoDominio,
      correoDominioOtro
    });
    setEditingId(row.Identidad);
    setIsNew(false);
    setShowSuccess(false);
    setShowCalculation(false);
  };

  const handleAdd = () => {
    setFormData({
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
      isCondominio: false,
      cantidadInmuebles: 0,
      locales: [],
      coordenadas: null
    });
    setEditingId('new');
    setIsNew(true);
    setShowSuccess(false);
    setShowCalculation(false);
  };

  const handleCantidadChange = (e: any) => {
    const val = parseInt(e.target.value) || 0;
    const currentLocales = formData.locales || [];
    let newLocales = [...currentLocales];
    
    if (val > currentLocales.length) {
      for (let i = currentLocales.length; i < val; i++) {
        newLocales.push({
          id: `local-${i}-${Date.now()}`,
          numeracion: `Inmueble ${i + 1}`,
          uso: (formData.Clasificacion === 'Comercial' || formData.Clasificacion === 'Industrial') ? 'Comercial' : 'Residencial',
          estatus: 'Desocupado',
          actividad: '',
          nivel: ordenanzaData.nivelesMetraje[0],
          tipoResidencia: ordenanzaData.tiposResidenciales[0].label
        });
      }
    } else {
      newLocales = newLocales.slice(0, val);
    }
    setFormData({...formData, cantidadInmuebles: val, locales: newLocales});
  };

  const calcularTarifa = async () => {
    setIsCalculating(true);
    try {
      // Fetch BCV
      const res = await fetch('/api/bcv');
      const data = await res.json();
      
      const tasaTruncada = (Math.trunc(data.tasa * 100) / 100).toFixed(2);
      setBcvRate(tasaTruncada);
      setBcvDate(new Date(data.fecha).toLocaleString());

      // Find factor
      let factorTotal = 0;
      let leyenda = '';
      const desgloseLocales: any[] = [];

      if (formData.isCondominio && formData.locales?.length > 0) {
        leyenda = `Condominio (${formData.cantidadInmuebles} Inmuebles)`;
        formData.locales.forEach((local: any) => {
          let localFactor = 0;
          let localLeyenda = '';

          if (local.uso === 'Residencial') {
            const tipo = ordenanzaData.tiposResidenciales.find(t => t.label === (local.tipoResidencia || formData.TipoResidencia));
            if (tipo) {
              localFactor = tipo.factor;
              localLeyenda = `Tasa Residencial (${tipo.label.substring(0, 25)}...)`;
            }
          } else if (local.uso === 'Comercial') {
            const nivelIndex = ordenanzaData.nivelesMetraje.indexOf(local.nivel || ordenanzaData.nivelesMetraje[0]);
            
            if (local.estatus === 'Desocupado') {
              const actVacio = ordenanzaData.actividadesComerciales.find(a => a.label === 'Inmueble desocupado (vacío)');
              if (actVacio && nivelIndex !== -1) {
                localFactor = actVacio.factores[nivelIndex];
                localLeyenda = `Comercial Desocupado (${local.nivel})`;
              }
            } else {
              const act = ordenanzaData.actividadesComerciales.find(a => a.label === local.actividad);
              if (act && nivelIndex !== -1) {
                localFactor = act.factores[nivelIndex];
                localLeyenda = `Comercial Ocupado - ${local.actividad}`;
              }
            }
          }
          
          factorTotal += localFactor;
          
          if (localFactor > 0) {
            desgloseLocales.push({
              numeracion: local.numeracion,
              leyenda: localLeyenda,
              factor: localFactor,
              montoBs: (Math.trunc((localFactor * data.tasa) * 100) / 100).toFixed(2)
            });
          }
        });
      } else {
        if (formData.Clasificacion === 'Residencial') {
          const tipo = ordenanzaData.tiposResidenciales.find(t => t.label === formData.TipoResidencia);
          if (tipo) {
            factorTotal = tipo.factor;
            leyenda = `Clasificador de Tasa Residencial: ${tipo.label}`;
          }
        } else {
          const act = ordenanzaData.actividadesComerciales.find(a => a.label === formData.ActividadComercial);
          const nivelIndex = ordenanzaData.nivelesMetraje.indexOf(formData.NivelMetraje);
          if (act && nivelIndex !== -1) {
            factorTotal = act.factores[nivelIndex];
            leyenda = `Tasa Comercial: ${act.label} (Nivel: ${formData.NivelMetraje})`;
          }
        }
      }

      // Truncar a 2 decimales sin redondear
      const rawTotal = factorTotal * data.tasa;
      const totalTruncado = (Math.trunc(rawTotal * 100) / 100).toFixed(2);

      setCalculoDetalle({
        factor: factorTotal,
        leyenda,
        totalBs: totalTruncado,
        fuente: data.fuente,
        desglose: desgloseLocales
      });
      setShowCalculation(true);
    } catch (e) {
      console.error(e);
    }
    setIsCalculating(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const finalTelefono = `${formData.telefonoPrefijo}${formData.telefonoNumero}`;
      const finalCorreo = `${formData.correoNombre}${formData.correoDominio === 'Otro' ? formData.correoDominioOtro : formData.correoDominio}`;
      
      const dataToSave = {
        ...formData,
        Telefono: finalTelefono,
        Correo: finalCorreo
      };

      if (isNew) {
        await addContribuyente(dataToSave);
        setIsNew(false);
        setEditingId(dataToSave.Identidad); // Switch to edit mode
      } else if (editingId) {
        await updateContribuyente(editingId, dataToSave);
      }
      
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      alert('Ocurrió un error guardando en Supabase. Verifique la conexión.');
    } finally {
      setIsSaving(false);
    }
  };

  if (editingId && formData) {
    return (
      <div className="space-y-6 max-w-[1200px] mx-auto p-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <button onClick={() => setEditingId(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors mr-2">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
            <Users className="w-5 h-5 text-slate-700" />
            <h1 className="text-sm font-bold text-slate-700 uppercase tracking-wide">
              {isNew ? 'Ingresar Contribuyente' : 'Datos del Contribuyente'}
            </h1>
          </div>
        </div>

        {showSuccess && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded relative" role="alert">
            <span className="block sm:inline">Los datos han sido guardados correctamente en la sesión actual.</span>
          </div>
        )}

        <form onSubmit={handleSave} className="bg-white border border-slate-200 rounded shadow-sm">
          {/* Section: Datos del Contribuyente */}
          <div className="bg-slate-50 border-b border-slate-200 px-4 py-3">
            <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-500" /> Datos del Contribuyente
            </h2>
          </div>
          
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-[10px] font-semibold text-blue-600 mb-1">Código</label>
                <input type="text" value={formData.CodCont || 'Generación Automática'} disabled className="w-full border border-slate-300 bg-slate-100 rounded px-3 py-2 text-sm text-slate-500 cursor-not-allowed" />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-slate-500 mb-1">Tipo Identidad</label>
                <select className="w-full border border-slate-300 rounded px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500">
                  <option value="V">Venezolano (V)</option>
                  <option value="E">Extranjero (E)</option>
                  <option value="J">Jurídico (J)</option>
                  <option value="G">Gubernamental (G)</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-medium text-slate-500 mb-1">Nro Identidad</label>
                <input type="text" value={formData.Identidad} onChange={e => setFormData({...formData, Identidad: e.target.value})} className="w-full border border-slate-300 rounded px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500" required />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-slate-500 mb-1">Nombre o Razón Social</label>
                <input type="text" value={formData.Contribuyente} onChange={e => setFormData({...formData, Contribuyente: e.target.value})} className="w-full border border-slate-300 rounded px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500" required />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-medium text-slate-500 mb-1">Teléfono Móvil <span className="text-red-500">*</span></label>
                <div className="flex gap-2">
                  <select 
                    value={formData.telefonoPrefijo}
                    onChange={e => setFormData({...formData, telefonoPrefijo: e.target.value})}
                    className="w-1/3 border border-slate-300 rounded px-2 py-2 text-sm text-slate-700 outline-none focus:border-blue-500"
                  >
                    <option value="0412">0412</option>
                    <option value="0414">0414</option>
                    <option value="0424">0424</option>
                    <option value="0416">0416</option>
                    <option value="0426">0426</option>
                    <option value="0422">0422</option>
                  </select>
                  <input 
                    type="tel" 
                    pattern="[0-9]*"
                    value={formData.telefonoNumero} 
                    onChange={e => setFormData({...formData, telefonoNumero: e.target.value.replace(/\D/g, '')})} 
                    onKeyPress={(e) => {
                      if (!/[0-9]/.test(e.key)) {
                        e.preventDefault();
                      }
                    }}
                    placeholder="1234567"
                    className="w-2/3 border border-slate-300 rounded px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500" 
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-medium text-slate-500 mb-1">Teléfono Fijo</label>
                <input type="text" className="w-full border border-slate-300 rounded px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-slate-500 mb-1">Email <span className="text-red-500">*</span></label>
                <div className="flex gap-1 mb-1">
                  <input 
                    type="text" 
                    value={formData.correoNombre} 
                    onChange={e => setFormData({...formData, correoNombre: e.target.value.replace(/\s/g, '')})} 
                    placeholder="usuario"
                    className="w-1/2 border border-slate-300 rounded px-2 py-2 text-sm text-slate-700 outline-none focus:border-blue-500" 
                    required
                  />
                  <select 
                    value={formData.correoDominio}
                    onChange={e => setFormData({...formData, correoDominio: e.target.value})}
                    className="w-1/2 border border-slate-300 rounded px-1 py-2 text-sm text-slate-700 outline-none focus:border-blue-500"
                  >
                    <option value="@gmail.com">@gmail.com</option>
                    <option value="@yahoo.com">@yahoo.com</option>
                    <option value="@hotmail.com">@hotmail.com</option>
                    <option value="@outlook.com">@outlook.com</option>
                    <option value="Otro">Otro...</option>
                  </select>
                </div>
                {formData.correoDominio === 'Otro' && (
                  <input 
                    type="text" 
                    value={formData.correoDominioOtro} 
                    onChange={e => setFormData({...formData, correoDominioOtro: e.target.value.replace(/\s/g, '')})} 
                    placeholder="@prueba.com"
                    className="w-full border border-slate-300 rounded px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500 mt-1" 
                    required
                  />
                )}
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-[10px] font-medium text-slate-500 mb-1">Dirección Exacta <span className="text-red-500">*</span></label>
              <textarea 
                value={formData.Direccion} 
                onChange={e => setFormData({...formData, Direccion: e.target.value})}
                rows={2} 
                className="w-full border border-slate-300 rounded px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500" 
                required
              />
            </div>
            
            <div className="md:col-span-2">
              <div className="flex justify-between items-center mb-1">
                <label className="block text-[10px] font-medium text-slate-500">Ubicación en el Mapa</label>
                {formData.coordenadas && (
                  <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded border border-green-200 flex items-center gap-1">
                    <MapPin size={10} />
                    Ubicación fijada
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-400 mb-2">Haz clic en el mapa para marcar la ubicación exacta del inmueble. (Auto-completará la dirección)</p>
              <MapPicker 
                position={formData.coordenadas} 
                onLocationSelect={async (loc) => {
                  setFormData({...formData, coordenadas: loc});
                  // Geocodificación inversa
                  try {
                    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${loc.lat}&lon=${loc.lng}`);
                    const data = await res.json();
                    if (data && data.display_name) {
                      setFormData((prev: any) => ({...prev, coordenadas: loc, Direccion: data.display_name}));
                    }
                  } catch (err) {
                    console.error('Error in reverse geocoding:', err);
                  }
                }} 
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-medium text-slate-500 mb-1">Dirección fiscal (como aparece en el RIF)</label>
                <input type="text" value={formData.Direccion || ''} onChange={e => setFormData({...formData, Direccion: e.target.value})} className="w-full border border-slate-300 rounded px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-slate-500 mb-1">Nombre Comercial</label>
                <input type="text" className="w-full border border-slate-300 rounded px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500" />
              </div>
            </div>

            {/* Clasificación de Ordenanza */}
            <div className="mt-6 border-t border-slate-200 pt-6">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-4">Clasificación (Según Ordenanza)</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-semibold text-blue-600 mb-1">Clasificación Principal</label>
                  <select 
                    value={formData.Clasificacion} 
                    onChange={e => {
                      const val = e.target.value;
                      const updatedLocales = (formData.locales || []).map((loc: any) => ({
                        ...loc,
                        uso: val === 'Residencial' ? 'Residencial' : (val.includes('Comercial') || val === 'Industrial') ? 'Comercial' : loc.uso
                      }));
                      setFormData({
                        ...formData, 
                        Clasificacion: val,
                        TipoResidencia: (val === 'Residencial' || val === 'Mixto') ? (formData.TipoResidencia || ordenanzaData.tiposResidenciales[0].label) : '',
                        ActividadComercial: (val.includes('Comercial') || val === 'Mixto') ? (formData.ActividadComercial || ordenanzaData.actividadesComerciales[0].label) : '',
                        NivelMetraje: (val.includes('Comercial') || val === 'Mixto') ? (formData.NivelMetraje || ordenanzaData.nivelesMetraje[0]) : '',
                        locales: updatedLocales
                      });
                    }}
                    className="w-full border border-blue-300 bg-blue-50 rounded px-3 py-2 text-sm text-blue-800 outline-none focus:border-blue-500 font-medium"
                  >
                    {ordenanzaData.clasificaciones.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                {(formData.Clasificacion === 'Residencial') && !formData.isCondominio && (
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

                {(formData.Clasificacion?.includes('Comercial') || formData.Clasificacion === 'Industrial' || formData.Clasificacion === 'Mixto') && !formData.isCondominio && (
                  <>
                    <div>
                      <label className="block text-[10px] font-medium text-slate-500 mb-1">Actividad Económica (Buscador y Lista)</label>
                      <Select
                        options={ordenanzaData.actividadesComerciales.map(a => ({ value: a.label, label: a.label }))}
                        value={{ value: formData.ActividadComercial, label: formData.ActividadComercial }}
                        onChange={(selected: any) => setFormData({...formData, ActividadComercial: selected?.value || ''})}
                        placeholder="Buscar o seleccionar..."
                        className="text-sm text-slate-700"
                        styles={{
                          control: (base) => ({
                            ...base,
                            minHeight: '38px',
                            borderColor: '#cbd5e1',
                            boxShadow: 'none',
                            '&:hover': { borderColor: '#3b82f6' }
                          })
                        }}
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
            
            <div className="flex items-center gap-2 mt-4 mb-2">
              <input 
                type="checkbox" 
                id="isCondominio" 
                checked={formData.isCondominio || false}
                onChange={e => setFormData({
                  ...formData, 
                  isCondominio: e.target.checked, 
                  cantidadInmuebles: e.target.checked ? (formData.cantidadInmuebles || 0) : 0,
                  locales: e.target.checked ? (formData.locales || []) : []
                })}
                className="w-4 h-4 text-blue-600 rounded border-slate-300" 
              />
              <label htmlFor="isCondominio" className="text-xs font-medium text-slate-700">Es un Condominio (Contiene múltiples inmuebles)</label>
            </div>

            {formData.isCondominio && (
              <div className="mb-4">
                 <label className="block text-[10px] font-medium text-slate-500 mb-1">Cantidad de Locales / Apartamentos</label>
                 <input 
                   type="number" 
                   min="0"
                   max="200"
                   value={formData.cantidadInmuebles || 0}
                   onChange={handleCantidadChange}
                   className="w-32 border border-slate-300 rounded px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500" 
                 />
              </div>
            )}
            
            {formData.isCondominio && formData.cantidadInmuebles > 0 && (
              <div className="mt-4 border border-slate-200 rounded overflow-hidden">
                <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex justify-between items-center">
                  <h4 className="text-xs font-bold text-slate-700 uppercase">Desglose de Inmuebles ({formData.cantidadInmuebles})</h4>
                  <div className="flex items-center gap-1.5">
                    <input 
                      type="checkbox" 
                      id="uniformConfig"
                      checked={formData.uniformConfig || false}
                      onChange={e => setFormData({...formData, uniformConfig: e.target.checked})}
                      className="w-3.5 h-3.5 text-blue-600 rounded border-slate-300 cursor-pointer"
                    />
                    <label htmlFor="uniformConfig" className="text-[10px] font-medium text-slate-600 cursor-pointer uppercase tracking-wide">
                      Asignación Masiva
                    </label>
                  </div>
                </div>

                {formData.uniformConfig && (
                  <div className="bg-blue-50 px-4 py-3 border-b border-blue-100 flex flex-wrap gap-4 items-end shadow-inner">
                    <div className="flex-1 min-w-[200px]">
                      <label className="block text-[10px] font-bold text-blue-800 mb-1">Unificar Tipo de Residencia</label>
                      <select 
                        onChange={e => {
                          const val = e.target.value;
                          if(!val) return;
                          const newLocales = formData.locales.map((l: any) => ({
                            ...l,
                            tipoResidencia: l.uso === 'Residencial' ? val : l.tipoResidencia
                          }));
                          setFormData({...formData, locales: newLocales});
                        }}
                        className="w-full border border-blue-200 rounded px-2 py-1.5 text-xs outline-none text-blue-800 bg-white"
                      >
                        <option value="">-- Selecciona para aplicar a todos --</option>
                        {ordenanzaData.tiposResidenciales.map(t => <option key={t.label} value={t.label}>{t.label}</option>)}
                      </select>
                    </div>
                    {formData.Clasificacion !== 'Residencial' && (
                      <div className="flex-1 min-w-[200px]">
                        <label className="block text-[10px] font-bold text-blue-800 mb-1">Unificar Tamaño (Metraje Comercial)</label>
                        <select 
                          onChange={e => {
                            const val = e.target.value;
                            if(!val) return;
                            const newLocales = formData.locales.map((l: any) => ({
                              ...l,
                              nivel: l.uso === 'Comercial' ? val : l.nivel
                            }));
                            setFormData({...formData, locales: newLocales});
                          }}
                          className="w-full border border-blue-200 rounded px-2 py-1.5 text-xs outline-none text-blue-800 bg-white"
                        >
                          <option value="">-- Selecciona para aplicar a todos --</option>
                          {ordenanzaData.nivelesMetraje.map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                      </div>
                    )}
                  </div>
                )}

                <div className="max-h-[400px] overflow-y-auto p-4 space-y-4 bg-white">
                  {formData.locales?.map((local: any, index: number) => (
                    <div key={local.id || index} className="grid grid-cols-1 md:grid-cols-4 gap-3 p-3 border border-slate-100 bg-slate-50 rounded items-end">
                       <div>
                         <label className="block text-[10px] font-medium text-slate-500 mb-1">Numeración / Identificador</label>
                         <input type="text" value={local.numeracion} onChange={e => {
                            const newLocales = [...formData.locales];
                            newLocales[index].numeracion = e.target.value;
                            setFormData({...formData, locales: newLocales});
                         }} className="w-full border border-slate-300 rounded px-2 py-1.5 text-xs outline-none" />
                       </div>
                       <div>
                         <label className="block text-[10px] font-medium text-slate-500 mb-1">Uso</label>
                         <select 
                           value={local.uso} 
                           onChange={e => {
                              const newLocales = [...formData.locales];
                              newLocales[index].uso = e.target.value;
                              if(e.target.value === 'Residencial') newLocales[index].actividad = '';
                              setFormData({...formData, locales: newLocales});
                           }} 
                           className={`w-full border rounded px-2 py-1.5 text-xs outline-none ${formData.Clasificacion !== 'Mixto' ? 'bg-slate-100 text-slate-500 border-slate-200' : 'border-slate-300 text-slate-700'}`}
                           disabled={formData.Clasificacion !== 'Mixto'}
                         >
                           {(formData.Clasificacion === 'Residencial' || formData.Clasificacion === 'Mixto') && <option value="Residencial">Residencial</option>}
                           {(formData.Clasificacion === 'Comercial' || formData.Clasificacion === 'Industrial' || formData.Clasificacion === 'Mixto') && <option value="Comercial">Comercial</option>}
                         </select>
                       </div>
                       <div>
                         <label className="block text-[10px] font-medium text-slate-500 mb-1">Estatus</label>
                         <select value={local.estatus} onChange={e => {
                            const newLocales = [...formData.locales];
                            newLocales[index].estatus = e.target.value;
                            if(e.target.value === 'Desocupado') newLocales[index].actividad = '';
                            setFormData({...formData, locales: newLocales});
                         }} className="w-full border border-slate-300 rounded px-2 py-1.5 text-xs outline-none">
                           <option value="Desocupado">Desocupado</option>
                           <option value="Ocupado">Ocupado</option>
                         </select>
                       </div>
                       <div className="min-w-[150px]">
                         {local.uso === 'Comercial' ? (
                           <>
                             {local.estatus === 'Ocupado' ? (
                               <div className="mb-2">
                                 <label className="block text-[10px] font-medium text-slate-500 mb-1">Actividad Comercial</label>
                                 <Select
                                   options={ordenanzaData.actividadesComerciales.map(a => ({ value: a.label, label: a.label }))}
                                   value={local.actividad ? { value: local.actividad, label: local.actividad } : null}
                                   onChange={(selected: any) => {
                                     const newLocales = [...formData.locales];
                                     newLocales[index].actividad = selected?.value || '';
                                     setFormData({...formData, locales: newLocales});
                                   }}
                                   placeholder="Actividad..."
                                   className="text-xs"
                                   styles={{
                                     control: (base) => ({...base, minHeight: '30px', fontSize: '0.75rem'}),
                                     menuList: (base) => ({...base, maxHeight: '150px'})
                                   }}
                                   menuPosition="fixed"
                                 />
                               </div>
                             ) : (
                               <div className="mb-2">
                                 <label className="block text-[10px] font-medium text-slate-500 mb-1">Actividad Comercial</label>
                                 <div className="h-[30px] flex items-center px-2 text-[10px] bg-slate-100 text-slate-500 rounded border border-slate-200">
                                   Inmueble desocupado (vacío)
                                 </div>
                               </div>
                             )}
                             <div>
                               <label className="block text-[10px] font-medium text-slate-500 mb-1">Nivel (Metraje)</label>
                               <select 
                                 value={local.nivel || ordenanzaData.nivelesMetraje[0]} 
                                 onChange={e => {
                                    const newLocales = [...formData.locales];
                                    newLocales[index].nivel = e.target.value;
                                    setFormData({...formData, locales: newLocales});
                                 }}
                                 className="w-full border border-slate-300 rounded px-2 py-1.5 text-xs outline-none"
                               >
                                 {ordenanzaData.nivelesMetraje.map(n => <option key={n} value={n}>{n}</option>)}
                               </select>
                             </div>
                           </>
                         ) : (
                           <div className="h-full flex flex-col items-start justify-center pt-2">
                             <label className="block text-[10px] font-medium text-slate-500 mb-1">Tipo de Residencia</label>
                             <select 
                               value={local.tipoResidencia || ordenanzaData.tiposResidenciales[0].label} 
                               onChange={e => {
                                  const newLocales = [...formData.locales];
                                  newLocales[index].tipoResidencia = e.target.value;
                                  setFormData({...formData, locales: newLocales});
                               }}
                               className="w-full border border-slate-300 rounded px-2 py-1.5 text-xs outline-none"
                             >
                               {ordenanzaData.tiposResidenciales.map(t => <option key={t.label} value={t.label}>{t.label}</option>)}
                             </select>
                           </div>
                         )}
                       </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {/* Section: Datos de Seguridad */}
          <div className="bg-purple-100 border-y border-purple-200 px-4 py-2 mt-4">
            <h2 className="text-[10px] font-bold text-slate-800 uppercase tracking-wide">
              Datos de Seguridad
            </h2>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mb-8">
              <div>
                <label className="block text-[10px] font-medium text-slate-500 mb-1">Clave</label>
                <input type="password" placeholder="Clave" className="w-full border border-slate-300 rounded px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-slate-500 mb-1">Confirmar Clave</label>
                <input type="password" placeholder="Confirmar Clave" className="w-full border border-slate-300 rounded px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500" />
              </div>
            </div>
            
            <div className="flex justify-between items-center pt-4">
              <button 
                type="button" 
                onClick={calcularTarifa}
                disabled={isCalculating}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-6 py-2 rounded text-xs font-semibold transition-colors flex items-center gap-2 border border-slate-300"
              >
                {isCalculating ? 'Calculando...' : 'Calcular Tarifa Mensual'}
              </button>
              
              <button type="submit" disabled={isSaving} className="border border-orange-500 text-orange-500 hover:bg-orange-50 disabled:opacity-50 px-6 py-2 rounded text-xs font-medium transition-colors flex items-center gap-2">
                <Plus className="w-3 h-3" /> {isSaving ? 'Guardando...' : (isNew ? 'Agregar Contribuyente' : 'Actualizar Contribuyente')}
              </button>
            </div>
            
            {showCalculation && calculoDetalle && (
              <div className="mt-6 bg-slate-50 border border-slate-200 rounded p-4 animate-in fade-in slide-in-from-bottom-2">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-3 flex items-center gap-2">
                  <Building className="w-4 h-4 text-slate-500" /> Detalle de Cálculo de Aseo Urbano
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-600 bg-white p-3 border border-slate-100 rounded">
                  <div>
                    <p className="mb-1"><span className="font-semibold text-slate-700">Clasificación:</span> {calculoDetalle.leyenda}</p>
                    <p className="mb-1"><span className="font-semibold text-slate-700">Factor Multiplicador (Ordenanza):</span> {calculoDetalle.factor} TCMMV-BCV</p>
                  </div>
                  <div>
                    <p className="mb-1"><span className="font-semibold text-slate-700">Tasa de Cambio Oficial:</span> {bcvRate} Bs/EUR</p>
                    <p className="text-[10px] text-slate-400 italic mb-1">Fuente: {calculoDetalle.fuente} al {bcvDate}</p>
                  </div>
                  <div className="md:col-span-2 pt-2 border-t border-slate-100 flex justify-between items-center">
                    <p className="text-xs font-medium">Fórmula: {calculoDetalle.factor} × {bcvRate} Bs</p>
                    <p className="text-lg font-bold text-green-700">Total Mensual: Bs. {calculoDetalle.totalBs}</p>
                  </div>
                </div>
                
                {calculoDetalle.desglose && calculoDetalle.desglose.length > 0 && (
                  <div className="mt-4 border border-slate-200 rounded overflow-hidden shadow-sm">
                    <div className="bg-slate-100 px-3 py-2 border-b border-slate-200 flex justify-between items-center">
                      <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wide">Desglose Detallado por Inmueble</span>
                      <span className="text-[10px] font-medium text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">{calculoDetalle.desglose.length} registros</span>
                    </div>
                    <div className="max-h-[250px] overflow-y-auto bg-white">
                      <table className="w-full text-left text-[10px] text-slate-600">
                        <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10 shadow-sm">
                          <tr>
                            <th className="px-3 py-2 font-semibold border-r border-slate-100">Identificador</th>
                            <th className="px-3 py-2 font-semibold border-r border-slate-100">Concepto / Clasificación</th>
                            <th className="px-3 py-2 font-semibold text-right border-r border-slate-100 w-24">Factor (EUR)</th>
                            <th className="px-3 py-2 font-semibold text-right text-green-700 w-24">Monto (Bs)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {calculoDetalle.desglose.map((item: any, i: number) => (
                            <tr key={i} className="border-b border-slate-100 hover:bg-blue-50 transition-colors">
                              <td className="px-3 py-2 font-medium border-r border-slate-100">{item.numeracion}</td>
                              <td className="px-3 py-2 truncate max-w-[200px] border-r border-slate-100">{item.leyenda}</td>
                              <td className="px-3 py-2 text-right border-r border-slate-100">{item.factor.toFixed(2)}</td>
                              <td className="px-3 py-2 text-right font-bold text-green-700 bg-green-50/30">{item.montoBs}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </form>
      </div>
    );
  }

  const columns = [
    { key: 'CodCont', header: 'Código' },
    { key: 'Identidad', header: 'R.I.F. / Cédula' },
    { key: 'Contribuyente', header: 'Nombre / Razón Social' },
    {
      key: 'Clasificacion',
      header: 'Clasificación',
      render: (row: any) => {
        const clase = row.Clasificacion || 'Residencial';
        const detalle = clase.includes('Comercial') ? row.ActividadComercial : (row.TipoResidencia || 'No asignado');
        return (
          <div className="flex flex-col">
            <span className={`text-xs font-semibold ${clase === 'Residencial' ? 'text-emerald-600' : 'text-blue-600'}`}>{clase}</span>
            <span className="text-[10px] text-slate-500 truncate max-w-[150px]">{detalle}</span>
          </div>
        );
      }
    },
    {
      key: 'Direccion',
      header: 'Dirección',
      render: (row: any) => (
        <div>
          <p className="text-[10px] text-slate-600 line-clamp-2 max-w-[200px]">{row.Direccion}</p>
          {row.coordenadas && (
            <a href={`https://www.google.com/maps?q=${row.coordenadas.lat},${row.coordenadas.lng}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[10px] text-blue-600 hover:underline mt-1 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
              <MapPin size={10} />
              Ver Mapa
            </a>
          )}
        </div>
      )
    },
    { key: 'Telefono', header: 'Teléfono' },
    { key: 'Correo', header: 'Correo Electrónico' },
    {
      key: 'actions',
      header: 'Acciones / Estatus',
      render: (row: any) => {
        // Mock data logic for indicators
        const hasDebt = Math.random() > 0.5;
        const debtAmount = hasDebt ? (Math.random() * 5000).toFixed(2) : '0.00';
        const hasAgreement = Math.random() > 0.7;

        return (
          <div className="flex gap-2 items-center">
            <button 
              onClick={() => { setViewData(row); setIsViewModalOpen(true); }}
              className="bg-blue-50 text-blue-600 hover:bg-blue-100 p-1.5 rounded transition-colors"
              title="Ver Detalles"
            >
              <Eye className="w-4 h-4" />
            </button>
            <button 
              onClick={() => handleEdit(row)}
              className="bg-slate-100 text-slate-600 hover:bg-slate-200 p-1.5 rounded transition-colors"
              title="Editar"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button 
              className={`${hasDebt ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'} p-1.5 rounded transition-colors`}
              title={hasDebt ? `Deuda pendiente: Bs. ${debtAmount}` : 'Solvente'}
            >
              <DollarSign className="w-4 h-4" />
            </button>
            <button 
              className={`${hasAgreement ? 'bg-blue-50 text-blue-600 hover:bg-blue-100' : 'bg-slate-50 text-slate-400 cursor-default'} p-1.5 rounded transition-colors`}
              title={hasAgreement ? 'Tiene convenio activo' : 'Sin convenios'}
            >
              <Handshake className="w-4 h-4" />
            </button>
          </div>
        );
      }
    }
  ];

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto p-6">
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-slate-700" />
          <h1 className="text-lg font-semibold text-slate-800 uppercase tracking-wide">
            Listado de Contribuyentes
          </h1>
        </div>
        
        <button onClick={handleAdd} className="bg-slate-800 text-white hover:bg-slate-700 px-4 py-2 rounded text-sm font-medium transition-colors flex items-center gap-2 shadow-sm">
          <Plus className="w-4 h-4" /> Nuevo Registro
        </button>
      </div>

      <div className="bg-white rounded border border-slate-200 shadow-sm mt-4 overflow-hidden">
        <DataTable data={contribuyentes} columns={columns} itemsPerPage={15} />
      </div>

      {isViewModalOpen && viewData && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                Detalles del Contribuyente
              </h3>
              <button onClick={() => setIsViewModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">R.I.F. / Cédula</span>
                  <p className="text-sm font-semibold text-slate-700">{viewData.Identidad}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Razón Social</span>
                  <p className="text-sm font-semibold text-slate-700">{viewData.Contribuyente}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Teléfono</span>
                  <p className="text-sm font-semibold text-slate-700">{viewData.Telefono || 'N/A'}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Correo Electrónico</span>
                  <p className="text-sm font-semibold text-slate-700">{viewData.Correo || 'N/A'}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 col-span-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Dirección</span>
                  <p className="text-sm font-medium text-slate-700">{viewData.Direccion || 'N/A'}</p>
                </div>
              </div>
              
              {viewCalculo && (
                <div className="mt-6 bg-slate-50 border border-slate-200 rounded p-4">
                  <h4 className="font-bold text-slate-700 uppercase tracking-wide mb-3 flex items-center gap-2 text-xs">
                    <Building className="w-4 h-4 text-slate-500" /> Cálculo Mensual de Aseo Urbano
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-600 bg-white p-3 border border-slate-100 rounded">
                    <div>
                      <p className="mb-1"><span className="font-semibold text-slate-700">Clasificación:</span> {viewCalculo.leyenda}</p>
                      <p className="mb-1"><span className="font-semibold text-slate-700">Factor Multiplicador:</span> {viewCalculo.factor} TCMMV</p>
                    </div>
                    <div>
                      <p className="mb-1"><span className="font-semibold text-slate-700">Tasa de Cambio Oficial:</span> {viewCalculo.tasaBcv} Bs</p>
                    </div>
                    <div className="md:col-span-2 pt-2 border-t border-slate-100 flex justify-between items-center">
                      <p className="text-xs font-medium">Fórmula: {viewCalculo.factor} × {viewCalculo.tasaBcv} Bs</p>
                      <p className="text-lg font-bold text-green-700">Total Mensual: Bs. {viewCalculo.totalBs}</p>
                    </div>
                  </div>
                  
                  {viewCalculo.desglose && viewCalculo.desglose.length > 0 && (
                    <div className="mt-4 border border-slate-200 rounded overflow-hidden shadow-sm">
                      <div className="bg-slate-100 px-3 py-2 border-b border-slate-200">
                        <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wide">Desglose por Inmueble</span>
                      </div>
                      <div className="max-h-[150px] overflow-y-auto bg-white">
                        <table className="w-full text-left text-[10px] text-slate-600">
                          <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                            <tr>
                              <th className="px-3 py-2 font-semibold">Identificador</th>
                              <th className="px-3 py-2 font-semibold">Concepto</th>
                              <th className="px-3 py-2 font-semibold text-right">Factor (EUR)</th>
                              <th className="px-3 py-2 font-semibold text-right text-green-700">Monto (Bs)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {viewCalculo.desglose.map((item: any, i: number) => (
                              <tr key={i} className="border-b border-slate-100 last:border-0">
                                <td className="px-3 py-2 font-medium">{item.numeracion}</td>
                                <td className="px-3 py-2">{item.leyenda}</td>
                                <td className="px-3 py-2 text-right">{item.factor.toFixed(2)}</td>
                                <td className="px-3 py-2 text-right font-bold text-green-700">{item.montoBs}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-6 border border-slate-200 rounded-lg overflow-hidden">
                <div className="bg-red-50 px-4 py-3 border-b border-red-100 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-red-600" />
                  <h4 className="font-bold text-red-800">Estado de Cuenta (Deuda Actual)</h4>
                </div>
                <div className="p-0">
                  {(() => {
                    const deudas = (facturas || [])
                      .filter((f: any) => f.contribuyente === viewData.Contribuyente || f.contribuyente === viewData.Identidad)
                      .filter((f: any) => f.estado === 'Pendiente');
                    const totalBs = deudas.reduce((acc: number, f: any) => acc + parseFloat(f.monto || '0'), 0);
                    
                    if (deudas.length === 0) {
                      return (
                        <div className="p-6 text-center">
                          <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-2" />
                          <p className="text-slate-600 font-medium">El contribuyente está solvente.</p>
                        </div>
                      );
                    }

                    return (
                      <div>
                        <div className="p-4 bg-white border-b border-slate-100 flex justify-between items-center">
                          <span className="font-semibold text-slate-600">Monto Total Adeudado:</span>
                          <span className="text-xl font-black text-red-600">Bs. {totalBs.toFixed(2)}</span>
                        </div>
                        <div className="bg-slate-50">
                          <table className="w-full text-sm text-left">
                            <thead className="bg-slate-100 text-slate-500 font-medium text-[10px] uppercase">
                              <tr>
                                <th className="px-4 py-2">Referencia</th>
                                <th className="px-4 py-2">Fecha</th>
                                <th className="px-4 py-2 text-right">Monto (Bs)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {deudas.map((d: any, idx: number) => (
                                <tr key={idx} className="border-b border-slate-100 last:border-0 bg-white">
                                  <td className="px-4 py-2 font-medium text-slate-700">{d.referencia}</td>
                                  <td className="px-4 py-2 text-slate-600">{d.emision || 'N/A'}</td>
                                  <td className="px-4 py-2 text-right font-bold text-slate-800">{d.monto}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ContribuyentesPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Cargando...</div>}>
      <ContribuyentesPageContent />
    </Suspense>
  );
}
