const fs = require('fs');
const filePath = 'C:/Users/david/Desktop/tucacas/global_green_tucacas/src/app/(admin)/admin/caja/page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Agregar helper getServicioMonto
const targetHelper = `    return { esAbono, originalMonto, montoAbonado, restante };
  };`;

const helperReplacement = `    return { esAbono, originalMonto, montoAbonado, restante };
  };

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
  };`;

if (!content.includes('const getServicioMonto =')) {
  content = content.replace(targetHelper, helperReplacement);
}

// 2. Modificar cálculo de totalBs en useEffect
const targetTotal = `    selectedServicios.forEach(ref => {
      const s = serviciosEsp.find(ss => ss.referencia === ref);
      if (s) total += parseFloat(s.monto || '0');
    });

    selectedTalaPoda.forEach(ref => {
      const s = talaPoda.find(ss => ss.referencia === ref);
      if (s) total += parseFloat(s.monto || '0');
    });
    
    setTotalBs(total);
  }, [selectedRecibos, selectedCuotas, selectedServicios, selectedTalaPoda, recibos, cuotas, serviciosEsp, talaPoda]);`;

const totalReplacement = `    selectedServicios.forEach(ref => {
      const s = serviciosEsp.find(ss => ss.referencia === ref);
      if (s) total += getServicioMonto(s);
    });

    selectedTalaPoda.forEach(ref => {
      const s = talaPoda.find(ss => ss.referencia === ref);
      if (s) total += getServicioMonto(s);
    });
    
    setTotalBs(total);
  }, [selectedRecibos, selectedCuotas, selectedServicios, selectedTalaPoda, recibos, cuotas, serviciosEsp, talaPoda, customBcvRate, tcmmv]);`;

content = content.replace(targetTotal, totalReplacement);

// 3. Modificar renderizado de montos de Tala y Poda y Servicios Especiales
const targetTalaUI = `<span className="font-bold text-green-700">Bs. {formatBs(parseFloat(s.monto || '0'))}</span>`;
const talaUIReplacement = `<span className="font-bold text-green-700">Bs. {formatBs(getServicioMonto(s))}</span>`;
content = content.replace(targetTalaUI, talaUIReplacement);

const targetServUI = `<span className="font-bold text-purple-700">Bs. {formatBs(parseFloat(s.monto || '0'))}</span>`;
const servUIReplacement = `<span className="font-bold text-purple-700">Bs. {formatBs(getServicioMonto(s))}</span>`;
content = content.replace(targetServUI, servUIReplacement);

// 4. Modificar conceptosGrupo en recibo post-pago
const targetConcepto = `              if (selectedServicios.length > 0 && idx === 0) {
                selectedServicios.forEach((idServ: any) => {
                  const sObj = (serviciosEsp as any[] || []).find((s: any) => s.id === idServ);
                  if (sObj) {
                    const montoS = parseFloat(sObj.monto || '0');
                    conceptosGrupo.push({
                      descripcion: \`Servicio Especial: \${sObj.tipo_servicio || 'Servicio'} (\${sObj.numero || ''})\`,
                      precioUnit: montoS,
                      total: montoS
                    });
                  }
                });
              }`;

const conceptoReplacement = `              if (selectedServicios.length > 0 && idx === 0) {
                selectedServicios.forEach((idServ: any) => {
                  const sObj = (serviciosEsp as any[] || []).find((s: any) => s.id === idServ || s.referencia === idServ);
                  if (sObj) {
                    const montoS = getServicioMonto(sObj);
                    conceptosGrupo.push({
                      descripcion: \`Servicio Especial: \${sObj.tipo_servicio || sObj.tipo || 'Servicio'} (\${sObj.numero || sObj.referencia || ''})\`,
                      precioUnit: montoS,
                      total: montoS
                    });
                  }
                });
              }
              if (selectedTalaPoda.length > 0 && idx === 0) {
                selectedTalaPoda.forEach((refTala: any) => {
                  const sObj = (talaPoda as any[] || []).find((s: any) => s.referencia === refTala || s.id === refTala);
                  if (sObj) {
                    const montoS = getServicioMonto(sObj);
                    conceptosGrupo.push({
                      descripcion: \`Tala y Poda: \${sObj.descripcion || 'Servicio de Tala y Poda'} (\${sObj.referencia || ''})\`,
                      precioUnit: montoS,
                      total: montoS
                    });
                  }
                });
              }`;

content = content.replace(targetConcepto, conceptoReplacement);

// 5. En deducción de dinero en abono débito para servicios especiales
const targetAbonoServ = `              const s = serviciosEsp.find(sv => sv.referencia === ref);
              if (!s) continue;
              const montoS = parseFloat(s.monto || '0');`;

const abonoServReplacement = `              const s = serviciosEsp.find(sv => sv.referencia === ref);
              if (!s) continue;
              const montoS = getServicioMonto(s);`;

content = content.replace(targetAbonoServ, abonoServReplacement);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully updated caja/page.tsx');

