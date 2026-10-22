import { z } from 'zod';
import { ERROR_MESSAGES } from '../constants/errorMessages';

export const BankAccountSchema = z.object({
  bankName: z
    .string()
    .trim()
    .min(1, ERROR_MESSAGES.BANK_NAME_REQUIRED)
    .max(100, ERROR_MESSAGES.BANK_NAME_TOO_LONG),
  displayName: z
    .string()
    .trim()
    .min(1, ERROR_MESSAGES.DISPLAY_NAME_REQUIRED)
    .max(50, ERROR_MESSAGES.DISPLAY_NAME_TOO_LONG),
  accountNumber: z
    .string()
    .trim()
    .regex(/^\d{6,20}$/, ERROR_MESSAGES.ACCOUNT_NUMBER_INVALID),
  initialBalance: z
    .number()
    .int()
    .min(0, ERROR_MESSAGES.INITIAL_BALANCE_INVALID)
    .max(999_999_999_999, ERROR_MESSAGES.INITIAL_BALANCE_INVALID),
});

export const TransactionSchema = z.object({
  accountId: z.string().min(1, ERROR_MESSAGES.ACCOUNT_REQUIRED),
  amount: z
    .number()
    .int()
    .min(1, ERROR_MESSAGES.AMOUNT_OUT_OF_RANGE)
    .max(999_999_999_999, ERROR_MESSAGES.AMOUNT_OUT_OF_RANGE),
  type: z.enum(['INCOME', 'EXPENSE', 'TRANSFER']),
  category: z.string().optional(),
  description: z.string().max(500).optional(),
  userNote: z.string().max(500).optional(),
});
