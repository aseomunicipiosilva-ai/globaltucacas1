export function formatBs(amount: number | string): string {
  if (!amount) return '0,00';
  const num = typeof amount === 'string' ? parseFloat(amount.toString().replace(/[^\\d.-]/g, '')) : amount;
  if (isNaN(num)) return '0,00';
  return num.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
