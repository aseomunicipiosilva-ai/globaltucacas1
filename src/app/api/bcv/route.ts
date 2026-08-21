import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import * as cheerio from 'cheerio';
import https from 'https';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sync = searchParams.get('sync') === 'true';

  if (sync) {
    // @ts-expect-error - Next.js internal type mismatch
    revalidateTag('bcv-rate');
  }

  try {
    // 1. Scraping directo de bcv.org.ve (Más seguro dado que las APIs están caídas o devolviendo pesos argentinos)
    const agent = new https.Agent({ rejectUnauthorized: false });
    const response = await fetch('https://www.bcv.org.ve/', { 
      // @ts-ignore
      agent,
      cache: 'no-store',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
      }
    });
    
    if (!response.ok) throw new Error('BCV Website unreachable');
    const html = await response.text();
    const $ = cheerio.load(html);
    
    let euroText = $('#euro strong').text().trim().replace(',', '.');
    let usdText = $('#dolar strong').text().trim().replace(',', '.');
    
    let euroVal = parseFloat(euroText);
    let usdVal = parseFloat(usdText);

    if (isNaN(euroVal) || isNaN(usdVal)) {
      throw new Error('Could not parse BCV HTML correctly');
    }

    const tcmmv = Math.max(usdVal, euroVal);

    return NextResponse.json({
      success: true,
      euro: euroVal,
      usd: usdVal,
      tcmmv: tcmmv,
      timestamp: new Date().toISOString(),
      source: 'bcv-scraped'
    });

  } catch (error: any) {
    console.error('Error scraping BCV, falling back:', error.message);
    
    // Fallback 1: DolarAPI (Solo si dejó de devolver 911 que es el peso argentino)
    try {
      const [usdRes, eurRes] = await Promise.all([
        fetch('https://ve.dolarapi.com/v1/dolares/oficial', { cache: 'no-store' }),
        fetch('https://ve.dolarapi.com/v1/euros/oficial', { cache: 'no-store' })
      ]);
      const usdData = await usdRes.json();
      const eurData = await eurRes.json();
      
      const usdVal = usdData.promedio;
      const euroVal = eurData.promedio;
      
      // Safety check: if Euro is > 200, it's definitely the Argentine Peso bug.
      if (euroVal > 200) {
         throw new Error('DolarAPI is returning Argentine Pesos instead of Bolivares (Bug)');
      }

      const tcmmv = Math.max(usdVal, euroVal);
      return NextResponse.json({
        success: true,
        euro: euroVal,
        usd: usdVal,
        tcmmv: tcmmv,
        timestamp: eurData.fechaActualizacion || new Date().toISOString(),
        source: 'dolarapi-cached'
      });
    } catch (e2: any) {
       console.error('DolarAPI failed:', e2.message);
       // Return generic failure if all fails
       return NextResponse.json({
          success: false,
          tcmmv: 0,
          error: "No se pudo contactar a la API de tasas de manera confiable"
       }, { status: 500 });
    }
  }
}
