import { supabase } from '@/lib/supabase';

export interface SolvenciaStatus {
  solvente: boolean;
  montoDeuda: number;
  facturasPendientes: number;
  facturas: any[];
  detalles: string;
}

/**
 * Consulta la deuda real de Aseo Urbano para un contribuyente.
 * @param identidad RIF o Cédula (con o sin guiones)
 * @returns SolvenciaStatus
 */
export async function verificarSolvenciaAseo(identidad: string): Promise<SolvenciaStatus> {
  if (!identidad) {
    return { solvente: true, montoDeuda: 0, facturasPendientes: 0, facturas: [], detalles: 'Sin identidad' };
  }

  const idClean = identidad.replace(/[-.\s]/g, '').toUpperCase();
  const idConGuion = idClean.length > 1 ? idClean.charAt(0) + '-' + idClean.slice(1) : idClean;

  try {
    const { data, error } = await supabase
      .from('facturas')
      .select('id, referencia, contribuyente, identidad, monto, emision, vencimiento, estado')
      .in('estado', ['Pendiente', 'Por Verificar', 'Abonado'])
      .or(`identidad.eq.${identidad},identidad.eq.${idClean},identidad.eq.${idConGuion}`);

    if (error) {
      console.error('Error consultando solvencia de aseo:', error);
      return { solvente: false, montoDeuda: 0, facturasPendientes: 0, facturas: [], detalles: 'Error consultando base de datos' };
    }

    const facs = data || [];
    let totalDeuda = 0;
    facs.forEach((f: any) => {
      const m = parseFloat(String(f.monto || '0').replace(/[^\d.]/g, '')) || 0;
      totalDeuda += m;
    });

    const solvente = facs.length === 0 || totalDeuda <= 0;

    return {
      solvente,
      montoDeuda: parseFloat(totalDeuda.toFixed(2)),
      facturasPendientes: facs.length,
      facturas: facs,
      detalles: solvente 
        ? 'Contribuyente 100% Solvente en Aseo Urbano' 
        : `Posee ${facs.length} recibo(s) de Aseo pendientes por Bs. ${totalDeuda.toLocaleString('es-VE', { minimumFractionDigits: 2 })}`
    };
  } catch (err: any) {
    console.error('Excepción consultando solvencia aseo:', err);
    return { solvente: false, montoDeuda: 0, facturasPendientes: 0, facturas: [], detalles: err.message };
  }
}
