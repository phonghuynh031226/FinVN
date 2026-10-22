import { BankConnectionResult, ConnectBankAccountInput } from '../types/bankAccount';

const CONNECTOR_URL = import.meta.env.VITE_BANK_CONNECTOR_URL as string | undefined;

export interface BankTransaction {
  transaction_date: string | null;
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  description: string | null;
  reference: string | null;
}

export const bankApiService = {
  isConfigured(): boolean {
    return Boolean(CONNECTOR_URL);
  },

  async connect(input: ConnectBankAccountInput): Promise<BankConnectionResult> {
    if (!CONNECTOR_URL) {
      throw new Error('Chưa cấu hình máy chủ kết nối ngân hàng. Hãy thêm VITE_BANK_CONNECTOR_URL vào file .env.local.');
    }

    const response = await fetch(`${CONNECTOR_URL.replace(/\/$/, '')}/api/banks/${input.provider.toLowerCase()}/connect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: input.username,
        password: input.password,
        browser_id: input.browserId,
        account_number: input.accountNumber,
      }),
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(payload?.detail || payload?.message || 'Không thể kết nối ngân hàng.');

    if (payload?.status === 'NEED_OTP') {
      return {
        status: 'NEED_OTP',
        browserId: payload.browser_id || input.browserId,
        browserToken: payload.browser_token,
        duration: payload.duration || 90,
        message: payload.message || 'Ngân hàng yêu cầu mã OTP xác thực thiết bị.',
      };
    }

    return {
      status: 'SUCCESS',
      accountNumber: payload.accountNumber || payload.account_number || '',
      currentBalance: payload.currentBalance ?? payload.current_balance ?? 0,
      accountHolderName: payload.accountHolderName || payload.account_holder_name,
      sessionId: payload.sessionId,
    };
  },

  async verifyOtp(input: import('../types/bankAccount').VerifyOtpInput): Promise<BankConnectionResult> {
    if (!CONNECTOR_URL) {
      throw new Error('Chưa cấu hình máy chủ kết nối ngân hàng.');
    }

    const response = await fetch(`${CONNECTOR_URL.replace(/\/$/, '')}/api/banks/${input.provider.toLowerCase()}/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: input.username,
        password: input.password,
        browser_id: input.browserId,
        browser_token: input.browserToken,
        otp: input.otp,
      }),
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(payload?.detail || payload?.message || 'Xác thực OTP thất bại.');

    return {
      status: 'SUCCESS',
      accountNumber: payload.accountNumber || payload.account_number || '',
      currentBalance: payload.currentBalance ?? payload.current_balance ?? 0,
      accountHolderName: payload.accountHolderName || payload.account_holder_name,
      sessionId: payload.sessionId,
    };
  },

  async getTransactions(input: ConnectBankAccountInput, fromDate: string, toDate: string): Promise<BankTransaction[]> {
    if (!CONNECTOR_URL) throw new Error('Chưa cấu hình máy chủ kết nối ngân hàng.');
    const response = await fetch(`${CONNECTOR_URL.replace(/\/$/, '')}/api/banks/${input.provider.toLowerCase()}/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: input.username,
        password: input.password,
        browser_id: input.browserId,
        account_number: input.accountNumber,
        from_date: fromDate,
        to_date: toDate,
      }),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(payload?.detail || payload?.message || 'Không thể lấy lịch sử giao dịch.');
    return payload as BankTransaction[];
  },
};
