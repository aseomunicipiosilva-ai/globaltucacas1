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
  const { data: p } = await supabase
    .from('pagos_reportados')
    .select('*')
    .eq('id', 'bde70ec3-341e-4b79-b16e-faba8e666f3f')
    .single();

  console.log('Pago bde70ec3-341e-4b79-b16e-faba8e666f3f:');
  console.log('Monto:', p.monto);
  console.log('Detalles recibos:', p.detalles.recibos);
  console.log('Detalles recibosIds:', p.detalles.recibosIds);
  console.log('Detalles monto_conciliado:', p.detalles.monto_conciliado);

  const { data: facturas } = await supabase
    .from('facturas')
    .select('*')
    .eq('identidad', 'J-000063729');
  console.log('Facturas:');
  console.log(facturas);

  const { data: inm } = await supabase
    .from('inmuebles')
    .select('*')
    .eq('identidad', 'J-000063729');
  console.log('Inmueble:');
  console.log(inm);
}
run();

