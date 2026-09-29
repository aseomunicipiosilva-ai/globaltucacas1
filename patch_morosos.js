const fs = require('fs');
const path = require('path');

const filePath = 'C:\\Users\\david\\Desktop\\naguanagua\\global_green_naguanagua\\src\\app\\(admin)\\admin\\reportes\\generators\\Morosos.ts';
let content = fs.readFileSync(filePath, 'utf8');

// Patch Excel
content = content.replace(
  "['N°','CÓDIGO','CONTRIBUYENTE','IDENTIDAD','CLASIFICACIÓN','MESES PENDIENTES','PERÍODOS','DEUDA TOTAL (Bs)'],",
  "['N°','CÓDIGO','CONTRIBUYENTE','IDENTIDAD','CLASIFICACIÓN','MESES PENDIENTES','PERÍODOS','DEUDA TOTAL (Bs)', 'CORREO', 'NUEVO TELF.'],"
);
content = content.replace(
  "r.totalDeudaBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })]),",
  "r.totalDeudaBs.toLocaleString('es-VE', { minimumFractionDigits: 2 }), '', '']),"
);
content = content.replace(
  "ws['!cols'] = [{wch:5},{wch:12},{wch:40},{wch:15},{wch:18},{wch:18},{wch:50},{wch:20}];",
  "ws['!cols'] = [{wch:5},{wch:12},{wch:40},{wch:15},{wch:18},{wch:18},{wch:50},{wch:20},{wch:30},{wch:20}];"
);

// Patch PDF
content = content.replace(
  "head: [['N', 'CONTRIBUYENTE / RAZON SOCIAL', 'IDENTIDAD', 'TELEFONO', 'MESES', 'DEUDA (Bs)']],",
  "head: [['N', 'CONTRIBUYENTE / RAZON SOCIAL', 'IDENTIDAD', 'TELEFONO', 'MESES', 'DEUDA (Bs)', 'CORREO', 'NUEVO TELF.']],"
);

content = content.replace(
  "r.totalDeudaBs.toLocaleString('es-VE', { minimumFractionDigits: 2 }),\n    ]),",
  "r.totalDeudaBs.toLocaleString('es-VE', { minimumFractionDigits: 2 }),\n      '',\n      '',\n    ]),"
);

const oldColStyles = `    columnStyles: {
      0: { cellWidth: 8,  halign: 'center' },
      1: { cellWidth: 72 },
      2: { cellWidth: 28 },
      3: { cellWidth: 28 },
      4: { cellWidth: 12, halign: 'center', fontStyle: 'bold' },
      5: { cellWidth: 30, halign: 'right',  fontStyle: 'bold' },
    },`;

const newColStyles = `    columnStyles: {
      0: { cellWidth: 6,  halign: 'center' },
      1: { cellWidth: 46 },
      2: { cellWidth: 22 },
      3: { cellWidth: 22 },
      4: { cellWidth: 12, halign: 'center', fontStyle: 'bold' },
      5: { cellWidth: 22, halign: 'right',  fontStyle: 'bold' },
      6: { cellWidth: 36 },
      7: { cellWidth: 24 },
    },`;

content = content.replace(oldColStyles, newColStyles);

const oldFoot = `    foot: [[
      '', '', '', '',
      { content: rows.length + ' morosos', styles: { fontStyle: 'bold', halign: 'right', textColor: [15,23,42] } },
      { content: 'Bs. ' + totalDeuda.toLocaleString('es-VE', { minimumFractionDigits: 2 }), styles: { fontStyle: 'bold', halign: 'right', textColor: [185,28,28] } },
    ]],`;

const newFoot = `    foot: [[
      '', '', '', '',
      { content: rows.length + ' morosos', styles: { fontStyle: 'bold', halign: 'right', textColor: [15,23,42] } },
      { content: 'Bs. ' + totalDeuda.toLocaleString('es-VE', { minimumFractionDigits: 2 }), styles: { fontStyle: 'bold', halign: 'right', textColor: [185,28,28] } },
      '', ''
    ]],`;

content = content.replace(oldFoot, newFoot);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Patched Morosos.ts');
