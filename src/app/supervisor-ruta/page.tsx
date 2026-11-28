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
  // ── SISTEMA DE COLA OFFLINE (RESISTENTE A PÉRDIDA DE SEÑAL Y RECONEXIÓN) ──
  const guardarPuntoEnColaOffline = (punto: any) => {
    try {
      const colaStr = localStorage.getItem('gps_offline_queue') || '[]';
      const cola = JSON.parse(colaStr);
      // Evitar guardar puntos idénticos si no se ha movido
      const ultimo = cola[cola.length - 1];
      if (!ultimo || Math.abs(ultimo.lat - punto.lat) > 0.00003 || Math.abs(ultimo.lng - punto.lng) > 0.00003) {
        cola.push({
          lat: punto.lat,
          lng: punto.lng,
          time: new Date().toISOString()
        });
      }
      if (cola.length > 500) cola.shift(); // retener hasta 500 posiciones
      localStorage.setItem('gps_offline_queue', JSON.stringify(cola));
    } catch(e) {}
  };

  const reintentarColaOffline = async () => {
    try {
      const colaStr = localStorage.getItem('gps_offline_queue');
      if (!colaStr) return;
      const cola = JSON.parse(colaStr);
      if (!Array.isArray(cola) || cola.length === 0) return;

      const currentUnidad = localStorage.getItem('supervisor_last_unidad') || unidad;
      if (!currentUnidad) return;

      const ultimo = cola[cola.length - 1];
      // Enviar todo el lote acumulado durante la desconexión para reconstruir la línea
      const payloadBatch = {
        unidad: currentUnidad.trim(),
        supervisor: supervisor || 'Supervisor',
        ruta: localStorage.getItem('supervisor_last_ruta') || ruta || '',
        chofer: localStorage.getItem('supervisor_last_chofer') || chofer || '',
        lat: ultimo.lat,
        lng: ultimo.lng,
        batch_trail: cola
      };

      const res = await fetch('/api/supervisor-rutas/gps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadBatch)
      });
      if (res.ok) {
        // Conexión restablecida y lote sincronizado
        localStorage.removeItem('gps_offline_queue');
      }
    } catch(e) {}
  };

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
  const [isAdminUser, setIsAdminUser] = useState(false);
  const todayStr = new Date().toISOString().split('T')[0];

  // Form states
  const [rutasDisponibles, setRutasDisponibles] = useState<any[]>([]);
  const [tipoVehiculo, setTipoVehiculo] = useState<'Compactadora' | 'Trimoto' | 'Volteo' | 'Barrido' | 'Desmalezamiento' | 'Limpieza'>('Compactadora');
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

  // WakeLock: Mantener pantalla activa para evitar suspensión del navegador en ruta
  const wakeLockRef = useRef<any>(null);
  const requestWakeLock = async () => {
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
      }
    } catch (e) {}
  };


  // Status & history
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [historialHoy, setHistorialHoy] = useState<any[]>([]);
  const [viajeDiaActual, setViajeDiaActual] = useState<number>(1);
  const [totalToneladasHoy, setTotalToneladasHoy] = useState<number>(0);

  // 1. Verificar si ya tiene sesión activa de supervisor o admin
  useEffect(() => {
    try {
      const storedAuth = localStorage.getItem('supervisor_ruta_auth');
      const storedUserData = localStorage.getItem('supervisor_ruta_user_data');
      const adminUser = localStorage.getItem('adminUser') || '';
      let adminData: any = {};
      try {
        adminData = JSON.parse(localStorage.getItem('admin_user_data') || '{}');
      } catch {}

      let currentUData: any = null;
      let userIdent = '';

      if (storedAuth && storedUserData) {
        currentUData = JSON.parse(storedUserData);
        userIdent = (storedAuth || '').toLowerCase().trim();
        setSupervisor(currentUData.nombre || storedAuth);
        setSupervisorData(currentUData);
        setIsAuth(true);
      } else if (adminUser) {
        userIdent = adminUser.toLowerCase().trim();
        currentUData = adminData;
        setSupervisor(adminData.nombre || adminUser);
        setSupervisorData(adminData);
        setIsAuth(true);
      }

      // Check admin status
      const rol = ((currentUData?.rol || adminData?.rol || '') + '').toLowerCase().trim();
      if (
        userIdent === 'dzara' ||
        userIdent === 'administrador' ||
        userIdent === 'rvillegas' ||
        userIdent === 'roselyn villegas' ||
        rol === 'master' ||
        rol === 'administrador' ||
        rol === 'superadmin'
      ) {
        setIsAdminUser(true);
      }

      const lastU = localStorage.getItem('supervisor_last_unidad');
      const lastR = localStorage.getItem('supervisor_last_ruta');
      const lastCh = localStorage.getItem('supervisor_last_chofer');
      if (lastU) setUnidad(lastU);
      if (lastR) setRuta(lastR);
      if (lastCh) setChofer(lastCh);
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
        setIsAdminUser(true);
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
      localStorage.setItem('supervisor_activa_jornada', 'true');
      localStorage.setItem('supervisor_ruta_user_data', JSON.stringify(data));
      setSupervisor(data.nombre || data.usuario);
      setSupervisorData(data);
      if (
        data.usuario?.toLowerCase() === 'dzara' ||
        data.usuario?.toLowerCase() === 'administrador' ||
        rolUpper.includes('ADMIN') ||
        rolUpper.includes('MASTER')
      ) {
        setIsAdminUser(true);
      }
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
    localStorage.removeItem('supervisor_activa_jornada');
    localStorage.removeItem('supervisor_last_unidad');
    localStorage.removeItem('supervisor_last_ruta');
    localStorage.removeItem('supervisor_last_chofer');
    setIsAuth(false);
    setSupervisor('');
    setSupervisorData(null);
    setCoords(null);
    setUnidad('');
    alert('Sesión finalizada. El envío de ubicación satelital ha sido detenido.');
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

    // Registrar Service Worker de fondo para persistencia en segundo plano
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw-gps.js').catch(() => {});
    }

    // Ping por latido continuo cada 12 segundos incluso con pantalla bloqueada
    const heartbeatTimer = setInterval(() => {
      const u = localStorage.getItem('supervisor_last_unidad') || unidad;
      if (u && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((pos) => {
          const payloadGps = {
            unidad: u.trim(),
            supervisor: supervisor || 'Supervisor',
            ruta: localStorage.getItem('supervisor_last_ruta') || ruta || '',
            chofer: localStorage.getItem('supervisor_last_chofer') || chofer || '',
            lat: pos.coords.latitude,
            lng: pos.coords.longitude
          };
          fetch('/api/supervisor-rutas/gps', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payloadGps)
          }).then(res => {
            if (!res.ok) {
              guardarPuntoEnColaOffline(payloadGps);
            } else {
              // Si la transmisión tuvo éxito, verificar si había puntos pendientes en cola para enviarlos
              reintentarColaOffline();
            }
          }).catch(() => {
            guardarPuntoEnColaOffline(payloadGps);
          });
        }, () => {}, { enableHighAccuracy: true, maximumAge: 5000, timeout: 12000 });
      }
    }, 12000);

    // Activar WakeLock para evitar bloqueo de pantalla
    requestWakeLock();

    // Reintentar cuando vuelva la señal de internet
    const handleOnline = () => {
      reintentarColaOffline();
    };
    window.addEventListener('online', handleOnline);

    // Intentar sincronizar cola offline cada 20 segundos
    const syncTimer = setInterval(() => {
      reintentarColaOffline();
    }, 20000);

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

        const currentUnidad = localStorage.getItem('supervisor_last_unidad') || unidad;
        if (currentUnidad && currentUnidad.trim().length > 0) {
          const payloadGps = {
            unidad: currentUnidad.trim(),
            supervisor: supervisor || 'Supervisor',
            ruta: (localStorage.getItem('supervisor_last_ruta') || ruta || '').trim(),
            chofer: (localStorage.getItem('supervisor_last_chofer') || chofer || '').trim(),
            lat: c.lat,
            lng: c.lng
          };

          // Intentar transmitir en vivo
          fetch('/api/supervisor-rutas/gps', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payloadGps)
          }).then(res => {
            if (!res.ok) {
              guardarPuntoEnColaOffline(payloadGps);
            }
          }).catch(() => {
            // Sin cobertura/datos: acumular en la memoria del teléfono
            guardarPuntoEnColaOffline(payloadGps);
          });
        }
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 15000 }
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
    // REQ-OP-01: Obligatoriedad estricta de GPS impidiendo guardar sin coordenadas válidas
    if (!coords || !coords.lat || !coords.lng) {
      alert('⛔ ERROR GPS OBLIGATORIO: Se requiere geolocalización satelital activa y válida para registrar cualquier reporte o actividad operativa. Por favor presione "Actualizar" en la barra de GPS o active los permisos de ubicación en su dispositivo.');
      return;
    }

    if (!unidad.trim()) return alert('Debe indicar la unidad, cuadrilla o equipo');
    if (!ruta.trim()) return alert('Debe indicar la ruta o sector asignado');
    if (!toneladas || parseFloat(toneladas) < 0) return alert('Debe ingresar las toneladas o volumen recolectado');

    const tonNum = parseFloat(toneladas);
    if (isNaN(tonNum) || tonNum < 0) return alert('Monto de toneladas inválido');

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
            {/* FECHA DEL VIAJE / REGISTRO */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-bold text-slate-300 uppercase">
                  Fecha del Registro <span className="text-red-400">*</span>
                </label>
                {!isAdminUser ? (
                  <span className="text-[9px] bg-slate-800 text-emerald-400 px-2 py-0.5 rounded font-bold border border-slate-700">
                    Jornada de Hoy (Fija para Supervisor)
                  </span>
                ) : (
                  <span className="text-[9px] bg-purple-950/80 text-purple-300 px-2 py-0.5 rounded font-bold border border-purple-800">
                    Permiso Administrador (Cualquier Fecha)
                  </span>
                )}
              </div>
              <input
                type="date"
                value={isAdminUser ? fecha : todayStr}
                onChange={(e) => {
                  if (isAdminUser) {
                    setFecha(e.target.value);
                  }
                }}
                disabled={!isAdminUser}
                min={!isAdminUser ? todayStr : undefined}
                max={!isAdminUser ? todayStr : undefined}
                className={`w-full rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold border transition-colors ${
                  !isAdminUser
                    ? 'bg-slate-950 border-slate-800 text-slate-400 cursor-not-allowed'
                    : 'bg-slate-950 border-purple-500/60 text-purple-200 focus:outline-none focus:border-purple-400'
                }`}
                required
              />
              <p className="text-[10px] text-slate-500 mt-1">
                {!isAdminUser
                  ? 'Como supervisor en ruta, los viajes se registran automáticamente con la fecha de hoy.'
                  : 'Como administrador tiene la opción de registrar o consultar descargas de días anteriores.'}
              </p>
            </div>

            {/* TIPO DE VEHÍCULO / SERVICIO OPERATIVO (REQ-OP-04) */}
            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1.5">
                Tipo de Servicio / Vehículo Operativo <span className="text-red-400">*</span>
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {[
                  { id: 'Compactadora', label: 'Compactadora', icon: '🚛' },
                  { id: 'Trimoto', label: 'Trimoto', icon: '🛺' },
                  { id: 'Volteo', label: 'Volteo', icon: '🚚' },
                  { id: 'Barrido', label: 'Barrido', icon: '🧹' },
                  { id: 'Desmalezamiento', label: 'Desmalez.', icon: '🌿' },
                  { id: 'Limpieza', label: 'Limpieza', icon: '✨' }
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setTipoVehiculo(item.id as any);
                      if (unidad && (unidad.includes('Compactadora') || unidad.includes('Trimoto') || unidad.includes('Volteo') || unidad.includes('Cuadrilla') || unidad.includes('Equipo'))) {
                        setUnidad(
                          item.id === 'Barrido' ? 'Cuadrilla Barrido #01' :
                          item.id === 'Desmalezamiento' ? 'Equipo Desmalezamiento #01' :
                          item.id === 'Limpieza' ? 'Cuadrilla Limpieza #01' :
                          `${item.label} #01`
                        );
                      }
                    }}
                    className={`py-2 px-1.5 rounded-xl text-xs font-bold border transition-all flex flex-col items-center gap-1 ${
                      tipoVehiculo === item.id
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500 shadow-sm shadow-emerald-500/20'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <span className="text-base">{item.icon}</span>
                    <span className="text-[9px] sm:text-[11px] font-bold truncate max-w-full">{item.label}</span>
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
                  onChange={(e) => { setUnidad(e.target.value); localStorage.setItem('supervisor_last_unidad', e.target.value); }}
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
                      onClick={() => {
                        setUnidad(u);
                        localStorage.setItem('supervisor_last_unidad', u);
                      }}
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

            {/* RUTA Y SECTORES OPERATIVOS (REQ-OP-02) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-bold text-slate-300 uppercase">
                  Ruta y Sectores Detallados <span className="text-red-400">*</span>
                </label>
                <span className="text-[9px] text-emerald-400 font-mono">Cronograma Silva</span>
              </div>
              <input
                type="text"
                placeholder="Ej. Ruta 1 - Casco Central, Calle Ayacucho, Av. Silva"
                value={ruta}
                onChange={(e) => { setRuta(e.target.value); localStorage.setItem('supervisor_last_ruta', e.target.value); }}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                required
              />
              
              {/* Desglose detallado de lugares y sectores de ruta según cronograma (REQ-OP-02) */}
              <div className="mt-2 space-y-1.5">
                <span className="text-[10px] text-slate-400 font-semibold block">Puntos y Sectores de Ruta Frecuentes:</span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'Ruta Especial: Cobertura de Días Anteriores / Contingencia',
                    'Ruta 1: Casco Central, C. Ayacucho, Av. Silva',
                    'Ruta 2: Morrocoy, Caño Salado, Las Delicias',
                    'Ruta 3: Carretera Nacional, El Calvario',
                    'Ruta 4: La Soledad, Sanare, José Félix Ribas',
                    'Ruta 5: Zona Hotelera, Marina, C.C. Trébol',
                    'Ruta 6: Boca de Aroa, Playa Norte, Áreas Verdes',
                    'Barrido Central: Av. Silva, Plaza Bolívar, Calle Bermúdez',
                    'Desmalezamiento: Entrada Nacional y Enlaces Viales'
                  ].map((rText, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setRuta(rText);
                        localStorage.setItem('supervisor_last_ruta', rText);
                      }}
                      className={`text-[9px] px-2 py-1 rounded-lg border text-left transition-colors ${
                        ruta === rText
                          ? (rText.includes('Especial') ? 'bg-amber-500/20 text-amber-300 border-amber-500 font-bold' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500')
                          : (rText.includes('Especial') ? 'bg-amber-950/40 text-amber-400 border-amber-800/80 hover:border-amber-600 font-bold' : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white hover:border-slate-700')
                      }`}
                    >
                      {rText}
                    </button>
                  ))}
                </div>
              </div>
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
                  onChange={(e) => { setChofer(e.target.value); localStorage.setItem('supervisor_last_chofer', e.target.value); }}
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

        {/* LISTADO DE DESCARGAS REGISTRADAS */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-2.5 gap-2">
            <h3 className="text-xs sm:text-sm font-black text-white uppercase flex items-center gap-2">
              <History className="w-4 h-4 text-emerald-400" /> Historial de Viajes ({historialHoy.length})
            </h3>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="bg-slate-950 border border-slate-700 text-slate-200 text-[11px] rounded-lg px-2.5 py-1 outline-none focus:border-emerald-500 font-semibold"
                title="Cambiar fecha a consultar"
              />
              <button
                type="button"
                onClick={() => loadHistorial(fecha, unidad)}
                className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded transition-colors"
                title="Refrescar historial"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
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
