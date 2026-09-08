'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { logos } from '@/lib/logosBase64';

// ── Brand colors (Official Guide) ──────────────────
// #B8CD29  lime accent
// #5DB130  medium green
// #154C44  dark green (primary)
// #EF7B00  orange accent
// #9D519A  purple accent
// #3D509E  blue accent

export default function Home() {
  const [showContribuyente, setShowContribuyente] = useState(true);

  useEffect(() => {
    const host = window.location.hostname;
    if (host.includes('aseosilvaad')) {
      setShowContribuyente(false);
    }
  }, []);

  const cardStyle: React.CSSProperties = {
    background: 'linear-gradient(160deg, #1e6b50 0%, #154C44 100%)',
    border: '2px solid rgba(184,205,41,0.35)',
    borderRadius: '1.25rem',
  };

  const iconCircle: React.CSSProperties = {
    width: 80, height: 80, borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'rgba(184,205,41,0.18)',
    border: '2px solid rgba(184,205,41,0.5)',
    marginBottom: 20, flexShrink: 0,
  };

  const DotLink = ({ label }: { label: string }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#B8CD29', fontWeight: 700, fontSize: 14, marginTop: 'auto' }}>
      {label}
      <span style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
        {[1,0.75,0.5,0.3].map((o,i) => (
          <span key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#B8CD29', opacity: o, display: 'inline-block' }} />
        ))}
        <span style={{ fontSize: 18, fontWeight: 900, color: '#B8CD29', lineHeight: 1 }}>✦</span>
      </span>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'Poppins, sans-serif', background: '#d4edda' }}>

      {/* ── HEADER ── */}
      <div style={{
        background: 'linear-gradient(135deg, #154C44 0%, #1e6b50 55%, #154C44 100%)',
        padding: '36px 60px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 24
      }}>
        <div>
          <h1 style={{ margin: 0, color: '#fff', fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 800, lineHeight: 1.1, textTransform: 'uppercase', letterSpacing: '-0.5px' }}>
            Sistema Integrado
          </h1>
          <h1 style={{ margin: 0, color: '#fff', fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 800, lineHeight: 1.1, textTransform: 'uppercase' }}>
            de Administración
          </h1>
          <h1 style={{ margin: 0, color: '#fff', fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 800, lineHeight: 1.1, textTransform: 'uppercase' }}>
            Pública Municipal
          </h1>
        </div>
        <img src={logos.alcaldia} alt="Alcaldía del Municipio Silva" style={{ height: 140, width: 'auto', objectFit: 'contain', flexShrink: 0 }} />
      </div>

      {/* lime separator */}
      <div style={{ height: 5, background: '#B8CD29', flexShrink: 0 }} />

      {/* ── CENTER ── */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '48px 40px',
        background: 'linear-gradient(180deg, #c5e0bc 0%, #9ecf94 100%)'
      }}>
        {/* Title */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <h2 style={{ margin: 0, color: '#154C44', fontSize: 40, fontWeight: 800 }}>Global Green</h2>
          <p style={{ margin: '6px 0 0', color: '#2d6e45', fontSize: 15, fontWeight: 400 }}>
            Seleccione su módulo para acceder al sistema.
          </p>
        </div>

        {/* Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: showContribuyente ? 'repeat(3, minmax(260px, 340px))' : 'repeat(2, minmax(260px, 340px))',
          gap: 24, width: '100%', maxWidth: 1100, justifyContent: 'center'
        }}>

          {/* Card 1 – Contribuyente */}
          {showContribuyente && (
            <Link href="/portal" style={{ ...cardStyle, padding: 36, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', textDecoration: 'none', transition: 'transform 0.25s, box-shadow 0.25s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-8px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 24px 48px rgba(0,0,0,0.3)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = ''; }}>
              <div style={iconCircle}>
                <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="#B8CD29" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                </svg>
              </div>
              <h3 style={{ margin: '0 0 12px', color: '#fff', fontSize: 20 }}>
                <span style={{ fontWeight: 800 }}>Soy</span>{' '}
                <span style={{ fontWeight: 400 }}>Contribuyente</span>
              </h3>
              <p style={{ margin: '0 0 28px', color: 'rgba(255,255,255,0.72)', fontSize: 13, lineHeight: 1.7, fontWeight: 400 }}>
                Paga tus servicios, tramita solvencias y reporta incidencias de manera rápida y segura.
              </p>
              <DotLink label="Ingresar al portal" />
            </Link>
          )}

          {/* Card 2 – Funcionario */}
          <Link href="/admin" style={{ ...cardStyle, padding: 36, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', textDecoration: 'none', transition: 'transform 0.25s, box-shadow 0.25s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-8px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 24px 48px rgba(0,0,0,0.3)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = ''; }}>
            <div style={iconCircle}>
              <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="#B8CD29" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" />
              </svg>
            </div>
            <h3 style={{ margin: '0 0 12px', color: '#fff', fontSize: 20 }}>
              <span style={{ fontWeight: 800 }}>Soy</span>{' '}
              <span style={{ fontWeight: 400 }}>Funcionario</span>
            </h3>
            <p style={{ margin: '0 0 28px', color: 'rgba(255,255,255,0.72)', fontSize: 13, lineHeight: 1.7, fontWeight: 400 }}>
              Acceso el sistema administrativo para gestión de recaudación y reportes de aseo.
            </p>
            <DotLink label="Acceder al Sistema" />
          </Link>

          {/* Card 3 – Operador */}
          <Link href="/operador/login" style={{ ...cardStyle, padding: 36, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', textDecoration: 'none', transition: 'transform 0.25s, box-shadow 0.25s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-8px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 24px 48px rgba(0,0,0,0.3)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = ''; }}>
            <div style={iconCircle}>
              <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="#B8CD29" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
              </svg>
            </div>
            <h3 style={{ margin: '0 0 12px', color: '#fff', fontSize: 20 }}>
              <span style={{ fontWeight: 800 }}>Operador</span>{' '}
              <span style={{ fontWeight: 400 }}>de Censo</span>
            </h3>
            <p style={{ margin: '0 0 28px', color: 'rgba(255,255,255,0.72)', fontSize: 13, lineHeight: 1.7, fontWeight: 400 }}>
              Módulo móvil exclusivo para trabajadores en jornada de empadronamiento de calle.
            </p>
            <DotLink label="Ingresar Móvil" />
          </Link>

        </div>
      </div>

      {/* ── FOOTER LOGOS ── */}
      <div style={{
        background: '#fff', borderTop: '4px solid #B8CD29',
        display: 'flex', alignItems: 'center', justifyContent: 'space-around',
        padding: '20px 48px', flexWrap: 'wrap', gap: 24
      }}>
        <img src={logos.isma} alt="ISMA" style={{ height: 60, width: 'auto', objectFit: 'contain' }} />
        <div style={{ width: 1, height: 48, background: '#e2e8f0' }} />
        <img src={logos.global_rec} alt="Global Rec" style={{ height: 52, width: 'auto', objectFit: 'contain' }} />
        <div style={{ width: 1, height: 48, background: '#e2e8f0' }} />
        <img src={logos.global_green} alt="Global Green" style={{ height: 52, width: 'auto', objectFit: 'contain' }} />
        <div style={{ width: 1, height: 48, background: '#e2e8f0' }} />
        <img src={logos.basura_cero} alt="Basura Cero" style={{ height: 52, width: 'auto', objectFit: 'contain' }} />
      </div>

    </div>
  );
}