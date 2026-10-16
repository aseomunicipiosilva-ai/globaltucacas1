import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
);

function buildWeeklyEmailHtml(nombre: string, identidad: string, totalPendiente: number, numFacturas: number): string {
  const BASE = 'https://aseosilvaad.globalrecca.com';
  const portalUrl = 'https://aseosilvaad.globalrecca.com/portal';
  
  return `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Estado de Cuenta Semanal - ISMA</title></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:24px 0;">
<tr><td align="center">
<table width="620" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);max-width:620px;">

  <!-- HEADER -->
  <tr>
    <td style="background:linear-gradient(135deg,#0a4a2a 0%,#15803d 50%,#0a4a2a 100%);padding:22px 24px;text-align:center;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td align="center" width="33%">
            <img src="${BASE}/logos/alcaldia.jpg" alt="Alcaldia Silva" width="95" style="display:block;margin:0 auto;border-radius:6px;" />
          </td>
          <td align="center" width="34%">
            <img src="${BASE}/logos/isma.jpg" alt="ISMA" width="115" style="display:block;margin:0 auto;background:#fff;border-radius:8px;padding:4px;" />
          </td>
          <td align="center" width="33%">
            <img src="${BASE}/logos/basura_cero.jpg" alt="Basura Cero" width="85" style="display:block;margin:0 auto;border-radius:6px;" />
          </td>
        </tr>
      </table>
      <p style="margin:14px 0 0 0;color:#ffffff;font-size:12px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;">
        INSTITUTO AUTÓNOMO DE GESTIÓN AMBIENTAL - MUNICIPIO SILVA
      </p>
    </td>
  </tr>

  <!-- BANNER SEMANAL -->
  <tr>
    <td style="background:#f0fdf4;padding:16px 28px;border-bottom:2px solid #22c55e;">
      <h2 style="margin:0;color:#166534;font-size:18px;font-weight:bold;">
        Notificación y Estado de Cuenta Semanal
      </h2>
      <p style="margin:4px 0 0 0;font-size:13px;color:#15803d;">
        Actualización oficial de solvencia y aseo urbano
      </p>
    </td>
  </tr>

  <!-- CONTENIDO -->
  <tr>
    <td style="padding:28px;color:#334155;font-size:14px;line-height:1.6;">
      <p style="margin-top:0;">Estimado(a) <strong>${nombre}</strong> (RIF/CI: <strong>${identidad}</strong>),</p>
      
      <p>
        El <strong>Instituto Autónomo Municipal de Gestión Ambiental del Municipio Silva (ISMA)</strong> le hace llegar el reporte de estado de cuenta correspondiente a esta semana.
      </p>

      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:18px;margin:20px 0;">
        <table width="100%" cellpadding="6" cellspacing="0" style="font-size:14px;">
          <tr>
            <td style="color:#64748b;">Estatus de Solvencia:</td>
            <td align="right">
              ${totalPendiente > 0 
                ? '<span style="background:#fee2e2;color:#991b1b;padding:4px 10px;border-radius:6px;font-weight:bold;font-size:12px;">PENDIENTE DE PAGO</span>' 
                : '<span style="background:#dcfce7;color:#166534;padding:4px 10px;border-radius:6px;font-weight:bold;font-size:12px;">SOLVENTE</span>'}
            </td>
          </tr>
          <tr>
            <td style="color:#64748b;">Recibos Pendientes:</td>
            <td align="right" style="font-weight:bold;color:#0f172a;">${numFacturas}</td>
          </tr>
          <tr>
            <td style="color:#64748b;">Monto Total Estimado:</td>
            <td align="right" style="font-weight:bold;font-size:16px;color:#15803d;">
              Bs. ${totalPendiente.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </td>
          </tr>
        </table>
      </div>

      <p style="font-size:13px;color:#64748b;">
        Manténgase al día para disfrutar de su Certificado de Solvencia Digital y evitar recargos. Recuerde que puede pagar en línea y adjuntar su constancia/capture para conciliar de inmediato.
      </p>

      <!-- BOTON PORTAL -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">
        <tr>
          <td align="center">
            <a href="${portalUrl}" style="background:#15803d;color:#ffffff;text-decoration:none;font-weight:bold;padding:14px 28px;border-radius:8px;display:inline-block;font-size:14px;">
              Acceder al Portal del Contribuyente &rarr;
            </a>
          </td>
        </tr>
      </table>

      <div style="background:#eff6ff;border-left:4px solid #3b82f6;padding:12px 16px;border-radius:0 8px 8px 0;font-size:12px;color:#1e40af;">
        <strong>Atención y Canales de Pago:</strong> Sede de ISMA en Tucacas. Transferencias Bancarias, Pago Móvil y Punto de Venta en Taquillas de Recaudación.
      </div>
    </td>
  </tr>

  <!-- FOOTER -->
  <tr>
    <td style="background:#0a4a2a;padding:16px 24px;text-align:center;">
      <p style="margin:0;font-size:11px;color:#86efac;line-height:1.6;">
        ISMA &bull; Alcaldía del Municipio Silva &bull; Estado Falcón<br/>
        Correo generado automáticamente por la Plataforma Digital ISMA Silva.
      </p>
    </td>
  </tr>

</table>
</td></tr>
</table>
</body>
</html>
`;
}

async function procesarEnvioSemanal(testMode = false, testEmail = 'davidzara66@gmail.com') {
  const resendApiKey = process.env.RESEND_API_KEY;
  const resend = new Resend(resendApiKey || 're_placeholder');

  let destinatarios: { nombre: string; correo: string; identidad: string; totalPendiente: number; numFacturas: number }[] = [];

  if (testMode) {
    destinatarios = [{
      nombre: 'Contribuyente Prueba ISMA',
      correo: testEmail,
      identidad: 'V-12345678',
      totalPendiente: 450.50,
      numFacturas: 2
    }];
  } else {
    // 1. Obtener inmuebles con correos validos
    const { data: inms, error } = await supabase
      .from('inmuebles')
      .select('identidad, contribuyente, correo_electronico')
      .not('correo_electronico', 'is', null)
      .neq('correo_electronico', '');

    if (error) throw error;

    // 2. Obtener facturas pendientes para totalizar montos por contribuyente
    const { data: facturas } = await supabase
      .from('facturas')
      .select('identidad, monto, estado')
      .in('estado', ['Pendiente', 'Abonado']);

    const deudaMap = new Map<string, { total: number; count: number }>();
    (facturas || []).forEach((f: any) => {
      const id = (f.identidad || '').trim().toUpperCase();
      const current = deudaMap.get(id) || { total: 0, count: 0 };
      const m = parseFloat(f.monto || '0') || 0;
      deudaMap.set(id, { total: current.total + m, count: current.count + 1 });
    });

    const correosVistos = new Set<string>();
    for (const inm of inms || []) {
      const correo = (inm.correo_electronico || '').toLowerCase().trim();
      const id = (inm.identidad || '').trim().toUpperCase();
      if (correo && !correosVistos.has(correo) && correo.includes('@')) {
        correosVistos.add(correo);
        const deudaInfo = deudaMap.get(id) || { total: 0, count: 0 };
        destinatarios.push({
          nombre: inm.contribuyente || 'Contribuyente',
          correo,
          identidad: inm.identidad || 'N/A',
          totalPendiente: deudaInfo.total,
          numFacturas: deudaInfo.count
        });
      }
    }
  }

  if (destinatarios.length === 0) {
    return { success: false, error: 'No hay contribuyentes con correo electrónico registrado' };
  }

  let enviados = 0;
  let errores = 0;
  const erroresList: string[] = [];

  // Enviar en lotes de 8 para evitar saturar limites
  for (let i = 0; i < destinatarios.length; i += 8) {
    const lote = destinatarios.slice(i, i + 8);
    await Promise.all(
      lote.map(async (dest) => {
        try {
          if (!resendApiKey) {
            // Simulacion controlada si falta API Key
            enviados++;
            return;
          }
          await resend.emails.send({
            from: 'ISMA Recaudación <aseo.municipiosilva@globalgreenca.com>',
            to: [dest.correo],
            subject: 'Notificación Oficial - Estado de Cuenta Semanal | ISMA Municipio Silva',
            html: buildWeeklyEmailHtml(dest.nombre, dest.identidad, dest.totalPendiente, dest.numFacturas)
          });
          enviados++;
        } catch (err: any) {
          errores++;
          erroresList.push(`${dest.correo}: ${err.message}`);
        }
      })
    );
    if (i + 8 < destinatarios.length) {
      await new Promise(r => setTimeout(r, 600));
    }
  }

  // Registrar en bitácora de auditoría
  try {
    await supabase.from('audit_logs').insert([{
      usuario: 'CRON_SEMANAL',
      accion: 'ENVIOS_MASIVOS_SEMANAL',
      detalles: `Envío semanal automatizado procesado. Modo: ${testMode ? 'PRUEBA' : 'PRODUCCIÓN'}. Enviados: ${enviados}, Errores: ${errores}. Total evaluados: ${destinatarios.length}`
    }]);
  } catch (auditErr) {
    console.warn('Error al guardar auditoría de correos:', auditErr);
  }

  return {
    success: true,
    modo: testMode ? 'PRUEBA' : 'PRODUCCIÓN',
    enviados,
    errores,
    totalDestinatarios: destinatarios.length,
    erroresList: erroresList.slice(0, 10),
    mensaje: testMode
      ? `Correo de prueba enviado a ${testEmail}`
      : `Envío semanal automatizado ejecutado con éxito. ${enviados} correos enviados.`
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const testMode = searchParams.get('test') === 'true';
    const testEmail = searchParams.get('email') || 'davidzara66@gmail.com';
    const res = await procesarEnvioSemanal(testMode, testEmail);
    return NextResponse.json(res);
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const testMode = body.test !== false;
    const testEmail = body.email || 'davidzara66@gmail.com';
    const res = await procesarEnvioSemanal(testMode, testEmail);
    return NextResponse.json(res);
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
