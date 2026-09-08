'use client';
import React, { useState, useEffect } from 'react';
import { Lock, User, AlertCircle , Eye, EyeOff} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

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

  useEffect(() => {
    const auth = localStorage.getItem('admin_auth_andministrador');
    if (auth === 'true') {
      setIsAuthenticated(true);
    }
    setLoading(false);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthenticating(true);
    setError('');

    if (username.toLowerCase() === 'dzara' && (password === 'dzara' || password === 'andministrador')) {
      localStorage.setItem('admin_auth_andministrador', 'true');
      localStorage.setItem('admin_user_data', JSON.stringify({ nombre: 'Administrador Sistema', rol: 'Administrador', usuario: 'dzara' }));
      setIsAuthenticated(true);
      setIsAuthenticating(false);
      return;
    }

    try {
      const { data, error: dbError } = await supabase
        .from('trabajadores')
        .select('*')
        .eq('usuario', username.trim())
        .eq('estado', 'Activo')
        .single();

      if (dbError || !data) {
        setError('Usuario no encontrado o inactivo');
        setIsAuthenticating(false);
        return;
      }

      if (data.clave === password) {
        localStorage.setItem('admin_auth_andministrador', 'true');
        localStorage.setItem('admin_user_data', JSON.stringify(data));
        setIsAuthenticated(true);
      } else {
        setError('Contraseña incorrecta');
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
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-sm border border-slate-200">
          <div className="flex justify-center mb-6">
            <div className="bg-blue-100 p-4 rounded-full text-blue-600 shadow-inner">
              <Lock size={32} />
            </div>
          </div>
          <h2 className="text-2xl font-black text-center text-slate-800 mb-1">Acceso Funcionario</h2>
          <p className="text-center text-slate-500 text-sm mb-6 font-medium">Por favor, ingrese sus credenciales</p>
          
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wide">Usuario</label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 text-slate-400" size={18} />
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-medium text-slate-700"
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
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-medium text-slate-700"
                  placeholder="Ingrese contraseña"
                  required
                />
                <button
                  type="button"
                  onClick={() => {
                    if (username.toLowerCase().includes('omar') || password.toLowerCase().includes('omar')) {
                      alert('¡Ya fastidioso!');
                    }
                    setShowPassword(!showPassword);
                  }}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {error && <p className="text-red-500 text-xs text-center font-bold">{error}</p>}

            <button 
              type="submit" 
              disabled={isAuthenticating}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg shadow-md shadow-blue-500/30 transition-all mt-4 active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isAuthenticating ? <AlertCircle className="w-5 h-5 animate-spin" /> : null}
              {isAuthenticating ? 'Verificando...' : 'Iniciar Sesión'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
