import { supabase, isSupabaseConfigured } from './supabase';
import {
  Transaction,
  CreateTransactionInput,
  FinancialSummary,
} from '../types/transaction';
import { TransactionFilter } from '../types/filter';
import { accountsApi } from './accountsApi';

// Dữ liệu mẫu ban đầu
let localMockTransactions: Transaction[] = [
  {
    id: 'tx-1',
    userId: 'user-demo',
    accountId: 'acc-1',
    amount: 15000000,
    type: 'INCOME',
    category: 'Lương',
    userCategory: 'Lương',
    description: 'Cong ty ABC chuyen luong thang 10',
    userNote: 'Lương chính thức',
    transactionDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    source: 'SEPAY',
    sourceReference: 'FT24289001',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    bankAccount: {
      displayName: 'Nhận lương',
      bankName: 'Vietcombank',
      accountNumber: '1017588888',
    },
  },
  {
    id: 'tx-2',
    userId: 'user-demo',
    accountId: 'acc-1',
    amount: 1200000,
    type: 'EXPENSE',
    category: 'Ăn uống',
    userCategory: 'Ăn uống',
    description: 'Thanh toan sieu thi WinMart',
    userNote: 'Mua đồ ăn tuần',
    transactionDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    source: 'SEPAY',
    sourceReference: 'FT24289002',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    bankAccount: {
      displayName: 'Nhận lương',
      bankName: 'Vietcombank',
      accountNumber: '1017588888',
    },
  },
  {
    id: 'tx-3',
    userId: 'user-demo',
    accountId: 'acc-2',
    amount: 2000000,
    type: 'INCOME',
    category: 'Đầu tư',
    userCategory: 'Lãi tiết kiệm',
    description: 'Lai tien gui ky han 3 thang',
    userNote: 'Lãi tiết kiệm',
    transactionDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    source: 'MANUAL',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    bankAccount: {
      displayName: 'Tiền tiết kiệm',
      bankName: 'Techcombank',
      accountNumber: '1903678999',
    },
  },
];

export const transactionsApi = {
  async getTransactions(filter: TransactionFilter): Promise<Transaction[]> {
    if (!isSupabaseConfigured) {
      let filtered = [...localMockTransactions];

      // Lọc theo account
      if (filter.accountId && filter.accountId !== 'ALL') {
        filtered = filtered.filter((t) => t.accountId === filter.accountId);
      }

      // Lọc theo ngày (YYYY-MM-DD)
      if (filter.dateRange) {
        const { startDate, endDate } = filter.dateRange;
        filtered = filtered.filter((t) => {
          const txDay = t.transactionDate.slice(0, 10);
          return txDay >= startDate && txDay <= endDate;
        });
      }

      // Lọc theo type
      if (filter.type && filter.type !== 'ALL') {
        filtered = filtered.filter((t) => t.type === filter.type);
      }

      // Tìm kiếm
      if (filter.searchQuery) {
        const q = filter.searchQuery.toLowerCase().trim();
        filtered = filtered.filter(
          (t) =>
            t.description?.toLowerCase().includes(q) ||
            t.userNote?.toLowerCase().includes(q) ||
            t.category?.toLowerCase().includes(q) ||
            t.userCategory?.toLowerCase().includes(q)
        );
      }

      return filtered.sort(
        (a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime()
      );
    }

    let query = supabase
      .from('transactions')
      .select('*, bank_accounts(display_name, bank_name, account_number, deleted_at)')
      .order('transaction_date', { ascending: false });

    if (filter.accountId && filter.accountId !== 'ALL') {
      query = query.eq('account_id', filter.accountId);
    }

    if (filter.dateRange) {
      const { startDate, endDate } = filter.dateRange;
      query = query
        .gte('transaction_date', `${startDate}T00:00:00+07:00`)
        .lte('transaction_date', `${endDate}T23:59:59+07:00`);
    }

    if (filter.type && filter.type !== 'ALL') {
      query = query.eq('type', filter.type);
    }

    if (filter.searchQuery) {
      const q = filter.searchQuery.trim();
      query = query.or(`description.ilike.%${q}%,user_note.ilike.%${q}%,category.ilike.%${q}%`);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    return (data || []).map((row) => ({
      id: row.id,
      userId: row.user_id,
      accountId: row.account_id,
      amount: Number(row.amount),
      type: row.type,
      category: row.category,
      userCategory: row.user_category,
      description: row.description,
      userNote: row.user_note,
      transactionDate: row.transaction_date,
      source: row.source,
      sourceReference: row.source_reference,
      rawData: row.raw_data,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      bankAccount: row.bank_accounts
        ? {
            displayName: row.bank_accounts.deleted_at
              ? `${row.bank_accounts.display_name} (Đã xóa)`
              : row.bank_accounts.display_name,
            bankName: row.bank_accounts.bank_name,
            accountNumber: row.bank_accounts.account_number,
          }
        : undefined,
    }));
  },

  async getFinancialSummary(filter: TransactionFilter): Promise<FinancialSummary> {
    const accounts = await accountsApi.getAccounts();
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

    // Tính tổng số dư của các tài khoản đang áp dụng bộ lọc (không cộng vào thu/chi)
    let totalBalance = 0;
    if (filter.accountId && filter.accountId !== 'ALL') {
      const targetAcc = accounts.find((a) => a.id === filter.accountId);
      totalBalance = targetAcc ? targetAcc.currentBalance : 0;
    } else {
      totalBalance = accounts.reduce((acc, cur) => acc + cur.currentBalance, 0);
    }

    return {
      totalIncome,
      totalExpense,
      netAmount,
      totalBalance,
    };
  },

  async createTransaction(input: CreateTransactionInput): Promise<Transaction> {
    const nowIso = input.transactionDate || new Date().toISOString();

    if (!isSupabaseConfigured) {
      const accounts = await accountsApi.getAccounts();
      const targetAcc = accounts.find((a) => a.id === input.accountId);
      if (!targetAcc) throw new Error('Tài khoản không tồn tại hoặc đã bị xóa.');

      const newTx: Transaction = {
        id: `tx-${Date.now()}`,
        userId: 'user-demo',
        accountId: input.accountId,
        amount: input.amount,
        type: input.type,
        category: input.category || (input.type === 'INCOME' ? 'Thu nhập khác' : 'Chi tiêu khác'),
        userCategory: input.category,
        description: input.description || 'Giao dịch thủ công',
        userNote: input.userNote,
        transactionDate: nowIso,
        source: 'MANUAL',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        bankAccount: {
          displayName: targetAcc.displayName,
          bankName: targetAcc.bankName,
          accountNumber: targetAcc.accountNumber,
        },
      };

      // Cập nhật currentBalance tài khoản
      if (input.type === 'INCOME') {
        targetAcc.currentBalance += input.amount;
      } else if (input.type === 'EXPENSE') {
        targetAcc.currentBalance -= input.amount;
      }

      localMockTransactions = [newTx, ...localMockTransactions];
      return newTx;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) throw new Error('Vui lòng đăng nhập.');

    const { data, error } = await supabase
      .from('transactions')
      .insert({
        user_id: user.id,
        account_id: input.accountId,
        amount: input.amount,
        type: input.type,
        category: input.category,
        user_category: input.category,
        description: input.description,
        user_note: input.userNote,
        transaction_date: nowIso,
        source: 'MANUAL',
      })
      .select('*, bank_accounts(display_name, bank_name, account_number)')
      .single();

    if (error) throw new Error(error.message);

    return {
      id: data.id,
      userId: data.user_id,
      accountId: data.account_id,
      amount: Number(data.amount),
      type: data.type,
      category: data.category,
      userCategory: data.user_category,
      description: data.description,
      userNote: data.user_note,
      transactionDate: data.transaction_date,
      source: data.source,
      sourceReference: data.source_reference,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      bankAccount: data.bank_accounts
        ? {
            displayName: data.bank_accounts.display_name,
            bankName: data.bank_accounts.bank_name,
            accountNumber: data.bank_accounts.account_number,
          }
        : undefined,
    };
  },

  async updateTransactionNote(
    id: string,
    userCategory?: string,
    userNote?: string
  ): Promise<void> {
    // Chỉ cho phép sửa phân loại của user hoặc ghi chú của user; KHÔNG sửa dữ liệu gốc ngân hàng
    if (!isSupabaseConfigured) {
      const idx = localMockTransactions.findIndex((t) => t.id === id);
      if (idx !== -1) {
        localMockTransactions[idx].userCategory = userCategory;
        localMockTransactions[idx].userNote = userNote;
        localMockTransactions[idx].updatedAt = new Date().toISOString();
      }
      return;
    }

    const { error } = await supabase
      .from('transactions')
      .update({
        user_category: userCategory,
        user_note: userNote,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) throw new Error(error.message);
  },
};
