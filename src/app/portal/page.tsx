'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Building2, LogIn, ShieldCheck, UserPlus, Key, Mail, Phone, Lock, Eye, EyeOff } from 'lucide-react';

export default function PortalLogin() {
  const router = useRouter();
  const [docType, setDocType] = useState('J');
  const [docNum, setDocNum] = useState('');
  const [clave, setClave] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Setup state
  const [isSetupMode, setIsSetupMode] = useState(false);
  const [correo, setCorreo] = useState('');
  const [telefono, setTelefono] = useState('');
  const [confirmClave, setConfirmClave] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (docNum.length < 6) {
      setError('Por favor ingrese un número de documento válido.');
      setIsLoading(false);
      return;
    }

    if (!clave) {
      setError('Por favor ingrese su contraseña.');
      setIsLoading(false);
      return;
    }

    try {
      const fullDoc = `${docType}${docNum}`;
      const res = await fetch(`/api/contribuyente/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identidad: fullDoc, clave })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        if (data.status === 'setup_required') {
          // Si no tiene clave, cambiar a modo configuración
          setIsSetupMode(true);
          setIsLoading(false);
          return;
        }

        // Login exitoso
        localStorage.setItem('portal_user', data.nombre);
        localStorage.setItem('portal_doc', fullDoc);
        localStorage.setItem('portal_codigo', data.codigo);
        router.push('/portal/dashboard');
      } else {
        setError(data.error || 'Error al iniciar sesión.');
        setIsLoading(false);
      }
    } catch (err) {
      setError('Error de conexión.');
      setIsLoading(false);
    }
  };

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (clave !== confirmClave) {
      setError('Las contraseñas no coinciden.');
      setIsLoading(false);
      return;
    }

    if (!correo) {
      setError('El correo electrónico es obligatorio para la recuperación de contraseña.');
      setIsLoading(false);
      return;
    }

    try {
      const fullDoc = `${docType}${docNum}`;
      const res = await fetch(`/api/contribuyente/setup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identidad: fullDoc, correo, telefono, clave })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        // Setup exitoso, log in
        localStorage.setItem('portal_user', data.nombre);
        localStorage.setItem('portal_doc', fullDoc);
        localStorage.setItem('portal_codigo', data.codigo);
        router.push('/portal/dashboard');
      } else {
        setError(data.error || 'Error al configurar cuenta.');
        setIsLoading(false);
      }
    } catch (err) {
      setError('Error de conexión.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white max-w-md w-full rounded-2xl shadow-xl overflow-hidden border border-slate-200">
        <div className="bg-[#0f172a] p-8 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full opacity-10 "></div>
          <div className="relative z-10 flex justify-center mb-4">
            <div className="bg-white/10 p-4 rounded-full backdrop-blur-sm">
              <Building2 className="w-10 h-10 text-green-400" />
            </div>
          </div>
          <h1 className="relative z-10 text-2xl font-bold text-white tracking-wider">
            <span className="text-green-500">GLOBAL</span> REC
          </h1>
          <p className="relative z-10 text-slate-400 mt-2 text-sm uppercase tracking-widest font-semibold">
            Portal del Contribuyente
          </p>
        </div>

        <div className="p-8">
          <div className="mb-6 text-center">
            {isSetupMode ? (
              <>
                <h2 className="text-lg font-bold text-slate-800">Configure su Cuenta</h2>
                <p className="text-sm text-slate-500 mt-1">Es su primer ingreso. Por favor asigne una contraseña y un correo (necesario para recuperación) para continuar.</p>
              </>
            ) : (
              <>
                <h2 className="text-lg font-bold text-slate-800">Autogestión en Línea</h2>
                <p className="text-sm text-slate-500 mt-1">Ingrese su identificación y contraseña para acceder a su estado de cuenta y reportar pagos.</p>
              </>
            )}
          </div>

          {error && (
            <div className="mb-6 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm text-center font-medium">
              {error}
            </div>
          )}

          <form onSubmit={isSetupMode ? handleSetup : handleLogin} className="space-y-6">
            {!isSetupMode && (
              <>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
                    Documento de Identidad (RIF / Cédula)
                  </label>
                  <div className="flex gap-3">
                    <select 
                      value={docType}
                      onChange={(e) => setDocType(e.target.value)}
                      className="w-1/4 border-2 border-slate-200 rounded-lg px-3 py-3 text-sm font-bold text-slate-700 outline-none focus:border-green-500 bg-slate-50 appearance-none text-center"
                    >
                      <option value="J">J</option>
                      <option value="V">V</option>
                      <option value="G">G</option>
                      <option value="E">E</option>
                      <option value="P">P</option>
                    </select>
                    <input 
                      type="text" 
                      required
                      placeholder="Ej: 123456789"
                      value={docNum}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '');
                        setDocNum(val);
                        e.target.value = val;
                      }}
                      className="w-3/4 border-2 border-slate-200 rounded-lg px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-green-500" 
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
                    Contraseña
                  </label>
                  <div className="relative">
                    <Lock className="w-5 h-5 absolute left-3 top-3.5 text-slate-400" />
                    <input 
                      type={showPassword ? "text" : "password"} 
                      required
                      value={clave}
                      onChange={(e) => setClave(e.target.value)}
                      placeholder="********"
                      className="w-full border-2 border-slate-200 rounded-lg pl-10 pr-10 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-green-500" 
                    />
                    <button 
                      type="button"
                      onClick={() => {
                        setShowPassword(!showPassword);
                      }}
                      className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              </>
            )}

            {isSetupMode && (
              <div className="space-y-4">
                <div className="bg-blue-50 text-blue-800 p-3 rounded-lg text-xs font-medium border border-blue-100">
                  Documento actual: <strong>{docType}-{docNum}</strong>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Correo Electrónico (Obligatorio)
                  </label>
                  <p className="text-[10px] text-slate-500 mb-2">Este correo debe estar activo para poder recuperar su contraseña si la olvida.</p>
                  <div className="relative">
                    <Mail className="w-5 h-5 absolute left-3 top-3.5 text-slate-400" />
                    <input 
                      type="email" 
                      required
                      value={correo}
                      onChange={(e) => setCorreo(e.target.value)}
                      placeholder="ejemplo@correo.com"
                      className="w-full border-2 border-slate-200 rounded-lg pl-10 px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-green-500" 
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
                    Teléfono
                  </label>
                  <div className="relative">
                    <Phone className="w-5 h-5 absolute left-3 top-3.5 text-slate-400" />
                    <input 
                      type="tel" 
                      required
                      value={telefono}
                      onChange={(e) => setTelefono(e.target.value)}
                      placeholder="04141234567"
                      className="w-full border-2 border-slate-200 rounded-lg pl-10 px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-green-500" 
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
                    Confirmar Contraseña
                  </label>
                  <div className="relative">
                    <Key className="w-5 h-5 absolute left-3 top-3.5 text-slate-400" />
                    <input 
                      type={showPassword ? "text" : "password"} 
                      required
                      value={confirmClave}
                      onChange={(e) => setConfirmClave(e.target.value)}
                      placeholder="Confirme la contraseña"
                      className="w-full border-2 border-slate-200 rounded-lg pl-10 pr-10 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-green-500" 
                    />
                  </div>
                </div>
              </div>
            )}

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-70 mt-4"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <LogIn className="w-5 h-5" /> {isSetupMode ? 'Guardar y Continuar' : 'Iniciar Sesión'}
                </>
              )}
            </button>
            
            {!isSetupMode && (
              <div className="mt-4 flex flex-col gap-2 text-center">
                <p className="text-sm text-slate-600">
                  ¿Olvidaste tu contraseña?{' '}
                  <Link href="/portal/recuperar" className="text-orange-600 font-bold hover:underline inline-flex items-center gap-1">
                    Recuperar aquí
                  </Link>
                </p>
                <p className="text-sm text-slate-600">
                  ¿No tienes cuenta?{' '}
                  <Link href="/portal/registro" className="text-green-600 font-bold hover:underline inline-flex items-center gap-1">
                    <UserPlus className="w-4 h-4" /> Regístrate aquí
                  </Link>
                </p>
              </div>
            )}
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-center gap-2 text-xs text-slate-500">
            <ShieldCheck className="w-4 h-4 text-green-600" />
            Acceso seguro y encriptado
          </div>
        </div>
      </div>
    </div>
  );
}
