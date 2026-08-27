'use client';
import { useState } from 'react';
import { Building2, Users, ArrowRight, LayoutDashboard, Lock, Unlock } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const [funcionarioActivo, setFuncionarioActivo] = useState(false);
  const [adminActivo, setAdminActivo] = useState(false);
  const [recaudacionActivo, setRecaudacionActivo] = useState(false);

  const toggleAcceso = (tipo: string, estadoActual: boolean, setter: any) => {
    if (estadoActual) {
      setter(false);
    } else {
      const password = prompt(`Ingrese la clave para activar el módulo ${tipo}:`);
      if (password === 'dzara') {
        setter(true);
      } else if (password !== null) {
        alert('Clave incorrecta');
      }
    }
  };

  const handleLinkClick = (e: any, activo: boolean, href: string) => {
    if (!activo) {
      e.preventDefault();
      alert('Este módulo está desactivado. Haga clic en el candado para desbloquearlo.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      {/* Hero Selection Gateway */}
      <div className="bg-[#0f172a] rounded-2xl overflow-hidden shadow-2xl relative w-full max-w-5xl">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
        <div className="relative z-10 p-10 md:p-16 text-center">
          <div className="flex justify-center mb-6">
            <Building2 className="w-16 h-16 text-green-400" />
          </div>
          <h1 className="text-3xl md:text-5xl font-bold text-white tracking-wider mb-4">
            <span className="text-green-500">GLOBAL</span> GREEN
          </h1>
          <p className="text-slate-300 text-lg max-w-2xl mx-auto mb-12">
            Sistema Integrado de Administración Pública Municipal. Seleccione su módulo para acceder.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto mb-6">
            {/* Tarjeta Contribuyente (Siempre Activa) */}
            <Link href="/portal" className="group bg-white/10 hover:bg-white/20 border border-white/20 p-8 rounded-xl backdrop-blur-sm transition-all duration-300 flex flex-col items-center hover:scale-105">
              <div className="bg-green-500/20 p-4 rounded-full mb-4 group-hover:bg-green-500/40 transition-colors">
                <Users className="w-10 h-10 text-green-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Soy Contribuyente</h2>
              <p className="text-xs text-slate-300 mb-6 text-center">
                Paga tus servicios, tramita solvencias y reporta incidencias de manera rápida y segura.
              </p>
              <div className="mt-auto flex items-center gap-2 text-green-400 font-semibold group-hover:gap-3 transition-all text-sm">
                Ingresar al Portal <ArrowRight className="w-4 h-4" />
              </div>
            </Link>

            {/* Tarjeta Funcionario (Aseo - Siempre Activa) */}
            <Link href="/admin" className="group bg-white/10 hover:bg-white/20 border border-white/20 p-8 rounded-xl backdrop-blur-sm transition-all duration-300 flex flex-col items-center hover:scale-105">
              <div className="bg-cyan-500/20 p-4 rounded-full mb-4 group-hover:bg-cyan-500/40 transition-colors">
                <Building2 className="w-10 h-10 text-cyan-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Soy Funcionario</h2>
              <p className="text-xs text-slate-300 mb-6 text-center">
                Acceso al sistema administrativo para gestión de recaudación y reportes de aseo.
              </p>
              <div className="mt-auto flex items-center gap-2 text-cyan-400 font-semibold group-hover:gap-3 transition-all text-sm">
                Acceder al Sistema <ArrowRight className="w-4 h-4" />
              </div>
            </Link>

            {/* Tarjeta Operador Móvil (Siempre Activa) */}
            <Link href="/operador/login" className="group bg-white/10 hover:bg-white/20 border border-white/20 p-8 rounded-xl backdrop-blur-sm transition-all duration-300 flex flex-col items-center hover:scale-105">
              <div className="bg-orange-500/20 p-4 rounded-full mb-4 group-hover:bg-orange-500/40 transition-colors">
                <Users className="w-10 h-10 text-orange-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2 text-center">Operador de Censo</h2>
              <p className="text-xs text-slate-300 mb-6 text-center">
                Módulo móvil exclusivo para trabajadores en jornada de empadronamiento de calle.
              </p>
              <div className="mt-auto flex items-center gap-2 text-orange-400 font-semibold group-hover:gap-3 transition-all text-sm">
                Ingresar Móvil <ArrowRight className="w-4 h-4" />
              </div>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {/* Tarjeta Recaudación de Impuestos (Bloqueable) */}
            <div className={`relative group p-8 rounded-xl backdrop-blur-sm transition-all duration-300 flex flex-col items-center border ${recaudacionActivo ? 'bg-white/10 hover:bg-white/20 border-yellow-500/30 hover:scale-105 shadow-[0_0_15px_rgba(234,179,8,0.15)]' : 'bg-slate-800/50 border-slate-700 grayscale opacity-75'}`}>
              <button 
                onClick={(e) => { e.preventDefault(); toggleAcceso('Recaudación', recaudacionActivo, setRecaudacionActivo); }}
                className="absolute top-4 right-4 p-2 rounded-full bg-slate-800 hover:bg-slate-700 transition-colors z-20"
              >
                {recaudacionActivo ? <Unlock className="w-4 h-4 text-yellow-400" /> : <Lock className="w-4 h-4 text-slate-400" />}
              </button>
              <Link href="/admin/recaudacion" onClick={(e) => handleLinkClick(e, recaudacionActivo, '/admin/recaudacion')} className="flex flex-col items-center w-full h-full z-10">
                <div className="bg-yellow-500/20 p-4 rounded-full mb-4 group-hover:bg-yellow-500/40 transition-colors">
                  <Building2 className={`w-12 h-12 ${recaudacionActivo ? 'text-yellow-400' : 'text-slate-500'}`} />
                </div>
                <h2 className={`text-2xl font-black mb-3 text-center uppercase tracking-wide ${recaudacionActivo ? 'text-yellow-400' : 'text-slate-400'}`}>Recaudación de Impuestos</h2>
                <ul className="text-xs text-slate-300 mb-6 text-left space-y-1 w-full max-w-xs list-disc pl-4">
                  <li>Actividades Económicas y Declaraciones</li>
                  <li>Catastro y Propiedad</li>
                  <li>Vehículos (Registro y Patente)</li>
                  <li>Ordenamiento Territorial y Vialidad</li>
                  <li>Policía Municipal (Multas)</li>
                </ul>
                <div className={`mt-auto flex items-center gap-2 font-bold group-hover:gap-3 transition-all text-sm ${recaudacionActivo ? 'text-yellow-400' : 'text-slate-500'}`}>
                  Ingresar a Recaudación <ArrowRight className="w-4 h-4" />
                </div>
              </Link>
            </div>

            {/* Tarjeta Administración Pública (Bloqueable) */}
            <div className={`relative group p-8 rounded-xl backdrop-blur-sm transition-all duration-300 flex flex-col items-center border ${adminActivo ? 'bg-white/10 hover:bg-white/20 border-blue-500/30 hover:scale-105 shadow-[0_0_15px_rgba(59,130,246,0.15)]' : 'bg-slate-800/50 border-slate-700 grayscale opacity-75'}`}>
              <button 
                onClick={(e) => { e.preventDefault(); toggleAcceso('Administración Interna', adminActivo, setAdminActivo); }}
                className="absolute top-4 right-4 p-2 rounded-full bg-slate-800 hover:bg-slate-700 transition-colors z-20"
              >
                {adminActivo ? <Unlock className="w-4 h-4 text-blue-400" /> : <Lock className="w-4 h-4 text-slate-400" />}
              </button>
              <Link href="/admin/administracion" onClick={(e) => handleLinkClick(e, adminActivo, '/admin/administracion')} className="flex flex-col items-center w-full h-full z-10">
                <div className="bg-blue-500/20 p-4 rounded-full mb-4 group-hover:bg-blue-500/40 transition-colors">
                  <LayoutDashboard className={`w-12 h-12 ${adminActivo ? 'text-blue-400' : 'text-slate-500'}`} />
                </div>
                <h2 className={`text-2xl font-black mb-3 text-center uppercase tracking-wide ${adminActivo ? 'text-blue-400' : 'text-slate-400'}`}>Administración Pública</h2>
                <ul className="text-xs text-slate-300 mb-6 text-left space-y-1 w-full max-w-xs list-disc pl-4">
                  <li>Ingresos y Egresos Presupuestarios</li>
                  <li>Plan de Contrataciones y Compras</li>
                  <li>Bienes Nacionales e Inventario</li>
                  <li>Nómina y Control de Personal (RRHH)</li>
                </ul>
                <div className={`mt-auto flex items-center gap-2 font-bold group-hover:gap-3 transition-all text-sm ${adminActivo ? 'text-blue-400' : 'text-slate-500'}`}>
                  Ingresar a Administración <ArrowRight className="w-4 h-4" />
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
