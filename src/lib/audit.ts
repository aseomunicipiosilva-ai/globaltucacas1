export type AuditCategoria =
  | 'SESION'
  | 'COBRO'
  | 'TRANSFERENCIA'
  | 'TASA'
  | 'CONTRIBUYENTE'
  | 'RECIBO'
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
      if (u) usuario = l && u !== 'Administrador' ? `${l}-${u}` : u;
      modulo = window.location.pathname;
    }

    // Si estamos en cliente, enviamos a la API para atrapar IP
    if (typeof window !== 'undefined') {
      fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usuario,
          accion,
          categoria,
          detalles: { ...detalles, _modulo: modulo }
        })
      }).catch(e => console.error('Error enviando auditoria', e));
    } else {
      // Fallback para servidor (si se llama directamente en un script/api viejo)
      // Idealmente, las APIs llaman a Supabase directo
      const { createClient } = require('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      
      await supabase.from('auditoria').insert([{
        usuario,
        accion,
        detalles: {
          ...detalles,
          _categoria: categoria,
          _modulo: modulo,
          _hora: new Date().toLocaleTimeString('es-VE'),
          _fecha: new Date().toLocaleDateString('es-VE'),
          _ts: new Date().toISOString(),
        }
      }]);
    }
  } catch (e) {
    console.error('Audit Log Error:', e);
  }
};
