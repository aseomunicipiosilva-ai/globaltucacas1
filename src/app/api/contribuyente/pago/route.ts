import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { metodo, facturaIds, convenioIds, monto, referencia, banco, fecha, identidad, comprobante_b64, comprobante_nombre } = body;

    if (!identidad || !monto || !metodo) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
    }

    if (metodo === 'transferencia') {
      if (!referencia || !referencia.trim()) {
        return NextResponse.json({ error: 'El número de referencia es obligatorio para transferencias bancarias.' }, { status: 400 });
      }
      if (!comprobante_b64) {
        return NextResponse.json({ error: '⚠️ COMPROBANTE OBLIGATORIO: Debe adjuntar la imagen o captura del comprobante bancario para evitar fallas de conciliación.' }, { status: 400 });
      }
    }

    const fechaPago = fecha || new Date().toISOString().split('T')[0];
    const identidadNorm = identidad ? identidad.replace(/-/g, '').replace(/^([JVEG])(\d)/i, '$1-$2').toUpperCase() : '';

    // Verificar duplicado si hay referencia (BLOQUEO ESTRICTO)
    if (referencia && referencia.trim()) {
      const refLimpia = referencia.trim();
      const { data: dupReportados } = await supabase
        .from('pagos_reportados')
        .select('id')
        .eq('referencia', refLimpia)
        .limit(1);
      if (dupReportados && dupReportados.length > 0) {
        return NextResponse.json({ error: `⛔ BLOQUEO FINANCIERO: El número de referencia "${refLimpia}" ya fue registrado previamente en un pago. No se permite reutilizar referencias.` }, { status: 400 });
      }

      const { data: dupFacturas } = await supabase
        .from('facturas')
        .select('id')
        .eq('referencia_pago', refLimpia)
        .limit(1);
      if (dupFacturas && dupFacturas.length > 0) {
        return NextResponse.json({ error: `⛔ BLOQUEO FINANCIERO: La referencia "${refLimpia}" ya fue liquidada en una factura anterior.` }, { status: 400 });
      }
    }

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
        if (error) errores.push(`Error recibos: ${error.message}`);
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

    // Insertar en pagos_reportados para que aparezca en Conciliación Bancaria
    if (metodo === 'transferencia') {
      const { data: recibosData } = await supabase.from('facturas').select('referencia').in('id', facturaIds || []);
      const recibosRefs = recibosData ? recibosData.map(r => r.referencia) : [];
      
      await supabase.from('pagos_reportados').insert({
        identidad: identidadNorm,
        monto: monto,
        banco: banco || metodo,
        referencia: referencia || '',
        tipo: 'Transferencia (Web)',
        estado: 'Por Verificar',
        detalles: JSON.stringify({
          origen: 'Portal Web (Soy Contribuyente)',
          recibos: recibosRefs,
          recibosIds: facturaIds,
          conveniosIds: convenioIds,
          fecha_transaccion: fechaPago,
          comprobante_b64: comprobante_b64 || undefined,
          comprobante_nombre: comprobante_nombre || 'comprobante_web.jpg'
        })
      });

      // Marcar facturas como Por Verificar para que Caja las bloquee automaticamente
      if (facturaIds && facturaIds.length > 0) {
        await supabase.from('facturas')
          .update({ estado: 'Por Verificar' })
          .in('id', facturaIds);
      }
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
