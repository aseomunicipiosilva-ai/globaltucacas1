export function formatBs(amount: number | string): string {
  if (amount === null || amount === undefined || amount === '') return '0,00';
  if (typeof amount === 'number') {
    if (isNaN(amount)) return '0,00';
    return amount.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  let str = amount.toString().trim();
  if (!str) return '0,00';
  
  if (str.includes(',') && str.includes('.')) {
    if (str.lastIndexOf(',') > str.lastIndexOf('.')) {
      str = str.replace(/\./g, '').replace(',', '.');
    } else {
      str = str.replace(/,/g, '');
    }
  } else if (str.includes(',')) {
    str = str.replace(',', '.');
  }
  
  str = str.replace(/[^\d.-]/g, '');
  const num = parseFloat(str);
  if (isNaN(num)) return '0,00';
  return num.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
