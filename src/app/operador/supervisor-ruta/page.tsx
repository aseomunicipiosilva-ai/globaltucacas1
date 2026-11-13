'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Truck, 
  MapPin, 
  PlusCircle, 
  CheckCircle2, 
  AlertCircle, 
  History, 
  Compass, 
  RefreshCw, 
  Scale, 
  FileText,
  User,
  ArrowRight,
  LogOut,
  Navigation
} from 'lucide-react';

export default function SupervisorRutaPage() {
  const router = useRouter();
  const [supervisor, setSupervisor] = useState<string>('');
  const [rutasDisponibles, setRutasDisponibles] = useState<any[]>([]);

  // Form states
  const [unidad, setUnidad] = useState('');
  const [chofer, setChofer] = useState('');
  const [ruta, setRuta] = useState('');
  const [toneladas, setToneladas] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);

  // GPS states
  const [gpsLoading, setGpsLoading] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [trackingActive, setTrackingActive] = useState<boolean>(false);
  const watchIdRef = useRef<number | null>(null);

  // Status & history
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [historialHoy, setHistorialHoy] = useState<any[]>([]);
  const [viajeDiaActual, setViajeDiaActual] = useState<number>(1);
  const [totalToneladasHoy, setTotalToneladasHoy] = useState<number>(0);

  // Unidades típicas para selección rápida
  const UNIDADES_PREDEFINIDAS = [
    'Camión Compactador #01',
    'Camión Compactador #02',
    'Camión Compactador #03',
    'Camión Compactador #04',
    'Volteo #01',
    'Volteo #02'
  ];

  // 1. Cargar supervisor autenticado
  useEffect(() => {
    let user = '';
    try {
      const stored = localStorage.getItem('operador_censo_auth') || localStorage.getItem('adminUser');
      if (stored) user = stored;
      const data = JSON.parse(localStorage.getItem('admin_user_data') || localStorage.getItem('operador_user_data') || '{}');
      if (data.nombre) user = data.nombre;
    } catch (e) {}

    if (!user) user = 'Supervisor de Ruta';
    setSupervisor(user);

    // Cargar rutas de la BD
    fetch('/api/supervisor-rutas')
      .catch(() => {});

    // Cargar rutas existentes en tabla rutas
    const loadRutas = async () => {
      try {
        const res = await fetch('/api/supervisor-rutas/rutas');
        if (res.ok) {
          const list = await res.json();
          if (list && list.length > 0) setRutasDisponibles(list);
        }
      } catch (e) {}
    };
    loadRutas();

    // Iniciar obtención de GPS
    solicitarGPS();

    return () => {
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // 2. Solicitar GPS y activar watchPosition para tiempo real
  const solicitarGPS = () => {
    if (!navigator.geolocation) {
      setGpsError('Este dispositivo o navegador no soporta geolocalización GPS.');
      return;
    }

    setGpsLoading(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCoords(c);
        setGpsLoading(false);
        setTrackingActive(true);

        // Iniciar seguimiento en tiempo real continuo
        iniciarWatchPosition();
      },
      (err) => {
        setGpsLoading(false);
        setGpsError(
          err.code === 1 
            ? 'Permiso de ubicación denegado. Active el GPS en su navegador para sala situacional.' 
            : 'No se pudo obtener la posición GPS exacta.'
        );
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const iniciarWatchPosition = () => {
    if (watchIdRef.current !== null) return;
    if (!navigator.geolocation) return;

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCoords(c);

        // Si ya hay unidad seleccionada, enviar ping silencioso de GPS a la sala situacional
        if (unidad) {
          fetch('/api/supervisor-rutas/gps', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              unidad,
              supervisor,
              ruta,
              chofer,
              lat: c.lat,
              lng: c.lng
            })
          }).catch(() => {});
        }
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 }
    );
  };

  // 3. Cargar historial del día para calcular viajes y toneladas
  const loadHistorial = async (fechaSel: string, unidadSel?: string) => {
    try {
      const uParam = unidadSel || unidad;
      const url = `/api/supervisor-rutas?fecha=${fechaSel}` + (uParam ? `&limit=100` : '');
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setHistorialHoy(data);

        // Sumar toneladas del día
        const totalTon = (data || []).reduce((acc: number, item: any) => acc + (parseFloat(item.toneladas) || 0), 0);
        setTotalToneladasHoy(totalTon);

        // Si hay unidad seleccionada, ver cuántos viajes lleva hoy
        if (uParam) {
          const viajesUnidad = (data || []).filter((it: any) => it.unidad?.trim().toLowerCase() === uParam.trim().toLowerCase());
          setViajeDiaActual(viajesUnidad.length + 1);
        } else {
          setViajeDiaActual((data?.length || 0) + 1);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadHistorial(fecha, unidad);
  }, [fecha, unidad]);

  // 4. Guardar descarga en vertedero
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!unidad.trim()) return alert('Por favor seleccione o ingrese la Unidad / Camión.');
    if (!ruta.trim()) return alert('Por favor indique la Ruta recolectada.');
    const tonNum = parseFloat(toneladas);
    if (isNaN(tonNum) || tonNum <= 0) return alert('Por favor ingrese una cantidad válida de toneladas descargadas.');

    setIsSubmitting(true);
    setSuccessMsg('');

    try {
      const payload = {
        supervisor,
        unidad: unidad.trim(),
        chofer: chofer.trim(),
        ruta: ruta.trim(),
        toneladas: tonNum,
        fecha,
        lat: coords?.lat || null,
        lng: coords?.lng || null,
        observaciones: observaciones.trim()
      };

      const res = await fetch('/api/supervisor-rutas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Error registrando descarga');

      setSuccessMsg(`¡Viaje #${result.viaje?.viaje_dia} registrado con éxito! (${tonNum} Toneladas descargadas)`);
      setToneladas('');
      setObservaciones('');

      // Recargar datos
      await loadHistorial(fecha, unidad);

      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err: any) {
      alert('Error al guardar: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between pb-8">
      {/* HEADER MÓVIL */}
      <header className="bg-slate-900 border-b border-slate-800 px-4 py-3 sticky top-0 z-40 shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-sm font-black tracking-tight text-white uppercase">Supervisor de Ruta</h1>
              <p className="text-[11px] text-slate-400 flex items-center gap-1">
                <User className="w-3 h-3 text-emerald-400" /> {supervisor}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push('/admin')}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 flex items-center gap-1 transition-colors"
              title="Ir al panel de administración"
            >
              Panel Admin <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* GPS STATUS BAR */}
        <div className="mt-2.5 flex items-center justify-between bg-slate-950/70 border border-slate-800 rounded-lg px-3 py-1.5 text-xs">
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${coords ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            {gpsLoading ? (
              <span className="text-slate-400 flex items-center gap-1">
                <RefreshCw className="w-3 h-3 animate-spin text-emerald-400" /> Obteniendo GPS...
              </span>
            ) : coords ? (
              <span className="text-emerald-400 font-medium">
                GPS Activo ({coords.lat.toFixed(4)}, {coords.lng.toFixed(4)})
              </span>
            ) : (
              <span className="text-amber-400 font-medium">GPS no detectado</span>
            )}
          </div>
          <button
            type="button"
            onClick={solicitarGPS}
            className="text-[11px] text-blue-400 hover:text-blue-300 font-bold underline flex items-center gap-1"
          >
            <Compass className="w-3 h-3" /> Actualizar
          </button>
        </div>

        {gpsError && (
          <div className="mt-2 text-[11px] bg-red-950/50 border border-red-800 text-red-300 p-2 rounded flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{gpsError}</span>
          </div>
        )}
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <main className="p-4 max-w-lg mx-auto w-full space-y-4">
        {/* RESUMEN DEL DÍA */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl shadow-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1 font-medium">
              <span>Viajes Totales Hoy</span>
              <Navigation className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-2xl font-black text-white">{historialHoy.length}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Siguiente viaje: #{viajeDiaActual}</div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl shadow-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1 font-medium">
              <span>Toneladas Descargadas</span>
              <Scale className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-emerald-400">
              {totalToneladasHoy.toLocaleString('es-VE', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Vertedero municipal</div>
          </div>
        </div>

        {/* MENSAJE DE ÉXITO */}
        {successMsg && (
          <div className="bg-emerald-950/80 border border-emerald-500/80 text-emerald-200 p-3.5 rounded-xl flex items-center gap-2 text-sm font-semibold shadow-lg">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* FORMULARIO DE REGISTRO DE DESCARGA */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h2 className="text-base font-black text-white flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-emerald-400" /> Registrar Viaje y Descarga
              </h2>
              <p className="text-[11px] text-slate-400">Control de viajes y pesaje en vertedero</p>
            </div>
            <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-black px-2.5 py-1 rounded-full">
              Viaje #{viajeDiaActual}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* UNIDAD / CAMIÓN */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
                Unidad / Camión <span className="text-red-400">*</span>
              </label>
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Ej. Camión Compactador #01"
                  value={unidad}
                  onChange={(e) => setUnidad(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-semibold"
                  required
                />
                {/* Botones de selección rápida de unidad */}
                <div className="flex flex-wrap gap-1.5">
                  {UNIDADES_PREDEFINIDAS.map((u) => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => setUnidad(u)}
                      className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition-colors ${
                        unidad === u 
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50' 
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {u}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* RUTA */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
                Ruta Recolectada <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                placeholder="Ej. Ruta #1 - Casco Central y Av. Silva"
                value={ruta}
                onChange={(e) => setRuta(e.target.value)}
                list="rutas-list"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-semibold"
                required
              />
              <datalist id="rutas-list">
                {rutasDisponibles.map((r: any, idx: number) => (
                  <option key={idx} value={`${r.nombre || r.id} - ${r.sectores || ''}`} />
                ))}
              </datalist>
            </div>

            {/* CHOFER */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
                Chofer de la Unidad
              </label>
              <input
                type="text"
                placeholder="Nombre del chofer"
                value={chofer}
                onChange={(e) => setChofer(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* TONELADAS DESCARGADAS */}
            <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
              <label className="block text-xs font-bold text-emerald-400 uppercase mb-1">
                Toneladas Descargadas (Vertedero) <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={toneladas}
                  onChange={(e) => setToneladas(e.target.value)}
                  className="w-full bg-slate-900 border-2 border-emerald-500/50 rounded-xl px-4 py-3 text-2xl font-black text-emerald-300 placeholder-slate-700 focus:outline-none focus:border-emerald-400"
                  required
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-black text-emerald-400">
                  TONS
                </span>
              </div>
            </div>

            {/* FECHA (POR DEFECTO HOY) */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
                Fecha del Viaje
              </label>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* OBSERVACIONES */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
                Observaciones / Novedades
              </label>
              <textarea
                rows={2}
                placeholder="Incidencias mecánicas, estado de vía, etc."
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 resize-none"
              />
            </div>

            {/* BOTÓN REGISTRAR */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-black text-base uppercase tracking-wider shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" /> Registrando Viaje...
                </>
              ) : (
                <>
                  <Scale className="w-5 h-5" /> Registrar Descarga (Viaje #{viajeDiaActual})
                </>
              )}
            </button>
          </form>
        </div>

        {/* LISTADO DE DESCARGAS REGISTRADAS HOY */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h3 className="text-xs font-bold text-slate-300 uppercase flex items-center gap-1.5">
              <History className="w-4 h-4 text-blue-400" /> Descargas de Hoy ({historialHoy.length})
            </h3>
            <span className="text-[10px] text-slate-400">{fecha}</span>
          </div>

          {historialHoy.length === 0 ? (
            <p className="text-center py-6 text-xs text-slate-500">
              Aún no se han registrado viajes de descarga para hoy.
            </p>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {historialHoy.map((item: any, idx: number) => (
                <div
                  key={idx}
                  className="bg-slate-950 border border-slate-800/80 rounded-xl p-3 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-0.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white truncate">{item.unidad}</span>
                      <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-black px-1.5 py-0.5 rounded border border-emerald-500/30">
                        Viaje #{item.viaje_dia}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 truncate">{item.ruta}</div>
                    <div className="text-[10px] text-slate-500">
                      Chofer: {item.chofer || 'S/A'} | Sup: {item.supervisor}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-black text-emerald-400">
                      {parseFloat(item.toneladas).toFixed(2)} Ton
                    </div>
                    <span className="text-[9px] text-slate-500">
                      {item.created_at ? new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* FOOTER */}
      <footer className="text-center text-[10px] text-slate-600 px-4 pt-2">
        Alcaldía Bolivariana del Municipio Silva • Sistema Integrado de Gestión de Aseo Urbano
      </footer>
    </div>
  );
}
