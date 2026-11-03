// Script para solventar y conciliar el mes 11-2026 de Polar
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

async function fixPolar() {
  console.log('1. Actualizando factura CM-I-000052-11-2026 a Pagado por 98.938,00 Bs...');
  const { error: errFac } = await supabase
    .from('facturas')
    .update({
      estado: 'Pagado',
      monto: '98938'
    })
    .eq('referencia', 'CM-I-000052-11-2026');

  if (errFac) {
    console.error('Error actualizando factura:', errFac);
    return;
  }
  console.log('Factura actualizada exitosamente a Pagado.');

  console.log('2. Actualizando inmueble I-000052 (deuda_mmv = 0)...');
  const { error: errInm } = await supabase
    .from('inmuebles')
    .update({
      deuda_mmv: 0
    })
    .eq('identidad', 'J-000063729');

  if (errInm) {
    console.error('Error actualizando inmueble:', errInm);
    return;
  }
  console.log('Inmueble actualizado a deuda_mmv = 0.');

  console.log('3. Verificando estado final...');
  const { data: facs } = await supabase
    .from('facturas')
    .select('referencia, monto, estado, emision')
    .eq('identidad', 'J-000063729');
  console.log('Facturas de Polar:', facs);

  const { data: inms } = await supabase
    .from('inmuebles')
    .select('identidad, contribuyente, deuda_mmv, saldo_favor_bs')
    .eq('identidad', 'J-000063729');
  console.log('Inmuebles de Polar:', inms);
}

fixPolar();

