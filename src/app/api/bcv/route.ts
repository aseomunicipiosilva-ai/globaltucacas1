import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  
  const { searchParams } = new URL(request.url);
  const sync = searchParams.get('sync') === 'true';

  try {
    if (!sync) {
      // Intentar obtener la última tasa sincronizada de la base de datos
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('action', 'SYNC_BCV')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
        
      if (!error && data && data.details) {
        const rateInfo = JSON.parse(data.details);
        return NextResponse.json({
          success: true,
          euro: rateInfo.euro,
          usd: rateInfo.usd,
          tcmmv: rateInfo.tcmmv,
          timestamp: data.created_at,
          source: 'db'
        });
      }
      // Si no hay tasa en BD, forzamos un sync abajo
    }

    // Lógica de Sync: Consultar a la API de DolarAPI (que extrae del BCV)
    const [usdRes, eurRes] = await Promise.all([
      fetch('https://ve.dolarapi.com/v1/dolares/oficial'),
      fetch('https://ve.dolarapi.com/v1/euros/oficial')
    ]);

    if (!usdRes.ok || !eurRes.ok) {
      throw new Error('Error HTTP obteniendo tasas de la API');
    }

    const usdData = await usdRes.json();
    const eurData = await eurRes.json();

    const usdVal = usdData.promedio;
    const euroVal = eurData.promedio;
    const tcmmv = Math.max(usdVal, euroVal);

    const rateData = {
      euro: euroVal,
      usd: usdVal,
      tcmmv: tcmmv,
      timestamp: new Date().toISOString(),
      source: 'dolarapi-oficial'
    };

    // Guardar en base de datos si es sync
    if (sync) {
      await supabase.from('audit_logs').insert([
        {
          user_id: 'system',
          action: 'SYNC_BCV',
          ip_address: '127.0.0.1',
          details: JSON.stringify(rateData),
          created_at: rateData.timestamp
        }
      ]);
    }

    return NextResponse.json({
      success: true,
      ...rateData
    });

  } catch (error: any) {
    console.error('Error fetching BCV:', error.message);
    return NextResponse.json({
      success: false,
      error: 'No se pudo contactar a la API de tasas',
      tcmmv: 0
    }, { status: 500 });
  }
}
