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
  BadgePercent
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
  const [formData, setFormData] = useState({
    identidadTipo: 'V',
    identidadNumero: '',
    propietario: '',
    telefonoPrefijo: '0414',
    telefonoNumero: '',
    codigoCatastral: '',
    sector: 'Centro Tucacas',
    direccionExacta: '',
    clasificacion: 'Residencial',
    tipoInmueble: 'Tipo III: Casas',
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

      // Guardar en pre_registros con origen Censo - CATASTRO
      const { error: prErr } = await supabase.from('pre_registros').insert([{
        identidad: fullIdentidad,
        contribuyente: formData.propietario.trim(),
        registro: fullTelefono,
        tipo: formData.clasificacion,
        actividad: formData.tipoInmueble,
        codigo: formData.tipoInmueble,
        origen: 'Censo - CATASTRO',
        departamento: 'CATASTRO',
        domicilio_fiscal: `${formData.direccionExacta} (Sector ${formData.sector})`,
        direccion_exacta: formData.direccionExacta,
        nota: `Catastro: ${codCat} | Terreno: ${formData.metrosTerreno}m² | Const: ${formData.metrosConstruccion}m² | ${formData.nota || ''}`
      }]);

      if (prErr) throw prErr;

      // Registrar auditoría
      try {
        await supabase.from('audit_logs').insert([{
          user_id: 'CATASTRO (dzara)',
          action: 'CENSO_CATASTRO_CREADO',
          details: `Levantamiento catastral para ${fullIdentidad} - ${formData.propietario} [${codCat}]`
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
        codigoCatastral: '',
        sector: 'Centro Tucacas',
        direccionExacta: '',
        clasificacion: 'Residencial',
        tipoInmueble: 'Tipo III: Casas',
        metrosTerreno: '200',
        metrosConstruccion: '120',
        nota: ''
      });

      // Recargar datos
      loadData();
      setTimeout(() => setShowSuccess(false), 4000);
    } catch (err: any) {
      alert('Error registrando censo: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const filtrados = inmuebles.filter(i => {
    const cls = (i.clasificacion || '').toUpperCase();
    if (clasificacion === 'Residencial' && !cls.includes('RESIDENCIAL') && !cls.includes('TIPO A') && !cls.includes('TIPO C')) return false;
    if (clasificacion === 'Comercial' && !cls.includes('COMERCIAL') && !cls.includes('TIPO D') && !cls.includes('TIPO B')) return false;
    if (clasificacion === 'Industrial' && !cls.includes('INDUSTRIAL')) return false;

    if (!filtro) return true;
    const q = filtro.toLowerCase();
    return (
      (i.contribuyente || '').toLowerCase().includes(q) ||
      (i.identidad || '').toLowerCase().includes(q) ||
      (i.inmueble || '').toLowerCase().includes(q) ||
      (i.cod_cont || '').toLowerCase().includes(q) ||
      (i.sector || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header y Selector de Modo */}
      <div className="border-b border-stone-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <Compass className="w-7 h-7 text-orange-400" />
            Censo Inmobiliario y Catastral - Municipio Silva
          </h1>
          <p className="text-xs text-stone-400 mt-1">
            Levantamiento de parcelas urbanas, asignación de códigos catastrales y medición física en Silva.
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
            <Users className="w-4 h-4" />
            Padrón Catastral ({filtrados.length})
          </button>
          <button
            onClick={() => setActiveTab('nuevo')}
            className={`px-4 py-2 rounded-lg font-bold transition-all flex items-center gap-2 ${
              activeTab === 'nuevo' ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/30' : 'text-stone-400 hover:text-white'
            }`}
          >
            <Plus className="w-4 h-4" />
            Levantar Nuevo Censo Catastral
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
                Formulario de Empadronamiento y Mensura Catastral
              </h2>
              <p className="text-xs text-stone-400 mt-0.5">
                Registra la parcela física, metraje de terreno y construcción con vinculación directa al departamento de Catastro.
              </p>
            </div>
            <span className="px-3 py-1 rounded-lg text-xs font-mono font-bold bg-orange-950 text-orange-300 border border-orange-800">
              DEPARTAMENTO: CATASTRO
            </span>
          </div>

          {showSuccess && (
            <div className="p-4 bg-emerald-950/80 border border-emerald-800 text-emerald-200 rounded-xl flex items-center gap-2 text-xs font-semibold">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              ¡Inmueble y levantamiento catastral guardado con éxito en pre-registros!
            </div>
          )}

          <form onSubmit={handleSaveCenso} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-stone-400 uppercase mb-1">
                  Cédula / RIF del Propietario <span className="text-red-400">*</span>
                </label>
                <div className="flex gap-2">
                  <select
                    value={formData.identidadTipo}
                    onChange={e => setFormData({ ...formData, identidadTipo: e.target.value })}
                    className="w-20 px-2 py-2 bg-stone-900 border border-stone-700 rounded-xl text-xs text-white font-bold"
                  >
                    <option value="V">V-</option>
                    <option value="E">E-</option>
                    <option value="J">J-</option>
                    <option value="G">G-</option>
                  </select>
                  <input
                    type="text"
                    placeholder="14537488"
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
                  Nombre Completo / Razón Social <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ej. JUAN CARLOS PÉREZ"
                  value={formData.propietario}
                  onChange={e => setFormData({ ...formData, propietario: e.target.value })}
                  className="w-full px-3 py-2 bg-stone-900 border border-stone-700 rounded-xl text-xs text-white uppercase"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-400 uppercase mb-1">
                  Código Catastral (Asignado o Sugerido)
                </label>
                <input
                  type="text"
                  placeholder="Ej. 01-05-57-05"
                  value={formData.codigoCatastral}
                  onChange={e => setFormData({ ...formData, codigoCatastral: e.target.value })}
                  className="w-full px-3 py-2 bg-stone-900 border border-stone-700 rounded-xl text-xs text-orange-400 font-mono font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-stone-400 uppercase mb-1">
                  Destino del Inmueble
                </label>
                <select
                  value={formData.clasificacion}
                  onChange={e => setFormData({ ...formData, clasificacion: e.target.value })}
                  className="w-full px-3 py-2 bg-stone-900 border border-stone-700 rounded-xl text-xs text-white"
                >
                  <option value="Residencial">Residencial</option>
                  <option value="Comercial">Comercial</option>
                  <option value="Industrial">Industrial</option>
                  <option value="Terreno / Sin Construcción">Terreno / Sin Construcción</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-400 uppercase mb-1">
                  Tipología Constructiva / Actividad
                </label>
                <select
                  value={formData.tipoInmueble}
                  onChange={e => setFormData({ ...formData, tipoInmueble: e.target.value })}
                  className="w-full px-3 py-2 bg-stone-900 border border-stone-700 rounded-xl text-xs text-white"
                >
                  <optgroup label="Tipologías Residenciales">
                    {ordenanzaData.tiposResidenciales.map(t => (
                      <option key={t.label} value={t.label}>{t.label}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Actividades Comerciales">
                    {ordenanzaData.actividadesComerciales.map(a => (
                      <option key={`cat-com-${a.label}`} value={a.label}>{a.label}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Actividades Industriales">
                    {ordenanzaData.actividadesIndustriales.map(a => (
                      <option key={`cat-ind-${a.label}`} value={a.label}>{a.label}</option>
                    ))}
                  </optgroup>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-400 uppercase mb-1">
                  Sector de Ubicación
                </label>
                <select
                  value={formData.sector}
                  onChange={e => setFormData({ ...formData, sector: e.target.value })}
                  className="w-full px-3 py-2 bg-stone-900 border border-stone-700 rounded-xl text-xs text-white"
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-stone-400 uppercase mb-1">
                  Metros Cuadrados de Terreno (m²)
                </label>
                <input
                  type="number"
                  placeholder="200"
                  value={formData.metrosTerreno}
                  onChange={e => setFormData({ ...formData, metrosTerreno: e.target.value })}
                  className="w-full px-3 py-2 bg-stone-900 border border-stone-700 rounded-xl text-xs text-white font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-400 uppercase mb-1">
                  Metros Cuadrados de Construcción (m²)
                </label>
                <input
                  type="number"
                  placeholder="120"
                  value={formData.metrosConstruccion}
                  onChange={e => setFormData({ ...formData, metrosConstruccion: e.target.value })}
                  className="w-full px-3 py-2 bg-stone-900 border border-stone-700 rounded-xl text-xs text-white font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-400 uppercase mb-1">
                  Teléfono de Contacto
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

            <div>
              <label className="block text-[11px] font-bold text-stone-400 uppercase mb-1">
                Dirección Exacta de la Parcela
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
                        <td className="p-3.5 font-mono text-stone-300 font-bold">
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
                          {inm.area ? `${inm.area} m²` : 'N/A'}
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
