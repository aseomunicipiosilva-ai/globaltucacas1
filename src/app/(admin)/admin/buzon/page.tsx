'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { 
  Inbox, CheckCircle, XCircle, Eye, Filter, MessageSquareWarning, 
  Wrench, ShieldCheck, SearchCheck, X, FileText, Calendar, User, 
  RefreshCw, Loader2, DollarSign, Clock, MapPin
} from 'lucide-react';
import { DataTable } from '@/components/DataTable';
import { supabase } from '@/lib/supabase';

export default function BuzonSolicitudesPage() {
  const [activeTab, setActiveTab] = useState('Todas');
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [solicitudSeleccionada, setSolicitudSeleccionada] = useState<any>(null);
  const [solicitudes, setSolicitudes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  const cargarSolicitudes = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Cargar reclamos y denuncias
      const { data: dbReclamos } = await supabase
        .from('reclamos')
        .select('*')
        .order('created_at', { ascending: false });

      // 2. Cargar servicios especiales (extraordinario, visto_bueno, inspeccion, etc.)
      const { data: dbServicios } = await supabase
        .from('servicios_especiales')
        .select('*')
        .order('created_at', { ascending: false });

      const listaCombinada: any[] = [];

      // Mapear Reclamos
      (dbReclamos || []).forEach((r: any) => {
        listaCombinada.push({
          id: r.ticket || `REC-${r.id}`,
          rawId: r.id,
          tabla: 'reclamos',
          tipo: 'Reclamos / Sugerencias',
          fecha: r.fecha || (r.created_at ? r.created_at.split('T')[0] : 'N/A'),
          contribuyente: r.contribuyente || 'Contribuyente',
          identidad: r.identidad || 'N/A',
          asunto: r.sector ? `${r.tipo ? `[${r.tipo}] ` : ''}${r.sector}` : (r.tipo || 'Reclamo de usuario'),
          estado: r.estado || 'Pendiente',
          monto: null,
          created_at: r.created_at,
          icon: MessageSquareWarning,
          color: 'text-orange-500',
          bg: 'bg-orange-50'
        });
      });

      // Mapear Servicios Especiales
      (dbServicios || []).forEach((s: any) => {
        let tipoCategoria = 'Servicios Extraordinarios';
        let iconComp = Wrench;
        let colorClass = 'text-blue-500';
        let bgClass = 'bg-blue-50';

        if (s.tipo === 'visto_bueno') {
          tipoCategoria = 'Visto Bueno Ambiental';
          iconComp = ShieldCheck;
          colorClass = 'text-green-500';
          bgClass = 'bg-green-50';
        } else if (s.tipo === 'inspeccion') {
          tipoCategoria = 'Inspección';
          iconComp = SearchCheck;
          colorClass = 'text-purple-500';
          bgClass = 'bg-purple-50';
        }

        listaCombinada.push({
          id: s.referencia || `SRV-${s.id}`,
          rawId: s.id,
          tabla: 'servicios_especiales',
          tipo: tipoCategoria,
          tipoOriginal: s.tipo,
          fecha: s.fecha || (s.created_at ? s.created_at.split('T')[0] : 'N/A'),
          contribuyente: s.contribuyente || 'Contribuyente',
          identidad: s.identidad || 'N/A',
          asunto: s.descripcion || 'Sin descripción',
          notas: s.notas || '',
          monto: s.monto || 0,
          origen: s.origen || 'portal',
          estado: s.estado || 'Pendiente',
          created_at: s.created_at,
          icon: iconComp,
          color: colorClass,
          bg: bgClass
        });
      });

      // Ordenar por fecha de creación descendente (los más recientes primero)
      listaCombinada.sort((a, b) => {
        const timeA = new Date(a.created_at || a.fecha || 0).getTime();
        const timeB = new Date(b.created_at || b.fecha || 0).getTime();
        return timeB - timeA;
      });

      setSolicitudes(listaCombinada);
    } catch (err) {
      console.error('Error cargando solicitudes del buzón:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarSolicitudes();
  }, [cargarSolicitudes]);

  const tabs = ['Todas', 'Reclamos / Sugerencias', 'Servicios Extraordinarios', 'Visto Bueno Ambiental', 'Inspección'];

  const filteredSolicitudes = activeTab === 'Todas' ? solicitudes : solicitudes.filter(s => s.tipo === activeTab);

  const handleUpdateEstado = async (item: any, nuevoEstado: string) => {
    setIsProcessingAction(true);
    try {
      if (item.tabla === 'reclamos') {
        const { error } = await supabase
          .from('reclamos')
          .update({ estado: nuevoEstado })
          .eq('id', item.rawId);
        if (error) throw error;
      } else if (item.tabla === 'servicios_especiales') {
        const { error } = await supabase
          .from('servicios_especiales')
          .update({ estado: nuevoEstado })
          .eq('id', item.rawId);
        if (error) throw error;
      }

      setSolicitudes(prev => prev.map(s => (s.id === item.id ? { ...s, estado: nuevoEstado } : s)));
      if (solicitudSeleccionada && solicitudSeleccionada.id === item.id) {
        setSolicitudSeleccionada((prev: any) => ({ ...prev, estado: nuevoEstado }));
      }
    } catch (err: any) {
      console.error('Error actualizando solicitud:', err);
      alert('Error al actualizar la solicitud en base de datos.');
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleViewDetails = (row: any) => {
    setSolicitudSeleccionada(row);
    setIsViewModalOpen(true);
  };

  const columns = [
    { key: 'id', header: 'Ticket' },
    { 
      key: 'tipo', 
      header: 'Categoría', 
      render: (row: any) => (
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${row.bg}`}>
            <row.icon className={`w-4 h-4 ${row.color}`} />
          </div>
          <span className="font-medium text-slate-700">{row.tipo}</span>
        </div>
      )
    },
    { key: 'fecha', header: 'Fecha' },
    { 
      key: 'contribuyente', 
      header: 'Solicitante',
      render: (row: any) => (
        <div>
          <span className="font-semibold text-slate-800 block text-xs">{row.contribuyente}</span>
          <span className="text-[10px] text-slate-500 font-mono">{row.identidad}</span>
        </div>
      )
    },
    { 
      key: 'asunto', 
      header: 'Asunto / Descripción', 
      render: (row: any) => (
        <span className="truncate max-w-xs block text-xs text-slate-600" title={row.asunto}>
          {row.asunto}
        </span>
      ) 
    },
    { 
      key: 'estado', 
      header: 'Estado', 
      render: (row: any) => {
        let badgeClass = '';
        if (row.estado === 'Pendiente' || row.estado === 'En Revisión') {
          badgeClass = 'bg-amber-100 text-amber-700 border border-amber-200';
        } else if (row.estado === 'Aprobado' || row.estado === 'Pagado') {
          badgeClass = 'bg-emerald-100 text-emerald-700 border border-emerald-200';
        } else if (row.estado === 'Rechazado') {
          badgeClass = 'bg-red-100 text-red-700 border border-red-200';
        } else {
          badgeClass = 'bg-slate-100 text-slate-700 border border-slate-200';
        }
        return <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${badgeClass}`}>{row.estado}</span>;
      } 
    },
    { 
      key: 'acciones', 
      header: 'Acciones', 
      render: (row: any) => (
        <div className="flex gap-2">
          <button 
            onClick={() => handleViewDetails(row)} 
            className="bg-slate-100 text-slate-600 hover:bg-slate-200 p-1.5 rounded transition-colors" 
            title="Ver Detalles"
          >
            <Eye className="w-4 h-4" />
          </button>
          {row.estado === 'Pendiente' && (
            <>
              <button 
                onClick={() => handleUpdateEstado(row, 'Aprobado')} 
                disabled={isProcessingAction}
                className="bg-emerald-50 text-emerald-600 hover:bg-emerald-100 p-1.5 rounded transition-colors disabled:opacity-50" 
                title="Aprobar Solicitud"
              >
                <CheckCircle className="w-4 h-4" />
              </button>
              <button 
                onClick={() => handleUpdateEstado(row, 'Rechazado')} 
                disabled={isProcessingAction}
                className="bg-red-50 text-red-600 hover:bg-red-100 p-1.5 rounded transition-colors disabled:opacity-50" 
                title="Rechazar Solicitud"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      ) 
    }
  ];

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto p-6">
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-100 p-2 rounded-lg">
            <Inbox className="w-6 h-6 text-indigo-700" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 uppercase tracking-wide">
              Buzón de Solicitudes
            </h1>
            <p className="text-sm text-slate-500">Gestión y aprobación de trámites generados desde el portal web en tiempo real</p>
          </div>
        </div>

        {/* Botón de actualizar en tiempo real */}
        <button
          onClick={cargarSolicitudes}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-sm rounded-lg shadow-sm transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 text-indigo-600 ${isLoading ? 'animate-spin' : ''}`} />
          {isLoading ? 'Actualizando...' : 'Actualizar Solicitudes'}
        </button>
      </div>
      
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4 rounded-r flex items-center justify-between">
        <div className="flex items-start">
          <div className="ml-1">
            <p className="text-sm text-blue-700 font-medium">
              En este buzón se centralizan las solicitudes de "Reclamos / Sugerencias", "Servicios Extraordinarios", "Visto Bueno Ambiental" e "Inspecciones" para su revisión y aprobación directa.
            </p>
          </div>
        </div>
        <div className="text-xs font-semibold text-blue-800 bg-blue-100/70 px-3 py-1 rounded-full whitespace-nowrap">
          {solicitudes.length} solicitudes registradas
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-6">
        <Filter className="w-4 h-4 text-slate-400 mr-2" />
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              activeTab === tab ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {tab}
            <span className="ml-1.5 text-xs opacity-80">
              ({tab === 'Todas' ? solicitudes.length : solicitudes.filter(s => s.tipo === tab).length})
            </span>
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            <p className="text-sm font-medium">Cargando solicitudes desde la base de datos...</p>
          </div>
        ) : (
          <DataTable data={filteredSolicitudes} columns={columns} itemsPerPage={10} />
        )}
      </div>

      {isViewModalOpen && solicitudSeleccionada && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <solicitudSeleccionada.icon className={`w-5 h-5 ${solicitudSeleccionada.color}`} />
                Detalles del Ticket {solicitudSeleccionada.id}
              </h3>
              <button onClick={() => setIsViewModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-1">
                    <User className="w-3 h-3"/> Solicitante
                  </span>
                  <p className="text-sm font-semibold text-slate-700">{solicitudSeleccionada.contribuyente}</p>
                  <p className="text-xs text-slate-500 font-mono">{solicitudSeleccionada.identidad}</p>
                </div>

                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-1">
                    <Calendar className="w-3 h-3"/> Fecha de Solicitud
                  </span>
                  <p className="text-sm font-semibold text-slate-700">{solicitudSeleccionada.fecha}</p>
                </div>

                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 col-span-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-1">
                    <FileText className="w-3 h-3"/> Asunto / Descripción
                  </span>
                  <p className="text-sm font-medium text-slate-700 whitespace-pre-wrap">{solicitudSeleccionada.asunto}</p>
                </div>

                {solicitudSeleccionada.notas && (
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 col-span-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-1">
                      <MapPin className="w-3 h-3"/> Notas Adicionales
                    </span>
                    <p className="text-xs text-slate-600">{solicitudSeleccionada.notas}</p>
                  </div>
                )}

                {solicitudSeleccionada.monto > 0 && (
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-1">
                      <DollarSign className="w-3 h-3"/> Monto Estimado
                    </span>
                    <p className="text-sm font-bold text-emerald-700">Bs. {Number(solicitudSeleccionada.monto).toLocaleString('es-VE', { minimumFractionDigits: 2 })}</p>
                  </div>
                )}

                <div className={`bg-slate-50 p-3 rounded-lg border border-slate-100 ${solicitudSeleccionada.monto > 0 ? '' : 'col-span-2'}`}>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Estado Actual</span>
                  <div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold inline-block ${
                      solicitudSeleccionada.estado === 'Pendiente' ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                      solicitudSeleccionada.estado === 'Aprobado' || solicitudSeleccionada.estado === 'Pagado' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
                      'bg-red-100 text-red-700 border border-red-200'
                    }`}>
                      {solicitudSeleccionada.estado}
                    </span>
                  </div>
                </div>
              </div>

              {solicitudSeleccionada.estado === 'Pendiente' && (
                <div className="pt-4 border-t border-slate-100 flex gap-3">
                  <button 
                    disabled={isProcessingAction}
                    onClick={() => { handleUpdateEstado(solicitudSeleccionada, 'Aprobado'); setIsViewModalOpen(false); }}
                    className="flex-1 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <CheckCircle className="w-4 h-4" /> Aprobar Trámite
                  </button>
                  <button 
                    disabled={isProcessingAction}
                    onClick={() => { handleUpdateEstado(solicitudSeleccionada, 'Rechazado'); setIsViewModalOpen(false); }}
                    className="flex-1 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <XCircle className="w-4 h-4" /> Rechazar Trámite
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}