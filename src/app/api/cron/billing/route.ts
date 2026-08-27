import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Crear cliente de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(request: Request) {
  // 1. Validar el CRON_SECRET para seguridad
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    // 2. Obtener la tasa actual del BCV usando la misma lógica de /api/bcv
    const [usdRes, eurRes] = await Promise.all([
      fetch('https://ve.dolarapi.com/v1/dolares/oficial', { cache: 'no-store' }),
      fetch('https://ve.dolarapi.com/v1/euros/oficial', { cache: 'no-store' })
    ]);

    if (!usdRes.ok || !eurRes.ok) {
      throw new Error('Error HTTP obteniendo tasas de la API');
    }

    const usdData = await usdRes.json();
    const eurData = await eurRes.json();
    const tcmmv = eurData.promedio;

    // 3. Obtener todos los inmuebles
    const { data: inmuebles, error: inmueblesError } = await supabase
      .from('inmuebles')
      .select('id, identidad, contribuyente, cod_cont, mmv_mes, cant_inmuebles, deuda_mmv');

    if (inmueblesError) throw inmueblesError;

    let procesados = 0;
    let montoTotal = 0;
    
    // Mes actual para referencia de la factura
    const fechaActual = new Date();
    const mesActual = fechaActual.toLocaleString('es-VE', { month: 'long', year: 'numeric' });
    const tituloFactura = `Cobro Mensual - ${mesActual.charAt(0).toUpperCase() + mesActual.slice(1)}`;

    // Para la inserción y actualización en lote
    for (const inm of inmuebles) {
      const cant = parseInt(inm.cant_inmuebles) || 1;
      const mmv = parseFloat(inm.mmv_mes) || 0;
      
      if (mmv > 0) {
        // Calcular deuda
        const deudaAgregadaBs = parseFloat((cant * mmv * tcmmv).toFixed(2));
        const deudaMmvAnterior = parseFloat(inm.deuda_mmv) || 0;
        const nuevaDeudaMmv = deudaMmvAnterior + (cant * mmv);

        // Actualizar el saldo en MMV del inmueble
        await supabase
          .from('inmuebles')
          .update({ deuda_mmv: nuevaDeudaMmv })
          .eq('id', inm.id);

        // Crear una factura
        await supabase
          .from('facturas')
          .insert({
            referencia: `CM-${inm.cod_cont}-${Date.now().toString().slice(-6)}`,
            identidad: inm.identidad,
            contribuyente: inm.contribuyente,
            monto: deudaAgregadaBs,
            estado: 'Pendiente',
            emision: fechaActual.toISOString().split('T')[0],
            vencimiento: new Date(fechaActual.getTime() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // Vence en 15 días
          });

        procesados++;
        montoTotal += deudaAgregadaBs;
      }
    }

    // 4. Registrar en Auditoría
    await supabase.from('audit').insert({
      action: 'Facturación Mensual Automática',
      details: `Se procesaron ${procesados} contribuyentes. Monto total facturado: Bs ${montoTotal.toFixed(2)}. Tasa aplicada (TCMMV): ${tcmmv}`,
      user_email: 'Sistema (Cron)',
      module: 'Cron Billing'
    });

    return NextResponse.json({
      success: true,
      message: 'Facturación mensual completada',
      procesados,
      montoTotal
    });

  } catch (error: any) {
    console.error('Error en Cron Billing:', error);
    // Intentar registrar el error en audit si es posible
    await supabase.from('audit').insert({
      action: 'Error Facturación Mensual',
      details: error.message || 'Error desconocido',
      user_email: 'Sistema (Cron)',
      module: 'Cron Billing'
    });
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
