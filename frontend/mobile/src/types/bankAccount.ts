export type SePayStatus = 'NOT_CONNECTED' | 'PENDING' | 'CONNECTED' | 'ERROR';

export interface BankAccount {
  id: string;
  userId: string;
  bankName: string;
  displayName: string;
  accountNumber: string; // che một phần khi hiển thị
  initialBalance: number;
  currentBalance: number;
  sepayStatus: SePayStatus;
  sepayRef?: string | null;
  deletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBankAccountInput {
  bankName: string;
  displayName: string;
  accountNumber: string;
  initialBalance: number;
}

export interface UpdateBankAccountInput {
  displayName?: string;
  bankName?: string;
}
