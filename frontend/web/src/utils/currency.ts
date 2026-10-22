/**
 * Định dạng số tiền VND theo chuẩn Việt Nam (ví dụ: 15.000.000 ₫)
 */
export function formatVND(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return '0 ₫';
  }
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Định dạng số rút gọn (ví dụ: 15.5 Tr, 500k)
 */
export function formatCompactVND(amount: number): string {
  if (isNaN(amount)) return '0 ₫';
  const abs = Math.abs(amount);
  if (abs >= 1_000_000_000) {
    return `${(amount / 1_000_000_000).toFixed(1)} Tỷ`;
  }
  if (abs >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(1)} Tr`;
  }
  if (abs >= 1_000) {
    return `${(amount / 1_000).toFixed(0)}k`;
  }
  return formatVND(amount);
}

/**
 * Định dạng số có dấu + hoặc -
 */
export function formatSignedVND(amount: number, type: 'INCOME' | 'EXPENSE' | 'TRANSFER'): string {
  const formatted = formatVND(Math.abs(amount));
  if (type === 'INCOME') {
    return `+${formatted}`;
  }
  if (type === 'EXPENSE') {
    return `-${formatted}`;
  }
  return formatted;
}

/**
 * Parse chuỗi nhập tiền thành số nguyên VND
 */
export function parseAmount(input: string): number | undefined {
  if (!input) return undefined;
  const trimmed = input.trim();
  if (trimmed.startsWith('-')) return undefined;

  const cleaned = trimmed.replace(/[^\d]/g, '');
  if (!cleaned) return undefined;

  const num = parseInt(cleaned, 10);
  if (isNaN(num) || num <= 0 || num > 999_999_999_999) {
    return undefined;
  }
  return num;
}

/**
 * Che số tài khoản ngân hàng, chỉ hiển thị 4 số cuối (ví dụ: ****8888)
 */
export function maskAccountNumber(accountNumber: string | null | undefined): string {
  if (!accountNumber) return '****';
  const trimmed = accountNumber.trim();
  if (trimmed.length <= 4) {
    return trimmed;
  }
  return `****${trimmed.slice(-4)}`;
}
