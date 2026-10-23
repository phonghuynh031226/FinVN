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

export const dataService = {
  // --- ACCOUNTS ---
  async getAccounts(): Promise<BankAccount[]> {
    const all = storageService.getAccounts();
    return all.filter((a) => !a.deletedAt);
  },

  async getAllAccountsWithDeleted(): Promise<BankAccount[]> {
    return storageService.getAccounts();
  },

  async getAccountById(id: string): Promise<BankAccount | null> {
    const all = storageService.getAccounts();
    return all.find((a) => a.id === id) || null;
  },

  async createAccount(input: CreateBankAccountInput): Promise<BankAccount> {
    const all = storageService.getAccounts();
    const duplicate = all.find(
      (account) => !account.deletedAt && account.accountNumber === input.accountNumber.trim()
    );
    if (duplicate) throw new Error('Số tài khoản này đã được thêm vào hệ thống');

    const newAccount: BankAccount = {
      id: `acc-${Date.now()}`,
      userId: 'user-demo',
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
    const all = storageService.getAccounts();
    const index = all.findIndex((a) => a.id === id);
    if (index === -1) throw new Error('Không tìm thấy tài khoản');

    all[index].deletedAt = new Date().toISOString();
    all[index].updatedAt = new Date().toISOString();
    storageService.saveAccounts(all);
  },

  // --- TRANSACTIONS ---
  async getTransactions(filter?: TransactionFilter): Promise<Transaction[]> {
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
      userId: 'user-demo',
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
  ): Promise<{ importedCount: number; updatedBalance: number }> {
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
    const newTxs: Transaction[] = [];

    const bankLabel = targetAccount.bankName || 'Ngân hàng';

    for (const btx of bankTxs) {
      const amount = Math.abs(Number(btx.amount) || 0);
      const isIncome = btx.type === 'INCOME';
      const txType = isIncome ? 'INCOME' : 'EXPENSE';

      const txKey = makeTxKey(targetAccount.id, btx.reference, amount, txType, btx.transaction_date);
      if (existingKeys.has(txKey)) {
        continue; // Idempotency check: tránh trùng lặp đúng giao dịch
      }

      const categoryName = isIncome ? `Thu nhập ${bankLabel}` : `Chi tiêu ${bankLabel}`;

      let txDateIso = new Date().toISOString();
      if (btx.transaction_date) {
        const parts = btx.transaction_date.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
        if (parts) {
          const [, d, m, y] = parts;
          const timePart = btx.transaction_date.match(/(\d{1,2}):(\d{1,2}):(\d{1,2})/);
          const hh = timePart ? timePart[1].padStart(2, '0') : '00';
          const mm = timePart ? timePart[2].padStart(2, '0') : '00';
          const ss = timePart ? timePart[3].padStart(2, '0') : '00';
          txDateIso = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}T${hh}:${mm}:${ss}+07:00`;
        }
      }

      const newTx: Transaction = {
        id: `tx-${btx.reference || Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        userId: 'user-demo',
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

    if (newTxs.length > 0) {
      existingTxs.push(...newTxs);
      existingTxs.sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime());
      storageService.saveTransactions(existingTxs);
    }

    if (typeof latestBalance === 'number') {
      targetAccount.currentBalance = latestBalance;
      targetAccount.updatedAt = new Date().toISOString();
      storageService.saveAccounts(allAccounts);
    }

    return {
      importedCount,
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
