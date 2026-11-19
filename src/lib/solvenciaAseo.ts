import { supabase } from '@/lib/supabase';

export interface SolvenciaStatus {
  solvente: boolean;
  montoDeuda: number;
  facturasPendientes: number;
  facturas: any[];
  detalles: string;
  // Campos de Condominio
  esCondominio?: boolean;
  condominioNombre?: string;
  condominioRif?: string;
  condominioSolvente?: boolean;
  condominioDeudaBs?: number;
  numeroUnidad?: string;
}

/**
 * Consulta la deuda real de Aseo Urbano para un inmueble y verifica si pertenece a un condominio.
 * 
 * Regla de negocio:
 * 1. Si el inmueble es independiente (Casa / Local fuera de condominio):
 *    Se consulta la solvencia directa de su Cédula/RIF. La deuda del condominio NO lo limita.
 * 2. Si el inmueble está dentro de un Condominio (Apartamento / Local en edificio):
 *    Se detecta a qué Condominio pertenece y se evalúa la solvencia del Condominio Matriz.
 * 
 * @param identidad RIF o Cédula del contribuyente
 * @param opciones Objeto opcional con { numeroUnidad, nombreCondominio, esUnidadCondo }
 */
export async function verificarSolvenciaAseo(
  identidad: string,
  opciones?: {
    numeroUnidad?: string;
    nombreCondominio?: string;
    esUnidadCondo?: boolean;
    inmuebleId?: number;
  }
): Promise<SolvenciaStatus> {
  if (!identidad) {
    return { solvente: true, montoDeuda: 0, facturasPendientes: 0, facturas: [], detalles: 'Sin identidad' };
  }

  const idClean = identidad.replace(/[-.\s]/g, '').toUpperCase();
  const idConGuion = idClean.length > 1 ? idClean.charAt(0) + '-' + idClean.slice(1) : idClean;

  try {
    // 1. Verificar si esta persona tiene una unidad dentro de un condominio registrado
    let condoInfo: any = null;
    let unidadInfo: any = null;

    // Buscar en unidades_condominio por cédula/RIF
    const { data: unidadData } = await supabase
      .from('unidades_condominio')
      .select('id, condominio_id, numero_unidad, propietario, cedula_rif, estado')
      .or(`cedula_rif.eq.${identidad},cedula_rif.eq.${idClean},cedula_rif.eq.${idConGuion}`)
      .limit(1)
      .maybeSingle();

    if (unidadData && unidadData.condominio_id) {
      unidadInfo = unidadData;
      // Obtener datos del condominio matriz
      const { data: condoData } = await supabase
        .from('inmuebles')
        .select('id, cod_cont, contribuyente, identidad, saldo, deuda_mmv')
        .eq('id', unidadData.condominio_id)
        .maybeSingle();

      if (condoData) {
        condoInfo = condoData;
      }
    }

    // 2. Si el usuario está pagando específicamente un bien que NO es la unidad de condominio
    // (Ej: opciones.esUnidadCondo === false), no lo limitamos por el condominio
    const evaluarCondo = opciones?.esUnidadCondo !== false && !!condoInfo;

    // 3. Deuda directa de la persona (por sus casas / locales por fuera de condominio)
    const { data: facturasData, error } = await supabase
      .from('facturas')
      .select('id, referencia, contribuyente, identidad, monto, emision, vencimiento, estado')
      .in('estado', ['Pendiente', 'Por Verificar', 'Abonado'])
      .or(`identidad.eq.${identidad},identidad.eq.${idClean},identidad.eq.${idConGuion}`);

    if (error) {
      console.error('Error consultando solvencia de aseo:', error);
      return { solvente: false, montoDeuda: 0, facturasPendientes: 0, facturas: [], detalles: 'Error consultando base de datos' };
    }

    const facs = facturasData || [];
    let totalDeudaPropia = 0;
    facs.forEach((f: any) => {
      const m = parseFloat(String(f.monto || '0').replace(/[^\d.]/g, '')) || 0;
      totalDeudaPropia += m;
    });

    // 4. Si estamos evaluando la unidad de condominio:
    let condoDeudaBs = 0;
    let condoSolvente = true;
    if (condoInfo) {
      condoDeudaBs = parseFloat(condoInfo.saldo || '0') || 0;
      condoSolvente = condoDeudaBs <= 0;
    }

    const solventePropio = facs.length === 0 || totalDeudaPropia <= 0;
    
    // Si es unidad de condominio, requiere solvencia del condominio o de la unidad
    const solventeFinal = evaluarCondo ? (condoSolvente && solventePropio) : solventePropio;

    let mensajeDetalles = '';
    if (evaluarCondo && condoInfo) {
      mensajeDetalles = condoSolvente
        ? `Unidad ${unidadInfo.numero_unidad} en ${condoInfo.contribuyente}: Condominio Solvente en Aseo Urbano`
        : `Condominio ${condoInfo.contribuyente} posee saldo pendiente en Aseo de Bs. ${condoDeudaBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}`;
    } else {
      mensajeDetalles = solventePropio
        ? 'Inmueble Solvente en Aseo Urbano'
        : `Posee ${facs.length} recibo(s) de Aseo pendientes por Bs. ${totalDeudaPropia.toLocaleString('es-VE', { minimumFractionDigits: 2 })}`;
    }

    return {
      solvente: solventeFinal,
      montoDeuda: parseFloat((evaluarCondo ? (totalDeudaPropia + condoDeudaBs) : totalDeudaPropia).toFixed(2)),
      facturasPendientes: facs.length,
      facturas: facs,
      detalles: mensajeDetalles,
      esCondominio: !!condoInfo,
      condominioNombre: condoInfo?.contribuyente,
      condominioRif: condoInfo?.identidad,
      condominioSolvente: condoSolvente,
      condominioDeudaBs: condoDeudaBs,
      numeroUnidad: unidadInfo?.numero_unidad
    };
  } catch (err: any) {
    console.error('Excepción consultando solvencia aseo:', err);
    return { solvente: false, montoDeuda: 0, facturasPendientes: 0, facturas: [], detalles: err.message };
  }
}
