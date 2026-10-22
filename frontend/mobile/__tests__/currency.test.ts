import {
  formatVND,
  formatSignedVND,
  parseAmount,
  maskAccountNumber,
} from '../src/utils/currency';

describe('Currency & Account Number Utilities', () => {
  describe('formatVND', () => {
    it('định dạng số tiền VND chính xác với ký hiệu ₫', () => {
      const formatted = formatVND(1500000);
      expect(formatted).toContain('1.500.000');
      expect(formatted).toContain('₫');
    });

    it('trả về 0 ₫ khi số tiền là 0 hoặc undefined/NaN', () => {
      const res0 = formatVND(0);
      expect(res0).toContain('0');
      expect(res0).toContain('₫');

      const resNaN = formatVND(NaN);
      expect(resNaN).toContain('0');
      expect(resNaN).toContain('₫');
    });
  });

  describe('formatSignedVND', () => {
    it('thêm dấu + cho khoản thu nhập INCOME', () => {
      const res = formatSignedVND(500000, 'INCOME');
      expect(res.startsWith('+')).toBe(true);
      expect(res).toContain('500.000');
    });

    it('thêm dấu - cho khoản chi tiêu EXPENSE', () => {
      const res = formatSignedVND(200000, 'EXPENSE');
      expect(res.startsWith('-')).toBe(true);
      expect(res).toContain('200.000');
    });
  });

  describe('parseAmount', () => {
    it('parse chuỗi số tiền có dấu chấm hoặc phẩy thành số nguyên', () => {
      expect(parseAmount('1.500.000')).toBe(1500000);
      expect(parseAmount('50,000')).toBe(50000);
      expect(parseAmount('1000000')).toBe(1000000);
    });

    it('từ chối chuỗi âm hoặc ký tự không hợp lệ', () => {
      expect(parseAmount('-50000')).toBeUndefined();
      expect(parseAmount('abc')).toBeUndefined();
      expect(parseAmount('')).toBeUndefined();
    });

    it('từ chối số tiền vượt ngưỡng 999.999.999.999 ₫', () => {
      expect(parseAmount('1000000000000')).toBeUndefined();
    });
  });

  describe('maskAccountNumber', () => {
    it('che các số đầu và chỉ hiển thị 4 số cuối với ****', () => {
      expect(maskAccountNumber('1017588888')).toBe('****8888');
      expect(maskAccountNumber('0123456789')).toBe('****6789');
    });

    it('giữ nguyên nếu số tài khoản có từ 4 ký tự trở xuống', () => {
      expect(maskAccountNumber('1234')).toBe('1234');
      expect(maskAccountNumber('99')).toBe('99');
    });

    it('trả về **** khi null hoặc rỗng', () => {
      expect(maskAccountNumber(null)).toBe('****');
      expect(maskAccountNumber('')).toBe('****');
    });
  });
});
