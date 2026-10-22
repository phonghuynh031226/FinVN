import { useQuery } from '@tanstack/react-query';
import { transactionsApi } from '../services/transactionsApi';
import { TransactionFilter } from '../types/filter';

export function useFinancialSummary(filter: TransactionFilter) {
  return useQuery({
    queryKey: ['financial-summary', filter.accountId, filter.dateRange],
    queryFn: () => transactionsApi.getFinancialSummary(filter),
    staleTime: 1000 * 20,
  });
}
