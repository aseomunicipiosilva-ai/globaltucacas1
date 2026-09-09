'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { logos } from '@/lib/logosBase64';

type Mode = 'all' | 'contribuyente-only' | 'workers-only';

export default function Home() {
  const [mode, setMode] = useState<Mode>('all');

  useEffect(() => {
    const host = window.location.hostname;
    if (host === 'aseosilvaad.globalrecca.com') setMode('workers-only');
    else if (host === 'aseosilva.globalrecca.com') setMode('contribuyente-only');
  }, []);

  const showContribuyente = mode === 'all' || mode === 'contribuyente-only';
  const showWorkers       = mode === 'all' || mode === 'workers-only';
  const cardCount         = (showContribuyente ? 1 : 0) + (showWorkers ? 2 : 0);

  const gridCols =
    cardCount === 1 ? 'minmax(300px, 420px)' :
    cardCount === 2 ? 'repeat(2, minmax(270px, 380px))' :
                     'repeat(3, minmax(240px, 340px))';

  const DotRow = ({ label }: { label: string }) => (
    <div style={{ display:'flex', alignItems:'center', gap:6, color:'#c8dc3a', fontWeight:600, fontSize:13, marginTop:'auto', paddingTop:16 }}>
      {label}
      <span style={{ display:'flex', alignItems:'center', gap:2, marginLeft:4 }}>
        {[1,.75,.5,.3].map((o,i) => <span key={i} style={{ width:5,height:5,borderRadius:'50%',background:'#c8dc3a',opacity:o,display:'inline-block' }} />)}
        <span style={{ fontSize:15, lineHeight:1, color:'#c8dc3a', marginLeft:2, fontWeight:900 }}>✦</span>
      </span>
    </div>
  );

  const cardHover = (e: React.MouseEvent<HTMLAnchorElement>, enter: boolean) => {
    const el = e.currentTarget as HTMLElement;
    if (enter) {
      el.style.transform = 'translateY(-8px)';
      el.style.boxShadow = '0 0 0 1px rgba(184,205,41,0.6), 0 24px 60px rgba(0,0,0,0.5), 0 0 40px rgba(184,205,41,0.15)';
      el.style.borderColor = 'rgba(184,205,41,0.7)';
    } else {
      el.style.transform = '';
      el.style.boxShadow = '0 0 0 1px rgba(184,205,41,0.2), 0 8px 32px rgba(0,0,0,0.4)';
      el.style.borderColor = 'rgba(184,205,41,0.2)';
    }
  };

  const cardStyle: React.CSSProperties = {
    display:'flex', flexDirection:'column', alignItems:'center', textAlign:'center',
    textDecoration:'none', borderRadius:20, padding:'56px 28px 30px',
    background:'linear-gradient(155deg, rgba(30,80,55,0.9) 0%, rgba(15,50,35,0.95) 100%)',
    border:'1px solid rgba(184,205,41,0.2)',
    boxShadow:'0 0 0 1px rgba(184,205,41,0.2), 0 8px 32px rgba(0,0,0,0.4)',
    backdropFilter:'blur(20px)',
    transition:'all 0.3s ease',
    flex:1, minWidth:220, position:'relative',
  };

  const IconBubble = ({ children }: { children: React.ReactNode }) => (
    <div style={{
      position:'absolute', top:-34,
      width:68, height:68, borderRadius:'50%',
      background:'linear-gradient(135deg, rgba(184,205,41,0.25) 0%, rgba(93,177,48,0.2) 100%)',
      border:'2px solid rgba(184,205,41,0.65)',
      boxShadow:'0 0 20px rgba(184,205,41,0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
      display:'flex', alignItems:'center', justifyContent:'center',
    }}>
      {children}
    </div>
  );

  return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', fontFamily:'Poppins, sans-serif', overflow:'hidden' }}>

      {/* ══ BG global ══ */}
      <div style={{
        position:'fixed', inset:0, zIndex:0,
        background:'linear-gradient(135deg, #06120e 0%, #0d2a1e 30%, #0a1f16 60%, #081810 100%)',
      }}>
        {/* Grid lines */}
        <div style={{
          position:'absolute', inset:0, opacity:0.07,
          backgroundImage:'linear-gradient(rgba(184,205,41,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(184,205,41,0.8) 1px, transparent 1px)',
          backgroundSize:'60px 60px',
        }} />
        {/* Glow blobs */}
        <div style={{ position:'absolute', top:'-10%', left:'5%', width:500, height:500, borderRadius:'50%', background:'radial-gradient(circle, rgba(93,177,48,0.12) 0%, transparent 70%)', filter:'blur(40px)' }} />
        <div style={{ position:'absolute', bottom:'-5%', right:'10%', width:400, height:400, borderRadius:'50%', background:'radial-gradient(circle, rgba(184,205,41,0.1) 0%, transparent 70%)', filter:'blur(50px)' }} />
      </div>

      {/* ══ HEADER ══════════════════════════════════════════════════════ */}
      <div style={{
        position:'relative', zIndex:10, flexShrink:0,
        display:'flex', alignItems:'stretch',
        borderBottom:'2px solid rgba(184,205,41,0.5)',
        boxShadow:'0 4px 30px rgba(184,205,41,0.08)',
      }}>
        {/* Left — title */}
        <div style={{
          background:'linear-gradient(110deg, rgba(10,30,20,0.97) 0%, rgba(15,55,35,0.95) 100%)',
          backdropFilter:'blur(20px)',
          padding:'30px 48px 30px 52px', flex:'0 0 52%',
          display:'flex', alignItems:'center',
          clipPath:'polygon(0 0, 92% 0, 100% 100%, 0 100%)',
        }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
              <div style={{ width:3, height:40, background:'linear-gradient(180deg,#B8CD29,#5DB130)', borderRadius:4 }} />
              <div>
                {['SISTEMA INTEGRADO','DE ADMINISTRACIÓN','PÚBLICA MUNICIPAL'].map((line, i) => (
                  <div key={i} style={{
                    color: i===0 ? '#ffffff' : 'rgba(255,255,255,0.88)',
                    fontSize:'clamp(18px, 2.4vw, 34px)',
                    fontWeight:800, lineHeight:1.18, textTransform:'uppercase',
                    textShadow:'0 2px 12px rgba(184,205,41,0.2)',
                    letterSpacing:'0.3px',
                  }}>{line}</div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right — Alcaldía logo with glow */}
        <div style={{
          flex:1, background:'rgba(255,255,255,0.97)',
          display:'flex', alignItems:'center', justifyContent:'center',
          padding:'20px 40px',
        }}>
          <div style={{
            padding:'8px 20px', borderRadius:16,
            background:'#fff',
            boxShadow:'0 0 0 2px rgba(21,76,68,0.15), 0 8px 40px rgba(21,76,68,0.15)',
          }}>
            <img src={logos.alcaldia} alt="Alcaldía del Municipio Silva"
              style={{ height:110, width:'auto', objectFit:'contain', display:'block' }} />
          </div>
        </div>
      </div>

      {/* ══ CENTER ══════════════════════════════════════════════════════ */}
      <div style={{
        position:'relative', zIndex:5,
        flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
        padding:'56px 44px 60px',
      }}>

        {/* Section heading */}
        <div style={{ textAlign:'center', marginBottom:56 }}>
          {/* "Global Rec" glowing title */}
          <div style={{ position:'relative', display:'inline-block' }}>
            <h2 style={{
              margin:0, fontSize:'clamp(28px, 4vw, 52px)', fontWeight:800,
              background:'linear-gradient(135deg, #B8CD29 0%, #5DB130 50%, #B8CD29 100%)',
              WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
              filter:'drop-shadow(0 0 20px rgba(184,205,41,0.4))',
              letterSpacing:'-0.5px',
            }}>
              Global Rec
            </h2>
          </div>
          <p style={{ margin:'10px 0 0', color:'rgba(200,220,180,0.7)', fontSize:14, fontWeight:400, letterSpacing:'0.5px' }}>
            Seleccione su módulo para acceder al sistema.
          </p>
          <div style={{ width:60, height:2, background:'linear-gradient(90deg,transparent,#B8CD29,transparent)', margin:'14px auto 0' }} />
        </div>

        {/* Cards */}
        <div style={{
          display:'grid', gridTemplateColumns:gridCols,
          gap:28, width:'100%', maxWidth:1080, justifyContent:'center',
        }}>

          {showContribuyente && (
            <Link href="/portal" style={cardStyle} onMouseEnter={e=>cardHover(e,true)} onMouseLeave={e=>cardHover(e,false)}>
              <IconBubble>
                <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="#B8CD29" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                </svg>
              </IconBubble>
              <h3 style={{ margin:'0 0 12px', color:'#fff', fontSize:18, lineHeight:1.3 }}>
                <b style={{ fontWeight:800 }}>Soy</b>{' '}<span style={{ fontWeight:400 }}>Contribuyente</span>
              </h3>
              <p style={{ margin:0, color:'rgba(200,230,200,0.65)', fontSize:12.5, lineHeight:1.85, textAlign:'justify', fontWeight:400 }}>
                Paga tus servicios, tramita solvencias y reporta incidencias de manera rápida y segura.
              </p>
              <DotRow label="Ingresar al portal" />
            </Link>
          )}

          {showWorkers && (
            <Link href="/admin" style={cardStyle} onMouseEnter={e=>cardHover(e,true)} onMouseLeave={e=>cardHover(e,false)}>
              <IconBubble>
                <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="#B8CD29" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" />
                </svg>
              </IconBubble>
              <h3 style={{ margin:'0 0 12px', color:'#fff', fontSize:18, lineHeight:1.3 }}>
                <b style={{ fontWeight:800 }}>Soy</b>{' '}<span style={{ fontWeight:400 }}>Funcionario</span>
              </h3>
              <p style={{ margin:0, color:'rgba(200,230,200,0.65)', fontSize:12.5, lineHeight:1.85, textAlign:'justify', fontWeight:400 }}>
                Acceso el sistema administrativo para gestión de recaudación y reportes de aseo.
              </p>
              <DotRow label="Acceder al Sistema" />
            </Link>
          )}

          {showWorkers && (
            <Link href="/operador/login" style={cardStyle} onMouseEnter={e=>cardHover(e,true)} onMouseLeave={e=>cardHover(e,false)}>
              <IconBubble>
                <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="#B8CD29" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                </svg>
              </IconBubble>
              <h3 style={{ margin:'0 0 12px', color:'#fff', fontSize:18, lineHeight:1.3 }}>
                <b style={{ fontWeight:800 }}>Operador</b>{' '}<span style={{ fontWeight:400 }}>de Censo</span>
              </h3>
              <p style={{ margin:0, color:'rgba(200,230,200,0.65)', fontSize:12.5, lineHeight:1.85, textAlign:'justify', fontWeight:400 }}>
                Módulo móvil exclusivo para trabajadores en jornada de empadronamiento de calle.
              </p>
              <DotRow label="Ingresar Móvil" />
            </Link>
          )}

        </div>
      </div>

      {/* ══ FOOTER ══════════════════════════════════════════════════════ */}
      <div style={{ position:'relative', zIndex:10, flexShrink:0, display:'flex', borderTop:'2px solid rgba(184,205,41,0.35)' }}>

        {/* ISMA — spotlight section */}
        <div style={{
          background:'linear-gradient(135deg, #0a1e14 0%, #0f2d1e 100%)',
          padding:'18px 44px', flex:'0 0 auto', minWidth:220,
          display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:6,
          borderRight:'1px solid rgba(184,205,41,0.2)',
          position:'relative',
        }}>
          <div style={{ position:'absolute', inset:0, borderRadius:0, background:'radial-gradient(ellipse at center, rgba(184,205,41,0.08) 0%, transparent 70%)' }} />
          <img src={logos.isma} alt="ISMA"
            style={{ height:60, width:'auto', objectFit:'contain', position:'relative', zIndex:1,
              filter:'drop-shadow(0 0 10px rgba(184,205,41,0.35)) brightness(1.1)' }} />
        </div>

        {/* Other logos */}
        <div style={{
          flex:1, background:'rgba(255,255,255,0.97)', padding:'16px 32px',
          display:'flex', alignItems:'center', justifyContent:'space-evenly', gap:16, flexWrap:'wrap',
        }}>
          <img src={logos.global_rec} alt="Global Rec"
            style={{ height:46, width:'auto', objectFit:'contain', filter:'brightness(0.9) contrast(1.1)' }} />
          <div style={{ width:1, height:36, background:'#dde' }} />
          <img src={logos.global_green} alt="Global Green"
            style={{ height:46, width:'auto', objectFit:'contain' }} />
          <div style={{ width:1, height:36, background:'#dde' }} />
          <img src={logos.basura_cero} alt="Basura Cero"
            style={{ height:46, width:'auto', objectFit:'contain' }} />
        </div>
      </div>

    </div>
  );
}