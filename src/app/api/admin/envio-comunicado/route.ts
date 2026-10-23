import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { logos } from '@/lib/logosBase64';
import { EMAIL_TEMPLATES } from '@/lib/emailTemplates';
import fs from 'fs';
import path from 'path';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
);

function getProgressFilePath(): string {
  // Check cwd or fallback to root
  const localPath = path.join(process.cwd(), 'envio_progreso.json');
  return localPath;
}

function readProgress(): { enviados: string[]; fallidos: { email: string; error: string }[] } {
  try {
    const p = getProgressFilePath();
    if (fs.existsSync(p)) {
      const raw = fs.readFileSync(p, 'utf8');
      const parsed = JSON.parse(raw);
      return {
        enviados: Array.isArray(parsed.enviados) ? parsed.enviados.map((e: string) => e.toLowerCase().trim()) : [],
        fallidos: Array.isArray(parsed.fallidos) ? parsed.fallidos : []
      };
    }
  } catch (err) {
    console.warn('Error reading envio_progreso.json:', err);
  }
  return { enviados: [], fallidos: [] };
}

function saveProgress(data: { enviados: string[]; fallidos: { email: string; error: string }[] }) {
  try {
    const p = getProgressFilePath();
    fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.warn('Error saving envio_progreso.json:', err);
  }
}

export async function GET() {
  try {
    const apiKey = process.env.RESEND_API_KEY || '';
    const hasApiKey = Boolean(apiKey && apiKey.startsWith('re_'));

    // Leer progreso guardado de envíos
    const progress = readProgress();
    const enviadosSet = new Set(progress.enviados.map(e => e.toLowerCase().trim()));
    const fallidosMap = new Map<string, string>();
    progress.fallidos.forEach(f => {
      if (f.email) fallidosMap.set(f.email.toLowerCase().trim(), f.error || 'Error');
    });

    // Contribuyentes con correo y teléfono
    const { data: inms, error: inmsErr } = await supabase
      .from('inmuebles')
      .select('id, identidad, contribuyente, correo_electronico, telefono, deuda_mmv, deuda_congelada_bs')
      .not('correo_electronico', 'is', null)
      .neq('correo_electronico', '');

    if (inmsErr) throw inmsErr;

    // Obtener IDs de contribuyentes morosos
    let morososIdSet = new Set<string>();
    let from = 0;
    while (true) {
      const { data: chunk } = await supabase
        .from('facturas')
        .select('identidad')
        .in('estado', ['Pendiente', 'Abonado'])
        .range(from, from + 999);
      if (!chunk || chunk.length === 0) break;
      chunk.forEach((f: any) => {
        const clean = (f.identidad || '').replace(/[-.\s]/g, '').toUpperCase();
        if (clean) morososIdSet.add(clean);
      });
      from += 1000;
      if (chunk.length < 1000) break;
    }

    let countNoSolventes = 0;
    let countSolventes = 0;

    const destinatariosEnriquecidos = (inms || []).map((inm: any) => {
      const cleanId = (inm.identidad || '').replace(/[-.\s]/g, '').toUpperCase();
      const tieneFac = morososIdSet.has(cleanId);
      const tieneDeuda = (parseFloat(inm.deuda_mmv || 0) > 0) || (parseFloat(inm.deuda_congelada_bs || 0) > 0);
      const isNoSolvente = tieneFac || tieneDeuda;

      if (isNoSolvente) countNoSolventes++;
      else countSolventes++;

      const emailClean = (inm.correo_electronico || '').toLowerCase().trim();
      let estadoEnvio: 'ENVIADO' | 'FALLIDO' | 'PENDIENTE' = 'PENDIENTE';

      if (enviadosSet.has(emailClean)) {
        estadoEnvio = 'ENVIADO';
      } else if (fallidosMap.has(emailClean)) {
        estadoEnvio = 'FALLIDO';
      }

      return {
        id: inm.id,
        identidad: inm.identidad || 'S/N',
        contribuyente: inm.contribuyente || 'Contribuyente',
        correo: emailClean,
        telefono: inm.telefono || 'Sin teléfono',
        isNoSolvente,
        estadoEnvio,
        errorMsg: fallidosMap.get(emailClean) || null
      };
    });

    return NextResponse.json({
      success: true,
      hasApiKey,
      remitente: 'ISMA Aseo Urbano <aseo.municipiosilva@globalgreenca.com>',
      totalContactos: (inms || []).length,
      totalNoSolventes: countNoSolventes,
      totalSolventes: countSolventes,
      totalEnviados: progress.enviados.length,
      totalFallidos: progress.fallidos.length,
      enviados: progress.enviados,
      fallidos: progress.fallidos,
      plantillas: EMAIL_TEMPLATES.map(p => ({
        id: p.id,
        nombre: p.nombre,
        categoria: p.categoria,
        audienciaSugerida: p.audienciaSugerida,
        asuntoDefault: p.asuntoDefault,
        descripcion: p.descripcion
      })),
      destinatarios: destinatariosEnriquecidos
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    
    // Acción para reiniciar historial de envíos
    if (body.resetHistory === true) {
      saveProgress({ enviados: [], fallidos: [] });
      return NextResponse.json({
        success: true,
        mensaje: 'Historial de envíos reiniciado exitosamente. Ahora todos los contribuyentes están en estado pendiente.'
      });
    }

    const testMode: boolean = body.test !== false;
    const testEmail: string = (body.email || 'davidzara66@gmail.com').trim();
    const asunto: string = (body.asunto || 'Mantengamos nuestro municipio limpio, regulariza tu estatus en el ISMA').trim();
    
    // Audiencia: 'NO_SOLVENTES' | 'SOLVENTES' | 'TODOS'
    const audiencia: 'NO_SOLVENTES' | 'SOLVENTES' | 'TODOS' = body.audiencia || (body.soloNoSolventes ? 'NO_SOLVENTES' : 'TODOS');
    
    // soloPendientes: Evita reenviar a quienes ya recibieron
    const soloPendientes: boolean = body.soloPendientes !== false;

    const plantillaId: string = body.plantillaId || 'borra_tu_deuda';
    const plantilla = EMAIL_TEMPLATES.find(p => p.id === plantillaId) || EMAIL_TEMPLATES[0];

    const resendApiKey = process.env.RESEND_API_KEY || (body.apiKey || '').trim();

    if (!resendApiKey || !resendApiKey.startsWith('re_')) {
      return NextResponse.json({
        success: false,
        error: 'No se ha configurado la clave API de Resend (RESEND_API_KEY).'
      }, { status: 400 });
    }

    const resend = new Resend(resendApiKey);

    // Preparar buffers de logos oficiales CID
    const bufIsma = Buffer.from(logos.isma.replace(/^data:image\/[a-z]+;base64,/, ''), 'base64');
    const bufBasura = Buffer.from(logos.basura_cero.replace(/^data:image\/[a-z]+;base64,/, ''), 'base64');
    const bufGreen = Buffer.from(logos.global_green.replace(/^data:image\/[a-z]+;base64,/, ''), 'base64');

    const emailAttachments = [
      { filename: 'logo_isma.png', content: bufIsma, contentId: 'logo_isma' },
      { filename: 'logo_basura_cero.png', content: bufBasura, contentId: 'logo_basura_cero' },
      { filename: 'logo_global_green.png', content: bufGreen, contentId: 'logo_global_green' }
    ];

    let destinatarios: { nombre: string; correo: string; telefono?: string; identidad?: string }[] = [];

    if (testMode) {
      if (!testEmail || !testEmail.includes('@')) {
        return NextResponse.json({ success: false, error: 'Debe ingresar un correo de prueba válido' }, { status: 400 });
      }
      destinatarios = [{ nombre: 'Contribuyente de Prueba', correo: testEmail, telefono: '0424-0000000', identidad: 'V-00000000' }];
    } else {
      const { data: inms, error } = await supabase
        .from('inmuebles')
        .select('id, identidad, contribuyente, correo_electronico, telefono, deuda_mmv, deuda_congelada_bs')
        .not('correo_electronico', 'is', null)
        .neq('correo_electronico', '');

      if (error) throw error;

      // Obtener facturas pendientes para clasificar solvencia
      let morososIdSet = new Set<string>();
      let from = 0;
      while (true) {
        const { data: chunk } = await supabase
          .from('facturas')
          .select('identidad')
          .in('estado', ['Pendiente', 'Abonado'])
          .range(from, from + 999);
        if (!chunk || chunk.length === 0) break;
        chunk.forEach((f: any) => {
          const clean = (f.identidad || '').replace(/[-.\s]/g, '').toUpperCase();
          if (clean) morososIdSet.add(clean);
        });
        from += 1000;
        if (chunk.length < 1000) break;
      }

      // Cargar progreso actual de enviados
      const progressActual = readProgress();
      const yaEnviadosSet = new Set(progressActual.enviados.map(e => e.toLowerCase().trim()));

      const vistos = new Set<string>();
      for (const inm of inms || []) {
        const correo = (inm.correo_electronico || '').toLowerCase().trim();
        if (!correo || !correo.includes('@') || vistos.has(correo)) continue;

        const cleanId = (inm.identidad || '').replace(/[-.\s]/g, '').toUpperCase();
        const tieneFac = morososIdSet.has(cleanId);
        const tieneDeuda = (parseFloat(inm.deuda_mmv || 0) > 0) || (parseFloat(inm.deuda_congelada_bs || 0) > 0);
        const isNoSolvente = tieneFac || tieneDeuda;

        // Filtro por Audiencia
        if (audiencia === 'NO_SOLVENTES' && !isNoSolvente) continue;
        if (audiencia === 'SOLVENTES' && isNoSolvente) continue;

        // FILTRO ESTRICTO: NO REENVIAR A LOS YA ENVIADOS
        if (soloPendientes && yaEnviadosSet.has(correo)) {
          continue;
        }

        vistos.add(correo);
        destinatarios.push({
          nombre: inm.contribuyente || 'Contribuyente',
          correo,
          telefono: inm.telefono || '',
          identidad: inm.identidad || ''
        });
      }
    }

    if (!destinatarios.length) {
      return NextResponse.json({
        success: true,
        enviadosAhora: 0,
        yaEstabanEnviados: true,
        mensaje: testMode 
          ? 'No se especificó correo de prueba.'
          : '¡Excelente! Todos los contribuyentes de esta audiencia ya recibieron su comunicado anteriormente. Ninguno duplicado.'
      });
    }

    const currentProgress = readProgress();
    const nuevosEnviados: string[] = [];
    const nuevosFallidos: { email: string; error: string }[] = [];
    let erroresList: string[] = [];

    const batchSize = testMode ? 1 : 5;

    for (let i = 0; i < destinatarios.length; i += batchSize) {
      const lote = destinatarios.slice(i, i + batchSize);
      await Promise.all(
        lote.map(async (dest) => {
          const emailHtml = body.customHtml || plantilla.generarHtml({ nombre: dest.nombre });
          try {
            try {
              await resend.emails.send({
                from: 'ISMA Aseo Urbano <aseo.municipiosilva@globalgreenca.com>',
                replyTo: 'atencion.aseourbanoms@globalgreenca.com',
                to: [dest.correo],
                subject: asunto,
                html: emailHtml,
                attachments: emailAttachments
              });
              nuevosEnviados.push(dest.correo.toLowerCase());
            } catch (domainErr: any) {
              if (domainErr?.message?.includes('not verified') || domainErr?.message?.includes('validation_error')) {
                // Fallback automático al subdominio verificado
                await resend.emails.send({
                  from: 'ISMA Aseo Urbano <aseo@aseosilva.globalrecca.com>',
                  replyTo: 'atencion.aseourbanoms@globalgreenca.com',
                  to: [dest.correo],
                  subject: asunto,
                  html: emailHtml,
                  attachments: emailAttachments
                });
                nuevosEnviados.push(dest.correo.toLowerCase());
              } else {
                throw domainErr;
              }
            }
          } catch (err: any) {
            const errStr = err.message || 'Error de envío';
            nuevosFallidos.push({ email: dest.correo.toLowerCase(), error: errStr });
            erroresList.push(`${dest.correo}: ${errStr}`);
          }
        })
      );

      // Si no es prueba, guardar progreso incrementalmente
      if (!testMode) {
        const mergedEnviados = Array.from(new Set([...currentProgress.enviados, ...nuevosEnviados]));
        // Actualizar fallidos (reemplazando si ahora tuvo éxito)
        const sentSet = new Set(mergedEnviados);
        const filteredFallidos = [
          ...currentProgress.fallidos.filter(f => !sentSet.has(f.email.toLowerCase())),
          ...nuevosFallidos
        ];
        saveProgress({ enviados: mergedEnviados, fallidos: filteredFallidos });
      }

      if (i + batchSize < destinatarios.length) {
        await new Promise((r) => setTimeout(r, 650));
      }
    }

    // Registrar en auditoría
    try {
      await supabase.from('audit_logs').insert([{
        usuario: 'ADMIN_CORREOS',
        accion: 'ENVIO_MASIVO_EMAIL',
        detalles: `Plantilla: ${plantilla.nombre}. Audiencia: ${audiencia}. Modo: ${testMode ? 'PRUEBA (' + testEmail + ')' : 'MASIVO'}. Nuevos enviados: ${nuevosEnviados.length}, Nuevos fallidos: ${nuevosFallidos.length}. Total solicitados: ${destinatarios.length}`
      }]);
    } catch (auditErr) {
      console.warn('Error registrando auditoría:', auditErr);
    }

    const finalProgress = readProgress();

    return NextResponse.json({
      success: true,
      modo: testMode ? 'PRUEBA' : 'PRODUCCIÓN',
      enviadosAhora: nuevosEnviados.length,
      fallidosAhora: nuevosFallidos.length,
      totalHistoricoEnviados: finalProgress.enviados.length,
      totalHistoricoFallidos: finalProgress.fallidos.length,
      erroresList: erroresList.slice(0, 10),
      mensaje: testMode
        ? `¡Correo de prueba con la plantilla "${plantilla.nombre}" enviado exitosamente a ${testEmail}!`
        : `¡Proceso completado! Se despacharon exitosamente ${nuevosEnviados.length} correos (Total acumulado: ${finalProgress.enviados.length} enviados).`
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message || 'Error inesperado en el servidor' }, { status: 500 });
  }
}
