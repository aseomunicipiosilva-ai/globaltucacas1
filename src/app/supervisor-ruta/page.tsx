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
  Navigation,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function SupervisorRutaPage() {
  const router = useRouter();

  // Estados de Autenticación del Supervisor
  const [isAuth, setIsAuth] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginUser, setLoginUser] = useState('');
  const [loginClave, setLoginClave] = useState('');
  const [showLoginClave, setShowLoginClave] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Datos del Supervisor Activo
  const [supervisor, setSupervisor] = useState<string>('');
  const [supervisorData, setSupervisorData] = useState<any>(null);

  // Form states
  const [rutasDisponibles, setRutasDisponibles] = useState<any[]>([]);
  const [tipoVehiculo, setTipoVehiculo] = useState<'Compactadora' | 'Trimoto' | 'Volteo'>('Compactadora');
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

  // 1. Verificar si ya tiene sesión activa de supervisor
  useEffect(() => {
    try {
      const storedAuth = localStorage.getItem('supervisor_ruta_auth');
      const storedUserData = localStorage.getItem('supervisor_ruta_user_data');
      if (storedAuth && storedUserData) {
        const uData = JSON.parse(storedUserData);
        setSupervisor(uData.nombre || storedAuth);
        setSupervisorData(uData);
        setIsAuth(true);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAuthLoading(false);
    }
  }, []);

  // 2. Iniciar sesión con trabajador de la base de datos
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const uClean = loginUser.trim();
    const cClean = loginClave.trim();

    if (!uClean || !cClean) {
      setLoginError('Por favor ingrese usuario y contraseña');
      return;
    }

    setIsLoggingIn(true);
    setLoginError('');

    try {
      // Bypass maestro dzara
      if (uClean.toLowerCase() === 'dzara' && (cClean === 'dzara' || cClean === 'andministrador' || cClean === 'Omar..')) {
        const masterData = { nombre: 'David Zara', usuario: 'dzara', rol: 'Master' };
        localStorage.setItem('supervisor_ruta_auth', 'dzara');
        localStorage.setItem('supervisor_ruta_user_data', JSON.stringify(masterData));
        setSupervisor('David Zara');
        setSupervisorData(masterData);
        setIsAuth(true);
        return;
      }

      // Buscar en tabla trabajadores
      const { data, error } = await supabase
        .from('trabajadores')
        .select('*')
        .ilike('usuario', uClean)
        .limit(1)
        .maybeSingle();

      if (error || !data) {
        setLoginError('Usuario no encontrado');
        return;
      }

      if (data.estado !== 'Activo') {
        setLoginError('Esta cuenta se encuentra suspendida');
        return;
      }

      if (String(data.clave || '').trim() !== cClean) {
        setLoginError('Contraseña incorrecta');
        return;
      }

      // Validar que tenga rol de supervisor o administrador
      const rolUpper = (data.rol || '').toUpperCase();
      const esValido = rolUpper.includes('SUPERVISOR') || rolUpper.includes('ADMIN') || rolUpper.includes('MASTER') || rolUpper.includes('OPERADOR');
      if (!esValido) {
        setLoginError('Este usuario no tiene permisos de Supervisor de Ruta');
        return;
      }

      // Sesión exitosa
      localStorage.setItem('supervisor_ruta_auth', data.usuario);
      localStorage.setItem('supervisor_ruta_user_data', JSON.stringify(data));
      setSupervisor(data.nombre || data.usuario);
      setSupervisorData(data);
      setIsAuth(true);

    } catch (err: any) {
      setLoginError('Error conectando al sistema: ' + err.message);
    } finally {
      setIsLoggingIn(false);
    }
  };

  // 3. Cerrar Sesión
  const handleLogout = () => {
    if (watchIdRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    localStorage.removeItem('supervisor_ruta_auth');
    localStorage.removeItem('supervisor_ruta_user_data');
    setIsAuth(false);
    setSupervisor('');
    setSupervisorData(null);
    setCoords(null);
    setUnidad('');
  };

  // 4. Efecto al autenticarse: Cargar rutas, historial y GPS
  useEffect(() => {
    if (!isAuth) return;

    // Cargar rutas existentes
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
  }, [isAuth]);

  // 5. GPS en tiempo real
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

        // Si ya hay unidad seleccionada, enviar pulso a la sala situacional
        if (unidad.trim()) {
          fetch('/api/supervisor-rutas/gps', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              unidad: unidad.trim(),
              supervisor,
              ruta: ruta.trim(),
              chofer: chofer.trim(),
              lat: c.lat,
              lng: c.lng
            })
          }).catch(() => {});
        }

        iniciarWatchPosition();
      },
      (err) => {
        setGpsLoading(false);
        setGpsError(
          err.code === 1 
            ? 'Permiso de ubicación denegado. Active el GPS en su teléfono.' 
            : 'No se pudo obtener la posición satelital GPS exacta.'
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

        // SOLO enviar ping a la sala situacional si hay unidad asignada
        if (unidad && unidad.trim().length > 0) {
          fetch('/api/supervisor-rutas/gps', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              unidad: unidad.trim(),
              supervisor,
              ruta: ruta.trim(),
              chofer: chofer.trim(),
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

  // Cargar historial del día
  const loadHistorial = async (fechaSel: string, unidadSel?: string) => {
    try {
      const uParam = unidadSel || unidad;
      const url = `/api/supervisor-rutas?fecha=${fechaSel}` + (uParam ? `&limit=100` : '');
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setHistorialHoy(data);

        // Calcular siguiente viaje
        let uList = data;
        if (uParam) {
          uList = data.filter((d: any) => d.unidad?.toLowerCase() === uParam.toLowerCase());
        }
        setViajeDiaActual(uList.length + 1);

        // Sumar toneladas
        const totalTon = data.reduce((acc: number, item: any) => acc + (parseFloat(item.toneladas) || 0), 0);
        setTotalToneladasHoy(parseFloat(totalTon.toFixed(2)));
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (isAuth) {
      loadHistorial(fecha, unidad);
    }
  }, [fecha, unidad, isAuth]);

  // Guardar viaje y descarga
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unidad.trim()) return alert('Debe indicar la unidad o camión');
    if (!ruta.trim()) return alert('Debe indicar la ruta asignada');
    if (!toneladas || parseFloat(toneladas) <= 0) return alert('Debe ingresar las toneladas descargadas');

    const tonNum = parseFloat(toneladas);
    if (isNaN(tonNum) || tonNum <= 0) return alert('Monto de toneladas inválido');

    setIsSubmitting(true);
    setSuccessMsg('');

    try {
      const payload = {
        supervisor,
        unidad: unidad.trim(),
        tipo_vehiculo: tipoVehiculo,
        chofer: chofer.trim(),
        ruta: ruta.trim(),
        viaje_num: viajeDiaActual,
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

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Error al registrar el viaje');
      }

      setSuccessMsg(`¡Viaje #${viajeDiaActual} registrado exitosamente con ${tonNum} toneladas!`);
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

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <RefreshCw className="w-6 h-6 animate-spin text-emerald-400 mr-2" /> Cargando...
      </div>
    );
  }

  // ── PANTALLA DE LOGIN PARA SUPERVISOR ──
  if (!isAuth) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4">
        <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-400" />
          
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4 text-emerald-400">
            <Truck className="w-8 h-8" />
          </div>

          <h1 className="text-xl font-black text-center text-white tracking-tight uppercase">Supervisor de Ruta</h1>
          <p className="text-xs text-center text-slate-400 mt-1 mb-6">
            Ingrese sus credenciales de trabajador para acceder a su jornada
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
                Usuario
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={loginUser}
                  onChange={(e) => setLoginUser(e.target.value)}
                  placeholder="Ej. jmonroy, dzara..."
                  className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={showLoginClave ? 'text' : 'password'}
                  value={loginClave}
                  onChange={(e) => setLoginClave(e.target.value)}
                  placeholder="Ingrese contraseña..."
                  className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 transition-colors pr-11"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowLoginClave(!showLoginClave)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                >
                  {showLoginClave ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {loginError && (
              <div className="p-3 bg-red-950/60 border border-red-800 text-red-300 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50"
            >
              {isLoggingIn ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Verificando...
                </>
              ) : (
                <>
                  <ShieldCheck size={18} /> Ingresar a Jornada
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => router.push('/')}
              className="text-xs text-slate-500 hover:text-slate-300 font-semibold"
            >
              ← Volver a la pantalla principal
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── PANTALLA PRINCIPAL ADAPTADA AL TELÉFONO MÓVIL ──
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between max-w-lg mx-auto w-full shadow-2xl">
      {/* HEADER MÓVIL RESPONSIVE */}
      <header className="bg-slate-900 border-b border-slate-800 px-4 py-3 sticky top-0 z-40 shadow-md">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
              <Truck className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xs sm:text-sm font-black tracking-tight text-white uppercase truncate">
                Supervisor de Ruta
              </h1>
              <p className="text-[11px] text-slate-400 flex items-center gap-1 truncate">
                <User className="w-3 h-3 text-emerald-400 shrink-0" /> {supervisor}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => router.push('/admin')}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold border border-slate-700 flex items-center gap-1 transition-colors"
              title="Panel Administrativo"
            >
              Admin <ArrowRight className="w-3 h-3" />
            </button>
            <button
              onClick={handleLogout}
              className="px-2.5 py-1.5 rounded-lg bg-red-950/60 hover:bg-red-900 text-red-300 text-[11px] font-semibold border border-red-800/80 flex items-center gap-1 transition-colors"
              title="Cerrar Sesión"
            >
              <LogOut className="w-3 h-3" /> Salir
            </button>
          </div>
        </div>

        {/* GPS STATUS BAR */}
        <div className="mt-2.5 flex items-center justify-between bg-slate-950/70 border border-slate-800 rounded-lg px-3 py-1.5 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${coords ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            {gpsLoading ? (
              <span className="text-slate-400 flex items-center gap-1 truncate">
                <RefreshCw className="w-3 h-3 animate-spin text-emerald-400 shrink-0" /> Buscando satélites...
              </span>
            ) : coords ? (
              <span className="text-emerald-400 font-medium truncate text-[11px]">
                GPS Conectado ({coords.lat.toFixed(4)}, {coords.lng.toFixed(4)})
              </span>
            ) : (
              <span className="text-amber-400 font-medium text-[11px]">GPS no detectado</span>
            )}
          </div>
          <button
            type="button"
            onClick={solicitarGPS}
            className="text-[11px] text-blue-400 hover:text-blue-300 font-bold underline flex items-center gap-1 shrink-0 ml-2"
          >
            <Compass className="w-3 h-3" /> Actualizar
          </button>
        </div>

        {gpsError && (
          <div className="mt-2 text-[11px] bg-red-950/50 border border-red-800 text-red-300 p-2 rounded flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span className="flex-1">{gpsError}</span>
          </div>
        )}
      </header>

      {/* CONTENIDO PRINCIPAL ADAPTADO AL MÓVIL */}
      <main className="p-3 sm:p-4 space-y-4 flex-1">
        {/* RESUMEN DEL DÍA */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl shadow-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1 font-medium">
              <span>Viajes Totales</span>
              <Navigation className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <div className="text-2xl font-black text-white">{historialHoy.length}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Siguiente: #{viajeDiaActual}</div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl shadow-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1 font-medium">
              <span>Toneladas Descargadas</span>
              <Scale className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-emerald-400">
              {totalToneladasHoy.toLocaleString('es-VE', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Vertedero municipal</div>
          </div>
        </div>

        {successMsg && (
          <div className="p-3 bg-emerald-950/60 border border-emerald-800 text-emerald-300 rounded-xl text-xs flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* FORMULARIO DE REGISTRO DE DESCARGA */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h2 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-emerald-400" /> Registrar Viaje y Descarga
              </h2>
              <p className="text-[10px] sm:text-[11px] text-slate-400">Control de viajes y pesaje en vertedero</p>
            </div>
            <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-black px-2.5 py-1 rounded-full">
              Viaje #{viajeDiaActual}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* TIPO DE VEHÍCULO */}
            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1.5">
                Tipo de Vehículo <span className="text-red-400">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'Compactadora', label: 'Compactadora', icon: '🚛' },
                  { id: 'Trimoto', label: 'Trimoto', icon: '🛺' },
                  { id: 'Volteo', label: 'Volteo', icon: '🚚' }
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setTipoVehiculo(item.id as any);
                      if (unidad && (unidad.includes('Compactadora') || unidad.includes('Trimoto') || unidad.includes('Volteo'))) {
                        setUnidad(`${item.label} #01`);
                      }
                    }}
                    className={`py-2 px-1.5 rounded-xl text-xs font-bold border transition-all flex flex-col items-center gap-1 ${
                      tipoVehiculo === item.id
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500 shadow-sm shadow-emerald-500/20'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <span className="text-base">{item.icon}</span>
                    <span className="text-[10px] sm:text-xs">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* UNIDAD / CAMIÓN */}
            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1.5">
                Unidad / Camión <span className="text-red-400">*</span>
              </label>
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Ej. Compactadora #01"
                  value={unidad}
                  onChange={(e) => setUnidad(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-semibold"
                  required
                />
                {/* Botones de selección rápida de unidad */}
                <div className="flex flex-wrap gap-1.5">
                  {[
                    `${tipoVehiculo} #01`,
                    `${tipoVehiculo} #02`,
                    `${tipoVehiculo} #03`,
                    `${tipoVehiculo} #04`
                  ].map((u) => (
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
              <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1.5">
                Ruta Recolectada <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                placeholder="Ej. Casco Central y Av. Silva"
                value={ruta}
                onChange={(e) => setRuta(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                required
              />
              {rutasDisponibles.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {rutasDisponibles.slice(0, 4).map((r: any, idx: number) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setRuta(r.nombre || r.ruta)}
                      className="text-[9px] bg-slate-950 text-slate-400 hover:text-white px-2 py-0.5 rounded border border-slate-800"
                    >
                      {r.nombre || r.ruta}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* CHOFER & TONELADAS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1.5">
                  Chofer / Conductor
                </label>
                <input
                  type="text"
                  placeholder="Nombre del chofer"
                  value={chofer}
                  onChange={(e) => setChofer(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-emerald-400 uppercase mb-1.5">
                  Toneladas Descargadas <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Ej. 8.50"
                    value={toneladas}
                    onChange={(e) => setToneladas(e.target.value)}
                    className="w-full bg-slate-950 border border-emerald-500/50 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-emerald-300 font-black placeholder-slate-600 focus:outline-none focus:border-emerald-400"
                    required
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-emerald-500">
                    TON
                  </span>
                </div>
              </div>
            </div>

            {/* OBSERVACIONES */}
            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1.5">
                Observaciones / Novedad en Vertedero
              </label>
              <textarea
                rows={2}
                placeholder="Incidencias mecánicas, demoras en descarga, etc."
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs sm:text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 resize-none"
              />
            </div>

            {/* BOTÓN REGISTRAR DESCARGA */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3.5 px-4 rounded-xl shadow-lg shadow-emerald-600/30 active:scale-95 transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Registrando Viaje...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" /> Registrar Descarga (Viaje #{viajeDiaActual})
                </>
              )}
            </button>
          </form>
        </div>

        {/* LISTADO DE DESCARGAS REGISTRADAS HOY */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h3 className="text-xs sm:text-sm font-black text-white uppercase flex items-center gap-2">
              <History className="w-4 h-4 text-emerald-400" /> Historial de Viajes de Hoy ({historialHoy.length})
            </h3>
            <span className="text-[10px] text-slate-400">{fecha}</span>
          </div>

          {historialHoy.length === 0 ? (
            <div className="text-center py-6 text-slate-500 text-xs">
              No hay viajes ni descargas registradas en esta fecha.
            </div>
          ) : (
            <div className="space-y-2">
              {historialHoy.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-slate-950 border border-slate-800/80 rounded-xl p-3 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-black px-2 py-0.5 rounded">
                        Viaje #{item.viaje_num || (idx + 1)}
                      </span>
                      <span className="font-bold text-white text-xs truncate">
                        {item.unidad}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 truncate mt-0.5">{item.ruta}</div>
                    <div className="text-[9px] text-slate-500">
                      Chofer: {item.chofer || 'S/A'} | Sup: {item.supervisor}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-emerald-400 font-black text-sm">
                      {parseFloat(item.toneladas || 0).toFixed(2)} TON
                    </div>
                    <div className="text-[9px] text-slate-500">
                      {item.hora || 'Registrado'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* FOOTER MÓVIL */}
      <footer className="text-center py-3 text-[10px] text-slate-500 border-t border-slate-800/50">
        Global Rec C.A. • Sistema de Supervisión Satelital y Control de Descargas
      </footer>
    </div>
  );
}
