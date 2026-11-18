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
  Briefcase
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { ordenanzaData } from '@/data/ordenanza';
import { tarifasHaciendaCatastro } from '@/data/ordenanza';

export default function CensoHaciendaPage() {
  const [activeTab, setActiveTab] = useState<'censo' | 'nuevo'>('censo');
  const [inmuebles, setInmuebles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('');
  const [clasificacion, setClasificacion] = useState<'Todos' | 'Comercial' | 'Industrial'>('Todos');

  // Formulario de Levantamiento de Censo Comercial / Industrial
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
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
    sector: 'Centro Tucacas',
    clasificacion: 'Comercial',
    actividadEconomica: 'Comercio al por menor de alimentos y víveres',
    numeroPatente: '',
    alicuotaEstimada: '1.5',
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

  const handleSaveCenso = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.identidadNumero.trim() || !formData.razonSocial.trim()) {
      return alert('Debe completar el RIF y la Razón Social de la empresa.');
    }

    setIsSaving(true);
    try {
      const fullIdentidad = `${formData.identidadTipo}-${formData.identidadNumero.trim()}`;
      const fullTelefono = `${formData.telefonoPrefijo}${formData.telefonoNumero.trim()}`;
      const fullCorreo = `${formData.correoNombre.trim()}${formData.correoDominio}`;
      const finalContribuyente = formData.nombreComercial.trim()
        ? `${formData.razonSocial.trim()} | Comercial: ${formData.nombreComercial.trim()}`
        : formData.razonSocial.trim();

      // Guardar en pre_registros con origen Censo - HACIENDA
      const { error: prErr } = await supabase.from('pre_registros').insert([{
        identidad: fullIdentidad,
        contribuyente: finalContribuyente,
        registro: fullTelefono,
        tipo: formData.clasificacion,
        actividad: formData.actividadEconomica,
        codigo: formData.numeroPatente ? `Patente: ${formData.numeroPatente}` : 'Sin Patente',
        origen: 'Censo - HACIENDA',
        departamento: 'HACIENDA',
        domicilio_fiscal: `${formData.domicilioFiscal} (Sector ${formData.sector})`,
        direccion_exacta: formData.domicilioFiscal,
        nota: `Hacienda: Censo de Actividad Económica | Alícuota Est: ${formData.alicuotaEstimada}% | ${formData.nota || ''}`
      }]);

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
        sector: 'Centro Tucacas',
        clasificacion: 'Comercial',
        actividadEconomica: 'Comercio al por menor de alimentos y víveres',
        numeroPatente: '',
        alicuotaEstimada: '1.5',
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

  const inmueblesFiltrados = inmuebles.filter(i => {
    const cls = (i.clasificacion || '').toUpperCase();
    const esComercial = cls.includes('COMERCIAL') || cls.includes('TIPO D') || cls.includes('TIPO B') || cls.includes('TIPO C');
    const esIndustrial = cls.includes('INDUSTRIAL');

    if (clasificacion === 'Comercial' && !esComercial) return false;
    if (clasificacion === 'Industrial' && !esIndustrial) return false;
    if (clasificacion === 'Todos' && !esComercial && !esIndustrial) return false;

    if (!filtro) return true;
    const q = filtro.toLowerCase();
    return (
      (i.contribuyente || '').toLowerCase().includes(q) ||
      (i.identidad || '').toLowerCase().includes(q) ||
      (i.sector || '').toLowerCase().includes(q) ||
      (i.actividad_principal || '').toLowerCase().includes(q) ||
      (i.patente || '').toLowerCase().includes(q)
    );
  });

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
            Empadronamiento de establecimientos comerciales, industrias, patentes y actividades económicas en Silva.
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
                Los datos censados se enviarán directamente al padrón central de pre-registros con asignación al departamento de Hacienda.
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

          <form onSubmit={handleSaveCenso} className="space-y-4">
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                  Clasificación Tributaria
                </label>
                <select
                  value={formData.clasificacion}
                  onChange={e => setFormData({ ...formData, clasificacion: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
                >
                  <option value="Comercial">Comercial</option>
                  <option value="Industrial">Industrial</option>
                  <option value="Servicios / Mixto">Servicios / Mixto</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                  Actividad Económica Principal
                </label>
                <select
                  value={formData.actividadEconomica}
                  onChange={e => setFormData({ ...formData, actividadEconomica: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
                >
                  {tarifasHaciendaCatastro.hacienda.alicuotasISAE.map(a => (
                    <option key={a.sector} value={a.sector}>{a.sector} ({a.alicuota}%)</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                  N° de Patente Asignada (Si posee)
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

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                Dirección / Domicilio Fiscal Exacto
              </label>
              <input
                type="text"
                placeholder="Avenida Principal, Local N° 4, frente a la plaza..."
                value={formData.domicilioFiscal}
                onChange={e => setFormData({ ...formData, domicilioFiscal: e.target.value })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                Observaciones del Levantamiento
              </label>
              <textarea
                rows={2}
                placeholder="Detalles sobre metraje, inventario visible, letrero publicitario o estatus fiscal..."
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
