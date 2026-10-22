/**
 * Định dạng số tiền VND theo chuẩn Việt Nam
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
 * Định dạng số có dấu + hoặc - rõ ràng cho thu chi
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
 * Parse chuỗi nhập tiền thành số nguyên VND.
 * Trả về undefined nếu không hợp lệ, số âm hoặc vượt ngưỡng cho phép (1 - 999.999.999.999 ₫)
 */
export function parseAmount(input: string): number | undefined {
  if (!input) return undefined;
  const trimmed = input.trim();
  // Từ chối nếu có dấu âm
  if (trimmed.startsWith('-')) return undefined;

  // Loại bỏ ký tự không phải số
  const cleaned = trimmed.replace(/[^\d]/g, '');
  if (!cleaned) return undefined;

  const num = parseInt(cleaned, 10);
  if (isNaN(num) || num <= 0 || num > 999_999_999_999) {
    return undefined;
  }
  return num;
}

/**
 * Che số tài khoản ngân hàng, chỉ hiển thị 4 số cuối (ví dụ: ****1234)
 */
export function maskAccountNumber(accountNumber: string | null | undefined): string {
  if (!accountNumber) return '****';
  const trimmed = accountNumber.trim();
  if (trimmed.length <= 4) {
    return trimmed;
  }
  return `****${trimmed.slice(-4)}`;
}
