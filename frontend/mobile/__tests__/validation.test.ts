import { BankAccountSchema, TransactionSchema } from '../src/utils/validation';

describe('Data Validation Schemas (Zod)', () => {
  describe('BankAccountSchema', () => {
    it('chấp nhận tài khoản ngân hàng hợp lệ', () => {
      const res = BankAccountSchema.safeParse({
        bankName: 'Vietcombank',
        displayName: 'Nhận lương',
        accountNumber: '1017588888',
        initialBalance: 10000000,
      });
      expect(res.success).toBe(true);
    });

    it('từ chối khi tên ngân hàng để trống', () => {
      const res = BankAccountSchema.safeParse({
        bankName: '   ',
        displayName: 'Nhận lương',
        accountNumber: '1017588888',
        initialBalance: 0,
      });
      expect(res.success).toBe(false);
    });

    it('từ chối số tài khoản không phải 6-20 chữ số', () => {
      const resShort = BankAccountSchema.safeParse({
        bankName: 'Vietcombank',
        displayName: 'Nhận lương',
        accountNumber: '123',
        initialBalance: 0,
      });
      expect(resShort.success).toBe(false);

      const resAlpha = BankAccountSchema.safeParse({
        bankName: 'Vietcombank',
        displayName: 'Nhận lương',
        accountNumber: '12345ABC',
        initialBalance: 0,
      });
      expect(resAlpha.success).toBe(false);
    });

    it('từ chối số dư ban đầu âm', () => {
      const res = BankAccountSchema.safeParse({
        bankName: 'Vietcombank',
        displayName: 'Nhận lương',
        accountNumber: '1017588888',
        initialBalance: -500,
      });
      expect(res.success).toBe(false);
    });
  });

  describe('TransactionSchema', () => {
    it('chấp nhận giao dịch hợp lệ', () => {
      const res = TransactionSchema.safeParse({
        accountId: 'acc-1',
        amount: 250000,
        type: 'EXPENSE',
        category: 'Ăn uống',
        description: 'Cơm trưa',
      });
      expect(res.success).toBe(true);
    });

    it('từ chối số tiền = 0 hoặc âm', () => {
      const resZero = TransactionSchema.safeParse({
        accountId: 'acc-1',
        amount: 0,
        type: 'EXPENSE',
      });
      expect(resZero.success).toBe(false);

      const resNegative = TransactionSchema.safeParse({
        accountId: 'acc-1',
        amount: -50000,
        type: 'INCOME',
      });
      expect(resNegative.success).toBe(false);
    });
  });
});
