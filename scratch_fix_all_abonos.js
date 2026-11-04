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

// Lista de facturas de Noviembre 2026 que quedaron en Abonado por error de tolerancia de tasa
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

async function fixAbonos() {
  console.log(`Corrigiendo ${targetRefs.length} facturas...`);

  for (const ref of targetRefs) {
    // Buscar la factura
    const { data: fac } = await supabase.from('facturas').select('*').eq('referencia', ref).single();
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

    const montoOriginalPago = p ? parseFloat(p.monto || '0') : parseFloat(fac.monto || '0');

    console.log(`Actualizando ${ref} (${fac.contribuyente}) a Pagado...`);
    const { error: errFac } = await supabase
      .from('facturas')
      .update({
        estado: 'Pagado',
        monto: montoOriginalPago
      })
      .eq('referencia', ref);

    if (errFac) {
      console.error(`Error en factura ${ref}:`, errFac);
    } else {
      console.log(`-> ${ref} Pagado OK.`);
    }

    // Verificar si le quedan facturas pendientes al contribuyente
    const { data: restantes } = await supabase
      .from('facturas')
      .select('id')
      .eq('identidad', fac.identidad)
      .in('estado', ['Pendiente', 'Por Verificar', 'Abonado']);

    if (!restantes || restantes.length === 0) {
      console.log(`  -> Contribuyente ${fac.identidad} sin deudas restantes. Actualizando deuda_mmv = 0...`);
      await supabase.from('inmuebles').update({ deuda_mmv: 0 }).eq('identidad', fac.identidad);
    }
  }

  console.log('Corrección masiva de facturas completada.');
}

fixAbonos();

