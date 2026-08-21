import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';

export async function GET(request: Request) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  
  const { searchParams } = new URL(request.url);
  const sync = searchParams.get('sync') === 'true';

  if (sync) {
    // Limpiamos la caché de Vercel para forzar una nueva lectura
    // @ts-expect-error - Next.js internal type mismatch
    revalidateTag('bcv-rate');
  }

  try {
    const [usdRes, eurRes] = await Promise.all([
      fetch('https://ve.dolarapi.com/v1/dolares/oficial', { next: { tags: ['bcv-rate'] } }),
      fetch('https://ve.dolarapi.com/v1/euros/oficial', { next: { tags: ['bcv-rate'] } })
    ]);

    if (!usdRes.ok || !eurRes.ok) {
      throw new Error('DolarAPI falló');
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
      timestamp: eurData.fechaActualizacion || new Date().toISOString(),
      source: 'dolarapi-cached'
    };

    return NextResponse.json({
      success: true,
      ...rateData
    });

  } catch (error: any) {
    console.error('Error fetching from DolarAPI, trying fallback:', error.message);
    try {
      // Fallback a pydolarvenezuela
      const res = await fetch('https://pydolarvenezuela-api.vercel.app/api/v1/dollar/page?page=bcv', { next: { tags: ['bcv-rate'] } });
      if (!res.ok) throw new Error('Fallback API falló');
      
      const data = await res.json();
      const usdVal = data.monitors.usd.price;
      const euroVal = data.monitors.eur.price;
      const tcmmv = Math.max(usdVal, euroVal);
      
      return NextResponse.json({
        success: true,
        euro: euroVal,
        usd: usdVal,
        tcmmv: tcmmv,
        timestamp: data.datetime?.date || new Date().toISOString(),
        source: 'pydolar-fallback'
      });
    } catch (fallbackError: any) {
      console.error('All APIs failed:', fallbackError.message);
      return NextResponse.json({
        success: false,
        error: 'No se pudo contactar a las APIs de tasas',
        tcmmv: 0
      }, { status: 500 });
    }
  }
}
