import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { identidad, clave } = await request.json();
    
    if (!identidad) {
      return NextResponse.json({ error: 'Identidad requerida' }, { status: 400 });
    }

    const idLimpio = identidad.replace(/-/g, '').toUpperCase();
    const idFormateado = `${idLimpio.charAt(0)}-${idLimpio.slice(1)}`;
    const soloNumeros = identidad.replace(/\D/g, '');

    const { data: records, error } = await supabase
      .from('inmuebles')
      .select('contribuyente, cod_cont, clave_portal')
      .or(`identidad.eq.${idFormateado},identidad.eq.${idLimpio},identidad.eq.${identidad.toUpperCase()},identidad.eq.${soloNumeros}`)
      .limit(1);

    if (error) {
      console.error("Supabase Error:", error);
      return NextResponse.json({ error: 'Error de base de datos' }, { status: 500 });
    }

    if (records && records.length > 0) {
      const user = records[0];
      
      // Si no tiene clave_portal asignada, requiere setup
      if (!user.clave_portal) {
        return NextResponse.json({ 
          status: 'setup_required',
          nombre: user.contribuyente,
          codigo: user.cod_cont 
        });
      }

      // Si tiene clave, verificarla
      if (user.clave_portal === clave) {
        return NextResponse.json({ 
          status: 'success',
          nombre: user.contribuyente, 
          codigo: user.cod_cont 
        });
      } else {
        return NextResponse.json({ error: 'Contraseña incorrecta' }, { status: 401 });
      }
    } else {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }
  } catch (err) {
    return NextResponse.json({ error: 'Error en servidor' }, { status: 500 });
  }
}
