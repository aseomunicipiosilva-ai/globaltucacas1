const fs = require('fs');
const filePath = 'C:/Users/david/Desktop/tucacas/global_green_tucacas/src/app/(admin)/admin/caja/page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const helper = `
  const getServicioMonto = (s: any): number => {
    const tasaActual = (customBcvRate && !isNaN(parseFloat(customBcvRate))) 
      ? parseFloat(customBcvRate) 
      : (tcmmv || 0);
    const montoBase = parseFloat(String(s?.monto || '0').replace(/[^\\d.]/g, '')) || 0;
    if (!tasaActual || tasaActual <= 0 || montoBase <= 0) return montoBase;
    
    const tasaRegistro = parseFloat(String(s.tasa_bcv || s.tasa || '0')) || 0;
    if (tasaRegistro > 0) {
      return parseFloat(((montoBase / tasaRegistro) * tasaActual).toFixed(2));
    }
    if (tcmmv > 0) {
      return parseFloat(((montoBase / tcmmv) * tasaActual).toFixed(2));
    }
    return montoBase;
  };
`;

const needle = 'const handleAuthorizeRateChange =';
if (!content.includes('const getServicioMonto =')) {
  content = content.replace(needle, helper + '\n  ' + needle);
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Inserted getServicioMonto');

