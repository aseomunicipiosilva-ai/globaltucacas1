import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET() {
  try {
    const CHUNK_SIZE = 500;
    let allRows: any[] = [];
    let from = 0;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from('pagos_reportados')
        .select('id, identidad, monto, banco, referencia, tipo, estado, created_at, detalles')
        .range(from, from + CHUNK_SIZE - 1);

      if (error || !data || data.length === 0) break;
      allRows = allRows.concat(data);
      if (data.length < CHUNK_SIZE) hasMore = false;
      else from += CHUNK_SIZE;
    }

    // Ordenar cronológicamente descendente
    allRows.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return NextResponse.json({ success: true, pagos: allRows, total: allRows.length });
  } catch (error: any) {
    console.error('Error in /api/pagos-reportados:', error);
    return NextResponse.json({ success: false, error: error.message || 'Error fetching pagos' }, { status: 500 });
  }
}
