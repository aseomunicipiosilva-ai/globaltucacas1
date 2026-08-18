import { NextResponse } from 'next/server';
import inmueblesData from '@/data/inmuebles.json';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const identidad = searchParams.get('identidad');
  
  if (!identidad) {
    return NextResponse.json({ error: 'Identidad requerida' }, { status: 400 });
  }

  // Normalizar la identidad (quitar guiones) para la búsqueda
  const identidadNormalizada = identidad.replace(/-/g, '').toUpperCase();

  // Buscar en la "base de datos" (el JSON)
  const record = inmueblesData.find((item: any) => {
    if (!item['Unnamed: 1']) return false;
    const dbIdentidad = String(item['Unnamed: 1']).replace(/-/g, '').toUpperCase();
    return dbIdentidad === identidadNormalizada;
  });

  if (record) {
    return NextResponse.json({ 
      nombre: record['Unnamed: 2'], 
      codigo: record['Unnamed: 0'] 
    });
  } else {
    // Si no se encuentra, retornamos un genérico para no bloquear la demo
    return NextResponse.json({ 
      nombre: 'Contribuyente No Registrado', 
      codigo: 'C-000000' 
    });
  }
}
