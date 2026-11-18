'use client';
import { useEffect, useState } from 'react';
import { 
  Users, 
  Search, 
  Building2, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Download, 
  Filter, 
  Plus, 
  FileText, 
  Save, 
  MapPin, 
  Landmark, 
  X,
  FileCheck2,
  Briefcase,
  Upload,
  Eye,
  Calendar,
  Layers,
  Percent
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { ordenanzaData } from '@/data/ordenanza';
import { tarifasHaciendaCatastro } from '@/data/ordenanza';
import { esContribuyenteHacienda, deduplicarContribuyentes } from '@/lib/filtroHacienda';

export default function CensoHaciendaPage() {
  const [activeTab, setActiveTab] = useState<'censo' | 'nuevo'>('censo');
  const [inmuebles, setInmuebles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('');
  const [clasificacion, setClasificacion] = useState<'Todos' | 'Comercial' | 'Industrial'>('Todos');

  // Formulario de Levantamiento de Censo Comercial / Industrial
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Helper para convertir archivos a Base64
  const toBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  // Documentos digitalizados adjuntos
  const [archivos, setArchivos] = useState<{
    rif: File | null;
    patente: File | null;
    cedula: File | null;
  }>({
    rif: null,
    patente: null,
    cedula: null
  });

  const [formData, setFormData] = useState({
    identidadTipo: 'J',
    identidadNumero: '',
    razonSocial: '',
    nombreComercial: '',
    telefonoPrefijo: '0414',
    telefonoNumero: '',
    correoNombre: '',
    correoDominio: '@gmail.com',
    domicilioFiscal: '',
    direccionExacta: '',
    sector: 'Centro Tucacas',
    clasificacion: 'Comercial',
    actividadEconomica: 'Comercio al por menor de alimentos y víveres',
    nivelMetraje: '0 - 50 m²',
    fechaInicioActividad: new Date().toISOString().split('T')[0],
    isCondominio: false,
    cantidadInmuebles: 2,
    locales: [] as any[],
    // Específico Hacienda (Sección Separada)
    sectorISAE: 'Comercio al por menor de alimentos y víveres',
    alicuotaEstimada: '1.25',
    numeroPatente: '',
    tipoLicencia: 'Patente de Industria y Comercio',
    nota: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('inmuebles')
        .select('*')
        .order('contribuyente', { ascending: true });

      if (data) {
        setInmuebles(data);
      }
    } catch (e) {
      console.error('Error cargando censo:', e);
    } finally {
      setLoading(false);
    }
  }

  // Generador de locales/oficinas comerciales para centros comerciales o galerías
  const generarLocalesHacienda = (cant: number) => {
    const val = Math.max(1, Math.min(cant, 200));
    let newLocales = [...(formData.locales || [])];
    if (newLocales.length < val) {
      for (let i = newLocales.length; i < val; i++) {
        newLocales.push({
          numeracion: `Local / Oficina ${i + 1}`,
          uso: 'Comercial',
          estatus: 'Ocupado',
          actividad: ordenanzaData.actividadesComerciales[0]?.label || 'Comercial General',
          nivel: ordenanzaData.nivelesMetraje[0],
          tipoResidencia: '',
          nombreContribuyente: '',
          documentoIdentidadTipo: 'J',
          documentoIdentidadNumero: '',
          catastro: '',
          patente: ''
        });
      }
    } else {
      newLocales = newLocales.slice(0, val);
    }
    setFormData(prev => ({ ...prev, cantidadInmuebles: val, locales: newLocales }));
  };

  const handleFileChange = (tipo: 'rif' | 'patente' | 'cedula', file: File | null) => {
    if (file && file.size > 5 * 1024 * 1024) {
      alert('El archivo no debe exceder los 5 MB.');
      return;
    }
    setArchivos(prev => ({ ...prev, [tipo]: file }));
  };

  const handleSaveCenso = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.identidadNumero.trim() || !formData.razonSocial.trim()) {
      return alert('Debe completar el RIF y la Razón Social de la empresa.');
    }

    if (formData.isCondominio && (!formData.locales || formData.locales.length === 0)) {
      return alert('Debe generar el desglose de unidades/locales de la edificación.');
    }

    setIsSaving(true);
    try {
      const fullIdentidad = `${formData.identidadTipo}-${formData.identidadNumero.trim()}`;
      const fullTelefono = `${formData.telefonoPrefijo}${formData.telefonoNumero.trim()}`;
      const fullCorreo = `${formData.correoNombre.trim()}${formData.correoDominio}`;
      const finalContribuyente = formData.nombreComercial.trim()
        ? `${formData.razonSocial.trim()} | Comercial: ${formData.nombreComercial.trim()}`
        : formData.razonSocial.trim();

      // Convertir archivos a Base64 si fueron cargados
      let rifDocB64 = null;
      let patenteDocB64 = null;
      let cedulaDocB64 = null;

      if (archivos.rif) rifDocB64 = await toBase64(archivos.rif);
      if (archivos.patente) patenteDocB64 = await toBase64(archivos.patente);
      if (archivos.cedula) cedulaDocB64 = await toBase64(archivos.cedula);

      // Objeto pre_registros interconectado con todos los datos requeridos por Aseo y Hacienda
      const payload: any = {
        identidad: fullIdentidad,
        contribuyente: finalContribuyente,
        registro: fullTelefono,
        tipo: formData.clasificacion,
        actividad: formData.actividadEconomica,
        codigo: formData.nivelMetraje, // Requerido para cálculo de tarifa en Aseo Urbano
        origen: 'Censo - HACIENDA',
        departamento: 'HACIENDA',
        fecha_inicio: formData.fechaInicioActividad,
        domicilio_fiscal: `${formData.domicilioFiscal} (Sector ${formData.sector})`,
        direccion_exacta: formData.direccionExacta || formData.domicilioFiscal,
        is_condominio: formData.isCondominio,
        cantidad_inmuebles: formData.isCondominio ? Number(formData.cantidadInmuebles) || 1 : 1,
        locales: formData.isCondominio ? formData.locales.map((l: any) => ({
          ...l,
          documentoIdentidad: l.documentoIdentidadNumero ? `${l.documentoIdentidadTipo || 'J'}-${l.documentoIdentidadNumero}` : ''
        })) : [],
        nota: `Hacienda: Sector ISAE: ${formData.sectorISAE} | Alícuota Est: ${formData.alicuotaEstimada}% | Patente: ${formData.numeroPatente || 'Sin Patente'} | Licencia: ${formData.tipoLicencia} | Email: ${fullCorreo} | ${formData.nota || ''}`,
        rif_doc: rifDocB64,
        patente_doc: patenteDocB64,
        cedula_doc: cedulaDocB64
      };

      const { error: prErr } = await supabase.from('pre_registros').insert([payload]);

      if (prErr) throw prErr;

      // Registrar auditoría
      try {
        await supabase.from('audit_logs').insert([{
          user_id: 'HACIENDA (dzara)',
          action: 'CENSO_HACIENDA_CREADO',
          details: `Censo comercial registrado para ${fullIdentidad} - ${formData.razonSocial}`
        }]);
      } catch (logErr) {
        console.warn('Audit opcional:', logErr);
      }

      setShowSuccess(true);
      setFormData({
        identidadTipo: 'J',
        identidadNumero: '',
        razonSocial: '',
        nombreComercial: '',
        telefonoPrefijo: '0414',
        telefonoNumero: '',
        correoNombre: '',
        correoDominio: '@gmail.com',
        domicilioFiscal: '',
        direccionExacta: '',
        sector: 'Centro Tucacas',
        clasificacion: 'Comercial',
        actividadEconomica: 'Comercio al por menor de alimentos y víveres',
        nivelMetraje: '0 - 50 m²',
        fechaInicioActividad: new Date().toISOString().split('T')[0],
        isCondominio: false,
        cantidadInmuebles: 2,
        locales: [],
        sectorISAE: 'Comercio al por menor de alimentos y víveres',
        alicuotaEstimada: '1.25',
        numeroPatente: '',
        tipoLicencia: 'Patente de Industria y Comercio',
        nota: ''
      });
      setArchivos({ rif: null, patente: null, cedula: null });

      loadData();
      setTimeout(() => setShowSuccess(false), 4000);
    } catch (err: any) {
      alert('Error registrando censo: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const inmueblesFiltrados = deduplicarContribuyentes(
    inmuebles
      .filter(i => esContribuyenteHacienda(i))
      .filter(i => {
        const cls = (i.clasificacion || '').toUpperCase();
        const esIndustrial = cls.includes('INDUSTRIAL');

        if (clasificacion === 'Comercial' && esIndustrial) return false;
        if (clasificacion === 'Industrial' && !esIndustrial) return false;

        if (!filtro) return true;
        const q = filtro.toLowerCase();
        return (
          (i.contribuyente || '').toLowerCase().includes(q) ||
          (i.identidad || '').toLowerCase().includes(q) ||
          (i.sector || '').toLowerCase().includes(q) ||
          (i.actividad_principal || '').toLowerCase().includes(q) ||
          (i.patente || '').toLowerCase().includes(q)
        );
      })
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header y Selector de Modo */}
      <div className="border-b border-slate-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <Users className="w-7 h-7 text-sky-400" />
            Censo Comercial e Industrial - Hacienda Municipal
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Empadronamiento interconectado de establecimientos comerciales, patentes y actividades económicas de Silva.
          </p>
        </div>

        {/* Botones de Pestañas: Padrón vs. Levantar Censo */}
        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setActiveTab('censo')}
            className={`px-4 py-2 rounded-lg font-bold transition-all flex items-center gap-2 ${
              activeTab === 'censo' ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/30' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            Padrón de Contribuyentes ({inmueblesFiltrados.length})
          </button>
          <button
            onClick={() => setActiveTab('nuevo')}
            className={`px-4 py-2 rounded-lg font-bold transition-all flex items-center gap-2 ${
              activeTab === 'nuevo' ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/30' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Plus className="w-4 h-4" />
            Levantar Nuevo Censo Comercial
          </button>
        </div>
      </div>

      {/* PESTAÑA 1: FORMULARIO DE LEVANTAMIENTO DE CENSO */}
      {activeTab === 'nuevo' && (
        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6 animate-in fade-in duration-200">
          <div className="border-b border-slate-800 pb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-black text-white flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-sky-400" />
                Formulario de Empadronamiento de Hacienda Municipal
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Los datos se interconectan directamente con Aseo Urbano y el Módulo de Pre-Registros centralizado.
              </p>
            </div>
            <span className="px-3 py-1 rounded-lg text-xs font-mono font-bold bg-sky-950 text-sky-300 border border-sky-800">
              DEPARTAMENTO: HACIENDA
            </span>
          </div>

          {showSuccess && (
            <div className="p-4 bg-emerald-950/80 border border-emerald-800 text-emerald-200 rounded-xl flex items-center gap-2 text-xs font-semibold">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              ¡Establecimiento empadronado exitosamente y registrado en la base de datos municipal!
            </div>
          )}

          <form onSubmit={handleSaveCenso} className="space-y-6">
            {/* Sección 1: Identificación del Contribuyente */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-sky-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-800/80 pb-1.5">
                <Building2 className="w-4 h-4" />
                1. Identificación del Contribuyente y Razón Social
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                    RIF del Contribuyente <span className="text-red-400">*</span>
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={formData.identidadTipo}
                      onChange={e => setFormData({ ...formData, identidadTipo: e.target.value })}
                      className="w-20 px-2 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-bold"
                    >
                      <option value="J">J-</option>
                      <option value="V">V-</option>
                      <option value="G">G-</option>
                      <option value="E">E-</option>
                    </select>
                    <input
                      type="text"
                      placeholder="312768320"
                      maxLength={10}
                      value={formData.identidadNumero}
                      onChange={e => setFormData({ ...formData, identidadNumero: e.target.value.replace(/\D/g, '') })}
                      className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-mono"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                    Razón Social (según Registro Mercantil) <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. DISTRIBUIDORA MORROCOY, C.A."
                    value={formData.razonSocial}
                    onChange={e => setFormData({ ...formData, razonSocial: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white uppercase"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                    Nombre Comercial / Denominación
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Automercado Morrocoy"
                    value={formData.nombreComercial}
                    onChange={e => setFormData({ ...formData, nombreComercial: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
                  />
                </div>
              </div>
            </div>

            {/* Sección 2: Actividad, Clasificación y Parámetros Requeridos por Aseo Urbano */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-800/80 pb-1.5">
                <Layers className="w-4 h-4" />
                2. Actividad Económica, Metraje y Fecha de Inicio (Requeridos para Aseo Urbano)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                    Clasificación Tributaria Principal
                  </label>
                  <select
                    value={formData.clasificacion}
                    onChange={e => {
                      const newClasif = e.target.value;
                      setFormData(prev => ({
                        ...prev,
                        clasificacion: newClasif,
                        locales: prev.locales.map(l => ({
                          ...l,
                          uso: newClasif.includes('Comercial') || newClasif === 'Industrial' ? 'Comercial' : 'Residencial'
                        }))
                      }));
                    }}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
                  >
                    <option value="Comercial">Comercial</option>
                    <option value="Industrial">Industrial</option>
                    <option value="Servicios / Mixto">Servicios / Mixto</option>
                  </select>
                </div>

                {!formData.isCondominio && (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                      Actividad Comercial / Industrial (Ordenanza)
                    </label>
                    <select
                      value={formData.actividadEconomica}
                      onChange={e => setFormData({ ...formData, actividadEconomica: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
                    >
                      <optgroup label="Actividades Comerciales (Ordenanza)">
                        {ordenanzaData.actividadesComerciales.map(a => (
                          <option key={`com-${a.label}`} value={a.label}>{a.label}</option>
                        ))}
                      </optgroup>
                      <optgroup label="Actividades Industriales (Ordenanza)">
                        {ordenanzaData.actividadesIndustriales.map(a => (
                          <option key={`ind-${a.label}`} value={a.label}>{a.label}</option>
                        ))}
                      </optgroup>
                    </select>
                  </div>
                )}

                {!formData.isCondominio && (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                      Rango de Metraje / Área del Local <span className="text-emerald-400 font-bold">(Para Aseo)</span>
                    </label>
                    <select
                      value={formData.nivelMetraje}
                      onChange={e => setFormData({ ...formData, nivelMetraje: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-semibold"
                    >
                      {ordenanzaData.nivelesMetraje.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                    Fecha de Inicio de Actividades <span className="text-emerald-400 font-bold">(Para Deuda Aseo)</span>
                  </label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="date"
                      value={formData.fechaInicioActividad}
                      onChange={e => setFormData({ ...formData, fechaInicioActividad: e.target.value })}
                      className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-mono"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Opción Centro Comercial / Galería / Múltiples Locales */}
              <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold text-slate-200 block">
                      ¿Es Centro Comercial, Galería, Edificio o Inmueble con Múltiples Locales?
                    </span>
                    <p className="text-[11px] text-slate-400">
                      Permite registrar individualmente cada local u oficina comercial con su propia actividad, tipo y metraje para el cobro de Aseo y Patentes.
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-200 font-bold bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-700">
                      <input
                        type="checkbox"
                        checked={formData.isCondominio}
                        onChange={e => {
                          const checked = e.target.checked;
                          setFormData(prev => ({ ...prev, isCondominio: checked }));
                          if (checked && (!formData.locales || formData.locales.length === 0)) {
                            generarLocalesHacienda(formData.cantidadInmuebles || 2);
                          }
                        }}
                        className="w-4 h-4 rounded text-sky-600 focus:ring-0 bg-slate-900 border-slate-700"
                      />
                      <span>Sí, múltiples locales / condominio</span>
                    </label>
                  </div>
                </div>

                {formData.isCondominio && (
                  <div className="space-y-4 pt-3 border-t border-slate-800">
                    <div className="flex items-center gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                          Cantidad Total de Locales / Oficinas
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="200"
                          value={formData.cantidadInmuebles}
                          onChange={e => {
                            const val = parseInt(e.target.value) || 1;
                            setFormData(prev => ({ ...prev, cantidadInmuebles: val }));
                          }}
                          className="w-32 px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white font-mono font-bold"
                        />
                      </div>
                      <div className="pt-4">
                        <button
                          type="button"
                          onClick={() => generarLocalesHacienda(formData.cantidadInmuebles)}
                          className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center gap-1.5"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Generar / Actualizar Locales ({formData.cantidadInmuebles})
                        </button>
                      </div>
                    </div>

                    {/* Desglose de Locales Registrados */}
                    {formData.locales && formData.locales.length > 0 && (
                      <div className="space-y-3 bg-slate-950/70 p-4 rounded-xl border border-slate-800 max-h-[480px] overflow-y-auto">
                        <h4 className="text-xs font-bold text-sky-400 uppercase tracking-wider flex items-center justify-between border-b border-slate-800 pb-2">
                          <span>Locales / Oficinas Desglosados ({formData.locales.length})</span>
                          <span className="text-[10px] font-normal text-slate-400">Cada unidad tiene su propia actividad económica y metraje</span>
                        </h4>

                        <div className="space-y-3">
                          {formData.locales.map((local: any, idx: number) => (
                            <div key={idx} className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl space-y-3">
                              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                                    Identificador / N° Local
                                  </label>
                                  <input
                                    type="text"
                                    value={local.numeracion}
                                    onChange={e => {
                                      const n = [...formData.locales];
                                      n[idx].numeracion = e.target.value;
                                      setFormData({ ...formData, locales: n });
                                    }}
                                    className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white font-semibold"
                                  />
                                </div>

                                <div>
                                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                                    Tipo / Uso
                                  </label>
                                  <select
                                    value={local.uso}
                                    onChange={e => {
                                      const n = [...formData.locales];
                                      n[idx].uso = e.target.value;
                                      setFormData({ ...formData, locales: n });
                                    }}
                                    className="w-full px-2 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white font-bold"
                                  >
                                    <option value="Comercial">Comercial</option>
                                    <option value="Residencial">Residencial / Habitación</option>
                                  </select>
                                </div>

                                {local.uso === 'Residencial' ? (
                                  <div className="md:col-span-2">
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                                      Tipología Residencial (Para Aseo)
                                    </label>
                                    <select
                                      value={local.tipoResidencia || ordenanzaData.tiposResidenciales[0]?.label}
                                      onChange={e => {
                                        const n = [...formData.locales];
                                        n[idx].tipoResidencia = e.target.value;
                                        setFormData({ ...formData, locales: n });
                                      }}
                                      className="w-full px-2 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
                                    >
                                      {ordenanzaData.tiposResidenciales.map(t => (
                                        <option key={t.label} value={t.label}>{t.label}</option>
                                      ))}
                                    </select>
                                  </div>
                                ) : (
                                  <>
                                    <div>
                                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                                        Actividad Comercial
                                      </label>
                                      <select
                                        value={local.actividad}
                                        onChange={e => {
                                          const n = [...formData.locales];
                                          n[idx].actividad = e.target.value;
                                          setFormData({ ...formData, locales: n });
                                        }}
                                        className="w-full px-2 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white truncate"
                                      >
                                        <optgroup label="Actividades Comerciales (Ordenanza)">
                                          {ordenanzaData.actividadesComerciales.map(a => (
                                            <option key={a.label} value={a.label}>{a.label}</option>
                                          ))}
                                        </optgroup>
                                        <optgroup label="Actividades Industriales (Ordenanza)">
                                          {ordenanzaData.actividadesIndustriales.map(a => (
                                            <option key={a.label} value={a.label}>{a.label}</option>
                                          ))}
                                        </optgroup>
                                      </select>
                                    </div>
                                    <div>
                                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                                        Rango Metraje (Para Aseo)
                                      </label>
                                      <select
                                        value={local.nivel}
                                        onChange={e => {
                                          const n = [...formData.locales];
                                          n[idx].nivel = e.target.value;
                                          setFormData({ ...formData, locales: n });
                                        }}
                                        className="w-full px-2 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
                                      >
                                        {ordenanzaData.nivelesMetraje.map(m => (
                                          <option key={m} value={m}>{m}</option>
                                        ))}
                                      </select>
                                    </div>
                                  </>
                                )}
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-slate-800">
                                <div>
                                  <label className="block text-[10px] font-medium text-slate-400 mb-1">
                                    RIF / Cédula del Ocupante
                                  </label>
                                  <div className="flex gap-1.5">
                                    <select
                                      value={local.documentoIdentidadTipo || 'J'}
                                      onChange={e => {
                                        const n = [...formData.locales];
                                        n[idx].documentoIdentidadTipo = e.target.value;
                                        setFormData({ ...formData, locales: n });
                                      }}
                                      className="w-16 px-1.5 py-1 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white font-bold"
                                    >
                                      <option value="J">J-</option>
                                      <option value="V">V-</option>
                                      <option value="G">G-</option>
                                      <option value="E">E-</option>
                                    </select>
                                    <input
                                      type="text"
                                      placeholder="312768320"
                                      value={local.documentoIdentidadNumero || ''}
                                      onChange={e => {
                                        const n = [...formData.locales];
                                        n[idx].documentoIdentidadNumero = e.target.value.replace(/\D/g, '');
                                        setFormData({ ...formData, locales: n });
                                      }}
                                      className="flex-1 px-2 py-1 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white font-mono"
                                    />
                                  </div>
                                </div>

                                <div>
                                  <label className="block text-[10px] font-medium text-slate-400 mb-1">
                                    Razón Social / Nombre Comercial del Local
                                  </label>
                                  <input
                                    type="text"
                                    placeholder="Ej. Farmacia La Fe"
                                    value={local.nombreContribuyente || ''}
                                    onChange={e => {
                                      const n = [...formData.locales];
                                      n[idx].nombreContribuyente = e.target.value;
                                      setFormData({ ...formData, locales: n });
                                    }}
                                    className="w-full px-2 py-1 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
                                  />
                                </div>

                                <div>
                                  <label className="block text-[10px] font-medium text-slate-400 mb-1">
                                    N° Patente del Local (Si posee)
                                  </label>
                                  <input
                                    type="text"
                                    placeholder="Ej. PAT-1045"
                                    value={local.patente || ''}
                                    onChange={e => {
                                      const n = [...formData.locales];
                                      n[idx].patente = e.target.value;
                                      setFormData({ ...formData, locales: n });
                                    }}
                                    className="w-full px-2 py-1 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white font-mono"
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Sección 3: Datos Exclusivos de Hacienda Municipal (Separada y Específica) */}
            <div className="space-y-3 p-4 bg-sky-950/20 border border-sky-900/60 rounded-2xl">
              <div className="border-b border-sky-800/60 pb-2 flex items-center justify-between">
                <h3 className="text-xs font-bold text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Landmark className="w-4 h-4" />
                  3. Parámetros Tributarios de Hacienda Municipal (Exclusivo Hacienda)
                </h3>
                <span className="text-[10px] font-mono text-sky-300 bg-sky-900/40 px-2 py-0.5 rounded border border-sky-700">
                  ISAE & PATENTES
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Esta sección corresponde exclusivamente al control tributario municipal de Hacienda (alícuotas de actividades económicas según la LOCAT y registro de patentes).
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                    Sector Tributario ISAE (Alícuota Armonizada)
                  </label>
                  <select
                    value={formData.sectorISAE}
                    onChange={e => {
                      const sel = tarifasHaciendaCatastro.hacienda.alicuotasISAE.find(a => a.sector === e.target.value);
                      setFormData({
                        ...formData,
                        sectorISAE: e.target.value,
                        alicuotaEstimada: sel ? sel.alicuota.toString() : formData.alicuotaEstimada
                      });
                    }}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
                  >
                    {tarifasHaciendaCatastro.hacienda.alicuotasISAE.map(a => (
                      <option key={a.sector} value={a.sector}>
                        {a.sector} ({a.alicuota}%)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                    Alícuota ISAE Aplicable (%)
                  </label>
                  <div className="relative">
                    <Percent className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-sky-400" />
                    <input
                      type="number"
                      step="0.01"
                      min="0.1"
                      max="15"
                      value={formData.alicuotaEstimada}
                      onChange={e => setFormData({ ...formData, alicuotaEstimada: e.target.value })}
                      className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-mono font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                    N° de Patente Comercial Asignada
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. 1918 o En Trámite"
                    value={formData.numeroPatente}
                    onChange={e => setFormData({ ...formData, numeroPatente: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Sección 4: Contacto y Ubicación Física */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-sky-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-800/80 pb-1.5">
                <MapPin className="w-4 h-4" />
                4. Contacto y Ubicación Física
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                    Teléfono Móvil / Contacto
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={formData.telefonoPrefijo}
                      onChange={e => setFormData({ ...formData, telefonoPrefijo: e.target.value })}
                      className="w-24 px-2 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
                    >
                      <option value="0414">0414</option>
                      <option value="0424">0424</option>
                      <option value="0412">0412</option>
                      <option value="0416">0416</option>
                      <option value="0426">0426</option>
                    </select>
                    <input
                      type="text"
                      placeholder="1234567"
                      maxLength={7}
                      value={formData.telefonoNumero}
                      onChange={e => setFormData({ ...formData, telefonoNumero: e.target.value.replace(/\D/g, '') })}
                      className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                    Correo Electrónico
                  </label>
                  <div className="flex gap-1">
                    <input
                      type="text"
                      placeholder="empresa"
                      value={formData.correoNombre}
                      onChange={e => setFormData({ ...formData, correoNombre: e.target.value.replace(/\s/g, '') })}
                      className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
                    />
                    <select
                      value={formData.correoDominio}
                      onChange={e => setFormData({ ...formData, correoDominio: e.target.value })}
                      className="w-32 px-2 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
                    >
                      <option value="@gmail.com">@gmail.com</option>
                      <option value="@hotmail.com">@hotmail.com</option>
                      <option value="@outlook.com">@outlook.com</option>
                      <option value="@yahoo.com">@yahoo.com</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                    Sector Geográfico
                  </label>
                  <select
                    value={formData.sector}
                    onChange={e => setFormData({ ...formData, sector: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
                  >
                    <option value="Centro Tucacas">Centro Tucacas</option>
                    <option value="Bomba H">Bomba H</option>
                    <option value="Morrocoy / Marina">Morrocoy / Marina</option>
                    <option value="Ramadita">Ramadita</option>
                    <option value="Araguita">Araguita</option>
                    <option value="Boca de Aroa">Boca de Aroa</option>
                    <option value="Carretera Nacional">Carretera Nacional</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                    Domicilio Fiscal (según RIF)
                  </label>
                  <input
                    type="text"
                    placeholder="Avenida Principal, Centro Comercial..."
                    value={formData.domicilioFiscal}
                    onChange={e => setFormData({ ...formData, domicilioFiscal: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                    Dirección Exacta / Punto de Referencia
                  </label>
                  <input
                    type="text"
                    placeholder="Calle Páez con Av. Silva, Local N° 3, diagonal al Banco..."
                    value={formData.direccionExacta}
                    onChange={e => setFormData({ ...formData, direccionExacta: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
                  />
                </div>
              </div>
            </div>

            {/* Sección 5: Carga de Documentos Digitalizados */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-800/80 pb-1.5">
                <Upload className="w-4 h-4" />
                5. Carga de Documentos Digitalizados (PDF o Imagen)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* RIF Digital */}
                <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-sky-400" />
                      RIF Digital Vigente
                    </span>
                    {archivos.rif && (
                      <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
                        Cargado
                      </span>
                    )}
                  </div>
                  <input
                    type="file"
                    accept=".pdf,image/*"
                    onChange={e => handleFileChange('rif', e.target.files?.[0] || null)}
                    className="w-full text-[11px] text-slate-400 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[11px] file:font-semibold file:bg-sky-600 file:text-white hover:file:bg-sky-500 cursor-pointer"
                  />
                  {archivos.rif && (
                    <p className="text-[10px] text-slate-400 truncate">
                      {archivos.rif.name} ({(archivos.rif.size / 1024).toFixed(1)} KB)
                    </p>
                  )}
                </div>

                {/* Patente Comercial */}
                <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <FileCheck2 className="w-4 h-4 text-amber-400" />
                      Patente Comercial (Si posee)
                    </span>
                    {archivos.patente && (
                      <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
                        Cargada
                      </span>
                    )}
                  </div>
                  <input
                    type="file"
                    accept=".pdf,image/*"
                    onChange={e => handleFileChange('patente', e.target.files?.[0] || null)}
                    className="w-full text-[11px] text-slate-400 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[11px] file:font-semibold file:bg-amber-600 file:text-white hover:file:bg-amber-500 cursor-pointer"
                  />
                  {archivos.patente && (
                    <p className="text-[10px] text-slate-400 truncate">
                      {archivos.patente.name} ({(archivos.patente.size / 1024).toFixed(1)} KB)
                    </p>
                  )}
                </div>

                {/* Cédula del Representante Legal */}
                <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      Cédula del Representante Legal
                    </span>
                    {archivos.cedula && (
                      <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
                        Cargada
                      </span>
                    )}
                  </div>
                  <input
                    type="file"
                    accept=".pdf,image/*"
                    onChange={e => handleFileChange('cedula', e.target.files?.[0] || null)}
                    className="w-full text-[11px] text-slate-400 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[11px] file:font-semibold file:bg-emerald-600 file:text-white hover:file:bg-emerald-500 cursor-pointer"
                  />
                  {archivos.cedula && (
                    <p className="text-[10px] text-slate-400 truncate">
                      {archivos.cedula.name} ({(archivos.cedula.size / 1024).toFixed(1)} KB)
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Observaciones */}
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                Observaciones del Levantamiento
              </label>
              <textarea
                rows={2}
                placeholder="Detalles sobre inventario visible, letrero publicitario, condición del inmueble..."
                value={formData.nota}
                onChange={e => setFormData({ ...formData, nota: e.target.value })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setActiveTab('censo')}
                className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Cancelar y Volver al Padrón
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-sky-600/30 transition-all disabled:opacity-50"
              >
                {isSaving ? <AlertTriangle className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {isSaving ? 'Guardando Censo...' : 'Guardar y Empadronar Comercio'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* PESTAÑA 2: PADRON GENERAL CON FILTROS */}
      {activeTab === 'censo' && (
        <div className="space-y-4">
          {/* Barra de Filtros */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row gap-4 justify-between items-center shadow-xl">
            <div className="relative w-full md:w-96">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Buscar por RIF, Razón Social, Sector o N° Patente..."
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs w-full md:w-auto">
              {(['Todos', 'Comercial', 'Industrial'] as const).map(c => (
                <button
                  key={c}
                  onClick={() => setClasificacion(c)}
                  className={`flex-1 md:flex-none px-4 py-1.5 rounded-lg font-bold transition-all ${
                    clasificacion === c ? 'bg-sky-600 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Tabla del Padrón */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            {loading ? (
              <div className="p-12 text-center text-slate-500 text-xs">
                Cargando censo comercial e industrial...
              </div>
            ) : inmueblesFiltrados.length === 0 ? (
              <div className="p-12 text-center text-slate-500 text-xs">
                No se encontraron establecimientos con los criterios de búsqueda.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="p-3.5">RIF / Cédula</th>
                      <th className="p-3.5">Razón Social / Contribuyente</th>
                      <th className="p-3.5">Sector</th>
                      <th className="p-3.5">Clasificación</th>
                      <th className="p-3.5">Actividad Económica</th>
                      <th className="p-3.5">N° Patente</th>
                      <th className="p-3.5 text-center">Estado Registro</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium">
                    {inmueblesFiltrados.map((inm) => (
                      <tr key={inm.id} className="hover:bg-slate-900/50 transition-colors">
                        <td className="p-3.5 font-mono text-slate-300 font-bold">
                          {inm.identidad}
                        </td>
                        <td className="p-3.5 text-white font-bold max-w-xs truncate">
                          {inm.contribuyente}
                        </td>
                        <td className="p-3.5 text-slate-400">
                          {inm.sector || 'Tucacas'}
                        </td>
                        <td className="p-3.5">
                          <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] text-sky-300 font-semibold">
                            {inm.clasificacion || 'Comercial'}
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-400 max-w-xs truncate text-[11px]">
                          {inm.actividad_principal || 'Comercial General'}
                        </td>
                        <td className="p-3.5 font-mono">
                          {inm.patente && inm.patente !== 'SN' ? (
                            <span className="text-amber-400 font-bold bg-amber-950/40 px-2 py-0.5 rounded border border-amber-900/50 text-[10px]">
                              {inm.patente}
                            </span>
                          ) : (
                            <span className="text-slate-600 text-[10px]">En Trámite</span>
                          )}
                        </td>
                        <td className="p-3.5 text-center">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-950/60 text-emerald-300 border border-emerald-800/80 text-[10px] font-semibold">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            Empadronado
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
