import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET() {
  try {
    const { data, error } = await supabase.from('rutas').select('*');
    if (error || !data || data.length === 0) {
      return NextResponse.json([
        { id: 'R1', nombre: 'Ruta #1', sectores: 'Casco Central, Av. Silva, Iglesia, La Quinta' },
        { id: 'R2', nombre: 'Ruta #2', sectores: 'Av. Libertador, Av. Hugo Chávez y Calles de Servicio' },
        { id: 'R3', nombre: 'Ruta #3', sectores: 'Carretera 1; Puente Izate Hasta el Elevado, Brisas del Mar' },
        { id: 'R4', nombre: 'Ruta #4', sectores: 'Boca de Aroa, Parque Jurásico, Carretera Nacional' },
        { id: 'R5', nombre: 'Ruta #5', sectores: 'Sanare y Buena Vista' },
        { id: 'R6', nombre: 'Ruta #6', sectores: 'Morrocoy, Agua Salobre' },
        { id: 'R7', nombre: 'Ruta #7', sectores: 'Izate, Brisas del Mar 2, Federico Eeckhout' }
      ]);
    }
    return NextResponse.json(data);
  } catch {
    return NextResponse.json([]);
  }
}

