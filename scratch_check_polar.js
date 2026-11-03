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
  console.log('--- BUSCANDO POLAR EN CENSO ---');
  const { data: users, error: err1 } = await supabase
    .from('censo_contribuyentes')
    .select('*')
    .ilike('contribuyente', '%POLAR%');
  console.log('CENSO:', users || err1);

  console.log('--- BUSCANDO POLAR EN INMUEBLES ---');
  const { data: inms, error: err2 } = await supabase
    .from('inmuebles')
    .select('*')
    .ilike('contribuyente', '%POLAR%');
  console.log('INMUEBLES:', inms || err2);

  const ids = [];
  if (users) users.forEach(u => ids.push(u.identidad));
  if (inms) inms.forEach(i => ids.push(i.identidad));
  const uniqueIds = [...new Set(ids)];
  console.log('Identidades encontradas:', uniqueIds);

  for (const id of uniqueIds) {
    console.log(`\n=== DATOS PARA IDENTIDAD ${id} ===`);
    const { data: facturas } = await supabase
      .from('facturas')
      .select('*')
      .eq('identidad', id);
    console.log(`Facturas (${facturas?.length}):`, facturas);

    const { data: pagos } = await supabase
      .from('pagos_reportados')
      .select('*')
      .eq('identidad', id)
      .order('created_at', { ascending: false });
    console.log(`Pagos (${pagos?.length}):`, pagos);

    const { data: servs } = await supabase
      .from('servicios_especiales')
      .select('*')
      .eq('identidad', id);
    console.log(`Servicios especiales (${servs?.length}):`, servs);
  }
}
run();

