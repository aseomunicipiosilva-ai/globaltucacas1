'use client';

import { useState, useEffect } from 'react';
import { 
  Radio, 
  Truck, 
  MapPin, 
  RefreshCw, 
  Lock, 
  ShieldCheck, 
  AlertCircle, 
  ExternalLink, 
  Calendar, 
  User, 
  Route, 
  Scale, 
  Clock,
  Eye,
  EyeOff
} from 'lucide-react';

export default function SalaSituacionalPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [claveInput, setClaveInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  
  // Datos Sala Situacional
  const [gpsUnits, setGpsUnits] = useState<any[]>([]);
  const [loadingGps, setLoadingGps] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Verificar si ya desbloqueó la sala en esta sesión
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
        setGpsUnits(data || []);
        setLastUpdated(new Date());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingGps(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    loadGpsUnits();
    // Actualización automática en tiempo real cada 12 segundos
    const timer = setInterval(() => {
      loadGpsUnits();
    }, 12000);
    return () => clearInterval(timer);
  }, [isAuthenticated]);

  // Si no está autenticado, mostrar formulario de acceso con clave Omar..
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

  // Vista de la Sala Situacional
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
                Rastreo continuo de unidades, rutas y descargas hacia el vertedero
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
              Actualizar
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
          <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Último pulso satelital recibido: {lastUpdated.toLocaleTimeString('es-VE')}</span>
            <span className="text-emerald-400 font-semibold">{gpsUnits.length} camiones registrados</span>
          </div>
        )}
      </div>

      {/* Grid de Camiones / Unidades */}
      {gpsUnits.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
          <Truck className="w-16 h-16 mx-auto text-slate-700 mb-3" />
          <h3 className="text-base font-bold text-slate-200">No hay camiones emitiendo señal GPS activa</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
            Tan pronto el supervisor de ruta active su módulo en su teléfono móvil con el GPS encendido, la unidad aparecerá aquí automáticamente con su ruta y ubicación en vivo.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {gpsUnits.map((u: any, idx: number) => {
            const minutosDesdeUpdate = u.updated_at 
              ? Math.round((Date.now() - new Date(u.updated_at).getTime()) / 60000)
              : null;
            const estaEnLinea = minutosDesdeUpdate !== null && minutosDesdeUpdate < 10;

            return (
              <div
                key={idx}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between hover:border-slate-700 transition-colors"
              >
                <div>
                  {/* Encabezado tarjeta */}
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

                  {/* Detalles de la unidad */}
                  <div className="py-4 space-y-2.5 text-xs text-slate-300">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <Route size={14} className="text-blue-400" /> Ruta Asignada:
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
                        {u.lat?.toFixed(5)}, {u.lng?.toFixed(5)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Botón ver en mapa */}
                <div className="pt-3 border-t border-slate-800">
                  <a
                    href={`https://www.google.com/maps?q=${u.lat},${u.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95"
                  >
                    <ExternalLink size={14} /> Abrir Ubicación en Google Maps
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
