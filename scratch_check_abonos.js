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
  console.log('--- REVISANDO CONTRIBUYENTE 409937437 ---');
  const { data: users } = await supabase
    .from('inmuebles')
    .select('*')
    .or('identidad.ilike.%409937437%,cod_cont.ilike.%409937437%');
  console.log('Inmuebles 409937437:', users);

  const { data: pagos409 } = await supabase
    .from('pagos_reportados')
    .select('*')
    .ilike('identidad', '%409937437%')
    .order('created_at', { ascending: false });
  console.log('Pagos 409937437:', pagos409);

  const { data: facturas409 } = await supabase
    .from('facturas')
    .select('*')
    .ilike('identidad', '%409937437%')
    .order('created_at', { ascending: false });
  console.log('Facturas 409937437:', facturas409);

  console.log('\n--- REVISANDO PAGOS DE AYER (2026-11-03) A NIVEL GENERAL ---');
  const { data: pagosAyer } = await supabase
    .from('pagos_reportados')
    .select('*')
    .gte('created_at', '2026-11-03T00:00:00Z')
    .order('created_at', { ascending: false });
  console.log(`Total pagos creados ayer/hoy: ${pagosAyer?.length}`);
  if (pagosAyer) {
    pagosAyer.slice(0, 15).forEach(p => {
      let det = p.detalles;
      if (typeof det === 'string') {
        try { det = JSON.parse(det); } catch (e) {}
      }
      console.log(`- Pago ID: ${p.id} | Identidad: ${p.identidad} | Monto: ${p.monto} | Estado: ${p.estado} | es_abono: ${det?.es_abono} | Recibos: ${JSON.stringify(det?.recibos)}`);
    });
  }

  console.log('\n--- FACTURAS EN ESTADO ABONADO CREADAS O MODIFICADAS RECIENTEMENTE ---');
  const { data: facsAbonadas } = await supabase
    .from('facturas')
    .select('*')
    .eq('estado', 'Abonado');
  console.log(`Total facturas Abonadas actualmente en sistema: ${facsAbonadas?.length}`);
  console.log(facsAbonadas);
}

run();

