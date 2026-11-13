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
    const { unidad, supervisor, ruta, chofer, lat, lng } = body;

    if (!unidad || !lat || !lng) {
      return NextResponse.json({ error: 'Unidad, latitud y longitud son requeridos.' }, { status: 400 });
    }

    const configId = `gps_unidad_${unidad.trim().toLowerCase().replace(/[^a-z0-9]/g, '_')}`;

    // Obtener historial previo de recorrido para guardar el trazado (trail)
    let previousTrail: Array<{ lat: number; lng: number; time: string }> = [];
    try {
      const { data: existing } = await supabase
        .from('sistema_config')
        .select('valor')
        .eq('id', configId)
        .maybeSingle();

      if (existing && existing.valor) {
        const prevObj = typeof existing.valor === 'string' ? JSON.parse(existing.valor) : existing.valor;
        if (Array.isArray(prevObj.trail)) {
          previousTrail = prevObj.trail;
        } else if (prevObj.lat && prevObj.lng) {
          previousTrail = [{ lat: prevObj.lat, lng: prevObj.lng, time: prevObj.updated_at || new Date().toISOString() }];
        }
      }
    } catch(e) {}

    // Agregar nuevo punto si está a más de 10 metros o no es idéntico
    const nowIso = new Date().toISOString();
    const lastPoint = previousTrail[previousTrail.length - 1];
    if (!lastPoint || Math.abs(lastPoint.lat - lat) > 0.00005 || Math.abs(lastPoint.lng - lng) > 0.00005) {
      previousTrail.push({ lat, lng, time: nowIso });
    }

    // Mantener los últimos 300 puntos de ruta para optimizar memoria
    if (previousTrail.length > 300) {
      previousTrail = previousTrail.slice(-300);
    }

    const payload = {
      unidad: unidad.trim(),
      supervisor: supervisor || 'Supervisor',
      ruta: ruta || '',
      chofer: chofer || '',
      lat,
      lng,
      trail: previousTrail,
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
