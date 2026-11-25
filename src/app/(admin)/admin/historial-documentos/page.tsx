'use client';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { DataTable } from '@/components/DataTable';
import { 
  History, Eye, X, FileText, RefreshCw, Loader2, Download, 
  CheckCircle, ShieldCheck, FileCheck, Layers, Calendar, User, 
  ExternalLink, Printer, Search
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { reimprimirSolvenciaPDF } from '@/lib/pdfGenerator';
import { useAppContext } from '@/store/AppContext';

export default function HistorialDocumentosPage() {
  const { inmuebles } = useAppContext();
  const [documentos, setDocumentos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [filtroTipo, setFiltroTipo] = useState<string>('TODOS');
  const [searchQuery, setSearchQuery] = useState('');

  // Cargar documentos desde Supabase
  const cargarDocumentos = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Cargar Certificados / Solvencias emitidas
      const { data: certs } = await supabase
        .from('certificados')
        .select('*')
        .order('created_at', { ascending: false });

      // 2. Cargar Facturas y Recibos emitidos con estado Pagado
      const { data: facturas } = await supabase
        .from('facturas')
        .select('*')
        .in('estado', ['Pagado', 'Pagada'])
        .order('created_at', { ascending: false })
        .limit(200);

      // 3. Cargar Trámites y Resoluciones de Servicios Especiales
      const { data: servicios } = await supabase
        .from('servicios_especiales')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      const listaConsolidada: any[] = [];

      // Mapear Certificados de Solvencia
      (certs || []).forEach((c: any) => {
        const fechaDoc = c.created_at ? c.created_at.split('T')[0] : (c.emision ? c.emision.split('T')[0] : 'N/A');
        listaConsolidada.push({
          id: c.codigo || `CERT-${c.id}`,
          rawId: c.id,
          tipo: 'Solvencia Municipal',
          categoria: 'SOLVENCIA',
          contribuyente: c.contribuyente || 'Contribuyente',
          identidad: c.identidad || 'N/A',
          fecha: fechaDoc,
          emisor: 'Dirección de Recaudación / ISMA',
          estado: c.estado || 'Vigente',
          detalles: `Certificado Oficial de Solvencia emitido bajo código de verificación ${c.codigo}. Vigencia hasta ${c.vencimiento ? c.vencimiento.split('T')[0] : '30 días posterior a emisión'}.`,
          origen: 'certificados',
          rawRecord: c
        });
      });

      // Mapear Recibos y Facturas Pagadas
      (facturas || []).forEach((f: any) => {
        const fechaDoc = f.created_at ? f.created_at.split('T')[0] : (f.emision || 'N/A');
        listaConsolidada.push({
          id: f.referencia || `REC-${f.id}`,
          rawId: f.id,
          tipo: 'Recibo Oficial de Pago',
          categoria: 'RECIBO',
          contribuyente: f.contribuyente || 'Contribuyente',
          identidad: f.identidad || 'N/A',
          fecha: fechaDoc,
          emisor: 'Sistema de Recaudación y Caja',
          estado: 'Liquidado / Pagado',
          monto: f.monto,
          detalles: `Recibo oficial de servicio de aseo urbano correspondiente al período ${f.emision || 'N/A'}. Monto total liquidado: Bs. ${Number(f.monto || 0).toLocaleString('es-VE', { minimumFractionDigits: 2 })}.`,
          origen: 'facturas',
          rawRecord: f
        });
      });

      // Mapear Resoluciones / Visto Bueno / Inspecciones
      (servicios || []).forEach((s: any) => {
        let nombreTipo = 'Servicio Extraordinario';
        let cat = 'SERVICIO';
        if (s.tipo === 'visto_bueno') {
          nombreTipo = 'Visto Bueno Ambiental';
          cat = 'VISTO_BUENO';
        } else if (s.tipo === 'inspeccion') {
          nombreTipo = 'Dictamen de Inspección';
          cat = 'INSPECCION';
        }

        const fechaDoc = s.fecha || (s.created_at ? s.created_at.split('T')[0] : 'N/A');
        listaConsolidada.push({
          id: s.referencia || `RESOL-${s.id}`,
          rawId: s.id,
          tipo: nombreTipo,
          categoria: cat,
          contribuyente: s.contribuyente || 'Contribuyente',
          identidad: s.identidad || 'N/A',
          fecha: fechaDoc,
          emisor: s.creado_por || 'Supervisión Ambiental ISMA',
          estado: s.estado || 'Procesado',
          monto: s.monto,
          detalles: `${s.descripcion || 'Trámite oficial procesado'}. ${s.notas ? `Notas: ${s.notas}` : ''}`,
          origen: 'servicios_especiales',
          rawRecord: s
        });
      });

      // Ordenar por fecha más reciente
      listaConsolidada.sort((a, b) => {
        const timeA = new Date(a.fecha || 0).getTime();
        const timeB = new Date(b.fecha || 0).getTime();
        return timeB - timeA;
      });

      setDocumentos(listaConsolidada);
    } catch (err) {
      console.error('Error cargando historial de documentos:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarDocumentos();
  }, [cargarDocumentos]);

  // Filtrado
  const documentosFiltrados = useMemo(() => {
    return documentos.filter(doc => {
      if (filtroTipo !== 'TODOS' && doc.categoria !== filtroTipo) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const idStr = (doc.id || '').toLowerCase();
        const nomStr = (doc.contribuyente || '').toLowerCase();
        const identStr = (doc.identidad || '').toLowerCase();
        const tipoStr = (doc.tipo || '').toLowerCase();
        if (!idStr.includes(q) && !nomStr.includes(q) && !identStr.includes(q) && !tipoStr.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [documentos, filtroTipo, searchQuery]);

  // Descargar Solvencia si aplica
  const handleDescargarSolvencia = async (doc: any) => {
    if (doc.categoria !== 'SOLVENCIA') {
      alert("La descarga digital está disponible para Certificados de Solvencia Municipal.");
      return;
    }

    try {
      reimprimirSolvenciaPDF(doc.rawRecord || {
        codigo: doc.id,
        contribuyente: doc.contribuyente,
        identidad: doc.identidad,
        emision: doc.fecha,
        estado: doc.estado
      });
    } catch (e: any) {
      console.error('Error generando PDF de solvencia:', e);
      alert('Error al generar el certificado PDF.');
    }
  };

  const columns = [
    { 
      key: 'id', 
      header: 'ID / Código',
      render: (row: any) => (
        <span className="font-mono font-bold text-xs text-slate-800">
          {row.id}
        </span>
      )
    },
    { 
      key: 'contribuyente', 
      header: 'Contribuyente',
      render: (row: any) => (
        <div>
          <span className="font-semibold text-slate-800 block text-xs">{row.contribuyente}</span>
          <span className="text-[10px] text-slate-500 font-mono">{row.identidad}</span>
        </div>
      )
    },
    { 
      key: 'tipo', 
      header: 'Tipo de Documento',
      render: (row: any) => {
        let badgeBg = 'bg-blue-50 text-blue-700 border-blue-200';
        if (row.categoria === 'SOLVENCIA') badgeBg = 'bg-emerald-50 text-emerald-800 border-emerald-200';
        if (row.categoria === 'VISTO_BUENO') badgeBg = 'bg-purple-50 text-purple-700 border-purple-200';
        if (row.categoria === 'RECIBO') badgeBg = 'bg-amber-50 text-amber-800 border-amber-200';

        return (
          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${badgeBg}`}>
            {row.tipo}
          </span>
        );
      }
    },
    { key: 'fecha', header: 'Fecha de Emisión' },
    { key: 'emisor', header: 'Autorizado / Emisor' },
    { 
      key: 'estado', 
      header: 'Estado', 
      render: (row: any) => {
        const est = (row.estado || '').toLowerCase();
        let badge = 'bg-slate-100 text-slate-700';
        if (est.includes('vigente') || est.includes('aprobado') || est.includes('liquidado') || est.includes('pagad')) {
          badge = 'bg-emerald-100 text-emerald-800';
        } else if (est.includes('pendiente')) {
          badge = 'bg-amber-100 text-amber-800';
        }
        return <span className={`px-2 py-0.5 rounded text-xs font-bold ${badge}`}>{row.estado}</span>;
      } 
    },
    { 
      key: 'actions', 
      header: 'Acciones', 
      render: (row: any) => (
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setSelectedDoc(row)} 
            className="text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 p-1.5 rounded transition-colors text-xs flex items-center gap-1 font-semibold"
            title="Ver Detalle"
          >
            <Eye size={14} /> Detalle
          </button>
          {row.categoria === 'SOLVENCIA' && (
            <button
              onClick={() => handleDescargarSolvencia(row)}
              className="text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 p-1.5 rounded transition-colors text-xs flex items-center gap-1 font-semibold"
              title="Descargar Certificado Oficial PDF"
            >
              <Download size={14} /> Descargar
            </button>
          )}
        </div>
      ) 
    }
  ];

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto p-6 relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-100 text-blue-700 rounded-xl">
            <History className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 uppercase tracking-wide">
              Historial de Documentos & Actos Oficiales
            </h1>
            <p className="text-sm text-slate-500">
              Expediente centralizado de solvencias, recibos y resoluciones emitidas por el municipio
            </p>
          </div>
        </div>

        <button
          onClick={cargarDocumentos}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl shadow-xs transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-blue-600 ${isLoading ? 'animate-spin' : ''}`} />
          {isLoading ? 'Actualizando...' : 'Actualizar Historial'}
        </button>
      </div>

      {/* METRICAS RAPIDAS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Total Documentos</span>
          <span className="text-2xl font-black text-slate-800">{documentos.length}</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-xs">
          <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block mb-1">Solvencias Emitidas</span>
          <span className="text-2xl font-black text-emerald-800">{documentos.filter(d => d.categoria === 'SOLVENCIA').length}</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-amber-200 bg-amber-50/20 shadow-xs">
          <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider block mb-1">Recibos Oficiales</span>
          <span className="text-2xl font-black text-amber-800">{documentos.filter(d => d.categoria === 'RECIBO').length}</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-purple-200 bg-purple-50/20 shadow-xs">
          <span className="text-[11px] font-bold text-purple-700 uppercase tracking-wider block mb-1">Resoluciones Ambientales</span>
          <span className="text-2xl font-black text-purple-800">{documentos.filter(d => d.categoria === 'VISTO_BUENO' || d.categoria === 'SERVICIO').length}</span>
        </div>
      </div>

      {/* FILTROS Y BUSQUEDA */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
          <button
            onClick={() => setFiltroTipo('TODOS')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
              filtroTipo === 'TODOS' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todos ({documentos.length})
          </button>
          <button
            onClick={() => setFiltroTipo('SOLVENCIA')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
              filtroTipo === 'SOLVENCIA' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
            }`}
          >
            Solvencias ({documentos.filter(d => d.categoria === 'SOLVENCIA').length})
          </button>
          <button
            onClick={() => setFiltroTipo('RECIBO')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
              filtroTipo === 'RECIBO' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
            }`}
          >
            Recibos ({documentos.filter(d => d.categoria === 'RECIBO').length})
          </button>
          <button
            onClick={() => setFiltroTipo('VISTO_BUENO')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
              filtroTipo === 'VISTO_BUENO' ? 'bg-purple-600 text-white' : 'bg-purple-50 text-purple-800 hover:bg-purple-100'
            }`}
          >
            Visto Bueno ({documentos.filter(d => d.categoria === 'VISTO_BUENO').length})
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por contribuyente, RIF o código..."
            className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* TABLA PRINCIPAL */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
        {isLoading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <p className="text-sm font-medium">Consultando archivo central de documentos...</p>
          </div>
        ) : (
          <DataTable data={documentosFiltrados} columns={columns} itemsPerPage={12} />
        )}
      </div>

      {/* Modal de Detalle */}
      {selectedDoc && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="px-6 py-4 bg-slate-900 flex items-center justify-between text-white">
              <h3 className="font-bold flex items-center gap-2 text-sm">
                <FileText className="w-4 h-4 text-blue-400" />
                Detalles del Documento - {selectedDoc.id}
              </h3>
              <button onClick={() => setSelectedDoc(null)} className="text-slate-400 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">ID / Referencia</span>
                  <p className="text-xs font-mono font-bold text-slate-800">{selectedDoc.id}</p>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Fecha</span>
                  <p className="text-xs font-semibold text-slate-800">{selectedDoc.fecha}</p>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Tipo de Acto</span>
                  <p className="text-xs font-semibold text-slate-800">{selectedDoc.tipo}</p>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Estado</span>
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 inline-block">
                    {selectedDoc.estado}
                  </span>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 col-span-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Contribuyente Destino</span>
                  <p className="text-sm font-bold text-slate-800">{selectedDoc.contribuyente}</p>
                  <p className="text-xs text-slate-500 font-mono">{selectedDoc.identidad}</p>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 col-span-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Emisor / Autorizado por</span>
                  <p className="text-xs font-semibold text-slate-700">{selectedDoc.emisor}</p>
                </div>
              </div>
              
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Descripción Oficial</span>
                <p className="text-xs text-slate-700 leading-relaxed">
                  {selectedDoc.detalles}
                </p>
              </div>
            </div>
            
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              {selectedDoc.categoria === 'SOLVENCIA' ? (
                <button
                  onClick={() => handleDescargarSolvencia(selectedDoc)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs flex items-center gap-1.5"
                >
                  <Download size={14} /> Descargar Certificado PDF
                </button>
              ) : <div />}

              <button 
                onClick={() => setSelectedDoc(null)} 
                className="px-4 py-2 bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold hover:bg-slate-300 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}