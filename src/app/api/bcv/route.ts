import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Utilizamos la API pública ve.dolarapi.com para obtener la tasa oficial del BCV (EURO - Moneda de Mayor Valor)
    const response = await fetch('https://ve.dolarapi.com/v1/euros/oficial', {
      next: { revalidate: 3600 } // Cachear por 1 hora
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch BCV rate');
    }
    
    const data = await response.json();
    
    return NextResponse.json({
      tasa: data.promedio,
      moneda: data.moneda,
      fecha: data.fechaActualizacion,
      fuente: 'Banco Central de Venezuela (vía DolarAPI)'
    });
  } catch (error) {
    console.error('Error fetching BCV rate:', error);
    // Valor de respaldo (fallback) por si la API falla
    return NextResponse.json({
      tasa: 49.50, // Tasa de respaldo aproximada del Euro
      moneda: 'EUR',
      fecha: new Date().toISOString(),
      fuente: 'Banco Central de Venezuela (Valor de respaldo)'
    });
  }
}
