// ============================================================
// API Route: /api/telegram-report
// Reporte diario de recaudación enviado a Telegram
// PENDIENTE: Configurar TELEGRAM_BOT_TOKEN y TELEGRAM_CHAT_ID
//            en las variables de entorno de Vercel.
// ============================================================
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function parseMonto(val: string | number | undefined): number {
  if (!val) return 0;
  const s = String(val).replace(/\./g, '').replace(',', '.');
  return parseFloat(s) || 0;
}

async function enviarMensajeTelegram(mensaje: string): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.warn('[Telegram] Bot Token o Chat ID no configurados. Mensaje no enviado.');
    return false;
  }
  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: mensaje,
        parse_mode: 'HTML',
      }),
    });
    const data = await res.json();
    return data.ok === true;
  } catch (e) {
    console.error('[Telegram] Error al enviar mensaje:', e);
    return false;
  }
}

export async function GET() {
  return generarReporte();
}

export async function POST() {
  return generarReporte();
}

async function generarReporte() {
  try {
    // Rango del día actual en Venezuela UTC-4
    const now = new Date();
    const vzOffset = -4 * 60;
    const localNow = new Date(now.getTime() + (vzOffset - now.getTimezoneOffset()) * 60000);
    const pad = (n: number) => String(n).padStart(2, '0');
    const hoy = `${localNow.getUTCFullYear()}-${pad(localNow.getUTCMonth()+1)}-${pad(localNow.getUTCDate())}`;

    // Obtener pagos aprobados del día
    const { data: pagosDia, error } = await supabase
      .from('pagos_reportados')
      .select('monto, tipo, identidad, referencia, created_at')
      .eq('estado', 'Aprobado')
      .gte('created_at', hoy + 'T00:00:00')
      .lte('created_at', hoy + 'T23:59:59');

    if (error) throw error;

    const pagos = pagosDia || [];
    const totalDia = pagos.reduce((a, p) => a + parseMonto(p.monto), 0);
    const totalTransferencias = pagos.filter(p => p.tipo === 'Transferencia').reduce((a, p) => a + parseMonto(p.monto), 0);
    const totalDebito = pagos.filter(p => p.tipo === 'Debito').reduce((a, p) => a + parseMonto(p.monto), 0);
    const cantTransferencias = pagos.filter(p => p.tipo === 'Transferencia').length;
    const cantDebito = pagos.filter(p => p.tipo === 'Debito').length;

    const formatBs = (n: number) => n.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const fechaFormateada = new Date(hoy).toLocaleDateString('es-VE', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    const mensaje = [
      `🏛️ <b>ISMA - Reporte de Recaudación</b>`,
      `📅 ${fechaFormateada}`,
      ``,
      `💰 <b>Total del Día: Bs. ${formatBs(totalDia)}</b>`,
      `📊 Transacciones: ${pagos.length}`,
      ``,
      `💳 <b>Punto de Venta / Débito</b>`,
      `   Monto: Bs. ${formatBs(totalDebito)} (${cantDebito} operaciones)`,
      ``,
      `🏦 <b>Transferencias</b>`,
      `   Monto: Bs. ${formatBs(totalTransferencias)} (${cantTransferencias} operaciones)`,
      ``,
      `⏰ Generado: ${new Date().toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })} VE`,
    ].join('\n');

    const enviado = await enviarMensajeTelegram(mensaje);

    return NextResponse.json({
      success: true,
      fecha: hoy,
      totalDia,
      transacciones: pagos.length,
      telegramEnviado: enviado,
      mensaje: enviado ? 'Reporte enviado a Telegram' : 'Telegram no configurado (PENDING: agregar TELEGRAM_BOT_TOKEN y TELEGRAM_CHAT_ID en Vercel)',
    });

  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
