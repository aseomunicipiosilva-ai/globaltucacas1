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
  FileSpreadsheet
} from 'lucide-react';

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
}

export default function DocumentosCatastroPage() {
  const [fichas, setFichas] = useState<FichaDocItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<'Todos' | 'Digitalizados' | 'ConCodigoCatastral'>('Todos');
  const [clasificacionFiltro, setClasificacionFiltro] = useState<'Todos' | 'Residencial' | 'Comercial' | 'Industrial'>('Todos');
  const [modalDoc, setModalDoc] = useState<FichaDocItem | null>(null);

  useEffect(() => {
    cargarFichas();
  }, []);

  const cargarFichas = async () => {
    setLoading(true);
    try {
      const items: FichaDocItem[] = [];

      // 1. Cargar pre_registros censados con ficha de catastro en la nota o con documentos
      const { data: prData } = await supabase
        .from('pre_registros')
        .select('id, identidad, contribuyente, tipo, origen, nota, domicilio_fiscal, direccion_exacta, rif_doc, cedula_doc, created_at')
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
            origen: pr.origen || 'Censo Catastral Municipal',
            codigo_catastral: codCat,
            tiene_archivo: !!(pr.rif_doc || pr.cedula_doc),
            archivo_url: pr.rif_doc || pr.cedula_doc,
            fecha_registro: pr.created_at ? new Date(pr.created_at).toLocaleDateString('es-VE') : undefined
          });
        });
      }

      // 2. Cargar inmuebles con doc_ficha_url o doc_registro_url
      const { data: inmsDoc } = await supabase
        .from('inmuebles')
        .select('id, cod_cont, inmueble, identidad, contribuyente, clasificacion, sector, direccion, doc_ficha_url, doc_registro_url, created_at')
        .or('doc_ficha_url.not.is.null,doc_registro_url.not.is.null');

      if (inmsDoc) {
        inmsDoc.forEach((inm: any) => {
          items.push({
            id: `inm-ficha-${inm.id}`,
            inmueble_codigo: inm.inmueble || inm.cod_cont || `INM-${inm.id}`,
            identidad: inm.identidad || 'S/I',
            propietario: inm.contribuyente || 'Propietario',
            tipo: inm.clasificacion || 'Residencial',
            sector: inm.sector,
            direccion: inm.direccion,
            origen: 'Expediente Físico Inmueble',
            codigo_catastral: inm.inmueble,
            tiene_archivo: true,
            archivo_url: inm.doc_ficha_url || inm.doc_registro_url,
            fecha_registro: inm.created_at ? new Date(inm.created_at).toLocaleDateString('es-VE') : undefined
          });
        });
      }

      // 3. Cargar inmuebles principales del censo con código catastral
      const { data: inmsList } = await supabase
        .from('inmuebles')
        .select('id, cod_cont, inmueble, identidad, contribuyente, clasificacion, sector, direccion, created_at')
        .order('inmueble', { ascending: true })
        .limit(100);

      if (inmsList) {
        inmsList.forEach((inm: any) => {
          if (!items.some(it => it.inmueble_codigo === (inm.inmueble || inm.cod_cont))) {
            items.push({
              id: `inm-main-${inm.id}`,
              inmueble_codigo: inm.inmueble || inm.cod_cont || `INM-${inm.id}`,
              identidad: inm.identidad || 'S/I',
              propietario: inm.contribuyente || 'Propietario Inmueble',
              tipo: inm.clasificacion || 'Residencial',
              sector: inm.sector,
              direccion: inm.direccion,
              origen: 'Padrón Catastral Silva',
              codigo_catastral: inm.inmueble,
              tiene_archivo: false,
              fecha_registro: inm.created_at ? new Date(inm.created_at).toLocaleDateString('es-VE') : undefined
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

  const filtradas = fichas.filter(f => {
    if (filtroTipo === 'Digitalizados' && !f.tiene_archivo) return false;
    if (filtroTipo === 'ConCodigoCatastral' && !f.codigo_catastral) return false;

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

  const handleDescargar = (f: FichaDocItem) => {
    if (!f.archivo_url) return;
    if (f.archivo_url.startsWith('http')) {
      window.open(f.archivo_url, '_blank');
      return;
    }
    const link = document.createElement('a');
    link.href = f.archivo_url;
    link.download = `FichaCatastral_${f.inmueble_codigo}_${f.identidad}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Encabezado */}
      <div className="border-b border-stone-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <Compass className="w-7 h-7 text-orange-400" />
            Visor de Fichas Catastrales y Expedientes Físicos
          </h1>
          <p className="text-xs text-stone-400 mt-1">
            Consulta los expedientes catastrales, códigos de parcelas georreferenciadas y documentos montados en censo.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-stone-950 border border-stone-800 px-3 py-1.5 rounded-xl text-xs text-stone-300">
            Total Parcelas: <strong className="text-orange-400 font-mono font-bold">{fichas.length}</strong>
          </div>
          <div className="bg-emerald-950/50 border border-emerald-800/60 px-3 py-1.5 rounded-xl text-xs text-emerald-300">
            Con Códigos Asignados: <strong className="text-emerald-400 font-mono font-bold">{fichas.filter(f => f.codigo_catastral).length}</strong>
          </div>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="bg-stone-950/80 border border-stone-800 rounded-2xl p-4 flex flex-col md:flex-row gap-4 justify-between items-center">
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

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Clasificación */}
          <div className="flex bg-stone-900 p-1 rounded-xl border border-stone-800 text-xs">
            {(['Todos', 'Residencial', 'Comercial', 'Industrial'] as const).map(c => (
              <button
                key={c}
                onClick={() => setClasificacionFiltro(c)}
                className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                  clasificacionFiltro === c ? 'bg-orange-600 text-white shadow' : 'text-stone-400 hover:text-white'
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          {/* Tipo de Documento */}
          <div className="flex bg-stone-900 p-1 rounded-xl border border-stone-800 text-xs">
            {[
              { id: 'Todos', label: 'Todos' },
              { id: 'ConCodigoCatastral', label: 'Con Cód. Catastral' },
              { id: 'Digitalizados', label: 'Expedientes Digitalizados' }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setFiltroTipo(f.id as any)}
                className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                  filtroTipo === f.id ? 'bg-stone-800 text-orange-400' : 'text-stone-400 hover:text-white'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tabla de Fichas */}
      <div className="bg-stone-950/80 border border-stone-800 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-12 text-center text-stone-500 text-xs">
            Cargando expedientes catastrales...
          </div>
        ) : filtradas.length === 0 ? (
          <div className="p-12 text-center text-stone-500 text-xs">
            No se encontraron parcelas o fichas con los filtros seleccionados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-900/90 text-stone-400 border-b border-stone-800 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-3.5">Código Catastral</th>
                  <th className="p-3.5">Propietario</th>
                  <th className="p-3.5">Cédula / RIF</th>
                  <th className="p-3.5">Tipo y Destino</th>
                  <th className="p-3.5">Sector / Dirección</th>
                  <th className="p-3.5">Origen Datos</th>
                  <th className="p-3.5 text-center">Estado Ficha</th>
                  <th className="p-3.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800/60 font-medium">
                {filtradas.map((f) => (
                  <tr key={f.id} className="hover:bg-stone-900/50 transition-colors">
                    <td className="p-3.5 font-mono text-orange-400 font-bold">
                      {f.codigo_catastral ? (
                        <span className="bg-orange-950/50 border border-orange-800/60 px-2 py-0.5 rounded">
                          {f.codigo_catastral}
                        </span>
                      ) : (
                        <span className="text-stone-500">{f.inmueble_codigo}</span>
                      )}
                    </td>
                    <td className="p-3.5 text-white font-bold max-w-xs truncate">
                      {f.propietario}
                    </td>
                    <td className="p-3.5 font-mono text-stone-300 font-bold">
                      {f.identidad}
                    </td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded bg-stone-900 border border-stone-800 text-[10px] text-orange-300">
                        {f.tipo}
                      </span>
                    </td>
                    <td className="p-3.5 text-stone-400 max-w-xs truncate">
                      {f.sector || f.direccion || 'Tucacas'}
                    </td>
                    <td className="p-3.5 text-stone-400 text-[11px]">
                      {f.origen}
                      {f.fecha_registro && <span className="block text-[10px] text-stone-600">{f.fecha_registro}</span>}
                    </td>
                    <td className="p-3.5 text-center">
                      {f.tiene_archivo ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-950/60 text-emerald-300 border border-emerald-800/80 text-[10px] font-semibold">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          Documento Cargado
                        </span>
                      ) : f.codigo_catastral ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-950/60 text-orange-300 border border-orange-800/80 text-[10px] font-semibold">
                          Ficha Asignada
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-stone-900 text-stone-400 border border-stone-800 text-[10px]">
                          Padrón Base
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 text-right space-x-1">
                      {f.tiene_archivo ? (
                        <>
                          <button
                            onClick={() => setModalDoc(f)}
                            className="p-1.5 rounded-lg bg-orange-950/60 hover:bg-orange-900 text-orange-300 border border-orange-800/60 transition-colors"
                            title="Previsualizar expediente"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDescargar(f)}
                            className="p-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-300 border border-stone-700 transition-colors"
                            title="Descargar archivo"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <span className="text-[10px] text-stone-600 italic">Sin adjunto</span>
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
          <div className="bg-stone-950 border border-stone-800 rounded-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-stone-800 flex items-center justify-between bg-stone-900/60">
              <div className="flex items-center gap-3">
                <Compass className="w-5 h-5 text-orange-400" />
                <div>
                  <h3 className="font-bold text-white text-sm">
                    Ficha / Expediente Catastral - {modalDoc.propietario}
                  </h3>
                  <p className="text-[10px] text-stone-400 font-mono">
                    Cédula/RIF: {modalDoc.identidad} {modalDoc.codigo_catastral && `• Código: ${modalDoc.codigo_catastral}`}
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
                  title="Expediente PDF"
                />
              ) : (
                <img
                  src={modalDoc.archivo_url}
                  alt="Expediente Catastral"
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
