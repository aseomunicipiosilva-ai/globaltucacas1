import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Lógica para procesar la validación, reliquidación, pago y anulación de decretos/convenios
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
      cuotas = 1,
      usuario = 'Administrador',
      registrarPago = false,
      datosPago = null,
      porcentaje_condonacion = 50
    } = body;

    // Obtener datos del inmueble
    let inmuebleData: any = null;
    if (inmueble_id) {
      const { data } = await supabase
        .from('inmuebles')
        .select('*')
        .eq('id', inmueble_id)
        .maybeSingle();
      inmuebleData = data;
    }

    const searchId = identidad || inmuebleData?.identidad || inmueble_id;

    // ==========================================
    // ACCION: ANULAR CONVENIO / DECRETO
    // ==========================================
    if (action === 'anular') {
      if (!searchId) {
        return NextResponse.json({ error: 'Falta identidad o inmueble para anular.' }, { status: 400 });
      }

      // 1. Revertir facturas refinanciadas a 'Pendiente' (por inmueble específico si se proporciona)
      let facQuery = supabase
        .from('facturas')
        .update({ estado: 'Pendiente' })
        .eq('identidad', searchId)
        .eq('estado', 'Refinanciado');

      if (inmuebleData) {
        const codRef = inmuebleData.inmueble || inmuebleData.cod_cont;
        if (codRef) {
          facQuery = facQuery.ilike('referencia', `%-${codRef}-%`);
        }
      }

      const { data: revFacs, error: revErr } = await facQuery.select('id, referencia');

      if (revErr) {
        console.error('Error al revertir facturas:', revErr);
      }

      // 2. Revertir banderas en inmuebles
      if (inmueble_id) {
        await supabase
          .from('inmuebles')
          .update({ convenio_activo: false, decreto_activo: false })
          .eq('id', inmueble_id);
      } else {
        await supabase
          .from('inmuebles')
          .update({ convenio_activo: false, decreto_activo: false })
          .eq('identidad', searchId);
      }

      // 3. Eliminar convenio(s) generados por decreto
      let convDelQuery = supabase
        .from('convenios')
        .delete()
        .eq('identidad', searchId)
        .ilike('numero', 'DEC-%');

      if (inmuebleData) {
        const codRef = inmuebleData.inmueble || inmuebleData.cod_cont;
        if (codRef) {
          convDelQuery = convDelQuery.ilike('documento_url', `%"codigo_inmueble":"${codRef}"%`);
        }
      }

      let { data: convDel } = await convDelQuery.select();
      if (!convDel || convDel.length === 0) {
        // Fallback: delete by identidad if no specific match
        const { data: convFallback } = await supabase
          .from('convenios')
          .delete()
          .eq('identidad', searchId)
          .ilike('numero', 'DEC-%')
          .select();
        convDel = convFallback;
      }

      // 3.1 Anular inmediatamente cualquier pago_reportado asociado al decreto anulado
      // para que no sume en reportes diarios, cortes, libro de ventas ni inicio
      const convNums = (convDel || []).map((c: any) => c.numero).filter(Boolean);
      for (const num of convNums) {
        await supabase
          .from('pagos_reportados')
          .update({ estado: 'Anulado' })
          .ilike('detalles->>convenio_numero', num);
        await supabase
          .from('pagos_reportados')
          .update({ estado: 'Anulado' })
          .eq('referencia', num);
      }
      // Anular pagos asociados a la identidad con concepto de Decreto
      const { data: pagosDecreto } = await supabase
        .from('pagos_reportados')
        .select('id, detalles')
        .eq('identidad', searchId)
        .not('estado', 'in', '(Anulado,Reversado,Condonado,Rechazado)');

      for (const p of pagosDecreto || []) {
        let det: any = {};
        try { det = typeof p.detalles === 'string' ? JSON.parse(p.detalles) : (p.detalles || {}); } catch(e){}
        if (det.decreto || (det.concepto && det.concepto.includes('Decreto')) || (det.convenio_numero && det.convenio_numero.startsWith('DEC-'))) {
          await supabase.from('pagos_reportados').update({ estado: 'Anulado' }).eq('id', p.id);
        }
      }

      // 4. Registrar en auditoría
      await supabase.from('auditoria').insert({
        usuario: usuario || 'Administrador',
        accion: 'Anulación de Convenio (Decreto)',
        detalles: {
          _categoria: 'CONVENIO',
          _modulo: '/admin/decretos',
          _fecha: new Date().toLocaleDateString('es-VE'),
          _hora: new Date().toLocaleTimeString('es-VE'),
          identidad: searchId,
          contribuyente: inmuebleData?.contribuyente || searchId,
          facturas_revertidas: revFacs ? revFacs.length : 0,
          usuario_responsable: usuario || 'Administrador'
        }
      });

      return NextResponse.json({
        success: true,
        mensaje: 'Convenio y decreto anulados exitosamente. Las facturas han sido restauradas a estado Pendiente.',
        facturasRevertidas: revFacs ? revFacs.length : 0
      });
    }

    // ==========================================
    // NORMALIZACION DE SECTOR
    // ==========================================
    if (sector && sector.toUpperCase().includes('TIPO C')) { sector = 'CONDOMINIO'; }
    else if (sector && sector.toUpperCase() === 'TIPO A') { sector = 'COMERCIAL'; }
    else if (sector && sector.toUpperCase() === 'TIPO B') { sector = 'RESIDENCIAL'; }

    if (!inmueble_id || !sector) {
      return NextResponse.json({ error: 'Faltan parámetros requeridos.' }, { status: 400 });
    }

    // 1. Obtener parámetros del decreto según sector
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

    // 2. Obtener facturas impagas del contribuyente (filtrando por inmueble específico si aplica)
    let facSelect = supabase
      .from('facturas')
      .select('id, referencia, emision, monto, estado')
      .eq('identidad', searchId)
      .neq('estado', 'Pagado')
      .neq('estado', 'Anulado')
      .neq('estado', 'Refinanciado');

    if (inmuebleData) {
      const codRef = inmuebleData.inmueble || inmuebleData.cod_cont;
      if (codRef) {
        facSelect = facSelect.ilike('referencia', `%-${codRef}-%`);
      }
    }

    const { data: facturas, error: facError } = await facSelect;

    if (facError) {
      return NextResponse.json({ error: 'Error al consultar las facturas del contribuyente. ' + facError.message }, { status: 500 });
    }

    // Filtramos facturas dentro de fecha del decreto (Enero 2024 - Septiembre 2026)
    const facturasValidas = facturas?.filter(f => {
      if (!f.emision) return false;
      const fechaFact = new Date(f.emision);
      const inicio = new Date(2024, 0, 1);
      const fin = new Date(2026, 8, 30);
      return fechaFact >= inicio && fechaFact <= fin;
    }) || [];

    const mesesMorosidad = facturasValidas.length;
    let eligible = true;
    let mensaje = 'Elegible para decreto.';

    if (facturasValidas.length === 0) {
      eligible = false;
      mensaje = inmuebleData?.decreto_activo
        ? 'El contribuyente ya tiene un decreto activo y sus facturas anteriores ya fueron refinanciadas.'
        : 'El contribuyente no posee facturas pendientes en el período del decreto (Ene 2024 - Sep 2026).';
    } else if (sector.toUpperCase() === 'COMERCIAL' && mesesMorosidad < 4) {
      eligible = false;
      mensaje = 'Morosidad insuficiente (< 4 meses). Derivar a convenio ordinario.';
    } else if (sector.toUpperCase() === 'CONDOMINIO' && mesesMorosidad < 3) {
      eligible = false;
      mensaje = 'Morosidad insuficiente (< 3 meses). Derivar a convenio ordinario.';
    }

    if (!eligible && action === 'procesar') {
      return NextResponse.json({ error: mensaje, eligible: false }, { status: 400 });
    }

    if (!eligible) {
      return NextResponse.json({ eligible, mensaje, mesesMorosidad, facturasAfectadas: mesesMorosidad });
    }

    // 3. Calcular deuda reliquidada
    // Consultar tasa BCV y ajustes mensuales registrados
    const { data: bcvData } = await supabase.from('sistema_config').select('tasa_bcv').single();
    const currentRateBcv = bcvData ? parseFloat(bcvData.tasa_bcv) : 36.5;

    const { data: cfgAjustes } = await supabase.from('sistema_config').select('valor').eq('id', 'facturas_ajustes_meses').maybeSingle();
    const ajustesMeses = cfgAjustes?.valor || {};

    let capitalTotal = 0;
    let accesoriosTotal = 0;

    facturasValidas.forEach(f => {
      let montoOriginal = parseFloat(f.monto || '0');
      // Si la factura tiene un ajuste mensual específico (ej. Inmueble desocupado)
      if (ajustesMeses[f.referencia]?.monto) {
        montoOriginal = parseFloat(ajustesMeses[f.referencia].monto);
      } else if (inmuebleData?.mmv_mes && f.referencia?.startsWith('CM-') && currentRateBcv > 0) {
        // Si el metraje / nivel del inmueble fue modificado, usar el mmv_mes actual del inmueble
        const cantInm = parseFloat(inmuebleData.cant_inmuebles || 1);
        const mmvInm = parseFloat(inmuebleData.mmv_mes || 0);
        if (mmvInm > 0) {
          montoOriginal = parseFloat((cantInm * mmvInm * currentRateBcv).toFixed(2));
        }
      }
      capitalTotal += montoOriginal;
    });

    const pctCapital = Number(porcentaje_condonacion) === 100 ? 100 : (parametros.porcentaje_condonacion_capital || 50);
    const rebajaCapital = capitalTotal * (pctCapital / 100);
    const rebajaAccesorios = accesoriosTotal * (parametros.porcentaje_condonacion_accesorios / 100);

    const nuevoCapitalPagar = Math.max(0, capitalTotal - rebajaCapital);
    const nuevosAccesoriosPagar = accesoriosTotal - rebajaAccesorios;
    
    const { data: bcv } = await supabase.from('sistema_config').select('tasa_bcv').single();
    const tasaBcv = bcv ? parseFloat(bcv.tasa_bcv) : 36.5;

    const montoTotalPagarBs = nuevoCapitalPagar + nuevosAccesoriosPagar;
    const montoTotalTcmdvm = tasaBcv > 0 ? (montoTotalPagarBs / tasaBcv) : 0;

    // ==========================================
    // ACCION: EVALUAR (SOLO CONSULTA)
    // ==========================================
    if (action === 'evaluar') {
      return NextResponse.json({
        eligible: true,
        mensaje: 'Cálculo de reliquidación exitoso.',
        decreto: parametros.numero_decreto,
        detalles: {
          facturasAfectadas: mesesMorosidad,
          capitalOriginal: capitalTotal,
          accesoriosOriginal: accesoriosTotal,
          porcentaje_condonacion: pctCapital,
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

    // ==========================================
    // ACCION: PROCESAR CONVENIO (+ PAGO OPCIONAL)
    // ==========================================
    if (action === 'procesar') {
      const hoyStr = new Date().toISOString().split('T')[0];
      const numConvenio = 'DEC-' + Date.now().toString().slice(-6);
      const contribuyenteName = inmuebleData?.contribuyente || searchId;
      const nCuotas = tipoPago === 'contado' ? '1' : String(cuotas || 1);
      const frecuencia = tipoPago === 'contado' ? 'Única' : 'Mensual';

      // Determinar estado inicial del convenio:
      // Si porcentaje es 100% -> 'Solvente' inmediatamente (exoneración total de capital y accesorios)
      // Si es pago de contado y se registra pago inmediato (Debito, Punto de Venta, Efectivo) -> 'Solvente'
      // Si es pago de contado y se registra transferencia -> 'Por Verificar'
      // Si es fraccionado o no se registró pago -> 'Al Día'
      const esCondonacionTotal = pctCapital === 100;
      let estadoConvenio = esCondonacionTotal ? 'Solvente' : 'Al Día';
      const esContado = tipoPago === 'contado' || esCondonacionTotal;
      let isAprobado = esCondonacionTotal ? true : false;

      if (esContado && registrarPago && datosPago && !esCondonacionTotal) {
        const metodo = datosPago.metodo || 'Punto de Venta / Débito';
        isAprobado = ['Debito', 'Punto de Venta', 'Punto de Venta / Débito', 'Efectivo'].includes(metodo);
        estadoConvenio = isAprobado ? 'Solvente' : 'Por Verificar';
      }

      // Calcular período del decreto a partir de facturas refinanciadas
      const MESES_ES = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];
      const emisionFechas = facturasValidas.map(f => f.emision).filter(Boolean).sort();
      let periodoDecreto = 'ENERO 2024 A SEPTIEMBRE 2026';
      if (emisionFechas.length > 0) {
        const fmtM = (str: string) => {
          const p = str.split('-');
          return p.length >= 2 ? `${MESES_ES[parseInt(p[1]) - 1]} ${p[0]}` : str;
        };
        const fIni = fmtM(emisionFechas[0]);
        const fFin = fmtM(emisionFechas[emisionFechas.length - 1]);
        periodoDecreto = fIni === fFin ? fIni : `${fIni} A ${fFin}`;
      }

      // Guardar metadata del convenio (pago inicial acordado, cuotas, e inmueble específico)
      const codInmRef = inmuebleData?.inmueble || inmuebleData?.cod_cont || '';
      const convenioMeta = {
        inmueble_id: inmuebleData?.id || inmueble_id || null,
        codigo_inmueble: codInmRef,
        direccion_inmueble: inmuebleData?.direccion || '',
        clasificacion_inmueble: inmuebleData?.clasificacion || sector,
        pago_inicial: tipoPago === 'contado' ? montoTotalPagarBs : (parseFloat(String(pagoInicial)) || 0),
        cuotas: nCuotas,
        tipo_pago: tipoPago,
        inicio: hoyStr,
        decreto: parametros.numero_decreto,
        porcentaje_condonacion: pctCapital,
        capital_original: capitalTotal,
        rebaja_capital: rebajaCapital,
        periodo_decreto: periodoDecreto,
        meses_amparados: facturasValidas.length
      };

      // 1. Crear registro en tabla convenios
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
          estado: estadoConvenio,
          documento_url: 'meta:' + JSON.stringify(convenioMeta)
        })
        .select()
        .single();

      if (convError) {
        return NextResponse.json({ error: 'Error al registrar convenio: ' + convError.message }, { status: 500 });
      }

      // 2. Si se reportó pago inmediato, registrar en pagos_reportados
      let pagoRegistradoData: any = null;
      if (registrarPago && datosPago) {
        const montoPago = parseFloat(datosPago.monto) || (tipoPago === 'contado' ? montoTotalPagarBs : pagoInicial);
        const metodo = datosPago.metodo || 'Punto de Venta / Débito';
        const refPago = datosPago.referencia || ('CONV-' + Date.now().toString().slice(-6));
        const bancoPago = datosPago.banco || (metodo.includes('Transferencia') ? 'Banco' : 'Caja');
        const fechaTransaccion = datosPago.fecha || hoyStr;

        const isAprobado = ['Debito', 'Punto de Venta', 'Punto de Venta / Débito', 'Efectivo'].includes(metodo);

        const { data: regPago, error: pError } = await supabase
          .from('pagos_reportados')
          .insert({
            identidad: searchId,
            monto: String(montoPago.toFixed(2)),
            banco: bancoPago,
            referencia: refPago,
            tipo: metodo.includes('Transferencia') ? 'Transferencia' : (metodo.includes('Móvil') || metodo.includes('Movil') ? 'Pago Movil' : (metodo.includes('Efectivo') ? 'Efectivo' : 'Debito')),
            estado: isAprobado ? 'Aprobado' : 'Por Verificar',
            detalles: {
              convenio_numero: numConvenio,
              decreto: parametros.numero_decreto,
              periodo_decreto: periodoDecreto,
              concepto: tipoPago === 'contado' 
                ? `Pago Único de Contado (Decreto N° ${parametros.numero_decreto}) - Período: ${periodoDecreto} - Convenio ${numConvenio}`
                : `Pago Inicial de Convenio (Decreto N° ${parametros.numero_decreto}) - Período: ${periodoDecreto} - Convenio ${numConvenio}`,
              tipo_pago: tipoPago,
              cuota_pagada: tipoPago === 'contado' ? 'Total' : 'Inicial',
              cajero: usuario || 'Administrador',
              fecha_transaccion: fechaTransaccion,
              monto_conciliado: montoPago.toFixed(2),
              recibos: [],
              cuotas: tipoPago === 'contado' ? [] : [{ convId: String(nuevoConvenio?.id || ''), numeroConv: numConvenio, cuotaId: 0 }]
            }
          })
          .select()
          .maybeSingle();

        if (pError) {
          console.error('Error al registrar pago del convenio:', pError);
        } else {
          pagoRegistradoData = regPago;
        }
      }

      // 3. Actualizar facturas afectadas a 'Refinanciado'
      const facturasIds = facturasValidas.map(f => f.id);
      if (facturasIds.length > 0) {
        await supabase
          .from('facturas')
          .update({ estado: 'Refinanciado' })
          .in('id', facturasIds);
      }

      // 4. Actualizar inmueble con convenio_activo y decreto_activo de forma individual
      // Solo el inmueble procesado se marca con decreto_activo, permitiendo que otros inmuebles del mismo RIF se procesen por separado
      const esLiquidadoContado = esCondonacionTotal || (esContado && registrarPago && isAprobado);
      if (inmueble_id) {
        await supabase
          .from('inmuebles')
          .update({
            convenio_activo: !esLiquidadoContado,
            decreto_activo: true
          })
          .eq('id', inmueble_id);
      } else if (searchId) {
        await supabase
          .from('inmuebles')
          .update({
            convenio_activo: !esLiquidadoContado,
            decreto_activo: true
          })
          .eq('identidad', searchId);
      }

      // 5. Registrar en tabla auditoria quién aplicó el convenio
      await supabase.from('auditoria').insert({
        usuario: usuario || 'Administrador',
        accion: 'Creación de Convenio (Decreto)',
        detalles: {
          _categoria: 'CONVENIO',
          _modulo: '/admin/decretos',
          _fecha: new Date().toLocaleDateString('es-VE'),
          _hora: new Date().toLocaleTimeString('es-VE'),
          convenio_numero: numConvenio,
          contribuyente: contribuyenteName,
          identidad: searchId,
          decreto: parametros.numero_decreto,
          monto_total: montoTotalPagarBs,
          tipo_pago: tipoPago,
          pago_inicial: pagoInicial,
          cuotas: nCuotas,
          usuario_aplicado: usuario || 'Administrador',
          pago_reportado: pagoRegistradoData ? pagoRegistradoData.monto : null,
          referencia_pago: pagoRegistradoData ? pagoRegistradoData.referencia : null
        }
      });

      return NextResponse.json({
        success: true,
        mensaje: 'Convenio de decreto procesado exitosamente.',
        convenio: nuevoConvenio || { numero: numConvenio },
        usuarioAplicado: usuario || 'Administrador',
        pagoRegistrado: pagoRegistradoData,
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
