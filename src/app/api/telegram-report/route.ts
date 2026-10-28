// ============================================================
// API Route: /api/telegram-report
// Reportes automaticos a las 12:00 y 18:00 hora Venezuela
// Variables requeridas en Vercel:
//   TELEGRAM_BOT_TOKEN  — token del bot de Telegram
//   TELEGRAM_CHAT_ID    — ID del grupo/canal destino
//   SUPABASE_SERVICE_ROLE_KEY — para leer sin RLS
// ============================================================
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_CHAT_ID   = process.env.TELEGRAM_CHAT_ID   || '';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

const fmt = (n: number) => n.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const parseMonto = (v: any) => parseFloat(String(v || 0).replace(/[^\d.]/g, '')) || 0;

async function enviarTelegram(msg: string): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.warn('[Telegram] Token o Chat ID no configurados.');
    return false;
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: msg, parse_mode: 'HTML' }),
    });
    const d = await res.json();
    return d.ok === true;
  } catch (e) { console.error('[Telegram] Error:', e); return false; }
}

export async function GET(request: Request) { return generarReporte(request); }
export async function POST(request: Request) { return generarReporte(request); }

async function generarReporte(request?: Request) {
  try {
    // Fecha/hora Venezuela (UTC-4)
    const now   = new Date();
    const vzNow = new Date(now.getTime() - 4 * 60 * 60 * 1000);
    const pad   = (n: number) => String(n).padStart(2, '0');
    const hoy   = `${vzNow.getUTCFullYear()}-${pad(vzNow.getUTCMonth()+1)}-${pad(vzNow.getUTCDate())}`;
    const hora  = vzNow.getUTCHours();
    const turno = hora < 15 ? 'MEDIODÍA' : 'TARDE';
    const horaStr = `${pad(hora)}:${pad(vzNow.getUTCMinutes())}`;

    const startVE = new Date(hoy + 'T00:00:00-04:00').getTime();
    const endVE   = new Date(hoy + 'T23:59:59.999-04:00').getTime();

    // ── 1. Pagos aprobados del día (igual que en Cuadre de Caja) ───
    // Considera created_at, fecha_registro en caja o fecha_conciliacion del día
    const { data: todosPagos } = await supabase
      .from('pagos_reportados')
      .select('id, monto, tipo, estado, identidad, created_at, detalles')
      .order('created_at', { ascending: false })
      .limit(1000);

    const pagos = (todosPagos || []).filter(p => {
      if (p.estado !== 'Aprobado') return false;
      let d: any = {};
      try { d = typeof p.detalles === 'string' ? JSON.parse(p.detalles) : (p.detalles || {}); } catch(e){}
      
      const tCreated = new Date(p.created_at).getTime();
      const tRegistro = d.fecha_registro ? new Date(d.fecha_registro).getTime() : 0;
      const tConciliacion = d.fecha_conciliacion ? new Date(d.fecha_conciliacion).getTime() : 0;

      const inCreated = tCreated >= startVE && tCreated <= endVE;
      const inRegistro = tRegistro >= startVE && tRegistro <= endVE;
      const inConciliadoHoy = tConciliacion >= startVE && tConciliacion <= endVE;

      return inCreated || inRegistro || inConciliadoHoy;
    });

    const isDebito = (t: string) => t === 'Debito' || t === 'Punto de Venta' || t === 'REC';
    const isTransf = (t: string) => !isDebito(t) && t !== 'Saldo a Favor';

    const totalDia          = pagos.reduce((a, p) => a + parseMonto(p.monto), 0);
    const totalDebito       = pagos.filter(p => isDebito(p.tipo)).reduce((a, p) => a + parseMonto(p.monto), 0);
    const totalTransfer     = pagos.filter(p => isTransf(p.tipo)).reduce((a, p) => a + parseMonto(p.monto), 0);
    const totalSaldoFavor   = pagos.filter(p => p.tipo === 'Saldo a Favor').reduce((a, p) => a + parseMonto(p.monto), 0);
    const cantDebito        = pagos.filter(p => isDebito(p.tipo)).length;
    const cantTransfer      = pagos.filter(p => isTransf(p.tipo)).length;
    const usuariosPagaron   = new Set(pagos.map(p => p.identidad)).size;

    // ── 2. Conciliaciones pendientes (Por Verificar) ────────────
    const { count: porVerificar } = await supabase
      .from('pagos_reportados')
      .select('*', { count: 'exact', head: true })
      .eq('estado', 'Por Verificar');

    // ── 3. Total usuarios (contribuyentes en inmuebles) ──────────
    const { count: totalUsuarios } = await supabase
      .from('inmuebles')
      .select('*', { count: 'exact', head: true })
      .not('estado', 'eq', 'Eliminado');

    // ── 4. Deuda total del sistema (recibos Pendiente) ─────────
    const { data: facturasPend } = await supabase
      .from('facturas')
      .select('monto')
      .eq('estado', 'Pendiente');

    const deudaTotal = (facturasPend || []).reduce((a, f) => a + parseMonto(f.monto), 0);
    const totalFactPend = (facturasPend || []).length;

    // ── 5. Tasa BCV actual ──────────────────────────────────────
    let tasaBcv = 0;
    try {
      const r = await fetch('https://ve.dolarapi.com/v1/euros/oficial', { cache: 'no-store' });
      const d = await r.json();
      tasaBcv = d.promedio || 0;
    } catch(e) {}

    const fechaFmt = new Date(hoy + 'T12:00:00').toLocaleDateString('es-VE', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });

    const ICON = turno === 'MEDIODÍA' ? '🌤️' : '🌆';

    const mensaje = [
      `🏛️ <b>ISMA — Aseo Urbano Tucacas</b>`,
      `${ICON} <b>Reporte ${turno} | ${horaStr} VE</b>`,
      `📅 ${fechaFmt}`,
      ``,
      `━━━━━━ 💰 RECAUDACIÓN DEL DÍA ━━━━━━`,
      `<b>Total Cobrado: Bs. ${fmt(totalDia)}</b>`,
      `👥 Contribuyentes que pagaron: ${usuariosPagaron}`,
      ``,
      `💳 <b>Débito / Punto de Venta</b>`,
      `   Bs. ${fmt(totalDebito)} · ${cantDebito} operaciones`,
      ``,
      `🏦 <b>Transferencias Bancarias</b>`,
      `   Bs. ${fmt(totalTransfer)} · ${cantTransfer} operaciones`,
      ...(totalSaldoFavor > 0 ? [
        ``,
        `✳️ <b>Saldo a Favor aplicado</b>`,
        `   Bs. ${fmt(totalSaldoFavor)}`
      ] : []),
      ``,
      `━━━━━ ⏳ PENDIENTES DEL SISTEMA ━━━━━`,
      `🔍 Conciliaciones por verificar: <b>${porVerificar || 0}</b>`,
      `📋 Recibos pendientes de cobro: <b>${totalFactPend}</b>`,
      ``,
      `━━━━━━ 📊 ESTADO GENERAL ━━━━━━━━━`,
      `👤 Total contribuyentes: <b>${totalUsuarios || 0}</b>`,
      `💸 Deuda total sistema: <b>Bs. ${fmt(deudaTotal)}</b>`,
      ...(tasaBcv > 0 ? [`📈 Tasa EUR/BCV: <b>${fmt(tasaBcv)} Bs</b>`] : []),
      ``,
      `⏰ Generado automáticamente — ${horaStr} VE`,
    ].join('\n');

    const enviado = await enviarTelegram(mensaje);

    return NextResponse.json({
      success: true,
      turno,
      fecha: hoy,
      totalDia,
      totalDebito,
      totalTransfer,
      usuariosPagaron,
      porVerificar,
      totalUsuarios,
      deudaTotal,
      tasaBcv,
      telegramEnviado: enviado,
      mensaje: enviado
        ? `Reporte ${turno} enviado a Telegram`
        : 'Telegram no configurado — agregar TELEGRAM_BOT_TOKEN y TELEGRAM_CHAT_ID en Vercel',
    });

  } catch (e: any) {
    console.error('[telegram-report]', e);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
