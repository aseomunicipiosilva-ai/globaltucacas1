// ============================================================
// API Route: /api/telegram-report
// Reportes automáticos a las 12:00 y 18:00 hora Venezuela
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
    let hoy     = `${vzNow.getUTCFullYear()}-${pad(vzNow.getUTCMonth()+1)}-${pad(vzNow.getUTCDate())}`;
    
    // Soporte para parámetros opcionales ?fecha=YYYY-MM-DD &turno=TARDE &hora=18:00 &info=bot
    let customTurno: string | null = null;
    let customHora: string | null = null;
    if (request) {
      try {
        const url = new URL(request.url);
        if (url.searchParams.get('info') === 'bot') {
          const meRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getMe`);
          const me = await meRes.json();
          let invite: any = null;
          try {
            const invRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/exportChatInviteLink`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID })
            });
            invite = await invRes.json();
          } catch(e) {}
          if (!invite || !invite.ok) {
            try {
              const invRes2 = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/createChatInviteLink`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, name: 'Canal Reportes ISMA' })
              });
              invite = await invRes2.json();
            } catch(e) {}
          }
          return NextResponse.json({
            ok: true,
            bot: me?.result,
            botUrl: me?.result?.username ? `https://t.me/${me.result.username}` : null,
            chatId: TELEGRAM_CHAT_ID,
            inviteLink: invite?.result?.invite_link || (typeof invite?.result === 'string' ? invite.result : null),
            inviteRaw: invite
          });
        }

        if (url.searchParams.get('test') === '1' || url.searchParams.get('prueba') === '1') {
          let updates: any[] = [];
          try {
            const updRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates`);
            const updData = await updRes.json();
            updates = updData.result || [];
          } catch(e) {}

          const chatsToSend = new Set<string>();
          if (TELEGRAM_CHAT_ID) chatsToSend.add(String(TELEGRAM_CHAT_ID));

          updates.forEach((u: any) => {
            const cId = u.message?.chat?.id || u.channel_post?.chat?.id || u.my_chat_member?.chat?.id;
            if (cId) chatsToSend.add(String(cId));
          });

          const horaActualStr = `${pad(vzNow.getUTCHours())}:${pad(vzNow.getUTCMinutes())}`;
          const fechaActualStr = new Date().toLocaleDateString('es-VE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

          const testMsg = [
            `🏛️ <b>ISMA — Aseo Urbano Tucacas</b>`,
            `🔔 <b>MENSAJE DE PRUEBA DE CONEXIÓN</b>`,
            ``,
            `¡Hola! 👋 Esta es una prueba de conexión en tiempo real del bot de recaudación de Aseo Urbano Tucacas.`,
            ``,
            `✅ <b>Estado del bot:</b> Operativo y conectado 100%`,
            `⏰ <b>Hora:</b> ${horaActualStr} VE`,
            `📅 <b>Fecha:</b> ${fechaActualStr}`,
            ``,
            `Si estás leyendo este mensaje, tu cuenta o grupo ya está enlazado correctamente para recibir los reportes diarios de las 12:00 m y 6:00 pm.`
          ].join('\n');

          const results: any[] = [];
          for (const cId of Array.from(chatsToSend)) {
            try {
              const sendRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: cId, text: testMsg, parse_mode: 'HTML' }),
              });
              const sendData = await sendRes.json();
              results.push({ chatId: cId, ok: sendData.ok, description: sendData.description || null });
            } catch(err: any) {
              results.push({ chatId: cId, ok: false, error: err.message });
            }
          }

          return NextResponse.json({
            success: true,
            mensaje: 'Prueba enviada',
            destinatarios: results,
            totalEnviados: results.filter(r => r.ok).length
          });
        }

        const qFecha = url.searchParams.get('fecha');
        if (qFecha && /^\d{4}-\d{2}-\d{2}$/.test(qFecha)) hoy = qFecha;
        customTurno = url.searchParams.get('turno');
        customHora = url.searchParams.get('hora');
      } catch (_e) {}
    }

    const hora  = vzNow.getUTCHours();
    const turno = customTurno || (hora < 15 ? 'MEDIODÍA' : 'TARDE');
    const horaStr = customHora || `${pad(hora)}:${pad(vzNow.getUTCMinutes())}`;

    const startVE = new Date(hoy + 'T00:00:00-04:00').getTime();
    const endVE   = new Date(hoy + 'T23:59:59.999-04:00').getTime();

    // ── 1. Pagos del día (ALINEADO 100% CON REPORTE GENERAL DE INGRESOS / EXCEL) ───
    // Considera todos los pagos registrados en el día (fecha_registro o created_at)
    // Excluye anulados, reversados, condonados y rechazados
    const { data: todosPagos } = await supabase
      .from('pagos_reportados')
      .select('id, monto, tipo, estado, identidad, created_at, detalles')
      .order('created_at', { ascending: false })
      .limit(2000);

    const pagos = (todosPagos || []).filter(p => {
      if (p.estado === 'Anulado' || p.estado === 'Reversado' || p.estado === 'Condonado' || p.estado === 'Rechazado') return false;
      let d: any = {};
      try { d = typeof p.detalles === 'string' ? JSON.parse(p.detalles) : (p.detalles || {}); } catch(e){}
      
      const fechaBase = d.fecha_registro || p.created_at;
      const t = new Date(fechaBase).getTime();

      return t >= startVE && t <= endVE;
    });

    const isDebito = (t: string) => t === 'Debito' || t === 'Punto de Venta' || t === 'REC';
    const isSaldo  = (t: string) => t === 'Saldo a Favor';
    const isTransf = (t: string) => !isDebito(t) && !isSaldo(t);

    const debitos = pagos.filter(p => isDebito(p.tipo));
    const transferencias = pagos.filter(p => isTransf(p.tipo));
    const saldos = pagos.filter(p => isSaldo(p.tipo));

    const totalDebito     = debitos.reduce((a, p) => a + parseMonto(p.monto), 0);
    const totalTransfer   = transferencias.reduce((a, p) => {
      let d: any = {};
      try { d = typeof p.detalles === 'string' ? JSON.parse(p.detalles) : (p.detalles || {}); } catch(e){}
      return a + parseMonto(d.monto_conciliado || p.monto);
    }, 0);
    const totalSaldoFavor = saldos.reduce((a, p) => a + parseMonto(p.monto), 0);
    const totalDia        = totalDebito + totalTransfer + totalSaldoFavor;

    const cantDebito      = debitos.length;
    const cantTransfer    = transferencias.length;
    const usuariosPagaron = new Set(pagos.map(p => p.identidad)).size;

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

    if (!tasaBcv || tasaBcv <= 0) {
      try {
        const { data: cfgRow } = await supabase.from('sistema_config').select('tasa_bcv, tcmmv').limit(1).maybeSingle();
        tasaBcv = parseFloat(cfgRow?.tasa_bcv || cfgRow?.tcmmv || '0') || 0;
      } catch(_e) {}
    }

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
      totalSaldoFavor,
      cantDebito,
      cantTransfer,
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
