'use client';

import { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Download, 
  RefreshCw, 
  Truck, 
  Scale, 
  MapPin, 
  Calendar, 
  Filter, 
  FileSpreadsheet, 
  FileText,
  Radio,
  ExternalLink
} from 'lucide-react';
import * as xlsx from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function SupervisorRutaReportView({ onBack }: { onBack: () => void }) {
  const [viajes, setViajes] = useState<any[]>([]);
  const [gpsUnits, setGpsUnits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingGps, setLoadingGps] = useState(false);

  // Filtros
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [filtroSupervisor, setFiltroSupervisor] = useState('');
  const [filtroUnidad, setFiltroUnidad] = useState('');
  const [filtroRuta, setFiltroRuta] = useState('');

  // Pestaña actual: Listado de descargas / Sala Situacional en vivo
  const [activeTab, setActiveTab] = useState<'descargas' | 'sala_situacional'>('descargas');

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/supervisor-rutas?limit=1000');
      if (res.ok) {
        const data = await res.json();
        setViajes(data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadGpsUnits = async () => {
    setLoadingGps(true);
    try {
      const res = await fetch('/api/supervisor-rutas/gps');
      if (res.ok) {
        const data = await res.json();
        setGpsUnits(data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingGps(false);
    }
  };

  useEffect(() => {
    loadData();
    loadGpsUnits();

    // Auto-refresh GPS cada 15 segundos para sala situacional
    const interval = setInterval(() => {
      loadGpsUnits();
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  // Filtrado de viajes
  const viajesFiltrados = viajes.filter((v) => {
    if (fechaDesde && v.fecha < fechaDesde) return false;
    if (fechaHasta && v.fecha > fechaHasta) return false;
    if (filtroSupervisor && !v.supervisor?.toLowerCase().includes(filtroSupervisor.toLowerCase())) return false;
    if (filtroUnidad && !v.unidad?.toLowerCase().includes(filtroUnidad.toLowerCase())) return false;
    if (filtroRuta && !v.ruta?.toLowerCase().includes(filtroRuta.toLowerCase())) return false;
    return true;
  });

  // Totales
  const totalToneladas = viajesFiltrados.reduce((acc, v) => acc + (parseFloat(v.toneladas) || 0), 0);
  const totalViajes = viajesFiltrados.length;
  const supervisoresUnicos = Array.from(new Set(viajes.map((v) => v.supervisor).filter(Boolean)));
  const unidadesUnicas = Array.from(new Set(viajes.map((v) => v.unidad).filter(Boolean)));

  // EXPORTAR EXCEL
  const exportarExcel = (porSupervisor?: string) => {
    const dataAExportar = porSupervisor 
      ? viajesFiltrados.filter(v => v.supervisor?.toLowerCase() === porSupervisor.toLowerCase())
      : viajesFiltrados;

    const rows = dataAExportar.map((v, i) => ({
      '#': i + 1,
      'Fecha': v.fecha,
      'Hora': v.created_at ? new Date(v.created_at).toLocaleTimeString() : '',
      'Supervisor': v.supervisor || 'S/A',
      'Unidad / Camión': v.unidad || 'S/A',
      'Chofer': v.chofer || 'S/A',
      'Ruta': v.ruta || 'S/A',
      'Viaje del Día': v.viaje_dia || 1,
      'Toneladas Descargadas (Ton)': v.toneladas || 0,
      'Referencia': v.referencia || '',
      'GPS Lat': v.lat || 'N/D',
      'GPS Lng': v.lng || 'N/D',
      'Observaciones': v.observaciones || ''
    }));

    const ws = xlsx.utils.json_to_sheet(rows);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'Descargas Vertedero');
    const sufijo = porSupervisor ? `_Supervisor_${porSupervisor.replace(/\s+/g, '_')}` : '_General';
    xlsx.writeFile(wb, `Reporte_Descargas_Vertedero${sufijo}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // EXPORTAR PDF
  const exportarPDF = (porSupervisor?: string) => {
    const dataAExportar = porSupervisor 
      ? viajesFiltrados.filter(v => v.supervisor?.toLowerCase() === porSupervisor.toLowerCase())
      : viajesFiltrados;

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'letter' });

    // Encabezado
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, 280, 22, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('ALCALDÍA BOLIVARIANA DEL MUNICIPIO SILVA - GLOBAL TUCACAS', 14, 10);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(
      porSupervisor 
        ? `INFORME DE CONTROL DE RUTAS Y DESCARGA EN VERTEDERO - SUPERVISOR: ${porSupervisor.toUpperCase()}`
        : 'INFORME GENERAL DE CONTROL DE VIAJES Y DESCARGAS EN VERTEDERO MUNICIPAL', 
      14, 16
    );

    // Metadata
    doc.setTextColor(51, 65, 85);
    doc.setFontSize(9);
    doc.text(`Fecha de emisión: ${new Date().toLocaleDateString('es-VE')} | Viajes Registrados: ${dataAExportar.length} | Toneladas Totales: ${dataAExportar.reduce((a, b) => a + (parseFloat(b.toneladas) || 0), 0).toFixed(2)} Ton`, 14, 28);

    const tableBody = dataAExportar.map((v, i) => [
      i + 1,
      v.fecha,
      v.viaje_dia || 1,
      v.unidad,
      v.chofer || 'S/A',
      v.ruta,
      v.supervisor || 'S/A',
      parseFloat(v.toneladas || 0).toFixed(2),
      v.lat && v.lng ? `${v.lat.toFixed(4)}, ${v.lng.toFixed(4)}` : 'S/R',
      v.observaciones || '—'
    ]);

    autoTable(doc, {
      startY: 32,
      head: [['#', 'FECHA', 'VIAJE', 'UNIDAD', 'CHOFER', 'RUTA ASIGNADA', 'SUPERVISOR', 'TONELADAS', 'GPS', 'OBSERVACIONES']],
      body: tableBody,
      headStyles: { fillColor: [16, 185, 129], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
      bodyStyles: { fontSize: 8, textColor: [15, 23, 42] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 14, right: 14 }
    });

    const sufijo = porSupervisor ? `_Supervisor_${porSupervisor.replace(/\s+/g, '_')}` : '_General';
    doc.save(`Informe_Vertedero${sufijo}_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  return (
    <div className="space-y-6">
      {/* HEADER BAR */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors shadow-xs"
            title="Volver a los Reportes"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
              <Truck className="w-7 h-7 text-emerald-600" /> Control de Viajes y Vertedero
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Supervisor de Ruta • Descargas por día, pesaje de toneladas y Sala Situacional GPS
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* BOTÓN IR AL MÓDULO MÓVIL */}
          <a
            href="/operador/supervisor-ruta"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <Radio className="w-4 h-4 animate-pulse" /> Abrir Módulo Móvil de Supervisor
            <ExternalLink className="w-3.5 h-3.5 ml-0.5 opacity-80" />
          </a>

          <button
            onClick={() => { loadData(); loadGpsUnits(); }}
            disabled={loading}
            className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-blue-600 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
        </div>
      </div>

      {/* TABS DE VISTA: DESCARGAS vs SALA SITUACIONAL */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('descargas')}
          className={`px-4 py-2 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'descargas'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Scale className="w-4 h-4" /> Registro de Descargas y Viajes ({viajesFiltrados.length})
        </button>
        <button
          onClick={() => setActiveTab('sala_situacional')}
          className={`px-4 py-2 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'sala_situacional'
              ? 'border-blue-600 text-blue-700 bg-blue-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Radio className="w-4 h-4 text-red-500 animate-pulse" /> Sala Situacional GPS en Tiempo Real ({gpsUnits.length} camiones)
        </button>
      </div>

      {activeTab === 'descargas' ? (
        <>
          {/* TARJETAS RESUMEN */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Viajes</span>
              <div className="text-3xl font-black text-slate-900 mt-1">{totalViajes}</div>
              <span className="text-xs text-slate-500 font-medium">viajes descargados</span>
            </div>

            <div className="bg-white border border-emerald-200 bg-emerald-50/20 rounded-xl p-4 shadow-xs">
              <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">Total Toneladas</span>
              <div className="text-3xl font-black text-emerald-600 mt-1">
                {totalToneladas.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <span className="text-xs text-emerald-700/80 font-medium">toneladas en vertedero</span>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Promedio por Viaje</span>
              <div className="text-3xl font-black text-slate-800 mt-1">
                {totalViajes > 0 ? (totalToneladas / totalViajes).toFixed(2) : '0.00'}
              </div>
              <span className="text-xs text-slate-500 font-medium">toneladas / viaje</span>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Exportar Informes</span>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => exportarExcel(filtroSupervisor || undefined)}
                  className="flex-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 shadow-xs transition-colors"
                  title="Exportar a Excel"
                >
                  <FileSpreadsheet className="w-4 h-4" /> Excel
                </button>
                <button
                  onClick={() => exportarPDF(filtroSupervisor || undefined)}
                  className="flex-1 px-3 py-2 bg-slate-900 hover:bg-black text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 shadow-xs transition-colors"
                  title="Descargar Informe en PDF"
                >
                  <FileText className="w-4 h-4 text-amber-400" /> PDF
                </button>
              </div>
            </div>
          </div>

          {/* FILTROS */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase">
              <Filter className="w-4 h-4 text-emerald-600" /> Filtros de Búsqueda
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Fecha Desde</label>
                <input
                  type="date"
                  value={fechaDesde}
                  onChange={(e) => setFechaDesde(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:border-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Fecha Hasta</label>
                <input
                  type="date"
                  value={fechaHasta}
                  onChange={(e) => setFechaHasta(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:border-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Supervisor</label>
                <select
                  value={filtroSupervisor}
                  onChange={(e) => setFiltroSupervisor(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:border-emerald-500 outline-none bg-white font-medium"
                >
                  <option value="">-- Todos los Supervisores --</option>
                  {supervisoresUnicos.map((sup: any) => (
                    <option key={sup} value={sup}>{sup}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Unidad / Camión</label>
                <select
                  value={filtroUnidad}
                  onChange={(e) => setFiltroUnidad(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:border-emerald-500 outline-none bg-white font-medium"
                >
                  <option value="">-- Todas las Unidades --</option>
                  {unidadesUnicas.map((u: any) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Ruta</label>
                <input
                  type="text"
                  placeholder="Buscar por ruta..."
                  value={filtroRuta}
                  onChange={(e) => setFiltroRuta(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:border-emerald-500 outline-none"
                />
              </div>
            </div>

            {(fechaDesde || fechaHasta || filtroSupervisor || filtroUnidad || filtroRuta) && (
              <div className="flex justify-end pt-1">
                <button
                  onClick={() => {
                    setFechaDesde('');
                    setFechaHasta('');
                    setFiltroSupervisor('');
                    setFiltroUnidad('');
                    setFiltroRuta('');
                  }}
                  className="text-xs text-red-600 hover:underline font-bold"
                >
                  Limpiar todos los filtros
                </button>
              </div>
            )}
          </div>

          {/* TABLA DE RESULTADOS */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-100 text-slate-600 font-bold text-[10px] uppercase border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">Fecha / Hora</th>
                    <th className="px-4 py-3 text-center">Viaje #</th>
                    <th className="px-4 py-3">Unidad / Camión</th>
                    <th className="px-4 py-3">Chofer</th>
                    <th className="px-4 py-3">Ruta Asignada</th>
                    <th className="px-4 py-3">Supervisor</th>
                    <th className="px-4 py-3 text-right">Toneladas (Ton)</th>
                    <th className="px-4 py-3 text-center">GPS</th>
                    <th className="px-4 py-3">Observaciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={10} className="px-4 py-8 text-center text-slate-400">
                        <div className="flex items-center justify-center gap-2">
                          <RefreshCw className="w-4 h-4 animate-spin text-emerald-500" />
                          Cargando historial de descargas...
                        </div>
                      </td>
                    </tr>
                  ) : viajesFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-4 py-8 text-center text-slate-400">
                        No se encontraron viajes registrados con los filtros seleccionados.
                      </td>
                    </tr>
                  ) : (
                    viajesFiltrados.map((v, idx) => (
                      <tr key={v.id || idx} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 font-bold text-slate-400 text-xs">{idx + 1}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="font-bold text-slate-800 text-xs">{v.fecha}</div>
                          <div className="text-[10px] text-slate-400">
                            {v.created_at ? new Date(v.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="bg-emerald-100 text-emerald-800 font-black text-xs px-2 py-0.5 rounded-full border border-emerald-200">
                            #{v.viaje_dia || 1}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-800 text-xs">{v.unidad}</td>
                        <td className="px-4 py-3 text-slate-600 text-xs">{v.chofer || 'S/A'}</td>
                        <td className="px-4 py-3 text-slate-700 text-xs font-medium max-w-[200px] truncate" title={v.ruta}>
                          {v.ruta}
                        </td>
                        <td className="px-4 py-3 text-xs font-semibold text-blue-700">{v.supervisor}</td>
                        <td className="px-4 py-3 text-right font-black text-emerald-600 text-sm">
                          {parseFloat(v.toneladas || 0).toFixed(2)} Ton
                        </td>
                        <td className="px-4 py-3 text-center">
                          {v.lat && v.lng ? (
                            <a
                              href={`https://www.google.com/maps?q=${v.lat},${v.lng}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200"
                              title="Ver ubicación en Google Maps"
                            >
                              <MapPin className="w-3 h-3 text-red-500" />
                              Ver GPS
                            </a>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-medium">S/R</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-500 text-xs max-w-[180px] truncate" title={v.observaciones}>
                          {v.observaciones || '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* SALA SITUACIONAL EN TIEMPO REAL */
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-white shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500 animate-ping" />
                <h2 className="text-lg font-black uppercase tracking-wide">
                  Sala Situacional • Rastreo de Unidades en Ruta
                </h2>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Monitoreo en vivo de camiones y supervisores en campo sin perder la ruta asignada
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="bg-slate-800 text-emerald-400 px-3 py-1.5 rounded-lg border border-slate-700 font-bold flex items-center gap-1.5">
                <Radio className="w-4 h-4 text-emerald-400 animate-pulse" /> {gpsUnits.length} Unidades Activas
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {gpsUnits.length === 0 ? (
              <div className="col-span-full bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-500">
                <Truck className="w-12 h-12 mx-auto text-slate-300 mb-2" />
                <p className="font-semibold text-slate-700">No hay camiones emitiendo señal GPS en este momento.</p>
                <p className="text-xs text-slate-400 mt-1">
                  Cuando el supervisor inicie su jornada desde el teléfono en <strong>Supervisor de Ruta</strong>, el camión aparecerá aquí automáticamente.
                </p>
              </div>
            ) : (
              gpsUnits.map((u: any, idx: number) => {
                const minutosDesdeUpdate = u.updated_at 
                  ? Math.round((Date.now() - new Date(u.updated_at).getTime()) / 60000)
                  : null;
                const estaEnLinea = minutosDesdeUpdate !== null && minutosDesdeUpdate < 10;

                return (
                  <div key={idx} className="bg-white border-2 border-slate-200 hover:border-emerald-500 rounded-xl p-4 shadow-sm transition-all space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <div className="flex items-center gap-2">
                        <Truck className="w-5 h-5 text-emerald-600" />
                        <h3 className="font-black text-slate-900 text-sm">{u.unidad}</h3>
                      </div>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                        estaEnLinea 
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
                          : 'bg-amber-100 text-amber-800 border-amber-300'
                      }`}>
                        {estaEnLinea ? 'EN RUTA' : `HACE ${minutosDesdeUpdate} MIN`}
                      </span>
                    </div>

                    <div className="text-xs space-y-1">
                      <div className="text-slate-600">
                        <span className="font-bold text-slate-700">Ruta:</span> {u.ruta || 'Sin asignar'}
                      </div>
                      <div className="text-slate-600">
                        <span className="font-bold text-slate-700">Supervisor:</span> {u.supervisor || 'S/A'}
                      </div>
                      {u.chofer && (
                        <div className="text-slate-600">
                          <span className="font-bold text-slate-700">Chofer:</span> {u.chofer}
                        </div>
                      )}
                      <div className="text-slate-500 text-[11px] font-mono">
                        Coords: {parseFloat(u.lat).toFixed(4)}, {parseFloat(u.lng).toFixed(4)}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                      <a
                        href={`https://www.google.com/maps?q=${u.lat},${u.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full bg-slate-900 hover:bg-black text-white py-2 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <MapPin className="w-4 h-4 text-red-400" /> Ver Ubicación en Vivo
                      </a>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

