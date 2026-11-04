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
  const { data: facturasAbonadas } = await supabase
    .from('facturas')
    .select('*')
    .eq('estado', 'Abonado');

  console.log(`Total facturas Abonadas actualmente: ${facturasAbonadas.length}`);

  for (const f of facturasAbonadas) {
    // Buscar pagos aprobados asociados a este recibo
    const { data: pagos } = await supabase
      .from('pagos_reportados')
      .select('*')
      .eq('identidad', f.identidad)
      .in('estado', ['Aprobado', 'Conciliado']);

    const pagosConEsteRecibo = (pagos || []).filter(p => {
      let det = p.detalles;
      if (typeof det === 'string') {
        try { det = JSON.parse(det); } catch(e) {}
      }
      return (det?.recibos || []).includes(f.referencia);
    });

    console.log(`\nFactura: ${f.referencia} | Identidad: ${f.identidad} | Monto BD: ${f.monto}`);
    console.log(`  Pagos asociados (${pagosConEsteRecibo.length}):`);
    pagosConEsteRecibo.forEach(p => {
      let det = p.detalles;
      if (typeof det === 'string') {
        try { det = JSON.parse(det); } catch(e) {}
      }
      console.log(`   -> Pago Ref: ${p.referencia} | Monto Pago: ${p.monto} | es_abono: ${det?.es_abono} | fecha: ${p.created_at}`);
    });
  }
}

run();

