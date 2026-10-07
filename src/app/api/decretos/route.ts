import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Lógica para procesar la validación y reliquidación
export async function POST(request: Request) {
  try {
    const { inmueble_id, sector, identidad } = await request.json();

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

    // 2. Obtener facturas impagas del inmueble
    const searchId = identidad || inmueble_id;
    const { data: facturas, error: facError } = await supabase
      .from('facturas')
      .select('id, mes, anio, monto, estado, mora, multas, intereses')
      .eq('identidad', searchId)
      .neq('estado', 'Pagado')
      .neq('estado', 'Anulado');

    if (facError) {
      return NextResponse.json({ error: 'Error al consultar las facturas del contribuyente.' }, { status: 500 });
    }

    // Filtramos manualmente las facturas dentro de la fecha del decreto
    const facturasValidas = facturas?.filter(f => {
      const fechaFact = new Date(Number(f.anio), Number(f.mes) - 1, 1);
      const inicio = new Date(2024, 0, 1);
      const fin = new Date(2026, 8, 30); // Septiembre 2026
      return fechaFact >= inicio && fechaFact <= fin;
    }) || [];

    // 3. Evaluar morosidad mínima para COMERCIAL y CONDOMINIO
    const mesesMorosidad = facturasValidas.length;
    let eligible = true;
    let mensaje = 'Elegible para decreto.';

    if (sector.toUpperCase() === 'COMERCIAL' && mesesMorosidad <= 4) {
      eligible = false;
      mensaje = 'Morosidad insuficiente (<= 4 meses). Derivar a convenio ordinario.';
    } else if (sector.toUpperCase() === 'CONDOMINIO' && mesesMorosidad <= 3) {
      eligible = false;
      mensaje = 'Morosidad insuficiente (<= 3 meses). Derivar a convenio ordinario.';
    }

    if (!eligible) {
      return NextResponse.json({ eligible, mensaje, mesesMorosidad, facturasAfectadas: mesesMorosidad });
    }

    // 4. Calcular nueva deuda
    let capitalTotal = 0;
    let accesoriosTotal = 0;

    facturasValidas.forEach(f => {
      const montoOriginal = parseFloat(f.monto || '0');
      const mora = parseFloat(f.mora || '0');
      const multas = parseFloat(f.multas || '0');
      const intereses = parseFloat(f.intereses || '0');

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
    const montoTotalTcmdvm = montoTotalPagarBs / tasaBcv;

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
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
