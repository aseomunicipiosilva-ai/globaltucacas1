'use client';
import { Building2, Users, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function Home() {
  const [showContribuyente, setShowContribuyente] = useState(true);

  useEffect(() => {
    const host = window.location.hostname;
    // Si entran por el dominio administrativo, ocultar contribuyente
    if (host.includes('aseosilvaad')) {
      setShowContribuyente(false);
    } 
    // Si entran por el dominio exclusivo de contribuyentes, redirigir directo
    else if (host.includes('aseosilva.globalrecca.com')) {
      window.location.href = '/portal';
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0f1e] flex items-center justify-center p-4">
      <div className="w-full max-w-5xl">

        {/* Banner de logos institucionales */}
        <div className="bg-white rounded-2xl shadow-2xl px-8 py-6 mb-8">
          <p className="text-center text-xs text-slate-400 uppercase tracking-widest mb-5 font-semibold">
            Sistema Integrado de Administración Pública Municipal
          </p>
          <div className="flex items-center justify-center gap-10 flex-wrap">
            <img src="/logos/alcaldia.jpg" alt="Alcaldía del Municipio Silva" className="h-24 w-auto object-contain shrink-0" />
            <div className="w-px h-20 bg-slate-200 hidden md:block shrink-0" />
            <img src="/logos/isma.jpg" alt="ISMA" className="h-28 w-auto object-contain shrink-0 scale-110" />
            <div className="w-px h-20 bg-slate-200 hidden md:block shrink-0" />
            <img src="/logos/global_rec.jpg" alt="Global Rec - Global Rec" className="h-24 w-auto object-contain shrink-0" />
            <div className="w-px h-20 bg-slate-200 hidden md:block shrink-0" />
            <img src="/logos/basura_cero.jpg" alt="Basura Cero" className="h-24 w-auto object-contain shrink-0" />
          </div>
        </div>

        {/* Hero / Tarjetas de acceso */}
        <div className="bg-[#0f172a] rounded-2xl overflow-hidden shadow-2xl relative">
          <div className="absolute top-0 left-0 w-full h-full opacity-10"></div>
          <div className="relative z-10 p-8 md:p-12 text-center">
            <h1 className="text-2xl md:text-3xl font-bold text-white tracking-wider mb-2">
              <span className="text-green-400">GLOBAL</span> REC
            </h1>
            <p className="text-slate-400 text-sm max-w-xl mx-auto mb-10">
              Seleccione su módulo para acceder al sistema.
            </p>

            <div className={`grid grid-cols-1 ${showContribuyente ? 'md:grid-cols-3' : 'md:grid-cols-2 max-w-3xl mx-auto'} gap-6`}>
              
              {showContribuyente && (
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
              )}

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
          </div>
        </div>

      </div>
    </div>
  );
}
