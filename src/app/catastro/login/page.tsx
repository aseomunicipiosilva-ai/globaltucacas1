'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function CatastroLogin() {
  const router = useRouter();
  const [usuario, setUsuario] = useState('');
  const [clave, setClave] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const u = usuario.trim().toLowerCase();
    const c = clave.trim();

    // Acceso Master directo
    if (u === 'dzara' && (c === 'dzara' || c === 'andministrador' || c === 'Omar..')) {
      sessionStorage.setItem('catastro_auth', JSON.stringify({ nombre: 'David Zara (Director Catastro)', usuario: 'dzara', rol: 'Director', ts: Date.now() }));
      router.push('/catastro');
      return;
    }

    try {
      const { data } = await supabase
        .from('trabajadores')
        .select('id, nombre, usuario, rol, estado')
        .eq('usuario', u)
        .eq('clave', c)
        .single();

      if (!data) { setError('Usuario o contraseña incorrectos.'); setLoading(false); return; }
      if (data.estado !== 'Activo') { setError('Usuario inactivo.'); setLoading(false); return; }
      
      const rol = data.rol || '';
      if (!rol.includes('Catastro') && !rol.includes('Admin') && !rol.includes('Ingenieria') && !rol.includes('Presidencia')) {
        setError('No tiene permisos de acceso al módulo de Catastro Municipal.');
        setLoading(false);
        return;
      }

      sessionStorage.setItem('catastro_auth', JSON.stringify({ nombre: data.nombre, usuario: data.usuario, rol: data.rol, ts: Date.now() }));
      router.push('/catastro');
    } catch {
      setError('Error de conexión con el servidor. Intente de nuevo.');
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #180c04 0%, #291807 50%, #451a03 100%)',
      fontFamily: 'Poppins, sans-serif', padding: '20px'
    }}>
      <div style={{
        width: '100%', maxWidth: '420px',
        background: 'rgba(24, 12, 4, 0.85)',
        border: '1px solid rgba(249, 115, 22, 0.3)',
        borderRadius: '24px', padding: '40px 32px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(16px)'
      }}>
        {/* Header con Mapa / Inmueble */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            width: '64px', height: '64px', borderRadius: '18px',
            background: 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 10px 20px -5px rgba(234, 88, 12, 0.5)', marginBottom: '16px'
          }}>
            <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="#ffffff" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
            </svg>
          </div>
          <h2 style={{ color: '#ffffff', fontSize: '22px', fontWeight: 800, margin: '0 0 4px', letterSpacing: '-0.5px' }}>
            Catastro Municipal
          </h2>
          <p style={{ color: '#fdba74', fontSize: '12px', margin: 0 }}>
            Alcaldía del Municipio Silva • Tucacas, Falcón
          </p>
        </div>

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#fca5a5', padding: '12px', borderRadius: '12px', fontSize: '12px',
            marginBottom: '20px', textAlign: 'center', fontWeight: 600
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', color: '#fed7aa', fontSize: '11px', fontWeight: 700, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Usuario de Catastro
            </label>
            <input
              type="text"
              required
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              placeholder="Ej: dzara"
              style={{
                width: '100%', padding: '14px 16px', borderRadius: '12px',
                background: 'rgba(67, 20, 7, 0.5)', border: '1px solid rgba(249, 115, 22, 0.35)',
                color: '#ffffff', fontSize: '14px', outline: 'none', boxSizing: 'border-box'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', color: '#fed7aa', fontSize: '11px', fontWeight: 700, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Contraseña
            </label>
            <input
              type="password"
              required
              value={clave}
              onChange={(e) => setClave(e.target.value)}
              placeholder="••••••••"
              style={{
                width: '100%', padding: '14px 16px', borderRadius: '12px',
                background: 'rgba(67, 20, 7, 0.5)', border: '1px solid rgba(249, 115, 22, 0.35)',
                color: '#ffffff', fontSize: '14px', outline: 'none', boxSizing: 'border-box'
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '15px', borderRadius: '12px', marginTop: '8px',
              background: 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)',
              border: 'none', color: '#ffffff', fontSize: '14px', fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
              boxShadow: '0 10px 25px -5px rgba(234, 88, 12, 0.5)', transition: 'all 0.2s'
            }}
          >
            {loading ? 'Validando credenciales...' : 'Ingresar a Catastro'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '24px' }}>
          <a href="/" style={{ color: '#fdba74', fontSize: '12px', textDecoration: 'none', fontWeight: 600 }}>
            ← Volver a la página principal
          </a>
        </div>
      </div>
    </div>
  );
}
