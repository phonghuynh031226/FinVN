export type BankProvider = 'MB' | 'VCB' | 'BIDV';

export function getBankProvider(bankName: string): BankProvider {
  const normalized = (bankName || '').toUpperCase();
  if (normalized.includes('VIETCOMBANK') || normalized === 'VCB') return 'VCB';
  if (normalized.includes('BIDV')) return 'BIDV';
  return 'MB';
}

export type BankConnectionMode = 'MANUAL' | 'API';

export interface BankConnectionResult {
  status?: 'SUCCESS' | 'NEED_OTP';
  accountNumber?: string;
  currentBalance?: number;
  accountHolderName?: string;
  sessionId?: string;
  browserId?: string;
  browserToken?: string;
  duration?: number;
  message?: string;
}

export interface VerifyOtpInput {
  provider: BankProvider;
  username: string;
  password?: string;
  browserId: string;
  browserToken: string;
  otp: string;
}

export interface BankAccount {
  id: string;
  userId: string;
  bankName: string;
  displayName: string;
  accountNumber: string;
  initialBalance: number;
  currentBalance: number;
  color?: string;
  deletedAt?: string | null;
  lastSyncedAt?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBankAccountInput {
  bankName: string;
  displayName: string;
  accountNumber: string;
  initialBalance: number;
  color?: string;
  lastSyncedAt?: number | null;
}

export interface UpdateBankAccountInput {
  displayName?: string;
  bankName?: string;
  currentBalance?: number;
  color?: string;
  lastSyncedAt?: number | null;
}

export interface ConnectBankAccountInput {
  provider: BankProvider;
  username: string;
  password: string;
  browserId?: string;
  accountNumber?: string;
}
