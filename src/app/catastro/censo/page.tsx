'use client';
import { useEffect, useState } from 'react';
import { 
  Users, 
  Search, 
  Building2, 
  Home, 
  MapPin, 
  AlertTriangle, 
  CheckCircle2, 
  Download, 
  Plus, 
  Save, 
  Compass, 
  Landmark, 
  FileText,
  BadgePercent,
  Upload,
  Calendar,
  Layers,
  FileCheck2,
  ShieldCheck
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { tarifasHaciendaCatastro, ordenanzaData } from '@/data/ordenanza';

export default function CensoCatastroPage() {
  const [activeTab, setActiveTab] = useState<'censo' | 'nuevo'>('censo');
  const [inmuebles, setInmuebles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('');
  const [clasificacion, setClasificacion] = useState<'Todos' | 'Residencial' | 'Comercial' | 'Industrial'>('Todos');

  // Formulario de Levantamiento Catastral
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
    cedula: File | null;
    ficha: File | null;
    rif: File | null;
  }>({
    cedula: null,
    ficha: null,
    rif: null
  });

  const [formData, setFormData] = useState({
    identidadTipo: 'V',
    identidadNumero: '',
    propietario: '',
    telefonoPrefijo: '0414',
    telefonoNumero: '',
    correoNombre: '',
    correoDominio: '@gmail.com',
    sector: 'Centro Tucacas',
    direccionExacta: '',
    clasificacion: 'Residencial',
    tipoInmueble: 'Tipo III: Casas',
    actividadComercial: ordenanzaData.actividadesComerciales[0]?.label || '',
    nivelMetraje: '0 - 50 m²',
    fechaInicioActividad: new Date().toISOString().split('T')[0],
    isCondominio: false,
    cantidadInmuebles: 1,
    // Específico Catastro
    codigoCatastral: '',
    metrosTerreno: '200',
    metrosConstruccion: '120',
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
        .order('inmueble', { ascending: true });

      if (data) setInmuebles(data);
    } catch (e) {
      console.error('Error cargando censo catastral:', e);
    } finally {
      setLoading(false);
    }
  }

  const handleFileChange = (tipo: 'cedula' | 'ficha' | 'rif', file: File | null) => {
    if (file && file.size > 5 * 1024 * 1024) {
      alert('El archivo no debe exceder los 5 MB.');
      return;
    }
    setArchivos(prev => ({ ...prev, [tipo]: file }));
  };

  const handleSaveCenso = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.identidadNumero.trim() || !formData.propietario.trim()) {
      return alert('Debe completar la cédula/RIF y el nombre del propietario.');
    }

    setIsSaving(true);
    try {
      const fullIdentidad = `${formData.identidadTipo}-${formData.identidadNumero.trim()}`;
      const fullTelefono = `${formData.telefonoPrefijo}${formData.telefonoNumero.trim()}`;
      const codCat = formData.codigoCatastral.trim() || `01-${Math.floor(Math.random() * 90 + 10)}-${Math.floor(Math.random() * 90 + 10)}`;

      // Actividad y Código para Aseo Urbano
      const finalActividad = formData.clasificacion === 'Residencial'
        ? formData.tipoInmueble
        : formData.actividadComercial;

      const finalCodigo = formData.clasificacion === 'Residencial'
        ? formData.tipoInmueble
        : formData.nivelMetraje;

      // Convertir archivos a Base64 si fueron cargados
      let cedulaDocB64 = null;
      let rifDocB64 = null;
      let patenteDocB64 = null; // En catastro se puede guardar la ficha catastral en patente_doc o rif_doc

      if (archivos.cedula) cedulaDocB64 = await toBase64(archivos.cedula);
      if (archivos.rif) rifDocB64 = await toBase64(archivos.rif);
      if (archivos.ficha) patenteDocB64 = await toBase64(archivos.ficha);

      // Objeto interconectado para pre_registros
      const payload: any = {
        identidad: fullIdentidad,
        contribuyente: formData.propietario.trim(),
        registro: fullTelefono,
        tipo: formData.clasificacion,
        actividad: finalActividad,
        codigo: finalCodigo,
        origen: 'Censo - CATASTRO',
        departamento: 'CATASTRO',
        fecha_inicio: formData.fechaInicioActividad,
        domicilio_fiscal: `${formData.direccionExacta} (Sector ${formData.sector})`,
        direccion_exacta: formData.direccionExacta,
        is_condominio: formData.isCondominio,
        cantidad_inmuebles: formData.isCondominio ? Number(formData.cantidadInmuebles) || 1 : 1,
        nota: `Catastro: ${codCat} | Terreno: ${formData.metrosTerreno}m² | Const: ${formData.metrosConstruccion}m² | ${formData.nota || ''}`,
        cedula_doc: cedulaDocB64,
        rif_doc: rifDocB64,
        patente_doc: patenteDocB64
      };

      const { error: prErr } = await supabase.from('pre_registros').insert([payload]);

      if (prErr) throw prErr;

      // Registrar auditoría
      try {
        await supabase.from('audit_logs').insert([{
          user_id: 'CATASTRO (dzara)',
          action: 'CENSO_CATASTRO_CREADO',
          details: `Levantamiento catastral registrado para ${fullIdentidad} - ${formData.propietario} (${codCat})`
        }]);
      } catch (logErr) {
        console.warn('Audit opcional:', logErr);
      }

      setShowSuccess(true);
      setFormData({
        identidadTipo: 'V',
        identidadNumero: '',
        propietario: '',
        telefonoPrefijo: '0414',
        telefonoNumero: '',
        correoNombre: '',
        correoDominio: '@gmail.com',
        sector: 'Centro Tucacas',
        direccionExacta: '',
        clasificacion: 'Residencial',
        tipoInmueble: 'Tipo III: Casas',
        actividadComercial: ordenanzaData.actividadesComerciales[0]?.label || '',
        nivelMetraje: '0 - 50 m²',
        fechaInicioActividad: new Date().toISOString().split('T')[0],
        isCondominio: false,
        cantidadInmuebles: 1,
        codigoCatastral: '',
        metrosTerreno: '200',
        metrosConstruccion: '120',
        nota: ''
      });
      setArchivos({ cedula: null, ficha: null, rif: null });

      loadData();
      setTimeout(() => setShowSuccess(false), 4000);
    } catch (err: any) {
      alert('Error registrando censo: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const filtrados = inmuebles.filter(i => {
    if (clasificacion !== 'Todos') {
      const cls = (i.clasificacion || '').toUpperCase();
      if (clasificacion === 'Residencial' && !cls.includes('RESIDENCIAL') && !cls.includes('TIPO')) return false;
      if (clasificacion === 'Comercial' && !cls.includes('COMERCIAL')) return false;
      if (clasificacion === 'Industrial' && !cls.includes('INDUSTRIAL')) return false;
    }
    if (!filtro) return true;
    const q = filtro.toLowerCase();
    return (
      (i.inmueble || '').toLowerCase().includes(q) ||
      (i.contribuyente || '').toLowerCase().includes(q) ||
      (i.identidad || '').toLowerCase().includes(q) ||
      (i.sector || '').toLowerCase().includes(q) ||
      (i.cod_cont || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header y Selector de Modo */}
      <div className="border-b border-stone-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <Compass className="w-7 h-7 text-orange-400" />
            Censo y Registro Inmobiliario - Catastro Municipal
          </h1>
          <p className="text-xs text-stone-400 mt-1">
            Levantamiento predial, fichas catastrales, delimitación geográfica y tributación inmobiliaria en Silva.
          </p>
        </div>

        {/* Botones de Pestañas: Padrón vs. Levantar Censo */}
        <div className="flex bg-stone-950 p-1 rounded-xl border border-stone-800 text-xs">
          <button
            onClick={() => setActiveTab('censo')}
            className={`px-4 py-2 rounded-lg font-bold transition-all flex items-center gap-2 ${
              activeTab === 'censo' ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/30' : 'text-stone-400 hover:text-white'
            }`}
          >
            <Compass className="w-4 h-4" />
            Padrón Catastral ({filtrados.length})
          </button>
          <button
            onClick={() => setActiveTab('nuevo')}
            className={`px-4 py-2 rounded-lg font-bold transition-all flex items-center gap-2 ${
              activeTab === 'nuevo' ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/30' : 'text-stone-400 hover:text-white'
            }`}
          >
            <Plus className="w-4 h-4" />
            Levantar Parcela / Inmueble
          </button>
        </div>
      </div>

      {/* PESTAÑA 1: FORMULARIO DE LEVANTAMIENTO CATASTRAL */}
      {activeTab === 'nuevo' && (
        <div className="bg-stone-950/80 border border-stone-800 rounded-2xl p-6 shadow-2xl space-y-6 animate-in fade-in duration-200">
          <div className="border-b border-stone-800 pb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-black text-white flex items-center gap-2">
                <Landmark className="w-5 h-5 text-orange-400" />
                Formulario de Levantamiento Catastral Predial
              </h2>
              <p className="text-xs text-stone-400 mt-0.5">
                Los datos se interconectan directamente con Aseo Urbano y el Módulo Central de Pre-Registros.
              </p>
            </div>
            <span className="px-3 py-1 rounded-lg text-xs font-mono font-bold bg-orange-950 text-orange-300 border border-orange-800">
              DEPARTAMENTO: CATASTRO
            </span>
          </div>

          {showSuccess && (
            <div className="p-4 bg-emerald-950/80 border border-emerald-800 text-emerald-200 rounded-xl flex items-center gap-2 text-xs font-semibold">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              ¡Inmueble catastrado exitosamente y remitido al padrón general para su liquidación!
            </div>
          )}

          <form onSubmit={handleSaveCenso} className="space-y-5">
            {/* Sección 1: Propietario e Identidad */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-orange-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-stone-800/80 pb-1.5">
                <Users className="w-4 h-4" />
                1. Propietario / Titular del Inmueble
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-stone-400 uppercase mb-1">
                    Cédula / RIF del Titular <span className="text-red-400">*</span>
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={formData.identidadTipo}
                      onChange={e => setFormData({ ...formData, identidadTipo: e.target.value })}
                      className="w-20 px-2 py-2 bg-stone-900 border border-stone-700 rounded-xl text-xs text-white font-bold"
                    >
                      <option value="V">V-</option>
                      <option value="J">J-</option>
                      <option value="E">E-</option>
                      <option value="G">G-</option>
                    </select>
                    <input
                      type="text"
                      placeholder="12345678"
                      maxLength={10}
                      value={formData.identidadNumero}
                      onChange={e => setFormData({ ...formData, identidadNumero: e.target.value.replace(/\D/g, '') })}
                      className="flex-1 px-3 py-2 bg-stone-900 border border-stone-700 rounded-xl text-xs text-white font-mono"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-stone-400 uppercase mb-1">
                    Nombre Completo del Propietario <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Juan Pérez o Inversiones Tucacas C.A."
                    value={formData.propietario}
                    onChange={e => setFormData({ ...formData, propietario: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-900 border border-stone-700 rounded-xl text-xs text-white uppercase"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-stone-400 uppercase mb-1">
                    Teléfono Móvil
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={formData.telefonoPrefijo}
                      onChange={e => setFormData({ ...formData, telefonoPrefijo: e.target.value })}
                      className="w-24 px-2 py-2 bg-stone-900 border border-stone-700 rounded-xl text-xs text-white"
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
                      className="flex-1 px-3 py-2 bg-stone-900 border border-stone-700 rounded-xl text-xs text-white font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Sección 2: Tipología, Metraje y Requerimientos de Aseo Urbano */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-stone-800/80 pb-1.5">
                <Layers className="w-4 h-4" />
                2. Uso del Inmueble, Actividad y Parámetros de Aseo Urbano
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-stone-400 uppercase mb-1">
                    Clasificación del Uso
                  </label>
                  <select
                    value={formData.clasificacion}
                    onChange={e => setFormData({ ...formData, clasificacion: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-900 border border-stone-700 rounded-xl text-xs text-white"
                  >
                    <option value="Residencial">Residencial</option>
                    <option value="Comercial">Comercial</option>
                    <option value="Industrial">Industrial</option>
                  </select>
                </div>

                {formData.clasificacion === 'Residencial' ? (
                  <div>
                    <label className="block text-[11px] font-bold text-stone-400 uppercase mb-1">
                      Tipología Residencial (Ordenanza)
                    </label>
                    <select
                      value={formData.tipoInmueble}
                      onChange={e => setFormData({ ...formData, tipoInmueble: e.target.value })}
                      className="w-full px-3 py-2 bg-stone-900 border border-stone-700 rounded-xl text-xs text-white"
                    >
                      {ordenanzaData.tiposResidenciales.map(t => (
                        <option key={t.label} value={t.label}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-[11px] font-bold text-stone-400 uppercase mb-1">
                      Actividad Comercial / Industrial
                    </label>
                    <select
                      value={formData.actividadComercial}
                      onChange={e => setFormData({ ...formData, actividadComercial: e.target.value })}
                      className="w-full px-3 py-2 bg-stone-900 border border-stone-700 rounded-xl text-xs text-white"
                    >
                      <optgroup label="Actividades Comerciales">
                        {ordenanzaData.actividadesComerciales.map(a => (
                          <option key={`c-${a.label}`} value={a.label}>{a.label}</option>
                        ))}
                      </optgroup>
                      <optgroup label="Actividades Industriales">
                        {ordenanzaData.actividadesIndustriales.map(a => (
                          <option key={`i-${a.label}`} value={a.label}>{a.label}</option>
                        ))}
                      </optgroup>
                    </select>
                  </div>
                )}

                {formData.clasificacion !== 'Residencial' && (
                  <div>
                    <label className="block text-[11px] font-bold text-stone-400 uppercase mb-1">
                      Rango de Metraje Comercial <span className="text-emerald-400 font-bold">(Para Aseo)</span>
                    </label>
                    <select
                      value={formData.nivelMetraje}
                      onChange={e => setFormData({ ...formData, nivelMetraje: e.target.value })}
                      className="w-full px-3 py-2 bg-stone-900 border border-stone-700 rounded-xl text-xs text-white font-semibold"
                    >
                      {ordenanzaData.nivelesMetraje.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-bold text-stone-400 uppercase mb-1">
                    Fecha de Inicio / Ocupación <span className="text-emerald-400 font-bold">(Para Deuda Aseo)</span>
                  </label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input
                      type="date"
                      value={formData.fechaInicioActividad}
                      onChange={e => setFormData({ ...formData, fechaInicioActividad: e.target.value })}
                      className="w-full pl-9 pr-3 py-2 bg-stone-900 border border-stone-700 rounded-xl text-xs text-white font-mono"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Opción Condominio Residencial / Conjunto */}
              <div className="p-3 bg-stone-900/40 border border-stone-800 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-stone-200">¿Es Conjunto Residencial o Edificio de Apartamentos?</span>
                  <p className="text-[11px] text-stone-400">Permite registrar el número de apartamentos/locales de la edificación.</p>
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-stone-300">
                    <input
                      type="checkbox"
                      checked={formData.isCondominio}
                      onChange={e => setFormData({ ...formData, isCondominio: e.target.checked })}
                      className="w-4 h-4 rounded text-orange-600 focus:ring-0 bg-stone-900 border-stone-700"
                    />
                    <span>Sí, condominio</span>
                  </label>
                  {formData.isCondominio && (
                    <input
                      type="number"
                      min="2"
                      max="200"
                      placeholder="N° Inmuebles"
                      value={formData.cantidadInmuebles}
                      onChange={e => setFormData({ ...formData, cantidadInmuebles: Number(e.target.value) })}
                      className="w-24 px-2 py-1 bg-stone-900 border border-stone-700 rounded-lg text-xs text-white font-mono"
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Sección 3: Datos Físicos y Métricos de Catastro */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-orange-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-stone-800/80 pb-1.5">
                <Compass className="w-4 h-4" />
                3. Datos Físicos y Mensura Predial (Exclusivo Catastro)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-stone-400 uppercase mb-1">
                    Código Catastral / Parcela
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. 01-04-12"
                    value={formData.codigoCatastral}
                    onChange={e => setFormData({ ...formData, codigoCatastral: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-900 border border-stone-700 rounded-xl text-xs text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-stone-400 uppercase mb-1">
                    Sector Geográfico
                  </label>
                  <select
                    value={formData.sector}
                    onChange={e => setFormData({ ...formData, sector: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-900 border border-stone-700 rounded-xl text-xs text-white"
                  >
                    <option value="Centro Tucacas">Centro Tucacas</option>
                    <option value="Ramadita">Ramadita</option>
                    <option value="Bomba H">Bomba H</option>
                    <option value="Morrocoy / Marina">Morrocoy / Marina</option>
                    <option value="Araguita">Araguita</option>
                    <option value="Boca de Aroa">Boca de Aroa</option>
                    <option value="Carretera Nacional">Carretera Nacional</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-stone-400 uppercase mb-1">
                    Metros de Terreno (m²)
                  </label>
                  <input
                    type="number"
                    placeholder="200"
                    value={formData.metrosTerreno}
                    onChange={e => setFormData({ ...formData, metrosTerreno: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-900 border border-stone-700 rounded-xl text-xs text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-stone-400 uppercase mb-1">
                    Metros de Construcción (m²)
                  </label>
                  <input
                    type="number"
                    placeholder="120"
                    value={formData.metrosConstruccion}
                    onChange={e => setFormData({ ...formData, metrosConstruccion: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-900 border border-stone-700 rounded-xl text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-400 uppercase mb-1">
                  Dirección Exacta de la Parcela / Inmueble
                </label>
                <input
                  type="text"
                  placeholder="Calle Sucre, entre Av. Silva y Calle Bolívar, Casa N° 12..."
                  value={formData.direccionExacta}
                  onChange={e => setFormData({ ...formData, direccionExacta: e.target.value })}
                  className="w-full px-3 py-2 bg-stone-900 border border-stone-700 rounded-xl text-xs text-white"
                  required
                />
              </div>
            </div>

            {/* Sección 4: Carga de Documentos Digitalizados */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-stone-800/80 pb-1.5">
                <Upload className="w-4 h-4" />
                4. Carga de Documentos Digitalizados (PDF o Imagen)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Cédula del Titular */}
                <div className="p-3 bg-stone-900/60 border border-stone-800 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      Cédula / RIF del Propietario
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
                    className="w-full text-[11px] text-stone-400 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[11px] file:font-semibold file:bg-emerald-600 file:text-white hover:file:bg-emerald-500 cursor-pointer"
                  />
                  {archivos.cedula && (
                    <p className="text-[10px] text-stone-400 truncate">
                      {archivos.cedula.name} ({(archivos.cedula.size / 1024).toFixed(1)} KB)
                    </p>
                  )}
                </div>

                {/* Ficha Catastral o Documento de Propiedad */}
                <div className="p-3 bg-stone-900/60 border border-stone-800 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <FileCheck2 className="w-4 h-4 text-orange-400" />
                      Ficha Catastral / Documento Propiedad
                    </span>
                    {archivos.ficha && (
                      <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
                        Cargada
                      </span>
                    )}
                  </div>
                  <input
                    type="file"
                    accept=".pdf,image/*"
                    onChange={e => handleFileChange('ficha', e.target.files?.[0] || null)}
                    className="w-full text-[11px] text-stone-400 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[11px] file:font-semibold file:bg-orange-600 file:text-white hover:file:bg-orange-500 cursor-pointer"
                  />
                  {archivos.ficha && (
                    <p className="text-[10px] text-stone-400 truncate">
                      {archivos.ficha.name} ({(archivos.ficha.size / 1024).toFixed(1)} KB)
                    </p>
                  )}
                </div>

                {/* RIF o Plano de Mensura */}
                <div className="p-3 bg-stone-900/60 border border-stone-800 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-sky-400" />
                      Plano / Croquis de Mensura
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
                    className="w-full text-[11px] text-stone-400 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[11px] file:font-semibold file:bg-sky-600 file:text-white hover:file:bg-sky-500 cursor-pointer"
                  />
                  {archivos.rif && (
                    <p className="text-[10px] text-stone-400 truncate">
                      {archivos.rif.name} ({(archivos.rif.size / 1024).toFixed(1)} KB)
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Linderos y Observaciones */}
            <div>
              <label className="block text-[11px] font-bold text-stone-400 uppercase mb-1">
                Linderos y Observaciones de Mensura
              </label>
              <textarea
                rows={2}
                placeholder="Norte con calle pública, Sur con parcela vecina, Este, Oeste..."
                value={formData.nota}
                onChange={e => setFormData({ ...formData, nota: e.target.value })}
                className="w-full px-3 py-2 bg-stone-900 border border-stone-700 rounded-xl text-xs text-white"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-stone-800">
              <button
                type="button"
                onClick={() => setActiveTab('censo')}
                className="px-4 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-300 text-xs font-semibold"
              >
                Cancelar y Volver al Padrón
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-orange-600/30 transition-all disabled:opacity-50"
              >
                {isSaving ? <AlertTriangle className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {isSaving ? 'Guardando Levantamiento...' : 'Guardar y Empadronar Parcela'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* PESTAÑA 2: PADRON GENERAL CON FILTROS */}
      {activeTab === 'censo' && (
        <div className="space-y-4">
          {/* Barra de Filtros */}
          <div className="bg-stone-950/80 border border-stone-800 rounded-2xl p-4 flex flex-col md:flex-row gap-4 justify-between items-center shadow-xl">
            <div className="relative w-full md:w-96">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
              <input
                type="text"
                placeholder="Buscar por Código Catastral, Propietario o Sector..."
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-stone-900 border border-stone-800 rounded-xl text-xs text-white placeholder-stone-500 focus:outline-none focus:border-orange-500"
              />
            </div>

            <div className="flex bg-stone-900 p-1 rounded-xl border border-stone-800 text-xs w-full md:w-auto">
              {(['Todos', 'Residencial', 'Comercial', 'Industrial'] as const).map(c => (
                <button
                  key={c}
                  onClick={() => setClasificacion(c)}
                  className={`flex-1 md:flex-none px-4 py-1.5 rounded-lg font-bold transition-all ${
                    clasificacion === c ? 'bg-orange-600 text-white shadow' : 'text-stone-400 hover:text-white'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Tabla del Padrón */}
          <div className="bg-stone-950/80 border border-stone-800 rounded-2xl overflow-hidden shadow-xl">
            {loading ? (
              <div className="p-12 text-center text-stone-500 text-xs">
                Cargando censo inmobiliario...
              </div>
            ) : filtrados.length === 0 ? (
              <div className="p-12 text-center text-stone-500 text-xs">
                No se encontraron parcelas con los filtros seleccionados.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-900/90 text-stone-400 border-b border-stone-800 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="p-3.5">Código Catastral / Inmueble</th>
                      <th className="p-3.5">Propietario</th>
                      <th className="p-3.5">Cédula / RIF</th>
                      <th className="p-3.5">Sector</th>
                      <th className="p-3.5">Clasificación</th>
                      <th className="p-3.5">Área / Metraje</th>
                      <th className="p-3.5 text-center">Estado Ficha</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-800/60 font-medium">
                    {filtrados.map((inm) => (
                      <tr key={inm.id} className="hover:bg-stone-900/50 transition-colors">
                        <td className="p-3.5 font-mono text-orange-400 font-bold">
                          {inm.inmueble || inm.cod_cont || 'PARCELA'}
                        </td>
                        <td className="p-3.5 text-white font-bold max-w-xs truncate">
                          {inm.contribuyente}
                        </td>
                        <td className="p-3.5 font-mono text-stone-300">
                          {inm.identidad}
                        </td>
                        <td className="p-3.5 text-stone-400">
                          {inm.sector || 'Tucacas'}
                        </td>
                        <td className="p-3.5">
                          <span className="px-2 py-0.5 rounded bg-stone-900 border border-stone-800 text-[10px] text-orange-300 font-semibold">
                            {inm.clasificacion || 'Residencial'}
                          </span>
                        </td>
                        <td className="p-3.5 text-stone-400 font-mono text-[11px]">
                          {inm.area ? `${inm.area} m²` : 'N/D'}
                        </td>
                        <td className="p-3.5 text-center">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-950/60 text-emerald-300 border border-emerald-800/80 text-[10px] font-semibold">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            Censado
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
