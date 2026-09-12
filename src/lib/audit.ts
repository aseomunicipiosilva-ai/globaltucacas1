import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const logAudit = async (accion: string, detalles: any = {}) => {
  try {
    let usuario = 'SISTEMA';
    if (typeof window !== 'undefined') {
      const u = localStorage.getItem('adminUser');
      const l = localStorage.getItem('adminLetra');
      if (u) {
        usuario = l ? `${l}-${u}` : u;
      }
    }
    await supabase.from('auditoria').insert([{
      usuario,
      accion,
      detalles
    }]);
  } catch (e) {
    console.error('Audit Log Error:', e);
  }
};
