import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    // Obtener tasa TCMMV (EUR oficial)
    const [usdRes, eurRes] = await Promise.all([
      fetch('https://ve.dolarapi.com/v1/dolares/oficial', { cache: 'no-store' }),
      fetch('https://ve.dolarapi.com/v1/euros/oficial', { cache: 'no-store' })
    ]);

    if (!usdRes.ok || !eurRes.ok) throw new Error('Error HTTP obteniendo tasas BCV');

    const eurData = await eurRes.json();
    const tcmmv: number = eurData.promedio;

    // Fecha: el cron corre el día 31 a las 03:59 UTC = día 30 a las 23:59 hora Venezuela (UTC-4)
    const ahora = new Date();
    const mesYYYY = String(ahora.getFullYear());
    const mesMM = String(ahora.getMonth() + 1).padStart(2, '0');
    const periodoKey = `${mesMM}-${mesYYYY}`; // ej: 09-2026
    const mesFacturado = ahora.toLocaleString('es-VE', { month: 'long', year: 'numeric' });
    const emisionDate = new Date(ahora.getFullYear(), ahora.getMonth(), 30).toISOString().split('T')[0];
    const vencimientoDate = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 15).toISOString().split('T')[0];

    // Obtener inmuebles activos
    const { data: inmuebles, error: inmueblesError } = await supabase
      .from('inmuebles')
      .select('id, identidad, contribuyente, cod_cont, mmv_mes, cant_inmuebles, deuda_mmv');

    if (inmueblesError) throw inmueblesError;

    let procesados = 0;
    let omitidos = 0;
    let montoTotal = 0;

    for (const inm of (inmuebles || [])) {
      const cant = parseInt(inm.cant_inmuebles) || 1;
      const mmv = parseFloat(inm.mmv_mes) || 0;

      if (mmv <= 0 || !inm.cod_cont) continue;

      // Referencia única por contribuyente y período — previene duplicados
      const refFactura = `CM-${inm.cod_cont}-${periodoKey}`;

      // Verificar si ya existe factura de este período
      const { data: existente } = await supabase
        .from('facturas')
        .select('id')
        .eq('referencia', refFactura)
        .limit(1);

      if (existente && existente.length > 0) {
        omitidos++;
        continue;
      }

      const deudaAgregadaBs = parseFloat((cant * mmv * tcmmv).toFixed(2));
      const nuevaDeudaMmv = (parseFloat(inm.deuda_mmv) || 0) + (cant * mmv);

      // Actualizar deuda MMV del inmueble
      await supabase.from('inmuebles')
        .update({ deuda_mmv: nuevaDeudaMmv })
        .eq('id', inm.id);

      // Insertar factura mensual
      await supabase.from('facturas').insert({
        referencia: refFactura,
        identidad: inm.identidad,
        contribuyente: inm.contribuyente,
        monto: deudaAgregadaBs,
        estado: 'Pendiente',
        emision: emisionDate,
        vencimiento: vencimientoDate,
        detalles: JSON.stringify({
          tipo: 'Cobro Mensual Automático',
          periodo: mesFacturado,
          periodo_key: periodoKey,
          tasa_tcmmv: tcmmv,
          mmv_aplicado: mmv,
          cant_inmuebles: cant,
          generado_en: new Date().toISOString()
        })
      });

      procesados++;
      montoTotal += deudaAgregadaBs;
    }

    // Registrar en audit_logs
    try {
      await supabase.from('audit_logs').insert({
        usuario: 'Sistema (Cron)',
        accion: 'FACTURACION_MENSUAL_AUTOMATICA',
        detalles: `Período: ${mesFacturado}. Procesados: ${procesados}. Omitidos (ya facturados): ${omitidos}. Monto total: Bs ${montoTotal.toFixed(2)}. Tasa TCMMV: ${tcmmv}`
      });
    } catch(e) {}

    return NextResponse.json({
      success: true,
      message: `Facturación mensual automática completada — ${mesFacturado}`,
      procesados,
      omitidos,
      montoTotal,
      periodo: periodoKey,
      tasa_tcmmv: tcmmv
    });

  } catch (error: any) {
    console.error('Error en Cron Billing:', error);
    try {
      await supabase.from('audit_logs').insert({
        usuario: 'Sistema (Cron)',
        accion: 'ERROR_FACTURACION_MENSUAL',
        detalles: error.message || 'Error desconocido'
      });
    } catch(e) {}
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
