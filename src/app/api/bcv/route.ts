import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export const dynamic = 'force-dynamic';

export async function GET() {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  try {
    const response = await fetch('https://www.bcv.org.ve/', {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      // cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Extraer Euro
    const euroText = $('#euro strong').text().trim().replace(',', '.');
    const usdText = $('#dolar strong').text().trim().replace(',', '.');

    const euroVal = parseFloat(euroText);
    const usdVal = parseFloat(usdText);

    if (isNaN(euroVal) && isNaN(usdVal)) {
      throw new Error('No se pudo parsear los valores');
    }

    // La TCMMV usualmente es el Euro
    const tcmmv = isNaN(euroVal) ? usdVal : euroVal;

    return NextResponse.json({
      success: true,
      euro: euroVal,
      usd: usdVal,
      tcmmv: tcmmv,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Error fetching BCV:', error.message);
    
    // Fallback public APIs si falla la directa
    try {
      const fallbackRes = await fetch('https://ve.dolarapi.com/v1/dolares/euro');
      if (fallbackRes.ok) {
        const data = await fallbackRes.json();
        return NextResponse.json({
          success: true,
          euro: data.promedio,
          usd: data.promedio, // approximation
          tcmmv: data.promedio,
          source: 'dolarapi'
        });
      }
    } catch(e) {}

    return NextResponse.json({
      success: false,
      error: 'No se pudo contactar al BCV',
      tcmmv: 0
    }, { status: 500 });
  }
}
