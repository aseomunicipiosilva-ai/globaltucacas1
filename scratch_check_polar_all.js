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
  const { data: allPagos } = await supabase
    .from('pagos_reportados')
    .select('id, identidad, monto, banco, referencia, tipo, estado, detalles, created_at')
    .or('identidad.eq.J-000063729,identidad.eq.J000063729,identidad.eq.000063729')
    .order('created_at', { ascending: false });

  console.log('Todos los pagos de Polar:');
  allPagos.forEach(p => {
    console.log(`- ID: ${p.id} | Ref: ${p.referencia} | Estado: ${p.estado} | Monto: ${p.monto} | Creado: ${p.created_at}`);
    console.log(`  Detalles:`, typeof p.detalles === 'string' ? p.detalles.slice(0, 150) : JSON.stringify(p.detalles).slice(0, 150));
  });

  const { data: facs } = await supabase
    .from('facturas')
    .select('*')
    .or('identidad.eq.J-000063729,identidad.eq.J000063729,identidad.eq.000063729');
  console.log('\nTodas las facturas de Polar:');
  facs.forEach(f => {
    console.log(`- Ref: ${f.referencia} | Estado: ${f.estado} | Monto: ${f.monto} | Emision: ${f.emision}`);
  });
}
run();

