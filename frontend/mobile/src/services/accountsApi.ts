import { supabase, isSupabaseConfigured } from './supabase';
import { BankAccount, CreateBankAccountInput, UpdateBankAccountInput } from '../types/bankAccount';
import { maskAccountNumber } from '../utils/currency';

// Dữ liệu mẫu ban đầu khi chạy môi trường chưa liên kết Supabase
let localMockAccounts: BankAccount[] = [
  {
    id: 'acc-1',
    userId: 'user-demo',
    bankName: 'Vietcombank',
    displayName: 'Nhận lương',
    accountNumber: '1017588888',
    initialBalance: 15000000,
    currentBalance: 24500000,
    sepayStatus: 'CONNECTED',
    sepayRef: 'VCB-8888',
    deletedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'acc-2',
    userId: 'user-demo',
    bankName: 'Techcombank',
    displayName: 'Tiền tiết kiệm',
    accountNumber: '1903678999',
    initialBalance: 50000000,
    currentBalance: 52000000,
    sepayStatus: 'NOT_CONNECTED',
    sepayRef: null,
    deletedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const accountsApi = {
  async getAccounts(): Promise<BankAccount[]> {
    if (!isSupabaseConfigured) {
      return localMockAccounts.filter((a) => !a.deletedAt);
    }

    const { data, error } = await supabase
      .from('bank_accounts')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);

    return (data || []).map((row) => ({
      id: row.id,
      userId: row.user_id,
      bankName: row.bank_name,
      displayName: row.display_name,
      accountNumber: row.account_number,
      initialBalance: Number(row.initial_balance || 0),
      currentBalance: Number(row.current_balance || 0),
      sepayStatus: row.sepay_status,
      sepayRef: row.sepay_ref,
      deletedAt: row.deleted_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  },

  async getAccountById(id: string): Promise<BankAccount | null> {
    if (!isSupabaseConfigured) {
      const found = localMockAccounts.find((a) => a.id === id && !a.deletedAt);
      return found || null;
    }

    const { data, error } = await supabase
      .from('bank_accounts')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) return null;

    return {
      id: data.id,
      userId: data.user_id,
      bankName: data.bank_name,
      displayName: data.display_name,
      accountNumber: data.account_number,
      initialBalance: Number(data.initial_balance || 0),
      currentBalance: Number(data.current_balance || 0),
      sepayStatus: data.sepay_status,
      sepayRef: data.sepay_ref,
      deletedAt: data.deleted_at,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  },

  async createAccount(input: CreateBankAccountInput): Promise<BankAccount> {
    const sanitizedAccNum = input.accountNumber.trim();

    if (!isSupabaseConfigured) {
      const isExist = localMockAccounts.some(
        (a) => a.accountNumber === sanitizedAccNum && !a.deletedAt
      );
      if (isExist) {
        throw new Error('Số tài khoản này đã được thêm vào hệ thống.');
      }

      const newAccount: BankAccount = {
        id: `acc-${Date.now()}`,
        userId: 'user-demo',
        bankName: input.bankName.trim(),
        displayName: input.displayName.trim(),
        accountNumber: sanitizedAccNum,
        initialBalance: input.initialBalance,
        currentBalance: input.initialBalance,
        sepayStatus: 'NOT_CONNECTED',
        sepayRef: null,
        deletedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      localMockAccounts = [newAccount, ...localMockAccounts];
      return newAccount;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) throw new Error('Vui lòng đăng nhập để thực hiện.');

    const { data, error } = await supabase
      .from('bank_accounts')
      .insert({
        user_id: user.id,
        bank_name: input.bankName.trim(),
        display_name: input.displayName.trim(),
        account_number: sanitizedAccNum,
        initial_balance: input.initialBalance,
        current_balance: input.initialBalance,
        sepay_status: 'NOT_CONNECTED',
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new Error('Số tài khoản này đã được thêm vào hệ thống.');
      }
      throw new Error(error.message);
    }

    return {
      id: data.id,
      userId: data.user_id,
      bankName: data.bank_name,
      displayName: data.display_name,
      accountNumber: data.account_number,
      initialBalance: Number(data.initial_balance || 0),
      currentBalance: Number(data.current_balance || 0),
      sepayStatus: data.sepay_status,
      sepayRef: data.sepay_ref,
      deletedAt: data.deleted_at,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  },

  async updateAccount(id: string, input: UpdateBankAccountInput): Promise<BankAccount> {
    if (!isSupabaseConfigured) {
      const idx = localMockAccounts.findIndex((a) => a.id === id);
      if (idx === -1) throw new Error('Không tìm thấy tài khoản');
      localMockAccounts[idx] = {
        ...localMockAccounts[idx],
        ...input,
        updatedAt: new Date().toISOString(),
      };
      return localMockAccounts[idx];
    }

    const { data, error } = await supabase
      .from('bank_accounts')
      .update({
        ...(input.displayName ? { display_name: input.displayName.trim() } : {}),
        ...(input.bankName ? { bank_name: input.bankName.trim() } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);

    return {
      id: data.id,
      userId: data.user_id,
      bankName: data.bank_name,
      displayName: data.display_name,
      accountNumber: data.account_number,
      initialBalance: Number(data.initial_balance || 0),
      currentBalance: Number(data.current_balance || 0),
      sepayStatus: data.sepay_status,
      sepayRef: data.sepay_ref,
      deletedAt: data.deleted_at,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  },

  async deleteAccount(id: string): Promise<void> {
    // Soft delete: cập nhật deleted_at để bảo toàn lịch sử giao dịch
    if (!isSupabaseConfigured) {
      const idx = localMockAccounts.findIndex((a) => a.id === id);
      if (idx !== -1) {
        localMockAccounts[idx].deletedAt = new Date().toISOString();
      }
      return;
    }

    const { error } = await supabase
      .from('bank_accounts')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw new Error(error.message);
  },
};
