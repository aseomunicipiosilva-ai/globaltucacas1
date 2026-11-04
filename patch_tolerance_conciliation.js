const fs = require('fs');

// 1. Modificar src/app/(admin)/admin/caja/conciliacion/page.tsx
const concFile = 'C:/Users/david/Desktop/tucacas/global_green_tucacas/src/app/(admin)/admin/caja/conciliacion/page.tsx';
let concContent = fs.readFileSync(concFile, 'utf8');

// Tolerancia de tasa: si la diferencia entre lo transferido y la deuda es <= 2.5% o <= 2500 Bs (variación cambiaria)
const oldAbonoCheck = `const esAbonoParcial = det.es_abono || (montoConciliadoNum > 0 && montoConciliadoNum < deudaTotal - 1.00);`;
const newAbonoCheck = `// Considerar abono parcial SOLO si fue marcado explícitamente como abono o si la diferencia supera la variación de tasa cambiaria (3% o más de 10 Bs)
          const diffDeuda = deudaTotal - montoConciliadoNum;
          const esDiferenciaCambiaria = diffDeuda > 0 && (diffDeuda <= 5.00 || (deudaTotal > 0 && (diffDeuda / deudaTotal) <= 0.03));
          const esAbonoParcial = (det.es_abono === true) || (montoConciliadoNum > 0 && diffDeuda > 1.00 && !esDiferenciaCambiaria);`;

if (concContent.includes(oldAbonoCheck)) {
  concContent = concContent.replace(oldAbonoCheck, newAbonoCheck);
  fs.writeFileSync(concFile, concContent, 'utf8');
  console.log('conciliacion/page.tsx updated with rate tolerance');
} else {
  console.log('Target line not found in conciliacion/page.tsx');
}

// 2. Modificar src/app/(admin)/admin/caja/page.tsx
const cajaFile = 'C:/Users/david/Desktop/tucacas/global_green_tucacas/src/app/(admin)/admin/caja/page.tsx';
let cajaContent = fs.readFileSync(cajaFile, 'utf8');

const oldCajaCheck1 = `        if (transferido < finalTotal) {
          esAbono = true;
          montoReal = transferido;
        } else if (transferido > finalTotal) {
          saldoAFavorNuevo = transferido - finalTotal;
          montoReal = transferido;
        } else {
          montoReal = transferido;
        }`;

const newCajaCheck1 = `        const diffTrans = finalTotal - transferido;
        const esDifTasa = diffTrans > 0 && (diffTrans <= 5.00 || (finalTotal > 0 && (diffTrans / finalTotal) <= 0.03));
        if (transferido < finalTotal && !esDifTasa) {
          esAbono = true;
          montoReal = transferido;
        } else if (transferido > finalTotal && (transferido - finalTotal) > 5.00 && ((transferido - finalTotal) / finalTotal) > 0.03) {
          saldoAFavorNuevo = transferido - finalTotal;
          montoReal = transferido;
        } else {
          esAbono = false;
          montoReal = transferido;
        }`;

const oldCajaCheck2 = `        if (transferido < finalTotal || isPagoMultiple) {
          esAbono = true;
          montoReal = transferido;
        } else if (transferido > finalTotal) {
          saldoAFavorNuevo = transferido - finalTotal;
          montoReal = transferido;
        } else {
          montoReal = transferido;
        }`;

const newCajaCheck2 = `        const diffTrans2 = finalTotal - transferido;
        const esDifTasa2 = diffTrans2 > 0 && (diffTrans2 <= 5.00 || (finalTotal > 0 && (diffTrans2 / finalTotal) <= 0.03));
        if ((transferido < finalTotal && !esDifTasa2) || (isPagoMultiple && transferido < finalTotal - 5.00)) {
          esAbono = true;
          montoReal = transferido;
        } else if (transferido > finalTotal && (transferido - finalTotal) > 5.00 && ((transferido - finalTotal) / finalTotal) > 0.03) {
          saldoAFavorNuevo = transferido - finalTotal;
          montoReal = transferido;
        } else {
          esAbono = false;
          montoReal = transferido;
        }`;

if (cajaContent.includes(oldCajaCheck1)) {
  cajaContent = cajaContent.replace(oldCajaCheck1, newCajaCheck1);
}
if (cajaContent.includes(oldCajaCheck2)) {
  cajaContent = cajaContent.replace(oldCajaCheck2, newCajaCheck2);
}

fs.writeFileSync(cajaFile, cajaContent, 'utf8');
console.log('caja/page.tsx updated with tolerance');

