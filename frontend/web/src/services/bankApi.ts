import { BankConnectionResult, ConnectBankAccountInput } from '../types/bankAccount';

const CONNECTOR_URL = ((import.meta.env.VITE_BANK_CONNECTOR_URL as string | undefined)?.trim() || window.location.origin).replace(/\/$/, '');

export interface BankTransaction {
  transaction_date: string | null;
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  description: string | null;
  reference: string | null;
}

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 25000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const headers = new Headers(options.headers);
    const token = localStorage.getItem('finvn_auth_token');
    if (token && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`);
    const csrf = document.cookie.split('; ').find((part) => part.startsWith('finvn_csrf='))?.split('=').slice(1).join('=');
    if (csrf && !['GET', 'HEAD', 'OPTIONS'].includes((options.method || 'GET').toUpperCase())) headers.set('X-CSRF-Token', decodeURIComponent(csrf));
    const res = await fetch(url, {
      ...options,
      headers,
      credentials: 'include',
      signal: controller.signal,
    });
    return res;
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new Error(`Kết nối đến máy chủ ngân hàng quá thời gian chờ (${timeoutMs / 1000}s). Vui lòng thử lại.`);
    }
    throw err;
  } finally {
    clearTimeout(id);
  }
}

export const bankApiService = {
  isConfigured(): boolean {
    return Boolean(CONNECTOR_URL);
  },

  async connect(input: ConnectBankAccountInput): Promise<BankConnectionResult> {
    if (!CONNECTOR_URL) {
      throw new Error('Chưa cấu hình máy chủ kết nối ngân hàng. Hãy thêm VITE_BANK_CONNECTOR_URL vào file .env.local.');
    }

    const response = await fetchWithTimeout(`${CONNECTOR_URL.replace(/\/$/, '')}/api/banks/${input.provider.toLowerCase()}/connect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: input.username,
        password: input.password,
        browser_id: input.browserId,
        account_number: input.accountNumber,
      }),
    }, 20000);

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

    const response = await fetchWithTimeout(`${CONNECTOR_URL.replace(/\/$/, '')}/api/banks/${input.provider.toLowerCase()}/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: input.username,
        password: input.password,
        browser_id: input.browserId,
        browser_token: input.browserToken,
        otp: input.otp,
      }),
    }, 20000);

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
    const response = await fetchWithTimeout(`${CONNECTOR_URL.replace(/\/$/, '')}/api/banks/${input.provider.toLowerCase()}/transactions`, {
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
    }, 60000);
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(payload?.detail || payload?.message || 'Không thể lấy lịch sử giao dịch.');
    return payload as BankTransaction[];
  },

  async syncBank(input: ConnectBankAccountInput & {
    bankName: string;
    displayName: string;
    color?: string;
    initialBalance?: number;
    forceFull?: boolean;
  }): Promise<{
    status: string;
    account: any;
    mode: 'INCREMENTAL' | 'FULL';
    from_date: string;
    to_date: string;
    fetched_count: number;
    new_inserted_count: number;
    current_balance: number;
    browser_id?: string;
  }> {
    if (!CONNECTOR_URL) throw new Error('Chưa cấu hình máy chủ kết nối ngân hàng.');
    const response = await fetchWithTimeout(`${CONNECTOR_URL.replace(/\/$/, '')}/api/banks/${input.provider.toLowerCase()}/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: input.username,
        password: input.password,
        browser_id: input.browserId,
        account_number: input.accountNumber,
        bank_name: input.bankName,
        display_name: input.displayName,
        color: input.color,
        initial_balance: input.initialBalance,
        force_full: Boolean(input.forceFull),
      }),
    }, 60000);
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(payload?.detail || payload?.message || 'Không thể đồng bộ ngân hàng.');
    return payload;
  },
  async syncSavedAccount(accountId: string): Promise<void> {
    if (!CONNECTOR_URL) throw new Error('Chưa cấu hình máy chủ kết nối ngân hàng.');
    const response = await fetchWithTimeout(`${CONNECTOR_URL.replace(/\/$/, '')}/api/accounts/${encodeURIComponent(accountId)}/sync`, { method: 'POST' }, 60000);
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(payload?.detail || 'Không thể đồng bộ tài khoản.');
  },
};
