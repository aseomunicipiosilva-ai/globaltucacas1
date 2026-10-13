import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Lógica para procesar la validación y reliquidación de decretos y convenios
export async function POST(request: Request) {
  try {
    const body = await request.json();
    let { 
      action = 'evaluar', 
      inmueble_id, 
      sector, 
      identidad,
      tipoPago = 'fraccionado',
      pagoInicial = 0,
      cuotas = 1 
    } = body;

    if (sector && sector.toUpperCase().includes('TIPO C')) { sector = 'CONDOMINIO'; }
    else if (sector && sector.toUpperCase() === 'TIPO A') { sector = 'COMERCIAL'; }
    else if (sector && sector.toUpperCase() === 'TIPO B') { sector = 'RESIDENCIAL'; }

    if (!inmueble_id || !sector) {
      return NextResponse.json({ error: 'Faltan parámetros requeridos.' }, { status: 400 });
    }

    // 1. Obtener los parámetros del decreto según el sector
    const { data: parametros, error: paramError } = await supabase
      .from('decretos_parametros')
      .select('*')
      .eq('sector', sector.toUpperCase())
      .single();

    if (paramError || !parametros) {
      return NextResponse.json({ error: 'No se encontraron parámetros de decreto para este sector.' }, { status: 404 });
    }

    const hoy = new Date();
    const fechaCierre = new Date(parametros.fecha_cierre);
    if (hoy > fechaCierre) {
      return NextResponse.json({ error: 'El decreto para este sector ha expirado.', eligible: false }, { status: 400 });
    }

    // 2. Obtener datos del inmueble
    const { data: inmuebleData } = await supabase
      .from('inmuebles')
      .select('*')
      .eq('id', inmueble_id)
      .maybeSingle();

    // 3. Obtener facturas impagas del contribuyente
    const searchId = identidad || inmuebleData?.identidad || inmueble_id;
    const { data: facturas, error: facError } = await supabase
      .from('facturas')
      .select('id, referencia, emision, monto, estado')
      .eq('identidad', searchId)
      .neq('estado', 'Pagado')
      .neq('estado', 'Anulado')
      .neq('estado', 'Refinanciado');

    if (facError) {
      return NextResponse.json({ error: 'Error al consultar las facturas del contribuyente. ' + facError.message }, { status: 500 });
    }

    // Filtramos manualmente las facturas dentro de la fecha del decreto (Enero 2024 - Septiembre 2026)
    const facturasValidas = facturas?.filter(f => {
      if (!f.emision) return false;
      const fechaFact = new Date(f.emision);
      const inicio = new Date(2024, 0, 1);
      const fin = new Date(2026, 8, 30); // Septiembre 2026
      return fechaFact >= inicio && fechaFact <= fin;
    }) || [];

    // 4. Evaluar morosidad mínima para COMERCIAL y CONDOMINIO
    const mesesMorosidad = facturasValidas.length;
    let eligible = true;
    let mensaje = 'Elegible para decreto.';

    if (facturasValidas.length === 0) {
      eligible = false;
      mensaje = inmuebleData?.decreto_activo
        ? 'El contribuyente ya tiene un decreto activo y sus facturas anteriores ya fueron refinanciadas.'
        : 'El contribuyente no posee facturas pendientes en el período del decreto (Ene 2024 - Sep 2026).';
    } else if (sector.toUpperCase() === 'COMERCIAL' && mesesMorosidad <= 4) {
      eligible = false;
      mensaje = 'Morosidad insuficiente (<= 4 meses). Derivar a convenio ordinario.';
    } else if (sector.toUpperCase() === 'CONDOMINIO' && mesesMorosidad <= 3) {
      eligible = false;
      mensaje = 'Morosidad insuficiente (<= 3 meses). Derivar a convenio ordinario.';
    }

    if (!eligible && action === 'procesar') {
      return NextResponse.json({ error: mensaje, eligible: false }, { status: 400 });
    }

    if (!eligible) {
      return NextResponse.json({ eligible, mensaje, mesesMorosidad, facturasAfectadas: mesesMorosidad });
    }

    // 5. Calcular nueva deuda reliquidada
    let capitalTotal = 0;
    let accesoriosTotal = 0;

    facturasValidas.forEach(f => {
      const montoOriginal = parseFloat(f.monto || '0');
      const mora = 0;
      const multas = 0;
      const intereses = 0;

      capitalTotal += montoOriginal;
      accesoriosTotal += (mora + multas + intereses);
    });

    const rebajaCapital = capitalTotal * (parametros.porcentaje_condonacion_capital / 100);
    const rebajaAccesorios = accesoriosTotal * (parametros.porcentaje_condonacion_accesorios / 100);

    const nuevoCapitalPagar = capitalTotal - rebajaCapital;
    const nuevosAccesoriosPagar = accesoriosTotal - rebajaAccesorios;
    
    // Obtener Tasa BCV actual
    const { data: bcv } = await supabase.from('sistema_config').select('tasa_bcv').single();
    const tasaBcv = bcv ? parseFloat(bcv.tasa_bcv) : 36.5;

    const montoTotalPagarBs = nuevoCapitalPagar + nuevosAccesoriosPagar;
    const montoTotalTcmdvm = tasaBcv > 0 ? (montoTotalPagarBs / tasaBcv) : 0;

    // Si la acción es solo EVALUAR (consulta y simulación):
    if (action === 'evaluar') {
      return NextResponse.json({
        eligible: true,
        mensaje: 'Cálculo de reliquidación exitoso.',
        decreto: parametros.numero_decreto,
        detalles: {
          facturasAfectadas: mesesMorosidad,
          capitalOriginal: capitalTotal,
          accesoriosOriginal: accesoriosTotal,
          rebajaCapital,
          rebajaAccesorios,
          nuevoCapitalPagar,
          nuevosAccesoriosPagar,
          montoTotalPagarBs,
          montoTotalTcmdvm,
          tasaAplicada: tasaBcv,
          porcentaje_inicial_minimo: parametros.porcentaje_inicial_minimo,
          max_cuotas: parametros.max_cuotas
        }
      });
    }

    // Si la acción es PROCESAR (crear el convenio y asentar cambios):
    if (action === 'procesar') {
      const hoyStr = new Date().toISOString().split('T')[0];
      const numConvenio = 'DEC-' + Date.now().toString().slice(-6);
      const contribuyenteName = inmuebleData?.contribuyente || searchId;
      const nCuotas = tipoPago === 'contado' ? '1' : String(cuotas || 1);
      const frecuencia = tipoPago === 'contado' ? 'Única' : 'Mensual';

      // 1. Crear registro en la tabla convenios
      const { data: nuevoConvenio, error: convError } = await supabase
        .from('convenios')
        .insert({
          numero: numConvenio,
          contribuyente: contribuyenteName,
          identidad: searchId,
          monto_total: `${montoTotalPagarBs.toFixed(2)} Bs`,
          cuotas: nCuotas,
          frecuencia: frecuencia,
          inicio: hoyStr,
          estado: 'Al Día',
          documento_url: null
        })
        .select()
        .single();

      if (convError) {
        return NextResponse.json({ error: 'Error al registrar convenio: ' + convError.message }, { status: 500 });
      }

      // 2. Actualizar facturas afectadas a estado 'Refinanciado'
      const facturasIds = facturasValidas.map(f => f.id);
      if (facturasIds.length > 0) {
        const { error: updFacError } = await supabase
          .from('facturas')
          .update({ estado: 'Refinanciado' })
          .in('id', facturasIds);

        if (updFacError) {
          console.error('Error al actualizar facturas a Refinanciado:', updFacError);
        }
      }

      // 3. Actualizar inmueble(s) con convenio_activo y decreto_activo
      await supabase
        .from('inmuebles')
        .update({
          convenio_activo: true,
          decreto_activo: true
        })
        .eq('id', inmueble_id);

      if (searchId) {
        await supabase
          .from('inmuebles')
          .update({
            convenio_activo: true,
            decreto_activo: true
          })
          .eq('identidad', searchId);
      }

      return NextResponse.json({
        success: true,
        mensaje: 'Convenio de decreto procesado exitosamente.',
        convenio: nuevoConvenio || { numero: numConvenio },
        detalles: {
          decreto: parametros.numero_decreto,
          montoTotalPagarBs,
          cuotas: nCuotas,
          tipoPago,
          facturasAfectadas: facturasValidas.length
        }
      });
    }

    return NextResponse.json({ error: 'Acción no válida.' }, { status: 400 });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
