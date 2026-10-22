export type TransactionType = 'INCOME' | 'EXPENSE' | 'TRANSFER';
export type TransactionSource = 'MANUAL' | 'SEPAY';

export interface Transaction {
  id: string;
  userId: string;
  accountId: string;
  amount: number; // Luôn là số nguyên dương VND
  type: TransactionType;
  category?: string | null;
  userCategory?: string | null;
  description?: string | null;
  userNote?: string | null;
  transactionDate: string; // ISO 8601
  source: TransactionSource;
  sourceReference?: string | null;
  rawData?: Record<string, any> | null;
  createdAt: string;
  updatedAt: string;
  // Liên kết hiển thị
  bankAccount?: {
    displayName: string;
    bankName: string;
    accountNumber: string;
  };
}

export interface CreateTransactionInput {
  accountId: string;
  amount: number;
  type: TransactionType;
  category?: string;
  description?: string;
  transactionDate?: string;
  userNote?: string;
}

export interface FinancialSummary {
  totalIncome: number;
  totalExpense: number;
  netAmount: number;
  totalBalance: number; // Tổng số dư hiện tại của các tài khoản áp dụng
}
