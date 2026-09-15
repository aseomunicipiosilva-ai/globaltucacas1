import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export type AuditCategoria =
  | 'SESION'
  | 'COBRO'
  | 'TRANSFERENCIA'
  | 'TASA'
  | 'CONTRIBUYENTE'
  | 'FACTURA'
  | 'REPORTE'
  | 'CONFIGURACION'
  | 'CONVENIO'
  | 'SISTEMA';

export const logAudit = async (
  accion: string,
  detalles: Record<string, any> = {},
  categoria: AuditCategoria = 'SISTEMA'
) => {
  try {
    let usuario = 'SISTEMA';
    let modulo = '';
    if (typeof window !== 'undefined') {
      const u = localStorage.getItem('adminUser');
      const l = localStorage.getItem('adminLetra');
      if (u) usuario = l ? `${l}-${u}` : u;
      modulo = window.location.pathname;
    }
    await supabase.from('auditoria').insert([{
      usuario,
      accion,
      categoria,
      modulo,
      detalles: {
        ...detalles,
        _hora: new Date().toLocaleTimeString('es-VE'),
        _fecha: new Date().toLocaleDateString('es-VE'),
        _ts: new Date().toISOString(),
      }
    }]);
  } catch (e) {
    console.error('Audit Log Error:', e);
  }
};
