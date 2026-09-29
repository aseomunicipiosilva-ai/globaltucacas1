const fs = require('fs');

function patch(path, viewDataVarName) {
  let content = fs.readFileSync(path, 'utf8');
  
  // Use regex to find the insertion point robustly
  const regex = /\[\s*'IVA \(16\.00%\) Bs\.', 'Bs\. 0,00'\s*\]\s*,/;
  
  if (!regex.test(content)) {
    console.log('Could not find insertion point in ' + path);
    return;
  }
  
  const replaceStr = "['IVA (16.00%) Bs.', 'Bs. 0,00'],\n        ['Saldo a Favor Bs.', `Bs. ${parseFloat(inm.saldo_favor_bs || " + viewDataVarName + " || 0).toLocaleString('es-VE', { minimumFractionDigits: 2 })}`],";
  
  let newContent = content.replace(regex, replaceStr);
  fs.writeFileSync(path, newContent, 'utf8');
  console.log('Patched ' + path);
}

patch('C:\\Users\\david\\Desktop\\naguanagua\\global_green_naguanagua\\src\\app\\(admin)\\admin\\contribuyentes\\page.tsx', 'viewData.SaldoFavor');
patch('C:\\Users\\david\\Desktop\\naguanagua\\global_green_naguanagua\\src\\app\\portal\\(dashboard)\\estado-cuenta\\page.tsx', 'myContribuyente?.SaldoFavor');

