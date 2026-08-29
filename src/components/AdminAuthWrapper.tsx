'use client';
import React, { useState, useEffect } from 'react';
import { Lock, User } from 'lucide-react';

export default function AdminAuthWrapper({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const auth = localStorage.getItem('admin_auth_dzara');
    if (auth === 'true') {
      setIsAuthenticated(true);
    }
    setLoading(false);
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.toLowerCase() === 'dzara' && password === 'dzara') {
      localStorage.setItem('admin_auth_dzara', 'true');
      setIsAuthenticated(true);
      setError('');
    } else {
      setError('Credenciales incorrectas');
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
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-medium text-slate-700"
                  placeholder="Ingrese contraseña"
                  required
                />
              </div>
            </div>

            {error && <p className="text-red-500 text-xs text-center font-bold">{error}</p>}

            <button 
              type="submit" 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg shadow-md shadow-blue-500/30 transition-all mt-4 active:scale-95 flex items-center justify-center gap-2"
            >
              Iniciar Sesión
            </button>
          </form>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
