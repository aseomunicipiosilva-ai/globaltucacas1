'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { 
  Radio, 
  Truck, 
  MapPin, 
  RefreshCw, 
  Lock, 
  ShieldCheck, 
  AlertCircle, 
  User, 
  Route, 
  Scale, 
  Eye, 
  EyeOff, 
  Navigation,
  Trash2,
  CheckSquare,
  Square,
  Crosshair,
  Layers,
  Clock,
  BookOpen,
  Calendar,
  X,
  Compass
} from 'lucide-react';

const SalaMapaInteractivo = dynamic(() => import('@/components/SalaMapaInteractivo'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[580px] rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400">
      <RefreshCw className="w-6 h-6 animate-spin text-emerald-400 mr-2" /> Cargando mapa de alta resolución...
    </div>
  )
});

export default function SalaSituacionalPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [claveInput, setClaveInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  
  // Datos Sala Situacional
  const [gpsUnits, setGpsUnits] = useState<any[]>([]);
  const [loadingGps, setLoadingGps] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Filtros de visualización
  const [selectedUnits, setSelectedUnits] = useState<string[]>([]);
  const [focusedUnit, setFocusedUnit] = useState<any | null>(null);

  // Modo Bitácora Modal
  const [bitacoraModalUnit, setBitacoraModalUnit] = useState<any | null>(null);

  // Estado de eliminación
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const ses = sessionStorage.getItem('sala_situacional_unlocked');
    if (ses === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (claveInput.trim() === 'Omar..') {
      setIsAuthenticated(true);
      sessionStorage.setItem('sala_situacional_unlocked', 'true');
      setAuthError('');
    } else {
      setAuthError('Contraseña incorrecta. Acceso denegado a la Sala Situacional.');
    }
  };

  const loadGpsUnits = async () => {
    setLoadingGps(true);
    try {
      const res = await fetch('/api/supervisor-rutas/gps');
      if (res.ok) {
        const data = await res.json();
        const units = data || [];
        setGpsUnits(units);
        setLastUpdated(new Date());

        // Actualizar referencia de unidad enfocada si existe
        if (focusedUnit) {
          const updated = units.find((u: any) => u.unidad === focusedUnit.unidad);
          if (updated) setFocusedUnit(updated);
        }

        // Actualizar modal de bitácora si está abierto
        if (bitacoraModalUnit) {
          const updatedBit = units.find((u: any) => u.unidad === bitacoraModalUnit.unidad);
          if (updatedBit) setBitacoraModalUnit(updatedBit);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingGps(false);
    }
  };

  // Polling automático cada 8 segundos
  useEffect(() => {
    if (!isAuthenticated) return;
    loadGpsUnits();
    const timer = setInterval(() => {
      loadGpsUnits();
    }, 8000);
    return () => clearInterval(timer);
  }, [isAuthenticated]);

  const toggleUnitSelection = (unidad: string) => {
    if (selectedUnits.includes(unidad)) {
      setSelectedUnits(selectedUnits.filter(u => u !== unidad));
    } else {
      setSelectedUnits([...selectedUnits, unidad]);
    }
  };

  const selectAll = () => {
    setSelectedUnits(gpsUnits.map(u => u.unidad));
    setFocusedUnit(null);
  };

  const deselectAll = () => {
    setSelectedUnits([]);
    setFocusedUnit(null);
  };

  const focusSingleUnit = (unit: any) => {
    if (focusedUnit?.unidad === unit.unidad) {
      setFocusedUnit(null);
    } else {
      setFocusedUnit(unit);
      if (!selectedUnits.includes(unit.unidad)) {
        setSelectedUnits([unit.unidad]);
      }
    }
  };

  const handleDeleteUnit = async (unit: any) => {
    const confirmDelete = window.confirm(`¿Estás seguro de eliminar el camión ${unit.unidad} de la Sala Situacional?`);
    if (!confirmDelete) return;

    setDeletingId(unit.unidad);
    try {
      const res = await fetch(`/api/supervisor-rutas/gps?unidad=${encodeURIComponent(unit.unidad)}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setGpsUnits(prev => prev.filter(u => u.unidad !== unit.unidad));
        setSelectedUnits(prev => prev.filter(u => u !== unit.unidad));
        if (focusedUnit?.unidad === unit.unidad) setFocusedUnit(null);
        if (bitacoraModalUnit?.unidad === unit.unidad) setBitacoraModalUnit(null);
      } else {
        alert('Error al eliminar la unidad');
      }
    } catch(err: any) {
      alert('Error: ' + err.message);
    } finally {
      setDeletingId(null);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-blue-500 to-indigo-500" />
          
          <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center mx-auto mb-4 text-blue-400">
            <Radio className="w-8 h-8 animate-pulse text-red-500" />
          </div>

          <h2 className="text-xl font-black text-white uppercase tracking-tight">Sala Situacional GPS</h2>
          <p className="text-xs text-slate-400 mt-1 mb-6">
            Monitoreo en vivo de unidades de recolección y vertedero. Módulo de acceso restringido.
          </p>

          <form onSubmit={handleAuthSubmit} className="space-y-4 text-left">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Clave de Seguridad
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={claveInput}
                  onChange={(e) => setClaveInput(e.target.value)}
                  placeholder="Ingrese clave de acceso..."
                  className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-colors pr-11"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {authError && (
              <div className="flex items-center gap-2 p-3 bg-red-950/50 border border-red-800/80 rounded-xl text-red-300 text-xs">
                <AlertCircle size={16} className="shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 text-sm"
            >
              <ShieldCheck size={18} /> Desbloquear Acceso
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-blue-500 to-indigo-500" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Radio className="w-6 h-6 text-red-500 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-white uppercase tracking-tight">Sala Situacional GPS</h1>
                <span className="bg-emerald-950 border border-emerald-800 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" /> En Vivo
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Seguimiento satelital en tiempo real con trazado de recorrido, vista individual, múltiple y modo bitácora
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadGpsUnits}
              disabled={loadingGps}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingGps ? 'animate-spin text-blue-400' : ''}`} />
              Sincronizar
            </button>
            <button
              onClick={() => {
                sessionStorage.removeItem('sala_situacional_unlocked');
                setIsAuthenticated(false);
              }}
              className="px-3.5 py-2 rounded-xl bg-red-950/60 hover:bg-red-900 text-red-300 text-xs font-bold border border-red-800/80 flex items-center gap-1.5 transition-colors"
            >
              <Lock className="w-3.5 h-3.5" /> Bloquear
            </button>
          </div>
        </div>

        {lastUpdated && (
          <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex flex-wrap items-center justify-between gap-2">
            <span>Último pulso satelital: {lastUpdated.toLocaleTimeString('es-VE')}</span>
            <div className="flex items-center gap-3">
              <span className="text-emerald-400 font-semibold">{gpsUnits.length} camiones en sistema</span>
              {focusedUnit && (
                <span className="bg-blue-900/60 text-blue-300 px-2.5 py-0.5 rounded-full border border-blue-700 text-[10px] font-bold flex items-center gap-1">
                  <Crosshair size={12} /> Enfocando: {focusedUnit.unidad}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* CONTROLES DE SELECCIÓN Y MULTI-SELECCIÓN */}
      {gpsUnits.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1.5">
              <Layers size={14} className="text-emerald-400" /> Filtrar en Pantalla:
            </span>
            <button
              onClick={selectAll}
              className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded-lg border border-slate-700 font-semibold"
            >
              Ver Todos ({gpsUnits.length})
            </button>
            <button
              onClick={deselectAll}
              className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-400 px-2.5 py-1 rounded-lg border border-slate-700 font-semibold"
            >
              Desmarcar
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {gpsUnits.map((u) => {
              const isChecked = selectedUnits.length === 0 || selectedUnits.includes(u.unidad);
              const isFocused = focusedUnit?.unidad === u.unidad;
              return (
                <div
                  key={u.unidad}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs transition-colors ${
                    isFocused
                      ? 'bg-blue-600 text-white border-blue-400 font-black'
                      : isChecked
                      ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800 font-semibold'
                      : 'bg-slate-950 text-slate-500 border-slate-800'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggleUnitSelection(u.unidad)}
                    className="hover:text-white"
                    title="Activar/desactivar en mapa"
                  >
                    {isChecked ? <CheckSquare size={13} className="text-emerald-400" /> : <Square size={13} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => focusSingleUnit(u)}
                    className="hover:underline flex items-center gap-1 truncate max-w-[140px]"
                    title="Enfocar individualmente"
                  >
                    <Crosshair size={11} className={isFocused ? 'text-white' : 'text-slate-400'} />
                    {u.unidad}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MAPA INTERACTIVO DE ALTA RESOLUCIÓN */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Navigation className="w-4 h-4 text-emerald-400" /> Pantalla Satelital de Alta Definición
          </h2>
          <span className="text-xs text-slate-400">
            {focusedUnit ? `Siguiendo a ${focusedUnit.unidad}` : 'Trazados y movimiento en vivo'}
          </span>
        </div>

        <SalaMapaInteractivo 
          units={gpsUnits} 
          selectedUnitNames={selectedUnits} 
          focusedUnit={focusedUnit}
          onSelectUnit={(unit) => setFocusedUnit(unit)}
        />
      </div>

      {/* Grid de Fichas de Unidades con Bitácora y Eliminar */}
      {gpsUnits.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {gpsUnits.map((u: any, idx: number) => {
            const minutosDesdeUpdate = u.updated_at 
              ? Math.round((Date.now() - new Date(u.updated_at).getTime()) / 60000)
              : null;
            const estaEnLinea = minutosDesdeUpdate !== null && minutosDesdeUpdate < 10;
            const isFocused = focusedUnit?.unidad === u.unidad;
            const bitacoraCount = Array.isArray(u.bitacora) ? u.bitacora.length : 1;

            return (
              <div
                key={idx}
                className={`bg-slate-900 border rounded-2xl p-5 shadow-lg flex flex-col justify-between transition-all ${
                  isFocused ? 'border-blue-500 shadow-blue-500/20 ring-1 ring-blue-500' : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-black">
                        🚛
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-white uppercase">{u.unidad}</h3>
                        <p className="text-[11px] text-slate-400 flex items-center gap-1">
                          <User size={12} className="text-emerald-400" /> Sup: {u.supervisor || 'N/A'}
                        </p>
                      </div>
                    </div>

                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                      estaEnLinea 
                        ? 'bg-emerald-950 border border-emerald-800 text-emerald-300' 
                        : 'bg-amber-950 border border-amber-800 text-amber-300'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${estaEnLinea ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                      {estaEnLinea ? 'En Movimiento' : `Hace ${minutosDesdeUpdate || '?'} min`}
                    </span>
                  </div>

                  <div className="py-4 space-y-2.5 text-xs text-slate-300">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <Route size={14} className="text-blue-400" /> Ruta:
                      </span>
                      <span className="font-bold text-white text-right truncate max-w-[160px]">
                        {u.ruta || 'Sin Ruta Asignada'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <User size={14} className="text-amber-400" /> Chofer:
                      </span>
                      <span className="font-semibold text-slate-200">
                        {u.chofer || 'Sin chofer'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <MapPin size={14} className="text-red-400" /> Coordenadas:
                      </span>
                      <span className="font-mono text-[11px] text-emerald-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                        {Number(u.lat)?.toFixed(5)}, {Number(u.lng)?.toFixed(5)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-800/60">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <BookOpen size={13} className="text-emerald-400" /> Registros Bitácora:
                      </span>
                      <span className="font-bold text-emerald-400">
                        {bitacoraCount} puntos (cada 3 min)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Acciones: Enfocar / Modo Bitácora / Eliminar */}
                <div className="pt-3 border-t border-slate-800 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => focusSingleUnit(u)}
                    className={`flex-1 py-2 px-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1 transition-colors ${
                      isFocused 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                    }`}
                  >
                    <Crosshair size={13} /> {isFocused ? 'Enfocado' : 'Enfocar'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setBitacoraModalUnit(u)}
                    className="py-2 px-3 rounded-xl bg-emerald-950/60 hover:bg-emerald-900 text-emerald-300 border border-emerald-800/80 font-bold text-xs flex items-center gap-1 transition-colors"
                    title="Ver Bitácora de Recorrido detallada"
                  >
                    <BookOpen size={13} /> Bitácora
                  </button>

                  <button
                    type="button"
                    disabled={deletingId === u.unidad}
                    onClick={() => handleDeleteUnit(u)}
                    className="p-2 rounded-xl bg-red-950/60 hover:bg-red-900 text-red-400 border border-red-800/80 transition-colors disabled:opacity-50"
                    title="Eliminar este camión"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── MODAL MODO BITÁCORA DETALLADA POR VEHÍCULO ── */}
      {bitacoraModalUnit && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-fadeIn">
            {/* Header Modal */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white uppercase tracking-tight">
                    Bitácora de Recorrido: {bitacoraModalUnit.unidad}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Historial de posiciones guardadas automáticamente cada 3 minutos
                  </p>
                </div>
              </div>
              <button
                onClick={() => setBitacoraModalUnit(null)}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Resumen Superior */}
            <div className="grid grid-cols-3 gap-3 p-4 bg-slate-900/60 border-b border-slate-800 text-xs">
              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-500 block uppercase font-bold">Supervisor</span>
                <span className="text-white font-semibold">{bitacoraModalUnit.supervisor || 'N/A'}</span>
              </div>
              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-500 block uppercase font-bold">Chofer</span>
                <span className="text-white font-semibold">{bitacoraModalUnit.chofer || 'Sin chofer'}</span>
              </div>
              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-500 block uppercase font-bold">Ruta Actual</span>
                <span className="text-emerald-400 font-semibold truncate block">{bitacoraModalUnit.ruta || 'En ruta'}</span>
              </div>
            </div>

            {/* Lista Cronológica de Puntos de la Bitácora */}
            <div className="p-5 overflow-y-auto space-y-3 flex-1">
              {(!bitacoraModalUnit.bitacora || bitacoraModalUnit.bitacora.length === 0) ? (
                <div className="text-center py-10 text-slate-500 text-sm">
                  <Clock className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                  <p>Iniciando registro de bitácora...</p>
                  <p className="text-xs text-slate-600 mt-1">El primer hito de ubicación se guardará automáticamente a los 3 minutos.</p>
                </div>
              ) : (
                <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
                  {bitacoraModalUnit.bitacora.slice().reverse().map((entry: any, i: number) => (
                    <div key={i} className="relative group">
                      {/* Punto en la línea de tiempo */}
                      <div className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-slate-900 shadow-sm shadow-emerald-500/50" />
                      
                      <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 hover:border-slate-700 transition-colors">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-bold text-white flex items-center gap-1.5">
                            <Clock size={13} className="text-emerald-400" /> {entry.hora || new Date(entry.time).toLocaleTimeString('es-VE')}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {new Date(entry.time).toLocaleDateString('es-VE')}
                          </span>
                        </div>

                        <div className="text-xs text-slate-300 flex items-center justify-between mt-1.5">
                          <span className="text-slate-400 truncate max-w-[280px]">
                            📍 {entry.ruta || 'Punto de recolección'}
                          </span>
                          <span className="font-mono text-[11px] text-emerald-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                            {Number(entry.lat).toFixed(5)}, {Number(entry.lng).toFixed(5)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer Modal */}
            <div className="p-4 border-t border-slate-800 bg-slate-950 text-right">
              <button
                type="button"
                onClick={() => setBitacoraModalUnit(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors"
              >
                Cerrar Bitácora
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
