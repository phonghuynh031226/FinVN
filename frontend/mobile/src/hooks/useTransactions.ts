import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionsApi } from '../services/transactionsApi';
import { CreateTransactionInput } from '../types/transaction';
import { TransactionFilter } from '../types/filter';
import { ACCOUNTS_QUERY_KEY } from './useAccounts';

export function useTransactions(filter: TransactionFilter) {
  return useQuery({
    queryKey: ['transactions', filter],
    queryFn: () => transactionsApi.getTransactions(filter),
    staleTime: 1000 * 15,
  });
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateTransactionInput) => transactionsApi.createTransaction(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ACCOUNTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['financial-summary'] });
    },
  });
}

export function useUpdateTransactionNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      userCategory,
      userNote,
    }: {
      id: string;
      userCategory?: string;
      userNote?: string;
    }) => transactionsApi.updateTransactionNote(id, userCategory, userNote),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}
