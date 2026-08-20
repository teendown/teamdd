// 🎨 TEAM D.D FORMATTING UTILITIES

export function formatCurrency(num) {
  const n = Number(num) || 0;
  return n.toLocaleString('ko-KR');
}

export function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function formatDateTime(dateStr, timeStr) {
  const fDate = formatDate(dateStr);
  return timeStr ? `${fDate} ${timeStr}` : fDate;
}

export function formatPhone(phone) {
  if (!phone) return '';
  const clean = String(phone).replace(/[^0-9]/g, '');
  if (clean.length === 11) {
    return clean.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
  } else if (clean.length === 10) {
    if (clean.startsWith('02')) {
      return clean.replace(/(\d{2})(\d{4})(\d{4})/, '$1-$2-$3');
    }
    return clean.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
  }
  return phone;
}

export function calculateSupplyAmount(items = []) {
  return items.reduce((sum, item) => sum + (Number(item.qty) || 0) * (Number(item.price) || 0), 0);
}

export function calculateVatAmount(supplyAmount, vatIncluded = true, customVat = 0) {
  if (customVat !== undefined && customVat !== null && customVat > 0) {
    return Number(customVat) || 0;
  }
  return vatIncluded ? Math.floor(supplyAmount * 0.1) : 0;
}

export function calculateTotalAmount(supplyAmount, vatAmount) {
  return supplyAmount + vatAmount;
}
