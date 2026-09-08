'use client';
import { Building2, Users, ArrowRight, Smartphone } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { logos } from '@/lib/logosBase64';

export default function Home() {
  const [showContribuyente, setShowContribuyente] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const host = window.location.hostname;
    if (host.includes('aseosilvaad')) {
      setShowContribuyente(false);
    } else if (host.includes('aseosilva.globalrecca.com')) {
      window.location.href = '/portal';
    }
  }, []);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #0a2218 0%, #0d3b2e 40%, #0f4a35 70%, #0a2e22 100%)',
      }}
    >
      {/* Decorative circles */}
      <div className="absolute top-[-120px] right-[-120px] w-[400px] h-[400px] rounded-full opacity-10"
        style={{ background: 'radial-gradient(circle, #6edb6e, transparent)' }} />
      <div className="absolute bottom-[-100px] left-[-80px] w-[300px] h-[300px] rounded-full opacity-10"
        style={{ background: 'radial-gradient(circle, #a3e000, transparent)' }} />
      <div className="absolute top-1/2 left-1/4 w-[200px] h-[200px] rounded-full opacity-5"
        style={{ background: 'radial-gradient(circle, #ffffff, transparent)' }} />

      <div className="relative z-10 w-full max-w-5xl px-4 py-8">

        {/* Header — Logo strip */}
        <div
          className="rounded-2xl shadow-2xl mb-8 px-6 py-5 flex flex-col items-center"
          style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(10px)' }}
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-green-800 mb-5 text-center">
            SISTEMA INTEGRADO DE ADMINISTRACIÓN PÚBLICA MUNICIPAL
          </p>
          <div className="flex items-center justify-center gap-8 flex-wrap">
            <img src={logos.alcaldia} alt="Alcaldía del Municipio Silva" className="h-20 w-auto object-contain" />
            <div className="w-px h-16 bg-green-200 hidden md:block" />
            <img src={logos.isma} alt="ISMA" className="h-24 w-auto object-contain" />
            <div className="w-px h-16 bg-green-200 hidden md:block" />
            <img src={logos.global_rec} alt="Global Rec" className="h-20 w-auto object-contain" />
            <div className="w-px h-16 bg-green-200 hidden md:block" />
            <img src={logos.basura_cero} alt="Basura Cero" className="h-20 w-auto object-contain" />
          </div>
        </div>

        {/* Main hero card */}
        <div
          className="rounded-2xl overflow-hidden shadow-2xl"
          style={{ background: 'rgba(10,34,24,0.75)', backdropFilter: 'blur(16px)', border: '1px solid rgba(163,224,0,0.2)' }}
        >
          <div className="p-8 md:p-12">

            {/* Title + Logo Global Green */}
            <div className="flex flex-col items-center mb-10 text-center">
              <img src={logos.global_green} alt="Global Green" className="h-16 w-auto object-contain mb-4 brightness-[2] saturate-0 invert" />
              <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white mb-1">
                SISTEMA <span style={{ color: '#a3e000' }}>GLOBAL GREEN</span>
              </h1>
              <div className="flex items-center gap-3 mt-2">
                <div className="h-px w-16" style={{ background: 'rgba(163,224,0,0.4)' }} />
                <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#a3e000' }}>
                  Un Ambiente Limpio para Todos
                </p>
                <div className="h-px w-16" style={{ background: 'rgba(163,224,0,0.4)' }} />
              </div>
              <p className="text-green-300/70 text-sm mt-3">
                Seleccione su módulo para acceder al sistema.
              </p>
            </div>

            {/* Access cards */}
            <div className={`grid grid-cols-1 ${showContribuyente ? 'md:grid-cols-3' : 'md:grid-cols-2 max-w-3xl mx-auto'} gap-5`}>

              {showContribuyente && (
                <Link
                  href="/portal"
                  className="group relative rounded-xl p-7 flex flex-col items-center text-center transition-all duration-300 hover:scale-105 hover:-translate-y-1"
                  style={{
                    background: 'rgba(255,255,255,0.07)',
                    border: '1px solid rgba(163,224,0,0.25)',
                    boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
                  }}
                >
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-all duration-300 group-hover:scale-110"
                    style={{ background: 'rgba(163,224,0,0.15)', border: '1px solid rgba(163,224,0,0.3)' }}
                  >
                    <Users className="w-8 h-8" style={{ color: '#a3e000' }} />
                  </div>
                  <h2 className="text-lg font-bold text-white mb-2">Soy Contribuyente</h2>
                  <p className="text-xs text-green-300/60 mb-6 leading-relaxed">
                    Paga tus servicios, tramita solvencias y reporta incidencias de manera rápida y segura.
                  </p>
                  <div
                    className="mt-auto inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-full transition-all duration-300 group-hover:gap-3"
                    style={{ background: '#a3e000', color: '#0a2218' }}
                  >
                    Ingresar al Portal <ArrowRight className="w-3 h-3" />
                  </div>
                </Link>
              )}

              <Link
                href="/admin"
                className="group relative rounded-xl p-7 flex flex-col items-center text-center transition-all duration-300 hover:scale-105 hover:-translate-y-1"
                style={{
                  background: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(163,224,0,0.25)',
                  boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
                }}
              >
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-all duration-300 group-hover:scale-110"
                  style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)' }}
                >
                  <Building2 className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-lg font-bold text-white mb-2">Soy Funcionario</h2>
                <p className="text-xs text-green-300/60 mb-6 leading-relaxed">
                  Acceso al sistema administrativo para gestión de recaudación y reportes de aseo.
                </p>
                <div
                  className="mt-auto inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-full transition-all duration-300 group-hover:gap-3"
                  style={{ background: 'rgba(255,255,255,0.15)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.3)' }}
                >
                  Acceder al Sistema <ArrowRight className="w-3 h-3" />
                </div>
              </Link>

              <Link
                href="/operador/login"
                className="group relative rounded-xl p-7 flex flex-col items-center text-center transition-all duration-300 hover:scale-105 hover:-translate-y-1"
                style={{
                  background: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(163,224,0,0.25)',
                  boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
                }}
              >
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-all duration-300 group-hover:scale-110"
                  style={{ background: 'rgba(163,224,0,0.15)', border: '1px solid rgba(163,224,0,0.3)' }}
                >
                  <Smartphone className="w-8 h-8" style={{ color: '#a3e000' }} />
                </div>
                <h2 className="text-lg font-bold text-white mb-2">Operador de Censo</h2>
                <p className="text-xs text-green-300/60 mb-6 leading-relaxed">
                  Módulo móvil exclusivo para trabajadores en jornada de empadronamiento de calle.
                </p>
                <div
                  className="mt-auto inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-full transition-all duration-300 group-hover:gap-3"
                  style={{ background: '#a3e000', color: '#0a2218' }}
                >
                  Ingresar Móvil <ArrowRight className="w-3 h-3" />
                </div>
              </Link>
            </div>
          </div>

          {/* Footer strip */}
          <div
            className="px-8 py-4 flex items-center justify-center gap-4 text-[10px] text-green-500/50 font-medium tracking-widest uppercase"
            style={{ borderTop: '1px solid rgba(163,224,0,0.1)' }}
          >
            <span>Municipio Silva</span>
            <span className="w-1 h-1 rounded-full bg-green-500/30 inline-block" />
            <span>Estado Falcón</span>
            <span className="w-1 h-1 rounded-full bg-green-500/30 inline-block" />
            <span>Venezuela</span>
          </div>
        </div>

        {/* Bottom brand */}
        <p className="text-center text-green-600/40 text-[10px] mt-6 uppercase tracking-widest">
          © {new Date().getFullYear()} Global Green Environmental Solutions · Todos los derechos reservados
        </p>
      </div>
    </div>
  );
}
