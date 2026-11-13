import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const fecha = searchParams.get('fecha');
    const supervisor = searchParams.get('supervisor');
    const ruta = searchParams.get('ruta');
    const limit = parseInt(searchParams.get('limit') || '500');

    let query = supabase
      .from('servicios_especiales')
      .select('*')
      .eq('tipo', 'viaje_vertedero')
      .order('fecha', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit);

    if (fecha) query = query.eq('fecha', fecha);
    if (supervisor) query = query.ilike('creado_por', `%${supervisor}%`);
    if (ruta) query = query.ilike('descripcion', `%${ruta}%`);

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching viajes vertedero:', error);
      return NextResponse.json([]);
    }

    // Parse notas / metadata
    const parsed = (data || []).map((item: any) => {
      let meta: any = {};
      try {
        meta = typeof item.notas === 'string' ? JSON.parse(item.notas) : (item.notas || {});
      } catch (e) {
        meta = {};
      }
      return {
        id: item.id,
        tipo: item.tipo,
        fecha: item.fecha,
        created_at: item.created_at,
        supervisor: item.creado_por,
        unidad: item.identidad, // ej. 'CAMION-01' o 'Unidad #1'
        chofer: item.contribuyente, // ej. 'Juan Pérez'
        ruta: item.descripcion, // ej. 'Ruta #1 - Casco Central'
        toneladas: parseFloat(item.monto || '0'), // toneladas descargadas
        referencia: item.referencia, // ej. 'VJ-20261114-001'
        estado: item.estado,
        viaje_dia: meta.viaje_dia || 1,
        tipo_vehiculo: meta.tipo_vehiculo || 'Compactadora',
        lat: meta.lat || null,
        lng: meta.lng || null,
        observaciones: meta.observaciones || '',
        detalles: meta
      };
    });

    return NextResponse.json(parsed);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { supervisor, unidad, tipo_vehiculo, chofer, ruta, toneladas, fecha, lat, lng, observaciones } = body;

    if (!unidad || !ruta || toneladas === undefined || toneladas === null) {
      return NextResponse.json({ error: 'Unidad, ruta y toneladas son requeridos.' }, { status: 400 });
    }

    const fechaRegistro = fecha || new Date().toISOString().split('T')[0];
    const toneladasNum = parseFloat(toneladas) || 0;

    // Calcular viaje del día para esta unidad y fecha: suma 1 a los viajes existentes
    const { data: viajesPrevios } = await supabase
      .from('servicios_especiales')
      .select('id, notas')
      .eq('tipo', 'viaje_vertedero')
      .eq('fecha', fechaRegistro)
      .eq('identidad', unidad);

    const proximoNumeroViaje = (viajesPrevios?.length || 0) + 1;
    const refCodigo = `VJ-${fechaRegistro.replace(/-/g, '')}-${unidad.replace(/\s+/g, '')}-${proximoNumeroViaje}`;

    const metadata = {
      viaje_dia: proximoNumeroViaje,
      tipo_vehiculo: tipo_vehiculo || 'Compactadora',
      lat: lat || null,
      lng: lng || null,
      observaciones: observaciones || '',
      timestamp_gps: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('servicios_especiales')
      .insert([{
        tipo: 'viaje_vertedero',
        identidad: unidad.trim(),
        contribuyente: chofer ? chofer.trim() : 'Chofer de Ruta',
        descripcion: ruta.trim(),
        monto: toneladasNum,
        fecha: fechaRegistro,
        notas: JSON.stringify(metadata),
        estado: 'Descargado',
        referencia: refCodigo,
        creado_por: supervisor ? supervisor.trim() : 'Supervisor de Ruta',
        origen: 'supervisor_ruta'
      }])
      .select()
      .single();

    if (error) {
      console.error('Error insertando viaje vertedero:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Actualizar también la última posición en tiempo real de esta unidad en sistema_config
    if (lat && lng) {
      try {
        const gpsPayload = {
          unidad: unidad.trim(),
          tipo_vehiculo: tipo_vehiculo || 'Compactadora',
          supervisor: supervisor || 'Supervisor',
          ruta: ruta.trim(),
          chofer: chofer || '',
          lat,
          lng,
          ultimo_viaje: proximoNumeroViaje,
          toneladas_ultimo: toneladasNum,
          updated_at: new Date().toISOString()
        };
        await supabase
          .from('sistema_config')
          .upsert({
            id: `gps_unidad_${unidad.trim().toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
            valor: JSON.stringify(gpsPayload)
          });
      } catch (gpsErr) {
        console.error('Error guardando GPS:', gpsErr);
      }
    }

    return NextResponse.json({
      success: true,
      viaje: {
        id: data.id,
        viaje_dia: proximoNumeroViaje,
        referencia: refCodigo,
        toneladas: toneladasNum,
        unidad,
        ruta,
        chofer,
        supervisor
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID es requerido' }, { status: 400 });

    const { error } = await supabase
      .from('servicios_especiales')
      .delete()
      .eq('id', id)
      .eq('tipo', 'viaje_vertedero');

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

