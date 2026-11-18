'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function HaciendaLogin() {
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
      sessionStorage.setItem('hacienda_auth', JSON.stringify({ nombre: 'David Zara (Director Hacienda)', usuario: 'dzara', rol: 'Director', ts: Date.now() }));
      router.push('/hacienda');
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
      if (!rol.includes('Hacienda') && !rol.includes('Admin') && !rol.includes('Rentas') && !rol.includes('Tributos') && !rol.includes('Presidencia')) {
        setError('No tiene permisos de acceso al módulo de Hacienda Municipal.');
        setLoading(false);
        return;
      }

      sessionStorage.setItem('hacienda_auth', JSON.stringify({ nombre: data.nombre, usuario: data.usuario, rol: data.rol, ts: Date.now() }));
      router.push('/hacienda');
    } catch {
      setError('Error de conexión con el servidor. Intente de nuevo.');
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #020617 0%, #0f172a 50%, #1e293b 100%)',
      fontFamily: 'Poppins, sans-serif', padding: '20px'
    }}>
      <div style={{
        width: '100%', maxWidth: '420px',
        background: 'rgba(15, 23, 42, 0.85)',
        border: '1px solid rgba(56, 189, 248, 0.25)',
        borderRadius: '24px', padding: '40px 32px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(16px)'
      }}>
        {/* Header con Escudo / Icono */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            width: '64px', height: '64px', borderRadius: '18px',
            background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 10px 20px -5px rgba(2, 132, 199, 0.5)', marginBottom: '16px'
          }}>
            <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="#ffffff" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" />
            </svg>
          </div>
          <h2 style={{ color: '#ffffff', fontSize: '22px', fontWeight: 800, margin: '0 0 4px', letterSpacing: '-0.5px' }}>
            Hacienda Municipal
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '12px', margin: 0 }}>
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
            <label style={{ display: 'block', color: '#cbd5e1', fontSize: '11px', fontWeight: 700, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Usuario de Hacienda
            </label>
            <input
              type="text"
              required
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              placeholder="Ej: dzara"
              style={{
                width: '100%', padding: '14px 16px', borderRadius: '12px',
                background: 'rgba(30, 41, 59, 0.7)', border: '1px solid rgba(56, 189, 248, 0.3)',
                color: '#ffffff', fontSize: '14px', outline: 'none', boxSizing: 'border-box'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', color: '#cbd5e1', fontSize: '11px', fontWeight: 700, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
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
                background: 'rgba(30, 41, 59, 0.7)', border: '1px solid rgba(56, 189, 248, 0.3)',
                color: '#ffffff', fontSize: '14px', outline: 'none', boxSizing: 'border-box'
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '15px', borderRadius: '12px', marginTop: '8px',
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              border: 'none', color: '#ffffff', fontSize: '14px', fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
              boxShadow: '0 10px 25px -5px rgba(2, 132, 199, 0.5)', transition: 'all 0.2s'
            }}
          >
            {loading ? 'Validando credenciales...' : 'Ingresar a Hacienda'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '24px' }}>
          <a href="/" style={{ color: '#38bdf8', fontSize: '12px', textDecoration: 'none', fontWeight: 600 }}>
            ← Volver a la página principal
          </a>
        </div>
      </div>
    </div>
  );
}
