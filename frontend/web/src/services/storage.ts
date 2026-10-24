import { BankAccount } from '../types/bankAccount';
import { Transaction } from '../types/transaction';

const ACCOUNTS_STORAGE_KEY = 'finvn_bank_accounts';
const TRANSACTIONS_STORAGE_KEY = 'finvn_transactions';

const initialAccounts: BankAccount[] = [];
const initialTransactions: Transaction[] = [];

// Migration / purge: Tự động loại bỏ dữ liệu mẫu cũ (mock data) khỏi localStorage trình duyệt
const MOCK_PURGED_FLAG = 'finvn_mock_purged_v1';

function purgeLegacyMockData(): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    if (localStorage.getItem(MOCK_PURGED_FLAG)) return;

    const mockAccountIds = new Set(['acc-1', 'acc-2', 'acc-3']);
    const mockTxIds = new Set(['tx-1', 'tx-2', 'tx-3', 'tx-4', 'tx-5', 'tx-6', 'tx-7']);

    const rawAccounts = localStorage.getItem(ACCOUNTS_STORAGE_KEY);
    if (rawAccounts) {
      try {
        const accounts: BankAccount[] = JSON.parse(rawAccounts);
        const filtered = accounts.filter((a) => !mockAccountIds.has(a.id));
        localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(filtered));
      } catch {
        localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify([]));
      }
    } else {
      localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify([]));
    }

    const rawTxs = localStorage.getItem(TRANSACTIONS_STORAGE_KEY);
    if (rawTxs) {
      try {
        const transactions: Transaction[] = JSON.parse(rawTxs);
        const filtered = transactions.filter(
          (t) => !mockTxIds.has(t.id) && !mockAccountIds.has(t.accountId)
        );
        localStorage.setItem(TRANSACTIONS_STORAGE_KEY, JSON.stringify(filtered));
      } catch {
        localStorage.setItem(TRANSACTIONS_STORAGE_KEY, JSON.stringify([]));
      }
    } else {
      localStorage.setItem(TRANSACTIONS_STORAGE_KEY, JSON.stringify([]));
    }

    localStorage.setItem(MOCK_PURGED_FLAG, 'true');
  } catch (e) {
    console.error('Error purging legacy mock data', e);
  }
}

purgeLegacyMockData();

export const storageService = {
  getAccounts(): BankAccount[] {
    try {
      const raw = localStorage.getItem(ACCOUNTS_STORAGE_KEY);
      if (!raw) {
        localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(initialAccounts));
        return initialAccounts;
      }
      return JSON.parse(raw);
    } catch {
      return initialAccounts;
    }
  },

  saveAccounts(accounts: BankAccount[]): void {
    try {
      localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
    } catch (e) {
      console.error('Error saving accounts to localStorage', e);
    }
  },

  getTransactions(): Transaction[] {
    try {
      const raw = localStorage.getItem(TRANSACTIONS_STORAGE_KEY);
      if (!raw) {
        localStorage.setItem(TRANSACTIONS_STORAGE_KEY, JSON.stringify(initialTransactions));
        return initialTransactions;
      }
      return JSON.parse(raw);
    } catch {
      return initialTransactions;
    }
  },

  saveTransactions(transactions: Transaction[]): void {
    try {
      localStorage.setItem(TRANSACTIONS_STORAGE_KEY, JSON.stringify(transactions));
    } catch (e) {
      console.error('Error saving transactions to localStorage', e);
    }
  },

  getBankCredentials(): Record<string, { username: string; password?: string; browserId?: string }> {
    try {
      localStorage.removeItem('finvn_bank_creds');
      return {};
    } catch {
      return {};
    }
  },

  saveBankCredentials(creds: Record<string, { username: string; password?: string; browserId?: string }>): void {
    void creds;
    localStorage.removeItem('finvn_bank_creds');
  },

  saveAccountCredential(accountId: string, cred: { username: string; password?: string; browserId?: string }): void {
    const all = this.getBankCredentials();
    all[accountId] = cred;
    this.saveBankCredentials(all);
  },

  resetToDefault(): void {
    localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify([]));
    localStorage.setItem(TRANSACTIONS_STORAGE_KEY, JSON.stringify([]));
    localStorage.removeItem('finvn_bank_creds');
  },

  clearAll(): void {
    localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify([]));
    localStorage.setItem(TRANSACTIONS_STORAGE_KEY, JSON.stringify([]));
    localStorage.removeItem('finvn_bank_creds');
  },
};
