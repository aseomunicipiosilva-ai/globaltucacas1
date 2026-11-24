'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, Users, Target, FileDown, Plus, MapPin, CheckCircle, RefreshCw, Loader2, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface JornadaItem {
  id: string | number;
  dbId?: number;
  fecha: string;
  sector: string;
  equipo: string;
  status: string;
  comerciosA_Visitar: number;
  comercios_Visitados: number;
}

const JORNADAS_INICIALES: JornadaItem[] = [
  { id: 1, fecha: '2026-09-08', sector: 'Casco Central', equipo: 'Equipo A', status: 'Planificada', comerciosA_Visitar: 45, comercios_Visitados: 0 },
  { id: 2, fecha: '2026-09-10', sector: 'Carretera Nacional', equipo: 'Equipo B', status: 'Planificada', comerciosA_Visitar: 30, comercios_Visitados: 0 },
];

export default function JornadasPage() {
  const [jornadas, setJornadas] = useState<JornadaItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [nuevaJornada, setNuevaJornada] = useState({ fecha: '', sector: '', equipo: '', comercios: 0 });

  // Cargar jornadas desde Supabase
  const cargarJornadas = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('servicios_especiales')
        .select('*')
        .eq('origen', 'jornada_campo')
        .order('created_at', { ascending: false });

      if (data && data.length > 0) {
        const parseadas: JornadaItem[] = data.map((d: any) => {
          let metadata: any = {};
          try {
            metadata = JSON.parse(d.descripcion);
          } catch {
            metadata = {};
          }
          return {
            id: d.referencia || d.id,
            dbId: d.id,
            fecha: d.fecha || metadata.fecha || (d.created_at ? d.created_at.split('T')[0] : ''),
            sector: metadata.sector || d.notas || 'Sector no especificado',
            equipo: metadata.equipo || d.contribuyente || 'Equipo general',
            status: d.estado || metadata.status || 'Planificada',
            comerciosA_Visitar: Number(metadata.comerciosA_Visitar || metadata.comercios || 0),
            comercios_Visitados: Number(metadata.comercios_Visitados || 0)
          };
        });
        setJornadas(parseadas);
        localStorage.setItem('jornadas_campo_cache', JSON.stringify(parseadas));
      } else {
        // Si aún no hay en DB, verificar localStorage o iniciales
        const cached = localStorage.getItem('jornadas_campo_cache');
        if (cached) {
          try {
            setJornadas(JSON.parse(cached));
          } catch {
            setJornadas(JORNADAS_INICIALES);
          }
        } else {
          setJornadas(JORNADAS_INICIALES);
        }
      }
    } catch (err) {
      console.error('Error cargando jornadas:', err);
      const cached = localStorage.getItem('jornadas_campo_cache');
      if (cached) {
        try { setJornadas(JSON.parse(cached)); } catch {}
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarJornadas();
  }, [cargarJornadas]);

  const agregarJornada = async () => {
    if (!nuevaJornada.fecha || !nuevaJornada.sector || !nuevaJornada.equipo) {
      return alert("Por favor completa todos los campos requeridos.");
    }
    setIsSubmitting(true);

    const refCodigo = `JOR-${Date.now()}`;
    const payloadMetadata = {
      tipo_registro: 'jornada_campo',
      fecha: nuevaJornada.fecha,
      sector: nuevaJornada.sector,
      equipo: nuevaJornada.equipo,
      comerciosA_Visitar: Number(nuevaJornada.comercios) || 0,
      comercios_Visitados: 0,
      status: 'Planificada'
    };

    try {
      const { data, error } = await supabase
        .from('servicios_especiales')
        .insert([{
          tipo: 'extraordinario',
          identidad: 'JORNADA-CAMPO',
          contribuyente: nuevaJornada.equipo,
          descripcion: JSON.stringify(payloadMetadata),
          monto: 0,
          fecha: nuevaJornada.fecha,
          referencia: refCodigo,
          notas: nuevaJornada.sector,
          estado: 'Planificada',
          origen: 'jornada_campo'
        }])
        .select()
        .single();

      if (error) {
        console.warn('Error guardando en Supabase, guardando en respaldo local:', error);
      }

      const itemNuevo: JornadaItem = {
        id: refCodigo,
        dbId: data?.id,
        fecha: nuevaJornada.fecha,
        sector: nuevaJornada.sector,
        equipo: nuevaJornada.equipo,
        status: 'Planificada',
        comerciosA_Visitar: Number(nuevaJornada.comercios) || 0,
        comercios_Visitados: 0
      };

      const updated = [itemNuevo, ...jornadas];
      setJornadas(updated);
      localStorage.setItem('jornadas_campo_cache', JSON.stringify(updated));

      setIsModalOpen(false);
      setNuevaJornada({ fecha: '', sector: '', equipo: '', comercios: 0 });
      alert("¡Jornada de campo guardada exitosamente!");
    } catch (err: any) {
      console.error('Error al guardar jornada:', err);
      // Respaldo local para asegurar que nunca se pierda
      const itemNuevo: JornadaItem = {
        id: refCodigo,
        fecha: nuevaJornada.fecha,
        sector: nuevaJornada.sector,
        equipo: nuevaJornada.equipo,
        status: 'Planificada',
        comerciosA_Visitar: Number(nuevaJornada.comercios) || 0,
        comercios_Visitados: 0
      };
      const updated = [itemNuevo, ...jornadas];
      setJornadas(updated);
      localStorage.setItem('jornadas_campo_cache', JSON.stringify(updated));
      setIsModalOpen(false);
      setNuevaJornada({ fecha: '', sector: '', equipo: '', comercios: 0 });
      alert("Jornada registrada en el sistema.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const eliminarJornada = async (item: JornadaItem) => {
    if (!confirm(`¿Desea eliminar la jornada del sector "${item.sector}"?`)) return;
    try {
      if (item.dbId) {
        await supabase.from('servicios_especiales').delete().eq('id', item.dbId);
      }
      const updated = jornadas.filter(j => j.id !== item.id);
      setJornadas(updated);
      localStorage.setItem('jornadas_campo_cache', JSON.stringify(updated));
    } catch (err) {
      console.error('Error al eliminar jornada:', err);
    }
  };

  const exportarReportePDF = () => {
    const csvRows = [
      ['Fecha', 'Sector', 'Equipo Asignado', 'Meta Comercios', 'Estatus'].join(';')
    ];
    jornadas.forEach(j => {
      csvRows.push([
        `"${j.fecha}"`,
        `"${j.sector}"`,
        `"${j.equipo}"`,
        j.comerciosA_Visitar,
        `"${j.status}"`
      ].join(';'));
    });
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Reporte_Jornadas_Campo_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto p-6 relative">
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <Calendar className="w-8 h-8 text-orange-600" />
          <div>
            <h1 className="text-2xl font-bold text-slate-800 uppercase tracking-wide">Jornadas de Campo (Censo)</h1>
            <p className="text-sm text-slate-500">Planificación, asignación y seguimiento de operativos de censo en calle</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={cargarJornadas}
            disabled={isLoading}
            className="p-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
            title="Actualizar datos"
          >
            <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin text-orange-600' : ''}`} />
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow"
          >
            <Plus size={16} /> Planificar Jornada
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex items-center gap-4">
          <div className="bg-blue-100 p-4 rounded-full">
            <Target className="w-8 h-8 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-500">Comercios Objetivo (Meta)</p>
            <p className="text-2xl font-black text-slate-800">{jornadas.reduce((a,b)=>a+(Number(b.comerciosA_Visitar)||0),0)}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex items-center gap-4">
          <div className="bg-emerald-100 p-4 rounded-full">
            <CheckCircle className="w-8 h-8 text-emerald-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-500">Jornadas Registradas</p>
            <p className="text-2xl font-black text-slate-800">{jornadas.length}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-500">Exportar Operatividad</p>
            <p className="text-xs text-slate-400 mt-1">Descarga el cronograma de jornadas en CSV / Excel.</p>
          </div>
          <button onClick={exportarReportePDF} className="bg-slate-100 hover:bg-slate-200 p-3 rounded-full text-slate-700 transition-colors" title="Descargar CSV">
            <FileDown className="w-6 h-6" />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <h2 className="font-bold text-slate-800">Cronograma de Jornadas</h2>
          <span className="text-xs text-slate-500 font-semibold">{jornadas.length} jornadas activas</span>
        </div>
        <div className="p-0 overflow-x-auto">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
              <p className="text-sm">Cargando jornadas...</p>
            </div>
          ) : jornadas.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <p className="text-sm font-medium">No hay jornadas planificadas</p>
              <p className="text-xs text-slate-400 mt-1">Haz clic en "Planificar Jornada" para crear una.</p>
            </div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50">
                <tr>
                  <th className="px-6 py-3">Fecha</th>
                  <th className="px-6 py-3">Sector</th>
                  <th className="px-6 py-3">Equipo Asignado</th>
                  <th className="px-6 py-3">Meta Comercios</th>
                  <th className="px-6 py-3">Estatus</th>
                  <th className="px-6 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {jornadas.map(j => (
                  <tr key={j.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-6 py-4 font-semibold text-slate-800">{j.fecha}</td>
                    <td className="px-6 py-4 flex items-center gap-2 font-medium text-slate-700">
                      <MapPin size={14} className="text-orange-500"/> {j.sector}
                    </td>
                    <td className="px-6 py-4 text-slate-600">{j.equipo}</td>
                    <td className="px-6 py-4 font-semibold text-slate-800">{j.comerciosA_Visitar}</td>
                    <td className="px-6 py-4">
                      <span className="bg-orange-100 text-orange-700 px-2.5 py-1 rounded-full text-xs font-bold">{j.status}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => eliminarJornada(j)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded transition-colors"
                        title="Eliminar Jornada"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="font-bold text-lg mb-4 text-slate-800">Planificar Nueva Jornada</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Fecha de la Jornada *</label>
                <input 
                  type="date" 
                  value={nuevaJornada.fecha} 
                  onChange={e=>setNuevaJornada({...nuevaJornada, fecha: e.target.value})} 
                  className="w-full border border-slate-300 p-2.5 rounded-lg text-sm outline-none focus:border-orange-500" 
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Sector / Zona *</label>
                <input 
                  type="text" 
                  value={nuevaJornada.sector} 
                  onChange={e=>setNuevaJornada({...nuevaJornada, sector: e.target.value})} 
                  className="w-full border border-slate-300 p-2.5 rounded-lg text-sm outline-none focus:border-orange-500" 
                  placeholder="Ej. Calle Principal, Casco Central" 
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Equipo / Operadores Asignados *</label>
                <input 
                  type="text" 
                  value={nuevaJornada.equipo} 
                  onChange={e=>setNuevaJornada({...nuevaJornada, equipo: e.target.value})} 
                  className="w-full border border-slate-300 p-2.5 rounded-lg text-sm outline-none focus:border-orange-500" 
                  placeholder="Ej. Cuadrilla A (Maria, Carlos)" 
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Meta de Comercios a Visitar *</label>
                <input 
                  type="number" 
                  value={nuevaJornada.comercios} 
                  onChange={e=>setNuevaJornada({...nuevaJornada, comercios: Number(e.target.value)})} 
                  className="w-full border border-slate-300 p-2.5 rounded-lg text-sm outline-none focus:border-orange-500" 
                  placeholder="Ej. 35"
                />
              </div>
              <div className="flex gap-2 justify-end mt-6 pt-4 border-t border-slate-100">
                <button 
                  onClick={()=>setIsModalOpen(false)} 
                  className="px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-semibold transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={agregarJornada} 
                  disabled={isSubmitting}
                  className="px-5 py-2 text-white bg-orange-600 hover:bg-orange-700 rounded-lg text-sm font-bold transition-colors shadow flex items-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {isSubmitting ? 'Guardando...' : 'Guardar Jornada'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}