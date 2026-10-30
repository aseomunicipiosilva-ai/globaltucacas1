// ============================================================
// API Route: /api/telegram-report
// Reportes automáticos a las 12:00 y 18:00 hora Venezuela
// Multi-destinatario (envío al principal y a todos los chats/grupos suscritos)
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

async function obtenerTodosLosChats(): Promise<string[]> {
  const chats = new Set<string>();
  if (TELEGRAM_CHAT_ID) chats.add(String(TELEGRAM_CHAT_ID));
  try {
    const { data: cfg } = await supabase.from('sistema_config').select('valor').eq('id', 'telegram_subscriptores').maybeSingle();
    if (Array.isArray(cfg?.valor)) {
      cfg.valor.forEach((s: any) => {
        if (s?.id) chats.add(String(s.id));
      });
    }
  } catch(e) {}
  return Array.from(chats);
}

async function enviarTelegramDirecto(chatId: string, msg: string): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN || !chatId) return false;
  try {
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: msg, parse_mode: 'HTML' }),
    });
    const d = await res.json();
    return d.ok === true;
  } catch (e) {
    console.error('[Telegram Directo] Error:', e);
    return false;
  }
}

async function enviarTelegramATodos(msg: string): Promise<{ total: number, enviados: number, fallidos: number, chats: any[] }> {
  if (!TELEGRAM_BOT_TOKEN) return { total: 0, enviados: 0, fallidos: 0, chats: [] };
  const chats = await obtenerTodosLosChats();
  const results: any[] = [];
  for (const cId of chats) {
    try {
      const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: cId, text: msg, parse_mode: 'HTML' }),
      });
      const d = await res.json();
      results.push({ chatId: cId, ok: d.ok === true, description: d.description || null });
    } catch(e: any) {
      results.push({ chatId: cId, ok: false, error: e.message });
    }
  }
  const okCount = results.filter(r => r.ok).length;
  return {
    total: chats.length,
    enviados: okCount,
    fallidos: chats.length - okCount,
    chats: results
  };
}

// ── MANEJADOR DE WEBHOOK TELEGRAM ─────────────────────────────
async function manejarWebhookTelegram(body: any) {
  try {
    const msg = body.message || body.channel_post || body.edited_message;
    const chatMember = body.my_chat_member;
    const chat = msg?.chat || chatMember?.chat;
    
    if (!chat || !chat.id) {
      return NextResponse.json({ ok: true });
    }

    const chatId = String(chat.id);
    const nombre = chat.title || [chat.first_name, chat.last_name].filter(Boolean).join(' ') || chat.username || 'Usuario';
    const tipo = chat.type || 'private';

    // Obtener subscriptores actuales
    const { data: cfg } = await supabase.from('sistema_config').select('valor').eq('id', 'telegram_subscriptores').maybeSingle();
    let subscriptores: any[] = Array.isArray(cfg?.valor) ? cfg.valor : [];

    const index = subscriptores.findIndex((s: any) => String(s.id) === chatId);
    if (index === -1) {
      subscriptores.push({
        id: chatId,
        nombre,
        tipo,
        fecha: new Date().toISOString()
      });
    } else {
      subscriptores[index] = {
        ...subscriptores[index],
        nombre,
        tipo,
        updated_at: new Date().toISOString()
      };
    }

    // Guardar en Supabase
    await supabase.from('sistema_config').upsert({
      id: 'telegram_subscriptores',
      valor: subscriptores,
      updated_at: new Date().toISOString()
    });

    // Enviar bienvenida al chat que escribió
    const bienvenida = [
      `🏛️ <b>ISMA — Aseo Urbano Tucacas</b>`,
      `✅ <b>¡Suscripción Activada con Éxito!</b>`,
      ``,
      `Hola <b>${nombre}</b> 👋`,
      `Este chat ha quedado suscrito para recibir automáticamente los <b>Reportes Diarios de Recaudación</b>:`,
      `🌤️ <b>Turno Mediodía:</b> 12:00 m`,
      `🌆 <b>Turno Tarde / Cierre:</b> 6:00 pm`,
      ``,
      `<i>A partir de ahora, cada reporte emitido llegará automáticamente a este chat sin que tengas que solicitarlo.</i>`
    ].join('\n');

    await enviarTelegramDirecto(chatId, bienvenida);

    return NextResponse.json({ ok: true, registrado: chatId, nombre });
  } catch(e: any) {
    console.error('[Webhook Telegram]', e);
    return NextResponse.json({ ok: true });
  }
}

export async function GET(request: Request) { return procesarReporte(request); }
export async function POST(request: Request) {
  try {
    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const body = await request.clone().json().catch(() => null);
      if (body && (body.update_id || body.message || body.my_chat_member || body.channel_post)) {
        return manejarWebhookTelegram(body);
      }
    }
  } catch(e) {}
  return procesarReporte(request);
}

async function procesarReporte(request?: Request) {
  try {
    // Fecha/hora Venezuela (UTC-4)
    const now   = new Date();
    const vzNow = new Date(now.getTime() - 4 * 60 * 60 * 1000);
    const pad   = (n: number) => String(n).padStart(2, '0');
    let hoy     = `${vzNow.getUTCFullYear()}-${pad(vzNow.getUTCMonth()+1)}-${pad(vzNow.getUTCDate())}`;
    
    let customTurno: string | null = null;
    let customHora: string | null = null;

    if (request) {
      try {
        const url = new URL(request.url);

        // 1. Configurar Webhook en Telegram
        if (url.searchParams.get('action') === 'setWebhook') {
          const webhookUrl = `https://globaltucacas1.vercel.app/api/telegram-report`;
          const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook?url=${encodeURIComponent(webhookUrl)}`);
          const data = await res.json();
          return NextResponse.json({ webhookUrl, result: data });
        }

        // 2. Información del Bot
        if (url.searchParams.get('info') === 'bot') {
          const meRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getMe`);
          const me = await meRes.json();
          const { data: cfg } = await supabase.from('sistema_config').select('valor').eq('id', 'telegram_subscriptores').maybeSingle();
          return NextResponse.json({
            ok: true,
            bot: me?.result,
            botUrl: me?.result?.username ? `https://t.me/${me.result.username}` : null,
            chatPrincipal: TELEGRAM_CHAT_ID,
            subscriptores: cfg?.valor || []
          });
        }

        // 3. Agregar chat manualmente (?addChatId=123456&nombre=Grupo)
        const addChatId = url.searchParams.get('addChatId');
        if (addChatId) {
          const nombreChat = url.searchParams.get('nombre') || 'Chat Registrado';
          const { data: cfg } = await supabase.from('sistema_config').select('valor').eq('id', 'telegram_subscriptores').maybeSingle();
          let subs: any[] = Array.isArray(cfg?.valor) ? cfg.valor : [];
          if (!subs.some((s: any) => String(s.id) === String(addChatId))) {
            subs.push({ id: String(addChatId), nombre: nombreChat, fecha: new Date().toISOString() });
            await supabase.from('sistema_config').upsert({ id: 'telegram_subscriptores', valor: subs, updated_at: new Date().toISOString() });
          }
          await enviarTelegramDirecto(String(addChatId), `🏛️ <b>ISMA — Aseo Urbano Tucacas</b>\n\n✅ <b>¡Chat Registrado!</b>\nEste chat recibirá todos los reportes diarios de recaudación.`);
          return NextResponse.json({ success: true, subscriptores: subs });
        }

        // 4. Mensaje de prueba (?test=1)
        if (url.searchParams.get('test') === '1' || url.searchParams.get('prueba') === '1') {
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

          const envio = await enviarTelegramATodos(testMsg);
          return NextResponse.json({ success: true, mensaje: 'Prueba enviada a todos los subscriptores', envio });
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

    // ── 1. Pagos del día ─────────────────────────────────────────
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

    // ── 3. Total usuarios ────────────────────────────────────────
    const { count: totalUsuarios } = await supabase
      .from('inmuebles')
      .select('*', { count: 'exact', head: true })
      .not('estado', 'eq', 'Eliminado');

    // ── 4. Deuda total del sistema ──────────────────────────────
    const { data: facturasPend } = await supabase
      .from('facturas')
      .select('monto')
      .eq('estado', 'Pendiente');

    const deudaTotal = (facturasPend || []).reduce((a, f) => a + parseMonto(f.monto), 0);
    const totalFactPend = (facturasPend || []).length;

    // ── 5. Tasa BCV actual ──────────────────────────────────────
    let tasaBcv = 0;
    try {
      const { data: bcvCfg } = await supabase.from('sistema_config').select('valor').eq('id', 'tasa_bcv_semanal').maybeSingle();
      if (bcvCfg?.valor) tasaBcv = parseFloat(bcvCfg.valor) || 0;
    } catch(e) {}

    if (!tasaBcv || tasaBcv <= 0) {
      try {
        const r = await fetch('https://ve.dolarapi.com/v1/euros/oficial', { cache: 'no-store' });
        const d = await r.json();
        tasaBcv = d.promedio || 0;
      } catch(e) {}
    }

    if (!tasaBcv || tasaBcv <= 0) {
      tasaBcv = 992.80;
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

    const envio = await enviarTelegramATodos(mensaje);

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
      destinatariosTotal: envio.total,
      destinatariosEnviados: envio.enviados,
      envioDetalle: envio.chats,
      mensaje: `Reporte ${turno} enviado a ${envio.enviados} destinatario(s)`
    });

  } catch (e: any) {
    console.error('[telegram-report]', e);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
