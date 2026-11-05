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

  console.log(`Analizando ${pagos.length} pagos desde 01-11-2026...`);

  for (const p of pagos) {
    let det = p.detalles;
    if (typeof det === 'string') {
      try { det = JSON.parse(det); } catch (e) { }
    }
    const refs = det?.recibos || [];
    if (refs.length === 0) continue;

    const { data: facs } = await supabase
      .from('facturas')
      .select('referencia, estado, monto, identidad, contribuyente')
      .in('referencia', refs);

    const abonadas = (facs || []).filter(f => f.estado === 'Abonado');
    if (abonadas.length > 0) {
      console.log(`\n======================================================`);
      console.log(`PAGO ID: ${p.id} | Identidad: ${p.identidad} | Banco: ${p.banco} | Ref: ${p.referencia}`);
      console.log(`Monto Pago: ${p.monto} | Estado Pago: ${p.estado} | es_abono en det: ${det?.es_abono}`);
      console.log(`Recibos en pago (${refs.length}):`, refs);
      console.log(`Facturas en estado ABONADO asociadas a este pago:`);
      abonadas.forEach(a => console.log(`  -> ${a.referencia} | Monto en BD: ${a.monto} | Contrib: ${a.contribuyente}`));
    }
  }
}
run();

