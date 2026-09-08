import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { metodo, facturaIds, convenioIds, monto, referencia, banco, fecha, identidad } = body;

    if (!identidad || !monto || !metodo) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
    }

    const fechaPago = fecha || new Date().toISOString().split('T')[0];

    // PUNTO DE VENTA: aprobación automática
    if (metodo === 'punto_de_venta') {
      const errores: string[] = [];

      if (facturaIds && facturaIds.length > 0) {
        const { error } = await supabase
          .from('facturas')
          .update({
            estado: 'Pagado',
            metodo_pago: 'Punto de Venta',
            fecha_pago: fechaPago,
            referencia_pago: referencia || `PDV-${Date.now()}`
          })
          .in('id', facturaIds);
        if (error) errores.push(`Error facturas: ${error.message}`);
      }

      if (convenioIds && convenioIds.length > 0) {
        const { error } = await supabase
          .from('convenios_pago')
          .update({
            estado: 'Pagado',
            metodo_pago: 'Punto de Venta',
            fecha_pago: fechaPago
          })
          .in('id', convenioIds);
        if (error) errores.push(`Error convenios: ${error.message}`);
      }

      if (errores.length > 0) {
        return NextResponse.json({ error: errores.join('; ') }, { status: 500 });
      }

      return NextResponse.json({ 
        status: 'approved',
        message: 'Pago por Punto de Venta procesado automáticamente'
      });
    }

    // TRANSFERENCIA: queda en revisión
    if (facturaIds && facturaIds.length > 0) {
      await supabase
        .from('facturas')
        .update({
          estado: 'En Revisión',
          metodo_pago: banco || metodo,
          referencia_pago: referencia || '',
          fecha_pago: fechaPago
        })
        .in('id', facturaIds);
    }

    if (convenioIds && convenioIds.length > 0) {
      await supabase
        .from('convenios_pago')
        .update({
          estado: 'En Revisión',
          metodo_pago: banco || metodo,
          referencia_pago: referencia || '',
          fecha_pago: fechaPago
        })
        .in('id', convenioIds);
    }

    return NextResponse.json({
      status: 'pending',
      message: 'Pago reportado. Pendiente de validación por el equipo administrativo.'
    });

  } catch (err) {
    console.error('Error en pago:', err);
    return NextResponse.json({ error: 'Error en servidor' }, { status: 500 });
  }
}
