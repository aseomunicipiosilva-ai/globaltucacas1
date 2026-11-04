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

const targetRefs = [
  'CM-I-000481-11-2026', // J-304438982 (Febo)
  'CM-I-000037-11-2026', // J-500380470 (Atlantica)
  'CM-I-000293-11-2026', // J-297655948 (Matrix Tv)
  'CM-I-000571-11-2026', // V-324083568 (Maria Peña)
  'CM-I-000098-11-2026', // J-407962957 (Tu Lancha)
  'CM-I-000662-11-2026', // J-297655948 (Matrix Tv)
  'CM-I-000301-11-2026', // J-409937437 (Casas del Mar)
  'CM-I-000029-11-2026', // J-403870500 (Playuela)
  'CM-I-000030-11-2026', // J-317320255 (Paycla)
  'CM-I-000167-11-2026', // J-075425189 (Panaderia Reina del Mar)
  'CM-I-000103-11-2026', // J-500338848 (Reina del Mar Market)
  'CM-I-000351-11-2026'  // J-085001034 (Marina la Cuevita)
];

async function cleanSaldos() {
  for (const ref of targetRefs) {
    const { data: fac } = await supabase.from('facturas').select('identidad, contribuyente').eq('referencia', ref).single();
    if (!fac) continue;

    // Buscar el pago asociado
    const { data: pagos } = await supabase
      .from('pagos_reportados')
      .select('*')
      .eq('identidad', fac.identidad)
      .in('estado', ['Aprobado', 'Conciliado']);

    const p = (pagos || []).find(pago => {
      let det = pago.detalles;
      if (typeof det === 'string') {
        try { det = JSON.parse(det); } catch(e) {}
      }
      return (det?.recibos || []).includes(ref);
    });

    if (p) {
      const montoPago = parseFloat(p.monto || '0');
      const { data: inms } = await supabase.from('inmuebles').select('id, saldo_favor_bs').eq('identidad', fac.identidad);
      if (inms && inms.length > 0) {
        const saldoActual = parseFloat(inms[0].saldo_favor_bs || '0');
        // Si el saldo a favor actual coincide exactamente con el monto del pago o es >= al monto de ese pago
        if (Math.abs(saldoActual - montoPago) < 1.00) {
          console.log(`Limpiando saldo a favor indebido (${saldoActual} Bs) para ${fac.identidad} (${fac.contribuyente})...`);
          await supabase.from('inmuebles').update({ saldo_favor_bs: 0 }).eq('id', inms[0].id);
        } else if (saldoActual >= montoPago) {
          const nuevoSaldo = parseFloat((saldoActual - montoPago).toFixed(2));
          console.log(`Ajustando saldo a favor de ${saldoActual} Bs a ${nuevoSaldo} Bs para ${fac.identidad}...`);
          await supabase.from('inmuebles').update({ saldo_favor_bs: nuevoSaldo }).eq('id', inms[0].id);
        }
      }
    }
  }
  console.log('Limpieza de saldo a favor completada.');
}

cleanSaldos();

