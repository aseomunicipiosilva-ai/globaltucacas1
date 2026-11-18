'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  FileText, 
  Search, 
  Download, 
  Eye, 
  CheckCircle2, 
  Filter, 
  Building2, 
  Briefcase, 
  AlertCircle, 
  ExternalLink,
  X,
  FileCheck,
  ShieldCheck,
  Edit,
  Save,
  Upload,
  Plus,
  Paperclip
} from 'lucide-react';
import { esContribuyenteHacienda, deduplicarContribuyentes } from '@/lib/filtroHacienda';
import { ordenanzaData, tarifasHaciendaCatastro } from '@/data/ordenanza';

interface DocItem {
  id: string | number;
  identidad: string;
  contribuyente: string;
  tipo: string;
  sector?: string;
  origen: string;
  tipo_documento: string;
  tiene_archivo: boolean;
  archivo_url?: string;
  numero_patente?: string;
  fecha_carga?: string;
  rawInmueble?: any;
}

export default function DocumentosHaciendaPage() {
  const [documentos, setDocumentos] = useState<DocItem[]>([]);
  const [inmueblesList, setInmueblesList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<'Todos' | 'ConArchivo' | 'SoloPatente' | 'SoloRIF' | 'SoloPlanos'>('Todos');
  const [clasificacionFiltro, setClasificacionFiltro] = useState<'Todos' | 'Comercial' | 'Industrial'>('Todos');
  const [modalDoc, setModalDoc] = useState<DocItem | null>(null);

  // Modal para Editar Contribuyente y Cargar Documentos
  const [editingContribuyente, setEditingContribuyente] = useState<any | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Formulario de edición
  const [editForm, setEditForm] = useState({
    identidad: '',
    contribuyente: '',
    patente: '',
    actividad_principal: '',
    clasificacion: 'Comercial',
    area: '',
    telefono: '',
    correo_electronico: '',
    direccion: '',
    sector: 'Centro Tucacas'
  });

  // Archivo a cargar en el modal
  const [selectedDocType, setSelectedDocType] = useState<string>('Patente Comercial');
  const [newFile, setNewFile] = useState<File | null>(null);
  const [existingUserDocs, setExistingUserDocs] = useState<any[]>([]);
  const [loadingUserDocs, setLoadingUserDocs] = useState(false);

  useEffect(() => {
    cargarDocumentos();
  }, []);

  const toBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const cargarDocumentos = async () => {
    setLoading(true);
    try {
      const items: DocItem[] = [];

      // 1. Cargar documentos de la tabla `documentos` (archivos subidos directamente)
      const { data: dbDocs } = await supabase
        .from('documentos')
        .select('*')
        .order('id', { ascending: false });

      if (dbDocs) {
        dbDocs.forEach((d: any) => {
          items.push({
            id: `doc-${d.id}`,
            identidad: d.identidad || 'S/I',
            contribuyente: d.contribuyente || 'Contribuyente',
            tipo: d.tipo?.toLowerCase().includes('industrial') ? 'Industrial' : 'Comercial',
            origen: 'Expediente Digital Hacienda',
            tipo_documento: d.tipo || 'Documento',
            tiene_archivo: !!d.documento,
            archivo_url: d.documento,
            fecha_carga: d.fecha || (d.created_at ? new Date(d.created_at).toLocaleDateString('es-VE') : undefined)
          });
        });
      }

      // 2. Cargar pre_registros que tengan patente_doc, rif_doc o cedula_doc
      const { data: prData } = await supabase
        .from('pre_registros')
        .select('id, identidad, contribuyente, tipo, origen, patente_doc, rif_doc, cedula_doc, created_at')
        .or('patente_doc.not.is.null,rif_doc.not.is.null,cedula_doc.not.is.null');

      if (prData) {
        prData.forEach((pr: any) => {
          if (pr.patente_doc) {
            items.push({
              id: `pr-pat-${pr.id}`,
              identidad: pr.identidad || 'S/I',
              contribuyente: pr.contribuyente || 'Contribuyente',
              tipo: pr.tipo || 'Comercial',
              origen: pr.origen || 'Pre-Registro Digital',
              tipo_documento: 'Patente Comercial',
              tiene_archivo: true,
              archivo_url: pr.patente_doc,
              fecha_carga: pr.created_at ? new Date(pr.created_at).toLocaleDateString('es-VE') : undefined
            });
          }
          if (pr.rif_doc) {
            items.push({
              id: `pr-rif-${pr.id}`,
              identidad: pr.identidad || 'S/I',
              contribuyente: pr.contribuyente || 'Contribuyente',
              tipo: pr.tipo || 'Comercial',
              origen: pr.origen || 'Pre-Registro Digital',
              tipo_documento: 'RIF Digital',
              tiene_archivo: true,
              archivo_url: pr.rif_doc,
              fecha_carga: pr.created_at ? new Date(pr.created_at).toLocaleDateString('es-VE') : undefined
            });
          }
          if (pr.cedula_doc) {
            items.push({
              id: `pr-ced-${pr.id}`,
              identidad: pr.identidad || 'S/I',
              contribuyente: pr.contribuyente || 'Contribuyente',
              tipo: pr.tipo || 'Comercial',
              origen: pr.origen || 'Pre-Registro Digital',
              tipo_documento: 'Cédula de Identidad',
              tiene_archivo: true,
              archivo_url: pr.cedula_doc,
              fecha_carga: pr.created_at ? new Date(pr.created_at).toLocaleDateString('es-VE') : undefined
            });
          }
        });
      }

      // 3. Cargar inmuebles comerciales/industriales (excluyendo condominios)
      const { data: inms } = await supabase
        .from('inmuebles')
        .select('*')
        .order('contribuyente', { ascending: true });

      if (inms) {
        setInmueblesList(inms);
        const validos = deduplicarContribuyentes(inms.filter(i => esContribuyenteHacienda(i)));

        validos.forEach((inm: any) => {
          if (inm.doc_registro_url) {
            items.push({
              id: `inm-reg-${inm.id}`,
              identidad: inm.identidad || 'S/I',
              contribuyente: inm.contribuyente || 'Contribuyente',
              tipo: inm.clasificacion || 'Comercial',
              sector: inm.sector,
              origen: 'Expediente Digitalizado',
              tipo_documento: 'Registro Mercantil',
              tiene_archivo: true,
              archivo_url: inm.doc_registro_url,
              numero_patente: inm.patente,
              fecha_carga: inm.created_at ? new Date(inm.created_at).toLocaleDateString('es-VE') : undefined,
              rawInmueble: inm
            });
          }
          if (inm.doc_cedula_url) {
            items.push({
              id: `inm-ced-${inm.id}`,
              identidad: inm.identidad || 'S/I',
              contribuyente: inm.contribuyente || 'Contribuyente',
              tipo: inm.clasificacion || 'Comercial',
              sector: inm.sector,
              origen: 'Expediente Digitalizado',
              tipo_documento: 'Cédula de Identidad',
              tiene_archivo: true,
              archivo_url: inm.doc_cedula_url,
              numero_patente: inm.patente,
              fecha_carga: inm.created_at ? new Date(inm.created_at).toLocaleDateString('es-VE') : undefined,
              rawInmueble: inm
            });
          }
          if (inm.doc_ficha_url) {
            items.push({
              id: `inm-fic-${inm.id}`,
              identidad: inm.identidad || 'S/I',
              contribuyente: inm.contribuyente || 'Contribuyente',
              tipo: inm.clasificacion || 'Comercial',
              sector: inm.sector,
              origen: 'Expediente Digitalizado',
              tipo_documento: 'Ficha / Patente',
              tiene_archivo: true,
              archivo_url: inm.doc_ficha_url,
              numero_patente: inm.patente,
              fecha_carga: inm.created_at ? new Date(inm.created_at).toLocaleDateString('es-VE') : undefined,
              rawInmueble: inm
            });
          }

          // Si tiene patente asignada y no tiene archivo aún, agregarlo a la lista para permitirle subirle archivos
          if (!items.some(it => it.identidad === inm.identidad)) {
            items.push({
              id: `inm-base-${inm.id}`,
              identidad: inm.identidad || 'S/I',
              contribuyente: inm.contribuyente || 'Contribuyente',
              tipo: inm.clasificacion || 'Comercial',
              sector: inm.sector,
              origen: 'Padrón de Contribuyentes',
              tipo_documento: inm.patente && inm.patente !== 'SN' ? 'Patente Comercial' : 'Expediente Pendiente',
              tiene_archivo: false,
              numero_patente: inm.patente && inm.patente !== 'SN' ? inm.patente : undefined,
              fecha_carga: inm.created_at ? new Date(inm.created_at).toLocaleDateString('es-VE') : undefined,
              rawInmueble: inm
            });
          }
        });
      }

      setDocumentos(items);
    } catch (e) {
      console.error('Error cargando documentos:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleDescargar = (doc: DocItem) => {
    if (!doc.archivo_url) return;
    const a = document.createElement('a');
    a.href = doc.archivo_url;
    a.download = `${doc.tipo_documento}_${doc.identidad}_${doc.contribuyente.replace(/[^a-zA-Z0-9]/g, '_')}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Abrir Modal de Edición de Contribuyente
  const handleOpenEdit = async (doc: DocItem) => {
    const inm = doc.rawInmueble || inmueblesList.find(i => i.identidad === doc.identidad) || {
      id: doc.id,
      identidad: doc.identidad,
      contribuyente: doc.contribuyente,
      patente: doc.numero_patente || '',
      clasificacion: doc.tipo || 'Comercial'
    };

    setEditingContribuyente(inm);
    setEditForm({
      identidad: inm.identidad || doc.identidad || '',
      contribuyente: inm.contribuyente || doc.contribuyente || '',
      patente: (inm.patente && inm.patente !== 'SN') ? inm.patente : (doc.numero_patente || ''),
      actividad_principal: inm.actividad_principal || '',
      clasificacion: inm.clasificacion || doc.tipo || 'Comercial',
      area: inm.area ? inm.area.toString() : '',
      telefono: inm.telefono || '',
      correo_electronico: inm.correo_electronico || '',
      direccion: inm.direccion || '',
      sector: inm.sector || 'Centro Tucacas'
    });
    setNewFile(null);
    setSaveSuccess(false);

    // Cargar todos los archivos de este usuario
    await cargarDocumentosDelUsuario(inm.identidad || doc.identidad);
  };

  const cargarDocumentosDelUsuario = async (identidad: string) => {
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
          if (pr.rif_doc) userDocs.push({ id: `pr-rif-${pr.id}`, tipo: 'RIF Digital', documento: pr.rif_doc, fecha: pr.created_at?.split('T')[0] });
          if (pr.patente_doc) userDocs.push({ id: `pr-pat-${pr.id}`, tipo: 'Patente Comercial', documento: pr.patente_doc, fecha: pr.created_at?.split('T')[0] });
          if (pr.cedula_doc) userDocs.push({ id: `pr-ced-${pr.id}`, tipo: 'Cédula Identidad', documento: pr.cedula_doc, fecha: pr.created_at?.split('T')[0] });
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
    if (!editingContribuyente) return;
    setIsSaving(true);
    try {
      // 1. Actualizar datos en inmuebles si existe ID numérico
      if (typeof editingContribuyente.id === 'number') {
        const { error: updErr } = await supabase
          .from('inmuebles')
          .update({
            contribuyente: editForm.contribuyente,
            identidad: editForm.identidad,
            patente: editForm.patente.trim() || 'SN',
            actividad_principal: editForm.actividad_principal,
            clasificacion: editForm.clasificacion,
            area: editForm.area ? parseFloat(editForm.area) : null,
            telefono: editForm.telefono,
            correo_electronico: editForm.correo_electronico,
            direccion: editForm.direccion,
            sector: editForm.sector
          })
          .eq('id', editingContribuyente.id);

        if (updErr) throw updErr;
      }

      // 2. Si se seleccionó un archivo nuevo, cargarlo
      if (newFile) {
        const fileBase64 = await toBase64(newFile);
        const { error: insErr } = await supabase.from('documentos').insert([{
          documento: fileBase64,
          tipo: selectedDocType,
          fecha: new Date().toISOString().split('T')[0],
          contribuyente: editForm.contribuyente,
          identidad: editForm.identidad,
          estado: 'Vigente'
        }]);

        if (insErr) throw insErr;

        // Si es patente o registro, guardar también en inmuebles
        if (typeof editingContribuyente.id === 'number') {
          if (selectedDocType === 'Patente Comercial') {
            await supabase.from('inmuebles').update({ doc_ficha_url: fileBase64 }).eq('id', editingContribuyente.id);
          } else if (selectedDocType === 'Registro Mercantil') {
            await supabase.from('inmuebles').update({ doc_registro_url: fileBase64 }).eq('id', editingContribuyente.id);
          } else if (selectedDocType === 'Cédula del Representante') {
            await supabase.from('inmuebles').update({ doc_cedula_url: fileBase64 }).eq('id', editingContribuyente.id);
          }
        }
      }

      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        setEditingContribuyente(null);
        cargarDocumentos();
      }, 1500);
    } catch (err: any) {
      alert('Error guardando contribuyente: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const filtrados = documentos.filter(d => {
    if (filtroTipo === 'ConArchivo' && !d.tiene_archivo) return false;
    if (filtroTipo === 'SoloPatente' && !d.tipo_documento.toLowerCase().includes('patente')) return false;
    if (filtroTipo === 'SoloRIF' && !d.tipo_documento.toLowerCase().includes('rif')) return false;
    if (filtroTipo === 'SoloPlanos' && !d.tipo_documento.toLowerCase().includes('plano')) return false;

    if (clasificacionFiltro === 'Comercial' && d.tipo.toUpperCase().includes('INDUSTRIAL')) return false;
    if (clasificacionFiltro === 'Industrial' && !d.tipo.toUpperCase().includes('INDUSTRIAL')) return false;

    if (!filtro) return true;
    const q = filtro.toLowerCase();
    return (
      d.contribuyente.toLowerCase().includes(q) ||
      d.identidad.toLowerCase().includes(q) ||
      d.tipo_documento.toLowerCase().includes(q) ||
      (d.numero_patente && d.numero_patente.toLowerCase().includes(q)) ||
      (d.sector && d.sector.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="border-b border-slate-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <FileText className="w-7 h-7 text-sky-400" />
            Expedientes y Documentos - Hacienda Municipal
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Gestión de patentes comerciales, RIFs, registros mercantiles, planos y documentos digitalizados de los contribuyentes de Silva.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-slate-300">
            Total Expedientes: <span className="text-sky-400 font-mono">{filtrados.length}</span>
          </span>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row gap-4 justify-between items-center shadow-xl">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar por RIF, Razón Social o N° Patente..."
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
          />
        </div>

        <div className="flex flex-wrap gap-2 w-full md:w-auto items-center">
          <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
            {(['Todos', 'ConArchivo', 'SoloPatente', 'SoloRIF', 'SoloPlanos'] as const).map(t => (
              <button
                key={t}
                onClick={() => setFiltroTipo(t)}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  filtroTipo === t ? 'bg-sky-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                {t === 'ConArchivo' ? 'Digitalizados' : t === 'SoloPatente' ? 'Patentes' : t === 'SoloRIF' ? 'RIF' : t === 'SoloPlanos' ? 'Planos' : t}
              </button>
            ))}
          </div>

          <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
            {(['Todos', 'Comercial', 'Industrial'] as const).map(c => (
              <button
                key={c}
                onClick={() => setClasificacionFiltro(c)}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  clasificacionFiltro === c ? 'bg-sky-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tabla de Documentos y Expedientes */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            Cargando expedientes y documentos de Hacienda...
          </div>
        ) : filtrados.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            No se encontraron documentos con los filtros seleccionados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-3.5">RIF / Cédula</th>
                  <th className="p-3.5">Contribuyente / Razón Social</th>
                  <th className="p-3.5">Documento / Expediente</th>
                  <th className="p-3.5">N° Patente</th>
                  <th className="p-3.5">Origen / Módulo</th>
                  <th className="p-3.5 text-center">Estado Archivo</th>
                  <th className="p-3.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {filtrados.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-900/50 transition-colors">
                    <td className="p-3.5 font-mono text-slate-300 font-bold">
                      {doc.identidad}
                    </td>
                    <td className="p-3.5 text-white font-bold max-w-xs truncate">
                      {doc.contribuyente}
                    </td>
                    <td className="p-3.5">
                      <span className="px-2.5 py-1 rounded-lg bg-sky-950 text-sky-300 border border-sky-800 font-bold text-[11px] inline-flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-sky-400" />
                        {doc.tipo_documento}
                      </span>
                    </td>
                    <td className="p-3.5 font-mono">
                      {doc.numero_patente ? (
                        <span className="text-amber-400 font-bold bg-amber-950/40 px-2 py-0.5 rounded border border-amber-900/50 text-[10px]">
                          {doc.numero_patente}
                        </span>
                      ) : (
                        <span className="text-slate-600 text-[10px]">En Trámite</span>
                      )}
                    </td>
                    <td className="p-3.5 text-slate-400 text-[11px]">
                      {doc.origen}
                    </td>
                    <td className="p-3.5 text-center">
                      {doc.tiene_archivo ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-950/60 text-emerald-300 border border-emerald-800/80 text-[10px] font-semibold">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          Digitalizado
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-900 text-slate-400 border border-slate-800 text-[10px]">
                          Solo Registro
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 text-right space-x-1.5 whitespace-nowrap">
                      {/* Botón Editar Contribuyente y Cargar Archivo */}
                      <button
                        onClick={() => handleOpenEdit(doc)}
                        className="px-2.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-[11px] shadow transition-colors inline-flex items-center gap-1"
                        title="Editar Contribuyente y Cargar Documentos"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        Editar / Cargar
                      </button>

                      {doc.tiene_archivo && (
                        <>
                          <button
                            onClick={() => setModalDoc(doc)}
                            className="p-1.5 rounded-lg bg-sky-950/60 hover:bg-sky-900 text-sky-300 border border-sky-800/60 transition-colors"
                            title="Previsualizar documento"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDescargar(doc)}
                            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 transition-colors"
                            title="Descargar archivo"
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

      {/* MODAL 1: EDITAR CONTRIBUYENTE Y SUBIR ARCHIVOS */}
      {editingContribuyente && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            {/* Header del Modal */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
              <div className="flex items-center gap-3">
                <Edit className="w-5 h-5 text-sky-400" />
                <div>
                  <h3 className="font-bold text-white text-sm">
                    Editar Expediente y Cargar Documentos - {editForm.contribuyente}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-mono">
                    RIF: {editForm.identidad} • Módulo de Hacienda Municipal
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingContribuyente(null)}
                className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Contenido con scroll */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {saveSuccess && (
                <div className="p-3 bg-emerald-950 border border-emerald-800 text-emerald-200 rounded-xl text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ¡Datos y documentos actualizados exitosamente en el sistema municipal!
                </div>
              )}

              <form onSubmit={handleSaveEdit} className="space-y-5">
                {/* 1. Datos Principales */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-sky-400 uppercase tracking-wider border-b border-slate-800 pb-1">
                    1. Datos de Identificación y Patente
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">RIF</label>
                      <input
                        type="text"
                        value={editForm.identidad}
                        onChange={e => setEditForm({ ...editForm, identidad: e.target.value })}
                        className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white font-mono"
                        required
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Razón Social</label>
                      <input
                        type="text"
                        value={editForm.contribuyente}
                        onChange={e => setEditForm({ ...editForm, contribuyente: e.target.value })}
                        className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">N° de Patente Asignada</label>
                      <input
                        type="text"
                        placeholder="Ej. 1918 o En Trámite"
                        value={editForm.patente}
                        onChange={e => setEditForm({ ...editForm, patente: e.target.value })}
                        className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Clasificación</label>
                      <select
                        value={editForm.clasificacion}
                        onChange={e => setEditForm({ ...editForm, clasificacion: e.target.value })}
                        className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                      >
                        <option value="Comercial">Comercial</option>
                        <option value="Industrial">Industrial</option>
                        <option value="Servicios">Servicios</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Sector Geográfico</label>
                      <select
                        value={editForm.sector}
                        onChange={e => setEditForm({ ...editForm, sector: e.target.value })}
                        className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
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

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Actividad Comercial Principal</label>
                      <input
                        type="text"
                        value={editForm.actividad_principal}
                        onChange={e => setEditForm({ ...editForm, actividad_principal: e.target.value })}
                        className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Área / Metraje ($m^2$)</label>
                      <input
                        type="number"
                        placeholder="Ej. 120"
                        value={editForm.area}
                        onChange={e => setEditForm({ ...editForm, area: e.target.value })}
                        className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Teléfono</label>
                      <input
                        type="text"
                        value={editForm.telefono}
                        onChange={e => setEditForm({ ...editForm, telefono: e.target.value })}
                        className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Correo Electrónico</label>
                      <input
                        type="email"
                        value={editForm.correo_electronico}
                        onChange={e => setEditForm({ ...editForm, correo_electronico: e.target.value })}
                        className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Carga de Nuevo Documento o Plano */}
                <div className="space-y-3 p-4 bg-sky-950/20 border border-sky-900/60 rounded-xl">
                  <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-sky-800/40 pb-1">
                    <Upload className="w-4 h-4" />
                    2. Cargar Nuevo Documento Digitalizado o Plano
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Tipo de Documento</label>
                      <select
                        value={selectedDocType}
                        onChange={e => setSelectedDocType(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-bold"
                      >
                        <option value="Patente Comercial">Patente Comercial Digitalizada</option>
                        <option value="Registro Mercantil">Registro Mercantil / Acta Constitutiva</option>
                        <option value="RIF Digital">RIF Digital Vigente</option>
                        <option value="Cédula del Representante">Cédula del Representante Legal</option>
                        <option value="Plano de Distribución">Plano de Distribución del Local</option>
                        <option value="Plano de Bomberos">Permiso / Plano de Bomberos</option>
                        <option value="Solvencia Municipal">Certificado de Solvencia Municipal</option>
                        <option value="Declaración de Ingresos">Declaración Jurada de Ingresos Brutos</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Seleccionar Archivo (PDF o Imagen)</label>
                      <input
                        type="file"
                        accept=".pdf,image/*"
                        onChange={e => setNewFile(e.target.files?.[0] || null)}
                        className="w-full text-xs text-slate-400 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-sky-600 file:text-white hover:file:bg-sky-500 cursor-pointer"
                      />
                      {newFile && (
                        <span className="text-[10px] text-emerald-400 mt-1 block">
                          Archivo listo para guardar: {newFile.name} ({(newFile.size / 1024).toFixed(1)} KB)
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 3. Archivos ya existentes de este usuario */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5 text-sky-400" />
                    Documentos ya vinculados a este usuario ({existingUserDocs.length})
                  </h4>
                  {loadingUserDocs ? (
                    <p className="text-xs text-slate-500">Buscando documentos del contribuyente...</p>
                  ) : existingUserDocs.length === 0 ? (
                    <p className="text-xs text-slate-500 italic">No posee documentos vinculados aún.</p>
                  ) : (
                    <div className="flex gap-2 flex-wrap">
                      {existingUserDocs.map((ud, idx) => (
                        <div key={idx} className="flex items-center gap-2 p-2 bg-slate-900 border border-slate-800 rounded-lg text-xs">
                          <FileText className="w-4 h-4 text-sky-400" />
                          <span className="font-bold text-white">{ud.tipo}</span>
                          {ud.documento && (
                            <a
                              href={ud.documento}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2 py-0.5 bg-sky-600 hover:bg-sky-500 text-white rounded text-[10px] font-bold"
                            >
                              Ver
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setEditingContribuyente(null)}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold"
                  >
                    Cerrar
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-6 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow transition-all disabled:opacity-50"
                  >
                    {isSaving ? <AlertCircle className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {isSaving ? 'Guardando...' : 'Guardar Cambios y Archivos'}
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
          <div className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-sky-400" />
                <div>
                  <h3 className="font-bold text-white text-sm">
                    {modalDoc.tipo_documento} - {modalDoc.contribuyente}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-mono">
                    RIF: {modalDoc.identidad} {modalDoc.numero_patente && `• Patente: ${modalDoc.numero_patente}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDescargar(modalDoc)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow"
                >
                  <Download className="w-3.5 h-3.5" />
                  Descargar
                </button>
                <button
                  onClick={() => setModalDoc(null)}
                  className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 bg-slate-900/40 p-4 flex items-center justify-center overflow-auto">
              {modalDoc.archivo_url.startsWith('data:application/pdf') || modalDoc.archivo_url.toLowerCase().endsWith('.pdf') ? (
                <iframe
                  src={modalDoc.archivo_url}
                  className="w-full h-full rounded-xl border border-slate-800 bg-white"
                  title="Documento PDF"
                />
              ) : (
                <img
                  src={modalDoc.archivo_url}
                  alt={modalDoc.tipo_documento}
                  className="max-w-full max-h-full object-contain rounded-xl border border-slate-800 shadow"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
