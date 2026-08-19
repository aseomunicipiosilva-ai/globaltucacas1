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

    // Lógica de Sync: Consultar al BCV
    const response = await fetch('https://www.bcv.org.ve/', {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
    });

    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Extraer Euro y USD
    const euroText = $('#euro strong').text().trim().replace(',', '.');
    const usdText = $('#dolar strong').text().trim().replace(',', '.');

    let euroVal = parseFloat(euroText);
    let usdVal = parseFloat(usdText);

    if (isNaN(euroVal) && isNaN(usdVal)) {
      throw new Error('No se pudo parsear los valores del BCV');
    }

    const tcmmv = isNaN(euroVal) ? usdVal : euroVal;

    const rateData = {
      euro: euroVal,
      usd: usdVal,
      tcmmv: tcmmv,
      timestamp: new Date().toISOString(),
      source: 'bcv-live'
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
    
    // Fallback public APIs si falla la directa
    try {
      const fallbackRes = await fetch('https://ve.dolarapi.com/v1/dolares/euro');
      if (fallbackRes.ok) {
        const data = await fallbackRes.json();
        const fallbackRate = {
          euro: data.promedio,
          usd: data.promedio, // approximation
          tcmmv: data.promedio,
          timestamp: new Date().toISOString(),
          source: 'dolarapi'
        };
        
        if (sync) {
          await supabase.from('audit_logs').insert([
            {
              user_id: 'system',
              action: 'SYNC_BCV',
              ip_address: '127.0.0.1',
              details: JSON.stringify(fallbackRate),
              created_at: fallbackRate.timestamp
            }
          ]);
        }
        
        return NextResponse.json({
          success: true,
          ...fallbackRate
        });
      }
    } catch(e) {}

    return NextResponse.json({
      success: false,
      error: 'No se pudo contactar al BCV ni guardar la tasa',
      tcmmv: 0
    }, { status: 500 });
  }
}
