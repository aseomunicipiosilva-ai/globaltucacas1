'use client';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

function parseMonto(val: any): number {
  if (!val) return 0;
  let s = String(val).trim();
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}
function fmt(n: number) {
  return 'Bs. ' + n.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

type Periodo = 'hoy' | 'semana' | 'mes' | 'mes_pasado';

function getRange(p: Periodo) {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const toD = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const today = toD(now);
  switch(p) {
    case 'hoy': return { desde: today, hasta: today };
    case 'semana': {
      const day = now.getDay() || 7;
      const lun = new Date(now); lun.setDate(now.getDate() - day + 1);
      return { desde: toD(lun), hasta: today };
    }
    case 'mes': return { desde: `${now.getFullYear()}-${pad(now.getMonth()+1)}-01`, hasta: today };
    case 'mes_pasado': {
      const f = new Date(now.getFullYear(), now.getMonth()-1, 1);
      const l = new Date(now.getFullYear(), now.getMonth(), 0);
      return { desde: toD(f), hasta: toD(l) };
    }
  }
}

export default function PresidenciaDashboard() {
  const router = useRouter();
  const [nombre, setNombre] = useState('');
  const [periodo, setPeriodo] = useState<Periodo>('mes');
  const [pagos, setPagos] = useState<any[]>([]);
  const [inmuebles, setInmuebles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState('');

  // Auth guard
  useEffect(() => {
    const auth = sessionStorage.getItem('presidencia_auth');
    if (!auth) { router.replace('/presidencia/login'); return; }
    try {
      const d = JSON.parse(auth);
      if (Date.now() - d.ts > 8 * 60 * 60 * 1000) {
        sessionStorage.removeItem('presidencia_auth');
        router.replace('/presidencia/login');
        return;
      }
      setNombre(d.nombre || 'Presidente');
    } catch { router.replace('/presidencia/login'); }
  }, [router]);

  // Load inmuebles once for sector mapping
  useEffect(() => {
    supabase.from('inmuebles').select('identidad,actividad_principal').limit(1000)
      .then(({ data }) => setInmuebles(data || []));
  }, []);

  const fetchPagos = async () => {
    setLoading(true);
    const { desde, hasta } = getRange(periodo);
    const { data } = await supabase
      .from('pagos_reportados')
      .select('tipo,monto,identidad,banco,created_at,referencia,estado')
      .eq('estado', 'Aprobado')
      .gte('created_at', desde + 'T00:00:00')
      .lte('created_at', hasta + 'T23:59:59')
      .order('created_at', { ascending: false });
    setPagos(data || []);
    setLastUpdate(new Date().toLocaleTimeString('es-VE', { hour12: false }));
    setLoading(false);
  };

  useEffect(() => { fetchPagos(); }, [periodo]);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const interval = setInterval(fetchPagos, 60000);
    return () => clearInterval(interval);
  }, [periodo]);

  // Sector map built from locally fetched inmuebles
  const sectorMap = useMemo(() => {
    const m = new Map<string, string>();
    inmuebles.forEach((inm: any) => {
      const id = (inm.identidad || '').replace(/-/g, '').toUpperCase();
      if (!id || m.has(id)) return;
      const a = (inm.actividad_principal || '').toLowerCase();
      if (a.includes('fabrica') || a.includes('taller') || a.includes('embotelladora') || a.includes('concretera')) m.set(id, 'Industrial');
      else if (a.includes('residencial') || a.includes('condominio') || a.includes('apartamento')) m.set(id, 'Residencial');
      else if (a.length > 3) m.set(id, 'Comercial');
      else m.set(id, 'Residencial');
    });
    return m;
  }, [inmuebles]);

  const pagosEnr = useMemo(() => pagos.map(p => ({
    ...p,
    sector: sectorMap.get((p.identidad || '').replace(/-/g, '').toUpperCase()) || 'Residencial'
  })), [pagos, sectorMap]);

  const total = pagosEnr.reduce((s, p) => s + parseMonto(p.monto), 0);
  const res   = pagosEnr.filter(p => p.sector === 'Residencial').reduce((s, p) => s + parseMonto(p.monto), 0);
  const com   = pagosEnr.filter(p => p.sector === 'Comercial').reduce((s, p) => s + parseMonto(p.monto), 0);
  const ind   = pagosEnr.filter(p => p.sector === 'Industrial').reduce((s, p) => s + parseMonto(p.monto), 0);
  const tra   = pagosEnr.filter(p => p.tipo === 'Transferencia').reduce((s, p) => s + parseMonto(p.monto), 0);
  const deb   = pagosEnr.filter(p => p.tipo === 'Debito' || p.tipo === 'Punto de Venta').reduce((s, p) => s + parseMonto(p.monto), 0);

  const lbl: Record<Periodo, string> = { hoy: 'Hoy', semana: 'Esta semana', mes: 'Este mes', mes_pasado: 'Mes pasado' };

  const BtnPeriodo = ({ p }: { p: Periodo }) => (
    <button onClick={() => setPeriodo(p)} style={{
      padding: '8px 14px', borderRadius: 20, border: 'none', fontSize: 13, fontWeight: 600,
      cursor: 'pointer', transition: 'all .2s',
      background: periodo === p ? '#B8CD29' : 'rgba(255,255,255,0.08)',
      color: periodo === p ? '#06120e' : 'rgba(200,230,200,.8)',
    }}>{lbl[p]}</button>
  );

  const Card = ({ label, value, color, bg }: { label: string, value: string, color: string, bg: string }) => (
    <div style={{ background: bg, borderRadius: 16, padding: '16px', textAlign: 'center', border: `1px solid ${color}30` }}>
      <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: 0.8 }}>{label}</p>
      <p style={{ margin: '6px 0 0', fontSize: 17, fontWeight: 800, color, lineHeight: 1.2 }}>{value}</p>
    </div>
  );

  return (
    <div style={{
      minHeight: '100vh', fontFamily: 'Poppins, sans-serif',
      background: 'linear-gradient(160deg, #06120e 0%, #0d2a1e 50%, #081810 100%)',
      color: '#fff', maxWidth: 480, margin: '0 auto'
    }}>
      {/* Header */}
      <div style={{
        background: 'rgba(184,205,41,.08)', borderBottom: '1px solid rgba(184,205,41,.2)',
        padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 10, backdropFilter: 'blur(10px)'
      }}>
        <div>
          <p style={{ margin: 0, fontSize: 10, color: '#B8CD29', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>Modulo Presidencia</p>
          <p style={{ margin: '2px 0 0', fontSize: 16, fontWeight: 800 }}>Hola, {nombre}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={fetchPagos} style={{
            background: 'rgba(184,205,41,.15)', border: '1px solid rgba(184,205,41,.3)',
            borderRadius: 10, padding: '8px 12px', color: '#B8CD29', cursor: 'pointer', fontSize: 12, fontWeight: 600
          }}>{loading ? '...' : 'Actualizar'}</button>
          <button onClick={() => { sessionStorage.removeItem('presidencia_auth'); router.replace('/presidencia/login'); }}
            style={{ background: 'rgba(220,38,38,.15)', border: '1px solid rgba(220,38,38,.3)', borderRadius: 10, padding: '8px 12px', color: '#fca5a5', cursor: 'pointer', fontSize: 12 }}>
            Salir
          </button>
        </div>
      </div>

      <div style={{ padding: '20px 16px' }}>
        {/* Period selector */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
          {(['hoy','semana','mes','mes_pasado'] as Periodo[]).map(p => <BtnPeriodo key={p} p={p} />)}
        </div>

        {/* Total */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(184,205,41,.15), rgba(93,177,48,.1))',
          border: '1px solid rgba(184,205,41,.3)', borderRadius: 20, padding: '24px',
          textAlign: 'center', marginBottom: 16
        }}>
          <p style={{ margin: 0, fontSize: 12, color: '#B8CD29', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>
            Total Recaudado — {lbl[periodo]}
          </p>
          <p style={{ margin: '8px 0 4px', fontSize: 36, fontWeight: 900, color: '#B8CD29', lineHeight: 1 }}>
            {loading ? '...' : fmt(total)}
          </p>
          <p style={{ margin: 0, fontSize: 12, color: 'rgba(200,230,200,.6)' }}>{pagosEnr.length} transacciones aprobadas</p>
          {lastUpdate && (
            <p style={{ margin: '6px 0 0', fontSize: 11, color: 'rgba(200,230,200,.4)' }}>
              Actualizado: {lastUpdate} · Auto-actualiza cada 60s
            </p>
          )}
        </div>

        <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 700, color: 'rgba(200,230,200,.5)', textTransform: 'uppercase', letterSpacing: 1 }}>Por Metodo de Pago</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
          <Card label="Transferencias" value={fmt(tra)} color="#a855f7" bg="rgba(168,85,247,.08)" />
          <Card label="Debito / POS" value={fmt(deb)} color="#f97316" bg="rgba(249,115,22,.08)" />
        </div>

        <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 700, color: 'rgba(200,230,200,.5)', textTransform: 'uppercase', letterSpacing: 1 }}>Por Sector</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 28 }}>
          <Card label="Residencial" value={fmt(res)} color="#3b82f6" bg="rgba(59,130,246,.08)" />
          <Card label="Comercial"   value={fmt(com)} color="#f59e0b" bg="rgba(245,158,11,.08)" />
          <Card label="Industrial"  value={fmt(ind)} color="#6366f1" bg="rgba(99,102,241,.08)" />
        </div>

        <p style={{ margin: '0 0 12px', fontSize: 11, fontWeight: 700, color: 'rgba(200,230,200,.5)', textTransform: 'uppercase', letterSpacing: 1 }}>
          Ultimas Transacciones
        </p>
        {loading ? (
          <div style={{ textAlign: 'center', color: 'rgba(200,230,200,.4)', padding: 40 }}>Cargando...</div>
        ) : pagosEnr.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'rgba(200,230,200,.4)', padding: 40 }}>Sin transacciones en este periodo.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {pagosEnr.slice(0, 15).map((p, i) => (
              <div key={i} style={{
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 14, padding: '14px 16px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}>
                <div>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#fff' }}>{p.tipo} · {p.banco || 'N/A'}</p>
                  <p style={{ margin: '2px 0 0', fontSize: 11, color: 'rgba(200,230,200,.5)' }}>Ref: {p.referencia || '—'} · {p.sector}</p>
                  <p style={{ margin: '2px 0 0', fontSize: 10, color: 'rgba(200,230,200,.35)' }}>
                    {new Date(p.created_at).toLocaleString('es-VE', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit', hour12:false })}
                  </p>
                </div>
                <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#B8CD29' }}>{fmt(parseMonto(p.monto))}</p>
              </div>
            ))}
          </div>
        )}
        <div style={{ height: 40 }} />
      </div>
    </div>
  );
}
