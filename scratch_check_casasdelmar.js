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
    .eq('id', '0b4066ab-1a78-40ac-820b-92abaac23a5e')
    .single();

  console.log('Pago de Casas del Mar (J-409937437):');
  console.log('Monto:', p.monto);
  console.log('Detalles recibos:', p.detalles.recibos);
  console.log('Detalles monto_conciliado:', p.detalles.monto_conciliado);
  console.log('Detalles tasa_bcv:', p.detalles.tasa_bcv);
  console.log('Detalles tasa_bcv_conciliacion:', p.detalles.tasa_bcv_conciliacion);
  console.log('Detalles completos:', JSON.stringify(p.detalles, null, 2));

  const { data: facturas } = await supabase
    .from('facturas')
    .select('*')
    .eq('identidad', 'J-409937437')
    .order('emision', { ascending: true });
  console.log('\nFacturas de Casas del Mar:');
  console.log(facturas);
}

run();

