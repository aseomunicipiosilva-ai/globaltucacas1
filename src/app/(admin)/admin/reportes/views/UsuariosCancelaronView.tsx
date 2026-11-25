'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { 
  ArrowLeft, Download, RefreshCw, Calendar, Users, 
  DollarSign, Search, CheckCircle, FileSpreadsheet, MapPin, Building
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/store/AppContext';
import * as xlsx from 'xlsx';

interface Props {
  onBack: () => void;
  pagos: any[];
}

export default function UsuariosCancelaronView({ onBack, pagos: pagosProp }: Props) {
  const { inmuebles, contribuyentes } = useAppContext();
  const [pagosData, setPagosData] = useState<any[]>(pagosProp || []);
  const [loading, setLoading] = useState(false);

  // Filtros de fecha / periodo
  const [modoPeriodo, setModoPeriodo] = useState<'mes' | 'rango'>('mes');
  
  const currentYear = new Date().getFullYear();
  const currentMonth = String(new Date().getMonth() + 1).padStart(2, '0');
  const [mesSeleccionado, setMesSeleccionado] = useState<string>(`${currentYear}-${currentMonth}`);

  const [fechaDesde, setFechaDesde] = useState<string>(`${currentYear}-${currentMonth}-01`);
  const [fechaHasta, setFechaHasta] = useState<string>(new Date().toISOString().split('T')[0]);

  const [searchQuery, setSearchQuery] = useState('');
  const [filtroMetodo, setFiltroMetodo] = useState<string>('TODOS');

  // Si no llegaron pagos por props o se quiere refrescar
  const cargarPagos = async () => {
    setLoading(true);
    try {
      let allPagos: any[] = [];
      const CHUNK_SIZE = 1000;
      let from = 0;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('pagos_reportados')
          .select('id, identidad, contribuyente, monto, banco, referencia, tipo, estado, created_at, detalles')
          .eq('estado', 'Aprobado')
          .range(from, from + CHUNK_SIZE - 1);

        if (error) throw error;
        if (data && data.length > 0) {
          allPagos.push(...data);
          from += CHUNK_SIZE;
          if (data.length < CHUNK_SIZE) hasMore = false;
        } else {
          hasMore = false;
        }
      }

      setPagosData(allPagos);
    } catch (e) {
      console.error('Error cargando pagos:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!pagosProp || pagosProp.length === 0) {
      cargarPagos();
    }
  }, []);

  // Helper para normalizar RIF
  const cleanId = (s: string) => (s || '').replace(/[-.\s]/g, '').toUpperCase();

  // Mapear nombre e inmuebles
  const contribuyentesLookup = useMemo(() => {
    const map = new Map<string, { nombre: string; direccion: string; localesCount: number }>();
    (inmuebles || []).forEach((inm: any) => {
      const id = cleanId(inm.identidad);
      if (!id) return;
      if (!map.has(id)) {
        map.set(id, {
          nombre: inm.contribuyente || '',
          direccion: inm.direccion || '',
          localesCount: 1
        });
      } else {
        const item = map.get(id)!;
        item.localesCount += 1;
        if (!item.direccion && inm.direccion) item.direccion = inm.direccion;
      }
    });

    (contribuyentes || []).forEach((c: any) => {
      const id = cleanId(c.identidad || c.Identidad);
      if (!id) return;
      if (!map.has(id)) {
        map.set(id, {
          nombre: c.contribuyente || c.Contribuyente || '',
          direccion: c.direccion || c.Direccion || '',
          localesCount: 1
        });
      }
    });

    return map;
  }, [inmuebles, contribuyentes]);

  // Filtrar pagos por período (mes o rango de fechas)
  const pagosEnPeriodo = useMemo(() => {
    return pagosData.filter((p: any) => {
      if (p.estado !== 'Aprobado') return false;

      const fechaStr = p.created_at ? p.created_at.split('T')[0] : '';
      if (!fechaStr) return false;

      if (modoPeriodo === 'mes') {
        return fechaStr.startsWith(mesSeleccionado);
      } else {
        return fechaStr >= fechaDesde && fechaStr <= fechaHasta;
      }
    });
  }, [pagosData, modoPeriodo, mesSeleccionado, fechaDesde, fechaHasta]);

  // Consolidar por contribuyente único que canceló
  const usuariosCancelaron = useMemo(() => {
    const map = new Map<string, {
      identidad: string;
      nombre: string;
      direccion: string;
      localesCount: number;
      cantidadPagos: number;
      totalCanceladoBs: number;
      ultFechaPago: string;
      metodosUsados: Set<string>;
      referencias: string[];
    }>();

    pagosEnPeriodo.forEach((p: any) => {
      const rawId = p.identidad || 'S/N';
      const idKey = cleanId(rawId);
      if (!idKey) return;

      const lookup = contribuyentesLookup.get(idKey);
      const nombreContrib = lookup?.nombre || p.contribuyente || rawId;
      const dirContrib = lookup?.direccion || 'Tucacas, Silva';
      const locales = lookup?.localesCount || 1;
      const montoPago = parseFloat(p.monto || '0') || 0;
      const fechaPago = p.created_at ? p.created_at.split('T')[0] : '';
      const metodo = p.tipo || p.banco || 'Transferencia';
      const ref = p.referencia || p.id;

      if (!map.has(idKey)) {
        map.set(idKey, {
          identidad: rawId,
          nombre: nombreContrib,
          direccion: dirContrib,
          localesCount: locales,
          cantidadPagos: 1,
          totalCanceladoBs: montoPago,
          ultFechaPago: fechaPago,
          metodosUsados: new Set([metodo]),
          referencias: [ref]
        });
      } else {
        const item = map.get(idKey)!;
        item.cantidadPagos += 1;
        item.totalCanceladoBs += montoPago;
        item.metodosUsados.add(metodo);
        if (ref && !item.referencias.includes(ref)) item.referencias.push(ref);
        if (fechaPago > item.ultFechaPago) item.ultFechaPago = fechaPago;
      }
    });

    return Array.from(map.values()).sort((a, b) => b.totalCanceladoBs - a.totalCanceladoBs);
  }, [pagosEnPeriodo, contribuyentesLookup]);

  // Filtro de búsqueda y método
  const usuariosFiltrados = useMemo(() => {
    return usuariosCancelaron.filter(u => {
      if (filtroMetodo !== 'TODOS') {
        const hasMetodo = Array.from(u.metodosUsados).some(m => m.toLowerCase().includes(filtroMetodo.toLowerCase()));
        if (!hasMetodo) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nom = u.nombre.toLowerCase();
        const id = u.identidad.toLowerCase();
        const dir = u.direccion.toLowerCase();
        if (!nom.includes(q) && !id.includes(q) && !dir.includes(q)) return false;
      }

      return true;
    });
  }, [usuariosCancelaron, filtroMetodo, searchQuery]);

  // Métricas del período
  const totalRecaudadoPeriodo = useMemo(() => {
    return usuariosFiltrados.reduce((acc, u) => acc + u.totalCanceladoBs, 0);
  }, [usuariosFiltrados]);

  const totalTransaccionesPeriodo = useMemo(() => {
    return usuariosFiltrados.reduce((acc, u) => acc + u.cantidadPagos, 0);
  }, [usuariosFiltrados]);

  // Exportar Excel
  const exportarExcel = () => {
    const periodoLabel = modoPeriodo === 'mes' ? `Mes: ${mesSeleccionado}` : `Desde ${fechaDesde} Hasta ${fechaHasta}`;
    
    const rows = usuariosFiltrados.map((u, i) => [
      i + 1,
      u.identidad,
      u.nombre,
      u.localesCount > 1 ? `${u.localesCount} Inmuebles` : '1 Inmueble',
      u.cantidadPagos,
      u.ultFechaPago,
      Array.from(u.metodosUsados).join(', '),
      u.totalCanceladoBs,
      u.direccion
    ]);

    const wsData = [
      ['ALCALDÍA DEL MUNICIPIO SILVA - INSTITUTO AUTÓNOMO DE ASEO URBANO (ISMA)'],
      ['REPORTE CONSOLIDADO DE USUARIOS QUE CANCELARON EN EL PERÍODO'],
      [`Período de Consulta: ${periodoLabel}  |  Generado: ${new Date().toLocaleDateString('es-VE')}`],
      [`Total Usuarios Únicos: ${usuariosFiltrados.length}  |  Total Transacciones: ${totalTransaccionesPeriodo}  |  Total Recaudado: Bs. ${totalRecaudadoPeriodo.toLocaleString('es-VE', { minimumFractionDigits: 2 })}`],
      [],
      ['N°', 'RIF / CÉDULA', 'CONTRIBUYENTE', 'LOCALES / ACTIVIDADES', 'CANT. PAGOS', 'ÚLTIMO PAGO', 'MÉTODOS', 'TOTAL CANCELADO (Bs)', 'DIRECCIÓN / SECTOR'],
      ...rows,
      [],
      ['', '', '', '', '', '', 'TOTAL GENERAL:', totalRecaudadoPeriodo]
    ];

    const ws = xlsx.utils.aoa_to_sheet(wsData);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'Usuarios que Cancelaron');
    xlsx.writeFile(wb, `Usuarios_Cancelaron_${modoPeriodo === 'mes' ? mesSeleccionado : 'Periodo'}.xlsx`);
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
            title="Regresar a Reportes"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full">
                Módulo de Recaudación y Liquidación
              </span>
            </div>
            <h1 className="text-xl font-black text-slate-800 tracking-tight mt-1">
              Usuarios que Cancelaron por Período
            </h1>
            <p className="text-xs text-slate-500">
              Conteo exacto de contribuyentes únicos que liquidaron facturas durante el mes o rango seleccionado.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={cargarPagos}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition-all shadow-xs disabled:opacity-50"
            title="Refrescar transacciones"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
            <span>Refrescar</span>
          </button>

          <button
            onClick={exportarExcel}
            disabled={usuariosFiltrados.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm disabled:opacity-50"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Exportar Excel (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* SELECTOR DE PERÍODO (MES O RANGO) */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Definir Período de Consulta
            </span>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setModoPeriodo('mes')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                modoPeriodo === 'mes' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Por Mes Calendario
            </button>
            <button
              onClick={() => setModoPeriodo('rango')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                modoPeriodo === 'rango' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Rango de Fechas Personalizado
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
          {modoPeriodo === 'mes' ? (
            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">Mes y Año:</label>
              <input
                type="month"
                value={mesSeleccionado}
                onChange={e => setMesSeleccionado(e.target.value)}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-emerald-500 bg-white"
              />
            </div>
          ) : (
            <>
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Fecha Desde:</label>
                <input
                  type="date"
                  value={fechaDesde}
                  onChange={e => setFechaDesde(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-emerald-500 bg-white"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Fecha Hasta:</label>
                <input
                  type="date"
                  value={fechaHasta}
                  onChange={e => setFechaHasta(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-emerald-500 bg-white"
                />
              </div>
            </>
          )}

          <div className="relative">
            <label className="text-[11px] font-bold text-slate-600 block mb-1">Buscador Rápido:</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Buscar por RIF, nombre o dirección..."
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-xs outline-none focus:border-emerald-500 bg-white"
              />
            </div>
          </div>
        </div>
      </div>

      {/* TARJETAS DE MÉTRICAS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-emerald-100 text-emerald-700 rounded-xl">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Usuarios Únicos que Cancelaron
            </span>
            <div className="text-2xl font-black text-slate-800 mt-0.5">
              {usuariosFiltrados.length}
            </div>
            <p className="text-[10px] text-emerald-700 font-semibold mt-0.5">
              Contribuyentes que pagaron en el período
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-blue-200 bg-blue-50/20 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-blue-100 text-blue-700 rounded-xl">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wider block">
              Pagos Procesados
            </span>
            <div className="text-2xl font-black text-blue-900 mt-0.5">
              {totalTransaccionesPeriodo}
            </div>
            <p className="text-[10px] text-blue-700 font-semibold mt-0.5">
              Recibos y facturas canceladas en total
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-emerald-200 bg-emerald-50/30 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-emerald-500 text-white rounded-xl shadow-xs">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
              Monto Total Recaudado
            </span>
            <div className="text-2xl font-black text-emerald-900 mt-0.5">
              Bs. {totalRecaudadoPeriodo.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-[10px] text-emerald-700 font-semibold mt-0.5">
              Ingreso efectivo liquidado
            </p>
          </div>
        </div>
      </div>

      {/* TABLA DE CONTRIBUYENTES QUE CANCELARON */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="bg-slate-50/80 px-6 py-3.5 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            Listado de Contribuyentes con Pagos en el Período
          </h3>
          <span className="text-xs text-slate-500 font-medium">
            {usuariosFiltrados.length} usuarios encontrados
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 uppercase text-[10px]">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">RIF / Cédula</th>
                <th className="px-4 py-3">Contribuyente</th>
                <th className="px-4 py-3 text-center">Inmuebles / Locales</th>
                <th className="px-4 py-3 text-center">Cant. Pagos</th>
                <th className="px-4 py-3">Último Pago</th>
                <th className="px-4 py-3">Métodos Usados</th>
                <th className="px-4 py-3 text-right">Total Cancelado (Bs)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {usuariosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-400">
                    No se encontraron pagos registrados en el período seleccionado.
                  </td>
                </tr>
              ) : (
                usuariosFiltrados.slice(0, 200).map((u, i) => (
                  <tr key={u.identidad || i} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-2.5 font-mono text-slate-400 text-[11px]">{i + 1}</td>
                    <td className="px-4 py-2.5 font-mono font-bold text-slate-800 whitespace-nowrap">
                      {u.identidad}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="font-semibold text-slate-800 block">{u.nombre}</span>
                      <span className="text-[10px] text-slate-400 block max-w-xs truncate" title={u.direccion}>
                        {u.direccion}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        {u.localesCount > 1 ? `${u.localesCount} Inmuebles` : '1 Inmueble'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-center font-bold text-slate-700">
                      <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                        {u.cantidadPagos} {u.cantidadPagos === 1 ? 'pago' : 'pagos'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-slate-600 whitespace-nowrap">
                      {u.ultFechaPago || 'N/A'}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {Array.from(u.metodosUsados).map((m: string, idx) => (
                          <span key={idx} className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[9px] font-semibold">
                            {m}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono font-black text-emerald-700 whitespace-nowrap">
                      Bs. {u.totalCanceladoBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {usuariosFiltrados.length > 200 && (
          <div className="p-3 bg-slate-50 text-center text-xs text-slate-500 border-t border-slate-200">
            Mostrando primeros 200 contribuyentes de {usuariosFiltrados.length}. Puedes exportar el reporte a Excel para ver el listado completo.
          </div>
        )}
      </div>
    </div>
  );
}