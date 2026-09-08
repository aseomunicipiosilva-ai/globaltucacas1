'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function Home() {
  const [showContribuyente, setShowContribuyente] = useState(true);

  useEffect(() => {
    const host = window.location.hostname;
    if (host.includes('aseosilvaad')) {
      setShowContribuyente(false);
    }
  }, []);

  // Shared card hover handlers
  const onEnter = (e: React.MouseEvent<HTMLAnchorElement>) => {
    (e.currentTarget as HTMLElement).style.transform = 'translateY(-6px) scale(1.02)';
    (e.currentTarget as HTMLElement).style.boxShadow = '0 20px 40px rgba(0,0,0,0.45)';
    (e.currentTarget as HTMLElement).style.background = 'rgba(21,76,68,0.55)';
    (e.currentTarget as HTMLElement).style.borderColor = '#B8CD29';
  };
  const onLeave = (e: React.MouseEvent<HTMLAnchorElement>) => {
    (e.currentTarget as HTMLElement).style.transform = '';
    (e.currentTarget as HTMLElement).style.boxShadow = '';
    (e.currentTarget as HTMLElement).style.background = 'rgba(21,76,68,0.08)';
    (e.currentTarget as HTMLElement).style.borderColor = 'transparent';
  };

  const cardStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textDecoration: 'none',
    borderRadius: 16,
    padding: '20px 16px 28px',
    background: 'rgba(21,76,68,0.08)',
    border: '2px solid transparent',
    cursor: 'pointer',
    transition: 'all 0.25s ease',
    backdropFilter: 'blur(0px)',
    minHeight: 200,
    flex: 1,
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        backgroundImage: 'url(/landing-bg.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center top',
        backgroundRepeat: 'no-repeat',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'Poppins, sans-serif',
      }}
    >
      {/* ── Invisible top spacer (header area in image ~28%) ── */}
      <div style={{ flex: '0 0 28vh', minHeight: 140 }} />

      {/* ── Title area spacer (~8% below header) ── */}
      <div style={{ flex: '0 0 10vh', minHeight: 48 }} />

      {/* ── Cards row — positioned over the cards area in the image ── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'stretch',
          gap: 20,
          padding: '0 5vw',
          flex: '0 0 auto',
        }}
      >
        {showContribuyente && (
          <Link href="/portal" style={cardStyle} onMouseEnter={onEnter} onMouseLeave={onLeave}>
            {/* spacer for icon in bg image */}
            <div style={{ height: 68 }} />
            <span style={{ display: 'block', height: 56 }} /> {/* title area */}
            <span style={{ display: 'block', height: 72 }} /> {/* description area */}
            {/* Ingresar link — visible glow on hover */}
            <span style={{ marginTop: 'auto', color: '#B8CD29', fontWeight: 700, fontSize: 13, opacity: 0 }}>
              Ingresar al portal ›
            </span>
          </Link>
        )}

        <Link href="/admin" style={cardStyle} onMouseEnter={onEnter} onMouseLeave={onLeave}>
          <div style={{ height: 68 }} />
          <span style={{ display: 'block', height: 56 }} />
          <span style={{ display: 'block', height: 72 }} />
          <span style={{ marginTop: 'auto', color: '#B8CD29', fontWeight: 700, fontSize: 13, opacity: 0 }}>
            Acceder al Sistema ›
          </span>
        </Link>

        <Link href="/operador/login" style={cardStyle} onMouseEnter={onEnter} onMouseLeave={onLeave}>
          <div style={{ height: 68 }} />
          <span style={{ display: 'block', height: 56 }} />
          <span style={{ display: 'block', height: 72 }} />
          <span style={{ marginTop: 'auto', color: '#B8CD29', fontWeight: 700, fontSize: 13, opacity: 0 }}>
            Ingresar Móvil ›
          </span>
        </Link>
      </div>

      {/* ── Bottom spacer (footer area in image) ── */}
      <div style={{ flex: 1 }} />
    </div>
  );
}