import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('sistema_config')
      .select('*')
      .ilike('id', 'gps_unidad_%');

    if (error) {
      console.error('Error fetching GPS units:', error);
      return NextResponse.json([]);
    }

    const units = (data || []).map((row: any) => {
      try {
        const parsed = typeof row.valor === 'string' ? JSON.parse(row.valor) : row.valor;
        return {
          ...parsed,
          config_id: row.id
        };
      } catch (e) {
        return null;
      }
    }).filter(Boolean);

    return NextResponse.json(units);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { unidad, supervisor, ruta, chofer, lat, lng, force_point, batch_trail } = body;

    if (!unidad || !lat || !lng) {
      return NextResponse.json({ error: 'Unidad, latitud y longitud son requeridos.' }, { status: 400 });
    }

    const configId = `gps_unidad_${unidad.trim().toLowerCase().replace(/[^a-z0-9]/g, '_')}`;

    // Obtener historial previo de recorrido para guardar el trazado (trail) y la bitácora
    let previousTrail: Array<{ lat: number; lng: number; time: string }> = [];
    let bitacora: Array<{ lat: number; lng: number; time: string; ruta?: string; chofer?: string; hora: string }> = [];
    let lastBitacoraTime = 0;

    try {
      const { data: existing } = await supabase
        .from('sistema_config')
        .select('valor')
        .eq('id', configId)
        .maybeSingle();

      if (existing && existing.valor) {
        const prevObj = typeof existing.valor === 'string' ? JSON.parse(existing.valor) : existing.valor;
        if (Array.isArray(prevObj.trail)) previousTrail = prevObj.trail;
        if (Array.isArray(prevObj.bitacora)) bitacora = prevObj.bitacora;
        if (prevObj.last_bitacora_ts) lastBitacoraTime = Number(prevObj.last_bitacora_ts) || 0;
      }
    } catch(e) {}

    const now = new Date();
    const nowIso = now.toISOString();
    const nowMs = now.getTime();
    const horaLegible = new Intl.DateTimeFormat('es-VE', { timeZone: 'America/Caracas', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }).format(now);

    // 1. Trazado fino de recorrido (para dibujar la línea continua en el mapa)
    // Si viene un lote de puntos guardados en modo offline durante desconexión:
    if (Array.isArray(batch_trail) && batch_trail.length > 0) {
      for (const p of batch_trail) {
        if (p.lat && p.lng) {
          const lP = previousTrail[previousTrail.length - 1];
          if (!lP || Math.abs(lP.lat - p.lat) > 0.00003 || Math.abs(lP.lng - p.lng) > 0.00003) {
            previousTrail.push({
              lat: Number(p.lat),
              lng: Number(p.lng),
              time: p.time || nowIso
            });
          }
        }
      }
    }

    // Agregar el punto actual al trazado si se movió al menos ~3 metros o si no había puntos previos
    const lastPoint = previousTrail[previousTrail.length - 1];
    if (!lastPoint || Math.abs(lastPoint.lat - lat) > 0.00003 || Math.abs(lastPoint.lng - lng) > 0.00003) {
      previousTrail.push({ lat: Number(lat), lng: Number(lng), time: nowIso });
    }
    if (previousTrail.length > 1000) previousTrail = previousTrail.slice(-1000);

    // 2. MODO BITÁCORA: Guardar el primer hito de inmediato y los siguientes cada 3 minutos o si el camión se desplaza más de 25 metros
    let newBitacoraTs = lastBitacoraTime;
    const lastB = bitacora[bitacora.length - 1];
    const distancia = lastB ? Math.hypot(lastB.lat - lat, lastB.lng - lng) : 999;
    const tiempoTranscurrido = nowMs - lastBitacoraTime;

    if (Boolean(force_point) || bitacora.length === 0 || tiempoTranscurrido >= 180000 || distancia > 0.00025) {
      bitacora.push({
        lat: Number(lat),
        lng: Number(lng),
        time: nowIso,
        hora: horaLegible,
        ruta: ruta || 'En patrullaje/recolección',
        chofer: chofer || ''
      });
      newBitacoraTs = nowMs;
    }
    if (bitacora.length > 500) bitacora = bitacora.slice(-500);

    const payload = {
      unidad: unidad.trim(),
      supervisor: supervisor || 'Supervisor',
      ruta: ruta || '',
      chofer: chofer || '',
      lat: Number(lat),
      lng: Number(lng),
      trail: previousTrail,
      bitacora,
      last_bitacora_ts: newBitacoraTs,
      updated_at: nowIso
    };

    const { error } = await supabase
      .from('sistema_config')
      .upsert({
        id: configId,
        valor: JSON.stringify(payload)
      });

    if (error) throw error;
    return NextResponse.json({ success: true, gps: payload });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const unidad = searchParams.get('unidad');

    let query = supabase.from('sistema_config').delete();

    if (id) {
      query = query.eq('id', id);
    } else if (unidad) {
      const configId = `gps_unidad_${unidad.trim().toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
      query = query.eq('id', configId);
    } else {
      return NextResponse.json({ error: 'Se requiere id o unidad para eliminar' }, { status: 400 });
    }

    const { error } = await query;
    if (error) throw error;

    return NextResponse.json({ success: true, message: 'Unidad eliminada exitosamente de la Sala Situacional' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
