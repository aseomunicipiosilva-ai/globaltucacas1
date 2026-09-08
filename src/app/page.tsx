'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { logos } from '@/lib/logosBase64';

export default function Home() {
  const [showContribuyente, setShowContribuyente] = useState(true);

  useEffect(() => {
    const host = window.location.hostname;
    if (host.includes('aseosilvaad')) {
      setShowContribuyente(false);
    } else if (host.includes('aseosilva.globalrecca.com')) {
      window.location.href = '/portal';
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#e8f5e9' }}>

      {/* ── TOP HEADER ── */}
      <div
        className="w-full flex items-center justify-between px-10 py-8"
        style={{ background: 'linear-gradient(135deg, #0d3b2e 0%, #1a5c40 60%, #0d3b2e 100%)' }}
      >
        {/* Left: Title */}
        <div>
          <h1 className="text-4xl md:text-5xl font-black text-white leading-tight tracking-tight uppercase" style={{ fontFamily: 'Arial Black, Arial, sans-serif' }}>
            SISTEMA INTEGRADO
          </h1>
          <h1 className="text-4xl md:text-5xl font-black text-white leading-tight tracking-tight uppercase" style={{ fontFamily: 'Arial Black, Arial, sans-serif' }}>
            DE ADMINISTRACIÓN
          </h1>
          <h1 className="text-4xl md:text-5xl font-black text-white leading-tight tracking-tight uppercase" style={{ fontFamily: 'Arial Black, Arial, sans-serif' }}>
            PÚBLICA MUNICIPAL
          </h1>
        </div>
        {/* Right: Alcaldia Logo */}
        <div className="flex-shrink-0">
          <img src={logos.alcaldia} alt="Alcaldía del Municipio Silva" className="h-36 w-auto object-contain" />
        </div>
      </div>

      {/* ── GREEN SEPARATOR LINE ── */}
      <div className="w-full h-1" style={{ background: '#a3e000' }} />

      {/* ── CENTER SECTION ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-12"
        style={{ background: 'linear-gradient(180deg, #c8e6c9 0%, #a5d6a7 100%)' }}>

        {/* Title */}
        <div className="text-center mb-10">
          <h2 className="text-4xl font-black mb-1" style={{ color: '#1a5c40', fontFamily: 'Arial Black, Arial, sans-serif' }}>
            Global Green
          </h2>
          <p className="text-slate-600 text-base font-medium">Seleccione su módulo para acceder al sistema.</p>
        </div>

        {/* Cards */}
        <div className={`grid ${showContribuyente ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1 md:grid-cols-2 max-w-2xl'} gap-6 w-full max-w-5xl`}>

          {/* Card 1 – Contribuyente */}
          {showContribuyente && (
            <Link href="/portal" className="group flex flex-col items-center text-center rounded-2xl p-8 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl"
              style={{ background: 'linear-gradient(160deg, #1a5c40 0%, #0d3b2e 100%)', border: '2px solid rgba(163,224,0,0.3)' }}>
              {/* Icon circle */}
              <div className="w-20 h-20 rounded-full flex items-center justify-center mb-5 transition-transform duration-300 group-hover:scale-110"
                style={{ background: 'rgba(163,224,0,0.2)', border: '2px solid rgba(163,224,0,0.5)' }}>
                <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="#a3e000" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-black text-white mb-3">
                <span className="font-black">Soy</span> <span className="font-light">Contribuyente</span>
              </h3>
              <p className="text-sm leading-relaxed mb-8" style={{ color: 'rgba(255,255,255,0.7)' }}>
                Paga tus servicios, tramita solvencias y reporta incidencias de manera rápida y segura.
              </p>
              <div className="mt-auto flex items-center gap-2 text-sm font-bold transition-all duration-300 group-hover:gap-4" style={{ color: '#a3e000' }}>
                Ingresar al portal
                <span className="flex gap-0.5">
                  {[0,1,2,3].map(i => <span key={i} className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: '#a3e000', opacity: 1 - i*0.2 }} />)}
                  <span className="text-lg font-black leading-none" style={{ color: '#a3e000' }}>✦</span>
                </span>
              </div>
            </Link>
          )}

          {/* Card 2 – Funcionario */}
          <Link href="/admin" className="group flex flex-col items-center text-center rounded-2xl p-8 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl"
            style={{ background: 'linear-gradient(160deg, #1a5c40 0%, #0d3b2e 100%)', border: '2px solid rgba(163,224,0,0.3)' }}>
            <div className="w-20 h-20 rounded-full flex items-center justify-center mb-5 transition-transform duration-300 group-hover:scale-110"
              style={{ background: 'rgba(163,224,0,0.2)', border: '2px solid rgba(163,224,0,0.5)' }}>
              <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="#a3e000" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" />
              </svg>
            </div>
            <h3 className="text-xl font-black text-white mb-3">
              <span className="font-black">Soy</span> <span className="font-light">Funcionario</span>
            </h3>
            <p className="text-sm leading-relaxed mb-8" style={{ color: 'rgba(255,255,255,0.7)' }}>
              Acceso el sistema administrativo para gestión de recaudación y reportes de aseo.
            </p>
            <div className="mt-auto flex items-center gap-2 text-sm font-bold transition-all duration-300 group-hover:gap-4" style={{ color: '#a3e000' }}>
              Acceder al Sistema
              <span className="flex gap-0.5">
                {[0,1,2,3].map(i => <span key={i} className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: '#a3e000', opacity: 1 - i*0.2 }} />)}
                <span className="text-lg font-black leading-none" style={{ color: '#a3e000' }}>✦</span>
              </span>
            </div>
          </Link>

          {/* Card 3 – Operador Censo */}
          <Link href="/operador/login" className="group flex flex-col items-center text-center rounded-2xl p-8 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl"
            style={{ background: 'linear-gradient(160deg, #1a5c40 0%, #0d3b2e 100%)', border: '2px solid rgba(163,224,0,0.3)' }}>
            <div className="w-20 h-20 rounded-full flex items-center justify-center mb-5 transition-transform duration-300 group-hover:scale-110"
              style={{ background: 'rgba(163,224,0,0.2)', border: '2px solid rgba(163,224,0,0.5)' }}>
              <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="#a3e000" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
              </svg>
            </div>
            <h3 className="text-xl font-black text-white mb-3">
              <span className="font-black">Operador</span> <span className="font-light">de Censo</span>
            </h3>
            <p className="text-sm leading-relaxed mb-8" style={{ color: 'rgba(255,255,255,0.7)' }}>
              Módulo móvil exclusivo para trabajadores en jornada de empadronamiento de calle.
            </p>
            <div className="mt-auto flex items-center gap-2 text-sm font-bold transition-all duration-300 group-hover:gap-4" style={{ color: '#a3e000' }}>
              Ingresar Móvil
              <span className="flex gap-0.5">
                {[0,1,2,3].map(i => <span key={i} className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: '#a3e000', opacity: 1 - i*0.2 }} />)}
                <span className="text-lg font-black leading-none" style={{ color: '#a3e000' }}>✦</span>
              </span>
            </div>
          </Link>

        </div>
      </div>

      {/* ── FOOTER LOGOS ── */}
      <div className="w-full flex items-center justify-around px-10 py-6 bg-white border-t-4" style={{ borderColor: '#a3e000' }}>
        <img src={logos.isma} alt="ISMA" className="h-16 w-auto object-contain" />
        <div className="w-px h-12 bg-slate-200" />
        <img src={logos.global_rec} alt="Global Rec" className="h-14 w-auto object-contain" />
        <div className="w-px h-12 bg-slate-200" />
        <img src={logos.global_green} alt="Global Green" className="h-14 w-auto object-contain" />
        <div className="w-px h-12 bg-slate-200" />
        <img src={logos.basura_cero} alt="Basura Cero" className="h-14 w-auto object-contain" />
      </div>

    </div>
  );
}