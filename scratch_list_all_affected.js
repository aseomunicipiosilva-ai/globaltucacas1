const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envPath = 'C:/Users/david/Desktop/tucacas/global_green_tucacas/.env.local';
const env = fs.readFileSync(envPath, 'utf8');
let url = '', key = '';
env.split('\n').forEach(line => {
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) url = line.split('=')[1].trim();
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) key = line.split('=')[1].trim();
});

const supabase = createClient(url, key);

async function run() {
  const { data: pagos } = await supabase
    .from('pagos_reportados')
    .select('*')
    .gte('created_at', '2026-11-01T00:00:00Z')
    .order('created_at', { ascending: false });

  console.log(`Buscando facturas en Abonado causadas por conciliaciones desde el 1 de Noviembre...`);

  const afectados = [];

  for (const p of pagos) {
    if (p.estado !== 'Aprobado' && p.estado !== 'Conciliado') continue;

    let det = p.detalles;
    if (typeof det === 'string') {
      try { det = JSON.parse(det); } catch(e) {}
    }
    const refs = det?.recibos || [];
    if (refs.length === 0) continue;

    const { data: facs } = await supabase
      .from('facturas')
      .select('id, referencia, estado, monto, identidad, contribuyente, emision')
      .in('referencia', refs);

    const abonadas = (facs || []).filter(f => f.estado === 'Abonado');
    if (abonadas.length > 0) {
      afectados.push({
        pago: {
          id: p.id,
          identidad: p.identidad,
          referencia: p.referencia,
          monto: p.monto,
          fecha: p.created_at,
          det
        },
        facturasAbonadas: abonadas
      });
    }
  }

  console.log(`\nTOTAL DE CASOS AFECTADOS ENCONTRADOS: ${afectados.length}`);
  afectados.forEach((item, idx) => {
    console.log(`\n[${idx + 1}] CONTRIBUYENTE: ${item.pago.identidad}`);
    console.log(`    Pago Ref: ${item.pago.referencia} | Monto Pago: Bs. ${item.pago.monto}`);
    console.log(`    Recibos que incluyó el pago:`, item.pago.det?.recibos);
    item.facturasAbonadas.forEach(f => {
      console.log(`    -> Factura: ${f.referencia} | Saldo Restante en BD: Bs. ${f.monto} | Emision: ${f.emision} | Contrib: ${f.contribuyente}`);
    });
  });
}
run();

