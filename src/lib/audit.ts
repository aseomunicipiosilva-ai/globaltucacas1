import { supabase } from './supabase';

export interface AuditLog {
  user_id: string;
  action: string;
  ip_address: string;
  details?: string;
}

/**
 * Registra una acción en la tabla de auditoría
 */
export async function logAudit(data: AuditLog) {
  try {
    const { error } = await supabase
      .from('audit_logs')
      .insert([
        {
          user_id: data.user_id,
          action: data.action,
          ip_address: data.ip_address,
          details: data.details,
          created_at: new Date().toISOString(),
        }
      ]);

    if (error) {
      console.error('Error logging audit:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Unexpected error logging audit:', err);
    return false;
  }
}
