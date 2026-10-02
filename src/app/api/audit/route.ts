import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { usuario, accion, detalles, categoria } = body;

    const forwardedFor = req.headers.get('x-forwarded-for');
    const realIp = req.headers.get('x-real-ip');
    const ip = forwardedFor ? forwardedFor.split(',')[0].trim() : realIp || 'Desconocida';
    const userAgent = req.headers.get('user-agent') || 'Desconocido';
    const referer = req.headers.get('referer') || '';
    const _modulo = detalles?._modulo || referer;

    const auditData = {
      usuario: usuario || 'SISTEMA',
      accion,
      detalles: {
        ...detalles,
        _categoria: categoria,
        _modulo,
        _ip: ip,
        _userAgent: userAgent,
        _hora: new Date().toLocaleTimeString('es-VE'),
        _fecha: new Date().toLocaleDateString('es-VE'),
        _ts: new Date().toISOString(),
      }
    };

    const { error } = await supabase.from('auditoria').insert([auditData]);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Audit API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
