'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { logos } from '@/lib/logosBase64';

export default function Home() {
  const [showContribuyente, setShowContribuyente] = useState(true);

  useEffect(() => {
    const host = window.location.hostname;
    if (host.includes('aseosilvaad')) setShowContribuyente(false);
  }, []);

  const cardHover = (e: React.MouseEvent<HTMLAnchorElement>, enter: boolean) => {
    const el = e.currentTarget as HTMLElement;
    el.style.transform = enter ? 'translateY(-6px)' : '';
    el.style.boxShadow = enter ? '0 20px 48px rgba(0,0,0,0.35)' : '0 4px 20px rgba(0,0,0,0.25)';
  };

  const DotRow = ({ label }: { label: string }) => (
    <div style={{ display:'flex', alignItems:'center', gap:6, color:'#B8CD29', fontWeight:600, fontSize:13, fontFamily:'Poppins,sans-serif', marginTop:'auto', paddingTop:16 }}>
      {label}
      <span style={{ display:'flex', alignItems:'center', gap:2, marginLeft:2 }}>
        {[1, .8, .55, .35].map((o, i) => (
          <span key={i} style={{ width:5, height:5, borderRadius:'50%', background:'#B8CD29', opacity:o, display:'inline-block' }} />
        ))}
        <span style={{ fontSize:16, lineHeight:1, color:'#B8CD29', marginLeft:1 }}>✦</span>
      </span>
    </div>
  );

  const Icon = ({ children }: { children: React.ReactNode }) => (
    <div style={{
      width:70, height:70, borderRadius:'50%', background:'rgba(184,205,41,0.18)',
      border:'2px solid rgba(184,205,41,0.55)', display:'flex', alignItems:'center',
      justifyContent:'center', marginBottom:16, flexShrink:0
    }}>
      {children}
    </div>
  );

  const cardBase: React.CSSProperties = {
    display:'flex', flexDirection:'column', alignItems:'center', textAlign:'center',
    textDecoration:'none', borderRadius:18, padding:'30px 24px 28px',
    background:'linear-gradient(160deg,#1e6b50 0%,#154C44 100%)',
    border:'1px solid rgba(184,205,41,0.25)',
    boxShadow:'0 4px 20px rgba(0,0,0,0.25)',
    transition:'transform 0.25s, box-shadow 0.25s',
    flex:1, minWidth:220,
  };

  return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', fontFamily:'Poppins,sans-serif', background:'#b8dbb0' }}>

      {/* ══ HEADER ══════════════════════════════════════════════════════ */}
      <div style={{
        background:'linear-gradient(110deg, #154C44 0%, #1e6e52 55%, #154C44 100%)',
        padding:'36px 56px', display:'flex', alignItems:'center',
        justifyContent:'space-between', gap:24, flexWrap:'wrap'
      }}>
        {/* Title block */}
        <div>
          {['SISTEMA INTEGRADO','DE ADMINISTRACIÓN','PÚBLICA MUNICIPAL'].map((line, i) => (
            <div key={i} style={{
              color:'#fff', fontSize:'clamp(26px,3.5vw,46px)', fontWeight:800,
              lineHeight:1.12, letterSpacing:'-0.3px', textTransform:'uppercase'
            }}>{line}</div>
          ))}
        </div>
        {/* Alcaldía logo */}
        <img src={logos.alcaldia} alt="Alcaldía del Municipio Silva"
          style={{ height:140, width:'auto', objectFit:'contain', flexShrink:0 }} />
      </div>

      {/* Lime separator */}
      <div style={{ height:5, background:'linear-gradient(90deg,#B8CD29,#5DB130,#B8CD29)', flexShrink:0 }} />

      {/* ══ CENTER SECTION ══════════════════════════════════════════════ */}
      <div style={{
        flex:1, display:'flex', flexDirection:'column', alignItems:'center',
        justifyContent:'center', padding:'48px 40px 52px',
        background:'linear-gradient(180deg, #c0dbb7 0%, #8ec98a 100%)'
      }}>

        {/* Section heading */}
        <div style={{ textAlign:'center', marginBottom:38 }}>
          <h2 style={{ margin:0, color:'#154C44', fontSize:38, fontWeight:800, lineHeight:1 }}>
            Global Green
          </h2>
          <p style={{ margin:'8px 0 0', color:'#2d6b40', fontSize:14.5, fontWeight:400 }}>
            Seleccione su módulo para acceder al sistema.
          </p>
        </div>

        {/* Cards grid */}
        <div style={{
          display:'grid',
          gridTemplateColumns: showContribuyente
            ? 'repeat(3, minmax(240px, 330px))'
            : 'repeat(2, minmax(240px, 330px))',
          gap:22, width:'100%', maxWidth:1060, justifyContent:'center'
        }}>

          {/* ── Card 1: Contribuyente ── */}
          {showContribuyente && (
            <Link href="/portal" style={cardBase}
              onMouseEnter={e => cardHover(e, true)}
              onMouseLeave={e => cardHover(e, false)}>
              <Icon>
                <svg width="36" height="36" fill="none" viewBox="0 0 24 24" stroke="#B8CD29" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                </svg>
              </Icon>
              <h3 style={{ margin:'0 0 10px', color:'#fff', fontSize:19, lineHeight:1.2 }}>
                <b style={{ fontWeight:800 }}>Soy</b>{' '}
                <span style={{ fontWeight:400 }}>Contribuyente</span>
              </h3>
              <p style={{ margin:'0 0 6px', color:'rgba(255,255,255,0.72)', fontSize:13, lineHeight:1.75, fontWeight:400, textAlign:'justify' }}>
                Paga tus servicios, tramita solvencias y reporta incidencias de manera rápida y segura.
              </p>
              <DotRow label="Ingresar al portal" />
            </Link>
          )}

          {/* ── Card 2: Funcionario ── */}
          <Link href="/admin" style={cardBase}
            onMouseEnter={e => cardHover(e, true)}
            onMouseLeave={e => cardHover(e, false)}>
            <Icon>
              <svg width="36" height="36" fill="none" viewBox="0 0 24 24" stroke="#B8CD29" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" />
              </svg>
            </Icon>
            <h3 style={{ margin:'0 0 10px', color:'#fff', fontSize:19, lineHeight:1.2 }}>
              <b style={{ fontWeight:800 }}>Soy</b>{' '}
              <span style={{ fontWeight:400 }}>Funcionario</span>
            </h3>
            <p style={{ margin:'0 0 6px', color:'rgba(255,255,255,0.72)', fontSize:13, lineHeight:1.75, fontWeight:400, textAlign:'justify' }}>
              Acceso el sistema administrativo para gestión de recaudación y reportes de aseo.
            </p>
            <DotRow label="Acceder al Sistema" />
          </Link>

          {/* ── Card 3: Operador ── */}
          <Link href="/operador/login" style={cardBase}
            onMouseEnter={e => cardHover(e, true)}
            onMouseLeave={e => cardHover(e, false)}>
            <Icon>
              <svg width="36" height="36" fill="none" viewBox="0 0 24 24" stroke="#B8CD29" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
              </svg>
            </Icon>
            <h3 style={{ margin:'0 0 10px', color:'#fff', fontSize:19, lineHeight:1.2 }}>
              <b style={{ fontWeight:800 }}>Operador</b>{' '}
              <span style={{ fontWeight:400 }}>de Censo</span>
            </h3>
            <p style={{ margin:'0 0 6px', color:'rgba(255,255,255,0.72)', fontSize:13, lineHeight:1.75, fontWeight:400, textAlign:'justify' }}>
              Módulo móvil exclusivo para trabajadores en jornada de empadronamiento de calle.
            </p>
            <DotRow label="Ingresar Móvil" />
          </Link>

        </div>
      </div>

      {/* ══ FOOTER LOGOS ════════════════════════════════════════════════ */}
      <div style={{
        background:'#fff', borderTop:'4px solid #B8CD29',
        display:'flex', alignItems:'center', justifyContent:'space-evenly',
        padding:'18px 48px', flexWrap:'wrap', gap:20
      }}>
        <img src={logos.isma} alt="ISMA" style={{ height:56, width:'auto', objectFit:'contain' }} />
        <div style={{ width:1, height:44, background:'#e2e8f0', flexShrink:0 }} />
        <img src={logos.global_rec} alt="Global Rec" style={{ height:48, width:'auto', objectFit:'contain' }} />
        <div style={{ width:1, height:44, background:'#e2e8f0', flexShrink:0 }} />
        <img src={logos.global_green} alt="Global Green" style={{ height:48, width:'auto', objectFit:'contain' }} />
        <div style={{ width:1, height:44, background:'#e2e8f0', flexShrink:0 }} />
        <img src={logos.basura_cero} alt="Basura Cero" style={{ height:48, width:'auto', objectFit:'contain' }} />
      </div>

    </div>
  );
}