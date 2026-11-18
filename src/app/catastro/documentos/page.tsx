'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Compass, 
  Search, 
  Download, 
  Eye, 
  CheckCircle2, 
  Building2, 
  Home, 
  MapPin, 
  ExternalLink,
  X,
  FileCheck,
  FileSpreadsheet,
  Edit,
  Save,
  Upload,
  Plus,
  Paperclip,
  AlertCircle,
  FileText
} from 'lucide-react';
import { ordenanzaData } from '@/data/ordenanza';

interface FichaDocItem {
  id: string | number;
  inmueble_codigo: string;
  identidad: string;
  propietario: string;
  tipo: string;
  sector?: string;
  direccion?: string;
  origen: string;
  codigo_catastral?: string;
  tiene_archivo: boolean;
  archivo_url?: string;
  fecha_registro?: string;
  rawInmueble?: any;
}

export default function DocumentosCatastroPage() {
  const [fichas, setFichas] = useState<FichaDocItem[]>([]);
  const [inmueblesList, setInmueblesList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<'Todos' | 'Digitalizados' | 'ConCodigoCatastral' | 'SoloPlanos'>('Todos');
  const [clasificacionFiltro, setClasificacionFiltro] = useState<'Todos' | 'Residencial' | 'Comercial' | 'Industrial'>('Todos');
  const [modalDoc, setModalDoc] = useState<FichaDocItem | null>(null);

  // Modal para Editar Parcela / Propietario y Cargar Archivos Catastrales
  const [editingParcela, setEditingParcela] = useState<any | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Formulario de edición
  const [editForm, setEditForm] = useState({
    identidad: '',
    propietario: '',
    codigo_catastral: '',
    clasificacion: 'Residencial',
    tipo: 'Tipo III: Casas',
    area: '',
    telefono: '',
    direccion: '',
    sector: 'Centro Tucacas'
  });

  // Archivo a cargar en el modal
  const [selectedDocType, setSelectedDocType] = useState<string>('Plano de Mensura / Topográfico');
  const [newFile, setNewFile] = useState<File | null>(null);
  const [existingUserDocs, setExistingUserDocs] = useState<any[]>([]);
  const [loadingUserDocs, setLoadingUserDocs] = useState(false);

  useEffect(() => {
    cargarFichas();
  }, []);

  const toBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const cargarFichas = async () => {
    setLoading(true);
    try {
      const items: FichaDocItem[] = [];

      // 1. Cargar documentos de la tabla `documentos` que correspondan a Catastro (planos, títulos, fichas)
      const { data: dbDocs } = await supabase
        .from('documentos')
        .select('*')
        .order('id', { ascending: false });

      if (dbDocs) {
        dbDocs.forEach((d: any) => {
          if (
            d.tipo?.toLowerCase().includes('plano') || 
            d.tipo?.toLowerCase().includes('catastr') || 
            d.tipo?.toLowerCase().includes('propiedad') || 
            d.tipo?.toLowerCase().includes('mensura') ||
            d.tipo?.toLowerCase().includes('lindero') ||
            d.tipo?.toLowerCase().includes('título')
          ) {
            items.push({
              id: `dbdoc-${d.id}`,
              inmueble_codigo: `PARC-${d.id}`,
              identidad: d.identidad || 'S/I',
              propietario: d.contribuyente || 'Propietario',
              tipo: d.tipo?.toLowerCase().includes('comercial') ? 'Comercial' : 'Residencial',
              origen: 'Expediente Físico Catastro',
              codigo_catastral: d.tipo,
              tiene_archivo: !!d.documento,
              archivo_url: d.documento,
              fecha_registro: d.fecha || (d.created_at ? new Date(d.created_at).toLocaleDateString('es-VE') : undefined)
            });
          }
        });
      }

      // 2. Cargar pre_registros censados con ficha de catastro en la nota o con documentos
      const { data: prData } = await supabase
        .from('pre_registros')
        .select('id, identidad, contribuyente, tipo, origen, nota, domicilio_fiscal, direccion_exacta, rif_doc, cedula_doc, patente_doc, created_at')
        .ilike('nota', '%catastro%')
        .limit(200);

      if (prData) {
        prData.forEach((pr: any) => {
          let codCat = '';
          const match = pr.nota?.match(/Catastro:\s*([0-9A-Za-z\-_]+)/i);
          if (match && match[1]) {
            codCat = match[1];
          }

          items.push({
            id: `pr-cat-${pr.id}`,
            inmueble_codigo: codCat || `PR-${pr.id}`,
            identidad: pr.identidad || 'S/I',
            propietario: pr.contribuyente || 'Propietario Inmueble',
            tipo: pr.tipo || 'Residencial',
            sector: pr.domicilio_fiscal || pr.direccion_exacta,
            direccion: pr.direccion_exacta || pr.domicilio_fiscal,
            origen: 'Censo Catastral Municipal',
            codigo_catastral: codCat,
            tiene_archivo: !!(pr.rif_doc || pr.cedula_doc || pr.patente_doc),
            archivo_url: pr.rif_doc || pr.cedula_doc || pr.patente_doc,
            fecha_registro: pr.created_at ? new Date(pr.created_at).toLocaleDateString('es-VE') : undefined
          });
        });
      }

      // 3. Cargar inmuebles desde la tabla inmuebles
      const { data: inmsDoc } = await supabase
        .from('inmuebles')
        .select('*')
        .order('inmueble', { ascending: true });

      if (inmsDoc) {
        setInmueblesList(inmsDoc);
        inmsDoc.forEach((inm: any) => {
          const hasFile = !!(inm.doc_ficha_url || inm.doc_registro_url || inm.doc_cedula_url);
          if (hasFile || inm.inmueble) {
            items.push({
              id: `inm-ficha-${inm.id}`,
              inmueble_codigo: inm.inmueble || inm.cod_cont || `INM-${inm.id}`,
              identidad: inm.identidad || 'S/I',
              propietario: inm.contribuyente || 'Propietario',
              tipo: inm.clasificacion || 'Residencial',
              sector: inm.sector,
              direccion: inm.direccion,
              origen: 'Padrón Catastral Predial',
              codigo_catastral: inm.inmueble,
              tiene_archivo: hasFile,
              archivo_url: inm.doc_ficha_url || inm.doc_registro_url || inm.doc_cedula_url,
              fecha_registro: inm.created_at ? new Date(inm.created_at).toLocaleDateString('es-VE') : undefined,
              rawInmueble: inm
            });
          }
        });
      }

      setFichas(items);
    } catch (e) {
      console.error('Error cargando fichas:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleDescargar = (f: FichaDocItem) => {
    if (!f.archivo_url) return;
    const a = document.createElement('a');
    a.href = f.archivo_url;
    a.download = `Catastro_${f.inmueble_codigo}_${f.identidad}_${f.propietario.replace(/[^a-zA-Z0-9]/g, '_')}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Abrir Modal de Edición de Parcela / Propietario
  const handleOpenEdit = async (ficha: FichaDocItem) => {
    const inm = ficha.rawInmueble || inmueblesList.find(i => i.identidad === ficha.identidad || i.inmueble === ficha.inmueble_codigo) || {
      id: ficha.id,
      identidad: ficha.identidad,
      contribuyente: ficha.propietario,
      inmueble: ficha.codigo_catastral || ficha.inmueble_codigo,
      clasificacion: ficha.tipo || 'Residencial'
    };

    setEditingParcela(inm);
    setEditForm({
      identidad: inm.identidad || ficha.identidad || '',
      propietario: inm.contribuyente || ficha.propietario || '',
      codigo_catastral: inm.inmueble || ficha.codigo_catastral || ficha.inmueble_codigo || '',
      clasificacion: inm.clasificacion || ficha.tipo || 'Residencial',
      tipo: inm.tipo || 'Tipo III: Casas',
      area: inm.area ? inm.area.toString() : '',
      telefono: inm.telefono || '',
      direccion: inm.direccion || ficha.direccion || '',
      sector: inm.sector || ficha.sector || 'Centro Tucacas'
    });
    setNewFile(null);
    setSaveSuccess(false);

    // Cargar todos los documentos de este inmueble/propietario
    await cargarDocumentosDeParcela(inm.identidad || ficha.identidad);
  };

  const cargarDocumentosDeParcela = async (identidad: string) => {
    setLoadingUserDocs(true);
    try {
      const userDocs: any[] = [];

      // 1. Desde la tabla documentos
      const { data: dDocs } = await supabase
        .from('documentos')
        .select('*')
        .eq('identidad', identidad);
      if (dDocs) userDocs.push(...dDocs);

      // 2. Desde pre_registros
      const { data: prs } = await supabase
        .from('pre_registros')
        .select('id, identidad, contribuyente, rif_doc, cedula_doc, patente_doc, created_at')
        .eq('identidad', identidad);
      if (prs) {
        prs.forEach((pr: any) => {
          if (pr.rif_doc) userDocs.push({ id: `pr-rif-${pr.id}`, tipo: 'RIF / Croquis', documento: pr.rif_doc, fecha: pr.created_at?.split('T')[0] });
          if (pr.cedula_doc) userDocs.push({ id: `pr-ced-${pr.id}`, tipo: 'Cédula Propietario', documento: pr.cedula_doc, fecha: pr.created_at?.split('T')[0] });
          if (pr.patente_doc) userDocs.push({ id: `pr-pat-${pr.id}`, tipo: 'Ficha / Documento', documento: pr.patente_doc, fecha: pr.created_at?.split('T')[0] });
        });
      }

      setExistingUserDocs(userDocs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingUserDocs(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingParcela) return;
    setIsSaving(true);
    try {
      // 1. Actualizar datos en inmuebles si existe ID numérico
      if (typeof editingParcela.id === 'number') {
        const { error: updErr } = await supabase
          .from('inmuebles')
          .update({
            contribuyente: editForm.propietario,
            identidad: editForm.identidad,
            inmueble: editForm.codigo_catastral,
            clasificacion: editForm.clasificacion,
            tipo: editForm.tipo,
            area: editForm.area ? parseFloat(editForm.area) : null,
            telefono: editForm.telefono,
            direccion: editForm.direccion,
            sector: editForm.sector
          })
          .eq('id', editingParcela.id);

        if (updErr) throw updErr;
      }

      // 2. Si se seleccionó un archivo nuevo (plano, ficha, documento), guardarlo
      if (newFile) {
        const fileBase64 = await toBase64(newFile);
        const { error: insErr } = await supabase.from('documentos').insert([{
          documento: fileBase64,
          tipo: selectedDocType,
          fecha: new Date().toISOString().split('T')[0],
          contribuyente: editForm.propietario,
          identidad: editForm.identidad,
          estado: 'Vigente'
        }]);

        if (insErr) throw insErr;

        // Si es ficha catastral o título, almacenar también en inmuebles
        if (typeof editingParcela.id === 'number') {
          if (selectedDocType.includes('Ficha') || selectedDocType.includes('Plano')) {
            await supabase.from('inmuebles').update({ doc_ficha_url: fileBase64 }).eq('id', editingParcela.id);
          } else if (selectedDocType.includes('Título') || selectedDocType.includes('Propiedad')) {
            await supabase.from('inmuebles').update({ doc_registro_url: fileBase64 }).eq('id', editingParcela.id);
          } else if (selectedDocType.includes('Cédula')) {
            await supabase.from('inmuebles').update({ doc_cedula_url: fileBase64 }).eq('id', editingParcela.id);
          }
        }
      }

      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        setEditingParcela(null);
        cargarFichas();
      }, 1500);
    } catch (err: any) {
      alert('Error guardando parcela: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const filtradas = fichas.filter(f => {
    if (filtroTipo === 'Digitalizados' && !f.tiene_archivo) return false;
    if (filtroTipo === 'ConCodigoCatastral' && !f.codigo_catastral) return false;
    if (filtroTipo === 'SoloPlanos' && !f.origen?.toLowerCase().includes('plano') && !f.codigo_catastral?.toLowerCase().includes('plano')) return false;

    if (clasificacionFiltro === 'Residencial' && !f.tipo.toUpperCase().includes('RESIDENCIAL') && !f.tipo.toUpperCase().includes('TIPO A')) return false;
    if (clasificacionFiltro === 'Comercial' && !f.tipo.toUpperCase().includes('COMERCIAL') && !f.tipo.toUpperCase().includes('TIPO D') && !f.tipo.toUpperCase().includes('TIPO B') && !f.tipo.toUpperCase().includes('TIPO C')) return false;
    if (clasificacionFiltro === 'Industrial' && !f.tipo.toUpperCase().includes('INDUSTRIAL')) return false;

    if (!filtro) return true;
    const q = filtro.toLowerCase();
    return (
      f.propietario.toLowerCase().includes(q) ||
      f.identidad.toLowerCase().includes(q) ||
      f.inmueble_codigo.toLowerCase().includes(q) ||
      (f.codigo_catastral && f.codigo_catastral.toLowerCase().includes(q)) ||
      (f.sector && f.sector.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="border-b border-stone-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <Compass className="w-7 h-7 text-orange-400" />
            Planos, Fichas y Títulos Catastrales - Municipio Silva
          </h1>
          <p className="text-xs text-stone-400 mt-1">
            Archivo técnico inmobiliario: planos de mensura, poligonales, fichas catastrales y títulos de propiedad en Tucacas.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-xl bg-stone-900 border border-stone-800 text-xs font-bold text-stone-300">
            Total Inmuebles: <span className="text-orange-400 font-mono">{filtradas.length}</span>
          </span>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="bg-stone-950/80 border border-stone-800 rounded-2xl p-4 flex flex-col md:flex-row gap-4 justify-between items-center shadow-xl">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
          <input
            type="text"
            placeholder="Buscar por Código Catastral, Propietario o Cédula/RIF..."
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-stone-900 border border-stone-800 rounded-xl text-xs text-white placeholder-stone-500 focus:outline-none focus:border-orange-500"
          />
        </div>

        <div className="flex flex-wrap gap-2 w-full md:w-auto items-center">
          <div className="flex bg-stone-900 p-1 rounded-xl border border-stone-800 text-xs">
            {(['Todos', 'Digitalizados', 'ConCodigoCatastral', 'SoloPlanos'] as const).map(t => (
              <button
                key={t}
                onClick={() => setFiltroTipo(t)}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  filtroTipo === t ? 'bg-orange-600 text-white shadow' : 'text-stone-400 hover:text-white'
                }`}
              >
                {t === 'Digitalizados' ? 'Digitalizados' : t === 'ConCodigoCatastral' ? 'Con Código' : t === 'SoloPlanos' ? 'Planos' : t}
              </button>
            ))}
          </div>

          <div className="flex bg-stone-900 p-1 rounded-xl border border-stone-800 text-xs">
            {(['Todos', 'Residencial', 'Comercial', 'Industrial'] as const).map(c => (
              <button
                key={c}
                onClick={() => setClasificacionFiltro(c)}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  clasificacionFiltro === c ? 'bg-orange-600 text-white shadow' : 'text-stone-400 hover:text-white'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tabla de Fichas y Documentos */}
      <div className="bg-stone-950/80 border border-stone-800 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-12 text-center text-stone-500 text-xs">
            Cargando archivo catastral y planos municipales...
          </div>
        ) : filtradas.length === 0 ? (
          <div className="p-12 text-center text-stone-500 text-xs">
            No se encontraron parcelas o documentos catastrales con los filtros seleccionados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-900/90 text-stone-400 border-b border-stone-800 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-3.5">Código Catastral / Inmueble</th>
                  <th className="p-3.5">Propietario / Titular</th>
                  <th className="p-3.5">Cédula / RIF</th>
                  <th className="p-3.5">Clasificación</th>
                  <th className="p-3.5">Origen Archivo</th>
                  <th className="p-3.5 text-center">Estado Documentación</th>
                  <th className="p-3.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800/60 font-medium">
                {filtradas.map((f) => (
                  <tr key={f.id} className="hover:bg-stone-900/50 transition-colors">
                    <td className="p-3.5 font-mono text-orange-400 font-bold">
                      {f.inmueble_codigo}
                    </td>
                    <td className="p-3.5 text-white font-bold max-w-xs truncate">
                      {f.propietario}
                    </td>
                    <td className="p-3.5 font-mono text-stone-300">
                      {f.identidad}
                    </td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded bg-stone-900 border border-stone-800 text-[10px] text-orange-300 font-semibold">
                        {f.tipo}
                      </span>
                    </td>
                    <td className="p-3.5 text-stone-400 text-[11px]">
                      {f.origen}
                    </td>
                    <td className="p-3.5 text-center">
                      {f.tiene_archivo ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-950/60 text-emerald-300 border border-emerald-800/80 text-[10px] font-semibold">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          Digitalizado
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-stone-900 text-stone-400 border border-stone-800 text-[10px]">
                          Ficha Física
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 text-right space-x-1.5 whitespace-nowrap">
                      {/* Botón Editar Parcela y Cargar Archivo */}
                      <button
                        onClick={() => handleOpenEdit(f)}
                        className="px-2.5 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-bold text-[11px] shadow transition-colors inline-flex items-center gap-1"
                        title="Editar Datos Inmobiliarios y Cargar Planos"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        Editar / Cargar
                      </button>

                      {f.tiene_archivo && (
                        <>
                          <button
                            onClick={() => setModalDoc(f)}
                            className="p-1.5 rounded-lg bg-orange-950/60 hover:bg-orange-900 text-orange-300 border border-orange-800/60 transition-colors"
                            title="Previsualizar plano / ficha"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDescargar(f)}
                            className="p-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-300 border border-stone-700 transition-colors"
                            title="Descargar documento"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL 1: EDITAR PARCELA Y CARGAR PLANOS */}
      {editingParcela && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-stone-950 border border-stone-800 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            {/* Header del Modal */}
            <div className="p-4 border-b border-stone-800 flex items-center justify-between bg-stone-900/80">
              <div className="flex items-center gap-3">
                <Edit className="w-5 h-5 text-orange-400" />
                <div>
                  <h3 className="font-bold text-white text-sm">
                    Editar Parcela Catastral y Cargar Planos - {editForm.propietario}
                  </h3>
                  <p className="text-[10px] text-stone-400 font-mono">
                    Código: {editForm.codigo_catastral || 'Sin asignar'} • Titular: {editForm.identidad}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingParcela(null)}
                className="p-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Contenido con scroll */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {saveSuccess && (
                <div className="p-3 bg-emerald-950 border border-emerald-800 text-emerald-200 rounded-xl text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ¡Datos prediales y planos actualizados con éxito en Catastro!
                </div>
              )}

              <form onSubmit={handleSaveEdit} className="space-y-5">
                {/* 1. Datos Físicos y Catastrales */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-orange-400 uppercase tracking-wider border-b border-stone-800 pb-1">
                    1. Datos de Identificación y Mensura Predial
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Cédula / RIF</label>
                      <input
                        type="text"
                        value={editForm.identidad}
                        onChange={e => setEditForm({ ...editForm, identidad: e.target.value })}
                        className="w-full px-3 py-1.5 bg-stone-900 border border-stone-700 rounded-lg text-xs text-white font-mono"
                        required
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Nombre del Propietario</label>
                      <input
                        type="text"
                        value={editForm.propietario}
                        onChange={e => setEditForm({ ...editForm, propietario: e.target.value })}
                        className="w-full px-3 py-1.5 bg-stone-900 border border-stone-700 rounded-lg text-xs text-white uppercase"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Código Catastral</label>
                      <input
                        type="text"
                        placeholder="Ej. 01-04-12"
                        value={editForm.codigo_catastral}
                        onChange={e => setEditForm({ ...editForm, codigo_catastral: e.target.value })}
                        className="w-full px-3 py-1.5 bg-stone-900 border border-stone-700 rounded-lg text-xs text-white font-mono"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Clasificación de Uso</label>
                      <select
                        value={editForm.clasificacion}
                        onChange={e => setEditForm({ ...editForm, clasificacion: e.target.value })}
                        className="w-full px-3 py-1.5 bg-stone-900 border border-stone-700 rounded-lg text-xs text-white"
                      >
                        <option value="Residencial">Residencial</option>
                        <option value="Comercial">Comercial</option>
                        <option value="Industrial">Industrial</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Sector Geográfico</label>
                      <select
                        value={editForm.sector}
                        onChange={e => setEditForm({ ...editForm, sector: e.target.value })}
                        className="w-full px-3 py-1.5 bg-stone-900 border border-stone-700 rounded-lg text-xs text-white"
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
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Tipología Constructiva / Destino</label>
                      <input
                        type="text"
                        value={editForm.tipo}
                        onChange={e => setEditForm({ ...editForm, tipo: e.target.value })}
                        className="w-full px-3 py-1.5 bg-stone-900 border border-stone-700 rounded-lg text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Área de Terreno ($m^2$)</label>
                      <input
                        type="number"
                        placeholder="Ej. 250"
                        value={editForm.area}
                        onChange={e => setEditForm({ ...editForm, area: e.target.value })}
                        className="w-full px-3 py-1.5 bg-stone-900 border border-stone-700 rounded-lg text-xs text-white font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Teléfono</label>
                      <input
                        type="text"
                        value={editForm.telefono}
                        onChange={e => setEditForm({ ...editForm, telefono: e.target.value })}
                        className="w-full px-3 py-1.5 bg-stone-900 border border-stone-700 rounded-lg text-xs text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Dirección Exacta de Parcela</label>
                      <input
                        type="text"
                        value={editForm.direccion}
                        onChange={e => setEditForm({ ...editForm, direccion: e.target.value })}
                        className="w-full px-3 py-1.5 bg-stone-900 border border-stone-700 rounded-lg text-xs text-white"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Carga de Planos y Documentos Catastrales */}
                <div className="space-y-3 p-4 bg-orange-950/20 border border-orange-900/60 rounded-xl">
                  <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-orange-800/40 pb-1">
                    <Upload className="w-4 h-4" />
                    2. Cargar Plano de Mensura o Documento Catastral
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Tipo de Archivo Técnico</label>
                      <select
                        value={selectedDocType}
                        onChange={e => setSelectedDocType(e.target.value)}
                        className="w-full px-3 py-2 bg-stone-900 border border-stone-700 rounded-xl text-xs text-white font-bold"
                      >
                        <option value="Plano de Mensura / Topográfico">Plano de Mensura / Poligonal Topográfica</option>
                        <option value="Plano de Ubicación / Linderos">Plano de Ubicación y Linderos</option>
                        <option value="Ficha Catastral">Ficha Catastral Oficial</option>
                        <option value="Título de Propiedad">Título de Propiedad / Documento Registrado</option>
                        <option value="Cédula Catastral">Cédula Catastral Emitida</option>
                        <option value="Plano de Distribución">Plano de Arquitectura / Distribución</option>
                        <option value="Croquis de Parcela">Croquis Predial de Parcela</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Seleccionar Archivo (PDF o Imagen)</label>
                      <input
                        type="file"
                        accept=".pdf,image/*"
                        onChange={e => setNewFile(e.target.files?.[0] || null)}
                        className="w-full text-xs text-stone-400 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-orange-600 file:text-white hover:file:bg-orange-500 cursor-pointer"
                      />
                      {newFile && (
                        <span className="text-[10px] text-emerald-400 mt-1 block">
                          Archivo listo para guardar: {newFile.name} ({(newFile.size / 1024).toFixed(1)} KB)
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 3. Archivos y Planos ya vinculados a esta parcela */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-stone-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5 text-orange-400" />
                    Archivos Técnicos y Planos ya vinculados ({existingUserDocs.length})
                  </h4>
                  {loadingUserDocs ? (
                    <p className="text-xs text-stone-500">Buscando planos de la parcela...</p>
                  ) : existingUserDocs.length === 0 ? (
                    <p className="text-xs text-stone-500 italic">No posee planos ni archivos técnicos cargados aún.</p>
                  ) : (
                    <div className="flex gap-2 flex-wrap">
                      {existingUserDocs.map((ud, idx) => (
                        <div key={idx} className="flex items-center gap-2 p-2 bg-stone-900 border border-stone-800 rounded-lg text-xs">
                          <FileText className="w-4 h-4 text-orange-400" />
                          <span className="font-bold text-white">{ud.tipo}</span>
                          {ud.documento && (
                            <a
                              href={ud.documento}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2 py-0.5 bg-orange-600 hover:bg-orange-500 text-white rounded text-[10px] font-bold"
                            >
                              Ver
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-stone-800">
                  <button
                    type="button"
                    onClick={() => setEditingParcela(null)}
                    className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-stone-300 rounded-xl text-xs font-semibold"
                  >
                    Cerrar
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-6 py-2 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow transition-all disabled:opacity-50"
                  >
                    {isSaving ? <AlertCircle className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {isSaving ? 'Guardando...' : 'Guardar Parcela y Planos'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: VISOR DE DOCUMENTO PREVIO */}
      {modalDoc && modalDoc.archivo_url && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-stone-950 border border-stone-800 rounded-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-stone-800 flex items-center justify-between bg-stone-900/60">
              <div className="flex items-center gap-3">
                <Compass className="w-5 h-5 text-orange-400" />
                <div>
                  <h3 className="font-bold text-white text-sm">
                    {modalDoc.inmueble_codigo} - {modalDoc.propietario}
                  </h3>
                  <p className="text-[10px] text-stone-400 font-mono">
                    Catastro: {modalDoc.codigo_catastral || modalDoc.inmueble_codigo} • Titular: {modalDoc.identidad}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDescargar(modalDoc)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold shadow"
                >
                  <Download className="w-3.5 h-3.5" />
                  Descargar
                </button>
                <button
                  onClick={() => setModalDoc(null)}
                  className="p-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 bg-stone-900/40 p-4 flex items-center justify-center overflow-auto">
              {modalDoc.archivo_url.startsWith('data:application/pdf') || modalDoc.archivo_url.toLowerCase().endsWith('.pdf') ? (
                <iframe
                  src={modalDoc.archivo_url}
                  className="w-full h-full rounded-xl border border-stone-800 bg-white"
                  title="Ficha Catastral PDF"
                />
              ) : (
                <img
                  src={modalDoc.archivo_url}
                  alt={modalDoc.inmueble_codigo}
                  className="max-w-full max-h-full object-contain rounded-xl border border-stone-800 shadow"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
