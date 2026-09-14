import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
);

function buildHtml(nombre: string): string {
  return [
    '<div style="font-family:Arial,sans-serif;color:#1e293b;max-width:600px;margin:0 auto;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">',
    '<div style="background:linear-gradient(135deg,#0f172a,#1e3a5f);padding:32px 24px;text-align:center">',
    '<h1 style="color:#4ade80;margin:0;font-size:22px">ALCALDIA DEL MUNICIPIO SILVA</h1>',
    '<p style="color:#94a3b8;margin:8px 0 0;font-size:14px">Instituto de Servicios de Mantenimiento Ambiental</p>',
    '<p style="color:#60a5fa;margin:4px 0 0;font-size:12px;font-weight:bold">ISMA - ASEO URBANO TUCACAS</p>',
    '</div>',
    '<div style="padding:28px 24px">',
    '<p style="font-size:15px;line-height:1.7">Estimado(a) <strong>' + nombre + '</strong>,</p>',
    '<p style="font-size:15px;line-height:1.7">Por medio del presente le hacemos llegar el <strong>Comunicado Oficial</strong> emitido por la Alcaldia del Municipio Silva en materia de Aseo Urbano.</p>',
    '<div style="background:#f0fdf4;border-left:4px solid #4ade80;padding:16px;border-radius:4px;margin:20px 0">',
    '<p style="margin:0;font-size:14px;color:#166534">Se adjunta el Comunicado Oficial ISMA en formato PDF para su conocimiento y archivo.</p>',
    '</div>',
    '<p style="font-size:14px;color:#64748b">Para consultas puede contactarnos a traves del portal en linea o nuestras oficinas en Municipio Silva, Estado Falcon.</p>',
    '</div>',
    '<div style="background:#f8fafc;padding:16px 24px;border-top:1px solid #e2e8f0;text-align:center">',
    '<p style="margin:0;font-size:12px;color:#94a3b8">ISMA - Aseo Urbano Tucacas - Municipio Silva, Estado Falcon</p>',
    '</div>',
    '</div>',
  ].join('');
}

export async function POST(request: Request) {
  // Resend se inicializa dentro del handler para evitar error en build con key vacia
  const resend = new Resend(process.env.RESEND_API_KEY || 'dev-placeholder');
  try {
    const body = await request.json().catch(() => ({}));
    const testMode: boolean = body.test !== false; // default: prueba=true
    const testEmail = 'davidzara66@gmail.com';

    // Leer PDF via require dinamico (evita analisis estatico de Next.js)
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fsNode = require('fs');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pathNode = require('path');
    const pdfPath = pathNode.join(process.cwd(), 'public', 'comunicado_aseo_isma.pdf');
    let pdfBase64: string;
    try {
      pdfBase64 = fsNode.readFileSync(pdfPath).toString('base64');
    } catch (e) {
      return NextResponse.json(
        { success: false, error: 'PDF no encontrado en public/comunicado_aseo_isma.pdf' },
        { status: 404 }
      );
    }

    // Determinar destinatarios
    let destinatarios: { nombre: string; correo: string }[] = [];
    if (testMode) {
      destinatarios = [{ nombre: 'Prueba ISMA', correo: testEmail }];
    } else {
      const { data: inms, error } = await supabase
        .from('inmuebles')
        .select('contribuyente, correo_electronico')
        .not('correo_electronico', 'is', null)
        .neq('correo_electronico', '');
      if (error) throw error;
      const vistos = new Set<string>();
      for (const inm of inms || []) {
        const correo = (inm.correo_electronico || '').toLowerCase().trim();
        if (correo && !vistos.has(correo)) {
          vistos.add(correo);
          destinatarios.push({ nombre: inm.contribuyente || 'Contribuyente', correo });
        }
      }
    }

    if (!destinatarios.length)
      return NextResponse.json({ success: false, error: 'No hay destinatarios con correo registrado' });

    let enviados = 0, errores = 0;
    const erroresList: string[] = [];

    // Enviar en lotes de 10
    for (let i = 0; i < destinatarios.length; i += 10) {
      const lote = destinatarios.slice(i, i + 10);
      await Promise.all(lote.map(async (dest) => {
        try {
          await resend.emails.send({
            from: 'ISMA Aseo Urbano <noreply@globalrecca.com>',
            to: [dest.correo],
            subject: 'Comunicado Oficial - Aseo Urbano ISMA | Alcaldia Municipio Silva',
            html: buildHtml(dest.nombre),
            attachments: [{ filename: 'Comunicado_Oficial_ISMA.pdf', content: pdfBase64 }],
          });
          enviados++;
        } catch (err: any) {
          errores++;
          erroresList.push(dest.correo + ': ' + err.message);
        }
      }));
      if (i + 10 < destinatarios.length)
        await new Promise(r => setTimeout(r, 500));
    }

    return NextResponse.json({
      success: true,
      modo: testMode ? 'PRUEBA' : 'PRODUCCION',
      enviados,
      errores,
      totalDestinatarios: destinatarios.length,
      erroresList: erroresList.slice(0, 10),
      mensaje: testMode
        ? 'Correo de prueba enviado a ' + testEmail
        : 'Comunicado enviado a ' + enviados + ' contribuyentes',
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
