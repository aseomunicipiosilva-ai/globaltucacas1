'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Lock, User, AlertCircle, Eye, EyeOff, ShieldAlert } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { logAudit } from '@/lib/audit';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export default function AdminAuthWrapper({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const clearAuthSession = useCallback((reason?: string) => {
    localStorage.removeItem('admin_auth_andministrador');
    localStorage.removeItem('admin_user_data');
    localStorage.removeItem('adminUser');
    localStorage.removeItem('adminLetra');
    localStorage.removeItem('adminToken');
    setIsAuthenticated(false);
    if (reason) {
      setError(reason);
    }
  }, []);

  // Función crítica: valida en tiempo real con Supabase si el trabajador existe y sigue ACTIVO
  const verifyActiveSession = useCallback(async (): Promise<boolean> => {
    const auth = localStorage.getItem('admin_auth_andministrador');
    const adminUser = localStorage.getItem('adminUser');

    if (auth !== 'true' || !adminUser) {
      clearAuthSession();
      return false;
    }

    // Bypass maestro dzara
    if (adminUser.toLowerCase() === 'dzara') {
      return true;
    }

    try {
      // Normalizar nombre de usuario si viene con prefijo de letra (ej. "Q-rvillegas" -> "rvillegas")
      const cleanUser = adminUser.includes('-') ? adminUser.split('-').slice(1).join('-').trim() : adminUser.trim();

      const { data, error: dbError } = await supabase
        .from('trabajadores')
        .select('id, usuario, estado, rol, nombre, permisos, letra')
        .ilike('usuario', cleanUser)
        .maybeSingle();

      // Si hay error de red o timeout con Supabase, NO revocar sesión (evita falsos positivos por microcortes de internet)
      if (dbError) {
        console.warn('Aviso temporal conectando con base de datos al verificar sesión:', dbError.message);
        return true;
      }

      // Si la consulta fue exitosa pero el registro NO existe en absoluto
      if (!data) {
        logAudit('Sesión Revocada (Usuario Eliminado)', { usuario: adminUser }, 'SESION');
        clearAuthSession('Tu cuenta ha sido eliminada del sistema. Acceso revocado permanentemente.');
        return false;
      }

      if (data.estado !== 'Activo') {
        logAudit('Sesión Revocada (Usuario Suspendido)', { usuario: adminUser }, 'SESION');
        clearAuthSession('Tu cuenta se encuentra suspendida. No tienes acceso al sistema.');
        return false;
      }

      // Sincronizar datos locales frescos
      localStorage.setItem('admin_user_data', JSON.stringify(data));
      if (data.letra) localStorage.setItem('adminLetra', data.letra);
      return true;
    } catch (e) {
      console.error('Error validando sesión de trabajador:', e);
      return true;
    }
  }, [clearAuthSession]);

  // Verificación al cargar la aplicación
  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      const auth = localStorage.getItem('admin_auth_andministrador');
      if (auth === 'true') {
        const isValid = await verifyActiveSession();
        if (isMounted) {
          setIsAuthenticated(isValid);
        }
      } else {
        if (isMounted) setIsAuthenticated(false);
      }
      if (isMounted) setLoading(false);
    };

    init();
    return () => { isMounted = false; };
  }, [verifyActiveSession]);

  // Monitoreo periódico y al enfocar pestaña para expulsar inmediatamente si es suspendido o eliminado
  useEffect(() => {
    if (!isAuthenticated) return;

    const intervalId = setInterval(() => {
      verifyActiveSession();
    }, 40000); // Cada 40 segundos

    const handleFocus = () => {
      verifyActiveSession();
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
    };
  }, [isAuthenticated, verifyActiveSession]);

  // AUTO LOGOUT POR INACTIVIDAD (7 MINUTOS)
  useEffect(() => {
    if (!isAuthenticated) return;
    
    let timeoutId: NodeJS.Timeout;

    const resetTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        logAudit('Logout (Inactividad 7m)', {}, 'SESION');
        clearAuthSession('Sesión cerrada por inactividad.');
        window.location.href = '/admin'; // Force full reload to login screen
      }, 420000); // 7 minutes
    };

    const events = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll'];
    events.forEach(e => window.addEventListener(e, resetTimer));
    resetTimer(); // Start the timer

    return () => {
      clearTimeout(timeoutId);
      events.forEach(e => window.removeEventListener(e, resetTimer));
    };
  }, [isAuthenticated, clearAuthSession]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthenticating(true);
    setError('');

    if (username.toLowerCase() === 'dzara' && (password === 'dzara' || password === 'andministrador')) {
      localStorage.setItem('admin_auth_andministrador', 'true');
      localStorage.setItem('admin_user_data', JSON.stringify({ nombre: 'David Zara', rol: 'Master', usuario: 'dzara' }));
      localStorage.setItem('adminUser', 'dzara');
      setIsAuthenticated(true);
      setIsAuthenticating(false);
      logAudit('Login Exitoso (Master)', { usuario: 'dzara' }, 'SESION');
      return;
    }

    try {
      const { data, error: dbError } = await supabase
        .from('trabajadores')
        .select('*')
        .ilike('usuario', username.trim())
        .maybeSingle();

      if (dbError || !data) {
        setError('Usuario no encontrado');
        logAudit('Intento de Login Fallido (No encontrado)', { usuario: username }, 'SESION');
        setIsAuthenticating(false);
        return;
      }

      if (data.estado !== 'Activo') {
        setError('Esta cuenta se encuentra suspendida. Acceso no permitido.');
        logAudit('Intento de Login (Cuenta Suspendida)', { usuario: username }, 'SESION');
        setIsAuthenticating(false);
        return;
      }

      if (String(data.clave || "").trim() === String(password || "").trim()) {
        localStorage.setItem('admin_auth_andministrador', 'true');
        localStorage.setItem('admin_user_data', JSON.stringify(data));
        localStorage.setItem('adminUser', data.usuario);
        if (data.letra) localStorage.setItem('adminLetra', data.letra);
        setIsAuthenticated(true);
        logAudit('Login Exitoso', { usuario: data.usuario, rol: data.rol }, 'SESION');
      } else {
        setError('Contraseña incorrecta');
        logAudit('Intento de Login Fallido', { usuario: username, error: 'Contrasena incorrecta' }, 'SESION');
      }
    } catch (err) {
      console.error(err);
      setError('Error al conectar con la base de datos');
    } finally {
      setIsAuthenticating(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center">Cargando...</div>;

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white p-4">
        <div className="w-full max-w-sm">
          <div className="bg-white rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.12)] border border-slate-100 overflow-hidden">
            {/* Header branding */}
            <div className="pt-10 pb-6 px-8 text-center">
              <div className="flex justify-center mb-3">
                <img src="/logos/global_rec.jpg" alt="Global Rec" className="h-16 w-auto object-contain" />
              </div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Global Rec</h1>
              <p className="text-[11px] font-semibold tracking-[0.18em] text-slate-400 uppercase mt-0.5">Collection System</p>
              <p className="text-sm font-bold text-slate-700 mt-3 uppercase tracking-widest">Administración</p>
            </div>
            <div className="px-8 pb-8">
              <p className="text-sm text-slate-500 text-center mb-6 leading-snug">Ingresa tus credenciales para acceder de forma segura.</p>
          
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wide">Usuario</label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 text-slate-400" size={18} />
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:border-slate-400 outline-none transition-all font-medium text-slate-700"
                  placeholder="Ingrese usuario"
                  required
                />
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wide">Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 text-slate-400" size={18} />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:border-slate-400 outline-none transition-all font-medium text-slate-700"
                  placeholder="Ingrese contraseña"
                  required
                />
                <button
                  type="button"
                  onClick={() => {
                    setShowPassword(!showPassword);
                  }}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 p-2.5 rounded-lg text-xs font-semibold text-center flex items-center justify-center gap-1.5">
                <ShieldAlert className="w-4 h-4 shrink-0 text-red-500" />
                <span>{error}</span>
              </div>
            )}

            <button 
              type="submit" 
              disabled={isAuthenticating}
              className="w-full bg-[#c8e64c] hover:bg-[#b8d93c] text-slate-900 font-bold py-3 rounded-lg shadow-md shadow-blue-500/30 transition-all mt-4 active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isAuthenticating ? <AlertCircle className="w-5 h-5 animate-spin" /> : null}
              {isAuthenticating ? 'Verificando...' : 'Iniciar Sesión'}
            </button>
          </form>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
