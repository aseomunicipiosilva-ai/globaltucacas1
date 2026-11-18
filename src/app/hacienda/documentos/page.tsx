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
  ShieldCheck
} from 'lucide-react';
import { esCondominioResidencial, deduplicarContribuyentes } from '@/lib/filtroHacienda';

interface DocItem {
  id: string | number;
  identidad: string;
  contribuyente: string;
  tipo: string;
  sector?: string;
  origen: string;
  tipo_documento: 'Patente' | 'Registro Mercantil' | 'RIF' | 'Cédula';
  tiene_archivo: boolean;
  archivo_url?: string;
  numero_patente?: string;
  fecha_carga?: string;
}

export default function DocumentosHaciendaPage() {
  const [documentos, setDocumentos] = useState<DocItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<'Todos' | 'ConArchivo' | 'SoloPatente' | 'SoloRIF'>('Todos');
  const [clasificacionFiltro, setClasificacionFiltro] = useState<'Todos' | 'Comercial' | 'Industrial'>('Todos');
  const [modalDoc, setModalDoc] = useState<DocItem | null>(null);

  useEffect(() => {
    cargarDocumentos();
  }, []);

  const cargarDocumentos = async () => {
    setLoading(true);
    try {
      const items: DocItem[] = [];

      // 1. Cargar pre_registros que tengan patente_doc, rif_doc o cedula_doc
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
              tipo_documento: 'Patente',
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
              tipo_documento: 'RIF',
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
              tipo_documento: 'Cédula',
              tiene_archivo: true,
              archivo_url: pr.cedula_doc,
              fecha_carga: pr.created_at ? new Date(pr.created_at).toLocaleDateString('es-VE') : undefined
            });
          }
        });
      }

      // 2. Cargar inmuebles con doc_registro_url o doc_cedula_url
      const { data: inmsDoc } = await supabase
        .from('inmuebles')
        .select('id, cod_cont, identidad, contribuyente, clasificacion, sector, patente, doc_registro_url, doc_cedula_url, created_at')
        .or('doc_registro_url.not.is.null,doc_cedula_url.not.is.null');

      if (inmsDoc) {
        inmsDoc.forEach((inm: any) => {
          if (inm.doc_registro_url) {
            items.push({
              id: `inm-reg-${inm.id}`,
              identidad: inm.identidad || 'S/I',
              contribuyente: inm.contribuyente || 'Contribuyente',
              tipo: inm.clasificacion || 'Comercial',
              sector: inm.sector,
              origen: 'Expediente Físico Digitalizado',
              tipo_documento: 'Registro Mercantil',
              tiene_archivo: true,
              archivo_url: inm.doc_registro_url,
              numero_patente: inm.patente,
              fecha_carga: inm.created_at ? new Date(inm.created_at).toLocaleDateString('es-VE') : undefined
            });
          }
          if (inm.doc_cedula_url) {
            items.push({
              id: `inm-ced-${inm.id}`,
              identidad: inm.identidad || 'S/I',
              contribuyente: inm.contribuyente || 'Contribuyente',
              tipo: inm.clasificacion || 'Comercial',
              sector: inm.sector,
              origen: 'Expediente Físico Digitalizado',
              tipo_documento: 'Cédula',
              tiene_archivo: true,
              archivo_url: inm.doc_cedula_url,
              numero_patente: inm.patente,
              fecha_carga: inm.created_at ? new Date(inm.created_at).toLocaleDateString('es-VE') : undefined
            });
          }
        });
      }

      // 3. Cargar inmuebles con patente asignada en sistema
      const { data: inmsPat } = await supabase
        .from('inmuebles')
        .select('id, cod_cont, identidad, contribuyente, clasificacion, sector, patente, created_at')
        .not('patente', 'is', null)
        .limit(100);

      if (inmsPat) {
        inmsPat.forEach((inm: any) => {
          if (inm.patente && inm.patente !== 'SN' && inm.patente !== 'S/N') {
            items.push({
              id: `inm-pat-${inm.id}`,
              identidad: inm.identidad || 'S/I',
              contribuyente: inm.contribuyente || 'Contribuyente',
              tipo: inm.clasificacion || 'Comercial',
              sector: inm.sector,
              origen: 'Padrón Municipal de Patentes',
              tipo_documento: 'Patente',
              tiene_archivo: false,
              numero_patente: inm.patente,
              fecha_carga: inm.created_at ? new Date(inm.created_at).toLocaleDateString('es-VE') : undefined
            });
          }
        });
      }

      // Excluir condominios residenciales de documentos de Hacienda
      const soloComercial = items.filter(it => !esCondominioResidencial(it));
      setDocumentos(soloComercial);
    } catch (e) {
      console.error('Error cargando documentos:', e);
    } finally {
      setLoading(false);
    }
  };

  const filtrados = documentos.filter(doc => {
    if (filtroTipo === 'ConArchivo' && !doc.tiene_archivo) return false;
    if (filtroTipo === 'SoloPatente' && doc.tipo_documento !== 'Patente') return false;
    if (filtroTipo === 'SoloRIF' && doc.tipo_documento !== 'RIF') return false;

    if (clasificacionFiltro === 'Comercial' && !doc.tipo.toUpperCase().includes('COMERCIAL') && !doc.tipo.toUpperCase().includes('TIPO D') && !doc.tipo.toUpperCase().includes('TIPO C')) return false;
    if (clasificacionFiltro === 'Industrial' && !doc.tipo.toUpperCase().includes('INDUSTRIAL')) return false;

    if (!filtro) return true;
    const q = filtro.toLowerCase();
    return (
      doc.contribuyente.toLowerCase().includes(q) ||
      doc.identidad.toLowerCase().includes(q) ||
      (doc.numero_patente && doc.numero_patente.toLowerCase().includes(q))
    );
  });

  const handleDescargar = (doc: DocItem) => {
    if (!doc.archivo_url) return;
    if (doc.archivo_url.startsWith('http')) {
      window.open(doc.archivo_url, '_blank');
      return;
    }
    const link = document.createElement('a');
    link.href = doc.archivo_url;
    link.download = `${doc.tipo_documento}_${doc.identidad}_${doc.contribuyente.replace(/[^a-zA-Z0-9]/g, '_')}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Encabezado */}
      <div className="border-b border-slate-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <FileText className="w-7 h-7 text-sky-400" />
            Visor y Gestor de Patentes y Documentos Cargados
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Consulta, previsualiza y descarga los recaudos mercantiles, patentes montadas y RIF subidos por los contribuyentes.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl text-xs text-slate-300">
            Total en archivo: <strong className="text-sky-400 font-mono font-bold">{documentos.length}</strong>
          </div>
          <div className="bg-emerald-950/50 border border-emerald-800/60 px-3 py-1.5 rounded-xl text-xs text-emerald-300">
            Digitalizados: <strong className="text-emerald-400 font-mono font-bold">{documentos.filter(d => d.tiene_archivo).length}</strong>
          </div>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row gap-4 justify-between items-center">
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

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Clasificación */}
          <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
            {(['Todos', 'Comercial', 'Industrial'] as const).map(c => (
              <button
                key={c}
                onClick={() => setClasificacionFiltro(c)}
                className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                  clasificacionFiltro === c ? 'bg-sky-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          {/* Tipo de Documento */}
          <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
            {[
              { id: 'Todos', label: 'Todos' },
              { id: 'ConArchivo', label: 'Digitalizados (Adjuntos)' },
              { id: 'SoloPatente', label: 'Patentes' },
              { id: 'SoloRIF', label: 'RIF' }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setFiltroTipo(f.id as any)}
                className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                  filtroTipo === f.id ? 'bg-slate-800 text-sky-400' : 'text-slate-400 hover:text-white'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tabla de Resultados */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            Cargando expedientes y documentos digitalizados...
          </div>
        ) : filtrados.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            No se encontraron documentos ni patentes con los filtros seleccionados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-3.5">Contribuyente</th>
                  <th className="p-3.5">RIF / Cédula</th>
                  <th className="p-3.5">Tipo y Sector</th>
                  <th className="p-3.5">Documento</th>
                  <th className="p-3.5">N° Patente / Código</th>
                  <th className="p-3.5">Origen Recaudo</th>
                  <th className="p-3.5 text-center">Estado Digital</th>
                  <th className="p-3.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {filtrados.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-900/50 transition-colors">
                    <td className="p-3.5 text-white font-bold max-w-xs truncate">
                      {doc.contribuyente}
                    </td>
                    <td className="p-3.5 font-mono text-slate-300 font-bold">
                      {doc.identidad}
                    </td>
                    <td className="p-3.5 text-slate-400">
                      <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] text-sky-300">
                        {doc.tipo}
                      </span>
                      {doc.sector && <span className="block text-[10px] text-slate-500 mt-0.5">{doc.sector}</span>}
                    </td>
                    <td className="p-3.5">
                      <span className={`px-2 py-1 rounded text-[10px] font-bold inline-flex items-center gap-1 ${
                        doc.tipo_documento === 'Patente'
                          ? 'bg-amber-950/60 text-amber-300 border border-amber-800/60'
                          : doc.tipo_documento === 'Registro Mercantil'
                          ? 'bg-sky-950/60 text-sky-300 border border-sky-800/60'
                          : doc.tipo_documento === 'RIF'
                          ? 'bg-indigo-950/60 text-indigo-300 border border-indigo-800/60'
                          : 'bg-slate-900 text-slate-300 border border-slate-800'
                      }`}>
                        <FileCheck className="w-3 h-3" />
                        {doc.tipo_documento}
                      </span>
                    </td>
                    <td className="p-3.5 font-mono text-slate-300">
                      {doc.numero_patente ? (
                        <span className="text-amber-400 font-bold bg-amber-950/40 px-2 py-0.5 rounded border border-amber-900/50">
                          {doc.numero_patente}
                        </span>
                      ) : (
                        <span className="text-slate-600">N/A</span>
                      )}
                    </td>
                    <td className="p-3.5 text-slate-400 text-[11px]">
                      {doc.origen}
                      {doc.fecha_carga && <span className="block text-[10px] text-slate-600">{doc.fecha_carga}</span>}
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
                    <td className="p-3.5 text-right space-x-1">
                      {doc.tiene_archivo ? (
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
                      ) : (
                        <span className="text-[10px] text-slate-600 italic">Sin adjunto</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Visor de Documento */}
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
