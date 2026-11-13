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
        return typeof row.valor === 'string' ? JSON.parse(row.valor) : row.valor;
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

    const payload = {
      unidad: unidad.trim(),
      supervisor: supervisor || 'Supervisor',
      ruta: ruta || '',
      chofer: chofer || '',
      lat,
      lng,
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('sistema_config')
      .upsert({
        id: `gps_unidad_${unidad.trim().toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
        valor: JSON.stringify(payload)
      });

    if (error) throw error;
    return NextResponse.json({ success: true, gps: payload });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
