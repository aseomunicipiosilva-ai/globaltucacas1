'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { logos } from '@/lib/logosBase64';

// mode: 'all' | 'contribuyente-only' | 'workers-only'
type Mode = 'all' | 'contribuyente-only' | 'workers-only';

export default function Home() {
  const [mode, setMode] = useState<Mode>('all');

  useEffect(() => {
    const host = window.location.hostname;
    if (host === 'aseosilvaad.globalrecca.com') {
      setMode('workers-only');        // Funcionario + Operador de Censo
    } else if (host === 'aseosilva.globalrecca.com') {
      setMode('contribuyente-only');  // Solo Contribuyente
    }
    // localhost / cualquier otro → 'all' (3 tarjetas, para desarrollo y pruebas)
  }, []);

  const showContribuyente = mode === 'all' || mode === 'contribuyente-only';
  const showWorkers       = mode === 'all' || mode === 'workers-only';
  const cardCount         = (showContribuyente ? 1 : 0) + (showWorkers ? 2 : 0);

  const cardHover = (e: React.MouseEvent<HTMLAnchorElement>, enter: boolean) => {
    const el = e.currentTarget as HTMLElement;
    el.style.transform = enter ? 'translateY(-6px)' : '';
    el.style.boxShadow = enter ? '0 24px 52px rgba(0,0,0,0.4)' : '0 6px 24px rgba(0,0,0,0.3)';
  };

  const DotRow = ({ label }: { label: string }) => (
    <div style={{ display:'flex', alignItems:'center', gap:6, color:'#B8CD29', fontWeight:600, fontSize:13, marginTop:'auto', paddingTop:16 }}>
      {label}
      <span style={{ display:'flex', alignItems:'center', gap:2, marginLeft:4 }}>
        {[1,.75,.5,.3].map((o, i) => (
          <span key={i} style={{ width:5, height:5, borderRadius:'50%', background:'#B8CD29', opacity:o, display:'inline-block' }} />
        ))}
        <span style={{ fontSize:15, lineHeight:1, color:'#B8CD29', marginLeft:2, fontWeight:900 }}>✦</span>
      </span>
    </div>
  );

  const cardBase: React.CSSProperties = {
    display:'flex', flexDirection:'column', alignItems:'center', textAlign:'center',
    textDecoration:'none', borderRadius:16, padding:'52px 24px 28px',
    background:'linear-gradient(160deg, #1e6b50 0%, #154C44 100%)',
    border:'1px solid rgba(184,205,41,0.22)',
    boxShadow:'0 6px 24px rgba(0,0,0,0.3)',
    transition:'transform 0.25s, box-shadow 0.25s',
    flex:1, minWidth:220, position:'relative',
  };

  const IconBubble = ({ children }: { children: React.ReactNode }) => (
    <div style={{
      position:'absolute', top:-32,
      width:64, height:64, borderRadius:'50%',
      background:'rgba(184,205,41,0.2)',
      border:'2px solid rgba(184,205,41,0.55)',
      display:'flex', alignItems:'center', justifyContent:'center',
    }}>
      {children}
    </div>
  );

  const gridCols =
    cardCount === 1 ? 'minmax(280px, 400px)' :
    cardCount === 2 ? 'repeat(2, minmax(260px, 360px))' :
                     'repeat(3, minmax(230px, 320px))';

  return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', fontFamily:'Poppins, sans-serif' }}>

      {/* ══ HEADER ══════════════════════════════════════════════════════ */}
      <div style={{ display:'flex', flexShrink:0 }}>
        {/* Left: dark green + title */}
        <div style={{
          background:'linear-gradient(110deg, #154C44 0%, #1a6048 100%)',
          padding:'28px 40px', flex:'0 0 55%',
          display:'flex', alignItems:'center',
          clipPath:'polygon(0 0, 95% 0, 100% 100%, 0 100%)',
        }}>
          <div>
            {['SISTEMA INTEGRADO','DE ADMINISTRACIÓN','PÚBLICA MUNICIPAL'].map((line, i) => (
              <div key={i} style={{
                color:'#fff',
                fontSize:'clamp(20px, 2.6vw, 38px)',
                fontWeight:800, lineHeight:1.15, textTransform:'uppercase',
              }}>{line}</div>
            ))}
          </div>
        </div>
        {/* Right: white + logo */}
        <div style={{
          background:'#fff', flex:1,
          display:'flex', alignItems:'center', justifyContent:'center',
          padding:'20px 32px',
        }}>
          <img
            src={logos.alcaldia}
            alt="Alcaldía del Municipio Silva"
            style={{ height:120, width:'auto', objectFit:'contain', maxWidth:260 }}
          />
        </div>
      </div>

      {/* ── Lime separator ── */}
      <div style={{ height:5, background:'linear-gradient(90deg,#B8CD29 0%,#5DB130 50%,#B8CD29 100%)', flexShrink:0 }} />

      {/* ══ CENTER SECTION ══════════════════════════════════════════════ */}
      <div style={{
        flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
        padding:'56px 40px 60px',
        background:'linear-gradient(180deg, #c0ddb8 0%, #8fc98c 100%)',
      }}>

        <div style={{ textAlign:'center', marginBottom:52 }}>
          <h2 style={{ margin:0, color:'#154C44', fontSize:36, fontWeight:800, lineHeight:1 }}>Global Green</h2>
          <p style={{ margin:'8px 0 0', color:'#2d6b40', fontSize:14, fontWeight:400, fontStyle:'italic' }}>
            Seleccione su módulo para acceder al sistema.
          </p>
        </div>

        <div style={{
          display:'grid',
          gridTemplateColumns: gridCols,
          gap:24, width:'100%', maxWidth:1040, justifyContent:'center',
        }}>

          {/* ── Contribuyente ── */}
          {showContribuyente && (
            <Link href="/portal" style={cardBase} onMouseEnter={e => cardHover(e,true)} onMouseLeave={e => cardHover(e,false)}>
              <IconBubble>
                <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="#B8CD29" strokeWidth="1.6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                </svg>
              </IconBubble>
              <h3 style={{ margin:'0 0 10px', color:'#fff', fontSize:18, lineHeight:1.3 }}>
                <b style={{ fontWeight:800 }}>Soy</b>{' '}<span style={{ fontWeight:400 }}>Contribuyente</span>
              </h3>
              <p style={{ margin:'0 0 4px', color:'rgba(255,255,255,0.7)', fontSize:12.5, lineHeight:1.8, textAlign:'justify', fontWeight:400 }}>
                Paga tus servicios, tramita solvencias y reporta incidencias de manera rápida y segura.
              </p>
              <DotRow label="Ingresar al portal" />
            </Link>
          )}

          {/* ── Funcionario ── */}
          {showWorkers && (
            <Link href="/admin" style={cardBase} onMouseEnter={e => cardHover(e,true)} onMouseLeave={e => cardHover(e,false)}>
              <IconBubble>
                <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="#B8CD29" strokeWidth="1.6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" />
                </svg>
              </IconBubble>
              <h3 style={{ margin:'0 0 10px', color:'#fff', fontSize:18, lineHeight:1.3 }}>
                <b style={{ fontWeight:800 }}>Soy</b>{' '}<span style={{ fontWeight:400 }}>Funcionario</span>
              </h3>
              <p style={{ margin:'0 0 4px', color:'rgba(255,255,255,0.7)', fontSize:12.5, lineHeight:1.8, textAlign:'justify', fontWeight:400 }}>
                Acceso el sistema administrativo para gestión de recaudación y reportes de aseo.
              </p>
              <DotRow label="Acceder al Sistema" />
            </Link>
          )}

          {/* ── Operador ── */}
          {showWorkers && (
            <Link href="/operador/login" style={cardBase} onMouseEnter={e => cardHover(e,true)} onMouseLeave={e => cardHover(e,false)}>
              <IconBubble>
                <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="#B8CD29" strokeWidth="1.6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                </svg>
              </IconBubble>
              <h3 style={{ margin:'0 0 10px', color:'#fff', fontSize:18, lineHeight:1.3 }}>
                <b style={{ fontWeight:800 }}>Operador</b>{' '}<span style={{ fontWeight:400 }}>de Censo</span>
              </h3>
              <p style={{ margin:'0 0 4px', color:'rgba(255,255,255,0.7)', fontSize:12.5, lineHeight:1.8, textAlign:'justify', fontWeight:400 }}>
                Módulo móvil exclusivo para trabajadores en jornada de empadronamiento de calle.
              </p>
              <DotRow label="Ingresar Móvil" />
            </Link>
          )}

        </div>
      </div>

      {/* ══ FOOTER ══════════════════════════════════════════════════════ */}
      <div style={{ display:'flex', flexShrink:0 }}>
        <div style={{
          background:'#154C44', padding:'16px 36px',
          display:'flex', alignItems:'center', justifyContent:'center',
          flex:'0 0 auto', minWidth:200, borderTop:'4px solid #B8CD29',
        }}>
          <img src={logos.isma} alt="ISMA" style={{ height:52, width:'auto', objectFit:'contain' }} />
        </div>
        <div style={{
          background:'#fff', flex:1, padding:'16px 32px',
          display:'flex', alignItems:'center', justifyContent:'space-evenly', gap:16,
          borderTop:'4px solid #B8CD29',
        }}>
          <img src={logos.global_rec}   alt="Global Rec"   style={{ height:44, width:'auto', objectFit:'contain' }} />
          <div style={{ width:1, height:38, background:'#dde' }} />
          <img src={logos.global_green} alt="Global Green" style={{ height:44, width:'auto', objectFit:'contain' }} />
          <div style={{ width:1, height:38, background:'#dde' }} />
          <img src={logos.basura_cero}  alt="Basura Cero"  style={{ height:44, width:'auto', objectFit:'contain' }} />
        </div>
      </div>

    </div>
  );
}