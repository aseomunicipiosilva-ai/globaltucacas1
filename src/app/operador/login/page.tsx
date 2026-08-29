'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, User, Lock, Building2 } from 'lucide-react';

export default function OperadorLogin() {
  const router = useRouter();
  const [usuario, setUsuario] = useState('');
  const [clave, setClave] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // En un sistema real, aquí harías fetch a tu backend de Trabajadores.
    // Como esto es un MVP front-end sin autenticación real backend aún, simulamos:
    
    const userUpper = usuario.trim().toUpperCase();
    if (userUpper === 'CATASTRO' || userUpper === 'HACIENDA') {
      if (clave !== '1042700') {
        setError('Clave incorrecta para este usuario especial');
        return;
      }
    }

    if (usuario.trim().length > 0 && clave.length > 0) {
      // Guardamos el nombre del usuario logueado
      localStorage.setItem('operador_censo_auth', userUpper);
      router.push('/operador');
    } else {
      setError('Credenciales incorrectas');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Fondo decorativo */}
      <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] pointer-events-none"></div>
      
      <div className="w-full max-w-sm relative z-10">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="bg-orange-600 p-8 text-center text-white relative">
            <div className="bg-white/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
              <Building2 className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-black tracking-tight">GLOBAL GREEN</h1>
            <p className="text-orange-200 text-sm font-medium mt-1">Módulo Operador de Censo</p>
          </div>
          
          <form onSubmit={handleLogin} className="p-8 space-y-6">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded text-sm text-center border border-red-200 font-semibold">
                {error}
              </div>
            )}
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Usuario Asignado</label>
                <div className="relative">
                  <User className="w-5 h-5 absolute left-3 top-2.5 text-slate-400" />
                  <input 
                    type="text" 
                    required
                    value={usuario}
                    onChange={e => setUsuario(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-4 py-2.5 text-sm outline-none focus:border-orange-500 focus:bg-white transition-all font-medium text-slate-700" 
                    placeholder="Ej. jperez"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Contraseña</label>
                <div className="relative">
                  <Lock className="w-5 h-5 absolute left-3 top-2.5 text-slate-400" />
                  <input 
                    type="password" 
                    required
                    value={clave}
                    onChange={e => setClave(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-4 py-2.5 text-sm outline-none focus:border-orange-500 focus:bg-white transition-all font-medium text-slate-700" 
                    placeholder="********"
                  />
                </div>
              </div>
            </div>

            <button 
              type="submit" 
              className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 shadow-lg shadow-orange-500/30 transition-all active:scale-95"
            >
              <ShieldCheck className="w-5 h-5" /> Iniciar Jornada
            </button>
          </form>
        </div>
        
        <p className="text-center text-slate-500 text-xs mt-6 font-medium">
          Sistema Exclusivo de Empadronamiento de Calle
        </p>
      </div>
    </div>
  );
}
