import { BankAccount, CreateBankAccountInput, UpdateBankAccountInput } from '../types/bankAccount';
import {
  Transaction,
  CreateTransactionInput,
  FinancialSummary,
} from '../types/transaction';
import { TransactionFilter } from '../types/filter';
import { storageService } from './storage';
import { getCategoryDef } from '../constants/categories';
import { BankTransaction } from './bankApi';
import { getLocalDateString } from '../utils/date';
import { authService } from './authService';

const CONNECTOR_URL = ((import.meta.env.VITE_BANK_CONNECTOR_URL as string | undefined)?.trim() || window.location.origin).replace(/\/$/, '');
const getUserId = () => authService.getUserId();
const apiFetch = authService.apiFetch.bind(authService);

function parseBankTransactionDate(value: string | null | undefined): string | null {
  const raw = value?.trim();
  if (!raw) return null;

  const vnDate = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (vnDate) {
    const [, day, month, year, hour = '00', minute = '00', second = '00'] = vnDate;
    if (Number(hour) > 23 || Number(minute) > 59 || Number(second) > 59) return null;
    const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
    if (date.getUTCFullYear() !== Number(year) || date.getUTCMonth() !== Number(month) - 1 || date.getUTCDate() !== Number(day)) return null;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${hour.padStart(2, '0')}:${minute}:${second}+07:00`;
  }

  const iso = raw.match(/^(\d{4}-\d{2}-\d{2})(?:[T ](.*))?$/);
  if (iso) {
    const isoValue = iso[2] ? `${iso[1]}T${iso[2]}` : iso[1];
    const dateValue = iso[2]
      ? (/([zZ]|[+-]\d{2}:?\d{2})$/.test(iso[2]) ? isoValue : `${isoValue}+07:00`)
      : `${raw}T00:00:00+07:00`;
    const parsed = new Date(dateValue);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }

  if (/^\d{10,13}$/.test(raw)) {
    const timestamp = Number(raw.length === 13 ? Number(raw) : Number(raw) * 1000);
    const parsed = new Date(timestamp);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }

  return null;
}

let hasAutoMigratedAccounts = false;
let hasAutoMigratedTransactions = false;

async function syncLocalToPostgresIfEmpty() {
  if (hasAutoMigratedAccounts && hasAutoMigratedTransactions) return;
  const localAccounts = storageService.getAccounts().filter((a) => !a.deletedAt);
  const localTxs = storageService.getTransactions();

  if (localAccounts.length > 0 || localTxs.length > 0) {
    try {
      const resp = await apiFetch(`${CONNECTOR_URL}/api/migrate-from-local`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: getUserId(),
          accounts: localAccounts,
          transactions: localTxs,
        }),
      });
      if (resp.ok) {
        const resJson = await resp.json();
        hasAutoMigratedAccounts = true;
        if (resJson.synced_transactions_count > 0 || localTxs.length === 0) {
          hasAutoMigratedTransactions = true;
        }
      }
    } catch {
      // Bỏ qua lỗi ngầm để không spam console
    }
  }
}

export const dataService = {
  // --- ACCOUNTS ---
  async getAccounts(): Promise<BankAccount[]> {
    if (!authService.isAuthenticated()) {
      return [];
    }
    const uid = getUserId();
    if (!uid) return [];

    try {
      const resp = await apiFetch(`${CONNECTOR_URL}/api/accounts?user_id=${uid}`);
      if (resp.ok) {
        const rows = await resp.json();
        if (Array.isArray(rows) && rows.length > 0) {
          const mapped: BankAccount[] = rows.map((r: any) => ({
            id: r.id,
            userId: r.user_id,
            bankName: r.bank_name,
            displayName: r.display_name,
            accountNumber: r.account_number,
            initialBalance: Number(r.initial_balance || 0),
            currentBalance: Number(r.current_balance || 0),
            color: r.color || '#10b981',
            lastSyncedAt: r.last_synced_at ? new Date(r.last_synced_at).getTime() : undefined,
            deletedAt: r.deleted_at,
            createdAt: r.created_at,
            updatedAt: r.updated_at,
          }));
          storageService.saveAccounts(mapped);
          return mapped;
        } else {
          // PostgreSQL chưa có dữ liệu -> Tự động nạp dữ liệu có sẵn từ LocalStorage lên PostgreSQL!
          await syncLocalToPostgresIfEmpty();
          const retryResp = await apiFetch(`${CONNECTOR_URL}/api/accounts?user_id=${getUserId()}`);
          if (retryResp.ok) {
            const retryRows = await retryResp.json();
            if (Array.isArray(retryRows) && retryRows.length > 0) {
              const retryMapped: BankAccount[] = retryRows.map((r: any) => ({
                id: r.id,
                userId: r.user_id,
                bankName: r.bank_name,
                displayName: r.display_name,
                accountNumber: r.account_number,
                initialBalance: Number(r.initial_balance || 0),
                currentBalance: Number(r.current_balance || 0),
                color: r.color || '#10b981',
                lastSyncedAt: r.last_synced_at ? new Date(r.last_synced_at).getTime() : undefined,
                deletedAt: r.deleted_at,
                createdAt: r.created_at,
                updatedAt: r.updated_at,
              }));
              storageService.saveAccounts(retryMapped);
              return retryMapped;
            }
          }
        }
      }
    } catch (e) {
      console.warn('Lỗi đọc accounts từ PostgreSQL, chuyển sang local cache:', e);
    }

    if (!authService.isAuthenticated()) return [];
    const all = storageService.getAccounts();
    return all.filter((a) => !a.deletedAt);
  },

  async getAllAccountsWithDeleted(): Promise<BankAccount[]> {
    if (!authService.isAuthenticated()) return [];
    return storageService.getAccounts();
  },

  async getAccountById(id: string): Promise<BankAccount | null> {
    if (!authService.isAuthenticated()) return null;
    const all = storageService.getAccounts();
    return all.find((a) => a.id === id) || null;
  },

  async createAccount(input: CreateBankAccountInput): Promise<BankAccount> {
    // 1. Lưu vào PostgreSQL
    const createResponse = await apiFetch(`${CONNECTOR_URL}/api/accounts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: getUserId(),
          bank_name: input.bankName.trim(),
          display_name: input.displayName.trim(),
          account_number: input.accountNumber.trim(),
          initial_balance: Number(input.initialBalance || 0),
          current_balance: Number(input.initialBalance || 0),
          color: input.color,
        }),
      });
    if (!createResponse.ok) throw new Error('Không thể lưu tài khoản vào máy chủ.');
    const savedAccount = await createResponse.json();

    // 2. Lưu vào LocalStorage làm cache
    const all = storageService.getAccounts();
    const duplicate = all.find(
      (account) => !account.deletedAt && account.accountNumber === input.accountNumber.trim()
    );
    if (duplicate) throw new Error('Số tài khoản này đã được thêm vào hệ thống');

    const newAccount: BankAccount = {
      id: savedAccount.id,
      userId: getUserId(),
      bankName: input.bankName.trim(),
      displayName: input.displayName.trim(),
      accountNumber: input.accountNumber.trim(),
      initialBalance: Number(input.initialBalance || 0),
      currentBalance: Number(input.initialBalance || 0),
      color: input.color,
      deletedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    all.push(newAccount);
    storageService.saveAccounts(all);
    return newAccount;
  },

  async updateAccount(id: string, input: UpdateBankAccountInput): Promise<BankAccount> {
    const response = await apiFetch(`${CONNECTOR_URL}/api/accounts/${encodeURIComponent(id)}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bank_name: input.bankName, display_name: input.displayName,
        current_balance: input.currentBalance, color: input.color,
      }),
    });
    if (!response.ok) throw new Error('Không thể cập nhật tài khoản trên máy chủ.');
    const all = storageService.getAccounts();
    const index = all.findIndex((a) => a.id === id);
    if (index === -1) throw new Error('Không tìm thấy tài khoản');

    const updated: BankAccount = {
      ...all[index],
      ...input,
      updatedAt: new Date().toISOString(),
    };

    all[index] = updated;
    storageService.saveAccounts(all);

    // Update transactions linked to this account
    const txs = storageService.getTransactions();
    const updatedTxs = txs.map((tx) => {
      if (tx.accountId === id && tx.bankAccount) {
        return {
          ...tx,
          bankAccount: {
            ...tx.bankAccount,
            displayName: updated.displayName,
            bankName: updated.bankName,
          },
        };
      }
      return tx;
    });
    storageService.saveTransactions(updatedTxs);

    return updated;
  },

  async softDeleteAccount(id: string): Promise<void> {
    const response = await apiFetch(`${CONNECTOR_URL}/api/accounts/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
    if (!response.ok) throw new Error('Không thể xóa tài khoản trên máy chủ.');

    const all = storageService.getAccounts();
    const index = all.findIndex((a) => a.id === id);
    if (index === -1) throw new Error('Không tìm thấy tài khoản');

    all[index].deletedAt = new Date().toISOString();
    all[index].updatedAt = new Date().toISOString();
    storageService.saveAccounts(all);
  },

  // --- TRANSACTIONS ---
  async getTransactions(filter?: TransactionFilter): Promise<Transaction[]> {
    if (!authService.isAuthenticated()) {
      return [];
    }
    const uid = getUserId();
    if (!uid) return [];

    try {
      const params = new URLSearchParams();
      params.append('user_id', uid);
      if (filter?.accountId && filter.accountId !== 'ALL') {
        params.append('accountId', filter.accountId);
      }
      if (filter?.dateRange?.startDate) {
        params.append('startDate', filter.dateRange.startDate);
      }
      if (filter?.dateRange?.endDate) {
        params.append('endDate', filter.dateRange.endDate);
      }

      const resp = await apiFetch(`${CONNECTOR_URL}/api/transactions?${params.toString()}`);
      if (resp.ok) {
        const rows = await resp.json();
        if (Array.isArray(rows) && rows.length > 0) {
          const mapped: Transaction[] = rows.map((r: any) => ({
            id: r.id,
            userId: r.user_id,
            accountId: r.account_id,
            amount: Number(r.amount),
            type: r.type,
            category: r.category,
            userCategory: r.user_category,
            description: r.description,
            userNote: r.user_note,
            transactionDate: r.transaction_date,
            source: r.source,
            sourceReference: r.reference,
            createdAt: r.created_at,
            updatedAt: r.updated_at,
            bankAccount: {
              displayName: r.account_name,
              bankName: r.bank_name,
              accountNumber: r.account_number || '',
              color: r.account_color,
            },
          }));

          // Áp dụng bộ lọc phụ (type, category, search query)
          let result = mapped;
          if (filter?.type && filter.type !== 'ALL') {
            result = result.filter((t) => t.type === filter.type);
          }
          if (filter?.category && filter.category !== 'ALL') {
            result = result.filter(
              (t) =>
                (t.userCategory && t.userCategory.toLowerCase() === filter.category?.toLowerCase()) ||
                (t.category && t.category.toLowerCase() === filter.category?.toLowerCase())
            );
          }
          if (filter?.searchQuery && filter.searchQuery.trim()) {
            const q = filter.searchQuery.toLowerCase().trim();
            result = result.filter(
              (t) =>
                t.description?.toLowerCase().includes(q) ||
                t.userNote?.toLowerCase().includes(q) ||
                t.category?.toLowerCase().includes(q) ||
                t.userCategory?.toLowerCase().includes(q)
            );
          }
          return result;
        } else if (!hasAutoMigratedTransactions && storageService.getTransactions().length > 0) {
          // Chưa có giao dịch trong PostgreSQL nhưng LocalStorage đang có -> Đồng bộ ngay
          await syncLocalToPostgresIfEmpty();
          const retryResp = await apiFetch(`${CONNECTOR_URL}/api/transactions?${params.toString()}`);
          if (retryResp.ok) {
            const retryRows = await retryResp.json();
            if (Array.isArray(retryRows) && retryRows.length > 0) {
              const mapped: Transaction[] = retryRows.map((r: any) => ({
                id: r.id,
                userId: r.user_id,
                accountId: r.account_id,
                amount: Number(r.amount),
                type: r.type,
                category: r.category,
                userCategory: r.user_category,
                description: r.description,
                userNote: r.user_note,
                transactionDate: r.transaction_date,
                source: r.source,
                sourceReference: r.reference,
                createdAt: r.created_at,
                updatedAt: r.updated_at,
                bankAccount: {
                  displayName: r.account_name,
                  bankName: r.bank_name,
                  accountNumber: r.account_number || '',
                  color: r.account_color,
                },
              }));
              let result = mapped;
              if (filter?.type && filter.type !== 'ALL') {
                result = result.filter((t) => t.type === filter.type);
              }
              if (filter?.category && filter.category !== 'ALL') {
                result = result.filter(
                  (t) =>
                    (t.userCategory && t.userCategory.toLowerCase() === filter.category?.toLowerCase()) ||
                    (t.category && t.category.toLowerCase() === filter.category?.toLowerCase())
                );
              }
              if (filter?.searchQuery && filter.searchQuery.trim()) {
                const q = filter.searchQuery.toLowerCase().trim();
                result = result.filter(
                  (t) =>
                    t.description?.toLowerCase().includes(q) ||
                    t.userNote?.toLowerCase().includes(q) ||
                    t.category?.toLowerCase().includes(q) ||
                    t.userCategory?.toLowerCase().includes(q)
                );
              }
              return result;
            }
          }
        }
      }
    } catch (e) {
      console.warn('Lỗi đọc transactions từ PostgreSQL, dùng local cache:', e);
    }
    if (!authService.isAuthenticated()) return [];
    let list = storageService.getTransactions();

    if (!filter) {
      return list.sort(
        (a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime()
      );
    }

    if (filter.accountId && filter.accountId !== 'ALL') {
      list = list.filter((t) => t.accountId === filter.accountId);
    }

    if (filter.dateRange) {
      const { startDate, endDate } = filter.dateRange;
      list = list.filter((t) => {
        const txDay = getLocalDateString(t.transactionDate);
        return txDay >= startDate && txDay <= endDate;
      });
    }

    if (filter.type && filter.type !== 'ALL') {
      list = list.filter((t) => t.type === filter.type);
    }

    if (filter.category && filter.category !== 'ALL') {
      list = list.filter(
        (t) =>
          (t.userCategory && t.userCategory.toLowerCase() === filter.category?.toLowerCase()) ||
          (t.category && t.category.toLowerCase() === filter.category?.toLowerCase())
      );
    }

    if (filter.searchQuery && filter.searchQuery.trim()) {
      const q = filter.searchQuery.toLowerCase().trim();
      list = list.filter(
        (t) =>
          t.description?.toLowerCase().includes(q) ||
          t.userNote?.toLowerCase().includes(q) ||
          t.category?.toLowerCase().includes(q) ||
          t.userCategory?.toLowerCase().includes(q) ||
          t.sourceReference?.toLowerCase().includes(q) ||
          t.bankAccount?.displayName.toLowerCase().includes(q) ||
          t.amount.toString().includes(q)
      );
    }

    return list.sort(
      (a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime()
    );
  },

  async getFinancialSummary(filter: TransactionFilter): Promise<FinancialSummary> {
    if (!authService.isAuthenticated()) {
      return {
        totalIncome: 0,
        totalExpense: 0,
        netAmount: 0,
        totalBalance: 0,
      };
    }
    const accounts = await this.getAccounts();
    const transactions = await this.getTransactions(filter);

    let totalIncome = 0;
    let totalExpense = 0;

    for (const tx of transactions) {
      if (tx.type === 'INCOME') {
        totalIncome += tx.amount;
      } else if (tx.type === 'EXPENSE') {
        totalExpense += tx.amount;
      }
    }

    const netAmount = totalIncome - totalExpense;

    let totalBalance = 0;
    if (filter.accountId && filter.accountId !== 'ALL') {
      const target = accounts.find((a) => a.id === filter.accountId);
      totalBalance = target ? target.currentBalance : 0;
    } else {
      totalBalance = accounts.reduce((sum, a) => sum + a.currentBalance, 0);
    }

    return {
      totalIncome,
      totalExpense,
      netAmount,
      totalBalance,
    };
  },

  async createTransaction(input: CreateTransactionInput): Promise<Transaction> {
    const allAccounts = storageService.getAccounts();
    const targetAccount = allAccounts.find((a) => a.id === input.accountId);
    if (!targetAccount) throw new Error('Tài khoản ngân hàng không tồn tại');

    const amount = Number(input.amount);
    const categoryName = input.category || (input.type === 'INCOME' ? 'Thu nhập khác' : 'Chi tiêu khác');

    const newTx: Transaction = {
      id: `tx-${Date.now()}`,
      userId: getUserId(),
      accountId: input.accountId,
      amount,
      type: input.type,
      category: categoryName,
      userCategory: categoryName,
      description: input.description?.trim() || 'Giao dịch tạo thủ công',
      userNote: input.userNote?.trim() || null,
      transactionDate: input.transactionDate || new Date().toISOString(),
      source: 'MANUAL',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      bankAccount: {
        displayName: targetAccount.displayName,
        bankName: targetAccount.bankName,
        accountNumber: targetAccount.accountNumber,
      },
    };

    const response = await apiFetch(`${CONNECTOR_URL}/api/transactions`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ account_id: input.accountId, amount, type: input.type,
        category: categoryName, description: newTx.description, user_note: newTx.userNote,
        transaction_date: newTx.transactionDate }),
    });
    if (!response.ok) throw new Error('Không thể lưu giao dịch trên máy chủ.');
    const saved = await response.json();
    newTx.id = saved.id;

    // Update account balance
    if (input.type === 'INCOME') {
      targetAccount.currentBalance += amount;
    } else if (input.type === 'EXPENSE') {
      targetAccount.currentBalance -= amount;
    }
    targetAccount.updatedAt = new Date().toISOString();
    storageService.saveAccounts(allAccounts);

    const txs = storageService.getTransactions();
    txs.unshift(newTx);
    storageService.saveTransactions(txs);

    return newTx;
  },

  async updateTransaction(
    id: string,
    updates: { userCategory?: string; userNote?: string }
  ): Promise<Transaction> {
    const response = await apiFetch(`${CONNECTOR_URL}/api/transactions/${encodeURIComponent(id)}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_category: updates.userCategory, user_note: updates.userNote }),
    });
    if (!response.ok) throw new Error('Không thể cập nhật giao dịch trên máy chủ.');
    const txs = storageService.getTransactions();
    const index = txs.findIndex((t) => t.id === id);
    if (index === -1) throw new Error('Không tìm thấy giao dịch');

    const updated = {
      ...txs[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    txs[index] = updated;
    storageService.saveTransactions(txs);
    return updated;
  },

  async deleteTransaction(id: string): Promise<void> {
    const response = await apiFetch(`${CONNECTOR_URL}/api/transactions/${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (!response.ok) throw new Error('Không thể xóa giao dịch trên máy chủ.');
    const txs = storageService.getTransactions();
    const targetTx = txs.find((t) => t.id === id);
    if (!targetTx) throw new Error('Không tìm thấy giao dịch');

    // Revert account balance
    const accounts = storageService.getAccounts();
    const targetAccount = accounts.find((a) => a.id === targetTx.accountId);
    if (targetAccount) {
      if (targetTx.type === 'INCOME') {
        targetAccount.currentBalance -= targetTx.amount;
      } else if (targetTx.type === 'EXPENSE') {
        targetAccount.currentBalance += targetTx.amount;
      }
      targetAccount.updatedAt = new Date().toISOString();
      storageService.saveAccounts(accounts);
    }

    const remaining = txs.filter((t) => t.id !== id);
    storageService.saveTransactions(remaining);
  },

  // Import transactions from Bank Connector API (MBBank, etc.)
  async importBankTransactions(
    accountId: string,
    bankTxs: BankTransaction[],
    latestBalance?: number
  ): Promise<{ importedCount: number; correctedCount: number; skippedDateCount: number; updatedBalance: number }> {
    const allAccounts = storageService.getAccounts();
    const targetAccount = allAccounts.find((a) => a.id === accountId);
    if (!targetAccount) throw new Error('Tài khoản ngân hàng không tồn tại');

    const existingTxs = storageService.getTransactions();

    // Hàm sinh dấu vân tay nhận diện giao dịch (Fingerprint):
    // Thay vì chỉ so sánh mã tham chiếu (btx.reference), ta kết hợp [Tài khoản + Mã GD + Số tiền + Loại GD + Ngày].
    // Lí do: Trong ngân hàng (như BIDV rút ATM), giao dịch rút tiền chính (-900.000đ) và phí rút tiền (-3.300đ)
    // CÓ CÙNG MÃ THAM CHIẾU (Mã GD / refNo)! Nếu chỉ kiểm tra refNo thì giao dịch rút tiền sẽ bị nuốt mất!
    const makeTxKey = (accId: string, ref: string | null | undefined, amt: number, txType: string, dateStr: string | null | undefined) => {
      let dKey = '';
      if (dateStr) {
        const parts = dateStr.match(/(\d{4}-\d{2}-\d{2})/);
        if (parts) dKey = parts[1];
        else {
          const dm = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
          if (dm) dKey = `${dm[3]}-${dm[2].padStart(2, '0')}-${dm[1].padStart(2, '0')}`;
        }
      }
      return `${accId}_${ref || 'noref'}_${Math.round(amt)}_${txType}_${dKey}`;
    };

    const existingKeys = new Set(
      existingTxs.map((t) => makeTxKey(t.accountId, t.sourceReference, t.amount, t.type, t.transactionDate))
    );

    let importedCount = 0;
    let correctedCount = 0;
    let skippedDateCount = 0;
    const newTxs: Transaction[] = [];

    const bankLabel = targetAccount.bankName || 'Ngân hàng';

    for (const btx of bankTxs) {
      const amount = Math.abs(Number(btx.amount) || 0);
      const isIncome = btx.type === 'INCOME';
      const txType = isIncome ? 'INCOME' : 'EXPENSE';
      const txDateIso = parseBankTransactionDate(btx.transaction_date);
      if (!txDateIso) {
        skippedDateCount++;
        console.warn('Bỏ qua giao dịch ngân hàng vì không đọc được ngày giao dịch:', btx.reference || '(không có mã tham chiếu)');
        continue;
      }

      const txKey = makeTxKey(targetAccount.id, btx.reference, amount, txType, btx.transaction_date);
      const existingByReference = btx.reference
        ? existingTxs.find((t) =>
            t.accountId === targetAccount.id &&
            t.sourceReference === btx.reference &&
            t.amount === amount &&
            t.type === txType
          )
        : undefined;
      if (existingByReference) {
        if (new Date(existingByReference.transactionDate).getTime() !== new Date(txDateIso).getTime()) {
          existingByReference.transactionDate = txDateIso;
          existingByReference.updatedAt = new Date().toISOString();
          correctedCount++;
        }
        continue;
      }
      if (!btx.reference) {
        const matchingWithoutReference = existingTxs.filter((t) =>
          t.accountId === targetAccount.id &&
          !t.sourceReference &&
          t.amount === amount &&
          t.type === txType &&
          t.description?.trim() === (btx.description?.trim() || `Giao dịch ${bankLabel}`)
        );
        if (matchingWithoutReference.length === 1) {
          if (new Date(matchingWithoutReference[0].transactionDate).getTime() !== new Date(txDateIso).getTime()) {
            matchingWithoutReference[0].transactionDate = txDateIso;
            matchingWithoutReference[0].updatedAt = new Date().toISOString();
            correctedCount++;
          }
          existingKeys.add(txKey);
          continue;
        }
      }
      if (existingKeys.has(txKey)) {
        continue; // Idempotency check: tránh trùng lặp đúng giao dịch
      }

      const categoryName = isIncome ? `Thu nhập ${bankLabel}` : `Chi tiêu ${bankLabel}`;

      const newTx: Transaction = {
        id: `tx-${btx.reference || Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        userId: getUserId(),
        accountId: targetAccount.id,
        amount,
        type: txType,
        category: categoryName,
        userCategory: categoryName,
        description: btx.description?.trim() || `Giao dịch ${bankLabel}`,
        userNote: null,
        transactionDate: txDateIso,
        source: 'BANK_API',
        sourceReference: btx.reference || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        bankAccount: {
          displayName: targetAccount.displayName,
          bankName: targetAccount.bankName,
          accountNumber: targetAccount.accountNumber,
        },
      };

      newTxs.push(newTx);
      existingKeys.add(txKey);
      importedCount++;
    }

    if (newTxs.length > 0 || correctedCount > 0) {
      existingTxs.push(...newTxs);
      existingTxs.sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime());
      storageService.saveTransactions(existingTxs);
    }

    if (typeof latestBalance === 'number') {
      targetAccount.currentBalance = latestBalance;
      targetAccount.updatedAt = new Date().toISOString();
      storageService.saveAccounts(allAccounts);
    }

    // Đồng bộ lập tức lên PostgreSQL
    try {
      const response = await apiFetch(`${CONNECTOR_URL}/api/migrate-from-local`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: getUserId(),
          accounts: allAccounts,
          transactions: existingTxs,
        }),
      });
      if (!response.ok) console.warn('Không thể cập nhật giao dịch đã sửa ngày lên PostgreSQL:', response.status);
    } catch (e) {
      console.warn('Lỗi đồng bộ lên PostgreSQL:', e);
    }

    return {
      importedCount,
      correctedCount,
      skippedDateCount,
      updatedBalance: targetAccount.currentBalance,
    };
  },

  // Export CSV
  exportTransactionsToCSV(transactions: Transaction[]): void {
    const headers = ['Mã GD', 'Thời gian', 'Tài khoản', 'Ngân hàng', 'Loại', 'Số tiền (VND)', 'Danh mục', 'Nội dung', 'Ghi chú', 'Nguồn'];
    const rows = transactions.map((t) => [
      t.id,
      t.transactionDate,
      `"${t.bankAccount?.displayName || ''}"`,
      `"${t.bankAccount?.bankName || ''}"`,
      t.type === 'INCOME' ? 'Thu nhập (+)' : 'Chi tiêu (-)',
      t.amount,
      `"${t.userCategory || t.category || ''}"`,
      `"${(t.description || '').replace(/"/g, '""')}"`,
      `"${(t.userNote || '').replace(/"/g, '""')}"`,
      t.source,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `finvn-transactions-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },
};
