const fs = require('fs');
const path = require('path');

function patch(filePath, viewDataVarName) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  const regex = /\[\s*'IVA \(16\.00%\) Bs\.', 'Bs\. 0,00'\s*\]\s*,/;
  if (!regex.test(content)) {
    console.log('Could not find insertion point in ' + filePath);
    return;
  }
  
  const replaceStr = "['IVA (16.00%) Bs.', 'Bs. 0,00'],\n        ['Saldo a Favor Bs.', `Bs. ${parseFloat(inm.saldo_favor_bs || " + viewDataVarName + " || 0).toLocaleString('es-VE', { minimumFractionDigits: 2 })}`],";
  
  let newContent = content.replace(regex, replaceStr);
  fs.writeFileSync(filePath, newContent, 'utf8');
  console.log('Patched ' + filePath);
}

patch('C:\\Users\\david\\Desktop\\tucacas\\global_green_tucacas\\src\\app\\(admin)\\admin\\contribuyentes\\page.tsx', 'viewData.SaldoFavor');
patch('C:\\Users\\david\\Desktop\\tucacas\\global_green_tucacas\\src\\app\\portal\\(dashboard)\\estado-cuenta\\page.tsx', 'myContribuyente?.SaldoFavor');
